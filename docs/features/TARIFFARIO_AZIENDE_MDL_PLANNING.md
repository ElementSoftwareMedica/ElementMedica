# 📋 TARIFFARIO AZIENDE - Medicina del Lavoro

## 🎯 OBIETTIVO

Implementare un sistema di **Tariffario Aziende** per la gestione dei servizi del **Medico del Lavoro (MDL)**.
Il tariffario definisce prezzi per prestazioni sanitarie e spese fisse/ricorrenti associate alle aziende clienti.

---

## 📊 REQUISITI FUNZIONALI

### 1. Tariffario Base vs Specifico
- **Tariffario Base**: Template riutilizzabile da cui derivare tariffari aziendali
- **Tariffario Aziendale**: Tariffario specifico assegnato a una Company
- **Validità temporale**: Date inizio/fine con possibilità di programmare successori
- **Convenzione**: Possibilità di associare a una Convenzione esistente

### 2. Voci del Tariffario
- **Prestazioni MDL**: Link a Prestazione esistente (tipo VISITA_MEDICINA_LAVORO)
- **Spese Fisse**: Costi una tantum (es. attivazione servizio)
- **Spese Ricorrenti**: Costi periodici (mensili, annuali, etc.)
- **Frequenza**: Una tantum, per visita, per dipendente, mensile, annuale, etc.

### 3. Fasce Dipendenti
- Prezzi variabili basati sul numero di dipendenti dell'azienda
- Esempio: 30€ (<5 dip.), 50€ (5-10 dip.), 100€ (>10 dip.)
- Applicabile a qualsiasi voce del tariffario

### 4. Interfaccia Utente
- **`/management/tariffari-aziende`**: Gestione tariffari base e lista generale
- **`/management/tariffari-aziende/:id`**: Dettaglio/modifica tariffario
- **`/companies/:id`**: Sezione tariffari assegnati all'azienda

---

## 🏗️ DECISIONE ARCHITETTURALE

### ❓ Due Entità Separate vs Entità Unica

#### Opzione A: Due Entità Separate
```
TariffarioAziendaBase (template)
TariffarioAzienda (istanza per company)
```

**PRO:**
- Separazione netta template/istanza
- Query dirette senza filtri tipologia

**CONTRO:**
- Duplicazione campi comuni
- Doppia manutenzione struttura
- Relazioni duplicate con VoceTariffario

#### Opzione B: Entità Unica con Campo Tipo ✅ SCELTA

```
TariffarioAziendale
  - tipo: BASE | AZIENDALE
  - companyId: nullable (solo per AZIENDALE)
  - tariffarioOrigineId: nullable (da quale base deriva)
```

**PRO:**
- Schema più semplice e DRY
- Facile clonare base → aziendale
- Meno tabelle da mantenere
- Un solo service/controller
- Evoluzione facilitata (un base può diventare aziendale)

**CONTRO:**
- Query richiedono filtro `tipo`
- companyId nullable

### ✅ DECISIONE FINALE: **Entità Unica con Campo Tipo**

Motivazioni:
1. La struttura dati è identica al 95%
2. Pattern comune in sistemi template/istanza
3. Clonazione semplificata
4. Meno complessità generale
5. Più facile da mantenere e testare

---

## 📐 DESIGN DATABASE

### Nuovi ENUM

```prisma
enum TipoTariffario {
  BASE        // Template riutilizzabile
  AZIENDALE   // Specifico per un'azienda
}

enum TipoVoceTariffario {
  PRESTAZIONE       // Collegata a Prestazione MDL
  SPESA_FISSA       // Costo fisso una tantum
  SPESA_RICORRENTE  // Costo periodico
}

enum FrequenzaTariffario {
  UNA_TANTUM        // Una volta sola
  PER_VISITA        // Ad ogni visita
  PER_DIPENDENTE    // Per ogni dipendente (annuale)
  MENSILE           // Ogni mese
  TRIMESTRALE       // Ogni 3 mesi
  SEMESTRALE        // Ogni 6 mesi
  ANNUALE           // Ogni anno
}
```

### Modello: TariffarioAziendale

