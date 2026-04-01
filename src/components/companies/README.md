# Company Components

## Overview

Componenti per la gestione delle aziende in ElementSicurezza (Formazione + Medicina del Lavoro). 
Segue il pattern P49 (Multi-Tenant Company) dove:

- **Company**: dati anagrafici globali (P.IVA, Ragione Sociale, Sede Legale)
- **CompanyTenantProfile**: dati commerciali per-tenant (referente, contratto, condizioni)
- **CompanySite**: sedi operative collegate al profile

## Componenti Principali

### CompanyFormNew.tsx

Form principale per creazione/modifica aziende. Include:

**Sezioni Form:**
1. **Informazioni Generali** - Ragione sociale, P.IVA, CF, SDI, PEC, Forma Giuridica, Settore, Dimensione
2. **Sede Legale** - Indirizzo, Città, CAP, Provincia della sede legale
3. **Dati Contrattuali** (solo modifica) - Date rapporto, tipo contratto, ruolo referente
4. **Condizioni Commerciali** (solo modifica) - Sconto %, termini pagamento, modalità pagamento
5. **Sedi Aziendali** - Gestione multi-sede con creazione/modifica/eliminazione
6. **Note** - Note commerciali, operative, interne

**Features:**
- Cross-tenant check P57: verifica esistenza P.IVA/CF in altri tenant
- Import cross-tenant: importa aziende esistenti invece di duplicare
- Gestione sedi inline con preview eliminazioni e ripristino

### MDLServicesCard.tsx (P58 - NUOVO)

Card unificata per servizi Medicina del Lavoro che mostra:
- **Nomine MC/RSPP** con stato, date inizio/scadenza, persona nominata
- **DVR per sede** con data firma, scadenza, esecutore
- **Tariffario associato** per tracking fatturazione
- **Badge stato**: ✓/✗ per MC, RSPP, DVR

**Features:**
- Sezioni collapsible (Nomine / DVR)
- Modal integrati per aggiunta rapida
- Tracking scadenze con warning (in scadenza, scaduto)
- Colori semantici: verde=ok, amber=warning, rosso=error

### quick-actions/ (Directory P58)

Moduli per azioni rapide dalla pagina dettaglio azienda:
- **QuickActionsIntegrated.tsx** - Pannello sticky con tutte le azioni
- **QuickActionNominaModal.tsx** - Modal nomina MC/RSPP (scadenza annuale default)
- **QuickActionSopralluogoModal.tsx** - Modal programmazione sopralluogo
- **QuickActionMansioneModal.tsx** - Modal assegnazione mansioni + rischi
- **QuickActionTariffarioModal.tsx** - Modal associazione tariffario
- **QuickActionDVRModal.tsx** - Modal upload DVR (scadenza annuale default)

### CompanySites.tsx

Gestione sedi operative con:
- Vista card per ogni sede
- Filtro per sede selezionata
- Info RSPP, MC, DVR, Sopralluoghi per sede
- Azioni rapide per modifica/elimina

### EmployeesSection.tsx

Sezione dipendenti dell'azienda con:
- Lista dipendenti con avatar e info principali
- Link a anagrafica completa
- Conteggio dipendenti

### CompanyTrainingRequirements.tsx (P58)

Visualizza requisiti formativi dell'azienda:
- Corsi in scadenza prossimi 90 giorni
- Corsi scaduti
- Link a pagina formazione con filtro azienda

### TariffariAziendaSection.tsx

Visualizza tariffari medicina lavoro associati:
- Lista prestazioni con prezzi personalizzati
- Link a gestione tariffari con filtro azienda

## Layout CompanyDetails (P58)

La pagina dettaglio azienda usa layout 2 colonne responsive (xl breakpoint):

```
┌─────────────────────────────────────┬──────────────────────────┐
│                                     │                          │
│  MAIN CONTENT (3/4)                 │  QUICK ACTIONS (1/4)     │
│                                     │  (sticky)                │
│  - Header + Info Card               │                          │
│  - MDLServicesCard (unificata)      │  - Da Completare         │
│  - CompanySites                     │  - Configurati           │
│  - EmployeesSection                 │  - Quick Links           │
│  - CompanyTrainingRequirements      │                          │
│  - TariffariAziendaSection          │                          │
│  - CompanyMansioniSection           │                          │
│                                     │                          │
├─────────────────────────────────────┴──────────────────────────┤
│                                                                 │
│  CROSS-TENANT INFO (in fondo, se applicabile)                   │
│  - Card gialla con info proprietario dati                       │
│  - Badge condivisione tenant                                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Routes MDL Collegate

- `/clinica/mdl/nomine-ruolo?companyId=X` - Gestione nomine MC/RSPP
- `/clinica/mdl/scadenze?companyId=X` - Scadenze e sopralluoghi
- `/management/tariffari-aziende?companyId=X` - Tariffari aziendale
- `/poliambulatorio/visite?companyId=X` - Visite mediche
- `/formazione/schedules?companyId=X` - Corsi azienda
- `/persons?companyId=X` - Dipendenti azienda

## File Rimossi (Legacy)

- ~~`CompanyForm.tsx`~~ - Sostituito da `CompanyFormNew.tsx`
- ~~`QuickActionsPanel.tsx`~~ - Sostituito da `quick-actions/QuickActionsIntegrated.tsx`

## Changelog

### P58 (Gennaio 2026)
- ✅ Creato MDLServicesCard - card unificata per MC/RSPP/DVR
- ✅ Creato sistema quick-actions con modal pre-compilati
- ✅ Scadenze annuali di default su tutti i modal
- ✅ Rimosso QuickActionsPanel.tsx legacy
- ✅ Layout responsive xl:grid-cols-4
- ✅ Colori ElementSicurezza (blue, non teal)
- ✅ Sezione Mansioni e Rischi
- ✅ Tracking fatturazione preparato
