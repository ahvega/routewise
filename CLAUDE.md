# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PlannerTours is a transportation quotation system for tour companies in Honduras. It calculates trip costs for multiple vehicle types, displays routes via Google Maps, and generates pricing options with different profit margins.

**Key Features**: Route calculation with Google Maps Distance Matrix API, multi-tier pricing (10-30% markup), currency conversion (HNL/USD), toll/fuel/meal cost calculations, responsive mobile/desktop UI.

## Tech Stack

- **Framework**: Next.js 15 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS 4, DaisyUI 5
- **Forms**: React Hook Form + Zod validation
- **Maps**: Google Maps JavaScript API
- **Data**: Local JSON files (`public/data/`) with API fallback
- **Config**: ES modules (`"type": "module"` in package.json)

## Architecture Overview

### Directory Structure

```
src/
├── app/                 # Next.js App Router (pages, layouts)
├── components/          # UI components (Forms/, Map/, Pricing/, Costs/, Admin/, etc.)
├── services/            # Business logic services
│   ├── CostCalculationService.ts      # Core cost calculation engine
│   ├── RouteCalculatorService.ts      # Google Maps route calculations
│   ├── ParameterManagementService.ts  # System parameter CRUD
│   ├── VehicleManagementService.ts    # Vehicle data management
│   └── ExchangeRateService.ts         # Currency exchange rates
├── hooks/               # Custom React hooks
│   ├── useQuotationWorkflow.ts        # Orchestrates full quotation process
│   ├── useQuotation.ts                # Legacy quotation logic
│   ├── useGoogleMaps.ts               # Google Maps API loader
│   └── useGooglePlaces.ts             # Places autocomplete
├── types/               # TypeScript type definitions (index.ts exports all)
├── utils/               # Utility functions (validation, formatting, conversion, cache)
├── lib/                 # Legacy business logic (dataLoader, costCalculation)
└── config/              # Environment configuration

public/data/             # JSON data files (vehicles, parameters, exchange rates)
```

### Service-Oriented Architecture

The application follows a **service layer pattern**:

1. **Services** (`src/services/`): Contain all business logic, calculations, and data operations. Each service is a singleton exported instance.

2. **Hooks** (`src/hooks/`): Bridge services to React components, manage state, handle side effects. `useQuotationWorkflow` is the main orchestrator.

3. **Components**: Presentational, receive data via props, emit events via callbacks. Use barrel exports (`index.ts`) per feature folder.

**Data Flow**: User Input → Form Component → `useQuotationWorkflow` → Services (Route Calculation → Cost Calculation → Pricing Generation) → State Update → UI Render

### Key Architecture Patterns

- **Barrel Exports**: Each component/service folder has `index.ts` re-exporting public API
- **Service Singletons**: Services exported as instances (e.g., `costCalculationService`)
- **Error Handling**: Custom `AppError` with `ErrorType` enum for typed error handling
- **Type Safety**: All interfaces defined in `src/types/index.ts`, strict TypeScript mode
- **Legacy Bridge**: Old jQuery Mobile code in `.old/`, legacy types maintained for data compatibility

## Development Commands

```bash
npm run dev    # Start dev server (localhost:3000)
npm run build  # Production build
npm start      # Serve production build
npm run lint   # ESLint with Next.js config (use --fix to auto-fix)
```

**Note**: No test runner configured yet. See `DEVELOPMENT.md` for TDD strategy and testing guidelines.

## Environment Setup

1. Copy `.env.example` to `.env` and set:
   ```bash
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here
   ```

2. Install dependencies: `npm install`

3. Start dev server: `npm run dev`

**Important**: Config files use proper extensions for ES modules:
- `.js`/`.mjs` for ES modules (use `import`/`export`)
- `.cjs` for CommonJS (use `require`/`module.exports`)
- Current: `eslint.config.js` (ESM), `next.config.cjs` (CJS), `tailwind.config.cjs` (CJS)

## Core Services & Key Functions

