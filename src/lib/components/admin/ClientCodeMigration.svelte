<script lang="ts">
	import { Button, Alert, Spinner, Badge, Card } from 'flowbite-svelte';
	import { CheckCircleOutline, ExclamationCircleOutline, RefreshOutline } from 'flowbite-svelte-icons';
	import { useQuery, useConvexClient } from 'convex-svelte';
	import { api } from '$convex/_generated/api';
	import type { Id } from '$convex/_generated/dataModel';

	interface Props {
		tenantId: Id<'tenants'>;
	}

	let { tenantId }: Props = $props();

	const client = useConvexClient();

	// Query clients without codes
	const clientsWithoutCodeQuery = useQuery(
		api.clients.getClientsWithoutCode,
		() => ({ tenantId })
	);

	// State
	let migrating = $state(false);
	let migrationResult = $state<{
		total: number;
		migrated: number;
		results: Array<{ id: string; name: string; code: string }>;
	} | null>(null);
	let error = $state<string | null>(null);

	// Derived
	const pendingCount = $derived(clientsWithoutCodeQuery.data?.length ?? 0);

	async function runMigration() {
		migrating = true;
		error = null;
		try {
			const result = await client.mutation(api.clients.runClientCodeMigration, { tenantId });
			migrationResult = result;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Error al migrar';
		} finally {
			migrating = false;
		}
	}

	function reset() {
		migrationResult = null;
		error = null;
	}
</script>

<Card class="max-w-xl">
	<h5 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
		Migrar Codigos de Clientes
	</h5>

	{#if migrationResult}
		<!-- Migration completed -->
		<Alert color="green" class="mb-4">
			<CheckCircleOutline slot="icon" class="w-5 h-5" />
			<span class="font-medium">Migracion completada</span>
			<p class="mt-1 text-sm">
				{migrationResult.migrated} de {migrationResult.total} clientes actualizados.
			</p>
		</Alert>

		{#if migrationResult.results.length > 0}
			<div class="max-h-48 overflow-y-auto mb-4">
				<table class="w-full text-sm text-left text-gray-500 dark:text-gray-400">
					<thead class="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
						<tr>
							<th class="px-3 py-2">Cliente</th>
							<th class="px-3 py-2">Codigo</th>
						</tr>
					</thead>
					<tbody>
						{#each migrationResult.results as item}
							<tr class="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
								<td class="px-3 py-2">{item.name}</td>
								<td class="px-3 py-2">
									<Badge color="green" class="font-mono">{item.code}</Badge>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}

		<Button color="alternative" size="sm" onclick={reset}>
			<RefreshOutline class="w-4 h-4 mr-2" />
			Verificar de nuevo
		</Button>
	{:else if error}
		<!-- Error state -->
		<Alert color="red" class="mb-4">
			<ExclamationCircleOutline slot="icon" class="w-5 h-5" />
			<span class="font-medium">Error</span>
			<p class="mt-1 text-sm">{error}</p>
		</Alert>
		<Button color="alternative" size="sm" onclick={reset}>
			Intentar de nuevo
		</Button>
	{:else if clientsWithoutCodeQuery.isLoading}
		<!-- Loading -->
		<div class="flex items-center gap-2 text-gray-500">
			<Spinner size="4" />
			<span>Verificando clientes...</span>
		</div>
	{:else if pendingCount > 0}
		<!-- Clients need migration -->
		<Alert color="yellow" class="mb-4">
			<ExclamationCircleOutline slot="icon" class="w-5 h-5" />
			<span class="font-medium">{pendingCount} clientes sin codigo</span>
			<p class="mt-1 text-sm">
				Estos clientes no tienen un codigo asignado para el sistema de numeracion de cotizaciones.
			</p>
		</Alert>

		<p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
			Se generaran codigos de 4 letras automaticamente basados en el nombre de cada cliente.
		</p>

		<Button color="primary" onclick={runMigration} disabled={migrating}>
			{#if migrating}
				<Spinner size="4" class="mr-2" />
				Migrando...
			{:else}
				<RefreshOutline class="w-4 h-4 mr-2" />
				Generar Codigos
			{/if}
		</Button>
	{:else}
		<!-- All good -->
		<Alert color="green">
			<CheckCircleOutline slot="icon" class="w-5 h-5" />
			<span class="font-medium">Todos los clientes tienen codigo</span>
			<p class="mt-1 text-sm">
				No hay clientes pendientes de migracion.
			</p>
		</Alert>
	{/if}
</Card>
