import { redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getUserCount, createUser, createSession } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { migrations } from '$lib/server/schema';

export const load: PageServerLoad = async () => {
	// Only allow setup if no users exist
	const userCount = await getUserCount();
	if (userCount > 0) {
		throw redirect(302, '/');
	}

	return {};
};

export const actions: Actions = {
	setup: async ({ request, cookies }) => {
		// Only allow setup if no users exist
		const userCount = await getUserCount();
		if (userCount > 0) {
			return { error: 'セットアップは既に完了しています' };
		}

		const formData = await request.formData();
		const email = formData.get('email') as string;
		const name = formData.get('name') as string;
		const password = formData.get('password') as string;
		const confirmPassword = formData.get('confirmPassword') as string;

		// Validation
		if (!email || !name || !password || !confirmPassword) {
			return { error: '全ての項目を入力してください' };
		}

		if (password !== confirmPassword) {
			return { error: 'パスワードが一致しません' };
		}

		if (password.length < 8) {
			return { error: 'パスワードは8文字以上で入力してください' };
		}

		try {
			// Run migrations first
			for (const sql of migrations) {
				if (sql.trim()) {
					await db.execute(sql);
				}
			}

			// Create admin user
			const user = await createUser(email, name, password, 'admin');

			// Create session
			const session = await createSession(user.id);

			cookies.set('session', session.id, {
				path: '/',
				httpOnly: true,
				sameSite: 'lax',
				secure: process.env.NODE_ENV === 'production',
				maxAge: 60 * 60 * 24 // 24 hours
			});

			throw redirect(302, '/goals');
		} catch (err) {
			if (err instanceof Response) throw err;
			console.error('Setup error:', err);
			return { error: 'セットアップ中にエラーが発生しました' };
		}
	}
};
