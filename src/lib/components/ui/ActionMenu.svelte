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

		{#if action.disabled}
			<div
				class="flex items-center gap-2 px-3 py-2 text-sm opacity-50 cursor-not-allowed {getColorClass(action.color)}"
			>
				{#if action.id === 'whatsapp'}
					<svg class="w-4 h-4 text-green-500 dark:text-green-400" fill="currentColor" viewBox="0 0 24 24">
						<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
					</svg>
				{:else if action.icon}
					{@const IconComponent = action.icon as ComponentType}
					<IconComponent class="w-4 h-4 {getIconColorClass(action.color)}" />
				{/if}
				<span>{action.label}</span>
			</div>
		{:else if action.href}
			<DropdownItem
				href={action.href}
				class="flex items-center gap-2 px-3 py-2 text-sm {getColorClass(action.color)}"
			>
				{#if action.id === 'whatsapp'}
					<svg class="w-4 h-4 text-green-500 dark:text-green-400" fill="currentColor" viewBox="0 0 24 24">
						<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
					</svg>
				{:else if action.icon}
					{@const IconComponent = action.icon as ComponentType}
					<IconComponent class="w-4 h-4 {getIconColorClass(action.color)}" />
				{/if}
				<span>{action.label}</span>
			</DropdownItem>
		{:else if action.onClick}
			<DropdownItem
				onclick={action.onClick}
				class="flex items-center gap-2 px-3 py-2 text-sm {getColorClass(action.color)}"
			>
				{#if action.id === 'whatsapp'}
					<svg class="w-4 h-4 text-green-500 dark:text-green-400" fill="currentColor" viewBox="0 0 24 24">
						<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
					</svg>
				{:else if action.icon}
					{@const IconComponent = action.icon as ComponentType}
					<IconComponent class="w-4 h-4 {getIconColorClass(action.color)}" />
				{/if}
				<span>{action.label}</span>
			</DropdownItem>
		{/if}
	{/each}
</Dropdown>
