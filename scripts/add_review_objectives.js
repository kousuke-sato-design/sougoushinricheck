import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config();

const db = createClient({
	url: process.env.TURSO_DATABASE_URL,
	authToken: process.env.TURSO_AUTH_TOKEN
});

async function migrate() {
	console.log('Adding review_objectives table...');

	// Create review_objectives linking table
	await db.execute(`
		CREATE TABLE IF NOT EXISTS review_objectives (
			id TEXT PRIMARY KEY,
			review_id TEXT NOT NULL,
			objective_id TEXT NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE,
			FOREIGN KEY (objective_id) REFERENCES goal_objectives(id) ON DELETE CASCADE,
			UNIQUE(review_id, objective_id)
		)
	`);

	console.log('Migration completed successfully!');
}

migrate().catch(console.error);
