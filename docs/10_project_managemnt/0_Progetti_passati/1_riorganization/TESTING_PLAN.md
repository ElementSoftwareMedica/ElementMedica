# 🧪 Piano di Testing - Project 2.0 Riorganizzazione

## 📋 Overview Testing Strategy

### Obiettivi Testing
- **Qualità:** Garantire funzionalità corrette e performance ottimali
- **Sicurezza:** Validare implementazione GDPR e security measures
- **Regressioni:** Prevenire rotture di funzionalità esistenti
- **Usabilità:** Assicurare UX fluida e intuitiva
- **Performance:** Verificare rispetto dei target di performance

### Piramide di Testing
```
        ┌─────────────┐
        │     E2E     │  ← 10% (Critical user journeys)
        │   Tests     │
        └─────────────┘
      ┌─────────────────┐
      │  Integration    │  ← 20% (API + Component integration)
      │     Tests       │
      └─────────────────┘
    ┌───────────────────────┐
    │     Unit Tests        │  ← 70% (Functions, components, services)
    └───────────────────────┘
```

## 🎯 Testing Targets

### Coverage Targets
- **Unit Tests:** 85% code coverage
- **Integration Tests:** 100% API endpoints
- **E2E Tests:** 100% critical user flows
- **Performance Tests:** All key scenarios
- **Security Tests:** 100% auth/authz flows

### Quality Gates
- ✅ All tests must pass
- ✅ Coverage > 85%
- ✅ No critical security vulnerabilities
- ✅ Performance within targets
- ✅ Accessibility compliance (WCAG 2.1 AA)

## 🔧 Testing Tools & Framework

### Frontend Testing Stack
```typescript
// Testing framework
"vitest": "^1.0.0",           // Unit testing
"@testing-library/react": "^13.0.0",  // Component testing
"@testing-library/jest-dom": "^6.0.0", // DOM assertions
"@testing-library/user-event": "^14.0.0", // User interactions
"playwright": "^1.40.0",      // E2E testing
"@storybook/react": "^7.0.0", // Component documentation
"axe-core": "^4.8.0",         // Accessibility testing
```

### Backend Testing Stack
```typescript
// Testing framework
"jest": "^29.0.0",            // Unit testing
"supertest": "^6.3.0",        // API testing
"@testcontainers/postgresql": "^10.0.0", // Database testing
"nock": "^13.0.0",            // HTTP mocking
"faker": "^8.0.0",            // Test data generation
```

### Performance & Security
```typescript
// Performance testing
"lighthouse": "^11.0.0",      // Web performance
"k6": "^0.47.0",              // Load testing

// Security testing
"eslint-plugin-security": "^1.7.0", // Static analysis
"audit-ci": "^6.6.0",         // Dependency scanning
"snyk": "^1.1200.0",          // Vulnerability scanning
```

## 📱 Frontend Testing

### Unit Testing

#### Component Testing
```typescript
// Button.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

describe('Button Component', () => {
  it('renders with correct text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button')).toHaveTextContent('Click me');
  });

  it('calls onClick when clicked', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    
    render(<Button onClick={handleClick}>Click me</Button>);
    await user.click(screen.getByRole('button'));
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when loading', () => {
    render(<Button loading>Click me</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('shows loading spinner when loading', () => {
    render(<Button loading>Click me</Button>);
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });
});
```

#### Hook Testing
```typescript
// useAuth.test.ts
import { renderHook, act } from '@testing-library/react';
import { useAuth } from './useAuth';
import { AuthProvider } from './AuthProvider';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('useAuth Hook', () => {
  it('should login user successfully', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    
    await act(async () => {
      await result.current.login('test@example.com', 'password123');
    });
    
    expect(result.current.user).toBeDefined();
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('should handle login error', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    
    await act(async () => {
      await result.current.login('invalid@example.com', 'wrongpassword');
    });
    
    expect(result.current.user).toBeNull();
    expect(result.current.error).toBeDefined();
  });
});
```

### Integration Testing

#### Page Testing
```typescript
// LoginPage.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LoginPage } from './LoginPage';
import { server } from '../mocks/server';

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  
  return render(
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    </BrowserRouter>
  );
};

describe('LoginPage', () => {
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('should login user and redirect to dashboard', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);
    
    await user.type(screen.getByLabelText(/email/i), 'admin@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /login/i }));
    
    await waitFor(() => {
      expect(window.location.pathname).toBe('/dashboard');
    });
  });

  it('should show error for invalid credentials', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);
    
    await user.type(screen.getByLabelText(/email/i), 'invalid@example.com');
    await user.type(screen.getByLabelText(/password/i), 'wrongpassword');
    await user.click(screen.getByRole('button', { name: /login/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
  });
});
```

