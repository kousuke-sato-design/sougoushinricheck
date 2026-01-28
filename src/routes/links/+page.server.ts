import { redirect, fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { nanoid } from 'nanoid';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(302, '/');
	}

	try {
		const links = await db.execute('SELECT * FROM system_links ORDER BY sort_order ASC, created_at ASC');
		return {
			user: locals.user,
			links: links.rows
		};
	} catch (error) {
		console.error('Error loading system_links:', error);
		return {
			user: locals.user,
			links: []
		};
	}
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		if (!locals.user) {
			throw redirect(302, '/');
		}

		const formData = await request.formData();
		const title = formData.get('title') as string;
		const description = formData.get('description') as string || '';
		const url = formData.get('url') as string;
		const color = formData.get('color') as string || '2196F3';

		if (!title || !url) {
			return fail(400, { error: 'タイトルとURLは必須です' });
		}

		try {
			const id = nanoid();
			const maxOrder = await db.execute('SELECT MAX(sort_order) as max_order FROM system_links');
			const sortOrder = ((maxOrder.rows[0]?.max_order as number) || 0) + 1;

			await db.execute(
				`INSERT INTO system_links (id, title, description, url, color, sort_order)
				 VALUES (:id, :title, :description, :url, :color, :sortOrder)`,
				{ id, title, description, url, color, sortOrder }
			);

			return { success: true };
		} catch (error) {
			console.error('Error creating link:', error);
			return fail(500, { error: '保存に失敗しました' });
		}
	},

	update: async ({ request, locals }) => {
		if (!locals.user) {
			throw redirect(302, '/');
		}

		const formData = await request.formData();
		const id = formData.get('id') as string;
		const title = formData.get('title') as string;
		const description = formData.get('description') as string || '';
		const url = formData.get('url') as string;
		const color = formData.get('color') as string || '2196F3';

		if (!id || !title || !url) {
			return fail(400, { error: 'ID、タイトル、URLは必須です' });
		}

		try {
			await db.execute(
				`UPDATE system_links SET title = :title, description = :description, url = :url, color = :color, updated_at = CURRENT_TIMESTAMP WHERE id = :id`,
				{ id, title, description, url, color }
			);

			return { success: true };
		} catch (error) {
			console.error('Error updating link:', error);
			return fail(500, { error: '更新に失敗しました' });
		}
	},

	delete: async ({ request, locals }) => {
		if (!locals.user) {
			throw redirect(302, '/');
		}

		const formData = await request.formData();
		const id = formData.get('id') as string;

		if (!id) {
			return fail(400, { error: 'IDは必須です' });
		}

		try {
			await db.execute('DELETE FROM system_links WHERE id = :id', { id });
			return { success: true };
		} catch (error) {
			console.error('Error deleting link:', error);
			return fail(500, { error: '削除に失敗しました' });
		}
	}
};
