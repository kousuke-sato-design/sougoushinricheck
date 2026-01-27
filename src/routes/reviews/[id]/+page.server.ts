import { redirect, fail, error } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { nanoid } from 'nanoid';
import { createMagicLink, getMagicLinkUrl } from '$lib/server/magicLink';
import { sendEmail, getEmailSettings } from '$lib/server/email';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) {
		throw redirect(302, '/');
	}

	const reviewId = params.id;

	// Get review details
	const reviewResult = await db.execute(
		`SELECT r.*, u.name as requester_name, u.email as requester_email
		 FROM reviews r
		 JOIN users u ON r.requester_id = u.id
		 WHERE r.id = :reviewId`,
		{ reviewId }
	);

	if (reviewResult.rows.length === 0) {
		throw error(404, 'レビューが見つかりません');
	}

	const review = reviewResult.rows[0];

	// Get assignees
	const assigneesResult = await db.execute(
		`SELECT ra.*, u.name, u.email
		 FROM review_assignees ra
		 JOIN users u ON ra.user_id = u.id
		 WHERE ra.review_id = :reviewId`,
		{ reviewId }
	);

	// Get comments with user info
	const commentsResult = await db.execute(
		`SELECT c.*, u.name as user_name
		 FROM comments c
		 JOIN users u ON c.user_id = u.id
		 WHERE c.review_id = :reviewId
		 ORDER BY c.created_at ASC`,
		{ reviewId }
	);

	// Get tags for this review
	const tagsResult = await db.execute(
		`SELECT t.id, t.name, t.color
		 FROM tags t
		 JOIN review_tags rt ON t.id = rt.tag_id
		 WHERE rt.review_id = :reviewId`,
		{ reviewId }
	);

	// Get goals linked to this review
	const goalsResult = await db.execute(
		`SELECT g.id, g.title, g.due_date, g.status, g.color, g.description,
			(SELECT COUNT(*) FROM review_goals rg2
			 JOIN reviews r ON rg2.review_id = r.id
			 WHERE rg2.goal_id = g.id AND r.status = 'approved') as completed_reviews,
			(SELECT COUNT(*) FROM review_goals WHERE goal_id = g.id) as total_reviews
		 FROM goals g
		 JOIN review_goals rg ON g.id = rg.goal_id
		 WHERE rg.review_id = :reviewId`,
		{ reviewId }
	);

	// Check if user is assignee
	const isAssignee = assigneesResult.rows.some(
		(a) => a.user_id === locals.user?.id
	);
	const isRequester = review.requester_id === locals.user.id;

	// Get user's assignee status
	const myAssignment = assigneesResult.rows.find(
		(a) => a.user_id === locals.user?.id
	);

	return {
		review,
		assignees: assigneesResult.rows,
		comments: commentsResult.rows,
		tags: tagsResult.rows,
		goals: goalsResult.rows,
		isAssignee,
		isRequester,
		myAssignment,
		publicUrl: review.public_token ? `/p/${review.public_token}` : null
	};
};

