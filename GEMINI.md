# GEMINI.md

This file provides guidance to Gemini when working with code in this repository.

## Project Overview

RouteWise is a transportation quotation SaaS platform for tour companies and fleet operators in Honduras. It calculates trip costs for multiple vehicle types, displays routes via Google Maps, and generates pricing options with different profit margins.

**Key Features**: Route calculation with Google Maps API, multi-tier pricing (10-30% markup), currency conversion (HNL/USD), toll/fuel/meal cost calculations, multi-tenant support, responsive mobile/desktop UI with dark mode.

## Tech Stack

- **Framework**: SvelteKit 2.x with Svelte 5 (runes syntax)
- **Styling**: TailwindCSS 4 with @tailwindcss/vite plugin
- **UI Components**: Flowbite-svelte 1.x (Tailwind-based component library)
- **Icons**: Flowbite-svelte-icons
- **Backend/Database**: Convex (reactive document DB, real-time sync)
- **Authentication**: WorkOS AuthKit
- **Maps**: Google Maps JavaScript API

## Project Structure

```text
/                        # SvelteKit project root
├── src/
│   ├── lib/
│   │   ├── components/  # Svelte components
│   │   ├── auth/        # WorkOS authentication
│   │   ├── types/       # TypeScript type definitions
│   │   ├── utils/       # Utility functions
│   │   ├── services/    # Business logic services
│   │   └── stores/      # Svelte stores (using runes)
│   ├── routes/          # SvelteKit file-based routing
│   ├── app.css          # TailwindCSS styles
│   └── app.d.ts         # SvelteKit type definitions
├── convex/              # Convex database schema and functions
└── static/              # Static assets
```

## Development Commands

```bash
npm run dev        # Start dev server (localhost:5173)
npm run build      # Production build
npm run check      # TypeScript and Svelte checks
npm run test       # Run tests in watch mode
npm run quality    # Run type checks + tests (use before commits)
npx convex dev     # Start Convex development server
```

## Svelte 5 Runes

The project uses Svelte 5's runes syntax for reactivity:

```svelte
<script lang="ts">
  let count = $state(0);             // Reactive state
  let doubled = $derived(count * 2); // Computed value

  $effect(() => {                    // Side effects
    console.log('Count changed:', count);
  });

  let { data } = $props();           // Component props
</script>
```

## Flowbite-Svelte MCP Server

This project has access to the **Flowbite-Svelte MCP Server** which provides AI assistants with comprehensive component documentation, usage examples, and best practices.

### Available MCP Tools

When working with Flowbite-Svelte components, use these tools:

1. **findComponent** - Use this FIRST to discover components by name or category
   - Returns documentation paths for matching components
   - Example: "Find the Modal component" → returns path to modal docs

2. **getComponentList** - Lists all available Flowbite-Svelte components organized by category
   - Use to explore what components are available
   - Returns components grouped by: forms, typography, utilities, extend, etc.

3. **getComponentDoc** - Retrieves complete documentation for a specific component
   - Includes usage examples, props, events, and best practices
   - Use after findComponent to get full details

4. **searchDocs** - Performs full-text search across all documentation
   - Useful for finding specific features or patterns
   - Example: "Search for dark mode toggle examples"

### MCP Server Location

The Flowbite-Svelte MCP server is installed at:

```text
e:\MyDevTools\flowbite-svelte-mcp\build\server.js
```

### Usage Workflow

When implementing UI with Flowbite-Svelte:

1. **First**: Use `findComponent` to locate the relevant component(s)
2. **Then**: Use `getComponentDoc` to get detailed usage examples and props
3. **Optionally**: Use `searchDocs` for specific patterns or edge cases

### Example Queries

- "What components are available for forms?"
- "Show me how to use the Dropdown component"
- "Search for accordion with nested items"
- "Get documentation for the Modal component"

## Code Quality Standards

- **TypeScript**: Strict mode enabled, no implicit `any`
- **Naming**: PascalCase for types/components, camelCase for functions
- **Imports**: Use `$lib` alias for library imports
- **Components**: Prefer Flowbite-svelte over custom components
- **Commits**: Follow Conventional Commits (`feat:`, `fix:`, `refactor:`)

## Related Documentation

- See `CLAUDE.md` for comprehensive project documentation
- See `AGENTS.md` for agent-specific instructions
