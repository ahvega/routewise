# RouteWise Development Roadmap

**Project**: RouteWise (formerly PlannerTours)
**Stack**: SvelteKit + WorkOS + Convex (Scenario 2)
**Timeline**: 14-18 weeks
**Start Date**: TBD
**Target Launch**: TBD + 18 weeks

---

## Executive Summary

Transform PlannerTours from a single-tenant JSON-based quotation calculator into RouteWise, a multi-tenant SaaS platform for transportation quotation and fleet management.

### Key Metrics

| Metric | Target |
|--------|--------|
| **Timeline** | 14-18 weeks |
| **MVP Cost** | $20/month |
| **Growth Cost** | $141-150/month |
| **Year 1 ARR** | $84,960 (run-rate) |
| **Break-even** | Month 3-4 |
| **Target Customers** | 33 |

---

## Technology Stack

| Layer | Technology | Account Required |
|-------|------------|------------------|
| Frontend | SvelteKit 2.x | - |
| Language | TypeScript 5.x | - |
| **Styling** | **TailwindCSS 4** | - |
| **UI Components** | **Flowbite-svelte** | - |
| Backend/DB | Convex | convex.dev |
| Auth | WorkOS AuthKit | workos.com |
| Hosting | Vercel | vercel.com |
| PDF | Puppeteer | - |
| Email | Resend | resend.com |
| Maps | Google Maps API | Google Cloud Console |
| Monitoring | Sentry | sentry.io |
| Domain | routewise.app | Domain registrar |

### UI/UX Requirements

- **Default Theme**: Dark mode (with light mode toggle)
- **Theme Switching**: Icon toggle in header/navbar
- **Component Library**: Flowbite-svelte (Tailwind-based components)
- **Icons**: Flowbite icons + Heroicons

---

## Phase 0: Learning & Project Setup (Weeks 1-2)

### Week 1: Team Training

**Objective**: Get team comfortable with Svelte fundamentals

#### Day 1-2: Svelte Basics

