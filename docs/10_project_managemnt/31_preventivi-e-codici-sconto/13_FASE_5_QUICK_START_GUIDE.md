# FASE 5: Quick Start Guide - Deploy & Test PDF Generation

**Prerequisiti:**
- Database Supabase operativo
- Backend API running (port 4001)
- Frontend running (port 5173)
- Tenant ID disponibile

---

## 🚀 Step 1: Deploy Template SQL

### Opzione A: Supabase SQL Editor (Recommended)

1. **Login Supabase Dashboard:**
   ```
   https://app.supabase.com/project/YOUR_PROJECT_ID
   ```

2. **Open SQL Editor** (barra laterale sinistra)

3. **Copia contenuto file:**
   ```bash
   cat backend/scripts/insert-preventivo-template.sql
   ```

4. **Sostituisci `{TENANT_ID}`:**
   ```sql
   -- Trova tenant ID:
   SELECT id, name FROM "Tenant" LIMIT 5;
   
   -- Esempio: sostituisci {TENANT_ID} con:
   '123e4567-e89b-12d3-a456-426614174000'
   ```

5. **Esegui Query** → Click "Run"

6. **Verifica:**
   ```sql
   SELECT id, type, name, version, "isActive", "createdAt"
   FROM "DocumentTemplate"
   WHERE type = 'PREVENTIVO'
   ORDER BY "createdAt" DESC
   LIMIT 1;
   ```

   **Expected Output:**
   ```
   id                                   | type       | name                | version | isActive | createdAt
   -------------------------------------|------------|---------------------|---------|----------|-------------------------
   a1b2c3d4-...                        | PREVENTIVO | Preventivo Standard | 1       | true     | 2025-11-08 14:30:00
   ```

---

### Opzione B: CLI psql (Advanced)

```bash
# 1. Connect to Supabase
psql "postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"

# 2. Get tenant ID
SELECT id, name FROM "Tenant" LIMIT 5;

# 3. Edit SQL file (replace {TENANT_ID})
nano backend/scripts/insert-preventivo-template.sql

# 4. Execute
\i backend/scripts/insert-preventivo-template.sql

# 5. Verify
SELECT * FROM "DocumentTemplate" WHERE type = 'PREVENTIVO';
```

---

## 🧪 Step 2: Test API Endpoint

### Con Postman

**1. Create Test Preventivo (se non esiste):**

```http
POST http://localhost:4001/api/preventivi
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN

{
  "aziendaId": "azienda-uuid-here",
  "corsoId": "corso-uuid-here",
  "tipoServizio": "CORSO",
  "prezzoTotale": 2500.00,
  "speseAccessorie": 130.00,
  "numPartecipanti": 5,
  "note": "Test generazione PDF preventivo",
  "aliquotaIva": 22
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "preventivo-uuid-123",
    "numeroProgressivo": 1,
    "annoProgressivo": 2025,
    "stato": "BOZZA",
    "importoFinale": 3111.60
  }
}
```

**2. Generate PDF:**

```http
GET http://localhost:4001/api/preventivi/preventivo-uuid-123/pdf
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response Headers:**
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="Preventivo_001-2025_AziendaXYZ_2025-11-08.pdf"
Content-Length: 245678
```

**Response Body:** PDF binary

**3. Verify PDF:**
- Download PDF da Postman (click "Save Response" → Save to Disk)
- Open PDF → Verificare:
  - ✅ Numero progressivo: 001/2025
  - ✅ Dati azienda corretti
  - ✅ Dettagli corso presenti
  - ✅ Tabella prezzi: 7 righe
  - ✅ Totale finale: € 3.111,60
  - ✅ Footer legale presente

**4. Check Stato Update:**

```http
GET http://localhost:4001/api/preventivi/preventivo-uuid-123
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "preventivo-uuid-123",
    "stato": "INVIATO",  // ← Changed from BOZZA
    "dataInvio": "2025-11-08T14:35:00.000Z"
  }
}
```

---

### Con curl

```bash
# 1. Get JWT token
TOKEN="your-jwt-token-here"

# 2. Create preventivo
PREVENTIVO_ID=$(curl -X POST http://localhost:4001/api/preventivi \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "aziendaId": "azienda-uuid",
    "corsoId": "corso-uuid",
    "tipoServizio": "CORSO",
    "prezzoTotale": 2500.00,
    "numPartecipanti": 5,
    "aliquotaIva": 22
  }' | jq -r '.data.id')

echo "Preventivo ID: $PREVENTIVO_ID"

# 3. Generate PDF
curl -X GET "http://localhost:4001/api/preventivi/$PREVENTIVO_ID/pdf" \
  -H "Authorization: Bearer $TOKEN" \
  --output preventivo-test.pdf

# 4. Open PDF
open preventivo-test.pdf  # macOS
# xdg-open preventivo-test.pdf  # Linux
# start preventivo-test.pdf  # Windows
```

