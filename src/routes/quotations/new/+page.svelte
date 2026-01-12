<script lang="ts">
	import QuotationForm from '$lib/components/quotations/QuotationForm.svelte';
	import { t } from '$lib/i18n';
</script>

<svelte:head>
	<title>{$t('quotations.new.title')} - RouteWise</title>
</svelte:head>

<QuotationForm />