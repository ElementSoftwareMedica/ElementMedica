# 🧪 Testing Plan - Sistema Preventivi e Codici Sconto

**Progetto**: Quality Assurance & Testing Strategy  
**Data**: 8 Novembre 2025  
**Versione**: 1.0  
**Target Coverage**: >80% (Unit), >70% (Integration), 100% (Critical Paths E2E)

---

## 📋 Indice

1. [Testing Strategy](#testing-strategy)
2. [Unit Testing](#unit-testing)
3. [Integration Testing](#integration-testing)
4. [E2E Testing](#e2e-testing)
5. [Performance Testing](#performance-testing)
6. [Security Testing](#security-testing)
7. [Accessibility Testing](#accessibility-testing)
8. [Test Data & Fixtures](#test-data--fixtures)
9. [CI/CD Integration](#cicd-integration)
10. [QA Checklist](#qa-checklist)

---

## 🎯 Testing Strategy

### Testing Pyramid

```
         /\
        /  \      E2E Tests (10%)
       /────\     - Critical user journeys
      /      \    - Main workflows
     /────────\   
    /          \  Integration Tests (30%)
   /────────────\ - API endpoints
  /              \- Database operations
 /────────────────\
/                  \ Unit Tests (60%)
────────────────────- Business logic
                     - Validation functions
                     - Calculations
```

### Testing Levels

| Level | Focus | Tools | Coverage Target |
|-------|-------|-------|-----------------|
| Unit | Funzioni isolate | Jest, Vitest | >80% |
| Integration | API + DB | Jest + Supertest | >70% |
| E2E | User workflows | Playwright | 100% critical paths |
| Performance | Load/Stress | k6, Artillery | Key endpoints |
| Security | Vulnerabilities | OWASP ZAP, npm audit | Zero critical |
| Accessibility | WCAG 2.1 AA | axe-core, Pa11y | 100% |

---

## 🔬 Unit Testing

### Backend Unit Tests

#### File: `backend/services/validazioneScontoService.test.js`

```javascript
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { ValidazioneScontoService } from '../services/validazioneScontoService.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const service = new ValidazioneScontoService();

describe('ValidazioneScontoService', () => {
  let testCodice;
  let testTenant;
  
  beforeEach(async () => {
    // Setup test data
    testTenant = await prisma.tenant.create({
      data: { nome: 'Test Tenant', slug: 'test-tenant' }
    });
    
    testCodice = await prisma.codiceSconto.create({
      data: {
        codice: 'TEST001',
        nome: 'Test Codice',
        tipoSconto: 'PERCENTUALE',
        valore: 10,
        dataInizio: new Date('2025-01-01'),
        dataFine: new Date('2025-12-31'),
        attivo: true,
        applicabileA: 'TUTTI',
        tipoCorso: 'TUTTI',
        tenantId: testTenant.id,
        createdBy: 'test-user'
      }
    });
  });
  
  afterEach(async () => {
    // Cleanup
    await prisma.codiceSconto.deleteMany({ where: { tenantId: testTenant.id } });
    await prisma.tenant.delete({ where: { id: testTenant.id } });
  });
  
  describe('validaCodice', () => {
    it('should validate active code successfully', async () => {
      const result = await service.validaCodice({
        codice: 'TEST001',
        importoBase: 100,
        tenantId: testTenant.id
      });
      
      expect(result.valido).toBe(true);
      expect(result.scontoCalcolato).toBe(10); // 10% di 100
      expect(result.messaggioUtente).toContain('Sconto applicato');
    });
    
    it('should reject non-existent code', async () => {
      const result = await service.validaCodice({
        codice: 'NONEXISTENT',
        importoBase: 100,
        tenantId: testTenant.id
      });
      
      expect(result.valido).toBe(false);
      expect(result.messaggioUtente).toBe('Codice sconto non valido');
    });
    
    it('should reject inactive code', async () => {
      await prisma.codiceSconto.update({
        where: { id: testCodice.id },
        data: { attivo: false }
      });
      
      const result = await service.validaCodice({
        codice: 'TEST001',
        importoBase: 100,
        tenantId: testTenant.id
      });
      
      expect(result.valido).toBe(false);
      expect(result.messaggioUtente).toBe('Codice sconto non attivo');
    });
    
    it('should reject expired code', async () => {
      await prisma.codiceSconto.update({
        where: { id: testCodice.id },
        data: {
          dataInizio: new Date('2024-01-01'),
          dataFine: new Date('2024-12-31')
        }
      });
      
      const result = await service.validaCodice({
        codice: 'TEST001',
        importoBase: 100,
        tenantId: testTenant.id
      });
      
      expect(result.valido).toBe(false);
      expect(result.messaggioUtente).toContain('valido dal');
    });
    
    it('should reject when usage limit exceeded', async () => {
      await prisma.codiceSconto.update({
        where: { id: testCodice.id },
        data: {
          utilizzoMassimo: 10,
          utilizzoCorrente: 10
        }
      });
      
      const result = await service.validaCodice({
        codice: 'TEST001',
        importoBase: 100,
        tenantId: testTenant.id
      });
      
      expect(result.valido).toBe(false);
      expect(result.messaggioUtente).toBe('Codice sconto esaurito');
    });
    
    it('should reject when below minimum amount', async () => {
      await prisma.codiceSconto.update({
        where: { id: testCodice.id },
        data: { minImporto: 200 }
      });
      
      const result = await service.validaCodice({
        codice: 'TEST001',
        importoBase: 100,
        tenantId: testTenant.id
      });
      
      expect(result.valido).toBe(false);
      expect(result.messaggioUtente).toContain('Importo minimo richiesto');
    });
    
    it('should reject non-cumulative code when others already applied', async () => {
      await prisma.codiceSconto.update({
        where: { id: testCodice.id },
        data: { cumulabile: false }
      });
      
      const otherCodice = await prisma.codiceSconto.create({
        data: {
          codice: 'OTHER001',
          nome: 'Other Code',
          tipoSconto: 'PERCENTUALE',
          valore: 5,
          dataInizio: new Date('2025-01-01'),
          dataFine: new Date('2025-12-31'),
          attivo: true,
          applicabileA: 'TUTTI',
          tipoCorso: 'TUTTI',
          tenantId: testTenant.id,
          createdBy: 'test-user'
        }
      });
      
      const result = await service.validaCodice({
        codice: 'TEST001',
        importoBase: 100,
        codiciGiaApplicati: [otherCodice.id],
        tenantId: testTenant.id
      });
      
      expect(result.valido).toBe(false);
      expect(result.messaggioUtente).toContain('non è cumulabile');
    });
  });
  
  describe('calcolaScontoSingolo', () => {
    it('should calculate percentage discount correctly', () => {
      const codice = {
        tipoSconto: 'PERCENTUALE',
        valore: 15
      };
      
      const sconto = service.calcolaScontoSingolo(1000, codice);
      expect(sconto).toBe(150); // 15% di 1000
    });
    
    it('should calculate absolute discount correctly', () => {
      const codice = {
        tipoSconto: 'VALORE_ASSOLUTO',
        valore: 50
      };
      
      const sconto = service.calcolaScontoSingolo(1000, codice);
      expect(sconto).toBe(50);
    });
    
    it('should apply max discount cap', () => {
      const codice = {
        tipoSconto: 'PERCENTUALE',
        valore: 20,
        maxImporto: 100
      };
      
      const sconto = service.calcolaScontoSingolo(1000, codice);
      expect(sconto).toBe(100); // 20% sarebbe 200, ma cap a 100
    });
    
    it('should never discount more than base amount', () => {
      const codice = {
        tipoSconto: 'VALORE_ASSOLUTO',
        valore: 500
      };
      
      const sconto = service.calcolaScontoSingolo(200, codice);
      expect(sconto).toBe(200); // Non può superare importo base
    });
  });
});
```

#### File: `backend/services/calcoloScontoService.test.js`

```javascript
import { describe, it, expect } from '@jest/globals';
import { CalcoloScontoService } from '../services/calcoloScontoService.js';

const service = new CalcoloScontoService();

describe('CalcoloScontoService', () => {
  describe('calcolaSconti', () => {
    it('should calculate single discount correctly', () => {
      const codici = [{
        id: '1',
        tipoSconto: 'PERCENTUALE',
        valore: 10,
        cumulabile: false
      }];
      
      const result = service.calcolaSconti(1000, codici);
      
      expect(result.scontoTotale).toBe(100);
      expect(result.importoFinale).toBe(900);
      expect(result.dettagliSconti).toHaveLength(1);
    });
    
    it('should calculate cumulative discounts in correct order', () => {
      const codici = [
        {
          id: '1',
          tipoSconto: 'PERCENTUALE',
          valore: 10,
          cumulabile: true
        },
        {
          id: '2',
          tipoSconto: 'VALORE_ASSOLUTO',
          valore: 50,
          cumulabile: true
        }
      ];
      
      const result = service.calcolaSconti(1000, codici);
      
      // Primo: 10% di 1000 = 100 → rimane 900
      // Secondo: 50€ su 900 → rimane 850
      expect(result.scontoTotale).toBe(150);
      expect(result.importoFinale).toBe(850);
    });
    
    it('should stop at first non-cumulative discount', () => {
      const codici = [
        {
          id: '1',
          tipoSconto: 'PERCENTUALE',
          valore: 20,
          cumulabile: false
        },
        {
          id: '2',
          tipoSconto: 'PERCENTUALE',
          valore: 10,
          cumulabile: true
        }
      ];
      
      const result = service.calcolaSconti(1000, codici);
      
      // Solo il primo viene applicato
      expect(result.scontoTotale).toBe(200);
      expect(result.dettagliSconti).toHaveLength(1);
    });
  });
  
  describe('ordinaCodici', () => {
    it('should prioritize non-cumulative discounts', () => {
      const codici = [
        { id: '1', valore: 10, cumulabile: true },
        { id: '2', valore: 20, cumulabile: false },
        { id: '3', valore: 15, cumulabile: true }
      ];
      
      const ordinati = service.ordinaCodici(codici);
      
      expect(ordinati[0].id).toBe('2'); // Non-cumulative first
    });
    
    it('should order by value descending among cumulative', () => {
      const codici = [
        { id: '1', tipoSconto: 'PERCENTUALE', valore: 10, cumulabile: true },
        { id: '2', tipoSconto: 'PERCENTUALE', valore: 20, cumulabile: true },
        { id: '3', tipoSconto: 'PERCENTUALE', valore: 15, cumulabile: true }
      ];
      
      const ordinati = service.ordinaCodici(codici);
      
      expect(ordinati[0].valore).toBe(20);
      expect(ordinati[1].valore).toBe(15);
      expect(ordinati[2].valore).toBe(10);
    });
  });
});
```

### Frontend Unit Tests

#### File: `src/hooks/usePriceCalculation.test.ts`

```typescript
import { renderHook } from '@testing-library/react';
import { usePriceCalculation } from './usePriceCalculation';
import { TipoSconto } from '../types/codiceSconto';

describe('usePriceCalculation', () => {
  it('should calculate price without discounts', () => {
    const { result } = renderHook(() => usePriceCalculation());
    
    const totals = result.current.calculateTotal({
      prezzoUnitario: 100,
      numeroPartecipanti: 10
    });
    
    expect(totals.base).toBe(1000);
    expect(totals.sconti).toBe(0);
    expect(totals.finale).toBe(1000);
  });
  
  it('should calculate price with percentage discount', () => {
    const { result } = renderHook(() => usePriceCalculation());
    
    const totals = result.current.calculateTotal({
      prezzoUnitario: 100,
      numeroPartecipanti: 10,
      codiciSconto: [{
        id: '1',
        tipoSconto: TipoSconto.PERCENTUALE,
        valore: 10,
        cumulabile: false
      }]
    });
    
    expect(totals.base).toBe(1000);
    expect(totals.sconti).toBe(100);
    expect(totals.finale).toBe(900);
  });
  
  it('should calculate price with absolute discount', () => {
    const { result } = renderHook(() => usePriceCalculation());
    
    const totals = result.current.calculateTotal({
      prezzoUnitario: 100,
      numeroPartecipanti: 10,
      codiciSconto: [{
        id: '1',
        tipoSconto: TipoSconto.VALORE_ASSOLUTO,
        valore: 150,
        cumulabile: false
      }]
    });
    
    expect(totals.base).toBe(1000);
    expect(totals.sconti).toBe(150);
    expect(totals.finale).toBe(850);
  });
  
  it('should handle cumulative discounts', () => {
    const { result } = renderHook(() => usePriceCalculation());
    
    const totals = result.current.calculateTotal({
      prezzoUnitario: 100,
      numeroPartecipanti: 10,
      codiciSconto: [
        {
          id: '1',
          tipoSconto: TipoSconto.PERCENTUALE,
          valore: 10,
          cumulabile: true
        },
        {
          id: '2',
          tipoSconto: TipoSconto.VALORE_ASSOLUTO,
          valore: 50,
          cumulabile: true
        }
      ]
    });
    
    // 10% di 1000 = 100 → 900
    // 50€ su 900 → 850
    expect(totals.sconti).toBe(150);
    expect(totals.finale).toBe(850);
  });
});
```

---

## 🔗 Integration Testing

### API Integration Tests

#### File: `backend/tests/integration/codici-sconto-api.test.js`

```javascript
import request from 'supertest';
import { app } from '../../app.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Codici Sconto API', () => {
  let authToken;
  let testTenant;
  
  beforeAll(async () => {
    // Setup auth
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@test.com',
        password: 'testpassword'
      });
    
    authToken = loginResponse.body.token;
    testTenant = loginResponse.body.user.tenantId;
  });
  
  describe('GET /api/v1/codici-sconto', () => {
    it('should return list of discount codes', async () => {
      const response = await request(app)
        .get('/api/v1/codici-sconto')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data)).toBe(true);
    });
    
    it('should filter by stato=attivi', async () => {
      const response = await request(app)
        .get('/api/v1/codici-sconto?stato=attivi')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      const allActive = response.body.data.every(c => c.attivo === true);
      expect(allActive).toBe(true);
    });
    
    it('should paginate results', async () => {
      const response = await request(app)
        .get('/api/v1/codici-sconto?page=1&limit=5')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.data.length).toBeLessThanOrEqual(5);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(5);
    });
    
    it('should require authentication', async () => {
      await request(app)
        .get('/api/v1/codici-sconto')
        .expect(401);
    });
  });
  
  describe('POST /api/v1/codici-sconto', () => {
    it('should create discount code successfully', async () => {
      const newCodice = {
        codice: 'TESTAPI001',
        nome: 'Test API Codice',
        tipoSconto: 'PERCENTUALE',
        valore: 15,
        dataInizio: '2025-01-01',
        dataFine: '2025-12-31',
        attivo: true,
        cumulabile: true,
        applicabileA: 'TUTTI',
        tipoCorso: 'TUTTI'
      };
      
      const response = await request(app)
        .post('/api/v1/codici-sconto')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newCodice)
        .expect(201);
      
      expect(response.body.codice).toBe('TESTAPI001');
      expect(response.body.valore).toBe(15);
      
      // Cleanup
      await prisma.codiceSconto.delete({ where: { id: response.body.id } });
    });
    
    it('should reject duplicate code', async () => {
      const codice = await prisma.codiceSconto.create({
        data: {
          codice: 'DUPLICATE001',
          nome: 'Duplicate Test',
          tipoSconto: 'PERCENTUALE',
          valore: 10,
          dataInizio: new Date('2025-01-01'),
          dataFine: new Date('2025-12-31'),
          attivo: true,
          applicabileA: 'TUTTI',
          tipoCorso: 'TUTTI',
          tenantId: testTenant,
          createdBy: 'test-user'
        }
      });
      
      const response = await request(app)
        .post('/api/v1/codici-sconto')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          codice: 'DUPLICATE001',
          nome: 'Another Name',
          tipoSconto: 'PERCENTUALE',
          valore: 20,
          dataInizio: '2025-01-01',
          dataFine: '2025-12-31',
          attivo: true,
          applicabileA: 'TUTTI',
          tipoCorso: 'TUTTI'
        })
        .expect(409);
      
      expect(response.body.error).toContain('già esistente');
      
      // Cleanup
      await prisma.codiceSconto.delete({ where: { id: codice.id } });
    });
    
    it('should validate percentage value <= 100', async () => {
      const response = await request(app)
        .post('/api/v1/codici-sconto')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          codice: 'INVALID001',
          nome: 'Invalid Percentage',
          tipoSconto: 'PERCENTUALE',
          valore: 150,  // Invalid
          dataInizio: '2025-01-01',
          dataFine: '2025-12-31',
          attivo: true,
          applicabileA: 'TUTTI',
          tipoCorso: 'TUTTI'
        })
        .expect(400);
      
      expect(response.body.error).toContain('Percentuale non può superare 100%');
    });
  });
  
  describe('POST /api/v1/codici-sconto/valida', () => {
    let validCodice;
    
    beforeEach(async () => {
      validCodice = await prisma.codiceSconto.create({
        data: {
          codice: 'VALID001',
          nome: 'Valid Test Code',
          tipoSconto: 'PERCENTUALE',
          valore: 10,
          dataInizio: new Date('2025-01-01'),
          dataFine: new Date('2025-12-31'),
          attivo: true,
          applicabileA: 'TUTTI',
          tipoCorso: 'TUTTI',
          tenantId: testTenant,
          createdBy: 'test-user'
        }
      });
    });
    
    afterEach(async () => {
      await prisma.codiceSconto.delete({ where: { id: validCodice.id } });
    });
    
    it('should validate code successfully', async () => {
      const response = await request(app)
        .post('/api/v1/codici-sconto/valida')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          codice: 'VALID001',
          importoBase: 1000
        })
        .expect(200);
      
      expect(response.body.valido).toBe(true);
      expect(response.body.scontoCalcolato).toBe(100);
    });
    
    it('should reject invalid code', async () => {
      const response = await request(app)
        .post('/api/v1/codici-sconto/valida')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          codice: 'NONEXISTENT',
          importoBase: 1000
        })
        .expect(200);  // Returns 200 but with valido: false
      
      expect(response.body.valido).toBe(false);
      expect(response.body.messaggioUtente).toContain('non valido');
    });
  });
});
```

---

## 🎭 E2E Testing

### Critical User Journeys

#### File: `tests/e2e/preventivi-flow.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Preventivi Complete Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('http://localhost:5173/login');
    await page.fill('[name="email"]', 'admin@test.com');
    await page.fill('[name="password"]', 'testpassword');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
  });
  
  test('Admin crea codice sconto e genera preventivo con sconto', async ({ page }) => {
    // STEP 1: Crea codice sconto
    await page.goto('http://localhost:5173/codici-sconto');
    await page.click('button:has-text("+ Nuovo Codice")');
    
    // Modal si apre
    await expect(page.locator('h2:has-text("Nuovo Codice Sconto")')).toBeVisible();
    
    // Tab 1: Generali
    await page.fill('[name="codice"]', 'E2ETEST001');
    await page.fill('[name="nome"]', 'E2E Test Discount');
    await page.click('input[value="PERCENTUALE"]');
    await page.fill('[name="valore"]', '15');
    await page.check('[name="attivo"]');
    await page.click('button:has-text("Avanti: Validità")');
    
    // Tab 2: Validità
    await page.fill('[name="dataInizio"]', '2025-01-01');
    await page.fill('[name="dataFine"]', '2025-12-31');
    await page.click('button:has-text("Avanti: Restrizioni")');
    
    // Tab 3: Restrizioni
    await page.check('[name="cumulabile"]');
    await page.click('button:has-text("Avanti: Corsi")');
    
    // Tab 4: Corsi
    await page.click('input[value="TUTTI"]');
    await page.click('button:has-text("Salva Codice Sconto")');
    
    // Verifica toast success
    await expect(page.locator('.toast:has-text("Codice creato con successo")')).toBeVisible();
    
    // Verifica codice in lista
    await expect(page.locator('td:has-text("E2ETEST001")')).toBeVisible();
    
    // STEP 2: Apri corso esistente
    await page.goto('http://localhost:5173/schedules');
    await page.click('.schedule-card:first-child');
    
    // Modal ScheduleEvent si apre
    await expect(page.locator('h2:has-text("Gestione Corso")')).toBeVisible();
    
    // STEP 3: Naviga a Step 4 (Preventivo)
    await page.click('[data-step="preventivo"]');
    await expect(page.locator('h3:has-text("Riepilogo Corso")')).toBeVisible();
    
    // STEP 4: Configura prezzo
    await page.fill('[name="prezzoUnitario"]', '120');
    
    // Verifica calcolo automatico
    const prezzoBase = await page.locator('text=Prezzo Base').locator('..').innerText();
    expect(prezzoBase).toContain('1,440.00'); // 12 partecipanti × 120
    
    // STEP 5: Applica codice sconto
    await page.fill('[name="codiceScontoInput"]', 'E2ETEST001');
    await page.click('button:has-text("Applica")');
    
    // Attendi validazione
    await page.waitForTimeout(1000);
    
    // Verifica sconto applicato
    await expect(page.locator('.applied-discount:has-text("E2ETEST001")')).toBeVisible();
    
    // Verifica totale scontato
    const totale = await page.locator('text=TOTALE').locator('..').innerText();
    expect(totale).toContain('1,224.00'); // 1440 - 15% = 1224
    
    // STEP 6: Genera PDF
    await page.click('button:has-text("📄 Anteprima PDF")');
    
    // Modal anteprima si apre
    await expect(page.locator('h2:has-text("Anteprima Preventivo")')).toBeVisible();
    
    // Attendi rendering PDF
    await page.waitForTimeout(2000);
    
    // Verifica embed PDF visibile
    await expect(page.locator('embed[type="application/pdf"]')).toBeVisible();
    
    // STEP 7: Scarica PDF
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('button:has-text("⬇️ Scarica PDF")')
    ]);
    
    expect(download.suggestedFilename()).toContain('.pdf');
    
    // Chiudi modal
    await page.click('button:has-text("Chiudi")');
    
    // CLEANUP: Elimina codice sconto
    await page.goto('http://localhost:5173/codici-sconto');
    await page.click(`tr:has-text("E2ETEST001") button[aria-label="Elimina"]`);
    await page.click('button:has-text("Conferma")');
    
    await expect(page.locator('.toast:has-text("Codice eliminato")')).toBeVisible();
  });
  
  test('Validation: Non può applicare codice scaduto', async ({ page }) => {
    // Crea codice scaduto via API
    const response = await page.request.post('http://localhost:4001/api/v1/codici-sconto', {
      headers: {
        'Authorization': `Bearer ${await page.evaluate(() => localStorage.getItem('token'))}`
      },
      data: {
        codice: 'EXPIRED001',
        nome: 'Expired Code',
        tipoSconto: 'PERCENTUALE',
        valore: 10,
        dataInizio: '2024-01-01',
        dataFine: '2024-12-31',
        attivo: true,
        applicabileA: 'TUTTI',
        tipoCorso: 'TUTTI'
      }
    });
    
    const codice = await response.json();
    
    // Vai a step preventivo
    await page.goto('http://localhost:5173/schedules');
    await page.click('.schedule-card:first-child');
    await page.click('[data-step="preventivo"]');
    
    // Prova ad applicare codice scaduto
    await page.fill('[name="codiceScontoInput"]', 'EXPIRED001');
    await page.click('button:has-text("Applica")');
    
    // Verifica errore
    await expect(page.locator('.toast-error:has-text("valido dal")')).toBeVisible();
    
    // Verifica sconto NON applicato
    await expect(page.locator('.applied-discount:has-text("EXPIRED001")')).not.toBeVisible();
    
    // Cleanup via API
    await page.request.delete(`http://localhost:4001/api/v1/codici-sconto/${codice.id}`, {
      headers: {
        'Authorization': `Bearer ${await page.evaluate(() => localStorage.getItem('token'))}`
      }
    });
  });
});
```

---

## ⚡ Performance Testing

### Load Testing with k6

#### File: `tests/performance/codici-sconto-load.js`

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '2m', target: 50 },   // Ramp up to 50 users
    { duration: '5m', target: 50 },   // Stay at 50 users
    { duration: '2m', target: 100 },  // Ramp up to 100 users
    { duration: '5m', target: 100 },  // Stay at 100 users
    { duration: '2m', target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% requests < 500ms
    http_req_failed: ['rate<0.01'],    // Error rate < 1%
    errors: ['rate<0.1'],
  },
};

const BASE_URL = 'http://localhost:4001';
let authToken;

export function setup() {
  // Login once
  const loginRes = http.post(`${BASE_URL}/api/v1/auth/login`, JSON.stringify({
    email: 'admin@test.com',
    password: 'testpassword'
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
  
  return { token: loginRes.json('token') };
}

export default function(data) {
  const headers = {
    'Authorization': `Bearer ${data.token}`,
    'Content-Type': 'application/json'
  };
  
  // Test 1: List discount codes
  let res = http.get(`${BASE_URL}/api/v1/codici-sconto?page=1&limit=20`, { headers });
  check(res, {
    'list status 200': (r) => r.status === 200,
    'list response time < 200ms': (r) => r.timings.duration < 200,
  }) || errorRate.add(1);
  
  sleep(1);
  
  // Test 2: Validate discount code
  res = http.post(`${BASE_URL}/api/v1/codici-sconto/valida`, JSON.stringify({
    codice: 'PROMO2025',
    importoBase: 1000
  }), { headers });
  
  check(res, {
    'validate status 200': (r) => r.status === 200,
    'validate response time < 100ms': (r) => r.timings.duration < 100,
  }) || errorRate.add(1);
  
  sleep(1);
  
  // Test 3: Create preventivo (lighter load)
  if (Math.random() < 0.1) {  // Only 10% of requests
    res = http.post(`${BASE_URL}/api/v1/preventivi`, JSON.stringify({
      corsoId: 'test-corso-id',
      clienteType: 'AZIENDA',
      aziendaId: 'test-azienda-id',
      titoloCorso: 'Load Test Corso',
      durataOre: 8,
      numeroPartecipanti: 10,
      modalitaErogazione: 'PRESENZA',
      prezzoUnitario: 100,
      prezzoTotale: 1000,
      scontoTotale: 0,
      importoFinale: 1000,
      dataScadenza: new Date(Date.now() + 30*24*60*60*1000).toISOString()
    }), { headers });
    
    check(res, {
      'create preventivo status 201': (r) => r.status === 201,
      'create preventivo response time < 500ms': (r) => r.timings.duration < 500,
    }) || errorRate.add(1);
  }
  
  sleep(2);
}

export function teardown(data) {
  console.log('Load test completed');
}
```

Run:
```bash
k6 run tests/performance/codici-sconto-load.js
```

---

## 🔒 Security Testing

### Security Test Scenarios

#### 1. SQL Injection Tests
```typescript
// tests/security/sql-injection.test.ts
test('should prevent SQL injection in codice search', async () => {
  const maliciousInput = "'; DROP TABLE codici_sconto; --";
  
  const response = await request(app)
    .get(`/api/v1/codici-sconto?search=${encodeURIComponent(maliciousInput)}`)
    .set('Authorization', `Bearer ${authToken}`);
  
  // Should not crash, should sanitize input
  expect(response.status).not.toBe(500);
  
  // Verify table still exists
  const count = await prisma.codiceSconto.count();
  expect(count).toBeGreaterThan(0);
});
```

#### 2. Authorization Tests
```typescript
test('should not allow user to access other tenant codes', async () => {
  // Create code in tenant A
  const codeA = await prisma.codiceSconto.create({
    data: {
      codice: 'TENANT_A',
      // ... tenant A data
    }
  });
  
  // Login as tenant B user
  const tokenB = await getTokenForTenant('tenant-b');
  
  // Try to access tenant A code
  const response = await request(app)
    .get(`/api/v1/codici-sconto/${codeA.id}`)
    .set('Authorization', `Bearer ${tokenB}`)
    .expect(403);
  
  expect(response.body.error).toContain('Non autorizzato');
});
```

#### 3. Rate Limiting Tests
```typescript
test('should rate limit API requests', async () => {
  const requests = [];
  
  // Send 100 requests rapidly
  for (let i = 0; i < 100; i++) {
    requests.push(
      request(app)
        .get('/api/v1/codici-sconto')
        .set('Authorization', `Bearer ${authToken}`)
    );
  }
  
  const responses = await Promise.all(requests);
  
  // Should have some 429 (Too Many Requests) responses
  const rateLimited = responses.filter(r => r.status === 429);
  expect(rateLimited.length).toBeGreaterThan(0);
});
```

### OWASP ZAP Scan

```bash
# Run automated security scan
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t http://localhost:5173 \
  -r zap-report.html \
  -J zap-report.json
```

---

## ♿ Accessibility Testing

### Automated Tests with axe-core

#### File: `tests/a11y/codici-sconto.a11y.test.ts`

```typescript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility Tests', () => {
  test('Codici Sconto page should have no accessibility violations', async ({ page }) => {
    await page.goto('http://localhost:5173/codici-sconto');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });
  
  test('Modal creation should be keyboard accessible', async ({ page }) => {
    await page.goto('http://localhost:5173/codici-sconto');
    
    // Open modal with keyboard
    await page.keyboard.press('Tab'); // Navigate to button
    await page.keyboard.press('Enter'); // Open modal
    
    // Modal should be visible
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    
    // Focus should be trapped in modal
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeTruthy();
    
    // Escape should close modal
    await page.keyboard.press('Escape');
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
  });
  
  test('Form errors should be associated with inputs', async ({ page }) => {
    await page.goto('http://localhost:5173/codici-sconto');
    await page.click('button:has-text("+ Nuovo Codice")');
    
    // Submit without filling required fields
    await page.click('button:has-text("Salva")');
    
    // Check error message has aria-describedby
    const codiceInput = page.locator('[name="codice"]');
    const describedBy = await codiceInput.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    
    // Error message should exist
    const errorMessage = page.locator(`#${describedBy}`);
    await expect(errorMessage).toBeVisible();
  });
});
```

---

## 🗄️ Test Data & Fixtures

### Database Fixtures

#### File: `tests/fixtures/codici-sconto.fixtures.ts`

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const codiciScontoFixtures = {
  percentuale: {
    codice: 'FIXTURE_PERC',
    nome: 'Fixture Percentuale',
    tipoSconto: 'PERCENTUALE',
    valore: 10,
    dataInizio: new Date('2025-01-01'),
    dataFine: new Date('2025-12-31'),
    attivo: true,
    cumulabile: true,
    applicabileA: 'TUTTI',
    tipoCorso: 'TUTTI'
  },
  
  valoreAssoluto: {
    codice: 'FIXTURE_ABS',
    nome: 'Fixture Valore Assoluto',
    tipoSconto: 'VALORE_ASSOLUTO',
    valore: 50,
    dataInizio: new Date('2025-01-01'),
    dataFine: new Date('2025-12-31'),
    attivo: true,
    cumulabile: false,
    applicabileA: 'TUTTI',
    tipoCorso: 'TUTTI'
  },
  
  scaduto: {
    codice: 'FIXTURE_EXP',
    nome: 'Fixture Scaduto',
    tipoSconto: 'PERCENTUALE',
    valore: 15,
    dataInizio: new Date('2024-01-01'),
    dataFine: new Date('2024-12-31'),
    attivo: true,
    applicabileA: 'TUTTI',
    tipoCorso: 'TUTTI'
  },
  
  esaurito: {
    codice: 'FIXTURE_USED',
    nome: 'Fixture Esaurito',
    tipoSconto: 'PERCENTUALE',
    valore: 20,
    dataInizio: new Date('2025-01-01'),
    dataFine: new Date('2025-12-31'),
    attivo: true,
    utilizzoMassimo: 10,
    utilizzoCorrente: 10,
    applicabileA: 'TUTTI',
    tipoCorso: 'TUTTI'
  }
};

export async function seedCodiciScontoFixtures(tenantId: string, userId: string) {
  const codes = await Promise.all(
    Object.values(codiciScontoFixtures).map(data =>
      prisma.codiceSconto.create({
        data: {
          ...data,
          tenantId,
          createdBy: userId
        }
      })
    )
  );
  
  return codes;
}

export async function cleanupCodiciScontoFixtures() {
  await prisma.codiceSconto.deleteMany({
    where: {
      codice: { startsWith: 'FIXTURE_' }
    }
  });
}
```

