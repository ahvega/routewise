# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RouteWise (formerly PlannerTours) is a transportation quotation SaaS platform for tour companies and fleet operators in Honduras. It calculates trip costs for multiple vehicle types, displays routes via Google Maps, and generates pricing options with different profit margins.

**Key Features**: Route calculation with Google Maps API, multi-tier pricing (10-30% markup), currency conversion (HNL/USD), toll/fuel/meal cost calculations, multi-tenant support, responsive mobile/desktop UI with dark mode.

## Tech Stack (Current - SvelteKit SaaS)

- **Framework**: SvelteKit 2.x with Svelte 5 (runes syntax)
- **Styling**: TailwindCSS 4 with @tailwindcss/vite plugin
- **UI Components**: Flowbite-svelte 1.x (Tailwind-based component library)
- **Icons**: Flowbite-svelte-icons
- **Backend/Database**: Convex (reactive document DB, real-time sync)
- **Authentication**: WorkOS AuthKit (via @workos-inc/node SDK)
- **Maps**: Google Maps JavaScript API
- **Deployment**: Vercel (frontend) + Convex Cloud (backend)
- **PDF Generation**: Puppeteer (planned)
- **Email**: Resend.com (planned)

**Important Version Note**: There is no "SvelteKit 5". The correct naming is:
- SvelteKit 2.x (framework/routing)
- Svelte 5.x (component library with runes syntax)

## Project Structure

```
/                        # SvelteKit project root
├── src/
│   ├── lib/
│   │   ├── components/  # Svelte components
│   │   │   └── layout/  # Layout components (Navbar, etc.)
│   │   ├── auth/        # WorkOS authentication abstraction
│   │   ├── types/       # TypeScript type definitions
│   │   ├── utils/       # Utility functions
│   │   ├── services/    # Business logic services
│   │   └── stores/      # Svelte stores (using runes)
│   ├── routes/          # SvelteKit file-based routing
│   │   ├── +page.svelte      # Dashboard
│   │   ├── +layout.svelte    # Root layout
│   │   ├── quotations/       # Quotation management
│   │   ├── clients/          # Client management
│   │   ├── vehicles/         # Vehicle fleet
│   │   ├── drivers/          # Driver management
│   │   └── settings/         # System settings
│   ├── app.css          # TailwindCSS with Flowbite plugin
│   ├── app.html         # HTML template
│   └── app.d.ts         # SvelteKit type definitions
├── convex/
│   └── schema.ts        # Convex database schema
├── legacy/              # Previous Next.js implementation (reference)
│   ├── src/             # Next.js source code
│   └── public/data/     # JSON data files for migration
└── static/              # Static assets
```

## Development Commands

```bash
npm run dev        # Start dev server (localhost:5173)
npm run build      # Production build
npm run preview    # Preview production build
npm run check      # TypeScript and Svelte checks
npm run test       # Run tests in watch mode
npm run test:run   # Run tests once
npm run quality    # Run type checks + tests (use before commits)
npx convex dev     # Start Convex development server
```

## Development Server Scripts (PowerShell)

Use these scripts to manage the Convex and SvelteKit development servers:

### Start Servers: `start-srv.ps1`

Stops existing servers, updates Convex, and starts fresh dev servers.

```powershell
# Full restart with Convex update (recommended)
.\start-srv.ps1

# Skip Convex package update
.\start-srv.ps1 -SkipUpdate

# Start only SvelteKit (skip Convex)
.\start-srv.ps1 -SkipConvex

# Start only Convex (skip SvelteKit)
.\start-srv.ps1 -SkipSvelte
```

**What it does:**
1. Updates Convex to latest version (`npm install convex@latest`)
2. Kills processes on ports 3210, 5173, 5174
3. Starts Convex dev server (port 3210) in new window
4. Starts SvelteKit dev server (port 5173) in new window

### Stop Servers: `stop-srv.ps1`

Stops all development servers without restarting.

```powershell
# Stop all dev servers
.\stop-srv.ps1
```

**What it does:**
- Kills processes on ports 3210 (Convex), 5173, 5174 (SvelteKit)
- Verifies ports are free

### When to Use

