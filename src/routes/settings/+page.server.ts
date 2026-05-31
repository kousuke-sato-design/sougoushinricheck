import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { nanoid } from 'nanoid';
import { sendTestEmailForAccount } from '$lib/server/email';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(302, '/');
	}

	if (locals.user.role !== 'admin') {
		throw redirect(302, '/goals');
	}

	// 全Gmailアカウントを取得（デフォルト優先）
	const emailAccounts = await db.execute(
		`SELECT id, smtp_host, smtp_port, email_address, from_name, is_active, is_default, created_at
		 FROM email_settings
		 ORDER BY is_default DESC, created_at ASC`
	);

	// Get all tags
	const tags = await db.execute(`SELECT id, name, color, created_at FROM tags ORDER BY name`);

	return {
		emailAccounts: emailAccounts.rows,
		tags: tags.rows
	};
};

async function clearDefault() {
	await db.execute(`UPDATE email_settings SET is_default = 0`);
}

export const actions: Actions = {
	// アカウントの追加・編集（accountId があれば編集。パスワードは空なら据え置き）
	saveEmailAccount: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			throw redirect(302, '/');
		}

		const formData = await request.formData();
		const accountId = (formData.get('accountId') as string) || '';
		const smtpHost = (formData.get('smtpHost') as string) || 'smtp.gmail.com';
		const smtpPort = parseInt(formData.get('smtpPort') as string, 10) || 587;
		const emailAddress = formData.get('emailAddress') as string;
		const appPassword = (formData.get('appPassword') as string) || '';
		const fromName = (formData.get('fromName') as string) || null;

		if (!emailAddress) {
			return fail(400, { error: 'メールアドレスを入力してください', action: 'saveEmailAccount' });
		}

		try {
			if (accountId) {
				// 編集：パスワードが入力された時だけ更新
				if (appPassword) {
					await db.execute(
						`UPDATE email_settings SET smtp_host = :smtpHost, smtp_port = :smtpPort,
						 email_address = :emailAddress, app_password = :appPassword, from_name = :fromName
						 WHERE id = :id`,
						{ id: accountId, smtpHost, smtpPort, emailAddress, appPassword, fromName }
					);
				} else {
					await db.execute(
						`UPDATE email_settings SET smtp_host = :smtpHost, smtp_port = :smtpPort,
						 email_address = :emailAddress, from_name = :fromName
						 WHERE id = :id`,
						{ id: accountId, smtpHost, smtpPort, emailAddress, fromName }
					);
				}
				return { success: true, action: 'saveEmailAccount' };
			}

			// 新規追加：パスワード必須
			if (!appPassword) {
				return fail(400, { error: 'アプリパスワードを入力してください', action: 'saveEmailAccount' });
			}

			// 既存が0件なら自動的にデフォルトに
			const countRes = await db.execute(`SELECT COUNT(*) as c FROM email_settings`);
			const isFirst = Number(countRes.rows[0]?.c ?? 0) === 0;

			await db.execute(
				`INSERT INTO email_settings (id, smtp_host, smtp_port, email_address, app_password, from_name, is_active, is_default)
				 VALUES (:id, :smtpHost, :smtpPort, :emailAddress, :appPassword, :fromName, 1, :isDefault)`,
				{
					id: nanoid(),
					smtpHost,
					smtpPort,
					emailAddress,
					appPassword,
					fromName,
					isDefault: isFirst ? 1 : 0
				}
			);

			return { success: true, action: 'saveEmailAccount' };
		} catch (err) {
			console.error('Save email account error:', err);
			return fail(500, { error: 'メール設定の保存に失敗しました', action: 'saveEmailAccount' });
		}
	},

	deleteEmailAccount: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			throw redirect(302, '/');
		}

		const formData = await request.formData();
		const accountId = formData.get('accountId') as string;
		if (!accountId) return fail(400, { error: 'アカウントIDが必要です', action: 'deleteEmailAccount' });

		try {
			const wasDefault = await db.execute(
				`SELECT is_default FROM email_settings WHERE id = :id`,
				{ id: accountId }
			);
			await db.execute(`DELETE FROM email_settings WHERE id = :id`, { id: accountId });

			// 消したのがデフォルトなら、残りの先頭をデフォルトに昇格
			if (wasDefault.rows[0]?.is_default === 1) {
				await db.execute(
					`UPDATE email_settings SET is_default = 1
					 WHERE id = (SELECT id FROM email_settings WHERE is_active = 1 ORDER BY created_at ASC LIMIT 1)`
				);
			}
			return { success: true, action: 'deleteEmailAccount' };
		} catch (err) {
			console.error('Delete email account error:', err);
			return fail(500, { error: 'アカウントの削除に失敗しました', action: 'deleteEmailAccount' });
		}
	},

	setDefaultEmail: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			throw redirect(302, '/');
		}

		const formData = await request.formData();
		const accountId = formData.get('accountId') as string;
		if (!accountId) return fail(400, { error: 'アカウントIDが必要です', action: 'setDefaultEmail' });

		try {
			await clearDefault();
			await db.execute(
				`UPDATE email_settings SET is_default = 1, is_active = 1 WHERE id = :id`,
				{ id: accountId }
			);
			return { success: true, action: 'setDefaultEmail' };
		} catch (err) {
			console.error('Set default email error:', err);
			return fail(500, { error: 'デフォルト設定に失敗しました', action: 'setDefaultEmail' });
		}
	},

	testEmailAccount: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			throw redirect(302, '/');
		}

		const formData = await request.formData();
		const accountId = formData.get('accountId') as string;
		if (!accountId) return fail(400, { error: 'アカウントIDが必要です', action: 'testEmailAccount' });

		try {
			const result = await sendTestEmailForAccount(accountId, locals.user.email);
			if (result.success) {
				return { success: true, action: 'testEmailAccount', message: `テストメールを ${locals.user.email} に送信しました` };
			}
			return fail(500, { error: result.error || 'メール送信に失敗しました', action: 'testEmailAccount' });
		} catch (err) {
			console.error('Test email error:', err);
			return fail(500, { error: 'メール送信に失敗しました', action: 'testEmailAccount' });
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
