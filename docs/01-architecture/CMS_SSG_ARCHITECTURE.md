# CMS Architecture - Static Site Generation Ibrida

**Versione**: 1.1.0  
**Data**: 13 Marzo 2026  
**Progetto**: CMS SSG Hybrid Architecture

> **Nota**: Fase 1 (CMS CRUD + rendering) è completa. Fase 2 (Pre-Render SSG Engine) e successive NON sono ancora implementate — questo documento descrive l'architettura target.

---

## 1. Panoramica Architetturale

### Filosofia: "Static First, Dynamic Where Needed"

Il sistema adotta una strategia ibrida:
- **Pagine di contenuto** (Chi Siamo, Blog, Corsi, Profili Medici): pre-renderizzate a **build time** come HTML statico per SEO perfetto e caricamento istantaneo
- **Dati in tempo reale** (Calendari, Disponibilità, Form, Login): caricati via API dinamiche come "isole interattive" dentro pagine statiche
- **Rigenerazione incrementale**: quando il CMS salva una modifica, solo la pagina interessata viene rigenerata tramite webhook — nessun deploy totale

### Diagramma Architetturale

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        ADMIN CMS (Privato)                              │
│  Dashboard → Editor Pagine → Media Library → SEO Config → Analytics    │
│  Port: 5173/5174 (route /management/cms)                                │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │ CRUD Operations
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        API SERVER (Port 4001)                           │
│  Express + Prisma + RBAC + GDPR                                         │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐                   │
│  │ CMS Routes  │  │ Booking API  │  │ Contact API  │                   │
│  │ /api/v1/cms │  │ /api/public/ │  │ /api/v1/     │                   │
│  └──────┬──────┘  └──────────────┘  └──────────────┘                   │
│         │                                                                │
│         ▼                                                                │
│  ┌──────────────────────────────────────────────┐                       │
│  │ WEBHOOK DISPATCHER (on publish/unpublish)    │                       │
│  │ → Emits DomainEvent: 'cms.page.published'    │                       │
│  │ → Triggers pre-render for changed slug only  │                       │
│  │ → Purges CDN cache for affected URLs         │                       │
│  └──────┬───────────────────────────────────────┘                       │
│         │                                                                │
└─────────┼────────────────────────────────────────────────────────────────┘
          │ HTTP Webhook / Process Signal
          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                   PRE-RENDER SERVICE                                     │
