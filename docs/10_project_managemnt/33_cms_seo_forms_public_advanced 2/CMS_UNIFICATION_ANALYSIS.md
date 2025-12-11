# Analisi e Piano di Lavoro: Unificazione CMS

## 📊 ANALISI SITUAZIONE ATTUALE

### Problema Identificato
Attualmente esistono **DUE SISTEMI CMS SEPARATI E NON CORRELATI**:

#### 1️⃣ **PublicCMSPage** (`/cms` - ex `/settings/cms`)
- **Tipo**: Form con sezioni fisse hardcoded
- **Struttura**: JSON con campi predefiniti per 5 pagine
- **Pagine gestite**:
  - `homepage` - Hero, servizi, about (con campi fissi)
  - `services` - Hero, descrizione, whyChoose
  - `contacts` - Hero, indirizzo, telefono, email, orari
  - `careers` - Hero, benefits
  - `company` - Hero, mission, vision, values

**LIMITAZIONI**:
- ❌ Campi fissi non modificabili
- ❌ Non gestisce tutte le pagine pubbliche esistenti
- ❌ Contenuti salvati in formato JSON custom nel localStorage/API
- ❌ NON connesso alle pagine reali del frontend

#### 2️⃣ **CMSManager** (`/cms/pages` - ex `/settings/cms-pages`)
- **Tipo**: Gestore dinamico di pagine CMS
- **Struttura**: Database `cms_pages` con campi:
  - `slug` (identificatore univoco)
  - `title`
  - `content` (JSONB flessibile)
  - `layout` (full-width/boxed)
  - `seoTitle`, `seoDescription`
  - `status`, `isPublished`
- **10 Pagine nel DB**:
  1. homepage
  2. careers
  3. company
  4. contacts
  5. medicina-lavoro
  6. rspp
  7. services
  8. corsi ✨
  9. termini ✨
  10. privacy ✨
  11. cookie ✨

**LIMITAZIONI**:
- ❌ Le pagine pubbliche NON leggono dal database CMS
- ❌ I contenuti nel DB NON sono utilizzati dal frontend
- ❌ Sistema scollegato dalle pagine reali

### 🔍 Pagine Frontend Pubbliche Reali (14 pagine)

```
src/pages/public/
├── HomePage.tsx              ✅ CMS DB + Hardcoded
├── CoursesPage.tsx           ✅ CMS DB + Dinamico (da API corsi)
├── ServicesPage.tsx          ✅ CMS DB + Hardcoded
├── ContactsPage.tsx          ✅ CMS DB + Hardcoded
├── CareersPage.tsx           ✅ CMS DB + Hardcoded
├── RsppPage.tsx              ✅ CMS DB + Hardcoded
├── MedicinaDelLavoroPage.tsx ✅ CMS DB + Hardcoded
├── PrivacyPage.tsx           ✅ CMS DB + Hardcoded
├── TerminiPage.tsx           ✅ CMS DB + Hardcoded
├── CookiePage.tsx            ✅ CMS DB + Hardcoded
├── WorkWithUsPage.tsx        ⚠️  Duplicato di CareersPage?
├── CourseDetailPage.tsx      🚫 Dinamico (non CMS)
├── UnifiedCourseDetailPage.tsx 🚫 Dinamico (non CMS)
└── PublicFormPage.tsx        🚫 Dinamico (non CMS)
```

**CONTENUTI ATTUALI**:
- ✅ = Dovrebbe essere gestito da CMS (10 pagine)
- 🚫 = Pagine dinamiche da escludere dal CMS (3 pagine)

### 🎯 PROBLEMI CRITICI

1. **DISCONNESSIONE TOTALE**
   - Le pagine pubbliche hanno testi hardcoded nel codice
   - Il database CMS contiene dati mai utilizzati
   - PublicCMSPage gestisce dati diversi dal DB

2. **DUPLICAZIONE**
   - `/cms` e `/cms/pages` sono sostanzialmente la stessa cosa
   - PublicCMSPage dovrebbe essere integrato in CMSManager

3. **MANCANZA DI INTEGRAZIONE**
   - Nessuna pagina pubblica legge da `cms_pages` table
   - Non esiste un hook `useCMSContent(slug)` per recuperare i dati
   - I componenti pubblici non sono "CMS-aware"

4. **SCHEMA CONTENT INCONSISTENTE**
   ```json
   // Nel DB: struttura variabile per pagina
   {
     "heroTitle": "...",
     "heroSubtitle": "...",
     // OPPURE
     "hero": { "title": "...", "subtitle": "..." }
   }
   ```

---

## 🎯 SOLUZIONE PROPOSTA

