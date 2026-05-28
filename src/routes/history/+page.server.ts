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
		SELECT l.id, l.message, l.sent_at, l.success, l.due_date,
		       ru.name as recipient_name, ru.email as recipient_email,
		       su.name as sender_name,
		       r.id as review_id, r.title as review_title,
		       g.id as goal_id, g.title as goal_title, g.color as goal_color
		FROM confirmation_email_logs l
		JOIN reviews r ON l.review_id = r.id
		LEFT JOIN users ru ON l.recipient_id = ru.id
		LEFT JOIN users su ON l.sender_id = su.id
		LEFT JOIN review_goals rg ON r.id = rg.review_id
		LEFT JOIN goals g ON rg.goal_id = g.id
		WHERE 1=1
	`;
	const params: Record<string, unknown> = {};

	if (search) {
		query += ` AND (r.title LIKE :search OR g.title LIKE :search OR ru.name LIKE :search OR l.message LIKE :search)`;
		params.search = `%${search}%`;
	}

	if (projectId === 'none') {
		query += ` AND g.id IS NULL`;
	} else if (projectId) {
		query += ` AND g.id = :projectId`;
		params.projectId = projectId;
	}

	if (sort === 'oldest') {
		query += ` ORDER BY l.sent_at ASC`;
	} else {
		query += ` ORDER BY l.sent_at DESC`;
	}

	query += ` LIMIT 500`;

	const logsResult = await db.execute(query, params);

	const projectsResult = await db.execute(
		`SELECT id, title, color FROM goals ORDER BY created_at DESC`
	);

	return {
		logs: logsResult.rows,
		projects: projectsResult.rows,
		search,
		projectId,
		sort
	};
};
