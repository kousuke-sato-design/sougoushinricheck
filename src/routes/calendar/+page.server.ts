import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		throw redirect(302, '/');
	}

	const userId = locals.user.id;
	const now = new Date();

	// Get year/month from query params or use current
	const year = parseInt(url.searchParams.get('year') || String(now.getFullYear()));
	const month = parseInt(url.searchParams.get('month') || String(now.getMonth()));
	const view = url.searchParams.get('view') || 'month';
	const filter = url.searchParams.get('filter') || 'all'; // all, goals, reviews

	// Calculate date range for the month (with padding for week views)
	const startDate = new Date(year, month, -6);
	const endDate = new Date(year, month + 1, 7);

	const startDateStr = startDate.toISOString();
	const endDateStr = endDate.toISOString();

	// Fetch goals
	let goals: Array<{
		id: string;
		title: string;
		due_date: string;
		created_at: string;
		status: string;
		color: string;
		description?: string;
	}> = [];

	if (filter === 'all' || filter === 'goals') {
		const goalsResult = await db.execute(
			`SELECT DISTINCT g.id, g.title, g.due_date, g.created_at, g.status, g.color, g.description
			 FROM goals g
			 LEFT JOIN goal_assignees ga ON g.id = ga.goal_id
			 WHERE (g.created_by = :userId OR ga.user_id = :userId)
			   AND g.due_date >= :startDate
			   AND g.due_date <= :endDate
			 ORDER BY g.due_date`,
			{ userId, startDate: startDateStr, endDate: endDateStr }
		);
		goals = goalsResult.rows as unknown as typeof goals;
	}

	// Fetch reviews
	let reviews: Array<{
		id: string;
		title: string;
		due_date: string;
		created_at: string;
		status: string;
		description?: string;
	}> = [];

	if (filter === 'all' || filter === 'reviews') {
		const reviewsResult = await db.execute(
			`SELECT DISTINCT r.id, r.title, r.due_date, r.created_at, r.status, r.description
			 FROM reviews r
			 LEFT JOIN review_assignees ra ON r.id = ra.review_id
			 WHERE (r.requester_id = :userId OR ra.user_id = :userId)
			   AND r.due_date >= :startDate
			   AND r.due_date <= :endDate
			 ORDER BY r.due_date`,
			{ userId, startDate: startDateStr, endDate: endDateStr }
		);
		reviews = reviewsResult.rows as unknown as typeof reviews;
	}

	// Combine into calendar items
	const calendarItems = [
		...goals.map(g => ({
			...g,
			type: 'goal' as const
		})),
		...reviews.map(r => ({
			...r,
			type: 'review' as const,
			color: '#3b82f6' // Default blue for reviews
		}))
	];

	return {
		year,
		month,
		view,
		filter,
		items: calendarItems
	};
};
