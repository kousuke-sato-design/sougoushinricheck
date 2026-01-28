import { db } from './db';
import nodemailer from 'nodemailer';

interface EmailSettings {
	smtp_host: string;
	smtp_port: number;
	email_address: string;
	app_password: string;
}

const EMAIL_MONTHLY_LIMIT = 3000;

export async function getEmailSettings(): Promise<EmailSettings | null> {
	try {
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
	} catch (err) {
		console.error('Failed to get email settings:', err);
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
			from: `レビュー管理システム <${settings.email_address}>`,
			to,
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
