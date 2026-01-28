import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config();

const client = createClient({
	url: process.env.TURSO_DATABASE_URL,
	authToken: process.env.TURSO_AUTH_TOKEN
});

async function migrate() {
	console.log('Creating system_links table...');

	await client.execute(`
		CREATE TABLE IF NOT EXISTS system_links (
			id TEXT PRIMARY KEY,
			title TEXT NOT NULL,
			description TEXT,
			url TEXT NOT NULL,
			color TEXT DEFAULT '2196F3',
			sort_order INTEGER DEFAULT 0,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)
	`);

	console.log('system_links table created!');

	// Insert default system links
	const defaultLinks = [
		{ id: 'link1', title: '80stresscheck', description: 'ストレスチェックシステム', url: 'https://80stresscheck.pages.dev', color: '2196F3' },
		{ id: 'link2', title: 'webthqacademy', description: 'アカデミー', url: 'https://webthqacademy.pages.dev', color: '4CAF50' },
		{ id: 'link3', title: 'THQmake', description: 'MAツール', url: 'https://thqmake.pages.dev', color: 'FF9800' },
		{ id: 'link4', title: 'WEBTHQUI', description: 'ストレスチェック分析', url: 'https://webthqui.pages.dev', color: '9C27B0' },
		{ id: 'link5', title: '総合心理ラボ', description: '心理ラボ', url: 'https://sougoushinrilab.pages.dev', color: 'E91E63' },
		{ id: 'link6', title: '研究所CRM', description: 'CRMシステム', url: 'https://kenkyujocrm.pages.dev', color: '00BCD4' },
		{ id: 'link7', title: '総合心理チェック', description: 'このシステム', url: 'https://sougoushinricheck.pages.dev', color: '607D8B' },
	];

	for (let i = 0; i < defaultLinks.length; i++) {
		const link = defaultLinks[i];
		try {
			await client.execute({
				sql: `INSERT OR IGNORE INTO system_links (id, title, description, url, color, sort_order) VALUES (?, ?, ?, ?, ?, ?)`,
				args: [link.id, link.title, link.description, link.url, link.color, i]
			});
			console.log(`Inserted: ${link.title}`);
		} catch (e) {
			console.log(`Skipped (already exists): ${link.title}`);
		}
	}

	console.log('Migration completed!');
}

migrate().catch(console.error);
