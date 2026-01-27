import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config();

const client = createClient({
	url: process.env.TURSO_DATABASE_URL,
	authToken: process.env.TURSO_AUTH_TOKEN
});

async function migrate() {
	console.log('Creating tags tables...');

	// Create tags table
	try {
		await client.execute(`
			CREATE TABLE IF NOT EXISTS tags (
				id TEXT PRIMARY KEY,
				name TEXT NOT NULL UNIQUE,
				color TEXT DEFAULT '#3b82f6',
				created_at DATETIME DEFAULT CURRENT_TIMESTAMP
			)
		`);
		console.log('✓ Created tags table');
	} catch (err) {
		console.error('Tags table error:', err.message);
	}

	// Create review_tags junction table
	try {
		await client.execute(`
			CREATE TABLE IF NOT EXISTS review_tags (
				id TEXT PRIMARY KEY,
				review_id TEXT NOT NULL,
				tag_id TEXT NOT NULL,
				FOREIGN KEY (review_id) REFERENCES reviews(id),
				FOREIGN KEY (tag_id) REFERENCES tags(id),
				UNIQUE(review_id, tag_id)
			)
		`);
		console.log('✓ Created review_tags table');
	} catch (err) {
		console.error('Review_tags table error:', err.message);
	}

	// Create index
	try {
		await client.execute('CREATE INDEX IF NOT EXISTS idx_review_tags_review ON review_tags(review_id)');
		await client.execute('CREATE INDEX IF NOT EXISTS idx_review_tags_tag ON review_tags(tag_id)');
		console.log('✓ Created indexes');
	} catch (err) {
		console.error('Index error:', err.message);
	}

	// Add some default tags
	const defaultTags = [
		{ id: 'tag_web', name: 'Web/LP', color: '#3b82f6' },
		{ id: 'tag_blog', name: 'ブログ', color: '#10b981' },
		{ id: 'tag_pr', name: 'プレスリリース', color: '#8b5cf6' },
		{ id: 'tag_design', name: 'デザイン', color: '#f59e0b' },
		{ id: 'tag_video', name: '動画', color: '#ef4444' },
		{ id: 'tag_document', name: 'ドキュメント', color: '#6366f1' }
	];

	for (const tag of defaultTags) {
		try {
			await client.execute(
				`INSERT OR IGNORE INTO tags (id, name, color) VALUES (:id, :name, :color)`,
				tag
			);
		} catch (err) {
			// Ignore duplicates
		}
	}
	console.log('✓ Added default tags');

	console.log('Done!');
}

migrate();
