import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { nanoid } from 'nanoid';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(302, '/');
	}

	// Get all active users for assignee selection
	const users = await db.execute(
		`SELECT id, name, email FROM users WHERE is_active = 1 ORDER BY name`
	);

	return {
		users: users.rows
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
		const dueDate = formData.get('due_date') as string;
		const priority = formData.get('priority') as string;
		const color = formData.get('color') as string;
		const assigneeIds = formData.getAll('assignees') as string[];

		// Validation
		if (!title || !title.trim()) {
			return fail(400, { error: 'タイトルを入力してください' });
		}

		if (!dueDate) {
			return fail(400, { error: '期限を設定してください' });
		}

		const goalId = nanoid();
		const now = new Date().toISOString();

		// Create goal
		await db.execute(
			`INSERT INTO goals (id, title, description, due_date, priority, color, created_by, created_at, updated_at)
			 VALUES (:id, :title, :description, :dueDate, :priority, :color, :createdBy, :now, :now)`,
			{
				id: goalId,
				title: title.trim(),
				description: description?.trim() || null,
				dueDate,
				priority: priority || 'medium',
				color: color || '#3b82f6',
				createdBy: locals.user.id,
				now
			}
		);

		// Add assignees
		for (const userId of assigneeIds) {
			if (userId) {
				await db.execute(
					`INSERT INTO goal_assignees (id, goal_id, user_id) VALUES (:id, :goalId, :userId)`,
					{
						id: nanoid(),
						goalId,
						userId
					}
				);
			}
		}

		throw redirect(302, `/goals/${goalId}`);
	}
};
