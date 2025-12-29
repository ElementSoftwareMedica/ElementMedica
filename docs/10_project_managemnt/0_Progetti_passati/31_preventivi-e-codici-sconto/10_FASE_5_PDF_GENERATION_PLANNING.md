# FASE 5: PDF Generation - Planning Dettagliato

**Data Inizio:** 8 Novembre 2025  
**Durata Stimata:** 3-5 giorni  
**Status:** 🚧 IN CORSO

---

## 🎯 Obiettivo

Implementare la generazione automatica di PDF preventivi professionali utilizzando il sistema template esistente (MarkerResolver + DocumentService + PDFService) già configurato per lettere d'incarico, registri presenze e attestati.

---

## 📋 Task Breakdown

### ✅ Task 5.1: Template PDF Design (4-6 ore)

**Obiettivo:** Creare template Google Slides professionale per preventivi

**Deliverables:**
- [ ] Template Google Slides "Preventivo" creato
- [ ] Layout professionale con sezioni chiare
- [ ] Marker mappati nel template
- [ ] Testato importazione template nel sistema

**Template Structure:**
```
┌──────────────────────────────────────────────────────────────┐
│ HEADER                                                       │
│ Logo Azienda | Preventivo N° {{preventivo.numeroProgressivo}}│
│              | Data: {{preventivo.dataEmissione|date}}       │
├──────────────────────────────────────────────────────────────┤
│ DATI CLIENTE                                                 │
│ {{azienda.ragioneSociale}}                                   │
│ P.IVA: {{azienda.partitaIva}}                               │
│ {{azienda.indirizzo}}                                        │
│ {{azienda.citta}}, {{azienda.cap}}                          │
├──────────────────────────────────────────────────────────────┤
│ DETTAGLI CORSO                                               │
│ Titolo: {{corso.title}}                                      │
│ Codice: {{corso.code}}                                       │
│ Date: {{corso.startDate|date}} - {{corso.endDate|date}}     │
│ Durata: {{corso.duration}} ore                               │
├──────────────────────────────────────────────────────────────┤
│ PREZZI                                                       │
│ Prezzo Base:         {{preventivo.prezzoTotale|currency}}    │
│ Spese Accessorie:    {{preventivo.speseAccessorie|currency}} │
│ ─────────────────────────────────────────────────────────────│
│ Subtotale:           {{preventivo.subtotale|currency}}       │
│ Sconto ({{preventivo.scontoPercentuale}}%):                 │
│                      -{{preventivo.importoSconto|currency}}  │
│ ─────────────────────────────────────────────────────────────│
│ Imponibile:          {{preventivo.imponibile|currency}}      │
│ IVA ({{preventivo.percentualeIva}}%):                       │
│                      {{preventivo.importoIva|currency}}      │
│ ═════════════════════════════════════════════════════════════│
│ TOTALE:              {{preventivo.importoFinale|currency}}   │
├──────────────────────────────────────────────────────────────┤
│ NOTE                                                         │
│ {{preventivo.note}}                                          │
├──────────────────────────────────────────────────────────────┤
│ FOOTER                                                       │
│ Validità: {{preventivo.dataScadenza|date}}                   │
│ Per accettare: {{preventivo.linkAccettazione}}               │
│ Condizioni: Preventivo valido 30 giorni dalla data emissione│
└──────────────────────────────────────────────────────────────┘
```

