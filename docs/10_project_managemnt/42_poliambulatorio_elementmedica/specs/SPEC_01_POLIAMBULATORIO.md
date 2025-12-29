# 🏥 SPEC_01: Configurazione Poliambulatorio

**Versione**: 1.0  
**Ultimo aggiornamento**: 2025-12-11  
**Collegato a**: [02_FASE_1_DATABASE.md](../02_FASE_1_DATABASE.md), [F1_DATABASE_TASKS.md](../sottofasi/F1_DATABASE_TASKS.md)

---

## 1. OVERVIEW

Il Poliambulatorio è l'entità radice del sistema clinico. Ogni tenant può avere UN SOLO poliambulatorio configurato (relazione 1:1 con Tenant).

### 1.1 Obiettivi
- Configurazione centralizzata struttura sanitaria
- Gestione multi-sede
- Parametri operativi globali
- Branding e personalizzazione

---

## 2. ENTITÀ DATABASE

### 2.1 Modello Poliambulatorio

```prisma
model Poliambulatorio {
  id                    String   @id @default(uuid())
  
  // Dati identificativi
  nome                  String
  ragioneSociale        String?
  partitaIva            String?
  codiceFiscale         String?
  codiceRegionale       String?  // Codice regionale struttura sanitaria
  codiceMinisteriale    String?  // Codice ministeriale
  
  // Contatti principali
  email                 String?
  pec                   String?
  telefono              String?
  fax                   String?
  sitoWeb               String?
  
  // Configurazioni operative
  oraApertura           String   @default("08:00")
  oraChiusura           String   @default("20:00")
  giorniLavorativi      Int[]    @default([1,2,3,4,5]) // 1=Lun, 7=Dom
  durataSlotDefault     Int      @default(30)         // minuti
  tempoBufferAppuntamenti Int    @default(5)          // minuti tra appuntamenti
  maxPrenotazioniGiorno Int?                          // limite giornaliero
  giorniAnticipo        Int      @default(60)         // max giorni prenotazione futura
  
  // Configurazioni notifiche
  reminderSmsOre        Int      @default(24)
  reminderEmailOre      Int      @default(48)
  reminderWhatsappOre   Int?
  
  // Configurazioni fatturazione
  intestazioneFattura   String?  @db.Text
  piedeDocumenti        String?  @db.Text
  iban                  String?
  bic                   String?
  
  // Branding
  logoUrl               String?
  coloriPrimario        String?  @default("#0066CC")
  coloriSecondario      String?  @default("#004499")
  
  // Impostazioni privacy/GDPR
  informativaPrivacy    String?  @db.Text
  consensoMarketing     Boolean  @default(false)
  retentionDataGiorni   Int      @default(3650)  // 10 anni default sanitario
  
  // Multi-tenancy
  tenantId              String   @unique
  tenant                Tenant   @relation(fields: [tenantId], references: [id])
  
  // Relazioni
  sedi                  Sede[]
  
  // Timestamps
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  deletedAt             DateTime?
  
  @@index([tenantId])
}
```

### 2.2 Modello Sede

```prisma
model Sede {
  id                    String   @id @default(uuid())
  
  // Identificazione
  nome                  String
  codice                String?              // Codice interno sede
  isPrincipale          Boolean  @default(false)
  isAttiva              Boolean  @default(true)
  
  // Indirizzo
  indirizzo             String
  civico                String?
  cap                   String
  citta                 String
  provincia             String
  regione               String?
  nazione               String   @default("IT")
  
  // Coordinate (per mappe)
  latitudine            Float?
  longitudine           Float?
  googlePlaceId         String?
  
  // Contatti sede
  telefonoSede          String?
  emailSede             String?
  
  // Orari (override poliambulatorio)
  oraAperturaOverride   String?
  oraChiusuraOverride   String?
  giorniLavorativiOverride Int[]?
  
  // Accessibilità
  accessoDisabili       Boolean  @default(false)
  parcheggio            Boolean  @default(false)
  noteParcheggio        String?
  indicazioniArrivo     String?  @db.Text
  
  // Relazioni
  poliambulatorioId     String
  poliambulatorio       Poliambulatorio @relation(fields: [poliambulatorioId], references: [id])
  ambulatori            Ambulatorio[]
  
  // Multi-tenancy
  tenantId              String
  tenant                Tenant   @relation(fields: [tenantId], references: [id])
  
  // Timestamps
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  deletedAt             DateTime?
  
  @@unique([tenantId, codice])
  @@index([tenantId])
  @@index([poliambulatorioId])
}
```

---

## 3. FUNZIONALITÀ

### 3.1 Setup Iniziale
- Wizard configurazione primo accesso
- Import dati da sistema esistente (CSV/Excel)
- Validazione P.IVA e CF

### 3.2 Gestione Sedi
| Funzione | Permesso | Ruoli |
|----------|----------|-------|
| Visualizza sedi | `VIEW_AMBULATORI` | Tutti |
| Crea sede | `MANAGE_AMBULATORI` | ADMIN, SEGRETERIA_ADMIN |
| Modifica sede | `MANAGE_AMBULATORI` | ADMIN, SEGRETERIA_ADMIN |
| Disattiva sede | `MANAGE_AMBULATORI` | ADMIN |

### 3.3 Configurazioni
- **Orari operativi**: Definizione orari apertura/chiusura
- **Slot booking**: Durata default, buffer tra appuntamenti
- **Limiti**: Max prenotazioni giorno, anticipo max
- **Notifiche**: Timing reminder (SMS, Email, WhatsApp)

---

## 4. API ENDPOINTS

```
GET    /api/v1/clinica/poliambulatorio          # Ottieni config (tenant-scoped)
PUT    /api/v1/clinica/poliambulatorio          # Aggiorna config
POST   /api/v1/clinica/poliambulatorio/setup    # Setup iniziale

GET    /api/v1/clinica/sedi                     # Lista sedi
GET    /api/v1/clinica/sedi/:id                 # Dettaglio sede
POST   /api/v1/clinica/sedi                     # Crea sede
PUT    /api/v1/clinica/sedi/:id                 # Modifica sede
DELETE /api/v1/clinica/sedi/:id                 # Soft delete sede
```

---

## 5. UI COMPONENTS

### 5.1 Pagine
- `PoliambulatorioSettings.tsx` - Form configurazione
- `SediList.tsx` - Lista sedi (GDPR template)
- `SedeForm.tsx` - Crea/modifica sede
- `SedeDetail.tsx` - Dettaglio con mappa

### 5.2 Widgets
- `SedePicker.tsx` - Dropdown selezione sede
- `SedeCard.tsx` - Card informativa sede
- `MappaSedeGoogle.tsx` - Integrazione Google Maps

---

## 6. REGOLE BUSINESS

| Regola | Descrizione |
|--------|-------------|
| RB-01 | Un tenant può avere un solo Poliambulatorio |
| RB-02 | Una sede può essere "principale" (default per nuovi ambulatori) |
| RB-03 | Sede disattivata → ambulatori associati non disponibili |
| RB-04 | Orari sede override orari poliambulatorio se specificati |
| RB-05 | Retention dati minimo 10 anni per normativa sanitaria |

---

## 7. COLLEGAMENTI

- **Prossimo**: [SPEC_02_AMBULATORI.md](./SPEC_02_AMBULATORI.md)
- **Database**: [02_FASE_1_DATABASE.md](../02_FASE_1_DATABASE.md)
- **Task**: [F1_DATABASE_TASKS.md](../sottofasi/F1_DATABASE_TASKS.md) → F1.1
