import { redirect, fail, error } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { nanoid } from 'nanoid';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) {
		throw redirect(302, '/');
	}

	const goalId = params.id;

	// Get goal details
	const goalResult = await db.execute(
		`SELECT g.*, u.name as creator_name
		 FROM goals g
		 JOIN users u ON g.created_by = u.id
		 WHERE g.id = :goalId`,
		{ goalId }
	);

	if (goalResult.rows.length === 0) {
		throw error(404, 'プロジェクトが見つかりません');
	}

	const goal = goalResult.rows[0];

	// Get assignees
	const assigneesResult = await db.execute(
		`SELECT u.id, u.name, u.email
		 FROM goal_assignees ga
		 JOIN users u ON ga.user_id = u.id
		 WHERE ga.goal_id = :goalId`,
		{ goalId }
	);

	// Get related reviews
	const reviewsResult = await db.execute(
		`SELECT r.*, u.name as requester_name
		 FROM review_goals rg
		 JOIN reviews r ON rg.review_id = r.id
		 JOIN users u ON r.requester_id = u.id
		 WHERE rg.goal_id = :goalId
		 ORDER BY r.created_at DESC`,
		{ goalId }
	);

	// Get all users for editing
	const allUsers = await db.execute(
		`SELECT id, name, email FROM users WHERE is_active = 1 ORDER BY name`
	);

	// Get all reviews for linking
	const allReviews = await db.execute(
		`SELECT id, title, status FROM reviews ORDER BY created_at DESC LIMIT 50`
	);

	// Get tasks for this goal
	const tasksResult = await db.execute(
		`SELECT gt.*, u.name as creator_name
		 FROM goal_tasks gt
		 JOIN users u ON gt.created_by = u.id
		 WHERE gt.goal_id = :goalId
		 ORDER BY gt.sort_order ASC, gt.created_at ASC`,
		{ goalId }
	);

	return {
		goal: {
			...goal,
			assignees: assigneesResult.rows,
			reviews: reviewsResult.rows,
			tasks: tasksResult.rows
		},
		allUsers: allUsers.rows,
		allReviews: allReviews.rows
	};
};

