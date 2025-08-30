# 📋 PLANNING DETTAGLIATO - Risoluzione Errori Connessione API

**Progetto:** Fix Errori Connessione EmployeesPage  
**Data:** 2 Gennaio 2025  
**Durata Stimata:** 4-6 ore  
**Priorità:** 🚨 CRITICA  
**Status:** 📋 PLANNING APPROVATO  

---

## 🎯 Executive Summary

### Obiettivo Principale
**Risolvere completamente** gli errori di connessione `ERR_CONNECTION_REFUSED` su `localhost:4000` in EmployeesPage.tsx, implementando la corretta architettura a tre server e garantendo piena conformità GDPR.

### Timeline Esecutiva
- **Fase 1:** Investigazione e Diagnosi (1 ora)
- **Fase 2:** Correzione Architettura (2 ore)
- **Fase 3:** Implementazione GDPR-Compliant (1 ora)
- **Fase 4:** Testing e Validazione (1 ora)
- **Fase 5:** Documentazione e Deploy (1 ora)

### Risultato Atteso
✅ **Sistema completamente funzionante** con architettura corretta  
✅ **Zero errori di connessione** API  
✅ **Conformità GDPR** al 100%  
✅ **Performance ottimizzata** < 2s load time  

---

## 📋 Fasi di Implementazione

### 🔍 FASE 1: Investigazione Approfondita (1 ora)

#### 1.1 Analisi Stato Server Backend (20 min)

##### Obiettivi
- Verificare quali server sono attualmente in esecuzione
- Identificare porte corrette secondo architettura
- Documentare gap configurazione

##### Azioni Specifiche
```bash
# Verificare processi attivi
ps aux | grep node
lsof -i :4001  # API Server
lsof -i :4002  # Documents Server
lsof -i :4003  # Proxy Server
lsof -i :4000  # Porta errata utilizzata

# Verificare configurazione backend
cd backend/
ls -la *server.js
cat package.json | grep scripts
```

##### Deliverable
- **Report stato server** con porte attive
- **Identificazione** server mancanti
- **Piano avvio** server necessari

#### 1.2 Analisi Configurazione Frontend (20 min)

##### Obiettivi
- Esaminare EmployeesPage.tsx linee 171, 186
- Identificare hardcoded endpoints errati
- Verificare configurazione environment

##### Azioni Specifiche
```typescript
// Analizzare EmployeesPage.tsx
// Linea 171: GET http://localhost:4000/employees
// Linea 186: GET http://localhost:4000/companies

// Verificare file configurazione
src/config/environment.ts
src/services/api.ts
vite.config.ts
.env files
```

##### Deliverable
- **Mappa endpoint** attuali vs corretti
- **Lista modifiche** necessarie
- **Configurazione** environment corretta

#### 1.3 Verifica Architettura Tre Server (20 min)

##### Obiettivi
- Confermare responsabilità ogni server
- Verificare routing proxy corretto
- Identificare missing components

##### Schema Architettura Corretta
```
Frontend (5174) → Proxy (4003) → API Server (4001) ↔ PostgreSQL
                               → Documents (4002)
```

##### Responsabilità Server
- **API Server (4001):** `/api/employees`, `/api/companies`, `/api/auth`
- **Documents Server (4002):** `/generate`, `/templates`, `/download`
- **Proxy Server (4003):** Routing, CORS, Security, Rate Limiting

##### Deliverable
- **Diagramma** architettura attuale vs target
- **Gap analysis** componenti mancanti
- **Roadmap** implementazione

---

### 🔧 FASE 2: Correzione Architettura (2 ore)

#### 2.1 Avvio Server Backend Mancanti (30 min)

##### Scenario A: Server Non Avviati
```bash
# Avviare tutti i server necessari
cd backend/

# Terminal 1: API Server
node api-server.js  # Porta 4001

# Terminal 2: Documents Server
node documents-server.js  # Porta 4002

# Terminal 3: Proxy Server
node proxy-server.js  # Porta 4003
```

