<script lang="ts">
	import { useConvexClient, useQuery } from 'convex-svelte';
	import { api } from '$convex/_generated/api';
	import { tenantStore } from '$lib/stores';
	import { t } from '$lib/i18n';

	// Type definitions for team data
	interface TeamUser {
		_id: string;
		email: string;
		fullName?: string;
		role: string;
		status?: string;
		avatarUrl?: string;
	}
	interface SalesAgentData {
		userId: string;
		initials: string;
		isDefault?: boolean;
		name?: string;
		email?: string;
		avatarUrl?: string;
	}
	import {
		Card,
		Button,
		Badge,
		Spinner,
		Alert,
		Table,
		TableHead,
		TableBody,
		TableBodyRow,
		TableBodyCell,
		TableHeadCell,
		Modal,
		Label,
		Input,
		Select,
		Toast,
		Avatar,
		Toggle
	} from 'flowbite-svelte';
	import {
		UsersOutline,
		PlusOutline,
		TrashBinOutline,
		EnvelopeOutline,
		CheckCircleOutline,
		CloseCircleOutline,
		ClockOutline,
		RefreshOutline,
		UserOutline,
		BriefcaseOutline
	} from 'flowbite-svelte-icons';
	import {
		ActionMenu,
		createEmailAction,
		createDeleteAction,
		filterActions,
		type ActionItem
	} from '$lib/components/ui';

	let { data } = $props();
	const client = useConvexClient();

	// Query team members
	const usersQuery = useQuery(
		api.users.list,
		() => (tenantStore.tenantId ? { tenantId: tenantStore.tenantId } : 'skip')
	);

	// Query pending invitations
	const invitationsQuery = useQuery(
		api.invitations.listPending,
		() => (tenantStore.tenantId ? { tenantId: tenantStore.tenantId } : 'skip')
	);

	// Query tenant for limits
	const tenantQuery = useQuery(
		api.tenants.get,
		() => (tenantStore.tenantId ? { id: tenantStore.tenantId } : 'skip')
	);

	// Query sales agents
	const salesAgentsQuery = useQuery(
		api.tenants.getSalesAgents,
		() => (tenantStore.tenantId ? { tenantId: tenantStore.tenantId } : 'skip')
	);

	// Derived values
	const users = $derived(usersQuery.data || []);
	const invitations = $derived(invitationsQuery.data || []);
	const tenant = $derived(tenantQuery.data);
	const salesAgents = $derived(salesAgentsQuery.data || []);
	const isLoading = $derived(usersQuery.isLoading);

	// Get users who are not yet sales agents
	const availableForSalesAgent = $derived(
		users.filter((u: TeamUser) => !salesAgents.some((a: SalesAgentData) => a.userId === u._id))
	);

	// Check if can invite more users
	const canInvite = $derived(() => {
		if (!tenant) return false;
		const maxUsers = tenant.maxUsers ?? -1;
		if (maxUsers === -1) return true;
		const currentCount = users.length + invitations.length;
		return currentCount < maxUsers;
	});

	// Modal state
	let showInviteModal = $state(false);
	let inviteEmail = $state('');
	let inviteRole = $state('user');
	let isInviting = $state(false);

	// Sales agent modal state
	let showAddAgentModal = $state(false);
	let selectedUserId = $state('');
	let agentInitials = $state('');
	let isAddingAgent = $state(false);
	let isRemovingAgent = $state<string | null>(null);
	let isUpdatingDefault = $state(false);

	// Toast state
	let showToast = $state(false);
	let toastMessage = $state('');
	let toastType = $state<'success' | 'error'>('success');

	function showToastMessage(message: string, type: 'success' | 'error') {
		toastMessage = message;
		toastType = type;
		showToast = true;
		setTimeout(() => (showToast = false), 3000);
	}

	async function handleInvite() {
		if (!tenantStore.tenantId || !data.user || !inviteEmail.trim()) return;

		isInviting = true;
		try {
			// Note: invitedBy expects a Convex user ID - using data.user.id (WorkOS ID) as fallback
			await client.mutation(api.invitations.create, {
				tenantId: tenantStore.tenantId,
				email: inviteEmail.trim().toLowerCase(),
				role: inviteRole,
				invitedBy: data.user.id as any
			});

			showToastMessage($t('settings.team.inviteSent'), 'success');
			showInviteModal = false;
			inviteEmail = '';
			inviteRole = 'user';
		} catch (err) {
			console.error('Failed to send invitation:', err);
			showToastMessage(err instanceof Error ? err.message : $t('settings.team.inviteFailed'), 'error');
		} finally {
			isInviting = false;
		}
	}

	async function handleCancelInvitation(invitationId: string) {
		if (!confirm($t('settings.team.confirmCancelInvite'))) return;

		try {
			await client.mutation(api.invitations.cancel, { id: invitationId as any });
			showToastMessage($t('settings.team.inviteCancelled'), 'success');
		} catch (err) {
			console.error('Failed to cancel invitation:', err);
			showToastMessage($t('settings.team.cancelFailed'), 'error');
		}
	}

	async function handleResendInvitation(invitationId: string) {
		try {
			await client.mutation(api.invitations.resend, { id: invitationId as any });
			showToastMessage($t('settings.team.inviteResent'), 'success');
		} catch (err) {
			console.error('Failed to resend invitation:', err);
			showToastMessage($t('settings.team.resendFailed'), 'error');
		}
	}

	async function handleRemoveUser(userId: string) {
		if (!confirm($t('settings.team.confirmRemoveUser'))) return;

		try {
			await client.mutation(api.users.remove, { id: userId as any });
			showToastMessage($t('settings.team.userRemoved'), 'success');
		} catch (err) {
			console.error('Failed to remove user:', err);
			showToastMessage(err instanceof Error ? err.message : $t('settings.team.removeFailed'), 'error');
		}
	}

	// Generate initials from name
	function generateInitials(name: string): string {
		const words = name.trim().split(/\s+/);
		if (words.length === 1) {
			return words[0].substring(0, 2).toUpperCase();
		}
		return (words[0][0] + words[words.length - 1][0]).toUpperCase();
	}

	// Handle user selection for sales agent
	function handleUserSelect() {
		if (selectedUserId) {
			const user = users.find((u: TeamUser) => u._id === selectedUserId);
			if (user && user.fullName) {
				agentInitials = generateInitials(user.fullName);
			}
		}
	}

	async function handleAddSalesAgent() {
		if (!tenantStore.tenantId || !selectedUserId || !agentInitials.trim()) return;

		isAddingAgent = true;
		try {
			await client.mutation(api.tenants.addSalesAgent, {
				tenantId: tenantStore.tenantId,
				userId: selectedUserId as any,
				initials: agentInitials.trim().toUpperCase(),
				isDefault: salesAgents.length === 0 // First agent is default
			});

			showToastMessage('Agente de ventas agregado', 'success');
			showAddAgentModal = false;
			selectedUserId = '';
			agentInitials = '';
		} catch (err) {
			console.error('Failed to add sales agent:', err);
			showToastMessage(err instanceof Error ? err.message : 'Error al agregar agente', 'error');
		} finally {
			isAddingAgent = false;
		}
	}

	async function handleRemoveSalesAgent(userId: string) {
		if (!tenantStore.tenantId) return;
		if (!confirm('¿Eliminar este agente de ventas?')) return;

		isRemovingAgent = userId;
		try {
			await client.mutation(api.tenants.removeSalesAgent, {
				tenantId: tenantStore.tenantId,
				userId: userId as any
			});
			showToastMessage('Agente eliminado', 'success');
		} catch (err) {
			console.error('Failed to remove sales agent:', err);
			showToastMessage('Error al eliminar agente', 'error');
		} finally {
			isRemovingAgent = null;
		}
	}

	async function handleSetDefaultAgent(userId: string) {
		if (!tenantStore.tenantId) return;

		isUpdatingDefault = true;
		try {
			// Update all agents: set selected as default, others as non-default
			const updatedAgents = salesAgents.map((a: SalesAgentData) => ({
				userId: a.userId as any,
				initials: a.initials,
				isDefault: a.userId === userId
			}));

			await client.mutation(api.tenants.updateSalesAgents, {
				tenantId: tenantStore.tenantId,
				salesAgents: updatedAgents
			});

			showToastMessage('Agente predeterminado actualizado', 'success');
		} catch (err) {
			console.error('Failed to update default agent:', err);
			showToastMessage('Error al actualizar agente predeterminado', 'error');
		} finally {
			isUpdatingDefault = false;
		}
	}

	function formatDate(timestamp: number): string {
		return new Date(timestamp).toLocaleDateString('es-HN', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	function getRoleBadgeColor(role: string): 'blue' | 'green' | 'yellow' | 'red' {
		switch (role) {
			case 'admin':
				return 'red';
			case 'manager':
				return 'yellow';
			case 'user':
				return 'blue';
			default:
				return 'blue';
		}
	}

	// Check if user can be removed (not self, not last admin)
	function canRemoveUser(user: typeof users[0]): boolean {
		if (user.role !== 'admin') return true;
		return users.filter((u: TeamUser) => u.role === 'admin').length > 1;
	}

	// Build actions for a user row
	function getUserActions(user: typeof users[0]): ActionItem[] {
		return filterActions([
			// Email action
			createEmailAction(user.email, $t('common.email')),

			// Remove action (only if allowed)
			canRemoveUser(user)
				? createDeleteAction(() => handleRemoveUser(user._id), false, $t('settings.team.removeUser'))
				: null
		]);
	}
</script>

<svelte:head>
	<title>{$t('settings.team.title')} | RouteWise</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex justify-between items-center">
		<div>
			<h1 class="text-3xl font-bold text-gray-900 dark:text-white">{$t('settings.team.title')}</h1>
			<p class="text-gray-600 dark:text-gray-400 mt-1">{$t('settings.team.subtitle')}</p>
		</div>
		<div class="flex gap-2">
			<Button href="/settings" color="light">
				{$t('common.back')}
			</Button>
			<Button color="blue" onclick={() => (showInviteModal = true)} disabled={!canInvite()}>
				<PlusOutline class="w-4 h-4 mr-2" />
				{$t('settings.team.inviteMember')}
			</Button>
		</div>
	</div>

	{#if !canInvite() && tenant}
		<Alert color="yellow" border class="bg-yellow-50 dark:bg-yellow-900/30">
			{#snippet icon()}
				<UsersOutline class="w-5 h-5" />
			{/snippet}
			<span class="font-semibold">{$t('settings.team.userLimitReached')}</span>
			<span class="ml-1">{$t('settings.team.upgradeToAddMore')}</span>
			<Button size="xs" class="ml-3 !bg-amber-700 hover:!bg-amber-800 !text-white" href="/settings/billing">
				{$t('settings.billing.upgrade')}
			</Button>
		</Alert>
	{/if}

	{#if isLoading}
		<div class="flex justify-center py-12">
			<Spinner size="8" />
		</div>
	{:else}
		<!-- Team Members -->
		<Card class="max-w-none !p-6">
			<div class="flex items-center justify-between mb-4">
				<div class="flex items-center gap-2">
					<UsersOutline class="w-5 h-5 text-gray-500" />
					<h3 class="text-lg font-semibold text-gray-900 dark:text-white">
						{$t('settings.team.members')}
						<span class="text-gray-500 font-normal">({users.length})</span>
					</h3>
				</div>
				{#if tenant}
					<Badge color="blue">
						{users.length} / {tenant.maxUsers === -1 ? $t('settings.billing.unlimited') : tenant.maxUsers} {$t('settings.team.seats')}
					</Badge>
				{/if}
			</div>

			{#if users.length === 0}
				<p class="text-gray-500 dark:text-gray-400 text-center py-8">
					{$t('settings.team.noMembers')}
				</p>
			{:else}
				<Table striped>
					<TableHead>
						<TableHeadCell>{$t('settings.team.member')}</TableHeadCell>
						<TableHeadCell>{$t('settings.team.role')}</TableHeadCell>
						<TableHeadCell>{$t('settings.team.status')}</TableHeadCell>
						<TableHeadCell>{$t('settings.team.joined')}</TableHeadCell>
					</TableHead>
					<TableBody>
						{#each users as user}
							<TableBodyRow>
								<TableBodyCell>
									<div class="flex items-center justify-between gap-2">
										<div class="flex items-center gap-3">
											{#if user.avatarUrl}
												<Avatar src={user.avatarUrl} size="sm" />
											{:else}
												<Avatar size="sm">
													<UserOutline class="w-4 h-4" />
												</Avatar>
											{/if}
											<div>
												<p class="font-medium text-gray-900 dark:text-white">{user.fullName}</p>
												<p class="text-sm text-gray-500">{user.email}</p>
											</div>
										</div>
										<ActionMenu
											triggerId="actions-{user._id}"
											actions={getUserActions(user)}
										/>
									</div>
								</TableBodyCell>
								<TableBodyCell>
									<Badge color={getRoleBadgeColor(user.role)}>
										{$t(`settings.team.roles.${user.role}`)}
									</Badge>
								</TableBodyCell>
								<TableBodyCell>
									<Badge color={user.status === 'active' ? 'green' : 'yellow'}>
										{$t(`statuses.${user.status}`)}
									</Badge>
								</TableBodyCell>
								<TableBodyCell>
									{formatDate(user.createdAt)}
								</TableBodyCell>
							</TableBodyRow>
						{/each}
					</TableBody>
				</Table>
			{/if}
		</Card>

		<!-- Sales Agents Configuration -->
		<Card class="max-w-none !p-6">
			<div class="flex items-center justify-between mb-4">
				<div class="flex items-center gap-2">
					<BriefcaseOutline class="w-5 h-5 text-gray-500" />
					<h3 class="text-lg font-semibold text-gray-900 dark:text-white">
						Agentes de Ventas
						<span class="text-gray-500 font-normal">({salesAgents.length})</span>
					</h3>
				</div>
				<Button
					size="sm"
					color="light"
					onclick={() => (showAddAgentModal = true)}
					disabled={availableForSalesAgent.length === 0}
				>
					<PlusOutline class="w-4 h-4 mr-2" />
					Agregar Agente
				</Button>
			</div>

			<p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
				Los agentes de ventas aparecen como opción al crear cotizaciones. Sus iniciales se muestran en los documentos PDF.
			</p>

			{#if salesAgents.length === 0}
				<div class="text-center py-8 text-gray-500 dark:text-gray-400">
					<BriefcaseOutline class="w-12 h-12 mx-auto mb-3 opacity-50" />
					<p>No hay agentes de ventas configurados</p>
					<p class="text-sm">Agrega miembros del equipo como agentes de ventas</p>
				</div>
			{:else}
				<Table striped>
					<TableHead>
						<TableHeadCell>Agente</TableHeadCell>
						<TableHeadCell>Iniciales</TableHeadCell>
						<TableHeadCell>Predeterminado</TableHeadCell>
						<TableHeadCell class="text-right">Acciones</TableHeadCell>
					</TableHead>
					<TableBody>
						{#each salesAgents as agent}
							<TableBodyRow>
								<TableBodyCell>
									<div class="flex items-center gap-3">
										{#if agent.avatarUrl}
											<Avatar src={agent.avatarUrl} size="sm" />
										{:else}
											<Avatar size="sm">
												<UserOutline class="w-4 h-4" />
											</Avatar>
										{/if}
										<div>
											<p class="font-medium text-gray-900 dark:text-white">{agent.name}</p>
											<p class="text-sm text-gray-500">{agent.email}</p>
										</div>
									</div>
								</TableBodyCell>
								<TableBodyCell>
									<Badge color="blue" class="font-mono text-lg">
										{agent.initials}
									</Badge>
								</TableBodyCell>
								<TableBodyCell>
									<Toggle
										checked={agent.isDefault}
										disabled={isUpdatingDefault || agent.isDefault}
										onchange={() => handleSetDefaultAgent(agent.userId)}
									/>
								</TableBodyCell>
								<TableBodyCell class="text-right">
									<Button
										size="xs"
										color="red"
										outline
										disabled={isRemovingAgent === agent.userId}
										onclick={() => handleRemoveSalesAgent(agent.userId)}
									>
										{#if isRemovingAgent === agent.userId}
											<Spinner size="4" />
										{:else}
											<TrashBinOutline class="w-4 h-4" />
										{/if}
									</Button>
								</TableBodyCell>
							</TableBodyRow>
						{/each}
					</TableBody>
				</Table>
			{/if}
		</Card>

		<!-- Pending Invitations -->
		{#if invitations.length > 0}
			<Card class="max-w-none !p-6">
				<div class="flex items-center gap-2 mb-4">
					<EnvelopeOutline class="w-5 h-5 text-gray-500" />
					<h3 class="text-lg font-semibold text-gray-900 dark:text-white">
						{$t('settings.team.pendingInvitations')}
						<span class="text-gray-500 font-normal">({invitations.length})</span>
					</h3>
				</div>

				<Table striped>
					<TableHead>
						<TableHeadCell>{$t('settings.team.email')}</TableHeadCell>
						<TableHeadCell>{$t('settings.team.role')}</TableHeadCell>
						<TableHeadCell>{$t('settings.team.sentAt')}</TableHeadCell>
						<TableHeadCell>{$t('settings.team.expiresAt')}</TableHeadCell>
						<TableHeadCell class="text-right">{$t('common.actions')}</TableHeadCell>
					</TableHead>
					<TableBody>
						{#each invitations as invitation}
							<TableBodyRow>
								<TableBodyCell>
									<div class="flex items-center gap-2">
										<ClockOutline class="w-4 h-4 text-yellow-500" />
										{invitation.email}
									</div>
								</TableBodyCell>
								<TableBodyCell>
									<Badge color={getRoleBadgeColor(invitation.role)}>
										{$t(`settings.team.roles.${invitation.role}`)}
									</Badge>
								</TableBodyCell>
								<TableBodyCell>
									{formatDate(invitation.createdAt)}
								</TableBodyCell>
								<TableBodyCell>
									{formatDate(invitation.expiresAt)}
								</TableBodyCell>
								<TableBodyCell class="text-right">
									<div class="flex justify-end gap-2">
										<Button
											size="xs"
											color="light"
											onclick={() => handleResendInvitation(invitation._id)}
											title={$t('settings.team.resendInvite')}
										>
											<RefreshOutline class="w-4 h-4" />
										</Button>
										<Button
											size="xs"
											color="red"
											outline
											onclick={() => handleCancelInvitation(invitation._id)}
											title={$t('settings.team.cancelInvite')}
										>
											<TrashBinOutline class="w-4 h-4" />
										</Button>
									</div>
								</TableBodyCell>
							</TableBodyRow>
						{/each}
					</TableBody>
				</Table>
			</Card>
		{/if}
	{/if}
</div>

<!-- Invite Modal -->
<Modal bind:open={showInviteModal} size="sm" title={$t('settings.team.inviteMember')}>
	<form onsubmit={(e) => { e.preventDefault(); handleInvite(); }}>
		<div class="space-y-4">
			<div>
				<Label for="inviteEmail">{$t('settings.team.email')}</Label>
				<Input
					id="inviteEmail"
					type="email"
					bind:value={inviteEmail}
					placeholder="colleague@company.com"
					required
				/>
			</div>

			<div>
				<Label for="inviteRole">{$t('settings.team.role')}</Label>
				<Select id="inviteRole" bind:value={inviteRole}>
					<option value="user">{$t('settings.team.roles.user')}</option>
					<option value="manager">{$t('settings.team.roles.manager')}</option>
					<option value="admin">{$t('settings.team.roles.admin')}</option>
				</Select>
			</div>

			<p class="text-sm text-gray-500">
				{$t('settings.team.inviteNote')}
			</p>
		</div>
	</form>

	{#snippet footer()}
		<Button color="light" onclick={() => (showInviteModal = false)}>
			{$t('common.cancel')}
		</Button>
		<Button color="blue" onclick={handleInvite} disabled={isInviting || !inviteEmail.trim()}>
			{#if isInviting}
				<Spinner size="4" class="mr-2" />
			{/if}
			<EnvelopeOutline class="w-4 h-4 mr-2" />
			{$t('settings.team.sendInvite')}
		</Button>
	{/snippet}
</Modal>

<!-- Add Sales Agent Modal -->
<Modal bind:open={showAddAgentModal} size="sm" title="Agregar Agente de Ventas">
	<div class="space-y-4">
		<div>
			<Label for="selectUser">Seleccionar Miembro</Label>
			<Select id="selectUser" bind:value={selectedUserId} onchange={handleUserSelect}>
				<option value="">-- Seleccionar --</option>
				{#each availableForSalesAgent as user}
					<option value={user._id}>{user.fullName} ({user.email})</option>
				{/each}
			</Select>
		</div>

		<div>
			<Label for="agentInitials">Iniciales (2-3 caracteres)</Label>
			<Input
				id="agentInitials"
				bind:value={agentInitials}
				placeholder="Ej: AH, JM"
				maxlength={3}
				class="uppercase font-mono"
			/>
			<p class="text-xs text-gray-500 mt-1">
				Las iniciales se muestran en cotizaciones y documentos PDF
			</p>
		</div>
	</div>

	{#snippet footer()}
		<Button color="light" onclick={() => { showAddAgentModal = false; selectedUserId = ''; agentInitials = ''; }}>
			Cancelar
		</Button>
		<Button
			color="blue"
			onclick={handleAddSalesAgent}
			disabled={isAddingAgent || !selectedUserId || !agentInitials.trim()}
		>
			{#if isAddingAgent}
				<Spinner size="4" class="mr-2" />
			{/if}
			<PlusOutline class="w-4 h-4 mr-2" />
			Agregar Agente
		</Button>
	{/snippet}
</Modal>

<!-- Toast notifications -->
{#if showToast}
	<Toast class="fixed bottom-4 right-4" color={toastType === 'success' ? 'green' : 'red'}>
		{#snippet icon()}
			{#if toastType === 'success'}
				<CheckCircleOutline class="w-5 h-5" />
			{:else}
				<CloseCircleOutline class="w-5 h-5" />
			{/if}
		{/snippet}
		{toastMessage}
	</Toast>
{/if}
