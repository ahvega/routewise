<script lang="ts">
	import { useConvexClient, useQuery } from 'convex-svelte';
	import { api } from '$convex/_generated/api';
	import { tenantStore } from '$lib/stores';
	import { t } from '$lib/i18n';
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
		Avatar
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
		UserOutline
	} from 'flowbite-svelte-icons';

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

	// Derived values
	const users = $derived(usersQuery.data || []);
	const invitations = $derived(invitationsQuery.data || []);
	const tenant = $derived(tenantQuery.data);
	const isLoading = $derived(usersQuery.isLoading);

	// Check if can invite more users
	const canInvite = $derived(() => {
		if (!tenant) return false;
		if (tenant.maxUsers === -1) return true;
		const currentCount = users.length + invitations.length;
		return currentCount < tenant.maxUsers;
	});

	// Modal state
	let showInviteModal = $state(false);
	let inviteEmail = $state('');
	let inviteRole = $state('user');
	let isInviting = $state(false);

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
			await client.mutation(api.invitations.create, {
				tenantId: tenantStore.tenantId,
				email: inviteEmail.trim().toLowerCase(),
				role: inviteRole,
				invitedByUserId: data.user.convexUserId
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
			await client.mutation(api.invitations.cancel, { invitationId: invitationId as any });
			showToastMessage($t('settings.team.inviteCancelled'), 'success');
		} catch (err) {
			console.error('Failed to cancel invitation:', err);
			showToastMessage($t('settings.team.cancelFailed'), 'error');
		}
	}

	async function handleResendInvitation(invitationId: string) {
		try {
			await client.mutation(api.invitations.resend, { invitationId: invitationId as any });
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
		<Card class="max-w-none">
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
						<TableHeadCell class="text-right">{$t('common.actions')}</TableHeadCell>
					</TableHead>
					<TableBody>
						{#each users as user}
							<TableBodyRow>
								<TableBodyCell>
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
								<TableBodyCell class="text-right">
									{#if user.role !== 'admin' || users.filter(u => u.role === 'admin').length > 1}
										<Button
											size="xs"
											color="red"
											outline
											onclick={() => handleRemoveUser(user._id)}
											title={$t('settings.team.removeUser')}
										>
											<TrashBinOutline class="w-4 h-4" />
										</Button>
									{/if}
								</TableBodyCell>
							</TableBodyRow>
						{/each}
					</TableBody>
				</Table>
			{/if}
		</Card>

		<!-- Pending Invitations -->
		{#if invitations.length > 0}
			<Card class="max-w-none">
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