| Scenario | Command |
|----------|---------|
| Start fresh dev session | `.\start-srv.ps1` |
| Restart after Convex schema changes | `.\start-srv.ps1` |
| Update Convex and restart | `.\start-srv.ps1` |
| Quick restart (no update) | `.\start-srv.ps1 -SkipUpdate` |
| Stop everything | `.\stop-srv.ps1` |
| Port conflict issues | `.\stop-srv.ps1` then `.\start-srv.ps1` |

## Environment Setup

1. Copy `.env.example` to `.env` and configure:
   ```bash
   # Required
   PUBLIC_CONVEX_URL=https://your-project.convex.cloud
   PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key

   # WorkOS Authentication
   WORKOS_API_KEY=sk_live_...
   WORKOS_CLIENT_ID=client_...
   WORKOS_REDIRECT_URI=http://localhost:5173/auth/callback
   ```

2. Install dependencies: `npm install`

3. Start dev server: `npm run dev`

4. (Optional) Start Convex: `npx convex dev`

## Key Architecture Patterns

### Svelte 5 Runes

The project uses Svelte 5's runes syntax for reactivity:

```svelte
<script lang="ts">
  let count = $state(0);           // Reactive state
  let doubled = $derived(count * 2); // Computed value

  $effect(() => {                   // Side effects
    console.log('Count changed:', count);
  });

  let { data } = $props();          // Component props
</script>
```

### Convex Integration

```svelte
<!-- In +layout.svelte -->
<script>
  import { setupConvex } from 'convex-svelte';
  setupConvex(PUBLIC_CONVEX_URL);
</script>

<!-- In components -->
<script>
  import { useQuery, useConvexClient } from 'convex-svelte';
  import { api } from '../convex/_generated/api';

  const vehicles = useQuery(api.vehicles.list, () => ({ tenantId }));
  const client = useConvexClient();

  async function createVehicle(data) {
    await client.mutation(api.vehicles.create, data);
  }
</script>
```

### Flowbite-svelte Components

```svelte
<script>
  import { Button, Card, Table, Modal, DarkMode } from 'flowbite-svelte';
  import { PlusOutline } from 'flowbite-svelte-icons';
</script>

<Card>
  <Button on:click={handleClick}>
    <PlusOutline class="w-4 h-4 mr-2" />
    Add Item
  </Button>
</Card>
```

### Dark Mode (Default)

```css
/* In app.css */
@import 'tailwindcss';
@plugin 'flowbite/plugin';
@custom-variant dark (&:where(.dark, .dark *));
```

```html
<!-- In app.html -->
<html lang="en" class="dark">
```

### Service Layer Pattern

Business logic is encapsulated in services (`src/lib/services/`):

```typescript
// CostCalculationService.ts
export class CostCalculationService {
  async calculateTotalCosts(request: CostCalculationRequest): Promise<DetailedCosts>
  calculateFuelCosts(distance: number, vehicle: Vehicle): FuelCosts
  calculateDriverExpenses(days: number, params: SystemParameters): DriverExpenses
}

export const costCalculationService = new CostCalculationService();
```

## Core Services

### CostCalculationService

Main cost calculation engine with specialized calculators:
- **FuelCalculator**: Fuel consumption and refueling costs
- **DriverExpenseCalculator**: Meals, lodging, incentives
- **VehicleCostCalculator**: Per-day and per-km costs
- **TollCalculator**: Honduras-specific toll costs

### PricingService

Generates pricing options with configurable markups:
- Standard markup options: 10%, 15%, 20%, 25%, 30%
- Client discount application
- Dual currency display (HNL/USD)

## Cost Calculation Modes

Controlled by checkbox flags:
- **includeFuel**: When `false`, fuel costs shown but not in total (rent-a-car mode)
- **includeMeals**: When `false`, meal costs excluded
- **includeTolls**: When `false`, toll costs excluded
- **includeDriverIncentive**: When `false`, driver incentive excluded

All costs are calculated regardless of flags for itemized display.

## Multi-Tenant Architecture

- **Application-level filtering**: Convex queries filter by tenantId
- **Tenant isolation**: All entities include tenantId field
- **Indexes**: `by_tenant` index on all tables for efficient queries
- **Row-Level Security**: Planned via Convex authentication hooks

## Database Schema (Convex)

