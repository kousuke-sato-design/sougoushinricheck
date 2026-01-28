import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';

dotenv.config();

const db = createClient({
	url: process.env.TURSO_DATABASE_URL,
	authToken: process.env.TURSO_AUTH_TOKEN
});

async function migrate() {
	console.log('Adding emoji column to reviews table...');

	try {
		// Add emoji column
		await db.execute(`ALTER TABLE reviews ADD COLUMN emoji TEXT DEFAULT '📄'`);
		console.log('Added emoji column');
	} catch (err) {
		if (err.message?.includes('duplicate column')) {
			console.log('emoji column already exists');
		} else {
			throw err;
		}
	}

	console.log('Migration complete!');
}

migrate().catch(console.error);
