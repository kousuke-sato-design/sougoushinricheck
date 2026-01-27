import { createClient, type Client, type InArgs } from '@libsql/client';
import { env } from '$env/dynamic/private';

let client: Client | null = null;

export function getDb(): Client {
	if (!client) {
		const url = env.TURSO_DATABASE_URL;
		const authToken = env.TURSO_AUTH_TOKEN;

		if (!url) {
			throw new Error('TURSO_DATABASE_URL is not set');
		}

		client = createClient({
			url,
			authToken
		});
	}
	return client;
}

export const db = {
	execute: async (sql: string, args?: Record<string, unknown>) => {
		const client = getDb();
		return client.execute({ sql, args: (args || {}) as InArgs });
	},
	batch: async (statements: Array<{ sql: string; args?: Record<string, unknown> }>) => {
		const client = getDb();
		return client.batch(statements.map(s => ({ sql: s.sql, args: (s.args || {}) as InArgs })));
	}
};
