# 🏗️ Architettura Multi-Frontend

**Versione:** 1.0  
**Data:** 19 Novembre 2025  
**Progetto:** ElementMedica - Sistema Multi-Brand  

---

## 📋 Executive Summary

Questo documento descrive l'architettura per supportare **due frontend pubblici indipendenti** con domini diversi, condividendo:
- ✅ Stesso backend API (porte 4001, 4002, 4003)
- ✅ Stesso sistema di autenticazione
- ✅ Stesso database PostgreSQL
- ✅ Stessi componenti core riutilizzabili
- ❌ **Branding separato** (loghi, colori, contenuti)
- ❌ **Deployment separati** (domini diversi)

---

## 🎯 Obiettivi

### Funzionali
1. **Frontend 1 (ElementFormazione)**: Focus medicina del lavoro + corsi sicurezza
2. **Frontend 2 (Nome TBD)**: Secondo brand con identità visiva differente
3. Condivisione backend senza modifiche breaking
4. Gestione tenant-based per contenuti specifici
5. Zero downtime durante deployment

### Non-Funzionali
- Performance: Bundle < 250KB per frontend
- Accessibilità: WCAG 2.1 AA compliance
- SEO: Score Lighthouse > 90
- Sicurezza: Nessun bypass, GDPR compliant
- Manutenibilità: 80% componenti condivisi

---

## 🏛️ Opzioni Architetturali

### Opzione 1: Monorepo con Build Condizionali ⭐ CONSIGLIATA

**Struttura:**
```
project-2.0/
├── frontend/
│   ├── apps/
│   │   ├── brand-a/          # ElementFormazione
│   │   │   ├── src/
│   │   │   │   ├── config/
│   │   │   │   │   └── brand.config.ts
│   │   │   │   ├── assets/
│   │   │   │   │   ├── logo.svg
│   │   │   │   │   └── theme.css
│   │   │   │   └── main.tsx
│   │   │   ├── .env.brand-a
│   │   │   └── vite.config.brand-a.ts
│   │   └── brand-b/          # Secondo brand
│   │       ├── src/
│   │       ├── .env.brand-b
│   │       └── vite.config.brand-b.ts
│   ├── packages/
│   │   ├── shared-components/
│   │   │   ├── layouts/
│   │   │   ├── forms/
│   │   │   └── ui/
│   │   ├── shared-services/
│   │   ├── shared-types/
│   │   └── shared-utils/
│   └── package.json
├── backend/                   # Invariato
└── docs/
```

**Pro:**
- ✅ Condivisione codice massima (80%+)
- ✅ Single source of truth per logica business
- ✅ Refactoring centralizzato
- ✅ TypeScript types condivisi
- ✅ Un solo node_modules (risparmio spazio)

**Contro:**
- ⚠️ Setup iniziale più complesso
- ⚠️ Build separati necessari
- ⚠️ Gestione env vars più articolata

**Implementazione:**
```typescript
// frontend/packages/shared-components/layouts/PublicLayout.tsx
import { useBrandConfig } from '@shared/hooks/useBrandConfig';

export const PublicLayout = ({ children }) => {
  const brand = useBrandConfig();
  
  return (
    <div className={brand.theme}>
      <Header logo={brand.logo} primaryColor={brand.colors.primary} />
      {children}
      <Footer contacts={brand.contacts} />
    </div>
  );
};

// frontend/apps/brand-a/src/config/brand.config.ts
export const brandConfig = {
  name: 'ElementFormazione',
  logo: '/assets/logo-element.svg',
  colors: {
    primary: '#2563eb',
    secondary: '#64748b',
    accent: '#0ea5e9',
    medical: '#06b6d4', // Celeste medicina
  },
  theme: 'theme-medical',
  features: {
    medicinaLavoro: true,
    corsi: true,
    rspp: true,
  },
  seo: {
    title: 'ElementFormazione - Medicina del Lavoro',
    description: '...',
  },
};
```

---

### Opzione 2: Repository Separati con Shared Package

