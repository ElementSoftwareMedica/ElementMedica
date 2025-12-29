# 📋 SCHEMA CONSOLIDATION LOG

**Data**: 2024-12-13  
**Versione Schema**: 2.1.0 → 2.3.0  
**Operatore**: GitHub Copilot AI Assistant

---

## 🎯 OBIETTIVO

Consolidare le duplicazioni e aggiungere entità mancanti nello schema Prisma.

---

## ✅ FASE 1: CONSOLIDAZIONE DUPLICAZIONI (COMPLETATA)

### 1.1 SISTEMA SCONTI CONSOLIDATO

| Entità | Azione | Motivo |
|--------|--------|--------|
| `CodiceSconto` | ✅ Esteso | Aggiunto `prestazioniIds`, usato per clinical |
| `ScontoClinico` | ✅ Rimosso | Duplicato |
| `TipoScontoClinico` | ✅ Rimosso | Non più necessario |
| `TipoServizio` | ✅ Esteso | Aggiunto `PRESTAZIONE_CLINICA` |

### 1.2 Validazione Fase 1
- ✅ `npx prisma validate` - Schema valido
- ✅ `npx prisma generate` - Client generato
- ✅ `npx prisma db push` - Database sincronizzato

---

## ✅ FASE 2: ENTITÀ MANCANTI INFRASTRUTTURA (COMPLETATA)

### 2.1 Nuovi Model Aggiunti

| Model | Descrizione | Status |
|-------|-------------|--------|
| `SedePoliambulatorio` | Multi-sede support | ✅ Aggiunto |
| `StrumentoAmbulatorio` | Relazione n:m Strumento-Ambulatorio | ✅ Aggiunto |
| `ManutenzioneStrumento` | Tracking manutenzioni | ✅ Aggiunto |
| `PrestazioneStrumento` | Strumenti necessari per prestazione | ✅ Aggiunto |

### 2.2 Nuovi Enum Aggiunti

| Enum | Valori |
|------|--------|
| `TipoManutenzione` | PROGRAMMATA, STRAORDINARIA, CALIBRAZIONE, VERIFICA_SICUREZZA, PULIZIA, AGGIORNAMENTO |
| `StatoManutenzione` | PROGRAMMATA, IN_CORSO, COMPLETATA, ANNULLATA, RIMANDATA |

### 2.3 Relazioni Aggiornate

| Model | Nuove Relazioni |
|-------|-----------------|
| `Poliambulatorio` | +sedi → SedePoliambulatorio[] |
| `Ambulatorio` | +sedeId (opzionale), +strumentiAssegnati |
| `Strumento` | +ambulatoriAssegnati, +manutenzioni, +prestazioniStrumento |
| `Prestazione` | +strumentiNecessari |

### 2.4 Backward Compatibility
- `Ambulatorio.sedeId` è opzionale (nullable)
- Gli ambulatori esistenti continuano a funzionare senza sede
- Relazione `Ambulatorio → Poliambulatorio` mantenuta

### 2.5 Validazione Fase 2
- ✅ `npx prisma validate` - Schema valido
- ✅ `npx prisma generate` - Client generato (v5.22.0)
- ✅ `npx prisma db push` - Database sincronizzato
- ✅ No errori TypeScript

---

## ✅ FASE 3: ENTITÀ CLINICHE AVANZATE (COMPLETATA)

### 3.1 Agenda e Disponibilità (SPEC_05)

| Model | Descrizione | Status |
|-------|-------------|--------|
| `DisponibilitaMedico` | Configurazione disponibilità medici per giorno/orario | ✅ Aggiunto |
| `FerieAssenza` | Gestione ferie, malattie, permessi | ✅ Aggiunto |

| Enum | Valori |
|------|--------|
| `TipoAssenza` | FERIE, MALATTIA, PERMESSO, CONGEDO_PARENTALE, FORMAZIONE, ALTRO |
| `StatoAssenza` | RICHIESTA, APPROVATA, RIFIUTATA, CANCELLATA |

### 3.2 Sistema Chiamata Pazienti (SPEC_08)

| Model | Descrizione | Status |
|-------|-------------|--------|
| `NumeroChiamata` | Gestione coda pazienti sala d'attesa | ✅ Aggiunto |

| Enum | Valori |
|------|--------|
| `PrioritaChiamata` | NORMALE, URGENTE, PRIORITARIO, EMERGENZA |
| `StatoChiamata` | IN_ATTESA, CHIAMATO, IN_VISITA, COMPLETATO, NON_PRESENTATO, RIMANDATO |

