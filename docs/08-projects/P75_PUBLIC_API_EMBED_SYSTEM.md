# P75 — Public API & Embed System

**Data**: 10 Marzo 2026  
**Stato**: 🟢 In sviluppo  
**Priorità**: Alta  

---

## 📋 Obiettivo

Creare un sistema API pubblico con:
1. **API Keys per tenant** — chiavi sicure per autorizzare widget embed su siti esterni
2. **Endpoint embed** — endpoint `/api/public/embed/:apiKey/...` che servono dati per widget
3. **Script JS embed** — snippet `<script>` da incollare su qualsiasi sito (sito clienti, WordPress, etc.)
4. **Gestione in Management** — UI per creare/revocare chiavi e generare codice embed
5. **Deployment-ready** — CORS per origini esterne, variabili ambiente, guida per Element SRL

---

## 🏗️ Architettura

```
Sito Cliente (HTML qualsiasi)
    <script src="https://api.elementmedica.com/api/public/embed/pk_live_xxx/script.js">
    <div data-element-widget="booking">
    
    ↓ Il widget JS chiama:
    
API Server (porta 4001)
    GET /api/public/embed/:apiKey/config    → config tenant + widget abilitati
    GET /api/public/embed/:apiKey/booking   → slot disponibili
    GET /api/public/embed/:apiKey/courses   → corsi
    POST /api/public/embed/:apiKey/contact  → submit form contatti
    GET /api/public/embed/:apiKey/script.js → file JS widget (stesso script con config)
    
    ↓ Autenticazione: API Key nel path + CORS allowedOrigins per tenant

Management (admin backoffice)
    /management/api-pubbliche
    - Crea/revoca API keys
    - Configura origini CORS permesse
    - Seleziona widget abilitati
    - Genera codice embed da copiare
```

---

## 📂 Fasi di Adattamento Frontend Pubblico

### Fase 1 — Analisi e pulizia (✅ Completata, sessione precedente)
- Analizzato frontend pubblico: 16 pagine, tutte attive
- Eliminati 3 file legacy: `HomePage.elementMedica.tsx`, `WorkWithUsPage.tsx`, `WorkWithUsPage.stories.tsx`
- Corretti API endpoint (`CourseDetailPage`: `/api/v1/courses/slug/` → `/api/public/courses/`)

### Fase 2 — SEO e meta tag (✅ Completata, sessione precedente)
- Aggiunto `SEOHead` con structured data JSON-LD a 4 pagine (MedicalClinic, Course, ItemList, Organization)
- Aggiunto `noindex` a pagine private (consenso, tablet, verifica attestato)
- Nuova documentazione: `docs/03-frontend/seo-public-pages.md`

### Fase 3 — Analytics pubbliche (✅ Completata, sessione precedente)
- Modello `PublicPageView` in Prisma
- Route `POST /api/public/analytics/track` (rate limited, no auth)
- Dashboard analytics autenticata (`GET /api/v1/analytics/public/overview`)

### Fase 4 — Sitemap dinamico (✅ Completata, sessione precedente)
- Sitemap brand-aware con tenant resolution
- Include: CMS pages, corsi, profili medici (con slot pubblici), pagine statiche
- URL corsi: `/corsi/:slug` (non `/courses/:slug`)

### Fase 5 — API Keys & Embed System (🔄 Questa fase - P75)

**Obiettivo**: Permettere a tenant come Element SRL di integrare prenotazioni, corsi e form di contatto su siti web esterni senza esposizione di credenziali sensibili.

**Componenti**:
- Modello `PublicApiKey` in Prisma (chiavi per tenant)  
- Routes `/api/v1/management/api-keys` (CRUD protetto)
- Routes `/api/public/embed/:apiKey/*` (endpoint pubblici per widget)
- Script JS embed (`/api/public/embed/:apiKey/script.js`)
- Pagina management `PublicApiSettingsPage`

### Fase 6 — SEO avanzato e CMS completo (⬜ Futura)
- Pre-render Puppeteer per pagine CMS
- Ottimizzazione Core Web Vitals
- Structured data per medici e servizi

---

## 🔑 API Keys

### Struttura chiave
```
pk_live_<32 byte random hex>
```

### Modello Prisma — `PublicApiKey`
```prisma
model PublicApiKey {
  id             String    @id @default(uuid())
  tenantId       String
  name           String    @db.VarChar(100)   // "Widget Sito Element SRL"
  key            String    @unique             // pk_live_abc123...
  allowedOrigins String[]                     // ["https://www.elementsrl.it"]
  enabledWidgets String[]                     // ["booking", "courses", "contact", "doctors"]
  isActive       Boolean   @default(true)
  lastUsedAt     DateTime?
  usageCount     Int       @default(0)
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  deletedAt      DateTime?
  tenant         Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  @@map("public_api_keys")
}
```

---

## 🔌 Endpoint Embed

### Config
```
GET /api/public/embed/:apiKey/config
Response: { tenantName, brandColor, enabledWidgets, logo }
```

