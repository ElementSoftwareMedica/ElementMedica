# 📋 Fase 2: Standardizzazione Enum - Dettaglio Operativo

**Progetto**: 46 - Ottimizzazione Profonda  
**Fase**: 2 di 8  
**Durata**: 1 settimana  
**Rischio**: ALTO  
**Prerequisiti**: Fase 0-1 completate

---

## 🎯 Obiettivo

Convertire tutti gli enum italiani in inglese PascalCase mantenendo backward compatibility con il database esistente tramite `@map`.

---

## 📊 Inventario Completo Enum (54 totali)

### ✅ GIÀ IN INGLESE (19) - Nessuna azione

| Enum | Stato |
|------|-------|
| RelationType | ✅ OK |
| BranchType | ✅ OK |
| TenantAccessLevel | ✅ OK |
| CourseStatus | ✅ OK |
| EnrollmentStatus | ✅ OK |
| DeliveryMode | ✅ OK |
| TestStatus | ✅ OK |
| TestType | ✅ OK |
| ParticipantTestStatus | ✅ OK |
| Gender | ✅ OK |
| PersonStatus | ✅ OK |
| RoleType | ✅ OK |
| PersonPermission | ✅ OK |
| RiskLevel | ✅ OK |
| CourseType | ✅ OK |
| ScheduleSource | ✅ OK |
| SubmissionType | ✅ OK |
| SubmissionStatus | ✅ OK |
| TemplateType | ✅ OK |
| TemplateFormat | ✅ OK |
| DocumentStatus | ✅ OK |

### 🔄 DA CONVERTIRE (35)

---

## 📝 Piano di Conversione Dettagliato

### Gruppo A: Enum Status/Stati (13)

#### A1. StatoPreventivo → QuoteStatus

**Attuale:**
```prisma
enum StatoPreventivo {
  BOZZA
  INVIATO
  CONFERMATO
  RIFIUTATO
  SCADUTO
  ANNULLATO
}
```

**Target:**
```prisma
enum QuoteStatus {
  DRAFT      @map("BOZZA")
  SENT       @map("INVIATO")
  CONFIRMED  @map("CONFERMATO")
  REJECTED   @map("RIFIUTATO")
  EXPIRED    @map("SCADUTO")
  CANCELLED  @map("ANNULLATO")
  
  @@map("StatoPreventivo")
}
```

**File da aggiornare:**
- `backend/services/preventivi-service.js`
- `backend/routes/preventivi-routes.js`
- `src/pages/finance/PreventiviPage.tsx`
- `src/types/preventivo.ts`

---

#### A2. StatoAmbulatorio → ClinicRoomStatus

**Attuale:**
```prisma
enum StatoAmbulatorio {
  ATTIVO
  INATTIVO
  MANUTENZIONE
  CHIUSO_TEMPORANEO
}
```

**Target:**
```prisma
enum ClinicRoomStatus {
  ACTIVE              @map("ATTIVO")
  INACTIVE            @map("INATTIVO")
  UNDER_MAINTENANCE   @map("MANUTENZIONE")
  TEMPORARILY_CLOSED  @map("CHIUSO_TEMPORANEO")
  
  @@map("StatoAmbulatorio")
}
```

---

#### A3. StatoPoliambulatorio → ClinicStatus

**Attuale:**
```prisma
enum StatoPoliambulatorio {
  ATTIVO
  INATTIVO
  IN_ALLESTIMENTO
}
```

**Target:**
```prisma
enum ClinicStatus {
  ACTIVE       @map("ATTIVO")
  INACTIVE     @map("INATTIVO")
  SETTING_UP   @map("IN_ALLESTIMENTO")
  
  @@map("StatoPoliambulatorio")
}
```

---

#### A4. StatoStrumento → EquipmentStatus

**Attuale:**
```prisma
enum StatoStrumento {
  DISPONIBILE
  IN_USO
  IN_MANUTENZIONE
  FUORI_SERVIZIO
  DISMESSO
}
```