export const actions: Actions = {
	update: async ({ request, locals, params }) => {
		if (!locals.user) {
			throw redirect(302, '/');
		}

		const goalId = params.id;
		const formData = await request.formData();
		const title = formData.get('title') as string;
		const description = formData.get('description') as string;
		const dueDate = formData.get('due_date') as string;
		const priority = formData.get('priority') as string;
		const status = formData.get('status') as string;
		const color = formData.get('color') as string;
		const assigneeIds = formData.getAll('assignees') as string[];

		if (!title || !title.trim()) {
			return fail(400, { error: 'タイトルを入力してください' });
		}

		if (!dueDate) {
			return fail(400, { error: '期限を設定してください' });
		}

		const now = new Date().toISOString();

		await db.execute(
			`UPDATE goals SET
				title = :title,
				description = :description,
				due_date = :dueDate,
				priority = :priority,
				status = :status,
				color = :color,
				updated_at = :now
			 WHERE id = :goalId`,
			{
				goalId,
				title: title.trim(),
				description: description?.trim() || null,
				dueDate,
				priority: priority || 'medium',
				status: status || 'pending',
				color: color || '#3b82f6',
				now
			}
		);

		// Update assignees
		await db.execute(`DELETE FROM goal_assignees WHERE goal_id = :goalId`, { goalId });

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

		return { success: true };
	},

	delete: async ({ locals, params }) => {
		if (!locals.user) {
			throw redirect(302, '/');
		}

		const goalId = params.id;

		// Check ownership
		const goal = await db.execute(
			`SELECT created_by FROM goals WHERE id = :goalId`,
			{ goalId }
		);

		if (goal.rows.length === 0) {
			throw error(404, 'プロジェクトが見つかりません');
		}

		if (goal.rows[0].created_by !== locals.user.id && locals.user.role !== 'admin') {
			return fail(403, { error: '削除権限がありません' });
		}

		await db.execute(`DELETE FROM goals WHERE id = :goalId`, { goalId });

		throw redirect(302, '/goals');
	},

	linkReview: async ({ request, locals, params }) => {
		if (!locals.user) {
			throw redirect(302, '/');
		}

		const goalId = params.id;
		const formData = await request.formData();
		const reviewId = formData.get('review_id') as string;

		if (!reviewId) {
			return fail(400, { error: 'レビューを選択してください' });
		}

		// Check if already linked
		const existing = await db.execute(
			`SELECT id FROM review_goals WHERE goal_id = :goalId AND review_id = :reviewId`,
			{ goalId, reviewId }
		);

		if (existing.rows.length > 0) {
			return fail(400, { error: '既にリンクされています' });
		}

		await db.execute(
			`INSERT INTO review_goals (id, goal_id, review_id) VALUES (:id, :goalId, :reviewId)`,
			{
				id: nanoid(),
				goalId,
				reviewId
			}
		);

		return { success: true };
	},

	unlinkReview: async ({ request, locals, params }) => {
		if (!locals.user) {
			throw redirect(302, '/');
		}

		const goalId = params.id;
		const formData = await request.formData();
		const reviewId = formData.get('review_id') as string;

		await db.execute(
			`DELETE FROM review_goals WHERE goal_id = :goalId AND review_id = :reviewId`,
			{ goalId, reviewId }
		);

		return { success: true };
	},

	addTask: async ({ request, locals, params }) => {
		if (!locals.user) {
			throw redirect(302, '/');
		}

		const goalId = params.id;
		const formData = await request.formData();
		const title = formData.get('title') as string;
		const description = formData.get('description') as string;
		const dueDate = formData.get('due_date') as string;
		const status = formData.get('status') as string || 'pending';

		if (!title || !title.trim()) {
			return fail(400, { error: 'タスク名を入力してください' });
		}

		const taskId = nanoid();
		const now = new Date().toISOString();

		// Get max sort order
		const maxOrder = await db.execute(
			`SELECT MAX(sort_order) as max_order FROM goal_tasks WHERE goal_id = :goalId`,
			{ goalId }
		);
		const sortOrder = ((maxOrder.rows[0]?.max_order as number) || 0) + 1;

		await db.execute(
			`INSERT INTO goal_tasks (id, goal_id, title, description, due_date, status, sort_order, created_by, created_at, updated_at)
			 VALUES (:id, :goalId, :title, :description, :dueDate, :status, :sortOrder, :createdBy, :now, :now)`,
			{
				id: taskId,
				goalId,
				title: title.trim(),
				description: description?.trim() || null,
				dueDate: dueDate || null,
				status,
				sortOrder,
				createdBy: locals.user.id,
				now
			}
		);

		return { success: true, taskId };
	},

	updateTask: async ({ request, locals, params }) => {
		if (!locals.user) {
			throw redirect(302, '/');
		}

		const formData = await request.formData();
		const taskId = formData.get('task_id') as string;
		const title = formData.get('title') as string;
		const description = formData.get('description') as string;
		const dueDate = formData.get('due_date') as string;
		const status = formData.get('status') as string;

		if (!taskId) {
			return fail(400, { error: 'タスクIDが必要です' });
		}

		const now = new Date().toISOString();

		await db.execute(
			`UPDATE goal_tasks SET
				title = :title,
				description = :description,
				due_date = :dueDate,
				status = :status,
				updated_at = :now
			 WHERE id = :taskId`,
			{
				taskId,
				title: title?.trim() || '',
				description: description?.trim() || null,
				dueDate: dueDate || null,
				status: status || 'pending',
				now
			}
		);

		return { success: true };
	},

	moveTask: async ({ request, locals }) => {
		if (!locals.user) {
			throw redirect(302, '/');
		}

		const formData = await request.formData();
		const taskId = formData.get('task_id') as string;
		const newStatus = formData.get('status') as string;

		if (!taskId || !newStatus) {
			return fail(400, { error: 'パラメータが不足しています' });
		}

		const now = new Date().toISOString();

		await db.execute(
			`UPDATE goal_tasks SET status = :status, updated_at = :now WHERE id = :taskId`,
			{ taskId, status: newStatus, now }
		);

		return { success: true };
	},

	deleteTask: async ({ request, locals }) => {
		if (!locals.user) {
			throw redirect(302, '/');
		}

		const formData = await request.formData();
		const taskId = formData.get('task_id') as string;

		if (!taskId) {
			return fail(400, { error: 'タスクIDが必要です' });
		}

		await db.execute(`DELETE FROM goal_tasks WHERE id = :taskId`, { taskId });

		return { success: true };
	},

	reorderTasks: async ({ request, locals }) => {
		if (!locals.user) {
			throw redirect(302, '/');
		}

		const formData = await request.formData();
		const tasksJson = formData.get('tasks') as string;

		if (!tasksJson) {
			return fail(400, { error: 'タスクデータが必要です' });
		}

		try {
			const tasks = JSON.parse(tasksJson) as Array<{ id: string; status: string; sort_order: number }>;
			const now = new Date().toISOString();

			for (const task of tasks) {
				await db.execute(
					`UPDATE goal_tasks SET status = :status, sort_order = :sortOrder, updated_at = :now WHERE id = :taskId`,
					{
						taskId: task.id,
						status: task.status,
						sortOrder: task.sort_order,
						now
					}
				);
			}

			return { success: true };
		} catch (e) {
			console.error('Error reordering tasks:', e);
			return fail(500, { error: 'タスクの並び替えに失敗しました' });
		}
	}
};