│  Puppeteer-based SSG Engine                                              │
│  ┌─────────────────────────────────────────────────────────┐            │
│  │ 1. Receives webhook: { slug, tenantId, action }        │            │
│  │ 2. Launches headless browser                            │            │
│  │ 3. Navigates to SPA page (localhost:5173/slug)          │            │
│  │ 4. Waits for React hydration + API data load            │            │
│  │ 5. Extracts full HTML with meta tags                    │            │
│  │ 6. Saves to /prerendered/{brand}/{slug}.html            │            │
│  │ 7. Generates sitemap.xml                                │            │
│  │ 8. Purges CDN cache for the URL                         │            │
│  └─────────────────────────────────────────────────────────┘            │
└─────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        NGINX (Reverse Proxy + CDN Edge)                 │
│                                                                          │
│  Request Flow:                                                           │
│                                                                          │
│  1. Bot/Crawler detected (User-Agent check)?                            │
│     → YES: Serve /prerendered/{brand}/{slug}.html (static, fast)        │
│     → NO:  Continue to step 2                                            │
│                                                                          │
│  2. Pre-rendered file exists for this URL?                               │
│     → YES: Serve pre-rendered HTML (fast first paint, React hydrates)   │
│     → NO:  Serve SPA shell (index.html) — client-side rendering         │
│                                                                          │
│  3. /api/* requests → Proxy to API Server (4001)                        │
│  4. Static assets → Serve with 1y cache + immutable                     │
│                                                                          │
│  Domains:                                                                │
│  ├── www.elementsicurezza.com (element-sicurezza brand)                 │
│  └── www.elementmedica.com (element-medica brand)                       │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Strategia Ibrida: Statico vs Dinamico

### Pagine Statiche (SSG — pre-renderizzate)

| Pagina | Slug | Dati | Frequenza Aggiornamento |
|--------|------|------|------------------------|
| Homepage | `homepage` / `medica-homepage` | CMS JSON | Settimanale |
| Chi Siamo | `chi-siamo` / `medica-chi-siamo` | CMS JSON | Mensile |
| Servizi | `servizi` | CMS JSON | Mensile |
| Medicina del Lavoro | `medicina-del-lavoro` | CMS JSON | Mensile |
| RSPP | `rspp` | CMS JSON | Mensile |
| Diagnostica | `medica-diagnostica` | CMS JSON | Mensile |
| Visite Specialistiche | `medica-visite-specialistiche` | CMS JSON | Mensile |
| Corsi (lista) | `corsi` | CMS JSON + DB corsi | Settimanale |
| Profili Medici | `medica-chi-siamo` | CMS JSON + DB medici | Settimanale |
| Contatti | `contatti` / `medica-contatti` | CMS JSON | Raro |
| Privacy/Cookie/Termini | `privacy-policy`, `cookie-policy`, `termini` | CMS JSON | Raro |
| Lavora con noi | `lavora-con-noi` | CMS JSON | Mensile |

**Caratteristiche Statiche**:
- HTML completo servito immediatamente (TTFB ~50ms)
- Meta tags SEO, Open Graph, JSON-LD già nel markup
- React si "hydrata" (attach event listeners) dopo il primo paint
- Cached aggressivamente dalla CDN (Cache-Control: public, s-maxage=86400)

### Componenti Dinamici (API Real-Time)

| Componente | Tipo | API | Pattern |
|-----------|------|-----|---------|
| Widget Calendario Medico | Island | `GET /api/public/booking/slots` | Lazy-loaded, polling 60s |
| Form Contatto | Island | `POST /api/v1/contact-submissions` | CSRF protected |
| Login/Area Riservata | SPA | `POST /api/v1/auth/login` | Full SPA route |
| Disponibilità Corsi | Island | `GET /api/public/booking/prestazioni` | Stale-while-revalidate |
| Analytics Tracking | Fire & Forget | `POST /api/v1/cms/analytics/track` | sendBeacon |
| Consent Banner | Island | Locale | Cookie-based |

### Pattern "Island Architecture"

```tsx
// Pagina statica del medico con "isola" dinamica del calendario
const MedicoPage = ({ staticData }) => (
  <PublicLayout>
    {/* STATICO — pre-renderizzato */}
    <SEOHead {...staticData.seo} />
    <HeroSection {...staticData.hero} />
    <MedicoProfile {...staticData.profile} />  {/* foto, bio, specialità */}
    
    {/* DINAMICO — caricato client-side */}
    <Suspense fallback={<CalendarSkeleton />}>
      <BookingCalendarIsland medicoId={staticData.profile.id} />
    </Suspense>
  </PublicLayout>
);

// L'isola carica dati in tempo reale
const BookingCalendarIsland = ({ medicoId }) => {
  const { data: slots } = useQuery({
    queryKey: ['booking-slots', medicoId],
    queryFn: () => fetchPublicSlots({ medicoId }),
    refetchInterval: 60_000, // Refresh ogni 60 secondi
    staleTime: 30_000,
  });
  // ... render calendario con slot reali
};
```

---

## 3. Sistema di Webhooks (Content Change Notification)

### Flusso Completo

```
Admin pubblica pagina nel CMS
       │
       ▼
cmsService.publishPage(id, tenantId)
       │
       ▼
DomainEvent creato: {
  type: 'cms.page.published',
  aggregateType: 'CMSPage',
  aggregateId: pageId,
  payload: { slug, tenantId, title }
}
       │
       ▼
WebhookDispatcher processa evento:
  1. Identifica brand da tenantId
  2. Chiama Pre-Render Service: POST /prerender
     body: { slug, brand, action: 'publish' }
  3. Aggiorna sitemap.xml
  4. Opzionale: purge CDN cache
       │
       ▼
Pre-Render Service:
  1. Lancia Puppeteer su http://localhost:{port}/{slug}
  2. Attende: document.querySelector('[data-cms-loaded]')
  3. Salva HTML → /prerendered/{brand}/{slug}.html
  4. Invia meta in risposta: { title, description, size, renderTime }
       │
       ▼
