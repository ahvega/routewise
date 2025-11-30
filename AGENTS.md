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

## Development Server Scripts (PowerShell)

Use these scripts to manage Convex and SvelteKit development servers:

### Start Servers: `start-srv.ps1`

```powershell
.\start-srv.ps1              # Full restart with Convex update (recommended)
.\start-srv.ps1 -SkipUpdate  # Skip Convex package update
.\start-srv.ps1 -SkipConvex  # Start only SvelteKit
.\start-srv.ps1 -SkipSvelte  # Start only Convex
```

**Actions:**
1. Updates Convex to latest (`npm install convex@latest`)
2. Kills processes on ports 3210, 5173, 5174
3. Starts Convex dev server (port 3210) in new window
4. Starts SvelteKit dev server (port 5173) in new window

### Stop Servers: `stop-srv.ps1`

```powershell
.\stop-srv.ps1  # Stop all dev servers
```

**Actions:** Kills processes on ports 3210 (Convex), 5173/5174 (SvelteKit)

### When to Use

| Scenario | Command |
|----------|---------|
| Start fresh dev session | `.\start-srv.ps1` |
| Restart after schema changes | `.\start-srv.ps1` |
| Quick restart (no update) | `.\start-srv.ps1 -SkipUpdate` |
| Stop everything | `.\stop-srv.ps1` |
| Port conflict issues | `.\stop-srv.ps1` then `.\start-srv.ps1` |

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
- Use Puppeteer MCP tools for browser verification after UI changes (see "Puppeteer MCP Server" section)

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

## Svelte MCP Server (Official Documentation)

This project has access to the **Official Svelte MCP Server** (`https://mcp.svelte.dev/mcp`) providing up-to-date Svelte 5 and SvelteKit documentation directly from svelte.dev. **Use this when writing any Svelte code.**

### Why Use the Svelte MCP Server

- **Up-to-date documentation**: Direct access to official svelte.dev/docs
- **Code validation**: Static analysis via `svelte-autofixer`
- **Best practices**: Svelte 5 runes, SvelteKit patterns
- **Playground links**: Generate shareable code examples

### Available Tools

| Tool | Description | When to Use |
|------|-------------|-------------|
| `list-sections` | List available doc sections | First call to discover docs |
| `get-documentation` | Get full documentation | Retrieve specific topic docs |
| `svelte-autofixer` | Analyze code for issues | **ALWAYS** before delivering code |
| `playground-link` | Generate playground link | Share examples (requires user confirmation) |

### Required Workflow for Svelte Code

**IMPORTANT**: Always follow this workflow when writing Svelte/SvelteKit code:

```text
Step 1: list-sections
        → Discover relevant documentation sections

Step 2: get-documentation → sections: ["svelte/runes", "kit/routing"]
        → Get detailed docs on specific topics

Step 3: Write the code
        → Implement using patterns from documentation

Step 4: svelte-autofixer → code: "<your generated code>"
        → Analyze for issues
        → Fix and repeat until no issues remain

Step 5: Deliver validated code
        → Only after autofixer passes
```

### Documentation Categories

**Svelte 5 Core**
- Runes: `$state`, `$derived`, `$effect`, `$props`, `$bindable`
- Template syntax, bindings, actions
- Component lifecycle

**SvelteKit**
- Routing: pages, layouts, groups, params
- Data loading: `load` functions, `+page.server.ts`
- Form actions and progressive enhancement
- Hooks and middleware

### Svelte Autofixer

The `svelte-autofixer` uses static analysis to identify:
- Incorrect runes syntax
- Deprecated Svelte 4 patterns
- SvelteKit routing issues
- Accessibility concerns

**Always run autofixer in a loop until clean:**
```text
Run 1: 3 issues → Fix them
Run 2: 1 issue → Fix it
Run 3: 0 issues → ✓ Ready to deliver
```

### Quick Reference

| Task | Section |
|------|---------|
| State management | `svelte/runes` |
| Component props | `svelte/component-fundamentals` |
| Routing | `kit/routing` |
| Data loading | `kit/load` |
| Form handling | `kit/form-actions` |
| Server hooks | `kit/hooks` |

## Convex MCP Server (Database Operations)

This project has access to the **Convex MCP Server** which allows AI agents to interact directly with the Convex deployment. **Use this when working with database operations, debugging functions, or managing environment variables.**

### Why Use the Convex MCP Server

