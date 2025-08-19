# Testing Guide

This document provides comprehensive guidance on the testing infrastructure implemented for the Document Management System.

## Overview

The project implements a multi-layered testing strategy covering:

- **Unit Tests** - Component and function-level testing with Vitest
- **Integration Tests** - API and database integration testing with Jest
- **End-to-End Tests** - Full user workflow testing with Playwright
- **Accessibility Tests** - WCAG compliance testing with axe-core
- **Security Tests** - Vulnerability and penetration testing
- **Performance Tests** - Load testing and performance benchmarks
- **Regression Tests** - Ensuring existing functionality remains intact
- **Smoke Tests** - Critical functionality verification

## Test Structure

```
tests/
├── accessibility/          # Accessibility compliance tests
│   └── a11y.spec.ts
├── fixtures/               # Test data and mock files
│   └── test-document.pdf
├── integration/            # Full workflow integration tests
│   └── full-workflow.spec.ts
├── performance/            # Performance and load tests
│   └── load-test.spec.ts
├── regression/             # Regression test suite
│   └── regression.spec.ts
├── security/               # Security vulnerability tests
│   └── security.spec.ts
├── smoke/                  # Critical functionality tests
│   └── smoke.spec.ts
└── unit/                   # Unit tests
    ├── Button.test.tsx
    └── SearchBar.test.tsx

src/test/
└── setup.ts               # Test environment setup

backend/tests/
├── auth.test.js           # Authentication API tests
├── documents.test.js      # Document management API tests
└── setup.js               # Backend test setup
```

## Configuration Files

### Frontend Testing

- **`vitest.config.ts`** - Vitest configuration for unit tests
- **`playwright.config.ts`** - Playwright configuration for E2E tests
- **`src/test/setup.ts`** - Test environment setup and mocks

### Backend Testing

- **`backend/jest.config.js`** - Jest configuration for backend tests
- **`backend/tests/setup.js`** - Backend test environment setup

## Available Test Scripts

### Frontend Tests

```bash
# Unit tests
npm run test                    # Run unit tests
npm run test:watch             # Run tests in watch mode
npm run test:ui                # Run tests with UI
npm run test:coverage          # Run tests with coverage report

# End-to-end tests
npm run test:e2e               # Run all E2E tests
npm run test:e2e:ui            # Run E2E tests with UI
npm run test:e2e:headed        # Run E2E tests in headed mode
npm run test:e2e:debug         # Run E2E tests in debug mode

# Specialized test suites
npm run test:accessibility     # Run accessibility tests
npm run test:security          # Run security tests
npm run test:performance       # Run performance tests
npm run test:regression        # Run regression tests
npm run test:integration       # Run integration tests
npm run test:smoke             # Run smoke tests

# Combined test runs
npm run test:all               # Run unit + E2E tests
npm run test:ci                # Run tests for CI/CD
```

### Backend Tests

```bash
cd backend

# Backend API tests
npm run test                   # Run all backend tests
npm run test:watch            # Run tests in watch mode
npm run test:coverage         # Run tests with coverage
npm run test:integration      # Run integration tests only
npm run test:unit             # Run unit tests only
```

## Test Categories

### 1. Unit Tests

**Purpose**: Test individual components and functions in isolation.

**Technology**: Vitest + React Testing Library

**Coverage**: 
- React components
- Utility functions
- Custom hooks
- Business logic

**Example**:
```typescript
// Button.test.tsx
import { render, screen } from '@testing-library/react';
import { Button } from './Button';

test('renders button with text', () => {
  render(<Button>Click me</Button>);
  expect(screen.getByRole('button')).toHaveTextContent('Click me');
});
```

### 2. Integration Tests

**Purpose**: Test API endpoints and database interactions.

**Technology**: Jest + Supertest

**Coverage**:
- Authentication endpoints
- Document management APIs
- Database operations
- External service integrations

**Example**:
```javascript
// auth.test.js
test('POST /api/auth/login with valid credentials', async () => {
  const response = await request(app)
    .post('/api/auth/login')
    .send({ email: 'user@example.com', password: 'password123' });
  
  expect(response.status).toBe(200);
  expect(response.body).toHaveProperty('token');
});
```

### 3. End-to-End Tests

**Purpose**: Test complete user workflows from browser perspective.

**Technology**: Playwright

**Coverage**:
- User authentication flows
- Document upload and management
- Search and filtering
- Admin functionality
- Multi-browser compatibility

**Example**:
```typescript
// documents.spec.ts
test('user can upload and view document', async ({ page }) => {
  await page.goto('/documents');
  await page.click('[data-testid="upload-button"]');
  await page.setInputFiles('input[type="file"]', 'test-document.pdf');
  await page.click('[data-testid="upload-submit"]');
  
  await expect(page.locator('[data-testid="document-item"]')).toBeVisible();
});
```

### 4. Accessibility Tests

**Purpose**: Ensure WCAG 2.1 AA compliance and accessibility standards.

**Technology**: Playwright + axe-core

**Coverage**:
- Color contrast ratios
- Keyboard navigation
- Screen reader compatibility
- ARIA attributes
- Focus management

