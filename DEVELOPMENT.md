# Development Best Practices

## Overview

This document outlines the development best practices, code quality standards, and testing strategies for the PlannerTours Transportation Quotation System.

## Table of Contents

1. [Code Quality Standards](#code-quality-standards)
2. [Testing Strategy](#testing-strategy)
3. [Documentation Standards](#documentation-standards)
4. [Git Workflow](#git-workflow)
5. [Performance Guidelines](#performance-guidelines)

---

## Code Quality Standards

### Linting

We use ESLint with Next.js and TypeScript configurations to maintain code quality and consistency.

#### Running the Linter

```bash
# Check for linting errors
npm run lint

# Auto-fix linting errors (when possible)
npm run lint -- --fix
```

#### ESLint Configuration

- **Config File**: `eslint.config.js` (ES Module format)
- **Module Type**: ES Module (specified in `package.json` with `"type": "module"`)
- **Rules**: Next.js recommended + TypeScript strict rules
- **Import Ordering**: Enforced for consistency

#### Configuration Files

Since the project uses `"type": "module"` in `package.json`, configuration files must use appropriate extensions:
- **ES Module files**: `.js` or `.mjs` (use `import`/`export`)
- **CommonJS files**: `.cjs` (use `require`/`module.exports`)

Current configuration files:
- `eslint.config.js` - ES Module format
- `postcss.config.mjs` - ES Module format
- `next.config.cjs` - CommonJS format (Next.js requirement)
- `tailwind.config.cjs` - CommonJS format (Tailwind requirement)

#### Pre-commit Checks

Before committing code, always run:
```bash
npm run lint
```

All linting errors must be resolved before merging to main branch.

### TypeScript Standards

#### Type Safety

- **Strict Mode**: Enabled in `tsconfig.json`
- **No Implicit Any**: All variables must have explicit types
- **Null Checks**: Strict null checking enabled
- **Type Inference**: Leverage TypeScript's type inference where appropriate

#### Interface vs Type

- Use `interface` for object shapes that may be extended
- Use `type` for unions, intersections, and complex types
- Example:
  ```typescript
  // Good - Interface for extendable objects
  interface Vehicle {
    id: string;
    make: string;
    model: string;
  }

  // Good - Type for unions
  type FuelUnit = 'mpg' | 'mpl' | 'kpl' | 'kpg';
  ```

#### Naming Conventions

- **Interfaces/Types**: PascalCase (e.g., `Vehicle`, `CostCalculationRequest`)
- **Functions/Variables**: camelCase (e.g., `calculateTotalCosts`, `fuelPrice`)
- **Components**: PascalCase (e.g., `DataForm`, `CostDisplay`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `VALIDATION_LIMITS`)
- **Private Methods**: Prefix with underscore (e.g., `_handleError`)

### Code Documentation

#### JSDoc Comments

All public functions, classes, and interfaces should have JSDoc comments:

```typescript
/**
 * Calculate total costs for a transportation request
 *
 * @param request - The cost calculation request containing route, vehicle, and options
 * @returns Promise resolving to detailed costs breakdown
 * @throws {AppError} When calculation fails or invalid data provided
 *
 * @example
 * ```typescript
 * const costs = await costCalculationService.calculateTotalCosts({
 *   route,
 *   vehicle,
 *   groupSize: 10,
 *   includeFuel: true
 * });
 * ```
 */
async calculateTotalCosts(request: CostCalculationRequest): Promise<DetailedCosts> {
  // Implementation
}
```

#### Inline Comments

- Use inline comments to explain **why**, not **what**
- Complex logic should have explanatory comments
- Business rules should be documented

```typescript
// Good - Explains why
// Rent-a-car mode: client receives vehicle with full tank and returns it full
const total = includeFuel ? fuel.cost : 0;

// Bad - States the obvious
// Set total to fuel cost if includeFuel is true
const total = includeFuel ? fuel.cost : 0;
```

#### Component Documentation

React components should document:
- Purpose and usage
- Props with descriptions
- State management approach
- Side effects

```typescript
/**
 * DataForm Component
 *
 * Main quotation form for inputting trip details and selecting options.
 * Handles location input, vehicle selection, and optional cost components.
 *
 * @component
 * @example
 * ```tsx
 * <DataForm
 *   onSubmit={handleSubmit}
 *   loading={false}
 * />
 * ```
 */
export default function DataForm({ onSubmit, loading }: DataFormProps) {
  // Implementation
}
```

---

## Testing Strategy

### Test-Driven Development (TDD)

We follow TDD principles for critical business logic:

#### TDD Cycle (Red-Green-Refactor)

1. **Red**: Write a failing test first
2. **Green**: Write minimal code to make the test pass
3. **Refactor**: Improve code while keeping tests green

#### When to Use TDD

- **Always**: Core business logic (cost calculations, validations)
- **Always**: Service layer functions
- **Often**: Utility functions and helpers
- **Sometimes**: UI components (focus on logic, not styling)

### Testing Levels

#### 1. Unit Tests

Test individual functions and methods in isolation.

**Location**: Co-located with source files (`*.test.ts` or `*.test.tsx`)

**Example**:
```typescript
// src/services/CostCalculationService.test.ts
describe('CostCalculationService', () => {
  describe('calculateFuelCosts', () => {
    it('should calculate fuel costs correctly for a given distance', () => {
      const service = new CostCalculationServiceImpl();
      const vehicle: Vehicle = {
        id: '1',
        fuelEfficiency: 20,
        fuelEfficiencyUnit: 'kpg',
        // ... other properties
      };

      const result = service.calculateFuelCosts(100, vehicle, 150);

      expect(result.consumption).toBe(5); // 100km / 20kpg
      expect(result.cost).toBe(750); // 5 gallons * 150 Lps
    });

    it('should exclude fuel costs when includeFuel is false', async () => {
      const service = new CostCalculationServiceImpl();
      const request: CostCalculationRequest = {
        route: mockRoute,
        vehicle: mockVehicle,
        groupSize: 1,
        includeFuel: false
      };

      const result = await service.calculateTotalCosts(request);

      // Fuel costs should be calculated but not included in total
      expect(result.fuel.cost).toBeGreaterThan(0);
      expect(result.total).not.toContain(result.fuel.cost);
    });
  });
});
```

#### 2. Integration Tests

Test how multiple components work together.

**Example**:
```typescript
// src/hooks/useQuotationWorkflow.test.ts
describe('useQuotationWorkflow', () => {
  it('should complete full quotation workflow', async () => {
    const { result } = renderHook(() => useQuotationWorkflow());

    await act(async () => {
      await result.current.generateQuotation({
        origin: 'San Pedro Sula',
        destination: 'Tela',
        baseLocation: 'San Pedro Sula',
        groupSize: 10,
        includeFuel: true,
        includeMeals: true
      });
    });

    expect(result.current.state.result).toBeDefined();
    expect(result.current.state.result.costs.total).toBeGreaterThan(0);
  });
});
```

#### 3. Component Tests

Test React components with React Testing Library.

**Example**:
```typescript
// src/components/Forms/DataForm.test.tsx
describe('DataForm', () => {
  it('should toggle fuel inclusion when checkbox is clicked', () => {
    const onSubmit = jest.fn();
    render(<DataForm onSubmit={onSubmit} />);

    const fuelCheckbox = screen.getByLabelText(/Incluir Combustible/i);

    expect(fuelCheckbox).toBeChecked(); // Default is true

    fireEvent.click(fuelCheckbox);

    expect(fuelCheckbox).not.toBeChecked();
  });
});
```

### Test Coverage Goals

- **Services**: 90%+ coverage
- **Utilities**: 90%+ coverage
- **Components**: 70%+ coverage (focus on logic, not styling)
- **Overall**: 80%+ coverage

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- DataForm.test.tsx
```

### Test Organization

```
src/
├── services/
│   ├── CostCalculationService.ts
│   └── CostCalculationService.test.ts
├── utils/
│   ├── validation.ts
│   └── validation.test.ts
└── components/
    └── Forms/
        ├── DataForm.tsx
        └── DataForm.test.tsx
```

---

## Documentation Standards

### README Files

Each major directory should have a README explaining:
- Purpose of the directory
- Key files and their responsibilities
- Usage examples
- Dependencies

### API Documentation

Service methods should document:
- Purpose
- Parameters (with types and descriptions)
- Return values
- Possible errors
- Usage examples

### Inline Documentation

- Document complex algorithms
- Explain business rules
- Note any workarounds or technical debt
- Reference related issues or tickets

### Change Documentation

When making significant changes:
1. Update relevant README files
2. Update JSDoc comments
3. Add migration notes if needed
4. Update CHANGELOG.md

---

## Git Workflow

### Commit Messages

Follow Conventional Commits format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples**:
```
feat(rent-a-car): add optional cost component checkboxes

- Added includeFuel, includeMeals, includeTolls flags
- Updated UI with three new checkboxes in Opciones Adicionales
- Modified cost calculation to conditionally include components

Closes #123
```

```
fix(fuel-costs): exclude all fuel costs in rent-a-car mode

Previously only excluded refueling costs. Now excludes both base
fuel consumption and refueling when includeFuel is false.

Fixes #124
```

### Branch Strategy

- `main`: Production-ready code
- `develop`: Integration branch for features
- `feature/*`: Feature branches
- `fix/*`: Bug fix branches
- `hotfix/*`: Emergency fixes for production

### Pull Request Process

1. Create feature branch from `develop`
2. Implement changes with tests
3. Run linter and fix all issues
4. Ensure all tests pass
5. Update documentation
6. Create PR with clear description
7. Request code review
8. Address review comments
9. Merge after approval

---

## Performance Guidelines

### React Performance

- Use `React.memo` for expensive components
- Use `useMemo` for expensive calculations
- Use `useCallback` for event handlers passed to children
- Avoid inline object/array creation in render

### API Optimization

- Implement caching for Google Maps API responses
- Debounce user input for API calls
- Use pagination for large data sets
- Implement request cancellation for outdated requests

### Bundle Size

- Use dynamic imports for large components
- Implement code splitting
- Optimize images and assets
- Monitor bundle size with each build

---

## Code Review Checklist

### For Authors

- [ ] All tests pass
- [ ] Linter shows no errors
- [ ] Code is documented
- [ ] No console.log statements
- [ ] TypeScript strict mode satisfied
- [ ] Performance considered
- [ ] Accessibility checked
- [ ] Mobile responsive

### For Reviewers

- [ ] Code follows style guide
- [ ] Logic is clear and maintainable
- [ ] Tests cover edge cases
- [ ] Documentation is adequate
- [ ] No security vulnerabilities
- [ ] Performance implications considered
- [ ] Breaking changes noted

---

## Continuous Integration

### Pre-commit Hooks

```bash
# Install husky for git hooks
npm install --save-dev husky

# Add pre-commit hook
npx husky add .husky/pre-commit "npm run lint && npm test"
```

### CI Pipeline

1. **Lint**: Run ESLint
2. **Type Check**: Run TypeScript compiler
3. **Test**: Run all tests with coverage
4. **Build**: Ensure production build succeeds
5. **Deploy**: Deploy to staging/production

---

## Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Testing Library](https://testing-library.com/react)
- [ESLint Rules](https://eslint.org/docs/rules/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Next.js Documentation](https://nextjs.org/docs)

---

## Questions or Suggestions?

If you have questions about these practices or suggestions for improvements, please:
1. Open an issue in the repository
2. Discuss in team meetings
3. Update this document via pull request
