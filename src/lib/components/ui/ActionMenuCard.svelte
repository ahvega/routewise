<script lang="ts">
	/**
	 * ActionMenuCard - Smaller kebab menu variant for cards
	 *
	 * Use this in detail page sidebars where entities are displayed as cards.
	 * Position this component in the top-right corner of the card.
	 *
	 * Usage:
	 * ```svelte
	 * <Card class="relative">
	 *   <ActionMenuCard
	 *     triggerId="card-actions-{item._id}"
	 *     actions={[...]}
	 *     class="absolute top-2 right-2"
	 *   />
	 *   <!-- Card content -->
	 * </Card>
	 * ```
	 */

	import { Button, Dropdown, DropdownItem, DropdownDivider } from 'flowbite-svelte';
	import { DotsVerticalOutline } from 'flowbite-svelte-icons';
	import type { ActionItem } from '$lib/types/actions';
	import type { ComponentType } from 'svelte';

	interface Props {
		/** Array of action items to display */
		actions: ActionItem[];
		/** Unique ID for the trigger button */
		triggerId: string;
		/** Additional classes for positioning */
		class?: string;
	}

	let { actions, triggerId, class: className = '' }: Props = $props();

	// Filter visible actions
	const visibleActions = $derived(actions.filter((a) => a.show !== false));

	// Get color class for action
	function getColorClass(color?: string): string {
		switch (color) {
			case 'danger':
				return 'text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20';
			case 'success':
				return 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20';
			case 'warning':
				return 'text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20';
			default:
				return 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700';
		}
	}

	// Get icon color class
	function getIconColorClass(color?: string): string {
		switch (color) {
			case 'danger':
				return 'text-red-500 dark:text-red-400';
			case 'success':
				return 'text-green-600 dark:text-green-400';
			case 'warning':
				return 'text-yellow-600 dark:text-yellow-400';
			default:
				return 'text-primary-500 dark:text-primary-400';
		}
	}
</script>

<div class={className}>
	<Button size="xs" color="light" id={triggerId} class="!p-1 opacity-70 hover:opacity-100">
		<DotsVerticalOutline class="w-3.5 h-3.5" />
	</Button>

	<Dropdown
		triggeredBy="#{triggerId}"
		class="w-44 dark:bg-gray-800 dark:border-gray-700 shadow-lg rounded-lg overflow-hidden z-50"
		placement="bottom-end"
	>
		{#each visibleActions as action, index}
			{#if action.dividerBefore && index > 0}
				<DropdownDivider class="my-1" />
			{/if}

			{#if action.href}
				<DropdownItem
					href={action.href}
					class="flex items-center gap-2 px-3 py-1.5 text-xs {getColorClass(action.color)} {action.disabled ? 'opacity-50 cursor-not-allowed' : ''}"
				>
					{#if action.icon}
						{@const IconComponent = action.icon as ComponentType}
						<IconComponent class="w-3.5 h-3.5 {getIconColorClass(action.color)}" />
					{/if}
					<span>{action.label}</span>
				</DropdownItem>
			{:else if action.onClick}
				<DropdownItem
					onclick={action.onClick}
					disabled={action.disabled}
					class="flex items-center gap-2 px-3 py-1.5 text-xs {getColorClass(action.color)} {action.disabled ? 'opacity-50 cursor-not-allowed' : ''}"
				>
					{#if action.icon}
						{@const IconComponent = action.icon as ComponentType}
						<IconComponent class="w-3.5 h-3.5 {getIconColorClass(action.color)}" />
					{/if}
					<span>{action.label}</span>
				</DropdownItem>
			{/if}
		{/each}
	</Dropdown>
</div>
