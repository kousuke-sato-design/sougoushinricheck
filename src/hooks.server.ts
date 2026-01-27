import type { Handle } from '@sveltejs/kit';
import { getSession, getUserById } from '$lib/server/auth';

export const handle: Handle = async ({ event, resolve }) => {
	const sessionId = event.cookies.get('session');

	if (sessionId) {
		const session = await getSession(sessionId);
		if (session) {
			const user = await getUserById(session.user_id);
			if (user) {
				event.locals.user = {
					id: user.id,
					email: user.email,
					name: user.name,
					role: user.role
				};
			}
		}
	}

	if (!event.locals.user) {
		event.locals.user = null;
	}

	return resolve(event);
};
