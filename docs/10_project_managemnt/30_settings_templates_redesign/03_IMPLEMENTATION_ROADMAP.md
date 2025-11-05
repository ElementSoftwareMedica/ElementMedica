# Implementation Roadmap - Settings Templates Redesign

**Data**: 5 Novembre 2025  
**Status**: Ready to Start  
**Sprint**: 4 settimane (28 giorni lavorativi)

---

## 📋 Riepilogo Planning

### Documenti Creati

✅ **00_PLANNING_OVERVIEW.md** - Planning completo con:
- Obiettivi e scope dettagliato
- Stack tecnologico (Tiptap, react-pdf, googleapis)
- Schema database esteso (TemplateLink + TemplateVersion)
- API endpoints (CRUD, preview, validation, Google integration)
- Timeline implementazione (6 fasi, 28 giorni)
- UI/UX design mockups
- Success metrics e rollout strategy

✅ **01_TECHNICAL_ARCHITECTURE.md** - Architettura tecnica con:
- Struttura componenti React (70+ file)
- Hooks custom (editor, validation, Google import, preview)
- Backend routes e controllers dettagliati
- Services (MarkerResolver, PDFGenerator)
- State management con React Query
- Performance optimizations (lazy loading, caching)
- Security measures (XSS prevention, rate limiting)

✅ **02_GOOGLE_INTEGRATION.md** - Integrazione Google Workspace:
- OAuth2 setup completo (Google Cloud Console)
- Import Google Docs con conversione HTML
- Import Google Slides per layout grafici
- Auto-sync mechanism con cron job
- Frontend components (AuthButton, DocsImporter, SlidesImporter)
- Database schema per token storage
- Error handling e permission matrix

---

## 🎯 Obiettivi Recap

### Must Have (Core Features)
1. ✅ **Editor In-App** - WYSIWYG con Tiptap, config layout (portrait/landscape, margini), header/footer, logo upload
2. ✅ **Sistema Marker** - Auto-completion, validazione real-time, 65 marker disponibili, formatter supportati
3. ✅ **Import Google** - OAuth2 flow, import Docs/Slides, conversione HTML, sync automatico
4. ✅ **Preview PDF** - Real-time con dati mock, test generation con dati reali
5. ✅ **Versionamento** - Storico modifiche, restore versioni precedenti

### Should Have (Enhanced UX)
- ✅ Lista template con filtri avanzati (tipo, categoria, stato)
- ✅ Duplicazione template
- ✅ Export/import JSON
- ✅ Template predefiniti per ogni tipo documento

### Nice to Have (Post-Launch)
- ⏳ Template marketplace/sharing
- ⏳ AI-powered suggestions
- ⏳ Collaborative editing

---

## 🚀 Next Steps Immediati

### Step 1: Review Planning (2 ore)

**Participants**: Tech Lead, Product Owner, Frontend Dev, Backend Dev

**Agenda**:
1. Walkthrough documenti planning (30 min)
2. Validazione stack tecnologico (15 min)
   - Conferma Tiptap v2 vs alternative
   - Conferma react-pdf vs pdf.js
   - Conferma struttura componenti
3. Discussione timeline (30 min)
   - Realistico 28 giorni?
   - Priorità features (must vs should have)
   - Resource allocation
4. Definizione milestone intermedi (15 min)
5. Q&A e decisioni finali (30 min)

**Deliverable**: Planning approvato, timeline confermata

---

### Step 2: Setup Environment (1 giorno)

#### Backend Setup

```bash
# 1. Crea branch feature
cd /Users/matteo.michielon/project\ 2.0\ VS
git checkout -b feature/settings-templates-redesign
git push -u origin feature/settings-templates-redesign

# 2. Installa dipendenze backend
cd backend
npm install googleapis@^150.0.0 --save

# 3. Setup Google Cloud Console
# - Crea progetto "ElementMedica Templates"
# - Abilita APIs (Docs, Slides, Drive)
# - Crea OAuth2 credentials
# - Download service account key -> config/google-service-account.json

# 4. Aggiungi variabili ambiente
echo "GOOGLE_CLIENT_ID=your_client_id" >> .env
echo "GOOGLE_CLIENT_SECRET=your_secret" >> .env
echo "GOOGLE_REDIRECT_URI=http://localhost:5173/settings/templates/google-callback" >> .env
```

#### Frontend Setup

