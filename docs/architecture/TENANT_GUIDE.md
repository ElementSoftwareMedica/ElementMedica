# 🏢 Guida Multi-Tenancy - ElementMedica/Formazione

## 📚 Cos'è un Tenant?

Un **tenant** è come un "contenitore isolato" per i dati di un'organizzazione. Immagina un palazzo con tanti appartamenti: ogni appartamento (tenant) ha le sue stanze, i suoi mobili e le sue chiavi, ma condividono tutti lo stesso edificio (database).

### Analogia Semplice
```
🏢 DATABASE UNICO (Palazzo)
├── 🏠 Tenant "Element Formazione" (Appartamento A)
│   ├── 👥 Dipendenti
│   ├── 📚 Corsi
│   └── 📋 Schedules
│
├── 🏥 Tenant "Element Medica" (Appartamento B)
│   ├── 👨‍⚕️ Medici
│   ├── 🏥 Poliambulatori
│   └── 📅 Appuntamenti
│
└── 🏢 Tenant "Default Company" (Appartamento Admin)
    └── 👤 Admin globale
```

## 🔐 Come Funziona Attualmente

### 1. Struttura Database
Ogni entità ha un campo `tenantId`:
```sql
-- Esempio: Tabella Persons
CREATE TABLE persons (
    id UUID PRIMARY KEY,
    email VARCHAR,
    firstName VARCHAR,
    tenantId UUID REFERENCES tenants(id),  -- 👈 Isolamento tenant
    ...
);

-- Ogni query DEVE filtrare per tenantId
SELECT * FROM persons WHERE tenantId = 'xxx' AND deletedAt IS NULL;
```

### 2. Mapping Brand → Tenant
```javascript
// backend/middleware/brandDetection.js
const BRAND_CONFIGS = {
  'element-formazione': {
    tenantId: 'd2bbc5b0-344c-47c7-8ef5-f57755293372',  // Tenant Formazione
    allowedFeatures: ['medicinaLavoro', 'corsiFormazione', 'rspp']
  },
  'element-medica': {
    tenantId: '2996a1a3-e148-42a6-9059-eddd7543f094',  // Tenant Medica
    allowedFeatures: ['medicinaLavoro', 'poliambulatorio']
  }
};
```

### 3. Flusso di una Richiesta
```
Frontend (5174 - ElementMedica)
    │
    │ Header: X-Frontend-Id: element-medica
    ▼
Vite Proxy → Backend (4001)
    │
    │ brandDetection middleware
    │ req.brandTenantId = '2996a1a3-...'
    ▼
API Route
    │
    │ getEffectiveTenantId(req)
    │   → Ritorna il tenant corretto
    ▼
Database Query
    WHERE tenantId = '2996a1a3-...'
```

## 🔄 Il Problema Attuale

### Situazione
1. **Admin** (`admin@example.com`) esiste nel tenant **Default Company**
2. Quando accedi da **5174** (ElementMedica), il sistema cerca dati nel tenant **ElementMedica**
3. Ma l'admin non ha PersonRole in quel tenant

### Soluzione Proposta (Non ancora implementata)

#### Opzione A: Admin Multi-Tenant (Consigliata)
Gli utenti con `globalRole = 'ADMIN'` possono operare su TUTTI i tenant:
```javascript
// getEffectiveTenantId
function getEffectiveTenantId(req) {
  // Se l'utente è ADMIN, usa il tenant del brand
  if (req.person?.globalRole === 'ADMIN') {
    return req.brandTenantId || req.person.tenantId;
  }
  // Altrimenti usa il tenant dell'utente
  return req.person?.tenantId;
}
```

#### Opzione B: PersonRole Cross-Tenant
Creare un PersonRole per l'admin in ogni tenant:
```sql
INSERT INTO person_roles (personId, tenantId, roleType)
VALUES 
  ('admin-uuid', 'element-formazione-uuid', 'ADMIN'),
  ('admin-uuid', 'element-medica-uuid', 'ADMIN');
```

## 🎯 Tua Richiesta Futura

### Database Condiviso con Dati Isolati
```
🗄️ DATABASE UNICO
├── Cliente A (Tenant A)
│   └── Vede solo i suoi dati
│
├── Cliente B (Tenant B)
│   └── Vede solo i suoi dati
│
└── Entità Condivise (es. Pazienti)
    ├── Se CF esiste già → Link cross-tenant
    └── Ogni tenant vede i SUOI dati collegati
```

### Esempio: Paziente Cross-Tenant
```
Paziente Mario Rossi (CF: RSSMRA80A01H501Z)
├── Creato da Tenant A (Formazione)
│   └── Schedule, Corsi, Attestati
│
└── Collegato a Tenant B (Medica)
    └── Visite, Referti, Appuntamenti

Tenant A vede: Schedules di Mario
Tenant B vede: Visite di Mario
Entrambi vedono: Dati anagrafici (se autorizzato)
```

## 📋 Tabella Tenant Attuali

| ID | Nome | Slug | Descrizione |
|----|------|------|-------------|
| `8abacb72-e5b5-448a-965d-e6d6d0c5213c` | Default Company | default-company | Tenant admin |
| `d2bbc5b0-344c-47c7-8ef5-f57755293372` | Element Formazione | element-formazione | Formazione |
| `2996a1a3-e148-42a6-9059-eddd7543f094` | Element Medica | element-medica | Poliambulatorio |

## 🔧 Implementazione Corrente

### File Chiave
- `backend/middleware/brandDetection.js` - Mappa brand → tenant
- `backend/middleware/tenant.js` - Risolve tenant da request
- `backend/utils/tenantHelper.js` - Helper per getEffectiveTenantId

### Regole GDPR
- Ogni query DEVE includere `tenantId`
- Soft delete obbligatorio (`deletedAt`)
- Audit log per tutte le operazioni

## 🚀 Prossimi Passi

1. **Implementare Admin Cross-Tenant** - Admin può operare su qualsiasi tenant
2. **Riorganizzare Frontend** - Clinica su 5174, Formazione su 5173
3. **CF Cross-Tenant** - Paziente/Person linkabili tra tenant via Codice Fiscale
4. **Permessi Granulari** - Controllo accesso dati cross-tenant

---

*Documento generato il 14/12/2025 - Fase 11 Schema Consolidation*
