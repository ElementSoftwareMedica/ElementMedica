# 🧪 Guida Testing

**Versione**: 2.5.0  
**Data**: 22 Gennaio 2026

---

## 📋 Overview

Il progetto utilizza una strategia di testing multi-livello:
- **Unit Test**: Logica business isolata
- **Integration Test**: API endpoints
- **E2E Test**: Flussi utente completi
- **Security Test**: Tenant isolation

**Coverage Target**: 75%+  
**Coverage Attuale**: 75%

---

## 🛠️ Setup

### Dipendenze

```bash
# Backend (Jest)
cd backend && npm install

# Frontend (Vitest)
cd .. && npm install

# E2E (Playwright)
npx playwright install
```

### Database Test

```bash
# Crea database test
createdb elementmedica_test

# Applica migrazioni
cd backend && DATABASE_URL="postgresql://..." npx prisma migrate deploy
```

---

## 🧪 Unit Test

### Backend

```bash
cd backend
npm test                    # Tutti i test
npm test -- --watch        # Watch mode
npm test -- path/to/file   # Singolo file
npm test -- --coverage     # Con coverage
```

### Frontend

```bash
npm run test               # Vitest
npm run test:watch         # Watch mode
npm run test:coverage      # Con coverage
```

---

## 🔌 Integration Test

### API Tests

```bash
cd backend
npm run test:api           # Solo API tests
npm run test:integration   # Integration tests
```

### Esempio Test API

```javascript
// backend/tests/api/persons.test.js
describe('Persons API', () => {
  let authToken;
  
  beforeAll(async () => {
    authToken = await getTestToken();
  });

  it('GET /api/v1/persons - should return tenant persons', async () => {
    const response = await request(app)
      .get('/api/v1/persons')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    
    expect(response.body.data).toBeArray();
    response.body.data.forEach(person => {
      expect(person.tenantId).toBe(TEST_TENANT_ID);
    });
  });

  it('GET /api/v1/persons - should not return other tenant data', async () => {
    const response = await request(app)
      .get('/api/v1/persons')
      .set('Authorization', `Bearer ${authToken}`);
    
    const otherTenantPerson = response.body.data.find(
      p => p.tenantId !== TEST_TENANT_ID
    );
    expect(otherTenantPerson).toBeUndefined();
  });
});
```

---

## 🎭 E2E Test (Playwright)

### Esecuzione

```bash
npm run test:e2e              # Tutti E2E
npm run test:e2e:headed       # Con browser visibile
npm run test:e2e:debug        # Debug mode
npx playwright test --ui      # UI mode
```

### Struttura

```
tests/
├── e2e/
│   ├── auth/
│   │   ├── login.spec.ts
│   │   └── logout.spec.ts
│   ├── clinica/
│   │   ├── visite.spec.ts
│   │   └── fatture.spec.ts
│   └── formazione/
│       └── corsi.spec.ts
└── fixtures/
    └── test-data.ts
```

### Esempio E2E

```typescript
// tests/e2e/auth/login.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Login', () => {
  test('should login with valid credentials', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('[data-testid="email"]', 'admin@example.com');
    await page.fill('[data-testid="password"]', 'Admin123!');
    await page.click('[data-testid="login-button"]');
    
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('[data-testid="email"]', 'wrong@example.com');
    await page.fill('[data-testid="password"]', 'wrongpassword');
    await page.click('[data-testid="login-button"]');
    
    await expect(page.locator('.toast-error')).toBeVisible();
    await expect(page).toHaveURL('/login');
  });
});
```

---

## 🔒 Security Test

### Tenant Isolation (7/7 Required)

```javascript
// backend/tests/security/tenant-isolation.test.js
describe('Tenant Isolation', () => {
  it('should not access other tenant persons', async () => {
    const response = await request(app)
      .get(`/api/v1/persons/${OTHER_TENANT_PERSON_ID}`)
      .set('Authorization', `Bearer ${tokenTenantA}`);
    
    expect(response.status).toBe(403);
  });

  it('should not update other tenant data', async () => {
    const response = await request(app)
      .put(`/api/v1/persons/${OTHER_TENANT_PERSON_ID}`)
      .set('Authorization', `Bearer ${tokenTenantA}`)
      .send({ firstName: 'Hacked' });
    
    expect(response.status).toBe(403);
  });

  it('should not delete other tenant data', async () => {
    const response = await request(app)
      .delete(`/api/v1/persons/${OTHER_TENANT_PERSON_ID}`)
      .set('Authorization', `Bearer ${tokenTenantA}`);
    
    expect(response.status).toBe(403);
  });

  // ... altri 4 test
});
```

---

## 📊 Coverage

### Report

```bash
# Backend coverage
cd backend && npm test -- --coverage

# Frontend coverage  
npm run test:coverage

# View HTML report
open coverage/lcov-report/index.html
```

### Soglie

```javascript
// jest.config.js
module.exports = {
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 75,
      statements: 75
    }
  }
};
```

---

## 🚀 CI/CD Pipeline

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          
      - name: Install dependencies
        run: npm ci && cd backend && npm ci
        
      - name: Run backend tests
        run: cd backend && npm test -- --coverage
        
      - name: Run frontend tests
        run: npm run test -- --coverage
        
      - name: Run E2E tests
        run: npx playwright test
```

---

## 🧹 Best Practices

### Naming

```javascript
// ✅ Descrittivo
it('should return 403 when accessing other tenant data')

// ❌ Generico
it('should work')
```

### Arrange-Act-Assert

```javascript
it('should create person with valid data', async () => {
  // Arrange
  const personData = { firstName: 'Mario', lastName: 'Rossi' };
  
  // Act
  const response = await request(app)
    .post('/api/v1/persons')
    .send(personData);
  
  // Assert
  expect(response.status).toBe(201);
  expect(response.body.firstName).toBe('Mario');
});
```

### Cleanup

```javascript
afterEach(async () => {
  // Pulisci dati test
  await prisma.person.deleteMany({
    where: { email: { contains: '@test.com' } }
  });
});
```

---

## 🐛 Debug

### Jest Debug

```bash
node --inspect-brk node_modules/.bin/jest --runInBand path/to/test
```

### Playwright Debug

```bash
PWDEBUG=1 npx playwright test
```

### VSCode Launch Config

```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/backend/node_modules/.bin/jest",
  "args": ["--runInBand"],
  "console": "integratedTerminal"
}
```

---

## 📁 Struttura Test

```
project/
├── backend/
│   └── tests/
│       ├── unit/
│       │   ├── services/
│       │   └── utils/
│       ├── api/
│       │   ├── auth.test.js
│       │   ├── persons.test.js
│       │   └── companies.test.js
│       ├── security/
│       │   └── tenant-isolation.test.js
│       └── fixtures/
│           └── test-helpers.js
│
├── src/
│   └── __tests__/
│       ├── components/
│       ├── hooks/
│       └── utils/
│
└── tests/
    └── e2e/
        ├── auth/
        ├── clinica/
        └── formazione/
```
