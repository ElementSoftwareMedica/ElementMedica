# 💰 SPEC_06: Listini, Prezzi e Convenzioni

**Versione**: 1.0  
**Ultimo aggiornamento**: 2025-12-11  
**Collegato a**: [SPEC_03_PRESTAZIONI.md](./SPEC_03_PRESTAZIONI.md), [SPEC_07_APPUNTAMENTI.md](./SPEC_07_APPUNTAMENTI.md)

---

## 1. OVERVIEW

Il sistema gestisce prezzi differenziati tramite:
- **Listino Base**: Prezzo standard per ogni prestazione
- **Listini Speciali**: Prezzi per categorie (over 65, bambini, dipendenti)
- **Convenzioni**: Accordi con aziende/assicurazioni
- **Codici Sconto**: Promozioni temporanee

### 1.1 Gerarchia Prezzi (Priorità)

```
1. Codice Sconto attivo          (max priorità)
2. Convenzione paziente
3. Listino speciale applicabile
4. Listino Base                  (default)
```

---

## 2. ENTITÀ DATABASE

### 2.1 Listino Prezzo

```prisma
model ListinoPrezzo {
  id                    String   @id @default(uuid())
  
  // Identificazione
  nome                  String               // "Listino Base", "Over 65"
  codice                String?
  tipo                  TipoListino          @default(BASE)
  descrizione           String?
  
  // Validità
  validoDa              DateTime?
  validoA               DateTime?
  isAttivo              Boolean  @default(true)
  
  // Condizioni applicazione (per listini speciali)
  etaMinima             Int?                 // Es. 65 per Over 65
  etaMassima            Int?                 // Es. 14 per Pediatrico
  condizioni            Json?                // Condizioni custom
  
  // Relazioni
  prezzi                PrezzoPrestazione[]
  convenzioniListino    ConvenzioneListino[]
  
  // Multi-tenancy
  tenantId              String
  tenant                Tenant   @relation(fields: [tenantId], references: [id])
  
  // Timestamps
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  deletedAt             DateTime?
  
  @@unique([tenantId, codice])
  @@index([tenantId])
  @@index([tipo])
  @@index([isAttivo])
}

enum TipoListino {
  BASE                  // Listino standard
  AGEVOLATO             // Over 65, bambini, etc.
  AZIENDALE             // Dipendenti aziende convenzionate
  ASSICURATIVO          // Assicurazioni sanitarie
  INTERNO               // Dipendenti poliambulatorio
  PROMOZIONALE          // Offerte temporanee
}
```

### 2.2 Prezzo Prestazione

```prisma
model PrezzoPrestazione {
  id                    String   @id @default(uuid())
  
  // Relazioni
  listinoId             String
  listino               ListinoPrezzo @relation(fields: [listinoId], references: [id])
  
  prestazioneId         String
  prestazione           Prestazione @relation(fields: [prestazioneId], references: [id])
  
  // Prezzo
  prezzo                Decimal  @db.Decimal(10,2)
  prezzoOriginale       Decimal? @db.Decimal(10,2)  // Per mostrare sconto
  
  // IVA
  aliquotaIva           Decimal  @default(22) @db.Decimal(4,2)
  prezzoIvaInclusa      Boolean  @default(true)
  
  // Validità specifica (override listino)
  validoDa              DateTime?
  validoA               DateTime?
  
  // Multi-tenancy
  tenantId              String
  
  @@unique([listinoId, prestazioneId])
  @@index([tenantId])
  @@index([prestazioneId])
}
```

### 2.3 Convenzione

```prisma
model Convenzione {
  id                    String   @id @default(uuid())
  
  // Identificazione
  nome                  String               // "Azienda XYZ", "Unisalute"
  codice                String?
  tipo                  TipoConvenzione      @default(AZIENDALE)
  descrizione           String?
  
  // Dati ente convenzionato
  ragioneSociale        String?
  partitaIva            String?
  codiceFiscale         String?
  indirizzo             String?
  referenteNome         String?
  referenteEmail        String?
  referenteTelefono     String?
  
  // Validità
  dataInizio            DateTime
  dataFine              DateTime?
  isAttiva              Boolean  @default(true)
  
  // Configurazioni
  richiedeAutorizzazione Boolean @default(false)  // Richiede pre-autorizzazione
  massimaleAnnuo        Decimal? @db.Decimal(10,2) // Tetto spesa
  franchigia            Decimal? @db.Decimal(10,2)
  percentualeRimborso   Float?                     // % coperta da convenzione
  
  // Fatturazione
  modalitaFatturazione  ModalitaFatturazione @default(DIRETTA_PAZIENTE)
  giorniPagamento       Int      @default(30)
  
  // Documentazione
  contrattoUrl          String?
  noteContratto         String?  @db.Text
  
  // Relazioni
  listiniConvenzione    ConvenzioneListino[]
  pazientiConvenzionati PersonConvenzione[]
  
  // Multi-tenancy
  tenantId              String
  tenant                Tenant   @relation(fields: [tenantId], references: [id])
  
  // Timestamps
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  deletedAt             DateTime?
  
  @@unique([tenantId, codice])
  @@index([tenantId])
  @@index([tipo])
  @@index([isAttiva])
}

enum TipoConvenzione {
  AZIENDALE             // Convenzione con azienda
  ASSICURAZIONE         // Polizza sanitaria
  FONDO_SANITARIO       // Fondo integrativo
  SSN                   // Servizio Sanitario Nazionale
  ENTE_PUBBLICO         // Comune, Regione, etc.
  ALTRO
}

enum ModalitaFatturazione {
  DIRETTA_PAZIENTE      // Paziente paga e chiede rimborso
  DIRETTA_ENTE          // Fattura a convenzione
  MISTA                 // Parte paziente, parte ente
}
```

