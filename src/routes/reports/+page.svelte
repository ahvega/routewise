<script lang="ts">
	import { Card, Tabs, TabItem, Spinner, Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell, Button, Select, Badge } from 'flowbite-svelte';
	import {
		ChartPieSolid,
		ChartMixedDollarSolid,
		UsersSolid,
		TruckSolid,
		MapPinSolid,
		CashSolid,
		DownloadOutline
	} from 'flowbite-svelte-icons';
	import { useQuery } from 'convex-svelte';
	import { api } from '$convex/_generated/api';
	import { tenantStore } from '$lib/stores';
	import { StatusBadge } from '$lib/components/ui';
	import { t } from '$lib/i18n';

	// Type definitions for report data
	interface RevenueByClient {
		clientName: string;
		quotations: number;
		approved: number;
		revenue: number;
	}
	interface RevenueByVehicle {
		vehicleName: string;
		quotations: number;
		approved: number;
		revenue: number;
	}
	interface MonthlyRevenue {
		month: string;
		year: number;
		quotationsCreated: number;
		quotationsApproved: number;
		quotationValue: number;
		invoiced: number;
		collected: number;
	}
	interface ReceivableInvoice {
		invoiceNumber: string;
		clientName: string;
		amount: number;
		dueDate: number;
		daysOverdue: number;
		bucket: string;
	}
	interface DriverUtilization {
		driverName: string;
		status: string;
		completed: number;
		inProgress: number;
		scheduled: number;
		tripDays: number;
		utilizationRate: number;
	}
	interface VehicleUtilization {
		vehicleName: string;
		vehicleType: string;
		status: string;
		completed: number;
		totalDistance: number;
		utilizationRate: number;
	}
	interface RouteAnalysis {
		origin: string;
		destination: string;
		count: number;
		approved: number;
		totalValue: number;
		avgDistance: number;
		conversionRate: number;
	}
	interface AgingBucket {
		count: number;
		amount: number;
	}
	interface PipelineStatus {
		count: number;
		value: number;
	}

	let { data } = $props();

	// Report queries
	const pipelineQuery = useQuery(
		api.reports.getSalesPipeline,
		() => (tenantStore.tenantId ? { tenantId: tenantStore.tenantId } : 'skip')
	);
	const revenueByClientQuery = useQuery(
		api.reports.getRevenueByClient,
		() => (tenantStore.tenantId ? { tenantId: tenantStore.tenantId } : 'skip')
	);
	const revenueByVehicleQuery = useQuery(
		api.reports.getRevenueByVehicle,
		() => (tenantStore.tenantId ? { tenantId: tenantStore.tenantId } : 'skip')
	);
	const monthlyRevenueQuery = useQuery(
		api.reports.getMonthlyRevenue,
		() => (tenantStore.tenantId ? { tenantId: tenantStore.tenantId, months: 12 } : 'skip')
	);
	const receivablesQuery = useQuery(
		api.reports.getReceivablesAging,
		() => (tenantStore.tenantId ? { tenantId: tenantStore.tenantId } : 'skip')
	);
	const driverUtilQuery = useQuery(
		api.reports.getDriverUtilization,
		() => (tenantStore.tenantId ? { tenantId: tenantStore.tenantId, days: 30 } : 'skip')
	);
	const vehicleUtilQuery = useQuery(
		api.reports.getVehicleUtilization,
		() => (tenantStore.tenantId ? { tenantId: tenantStore.tenantId, days: 30 } : 'skip')
	);
	const routeAnalysisQuery = useQuery(
		api.reports.getRouteAnalysis,
		() => (tenantStore.tenantId ? { tenantId: tenantStore.tenantId } : 'skip')
	);

	const pipeline = $derived(pipelineQuery.data);
	const revenueByClient = $derived(revenueByClientQuery.data || []);
	const revenueByVehicle = $derived(revenueByVehicleQuery.data || []);
	const monthlyRevenue = $derived(monthlyRevenueQuery.data || []);
	const receivables = $derived(receivablesQuery.data);
	const driverUtil = $derived(driverUtilQuery.data);
	const vehicleUtil = $derived(vehicleUtilQuery.data);
	const routeAnalysis = $derived(routeAnalysisQuery.data);

	const isLoading = $derived(
		pipelineQuery.isLoading ||
		revenueByClientQuery.isLoading ||
		monthlyRevenueQuery.isLoading ||
		receivablesQuery.isLoading
	);

	function formatCurrency(value: number): string {
		return new Intl.NumberFormat('es-HN', {
			style: 'currency',
			currency: 'HNL',
			minimumFractionDigits: 0,
			maximumFractionDigits: 0
		}).format(value);
	}

	function formatNumber(value: number): string {
		return new Intl.NumberFormat('es-HN').format(value);
	}

	function formatDistance(km: number): string {
		return `${formatNumber(Math.round(km))} km`;
	}

	function formatDate(timestamp: number): string {
		return new Intl.DateTimeFormat('es-HN', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		}).format(new Date(timestamp));
	}

	// Bar component for visual charts
	function getBarWidth(value: number, max: number): number {
		return max > 0 ? (value / max) * 100 : 0;
	}

	// Pipeline status colors
	const statusColors: Record<string, string> = {
		draft: 'bg-slate-400',
		sent: 'bg-sky-500',
		approved: 'bg-emerald-500',
		rejected: 'bg-rose-500',
		expired: 'bg-amber-500',
	};

	// Aging bucket colors
	const agingColors: Record<string, string> = {
		current: 'bg-emerald-500',
		days1_30: 'bg-amber-400',
		days31_60: 'bg-orange-500',
		days61_90: 'bg-red-500',
		over90: 'bg-red-700',
	};

	const agingLabels = $derived<Record<string, string>>({
		current: $t('reports.current') || 'Al Corriente',
		days1_30: $t('reports.aging1_30') || '1-30 Días',
		days31_60: $t('reports.aging31_60') || '31-60 Días',
		days61_90: $t('reports.aging61_90') || '61-90 Días',
		over90: $t('reports.agingOver90') || '90+ Días',
	});

	// CSV Export functions
	function downloadCSV(data: Record<string, unknown>[], filename: string, headers: string[]) {
		const csvContent = [
			headers.join(','),
			...data.map(row =>
				headers.map(header => {
					const value = row[header];
					// Escape quotes and wrap in quotes if contains comma
					const stringValue = String(value ?? '');
					if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
						return `"${stringValue.replace(/"/g, '""')}"`;
					}
					return stringValue;
				}).join(',')
			)
		].join('\n');

		const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
		const link = document.createElement('a');
		link.href = URL.createObjectURL(blob);
		link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
		link.click();
		URL.revokeObjectURL(link.href);
	}

	function exportRevenueByClient() {
		if (!revenueByClient.length) return;
		downloadCSV(
			revenueByClient.map((c: RevenueByClient) => ({
				clientName: c.clientName,
				quotations: c.quotations,
				approved: c.approved,
				revenue: c.revenue
			})),
			'revenue_by_client',
			['clientName', 'quotations', 'approved', 'revenue']
		);
	}

	function exportRevenueByVehicle() {
		if (!revenueByVehicle.length) return;
		downloadCSV(
			revenueByVehicle.map((v: RevenueByVehicle) => ({
				vehicleName: v.vehicleName,
				quotations: v.quotations,
				approved: v.approved,
				revenue: v.revenue
			})),
			'revenue_by_vehicle',
			['vehicleName', 'quotations', 'approved', 'revenue']
		);
	}

	function exportMonthlyRevenue() {
		if (!monthlyRevenue.length) return;
		downloadCSV(
			monthlyRevenue.map((m: MonthlyRevenue) => ({
				month: `${m.month} ${m.year}`,
				quotationsCreated: m.quotationsCreated,
				quotationsApproved: m.quotationsApproved,
				quotationValue: m.quotationValue,
				invoiced: m.invoiced,
				collected: m.collected
			})),
			'monthly_revenue',
			['month', 'quotationsCreated', 'quotationsApproved', 'quotationValue', 'invoiced', 'collected']
		);
	}

	function exportReceivables() {
		if (!receivables?.invoices.length) return;
		downloadCSV(
			receivables.invoices.map((inv: ReceivableInvoice) => ({
				invoiceNumber: inv.invoiceNumber,
				clientName: inv.clientName,
				amount: inv.amount,
				dueDate: formatDate(inv.dueDate),
				daysOverdue: inv.daysOverdue,
				bucket: agingLabels[inv.bucket] || inv.bucket
			})),
			'receivables_aging',
			['invoiceNumber', 'clientName', 'amount', 'dueDate', 'daysOverdue', 'bucket']
		);
	}

	function exportDriverUtilization() {
		if (!driverUtil?.drivers.length) return;
		downloadCSV(
			driverUtil.drivers.map((d: DriverUtilization) => ({
				driverName: d.driverName,
				status: d.status,
				completed: d.completed,
				inProgress: d.inProgress,
				scheduled: d.scheduled,
				tripDays: d.tripDays,
				utilizationRate: `${d.utilizationRate.toFixed(1)}%`
			})),
			'driver_utilization',
			['driverName', 'status', 'completed', 'inProgress', 'scheduled', 'tripDays', 'utilizationRate']
		);
	}

	function exportVehicleUtilization() {
		if (!vehicleUtil?.vehicles.length) return;
		downloadCSV(
			vehicleUtil.vehicles.map((v: VehicleUtilization) => ({
				vehicleName: v.vehicleName,
				vehicleType: v.vehicleType,
				status: v.status,
				completed: v.completed,
				totalDistance: v.totalDistance,
				utilizationRate: `${v.utilizationRate.toFixed(1)}%`
			})),
			'vehicle_utilization',
			['vehicleName', 'vehicleType', 'status', 'completed', 'totalDistance', 'utilizationRate']
		);
	}

	function exportRouteAnalysis() {
		if (!routeAnalysis?.routes.length) return;
		downloadCSV(
			routeAnalysis.routes.map((r: RouteAnalysis) => ({
				origin: r.origin,
				destination: r.destination,
				count: r.count,
				approved: r.approved,
				totalValue: r.totalValue,
				avgDistance: r.avgDistance,
				conversionRate: `${r.conversionRate.toFixed(1)}%`
			})),
			'route_analysis',
			['origin', 'destination', 'count', 'approved', 'totalValue', 'avgDistance', 'conversionRate']
		);
	}
