import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'path';

export default defineConfig({
	plugins: [svelte({ hot: !process.env.VITEST })],
	resolve: {
		alias: {
			$lib: path.resolve('./src/lib'),
			'$app/environment': path.resolve('./src/tests/mocks/app/environment.ts'),
			'$app/navigation': path.resolve('./src/tests/mocks/app/navigation.ts'),
			'$app/stores': path.resolve('./src/tests/mocks/app/stores.ts'),
			'$env/static/public': path.resolve('./src/tests/mocks/env/public.ts')
		}
	},
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}'],
		environment: 'jsdom',
		globals: true,
		setupFiles: ['./src/tests/setup.ts']
	}
});
