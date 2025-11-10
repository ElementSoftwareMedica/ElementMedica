# API Documentation - Preventivi e Codici Sconto

## 📋 Panoramica

Questa directory contiene la documentazione completa delle API REST per la gestione di **Preventivi** e **Codici Sconto** in ElementMedica.

## 📄 File Disponibili

- **[preventivi-codici-sconto-api.yaml](./preventivi-codici-sconto-api.yaml)**: Specifica OpenAPI 3.0 completa
  - 13 endpoints documentati
  - 20+ schemas con esempi
  - Validazioni e error codes
  - Request/Response examples

## 🔍 Come Visualizzare la Documentazione

### Opzione 1: Swagger UI (Online)

Copia il contenuto di `preventivi-codici-sconto-api.yaml` e incollalo su:
- [Swagger Editor](https://editor.swagger.io/)
- [Swagger Inspector](https://inspector.swagger.io/)

### Opzione 2: VS Code Extension

Installa l'estensione **Swagger Viewer**:
```bash
code --install-extension Arjun.swagger-viewer
```

Poi apri `preventivi-codici-sconto-api.yaml` e premi `Shift+Alt+P` (o `Cmd+Shift+P` su macOS).

### Opzione 3: Swagger UI Locale (Docker)

```bash
# Dalla root del progetto
docker run -p 8080:8080 \
  -e SWAGGER_JSON=/api/preventivi-codici-sconto-api.yaml \
  -v $(pwd)/docs/technical/api:/api \
  swaggerapi/swagger-ui
```

Apri: http://localhost:8080

### Opzione 4: Redoc (Alternativa Elegante)

```bash
# Installa redoc-cli
npm install -g @redocly/cli

# Genera HTML standalone
redocly build-docs docs/technical/api/preventivi-codici-sconto-api.yaml \
  --output docs/technical/api/index.html

# Oppure server live
redocly preview-docs docs/technical/api/preventivi-codici-sconto-api.yaml
```

## 🧪 Testing API con la Documentazione

### Con curl (da terminale)

```bash
# Login per ottenere token JWT
TOKEN=$(curl -X POST http://localhost:4001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}' \
  | jq -r '.data.token')

# Lista codici sconto attivi
curl -X GET "http://localhost:4001/api/codici-sconto?stato=attivi&page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq

# Crea nuovo codice sconto
curl -X POST http://localhost:4001/api/codici-sconto \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "codice": "PROMO2025",
    "nome": "Promozione Test",
    "tipoSconto": "PERCENTUALE",
    "valore": 10.00,
    "dataInizio": "2025-11-01T00:00:00Z",
    "dataFine": "2025-12-31T23:59:59Z",
    "attivo": true,
    "applicabileA": "TUTTI",
    "cumulabile": false,
    "createdBy": "YOUR_USER_ID"
  }' | jq

# Lista preventivi
curl -X GET "http://localhost:4001/api/preventivi?stato=BOZZA" \
  -H "Authorization: Bearer $TOKEN" | jq
```

### Con Postman

1. Importa collection da OpenAPI:
   - Apri Postman
   - Vai su `Import` > `File`
   - Seleziona `preventivi-codici-sconto-api.yaml`
   - Postman creerà automaticamente tutte le 13 request

2. Configura environment variables:
   ```
   base_url: http://localhost:4001/api
   bearer_token: <YOUR_JWT_TOKEN>
   ```

3. Testa endpoint uno per uno con auto-complete e validazione

### Con HTTPie (Alternativa User-Friendly)

```bash
# Installa HTTPie
brew install httpie  # macOS
# oppure: pip install httpie

# Esempi di utilizzo
http GET http://localhost:4001/api/codici-sconto \
  "Authorization: Bearer $TOKEN" \
  stato==attivi

http POST http://localhost:4001/api/preventivi \
  "Authorization: Bearer $TOKEN" \
  tipoServizio="CORSO" \
  titoloServizio="Test Corso" \
  descrizioneServizio="Descrizione test" \
  prezzoTotale:=1000.00 \
  dataEmissione="2025-11-09T10:00:00Z" \
  dataValidita="2025-12-09T23:59:59Z"
```

## 📊 Endpoints Summary

### Codici Sconto (5 endpoints)
| Method | Path | Descrizione | RBAC |
|--------|------|-------------|------|
| `GET` | `/codici-sconto` | Lista codici con filtri | `codici_sconto_read` |
| `POST` | `/codici-sconto` | Crea nuovo codice | `codici_sconto_create` |
| `GET` | `/codici-sconto/:id` | Dettagli codice | `codici_sconto_read` |
| `PUT` | `/codici-sconto/:id` | Aggiorna codice | `codici_sconto_update` |
| `DELETE` | `/codici-sconto/:id` | Elimina codice (soft) | `codici_sconto_delete` |

### Preventivi (8 endpoints)
| Method | Path | Descrizione | RBAC |
|--------|------|-------------|------|
| `GET` | `/preventivi` | Lista preventivi | `preventivi_read` |
| `POST` | `/preventivi` | Crea preventivo | `preventivi_create` |
| `GET` | `/preventivi/:id` | Dettagli preventivo | `preventivi_read` |
| `PUT` | `/preventivi/:id` | Aggiorna preventivo | `preventivi_update` |
| `DELETE` | `/preventivi/:id` | Elimina preventivo | `preventivi_delete` |
| `GET` | `/preventivi/:id/pdf` | Genera PDF | `preventivi_read` |
| `POST` | `/preventivi/:id/applica-sconto` | Applica sconto | `preventivi_update` |
| `DELETE` | `/preventivi/:id/sconti/:scontoId` | Rimuovi sconto | `preventivi_update` |

## 🔐 Autenticazione

Tutte le API richiedono JWT token nell'header:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Ottenere un Token

```bash
curl -X POST http://localhost:4001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "yourpassword"
  }'
```

Risposta:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid",
      "email": "admin@example.com",
      "tenantId": "uuid"
    }
  }
}
```

## 📐 Schemas Principali

### CodiceSconto
```typescript
{
  id: string (uuid)
  codice: string (unique, 3-50 chars)
  nome: string (max 200)
  tipoSconto: "PERCENTUALE" | "VALORE_ASSOLUTO"
  valore: decimal
  dataInizio: datetime
  dataFine: datetime
  attivo: boolean
  utilizzoMassimo?: number
  utilizzoCorrente: number
  cumulabile: boolean
  minImporto?: decimal
  maxImporto?: decimal
  applicabileA: "TUTTI" | "AZIENDE_SPECIFICHE" | ...
  // ... altri campi
}
```

### Preventivo
```typescript
{
  id: string (uuid)
  numero: string (auto-gen: "PREV-2025-0042")
  tipoServizio: "CORSO" | "DVR" | ...
  titoloServizio: string
  prezzoTotale: decimal
  subtotale: decimal
  scontoTotale: decimal
  imponibile: decimal
  importoIva: decimal
  importoFinale: decimal
  stato: "BOZZA" | "INVIATO" | "ACCETTATO" | ...
  sconti: PreventivoSconto[]
  // ... altri campi
}
```

## 🎯 Esempi Completi

### Workflow Completo: Creare Preventivo con Sconto

```bash
#!/bin/bash
set -e