Nginx serve il nuovo HTML statico
```

### API Webhook Interne

| Endpoint | Metodo | Body | Trigger |
|----------|--------|------|---------|
| `POST /api/v1/cms/prerender` | Internal | `{ slug, brand, action }` | Publish/Unpublish |
| `POST /api/v1/cms/prerender/all` | Internal | `{ brand }` | Full rebuild |
| `GET /api/v1/cms/prerender/status` | Admin | — | Check render status |
| `DELETE /api/v1/cms/prerender/:slug` | Admin | — | Remove pre-rendered page |

### Chiavi API Protette

```
# Le chiavi API del backend sono protette:
# 1. PRERENDER_SECRET: shared secret tra API e Pre-Render Service
# 2. Mai esposto al frontend pubblico
# 3. Validato con middleware requirePrerenderSecret
# 4. Rate limited: max 10 renders/minuto
```

---

## 4. Gestione Booking dei Medici

### Schema Logico: Pagina Statica + Widget Dinamico

```
┌──────────────────────────────────────────────────────────┐
│                PAGINA MEDICO (Statica/SSG)                │
│                                                           │
│  ┌─────────────────────────────────────────────────┐     │
│  │ SEO Head                                         │     │
│  │ <title>Dott. Rossi Mario - Cardiologo</title>   │     │
│  │ <meta name="description" content="..." />        │     │
│  │ JSON-LD: Physician schema                        │     │
│  └─────────────────────────────────────────────────┘     │
│                                                           │
│  ┌─────────────────────────────────────────────────┐     │
│  │ Hero: Foto medico + nome + specialità           │     │
│  │ Bio: Curriculum, formazione, pubblicazioni       │     │
│  │ Specialità: Lista prestazioni offerte            │     │
│  │ → Tutto PRE-RENDERIZZATO (veloce, SEO-friendly) │     │
│  └─────────────────────────────────────────────────┘     │
│                                                           │
│  ┌─────────────────────────────────────────────────┐     │
│  │ BOOKING WIDGET (Island — Dynamic)                │     │
│  │                                                   │     │
│  │ ┌─────────┐  ┌─────────┐  ┌─────────┐          │     │
│  │ │ Mon 17  │  │ Tue 18  │  │ Wed 19  │  ←─ API  │     │
│  │ │ ✅ 09:00│  │ ✅ 10:00│  │ ❌ Full │   query  │     │
│  │ │ ✅ 10:30│  │ ✅ 14:00│  │         │          │     │
│  │ │ ❌ 11:00│  │ ✅ 15:30│  │         │          │     │
│  │ └─────────┘  └─────────┘  └─────────┘          │     │
│  │                                                   │     │
│  │ API: GET /api/public/booking/slots               │     │
│  │   ?medicoId={id}&from={date}&to={date}           │     │
│  │                                                   │     │
│  │ Refresh: ogni 60 secondi                          │     │
│  │ Skeleton: durante caricamento                     │     │
│  │ Fallback: "Chiama per prenotare" con telefono    │     │
│  └─────────────────────────────────────────────────┘     │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

### Sequenza di Interazione

```
1. Utente apre /medici/dott-rossi-mario
2. Nginx serve /prerendered/element-medica/medici/dott-rossi-mario.html
3. Browser mostra IMMEDIATAMENTE: foto, nome, bio (HTML statico)
4. React si hydrata (~200ms)
5. BookingCalendarIsland si monta
6. Fetches GET /api/public/booking/slots?medicoId=xxx&from=2026-02-17
7. Mostra slot disponibili reali
8. Utente clicca uno slot → mostra form prenotazione (modal)
9. POST /api/public/booking/create con dati paziente
10. Conferma + email automatica
```

---

## 5. Sicurezza e Scalabilità

### Protezione API Keys

| Livello | Meccanismo | Dettaglio |
|---------|-----------|-----------|
| Frontend → API | Proxy Nginx | Frontend non conosce l'IP del backend |
| API Keys | Env vars server-side | Mai nel bundle JS del client |
| Pre-render Secret | `PRERENDER_SECRET` | Header `X-Prerender-Secret` su webhook |
| CSRF | Token per forms | `csrfProtection` middleware su POST pubblici |
| Rate Limiting | Per endpoint | Auth: 5/15min, Forms: 5/5min, Prerender: 10/min |
| Cors | Per dominio | Solo *.elementsicurezza.com e *.elementmedica.com |

### CDN Readiness

```
# Headers per pagine pre-renderizzate
Cache-Control: public, s-maxage=86400, stale-while-revalidate=3600
Vary: Accept-Encoding
X-Prerender: true
X-Prerender-Date: 2026-02-17T10:30:00Z

# Purge strategy
# Dopo publish webhook:
# 1. Rigenera HTML
# 2. Invia purge request a CDN: PURGE /chi-siamo
# 3. CDN serve nuova versione alla prossima richiesta
```

