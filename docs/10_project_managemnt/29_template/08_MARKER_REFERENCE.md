# Marker Reference - Template System

Guida completa ai marker disponibili nel sistema di template management.

## Sintassi

### Marker Semplice
```
{{category.property}}
```

Esempio: `{{person.fullName}}`

### Marker con Formatter
```
{{category.property|formatter}}
{{category.property|formatter:arg1}}
{{category.property|formatter:arg1,arg2}}
```

Esempi:
- `{{person.fullName|uppercase}}`
- `{{person.birthDate|date:DD/MM/YYYY}}`
- `{{course.price|currency:€}}`

### Proprietà Nidificate (Max 3 livelli)
```
{{category.subcategory.property}}
```

Esempio: `{{person.address.city}}`

---

## Marker Disponibili (65 totali)

### 1. Person Markers (15)

Dati relativi a persone (dipendenti, partecipanti, formatori).

| Marker | Descrizione | Tipo | Esempio Output |
|--------|-------------|------|----------------|
| `{{person.id}}` | ID persona | Number | `123` |
| `{{person.fullName}}` | Nome completo | String | `Mario Rossi` |
| `{{person.firstName}}` | Nome | String | `Mario` |
| `{{person.lastName}}` | Cognome | String | `Rossi` |
| `{{person.email}}` | Email | String | `mario.rossi@example.com` |
| `{{person.cf}}` | Codice fiscale | String | `RSSMRA80A01H501Z` |
| `{{person.phone}}` | Telefono | String | `333 1234567` |
| `{{person.birthDate}}` | Data di nascita | Date | `1980-01-01` |
| `{{person.birthPlace}}` | Luogo di nascita | String | `Roma` |
| `{{person.address.street}}` | Via | String | `Via Roma 123` |
| `{{person.address.city}}` | Città | String | `Milano` |
| `{{person.address.province}}` | Provincia | String | `MI` |
| `{{person.address.postalCode}}` | CAP | String | `20100` |
| `{{person.address.country}}` | Paese | String | `Italia` |
| `{{person.address.full}}` | Indirizzo completo | String | `Via Roma 123, 20100 Milano (MI)` |

**Formatter Comuni**:
- `{{person.fullName|capitalizeWords}}` → `Mario Rossi`
- `{{person.birthDate|date:DD/MM/YYYY}}` → `01/01/1980`
- `{{person.cf|cf}}` → `RSSMRA80A01H501Z` (uppercase)
- `{{person.phone|phone}}` → `333 1234567` (formato italiano)

---

### 2. Course Markers (10)

Dati relativi al corso di formazione.

| Marker | Descrizione | Tipo | Esempio Output |
|--------|-------------|------|----------------|
| `{{course.id}}` | ID corso | Number | `1` |
| `{{course.title}}` | Titolo corso | String | `Corso di Sicurezza sul Lavoro` |
| `{{course.code}}` | Codice corso | String | `SSL-001` |
| `{{course.duration}}` | Durata (ore) | Number | `16` |
| `{{course.validityYears}}` | Anni validità | Number | `5` |
| `{{course.category}}` | Categoria | String | `Sicurezza` |
| `{{course.regulation}}` | Normativa | String | `D.Lgs. 81/2008` |
| `{{course.description}}` | Descrizione | String | `Corso di formazione...` |
| `{{course.objectives}}` | Obiettivi | String | `Fornire le competenze...` |
| `{{course.topics}}` | Argomenti | String | `Normativa, Rischi, DPI...` |

**Formatter Comuni**:
- `{{course.title|uppercase}}` → `CORSO DI SICUREZZA SUL LAVORO`
- `{{course.duration}} ore` → `16 ore`
- `{{course.description|truncate:100}}` → Testo troncato a 100 caratteri

---

### 3. Schedule Markers (10)

Dati relativi alla programmazione/edizione specifica del corso.

