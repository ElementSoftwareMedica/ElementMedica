# Settings Templates Redesign - Project Index

**Progetto**: Ristrutturazione Pagina Settings/Templates  
**Data Inizio**: 5 Novembre 2025  
**Durata Stimata**: 4 settimane (28 giorni lavorativi)  
**Status**: 📋 Planning Complete - Ready for Implementation

---

## 📄 Documenti di Planning

### Core Documentation

| # | Documento | Descrizione | Status |
|---|-----------|-------------|--------|
| 00 | **[PLANNING_OVERVIEW.md](./00_PLANNING_OVERVIEW.md)** | Planning completo con obiettivi, scope, timeline, architettura generale | ✅ Complete |
| 01 | **[TECHNICAL_ARCHITECTURE.md](./01_TECHNICAL_ARCHITECTURE.md)** | Architettura tecnica dettagliata: componenti, API, services, hooks | ✅ Complete |
| 02 | **[GOOGLE_INTEGRATION.md](./02_GOOGLE_INTEGRATION.md)** | Integrazione Google Workspace: OAuth2, import Docs/Slides, sync | ✅ Complete |
| 03 | **[IMPLEMENTATION_ROADMAP.md](./03_IMPLEMENTATION_ROADMAP.md)** | Roadmap implementazione, next steps, checklist, launch plan | ✅ Complete |

---

## 🎯 Quick Reference

### Obiettivi Principali

1. **Editor In-App Avanzato**
   - WYSIWYG con Tiptap v2
   - Config layout: orientamento (portrait/landscape), margini personalizzati
   - Header/footer con logo e numerazione pagina
   - CSS Builder visuale (font, colori, spacing)

2. **Sistema Marker Completo**
   - 65 marker disponibili (person, course, schedule, company, etc.)
   - Auto-completion intelligente
   - Validazione real-time
   - Formatter: date, uppercase, currency, truncate

3. **Import Google Workspace**
   - OAuth2 flow per autorizzazione
   - Import Google Docs → conversione HTML
   - Import Google Slides → layout grafici
   - Sync automatico opzionale

4. **Preview e Testing**
   - Preview PDF real-time con dati mock
   - Test generation con dati reali database
   - Validazione marker pre-salvataggio

5. **Gestione Template Avanzata**
   - CRUD completo con versionamento
   - Lista con filtri (tipo, categoria, stato)
   - Duplicazione e export/import JSON
   - Template predefiniti per ogni tipo documento

---

## 📊 Timeline Overview

```
Settimana 1: Setup & Editor Base (Giorni 1-7)
├─ Setup environment e dipendenze
├─ Database migration (TemplateLink, TemplateVersion, GoogleTokens)
├─ Tiptap editor con toolbar
└─ Layout/styles configuration

Settimana 2: Sistema Marker (Giorni 8-14)
├─ Marker picker con ricerca
├─ Auto-completion `{{` trigger
├─ Validazione real-time
└─ Preview PDF con mock data

Settimana 3: Google Integration (Giorni 15-21)
├─ OAuth2 setup (Google Cloud Console)
├─ Import Google Docs
├─ Import Google Slides
└─ Auto-sync mechanism

Settimana 4: UI/UX & Testing (Giorni 22-28)
├─ Template list con filtri/ricerca
├─ Version history e restore
├─ Testing E2E completo
└─ Documentation e training
```

---

## 🛠️ Stack Tecnologico

### Frontend
```typescript
React 18 + TypeScript
Tiptap v2 (editor WYSIWYG)
react-pdf / pdf.js (preview PDF)
React Hook Form + Zod (validazione)
React Query (state management + cache)
Tailwind CSS + Shadcn/ui (styling)
react-colorful (color picker)
```

### Backend
```javascript
Node.js + Express (API porta 4001)
Prisma ORM + PostgreSQL
Puppeteer (HTML → PDF generation)
googleapis ^150.x (Google Docs/Slides API)
Bull + Redis (queue per batch generation)
```

### Database
```prisma
TemplateLink (enhanced con layout, styles, googleDocsUrl)
TemplateVersion (versionamento automatico)
GoogleTokens (OAuth2 tokens criptati)
Enums: TemplateType, TemplateFormat, DocumentStatus
```

---

## 📋 Quick Start

### 1. Review Planning (2 ore)
- Leggi documenti 00-03
- Validazione stack tecnologico
- Approvazione timeline e priorità

### 2. Setup Environment (1 giorno)
```bash
# Branch feature
git checkout -b feature/settings-templates-redesign

# Dipendenze frontend
npm install @tiptap/react @tiptap/starter-kit react-pdf react-colorful dompurify

# Dipendenze backend (già presente googleapis)
cd backend && npm install

# Database migration
npx prisma migrate dev --name add_template_enhancements

# Google Cloud Console
# - Crea progetto "ElementMedica Templates"
# - Abilita APIs (Docs, Slides, Drive)
# - Crea OAuth2 credentials
# - Download service account key
```

### 3. POC Proof of Concept (2-3 giorni)
- Backend: CRUD base template
- Frontend: Editor Tiptap minimale
- Google: OAuth2 + import singolo documento
- Preview: PDF generation base

### 4. Implementazione Full (3 settimane)
- Segui roadmap dettagliata in `03_IMPLEMENTATION_ROADMAP.md`

---

## 🔗 Links Utili

### Documentazione Esistente
- Template System: `docs/10_project_managemnt/29_template/`
- Current Page: `src/pages/settings/Templates.tsx`
- Google Service: `backend/services/google-api.js`
- Project Rules: `/Users/matteo.michielon/project 2.0/.trae/rules/project_rules.md`

### External Resources
- Tiptap: https://tiptap.dev/docs
- Google Docs API: https://developers.google.com/docs/api
- Google Slides API: https://developers.google.com/slides/api
- React PDF: https://react-pdf.org/
- Prisma: https://www.prisma.io/docs

---

## ✅ Definition of Done

### Feature Complete When:
- [ ] Codice funzionante e testato
- [ ] Code review approvato
- [ ] Test E2E passano
- [ ] Documentazione aggiornata
- [ ] Demo al Product Owner

### Project Complete When:
- [ ] Tutti gli sprint completati
- [ ] UAT approvato
- [ ] Deploy produzione effettuato
- [ ] Training team completato
- [ ] Monitoring attivo

---

## 📞 Support

**Domande tecniche**: Consulta documenti 01-02  
**Questioni implementative**: Consulta documento 03  
**Decisioni architetturali**: Review con Tech Lead  
**Priorità features**: Escalate al Product Owner  

---

## 🎉 Success Metrics

**Funzionali**:
- ✅ Creazione template da zero in < 5 minuti
- ✅ Import Google Docs in < 30 secondi
- ✅ Preview PDF genera in < 3 secondi

**Performance**:
- ✅ Caricamento lista template: < 1s
- ✅ Apertura editor: < 2s
- ✅ Auto-save: < 500ms

**User Experience**:
- ✅ 90% utenti completano onboarding senza supporto
- ✅ Feedback >= 4/5 stars
- ✅ 0 errori critici in prima settimana

---

## 📅 Next Action

**Immediate**: Schedule planning review meeting (2h)  
**Then**: Setup environment (1 day)  
**Then**: Start POC implementation (2-3 days)

---

**Buon lavoro! 🚀**

---

**Ultimo aggiornamento**: 5 Novembre 2025  
**Owner**: Development Team  
**Reviewer**: Tech Lead + Product Owner
