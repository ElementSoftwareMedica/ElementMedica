# P59 - Cross-Tenant Consent Propagation

## Panoramica

Questa feature implementa la propagazione automatica dei consensi cross-tenant dai Company consent ai dipendenti dell'azienda, permettendo la condivisione automatica di dati formativi e clinici.

## Problema Risolto

**Prima (P57):**
- Quando un tenant A condivideva un'azienda con tenant B, i dati dei dipendenti (visite, corsi) NON erano automaticamente visibili
- Ogni dipendente richiedeva un consenso separato (`PersonDataShareConsent`)
- Processo manuale e laborioso

**Dopo (P59):**
- Quando si approva un `CompanyDataShareConsent` che include `formazione` o `clinica` nei `sharedDataTypes`:
  1. Il sistema crea automaticamente `PersonDataShareConsent` per tutti i dipendenti dell'azienda
  2. I dati storici e futuri (corsi, visite) diventano immediatamente visibili al tenant destinazione
  3. Quando si revoca il consent aziendale, vengono automaticamente revocati anche quelli dei dipendenti

## File Creati/Modificati

### Nuovo: `CrossTenantCompanyPersonConsentService.js`
**Path:** `backend/services/company/CrossTenantCompanyPersonConsentService.js`

**Funzioni principali:**
- `requiresPersonPropagation(sharedDataTypes)` - Verifica se un tipo di dato richiede propagazione
- `getCompanyEmployees(companyId, tenantId)` - Ottiene tutti i dipendenti di un'azienda
- `propagateToEmployees(...)` - Crea PersonDataShareConsent per ogni dipendente
- `revokeEmployeeConsents(...)` - Revoca i consent propagati quando si revoca il Company consent
- `getCompanyConsentStats(companyId, sourceTenantId)` - Statistiche sui consent propagati

### Modificato: `CrossTenantApprovalService.js`
**Path:** `backend/services/management/CrossTenantApprovalService.js`

**Modifiche:**
- Import del nuovo `CrossTenantCompanyPersonConsentService`
- Metodo `approveCompanyShareRequest()` ora chiama `propagateToEmployees()` automaticamente
- La notifica include il numero di dipendenti propagati

### Modificato: `CompanyDataShareConsentService.js`
**Path:** `backend/services/company/CompanyDataShareConsentService.js`

**Modifiche:**
- Metodo `revokeConsent()` ora chiama `revokeEmployeeConsents()` automaticamente
- Aggiunto `_hasEmployeeDataAccess` nel filtro dati
- Aggiunti tipi `formazione` e `clinica` in `filterDataByConsent()`

## Tipi di Dati che Si Propagano

```javascript
const PROPAGATION_DATA_TYPES = ['formazione', 'FORMAZIONE', 'clinica', 'CLINICA'];
```

- **formazione**: Propaga accesso a `CourseSchedule` e iscrizioni corsi dei dipendenti
- **clinica**: Propaga accesso a `Visite` e dati sanitari dei dipendenti

## Flusso di Lavoro

### Approvazione Consent

```
1. Tenant B richiede accesso a Company di Tenant A
   └─ sharedDataTypes: ['anagrafica', 'formazione', 'clinica']

2. Admin Tenant A approva la richiesta
   └─ CrossTenantApprovalService.approveCompanyShareRequest()

3. Sistema verifica se ci sono tipi propagabili
   └─ requiresPersonPropagation(['anagrafica', 'formazione', 'clinica']) → true

4. Sistema recupera dipendenti dell'azienda
   └─ getCompanyEmployees(companyId, tenantA)

5. Per ogni dipendente, crea PersonDataShareConsent
   └─ consentMethod: 'COMPANY_PROPAGATION'
   └─ legalBasis: 'GDPR Art.6.1.a - Derivato da consenso aziendale'
   └─ consentProof: 'Derivato da CompanyDataShareConsent ID: xxx'

6. Audit log GDPR
   └─ action: 'COMPANY_CONSENT_PROPAGATED_TO_EMPLOYEES'
```

### Revoca Consent

```
1. Admin Tenant A revoca il CompanyDataShareConsent
   └─ CompanyDataShareConsentService.revokeConsent()

2. Sistema verifica se aveva tipi propagabili
   └─ requiresPersonPropagation(sharedDataTypes)

3. Se sì, revoca tutti i PersonDataShareConsent derivati
   └─ revokeEmployeeConsents()
   └─ WHERE consentMethod = 'COMPANY_PROPAGATION' 
   └─ AND consentProof CONTAINS companyConsentId

4. Audit log GDPR
   └─ action: 'EMPLOYEE_CONSENTS_REVOKED_WITH_COMPANY'
```

## Compliance GDPR

### Base Legale
I consent propagati usano:
- **Art. 6.1.a** - Consenso dell'interessato (derivato dal consenso aziendale)
- Il `consentProof` mantiene la tracciabilità verso il consent Company originale

### Audit Trail
Ogni operazione genera un `GdprAuditLog` con:
- `resourceType: 'PersonDataShareConsent'`
- `action: 'COMPANY_CONSENT_PROPAGATED_TO_EMPLOYEES'` o `'EMPLOYEE_CONSENTS_REVOKED_WITH_COMPANY'`
- Conteggio dipendenti coinvolti
- ID del consent Company di origine

### Revoca
- La revoca è automatica e completa
- Non rimangono consent "orfani" quando si revoca il Company consent
- Il motivo della revoca include riferimento al consent aziendale

## API Esistenti Compatibili

Le API cross-tenant esistenti funzionano automaticamente:

### Visite Cross-Tenant
```
GET /api/v1/clinica/fascicolo-sanitario/:pazienteId/visite?includeCrossTenant=true
```

### Corsi Cross-Tenant
```
GET /api/v1/clinica/fascicolo-sanitario/:pazienteId/corsi?includeCrossTenant=true
```

Queste API già verificano i `PersonDataShareConsent`, quindi ora troveranno automaticamente i consent propagati.

## Test

### Test Manuale Consigliato

1. **Creare una richiesta di condivisione Company**
   ```
   POST /api/v1/cross-tenant-approvals/company/request
   Body: {
     companyId: "...",
     sourceTenantId: "...",
     sharedDataTypes: ["anagrafica", "formazione", "clinica"]
   }
   ```

2. **Approvare la richiesta**
   ```
   POST /api/v1/cross-tenant-approvals/company/:consentId/approve
   ```

3. **Verificare propagazione**
   - Controllare che esistano `PersonDataShareConsent` per i dipendenti
   - Verificare che `consentMethod = 'COMPANY_PROPAGATION'`

4. **Testare accesso cross-tenant**
   - Dal tenant destinazione, chiamare le API di visite/corsi con `includeCrossTenant=true`
   - Verificare che i dati dei dipendenti siano visibili

5. **Testare revoca**
   - Revocare il `CompanyDataShareConsent`
   - Verificare che i `PersonDataShareConsent` siano stati revocati
   - Verificare che l'accesso cross-tenant non funzioni più

## Note di Implementazione

1. **Error Handling**: La propagazione/revoca è non-bloccante. Se fallisce, il consent Company viene comunque approvato/revocato, con errore loggato.

2. **Performance**: Per aziende con molti dipendenti, la propagazione potrebbe richiedere tempo. Considerare un job asincrono in futuro.

3. **Idempotenza**: Il sistema usa `upsert` per evitare duplicati se si ri-propaga lo stesso consent.
