# 🏢 Progetto 28: Ottimizzazione Import E2E Aziende
**Sistema Import CSV Completo e Performante**

## 🎯 Obiettivo
Completare e rendere affidabile l'import da CSV delle aziende end-to-end (frontend → API → DB), eliminando i campi duplicati da Company e mantenendoli solo in CompanySite.

## 🔄 Aggiornamenti Rapidi (oggi)
- Health check: API 4001 e Proxy 4003 OK; frontend 5173 risponde; routing avanzato OK; stato routes: overall "degraded" per documents server non attivo (non blocca import).
- Backend import: handler POST /api/v1/companies/import allineato per supportare overwriteIds e creazione idempotente CompanySite (siteName fallback su siteCitta, chiavi di idempotenza: companyId + siteName (+ indirizzo/città se presenti)).
- Frontend import: CompanyImportRefactored converte correttamente il payload (companies + overwriteIds), gestisce 409 conflitti con modal risoluzione, toast aggiornati per mostrare conteggi reali created/updated/sitesCreated/error.
- Validazione: utils.ts applica normalizzazioni (title case, email/telefoniche), valida lunghezze e formati, e separa Company vs CompanySite nel payload.

## 🔍 Problema Identificato
- **Frontend**: Modal import CSV lento, parsing non ottimizzato
- **Backend**: Import sembra successful ma dati non persistono in DB  
- **Schema**: Campi duplicati tra Company e CompanySite
- **UX**: Mancanza progress bar, anteprima e report dettagliato

## 📊 Stato Analisi (da Log Frontend)
```
✅ Modal si apre
✅ CSV viene parsato (9 elementi)
✅ API call ritorna success: true
❌ Nessuna azienda creata in DB
❌ Performance parsing lenta
```

## 🏗️ Architettura Target
```
CSV Upload → Streaming Parser → Validation → Batch API → Atomic TX → DB
    ↓            ↓              ↓          ↓          ↓        ↓
Progress Bar  Worker Thread   Preview    Retry     Company   CompanySite
                                        Logic   + CompanySite  Only
```

## 📋 Fasi Implementazione

### Fase 1: Analisi e Mapping (IN CORSO)
- [x] Creazione progetto documentazione
- [x] Analisi flusso UI → API → DB (payload companies+overwriteIds; response results+summary)
- [x] Identificazione bug persistence (mancata gestione overwrite e idempotenza sedi)
- [x] Mapping campi Company vs CompanySite (sanitizeCompanyData backend, convertToApiFormat frontend)

### Fase 2: Schema Optimization
- [ ] Rimozione campi duplicati da Company
- [ ] Migrazione dati esistenti verso CompanySite
- [ ] Test compatibilità Supabase

### Fase 3: Backend Enhancement
- [x] Transazioni atomiche Company+CompanySite (per overwrite/riattivazione)
- [x] Logging strutturato con importId (in place)
- [x] Gestione errori per riga con details (status 409/400/200)
- [x] Idempotenza su chiavi uniche per CompanySite

### Fase 4: Frontend Performance
- [ ] Streaming/Worker per parsing CSV
- [ ] Progress bar e anteprima
- [ ] Batch processing con retry
- [ ] UI responsive e feedback UX

### Fase 5: Testing e Documentation
- [ ] Test E2E completi
- [ ] Template CSV aggiornato
- [ ] Documentazione tecnica
- [ ] Report import strutturato

## 🔧 Tecnologie
- **Frontend**: React, Web Workers, Streaming API
- **Backend**: Node.js, Prisma, Transazioni atomiche
- **DB**: PostgreSQL/Supabase con constraint
- **Monitoring**: JSON structured logging

## 📈 Metriche Success
- Parsing CSV < 2s per 1000 righe
- Import E2E < 10s per batch 100 aziende
- 0 perdite dati tra staging/produzione
- UX fluida con progress e preview

## 🚨 Vincoli Non Negoziabili
- No riavvio server durante sviluppo
- Porte fisse: 5173, 4001, 4003
- Compatibilità dev/prod identica
- Nessun bypass security/GDPR

## 📁 Struttura File
```
28_import_e2e_companies_optimization/
├── README.md                    # Questo file
├── ANALYSIS_CURRENT_FLOW.md     # Analisi stato attuale
├── SCHEMA_MIGRATION_PLAN.md     # Piano migrazione Prisma
├── FRONTEND_OPTIMIZATION.md     # Ottimizzazioni UI/UX
├── BACKEND_ENHANCEMENT.md       # Miglioramenti API
├── TESTING_STRATEGY.md         # Strategia test E2E
└── temp/                       # File temporanei debug
```

---
**Nota**: Seguire sempre le regole TRAE_SYSTEM_GUIDE.md e project_rules.md