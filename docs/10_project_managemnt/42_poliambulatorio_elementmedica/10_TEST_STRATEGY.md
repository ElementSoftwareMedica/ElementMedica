# 🧪 TEST STRATEGY - Poliambulatorio ElementMedica

**Versione**: 1.0  
**Data**: 2025-01-14  
**Documento**: 10_TEST_STRATEGY.md

---

## 📋 INDICE

1. [Obiettivi Testing](#obiettivi-testing)
2. [Test Pyramid](#test-pyramid)
3. [Unit Testing](#unit-testing)
4. [Integration Testing](#integration-testing)
5. [End-to-End Testing](#end-to-end-testing)
6. [Performance Testing](#performance-testing)
7. [Security Testing](#security-testing)
8. [Test Coverage](#test-coverage)
9. [Test Automation](#test-automation)
10. [UAT Procedures](#uat-procedures)
11. [Test Data Management](#test-data-management)
12. [Defect Management](#defect-management)

---

## 1. OBIETTIVI TESTING

### 1.1 Quality Gates

| Gate | Criterio | Target | Blocco Release |
|------|----------|--------|----------------|
| **G1** | Unit test coverage | ≥ 75% | ✅ Sì |
| **G2** | Integration tests passing | 100% | ✅ Sì |
| **G3** | E2E critical paths | 100% | ✅ Sì |
| **G4** | Security scan clean | 0 critical | ✅ Sì |
| **G5** | Performance baseline | ≤ 500ms API | ✅ Sì |
| **G6** | Accessibility | WCAG 2.1 AA | 🟡 Advisory |
| **G7** | Multi-tenant isolation | 7/7 tests | ✅ Sì |

### 1.2 Test Scope per Modulo

```
┌─────────────────────────────────────────────────────────────┐
│                    TEST SCOPE MATRIX                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  MODULO              UNIT  INTEG  E2E  PERF  SEC  A11Y      │
│  ─────────────────────────────────────────────────────────  │
│  Auth/RBAC           ████  ████   ███  ██    ████  █        │
│  Poliambulatorio     ███   ███    ██   █     ██    ██       │
│  Ambulatori          ███   ███    ██   █     ██    ██       │
│  Prestazioni         ████  ████   ███  ██    ██    ██       │
│  Strumentario        ███   ██     █    █     █     █        │
│  Agenda/Booking      ████  ████   ████ ████  ███   ███      │
│  Listini             ███   ███    ██   █     ██    ██       │
│  Appuntamenti        ████  ████   ████ ███   ███   ███      │
│  Numero Chiamata     ██    ███    ███  ██    █     ████     │
│  Visite/Form Builder ████  ████   ███  ██    ███   ███      │
│  Referti             ████  ████   ███  ██    ████  ██       │
│  File Storage        ███   ████   ██   ██    ████  █        │
│  Audit/GDPR          ████  ████   ██   █     ████  █        │
│  Search              ███   ███    ██   ███   ██    ██       │
│  Async Jobs          ███   ████   █    ██    ██    -        │
│                                                              │
│  LEGENDA: ████ Critical  ███ High  ██ Medium  █ Low         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. TEST PYRAMID

```
                           ┌───────────┐
                          ╱             ╲
                         ╱   E2E Tests   ╲        5%
                        ╱   (Playwright)  ╲       ~50 tests
                       ╱                   ╲
                      ├─────────────────────┤
                     ╱                       ╲
                    ╱   Integration Tests     ╲   20%
                   ╱       (Jest + API)        ╲  ~200 tests
                  ╱                             ╲
                 ├───────────────────────────────┤
                ╱                                 ╲
               ╱         Unit Tests               ╲  75%
              ╱        (Jest + Vitest)             ╲ ~800 tests
             ╱                                       ╲
            └─────────────────────────────────────────┘

    TOTAL ESTIMATED: ~1050 tests
    CURRENT STATUS: 62 tests (base framework)
    SPRINT TARGET: +100 tests/sprint
```

### 2.1 Distribuzione per Layer

| Layer | Technology | Tests | Coverage Target |
|-------|------------|-------|-----------------|
| Frontend Components | Vitest + React Testing Library | 300 | 70% |
| Frontend Hooks | Vitest | 150 | 80% |
| Frontend Utils | Vitest | 100 | 90% |
| Backend Services | Jest | 200 | 80% |
| Backend Controllers | Jest + Supertest | 150 | 75% |
| Backend Utils | Jest | 50 | 90% |
| E2E Flows | Playwright | 50 | Critical paths |
| API Contract | Jest + OpenAPI | 50 | All endpoints |

---

## 3. UNIT TESTING

### 3.1 Framework & Tools

```json
{
  "backend": {
    "framework": "Jest",
    "coverage": "istanbul",
    "mocking": "jest.mock()",
    "assertions": "expect + jest-extended"
  },
  "frontend": {
    "framework": "Vitest",
    "coverage": "c8",
    "mocking": "vi.mock()",
    "assertions": "expect + @testing-library/jest-dom"
  }
}
```

### 3.2 Unit Test Patterns

#### Backend Service Test
```typescript
// backend/services/appointments/__tests__/appointmentService.test.ts
import { AppointmentService } from '../appointmentService';
import { prismaMock } from '../../../__mocks__/prisma';

describe('AppointmentService', () => {
  const service = new AppointmentService();
  const tenantId = 'tenant-123';
  const userId = 'user-456';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create appointment with correct data', async () => {
      // Arrange
      const appointmentData = {
        patientId: 'patient-1',
        doctorId: 'doctor-1',
        serviceId: 'service-1',
        ambulatorioId: 'amb-1',
        scheduledAt: new Date('2025-01-20T09:00:00Z'),
        duration: 30
      };

      const expectedAppointment = {
        id: 'appt-1',
        ...appointmentData,
        tenantId,
        status: 'SCHEDULED',
        createdBy: userId,
        createdAt: expect.any(Date)
      };

      prismaMock.appointment.create.mockResolvedValue(expectedAppointment);

      // Act
      const result = await service.create(appointmentData, { tenantId, userId });

      // Assert
      expect(result).toEqual(expectedAppointment);
      expect(prismaMock.appointment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId,
          status: 'SCHEDULED'
        })
      });
    });

    it('should throw error if slot is already booked', async () => {
      // Arrange
      prismaMock.appointment.findFirst.mockResolvedValue({ id: 'existing' });

      // Act & Assert
      await expect(
        service.create({ scheduledAt: new Date() }, { tenantId, userId })
      ).rejects.toThrow('Slot not available');
    });

    it('should enforce tenant isolation', async () => {
      // Arrange
      const appointmentData = { patientId: 'patient-other-tenant' };

      // Act
      await service.create(appointmentData, { tenantId, userId });

      // Assert
      expect(prismaMock.appointment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ tenantId })
        })
      );
    });
  });

  describe('cancel', () => {
    it('should soft delete appointment', async () => {
      // Arrange
      const appointmentId = 'appt-1';
      prismaMock.appointment.findFirst.mockResolvedValue({ 
        id: appointmentId, 
        tenantId,
        status: 'SCHEDULED' 
      });

      // Act
      await service.cancel(appointmentId, { tenantId, userId, reason: 'Patient request' });

      // Assert
      expect(prismaMock.appointment.update).toHaveBeenCalledWith({
        where: { id: appointmentId },
        data: {
          status: 'CANCELLED',
          cancelledAt: expect.any(Date),
          cancelledBy: userId,
          cancellationReason: 'Patient request'
        }
      });
    });
  });
});
```

#### Frontend Component Test
```typescript
// src/components/appointments/__tests__/AppointmentCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { AppointmentCard } from '../AppointmentCard';

describe('AppointmentCard', () => {
  const mockAppointment = {
    id: 'appt-1',
    patientName: 'Mario Rossi',
    serviceName: 'Visita Cardiologica',
    scheduledAt: '2025-01-20T09:00:00Z',
    status: 'SCHEDULED',
    doctorName: 'Dr. Bianchi'
  };

  const mockOnStatusChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders appointment details correctly', () => {
    render(
      <AppointmentCard 
        appointment={mockAppointment} 
        onStatusChange={mockOnStatusChange} 
      />
    );

    expect(screen.getByText('Mario Rossi')).toBeInTheDocument();
    expect(screen.getByText('Visita Cardiologica')).toBeInTheDocument();
    expect(screen.getByText('Dr. Bianchi')).toBeInTheDocument();
    expect(screen.getByText(/09:00/)).toBeInTheDocument();
  });

  it('shows correct status badge', () => {
    render(
      <AppointmentCard 
        appointment={mockAppointment} 
        onStatusChange={mockOnStatusChange} 
      />
    );

    const badge = screen.getByTestId('status-badge');
    expect(badge).toHaveTextContent('Prenotato');
    expect(badge).toHaveClass('bg-blue-100');
  });

  it('calls onStatusChange when check-in button clicked', async () => {
    render(
      <AppointmentCard 
        appointment={mockAppointment} 
        onStatusChange={mockOnStatusChange} 
      />
    );

    const checkinButton = screen.getByRole('button', { name: /check-in/i });
    fireEvent.click(checkinButton);

    expect(mockOnStatusChange).toHaveBeenCalledWith('appt-1', 'CHECKED_IN');
  });

  it('disables actions for cancelled appointments', () => {
    const cancelledAppointment = { ...mockAppointment, status: 'CANCELLED' };
    
    render(
      <AppointmentCard 
        appointment={cancelledAppointment} 
        onStatusChange={mockOnStatusChange} 
      />
    );

    expect(screen.queryByRole('button', { name: /check-in/i })).not.toBeInTheDocument();
  });
});
```

#### Hook Test
```typescript
// src/hooks/__tests__/useAgendaSlots.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { useAgendaSlots } from '../useAgendaSlots';
import { QueryClientProvider } from '@tanstack/react-query';

