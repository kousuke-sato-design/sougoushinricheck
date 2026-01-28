import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config();

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function migrate() {
  console.log('Fixing comments table: making user_id nullable...');

  // SQLiteではALTER COLUMNができないので、テーブルを再作成する
  await db.execute(`
    CREATE TABLE IF NOT EXISTS comments_new (
      id TEXT PRIMARY KEY,
      review_id TEXT NOT NULL,
      user_id TEXT,
      parent_id TEXT,
      content TEXT NOT NULL,
      guest_name TEXT,
      action_type TEXT DEFAULT 'comment',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (parent_id) REFERENCES comments(id)
    )
  `);
  console.log('Created comments_new table');

  // データをコピー
  await db.execute(`
    INSERT INTO comments_new (id, review_id, user_id, parent_id, content, guest_name, action_type, created_at, updated_at)
    SELECT id, review_id, user_id, parent_id, content, guest_name, action_type, created_at, updated_at
    FROM comments
  `);
  console.log('Copied data to comments_new');

  // 古いテーブルを削除
  await db.execute(`DROP TABLE comments`);
  console.log('Dropped old comments table');

  // 新しいテーブルをリネーム
  await db.execute(`ALTER TABLE comments_new RENAME TO comments`);
  console.log('Renamed comments_new to comments');

  // インデックス再作成
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_comments_review_id ON comments(review_id)`);
  console.log('Recreated index');

  console.log('Migration complete! user_id is now nullable.');
}

migrate().catch(console.error);
