import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		throw redirect(302, '/');
	}

	const search = url.searchParams.get('search') || '';
	const projectId = url.searchParams.get('project') || '';
	const sort = url.searchParams.get('sort') || 'newest';

	let query = `
		SELECT c.id, c.content, c.created_at, c.action_type, c.guest_name,
		       u.name as user_name,
		       r.id as review_id, r.title as review_title,
		       g.id as goal_id, g.title as goal_title, g.color as goal_color
		FROM comments c
		LEFT JOIN users u ON c.user_id = u.id
		JOIN reviews r ON c.review_id = r.id
		LEFT JOIN review_goals rg ON r.id = rg.review_id
		LEFT JOIN goals g ON rg.goal_id = g.id
		WHERE 1=1
	`;
	const params: Record<string, unknown> = {};

	if (search) {
		query += ` AND (c.content LIKE :search OR r.title LIKE :search OR g.title LIKE :search)`;
		params.search = `%${search}%`;
	}

	if (projectId === 'none') {
		query += ` AND g.id IS NULL`;
	} else if (projectId) {
		query += ` AND g.id = :projectId`;
		params.projectId = projectId;
	}

	if (sort === 'oldest') {
		query += ` ORDER BY c.created_at ASC`;
	} else {
		query += ` ORDER BY c.created_at DESC`;
	}

	query += ` LIMIT 500`;

	const commentsResult = await db.execute(query, params);

	const projectsResult = await db.execute(
		`SELECT id, title, color FROM goals ORDER BY created_at DESC`
	);

	return {
		comments: commentsResult.rows,
		projects: projectsResult.rows,
		search,
		projectId,
		sort
	};
};
