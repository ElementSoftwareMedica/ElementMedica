# P63 - Codebase Cleanup & Consolidation

**Versione**: 1.0.0  
**Data**: 31 Gennaio 2026  
**Stato**: ✅ COMPLETATO  
**Priorità**: Alta

---

## 📋 Obiettivo

Rimuovere tutto il codice deprecato, legacy e non necessario per ottenere un codebase pulito, scalabile e senza retrocompatibilità inutile.

---

## 🏛️ Architettura Target

### Brand vs Tenant vs Branch (Chiarimento Concettuale)

| Concetto | Funzione | Persistenza |
|----------|----------|-------------|
| **Brand** | Solo UI (logo, colori, menu, features mostrate) | Env var `VITE_BRAND_ID` |
| **Tenant** | Isolamento dati cliente + fatturazione | `PersonTenantProfile.tenantId` |
| **Branch** | Tipo funzionalità abilitata (MEDICA/FORMAZIONE) | `Tenant.enabledBranches[]` |

### Scenario Reale

```
Cliente "Studio Rossi" acquista abbonamento completo:
├── Tenant: studio-rossi (un ID unico)
│   ├── enabledBranches: [MEDICA, FORMAZIONE]
│   └── Dati: tutti nello stesso tenant
│
├── Frontend element-medica.com (:5173)
│   └── UI: colori teal, menu clinica, brand ElementMedica
│
└── Frontend element-sicurezza.com (:5174)
    └── UI: colori blue, menu corsi, brand ElementSicurezza

➡️ I DATI sono SEMPRE dello stesso tenant (studio-rossi)
➡️ Il BRAND determina solo cosa MOSTRARE nella UI
```

### Conseguenza: P62 Brand/Tenant Sync NON Necessario

Il codice P62 assume che `brand.id === tenant.slug`, ma questo è vero SOLO per i tenant di demo (Element Medica/Element Srl). Per clienti reali, il tenant viene dal JWT, non dal brand.

---

## 🗑️ File da Eliminare

### Backend - Script Temporanei (12 file)

| File | Linee | Motivo |
|------|-------|--------|
| `test_dvr_flow.js` | ~100 | Script debug temporaneo |
| `test_dvr_flow2.js` | ~120 | Script debug temporaneo |
| `test_dvr_api.js` | ~85 | Script debug temporaneo |
| `test_dvr_query.js` | ~30 | Script debug temporaneo |
| `test_direct_query.js` | ~70 | Script debug temporaneo |
| `test_admin_tenant.js` | ~25 | Script debug temporaneo |
| `test_companies_response.js` | ~75 | Script debug temporaneo |
| `test_companies_response2.js` | ~55 | Script debug temporaneo |
| `check_tenant.js` | ~20 | Script debug temporaneo |
| `check_tenant.mjs` | ~20 | Script debug temporaneo |
| `check_dvr_sopr.mjs` | ~25 | Script debug temporaneo |
| `fix_dvr_tenant.mjs` | ~15 | Script fix one-time |

**Totale: ~640 linee da rimuovere**

### Frontend - File Legacy (1 file)

| File | Linee | Motivo |
|------|-------|--------|
| `src/services/users.ts` | 57 | File wrapper deprecato, nessun import lo usa |

---

## 🔧 Codice da Modificare

### 1. Rimuovere P62 Brand/Tenant Sync

**File**: `src/contexts/TenantModeContext.tsx`

Rimuovere:
- `brandTenant` computed
- `syncWithBrand` function
- Auto-sync effect basato su `brand.id === tenant.slug`
- Warning message per brand mismatch

**File**: `src/components/shared/TenantModeSelector.tsx`

Rimuovere:
- `hasBrandMismatch` check
- Pulsante "Sync con [Tenant]"

### 2. Rimuovere Metodo Deprecated clone()

**File**: `src/services/tariffarioAziendaleApi.ts` (linee ~743-758)

Rimuovere il metodo `clone()` deprecato che reindirizza a `associate()`.

### 3. Rimozione Person.tenantId ✅ COMPLETATO

Il campo `Person.tenantId` è stato **RIMOSSO** dallo schema Prisma:
- ✅ Rimosso da `Person` model
- ✅ Rimossa relazione `Tenant` da Person
- ✅ Rimossa relazione inversa `persons` da Tenant
- ✅ Aggiornati middleware auth per usare `PersonTenantProfile.tenantId`
- ✅ Aggiornati test E2E per usare `PersonTenantProfile`
- ✅ `req.person.tenantId` funziona ancora (popolato dal middleware)

---

## 📋 Checklist Esecuzione

### Fase 1: Eliminazione Script Temporanei ✅

- [x] Eliminare 12 file di test/check/fix nel backend root
- [x] Verificare che tests ufficiali in `backend/tests/` funzionino

### Fase 2: Eliminazione File Legacy ✅

- [x] Eliminare `src/services/users.ts`
- [x] Verificare che nessun file lo importi

### Fase 3: Rimozione P62 Brand/Tenant Sync ✅

- [x] Rimuovere `brandTenant` e `syncWithBrand` da TenantModeContext
- [x] Rimuovere effect auto-sync
- [x] Rimuovere warning brand mismatch
- [x] Rimuovere pulsante sync da TenantModeSelector
- [x] Aggiornare documentazione MULTI_TENANT.md

