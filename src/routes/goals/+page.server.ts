import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		throw redirect(302, '/');
	}

	const userId = locals.user.id;
	const filter = url.searchParams.get('filter') || 'all'; // all, assigned, created
	const status = url.searchParams.get('status') || 'all';
	const search = url.searchParams.get('search') || '';

	let query = `
		SELECT g.*,
			u.name as creator_name,
			(SELECT COUNT(*) FROM review_goals rg
			 JOIN reviews r ON rg.review_id = r.id
			 WHERE rg.goal_id = g.id AND r.status = 'approved') as completed_reviews,
			(SELECT COUNT(*) FROM review_goals WHERE goal_id = g.id) as total_reviews
		FROM goals g
		JOIN users u ON g.created_by = u.id
	`;

	const params: Record<string, unknown> = {};

	if (filter === 'assigned') {
		query += ` JOIN goal_assignees ga ON g.id = ga.goal_id WHERE ga.user_id = :userId`;
		params.userId = userId;
	} else if (filter === 'created') {
		query += ` WHERE g.created_by = :userId`;
		params.userId = userId;
	} else {
		query += ` LEFT JOIN goal_assignees ga ON g.id = ga.goal_id
			WHERE (g.created_by = :userId OR ga.user_id = :userId)`;
		params.userId = userId;
	}

	if (status !== 'all') {
		query += ` AND g.status = :status`;
		params.status = status;
	}

	if (search) {
		query += ` AND (g.title LIKE :search OR g.description LIKE :search)`;
		params.search = `%${search}%`;
	}

	query += ` GROUP BY g.id ORDER BY g.due_date ASC`;

	const goals = await db.execute(query, params);

	// Fetch assignees for all goals
	const goalIds = goals.rows.map((g: { id: string }) => g.id);
	let assigneesMap: Record<string, Array<{ id: string; name: string }>> = {};

	if (goalIds.length > 0) {
		const placeholders = goalIds.map(() => '?').join(',');
		const assigneesResult = await db.execute(
			`SELECT ga.goal_id, u.id, u.name
			 FROM goal_assignees ga
			 JOIN users u ON ga.user_id = u.id
			 WHERE ga.goal_id IN (${placeholders})`,
			goalIds
		);

		for (const assignee of assigneesResult.rows as Array<{ goal_id: string; id: string; name: string }>) {
			if (!assigneesMap[assignee.goal_id]) {
				assigneesMap[assignee.goal_id] = [];
			}
			assigneesMap[assignee.goal_id].push({ id: assignee.id, name: assignee.name });
		}
	}

	const goalsWithAssignees = goals.rows.map((g: { id: string }) => ({
		...g,
		assignees: assigneesMap[g.id] || []
	}));

	return {
		goals: goalsWithAssignees,
		filter,
		status,
		search
	};
};