| Marker | Descrizione | Tipo | Esempio Output |
|--------|-------------|------|----------------|
| `{{schedule.id}}` | ID programmazione | Number | `1` |
| `{{schedule.code}}` | Codice edizione | String | `SSL-001-2024-01` |
| `{{schedule.startDate}}` | Data inizio | Date | `2024-01-15` |
| `{{schedule.endDate}}` | Data fine | Date | `2024-01-20` |
| `{{schedule.location}}` | Sede | String | `Aula 1 - Sede Milano` |
| `{{schedule.address}}` | Indirizzo sede | String | `Via Milano 1, 20100 Milano` |
| `{{schedule.maxParticipants}}` | Numero max partecipanti | Number | `15` |
| `{{schedule.sessionsCount}}` | Numero sessioni | Number | `4` |
| `{{schedule.totalHours}}` | Ore totali | Number | `16` |
| `{{schedule.status}}` | Stato | String | `SCHEDULED` |

**Formatter Comuni**:
- `{{schedule.startDate|date:DD/MM/YYYY}}` → `15/01/2024`
- `{{schedule.endDate|date:DD/MM/YYYY}}` → `20/01/2024`

---

### 4. Company Markers (12)

Dati relativi all'azienda committente.

| Marker | Descrizione | Tipo | Esempio Output |
|--------|-------------|------|----------------|
| `{{company.id}}` | ID azienda | Number | `1` |
| `{{company.name}}` | Ragione sociale | String | `Azienda Example S.r.l.` |
| `{{company.vatNumber}}` | Partita IVA | String | `12345678901` |
| `{{company.fiscalCode}}` | Codice fiscale | String | `12345678901` |
| `{{company.address.street}}` | Via | String | `Via Azienda 1` |
| `{{company.address.city}}` | Città | String | `Milano` |
| `{{company.address.province}}` | Provincia | String | `MI` |
| `{{company.address.postalCode}}` | CAP | String | `20100` |
| `{{company.address.full}}` | Indirizzo completo | String | `Via Azienda 1, 20100 Milano (MI)` |
| `{{company.legalRepresentative}}` | Rappresentante legale | String | `Giuseppe Verdi` |
| `{{company.email}}` | Email | String | `info@example.com` |
| `{{company.phone}}` | Telefono | String | `02 12345678` |

**Formatter Comuni**:
- `{{company.name|uppercase}}` → `AZIENDA EXAMPLE S.R.L.`
- `{{company.vatNumber}}` → `12345678901`

---

### 5. Trainer Markers (9)

Dati relativi al docente/formatore.

| Marker | Descrizione | Tipo | Esempio Output |
|--------|-------------|------|----------------|
| `{{trainer.id}}` | ID docente | Number | `1` |
| `{{trainer.fullName}}` | Nome completo docente | String | `Laura Bianchi` |
| `{{trainer.firstName}}` | Nome docente | String | `Laura` |
| `{{trainer.lastName}}` | Cognome docente | String | `Bianchi` |
| `{{trainer.email}}` | Email docente | String | `laura.bianchi@example.com` |
| `{{trainer.phone}}` | Telefono docente | String | `333 9876543` |
| `{{trainer.qualifications}}` | Qualifiche | String | `Ingegnere della Sicurezza` |
| `{{trainer.certifications}}` | Certificazioni | String | `Formatore qualificato D.I. 06/03/2013` |
| `{{trainer.specialties}}` | Specializzazioni | String | `Sicurezza sul lavoro, Gestione emergenze` |

**Formatter Comuni**:
- `{{trainer.fullName|capitalizeWords}}` → `Laura Bianchi`

---

### 6. System Markers (6)

Marker di sistema e informazioni correnti.

| Marker | Descrizione | Tipo | Esempio Output |
|--------|-------------|------|----------------|
| `{{current.date}}` | Data corrente | Date | Data attuale |
| `{{current.year}}` | Anno corrente | Number | `2024` |
| `{{current.time}}` | Ora corrente | String | `14:30:00` |
| `{{tenant.id}}` | ID tenant | Number | `1` |
| `{{tenant.name}}` | Nome ente | String | `Element Medica Training` |
| `{{tenant.logo}}` | Logo ente | String | `/assets/logo.png` |

**Formatter Comuni**:
- `{{current.date|date:DD/MM/YYYY}}` → Data di oggi formattata
- `{{current.year}}` → Anno corrente (es: 2024)

---

### 7. Document Markers (3)

Dati relativi al documento generato.

| Marker | Descrizione | Tipo | Esempio Output |
|--------|-------------|------|----------------|
| `{{document.id}}` | ID documento | Number | `1` |
| `{{document.number}}` | Numero progressivo | String | `2024/001` |
| `{{document.type}}` | Tipo documento | String | `CERTIFICATE` |

