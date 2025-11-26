<script lang="ts">
	import { useConvexClient, useQuery } from 'convex-svelte';
	import { api } from '$convex/_generated/api';
	import { tenantStore } from '$lib/stores';
	import { Spinner } from 'flowbite-svelte';

	let { children, user } = $props<{
		children: any;
		user?: { id: string; email: string; firstName: string | null; lastName: string | null } | null;
	}>();

	const client = useConvexClient();

	// Query for default tenant
	const tenantQuery = useQuery(api.bootstrap.getDefaultTenant, {});

	// Bootstrap tenant when query resolves
	$effect(() => {
		const tenant = tenantQuery.data;

		if (tenantQuery.isLoading) {
			tenantStore.setLoading(true);
			return;
		}

		if (tenant) {
			// Tenant exists, set it in store
			tenantStore.setTenant(tenant._id, tenant.companyName);
		} else {
			// No tenant, create one
			bootstrapTenant();
		}
	});

	async function bootstrapTenant() {
		try {
			const tenantId = await client.mutation(api.bootstrap.getOrCreateDefaultTenant, {});

			// Seed sample data for new tenant
			await client.mutation(api.bootstrap.seedSampleData, { tenantId });

			// Refetch tenant info
			const tenant = await client.query(api.tenants.get, { id: tenantId });
			if (tenant) {
				tenantStore.setTenant(tenant._id, tenant.companyName);
			}
		} catch (error) {
			console.error('Failed to bootstrap tenant:', error);
			tenantStore.setLoading(false);
		}
	}

	// Also ensure user is synced to Convex when logged in
	$effect(() => {
		if (user && tenantStore.isInitialized) {
			syncUser();
		}
	});

	async function syncUser() {
		if (!user) return;

		try {
			await client.mutation(api.bootstrap.ensureUser, {
				workosUserId: user.id,
				email: user.email,
				fullName: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email,
			});
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
