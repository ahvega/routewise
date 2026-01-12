<script lang="ts" module>
	// Module-level exports for types
	export interface Column<T> {
		key: keyof T | string;
		label: string;
		sortable?: boolean;
		filterable?: boolean;
		filterOptions?: (string | { label: string; value: string })[]; // For dropdown filters
		filterPlaceholder?: string;
		sortFn?: (a: T, b: T, direction: 'asc' | 'desc') => number;
		getValue?: (item: T) => any; // Custom value getter for sorting/filtering
		class?: string;
		headerClass?: string;
	}
</script>

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
		Input,
		Card,
		Select
	} from 'flowbite-svelte';
	import { ChevronUpOutline, ChevronDownOutline, ChevronSortOutline, SearchOutline } from 'flowbite-svelte-icons';
	import type { Snippet } from 'svelte';
	import { t } from '$lib/i18n';

	interface Props {
		data: T[];
		columns: Column<T>[];
		striped?: boolean;
		hoverable?: boolean;
		class?: string;
		row: Snippet<[T, number]>;
		emptyState?: Snippet;
		additionalSearchKeys?: string[];
	}

	let {
		data,
		columns,
		striped = true,
		hoverable = true,
		class: className = '',
		row,
		emptyState,
		additionalSearchKeys
	}: Props = $props();

	// Sorting state
	let sortKey = $state<string | null>(null);
	let sortDirection = $state<'asc' | 'desc'>('asc');

	// Filter state
	let filters = $state<Record<string, string>>({});
	let globalSearch = $state('');

	// Initialize filters
	$effect(() => {
		const initialFilters: Record<string, string> = {};
		columns.forEach((col) => {
			if (col.filterOptions) {
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

		// Apply dropdown filters
		Object.entries(filters).forEach(([key, value]) => {
			if (!value) return;

			const column = columns.find((c) => c.key === key);
			if (!column) return;

			result = result.filter((item) => {
				const itemValue = getValue(item, column);
				if (itemValue === null || itemValue === undefined) return false;
				return String(itemValue).toLowerCase() === value.toLowerCase();
			});
		});

		// Apply global search filter
		if (globalSearch) {
			const term = globalSearch.toLowerCase();
			result = result.filter((item) => {
				// Check visible columns
				const foundInColumns = columns.some((column) => {
					if (!column.filterable || column.filterOptions) return false;
					const itemValue = getValue(item, column);
					if (itemValue === null || itemValue === undefined) return false;
					return String(itemValue).toLowerCase().includes(term);
				});
				if (foundInColumns) return true;

				// Check additional keys
				if (additionalSearchKeys) {
					return additionalSearchKeys.some((key) => {
						const val = item[key];
						if (val === null || val === undefined) return false;
						return String(val).toLowerCase().includes(term);
					});
				}
				return false;
			});
		}

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
	const hasSearch = $derived(columns.some((c) => c.filterable && !c.filterOptions));
	const searchPlaceholder = $derived(columns.find(c => c.filterable && !c.filterOptions && c.filterPlaceholder)?.filterPlaceholder || $t('common.search'));
</script>

<div class="space-y-4">
	<!-- Filters Row -->
	{#if hasFilters}
		<Card class="max-w-none p-4!">
			<div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 items-center">
				{#if hasSearch}
					<div class="md:col-span-2 lg:col-span-1">
						<Input
							type="text"
							placeholder={searchPlaceholder}
							bind:value={globalSearch}
							class="pl-10"
						>
							{#snippet left()}
								<SearchOutline class="w-5 h-5 text-gray-500" />
							{/snippet}
						</Input>
					</div>
				{/if}

				{#each columns as column}
					{#if column.filterOptions}
						<div>
							<Select
								bind:value={filters[column.key as string]}
								placeholder={column.filterPlaceholder || $t('common.all')}
							>
								{#each column.filterOptions as option}
									{#if typeof option === 'string'}
										<option value={option}>{option.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
									{:else}
										<option value={option.value}>{option.label}</option>
									{/if}
								{/each}
							</Select>
						</div>
					{/if}
				{/each}

				{#if globalSearch || Object.values(filters).some(v => v)}
					<div class="flex justify-end md:justify-start">
						<button
							type="button"
							onclick={() => {
								globalSearch = '';
								const cleared: Record<string, string> = {};
								Object.keys(filters).forEach(k => cleared[k] = '');
								filters = cleared;
							}}
							class="text-sm text-primary-600 dark:text-primary-400 hover:underline"
						>
							{$t('common.clearFilters')}
						</button>
					</div>
				{/if}
			</div>
		</Card>
	{/if}

	<!-- Results count -->
	{#if data.length !== processedData.length}
		<p class="text-sm text-gray-500 dark:text-gray-400 px-1">
			{$t('common.showing', { values: { count: processedData.length, total: data.length } })}
		</p>
	{/if}

	<!-- Table -->
	<Card class="max-w-none p-0! overflow-hidden">
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
								<p class="text-gray-500 dark:text-gray-400">{$t('common.noResults')}</p>
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
	</Card>
</div>