---

## 🔄 CI/CD Integration

### GitHub Actions Workflow

#### File: `.github/workflows/test.yml`

```yaml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: |
          cd backend && npm ci
          cd ../frontend && npm ci
      
      - name: Run database migrations
        run: cd backend && npx prisma migrate deploy
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
      
      - name: Run backend unit tests
        run: cd backend && npm test -- --coverage
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
      
      - name: Run frontend unit tests
        run: cd frontend && npm test -- --coverage
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./backend/coverage/lcov.info,./frontend/coverage/lcov.info

  integration-tests:
    runs-on: ubuntu-latest
    needs: unit-tests
    
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_db
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: cd backend && npm ci
      
      - name: Run integration tests
        run: cd backend && npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db

  e2e-tests:
    runs-on: ubuntu-latest
    needs: [unit-tests, integration-tests]
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          cd backend && npm ci
          cd ../frontend && npm ci
      
      - name: Install Playwright
        run: cd tests && npx playwright install --with-deps
      
      - name: Start services
        run: |
          cd backend && npm start &
          cd frontend && npm run dev &
          sleep 10
      
      - name: Run E2E tests
        run: cd tests && npx playwright test
      
      - name: Upload Playwright report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: tests/playwright-report/

  security-scan:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Run npm audit
        run: |
          cd backend && npm audit --audit-level=high
          cd ../frontend && npm audit --audit-level=high
      
      - name: Run Snyk security scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high
```

