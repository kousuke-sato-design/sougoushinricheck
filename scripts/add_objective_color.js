import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';

dotenv.config();

const db = createClient({
	url: process.env.TURSO_DATABASE_URL,
	authToken: process.env.TURSO_AUTH_TOKEN
});

async function migrate() {
	console.log('Adding color to goal_objectives table...');

	try {
		await db.execute(`
			ALTER TABLE goal_objectives ADD COLUMN color TEXT DEFAULT '#3b82f6'
		`);
		console.log('Added color column');
	} catch (err) {
		if (err.message.includes('duplicate column')) {
			console.log('Column already exists');
		} else {
			console.error('Error:', err.message);
		}
	}

	console.log('Migration complete!');
}

migrate().catch(console.error);