**Struttura:**
```
element-frontend-a/          # Repo 1
├── src/
└── package.json (dependency: @element/shared)

element-frontend-b/          # Repo 2
├── src/
└── package.json (dependency: @element/shared)

element-shared/              # Repo 3 - NPM Package
├── components/
├── services/
└── package.json
```

**Pro:**
- ✅ Deployment indipendenti
- ✅ Team separati possibili
- ✅ Versioning granulare

**Contro:**
- ❌ Duplicazione codice (40%+)
- ❌ Sync manuale shared package
- ❌ Breaking changes complessi
- ❌ 3x node_modules (spreco spazio)

---

### Opzione 3: Micro-Frontend (Module Federation)

**Struttura:**
```
frontend-shell/              # Container
├── brand-a/                 # Remote app
└── brand-b/                 # Remote app
```

**Pro:**
- ✅ Runtime composition
- ✅ Deploy indipendenti componenti

**Contro:**
- ❌ Complessità elevata (Webpack 5 Module Federation)
- ❌ Overhead runtime
- ❌ Debug difficile
- ❌ Overkill per 2 frontend

---

## 🎨 Design System Multi-Brand

### Theming Strategy

**CSS Variables + Tailwind Plugin:**

```css
/* frontend/packages/shared-components/themes/medical.css */
[data-theme="medical"] {
  --color-primary-50: #ecfeff;
  --color-primary-500: #06b6d4;
  --color-primary-600: #0891b2;
  --color-primary-700: #0e7490;
  
  --color-accent-500: #10b981; /* Verde salute */
  --color-medical-blue: #06b6d4;
  --color-medical-green: #10b981;
}

[data-theme="corporate"] {
  --color-primary-500: #7c3aed;
  --color-primary-600: #6d28d9;
  /* ... */
}
```

```typescript
// tailwind.config.shared.js
export const sharedTailwindConfig = {
  theme: {
    extend: {
      colors: {
        primary: {
          50: 'var(--color-primary-50)',
          500: 'var(--color-primary-500)',
          // ...
        },
        medical: {
          blue: 'var(--color-medical-blue)',
          green: 'var(--color-medical-green)',
        },
      },
    },
  },
};
```

### Component Variants

```typescript
// frontend/packages/shared-components/HeroSection.tsx
interface HeroSectionProps {
  title: string;
  variant?: 'medical' | 'corporate' | 'default';
}

export const HeroSection = ({ variant = 'default' }) => {
  const variantClasses = {
    medical: 'bg-gradient-to-r from-medical-blue to-medical-green',
    corporate: 'bg-gradient-to-r from-primary-600 to-accent-600',
    default: 'bg-gradient-to-r from-primary-600 to-primary-800',
  };
  
  return (
    <section className={`${variantClasses[variant]} ...`}>
      {/* ... */}
    </section>
  );
};
```

---

## 🔧 Backend Multi-Frontend Support

### API Header-Based Brand Detection

```javascript
// backend/middleware/brandDetection.js
export const brandDetectionMiddleware = (req, res, next) => {
  const frontendId = req.headers['x-frontend-id'] || 'brand-a';
  const allowedBrands = ['brand-a', 'brand-b'];
  
  if (!allowedBrands.includes(frontendId)) {
    return res.status(400).json({ error: 'Invalid frontend ID' });
  }
  
  req.frontendId = frontendId;
  req.brandConfig = getBrandConfig(frontendId);
  next();
};

function getBrandConfig(frontendId) {
  return {
    'brand-a': {
      tenantId: process.env.BRAND_A_TENANT_ID,
      name: 'ElementFormazione',
      allowedFeatures: ['medicinaLavoro', 'corsi', 'rspp'],
    },
    'brand-b': {
      tenantId: process.env.BRAND_B_TENANT_ID,
      name: 'SecondBrand',
      allowedFeatures: ['corsi'],
    },
  }[frontendId];
}
```

### Tenant-Based Content Filtering

```javascript
// backend/controllers/publicContentController.js
export const getPublicCourses = async (req, res) => {
  const { frontendId, brandConfig } = req;
  
  const courses = await prisma.course.findMany({
    where: {
      tenantId: brandConfig.tenantId,
      isPublic: true,
      deletedAt: null,
      // Filtra per features abilitate per il brand
      ...(frontendId === 'brand-b' && {
        category: { not: 'MEDICINA_LAVORO' }
      }),
    },
  });
  
  res.json({ data: courses });
};
```