### FASE 1: Unificazione UI (2-3 ore)

#### 1.1 Eliminare PublicCMSPage
- ❌ Rimuovere `/src/pages/settings/PublicCMSPage.tsx` (754 righe obsolete)
- ❌ Rimuovere route `/cms` da App.tsx
- ✅ Mantenere solo CMSManager come unico gestore

#### 1.2 Potenziare CMSManager
- ✅ Aggiungere editor visuale per `content` JSON
- ✅ Preview in tempo reale della pagina
- ✅ Gestione immagini con MediaLibrary integrata
- ✅ Sezioni predefinite per tipo di pagina (hero, features, cta, ecc.)

### FASE 2: Standardizzazione Schema (3-4 ore)

#### 2.1 Definire Schema Uniforme per `content` JSON

```typescript
// Schema standard per tutte le pagine CMS
interface CMSPageContent {
  hero?: {
    title: string;
    subtitle?: string;
    description?: string;
    image?: string;
    ctaPrimary?: { text: string; href: string; };
    ctaSecondary?: { text: string; href: string; };
  };
  sections?: Array<{
    id: string;
    type: 'text' | 'features' | 'cards' | 'stats' | 'testimonials' | 'cta' | 'faq';
    title?: string;
    subtitle?: string;
    content: any; // Tipo specifico per ogni section
  }>;
  seo?: {
    keywords?: string[];
    ogImage?: string;
  };
  metadata?: {
    showContactForm?: boolean;
    layout?: 'full-width' | 'boxed';
    theme?: 'light' | 'dark';
  };
}
```

#### 2.2 Migration Script per Aggiornare DB
- Convertire tutte le 10 pagine CMS esistenti al nuovo schema
- Estrarre contenuti hardcoded dalle pagine pubbliche
- Popolare `content` JSON con i dati attuali

### FASE 3: Integrazione Frontend (4-5 ore)

#### 3.1 Creare Hook `useCMSPage(slug)`

```typescript
// hooks/cms/useCMSPage.ts
export function useCMSPage(slug: string) {
  const { data, isLoading, error } = useQuery(
    ['cms-page', slug],
    () => cmsPagesService.getBySlug(slug)
  );
  
  return {
    page: data,
    content: data?.content as CMSPageContent,
    isLoading,
    error
  };
}
```

#### 3.2 Creare Componente `CMSPageRenderer`

```typescript
// components/cms/CMSPageRenderer.tsx
export function CMSPageRenderer({ slug }: { slug: string }) {
  const { content, isLoading } = useCMSPage(slug);
  
  if (isLoading) return <LoadingFallback />;
  
  return (
    <PublicLayout>
      {content.hero && <HeroSection {...content.hero} />}
      {content.sections?.map(section => (
        <SectionRenderer key={section.id} section={section} />
      ))}
    </PublicLayout>
  );
}
```

#### 3.3 Aggiornare Pagine Pubbliche

**PRIMA (HomePage.tsx - 302 righe hardcoded)**:
```tsx
export const HomePage: React.FC = () => {
  const services = [ /* hardcoded data */ ];
  const stats = [ /* hardcoded data */ ];
  
  return (
    <PublicLayout>
      <HeroSection title="Sicurezza sul Lavoro" /* ... */ />
      {/* Tutto hardcoded */}
    </PublicLayout>
  );
};
```

**DOPO (HomePage.tsx - 20 righe CMS-powered)**:
```tsx
export const HomePage: React.FC = () => {
  const { content, isLoading } = useCMSPage('homepage');
  
  if (isLoading) return <LoadingFallback />;
  
  return <CMSPageRenderer slug="homepage" />;
};
```

### FASE 4: Backend API Enhancement (2 ore)

#### 4.1 Endpoint per Preview
```typescript
// GET /api/cms/pages/:slug/preview
// Restituisce HTML renderizzato o JSON completo per preview in CMSManager
```

#### 4.2 Endpoint per Template
```typescript
// GET /api/cms/templates/:type
// Restituisce template JSON predefiniti per tipo pagina (homepage, service, contact, ecc.)
```

### FASE 5: Testing & Migration (3 ore)

#### 5.1 Checklist Migrazione per Pagina
- [ ] Estrarre contenuti hardcoded
- [ ] Convertire a schema CMSPageContent
- [ ] Inserire nel database
- [ ] Aggiornare componente React per usare useCMSPage
- [ ] Verificare SEO metadata
- [ ] Test rendering
- [ ] Test edit da CMSManager

#### 5.2 Pagine da Migrare (10 pagine)
1. ✅ homepage
2. ✅ services
3. ✅ contacts
4. ✅ careers
5. ✅ rspp
6. ✅ medicina-lavoro
7. ✅ corsi
8. ✅ termini
9. ✅ privacy
10. ✅ cookie