describe('useAgendaSlots', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = mockFetch;
  });

  it('fetches available slots for date', async () => {
    // Arrange
    const mockSlots = [
      { time: '09:00', available: true },
      { time: '09:30', available: false },
      { time: '10:00', available: true }
    ];
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ slots: mockSlots })
    });

    // Act
    const { result } = renderHook(
      () => useAgendaSlots({ ambulatorioId: 'amb-1', date: '2025-01-20' }),
      { wrapper: QueryClientProvider }
    );

    // Assert
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.slots).toEqual(mockSlots);
    expect(result.current.availableSlots).toHaveLength(2);
  });

  it('handles error state', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(
      () => useAgendaSlots({ ambulatorioId: 'amb-1', date: '2025-01-20' }),
      { wrapper: QueryClientProvider }
    );

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(result.current.error?.message).toBe('Network error');
  });
});
```

---

## 4. INTEGRATION TESTING

### 4.1 API Integration Tests

```typescript
// backend/__tests__/integration/appointments.integration.test.ts
import request from 'supertest';
import { app } from '../../app';
import { prisma } from '../../prisma/client';
import { generateTestToken } from '../helpers/auth';

describe('Appointments API Integration', () => {
  let authToken: string;
  let testTenantId: string;
  let testPatientId: string;
  let testDoctorId: string;

  beforeAll(async () => {
    // Setup test data
    const tenant = await prisma.tenant.create({
      data: { name: 'Test Poliambulatorio', slug: 'test-poli' }
    });
    testTenantId = tenant.id;

    const doctor = await prisma.person.create({
      data: {
        tenantId: testTenantId,
        email: 'doctor@test.com',
        firstName: 'Test',
        lastName: 'Doctor',
        roleType: 'DOCTOR'
      }
    });
    testDoctorId = doctor.id;

    const patient = await prisma.person.create({
      data: {
        tenantId: testTenantId,
        email: 'patient@test.com',
        firstName: 'Test',
        lastName: 'Patient',
        roleType: 'PATIENT'
      }
    });
    testPatientId = patient.id;

    authToken = generateTestToken({ tenantId: testTenantId, role: 'ADMIN' });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.appointment.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.person.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.tenant.delete({ where: { id: testTenantId } });
  });

  describe('POST /api/v1/appointments', () => {
    it('should create appointment successfully', async () => {
      const appointmentData = {
        patientId: testPatientId,
        doctorId: testDoctorId,
        scheduledAt: '2025-01-20T09:00:00Z',
        serviceId: 'service-1',
        duration: 30
      };

      const response = await request(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .send(appointmentData)
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        patientId: testPatientId,
        status: 'SCHEDULED',
        tenantId: testTenantId
      });
    });

    it('should return 400 for invalid date', async () => {
      const response = await request(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          patientId: testPatientId,
          scheduledAt: 'invalid-date'
        })
        .expect(400);

      expect(response.body.error).toContain('date');
    });

    it('should return 409 for double booking', async () => {
      // First booking
      await request(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          patientId: testPatientId,
          doctorId: testDoctorId,
          scheduledAt: '2025-01-21T10:00:00Z',
          duration: 30
        })
        .expect(201);

      // Second booking same slot
      const response = await request(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          patientId: 'other-patient',
          doctorId: testDoctorId,
          scheduledAt: '2025-01-21T10:00:00Z',
          duration: 30
        })
        .expect(409);

      expect(response.body.error).toContain('Slot not available');
    });
  });

  describe('GET /api/v1/appointments', () => {
    it('should return only tenant appointments', async () => {
      const response = await request(app)
        .get('/api/v1/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.every(a => a.tenantId === testTenantId)).toBe(true);
    });

    it('should filter by date range', async () => {
      const response = await request(app)
        .get('/api/v1/appointments')
        .query({
          startDate: '2025-01-20',
          endDate: '2025-01-20'
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.every(a => 
        a.scheduledAt >= '2025-01-20' && a.scheduledAt < '2025-01-21'
      )).toBe(true);
    });
  });

  describe('PATCH /api/v1/appointments/:id/status', () => {
    let appointmentId: string;

    beforeEach(async () => {
      const appt = await prisma.appointment.create({
        data: {
          tenantId: testTenantId,
          patientId: testPatientId,
          doctorId: testDoctorId,
          scheduledAt: new Date('2025-01-22T11:00:00Z'),
          status: 'SCHEDULED',
          duration: 30
        }
      });
      appointmentId = appt.id;
    });

    it('should update status to CHECKED_IN', async () => {
      const response = await request(app)
        .patch(`/api/v1/appointments/${appointmentId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'CHECKED_IN' })
        .expect(200);

      expect(response.body.status).toBe('CHECKED_IN');
      expect(response.body.checkedInAt).toBeDefined();
    });

    it('should create audit log on status change', async () => {
      await request(app)
        .patch(`/api/v1/appointments/${appointmentId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'CHECKED_IN' })
        .expect(200);

      const auditLog = await prisma.auditLog.findFirst({
        where: {
          entityId: appointmentId,
          operation: 'UPDATE'
        }
      });

      expect(auditLog).toBeDefined();
      expect(auditLog?.before).toContain('SCHEDULED');
      expect(auditLog?.after).toContain('CHECKED_IN');
    });
  });
});
```

### 4.2 Multi-tenant Isolation Tests

```typescript
// backend/__tests__/integration/tenant-isolation.test.ts
describe('Multi-tenant Isolation', () => {
  let tenant1Token: string;
  let tenant2Token: string;
  let tenant1Id: string;
  let tenant2Id: string;
  let tenant1PatientId: string;

  beforeAll(async () => {
    // Setup two tenants
    const tenant1 = await setupTenant('Poliambulatorio A');
    const tenant2 = await setupTenant('Poliambulatorio B');
    
    tenant1Id = tenant1.id;
    tenant2Id = tenant2.id;
    tenant1Token = generateToken({ tenantId: tenant1Id });
    tenant2Token = generateToken({ tenantId: tenant2Id });

    // Create patient in tenant1
    const patient = await prisma.person.create({
      data: { tenantId: tenant1Id, email: 'patient@tenant1.com', roleType: 'PATIENT' }
    });
    tenant1PatientId = patient.id;
  });

  it('tenant2 cannot access tenant1 patients', async () => {
    const response = await request(app)
      .get(`/api/v1/patients/${tenant1PatientId}`)
      .set('Authorization', `Bearer ${tenant2Token}`)
      .expect(404);

    expect(response.body.error).toBe('Patient not found');
  });

  it('tenant2 cannot list tenant1 appointments', async () => {
    const response = await request(app)
      .get('/api/v1/appointments')
      .set('Authorization', `Bearer ${tenant2Token}`)
      .expect(200);

    expect(response.body).toHaveLength(0);
    expect(response.body.some(a => a.tenantId === tenant1Id)).toBe(false);
  });

  it('tenant2 cannot create appointment for tenant1 patient', async () => {
    const response = await request(app)
      .post('/api/v1/appointments')
      .set('Authorization', `Bearer ${tenant2Token}`)
      .send({
        patientId: tenant1PatientId,
        scheduledAt: '2025-01-20T09:00:00Z'
      })
      .expect(404);

    expect(response.body.error).toBe('Patient not found');
  });

  it('tenant2 cannot update tenant1 appointment', async () => {
    const tenant1Appt = await prisma.appointment.create({
      data: {
        tenantId: tenant1Id,
        patientId: tenant1PatientId,
        scheduledAt: new Date(),
        status: 'SCHEDULED'
      }
    });

    const response = await request(app)
      .patch(`/api/v1/appointments/${tenant1Appt.id}/status`)
      .set('Authorization', `Bearer ${tenant2Token}`)
      .send({ status: 'CANCELLED' })
      .expect(404);
  });

  // 7 test obbligatori per isolation
  it('should pass all 7 tenant isolation checks', async () => {
    const checks = [
      { endpoint: 'patients', method: 'GET' },
      { endpoint: 'appointments', method: 'GET' },
      { endpoint: 'services', method: 'GET' },
      { endpoint: 'ambulatori', method: 'GET' },
      { endpoint: 'doctors', method: 'GET' },
      { endpoint: 'invoices', method: 'GET' },
      { endpoint: 'reports', method: 'GET' }
    ];

    for (const check of checks) {
      const response = await request(app)
        .get(`/api/v1/${check.endpoint}`)
        .set('Authorization', `Bearer ${tenant2Token}`);

      expect(response.body.every(item => 
        item.tenantId === tenant2Id || item.tenantId === undefined
      )).toBe(true);
    }
  });
});
```

---

## 5. END-TO-END TESTING

### 5.1 Playwright Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['junit', { outputFile: 'test-results/e2e-results.xml' }]
  ],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'mobile',
      use: { ...devices['iPhone 13'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

### 5.2 Critical Path E2E Tests

#### Complete Appointment Flow
```typescript
// tests/e2e/appointment-flow.spec.ts
import { test, expect } from '@playwright/test';
import { login, setupTestData } from './helpers';

