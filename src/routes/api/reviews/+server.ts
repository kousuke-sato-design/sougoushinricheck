import { json, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { nanoid } from 'nanoid';

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		if (!locals.user) {
			return json({ error: '認証が必要です' }, { status: 401 });
		}

		const data = await request.json();
		const { title, description, targetUrls, tags, customTags, dueDate, assignees, goals, isDraft } = data;

		if (!title) {
			return json({ error: 'タイトルは必須です' }, { status: 400 });
		}

		if (!assignees || assignees.length === 0) {
			return json({ error: '担当者を1人以上選択してください' }, { status: 400 });
		}

		const reviewId = nanoid();
		const publicToken = nanoid(32);
		const validUrls = (targetUrls || []).filter((u: string) => u && u.trim());

		// Create review
		await db.execute(
			`INSERT INTO reviews (id, title, description, target_url, content_type, status, requester_id, due_date, public_token)
			 VALUES (:id, :title, :description, :targetUrl, :contentType, :status, :requesterId, :dueDate, :publicToken)`,
			{
				id: reviewId,
				title,
				description: description || null,
				targetUrl: validUrls.length > 0 ? validUrls.join('\n') : null,
				contentType: 'other',
				status: isDraft ? 'draft' : 'pending',
				requesterId: locals.user.id,
				dueDate: dueDate || null,
				publicToken
			}
		);

		// Add tags
		for (const tagId of (tags || [])) {
			await db.execute(
				`INSERT INTO review_tags (id, review_id, tag_id) VALUES (:id, :reviewId, :tagId)`,
				{ id: nanoid(), reviewId, tagId }
			);
		}

		// Create custom tags
		const defaultColors = ['#64748b', '#6b7280', '#71717a', '#737373', '#78716c'];
		for (const tagName of (customTags || [])) {
			if (!tagName.trim()) continue;
			const newTagId = nanoid();
			const randomColor = defaultColors[Math.floor(Math.random() * defaultColors.length)];
			await db.execute(
				`INSERT INTO tags (id, name, color) VALUES (:id, :name, :color)`,
				{ id: newTagId, name: tagName.trim(), color: randomColor }
			);
			await db.execute(
				`INSERT INTO review_tags (id, review_id, tag_id) VALUES (:id, :reviewId, :tagId)`,
				{ id: nanoid(), reviewId, tagId: newTagId }
			);
		}

		// Link goals
		for (const goalId of (goals || [])) {
			if (goalId) {
				await db.execute(
					`INSERT INTO review_goals (id, review_id, goal_id) VALUES (:id, :reviewId, :goalId)`,
					{ id: nanoid(), reviewId, goalId }
				);
			}
		}

		// Create assignees
		for (const userId of assignees) {
			await db.execute(
				`INSERT INTO review_assignees (id, review_id, user_id) VALUES (:id, :reviewId, :userId)`,
				{ id: nanoid(), reviewId, userId }
			);
		}

		// Create notifications if not draft
		if (!isDraft) {
			for (const userId of assignees) {
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
			}
		}

		return json({ success: true, reviewId });
	} catch (err) {
		console.error('Create review error:', err);
		return json({ error: `エラー: ${err instanceof Error ? err.message : String(err)}` }, { status: 500 });
	}
};
