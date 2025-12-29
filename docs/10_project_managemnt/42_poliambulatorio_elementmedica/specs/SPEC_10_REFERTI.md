# 📄 SPEC_10: Referti e Firma Digitale

**Versione**: 1.0  
**Ultimo aggiornamento**: 2025-12-11  
**Collegato a**: [SPEC_09_VISITE.md](./SPEC_09_VISITE.md), [SPEC_12_AUDIT_GDPR.md](./SPEC_12_AUDIT_GDPR.md)

---

## 1. OVERVIEW

Il Referto è il documento clinico ufficiale prodotto dalla visita. Caratteristiche chiave:
- **Versioning**: Event sourcing per tracciare ogni modifica
- **Firma digitale**: Solo medico autorizzato può firmare
- **Immutabilità**: Dopo firma, non modificabile
- **PDF**: Generazione automatica con template

### 1.1 Stati Referto

```
┌──────────────┐
│    BOZZA     │ ← Creazione iniziale
└──────┬───────┘
       │ Modifiche (creano versioni)
       ▼
┌──────────────┐
│  COMPLETATO  │ ← Pronto per firma
└──────┬───────┘
       │ Firma medico
       ▼
┌──────────────┐
│   FIRMATO    │ ← Immutabile, PDF generato
└──────┬───────┘
       │ Invio paziente
       ▼
┌──────────────┐
│   INVIATO    │
└──────────────┘
```

---

## 2. ENTITÀ DATABASE

### 2.1 Modello Referto

```prisma
model Referto {
  id                    String   @id @default(uuid())
  
  // Visita origine
  visitaId              String   @unique
  visita                Visita   @relation(fields: [visitaId], references: [id])
  
  // Template usato
  templateId            String?
  templateVersion       Int      @default(1)
  
  // Contenuto
  contenuto             String   @db.Text         // HTML/Markdown
  contenutoJson         Json?                     // Strutturato
  
  // Versioning
  versione              Int      @default(1)
  
  // Stato
  stato                 StatoReferto             @default(BOZZA)
  
  // Firma
  isFirmato             Boolean  @default(false)
  dataFirma             DateTime?
  firmaDigitaleId       String?  @unique
  firmaDigitale         FirmaDigitale? @relation(fields: [firmaDigitaleId], references: [id])
  
  // PDF generato
  pdfUrl                String?
  pdfGeneratoAt         DateTime?
  
  // Invio
  inviatoAt             DateTime?
  inviatoVia            String?                  // "EMAIL", "PEC", "DOWNLOAD"
  
  // Creatore
  creatoDaId            String
  creatoDa              Person   @relation("CreatoreReferto", fields: [creatoDaId], references: [id])
  
  // Versioni storiche
  versioni              VersioneReferto[]
  
  // Allegati
  allegati              AllegatoReferto[]
  
  // Multi-tenancy
  tenantId              String
  tenant                Tenant   @relation(fields: [tenantId], references: [id])
  
  // Timestamps
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  deletedAt             DateTime?
  
  @@index([tenantId])
  @@index([stato])
  @@index([visitaId])
}

enum StatoReferto {
  BOZZA
  COMPLETATO
  FIRMATO
  INVIATO
  ANNULLATO
}
```

### 2.2 Event Sourcing - Versioni

```prisma
model VersioneReferto {
  id                    String   @id @default(uuid())
  
  // Referto
  refertoId             String
  referto               Referto  @relation(fields: [refertoId], references: [id])
  
  // Versione
  versione              Int
  
  // Snapshot contenuto
  contenuto             String   @db.Text
  contenutoJson         Json?
  
  // Metadata modifica
  motivoModifica        String?
  
  // Chi ha creato questa versione
  creatoDaId            String
  creatoDa              Person   @relation(fields: [creatoDaId], references: [id])
  
  // Multi-tenancy
  tenantId              String
  
  // Timestamp (immutabile)
  createdAt             DateTime @default(now())
  
  @@unique([refertoId, versione])
  @@index([tenantId])
  @@index([refertoId])
}
```

