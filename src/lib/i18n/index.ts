/**
 * Internationalization (i18n) Setup
 * Using svelte-i18n for multi-language support
 */

import { browser } from '$app/environment';
import { init, register, getLocaleFromNavigator, locale } from 'svelte-i18n';

// Default and fallback locale
const defaultLocale = 'es';
const fallbackLocale = 'es';

// Register translation files
register('es', () => import('./es.json'));
register('en', () => import('./en.json'));

/**
 * Initialize i18n
 * Detects browser language, falls back to Spanish
 */
export function initI18n() {
	init({
		fallbackLocale,
		initialLocale: getInitialLocale()
	});
}

/**
 * Get initial locale from:
 * 1. localStorage (user preference)
 * 2. Browser navigator language
 * 3. Default (Spanish)
 */
function getInitialLocale(): string {
	if (!browser) return defaultLocale;

	// Check localStorage for user preference
	const savedLocale = localStorage.getItem('locale');
	if (savedLocale && ['es', 'en'].includes(savedLocale)) {
		return savedLocale;
	}

	// Check browser language
	const browserLocale = getLocaleFromNavigator();
	if (browserLocale) {
		// Handle language codes like 'es-HN', 'en-US'
		const lang = browserLocale.split('-')[0];
		if (['es', 'en'].includes(lang)) {
			return lang;
		}
	}

	return defaultLocale;
}

/**
 * Change locale and save preference
 */
export function setLocale(newLocale: string) {
	if (!['es', 'en'].includes(newLocale)) return;

	locale.set(newLocale);

	if (browser) {
		localStorage.setItem('locale', newLocale);
	}
}

/**
 * Get available locales
 */
export const locales = [
	{ code: 'es', name: 'Español', flag: '🇭🇳' },
	{ code: 'en', name: 'English', flag: '🇺🇸' }
];

// Re-export svelte-i18n utilities
export { t, locale, locales as availableLocales } from 'svelte-i18n';
