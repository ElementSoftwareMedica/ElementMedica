# 🩺 SPEC_09: Gestione Visite

**Versione**: 1.0  
**Ultimo aggiornamento**: 2025-12-11  
**Collegato a**: [SPEC_07_APPUNTAMENTI.md](./SPEC_07_APPUNTAMENTI.md), [SPEC_10_REFERTI.md](./SPEC_10_REFERTI.md)

---

## 1. OVERVIEW

La Visita è il momento clinico vero e proprio. Viene creata dall'appuntamento quando il paziente entra in ambulatorio. Include:
- Form dinamico basato su template prestazione
- Timing (inizio/fine)
- Allegati e documentazione
- Collegamento al referto

### 1.1 Stati Visita

```
┌──────────────┐
│   INIZIATA   │ ← Paziente entra in ambulatorio
└──────┬───────┘
       │ Compilazione form
       ▼
┌──────────────┐
│ IN_CORSO     │ ← Medico compila dati
└──────┬───────┘
       │ Medico conclude
       ▼
┌──────────────┐
│  COMPLETATA  │ ← Pronta per referto
└──────┬───────┘
       │ Referto firmato
       ▼
┌──────────────┐
│  REFERTATA   │
└──────────────┘

Stato alternativo:
- ANNULLATA (paziente va via, emergenza)
```

---

## 2. ENTITÀ DATABASE

### 2.1 Modello Visita

```prisma
model Visita {
  id                    String   @id @default(uuid())
  
  // Appuntamento origine
  appuntamentoId        String   @unique
  appuntamento          Appuntamento @relation(fields: [appuntamentoId], references: [id])
  
  // Esecutori
  medicoEsecutoreId     String
  medicoEsecutore       Person   @relation("MedicoVisita", fields: [medicoEsecutoreId], references: [id])
  
  infermiereAssistenteId String?
  infermiereAssistente  Person?  @relation("InfermiereVisita", fields: [infermiereAssistenteId], references: [id])
  
  // Stato
  stato                 StatoVisita          @default(INIZIATA)
  
  // Timing
  oraInizio             DateTime
  oraFine               DateTime?
  durataEffettivaMinuti Int?                 // Calcolata a fine visita
  
  // Dati clinici (JSON per flessibilità)
  datiClinici           Json?                // Snapshot dati inseriti
  
  // Note
  noteVisita            String?  @db.Text
  noteInterne           String?  @db.Text    // Solo staff
  
  // Prestazione aggiuntiva (se aggiunta durante visita)
  prestazioniAggiuntive PrestazioneAggiuntiva[]
  
  // Valori campi form
  valoriCampi           ValoreCampoVisita[]
  
  // Allegati
  allegati              AllegatoVisita[]
  
  // Referto
  referto               Referto?
  
  // Multi-tenancy
  tenantId              String
  tenant                Tenant   @relation(fields: [tenantId], references: [id])
  
  // Timestamps
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  deletedAt             DateTime?
  
  @@index([tenantId])
  @@index([medicoEsecutoreId])
  @@index([stato])
  @@index([oraInizio])
}

enum StatoVisita {
  INIZIATA
  IN_CORSO
  COMPLETATA
  REFERTATA
  ANNULLATA
}
```

### 2.2 Valori Campi Visita

```prisma
model ValoreCampoVisita {
  id                    String   @id @default(uuid())
  
  // Visita
  visitaId              String
  visita                Visita   @relation(fields: [visitaId], references: [id])
  
  // Campo template
  campoVisitaId         String
  campoVisita           TemplateCampoVisita @relation(fields: [campoVisitaId], references: [id])
  
  // Valore inserito
  valore                String?  @db.Text
  valoreJson            Json?                // Per tipi complessi (multiselect, etc.)
  
  // File (per campi tipo FILE)
  fileUrl               String?
  fileName              String?
  
  // Multi-tenancy
  tenantId              String
  
  // Timestamps
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  
  @@unique([visitaId, campoVisitaId])
  @@index([tenantId])
  @@index([visitaId])
}
```

### 2.3 Allegati Visita

```prisma
model AllegatoVisita {
  id                    String   @id @default(uuid())
  
  visitaId              String
  visita                Visita   @relation(fields: [visitaId], references: [id])
  
  // File
  nome                  String
  descrizione           String?
  tipo                  TipoAllegato         @default(DOCUMENTO)
  mimeType              String
  dimensioneBytes       Int
  
  // Storage
  storageKey            String               // Key S3/GCS
  url                   String?              // URL firmato (temporaneo)
  
  // Metadata
  caricatoDaId          String
  caricatoDa            Person   @relation(fields: [caricatoDaId], references: [id])
  
  // Multi-tenancy
  tenantId              String
  
  // Timestamps
  createdAt             DateTime @default(now())
  
  @@index([tenantId])
  @@index([visitaId])
}

enum TipoAllegato {
  DOCUMENTO             // Documenti vari
  IMMAGINE              // Foto, radiografie
  ESAME_LABORATORIO     // Referti lab
  IMPEGNATIVA           // Impegnativa SSN
  CONSENSO_FIRMATO      // Consenso informato
  ALTRO
}
```

---

## 3. FORM BUILDER - RENDERING

### 3.1 Algoritmo Rendering

