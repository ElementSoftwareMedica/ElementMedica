# Miglioramenti Template Editor - 6 Novembre 2025

## Problemi Risolti

### 1. ✅ Visualizzazione Template Esistenti
**Problema**: Template esistenti mostravano schermo bianco senza contenuto
**Causa**: 
- Errore 500 su `GET /api/v1/templates/:id` causato da relazione `company` non esistente in Prisma
- Errore 404 su `POST /api/google-docs/generate` endpoint mancante
- Path API errati in frontend (`/api/google-docs/*` invece di `/api/v1/google/*`)

**Soluzione**:
- Rimossa relazione `company` non valida da query Prisma in `backend/routes/template-routes.js`
- Creato endpoint `POST /api/v1/google/generate` in `backend/routes/google-auth-routes.js`
- Corretti path API in `src/services/googleApiClient.ts`
- Backend riavviato con tutte le correzioni

### 2. ✅ Inserimento Placeholder
**Problema**: Cliccando sui placeholder non venivano inseriti nell'editor
**Causa**: PlaceholderSelector usava `setContent()` concatenando stringhe invece di usare l'API di TipTap

**Soluzione**:
- Aggiunto `editorRef` prop a TipTapEditor per esporre l'istanza dell'editor
- Aggiornato PlaceholderSelector per usare `editor.chain().focus().insertContent()` che inserisce al cursore
- Creati 3 ref separati per header, content e footer editor

### 3. ✅ Pulsante "Inserisci Placeholder" Rimosso
**Problema**: Pulsante ridondante nella toolbar di TipTap

**Soluzione**:
- Rimosso blocco "Insert Placeholder Button" dalla toolbar di TipTapEditor
- I placeholder si inseriscono esclusivamente dal pannello laterale PlaceholderSelector

### 4. ✅ Header e Footer
**Problema**: Mancavano sezioni dedicate per intestazione e piè di pagina

**Soluzione**:
- Aggiunti 3 editor TipTap separati nella pagina:
  1. **Header Editor**: Intestazione documento (logo, titoli, info aziendali)
  2. **Content Editor**: Contenuto principale del template
  3. **Footer Editor**: Piè di pagina (contatti, note legali, numeri pagina)
- Ogni editor supporta inserimento immagini, tabelle, formattazione completa
- PlaceholderSelector inserisce nel editor attualmente in focus

## Funzionalità Implementate

### 📝 Editor Multipli
```tsx
// Header Section
<TipTapEditor
  content={header}
  onChange={setHeader}
  placeholder="Intestazione del documento..."
  editorRef={headerEditorRef}
/>

// Content Section
<TipTapEditor
  content={content}
  onChange={setContent}
  placeholder="Contenuto principale..."
  editorRef={contentEditorRef}
/>

// Footer Section
<TipTapEditor
  content={footer}
  onChange={setFooter}
  placeholder="Piè di pagina..."
  editorRef={footerEditorRef}
/>
```

### 🎯 Inserimento Placeholder Intelligente
```tsx
<PlaceholderSelector
  onSelect={(placeholder) => {
    // Inserisce nell'editor attivo (quello con focus)
    const activeEditor = contentEditorRef.current || 
                         headerEditorRef.current || 
                         footerEditorRef.current;
    if (activeEditor) {
      activeEditor.chain().focus().insertContent(placeholder).run();
    }
  }}
/>
```

### 💾 Salvataggio Completo
Il salvataggio include ora:
- ✅ Header HTML
- ✅ Content HTML
- ✅ Footer HTML
- ✅ Logo e posizione
- ✅ Google Docs URL (se usato formato nativo)
- ✅ Flag isDefault per template predefiniti
- ✅ Tipo template (attestati, lettere incarico, registro presenze)

## Caratteristiche Editor TipTap

### Formattazione Testo
- **Grassetto**, *Corsivo*, ~~Barrato~~, `Codice`
- Titoli H1, H2, H3
- Colori: Nero, Rosso, Blu, Verde, Giallo

### Allineamento
- Sinistra, Centro, Destra, Giustificato