---

## 📋 PIANO DI LAVORO DETTAGLIATO

### SPRINT 1: Fondamenta (Giorno 1 - 6 ore)

#### Task 1.1: Definire Schema TypeScript
**File**: `src/types/cms.ts`
- [ ] Creare interfaccia `CMSPageContent`
- [ ] Creare interfaccia `CMSSection` con union types
- [ ] Creare type guards per validazione
- [ ] Documentare ogni campo con JSDoc

**Tempo**: 1 ora

#### Task 1.2: Creare Hook useCMSPage
**File**: `src/hooks/cms/useCMSPage.ts`
- [ ] Implementare fetch da API
- [ ] Aggiungere caching con React Query
- [ ] Gestione errori
- [ ] Loading states

**Tempo**: 1 ora

#### Task 1.3: Creare CMSPageRenderer
**File**: `src/components/cms/CMSPageRenderer.tsx`
- [ ] Componente base per rendering hero
- [ ] Factory per sections dinamiche
- [ ] Gestione layout full-width/boxed
- [ ] Fallback per contenuti mancanti

**Tempo**: 2 ore

#### Task 1.4: Aggiornare CMSPageEditor
**File**: `src/pages/settings/CMSPageEditor.tsx`
- [ ] Aggiungere JSON editor per `content`
- [ ] Validazione schema in tempo reale
- [ ] Preview iframe della pagina
- [ ] Suggerimenti auto-complete per campi

**Tempo**: 2 ore

---

### SPRINT 2: Migration Script (Giorno 2 - 4 ore)

#### Task 2.1: Script Estrazione Contenuti
**File**: `backend/scripts/extract-public-page-content.js`
- [ ] Parser per ogni file pagina pubblica
- [ ] Estrazione testi, titoli, descrizioni
- [ ] Output JSON strutturato per pagina
- [ ] Validazione schema

**Tempo**: 2 ore

#### Task 2.2: Migration Database
**File**: `backend/migrations/update-cms-pages-content.js`
- [ ] Backup dati esistenti
- [ ] Update di tutte le 10 pagine cms_pages
- [ ] Conversione al nuovo schema
- [ ] Verifica integrità dati

**Tempo**: 1 ora

#### Task 2.3: Seed Immagini
**File**: `backend/scripts/seed-cms-images.js`
- [ ] Upload immagini hero per ogni pagina
- [ ] Associazione a cms_media table
- [ ] Update riferimenti in content JSON

**Tempo**: 1 ora

---

### SPRINT 3: Integrazione Frontend (Giorno 3 - 6 ore)

#### Task 3.1: Aggiornare HomePage
**File**: `src/pages/public/HomePage.tsx`
- [ ] Sostituire hardcoded content con useCMSPage
- [ ] Mantenere componenti esistenti (HeroSection, ServiceCard)
- [ ] Test rendering
- [ ] Verify SEO metadata

**Tempo**: 1 ora

#### Task 3.2: Aggiornare ServicesPage
**File**: `src/pages/public/ServicesPage.tsx`
- [ ] Usare CMSPageRenderer
- [ ] Mantenere ServiceCard component
- [ ] Test

**Tempo**: 45 min

#### Task 3.3: Aggiornare ContactsPage
**File**: `src/pages/public/ContactsPage.tsx`
- [ ] Integrare useCMSPage
- [ ] Mantenere ContactForm component
- [ ] Test

**Tempo**: 45 min

#### Task 3.4: Aggiornare RsppPage
**File**: `src/pages/public/RsppPage.tsx`
- [ ] CMS integration
- [ ] Test

**Tempo**: 30 min

#### Task 3.5: Aggiornare MedicinaDelLavoroPage
**File**: `src/pages/public/MedicinaDelLavoroPage.tsx`
- [ ] CMS integration
- [ ] Test

**Tempo**: 30 min

#### Task 3.6: Aggiornare CareersPage
**File**: `src/pages/public/CareersPage.tsx`
- [ ] CMS integration (solo hero/intro)
- [ ] Mantenere job listings dinamici
- [ ] Test

**Tempo**: 45 min

#### Task 3.7: Aggiornare CoursesPage
**File**: `src/pages/public/CoursesPage.tsx`
- [ ] CMS integration per hero/intro
- [ ] Mantenere lista corsi da API
- [ ] Test

**Tempo**: 45 min

#### Task 3.8: Aggiornare Pagine Legali
**Files**: 
- `src/pages/public/TerminiPage.tsx`
- `src/pages/public/PrivacyPage.tsx`
- `src/pages/public/CookiePage.tsx`