**Target:**
```prisma
enum EquipmentStatus {
  AVAILABLE        @map("DISPONIBILE")
  IN_USE           @map("IN_USO")
  UNDER_MAINTENANCE @map("IN_MANUTENZIONE")
  OUT_OF_SERVICE   @map("FUORI_SERVIZIO")
  DECOMMISSIONED   @map("DISMESSO")
  
  @@map("StatoStrumento")
}
```

---

#### A5. StatoManutenzione → MaintenanceStatus

**Attuale:**
```prisma
enum StatoManutenzione {
  PROGRAMMATA
  IN_CORSO
  COMPLETATA
  ANNULLATA
  POSTICIPATA
}
```

**Target:**
```prisma
enum MaintenanceStatus {
  SCHEDULED   @map("PROGRAMMATA")
  IN_PROGRESS @map("IN_CORSO")
  COMPLETED   @map("COMPLETATA")
  CANCELLED   @map("ANNULLATA")
  POSTPONED   @map("POSTICIPATA")
  
  @@map("StatoManutenzione")
}
```

---

#### A6. StatoAppuntamento → AppointmentStatus

**Attuale:**
```prisma
enum StatoAppuntamento {
  PRENOTATO
  CONFERMATO
  IN_ATTESA
  IN_CORSO
  COMPLETATO
  ANNULLATO
  NO_SHOW
}
```

**Target:**
```prisma
enum AppointmentStatus {
  BOOKED     @map("PRENOTATO")
  CONFIRMED  @map("CONFERMATO")
  WAITING    @map("IN_ATTESA")
  IN_PROGRESS @map("IN_CORSO")
  COMPLETED  @map("COMPLETATO")
  CANCELLED  @map("ANNULLATO")
  NO_SHOW    @map("NO_SHOW")
  
  @@map("StatoAppuntamento")
}
```

---

#### A7. StatoVisita → VisitStatus

**Attuale:**
```prisma
enum StatoVisita {
  PROGRAMMATA
  IN_CORSO
  COMPLETATA
  ANNULLATA
  SOSPESA
}
```

**Target:**
```prisma
enum VisitStatus {
  SCHEDULED   @map("PROGRAMMATA")
  IN_PROGRESS @map("IN_CORSO")
  COMPLETED   @map("COMPLETATA")
  CANCELLED   @map("ANNULLATA")
  SUSPENDED   @map("SOSPESA")
  
  @@map("StatoVisita")
}
```

---

#### A8. StatoReferto → ReportStatus

**Attuale:**
```prisma
enum StatoReferto {
  BOZZA
  DA_FIRMARE
  FIRMATO
  CONSEGNATO
  ANNULLATO
}
```

**Target:**
```prisma
enum ReportStatus {
  DRAFT        @map("BOZZA")
  PENDING_SIGN @map("DA_FIRMARE")
  SIGNED       @map("FIRMATO")
  DELIVERED    @map("CONSEGNATO")
  CANCELLED    @map("ANNULLATO")
  
  @@map("StatoReferto")
}
```

---

#### A9. StatoFatturaSanitaria → MedicalInvoiceStatus

**Target:**
```prisma
enum MedicalInvoiceStatus {
  DRAFT     @map("BOZZA")
  ISSUED    @map("EMESSA")
  SENT      @map("INVIATA")
  PAID      @map("PAGATA")
  CANCELLED @map("ANNULLATA")
  
  @@map("StatoFatturaSanitaria")
}
```

---

#### A10. StatoRiconoscimento → RecognitionStatus

**Target:**
```prisma
enum RecognitionStatus {
  PENDING   @map("IN_ATTESA")
  APPROVED  @map("APPROVATO")
  REJECTED  @map("RIFIUTATO")
  PAID      @map("EROGATO")
  
  @@map("StatoRiconoscimento")
}
```

---

#### A11. StatoAssenza → AbsenceStatus

