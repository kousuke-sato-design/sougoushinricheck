import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';

export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		return json({ error: '認証が必要です' }, { status: 401 });
	}

	const goalId = params.id;

	// Check if the goal exists and belongs to the user
	const goalResult = await db.execute(
		`SELECT id, created_by FROM goals WHERE id = :goalId`,
		{ goalId }
	);

	if (goalResult.rows.length === 0) {
		return json({ error: 'プロジェクトが見つかりません' }, { status: 404 });
	}

	const goal = goalResult.rows[0] as { id: string; created_by: string };

	// Only allow the creator or admin to delete
	if (goal.created_by !== locals.user.id && locals.user.role !== 'admin') {
		return json({ error: '削除権限がありません' }, { status: 403 });
	}

	// Delete related records first
	await db.execute(`DELETE FROM goal_assignees WHERE goal_id = :goalId`, { goalId });
	await db.execute(`DELETE FROM review_goals WHERE goal_id = :goalId`, { goalId });

	// Delete the goal
	await db.execute(`DELETE FROM goals WHERE id = :goalId`, { goalId });

	return json({ success: true });
};
