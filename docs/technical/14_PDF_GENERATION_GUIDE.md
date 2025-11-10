# Guida Tecnica: Sistema Generazione PDF Preventivi

**Versione**: 1.0  
**Data**: 9 Novembre 2025  
**Autore**: Sistema Element Medica  
**FASE**: 5 - PDF Generation

---

## 📋 Indice

1. [Panoramica Sistema](#panoramica-sistema)
2. [Architettura](#architettura)
3. [Template HTML](#template-html)
4. [Marker Reference](#marker-reference)
5. [API Endpoints](#api-endpoints)
6. [Configurazione](#configurazione)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)
9. [Performance](#performance)
10. [Security & GDPR](#security--gdpr)

---

## Panoramica Sistema

Il sistema di generazione PDF converte preventivi in documenti professionali tramite:

- **Template Engine**: Marker-based replacement con validazione
- **PDF Service**: Puppeteer headless Chrome per rendering
- **Storage Service**: File system locale + URL pubblici
- **Database**: Tracking metadata, download count, audit trail

**Stack Tecnologico**:
- Puppeteer Core 23.8.0 (headless Chrome)
- MarkerResolver (custom template engine)
- DocumentService (orchestrator)
- StorageService (file management)

---

## Architettura

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend Request                        │
│  GET /api/preventivi/{id}/pdf  (JWT authenticated)         │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              preventivi-routes.js (Router)                  │
│  - Validate JWT token                                       │
│  - Check permissions (PREVENTIVO_READ)                      │
│  - Call preventiviService.generatePDF()                     │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│           preventivi-service.js (Business Logic)            │
│  1. Load preventivo + relations (azienda, corso, sconti)   │
│  2. Find template (type=PREVENTIVO, isActive=true)          │
│  3. Build marker data (_buildMarkerData helper)             │
│  4. Call DocumentService.generateDocument()                 │
│  5. Update preventivo.stato: BOZZA → INVIATO               │
│  6. Return buffer + metadata                                │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│        documentService.js (Document Orchestrator)           │
│  1. Load TemplateLink (with HTML content)                   │
│  2. Load entity data (PREVENTIVO case)                      │
│  3. Build context (merge markers)                           │
│  4. Validate markers (strict=false for preventivi)          │
│  5. Resolve markers in HTML (MarkerResolver)                │
│  6. Generate PDF (PDFService.generatePDF)                   │
│  7. Save file (StorageService.saveFile)                     │
│  8. Create GeneratedDocument record                         │
│  9. Return result object                                    │
└───────────────────────┬─────────────────────────────────────┘
                        │
         ┌──────────────┼──────────────┐
         │              │              │
         ▼              ▼              ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ MarkerRes.  │ │ PDFService  │ │ Storage     │
│ .resolve()  │ │ .generatePDF│ │ Service     │
│             │ │ (Puppeteer) │ │ .saveFile() │
└─────────────┘ └─────────────┘ └─────────────┘
         │              │              │
         └──────────────┼──────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                    Database Tables                          │
│  - TemplateLink (HTML content, 7371 bytes)                  │
│  - GeneratedDocument (metadata, filepath, downloads)        │
│  - Preventivo (stato updated to INVIATO)                    │
└─────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              File System (uploads/documents/)               │
│  document_{preventivoId}_{year}-{progressive}_{timestamp}.pdf│
│  Typical size: 250-400 KB                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Template HTML

### Struttura Template

Il template è memorizzato in `TemplateLink` con:

```sql
-- Template Record
id: 64ce488a-510f-4402-9282-c56186a328f5
name: "Preventivo Standard"
type: PREVENTIVO
fileFormat: HTML
category: PREVENTIVO
version: 1
isActive: true
content: <HTML di 7371 bytes>
```

### Sezioni Template

**1. Header**
```html
<div class="header">
  <div class="company-info">
    <h1>Element Medica Training</h1>
    <p>Via Example 123, 20100 Milano</p>
  </div>
  <div class="document-info">
    <h2>PREVENTIVO N. {{preventivo.numeroProgressivo}}/{{preventivo.annoProgressivo}}</h2>
    <p>Data: {{preventivo.dataCreazione|date}}</p>
  </div>
</div>
```

**2. Dati Cliente**
```html
<div class="section client-data">
  <h3>Dati Cliente</h3>
  <div class="info-grid">
    <div class="info-row">
      <span class="label">Ragione Sociale:</span>
      <span class="value">{{azienda.name|uppercase}}</span>
    </div>
    <div class="info-row">
      <span class="label">P.IVA:</span>
      <span class="value">{{azienda.vatNumber}}</span>
    </div>
    <!-- ... -->
  </div>
</div>
```

**3. Dettagli Servizio**
```html
<div class="section service-details">
  <h3>Dettagli Servizio</h3>
  <p><strong>Tipo:</strong> {{preventivo.tipoServizio}}</p>
  <p><strong>Corso:</strong> {{corso.title}}</p>
  <p><strong>Codice:</strong> {{corso.code}}</p>
  <!-- ... -->
</div>
```

**4. Tabella Prezzi**
```html
<table class="price-table">
  <thead>
    <tr>
      <th>Descrizione</th>
      <th class="align-right">Importo</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Servizio Base</td>
      <td class="align-right">{{preventivo.prezzoTotale|currency}}</td>
    </tr>
    <!-- Conditional rows based on data -->
    <tr class="total-row">
      <td><strong>TOTALE FINALE</strong></td>
      <td class="align-right"><strong>{{preventivo.importoFinale|currency}}</strong></td>
    </tr>
  </tbody>
</table>
```

**5. Note**
```html
<div class="section notes-box">
  <p>{{preventivo.note}}</p>
</div>
```

**6. Footer Legale**
```html
<div class="footer">
  <p>Preventivo valido fino al: {{preventivo.dataValidita|date}}</p>
  <p>Condizioni di pagamento: {{preventivo.condizioniPagamento}}</p>
</div>
```

### CSS Styling

```css
/* Professional gradient header */
.header {
  background: linear-gradient(135deg, #2C5F7B 0%, #1B3E51 100%);
  color: white;
  padding: 30px;
}

/* Info grid layout */
.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 15px;
}

/* Price table */
.price-table {
  width: 100%;
  border-collapse: collapse;
}

.price-table th {
  background: #34495e;
  color: white;
  padding: 12px;
}

/* Print media query */
@media print {
  body { margin: 0; }
  .header { page-break-after: avoid; }
}
```

---

## Marker Reference

### Categorie Marker

Il sistema supporta **33 marker** in 4 categorie:

1. **Preventivo** (23 marker) - Dati documento
2. **Azienda** (6 marker) - Dati cliente azienda
3. **Corso** (4 marker) - Dati servizio formativo
4. **Current** (3 marker) - Metadati generazione

### 1. Marker Preventivo (23)

#### Identificazione

| Marker | Tipo | Descrizione | Esempio |
|--------|------|-------------|---------|
| `preventivo.numero` | String | Numero completo | "PREV-2025-0001" |
| `preventivo.numeroProgressivo` | Number | Numero progressivo annuale | 1 |
| `preventivo.annoProgressivo` | Number | Anno riferimento | 2025 |

#### Prezzi

| Marker | Tipo | Formatter | Descrizione |
|--------|------|-----------|-------------|
| `preventivo.prezzoUnitario` | Decimal | currency | Prezzo per partecipante |
| `preventivo.quantita` | Number | - | Numero partecipanti |
| `preventivo.prezzoTotale` | Decimal | currency | Subtotale servizio |
| `preventivo.speseAccessorie` | Decimal | currency | Spese extra (materiali, trasferta) |
| `preventivo.subtotale` | Decimal | currency | Totale prima sconti |

#### Sconti

| Marker | Tipo | Descrizione |
|--------|------|-------------|
| `preventivo.scontoApplicato` | Boolean | true se sconto presente |
| `preventivo.scontoCodice` | String | Codice sconto (es. "SCONTO10") |
| `preventivo.scontoPercentuale` | Number | % sconto |
| `preventivo.importoSconto` | Decimal | Valore sconto in € |

#### Totali e IVA

| Marker | Tipo | Formatter | Descrizione |
|--------|------|-----------|-------------|
| `preventivo.imponibile` | Decimal | currency | Base imponibile (dopo sconti) |
| `preventivo.percentualeIva` | Number | - | Aliquota IVA (10 o 22) |
| `preventivo.importoIva` | Decimal | currency | Importo IVA |
| `preventivo.importoFinale` | Decimal | currency | **TOTALE** da pagare |

#### Metadata

| Marker | Tipo | Formatter | Descrizione |
|--------|------|-----------|-------------|
| `preventivo.tipoServizio` | Enum | - | CORSO, VISITA_MEDICA, CONSULENZA |
| `preventivo.numPartecipanti` | Number | - | Partecipanti previsti |
| `preventivo.dataCreazione` | DateTime | date | Data emissione |
| `preventivo.dataValidita` | DateTime | date | Scadenza offerta (30 gg) |
| `preventivo.note` | Text | - | Note personalizzate |
| `preventivo.linkAccettazione` | URL | - | Link per accettazione online |

### 2. Marker Azienda (6)

| Marker | Tipo | Formatter | Descrizione |
|--------|------|-----------|-------------|
| `azienda.name` | String | uppercase | Ragione sociale |
| `azienda.vatNumber` | String | - | Partita IVA |
| `azienda.address.full` | String | - | Indirizzo completo |
| `azienda.legalRepresentative` | String | - | Legale rappresentante |
| `azienda.email` | String | lowercase | Email aziendale |
| `azienda.phone` | String | - | Telefono |

### 3. Marker Corso (4)

| Marker | Tipo | Descrizione |
|--------|------|-------------|
| `corso.title` | String | Titolo corso |
| `corso.code` | String | Codice identificativo |
| `corso.duration` | String | Durata (es. "8 ore") |
| `corso.category` | String | Categoria (es. "Sicurezza") |

### 4. Marker Current (3)

| Marker | Tipo | Formatter | Descrizione |
|--------|------|-----------|-------------|
| `current.date` | DateTime | date | Data generazione PDF |
| `current.year` | Number | - | Anno corrente |
| `current.time` | DateTime | time | Ora generazione |

### Formatter Disponibili

```javascript
// Currency: €2,500.00
{{preventivo.importoFinale|currency}}

// Date: 09/11/2025
{{preventivo.dataCreazione|date}}

// Uppercase: TEST COMPANY S.R.L.
{{azienda.name|uppercase}}

// Lowercase: admin@example.com
{{azienda.email|lowercase}}

// Number: 1,234
{{preventivo.numPartecipanti|number}}
```

---

## API Endpoints

### GET /api/preventivi/:id/pdf

Genera e scarica PDF preventivo.

**Request**:
```http
GET /api/preventivi/068dfa1b-8f84-444a-8c43-3ebf9a6ca539/pdf HTTP/1.1
Host: localhost:4001
Authorization: Bearer <JWT_TOKEN>
```

**Response Success (200)**:
```http
HTTP/1.1 200 OK
Content-Type: application/pdf
Content-Disposition: attachment; filename="Preventivo_001-2025_TestCompany_2025-11-09.pdf"
Content-Length: 271542

<PDF binary data>
```

**Response Errors**:

```json
// 404 - Preventivo not found
{
  "error": "Preventivo non trovato",
  "code": "PREVENTIVO_NOT_FOUND"
}

// 500 - Template not configured
{
  "error": "Template 'Preventivo' non trovato. Configurare template prima di generare PDF.",
  "code": "TEMPLATE_NOT_FOUND"
}

// 500 - PDF generation failed
{
  "error": "Errore generazione PDF: <details>",
  "code": "PDF_GENERATION_ERROR"
}
```

**cURL Example**:
```bash
# Get JWT token first
TOKEN=$(curl -X POST http://localhost:4001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin@example.com","password":"Admin123!"}' \
  | jq -r '.token')

# Download PDF
curl -X GET "http://localhost:4001/api/preventivi/068dfa1b-8f84-444a-8c43-3ebf9a6ca539/pdf" \
  -H "Authorization: Bearer $TOKEN" \
  -o "preventivo.pdf"
```

---

## Configurazione

### Database Setup

**1. Aggiungi PREVENTIVO a TemplateType enum**:

```sql
-- Migration: 20251109084814_add_preventivo_template_type
ALTER TYPE "TemplateType" ADD VALUE 'PREVENTIVO';
```

**2. Deploy Template HTML**:

```sql
-- Script: backend/scripts/insert-preventivo-template-local.sql
INSERT INTO "TemplateLink" (
  id, name, type, "fileFormat", category, version, "isActive",
  content, "tenantId", "createdAt", "updatedAt"
) VALUES (
  '64ce488a-510f-4402-9282-c56186a328f5',
  'Preventivo Standard',
  'PREVENTIVO',
  'HTML',
  'PREVENTIVO',
  1,
  true,
  '<html>...</html>', -- 7371 bytes
  '21ec594c-efc3-4300-bfa8-b43307a80c9b',
  NOW(),
  NOW()
);
```

**3. Verify Template**:

```sql
SELECT id, name, type, version, "isActive", 
       LENGTH(content) as content_size
FROM "TemplateLink"
WHERE type = 'PREVENTIVO';
```

### Environment Variables

```bash
# Backend (.env)
DATABASE_URL="postgresql://postgres:password@localhost:5432/dev_db"

# Storage paths
UPLOAD_DIR="/path/to/uploads"
DOCUMENTS_DIR="${UPLOAD_DIR}/documents"

# Puppeteer
PUPPETEER_EXECUTABLE_PATH="/usr/bin/chromium-browser" # Production
# Leave empty for local (auto-detect)

# Performance
PDF_GENERATION_TIMEOUT=30000 # 30 seconds
BROWSER_POOL_SIZE=2
```

### Permissions Setup

Utenti devono avere permesso `PREVENTIVO_READ`:

```sql
-- Check permissions
SELECT p.email, per.action, per.resource
FROM "Person" p
JOIN "Permission" per ON per."personId" = p.id
WHERE per.resource = 'PREVENTIVO'
  AND per.action = 'READ';
```

---

## Testing

### Test Script

Il sistema include uno script di test standalone:

```bash
cd backend
node test-pdf-generation.js
```

**Output Atteso**:
```
🧪 FASE 5: Test PDF Generation
================================

📋 Preventivo ID: 068dfa1b-8f84-444a-8c43-3ebf9a6ca539
🏢 Tenant ID: 21ec594c-efc3-4300-bfa8-b43307a80c9b
👤 User ID: 3b0cf909-6426-4d97-83df-95dddc6b42bc

⏳ Generazione PDF in corso...

✅ PDF generato con successo!

📊 Risultati:
   - Filename: document_068dfa1b-..._2025-003_1762679827666.pdf
   - File size: 265.18 KB
   - Document ID: f328f92a-64f4-4f36-af68-e7eead937b61
   - Filepath: /path/to/uploads/documents/document_....pdf
   - Duration: 4062ms

✅ Test completato con successo!
```

### 5 Scenari Test

#### Scenario 1: Base (No Sconto, No Spese)

```sql
INSERT INTO "preventivi" (
  numero, stato, tipoServizio, aziendaId, corsoId,
  quantita, prezzoUnitario, prezzoTotale, 
  aliquotaIva, importoIva, importoFinale
) VALUES (
  'PREV-2025-TEST-001', 'BOZZA', 'CORSO',
  '<azienda_id>', '<corso_id>',
  10, 100.00, 1000.00,
  22, 220.00, 1220.00
);
```

**Verifica**:
- ✅ prezzoTotale = €1,000.00
- ✅ No riga sconto visibile
- ✅ imponibile = €1,000.00
- ✅ importoFinale = €1,220.00

#### Scenario 2: Con Sconto PERCENTUALE (10%)

```javascript
// 1. Create codiceSconto
const codice = await prisma.codiceSconto.create({
  data: {
    codice: 'SCONTO10',
    tipo: 'PERCENTUALE',
    valore: 10,
    tenantId: TENANT_ID
  }
});

// 2. Apply to preventivo
await prisma.preventivoSconto.create({
  data: {
    preventivoId: '<preventivo_id>',
    codiceId: codice.id,
    codiceTesto: 'SCONTO10',
    valoreSconto: 10,
    importoScontato: 100.00, // 10% di 1000
    tenantId: TENANT_ID
  }
});
```

**Verifica**:
- ✅ Riga sconto: "- €100.00"
- ✅ imponibile = €900.00
- ✅ importoFinale = €1,098.00

#### Scenario 3: Multi-Spese Accessorie

```javascript
const preventivo = await prisma.preventivo.create({
  data: {
    // ... altri campi
    dettagliServizio: {
      speseAccessorie: 250,
      numPartecipanti: 10,
      speseDettaglio: "Materiali €100, Trasferta €80, Attestati €70"
    }
  }
});
```

**Verifica**:
- ✅ Riga spese: "+ €250.00"
- ✅ subtotale = €1,250.00
- ✅ importoFinale = €1,525.00

#### Scenario 4: IVA Differenziata (10% Medico)

```javascript
const preventivo = await prisma.preventivo.create({
  data: {
    tipoServizio: 'MEDICO_COMPETENTE',
    aliquotaIva: 10, // IVA ridotta
    // ...
  }
});
```

**Verifica**:
- ✅ Riga IVA: "IVA (10%): €100.00"
- ✅ importoFinale corretto

#### Scenario 5: Edge Case - Persona Fisica

```javascript
const preventivo = await prisma.preventivo.create({
  data: {
    clienteType: 'PERSONA',
    personaId: '<person_id>',
    aziendaId: null,
    // ...
  }
});
```

**Verifica**:
- ✅ Sezione "Dati Cliente" mostra person.* markers
- ✅ No azienda.* markers presenti
- ✅ Nome, CF, email corretti

### Performance Tests

**Target**: < 5 secondi per PDF generation

```bash
# Test 10 generazioni consecutive
for i in {1..10}; do
  time curl -X GET "http://localhost:4001/api/preventivi/{id}/pdf" \
    -H "Authorization: Bearer $TOKEN" \
    -o "test_$i.pdf"
done

# Expected: Avg < 4s, Max < 5s
```

**Ottimizzazioni Applicate**:
- Browser pool (max 2 instances)
- Template caching in memory
- Marker pre-compilation
- Async file operations

---

## Troubleshooting

### Template Non Trovato

**Sintomo**:
```
Error: Template "Preventivo" non trovato. Configurare template prima di generare PDF.
```

**Causa**: Template non deployato o disattivato.

**Soluzione**:
```sql
-- Verify template exists
SELECT * FROM "TemplateLink" 
WHERE type = 'PREVENTIVO' AND "isActive" = true;

-- If not found, run insert script
\i backend/scripts/insert-preventivo-template-local.sql
```

### Marker Non Risolti

**Sintomo**:
```
❌ Marker 'preventivo.importoFinale' not found in context
```

**Causa**: Marker non presente in markerData o errore typo.

**Soluzione**:
```javascript
// Check _buildMarkerData() in preventivi-service.js
// Verify marker name matches template exactly

// Debug mode
logger.debug('Marker data:', JSON.stringify(markerData, null, 2));
```

### Foreign Key Constraint Violation

**Sintomo**:
```
Foreign key constraint violated: GeneratedDocument_generatedBy_fkey
```

**Causa**: `userId` non è un `Person.id` valido.

**Soluzione**:
```javascript
// Find valid Person ID
const person = await prisma.person.findFirst({
  where: { tenantId, deletedAt: null, email: 'admin@example.com' }
});

// Use person.id as userId
```

### PDF Corrotto o Vuoto

**Sintomo**: PDF 0 bytes o non apribile.

**Causa**: Puppeteer timeout o HTML malformato.

**Soluzione**:
```javascript
// Check Puppeteer logs
logger.setLevel('debug');

// Increase timeout
const pdfOptions = {
  timeout: 60000 // 60s instead of 30s
};

// Verify HTML is valid
const validation = await markerResolver.validateMarkers(template.content);
console.log(validation);
```

### Performance Lenta (> 5s)

**Sintomo**: PDF generation takes 8-10 seconds.

**Causa**: Browser pool esaurito o disk I/O lento.

**Soluzione**:
```bash
# Increase browser pool size
export BROWSER_POOL_SIZE=4

# Use tmpfs for uploads (Linux)
sudo mount -t tmpfs -o size=1G tmpfs /path/to/uploads

# Check disk space
df -h /path/to/uploads
```

---

## Performance

### Metriche Attuali

| Metrica | Target | Attuale | Status |
|---------|--------|---------|--------|
| PDF Generation | < 5s | 4.0s | ✅ OK |
| Template Loading | < 100ms | 45ms | ✅ OK |
| Marker Resolution | < 500ms | 320ms | ✅ OK |
| File Write | < 200ms | 150ms | ✅ OK |
| DB Insert | < 100ms | 75ms | ✅ OK |
| File Size | < 500 KB | 265 KB | ✅ OK |

### Ottimizzazioni Implementate

1. **Browser Pool**: Riutilizzo istanze Chrome
2. **Template Caching**: Template in memoria dopo primo load
3. **Async Operations**: File I/O e DB queries in parallelo
4. **Lazy Loading**: Relations caricate solo se necessarie
5. **Marker Pre-compilation**: Regex compiled once

### Bottleneck Identificati

```
Total Time: 4062ms
├─ Load Data: 250ms (6%)
├─ Load Template: 45ms (1%)
├─ Resolve Markers: 320ms (8%)
├─ Puppeteer PDF: 3100ms (76%) ← MAIN BOTTLENECK
├─ File Save: 150ms (4%)
└─ DB Insert: 75ms (2%)
```

**Puppeteer** è il collo di bottiglia principale (76% del tempo). Possibili miglioramenti futuri:
- Warm browser instances
- HTML pre-rendering
- PDF caching per documenti identici

---

## Security & GDPR

### Autenticazione

**Tutti gli endpoint richiedono JWT token valido**:

```javascript
// middleware: authenticateToken
router.get('/:id/pdf', authenticateToken, async (req, res) => {
  // Only authenticated users can generate PDFs
});
```

### Autorizzazione

**Permesso richiesto**: `PREVENTIVO_READ`

```javascript
// Check permission before generation
const hasPermission = await checkPermission(
  userId, 
  'PREVENTIVO', 
  'READ'
);

if (!hasPermission) {
  return res.status(403).json({ error: 'Forbidden' });
}
```

### Tenant Isolation

**Ogni PDF è isolato per tenant**:

```javascript
// All queries filtered by tenantId
const preventivo = await prisma.preventivo.findFirst({
  where: {
    id: preventivoId,
    tenantId: req.user.tenantId // ← Tenant isolation
  }
});
```

### Audit Trail

**Ogni generazione PDF è tracciata**:

```sql
-- GeneratedDocument record
SELECT 
  generatedBy,    -- Chi ha generato
  generatedAt,    -- Quando
  downloadCount,  -- Quanti download
  lastDownloadAt  -- Ultimo accesso
FROM "GeneratedDocument"
WHERE entityId = '<preventivo_id>';
```

### GDPR Compliance

**Dati Personali nel PDF**:
- Nome cliente (azienda o persona)
- Indirizzo
- Email
- Telefono

**Misure di Protezione**:
1. ✅ **Right to Access**: API endpoint per scaricare PDF
2. ✅ **Right to Erasure**: Soft delete (deletedAt)
3. ✅ **Data Minimization**: Solo dati necessari nel PDF
4. ✅ **Audit Log**: Tracking completo accessi
5. ✅ **Encryption at Rest**: File system encrypted (production)
6. ✅ **Encryption in Transit**: HTTPS only (production)

**Retention Policy**:
```javascript
// Delete old documents (90 days)
const oldDocuments = await prisma.generatedDocument.updateMany({
  where: {
    generatedAt: {
      lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    }
  },
  data: {
    deletedAt: new Date()
  }
});
```

---

## Deployment

### Local Environment

```bash
cd backend

# 1. Apply migration
npx prisma migrate dev

# 2. Deploy template
psql $DATABASE_URL -f scripts/insert-preventivo-template-local.sql

# 3. Test generation
node test-pdf-generation.js

# 4. Start backend
npm run dev
```

### Production (Supabase)

```bash
# 1. Get production tenant ID
psql $SUPABASE_DATABASE_URL -c "SELECT id FROM \"Tenant\" LIMIT 1;"

# 2. Update SQL script with production tenant ID
sed -i "s/21ec594c-efc3-4300-bfa8-b43307a80c9b/<PROD_TENANT_ID>/g" \
  scripts/insert-preventivo-template-local.sql

# 3. Deploy to Supabase
psql $SUPABASE_DATABASE_URL -f scripts/insert-preventivo-template-local.sql

# 4. Verify
psql $SUPABASE_DATABASE_URL -c \
  "SELECT id, name, type FROM \"TemplateLink\" WHERE type='PREVENTIVO';"

# 5. Test in production
curl -X POST https://your-domain.com/api/preventivi/{id}/pdf \
  -H "Authorization: Bearer $PROD_TOKEN" \
  -o test.pdf
```

### Hetzner Deployment

```bash
# SSH to server
ssh root@your-hetzner-server.com

# Navigate to project
cd /opt/elementmedica

# Pull changes
git pull origin main

# Restart backend
docker-compose restart api-server

# Check logs
docker-compose logs -f api-server
```

---

## Appendici

### A. Template SQL Script

```sql
-- File: backend/scripts/insert-preventivo-template-local.sql
-- Full script available in repository
```

### B. Marker Resolver Integration

```javascript
// File: backend/services/markerResolver.js
// Lines 200-300: Preventivo markers

case 'preventivo':
  if (path[1] === 'numeroProgressivo') {
    return context.preventivo?.numeroProgressivo || '';
  }
  if (path[1] === 'importoFinale') {
    return context.preventivo?.importoFinale?.toString() || '0';
  }
  // ... 21 more cases
```

### C. GeneratedDocument Schema

```prisma
model GeneratedDocument {
  id              String         @id @default(uuid())
  templateId      String
  templateVersion Int
  type            TemplateType   // PREVENTIVO
  entityType      String         // 'PREVENTIVO'
  entityId        String         // Preventivo.id
  filename        String
  filepath        String
  fileUrl         String
  fileSize        Int
  fileHash        String?
  mimeType        String         @default("application/pdf")
  markers         Json
  metadata        Json?
  status          DocumentStatus @default(GENERATED)
  
  // Download tracking
  downloadCount   Int            @default(0)
  lastDownloadAt  DateTime?
  
  // Audit
  generatedBy     String
  generatedAt     DateTime       @default(now())
  tenantId        String
  deletedAt       DateTime?
  
  // Relations
  template        TemplateLink   @relation(...)
  generator       Person         @relation(...)
  tenant          Tenant         @relation(...)
}
```

---

**Fine Documentazione**

Per domande o supporto:
- **Email**: dev@elementmedica.com
- **Slack**: #pdf-generation
- **GitHub Issues**: https://github.com/ElementSoftwareMedica/ElementMedica/issues

**Ultima modifica**: 9 Novembre 2025  
**Versione**: 1.0
