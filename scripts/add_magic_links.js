import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config();

const client = createClient({
	url: process.env.TURSO_DATABASE_URL,
	authToken: process.env.TURSO_AUTH_TOKEN
});

async function migrate() {
	console.log('Creating magic_links table...');

	try {
		await client.execute(`
			CREATE TABLE IF NOT EXISTS magic_links (
				id TEXT PRIMARY KEY,
				user_id TEXT NOT NULL,
				review_id TEXT,
				token TEXT UNIQUE NOT NULL,
				expires_at DATETIME NOT NULL,
				used_at DATETIME,
				created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
				FOREIGN KEY (user_id) REFERENCES users(id),
				FOREIGN KEY (review_id) REFERENCES reviews(id)
			)
		`);
		console.log('✓ Created magic_links table');
	} catch (err) {
		console.error('Error:', err.message);
	}

	// Create index
	try {
		await client.execute('CREATE INDEX IF NOT EXISTS idx_magic_links_token ON magic_links(token)');
		await client.execute('CREATE INDEX IF NOT EXISTS idx_magic_links_expires ON magic_links(expires_at)');
		console.log('✓ Created indexes');
	} catch (err) {
		console.error('Index error:', err.message);
	}

	console.log('Done!');
}

migrate();