```bash
# 1. Installa dipendenze frontend
cd ..
npm install @tiptap/react@^2.1.0 \
  @tiptap/starter-kit@^2.1.0 \
  @tiptap/extension-table@^2.1.0 \
  @tiptap/extension-image@^2.1.0 \
  react-pdf@^7.5.0 \
  react-colorful@^5.6.0 \
  dompurify@^3.0.0 \
  --save

# 2. Setup Storybook (opzionale, per component development)
npx storybook@latest init

# 3. Crea struttura directory
mkdir -p src/pages/settings/templates/{components,hooks,utils,types}
mkdir -p src/pages/settings/templates/components/{list,editor,preview,google,version,shared}
```

#### Database Setup

```bash
# 1. Crea migration Prisma
cd backend
npx prisma migrate dev --name add_template_enhancements --create-only

# 2. Modifica migration file (backend/prisma/migrations/xxx_add_template_enhancements/migration.sql)
# Aggiungi:
# - Campi nuovi a TemplateLink (layout, styles, logoImage, logoPosition, googleDocsUrl, etc.)
# - Model TemplateVersion
# - Model GoogleTokens
# - Enums TemplateType, TemplateFormat

# 3. Esegui migration
npx prisma migrate dev

# 4. Genera Prisma Client
npx prisma generate
```

**Deliverable**: Environment pronto, dipendenze installate, database migrato

---

### Step 3: Prototipo Proof of Concept (2-3 giorni)

Obiettivo: Validare stack tecnologico con implementazione minimal funzionante.

#### POC Checklist

```typescript
// 1. Backend - Template CRUD base
[ ] POST /api/v1/templates - Crea template semplice
[ ] GET /api/v1/templates/:id - Recupera template
[ ] PUT /api/v1/templates/:id - Aggiorna template (crea versione)
[ ] Test API con Postman/Insomnia

// 2. Frontend - Editor base
[ ] Component TiptapEditor.tsx con toolbar base
[ ] Hook useTemplateEditor.ts per state management
[ ] Salvataggio template funzionante
[ ] Test create/update template

// 3. Google Integration - Import minimal
[ ] OAuth2 authorization flow
[ ] Import singolo documento Google Docs
[ ] Conversione base HTML (solo paragrafi)
[ ] Test import con documento pubblico

// 4. Preview - Generazione PDF base
[ ] Endpoint POST /api/v1/templates/:id/preview
[ ] Puppeteer genera PDF da HTML
[ ] Preview panel mostra PDF
[ ] Test con template semplice
```

#### POC Success Criteria

✅ Utente può creare template da editor  
✅ Template salvato in database con versione  
✅ Utente può importare Google Docs (auth + conversione)  
✅ Preview PDF funziona con template base  

**Deliverable**: POC funzionante, stack validato

---

### Step 4: Implementazione Full Features (3 settimane)

Segui timeline dettagliata in `00_PLANNING_OVERVIEW.md`:

**Week 1** - Editor Avanzato
- Layout config (portrait/landscape, margini)
- Styles panel (font, colori, spacing)
- Header/footer editor con logo upload
- Auto-save ogni 30 secondi

**Week 2** - Sistema Marker
- Marker picker con categorizzazione
- Auto-completion `{{` trigger
- Validazione real-time
- Preview con mock data

**Week 3** - Google Integration Full
- Import Google Slides
- Sync automatico con cron job
- Error handling robusto
- Permission management

**Week 4** - UI/UX Polish
- Template list con filtri/ricerca
- Version history e restore
- Duplicazione template
- Testing E2E completo

---

## 📊 Progress Tracking

### Dashboard Metriche

```yaml
Setup:
  - Environment setup: [ ]
  - Dependencies installed: [ ]
  - Database migrated: [ ]
  - Google Cloud configured: [ ]

POC:
  - Backend CRUD: [ ]
  - Editor base: [ ]
  - Google import: [ ]
  - Preview PDF: [ ]

Week 1 (Editor):
  - Layout config: [ ]
  - Styles panel: [ ]
  - Header/footer: [ ]
  - Logo upload: [ ]

Week 2 (Markers):
  - Marker picker: [ ]
  - Auto-completion: [ ]
  - Validation: [ ]
  - Mock preview: [ ]

Week 3 (Google):
  - OAuth2 flow: [ ]
  - Import Docs: [ ]
  - Import Slides: [ ]
  - Auto-sync: [ ]

Week 4 (Polish):
  - Template list: [ ]
  - Version history: [ ]
  - Testing E2E: [ ]
  - Documentation: [ ]
```

