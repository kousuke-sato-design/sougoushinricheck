import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config();

const client = createClient({
	url: process.env.TURSO_DATABASE_URL,
	authToken: process.env.TURSO_AUTH_TOKEN
});

async function migrate() {
	console.log('Creating confirmation_email_logs table...');

	try {
		await client.execute(`
			CREATE TABLE IF NOT EXISTS confirmation_email_logs (
				id TEXT PRIMARY KEY,
				review_id TEXT NOT NULL,
				recipient_id TEXT NOT NULL,
				sender_id TEXT NOT NULL,
				message TEXT,
				due_date DATETIME,
				success INTEGER DEFAULT 1,
				sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
				FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE,
				FOREIGN KEY (recipient_id) REFERENCES users(id),
				FOREIGN KEY (sender_id) REFERENCES users(id)
			)
		`);
		console.log('✓ Created confirmation_email_logs table');

		await client.execute(
			`CREATE INDEX IF NOT EXISTS idx_cel_review_id ON confirmation_email_logs(review_id)`
		);
		await client.execute(
			`CREATE INDEX IF NOT EXISTS idx_cel_sent_at ON confirmation_email_logs(sent_at)`
		);
		console.log('✓ Created indexes');
	} catch (err) {
		console.error('Error:', err.message);
	}

	console.log('Done!');
}

migrate();