### 5. Security Tests

**Purpose**: Identify security vulnerabilities and ensure secure practices.

**Coverage**:
- SQL injection prevention
- XSS protection
- Authentication security
- Authorization checks
- Input validation
- Rate limiting

### 6. Performance Tests

**Purpose**: Measure and validate application performance.

**Coverage**:
- Page load times
- API response times
- Large dataset handling
- Memory usage
- Concurrent user scenarios

### 7. Regression Tests

**Purpose**: Ensure existing functionality continues to work after changes.

**Coverage**:
- Critical user paths
- Data persistence
- Session management
- Error handling
- Browser compatibility

### 8. Smoke Tests

**Purpose**: Quick verification of critical functionality.

**Coverage**:
- Application startup
- Basic navigation
- Authentication
- Core features
- API connectivity

## Test Data Management

### Fixtures

Test fixtures are stored in `tests/fixtures/` and include:
- Sample PDF documents
- Mock user data
- Test images
- Configuration files

### Database Seeding

For backend tests, the database is automatically seeded with test data:

```javascript
// backend/tests/setup.js
beforeAll(async () => {
  await createTestUser({
    email: 'admin@example.com',
    password: 'password123',
    role: 'admin'
  });
});
```

## Continuous Integration

The project includes GitHub Actions workflows for automated testing:

### Test Pipeline

1. **Unit Tests** - Run on all Node.js versions
2. **Backend Tests** - With PostgreSQL service
3. **E2E Tests** - Full application testing
4. **Accessibility Tests** - WCAG compliance
5. **Security Tests** - Vulnerability scanning
6. **Performance Tests** - Load testing (PR only)
7. **Regression Tests** - Daily and on main branch

### Coverage Reporting

- Unit test coverage uploaded to Codecov
- Coverage thresholds enforced:
  - Statements: 80%
  - Branches: 75%
  - Functions: 80%
  - Lines: 80%

## Best Practices

### Writing Tests

1. **Use descriptive test names** that explain what is being tested
2. **Follow AAA pattern** - Arrange, Act, Assert
3. **Test behavior, not implementation** details
4. **Use data-testid attributes** for reliable element selection
5. **Mock external dependencies** to ensure test isolation
6. **Keep tests independent** - each test should be able to run in isolation

### Test Organization

1. **Group related tests** using `describe` blocks
2. **Use beforeEach/afterEach** for common setup/cleanup
3. **Share test utilities** in helper files
4. **Maintain test data** in fixtures

### Performance

1. **Run tests in parallel** when possible
2. **Use test databases** separate from development
3. **Clean up resources** after tests
4. **Optimize test execution time**

## Debugging Tests

### Unit Tests

```bash
# Debug specific test
npm run test -- --reporter=verbose Button.test.tsx

# Run tests in watch mode
npm run test:watch
```

### E2E Tests

```bash
# Run in headed mode to see browser
npm run test:e2e:headed

# Debug specific test
npm run test:e2e:debug -- --grep "upload document"

# Generate trace for debugging
npx playwright test --trace on
```

### Backend Tests

```bash
cd backend

# Run specific test file
npm test -- auth.test.js

# Run with verbose output
npm test -- --verbose
```

## Coverage Reports

### Viewing Coverage

```bash
# Generate and view unit test coverage
npm run test:coverage
open coverage/index.html

# Generate backend coverage
cd backend && npm run test:coverage
open coverage/lcov-report/index.html
```

### Coverage Thresholds

The project enforces minimum coverage thresholds:

- **Frontend**: 80% statements, 75% branches, 80% functions, 80% lines
- **Backend**: 70% overall coverage

## Troubleshooting

### Common Issues

1. **Tests failing in CI but passing locally**
   - Check environment variables
   - Verify database setup
   - Review timing issues

2. **Flaky E2E tests**
   - Add explicit waits
   - Use more specific selectors
   - Check for race conditions

3. **Slow test execution**
   - Run tests in parallel
   - Optimize database operations
   - Use test doubles for external services

### Getting Help

1. Check test logs for detailed error messages
2. Use debugging tools (browser dev tools, Node.js debugger)
3. Review test documentation and examples
4. Consult team members for complex issues

## Maintenance

### Regular Tasks

1. **Update test dependencies** regularly
2. **Review and update test data** as application evolves
3. **Monitor test execution times** and optimize slow tests
4. **Review coverage reports** and add tests for uncovered code
5. **Update test documentation** when adding new test types

### Test Metrics

Monitor these metrics to ensure test suite health:

- Test execution time
- Test failure rate
- Code coverage percentage
- Number of flaky tests
- Test maintenance overhead

---

## Quick Start

To run the complete test suite:

```bash
# Install dependencies
npm install
cd backend && npm install && cd ..

# Run all tests
npm run test:all

# Run specific test categories
npm run test:smoke          # Quick smoke tests
npm run test:accessibility  # Accessibility compliance
npm run test:security       # Security vulnerabilities
```

For more detailed information about specific test categories, refer to the individual test files and their documentation.