<script lang="ts">
	import { page } from '$app/stores';
	import { Button, Card } from 'flowbite-svelte';
	import { ExclamationCircleOutline, HomeOutline, ArrowLeftOutline } from 'flowbite-svelte-icons';
	import { t } from '$lib/i18n';
</script>

<svelte:head>
	<title>Error {$page.status} | RouteWise</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
	<Card class="max-w-md w-full !p-8 text-center">
		<!-- Error Icon -->
		<div class="flex justify-center mb-6">
			<div class="p-4 bg-red-100 dark:bg-red-900/30 rounded-full">
				<ExclamationCircleOutline class="w-12 h-12 text-red-600 dark:text-red-400" />
			</div>
		</div>

		<!-- Error Code -->
		<h1 class="text-6xl font-bold text-gray-900 dark:text-white mb-2">
			{$page.status}
		</h1>

		<!-- Error Title -->
		<h2 class="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-4">
			{#if $page.status === 404}
				{$t('errors.pageNotFound') || 'Página No Encontrada'}
			{:else if $page.status === 403}
				{$t('errors.accessDenied') || 'Acceso Denegado'}
			{:else if $page.status === 500}
				{$t('errors.serverError') || 'Error del Servidor'}
			{:else}
				{$t('errors.somethingWentWrong') || 'Algo Salió Mal'}
			{/if}
		</h2>

		<!-- Error Message -->
		<p class="text-gray-600 dark:text-gray-400 mb-8">
			{#if $page.status === 404}
				{$t('errors.pageNotFoundMessage') || 'La página que buscas no existe o ha sido movida.'}
			{:else if $page.status === 403}
				{$t('errors.accessDeniedMessage') || 'No tienes permiso para acceder a este recurso.'}
			{:else if $page.status === 500}
				{$t('errors.serverErrorMessage') || 'Estamos experimentando dificultades técnicas. Por favor, intenta de nuevo más tarde.'}
			{:else}
				{$page.error?.message || $t('errors.unexpectedError') || 'Ocurrió un error inesperado.'}
			{/if}
		</p>

		<!-- Action Buttons -->
		<div class="flex flex-col sm:flex-row gap-3 justify-center">
			<Button color="light" onclick={() => history.back()}>
				<ArrowLeftOutline class="w-4 h-4 mr-2" />
				{$t('errors.goBack') || 'Volver'}
			</Button>
			<Button href="/">
				<HomeOutline class="w-4 h-4 mr-2" />
				{$t('errors.home') || 'Inicio'}
			</Button>
		</div>

		<!-- Support Link -->
		<p class="text-sm text-gray-500 dark:text-gray-500 mt-8">
			{$t('errors.needHelp') || '¿Necesitas ayuda? Contacta'} <a href="mailto:support@routewise.app" class="text-primary-600 dark:text-primary-400 hover:underline">support@routewise.app</a>
		</p>
	</Card>
</div>
