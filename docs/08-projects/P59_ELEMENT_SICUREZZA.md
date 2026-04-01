# P59 - ElementSicurezza Restructuring & Enhancement

**Data Inizio**: 23 Gennaio 2026  
**Data Completamento**: 23 Gennaio 2026 ✅  
**Versione Target**: 2.7.0  
**Stato**: ✅ COMPLETATO

---

## 📋 Obiettivi

Ristrutturazione completa dell'area ElementSicurezza (MDL - Medicina Del Lavoro) con focus su:
1. Integrazione E2E delle funzionalità esistenti
2. Miglioramento UX/UI delle pagine aziende
3. Unificazione card servizi MDL con tracking fatturazione
4. Completamento quick actions mancanti

---

## 📊 Analisi Pre-Progetto

### Stato Attuale

| Componente | Status | Problemi Identificati |
|------------|--------|----------------------|
| Quick Actions | ✅ Completato | Tutti gli endpoint corretti |
| MDLServicesCard | ✅ Enhanced | Nomine + DVR + Sopralluoghi + Tariffario |
| Company Sites | ✅ Backend OK | Frontend corretto |
| Nomine Ruolo | ✅ Backend OK | Enum mapping corretto |
| Tariffario Aziendale | ✅ Integrato | Fetch da backend + visualizzazione |
| DVR Management | ✅ Completato | Card con sezione dedicata |
| Sopralluoghi | ✅ Completato | Nuova sezione collapsible |

### Fix Completati

| Issue | Causa | Fix Applicato |
|-------|-------|--------------|
| 404 `/companies/:id/sites` | Path API errato | `/company-sites/company/:id` |
| 500 nomine-ruolo | Enum mismatch | `MC` → `MEDICO_COMPETENTE` |
| DVR non fetchati | Endpoint mancante | Creato `GET /dvr/company/:id` |
| Sopralluoghi non fetchati | Endpoint mancante | Creato `GET /sopralluoghi/company/:id` |
| Tariffario hardcoded | Non fetchato | Integrato `GET /companies/:id/tariffari` |
| CompanyEditForm.tsx | File orfano con errori TS | Eliminato (318L) |
| CompanyImportConflictModal.tsx | Duplicato obsoleto | Eliminato (203L) |
| MultiSiteManager.tsx | File orfano con errori TS | Eliminato (413L) |

---

## 🎯 Sprint 1: E2E Integration Fix ✅

### Obiettivo
Correggere tutti gli endpoint API nei modali Quick Actions.

### File Modificati ✅
- [x] `src/components/companies/quick-actions/QuickActionNominaModal.tsx`
  - Endpoint: `/api/v1/company-sites/company/${companyId}`
  - Response parsing: `response.sites` invece di `response.data`
  - NOMINA_CONFIG: aggiunto `backendValue` per mapping corretto
- [x] `src/components/companies/quick-actions/QuickActionSopralluogoModal.tsx`
  - Endpoint corretto + response parsing
- [x] `src/components/companies/quick-actions/QuickActionDVRModal.tsx`
  - Endpoint corretto + response parsing

### Mapping Enum NOMINA_CONFIG
```typescript
const NOMINA_CONFIG = {
  MC: { 
    icon: Stethoscope,
    title: 'Nomina Medico Competente',
    description: '...',
    backendValue: 'MEDICO_COMPETENTE' as TipoNominaRuolo
  },
  RSPP: { 
    icon: Shield,
    title: 'Nomina RSPP',
    description: '...',
    backendValue: 'RSPP' as TipoNominaRuolo
  }
};
```

---

## 🎯 Sprint 2: Backend Endpoints & Data Fetching ✅

### Obiettivo
Creare endpoint mancanti e integrare fetch dati in CompanyDetails.

### Backend Endpoints Creati ✅
- [x] `GET /api/v1/dvr/company/:companyId` - Lista DVR per azienda
  - File: `backend/routes/dvr-routes.js`
  - Ritorna tutti i DVR di tutte le sedi dell'azienda
- [x] `GET /api/v1/sopralluoghi/company/:companyId` - Lista sopralluoghi per azienda
  - File: `backend/routes/sopralluogo-routes.js`
  - Include esecutore con nome, cognome, genere

### CompanyDetails.tsx Modifiche ✅
```typescript
// P59: Stati per DVR, Sopralluoghi e Tariffari
const [dvrs, setDvrs] = useState<DVRInfo[]>([]);
const [sopralluoghi, setSopralluoghi] = useState<SopralluogoInfo[]>([]);
const [tariffario, setTariffario] = useState<TariffarioInfo | null>(null);

// Fetch parallelo per performance
const [dvrsResponse, sopralluoghiResponse, tariffariResponse] = await Promise.allSettled([
  apiGet<{ dvrs: DVRInfo[] }>(`/api/v1/dvr/company/${id}`),
  apiGet<{ sopralluoghi: SopralluogoInfo[] }>(`/api/v1/sopralluoghi/company/${id}`),
  apiGet<{ success: boolean; data: TariffarioInfo[] }>(`/api/v1/companies/${id}/tariffari`)
]);
```

### Quick Actions Verificate ✅
| Action | Modal | Status | Descrizione |
|--------|-------|--------|-------------|
| Nomina MC | QuickActionNominaModal | ✅ | Crea nomina Medico Competente |
| Nomina RSPP | QuickActionNominaModal | ✅ | Crea nomina RSPP |
| Sopralluogo | QuickActionSopralluogoModal | ✅ | Programma/Modifica sopralluogo (edit mode supportato) |
| DVR | QuickActionDVRModal | ✅ | Gestione DVR |
| Tariffario | QuickActionTariffarioModal | ✅ | Assegna tariffario aziendale |
| Mansione | QuickActionMansioneModal | ✅ | Gestione mansioni |
| Aggiungi Sede | QuickActionSiteModal | ✅ | Crea nuova sede aziendale |

### Funzionalità Aggiornate (Gennaio 2026)

#### QuickActionSopralluogoModal
- ✅ **Edit Mode**: Supporto per modifica sopralluoghi esistenti via prop `editingSopralluogoId`
- ✅ **DatePicker Moderno**: Sostituito input date nativo con react-datepicker localizzato italiano
- ✅ **PUT Support**: apiUpload supporta method override per aggiornamenti