### CostCalculationService (`src/services/CostCalculationService.ts`)

Main cost calculation engine with three specialized calculators:

- **FuelCalculator**: `calculateFuelCosts()`, `calculateRefuelingCosts()` - handles fuel consumption and refueling stops based on vehicle specs and distance
- **DriverExpenseCalculator**: `calculateDriverExpenses()` - calculates meals, hotel, and incentives based on trip duration
- **VehicleCostCalculator**: `calculateVehicleCosts()` - base vehicle costs (per day, per km)

**Main API**: `costCalculationService.calculateTotalCosts(request)` - orchestrates all calculations and returns `DetailedCosts`

### RouteCalculatorService (`src/services/RouteCalculatorService.ts`)

Handles Google Maps Distance Matrix API integration:

- **Input**: Origin, destination, base location (optional waypoints)
- **Output**: `RouteResult` with total distance (km), duration (minutes), toll costs (calculated based on geography)
- **Caching**: Results cached to reduce API calls

### useQuotationWorkflow (`src/hooks/useQuotationWorkflow.ts`)

Main orchestration hook that coordinates the full quotation process:

1. Validates request
2. Calls `routeCalculatorService.calculateRoute()`
3. Calls `costCalculationService.calculateTotalCosts()`
4. Generates pricing options (10%, 15%, 20%, 25%, 30% markup)
5. Returns `QuotationResult` with costs, pricing, route info

**Usage**: Components call `generateQuotation(request)`, hook manages loading/error states

### Data Management

- **JSON Files**: `public/data/` contains `tipodevehiculo.json` (vehicles), `parametro.json` (system params), `tasaUSD.json` (exchange rates)
- **Loading**: `src/lib/dataLoader.ts` loads data with API fallback
- **Services**: `ParameterManagementService` and `VehicleManagementService` provide CRUD operations

## Important Domain Logic

### Cost Calculation Modes

The system supports two operational modes controlled by checkbox flags:

1. **includeFuel**: When `false`, fuel costs are calculated but NOT included in total (rent-a-car mode where client manages fuel)
2. **includeMeals**: When `false`, meal costs excluded from total
3. **includeTolls**: When `false`, toll costs excluded from total

**Critical**: All costs are calculated regardless of flags, but only included in total when flag is `true`. This allows displaying itemized costs while providing flexible pricing.

### Toll Calculation Logic

Tolls calculated based on route geography (string matching on location names):

- **Exit tolls** (`peaje.salida`): Routes leaving San Pedro Sula
- **SAP tolls** (Tegucigalpa/Juticalpa routes): Multiple toll points based on specific locations
- **PTZ tolls** (Potrerillos routes): Specific geography-based calculations

See `RouteCalculatorService` for implementation details.

### Unit Conversion

Vehicles can use different units:
- **Distance**: `km` or `mile`
- **Fuel Efficiency**: `mpg`, `mpl`, `kpl`, `kpg` (miles/km per gallon/liter)

All conversions handled by `src/utils/unitConversion.ts`. Calculations normalize to vehicle's preferred units.

## Code Quality & Standards

- **Linting**: Run `npm run lint` before commits. ESLint configured with Next.js + TypeScript rules
- **TypeScript**: Strict mode enabled. No implicit `any`, null checks enforced
- **Naming**: PascalCase for types/components, camelCase for functions/vars, UPPER_SNAKE_CASE for constants
- **Documentation**: JSDoc for public APIs. Inline comments explain **why**, not what
- **Commits**: Follow Conventional Commits (`feat:`, `fix:`, `refactor:`, etc.)

See `DEVELOPMENT.md` for comprehensive testing strategy, TDD guidelines, and code review checklists.

## Common Tasks

**Adding a new service**:
1. Create in `src/services/`, export singleton instance
2. Define interfaces in `src/types/index.ts`
3. Add barrel export in `src/services/index.ts`
4. Follow TDD: write tests first in `*.test.ts`