##### Scenario B: Server Non Esistenti
```javascript
// Creare/aggiornare proxy-server.js
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');

const app = express();
const PORT = 4003;

// CORS Configuration
app.use(cors({
  origin: ['http://localhost:5174', 'http://localhost:3000'],
  credentials: true
}));

// Proxy to API Server
app.use('/api', createProxyMiddleware({
  target: 'http://localhost:4001',
  changeOrigin: true,
  pathRewrite: {
    '^/api': '/api'
  }
}));

// Proxy to Documents Server
app.use('/documents', createProxyMiddleware({
  target: 'http://localhost:4002',
  changeOrigin: true,
  pathRewrite: {
    '^/documents': ''
  }
}));

app.listen(PORT, () => {
  console.log(`Proxy Server running on port ${PORT}`);
});
```

##### Deliverable
- **Tutti i server** operativi su porte corrette
- **Configurazione proxy** funzionante
- **Health check** endpoint attivi

#### 2.2 Correzione Endpoint Frontend (45 min)

##### Obiettivi
- Sostituire `localhost:4000` con proxy corretto
- Implementare configurazione centralizzata
- Aggiungere error handling robusto

##### Implementazione

###### 2.2.1 Configurazione Environment
```typescript
// src/config/environment.ts
export const API_CONFIG = {
  BASE_URL: process.env.NODE_ENV === 'production' 
    ? 'https://api.yourdomain.com'
    : 'http://localhost:4003', // Proxy Server
  ENDPOINTS: {
    EMPLOYEES: '/api/employees',
    COMPANIES: '/api/companies',
    AUTH: '/api/auth',
    DOCUMENTS: '/documents'
  },
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3
};
```

###### 2.2.2 Service Layer Centralizzato
```typescript
// src/services/api.ts
import { API_CONFIG } from '../config/environment';

class ApiService {
  private baseUrl: string;
  
  constructor() {
    this.baseUrl = API_CONFIG.BASE_URL;
  }
  
  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`API Error for ${endpoint}:`, error);
      throw error;
    }
  }
  
  // Employee endpoints
  async getEmployees(): Promise<Employee[]> {
    return this.request<Employee[]>(API_CONFIG.ENDPOINTS.EMPLOYEES);
  }
  
  async getCompanies(): Promise<Company[]> {
    return this.request<Company[]>(API_CONFIG.ENDPOINTS.COMPANIES);
  }
}

export const apiService = new ApiService();
```

###### 2.2.3 Aggiornamento EmployeesPage.tsx
```typescript
// src/pages/employees/EmployeesPage.tsx
import { apiService } from '../../services/api';

// Sostituire le chiamate dirette
const fetchEmployees = async () => {
  try {
    setLoading(true);
    const data = await apiService.getEmployees();
    setEmployees(data);
  } catch (error) {
    console.error('Error fetching employees:', error);
    setError('Errore nel caricamento dipendenti');
  } finally {
    setLoading(false);
  }
};

const fetchCompanies = async () => {
  try {
    const data = await apiService.getCompanies();
    setCompanies(data);
  } catch (error) {
    console.error('Error fetching companies:', error);
    setError('Errore nel caricamento aziende');
  }
};
```

##### Deliverable
- **Endpoint corretti** utilizzando proxy
- **Service layer** centralizzato
- **Error handling** migliorato
- **Configuration** environment-aware

#### 2.3 Implementazione Retry Logic (45 min)

##### Obiettivi
- Aggiungere resilienza alle chiamate API
- Implementare exponential backoff
- Gestire timeout e network errors

##### Implementazione
```typescript
// src/utils/apiRetry.ts
export class ApiRetryService {
  private maxRetries: number;
  private baseDelay: number;
  
  constructor(maxRetries = 3, baseDelay = 1000) {
    this.maxRetries = maxRetries;
    this.baseDelay = baseDelay;
  }
  
  async withRetry<T>(
    operation: () => Promise<T>,
    retryCount = 0
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (retryCount >= this.maxRetries) {
        throw error;
      }
      
      const delay = this.baseDelay * Math.pow(2, retryCount);
      console.warn(`API call failed, retrying in ${delay}ms...`, error);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return this.withRetry(operation, retryCount + 1);
    }
  }
}

export const apiRetry = new ApiRetryService();
```

