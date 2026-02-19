# Testing Guide - React Framework

## Quick Start

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with UI
npm run test:ui

# Generate coverage report
npm run test:coverage
```

## Test Files Overview

```
src/
├── components/
│   ├── ChartCard.test.tsx        # 8 tests - Chart wrapper component
│   ├── Layout.test.tsx           # 6 tests - Main layout with routing
│   ├── LoadingSpinner.test.tsx   # 3 tests - Loading indicator
│   ├── Navbar.test.tsx           # 6 tests - Top navigation bar
│   └── Sidebar.test.tsx          # 5 tests - Side navigation menu
├── hooks/
│   └── useApi.test.ts            # 6 tests - Custom data fetching hook
├── utils/
│   └── helpers.test.ts           # 21 tests - Utility functions
└── test/
    └── setup.ts                  # Test configuration
```

## Writing New Tests

### Component Test Template

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { YourComponent } from './YourComponent';

describe('YourComponent', () => {
  it('should render correctly', () => {
    render(<YourComponent />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });
});
```

### Hook Test Template

```typescript
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useYourHook } from './useYourHook';

describe('useYourHook', () => {
  it('should return expected value', async () => {
    const { result } = renderHook(() => useYourHook());
    
    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });
  });
});
```

### Utility Function Test Template

```typescript
import { describe, it, expect } from 'vitest';
import { yourFunction } from './helpers';

describe('yourFunction', () => {
  it('should return correct result', () => {
    expect(yourFunction(input)).toBe(expectedOutput);
  });
});
```

## Testing Best Practices

### ✅ Do's
- Test user behavior, not implementation details
- Use `screen` queries from @testing-library/react
- Test edge cases (empty, null, error states)
- Keep tests simple and focused
- Use descriptive test names
- Mock external dependencies (API calls, timers)

### ❌ Don'ts
- Don't test internal state directly
- Don't rely on implementation details
- Don't write overly complex tests
- Don't skip error handling tests
- Don't test third-party libraries

## Common Testing Patterns

### Testing Components with Props

```typescript
it('should display custom message', () => {
  render(<Message text="Hello World" />);
  expect(screen.getByText('Hello World')).toBeInTheDocument();
});
```

### Testing Loading States

```typescript
it('should show loading spinner', () => {
  render(<Component loading={true} />);
  expect(screen.getByRole('status')).toBeInTheDocument();
});
```

### Testing Error States

```typescript
it('should display error message', () => {
  render(<Component error="Something went wrong" />);
  expect(screen.getByText('Something went wrong')).toBeInTheDocument();
});
```

### Testing User Interactions

```typescript
import { userEvent } from '@testing-library/user-event';

it('should handle button click', async () => {
  const user = userEvent.setup();
  render(<Button onClick={handleClick} />);
  
  await user.click(screen.getByRole('button'));
  expect(handleClick).toHaveBeenCalled();
});
```

### Testing Async Operations

```typescript
it('should fetch and display data', async () => {
  render(<DataComponent />);
  
  await waitFor(() => {
    expect(screen.getByText('Data loaded')).toBeInTheDocument();
  });
});
```

## Troubleshooting

### Tests failing with "not wrapped in act()"
- Use `waitFor` for async operations
- Use `userEvent` instead of `fireEvent`

### Tests passing locally but failing in CI
- Check for timezone issues with dates
- Ensure consistent test data
- Check environment variables

### Slow test execution
- Mock heavy dependencies
- Use `vi.mock()` for expensive operations
- Consider splitting large test files

## Continuous Integration

Add to your CI pipeline:

```yaml
- name: Run tests
  run: npm test -- --run

- name: Check coverage
  run: npm run test:coverage
```

## Coverage Goals

- **Statements:** 100%
- **Branches:** 100%
- **Functions:** 100%
- **Lines:** 100%

Current status: ✅ All goals met!
