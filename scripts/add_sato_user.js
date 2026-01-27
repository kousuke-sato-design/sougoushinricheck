import 'dotenv/config';
import { createClient } from '@libsql/client';
import { nanoid } from 'nanoid';
import bcrypt from 'bcryptjs';

const client = createClient({
	url: process.env.TURSO_DATABASE_URL,
	authToken: process.env.TURSO_AUTH_TOKEN
});

async function addUser() {
	console.log('Adding user: 管理部佐藤...');

	const userId = nanoid();
	const email = 'sato@sougoushinri.co.jp';
	const name = '管理部佐藤';
	const password = 'password123'; // 初期パスワード
	const passwordHash = await bcrypt.hash(password, 10);

	try {
		// Check if user already exists
		const existing = await client.execute({
			sql: `SELECT id FROM users WHERE email = ?`,
			args: [email]
		});

		if (existing.rows.length > 0) {
			console.log('User already exists with this email');
			return;
		}

		await client.execute({
			sql: `INSERT INTO users (id, email, name, password_hash, role, is_active) VALUES (?, ?, ?, ?, ?, ?)`,
			args: [userId, email, name, passwordHash, 'member', 1]
		});

		console.log('User added successfully!');
		console.log('Email:', email);
		console.log('Password:', password);
		console.log('(Please change the password after first login)');
	} catch (error) {
		console.error('Error adding user:', error);
	}
}

addUser();