### E2E Testing

#### Critical User Journeys
```typescript
// auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('complete login flow', async ({ page }) => {
    await page.goto('/login');
    
    // Fill login form
    await page.fill('[data-testid="email"]', 'admin@example.com');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    // Verify redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('h1')).toContainText('Dashboard');
    
    // Verify user menu
    await page.click('[data-testid="user-menu"]');
    await expect(page.locator('[data-testid="user-email"]'))
      .toContainText('admin@example.com');
  });

  test('logout flow', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'admin@example.com');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    // Logout
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout-button"]');
    
    // Verify redirect to login
    await expect(page).toHaveURL('/login');
  });
});

// company-management.spec.ts
test.describe('Company Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'admin@example.com');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');
  });

  test('create new company', async ({ page }) => {
    await page.goto('/companies');
    await page.click('[data-testid="add-company-button"]');
    
    // Fill company form
    await page.fill('[data-testid="company-name"]', 'Test Company');
    await page.fill('[data-testid="company-email"]', 'test@company.com');
    await page.fill('[data-testid="company-phone"]', '+39 123 456 7890');
    await page.click('[data-testid="save-company-button"]');
    
    // Verify company created
    await expect(page.locator('[data-testid="success-message"]'))
      .toContainText('Company created successfully');
    await expect(page.locator('table')).toContainText('Test Company');
  });

  test('edit existing company', async ({ page }) => {
    await page.goto('/companies');
    await page.click('[data-testid="company-row"]:first-child [data-testid="edit-button"]');
    
    // Update company name
    await page.fill('[data-testid="company-name"]', 'Updated Company Name');
    await page.click('[data-testid="save-company-button"]');
    
    // Verify update
    await expect(page.locator('[data-testid="success-message"]'))
      .toContainText('Company updated successfully');
  });
});
```

## 🔧 Backend Testing

### Unit Testing

#### Service Testing
```typescript
// userService.test.ts
import { UserService } from './UserService';
import { prismaMock } from '../mocks/prisma';
import { hashPassword } from '../utils/crypto';

jest.mock('../utils/crypto');

describe('UserService', () => {
  let userService: UserService;

  beforeEach(() => {
    userService = new UserService(prismaMock);
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    it('should create user with hashed password', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe'
      };

      const hashedPassword = 'hashed_password';
      (hashPassword as jest.Mock).mockResolvedValue(hashedPassword);

      const mockUser = {
        id: '1',
        email: userData.email,
        password: hashedPassword,
        firstName: userData.firstName,
        lastName: userData.lastName,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      prismaMock.user.create.mockResolvedValue(mockUser);

      const result = await userService.createUser(userData);

      expect(hashPassword).toHaveBeenCalledWith(userData.password);
      expect(prismaMock.user.create).toHaveBeenCalledWith({
        data: {
          email: userData.email,
          password: hashedPassword,
          firstName: userData.firstName,
          lastName: userData.lastName
        }
      });
      expect(result).toEqual(mockUser);
    });

    it('should throw error for duplicate email', async () => {
      const userData = {
        email: 'existing@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe'
      };

      prismaMock.user.create.mockRejectedValue(
        new Error('Unique constraint failed')
      );

      await expect(userService.createUser(userData))
        .rejects.toThrow('User with this email already exists');
    });
  });
});
```

#### Middleware Testing
```typescript
// auth.middleware.test.ts
import { Request, Response, NextFunction } from 'express';
import { authMiddleware } from './auth.middleware';
import { verifyToken } from '../utils/jwt';

jest.mock('../utils/jwt');

describe('Auth Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {
      headers: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });

  it('should authenticate valid token', async () => {
    const mockUser = { id: '1', email: 'test@example.com', role: 'admin' };
    req.headers!.authorization = 'Bearer valid_token';
    
    (verifyToken as jest.Mock).mockResolvedValue(mockUser);

    await authMiddleware(req as Request, res as Response, next);

    expect(req.user).toEqual(mockUser);
    expect(next).toHaveBeenCalled();
  });

  it('should reject missing token', async () => {
    await authMiddleware(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Access token required'
      }
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('should reject invalid token', async () => {
    req.headers!.authorization = 'Bearer invalid_token';
    
    (verifyToken as jest.Mock).mockRejectedValue(new Error('Invalid token'));

    await authMiddleware(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid access token'
      }
    });
  });
});
```

### Integration Testing

