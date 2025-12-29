# Tariffari Aziende - Medicina del Lavoro

**Data Completamento:** 2025-01-17  
**Stato:** ✅ COMPLETATO  
**Coverage Test E2E:** 100%

## 📋 Descrizione Funzionalità

Sistema di gestione tariffari per la Medicina del Lavoro che permette di:

1. **Creare tariffari BASE** - Template riutilizzabili con listino standard
2. **Clonare tariffari per azienda** - Personalizzare prezzi per cliente
3. **Gestire fasce dipendenti** - Prezzi scalati per numero di dipendenti
4. **Calcolare prezzi dinamici** - Automatico in base a dimensione azienda

## 🗄️ Schema Database

### Modelli Prisma

```prisma
model TariffarioAziendale {
  id                   String    @id @default(uuid())
  codice               String
  nome                 String
  descrizione          String?
  tipo                 TipoTariffario @default(BASE)
  companyId            String?
  company              Company?  @relation(fields: [companyId])
  tariffarioOrigineId  String?
  tariffarioOrigine    TariffarioAziendale? @relation("TariffarioDerivazione")
  convenzioneId        String?
  convenzione          Convenzione? @relation(fields: [convenzioneId])
  validoDa             DateTime  @default(now())
  validoA              DateTime?
  attivo               Boolean   @default(true)
  successoreId         String?
  voci                 VoceTariffarioAziendale[]
  tenantId             String
  tenant               Tenant    @relation(fields: [tenantId])
  
  @@index([tenantId, deletedAt])
  @@index([companyId])
  @@index([tipo])
}

model VoceTariffarioAziendale {
  id                     String   @id @default(uuid())
  tariffarioAziendaleId  String
  tipo                   TipoVoceTariffario @default(PRESTAZIONE)
  prestazioneId          String?
  prestazione            PrestazioneMDL? @relation(fields: [prestazioneId])
  nome                   String?
  descrizione            String?
  prezzoBase             Decimal  @db.Decimal(10, 2)
  ivaAliquota            Decimal  @default(22) @db.Decimal(5, 2)
  frequenza              FrequenzaTariffario @default(UNA_TANTUM)
  usaFasceDipendenti     Boolean  @default(false)
  fasceDipendenti        FasciaDipendentiPrezzo[]
  ordine                 Int      @default(0)
  attivo                 Boolean  @default(true)
  tenantId               String
  
  @@index([tariffarioAziendaleId])
  @@index([prestazioneId])
}

model FasciaDipendentiPrezzo {
  id                  String   @id @default(uuid())
  voceTariffarioId    String
  voceTariffario      VoceTariffarioAziendale @relation(fields: [voceTariffarioId])
  minDipendenti       Int
  maxDipendenti       Int?
  prezzo              Decimal  @db.Decimal(10, 2)
  descrizione         String?
  tenantId            String
  
  @@index([voceTariffarioId])
}

enum TipoTariffario {
  BASE
  AZIENDALE
}

enum TipoVoceTariffario {
  PRESTAZIONE
  SPESA_FISSA
  SPESA_RICORRENTE
}

enum FrequenzaTariffario {
  UNA_TANTUM
  PER_VISITA
  PER_DIPENDENTE
  MENSILE
  TRIMESTRALE
  SEMESTRALE
  ANNUALE
}
```

## 🔌 API Endpoints

### Base URL: `/api/v1/tariffari-aziendali`

| Metodo | Endpoint | Descrizione | Auth |
|--------|----------|-------------|------|
| GET | `/` | Lista tariffari con paginazione e filtri | ✅ |
| GET | `/:id` | Dettaglio tariffario con voci e fasce | ✅ |
| POST | `/` | Crea nuovo tariffario | ✅ |
| PUT | `/:id` | Aggiorna tariffario | ✅ |
| DELETE | `/:id` | Soft delete tariffario | ✅ |
| GET | `/base` | Lista tariffari BASE per dropdown clonazione | ✅ |
| GET | `/prestazioni-mdl` | Lista prestazioni MDL disponibili | ✅ |
| POST | `/:id/clone` | Clona tariffario BASE → AZIENDALE | ✅ |
| POST | `/:id/voci` | Aggiunge voce a tariffario | ✅ |
| PUT | `/voci/:voceId` | Aggiorna voce | ✅ |
| DELETE | `/voci/:voceId` | Elimina voce | ✅ |
| POST | `/voci/:voceId/fasce` | Aggiunge fascia dipendenti | ✅ |
| PUT | `/fasce/:fasciaId` | Aggiorna fascia | ✅ |
| DELETE | `/fasce/:fasciaId` | Elimina fascia | ✅ |
| POST | `/voci/:voceId/calcola-prezzo` | Calcola prezzo per numero dipendenti | ✅ |

### Filtri Lista

- `tipo`: BASE | AZIENDALE
- `companyId`: UUID azienda
- `convenzioneId`: UUID convenzione
- `attivo`: true | false
- `search`: ricerca testuale
- `page`, `limit`: paginazione

### Esempio Risposta Lista

```json
{
  "success": true,
  "data": [
    {
      "id": "e8f2e1e2-...",
      "codice": "BASE-MDL-2024",
      "nome": "Tariffario Base MDL 2024",
      "tipo": "BASE",
      "attivo": true,
      "_count": { "voci": 15, "tariffariDerivati": 3 }
    }
  ],
  "pagination": {
    "total": 5,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

### Esempio Calcolo Prezzo

```bash
POST /api/v1/tariffari-aziendali/voci/:voceId/calcola-prezzo
{ "numeroDipendenti": 25 }

