import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		throw redirect(302, '/');
	}

	// Get filter parameters
	const type = url.searchParams.get('type') || 'all'; // all, documents, projects
	const status = url.searchParams.get('status') || 'all';
	const sort = url.searchParams.get('sort') || 'newest';
	const search = url.searchParams.get('search') || '';
	const projectId = url.searchParams.get('project') || '';

	// Get all documents with project info
	let documentsQuery = `
		SELECT r.*, u.name as requester_name,
		       g.id as goal_id, g.title as goal_title, g.color as goal_color
		FROM reviews r
		JOIN users u ON r.requester_id = u.id
		LEFT JOIN review_goals rg ON r.id = rg.review_id
		LEFT JOIN goals g ON rg.goal_id = g.id
		WHERE 1=1
	`;
	const docParams: Record<string, unknown> = {};

	if (search) {
		documentsQuery += ` AND r.title LIKE :search`;
		docParams.search = `%${search}%`;
	}

	if (status !== 'all') {
		documentsQuery += ` AND r.status = :status`;
		docParams.status = status;
	}

	if (projectId) {
		documentsQuery += ` AND g.id = :projectId`;
		docParams.projectId = projectId;
	}

	// Sort
	if (sort === 'oldest') {
		documentsQuery += ` ORDER BY r.created_at ASC`;
	} else if (sort === 'title') {
		documentsQuery += ` ORDER BY r.title ASC`;
	} else if (sort === 'status') {
		documentsQuery += ` ORDER BY r.status ASC, r.created_at DESC`;
	} else {
		documentsQuery += ` ORDER BY r.created_at DESC`;
	}

	const documentsResult = await db.execute(documentsQuery, docParams);

	// Get all projects
	let projectsQuery = `
		SELECT g.*, u.name as creator_name,
		       (SELECT COUNT(*) FROM review_goals rg WHERE rg.goal_id = g.id) as document_count
		FROM goals g
		JOIN users u ON g.created_by = u.id
		WHERE 1=1
	`;
	const projParams: Record<string, unknown> = {};

	if (search) {
		projectsQuery += ` AND g.title LIKE :search`;
		projParams.search = `%${search}%`;
	}

	if (status !== 'all') {
		projectsQuery += ` AND g.status = :status`;
		projParams.status = status;
	}

	// Sort
	if (sort === 'oldest') {
		projectsQuery += ` ORDER BY g.created_at ASC`;
	} else if (sort === 'title') {
		projectsQuery += ` ORDER BY g.title ASC`;
	} else if (sort === 'status') {
		projectsQuery += ` ORDER BY g.status ASC, g.created_at DESC`;
	} else if (sort === 'due_date') {
		projectsQuery += ` ORDER BY g.due_date ASC`;
	} else {
		projectsQuery += ` ORDER BY g.created_at DESC`;
	}

	const projectsResult = await db.execute(projectsQuery, projParams);

	// Get all projects for filter dropdown
	const allProjectsResult = await db.execute(
		`SELECT id, title, color FROM goals ORDER BY title ASC`
	);

	// Get all members
	const membersResult = await db.execute(
		`SELECT id, name, email FROM users WHERE is_active = 1 ORDER BY name ASC`
	);

	// Stats
	const docStats = await db.execute(`
		SELECT
			COUNT(*) as total,
			SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft,
			SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
			SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved
		FROM reviews
	`);

	const projStats = await db.execute(`
		SELECT
			COUNT(*) as total,
			SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
			SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
			SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
		FROM goals
	`);

	return {
		user: locals.user,
		documents: documentsResult.rows,
		projects: projectsResult.rows,
		allProjects: allProjectsResult.rows,
		members: membersResult.rows,
		filters: { type, status, sort, search, projectId },
		stats: {
			documents: docStats.rows[0],
			projects: projStats.rows[0]
		}
	};
};