### 2.4 Link Convenzione-Listino

```prisma
model ConvenzioneListino {
  id                    String   @id @default(uuid())
  
  convenzioneId         String
  convenzione           Convenzione @relation(fields: [convenzioneId], references: [id])
  
  listinoId             String
  listino               ListinoPrezzo @relation(fields: [listinoId], references: [id])
  
  // Override prezzi
  scontoPercentuale     Float?               // Sconto aggiuntivo sul listino
  
  // Multi-tenancy
  tenantId              String
  
  @@unique([convenzioneId, listinoId])
  @@index([tenantId])
}
```

### 2.5 Associazione Paziente-Convenzione

```prisma
model PersonConvenzione {
  id                    String   @id @default(uuid())
  
  personaId             String
  persona               Person   @relation("PersonaConvenzioni", fields: [personaId], references: [id])
  
  convenzioneId         String
  convenzione           Convenzione @relation(fields: [convenzioneId], references: [id])
  
  // Dati iscrizione
  numeroTessera         String?
  dataIscrizione        DateTime @default(now())
  dataScadenza          DateTime?
  
  // Massimali personali
  massimaleResiduo      Decimal? @db.Decimal(10,2)
  
  // Multi-tenancy
  tenantId              String
  
  @@unique([personaId, convenzioneId])
  @@index([tenantId])
}
```

### 2.6 Codice Sconto

```prisma
model CodiceScontoClinico {
  id                    String   @id @default(uuid())
  
  // Identificazione
  codice                String               // "ESTATE2024"
  nome                  String?
  descrizione           String?
  
  // Tipo sconto
  tipoSconto            TipoSconto           @default(PERCENTUALE)
  valore                Decimal  @db.Decimal(10,2) // % o importo fisso
  
  // Applicabilità
  prestazioniIds        String[]             // Vuoto = tutte
  minimoOrdine          Decimal? @db.Decimal(10,2)
  
  // Limiti utilizzo
  maxUtilizziTotali     Int?
  maxUtilizziPerPaziente Int     @default(1)
  utilizziEffettuati    Int      @default(0)
  
  // Validità
  validoDa              DateTime
  validoA               DateTime
  isAttivo              Boolean  @default(true)
  
  // Multi-tenancy
  tenantId              String
  tenant                Tenant   @relation(fields: [tenantId], references: [id])
  
  // Timestamps
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  
  @@unique([tenantId, codice])
  @@index([tenantId])
  @@index([isAttivo])
  @@index([validoDa, validoA])
}

enum TipoSconto {
  PERCENTUALE           // Es. 20%
  FISSO                 // Es. €10 di sconto
  PREZZO_FISSO          // Prezzo finale fisso
}
```

---

## 3. ALGORITMO CALCOLO PREZZO

```javascript
async function calcolaPrezzo(prestazioneId, pazienteId, codiceSconto?) {
  // 1. Ottieni prezzo base
  const prezzoBase = await getPrezzoBase(prestazioneId);
  
  // 2. Verifica codice sconto
  if (codiceSconto) {
    const sconto = await verificaCodiceSconto(codiceSconto, prestazioneId, pazienteId);
    if (sconto.isValido) {
      return applicaSconto(prezzoBase, sconto);
    }
  }
  
  // 3. Verifica convenzione paziente
  const convenzione = await getConvenzionePaziente(pazienteId);
  if (convenzione && convenzione.isAttiva) {
    const prezzoConv = await getPrezzoConvenzione(prestazioneId, convenzione.id);
    if (prezzoConv) {
      return {
        prezzo: prezzoConv,
        tipo: 'CONVENZIONE',
        convenzione: convenzione.nome
      };
    }
  }
  
  // 4. Verifica listino speciale (età, etc.)
  const paziente = await getPaziente(pazienteId);
  const listiniSpeciali = await getListiniApplicabili(paziente);
  for (const listino of listiniSpeciali) {
    const prezzoSpeciale = await getPrezzoListino(prestazioneId, listino.id);
    if (prezzoSpeciale) {
      return {
        prezzo: prezzoSpeciale,
        tipo: 'LISTINO_SPECIALE',
        listino: listino.nome
      };
    }
  }
  
  // 5. Ritorna prezzo base
  return {
    prezzo: prezzoBase,
    tipo: 'BASE'
  };
}
```

