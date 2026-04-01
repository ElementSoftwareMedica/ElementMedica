# Allegato 3B — Gap Analysis Normativa (D.Lgs 81/08 Art. 40)

**Data**: 13 marzo 2026  
**Stato**: Aggiornato — Revisione S35

---

## Stato Attuale

L'XML generato da `Allegato3BService.buildXML()` copre le seguenti sezioni:

| Sezione | Stato | Note |
|---------|-------|------|
| Intestazione (anno, data compilazione) | ✅ Completo | |
| Medico Competente (CF, nome, albo, specializzazione) | ✅ Completo | |
| Azienda (ragione sociale, PIVA, CF, ATECO, sede legale) | ✅ Completo | |
| Unità Produttive (sedi + numeroPAT) | ✅ Completo | Sezione `<UnitaProduttive>` con per-sede PAT, indirizzo |
| Lavoratori sorvegliati (totale + per genere + per fascia età) | ✅ Completo | Filtro per azienda corretto |
| Visite per tipologia | ✅ Completo | Filtra per azienda |
| Giudizi idoneità (totale, con limitazioni, con prescrizioni, inidoneità) | ✅ Completo | Filtra per azienda |
| Giudizi per tipologia dettagliata | ✅ Completo | |
| Rischi lavorativi (codice, lavoratori esposti, livello) | ✅ Completo | Via MansioneRischio |
| Malattie professionali | ✅ Completo | Modello `MalattiaProfessionale`, CRUD, XML con ICD-10 |
| Giudizi per rischio | ✅ Completo | Cross-reference GiudizioIdoneita → MansioneRischio |
| Accertamenti integrativi | ✅ Completo | Query EsameStrumentale aggregata per tipo dispositivo |

### Fix Applicati

1. **`getVisiteStatistics()`** — Filtro `companyTenantProfileId` per statistiche per-azienda
2. **`getGiudiziStatistics()`** — Filtro `companyTenantProfileId` per statistiche per-azienda
3. **`numeroPAT`** — Campo aggiunto a `CompanySite`, incluso in XML `<UnitaProduttive>`
4. **`getGiudiziPerRischio()`** — Nuovo metodo per disaggregazione giudizi per codice rischio
5. **`getAccertamentiIntegrativi()`** — Nuovo metodo per aggregazione EsameStrumentale per tipo

---

## Gap Risolti

### ~~1. Malattie Professionali~~ ✅ COMPLETATO
Modello `MalattiaProfessionale` completo con: CRUD routes, frontend tab, XML con codice ICD-10, breakdown sospette/accertate.

### ~~2. PAT — Posizione Assicurativa Territoriale~~ ✅ COMPLETATO (S35)
Campo `numeroPAT String? @db.VarChar(20)` aggiunto a `CompanySite`. Sezione `<UnitaProduttive>` nell'XML con indirizzo completo per sede.

### ~~3. Accertamenti Sanitari Integrativi~~ ✅ COMPLETATO (S35)
Metodo `getAccertamentiIntegrativi()` aggrega `EsameStrumentale` per `tipoDispositivo` (ECG, SPIROMETRO, AUDIOMETRO). Sezione XML `<AccertamentiIntegrativi>`.

### ~~6. Giudizi per Rischio~~ ✅ COMPLETATO (S35)
Metodo `getGiudiziPerRischio()` cross-referenzia GiudizioIdoneita → GiudizioIdoneitaMansione → Mansione → MansioneRischio. Conta idonei/conLimitazioni/conPrescrizioni/nonIdonei per codice rischio.

---

## Gap Residui (Bassa Priorità)

### 4. Breakdown completo per Unità Produttiva (BASSA PRIORITÀ)

**Requisito normativo**: I dati statistici andrebbero totalmente disaggregati per unità produttiva.

**Stato attuale**: Le sedi sono elencate nell'XML con PAT e indirizzo. I dati statistici (visite, giudizi, rischi) sono ancora aggregati a livello aziendale.

**Nota**: Per piena conformità servirebbe ripetere tutte le sezioni statistiche per ciascuna sede. Richiede effort significativo e ristrutturazione delle query.

### 5. Provvedimenti del MC (BASSA PRIORITÀ)

**Requisito normativo**: Provvedimenti adottati (cambio mansione, allontanamento).

**Stato attuale**: Derivabile dai giudizi con limitazioni (`limitazioni`, `prescrizioniIdoneita` di GiudizioIdoneita).

**Nota**: Non richiede nuovi modelli — può essere estratto dalle limitazioni esistenti.

### 7. Schema XSD INAIL Ufficiale (BASSA PRIORITÀ)

**Stato attuale**: XML usa namespace interno `http://www.inail.it/relazione-annuale` v2.0.

**Nota**: Invio telematico INAIL è via portale, non XML diretto. Schema è per uso interno e archiviazione.

---

## Piano di Implementazione

| Fase | Attività | Stato |
|------|----------|-------|
| **1** | Campo `numeroPAT` su CompanySite + XML UnitaProduttive | ✅ Completato S35 |
| **2** | Modello `MalattiaProfessionale` + CRUD + XML | ✅ Completato precedentemente |
| **3** | Accertamenti integrativi da EsameStrumentale | ✅ Completato S35 |
| **4** | Giudizi per rischio (cross-reference) | ✅ Completato S35 |
| **5** | Disaggregazione completa per sede | ⬜ Bassa priorità |
| **6** | Derivazione provvedimenti da giudizi | ⬜ Bassa priorità |
