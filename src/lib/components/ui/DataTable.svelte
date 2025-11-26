<script lang="ts" generics="T extends Record<string, any>">
	/**
	 * DataTable - A sortable, filterable table component
	 *
	 * Usage:
	 * <DataTable
	 *   data={items}
	 *   columns={[
	 *     { key: 'name', label: 'Name', sortable: true, filterable: true },
	 *     { key: 'status', label: 'Status', sortable: true, filterOptions: ['active', 'inactive'] },
	 *   ]}
	 * >
	 *   {#snippet row(item)}
	 *     <TableBodyCell>{item.name}</TableBodyCell>
	 *   {/snippet}
	 * </DataTable>
	 */

	import {
		Table,
		TableHead,
		TableHeadCell,
		TableBody,
		TableBodyRow,
		Input
	} from 'flowbite-svelte';
	import { ChevronUpOutline, ChevronDownOutline, ChevronSortOutline } from 'flowbite-svelte-icons';
	import type { Snippet } from 'svelte';

	export interface Column<T> {
		key: keyof T | string;
		label: string;
		sortable?: boolean;
		filterable?: boolean;
		filterOptions?: string[]; // For dropdown filters
		filterPlaceholder?: string;
		sortFn?: (a: T, b: T, direction: 'asc' | 'desc') => number;
		getValue?: (item: T) => any; // Custom value getter for sorting/filtering
		class?: string;
		headerClass?: string;
	}

	interface Props {
		data: T[];
		columns: Column<T>[];
		striped?: boolean;
		hoverable?: boolean;
		class?: string;
		row: Snippet<[T, number]>;
		emptyState?: Snippet;
	}

	let {
		data,
		columns,
		striped = true,
		hoverable = true,
		class: className = '',
		row,
		emptyState
	}: Props = $props();

	// Sorting state
	let sortKey = $state<string | null>(null);
	let sortDirection = $state<'asc' | 'desc'>('asc');

	// Filter state
	let filters = $state<Record<string, string>>({});

	// Initialize filters
	$effect(() => {
		const initialFilters: Record<string, string> = {};
		columns.forEach((col) => {
			if (col.filterable || col.filterOptions) {
				initialFilters[col.key as string] = '';
			}
		});
		filters = initialFilters;
	});

	function handleSort(key: string) {
		if (sortKey === key) {
			sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			sortKey = key;
			sortDirection = 'asc';
		}
	}

	function getValue(item: T, column: Column<T>): any {
		if (column.getValue) {
			return column.getValue(item);
		}
		const key = column.key as string;
		return key.includes('.') ? key.split('.').reduce((obj, k) => obj?.[k], item as any) : item[key as keyof T];
	}

	// Filter and sort data
	const processedData = $derived.by(() => {
		let result = [...data];

		// Apply filters
		Object.entries(filters).forEach(([key, value]) => {
			if (!value) return;

			const column = columns.find((c) => c.key === key);
			if (!column) return;

			result = result.filter((item) => {
				const itemValue = getValue(item, column);
				if (itemValue === null || itemValue === undefined) return false;

				// For dropdown filters, exact match
				if (column.filterOptions) {
					return String(itemValue).toLowerCase() === value.toLowerCase();
				}

				// For text filters, partial match
				return String(itemValue).toLowerCase().includes(value.toLowerCase());
			});
		});

		// Apply sorting
		if (sortKey) {
			const column = columns.find((c) => c.key === sortKey);
			if (column) {
				result.sort((a, b) => {
					if (column.sortFn) {
						return column.sortFn(a, b, sortDirection);
					}

					const aVal = getValue(a, column);
					const bVal = getValue(b, column);

					if (aVal === null || aVal === undefined) return sortDirection === 'asc' ? 1 : -1;
					if (bVal === null || bVal === undefined) return sortDirection === 'asc' ? -1 : 1;

					if (typeof aVal === 'number' && typeof bVal === 'number') {
						return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
					}

					const aStr = String(aVal).toLowerCase();
					const bStr = String(bVal).toLowerCase();

					if (sortDirection === 'asc') {
						return aStr.localeCompare(bStr);
					}
					return bStr.localeCompare(aStr);
				});
			}
		}

		return result;
	});

	// Check if any filters are active
	const hasFilters = $derived(columns.some((c) => c.filterable || c.filterOptions));
</script>

<div class="space-y-4">
	<!-- Filters Row -->
	{#if hasFilters}
		<div class="flex flex-wrap gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
			{#each columns as column}
				{#if column.filterOptions}
					<div class="w-40">
						<select
							bind:value={filters[column.key as string]}
							class="block w-full text-xs bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-primary-500 focus:border-primary-500 p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:ring-primary-500 dark:focus:border-primary-500"
						>
							<option value="">{column.filterPlaceholder || `All ${column.label}`}</option>
							{#each column.filterOptions as option}
								<option value={option}>{option.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
							{/each}
						</select>
					</div>
				{:else if column.filterable}
					<div class="w-40">
						<Input
							size="sm"
							type="text"
							placeholder={column.filterPlaceholder || `Filter ${column.label}...`}
							bind:value={filters[column.key as string]}
							class="text-xs"
						/>
					</div>
				{/if}
			{/each}

			{#if Object.values(filters).some(v => v)}
				<button
					type="button"
					onclick={() => {
						const cleared: Record<string, string> = {};
						Object.keys(filters).forEach(k => cleared[k] = '');
						filters = cleared;
					}}
					class="text-xs text-primary-600 dark:text-primary-400 hover:underline self-center"
				>
					Clear filters
				</button>
			{/if}
		</div>
	{/if}

	<!-- Results count -->
	{#if data.length !== processedData.length}
		<p class="text-sm text-gray-500 dark:text-gray-400">
			Showing {processedData.length} of {data.length} results
		</p>
	{/if}

	<!-- Table -->
	<Table {striped} {hoverable} class={className}>
		<TableHead>
			{#each columns as column}
				<TableHeadCell class={column.headerClass || ''}>
					{#if column.sortable}
						<button
							type="button"
							onclick={() => handleSort(column.key as string)}
							class="flex items-center gap-1 hover:text-primary-600 dark:hover:text-primary-400 transition-colors group"
						>
							<span>{column.label}</span>
							<span class="text-gray-400 group-hover:text-primary-500">
								{#if sortKey === column.key}
									{#if sortDirection === 'asc'}
										<ChevronUpOutline class="w-3 h-3" />
									{:else}
										<ChevronDownOutline class="w-3 h-3" />
									{/if}
								{:else}
									<ChevronSortOutline class="w-3 h-3 opacity-50 group-hover:opacity-100" />
								{/if}
							</span>
						</button>
					{:else}
						{column.label}
					{/if}
				</TableHeadCell>
			{/each}
		</TableHead>
		<TableBody>
			{#if processedData.length === 0}
				<tr>
					<td colspan={columns.length} class="text-center py-8">
						{#if emptyState}
							{@render emptyState()}
						{:else}
							<p class="text-gray-500 dark:text-gray-400">No data found</p>
						{/if}
					</td>
				</tr>
			{:else}
				{#each processedData as item, index}
					<TableBodyRow>
						{@render row(item, index)}
					</TableBodyRow>
				{/each}
			{/if}
		</TableBody>
	</Table>
</div>
