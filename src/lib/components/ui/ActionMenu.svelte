<script lang="ts">
	/**
	 * ActionMenu - Standardized kebab menu (3-dots) for data tables
	 *
	 * Usage:
	 * ```svelte
	 * <ActionMenu
	 *   triggerId="actions-{item._id}"
	 *   actions={[
	 *     createViewAction(`/items/${item._id}`),
	 *     createCallAction(item.phone),
	 *     createDeleteAction(() => handleDelete(item._id))
	 *   ]}
	 * />
	 * ```
	 */

	import { Button, Dropdown, DropdownItem, DropdownDivider } from 'flowbite-svelte';
	import { DotsHorizontalOutline } from 'flowbite-svelte-icons';
	import type { ActionItem } from '$lib/types/actions';
	import type { ComponentType } from 'svelte';

	interface Props {
		/** Array of action items to display */
		actions: ActionItem[];
		/** Unique ID for the trigger button (must be unique per row) */
		triggerId: string;
		/** Size of the trigger button */
		size?: 'xs' | 'sm' | 'md';
		/** Additional classes for the trigger button */
		class?: string;
	}

	let { actions, triggerId, size = 'xs', class: className = '' }: Props = $props();

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

<Button {size} color="light" id={triggerId} class="!p-1.5 {className}">
	<DotsHorizontalOutline class="w-4 h-4" />
</Button>

<Dropdown
	triggeredBy="#{triggerId}"
	class="w-48 dark:bg-gray-800 dark:border-gray-700 shadow-lg rounded-lg overflow-hidden"
>
	{#each visibleActions as action, index}
		{#if action.dividerBefore && index > 0}
			<DropdownDivider class="my-1" />
		{/if}

		{#if action.href}
			<DropdownItem
				href={action.href}
				class="flex items-center gap-2 px-3 py-2 text-sm {getColorClass(action.color)} {action.disabled ? 'opacity-50 cursor-not-allowed' : ''}"
			>
				{#if action.icon}
					{@const IconComponent = action.icon as ComponentType}
					<IconComponent class="w-4 h-4 {getIconColorClass(action.color)}" />
				{/if}
				<span>{action.label}</span>
			</DropdownItem>
		{:else if action.onClick}
			<DropdownItem
				onclick={action.onClick}
				disabled={action.disabled}
				class="flex items-center gap-2 px-3 py-2 text-sm {getColorClass(action.color)} {action.disabled ? 'opacity-50 cursor-not-allowed' : ''}"
			>
				{#if action.icon}
					{@const IconComponent = action.icon as ComponentType}
					<IconComponent class="w-4 h-4 {getIconColorClass(action.color)}" />
				{/if}
				<span>{action.label}</span>
			</DropdownItem>
		{/if}
	{/each}
</Dropdown>
