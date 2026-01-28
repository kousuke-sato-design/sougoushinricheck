import { redirect, error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { nanoid } from 'nanoid';
import { sendEmail, getEmailSettings } from '$lib/server/email';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) {
		throw redirect(302, '/');
	}

	const reviewResult = await db.execute(
		`SELECT r.*, u.name as requester_name, u.email as requester_email
		 FROM reviews r
		 JOIN users u ON r.requester_id = u.id
		 WHERE r.id = :reviewId`,
		{ reviewId: params.id }
	);

	if (reviewResult.rows.length === 0) {
		throw error(404, 'ドキュメントが見つかりません');
	}

	const review = reviewResult.rows[0];

	const commentsResult = await db.execute(
		`SELECT c.*, u.name as user_name
		 FROM comments c
		 JOIN users u ON c.user_id = u.id
		 WHERE c.review_id = :reviewId
		 ORDER BY c.created_at ASC`,
		{ reviewId: review.id }
	);

	return {
		review,
		comments: commentsResult.rows
	};
};

export const actions: Actions = {
	approve: async ({ request, params, locals }) => {
		if (!locals.user) {
			return fail(401, { error: 'ログインが必要です' });
		}

		const reviewResult = await db.execute(
			`SELECT r.*, u.name as requester_name, u.email as requester_email
			 FROM reviews r
			 JOIN users u ON r.requester_id = u.id
			 WHERE r.id = :reviewId`,
			{ reviewId: params.id }
		);

		if (reviewResult.rows.length === 0) {
			return fail(404, { error: 'ドキュメントが見つかりません' });
		}

		const review = reviewResult.rows[0];

		await db.execute(
			`UPDATE reviews SET status = 'approved', updated_at = datetime('now') WHERE id = :reviewId`,
			{ reviewId: review.id }
		);

		await db.execute(
			`INSERT INTO comments (id, review_id, user_id, content)
			 VALUES (:id, :reviewId, :userId, :content)`,
			{
				id: nanoid(),
				reviewId: review.id,
				userId: locals.user.id,
				content: `【${locals.user.name}】が確認OKしました`
			}
		);

		const emailSettings = await getEmailSettings();
		if (emailSettings && review.requester_email) {
			await sendEmail(
				review.requester_email as string,
				`[確認OK] ${review.title}`,
				`${locals.user.name}さんが「${review.title}」を確認OKしました。`,
				`<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
					<div style="background: #10b981; padding: 20px; border-radius: 12px 12px 0 0;">
						<h1 style="color: white; margin: 0; font-size: 20px;">確認OK</h1>
					</div>
					<div style="background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
						<p><strong>${locals.user.name}</strong>さんが以下を確認OKしました。</p>
						<div style="background: white; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; margin: 16px 0;">
							<p style="margin: 0; font-weight: bold;">${review.title}</p>
						</div>
					</div>
				</div>`
			);
		}

		return { success: true, action: 'approved' };
	},

	reject: async ({ request, params, locals }) => {
		if (!locals.user) {
			return fail(401, { error: 'ログインが必要です' });
		}

		const formData = await request.formData();
		const reason = formData.get('reason') as string;
		const sendNotification = formData.get('sendNotification') === '1';

		if (!reason || !reason.trim()) {
			return fail(400, { error: 'コメントを入力してください' });
		}

		const reviewResult = await db.execute(
			`SELECT r.*, u.name as requester_name, u.email as requester_email
			 FROM reviews r
			 JOIN users u ON r.requester_id = u.id
			 WHERE r.id = :reviewId`,
			{ reviewId: params.id }
		);

		if (reviewResult.rows.length === 0) {
			return fail(404, { error: 'ドキュメントが見つかりません' });
		}

		const review = reviewResult.rows[0];

		await db.execute(
			`UPDATE reviews SET status = 'rejected', updated_at = datetime('now') WHERE id = :reviewId`,
			{ reviewId: review.id }
		);

		const commentContent = `【${locals.user.name}】からのコメント:\n${reason}`;

		await db.execute(
			`INSERT INTO comments (id, review_id, user_id, content)
			 VALUES (:id, :reviewId, :userId, :content)`,
			{
				id: nanoid(),
				reviewId: review.id,
				userId: locals.user.id,
				content: commentContent
			}
		);

		if (sendNotification) {
			const emailSettings = await getEmailSettings();
			if (emailSettings && review.requester_email) {
				await sendEmail(
					review.requester_email as string,
					`[コメント] ${review.title}`,
					`${locals.user.name}さんが「${review.title}」にコメントしました。\n\nコメント: ${reason}`,
					`<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
						<div style="background: #ef4444; padding: 20px; border-radius: 12px 12px 0 0;">
							<h1 style="color: white; margin: 0; font-size: 20px;">コメントがあります</h1>
						</div>
						<div style="background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
							<p><strong>${locals.user.name}</strong>さんがコメントしました。</p>
							<div style="background: white; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; margin: 16px 0;">
								<p style="margin: 0; font-weight: bold;">${review.title}</p>
								<p style="margin: 8px 0 0; color: #64748b;">${reason}</p>
							</div>
						</div>
					</div>`
				);
			}
		}

		return { success: true, action: 'rejected' };
	},

	resubmit: async ({ request, params, locals }) => {
		if (!locals.user) {
			return fail(401, { error: 'ログインが必要です' });
		}

		const formData = await request.formData();
		const title = formData.get('title') as string;
		const description = formData.get('description') as string;

		if (!title || !title.trim()) {
			return fail(400, { error: 'タイトルを入力してください' });
		}

		const reviewResult = await db.execute(
			`SELECT r.*, u.name as requester_name, u.email as requester_email
			 FROM reviews r
			 JOIN users u ON r.requester_id = u.id
			 WHERE r.id = :reviewId`,
			{ reviewId: params.id }
		);

		if (reviewResult.rows.length === 0) {
			return fail(404, { error: 'ドキュメントが見つかりません' });
		}

		const review = reviewResult.rows[0];

		await db.execute(
			`UPDATE reviews SET title = :title, description = :description, status = 'pending', updated_at = datetime('now') WHERE id = :reviewId`,
			{ title: title.trim(), description: description?.trim() || '', reviewId: review.id }
		);

		await db.execute(
			`INSERT INTO comments (id, review_id, user_id, content)
			 VALUES (:id, :reviewId, :userId, :content)`,
			{
				id: nanoid(),
				reviewId: review.id,
				userId: locals.user.id,
				content: `【${locals.user.name}】がドキュメントを修正し、再依頼しました`
			}
		);

		const emailSettings = await getEmailSettings();
		if (emailSettings && review.requester_email) {
			await sendEmail(
				review.requester_email as string,
				`[再依頼] ${title}`,
				`${locals.user.name}さんがドキュメント「${title}」を修正し、再依頼しました。`,
				`<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
					<div style="background: #3b82f6; padding: 20px; border-radius: 12px 12px 0 0;">
						<h1 style="color: white; margin: 0; font-size: 20px;">再依頼</h1>
					</div>
					<div style="background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
						<p><strong>${locals.user.name}</strong>さんがドキュメントを修正し、再度確認依頼を送信しました。</p>
						<div style="background: white; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; margin: 16px 0;">
							<p style="margin: 0; font-weight: bold;">${title}</p>
						</div>
					</div>
				</div>`
			);
		}

		return { success: true, action: 'resubmitted' };
	},

	update: async ({ request, params, locals }) => {
		if (!locals.user) {
			return fail(401, { error: 'ログインが必要です' });
		}

		const formData = await request.formData();
		const title = formData.get('title') as string;
		const description = formData.get('description') as string;
		const emoji = formData.get('emoji') as string;

		if (!title || !title.trim()) {
			return fail(400, { error: 'タイトルを入力してください' });
		}

		await db.execute(
			`UPDATE reviews SET title = :title, description = :description, emoji = :emoji, updated_at = datetime('now') WHERE id = :reviewId`,
			{
				reviewId: params.id,
				title: title.trim(),
				description: description?.trim() || '',
				emoji: emoji || '📄'
			}
		);

		return { success: true, action: 'updated' };
	},

	delete: async ({ params, locals }) => {
		if (!locals.user) {
			return fail(401, { error: 'ログインが必要です' });
		}

		await db.execute(`DELETE FROM comments WHERE review_id = :reviewId`, { reviewId: params.id });
		await db.execute(`DELETE FROM review_goals WHERE review_id = :reviewId`, { reviewId: params.id });
		await db.execute(`DELETE FROM review_objectives WHERE review_id = :reviewId`, { reviewId: params.id });
		await db.execute(`DELETE FROM reviews WHERE id = :reviewId`, { reviewId: params.id });

		throw redirect(302, '/reviews');
	}
};