test.describe('Appointment Complete Flow', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'admin@example.com', 'Admin123!');
  });

  test('should complete full appointment lifecycle', async ({ page }) => {
    // Step 1: Navigate to agenda
    await page.goto('/poliambulatorio/agenda');
    await expect(page.getByRole('heading', { name: 'Agenda' })).toBeVisible();

    // Step 2: Select date and ambulatorio
    await page.getByTestId('date-picker').click();
    await page.getByText('20').click(); // 20th of current month
    await page.getByTestId('ambulatorio-select').selectOption('Ambulatorio 1');

    // Step 3: Click available slot
    await page.getByTestId('slot-09:00').click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Step 4: Fill appointment form
    await page.getByLabel('Paziente').fill('Rossi');
    await page.getByRole('option', { name: 'Mario Rossi' }).click();
    await page.getByLabel('Prestazione').selectOption('Visita Cardiologica');
    await page.getByLabel('Medico').selectOption('Dr. Bianchi');
    await page.getByRole('button', { name: 'Prenota' }).click();

    // Step 5: Verify appointment created
    await expect(page.getByText('Appuntamento creato')).toBeVisible();
    await expect(page.getByTestId('slot-09:00')).toHaveClass(/booked/);

    // Step 6: Navigate to reception
    await page.goto('/poliambulatorio/accettazione');
    await expect(page.getByText('Mario Rossi')).toBeVisible();

    // Step 7: Check-in patient
    await page.getByTestId('checkin-Mario Rossi').click();
    await expect(page.getByText('Accettato')).toBeVisible();

    // Step 8: Call patient (numero chiamata)
    await page.getByTestId('call-Mario Rossi').click();
    // Verify display update via WebSocket
    await expect(page.getByTestId('queue-display')).toContainText('Mario R.');

    // Step 9: Start visit
    await page.goto('/poliambulatorio/visite');
    await page.getByTestId('start-visit-Mario Rossi').click();
    await expect(page.getByRole('heading', { name: 'Visita Cardiologica' })).toBeVisible();

    // Step 10: Fill visit form
    await page.getByLabel('Anamnesi').fill('Paziente riferisce...');
    await page.getByLabel('Esame obiettivo').fill('PA 120/80...');
    await page.getByLabel('Diagnosi').fill('Ipertensione lieve');
    await page.getByRole('button', { name: 'Salva' }).click();

    // Step 11: Generate referto
    await page.getByRole('button', { name: 'Genera Referto' }).click();
    await expect(page.getByText('Referto generato')).toBeVisible();

    // Step 12: Sign referto
    await page.getByRole('button', { name: 'Firma Digitale' }).click();
    await page.getByLabel('PIN').fill('1234');
    await page.getByRole('button', { name: 'Conferma' }).click();
    await expect(page.getByText('Referto firmato')).toBeVisible();

    // Step 13: Complete and invoice
    await page.getByRole('button', { name: 'Completa Visita' }).click();
    await page.getByRole('button', { name: 'Genera Fattura' }).click();
    await expect(page.getByText('Fattura generata')).toBeVisible();

    // Verify audit trail
    await page.goto('/admin/audit-log');
    const auditEntries = page.getByTestId('audit-entry');
    await expect(auditEntries.filter({ hasText: 'Mario Rossi' })).toHaveCount.above(5);
  });

  test('should handle appointment cancellation', async ({ page }) => {
    // Create appointment first
    const appointmentId = await createTestAppointment(page);

    // Navigate to appointment
    await page.goto(`/poliambulatorio/appuntamenti/${appointmentId}`);
    
    // Cancel
    await page.getByRole('button', { name: 'Cancella' }).click();
    await page.getByLabel('Motivo').fill('Richiesta paziente');
    await page.getByRole('button', { name: 'Conferma Cancellazione' }).click();

    // Verify
    await expect(page.getByText('Cancellato')).toBeVisible();
    
    // Verify slot is available again
    await page.goto('/poliambulatorio/agenda');
    await expect(page.getByTestId(`slot-${appointmentId}`)).not.toHaveClass(/booked/);
  });
});
```

#### RBAC E2E Tests
```typescript
// tests/e2e/rbac.spec.ts
test.describe('RBAC Permissions', () => {
  test('receptionist cannot access admin settings', async ({ page }) => {
    await login(page, 'receptionist@test.com', 'Test123!');
    
    await page.goto('/admin/settings');
    await expect(page.getByText('Accesso non autorizzato')).toBeVisible();
  });

  test('doctor can only see own patients', async ({ page }) => {
    await login(page, 'doctor1@test.com', 'Test123!');
    
    await page.goto('/poliambulatorio/pazienti');
    const patients = await page.getByTestId('patient-row').all();
    
    for (const patient of patients) {
      await expect(patient.getByTestId('assigned-doctor')).toContainText('Dr. Doctor1');
    }
  });

  test('nurse cannot sign referti', async ({ page }) => {
    await login(page, 'nurse@test.com', 'Test123!');
    
    await page.goto('/poliambulatorio/referti/123');
    await expect(page.getByRole('button', { name: 'Firma' })).toBeDisabled();
  });
});
```

---

## 6. PERFORMANCE TESTING

### 6.1 Performance Baselines

| Endpoint | Target | P50 | P95 | P99 | Status |
|----------|--------|-----|-----|-----|--------|
| GET /appointments | < 200ms | 45ms | 120ms | 180ms | ✅ |
| POST /appointments | < 300ms | 80ms | 200ms | 280ms | ✅ |
| GET /agenda/slots | < 150ms | 30ms | 90ms | 140ms | ✅ |
| GET /patients (search) | < 500ms | 150ms | 350ms | 480ms | ✅ |
| POST /referti | < 1000ms | 400ms | 800ms | 950ms | ✅ |
| GET /referti/pdf | < 3000ms | 1200ms | 2500ms | 2900ms | 🟡 |

### 6.2 Load Testing Script

```typescript
// tests/performance/load-test.ts
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 50 },   // Ramp up
    { duration: '5m', target: 50 },   // Steady state
    { duration: '2m', target: 100 },  // Stress
    { duration: '5m', target: 100 },  // Peak load
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4001';