#### PersonCore - Ricerca RSPP/MC
- ✅ **Specialties Search**: La ricerca per roleType (RSPP, MC, etc.) ora include anche persone con quelle specializzazioni nel profilo tenant
- ✅ **Tenant Filter**: Filtro corretto per tenantId attraverso PersonRole.tenantId (P48 compliance)

---

## 🎯 Sprint 3: MDLServicesCard Enhancement ✅

### Obiettivo
Creare card unificata che mostra tutti i servizi MDL con tracking fatturazione.

### Implementazione Completata ✅

#### MDLServicesCard.tsx Modifiche
- [x] Aggiunta interfaccia `SopralluogoInfo` con tracking fatturazione
- [x] Props estesi con `sopralluoghi?: SopralluogoInfo[]`
- [x] Stato `expandedSection` aggiornato per includere 'sopralluoghi'
- [x] Badge riepilogativo sopralluoghi nell'header
- [x] Sezione collapsible "Sopralluoghi" con:
  - Lista sopralluoghi (max 5 visibili, link "Vedi tutti")
  - Badge esito (Positivo/Negativo/In corso)
  - Date esecuzione e prossimo sopralluogo
  - Esecutore con nome completo
  - Tracking tariffa se applicata
  - Link rapido per programmare nuovo sopralluogo

#### Struttura Card Finale
```
┌─────────────────────────────────────────────────────────────────┐
│ 🏥 Servizi Medicina del Lavoro                                  │
│ [MC ✓] [RSPP ✓] [DVR 2/3] [Sopralluoghi 4] [Tariffario]        │
├─────────────────────────────────────────────────────────────────┤
│ 📋 Nomine Figure Sicurezza (2/2 configurate)            [▼]     │
│   ├── Medico Competente: Dott. Rossi | Scadenza 01/01/2029     │
│   └── RSPP: Ing. Bianchi | Scadenza 15/03/2029                 │
├─────────────────────────────────────────────────────────────────┤
│ 📄 DVR - Documenti Valutazione Rischi (2 sedi)          [▼]     │
│   ├── Sede Milano: Firmato 10/01/2026 | Scade 10/01/2029       │
│   └── Sede Roma: ⚠️ DVR mancante                                │
├─────────────────────────────────────────────────────────────────┤
│ 🔍 Sopralluoghi (4 registrati)                          [▼]     │
│   ├── Milano: 15/01/2026 | Esito: Positivo | Prossimo: 15/07   │
│   └── Roma: 20/01/2026 | Esito: Da verificare                  │
├─────────────────────────────────────────────────────────────────┤
│ 💰 Tariffario: Tariffario Base MDL 2026                [Gestisci]│
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Sprint 4: Company Form MDL Tab ✅

### Obiettivo
Verificare che il form azienda abbia una sezione MDL per configurare i servizi.

### Verifica Completata ✅
Il form `CompanyFormNew.tsx` già include una sezione MDL (righe 1152-1260):
- [x] Sezione collapsible "Servizi Medicina del Lavoro"
- [x] Visibile solo in modalità edit
- [x] Quick Actions disponibili:
  - Nomina MC, Nomina RSPP
  - Programma Sopralluogo
  - Gestisci DVR
  - Configura Tariffario

### Flow Corretto
1. Crea azienda con dati base → Salva
2. Apri azienda in modifica → Sezione MDL disponibile
3. Configura servizi tramite Quick Actions

**Nota**: Il flow è corretto perché le Quick Actions richiedono `siteId` che esiste solo dopo la creazione.

---

## 🎯 Sprint 5: Cleanup Legacy ✅

### Obiettivo
Rimuovere tutti i file legacy non più necessari.

### File Eliminati ✅
| File | Linee | Motivo |
|------|-------|--------|
| `CompanyImportConflictModal.tsx` (in companies/) | 203 | Duplicato obsoleto - versione aggiornata in company-import/ |
| `CompanyEditForm.tsx` | 318 | Orfano, ha errori TS, sostituito da CompanyFormNew.tsx |
| `MultiSiteManager.tsx` | 413 | Orfano, ha errori TS, non importato |

### Verifiche Completate ✅
- [x] Build passing dopo eliminazioni (11.88s)
- [x] Nessun import rotto
- [x] Nessun breaking change
- [x] Cartella `/archives` già pulita (P58)

---

## 📦 Deliverables

### Componenti Creati/Modificati
| File | Azione | Descrizione |
|------|--------|-------------|
| QuickActionNominaModal.tsx | ✅ Fixato | Endpoint + enum mapping |
| QuickActionSopralluogoModal.tsx | ✅ Fixato | Endpoint fix |
| QuickActionDVRModal.tsx | ✅ Fixato | Endpoint fix |
| MDLServicesCard.tsx | ✅ Enhanced | Card unificata con sopralluoghi + fatturazione |
| CompanyDetails.tsx | ✅ Modificato | Fetch DVR/Sopralluoghi/Tariffari |
| CompanyFormNew.tsx | ✅ Verificato | Sezione MDL già presente |
| dvr-routes.js | ✅ Nuovo endpoint | GET /company/:id |
| sopralluogo-routes.js | ✅ Nuovo endpoint | GET /company/:id |
| CompanyEditForm.tsx | ❌ Eliminato | 318L legacy orfano |
| CompanyImportConflictModal.tsx | ❌ Eliminato | 203L duplicato obsoleto |
| MultiSiteManager.tsx | ❌ Eliminato | 413L legacy orfano |

### API Endpoints Utilizzati
| Endpoint | Metodo | Descrizione |
|----------|--------|-------------|
| `/api/v1/company-sites/company/:id` | GET | Lista sedi azienda |
| `/api/v1/clinica/nomine-ruolo` | POST | Crea nomina |
| `/api/v1/clinica/nomine-ruolo` | GET | Lista nomine |
| `/api/v1/clinica/sopralluoghi` | GET/POST | Gestione sopralluoghi |
| `/api/v1/clinica/dvr` | GET/POST | Gestione DVR |
| `/api/v1/tariffari/azienda/:id` | GET | Tariffario assegnato |

---

## 🔐 Security & Compliance

### Multi-Tenancy ✅
- Tutti gli endpoint filtrano per `tenantId`
- Nomine/DVR/Sopralluoghi legati a `companyTenantProfileId`

### GDPR ✅
- Audit log su modifiche
- Soft delete implementato

---

## 📈 Metriche Successo

| Metrica | Target | Attuale |
|---------|--------|---------|
| Quick Actions funzionanti | 6/6 | 4/6 |
| Card MDL con fatturazione | 100% | 0% |
| Tab MDL in form | 100% | 0% |
| Zero errori console | 0 | 0 (dopo fix) |
| Build passing | ✅ | ✅ |

---

## 📝 Note Tecniche

### No Legacy Support
Come da direttiva, NON viene aggiunto supporto backward compatibility.
I fix sono diretti senza fallback.

### Endpoint Corretti
```javascript
// ✅ CORRETTO - Company Sites
GET /api/v1/company-sites/company/{companyTenantProfileId}

