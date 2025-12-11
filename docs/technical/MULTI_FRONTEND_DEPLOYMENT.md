# Multi-Frontend Deployment Guide

## 📋 Overview

Il sistema Element supporta **due frontend pubblici separati** che condividono lo stesso backend e frontend privato (CMS admin):

1. **Element Formazione** (elementformazione.it)
   - Focus: Formazione + Medicina del Lavoro + RSPP
   - Tema: Formazione (colori primari blu)
   
2. **Element Medica** (elementmedica.it)
   - Focus: Poliambulatorio + Medicina del Lavoro (servizio primario)
   - Tema: Medical (colori cyan/green)

## 🏗️ Architettura

```
┌─────────────────────────────────────────────────────────────┐
│                    SHARED BACKEND                           │
│  - API Server (port 4001)                                   │
│  - Database (PostgreSQL/Supabase)                           │
│  - Authentication System                                    │
│  - Brand Detection Middleware                               │
├─────────────────────────────────────────────────────────────┤
│                SHARED ADMIN FRONTEND                        │
│  - CMS Manager (with brand selector)                        │
│  - User Management                                          │
│  - Content Editor                                           │
├─────────────────────────────────────────────────────────────┤
│              PUBLIC FRONTENDS (SEPARATE)                    │
│                                                             │
│  ┌────────────────────┐    ┌────────────────────┐         │
│  │ Element Formazione │    │  Element Medica    │         │
│  │ (port 5173)        │    │  (port 5174)       │         │
│  │ Tenant ID: tenant-1│    │  Tenant ID: tenant-2│        │
│  │ Frontend ID: ef    │    │  Frontend ID: em    │        │
│  └────────────────────┘    └────────────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

## 🔑 Componenti Chiave

### 1. Brand Configuration (`src/config/brands.config.ts`)

```typescript
export const elementFormazioneBrand: BrandConfig = {
  id: 'element-formazione',
  backend: {
    tenantId: 'tenant-id-formazione',
    frontendId: 'element-formazione'
  },
  features: {
    medicinaLavoro: true,
    corsiFormazione: true,
    rspp: true,
    poliambulatorio: false
  }
};

export const elementMedicaBrand: BrandConfig = {
  id: 'element-medica',
  backend: {
    tenantId: 'tenant-id-medica',
    frontendId: 'element-medica'
  },
  features: {
    medicinaLavoro: true,
    corsiFormazione: false,
    rspp: false,
    poliambulatorio: true
  }
};
```

### 2. Backend Brand Detection (`backend/middleware/brandDetection.js`)

Il middleware rileva il brand tramite header `X-Frontend-Id`:

```javascript
const BRAND_CONFIGS = {
  'element-formazione': {
    tenantId: 'tenant-id-formazione',
    features: { showCourses: true, showPoliambulatorio: false }
  },
  'element-medica': {
    tenantId: 'tenant-id-medica',
    features: { showCourses: false, showPoliambulatorio: true }
  }
};
```

### 3. CMS Multi-Brand Controller (`backend/controllers/cmsMultiBrandController.js`)

Gestisce contenuti per brand specifici:
- `/api/cms/brands` - Lista brand disponibili
- `/api/cms/brands/:brandId/content` - Statistiche per brand
- `/api/cms/brands/:brandId/courses` - Corsi filtrati per brand
- `/api/cms/brands/:brandId/pages` - Pagine CMS per brand

## 🚀 Deployment Steps

### Step 1: Environment Variables

#### Element Formazione (`.env.element-formazione`)
```bash
VITE_BRAND_ID=element-formazione
VITE_TENANT_ID=tenant-id-formazione
VITE_API_URL=https://api.elementformazione.it
VITE_PUBLIC_URL=https://elementformazione.it
```

#### Element Medica (`.env.element-medica`)
```bash
VITE_BRAND_ID=element-medica
VITE_TENANT_ID=tenant-id-medica
VITE_API_URL=https://api.elementmedica.it
VITE_PUBLIC_URL=https://elementmedica.it
```

### Step 2: Build Scripts

Aggiorna `package.json`:

```json
{
  "scripts": {
    "build:formazione": "vite build --mode formazione --outDir dist/formazione",
    "build:medica": "vite build --mode medica --outDir dist/medica",
    "build:all": "npm run build:formazione && npm run build:medica",
    "preview:formazione": "vite preview --outDir dist/formazione --port 4173",
    "preview:medica": "vite preview --outDir dist/medica --port 4174"
  }
}
```

### Step 3: Vite Configuration

Aggiorna `vite.config.ts`:

```typescript
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const brand = mode === 'medica' ? 'element-medica' : 'element-formazione';
  
  return {
    build: {
      outDir: `dist/${brand}`,
      sourcemap: mode !== 'production',
    },
    define: {
      'import.meta.env.VITE_BRAND_ID': JSON.stringify(env.VITE_BRAND_ID || brand),
    },
    server: {
      port: brand === 'element-medica' ? 5174 : 5173,
    }
  };
});
```

### Step 4: Nginx Configuration

#### Element Formazione (`/etc/nginx/sites-available/elementformazione.it`)
```nginx
server {
    listen 80;
    server_name elementformazione.it www.elementformazione.it;
    
    root /var/www/elementformazione/dist/formazione;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://localhost:4001;
        proxy_set_header X-Frontend-Id element-formazione;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header Host $host;
    }
}
```

#### Element Medica (`/etc/nginx/sites-available/elementmedica.it`)
```nginx
server {
    listen 80;
    server_name elementmedica.it www.elementmedica.it;
    
    root /var/www/elementmedica/dist/medica;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://localhost:4001;
        proxy_set_header X-Frontend-Id element-medica;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header Host $host;
    }
}
```

### Step 5: SSL Certificates (Certbot)

```bash
# Element Formazione
sudo certbot --nginx -d elementformazione.it -d www.elementformazione.it

