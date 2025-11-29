# Repository Guidelines

## Project Structure & Module Organization

- Source: `src/` (SvelteKit project root)
- Routing/UI: `src/routes/` (SvelteKit file-based routing), shared UI in `src/lib/components/`
- Logic: `src/lib/services/` (domain services), `src/lib/utils/` (helpers), `src/lib/stores/` (Svelte stores with runes), `src/lib/types/` (TypeScript types)
- Backend: `convex/` (Convex database schema and functions)
- Assets: `static/`
- Barrel exports: prefer `index.ts` per folder for re-exports

## Build, Test, and Development Commands

- `npm run dev`: Start local dev server at `http://localhost:5173`
- `npm run build`: Production build (SvelteKit)
- `npm run preview`: Preview production build
- `npm run check`: TypeScript and Svelte checks
- `npm run test`: Run tests in watch mode
- `npm run test:run`: Run tests once
- `npm run quality`: Run type checks + tests (use before commits)
- `npx convex dev`: Start Convex development server

## Coding Style & Naming Conventions

- Language: TypeScript + Svelte 5 (SvelteKit 2.x)
- UI Components: Flowbite-svelte (Tailwind-based component library)
- Linting: ESLint with Svelte/TypeScript config. Run `npm run check`
- Components/files: PascalCase for Svelte components (e.g., `PricingTable.svelte`)
- Stores: Use Svelte 5 runes (`$state`, `$derived`, `$effect`)
- Types: PascalCase interfaces/types in `src/lib/types/`
- Exports: Use barrel files (`index.ts`) for feature folders

## Testing Guidelines

- Test runner: Vitest (compatible with Vite)
- Tests location: `src/tests/` mirroring source structure
- Prefer component tests (@testing-library/svelte) and service-level unit tests
- Follow TDD (Test-Driven Development) for core business logic
- Run `npm run quality` before committing

## Commit & Pull Request Guidelines

- Commits: Follow Conventional Commits (e.g., `feat(form): add range slider`, `fix(auth): session handling`)
- PRs: Provide a clear description, link issues (e.g., `Closes #123`), and include screenshots for UI changes
- Scope: Keep PRs small and focused. Ensure `npm run quality` passes

## Security & Configuration Tips

- Environment: copy `.env.example` to `.env`
- Required vars: `PUBLIC_CONVEX_URL`, `PUBLIC_GOOGLE_MAPS_API_KEY`, WorkOS credentials
- Do not commit secrets. `.env` is ignored by Git
- Public vars use `PUBLIC_` prefix (accessible on client)

## Development Best Practices

- See `CLAUDE.md` for comprehensive guidelines on:
  - Svelte 5 runes syntax
  - Convex integration patterns
  - Flowbite-svelte component usage
  - Service layer patterns
  - Multi-tenant architecture

## Agent-Specific Instructions

- Align changes with existing structure and barrel exports
- Avoid unrelated refactors; prefer incremental, well-scoped patches
- When adding modules, mirror naming and placement patterns in `src/lib/components/`, `src/lib/services/`, and `src/lib/utils/`
- Always run `npm run quality` before committing code
- Document all public APIs with JSDoc comments
- Follow TDD for service layer and business logic
- **Use Flowbite-svelte components** - prefer these over custom implementations

## Flowbite-Svelte MCP Server

This project has access to the **Flowbite-Svelte MCP Server** for AI-assisted UI development. The MCP server provides real-time access to component documentation, usage examples, and best practices.

### Available MCP Tools

When implementing UI with Flowbite-Svelte, use these tools in order:

1. **findComponent** - Use FIRST to discover components by name or category
   - Example: Find components for "modal", "form", "navigation"
   - Returns documentation paths for matching components

2. **getComponentList** - Lists all available components organized by category
   - Categories: components, forms, typography, utilities, extend, plugins

3. **getComponentDoc** - Retrieves complete documentation for a specific component
   - Includes: props, events, slots, usage examples, best practices
   - Use after findComponent to get full implementation details

4. **searchDocs** - Full-text search across all documentation
   - Use for specific patterns, features, or edge cases

### MCP Server Configuration

Server location:

```text
e:\MyDevTools\flowbite-svelte-mcp\build\server.js
```

### Recommended Workflow

When building UI components:

1. **Discover**: Use `findComponent` to locate relevant components
2. **Learn**: Use `getComponentDoc` to understand props, events, and examples
3. **Search**: Use `searchDocs` for specific patterns or advanced usage
4. **Implement**: Follow the examples and best practices from the docs

### Example MCP Queries

- "Find the Modal component" → use `findComponent`
- "What form components are available?" → use `getComponentList`
- "Show me Dropdown documentation" → use `getComponentDoc`
- "Search for dark mode toggle examples" → use `searchDocs`
