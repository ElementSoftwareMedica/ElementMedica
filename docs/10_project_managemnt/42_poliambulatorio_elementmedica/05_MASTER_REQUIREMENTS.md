# 📋 MASTER REQUIREMENTS - Poliambulatorio ElementMedica

**Versione**: 2.0  
**Data**: 2025-12-11  
**Stato**: ✅ APPROVATO

---

## 1. EXECUTIVE SUMMARY

Questo documento definisce i requisiti completi per la gestione di un **poliambulatorio medico professionale**, coprendo tutti gli aspetti operativi end-to-end: dalla struttura fisica alla refertazione, dalla fatturazione alla compliance GDPR.

---

## 2. REQUISITI STRUTTURA FISICA

### 2.1 Poliambulatorio (REQ-STR-001)

| Campo | Tipo | Obbligatorio | Descrizione |
|-------|------|--------------|-------------|
| Nome | String | ✅ | Nome ufficiale struttura |
| Codice | String | ✅ | Codice identificativo interno |
| Codice Regionale | String | ⚠️ | Codice ASL/Regione |
| Codice Ministeriale | String | ❌ | Codice flusso ministeriale |
| Ragione Sociale | String | ✅ | Ragione sociale legale |
| Partita IVA | String | ✅ | P.IVA |
| Codice Fiscale | String | ✅ | CF struttura |
| Indirizzo | Object | ✅ | Via, civico, CAP, città, provincia |
| Contatti | Object | ✅ | Tel, fax, email, PEC |
| Sito Web | String | ❌ | URL sito pubblico |
| Orari Apertura | JSON | ✅ | Orari settimanali |
| Logo | File | ❌ | Logo per documenti |
| Direttore Sanitario | Ref | ✅ | Link a Person |
| Responsabile Amministrativo | Ref | ❌ | Link a Person |
| Data Inizio Attività | Date | ✅ | Data apertura |
| Autorizzazioni | JSON | ✅ | Autorizzazioni sanitarie |

**Regole Business**:
- Un tenant può avere più poliambulatori
- Codice regionale obbligatorio se SSN convenzionato
- Direttore sanitario deve essere medico iscritto all'albo

### 2.2 Sede (REQ-STR-002)

| Campo | Tipo | Obbligatorio | Descrizione |
|-------|------|--------------|-------------|
| Nome | String | ✅ | Nome sede (es. "Sede Centrale") |
| Codice | String | ✅ | Codice sede |
| Poliambulatorio | Ref | ✅ | Appartenenza |
| Indirizzo | Object | ✅ | Indirizzo completo |
| Coordinate GPS | Object | ❌ | Lat/Long per mappe |
| Piani | Int | ❌ | Numero piani |
| MQ Totali | Int | ❌ | Superficie totale |
| Accessibilità Disabili | Boolean | ✅ | Barriere architettoniche |
| Parcheggio | Boolean | ❌ | Parcheggio disponibile |
| Trasporti Pubblici | String | ❌ | Info trasporti |
| Note Logistiche | Text | ❌ | Come raggiungere |

### 2.3 Ambulatorio (REQ-STR-003)

| Campo | Tipo | Obbligatorio | Descrizione |
|-------|------|--------------|-------------|
| Nome | String | ✅ | Nome ambulatorio |
| Codice | String | ✅ | Codice interno (es. "AMB-01") |
| Numero Stanza | String | ❌ | Numero porta/stanza |
| Sede | Ref | ✅ | Appartenenza sede |
| Piano | String | ✅ | Piano (PT, 1°, 2°, etc.) |
| Tipologia | Enum | ✅ | Vedi enum sotto |
| Specializzazioni | Array | ✅ | Specialità mediche abilitate |
| Descrizione | Text | ❌ | Descrizione ambulatorio |
| Capienza Max | Int | ✅ | Numero max persone |
| Superficie MQ | Int | ❌ | Metri quadri |
| Attrezzature Fisse | JSON | ❌ | Lista attrezzature fisse |
| Strumenti Assegnati | Ref[] | ❌ | Link a Strumento |
| È Sala Operatoria | Boolean | ✅ | Flag per chirurgia |
| Classe Rischio | Enum | ❌ | Basso/Medio/Alto |
| Note | Text | ❌ | Note interne |

**Enum TipoAmbulatorio**:
```
VISITA_GENERALE     - Ambulatorio generico visite
SPECIALISTICO       - Ambulatorio specialistico
DIAGNOSTICA         - Diagnostica per immagini
LABORATORIO         - Prelievi e analisi
SALA_OPERATORIA     - Chirurgia ambulatoriale
SALA_RISVEGLIO      - Post-operatorio
TERAPIA             - Terapie/infusioni
FISIOTERAPIA        - Riabilitazione
ODONTOIATRICO       - Odontoiatria
PEDIATRICO          - Dedicato bambini
DAY_HOSPITAL        - Day hospital
ALTRO
```

### 2.4 Orario Ambulatorio (REQ-STR-004)

| Campo | Tipo | Obbligatorio | Descrizione |
|-------|------|--------------|-------------|
| Ambulatorio | Ref | ✅ | Link ambulatorio |
| Giorno Settimana | Enum | ✅ | LUN-DOM |
| Ora Inizio | Time | ✅ | Apertura |
| Ora Fine | Time | ✅ | Chiusura |
| Pausa Inizio | Time | ❌ | Inizio pausa |
| Pausa Fine | Time | ❌ | Fine pausa |
| È Attivo | Boolean | ✅ | Slot attivo |
| Note | String | ❌ | Note specifiche |

---

## 3. REQUISITI STRUMENTARIO

### 3.1 Strumento (REQ-STR-005)