**Formatter Comuni**:
- `{{document.number}}` → `2024/001`

---

## Formatter Disponibili (10)

### 1. Date Formatter

Formatta date secondo pattern specificato.

**Sintassi**: `{{marker|date:pattern}}`

**Pattern supportati**:
- `DD/MM/YYYY` → `15/01/2024`
- `DD-MM-YYYY` → `15-01-2024`
- `YYYY-MM-DD` → `2024-01-15`
- `DD/MM/YY` → `15/01/24`

**Esempi**:
```
{{person.birthDate|date:DD/MM/YYYY}}  → 01/01/1980
{{schedule.startDate|date:DD-MM-YYYY}} → 15-01-2024
{{current.date|date:YYYY-MM-DD}}       → 2024-11-04
```

---

### 2. Currency Formatter

Formatta numeri come valuta con simbolo.

**Sintassi**: `{{marker|currency:symbol}}`

**Simboli supportati**: `€`, `$`, `£` (default: `€`)

**Esempi**:
```
{{course.price|currency:€}}  → € 1.234,56
{{course.price|currency:$}}  → $ 1.234,56
{{course.price|currency}}    → € 1.234,56 (default)
```

---

### 3. Number Formatter

Formatta numeri con decimali specificati.

**Sintassi**: `{{marker|number:decimals}}`

**Esempi**:
```
{{course.duration|number:0}}   → 16
{{course.price|number:2}}      → 1.234,56
```

---

### 4. Text Transform Formatters

#### uppercase
Converte tutto in maiuscolo.

**Esempi**:
```
{{person.fullName|uppercase}}  → MARIO ROSSI
{{course.code|uppercase}}      → SSL-001
```

#### lowercase
Converte tutto in minuscolo.

**Esempi**:
```
{{person.email|lowercase}}     → mario.rossi@example.com
```

#### capitalize
Capitalizza prima lettera.

**Esempi**:
```
{{person.firstName|capitalize}} → Mario
```

#### capitalizeWords
Capitalizza ogni parola.

**Esempi**:
```
{{person.fullName|capitalizeWords}} → Mario Rossi
{{course.title|capitalizeWords}}    → Corso Di Sicurezza
```

---

### 5. Phone Formatter

Formatta numeri di telefono in formato italiano.

**Sintassi**: `{{marker|phone}}`

**Esempi**:
```
{{person.phone|phone}}   → 333 1234567
{{company.phone|phone}}  → 02 12345678
```

---

### 6. CF Formatter

Formatta codice fiscale in maiuscolo.

**Sintassi**: `{{marker|cf}}`

**Esempi**:
```
{{person.cf|cf}}  → RSSMRA80A01H501Z
```

---

### 7. Default Formatter

Fornisce valore di fallback se il marker è vuoto.

**Sintassi**: `{{marker|default:value}}`

**Esempi**:
```
{{person.phone|default:N/A}}              → N/A (se phone è vuoto)
{{person.email|default:Non specificato}}  → Non specificato (se email è vuoto)
```

---

### 8. Truncate Formatter

Tronca stringhe lunghe.

**Sintassi**: `{{marker|truncate:length,suffix}}`

**Esempi**:
```
{{course.description|truncate:100}}       → Primi 100 caratteri...
{{course.description|truncate:50,>>}}     → Primi 50 caratteri>>
```

---

## Esempi Completi

### Attestato di Partecipazione

```html
<h1>ATTESTATO DI PARTECIPAZIONE</h1>

<p>Si certifica che <strong>{{person.fullName|capitalizeWords}}</strong>,</p>
<p>nato/a a {{person.birthPlace}} il {{person.birthDate|date:DD/MM/YYYY}},</p>
<p>C.F. {{person.cf|cf}},</p>

<p>ha partecipato al corso "<strong>{{course.title}}</strong>"</p>
<p>della durata di {{course.duration}} ore,</p>
<p>svoltosi dal {{schedule.startDate|date:DD/MM/YYYY}} al {{schedule.endDate|date:DD/MM/YYYY}}</p>
<p>presso {{schedule.location}}.</p>

<p>Rilasciato in data {{current.date|date:DD/MM/YYYY}}</p>
<p>{{tenant.name}}</p>
```

### Lettera di Incarico