### 3.3 Gestione Visite Avanzata (SPEC_09)

| Model | Descrizione | Status |
|-------|-------------|--------|
| `ValoreCampoVisita` | Form builder dinamico per campi visita | ✅ Aggiunto |
| `AllegatoVisita` | Allegati multimediali alle visite | ✅ Aggiunto |
| `PrestazioneAggiuntiva` | Prestazioni extra durante visita | ✅ Aggiunto |

### 3.4 Referti Avanzati (SPEC_10)

| Model | Descrizione | Status |
|-------|-------------|--------|
| `VersioneReferto` | Versionamento referti con storico | ✅ Aggiunto |
| `FirmaDigitale` | Firma digitale referti e documenti | ✅ Aggiunto |
| `AllegatoReferto` | Allegati multimediali ai referti | ✅ Aggiunto |

| Enum | Valori |
|------|--------|
| `StatoFirma` | IN_ATTESA, FIRMATO, RIFIUTATO, SCADUTO |

### 3.5 Validazione Fase 3
- ✅ `npx prisma validate` - Schema valido
- ✅ `npx prisma generate` - Client generato (v5.22.0)
- ✅ `npx prisma db push` - Database sincronizzato (382ms)
- ✅ `npm run build` - Build OK (13.61s)

---

## 📊 RIEPILOGO MODIFICHE TOTALI

### Schema Finale
| Metrica | Prima | Dopo | Delta |
|---------|-------|------|-------|
| Linee schema | ~2724 | ~3100 | +376 |
| Model totali | 77 | 88 | +11 |
| Enum totali | 37 | 43 | +6 |

### Nuove Tabelle Database (Fase 2+3)
1. `sedi_poliambulatorio`
2. `strumenti_ambulatori`
3. `manutenzioni_strumenti`
4. `prestazioni_strumenti`
5. `disponibilita_medici`
6. `ferie_assenze`
7. `numeri_chiamata`
8. `valori_campi_visita`
9. `allegati_visite`
10. `prestazioni_aggiuntive`
11. `versioni_referti`
12. `firme_digitali`
13. `allegati_referti`

### Nuovi Enum (Fase 2+3)
1. `TipoManutenzione`
2. `StatoManutenzione`
3. `TipoAssenza`
4. `StatoAssenza`
5. `PrioritaChiamata`
6. `StatoChiamata`
7. `StatoFirma`

---

## 📝 NOTE TECNICHE

1. **Multi-sede Support**: Il sistema ora supporta poliambulatori con più sedi fisiche
2. **Tracciamento Manutenzioni**: Completo tracking delle manutenzioni strumenti
3. **Relazioni Strumenti**: Supporto per strumenti condivisi tra ambulatori
4. **Prerequisiti Prestazioni**: Definizione strumenti obbligatori per prestazione
5. **Disponibilità Medici**: Configurazione flessibile con validità temporale
6. **Gestione Assenze**: Workflow approvazione ferie/permessi
7. **Coda Pazienti**: Sistema priorità con tempi stimati
8. **Form Builder**: Campi dinamici per visite specialistiche
9. **Versionamento Referti**: Storico completo modifiche
10. **Firma Digitale**: Supporto provider esterni (Aruba, InfoCert)

---

## ✅ COMPLIANCE

- ✅ Multi-tenancy: tutti i model hanno `tenantId` + index
- ✅ Soft delete: tutti i model hanno `deletedAt`
- ✅ Compound indexes: `[tenantId, deletedAt]` dove appropriato
- ✅ GDPR: hash file per integrità, audit trail

---

## 📚 RIFERIMENTI

- SPEC_01_POLIAMBULATORIO.md - SedePoliambulatorio
- SPEC_02_AMBULATORI.md - StrumentoAmbulatorio
- SPEC_04_STRUMENTARIO.md - ManutenzioneStrumento
- SPEC_05_AGENDA.md - DisponibilitaMedico, FerieAssenza
- SPEC_08_CHIAMATA.md - NumeroChiamata
- SPEC_09_VISITE.md - ValoreCampoVisita, Allegati, Prestazioni
- SPEC_10_REFERTI.md - Versioni, FirmaDigitale, Allegati
- 02_FASE_1_DATABASE.md - Schema completo documentazione
