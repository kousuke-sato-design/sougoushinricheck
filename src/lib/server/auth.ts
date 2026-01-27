import { db } from './db';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';

const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface User {
	id: string;
	email: string;
	name: string;
	role: 'admin' | 'member';
	is_active: number;
	created_at: string;
	updated_at: string;
}

export interface Session {
	id: string;
	user_id: string;
	expires_at: string;
}

export async function hashPassword(password: string): Promise<string> {
	return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
	return bcrypt.compare(password, hash);
}

export async function createUser(
	email: string,
	name: string,
	password: string,
	role: 'admin' | 'member' = 'member'
): Promise<User> {
	const id = nanoid();
	const password_hash = await hashPassword(password);

	await db.execute(
		`INSERT INTO users (id, email, name, password_hash, role) VALUES (:id, :email, :name, :password_hash, :role)`,
		{ id, email, name, password_hash, role }
	);

	return {
		id,
		email,
		name,
		role,
		is_active: 1,
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString()
	};
}

export async function getUserByEmail(email: string): Promise<(User & { password_hash: string }) | null> {
	const result = await db.execute(`SELECT * FROM users WHERE email = :email AND is_active = 1`, {
		email
	});

	if (result.rows.length === 0) return null;

	const row = result.rows[0];
	return {
		id: row.id as string,
		email: row.email as string,
		name: row.name as string,
		password_hash: row.password_hash as string,
		role: row.role as 'admin' | 'member',
		is_active: row.is_active as number,
		created_at: row.created_at as string,
		updated_at: row.updated_at as string
	};
}

export async function getUserById(id: string): Promise<User | null> {
	const result = await db.execute(`SELECT * FROM users WHERE id = :id AND is_active = 1`, { id });

	if (result.rows.length === 0) return null;

	const row = result.rows[0];
	return {
		id: row.id as string,
		email: row.email as string,
		name: row.name as string,
		role: row.role as 'admin' | 'member',
		is_active: row.is_active as number,
		created_at: row.created_at as string,
		updated_at: row.updated_at as string
	};
}

export async function createSession(userId: string): Promise<Session> {
	const id = nanoid(32);
	const expires_at = new Date(Date.now() + SESSION_DURATION_MS).toISOString();

	await db.execute(
		`INSERT INTO sessions (id, user_id, expires_at) VALUES (:id, :user_id, :expires_at)`,
		{ id, user_id: userId, expires_at }
	);

	return { id, user_id: userId, expires_at };
}

export async function getSession(sessionId: string): Promise<Session | null> {
	const result = await db.execute(
		`SELECT * FROM sessions WHERE id = :id AND expires_at > datetime('now')`,
		{ id: sessionId }
	);

	if (result.rows.length === 0) return null;

	const row = result.rows[0];
	return {
		id: row.id as string,
		user_id: row.user_id as string,
		expires_at: row.expires_at as string
	};
}

export async function deleteSession(sessionId: string): Promise<void> {
	await db.execute(`DELETE FROM sessions WHERE id = :id`, { id: sessionId });
}

export async function deleteExpiredSessions(): Promise<void> {
	await db.execute(`DELETE FROM sessions WHERE expires_at <= datetime('now')`);
}

export async function getUserCount(): Promise<number> {
	const result = await db.execute(`SELECT COUNT(*) as count FROM users`);
	return (result.rows[0]?.count as number) || 0;
}

export async function login(
	email: string,
	password: string
): Promise<{ user: User; session: Session } | null> {
	const user = await getUserByEmail(email);
	if (!user) return null;

	const valid = await verifyPassword(password, user.password_hash);
	if (!valid) return null;

	const session = await createSession(user.id);

	const { password_hash: _, ...userWithoutPassword } = user;
	return { user: userWithoutPassword, session };
}
