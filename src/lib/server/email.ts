import { db } from './db';

interface EmailSettings {
	smtp_host: string;
	smtp_port: number;
	email_address: string;
	app_password: string;
	from_name?: string | null;
}

const EMAIL_MONTHLY_LIMIT = 3000;

function rowToSettings(row: Record<string, unknown>): EmailSettings {
	return {
		smtp_host: row.smtp_host as string,
		smtp_port: row.smtp_port as number,
		email_address: row.email_address as string,
		app_password: row.app_password as string,
		from_name: (row.from_name as string) || null
	};
}

// デフォルト（無ければ有効な最初）のアカウントを取得
export async function getEmailSettings(): Promise<EmailSettings | null> {
	try {
		const result = await db.execute(
			`SELECT * FROM email_settings WHERE is_active = 1 ORDER BY is_default DESC, created_at ASC LIMIT 1`
		);

		if (result.rows.length === 0) return null;
		return rowToSettings(result.rows[0]);
	} catch (err) {
		console.error('Failed to get email settings:', err);
		return null;
	}
}

// 指定IDのアカウントを取得（接続テスト用）
export async function getEmailSettingsById(id: string): Promise<EmailSettings | null> {
	try {
		const result = await db.execute(
			`SELECT * FROM email_settings WHERE id = :id LIMIT 1`,
			{ id }
		);
		if (result.rows.length === 0) return null;
		return rowToSettings(result.rows[0]);
	} catch (err) {
		console.error('Failed to get email settings by id:', err);
		return null;
	}
}

export async function getEmailUsage(): Promise<{ count: number; limit: number; month: string }> {
	const now = new Date();
	const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

	try {
		const result = await db.execute(
			`SELECT count FROM email_usage WHERE month = :month`,
			{ month: currentMonth }
		);

		if (result.rows.length === 0) {
			await db.execute(
				`INSERT OR IGNORE INTO email_usage (id, month, count) VALUES (:id, :month, 0)`,
				{ id: currentMonth, month: currentMonth }
			);
			return { count: 0, limit: EMAIL_MONTHLY_LIMIT, month: currentMonth };
		}

		return {
			count: result.rows[0].count as number,
			limit: EMAIL_MONTHLY_LIMIT,
			month: currentMonth
		};
	} catch (err) {
		console.error('Failed to get email usage:', err);
		return { count: 0, limit: EMAIL_MONTHLY_LIMIT, month: currentMonth };
	}
}

async function incrementEmailCount(): Promise<void> {
	const now = new Date();
	const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

	try {
		await db.execute(
			`INSERT INTO email_usage (id, month, count) VALUES (:id, :month, 1)
			 ON CONFLICT(month) DO UPDATE SET count = count + 1, updated_at = datetime('now')`,
			{ id: currentMonth, month: currentMonth }
		);
	} catch (err) {
		console.error('Failed to increment email count:', err);
	}
}

export async function sendEmail(
	to: string,
	subject: string,
	text: string,
	html?: string
): Promise<boolean> {
	const settings = await getEmailSettings();

	if (!settings) {
		console.log('Email settings not configured. Email would be sent to:', to);
		console.log('Subject:', subject);
		return false;
	}

	// Check limit
	const usage = await getEmailUsage();
	if (usage.count >= usage.limit) {
		console.error('Email monthly limit reached:', usage.count, '/', usage.limit);
		return false;
	}

	return sendViaSettings(settings, to, subject, text, html);
}

// 指定アカウントで送信する共通処理（Cloudflare Workers 対応）
async function sendViaSettings(
	settings: EmailSettings,
	to: string,
	subject: string,
	text: string,
	html?: string
): Promise<boolean> {
	try {
		// Cloudflare Workers では nodemailer の SMTP は動かない（生ソケット/DNS非対応）。
		// worker-mailer は cloudflare:sockets を使って Gmail SMTP に直接接続できる。
		// cloudflare:sockets はビルド時(Node)に存在しないため、実行時に動的importする。
		const { WorkerMailer } = await import('worker-mailer');
		const mailer = await WorkerMailer.connect({
			credentials: {
				username: settings.email_address,
				password: settings.app_password
			},
			authType: 'plain',
			host: settings.smtp_host,
			port: settings.smtp_port,
			secure: settings.smtp_port === 465,
			startTls: settings.smtp_port !== 465
		});

		await mailer.send({
			from: { name: settings.from_name || 'レビュー管理システム', email: settings.email_address },
			to: { email: to },
			subject,
			text,
			html: html || text
		});

		// Increment count on success
		await incrementEmailCount();

		console.log('Email sent successfully to:', to);
		return true;
	} catch (err) {
		console.error('Failed to send email:', err);
		return false;
	}
}

// 指定アカウントで接続テスト（テストメール送信）
export async function sendTestEmailForAccount(
	accountId: string,
	to: string
): Promise<{ success: boolean; error?: string }> {
	const settings = await getEmailSettingsById(accountId);
	if (!settings) return { success: false, error: 'アカウントが見つかりません' };

	const ok = await sendViaSettings(
		settings,
		to,
		'[テスト] メール設定の確認',
		`これは「${settings.from_name || settings.email_address}」からのテストメールです。メール設定は正常です。`,
		`<div style="font-family:sans-serif;max-width:600px;margin:0 auto"><h2 style="color:#333">テストメール ✅</h2><p style="color:#555">「${settings.from_name || settings.email_address}」(${settings.email_address}) からの送信に成功しました。メール設定は正常です。</p></div>`
	);
	return ok
		? { success: true }
		: { success: false, error: '送信に失敗しました。アドレス/アプリパスワード/ポートを確認してください。' };
}

export async function sendNotificationEmail(
	notificationId: string
): Promise<boolean> {
	try {
		const result = await db.execute(
			`SELECT n.*, u.email, u.name as user_name, r.title as review_title
			 FROM notifications n
			 JOIN users u ON n.user_id = u.id
			 LEFT JOIN reviews r ON n.review_id = r.id
			 WHERE n.id = :notificationId`,
			{ notificationId }
		);

		if (result.rows.length === 0) return false;

		const notification = result.rows[0];
		const email = notification.email as string;
		const subject = `[レビュー管理] ${notification.message}`;
		const text = notification.message as string;

		const sent = await sendEmail(email, subject, text);

		if (sent) {
			await db.execute(
				`UPDATE notifications SET email_sent = 1 WHERE id = :notificationId`,
				{ notificationId }
			);
		}

		return sent;
	} catch (err) {
		console.error('Failed to send notification email:', err);
		return false;
	}
}
