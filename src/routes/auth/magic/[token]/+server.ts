import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { nanoid } from 'nanoid';

export const GET: RequestHandler = async ({ params, cookies }) => {
	const token = params.token;

	// Find the magic link
	const result = await db.execute(
		`SELECT ml.*, u.id as user_id, u.email, u.name, u.role
		 FROM magic_links ml
		 JOIN users u ON ml.user_id = u.id
		 WHERE ml.token = :token
		 AND ml.expires_at > datetime('now')
		 AND ml.used_at IS NULL`,
		{ token }
	);

	if (result.rows.length === 0) {
		// Invalid or expired token
		throw redirect(302, '/?error=invalid_link');
	}

	const magicLink = result.rows[0];

	// Mark the token as used
	await db.execute(
		`UPDATE magic_links SET used_at = datetime('now') WHERE id = :id`,
		{ id: magicLink.id }
	);

	// Create a session
	const sessionId = nanoid(32);
	const expiresAt = new Date();
	expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

	await db.execute(
		`INSERT INTO sessions (id, user_id, expires_at) VALUES (:id, :userId, :expiresAt)`,
		{
			id: sessionId,
			userId: magicLink.user_id,
			expiresAt: expiresAt.toISOString()
		}
	);

	// Set the session cookie
	cookies.set('session', sessionId, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: false, // Set to true in production
		maxAge: 60 * 60 * 24 * 7 // 7 days
	});

	// Redirect to the review if specified, otherwise to dashboard
	if (magicLink.review_id) {
		throw redirect(302, `/reviews/${magicLink.review_id}`);
	}

	throw redirect(302, '/dashboard');
};
