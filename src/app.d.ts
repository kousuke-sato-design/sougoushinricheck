// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			user: {
				id: string;
				email: string;
				name: string;
				role: 'admin' | 'member';
			} | null;
		}
		// interface PageData {}
		// interface PageState {}
		interface Platform {
			env?: {
				TURSO_DATABASE_URL?: string;
				TURSO_AUTH_TOKEN?: string;
			};
		}
	}
}

export {};