| Campo | Tipo | Obbligatorio | Descrizione |
|-------|------|--------------|-------------|
| Nome | String | ✅ | Nome strumento |
| Codice | String | ✅ | Codice inventario |
| Categoria | Enum | ✅ | Categoria strumento |
| Marca | String | ❌ | Produttore |
| Modello | String | ❌ | Modello |
| Numero Serie | String | ❌ | S/N |
| Data Acquisto | Date | ✅ | Data acquisto |
| Costo Acquisto | Decimal | ❌ | Prezzo acquisto |
| Modalità Acquisto | Enum | ✅ | Acquisto/Leasing/Noleggio |
| Fornitore | String | ❌ | Nome fornitore |
| Garanzia Scadenza | Date | ❌ | Fine garanzia |
| Vita Utile Anni | Int | ❌ | Ammortamento |
| Stato | Enum | ✅ | Stato attuale |
| Ambulatorio Assegnato | Ref | ❌ | Dove si trova |
| Prestazioni Abilitate | Ref[] | ❌ | Prestazioni che lo usano |
| Documenti | File[] | ❌ | Manuali, certificati |
| Note | Text | ❌ | Note |

**Enum CategoriaStrumento**:
```
DIAGNOSTICA_IMMAGINI    - Ecografi, RX, TAC
ELETTROMEDICALE         - ECG, Holter, etc.
CHIRURGICO              - Strumenti chirurgia
LABORATORIO             - Analisi
RIABILITAZIONE          - Fisioterapia
STERILIZZAZIONE         - Autoclavi
INFORMATICO             - PC, stampanti
ARREDO_SANITARIO        - Lettini, lampade
ALTRO
```

**Enum ModalitàAcquisto**:
```
ACQUISTO_DIRETTO
LEASING
NOLEGGIO
COMODATO_USO
DONAZIONE
```

**Enum StatoStrumento**:
```
DISPONIBILE
IN_USO
MANUTENZIONE_PROGRAMMATA
MANUTENZIONE_STRAORDINARIA
GUASTO
IN_RIPARAZIONE
DISMESSO
DA_VERIFICARE
```

### 3.2 Manutenzione Strumento (REQ-STR-006)

| Campo | Tipo | Obbligatorio | Descrizione |
|-------|------|--------------|-------------|
| Strumento | Ref | ✅ | Link strumento |
| Tipo | Enum | ✅ | Tipo manutenzione |
| Data Programmata | Date | ✅ | Data prevista |
| Data Esecuzione | Date | ❌ | Data effettiva |
| Stato | Enum | ✅ | Stato manutenzione |
| Fornitore | String | ❌ | Chi esegue |
| Costo | Decimal | ❌ | Costo intervento |
| Descrizione | Text | ❌ | Descrizione lavori |
| Esito | Enum | ❌ | Esito intervento |
| Prossima Manutenzione | Date | ❌ | Data successiva |
| Documenti | File[] | ❌ | Rapporti, fatture |
| Note | Text | ❌ | Note |

**Enum TipoManutenzione**:
```
ORDINARIA_PROGRAMMATA
STRAORDINARIA
CALIBRAZIONE
VERIFICA_SICUREZZA
COLLAUDO
SOSTITUZIONE_PARTI
AGGIORNAMENTO_SOFTWARE
```

### 3.3 ROI Strumento (REQ-STR-007)

**Calcoli automatici**:
- Costo totale possesso (TCO)
- Ricavo da prestazioni eseguite
- ROI = (Ricavi - Costi) / Costi × 100
- Data stimata rientro investimento
- Costo per prestazione
- Utilizzo medio giornaliero/mensile

---

## 4. REQUISITI CATALOGO PRESTAZIONI

### 4.1 Prestazione (REQ-CAT-001)

| Campo | Tipo | Obbligatorio | Descrizione |
|-------|------|--------------|-------------|
| Nome | String | ✅ | Nome prestazione |
| Codice | String | ✅ | Codice interno |
| Codice Nomenclatore | String | ❌ | Codice tariffario nazionale |
| Codice LEA | String | ❌ | Livelli Essenziali Assistenza |
| Tipo | Enum | ✅ | Tipo prestazione |
| Specialità | String | ✅ | Branca specialistica |
| Categoria | String | ❌ | Raggruppamento custom |
| Sottocategoria | String | ❌ | Sottogruppo |
| Descrizione | Text | ❌ | Descrizione completa |
| Durata Standard | Int | ✅ | Minuti (default 30) |
| Durata Minima | Int | ❌ | Minuti minimo |
| Durata Massima | Int | ❌ | Minuti massimo |
| Tempo Preparazione | Int | ❌ | Setup ambulatorio |
| Tempo Pulizia | Int | ❌ | Post-visita |
| Richiede Digiuno | Boolean | ✅ | Paziente a digiuno |
| Ore Digiuno | Int | ❌ | Ore digiuno richieste |
| Richiede Prenotazione 24h | Boolean | ✅ | Anticipo minimo |
| Richiede Consenso | Boolean | ✅ | Consenso informato |
| Richiede Impegnativa | Boolean | ✅ | Ricetta SSN |
| Richiede Accompagnatore | Boolean | ❌ | Accompagnatore necessario |
| Istruzioni Paziente | Text | ❌ | Preparazione |
| Note Interne | Text | ❌ | Note staff |
| Controindicazioni | Text | ❌ | Controindicazioni |
| Prenotabile Online | Boolean | ✅ | Visibile booking |
| È Attiva | Boolean | ✅ | Attiva/disattivata |
| Ambulatori Abilitati | Ref[] | ✅ | Dove si può fare |
| Medici Abilitati | Ref[] | ✅ | Chi può farla |
| Strumenti Necessari | Ref[] | ❌ | Strumenti richiesti |
| Prestazioni Collegate | Ref[] | ❌ | Pacchetti/associate |
| Template Campi Visita | Ref[] | ✅ | Form personalizzato |
| % Medico Default | Decimal | ❌ | Compenso medico |