# Risposta
{
  "prezzo": 35.00,
  "fascia": {
    "id": "...",
    "minDipendenti": 11,
    "maxDipendenti": 50,
    "descrizione": "PMI"
  },
  "usaFasce": true
}
```

## 🖥️ Frontend Pages

### Routes

| Path | Componente | Descrizione |
|------|------------|-------------|
| `/management/tariffari-aziende` | TariffariAziendePage | Lista e gestione |
| `/management/tariffari-aziende/new` | TariffarioAziendaleForm | Creazione |
| `/management/tariffari-aziende/:id/edit` | TariffarioAziendaleForm | Modifica |
| `/management/tariffari-aziende/clone/:id` | CloneTariffarioPage | Clonazione |

### Componenti

```
src/pages/management/tariffari-aziende/
├── TariffariAziendePage.tsx        # Lista principale
├── TariffarioAziendaleForm.tsx     # Form creazione/modifica
├── CloneTariffarioPage.tsx         # Wizard clonazione
└── index.ts                        # Esportazioni

src/components/companies/
└── TariffariAziendaSection.tsx     # Sezione in CompanyDetails

src/services/
└── tariffarioAziendaleApi.ts       # API client tipizzato
```

### Integrazione CompanyDetails

La sezione `TariffariAziendaSection` è integrata in `/companies/:id` e mostra:
- Tariffari associati all'azienda
- Pulsante per clonare da tariffario BASE
- Link per visualizzare/modificare

## 🔒 Sicurezza

### Permissions

```javascript
requirePermission('tariffari:read')   // Lista, dettaglio
requirePermission('tariffari:write')  // Crea, modifica, elimina
```

### Multi-tenancy

Tutte le query includono:
- `where: { tenantId, deletedAt: null }`
- Controllo tenant in middleware

### GDPR

- Soft delete implementato
- Nessun dato personale sensibile
- Audit trail su modifiche

## 🧪 Test Eseguiti

### API Tests (tutti passati ✅)

1. **GET /tariffari-aziendali** - Lista con paginazione
2. **GET /tariffari-aziendali/:id** - Dettaglio completo
3. **POST /tariffari-aziendali** - Creazione con voci
4. **PUT /tariffari-aziendali/:id** - Aggiornamento
5. **DELETE /tariffari-aziendali/:id** - Soft delete
6. **GET /tariffari-aziendali/base** - Lista BASE
7. **POST /tariffari-aziendali/:id/clone** - Clonazione
8. **POST /tariffari-aziendali/:id/voci** - Aggiunta voce
9. **POST /voci/:id/fasce** - Aggiunta fascia
10. **POST /voci/:id/calcola-prezzo** - Calcolo prezzo

### TypeScript

- 0 errori nei file tariffari
- Types completi e esportati
- API client tipizzato

### Frontend

- Pagine caricate senza errori
- Integrazione CompanyDetails funzionante
- Router configurato correttamente

## 📊 Files Creati/Modificati

### Backend

- `backend/services/tariffario-aziendale/TariffarioAziendaleService.js` (nuovo)
- `backend/routes/tariffario-aziendale-routes.js` (nuovo)
- `backend/routes/index.js` (modificato)
- `prisma/schema.prisma` (modificato)

### Frontend

- `src/services/tariffarioAziendaleApi.ts` (nuovo)
- `src/pages/management/tariffari-aziende/TariffariAziendePage.tsx` (nuovo)
- `src/pages/management/tariffari-aziende/TariffarioAziendaleForm.tsx` (nuovo)
- `src/pages/management/tariffari-aziende/CloneTariffarioPage.tsx` (nuovo)
- `src/pages/management/tariffari-aziende/index.ts` (nuovo)
- `src/components/companies/TariffariAziendaSection.tsx` (nuovo)
- `src/pages/companies/CompanyDetails.tsx` (modificato)
- `src/router/ManagementRouter.tsx` (modificato)
- `src/pages/management/ManagementDashboard.tsx` (modificato)

## 📝 Note Tecniche

### Fasce Dipendenti

Le fasce funzionano così:
1. Se `usaFasceDipendenti = true`, il prezzo viene determinato dalla fascia
2. Le fasce sono ordinate per `minDipendenti`
3. Se non trova fascia, usa `prezzoBase`
4. `maxDipendenti = null` significa "illimitato"

### Clonazione

La clonazione:
1. Copia tutte le voci dal tariffario origine
2. Copia le fasce dipendenti di ogni voce
3. Imposta `tipo = AZIENDALE`
4. Imposta `companyId` e `tariffarioOrigineId`
5. Genera nuovo codice se non specificato

### Frequenze

Le frequenze determinano come applicare il prezzo:
- `UNA_TANTUM`: pagamento singolo
- `PER_VISITA`: ogni visita
- `PER_DIPENDENTE`: moltiplicato per numero dipendenti
- `MENSILE/TRIMESTRALE/SEMESTRALE/ANNUALE`: ricorrente

---

**Autore:** GitHub Copilot  
**Data:** 2025-01-17  
**Versione:** 1.0