**Checklist Design:**
- [ ] Font professionale (Arial/Helvetica)
- [ ] Colori brand (#2563EB blue, #059669 green)
- [ ] Tabelle prezzi chiare con allineamento decimale
- [ ] Spazio bianco adeguato
- [ ] Footer con informazioni legali

---

### ✅ Task 5.2: Marker Configuration (2-3 ore)

**Obiettivo:** Estendere MarkerResolver con marker specifici preventivi

**File da Modificare:**
- `backend/services/markerResolver.js`

**Marker da Aggiungere:**

**Categoria: preventivo**
```javascript
{
  'preventivo.id': 'ID univoco preventivo',
  'preventivo.numeroProgressivo': 'Numero progressivo (PREV-2025-0001)',
  'preventivo.annoProgressivo': 'Anno (2025)',
  'preventivo.stato': 'Stato workflow (BOZZA, INVIATO, etc.)',
  'preventivo.dataEmissione': 'Data emissione (ISO)',
  'preventivo.dataScadenza': 'Data scadenza (ISO)',
  'preventivo.tipoServizio': 'Tipo servizio',
  
  // Prezzi
  'preventivo.prezzoTotale': 'Prezzo totale base',
  'preventivo.speseAccessorie': 'Totale spese accessorie',
  'preventivo.subtotale': 'Subtotale (base + spese)',
  
  // Sconti
  'preventivo.scontoApplicato': 'Boolean se sconto applicato',
  'preventivo.scontoCodice': 'Codice sconto applicato',
  'preventivo.scontoPercentuale': 'Percentuale sconto',
  'preventivo.importoSconto': 'Importo sconto in €',
  
  // Totali
  'preventivo.imponibile': 'Imponibile (subtotale - sconto)',
  'preventivo.percentualeIva': 'Percentuale IVA (10% o 22%)',
  'preventivo.importoIva': 'Importo IVA',
  'preventivo.importoFinale': 'Totale finale (imponibile + IVA)',
  
  // Altri
  'preventivo.note': 'Note del preventivo',
  'preventivo.linkAccettazione': 'URL per accettazione online'
}
```

**Categoria: azienda** (già esistente, verificare):
```javascript
{
  'azienda.ragioneSociale': 'Ragione sociale',
  'azienda.partitaIva': 'P.IVA',
  'azienda.codiceFiscale': 'Codice fiscale',
  'azienda.indirizzo': 'Indirizzo completo',
  'azienda.citta': 'Città',
  'azienda.cap': 'CAP',
  'azienda.provincia': 'Provincia',
  'azienda.email': 'Email',
  'azienda.telefono': 'Telefono'
}
```

**Categoria: corso** (già esistente, verificare):
```javascript
{
  'corso.title': 'Titolo corso',
  'corso.code': 'Codice corso',
  'corso.description': 'Descrizione',
  'corso.duration': 'Durata in ore',
  'corso.startDate': 'Data inizio',
  'corso.endDate': 'Data fine'
}
```

**Implementazione:**
```javascript
// In markerResolver.js, estendere MARKER_DEFINITIONS

MARKER_DEFINITIONS: {
  // ... existing markers
  
  preventivo: {
    id: { path: 'preventivo.id', description: 'ID preventivo' },
    numeroProgressivo: { path: 'preventivo.numeroProgressivo', description: 'Numero progressivo' },
    annoProgressivo: { path: 'preventivo.annoProgressivo', description: 'Anno' },
    stato: { path: 'preventivo.stato', description: 'Stato' },
    dataEmissione: { path: 'preventivo.dataEmissione', description: 'Data emissione', formatter: 'date' },
    dataScadenza: { path: 'preventivo.dataScadenza', description: 'Data scadenza', formatter: 'date' },
    tipoServizio: { path: 'preventivo.tipoServizio', description: 'Tipo servizio' },
    
    prezzoTotale: { path: 'preventivo.prezzoTotale', description: 'Prezzo totale', formatter: 'currency' },
    speseAccessorie: { path: 'preventivo.speseAccessorie', description: 'Spese accessorie', formatter: 'currency' },
    subtotale: { path: 'preventivo.subtotale', description: 'Subtotale', formatter: 'currency' },
    
    scontoApplicato: { path: 'preventivo.scontoApplicato', description: 'Sconto applicato (boolean)' },
    scontoCodice: { path: 'preventivo.scontoCodice', description: 'Codice sconto' },
    scontoPercentuale: { path: 'preventivo.scontoPercentuale', description: 'Percentuale sconto' },
    importoSconto: { path: 'preventivo.importoSconto', description: 'Importo sconto', formatter: 'currency' },
    
    imponibile: { path: 'preventivo.imponibile', description: 'Imponibile', formatter: 'currency' },
    percentualeIva: { path: 'preventivo.percentualeIva', description: 'Percentuale IVA' },
    importoIva: { path: 'preventivo.importoIva', description: 'Importo IVA', formatter: 'currency' },
    importoFinale: { path: 'preventivo.importoFinale', description: 'Totale finale', formatter: 'currency' },
    
    note: { path: 'preventivo.note', description: 'Note' },
    linkAccettazione: { path: 'preventivo.linkAccettazione', description: 'Link accettazione' }
  }
}
```

**Testing:**
- [ ] Test marker resolution con dati mock
- [ ] Verificare formatter currency/date
- [ ] Validare nested properties (preventivo.*)

---

### ✅ Task 5.3: PDF Generation Service (6-8 ore)

**Obiettivo:** Implementare endpoint download PDF preventivo

**File da Modificare:**
- `backend/routes/preventivi-routes.js`
- `backend/services/preventivi-service.js`
- `backend/services/documentService.js` (estensione)

#### 5.3.1 Endpoint Routes

**File:** `backend/routes/preventivi-routes.js`

**Aggiungi endpoint:**
```javascript
/**
 * GET /api/preventivi/:id/download
 * Scarica PDF preventivo
 */
router.get('/:id/download',
  authenticate,
  requirePermissions(['preventivi.read']),
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const tenantId = req.user.tenantId;

      logger.info('Richiesta download PDF preventivo', { preventivoId: id, userId, tenantId });

      // Genera PDF usando DocumentService
      const result = await preventiviService.generatePDF({
        preventivoId: id,
        userId,
        tenantId
      });

      // Imposta headers per download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.setHeader('Content-Length', result.buffer.length);

      // Invia PDF
      res.send(result.buffer);

      logger.info('PDF preventivo generato con successo', {
        preventivoId: id,
        filename: result.filename,
        size: result.buffer.length
      });

    } catch (error) {
      logger.error('Errore generazione PDF preventivo', {
        preventivoId: req.params.id,
        error: error.message,
        stack: error.stack
      });

      res.status(500).json({
        message: 'Errore durante la generazione del PDF',
        error: error.message
      });
    }
  }
);
```

#### 5.3.2 Service Method

**File:** `backend/services/preventivi-service.js`

**Aggiungi metodo:**
```javascript
/**
 * Genera PDF preventivo
 * @param {Object} params - Parametri generazione
 * @param {string} params.preventivoId - ID preventivo
 * @param {string} params.userId - ID utente
 * @param {string} params.tenantId - ID tenant
 * @returns {Promise<Object>} - {buffer, filename, metadata}
 */
async generatePDF({ preventivoId, userId, tenantId }) {
  try {
    // 1. Carica preventivo con relazioni
    const preventivo = await prisma.preventivo.findUnique({
      where: { id: preventivoId, tenantId },
      include: {
        azienda: true,
        corso: {
          include: {
            course: true
          }
        },
        sconti: {
          include: {
            codiceSconto: true
          }
        }
      }
    });

    if (!preventivo) {
      throw new Error('Preventivo non trovato');
    }

    // 2. Trova template "Preventivo"
    const template = await prisma.formTemplate.findFirst({
      where: {
        tenantId,
        name: { contains: 'Preventivo', mode: 'insensitive' },
        deletedAt: null
      }
    });

    if (!template) {
      throw new Error('Template preventivo non configurato. Crea un template con nome "Preventivo".');
    }

    // 3. Prepara dati per marker resolution
    const markerData = this._buildMarkerData(preventivo);

    // 4. Usa DocumentService per generare PDF
    const documentService = new DocumentService();
    const result = await documentService.generateDocument({
      templateId: template.id,
      entityType: 'PREVENTIVO',
      entityId: preventivo.id,
      userId,
      tenantId,
      options: {
        customData: markerData,
        filename: `Preventivo_${preventivo.numeroProgressivo}_${preventivo.azienda.ragioneSociale}.pdf`
      }
    });

    // 5. Aggiorna stato preventivo (se era BOZZA → INVIATO)
    if (preventivo.stato === 'BOZZA') {
      await prisma.preventivo.update({
        where: { id: preventivoId },
        data: { stato: 'INVIATO', dataInvio: new Date() }
      });
    }

    return {
      buffer: result.buffer,
      filename: result.filename,
      metadata: {
        preventivoId: preventivo.id,
        numeroProgressivo: preventivo.numeroProgressivo,
        azienda: preventivo.azienda.ragioneSociale,
        importoFinale: preventivo.importoFinale
      }
    };

  } catch (error) {
    logger.error('Errore generazione PDF preventivo', {
      preventivoId,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * Costruisce dati per marker resolution
 * @param {Object} preventivo - Preventivo con relazioni
 * @returns {Object} - Dati formattati per marker
 * @private
 */
_buildMarkerData(preventivo) {
  // Calcola subtotale e importo sconto
  const subtotale = preventivo.prezzoTotale;
  const importoSconto = preventivo.sconti.reduce((sum, s) => {
    const codice = s.codiceSconto;
    if (codice.tipo === 'PERCENTUALE') {
      return sum + (subtotale * codice.valore / 100);
    } else {
      return sum + codice.valore;
    }
  }, 0);

  const scontoCodici = preventivo.sconti.map(s => s.codiceSconto.codice).join(', ');
  const scontoPercentuale = subtotale > 0 ? (importoSconto / subtotale * 100).toFixed(2) : 0;

  // Link accettazione (placeholder - verrà implementato in FASE 6)
  const baseUrl = process.env.FRONTEND_URL || 'https://app.elementmedica.it';
  const linkAccettazione = `${baseUrl}/preventivi/${preventivo.id}/accetta`;

  return {
    preventivo: {
      id: preventivo.id,
      numeroProgressivo: preventivo.numeroProgressivo || 'PREV-DRAFT',
      annoProgressivo: new Date(preventivo.dataEmissione).getFullYear(),
      stato: preventivo.stato,
      dataEmissione: preventivo.dataEmissione,
      dataScadenza: preventivo.dataScadenza,
      tipoServizio: preventivo.tipoServizio,
      
      prezzoTotale: preventivo.prezzoTotale,
      speseAccessorie: 0, // TODO: calcolare da note o campo dedicato
      subtotale: subtotale,
      
      scontoApplicato: preventivo.sconti.length > 0,
      scontoCodice: scontoCodici,
      scontoPercentuale: scontoPercentuale,
      importoSconto: importoSconto,
      
      imponibile: preventivo.imponibile,
      percentualeIva: preventivo.percentualeIva,
      importoIva: preventivo.importoIva,
      importoFinale: preventivo.importoFinale,
      
      note: preventivo.note || '',
      linkAccettazione: linkAccettazione
    },
    azienda: {
      ragioneSociale: preventivo.azienda.ragioneSociale,
      partitaIva: preventivo.azienda.partitaIva || 'N/A',
      codiceFiscale: preventivo.azienda.codiceFiscale || 'N/A',
      indirizzo: preventivo.azienda.address || 'N/A',
      citta: preventivo.azienda.city || 'N/A',
      cap: preventivo.azienda.postalCode || 'N/A',
      provincia: preventivo.azienda.province || 'N/A',
      email: preventivo.azienda.businessEmail || 'N/A',
      telefono: preventivo.azienda.businessPhone || 'N/A'
    },
    corso: preventivo.corso ? {
      title: preventivo.corso.course.title,
      code: preventivo.corso.course.code || 'N/A',
      description: preventivo.corso.course.description || '',
      duration: preventivo.corso.course.duration || 'N/A',
      startDate: preventivo.corso.startDate,
      endDate: preventivo.corso.endDate
    } : {
      title: 'Corso non specificato',
      code: 'N/A',
      description: '',
      duration: 'N/A',
      startDate: null,
      endDate: null
    }
  };
}
```

**Checklist Implementation:**
- [ ] Endpoint GET /preventivi/:id/download implementato
- [ ] Service method generatePDF implementato
- [ ] Marker data builder implementato
- [ ] Error handling completo
- [ ] Logging strutturato
- [ ] Aggiornamento stato preventivo

---

### ✅ Task 5.4: Frontend Integration (3-4 ore)

**Obiettivo:** Integrare download PDF in PreventiviModal e DocumentManager

#### 5.4.1 Service Method (già implementato)

**File:** `src/services/preventiviService.ts`

Verificare metodo `download()` già esistente:
```typescript
async download(id: string): Promise<void> {
  const response = await api.get(`${this.basePath}/${id}/download`, {
    responseType: 'blob'
  });
  
  const url = window.URL.createObjectURL(new Blob([response.data as BlobPart]));
  const link = document.createElement('a');
  link.href = url;
  
  const contentDisposition = response.headers['content-disposition'];
  let fileName = `preventivo_${id}.pdf`;
  
  if (contentDisposition) {
    const match = contentDisposition.match(/filename="?(.+?)"?$/);
    if (match?.[1]) {
      fileName = match[1];
    }
  }
  
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
```

✅ **Già implementato!** Nessuna modifica necessaria.

#### 5.4.2 DocumentManager Integration (già implementato)

**File:** `src/components/schedules/components/DocumentManager.tsx`

Il button download è già presente:
```tsx
<button
  onClick={() => preventiviService.download(preventivo.id)}
  className="p-1 text-orange-600 hover:bg-orange-50 rounded"
  title="Scarica"
>
  <Download className="w-4 h-4" />
</button>
```

✅ **Già implementato!** Nessuna modifica necessaria.

#### 5.4.3 Testing UI

**Checklist:**
- [ ] Test download PDF da DocumentManager card
- [ ] Verificare nome file corretto
- [ ] Verificare apertura PDF
- [ ] Test con diversi browser (Chrome, Firefox, Safari)
- [ ] Test su mobile (iOS, Android)

---

### ✅ Task 5.5: Testing & Documentation (2-3 ore)

**Obiettivo:** Test completi e documentazione

#### 5.5.1 Test Scenarios

**Test Funzionali:**
1. [ ] **Generazione PDF Base**
   - Crea preventivo semplice (senza sconti)
   - Genera PDF
   - Verificare: tutti i marker risolti, prezzi corretti, formattazione OK

2. [ ] **Preventivo con Sconto**
   - Crea preventivo con codice sconto
   - Genera PDF
   - Verificare: sconto visualizzato, calcoli corretti

3. [ ] **Preventivo Multi-Spese**
   - Crea preventivo con spese accessorie
   - Genera PDF
   - Verificare: spese elencate, totali corretti

4. [ ] **IVA Differenziata**
   - Testa con tipoServizio "medico_competente" (10%)
   - Testa con tipoServizio "formazione" (22%)
   - Verificare: aliquota corretta applicata

5. [ ] **Marker Edge Cases**
   - Preventivo senza corso associato
   - Azienda con dati parziali
   - Note molto lunghe
   - Verificare: no errori, valori di default OK

**Test Performance:**
- [ ] Tempo generazione PDF < 3 secondi
- [ ] Memoria server stabile
- [ ] No memory leak dopo 100 generazioni

**Test Security:**
- [ ] Solo utenti autenticati possono scaricare
- [ ] Tenant isolation verificato
- [ ] No accesso cross-tenant

#### 5.5.2 Documentation

**File da Creare:**
- `docs/10_project_managemnt/preventivi-e-codici-sconto/10_PDF_GENERATION.md`

**Contenuto:**
- Screenshot template Google Slides
- Lista completa marker disponibili
- Esempi codice generazione
- Troubleshooting comune
- Performance best practices

**File da Aggiornare:**
- `docs/10_project_managemnt/preventivi-e-codici-sconto/03_PIANO_IMPLEMENTAZIONE.md` (segna FASE 5 come completata)
- `docs/user/preventivi-usage-guide.md` (sezione download PDF)

---

## 📊 Timeline

| Task | Durata | Effort | Status |
|------|--------|--------|--------|
| 5.1 Template Design | 4-6 ore | 👤 | ⏳ NOT STARTED |
| 5.2 Marker Config | 2-3 ore | 👤 | ⏳ NOT STARTED |
| 5.3 PDF Service | 6-8 ore | 👤 | ⏳ NOT STARTED |
| 5.4 Frontend Integration | 3-4 ore | 👤 | ⏳ NOT STARTED |
| 5.5 Testing & Docs | 2-3 ore | 👤 | ⏳ NOT STARTED |
| **TOTALE** | **17-24 ore** | **3-5 giorni** | |

---

## ✅ Criteri di Accettazione FASE 5

- [ ] Template "Preventivo" creato e importato nel sistema
- [ ] Tutti i marker preventivo configurati in MarkerResolver
- [ ] Endpoint GET /preventivi/:id/download funzionante
- [ ] PDF generato con formattazione professionale
- [ ] Download PDF da UI funzionante
- [ ] Tutti i test scenarios superati
- [ ] Documentazione completa

---

## 🚀 Prossimi Step

Dopo completamento FASE 5:
- **FASE 6**: Testing & QA (4-6 giorni)
- **FASE 7**: Documentation & Deployment (2-3 giorni)

---

**Note:**
- Utilizzare sistema template esistente (nessuna libreria esterna)
- Formatter currency e date già disponibili
- DocumentService già testato su attestati (stessa architettura)
- Frontend già pronto (download service implementato)
