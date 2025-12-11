# 🗄️ FASE 1: Schema Database Clinico

## Documento di Fase

**Fase**: 1 - Database Schema  
**Durata Stimata**: 2-3 settimane  
**Prerequisiti**: FASE 0 completata  
**Output**: Schema Prisma esteso con tutte le entità cliniche

---

## 📋 INDICE

1. [Obiettivi](#1-obiettivi)
2. [Analisi Entità](#2-analisi-entità)
3. [Schema Prisma Dettagliato](#3-schema-prisma-dettagliato)
4. [Enum e Tipi](#4-enum-e-tipi)
5. [Relazioni e Indici](#5-relazioni-e-indici)
6. [Migration Strategy](#6-migration-strategy)
7. [Test Cases](#7-test-cases)

---

## 1. Obiettivi

### 1.1 Obiettivo Principale
Estendere lo schema Prisma esistente con tutte le entità necessarie per la gestione completa di un poliambulatorio medico, mantenendo compatibilità con il sistema formazione esistente.

### 1.2 Principi di Design

| Principio | Applicazione |
|-----------|--------------|
| **camelCase** | Tutti i nomi campo in camelCase |
| **Soft Delete** | `deletedAt DateTime?` su ogni entità |
| **Multi-tenancy** | `tenantId String` + indice su ogni entità |
| **Audit** | `createdAt`, `updatedAt` su ogni entità |
| **GDPR** | Campi sensibili marcati, audit trail |
| **Additive** | Solo ADD, mai DROP (migrazioni safe) |

### 1.3 Nuove Entità da Creare

```
STRUTTURA (6 entità)
├── Poliambulatorio
├── SedePoliambulatorio
├── Ambulatorio
├── Strumentario
├── ManutenzioneStrumentario
└── PrestazioneStrumentario

CATALOGO (5 entità)
├── Prestazione
├── PrestazioneSpecialista
├── Listino
├── ListinoPrestazione
└── Convenzione

AGENDA (4 entità)
├── SlotDisponibilita
├── Appuntamento
├── NumeroChiamata
└── ReminderAppuntamento

CLINICA (7 entità)
├── Paziente (view su Person)
├── CartellaClinica
├── Visita
├── CampoVisita
├── ValoreCampoVisita
├── Referto
└── VersioneReferto

DOCUMENTI (3 entità)
├── ConsensoInformato
├── DocumentoClinico
└── FirmaDigitale

FATTURAZIONE (4 entità)
├── FatturaPrestazione
├── RigaFattura
├── PercentualeMedico
└── PagamentoPrestazione

TOTALE: ~29 nuove entità
```

---

## 2. Analisi Entità

### 2.1 Struttura Poliambulatorio

```
┌─────────────────────────────────────────────────────────────┐
│                    GERARCHIA STRUTTURA                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Poliambulatorio (config globale)                           │
│  └── SedePoliambulatorio[] (sedi fisiche)                   │
│      └── Ambulatorio[] (stanze)                             │
│          ├── TipologiaAmbulatorio (enum)                    │
│          ├── Strumentario[] (apparecchiature)               │
│          └── SlotDisponibilita[] (orari)                    │
│                                                              │
│  Strumentario                                                │
│  ├── ManutenzioneStrumentario[] (storico)                   │
│  └── PrestazioneStrumentario[] (utilizzo)                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Catalogo Prestazioni

```
┌─────────────────────────────────────────────────────────────┐
│                   CATALOGO PRESTAZIONI                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Prestazione                                                 │
│  ├── Specialita (categoria)                                 │
│  ├── Durata (minuti)                                        │
│  ├── PrezzoBase                                             │
│  ├── Strumentario[] (richiesto)                             │
│  ├── PrestazioneAssociata[] (pacchetti)                     │
│  └── PrestazioneSpecialista[] (medici abilitati)            │
│                                                              │
│  Listino                                                     │
│  ├── Nome, Validità                                         │
│  ├── Convenzione? (opzionale)                               │
│  └── ListinoPrestazione[] (prezzi specifici)                │
│                                                              │
│  Convenzione                                                 │
│  ├── Tipo (assicurazione, azienda, palestra)                │
│  ├── Percentuale sconto                                      │
│  └── Listino associato                                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 Workflow Visita

```
┌─────────────────────────────────────────────────────────────┐
│                    WORKFLOW VISITA                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. PRENOTAZIONE                                            │
│     Appuntamento (stato: PRENOTATO)                         │
│     ├── Paziente                                            │
│     ├── Prestazione                                         │
│     ├── Medico                                              │
│     ├── Ambulatorio                                         │
│     ├── Data/Ora                                            │
│     └── Origine (web, telefono, walk-in)                    │
│                                                              │
│  2. ACCETTAZIONE                                            │
│     Appuntamento (stato: ACCETTATO)                         │
│     ├── Ora arrivo paziente                                 │
│     ├── Documenti privacy firmati                           │
│     └── NumeroChiamata assegnato                            │
│                                                              │
│  3. CHIAMATA                                                │
│     NumeroChiamata (mostrato su monitor)                    │
│     Appuntamento (stato: CHIAMATO)                          │
│     ├── Ora chiamata                                        │
│     └── Ambulatorio destinazione                            │
│                                                              │
│  4. VISITA                                                  │
│     Visita                                                   │
│     ├── Appuntamento                                        │
│     ├── Ora inizio                                          │
│     ├── Medico esecutore                                    │
│     ├── Infermiere (opzionale)                              │
│     └── ValoreCampoVisita[] (dati raccolti)                │
│                                                              │
│  5. REFERTAZIONE                                            │
│     Referto                                                  │
│     ├── Visita                                              │
│     ├── Contenuto (da template)                             │
│     ├── FirmaDigitale medico                                │
│     └── VersioneReferto[] (storico)                         │
│                                                              │
│  6. FATTURAZIONE                                            │
│     FatturaPrestazione                                       │
│     ├── Appuntamento/Visita                                 │
│     ├── Importo                                             │
│     └── Stato SDI                                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Schema Prisma Dettagliato

### 3.1 Enum Clinici

```prisma
// === NUOVI ENUM CLINICI ===

// Tipologia ambulatorio
enum TipologiaAmbulatorio {
  MEDICO_GENERICO
  SPECIALISTICO
  CHIRURGICO
  SALA_OPERATORIA
  DIAGNOSTICA
  FISIOTERAPIA
  SALA_ATTESA
  RECEPTION
}

// Stato strumentario
enum StatoStrumentario {
  ATTIVO
  MANUTENZIONE
  FUORI_SERVIZIO
  DISMESSO
}

// Tipo proprietà strumentario
enum TipoProprietaStrumentario {
  ACQUISTO
  LEASING
  NOLEGGIO
  COMODATO
}

// Tipo manutenzione
enum TipoManutenzione {
  ORDINARIA
  STRAORDINARIA
  CALIBRAZIONE
  REVISIONE
  RIPARAZIONE
}

// Specialità mediche
enum SpecialitaMedica {
  MEDICINA_GENERALE
  CARDIOLOGIA
  DERMATOLOGIA
  GINECOLOGIA
  OCULISTICA
  ORTOPEDIA
  OTORINOLARINGOIATRIA
  PEDIATRIA
  PSICOLOGIA
  NEUROLOGIA
  UROLOGIA
  FISIOTERAPIA
  RADIOLOGIA
  ECOGRAFIA
  LABORATORIO_ANALISI
  ALTRA
}

// Origine appuntamento
enum OrigineAppuntamento {
  TELEFONO
  WEB
  WALK_IN
  RICHIAMO
  CONVENZIONE
  ALTRO
}

// Stato appuntamento
enum StatoAppuntamento {
  PRENOTATO
  CONFERMATO
  ACCETTATO
  CHIAMATO
  IN_VISITA
  COMPLETATO
  CANCELLATO
  NO_SHOW
}

// Stato secondario appuntamento
enum StatoSecondarioAppuntamento {
  IN_ATTESA_CONFERMA
  CONFERMATO_PAZIENTE
  RITARDO_PAZIENTE
  RITARDO_MEDICO
  DOCUMENTAZIONE_MANCANTE
  NESSUNO
}

// Tipo campo visita
enum TipoCampoVisita {
  TESTO_BREVE
  TESTO_LUNGO
  NUMERO
  DATA
  CHECKBOX
  SELEZIONE_SINGOLA
  SELEZIONE_MULTIPLA
  FILE
  FIRMA
}

// Stato referto
enum StatoReferto {
  BOZZA
  COMPLETATO
  FIRMATO
  INVIATO
  ANNULLATO
}

// Tipo documento clinico
enum TipoDocumentoClinico {
  CONSENSO_INFORMATO
  PRIVACY
  ANAMNESI
  REFERTO
  RICETTA
  CERTIFICATO
  ALTRO
}

// Stato fattura medica
enum StatoFatturaMedica {
  BOZZA
  EMESSA
  INVIATA_SDI
  ACCETTATA_SDI
  RIFIUTATA_SDI
  PAGATA
  ANNULLATA
}

// Metodo pagamento
enum MetodoPagamento {
  CONTANTI
  CARTA
  BONIFICO
  ASSEGNO
  POS
  SATISPAY
  ALTRO
}

// Aggiungi a RoleType esistente
// enum RoleType {
//   ... esistenti ...
//   MEDICO
//   MEDICO_BASE
//   INFERMIERE
//   SEGRETERIA_MEDICA
//   PAZIENTE
//   DIRETTORE_SANITARIO
//   CLINIC_ADMIN
// }

// Aggiungi a PersonPermission esistente
// enum PersonPermission {
//   ... esistenti ...
//   VIEW_PATIENTS, CREATE_PATIENTS, EDIT_PATIENTS, DELETE_PATIENTS
//   VIEW_VISITS, CREATE_VISITS, EDIT_VISITS, DELETE_VISITS, START_VISITS, COMPLETE_VISITS
//   VIEW_CLINICAL_REPORTS, CREATE_CLINICAL_REPORTS, EDIT_CLINICAL_REPORTS, SIGN_CLINICAL, EXPORT_CLINICAL_REPORTS
//   VIEW_AGENDA, MANAGE_AGENDA, BOOK_APPOINTMENTS, CANCEL_APPOINTMENTS
//   VIEW_AMBULATORI, MANAGE_AMBULATORI
//   VIEW_STRUMENTARIO, MANAGE_STRUMENTARIO
//   VIEW_PRESTAZIONI, MANAGE_PRESTAZIONI
//   VIEW_FATTURE_MEDICHE, CREATE_FATTURE_MEDICHE, SEND_FATTURE_SDI
//   MANAGE_LISTINI, MANAGE_CONVENZIONI
//   VIEW_STATISTICHE_CLINICHE, EXPORT_DATI_CLINICI
// }
```

### 3.2 Modelli Struttura

```prisma
// === STRUTTURA POLIAMBULATORIO ===

model Poliambulatorio {
  id                  String                  @id @default(uuid())
  nome                String
  ragioneSociale      String?
  partitaIva          String?
  codiceFiscale       String?
  codiceRegionale     String?                 // Codice regionale struttura sanitaria
  
  // Contatti
  email               String?
  pec                 String?
  telefono            String?
  fax                 String?
  website             String?
  
  // Settings
  settings            Json                    @default("{}")
  logoUrl             String?
  
  // Orari default
  orarioApertura      String?                 // "08:00"
  orarioChiusura      String?                 // "20:00"
  giorniApertura      String[]                @default(["LUN", "MAR", "MER", "GIO", "VEN"])
  
  // Multi-tenancy
  tenantId            String
  tenant              Tenant                  @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  // Audit
  createdAt           DateTime                @default(now())
  updatedAt           DateTime                @updatedAt
  deletedAt           DateTime?
  
  // Relazioni
  sedi                SedePoliambulatorio[]
  listini             Listino[]
  convenzioni         Convenzione[]
  
  @@unique([tenantId]) // Un poliambulatorio per tenant
  @@index([tenantId])
  @@index([tenantId, deletedAt])
}

model SedePoliambulatorio {
  id                  String                  @id @default(uuid())
  poliambulatorioId   String
  
  // Indirizzo
  nome                String                  // "Sede Centrale", "Sede Nord"
  indirizzo           String
  citta               String
  cap                 String
  provincia           String
  
  // Contatti specifici sede
  telefono            String?
  email               String?
  
  // Coordinate per mappa
  latitudine          Float?
  longitudine         Float?
  
  // Settings sede
  isAttiva            Boolean                 @default(true)
  isPrincipale        Boolean                 @default(false)
  
  // Multi-tenancy
  tenantId            String
  tenant              Tenant                  @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  // Audit
  createdAt           DateTime                @default(now())
  updatedAt           DateTime                @updatedAt
  deletedAt           DateTime?
  
  // Relazioni
  poliambulatorio     Poliambulatorio         @relation(fields: [poliambulatorioId], references: [id], onDelete: Cascade)
  ambulatori          Ambulatorio[]
  
  @@index([poliambulatorioId])
  @@index([tenantId])
  @@index([tenantId, deletedAt])
}

model Ambulatorio {
  id                  String                  @id @default(uuid())
  sedeId              String
  
  // Identificazione
  numero              String                  // "AMB-01", "SALA-OP-1"
  nome                String                  // "Ambulatorio Cardiologia 1"
  piano               String?                 // "Piano Terra", "1° Piano"
  
  // Tipologia
  tipologia           TipologiaAmbulatorio
  descrizione         String?
  
  // Capacità
  capacitaMax         Int?                    @default(1) // Pazienti contemporanei
  
  // Stato
  isAttivo            Boolean                 @default(true)
  note                String?
  
  // Multi-tenancy
  tenantId            String
  tenant              Tenant                  @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  // Audit
  createdAt           DateTime                @default(now())
  updatedAt           DateTime                @updatedAt
  deletedAt           DateTime?
  
  // Relazioni
  sede                SedePoliambulatorio     @relation(fields: [sedeId], references: [id], onDelete: Cascade)
  strumentario        Strumentario[]
  slotDisponibilita   SlotDisponibilita[]
  appuntamenti        Appuntamento[]
  visite              Visita[]
  
  @@unique([sedeId, numero])
  @@index([sedeId])
  @@index([tipologia])
  @@index([tenantId])
  @@index([tenantId, deletedAt])
}

model Strumentario {
  id                  String                  @id @default(uuid())
  ambulatorioId       String?                 // Può essere assegnato a un ambulatorio
  
  // Identificazione
  codice              String                  // Codice inventario
  nome                String
  marca               String?
  modello             String?
  numeroSerie         String?
  
  // Classificazione
  categoria           String?                 // "Diagnostica", "Chirurgia", etc.
  descrizione         String?
  
  // Stato
  stato               StatoStrumentario       @default(ATTIVO)
  
  // Proprietà
  tipoProprieta       TipoProprietaStrumentario @default(ACQUISTO)
  
  // Costi
  costoAcquisto       Decimal?                @db.Decimal(10, 2)
  costoLeasing        Decimal?                @db.Decimal(10, 2) // Rata mensile
  costoNoleggio       Decimal?                @db.Decimal(10, 2) // Rata mensile
  
  // Date
  dataAcquisto        DateTime?
  dataFineGaranzia    DateTime?
  dataFineLeasing     DateTime?
  
  // Manutenzione
  intervalloManutenzione Int?                 // Giorni tra manutenzioni
  dataProssimaManutenzione DateTime?
  
  // Ammortamento
  dataStimataRientroCosti DateTime?
  costoPerPrestazione Decimal?                @db.Decimal(10, 2)
  
  // Multi-tenancy
  tenantId            String
  tenant              Tenant                  @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  // Audit
  createdAt           DateTime                @default(now())
  updatedAt           DateTime                @updatedAt
  deletedAt           DateTime?
  
  // Relazioni
  ambulatorio         Ambulatorio?            @relation(fields: [ambulatorioId], references: [id], onDelete: SetNull)
  manutenzioni        ManutenzioneStrumentario[]
  prestazioniRichieste PrestazioneStrumentario[]
  
  @@unique([tenantId, codice])
  @@index([ambulatorioId])
  @@index([stato])
  @@index([dataProssimaManutenzione])
  @@index([tenantId])
  @@index([tenantId, deletedAt])
}

model ManutenzioneStrumentario {
  id                  String                  @id @default(uuid())
  strumentarioId      String
  
  // Dettagli manutenzione
  tipo                TipoManutenzione
  descrizione         String?
  
  // Date
  dataProgrammata     DateTime?
  dataEsecuzione      DateTime?
  dataCompletamento   DateTime?
  
  // Costi
  costo               Decimal?                @db.Decimal(10, 2)
  fornitore           String?
  
  // Esito
  esito               String?
  note                String?
  
  // Documenti
  documentoUrl        String?
  
  // Multi-tenancy
  tenantId            String
  tenant              Tenant                  @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  // Audit
  createdAt           DateTime                @default(now())
  updatedAt           DateTime                @updatedAt
  deletedAt           DateTime?
  eseguitoDaId        String?
  eseguitoDa          Person?                 @relation("ManutenzioneEsecutore", fields: [eseguitoDaId], references: [id])
  
  // Relazioni
  strumentario        Strumentario            @relation(fields: [strumentarioId], references: [id], onDelete: Cascade)
  
  @@index([strumentarioId])
  @@index([tipo])
  @@index([dataEsecuzione])
  @@index([tenantId])
}
```

### 3.3 Modelli Catalogo

```prisma
// === CATALOGO PRESTAZIONI ===

model Prestazione {
  id                  String                  @id @default(uuid())
  
  // Identificazione
  codice              String                  // "VIS-CARD-001"
  nome                String                  // "Visita Cardiologica"
  descrizione         String?
  
  // Classificazione
  specialita          SpecialitaMedica
  categoria           String?                 // Sottocategoria custom
  
  // Tempistiche
  durata              Int                     // Minuti
  durataMinima        Int?                    // Minuti (se variabile)
  durataMassima       Int?                    // Minuti
  
  // Prezzo base
  prezzoBase          Decimal                 @db.Decimal(10, 2)
  prezzoMinimo        Decimal?                @db.Decimal(10, 2)
  prezzoMassimo       Decimal?                @db.Decimal(10, 2)
  
  // IVA
  aliquotaIva         Decimal                 @default(22.00) @db.Decimal(5, 2)
  esenteIva           Boolean                 @default(false)
  
  // Configurazione
  richiedePrenotazione Boolean                @default(true)
  prenotabileOnline   Boolean                 @default(false)
  richiedeConsenso    Boolean                 @default(true)
  
  // Template visita associato
  templateVisitaId    String?
  
  // Stato
  isAttiva            Boolean                 @default(true)
  
  // Multi-tenancy
  tenantId            String
  tenant              Tenant                  @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  // Audit
  createdAt           DateTime                @default(now())
  updatedAt           DateTime                @updatedAt
  deletedAt           DateTime?
  
  // Relazioni
  specialisti         PrestazioneSpecialista[]
  strumentarioRichiesto PrestazioneStrumentario[]
  prestazioniAssociate PrestazioneAssociata[] @relation("PrestazionePrincipale")
  prestazioniPrincipali PrestazioneAssociata[] @relation("PrestazioneAssociata")
  listinoPrestazioni  ListinoPrestazione[]
  appuntamenti        Appuntamento[]
  visite              Visita[]
  templateVisita      TemplateVisita?         @relation(fields: [templateVisitaId], references: [id])
  
  @@unique([tenantId, codice])
  @@index([specialita])
  @@index([isAttiva])
  @@index([prenotabileOnline])
  @@index([tenantId])
  @@index([tenantId, deletedAt])
}

model PrestazioneSpecialista {
  id                  String                  @id @default(uuid())
  prestazioneId       String
  specialistaId       String                  // Person con ruolo MEDICO
  
  // Configurazione specifica
  percentualeCompenso Decimal?                @db.Decimal(5, 2) // % sul prezzo
  compensoFisso       Decimal?                @db.Decimal(10, 2) // Alternativa a %
  
  // Abilitazione
  isAbilitato         Boolean                 @default(true)
  dataAbilitazione    DateTime                @default(now())
  dataDisabilitazione DateTime?
  
  // Multi-tenancy
  tenantId            String
  tenant              Tenant                  @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  // Audit
  createdAt           DateTime                @default(now())
  updatedAt           DateTime                @updatedAt
  deletedAt           DateTime?
  
  // Relazioni
  prestazione         Prestazione             @relation(fields: [prestazioneId], references: [id], onDelete: Cascade)
  specialista         Person                  @relation("SpecialistaPrestazioni", fields: [specialistaId], references: [id], onDelete: Cascade)
  
  @@unique([prestazioneId, specialistaId])
  @@index([prestazioneId])
  @@index([specialistaId])
  @@index([tenantId])
}

model PrestazioneStrumentario {
  id                  String                  @id @default(uuid())
  prestazioneId       String
  strumentarioId      String
  
  // Configurazione
  isObbligatorio      Boolean                 @default(true)
  note                String?
  
  // Multi-tenancy
  tenantId            String
  tenant              Tenant                  @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  // Audit
  createdAt           DateTime                @default(now())
  updatedAt           DateTime                @updatedAt
  deletedAt           DateTime?
  
  // Relazioni
  prestazione         Prestazione             @relation(fields: [prestazioneId], references: [id], onDelete: Cascade)
  strumentario        Strumentario            @relation(fields: [strumentarioId], references: [id], onDelete: Cascade)
  
  @@unique([prestazioneId, strumentarioId])
  @@index([prestazioneId])
  @@index([strumentarioId])
  @@index([tenantId])
}

model PrestazioneAssociata {
  id                  String                  @id @default(uuid())
  prestazionePrincipaleId String
  prestazioneAssociataId String
  
  // Sconto se acquistate insieme
  scontoPercentuale   Decimal?                @db.Decimal(5, 2)
  scontoFisso         Decimal?                @db.Decimal(10, 2)
  
  // Configurazione
  isObbligatoria      Boolean                 @default(false) // Se true, la associata è obbligatoria
  ordine              Int                     @default(0)
  
  // Multi-tenancy
  tenantId            String
  tenant              Tenant                  @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  // Audit
  createdAt           DateTime                @default(now())
  updatedAt           DateTime                @updatedAt
  deletedAt           DateTime?
  
  // Relazioni
  prestazionePrincipale Prestazione           @relation("PrestazionePrincipale", fields: [prestazionePrincipaleId], references: [id], onDelete: Cascade)
  prestazioneAssociata Prestazione            @relation("PrestazioneAssociata", fields: [prestazioneAssociataId], references: [id], onDelete: Cascade)
  
  @@unique([prestazionePrincipaleId, prestazioneAssociataId])
  @@index([prestazionePrincipaleId])
  @@index([prestazioneAssociataId])
  @@index([tenantId])
}

model Listino {
  id                  String                  @id @default(uuid())
  poliambulatorioId   String
  
  // Identificazione
  nome                String                  // "Listino Standard", "Listino Convenzione X"
  codice              String?
  descrizione         String?
  
  // Validità
  dataInizio          DateTime
  dataFine            DateTime?
  isAttivo            Boolean                 @default(true)
  isPredefinito       Boolean                 @default(false)
  
  // Convenzione associata (opzionale)
  convenzioneId       String?
  
  // Multi-tenancy
  tenantId            String
  tenant              Tenant                  @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  // Audit
  createdAt           DateTime                @default(now())
  updatedAt           DateTime                @updatedAt
  deletedAt           DateTime?
  
  // Relazioni
  poliambulatorio     Poliambulatorio         @relation(fields: [poliambulatorioId], references: [id], onDelete: Cascade)
  convenzione         Convenzione?            @relation(fields: [convenzioneId], references: [id], onDelete: SetNull)
  prestazioni         ListinoPrestazione[]
  appuntamenti        Appuntamento[]
  
  @@unique([tenantId, codice])
  @@index([poliambulatorioId])
  @@index([isAttivo])
  @@index([convenzioneId])
  @@index([tenantId])
  @@index([tenantId, deletedAt])
}

model ListinoPrestazione {
  id                  String                  @id @default(uuid())
  listinoId           String
  prestazioneId       String
  
  // Prezzo specifico listino
  prezzo              Decimal                 @db.Decimal(10, 2)
  
  // Sconto rispetto a prezzo base
  scontoPercentuale   Decimal?                @db.Decimal(5, 2)
  
  // Multi-tenancy
  tenantId            String
  tenant              Tenant                  @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  // Audit
  createdAt           DateTime                @default(now())
  updatedAt           DateTime                @updatedAt
  deletedAt           DateTime?
  
  // Relazioni
  listino             Listino                 @relation(fields: [listinoId], references: [id], onDelete: Cascade)
  prestazione         Prestazione             @relation(fields: [prestazioneId], references: [id], onDelete: Cascade)
  
  @@unique([listinoId, prestazioneId])
  @@index([listinoId])
  @@index([prestazioneId])
  @@index([tenantId])
}

model Convenzione {
  id                  String                  @id @default(uuid())
  poliambulatorioId   String
  
  // Identificazione
  nome                String                  // "Convenzione Unisalute"
  codice              String?
  descrizione         String?
  
  // Tipo convenzione
  tipo                String                  // "ASSICURAZIONE", "AZIENDA", "PALESTRA", "ALTRO"
  
  // Controparte
  ragioneSociale      String?
  partitaIva          String?
  referente           String?
  email               String?
  telefono            String?
  
  // Condizioni
  scontoPercentuale   Decimal?                @db.Decimal(5, 2)
  
  // Validità
  dataInizio          DateTime
  dataFine            DateTime?
  isAttiva            Boolean                 @default(true)
  
  // Multi-tenancy
  tenantId            String
  tenant              Tenant                  @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  // Audit
  createdAt           DateTime                @default(now())
  updatedAt           DateTime                @updatedAt
  deletedAt           DateTime?
  
  // Relazioni
  poliambulatorio     Poliambulatorio         @relation(fields: [poliambulatorioId], references: [id], onDelete: Cascade)
  listini             Listino[]
  appuntamenti        Appuntamento[]
  
  @@unique([tenantId, codice])
  @@index([poliambulatorioId])
  @@index([tipo])
  @@index([isAttiva])
  @@index([tenantId])
  @@index([tenantId, deletedAt])
}
```

### 3.4 Modelli Agenda

```prisma
// === AGENDA E APPUNTAMENTI ===

model SlotDisponibilita {
  id                  String                  @id @default(uuid())
  ambulatorioId       String
  medicoId            String                  // Person con ruolo MEDICO
  
  // Giorno della settimana (0=Domenica, 6=Sabato)
  giornoSettimana     Int                     // 0-6
  
  // Orari
  oraInizio           String                  // "09:00"
  oraFine             String                  // "13:00"
  
  // Durata slot
  durataSlot          Int                     @default(30) // Minuti
  
  // Validità
  dataInizio          DateTime?               // Se null, valido sempre
  dataFine            DateTime?
  
  // Eccezioni (date specifiche in cui non è disponibile)
  eccezioni           DateTime[]              @default([])
  
  // Stato
  isAttivo            Boolean                 @default(true)
  
  // Multi-tenancy
  tenantId            String
  tenant              Tenant                  @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  // Audit
  createdAt           DateTime                @default(now())
  updatedAt           DateTime                @updatedAt
  deletedAt           DateTime?
  
  // Relazioni
  ambulatorio         Ambulatorio             @relation(fields: [ambulatorioId], references: [id], onDelete: Cascade)
  medico              Person                  @relation("MedicoSlot", fields: [medicoId], references: [id], onDelete: Cascade)
  
  @@index([ambulatorioId])
  @@index([medicoId])
  @@index([giornoSettimana])
  @@index([tenantId])
  @@index([tenantId, deletedAt])
}

model Appuntamento {
  id                  String                  @id @default(uuid())
  
  // Riferimenti principali
  pazienteId          String                  // Person con ruolo PAZIENTE
  prestazioneId       String
  medicoId            String                  // Person con ruolo MEDICO
  ambulatorioId       String
  
  // Opzionali
  infermiereId        String?                 // Person con ruolo INFERMIERE
  listinoId           String?
  convenzioneId       String?
  
  // Data e ora
  dataOra             DateTime
  durataMinuti        Int
  
  // Stati
  stato               StatoAppuntamento       @default(PRENOTATO)
  statoSecondario     StatoSecondarioAppuntamento @default(NESSUNO)
  
  // Origine
  origine             OrigineAppuntamento     @default(TELEFONO)
  
  // Ricorrenza
  isRicorrente        Boolean                 @default(false)
  ricorrenzaParentId  String?                 // ID appuntamento padre se ricorrente
  numeroRicorrenza    Int?                    // Quale numero nella serie
  
  // Timing tracking
  oraArrivo           DateTime?
  oraChiamata         DateTime?
  oraInizioVisita     DateTime?
  oraFineVisita       DateTime?
  
  // Ritardi
  ritardoPazienteMinuti Int?
  ritardoMedicoMinuti Int?
  
  // Numero chiamata
  numeroChiamataId    String?
  
  // Note
  note                String?
  noteInterne         String?                 // Solo per staff
  
  // Accessibilità
  richiedeAssistenza  Boolean                 @default(false)
  noteAccessibilita   String?
  
  // Privacy
  privacyAccettata    Boolean                 @default(false)
  consensoAccettato   Boolean                 @default(false)
  
  // Reminder
  reminderInviato     Boolean                 @default(false)
  dataUltimoReminder  DateTime?
  
  // Programmato da
  prenotatoDaId       String?                 // Chi ha prenotato (segreteria, paziente web, etc.)
  accettatoDaId       String?                 // Chi ha fatto accettazione
  chiamatoDaId        String?                 // Chi ha chiamato il paziente
  
  // Multi-tenancy
  tenantId            String
  tenant              Tenant                  @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  // Audit
  createdAt           DateTime                @default(now())
  updatedAt           DateTime                @updatedAt
  deletedAt           DateTime?
  
  // Relazioni
  paziente            Person                  @relation("PazienteAppuntamenti", fields: [pazienteId], references: [id], onDelete: Cascade)
  prestazione         Prestazione             @relation(fields: [prestazioneId], references: [id], onDelete: Cascade)
  medico              Person                  @relation("MedicoAppuntamenti", fields: [medicoId], references: [id], onDelete: Cascade)
  ambulatorio         Ambulatorio             @relation(fields: [ambulatorioId], references: [id], onDelete: Cascade)
  infermiere          Person?                 @relation("InfermiereAppuntamenti", fields: [infermiereId], references: [id])
  listino             Listino?                @relation(fields: [listinoId], references: [id])
  convenzione         Convenzione?            @relation(fields: [convenzioneId], references: [id])
  ricorrenzaParent    Appuntamento?           @relation("RicorrenzaAppuntamento", fields: [ricorrenzaParentId], references: [id])
  ricorrenze          Appuntamento[]          @relation("RicorrenzaAppuntamento")
  numeroChiamata      NumeroChiamata?         @relation(fields: [numeroChiamataId], references: [id])
  prenotatoDa         Person?                 @relation("PrenotazioneAppuntamenti", fields: [prenotatoDaId], references: [id])
  accettatoDa         Person?                 @relation("AccettazioneAppuntamenti", fields: [accettatoDaId], references: [id])
  chiamatoDa          Person?                 @relation("ChiamataAppuntamenti", fields: [chiamatoDaId], references: [id])
  visita              Visita?
  reminders           ReminderAppuntamento[]
  fattura             FatturaPrestazione?
  
  @@index([pazienteId])
  @@index([medicoId])
  @@index([ambulatorioId])
  @@index([dataOra])
  @@index([stato])
  @@index([tenantId, dataOra])
  @@index([tenantId, stato])
  @@index([tenantId])
  @@index([tenantId, deletedAt])
}

model NumeroChiamata {
  id                  String                  @id @default(uuid())
  
  // Numero visualizzato
  numero              Int                     // Numero progressivo del giorno
  
  // Data
  data                DateTime                @db.Date
  
  // Stato
  isChiamato          Boolean                 @default(false)
  dataChiamata        DateTime?
  
  // Ambulatorio destinazione
  ambulatorioDestinazioneId String?
  
  // Multi-tenancy
  tenantId            String
  tenant              Tenant                  @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  // Audit
  createdAt           DateTime                @default(now())
  updatedAt           DateTime                @updatedAt
  deletedAt           DateTime?
  
  // Relazioni
  appuntamenti        Appuntamento[]
  
  @@unique([tenantId, data, numero])
  @@index([data])
  @@index([tenantId])
}

model ReminderAppuntamento {
  id                  String                  @id @default(uuid())
  appuntamentoId      String
  
  // Tipo reminder
  tipo                String                  // "EMAIL", "SMS", "WHATSAPP", "PUSH"
  
  // Scheduling
  dataInvioProgrammato DateTime
  dataInvioEffettivo  DateTime?
  
  // Stato
  stato               String                  @default("PROGRAMMATO") // "PROGRAMMATO", "INVIATO", "FALLITO", "ANNULLATO"
  
  // Risposta
  confermaRicevuta    Boolean                 @default(false)
  dataConferma        DateTime?
  rispostaPaziente    String?                 // "CONFERMATO", "CANCELLA", "MODIFICA"
  
  // Error handling
  errore              String?
  tentativiInvio      Int                     @default(0)
  
  // Multi-tenancy
  tenantId            String
  tenant              Tenant                  @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  // Audit
  createdAt           DateTime                @default(now())
  updatedAt           DateTime                @updatedAt
  deletedAt           DateTime?
  
  // Relazioni
  appuntamento        Appuntamento            @relation(fields: [appuntamentoId], references: [id], onDelete: Cascade)
  
  @@index([appuntamentoId])
  @@index([stato])
  @@index([dataInvioProgrammato])
  @@index([tenantId])
}
```

### 3.5 Modelli Clinici (Visita e Referto)

```prisma
// === CLINICA: VISITE E REFERTI ===

model TemplateVisita {
  id                  String                  @id @default(uuid())
  
  // Identificazione
  nome                String                  // "Visita Cardiologica Standard"
  descrizione         String?
  
  // Specialità
  specialita          SpecialitaMedica?
  
  // Può essere specifico per medico
  medicoId            String?
  
  // Stato
  isAttivo            Boolean                 @default(true)
  isPredefinito       Boolean                 @default(false)
  
  // Multi-tenancy
  tenantId            String
  tenant              Tenant                  @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  // Audit
  createdAt           DateTime                @default(now())
  updatedAt           DateTime                @updatedAt
  deletedAt           DateTime?
  
  // Relazioni
  medico              Person?                 @relation("MedicoTemplateVisita", fields: [medicoId], references: [id])
  campi               CampoVisita[]
  prestazioni         Prestazione[]
  visite              Visita[]
  
  @@index([medicoId])
  @@index([specialita])
  @@index([tenantId])
  @@index([tenantId, deletedAt])
}

model CampoVisita {
  id                  String                  @id @default(uuid())
  templateVisitaId    String
  
  // Definizione campo
  nome                String                  // Nome tecnico (no spazi)
  etichetta           String                  // Label visualizzata
  tipo                TipoCampoVisita
  
  // Configurazione
  isObbligatorio      Boolean                 @default(false)
  isStampabile        Boolean                 @default(true) // Appare nel referto
  ordine              Int                     @default(0)
  
  // Valore predefinito
  valorePredefinito   String?
  testoPrecompilato   String?                 // Per testi lunghi
  
  // Opzioni (per select, checkbox, radio)
  opzioni             Json?                   // ["Opzione 1", "Opzione 2"]
  
  // Validazione
  validazione         Json?                   // { min, max, pattern, etc. }
  
  // Suggerimenti
  placeholder         String?
  helpText            String?
  
  // Multi-tenancy
  tenantId            String
  tenant              Tenant                  @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  // Audit
  createdAt           DateTime                @default(now())
  updatedAt           DateTime                @updatedAt
  deletedAt           DateTime?
  
  // Relazioni
  templateVisita      TemplateVisita          @relation(fields: [templateVisitaId], references: [id], onDelete: Cascade)
  valori              ValoreCampoVisita[]
  
  @@unique([templateVisitaId, nome])
  @@index([templateVisitaId])
  @@index([ordine])
  @@index([tenantId])
}

model Visita {
  id                  String                  @id @default(uuid())
  appuntamentoId      String                  @unique
  
  // Template utilizzato
  templateVisitaId    String?
  
  // Medico che esegue (può essere diverso da quello prenotato)
  medicoEsecutoreId   String
  infermiereId        String?
  
  // Prestazione (può essere diversa da quella prenotata)
  prestazioneId       String
  
  // Timing
  oraInizio           DateTime
  oraFine             DateTime?
  durataTotaleMinuti  Int?
  
  // Stato
  stato               String                  @default("IN_CORSO") // "IN_CORSO", "COMPLETATA", "SOSPESA", "ANNULLATA"
  
  // Note generali
  note                String?
  noteInterne         String?
  
  // Multi-tenancy
  tenantId            String
  tenant              Tenant                  @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  // Audit
  createdAt           DateTime                @default(now())
  updatedAt           DateTime                @updatedAt
  deletedAt           DateTime?
  
  // Relazioni
  appuntamento        Appuntamento            @relation(fields: [appuntamentoId], references: [id], onDelete: Cascade)
  templateVisita      TemplateVisita?         @relation(fields: [templateVisitaId], references: [id])
  medicoEsecutore     Person                  @relation("MedicoVisita", fields: [medicoEsecutoreId], references: [id])
  infermiere          Person?                 @relation("InfermiereVisita", fields: [infermiereId], references: [id])
  prestazione         Prestazione             @relation(fields: [prestazioneId], references: [id])
  ambulatorio         Ambulatorio             @relation(fields: [ambulatorioId], references: [id])
  ambulatorioId       String
  valoriCampi         ValoreCampoVisita[]
  referto             Referto?
  documenti           DocumentoClinico[]
  
  @@index([appuntamentoId])
  @@index([medicoEsecutoreId])
  @@index([stato])
  @@index([oraInizio])
  @@index([tenantId])
  @@index([tenantId, deletedAt])
}

model ValoreCampoVisita {
  id                  String                  @id @default(uuid())
  visitaId            String
  campoVisitaId       String
  
  // Valore inserito
  valore              String?                 // Testo
  valoreJson          Json?                   // Per valori complessi (array, oggetti)
  valoreNumerico      Decimal?                @db.Decimal(15, 4)
  valoreData          DateTime?
  valoreBoolean       Boolean?
  
  // Multi-tenancy
  tenantId            String
  tenant              Tenant                  @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  // Audit
  createdAt           DateTime                @default(now())
  updatedAt           DateTime                @updatedAt
  deletedAt           DateTime?
  compilatoDaId       String?
  compilatoDa         Person?                 @relation("CompilatoreValoreCampo", fields: [compilatoDaId], references: [id])
  
  // Relazioni
  visita              Visita                  @relation(fields: [visitaId], references: [id], onDelete: Cascade)
  campoVisita         CampoVisita             @relation(fields: [campoVisitaId], references: [id], onDelete: Cascade)
  
  @@unique([visitaId, campoVisitaId])
  @@index([visitaId])
  @@index([campoVisitaId])
  @@index([tenantId])
}

model Referto {
  id                  String                  @id @default(uuid())
  visitaId            String                  @unique
  
  // Contenuto
  contenuto           String                  @db.Text // HTML o Markdown
  contenutoJson       Json?                   // Struttura dati
  
  // Template utilizzato (collegato al sistema template esistente)
  templateId          String?
  templateVersion     Int?
  
  // Stato
  stato               StatoReferto            @default(BOZZA)
  
  // Versioning (event sourcing)
  versione            Int                     @default(1)
  versionePrecedenteId String?
  
  // Firma
  isFirmato           Boolean                 @default(false)
  dataFirma           DateTime?
  firmaDigitaleId     String?
  
  // Invio paziente
  isInviato           Boolean                 @default(false)
  dataInvio           DateTime?
  modalitaInvio       String?                 // "EMAIL", "DOWNLOAD", "STAMPA"
  
  // File generato
  fileUrl             String?
  fileName            String?
  fileSize            Int?
  
  // Multi-tenancy
  tenantId            String
  tenant              Tenant                  @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  // Audit
  createdAt           DateTime                @default(now())
  updatedAt           DateTime                @updatedAt
  deletedAt           DateTime?
  creatoDaId          String
  creatoDa            Person                  @relation("RefertoCreatore", fields: [creatoDaId], references: [id])
  
  // Relazioni
  visita              Visita                  @relation(fields: [visitaId], references: [id], onDelete: Cascade)
  template            TemplateLink?           @relation(fields: [templateId], references: [id])
  firmaDigitale       FirmaDigitale?          @relation(fields: [firmaDigitaleId], references: [id])
  versionePrecedente  Referto?                @relation("VersioniReferto", fields: [versionePrecedenteId], references: [id])
  versioniSuccessive  Referto[]               @relation("VersioniReferto")
  versioniStorico     VersioneReferto[]
  
  @@index([visitaId])
  @@index([stato])
  @@index([isFirmato])
  @@index([tenantId])
  @@index([tenantId, deletedAt])
}

model VersioneReferto {
  id                  String                  @id @default(uuid())
  refertoId           String
  
  // Versione
  versione            Int
  
  // Snapshot contenuto
  contenuto           String                  @db.Text
  contenutoJson       Json?
  
  // Motivo modifica
  motivoModifica      String?
  
  // Multi-tenancy
  tenantId            String
  tenant              Tenant                  @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  // Audit
  createdAt           DateTime                @default(now())
  creatoDaId          String
  creatoDa            Person                  @relation("VersioneRefertoCreatore", fields: [creatoDaId], references: [id])
  
  // Relazioni
  referto             Referto                 @relation(fields: [refertoId], references: [id], onDelete: Cascade)
  
  @@unique([refertoId, versione])
  @@index([refertoId])
  @@index([versione])
  @@index([tenantId])
}
```

*(Continua nel documento - DocumentoClinico, FirmaDigitale, FatturaPrestazione saranno in sezioni successive)*

---

## 4. Relazioni con Person (Estensioni)

Le seguenti relazioni devono essere aggiunte al modello `Person` esistente:

```prisma
// AGGIUNTE A Person
model Person {
  // ... campi esistenti ...
  
  // === NUOVE RELAZIONI CLINICHE ===
  
  // Come Medico
  slotDisponibilita           SlotDisponibilita[]         @relation("MedicoSlot")
  appuntamentiMedico          Appuntamento[]              @relation("MedicoAppuntamenti")
  visiteEseguite              Visita[]                    @relation("MedicoVisita")
  templatesVisita             TemplateVisita[]            @relation("MedicoTemplateVisita")
  prestazioniAbilitate        PrestazioneSpecialista[]    @relation("SpecialistaPrestazioni")
  percentualiCompenso         PercentualeMedico[]         @relation("MedicoPercentuali")
  
  // Come Infermiere
  appuntamentiInfermiere      Appuntamento[]              @relation("InfermiereAppuntamenti")
  visiteAssistite             Visita[]                    @relation("InfermiereVisita")
  
  // Come Paziente
  appuntamentiPaziente        Appuntamento[]              @relation("PazienteAppuntamenti")
  cartellaClinica             CartellaClinica?            @relation("PazienteCartella")
  consensiInformati           ConsensoInformato[]         @relation("PazienteConsensi")
  documentiClinici            DocumentoClinico[]          @relation("PazienteDocumenti")
  
  // Come Staff
  prenotazioniEffettuate      Appuntamento[]              @relation("PrenotazioneAppuntamenti")
  accettazioniEffettuate      Appuntamento[]              @relation("AccettazioneAppuntamenti")
  chiamateEffettuate          Appuntamento[]              @relation("ChiamataAppuntamenti")
  refertiCreati               Referto[]                   @relation("RefertoCreatore")
  versioniRefertoCreate       VersioneReferto[]           @relation("VersioneRefertoCreatore")
  valoriCampoCompilati        ValoreCampoVisita[]         @relation("CompilatoreValoreCampo")
  manutenzioniEseguite        ManutenzioneStrumentario[]  @relation("ManutenzioneEsecutore")
  firmeDigitali               FirmaDigitale[]             @relation("PersonaFirma")
}
```

---

## 5. Indici e Ottimizzazioni

### 5.1 Indici Composti Critici

```prisma
// Ricerca appuntamenti per giorno e medico
@@index([tenantId, medicoId, dataOra])

// Ricerca disponibilità
@@index([tenantId, ambulatorioId, medicoId, giornoSettimana])

// Ricerca visite paziente
@@index([tenantId, pazienteId, oraInizio])

// Ricerca prestazioni attive
@@index([tenantId, specialita, isAttiva])

// Dashboard medico
@@index([tenantId, medicoEsecutoreId, stato, oraInizio])
```

### 5.2 Full-Text Search

```sql
-- Creazione indice full-text per referti (PostgreSQL)
CREATE INDEX referto_contenuto_fts ON "Referto" 
USING gin(to_tsvector('italian', contenuto));

-- Ricerca paziente
CREATE INDEX person_fullname_fts ON "persons" 
USING gin(to_tsvector('italian', "firstName" || ' ' || "lastName"));
```

---

## 6. Migration Strategy

### 6.1 Script di Migrazione

```bash
# 1. Backup pre-migrazione
pg_dump $DATABASE_URL > backup_pre_clinica.sql

# 2. Genera migrazione
npx prisma migrate dev --name add_clinical_entities

# 3. Applica in staging
DATABASE_URL=$STAGING_URL npx prisma migrate deploy

# 4. Test completi

# 5. Applica in produzione
DATABASE_URL=$PRODUCTION_URL npx prisma migrate deploy
```

### 6.2 Rollback Plan

```bash
# Se necessario rollback
psql $DATABASE_URL < backup_pre_clinica.sql
```

---

## 7. Test Cases

| ID | Test | Expected |
|----|------|----------|
| T1.1 | Creazione Poliambulatorio | ✅ Record creato |
| T1.2 | Creazione Ambulatorio con Strumentario | ✅ Relazioni corrette |
| T1.3 | Creazione Prestazione con Specialisti | ✅ M:N funzionante |
| T1.4 | Creazione Appuntamento completo | ✅ Tutti FK validi |
| T1.5 | Workflow Visita → Referto | ✅ Stati corretti |
| T1.6 | Versioning Referto | ✅ Storico mantenuto |
| T1.7 | Soft delete cascade | ✅ deletedAt propagato |
| T1.8 | Tenant isolation | ✅ Query filtrate |

---

**Prossimo Documento**: `03_FASE_2_BACKEND.md` - Backend API Cliniche