**Target:**
```prisma
enum AbsenceStatus {
  PENDING   @map("RICHIESTA")
  APPROVED  @map("APPROVATA")
  REJECTED  @map("RIFIUTATA")
  CANCELLED @map("ANNULLATA")
  
  @@map("StatoAssenza")
}
```

---

#### A12. StatoChiamata → CallStatus

**Target:**
```prisma
enum CallStatus {
  WAITING    @map("IN_ATTESA")
  CALLED     @map("CHIAMATO")
  IN_SERVICE @map("IN_SERVIZIO")
  COMPLETED  @map("COMPLETATO")
  NO_SHOW    @map("NON_PRESENTATO")
  
  @@map("StatoChiamata")
}
```

---

#### A13. StatoFirma → SignatureStatus

**Target:**
```prisma
enum SignatureStatus {
  PENDING  @map("IN_ATTESA")
  SIGNED   @map("FIRMATO")
  REJECTED @map("RIFIUTATO")
  EXPIRED  @map("SCADUTO")
  
  @@map("StatoFirma")
}
```

---

### Gruppo B: Enum Tipo (22)

#### B1-B22 - Conversioni Tipo

| Italiano | Inglese | Valori Esempio |
|----------|---------|----------------|
| TipoSconto | DiscountType | PERCENTAGE, FIXED, FREE |
| TipoCompensoMedico | DoctorCompensationType | FIXED, PERCENTAGE, HOURLY |
| TipoPrestazione | ServiceType | VISIT, EXAM, PROCEDURE, THERAPY |
| TipoManutenzione | MaintenanceType | SCHEDULED, CORRECTIVE, PREVENTIVE |
| TipoDocumentoClinico | ClinicalDocumentType | REPORT, PRESCRIPTION, CERTIFICATE |
| TipoDocumentoPersonale | PersonalDocumentType | ID_CARD, PASSPORT, DRIVING_LICENSE |
| TipoConvenzione | AgreementType | INSURANCE, CORPORATE, PUBLIC |
| TipoRiconoscimento | RecognitionType | DISCOUNT, CASHBACK, BONUS |
| TipoTariffario | PriceListType | STANDARD, DISCOUNTED, CORPORATE |
| TipoVoceTariffario | PriceListItemType | SERVICE, MATERIAL, PACKAGE |
| TipoChiusuraSpeciale | SpecialClosureType | HOLIDAY, MAINTENANCE, EMERGENCY |
| TipoAssenza | AbsenceType | VACATION, SICK, PERSONAL, OTHER |
| TipoCorsoSconto | CourseDiscountType | EARLY_BIRD, GROUP, CORPORATE |
| TipoServizio | ServiceCategory | MEDICAL, TRAINING, SAFETY |
| TipoPrezzo | PriceType | BASE, DISCOUNTED, SPECIAL |
| TipologiaStrumento | EquipmentCategory | DIAGNOSTIC, THERAPEUTIC, MONITORING |
| ApplicabilitaSconto | DiscountApplicability | COURSE, ENROLLMENT, PACKAGE |
| ClienteType | CustomerType | COMPANY, INDIVIDUAL, PUBLIC |
| FrequenzaTariffario | PriceListFrequency | ONCE, MONTHLY, YEARLY |
| PrioritaChiamata | CallPriority | LOW, NORMAL, HIGH, URGENT |

---

## 🔧 Procedura di Migrazione per Singolo Enum

### Step 1: Aggiornare Schema Prisma
```prisma
// PRIMA
enum StatoPreventivo {
  BOZZA
  INVIATO
  CONFERMATO
}

// DOPO
enum QuoteStatus {
  DRAFT      @map("BOZZA")
  SENT       @map("INVIATO")
  CONFIRMED  @map("CONFERMATO")
  
  @@map("StatoPreventivo")
}
```

### Step 2: Validare Schema
```bash
cd backend
npx prisma validate
```

### Step 3: Generare Client
```bash
npx prisma generate
```

