import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { sendEmail } from '$lib/server/email';

export const POST: RequestHandler = async ({ params, request, locals, url }) => {
	if (!locals.user) {
		return json({ error: '認証が必要です' }, { status: 401 });
	}

	const reviewId = params.id;

	// Check if review exists and user is the owner
	const review = await db.execute(
		`SELECT id, title, description, public_token, requester_id FROM reviews WHERE id = :reviewId`,
		{ reviewId }
	);

	if (review.rows.length === 0) {
		return json({ error: 'ドキュメントが見つかりません' }, { status: 404 });
	}

	const doc = review.rows[0];

	// Only owner can send notifications
	if (doc.requester_id !== locals.user.id) {
		return json({ error: '権限がありません' }, { status: 403 });
	}

	const data = await request.json();
	const { userIds, message, dueDate } = data;

	if (!userIds || userIds.length === 0) {
		return json({ error: '送信先を選択してください' }, { status: 400 });
	}

	// Update due date if provided
	if (dueDate) {
		await db.execute(
			`UPDATE reviews SET due_date = :dueDate WHERE id = :reviewId`,
			{ dueDate, reviewId }
		);
	}

	// Get users - use named parameters for IN clause
	const userParams: Record<string, string> = {};
	const placeholders = userIds.map((id: string, index: number) => {
		const key = `user${index}`;
		userParams[key] = id;
		return `:${key}`;
	}).join(',');
	const users = await db.execute(
		`SELECT id, email, name FROM users WHERE id IN (${placeholders})`,
		userParams
	);

	if (users.rows.length === 0) {
		return json({ error: 'ユーザーが見つかりません' }, { status: 404 });
	}

	// Build share URL
	const shareUrl = doc.public_token
		? `${url.origin}/p/${doc.public_token}`
		: `${url.origin}/reviews/${reviewId}`;

	let sentCount = 0;
	let errorCount = 0;

	for (const user of users.rows) {
		const subject = `[確認依頼] ${doc.title}`;
		const text = `${locals.user.name}さんから確認依頼が届きました。\n\n${message}\n\n確認はこちら: ${shareUrl}`;
		const html = `
			<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; margin: 0 auto; font-family: sans-serif;">
				<tr>
					<td bgcolor="#3b82f6" style="background-color: #3b82f6; background: linear-gradient(135deg, #3b82f6, #6366f1); padding: 24px; border-radius: 16px 16px 0 0;">
						<h1 style="color: white; margin: 0; font-size: 24px;">確認依頼</h1>
					</td>
				</tr>
				<tr>
					<td bgcolor="#f8fafc" style="background-color: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 16px 16px;">
						<p style="color: #475569; margin: 0 0 16px;">
							<strong>${locals.user.name}</strong>さんから確認依頼が届きました。
						</p>
						<table width="100%" cellpadding="0" cellspacing="0" border="0">
							<tr>
								<td bgcolor="#ffffff" style="background-color: #ffffff; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0;">
									<h2 style="color: #1e293b; margin: 0 0 12px; font-size: 20px;">${doc.title}</h2>
									<p style="color: #64748b; margin: 0; white-space: pre-wrap;">${message}</p>
								</td>
							</tr>
						</table>
						<p style="margin: 20px 0 0;">
							<a href="${shareUrl}" style="display: inline-block; background-color: #3b82f6; color: white; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-weight: bold; font-size: 16px;">
								確認する
							</a>
						</p>
					</td>
				</tr>
			</table>
		`;

		const sent = await sendEmail(user.email as string, subject, text, html);
		if (sent) {
			sentCount++;
		} else {
			errorCount++;
		}
	}

	// Update status to pending (確認依頼中)
	await db.execute(
		`UPDATE reviews SET status = 'pending' WHERE id = :reviewId`,
		{ reviewId }
	);

	return json({
		success: true,
		sentCount,
		errorCount,
		message: `${sentCount}件のメールを送信しました`
	});
};
