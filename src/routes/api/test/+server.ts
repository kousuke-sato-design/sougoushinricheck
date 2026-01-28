import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { nanoid } from 'nanoid';

export const POST: RequestHandler = async ({ request }) => {
	const tests: Record<string, string> = {};

	try {
		const body = await request.json().catch(() => ({}));
		tests.request_body = `OK: ${JSON.stringify(body)}`;
	} catch (e) {
		tests.request_body = `ERROR: ${e instanceof Error ? e.message : String(e)}`;
	}

	// Get a real user ID first
	let realUserId: string | null = null;
	try {
		const userResult = await db.execute('SELECT id FROM users LIMIT 1');
		if (userResult.rows.length > 0) {
			realUserId = userResult.rows[0].id as string;
			tests.get_user = `OK: Found user ${realUserId}`;
		} else {
			tests.get_user = 'ERROR: No users found';
		}
	} catch (e) {
		tests.get_user = `ERROR: ${e instanceof Error ? e.message : String(e)}`;
	}

	// Test actual INSERT into reviews
	if (realUserId) {
		try {
			const reviewId = nanoid();
			const publicToken = nanoid(32);

			await db.execute(
				`INSERT INTO reviews (id, title, description, target_url, content_type, status, requester_id, due_date, public_token)
				 VALUES (:id, :title, :description, :targetUrl, :contentType, :status, :requesterId, :dueDate, :publicToken)`,
				{
					id: reviewId,
					title: 'Test Review',
					description: 'Test description',
					targetUrl: 'https://example.com',
					contentType: 'other',
					status: 'draft',
					requesterId: realUserId,
					dueDate: null,
					publicToken
				}
			);
			tests.insert_review = `OK: Created review ${reviewId}`;

			// Test INSERT into review_assignees
			try {
				await db.execute(
					`INSERT INTO review_assignees (id, review_id, user_id) VALUES (:id, :reviewId, :userId)`,
					{
						id: nanoid(),
						reviewId,
						userId: realUserId
					}
				);
				tests.insert_assignee = `OK: Created assignee`;
			} catch (e) {
				tests.insert_assignee = `ERROR: ${e instanceof Error ? e.message : String(e)}`;
			}

			// Clean up test data
			await db.execute(`DELETE FROM review_assignees WHERE review_id = :id`, { id: reviewId });
			await db.execute(`DELETE FROM reviews WHERE id = :id`, { id: reviewId });
			tests.delete_review = `OK: Deleted review ${reviewId}`;
		} catch (e) {
			tests.insert_review = `ERROR: ${e instanceof Error ? e.message : String(e)}`;
		}
	}

	return json(tests);
};

export const GET: RequestHandler = async () => {
	const tests: Record<string, string> = {};

	// Test 1: nanoid
	try {
		const id = nanoid();
		tests.nanoid = `OK: ${id}`;
	} catch (e) {
		tests.nanoid = `ERROR: ${e instanceof Error ? e.message : String(e)}`;
	}

	// Test 2: DB connection
	try {
		const result = await db.execute('SELECT 1 as test');
		tests.db_connection = `OK: ${JSON.stringify(result.rows)}`;
	} catch (e) {
		tests.db_connection = `ERROR: ${e instanceof Error ? e.message : String(e)}`;
	}

	// Test 3: users table
	try {
		const result = await db.execute('SELECT COUNT(*) as count FROM users');
		tests.users_table = `OK: ${result.rows[0]?.count} users`;
	} catch (e) {
		tests.users_table = `ERROR: ${e instanceof Error ? e.message : String(e)}`;
	}

	// Test 4: reviews table
	try {
		const result = await db.execute('SELECT COUNT(*) as count FROM reviews');
		tests.reviews_table = `OK: ${result.rows[0]?.count} reviews`;
	} catch (e) {
		tests.reviews_table = `ERROR: ${e instanceof Error ? e.message : String(e)}`;
	}

	// Test 5: tags table
	try {
		const result = await db.execute('SELECT COUNT(*) as count FROM tags');
		tests.tags_table = `OK: ${result.rows[0]?.count} tags`;
	} catch (e) {
		tests.tags_table = `ERROR: ${e instanceof Error ? e.message : String(e)}`;
	}

	// Test 6: review_tags table
	try {
		const result = await db.execute('SELECT COUNT(*) as count FROM review_tags');
		tests.review_tags_table = `OK: ${result.rows[0]?.count} review_tags`;
	} catch (e) {
		tests.review_tags_table = `ERROR: ${e instanceof Error ? e.message : String(e)}`;
	}

	// Test 7: review_assignees table
	try {
		const result = await db.execute('SELECT COUNT(*) as count FROM review_assignees');
		tests.review_assignees_table = `OK: ${result.rows[0]?.count} review_assignees`;
	} catch (e) {
		tests.review_assignees_table = `ERROR: ${e instanceof Error ? e.message : String(e)}`;
	}

	// Test 8: goals table
	try {
		const result = await db.execute('SELECT COUNT(*) as count FROM goals');
		tests.goals_table = `OK: ${result.rows[0]?.count} goals`;
	} catch (e) {
		tests.goals_table = `ERROR: ${e instanceof Error ? e.message : String(e)}`;
	}

	// Test 9: review_goals table
	try {
		const result = await db.execute('SELECT COUNT(*) as count FROM review_goals');
		tests.review_goals_table = `OK: ${result.rows[0]?.count} review_goals`;
	} catch (e) {
		tests.review_goals_table = `ERROR: ${e instanceof Error ? e.message : String(e)}`;
	}

	// Test 10: Test INSERT (dry run check)
	try {
		const testId = nanoid();
		// Just generate the values, don't actually insert
		tests.insert_test = `OK: Would insert with id ${testId}`;
	} catch (e) {
		tests.insert_test = `ERROR: ${e instanceof Error ? e.message : String(e)}`;
	}

	return json(tests);
};
