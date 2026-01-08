<script lang="ts">
	import { useConvexClient, useQuery } from 'convex-svelte';
	import { api } from '$convex/_generated/api';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { Button, Card, Alert, Spinner } from 'flowbite-svelte';
	import {
		UsersOutline,
		CheckOutline,
		ExclamationCircleOutline,
		BuildingOutline
	} from 'flowbite-svelte-icons';
	import { t } from '$lib/i18n';

	let { data } = $props();

	const client = useConvexClient();

	// Get token from URL
	const token = $derived($page.url.searchParams.get('token') || '');

	// Query invitation details
	const invitationQuery = useQuery(api.invitations.byToken, () =>
		token ? { token } : 'skip'
	);

	let isAccepting = $state(false);
	let errorMessage = $state('');

	const invitation = $derived(invitationQuery.data);
	const isLoading = $derived(invitationQuery.isLoading);
	const isExpired = $derived(invitation && invitation.expiresAt < Date.now());
	const isAlreadyUsed = $derived(invitation && invitation.status !== 'pending');

	async function acceptInvitation() {
		if (isAccepting || !invitation || !data.user) return;

		isAccepting = true;
		errorMessage = '';

		try {
			const result = await client.mutation(api.invitations.accept, {
				token,
				workosUserId: data.user.id,
				fullName: [data.user.firstName, data.user.lastName].filter(Boolean).join(' ') || data.user.email,
				avatarUrl: undefined
			});

			// Update session with new tenant info
			const response = await fetch('/api/auth/update-session', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					tenantId: result.tenantId,
					tenantSlug: result.tenantSlug,
					tenantName: result.tenantName,
					needsOnboarding: false
				})
			});

			if (!response.ok) {
				throw new Error('Failed to update session');
			}

			// Redirect to dashboard
			goto('/');
		} catch (err) {
			console.error('Failed to accept invitation:', err);
			errorMessage = err instanceof Error ? err.message : 'Failed to accept invitation';
		} finally {
			isAccepting = false;
		}
	}
</script>

<svelte:head>
	<title>{$t('onboarding.acceptInvite.title')} | RouteWise</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center p-4">
	<Card size="md" class="w-full max-w-md">
		<div class="p-6 text-center">
			{#if isLoading}
				<div class="py-8">
					<Spinner size="12" class="mx-auto mb-4" />
					<p class="text-gray-600 dark:text-gray-400">{$t('common.loading')}</p>
				</div>
			{:else if !token}
				<div class="py-8">
					<ExclamationCircleOutline class="w-16 h-16 mx-auto mb-4 text-red-500" />
					<h2 class="text-xl font-bold text-gray-900 dark:text-white mb-2">
						{$t('onboarding.acceptInvite.invalidLink')}
					</h2>
					<p class="text-gray-600 dark:text-gray-400 mb-6">
						{$t('onboarding.acceptInvite.noToken')}
					</p>
					<Button color="blue" href="/">{$t('common.back')}</Button>
				</div>
			{:else if !invitation}
				<div class="py-8">
					<ExclamationCircleOutline class="w-16 h-16 mx-auto mb-4 text-red-500" />
					<h2 class="text-xl font-bold text-gray-900 dark:text-white mb-2">
						{$t('onboarding.acceptInvite.notFound')}
					</h2>
					<p class="text-gray-600 dark:text-gray-400 mb-6">
						{$t('onboarding.acceptInvite.notFoundDesc')}
					</p>
					<Button color="blue" href="/">{$t('common.back')}</Button>
				</div>
			{:else if isExpired}
				<div class="py-8">
					<ExclamationCircleOutline class="w-16 h-16 mx-auto mb-4 text-yellow-500" />
					<h2 class="text-xl font-bold text-gray-900 dark:text-white mb-2">
						{$t('onboarding.acceptInvite.expired')}
					</h2>
					<p class="text-gray-600 dark:text-gray-400 mb-6">
						{$t('onboarding.acceptInvite.expiredDesc')}
					</p>
					<Button color="blue" href="/">{$t('common.back')}</Button>
				</div>
			{:else if isAlreadyUsed}
				<div class="py-8">
					<CheckOutline class="w-16 h-16 mx-auto mb-4 text-green-500" />
					<h2 class="text-xl font-bold text-gray-900 dark:text-white mb-2">
						{$t('onboarding.acceptInvite.alreadyUsed')}
					</h2>
					<p class="text-gray-600 dark:text-gray-400 mb-6">
						{$t('onboarding.acceptInvite.alreadyUsedDesc')}
					</p>
					<Button color="blue" href="/">{$t('onboarding.acceptInvite.goToDashboard')}</Button>
				</div>
			{:else}
				<!-- Valid invitation -->
				<div class="py-4">
					<div class="flex justify-center mb-6">
						<div class="p-4 bg-primary-100 dark:bg-primary-900 rounded-full">
							<UsersOutline class="w-12 h-12 text-primary-600 dark:text-primary-400" />
						</div>
					</div>

					<h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
						{$t('onboarding.acceptInvite.youveBeenInvited')}
					</h2>

					<p class="text-gray-600 dark:text-gray-400 mb-6">
						<span class="font-medium">{invitation.inviterName}</span>
						{$t('onboarding.acceptInvite.hasInvitedYou')}
					</p>

					<div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6">
						<div class="flex items-center justify-center gap-2 mb-2">
							<BuildingOutline class="w-5 h-5 text-gray-500" />
							<span class="font-semibold text-gray-900 dark:text-white">
								{invitation.tenantName}
							</span>
						</div>
						<p class="text-sm text-gray-500">
							{$t('onboarding.acceptInvite.role')}: <span class="capitalize">{invitation.role}</span>
						</p>
					</div>

					{#if errorMessage}
						<Alert color="red" class="mb-4 text-left">
							{errorMessage}
						</Alert>
					{/if}

					<div class="space-y-3">
						<Button
							color="blue"
							class="w-full"
							onclick={acceptInvitation}
							disabled={isAccepting}
						>
							{#if isAccepting}
								<Spinner size="4" class="mr-2" />
								{$t('onboarding.acceptInvite.joining')}
							{:else}
								<CheckOutline class="w-4 h-4 mr-2" />
								{$t('onboarding.acceptInvite.acceptAndJoin')}
							{/if}
						</Button>

						<p class="text-xs text-gray-500">
							{$t('onboarding.acceptInvite.signedInAs')} <span class="font-medium">{data.user?.email}</span>
						</p>
					</div>
				</div>
			{/if}
		</div>
	</Card>
</div>
