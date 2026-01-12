/**
 * Main Library Exports
 * Re-export all modules for convenient $lib alias imports
 */

// Components
export * from './components';

// Auth types (server-side auth functions must be imported directly)
export * from './auth';

// Types, constants, and interfaces
export * from './types';

// Utility functions
export * from './utils';

// Services (import directly from $lib/services to avoid conflicts)
// export * from './services';

// Note: stores use Svelte 5 runes and should be imported directly
// import { authStore } from '$lib/stores/auth';
