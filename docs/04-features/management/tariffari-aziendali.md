# Tariffari Aziendali - Sistema M2M

## Panoramica

I tariffari aziendali sono strutture dati che definiscono prezzi e condizioni per i servizi di Medicina del Lavoro offerti alle aziende clienti.

**P59 Sprint 11**: Migrazione da pattern "clone" a Many-to-Many (M2M) con pivot table.
**P59 Sprint 11.1**: Spostamento del successore dall'entità tariffario all'associazione.

## Architettura

### Schema Entità

```
┌─────────────────────────┐     ┌──────────────────────────────────┐     ┌─────────────────────────────┐
│   TariffarioAziendale   │     │  TariffarioCompanyAssociation    │     │    CompanyTenantProfile     │
├─────────────────────────┤     ├──────────────────────────────────┤     ├─────────────────────────────┤
│ id                      │←─M──│ tariffarioId                     │──M─→│ id                          │
│ codice (unique/tenant)  │     │ companyTenantProfileId           │     │ companyId                   │
│ nome                    │     │ validoDa                         │     │ status                      │
│ descrizione             │     │ validoA                          │     │ ...                         │
│ validoDa                │     │ attivo                           │     └─────────────────────────────┘
│ validoA                 │     │ note                             │
│ attivo                  │     │ tenantId                         │
│ convenzioneId           │     │                                  │
│ note                    │     │ --- P59 Sprint 11.1 ---          │
│ tenantId                │     │ successoreAssociationId ◇───┐    │
│ voci[] ─────────────────│─┐   │ successoreAssociation    ←──┘    │
│ ...                     │ │   │ predecessoreAssociation          │
└─────────────────────────┘ │   └──────────────────────────────────┘
                            │
                            │   ┌─────────────────────────┐
                            └──→│   VoceTariffarioMDL     │
                                ├─────────────────────────┤
                                │ tipo (PRESTAZIONE, etc) │
                                │ prestazioneId           │
                                │ prezzoBase              │
                                │ frequenza               │
                                │ ...                     │
                                └─────────────────────────┘
```

### Relazione Many-to-Many

Il modello M2M permette di:

1. **Condividere tariffari** tra multiple aziende senza duplicazione
2. **Personalizzare associazioni** con date di validità e note per ogni azienda
3. **Gestire successori separatamente** per ogni associazione (P59 Sprint 11.1)

### Successore su Associazione (P59 Sprint 11.1)

**Problema precedente**: Il `successoreId` era sul `TariffarioAziendale`, significando che tutte le aziende che usavano quel tariffario sarebbero passate allo stesso successore.

**Soluzione**: `successoreAssociationId` è ora sulla `TariffarioCompanyAssociation`, permettendo che:
- Azienda A usando Tariffario X passa a Tariffario Y
- Azienda B usando Tariffario X passa a Tariffario Z

```prisma
model TariffarioCompanyAssociation {
  id                      String  @id @default(cuid())
  tariffarioId            String
  companyTenantProfileId  String
  validoDa                DateTime
  validoA                 DateTime?
  attivo                  Boolean @default(true)
  note                    String?
  tenantId                String
  
  // P59 Sprint 11.1: Successore specifico per questa azienda
  successoreAssociationId String?                       @unique
  successoreAssociation   TariffarioCompanyAssociation? @relation("AssociationSuccessore", fields: [successoreAssociationId], references: [id], onDelete: SetNull)
  predecessoreAssociation TariffarioCompanyAssociation? @relation("AssociationSuccessore")
  
  tariffario            TariffarioAziendale    @relation(...)
  companyTenantProfile  CompanyTenantProfile   @relation(...)
  tenant                Tenant                 @relation(...)
  
  @@unique([tariffarioId, companyTenantProfileId])
  @@index([tenantId])
  @@index([companyTenantProfileId])
}
```

## API Endpoints

### Tariffari CRUD

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| GET | `/api/v1/tariffari-aziendali` | Lista tariffari (con filtri) |
| GET | `/api/v1/tariffari-aziendali/:id` | Dettaglio tariffario |
| POST | `/api/v1/tariffari-aziendali` | Crea nuovo tariffario |
| PUT | `/api/v1/tariffari-aziendali/:id` | Aggiorna tariffario |
| DELETE | `/api/v1/tariffari-aziendali/:id` | Elimina tariffario (soft delete) |

### Associazioni M2M

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| POST | `/api/v1/tariffari-aziendali/:id/associate` | Associa tariffario ad azienda |
| DELETE | `/api/v1/tariffari-aziendali/:id/dissociate/:companyTenantProfileId` | Rimuove associazione |
| GET | `/api/v1/tariffari-aziendali/:id/companies` | Lista aziende associate |
| **PATCH** | `/api/v1/tariffari-aziendali/associations/:associationId` | **Aggiorna associazione (include successore)** |

