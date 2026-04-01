# P67 — MDL Tipologie Pricing, Multi-Prestazioni & Scheduling Pregresso

**Progetto:** ElementMedica — Medicina del Lavoro  
**Versione:** R37  
**Data:** 2025  
**Prerequisiti:** P56, P66 completati

---

## 🎯 Obiettivi

1. **Pricing per tipologia** — Prezzi differenziati per tipo di visita MDL (PREVENTIVA, PERIODICA, CAMBIO_MANSIONE, ecc.) su tariffari aziendali e prestazione catalogo
2. **Bug: ultima/prossima visita MDL mismatch** — Allineamento tra vista companies (sorveglianza sanitaria) e modal prenotazione
3. **Bug: multi-prestazioni protocollo** — Selezione a checklist per le prestazioni del protocollo nel modal prenotazione
4. **Scheduling aggiornamento pregresso** — Quando si programma la scadenza da visite/:id, aggiorna tutto il pregresso

---

## ✅ Implementazioni

### 0. Durata per tipologia visita MDL (R38)

**File:** `backend/prisma/schema.prisma`, `src/pages/clinica/catalogo/PrestazioneForm.tsx`, `src/services/clinicaApi.ts`, `backend/config/validation-clinical.js`, `src/pages/clinica/agenda/components/modals/AppointmentBookingModal/useAppointmentForm.ts`

Aggiunta la gestione della **durata differenziata per tipologia di visita MDL** al fianco dei prezzi:

#### Campi aggiunti a `Prestazione`
```
durataControllo   Int?  @map("durata_controllo")     — minuti per visita periodica/controllo
durataPrimaVisita Int?  @map("durata_prima_visita") — minuti per visita preventiva/prima visita
```

#### Logica nel booking modal (`useAppointmentForm.ts`)
```
Preventiva / Preventiva_Preassuntiva → durataPrimaVisita ?? durataPrevista
Periodica                            → durataControllo   ?? durataPrevista
Altri tipi MDL                       → durataPrevista
Non-MDL                              → durataPrevista
```

#### UI in `PrestazioneForm.tsx`
Nuova sezione **"Durate differenziate"** sotto **"Prezzi differenziati"** con:
- Campo `durataPrimaVisita` (min) con preset 30/45/60/90
- Campo `durataControllo` (min) con preset 15/20/30/45
Entrambi opzionali — se vuoti usano durataPrevista.

### 1. Pricing per tipologia visita MDL

**File:** `backend/services/management/MovimentoContabileGenerator.js`

#### `getVocePerPrestazione` — Ordine di priorità lookup
```
1. VoceTariffario con prestazioneId + categoriaVisita === tipoVisitaMDL   (specifico per tipo)
2. VoceTariffario con prestazioneId senza categoriaVisita               (generico prestazione)
3. VoceTariffario PRESTAZIONE senza prestazioneId                      (fallback generico)
```

#### Fallback chain prezzi su `Prestazione`
```
- PREVENTIVA / PREVENTIVA_PREASSUNTIVA → Prestazione.prezzoPrimaVisita
- PERIODICA                             → Prestazione.prezzoControllo
- altri tipi                            → Prestazione.prezzoBase
```

**File:** `src/pages/clinica/agenda/components/modals/AppointmentBookingModal/useAppointmentForm.ts`

`companyPrezzoTariffario` ora preferisce la voce con `categoriaVisita === tipoVisitaMDL`, aggiornando in tempo reale al cambio del tipo visita selezionato.

---

### 2. Fix: ultima/prossima visita MDL mismatch

**Causa radice:** `companies-routes.js` usava TUTTI gli appuntamenti (senza filtro MDL) per calcolare `ultimaVisita`/`prossimaVisita`, mentre il modal usava solo `Visita.tipoVisitaMDL`.

#### Fix companies-routes.js
```javascript
// Prima: nessun filtro su tipoVisitaMDL
// Dopo:
tipoVisitaMDL: { not: null },  // solo appuntamenti MDL
```

#### Fix useAppointmentForm.ts — prossimaVisitaData
```
Ordine di priorità per la "prossima visita":
1. Appuntamento MDL futuro già prenotato (da storicoMDLData.appuntamenti)
2. Calcolo da ultima visita + periodicitaVisiteMesi del protocollo
```

---

### 3. Fix: multi-prestazioni protocollo — checklist

**Causa radice:** Il pulsante "Aggiungi" nel pannello MDL sostituiva `selectedPrestazione` invece di aggiungere alla selezione.

#### Architettura nuova
- Stato `prestazioniSelezionate: Set<string>` in `useAppointmentForm.ts`
- Pre-seleziona automaticamente le prestazioni `isObbligatoria`
- `MDLSorveglianzaPanel` mostra checklist toggle (non più pulsanti "Aggiungi")
- Al submit: solo le prestazioni selezionate vengono aggiunte come `AppuntamentoPrestazione`

#### UI
```
[✓] Visita Medica – Obbligatoria                    ← teal, selezionata
[ ] Spirometria – Obbligatoria                       ← grigio, deselezionata
[✓] Audiometria – Facoltativa • MESI_12              ← teal, selezionata
                                    (2/3 selezionate)
```

#### Intestazione counter
```tsx
Prestazioni previste dal protocollo (2/3 selezionate)
```

---

### 4. Scheduling aggiornamento pregresso

