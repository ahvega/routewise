import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Mock svelte-i18n
vi.mock('svelte-i18n', () => ({
	t: {
		subscribe: (fn: (value: (key: string) => string) => void) => {
			fn((key: string) => key);
			return () => {};
		}
	},
	isLoading: {
		subscribe: (fn: (value: boolean) => void) => {
			fn(false);
			return () => {};
		}
	},
	locale: {
		subscribe: (fn: (value: string) => void) => {
			fn('en');
			return () => {};
		},
		set: vi.fn()
	},
	init: vi.fn(),
	register: vi.fn(),
	getLocaleFromNavigator: vi.fn(() => 'en')
}));

// Mock $lib/i18n (our wrapper)
vi.mock('$lib/i18n', () => ({
	t: {
		subscribe: (fn: (value: (key: string, opts?: any) => string) => void) => {
			fn((key: string) => key);
			return () => {};
		}
	},
	initI18n: vi.fn(),
	setLocale: vi.fn(),
	locales: [
		{ code: 'es', name: 'Español', flag: '🇭🇳' },
		{ code: 'en', name: 'English', flag: '🇺🇸' }
	]
}));

// Global test utilities
global.ResizeObserver = vi.fn().mockImplementation(() => ({
	observe: vi.fn(),
	unobserve: vi.fn(),
	disconnect: vi.fn()
}));

// Mock window.matchMedia for responsive components
Object.defineProperty(window, 'matchMedia', {
	writable: true,
	value: vi.fn().mockImplementation((query: string) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: vi.fn(), // deprecated
		removeListener: vi.fn(), // deprecated
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn()
	}))
});