```typescript
// convex/schema.ts
tenants       // Organization accounts
users         // User accounts with RBAC roles
vehicles      // Vehicle fleet with costs/capacity
parameters    // System parameters by year
clients       // Individual/company clients
drivers       // Driver roster
quotations    // Quotations with full cost breakdown
```

## Legacy Reference

The `legacy/` folder contains the previous Next.js implementation:
- **Business logic**: Reusable services ported to `src/lib/services/`
- **Types**: Adapted for Convex in `src/lib/types/`
- **JSON data**: Reference for data migration (`legacy/public/data/`)

Do NOT modify legacy code - it's for reference only.

## Code Quality Standards

- **TypeScript**: Strict mode enabled, no implicit `any`
- **Naming**: PascalCase for types/components, camelCase for functions
- **Imports**: Use `$lib` alias for library imports
- **Components**: Prefer Flowbite-svelte over custom components
- **Commits**: Follow Conventional Commits (`feat:`, `fix:`, `refactor:`)

## Test-Driven Development (TDD) Practice

After completing a major feature, follow this TDD workflow:

### 1. Write Tests
Create tests in `src/tests/` mirroring the source structure:
```
src/tests/
├── setup.ts           # Test setup and mocks
├── components/        # Component tests
│   ├── HeroLanding.test.ts
│   └── SessionTimeout.test.ts
└── services/          # Service tests
```

### 2. Test File Structure
```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import MyComponent from '$lib/components/MyComponent.svelte';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(MyComponent);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });
});
```

### 3. Quality Assurance Checklist
Before committing major features:
1. **Type Check**: `npm run check` - Ensure no TypeScript errors
2. **Run Tests**: `npm run test:run` - All tests must pass
3. **Quick Check**: `npm run quality` - Combined type + test check
4. **Browser Test**: Use Puppeteer MCP tools for visual verification (see "Puppeteer MCP Server" section)

### 4. Commit Workflow
```bash
# 1. Run quality checks
npm run quality

# 2. Stage changes
git add -A

# 3. Commit with conventional commit message
git commit -m "feat(feature-name): description of changes"
```

### 5. Testing Libraries
- **vitest**: Test runner (compatible with Vite)
- **@testing-library/svelte**: Component testing
- **@testing-library/jest-dom**: DOM matchers

### 6. Mocking Patterns
Mock SvelteKit modules in `src/tests/setup.ts`:
```typescript
// Mock $app/navigation
vi.mock('$app/navigation', () => ({
  goto: vi.fn(),
  invalidate: vi.fn()
}));

// Mock svelte-i18n
vi.mock('svelte-i18n', () => ({
  t: { subscribe: (fn) => { fn((key) => key); return () => {}; } }
}));
```

## Common Tasks

**Adding a new route**:
1. Create folder in `src/routes/`
2. Add `+page.svelte` (and `+page.server.ts` if needed)
3. Update Navbar links

**Adding a Convex table**:
1. Define table in `convex/schema.ts`
2. Create queries/mutations in `convex/` folder
3. Update types in `src/lib/types/`

**Creating a new component**:
1. Create in appropriate `src/lib/components/` subfolder
2. Export from barrel file (`index.ts`)
3. Use Flowbite-svelte base components when possible

## Svelte MCP Server (Official Documentation)

This project has access to the **Official Svelte MCP Server** (`https://mcp.svelte.dev/mcp`) which provides up-to-date Svelte 5 and SvelteKit documentation directly from svelte.dev. **Use this MCP server when writing Svelte code** to ensure correct syntax and best practices.

### Why Use the Svelte MCP Server

- **Up-to-date documentation**: Direct access to official svelte.dev/docs content
- **Code validation**: Static analysis to catch issues before delivery
- **Best practices**: Guidance on Svelte 5 runes, SvelteKit patterns, and more
- **Playground links**: Generate shareable code examples

### Available Tools

| Tool | Description | When to Use |
|------|-------------|-------------|
| `list-sections` | List available documentation sections | First call to discover what docs are available |
| `get-documentation` | Retrieve full documentation for sections | Get detailed docs on specific topics |
| `svelte-autofixer` | Analyze code and suggest fixes | **ALWAYS** run before delivering code |
| `playground-link` | Generate Svelte Playground link | Share code examples (user confirmation required) |

### Required Workflow for Writing Svelte Code