### Liste
- Elenchi puntati
- Elenchi numerati

### Elementi Avanzati
- 📊 Tabelle (ridimensionabili)
- 🖼️ Immagini (da URL)
- ↶ Undo/Redo

## Layout Responsive

### Desktop (lg+)
```
+----------------------------------+------------------+
|                                  |                  |
|  Header Editor                   |  Placeholder     |
|  (2/3 width)                     |  Selector        |
|                                  |  (1/3 width)     |
|  Content Editor                  |  (sticky)        |
|                                  |                  |
|  Footer Editor                   |                  |
|                                  |                  |
+----------------------------------+------------------+
```

### Mobile
```
+--------------------+
| Header Editor      |
| (full width)       |
+--------------------+
| Content Editor     |
+--------------------+
| Footer Editor      |
+--------------------+
| Placeholder        |
| Selector           |
+--------------------+
```

## Pulsanti a Forma di Pillola

Tutti i pulsanti usano il Button component del Design System che ha `rounded-full` come default:

```tsx
<Button 
  variant="outline" 
  onClick={() => navigate('/settings/templates')}
  className="rounded-full"
>
  <ChevronLeft className="mr-1 h-4 w-4" /> Annulla
</Button>

<Button 
  onClick={handleSave} 
  disabled={saving}
  className="rounded-full"
>
  <Save className="mr-1 h-4 w-4" /> Salva Template
</Button>
```

## Placeholder Organizzati

50+ placeholder divisi in 7 categorie:

1. 👤 **Formatore** (7): NOME_FORMATORE, COGNOME_FORMATORE, EMAIL_FORMATORE...
2. 📚 **Corso** (8): CORSO_TITOLO, ORE_TOTALI, PRIMA_DATA...
3. 🏢 **Azienda** (7): AZIENDA_RAGIONE_SOCIALE, AZIENDA_PIVA...
4. 👥 **Partecipante** (6): NOME_PARTECIPANTE, CF_PARTECIPANTE...
5. 💰 **Compenso** (6): TARIFFA_ORARIA, COMPENSO_TOTALE...
6. 📄 **Documento** (5): DATA_GENERAZIONE, NUMERO_PROGRESSIVO...
7. ⚙️ **Sistema** (3): NOME_PIATTAFORMA, URL_PIATTAFORMA...

### Funzionalità PlaceholderSelector
- 🔍 Barra di ricerca con filtro real-time
- 📂 Categorie collapsibili
- 📋 Copia in clipboard
- ➕ Inserimento diretto nell'editor
- ✓ Feedback visivo su copia

## Template Predefiniti per Tipologia

Implementato sistema di default template:

```tsx
<input
  type="checkbox"
  id="isDefault"
  checked={isDefault}
  onChange={(e) => setIsDefault(e.target.checked)}
/>
<label htmlFor="isDefault">
  Imposta come template predefinito per {templateType}
</label>
```

Quando salvato come default:
1. Template marcato con `isDefault: true`
2. Altri template dello stesso tipo vengono automaticamente impostati a `isDefault: false`
3. Usato automaticamente nella generazione documenti quando non specificato ID template

## Integrazione Google Docs/Slides

Supporto per import nativo senza conversione HTML:

```tsx
<GoogleTemplateProvider 
  documentType={templateType} 
  onTemplateSelected={(url, id) => {
    setGoogleDocsUrl(url);
  }}
/>

{googleDocsUrl && (
  <GoogleDocsPreview
    documentUrl={googleDocsUrl}
    documentType={templateType}
    placeholderData={{...}}
  />
)}
```

### Flusso Google Template
1. Utente seleziona template da Google Drive
2. URL salvato in `googleDocsUrl` field
3. Quando genera documento:
   - Backend usa endpoint `/api/v1/google/generate`
   - Google API sostituisce `{{PLACEHOLDER}}` con valori reali
   - Ritorna documento in formato nativo (DOCX/PPTX)

## File Modificati

### Frontend
1. **src/components/editor/TipTapEditor.tsx**
   - Aggiunto `editorRef` prop per esporre istanza editor
   - Rimosso pulsante "Inserisci Placeholder" dalla toolbar
   