#### API Endpoint Testing
```typescript
// users.api.test.ts
import request from 'supertest';
import { app } from '../app';
import { setupTestDatabase, cleanupTestDatabase } from '../test-utils/database';
import { createTestUser, getAuthToken } from '../test-utils/auth';

describe('Users API', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe('POST /api/users', () => {
    it('should create user with valid data', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        role: 'employee'
      };

      const adminToken = await getAuthToken('admin');

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe(userData.email);
      expect(response.body.data.password).toBeUndefined(); // Password should not be returned
    });

    it('should reject duplicate email', async () => {
      const existingUser = await createTestUser();
      const adminToken = await getAuthToken('admin');

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: existingUser.email,
          password: 'password123',
          firstName: 'John',
          lastName: 'Doe'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('DUPLICATE_EMAIL');
    });

    it('should reject invalid data', async () => {
      const adminToken = await getAuthToken('admin');

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'invalid-email',
          password: '123', // Too short
          firstName: '',   // Empty
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject unauthorized access', async () => {
      await request(app)
        .post('/api/users')
        .send({
          email: 'test@example.com',
          password: 'password123',
          firstName: 'John',
          lastName: 'Doe'
        })
        .expect(401);
    });
  });

  describe('GET /api/users', () => {
    it('should return paginated users', async () => {
      const adminToken = await getAuthToken('admin');

      const response = await request(app)
        .get('/api/users?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.meta.pagination).toBeDefined();
    });

    it('should filter users by role', async () => {
      const adminToken = await getAuthToken('admin');

      const response = await request(app)
        .get('/api/users?role=admin')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.every((user: any) => user.role === 'admin'))
        .toBe(true);
    });
  });
});
```

## 🔒 Security Testing

### Authentication Testing
```typescript
// auth.security.test.ts
describe('Authentication Security', () => {
  describe('Password Security', () => {
    it('should reject weak passwords', async () => {
      const weakPasswords = [
        '123',
        'password',
        '12345678',
        'qwerty',
        'admin'
      ];

      for (const password of weakPasswords) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'test@example.com',
            password,
            firstName: 'John',
            lastName: 'Doe'
          });

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('WEAK_PASSWORD');
      }
    });

    it('should enforce password complexity', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'StrongP@ssw0rd123!',
          firstName: 'John',
          lastName: 'Doe'
        });

      expect(response.status).toBe(201);
    });
  });

  describe('Rate Limiting', () => {
    it('should limit login attempts', async () => {
      const attempts = [];
      
      // Make multiple failed login attempts
      for (let i = 0; i < 6; i++) {
        attempts.push(
          request(app)
            .post('/api/auth/login')
            .send({
              email: 'test@example.com',
              password: 'wrongpassword'
            })
        );
      }

      const responses = await Promise.all(attempts);
      const lastResponse = responses[responses.length - 1];

      expect(lastResponse.status).toBe(429);
      expect(lastResponse.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    });
  });

  describe('JWT Security', () => {
    it('should reject expired tokens', async () => {
      const expiredToken = generateExpiredToken();

      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('TOKEN_EXPIRED');
    });

    it('should reject tampered tokens', async () => {
      const validToken = await getAuthToken('user');
      const tamperedToken = validToken.slice(0, -5) + 'xxxxx';

      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${tamperedToken}`);

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });
  });
});
```

### GDPR Compliance Testing
```typescript
// gdpr.test.ts
describe('GDPR Compliance', () => {
  describe('Data Export', () => {
    it('should export user data in JSON format', async () => {
      const user = await createTestUser();
      const token = await getAuthToken(user.id);

      const response = await request(app)
        .get('/api/gdpr/export')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('personalData');
      expect(response.body.data).toHaveProperty('activityLogs');
      expect(response.body.data).toHaveProperty('consents');
    });
  });

  describe('Data Deletion', () => {
    it('should delete user data and anonymize logs', async () => {
      const user = await createTestUser();
      const token = await getAuthToken(user.id);

      const response = await request(app)
        .delete('/api/gdpr/delete-account')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Verify user is deleted
      const deletedUser = await prisma.user.findUnique({
        where: { id: user.id }
      });
      expect(deletedUser).toBeNull();

      // Verify logs are anonymized
      const logs = await prisma.auditLog.findMany({
        where: { userId: user.id }
      });
      expect(logs.every(log => log.userId === null)).toBe(true);
    });
  });

  describe('Consent Management', () => {
    it('should track consent changes', async () => {
      const user = await createTestUser();
      const token = await getAuthToken(user.id);

      await request(app)
        .post('/api/gdpr/consent')
        .set('Authorization', `Bearer ${token}`)
        .send({
          consentType: 'marketing',
          granted: true
        })
        .expect(200);

      const consent = await prisma.gdprConsent.findFirst({
        where: {
          userId: user.id,
          consentType: 'marketing'
        }
      });

      expect(consent?.granted).toBe(true);
      expect(consent?.grantedAt).toBeDefined();
    });
  });
});
```

## 📊 Performance Testing

### Load Testing
```javascript
// load-test.js (K6)
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 200 }, // Ramp up to 200 users
    { duration: '5m', target: 200 }, // Stay at 200 users
    { duration: '2m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    http_req_failed: ['rate<0.1'],    // Error rate under 10%
    errors: ['rate<0.1'],
  },
};