**Enum TipoPrestazione** (esteso):
```
VISITA_PRIMA           - Prima visita specialistica
VISITA_CONTROLLO       - Visita di controllo
CONSULTO               - Consulenza
ESAME_STRUMENTALE      - Esame con strumentazione
ESAME_LABORATORIO      - Esame di laboratorio
INTERVENTO_AMBULATORIALE - Chirurgia ambulatoriale
INTERVENTO_DAY_SURGERY - Day surgery
TERAPIA                - Trattamento terapeutico
RIABILITAZIONE         - Fisioterapia/riab
CERTIFICAZIONE         - Solo certificato
TELECONSULTO           - Visita online
URGENZA                - Prestazione urgente
ALTRO
```

### 4.2 Associazione Prestazione-Medico (REQ-CAT-002)

| Campo | Tipo | Obbligatorio | Descrizione |
|-------|------|--------------|-------------|
| Prestazione | Ref | ✅ | Link prestazione |
| Medico | Ref | ✅ | Link medico |
| Durata Override | Int | ❌ | Durata specifica medico |
| % Compenso Override | Decimal | ❌ | % specifica |
| È Primario | Boolean | ✅ | Medico principale |
| Priorità | Int | ❌ | Ordine preferenza |
| Note | String | ❌ | Note |

### 4.3 Associazione Prestazione-Strumento (REQ-CAT-003)

| Campo | Tipo | Obbligatorio | Descrizione |
|-------|------|--------------|-------------|
| Prestazione | Ref | ✅ | Link prestazione |
| Strumento | Ref | ✅ | Link strumento |
| È Obbligatorio | Boolean | ✅ | Necessario o opzionale |
| Quantità | Int | ✅ | Quanti ne servono |
| Note | String | ❌ | Note |

### 4.4 Pacchetti Prestazioni (REQ-CAT-004)

| Campo | Tipo | Obbligatorio | Descrizione |
|-------|------|--------------|-------------|
| Nome | String | ✅ | Nome pacchetto |
| Codice | String | ✅ | Codice pacchetto |
| Descrizione | Text | ❌ | Descrizione |
| Prestazioni Incluse | Ref[] | ✅ | Lista prestazioni |
| Prezzo Pacchetto | Decimal | ✅ | Prezzo totale |
| Sconto % | Decimal | ❌ | Sconto applicato |
| Validità Giorni | Int | ❌ | Entro quando usare |
| È Attivo | Boolean | ✅ | Attivo |

---

## 5. REQUISITI TEMPLATE VISITA (FORM BUILDER)

### 5.1 Template Campo Visita (REQ-VIS-001)

| Campo | Tipo | Obbligatorio | Descrizione |
|-------|------|--------------|-------------|
| Prestazione | Ref | ✅ | Appartenenza |
| Nome Campo | String | ✅ | Identificatore |
| Etichetta | String | ✅ | Label UI |
| Tipo | Enum | ✅ | Tipo input |
| Gruppo | String | ❌ | Raggruppamento UI |
| È Obbligatorio | Boolean | ✅ | Validazione |
| Ordinamento | Int | ✅ | Posizione |
| Larghezza | Enum | ✅ | full/half/third |
| Valore Default | String | ❌ | Pre-compilato |
| Placeholder | String | ❌ | Placeholder |
| Note Aiuto | String | ❌ | Tooltip |
| Opzioni | JSON | ❌ | Per select/radio |
| Validazione Regex | String | ❌ | Pattern validazione |
| Valore Minimo | Decimal | ❌ | Per number |
| Valore Massimo | Decimal | ❌ | Per number |
| Unità Misura | String | ❌ | es. "mmHg", "bpm" |
| Condizione Campo | Ref | ❌ | Mostra se... |
| Condizione Valore | String | ❌ | ...questo valore |
| È Storico | Boolean | ✅ | Mantiene storico |
| Mostra In Stampa | Boolean | ✅ | Include in PDF |
| Mostra In Referto | Boolean | ✅ | Include in referto |

**Enum TipoCampoVisita** (esteso):
```
TEXT                    - Input testo breve
TEXTAREA                - Testo lungo
TEXTAREA_RICH           - Editor rich text
NUMBER                  - Numerico
NUMBER_DECIMAL          - Decimale
DATE                    - Solo data
TIME                    - Solo ora
DATETIME                - Data e ora
SELECT                  - Dropdown singolo
SELECT_SEARCHABLE       - Dropdown con ricerca
MULTISELECT             - Multi-selezione
RADIO                   - Radio buttons
CHECKBOX                - Checkbox singolo
CHECKBOX_GROUP          - Gruppo checkbox
TOGGLE                  - Switch on/off
FILE                    - Upload file
FILE_MULTIPLE           - Upload multiplo
IMAGE                   - Upload immagine
SIGNATURE               - Firma digitale
SCALE_LINEAR            - Scala lineare (1-10)
SCALE_VAS               - Scala VAS dolore
SCALE_LIKERT            - Scala Likert
BODY_MAP                - Mappa corporea
CALCULATED              - Campo calcolato
REFERENCE               - Riferimento ad altro campo storico
SECTION_HEADER          - Intestazione sezione
SEPARATOR               - Separatore visivo
INFO_TEXT               - Testo informativo
```

