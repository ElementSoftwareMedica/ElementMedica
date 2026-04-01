# Analisi Modelli Fatturazione — ElementMedica

## 1. I Quattro Modelli

### `FatturaSanitaria` (rimossa)
Modello originale, **deprecato**. Usato per la fatturazione semplificata delle visite cliniche prima del progetto P97.

| Campo | Tipo | Note |
|-------|------|------|
| `visitaId` | String? | FK → Visita |
| `pazienteId` | String | FK → Person |
| `numeroFattura` | String | Numerazione per-tenant |
| `imponibile/importoIva/totale` | Decimal | Calcolo IVA |
| `inviataSDI` / `esitoSDI` | bool/String | Invio SDI semplificato |
| `movimentiContabili` | `MovimentoContabile[]` | Collegato al ledger |

**Problemi**: nessun supporto multi-linea (FatturaElettronicaLinea), nessuna gestione EnteEmittente, nessuna integrazione AcubeAPI, nessuna gestione terzo pagante, nessuna nota credito.

**Stato**: **Non creare nuove FatturaSanitarie**. Le esistenti restano per storico. Nuovi flussi devono usare `FatturaElettronica`.

---

### `FatturaElettronica` (standard attuale)
Modello completo per tutti i tipi di fattura. Registra snapshot cedente/cessionario in fase di emissione (immutabilità storica).

**Caratteristiche principali:**
- **Multi-ente**: collegata a `EnteEmittente` (cedente)
- **Multi-linea**: `FatturaElettronicaLinea[]`
- **SDI full**: integrazione AcubeAPI (`acubeUuid`, `acubeStatus`)
- **SistemaTS**: invio dati al 730 (`sistemaTsFlagOpp`, `sistemaTsProtocol`)
- **Terzo pagante**: `terzoPaganteTipo` (GENITORE/AZIENDA/ALTRO)
- **Nota credito**: `fatturaOrigineId` (self-relation)
- **Bollo virtuale**: `bolloVirtuale` (art.6 DPR 642/1972)
- **Esenzione medicina estetica**: `disagioPsicologico` (art.10 n.18 DPR 633/72)

**Tipo documento**: `FATTURA` (TD01), `ACCONTO` (TD02), `NOTA_CREDITO` (TD04), `NOTA_DEBITO` (TD05).

**Tipo servizio**: `VISITA` (privata), `VISITA_MDL`, `CORSO`, `DVR`, `RSPP`, `SOPRALLUOGO`, `NOMINA`, `BUNDLO`, ecc.

---

### `FatturaElettronicaLinea`
Righe dettaglio di `FatturaElettronica`. Semplice: `descrizione`, `quantita`, `prezzoUnitario`, `aliquotaIva`, `natura` (N1–N7).

---

### `MovimentoContabile` (ledger unificato)
Registro finanziario double-entry per tutti i flussi economici. Traccia sia ricavi (ENTRATA) che costi (USCITA).

**Direzione**: `ENTRATA` (ricavo da paziente/azienda) ↔ `USCITA` (compenso a medico/formatore/fornitore).

**Collegamento attività sorgente** (polimorfismo):
- `visitaId`, `appuntamentoId`, `appPrestazioneId`
- `sopralluogoId`, `dvrId`, `nominaRuoloId`, `consulenzaId`
- `courseScheduleId`, `bundleId`, `refertoId`, `documentoCompilatoId`

**Stati workflow**: `BOZZA → PREVENTIVO → DA_FATTURARE → FATTURATO → PAGATO`

**Collegamento fatture**: ha `fatturaElettronicaId` (attuale, P97).

**Collegamento ENTRATA↔USCITA**: `movimentoCollegatoId` @unique — crea coppia ENTRATA (cliente) + USCITA (compenso medico) per stessa attività.

---

## 2. Tutti i modelli sono necessari?