### Daily Standup Questions

1. **Ieri**: Cosa hai completato?
2. **Oggi**: Su cosa lavorerai?
3. **Blockers**: Ci sono impedimenti?
4. **Rischi**: Qualcosa a rischio?

### Weekly Demo

- **Venerdì ore 16:00**: Demo features completate
- **Partecipanti**: Team + Product Owner
- **Durata**: 30 minuti
- **Format**: Live demo + Q&A

---

## 🔧 Tools & Resources

### Development Tools

```yaml
Code Editor: VS Code
API Client: Postman / Insomnia
Database: TablePlus / pgAdmin
Git: GitHub Desktop / CLI
Browser DevTools: Chrome DevTools
PDF Viewer: Chrome / Firefox built-in

VS Code Extensions:
  - Prisma (prisma.prisma)
  - ESLint (dbaeumer.vscode-eslint)
  - Prettier (esbenp.prettier-vscode)
  - Tailwind CSS IntelliSense (bradlc.vscode-tailwindcss)
  - GitLens (eamodio.gitlens)
```

### Documentation Links

```yaml
Tiptap:
  - Docs: https://tiptap.dev/docs
  - Examples: https://tiptap.dev/examples
  - Extensions: https://tiptap.dev/extensions

Google APIs:
  - Docs API: https://developers.google.com/docs/api
  - Slides API: https://developers.google.com/slides/api
  - OAuth2: https://developers.google.com/identity/protocols/oauth2

React PDF:
  - Docs: https://react-pdf.org/
  - Examples: https://react-pdf.org/examples

Puppeteer:
  - Docs: https://pptr.dev/
  - PDF options: https://pptr.dev/api/puppeteer.pdfoptions
```

### Testing Resources

```yaml
Test Documents:
  - Google Docs public test doc: [create one]
  - Google Slides public test: [create one]
  - Sample HTML templates: docs/10_project_managemnt/29_template/

Mock Data:
  - Person: admin@example.com (Admin123!)
  - Course: "Corso Test Sicurezza"
  - Schedule: ID from /api/v1/schedules

Browsers:
  - Chrome 120+
  - Firefox 121+
  - Safari 17+ (test on macOS)
```

---

## ⚠️ Risks & Mitigations

### Technical Risks

| Rischio | Probabilità | Impatto | Mitigazione |
|---------|-------------|---------|-------------|
| Tiptap performance con template grandi | Media | Alto | Lazy loading content, virtualization, debounce auto-save |
| Google OAuth setup complesso | Alta | Medio | POC early, service account fallback per testing |
| PDF generation timeout | Media | Alto | Queue system con Bull, timeout 60s, retry logic |
| Conversione Google Docs perde formattazione | Alta | Medio | Preview pre-import, editor manuale post-import |
| Browser compatibility Tiptap | Bassa | Medio | Test su Chrome/Firefox/Safari, fallback editor textarea |

### Resource Risks

| Rischio | Probabilità | Impatto | Mitigazione |
|---------|-------------|---------|-------------|
| Timeline troppo ottimistica | Media | Alto | Buffer 1 settimana, prioritize must-have features |
| Sviluppatore malato/assente | Bassa | Alto | Pair programming, code review, documentazione |
| Google API quota limits | Bassa | Medio | Cache responses, batch requests, monitor usage |
| Database migration issues | Bassa | Alto | Backup pre-migration, test su staging first |

---

## ✅ Definition of Done

### Feature Level

Ogni feature è completa quando:
- [ ] Codice scritto e funzionante
- [ ] Test unitari passano (coverage >= 70%)
- [ ] Test E2E critici passano
- [ ] Code review approvato
- [ ] Documentazione aggiornata (inline + user guide)
- [ ] Demo al Product Owner approvata
- [ ] Merged in branch feature

### Sprint Level

Sprint è completo quando:
- [ ] Tutte le feature in scope completate (DOD)
- [ ] Zero bug critici aperti
- [ ] Performance metrics rispettati (vedi success metrics)
- [ ] Documentazione utente pronta
- [ ] Deploy su staging effettuato
- [ ] Smoke test su staging passati

### Project Level