### 5.2 Campi Statici vs Dinamici (REQ-VIS-002)

**Campi Statici** (persistono nel paziente, aggiornabili):
- Anamnesi patologica remota
- Anamnesi familiare
- Allergie
- Farmaci in uso cronico
- Peso, altezza (con storico)
- Gruppo sanguigno

**Campi Dinamici** (specifici per visita):
- Anamnesi prossima
- Esame obiettivo
- Parametri vitali attuali
- Diagnosi
- Terapia prescritta

---

## 6. REQUISITI LISTINI E PRICING

### 6.1 Listino (REQ-PRC-001)

| Campo | Tipo | Obbligatorio | Descrizione |
|-------|------|--------------|-------------|
| Nome | String | ✅ | Nome listino |
| Codice | String | ✅ | Codice |
| Tipo | Enum | ✅ | Tipo listino |
| Descrizione | Text | ❌ | Descrizione |
| È Default | Boolean | ✅ | Listino predefinito |
| È Attivo | Boolean | ✅ | Attivo |
| Valido Da | Date | ✅ | Inizio validità |
| Valido A | Date | ❌ | Fine validità |
| Arrotondamento | Enum | ❌ | Tipo arrotondamento |

**Enum TipoListino**:
```
PRIVATO              - Pazienti privati
SSN                  - Servizio Sanitario
INTRAMOENIA          - Libera professione
ASSICURAZIONE        - Polizze sanitarie
CONVENZIONE_AZIENDA  - Convenzioni aziendali
CONVENZIONE_PALESTRA - Convenzioni sport
CONVENZIONE_ENTE     - Altri enti
DIPENDENTI           - Sconti dipendenti
PROMOZIONE           - Offerte temporanee
```

### 6.2 Prezzo Listino (REQ-PRC-002)

| Campo | Tipo | Obbligatorio | Descrizione |
|-------|------|--------------|-------------|
| Listino | Ref | ✅ | Appartenenza |
| Prestazione | Ref | ✅ | Prestazione |
| Prezzo | Decimal | ✅ | Prezzo |
| Prezzo Minimo | Decimal | ❌ | Range negoziabile |
| Prezzo Massimo | Decimal | ❌ | Range negoziabile |
| IVA % | Decimal | ✅ | Aliquota IVA |
| È Esente IVA | Boolean | ✅ | Esenzione |
| Codice Esenzione | String | ❌ | Codice esenzione |
| Note | String | ❌ | Note |

### 6.3 Convenzione (REQ-PRC-003)

| Campo | Tipo | Obbligatorio | Descrizione |
|-------|------|--------------|-------------|
| Nome | String | ✅ | Nome convenzione |
| Codice | String | ✅ | Codice |
| Tipo Ente | Enum | ✅ | Tipo convenzionato |
| Ragione Sociale | String | ✅ | Ente convenzionato |
| P.IVA | String | ❌ | P.IVA ente |
| Referente | String | ❌ | Contatto |
| Email | String | ❌ | Email contatto |
| Telefono | String | ❌ | Telefono |
| Listino Associato | Ref | ✅ | Listino prezzi |
| Sconto % Aggiuntivo | Decimal | ❌ | Sconto extra |
| Plafond Annuo | Decimal | ❌ | Tetto spesa |
| Plafond Utilizzato | Decimal | ❌ | Calcolato |
| Modalità Fatturazione | Enum | ✅ | Come fatturare |
| Valido Da | Date | ✅ | Inizio |
| Valido A | Date | ❌ | Fine |
| È Attiva | Boolean | ✅ | Attiva |
| Documenti | File[] | ❌ | Contratto, etc. |

**Enum TipoEnteConvenzione**:
```
ASSICURAZIONE
FONDO_SANITARIO
AZIENDA
ASSOCIAZIONE
ENTE_PUBBLICO
PALESTRA_CENTRO_SPORTIVO
SCUOLA_UNIVERSITA
ALTRO
```

**Enum ModalitaFatturazione**:
```
DIRETTA_PAZIENTE       - Paziente paga, chiede rimborso
DIRETTA_ENTE           - Fattura all'ente
MISTA                  - Parte paziente, parte ente
ANTICIPO_ENTE          - Ente paga in anticipo
```

### 6.4 Codice Sconto (REQ-PRC-004)

| Campo | Tipo | Obbligatorio | Descrizione |
|-------|------|--------------|-------------|
| Codice | String | ✅ | Codice sconto |
| Nome | String | ✅ | Descrizione |
| Tipo Sconto | Enum | ✅ | Tipo |
| Valore | Decimal | ✅ | Importo o % |
| Applicabile A | Enum | ✅ | Cosa sconta |
| Prestazioni | Ref[] | ❌ | Se specifiche |
| Utilizzi Max | Int | ❌ | Limite utilizzi |
| Utilizzi Correnti | Int | ❌ | Calcolato |
| Utilizzi Max Per Paziente | Int | ❌ | Limite per pz |
| Valido Da | Date | ✅ | Inizio |
| Valido A | Date | ❌ | Fine |
| È Attivo | Boolean | ✅ | Attivo |
| È Cumulabile | Boolean | ✅ | Con altri sconti |
| Origine | Enum | ❌ | Tracciabilità |

**Enum TipoSconto**:
```
PERCENTUALE
IMPORTO_FISSO
PREZZO_SPECIALE
```

**Enum OrigineSconto**:
```
PROMOZIONE_WEB
CONVENZIONE
FEDELTA
PACCHETTO
DIPENDENTE
REFERRAL
ALTRO
```

---

## 7. REQUISITI AGENDA E BOOKING

### 7.1 Disponibilità Medico (REQ-AGN-001)

