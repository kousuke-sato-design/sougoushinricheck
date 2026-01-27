import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { nanoid } from 'nanoid';
import { sendEmail, getEmailSettings } from '$lib/server/email';

export const load: PageServerLoad = async ({ params }) => {
	const token = params.token;

	// Get review by public token
	const reviewResult = await db.execute(
		`SELECT r.*, u.name as requester_name, u.email as requester_email
		 FROM reviews r
		 JOIN users u ON r.requester_id = u.id
		 WHERE r.public_token = :token`,
		{ token }
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
		{ reviewId: review.id }
	);

	// Get comments
	const commentsResult = await db.execute(
		`SELECT c.*, u.name as user_name
		 FROM comments c
		 JOIN users u ON c.user_id = u.id
		 WHERE c.review_id = :reviewId
		 ORDER BY c.created_at ASC`,
		{ reviewId: review.id }
	);

	// Get tags
	const tagsResult = await db.execute(
		`SELECT t.id, t.name, t.color
		 FROM tags t
		 JOIN review_tags rt ON t.id = rt.tag_id
		 WHERE rt.review_id = :reviewId`,
		{ reviewId: review.id }
	);

	return {
		review,
		assignees: assigneesResult.rows,
		comments: commentsResult.rows,
		tags: tagsResult.rows
	};
};

export const actions: Actions = {
	comment: async ({ request, params }) => {
		const token = params.token;

		// Verify review exists
		const reviewResult = await db.execute(
			`SELECT id, title, requester_id FROM reviews WHERE public_token = :token`,
			{ token }
		);

		if (reviewResult.rows.length === 0) {
			return fail(404, { error: 'レビューが見つかりません' });
		}

		const review = reviewResult.rows[0];

		const formData = await request.formData();
		const content = formData.get('content') as string;
		const guestName = formData.get('guestName') as string;
		const parentId = formData.get('parentId') as string | null;

		if (!content || !content.trim()) {
			return fail(400, { error: 'コメントを入力してください' });
		}

		if (!guestName || !guestName.trim()) {
			return fail(400, { error: '名前を入力してください' });
		}

		// Create a temporary guest user or use a system user
		// For simplicity, we'll store guest name in content
		const commentId = nanoid();
		const guestContent = `【${guestName}】\n${content.trim()}`;

		// Get the requester to use as commenter (since we need a user_id)
		await db.execute(
			`INSERT INTO comments (id, review_id, user_id, parent_id, content)
			 VALUES (:id, :reviewId, :userId, :parentId, :content)`,
			{
				id: commentId,
				reviewId: review.id,
				userId: review.requester_id, // Use requester as the user_id for guest comments
				parentId: parentId || null,
				content: guestContent
			}
		);

		return { success: true };
	},

	approve: async ({ request, params }) => {
		const token = params.token;

		const formData = await request.formData();
		const guestName = formData.get('guestName') as string;
		const guestEmail = formData.get('guestEmail') as string;

		if (!guestName) {
			return fail(400, { error: '名前を入力してください' });
		}

		// Get review
		const reviewResult = await db.execute(
			`SELECT r.*, u.name as requester_name, u.email as requester_email
			 FROM reviews r
			 JOIN users u ON r.requester_id = u.id
			 WHERE r.public_token = :token`,
			{ token }
		);

		if (reviewResult.rows.length === 0) {
			return fail(404, { error: 'レビューが見つかりません' });
		}

		const review = reviewResult.rows[0];

		// Update review status
		await db.execute(
			`UPDATE reviews SET status = 'approved', updated_at = datetime('now') WHERE id = :reviewId`,
			{ reviewId: review.id }
		);

		// Add approval comment
		await db.execute(
			`INSERT INTO comments (id, review_id, user_id, content)
			 VALUES (:id, :reviewId, :userId, :content)`,
			{
				id: nanoid(),
				reviewId: review.id,
				userId: review.requester_id,
				content: `【${guestName}】が確認OKしました`
			}
		);

		// Send email notification to requester
		const emailSettings = await getEmailSettings();
		if (emailSettings && review.requester_email) {
			await sendEmail(
				review.requester_email as string,
				`[確認完了] ${review.title}`,
				`${guestName}さんが「${review.title}」を確認OKしました。\n\n詳細を確認するにはシステムにログインしてください。`,
				`
					<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
						<h2 style="color: #10b981;">確認完了</h2>
						<p><strong>${guestName}</strong>さんが以下のレビューを<span style="color: #10b981; font-weight: bold;">確認OK</span>しました。</p>
						<div style="background: #f1f5f9; padding: 16px; border-radius: 8px; margin: 16px 0;">
							<p style="margin: 0; font-weight: bold;">${review.title}</p>
						</div>
						<p style="color: #64748b; font-size: 14px;">詳細を確認するにはシステムにログインしてください。</p>
					</div>
				`
			);
		}

		return { success: true, action: 'approved', guestName };
	},

	reject: async ({ request, params }) => {
		const token = params.token;

		const formData = await request.formData();
		const guestName = formData.get('guestName') as string;
		const guestEmail = formData.get('guestEmail') as string;
		const reason = formData.get('reason') as string;

		if (!guestName) {
			return fail(400, { error: '名前を入力してください' });
		}

		// Get review
		const reviewResult = await db.execute(
			`SELECT r.*, u.name as requester_name, u.email as requester_email
			 FROM reviews r
			 JOIN users u ON r.requester_id = u.id
			 WHERE r.public_token = :token`,
			{ token }
		);

		if (reviewResult.rows.length === 0) {
			return fail(404, { error: 'レビューが見つかりません' });
		}

		const review = reviewResult.rows[0];

		// Update review status
		await db.execute(
			`UPDATE reviews SET status = 'rejected', updated_at = datetime('now') WHERE id = :reviewId`,
			{ reviewId: review.id }
		);

		// Add rejection comment
		const commentContent = reason
			? `【${guestName}】が差し戻ししました\n\n理由: ${reason}`
			: `【${guestName}】が差し戻ししました`;

		await db.execute(
			`INSERT INTO comments (id, review_id, user_id, content)
			 VALUES (:id, :reviewId, :userId, :content)`,
			{
				id: nanoid(),
				reviewId: review.id,
				userId: review.requester_id,
				content: commentContent
			}
		);

		// Send email notification to requester
		const emailSettings = await getEmailSettings();
		if (emailSettings && review.requester_email) {
			await sendEmail(
				review.requester_email as string,
				`[差し戻し] ${review.title}`,
				`${guestName}さんが「${review.title}」を差し戻ししました。\n\n${reason ? `理由: ${reason}\n\n` : ''}詳細を確認するにはシステムにログインしてください。`,
				`
					<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
						<h2 style="color: #ef4444;">差し戻し</h2>
						<p><strong>${guestName}</strong>さんが以下のレビューを<span style="color: #ef4444; font-weight: bold;">差し戻し</span>しました。</p>
						<div style="background: #f1f5f9; padding: 16px; border-radius: 8px; margin: 16px 0;">
							<p style="margin: 0; font-weight: bold;">${review.title}</p>
							${reason ? `<p style="margin: 8px 0 0 0; color: #64748b;">理由: ${reason}</p>` : ''}
						</div>
						<p style="color: #64748b; font-size: 14px;">詳細を確認するにはシステムにログインしてください。</p>
					</div>
				`
			);
		}

		return { success: true, action: 'rejected', guestName };
	}
};
