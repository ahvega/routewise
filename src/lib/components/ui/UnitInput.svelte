<script lang="ts">
	/**
	 * UnitInput - Input field with unit selector that dynamically converts values
	 *
	 * Usage:
	 * <UnitInput
	 *   bind:value={fuelEfficiency}
	 *   bind:unit={fuelEfficiencyUnit}
	 *   unitType="fuelEfficiency"
	 * />
	 */

	import { Input, Select } from 'flowbite-svelte';

	type UnitType = 'distance' | 'fuelEfficiency' | 'volume' | 'currency' | 'weight';

	interface UnitConfig {
		label: string;
		value: string;
		toBase: (value: number) => number; // Convert to base unit
		fromBase: (value: number) => number; // Convert from base unit
	}

	interface Props {
		value: number;
		unit: string;
		unitType: UnitType;
		label?: string;
		id?: string;
		required?: boolean;
		min?: number;
		max?: number;
		step?: number | string;
		placeholder?: string;
		disabled?: boolean;
		class?: string;
	}

	let {
		value = $bindable(),
		unit = $bindable(),
		unitType,
		label,
		id,
		required = false,
		min,
		max,
		step = 'any',
		placeholder,
		disabled = false,
		class: className = ''
	}: Props = $props();

	// Unit configurations with conversion functions
	const unitConfigs: Record<UnitType, UnitConfig[]> = {
		distance: [
			{ label: 'km', value: 'km', toBase: (v) => v, fromBase: (v) => v },
			{ label: 'mi', value: 'mi', toBase: (v) => v * 1.60934, fromBase: (v) => v / 1.60934 }
		],
		fuelEfficiency: [
			{ label: 'km/L', value: 'kpl', toBase: (v) => v, fromBase: (v) => v },
			{ label: 'km/gal', value: 'kpg', toBase: (v) => v * 0.264172, fromBase: (v) => v / 0.264172 },
			{ label: 'mpg', value: 'mpg', toBase: (v) => v * 0.425144, fromBase: (v) => v / 0.425144 },
			{ label: 'L/100km', value: 'l100km', toBase: (v) => 100 / v, fromBase: (v) => 100 / v }
		],
		volume: [
			{ label: 'L', value: 'liters', toBase: (v) => v, fromBase: (v) => v },
			{ label: 'gal', value: 'gallons', toBase: (v) => v * 3.78541, fromBase: (v) => v / 3.78541 }
		],
		currency: [
			{ label: 'HNL', value: 'HNL', toBase: (v) => v, fromBase: (v) => v },
			{ label: 'USD', value: 'USD', toBase: (v) => v * 25, fromBase: (v) => v / 25 } // Approximate rate
		],
		weight: [
			{ label: 'kg', value: 'kg', toBase: (v) => v, fromBase: (v) => v },
			{ label: 'lb', value: 'lb', toBase: (v) => v * 0.453592, fromBase: (v) => v / 0.453592 }
		]
	};

	const units = $derived(unitConfigs[unitType] || []);
	let previousUnit = $state(unit);

	// Store the base value (in the first unit type)
	let baseValue = $state(value);

	// Update base value when value changes externally
	$effect(() => {
		const currentConfig = units.find((u) => u.value === unit);
		if (currentConfig) {
			baseValue = currentConfig.toBase(value);
		}
	});

	// Handle unit change - convert the value
	function handleUnitChange(newUnit: string) {
		const oldConfig = units.find((u) => u.value === previousUnit);
		const newConfig = units.find((u) => u.value === newUnit);

		if (oldConfig && newConfig && value !== undefined && !isNaN(value)) {
			// Convert current value to base, then to new unit
			const baseVal = oldConfig.toBase(value);
			const newValue = newConfig.fromBase(baseVal);

			// Round to reasonable precision
			value = Math.round(newValue * 1000) / 1000;
		}

		previousUnit = newUnit;
		unit = newUnit;
	}

	// Handle input change
	function handleValueChange(newValue: number) {
		value = newValue;
		const currentConfig = units.find((u) => u.value === unit);
		if (currentConfig) {
			baseValue = currentConfig.toBase(newValue);
		}
	}
</script>

<div class="flex gap-2 {className}">
	<Input
		{id}
		type="number"
		value={value}
		onchange={(e) => handleValueChange(parseFloat(e.currentTarget.value) || 0)}
		oninput={(e) => handleValueChange(parseFloat(e.currentTarget.value) || 0)}
		{required}
		{min}
		{max}
		{step}
		{placeholder}
		{disabled}
		class="flex-1"
	/>
	<Select
		value={unit}
		onchange={(e) => handleUnitChange(e.currentTarget.value)}
		{disabled}
		class="w-24 shrink-0"
	>
		{#each units as unitOption}
			<option value={unitOption.value}>{unitOption.label}</option>
		{/each}
	</Select>
</div>
