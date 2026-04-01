# 📋 Sintesi Stato di Fatto — ElementMedica

**Data**: 13 Marzo 2026  
**Scopo**: Verifica completa di cosa è FATTO vs cosa è DA FARE

---

## 1. CORE PLATFORM — ✅ COMPLETO

| Componente | Stato | Note |
|------------|:-----:|------|
| Multi-Tenant Architecture | ✅ | Isolamento completo via tenantId |
| Multi-Branch (MEDICA/FORMAZIONE) | ✅ | Feature flags per visibilità moduli |
| Person Multi-Tenant (P48/P63) | ✅ | Person globale + PersonTenantProfile per-tenant |
| Company Multi-Tenant (P49) | ✅ | Company globale + CompanyTenantProfile per-tenant |
| Cross-Tenant Import (P57/P59) | ✅ | DataShareConsent + hide-from-view pattern |
| RBAC (31 ruoli, gerarchia) | ✅ | requirePermission middleware, CustomRole |
| Feature Flags (P57) | ✅ | Per-tenant toggle di moduli |
| GDPR Compliance (P58) | ✅ | Soft delete, GdprAuditLog, deletionReason |
| JWT Authentication | ✅ | Access + Refresh token rotation (fixato S29) |
| Subscription Management (S20) | ✅ | 6 stati, grace period, cron giornaliero |
| Design System + Dark Mode (P60) | ✅ | Tailwind tokens, brand-aware colors |
| 2-Server Architecture (P64) | ✅ | API 4001 + Documents 4002, proxy eliminato |

---

## 2. BRANCH MEDICA — Stato per Modulo

### 2.1 Prestazioni & Tariffari ✅
| Feature | Stato |
|---------|:-----:|
| CRUD Prestazioni | ✅ |
| Tariffario con compensi medici (P44) | ✅ |
| Bundle / Offerte | ✅ |
| Price Calculator Widget | ✅ |
| Tariffari Aziendali M2M (P67) | ✅ |
| Listini + Sconti | ✅ |

### 2.2 Calendario & Appuntamenti ✅
| Feature | Stato |
|---------|:-----:|
| Calendario/Agenda | ✅ |
| CRUD Appuntamenti | ✅ |
| Slot Disponibilità | ✅ |
| Orari Ambulatorio + Ferie | ✅ |
| Accettazione Paziente (P54) | ✅ |
| Coda Pazienti WebSocket (P53) | ✅ |

### 2.3 Visite Cliniche ✅
| Feature | Stato |
|---------|:-----:|
| Sistema Visite (P52) | ✅ |
| Multi-Prestazione per visita (P55) | ✅ |
| Referti | ✅ |
| Allegati Visita | ✅ |
| Consenso + Firma (semplice/grafometrica) | ✅ |
| Template Visita (PERSONAL/GLOBAL/CATALOGO) | ✅ |
| Visit Template Logo Elements (S29) | ✅ |
| Tabella visite con filtri completi (S28) | ✅ |

### 2.4 Medicina del Lavoro (P56) ✅
| Feature | Stato |
|---------|:-----:|
| 28 rischi lavorativi | ✅ |
| 8 tipi di visita | ✅ |
| Protocolli Sanitari | ✅ |
| Mansioni aziendali | ✅ |
| Giudizi Idoneità (multi-mansione S33) | ✅ |
| Allegato 3A | ✅ |
| Allegato 3B base | ✅ |
| Scadenze MDL + programmazione visite | ✅ |
| Relazione Sanitaria Annuale | ✅ |
| Preventivi MDL automatici | ✅ |
| Consuntivo Azienda | ✅ |
| Invio PDF Idoneità (ZIP+password) | ✅ |
| Nomine Ruolo (RSPP, RLS, etc.) | ✅ |
| **Allegato 3B — Malattie Professionali** | ❌ Gap normativo |
| **Allegato 3B — PAT INAIL** | ❌ Gap normativo |
| **Allegato 3B — Dati Sanitari Aggregati avanzati** | ❌ Gap normativo |
| **Allegato 3B — Giudizi Idoneità per Rischio** | ❌ Gap normativo |
| **Questionari Medici (P61)** | 🔄 In sviluppo |

