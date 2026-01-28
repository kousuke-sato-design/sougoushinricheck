import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { nanoid } from 'nanoid';

export const POST: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		return json({ error: '認証が必要です' }, { status: 401 });
	}

	const reviewId = params.id;

	// Check if review exists and user is the owner
	const review = await db.execute(
		`SELECT id, public_token, requester_id FROM reviews WHERE id = :reviewId`,
		{ reviewId }
	);

	if (review.rows.length === 0) {
		return json({ error: 'ドキュメントが見つかりません' }, { status: 404 });
	}

	const doc = review.rows[0];

	// Only owner can generate share URL
	if (doc.requester_id !== locals.user.id) {
		return json({ error: '権限がありません' }, { status: 403 });
	}

	// If already has token, return it
	if (doc.public_token) {
		return json({ token: doc.public_token });
	}

	// Generate new token
	const publicToken = nanoid(32);

	await db.execute(
		`UPDATE reviews SET public_token = :publicToken, status = 'shared' WHERE id = :reviewId`,
		{ publicToken, reviewId }
	);

	return json({ token: publicToken });
};
