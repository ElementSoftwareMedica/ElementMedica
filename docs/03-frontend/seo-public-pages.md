# 🔍 SEO & Pagine Pubbliche

**Data**: 10 Marzo 2026

---

## Architettura SEO

### Componente SEOHead

```tsx
import SEOHead from '@/components/seo/SEOHead';

<SEOHead
  title="Titolo Pagina | Brand"
  description="Descrizione per meta tag"
  keywords="keyword1, keyword2"
  canonicalUrl="https://www.elementmedica.com/pagina"
  ogType="website"
  structuredData={jsonLdObject}
  noindex={false}     // true per pagine private (consenso, tablet, etc.)
  nofollow={false}
/>
```

Utilizza `react-helmet-async` per iniettare meta tags nel `<head>`.

### Structured Data (JSON-LD)

Generatori disponibili in `src/components/seo/MedicalSchemas.ts`:

| Funzione | Schema.org Type | Usato in |
|----------|----------------|----------|
| `generateMedicalClinicSchema()` | MedicalClinic | PrenotaPage |
| `generateParentOrganizationSchema()` | Organization | GruppoServiziPage |
| Schema Course inline | Course | CourseDetailPage |
| Schema ItemList inline | ItemList | UnifiedCourseDetailPage |

### Pagine con SEO configurato

| Pagina | SEO | Structured Data | noindex |
|--------|-----|-----------------|---------|
| PrenotaPage | ✅ | MedicalClinic | No |
| CourseDetailPage | ✅ | Course | No |
| UnifiedCourseDetailPage | ✅ | ItemList | No |
| GruppoServiziPage | ✅ | Organization | No |
| ConsensoFirmaPage | ✅ | — | **Sì** |
| TabletFirmaPage | ✅ | — | **Sì** |
| VerifyAttestato | ✅ | — | **Sì** |
| CMSPage | ✅ | Dinamico da CMS | No |
| HomePage | ✅ | Da CMS | No |

### noindex / nofollow

Pagine con token nell'URL o contenuti privati devono avere:
```tsx
<SEOHead title="..." noindex={true} nofollow={true} />
```

Esempi: firma consenso (`?t=...`), tablet firma, verifica attestato.

---

## Sitemap Dinamico

Il sitemap viene generato dinamicamente da `sitemapService.js` e include:

1. **Pagine CMS** — dal modello `CMSPage` (publishedAt not null)
2. **Corsi** — dal modello `Course` (status PUBLISHED)
3. **Profili medici** — persone con ruolo MEDICO e slot `visibilePubblico: true`
4. **Pagine statiche** — `/prenota`, `/medici`, `/corsi`, `/gruppo-servizi`

### Brand Detection

Il sistema riconosce il brand dal dominio (`X-Frontend-Id` header):
- `element-sicurezza` → `https://www.elementsicurezza.com`
- `element-medica` → `https://www.elementmedica.com`

### Rigenerazione

```bash
# Trigger via API (autenticato)
POST /api/v1/cms/sitemap/regenerate
```

Viene anche rigenerato automaticamente quando:
- Una pagina CMS viene pubblicata/aggiornata
- Un corso viene pubblicato

---

## Analytics Pubbliche

### Tracking (Frontend)

```tsx
// Esempio tracciamento pagina pubblica
fetch('/api/public/analytics/track', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    path: window.location.pathname,
    pageType: 'course_detail',
    sessionId: getOrCreateSessionId(),
    duration: timeOnPage
  })
});
```

### Tipi di pagina tracciabili

`homepage`, `course`, `course-detail`, `course-unified`, `doctor`, `doctor-detail`, `booking`, `schedule`, `service`, `group-services`, `contact`, `form`, `legal`, `other`

### Dashboard Analytics

Accessibile da admin con permesso `cms:read`:
- `GET /api/v1/analytics/public/overview` — metriche aggregate
- `GET /api/v1/analytics/public/pages` — top pagine

---

## Brand System

| Brand | Dominio | Tailwind |
|-------|---------|----------|
| ElementMedica | elementmedica.com | `bg-teal-600` |
| ElementSicurezza | elementsicurezza.com | `bg-blue-600` |

Le pagine pubbliche usano `getCurrentBrand()` per determinare colori, logo, e contenuti brand-specific.

I meta tag del `<head>` in `index.html` vengono iniettati da Vite tramite il plugin `brand-html-transform` usando placeholder `%KEY%` (senza spazi).