// ✅ CORRETTO - DVR per azienda (P59 NEW)
GET /api/v1/dvr/company/{companyTenantProfileId}

// ✅ CORRETTO - Sopralluoghi per azienda (P59 NEW)
GET /api/v1/sopralluoghi/company/{companyTenantProfileId}

// ✅ CORRETTO - Tariffari azienda
GET /api/v1/companies/{companyTenantProfileId}/tariffari

// ❌ SBAGLIATO (non esiste)
GET /api/v1/companies/{id}/sites
```

### Enum Mapping
```typescript
// Frontend → Backend
'MC' → 'MEDICO_COMPETENTE'
'RSPP' → 'RSPP'
```

---

## 🎯 Sprint 6: Tariffari Aziendali Optimization (26 Gennaio 2026)

### Obiettivo
Ottimizzare la gestione tariffari con PDF generation, inline editing e scheduling.

### Fix Backend
| Issue | Causa | Fix |
|-------|-------|-----|
| PDF 500 error | Campo `Tenant.nome` inesistente | Cambiato in `Tenant.name` |
| Select warnings | `onValueChange` su `<select>` nativo | Cambiato in `onChange` |
| DVR/Sopralluogi 404 | Azienda cross-tenant | Supporto dataShareConsents + empty array |

### VoceCard Inline Editing ✅
File: `TariffarioAziendaleForm.tsx`
- [x] Editing inline per `prezzoBase`
- [x] Editing inline per `fasceDipendenti` (fasce prezzi)
- [x] Select corretti con `onChange` (non `onValueChange`)
- [x] Switch per `usaFasceDipendenti`
- [x] Salvataggio via API `updateVoce()` e `updateFascia()`

### QuickActionTariffarioModal Enhancement ✅
File: `QuickActionTariffarioModal.tsx`
- [x] Sezione "Programmazione Validità" collapsible
- [x] Checkbox "Tariffario Promozionale" 
- [x] Date picker `validoDa` / `validoA`
- [x] Selector tariffario successore (alla scadenza)
- [x] Validazione: scadenza obbligatoria se c'è successore
- [x] Info box con data passaggio automatico

### Backend TariffarioAziendaleService ✅
File: `backend/services/management/TariffarioAziendaleService.js`
- [x] Supporto `successoreId` nel clone
- [x] Supporto `isPromozione` flag
- [x] Nome automatico `[PROMO]` per promozioni
- [x] Note automatiche con prefix `[PROMOZIONE]`

### Quick Actions Visibility ✅
File: `QuickActionsIntegrated.tsx`
- [x] OT23, Allegato3B, Tariffario sempre visibili
- [x] Non più legati a `hasMDLServices`

---

## 🎯 Sprint 7: Bug Fixes & Quick Action Modals (27 Gennaio 2026)

### Obiettivo
Correggere bug residui (PDF, email search) e completare i modali quick action per OT23 e Allegato3B.

### Fix Backend - PDF Generation ✅
File: `backend/services/management/TariffarioAziendaleService.js`
| Issue | Causa | Fix |
|-------|-------|-----|
| PDF 500 error | Campo `Tenant.logoUrl` inesistente | Letto da `tenant.settings` JSON |
| Select tenant | Campi non esistenti | `{ name: true, settings: true }` |

```javascript
// ✅ FIX: Logo URL da settings JSON
const tenantSettings = tenant?.settings && typeof tenant.settings === 'object' ? tenant.settings : {};
const logoUrl = tenantSettings.logoUrl || tenantSettings.logo || null;
```

### Fix Backend - Person Email Search (P48 Compliance) ✅
La ricerca email deve usare `tenantProfiles` invece di `Person` diretto.

**Files Modificati:**
| File | Problema | Fix |
|------|----------|-----|
| `personController.js` | `Unknown argument 'email'` | Search via `tenantProfiles.some.email` |
| `roles/users.js` | Campi Person non esistenti | Filtri via tenantProfiles relation |
| `roleTypeController.js` | Email search invalid | Include tenantProfiles nel select |

```javascript
// ✅ P48 Pattern - Email in PersonTenantProfile, NON in Person
where: {
  tenantProfiles: {
    some: {
      email: { contains: search, mode: 'insensitive' },
      tenantId: tenantId
    }
  }
}
```

### TariffarioCard Auto-Refresh ✅
File: `src/pages/companies/CompanyDetails.tsx`
- [x] Aggiunto `refreshTrigger` state
- [x] `handleActionComplete` incrementa trigger
- [x] `TariffariAziendaSection` con `key={tariffari-${refreshTrigger}}` per force re-render

```typescript
const [refreshTrigger, setRefreshTrigger] = useState(0);

const handleActionComplete = () => {
  // ... existing code
  setRefreshTrigger(prev => prev + 1);
};

<TariffariAziendaSection key={`tariffari-${refreshTrigger}`} ... />
```

### Nuovi Modali Quick Action ✅

**1. QuickActionOT23Modal.tsx** (NUOVO)
File: `src/components/companies/quick-actions/QuickActionOT23Modal.tsx`
- [x] Form completo: anno, PAT, premio annuale, note
- [x] Lista domande OT23 esistenti per l'azienda
- [x] Validazione anno non duplicato
- [x] API: `POST /api/v1/sicurezza/ot23`

**2. QuickActionAllegato3BModal.tsx** (NUOVO)
File: `src/components/companies/quick-actions/QuickActionAllegato3BModal.tsx`
- [x] Select Medico Competente da nomine-ruoli
- [x] Form completo: anno, note
- [x] Lista allegati esistenti per l'azienda
- [x] API: `POST /api/v1/clinica/allegato-3b`

**3. QuickActionsIntegrated.tsx** (Aggiornato)
File: `src/components/companies/quick-actions/QuickActionsIntegrated.tsx`
- [x] ModalType esteso: `'ot23' | 'allegato3b'`
- [x] Azioni 7 e 8 cambiate da `href` a `modalType`
- [x] Importati e integrati i due nuovi modali

```typescript
type ModalType = 'nomina' | 'sopralluogo' | 'dvr' | 'tariffario' | 'ot23' | 'allegato3b' | null;

