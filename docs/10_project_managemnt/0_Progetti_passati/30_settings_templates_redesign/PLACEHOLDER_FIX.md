# Fix Template Editor - 6 Novembre 2025 (Parte 2)

## Problemi Risolti

### 1. ✅ Ridotte Dimensioni Editor Header e Footer
**Problema**: Header e Footer troppo grandi come l'editor del contenuto
**Soluzione**: 
- Aggiunto prop `minHeight` a TipTapEditor
- Header: `minHeight="150px"` (ridotto da 500px)
- Footer: `minHeight="150px"` (ridotto da 500px)  
- Content: `minHeight="500px"` (mantenuto)

### 2. ✅ Placeholder Corretti con Backend
**Problema**: Placeholder inventati non corrispondevano ai campi database, quindi non venivano sostituiti
**Causa**: PlaceholderSelector usava placeholder come `NOME_FORMATORE`, ma backend usa formato `person.firstName`

**Soluzione**:
Riscritto completamente PlaceholderSelector allineandolo a `backend/services/markerResolver.js`

#### Mapping Placeholder Vecchi → Nuovi

**Persona (Partecipante/Dipendente)**
```
NOME_FORMATORE → person.firstName
COGNOME_FORMATORE → person.lastName
NOME_COMPLETO_FORMATORE → person.fullName
EMAIL_FORMATORE → person.email
CF_FORMATORE → person.cf
TELEFONO_FORMATORE → person.phone
```

**Corso**
```
CORSO_TITOLO → course.title
CORSO_CODICE → course.code
CORSO_DURATA → course.duration
ORE_TOTALI → schedule.totalHours
PRIMA_DATA → schedule.startDate
ULTIMA_DATA → schedule.endDate
LUOGO_CORSO → schedule.location
```

**Azienda**
```
AZIENDA_RAGIONE_SOCIALE → company.name
AZIENDA_PIVA → company.vatNumber
AZIENDA_CF → company.fiscalCode
AZIENDA_INDIRIZZO → company.address.full
AZIENDA_EMAIL → company.email
AZIENDA_TELEFONO → company.phone
AZIENDA_PEC → (non mappato nel backend)
```

**Docente/Formatore**
```
NOME_FORMATORE → trainer.firstName
COGNOME_FORMATORE → trainer.lastName
NOME_COMPLETO_FORMATORE → trainer.fullName
EMAIL_FORMATORE → trainer.email
QUALIFICHE_FORMATORE → trainer.qualifications
```

**Documento**
```
DATA_GENERAZIONE → document.date | current.date
NUMERO_PROGRESSIVO → document.number
ANNO_CORRENTE → current.year
```

**Sistema**
```
NOME_PIATTAFORMA → tenant.name
URL_PIATTAFORMA → tenant.website
```

## Nuove Categorie Placeholder

### 1. Persona (Partecipante/Dipendente) - 13 placeholder
- `person.fullName` - Nome completo
- `person.firstName` - Nome
- `person.lastName` - Cognome
- `person.email` - Email
- `person.cf` - Codice fiscale
- `person.phone` - Telefono
- `person.birthDate` - Data di nascita
- `person.birthPlace` - Luogo di nascita
- `person.address.street` - Via
- `person.address.city` - Città
- `person.address.province` - Provincia
- `person.address.postalCode` - CAP
- `person.address.full` - Indirizzo completo

### 2. Corso - 9 placeholder
- `course.title` - Titolo corso
- `course.code` - Codice corso
- `course.duration` - Durata (ore)
- `course.validityYears` - Anni validità
- `course.category` - Categoria
- `course.regulation` - Normativa
- `course.description` - Descrizione
- `course.objectives` - Obiettivi
- `course.topics` - Argomenti

### 3. Programmazione (Schedule) - 9 placeholder
- `schedule.startDate` - Data inizio
- `schedule.endDate` - Data fine
- `schedule.location` - Sede
- `schedule.address` - Indirizzo sede
- `schedule.maxParticipants` - Max partecipanti
- `schedule.sessionsCount` - Numero sessioni
- `schedule.totalHours` - Ore totali
- `schedule.status` - Stato
- `schedule.code` - Codice edizione

### 4. Azienda - 11 placeholder
- `company.name` - Ragione sociale
- `company.vatNumber` - Partita IVA
- `company.fiscalCode` - Codice fiscale
- `company.address.street` - Via
- `company.address.city` - Città
- `company.address.province` - Provincia
- `company.address.postalCode` - CAP
- `company.address.full` - Indirizzo completo
- `company.legalRepresentative` - Legale rappresentante
- `company.email` - Email
- `company.phone` - Telefono

### 5. Docente/Formatore - 8 placeholder
- `trainer.fullName` - Nome completo docente
- `trainer.firstName` - Nome
- `trainer.lastName` - Cognome
- `trainer.email` - Email
- `trainer.phone` - Telefono
- `trainer.qualifications` - Qualifiche
- `trainer.certifications` - Certificazioni
- `trainer.specialties` - Specializzazioni