</script>

<svelte:head>
	<title>{$t('reports.title')} | RouteWise</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
		<div>
			<h1 class="text-2xl font-bold text-gray-900 dark:text-white">
				{$t('reports.title') || 'Reports'}
			</h1>
			<p class="text-gray-600 dark:text-gray-400 mt-1">
				{$t('reports.subtitle') || 'Analytics and business insights'}
			</p>
		</div>
	</div>

	{#if isLoading}
		<div class="flex justify-center py-12">
			<Spinner size="8" />
		</div>
	{:else}
		<Tabs style="underline" class="gap-1">
			<!-- Sales Reports Tab -->
			<TabItem open title={$t('reports.sales') || 'Sales'}>
				<div class="space-y-6 pt-4">
					<!-- Pipeline Overview -->
					{#if pipeline}
						<Card class="max-w-none !p-6">
							<h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
								{$t('reports.salesPipeline') || 'Sales Pipeline'}
							</h3>
							<div class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
								{#each Object.entries(pipeline.byStatus) as [status, statusData]}
									{@const data = statusData as PipelineStatus}
									<div class="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
										<p class="text-2xl font-bold text-gray-900 dark:text-white">{data.count}</p>
										<p class="text-sm text-gray-500 dark:text-gray-400 capitalize">{status}</p>
										<p class="text-xs text-gray-400 dark:text-gray-500">{formatCurrency(data.value)}</p>
									</div>
								{/each}
							</div>

							<!-- Visual bar -->
							<div class="h-8 flex rounded-lg overflow-hidden">
								{#each Object.entries(pipeline.byStatus) as [status, statusData]}
									{@const data = statusData as PipelineStatus}
									{@const width = getBarWidth(data.count, pipeline.total)}
									{#if width > 0}
										<div
											class="{statusColors[status]} h-full flex items-center justify-center text-xs text-white font-medium"
											style="width: {width}%"
											title="{status}: {data.count}"
										>
											{#if width > 10}
												{data.count}
											{/if}
										</div>
									{/if}
								{/each}
							</div>

							<!-- Summary -->
							<div class="grid grid-cols-3 gap-4 mt-6">
								<div class="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
									<p class="text-sm text-emerald-700 dark:text-emerald-400">{$t('reports.conversionRate') || 'Conversion Rate'}</p>
									<p class="text-2xl font-bold text-emerald-800 dark:text-emerald-200">{pipeline.conversionRate.toFixed(1)}%</p>
								</div>
								<div class="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
									<p class="text-sm text-amber-700 dark:text-amber-400">{$t('reports.pipelineValue') || 'Pipeline Value'}</p>
									<p class="text-2xl font-bold text-amber-800 dark:text-amber-200">{formatCurrency(pipeline.totalPipelineValue)}</p>
								</div>
								<div class="p-4 bg-sky-50 dark:bg-sky-900/20 rounded-lg">
									<p class="text-sm text-sky-700 dark:text-sky-400">{$t('reports.approvedValue') || 'Approved Value'}</p>
									<p class="text-2xl font-bold text-sky-800 dark:text-sky-200">{formatCurrency(pipeline.approvedValue)}</p>
								</div>
							</div>
						</Card>
					{/if}

					<!-- Revenue by Client -->
					<Card class="max-w-none !p-6">
						<div class="flex items-center justify-between mb-4">
							<h3 class="text-lg font-semibold text-gray-900 dark:text-white">
								{$t('reports.revenueByClient') || 'Revenue by Client'}
							</h3>
							{#if revenueByClient.length > 0}
								<Button size="xs" color="light" onclick={exportRevenueByClient}>
									<DownloadOutline class="w-3 h-3 mr-1" />
									CSV
								</Button>
							{/if}
						</div>
						{#if revenueByClient.length > 0}
							{@const maxRevenue = Math.max(...revenueByClient.map((c: RevenueByClient) => c.revenue))}
							<div class="space-y-3">
								{#each revenueByClient.slice(0, 10) as client, i}
									<div class="flex items-center gap-4">
										<span class="w-6 text-sm text-gray-500 dark:text-gray-400">{i + 1}</span>
										<div class="flex-1">
											<div class="flex justify-between items-center mb-1">
												<span class="font-medium text-gray-900 dark:text-white text-sm">{client.clientName}</span>
												<span class="text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(client.revenue)}</span>
											</div>
											<div class="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
												<div
													class="h-full bg-emerald-500 rounded-full"
													style="width: {getBarWidth(client.revenue, maxRevenue)}%"
												></div>
											</div>
											<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
												{client.approved} {$t('reports.approved').toLowerCase()} de {client.quotations} {$t('reports.quotationsLower')}
											</p>
										</div>
									</div>
								{/each}
							</div>
						{:else}
							<p class="text-center text-gray-500 dark:text-gray-400 py-8">{$t('common.noData')}</p>
						{/if}
					</Card>

					<!-- Revenue by Vehicle -->
					<Card class="max-w-none !p-6">
						<div class="flex items-center justify-between mb-4">
							<h3 class="text-lg font-semibold text-gray-900 dark:text-white">
								{$t('reports.revenueByVehicle') || 'Revenue by Vehicle'}
							</h3>
							{#if revenueByVehicle.length > 0}
								<Button size="xs" color="light" onclick={exportRevenueByVehicle}>
									<DownloadOutline class="w-3 h-3 mr-1" />
									CSV
								</Button>
							{/if}
						</div>
						{#if revenueByVehicle.length > 0}
							{@const maxRevenue = Math.max(...revenueByVehicle.map((v: RevenueByVehicle) => v.revenue))}
							<div class="space-y-3">
								{#each revenueByVehicle as vehicle, i}
									<div class="flex items-center gap-4">
										<span class="w-6 text-sm text-gray-500 dark:text-gray-400">{i + 1}</span>
										<div class="flex-1">
											<div class="flex justify-between items-center mb-1">
												<span class="font-medium text-gray-900 dark:text-white text-sm">{vehicle.vehicleName}</span>
												<span class="text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(vehicle.revenue)}</span>
											</div>
											<div class="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
												<div
													class="h-full bg-purple-500 rounded-full"
													style="width: {getBarWidth(vehicle.revenue, maxRevenue)}%"
												></div>
											</div>
											<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
												{vehicle.approved} {$t('reports.approved').toLowerCase()} de {vehicle.quotations} {$t('reports.quotationsLower')}
											</p>
										</div>
									</div>
								{/each}
							</div>
						{:else}
							<p class="text-center text-gray-500 dark:text-gray-400 py-8">{$t('common.noData')}</p>
						{/if}
					</Card>
				</div>
			</TabItem>

			<!-- Financial Reports Tab -->
			<TabItem title={$t('reports.financial') || 'Financial'}>
				<div class="space-y-6 pt-4">
					<!-- Monthly Revenue -->
					<Card class="max-w-none !p-6">
						<div class="flex items-center justify-between mb-4">
							<h3 class="text-lg font-semibold text-gray-900 dark:text-white">
								{$t('reports.monthlyRevenue') || 'Monthly Revenue'}
							</h3>
							{#if monthlyRevenue.length > 0}
								<Button size="xs" color="light" onclick={exportMonthlyRevenue}>
									<DownloadOutline class="w-3 h-3 mr-1" />
									CSV
								</Button>
							{/if}
						</div>
						{#if monthlyRevenue.length > 0}
							{@const maxValue = Math.max(...monthlyRevenue.map((m: MonthlyRevenue) => Math.max(m.quotationValue, m.invoiced, m.collected)))}
							<div class="overflow-x-auto">
								<div class="flex gap-2 min-w-max pb-4">
									{#each monthlyRevenue as month}
										<div class="w-20 text-center">
											<div class="h-32 flex flex-col justify-end gap-1">
												<div
													class="bg-emerald-500 rounded-t"
													style="height: {getBarWidth(month.collected, maxValue) * 0.8}%"
													title="Collected: {formatCurrency(month.collected)}"
												></div>
												<div
													class="bg-amber-400 rounded-t"
													style="height: {getBarWidth(month.invoiced, maxValue) * 0.8}%"
													title="Invoiced: {formatCurrency(month.invoiced)}"
												></div>
												<div
													class="bg-sky-400 rounded-t"
													style="height: {getBarWidth(month.quotationValue, maxValue) * 0.8}%"
													title="Approved: {formatCurrency(month.quotationValue)}"
												></div>
											</div>
											<p class="text-xs text-gray-500 dark:text-gray-400 mt-2">{month.month}</p>
											<p class="text-xs text-gray-400 dark:text-gray-500">{month.year}</p>
										</div>
									{/each}
								</div>
							</div>
							<div class="flex justify-center gap-6 mt-4">
								<div class="flex items-center gap-2">
									<div class="w-3 h-3 bg-sky-400 rounded"></div>
									<span class="text-xs text-gray-600 dark:text-gray-400">{$t('reports.approved') || 'Aprobado'}</span>
								</div>
								<div class="flex items-center gap-2">
									<div class="w-3 h-3 bg-amber-400 rounded"></div>
									<span class="text-xs text-gray-600 dark:text-gray-400">{$t('reports.invoiced') || 'Facturado'}</span>
								</div>
								<div class="flex items-center gap-2">
									<div class="w-3 h-3 bg-emerald-500 rounded"></div>
									<span class="text-xs text-gray-600 dark:text-gray-400">{$t('reports.collected') || 'Cobrado'}</span>
								</div>
							</div>

							<!-- Summary table -->
							<Table striped class="mt-6">
								<TableHead>
									<TableHeadCell>{$t('reports.month') || 'Mes'}</TableHeadCell>
									<TableHeadCell class="text-right">{$t('reports.quotations') || 'Cotizaciones'}</TableHeadCell>
									<TableHeadCell class="text-right">{$t('reports.approved') || 'Aprobado'}</TableHeadCell>
									<TableHeadCell class="text-right">{$t('reports.invoiced') || 'Facturado'}</TableHeadCell>
									<TableHeadCell class="text-right">{$t('reports.collected') || 'Cobrado'}</TableHeadCell>
								</TableHead>
								<TableBody>
									{#each monthlyRevenue.slice().reverse() as month}
										<TableBodyRow>
											<TableBodyCell>{month.month} {month.year}</TableBodyCell>
											<TableBodyCell class="text-right">{month.quotationsCreated}</TableBodyCell>
											<TableBodyCell class="text-right">{formatCurrency(month.quotationValue)}</TableBodyCell>
											<TableBodyCell class="text-right">{formatCurrency(month.invoiced)}</TableBodyCell>
											<TableBodyCell class="text-right">{formatCurrency(month.collected)}</TableBodyCell>
										</TableBodyRow>
									{/each}
								</TableBody>
							</Table>
						{:else}
							<p class="text-center text-gray-500 dark:text-gray-400 py-8">{$t('common.noData')}</p>
						{/if}
					</Card>

					<!-- Receivables Aging -->
					{#if receivables}
						<Card class="max-w-none !p-6">
							<div class="flex items-center justify-between mb-4">
								<h3 class="text-lg font-semibold text-gray-900 dark:text-white">
									{$t('reports.receivablesAging') || 'Receivables Aging'}
								</h3>
								{#if receivables.invoices.length > 0}
									<Button size="xs" color="light" onclick={exportReceivables}>
										<DownloadOutline class="w-3 h-3 mr-1" />
										CSV
									</Button>
								{/if}
							</div>

							<!-- Summary cards -->
							<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
								<div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
									<p class="text-sm text-gray-500 dark:text-gray-400">{$t('reports.totalReceivables') || 'Total Receivables'}</p>
									<p class="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(receivables.totalReceivables)}</p>
								</div>
								<div class="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
									<p class="text-sm text-red-700 dark:text-red-400">{$t('reports.totalOverdue') || 'Total Overdue'}</p>
									<p class="text-2xl font-bold text-red-800 dark:text-red-200">{formatCurrency(receivables.totalOverdue)}</p>
								</div>
								<div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
									<p class="text-sm text-gray-500 dark:text-gray-400">{$t('reports.unpaidInvoices') || 'Unpaid Invoices'}</p>
									<p class="text-2xl font-bold text-gray-900 dark:text-white">{receivables.invoiceCount}</p>
								</div>
								<div class="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
									<p class="text-sm text-emerald-700 dark:text-emerald-400">{$t('reports.current') || 'Current'}</p>
									<p class="text-2xl font-bold text-emerald-800 dark:text-emerald-200">{formatCurrency(receivables.aging.current.amount)}</p>
								</div>
							</div>

							<!-- Aging buckets bar -->
							{@const totalAging = (Object.values(receivables.aging) as AgingBucket[]).reduce((sum, b) => sum + b.amount, 0)}
							{#if totalAging > 0}
								<div class="h-8 flex rounded-lg overflow-hidden mb-4">
									{#each Object.entries(receivables.aging) as [bucket, bucketData]}
										{@const data = bucketData as AgingBucket}
										{@const width = getBarWidth(data.amount, totalAging)}
										{#if width > 0}
											<div
												class="{agingColors[bucket]} h-full flex items-center justify-center text-xs text-white font-medium"
												style="width: {width}%"
												title="{agingLabels[bucket]}: {formatCurrency(data.amount)}"
											>
												{#if width > 12}
													{formatCurrency(data.amount)}
												{/if}
											</div>
										{/if}
									{/each}
								</div>
								<div class="flex flex-wrap gap-4 justify-center mb-6">
									{#each Object.entries(agingLabels) as [bucket, label]}
										<div class="flex items-center gap-2">
											<div class="w-3 h-3 {agingColors[bucket]} rounded"></div>
											<span class="text-xs text-gray-600 dark:text-gray-400">{label}</span>
										</div>
									{/each}
								</div>
							{/if}

							<!-- Invoice list -->
							{#if receivables.invoices.length > 0}
								<Table striped>
									<TableHead>
										<TableHeadCell>{$t('reports.invoice') || 'Factura'}</TableHeadCell>
										<TableHeadCell>{$t('reports.client') || 'Cliente'}</TableHeadCell>
										<TableHeadCell class="text-right">{$t('reports.amountDue') || 'Monto Adeudado'}</TableHeadCell>
										<TableHeadCell>{$t('reports.dueDate') || 'Fecha de Vencimiento'}</TableHeadCell>
										<TableHeadCell>{$t('reports.status') || 'Estado'}</TableHeadCell>
									</TableHead>
									<TableBody>
										{#each receivables.invoices.slice(0, 15) as invoice}
											<TableBodyRow>
												<TableBodyCell class="font-medium">{invoice.invoiceNumber}</TableBodyCell>
												<TableBodyCell>{invoice.clientName}</TableBodyCell>
												<TableBodyCell class="text-right font-semibold">{formatCurrency(invoice.amount)}</TableBodyCell>
												<TableBodyCell>{formatDate(invoice.dueDate)}</TableBodyCell>
												<TableBodyCell>
													{#if invoice.daysOverdue > 0}
														<Badge color="red">{invoice.daysOverdue}d {$t('reports.overdue') || 'vencido'}</Badge>
													{:else}
														<Badge color="green">{$t('reports.current') || 'Al Corriente'}</Badge>
													{/if}
												</TableBodyCell>
											</TableBodyRow>
										{/each}
									</TableBody>
								</Table>
							{/if}
						</Card>
					{/if}
				</div>
			</TabItem>

			<!-- Operational Reports Tab -->
			<TabItem title={$t('reports.operational') || 'Operational'}>
				<div class="space-y-6 pt-4">
					<!-- Driver Utilization -->
					{#if driverUtil}
						<Card class="max-w-none !p-6">
							<div class="flex items-center justify-between mb-4">
								<h3 class="text-lg font-semibold text-gray-900 dark:text-white">
									{$t('reports.driverUtilization') || 'Driver Utilization'} (30 days)
								</h3>
								{#if driverUtil.drivers.length > 0}
									<Button size="xs" color="light" onclick={exportDriverUtilization}>
										<DownloadOutline class="w-3 h-3 mr-1" />
										CSV
									</Button>
								{/if}
							</div>

							<!-- Summary -->
							<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
								<div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
									<p class="text-2xl font-bold text-gray-900 dark:text-white">{driverUtil.summary.totalDrivers}</p>
									<p class="text-sm text-gray-500 dark:text-gray-400">{$t('reports.totalDrivers') || 'Total de Conductores'}</p>
								</div>
								<div class="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-center">
									<p class="text-2xl font-bold text-emerald-800 dark:text-emerald-200">{driverUtil.summary.activeDrivers}</p>
									<p class="text-sm text-emerald-700 dark:text-emerald-400">{$t('reports.active') || 'Activo'}</p>
								</div>
								<div class="p-4 bg-sky-50 dark:bg-sky-900/20 rounded-lg text-center">
									<p class="text-2xl font-bold text-sky-800 dark:text-sky-200">{driverUtil.summary.totalTrips}</p>
									<p class="text-sm text-sky-700 dark:text-sky-400">{$t('reports.totalTrips') || 'Total de Viajes'}</p>
								</div>
								<div class="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-center">
									<p class="text-2xl font-bold text-purple-800 dark:text-purple-200">{driverUtil.summary.avgTripsPerDriver}</p>
									<p class="text-sm text-purple-700 dark:text-purple-400">{$t('reports.avgTripsPerDriver') || 'Prom Viajes/Conductor'}</p>
								</div>
							</div>

							<!-- Driver list -->
							<Table striped>
								<TableHead>
									<TableHeadCell>{$t('reports.driver') || 'Conductor'}</TableHeadCell>
									<TableHeadCell>{$t('reports.status') || 'Estado'}</TableHeadCell>
									<TableHeadCell class="text-right">{$t('reports.completed') || 'Completado'}</TableHeadCell>
									<TableHeadCell class="text-right">{$t('reports.inProgress') || 'En Progreso'}</TableHeadCell>
									<TableHeadCell class="text-right">{$t('reports.scheduled') || 'Programado'}</TableHeadCell>
									<TableHeadCell class="text-right">{$t('reports.tripDays') || 'Días de Viaje'}</TableHeadCell>
									<TableHeadCell>{$t('reports.utilization') || 'Utilización'}</TableHeadCell>
								</TableHead>
								<TableBody>
									{#each driverUtil.drivers as driver}
										<TableBodyRow>
											<TableBodyCell class="font-medium">{driver.driverName}</TableBodyCell>
											<TableBodyCell><StatusBadge status={driver.status} size="sm" /></TableBodyCell>
											<TableBodyCell class="text-right">{driver.completed}</TableBodyCell>
											<TableBodyCell class="text-right">{driver.inProgress}</TableBodyCell>
											<TableBodyCell class="text-right">{driver.scheduled}</TableBodyCell>
											<TableBodyCell class="text-right">{driver.tripDays}</TableBodyCell>
											<TableBodyCell>
												<div class="flex items-center gap-2">
													<div class="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
														<div
															class="h-full bg-emerald-500 rounded-full"
															style="width: {Math.min(driver.utilizationRate, 100)}%"
														></div>
													</div>
													<span class="text-xs text-gray-600 dark:text-gray-400">{driver.utilizationRate.toFixed(0)}%</span>
												</div>
											</TableBodyCell>
										</TableBodyRow>
									{/each}
								</TableBody>
							</Table>
						</Card>
					{/if}

					<!-- Vehicle Utilization -->
					{#if vehicleUtil}
						<Card class="max-w-none !p-6">
							<div class="flex items-center justify-between mb-4">
								<h3 class="text-lg font-semibold text-gray-900 dark:text-white">
									{$t('reports.vehicleUtilization') || 'Vehicle Utilization'} (30 days)
								</h3>
								{#if vehicleUtil.vehicles.length > 0}
									<Button size="xs" color="light" onclick={exportVehicleUtilization}>
										<DownloadOutline class="w-3 h-3 mr-1" />
										CSV
									</Button>
								{/if}
							</div>

							<!-- Summary -->
							<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
								<div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
									<p class="text-2xl font-bold text-gray-900 dark:text-white">{vehicleUtil.summary.totalVehicles}</p>
									<p class="text-sm text-gray-500 dark:text-gray-400">{$t('reports.totalVehicles') || 'Total de Vehículos'}</p>
								</div>
								<div class="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-center">
									<p class="text-2xl font-bold text-emerald-800 dark:text-emerald-200">{vehicleUtil.summary.activeVehicles}</p>
									<p class="text-sm text-emerald-700 dark:text-emerald-400">{$t('reports.active') || 'Activo'}</p>
								</div>
								<div class="p-4 bg-sky-50 dark:bg-sky-900/20 rounded-lg text-center">
									<p class="text-2xl font-bold text-sky-800 dark:text-sky-200">{vehicleUtil.summary.totalTrips}</p>
									<p class="text-sm text-sky-700 dark:text-sky-400">{$t('reports.totalTrips') || 'Total de Viajes'}</p>
								</div>
								<div class="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-center">
									<p class="text-2xl font-bold text-purple-800 dark:text-purple-200">{formatDistance(vehicleUtil.summary.totalDistance)}</p>
									<p class="text-sm text-purple-700 dark:text-purple-400">{$t('reports.totalDistance') || 'Distancia Total'}</p>
								</div>
							</div>

							<!-- Vehicle list -->
							<Table striped>
								<TableHead>
									<TableHeadCell>{$t('reports.vehicle') || 'Vehículo'}</TableHeadCell>
									<TableHeadCell>{$t('reports.type') || 'Tipo'}</TableHeadCell>
									<TableHeadCell>{$t('reports.status') || 'Estado'}</TableHeadCell>
									<TableHeadCell class="text-right">{$t('reports.trips') || 'Viajes'}</TableHeadCell>
									<TableHeadCell class="text-right">{$t('reports.distance') || 'Distancia'}</TableHeadCell>
									<TableHeadCell>{$t('reports.utilization') || 'Utilización'}</TableHeadCell>
								</TableHead>
								<TableBody>
									{#each vehicleUtil.vehicles as vehicle}
										<TableBodyRow>
											<TableBodyCell class="font-medium">{vehicle.vehicleName}</TableBodyCell>
											<TableBodyCell class="capitalize">{vehicle.vehicleType}</TableBodyCell>
											<TableBodyCell><StatusBadge status={vehicle.status} size="sm" /></TableBodyCell>
											<TableBodyCell class="text-right">{vehicle.completed}</TableBodyCell>
											<TableBodyCell class="text-right">{formatDistance(vehicle.totalDistance)}</TableBodyCell>
											<TableBodyCell>
												<div class="flex items-center gap-2">
													<div class="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
														<div
															class="h-full bg-purple-500 rounded-full"
															style="width: {Math.min(vehicle.utilizationRate, 100)}%"
														></div>
													</div>
													<span class="text-xs text-gray-600 dark:text-gray-400">{vehicle.utilizationRate.toFixed(0)}%</span>
												</div>
											</TableBodyCell>
										</TableBodyRow>
									{/each}
								</TableBody>
							</Table>
						</Card>
					{/if}

					<!-- Route Analysis -->
					{#if routeAnalysis}
						<Card class="max-w-none !p-6">
							<div class="flex items-center justify-between mb-4">
								<h3 class="text-lg font-semibold text-gray-900 dark:text-white">
									{$t('reports.routeAnalysis') || 'Popular Routes'}
								</h3>
								{#if routeAnalysis.routes.length > 0}
									<Button size="xs" color="light" onclick={exportRouteAnalysis}>
										<DownloadOutline class="w-3 h-3 mr-1" />
										CSV
									</Button>
								{/if}
							</div>

							<!-- Summary -->
							<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
								<div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
									<p class="text-sm text-gray-500 dark:text-gray-400">{$t('reports.uniqueRoutes') || 'Rutas Únicas'}</p>
									<p class="text-2xl font-bold text-gray-900 dark:text-white">{routeAnalysis.totalUniqueRoutes}</p>
								</div>
								{#if routeAnalysis.mostPopular}
									<div class="p-4 bg-sky-50 dark:bg-sky-900/20 rounded-lg">
										<p class="text-sm text-sky-700 dark:text-sky-400">{$t('reports.mostPopular') || 'Más Popular'}</p>
										<p class="text-lg font-bold text-sky-800 dark:text-sky-200 truncate">
											{routeAnalysis.mostPopular.origin} → {routeAnalysis.mostPopular.destination}
										</p>
										<p class="text-xs text-sky-600 dark:text-sky-400">{routeAnalysis.mostPopular.count} {$t('reports.quotationsLower') || 'cotizaciones'}</p>
									</div>
								{/if}
								{#if routeAnalysis.highestValue}
									<div class="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
										<p class="text-sm text-emerald-700 dark:text-emerald-400">{$t('reports.highestValue') || 'Mayor Valor'}</p>
										<p class="text-lg font-bold text-emerald-800 dark:text-emerald-200 truncate">
											{routeAnalysis.highestValue.origin} → {routeAnalysis.highestValue.destination}
										</p>
										<p class="text-xs text-emerald-600 dark:text-emerald-400">{formatCurrency(routeAnalysis.highestValue.totalValue)}</p>
									</div>
								{/if}
							</div>

							<!-- Route list -->
							{#if routeAnalysis.routes.length > 0}
								<Table striped>
									<TableHead>
										<TableHeadCell>{$t('reports.route') || 'Ruta'}</TableHeadCell>
										<TableHeadCell class="text-right">{$t('reports.quotations') || 'Cotizaciones'}</TableHeadCell>
										<TableHeadCell class="text-right">{$t('reports.approved') || 'Aprobado'}</TableHeadCell>
										<TableHeadCell class="text-right">{$t('reports.revenue') || 'Ingresos'}</TableHeadCell>
										<TableHeadCell class="text-right">{$t('reports.avgDistance') || 'Distancia Prom'}</TableHeadCell>
										<TableHeadCell class="text-right">{$t('reports.convRate') || 'Tasa de Conv.'}</TableHeadCell>
									</TableHead>
									<TableBody>
										{#each routeAnalysis.routes.slice(0, 15) as route}
											<TableBodyRow>
												<TableBodyCell>
													<span class="font-medium text-gray-900 dark:text-white">{route.origin}</span>
													<span class="text-gray-400 mx-1">→</span>
													<span class="text-gray-600 dark:text-gray-300">{route.destination}</span>
												</TableBodyCell>
												<TableBodyCell class="text-right">{route.count}</TableBodyCell>
												<TableBodyCell class="text-right">{route.approved}</TableBodyCell>
												<TableBodyCell class="text-right font-semibold">{formatCurrency(route.totalValue)}</TableBodyCell>
												<TableBodyCell class="text-right">{formatDistance(route.avgDistance)}</TableBodyCell>
												<TableBodyCell class="text-right">{route.conversionRate.toFixed(0)}%</TableBodyCell>
											</TableBodyRow>
										{/each}
									</TableBody>
								</Table>
							{:else}
								<p class="text-center text-gray-500 dark:text-gray-400 py-8">{$t('common.noData')}</p>
							{/if}
						</Card>
					{/if}
				</div>
			</TabItem>
		</Tabs>
	{/if}
</div>
