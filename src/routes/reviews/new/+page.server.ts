import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { nanoid } from 'nanoid';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(302, '/');
	}
	return {};
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

		if (!title || !title.trim()) {
			return fail(400, { error: 'タイトルを入力してください' });
		}

		const reviewId = nanoid();

		await db.execute(
			`INSERT INTO reviews (id, title, description, emoji, target_url, content_type, status, requester_id)
			 VALUES (:id, :title, :description, :emoji, '', 'other', 'draft', :requesterId)`,
			{
				id: reviewId,
				title: title.trim(),
				description: description?.trim() || '',
				emoji,
				requesterId: locals.user.id
			}
		);

		throw redirect(302, `/reviews/${reviewId}`);
	}
};