### Multi-Domain Architecture

```
                    ┌─── www.elementsicurezza.com ──┐
                    │   Built: VITE_BRAND_ID=       │
Internet ───────────│   element-sicurezza            │──── API Server
                    │   Prerendered: /prerendered/   │     (Port 4001)
                    │   element-sicurezza/            │     Shared DB
                    └──────────────────────────────────┘
                    
                    ┌─── www.elementmedica.com ──────┐
                    │   Built: VITE_BRAND_ID=        │
Internet ───────────│   element-medica               │──── Same API  
                    │   Prerendered: /prerendered/   │     Server
                    │   element-medica/               │     (4001)
                    └──────────────────────────────────┘
```

---

## 6. Struttura Cartelle

```
project/
├── backend/
│   ├── services/
│   │   ├── cmsService.js           # CMS CRUD + webhook trigger
│   │   ├── prerenderService.js     # NEW: Puppeteer pre-render engine
│   │   ├── webhookDispatcher.js    # NEW: Event → webhook routing
│   │   ├── seoService.js           # SEO config CRUD
│   │   └── sitemapService.js       # Sitemap generation
│   ├── routes/
│   │   ├── cms-routes.js           # CMS API + webhook endpoints
│   │   ├── cms-prerender-routes.js # NEW: Pre-render management
│   │   ├── public-booking-routes.js
│   │   └── sitemap-routes.js
│   ├── middleware/
│   │   ├── publicContentMiddleware.js
│   │   └── prerenderAuth.js        # NEW: Webhook secret validation
│   └── prisma/
│       └── schema.prisma           # DomainEvent model already exists
│
├── src/                             # React SPA (Vite)
│   ├── components/
│   │   ├── cms/
│   │   │   ├── CMSPageRenderer.tsx  # Main renderer
│   │   │   ├── CMSSectionRenderer.tsx
│   │   │   └── renderer/           # Section components (13 files)
│   │   ├── public/
│   │   │   ├── PublicLayout.tsx
│   │   │   ├── HeroSection.tsx
│   │   │   └── BookingCalendarIsland.tsx  # NEW: Dynamic booking widget
│   │   └── seo/
│   │       ├── SEOHead.tsx          # Meta tags + JSON-LD
│   │       └── MedicalSchemas.tsx   # NEW: Medical JSON-LD generators
│   ├── hooks/
│   │   └── cms/
│   │       └── useCMSPages.ts      # React Query hooks
│   ├── config/
│   │   └── brands.config.ts        # Multi-brand configuration
│   └── pages/
│       └── public/
│           ├── CMSPage.tsx          # CMS page router
│           └── HomePage.elementMedica.tsx
│
├── prerendered/                     # NEW: Generated static HTML
│   ├── element-sicurezza/
│   │   ├── homepage.html
│   │   ├── medicina-del-lavoro.html
│   │   ├── corsi.html
│   │   ├── chi-siamo.html
│   │   ├── contatti.html
│   │   └── sitemap.xml
│   └── element-medica/
│       ├── medica-homepage.html
│       ├── medica-medicina-del-lavoro.html
│       ├── medica-diagnostica.html
│       ├── medica-chi-siamo.html
│       ├── medica-prenota.html
│       ├── medica-contatti.html
│       └── sitemap.xml
│
├── scripts/
│   └── prerender-pages.js          # NEW: Build-time full pre-render
│
├── nginx/
│   ├── production.conf             # Updated: pre-render serving rules
│   └── prerender.conf              # NEW: Include for prerender logic
│
└── docs/
    └── 01-architecture/
        └── CMS_SSG_ARCHITECTURE.md # Questo documento
```

---

## 7. Roadmap Tecnica

### Fase 1: Foundation (Settimana 1-2) ✅ Completa
- [x] CMS CRUD completo (pagine, media, SEO)
- [x] Public content rendering (CMSPageRenderer)
- [x] Analytics tracking (page views)
- [x] Brand-aware color tokens (semantic tokens)
- [x] Font system (Space Grotesk + Montserrat)
- [x] **Medical JSON-LD schemas** (MedicalClinic, Physician) — Session 79
- [ ] **DomainEvent integration** nel CMS publish flow

