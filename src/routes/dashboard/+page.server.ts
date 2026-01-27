import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(302, '/');
	}

	const userId = locals.user.id;

	// Get reviews assigned to user (pending)
	const assignedReviews = await db.execute(
		`SELECT r.*, u.name as requester_name
		 FROM reviews r
		 JOIN review_assignees ra ON r.id = ra.review_id
		 JOIN users u ON r.requester_id = u.id
		 WHERE ra.user_id = :userId AND ra.status = 'pending'
		 ORDER BY r.created_at DESC
		 LIMIT 10`,
		{ userId }
	);

	// Get reviews created by user (in progress)
	const myReviews = await db.execute(
		`SELECT r.*,
		 (SELECT COUNT(*) FROM review_assignees WHERE review_id = r.id AND status = 'approved') as approved_count,
		 (SELECT COUNT(*) FROM review_assignees WHERE review_id = r.id) as total_assignees
		 FROM reviews r
		 WHERE r.requester_id = :userId AND r.status IN ('pending', 'in_review')
		 ORDER BY r.created_at DESC
		 LIMIT 10`,
		{ userId }
	);

	// Get recent activity (comments and status changes)
	const recentActivity = await db.execute(
		`SELECT c.id, c.content, c.created_at, u.name as user_name, r.title as review_title, r.id as review_id
		 FROM comments c
		 JOIN users u ON c.user_id = u.id
		 JOIN reviews r ON c.review_id = r.id
		 WHERE r.requester_id = :userId OR r.id IN (
		   SELECT review_id FROM review_assignees WHERE user_id = :userId
		 )
		 ORDER BY c.created_at DESC
		 LIMIT 10`,
		{ userId }
	);

	return {
		assignedReviews: assignedReviews.rows,
		myReviews: myReviews.rows,
		recentActivity: recentActivity.rows
	};
};
