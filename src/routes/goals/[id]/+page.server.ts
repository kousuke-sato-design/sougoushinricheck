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

	// Get related reviews with access tokens and linked objectives
	const reviewsResult = await db.execute(
		`SELECT r.*, u.name as requester_name,
		        go.id as objective_id, go.title as objective_title, go.color as objective_color
		 FROM review_goals rg
		 JOIN reviews r ON rg.review_id = r.id
		 JOIN users u ON r.requester_id = u.id
		 LEFT JOIN review_objectives ro ON ro.review_id = r.id
		 LEFT JOIN goal_objectives go ON ro.objective_id = go.id
		 WHERE rg.goal_id = :goalId
		 ORDER BY r.created_at DESC`,
		{ goalId }
	);

	// Get all users for editing
	const allUsers = await db.execute(
		`SELECT id, name, email FROM users WHERE is_active = 1 ORDER BY name`
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

	// Get objectives for this goal
	const objectivesResult = await db.execute(
		`SELECT * FROM goal_objectives
		 WHERE goal_id = :goalId
		 ORDER BY sort_order ASC, created_at ASC`,
		{ goalId }
	);

	// Get reviews linked to each objective
	const objectiveReviewsResult = await db.execute(
		`SELECT ro.objective_id, r.id, r.title, r.status, r.created_at, u.name as requester_name
		 FROM review_objectives ro
		 JOIN reviews r ON ro.review_id = r.id
		 JOIN users u ON r.requester_id = u.id
		 WHERE ro.objective_id IN (SELECT id FROM goal_objectives WHERE goal_id = :goalId)
		 ORDER BY r.created_at DESC`,
		{ goalId }
	);

	// Group reviews by objective
	const reviewsByObjective: Record<string, typeof objectiveReviewsResult.rows> = {};
	for (const row of objectiveReviewsResult.rows) {
		const objId = row.objective_id as string;
		if (!reviewsByObjective[objId]) {
			reviewsByObjective[objId] = [];
		}
		reviewsByObjective[objId].push(row);
	}

	// Add reviews to each objective
	const objectivesWithReviews = objectivesResult.rows.map(obj => ({
		...obj,
		reviews: reviewsByObjective[obj.id as string] || []
	}));

	return {
		goal: {
			...goal,
			assignees: assigneesResult.rows,
			reviews: reviewsResult.rows,
			tasks: tasksResult.rows,
			objectives: objectivesWithReviews
		},
		allUsers: allUsers.rows
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

	createReview: async ({ request, locals, params }) => {
		if (!locals.user) {
			throw redirect(302, '/');
		}

		const goalId = params.id;
		const formData = await request.formData();
		const title = formData.get('title') as string;

		if (!title || !title.trim()) {
			return fail(400, { error: 'タイトルを入力してください' });
		}

		const reviewId = nanoid();
		const publicToken = nanoid();

		// Create review
		await db.execute(
			`INSERT INTO reviews (id, title, description, emoji, target_url, content_type, status, requester_id, public_token)
			 VALUES (:id, :title, '', '📄', '', 'other', 'draft', :requesterId, :publicToken)`,
			{
				id: reviewId,
				title: title.trim(),
				requesterId: locals.user.id,
				publicToken
			}
		);

		// Link to goal
		await db.execute(
			`INSERT INTO review_goals (id, goal_id, review_id) VALUES (:id, :goalId, :reviewId)`,
			{
				id: nanoid(),
				goalId,
				reviewId
			}
		);

		throw redirect(302, `/reviews/${reviewId}`);
	},

	deleteReview: async ({ request, locals }) => {
		if (!locals.user) {
			throw redirect(302, '/');
		}

		const formData = await request.formData();
		const reviewId = formData.get('review_id') as string;

		if (!reviewId) {
			return fail(400, { error: 'レビューIDが必要です' });
		}

		// Delete related records
		await db.execute(`DELETE FROM review_objectives WHERE review_id = :reviewId`, { reviewId });
		await db.execute(`DELETE FROM review_goals WHERE review_id = :reviewId`, { reviewId });
		await db.execute(`DELETE FROM comments WHERE review_id = :reviewId`, { reviewId });
		await db.execute(`DELETE FROM review_assignees WHERE review_id = :reviewId`, { reviewId });
		await db.execute(`DELETE FROM reviews WHERE id = :reviewId`, { reviewId });

		return { success: true };
	},

	createReviewFromObjective: async ({ request, locals, params }) => {
		if (!locals.user) {
			throw redirect(302, '/');
		}

		const goalId = params.id;
		const formData = await request.formData();
		const objectiveId = formData.get('objective_id') as string;
		const title = formData.get('title') as string;

		if (!objectiveId) {
			return fail(400, { error: '目標IDが必要です' });
		}

		if (!title || !title.trim()) {
			return fail(400, { error: 'タイトルを入力してください' });
		}

		const reviewId = nanoid();
		const publicToken = nanoid();

		// Create review
		await db.execute(
			`INSERT INTO reviews (id, title, description, emoji, target_url, content_type, status, requester_id, public_token)
			 VALUES (:id, :title, '', '📄', '', 'other', 'draft', :requesterId, :publicToken)`,
			{
				id: reviewId,
				title: title.trim(),
				requesterId: locals.user.id,
				publicToken
			}
		);

		// Link to goal
		await db.execute(
			`INSERT INTO review_goals (id, goal_id, review_id) VALUES (:id, :goalId, :reviewId)`,
			{
				id: nanoid(),
				goalId,
				reviewId
			}
		);

		// Link to objective
		await db.execute(
			`INSERT INTO review_objectives (id, objective_id, review_id) VALUES (:id, :objectiveId, :reviewId)`,
			{
				id: nanoid(),
				objectiveId,
				reviewId
			}
		);

		throw redirect(302, `/reviews/${reviewId}`);
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
	},

	addObjective: async ({ request, locals, params }) => {
		if (!locals.user) {
			throw redirect(302, '/');
		}

		const goalId = params.id;
		const formData = await request.formData();
		const title = formData.get('title') as string;
		const dueDate = formData.get('due_date') as string;
		const color = formData.get('color') as string;

		if (!title || !title.trim()) {
			return fail(400, { error: '目標を入力してください' });
		}

		const objectiveId = nanoid();
		const now = new Date().toISOString();

		// Get max sort order
		const maxOrder = await db.execute(
			`SELECT MAX(sort_order) as max_order FROM goal_objectives WHERE goal_id = :goalId`,
			{ goalId }
		);
		const sortOrder = ((maxOrder.rows[0]?.max_order as number) || 0) + 1;

		await db.execute(
			`INSERT INTO goal_objectives (id, goal_id, title, due_date, color, sort_order, created_at, updated_at)
			 VALUES (:id, :goalId, :title, :dueDate, :color, :sortOrder, :now, :now)`,
			{
				id: objectiveId,
				goalId,
				title: title.trim(),
				dueDate: dueDate || null,
				color: color || '#3b82f6',
				sortOrder,
				now
			}
		);

		return { success: true };
	},

	updateObjective: async ({ request, locals }) => {
		if (!locals.user) {
			throw redirect(302, '/');
		}

		const formData = await request.formData();
		const objectiveId = formData.get('objective_id') as string;
		const title = formData.get('title') as string;
		const dueDate = formData.get('due_date') as string;
		const color = formData.get('color') as string;

		if (!objectiveId) {
			return fail(400, { error: '目標IDが必要です' });
		}

		const now = new Date().toISOString();

		await db.execute(
			`UPDATE goal_objectives SET title = :title, due_date = :dueDate, color = :color, updated_at = :now WHERE id = :objectiveId`,
			{ objectiveId, title: title?.trim() || '', dueDate: dueDate || null, color: color || '#3b82f6', now }
		);

		return { success: true };
	},

	toggleObjective: async ({ request, locals }) => {
		if (!locals.user) {
			throw redirect(302, '/');
		}

		const formData = await request.formData();
		const objectiveId = formData.get('objective_id') as string;
		const isCompleted = formData.get('is_completed') === '1' ? 0 : 1;

		if (!objectiveId) {
			return fail(400, { error: '目標IDが必要です' });
		}

		const now = new Date().toISOString();

		await db.execute(
			`UPDATE goal_objectives SET is_completed = :isCompleted, updated_at = :now WHERE id = :objectiveId`,
			{ objectiveId, isCompleted, now }
		);

		return { success: true };
	},

	deleteObjective: async ({ request, locals }) => {
		if (!locals.user) {
			throw redirect(302, '/');
		}

		const formData = await request.formData();
		const objectiveId = formData.get('objective_id') as string;

		if (!objectiveId) {
			return fail(400, { error: '目標IDが必要です' });
		}

		await db.execute(`DELETE FROM goal_objectives WHERE id = :objectiveId`, { objectiveId });

		return { success: true };
	}
};
