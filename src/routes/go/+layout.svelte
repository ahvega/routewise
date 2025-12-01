<script lang="ts">
	import '../../app.css';
	import { setupConvex } from 'convex-svelte';
	import { PUBLIC_CONVEX_URL } from '$env/static/public';

	let { children } = $props();

	// Initialize Convex client (needed for queries)
	if (PUBLIC_CONVEX_URL) {
		setupConvex(PUBLIC_CONVEX_URL);
	}
</script>

{@render children()}
