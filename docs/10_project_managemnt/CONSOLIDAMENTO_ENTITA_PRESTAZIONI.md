# Analisi Consolidamento Entità Prestazioni

**Data**: 19 Dicembre 2025
**Autore**: Copilot Analysis

## Executive Summary

L'utente ha richiesto di valutare il consolidamento delle seguenti entità:
1. `MedicoAbilitato` → `Person`
2. `PrestazioneAggiuntiva`, `OffertaBundle*`, `PrestazioneStrumento`, `AmbulatorioPrestazione` → `Prestazione`

## 1. Analisi MedicoAbilitato

### Struttura Attuale
```prisma
model MedicoAbilitato {
  id               String   @id
  medicoId         String   // FK → Person
  prestazioneId    String   // FK → Prestazione
  attivo           Boolean
  dataAbilitazione DateTime
  durataMedico     Int?     // Override durata
  compensoTipo     TipoCompensoMedico // PERCENTUALE, FISSO
  compensoValore   Decimal  // Es: 30%
  compensoMinimo   Decimal? // Floor
  compensoMassimo  Decimal? // Ceiling
  note             String?
  tenantId         String
}
```

### Valutazione
**NON ELIMINABILE** - È una tabella di join many-to-many con attributi extra essenziali:
- Il compenso specifico per medico-prestazione è un requisito di business
- La durata override per medico è un requisito
- I dati di abilitazione (data, note) hanno valore audit

### Raccomandazione
✅ **MANTENERE** come tabella separata
- Rinominare in `PersonPrestazione` per chiarezza (opzionale)
- È best practice per relazioni M:N con attributi

### Alternativa Scartata
Aggiungere `prestazioniAbilitate` come JSON array su Person → **PESSIMA IDEA**:
- Perderebbe integrità referenziale
- Query inefficienti
- Impossibile fare join/filter su compenso

---

## 2. Analisi Entità Prestazione-Related

### 2.1 PrestazioneAggiuntiva
```prisma
model PrestazioneAggiuntiva {
  visitaId       String    // FK → Visita
  prestazioneId  String?   // Optional FK → Prestazione
  codice         String
  descrizione    String
  quantita       Int
  prezzoUnitario Decimal
  // ...
}
```

**DIVERSA** da Prestazione:
- È a livello di **VISITA** (istanza), non catalogo
- Rappresenta linee fatturabili aggiuntive in una visita specifica
- Il link a Prestazione è opzionale (può essere ad-hoc)

✅ **MANTENERE SEPARATA** - Scopo completamente diverso

### 2.2 OffertaBundle / OffertaBundlePrestazione

```prisma
model OffertaBundle {
  codice             String
  nome               String
  prezzoBundle       Decimal?  // Prezzo fisso
  scontoPercentuale  Decimal?  // O sconto su somma
  // Applicabilità: età, genere, convenzioni
}

model OffertaBundlePrestazione {
  offertaBundleId String
  prestazioneId   String
  quantita        Int       // Quante volte nel bundle
  obbligatoria    Boolean   // Se richiesta
  ordine          Int       // Ordine esecuzione
}
```

**POSSIBILE CONSOLIDAMENTO** in Prestazione:

```prisma
model Prestazione {
  // ... campi esistenti ...
  
  // Bundle/Pacchetto
  isBundle          Boolean   @default(false)
  prezzoBundle      Decimal?  // Se bundle, prezzo fisso
  scontoBundle      Decimal?  // Se bundle, % sconto su somma
  
  // Self-relation per bundle
  bundleParent      Prestazione? @relation("PrestazioneBundle", fields: [bundleParentId])
  bundleParentId    String?
  prestazioniBundle Prestazione[] @relation("PrestazioneBundle")
  
  // Attributi bundle item (quando è child di un bundle)
  quantitaInBundle  Int       @default(1)
  obbligatoriaBundle Boolean  @default(true)
  ordineBundle      Int       @default(0)
  
  // Applicabilità bundle
  soloNuoviPazienti Boolean   @default(false)
  etaMinima         Int?
  etaMassima        Int?
  genereApplicabile Gender?
}
```

**PRO**:
- Un'unica entità per prestazioni singole e bundle
- Query semplificate
- UI unificata

**CONTRO**:
- Schema più complesso con molti campi nullable
- Self-relation può complicare le query
- Migration complessa con dati esistenti

### Raccomandazione Bundle
⚠️ **VALUTARE CON ATTENZIONE**:
- Se i bundle sono pochi e semplici → Consolidare
- Se i bundle hanno logica complessa → Mantenere separati

**Proposta intermedia**: Mantenere OffertaBundle ma linkare a Prestazione con `tipo = BUNDLE`:
- La Prestazione con `tipo = BUNDLE` diventa il "contenitore"
- OffertaBundlePrestazione rimane per la composizione

### 2.3 PrestazioneStrumento

```prisma
model PrestazioneStrumento {
  prestazioneId  String
  strumentoId    String
  isObbligatorio Boolean
  note           String?
}
```

