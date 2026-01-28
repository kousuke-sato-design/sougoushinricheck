import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { createUser } from '$lib/server/auth';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(302, '/');
	}

	if (locals.user.role !== 'admin') {
		throw redirect(302, '/goals');
	}

	const users = await db.execute(
		`SELECT id, email, name, role, is_active, created_at FROM users ORDER BY created_at DESC`
	);

	// Get reviews (checks) created by each member
	const createdReviews = await db.execute(
		`SELECT r.*, u.name as requester_name, g.title as goal_title, g.id as goal_id
		 FROM reviews r
		 JOIN users u ON r.requester_id = u.id
		 LEFT JOIN review_goals rg ON r.id = rg.review_id
		 LEFT JOIN goals g ON rg.goal_id = g.id
		 ORDER BY r.created_at DESC`
	);

	// Group created reviews by requester_id
	const createdByMember: Record<string, typeof createdReviews.rows> = {};
	for (const review of createdReviews.rows) {
		const requesterId = review.requester_id as string;
		if (!createdByMember[requesterId]) {
			createdByMember[requesterId] = [];
		}
		createdByMember[requesterId].push(review);
	}

	// Get reviews (checks) assigned to each member
	const assignedReviews = await db.execute(
		`SELECT r.*, u.name as requester_name, g.title as goal_title, g.id as goal_id, ra.status as assignee_status
		 FROM review_assignees ra
		 JOIN reviews r ON ra.review_id = r.id
		 JOIN users u ON r.requester_id = u.id
		 LEFT JOIN review_goals rg ON r.id = rg.review_id
		 LEFT JOIN goals g ON rg.goal_id = g.id
		 ORDER BY r.created_at DESC`
	);

	// Group assigned reviews by user_id
	const assignedToMember: Record<string, typeof assignedReviews.rows> = {};
	for (const review of assignedReviews.rows) {
		// Find which user this review is assigned to
		const assignedResult = await db.execute(
			`SELECT user_id FROM review_assignees WHERE review_id = :reviewId`,
			{ reviewId: review.id }
		);
		for (const assignee of assignedResult.rows) {
			const userId = assignee.user_id as string;
			if (!assignedToMember[userId]) {
				assignedToMember[userId] = [];
			}
			// Check if already added
			const exists = assignedToMember[userId].some(r => r.id === review.id);
			if (!exists) {
				assignedToMember[userId].push(review);
			}
		}
	}

	// Get review counts per member (created)
	const createdCounts = await db.execute(
		`SELECT requester_id,
		        COUNT(*) as total,
		        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
		        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
		        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
		 FROM reviews
		 GROUP BY requester_id`
	);

	const createdCountsByMember: Record<string, { total: number; pending: number; approved: number; rejected: number }> = {};
	for (const row of createdCounts.rows) {
		createdCountsByMember[row.requester_id as string] = {
			total: row.total as number,
			pending: row.pending as number,
			approved: row.approved as number,
			rejected: row.rejected as number
		};
	}

	// Get review counts per member (assigned)
	const assignedCounts = await db.execute(
		`SELECT ra.user_id,
		        COUNT(*) as total,
		        SUM(CASE WHEN r.status = 'pending' THEN 1 ELSE 0 END) as pending,
		        SUM(CASE WHEN r.status = 'approved' THEN 1 ELSE 0 END) as approved,
		        SUM(CASE WHEN r.status = 'rejected' THEN 1 ELSE 0 END) as rejected
		 FROM review_assignees ra
		 JOIN reviews r ON ra.review_id = r.id
		 GROUP BY ra.user_id`
	);

	const assignedCountsByMember: Record<string, { total: number; pending: number; approved: number; rejected: number }> = {};
	for (const row of assignedCounts.rows) {
		assignedCountsByMember[row.user_id as string] = {
			total: row.total as number,
			pending: row.pending as number,
			approved: row.approved as number,
			rejected: row.rejected as number
		};
	}

	return {
		members: users.rows,
		createdByMember,
		assignedToMember,
		createdCountsByMember,
		assignedCountsByMember
	};
};

