import { db } from './db';
import { nanoid } from 'nanoid';

export type MagicLinkType = 'review' | 'calendar' | 'goal';

export async function createMagicLink(
	userId: string,
	reviewId?: string,
	expiresInDays = 7,
	type: MagicLinkType = 'review'
): Promise<string> {
	const token = nanoid(32);
	const expiresAt = new Date();
	expiresAt.setDate(expiresAt.getDate() + expiresInDays);

	await db.execute(
		`INSERT INTO magic_links (id, user_id, review_id, token, expires_at, type)
		 VALUES (:id, :userId, :reviewId, :token, :expiresAt, :type)`,
		{
			id: nanoid(),
			userId,
			reviewId: reviewId || null,
			token,
			expiresAt: expiresAt.toISOString(),
			type
		}
	);

	return token;
}

export function getMagicLinkUrl(token: string, baseUrl: string, type: MagicLinkType = 'review'): string {
	if (type === 'calendar') {
		return `${baseUrl}/calendar/${token}`;
	}
	return `${baseUrl}/auth/magic/${token}`;
}

export async function createCalendarMagicLink(userId: string, expiresInDays = 7): Promise<string> {
	return createMagicLink(userId, undefined, expiresInDays, 'calendar');
}
