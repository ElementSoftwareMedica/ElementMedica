# P56 - Medicina del Lavoro Sistema Completo

**Stato**: ✅ Completato  
**Data**: 20 Gennaio 2026  
**Versione**: v2.1

---

## 📋 Obiettivo

Implementare un sistema completo per la **Medicina del Lavoro** conforme al **D.Lgs 81/08** che integra:
- Poliambulatorio (visite, referti, fatturazione)
- Sicurezza (DVR, RSPP, MC, sopralluoghi)

---

## ✅ Componenti Implementati

### Schema Prisma (10 nuovi modelli)

| Modello | Descrizione |
|---------|-------------|
| `Mansione` | Mansioni per sede aziendale |
| `MansioneRischio` | Rischi associati a mansioni |
| `LavoratoreMansione` | Assegnazione persona-mansione |
| `GiudizioIdoneita` | Giudizi MC (Art. 41 D.Lgs 81/08) |
| `ProtocolloSanitario` | Protocolli visite per mansione |
| `ProtocolloPrestazione` | Prestazioni in protocollo |
| `NominaRuolo` | Nomine MC/RSPP/RLS |
| `PrescrizioneSopralluogo` | Prescrizioni da sopralluoghi |
| `Allegato3B` | Report annuale INAIL |
| `RischioPrestazione` | Mapping rischio → prestazione |

### Enum Aggiunti (10)

| Enum | Valori |
|------|--------|
| `TipoVisitaMDL` | PREVENTIVA, PERIODICA, STRAORDINARIA, etc. |
| `CodiceRischio` | 28 codici (RUM, VIB_MB, CHI, etc.) |
| `LivelloRischio` | BASSO, MEDIO, ALTO, MOLTO_ALTO |
| `CategoriaRischio` | FISICI, CHIMICI, BIOLOGICI, etc. |
| `TipoGiudizioIdoneita` | IDONEO, CON_PRESCRIZIONI, NON_IDONEO, etc. |
| `StatoGiudizio` | VALIDO, SCADUTO, REVOCATO, etc. |
| `TipoRuoloNomina` | MC, RSPP, RLS, ASPP, etc. |
| `StatoNomina` | ATTIVA, SCADUTA, REVOCATA, etc. |
| `TipoPeriodicita` | ANNUALE, BIENNALE, TRIENNALE, etc. |
| `StatoInvioAllegato3B` | DA_INVIARE, INVIATO, ACCETTATO, etc. |

### Pagine Frontend (8)

| Pagina | Route |
|--------|-------|
| Mansioni | `/poliambulatorio/mdl/mansioni` |
| Protocolli Sanitari | `/poliambulatorio/mdl/protocolli-sanitari` |
| Giudizi Idoneità | `/poliambulatorio/mdl/giudizi-idoneita` |
| Nomine Ruolo | `/poliambulatorio/mdl/nomine-ruolo` |
| Rischio-Prestazioni | `/poliambulatorio/mdl/rischio-prestazioni` |
| Scadenze MDL | `/poliambulatorio/mdl/scadenze` |
| Allegato 3A | `/poliambulatorio/mdl/allegato-3a` |
| Allegato 3B | `/poliambulatorio/mdl/allegato-3b` |

### API Endpoints

```
/api/v1/clinica/mansioni/*
/api/v1/clinica/giudizi-idoneita/*
/api/v1/clinica/protocolli-sanitari/*
/api/v1/clinica/nomine-ruolo/*
/api/v1/clinica/rischio-prestazioni/*
/api/v1/clinica/allegato-3b/*
```

---

## 📊 Catalogo Rischi

**28 codici rischio** conformi al D.Lgs 81/08:

| Categoria | Codici |
|-----------|--------|
| Fisici | RUM, VIB_MB, VIB_HAV, MIC, TER, OTT, RAD_ION, RAD_NON |
| Chimici | CHI, POL, SOL, GAS, FUM |
| Biologici | BIO, AGE_BIO |
| Ergonomici | MMC, MMC_TRA, MMC_SOL, POS, MOV_RIP |
| Psicosociali | SLC, LAV_NOT, TUR, VDT |
| Sicurezza | ALT, ELE, SPA_CON, GUI |

---

## 🔗 Dipendenze

- **P55**: Multi-Prestazioni per visita
- **P52**: Sistema visite cliniche
- **P49**: Company Multi-Tenant (CompanySite, DVR)

---

## 📋 Requisiti D.Lgs 81/08 Implementati

| # | Requisito | Status |
|---|-----------|--------|
| 1 | DVR con mansioni e rischi | ✅ |
| 2 | Tariffario per azienda | ✅ |
| 3 | Anagrafica dipendente MDL | ✅ |
| 4 | Nomina MC/RSPP/RLS | ✅ |
| 5 | Sopralluogo con prescrizioni | ✅ |
| 6 | Protocollo sanitario | ✅ |
| 7 | Visita MDL con tipi | ✅ |
| 8 | Giudizio idoneità | ✅ |
| 9 | Allegato 3A (Cartella Sanitaria) | ✅ |
| 10 | Allegato 3B XML (INAIL) | ✅ |
| 11 | Consuntivo economico | ✅ |
| 12 | Dashboard scadenze | ✅ |
| 13 | Multi-prestazioni | ✅ |
