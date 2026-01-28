import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { nanoid } from 'nanoid';
import { sendEmail } from '$lib/server/email';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(302, '/');
	}

	if (locals.user.role !== 'admin') {
		throw redirect(302, '/goals');
	}

	const emailSettings = await db.execute(
		`SELECT id, smtp_host, smtp_port, email_address, is_active, created_at
		 FROM email_settings
		 ORDER BY created_at DESC
		 LIMIT 1`
	);

	// Get all tags
	const tags = await db.execute(`SELECT id, name, color, created_at FROM tags ORDER BY name`);

	return {
		emailSettings: emailSettings.rows[0] || null,
		tags: tags.rows
	};
};

export const actions: Actions = {
	saveEmail: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			throw redirect(302, '/');
		}

		const formData = await request.formData();
		const smtpHost = formData.get('smtpHost') as string;
		const smtpPort = parseInt(formData.get('smtpPort') as string, 10);
		const emailAddress = formData.get('emailAddress') as string;
		const appPassword = formData.get('appPassword') as string;

		if (!smtpHost || !smtpPort || !emailAddress || !appPassword) {
			return fail(400, { error: '全ての項目を入力してください', action: 'saveEmail' });
		}

		try {
			// Delete existing settings
			await db.execute(`DELETE FROM email_settings`);

			// Insert new settings
			await db.execute(
				`INSERT INTO email_settings (id, smtp_host, smtp_port, email_address, app_password)
				 VALUES (:id, :smtpHost, :smtpPort, :emailAddress, :appPassword)`,
				{
					id: nanoid(),
					smtpHost,
					smtpPort,
					emailAddress,
					appPassword
				}
			);

			return { success: true, action: 'saveEmail' };
		} catch (err) {
			console.error('Save email settings error:', err);
			return fail(500, { error: 'メール設定の保存に失敗しました', action: 'saveEmail' });
		}
	},

	testEmail: async ({ locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			throw redirect(302, '/');
		}

		try {
			const success = await sendEmail(
				locals.user.email,
				'[テスト] メール設定の確認',
				'これはテストメールです。メール設定が正しく行われています。',
				`
					<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
						<h2 style="color: #333;">テストメール</h2>
						<p style="color: #555;">これはテストメールです。</p>
						<p style="color: #555;">メール設定が正しく行われています。</p>
					</div>
				`
			);

			if (success) {
				return { success: true, action: 'testEmail', message: 'テストメールを送信しました' };
			} else {
				return fail(500, { error: 'メール送信に失敗しました。設定を確認してください。', action: 'testEmail' });
			}
		} catch (err) {
			console.error('Test email error:', err);
			return fail(500, { error: 'メール送信に失敗しました', action: 'testEmail' });
		}
	},

	createTag: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			throw redirect(302, '/');
		}

		const formData = await request.formData();
		const name = formData.get('name') as string;
		const color = formData.get('color') as string;

		if (!name || !name.trim()) {
			return fail(400, { error: 'タグ名を入力してください', action: 'createTag' });
		}

		try {
			await db.execute(
				`INSERT INTO tags (id, name, color) VALUES (:id, :name, :color)`,
				{
					id: nanoid(),
					name: name.trim(),
					color: color || '#3b82f6'
				}
			);
			return { success: true, action: 'createTag' };
		} catch (err) {
			console.error('Create tag error:', err);
			return fail(500, { error: 'タグの作成に失敗しました', action: 'createTag' });
		}
	},

	updateTag: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			throw redirect(302, '/');
		}

		const formData = await request.formData();
		const tagId = formData.get('tagId') as string;
		const name = formData.get('name') as string;
		const color = formData.get('color') as string;

		if (!tagId || !name || !name.trim()) {
			return fail(400, { error: 'タグ名を入力してください', action: 'updateTag' });
		}

		try {
			await db.execute(
				`UPDATE tags SET name = :name, color = :color WHERE id = :tagId`,
				{ tagId, name: name.trim(), color: color || '#3b82f6' }
			);
			return { success: true, action: 'updateTag' };
		} catch (err) {
			console.error('Update tag error:', err);
			return fail(500, { error: 'タグの更新に失敗しました', action: 'updateTag' });
		}
	},

	deleteTag: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			throw redirect(302, '/');
		}

		const formData = await request.formData();
		const tagId = formData.get('tagId') as string;

		if (!tagId) {
			return fail(400, { error: 'タグIDが必要です', action: 'deleteTag' });
		}

		try {
			// First delete related review_tags
			await db.execute(`DELETE FROM review_tags WHERE tag_id = :tagId`, { tagId });
			// Then delete the tag
			await db.execute(`DELETE FROM tags WHERE id = :tagId`, { tagId });
			return { success: true, action: 'deleteTag' };
		} catch (err) {
			console.error('Delete tag error:', err);
			return fail(500, { error: 'タグの削除に失敗しました', action: 'deleteTag' });
		}
	}
};