| Campo | Tipo | Obbligatorio | Descrizione |
|-------|------|--------------|-------------|
| Medico | Ref | ✅ | Link medico |
| Ambulatorio | Ref | ✅ | Dove |
| Giorno Settimana | Enum | ✅ | LUN-DOM |
| Ora Inizio | Time | ✅ | Inizio |
| Ora Fine | Time | ✅ | Fine |
| Slot Durata | Int | ✅ | Durata slot (min) |
| Pausa Inizio | Time | ❌ | Pausa |
| Pausa Fine | Time | ❌ | Fine pausa |
| Prestazioni Abilitate | Ref[] | ❌ | Se specifiche |
| È Attivo | Boolean | ✅ | Attivo |
| Valido Da | Date | ❌ | Se temporaneo |
| Valido A | Date | ❌ | Se temporaneo |
| Note | String | ❌ | Note |

### 7.2 Ferie e Assenze (REQ-AGN-002)

| Campo | Tipo | Obbligatorio | Descrizione |
|-------|------|--------------|-------------|
| Persona | Ref | ✅ | Chi |
| Tipo | Enum | ✅ | Tipo assenza |
| Data Inizio | DateTime | ✅ | Da |
| Data Fine | DateTime | ✅ | A |
| È Giornata Intera | Boolean | ✅ | Tutto il giorno |
| Motivo | String | ❌ | Motivazione |
| È Approvata | Boolean | ✅ | Stato |
| Approvata Da | Ref | ❌ | Chi approva |
| Note | Text | ❌ | Note |

**Enum TipoAssenza**:
```
FERIE
MALATTIA
PERMESSO
CONGRESSO
FORMAZIONE
ALTRO
```

### 7.3 Slot Disponibilità (REQ-AGN-003)

Calcolato dinamicamente da:
- Disponibilità medico + ambulatorio
- Ferie/assenze
- Appuntamenti già prenotati
- Manutenzione strumenti necessari

---

## 8. REQUISITI APPUNTAMENTI

### 8.1 Appuntamento (REQ-APP-001)

| Campo | Tipo | Obbligatorio | Descrizione |
|-------|------|--------------|-------------|
| Numero | String | ✅ | Progressivo giornaliero |
| Paziente | Ref | ✅ | Chi |
| Medico | Ref | ✅ | Con chi |
| Ambulatorio | Ref | ✅ | Dove |
| Prestazione | Ref | ✅ | Cosa |
| Data Ora | DateTime | ✅ | Quando |
| Durata Prevista | Int | ✅ | Minuti |
| Stato | Enum | ✅ | Stato workflow |
| Stato Secondario | Enum | ❌ | Dettaglio |
| Origine | Enum | ✅ | Come prenotato |
| Listino | Ref | ❌ | Listino applicato |
| Convenzione | Ref | ❌ | Se convenzionato |
| Codice Sconto | Ref | ❌ | Sconto applicato |
| Prezzo Calcolato | Decimal | ❌ | Prezzo finale |
| Note | Text | ❌ | Note paziente |
| Note Interne | Text | ❌ | Note staff |
| Promemoria | Boolean | ✅ | Invia reminder |
| Promemoria Inviato | Boolean | ❌ | Stato |
| Canale Promemoria | Enum | ❌ | Come |
| Consensi Firmati | Boolean | ❌ | Privacy ok |
| Documenti Richiesti | JSON | ❌ | Check list |
| È Ricorrente | Boolean | ✅ | Ripetuto |
| Pattern Ricorrenza | JSON | ❌ | Regole |
| Appuntamento Padre | Ref | ❌ | Se ricorrente |
| Data Conferma | DateTime | ❌ | Quando confermato |
| Data Annullamento | DateTime | ❌ | Se annullato |
| Motivo Annullamento | String | ❌ | Perché |
| Numero Coda | Int | ❌ | Per chiamata |
| Ora Arrivo | DateTime | ❌ | Check-in |
| Ora Inizio Visita | DateTime | ❌ | Start |
| Ora Fine Visita | DateTime | ❌ | End |
| Ritardo Paziente | Int | ❌ | Minuti ritardo pz |
| Ritardo Medico | Int | ❌ | Minuti ritardo medico |
| Durata Effettiva | Int | ❌ | Durata reale |
| Disabile | Boolean | ❌ | Paziente disabile |
| Accompagnatore | String | ❌ | Nome accompagnatore |
| Creato Da | Ref | ✅ | Chi ha prenotato |

**Enum StatoAppuntamento**:
```
BOZZA                  - In creazione
PRENOTATO              - Prenotato
IN_ATTESA_CONFERMA     - Da confermare (online)
CONFERMATO             - Confermato da paziente
ACCETTATO              - Check-in fatto
IN_ATTESA              - In sala attesa
CHIAMATO               - Chiamato su monitor
IN_VISITA              - Visita in corso
COMPLETATO             - Visita conclusa
FATTURATO              - Pagato
ANNULLATO              - Annullato
NO_SHOW                - Non presentato
RIPROGRAMMATO          - Spostato
```

**Enum StatoSecondarioAppuntamento**:
```
IN_ORARIO              - Paziente puntuale
RITARDO_LIEVE          - Ritardo < 15 min
RITARDO_GRAVE          - Ritardo > 15 min
ANTICIPO               - Arrivato prima
URGENTE                - Gestito come urgente
```

**Enum OriginePrenotazione**:
```
TELEFONO
SPORTELLO
WEB_PUBBLICO
APP_MOBILE
EMAIL
WHATSAPP
REFERRAL_MEDICO
RECALL
RICORRENZA
```

### 8.2 Metriche Appuntamento (REQ-APP-002)