**File:** `backend/services/clinical/ScadenzeMDLService.js`

#### Nuova logica `programmaPrestazioniDopoVisita`

1. Segna le scadenze pendenti come `eseguita = true`
2. Rinnova quelle con `periodicitaMesi > 0` (come prima)
3. **NUOVO — aggiornamento pregresso:** recupera il protocollo dalla mansione e crea scadenze mancanti
   - Per ogni prestazione del protocollo senza scadenza futura pendente → crea la scadenza
   - Gestisce sia il caso "worker mai inserito nel sistema" che "nuovo protocollo aggiunto"

#### Helper aggiunto
```javascript
function periodicitaMesiFromProtocolloPrestazione(pp)
// Converte pp.periodicita (enum) in mesi, usa pp.periodicitaCustomMesi se disponibile
```

---

## 🏗️ Architettura prezzi MDL

```
VISITA MDL completata
        │
        ▼
MovimentoContabileGenerator.generaPerVisitaMDL(visita)
        │
        ├─ 1. getVocePerPrestazione(companyId, tenantId, prestazioneId, tipoVisitaMDL)
        │      ├─ voce con prestazioneId + categoriaVisita = tipoVisitaMDL  → US€ QUESTO
        │      ├─ voce con prestazioneId (nessuna categoria)                → fallback 1
        │      └─ voce PRESTAZIONE generica (nessun prestazioneId)          → fallback 2
        │
        └─ 2. Se nessuna voce → Prestazione.prezzoPrimaVisita / prezzoControllo / prezzoBase
                                 (in base a tipoVisitaMDL)
```

---

## 🔄 Enum mapping: TipoVisitaMDL ↔ CategoriaVisitaMDL

I due enum sono identici (1:1) — `CategoriaVisitaMDL` è usato in `VoceTariffario.categoriaVisita` per differenziare i prezzi per ogni tipo di visita conforme D.Lgs 81/08 art. 41.

| TipoVisitaMDL | Normativa | Prezzo Prestazione |
|---|---|---|
| PREVENTIVA | Art. 41.2a | `prezzoPrimaVisita` |
| PREVENTIVA_PREASSUNTIVA | Art. 41.2a-bis | `prezzoPrimaVisita` |
| PERIODICA | Art. 41.2b | `prezzoControllo` |
| CAMBIO_MANSIONE | Art. 41.2c | `prezzoBase` |
| CESSAZIONE_RAPPORTO | Art. 41.2d | `prezzoBase` |
| PRECEDENTE_ASSENZA | Art. 41.2e | `prezzoBase` |
| SU_RICHIESTA_LAVORATORE | Art. 41.2f | `prezzoBase` |
| STRAORDINARIA | Art. 41.3 | `prezzoBase` |
| VERIFICA_IDONEITA | Art. 41.9 | `prezzoBase` |
| RIENTRO_MATERNITA | — | `prezzoBase` |

---

## 📁 File modificati

| File | Tipo | Descrizione |
|------|------|-------------|
| `backend/prisma/schema.prisma` | Schema | Aggiunto durataPrimaVisita, durataControllo su Prestazione |
| `backend/config/validation-clinical.js` | Validation | Aggiunto durataPrimaVisita/durataControllo nei Joi schemas |
| `src/services/clinicaApi.ts` | Types | Aggiunto durataPrimaVisita/durataControllo nel tipo Prestazione |
| `src/pages/clinica/catalogo/PrestazioneForm.tsx` | UI | Sezione durate differenziate con preset |
| `backend/routes/companies-routes.js` | Fix bug | Filtra appuntamentiPersone per tipoVisitaMDL |
| `backend/services/management/MovimentoContabileGenerator.js` | Feature | Pricing per categoria visita + fallback per-tipo |
| `backend/services/clinical/ScadenzeMDLService.js` | Feature | programmaPrestazioniDopoVisita aggiorna pregresso |
| `src/pages/clinica/agenda/components/modals/AppointmentBookingModal/types.ts` | Refactor | prestazioniSelezionate + onTogglePrestazione in MDLSorveglianzaData; rimosso onAddPrestazione |
| `src/pages/clinica/agenda/components/modals/AppointmentBookingModal/useAppointmentForm.ts` | Fix + Feature | prossimaVisitaData da appuntamenti futuri; checklist selection; companyPrezzoTariffario per tipo; durata per tipoVisitaMDL |
| `src/pages/clinica/agenda/components/modals/AppointmentBookingModal/MDLSorveglianzaPanel.tsx` | Refactor | Checklist invece di pulsanti "Aggiungi"; rimosso Plus import |
| `src/pages/clinica/agenda/components/modals/AppointmentBookingModal/index.tsx` | Fix | Rimosso onAddPrestazione prop e dead code if/else |

---

## 📊 Stato avanzamento R37

| Task | Stato |
|------|-------|
| Fix ultima/prossima visita MDL mismatch | ✅ R37 |
| Fix multi-prestazioni protocollo (checklist) | ✅ R37 |
| Pricing per tipo visita in movimenti contabili | ✅ R37 |
| companyPrezzoTariffario per tipo nel modal | ✅ R37 |
| Scheduling aggiornamento pregresso | ✅ R37 |
| Dead code cleanup (onAddPrestazione if/else) | ✅ R37 |
| Durata differenziata per tipologia MDL (schema + UI + booking) | ✅ R38 |
