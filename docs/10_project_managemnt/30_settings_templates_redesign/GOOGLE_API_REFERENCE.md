# Google Integration API Reference

## Overview
API endpoints per integrare Google Docs e Google Slides nel sistema di gestione template.

**Base URL**: `/api/v1/google`

**Authentication**: Bearer token richiesto per tutti gli endpoint

**Permissions**:
- `VIEW_TEMPLATES`: Per visualizzare stato connessione
- `CREATE_TEMPLATES`: Per importare documenti
- `MANAGE_TEMPLATES`: Per connettere/disconnettere account Google

---

## Authentication Endpoints

### GET /auth/url
Genera URL di autorizzazione OAuth2 per connettere account Google.

**Permissions**: `MANAGE_TEMPLATES`

**Response**:
```json
{
  "success": true,
  "data": {
    "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?...",
    "scopes": [
      "https://www.googleapis.com/auth/documents.readonly",
      "https://www.googleapis.com/auth/presentations.readonly",
      "https://www.googleapis.com/auth/drive.readonly",
      "https://www.googleapis.com/auth/userinfo.email"
    ]
  }
}
```

**Usage**:
1. Frontend chiama questo endpoint
2. Reindirizza utente all'authUrl
3. Utente autorizza l'applicazione
4. Google reindirizza al `GOOGLE_REDIRECT_URI` con code
5. Frontend chiama `/auth/callback` con il code

---

### POST /auth/callback
Scambia authorization code per access tokens.

**Permissions**: `MANAGE_TEMPLATES`

**Request Body**:
```json
{
  "code": "4/0AY0e-g7...",
  "state": "{\"userId\":\"...\",\"tenantId\":\"...\"}"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Successfully connected to Google",
  "data": {
    "connected": true,
    "scopes": [
      "https://www.googleapis.com/auth/documents.readonly",
      "https://www.googleapis.com/auth/presentations.readonly",
      "https://www.googleapis.com/auth/drive.readonly"
    ]
  }
}
```

**Errors**:
- `400`: Authorization code mancante
- `500`: Errore durante lo scambio del code

---

### GET /status
Verifica stato connessione account Google.

**Permissions**: `VIEW_TEMPLATES`

**Response**:
```json
{
  "success": true,
  "data": {
    "connected": true,
    "expiresAt": "2025-11-06T10:30:00.000Z",
    "scopes": [
      "https://www.googleapis.com/auth/documents.readonly",
      "https://www.googleapis.com/auth/presentations.readonly"
    ],
    "tokenType": "Bearer"
  }
}
```

**Not Connected**:
```json
{
  "success": true,
  "data": {
    "connected": false,
    "expiresAt": null,
    "scopes": []
  }
}
```

---

### DELETE /disconnect
Disconnette account Google e revoca tokens.

**Permissions**: `MANAGE_TEMPLATES`

**Response**:
```json
{
  "success": true,
  "message": "Successfully disconnected from Google",
  "data": {
    "connected": false
  }
}
```

---

## Import Endpoints

### POST /import-docs
Importa documento da Google Docs e converte in HTML.

**Permissions**: `CREATE_TEMPLATES`

**Request Body**:
```json
{
  "documentId": "1abc...xyz"
}
```

O con URL completo:
```json
{
  "documentId": "https://docs.google.com/document/d/1abc...xyz/edit"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Document imported successfully",
  "data": {
    "name": "Titolo del documento",
    "content": "<p>Contenuto HTML convertito...</p>",
    "header": "<h1>Intestazione</h1>",
    "footer": "",
    "googleDocsId": "1abc...xyz",
    "googleDocsUrl": "https://docs.google.com/document/d/1abc...xyz",
    "markers": [
      {
        "key": "student.fullName",
        "category": "student",
        "field": "fullName",
        "description": "Marker: student.fullName"
      }
    ],
    "description": "Imported from Google Docs: Titolo del documento",
    "lastSyncedAt": "2025-11-05T17:30:00.000Z",
    "syncEnabled": false,
    "autoSync": false
  }
}
```

