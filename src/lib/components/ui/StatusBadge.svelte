<script lang="ts">
	/**
	 * StatusBadge - A pill-style badge with pastel colors, icons, and high contrast text
	 *
	 * Usage:
	 * <StatusBadge status="active" />
	 * <StatusBadge status="approved" variant="quotation" showIcon />
	 * <StatusBadge status="error">Custom text</StatusBadge>
	 */

	import type { Snippet } from 'svelte';
	import {
		CheckCircleSolid,
		CloseCircleSolid,
		ClockSolid,
		ExclamationCircleSolid,
		PaperPlaneSolid,
		EditSolid,
		CalendarMonthSolid,
		StarSolid,
		CogSolid,
		HomeSolid,
		TruckSolid,
		InfoCircleSolid,
		CashSolid
	} from 'flowbite-svelte-icons';

	type StatusVariant = 'default' | 'quotation' | 'vehicle' | 'driver' | 'client' | 'pricing' | 'plan' | 'parameter' | 'itinerary' | 'invoice' | 'payment' | 'advance';

	interface Props {
		status: string;
		variant?: StatusVariant;
		size?: 'sm' | 'md' | 'lg';
		showIcon?: boolean;
		class?: string;
		children?: Snippet;
	}

	let { status, variant = 'default', size = 'md', showIcon = false, class: className = '', children }: Props = $props();

	// Pastel color schemes with high contrast text
	const statusColors: Record<string, { bg: string; text: string; darkBg: string; darkText: string }> = {
		// General status
		active: { bg: 'bg-emerald-100', text: 'text-emerald-800', darkBg: 'dark:bg-emerald-900/40', darkText: 'dark:text-emerald-300' },
		inactive: { bg: 'bg-slate-100', text: 'text-slate-700', darkBg: 'dark:bg-slate-800/60', darkText: 'dark:text-slate-300' },

		// Quotation status
		draft: { bg: 'bg-slate-100', text: 'text-slate-700', darkBg: 'dark:bg-slate-800/60', darkText: 'dark:text-slate-300' },
		sent: { bg: 'bg-sky-100', text: 'text-sky-800', darkBg: 'dark:bg-sky-900/40', darkText: 'dark:text-sky-300' },
		approved: { bg: 'bg-emerald-100', text: 'text-emerald-800', darkBg: 'dark:bg-emerald-900/40', darkText: 'dark:text-emerald-300' },
		rejected: { bg: 'bg-rose-100', text: 'text-rose-800', darkBg: 'dark:bg-rose-900/40', darkText: 'dark:text-rose-300' },
		expired: { bg: 'bg-amber-100', text: 'text-amber-800', darkBg: 'dark:bg-amber-900/40', darkText: 'dark:text-amber-300' },

		// Vehicle status
		maintenance: { bg: 'bg-amber-100', text: 'text-amber-800', darkBg: 'dark:bg-amber-900/40', darkText: 'dark:text-amber-300' },

		// Driver status
		on_leave: { bg: 'bg-violet-100', text: 'text-violet-800', darkBg: 'dark:bg-violet-900/40', darkText: 'dark:text-violet-300' },

		// Pricing levels
		standard: { bg: 'bg-slate-100', text: 'text-slate-700', darkBg: 'dark:bg-slate-800/60', darkText: 'dark:text-slate-300' },
		preferred: { bg: 'bg-amber-100', text: 'text-amber-800', darkBg: 'dark:bg-amber-900/40', darkText: 'dark:text-amber-300' },
		vip: { bg: 'bg-violet-100', text: 'text-violet-800', darkBg: 'dark:bg-violet-900/40', darkText: 'dark:text-violet-300' },

		// Ownership
		owned: { bg: 'bg-emerald-100', text: 'text-emerald-800', darkBg: 'dark:bg-emerald-900/40', darkText: 'dark:text-emerald-300' },
		rented: { bg: 'bg-sky-100', text: 'text-sky-800', darkBg: 'dark:bg-sky-900/40', darkText: 'dark:text-sky-300' },

		// Alert levels
		warning: { bg: 'bg-amber-100', text: 'text-amber-800', darkBg: 'dark:bg-amber-900/40', darkText: 'dark:text-amber-300' },
		error: { bg: 'bg-rose-100', text: 'text-rose-800', darkBg: 'dark:bg-rose-900/40', darkText: 'dark:text-rose-300' },
		success: { bg: 'bg-emerald-100', text: 'text-emerald-800', darkBg: 'dark:bg-emerald-900/40', darkText: 'dark:text-emerald-300' },
		info: { bg: 'bg-sky-100', text: 'text-sky-800', darkBg: 'dark:bg-sky-900/40', darkText: 'dark:text-sky-300' },

		// Plan types
		trial: { bg: 'bg-amber-100', text: 'text-amber-800', darkBg: 'dark:bg-amber-900/40', darkText: 'dark:text-amber-300' },
		starter: { bg: 'bg-slate-100', text: 'text-slate-700', darkBg: 'dark:bg-slate-800/60', darkText: 'dark:text-slate-300' },
		professional: { bg: 'bg-sky-100', text: 'text-sky-800', darkBg: 'dark:bg-sky-900/40', darkText: 'dark:text-sky-300' },
		pro: { bg: 'bg-sky-100', text: 'text-sky-800', darkBg: 'dark:bg-sky-900/40', darkText: 'dark:text-sky-300' },
		enterprise: { bg: 'bg-violet-100', text: 'text-violet-800', darkBg: 'dark:bg-violet-900/40', darkText: 'dark:text-violet-300' },

		// Parameters
		year: { bg: 'bg-sky-100', text: 'text-sky-800', darkBg: 'dark:bg-sky-900/40', darkText: 'dark:text-sky-300' },

		// Itinerary status
		scheduled: { bg: 'bg-sky-100', text: 'text-sky-800', darkBg: 'dark:bg-sky-900/40', darkText: 'dark:text-sky-300' },
		in_progress: { bg: 'bg-amber-100', text: 'text-amber-800', darkBg: 'dark:bg-amber-900/40', darkText: 'dark:text-amber-300' },
		completed: { bg: 'bg-emerald-100', text: 'text-emerald-800', darkBg: 'dark:bg-emerald-900/40', darkText: 'dark:text-emerald-300' },
		cancelled: { bg: 'bg-rose-100', text: 'text-rose-800', darkBg: 'dark:bg-rose-900/40', darkText: 'dark:text-rose-300' },

		// Invoice status
		void: { bg: 'bg-slate-100', text: 'text-slate-700', darkBg: 'dark:bg-slate-800/60', darkText: 'dark:text-slate-300' },

		// Payment status
		unpaid: { bg: 'bg-rose-100', text: 'text-rose-800', darkBg: 'dark:bg-rose-900/40', darkText: 'dark:text-rose-300' },
		partial: { bg: 'bg-amber-100', text: 'text-amber-800', darkBg: 'dark:bg-amber-900/40', darkText: 'dark:text-amber-300' },
		paid: { bg: 'bg-emerald-100', text: 'text-emerald-800', darkBg: 'dark:bg-emerald-900/40', darkText: 'dark:text-emerald-300' },
		overdue: { bg: 'bg-red-100', text: 'text-red-800', darkBg: 'dark:bg-red-900/40', darkText: 'dark:text-red-300' },

		// Expense advance status
		pending: { bg: 'bg-amber-100', text: 'text-amber-800', darkBg: 'dark:bg-amber-900/40', darkText: 'dark:text-amber-300' },
		disbursed: { bg: 'bg-sky-100', text: 'text-sky-800', darkBg: 'dark:bg-sky-900/40', darkText: 'dark:text-sky-300' },
		settled: { bg: 'bg-emerald-100', text: 'text-emerald-800', darkBg: 'dark:bg-emerald-900/40', darkText: 'dark:text-emerald-300' },
	};

	// Icon mapping for statuses
	const statusIcons: Record<string, typeof CheckCircleSolid> = {
		// General status
		active: CheckCircleSolid,
		inactive: CloseCircleSolid,

		// Quotation status
		draft: EditSolid,
		sent: PaperPlaneSolid,
		approved: CheckCircleSolid,
		rejected: CloseCircleSolid,
		expired: ClockSolid,

		// Vehicle status
		maintenance: CogSolid,

		// Driver status
		on_leave: CalendarMonthSolid,

		// Pricing levels
		standard: InfoCircleSolid,
		preferred: StarSolid,
		vip: StarSolid,

		// Ownership
		owned: HomeSolid,
		rented: TruckSolid,

		// Alert levels
		warning: ExclamationCircleSolid,
		error: CloseCircleSolid,
		success: CheckCircleSolid,
		info: InfoCircleSolid,

		// Plans
		trial: ClockSolid,
		starter: InfoCircleSolid,
		professional: StarSolid,
		pro: StarSolid,
		enterprise: StarSolid,

		// Parameters
		year: CalendarMonthSolid,

		// Itinerary status
		scheduled: CalendarMonthSolid,
		in_progress: TruckSolid,
		completed: CheckCircleSolid,
		cancelled: CloseCircleSolid,

		// Invoice status
		void: CloseCircleSolid,

		// Payment status
		unpaid: ClockSolid,
		partial: CashSolid,
		paid: CheckCircleSolid,
		overdue: ExclamationCircleSolid,

		// Expense advance status
		pending: ClockSolid,
		disbursed: CashSolid,
		settled: CheckCircleSolid,
	};

	// Default fallback
	const defaultColors = { bg: 'bg-slate-100', text: 'text-slate-700', darkBg: 'dark:bg-slate-800/60', darkText: 'dark:text-slate-300' };

	const sizeClasses = {
		sm: 'px-2 py-0.5 text-xs',
		md: 'px-2.5 py-1 text-xs',
		lg: 'px-3 py-1.5 text-sm'
	};

	const colors = $derived(statusColors[status.toLowerCase()] || defaultColors);
	const displayText = $derived(status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()));
	const IconComponent = $derived(statusIcons[status.toLowerCase()]);

	const iconSizeClasses = {
		sm: 'w-3 h-3',
		md: 'w-3.5 h-3.5',
		lg: 'w-4 h-4'
	};
</script>

<span
	class="inline-flex items-center gap-1 font-semibold rounded-full whitespace-nowrap
		{colors.bg} {colors.text} {colors.darkBg} {colors.darkText}
		{sizeClasses[size]} {className}"
>
	{#if showIcon && IconComponent}
		<svelte:component this={IconComponent} class={iconSizeClasses[size]} />
	{/if}
	{#if children}
		{@render children()}
	{:else}
		{displayText}
	{/if}
</span>