**IMPORTANT**: Follow this workflow when writing Svelte/SvelteKit code:

```
Step 1: Discover relevant docs
        list-sections → Find documentation for your task

Step 2: Get detailed documentation
        get-documentation → Retrieve docs for specific sections
        (e.g., "svelte/runes", "kit/routing", "kit/form-actions")

Step 3: Write the code
        Implement using patterns from the documentation

Step 4: Validate with autofixer (REQUIRED)
        svelte-autofixer → Analyze your code
        Fix any issues reported
        Repeat until no issues remain

Step 5: Deliver the code
        Only after autofixer passes with no issues
```

### Documentation Sections

The Svelte MCP server provides documentation across these categories:

**Svelte 5 Core**
- Runes (`$state`, `$derived`, `$effect`, `$props`, `$bindable`)
- Template syntax (control flow, bindings, actions)
- Component lifecycle and composition
- Styling and CSS

**SvelteKit**
- Routing (pages, layouts, groups, params)
- Loading data (`load` functions, `+page.server.ts`)
- Form actions and progressive enhancement
- Hooks and middleware
- Deployment adapters

**CLI Tools**
- `sv` commands for project management
- Adding integrations (`sv add`)

### Example: Using Svelte MCP for a New Feature

**Task**: Create a form with server-side validation

```
1. list-sections
   → Find: "kit/form-actions", "kit/load", "svelte/bindings"

2. get-documentation → sections: ["kit/form-actions", "kit/load"]
   → Get complete docs on SvelteKit forms and data loading

3. Write the code following the documented patterns

4. svelte-autofixer → code: "<your generated code>"
   → Returns: [{ issue: "...", suggestion: "..." }]
   → Fix issues and run again until clean

5. Deliver validated code to user
```

### Svelte Autofixer Usage

The `svelte-autofixer` tool uses static analysis to identify:

- Incorrect runes syntax
- Deprecated patterns (Svelte 4 → Svelte 5)
- SvelteKit routing issues
- Component prop misuse
- Accessibility concerns

**Example autofixer loop:**
```
Run 1: svelte-autofixer → 3 issues found
       Fix: Change `export let` to `$props()`
       Fix: Change `on:click` to `onclick`
       Fix: Add missing type annotation

Run 2: svelte-autofixer → 0 issues found
       ✓ Code is ready to deliver
```

### MCP Server Configuration

Located in `.claude/.mcp.json`:
```json
{
  "mcpServers": {
    "svelte": {
      "type": "http",
      "url": "https://mcp.svelte.dev/mcp"
    }
  }
}
```

### Quick Reference: Common Documentation Sections

| Task | Documentation Section |
|------|----------------------|
| State management | `svelte/runes` |
| Component props | `svelte/component-fundamentals` |
| Event handling | `svelte/event-handlers` |
| Two-way binding | `svelte/bindings` |
| Routing | `kit/routing` |
| Data loading | `kit/load` |
| Form handling | `kit/form-actions` |
| Server hooks | `kit/hooks` |
| Error handling | `kit/errors` |

## Convex MCP Server (Database Operations)

This project has access to the **Convex MCP Server** which allows AI agents to interact directly with your Convex deployment. **Use this when working with database operations, debugging functions, or managing environment variables.**

### Why Use the Convex MCP Server

- **Live data access**: Query and browse actual database contents
- **Function execution**: Run deployed Convex functions with arguments
- **Debugging**: Access function execution logs
- **Schema inspection**: View table structures and inferred schemas
- **Environment management**: Manage deployment environment variables

### Available Tools

| Tool | Description | Use Case |
|------|-------------|----------|
| `status` | Get available deployments | **First call** to get deployment selector |
| `tables` | List all tables with schemas | Discover database structure |
| `data` | Browse documents in a table | Inspect actual data records |
| `runOneoffQuery` | Execute read-only JS queries | Custom data analysis |
| `functionSpec` | Get function metadata | Understand function interfaces |
| `run` | Execute deployed functions | Trigger backend operations |
| `logs` | Get recent function logs | Debug function execution |
| `envList` | List environment variables | View all env vars |
| `envGet` | Get specific env var value | Check configuration |
| `envSet` | Create/update env var | Configure deployment |
| `envRemove` | Delete env var | Remove configuration |

