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

## Development Server Scripts (PowerShell)

### Start Servers: `start-srv.ps1`

```powershell
.\start-srv.ps1              # Full restart with Convex update
.\start-srv.ps1 -SkipUpdate  # Skip Convex package update
.\start-srv.ps1 -SkipConvex  # Start only SvelteKit
.\start-srv.ps1 -SkipSvelte  # Start only Convex
```

**Actions**: Updates Convex → Kills ports 3210/5173/5174 → Starts both servers

### Stop Servers: `stop-srv.ps1`

```powershell
.\stop-srv.ps1  # Stop all dev servers
```

**Actions**: Kills processes on ports 3210 (Convex), 5173/5174 (SvelteKit)

### Quick Reference

| Scenario | Command |
|----------|---------|
| Start fresh | `.\start-srv.ps1` |
| Quick restart | `.\start-srv.ps1 -SkipUpdate` |
| Stop all | `.\stop-srv.ps1` |

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

## Svelte MCP Server (Official Documentation)

This project has access to the **Official Svelte MCP Server** (`https://mcp.svelte.dev/mcp`) providing up-to-date Svelte 5 and SvelteKit documentation. **Use this when writing Svelte code.**

### Available Tools

| Tool | Description | When to Use |
|------|-------------|-------------|
| `list-sections` | List available doc sections | Discover what docs exist |
| `get-documentation` | Get full documentation | Retrieve specific topic docs |
| `svelte-autofixer` | Analyze code for issues | **ALWAYS** before delivering code |
| `playground-link` | Generate playground link | Share code examples |

### Required Workflow

```text
1. list-sections → Find relevant documentation
2. get-documentation → Get detailed docs
3. Write code using documented patterns
4. svelte-autofixer → Validate code (repeat until clean)
5. Deliver validated code
```

### Documentation Categories

**Svelte 5**: Runes, template syntax, components, styling
**SvelteKit**: Routing, load functions, form actions, hooks

### Quick Reference

| Task | Section |
|------|---------|
| State management | `svelte/runes` |
| Routing | `kit/routing` |
| Data loading | `kit/load` |
| Form handling | `kit/form-actions` |

## Convex MCP Server (Database Operations)

This project has access to the **Convex MCP Server** for direct interaction with the Convex deployment. **Use this when working with database operations, debugging functions, or managing environment variables.**

### Available Tools

| Tool | Description |
|------|-------------|
| `status` | Get deployment selector (**always call first**) |
| `tables` | List all tables with schemas |
| `data` | Browse documents in a table |
| `runOneoffQuery` | Execute read-only JS queries |
| `functionSpec` | Get function metadata |
| `run` | Execute deployed functions |
| `logs` | Get recent function logs |
| `envList/Get/Set/Remove` | Manage environment variables |

### Required Workflow

```text
1. status → Get deployment selector
2. Use other tools with the deployment selector
```

### Tool Categories

**Data**: `tables`, `data`, `runOneoffQuery` (read-only)
**Functions**: `functionSpec`, `run`, `logs`
**Environment**: `envList`, `envGet`, `envSet`, `envRemove`

### Quick Reference

| Task | Tools |
|------|-------|
| View schema | `status` → `tables` |
| Browse data | `status` → `data` |
| Run function | `status` → `run` |
| Debug | `status` → `logs` |

## Flowbite-Svelte MCP Server

This project has access to the **Flowbite-Svelte MCP Server** which provides AI assistants with comprehensive component documentation. **ALWAYS use this MCP server when implementing UI components** to ensure correct, up-to-date syntax.

### Why Use the MCP Server

- **Up-to-date docs**: Local copy of official LLM-optimized documentation
- **Correct Svelte 5 syntax**: Examples use runes (`$state`, `$derived`, `$props`)
- **Proper imports**: Exact import statements for each component
- **Props and events**: Complete TypeScript prop definitions