### 2.5 Fatturazione ✅
| Feature | Stato |
|---------|:-----:|
| Fatturazione Elettronica SDI (P97) | ✅ |
| Sistema TS (spese sanitarie) | ✅ |
| Preventivi | ✅ |
| Movimento Contabile ENTRATA automatico (S25) | ✅ |
| Dashboard Finanziaria (COSTI/RICAVI) | ✅ |

### 2.6 Strumenti Diagnostici ✅
| Feature | Stato |
|---------|:-----:|
| Bridge ECG/Spirometro/Audiometro | ✅ |
| Profilo di Salute Paziente | ✅ |
| Documenti Clinici per paziente (S21) | ✅ |

### 2.7 Firma Digitale 🔄
| Feature | Stato |
|---------|:-----:|
| Fase 1: Firma Semplice | ✅ |
| Fase 2: Firma Grafometrica + Vault | ✅ |
| **Fase 3: FEQ (Firma Elettronica Qualificata)** | ❌ Pianificata |
| **Fase 4: FSE 2.0 integration** | ❌ Pianificata |

---

## 3. BRANCH FORMAZIONE — Stato per Modulo

| Feature | Stato |
|---------|:-----:|
| Catalogo Corsi (12 tipologie D.Lgs 81/08) | ✅ |
| Edizioni + Sessioni | ✅ |
| Iscrizioni + Presenze (90% threshold) | ✅ |
| Attestati automatici (4 tipi) | ✅ |
| Registri Presenze | ✅ |
| Lettere Incarico + Compenso Formatori | ✅ |
| Movimento Contabile USCITA per compensi (S25) | ✅ |
| Credenziali (email + card stampabile) | ✅ |
| Corsi in Scadenza (expiring-courses) | ✅ |
| **E-Learning / SCORM** | ❌ Non implementato |
| **ECM Credits Tracking** | ❌ Non implementato |

---

## 4. MANAGEMENT — Stato per Modulo

| Feature | Stato |
|---------|:-----:|
| Dashboard Finanziaria | ✅ |
| HR Personnel Management (P68) | ✅ |
| Ruoli e Permessi refactor (P69) | ✅ |
| Tariffari Aziendali (P67) | ✅ |
| OT23 INAIL | ✅ |
| DVR | ✅ |
| Sopralluoghi | ✅ |
| Document Management (P74) | ✅ |
| Template Editor (slide + HTML) | ✅ |
| Alerts Summary per azienda (S21) | ✅ |
| Billing Summary per azienda (S21) | ✅ |
| **Integrazione Google Calendar** | ❌ Non implementato |

---

## 5. PUBLIC & CMS — Stato per Modulo

| Feature | Stato |
|---------|:-----:|
| CMS CRUD (pagine, media, SEO) | ✅ |
| CMSPageRenderer + 13 sezioni | ✅ |
| Analytics Tracking | ✅ |
| SEO Head (meta tags + JSON-LD) | ✅ |
| Sitemap + Robots multi-brand | ✅ |
| Public Courses List + Enrollment Widget | ✅ |
| Public Doctors API | ✅ |
| Public Booking Backend | ✅ |
| Public Booking Frontend | ✅ (PrenotaPage + BookingCalendarIsland + email conferma) |
| **Pre-Render Engine (SSG)** | ❌ Fase 2 non implementata |
| **Webhook Dispatcher** | ❌ Non implementato |
| **CDN Integration** | ❌ Non implementato |
| **Visual Page Builder** | ❌ Non implementato |

---

## 6. NOTIFICHE & COMUNICAZIONI ✅

| Feature | Stato |
|---------|:-----:|
| Email (Resend) | ✅ |
| SMS | ✅ |
| WhatsApp Business | ✅ |
| Web Push (VAPID) | ✅ |
| In-App WebSocket | ✅ |
| PEC | ✅ |
| Calendar ICS Subscription | ✅ |
| Notification Rules Engine | ✅ |
| Escalation Engine | ✅ |
| Analytics Dashboard | ✅ |
| Credential Email + Card | ✅ |
| Referto via Mail (P71) | ✅ |

---

## 7. SICUREZZA & INFRASTRUTTURA