---

## 🌐 Step 3: Test Frontend Integration

### Test da UI

1. **Login:** http://localhost:5173
   - Email: `admin@example.com`
   - Password: `Admin123!`

2. **Navigate to Calendar:**
   ```
   Sidebar → Programmazioni → [Select an event]
   ```

3. **Open Wizard:**
   - Click evento → Opens ScheduleEventModal
   - Navigate to Step 4 "Documenti"

4. **Generate Preventivo:**
   - Scroll to "Preventivi" card
   - Click "Genera Preventivi" button
   - Modal opens with split view
   - Select aziende (check boxes)
   - Set num partecipanti per azienda
   - Enter prezzo unitario: `500`
   - Select tipo servizio: `Formazione (22%)`
   - Add spese accessorie (optional)
   - Apply codice sconto (optional)
   - Click "Genera Preventivi"

5. **Download PDF:**
   - Card "Preventivi" now shows: `2 generati`
   - List with 2 preventivi
   - Click download icon (↓) on first preventivo
   - Browser downloads PDF: `Preventivo_001-2025_AziendaA_2025-11-08.pdf`
   - PDF auto-opens in browser (Chrome/Safari)

6. **Verify PDF Content:**
   - ✅ Header: "PREVENTIVO N. 001/2025"
   - ✅ Dati Cliente section with 6 fields
   - ✅ Dettagli Servizio with partecipanti count
   - ✅ Tabella prezzi with 7 rows
   - ✅ Note box (yellow border)
   - ✅ Footer with validità, accettazione, condizioni

---

## 🐛 Troubleshooting

### Error 1: Template "Preventivo" non trovato

**Causa:** SQL script non eseguito o tenant ID errato

**Fix:**
```sql
-- Check template exists
SELECT * FROM "DocumentTemplate" WHERE type = 'PREVENTIVO';

-- If empty, re-run insert script with correct {TENANT_ID}
```

---

### Error 2: 404 Preventivo non trovato

**Causa:** UUID non valido o tenant isolation

**Fix:**
```bash
# Verify preventivo ID exists
curl -X GET http://localhost:4001/api/preventivi/YOUR_ID \
  -H "Authorization: Bearer $TOKEN"

# Check tenant ID matches
SELECT id, "tenantId" FROM "Preventivo" WHERE id = 'YOUR_ID';
```

---

### Error 3: PDF generation timeout (>30s)

**Causa:** Puppeteer startup lento, template troppo complesso

**Fix:**
```javascript
// Check backend logs
tail -f backend/logs/api-server/api-server-2025-11-08.log

// Increase timeout (pdfService.js)
timeout: 60000  // 60s instead of 30s
```

---

### Error 4: Marker not resolved ({{preventivo.importoFinale}} in PDF)

**Causa:** MarkerResolver non trova dato in context

**Fix:**
```javascript
// Check _buildMarkerData() in preventivi-service.js
console.log('Marker data:', JSON.stringify(markerData, null, 2));

// Verify preventivo has all fields
SELECT 
  id, "prezzoTotale", "imponibile", "importoIva", "importoFinale"
FROM "Preventivo"
WHERE id = 'YOUR_ID';
```

---

### Error 5: Frontend download button not working

**Causa:** CORS, auth token expired, network error

**Fix:**
```javascript
// Check browser console (F12)
// Look for errors in Network tab

// Check preventiviService.ts download() method
const blob = new Blob([response.data], { type: 'application/pdf' });
console.log('Blob size:', blob.size);
```

---

## 📊 Success Criteria

### All checks must pass:

- [ ] Template SQL deployed (verify with SELECT query)
- [ ] Preventivo test created (stato: BOZZA)
- [ ] PDF generated via API (200 status, Content-Type: application/pdf)
- [ ] PDF file size > 50KB (not empty)
- [ ] PDF opens correctly (no corrupted file error)
- [ ] All markers resolved (no `{{preventivo.*}}` text in PDF)
- [ ] Stato updated to INVIATO after generation
- [ ] Frontend download button works (blob download)
- [ ] PDF auto-opens in browser
- [ ] Filename correct: `Preventivo_NNN-YYYY_AziendaName_DATE.pdf`

