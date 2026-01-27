import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config();

const client = createClient({
	url: process.env.TURSO_DATABASE_URL,
	authToken: process.env.TURSO_AUTH_TOKEN
});

async function migrate() {
	console.log('Adding goal_tasks table...');

	// goal_tasks テーブル（プロジェクト内タスク）
	try {
		await client.execute(`
			CREATE TABLE IF NOT EXISTS goal_tasks (
				id TEXT PRIMARY KEY,
				goal_id TEXT NOT NULL,
				title TEXT NOT NULL,
				description TEXT,
				due_date DATETIME,
				status TEXT DEFAULT 'pending',
				sort_order INTEGER DEFAULT 0,
				created_by TEXT NOT NULL,
				created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
				updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
				FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE,
				FOREIGN KEY (created_by) REFERENCES users(id)
			)
		`);
		console.log('✓ Created goal_tasks table');
	} catch (err) {
		console.error('goal_tasks table error:', err.message);
	}

	// インデックス
	try {
		await client.execute('CREATE INDEX IF NOT EXISTS idx_goal_tasks_goal_id ON goal_tasks(goal_id)');
		await client.execute('CREATE INDEX IF NOT EXISTS idx_goal_tasks_status ON goal_tasks(status)');
		await client.execute('CREATE INDEX IF NOT EXISTS idx_goal_tasks_due_date ON goal_tasks(due_date)');
		console.log('✓ Created indexes');
	} catch (err) {
		console.error('Index error:', err.message);
	}

	console.log('Done!');
}

migrate();