---

## 📦 Build & Deployment Strategy

### Multi-Build Configuration

```typescript
// frontend/vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => {
  const brand = process.env.VITE_BRAND || 'brand-a';
  
  return {
    root: `apps/${brand}`,
    build: {
      outDir: `../../dist/${brand}`,
      rollupOptions: {
        input: {
          main: `apps/${brand}/index.html`,
        },
      },
    },
    resolve: {
      alias: {
        '@shared': '../packages/shared-components',
        '@services': '../packages/shared-services',
      },
    },
  };
});
```

### NPM Scripts

```json
{
  "scripts": {
    "dev:brand-a": "VITE_BRAND=brand-a vite",
    "dev:brand-b": "VITE_BRAND=brand-b vite",
    "build:brand-a": "VITE_BRAND=brand-a vite build",
    "build:brand-b": "VITE_BRAND=brand-b vite build",
    "build:all": "npm run build:brand-a && npm run build:brand-b"
  }
}
```

### Hetzner Deployment

```nginx
# /etc/nginx/sites-available/element-multi-frontend

# Brand A - ElementFormazione
server {
    listen 443 ssl http2;
    server_name elementformazione.com www.elementformazione.com;
    
    ssl_certificate /etc/letsencrypt/live/elementformazione.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/elementformazione.com/privkey.pem;
    
    root /var/www/element-frontend-a/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
        add_header X-Frontend-Id "brand-a";
    }
    
    location /api/ {
        proxy_pass http://localhost:4003;
        proxy_set_header X-Frontend-Id "brand-a";
        proxy_set_header Host $host;
    }
}

# Brand B - SecondBrand
server {
    listen 443 ssl http2;
    server_name secondbrand.com www.secondbrand.com;
    
    ssl_certificate /etc/letsencrypt/live/secondbrand.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/secondbrand.com/privkey.pem;
    
    root /var/www/element-frontend-b/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
        add_header X-Frontend-Id "brand-b";
    }
    
    location /api/ {
        proxy_pass http://localhost:4003;
        proxy_set_header X-Frontend-Id "brand-b";
        proxy_set_header Host $host;
    }
}
```

### GitHub Actions CI/CD

```yaml
# .github/workflows/deploy-multi-frontend.yml
name: Deploy Multi-Frontend

on:
  push:
    branches: [main]
    paths:
      - 'frontend/**'

jobs:
  build-brand-a:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build:brand-a
      - name: Deploy to Hetzner Brand A
        uses: easingthemes/ssh-deploy@v2
        with:
          SSH_PRIVATE_KEY: ${{ secrets.SSH_KEY }}
          REMOTE_HOST: ${{ secrets.HETZNER_IP }}
          REMOTE_USER: deploy
          SOURCE: "dist/brand-a/"
          TARGET: "/var/www/element-frontend-a/dist"

  build-brand-b:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build:brand-b
      - name: Deploy to Hetzner Brand B
        uses: easingthemes/ssh-deploy@v2
        with:
          SSH_PRIVATE_KEY: ${{ secrets.SSH_KEY }}
          REMOTE_HOST: ${{ secrets.HETZNER_IP }}
          REMOTE_USER: deploy
          SOURCE: "dist/brand-b/"
          TARGET: "/var/www/element-frontend-b/dist"
```

---

## 🧪 Testing Strategy

### Shared Component Tests

```typescript
// frontend/packages/shared-components/__tests__/HeroSection.test.tsx
import { render } from '@testing-library/react';
import { HeroSection } from '../HeroSection';

describe('HeroSection - Multi-Brand', () => {
  it('renders medical variant correctly', () => {
    const { container } = render(
      <HeroSection variant="medical" title="Test" />
    );
    expect(container.firstChild).toHaveClass('bg-gradient-to-r from-medical-blue');
  });
  
  it('renders corporate variant correctly', () => {
    const { container } = render(
      <HeroSection variant="corporate" title="Test" />
    );
    expect(container.firstChild).toHaveClass('from-primary-600');
  });
});
```