- **Live data access**: Query and browse actual database contents
- **Function execution**: Run deployed Convex functions
- **Debugging**: Access function execution logs
- **Schema inspection**: View table structures and schemas
- **Environment management**: Manage deployment env vars

### Available Tools

| Tool | Description | Use Case |
|------|-------------|----------|
| `status` | Get deployment selector | **Always call first** |
| `tables` | List all tables with schemas | Discover database structure |
| `data` | Browse documents in a table | Inspect actual data |
| `runOneoffQuery` | Execute read-only JS queries | Custom data analysis |
| `functionSpec` | Get function metadata | Understand function interfaces |
| `run` | Execute deployed functions | Trigger backend operations |
| `logs` | Get recent function logs | Debug execution |
| `envList/Get/Set/Remove` | Manage environment variables | Configure deployment |

### Required Workflow

**IMPORTANT**: Always start with `status` to get a deployment selector:

```text
Step 1: status
        → Returns deployment selector for use with other tools

Step 2: Use other tools with the deployment selector
        → tables, data, run, logs, etc.
```

### Tool Categories

**Data Inspection**
- `tables` - View all tables and schemas
- `data` - Browse documents (with pagination)
- `runOneoffQuery` - Execute read-only queries

**Function Operations**
- `functionSpec` - Get function metadata
- `run` - Execute function with arguments
- `logs` - View execution logs

**Environment Management**
- `envList`, `envGet`, `envSet`, `envRemove`

### Example: Debugging a Function

```text
1. status → Get deployment selector
2. functionSpec → name: "api.vehicles.list"
3. run → function: "api.vehicles.list", args: { tenantId: "..." }
4. logs → View execution logs
```

### Limitations

- `runOneoffQuery` is **read-only** - cannot modify database
- All tools require deployment selector from `status`
- `run` executes deployed functions only

### Quick Reference

| Task | Tools |
|------|-------|
| View schema | `status` → `tables` |
| Browse data | `status` → `data` |
| Run function | `status` → `run` |
| Debug | `status` → `logs` |
| Check env | `status` → `envList` |

## Flowbite-Svelte MCP Server

This project has access to the **Flowbite-Svelte MCP Server** for AI-assisted UI development. **ALWAYS use this MCP server when implementing UI components** to ensure correct, up-to-date Svelte 5 syntax.

### Why Use the MCP Server

- **Up-to-date documentation**: Local copy of official LLM-optimized docs
- **Correct Svelte 5 syntax**: Examples use runes (`$state`, `$derived`, `$props`)
- **Proper imports**: Exact import statements for each component
- **Props and events**: Complete TypeScript prop definitions
- **Best practices**: Semantic usage and accessibility guidelines

### Available MCP Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `findComponent` | Find component by name/term | `query` (e.g., "Button", "modal") |
| `getComponentDoc` | Get full documentation | `component` (doc path from findComponent) |
| `getComponentList` | List all available docs | None |
| `searchDocs` | Full-text search in docs | `query` (search term) |

### Required Workflow

**IMPORTANT**: Always follow this workflow when implementing Flowbite-Svelte components:

```text
Step 1: findComponent → query: "button"
        Returns: { match: "buttons", category: "components", docUrl: "buttons",
                   components: ["Button", "GradientButton"] }

Step 2: getComponentDoc → component: "buttons"
        Returns: Full markdown documentation with:
        - Import statements
        - Code examples with Svelte 5 syntax
        - Props table with TypeScript types
        - Events and slots
        - Best practices

Step 3: Implement using the documented syntax (not from memory!)
```

### Component Categories (75+ components)

**Components (40+)**
- Layout: Navbar, Sidebar, Footer, Drawer, Modal, Dialog
- Data Display: Table, Card, Badge, Avatar, Timeline, Rating
- Feedback: Alert, Toast, Spinner, Progress, Skeleton
- Navigation: Breadcrumb, Pagination, Tabs, BottomNav, MegaMenu
- Overlays: Dropdown, Popover, Tooltip, SpeedDial
- Media: Carousel, Gallery, Video, DeviceMockup

**Forms (15+)**
- Input, Textarea, Select, MultiSelect, Checkbox, Radio, Toggle
- FloatingLabelInput, Range, Search, Fileupload, Dropzone
- Datepicker, Timepicker, PhoneInput, Tags

**Typography**
- Heading, P (Paragraph), A (Link), List, Blockquote, Hr, Img, Mark, Span