// Azione OT23
{ id: 7, ..., modalType: 'ot23' as const }
// Azione Allegato3B  
{ id: 8, ..., modalType: 'allegato3b' as const }
```

---

## 🎯 Sprint 8: PDF & Endpoints Refinement (23 Gennaio 2026)

### Obiettivo
Correggere errori residui endpoints e migliorare PDF download.

### Fix Frontend - PDF Download ✅
File: `src/services/tariffarioAziendaleApi.ts`
- [x] Aggiunto header `X-Frontend-Id` nel fetch nativo per multi-tenant
- [x] Logging migliorato per debug errori
- [x] Messaggi errore più descrittivi

```typescript
const response = await fetch(url, {
    method: 'GET',
    headers: {
        'Authorization': `Bearer ${token}`,
        'X-Frontend-Id': brandId, // Importante per il multi-tenant
    },
});
```

### Fix Frontend - Endpoint nomine-ruolo ✅
File: `src/components/companies/quick-actions/QuickActionAllegato3BModal.tsx`
| Issue | Causa | Fix |
|-------|-------|-----|
| 404 nomine-ruoli | Path sbagliato | `/api/v1/clinica/nomine-ruolo` (singolare) |
| isActive invalid | Campo non esistente | Usa `stato=ATTIVA` invece |

```typescript
// ❌ SBAGLIATO
`/api/v1/nomine-ruoli?...&isActive=true`
// ✅ CORRETTO  
`/api/v1/clinica/nomine-ruolo?...&stato=ATTIVA`
```

### Fix Frontend - TariffariAziendaSection Visibility ✅
File: `src/pages/companies/CompanyDetails.tsx`
- [x] TariffariAziendaSection ora visibile anche senza MDL services se ha tariffario
- [x] Condizione: `hasMDLServices(company) || hasTariffariConfigured`

```typescript
// Prima: mostrata solo se ha servizi MDL
{hasMDLServices(company) && <TariffariAziendaSection />}

// Dopo: mostrata se ha MDL services O ha tariffari associati
{(hasMDLServices(company) || hasTariffariConfigured) && <TariffariAziendaSection />}
```

---

## 📅 Timeline

| Sprint | Descrizione | Durata | Status |
|--------|-------------|--------|--------|
| Sprint 1 | E2E Fix (Quick Actions endpoints) | 0.5 giorni | ✅ |
| Sprint 2 | Backend Endpoints + Data Fetching | 0.5 giorni | ✅ |
| Sprint 3 | MDL Card Enhancement (Sopralluoghi) | 0.5 giorni | ✅ |
| Sprint 4 | Company Form Tab (verificato esistente) | 0.25 giorni | ✅ |
| Sprint 5 | Cleanup Legacy | 0.25 giorni | ✅ |
| Sprint 6 | Tariffari Optimization | 0.5 giorni | ✅ |
| Sprint 7 | Bug Fixes & Quick Action Modals | 0.5 giorni | ✅ |
| Sprint 8 | PDF & Endpoints Refinement | 0.25 giorni | ✅ |
| Sprint 9 | PDF Optimization & Compliance Verification | 0.5 giorni | ✅ |

**Totale Stimato**: 4.25 giorni  
**Completato**: 4.25 giorni (100%) ✅

---

## 🎯 Sprint 9: PDF Optimization & Compliance Verification (28 Gennaio 2026)

### Obiettivo
Ottimizzare template PDF tariffario, creare card dedicata TariffarioCompanyCard, e verificare conformità normativa OT23/Allegato3B.

### PDF Template Optimization ✅
File: `backend/public/templates/tariffario-aziendale.html`
| Modifica | Prima | Dopo |
|----------|-------|------|
| Badge size | `7pt, 2px padding` | `6pt, 1px padding` |
| Column width Tipo | `80px` | `60px` |
| Column width Frequenza | `auto` | `55px` |
| Column width Unità | `auto` | `45px` |

File: `backend/services/management/TariffarioAziendaleService.js`
- [x] Nuove costanti abbreviazione: `TIPO_VOCE_ABBR`, `FREQUENZA_ABBR`, `UNITA_ABBR`
- [x] Mapping abbreviazioni in PDF data: `tipoAbbr`, `frequenzaAbbr`, `unitaAbbr`

```javascript
// Abbreviazioni per PDF compatto
const TIPO_VOCE_ABBR = {
    'PRESTAZIONE_MDL': 'PREST', 
    'TARIFFA_FISSA': 'FISSA',
    'RICORRENTE': 'RIC.',
    'SOPRALLUOGO_MC': 'SOPR.MC',
    ...
};
```

### TariffarioCompanyCard ✅
File: `src/components/companies/TariffarioCompanyCard.tsx` (NUOVO - 200+ lines)
- [x] Card prominente quando azienda ha tariffario associato
- [x] Badge status: Attivo (verde), Scaduto (rosso), Futuro (blu), In scadenza (giallo)
- [x] Info: Nome, Codice, Tipo badge, Date validità, Conteggio voci
- [x] Actions: Visualizza dettaglio, Stampa PDF
- [x] Design: Emerald gradient background, elegante e compatto

File: `src/pages/companies/CompanyDetails.tsx`
- [x] Import e integrazione TariffarioCompanyCard
- [x] Posizione: tra MDLServicesCard e Allegato3BCard
- [x] Condizione: `hasTariffariConfigured && tariffario`

### OT23 Compliance Verification ✅
**Conforme a INAIL Modello OT23 2024:**
- ✅ Sezione A: Partecipazione attiva INAIL (A-1.1, A-1.2, A-2.1)
- ✅ Sezione B: 6 categorie (Organizzative, Tecniche, Formazione, Sorveglianza, Emergenze, Altro)
- ✅ Soglia 100 punti per beneficio
- ✅ Tabella riduzioni INAIL (28%/18%/10%/5%)
- ✅ Workflow stati completo
- ✅ XML export per trasmissione INAIL

### Allegato3B Compliance Verification ✅
**Conforme a D.Lgs 81/08 Art. 40:**
- ✅ Dati statistici aggregati (lavoratori, visite, giudizi)
- ✅ Breakdown per genere e fascia età
- ✅ Giudizi idoneità con limitazioni/prescrizioni/inidoneità
- ✅ Statistiche per rischio
- ✅ Anonimizzazione dati (no PII)
- ✅ XML INAIL format per trasmissione telematica

### E2E Tests ✅
File: `tests/e2e/ot23-allegato3b.spec.ts` (NUOVO - 400+ lines)
- [x] OT23-001 a OT23-009: Test navigazione, dashboard, catalogo, calcolo risparmio, tabella riduzioni, interventi sezioni A/B
- [x] A3B-001 a A3B-008: Test navigazione, dashboard annuale, struttura dati, giudizi, KPI, export XML
- [x] INT-001 a INT-003: Integration tests per cards in CompanyDetails

---

## 🎯 Sprint 10: Tariffario Modal Enhancement ✅

### Obiettivo
Migliorare UX del modal "Associa Tariffario" e fixare bug visualizzazione.

### Bug Fix Critico ✅
**Problema**: Tariffario non visualizzato in CompanyDetails dopo associazione
**Causa**: Mismatch campo `isActive` (frontend) vs `attivo` (backend Prisma)
**Fix applicato a 3 file**:
- `src/pages/companies/CompanyDetails.tsx` - Interface + uso
- `src/components/companies/TariffarioCompanyCard.tsx` - Interface + uso
- `src/components/companies/MDLServicesCard.tsx` - Interface + uso

### QuickActionTariffarioModal.tsx Rewrite ✅
File riscritto completamente con nuove funzionalità:

#### Nuove Features
| Feature | Descrizione |
|---------|-------------|
| **Ultimi Utilizzati** | Sezione dedicata con ultimi 3 tariffari (ordinati per updatedAt) |
| **Searchbar** | Ricerca prominente in alto con debounce |
| **Quick Look** | Pulsante Eye per anteprima voci in-place (tabella espandibile) |
| **Convenzione** | Badge Handshake per mostrare convenzione associata (read-only) |
| **Programmazione Compatta** | Accordion collapsible per date validità |
| **Layout Ottimizzato** | max-h-[70vh] + overflow-y-auto per evitare overflow |

#### Rimozioni
- ❌ Sezione "Voci incluse" (sostituita da quick look)
- ❌ Campo "Sconto percentuale" (sostituito da visualizzazione convenzione)

#### UI Improvements
```tsx
// Sezioni lista tariffari
<div className="px-3 py-2 bg-gray-100 border-b sticky top-0">
    <h4 className="text-xs font-semibold uppercase flex items-center gap-1">
        <Clock /> Ultimi Utilizzati
    </h4>
