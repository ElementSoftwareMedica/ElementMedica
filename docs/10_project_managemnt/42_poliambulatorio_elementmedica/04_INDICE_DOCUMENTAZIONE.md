# 📚 INDICE DOCUMENTAZIONE - Poliambulatorio ElementMedica

**Ultimo aggiornamento**: 2025-12-11  
**Versione**: 4.0

---

## 🗂️ STRUTTURA DOCUMENTALE

```
42_poliambulatorio_elementmedica/
├── 📋 PLANNING & TRACKING
│   ├── 00_MASTER_PLANNING.md           # Overview progetto
│   ├── MASTER_SOTTOFASI.md             # 237 task breakdown
│   ├── TASK_TRACKER.md                 # Checklist progresso
│   ├── IMPLEMENTATION_QUEUE.md         # Coda priorità
│   └── ANALISI_COMPLETEZZA.md          # Status implementazione
│
├── 📊 PROJECT MANAGEMENT
│   ├── 05_MASTER_REQUIREMENTS.md       # 21+ requisiti sistema completo
│   ├── 06_ARCHITETTURA_TECNICA.md      # Architettura & componenti
│   ├── 07_GANTT_TIMELINE.md            # Timeline 20 settimane
│   ├── 08_MATRICE_TRACCIABILITA.md     # REQ→SPEC→TASK→TEST
│   ├── 09_RISK_MANAGEMENT.md           # Analisi rischi & mitigazioni
│   ├── 10_TEST_STRATEGY.md             # Piano testing completo
│   └── 11_DEPLOYMENT_OPERATIONS.md     # DevOps & procedure
│
├── 🏗️ FASI TECNICHE
│   ├── 01_FASE_0_INFRASTRUTTURA.md     # Multi-domain, SSL
│   ├── 02_FASE_1_DATABASE.md           # Schema Prisma
│   └── 03_FASE_2_BACKEND.md            # API REST
│
├── 📖 SPECIFICHE FUNZIONALI
│   ├── specs/
│   │   ├── SPEC_01_POLIAMBULATORIO.md  # Settings poliambulatorio
│   │   ├── SPEC_02_AMBULATORI.md       # Gestione ambulatori
│   │   ├── SPEC_03_PRESTAZIONI.md      # Catalogo prestazioni
│   │   ├── SPEC_04_STRUMENTARIO.md     # Inventario strumenti
│   │   ├── SPEC_05_AGENDA.md           # Calendario & booking
│   │   ├── SPEC_06_LISTINI.md          # Pricing & sconti
│   │   ├── SPEC_07_APPUNTAMENTI.md     # Workflow prenotazioni
│   │   ├── SPEC_08_NUMERO_CHIAMATA.md  # Sistema coda
│   │   ├── SPEC_09_VISITE.md           # Form builder visite
│   │   ├── SPEC_10_REFERTI.md          # Versioning & firma
│   │   ├── SPEC_11_RUOLI_PERMESSI.md   # RBAC clinico
│   │   ├── SPEC_12_AUDIT_GDPR.md       # Compliance & logs
│   │   ├── SPEC_13_FILE_STORAGE.md     # S3/documenti
│   │   ├── SPEC_14_SICUREZZA.md        # Encryption, MFA
│   │   ├── SPEC_15_RICERCA.md          # Full-text search
│   │   ├── SPEC_16_ASYNC_JOBS.md       # Queue & background
│   │   ├── SPEC_17_COMUNICAZIONI.md    # Email/SMS/WhatsApp/Push ✨
│   │   ├── SPEC_18_PORTALE_PAZIENTE.md # Self-service & booking ✨
│   │   └── SPEC_19_TELECONSULTO.md     # Telemedicina & video ✨
│   │
│   └── workflows/
│       ├── WF_01_PRENOTAZIONE.md       # Flow prenotazione
│       ├── WF_02_ACCETTAZIONE.md       # Flow check-in
│       ├── WF_03_VISITA.md             # Flow visita medica
│       ├── WF_04_REFERTO.md            # Flow refertazione
│       ├── WF_05_FATTURAZIONE.md       # Flow pagamento
│       └── WF_06_TELECONSULTO.md       # Flow teleconsulto ✨
│
└── 📁 sottofasi/                       # Task dettagliati per fase
    ├── F0.1_multi_domain_setup.md
    ├── F0.2_frontend_split.md
    ├── F0.3_auth_multi_frontend.md
    ├── F1_DATABASE_TASKS.md
    ├── F2_BACKEND_TASKS.md
    ├── F3_FRONTEND_BASE_TASKS.md
    ├── F4-F6_STRUTTURA_CATALOGO_AGENDA.md
    ├── F7-F9_CLINICA_FATTURE_INTEGRAZIONI.md
    └── F10-F12_SICUREZZA_TEST_DEPLOY.md
```

---

## 🔗 MAPPA COLLEGAMENTI