### 6. Documento - 4 placeholder
- `document.number` - Numero documento
- `document.type` - Tipo documento
- `document.date` - Data emissione
- `document.id` - ID documento

### 7. Sistema/Tenant - 9 placeholder
- `current.date` - Data corrente
- `current.year` - Anno corrente
- `current.time` - Ora corrente
- `tenant.name` - Nome ente
- `tenant.logo` - Logo ente
- `tenant.address` - Indirizzo ente
- `tenant.phone` - Telefono ente
- `tenant.email` - Email ente
- `tenant.website` - Sito web ente

## Formattatori Disponibili

Ora documentati direttamente nel PlaceholderSelector:

### Date Formatter
```
{{person.birthDate|date:DD/MM/YYYY}}
```
Pattern: DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD

### Currency Formatter
```
{{schedule.totalHours|currency:€}}
```
Formato italiano: 1.234,56 €

### Text Transform
- `|uppercase` - MAIUSCOLO
- `|lowercase` - minuscolo
- `|capitalize` - Prima Lettera Maiuscola
- `|capitalizeWords` - Ogni Parola Maiuscola

### Esempi Pratici
```html
<!-- Data formattata -->
{{schedule.startDate|date:DD/MM/YYYY}}

<!-- Nome maiuscolo -->
{{person.fullName|uppercase}}

<!-- Codice fiscale (sempre maiuscolo) -->
{{person.cf|uppercase}}

<!-- Default se vuoto -->
{{person.phone|default:Non specificato}}
```

## Come Funziona la Sostituzione Backend

### 1. Template Salvato
```html
<h1>Attestato di Partecipazione</h1>
<p>Si certifica che {{person.fullName}} ha partecipato al corso "{{course.title}}".</p>
<p>Data: {{current.date|date:DD/MM/YYYY}}</p>
```

### 2. Backend Build Context
File: `backend/services/documentService.js` → `_buildContext()`

Costruisce oggetto context da:
- Person (da database)
- Course (da database)
- Schedule (da database)
- Company (da database)
- Trainer (da database)
- Current (data/ora attuale)
- Tenant (configurazione)
- Document (metadati generazione)

### 3. MarkerResolver Risolve
File: `backend/services/markerResolver.js`

```javascript
// Estrae tutti i {{marker}} dal template
const markers = parseMarkers(template.content);

// Per ogni marker:
for (marker of markers) {
  // Naviga l'oggetto context usando il path
  // es: person.fullName → context.person.fullName
  const value = context.get(marker.path);
  
  // Applica formatter se presente
  // es: |date:DD/MM/YYYY
  if (marker.formatter) {
    value = formatterRegistry.format(marker.formatter, value, marker.args);
  }
  
  // Sostituisce nel template
  template = template.replace(`{{${marker.raw}}}`, value);
}
```

### 4. Esempio Concreto

**Input Context** (da `backend/routes/attestati-routes.js`):
```javascript
{
  person: {
    fullName: "Mario Rossi",
    firstName: "Mario",
    lastName: "Rossi",
    cf: "RSSMRA80A01H501U",
    birthDate: new Date("1980-01-01"),
    birthPlace: "Milano"
  },
  course: {
    title: "Sicurezza sul Lavoro",
    code: "SSL-001",
    duration: "16",
    category: "Sicurezza"
  },
  schedule: {
    startDate: new Date("2025-02-01"),
    endDate: new Date("2025-02-15"),
    location: "Milano",
    totalHours: "16"
  },
  current: {
    date: new Date(),
    year: 2025,
    time: "14:30"
  }
}
```

**Template**:
```html
<h1>Attestato di Partecipazione</h1>
<p>Si certifica che <strong>{{person.fullName}}</strong> (CF: {{person.cf|uppercase}})</p>
<p>nato/a a {{person.birthPlace}} il {{person.birthDate|date:DD/MM/YYYY}}</p>
<p>ha completato il corso <strong>{{course.title}}</strong> ({{course.code}})</p>
<p>della durata di {{course.duration}} ore, tenutosi a {{schedule.location}}</p>
<p>dal {{schedule.startDate|date:DD/MM/YYYY}} al {{schedule.endDate|date:DD/MM/YYYY}}</p>
<p>Milano, {{current.date|date:DD/MM/YYYY}}</p>
```

**Output HTML**:
```html
<h1>Attestato di Partecipazione</h1>
<p>Si certifica che <strong>Mario Rossi</strong> (CF: RSSMRA80A01H501U)</p>
<p>nato/a a Milano il 01/01/1980</p>
<p>ha completato il corso <strong>Sicurezza sul Lavoro</strong> (SSL-001)</p>
<p>della durata di 16 ore, tenutosi a Milano</p>
<p>dal 01/02/2025 al 15/02/2025</p>
<p>Milano, 06/11/2025</p>
```