export function setup() {
  // Login and get token
  const loginRes = http.post(`${BASE_URL}/api/v1/auth/login`, {
    identifier: 'admin@example.com',
    password: 'Admin123!'
  });
  return { token: loginRes.json('token') };
}

export default function(data) {
  const headers = {
    'Authorization': `Bearer ${data.token}`,
    'Content-Type': 'application/json'
  };

  // Scenario: Typical receptionist workflow
  
  // 1. Load today's appointments
  const appointments = http.get(
    `${BASE_URL}/api/v1/appointments?date=${new Date().toISOString().split('T')[0]}`,
    { headers }
  );
  check(appointments, {
    'appointments loaded': (r) => r.status === 200,
    'appointments fast': (r) => r.timings.duration < 200,
  });

  sleep(1);

  // 2. Search patient
  const patients = http.get(
    `${BASE_URL}/api/v1/patients?search=rossi`,
    { headers }
  );
  check(patients, {
    'patients found': (r) => r.status === 200,
    'search fast': (r) => r.timings.duration < 500,
  });

  sleep(2);

  // 3. Check available slots
  const slots = http.get(
    `${BASE_URL}/api/v1/agenda/slots?ambulatorioId=amb-1&date=${new Date().toISOString().split('T')[0]}`,
    { headers }
  );
  check(slots, {
    'slots loaded': (r) => r.status === 200,
    'slots fast': (r) => r.timings.duration < 150,
  });

  sleep(3);
}

