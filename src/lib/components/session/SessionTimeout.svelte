<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { Modal, Button, Progressbar } from 'flowbite-svelte';
	import { ClockOutline, ExclamationCircleOutline } from 'flowbite-svelte-icons';
	import { t } from '$lib/i18n';

	// Configuration (in milliseconds)
	const IDLE_TIMEOUT = 15 * 60 * 1000; // 15 minutes of inactivity
	const WARNING_TIME = 60 * 1000; // Show warning 60 seconds before logout
	const CHECK_INTERVAL = 1000; // Check every second

	let showWarning = $state(false);
	let countdown = $state(60);
	let lastActivity = $state(Date.now());
	let intervalId: ReturnType<typeof setInterval> | null = null;

	const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];

	function resetTimer() {
		lastActivity = Date.now();
		if (showWarning) {
			showWarning = false;
			countdown = 60;
		}
	}

	function checkIdleTime() {
		const idleTime = Date.now() - lastActivity;
		const timeUntilLogout = IDLE_TIMEOUT - idleTime;

		if (timeUntilLogout <= 0) {
			// Time's up, log out
			handleLogout();
		} else if (timeUntilLogout <= WARNING_TIME && !showWarning) {
			// Show warning
			showWarning = true;
			countdown = Math.ceil(timeUntilLogout / 1000);
		} else if (showWarning) {
			// Update countdown
			countdown = Math.max(0, Math.ceil(timeUntilLogout / 1000));
		}
	}

	function handleStayLoggedIn() {
		resetTimer();
	}

	async function handleLogout() {
		showWarning = false;
		// Clean up before redirecting
		cleanup();
		await goto('/auth/logout');
	}

	function cleanup() {
		if (intervalId) {
			clearInterval(intervalId);
			intervalId = null;
		}
		if (browser) {
			events.forEach(event => {
				document.removeEventListener(event, resetTimer);
			});
		}
	}

	onMount(() => {
		if (!browser) return;

		// Add event listeners for user activity
		events.forEach(event => {
			document.addEventListener(event, resetTimer, { passive: true });
		});

		// Start checking idle time
		intervalId = setInterval(checkIdleTime, CHECK_INTERVAL);
	});

	onDestroy(() => {
		cleanup();
	});

	const progress = $derived(Math.max(0, (countdown / 60) * 100));
</script>

<Modal bind:open={showWarning} size="sm" dismissable={false} class="dark:bg-gray-800">
	<div class="text-center">
		<!-- Warning Icon -->
		<div class="mx-auto mb-4 w-14 h-14 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
			<ExclamationCircleOutline class="w-8 h-8 text-yellow-500" />
		</div>

		<!-- Title -->
		<h3 class="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
			{$t('session.timeoutWarning')}
		</h3>

		<!-- Message -->
		<p class="mb-4 text-gray-500 dark:text-gray-400">
			{$t('session.timeoutMessage', { values: { minutes: Math.ceil(countdown / 60) } })}
		</p>

		<!-- Countdown Display -->
		<div class="mb-6">
			<div class="flex items-center justify-center gap-2 mb-2">
				<ClockOutline class="w-5 h-5 text-gray-400" />
				<span class="text-3xl font-bold text-gray-900 dark:text-white">{countdown}</span>
				<span class="text-gray-500 dark:text-gray-400">s</span>
			</div>
			<Progressbar
				progress={progress}
				color={countdown > 30 ? 'yellow' : 'red'}
				size="h-2"
			/>
		</div>

		<!-- Buttons -->
		<div class="flex gap-3">
			<Button color="light" class="flex-1" onclick={handleLogout}>
				{$t('session.logoutNow')}
			</Button>
			<Button color="primary" class="flex-1" onclick={handleStayLoggedIn}>
				{$t('session.stayLoggedIn')}
			</Button>
		</div>
	</div>
</Modal>