### Fase 2: Pre-Render Engine (Settimana 3-4)
- [ ] `prerenderService.js` — Puppeteer SSG engine
- [ ] `webhookDispatcher.js` — Event routing
- [ ] `cms-prerender-routes.js` — Admin management API
- [ ] `prerender-pages.js` — Build-time full render script
- [ ] Nginx config update per serving pagine pre-renderizzate
- [ ] `prerenderAuth.js` middleware per webhook security

### Fase 3: Booking & Enrollment Widgets (Settimana 5-6) ✅ Parziale
- [x] `BookingCalendarIsland.tsx` — Componente isola dinamico (lazy-loaded via LiveBookingSection)
- [x] `POST /api/public/booking/create` — Endpoint creazione prenotazione
- [x] `GET /api/public/doctors` + `GET /api/public/doctors/:id` — Public doctors API
- [x] `POST /api/public/courses/enroll` — Endpoint iscrizione corsi
- [x] `CourseEnrollmentWidget.tsx` — Modal iscrizione corsi con form completo
- [x] Prisma models `PublicBookingRequest` + `PublicCourseEnrollment`
- [ ] Email notification on booking (NotificationQueue)
- [ ] Patient registration flow
- [ ] Calendar ICS integration pubblica

### Fase 4: CDN & Performance (Settimana 7-8)
- [ ] Cloudflare integration (DNS + CDN)
- [ ] Cache purge API on publish webhook
- [ ] Brotli compression in Nginx
- [ ] HTTP/3 support
- [ ] Image optimization pipeline (WebP, AVIF)
- [ ] Core Web Vitals monitoring

### Fase 5: Advanced CMS (Settimana 9-10)
- [ ] Visual page builder (drag & drop blocks)
- [ ] Content scheduling worker (cron per scheduledAt)
- [ ] Page versioning e rollback
- [ ] A/B testing framework
- [ ] Multi-language support (hreflang)

---

## 8. Schema JSON-LD per SEO Medico

### Schemas Necessari

```json
// MedicalClinic (per Element Medica)
{
  "@context": "https://schema.org",
  "@type": "MedicalClinic",
  "name": "Element Medica",
  "description": "Poliambulatorio specializzato...",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "Via Bracciano 34",
    "addressLocality": "Selvazzano Dentro",
    "postalCode": "35030",
    "addressRegion": "PD",
    "addressCountry": "IT"
  },
  "telephone": "+39 351 318 1574",
  "url": "https://www.elementmedica.com",
  "medicalSpecialty": ["Medicina del Lavoro", "Cardiologia", "Ortopedia"]
}

// Physician (per ogni medico)
{
  "@context": "https://schema.org",
  "@type": "Physician",
  "name": "Dott. Rossi Mario",
  "medicalSpecialty": "Cardiologia",
  "worksAt": { "@type": "MedicalClinic", "name": "Element Medica" },
  "availableService": {
    "@type": "MedicalProcedure",
    "name": "Visita Cardiologica"
  }
}

// EducationalOrganization (per Element Sicurezza)
{
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  "name": "Element Sicurezza",
  "description": "Formazione sulla sicurezza...",
  "address": { ... },
  "telephone": "+39 351 623 9176"
}
```

---

## 9. Considerazioni Multi-Brand

### Build Separati

Ogni brand richiede un build Vite separato:

```bash
# Element Sicurezza (porta 5173 dev / www.elementsicurezza.com prod)
VITE_BRAND_ID=element-sicurezza npm run build
# Output: dist/element-sicurezza/

# Element Medica (porta 5174 dev / www.elementmedica.com prod)
VITE_BRAND_ID=element-medica npm run build  
# Output: dist/element-medica/
```

### Pre-render per Brand

```bash
# Pre-render tutte le pagine di Element Sicurezza
node scripts/prerender-pages.js --brand=element-sicurezza --port=5173

# Pre-render tutte le pagine di Element Medica
node scripts/prerender-pages.js --brand=element-medica --port=5174
```

### Nginx Multi-Domain

```nginx
# Element Sicurezza
server {
    server_name elementsicurezza.com www.elementsicurezza.com;
    root /usr/share/nginx/html/element-sicurezza;
    include /etc/nginx/conf.d/prerender.conf;
    # ...
}

# Element Medica
server {
    server_name elementmedica.com www.elementmedica.com;
    root /usr/share/nginx/html/element-medica;
    include /etc/nginx/conf.d/prerender.conf;
    # ...
}
```