export function teardown(data) {
  // Cleanup if needed
}
```

### 6.3 Database Performance Tests

```typescript
// tests/performance/db-queries.test.ts
describe('Database Query Performance', () => {
  it('should query appointments with index < 50ms', async () => {
    const start = performance.now();
    
    await prisma.appointment.findMany({
      where: {
        tenantId: testTenantId,
        deletedAt: null,
        scheduledAt: {
          gte: new Date('2025-01-01'),
          lte: new Date('2025-01-31')
        }
      },
      include: {
        patient: { select: { firstName: true, lastName: true } },
        doctor: { select: { firstName: true, lastName: true } }
      },
      take: 100
    });

    const duration = performance.now() - start;
    expect(duration).toBeLessThan(50);
  });

  it('should full-text search referti < 200ms', async () => {
    const start = performance.now();
    
    await prisma.$queryRaw`
      SELECT * FROM "Referto"
      WHERE "tenantId" = ${testTenantId}
      AND "deletedAt" IS NULL
      AND to_tsvector('italian', content) @@ plainto_tsquery('italian', 'ipertensione')
      LIMIT 50
    `;

    const duration = performance.now() - start;
    expect(duration).toBeLessThan(200);
  });
});
```

---

## 7. SECURITY TESTING

### 7.1 Security Test Suite

```typescript
// tests/security/auth.security.test.ts
describe('Authentication Security', () => {
  it('should block after 5 failed login attempts', async () => {
    const email = 'admin@example.com';
    
    // 5 failed attempts
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/api/v1/auth/login')
        .send({ identifier: email, password: 'wrong' })
        .expect(401);
    }

    // 6th attempt should be rate limited
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ identifier: email, password: 'Admin123!' })
      .expect(429);

    expect(response.body.error).toContain('Too many attempts');
  });

  it('should not expose user existence on login', async () => {
    const existingUser = await request(app)
      .post('/api/v1/auth/login')
      .send({ identifier: 'admin@example.com', password: 'wrong' });

    const nonExistingUser = await request(app)
      .post('/api/v1/auth/login')
      .send({ identifier: 'nonexistent@example.com', password: 'wrong' });

    // Same response for both
    expect(existingUser.body.error).toBe(nonExistingUser.body.error);
  });

  it('should invalidate tokens after password change', async () => {
    const { token } = await login('user@test.com', 'OldPass123!');
    
    // Change password
    await request(app)
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'OldPass123!', newPassword: 'NewPass123!' })
      .expect(200);

    // Old token should be invalid
    await request(app)
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);
  });
});