```typescript
function renderFormVisita(prestazione: Prestazione, visita?: Visita) {
  // 1. Ottieni template campi ordinati
  const campi = prestazione.templateCampi.sort((a, b) => a.ordinamento - b.ordinamento);
  
  // 2. Raggruppa per gruppo
  const gruppi = groupBy(campi, 'gruppoCampo');
  
  // 3. Per ogni campo, determina se visibile (condizioni)
  const campiVisibili = campi.filter(campo => {
    if (!campo.condizioneCampoId) return true;
    const valorePadre = getValoreCampo(visita, campo.condizioneCampoId);
    return valorePadre === campo.condizioneValore;
  });
  
  // 4. Renderizza con valori esistenti (se modifica)
  return campiVisibili.map(campo => ({
    ...campo,
    valore: visita?.valoriCampi.find(v => v.campoVisitaId === campo.id)?.valore
  }));
}
```

### 3.2 Tipi Campo Supportati

| Tipo | Componente React | Note |
|------|------------------|------|
| TEXT | `<Input>` | Testo breve |
| TEXTAREA | `<Textarea>` | Testo lungo, rich text opzionale |
| NUMBER | `<InputNumber>` | Con min/max |
| DATE | `<DatePicker>` | Solo data |
| DATETIME | `<DateTimePicker>` | Data e ora |
| SELECT | `<Select>` | Dropdown singolo |
| MULTISELECT | `<Select multiple>` | Multi-selezione |
| RADIO | `<RadioGroup>` | Opzioni esclusive |
| CHECKBOX | `<Checkbox>` | Singolo boolean |
| CHECKBOX_GROUP | `<CheckboxGroup>` | Multi checkbox |
| FILE | `<FileUpload>` | Upload allegato |
| SIGNATURE | `<SignaturePad>` | Firma touch/mouse |
| SCALE | `<Slider>` | Scala numerica (VAS) |

---

## 4. FUNZIONALITÀ

### 4.1 Workflow Visita
| Azione | Permesso | Note |
|--------|----------|------|
| Inizia visita | `START_VISITS` | Medico |
| Compila form | `EDIT_VISITS` | Medico, Infermiere |
| Aggiungi allegato | `EDIT_VISITS` | - |
| Completa visita | `COMPLETE_VISITS` | Medico |
| Visualizza | `VIEW_VISITS` | - |
| Annulla | `CANCEL_VISITS` | Motivazione obbligatoria |

### 4.2 Salvataggio
- **Auto-save**: Ogni 30 secondi durante compilazione
- **Draft**: Salvataggio manuale intermedio
- **Completa**: Validazione campi obbligatori

---

## 5. API ENDPOINTS

```
# CRUD
GET    /api/v1/clinica/visite                          # Lista (filtri)
GET    /api/v1/clinica/visite/:id                      # Dettaglio
POST   /api/v1/clinica/visite                          # Crea (da appuntamento)
PUT    /api/v1/clinica/visite/:id                      # Modifica

# Workflow
POST   /api/v1/clinica/visite/:id/inizia               # Inizio visita
PUT    /api/v1/clinica/visite/:id/campi                # Salva campi
POST   /api/v1/clinica/visite/:id/completa             # Completa
POST   /api/v1/clinica/visite/:id/annulla              # Annulla

# Form
GET    /api/v1/clinica/visite/:id/form                 # Template + valori
POST   /api/v1/clinica/visite/:id/autosave             # Auto-save draft

# Allegati
GET    /api/v1/clinica/visite/:id/allegati             # Lista allegati
POST   /api/v1/clinica/visite/:id/allegati             # Upload
DELETE /api/v1/clinica/visite/:id/allegati/:allegId    # Elimina
GET    /api/v1/clinica/visite/:id/allegati/:allegId/download # Download
```

---

## 6. UI COMPONENTS

### 6.1 Pagine
- `VisitaView.tsx` - Vista completa visita
- `VisitaForm.tsx` - Form compilazione

### 6.2 Form Components
- `DynamicForm.tsx` - Renderer form dinamico
- `FormField.tsx` - Singolo campo
- `FormGroup.tsx` - Gruppo campi
- `FormPreview.tsx` - Anteprima read-only

### 6.3 Widgets
- `VisitaTimer.tsx` - Timer durata visita
- `AllegatiList.tsx` - Lista allegati
- `QuickNotes.tsx` - Note rapide
- `PazienteSnapshot.tsx` - Info paziente

---

## 7. REGOLE BUSINESS

| ID | Regola |
|----|--------|
| RB-01 | Visita solo da appuntamento IN_VISITA |
| RB-02 | Un appuntamento = una visita |
| RB-03 | Campi obbligatori per completare |
| RB-04 | Visita completata non modificabile (solo note) |
| RB-05 | Allegati max 10MB ciascuno |
| RB-06 | Formati allegati: PDF, JPG, PNG, DICOM |

---

## 8. COLLEGAMENTI

- **Precedente**: [SPEC_08_NUMERO_CHIAMATA.md](./SPEC_08_NUMERO_CHIAMATA.md)
- **Prossimo**: [SPEC_10_REFERTI.md](./SPEC_10_REFERTI.md)
- **Correlato**: [SPEC_03_PRESTAZIONI.md](./SPEC_03_PRESTAZIONI.md)
- **Workflow**: [WF_03_VISITA.md](../workflows/WF_03_VISITA.md)
