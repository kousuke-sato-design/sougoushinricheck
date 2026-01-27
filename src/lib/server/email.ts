import { db } from './db';

interface EmailSettings {
	smtp_host: string;
	smtp_port: number;
	email_address: string;
	app_password: string;
}

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

export async function sendEmail(
	to: string,
	subject: string,
	text: string,
	html?: string
): Promise<boolean> {
	// Email temporarily disabled - will be implemented with Resend API later
	console.log(`Email would be sent to: ${to}, subject: ${subject}`);
	return false;
}

export async function sendNotificationEmail(
	notificationId: string
): Promise<boolean> {
	// Email temporarily disabled
	console.log(`Notification email would be sent for: ${notificationId}`);
	return false;
}