describe('Authorization Security', () => {
  it('should prevent IDOR attacks', async () => {
    const user1Token = await getToken('user1@test.com');
    const user2Data = await createTestPatient('tenant2');

    // User1 tries to access User2's patient
    const response = await request(app)
      .get(`/api/v1/patients/${user2Data.patientId}`)
      .set('Authorization', `Bearer ${user1Token}`)
      .expect(404);
  });

  it('should validate CSRF tokens on state-changing requests', async () => {
    const response = await request(app)
      .post('/api/v1/appointments')
      .set('Authorization', `Bearer ${validToken}`)
      // Missing CSRF token
      .send({ patientId: 'p1' })
      .expect(403);

    expect(response.body.error).toContain('CSRF');
  });

  it('should prevent privilege escalation', async () => {
    const userToken = await getToken('regular@test.com');

    // Try to access admin endpoint
    await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403);

    // Try to modify own role
    await request(app)
      .patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ role: 'ADMIN' })
      .expect(403);
  });
});

describe('Input Validation Security', () => {
  it('should prevent SQL injection', async () => {
    const maliciousInput = "'; DROP TABLE patients; --";
    
    const response = await request(app)
      .get('/api/v1/patients')
      .query({ search: maliciousInput })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    // Should return empty, not error
    expect(response.body).toBeInstanceOf(Array);
    
    // Table should still exist
    const count = await prisma.person.count();
    expect(count).toBeGreaterThan(0);
  });

  it('should prevent XSS in stored data', async () => {
    const xssPayload = '<script>alert("xss")</script>';
    
    await request(app)
      .post('/api/v1/appointments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        notes: xssPayload,
        patientId: 'p1'
      })
      .expect(201);

    const response = await request(app)
      .get('/api/v1/appointments')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    // Should be escaped
    expect(response.body[0].notes).not.toContain('<script>');
  });
});
```

### 7.2 OWASP Top 10 Checklist

| # | Vulnerability | Test | Status |
|---|---------------|------|--------|
| A01 | Broken Access Control | IDOR, privilege escalation tests | ✅ |
| A02 | Cryptographic Failures | Password hashing, TLS validation | ✅ |
| A03 | Injection | SQL injection, NoSQL injection | ✅ |
| A04 | Insecure Design | Threat modeling review | 🟡 |
| A05 | Security Misconfiguration | Headers, CORS, cookies | ✅ |
| A06 | Vulnerable Components | npm audit, Snyk scan | ✅ |
| A07 | Auth Failures | Brute force, session management | ✅ |
| A08 | Data Integrity Failures | Signed tokens, audit trail | ✅ |
| A09 | Security Logging | Audit log completeness | ✅ |
| A10 | SSRF | URL validation, allowlisting | ✅ |

---

## 8. TEST COVERAGE

### 8.1 Coverage Targets by Module

| Module | Current | Target | Gap |
|--------|---------|--------|-----|
| Auth/RBAC | 82% | 85% | -3% |
| Appointments | 75% | 80% | -5% |
| Agenda | 70% | 80% | -10% |
| Patients | 78% | 80% | -2% |
| Referti | 72% | 80% | -8% |
| Services | 80% | 80% | ✅ |
| Billing | 65% | 75% | -10% |
| GDPR/Audit | 85% | 85% | ✅ |
| **Overall** | **75%** | **75%** | ✅ |

### 8.2 Coverage Commands

```bash
# Backend coverage
npm run test:coverage