##### Integrazione nel Service
```typescript
// Aggiornare ApiService
private async request<T>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<T> {
  return apiRetry.withRetry(async () => {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(API_CONFIG.TIMEOUT)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  });
}
```

##### Deliverable
- **Retry mechanism** implementato
- **Exponential backoff** configurato
- **Timeout handling** attivo
- **Error recovery** automatico

---

### 🔐 FASE 3: Implementazione GDPR-Compliant (1 ora)

#### 3.1 Audit Trail per API Calls (30 min)

##### Obiettivi
- Tracciare tutte le chiamate API per dati personali
- Implementare logging GDPR-compliant
- Garantire audit trail completo

##### Implementazione
```typescript
// src/services/gdprAuditService.ts
export class GDPRAuditService {
  async logApiCall({
    endpoint,
    method,
    userId,
    dataType,
    success,
    error
  }: {
    endpoint: string;
    method: string;
    userId?: string;
    dataType: 'PERSONAL_DATA' | 'COMPANY_DATA' | 'SYSTEM_DATA';
    success: boolean;
    error?: string;
  }) {
    const auditLog = {
      timestamp: new Date().toISOString(),
      action: `API_CALL_${method.toUpperCase()}`,
      endpoint,
      userId,
      dataType,
      success,
      error,
      ipAddress: await this.getClientIP(),
      userAgent: navigator.userAgent
    };
    
    // Inviare al backend per persistenza
    await fetch('/api/gdpr/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(auditLog)
    });
  }
  
  private async getClientIP(): Promise<string> {
    try {
      const response = await fetch('/api/client-ip');
      const { ip } = await response.json();
      return ip;
    } catch {
      return 'unknown';
    }
  }
}

export const gdprAudit = new GDPRAuditService();
```

##### Integrazione nel ApiService
```typescript
// Aggiornare ApiService con audit
private async request<T>(
  endpoint: string, 
  options: RequestInit = {},
  dataType: 'PERSONAL_DATA' | 'COMPANY_DATA' | 'SYSTEM_DATA' = 'SYSTEM_DATA'
): Promise<T> {
  const startTime = Date.now();
  let success = false;
  let error: string | undefined;
  
  try {
    const result = await apiRetry.withRetry(async () => {
      const url = `${this.baseUrl}${endpoint}`;
      
      const response = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(API_CONFIG.TIMEOUT)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    });
    
    success = true;
    return result;
  } catch (err) {
    error = err instanceof Error ? err.message : 'Unknown error';
    throw err;
  } finally {
    // Log GDPR audit
    await gdprAudit.logApiCall({
      endpoint,
      method: options.method || 'GET',
      dataType,
      success,
      error,
      userId: this.getCurrentUserId()
    });
  }
}

// Aggiornare metodi specifici
async getEmployees(): Promise<Employee[]> {
  return this.request<Employee[]>(
    API_CONFIG.ENDPOINTS.EMPLOYEES,
    {},
    'PERSONAL_DATA' // Specificare tipo dati
  );
}
```

##### Deliverable
- **Audit trail** completo per API calls
- **GDPR logging** implementato
- **Data classification** automatica
- **User tracking** attivo

#### 3.2 Consent Verification (30 min)

##### Obiettivi
- Verificare consenso prima accesso dati personali
- Implementare controlli automatici
- Gestire revoca consenso