### Esempio: Aggiornare Associazione con Successore

```javascript
// PATCH /api/v1/tariffari-aziendali/associations/clpx123...
{
  "validoA": "2024-12-31",
  "note": "Scade a fine anno",
  "successoreAssociationId": "clpx456..."  // ID dell'associazione successore
}

// Response
{
  "success": true,
  "data": {
    "id": "clpx123...",
    "validoA": "2024-12-31T00:00:00.000Z",
    "successoreAssociationId": "clpx456...",
    "successoreAssociation": {
      "id": "clpx456...",
      "tariffario": {
        "id": "...",
        "codice": "TAR-2025",
        "nome": "Tariffario 2025",
        "validoDa": "2025-01-01"
      }
    }
  },
  "message": "Associazione aggiornata con successo"
}
```

## Service Backend

### TariffarioAziendaleService

Metodi principali:

```javascript
// CRUD
getAll(tenantIds, filters)
getById(id, tenantId)
create(data, tenantId)
update(id, data, tenantId)
delete(id, tenantId)

// M2M Associations
associate(tariffarioId, companyTenantProfileId, tenantId, data)
dissociate(tariffarioId, companyTenantProfileId, tenantId)
getByCompanyProfile(companyTenantProfileId, tenantId)  // Include successore
getAssociatedCompanies(tariffarioId, tenantId)
updateAssociation(associationId, tenantId, data)  // P59 Sprint 11.1

// Voci
addVoce(tariffarioId, data, tenantId)
updateVoce(tariffarioId, voceId, data, tenantId)
deleteVoce(tariffarioId, voceId, tenantId)
```

## Frontend

### API Client

```typescript
// src/services/tariffarioAziendaleApi.ts

// Ottieni tariffari per azienda (P59 Sprint 11.2)
async getByCompany(companyId: string): Promise<{ success: boolean; data: TariffarioAziendaleListItem[] }> {
    return apiGet(`/api/v1/companies/${companyId}/tariffari`);
}

// Aggiorna associazione con successore
async updateAssociation(
    associationId: string,
    data: UpdateTariffarioAssociationPayload
): Promise<{ success: boolean; data: TariffarioCompanyAssociation }> {
    return apiPatch(`${BASE_URL}/associations/${associationId}`, data);
}

interface UpdateTariffarioAssociationPayload {
    validoDa?: string;
    validoA?: string | null;
    attivo?: boolean;
    note?: string | null;
    successoreAssociationId?: string | null;  // P59 Sprint 11.1
}

interface TariffarioCompanyAssociation {
    id: string;
    tariffarioId: string;
    companyTenantProfileId: string;
    validoDa: string;
    validoA?: string | null;
    attivo: boolean;
    note?: string | null;
    // P59 Sprint 11.1: Successore specifico
    successoreAssociationId?: string | null;
    successoreAssociation?: {
        id: string;
        tariffario?: { id: string; codice: string; nome: string; validoDa: string };
    } | null;
    predecessoreAssociation?: {
        id: string;
        tariffario?: { id: string; codice: string; nome: string; validoA: string };
    } | null;
    // ...
}
```

## Test E2E

Suite di test completa in `tests/e2e/tariffari-aziendali.spec.ts`:

- ✅ Lista e Filtri (3 test)
- ✅ CRUD (3 test)
- ✅ Associazioni M2M (3 test)
- ✅ Voci Tariffario (2 test)
- ✅ Successore su Association (2 test)
- ✅ API Integration (3 test)
- ✅ Error Handling (2 test)

**Totale: 18 test**

## Changelog

### P59 Sprint 11.2 (Corrente)
- **Bug Fix**: Rimosso metodo legacy `getByCompanyProfile` duplicato che sovrascriveva implementazione M2M
- **Bug Fix**: Corretto `_count.tariffariDerivati` → `_count.companyAssociations` nel service
- **Frontend**: Aggiunto metodo `getByCompany` a `tariffariAziendaliApi` per fetch tariffari per azienda
- **Frontend**: Fixato prop `CRUDButton` da `action` a `operation` in `TariffariAziendaSection`
- **Frontend**: Integrato `QuickActionTariffarioModal` in `CompanyDetails` per associazione tariffari

### P59 Sprint 11.1
- Spostato `successoreId` da `TariffarioAziendale` a `TariffarioCompanyAssociation`
- Nuovo endpoint PATCH `/associations/:id` per aggiornare associazioni
- Test E2E completi (18 test)

### P59 Sprint 11
- Migrazione da pattern clone a M2M
- Nuovo modello `TariffarioCompanyAssociation`
- Endpoint `associate` e `dissociate`
- Rimosso campo `tipo` (BASE/AZIENDALE)