# Frontend coverage
npm run test:frontend:coverage

# Generate combined report
npm run coverage:report

# Check coverage thresholds
npm run coverage:check
```

### 8.3 Coverage Configuration

```javascript
// jest.config.js
module.exports = {
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 75,
      statements: 75
    },
    './backend/services/': {
      branches: 80,
      functions: 80,
      lines: 80
    },
    './backend/middleware/': {
      branches: 85,
      functions: 85,
      lines: 85
    }
  }
};
```

---

## 9. TEST AUTOMATION

### 9.1 CI/CD Pipeline Integration

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [main, develop, 'feature/*']
  pull_request:
    branches: [main, develop]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run test:unit
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

  integration-tests:
    runs-on: ubuntu-latest
    needs: unit-tests
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx prisma migrate deploy
      - run: npm run test:integration

  e2e-tests:
    runs-on: ubuntu-latest
    needs: integration-tests
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/

  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm audit --audit-level=high
      - uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
```

### 9.2 Pre-commit Hooks

```javascript
// .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Run linting
npm run lint

# Run affected unit tests
npm run test:affected

# TypeScript check
npm run type-check
```

---

## 10. UAT PROCEDURES

### 10.1 UAT Test Cases

| ID | Scenario | Steps | Expected | Priority |
|----|----------|-------|----------|----------|
| UAT-01 | Prenotazione telefonica | 1. Login segreteria<br>2. Cerca paziente<br>3. Seleziona prestazione<br>4. Scegli slot<br>5. Conferma | Appuntamento creato, email inviata | P1 |
| UAT-02 | Check-in paziente | 1. Login accettazione<br>2. Seleziona paziente in lista<br>3. Check-in<br>4. Stampa ticket | Stato aggiornato, ticket stampato | P1 |
| UAT-03 | Visita medica | 1. Login medico<br>2. Chiama paziente<br>3. Compila visita<br>4. Genera referto<br>5. Firma | Referto firmato, PDF generato | P1 |
| UAT-04 | Fatturazione | 1. Login admin<br>2. Seleziona visita<br>3. Genera fattura<br>4. Invia | Fattura generata, email inviata | P1 |
| UAT-05 | Cancellazione | 1. Login segreteria<br>2. Trova appuntamento<br>3. Cancella<br>4. Inserisci motivo | Slot liberato, notifica paziente | P2 |