**Modifying cost calculations**:
1. Update `CostCalculationService.ts` calculators
2. Ensure backward compatibility with legacy types
3. Update tests to cover new logic
4. Verify with manual testing across multiple routes/vehicles

**Adding form validation**:
1. Define Zod schema in component using React Hook Form
2. Add validation utilities to `src/utils/validation.ts` if reusable
3. Ensure error messages are user-friendly in Spanish (primary language)

## Legacy Context

Original app built with jQuery Mobile (code in `.old/`). Current version maintains feature parity:
- All calculation formulas ported exactly
- Legacy types (`LegacyVehicle`, `Parameter`) maintained for JSON compatibility
- Modern architecture with services/hooks pattern for maintainability

---

## SaaS Transformation Plan

**Reference Document**: `PT_MIGRATION_TO_SAAS_PLAN.md` (comprehensive 2,700+ line analysis)

### Transformation Overview

The project is planned to transform from a single-tenant JSON-based app into a multi-tenant SaaS platform with the following target state:

- **Multi-tenant SaaS**: Organizations with isolated data (Row-Level Security)
- **Database**: PostgreSQL with full persistence (replacing JSON files)
- **Authentication**: OAuth + email/password with role-based access
- **CRM**: Client management with custom pricing levels
- **Workflows**: Quotation → Itinerary → Invoice → Expense Advance
- **PDF Generation**: Professional quotations and invoices
- **Analytics**: Business intelligence dashboard

### Chosen Technology Stack (Scenario 2 - DECIDED)

**Decision Date**: November 24, 2025

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Frontend** | SvelteKit 2.x + TypeScript | Best performance, less boilerplate |
| **Styling** | TailwindCSS 4 | Latest CSS framework, native CSS |
| **UI Components** | Flowbite-svelte | Tailwind-based component library |
| **Backend/Database** | Convex | Reactive document DB, auto-CRUD, real-time |
| **Authentication** | WorkOS AuthKit | Free 1M MAUs, enterprise-ready |
| **Deployment** | Vercel (frontend) + Convex Cloud | Seamless integration |
| **PDF** | Puppeteer | HTML-to-PDF via headless Chrome |
| **Email** | Resend.com | Modern email API |
| **Maps** | Google Maps JavaScript API | Direct integration with Svelte |

**UI/UX Standards**:
- Dark mode by default, with light mode toggle (sun/moon icon in navbar)
- Flowbite-svelte components for forms, tables, modals, navigation
- Flowbite-svelte-icons for iconography
- Responsive design (mobile-first)

**Why Scenario 2 Won**:
- Lowest infrastructure costs ($1,329-1,410/year)
- 40-60% smaller bundles (better Honduras network performance)
- WorkOS free tier (1M MAUs vs Supabase 50K)
- Simpler forms (Svelte two-way binding)
- Real-time built-in by default
- Break-even at Month 3-4 with 4-5 customers

### New Database Entities

```
tenants          → Organization/company accounts
users            → User accounts with RBAC
vehicles         → Vehicle fleet (migrated from JSON)
parameters       → System parameters by year (migrated from JSON)
clientes         → Client management (individuals/companies)
drivers          → Driver information and availability
cotizaciones     → Quotations with full cost breakdown
itinerarios      → Scheduled trips from approved quotations
facturas         → Invoices with payment tracking
anticipos_gastos → Driver expense advances
audit_log        → Activity tracking
```

### Key Workflows (Post-Migration)

1. **Quotation Workflow**: Create Quote → Select Client → Calculate Costs → Generate PDF → Send → Approve/Reject
2. **Itinerary Workflow**: Approved Quote → Create Itinerary → Assign Driver/Vehicle → Schedule → Track Status
3. **Invoice Workflow**: Completed Itinerary → Generate Invoice → Track Payments → Mark Paid
4. **Expense Advance**: Itinerary → Calculate Advance → Approve → Pay Driver → Settle with Receipts

### Code Reuse Strategy

