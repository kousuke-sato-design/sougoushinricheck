import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config();

const db = createClient({
	url: process.env.TURSO_DATABASE_URL,
	authToken: process.env.TURSO_AUTH_TOKEN
});

async function migrate() {
	console.log('Adding is_locked column to reviews table...');

	try {
		await db.execute(`ALTER TABLE reviews ADD COLUMN is_locked INTEGER DEFAULT 0`);
		console.log('Successfully added is_locked column');
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
