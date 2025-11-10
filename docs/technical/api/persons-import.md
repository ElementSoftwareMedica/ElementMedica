# API Import Persone (JSON/CSV)

Endpoint: `POST /api/v1/persons/import`

- Supporta due modalità:
  - JSON: `Content-Type: application/json` oppure `?mode=json`
  - CSV: multipart form con `file` (separatore `;` consigliato)
- Autenticazione: Bearer token (cookie HttpOnly supportato) e permesso `persons:create`
- Tenant: usa header `X-Tenant-ID` oppure campo `tenantId` per ogni persona

## JSON Payload
```json
{
  "persons": [
    {
      "firstName": "Mario",
      "lastName": "Rossi",
      "email": "mario.rossi@example.com",
      "roleType": "EMPLOYEE",
      "companyId": "<UUID opzionale>",
      "tenantId": "<UUID>"
    }
  ],
  "overwriteIds": []
}
```

- `companyId`: se presente e non è UUID, viene risolto (match per `ragioneSociale`).
- `companyName`: alternativo a `companyId` (match risolto server-side).
- `overwriteIds`: aggiorna record esistenti anziché saltarli.

## Risposta
```json
{
  "success": true,
  "imported": 12,
  "updated": 3,
  "skipped": 1,
  "errors": [ { "row": 5, "error": "Email non valida" } ]
}
```

## CSV Payload
- `multipart/form-data` con `file` (CSV; intestazioni mappate automaticamente).
- Header `X-Tenant-ID` richiesto.

## Note UI (Modal Import)
- Assegnazione azienda per righe non identificate: menù a pillola con assegnazione singola/massiva.
- Skip righe con errori/duplicati: selezione righe e risoluzioni conflitti.
- Preview: mostra conflitti (`duplicate`, `invalid_company`) e suggerimenti.

## GDPR
- Nessun dato sensibile in log.
- Audit trail gestito via middleware; nessun bypass per admin.