##### Implementazione
```typescript
// src/services/consentService.ts
export class ConsentService {
  async checkConsent(
    userId: string, 
    dataType: 'PERSONAL_DATA' | 'MARKETING' | 'ANALYTICS'
  ): Promise<boolean> {
    try {
      const response = await fetch(`/api/gdpr/consent/${userId}/${dataType}`);
      const { hasConsent } = await response.json();
      return hasConsent;
    } catch (error) {
      console.error('Error checking consent:', error);
      return false; // Fail-safe: no consent
    }
  }
  
  async requestConsent(
    userId: string,
    dataType: 'PERSONAL_DATA' | 'MARKETING' | 'ANALYTICS',
    purpose: string
  ): Promise<boolean> {
    // Mostrare modal consenso
    return new Promise((resolve) => {
      const modal = new ConsentModal({
        dataType,
        purpose,
        onAccept: () => {
          this.grantConsent(userId, dataType);
          resolve(true);
        },
        onReject: () => resolve(false)
      });
      modal.show();
    });
  }
  
  private async grantConsent(
    userId: string,
    dataType: string
  ): Promise<void> {
    await fetch('/api/gdpr/consent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        dataType,
        granted: true,
        timestamp: new Date().toISOString()
      })
    });
  }
}

export const consentService = new ConsentService();
```

##### Integrazione con Employee Data
```typescript
// Aggiornare getEmployees con consent check
async getEmployees(): Promise<Employee[]> {
  const userId = this.getCurrentUserId();
  
  if (userId) {
    const hasConsent = await consentService.checkConsent(
      userId, 
      'PERSONAL_DATA'
    );
    
    if (!hasConsent) {
      const granted = await consentService.requestConsent(
        userId,
        'PERSONAL_DATA',
        'Visualizzazione elenco dipendenti'
      );
      
      if (!granted) {
        throw new Error('Consenso richiesto per accedere ai dati dipendenti');
      }
    }
  }
  
  return this.request<Employee[]>(
    API_CONFIG.ENDPOINTS.EMPLOYEES,
    {},
    'PERSONAL_DATA'
  );
}
```

##### Deliverable
- **Consent verification** automatica
- **Modal consenso** user-friendly
- **Consent tracking** completo
- **Fail-safe mechanisms** implementati

---

### 🧪 FASE 4: Testing e Validazione (1 ora)

#### 4.1 Unit Testing (20 min)

##### Obiettivi
- Testare ApiService con nuovi endpoint
- Verificare retry logic
- Validare GDPR compliance

##### Test Implementation
```typescript
// src/services/__tests__/apiService.test.ts
import { apiService } from '../api';
import { API_CONFIG } from '../../config/environment';

describe('ApiService', () => {
  beforeEach(() => {
    fetchMock.resetMocks();
  });
  
  describe('getEmployees', () => {
    it('should fetch employees from correct endpoint', async () => {
      const mockEmployees = [{ id: '1', name: 'John Doe' }];
      fetchMock.mockResponseOnce(JSON.stringify(mockEmployees));
      
      const result = await apiService.getEmployees();
      
      expect(fetchMock).toHaveBeenCalledWith(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.EMPLOYEES}`,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      );
      expect(result).toEqual(mockEmployees);
    });
    
    it('should retry on network error', async () => {
      fetchMock
        .mockRejectOnce(new Error('Network error'))
        .mockRejectOnce(new Error('Network error'))
        .mockResponseOnce(JSON.stringify([]));
      
      const result = await apiService.getEmployees();
      
      expect(fetchMock).toHaveBeenCalledTimes(3);
      expect(result).toEqual([]);
    });
    
    it('should log GDPR audit on API call', async () => {
      const auditSpy = jest.spyOn(gdprAudit, 'logApiCall');
      fetchMock.mockResponseOnce(JSON.stringify([]));
      
      await apiService.getEmployees();
      
      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoint: API_CONFIG.ENDPOINTS.EMPLOYEES,
          dataType: 'PERSONAL_DATA',
          success: true
        })
      );
    });
  });
});
```

##### Deliverable
- **Test coverage** > 90%
- **Retry logic** validato
- **GDPR audit** testato
- **Error handling** verificato

#### 4.2 Integration Testing (20 min)

##### Obiettivi
- Testare flusso completo frontend → proxy → API
- Verificare CORS e headers
- Validare performance

##### Test Implementation
```typescript
// tests/integration/employeesPage.test.ts
import { render, screen, waitFor } from '@testing-library/react';
import { EmployeesPage } from '../../src/pages/employees/EmployeesPage';

