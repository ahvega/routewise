// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			user?: {
				id: string;
				email: string;
				firstName: string | null;
				lastName: string | null;
			};
			session?: {
				tenantId: string | null;
				tenantSlug: string | null;
				tenantName: string | null;
				needsOnboarding: boolean;
			};
		}
		interface PageData {
			user?: {
				id: string;
				email: string;
				firstName: string | null;
				lastName: string | null;
			};
			session?: {
				tenantId: string | null;
				tenantSlug: string | null;
				tenantName: string | null;
				needsOnboarding: boolean;
			};
		}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