# Element Medica
sudo certbot --nginx -d elementmedica.it -d www.elementmedica.it
```

## 📦 Database Setup

### Tenants Configuration

```sql
-- Element Formazione Tenant
INSERT INTO tenants (id, name, domain, settings)
VALUES (
  'tenant-id-formazione',
  'Element Formazione',
  'elementformazione.it',
  '{
    "features": {
      "corsiFormazione": true,
      "medicinaLavoro": true,
      "rspp": true
    },
    "theme": "formazione"
  }'
);

-- Element Medica Tenant
INSERT INTO tenants (id, name, domain, settings)
VALUES (
  'tenant-id-medica',
  'Element Medica',
  'elementmedica.it',
  '{
    "features": {
      "poliambulatorio": true,
      "medicinaLavoro": true,
      "visitePecialistica": true
    },
    "theme": "medical"
  }'
);
```

## 🔐 Security Considerations

### 1. Tenant Isolation
- Tutti i dati sono filtrati per `tenantId`
- Middleware backend valida il tenant su ogni richiesta
- CMS mostra solo contenuti del tenant corrente

### 2. Cross-Origin Resource Sharing (CORS)
```javascript
// backend/config/cors.js
const allowedOrigins = [
  'https://elementformazione.it',
  'https://www.elementformazione.it',
  'https://elementmedica.it',
  'https://www.elementmedica.it',
  'http://localhost:5173',
  'http://localhost:5174'
];
```

### 3. Content Security Policy
```nginx
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';" always;
```

## 🧪 Testing

### Local Development

#### Terminal 1: Backend
```bash
cd backend
npm run dev
# Runs on port 4001
```

#### Terminal 2: Element Formazione Frontend
```bash
npm run dev
# Runs on port 5173
```

#### Terminal 3: Element Medica Frontend (se necessario)
```bash
VITE_BRAND_ID=element-medica npm run dev -- --port 5174
```

### Testing Brand Detection

```bash
# Test Element Formazione
curl -H "X-Frontend-Id: element-formazione" \
     http://localhost:4001/api/v1/courses

# Test Element Medica (should return empty courses)
curl -H "X-Frontend-Id: element-medica" \
     http://localhost:4001/api/v1/courses
```

## 📊 Monitoring

### Health Checks

```bash
# Backend
curl http://localhost:4001/api/health

# Frontend Formazione
curl http://elementformazione.it

# Frontend Medica
curl http://elementmedica.it
```

### Logs Location
- Backend: `/var/log/element/backend.log`
- Nginx Formazione: `/var/log/nginx/elementformazione.it.access.log`
- Nginx Medica: `/var/log/nginx/elementmedica.it.access.log`

## 🐛 Troubleshooting

### Issue: Wrong Brand Content Showing

**Causa**: Header `X-Frontend-Id` non impostato correttamente

**Soluzione**:
```bash
# Verifica nginx config
sudo nginx -t

# Verifica header nel backend
tail -f /var/log/element/backend.log | grep "Frontend-Id"
```

### Issue: 404 on Brand-Specific Pages

**Causa**: Build non include pagine specifiche del brand

**Soluzione**:
```bash
# Rebuild con variabili corrette
VITE_BRAND_ID=element-medica npm run build:medica
```

### Issue: Shared State Between Brands

**Causa**: localStorage o cookie condivisi

**Soluzione**:
- Usa prefissi brand-specific: `ef_token`, `em_token`
- Configura cookie domain-specific

## 📈 Performance Optimization

### CDN Configuration

Usa Cloudflare per:
- Static asset caching
- DDoS protection
- SSL termination
- Geographic distribution

### Build Optimization

```javascript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom', 'react-router-dom'],
          'medical': ['lucide-react'],
        }
      }
    }
  }
});
```

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow

```yaml
name: Deploy Multi-Frontend

on:
  push:
    branches: [main]

jobs:
  deploy-formazione:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build Element Formazione
        run: npm run build:formazione
      - name: Deploy to Server
        run: rsync -avz dist/formazione/ user@server:/var/www/elementformazione/

  deploy-medica:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build Element Medica
        run: npm run build:medica
      - name: Deploy to Server
        run: rsync -avz dist/medica/ user@server:/var/www/elementmedica/
```

## 📝 Maintenance Checklist

### Weekly
- [ ] Verificare log errori per entrambi i brand
- [ ] Controllare metriche performance (GTmetrix, Lighthouse)
- [ ] Verificare SSL certificate expiry

### Monthly
- [ ] Aggiornare dipendenze npm
- [ ] Backup database con dati separati per tenant
- [ ] Review contenuti CMS per ciascun brand

### Quarterly
- [ ] Audit sicurezza
- [ ] Performance optimization review
- [ ] User feedback analysis per brand

## 🆘 Support

Per problemi o domande:
- **Tecnici**: Vedere `docs/troubleshooting/`
- **Business**: Contattare team Element
- **Emergenze**: On-call rotation

---

**Ultimo aggiornamento**: 19 Novembre 2025
**Versione**: 1.0.0
**Autori**: Element Dev Team