export default function () {
  // Login
  const loginResponse = http.post('http://localhost:4001/api/auth/login', {
    email: 'test@example.com',
    password: 'password123',
  });

  const loginSuccess = check(loginResponse, {
    'login successful': (r) => r.status === 200,
    'login response time < 200ms': (r) => r.timings.duration < 200,
  });

  if (!loginSuccess) {
    errorRate.add(1);
    return;
  }

  const token = loginResponse.json('data.token');

  // Get companies
  const companiesResponse = http.get('http://localhost:4001/api/companies', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  check(companiesResponse, {
    'companies fetch successful': (r) => r.status === 200,
    'companies response time < 300ms': (r) => r.timings.duration < 300,
  });

  // Get employees
  const employeesResponse = http.get('http://localhost:4001/api/employees', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  check(employeesResponse, {
    'employees fetch successful': (r) => r.status === 200,
    'employees response time < 300ms': (r) => r.timings.duration < 300,
  });

  sleep(1);
}
```

### Frontend Performance Testing
```typescript
// performance.test.ts
import { test, expect } from '@playwright/test';

test.describe('Performance Tests', () => {
  test('dashboard loads within performance budget', async ({ page }) => {
    // Start performance monitoring
    await page.goto('/login');
    
    // Login
    await page.fill('[data-testid="email"]', 'admin@example.com');
    await page.fill('[data-testid="password"]', 'password123');
    
    const navigationPromise = page.waitForNavigation();
    await page.click('[data-testid="login-button"]');
    await navigationPromise;
    
    // Measure performance
    const performanceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime,
        firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime,
      };
    });
    
    // Assert performance budgets
    expect(performanceMetrics.domContentLoaded).toBeLessThan(1500); // 1.5s
    expect(performanceMetrics.firstContentfulPaint).toBeLessThan(1000); // 1s
  });

  test('large table renders efficiently', async ({ page }) => {
    await page.goto('/companies');
    
    // Wait for table to load
    await page.waitForSelector('[data-testid="companies-table"]');
    
    // Measure rendering time
    const renderTime = await page.evaluate(() => {
      const start = performance.now();
      
      // Trigger re-render by changing filter
      const filterInput = document.querySelector('[data-testid="search-input"]') as HTMLInputElement;
      filterInput.value = 'test';
      filterInput.dispatchEvent(new Event('input', { bubbles: true }));
      
      return new Promise(resolve => {
        requestAnimationFrame(() => {
          resolve(performance.now() - start);
        });
      });
    });
    
    expect(renderTime).toBeLessThan(100); // 100ms for re-render
  });
});
```

## 📋 Test Execution Plan

### Development Phase
```bash
# Daily during development
npm run test:unit          # Unit tests
npm run test:integration   # Integration tests
npm run lint              # Code quality
npm run type-check        # TypeScript validation

# Before each commit
npm run test:pre-commit   # Fast test suite
npm run format           # Code formatting
```

### CI/CD Pipeline
```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm run test:unit:coverage
      
      - name: Run integration tests
        run: npm run test:integration
      
      - name: Run E2E tests
        run: npm run test:e2e
      
      - name: Run security scan
        run: npm audit --audit-level moderate
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

### Release Testing
```bash
# Before each release
npm run test:full         # Complete test suite
npm run test:performance  # Performance tests
npm run test:security     # Security tests
npm run test:accessibility # A11y tests
npm run build:production  # Production build test
```

## 📊 Test Reporting

### Coverage Reports
- **HTML Report:** Detailed coverage visualization
- **JSON Report:** Machine-readable coverage data
- **LCOV Report:** Integration with external tools
- **Console Report:** Quick overview during development

### Test Results Dashboard
- **Pass/Fail Status:** Real-time test status
- **Performance Trends:** Historical performance data
- **Coverage Trends:** Coverage evolution over time
- **Flaky Test Detection:** Identification of unstable tests

### Quality Gates
```typescript
// jest.config.js
module.exports = {
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    },
    './src/components/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  }
};
```

---

**Piano di Testing:** v1.0  
**Ultima Revisione:** $(date)  
**Prossimo Aggiornamento:** Settimanale durante sviluppo