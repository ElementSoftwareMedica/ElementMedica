# Sistema Multi-Frontend Element

## Overview

Il sistema supporta **2 frontend pubblici separati** che condividono lo stesso backend:

### 🔵 Element Formazione (Port 5173)
- **Brand**: element-formazione
- **Focus**: Formazione professionale + Medicina del Lavoro + RSPP
- **URL Dev**: http://localhost:5173
- **Features**:
  - ✅ Corsi di formazione
  - ✅ Medicina del lavoro
  - ✅ RSPP
  - ❌ Poliambulatorio

### 🟢 Element Medica (Port 5174)
- **Brand**: element-medica
- **Focus**: Poliambulatorio con Medicina del Lavoro PRIMARIA
- **URL Dev**: http://localhost:5174
- **Features**:
  - ✅ Medicina del lavoro (servizio principale)
  - ✅ Poliambulatorio
  - ✅ Specialità mediche
  - ❌ Corsi di formazione

## Architettura

```
┌─────────────────────────────────────┐
│   Shared Backend (Port 4001/4003)   │
│   - Brand Detection Middleware      │
│   - Multi-Tenant Database           │
│   - CMS Multi-Brand API             │
└─────────────────────────────────────┘
              ↑           ↑
              │           │
    X-Frontend-Id:        X-Frontend-Id:
    element-formazione    element-medica
              │           │
┌─────────────┴───────────┴─────────────┐
│         Public Frontends               │
│  ┌──────────────┬──────────────┐     │
│  │   Element    │   Element    │     │
│  │  Formazione  │    Medica    │     │
│  │ (Port 5173)  │ (Port 5174)  │     │
│  └──────────────┴──────────────┘     │
└────────────────────────────────────────┘
```

## Come Funziona

### 1. Environment Variables
Ogni frontend carica il proprio file `.env`:
- **Formazione**: `.env.element-formazione`
- **Medica**: `.env.element-medica`

Variabili chiave:
```bash
VITE_BRAND_ID=element-formazione        # o element-medica
VITE_TENANT_ID=tenant-id-formazione     # o tenant-id-medica
VITE_PORT=5173                          # o 5174
```

### 2. Brand Detection
Il frontend inietta automaticamente l'header `X-Frontend-Id` in tutte le richieste API:

```typescript
// src/services/api.ts
const brandId = import.meta.env.VITE_BRAND_ID || 'element-formazione';
config.headers['X-Frontend-Id'] = brandId;
```

### 3. Backend Middleware
Il backend rileva il brand dall'header e filtra i dati:

```javascript
// backend/middleware/brandDetection.js
const brandId = req.headers['x-frontend-id'];
req.brandConfig = BRAND_CONFIGS[brandId];
req.brandTenantId = req.brandConfig.tenantId;
```

### 4. CMS Multi-Brand
Il CMS gestisce pagine separate per ogni brand:
- `/api/cms/brands/:brandId/pages` - Pagine per brand specifico
- Frontend carica automaticamente le pagine del suo brand
- Stesso CMS admin per entrambi i brand

## Comandi di Sviluppo

### Avvio Singolo Frontend

```bash
# Solo Element Formazione (5173)
npm run dev:formazione

# Solo Element Medica (5174)
npm run dev:medica
```

### Avvio Entrambi i Frontend

```bash
# Con npm
npm run dev:both

# Con script bash
./start-multi-frontend.sh
```

### Build Production

```bash
# Build singolo brand
npm run build:formazione  # → dist/element-formazione/
npm run build:medica      # → dist/element-medica/

# Build entrambi
npm run build:both
```

### Preview Production Build

```bash
npm run preview:formazione  # localhost:4173
npm run preview:medica      # localhost:4174
```

## Testing Multi-Brand

### 1. Verifica Backend Attivo
```bash
curl http://localhost:4001/api/health
```

### 2. Avvia Entrambi i Frontend
```bash
npm run dev:both
```

### 3. Testa Brand Detection

**Element Formazione (5173)**:
```bash
# Apri browser su http://localhost:5173
# Controlla console per:
# 🔧 [VITE] Loading config for mode: element-formazione
# 📄 [VITE] Using env file: .env.element-formazione
```