### Required Workflow

**IMPORTANT**: Always start with `status` to get a deployment selector:

```
Step 1: status
        → Returns deployment selector for use with other tools

Step 2: Use other tools with the deployment selector
        → tables, data, functionSpec, run, logs, etc.
```

### Tool Categories

**Data Inspection**
```
status → Get deployment selector
tables → View all tables and schemas
data → Browse documents (with pagination)
runOneoffQuery → Execute custom read-only queries
```

**Function Operations**
```
functionSpec → Get function metadata (type, visibility, interface)
run → Execute function with arguments
logs → View recent execution logs (structured objects)
```

**Environment Management**
```
envList → List all environment variables
envGet → Get specific variable value
envSet → Create or update variable
envRemove → Delete variable
```

### Example: Debugging a Function

```
1. status → Get deployment selector

2. functionSpec → name: "api.vehicles.list"
   → Returns: type, visibility, arguments, return type

3. run → function: "api.vehicles.list", args: { tenantId: "..." }
   → Execute and see results

4. logs → View recent execution logs for debugging
```

### Example: Inspecting Data

```
1. status → Get deployment selector

2. tables → List all tables
   → Returns: vehicles, clients, quotations, etc. with schemas

3. data → table: "vehicles"
   → Browse vehicle documents with pagination

4. runOneoffQuery → query: "db.query('vehicles').filter(...)"
   → Custom read-only query (cannot modify data)
```

### Limitations

- `runOneoffQuery` is **read-only** - cannot modify database
- All tools require a deployment selector from `status`
- `run` executes deployed functions only (not local/uncommitted code)

### MCP Server Configuration

Located in `.claude/.mcp.json`:
```json
{
  "mcpServers": {
    "convex": {
      "type": "stdio",
      "command": "npx",
      "args": ["convex", "mcp", "start"]
    }
  }
}
```

### Quick Reference

| Task | Tool(s) |
|------|---------|
| View database schema | `status` → `tables` |
| Browse table data | `status` → `data` |
| Custom data query | `status` → `runOneoffQuery` |
| Run a function | `status` → `run` |
| Debug function | `status` → `logs` |
| Check env vars | `status` → `envList` / `envGet` |
| Set env var | `status` → `envSet` |

## Flowbite-Svelte MCP Server

This project has access to the **Flowbite-Svelte MCP Server** which provides AI assistants with comprehensive component documentation, usage examples, and best practices. **ALWAYS use this MCP server when implementing UI components** to ensure you're using the correct, up-to-date syntax.

### Why Use the MCP Server

- **Up-to-date documentation**: Local copy of official LLM-optimized docs from flowbite-svelte.com
- **Correct Svelte 5 syntax**: Examples use runes (`$state`, `$derived`, `$props`) not legacy syntax
- **Proper imports**: Get exact import statements for each component
- **Props and events**: Complete prop definitions with TypeScript types
- **Best practices**: Semantic usage guidelines and accessibility considerations

### Available MCP Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `findComponent` | Find component by name/term | `query` (e.g., "Button", "form checkbox") |
| `getComponentDoc` | Get full documentation | `component` (doc path from findComponent) |
| `getComponentList` | List all available docs | None |
| `searchDocs` | Full-text search in docs | `query` (search term) |

### Tool Usage Workflow

**IMPORTANT**: Always follow this workflow when implementing Flowbite-Svelte components:

```
Step 1: findComponent → query: "button"
        Returns: { match: "buttons", category: "components", docUrl: "buttons", components: ["Button", "GradientButton"] }

Step 2: getComponentDoc → component: "buttons"
        Returns: Full markdown documentation with:
        - Import statements
        - Code examples with Svelte 5 syntax
        - Props table
        - Events and slots
        - Best practices

Step 3: Implement using the documented syntax
```

### Component Categories

The MCP server provides documentation for 75+ components across these categories:

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

### Example: Implementing a Button

**Step 1**: Find the component
```
findComponent → query: "button"
```

**Step 2**: Get documentation
```
getComponentDoc → component: "buttons"
```

**Step 3**: Implementation (from docs)
```svelte
<script lang="ts">
  import { Button } from "flowbite-svelte";
</script>

<Button>Default</Button>
<Button color="alternative">Alternative</Button>
<Button color="red">Delete</Button>
<Button pill>Rounded</Button>
<Button href="/path">Link Button</Button>
```