# 1. Login
TOKEN=$(curl -s -X POST http://localhost:4001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}' \
  | jq -r '.data.token')

echo "✅ Autenticato"

# 2. Crea Codice Sconto
CODICE_ID=$(curl -s -X POST http://localhost:4001/api/codici-sconto \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "codice": "TEST20",
    "nome": "Test Sconto 20%",
    "tipoSconto": "PERCENTUALE",
    "valore": 20.00,
    "dataInizio": "2025-11-01T00:00:00Z",
    "dataFine": "2025-12-31T23:59:59Z",
    "attivo": true,
    "applicabileA": "TUTTI",
    "cumulabile": false,
    "createdBy": "YOUR_USER_ID"
  }' | jq -r '.data.id')

echo "✅ Codice sconto creato: $CODICE_ID"

# 3. Crea Preventivo
PREV_ID=$(curl -s -X POST http://localhost:4001/api/preventivi \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tipoServizio": "CORSO",
    "titoloServizio": "Corso Sicurezza Base",
    "descrizioneServizio": "Formazione obbligatoria 8 ore",
    "prezzoTotale": 1000.00,
    "dataEmissione": "2025-11-09T10:00:00Z",
    "dataValidita": "2025-12-09T23:59:59Z"
  }' | jq -r '.data.id')