Calcoli automatici per analytics:
- Tempo medio attesa (arrivo → inizio)
- % no-show per medico/prestazione
- % ritardi paziente
- % ritardi medico (>15 min)
- Durata media vs prevista
- % completamento giornaliero

---

## 9. REQUISITI NUMERO CHIAMATA

### 9.1 Sistema Coda (REQ-COD-001)

| Campo | Tipo | Obbligatorio | Descrizione |
|-------|------|--------------|-------------|
| Appuntamento | Ref | ✅ | Link appuntamento |
| Numero | Int | ✅ | Numero ticket |
| Prefisso | String | ❌ | Es. "A", "B" per code |
| Stato | Enum | ✅ | Stato |
| Ambulatorio | Ref | ✅ | Destinazione |
| Piano | String | ❌ | Info piano |
| Ora Assegnazione | DateTime | ✅ | Quando assegnato |
| Ora Chiamata | DateTime | ❌ | Prima chiamata |
| Chiamate | Int | ✅ | Numero chiamate |
| Chiamato Da | Ref | ❌ | Chi chiama |
| È Urgente | Boolean | ✅ | Priorità |

**Funzionalità Monitor**:
- Display numeri chiamati + ambulatorio
- Audio notifica (TTS o beep)
- WebSocket real-time
- Storico chiamate

---

## 10. REQUISITI VISITA CLINICA

### 10.1 Visita (REQ-VIS-010)

| Campo | Tipo | Obbligatorio | Descrizione |
|-------|------|--------------|-------------|
| Appuntamento | Ref | ✅ | Origine |
| Paziente | Ref | ✅ | Chi |
| Medico Esecutore | Ref | ✅ | Chi visita |
| Infermiere Assistente | Ref | ❌ | Se presente |
| Prestazione | Ref | ✅ | Cosa |
| Stato | Enum | ✅ | Stato |
| Ora Inizio | DateTime | ✅ | Start |
| Ora Fine | DateTime | ❌ | End |
| Durata Effettiva | Int | ❌ | Calcolata |
| Valori Campi | Rel[] | ✅ | Dati inseriti |
| Dati Clinici JSON | JSON | ❌ | Snapshot |
| Note Visita | Text | ❌ | Note visibili |
| Note Interne | Text | ❌ | Solo staff |
| Allegati | Rel[] | ❌ | File |
| Prestazioni Aggiuntive | Rel[] | ❌ | Extra |
| Referto | Rel | ❌ | Link referto |

### 10.2 Campi Statici Paziente (REQ-VIS-011)

Dati persistenti aggiornabili con storico:
- Anamnesi patologica remota
- Anamnesi familiare
- Allergie (con severità)
- Intolleranze
- Farmaci cronici
- Parametri antropometrici (peso, altezza, BMI)
- Gruppo sanguigno
- Vaccinazioni
- Interventi chirurgici pregressi

### 10.3 Auto-Save (REQ-VIS-012)

- Salvataggio automatico ogni 30 secondi
- Indicatore stato salvataggio
- Recovery bozze non completate
- Versioning interno modifiche

---

## 11. REQUISITI REFERTAZIONE

### 11.1 Referto (REQ-REF-001)

| Campo | Tipo | Obbligatorio | Descrizione |
|-------|------|--------------|-------------|
| Visita | Ref | ✅ | Origine |
| Numero | String | ✅ | Progressivo |
| Stato | Enum | ✅ | Stato |
| Template | Ref | ❌ | Template usato |
| Contenuto | Text | ✅ | Testo referto |
| Contenuto HTML | Text | ❌ | Versione formattata |
| Versioni | Rel[] | ✅ | Event sourcing |
| Firma | Rel | ❌ | Firma digitale |
| PDF URL | String | ❌ | PDF generato |
| Inviato A | JSON | ❌ | Destinatari |
| Data Invio | DateTime | ❌ | Quando |

**Enum StatoReferto**:
```
BOZZA
IN_REVISIONE
COMPLETATO
FIRMATO
INVIATO
ANNULLATO
```

### 11.2 Versioning (Event Sourcing) (REQ-REF-002)

| Campo | Tipo | Obbligatorio | Descrizione |
|-------|------|--------------|-------------|
| Referto | Ref | ✅ | Quale referto |
| Versione | Int | ✅ | Numero versione |
| Contenuto | Text | ✅ | Snapshot completo |
| Hash | String | ✅ | SHA-256 contenuto |
| Modifica Da | Ref | ✅ | Chi ha modificato |
| Data | DateTime | ✅ | Quando |
| Motivo | String | ❌ | Perché modificato |
| Versione Precedente | Ref | ❌ | Link previous |

**Regole**:
- Ogni modifica = nuova versione
- Referto firmato = immutabile
- Versioni mai cancellate
- Hash per integrità

### 11.3 Firma Digitale (REQ-REF-003)

| Campo | Tipo | Obbligatorio | Descrizione |
|-------|------|--------------|-------------|
| Referto | Ref | ✅ | Cosa firma |
| Firmatario | Ref | ✅ | Chi firma |
| Tipo Firma | Enum | ✅ | Tipo |
| Hash Contenuto | String | ✅ | Hash firmato |
| Certificato | String | ❌ | Riferimento cert |
| Timestamp | DateTime | ✅ | Quando |
| IP Address | String | ✅ | Da dove |
| User Agent | String | ❌ | Browser |

**Prerequisiti firma**:
- Utente = medico della visita
- 2FA verificato (se abilitato)
- Referto in stato COMPLETATO
- Tutti campi obbligatori compilati

---

## 12. REQUISITI RUOLI E PERMESSI

