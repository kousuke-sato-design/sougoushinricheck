import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config();

const client = createClient({
	url: process.env.TURSO_DATABASE_URL,
	authToken: process.env.TURSO_AUTH_TOKEN
});

async function migrate() {
	console.log('Creating email_usage table...');

	try {
		await client.execute(`
			CREATE TABLE IF NOT EXISTS email_usage (
				id TEXT PRIMARY KEY,
				month TEXT NOT NULL,
				count INTEGER DEFAULT 0,
				created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
				updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
				UNIQUE(month)
			)
		`);
		console.log('✓ Created email_usage table');
	} catch (err) {
		console.error('Error:', err.message);
	}

	// Initialize current month
	const now = new Date();
	const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

	try {
		await client.execute(
			`INSERT OR IGNORE INTO email_usage (id, month, count) VALUES (?, ?, 0)`,
			[currentMonth, currentMonth]
		);
		console.log('✓ Initialized current month:', currentMonth);
	} catch (err) {
		console.error('Error initializing month:', err.message);
	}

	console.log('Done!');
}

migrate();