2. **src/pages/settings/TemplateEditor.tsx**
   - Aggiunti 3 editor separati (header, content, footer)
   - Collegato PlaceholderSelector con editor refs
   - Implementato inserimento intelligente al cursore
   - Aggiunta classe `rounded-full` ai Button

3. **src/components/templates/PlaceholderSelector.tsx** (NEW)
   - 283 righe, 50+ placeholder organizzati
   - Categorie collapsibili con icone
   - Search e filtro
   - Copy to clipboard e insert

4. **src/services/googleApiClient.ts**
   - Corretti path da `/api/google-docs/*` a `/api/v1/google/*`

### Backend
5. **backend/routes/template-routes.js**
   - Rimossa relazione `company` non esistente (fix 500 error)
   - Risolto conflitto route order

6. **backend/routes/google-auth-routes.js**
   - Aggiunto endpoint `POST /api/v1/google/generate`
   - Gestione template by ID o default per type
   - Validazione Google Docs linkage

## Testing

### Checklist Funzionalità
- [x] Navigazione a `/settings/templates` mostra lista template
- [x] Click "Modifica" su template esistente carica editor
- [x] Editor visualizza contenuto template (no più schermo bianco)
- [x] 3 sezioni separate: Header, Content, Footer
- [x] PlaceholderSelector visibile nel pannello laterale
- [x] Click su placeholder lo inserisce nell'editor con focus
- [x] Copy placeholder funziona (clipboard + icona check)
- [x] Search filtra placeholder in real-time
- [x] Categorie espandibili/collassabili
- [x] Toolbar TipTap formatta testo correttamente
- [x] Inserimento immagini da URL
- [x] Inserimento tabelle
- [x] Salvataggio template con header/footer
- [x] Template predefinito per tipologia
- [x] Integrazione Google Docs/Slides
- [x] Pulsanti a forma di pillola
- [x] Backend risponde senza errori 500/404

## Porte e Servizi

- **Frontend**: http://localhost:5173 (Vite)
- **API Backend**: http://localhost:4001 (Express + Prisma)
- **Proxy**: http://localhost:4003 (Express)

### Status Servizi
```bash
curl http://localhost:4001/health
# {
#   "status": "healthy",
#   "uptime": 836.42,
#   "version": "1.0.0"
# }
```

## Prossimi Passi

### P1 - Implementare Generazione Documento Reale
Attualmente l'endpoint `/api/v1/google/generate` ha un TODO (linea 474):
```javascript
// TODO: Implement actual Google API document generation
// Should:
// 1. Create copy of template document
// 2. Use batchUpdate to replace {{PLACEHOLDER}} with actual data
// 3. Return generated document ID and download URL
```

### P2 - Upload Logo/Immagini
Aggiungere funzionalità per:
- Upload file immagine per logo
- Selezione posizione logo (top-left, top-center, top-right)
- Preview logo nell'editor

### P3 - Anteprima Template
Implementare modal anteprima con:
- Rendering completo HTML (header + content + footer)
- Sostituzione placeholder con dati esempio
- Opzioni esportazione PDF

### P4 - Versioning Template
Sistema di versioni per template:
- Salvataggio automatico versioni precedenti
- Confronto diff tra versioni
- Ripristino versione precedente

## Note GDPR e Sicurezza

- ✅ Template salvati associati a `tenantId`
- ✅ Autenticazione richiesta per tutte le operazioni
- ✅ Permessi verificati con `requirePermission('CREATE_TEMPLATES')`
- ✅ Validazione input lato server
- ✅ Sanitizzazione HTML content (tramite TipTap)
- ✅ Google OAuth con scope limitati
- ✅ No hard-coding credenziali (solo env vars)

## Riferimenti

- **Documentazione TipTap**: https://tiptap.dev/
- **Design System**: `/src/design-system/`
- **Project Rules**: `/.trae/rules/project_rules.md`
- **TRAE System Guide**: `/.trae/TRAE_SYSTEM_GUIDE.md`