### Available MCP Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `findComponent` | Find component by name/term | `query` (e.g., "Button", "modal") |
| `getComponentDoc` | Get full documentation | `component` (doc path) |
| `getComponentList` | List all available docs | None |
| `searchDocs` | Full-text search in docs | `query` (search term) |

### Tool Usage Workflow

**IMPORTANT**: Always follow this workflow:

```text
Step 1: findComponent → query: "button"
        Returns: { match: "buttons", docUrl: "buttons", components: ["Button", "GradientButton"] }

Step 2: getComponentDoc → component: "buttons"
        Returns: Full documentation with imports, examples, props

Step 3: Implement using the documented syntax
```

### Component Categories (75+ components)

**Components**: Navbar, Sidebar, Modal, Dialog, Table, Card, Badge, Alert, Toast, Dropdown, Tabs, Pagination, etc.

**Forms**: Input, Textarea, Select, MultiSelect, Checkbox, Radio, Toggle, Datepicker, Timepicker, etc.

**Typography**: Heading, P, A, List, Blockquote, Hr, Img

**Extended**: CommandPalette, KanbanBoard, VirtualList, Tour, SplitPane

### Svelte 5 Syntax Reference

**CRITICAL**: Always use Svelte 5 runes syntax:

| Old (Svelte 4) | New (Svelte 5) |
|----------------|----------------|
| `export let value` | `let { value } = $props()` |
| `let count = 0` | `let count = $state(0)` |
| `$: doubled = count * 2` | `let doubled = $derived(count * 2)` |
| `on:click={handler}` | `onclick={handler}` |

### Quick Reference

| Need | Query |
|------|-------|
| Modal/Dialog | `findComponent → "modal"` |
| Form inputs | `findComponent → "input"` |
| Data table | `findComponent → "table"` |
| Navigation | `findComponent → "navbar"` |
| Notifications | `findComponent → "toast"` |

## Code Quality Standards

- **TypeScript**: Strict mode enabled, no implicit `any`
- **Naming**: PascalCase for types/components, camelCase for functions
- **Imports**: Use `$lib` alias for library imports
- **Components**: Prefer Flowbite-svelte over custom components
- **Commits**: Follow Conventional Commits (`feat:`, `fix:`, `refactor:`)

## Puppeteer MCP Server (Browser Testing)

This project has access to the **Puppeteer MCP Server** via Docker MCP for browser automation and visual testing.

### Available Puppeteer Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `puppeteer_navigate` | Navigate to a URL | `url` (required), `launchOptions` (optional) |
| `puppeteer_screenshot` | Take a screenshot | `name` (required), `selector`, `width`, `height` |
| `puppeteer_click` | Click an element | `selector` (CSS selector) |
| `puppeteer_fill` | Fill an input field | `selector`, `value` |
| `puppeteer_select` | Select from dropdown | `selector`, `value` |
| `puppeteer_hover` | Hover over element | `selector` |
| `puppeteer_evaluate` | Execute JavaScript | `script` (JS code string) |

### When to Use Puppeteer Testing

1. **After completing UI features** - Verify visual appearance and interactions
2. **Testing user flows** - Multi-step processes like form submissions, navigation
3. **Debugging layout issues** - Take screenshots to inspect CSS/styling problems
4. **Verifying responsive design** - Test different viewport sizes

### Browser Testing Workflow

```text
1. Ensure dev server is running: npm run dev (localhost:5173)
2. puppeteer_navigate → url: "http://localhost:5173/your-route"
3. puppeteer_screenshot → name: "feature-verification"
4. Interact: puppeteer_click, puppeteer_fill, etc.
5. Verify: Take screenshots or use puppeteer_evaluate
```

### Integration with TDD Flow

```text
TDD Flow (Enhanced)
├── 1. Write unit/component tests (vitest)
├── 2. Implement the feature
├── 3. Run npm run quality (type check + unit tests)
├── 4. Browser verification with Puppeteer MCP tools
└── 5. Commit with conventional commit message
```

## Related Documentation

- See `CLAUDE.md` for comprehensive project documentation
- See `AGENTS.md` for agent-specific instructions