</div>

// Quick Look
<button onClick={() => setQuickLookId(tariffario.id)}>
    <Eye className="h-4 w-4" />
</button>
{isQuickLookOpen && (
    <div className="bg-gray-50 p-3">
        <table>...</table>
    </div>
)}

// Convenzione (read-only)
{tariffario.convenzione && (
    <span className="bg-purple-100 text-purple-700">
        <Handshake /> {convenzione.nome}
    </span>
)}
```

### Verifica Campo Convenzione ✅
- `TariffarioAziendaleDetails.tsx` - Già presente (righe 218-221)
- `TariffarioAziendaleForm.tsx` - Già presente (righe 452-461)
- Backend include convenzione in tutte le query

---

## 📈 Metriche Successo (Finali)

| Metrica | Target | Attuale |
|---------|--------|---------|
| Quick Actions funzionanti | 8/8 | ✅ 8/8 |
| Card MDL con Sopralluoghi | 100% | ✅ 100% |
| Card MDL con Tariffario | 100% | ✅ 100% |
| Tab MDL in form | 100% | ✅ 100% (già esistente) |
| File legacy eliminati | 3 | ✅ 3 (934L rimossi) |
| Zero errori console | 0 | ✅ 0 |
| Build passing | ✅ | ✅ (11.88s) |
| PDF Generation | ✅ | ✅ (fixed Tenant.name + logoUrl) |
| PDF Template Compact | ✅ | ✅ (abbreviazioni + sizing) |
| Tariffario Scheduling | ✅ | ✅ (validità + successore) |
| TariffarioCompanyCard | ✅ | ✅ (nuovo componente) |
| OT23 Quick Action Modal | ✅ | ✅ (nuovo) |
| Allegato3B Quick Action Modal | ✅ | ✅ (nuovo) |
| OT23 INAIL Compliance | ✅ | ✅ (verificato) |
| Allegato3B D.Lgs 81/08 Compliance | ✅ | ✅ (verificato) |
| E2E Tests OT23/Allegato3B | ✅ | ✅ (20+ test cases) |
| P48 Email Search Compliance | ✅ | ✅ (3 files fixed) |
| **Tariffario Modal Enhanced** | ✅ | ✅ (Sprint 10) |
| **Bug isActive→attivo fix** | ✅ | ✅ (3 files fixed) |
| **Quick Look feature** | ✅ | ✅ (anteprima voci) |
| **Convenzione display** | ✅ | ✅ (read-only badge) |
| **Multi-tenancy Tariffari** | ✅ | ✅ (Sprint 11) |
| **Card Aziende Associate** | ✅ | ✅ (Sprint 11) |
| **Default tipo=BASE** | ✅ | ✅ (Sprint 11) |

---

## 🎯 Sprint 11: Tariffari Multi-tenancy Fix ✅

### Obiettivo
Risolvere i problemi critici di multi-tenancy e UX nella gestione tariffari.

### Problemi Risolti

#### 1. Multi-tenancy Modal "Associa Tariffario" ✅
**Problema**: Il modal mostrava tariffari di altri tenant
**Root Cause**: `QuickActionTariffarioModal` non usava `useTenantFilter`
**Fix**: 
- Aggiunto import e uso di `useTenantFilter` hook
- Passaggio `tenantIds` a tutte le chiamate API
- File: `src/components/companies/quick-actions/QuickActionTariffarioModal.tsx`

```tsx
const { getTenantFilterParams, isReady: tenantReady } = useTenantFilter();
// ...
const response = await apiGet('/api/v1/tariffari-aziendali', {
    ...getTenantFilterParams(),
    tipo: 'BASE',
    attivo: 'true'
});
```

#### 2. Lista Tariffari Mostra Copie ✅
**Problema**: `/management/tariffari-aziende` mostrava sia BASE che AZIENDALE (cloni)
**Root Cause**: Default `tipoFilter = 'ALL'`
**Fix**: Cambiato default a `tipo = 'BASE'`
**File**: `src/pages/management/tariffari-aziende/TariffariAziendePage.tsx`

```tsx
// P59 Sprint 11: Default a 'BASE' per mostrare solo i tariffari template
const [tipoFilter, setTipoFilter] = useState<TipoTariffario | 'ALL'>('BASE');
```

#### 3. Quick Look Non Funzionante ✅
**Problema**: Eye button non mostrava le voci del tariffario
**Root Cause**: Backend non supportava `includeVoci` in `getAll()`
**Fix**: Fetch separato delle voci quando si apre il quick look
**File**: `QuickActionTariffarioModal.tsx`

```tsx
const fetchQuickLookVoci = useCallback(async (tariffarioId: string) => {
    const response = await apiGet(`/api/v1/tariffari-aziendali/${tariffarioId}`);
    setQuickLookVoci(response.data?.voci || []);
}, []);
```

#### 4. Card Aziende Associate ✅
**Problema**: Non si vedeva quali aziende usano un tariffario BASE
**Fix Backend**: Aggiunto `tariffariDerivati` con info azienda in `tariffarioInclude`
**Fix Frontend**: Nuova card in sidebar di `TariffarioAziendaleDetails.tsx`
**Files**:
- `backend/services/management/TariffarioAziendaleService.js`
- `src/pages/management/tariffari-aziende/TariffarioAziendaleDetails.tsx`
- `src/services/tariffarioAziendaleApi.ts` (tipo `TariffarioDerivato`)

```tsx
{tariffario.tipo === 'BASE' && (
    <Card>
        <CardTitle>
            <Building2 /> Aziende Associate
            <Badge>{tariffario._count?.tariffariDerivati}</Badge>
        </CardTitle>
        {tariffario.tariffariDerivati?.map(derivato => (
            <Link to={`/companies/${derivato.companyTenantProfile?.company?.id}`}>
                {derivato.companyTenantProfile?.company?.ragioneSociale}
            </Link>
        ))}
    </Card>
)}
```

#### 5. TariffariAziendaSection Multi-tenancy ✅
**Problema**: Sezione tariffari in CompanyDetails senza filtro tenant
**Fix**: Aggiunto `useTenantFilter` alla sezione
**File**: `src/components/companies/TariffariAziendaSection.tsx`

### File Modificati Sprint 11
| File | Modifiche |
|------|-----------|
| `QuickActionTariffarioModal.tsx` | Riscritto con useTenantFilter, quick look separato |
| `TariffariAziendePage.tsx` | Default `tipo='BASE'` |
| `TariffarioAziendaleDetails.tsx` | Card aziende associate, import ExternalLink |
| `TariffarioAziendaleService.js` | Include `tariffariDerivati` con companyTenantProfile |
| `tariffarioAziendaleApi.ts` | Tipo `TariffarioDerivato` |
| `TariffariAziendaSection.tsx` | useTenantFilter hook |

### Design Pattern Tariffari (Chiarito)

> ⚠️ **DEPRECATO**: Il pattern clone è stato sostituito con M2M in Sprint 11.1

---

## 🎯 Sprint 11.1: Migrazione da Clone a M2M ✅

**Data**: 23 Gennaio 2026  
**Stato**: ✅ COMPLETATO

### Problema Fondamentale
Il pattern clone creava duplicati dei tariffari ogni volta che un tariffario veniva associato ad un'azienda. Questo causava:
1. Dati duplicati nel database
2. Modifiche al tariffario originale non propagate alle aziende
3. Lista tariffari piena di cloni invece di tariffari unici

### Soluzione: Architettura Many-to-Many (M2M)

Un tariffario ora può essere associato a multiple aziende tramite una tabella pivot, senza creare copie.

### Schema Prisma - Modifiche

```prisma
// RIMOSSO dal modello TariffarioAziendale:
// - tipo TipoTariffario (non più BASE/AZIENDALE)
// - companyTenantProfileId (relazione diretta)
// - tariffarioOrigineId, tariffarioOrigine, tariffariDerivati (pattern clone)

