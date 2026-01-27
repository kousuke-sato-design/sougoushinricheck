import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config();

const client = createClient({
	url: process.env.TURSO_DATABASE_URL,
	authToken: process.env.TURSO_AUTH_TOKEN
});

async function migrate() {
	console.log('Adding goals and calendar tables...');

	// 1. goals テーブル
	try {
		await client.execute(`
			CREATE TABLE IF NOT EXISTS goals (
				id TEXT PRIMARY KEY,
				title TEXT NOT NULL,
				description TEXT,
				due_date DATETIME NOT NULL,
				priority TEXT DEFAULT 'medium',
				status TEXT DEFAULT 'pending',
				color TEXT DEFAULT '#3b82f6',
				created_by TEXT NOT NULL,
				created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
				updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
				FOREIGN KEY (created_by) REFERENCES users(id)
			)
		`);
		console.log('✓ Created goals table');
	} catch (err) {
		console.error('goals table error:', err.message);
	}

	// 2. goal_assignees テーブル
	try {
		await client.execute(`
			CREATE TABLE IF NOT EXISTS goal_assignees (
				id TEXT PRIMARY KEY,
				goal_id TEXT NOT NULL,
				user_id TEXT NOT NULL,
				created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
				FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE,
				FOREIGN KEY (user_id) REFERENCES users(id),
				UNIQUE(goal_id, user_id)
			)
		`);
		console.log('✓ Created goal_assignees table');
	} catch (err) {
		console.error('goal_assignees table error:', err.message);
	}

	// 3. review_goals テーブル
	try {
		await client.execute(`
			CREATE TABLE IF NOT EXISTS review_goals (
				id TEXT PRIMARY KEY,
				review_id TEXT NOT NULL,
				goal_id TEXT NOT NULL,
				created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
				FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE,
				FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE,
				UNIQUE(review_id, goal_id)
			)
		`);
		console.log('✓ Created review_goals table');
	} catch (err) {
		console.error('review_goals table error:', err.message);
	}

	// 4. check_items テーブル
	try {
		await client.execute(`
			CREATE TABLE IF NOT EXISTS check_items (
				id TEXT PRIMARY KEY,
				review_id TEXT NOT NULL,
				goal_id TEXT,
				content TEXT NOT NULL,
				purpose TEXT,
				due_date DATETIME,
				priority TEXT DEFAULT 'medium',
				is_checked INTEGER DEFAULT 0,
				checked_by TEXT,
				checked_at DATETIME,
				created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
				FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE,
				FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE SET NULL,
				FOREIGN KEY (checked_by) REFERENCES users(id)
			)
		`);
		console.log('✓ Created check_items table');
	} catch (err) {
		console.error('check_items table error:', err.message);
	}

	// 5. magic_links に type カラム追加
	try {
		await client.execute(`ALTER TABLE magic_links ADD COLUMN type TEXT DEFAULT 'review'`);
		console.log('✓ Added type column to magic_links');
	} catch (err) {
		if (err.message.includes('duplicate column')) {
			console.log('- type column already exists in magic_links');
		} else {
			console.error('magic_links alter error:', err.message);
		}
	}

	// 6. インデックス作成
	const indexes = [
		'CREATE INDEX IF NOT EXISTS idx_goals_created_by ON goals(created_by)',
		'CREATE INDEX IF NOT EXISTS idx_goals_due_date ON goals(due_date)',
		'CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(status)',
		'CREATE INDEX IF NOT EXISTS idx_goal_assignees_goal_id ON goal_assignees(goal_id)',
		'CREATE INDEX IF NOT EXISTS idx_goal_assignees_user_id ON goal_assignees(user_id)',
		'CREATE INDEX IF NOT EXISTS idx_review_goals_review_id ON review_goals(review_id)',
		'CREATE INDEX IF NOT EXISTS idx_review_goals_goal_id ON review_goals(goal_id)',
		'CREATE INDEX IF NOT EXISTS idx_check_items_review_id ON check_items(review_id)',
		'CREATE INDEX IF NOT EXISTS idx_check_items_goal_id ON check_items(goal_id)',
		'CREATE INDEX IF NOT EXISTS idx_magic_links_type ON magic_links(type)'
	];

	for (const sql of indexes) {
		try {
			await client.execute(sql);
		} catch (err) {
			console.error('Index error:', err.message);
		}
	}
	console.log('✓ Created indexes');

	console.log('Done!');
}

migrate();