**Element Medica (5174)**:
```bash
# Apri browser su http://localhost:5174
# Controlla console per:
# 🔧 [VITE] Loading config for mode: element-medica
# 📄 [VITE] Using env file: .env.element-medica
```

### 4. Verifica Pagine CMS Diverse

Ogni brand deve mostrare pagine diverse dal CMS:
- **Formazione**: Homepage con focus formazione + medicina
- **Medica**: Homepage con focus poliambulatorio + medicina

### 5. Verifica Header API

Apri DevTools → Network → Seleziona una chiamata API:

```
Request Headers:
  X-Frontend-Id: element-formazione    (o element-medica)
  X-Tenant-ID: tenant-id-formazione    (o tenant-id-medica)
```

## Struttura File

```
project/
├── .env.element-formazione     # Config Element Formazione
├── .env.element-medica         # Config Element Medica
├── .env.example                # Template
├── src/
│   ├── config/
│   │   └── brands.config.ts    # Configurazione brand
│   ├── hooks/
│   │   └── useBrandConfig.ts   # Hook per accedere brand config
│   ├── services/
│   │   └── api.ts              # Inietta X-Frontend-Id header
│   └── pages/
│       └── public/
│           └── CMSPage.tsx     # Carica pagine dal CMS
├── backend/
│   └── middleware/
│       └── brandDetection.js   # Detect brand da header
└── package.json                # Script multi-brand
```

## Deployment Production

### Nginx Configuration

**Element Formazione** (elementformazione.it):
```nginx
server {
  server_name elementformazione.it;
  
  location /api/ {
    proxy_pass http://localhost:4001;
    proxy_set_header X-Frontend-Id element-formazione;
  }
  
  location / {
    root /var/www/element-formazione;
    try_files $uri /index.html;
  }
}
```

**Element Medica** (elementmedica.it):
```nginx
server {
  server_name elementmedica.it;
  
  location /api/ {
    proxy_pass http://localhost:4001;
    proxy_set_header X-Frontend-Id element-medica;
  }
  
  location / {
    root /var/www/element-medica;
    try_files $uri /index.html;
  }
}
```

### Environment Setup Production

```bash
# Build con env corretto
npm run build:formazione
npm run build:medica

# Deploy su server
scp -r dist/element-formazione/* user@server:/var/www/element-formazione/
scp -r dist/element-medica/* user@server:/var/www/element-medica/
```

## Troubleshooting

### Problema: Entrambi i frontend mostrano stesso contenuto

**Causa**: Header X-Frontend-Id non iniettato correttamente

**Soluzione**:
1. Verifica `.env.element-formazione` e `.env.element-medica` esistano
2. Controlla console per log Vite: `Loading config for mode: ...`
3. Ispeziona Network → Headers per vedere `X-Frontend-Id`

### Problema: Porta 5173 o 5174 già in uso

**Soluzione**:
```bash
# Trova processo
lsof -ti:5173
lsof -ti:5174

# Killa processo
kill -9 <PID>
```

### Problema: Backend non risponde

**Soluzione**:
```bash
# Verifica backend attivo
lsof -ti:4001,4003

# Restart backend
cd backend && npm start
```

### Problema: CMS mostra pagine sbagliate

**Causa**: Tenant ID non corretto nel database

**Soluzione**:
1. Verifica tenant esistano:
   ```sql
   SELECT * FROM tenants WHERE id IN ('tenant-id-formazione', 'tenant-id-medica');
   ```
2. Verifica pagine abbiano tenant corretto:
   ```sql
   SELECT id, slug, tenant_id FROM cms_pages;
   ```

## Features Prossime

- [ ] Multi-language support per brand
- [ ] Brand-specific analytics
- [ ] A/B testing per brand
- [ ] Dynamic theme switching
- [ ] Brand-specific email templates

## Supporto

Per domande o problemi:
- Consulta `docs/technical/MULTI_FRONTEND_DEPLOYMENT.md`
- Consulta `docs/project/MULTI_FRONTEND_PROJECT_PLAN.md`
- Controlla log backend: `tail -f /tmp/backend.log`

---

**Last Updated**: 19 Novembre 2025  
**Version**: 1.0.0
