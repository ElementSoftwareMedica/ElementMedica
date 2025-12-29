# 📝 WF_04: Workflow Refertazione

**Versione**: 1.0  
**Ultimo aggiornamento**: 2025-12-11  
**Specifiche correlate**: [SPEC_10](../specs/SPEC_10_REFERTI.md)

---

## 1. DIAGRAMMA FLUSSO

```
┌─────────────────────────────────────────────────────────────────────┐
│                    WORKFLOW REFERTAZIONE                            │
└─────────────────────────────────────────────────────────────────────┘

        Medico                 Sistema                 Paziente
           │                      │                       │
           │                      │                       │
    ┌──────┴──────┐               │                       │
    │ VISITA      │               │                       │
    │ COMPLETATA  │               │                       │
    └──────┬──────┘               │                       │
           │                      │                       │
           │◄──── Crea Bozza ─────│                       │
           │      Referto         │                       │
           │                      │                       │
           │                      │                       │
           ├──────────────────────┼───────────────────────┤
           │      EDITOR REFERTO  │                       │
           ├──────────────────────┼───────────────────────┤
           │                      │                       │
           │──── Seleziona ──────►│                       │
           │     Template         │                       │
           │                      │                       │
           │◄─── Template ────────│                       │
           │     + Dati Visita    │                       │
           │                      │                       │
           │                      │                       │
           │──── Modifica ───────►│                       │
           │     Contenuto        │                       │
           │                      │                       │
           │◄─── Salva ───────────│                       │
           │     (v1, v2, v3...)  │                       │
           │                      │                       │
           │                      │                       │
           │──── Preview PDF ────►│                       │
           │                      │                       │
           │◄─── PDF Anteprima ───│                       │
           │     (watermark)      │                       │
           │                      │                       │
           │                      │                       │
           ├──────────────────────┼───────────────────────┤
           │        FIRMA         │                       │
           ├──────────────────────┼───────────────────────┤
           │                      │                       │
           │──── Firma ──────────►│                       │
           │                      │                       │
           │◄─── Conferma ────────│                       │
           │     OTP/Password     │                       │
           │                      │                       │
           │──── OTP ────────────►│                       │
           │                      │                       │
           │                      │──── Genera PDF ──────►│
           │                      │     Firmato           │
           │                      │                       │
           │◄─── PDF Finale ──────│                       │
           │                      │                       │
           │                      │                       │
           ├──────────────────────┼───────────────────────┤
           │        INVIO         │                       │
           ├──────────────────────┼───────────────────────┤
           │                      │                       │
           │──── Invia ──────────►│                       │
           │     Paziente         │                       │
           │                      │──── Email ───────────►│
           │                      │     con PDF           │
           │                      │                       │
           │                      │                       │
```

---

## 2. STEP DETTAGLIATI

### STEP 1: Creazione Bozza (Automatica)

**Trigger**: Visita completata

**Azioni Sistema**:
1. Crea record Referto con stato BOZZA
2. Pre-popola con template prestazione
3. Merge placeholder con dati visita

**Dati Merge**:
```javascript
{
  paziente: { nome, cognome, cf, dataNascita },
  medico: { nome, cognome, albo, specializzazione },
  visita: { data, ora, campi compilati },
  prestazione: { nome, codice }
}
```

---

### STEP 2: Editing Referto

**Editor**: TipTap/Slate WYSIWYG

**Funzionalità**:
- Formattazione testo (bold, italic, headings)
- Inserimento placeholder
- Tabelle
- Immagini inline
- Template sezioni

**Auto-save**: Ogni 60 secondi → nuova versione

**API**:
```javascript
// Salva (crea versione)
PUT /api/v1/clinica/referti/:id
{
  contenuto: "<h1>REFERTO...</h1>",
  motivoModifica: "Integrazione conclusioni"
}

// Lista versioni
GET /api/v1/clinica/referti/:id/versioni

// Confronta versioni
GET /api/v1/clinica/referti/:id/diff/1/2
```

---

### STEP 3: Anteprima PDF

**Caratteristiche Bozza**:
- Watermark "BOZZA"
- No firma
- Solo per revisione

**API**:
```javascript
GET /api/v1/clinica/referti/:id/pdf/preview
// Returns: PDF blob con watermark
```

---

### STEP 4: Firma Digitale

**Prerequisiti**:
- Utente = medico esecutore visita
- Referto in stato BOZZA o COMPLETATO
- Autenticazione MFA (se abilitata)

**Flusso Firma**:
1. Medico clicca "Firma"
2. Dialog conferma + OTP (se MFA)
3. Sistema calcola hash contenuto
4. Crea record FirmaDigitale
5. Aggiorna stato → FIRMATO
6. Queue job generazione PDF finale

**API**:
```javascript
// Richiedi firma
POST /api/v1/clinica/referti/:id/firma
{
  otpCode: "123456"  // se MFA
}

// Response
{
  success: true,
  firma: {
    id: "firma-uuid",
    hash: "sha256:abc123...",
    timestamp: "2024-01-15T10:30:00Z"
  },
  pdfJobId: "job-uuid"  // Per tracking generazione
}
```

