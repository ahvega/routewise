<script lang="ts">
	import { page } from '$app/stores';
	import { useQuery } from 'convex-svelte';
	import { api } from '$convex/_generated/api';
	import { Spinner, Alert } from 'flowbite-svelte';
	import QuotationForm from '$lib/components/quotations/QuotationForm.svelte';
	import { t } from '$lib/i18n';
	import type { Id } from '$convex/_generated/dataModel';

	const quotationId = $derived($page.params.id as Id<'quotations'>);
	const quotationQuery = useQuery(api.quotations.get, () => ({ id: quotationId }));
	const quotation = $derived(quotationQuery.data);
    const isLoading = $derived(quotationQuery.isLoading);
</script>

<svelte:head>
	<title>{$t('quotations.editQuotation')} - RouteWise</title>
</svelte:head>

{#if isLoading}
	<div class="flex justify-center py-12">
		<Spinner size="8" />
	</div>
{:else if !quotation}
	<Alert color="red">{$t('errors.notFound')}</Alert>
{:else}
	<QuotationForm {quotation} />
{/if}