---

## ✅ QA Checklist

### Pre-Release Checklist

#### Functional Testing
- [ ] Tutti i test unit passano (>80% coverage)
- [ ] Tutti i test integration passano (>70% coverage)
- [ ] Tutti i test E2E critici passano (100%)
- [ ] Validazioni form funzionano correttamente
- [ ] Calcoli prezzi/sconti sempre corretti
- [ ] Generazione PDF produce file validi
- [ ] Email invio funzionante
- [ ] Multi-tenancy isolamento verificato

#### Performance
- [ ] API response time < 200ms (p95)
- [ ] Generazione PDF < 3s
- [ ] Frontend Lighthouse score > 90
- [ ] Nessun memory leak rilevato
- [ ] Database query ottimizzate (no N+1)

#### Security
- [ ] npm audit clean (zero critical/high)
- [ ] OWASP ZAP scan passed
- [ ] Authentication/Authorization verificati
- [ ] Rate limiting funzionante
- [ ] Input sanitization completa
- [ ] CSRF protection attiva
- [ ] SQL injection tests passed

#### Accessibility
- [ ] axe-core scan zero violations
- [ ] Keyboard navigation completa
- [ ] Screen reader compatibility
- [ ] Color contrast WCAG AA
- [ ] Focus management corretto
- [ ] ARIA labels appropriati

