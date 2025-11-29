/**
 * Server-side Convex client for use in SvelteKit server routes
 */

import { ConvexHttpClient } from 'convex/browser';
import { PUBLIC_CONVEX_URL } from '$env/static/public';

// Create a singleton HTTP client for server-side Convex queries
let _client: ConvexHttpClient | null = null;

export function getConvexClient(): ConvexHttpClient {
  if (!_client) {
    _client = new ConvexHttpClient(PUBLIC_CONVEX_URL);
  }
  return _client;
}

// Export type for use in server code
export type { ConvexHttpClient };