**NECESSARIA** - È una tabella di join M:N con attributi:
- `isObbligatorio` non può stare su nessuno dei due lati
- Standard pattern per relazioni con attributi

✅ **MANTENERE SEPARATA**

### 2.4 AmbulatorioPrestazione

```prisma
model AmbulatorioPrestazione {
  ambulatorioId String
  prestazioneId String
  attivo        Boolean
}
```

**NECESSARIA** - Join M:N con stato:
- Ogni ambulatorio può abilitare/disabilitare prestazioni
- `attivo` è attributo della relazione

✅ **MANTENERE SEPARATA**

---

## 3. Proposta: ListinoPrezzo → ListinoPrestazione

Rinominare per chiarezza semantica:
- `ListinoPrezzo` → `ListinoPrestazione`
- Rappresenta meglio il concetto: è il listino di una prestazione per un contesto specifico

```prisma
// Rinominare da ListinoPrezzo a ListinoPrestazione
model ListinoPrestazione {
  id                String  @id @default(uuid())
  prestazioneId     String
  medicoId          String?
  convenzioneId     String?
  poliambulatorioId String?
  
  prezzo            Decimal
  durataMedico      Int?
  compensoMedicoTipo    TipoCompensoMedico?
  compensoMedicoValore  Decimal?
  // ...
  
  @@map("listini_prestazioni")
}
```

**PRO**: Nome più chiaro
**CONTRO**: Migration rename su tabella esistente

---

## 4. Schema Proposto Finale

### Entità da Mantenere (con eventuale rename)
| Entità Attuale | Proposta | Motivazione |
|---------------|----------|-------------|
| `Prestazione` | ✅ Keep | Core entity |
| `MedicoAbilitato` | ✅ Keep (o rename `PersonPrestazione`) | Join M:N con attributi |
| `ListinoPrezzo` | ⚠️ Rename `ListinoPrestazione` | Chiarezza semantica |
| `PrestazioneStrumento` | ✅ Keep | Join M:N con attributi |
| `AmbulatorioPrestazione` | ✅ Keep | Join M:N con attributi |
| `PrestazioneAggiuntiva` | ✅ Keep | Scopo diverso (visita-level) |
| `OffertaBundle` | ⚠️ Valutare | Potrebbe diventare Prestazione con isBundle |
| `OffertaBundlePrestazione` | ⚠️ Dipende da OffertaBundle | Se bundle consolidato, diventa self-relation |

### Modifiche Già Implementate (questa sessione)
1. ✅ `brancaSpecialistica String?` → `brancheSpecialistiche String[]`
2. ✅ Gestione `prestazioniIds` in PUT/POST medici
3. ✅ Abilitazioni mostrate in MedicoDetailPage

---

## 5. Raccomandazione Finale

### Fase 1 (Quick Wins) - ✅ FATTO
- [x] Rinominare schema: `brancaSpecialistica` → `brancheSpecialistiche`
- [x] Implementare salvataggio prestazioni abilitate in medici

### Fase 2 (Opzionale - Refactoring)
- [ ] Valutare rename `ListinoPrezzo` → `ListinoPrestazione`
- [ ] Valutare rename `MedicoAbilitato` → `PersonPrestazione`

### Fase 3 (Future - Se necessario)
- [ ] Consolidamento Bundle in Prestazione (richiede analisi più approfondita del business case)

---

## Conclusione

**NON consiglio consolidamenti massivi** perché:
1. Le tabelle di join con attributi sono pattern corretti
2. Il rischio di regressione è alto
3. I benefici sono marginali (solo chiarezza nomenclatura)

### Analisi Finale MedicoAbilitato vs ListinoPrezzo (19 Dicembre 2025)

**Sono entità concettualmente diverse**:

| Aspetto | MedicoAbilitato | ListinoPrezzo |
|---------|-----------------|---------------|
| **Scopo** | Abilita medico a eseguire prestazione | Definisce prezzo per contesto specifico |
| **Cardinalità** | 1:1 (medico:prestazione) | N:N (più prezzi per stessa prestazione) |
| **Chiave** | medicoId + prestazioneId (unique) | prestazioneId + convenzioneId + medicoId + poliambulatorioId |
| **Dati principali** | Compenso di default, abilitazione | Prezzo, validità, priorità |

**Consolidamento NON consigliato** perché:
- Sono concetti diversi con relazioni diverse
- MedicoAbilitato = "chi può fare cosa"
- ListinoPrezzo = "quanto costa cosa in quale contesto"

**Rename ListinoPrezzo → ListinoPrestazione**:
- ⚠️ **NON consigliato ora** - benefici semantici, ma costi alti:
  - Modifica schema + migration
  - Modifica tutti i servizi backend
  - Modifica API frontend
  - Rischio regressioni
- ✅ Da valutare in futuro se serve major refactoring

**Consiglio**:
- ✅ Mantenere struttura dati attuale
- ✅ Focus su funzionalità piuttosto che refactoring schema
- ✅ Documentare bene le differenze per nuovi sviluppatori
