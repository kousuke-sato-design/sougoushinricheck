import { redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getUserCount, login } from '$lib/server/auth';

export const load: PageServerLoad = async ({ locals }) => {
	// Check if user is already logged in
	if (locals.user) {
		throw redirect(302, '/goals');
	}

	// Check if setup is needed (no users exist)
	const userCount = await getUserCount();
	if (userCount === 0) {
		throw redirect(302, '/setup');
	}

	return {};
};

export const actions: Actions = {
	login: async ({ request, cookies }) => {
		const formData = await request.formData();
		const email = formData.get('email') as string;
		const password = formData.get('password') as string;

		if (!email || !password) {
			return { error: 'メールアドレスとパスワードを入力してください' };
		}

		const result = await login(email, password);
		if (!result) {
			return { error: 'メールアドレスまたはパスワードが正しくありません' };
		}

		cookies.set('session', result.session.id, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: process.env.NODE_ENV === 'production',
			maxAge: 60 * 60 * 24 // 24 hours
		});

		throw redirect(302, '/goals');
	}
};