### Example: Implementing a Form

**Step 1**: Find form components
```
findComponent → query: "input"
findComponent → query: "select"
```

**Step 2**: Get documentation for each
```
getComponentDoc → component: "forms/input-field"
getComponentDoc → component: "forms/select"
```

**Step 3**: Implementation (from docs)
```svelte
<script lang="ts">
  import { Input, Label, Select, Button } from "flowbite-svelte";

  let name = $state("");
  let country = $state("");

  const countries = [
    { value: "hn", name: "Honduras" },
    { value: "us", name: "United States" }
  ];
</script>

<Label for="name">Name</Label>
<Input id="name" bind:value={name} placeholder="Enter name" />

<Label for="country">Country</Label>
<Select id="country" bind:value={country} items={countries} />

<Button type="submit">Submit</Button>
```

### Ensuring Up-to-Date Syntax

**CRITICAL**: Flowbite-Svelte 1.x uses Svelte 5 runes syntax. Always verify:

| Old Syntax (Svelte 4) | New Syntax (Svelte 5) |
|-----------------------|-----------------------|
| `export let value` | `let { value } = $props()` |
| `let count = 0` | `let count = $state(0)` |
| `$: doubled = count * 2` | `let doubled = $derived(count * 2)` |
| `on:click={handler}` | `onclick={handler}` |
| `bind:value` | `bind:value` (unchanged) |

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

### Quick Reference Queries

| Need | Tool | Query |
|------|------|-------|
| Modal dialog | findComponent | "modal" or "dialog" |
| Form inputs | findComponent | "input", "select", "checkbox" |
| Data table | findComponent | "table" |
| Navigation | findComponent | "navbar", "sidebar", "breadcrumb" |
| Notifications | findComponent | "toast", "alert" |
| Loading states | findComponent | "spinner", "skeleton" |
| Dark mode toggle | findComponent | "darkmode" |
| Date selection | findComponent | "datepicker" |

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

### Browser Testing Workflow

After completing UI features, use Puppeteer to verify the implementation:

```
1. Start dev server: npm run dev (ensure it's running on localhost:5173)
2. Navigate to the page: puppeteer_navigate → url: "http://localhost:5173/your-route"
3. Take screenshot: puppeteer_screenshot → name: "feature-verification"
4. Interact with elements: puppeteer_click, puppeteer_fill, etc.
5. Verify results: Take another screenshot or use puppeteer_evaluate
```

### Example Testing Scenarios

**Testing a form submission:**
```
1. puppeteer_navigate → url: "http://localhost:5173/clients/new"
2. puppeteer_fill → selector: "#name", value: "Test Client"
3. puppeteer_fill → selector: "#email", value: "test@example.com"
4. puppeteer_click → selector: "button[type='submit']"
5. puppeteer_screenshot → name: "form-submitted"
```

**Testing navigation and layout:**
```
1. puppeteer_navigate → url: "http://localhost:5173"
2. puppeteer_screenshot → name: "dashboard-initial"
3. puppeteer_click → selector: "[data-testid='sidebar-vehicles']"
4. puppeteer_screenshot → name: "vehicles-page"
```

**Testing responsive design:**
```
1. puppeteer_navigate → url: "http://localhost:5173", launchOptions: { defaultViewport: { width: 375, height: 667 } }
2. puppeteer_screenshot → name: "mobile-view", width: 375, height: 667
```

### When to Use Puppeteer Testing

Use Puppeteer MCP tools in these scenarios:

1. **After completing UI features** - Verify visual appearance and interactions
2. **Testing user flows** - Multi-step processes like form submissions, navigation
3. **Debugging layout issues** - Take screenshots to inspect CSS/styling problems
4. **Verifying responsive design** - Test different viewport sizes
5. **Before committing UI changes** - Quick visual regression check

### Integration with TDD Flow

Puppeteer browser testing complements the existing TDD workflow:

```
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

## Related Documentation

- `PT_MIGRATION_TO_SAAS_PLAN.md` - SaaS transformation analysis
- `DEVELOPMENT_ROADMAP.md` - Implementation phases
- `legacy/` folder - Previous Next.js implementation reference
