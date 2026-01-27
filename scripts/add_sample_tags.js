import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import { nanoid } from 'nanoid';

dotenv.config();

const client = createClient({
	url: process.env.TURSO_DATABASE_URL,
	authToken: process.env.TURSO_AUTH_TOKEN
});

const sampleTags = [
	{ name: '至急', color: '#dc2626' },        // 赤
	{ name: '1週間以内', color: '#f59e0b' },   // オレンジ
	{ name: '確認依頼', color: '#3b82f6' },    // 青
	{ name: '修正依頼', color: '#eab308' },    // イエロー
	{ name: 'デザイン', color: '#8b5cf6' },    // 紫
	{ name: 'LP', color: '#10b981' },          // 緑
	{ name: 'ブログ', color: '#ec4899' },      // ピンク
	{ name: 'プレスリリース', color: '#06b6d4' }, // シアン
];

async function addSampleTags() {
	console.log('Adding sample tags...');

	for (const tag of sampleTags) {
		try {
			// Check if tag already exists
			const existing = await client.execute(
				`SELECT id FROM tags WHERE name = :name`,
				{ name: tag.name }
			);

			if (existing.rows.length === 0) {
				await client.execute(
					`INSERT INTO tags (id, name, color) VALUES (:id, :name, :color)`,
					{
						id: nanoid(),
						name: tag.name,
						color: tag.color
					}
				);
				console.log(`✓ Added tag: ${tag.name}`);
			} else {
				console.log(`- Tag already exists: ${tag.name}`);
			}
		} catch (err) {
			console.error(`Error adding tag ${tag.name}:`, err.message);
		}
	}

	console.log('Done!');
}

addSampleTags();