// AGGIUNTO - Tabella pivot M2M
model TariffarioCompanyAssociation {
    id                    String   @id @default(uuid())
    tariffarioId          String
    companyTenantProfileId String
    validoDa              DateTime @default(now())
    validoA               DateTime?
    attivo                Boolean  @default(true)
    note                  String?  @db.Text
    tenantId              String
    createdAt             DateTime @default(now())
    updatedAt             DateTime @updatedAt
    deletedAt             DateTime?

    tariffario            TariffarioAziendale @relation(...)
    companyTenantProfile  CompanyTenantProfile @relation(...)
    tenant                Tenant @relation(...)
}
```

### Backend - Nuovi Metodi

| Metodo | Descrizione |
|--------|-------------|
| `associate(tariffarioId, companyTenantProfileId, tenantId, data)` | Crea associazione M2M |
| `dissociate(tariffarioId, companyTenantProfileId, tenantId)` | Rimuove associazione (soft delete) |
| `getByCompanyProfile(companyTenantProfileId, tenantId)` | Lista tariffari associati a un'azienda |
| `getAssociatedCompanies(tariffarioId, tenantId)` | Lista aziende associate a un tariffario |

### Backend - Nuove Routes

```javascript
POST   /api/v1/tariffari-aziendali/:id/associate        // Associa tariffario
DELETE /api/v1/tariffari-aziendali/:id/dissociate/:cid  // Dissocia tariffario
GET    /api/v1/tariffari-aziendali/:id/companies        // Lista aziende associate
GET    /api/v1/companies/:id/tariffari                  // (già esistente, ora usa M2M)
```

### Frontend - Modifiche

| Componente | Modifiche |
|------------|-----------|
| `QuickActionTariffarioModal.tsx` | Endpoint `/associate` invece di `/clone` |
| `TariffariAziendaSection.tsx` | Query via M2M, pulsante dissociazione |
| `TariffarioAziendaleDetails.tsx` | Card aziende associate via M2M |
| `tariffarioAziendaleApi.ts` | Nuovi tipi e metodi per M2M |

### Nuovo Design Pattern Tariffari

```
TariffarioAziendale
├── id, codice, nome, voci[]
└── companyAssociations[] ─────► TariffarioCompanyAssociation
                                  ├── companyTenantProfileId
                                  ├── validoDa, validoA
                                  ├── attivo, note
                                  └── tenantId

