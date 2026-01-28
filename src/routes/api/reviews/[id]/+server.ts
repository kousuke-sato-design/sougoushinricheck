import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';

export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		return json({ error: '認証が必要です' }, { status: 401 });
	}

	const reviewId = params.id;

	// Check if the review belongs to the user
	const reviewResult = await db.execute(
		`SELECT id, requester_id FROM reviews WHERE id = :reviewId`,
		{ reviewId }
	);

	if (reviewResult.rows.length === 0) {
		return json({ error: 'ドキュメントが見つかりません' }, { status: 404 });
	}

	const review = reviewResult.rows[0] as { id: string; requester_id: string };

	// Only allow the requester or admin to delete
	if (review.requester_id !== locals.user.id && locals.user.role !== 'admin') {
		return json({ error: '削除権限がありません' }, { status: 403 });
	}

	// Delete related records first
	await db.execute(`DELETE FROM comments WHERE review_id = :reviewId`, { reviewId });
	await db.execute(`DELETE FROM review_assignees WHERE review_id = :reviewId`, { reviewId });
	await db.execute(`DELETE FROM review_tags WHERE review_id = :reviewId`, { reviewId });
	await db.execute(`DELETE FROM review_goals WHERE review_id = :reviewId`, { reviewId });

	// Delete the review
	await db.execute(`DELETE FROM reviews WHERE id = :reviewId`, { reviewId });

	return json({ success: true });
};
