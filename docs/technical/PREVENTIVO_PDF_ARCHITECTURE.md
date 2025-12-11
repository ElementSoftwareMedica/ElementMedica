# Architettura PDF Preventivo - Analisi E2E

## 📋 Overview

Questo documento descrive l'architettura completa per la generazione del PDF Preventivo, identificando tutti i file coinvolti e come intervenire per modificare layout, stile e contenuto.

---

## 🔄 Flusso di Generazione PDF

```
1. Frontend (PreventiviPage.tsx)
   └─> Chiama /api/v1/preventivi/:id/pdf

2. Backend Route (preventivi-routes.js)
   └─> Chiama preventiviService.generatePDF()

3. Preventivi Service (preventivi-service.js)
   ├─> Carica Preventivo + relazioni (azienda, persona, corso, sconti)
   ├─> Trova Template PREVENTIVO attivo (TemplateLink)
   ├─> Costruisce markerData con _buildMarkerData()
   └─> Chiama documentService.generateDocument()

4. Document Service (documentService.js)
   ├─> Risolve markers con MarkerResolver
   ├─> Compila template Handlebars
   ├─> Applica layout (margini, formato)
   └─> Genera PDF con Puppeteer (_generatePdfFromHtml)

5. PDF Service (pdfService.js)
   └─> Usa browser pool Puppeteer per rendering
```

---

## 📁 File Coinvolti

### 1. Template HTML (Database: TemplateLink)
**Dove**: Tabella `TemplateLink` con `type: 'PREVENTIVO'`
**Campo**: `content` contiene l'HTML del template
**Script aggiornamento**: `backend/scripts/update-preventivo-template-v9.cjs`

**Cosa modificare qui**:
- Struttura HTML del documento
- CSS (font, colori, spacing, tabella)
- Layout delle sezioni
- Sintassi Handlebars: `{{preventivo.xxx}}`, `{{#each voci}}`

### 2. Marker Data (preventivi-service.js)
**Funzione**: `_buildMarkerData(preventivo)`
**Linee**: ~770-970

**Markers disponibili nel template**:
```javascript
// Dati Preventivo
{{preventivo.id}}
{{preventivo.numeroProgressivo}}
{{preventivo.annoProgressivo}}
{{preventivo.stato}}
{{preventivo.dataCreazione}}
{{preventivo.dataEmissione}}
{{preventivo.dataValidita}}
{{preventivo.tipoServizio}}
{{preventivo.titoloServizio}}
{{preventivo.prezzoTotale}}
{{preventivo.subtotale}}           // Prezzo originale (prima sconto)
{{preventivo.scontoApplicato}}     // Boolean: true se c'è sconto
{{preventivo.codiceSconto}}
{{preventivo.scontoPercentuale}}
{{preventivo.importoSconto}}
{{preventivo.imponibile}}          // Prezzo dopo sconto
{{preventivo.aliquotaIva}}
{{preventivo.importoIva}}
{{preventivo.importoFinale}}
{{preventivo.note}}

// Array Voci (per {{#each voci}})
{{numero}}
{{descrizione}}
{{quantita}}
{{prezzoUnitario}}
{{subtotale}}

// Dati Cliente (azienda)
{{cliente.nome}}
{{cliente.ragioneSociale}}
{{cliente.partitaIva}}
{{cliente.codiceFiscale}}
{{cliente.indirizzoCompleto}}
{{cliente.email}}
{{cliente.telefono}}

// Dati Corso (se presente)
{{corso.title}}
{{corso.code}}
{{corso.duration}}
```

### 3. Margini PDF (documentService.js)
**Funzione**: `_buildPdfOptions()`
**Linee**: ~1785-1810

**Valori attuali per PREVENTIVO**:
```javascript
top: '10mm'
bottom: '10mm'
left: '8mm'
right: '8mm'
```

**Per ridurre ulteriormente**:
```javascript
// In documentService.js linea 1795-1798
top: layout.margins?.top || (isPreventivo ? '5mm' : ...)
bottom: layout.margins?.bottom || (isPreventivo ? '5mm' : ...)
left: layout.margins?.left || (isPreventivo ? '6mm' : ...)
right: layout.margins?.right || (isPreventivo ? '6mm' : ...)
```

### 4. Header/Footer PDF
**Dove**: TemplateLink campi `header` e `footer`
**Nota**: Se vuoti, Puppeteer usa spazio minimo

---

## 🎨 Modifiche per Layout Single-Page

### Problema: PDF su 3 pagine invece di 1
**Cause possibili**:
1. Font size troppo grande
2. Line-height troppo alto
3. Padding/margin eccessivi nelle sezioni
4. Tabella con celle troppo alte

### Soluzioni (nel template HTML):

#### 1. Riduci Font Size
```css
body {
  font-size: 8pt;  /* Da 9pt o più */
  line-height: 1.2;  /* Da 1.4 o più */
}
```

#### 2. Riduci Padding Sezioni
```css
.info-box {
  padding: 4px 6px;  /* Da 8px 12px */
}

.service-box {
  padding: 4px 8px;  /* Da 8px 12px */
  margin-bottom: 6px;  /* Da 10px */
}
```

#### 3. Tabella Compatta
```css
.items-table th,
.items-table td {
  padding: 3px 4px;  /* Da 6px 8px */
}

.items-table {
  font-size: 7.5pt;  /* Da 8pt */
}
```

#### 4. Totali Compatti
```css
.totals-box {
  width: 200px;  /* Da 240px */
}

.total-row {
  padding: 3px 6px;  /* Da 6px 10px */
}
```

#### 5. Condizioni in Fondo - Ultra Compatte
```css
.conditions {
  font-size: 6.5pt;  /* Molto piccolo */
  line-height: 1.15;
  padding: 4px 6px;
  margin-top: 4px;
}
```

---

## 🔧 Come Applicare Modifiche

### Metodo 1: Script Database
Creare/eseguire script come `update-preventivo-template-v10.cjs`:
```javascript
const TEMPLATE_V10 = `<!DOCTYPE html>...`;

await prisma.templateLink.updateMany({
  where: { type: 'PREVENTIVO', tenantId },
  data: { content: TEMPLATE_V10, version: 10 }
});
```

### Metodo 2: Admin UI
Usare l'editor template nel pannello admin (se disponibile)

### Metodo 3: Modifica Margini
Editare `documentService.js` linee 1795-1798

---

## 📊 Checklist Single-Page

- [ ] Font body: 8pt max
- [ ] Line-height: 1.2 max
- [ ] Padding header: 4-6px
- [ ] Padding info-box: 4-6px
- [ ] Tabella padding: 3-4px
- [ ] Totals width: 200px max
- [ ] Conditions font: 6.5pt
- [ ] Margini PDF: 5-8mm

---

## 🧪 Testing

1. Genera PDF da UI: `Preventivi > Azione > Scarica PDF`
2. Controlla pagine nel viewer PDF
3. Se >1 pagina:
   - Riduci font/padding nel template
   - Riduci margini in documentService.js
   - Riesegui script aggiornamento template

---

## 📝 Note Importanti

1. **Puppeteer Rendering**: Il PDF viene renderizzato in headless Chrome. Alcune proprietà CSS potrebbero comportarsi diversamente.

2. **A4 Dimensions**: 210mm x 297mm. Con margini 10mm = 190mm x 277mm area stampabile.

3. **Break Page**: Evita `page-break-before` o `page-break-after` se vuoi single page.

4. **Debug**: Aggiungere `logger.debug` in `generatePDF` per vedere HTML generato prima di conversione PDF.