CompanyTenantProfile
└── tariffariAssociations[] ───► [stesse associazioni M2M]
```

### Benefici della Migrazione
1. **Zero duplicazione dati**: Un tariffario esiste una sola volta
2. **Modifiche centralizzate**: Aggiorna il tariffario, tutte le aziende vedono i cambiamenti
3. **Date di validità per associazione**: Ogni azienda può avere date diverse
4. **Note per associazione**: Condizioni specifiche per ogni azienda
5. **Soft delete per associazione**: Storico mantenuto

### File Modificati Sprint 11.1

| File | Modifiche |
|------|-----------|
| `backend/prisma/schema.prisma` | Nuovo modello TariffarioCompanyAssociation |
| `backend/services/management/TariffarioAziendaleService.js` | Metodi M2M |
| `backend/routes/tariffario-aziendale-routes.js` | Nuove routes M2M |
| `src/components/companies/quick-actions/QuickActionTariffarioModal.tsx` | M2M endpoint |
| `src/components/companies/TariffariAziendaSection.tsx` | M2M query, dissociate |
| `src/pages/management/tariffari-aziende/TariffarioAziendaleDetails.tsx` | Card aziende |
| `src/services/tariffarioAziendaleApi.ts` | Tipi e metodi M2M |

---

## 🎯 Sprint 11.2: Cross-Tenant DVR/Sopralluoghi Fix & UX Enhancements ✅

**Data**: 26 Gennaio 2026  
**Stato**: ✅ COMPLETATO

### Problema Critico: DVR Non Visibili Dopo Salvataggio

**Sintomo**: Utente admin salva DVR, riceve "DVR salvato con successo", ma dopo refresh non appare nella lista.

**Root Cause Identificata**: L'header `X-Operate-Tenant-Id` non era incluso nella configurazione CORS, causando il browser a ignorarlo silenziosamente. Di conseguenza:
- GET DVR usava il `tenantId` dell'utente admin invece di quello dell'azienda
- Query restituiva 0 risultati perché cercava nel tenant sbagliato

### Fix CORS per Cross-Tenant ✅

Aggiunto `X-Operate-Tenant-Id` e `x-operate-tenant-id` agli `allowedHeaders` in **5 file**:

| File | Descrizione |
|------|-------------|
| `backend/config/cors.js` | Config development + production |
| `backend/proxy/config/cors.js` | Proxy CORS config |
| `backend/proxy/config/index.js` | Proxy corsConfig |
| `backend/routes/config.js` | Routes CORS config |
| `backend/routing/middleware/routeMiddleware.js` | Fallback CORS headers |

```javascript
allowedHeaders: [
  'Content-Type',
  'Authorization',
  'X-Tenant-ID',
  'X-Frontend-Id',
  'X-Operate-Tenant-Id', // P59: Cross-tenant operations
  'x-operate-tenant-id', // lowercase version
  // ...
]
```

### Fix Frontend API Functions ✅

**File**: `src/services/api.ts`

Aggiunti parametri `options?: { headers?: Record<string, string> }` a:
- `apiDelete<T>(url, options?)` - Per passare headers custom
- `apiPut<T>(url, data, options?)` - Per passare headers custom

### Fix MDLServicesCard Cross-Tenant ✅

**File**: `src/components/companies/MDLServicesCard.tsx`

| Modifica | Descrizione |
|----------|-------------|
| `tenantId?: string` prop | Ricevuto da CompanyDetails |
| `operateTenantHeaders` | Prepara header `X-Operate-Tenant-Id` |
| `handleDeleteDVR()` | Passa headers a apiDelete |
| `handleDeleteSopralluogo()` | Passa headers a apiDelete |
| Pass to modals | `tenantId` prop ai QuickAction modals |

### Fix QuickAction Modals Cross-Tenant ✅

**Files**:
- `src/components/companies/quick-actions/QuickActionDVRModal.tsx`
- `src/components/companies/quick-actions/QuickActionSopralluogoModal.tsx`

| Modifica | Descrizione |
|----------|-------------|
| `tenantId?: string` prop | Per cross-tenant operations |
| `operateTenantHeaders` | Header preparato per apiUpload |
| `apiUpload(url, formData, { headers })` | Passa headers cross-tenant |

### Fix CompanyDetails tenantId Propagation ✅

**File**: `src/pages/companies/CompanyDetails.tsx`

```tsx
<MDLServicesCard
    companyId={id!}
    companyName={company.ragioneSociale}
    tenantId={company.tenantId} // P59: Cross-tenant operations
    // ...
/>
```

### UX Enhancement: Card Sopralluoghi ✅

**File**: `src/components/companies/MDLServicesCard.tsx`

#### Nuovi Helper Functions
```typescript
// Determina tipo MC/RSPP dalla valutazione
getSopralluogoTipo(valutazione?: string): { tipo, label, className, icon }

// Estrae tipo visita (Ordinario/Straordinario/Verifica)
getSopralluogoTipoVisita(valutazione?: string): string | null
```

#### Card Sopralluogo Redesign
| Elemento | Prima | Dopo |
|----------|-------|------|
| **Tipo MC/RSPP** | Non visibile | Badge prominente con icona (teal/blue) |
| **Tipo Visita** | Non visibile | Badge secondario (Ordinario/Straordinario/Verifica) |
| **Border** | Grigio uniforme | Border-left colorato (teal MC, blue RSPP) |
| **Sede** | Solo nome | Nome + città tra parentesi |
| **Layout** | Compatto | Badges in header, info sotto |

```tsx
// Badge tipo sopralluogo
<span className={tipoInfo.className}>
    {tipoInfo.icon === 'stethoscope' && <Stethoscope />}
    {tipoInfo.icon === 'shield' && <Shield />}
    {tipoInfo.label}