### E2E Tests per Brand

```typescript
// frontend/e2e/brand-a.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Brand A - ElementFormazione', () => {
  test('homepage shows medical theme', async ({ page }) => {
    await page.goto('http://localhost:5173');
    const hero = page.locator('[data-testid="hero-section"]');
    await expect(hero).toHaveCSS('background', /medical-blue/);
  });
  
  test('medicina del lavoro page is accessible', async ({ page }) => {
    await page.goto('http://localhost:5173/medicina-del-lavoro');
    await expect(page.locator('h1')).toContainText('Medicina del Lavoro');
  });
});
```

---

## 📊 Migration Checklist

### Phase 1: Setup Monorepo ✅
- [ ] Creare struttura `frontend/apps/` e `frontend/packages/`
- [ ] Configurare workspace npm/yarn
- [ ] Migrare componenti pubblici in `shared-components`
- [ ] Configurare Vite multi-build
- [ ] Setup TypeScript path aliases

### Phase 2: Brand A Refactoring ✅
- [ ] Estrarre configurazione brand in `brand.config.ts`
- [ ] Implementare theming system con CSS variables
- [ ] Convertire componenti a usare `useBrandConfig()`
- [ ] Test componenti con variant props

### Phase 3: Backend Multi-Frontend ✅
- [ ] Aggiungere `brandDetectionMiddleware`
- [ ] Implementare tenant-based filtering
- [ ] Aggiornare API endpoints per supportare header `X-Frontend-Id`
- [ ] Test isolation tra brand

### Phase 4: Brand B Implementation ✅
- [ ] Creare `apps/brand-b/` con configurazione brand
- [ ] Personalizzare theme e assets
- [ ] Test locale sviluppo
- [ ] Configurare build separato

### Phase 5: Deployment ✅
- [ ] Setup nginx multi-domain su Hetzner
- [ ] Configurare SSL certificates (certbot)
- [ ] Deploy brand-a su dominio principale
- [ ] Deploy brand-b su secondo dominio
- [ ] Test cross-domain e CORS

### Phase 6: Monitoring & Optimization ✅
- [ ] Setup analytics separati per brand
- [ ] Monitorare performance bundle size
- [ ] A/B testing su design variants
- [ ] Documentazione per team

---

## 🔒 Security Considerations

1. **Tenant Isolation**: Verificare `tenantId` su OGNI query backend
2. **CORS Policy**: Configurare whitelist domini per entrambi i brand
3. **Rate Limiting**: Separare limiti per frontend ID
4. **API Keys**: Gestire chiavi separate per analytics/external services
5. **Content Security Policy**: Aggiornare per domini multipli

---

## 📈 Performance Targets

| Metrica | Target | Current |
|---------|--------|---------|
| Bundle Size Brand A | < 250KB | TBD |
| Bundle Size Brand B | < 250KB | TBD |
| Shared Components | < 150KB | TBD |
| First Contentful Paint | < 1.5s | TBD |
| Time to Interactive | < 3s | TBD |
| Lighthouse Score | > 90 | TBD |

---

## 🚀 Timeline Stimata

**Totale: 8-10 giorni lavorativi**

- Phase 1: Setup Monorepo (2 giorni)
- Phase 2: Brand A Refactoring (2 giorni)
- Phase 3: Backend Multi-Frontend (1 giorno)
- Phase 4: Brand B Implementation (2 giorni)
- Phase 5: Deployment (1 giorno)
- Phase 6: Testing & Optimization (2 giorni)

---

## 📚 References

- [Tailwind Multi-Theme](https://tailwindcss.com/docs/dark-mode#toggling-dark-mode-manually)
- [Vite Multi-Page App](https://vitejs.dev/guide/build.html#multi-page-app)
- [Nginx Virtual Hosts](https://www.nginx.com/resources/wiki/start/topics/examples/server_blocks/)
- [Module Federation](https://webpack.js.org/concepts/module-federation/)
