# P49 - Company Multi-Tenant

**Stato**: ✅ Completato  
**Data**: Dicembre 2025

---

## 📋 Obiettivo

Trasformare l'entità Company da tenant-specific a globale con profili per-tenant.

---

## ✅ Implementazione

### Architettura 3-Layer

```
Company (globale)
    │
    └── CompanyTenantProfile (per-tenant)
            │
            └── CompanySite (sedi operative)
```

### Campi Migrati

| Da Company | A CompanyTenantProfile |
|------------|----------------------|
| referenteId | ✅ |
| pec | ✅ |
| condizioni pagamento | ✅ |
| note commerciali | ✅ |

### Modelli Aggiunti

- `CompanyTenantProfile`
- `CompanyDataShareConsent`

### Relazioni Aggiornate

- `CompanySite.companyTenantProfileId` (non più companyId)
- `PersonTenantProfile.companyTenantProfileId`

---

## 📊 Services

- `CompanyTenantProfileService.js`
- `createCompanyWithProfile()`
- `findOrCreateProfile()`

---

## 🔄 Import Cross-Tenant

Quando si importa un'azienda via CSV che esiste già in un altro tenant:

1. Il backend cerca un `CompanyTenantProfile` per il tenant corrente (nessuno trovato)
2. Cerca la `Company` globalmente per PIVA o Codice Fiscale → TROVATA
3. Chiama `findOrCreateProfile(existingCompany.id, tenantId, profileData)`
4. Crea un nuovo `CompanyTenantProfile` per il tenant corrente ✅
5. I dati globali (ragioneSociale, PIVA, ecc.) sono condivisi; i dati commerciali sono per-tenant

**Frontend**: `useGDPREntityData` usa `TenantModeContext.viewTenantIds` come fonte di verità per il filtro dati. Questo garantisce che la lista mostrata sia sempre coerente con il tenant operativo.

## ⚠️ Architettura Middleware (IMPORTANTE per nuove route)

**Problema noto**: `router.use(validateOperateTenant)` viene eseguito **prima** di `authenticateToken()` per-route. Quando il middleware gira, `req.person` è null → salta tutto → `req.operateTenantId` non viene impostato per le operazioni di scrittura.

**Soluzione**: tutti i route handler di scrittura (POST/PUT/PATCH/DELETE) devono usare:
```javascript
// ✅ CORRETTO: legge X-Operate-Tenant-Id direttamente dall'header, con security check
const tenantId = getEffectiveTenantId(req);

// ❌ SBAGLIATO: req.operateTenantId è undefined per write ops (middleware bug)
const tenantId = req.operateTenantId || person.tenantId;
```

`getEffectiveTenantId` è sicuro:
- Admin con header → usa l'header (`hasCrossTenantAccess = true`)
- Utenti normali → ignora l'header (`hasCrossTenantAccess = false`) → usa `person.tenantId`

