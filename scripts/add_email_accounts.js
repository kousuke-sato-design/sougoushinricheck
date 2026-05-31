import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config();

const client = createClient({
	url: process.env.TURSO_DATABASE_URL,
	authToken: process.env.TURSO_AUTH_TOKEN
});

async function migrate() {
	console.log('Extending email_settings for multiple Gmail accounts...');

	// 既存テーブルに列を追加（既にあればスキップ）
	const cols = [
		{ name: 'from_name', ddl: `ALTER TABLE email_settings ADD COLUMN from_name TEXT` },
		{ name: 'is_default', ddl: `ALTER TABLE email_settings ADD COLUMN is_default INTEGER DEFAULT 0` }
	];

	for (const col of cols) {
		try {
			await client.execute(col.ddl);
			console.log(`✓ Added column ${col.name}`);
		} catch (err) {
			if (/duplicate column name/i.test(err.message)) {
				console.log(`- Column ${col.name} already exists, skipping`);
			} else {
				console.error(`Error adding ${col.name}:`, err.message);
			}
		}
	}

	// 既存のアクティブ設定をデフォルトに（デフォルトが未設定の場合のみ）
	const def = await client.execute(`SELECT COUNT(*) as c FROM email_settings WHERE is_default = 1`);
	if ((def.rows[0]?.c ?? 0) === 0) {
		await client.execute(
			`UPDATE email_settings SET is_default = 1
			 WHERE id = (SELECT id FROM email_settings WHERE is_active = 1 ORDER BY created_at ASC LIMIT 1)`
		);
		console.log('✓ Set existing active account as default');
	} else {
		console.log('- A default account already exists');
	}

	console.log('Done!');
}

migrate();