```prisma
model TariffarioAziendale {
  id                  String              @id @default(uuid())
  codice              String              // Codice univoco
  nome                String
  descrizione         String?
  
  // Tipologia
  tipo                TipoTariffario      @default(BASE)
  
  // Company (solo per tipo AZIENDALE)
  companyId           String?
  company             Company?            @relation(fields: [companyId], references: [id])
  
  // Tariffario origine (se derivato da un base)
  tariffarioOrigineId String?
  tariffarioOrigine   TariffarioAziendale?  @relation("TariffarioDerivato", ...)
  tariffariDerivati   TariffarioAziendale[] @relation("TariffarioDerivato")
  
  // Convenzione associata (opzionale)
  convenzioneId       String?
  convenzione         Convenzione?        @relation(fields: [convenzioneId], references: [id])
  
  // Validità temporale
  validoDa            DateTime            @default(now())
  validoA             DateTime?
  attivo              Boolean             @default(true)
  
  // Successore programmato
  successoreId        String?             @unique
  successore          TariffarioAziendale?  @relation("TariffarioSuccessore", ...)
  predecessore        TariffarioAziendale?  @relation("TariffarioSuccessore")
  
  // Voci del tariffario
  voci                VoceTariffario[]
  
  // Metadata
  tenantId            String
  createdAt           DateTime            @default(now())
  updatedAt           DateTime            @updatedAt
  deletedAt           DateTime?
  createdBy           String?
  
  @@unique([tenantId, codice])
  @@index([tenantId])
  @@index([tipo])
  @@index([companyId])
  @@index([convenzioneId])
  @@index([attivo])
  @@map("tariffari_aziendali")
}
```

### Modello: VoceTariffario

```prisma
model VoceTariffario {
  id                    String              @id @default(uuid())
  tariffarioAziendaleId String
  tariffarioAziendale   TariffarioAziendale @relation(...)
  
  // Tipo voce
  tipo                  TipoVoceTariffario
  
  // Se tipo = PRESTAZIONE
  prestazioneId         String?
  prestazione           Prestazione?        @relation(...)
  
  // Se tipo = SPESA_FISSA o SPESA_RICORRENTE
  nome                  String?             // Nome spesa (se non prestazione)
  descrizione           String?
  
  // Pricing
  prezzoBase            Decimal             @db.Decimal(10, 2)
  ivaAliquota           Decimal             @default(22) @db.Decimal(5, 2)
  
  // Frequenza applicazione
  frequenza             FrequenzaTariffario @default(UNA_TANTUM)
  
  // Fasce dipendenti
  usaFasceDipendenti    Boolean             @default(false)
  fasceDipendenti       FasciaDipendentiPrezzo[]
  
  // Ordinamento
  ordine                Int                 @default(0)
  attivo                Boolean             @default(true)
  
  // Metadata
  tenantId              String
  createdAt             DateTime            @default(now())
  updatedAt             DateTime            @updatedAt
  deletedAt             DateTime?
  
  @@index([tariffarioAziendaleId])
  @@index([tenantId])
  @@index([tipo])
  @@map("voci_tariffario")
}
```

### Modello: FasciaDipendentiPrezzo

```prisma
model FasciaDipendentiPrezzo {
  id                String          @id @default(uuid())
  voceTariffarioId  String
  voceTariffario    VoceTariffario  @relation(...)
  
  // Range dipendenti
  minDipendenti     Int             // es. 0, 5, 11
  maxDipendenti     Int?            // null = illimitato (es. 11+)
  
  // Prezzo per questa fascia
  prezzo            Decimal         @db.Decimal(10, 2)
  
  // Descrizione fascia (opzionale)
  descrizione       String?         // es. "Micro impresa", "PMI"
  
  tenantId          String
  createdAt         DateTime        @default(now())
  deletedAt         DateTime?
  
  @@index([voceTariffarioId])
  @@index([tenantId])
  @@map("fasce_dipendenti_prezzo")
}
```

---

## 🔗 RELAZIONI DA AGGIUNGERE

### Company
```prisma
model Company {
  // ... campi esistenti
  tariffariAziendali    TariffarioAziendale[]
}
```

### Convenzione
```prisma
model Convenzione {
  // ... campi esistenti
  tariffariAziendali    TariffarioAziendale[]
}
```

### Prestazione
```prisma
model Prestazione {
  // ... campi esistenti
  vociTariffario        VoceTariffario[]
}
```

---

## 📁 STRUTTURA FILES

### Backend

```
backend/
├── services/
│   └── management/
│       └── TariffarioAziendaleService.js    # CRUD + logica business
├── routes/
│   └── tariffario-aziendale-routes.js       # API endpoints
```

### Frontend

```
src/
├── services/
│   └── tariffarioAziendaleApi.ts            # API client + types
├── pages/
│   └── management/
│       └── tariffari-aziende/
│           ├── TariffariAziendePage.tsx     # Lista tariffari
│           ├── TariffarioAziendaleForm.tsx  # Create/Edit form
│           └── TariffarioAziendaleDetail.tsx # Dettaglio
├── components/
│   └── companies/
│       └── TariffariAziendaSection.tsx      # Sezione in CompanyDetails
```

