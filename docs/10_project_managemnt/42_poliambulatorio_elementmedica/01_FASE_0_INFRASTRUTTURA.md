# 🔧 FASE 0: Preparazione e Infrastruttura

## Documento di Fase

**Fase**: 0 - Infrastruttura  
**Durata Stimata**: 1-2 settimane  
**Prerequisiti**: Nessuno (fase iniziale)  
**Output**: Sistema multi-frontend funzionante con routing domain-based

---

## 📋 INDICE

1. [Obiettivi](#1-obiettivi)
2. [Analisi Tecnica Dettagliata](#2-analisi-tecnica-dettagliata)
3. [Attività e Checklist](#3-attività-e-checklist)
4. [Implementazione Dettagliata](#4-implementazione-dettagliata)
5. [Test Cases](#5-test-cases)
6. [Criteri di Accettazione](#6-criteri-di-accettazione)

---

## 1. Obiettivi

### 1.1 Obiettivo Principale
Configurare l'infrastruttura per supportare **due frontend separati** (formazione e medica) che condividono lo stesso backend, con **login e routing differenziati per dominio**.

### 1.2 Deliverables

| Deliverable | Descrizione | Priorità |
|-------------|-------------|----------|
| Multi-frontend Vite | Due entry point separati | 🔴 CRITICO |
| Routing domain-based | Login → dashboard corretta | 🔴 CRITICO |
| Tenant elementmedica | Nuovo tenant nel DB | 🔴 CRITICO |
| CORS multi-origin | Supporto nuovi domini | 🔴 CRITICO |
| Switch frontend | UI per passare tra le app | 🟡 ALTO |

---

## 2. Analisi Tecnica Dettagliata

### 2.1 Stato Attuale Vite Config

```typescript
// vite.config.ts ATTUALE
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      }
    }
  },
  server: {
    proxy: {
      '/api': 'http://localhost:4003'
    }
  }
});
```

### 2.2 Architettura Target Multi-Frontend

```
┌─────────────────────────────────────────────────────────────┐
│                   BUILD SYSTEM                               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Vite Config                                                 │
│  ├── Entry Points                                            │
│  │   ├── index.html          → dist/formazione/             │
│  │   └── index.medica.html   → dist/medica/                 │
│  │                                                           │
│  ├── Shared Code                                             │
│  │   ├── src/components/ui/                                  │
│  │   ├── src/hooks/                                          │
│  │   ├── src/services/                                       │
│  │   └── src/utils/                                          │
│  │                                                           │
│  ├── Formazione-specific                                     │
│  │   ├── src/apps/formazione/App.tsx                        │
│  │   ├── src/apps/formazione/pages/                         │
│  │   └── src/apps/formazione/router.tsx                     │
│  │                                                           │
│  └── Medica-specific                                         │
│      ├── src/apps/medica/App.tsx                            │
│      ├── src/apps/medica/pages/                             │
│      └── src/apps/medica/router.tsx                         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 Login Flow Domain-Based

```
┌─────────────────────────────────────────────────────────────┐
│                    LOGIN FLOW                                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Utente accede a elementmedica.com/login                 │
│     ↓                                                        │
│  2. Frontend rileva dominio (window.location.hostname)       │
│     ↓                                                        │
│  3. Login con credenziali                                    │
│     ↓                                                        │
│  4. Backend verifica:                                        │
│     - Credenziali valide                                     │
│     - Utente appartiene a tenant corretto (via domain)       │
│     - Ruoli compatibili con app (medica richiede ruoli med.) │
│     ↓                                                        │
│  5. Token JWT include:                                       │
│     - tenantId                                               │
│     - appType: 'formazione' | 'medica'                      │
│     - roles[]                                                │
│     ↓                                                        │
│  6. Redirect a dashboard corretta:                           │
│     - elementmedica.com → /dashboard/medica                 │
│     - elementformazione.com → /dashboard/formazione         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 2.4 Tenant Resolution

```javascript
// Logica esistente da estendere
// backend/middleware/tenant.js

// ATTUALE: risolve tenant da domain/subdomain
// TARGET: aggiungere metadata per tipo app

const resolveAppType = (host) => {
  if (host.includes('elementmedica')) return 'medica';
  if (host.includes('elementformazione')) return 'formazione';
  return 'formazione'; // default
};

// Il tenant medica avrà settings JSON con:
// { appType: 'medica', features: ['ambulatori', 'visite', 'referti'] }
```

---

## 3. Attività e Checklist

### 3.1 Setup Multi-Frontend Build

- [ ] **3.1.1** Creare `index.medica.html` (entry point medica)
- [ ] **3.1.2** Creare `src/main.medica.tsx` (bootstrap medica)
- [ ] **3.1.3** Creare `src/apps/medica/App.tsx` (root component)
- [ ] **3.1.4** Aggiornare `vite.config.ts` per multi-entry
- [ ] **3.1.5** Configurare build separati (`npm run build:medica`)
- [ ] **3.1.6** Testare HMR per entrambi gli entry point

### 3.2 Struttura Directory Apps

- [ ] **3.2.1** Creare `src/apps/formazione/` (migrare codice esistente)
- [ ] **3.2.2** Creare `src/apps/medica/` (nuova app)
- [ ] **3.2.3** Creare `src/shared/` (componenti condivisi)
- [ ] **3.2.4** Aggiornare imports per nuova struttura
- [ ] **3.2.5** Verificare nessun breaking change

### 3.3 Routing Domain-Based

- [ ] **3.3.1** Creare hook `useAppType()` per rilevare app corrente
- [ ] **3.3.2** Modificare `AuthContext` per includere appType
- [ ] **3.3.3** Creare `useAuthRedirect` aggiornato per domain
- [ ] **3.3.4** Aggiornare `LoginPage` per redirect corretto
- [ ] **3.3.5** Creare route guard per app-specific pages

### 3.4 Backend Multi-Tenant

- [ ] **3.4.1** Creare tenant "ElementMedica" nel database
- [ ] **3.4.2** Aggiungere campo `appType` a Tenant settings
- [ ] **3.4.3** Aggiornare `tenantMiddleware` per app detection
- [ ] **3.4.4** Estendere JWT payload con appType
- [ ] **3.4.5** Creare middleware `requireAppType()`

### 3.5 CORS e Security

- [ ] **3.5.1** Aggiungere `elementmedica.com` a CORS origins
- [ ] **3.5.2** Aggiungere `www.elementmedica.com` a CORS origins
- [ ] **3.5.3** Aggiungere `api.elementmedica.com` se necessario
- [ ] **3.5.4** Testare CORS preflight per nuovi domini
- [ ] **3.5.5** Verificare cookie settings per cross-domain

### 3.6 Switch Frontend UI

- [ ] **3.6.1** Creare componente `AppSwitcher`
- [ ] **3.6.2** Aggiungere a header/sidebar
- [ ] **3.6.3** Implementare logica switch (solo se utente ha accesso)
- [ ] **3.6.4** Gestire sessione durante switch

---

## 4. Implementazione Dettagliata

### 4.1 Vite Config Multi-Entry

```typescript
// vite.config.ts - TARGET
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';
  
  return {
    plugins: [react()],
    
    build: {
      rollupOptions: {
        input: {
          formazione: resolve(__dirname, 'index.html'),
          medica: resolve(__dirname, 'index.medica.html'),
        },
        output: {
          // Separate chunks per app
          manualChunks: (id) => {
            if (id.includes('node_modules')) {
              return 'vendor';
            }
            if (id.includes('src/apps/formazione')) {
              return 'formazione';
            }
            if (id.includes('src/apps/medica')) {
              return 'medica';
            }
            if (id.includes('src/shared') || id.includes('src/components')) {
              return 'shared';
            }
          }
        }
      },
      outDir: 'dist',
    },
    
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:4003',
          changeOrigin: true,
        }
      }
    },
    
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '@shared': resolve(__dirname, 'src/shared'),
        '@formazione': resolve(__dirname, 'src/apps/formazione'),
        '@medica': resolve(__dirname, 'src/apps/medica'),
      }
    }
  };
});
```

### 4.2 Entry Point Medica

```html
<!-- index.medica.html -->
<!DOCTYPE html>
<html lang="it">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon-medica.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ElementMedica - Gestione Poliambulatorio</title>
    <meta name="description" content="Sistema gestionale per poliambulatori - ElementMedica" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.medica.tsx"></script>
  </body>
</html>
```

### 4.3 Bootstrap Medica

```typescript
// src/main.medica.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Shared providers
import { AuthProvider } from '@shared/context/AuthContext';
import { ThemeProvider } from '@shared/context/ThemeContext';

// Medica-specific app
import App from '@medica/App';

// Shared styles
import '@/index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider appType="medica">
          <ThemeProvider>
            <App />
          </ThemeProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
```

### 4.4 Hook useAppType

```typescript
// src/shared/hooks/useAppType.ts
import { useMemo } from 'react';

export type AppType = 'formazione' | 'medica';

export const useAppType = (): AppType => {
  return useMemo(() => {
    const hostname = window.location.hostname;
    
    // Production domains
    if (hostname.includes('elementmedica')) return 'medica';
    if (hostname.includes('elementformazione')) return 'formazione';
    
    // Development: check port or query param
    const port = window.location.port;
    const params = new URLSearchParams(window.location.search);
    
    if (params.get('app') === 'medica') return 'medica';
    if (port === '5174') return 'medica'; // Porta dev medica
    
    return 'formazione'; // default
  }, []);
};

// Utility per costruire URL corretto
export const getAppUrl = (appType: AppType, path: string = '/'): string => {
  const baseUrls = {
    formazione: import.meta.env.VITE_FORMAZIONE_URL || 'https://elementformazione.com',
    medica: import.meta.env.VITE_MEDICA_URL || 'https://elementmedica.com',
  };
  
  return `${baseUrls[appType]}${path}`;
};
```

### 4.5 AuthContext Esteso

```typescript
// src/shared/context/AuthContext.tsx - MODIFICHE
interface AuthContextType {
  // ... esistenti ...
  appType: AppType;
  canAccessApp: (app: AppType) => boolean;
  switchApp: (app: AppType) => void;
}

export const AuthProvider: React.FC<{ 
  children: ReactNode;
  appType?: AppType;
}> = ({ children, appType: initialAppType }) => {
  const detectedAppType = useAppType();
  const appType = initialAppType || detectedAppType;
  
  // Verifica se utente può accedere a un'app specifica
  const canAccessApp = useCallback((targetApp: AppType): boolean => {
    if (!user) return false;
    
    // Admin può accedere a tutto
    if (user.globalRole === 'SUPER_ADMIN' || user.globalRole === 'ADMIN') {
      return true;
    }
    
    // Verifica ruoli app-specific
    const roles = user.roles || [];
    
    if (targetApp === 'medica') {
      // Medica richiede ruoli medici
      const medicalRoles = ['MEDICO', 'INFERMIERE', 'SEGRETERIA_MEDICA', 'PAZIENTE', 'DIRETTORE_SANITARIO'];
      return roles.some(r => medicalRoles.includes(r));
    }
    
    if (targetApp === 'formazione') {
      // Formazione: tutti i ruoli non-solo-medici
      return true;
    }
    
    return false;
  }, [user]);
  
  // Switch tra app (redirect)
  const switchApp = useCallback((targetApp: AppType) => {
    if (!canAccessApp(targetApp)) {
      console.error('User cannot access app:', targetApp);
      return;
    }
    
    const targetUrl = getAppUrl(targetApp, '/dashboard');
    window.location.href = targetUrl;
  }, [canAccessApp]);
  
  // ... rest of context ...
};
```

### 4.6 Tenant Middleware Esteso

```javascript
// backend/middleware/tenant.js - MODIFICHE

/**
 * Determina il tipo di app dal dominio
 */
const resolveAppType = (host) => {
  if (!host) return 'formazione';
  
  const hostname = host.toLowerCase();
  
  if (hostname.includes('elementmedica') || hostname.includes('medica')) {
    return 'medica';
  }
  
  if (hostname.includes('elementformazione') || hostname.includes('formazione')) {
    return 'formazione';
  }
  
  // Development: check for specific patterns
  if (hostname.includes('localhost')) {
    // Could use port or header to distinguish
    return 'formazione'; // default for dev
  }
  
  return 'formazione';
};

const tenantMiddleware = async (req, res, next) => {
  try {
    // ... existing tenant resolution logic ...
    
    // ADD: Resolve app type
    const host = req.get('host') || req.get('x-forwarded-host');
    const appType = resolveAppType(host);
    
    // Set app type in request
    req.appType = appType;
    
    // Validate tenant settings match app type
    if (tenant && tenant.settings?.appType) {
      if (tenant.settings.appType !== appType) {
        logger.warn('App type mismatch', {
          tenantAppType: tenant.settings.appType,
          requestAppType: appType,
          host
        });
        // Could return error or allow (depends on business logic)
      }
    }
    
    // ... continue with existing logic ...
    
    next();
  } catch (error) {
    // ... error handling ...
  }
};

/**
 * Middleware per verificare che l'utente abbia ruoli compatibili con l'app
 */
const requireAppAccess = (requiredAppType) => {
  return async (req, res, next) => {
    const person = req.person;
    const currentAppType = req.appType;
    
    if (!person) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Super admin bypassa tutto
    if (person.globalRole === 'SUPER_ADMIN') {
      return next();
    }
    
    // Verifica accesso all'app
    const roles = await getRolesForPerson(person.id, req.tenantId);
    const roleTypes = roles.map(r => r.roleType);
    
    if (requiredAppType === 'medica') {
      const medicalRoles = ['MEDICO', 'INFERMIERE', 'SEGRETERIA_MEDICA', 'PAZIENTE', 'DIRETTORE_SANITARIO', 'ADMIN', 'CLINIC_ADMIN'];
      const hasAccess = roleTypes.some(r => medicalRoles.includes(r));
      
      if (!hasAccess) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'User does not have medical app access',
          requiredRoles: medicalRoles
        });
      }
    }
    
    next();
  };
};

export {
  tenantMiddleware,
  validateUserTenant,
  requireAppAccess, // NUOVO
  resolveAppType,   // NUOVO
  // ... altri export esistenti ...
};
```

### 4.7 Script Seed Tenant Medica

```javascript
// backend/scripts/seeds/seed-tenant-medica.js
import prisma from '../../config/prisma-optimization.js';

async function seedTenantMedica() {
  console.log('🏥 Creating ElementMedica tenant...');
  
  // Verifica se esiste già
  const existing = await prisma.tenant.findFirst({
    where: {
      OR: [
        { slug: 'elementmedica' },
        { domain: 'elementmedica.com' }
      ]
    }
  });
  
  if (existing) {
    console.log('⚠️ Tenant ElementMedica already exists:', existing.id);
    return existing;
  }
  
  // Crea nuovo tenant
  const tenant = await prisma.tenant.create({
    data: {
      name: 'ElementMedica',
      slug: 'elementmedica',
      domain: 'elementmedica.com',
      settings: {
        appType: 'medica',
        features: [
          'poliambulatorio',
          'ambulatori',
          'prestazioni',
          'agenda',
          'visite',
          'referti',
          'fatturazione_medica'
        ],
        branding: {
          primaryColor: '#0066CC',
          logo: '/assets/logo-medica.svg',
          favicon: '/favicon-medica.svg'
        },
        locale: 'it-IT',
        timezone: 'Europe/Rome'
      },
      billingPlan: 'enterprise',
      maxUsers: 100,
      maxCompanies: 1, // Un poliambulatorio
      isActive: true
    }
  });
  
  console.log('✅ Tenant ElementMedica created:', tenant.id);
  
  // Crea admin user per il tenant
  const adminPassword = await hashPassword('Admin123!'); // Usa bcrypt
  
  const adminUser = await prisma.person.create({
    data: {
      firstName: 'Admin',
      lastName: 'Medica',
      email: 'admin@elementmedica.com',
      username: 'admin.medica',
      password: adminPassword,
      status: 'ACTIVE',
      globalRole: 'ADMIN',
      tenantId: tenant.id
    }
  });
  
  console.log('✅ Admin user created:', adminUser.email);
  
  // Assegna ruolo ADMIN
  await prisma.personRole.create({
    data: {
      personId: adminUser.id,
      roleType: 'ADMIN',
      isActive: true,
      isPrimary: true,
      tenantId: tenant.id
    }
  });
  
  console.log('✅ Admin role assigned');
  
  return tenant;
}

seedTenantMedica()
  .then(() => {
    console.log('🎉 Seed completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  });
```

### 4.8 CORS Config Update

```javascript
// backend/config/cors.js - MODIFICHE

const allowedOrigins = [
  // Development
  'http://localhost:5173',
  'http://localhost:5174', // Porta medica dev
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  
  // Production - Formazione
  'https://elementformazione.com',
  'https://www.elementformazione.com',
  'https://app.elementformazione.com',
  
  // Production - Medica (NUOVO)
  'https://elementmedica.com',
  'https://www.elementmedica.com',
  'https://app.elementmedica.com',
  
  // API domains (se necessario)
  'https://api.elementformazione.com',
  'https://api.elementmedica.com',
];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman)
    if (!origin) {
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else if (process.env.NODE_ENV === 'development') {
      // In development, allow all localhost origins
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-Tenant-ID',
    'X-App-Type', // NUOVO header per app type
    'X-CSRF-Token',
  ],
  exposedHeaders: [
    'X-Total-Count',
    'X-Page',
    'X-Limit',
    'X-Api-Version',
  ],
  maxAge: 86400, // 24 hours
};

export default corsOptions;
```

### 4.9 App Switcher Component

```typescript
// src/shared/components/AppSwitcher.tsx
import React from 'react';
import { Building2, Stethoscope, ChevronDown } from 'lucide-react';
import { useAuth } from '@shared/context/AuthContext';
import { useAppType, AppType, getAppUrl } from '@shared/hooks/useAppType';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

const apps = [
  {
    type: 'formazione' as AppType,
    name: 'Element Formazione',
    description: 'Gestione Corsi e Formazione',
    icon: Building2,
    color: 'text-blue-600',
  },
  {
    type: 'medica' as AppType,
    name: 'Element Medica',
    description: 'Gestione Poliambulatorio',
    icon: Stethoscope,
    color: 'text-emerald-600',
  },
];

export const AppSwitcher: React.FC = () => {
  const { canAccessApp, user } = useAuth();
  const currentAppType = useAppType();
  
  const currentApp = apps.find(a => a.type === currentAppType);
  const availableApps = apps.filter(a => canAccessApp(a.type));
  
  // Non mostrare se utente ha accesso solo a un'app
  if (availableApps.length <= 1) {
    return null;
  }
  
  const handleSwitch = (targetApp: AppType) => {
    if (targetApp === currentAppType) return;
    
    const targetUrl = getAppUrl(targetApp, '/dashboard');
    window.location.href = targetUrl;
  };
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2">
          {currentApp && (
            <>
              <currentApp.icon className={`h-5 w-5 ${currentApp.color}`} />
              <span className="hidden md:inline">{currentApp.name}</span>
            </>
          )}
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-64">
        {availableApps.map((app) => (
          <DropdownMenuItem
            key={app.type}
            onClick={() => handleSwitch(app.type)}
            className={`flex items-center gap-3 p-3 cursor-pointer ${
              app.type === currentAppType ? 'bg-accent' : ''
            }`}
          >
            <app.icon className={`h-5 w-5 ${app.color}`} />
            <div className="flex flex-col">
              <span className="font-medium">{app.name}</span>
              <span className="text-xs text-muted-foreground">
                {app.description}
              </span>
            </div>
            {app.type === currentAppType && (
              <span className="ml-auto text-xs text-primary">Attivo</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
```

---

## 5. Test Cases

### 5.1 Test Multi-Frontend Build

| ID | Test | Expected | Priority |
|----|------|----------|----------|
| T0.1.1 | `npm run build` genera dist/formazione e dist/medica | ✅ Due cartelle separate | 🔴 |
| T0.1.2 | Bundle formazione non include codice medica | ✅ Size separati | 🔴 |
| T0.1.3 | Shared components presenti in entrambi | ✅ Vendor chunk condiviso | 🟡 |
| T0.1.4 | HMR funziona per entrambe le app in dev | ✅ Reload corretto | 🟡 |

### 5.2 Test Routing Domain-Based

| ID | Test | Expected | Priority |
|----|------|----------|----------|
| T0.2.1 | Login su elementmedica.com → dashboard medica | ✅ /dashboard/medica | 🔴 |
| T0.2.2 | Login su elementformazione.com → dashboard formazione | ✅ /dashboard/formazione | 🔴 |
| T0.2.3 | Utente solo formazione tenta accesso medica | ❌ 403 Forbidden | 🔴 |
| T0.2.4 | Admin accede a entrambe le app | ✅ Switch funzionante | 🔴 |
| T0.2.5 | Token JWT contiene appType corretto | ✅ Payload verificato | 🟡 |

### 5.3 Test Tenant

| ID | Test | Expected | Priority |
|----|------|----------|----------|
| T0.3.1 | Tenant elementmedica esiste nel DB | ✅ Record presente | 🔴 |
| T0.3.2 | Tenant settings include appType: 'medica' | ✅ JSON corretto | 🔴 |
| T0.3.3 | Admin medica può fare login | ✅ Auth funzionante | 🔴 |
| T0.3.4 | Tenant isolation funziona | ✅ Dati separati | 🔴 |

### 5.4 Test CORS

| ID | Test | Expected | Priority |
|----|------|----------|----------|
| T0.4.1 | Request da elementmedica.com accettata | ✅ 200 OK | 🔴 |
| T0.4.2 | Preflight OPTIONS corretto | ✅ Headers corretti | 🔴 |
| T0.4.3 | Cookies cross-domain funzionano | ✅ Session mantenuta | 🟡 |
| T0.4.4 | Request da dominio non autorizzato | ❌ CORS error | 🟡 |

---

## 6. Criteri di Accettazione

### 6.1 Must Have (Bloccanti)

- [ ] ✅ Build genera due bundle separati (formazione + medica)
- [ ] ✅ Login su elementmedica.com funziona
- [ ] ✅ Redirect post-login alla dashboard corretta
- [ ] ✅ Tenant elementmedica creato con settings corretti
- [ ] ✅ CORS accetta richieste da nuovi domini
- [ ] ✅ Nessun breaking change su formazione

### 6.2 Should Have (Importanti)

- [ ] ✅ App Switcher UI funzionante
- [ ] ✅ Shared components correttamente isolati
- [ ] ✅ Dev server supporta entrambe le app
- [ ] ✅ TypeScript compila senza errori

### 6.3 Nice to Have (Opzionali)

- [ ] Favicon diversi per app
- [ ] Branding dinamico (colori per app)
- [ ] Cache strategy per shared assets

---

## 📋 Checklist Finale Fase 0

```
PRE-IMPLEMENTAZIONE
├── [ ] Backup database produzione
├── [ ] Tag git: v1.0-pre-medica
├── [ ] Branch: feature/multi-frontend-medica

IMPLEMENTAZIONE
├── [ ] Vite config multi-entry
├── [ ] Entry point medica (index.medica.html, main.medica.tsx)
├── [ ] App.medica.tsx base
├── [ ] Ristrutturazione directory (apps/, shared/)
├── [ ] useAppType hook
├── [ ] AuthContext esteso
├── [ ] tenantMiddleware esteso
├── [ ] Seed tenant medica
├── [ ] CORS config aggiornato
├── [ ] AppSwitcher component

TESTING
├── [ ] Test build (T0.1.*)
├── [ ] Test routing (T0.2.*)
├── [ ] Test tenant (T0.3.*)
├── [ ] Test CORS (T0.4.*)

POST-IMPLEMENTAZIONE
├── [ ] TypeScript: 0 errori
├── [ ] Build: passa
├── [ ] Formazione: nessuna regressione
├── [ ] Documentazione aggiornata
├── [ ] PR review e merge
```

---

**Prossimo Documento**: `02_FASE_1_DATABASE.md` - Schema Database Clinico
