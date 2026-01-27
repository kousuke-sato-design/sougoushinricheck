import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { nanoid } from 'nanoid';
import { createMagicLink, getMagicLinkUrl } from '$lib/server/magicLink';
import { sendEmail, getEmailSettings } from '$lib/server/email';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(302, '/');
	}

	// Get all active users for assignee selection
	const users = await db.execute(
		`SELECT id, name, email FROM users WHERE is_active = 1 AND id != :userId ORDER BY name`,
		{ userId: locals.user.id }
	);

	// Get all tags
	const tags = await db.execute(`SELECT id, name, color FROM tags ORDER BY name`);

	// Get all active goals for linking
	const goals = await db.execute(
		`SELECT g.id, g.title, g.due_date, g.status, g.color,
			(SELECT COUNT(*) FROM review_goals rg
			 JOIN reviews r ON rg.review_id = r.id
			 WHERE rg.goal_id = g.id AND r.status = 'approved') as completed_reviews,
			(SELECT COUNT(*) FROM review_goals WHERE goal_id = g.id) as total_reviews
		 FROM goals g
		 WHERE g.status != 'completed'
		 ORDER BY g.due_date ASC`
	);

	return {
		users: users.rows,
		tags: tags.rows,
		goals: goals.rows
	};
};

// Helper function to create review
async function createReviewInternal(
	formData: FormData,
	locals: App.Locals,
	url: URL,
	sendNotifications: boolean
): Promise<{ success: true; reviewId: string } | { success: false; error: string; formValues: Record<string, unknown> }> {
	if (!locals.user) {
		return { success: false, error: '認証が必要です', formValues: {} };
	}

	const title = formData.get('title') as string;
	const description = formData.get('description') as string;
	const targetUrls = formData.getAll('targetUrls') as string[];
	const selectedTags = formData.getAll('tags') as string[];
	const customTags = formData.getAll('customTags') as string[];
	const dueDate = formData.get('dueDate') as string;
	const assignees = formData.getAll('assignees') as string[];
	const goalIds = formData.getAll('goals') as string[];

	// Filter out empty URLs
	const validUrls = targetUrls.filter(url => url && url.trim());

	const formValues = {
		title,
		description,
		targetUrls: validUrls.join('\n'),
		selectedTags,
		customTags,
		dueDate,
		assignees
	};

	// Validation
	if (!title || validUrls.length === 0) {
		return { success: false, error: 'タイトルとURLは必須です', formValues };
	}

	if (assignees.length === 0) {
		return { success: false, error: 'レビュワーを1人以上選択してください', formValues };
	}

	try {
		const reviewId = nanoid();
		const publicToken = nanoid(32);

		// Store multiple URLs as newline-separated string
		const targetUrl = validUrls.join('\n');

		// Set status based on whether notifications are sent
		const status = sendNotifications ? 'pending' : 'draft';

		// Create review with public token
		await db.execute(
			`INSERT INTO reviews (id, title, description, target_url, content_type, status, requester_id, due_date, public_token)
			 VALUES (:id, :title, :description, :targetUrl, :contentType, :status, :requesterId, :dueDate, :publicToken)`,
			{
				id: reviewId,
				title,
				description: description || null,
				targetUrl,
				contentType: 'other',
				status,
				requesterId: locals.user.id,
				dueDate: dueDate || null,
				publicToken
			}
		);

		// Add existing tags to the review
		for (const tagId of selectedTags) {
			await db.execute(
				`INSERT INTO review_tags (id, review_id, tag_id) VALUES (:id, :reviewId, :tagId)`,
				{
					id: nanoid(),
					reviewId,
					tagId
				}
			);
		}

		// Create custom tags and add to the review
		const defaultColors = ['#64748b', '#6b7280', '#71717a', '#737373', '#78716c'];
		for (const tagName of customTags) {
			if (!tagName.trim()) continue;

			const newTagId = nanoid();
			const randomColor = defaultColors[Math.floor(Math.random() * defaultColors.length)];

			await db.execute(
				`INSERT INTO tags (id, name, color) VALUES (:id, :name, :color)`,
				{
					id: newTagId,
					name: tagName.trim(),
					color: randomColor
				}
			);

			await db.execute(
				`INSERT INTO review_tags (id, review_id, tag_id) VALUES (:id, :reviewId, :tagId)`,
				{
					id: nanoid(),
					reviewId,
					tagId: newTagId
				}
			);
		}

		// Link goals to the review
		for (const goalId of goalIds) {
			if (goalId) {
				await db.execute(
					`INSERT INTO review_goals (id, review_id, goal_id) VALUES (:id, :reviewId, :goalId)`,
					{
						id: nanoid(),
						reviewId,
						goalId
					}
				);
			}
		}

		// Create assignees
		for (const userId of assignees) {
			await db.execute(
				`INSERT INTO review_assignees (id, review_id, user_id) VALUES (:id, :reviewId, :userId)`,
				{
					id: nanoid(),
					reviewId,
					userId
				}
			);
		}

		// Send notifications if requested
		if (sendNotifications) {
			const emailSettings = await getEmailSettings();

			for (const userId of assignees) {
				// Create notification for assignee
				await db.execute(
					`INSERT INTO notifications (id, user_id, review_id, type, message)
					 VALUES (:id, :userId, :reviewId, 'review_request', :message)`,
					{
						id: nanoid(),
						userId,
						reviewId,
						message: `${locals.user.name}さんからレビュー依頼「${title}」が届きました`
					}
				);

				// Send email with magic link
				if (emailSettings) {
					const userResult = await db.execute(
						`SELECT email, name FROM users WHERE id = :userId`,
						{ userId }
					);

					if (userResult.rows.length > 0) {
						const assigneeUser = userResult.rows[0];

						const magicToken = await createMagicLink(userId, reviewId);
						const magicLinkUrl = getMagicLinkUrl(magicToken, url.origin);

						await sendEmail(
							assigneeUser.email as string,
							`[レビュー依頼] ${title}`,
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
											<h2 style="color: #1e293b; margin: 0 0 8px; font-size: 20px;">${title}</h2>
											${description ? `<p style="color: #64748b; margin: 0; font-size: 14px;">${description}</p>` : ''}
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
			}
		}

		return { success: true, reviewId };
	} catch (err) {
		console.error('Create review error:', err);
		return { success: false, error: 'レビュー依頼の作成に失敗しました', formValues };
	}
}

export const actions: Actions = {
	// Default action: Create and send notifications
	default: async ({ request, locals, url }) => {
		if (!locals.user) {
			throw redirect(302, '/');
		}

		const formData = await request.formData();
		const result = await createReviewInternal(formData, locals, url, true);

		if (result.success) {
			throw redirect(302, `/reviews/${result.reviewId}`);
		} else {
			return fail(400, { error: result.error, ...result.formValues });
		}
	},

	// Save only: Create without sending notifications
	saveOnly: async ({ request, locals, url }) => {
		if (!locals.user) {
			throw redirect(302, '/');
		}

		const formData = await request.formData();
		const result = await createReviewInternal(formData, locals, url, false);

		if (result.success) {
			throw redirect(302, `/reviews/${result.reviewId}`);
		} else {
			return fail(400, { error: result.error, ...result.formValues });
		}
	}
};
