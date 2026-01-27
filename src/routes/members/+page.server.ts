import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { createUser } from '$lib/server/auth';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(302, '/');
	}

	if (locals.user.role !== 'admin') {
		throw redirect(302, '/dashboard');
	}

	const users = await db.execute(
		`SELECT id, email, name, role, is_active, created_at FROM users ORDER BY created_at DESC`
	);

	return {
		members: users.rows
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
	}
};
