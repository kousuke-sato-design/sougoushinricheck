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
		 LEFT JOIN users u ON c.user_id = u.id
		 WHERE c.review_id = :reviewId
		 ORDER BY c.created_at ASC`,
		{ reviewId: review.id }
	);

	// 承認者一覧を取得
	const approversResult = await db.execute(
		`SELECT guest_name, created_at FROM comments
		 WHERE review_id = :reviewId AND action_type = 'approved'
		 ORDER BY created_at ASC`,
		{ reviewId: review.id }
	);

	// メール送信用にユーザー一覧を取得
	const usersResult = await db.execute(
		`SELECT id, name, email FROM users WHERE is_active = 1 ORDER BY name ASC`
	);

	// プロジェクト一覧を取得
	const goalsResult = await db.execute(
		`SELECT id, title, color, status FROM goals ORDER BY created_at DESC`
	);

	// このレビューに紐付いたプロジェクトを取得
	const linkedGoalsResult = await db.execute(
		`SELECT g.id, g.title, g.color, g.status
		 FROM review_goals rg
		 JOIN goals g ON rg.goal_id = g.id
		 WHERE rg.review_id = :reviewId`,
		{ reviewId: params.id }
	);

	return {
		review,
		comments: commentsResult.rows,
		approvers: approversResult.rows,
		users: usersResult.rows,
		goals: goalsResult.rows,
		linkedGoals: linkedGoalsResult.rows
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
			`INSERT INTO comments (id, review_id, user_id, guest_name, action_type, content)
			 VALUES (:id, :reviewId, :userId, :guestName, 'approved', :content)`,
			{
				id: nanoid(),
				reviewId: review.id,
				userId: locals.user.id,
				guestName: locals.user.name,
				content: '確認OKしました'
			}
		);

		const emailSettings = await getEmailSettings();
		if (emailSettings && review.requester_email) {
			await sendEmail(
				review.requester_email as string,
				`[確認OK] ${review.title}`,
				`${locals.user.name}さんが「${review.title}」を確認OKしました。`,
				`<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; margin: 0 auto; font-family: sans-serif;">
					<tr>
						<td bgcolor="#10b981" style="background-color: #10b981; padding: 20px; border-radius: 12px 12px 0 0;">
							<h1 style="color: white; margin: 0; font-size: 20px;">確認OK</h1>
						</td>
					</tr>
					<tr>
						<td bgcolor="#f8fafc" style="background-color: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
							<p><strong>${locals.user.name}</strong>さんが以下を確認OKしました。</p>
							<table width="100%" cellpadding="0" cellspacing="0" border="0">
								<tr>
									<td bgcolor="#ffffff" style="background-color: #ffffff; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0;">
										<p style="margin: 0; font-weight: bold;">${review.title}</p>
									</td>
								</tr>
							</table>
						</td>
					</tr>
				</table>`
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

		// ステータスは変更しない（承認済みの場合は承認を維持）
		// コメントを追加するだけ
		await db.execute(
			`UPDATE reviews SET updated_at = datetime('now') WHERE id = :reviewId`,
			{ reviewId: review.id }
		);

		await db.execute(
			`INSERT INTO comments (id, review_id, user_id, guest_name, action_type, content)
			 VALUES (:id, :reviewId, :userId, :guestName, 'comment', :content)`,
			{
				id: nanoid(),
				reviewId: review.id,
				userId: locals.user.id,
				guestName: locals.user.name,
				content: reason.trim()
			}
		);

		if (sendNotification) {
			const emailSettings = await getEmailSettings();
			if (emailSettings && review.requester_email) {
				await sendEmail(
					review.requester_email as string,
					`[コメント] ${review.title}`,
					`${locals.user.name}さんが「${review.title}」にコメントしました。\n\nコメント: ${reason}`,
					`<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; margin: 0 auto; font-family: sans-serif;">
						<tr>
							<td bgcolor="#ef4444" style="background-color: #ef4444; padding: 20px; border-radius: 12px 12px 0 0;">
								<h1 style="color: white; margin: 0; font-size: 20px;">コメントがあります</h1>
							</td>
						</tr>
						<tr>
							<td bgcolor="#f8fafc" style="background-color: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
								<p><strong>${locals.user.name}</strong>さんがコメントしました。</p>
								<table width="100%" cellpadding="0" cellspacing="0" border="0">
									<tr>
										<td bgcolor="#ffffff" style="background-color: #ffffff; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0;">
											<p style="margin: 0; font-weight: bold;">${review.title}</p>
											<p style="margin: 8px 0 0; color: #64748b;">${reason}</p>
										</td>
									</tr>
								</table>
							</td>
						</tr>
					</table>`
				);
			}
		}

		return { success: true, action: 'commented' };
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
			`INSERT INTO comments (id, review_id, user_id, guest_name, action_type, content)
			 VALUES (:id, :reviewId, :userId, :guestName, 'resubmitted', :content)`,
			{
				id: nanoid(),
				reviewId: review.id,
				userId: locals.user.id,
				guestName: locals.user.name,
				content: 'ドキュメントを修正して再依頼しました'
			}
		);

		const emailSettings = await getEmailSettings();
		if (emailSettings && review.requester_email) {
			await sendEmail(
				review.requester_email as string,
				`[再依頼] ${title}`,
				`${locals.user.name}さんがドキュメント「${title}」を修正し、再依頼しました。`,
				`<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; margin: 0 auto; font-family: sans-serif;">
					<tr>
						<td bgcolor="#3b82f6" style="background-color: #3b82f6; padding: 20px; border-radius: 12px 12px 0 0;">
							<h1 style="color: white; margin: 0; font-size: 20px;">再依頼</h1>
						</td>
					</tr>
					<tr>
						<td bgcolor="#f8fafc" style="background-color: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
							<p><strong>${locals.user.name}</strong>さんがドキュメントを修正し、再度確認依頼を送信しました。</p>
							<table width="100%" cellpadding="0" cellspacing="0" border="0">
								<tr>
									<td bgcolor="#ffffff" style="background-color: #ffffff; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0;">
										<p style="margin: 0; font-weight: bold;">${title}</p>
									</td>
								</tr>
							</table>
						</td>
					</tr>
				</table>`
			);
		}

		return { success: true, action: 'resubmitted' };
	},

	update: async ({ request, params, locals }) => {
		if (!locals.user) {
			return fail(401, { error: 'ログインが必要です' });
		}

		// ロック状態を確認
		const reviewCheck = await db.execute(
			`SELECT is_locked FROM reviews WHERE id = :reviewId`,
			{ reviewId: params.id }
		);
		if (reviewCheck.rows.length > 0 && reviewCheck.rows[0].is_locked === 1) {
			return fail(400, { error: 'ロック中のため編集できません' });
		}

		const formData = await request.formData();
		const title = formData.get('title') as string;
		const description = formData.get('description') as string;
		const emoji = formData.get('emoji') as string;
		const goalIdsStr = formData.get('goal_ids') as string;

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

		// プロジェクト紐付けを更新
		await db.execute(`DELETE FROM review_goals WHERE review_id = :reviewId`, { reviewId: params.id });

		if (goalIdsStr) {
			const goalIds = goalIdsStr.split(',').filter(id => id.trim());
			for (const goalId of goalIds) {
				await db.execute(
					`INSERT INTO review_goals (id, review_id, goal_id) VALUES (:id, :reviewId, :goalId)`,
					{ id: nanoid(), reviewId: params.id, goalId: goalId.trim() }
				);
			}
		}

		return { success: true, action: 'updated' };
	},

	toggleLock: async ({ params, locals }) => {
		if (!locals.user) {
			return fail(401, { error: 'ログインが必要です' });
		}

		// 現在のロック状態を取得
		const reviewResult = await db.execute(
			`SELECT is_locked, requester_id FROM reviews WHERE id = :reviewId`,
			{ reviewId: params.id }
		);

		if (reviewResult.rows.length === 0) {
			return fail(404, { error: 'ドキュメントが見つかりません' });
		}

		const review = reviewResult.rows[0];

		// 作成者のみロック切替可能
		if (review.requester_id !== locals.user.id) {
			return fail(403, { error: 'ロックの切替は作成者のみ可能です' });
		}

		const newLockState = review.is_locked === 1 ? 0 : 1;

		await db.execute(
			`UPDATE reviews SET is_locked = :isLocked, updated_at = datetime('now') WHERE id = :reviewId`,
			{ isLocked: newLockState, reviewId: params.id }
		);

		return { success: true, action: newLockState === 1 ? 'locked' : 'unlocked' };
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