**HTML Conversion**:
- ✅ Paragrafi → `<p>`
- ✅ Titoli H1-H6 → `<h1>` - `<h6>`
- ✅ Bold/Italic/Underline → `<strong>`, `<em>`, `<u>`
- ✅ Liste numerate/puntate → `<ol>`, `<ul>`
- ✅ Tabelle → `<table>`
- ✅ Link → `<a href="...">`
- ✅ Colori testo/sfondo → inline styles
- ✅ Allineamento → inline styles

**Marker Extraction**:
- Pattern: `{{category.field}}`
- Esempi: `{{student.fullName}}`, `{{course.name}}`, `{{date.today}}`
- Supporta nesting: `{{company.address.city}}`

**Errors**:
- `400`: Document ID mancante o URL non valido
- `401`: Account Google non connesso (`GOOGLE_NOT_CONNECTED`)
- `403`: Permessi insufficienti per accedere al documento
- `404`: Documento non trovato
- `500`: Errore durante l'import

---

### POST /import-slides
Importa presentazione da Google Slides e converte in HTML.

**Permissions**: `CREATE_TEMPLATES`

**Request Body**:
```json
{
  "presentationId": "1xyz...abc"
}
```

O con URL completo:
```json
{
  "presentationId": "https://docs.google.com/presentation/d/1xyz...abc/edit"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Presentation imported successfully",
  "data": {
    "name": "Titolo presentazione",
    "content": "<div class=\"slide\" data-slide-number=\"1\">...</div>",
    "header": "<h1>Titolo presentazione</h1>",
    "footer": "<p class=\"slide-count\">Totale slide: 10</p>",
    "googleSlidesId": "1xyz...abc",
    "googleDocsUrl": "https://docs.google.com/presentation/d/1xyz...abc",
    "markers": [...],
    "description": "Imported from Google Slides: Titolo presentazione",
    "lastSyncedAt": "2025-11-05T17:30:00.000Z",
    "syncEnabled": false,
    "autoSync": false
  }
}
```

**HTML Conversion**:
- ✅ Ogni slide → `<div class="slide">`
- ✅ Titolo slide → `<h2>`
- ✅ Sottotitolo → `<h3>`
- ✅ Testo → `<p>`
- ✅ Tabelle → `<table>`
- ✅ Bold/Italic/Underline → `<strong>`, `<em>`, `<u>`
- ✅ Link → `<a href="...">`
- ⚠️ Immagini → Placeholder (richiedono download separato)

**Note su Immagini**:
Le immagini in Google Slides richiedono autenticazione separata per il download.
Nel HTML convertito vengono inseriti placeholder con `data-content-url`.

**Errors**: Stessi di `/import-docs`

---

## Error Codes

### Authentication Errors
| Code | Status | Description |
|------|--------|-------------|
| `GOOGLE_NOT_CONNECTED` | 401 | Account Google non connesso |
| `AUTH_INSUFFICIENT_PERMISSIONS` | 403 | Permessi utente insufficienti |

### Document Errors
| Error | Status | Description |
|-------|--------|-------------|
| `Invalid Google Docs URL` | 400 | URL documento non valido |
| `Invalid Google Slides URL` | 400 | URL presentazione non valido |
| `Document not found` | 404 | Documento non esistente o non accessibile |
| `Presentation not found` | 404 | Presentazione non esistente |
| `Permission denied` | 403 | Nessun accesso al documento |

---

## Integration Flow

### 1. Connect Google Account
```javascript
// Step 1: Get auth URL
const { data } = await api.get('/google/auth/url');
window.location.href = data.authUrl;

// Step 2: User authorizes (redirects back with code)
// Step 3: Exchange code for tokens
await api.post('/google/auth/callback', {
  code: urlParams.get('code'),
  state: urlParams.get('state')
});
```

### 2. Check Connection Status
```javascript
const { data } = await api.get('/google/status');
if (data.connected) {
  console.log('Connected! Expires:', data.expiresAt);
} else {
  console.log('Not connected');
}
```