### Booking Widget
```
GET /api/public/embed/:apiKey/booking?date=2026-03-15&specialtyId=...
Response: { slots: [{ id, date, time, doctor, specialty, available }] }
POST /api/public/embed/:apiKey/booking
Body: { slotId, patientName, patientEmail, patientPhone, notes }
```

### Courses Widget
```
GET /api/public/embed/:apiKey/courses?category=sicurezza
Response: { courses: [{ id, title, slug, date, price, seats }] }
```

### Contact Form
```
GET /api/public/embed/:apiKey/contact/schema
Response: { fields: [...], submitUrl: "/api/public/embed/:apiKey/contact" }
POST /api/public/embed/:apiKey/contact
Body: { name, email, phone, message, serviceType }
```

### Script JS (embed snippet per siti esterni)
```
GET /api/public/embed/:apiKey/script.js
Content-Type: application/javascript
Response: Vanilla JS con config baked-in
```

---

## 📄 Codice Embed per Siti Esterni

### Booking (prenotazione online)
```html
<!-- Widget prenotazione - Element Medica -->
<div data-element-widget="booking" data-theme="teal"></div>
<script src="https://api.elementmedica.com/api/public/embed/pk_live_YOUR_KEY/script.js" defer></script>
```

### Corsi formazione
```html
<!-- Widget corsi - Element Sicurezza -->
<div data-element-widget="courses" data-category="sicurezza"></div>
<script src="https://api.elementsicurezza.com/api/public/embed/pk_live_YOUR_KEY/script.js" defer></script>
```

### Form contatti
```html
<!-- Form contatti embed -->
<div data-element-widget="contact" data-service="preventivo"></div>
<script src="https://api.elementmedica.com/api/public/embed/pk_live_YOUR_KEY/script.js" defer></script>
```

---

## 🏢 Element SRL — Integrazione (Tenant specifico)

**Prerequisiti**:
1. Tenant Element SRL deve esistere nel DB (`slug: "element-srl"` o altro)
2. Il management admin di Element SRL crea una API key dalla pagina gestione
3. Aggiunge l'origine del proprio sito web agli allowed origins (es. `https://www.elementmedica.com`)
4. Seleziona i widget da abilitare (`booking`, `contact` per clinica; `courses` per formazione)
5. Copia il codice embed generato automaticamente

**Per l'integrazione immediata nel frontend pubblico** (dato che il frontend serve già Element Medica e Element Sicurezza tramite brand system), la chiave API viene usata per consentire embedding su siti ESTERNI. Il frontend interno già accede alle API normalmente.

---

## ⚙️ Configurazione Deploy

### Variabili ambiente aggiuntive

```env
# CORS per embed widgets (origini esterne che possono chiamare /api/public/embed/*)
ALLOWED_EMBED_ORIGINS=https://www.elementmedica.com,https://www.example.com

# Dominio API (usato nel codice embed generato dalla UI)
API_PUBLIC_URL=https://api.elementmedica.com

# Rate limit aggiuntivo per embed (req/min per IP)
EMBED_RATE_LIMIT=60
```

### Nginx — nessuna modifica necessaria
I CORS per embed sono gestiti a livello applicativo in Express, non in Nginx.  
Nginx già fa `proxy_pass` all'API server per tutti i path.

### CORS embed — logica speciale
Per `/api/public/embed/:apiKey/*`:
1. Validare API key dal path
2. Leggere `allowedOrigins` dal DB per quella chiave
3. Permettere richiesta solo se `Origin` header è in `allowedOrigins` (o se `allowedOrigins` è vuoto = permetti tutto, per sviluppo)

### PM2 — nessuna modifica necessaria
Il codice gira nello stesso processo `api-server.js` già gestito da PM2.

---

## 🧪 Test

### Test API Key
```bash
# Crea chiave (admin autenticato)
curl -X POST http://localhost:4001/api/v1/management/api-keys \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Widget","allowedOrigins":["http://localhost:8080"],"enabledWidgets":["booking","courses","contact"]}'

# Leggi config con chiave
curl http://localhost:4001/api/public/embed/pk_live_xxx/config \
  -H "Origin: http://localhost:8080"

# Scarica script embed
curl http://localhost:4001/api/public/embed/pk_live_xxx/script.js
```

### Test embed su pagina HTML locale
```html
<!DOCTYPE html>
<html>
<body>
  <h1>Test Widget</h1>
  <div data-element-widget="courses"></div>
  <script src="http://localhost:4001/api/public/embed/pk_live_xxx/script.js" defer></script>
</body>
</html>
```
Apri con `python3 -m http.server 8080` e verifica che il widget carica i corsi.

---

## 📊 Checklist

- [x] Project document P75 creato
- [x] Modello `PublicApiKey` in schema.prisma
- [x] Migration DB applicata
- [x] Route management `/api/v1/management/api-keys`
- [x] Route embed `/api/public/embed/:apiKey/*`
- [x] Script JS embed (`/script.js`)
- [x] Pagina management `PublicApiSettingsPage`
- [x] Route registrata in ManagementRouter
- [x] Import + mount in api-server.js
- [x] Whitelist tenant middleware
- [x] CORS per embed origins
- [ ] Test su sito HTML esterno locale
- [ ] Documentazione integration guide per Element SRL