```html
<h2>LETTERA DI INCARICO</h2>

<p>Spett.le<br>
{{company.name|uppercase}}<br>
{{company.address.full}}<br>
P.IVA {{company.vatNumber}}</p>

<p>Oggetto: Incarico docenza corso "{{course.title}}"</p>

<p>Con la presente si conferisce incarico al/alla Sig./Sig.ra 
<strong>{{trainer.fullName|capitalizeWords}}</strong> per lo svolgimento 
dell'attività di docenza per il corso "{{course.title}}" 
(codice {{course.code}})</p>

<p>Il corso si svolgerà dal {{schedule.startDate|date:DD/MM/YYYY}} 
al {{schedule.endDate|date:DD/MM/YYYY}} per un totale di {{course.duration}} ore.</p>

<p>Data: {{current.date|date:DD/MM/YYYY}}</p>
```

### Registro Presenze

```html
<h2>REGISTRO PRESENZE</h2>

<p><strong>Corso:</strong> {{course.title}}</p>
<p><strong>Codice:</strong> {{course.code}}</p>
<p><strong>Edizione:</strong> {{schedule.code}}</p>
<p><strong>Periodo:</strong> dal {{schedule.startDate|date:DD/MM/YYYY}} 
al {{schedule.endDate|date:DD/MM/YYYY}}</p>
<p><strong>Sede:</strong> {{schedule.location}}</p>
<p><strong>Docente:</strong> {{trainer.fullName}}</p>

<table>
  <thead>
    <tr>
      <th>Data</th>
      <th>Partecipante</th>
      <th>Firma</th>
    </tr>
  </thead>
  <tbody>
    <!-- I partecipanti verranno aggiunti dinamicamente -->
  </tbody>
</table>
```

---

## Best Practices

### 1. Usa Formatter Appropriati
- Sempre usare `|date:DD/MM/YYYY` per le date
- Sempre usare `|cf` per codici fiscali
- Sempre usare `|currency:€` per importi

### 2. Gestisci Valori Mancanti
```html
{{person.phone|default:Non specificato}}
```

### 3. Formattazione Consistente
```html
<!-- ✅ Corretto -->
{{person.fullName|capitalizeWords}}

<!-- ❌ Evitare -->
{{person.fullName}}  <!-- Nome potrebbe essere in minuscolo -->
```

### 4. Proprietà Nidificate
```html
<!-- ✅ Corretto (max 3 livelli) -->
{{person.address.city}}

<!-- ❌ Evitare (troppo profondo) -->
{{person.address.details.street.number}}
```

### 5. Combinazioni di Formatter
I formatter NON sono concatenabili. Se serve trasformare in più modi, farlo lato backend.

```html
<!-- ❌ NON supportato -->
{{person.fullName|uppercase|truncate:20}}

<!-- ✅ Alternativa -->
{{person.fullName|uppercase}}
```

---

## Validazione e Suggerimenti

Il sistema di validazione fornisce suggerimenti automatici per typo:

**Marker non riconosciuto**: `{{person.fulName}}`
**Suggerimento**: Intendevi `person.fullName`?

**Formatter non riconosciuto**: `{{person.birthDate|dat}}`
**Suggerimento**: Intendevi `date`?

---

## Sicurezza

### XSS Protection
Il sistema protegge automaticamente da XSS escaping i caratteri `<` e `>`:

```html
<!-- Input marker -->
{{person.note}}  <!-- Valore: "<script>alert('xss')</script>" -->

<!-- Output protetto -->
scriptscriptalert('xss')scriptscript
```

### HTML nei Template
È sicuro includere HTML nei template. Solo i **valori** dei marker vengono escapati, non il markup del template.

---

## Testing

Il sistema include 81 test automatici che verificano:
- ✅ Parsing corretto di tutti i marker
- ✅ Risoluzione con proprietà nidificate
- ✅ Tutti i formatter funzionanti
- ✅ Validazione e suggerimenti
- ✅ Performance (<1s per 100 marker)
- ✅ XSS protection
- ✅ Error handling

---

## Support

Per aggiungere nuovi marker o formatter, modificare:
- **Marker**: `backend/services/markerResolver.js` → `_defineAllowedMarkers()`
- **Formatter**: `backend/services/markerResolver.js` → `_registerBuiltInFormatters()`
- **Test**: `backend/tests/markerResolver.test.js`
