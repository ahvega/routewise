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