| Modello | Necessario? | Motivo |
|---------|-------------|--------|
| `FatturaSanitaria` | ❌ Rimossa con P97 | Tabella eliminata, nessun dato storico conservato. |
| `FatturaElettronica` | ✅ Sì | Standard attuale per tutte le fatture SDI |
| `FatturaElettronicaLinea` | ✅ Sì | Parte integrante di FatturaElettronica |
| `MovimentoContabile` | ✅ Sì | Fonte di verità per cash flow, compensi, scadenziari |

**In sintesi: 3 modelli attivi.** `FatturaSanitaria` eliminata (P97 cleanup).

---

## 3. Quando generare il MovimentoContabile?

### Raccomandazione: **Sempre, anche per prestazioni singole**

Il `MovimentoContabile` deve essere generato **prima o contestualmente alla fattura**, non dopo, perché:

1. **Visibilità cash flow**: Anche senza fattura emessa, il movimento BOZZA/DA_FATTURARE mostra il ricavo atteso nel cruscotto finanziario.
2. **Scadenzario**: Permette di monitorare cosa deve ancora essere fatturato (stato `DA_FATTURARE`).
3. **Double-entry**: Genera automaticamente la coppia ENTRATA (ricavo da paziente) + USCITA (compenso medico) collegati via `movimentoCollegatoId`.
4. **Riconciliazione**: Quando la fattura viene emessa, il movimento passa a `FATTURATO`; quando pagata, a `PAGATO`.
5. **Compensi medici**: Il movimento USCITA calcola il compenso del medico (percentuale o fisso) sulla stessa attività.

### Workflow suggerito per una visita privata:

```
1. Visita eseguita (stato COMPLETATA)
   → Genera MovimentoContabile ENTRATA (tipo VISITA_MEDICA, stato DA_FATTURARE)
   → Genera MovimentoContabile USCITA (tipo VISITA_MEDICA, compenso medico, stato DA_FATTURARE)
   → I due movimenti sono collegati via movimentoCollegatoId

2. Fattura emessa (da accettazione/agenda o billing)
   → Crea FatturaElettronica (bozza)
   → Collega MovimentoContabile.fatturaElettronicaId
   → MovimentoContabile.stato → FATTURATO

3. SDI: Fattura inviata via AcubeAPI
   → FatturaElettronica.acubeStatus → EMESSA

4. Pagamento ricevuto
   → FatturaElettronica.stato → PAGATA
   → MovimentoContabile.stato → PAGATO
   → MovimentoContabile.dataPagamento, metodoPagamento
```

### Workflow per prestazione singola (senza visita completa):

Stesso flusso, ma con `appPrestazioneId` o `appuntamentoId` come sorgente invece di `visitaId`.

---

## 4. Regole IVA (Q3)

| Tipo prestazione | IVA default | Eccezione |
|-----------------|-------------|-----------|
| Tutte le prestazioni sanitarie | **0%** (esente art.10 n.18 DPR 633/72) | — |
| Medicina Estetica (`brancheSpecialistiche` contiene "estetica") | **22%** | Se `disagioPsicologico = true` → 0% (finalità terapeutica) |

Il totale fattura = imponibile + IVA (IVA si somma all'imponibile, non è inclusa).

---

## 5. Regole SistemaTS (flag_opposizione)

| Valore | Significato | Quando usare |
|--------|------------|-------------|
| `0` | Non si oppone → Invia a SistemaTS → Spesa detraibile 730 | VISITA privata (paziente paga) |
| `1` | Opposizione → Non invia → Non detraibile | VISITA_MDL (azienda paga), medicina estetica senza finalità terapeutica |

---

## 6. File di riferimento

| Componente | File |
|-----------|------|
| Prisma models | `backend/prisma/schema.prisma` (righe ~5920, ~8161, ~9131, ~9264) |
| Backend service | `backend/services/billing/FatturazioneService.js` |
| Generator movimenti | `backend/services/management/MovimentoContabileGenerator.js` |
| SDI/AcubeAPI | `backend/services/billing/AcubeApiService.js` |
| SistemaTS | `backend/services/billing/SistemaTSService.js` |
| Frontend modal | `src/pages/finance/billing/components/NuovaFatturaModal.tsx` |
| Frontend hook | `src/hooks/finance/useFatturazione.ts` |