### 3. Import Document
```javascript
// Import Google Docs
const { data } = await api.post('/google/import-docs', {
  documentId: 'https://docs.google.com/document/d/1abc...xyz/edit'
});

// Create template with imported data
await api.post('/templates', {
  ...data,
  type: 'CERTIFICATE',
  category: 'formazione'
});
```

### 4. Import Presentation
```javascript
// Import Google Slides
const { data } = await api.post('/google/import-slides', {
  presentationId: '1xyz...abc'
});

// Create template with imported data
await api.post('/templates', {
  ...data,
  type: 'PRESENTATION',
  category: 'formazione'
});
```

### 5. Disconnect (Optional)
```javascript
await api.delete('/google/disconnect');
```

---

## Rate Limits

### Google API Quotas
- **Google Docs API**: 300 richieste/minuto per utente
- **Google Slides API**: 300 richieste/minuto per utente
- **Google Drive API**: 1000 richieste/100 secondi per utente

### Best Practices
1. ✅ Cache documenti importati
2. ✅ Implementa retry con backoff esponenziale
3. ✅ Mostra progress indicator durante import
4. ✅ Gestisci errori di quota con messaggi user-friendly
5. ✅ Refresh token automatico (gestito dal backend)

---

## Security Considerations

### Token Storage
- ✅ Access tokens: Criptati in database
- ✅ Refresh tokens: Criptati in database
- ✅ Scopes limitati: Solo lettura (readonly)
- ✅ Token rotation: Automatic refresh quando scaduti

### Permissions
- ✅ Multi-tenancy: Token separati per tenant
- ✅ User isolation: Ogni utente ha i propri token
- ✅ Revocation: Token revocati su disconnect

### Data Privacy
- ✅ Nessun storage permanente dei documenti Google
- ✅ Solo conversione HTML per template
- ✅ Markers estratti ma non dati personali
- ✅ Conformità GDPR

---

## Testing

### Manual Testing
```bash
# 1. Login
TOKEN=$(curl -s -X POST http://localhost:4001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"testuser","password":"Test123!"}' | jq -r '.tokens.access_token')

# 2. Check status
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:4001/api/v1/google/status | jq

# 3. Get auth URL
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:4001/api/v1/google/auth/url | jq

# 4. Try import (will fail without OAuth)
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"documentId":"1abc...xyz"}' \
  http://localhost:4001/api/v1/google/import-docs | jq
```

### Automated Testing
```bash
cd backend
node scripts/test-google-import.cjs
```

---

## Troubleshooting

### "Not connected to Google"
**Solution**: Completa il flow OAuth2 tramite `/auth/url` e `/auth/callback`

### "Permission denied"
**Causes**:
1. Documento non condiviso con account Google connesso
2. Link sharing disabilitato
3. Documento privato

**Solution**: Condividi documento con "Anyone with the link can view"

### "Invalid token"
**Causes**: Token scaduto o revocato
**Solution**: Backend gestisce automaticamente refresh. Se persiste, riconnetti account.

### "Document not found"
**Causes**:
1. ID documento errato
2. Documento eliminato
3. URL malformato

**Solution**: Verifica ID/URL e che il documento esista

---

## Future Enhancements

### Planned Features
- [ ] Auto-sync: Aggiornamento automatico template quando documento cambia
- [ ] Image download: Download immagini da Google Slides con autenticazione
- [ ] Advanced formatting: Supporto font, size, spacing personalizzati
- [ ] Comments import: Importa commenti da Google Docs come note template
- [ ] Bulk import: Importa multipli documenti in batch
- [ ] Sync history: Tracking modifiche sincronizzate
- [ ] Conflict resolution: Gestione conflitti tra modifiche locali/remote

### Known Limitations
- ⚠️ Headers/footers Google Docs non supportati (API limitation)
- ⚠️ Immagini Google Slides richiedono download separato
- ⚠️ Grafici/charts convertiti come immagini statiche
- ⚠️ Formattazione avanzata (margini, spaziatura) non sempre preservata
- ⚠️ Commenti e suggestions non importati
