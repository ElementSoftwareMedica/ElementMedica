# 📋 Feature Backlog

**Data**: 13 Marzo 2026  
**Ultimo Aggiornamento**: R33 Session 34 — Documentation Audit

---

## 📊 Riepilogo

| Priorità | Feature Rimanenti | Effort Stimato |
|----------|-------------------|----------------|
| 🔴 Alta | 2 | 1-2 settimane |
| 🟡 Media | 5 | 3-4 settimane |
| 🟢 Bassa | 5 | 2-3 settimane |

> Per lo stato di fatto completo (FATTO vs DA FARE) →  [SYNTHESIS-STATUS.md](./00-overview/SYNTHESIS-STATUS.md)

---

## 🔴 Priorità Alta

| Feature | Descrizione | Contesto |
|---------|-------------|----------|
| **Allegato 3B — Malattie Professionali** | Campo obbligatorio nel tracciato XML ministeriale | Gap normativo documentato in `docs/04-features/allegato-3b-normativa-gaps.md` |
| **Allegato 3B — PAT INAIL** | Posizione Assicurativa Territoriale su Company | Gap normativo |

---

## 🟡 Priorità Media

| Feature | Descrizione | Backend | Frontend |
|---------|-------------|:-------:|:--------:|
| **Public Booking Frontend** | Widget prenotazione pubblica per pazienti | ✅ | ❌ 5 TODO |
| **Firma Digitale Fase 3** | FEQ (Firma Elettronica Qualificata) | ❌ | ❌ |
| **Firma Digitale Fase 4** | Integrazione FSE 2.0 | ❌ | ❌ |
| **Pre-Render SSG Engine** | Puppeteer pre-rendering pagine CMS per SEO | ❌ | ❌ |
| **Google Calendar Sync** | Integrazione bidirezionale calendario | ❌ | ❌ |

---

## 🟢 Priorità Bassa / Enterprise

| Feature | Descrizione |
|---------|-------------|
| **E-Learning / SCORM** | Piattaforma e-learning con standard SCORM |
| **ECM Credits Tracking** | Tracking crediti formativi ECM |
| **Row Level Security (RLS)** | Sicurezza a livello database PostgreSQL |
| **SSO Google Enterprise** | Single Sign-On via Google OAuth enterprise |
| **Test Coverage 85%+** | Da 75% attuale a 85%+ con E2E Playwright |

---

## ✅ Sprint Completati (Storico)

| Sprint | Focus | Data |
|--------|-------|------|
| Sprint 1-2 | Cross-Tenant, Preventivi MDL, Consuntivo (P58) | Gen 2026 |
| Sprint 3 | ListinoForm, Relazione Sanitaria Annuale (P56) | Gen 2026 |
| Sprint 4 | Ownership Check, GDPR Deletion Logging (P58) | Gen 2026 |

---

*Documento aggiornato il 13 Marzo 2026*
