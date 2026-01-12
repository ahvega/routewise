<script lang="ts">
	/**
	 * GroupLeaderModal Component
	 *
	 * Collects/confirms group leader contact info before generating itinerary.
	 * Used in the quotation-to-itinerary conversion flow.
	 */
	import { Modal, Label, Input, Button, Helper } from 'flowbite-svelte';
	import { UserOutline, PhoneOutline, EnvelopeOutline } from 'flowbite-svelte-icons';
	import { t } from '$lib/i18n';

	interface Props {
		open: boolean;
		initialName?: string;
		initialPhone?: string;
		initialEmail?: string;
		onConfirm: (data: { name: string; phone: string; email: string }) => void;
		onCancel: () => void;
	}

	let {
		open = $bindable(),
		initialName = '',
		initialPhone = '',
		initialEmail = '',
		onConfirm,
		onCancel
	}: Props = $props();

	let name = $state(initialName);
	let phone = $state(initialPhone);
	let email = $state(initialEmail);

	// Reset form when modal opens with new initial values
	$effect(() => {
		if (open) {
			name = initialName;
			phone = initialPhone;
			email = initialEmail;
		}
	});

	function handleConfirm() {
		if (name.trim()) {
			onConfirm({ name: name.trim(), phone: phone.trim(), email: email.trim() });
		}
	}

	function handleCancel() {
		onCancel();
	}
</script>

<Modal bind:open title={$t('itineraries.groupLeader.title')} size="md" outsideclose={false}>
	<div class="space-y-4">
		<p class="text-sm text-gray-600 dark:text-gray-400">
			{$t('itineraries.groupLeader.description')}
		</p>

		<div>
			<Label for="leader-name" class="flex items-center gap-1.5 mb-2">
				<UserOutline class="w-4 h-4" />
				{$t('itineraries.groupLeader.name')} *
			</Label>
			<Input
				id="leader-name"
				bind:value={name}
				placeholder="Juan Perez"
				required
			/>
			{#if !name.trim()}
				<Helper class="mt-1" color="red">{$t('common.required')}</Helper>
			{/if}
		</div>

		<div>
			<Label for="leader-phone" class="flex items-center gap-1.5 mb-2">
				<PhoneOutline class="w-4 h-4" />
				{$t('itineraries.groupLeader.phone')}
			</Label>
			<Input
				id="leader-phone"
				bind:value={phone}
				placeholder="+504 9999-9999"
				type="tel"
			/>
		</div>

		<div>
			<Label for="leader-email" class="flex items-center gap-1.5 mb-2">
				<EnvelopeOutline class="w-4 h-4" />
				{$t('itineraries.groupLeader.email')}
			</Label>
			<Input
				id="leader-email"
				bind:value={email}
				placeholder="juan@example.com"
				type="email"
			/>
		</div>
	</div>

	{#snippet footer()}
		<div class="flex justify-end gap-2">
			<Button color="alternative" onclick={handleCancel}>
				{$t('common.cancel')}
			</Button>
			<Button onclick={handleConfirm} disabled={!name.trim()}>
				{$t('common.confirm')}
			</Button>
		</div>
	{/snippet}
</Modal>
