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
4. **Manual Test**: Verify feature works in browser

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

## Related Documentation

- `PT_MIGRATION_TO_SAAS_PLAN.md` - SaaS transformation analysis
- `DEVELOPMENT_ROADMAP.md` - Implementation phases
- `legacy/` folder - Previous Next.js implementation reference