### 10.2 UAT Sign-off Template

```markdown
## UAT Sign-off - Sprint X

### Test Summary
- Total Test Cases: 50
- Passed: 48
- Failed: 2
- Blocked: 0

### Critical Findings
1. [UAT-15] PDF generation timeout on large referti - FIXED
2. [UAT-22] Mobile layout issue on agenda - IN PROGRESS

### Stakeholder Approval
| Role | Name | Approval | Date |
|------|------|----------|------|
| Product Owner | [Name] | ✅ | 2025-01-14 |
| Medical Director | [Name] | ✅ | 2025-01-14 |
| IT Manager | [Name] | ⏳ | Pending |

### Go/No-Go Decision
- [ ] GO for production
- [ ] NO-GO - Issues to resolve
```

---

## 11. TEST DATA MANAGEMENT

### 11.1 Test Data Strategy

```typescript
// tests/fixtures/factory.ts
import { faker } from '@faker-js/faker/locale/it';

export const createPatientFixture = (overrides = {}) => ({
  firstName: faker.person.firstName(),
  lastName: faker.person.lastName(),
  email: faker.internet.email(),
  codiceFiscale: generateCodiceFiscale(),
  dateOfBirth: faker.date.birthdate({ min: 18, max: 90, mode: 'age' }),
  ...overrides
});

export const createAppointmentFixture = (overrides = {}) => ({
  scheduledAt: faker.date.future(),
  duration: faker.helpers.arrayElement([15, 30, 45, 60]),
  status: 'SCHEDULED',
  notes: faker.lorem.sentence(),
  ...overrides
});

export const seedTestData = async (prisma, tenantId) => {
  // Create 100 patients
  const patients = await Promise.all(
    Array.from({ length: 100 }, () =>
      prisma.person.create({
        data: {
          ...createPatientFixture(),
          tenantId,
          roleType: 'PATIENT'
        }
      })
    )
  );

  // Create appointments for each patient
  for (const patient of patients) {
    await prisma.appointment.createMany({
      data: Array.from({ length: 5 }, () => ({
        ...createAppointmentFixture(),
        patientId: patient.id,
        tenantId
      }))
    });
  }

  return { patients };
};
```

### 11.2 Data Anonymization for Testing

```typescript
// scripts/anonymize-test-data.ts
export const anonymizeForTesting = async () => {
  await prisma.$transaction([
    prisma.$executeRaw`
      UPDATE "Person"
      SET 
        "firstName" = 'Test_' || "id",
        "lastName" = 'User_' || "id",
        "email" = 'test_' || "id" || '@anonymized.test',
        "codiceFiscale" = 'TSTXXX' || SUBSTRING("id", 1, 10)
      WHERE "deletedAt" IS NULL
    `,
    prisma.$executeRaw`
      UPDATE "Referto"
      SET 
        "content" = regexp_replace("content", '[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]', 'ANONIMO000000', 'g')
    `
  ]);
};
```

---

## 12. DEFECT MANAGEMENT

### 12.1 Defect Severity Levels

| Severity | Description | Response Time | Example |
|----------|-------------|---------------|---------|
| **S1 Critical** | System down, data loss | 2 hours | Login broken, data corruption |
| **S2 Major** | Feature broken, no workaround | 24 hours | Cannot create appointments |
| **S3 Moderate** | Feature broken, workaround exists | 3 days | PDF export fails, can print |
| **S4 Minor** | Cosmetic, minor inconvenience | Next sprint | Typo, alignment issue |

### 12.2 Defect Report Template

```markdown
## Defect Report

**ID**: DEF-XXX
**Title**: [Brief description]
**Severity**: S1/S2/S3/S4
**Priority**: P1/P2/P3
**Module**: [Affected module]
**Environment**: [Dev/Staging/Prod]
**Reporter**: [Name]
**Date**: [Date]

### Description
[Detailed description of the issue]

### Steps to Reproduce
1. [Step 1]
2. [Step 2]
3. [Step 3]

### Expected Result
[What should happen]

### Actual Result
[What actually happens]

### Screenshots/Logs
[Attachments]

### Root Cause (if known)
[Technical analysis]

### Fix
[Solution implemented]
```

---

## 📎 ALLEGATI

### A. Test Environment Matrix

| Environment | Purpose | Data | URL |
|-------------|---------|------|-----|
| Local | Development | Fake | localhost |
| CI | Automated tests | Generated | - |
| Staging | UAT, Integration | Anonymized prod | staging.* |
| Production | Live | Real | app.* |

### B. Tool Stack

| Category | Tool | Version |
|----------|------|---------|
| Unit Testing | Jest / Vitest | 29.x / 1.x |
| E2E Testing | Playwright | 1.40+ |
| Coverage | Istanbul / c8 | 3.x / 9.x |
| Performance | k6 | 0.48+ |
| Security | npm audit, Snyk | latest |
| Mocking | MSW | 2.x |

---

*Documento soggetto a revisione per sprint*  
*Test coverage monitorato quotidianamente*