export const actions: Actions = {
	add: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			throw redirect(302, '/');
		}

		const formData = await request.formData();
		const email = formData.get('email') as string;
		const name = formData.get('name') as string;
		const password = formData.get('password') as string;
		const role = formData.get('role') as 'admin' | 'member';

		if (!email || !name || !password) {
			return fail(400, { error: '全ての項目を入力してください', action: 'add' });
		}

		if (password.length < 8) {
			return fail(400, { error: 'パスワードは8文字以上で入力してください', action: 'add' });
		}

		try {
			await createUser(email, name, password, role || 'member');
			return { success: true, action: 'add' };
		} catch (err) {
			console.error('Add user error:', err);
			return fail(400, { error: 'メンバーの追加に失敗しました（メールアドレスが重複している可能性があります）', action: 'add' });
		}
	},

	toggle: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			throw redirect(302, '/');
		}

		const formData = await request.formData();
		const userId = formData.get('userId') as string;

		if (!userId) {
			return fail(400, { error: 'ユーザーIDが必要です', action: 'toggle' });
		}

		// Don't allow deactivating yourself
		if (userId === locals.user.id) {
			return fail(400, { error: '自分自身を無効化することはできません', action: 'toggle' });
		}

		try {
			await db.execute(
				`UPDATE users SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END, updated_at = datetime('now') WHERE id = :userId`,
				{ userId }
			);
			return { success: true, action: 'toggle' };
		} catch (err) {
			console.error('Toggle user error:', err);
			return fail(500, { error: 'ステータスの変更に失敗しました', action: 'toggle' });
		}
	},

	updateRole: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			throw redirect(302, '/');
		}

		const formData = await request.formData();
		const userId = formData.get('userId') as string;
		const role = formData.get('role') as string;

		if (!userId || !role) {
			return fail(400, { error: 'ユーザーIDとロールが必要です', action: 'updateRole' });
		}

		// Don't allow changing your own role
		if (userId === locals.user.id) {
			return fail(400, { error: '自分自身のロールを変更することはできません', action: 'updateRole' });
		}

		try {
			await db.execute(
				`UPDATE users SET role = :role, updated_at = datetime('now') WHERE id = :userId`,
				{ userId, role }
			);
			return { success: true, action: 'updateRole' };
		} catch (err) {
			console.error('Update role error:', err);
			return fail(500, { error: 'ロールの変更に失敗しました', action: 'updateRole' });
		}
	},

	edit: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			throw redirect(302, '/');
		}

		const formData = await request.formData();
		const userId = formData.get('userId') as string;
		const name = formData.get('name') as string;
		const email = formData.get('email') as string;
		const role = formData.get('role') as string;

		if (!userId || !name || !email) {
			return fail(400, { error: '名前とメールアドレスは必須です', action: 'edit' });
		}

		try {
			// Check if email is already used by another user
			const existing = await db.execute(
				`SELECT id FROM users WHERE email = :email AND id != :userId`,
				{ email, userId }
			);

			if (existing.rows.length > 0) {
				return fail(400, { error: 'このメールアドレスは既に使用されています', action: 'edit' });
			}

			await db.execute(
				`UPDATE users SET name = :name, email = :email, role = :role, updated_at = datetime('now') WHERE id = :userId`,
				{ userId, name, email, role }
			);
			return { success: true, action: 'edit' };
		} catch (err) {
			console.error('Edit user error:', err);
			return fail(500, { error: 'メンバー情報の更新に失敗しました', action: 'edit' });
		}
	},

	delete: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			throw redirect(302, '/');
		}

		const formData = await request.formData();
		const userId = formData.get('userId') as string;

		if (!userId) {
			return fail(400, { error: 'ユーザーIDが必要です', action: 'delete' });
		}

		// Don't allow deleting yourself
		if (userId === locals.user.id) {
			return fail(400, { error: '自分自身を削除することはできません', action: 'delete' });
		}

		try {
			await db.execute(`DELETE FROM users WHERE id = :userId`, { userId });
			return { success: true, action: 'delete' };
		} catch (err) {
			console.error('Delete user error:', err);
			return fail(500, { error: 'メンバーの削除に失敗しました', action: 'delete' });
		}
	}
};
