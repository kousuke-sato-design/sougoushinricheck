import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { getEmailUsage } from '$lib/server/email';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		throw redirect(302, '/');
	}

	const userId = locals.user.id;
	const filter = url.searchParams.get('filter') || 'created'; // assigned or created
	const status = url.searchParams.get('status') || 'all';
	const search = url.searchParams.get('search') || '';
	const sort = url.searchParams.get('sort') || 'newest';

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

	// Sort order - status order puts completed items at the bottom
	if (sort === 'oldest') {
		query += ` ORDER BY r.created_at ASC`;
	} else if (sort === 'status') {
		// Order: pending, shared, in_review, draft, rejected, approved (completed last)
		query += ` ORDER BY CASE r.status
			WHEN 'pending' THEN 1
			WHEN 'shared' THEN 2
			WHEN 'in_review' THEN 3
			WHEN 'draft' THEN 4
			WHEN 'rejected' THEN 5
			WHEN 'approved' THEN 6
			ELSE 7 END, r.created_at DESC`;
	} else {
		query += ` ORDER BY r.created_at DESC`;
	}

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

	// Get email usage
	const emailUsage = await getEmailUsage();

	// Get all active users for notification (including self for testing)
	const allUsers = await db.execute(
		`SELECT id, name, email FROM users WHERE is_active = 1 ORDER BY name`
	);

	return {
		reviews: reviewsWithTags,
		allTags: allTags.rows,
		allUsers: allUsers.rows,
		filter,
		status,
		search,
		sort,
		emailUsage
	};
};
