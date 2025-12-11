# 🏥 Progetto Poliambulatorio ElementMedica

## Master Planning Document

**Data Creazione**: 11 Dicembre 2025  
**Versione**: 1.0  
**Stato**: 📋 PIANIFICAZIONE

---

## 📋 INDICE MASTER

1. [Executive Summary](#1-executive-summary)
2. [Analisi Stato Attuale](#2-analisi-stato-attuale)
3. [Architettura Target](#3-architettura-target)
4. [Macro-Fasi del Progetto](#4-macro-fasi-del-progetto)
5. [Dipendenze e Rischi](#5-dipendenze-e-rischi)
6. [Timeline Stimata](#6-timeline-stimata)
7. [Documenti di Fase](#7-documenti-di-fase)

---

## 1. Executive Summary

### 1.1 Obiettivo Principale
Creare un **frontend privato dedicato** per `www.elementmedica.com` che gestisca un **poliambulatorio medico completo**, separato dal CRM di formazione di `elementformazione.com`, ma condividendo lo stesso database e backend con autenticazione separata.

### 1.2 Scope del Progetto
- **Multi-brand frontend**: Due applicazioni React separate (formazione/medica)
- **Login separati**: Autenticazione distinta per tenant con routing differenziato
- **Gestione Poliambulatorio**: Ambulatori, prestazioni, strumentario, agenda
- **Gestione Clinica**: Pazienti, visite, referti, medici, infermieri
- **Compliance**: GDPR, dati sanitari sensibili, audit trail clinico
- **Integrazioni**: WhatsApp, SMS, email, monitor chiamate, fatturazione elettronica

### 1.3 Principi Guida
1. **Riusabilità**: Estendere componenti esistenti, non duplicare
2. **Isolamento**: Tenant separation rigoroso (dati sanitari)
3. **GDPR**: Compliance totale per dati sanitari sensibili
4. **Manutenibilità**: Codice modulare, max 500 linee/file
5. **Sicurezza**: Cifratura PHI, audit trail, MFA per medici
6. **Performance**: Bundle splitting, lazy loading, caching

---

## 2. Analisi Stato Attuale

### 2.1 Architettura Esistente

```
┌─────────────────────────────────────────────────────────────┐
│                    STATO ATTUALE                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Frontend (Vite + React)                                     │
│  ├── src/pages/public/     → Homepage formazione            │
│  ├── src/pages/auth/       → Login unificato                │
│  └── src/pages/*           → CRM formazione                 │
│                                                              │
│  Backend (Express + Prisma)                                  │
│  ├── 3 Server: API (4001), Docs (4002), Proxy (4003)        │
│  ├── Multi-tenant via domain/subdomain                       │
│  └── RBAC + PersonPermission enum                           │
│                                                              │
│  Database (PostgreSQL)                                       │
│  ├── Person (entità unificata utenti)                       │
│  ├── PersonRole + RoleType enum                             │
│  ├── Tenant (multi-tenancy)                                 │
│  └── ~80 tabelle                                            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Componenti Riutilizzabili

| Componente | Path | Riutilizzabilità |
|------------|------|------------------|
| GDPREntityTemplate | `src/templates/gdpr-entity-page/` | ✅ Alta - base per entità |
| AuthContext | `src/context/AuthContext.tsx` | ✅ Alta - da estendere |
| Layout | `src/components/layouts/` | ⚠️ Media - serve layout medico |
| Forms System | `src/pages/forms/` | ✅ Alta - per visite/referti |
| Template System | `src/pages/templates/` | ✅ Alta - per documenti medici |
| RBAC | `backend/services/RBACService.js` | ✅ Alta - da estendere |

### 2.3 Schema Prisma - Elementi Esistenti da Estendere

```prisma
// GIÀ ESISTENTI - Da Estendere
enum RoleType {
  EMPLOYEE, MANAGER, TRAINER, ADMIN, ...
  // AGGIUNGERE: MEDICO, INFERMIERE, PAZIENTE, SEGRETERIA_MEDICA
}

enum PersonPermission {
  VIEW_COMPANIES, CREATE_COMPANIES, ...
  // AGGIUNGERE: VIEW_PATIENTS, CREATE_VISITS, SIGN_CLINICAL, ...
}

model Person {
  // ESISTENTE - base per medici, infermieri, pazienti
}

model Tenant {
  // ESISTENTE - elementmedica sarà un tenant separato
}
```

### 2.4 Gap Analysis

| Area | Stato Attuale | Richiesto | Gap |
|------|---------------|-----------|-----|
| Frontend Medico | ❌ Assente | App dedicata | ALTO |
| Ruoli Medici | ❌ Assente | MEDICO, INFERMIERE, PAZIENTE | MEDIO |
| Entità Cliniche | ❌ Assente | Ambulatori, Prestazioni, Visite | ALTO |
| Agenda Medica | ❌ Assente | Prenotazioni, disponibilità | ALTO |
| Refertazione | ❌ Assente | Visite, referti, versioning | ALTO |
| Strumentario | ❌ Assente | Inventario, manutenzione | MEDIO |
| Fatturazione | ⚠️ Parziale | Preventivi esistenti, fatture da estendere | MEDIO |
| Privacy PHI | ⚠️ Parziale | Cifratura, audit clinico | MEDIO |

---

## 3. Architettura Target

### 3.1 Overview Architetturale

```
┌─────────────────────────────────────────────────────────────────────┐
│                      ARCHITETTURA TARGET                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────┐     ┌─────────────────┐                        │
│  │ elementformazione│     │ elementmedica   │                        │
│  │     .com         │     │     .com        │                        │
│  │  (Frontend CRM)  │     │(Frontend Clinico)│                       │
│  └────────┬─────────┘     └────────┬────────┘                        │
│           │                        │                                 │
│           └────────┬───────────────┘                                 │
│                    ▼                                                 │
│  ┌─────────────────────────────────────────┐                        │
│  │           Proxy Server (4003)           │                        │
│  │  • CORS multi-origin                    │                        │
│  │  • Rate limiting                        │                        │
│  │  • Domain-based routing                 │                        │
│  └────────────────┬────────────────────────┘                        │
│                   ▼                                                  │
│  ┌─────────────────────────────────────────┐                        │
│  │          API Server (4001)              │                        │
│  │  • /api/v1/formazione/* (routes CRM)    │                        │
│  │  • /api/v1/clinica/*    (routes medico) │                        │
│  │  • Multi-tenant isolation               │                        │
│  └────────────────┬────────────────────────┘                        │
│                   ▼                                                  │
│  ┌─────────────────────────────────────────┐                        │
│  │         PostgreSQL Database             │                        │
│  │  • Tenant isolation (tenantId)          │                        │
│  │  • PHI encryption (campi sensibili)     │                        │
│  │  • Audit logs (clinical + GDPR)         │                        │
│  └─────────────────────────────────────────┘                        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 Nuove Entità Database (Schema Prisma)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    NUOVE ENTITÀ CLINICHE                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  STRUTTURA                                                          │
│  ├── Poliambulatorio (settings globali, sedi)                       │
│  ├── Ambulatorio (stanze, tipologia, strumentario)                  │
│  └── Strumentario (apparecchiature, manutenzione)                   │
│                                                                      │
│  CATALOGO                                                           │
│  ├── Prestazione (specialità, durata, prezzo, medico)               │
│  ├── Listino (prezzi, sconti, convenzioni)                          │
│  └── Convenzione (assicurazioni, palestre, aziende)                 │
│                                                                      │
│  AGENDA                                                             │
│  ├── SlotDisponibilita (medico, ambulatorio, orari)                 │
│  ├── Appuntamento (paziente, prestazione, stato)                    │
│  └── NumeroChiamata (coda, monitor sala attesa)                     │
│                                                                      │
│  CLINICA                                                            │
│  ├── Paziente (estende Person, dati sanitari)                       │
│  ├── CartellaClinica (storia paziente)                              │
│  ├── Visita (appuntamento → esecuzione)                             │
│  ├── Referto (versioning, template, firma)                          │
│  └── ConsensoInformato (GDPR clinico)                               │
│                                                                      │
│  FATTURAZIONE                                                       │
│  ├── PreventivoPrestazione (estende Preventivo)                     │
│  ├── FatturaPrestazione (SDI, tessera sanitaria)                    │
│  └── PercentualeMedico (compensi)                                   │
│                                                                      │
│  AUDIT                                                              │
│  ├── AuditLogClinico (accessi PHI, modifiche)                       │
│  └── VersioneReferto (event sourcing)                               │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.3 Nuovi Ruoli e Permessi

```typescript
// Nuovi RoleType da aggiungere
enum RoleType {
  // ... esistenti ...
  MEDICO              // Medico specialista
  MEDICO_BASE         // Medico di base
  INFERMIERE          // Infermiere
  SEGRETERIA_MEDICA   // Segreteria poliambulatorio
  PAZIENTE            // Paziente (accesso limitato)
  DIRETTORE_SANITARIO // Direttore sanitario
}

// Nuovi PersonPermission da aggiungere
enum PersonPermission {
  // ... esistenti ...
  
  // Pazienti
  VIEW_PATIENTS
  CREATE_PATIENTS
  EDIT_PATIENTS
  DELETE_PATIENTS
  
  // Visite
  VIEW_VISITS
  CREATE_VISITS
  EDIT_VISITS
  DELETE_VISITS
  START_VISITS
  COMPLETE_VISITS
  
  // Referti
  VIEW_REPORTS
  CREATE_REPORTS
  EDIT_REPORTS
  SIGN_CLINICAL      // Firma digitale referto
  EXPORT_REPORTS
  
  // Agenda
  VIEW_AGENDA
  MANAGE_AGENDA
  BOOK_APPOINTMENTS
  CANCEL_APPOINTMENTS
  
  // Ambulatori
  VIEW_AMBULATORI
  MANAGE_AMBULATORI
  
  // Strumentario
  VIEW_STRUMENTARIO
  MANAGE_STRUMENTARIO
  
  // Prestazioni
  VIEW_PRESTAZIONI
  MANAGE_PRESTAZIONI
  
  // Fatturazione medica
  VIEW_FATTURE_MEDICHE
  CREATE_FATTURE_MEDICHE
  SEND_FATTURE_SDI
  
  // Admin clinico
  MANAGE_LISTINI
  MANAGE_CONVENZIONI
  VIEW_STATISTICHE_CLINICHE
  EXPORT_DATI_CLINICI
}
```

---

## 4. Macro-Fasi del Progetto

### FASE 0: Preparazione e Infrastruttura
**Durata stimata**: 1-2 settimane
**Documento**: `01_FASE_0_INFRASTRUTTURA.md`

- [ ] Setup multi-frontend build (Vite config per medica)
- [ ] Configurazione routing multi-brand
- [ ] Estensione CORS per nuovo dominio
- [ ] Setup tenant "elementmedica" nel database
- [ ] Login routing domain-based

### FASE 1: Schema Database Clinico
**Durata stimata**: 2-3 settimane
**Documento**: `02_FASE_1_DATABASE.md`

- [ ] Nuovi enum RoleType (MEDICO, INFERMIERE, PAZIENTE, ...)
- [ ] Nuovi enum PersonPermission (clinici)
- [ ] Modello Poliambulatorio + Ambulatorio
- [ ] Modello Strumentario
- [ ] Modello Prestazione + Listino
- [ ] Modello Paziente (estensione Person)
- [ ] Modello Agenda + Appuntamento
- [ ] Modello Visita + Referto
- [ ] Indici e ottimizzazioni
- [ ] Migration script

### FASE 2: Backend API Cliniche
**Durata stimata**: 3-4 settimane
**Documento**: `03_FASE_2_BACKEND.md`

- [ ] Routes /api/v1/clinica/*
- [ ] Controller e Service per ogni entità
- [ ] RBAC esteso per permessi clinici
- [ ] Audit log clinico (accessi PHI)
- [ ] Versioning referti (event sourcing)
- [ ] Integrazione con sistema template esistente
- [ ] API agenda e disponibilità

### FASE 3: Frontend Base Medica
**Durata stimata**: 2-3 settimane
**Documento**: `04_FASE_3_FRONTEND_BASE.md`

- [ ] Layout clinico (sidebar medica)
- [ ] Dashboard medico
- [ ] Routing medica (App.medica.tsx)
- [ ] Navigazione specifica per ruolo
- [ ] Componenti UI medici base

### FASE 4: Modulo Struttura
**Durata stimata**: 2 settimane
**Documento**: `05_FASE_4_STRUTTURA.md`

- [ ] Pagina Settings Poliambulatorio
- [ ] CRUD Ambulatori
- [ ] CRUD Strumentario
- [ ] Gestione manutenzioni
- [ ] Calcolo ammortamento

### FASE 5: Modulo Catalogo
**Durata stimata**: 2 settimane
**Documento**: `06_FASE_5_CATALOGO.md`

- [ ] CRUD Prestazioni
- [ ] Associazione prestazione-medico
- [ ] Gestione Listini
- [ ] Convenzioni e sconti
- [ ] Import/Export prestazioni

### FASE 6: Modulo Agenda
**Durata stimata**: 3-4 settimane
**Documento**: `07_FASE_6_AGENDA.md`

- [ ] Calendario agenda medici
- [ ] Gestione slot disponibilità
- [ ] Prenotazione appuntamenti
- [ ] Stati appuntamento
- [ ] Integrazione monitor chiamate
- [ ] Reminder WhatsApp/SMS/Email
- [ ] Frontend pubblico disponibilità

### FASE 7: Modulo Clinico
**Durata stimata**: 4-5 settimane
**Documento**: `08_FASE_7_CLINICO.md`

- [ ] Gestione Pazienti (estende Person)
- [ ] Cartella Clinica
- [ ] Workflow Visita (arrivo → refertazione)
- [ ] Form builder visite personalizzabili
- [ ] Template referti per prestazione/medico
- [ ] Versioning referti
- [ ] Firma digitale referti
- [ ] Stampa referti

### FASE 8: Modulo Fatturazione Medica
**Durata stimata**: 2-3 settimane
**Documento**: `09_FASE_8_FATTURAZIONE.md`

- [ ] Preventivi prestazioni
- [ ] Fatturazione elettronica
- [ ] Integrazione SDI
- [ ] Tessera sanitaria
- [ ] Percentuali medici
- [ ] Report finanziari

### FASE 9: Integrazioni e Comunicazioni
**Durata stimata**: 2 settimane
**Documento**: `10_FASE_9_INTEGRAZIONI.md`

- [ ] WhatsApp Business API
- [ ] SMS gateway
- [ ] Email transazionali
- [ ] Monitor sala attesa
- [ ] Push notifications

### FASE 10: Sicurezza e Compliance
**Durata stimata**: 2 settimane
**Documento**: `11_FASE_10_SICUREZZA.md`

- [ ] Cifratura campi PHI
- [ ] MFA per medici
- [ ] Audit trail completo
- [ ] Data retention policies
- [ ] Export GDPR
- [ ] Penetration testing

### FASE 11: Testing e QA
**Durata stimata**: 2-3 settimane
**Documento**: `12_FASE_11_TESTING.md`

- [ ] Unit tests entità cliniche
- [ ] Integration tests API
- [ ] E2E tests workflow critici
- [ ] Performance testing
- [ ] Security testing
- [ ] UAT con utenti reali

### FASE 12: Deploy e Go-Live
**Durata stimata**: 1-2 settimane
**Documento**: `13_FASE_12_DEPLOY.md`

- [ ] Setup ambiente produzione
- [ ] Migration dati esistenti
- [ ] DNS e certificati
- [ ] Monitoring e alerting
- [ ] Documentazione utente
- [ ] Training staff

---

## 5. Dipendenze e Rischi

### 5.1 Dipendenze Critiche

| Dipendenza | Fase | Impatto |
|------------|------|---------|
| Schema DB completato | FASE 2+ | BLOCCANTE |
| Auth multi-brand | FASE 3+ | BLOCCANTE |
| Template system | FASE 7 | ALTO |
| WhatsApp API approval | FASE 9 | MEDIO |

### 5.2 Rischi Identificati

| Rischio | Probabilità | Impatto | Mitigazione |
|---------|-------------|---------|-------------|
| Complessità schema DB | Media | Alto | Prototipo incrementale |
| Performance agenda | Media | Alto | Caching Redis, indici |
| Compliance sanitaria | Bassa | Critico | Consulenza legale |
| Integrazione SDI | Media | Medio | Libreria certificata |

---

## 6. Timeline Stimata

```
SETTIMANA   1  2  3  4  5  6  7  8  9  10 11 12 13 14 15 16 17 18 19 20
           ├──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┤
FASE 0     ████                                                        
FASE 1        ██████                                                   
FASE 2              ████████                                           
FASE 3                      ██████                                     
FASE 4                            ████                                 
FASE 5                                ████                             
FASE 6                                    ████████                     
FASE 7                                            ██████████           
FASE 8                                                      ██████     
FASE 9                                                          ████   
FASE 10                                                           ████ 
FASE 11                                                             ██████
FASE 12                                                                 ████
```

**Durata totale stimata**: 18-22 settimane (4.5-5.5 mesi)

---

## 7. Documenti di Fase

Ogni fase avrà un documento dettagliato con:
- Obiettivi specifici
- Checklist attività
- Schema/diagrammi tecnici
- Test cases
- Criteri di accettazione

### Documenti da Creare

```
docs/10_project_managemnt/42_poliambulatorio_elementmedica/
├── 00_MASTER_PLANNING.md           ← QUESTO DOCUMENTO
├── 01_FASE_0_INFRASTRUTTURA.md
├── 02_FASE_1_DATABASE.md
├── 03_FASE_2_BACKEND.md
├── 04_FASE_3_FRONTEND_BASE.md
├── 05_FASE_4_STRUTTURA.md
├── 06_FASE_5_CATALOGO.md
├── 07_FASE_6_AGENDA.md
├── 08_FASE_7_CLINICO.md
├── 09_FASE_8_FATTURAZIONE.md
├── 10_FASE_9_INTEGRAZIONI.md
├── 11_FASE_10_SICUREZZA.md
├── 12_FASE_11_TESTING.md
├── 13_FASE_12_DEPLOY.md
└── schemas/
    ├── prisma-clinica.prisma      (schema incrementale)
    ├── api-routes.md              (documentazione API)
    └── diagrams/                  (diagrammi architetturali)
```

---

## 📊 Metriche di Successo

| Metrica | Target | Misurazione |
|---------|--------|-------------|
| Code coverage | ≥75% | Jest/Vitest |
| TypeScript errors | 0 | `tsc --noEmit` |
| Performance Lighthouse | ≥90 | Lighthouse CI |
| Accessibilità | WCAG 2.1 AA | axe-core |
| Uptime | 99.9% | Monitoring |
| Response time API | <200ms p95 | APM |

---

## ✅ Prossimi Passi

1. **Approvazione planning** - Revisione con stakeholder
2. **Creazione FASE 0** - Documento dettagliato infrastruttura
3. **Setup ambiente dev** - Branch dedicato, CI/CD
4. **Kickoff sviluppo** - Inizio FASE 0

---

**Autore**: AI Assistant  
**Revisore**: [Da assegnare]  
**Approvato**: [Pending]
