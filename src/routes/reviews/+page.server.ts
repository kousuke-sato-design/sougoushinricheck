import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		throw redirect(302, '/');
	}

	const userId = locals.user.id;
	const filter = url.searchParams.get('filter') || 'assigned'; // assigned or created
	const status = url.searchParams.get('status') || 'all';
	const search = url.searchParams.get('search') || '';

	let query: string;
	let params: Record<string, unknown> = { userId };

	if (filter === 'created') {
		query = `
			SELECT r.*,
				u.name as requester_name,
				(SELECT COUNT(*) FROM review_assignees WHERE review_id = r.id AND status = 'approved') as approved_count,
				(SELECT COUNT(*) FROM review_assignees WHERE review_id = r.id) as total_assignees
			FROM reviews r
			JOIN users u ON r.requester_id = u.id
			WHERE r.requester_id = :userId
		`;
	} else {
		query = `
			SELECT r.*,
				u.name as requester_name,
				ra.status as assignee_status,
				(SELECT COUNT(*) FROM review_assignees WHERE review_id = r.id AND status = 'approved') as approved_count,
				(SELECT COUNT(*) FROM review_assignees WHERE review_id = r.id) as total_assignees
			FROM reviews r
			JOIN review_assignees ra ON r.id = ra.review_id
			JOIN users u ON r.requester_id = u.id
			WHERE ra.user_id = :userId
		`;
	}

	if (status !== 'all') {
		query += ` AND r.status = :status`;
		params.status = status;
	}

	if (search) {
		query += ` AND (r.title LIKE :search OR r.description LIKE :search)`;
		params.search = `%${search}%`;
	}

	query += ` ORDER BY r.created_at DESC`;

	const reviews = await db.execute(query, params);

	// Fetch tags for all reviews
	const reviewIds = reviews.rows.map((r: { id: string }) => r.id);
	let tagsMap: Record<string, Array<{ id: string; name: string; color: string }>> = {};

	if (reviewIds.length > 0) {
		const tagsResult = await db.execute(
			`SELECT rt.review_id, t.id, t.name, t.color
			 FROM review_tags rt
			 JOIN tags t ON rt.tag_id = t.id
			 WHERE rt.review_id IN (${reviewIds.map(() => '?').join(',')})`,
			reviewIds
		);

		for (const tag of tagsResult.rows as Array<{ review_id: string; id: string; name: string; color: string }>) {
			if (!tagsMap[tag.review_id]) {
				tagsMap[tag.review_id] = [];
			}
			tagsMap[tag.review_id].push({ id: tag.id, name: tag.name, color: tag.color });
		}
	}

	// Add tags to each review
	const reviewsWithTags = reviews.rows.map((r: { id: string }) => ({
		...r,
		tags: tagsMap[r.id] || []
	}));

	// Get all tags for filter
	const allTags = await db.execute(`SELECT id, name, color FROM tags ORDER BY name`);

	return {
		reviews: reviewsWithTags,
		allTags: allTags.rows,
		filter,
		status,
		search
	};
};
