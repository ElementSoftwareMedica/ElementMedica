# 🔧 Estensione Multi-Servizio - Database Schema Update

**Progetto**: Estensione Schema Database per Servizi Multipli  
**Data**: 8 Novembre 2025  
**Versione**: 2.0 (estensione a 1.0)  
**Obiettivo**: Supportare preventivi per DVR, RSPP, Medico Competente, oltre ai Corsi

---

## 📋 Indice

1. [Overview Estensione](#overview-estensione)
2. [Nuovi Enum e Tipi](#nuovi-enum-e-tipi)
3. [Schema Preventivo Esteso](#schema-preventivo-esteso)
4. [Migration SQL](#migration-sql)
5. [Seed Data Multi-Servizio](#seed-data-multi-servizio)
6. [Backward Compatibility](#backward-compatibility)

---

## 🎯 Overview Estensione

### Servizi Supportati

| Servizio | Codice Enum | Modello Prezzo | Caratteristiche |
|----------|-------------|----------------|-----------------|
| **Corsi Formazione** | `CORSO` | Per persona | Durata ore, partecipanti, modalità |
| **Valutazione Rischi** | `DVR` | Tariffa fissa | N° dipendenti, settore, sedi |
| **RSPP Esterno** | `RSPP` | Mensile ricorrente | Classe rischio, durata contratto |
| **Medico Competente** | `MEDICO_COMPETENTE` | Per visita/dipendente | Tipo visite, frequenza |
| **Altri Servizi** | `ALTRO` | Flessibile | Configurabile |

### Approccio Architetturale

**Strategia**: **Hybrid Model** (campi comuni + JSON specifico)

- ✅ **Campi comuni**: id, numero, cliente, prezzi, stato, date
- ✅ **Campo `tipoServizio`**: Enum per discriminare il tipo
- ✅ **Campo JSON `dettagliServizio`**: Dati specifici per ogni tipo
- ✅ **Backward compatible**: I preventivi corsi esistenti continuano a funzionare

**Vantaggi**:
- Schema flessibile e estendibile
- Validazione tipizzata a livello applicazione
- Query semplici sui campi comuni
- Facile aggiunta di nuovi servizi

---

## 🆕 Nuovi Enum e Tipi

### Enum TipoServizio

```prisma
enum TipoServizio {
  CORSO               // Corsi di formazione (default)
  DVR                 // Documento Valutazione Rischi
  RSPP                // Responsabile Servizio Prevenzione Protezione
  MEDICO_COMPETENTE   // Sorveglianza sanitaria
  CONSULENZA          // Consulenza generica
  ALTRO               // Servizi custom
}
```

### Enum TipoPrezzo

```prisma
enum TipoPrezzo {
  PER_PERSONA         // Prezzo × numero persone (corsi)
  PER_UNITA           // Prezzo × quantità (visite mediche)
  FORFAIT             // Prezzo fisso (DVR)
  MENSILE             // Abbonamento mensile (RSPP)
  ORARIO              // Prezzo all'ora (consulenze)
  PERSONALIZZATO      // Altro
}
```

### TypeScript Types per JSON

```typescript
// backend/types/preventivo.types.ts

export type DettagliCorso = {
  titoloCorso: string;
  descrizioneCorso?: string;
  durataOre: number;
  numeroPartecipanti: number;
  modalitaErogazione: 'PRESENZA' | 'ONLINE' | 'IBRIDA';
  dateInizio?: string;
  dateFine?: string;
  sede?: string;
  orario?: string;
  docente?: string;
};

export type DettagliDVR = {
  azienda: string;
  numDipendenti: number;
  settore: string;
  ateco?: string;
  numSedi: number;
  indirizziSedi?: string[];
  tempiConsegna: string; // es: "30 giorni lavorativi"
  includeRilevazioni: boolean;
  includeFormazione: boolean;
  revisione?: boolean; // true se è revisione DVR esistente
};

export type DettagliRSPP = {
  azienda: string;
  numDipendenti: number;
  classeRischio: 'BASSO' | 'MEDIO' | 'ALTO';
  durataMesi: number;
  inizioIncarico: string;
  fineIncarico: string;
  periodicitaVisite: 'MENSILE' | 'BIMESTRALE' | 'TRIMESTRALE' | 'QUADRIMESTRALE';
  oreConsulenza: number; // ore/mese incluse
  includeFormazione: boolean;
  includeEmergency: boolean; // supporto emergenze 24/7
};

export type DettagliMedicoCompetente = {
  azienda: string;
  numDipendenti: number;
  tipoVisite: string[]; // es: ["preassuntive", "periodiche", "idoneità"]
  frequenza: 'ANNUALE' | 'BIENNALE' | 'SU_RICHIESTA';
  sede: string;
  attrezzaturaNecessaria?: string[];
  protocolliBiologici: boolean;
  protocolliChimici: boolean;
  protocolliVideoterminalisti: boolean;
};

export type DettagliAltroServizio = {
  nomeServizio: string;
  descrizione: string;
  quantita: number;
  unitaMisura: string; // es: "ore", "giorni", "report", "pezzi"
  specifiche?: Record<string, any>;
};

export type DettagliServizio = 
  | DettagliCorso 
  | DettagliDVR 
  | DettagliRSPP 
  | DettagliMedicoCompetente 
  | DettagliAltroServizio;
```

---

## 🗄️ Schema Preventivo Esteso

### File: `backend/prisma/schema.prisma`

```prisma
model Preventivo {
  id                    String                @id @default(uuid())
  
  // Numerazione progressiva
  numero                String                // Formato: "PREV-2025-0001"
  annoProgressivo       Int                   
  numeroProgressivo     Int                   
  
  // ========================================
  // NUOVO: Tipo Servizio
  // ========================================
  tipoServizio          TipoServizio          @default(CORSO)
  tipoPrezzo            TipoPrezzo            @default(PER_PERSONA)
  
  // ========================================
  // NUOVO: Dettagli Specifici (JSON)
  // ========================================
  dettagliServizio      Json                  // Contiene DettagliServizio
  
  // Riferimenti (ora opzionali per non-corsi)
  scheduleId            String?               
  schedule              CourseSchedule?       @relation(fields: [scheduleId], references: [id])
  
  corsoId               String?               // NULLABLE per DVR, RSPP, etc.
  corso                 Training?             @relation(fields: [corsoId], references: [id])
  
  // Cliente
  clienteType           ClienteType           
  aziendaId             String?               
  azienda               Company?              @relation(fields: [aziendaId], references: [id])
  personaId             String?               
  persona               Person?               @relation(fields: [personaId], references: [id])
  
  // ========================================
  // Campi Unificati (valgono per tutti)
  // ========================================
  titoloServizio        String                // Titolo generico
  descrizioneServizio   String?               @db.Text
  
  // Calcoli finanziari
  quantita              Int                   @default(1) // N° partecipanti, visite, mesi, etc.
  prezzoUnitario        Decimal               @db.Decimal(10, 2)
  prezzoTotale          Decimal               @db.Decimal(10, 2)
  scontoTotale          Decimal               @db.Decimal(10, 2) @default(0)
  importoFinale         Decimal               @db.Decimal(10, 2)
  
  // Date
  dataEmissione         DateTime              @default(now())
  dataScadenza          DateTime              
  dataInizioServizio    DateTime?             // Data inizio erogazione (opzionale)
  dataFineServizio      DateTime?             // Data fine erogazione (opzionale)
  
  // Workflow
  stato                 StatoPreventivo       @default(BOZZA)
  dataInvio             DateTime?             
  dataAccettazione      DateTime?             
  dataRifiuto           DateTime?             
  motivoRifiuto         String?               @db.Text
  
  // Note e condizioni
  note                  String?               @db.Text
  condizioniPagamento   String?               @db.Text
  
  // File PDF
  fileUrl               String?               
  fileName              String?               
  fileSize              Int?                  
  
  // Relazioni
  sconti                PreventivoSconto[]    
  
  // Multi-tenancy
  tenantId              String
  tenant                Tenant                @relation(fields: [tenantId], references: [id])
  
  // Audit
  generatedBy           String                
  generatedAt           DateTime              @default(now())
  updatedAt             DateTime              @updatedAt
  deletedAt             DateTime?             
  
  // Indexes
  @@unique([tenantId, numero])
  @@index([tenantId, stato, dataEmissione])
  @@index([tenantId, tipoServizio])  // NUOVO
  @@index([tenantId, clienteType, aziendaId, personaId])
  @@index([scheduleId])
  @@index([corsoId])
  @@map("preventivi")
}
```

### Modifiche CodiceSconto

```prisma
model CodiceSconto {
  // ... campi esistenti ...
  
  // ========================================
  // NUOVO: Applicabilità per tipo servizio
  // ========================================
  applicabileServizi    TipoServizio[]        @default([CORSO]) // Array: [CORSO, DVR, RSPP]
  
  // Deprecato (ma mantenuto per backward compatibility)
  tipoCorso             TipoCorsoSconto?      
  categorieCorso        String[]              
  
  // ... resto campi ...
}
```

---

## 📜 Migration SQL

### Step 1: Aggiungi Enums

```sql
-- Migration: 20251108_add_multi_servizio_support.sql

-- 1. Crea nuovo enum TipoServizio
CREATE TYPE "TipoServizio" AS ENUM (
  'CORSO',
  'DVR',
  'RSPP',
  'MEDICO_COMPETENTE',
  'CONSULENZA',
  'ALTRO'
);

-- 2. Crea nuovo enum TipoPrezzo
CREATE TYPE "TipoPrezzo" AS ENUM (
  'PER_PERSONA',
  'PER_UNITA',
  'FORFAIT',
  'MENSILE',
  'ORARIO',
  'PERSONALIZZATO'
);

-- 3. Aggiungi colonne a preventivi
ALTER TABLE "preventivi" 
  ADD COLUMN "tipoServizio" "TipoServizio" NOT NULL DEFAULT 'CORSO',
  ADD COLUMN "tipoPrezzo" "TipoPrezzo" NOT NULL DEFAULT 'PER_PERSONA',
  ADD COLUMN "dettagliServizio" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "titoloServizio" VARCHAR(500),
  ADD COLUMN "descrizioneServizio" TEXT,
  ADD COLUMN "quantita" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "dataInizioServizio" TIMESTAMP(3),
  ADD COLUMN "dataFineServizio" TIMESTAMP(3);

-- 4. Rendi corsoId nullable (per DVR, RSPP, etc.)
ALTER TABLE "preventivi" 
  ALTER COLUMN "corsoId" DROP NOT NULL;

-- 5. Migra dati esistenti (corsi)
UPDATE "preventivi" 
SET 
  "titoloServizio" = "titoloCorso",
  "descrizioneServizio" = "descrizioneCorso",
  "quantita" = "numeroPartecipanti",
  "dettagliServizio" = jsonb_build_object(
    'titoloCorso', "titoloCorso",
    'descrizioneCorso', "descrizioneCorso",
    'durataOre', "durataOre",
    'numeroPartecipanti', "numeroPartecipanti",
    'modalitaErogazione', "modalitaErogazione"
  )
WHERE "deletedAt" IS NULL;

-- 6. Crea indice su tipoServizio
CREATE INDEX "preventivi_tipoServizio_idx" ON "preventivi"("tenantId", "tipoServizio");

-- 7. Crea indice GIN su dettagliServizio (per query JSON)
CREATE INDEX "preventivi_dettagliServizio_gin_idx" ON "preventivi" USING GIN ("dettagliServizio");

-- 8. Aggiungi colonna applicabileServizi a codici_sconto
ALTER TABLE "codici_sconto"
  ADD COLUMN "applicabileServizi" "TipoServizio"[] DEFAULT ARRAY['CORSO']::"TipoServizio"[];

-- 9. Verifica migrazione
DO $$
DECLARE
  count_preventivi INTEGER;
  count_codici INTEGER;
BEGIN
  SELECT COUNT(*) INTO count_preventivi FROM "preventivi" WHERE "tipoServizio" IS NOT NULL;
  SELECT COUNT(*) INTO count_codici FROM "codici_sconto" WHERE "applicabileServizi" IS NOT NULL;
  
  RAISE NOTICE 'Preventivi migrati: %', count_preventivi;
  RAISE NOTICE 'Codici sconto aggiornati: %', count_codici;
END $$;
```

### Step 2: Script Rollback (se necessario)

```sql
-- Rollback: 20251108_rollback_multi_servizio.sql

-- 1. Rimuovi colonne aggiunte
ALTER TABLE "preventivi"
  DROP COLUMN IF EXISTS "tipoServizio",
  DROP COLUMN IF EXISTS "tipoPrezzo",
  DROP COLUMN IF EXISTS "dettagliServizio",
  DROP COLUMN IF EXISTS "titoloServizio",
  DROP COLUMN IF EXISTS "descrizioneServizio",
  DROP COLUMN IF EXISTS "quantita",
  DROP COLUMN IF EXISTS "dataInizioServizio",
  DROP COLUMN IF EXISTS "dataFineServizio";

-- 2. Ripristina NOT NULL su corsoId
ALTER TABLE "preventivi"
  ALTER COLUMN "corsoId" SET NOT NULL;

-- 3. Rimuovi colonna da codici_sconto
ALTER TABLE "codici_sconto"
  DROP COLUMN IF EXISTS "applicabileServizi";

-- 4. Elimina indici
DROP INDEX IF EXISTS "preventivi_tipoServizio_idx";
DROP INDEX IF EXISTS "preventivi_dettagliServizio_gin_idx";

-- 5. Elimina enums
DROP TYPE IF EXISTS "TipoServizio";
DROP TYPE IF EXISTS "TipoPrezzo";

RAISE NOTICE 'Rollback completato';
```

---

## 🌱 Seed Data Multi-Servizio

### File: `backend/prisma/seed-preventivi-multi.ts`

```typescript
import { PrismaClient, TipoServizio, TipoPrezzo, StatoPreventivo } from '@prisma/client';

const prisma = new PrismaClient();

async function seedPreventiviMultiServizio() {
  console.log('🌱 Seeding preventivi multi-servizio...');

  // Trova tenant e cliente di test
  const tenant = await prisma.tenant.findFirst();
  const azienda = await prisma.company.findFirst();

  if (!tenant || !azienda) {
    console.error('❌ Tenant o azienda non trovati');
    return;
  }

  // 1. PREVENTIVO CORSO (già supportato)
  const preventivoCorso = await prisma.preventivo.create({
    data: {
      numero: 'PREV-2025-TEST-001',
      annoProgressivo: 2025,
      numeroProgressivo: 1,
      tipoServizio: TipoServizio.CORSO,
      tipoPrezzo: TipoPrezzo.PER_PERSONA,
      titoloServizio: 'Sicurezza sul Lavoro - Formazione Base',
      descrizioneServizio: 'Corso obbligatorio ai sensi del D.Lgs 81/08',
      quantita: 12,
      prezzoUnitario: 120.00,
      prezzoTotale: 1440.00,
      scontoTotale: 0,
      importoFinale: 1440.00,
      dettagliServizio: {
        titoloCorso: 'Sicurezza sul Lavoro - Formazione Base',
        durataOre: 8,
        numeroPartecipanti: 12,
        modalitaErogazione: 'PRESENZA',
        dateInizio: '2025-01-15',
        dateFine: '2025-01-20',
        sede: 'Sede cliente - Milano'
      },
      clienteType: 'AZIENDA',
      aziendaId: azienda.id,
      dataEmissione: new Date(),
      dataScadenza: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 giorni
      stato: StatoPreventivo.BOZZA,
      condizioniPagamento: '50% anticipo alla conferma, saldo entro 30 giorni da fine corso',
      tenantId: tenant.id,
      generatedBy: 'SEED_SCRIPT'
    }
  });

  // 2. PREVENTIVO DVR
  const preventivoDVR = await prisma.preventivo.create({
    data: {
      numero: 'PREV-2025-TEST-002',
      annoProgressivo: 2025,
      numeroProgressivo: 2,
      tipoServizio: TipoServizio.DVR,
      tipoPrezzo: TipoPrezzo.FORFAIT,
      titoloServizio: 'Documento Valutazione Rischi (DVR)',
      descrizioneServizio: 'Redazione DVR completo ai sensi del D.Lgs 81/08',
      quantita: 1,
      prezzoUnitario: 1500.00,
      prezzoTotale: 1500.00,
      scontoTotale: 0,
      importoFinale: 1500.00,
      dettagliServizio: {
        azienda: azienda.businessName,
        numDipendenti: 25,
        settore: 'Metalmeccanico',
        ateco: '25.50.00',
        numSedi: 2,
        indirizziSedi: ['Via Roma 123, Milano', 'Via Verdi 45, Monza'],
        tempiConsegna: '30 giorni lavorativi',
        includeRilevazioni: true,
        includeFormazione: false,
        revisione: false
      },
      clienteType: 'AZIENDA',
      aziendaId: azienda.id,
      dataEmissione: new Date(),
      dataScadenza: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // +45 giorni
      dataInizioServizio: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      stato: StatoPreventivo.BOZZA,
      condizioniPagamento: '50% anticipo, saldo alla consegna del DVR',
      note: 'Include sopralluogo e rilevazione rischi. Aggiornamenti annuali con costo separato.',
      tenantId: tenant.id,
      generatedBy: 'SEED_SCRIPT'
    }
  });

  // 3. PREVENTIVO RSPP
  const preventivoRSPP = await prisma.preventivo.create({
    data: {
      numero: 'PREV-2025-TEST-003',
      annoProgressivo: 2025,
      numeroProgressivo: 3,
      tipoServizio: TipoServizio.RSPP,
      tipoPrezzo: TipoPrezzo.MENSILE,
      titoloServizio: 'Servizio RSPP Esterno - Abbonamento Annuale',
      descrizioneServizio: 'Responsabile Servizio Prevenzione e Protezione esterno ai sensi del D.Lgs 81/08',
      quantita: 12, // 12 mesi
      prezzoUnitario: 350.00, // al mese
      prezzoTotale: 4200.00,
      scontoTotale: 0,
      importoFinale: 4200.00,
      dettagliServizio: {
        azienda: azienda.businessName,
        numDipendenti: 25,
        classeRischio: 'MEDIO',
        durataMesi: 12,
        inizioIncarico: '2025-01-01',
        fineIncarico: '2025-12-31',
        periodicitaVisite: 'TRIMESTRALE',
        oreConsulenza: 4, // ore/mese incluse
        includeFormazione: true,
        includeEmergency: false
      },
      clienteType: 'AZIENDA',
      aziendaId: azienda.id,
      dataEmissione: new Date(),
      dataScadenza: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // +60 giorni
      dataInizioServizio: new Date('2025-01-01'),
      dataFineServizio: new Date('2025-12-31'),
      stato: StatoPreventivo.BOZZA,
      condizioniPagamento: 'Pagamento mensile anticipato. Primo mese alla firma del contratto.',
      note: 'Include 4 visite trimestrali, consulenza telefonica illimitata, aggiornamento DVR, assistenza per verbali.',
      tenantId: tenant.id,
      generatedBy: 'SEED_SCRIPT'
    }
  });

  // 4. PREVENTIVO MEDICO COMPETENTE
  const preventivoMedico = await prisma.preventivo.create({
    data: {
      numero: 'PREV-2025-TEST-004',
      annoProgressivo: 2025,
      numeroProgressivo: 4,
      tipoServizio: TipoServizio.MEDICO_COMPETENTE,
      tipoPrezzo: TipoPrezzo.PER_UNITA,
      titoloServizio: 'Sorveglianza Sanitaria - Medico Competente',
      descrizioneServizio: 'Visite mediche periodiche e idoneità lavorativa',
      quantita: 25, // 25 dipendenti
      prezzoUnitario: 60.00, // per visita
      prezzoTotale: 1500.00,
      scontoTotale: 0,
      importoFinale: 1500.00,
      dettagliServizio: {
        azienda: azienda.businessName,
        numDipendenti: 25,
        tipoVisite: ['Preassuntive', 'Periodiche', 'Idoneità'],
        frequenza: 'ANNUALE',
        sede: 'Presso sede aziendale del cliente',
        attrezzaturaNecessaria: ['Spirometro', 'Audiometro'],
        protocolliBiologici: false,
        protocolliChimici: true,
        protocolliVideoterminalisti: true
      },
      clienteType: 'AZIENDA',
      aziendaId: azienda.id,
      dataEmissione: new Date(),
      dataScadenza: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      dataInizioServizio: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      stato: StatoPreventivo.BOZZA,
      condizioniPagamento: 'Pagamento a 30 giorni dalla fattura post-visite',
      note: 'Visite presso la sede del cliente. Relazione finale consegnata entro 15 giorni.',
      tenantId: tenant.id,
      generatedBy: 'SEED_SCRIPT'
    }
  });

  // 5. PREVENTIVO ALTRO (Consulenza)
  const preventivoAltro = await prisma.preventivo.create({
    data: {
      numero: 'PREV-2025-TEST-005',
      annoProgressivo: 2025,
      numeroProgressivo: 5,
      tipoServizio: TipoServizio.ALTRO,
      tipoPrezzo: TipoPrezzo.ORARIO,
      titoloServizio: 'Consulenza Sicurezza sul Lavoro',
      descrizioneServizio: 'Consulenza personalizzata per implementazione sistema sicurezza',
      quantita: 20, // 20 ore
      prezzoUnitario: 80.00, // €/ora
      prezzoTotale: 1600.00,
      scontoTotale: 0,
      importoFinale: 1600.00,
      dettagliServizio: {
        nomeServizio: 'Consulenza Sicurezza',
        descrizione: 'Analisi procedure di sicurezza esistenti, identificazione gap normativi, stesura piano di miglioramento',
        quantita: 20,
        unitaMisura: 'ore',
        specifiche: {
          modalita: 'On-site + remoto',
          deliverables: ['Report iniziale', 'Piano miglioramento', 'Checklist operative'],
          tempistiche: '4 settimane'
        }
      },
      clienteType: 'AZIENDA',
      aziendaId: azienda.id,
      dataEmissione: new Date(),
      dataScadenza: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      dataInizioServizio: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      dataFineServizio: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000),
      stato: StatoPreventivo.BOZZA,
      condizioniPagamento: '50% anticipo, 50% a consegna report finale',
      tenantId: tenant.id,
      generatedBy: 'SEED_SCRIPT'
    }
  });

  console.log('✅ Seed completato:');
  console.log(`  - Preventivo Corso: ${preventivoCorso.numero}`);
  console.log(`  - Preventivo DVR: ${preventivoDVR.numero}`);
  console.log(`  - Preventivo RSPP: ${preventivoRSPP.numero}`);
  console.log(`  - Preventivo Medico: ${preventivoMedico.numero}`);
  console.log(`  - Preventivo Altro: ${preventivoAltro.numero}`);
}

seedPreventiviMultiServizio()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

---

## 🔄 Backward Compatibility

### Strategia Compatibilità

**Obiettivo**: I preventivi corsi esistenti devono continuare a funzionare senza modifiche al codice.

### 1. Default Values

```prisma
// Schema con defaults
tipoServizio          TipoServizio          @default(CORSO)
tipoPrezzo            TipoPrezzo            @default(PER_PERSONA)
dettagliServizio      Json                  @default("{}")
```

### 2. Migration Automatica Dati

```sql
-- Migra preventivi esistenti
UPDATE "preventivi" 
SET 
  "tipoServizio" = 'CORSO',
  "tipoPrezzo" = 'PER_PERSONA',
  "titoloServizio" = "titoloCorso",
  "quantita" = "numeroPartecipanti",
  "dettagliServizio" = jsonb_build_object(
    'titoloCorso', "titoloCorso",
    'durataOre', "durataOre",
    'numeroPartecipanti', "numeroPartecipanti",
    'modalitaErogazione', "modalitaErogazione"
  )
WHERE "tipoServizio" IS NULL;
```

### 3. Backend Service Layer

```typescript
// backend/services/preventivoService.ts

export class PreventivoService {
  
  // Factory method per creare preventivo giusto
  async createPreventivo(data: CreatePreventivoDto) {
    switch (data.tipoServizio) {
      case TipoServizio.CORSO:
        return this.createPreventivoCorso(data);
      case TipoServizio.DVR:
        return this.createPreventivoDVR(data);
      case TipoServizio.RSPP:
        return this.createPreventivoRSPP(data);
      case TipoServizio.MEDICO_COMPETENTE:
        return this.createPreventivoMedico(data);
      case TipoServizio.ALTRO:
        return this.createPreventivoAltro(data);
      default:
        throw new Error(`Tipo servizio non supportato: ${data.tipoServizio}`);
    }
  }
  
  // Metodo legacy (backward compatibility)
  async createPreventivoCorso(data: CreatePreventivoCorsoDto) {
    return prisma.preventivo.create({
      data: {
        ...data,
        tipoServizio: TipoServizio.CORSO,
        tipoPrezzo: TipoPrezzo.PER_PERSONA,
        titoloServizio: data.titoloCorso,
        quantita: data.numeroPartecipanti,
        dettagliServizio: {
          titoloCorso: data.titoloCorso,
          descrizioneCorso: data.descrizioneCorso,
          durataOre: data.durataOre,
          numeroPartecipanti: data.numeroPartecipanti,
          modalitaErogazione: data.modalitaErogazione
        }
      }
    });
  }
}
```

### 4. Query Compatibility Layer

```typescript
// Helper per query backward compatible
export function buildPreventivoQuery(filters: PreventivoFilters) {
  const where: any = {
    tenantId: filters.tenantId,
    deletedAt: null
  };
  
  // Se filtro per corsi, usa sia il vecchio che nuovo modo
  if (filters.isCorso) {
    where.OR = [
      { tipoServizio: TipoServizio.CORSO },
      { corsoId: { not: null } } // Fallback per vecchi record
    ];
  }
  
  return where;
}
```

### 5. Frontend Component Wrapper

```typescript
// src/components/preventivi/PreventivoCard.tsx

export const PreventivoCard = ({ preventivo }: Props) => {
  // Determina tipo (backward compatible)
  const tipo = preventivo.tipoServizio || (preventivo.corsoId ? 'CORSO' : 'ALTRO');
  
  switch (tipo) {
    case 'CORSO':
      return <PreventivoCorsoCard preventivo={preventivo} />;
    case 'DVR':
      return <PreventivoDVRCard preventivo={preventivo} />;
    // ... altri casi
  }
};
```

---

## ✅ Checklist Deployment

### Pre-Deployment

- [ ] Backup database completo
- [ ] Test migration su staging
- [ ] Verifica seed data multi-servizio
- [ ] Test query backward compatibility
- [ ] Review codice servizi backend
- [ ] Test frontend con dati migrati

### Deployment

- [ ] Esegui migration SQL
- [ ] Verifica migrazione dati esistenti
- [ ] Deploy backend services
- [ ] Deploy frontend
- [ ] Test smoke (CRUD preventivi)
- [ ] Test generazione PDF multi-servizio

### Post-Deployment

- [ ] Monitor errori applicazione
- [ ] Verifica performance query JSON
- [ ] Check log errori validazione
- [ ] Feedback utenti test

---

## 📞 Supporto

**Documentazione Completa**: `/docs/10_project_management/preventivi-e-codici-sconto/`

**Domande?** dev@elementmedica.it

---

**Versione**: 2.0  
**Data**: 8 Novembre 2025  
**Autore**: Element Medica Dev Team
