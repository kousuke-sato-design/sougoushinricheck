import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { nanoid } from 'nanoid';
import { sendEmail, getEmailSettings } from '$lib/server/email';

export const load: PageServerLoad = async ({ params }) => {
	const token = params.token;

	const reviewResult = await db.execute(
		`SELECT r.*, u.name as requester_name, u.email as requester_email
		 FROM reviews r
		 JOIN users u ON r.requester_id = u.id
		 WHERE r.public_token = :token`,
		{ token }
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

	// Get list of people who approved
	const approversResult = await db.execute(
		`SELECT guest_name, created_at FROM comments
		 WHERE review_id = :reviewId AND action_type = 'approved'
		 ORDER BY created_at ASC`,
		{ reviewId: review.id }
	);

	// Get related goals
	const goalsResult = await db.execute(
		`SELECT g.id, g.title, g.status, g.color, g.due_date
		 FROM review_goals rg
		 JOIN goals g ON rg.goal_id = g.id
		 WHERE rg.review_id = :reviewId
		 ORDER BY g.created_at DESC`,
		{ reviewId: review.id }
	);

	return {
		review,
		comments: commentsResult.rows,
		approvers: approversResult.rows,
		goals: goalsResult.rows
	};
};

export const actions: Actions = {
	approve: async ({ request, params }) => {
		const token = params.token;

		const formData = await request.formData();
		const guestName = formData.get('guestName') as string;

		if (!guestName || !guestName.trim()) {
			return fail(400, { error: '名前を入力してください' });
		}

		const reviewResult = await db.execute(
			`SELECT r.*, u.name as requester_name, u.email as requester_email
			 FROM reviews r
			 JOIN users u ON r.requester_id = u.id
			 WHERE r.public_token = :token`,
			{ token }
		);

		if (reviewResult.rows.length === 0) {
			return fail(404, { error: 'ドキュメントが見つかりません' });
		}

		const review = reviewResult.rows[0];

		// Don't change status to approved - allow multiple confirmations
		await db.execute(
			`UPDATE reviews SET updated_at = datetime('now') WHERE id = :reviewId`,
			{ reviewId: review.id }
		);

		await db.execute(
			`INSERT INTO comments (id, review_id, user_id, guest_name, action_type, content)
			 VALUES (:id, :reviewId, NULL, :guestName, 'approved', :content)`,
			{
				id: nanoid(),
				reviewId: review.id,
				guestName: guestName.trim(),
				content: '確認OKしました'
			}
		);

		const emailSettings = await getEmailSettings();
		if (emailSettings && review.requester_email) {
			await sendEmail(
				review.requester_email as string,
				`[確認OK] ${review.title}`,
				`${guestName}さんが「${review.title}」を確認OKしました。`,
				`<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; margin: 0 auto; font-family: sans-serif;">
					<tr>
						<td bgcolor="#10b981" style="background-color: #10b981; padding: 20px; border-radius: 12px 12px 0 0;">
							<h1 style="color: white; margin: 0; font-size: 20px;">確認OK</h1>
						</td>
					</tr>
					<tr>
						<td bgcolor="#f8fafc" style="background-color: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
							<p><strong>${guestName}</strong>さんが以下を確認OKしました。</p>
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

	reject: async ({ request, params }) => {
		const token = params.token;

		const formData = await request.formData();
		const guestNameInput = formData.get('guestName') as string;
		const guestName = guestNameInput?.trim() || '確認者';
		const reason = formData.get('reason') as string;
		const sendNotification = formData.get('sendNotification') === '1';

		if (!reason || !reason.trim()) {
			return fail(400, { error: 'コメントを入力してください' });
		}

		const reviewResult = await db.execute(
			`SELECT r.*, u.name as requester_name, u.email as requester_email
			 FROM reviews r
			 JOIN users u ON r.requester_id = u.id
			 WHERE r.public_token = :token`,
			{ token }
		);

		if (reviewResult.rows.length === 0) {
			return fail(404, { error: 'ドキュメントが見つかりません' });
		}

		const review = reviewResult.rows[0];

		await db.execute(
			`UPDATE reviews SET status = 'rejected', updated_at = datetime('now') WHERE id = :reviewId`,
			{ reviewId: review.id }
		);

		await db.execute(
			`INSERT INTO comments (id, review_id, user_id, guest_name, action_type, content)
			 VALUES (:id, :reviewId, NULL, :guestName, 'comment', :content)`,
			{
				id: nanoid(),
				reviewId: review.id,
				guestName: guestName,
				content: reason.trim()
			}
		);

		// Only send email if checkbox is checked
		if (sendNotification) {
			const emailSettings = await getEmailSettings();
			if (emailSettings && review.requester_email) {
				await sendEmail(
					review.requester_email as string,
					`[コメント] ${review.title}`,
					`${guestName}さんが「${review.title}」にコメントしました。\n\nコメント: ${reason}`,
					`<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; margin: 0 auto; font-family: sans-serif;">
						<tr>
							<td bgcolor="#ef4444" style="background-color: #ef4444; padding: 20px; border-radius: 12px 12px 0 0;">
								<h1 style="color: white; margin: 0; font-size: 20px;">コメントがあります</h1>
							</td>
						</tr>
						<tr>
							<td bgcolor="#f8fafc" style="background-color: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
								<p><strong>${guestName}</strong>さんがコメントしました。</p>
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

		return { success: true, action: 'rejected' };
	},

	resubmit: async ({ request, params }) => {
		const token = params.token;

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
			 WHERE r.public_token = :token`,
			{ token }
		);

		if (reviewResult.rows.length === 0) {
			return fail(404, { error: 'ドキュメントが見つかりません' });
		}

		const review = reviewResult.rows[0];

		// Update document and change status back to pending
		await db.execute(
			`UPDATE reviews SET title = :title, description = :description, status = 'pending', updated_at = datetime('now') WHERE id = :reviewId`,
			{ title: title.trim(), description: description?.trim() || '', reviewId: review.id }
		);

		// Add a comment for the update
		await db.execute(
			`INSERT INTO comments (id, review_id, user_id, guest_name, action_type, content)
			 VALUES (:id, :reviewId, :userId, NULL, 'resubmitted', :content)`,
			{
				id: nanoid(),
				reviewId: review.id,
				userId: review.requester_id,
				content: 'ドキュメントを修正して再依頼しました'
			}
		);

		// Send notification email to requester
		const emailSettings = await getEmailSettings();
		if (emailSettings && review.requester_email) {
			await sendEmail(
				review.requester_email as string,
				`[再依頼] ${title}`,
				`ドキュメント「${title}」が修正され、再依頼されました。`,
				`<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; margin: 0 auto; font-family: sans-serif;">
					<tr>
						<td bgcolor="#3b82f6" style="background-color: #3b82f6; padding: 20px; border-radius: 12px 12px 0 0;">
							<h1 style="color: white; margin: 0; font-size: 20px;">再依頼</h1>
						</td>
					</tr>
					<tr>
						<td bgcolor="#f8fafc" style="background-color: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
							<p>ドキュメントが修正され、再度確認依頼が送信されました。</p>
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
	}
};