### 2.3 Firma Digitale

```prisma
model FirmaDigitale {
  id                    String   @id @default(uuid())
  
  // Firmatario
  personaId             String
  persona               Person   @relation(fields: [personaId], references: [id])
  
  // Documento firmato
  tipoDocumento         String               // "REFERTO", "CONSENSO", etc.
  documentoId           String
  
  // Hash documento
  hash                  String               // SHA-256 del contenuto
  algoritmo             String   @default("SHA256")
  
  // Timestamp firma
  timestamp             DateTime
  
  // Certificato (se firma qualificata)
  certificatoSerial     String?
  certificatoEmittente  String?
  certificatoScadenza   DateTime?
  
  // Referto (relazione inversa)
  referto               Referto?
  
  // Multi-tenancy
  tenantId              String
  tenant                Tenant   @relation(fields: [tenantId], references: [id])
  
  // Timestamp
  createdAt             DateTime @default(now())
  
  @@unique([tipoDocumento, documentoId])
  @@index([tenantId])
  @@index([personaId])
}
```

---

## 3. FUNZIONALITÀ

### 3.1 Creazione Referto
1. Da visita completata → genera referto bozza
2. Usa template prestazione + valori campi visita
3. Merge automatico placeholder

### 3.2 Editing
- Editor WYSIWYG (TipTap/Slate)
- Template con placeholder
- Anteprima PDF real-time
- Auto-save ogni 60 secondi
- **Ogni salvataggio = nuova versione**

### 3.3 Firma Digitale
```javascript
async function firmaReferto(refertoId, medicoId) {
  const referto = await getReferto(refertoId);
  
  // 1. Verifica medico autorizzato
  if (referto.visita.medicoEsecutoreId !== medicoId) {
    throw new Error('Solo il medico esecutore può firmare');
  }
  
  // 2. Verifica stato
  if (referto.stato !== 'BOZZA' && referto.stato !== 'COMPLETATO') {
    throw new Error('Referto non firmabile');
  }
  
  // 3. Calcola hash contenuto
  const hash = crypto.createHash('sha256')
    .update(referto.contenuto)
    .digest('hex');
  
  // 4. Crea firma digitale
  const firma = await createFirmaDigitale({
    personaId: medicoId,
    tipoDocumento: 'REFERTO',
    documentoId: refertoId,
    hash,
    timestamp: new Date()
  });
  
  // 5. Aggiorna referto
  await updateReferto(refertoId, {
    stato: 'FIRMATO',
    isFirmato: true,
    dataFirma: new Date(),
    firmaDigitaleId: firma.id
  });
  
  // 6. Genera PDF (async job)
  await queueJob('genera-pdf-referto', { refertoId });
  
  return firma;
}
```

### 3.4 Generazione PDF
- Template HTML → PDF (Puppeteer)
- Header: Logo, dati poliambulatorio
- Body: Contenuto referto
- Footer: Firma, data, QR code verifica
- Watermark se BOZZA

---

## 4. API ENDPOINTS

```
# CRUD
GET    /api/v1/clinica/referti                         # Lista
GET    /api/v1/clinica/referti/:id                     # Dettaglio
POST   /api/v1/clinica/referti                         # Crea da visita
PUT    /api/v1/clinica/referti/:id                     # Modifica (se bozza)

# Workflow
POST   /api/v1/clinica/referti/:id/completa            # Segna completato
POST   /api/v1/clinica/referti/:id/firma               # Firma digitale
POST   /api/v1/clinica/referti/:id/invia               # Invia a paziente

# Versioning
GET    /api/v1/clinica/referti/:id/versioni            # Lista versioni
GET    /api/v1/clinica/referti/:id/versioni/:ver       # Versione specifica
GET    /api/v1/clinica/referti/:id/diff/:v1/:v2        # Diff tra versioni

# PDF
GET    /api/v1/clinica/referti/:id/pdf                 # Download PDF
GET    /api/v1/clinica/referti/:id/pdf/preview         # Anteprima
POST   /api/v1/clinica/referti/:id/pdf/rigenera        # Rigenera PDF

# Verifica firma
GET    /api/v1/clinica/referti/:id/verifica-firma      # Verifica integrità
```