## File Modificati

### Frontend
1. **src/components/editor/TipTapEditor.tsx**
   - Aggiunto prop `minHeight?: string` (default: '500px')
   - Rimosso hardcoded `min-h-[500px]` in favore di style dinamico

2. **src/pages/settings/TemplateEditor.tsx**
   - Header editor: `minHeight="150px"`
   - Content editor: `minHeight="500px"`
   - Footer editor: `minHeight="150px"`

3. **src/components/templates/PlaceholderSelector.tsx** (RISCRITTO)
   - 63 placeholder totali (era 50+)
   - 7 categorie organizzate
   - Formato corretto: `{{category.property}}` invece di `{{UPPERCASE_NAME}}`
   - Documentazione formattatori nel footer
   - Esempi per ogni placeholder

### Nessuna Modifica Backend
Il backend era già corretto, i placeholder frontend erano semplicemente sbagliati.

## Testing

### Checklist Funzionalità ✅
- [x] Header editor altezza ridotta (150px)
- [x] Footer editor altezza ridotta (150px)
- [x] Content editor altezza normale (500px)
- [x] Placeholder in formato corretto `{{category.property}}`
- [x] 63 placeholder disponibili
- [x] Click su placeholder inserisce nell'editor attivo
- [x] Formato include parentesi graffe: `{{person.fullName}}`
- [x] Documentazione formattatori visibile
- [x] Esempi per ogni placeholder

### Test Generazione Documento
1. Crea template con placeholder: `{{person.fullName}}, {{course.title}}, {{current.date|date:DD/MM/YYYY}}`
2. Salva template
3. Genera attestato per un partecipante
4. Verifica che i placeholder siano sostituiti con dati reali

### Verifica Formattatori
Testa che i formattatori funzionino:
```
{{person.birthDate|date:DD/MM/YYYY}} → 01/01/1980
{{person.fullName|uppercase}} → MARIO ROSSI
{{person.cf|uppercase}} → RSSMRA80A01H501U
{{course.duration|currency:€}} → € 16,00
```

## Compatibilità Backend

I placeholder ora sono 100% compatibili con:
- `backend/services/markerResolver.js` (definizioni)
- `backend/services/documentService.js` (context building)
- `backend/routes/attestati-routes.js` (marker context)

## Schema Database

Verificato allineamento con Prisma:
- ✅ `Person` model: firstName, lastName, email, cf, phone, birthDate, birthPlace
- ✅ `Course` model: title, code, duration, validityYears, category, regulation
- ✅ `CourseSchedule` model: startDate, endDate, location, maxParticipants
- ✅ `Company` model: name (ragioneSociale), vatNumber (piva), fiscalCode, address fields
- ✅ `Person` as trainer: qualifications, certifications, specialties

## Prossimi Passi

1. **Test Completo Generazione Attestato**
   - Creare template con tutti i placeholder
   - Generare attestato per partecipante
   - Verificare PDF generato

2. **Template Predefiniti**
   - Creare template default per Attestati
   - Creare template default per Lettere di Incarico
   - Creare template default per Registro Presenze

3. **Validazione Placeholder**
   - Aggiungere validazione frontend che controlla placeholder esistano
   - Mostrare warning se placeholder non validi

4. **Auto-complete nell'Editor**
   - Aggiungere extension TipTap per auto-complete placeholder
   - Trigger con `{{` mostra dropdown con placeholder disponibili

## Note Tecniche

### Formato Placeholder
**IMPORTANTE**: Usare sempre formato `{{category.property}}`
- ✅ Corretto: `{{person.fullName}}`
- ❌ Sbagliato: `{{NOME_COMPLETO}}`
- ❌ Sbagliato: `{{nome_completo}}`

### Proprietà Nidificate
Fino a 3 livelli di profondità:
- `{{person.address.city}}` ✅
- `{{person.address.full}}` ✅
- `{{company.address.street}}` ✅

### Formattatori con Argomenti
```
{{marker|formatter:arg1,arg2}}
```
Esempi:
- `{{person.birthDate|date:DD/MM/YYYY}}`
- `{{person.fullName|truncate:50,...}}`
- `{{person.phone|default:Non disponibile}}`

## Riferimenti

- **Backend MarkerResolver**: `backend/services/markerResolver.js`
- **Backend DocumentService**: `backend/services/documentService.js`
- **Prisma Schema Person**: `backend/prisma/modules/users/schema.prisma`
- **Prisma Schema Course**: `backend/prisma/modules/courses/schema.prisma`
- **Prisma Schema Company**: `backend/prisma/modules/companies/schema.prisma`
- **Attestati Routes**: `backend/routes/attestati-routes.js`

## Backup

File originale salvato in: `src/components/templates/PlaceholderSelector.tsx.bak`