#### Browser Compatibility
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS 15+)
- [ ] Mobile Chrome (Android 11+)

#### Responsive Design
- [ ] Desktop (1920x1080)
- [ ] Laptop (1366x768)
- [ ] Tablet (768x1024)
- [ ] Mobile (375x667)
- [ ] Mobile Large (414x896)

#### Documentation
- [ ] API documentation aggiornata
- [ ] README aggiornato
- [ ] CHANGELOG aggiornato
- [ ] User manual completo
- [ ] Code comments sufficienti

---

## 📊 Test Coverage Report Example

```
File                              | % Stmts | % Branch | % Funcs | % Lines |
----------------------------------|---------|----------|---------|---------|
backend/services/                 |         |          |         |         |
  validazioneScontoService.js     |   92.5  |   87.3   |  100.0  |   94.1  |
  calcoloScontoService.js         |   88.2  |   82.1   |   95.5  |   89.7  |
  preventiviService.js            |   85.7  |   78.9   |   91.2  |   86.4  |
backend/routes/                   |         |          |         |         |
  codici-sconto-routes.js         |   81.3  |   75.6   |   88.9  |   83.2  |
  preventivi-routes.js            |   79.8  |   72.4   |   85.7  |   81.1  |
----------------------------------|---------|----------|---------|---------|
All files                         |   84.5  |   78.2   |   91.8  |   85.6  |
```

---

**Status**: ✅ TESTING PLAN COMPLETO  
**Pronto per**: QA execution & automation setup  
**Coverage Targets**: Unit 80%+, Integration 70%+, E2E 100% critical paths

**Prossimi file**: Template HTML + Documentazione