- [ ] Usare CMSPageRenderer completo
- [ ] Layout boxed
- [ ] Test

**Tempo**: 1 ora

---

### SPRINT 4: UI/UX Improvements (Giorno 4 - 4 ore)

#### Task 4.1: Eliminare PublicCMSPage
- [ ] Rimuovere file `src/pages/settings/PublicCMSPage.tsx`
- [ ] Rimuovere route `/cms` da App.tsx
- [ ] Update Sidebar.tsx (rimuovere "Contenuti Sito")
- [ ] Mantenere solo "Gestione Pagine" e "Media Library"

**Tempo**: 30 min

#### Task 4.2: Migliorare CMSManager UI
- [ ] Aggiungere filtro per tipo pagina (homepage, service, legal, ecc.)
- [ ] Card preview con screenshot
- [ ] Quick edit per titoli SEO
- [ ] Bulk actions (publish/unpublish multiple)

**Tempo**: 2 ore

#### Task 4.3: Visual Content Editor
- [ ] Rich text editor per testi lunghi
- [ ] Image picker integrato con MediaLibrary
- [ ] Drag & drop per sections
- [ ] Template selector

**Tempo**: 1.5 ore

---

### SPRINT 5: Testing & Documentation (Giorno 5 - 4 ore)

#### Task 5.1: Test E2E
- [ ] Test login admin → edit homepage → publish
- [ ] Verificare frontend pubblico aggiornato
- [ ] Test permessi (editor can edit, viewer can view)
- [ ] Test responsive mobile

**Tempo**: 2 ore

#### Task 5.2: Documentazione
- [ ] README per CMSPageContent schema
- [ ] Guide admin "Come modificare homepage"
- [ ] API documentation per /cms endpoints
- [ ] Changelog e migration guide

**Tempo**: 1 ora

#### Task 5.3: Performance Optimization
- [ ] Caching CMS pages con Redis (opzionale)
- [ ] Prefetch critical pages
- [ ] Image optimization
- [ ] Lazy load sections

**Tempo**: 1 ora

---

## 🎯 RISULTATO FINALE

### Prima dell'unificazione:
```
/cms (PublicCMSPage - 754 righe)
  ├── Form con 5 pagine hardcoded
  └── Contenuti non utilizzati

/cms/pages (CMSManager - 421 righe)
  ├── 10 pagine nel database
  └── Contenuti mai renderizzati

Frontend Pubblico
  ├── 10 pagine con testi hardcoded
  └── Zero integrazione CMS
```

### Dopo l'unificazione:
```
/cms/pages (CMSManager Unificato)
  ├── Editor visuale per tutte le pagine
  ├── Preview in tempo reale
  ├── Schema uniforme CMSPageContent
  └── 10 pagine completamente gestibili

Frontend Pubblico
  ├── useCMSPage(slug) per ogni pagina
  ├── Rendering dinamico da database
  ├── Modifiche immediate da CMS
  └── SEO automatico da metadata
```

---

## ⚠️ RISCHI E MITIGAZIONI

### Rischio 1: Breaking Changes
**Mitigazione**: 
- Feature flag per nuova implementazione
- Rollback plan con backup DB
- Deploy graduale (1 pagina alla volta)

### Rischio 2: Performance Degradation
**Mitigazione**:
- Caching aggressivo
- Static generation per pagine pubbliche
- CDN per immagini

### Rischio 3: Schema Migration Errors
**Mitigazione**:
- Validation strict prima di save
- Rollback automatico su errori
- Backup pre-migration

---

## 📊 METRICHE DI SUCCESSO

- ✅ 100% pagine pubbliche gestibili da CMS
- ✅ 0 contenuti hardcoded nelle pagine
- ✅ 1 solo gestore CMS (non 2)
- ✅ < 2 secondi tempo di caricamento pagine
- ✅ Schema uniforme per tutte le pagine
- ✅ Preview funzionante al 100%
- ✅ Zero downtime durante migration

---

## 🚀 PROSSIMI PASSI

1. **Approvazione Piano**: Review con team (30 min)
2. **Setup Environment**: Backup DB + feature flag (30 min)
3. **Start Sprint 1**: Implementazione schema e hook (6 ore)
4. **Daily Standup**: Progress review ogni giorno
5. **Go Live**: Deploy incrementale pagina per pagina

---

**Stima Totale**: 5 giorni (24 ore effettive)
**Priorità**: 🔴 ALTA - Blocca altri sviluppi CMS
**Complessità**: 🟡 MEDIA - Refactoring sostanziale ma ben definito