</span>

// Badge tipo visita
{tipoVisita && (
    <span className="bg-gray-100 text-gray-600">
        {tipoVisita}
    </span>
)}
```

### Fix Filtro Operatori per Tenant Utente ✅

**Problema**: Dropdown MC/RSPP mostrava operatori di tutti i tenant invece di quelli del tenant utente loggato.

**Fix in 2 modals**:

**QuickActionDVRModal.tsx**:
```typescript
const { user } = useAuth();
const userTenantId = user?.tenantId;

// Query esecutori filtrata per tenant utente
queryFn: async () => {
    const response = await apiGet('/api/v1/persons', {
        roleType: 'RSPP,CONSULENTE_SICUREZZA,TECNICO_SICUREZZA',
        tenantId: userTenantId, // P59: Filtra per tenant utente
        limit: 100
    });
}
```

**QuickActionSopralluogoModal.tsx**:
```typescript
const { user } = useAuth();
const userTenantId = user?.tenantId;

// Query operatori filtrata per tenant utente
queryFn: async () => {
    const response = await apiGet('/api/v1/persons', {
        roleType: 'MEDICO_COMPETENTE,RSPP,CONSULENTE_SICUREZZA,TECNICO_SICUREZZA',
        tenantId: userTenantId, // P59: Filtra per tenant utente
        limit: 100
    });
}
```

**Nota**: Cambiato anche `ruolo` → `roleType` per allinearsi con il backend PersonController.

### File Modificati Sprint 11.2

| File | Modifiche |
|------|-----------|
| `backend/config/cors.js` | X-Operate-Tenant-Id header |
| `backend/proxy/config/cors.js` | X-Operate-Tenant-Id header |
| `backend/proxy/config/index.js` | X-Operate-Tenant-Id header |
| `backend/routes/config.js` | X-Operate-Tenant-Id header |
| `backend/routing/middleware/routeMiddleware.js` | X-Operate-Tenant-Id header |
| `src/services/api.ts` | apiDelete/apiPut con headers opzionali |
| `src/components/companies/MDLServicesCard.tsx` | tenantId prop, handlers cross-tenant, card sopralluoghi UI |
| `src/components/companies/quick-actions/QuickActionDVRModal.tsx` | tenantId prop, apiUpload headers, filtro tenant esecutori |
| `src/components/companies/quick-actions/QuickActionSopralluogoModal.tsx` | tenantId prop, apiUpload headers, filtro tenant operatori |
| `src/pages/companies/CompanyDetails.tsx` | Passa tenantId a MDLServicesCard |
---

## 🎯 Sprint 11.3: CORS Fix & Sopralluogo Status UI ✅

**Data**: 26 Gennaio 2026  
**Obiettivo**: Fix definitivo cross-tenant operations via CORS e miglioramento UX card Sopralluoghi.

### Issue Risolti

| Issue | Causa Root | Fix Applicato |
|-------|-----------|--------------|
| DVR non appare dopo refresh | CORS: `X-Operate-Tenant-Id` droppato dal browser | Fix `setupCorsHandlers` in proxy CORS |
| Card sopralluoghi poco chiare | Mancanza stato visivo chiaro | Aggiunto badge prominente stato |
| API 500 su persons/roleType | Backend non parsava comma-separated values | Fix personController.js |
| RoleType RSPP/MC non esistenti | Enum Prisma incompleto | Aggiunti 5 nuovi ruoli sicurezza |

### Fix CORS - setupCorsHandlers

Il problema era in `backend/proxy/config/cors.js`: la funzione `setupCorsHandlers` usava SOLO gli header custom passati, 
senza mergerli con quelli default (che includono `X-Operate-Tenant-Id`).

**Prima**:
```javascript
res.header('Access-Control-Allow-Headers', (config.allowedHeaders || corsConfig.allowedHeaders).join(','));
```

**Dopo**:
```javascript
// P59: Merge degli header - unisce default con custom, rimuove duplicati
const defaultHeaders = corsConfig.allowedHeaders || [];
const customHeaders = config.allowedHeaders || [];
const mergedHeaders = [...new Set([...defaultHeaders, ...customHeaders])];
res.header('Access-Control-Allow-Headers', mergedHeaders.join(','));
```

Questo fix si applica automaticamente a tutti i 30 endpoint configurati in `proxyRoutes.js`.

### Nuovi RoleType Prisma (D.Lgs 81/08)

Aggiunti a `backend/prisma/schema.prisma` enum `RoleType`:

```prisma
// P59: Sicurezza roles (D.Lgs 81/08)
MEDICO_COMPETENTE   // Art. 38-42 - Sorveglianza sanitaria
RSPP                // Art. 31-35 - Responsabile SPP  
ASPP                // Art. 31-35 - Addetto SPP
TECNICO_SICUREZZA   // Consulente/Tecnico sicurezza
CONSULENTE_SICUREZZA // Consulente sicurezza esterno
```

### Sopralluogo Status UI

Aggiunto helper `getSopralluogoStato()` che determina lo stato automaticamente:

| Stato | Condizione | Badge |
|-------|------------|-------|
| **PROGRAMMATO** | `dataEsecuzione` > now | 🟡 Amber "Da eseguire" |
| **ESEGUITO** | `dataEsecuzione` <= now && no esito | 🔵 Blue "Eseguito" |
| **COMPLETATO** | `dataEsecuzione` <= now && esito presente | 🟢 Green "Completato" |

Il badge stato è ora il primo elemento visibile nella card, con:
- Colore sfondo card che riflette lo stato
- Icona distintiva (Clock/Check/CheckCircle)
- Font bold e dimensione maggiore

### File Modificati Sprint 11.3

| File | Modifiche |
|------|-----------|
| `backend/proxy/config/cors.js` | `setupCorsHandlers` merge default+custom headers |
| `backend/controllers/personController.js` | Parse comma-separated roleType query param |
| `backend/prisma/schema.prisma` | 5 nuovi RoleType sicurezza |
| `src/components/companies/MDLServicesCard.tsx` | `getSopralluogoStato()` helper + visual status badges |