import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config();

const client = createClient({
	url: process.env.TURSO_DATABASE_URL,
	authToken: process.env.TURSO_AUTH_TOKEN
});

async function migrate() {
	console.log('Adding public_token column...');
	try {
		await client.execute('ALTER TABLE reviews ADD COLUMN public_token TEXT');
		console.log('✓ Added public_token column');
	} catch (err) {
		if (err.message.includes('duplicate column')) {
			console.log('Column already exists');
		} else {
			console.error('Error:', err.message);
		}
	}
	
	// Create index
	try {
		await client.execute('CREATE INDEX IF NOT EXISTS idx_reviews_public_token ON reviews(public_token)');
		console.log('✓ Created index');
	} catch (err) {
		console.error('Index error:', err.message);
	}
	
	console.log('Done!');
}

migrate();