echo "✅ Preventivo creato: $PREV_ID"

# 4. Applica Sconto
curl -s -X POST "http://localhost:4001/api/preventivi/$PREV_ID/applica-sconto" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"codiceId\": \"$CODICE_ID\"}" | jq

echo "✅ Sconto applicato"

# 5. Genera PDF
curl -X GET "http://localhost:4001/api/preventivi/$PREV_ID/pdf" \
  -H "Authorization: Bearer $TOKEN" \
  --output "preventivo-$PREV_ID.pdf"

echo "✅ PDF generato: preventivo-$PREV_ID.pdf"
```

## ⚠️ Error Codes

| Code | Descrizione | Esempio |
|------|-------------|---------|
| `400` | Bad Request | Dati validazione fallita |
| `401` | Unauthorized | Token mancante/invalido |
| `403` | Forbidden | Permessi RBAC insufficienti |
| `404` | Not Found | Risorsa non esistente |
| `409` | Conflict | Codice duplicato |
| `500` | Internal Error | Errore server |

### Formato Error Response
```json
{
  "success": false,
  "error": "Codice sconto già esistente",
  "details": [
    {
      "field": "codice",
      "message": "Il codice 'PROMO2025' è già in uso"
    }
  ]
}
```

## 🔄 Filtri e Paginazione

### Query Parameters Comuni

**Codici Sconto**:
```
?page=1
&limit=20
&stato=attivi             # attivi|scaduti|esauriti|disabilitati|tutti
&attivo=true              # boolean
&tipoSconto=PERCENTUALE   # PERCENTUALE|VALORE_ASSOLUTO
&applicabileA=TUTTI
&search=promo             # ricerca su codice e nome
```

**Preventivi**:
```
?page=1
&limit=20
&stato=BOZZA              # BOZZA|INVIATO|ACCETTATO|...
&tipoServizio=CORSO
&search=sicurezza         # ricerca su numero/titolo/azienda
&dataEmissioneDa=2025-11-01
&dataEmissioneA=2025-11-30
```

### Response Pagination
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 156,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

## 📚 Risorse Aggiuntive

### Documentazione Correlata
- [Testing Report FASE 6](../../testing/FASE_6_TESTING_REPORT.md)
- [Piano Implementazione](../../10_project_managemnt/preventivi-e-codici-sconto/03_PIANO_IMPLEMENTAZIONE.md)
- [Architettura Sistema](../PREVENTIVI_ARCHITECTURE.md) _(da creare)_

### Strumenti Consigliati
- [Postman](https://www.postman.com/) - API testing client
- [Insomnia](https://insomnia.rest/) - Alternative a Postman
- [HTTPie](https://httpie.io/) - CLI user-friendly
- [jq](https://stedolan.github.io/jq/) - JSON processor per bash

### Link Utili
- [OpenAPI Specification](https://swagger.io/specification/)
- [JWT.io](https://jwt.io/) - JWT debugger
- [Swagger Editor](https://editor.swagger.io/)
- [Redocly](https://redocly.com/)

---

## 🛠️ Manutenzione

### Aggiornare la Documentazione

Quando modifichi le API:

1. **Aggiorna `preventivi-codici-sconto-api.yaml`**:
   - Modifica schemas se cambi modelli
   - Aggiungi/rimuovi endpoints
   - Aggiorna esempi se cambi validazioni

2. **Valida la specifica**:
   ```bash
   # Con redocly
   redocly lint docs/technical/api/preventivi-codici-sconto-api.yaml
   
   # Oppure online
   # Incolla su https://apitools.dev/swagger-parser/online/
   ```

3. **Rigenera documentazione HTML** (se applicabile):
   ```bash
   redocly build-docs docs/technical/api/preventivi-codici-sconto-api.yaml \
     --output docs/technical/api/index.html
   ```

4. **Aggiorna esempi** in questo README

5. **Aggiorna Postman collection** (esporta da Swagger)

### Versioning

La documentazione API segue la versione del progetto:
- Versione corrente: **1.0.0**
- Breaking changes: Incrementare major version
- Nuovi endpoint: Incrementare minor version
- Bug fix documentazione: Incrementare patch version

---

**Ultima modifica**: 9 Novembre 2025  
**Autore**: ElementMedica Dev Team  
**Stato**: ✅ Completo e validato