### Step 4: Aggiornare Backend

**Cerca e sostituisci in tutti i file JS:**
```javascript
// PRIMA
status: 'BOZZA'
StatoPreventivo.BOZZA

// DOPO
status: 'DRAFT'
QuoteStatus.DRAFT
```

### Step 5: Aggiornare Frontend

**Cerca e sostituisci in tutti i file TS/TSX:**
```typescript
// PRIMA
type StatoPreventivo = 'BOZZA' | 'INVIATO' | 'CONFERMATO';

// DOPO
type QuoteStatus = 'DRAFT' | 'SENT' | 'CONFIRMED';
```

### Step 6: Test
```bash
npm test
npm run test:e2e
```

---

## 📅 Cronoprogramma Giornaliero

### Giorno 1: Gruppo A1-A4 (Stati Base)
- [ ] StatoPreventivo → QuoteStatus
- [ ] StatoAmbulatorio → ClinicRoomStatus
- [ ] StatoPoliambulatorio → ClinicStatus
- [ ] StatoStrumento → EquipmentStatus

### Giorno 2: Gruppo A5-A8 (Stati Operativi)
- [ ] StatoManutenzione → MaintenanceStatus
- [ ] StatoAppuntamento → AppointmentStatus
- [ ] StatoVisita → VisitStatus
- [ ] StatoReferto → ReportStatus

### Giorno 3: Gruppo A9-A13 (Stati Rimanenti)
- [ ] StatoFatturaSanitaria → MedicalInvoiceStatus
- [ ] StatoRiconoscimento → RecognitionStatus
- [ ] StatoAssenza → AbsenceStatus
- [ ] StatoChiamata → CallStatus
- [ ] StatoFirma → SignatureStatus

### Giorno 4: Gruppo B1-B11 (Tipi Prima Metà)
- [ ] TipoSconto → DiscountType
- [ ] TipoCompensoMedico → DoctorCompensationType
- [ ] TipoPrestazione → ServiceType
- [ ] TipoManutenzione → MaintenanceType
- [ ] TipoDocumentoClinico → ClinicalDocumentType
- [ ] TipoDocumentoPersonale → PersonalDocumentType
- [ ] TipoConvenzione → AgreementType
- [ ] TipoRiconoscimento → RecognitionType
- [ ] TipoTariffario → PriceListType
- [ ] TipoVoceTariffario → PriceListItemType
- [ ] TipoChiusuraSpeciale → SpecialClosureType

### Giorno 5: Gruppo B12-B22 (Tipi Seconda Metà)
- [ ] TipoAssenza → AbsenceType
- [ ] TipoCorsoSconto → CourseDiscountType
- [ ] TipoServizio → ServiceCategory
- [ ] TipoPrezzo → PriceType
- [ ] TipologiaStrumento → EquipmentCategory
- [ ] ApplicabilitaSconto → DiscountApplicability
- [ ] ClienteType → CustomerType
- [ ] FrequenzaTariffario → PriceListFrequency
- [ ] PrioritaChiamata → CallPriority

---

## ✅ Checklist Verifica Fase 2

- [ ] Tutti gli enum convertiti in inglese
- [ ] Tutti i @map configurati per backward compatibility
- [ ] Schema Prisma valido (`npx prisma validate`)
- [ ] Client Prisma generato (`npx prisma generate`)
- [ ] Nessun errore TypeScript
- [ ] Tutti i test unitari passano
- [ ] Tutti i test E2E passano
- [ ] API endpoints funzionanti

---

## 🚨 Rollback Plan

Se qualcosa va storto:

```bash
# 1. Restore schema da backup
git checkout HEAD~1 -- backend/prisma/schema.prisma

# 2. Rigenerare client
cd backend && npx prisma generate

# 3. Restore database se necessario
psql -h localhost -U postgres -d element_medica < backup_pre_optimization.sql
```

---

*Documento Fase 2 - Progetto 46 - 29/12/2025*