describe('EmployeesPage Integration', () => {
  beforeEach(() => {
    // Setup test server
    server.listen();
  });
  
  afterEach(() => {
    server.resetHandlers();
  });
  
  it('should load employees successfully', async () => {
    const mockEmployees = [
      { id: '1', firstName: 'John', lastName: 'Doe' }
    ];
    
    server.use(
      rest.get(`${API_CONFIG.BASE_URL}/api/employees`, (req, res, ctx) => {
        return res(ctx.json(mockEmployees));
      })
    );
    
    render(<EmployeesPage />);
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
    
    expect(screen.queryByText('Error fetching employees')).not.toBeInTheDocument();
  });
  
  it('should handle API errors gracefully', async () => {
    server.use(
      rest.get(`${API_CONFIG.BASE_URL}/api/employees`, (req, res, ctx) => {
        return res(ctx.status(500), ctx.json({ error: 'Server error' }));
      })
    );
    
    render(<EmployeesPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/Errore nel caricamento/)).toBeInTheDocument();
    });
  });
});
```

##### Deliverable
- **End-to-end** flow testato
- **Error scenarios** coperti
- **Performance** validata
- **User experience** verificata

#### 4.3 E2E Testing (20 min)

##### Obiettivi
- Testare user journey completo
- Verificare tutti i server attivi
- Validare GDPR compliance

##### Test Implementation
```typescript
// tests/e2e/employees.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Employees Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5174/employees');
  });
  
  test('should load employees page without errors', async ({ page }) => {
    // Verificare che non ci siano errori console
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.waitForLoadState('networkidle');
    
    // Verificare che la pagina si carichi
    await expect(page.locator('[data-testid="employees-list"]')).toBeVisible();
    
    // Verificare che non ci siano errori ERR_CONNECTION_REFUSED
    const connectionErrors = errors.filter(error => 
      error.includes('ERR_CONNECTION_REFUSED')
    );
    expect(connectionErrors).toHaveLength(0);
  });
  
  test('should search employees successfully', async ({ page }) => {
    await page.fill('[data-testid="search-input"]', 'John');
    await page.waitForResponse(response => 
      response.url().includes('/api/employees') && response.status() === 200
    );
    
    await expect(page.locator('[data-testid="employee-card"]')).toBeVisible();
  });
});
```

##### Deliverable
- **User journey** completo testato
- **Zero errori** connessione
- **Performance** < 2s load time
- **GDPR compliance** verificata

---

### 📚 FASE 5: Documentazione e Deploy (1 ora)

#### 5.1 Aggiornamento Documentazione (30 min)

##### Obiettivi
- Documentare nuova architettura
- Aggiornare guide sviluppo
- Creare troubleshooting guide

##### Documentazione da Aggiornare

###### Architecture Documentation
```markdown
# docs/2_ARCHITECTURE/api-architecture.md

## Architettura API Corretta

### Server Configuration
- **Frontend Dev Server:** http://localhost:5174
- **Proxy Server:** http://localhost:4003
- **API Server:** http://localhost:4001
- **Documents Server:** http://localhost:4002

### Communication Flow
```
Frontend → Proxy (4003) → API Server (4001) ↔ Database
                       → Documents (4002)
```

### Endpoint Mapping
- `/api/*` → API Server (4001)
- `/documents/*` → Documents Server (4002)
```

###### Development Guide
```markdown
# docs/5_FRONTEND/api-integration.md

## API Integration Best Practices

### Service Layer Usage
```typescript
// ✅ Correct
import { apiService } from '../services/api';
const employees = await apiService.getEmployees();

// ❌ Incorrect
fetch('http://localhost:4000/employees'); // Wrong port
```