**Extended Components**
- CommandPalette, KanbanBoard, StepIndicator, Tour, SplitPane
- VirtualList, VirtualMasonry, ScrollSpy, ClipboardManager

### Svelte 5 Syntax Reference

**CRITICAL**: Flowbite-Svelte 1.x requires Svelte 5 runes syntax:

| Old Syntax (Svelte 4) | New Syntax (Svelte 5) |
|-----------------------|-----------------------|
| `export let value` | `let { value } = $props()` |
| `let count = 0` | `let count = $state(0)` |
| `$: doubled = count * 2` | `let doubled = $derived(count * 2)` |
| `on:click={handler}` | `onclick={handler}` |
| `bind:value` | `bind:value` (unchanged) |

### Example: Implementing a Component

**Step 1**: Find the component
```text
findComponent → query: "modal"
```

**Step 2**: Get documentation
```text
getComponentDoc → component: "modal"
```

**Step 3**: Implement using documented syntax
```svelte
<script lang="ts">
  import { Button, Modal } from "flowbite-svelte";

  let showModal = $state(false);
</script>

<Button onclick={() => showModal = true}>Open Modal</Button>

<Modal title="Confirmation" bind:open={showModal}>
  <p>Are you sure you want to proceed?</p>
  <svelte:fragment slot="footer">
    <Button onclick={() => showModal = false}>Cancel</Button>
    <Button color="red">Confirm</Button>
  </svelte:fragment>
</Modal>
```

### Quick Reference Queries

| Need | Tool | Query |
|------|------|-------|
| Modal/Dialog | findComponent | "modal" or "dialog" |
| Form inputs | findComponent | "input", "select", "checkbox" |
| Data table | findComponent | "table" |
| Navigation | findComponent | "navbar", "sidebar" |
| Notifications | findComponent | "toast", "alert" |
| Loading states | findComponent | "spinner", "skeleton" |
| Dark mode | findComponent | "darkmode" |

### MCP Server Configuration

Located in `.claude/.mcp.json`:
```json
{
  "mcpServers": {
    "flowbite-svelte": {
      "type": "stdio",
      "command": "node",
      "args": ["e:\\MyDevTools\\flowbite-svelte-mcp\\build\\server.js"]
    }
  }
}
```

## Puppeteer MCP Server (Browser Testing)

This project has access to the **Puppeteer MCP Server** via Docker MCP for browser automation and visual testing. Use it to verify UI features after completing implementation tasks.

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

Use Puppeteer MCP tools in these scenarios:

1. **After completing UI features** - Verify visual appearance and interactions
2. **Testing user flows** - Multi-step processes like form submissions, navigation
3. **Debugging layout issues** - Take screenshots to inspect CSS/styling problems
4. **Verifying responsive design** - Test different viewport sizes
5. **Before committing UI changes** - Quick visual regression check

### Browser Testing Workflow

```text
1. Ensure dev server is running: npm run dev (localhost:5173)
2. puppeteer_navigate → url: "http://localhost:5173/your-route"
3. puppeteer_screenshot → name: "feature-verification"
4. Interact: puppeteer_click, puppeteer_fill, etc.
5. Verify: Take screenshots or use puppeteer_evaluate
```

### Example Testing Scenarios

**Testing a form submission:**
```text
1. puppeteer_navigate → url: "http://localhost:5173/clients/new"
2. puppeteer_fill → selector: "#name", value: "Test Client"
3. puppeteer_fill → selector: "#email", value: "test@example.com"
4. puppeteer_click → selector: "button[type='submit']"
5. puppeteer_screenshot → name: "form-submitted"
```

**Testing navigation:**
```text
1. puppeteer_navigate → url: "http://localhost:5173"
2. puppeteer_screenshot → name: "dashboard"
3. puppeteer_click → selector: "[data-testid='nav-vehicles']"
4. puppeteer_screenshot → name: "vehicles-page"
```

### Integration with TDD Flow

Puppeteer browser testing complements the existing TDD workflow:

```text
TDD Flow (Enhanced)
├── 1. Write unit/component tests (vitest + @testing-library/svelte)
├── 2. Implement the feature
├── 3. Run npm run quality (type check + unit tests)
├── 4. Browser verification with Puppeteer MCP tools
│   ├── Navigate to the feature page
│   ├── Take screenshots for visual verification
│   ├── Test user interactions (clicks, forms, navigation)
│   └── Verify expected behavior
└── 5. Commit with conventional commit message
```
