import { redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { deleteSession } from '$lib/server/auth';

export const actions: Actions = {
	default: async ({ cookies }) => {
		const sessionId = cookies.get('session');
		if (sessionId) {
			await deleteSession(sessionId);
		}
		cookies.delete('session', { path: '/' });
		throw redirect(302, '/');
	}
};