### Error Handling
```typescript
try {
  const data = await apiService.getEmployees();
  setEmployees(data);
} catch (error) {
  setError('Errore nel caricamento dipendenti');
  console.error('API Error:', error);
}
```
```

##### Deliverable
- **Architecture docs** aggiornati
- **Development guide** completo
- **API reference** accurato
- **Troubleshooting** guide

#### 5.2 Deployment e Monitoring (30 min)

##### Obiettivi
- Deploy configurazione corretta
- Setup monitoring attivo
- Validare metriche performance

##### Pre-deployment Checklist
- [ ] Tutti i server backend attivi
- [ ] Frontend utilizza proxy corretto
- [ ] GDPR audit logging attivo
- [ ] Error handling implementato
- [ ] Tests passano al 100%
- [ ] Performance < 2s load time
- [ ] Zero errori console

##### Deployment Steps
```bash
# 1. Verificare stato server
ps aux | grep node
lsof -i :4001 :4002 :4003

# 2. Restart se necessario
cd backend/
node api-server.js &
node documents-server.js &
node proxy-server.js &

# 3. Verificare frontend
cd ../
npm run dev

# 4. Test endpoint
curl http://localhost:4003/api/employees
curl http://localhost:4003/api/companies
```

##### Post-deployment Monitoring
```typescript
// Setup monitoring dashboard
const monitoringMetrics = {
  apiResponseTime: '< 500ms',
  errorRate: '0%',
  uptime: '100%',
  gdprAuditLogs: 'Active',
  consentVerification: 'Active'
};

// Alert thresholds
const alerts = {
  responseTime: 1000, // ms
  errorRate: 0.01,    // 1%
  uptime: 0.999       // 99.9%
};
```

##### Deliverable
- **Sistema** completamente operativo
- **Monitoring** attivo
- **Alerts** configurati
- **Performance** validata

---

## 📊 Success Metrics

### Metriche Tecniche
- ✅ **API Response Time:** < 500ms
- ✅ **Error Rate:** 0% per endpoint critici
- ✅ **Page Load Time:** < 2s
- ✅ **Uptime:** 100% post-deployment

### Metriche GDPR
- ✅ **Audit Trail:** 100% operazioni tracciate
- ✅ **Consent Verification:** Attiva per dati personali
- ✅ **Data Classification:** Automatica
- ✅ **Error Logging:** GDPR-compliant

### Metriche User Experience
- ✅ **Zero errori** ERR_CONNECTION_REFUSED
- ✅ **Loading states** informativi
- ✅ **Error messages** user-friendly
- ✅ **Responsive design** mantenuto

---

## 🚨 Contingency Plans

### Scenario A: Server Backend Non Avviabili
**Azione:** Verificare dipendenze e porte in uso
```bash
npm install
lsof -i :4001 :4002 :4003
kill -9 $(lsof -t -i:4001)
```

### Scenario B: Proxy Configuration Issues
**Azione:** Fallback a configurazione diretta temporanea
```typescript
// Temporary direct API calls
const FALLBACK_CONFIG = {
  BASE_URL: 'http://localhost:4001'
};
```

### Scenario C: GDPR Compliance Issues
**Azione:** Disabilitare funzionalità fino a risoluzione
```typescript
if (!gdprCompliant) {
  throw new Error('GDPR compliance required');
}
```

---

## 📞 Support e Escalation

### Team Contacts
- **Technical Lead:** Decisioni architetturali
- **GDPR Officer:** Questioni compliance
- **DevOps:** Problemi infrastruttura

### Emergency Procedures
1. **Rollback immediato** se errori critici
2. **Escalation** a team senior
3. **Communication** stakeholder
4. **Post-mortem** analysis

---

**Planning creato da:** AI Assistant  
**Data:** 2 Gennaio 2025  
**Versione:** 1.0  
**Status:** 📋 APPROVATO PER IMPLEMENTAZIONE