### 12.1 Ruoli Clinici (REQ-ROL-001)

| Ruolo | Descrizione | Permessi Base |
|-------|-------------|---------------|
| DIRETTORE_SANITARIO | Responsabile struttura | Full access clinico |
| MEDICO_SPECIALISTA | Medico specializzato | Visite, referti, firma |
| MEDICO_BASE | Medico generico | Visite base |
| INFERMIERE | Personale infermieristico | Supporto visite |
| SEGRETERIA_MEDICA | Front office | Agenda, accettazione |
| AMMINISTRATIVO | Back office | Fatturazione, report |
| TECNICO_SANITARIO | Tecnico (es. radiologia) | Esami specifici |
| PAZIENTE | Paziente registrato | Solo propri dati |

### 12.2 Permessi Granulari (REQ-ROL-002)

```
// Pazienti
patients:read, patients:create, patients:update, patients:delete
patients:export, patients:merge

// Appuntamenti
appointments:read, appointments:create, appointments:update
appointments:cancel, appointments:accept, appointments:call

// Visite
visits:read, visits:create, visits:update, visits:start
visits:complete, visits:cancel

// Referti
reports:read, reports:create, reports:update, reports:sign
reports:export, reports:send

// Clinico
clinical:read_phi, clinical:write_phi, clinical:audit

// Agenda
agenda:read, agenda:manage, agenda:override

// Struttura
structure:read, structure:manage

// Catalogo
catalog:read, catalog:manage

// Fatturazione
billing:read, billing:create, billing:send

// Admin
admin:clinical_settings, admin:audit_view, admin:export_data
```

---

## 13. REQUISITI AUDIT E GDPR

### 13.1 Audit Log Clinico (REQ-AUD-001)

| Campo | Tipo | Obbligatorio | Descrizione |
|-------|------|--------------|-------------|
| Entità | String | ✅ | Tipo entità |
| Entità ID | String | ✅ | ID entità |
| Azione | Enum | ✅ | Cosa fatto |
| Utente | Ref | ✅ | Chi |
| Timestamp | DateTime | ✅ | Quando |
| IP Address | String | ✅ | Da dove |
| User Agent | String | ❌ | Browser |
| Dati Prima | JSON | ❌ | Stato before |
| Dati Dopo | JSON | ❌ | Stato after |
| Campi Modificati | String[] | ❌ | Quali campi |
| Motivo | String | ❌ | Perché |
| Tenant | Ref | ✅ | Isolamento |

**Enum AzioneAudit**:
```
CREATE
READ
UPDATE
DELETE
EXPORT
PRINT
SIGN
SEND
LOGIN
LOGOUT
ACCESS_PHI
DOWNLOAD
```

### 13.2 GDPR Compliance (REQ-AUD-002)

- **Data minimization**: Solo dati necessari
- **Consent tracking**: Tracciamento consensi
- **Right to access**: Export dati paziente
- **Right to erasure**: Anonimizzazione (no hard delete clinico)
- **Retention policies**: Tempi conservazione
- **Data breach**: Procedure notifica
- **PHI encryption**: Cifratura campi sensibili

---

## 14. REQUISITI FILE STORAGE

### 14.1 Documenti Clinici (REQ-FIL-001)

- Storage: S3/GCS/MinIO
- Encryption at rest: AES-256
- Signed URLs temporanei
- Virus scanning upload
- Metadata in DB, file su object store
- Backup automatico

### 14.2 Tipi Documento

```
REFERTI
ESAMI_LABORATORIO
DIAGNOSTICA_IMMAGINI
CONSENSI_FIRMATI
IMPEGNATIVE
RICETTE
CERTIFICATI
DOCUMENTI_IDENTITA
TESSERE_SANITARIE
ALTRO
```

---

## 15. REQUISITI SICUREZZA

### 15.1 Autenticazione (REQ-SEC-001)

- Password policy: min 12 char, complessità
- MFA obbligatorio per medici (TOTP)
- Session timeout: 30 min inattività
- Blocco dopo 5 tentativi falliti

### 15.2 Cifratura (REQ-SEC-002)

- TLS 1.3 in transit
- AES-256-GCM campi PHI
- Key rotation annuale
- HSM per chiavi (production)

### 15.3 Accesso PHI (REQ-SEC-003)

- Audit ogni accesso
- Break-the-glass per emergenze
- Alert accessi anomali
- Report accessi periodici

---

## 16. REQUISITI INTEGRAZIONI

### 16.1 Comunicazioni (REQ-INT-001)

| Canale | Uso | Provider |
|--------|-----|----------|
| Email | Conferme, referti | SendGrid/SES |
| SMS | Reminder | Twilio |
| WhatsApp | Reminder, chat | WhatsApp Business |
| Push | App mobile | Firebase |

### 16.2 Fatturazione (REQ-INT-002)

- Fattura elettronica XML
- Invio SDI
- Sistema TS (Tessera Sanitaria)
- PagoPA (opzionale)

### 16.3 Job Asincroni (REQ-INT-003)

- BullMQ + Redis
- PDF generation
- Email/SMS batch
- Report schedulati
- Reminder automatici
- Sync esterni

---

## 17. REQUISITI RICERCA

### 17.1 Full-Text Search (REQ-SRC-001)

- PostgreSQL FTS per base
- Elasticsearch per scale
- Indici: pazienti, referti, diagnosi
- Highlight risultati
- Filtri avanzati

---

## 18. REQUISITI COMUNICAZIONI MULTI-CANALE

### 18.1 Email Service (REQ-COM-001)