---

## 🛤️ API ENDPOINTS

```
# Tariffari
GET    /api/v1/tariffari-aziendali                  # Lista (filter: tipo, companyId)
GET    /api/v1/tariffari-aziendali/:id              # Dettaglio con voci
POST   /api/v1/tariffari-aziendali                  # Crea nuovo
PUT    /api/v1/tariffari-aziendali/:id              # Modifica
DELETE /api/v1/tariffari-aziendali/:id              # Soft delete

# Clonazione
POST   /api/v1/tariffari-aziendali/:id/clone        # Clona (base→aziendale)

# Voci Tariffario
POST   /api/v1/tariffari-aziendali/:id/voci         # Aggiungi voce
PUT    /api/v1/tariffari-aziendali/:id/voci/:voceId # Modifica voce
DELETE /api/v1/tariffari-aziendali/:id/voci/:voceId # Rimuovi voce

# Fasce Dipendenti
POST   /api/v1/voci-tariffario/:voceId/fasce        # Aggiungi fascia
PUT    /api/v1/voci-tariffario/:voceId/fasce/:id    # Modifica fascia
DELETE /api/v1/voci-tariffario/:voceId/fasce/:id    # Rimuovi fascia

# Company-specific
GET    /api/v1/companies/:id/tariffari              # Tariffari dell'azienda
```

---

## 📋 TASK IMPLEMENTATION

### Fase 1: Database Schema (Prisma)
- [x] Aggiungere enum TipoTariffario, TipoVoceTariffario, FrequenzaTariffario
- [x] Creare model TariffarioAziendale
- [x] Creare model VoceTariffario
- [x] Creare model FasciaDipendentiPrezzo
- [x] Aggiungere relazioni a Company, Convenzione, Prestazione
- [x] Eseguire prisma validate + generate + db push

### Fase 2: Backend Service
- [x] Creare TariffarioAziendaleService.js con CRUD
- [x] Implementare logica clonazione base → aziendale
- [x] Implementare gestione voci e fasce
- [x] Implementare calcolo prezzo per numero dipendenti

### Fase 3: Backend Routes
- [x] Creare tariffario-aziendale-routes.js
- [x] Registrare routes in server.js
- [x] Testare endpoints con curl

### Fase 4: Frontend Types & API
- [x] Aggiungere types in tariffarioAziendaleApi.ts
- [x] Implementare API client methods

### Fase 5: Frontend Pages
- [x] Creare TariffariAziendePage.tsx (lista)
- [x] Creare TariffarioAziendaleForm.tsx (create/edit)
- [x] Creare CloneTariffarioPage.tsx (clonazione da base)
- [x] Aggiungere route in ManagementRouter.tsx
- [x] Aggiungere link in ManagementDashboard.tsx

### Fase 6: Integrazione Companies
- [x] Creare TariffariAziendaSection.tsx
- [x] Integrare in CompanyDetails.tsx

---

## 📊 ESEMPIO DATI

### Tariffario Base "Standard MDL"
```json
{
  "codice": "MDL-STD-2024",
  "nome": "Tariffario Standard Medicina Lavoro 2024",
  "tipo": "BASE",
  "voci": [
    {
      "tipo": "PRESTAZIONE",
      "prestazioneId": "uuid-visita-mdl",
      "prezzoBase": 45.00,
      "frequenza": "PER_VISITA"
    },
    {
      "tipo": "SPESA_RICORRENTE",
      "nome": "Quota annuale gestione",
      "prezzoBase": 50.00,
      "frequenza": "ANNUALE",
      "usaFasceDipendenti": true,
      "fasceDipendenti": [
        { "minDipendenti": 0, "maxDipendenti": 4, "prezzo": 30.00 },
        { "minDipendenti": 5, "maxDipendenti": 10, "prezzo": 50.00 },
        { "minDipendenti": 11, "maxDipendenti": null, "prezzo": 100.00 }
      ]
    }
  ]
}
```

---

## ✅ CHECKLIST PRE-IMPLEMENTATION

- [x] Analisi requisiti completata
- [x] Decisione architetturale (entità unica) presa
- [x] Schema database progettato
- [x] API endpoints definiti
- [x] Struttura files pianificata
- [x] Implementazione completata

---

**Data creazione**: 20 Dicembre 2024
**Data completamento**: 20 Dicembre 2024
**Stato**: ✅ Completato