### Fase 4: Rimozione Metodi Deprecated ✅

- [x] Rimuovere `clone()` da tariffarioAziendaleApi.ts
- [x] Rimuovere `CloneTariffarioPayload` interface
- [x] Verificare che nessun codice lo chiami

### Fase 5: Aggiornamento Documentazione ✅

- [x] Creare P63_CODEBASE_CLEANUP.md
- [x] Aggiornare MULTI_TENANT.md (v3.0.0)

---

## 📊 Metriche

| Metrica | Prima | Dopo | Riduzione |
|---------|-------|------|-----------|
| File backend root | 85+ | 73 | -12 |
| Linee codice debug | ~640 | 0 | -640 |
| Complessità TenantMode | Alta | Media | -30% |
| Warning runtime | ~5/sessione | 0 | -100% |

---

## ⚠️ Rischi e Mitigazioni

| Rischio | Probabilità | Mitigazione |
|---------|-------------|-------------|
| Break funzionalità tenant | Bassa | Test E2E dopo ogni modifica |
| Utenti confusi senza sync button | Bassa | Il tenant viene sempre dal JWT |
| Script debug necessari in futuro | Media | Documentare come ricrearli |

---

## 📝 Note

### Person.tenantId - ✅ RIMOSSO

**Il campo `Person.tenantId` è stato RIMOSSO** dallo schema Prisma in questo progetto.

**Modifiche applicate:**
1. ✅ Rimosso `Person.tenantId` e relazione `Tenant` da schema.prisma
2. ✅ Rimosso `persons` relazione inversa da `Tenant` model
3. ✅ Aggiornato middleware `auth.js` per usare solo `PersonTenantProfile.tenantId`
4. ✅ Aggiornato middleware `auth-advanced.js` 
5. ✅ Aggiornato middleware `tenant.js` e `tenantMode.js`
6. ✅ Aggiornato `jwt.js` per non usare più `user.tenantId`
7. ✅ Aggiornati test E2E per usare `PersonTenantProfile`
8. ✅ Eseguito `prisma generate` con successo
9. ✅ Aggiornato `auth/middleware.js` (middleware alternativo)
10. ✅ Aggiornato `auth/routes.js` (login endpoint)
11. ✅ Aggiornato `routes/v1/auth/authentication.js`
12. ✅ Aggiornato `routes/v1/auth/user-info.js`
13. ✅ Aggiornato `auth/middleware-debug.js`
14. ✅ Aggiornato `services/notifications/NotificationService.js`
15. ✅ Aggiornato `services/virtualEntityPermissions.js`
16. ✅ Aggiornato `services/PersonTenantAccessService.js`
17. ✅ Eliminato script obsoleto `migrate-to-person-unified.js`
18. ✅ **2026-01-31**: Fixato `auth/middleware.js` - rimosso `tenantId: true` dal select su Person
19. ✅ **2026-01-31**: Fixato `routes/gdpr/data-deletion.js` - query tenant da PersonTenantProfile
20. ✅ **2026-01-31**: Fixato `services/tenantService.js` - `getTenantStats()` usa PersonTenantProfile
21. ✅ **2026-01-31**: Fixato `authentication.js` - corretto `primaryProfile is not defined`
22. ✅ **2026-01-31**: Fixato `services/advanced-permission.js` - rimosso `tenantId: true` dal select su Person (causava 403 su tutte le API protette)
23. ✅ **2026-01-31**: Fixato `services/tenantService.js` - `getTenantById()` rimosso `persons: true` (Tenant.persons relazione RIMOSSA), usa `personProfiles`
24. ✅ **2026-01-31**: Fixato `routes/v1/permissions.js` - rimosso Person.tenantId, filtro via tenantProfiles
25. ✅ **2026-01-31**: Fixato `routes/roles/analytics.js` - rimosso Person.tenantId, count via PersonTenantProfile
26. ✅ **2026-01-31**: Fixato `routes/roles/assignment.js` - rimosso Person.tenantId, filtro via tenantProfiles
27. ✅ **2026-01-31**: Fixato `services/virtualEntityPermissions.js` - rimosso Person.tenantId, filtro via tenantProfiles
28. ✅ **2026-01-31**: Fixato `services/notifications/NotificationEscalationService.js` - rimosso Person.tenantId da 6 query WHERE, filtro solo via tenantProfiles

**Come funziona ora:**
- Il tenant viene SEMPRE determinato da `PersonTenantProfile.tenantId`
- Il middleware auth popola `req.person.tenantId` dal profilo primario
- Tutti i file che usano `req.person.tenantId` continuano a funzionare
- I test usano `PersonTenantProfile` per trovare persone per tenant
- Query su `Tenant` usano `personProfiles` invece di `persons`
- Query su `Person` usano `tenantProfiles.some({ tenantId })` invece di `Person.tenantId`

### Brand come Pure UI

Il brand (`VITE_BRAND_ID`) deve determinare SOLO:
- Logo, favicon, colori
- Menu items visibili
- Features mostrate (non abilitate - quello è Branch)
- Testi, SEO

Il brand NON deve determinare:
- Tenant per CRUD
- Permessi
- Dati accessibili

---

*Documento aggiornato: 31 Gennaio 2026*