Progetto è completo quando:
- [ ] Tutti gli sprint completati
- [ ] Testing E2E completo passato
- [ ] User acceptance testing (UAT) approvato
- [ ] Performance testing su produzione passato
- [ ] Documentazione completa (tecnica + utente)
- [ ] Training team effettuato
- [ ] Deploy produzione effettuato
- [ ] Monitoring attivo (Sentry, logs)

---

## 🎉 Launch Checklist

### Pre-Launch (1 settimana prima)

```yaml
Technical:
  [ ] Database backup produzione
  [ ] Migration script testato su staging
  [ ] Rollback plan documentato
  [ ] Performance testing su staging (load test 100+ users)
  [ ] Security audit (XSS, CSRF, SQL injection)
  [ ] Browser compatibility testing (Chrome, Firefox, Safari)
  [ ] Mobile responsive testing (tablet)

Documentation:
  [ ] User guide completa con screenshot
  [ ] Video tutorial registrato (10 min)
  [ ] Release notes scritte
  [ ] Changelog aggiornato
  [ ] API documentation aggiornata

Communication:
  [ ] Email annuncio preparata
  [ ] Training session schedulata
  [ ] Support team briefato
  [ ] FAQ preparate
```

### Launch Day

```yaml
Morning:
  [ ] 09:00 - Deploy produzione (maintenance mode)
  [ ] 09:30 - Database migration
  [ ] 10:00 - Health checks (API, frontend, database)
  [ ] 10:30 - Smoke testing produzione
  [ ] 11:00 - Disable maintenance mode
  [ ] 11:30 - Monitor errors (Sentry dashboard)

Afternoon:
  [ ] 14:00 - Email annuncio inviata
  [ ] 15:00 - Training session live
  [ ] 16:00 - Monitor user feedback (Slack #support)
  [ ] 17:00 - Daily wrap-up meeting

Evening:
  [ ] Monitor metrics (active users, errors, performance)
  [ ] On-call dev disponibile per emergenze
```

### Post-Launch (1 settimana)

```yaml
Day 1-3:
  [ ] Monitor error rate (target < 0.1%)
  [ ] Collect user feedback
  [ ] Fix critical bugs (hotfix release se necessario)
  [ ] Daily check-in meeting

Day 4-7:
  [ ] Analisi metriche (adoption rate, feature usage)
  [ ] Prioritize bug fixes e enhancement
  [ ] Plan sprint successivo con feedback
  [ ] Retrospective meeting
```

---

## 📞 Contact & Support

### Team Roles

```yaml
Tech Lead: [Nome]
  - Architettura decisioni
  - Code review finale
  - Performance optimization
  
Backend Dev: [Nome]
  - API implementation
  - Google integration
  - Database migration
  
Frontend Dev: [Nome]
  - React components
  - Editor implementation
  - UI/UX polish
  
Product Owner: [Nome]
  - Feature prioritization
  - UAT approval
  - User feedback

DevOps: [Nome]
  - Deployment
  - Monitoring setup
  - Infrastructure
```

### Communication Channels

```yaml
Daily Updates: Slack #templates-redesign
Urgent Issues: Phone/SMS [numbers]
Code Reviews: GitHub Pull Requests
Documentation: Notion/Confluence
Meetings: Google Meet/Zoom
```

---

## 📚 Reference Links

### Project Documentation
- Planning: `docs/10_project_managemnt/30_settings_templates_redesign/00_PLANNING_OVERVIEW.md`
- Architecture: `docs/10_project_managemnt/30_settings_templates_redesign/01_TECHNICAL_ARCHITECTURE.md`
- Google Integration: `docs/10_project_managemnt/30_settings_templates_redesign/02_GOOGLE_INTEGRATION.md`
- This file: `docs/10_project_managemnt/30_settings_templates_redesign/03_IMPLEMENTATION_ROADMAP.md`

### Existing System
- Template System Docs: `docs/10_project_managemnt/29_template/`
- Current Templates Page: `src/pages/settings/Templates.tsx`
- Google API Service: `backend/services/google-api.js`
- Project Rules: `/Users/matteo.michielon/project 2.0/.trae/rules/project_rules.md`

### External Resources
- Tiptap Docs: https://tiptap.dev/docs
- Google APIs: https://developers.google.com/docs
- React PDF: https://react-pdf.org/
- Prisma Docs: https://www.prisma.io/docs

---

**Ready to Start!** 🚀  
**Next Action**: Schedule planning review meeting  
**Documento aggiornato**: 5 Novembre 2025  
**Status**: ✅ READY FOR KICKOFF
