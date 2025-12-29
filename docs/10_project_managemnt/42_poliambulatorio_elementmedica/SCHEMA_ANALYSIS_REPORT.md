# 📋 ANALISI ENTITÀ SCHEMA vs DOCUMENTAZIONE

**Data**: 2024-12-13
**Obiettivo**: Verificare allineamento schema.prisma con 02_FASE_1_DATABASE.md e 05_MASTER_REQUIREMENTS.md

---

## ✅ ENTITÀ PRESENTI E ALLINEATE

| Entità Doc | Entità Schema | Status |
|------------|---------------|--------|
| Poliambulatorio | `Poliambulatorio` | ✅ OK |
| SedePoliambulatorio | `SedePoliambulatorio` | ✅ OK |
| Ambulatorio | `Ambulatorio` | ✅ OK |
| Strumentario | `Strumento` | ✅ OK (nome diverso) |
| ManutenzioneStrumentario | `ManutenzioneStrumento` | ✅ OK (nome diverso) |
| PrestazioneStrumentario | `PrestazioneStrumento` | ✅ OK (nome diverso) |
| Prestazione | `Prestazione` | ✅ OK |
| Convenzione | `Convenzione` | ✅ OK |
| SlotDisponibilita | `SlotDisponibilita` | ✅ OK |
| Appuntamento | `Appuntamento` | ✅ OK |
| Visita | `Visita` | ✅ OK |
| Referto | `Referto` | ✅ OK |
| VersioneReferto | `VersioneReferto` | ✅ OK |
| FirmaDigitale | `FirmaDigitale` | ✅ OK |
| DocumentoClinico | `DocumentoClinico` | ✅ OK |
| AuditClinico | `AuditClinico` | ✅ OK |
| FatturaPrestazione | `FatturaSanitaria` | ✅ OK (nome diverso) |
| OrarioAmbulatorio | `OrarioAmbulatorio` | ✅ OK |
| DisponibilitaMedico | `DisponibilitaMedico` | ✅ OK |
| FerieAssenza | `FerieAssenza` | ✅ OK |
| NumeroChiamata | `NumeroChiamata` | ✅ OK |
| ValoreCampoVisita | `ValoreCampoVisita` | ✅ OK |
| AllegatoVisita | `AllegatoVisita` | ✅ OK |
| AllegatoReferto | `AllegatoReferto` | ✅ OK |
| PrestazioneAggiuntiva | `PrestazioneAggiuntiva` | ✅ OK |

---

## 🔄 ENTITÀ CON IMPLEMENTAZIONE ALTERNATIVA

| Entità Doc | Implementazione Attuale | Note |
|------------|------------------------|------|
| **Listino** | `ListinoPrezzo` diretto | La doc prevede Listino (contenitore) + ListinoPrestazione (prezzi). Implementazione attuale: ListinoPrezzo contiene tutto |
| **PrestazioneSpecialista** | `MedicoAbilitato` | Stessa funzione, nome diverso |
| **CampoVisita** | `TemplateCampoVisita` | Implementazione semplificata |
| **CartellaClinica** | Campo `datiStrutturati` in Visita | Implementazione inline come JSON |

**Analisi**:
- L'implementazione attuale è funzionalmente equivalente ma più semplice
- `ListinoPrezzo` combina Listino + ListinoPrestazione in un solo modello
- `TemplateCampoVisita` gestisce sia la definizione che i valori dei campi

---

## 🟡 ENTITÀ MANCANTI (Non Critiche)

| Entità Doc | Priorità | Note |
|------------|----------|------|
| **ReminderAppuntamento** | Media | Reminder gestibile con job asincroni |
| **PrestazioneAssociata** | Bassa | Per pacchetti prestazioni - può essere aggiunta dopo |

**Valutazione**:
- Queste entità sono "nice-to-have" per funzionalità avanzate
- Non bloccano il workflow base del poliambulatorio
- Possono essere aggiunte nella Fase 12+

---

## 📊 RIEPILOGO COVERAGE

| Categoria | Presenti | Totali Doc | Coverage |
|-----------|----------|------------|----------|
| Struttura | 6 | 6 | 100% |
| Catalogo | 4 | 5 | 80% |
| Agenda | 4 | 4 | 100% |
| Clinica | 5 | 6 | 83% |
| Documenti | 3 | 3 | 100% |
| Fatturazione | 1 | 1 | 100% |
| **TOTALE** | **23** | **25** | **92%** |

---

## ✅ CONCLUSIONI

### Schema è ADEGUATO per F11

1. **Tutte le entità core sono presenti** - Workflow completo supportato
2. **Implementazione alternativa valida** - ListinoPrezzo vs Listino+ListinoPrestazione è più semplice
3. **Entità mancanti non bloccanti** - ReminderAppuntamento e PrestazioneAssociata sono enhancement

### Raccomandazioni

1. ✅ **Non aggiungere altre entità ora** - Schema già completo per F11
2. ✅ **Documentare scelte implementative** - Per chiarezza futura
3. 📝 **Pianificare F12** - ReminderAppuntamento, PrestazioneAssociata come enhancement

### Differenze Documentate

| Scelta Doc | Scelta Implementata | Motivo |
|------------|---------------------|--------|
| Listino + ListinoPrestazione | ListinoPrezzo unificato | Semplificazione, meno join |
| ScontoClinico separato | Estensione CodiceSconto | Riuso entità esistente formazione |
| CartellaClinica entità | JSON in Visita | Flessibilità, meno struttura rigida |