### Specifiche → Fasi Tecniche
| Specifica | Database (F1) | Backend (F2) | Frontend (F3-7) |
|-----------|---------------|--------------|-----------------|
| SPEC_01 Poliambulatorio | F1.1 | F2.2 | F4.1 |
| SPEC_02 Ambulatori | F1.2 | F2.2 | F4.3 |
| SPEC_03 Prestazioni | F1.4 | F2.4 | F5.1 |
| SPEC_04 Strumentario | F1.3 | F2.3 | F4.4 |
| SPEC_05 Agenda | F1.6 | F2.7 | F6.1-F6.2 |
| SPEC_06 Listini | F1.5 | F2.5-F2.6 | F5.3-F5.4 |
| SPEC_07 Appuntamenti | F1.6 | F2.8 | F6.3-F6.4 |
| SPEC_08 Numero Chiamata | F1.6 | F2.8 | F6.5-F6.6 |
| SPEC_09 Visite | F1.7 | F2.9 | F7.2 |
| SPEC_10 Referti | F1.7 | F2.10 | F7.3-F7.5 |
| SPEC_11 Ruoli | Existing | F2.1 | F3.6 |
| SPEC_12 Audit GDPR | F1.8 | F2.1 | F10.1-F10.2 |
| SPEC_13 File Storage | - | F2.11 | F7.6 |
| SPEC_14 Sicurezza | - | F2.1 | F10.3 |
| SPEC_15 Ricerca | F1.8 | F2.12 | All |
| SPEC_16 Async Jobs | - | F2.13 | - |
| SPEC_17 Comunicazioni | F1.9 | F2.14 | F9.1-F9.3 |
| SPEC_18 Portale Paziente | F1.9 | F2.15 | F9.4-F9.6 |
| SPEC_19 Teleconsulto | F1.10 | F2.16 | F9.7-F9.9 |

### Workflows → Specifiche
| Workflow | Specifiche Coinvolte |
|----------|---------------------|
| WF_01 Prenotazione | SPEC_05, SPEC_06, SPEC_07 |
| WF_02 Accettazione | SPEC_07, SPEC_08 |
| WF_03 Visita | SPEC_09, SPEC_03 |
| WF_04 Referto | SPEC_10, SPEC_13 |
| WF_05 Fatturazione | SPEC_06, SPEC_07 |
| WF_06 Teleconsulto | SPEC_07, SPEC_17, SPEC_19 |

---

## 📊 STATO DOCUMENTI

| Categoria | Totale | Completati | % |
|-----------|--------|------------|---|
| Planning | 5 | 5 | 100% |
| Project Management | 7 | 7 | 100% ✅ |
| Fasi Tecniche | 3 | 3 | 100% |
| Specifiche | 19 | 19 | 100% ✅ |
| Workflows | 6 | 6 | 100% ✅ |
| Sottofasi | 9 | 9 | 100% |
| **TOTALE** | **49** | **49** | **100%** ✅

---

## 📋 DOCUMENTI PROJECT MANAGEMENT

### 05_MASTER_REQUIREMENTS.md
**Scopo**: Mappatura completa dei 21+ requisiti sistema
- MoSCoW prioritization
- Acceptance criteria per requisito
- Traceability verso specs e task

### 06_ARCHITETTURA_TECNICA.md
**Scopo**: Architettura sistema completa
- Component diagram
- Data flow architecture
- API structure
- Security architecture
- Infrastructure setup

### 07_GANTT_TIMELINE.md
**Scopo**: Timeline dettagliata 20 settimane
- Sprint breakdown (10 sprint)
- Milestones con date
- Dependencies tra task
- Resource allocation

### 08_MATRICE_TRACCIABILITA.md
**Scopo**: Tracciabilità REQ → SPEC → TASK → TEST
- Forward traceability
- Backward traceability
- Coverage analysis
- Gap identification

### 09_RISK_MANAGEMENT.md
**Scopo**: Gestione rischi progetto
- Risk identification (tecnici, business, compliance)
- Probability/Impact matrix
- Mitigation strategies
- Contingency plans

### 10_TEST_STRATEGY.md
**Scopo**: Strategia testing completa
- Unit/Integration/E2E testing
- Performance testing
- Security testing
- UAT procedures
- Test coverage targets

### 11_DEPLOYMENT_OPERATIONS.md
**Scopo**: DevOps e procedure operative
- CI/CD pipeline
- Environment management
- Monitoring & alerting
- Incident response
- Backup & recovery

---

## 🚀 ORDINE LETTURA CONSIGLIATO

### Per Project Manager
1. `00_MASTER_PLANNING.md` → Overview
2. `05_MASTER_REQUIREMENTS.md` → Requisiti completi
3. `07_GANTT_TIMELINE.md` → Timeline dettagliata
4. `08_MATRICE_TRACCIABILITA.md` → Tracciabilità
5. `09_RISK_MANAGEMENT.md` → Rischi & mitigazioni
6. `TASK_TRACKER.md` → Monitoraggio

### Per Developer
1. `06_ARCHITETTURA_TECNICA.md` → Architettura
2. `02_FASE_1_DATABASE.md` → Schema
3. `03_FASE_2_BACKEND.md` → API
4. `specs/SPEC_*` → Requisiti funzionali
5. `10_TEST_STRATEGY.md` → Testing
6. `11_DEPLOYMENT_OPERATIONS.md` → DevOps

### Per Business Analyst
1. `05_MASTER_REQUIREMENTS.md` → Requisiti
2. `specs/SPEC_*` → Tutte le specifiche
3. `workflows/WF_*` → Flussi operativi
4. `08_MATRICE_TRACCIABILITA.md` → Verifica copertura

### Per QA Engineer
1. `10_TEST_STRATEGY.md` → Strategia test
2. `08_MATRICE_TRACCIABILITA.md` → Test mapping
3. `specs/SPEC_*` → Acceptance criteria
4. `workflows/WF_*` → Scenari E2E

### Per Security Officer
1. `specs/SPEC_14_SICUREZZA.md` → Security requirements
2. `specs/SPEC_12_AUDIT_GDPR.md` → Compliance
3. `09_RISK_MANAGEMENT.md` → Security risks
4. `06_ARCHITETTURA_TECNICA.md` → Security architecture

---

*Documento generato automaticamente - Versione 4.0*
*Ultimo aggiornamento: 2025-12-11*