---

## 4. FUNZIONALITÀ

### 4.1 Gestione Listini
| Azione | Permesso | Note |
|--------|----------|------|
| Visualizza | `VIEW_LISTINI` | - |
| Crea listino | `MANAGE_LISTINI` | Admin |
| Modifica prezzi | `MANAGE_LISTINI` | - |
| Import Excel | `MANAGE_LISTINI` | Bulk update |
| Export | `VIEW_LISTINI` | Excel/CSV |

### 4.2 Gestione Convenzioni
| Azione | Permesso | Note |
|--------|----------|------|
| Lista | `VIEW_CONVENZIONI` | - |
| Crea | `MANAGE_CONVENZIONI` | Admin |
| Modifica | `MANAGE_CONVENZIONI` | - |
| Associa paziente | `MANAGE_PAZIENTI` | - |

### 4.3 Codici Sconto
| Azione | Permesso | Note |
|--------|----------|------|
| Lista | `VIEW_SCONTI` | - |
| Crea | `MANAGE_SCONTI` | Admin |
| Disattiva | `MANAGE_SCONTI` | - |
| Report utilizzo | `VIEW_REPORTS` | - |

---

## 5. API ENDPOINTS

```
# Listini
GET    /api/v1/clinica/listini                         # Lista listini
GET    /api/v1/clinica/listini/:id                     # Dettaglio + prezzi
POST   /api/v1/clinica/listini                         # Crea listino
PUT    /api/v1/clinica/listini/:id                     # Modifica
DELETE /api/v1/clinica/listini/:id                     # Disattiva

# Prezzi
GET    /api/v1/clinica/listini/:id/prezzi              # Prezzi listino
PUT    /api/v1/clinica/listini/:id/prezzi              # Bulk update prezzi
POST   /api/v1/clinica/listini/:id/prezzi/import       # Import Excel

# Convenzioni
GET    /api/v1/clinica/convenzioni                     # Lista
GET    /api/v1/clinica/convenzioni/:id                 # Dettaglio
POST   /api/v1/clinica/convenzioni                     # Crea
PUT    /api/v1/clinica/convenzioni/:id                 # Modifica
DELETE /api/v1/clinica/convenzioni/:id                 # Disattiva

# Pazienti convenzionati
GET    /api/v1/clinica/convenzioni/:id/pazienti        # Lista pazienti
POST   /api/v1/clinica/convenzioni/:id/pazienti        # Associa paziente
DELETE /api/v1/clinica/convenzioni/:id/pazienti/:pazId # Rimuovi

# Codici Sconto
GET    /api/v1/clinica/sconti                          # Lista
POST   /api/v1/clinica/sconti                          # Crea
PUT    /api/v1/clinica/sconti/:id                      # Modifica
DELETE /api/v1/clinica/sconti/:id                      # Disattiva
POST   /api/v1/clinica/sconti/verifica                 # Verifica codice

# Calcolo prezzo
POST   /api/v1/clinica/calcola-prezzo                  # Calcola prezzo finale
       body: { prestazioneId, pazienteId?, codiceSconto? }
```

---

## 6. UI COMPONENTS

### 6.1 Pagine
- `ListiniList.tsx` - Lista listini
- `ListinoDetail.tsx` - Griglia prezzi editable
- `ConvenzioniList.tsx` - Lista convenzioni
- `ConvenzioneForm.tsx` - Crea/modifica
- `ScontiList.tsx` - Lista codici sconto

### 6.2 Widgets
- `PrezzoDisplay.tsx` - Mostra prezzo con eventuale sconto
- `ConvenzionePicker.tsx` - Selezione convenzione
- `CodiceScotoInput.tsx` - Input con verifica
- `ListinoCompare.tsx` - Confronto listini

---

## 7. REGOLE BUSINESS

| ID | Regola |
|----|--------|
| RB-01 | Ogni prestazione deve avere prezzo in listino base |
| RB-02 | Codice sconto monouso per paziente (default) |
| RB-03 | Convenzione scaduta → usa listino base |
| RB-04 | Massimale convenzione esaurito → fattura a paziente |
| RB-05 | Prezzo minimo €0 (gratuito), no prezzi negativi |

---

## 8. COLLEGAMENTI

- **Precedente**: [SPEC_05_AGENDA.md](./SPEC_05_AGENDA.md)
- **Prossimo**: [SPEC_07_APPUNTAMENTI.md](./SPEC_07_APPUNTAMENTI.md)
- **Correlato**: [SPEC_03_PRESTAZIONI.md](./SPEC_03_PRESTAZIONI.md)
- **Workflow**: [WF_05_FATTURAZIONE.md](../workflows/WF_05_FATTURAZIONE.md)