export const actions: Actions = {
	comment: async ({ request, locals, params }) => {
		if (!locals.user) {
			throw redirect(302, '/');
		}

		const formData = await request.formData();
		const content = formData.get('content') as string;
		const parentId = formData.get('parentId') as string | null;

		if (!content || !content.trim()) {
			return fail(400, { error: 'コメントを入力してください' });
		}

		const commentId = nanoid();
		await db.execute(
			`INSERT INTO comments (id, review_id, user_id, parent_id, content)
			 VALUES (:id, :reviewId, :userId, :parentId, :content)`,
			{
				id: commentId,
				reviewId: params.id,
				userId: locals.user.id,
				parentId: parentId || null,
				content: content.trim()
			}
		);

		// Get review and create notification for other participants
		const review = await db.execute(
			`SELECT title, requester_id FROM reviews WHERE id = :reviewId`,
			{ reviewId: params.id }
		);

		if (review.rows.length > 0) {
			const reviewData = review.rows[0];

			// Notify requester if commenter is not the requester
			if (reviewData.requester_id !== locals.user.id) {
				await db.execute(
					`INSERT INTO notifications (id, user_id, review_id, type, message)
					 VALUES (:id, :userId, :reviewId, 'comment', :message)`,
					{
						id: nanoid(),
						userId: reviewData.requester_id,
						reviewId: params.id,
						message: `${locals.user.name}さんが「${reviewData.title}」にコメントしました`
					}
				);
			}

			// Notify assignees (except the commenter)
			const assignees = await db.execute(
				`SELECT user_id FROM review_assignees WHERE review_id = :reviewId AND user_id != :userId`,
				{ reviewId: params.id, userId: locals.user.id }
			);

			for (const assignee of assignees.rows) {
				if (assignee.user_id !== reviewData.requester_id) {
					await db.execute(
						`INSERT INTO notifications (id, user_id, review_id, type, message)
						 VALUES (:id, :userId, :reviewId, 'comment', :message)`,
						{
							id: nanoid(),
							userId: assignee.user_id,
							reviewId: params.id,
							message: `${locals.user.name}さんが「${reviewData.title}」にコメントしました`
						}
					);
				}
			}
		}

		return { success: true };
	},

	approve: async ({ locals, params }) => {
		if (!locals.user) {
			throw redirect(302, '/');
		}

		const reviewId = params.id;

		// Update assignee status
		await db.execute(
			`UPDATE review_assignees
			 SET status = 'approved', reviewed_at = datetime('now')
			 WHERE review_id = :reviewId AND user_id = :userId`,
			{ reviewId, userId: locals.user.id }
		);

		// Check if all assignees have approved
		const assignees = await db.execute(
			`SELECT status FROM review_assignees WHERE review_id = :reviewId`,
			{ reviewId }
		);

		const allApproved = assignees.rows.every((a) => a.status === 'approved');

		if (allApproved) {
			await db.execute(
				`UPDATE reviews SET status = 'approved', updated_at = datetime('now') WHERE id = :reviewId`,
				{ reviewId }
			);
		} else {
			await db.execute(
				`UPDATE reviews SET status = 'in_review', updated_at = datetime('now') WHERE id = :reviewId`,
				{ reviewId }
			);
		}

		// Notify requester
		const review = await db.execute(
			`SELECT title, requester_id FROM reviews WHERE id = :reviewId`,
			{ reviewId }
		);

		if (review.rows.length > 0) {
			await db.execute(
				`INSERT INTO notifications (id, user_id, review_id, type, message)
				 VALUES (:id, :userId, :reviewId, 'approval', :message)`,
				{
					id: nanoid(),
					userId: review.rows[0].requester_id,
					reviewId,
					message: `${locals.user.name}さんが「${review.rows[0].title}」を承認しました`
				}
			);
		}

		return { success: true, action: 'approved' };
	},

	reject: async ({ locals, params }) => {
		if (!locals.user) {
			throw redirect(302, '/');
		}

		const reviewId = params.id;

		// Update assignee status
		await db.execute(
			`UPDATE review_assignees
			 SET status = 'rejected', reviewed_at = datetime('now')
			 WHERE review_id = :reviewId AND user_id = :userId`,
			{ reviewId, userId: locals.user.id }
		);

		// Update review status
		await db.execute(
			`UPDATE reviews SET status = 'rejected', updated_at = datetime('now') WHERE id = :reviewId`,
			{ reviewId }
		);

		// Notify requester
		const review = await db.execute(
			`SELECT title, requester_id FROM reviews WHERE id = :reviewId`,
			{ reviewId }
		);

		if (review.rows.length > 0) {
			await db.execute(
				`INSERT INTO notifications (id, user_id, review_id, type, message)
				 VALUES (:id, :userId, :reviewId, 'approval', :message)`,
				{
					id: nanoid(),
					userId: review.rows[0].requester_id,
					reviewId,
					message: `${locals.user.name}さんが「${review.rows[0].title}」を差し戻しました`
				}
			);
		}

		return { success: true, action: 'rejected' };
	},

	sendNotifications: async ({ locals, params, url }) => {
		if (!locals.user) {
			throw redirect(302, '/');
		}

		const reviewId = params.id;

		// Get review details
		const reviewResult = await db.execute(
			`SELECT r.*, u.name as requester_name
			 FROM reviews r
			 JOIN users u ON r.requester_id = u.id
			 WHERE r.id = :reviewId`,
			{ reviewId }
		);

		if (reviewResult.rows.length === 0) {
			return fail(404, { error: 'レビューが見つかりません' });
		}

		const review = reviewResult.rows[0];

		// Only allow sending notifications for draft reviews
		if (review.status !== 'draft') {
			return fail(400, { error: 'このレビューは既に通知済みです' });
		}

		// Only requester can send notifications
		if (review.requester_id !== locals.user.id) {
			return fail(403, { error: '権限がありません' });
		}

		// Get assignees
		const assigneesResult = await db.execute(
			`SELECT ra.user_id, u.email, u.name
			 FROM review_assignees ra
			 JOIN users u ON ra.user_id = u.id
			 WHERE ra.review_id = :reviewId`,
			{ reviewId }
		);

		const emailSettings = await getEmailSettings();

		// Send notifications to assignees
		for (const assignee of assigneesResult.rows) {
			// Create notification
			await db.execute(
				`INSERT INTO notifications (id, user_id, review_id, type, message)
				 VALUES (:id, :userId, :reviewId, 'review_request', :message)`,
				{
					id: nanoid(),
					userId: assignee.user_id,
					reviewId,
					message: `${locals.user.name}さんからレビュー依頼「${review.title}」が届きました`
				}
			);

			// Send email with magic link
			if (emailSettings) {
				const magicToken = await createMagicLink(assignee.user_id as string, reviewId);
				const magicLinkUrl = getMagicLinkUrl(magicToken, url.origin);

				await sendEmail(
					assignee.email as string,
					`[レビュー依頼] ${review.title}`,
					`${locals.user.name}さんからレビュー依頼が届きました。\n\n以下のリンクをクリックしてレビューを確認してください。\n${magicLinkUrl}`,
					`
						<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
							<div style="background: linear-gradient(135deg, #3b82f6, #6366f1); padding: 24px; border-radius: 16px 16px 0 0;">
								<h1 style="color: white; margin: 0; font-size: 24px;">レビュー依頼</h1>
							</div>
							<div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none;">
								<p style="color: #475569; margin: 0 0 16px;">
									<strong>${locals.user.name}</strong>さんから新しいレビュー依頼が届きました。
								</p>
								<div style="background: white; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 20px;">
									<h2 style="color: #1e293b; margin: 0 0 8px; font-size: 20px;">${review.title}</h2>
									${review.description ? `<p style="color: #64748b; margin: 0; font-size: 14px;">${review.description}</p>` : ''}
								</div>
								<a href="${magicLinkUrl}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6, #6366f1); color: white; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-weight: bold; font-size: 16px;">
									レビューを確認する →
								</a>
								<p style="color: #94a3b8; font-size: 12px; margin-top: 20px;">
									このリンクは7日間有効です。クリックするだけでログインできます。
								</p>
							</div>
						</div>
					`
				);
			}
		}

		// Update review status to pending
		await db.execute(
			`UPDATE reviews SET status = 'pending', updated_at = datetime('now') WHERE id = :reviewId`,
			{ reviewId }
		);

		return { success: true, action: 'notified' };
	}
};