| Feature | Stato | Note |
|---------|:-----:|------|
| RBAC con requirePermission | ✅ | 31 ruoli |
| CSRF Protection (POST pubblici) | ✅ | |
| Rate Limiting | ✅ | Auth 5/15min, Forms 5/5min, API 100/min |
| Helmet.js + CSP | ✅ | |
| CORS centralizzato | ✅ | Fixato S24 |
| Path Traversal guard (uploads) | ✅ | Fixato S27 |
| Upload auth per file clinici | ✅ | Fixato S23 |
| Winston structured logging | ✅ | PII sanitizzata |
| DOMPurify (XSS) | ✅ | |
| Subscription checks | ✅ | Real-time + cron |
| **Row Level Security (RLS)** | ❌ | Pianificato |
| **SSO Google enterprise** | ❌ | Pianificato |
| **Env validation startup completa** | ⚠️ | Solo JWT, manca DATABASE_URL etc. |

---

## 8. TEST & QUALITY

| Metrica | Valore | Target |
|---------|:------:|:------:|
| TypeScript Errors | 0 | 0 |
| Backend JS Syntax Errors | 0 | 0 |
| Build Status | ✅ Passing | Passing |
| Test Coverage | 75% | 85% (target) |
| Security Tests | 28/28 | 28/28 |
| Tenant Isolation Tests | 7/7 | 7/7 |
| **E2E Tests (Playwright)** | ❌ | Da implementare |
| **Test Coverage 85%+** | ❌ | Da raggiungere |

---

## 9. PROGETTI PER STATO

### ✅ Completati (37)

**Foundation**: P42, P43, P44, P45, P46, P47, P48, P49  
**Features**: P51, P52, P53, P54, P55, P56, P57, P58  
**Sprint P59**: 4 sub-project (MovimentoContabile, ContoFinanziario, ContoAnalisi, DataMigration)  
**System**: P60, P63, P64, P65, P67, P68, P69, P70, P71, P74, P97  
**Revisioni**: R20, R21, R22, R23, R24, R25, R26, R27, R28, R29, R30, R31, R32

### 🔄 In Corso (5)

| Progetto | Descrizione | Fase |
|----------|-------------|------|
| P61 | Questionari Medici | In sviluppo |
| P66 | MDL Visit Workflow Optimization | In corso |
| P72 | Schema Clinico Consolidation | Fase 2/4 |
| P75 | Public API & Embed System | In sviluppo |
| R33 | Comprehensive Webapp Audit | Session 34 |

### ❌ Non Avviati / Pianificati

| Feature | Descrizione | Priorità |
|---------|-------------|:--------:|
| Allegato 3B gaps | Malattie professionali, PAT INAIL | 🔴 |
| Public Booking Frontend | ✅ Completato (S35 — email conferma aggiunta) | ✅ |
| Firma Digitale Fase 3-4 | FEQ + FSE 2.0 | 🟡 |
| Pre-Render Engine SSG | Puppeteer SSG per CMS | 🟡 |
| Google Calendar Sync | Integrazione bidirezionale | 🟡 |
| E-Learning / SCORM | Platform e-learning | 🟢 |
| ECM Credits | Tracking crediti formativi | 🟢 |
| RLS (Database) | Row Level Security | 🟢 |
| SSO Google | Enterprise Single Sign-On | 🟢 |
| Test Coverage 85%+ | Da 75% a 85% | 🟢 |
| E2E Test Suite | Playwright/Cypress | 🟢 |
| CDN Integration | Cloudflare + cache purge | 🟢 |

---

## 10. RIEPILOGO PERCENTUALI

| Area | Completamento |
|------|:-------------:|
| Core Platform | **100%** |
| Branch MEDICA | **96%** (gap: questionari, firma avanzata) |
| Branch FORMAZIONE | **95%** (gap: e-learning, ECM) |
| Management | **97%** (gap: Google Calendar) |
| Public & CMS | **80%** (gap: SSG, CDN, visual builder) |
| Notifiche | **100%** |
| Sicurezza | **95%** (gap: RLS, SSO, env validation) |
| Testing | **75%** (gap: E2E, coverage 85%) |
| **GLOBALE** | **~94%** |

---

*Documento aggiornato: 13 Marzo 2026 — Sessione 35 R33*
