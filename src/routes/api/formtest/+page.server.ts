import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';
import { db } from '$lib/server/db';
import { nanoid } from 'nanoid';

export const actions: Actions = {
	default: async ({ request }) => {
		const steps: string[] = [];

		try {
			steps.push('1. Action started');

			// Step 2: Get form data
			const formData = await request.formData();
			steps.push(`2. Got formData`);

			// Step 3: Extract values
			const testValue = formData.get('testValue') as string;
			steps.push(`3. testValue = "${testValue}"`);

			// Step 4: Generate nanoid
			const id = nanoid();
			steps.push(`4. Generated id = "${id}"`);

			// Step 5: Test DB read
			const users = await db.execute('SELECT COUNT(*) as count FROM users');
			steps.push(`5. DB read OK: ${users.rows[0]?.count} users`);

			// Step 6: Test DB write
			const reviewId = nanoid();
			const publicToken = nanoid(32);
			const realUserId = (await db.execute('SELECT id FROM users LIMIT 1')).rows[0]?.id as string;

			await db.execute(
				`INSERT INTO reviews (id, title, description, target_url, content_type, status, requester_id, public_token)
				 VALUES (:id, :title, :description, :targetUrl, :contentType, :status, :requesterId, :publicToken)`,
				{
					id: reviewId,
					title: testValue || 'Test',
					description: 'Test from form action',
					targetUrl: 'https://example.com',
					contentType: 'other',
					status: 'draft',
					requesterId: realUserId,
					publicToken
				}
			);
			steps.push(`6. DB write OK: Created review ${reviewId}`);

			// Step 7: Clean up
			await db.execute('DELETE FROM reviews WHERE id = :id', { id: reviewId });
			steps.push(`7. Cleanup OK: Deleted review ${reviewId}`);

			return { success: true, steps };
		} catch (err) {
			steps.push(`ERROR: ${err instanceof Error ? err.message : String(err)}`);
			return fail(500, { success: false, steps, error: err instanceof Error ? err.message : String(err) });
		}
	}
};
