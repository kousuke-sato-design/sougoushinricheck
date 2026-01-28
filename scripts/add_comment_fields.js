import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config();

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function migrate() {
  console.log('Adding guest_name and action_type columns to comments...');
  
  try {
    // Add guest_name column
    await db.execute(`ALTER TABLE comments ADD COLUMN guest_name TEXT`);
    console.log('Added guest_name column');
  } catch (e) {
    if (e.message.includes('duplicate column')) {
      console.log('guest_name column already exists');
    } else {
      console.error('Error adding guest_name:', e.message);
    }
  }

  try {
    // Add action_type column
    await db.execute(`ALTER TABLE comments ADD COLUMN action_type TEXT DEFAULT 'comment'`);
    console.log('Added action_type column');
  } catch (e) {
    if (e.message.includes('duplicate column')) {
      console.log('action_type column already exists');
    } else {
      console.error('Error adding action_type:', e.message);
    }
  }

  // Update existing comments with action_type based on content
  console.log('Updating existing comments with action_type...');
  
  await db.execute(`
    UPDATE comments 
    SET action_type = 'approved' 
    WHERE content LIKE '%確認OK%'
  `);
  
  await db.execute(`
    UPDATE comments 
    SET action_type = 'rejected' 
    WHERE content LIKE '%差し戻し%' OR content LIKE '%コメント%'
  `);
  
  await db.execute(`
    UPDATE comments 
    SET action_type = 'resubmitted' 
    WHERE content LIKE '%再依頼%'
  `);

  console.log('Migration complete!');
}

migrate().catch(console.error);
