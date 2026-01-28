import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { nanoid } from 'nanoid';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		throw redirect(302, '/');
	}

	// Load goals for project selector
	const goalsResult = await db.execute(
		`SELECT id, title, color, status FROM goals ORDER BY created_at DESC`
	);

	return {
		goals: goalsResult.rows,
		preselectedGoalId: url.searchParams.get('goal') || ''
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		if (!locals.user) {
			throw redirect(302, '/');
		}

		const formData = await request.formData();
		const title = formData.get('title') as string;
		const description = formData.get('description') as string;
		const emoji = formData.get('emoji') as string || '📄';
		const goalId = formData.get('goal_id') as string;

		if (!title || !title.trim()) {
			return fail(400, { error: 'タイトルを入力してください' });
		}

		const reviewId = nanoid();
		const publicToken = nanoid();

		await db.execute(
			`INSERT INTO reviews (id, title, description, emoji, target_url, content_type, status, requester_id, public_token)
			 VALUES (:id, :title, :description, :emoji, '', 'other', 'draft', :requesterId, :publicToken)`,
			{
				id: reviewId,
				title: title.trim(),
				description: description?.trim() || '',
				emoji,
				requesterId: locals.user.id,
				publicToken
			}
		);

		// Link to goal if selected
		if (goalId) {
			await db.execute(
				`INSERT INTO review_goals (id, goal_id, review_id) VALUES (:id, :goalId, :reviewId)`,
				{
					id: nanoid(),
					goalId,
					reviewId
				}
			);
		}

		throw redirect(302, `/reviews/${reviewId}`);
	}
};
