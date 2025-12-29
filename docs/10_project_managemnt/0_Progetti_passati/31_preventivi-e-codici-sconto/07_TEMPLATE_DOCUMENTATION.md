# 📄 Documentazione Template HTML Preventivo

**File**: `public/templates/preventivo-professionale.html`  
**Versione**: 1.0  
**Data**: 8 Novembre 2025  
**Supporto Servizi**: Corsi, DVR, RSPP, Medico Competente, Altri

---

## 📋 Indice

1. [Panoramica](#panoramica)
2. [Markers Disponibili](#markers-disponibili)
3. [Markers Condizionali](#markers-condizionali)
4. [Personalizzazione](#personalizzazione)
5. [Esempi di Utilizzo](#esempi-di-utilizzo)
6. [Generazione PDF](#generazione-pdf)
7. [FAQ](#faq)

---

## 🎯 Panoramica

Il template HTML professionale supporta la generazione di preventivi per **5 tipologie di servizi**:

1. **Corsi di Formazione** - Con prezzi variabili per persona/gruppo
2. **Valutazione Rischi (DVR)** - Documento valutazione rischi
3. **Nomina RSPP** - Responsabile Servizio Prevenzione Protezione
4. **Nomina Medico Competente** - Sorveglianza sanitaria
5. **Altri Servizi** - Servizi personalizzati

### Caratteristiche

✅ Design professionale ed elegante  
✅ Supporto multi-servizio con markers condizionali  
✅ Sezione sconti applicati  
✅ Calcolo automatico IVA  
✅ Responsive (web + stampa)  
✅ Pronto per conversione PDF  
✅ Facilmente personalizzabile  
✅ Logo e branding aziendale  

---

## 🏷️ Markers Disponibili

### Markers Header

| Marker | Descrizione | Esempio |
|--------|-------------|---------|
| `{{LOGO_URL}}` | URL logo aziendale | `/uploads/logo-azienda.png` |
| `{{NUMERO}}` | Numero preventivo | `PREV-2025-0042` |
| `{{DATA_EMISSIONE}}` | Data emissione | `08/11/2025` |

### Markers Fornitore (Nostra Azienda)

| Marker | Descrizione | Esempio |
|--------|-------------|---------|
| `{{COMPANY_NAME}}` | Nome azienda | `Element Medica S.r.l.` |
| `{{COMPANY_ADDRESS}}` | Indirizzo | `Via Roma, 123` |
| `{{COMPANY_CAP}}` | CAP | `00100` |
| `{{COMPANY_CITY}}` | Città | `Milano` |
| `{{COMPANY_PROVINCIA}}` | Provincia | `MI` |
| `{{COMPANY_PIVA}}` | Partita IVA | `12345678901` |
| `{{COMPANY_CF}}` | Codice Fiscale | `12345678901` |
| `{{COMPANY_PHONE}}` | Telefono | `+39 02 1234567` |
| `{{COMPANY_EMAIL}}` | Email | `info@elementmedica.it` |
| `{{COMPANY_PEC}}` | PEC | `elementmedica@pec.it` |
| `{{COMPANY_WEB}}` | Sito web (opzionale) | `www.elementmedica.it` |

### Markers Cliente

| Marker | Descrizione | Esempio |
|--------|-------------|---------|
| `{{CLIENT_NAME}}` | Nome cliente | `Acme Corp S.r.l.` |
| `{{CLIENT_ADDRESS}}` | Indirizzo | `Via Milano, 45` |
| `{{CLIENT_CAP}}` | CAP | `20100` |
| `{{CLIENT_CITY}}` | Città | `Milano` |
| `{{CLIENT_PROVINCIA}}` | Provincia | `MI` |
| `{{CLIENT_PIVA}}` | Partita IVA (se azienda) | `98765432109` |
| `{{CLIENT_CF}}` | Codice Fiscale | `RSSMRA80A01F205X` |
| `{{CLIENT_SDI}}` | Codice SDI (se azienda) | `A1B2C3D` |
| `{{CLIENT_PHONE}}` | Telefono | `+39 02 9876543` |
| `{{CLIENT_EMAIL}}` | Email | `info@acmecorp.it` |

### Markers Servizio Generico

| Marker | Descrizione | Esempio |
|--------|-------------|---------|
| `{{SERVICE_TYPE_LABEL}}` | Etichetta tipo servizio | `Corso di Formazione` |
| `{{PREZZO_UNITARIO}}` | Prezzo unitario | `120.00` |
| `{{PREZZO_TOTALE}}` | Prezzo totale (no sconti) | `1,440.00` |
| `{{IMPORTO_FINALE}}` | Importo finale (con sconti) | `1,224.00` |

### Markers Corso di Formazione

| Marker | Descrizione | Esempio |
|--------|-------------|---------|
| `{{CORSO_TITOLO}}` | Titolo corso | `Sicurezza sul Lavoro Base` |
| `{{CORSO_DESCRIZIONE}}` | Descrizione completa | `Corso obbligatorio...` |
| `{{CORSO_DESCRIZIONE_BREVE}}` | Descrizione breve (tabella) | `Formazione obbligatoria` |
| `{{CORSO_DURATA}}` | Durata in ore | `8` |
| `{{CORSO_PARTECIPANTI}}` | Numero partecipanti | `12` |
| `{{CORSO_MODALITA}}` | Modalità erogazione | `Presenza / Online / Ibrida` |
| `{{CORSO_DATE_INIZIO}}` | Data inizio (opzionale) | `15/01/2025` |
| `{{CORSO_DATE_FINE}}` | Data fine (opzionale) | `20/01/2025` |
| `{{CORSO_SEDE}}` | Sede corso (opzionale) | `Milano, Via Roma 123` |

### Markers DVR (Valutazione Rischi)

| Marker | Descrizione | Esempio |
|--------|-------------|---------|
| `{{DVR_AZIENDA}}` | Nome azienda da valutare | `Acme Corp S.r.l.` |
| `{{DVR_NUM_DIPENDENTI}}` | Numero dipendenti | `25` |
| `{{DVR_SETTORE}}` | Settore attività | `Metalmeccanico` |
| `{{DVR_NUM_SEDI}}` | Numero sedi da valutare | `2` |
| `{{DVR_TEMPI_CONSEGNA}}` | Tempi consegna DVR | `30 giorni lavorativi` |

### Markers RSPP

| Marker | Descrizione | Esempio |
|--------|-------------|---------|
| `{{RSPP_AZIENDA}}` | Nome azienda | `Acme Corp S.r.l.` |
| `{{RSPP_NUM_DIPENDENTI}}` | Numero dipendenti | `25` |
| `{{RSPP_CLASSE_RISCHIO}}` | Classe rischio | `Medio / Alto / Basso` |
| `{{RSPP_DURATA}}` | Durata incarico (mesi) | `12` |
| `{{RSPP_PERIODICITA_VISITE}}` | Periodicità visite | `Trimestrale` |

### Markers Medico Competente

| Marker | Descrizione | Esempio |
|--------|-------------|---------|
| `{{MEDICO_AZIENDA}}` | Nome azienda | `Acme Corp S.r.l.` |
| `{{MEDICO_NUM_DIPENDENTI}}` | Numero dipendenti | `25` |
| `{{MEDICO_TIPO_VISITE}}` | Tipologia visite | `Preassuntive, Periodiche, Idoneità` |
| `{{MEDICO_FREQUENZA}}` | Frequenza visite annue | `Annuale / Biennale` |
| `{{MEDICO_SEDE}}` | Sede visite | `Presso azienda cliente` |

### Markers Altro Servizio

| Marker | Descrizione | Esempio |
|--------|-------------|---------|
| `{{ALTRO_SERVIZIO_NOME}}` | Nome servizio | `Consulenza Sicurezza` |
| `{{ALTRO_SERVIZIO_DESCRIZIONE}}` | Descrizione | `Consulenza personalizzata...` |
| `{{ALTRO_QUANTITA}}` | Quantità | `10` |

### Markers Sconti

| Marker | Descrizione | Esempio |
|--------|-------------|---------|
| `{{SCONTO_TOTALE}}` | Somma sconti applicati | `216.00` |
| `{{SCONTO_1_CODICE}}` | Codice primo sconto | `PROMO2025` |
| `{{SCONTO_1_DESCRIZIONE}}` | Descrizione primo sconto | `Sconto 10% Promo` |
| `{{SCONTO_1_IMPORTO}}` | Importo primo sconto | `144.00` |
| `{{SCONTO_2_CODICE}}` | Codice secondo sconto | `VIP50` |
| `{{SCONTO_2_DESCRIZIONE}}` | Descrizione secondo sconto | `Sconto VIP` |
| `{{SCONTO_2_IMPORTO}}` | Importo secondo sconto | `50.00` |
| `{{SCONTO_3_CODICE}}` | Codice terzo sconto | `FEDELE20` |
| `{{SCONTO_3_DESCRIZIONE}}` | Descrizione terzo sconto | `Sconto Fedeltà` |
| `{{SCONTO_3_IMPORTO}}` | Importo terzo sconto | `22.00` |

**Note**: Supporto fino a 3 sconti cumulabili. Se servono più sconti, aggiungere markers `SCONTO_4`, `SCONTO_5`, etc.

### Markers Totali & IVA

| Marker | Descrizione | Esempio |
|--------|-------------|---------|
| `{{IVA_PERCENTUALE}}` | Percentuale IVA | `22` |
| `{{IVA_IMPORTO}}` | Importo IVA | `269.28` |
| `{{TOTALE_IVA_INCLUSA}}` | Totale con IVA | `1,493.28` |

### Markers Condizioni & Note

| Marker | Descrizione | Esempio |
|--------|-------------|---------|
| `{{CONDIZIONI_PAGAMENTO}}` | Condizioni pagamento | `50% anticipo, saldo a fine corso` |
| `{{NOTE}}` | Note aggiuntive (opzionale) | `Il corso include...` |
| `{{DATA_SCADENZA}}` | Data scadenza preventivo | `08/12/2025` |

---

## 🔀 Markers Condizionali

I markers condizionali permettono di mostrare/nascondere sezioni del template in base al tipo di servizio.

### Sintassi

```html
{{#IF_CONDITION}}
  <!-- Contenuto mostrato solo se condizione vera -->
{{/IF_CONDITION}}
```

### Condizioni Disponibili

#### Tipo Cliente

```html
{{#IF_AZIENDA}}
  <!-- Mostrato solo per clienti azienda -->
  <p>P.IVA: {{CLIENT_PIVA}}</p>
  <p>Codice SDI: {{CLIENT_SDI}}</p>
{{/IF_AZIENDA}}

{{#IF_PERSONA}}
  <!-- Mostrato solo per clienti persona fisica -->
  <p>C.F.: {{CLIENT_CF}}</p>
{{/IF_PERSONA}}
```

#### Tipo Servizio

```html
{{#IF_CORSO}}
  <!-- Sezione corso di formazione -->
  <p>Durata: {{CORSO_DURATA}} ore</p>
{{/IF_CORSO}}

{{#IF_DVR}}
  <!-- Sezione DVR -->
  <p>Numero sedi: {{DVR_NUM_SEDI}}</p>
{{/IF_DVR}}

{{#IF_RSPP}}
  <!-- Sezione RSPP -->
  <p>Durata incarico: {{RSPP_DURATA}} mesi</p>
{{/IF_RSPP}}

{{#IF_MEDICO}}
  <!-- Sezione Medico Competente -->
  <p>Tipologia visite: {{MEDICO_TIPO_VISITE}}</p>
{{/IF_MEDICO}}

{{#IF_ALTRO}}
  <!-- Sezione altro servizio -->
  <p>Servizio: {{ALTRO_SERVIZIO_NOME}}</p>
{{/IF_ALTRO}}
```

#### Elementi Opzionali

```html
{{#IF_SCONTI}}
  <!-- Mostrato solo se ci sono sconti applicati -->
  <div class="discounts-section">...</div>
{{/IF_SCONTI}}

{{#IF_NOTE}}
  <!-- Mostrato solo se ci sono note -->
  <div class="notes-section">...</div>
{{/IF_NOTE}}

{{#IF_CORSO_DATE}}
  <!-- Mostrato solo se corso ha date confermate -->
  <p>Date: {{CORSO_DATE_INIZIO}} - {{CORSO_DATE_FINE}}</p>
{{/IF_CORSO_DATE}}

{{#IF_COMPANY_WEB}}
  <!-- Mostrato solo se azienda ha sito web -->
  <p>Web: {{COMPANY_WEB}}</p>
{{/IF_COMPANY_WEB}}
```

---

## 🎨 Personalizzazione

### 1. Logo Aziendale

Sostituisci il marker `{{LOGO_URL}}` con il path del tuo logo:

```html
<img src="/uploads/logos/elementmedica-logo.png" alt="Element Medica" />
```

**Formati Supportati**: PNG, JPG, SVG  
**Dimensioni Consigliate**: 200x80px (proporzioni 2.5:1)  
**Posizionamento**: Top-left header

### 2. Colori Aziendali

Modifica le variabili CSS per personalizzare i colori:

```css
/* Colore primario (header, titoli, accenti) */
--color-primary: #3b82f6;  /* Blu Element Medica */

/* Colore primario scuro (footer, totali) */
--color-primary-dark: #1e40af;

/* Colore bordi e separatori */
--border-color: #e5e7eb;

/* Colore background sezioni */
--background-light: #f7fafc;
```

**Esempio Personalizzazione Brand**:

```css
/* Brand rosso */
:root {
  --color-primary: #dc2626;
  --color-primary-dark: #991b1b;
}

/* Brand verde */
:root {
  --color-primary: #059669;
  --color-primary-dark: #047857;
}
```

### 3. Font

Cambia i font nel CSS:

```css
body {
  font-family: 'Helvetica Neue', Arial, sans-serif;
}

/* Per un look più moderno */
body {
  font-family: 'Inter', 'Roboto', sans-serif;
}

/* Per un look più tradizionale */
body {
  font-family: 'Georgia', 'Times New Roman', serif;
}
```

### 4. Layout

Modifica spaziature e dimensioni:

```css
/* Padding generale documento */
body {
  padding: 30mm;  /* Default: 20mm */
}

/* Dimensione font base */
body {
  font-size: 12pt;  /* Default: 11pt */
}

/* Logo più grande */
.header-logo {
  flex: 0 0 250px;  /* Default: 200px */
}
```

---

## 💡 Esempi di Utilizzo

### Esempio 1: Preventivo Corso di Formazione

```javascript
const markers = {
  // Header
  LOGO_URL: '/uploads/logo.png',
  NUMERO: 'PREV-2025-0001',
  DATA_EMISSIONE: '08/11/2025',
  
  // Fornitore
  COMPANY_NAME: 'Element Medica S.r.l.',
  COMPANY_ADDRESS: 'Via Roma, 123',
  COMPANY_CAP: '00100',
  COMPANY_CITY: 'Milano',
  COMPANY_PROVINCIA: 'MI',
  COMPANY_PIVA: '12345678901',
  COMPANY_CF: '12345678901',
  COMPANY_PHONE: '+39 02 1234567',
  COMPANY_EMAIL: 'info@elementmedica.it',
  COMPANY_PEC: 'elementmedica@pec.it',
  
  // Cliente
  CLIENT_NAME: 'Acme Corp S.r.l.',
  CLIENT_ADDRESS: 'Via Milano, 45',
  CLIENT_CAP: '20100',
  CLIENT_CITY: 'Milano',
  CLIENT_PROVINCIA: 'MI',
  CLIENT_PIVA: '98765432109',
  CLIENT_CF: '98765432109',
  CLIENT_SDI: 'A1B2C3D',
  CLIENT_PHONE: '+39 02 9876543',
  CLIENT_EMAIL: 'info@acmecorp.it',
  
  // Servizio
  SERVICE_TYPE_LABEL: 'Corso di Formazione',
  
  // Corso
  CORSO_TITOLO: 'Sicurezza sul Lavoro - Formazione Base',
  CORSO_DESCRIZIONE: 'Corso di formazione obbligatoria per lavoratori ai sensi del D.Lgs 81/08',
  CORSO_DESCRIZIONE_BREVE: 'Formazione obbligatoria D.Lgs 81/08',
  CORSO_DURATA: '8',
  CORSO_PARTECIPANTI: '12',
  CORSO_MODALITA: 'Presenza',
  CORSO_DATE_INIZIO: '15/01/2025',
  CORSO_DATE_FINE: '20/01/2025',
  CORSO_SEDE: 'Sede cliente - Milano, Via Milano 45',
  
  // Prezzi
  PREZZO_UNITARIO: '120.00',
  PREZZO_TOTALE: '1,440.00',
  
  // Sconti
  SCONTO_1_CODICE: 'PROMO2025',
  SCONTO_1_DESCRIZIONE: 'Sconto promozionale 10%',
  SCONTO_1_IMPORTO: '144.00',
  SCONTO_TOTALE: '144.00',
  
  // Totali
  IMPORTO_FINALE: '1,296.00',
  IVA_PERCENTUALE: '22',
  IVA_IMPORTO: '285.12',
  TOTALE_IVA_INCLUSA: '1,581.12',
  
  // Condizioni
  CONDIZIONI_PAGAMENTO: '50% anticipo alla conferma, saldo entro 30 giorni da fine corso',
  DATA_SCADENZA: '08/12/2025',
  
  // Condizioni booleane
  IF_AZIENDA: true,
  IF_CORSO: true,
  IF_SCONTI: true,
  IF_CORSO_DATE: true
};
```

### Esempio 2: Preventivo DVR

```javascript
const markers = {
  // ... header e aziende come sopra ...
  
  // Servizio
  SERVICE_TYPE_LABEL: 'Valutazione dei Rischi (DVR)',
  
  // DVR
  DVR_AZIENDA: 'Acme Corp S.r.l.',
  DVR_NUM_DIPENDENTI: '25',
  DVR_SETTORE: 'Metalmeccanico',
  DVR_NUM_SEDI: '2',
  DVR_TEMPI_CONSEGNA: '30 giorni lavorativi',
  
  // Prezzi
  PREZZO_UNITARIO: '1,500.00',
  PREZZO_TOTALE: '1,500.00',
  IMPORTO_FINALE: '1,500.00',
  IVA_PERCENTUALE: '22',
  IVA_IMPORTO: '330.00',
  TOTALE_IVA_INCLUSA: '1,830.00',
  
  // Condizioni
  CONDIZIONI_PAGAMENTO: '50% anticipo, saldo alla consegna DVR',
  DATA_SCADENZA: '08/12/2025',
  
  // Condizioni booleane
  IF_AZIENDA: true,
  IF_DVR: true,
  IF_SCONTI: false
};
```

### Esempio 3: Preventivo RSPP (Abbonamento Mensile)

```javascript
const markers = {
  // ... header e aziende come sopra ...
  
  // Servizio
  SERVICE_TYPE_LABEL: 'Servizio RSPP Esterno',
  
  // RSPP
  RSPP_AZIENDA: 'Acme Corp S.r.l.',
  RSPP_NUM_DIPENDENTI: '25',
  RSPP_CLASSE_RISCHIO: 'Medio',
  RSPP_DURATA: '12',
  RSPP_PERIODICITA_VISITE: 'Trimestrale',
  
  // Prezzi
  PREZZO_UNITARIO: '350.00',  // al mese
  PREZZO_TOTALE: '4,200.00',  // 12 mesi
  IMPORTO_FINALE: '4,200.00',
  IVA_PERCENTUALE: '22',
  IVA_IMPORTO: '924.00',
  TOTALE_IVA_INCLUSA: '5,124.00',
  
  // Condizioni
  CONDIZIONI_PAGAMENTO: 'Pagamento mensile anticipato, primo mese alla firma del contratto',
  NOTE: 'Il servizio include: 4 visite annuali presso la sede, consulenza telefonica illimitata, aggiornamento DVR, assistenza per verbali e documentazione obbligatoria.',
  DATA_SCADENZA: '08/12/2025',
  
  // Condizioni booleane
  IF_AZIENDA: true,
  IF_RSPP: true,
  IF_SCONTI: false,
  IF_NOTE: true
};
```

---

## 🖨️ Generazione PDF

### Backend Service (Node.js + Puppeteer)

```javascript
// backend/services/templatePreventivoService.js

import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';

export class TemplatePreventivoService {
  async generaPdfPreventivo(markers) {
    // 1. Leggi template HTML
    const templatePath = path.join(__dirname, '../../public/templates/preventivo-professionale.html');
    let htmlContent = await fs.readFile(templatePath, 'utf-8');
    
    // 2. Sostituisci markers
    htmlContent = this.replaceMarkers(htmlContent, markers);
    
    // 3. Genera PDF con Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setContent(htmlContent, {
      waitUntil: 'networkidle0'
    });
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '10mm',
        right: '10mm',
        bottom: '10mm',
        left: '10mm'
      }
    });
    
    await browser.close();
    
    // 4. Salva PDF su disco
    const fileName = `preventivo-${markers.NUMERO}.pdf`;
    const filePath = path.join(__dirname, '../../uploads/preventivi', fileName);
    await fs.writeFile(filePath, pdfBuffer);
    
    return {
      filePath,
      fileName,
      fileSize: pdfBuffer.length
    };
  }
  
  replaceMarkers(html, markers) {
    let result = html;
    
    // Sostituisci markers semplici
    Object.entries(markers).forEach(([key, value]) => {
      if (typeof value === 'string' || typeof value === 'number') {
        const regex = new RegExp(`{{${key}}}`, 'g');
        result = result.replace(regex, value);
      }
    });
    
    // Gestisci markers condizionali
    result = this.handleConditionalMarkers(result, markers);
    
    return result;
  }
  
  handleConditionalMarkers(html, markers) {
    let result = html;
    
    // Pattern: {{#IF_CONDITION}}content{{/IF_CONDITION}}
    const conditionalRegex = /{{#(IF_\w+)}}([\s\S]*?){{\/\1}}/g;
    
    result = result.replace(conditionalRegex, (match, condition, content) => {
      // Se la condizione è vera, mantieni il contenuto
      if (markers[condition]) {
        return content;
      }
      // Altrimenti rimuovi tutto
      return '';
    });
    
    return result;
  }
}
```

### Esempio Utilizzo

```javascript
import { TemplatePreventivoService } from './services/templatePreventivoService.js';

const service = new TemplatePreventivoService();

// Genera PDF
const pdf = await service.generaPdfPreventivo({
  NUMERO: 'PREV-2025-0001',
  // ... altri markers
  IF_CORSO: true,
  IF_AZIENDA: true
});

console.log('PDF generato:', pdf.filePath);
```

---

## ❓ FAQ

### 1. Come aggiungo un nuovo marker?

**Passo 1**: Aggiungi il marker nel template HTML:
```html
<p>Nuova info: {{NUOVO_MARKER}}</p>
```

**Passo 2**: Passa il valore nel servizio:
```javascript
const markers = {
  NUOVO_MARKER: 'Valore del marker'
};
```

### 2. Come aggiungo più sconti?

Duplica la sezione sconto nel template:

```html
{{#SCONTO_4}}
<div class="discount-item">
  <div>
    <span class="discount-code">{{SCONTO_4_CODICE}}</span>
    <div class="discount-description">{{SCONTO_4_DESCRIZIONE}}</div>
  </div>
  <div class="discount-amount">-€ {{SCONTO_4_IMPORTO}}</div>
</div>
{{/SCONTO_4}}
```

### 3. Come cambio il logo?

Sostituisci il file in `/public/uploads/logos/` e aggiorna il marker:
```javascript
markers.LOGO_URL = '/uploads/logos/mio-logo.png';
```

### 4. Il PDF non mostra le immagini, perché?

Assicurati che:
- Il path dell'immagine sia assoluto o relativo alla root del server
- L'immagine sia accessibile via HTTP quando Puppeteer genera il PDF
- Le dimensioni dell'immagine siano ragionevoli (<5MB)

### 5. Come rendo il preventivo multilingua?

Crea un template per ogni lingua (es. `preventivo-en.html`, `preventivo-it.html`) e seleziona il template giusto in base alla lingua del cliente:

```javascript
const templatePath = markers.LINGUA === 'en' 
  ? 'preventivo-en.html' 
  : 'preventivo-it.html';
```

### 6. Posso usare markdown nei markers?

No, i markers supportano solo testo plain o HTML. Se vuoi formattazione, usa HTML direttamente:

```javascript
markers.NOTE = 'Il corso include:<br/>• Materiale didattico<br/>• Attestato finale';
```

### 7. Come testo il template senza generare PDF?

Apri il file HTML direttamente nel browser e usa JavaScript console per sostituire i markers:

```javascript
// Nel browser
document.body.innerHTML = document.body.innerHTML
  .replace(/{{NUMERO}}/g, 'PREV-2025-0001')
  .replace(/{{CORSO_TITOLO}}/g, 'Test Corso');
```

---

## 📞 Supporto

Per domande o problemi:
- **Email**: dev@elementmedica.it
- **Documentazione**: `/docs/10_project_management/preventivi-e-codici-sconto/`
- **Repository**: GitHub Element Medica

---

**Versione**: 1.0  
**Ultimo Aggiornamento**: 8 Novembre 2025  
**Autore**: Element Medica Dev Team
