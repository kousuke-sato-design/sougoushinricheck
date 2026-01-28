import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config();

const db = createClient({
	url: process.env.TURSO_DATABASE_URL,
	authToken: process.env.TURSO_AUTH_TOKEN
});

async function migrate() {
	console.log('Adding project_url column to reviews table...');

	try {
		await db.execute(`ALTER TABLE reviews ADD COLUMN project_url TEXT`);
		console.log('Successfully added project_url column');
	} catch (error) {
		if (error.message.includes('duplicate column name')) {
			console.log('Column already exists, skipping...');
		} else {
			throw error;
		}
	}

	console.log('Migration complete!');
}

migrate().catch(console.error);
