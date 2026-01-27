import nodemailer from 'nodemailer';
import { db } from './db';

interface EmailSettings {
	smtp_host: string;
	smtp_port: number;
	email_address: string;
	app_password: string;
}

export async function getEmailSettings(): Promise<EmailSettings | null> {
	const result = await db.execute(
		`SELECT * FROM email_settings WHERE is_active = 1 LIMIT 1`
	);

	if (result.rows.length === 0) return null;

	const row = result.rows[0];
	return {
		smtp_host: row.smtp_host as string,
		smtp_port: row.smtp_port as number,
		email_address: row.email_address as string,
		app_password: row.app_password as string
	};
}

export async function sendEmail(
	to: string,
	subject: string,
	text: string,
	html?: string
): Promise<boolean> {
	// Skip email in Cloudflare Workers environment (nodemailer doesn't work with Workers)
	if (typeof globalThis.caches !== 'undefined' && typeof (globalThis as unknown as Record<string, unknown>).process === 'undefined') {
		console.log('Email skipped: Running in Cloudflare Workers environment');
		return false;
	}

	const settings = await getEmailSettings();
	if (!settings) {
		console.log('Email settings not configured');
		return false;
	}

	try {
		const transporter = nodemailer.createTransport({
			host: settings.smtp_host,
			port: settings.smtp_port,
			secure: settings.smtp_port === 465,
			auth: {
				user: settings.email_address,
				pass: settings.app_password
			}
		});

		await transporter.sendMail({
			from: `"レビュー管理システム" <${settings.email_address}>`,
			to,
			subject,
			text,
			html: html || text
		});

		return true;
	} catch (err) {
		console.error('Email send error:', err);
		return false;
	}
}

export async function sendNotificationEmail(
	notificationId: string
): Promise<boolean> {
	// Get notification details
	const notifResult = await db.execute(
		`SELECT n.*, u.email, u.name as user_name, r.title as review_title, r.id as review_id
		 FROM notifications n
		 JOIN users u ON n.user_id = u.id
		 LEFT JOIN reviews r ON n.review_id = r.id
		 WHERE n.id = :notificationId`,
		{ notificationId }
	);

	if (notifResult.rows.length === 0) return false;

	const notif = notifResult.rows[0];

	const subject = getEmailSubject(notif.type as string, notif.review_title as string);
	const { text, html } = getEmailBody(notif);

	const success = await sendEmail(notif.email as string, subject, text, html);

	if (success) {
		await db.execute(
			`UPDATE notifications SET email_sent = 1 WHERE id = :notificationId`,
			{ notificationId }
		);
	}

	return success;
}

function getEmailSubject(type: string, reviewTitle: string): string {
	switch (type) {
		case 'review_request':
			return `[レビュー依頼] ${reviewTitle}`;
		case 'comment':
			return `[コメント] ${reviewTitle}`;
		case 'approval':
			return `[承認/差し戻し] ${reviewTitle}`;
		case 'reminder':
			return `[リマインダー] ${reviewTitle}`;
		default:
			return `[通知] ${reviewTitle}`;
	}
}

function getEmailBody(notif: Record<string, unknown>): { text: string; html: string } {
	const message = notif.message as string;
	const reviewId = notif.review_id as string;

	const baseUrl = process.env.PUBLIC_BASE_URL || 'http://localhost:5173';
	const reviewUrl = reviewId ? `${baseUrl}/reviews/${reviewId}` : baseUrl;

	const text = `${message}\n\n詳細はこちら: ${reviewUrl}`;

	const html = `
		<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
			<h2 style="color: #333;">社内レビュー管理システム</h2>
			<p style="color: #555; font-size: 16px;">${message}</p>
			<p style="margin-top: 20px;">
				<a href="${reviewUrl}" style="display: inline-block; padding: 10px 20px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px;">
					詳細を確認
				</a>
			</p>
			<hr style="margin-top: 30px; border: none; border-top: 1px solid #eee;" />
			<p style="color: #999; font-size: 12px;">
				このメールは社内レビュー管理システムから自動送信されています。
			</p>
		</div>
	`;

	return { text, html };
}