---

## 5. UI COMPONENTS

### 5.1 Pagine
- `RefertiList.tsx` - Lista referti
- `RefertoEditor.tsx` - Editor WYSIWYG
- `RefertoDetail.tsx` - Visualizzazione

### 5.2 Editor
- `RichTextEditor.tsx` - Editor TipTap
- `TemplateSelector.tsx` - Selezione template
- `PlaceholderInserter.tsx` - Inserimento placeholder
- `PDFPreview.tsx` - Anteprima live

### 5.3 Versioning
- `VersioniTimeline.tsx` - Timeline versioni
- `VersioneDiff.tsx` - Confronto versioni
- `VersioneRestore.tsx` - Ripristino (se bozza)

### 5.4 Firma
- `FirmaDialog.tsx` - Dialog conferma firma
- `FirmaBadge.tsx` - Badge stato firma
- `VerificaFirma.tsx` - Verifica integrità

---

## 6. TEMPLATE REFERTO

### 6.1 Placeholder Supportati

```
{{PAZIENTE_NOME}}
{{PAZIENTE_COGNOME}}
{{PAZIENTE_CF}}
{{PAZIENTE_DATA_NASCITA}}
{{PAZIENTE_INDIRIZZO}}

{{MEDICO_NOME}}
{{MEDICO_COGNOME}}
{{MEDICO_ALBO}}
{{MEDICO_SPECIALIZZAZIONE}}

{{PRESTAZIONE_NOME}}
{{PRESTAZIONE_CODICE}}

{{DATA_VISITA}}
{{ORA_VISITA}}

{{CAMPO_nome_campo}}      // Campi dinamici visita

{{DATA_OGGI}}
{{ORA_CORRENTE}}
```

### 6.2 Esempio Template

```html
<h1>REFERTO {{PRESTAZIONE_NOME}}</h1>

<p><strong>Paziente:</strong> {{PAZIENTE_NOME}} {{PAZIENTE_COGNOME}}</p>
<p><strong>Nato il:</strong> {{PAZIENTE_DATA_NASCITA}}</p>
<p><strong>C.F.:</strong> {{PAZIENTE_CF}}</p>

<h2>Anamnesi</h2>
<p>{{CAMPO_anamnesi}}</p>

<h2>Esame Obiettivo</h2>
<p>Pressione: {{CAMPO_pressione_sistolica}}/{{CAMPO_pressione_diastolica}} mmHg</p>
<p>Frequenza cardiaca: {{CAMPO_frequenza_cardiaca}} bpm</p>

<h2>Conclusioni</h2>
<p>{{CAMPO_conclusioni}}</p>

<p class="footer">
  Referto redatto il {{DATA_OGGI}} alle ore {{ORA_CORRENTE}}<br>
  Dr. {{MEDICO_NOME}} {{MEDICO_COGNOME}}<br>
  Iscritto all'Albo dei Medici n. {{MEDICO_ALBO}}
</p>
```

---

## 7. REGOLE BUSINESS

| ID | Regola |
|----|--------|
| RB-01 | Solo medico esecutore può firmare |
| RB-02 | Referto firmato immutabile |
| RB-03 | Ogni modifica = nuova versione |
| RB-04 | PDF generato solo dopo firma |
| RB-05 | Versioni conservate indefinitamente |
| RB-06 | Hash SHA-256 per verifica integrità |

---

## 8. COLLEGAMENTI

- **Precedente**: [SPEC_09_VISITE.md](./SPEC_09_VISITE.md)
- **Prossimo**: [SPEC_11_RUOLI_PERMESSI.md](./SPEC_11_RUOLI_PERMESSI.md)
- **Correlato**: [SPEC_12_AUDIT_GDPR.md](./SPEC_12_AUDIT_GDPR.md)
- **Workflow**: [WF_04_REFERTO.md](../workflows/WF_04_REFERTO.md)
