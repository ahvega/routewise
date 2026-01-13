<script lang="ts">
	import { useConvexClient, useQuery } from 'convex-svelte';
	import { api } from '$convex/_generated/api';
	import { tenantStore } from '$lib/stores';
	import { Spinner } from 'flowbite-svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import type { Id } from '$convex/_generated/dataModel';

	interface SessionData {
		tenantId?: string;
		tenantSlug?: string;
		tenantName?: string;
		needsOnboarding?: boolean;
	}

	let { children, user, session } = $props<{
		children: any;
		user?: { id: string; email: string; firstName: string | null; lastName: string | null; avatarUrl?: string | null } | null;
		session?: SessionData | null;
	}>();

	const client = useConvexClient();

	// Determine tenant ID from session
	const sessionTenantId = $derived(session?.tenantId as Id<"tenants"> | undefined);

	// Query for tenant with usage info if we have a tenantId
	const tenantQuery = useQuery(
		api.tenants.getWithUsage,
		() => sessionTenantId ? { id: sessionTenantId } : 'skip'
	);

	// Handle tenant loading and routing
	$effect(() => {
		// Check if user needs onboarding
		if (session?.needsOnboarding) {
			tenantStore.setNeedsOnboarding(true);
			// Only redirect if not already on onboarding pages
			const currentPath = $page.url.pathname;
			if (!currentPath.startsWith('/onboarding')) {
				goto('/onboarding/setup');
			}
			return;
		}

		// If no tenantId in session but user is logged in, they need onboarding
		if (user && !sessionTenantId) {
			tenantStore.setNeedsOnboarding(true);
			const currentPath = $page.url.pathname;
			if (!currentPath.startsWith('/onboarding') && !currentPath.startsWith('/auth')) {
				goto('/onboarding/setup');
			}
			return;
		}

		// Handle tenant query loading
		if (tenantQuery.isLoading) {
			tenantStore.setLoading(true);
			return;
		}

		// If tenant data loaded, update store
		const tenantData = tenantQuery.data;
		if (tenantData) {
			tenantStore.setFullTenant(tenantData, tenantData.usage);
		} else if (sessionTenantId) {
			// Tenant query returned null but we have a session tenant - might be deleted
			console.error('Tenant not found for ID:', sessionTenantId);
			tenantStore.setNeedsOnboarding(true);
		} else if (!user) {
			// Not logged in - just show the page (landing, etc.)
			tenantStore.setLoading(false);
		}
	});

	// Sync user to Convex when logged in and tenant is ready
	$effect(() => {
		if (user && tenantStore.isInitialized && tenantStore.tenantId) {
			syncUser();
		}
	});

	async function syncUser() {
		if (!user || !tenantStore.tenantId) return;

		try {
			// Update last login for existing user
			const existingUser = await client.query(api.users.byWorkosId, {
				workosUserId: user.id
			});

			if (existingUser) {
				// User exists, just logged in - no action needed
				// Last login will be updated by the bootstrap.ensureUser mutation
			}
		} catch (error) {
			console.error('Failed to sync user:', error);
		}
	}
</script>

{#if tenantStore.isLoading}
	<div class="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
		<div class="text-center">
			<Spinner size="12" class="mb-4" />
			<p class="text-gray-600 dark:text-gray-400">Loading RouteWise...</p>
		</div>
	</div>
{:else}
	{@render children()}
{/if}
