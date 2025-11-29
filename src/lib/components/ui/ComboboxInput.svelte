<script lang="ts">
	import { Input } from 'flowbite-svelte';
	import { PlusOutline } from 'flowbite-svelte-icons';

	interface Props {
		value: string;
		options: string[];
		placeholder?: string;
		id?: string;
		required?: boolean;
		disabled?: boolean;
		addLabel?: string;
		onchange?: (value: string) => void;
		onAddNew?: (value: string) => void;
	}

	let {
		value = $bindable(''),
		options = [],
		placeholder = '',
		id = '',
		required = false,
		disabled = false,
		addLabel = 'Add',
		onchange,
		onAddNew
	}: Props = $props();

	let inputElement: any = $state(null); // Flowbite Input component
	let showDropdown = $state(false);
	let highlightedIndex = $state(-1);
	let inputValue = $state(value);

	// Filter options based on input
	const filteredOptions = $derived(() => {
		if (!options || options.length === 0) return [];
		if (!inputValue.trim()) return options.slice(0, 10);
		const search = inputValue.toLowerCase().trim();
		return options.filter(opt => opt.toLowerCase().includes(search)).slice(0, 10);
	});

	// Check if current input is a new value (not in options)
	const isNewValue = $derived(() => {
		if (!inputValue.trim()) return false;
		const search = inputValue.toLowerCase().trim();
		return !options.some(opt => opt.toLowerCase() === search);
	});

	function handleInput(e: Event) {
		const target = e.target as HTMLInputElement;
		inputValue = target.value;
		showDropdown = true;
		highlightedIndex = -1;
	}

	function handleFocus() {
		showDropdown = true;
	}

	function handleBlur(e: FocusEvent) {
		// Delay to allow click on dropdown items
		setTimeout(() => {
			showDropdown = false;
			// If value changed, trigger onchange
			if (inputValue !== value) {
				value = inputValue;
				onchange?.(inputValue);
			}
		}, 150);
	}

	function selectOption(option: string) {
		inputValue = option;
		value = option;
		showDropdown = false;
		onchange?.(option);
	}

	function addNewValue() {
		if (inputValue.trim() && isNewValue()) {
			const newVal = inputValue.trim();
			value = newVal;
			showDropdown = false;
			onAddNew?.(newVal);
			onchange?.(newVal);
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		const opts = filteredOptions();
		const totalItems = opts.length + (isNewValue() ? 1 : 0);

		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				highlightedIndex = Math.min(highlightedIndex + 1, totalItems - 1);
				break;
			case 'ArrowUp':
				e.preventDefault();
				highlightedIndex = Math.max(highlightedIndex - 1, -1);
				break;
			case 'Enter':
				e.preventDefault();
				if (highlightedIndex >= 0) {
					if (highlightedIndex < opts.length) {
						selectOption(opts[highlightedIndex]);
					} else if (isNewValue()) {
						addNewValue();
					}
				} else if (isNewValue()) {
					addNewValue();
				}
				break;
			case 'Escape':
				showDropdown = false;
				break;
		}
	}

	// Sync external value changes
	$effect(() => {
		if (value !== inputValue) {
			inputValue = value;
		}
	});
</script>

<div class="relative">
	<Input
		bind:this={inputElement}
		{id}
		type="text"
		value={inputValue}
		{placeholder}
		{required}
		{disabled}
		oninput={handleInput}
		onfocus={handleFocus}
		onblur={handleBlur}
		onkeydown={handleKeydown}
		autocomplete="off"
	/>

	{#if showDropdown && !disabled && (filteredOptions().length > 0 || isNewValue())}
		<div class="absolute z-[9999] mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
			{#each filteredOptions() as option, index}
				<button
					type="button"
					class="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 {highlightedIndex === index ? 'bg-gray-100 dark:bg-gray-700' : ''}"
					onmousedown={() => selectOption(option)}
				>
					{option}
				</button>
			{/each}

			{#if isNewValue()}
				<button
					type="button"
					class="w-full px-4 py-2 text-left text-sm border-t border-gray-200 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center gap-2 {highlightedIndex === filteredOptions().length ? 'bg-blue-50 dark:bg-blue-900/30' : ''}"
					onmousedown={addNewValue}
				>
					<PlusOutline class="w-4 h-4" />
					<span>{addLabel} "<strong>{inputValue.trim()}</strong>"</span>
				</button>
			{/if}
		</div>
	{/if}
</div>