---

### STEP 5: Generazione PDF Firmato

**Job Asincrono** (vedi SPEC_16):
1. Rendering HTML → PDF (Puppeteer)
2. Aggiunge firma digitale visiva
3. Aggiunge QR code verifica
4. Upload su storage
5. Notifica completamento

**Contenuto PDF Finale**:
- Header: Logo poliambulatorio, dati struttura
- Body: Contenuto referto
- Footer: Firma, data, QR code, pagina X/Y

---

### STEP 6: Invio Paziente

**Canali**:
- Email con PDF allegato
- PEC (per valore legale)
- Download da portale paziente

**API**:
```javascript
POST /api/v1/clinica/referti/:id/invia
{
  canale: "EMAIL",
  destinatario: "paziente@email.com"  // default: email paziente
}
```

---

## 3. UI COMPONENTS

### Editor Referto

```tsx
// src/features/referti/RefertoEditor.tsx

export function RefertoEditor({ refertoId }) {
  const { referto, versioni } = useReferto(refertoId);
  const editor = useRichTextEditor(referto.contenuto);
  
  return (
    <div className="grid grid-cols-4 gap-4">
      {/* Toolbar */}
      <div className="col-span-4">
        <EditorToolbar editor={editor} />
      </div>
      
      {/* Editor principale */}
      <div className="col-span-3">
        <Card>
          <CardContent className="prose max-w-none">
            <RichTextEditor
              editor={editor}
              onChange={handleContentChange}
            />
          </CardContent>
        </Card>
      </div>
      
      {/* Sidebar */}
      <div className="col-span-1 space-y-4">
        {/* Azioni */}
        <Card>
          <CardHeader>
            <CardTitle>Azioni</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full" onClick={handlePreview}>
              👁️ Anteprima PDF
            </Button>
            <Button variant="outline" className="w-full" onClick={handleSave}>
              💾 Salva
            </Button>
            <Button 
              className="w-full" 
              onClick={handleFirma}
              disabled={referto.stato === 'FIRMATO'}
            >
              ✍️ Firma Referto
            </Button>
          </CardContent>
        </Card>
        
        {/* Versioni */}
        <Card>
          <CardHeader>
            <CardTitle>Versioni ({versioni.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <VersioniTimeline 
              versioni={versioni}
              onSelect={handleVersionSelect}
            />
          </CardContent>
        </Card>
        
        {/* Placeholder */}
        <Card>
          <CardHeader>
            <CardTitle>Inserisci</CardTitle>
          </CardHeader>
          <CardContent>
            <PlaceholderPicker
              onSelect={(placeholder) => editor.insertPlaceholder(placeholder)}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

### Dialog Firma

```tsx
export function FirmaDialog({ referto, onFirma }) {
  const [step, setStep] = useState<'confirm' | 'otp' | 'signing' | 'done'>('confirm');
  const { requiresMfa } = useAuth();
  
  return (
    <Dialog>
      <DialogContent>
        {step === 'confirm' && (
          <>
            <DialogHeader>
              <DialogTitle>Firma Referto</DialogTitle>
              <DialogDescription>
                Stai per firmare digitalmente questo referto. 
                Una volta firmato non potrà più essere modificato.
              </DialogDescription>
            </DialogHeader>
            
            <div className="bg-gray-50 p-4 rounded">
              <p><strong>Paziente:</strong> {referto.visita.paziente.nome}</p>
              <p><strong>Prestazione:</strong> {referto.visita.prestazione.nome}</p>
              <p><strong>Data visita:</strong> {formatDate(referto.visita.oraInizio)}</p>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Annulla</Button>
              <Button onClick={() => setStep(requiresMfa ? 'otp' : 'signing')}>
                Procedi
              </Button>
            </DialogFooter>
          </>
        )}
        
        {step === 'otp' && (
          <OtpVerification onVerified={() => setStep('signing')} />
        )}
        
        {step === 'signing' && (
          <SigningProgress onComplete={() => setStep('done')} />
        )}
        
        {step === 'done' && (
          <FirmaCompletata referto={referto} />
        )}
      </DialogContent>
    </Dialog>
  );
}
```

---

## 4. VERSIONING (Event Sourcing)

```
Versione 1 ──► Versione 2 ──► Versione 3 ──► FIRMATO
   │              │              │              │
   │              │              │              │
   ▼              ▼              ▼              ▼
Snapshot 1   Snapshot 2   Snapshot 3    Immutabile
```

**Ogni versione contiene**:
- Contenuto completo (no diff)
- Timestamp
- Autore modifica
- Motivo modifica (opzionale)

---

## 5. COLLEGAMENTI

- **Workflow precedente**: [WF_03_VISITA.md](./WF_03_VISITA.md)
- **Workflow successivo**: [WF_05_FATTURAZIONE.md](./WF_05_FATTURAZIONE.md)
- **Specifiche**: [SPEC_10](../specs/SPEC_10_REFERTI.md)