- [ ] Complete [Svelte Tutorial](https://learn.svelte.dev/) (official)
- [ ] Understand reactivity (`$:`, `bind:`, stores)
- [ ] Practice component composition
- [ ] Compare with React patterns

#### Day 3-4: SvelteKit

- [ ] Complete [SvelteKit Tutorial](https://learn.svelte.dev/tutorial/introducing-sveltekit)
- [ ] Understand file-based routing (`+page.svelte`, `+layout.svelte`)
- [ ] Server-side rendering vs client-side
- [ ] Form actions and progressive enhancement
- [ ] Load functions (`+page.ts`, `+page.server.ts`)

#### Day 5: Convex Basics

- [ ] Complete [Convex Tutorial](https://docs.convex.dev/tutorial)
- [ ] Understand schema definition
- [ ] Mutations and queries
- [ ] Real-time subscriptions
- [ ] TypeScript integration

**Deliverables**:

- [ ] Each team member completes Svelte tutorial
- [ ] Each team member completes SvelteKit tutorial
- [ ] Each team member completes Convex tutorial
- [ ] Team can build simple CRUD app in SvelteKit + Convex

### Week 2: Project Setup

#### Day 1: Account Setup

- [ ] Create Convex account (convex.dev)
- [ ] Create WorkOS account (workos.com)
- [ ] Create Vercel account (vercel.com)
- [ ] Create Resend account (resend.com)
- [ ] Create Sentry account (sentry.io)
- [ ] Verify Google Maps API key (existing)

#### Day 2: Project Initialization

```bash
# Create new SvelteKit project
npm create svelte@latest routewise
cd routewise

# Select options:
# - Skeleton project
# - TypeScript
# - ESLint, Prettier, Playwright

# Install dependencies
npm install

# Install TailwindCSS 4
npm install -D tailwindcss @tailwindcss/vite

# Install Flowbite-svelte (UI component library)
npm install flowbite-svelte flowbite
npm install -D flowbite-svelte-icons

# Install Convex
npm install convex
npx convex init

# Install additional dependencies
npm install @workos-inc/authkit-js
npm install resend
npm install puppeteer
npm install @googlemaps/js-api-loader
```

#### Day 2b: TailwindCSS 4 Configuration

**vite.config.ts**:

```typescript
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()]
});
```

**src/app.css**:

```css
@import 'tailwindcss';

/* Flowbite-svelte theming */
@plugin 'flowbite/plugin';

/* Dark mode as default */
@custom-variant dark (&:where(.dark, .dark *));

/* Custom theme colors for RouteWise */
@theme {
  --color-primary-50: #f0f9ff;
  --color-primary-100: #e0f2fe;
  --color-primary-200: #bae6fd;
  --color-primary-300: #7dd3fc;
  --color-primary-400: #38bdf8;
  --color-primary-500: #0ea5e9;
  --color-primary-600: #0284c7;
  --color-primary-700: #0369a1;
  --color-primary-800: #075985;
  --color-primary-900: #0c4a6e;
}
```

**src/app.html** (dark mode default):

```html
<!doctype html>
<html lang="en" class="dark">
  <head>
    <meta charset="utf-8" />
    <link rel="icon" href="%sveltekit.assets%/favicon.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    %sveltekit.head%
  </head>
  <body data-sveltekit-preload-data="hover">
    <div style="display: contents">%sveltekit.body%</div>
  </body>
</html>
```

#### Day 3: Project Structure

```
routewise/
├── src/
│   ├── routes/                    # SvelteKit pages
│   │   ├── +layout.svelte         # Root layout
│   │   ├── +page.svelte           # Home/Dashboard
│   │   ├── auth/
│   │   │   ├── login/+page.svelte
│   │   │   ├── signup/+page.svelte
│   │   │   └── callback/+page.svelte
│   │   ├── clients/
│   │   │   ├── +page.svelte       # List
│   │   │   ├── new/+page.svelte   # Create
│   │   │   └── [id]/+page.svelte  # Detail/Edit
│   │   ├── quotations/
│   │   ├── itineraries/
│   │   ├── invoices/
│   │   ├── drivers/
│   │   ├── vehicles/
│   │   ├── expenses/
│   │   └── settings/
│   ├── lib/
│   │   ├── components/            # Reusable UI components
│   │   │   ├── layout/            # Layout components
│   │   │   │   ├── Navbar.svelte  # Main navigation with theme toggle
│   │   │   │   ├── Sidebar.svelte
│   │   │   │   └── ThemeToggle.svelte  # Dark/Light mode switcher
│   │   │   ├── ui/                # Base components (extends Flowbite)
│   │   │   ├── forms/             # Form components
│   │   │   ├── tables/            # Data table components
│   │   │   └── maps/              # Google Maps components
│   │   ├── stores/                # Svelte stores
│   │   │   └── theme.ts           # Theme state (dark/light)
│   │   ├── utils/                 # Utility functions (PORT FROM EXISTING)
│   │   │   ├── unitConversion.ts
│   │   │   ├── formatting.ts
│   │   │   └── validation.ts
│   │   └── services/              # Business logic (PORT FROM EXISTING)
│   │       ├── costCalculation.ts
│   │       └── routeCalculation.ts
│   └── app.html
├── convex/
│   ├── schema.ts                  # Database schema
│   ├── tenants.ts                 # Tenant mutations/queries
│   ├── users.ts
│   ├── clients.ts
│   ├── vehicles.ts
│   ├── parameters.ts
│   ├── quotations.ts
│   ├── itineraries.ts
│   ├── invoices.ts
│   ├── drivers.ts
│   └── expenses.ts
├── static/
│   ├── favicon.png
│   └── images/
├── tests/
├── .env.local
├── svelte.config.js
├── vite.config.ts
└── package.json
```

#### Day 3b: Theme Implementation (Dark/Light Mode)

**src/lib/stores/theme.ts**:

```typescript
import { writable } from 'svelte/store';
import { browser } from '$app/environment';

type Theme = 'dark' | 'light';

function createThemeStore() {
  // Default to dark, check localStorage for user preference
  const storedTheme = browser ? localStorage.getItem('theme') as Theme : null;
  const prefersDark = browser ? window.matchMedia('(prefers-color-scheme: dark)').matches : true;
  const initialTheme: Theme = storedTheme || (prefersDark ? 'dark' : 'dark'); // Default to dark

  const { subscribe, set, update } = writable<Theme>(initialTheme);

  return {
    subscribe,
    toggle: () => {
      update(current => {
        const newTheme = current === 'dark' ? 'light' : 'dark';
        if (browser) {
          localStorage.setItem('theme', newTheme);
          document.documentElement.classList.toggle('dark', newTheme === 'dark');
        }
        return newTheme;
      });
    },
    set: (theme: Theme) => {
      if (browser) {
        localStorage.setItem('theme', theme);
        document.documentElement.classList.toggle('dark', theme === 'dark');
      }
      set(theme);
    }
  };
}

export const theme = createThemeStore();
```

**src/lib/components/layout/ThemeToggle.svelte**:

```svelte
<script lang="ts">
  import { theme } from '$lib/stores/theme';
  import { MoonSolid, SunSolid } from 'flowbite-svelte-icons';
  import { Button } from 'flowbite-svelte';
</script>

<Button
  color="none"
  class="text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg p-2.5"
  on:click={() => theme.toggle()}
  aria-label="Toggle dark mode"
>
  {#if $theme === 'dark'}
    <SunSolid class="w-5 h-5" />
  {:else}
    <MoonSolid class="w-5 h-5" />
  {/if}
</Button>
```

**Usage in Navbar.svelte**:

```svelte
<script lang="ts">
  import { Navbar, NavBrand, NavLi, NavUl, NavHamburger } from 'flowbite-svelte';
  import ThemeToggle from './ThemeToggle.svelte';
</script>

<Navbar class="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
  <NavBrand href="/">
    <span class="text-xl font-semibold dark:text-white">RouteWise</span>
  </NavBrand>
  <div class="flex items-center gap-2 md:order-2">
    <ThemeToggle />
    <NavHamburger />
  </div>
  <NavUl>
    <NavLi href="/quotations">Quotations</NavLi>
    <NavLi href="/itineraries">Itineraries</NavLi>
    <NavLi href="/clients">Clients</NavLi>
    <!-- ... more nav items -->
  </NavUl>
</Navbar>
```

#### Day 4: Environment Configuration

```bash
# .env.local
PUBLIC_CONVEX_URL=https://your-project.convex.cloud
WORKOS_API_KEY=sk_xxx
WORKOS_CLIENT_ID=client_xxx
PUBLIC_WORKOS_REDIRECT_URI=http://localhost:5173/auth/callback
RESEND_API_KEY=re_xxx
PUBLIC_GOOGLE_MAPS_API_KEY=xxx
SENTRY_DSN=https://xxx@sentry.io/xxx
```

#### Day 5: CI/CD Setup

- [ ] Connect GitHub repo to Vercel
- [ ] Configure Convex deployment
- [ ] Set up environment variables in Vercel
- [ ] Configure preview deployments
- [ ] Set up Sentry error tracking

**Deliverables**:

- [ ] All accounts created and configured
- [ ] SvelteKit project initialized
- [ ] Convex backend connected
- [ ] Project deployed to Vercel (empty shell)
- [ ] CI/CD pipeline working

---

## Phase 1: Foundation (Weeks 2-4)

### Week 2 (continued): Convex Schema

#### Convex Schema Definition (`convex/schema.ts`)

```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  tenants: defineTable({
    companyName: v.string(),
    slug: v.string(),
    plan: v.string(), // 'starter' | 'professional' | 'business' | 'enterprise'
    status: v.string(), // 'active' | 'suspended' | 'cancelled'
    logoUrl: v.optional(v.string()),
    primaryContactEmail: v.string(),
    primaryContactPhone: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    country: v.string(),
    timezone: v.string(),
    settings: v.object({}),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_slug", ["slug"]),

  users: defineTable({
    tenantId: v.id("tenants"),
    workosUserId: v.string(),
    email: v.string(),
    fullName: v.string(),
    avatarUrl: v.optional(v.string()),
    role: v.string(), // 'admin' | 'sales' | 'operations' | 'finance' | 'viewer'
    status: v.string(),
    lastLoginAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_workos_id", ["workosUserId"])
    .index("by_email", ["email"]),

  vehicles: defineTable({
    tenantId: v.id("tenants"),
    name: v.string(),
    make: v.string(),
    model: v.string(),
    year: v.number(),
    licensePlate: v.optional(v.string()),
    passengerCapacity: v.number(),
    fuelCapacity: v.number(),
    fuelEfficiency: v.number(),
    fuelEfficiencyUnit: v.string(),
    costPerDistance: v.number(),
    costPerDay: v.number(),
    distanceUnit: v.string(),
    ownership: v.string(), // 'owned' | 'rented'
    status: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_tenant", ["tenantId"]),

  parameters: defineTable({
    tenantId: v.id("tenants"),
    year: v.number(),
    fuelPrice: v.number(),
    mealCostPerDay: v.number(),
    hotelCostPerNight: v.number(),
    driverIncentivePerDay: v.number(),
    exchangeRate: v.number(),
    useCustomExchangeRate: v.boolean(),
    preferredDistanceUnit: v.string(),
    preferredCurrency: v.string(),
    tollRates: v.object({}),
    isActive: v.boolean(),
    createdBy: v.optional(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_tenant_year", ["tenantId", "year"]),

  clients: defineTable({
    tenantId: v.id("tenants"),
    type: v.string(), // 'individual' | 'company'
    companyName: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    country: v.string(),
    taxId: v.optional(v.string()),
    pricingLevel: v.string(), // 'standard' | 'preferred' | 'vip'
    discountPercentage: v.number(),
    creditLimit: v.number(),
    paymentTerms: v.number(),
    notes: v.optional(v.string()),
    status: v.string(),
    createdBy: v.optional(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_tenant_email", ["tenantId", "email"]),

  drivers: defineTable({
    tenantId: v.id("tenants"),
    firstName: v.string(),
    lastName: v.string(),
    email: v.optional(v.string()),
    phone: v.string(),
    licenseNumber: v.string(),
    licenseExpiry: v.number(),
    licenseCategory: v.optional(v.string()),
    emergencyContactName: v.optional(v.string()),
    emergencyContactPhone: v.optional(v.string()),
    status: v.string(),
    hireDate: v.optional(v.number()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_tenant", ["tenantId"]),

  quotations: defineTable({
    tenantId: v.id("tenants"),
    quotationNumber: v.string(),
    clientId: v.optional(v.id("clients")),
    vehicleId: v.optional(v.id("vehicles")),
    createdBy: v.optional(v.id("users")),
    // Trip details
    origin: v.string(),
    destination: v.string(),
    baseLocation: v.string(),
    groupSize: v.number(),
    extraMileage: v.number(),
    estimatedDays: v.number(),
    // Route info
    totalDistance: v.number(),
    totalTime: v.number(),
    routeData: v.optional(v.any()),
    // Cost breakdown
    fuelCost: v.number(),
    refuelingCost: v.number(),
    driverMealsCost: v.number(),
    driverLodgingCost: v.number(),
    driverIncentiveCost: v.number(),
    vehicleDistanceCost: v.number(),
    vehicleDailyCost: v.number(),
    tollCost: v.number(),
    totalCost: v.number(),
    // Pricing
    selectedMarkupPercentage: v.number(),
    salePriceHnl: v.number(),
    salePriceUsd: v.number(),
    exchangeRateUsed: v.number(),
    // Options
    includeFuel: v.boolean(),
    includeMeals: v.boolean(),
    includeTolls: v.boolean(),
    includeDriverIncentive: v.boolean(),
    // Status
    status: v.string(), // 'draft' | 'sent' | 'approved' | 'rejected' | 'expired'
    validUntil: v.optional(v.number()),
    notes: v.optional(v.string()),
    internalNotes: v.optional(v.string()),
    // PDF
    pdfUrl: v.optional(v.string()),
    pdfGeneratedAt: v.optional(v.number()),
    // Timestamps
    sentAt: v.optional(v.number()),
    approvedAt: v.optional(v.number()),
    rejectedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_tenant_status", ["tenantId", "status"])
    .index("by_client", ["clientId"]),

  itineraries: defineTable({
    tenantId: v.id("tenants"),
    itineraryNumber: v.string(),
    quotationId: v.optional(v.id("quotations")),
    clientId: v.optional(v.id("clients")),
    vehicleId: v.optional(v.id("vehicles")),
    driverId: v.optional(v.id("drivers")),
    createdBy: v.optional(v.id("users")),
    // Trip details
    origin: v.string(),
    destination: v.string(),
    baseLocation: v.string(),
    groupSize: v.number(),
    // Schedule
    startDate: v.number(),
    endDate: v.number(),
    estimatedDays: v.number(),
    // Pickup/Dropoff
    pickupLocation: v.string(),
    pickupTime: v.string(),
    dropoffLocation: v.string(),
    dropoffTime: v.optional(v.string()),
    // Costs
    totalDistance: v.number(),
    totalCost: v.number(),
    agreedPriceHnl: v.number(),
    agreedPriceUsd: v.number(),
    // Status
    status: v.string(), // 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
    routeLink: v.optional(v.string()),
    // Timestamps
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    cancelledAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_tenant_status", ["tenantId", "status"])
    .index("by_driver", ["driverId"]),

  invoices: defineTable({
    tenantId: v.id("tenants"),
    invoiceNumber: v.string(),
    itineraryId: v.optional(v.id("itineraries")),
    clientId: v.optional(v.id("clients")),
    createdBy: v.optional(v.id("users")),
    // Invoice details
    invoiceDate: v.number(),
    dueDate: v.number(),
    subtotalHnl: v.number(),
    taxPercentage: v.number(),
    taxAmountHnl: v.number(),
    totalHnl: v.number(),
    totalUsd: v.optional(v.number()),
    // Payment tracking
    amountPaid: v.number(),
    amountDue: v.number(),
    paymentStatus: v.string(), // 'unpaid' | 'partial' | 'paid' | 'overdue'
    // Additional
    additionalCharges: v.optional(v.array(v.any())),
    discounts: v.optional(v.array(v.any())),
    // PDF
    pdfUrl: v.optional(v.string()),
    pdfGeneratedAt: v.optional(v.number()),
    // Status
    status: v.string(), // 'draft' | 'sent' | 'paid' | 'cancelled'
    notes: v.optional(v.string()),
    // Timestamps
    sentAt: v.optional(v.number()),
    paidAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_tenant_status", ["tenantId", "paymentStatus"]),

  invoicePayments: defineTable({
    invoiceId: v.id("invoices"),
    paymentDate: v.number(),
    amount: v.number(),
    paymentMethod: v.optional(v.string()),
    referenceNumber: v.optional(v.string()),
    notes: v.optional(v.string()),
    recordedBy: v.optional(v.id("users")),
    createdAt: v.number(),
  }).index("by_invoice", ["invoiceId"]),

  expenseAdvances: defineTable({
    tenantId: v.id("tenants"),
    advanceNumber: v.string(),
    itineraryId: v.id("itineraries"),
    driverId: v.optional(v.id("drivers")),
    createdBy: v.optional(v.id("users")),
    // Advance details
    amountHnl: v.number(),
    purpose: v.string(),
    expenseBreakdown: v.optional(v.any()),
    // Status
    status: v.string(), // 'pending' | 'approved' | 'paid' | 'settled'
    approvedBy: v.optional(v.id("users")),
    approvedAt: v.optional(v.number()),
    paidAt: v.optional(v.number()),
    // Settlement
    actualExpenses: v.optional(v.number()),
    receiptsUrls: v.optional(v.array(v.string())),
    refundAmount: v.optional(v.number()),
    additionalPayment: v.optional(v.number()),
    settlementNotes: v.optional(v.string()),
    settledAt: v.optional(v.number()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_itinerary", ["itineraryId"]),

  auditLog: defineTable({
    tenantId: v.id("tenants"),
    userId: v.optional(v.id("users")),
    entityType: v.string(),
    entityId: v.string(),
    action: v.string(),
    oldValues: v.optional(v.any()),
    newValues: v.optional(v.any()),
    ipAddress: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_tenant", ["tenantId"]),
});
```

### Week 3: Authentication with WorkOS

#### Tasks

- [ ] Set up WorkOS AuthKit integration
- [ ] Create auth callback handler
- [ ] Implement sign-up flow (creates tenant + user)
- [ ] Implement sign-in flow
- [ ] Implement sign-out
- [ ] Create auth middleware/guards
- [ ] Implement session management

#### Key Files

- `src/routes/auth/login/+page.svelte`
- `src/routes/auth/signup/+page.svelte`
- `src/routes/auth/callback/+page.server.ts`
- `src/lib/auth/workos.ts`
- `src/hooks.server.ts` (auth middleware)

### Week 4: User & Tenant Management

#### Tasks

- [ ] Create tenant on signup
- [ ] User profile page
- [ ] User settings page
- [ ] Invite team members
- [ ] Role management (admin, sales, operations, finance)
- [ ] User list for admins
- [ ] Tenant settings page

**Phase 1 Deliverables**:

- [ ] Database schema deployed to Convex
- [ ] Authentication working (sign-up, sign-in, sign-out)
- [ ] Tenant created on signup
- [ ] User roles defined
- [ ] Admin can invite team members

---

## Phase 2: Data Migration & Business Logic (Week 5)

### Port Business Logic from Existing App

#### Files to Port (from `src/services/` and `src/utils/`)

| Original File | New Location | Changes Required |
|---------------|--------------|------------------|
| `CostCalculationService.ts` | `src/lib/services/costCalculation.ts` | Remove React dependencies, pure TS |
| `RouteCalculatorService.ts` | `src/lib/services/routeCalculation.ts` | Adapt for Svelte |
| `unitConversion.ts` | `src/lib/utils/unitConversion.ts` | Direct copy |
| `formatting.ts` | `src/lib/utils/formatting.ts` | Direct copy |
| `validation.ts` | `src/lib/utils/validation.ts` | Direct copy |

#### Tasks

- [ ] Port cost calculation algorithms
- [ ] Port route calculation logic
- [ ] Port utility functions
- [ ] Create data migration script for vehicles
- [ ] Create data migration script for parameters
- [ ] Test calculations match existing app
- [ ] Create Convex functions for seeding data

**Phase 2 Deliverables**:

- [ ] All business logic ported and tested
- [ ] Sample vehicles in database
- [ ] Sample parameters in database
- [ ] Calculations produce same results as original app

---

## Phase 3: Client Management (Week 6)

### Screens to Build

- [ ] Client list page (`/clients`)
- [ ] Client detail page (`/clients/[id]`)
- [ ] Create client page (`/clients/new`)
- [ ] Edit client page (`/clients/[id]/edit`)

### Features

- [ ] Client CRUD operations
- [ ] Client search with autocomplete
- [ ] Filter by type (individual/company)
- [ ] Filter by pricing level
- [ ] Client contact info management
- [ ] Tax ID (RTN) validation
- [ ] Notes and activity history
- [ ] Pagination

### Components

- [ ] ClientList component
- [ ] ClientCard component
- [ ] ClientForm component
- [ ] ClientSearch component

**Phase 3 Deliverables**:

- [ ] Complete client management system
- [ ] Client data properly isolated by tenant

---

## Phase 4: Quotation System (Weeks 7-8)

### Screens to Build

- [ ] Quotation list page (`/quotations`)
- [ ] Quotation detail page (`/quotations/[id]`)
- [ ] Create quotation wizard (`/quotations/new`)
- [ ] Edit quotation page (`/quotations/[id]/edit`)

### Features (Week 7)

- [ ] Multi-step quotation wizard
  - Step 1: Select client (or quick-create)
  - Step 2: Enter route details (origin, destination, dates)
  - Step 3: Select vehicle
  - Step 4: Configure options (fuel, meals, tolls)
  - Step 5: Review costs and select markup
  - Step 6: Preview and save
- [ ] Google Maps integration for route display
- [ ] Real-time cost calculation
- [ ] Multiple pricing levels display
- [ ] Auto-generate quotation number

### Features (Week 8)

- [ ] Quotation status workflow (draft → sent → approved/rejected)
- [ ] Quotation listing with filters (status, client, date range)
- [ ] Duplicate quotation
- [ ] Edit draft quotations
- [ ] Quotation expiry handling
- [ ] Internal notes vs client-visible notes

### Components

- [ ] QuotationWizard component
- [ ] QuotationList component
- [ ] QuotationCard component
- [ ] CostBreakdown component
- [ ] PricingOptions component
- [ ] RouteMap component

**Phase 4 Deliverables**:

- [ ] Complete quotation workflow
- [ ] All quotations persisted to database
- [ ] Status management working
- [ ] Google Maps integration working

---

## Phase 5: PDF Generation & Email (Week 9)

### Tasks

- [ ] Design PDF template for quotations
- [ ] Implement Puppeteer PDF generation
- [ ] Upload PDFs to Convex storage
- [ ] Generate and preview PDF
- [ ] Download PDF
- [ ] Email integration with Resend
- [ ] Send quotation email with PDF attachment
- [ ] Email templates (quotation sent, reminder)

### PDF Template Design

- Company header with logo
- Client information
- Trip details
- Cost summary (showing only final price)
- Terms and conditions
- Validity date
- Contact information

**Phase 5 Deliverables**:

- [ ] Professional PDF generation working
- [ ] Email delivery working
- [ ] PDFs stored in cloud storage

---

## Phase 6: Driver Management (Week 10)

### Screens to Build

- [ ] Driver list page (`/drivers`)
- [ ] Driver detail page (`/drivers/[id]`)
- [ ] Create driver page (`/drivers/new`)
- [ ] Edit driver page (`/drivers/[id]/edit`)

### Features

- [ ] Driver CRUD operations
- [ ] License expiry tracking and alerts
- [ ] Driver availability status
- [ ] Emergency contact info
- [ ] Driver documents upload
- [ ] Driver schedule view

**Phase 6 Deliverables**:

- [ ] Complete driver management system
- [ ] License expiry alerts

---

## Phase 7: Itinerary Management (Weeks 11-12)

### Screens to Build

- [ ] Itinerary list page (`/itineraries`)
- [ ] Itinerary detail page (`/itineraries/[id]`)
- [ ] Create from quotation (`/quotations/[id]/convert`)
- [ ] Calendar view (`/itineraries/calendar`)

### Features (Week 11)

- [ ] Convert approved quotation to itinerary
- [ ] Assign driver and vehicle
- [ ] Set pickup/dropoff details
- [ ] Generate Google Maps route link
- [ ] Itinerary status workflow (scheduled → in_progress → completed)

### Features (Week 12)

- [ ] Calendar view of itineraries
- [ ] Driver schedule view
- [ ] Vehicle availability calendar
- [ ] Itinerary notifications
- [ ] Itinerary report/summary

**Phase 7 Deliverables**:

- [ ] Quote → Itinerary conversion working
- [ ] Driver/vehicle assignment
- [ ] Calendar views
- [ ] Google Maps route links

---

## Phase 8: Invoice System (Weeks 13-14)

### Screens to Build

- [ ] Invoice list page (`/invoices`)
- [ ] Invoice detail page (`/invoices/[id]`)
- [ ] Create from itinerary (`/itineraries/[id]/invoice`)
- [ ] Payment recording

### Features (Week 13)

- [ ] Generate invoice from completed itinerary
- [ ] Auto-calculate ISV (15% tax)
- [ ] Invoice PDF generation
- [ ] Auto-generate invoice number
- [ ] Invoice status management

### Features (Week 14)

- [ ] Payment recording
- [ ] Payment history
- [ ] Partial payments
- [ ] Overdue tracking
- [ ] Financial reports (receivables, aging)
- [ ] Send invoice email

**Phase 8 Deliverables**:

- [ ] Complete invoicing system
- [ ] Payment tracking
- [ ] Financial reports

---

## Phase 9: Expense Advances (Week 15)

### Screens to Build

- [ ] Expense advance list (`/expenses`)
- [ ] Create advance request (`/itineraries/[id]/advance`)
- [ ] Advance approval workflow
- [ ] Settlement screen

### Features

- [ ] Calculate suggested advance from itinerary costs
- [ ] Request/approval workflow
- [ ] Mark as paid
- [ ] Receipt upload
- [ ] Settlement (actual vs advanced)
- [ ] Refund/additional payment calculation
- [ ] Expense reports

**Phase 9 Deliverables**:

- [ ] Complete expense advance lifecycle
- [ ] Receipt management
- [ ] Settlement workflow

---

## Phase 10: Dashboard & Analytics (Weeks 16-18)

### Week 16: Dashboard

- [ ] Main dashboard with KPIs
  - Total quotations (this month)
  - Conversion rate (approved/sent)
  - Revenue (invoiced)
  - Outstanding receivables
  - Upcoming itineraries
- [ ] Quick actions (new quotation, new client)
- [ ] Recent activity feed
- [ ] Alerts (license expiry, overdue invoices)

### Week 17: Reports

- [ ] Sales reports
  - Pipeline (quotations by status)
  - Conversion funnel
  - Revenue by client
  - Revenue by vehicle
- [ ] Financial reports
  - Revenue summary
  - Receivables aging
  - Monthly comparisons
- [ ] Operational reports
  - Driver utilization
  - Vehicle utilization
  - Route analysis

### Week 18: Polish & Launch Prep

- [ ] Data export (CSV)
- [ ] Performance optimization
- [ ] Error handling polish
- [ ] Loading states
- [ ] Mobile responsiveness check
- [ ] Browser testing
- [ ] Security review
- [ ] Documentation
- [ ] User onboarding flow

**Phase 10 Deliverables**:

- [ ] Comprehensive dashboard
- [ ] All reports functional
- [ ] Production-ready application

---

## Launch Checklist

### Pre-Launch (Week 18)

- [ ] All features tested
- [ ] Mobile responsive
- [ ] Error tracking configured (Sentry)
- [ ] Analytics configured
- [ ] Terms of service
- [ ] Privacy policy
- [ ] Cookie consent
- [ ] SSL certificate
- [ ] Domain configured
- [ ] Email deliverability tested
- [ ] Backup strategy
- [ ] Support email configured

### Launch Day

- [ ] Deploy to production
- [ ] Monitor error logs
- [ ] Test critical flows
- [ ] Announce launch
- [ ] Onboard first customers

### Post-Launch (Week 19+)

- [ ] Monitor usage patterns
- [ ] Gather feedback
- [ ] Fix bugs
- [ ] Plan next features

---

## Risk Mitigation

### Technical Risks

| Risk | Mitigation |
|------|------------|
| Svelte learning curve | 2 weeks dedicated training |
| Convex document model limitations | Design schema carefully upfront |
| PDF generation complexity | Use Puppeteer with tested templates |
| Google Maps API costs | Implement aggressive caching |
| WorkOS integration issues | Follow official documentation closely |

### Business Risks

| Risk | Mitigation |
|------|------------|
| Longer timeline | 4-week buffer built into 14-18 week estimate |
| Honduras hiring difficulty | Plan for remote training |
| Competition | Focus on local market, Spanish language |

---

## Success Metrics

### Development Phase

- [ ] On-time delivery (within 18 weeks)
- [ ] All 50+ screens built
- [ ] Zero critical bugs at launch
- [ ] <3s page load times
- [ ] >90 Lighthouse score

### Post-Launch (Year 1)

- [ ] 33 paying customers
- [ ] 120 total users
- [ ] $7,080 MRR by Month 12
- [ ] <1% churn rate
- [ ] >4.5 star user satisfaction

---

## Future Considerations: Data Integrity & Historical Records

### Unit & Currency Handling Strategy

When creating quotations, invoices, and other financial documents, units and currencies must be stored with each document to preserve historical accuracy.

#### Current Implementation

- **Google Maps API** returns distances in kilometers (always)
- **Vehicle costs** are stored in the tenant's preferred distance unit (km or mi)
- **Cost calculations** convert internally from km to the vehicle's unit
- **Display** shows values in the user's preferred unit from settings

#### Document Storage Requirements

Each quotation/invoice should store at creation time:
- `distanceUnit` - The unit used (km or mi)
- `currency` - The currency used (local currency code)
- `exchangeRate` - The exchange rate at creation time
- All calculated values in those units

This ensures historical documents remain accurate even if the user later changes their preferred units or exchange rates fluctuate.

#### Future Enhancements (When Needed)

For features like financial reports or vehicle maintenance tracking, consider adding **normalized fields** alongside display values:

```typescript
// Example: Quotation with both display and normalized values
{
  // Display values (in user's preferred units at creation time)
  totalDistance: 450,           // km
  distanceUnit: 'km',
  totalCostLocal: 15000,        // HNL
  totalCostUsd: 600,            // USD
  exchangeRateUsed: 25.0,

  // Normalized values (for reports/analytics)
  totalDistanceKm: 450,         // Always in km
  totalCostUsd_normalized: 600, // Always in USD
}
```

This dual-storage approach enables:
- **Historical accuracy**: Documents show original values
- **Reporting consistency**: All reports use normalized base units
- **Currency analysis**: Track exchange rate impact over time

#### Implementation Priority

| Feature | Approach | Priority |
|---------|----------|----------|
| Quotations/Invoices | Store units with document | **Now** |
| Financial Reports | Use normalized fields | When building reports |
| Vehicle Maintenance | Normalize to km/USD | When building feature |
| Multi-currency Reports | Aggregate using normalized USD | When building feature |

---

## Appendix: Key Resources

### Documentation

- [SvelteKit Docs](https://kit.svelte.dev/docs)
- [Convex Docs](https://docs.convex.dev/)
- [WorkOS Docs](https://workos.com/docs)
- [Resend Docs](https://resend.com/docs)
- [Puppeteer Docs](https://pptr.dev/)

### Tutorials

- [Svelte Tutorial](https://learn.svelte.dev/)
- [SvelteKit + Convex Tutorial](https://docs.convex.dev/quickstart/sveltekit)
- [WorkOS AuthKit Guide](https://workos.com/docs/user-management)

### Design Resources

- [TailwindCSS 4](https://tailwindcss.com/docs/v4-beta) - CSS framework
- [Flowbite-svelte](https://flowbite-svelte.com/) - Tailwind component library for Svelte
- [Flowbite-svelte-icons](https://flowbite-svelte.com/icons) - Icon library
- [Heroicons](https://heroicons.com/) - Additional icons
- [Flowbite Figma](https://flowbite.com/figma/) - Design system (optional)

---

**Document Version**: 1.1
**Created**: November 24, 2025
**Last Updated**: November 29, 2025