---

## 🎯 Test Scenarios (Complete 5)

### Scenario 1: Base Preventivo (No Sconto, No Spese)

```json
POST /api/preventivi
{
  "aziendaId": "uuid-1",
  "corsoId": "uuid-2",
  "tipoServizio": "CORSO",
  "prezzoTotale": 1000.00,
  "numPartecipanti": 10,
  "aliquotaIva": 22
}
```

**Expected PDF:**
- Prezzo base: € 1.000,00
- Spese: € 0,00
- Subtotale: € 1.000,00
- Sconto: (hidden row)
- Imponibile: € 1.000,00
- IVA (22%): € 220,00
- **Totale: € 1.220,00**

---

### Scenario 2: Con Sconto PERCENTUALE

```json
POST /api/preventivi
{
  "aziendaId": "uuid-1",
  "corsoId": "uuid-2",
  "tipoServizio": "CORSO",
  "prezzoTotale": 1000.00,
  "numPartecipanti": 10,
  "aliquotaIva": 22
}

POST /api/preventivi/{id}/sconti/apply
{
  "codiceSconto": "SCONTO10"
}
```

**Expected PDF:**
- Prezzo base: € 1.000,00
- Spese: € 0,00
- Subtotale: € 1.000,00
- Sconto (SCONTO10 - 10%): **- € 100,00**
- Imponibile: € 900,00
- IVA (22%): € 198,00
- **Totale: € 1.098,00**

---

### Scenario 3: Multi-Spese Accessorie

```json
POST /api/preventivi
{
  "aziendaId": "uuid-1",
  "corsoId": "uuid-2",
  "tipoServizio": "CORSO",
  "prezzoTotale": 1000.00,
  "speseAccessorie": 250.00,
  "numPartecipanti": 10,
  "note": "Spese accessorie:\n- Materiali didattici: €100\n- Trasferta docente: €80\n- Attestati personalizzati: €70",
  "aliquotaIva": 22
}
```

**Expected PDF:**
- Prezzo base: € 1.000,00
- Spese: **€ 250,00**
- Subtotale: € 1.250,00
- Imponibile: € 1.250,00
- IVA (22%): € 275,00
- **Totale: € 1.525,00**
- Note box: visible with 3 righe spese

---

### Scenario 4: IVA Differenziata (10% Medico Competente)

```json
POST /api/preventivi
{
  "aziendaId": "uuid-1",
  "corsoId": null,
  "tipoServizio": "MEDICO_COMPETENTE",
  "prezzoTotale": 1000.00,
  "numPartecipanti": 50,
  "note": "Visita medica periodica dipendenti",
  "aliquotaIva": 10
}
```

**Expected PDF:**
- Prezzo base: € 1.000,00
- Spese: € 0,00
- Subtotale: € 1.000,00
- Imponibile: € 1.000,00
- IVA (10%): **€ 100,00**
- **Totale: € 1.100,00**
- Corso fields: "N/A" (no corso)

---

### Scenario 5: Edge Case - Persona Fisica (No Azienda)

```json
POST /api/preventivi
{
  "personaId": "uuid-person",
  "corsoId": "uuid-2",
  "tipoServizio": "CORSO",
  "prezzoTotale": 500.00,
  "numPartecipanti": 1,
  "aliquotaIva": 22
}
```

**Expected PDF:**
- Sezione "Dati Cliente": mostra person.* markers invece di azienda.*
- Nome: Mario Rossi
- CF: RSSMRA80A01H501Z
- Email: mario.rossi@example.com
- Indirizzo: Via Roma 1, 20100 Milano (MI)

---

## 📈 Performance Benchmarks

**Target:**
- Generation time: < 3s (from API call to PDF buffer)
- PDF file size: 150-400 KB
- Concurrent requests: 10 users simultaneous (no degradation)

**Monitor:**
```bash
# Check generation time in logs
grep "PDF generated successfully" backend/logs/api-server/*.log | tail -20

# Example output:
# [2025-11-08 14:35:22] PDF generated successfully { preventivoId: '...', fileSize: 287456, duration: 1843ms }
```

---

## ✅ Next Actions

1. **Execute SQL script** → Deploy template
2. **Run 5 test scenarios** → Verify functionality
3. **Measure performance** → < 3s target
4. **Check browser compatibility** → Chrome, Safari, Firefox
5. **Update todo list** → Mark Task 5.4 completed
6. **Proceed to Task 5.5** → Documentation

---

**Good luck! 🚀**

