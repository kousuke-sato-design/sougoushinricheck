import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';

dotenv.config();

const db = createClient({
	url: process.env.TURSO_DATABASE_URL,
	authToken: process.env.TURSO_AUTH_TOKEN
});

async function migrate() {
	console.log('Creating goal_objectives table...');

	try {
		await db.execute(`
			CREATE TABLE IF NOT EXISTS goal_objectives (
				id TEXT PRIMARY KEY,
				goal_id TEXT NOT NULL,
				title TEXT NOT NULL,
				is_completed INTEGER DEFAULT 0,
				sort_order INTEGER DEFAULT 0,
				created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
				updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
				FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE
			)
		`);
		console.log('Created goal_objectives table');
	} catch (err) {
		console.error('Error:', err.message);
	}

	console.log('Migration complete!');
}

migrate().catch(console.error);