**What Can Be Reused (40-50%):**
- ✅ Business logic in `src/services/` (80-90% reusable)
- ✅ Type definitions in `src/types/` (70% reusable)
- ✅ Utility functions in `src/utils/` (90% reusable)
- ✅ Google Maps integration logic (70% reusable)

**What Must Be Built from Scratch:**
- ❌ All UI components (full SaaS redesign required)
- ❌ 50+ CRUD screens (clients, drivers, quotations, itineraries, invoices)
- ❌ Navigation/layout architecture
- ❌ Data tables with sorting/filtering/pagination
- ❌ Dashboard and analytics
- ❌ All workflow screens

### Implementation Roadmap (Scenario 2)

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| **Phase 0: Learning & Setup** | Weeks 1-2 | Team learns Svelte, project setup |
| **Phase 1: Foundation** | Weeks 2-4 | Convex schema, WorkOS auth, user management |
| **Phase 2: Data Migration** | Week 5 | Port business logic, migrate JSON data |
| **Phase 3: Client Management** | Week 6 | Client CRUD screens |
| **Phase 4: Persistent Quotations** | Weeks 7-8 | Quotation workflow, status management |
| **Phase 5: PDF Generation** | Week 9 | Puppeteer PDF templates, email delivery |
| **Phase 6: Driver Management** | Week 10 | Driver CRUD, availability |
| **Phase 7: Itineraries** | Weeks 11-12 | Quote → Itinerary conversion, scheduling |
| **Phase 8: Invoicing** | Weeks 13-14 | Invoice generation, payment tracking |
| **Phase 9: Expense Advances** | Week 15 | Advance request/approval/settlement |
| **Phase 10: Analytics & Polish** | Weeks 16-18 | Dashboard, testing, deployment |

**Total Timeline**: 14-18 weeks

**Detailed Roadmap**: See `DEVELOPMENT_ROADMAP.md`

### Infrastructure Costs (Scenario 2)

**MVP Phase (Months 1-3)**: $20/month
| Service | Plan | Cost |
|---------|------|------|
| Vercel | Pro | $20 |
| Convex | Starter (free) | $0 |
| WorkOS | AuthKit (free) | $0 |
| Google Maps | Within $200 credit | $0 |
| Resend | Free (3K emails) | $0 |

**Growth Phase (Months 4-12)**: $141-150/month
| Service | Plan | Cost |
|---------|------|------|
| Vercel | Pro | $20 |
| Convex | Professional | $25 |
| WorkOS | AuthKit (free) | $0 |
| Google Maps API | ~50K calls | $50 |
| Resend | Pro | $20 |
| Sentry | Team | $26 |
| **Total** | | **$141-150** |

### End-User SaaS Pricing (Recommended)

| Tier | Price | Target |
|------|-------|--------|
| **Starter** | $29/user/month | Small tour operators (1-5 users) |
| **Professional** | $59/user/month | Growing businesses (5-15 users) |
| **Business** | $99/user/month | Large operators (15-50 users) |
| **Enterprise** | Custom | Multi-location, 50+ users |

### New Use Cases (Market Expansion)

Beyond tour operators, the SaaS can serve:
- **Owned Vehicle Fleets**: Delivery, logistics, corporate fleets (TCO tracking)
- **Rented Vehicle Fleets**: Event companies, seasonal businesses
- **Mixed Fleets**: Owned + rented vehicle cost optimization

**Expanded Market**: From ~1,000 tour operators to **60,000+ businesses with vehicle fleets** in Honduras.

### App Rebranding

**Recommended Name**: **RouteWise**
- **Tagline**: "Smart routes. Smart costs. Smart business."
- **Rationale**: Generic enough for all use cases, memorable, SEO-friendly

**Alternatives**: FleetFlow, TripCost, MileMap

---

## Related Documentation

- `PT_MIGRATION_TO_SAAS_PLAN.md` - Full SaaS transformation analysis (2,700+ lines)
- `DEVELOPMENT.md` - TDD strategy and testing guidelines
- `AGENTS.md` - Agent-specific configurations