| Funzionalità | Descrizione |
|--------------|-------------|
| Provider | SendGrid (primary), AWS SES (backup) |
| Templates | Conferme, reminder, referti, fatture |
| Tracking | Open/click tracking |
| Unsubscribe | Link unsubscribe GDPR compliant |

### 18.2 SMS Service (REQ-COM-002)

| Funzionalità | Descrizione |
|--------------|-------------|
| Provider | Twilio |
| Templates | Reminder 24h/2h, conferma, OTP |
| Rate Limit | Max 3 SMS/numero/giorno |
| Opt-in | Consenso esplicito richiesto |

### 18.3 WhatsApp Business (REQ-COM-003)

| Funzionalità | Descrizione |
|--------------|-------------|
| Provider | Meta WhatsApp Business API |
| Templates | Approvati da Meta, interattivi |
| Quick Replies | Conferma/Cancella appuntamento |
| Chat | Risposte segreteria |

### 18.4 Push Notifications (REQ-COM-004)

| Funzionalità | Descrizione |
|--------------|-------------|
| Provider | Firebase Cloud Messaging |
| Platform | Web (PWA), iOS, Android |
| Topics | Per tenant, per utente |

### 18.5 Sistema Recall Automatico (REQ-COM-005)

| Funzionalità | Descrizione |
|--------------|-------------|
| Rules | Per prestazione, intervallo mesi |
| Channels | Email + WhatsApp (se opt-in) |
| Tracking | Log invii, conversioni |
| Opt-out | Rispetto preferenze paziente |

---

## 19. REQUISITI PORTALE PAZIENTE

### 19.1 Booking Online Pubblico (REQ-POR-001)

| Funzionalità | Descrizione |
|--------------|-------------|
| Selezione | Prestazione → Medico → Slot |
| Pagamento | Anticipato (Stripe/PayPal) |
| Widget | Embeddabile su sito esterno |
| CAPTCHA | Anti-spam reCAPTCHA v3 |

### 19.2 Area Riservata (REQ-POR-002)

| Sezione | Funzionalità |
|---------|--------------|
| Dashboard | Prossimi appuntamenti, ultimi referti |
| Appuntamenti | Visualizza, conferma, cancella |
| Referti | Lista, download PDF |
| Fatture | Visualizza, paga online |
| Profilo | Dati, preferenze comunicazione |

### 19.3 Autenticazione (REQ-POR-003)

| Metodo | Descrizione |
|--------|-------------|
| Magic Link | Link via email, 15 min validità |
| OTP SMS | Codice 6 cifre, 10 min |
| Password | Per utenti registrati |
| SPID | Identità digitale (futuro) |

### 19.4 Pagamenti Online (REQ-POR-004)

| Provider | Uso |
|----------|-----|
| Stripe | Carte credito/debito |
| PayPal | Wallet PayPal |

---

## 20. REQUISITI TELECONSULTO

### 20.1 Sessione Video (REQ-TEL-001)

| Funzionalità | Descrizione |
|--------------|-------------|
| Provider | Jitsi (self-hosted) o Twilio Video |
| Qualità | HD 720p, adaptive bitrate |
| Browser | Chrome 72+, Firefox 66+, Safari 12.1+ |
| Rete | Min 1 Mbps up/down |

### 20.2 Waiting Room (REQ-TEL-002)

| Funzionalità | Descrizione |
|--------------|-------------|
| Pre-call check | Test camera/microfono/rete |
| Sala attesa | Paziente attende ammissione medico |
| Notifiche | Alert quando medico disponibile |

### 20.3 Condivisione Documenti (REQ-TEL-003)

| Funzionalità | Descrizione |
|--------------|-------------|
| Upload | Durante sessione, paziente/medico |
| Screen share | Solo medico |
| Cartella | Accesso cartella clinica (medico) |

### 20.4 Chat Real-time (REQ-TEL-004)

| Funzionalità | Descrizione |
|--------------|-------------|
| Messaggi | Testo durante videochiamata |
| Sistema | Notifiche ingresso/uscita |
| WebSocket | Real-time bidirezionale |

### 20.5 Recording (REQ-TEL-005) - Opzionale

| Funzionalità | Descrizione |
|--------------|-------------|
| Consenso | Consenso esplicito paziente |
| Storage | S3 encrypted, retention 90gg |
| GDPR | Diritto cancellazione |

---

## 21. MATRICI DI TRACCIABILITÀ

### 21.1 Requisiti → Specifiche

| Requisito | Specifica |
|-----------|-----------|
| REQ-STR-001/003 | SPEC_01, SPEC_02 |
| REQ-STR-005/007 | SPEC_04 |
| REQ-CAT-001/004 | SPEC_03 |
| REQ-VIS-001/002 | SPEC_03, SPEC_09 |
| REQ-PRC-001/004 | SPEC_06 |
| REQ-AGN-001/003 | SPEC_05 |
| REQ-APP-001/002 | SPEC_07 |
| REQ-COD-001 | SPEC_08 |
| REQ-VIS-010/012 | SPEC_09 |
| REQ-REF-001/003 | SPEC_10 |
| REQ-ROL-001/002 | SPEC_11 |
| REQ-AUD-001/002 | SPEC_12 |
| REQ-FIL-001 | SPEC_13 |
| REQ-SEC-001/003 | SPEC_14 |
| REQ-SRC-001 | SPEC_15 |
| REQ-INT-003 | SPEC_16 |
| REQ-COM-001/005 | SPEC_17 |
| REQ-POR-001/004 | SPEC_18 |
| REQ-TEL-001/005 | SPEC_19 |

---

**Documento approvato**: ✅  
**Versione**: 2.1  
**Data**: 2025-12-11  
**Prossimo step**: Implementazione per fasi
