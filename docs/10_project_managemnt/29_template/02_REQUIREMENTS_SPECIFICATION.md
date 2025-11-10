# Specifiche Requisiti - Template Management System

**Data**: 4 Novembre 2025  
**Versione**: 1.0  
**Status**: ✅ APPROVATO

---

## 📋 Indice

1. [Requisiti Funzionali](#requisiti-funzionali)
2. [Lettere di Incarico](#lettere-di-incarico)
3. [Registri Presenze](#registri-presenze)
4. [Attestati Partecipanti](#attestati-partecipanti)
5. [Sistema Marker](#sistema-marker)
6. [Requisiti Non Funzionali](#requisiti-non-funzionali)
7. [User Stories](#user-stories)

---

## 🎯 Requisiti Funzionali

### RF-001: Template Management
**Priorità**: ALTA

**Descrizione**: Sistema completo per creare, modificare, duplicare e gestire template multi-tipo.

**Criteri di Accettazione**:
- ✅ Utente Admin può creare nuovo template
- ✅ Utente Admin può modificare template esistente
- ✅ Utente Admin può impostare template come default per tipo
- ✅ Utente Manager può visualizzare e usare template
- ✅ Template supporta header, footer, logo personalizzati
- ✅ Template può essere company-specific o globale
- ✅ Template supporta soft delete
- ✅ Template ha versionamento automatico

**Vincoli Tecnici**:
- Multi-tenant isolation obbligatorio
- GDPR compliance per template contenenti dati personali
- Validazione markers prima del salvataggio

---

### RF-002: Google Workspace Integration
**Priorità**: MEDIA

**Descrizione**: Import template da Google Docs e Google Slides con conversione markers.

**Criteri di Accettazione**:
- ✅ Utente può incollare URL Google Docs
- ✅ Sistema converte formato Google → HTML template
- ✅ Sistema suggerisce markers trovati nel documento
- ✅ Utente può confermare/modificare markers suggeriti
- ✅ Sync opzionale per aggiornamenti template

**Vincoli Tecnici**:
- OAuth2 per Google API
- Rate limiting per API calls
- Fallback se Google API non disponibile

---

### RF-003: Document Generation
**Priorità**: ALTA

**Descrizione**: Generazione PDF/DOCX da template con sostituzione markers.

**Criteri di Accettazione**:
- ✅ Generazione singola documento in < 3 secondi
- ✅ Batch generation di 50 documenti in < 30 secondi
- ✅ Preview documento prima della generazione
- ✅ Selezione template (default o custom)
- ✅ Numerazione progressiva automatica per anno
- ✅ Download immediato o invio email
- ✅ Salvataggio in archivio con metadata
- ✅ Overwrite check per duplicati

**Vincoli Tecnici**:
- Queue system per batch > 10 documenti
- Storage limit: 50MB per documento
- Supporto formati: PDF, DOCX
- Watermark per bozze (opzionale)

---

### RF-004: Marker System
**Priorità**: ALTA

**Descrizione**: Sistema dinamico di placeholder collegati a DB con validazione.

**Criteri di Accettazione**:
- ✅ Markers disponibili dipendono da template type
- ✅ Markers supportano nested properties (`{{person.company.name}}`)
- ✅ Markers supportano formatting (`{{date|format:DD/MM/YYYY}}`)
- ✅ Markers supportano conditionals (`{{#if person.cf}}...{{/if}}`)
- ✅ Markers supportano loops (`{{#each sessions}}...{{/each}}`)
- ✅ Validazione markers in real-time durante editing
- ✅ Suggerimenti autocomplete per markers
- ✅ Preview con dati mock per ogni marker

**Vincoli Tecnici**:
- Syntax: Handlebars-like `{{marker}}`
- Case-insensitive matching
- XSS protection obbligatoria
- Escape HTML di default

---

## 📄 LETTERE DI INCARICO - Specifiche Dettagliate

### Caso d'Uso Principale

**Scenario**: L'amministratore deve generare lettere di incarico per i formatori assegnati a un corso programmato.

**Trigger**: Utente clicca "Genera Lettera Incarico" da `/schedules/:id/details`.

**Flusso**:
1. Sistema mostra modal con selezione template
2. Sistema pre-seleziona template default "lettera_incarico"
3. Sistema elenca formatori assegnati al corso
4. Utente seleziona uno o più formatori
5. Utente opzionalmente visualizza preview
6. Utente conferma generazione
7. Sistema genera PDF per ogni formatore
8. Sistema salva in DB (LetteraIncarico table)
9. Sistema mostra link download o invia email

### Dati Necessari per Generazione

**Sorgenti Dati**:
```prisma
// Prisma query necessaria
const schedule = await prisma.courseSchedule.findUnique({
  where: { id: scheduleId },
  include: {
    course: true,                  // Info corso
    trainer: {                     // Formatore principale
      include: { company: true }
    },
    company: true,                 // Azienda committente
    sessions: {                    // Sessioni programmate
      include: {
        trainer: true,
        coTrainer: true
      }
    },
    enrollments: {                 // Partecipanti
      include: { person: true }
    }
  }
});
```

### Markers Disponibili

#### Categoria: Formatore (`trainer.*`)
```yaml
- trainer.fullName:
    descrizione: "Nome completo formatore"
    esempio: "Prof. Marco Rossi"
    source: "Person.firstName + Person.lastName"
    
- trainer.firstName:
    descrizione: "Nome"
    esempio: "Marco"
    
- trainer.lastName:
    descrizione: "Cognome"
    esempio: "Rossi"
    
- trainer.email:
    descrizione: "Email"
    esempio: "marco.rossi@example.com"
    
- trainer.phone:
    descrizione: "Telefono"
    esempio: "+39 333 1234567"
    
- trainer.fiscalCode:
    descrizione: "Codice Fiscale"
    esempio: "RSSMRC80A01H501U"
    
- trainer.address:
    descrizione: "Indirizzo residenza"
    esempio: "Via Roma 123, Milano"
    
- trainer.certifications:
    descrizione: "Certificazioni possedute"
    esempio: "Formatore Antincendio, RSPP"
    source: "JSON field certifications"
    
- trainer.specialties:
    descrizione: "Specializzazioni"
    esempio: "Sicurezza sul lavoro, Primo soccorso"
```

#### Categoria: Corso (`course.*`)
```yaml
- course.title:
    descrizione: "Titolo corso"
    esempio: "Corso Antincendio Rischio Alto"
    
- course.code:
    descrizione: "Codice corso"
    esempio: "ANT-RA-2025"
    
- course.duration:
    descrizione: "Durata"
    esempio: "16 ore"
    
- course.category:
    descrizione: "Categoria"
    esempio: "Sicurezza"
    
- course.riskLevel:
    descrizione: "Livello rischio"
    esempio: "Alto"
    valori: ["Alto", "Medio", "Basso"]
    
- course.courseType:
    descrizione: "Tipo corso"
    esempio: "Antincendio"
    
- course.regulation:
    descrizione: "Normativa di riferimento"
    esempio: "D.Lgs. 81/2008, DM 10/03/1998"
    
- course.validityYears:
    descrizione: "Validità attestato"
    esempio: "3 anni"
    
- course.practicalHours:
    descrizione: "Ore pratiche"
    esempio: "8"
    
- course.contents:
    descrizione: "Contenuti corso"
    esempio: "Prevenzione incendi, gestione emergenze, esercitazioni pratiche"
```

#### Categoria: Schedule (`schedule.*`)
```yaml
- schedule.startDate:
    descrizione: "Data inizio"
    esempio: "15/01/2025"
    formato: "DD/MM/YYYY"
    
- schedule.endDate:
    descrizione: "Data fine"
    esempio: "22/01/2025"
    
- schedule.location:
    descrizione: "Luogo"
    esempio: "Aula Formazione - Sede Milano"
    
- schedule.deliveryMode:
    descrizione: "Modalità erogazione"
    esempio: "In presenza"
    valori: ["In presenza", "Online", "Ibrida"]
    
- schedule.maxParticipants:
    descrizione: "Numero massimo partecipanti"
    esempio: "15"
    
- schedule.totalHours:
    descrizione: "Ore totali"
    esempio: "16"
    computed: "SUM(sessions.duration)"
```

#### Categoria: Sessioni (`sessions.*`)
```yaml
- sessions.count:
    descrizione: "Numero sessioni"
    esempio: "2"
    
- sessions.list:
    descrizione: "Lista sessioni formattata"
    esempio: "15/01/2025 09:00-13:00\n22/01/2025 14:00-18:00"
    loop: true
    
- sessions[].date:
    descrizione: "Data sessione (in loop)"
    esempio: "15/01/2025"
    
- sessions[].start:
    descrizione: "Ora inizio"
    esempio: "09:00"
    
- sessions[].end:
    descrizione: "Ora fine"
    esempio: "13:00"
    
- sessions[].duration:
    descrizione: "Durata sessione"
    esempio: "4 ore"
    computed: "end - start"
```

#### Categoria: Azienda (`company.*`)
```yaml
- company.name:
    descrizione: "Ragione sociale"
    esempio: "Acme SpA"
    
- company.vatNumber:
    descrizione: "Partita IVA"
    esempio: "IT12345678901"
    
- company.fiscalCode:
    descrizione: "Codice Fiscale"
    esempio: "12345678901"
    
- company.address:
    descrizione: "Indirizzo sede legale"
    esempio: "Via Milano 10, 20121 Milano (MI)"
    
- company.legalRepresentative:
    descrizione: "Legale rappresentante"
    esempio: "Dr. Giovanni Bianchi"
    source: "personaRiferimento field"
    
- company.pec:
    descrizione: "PEC"
    esempio: "acme@pec.it"
    
- company.phone:
    descrizione: "Telefono"
    esempio: "+39 02 12345678"
```

#### Categoria: Sistema (`system.*`)
```yaml
- system.currentDate:
    descrizione: "Data odierna"
    esempio: "04/11/2025"
    formato: "DD/MM/YYYY"
    
- system.currentYear:
    descrizione: "Anno corrente"
    esempio: "2025"
    
- system.progressiveNumber:
    descrizione: "Numero progressivo documento"
    esempio: "123"
    computed: "auto-increment per anno"
    
- system.documentNumber:
    descrizione: "Numero completo documento"
    esempio: "LI-123/2025"
    formato: "LI-{progressive}/{year}"
    
- tenant.name:
    descrizione: "Nome ente/azienda"
    esempio: "Element Medica Srl"
    
- tenant.logo:
    descrizione: "Logo aziendale"
    tipo: "image"
    formato: "base64 o URL"
```

#### Categoria: Compensi (opzionale)
```yaml
- compensation.hourlyRate:
    descrizione: "Tariffa oraria formatore"
    esempio: "€ 50,00"
    formato: "currency"
    source: "JSON field o tabella separata"
    
- compensation.totalHours:
    descrizione: "Ore totali"
    esempio: "16"
    
- compensation.totalAmount:
    descrizione: "Importo totale"
    esempio: "€ 800,00"
    computed: "hourlyRate * totalHours"
    
- compensation.travelExpenses:
    descrizione: "Rimborso spese viaggio"
    esempio: "€ 50,00"
    
- compensation.grandTotal:
    descrizione: "Totale comprensivo spese"
    esempio: "€ 850,00"
```

### Template Esempio - Lettera Incarico

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.6; }
    .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; }
    .logo { max-width: 200px; }
    .recipient { margin-top: 40px; }
    .content { margin-top: 30px; text-align: justify; }
    .signature { margin-top: 50px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f2f2f2; }
  </style>
</head>
<body>
  <div class="header">
    {{#if tenant.logo}}
    <img src="{{tenant.logo}}" class="logo" alt="Logo">
    {{/if}}
    <h2>{{tenant.name}}</h2>
    <p>Lettera di Incarico n. {{system.documentNumber}}</p>
    <p>Data: {{system.currentDate}}</p>
  </div>
  
  <div class="recipient">
    <p><strong>Spett.le</strong></p>
    <p>{{trainer.fullName}}</p>
    <p>C.F. {{trainer.fiscalCode}}</p>
    <p>{{trainer.address}}</p>
    <p>Email: {{trainer.email}}</p>
  </div>
  
  <div class="content">
    <p><strong>Oggetto: Incarico per attività di formazione</strong></p>
    
    <p>Con la presente, formalizziamo l'incarico di docenza per il seguente corso di formazione:</p>
    
    <h3>Dettagli Corso</h3>
    <table>
      <tr>
        <th>Titolo</th>
        <td>{{course.title}}</td>
      </tr>
      <tr>
        <th>Codice Corso</th>
        <td>{{course.code}}</td>
      </tr>
      <tr>
        <th>Azienda Committente</th>
        <td>{{company.name}}</td>
      </tr>
      <tr>
        <th>Durata Totale</th>
        <td>{{course.duration}}</td>
      </tr>
      <tr>
        <th>Livello Rischio</th>
        <td>{{course.riskLevel}}</td>
      </tr>
      <tr>
        <th>Normativa</th>
        <td>{{course.regulation}}</td>
      </tr>
      <tr>
        <th>Luogo</th>
        <td>{{schedule.location}}</td>
      </tr>
      <tr>
        <th>Modalità</th>
        <td>{{schedule.deliveryMode}}</td>
      </tr>
    </table>
    
    <h3>Calendario Sessioni</h3>
    <table>
      <thead>
        <tr>
          <th>Data</th>
          <th>Orario</th>
          <th>Durata</th>
        </tr>
      </thead>
      <tbody>
        {{#each sessions}}
        <tr>
          <td>{{this.date}}</td>
          <td>{{this.start}} - {{this.end}}</td>
          <td>{{this.duration}}</td>
        </tr>
        {{/each}}
      </tbody>
    </table>
    
    <h3>Contenuti del Corso</h3>
    <p>{{course.contents}}</p>
    
    {{#if compensation}}
    <h3>Compenso</h3>
    <table>
      <tr>
        <th>Tariffa Oraria</th>
        <td>{{compensation.hourlyRate}}</td>
      </tr>
      <tr>
        <th>Ore Totali</th>
        <td>{{compensation.totalHours}}</td>
      </tr>
      <tr>
        <th>Subtotale</th>
        <td>{{compensation.totalAmount}}</td>
      </tr>
      {{#if compensation.travelExpenses}}
      <tr>
        <th>Rimborso Spese</th>
        <td>{{compensation.travelExpenses}}</td>
      </tr>
      {{/if}}
      <tr>
        <th><strong>Totale</strong></th>
        <td><strong>{{compensation.grandTotal}}</strong></td>
      </tr>
    </table>
    {{/if}}
    
    <h3>Obblighi del Docente</h3>
    <ul>
      <li>Tenere le lezioni secondo il calendario concordato</li>
      <li>Preparare materiale didattico conforme ai contenuti del corso</li>
      <li>Compilare registro presenze e test di verifica</li>
      <li>Rispettare le normative vigenti in materia di sicurezza sul lavoro</li>
    </ul>
    
    <p>Il presente incarico è regolato dalle condizioni generali di contratto in essere.</p>
    
    <p>Distinti saluti.</p>
  </div>
  
  <div class="signature">
    <table style="border: none;">
      <tr style="border: none;">
        <td style="border: none; width: 50%;">
          <p><strong>Il Formatore</strong></p>
          <p>_____________________</p>
          <p>{{trainer.fullName}}</p>
        </td>
        <td style="border: none; width: 50%;">
          <p><strong>Per {{tenant.name}}</strong></p>
          <p>_____________________</p>
          <p>{{company.legalRepresentative}}</p>
        </td>
      </tr>
    </table>
  </div>
  
  <div class="footer" style="margin-top: 50px; font-size: 9pt; color: #666; border-top: 1px solid #ddd; padding-top: 10px;">
    <p style="text-align: center;">
      {{tenant.name}} - {{company.address}}<br>
      P.IVA {{company.vatNumber}} - PEC: {{company.pec}}
    </p>
  </div>
</body>
</html>
```

### Vincoli Specifici Lettere Incarico

**Business Rules**:
- ✅ Una lettera per combinazione (schedule + trainer) univoca
- ✅ Numerazione progressiva per anno (LI-001/2025, LI-002/2025, ...)
- ✅ Constraint DB: `@@unique([scheduledCourseId, trainerId])`
- ✅ Check duplicati prima generazione
- ✅ Overwrite opzionale se già esistente

**Validazioni**:
- Schedule deve avere almeno una sessione
- Trainer deve essere assegnato al schedule
- Schedule status deve essere != 'CANCELLED'
- Tutti i markers obbligatori devono essere risolvibili

---

## 📊 REGISTRI PRESENZE - Specifiche Dettagliate

### Caso d'Uso Principale

**Scenario**: Il formatore deve generare il registro presenze per una sessione specifica del corso.

**Trigger**: Utente clicca "Genera Registro" da `/schedules/:id/sessions/:sessionId`.

**Flusso**:
1. Sistema mostra modal con selezione template
2. Sistema carica lista partecipanti iscritti
3. Sistema pre-popola dati sessione
4. Utente conferma generazione
5. Sistema genera PDF con tabella presenze vuota
6. Sistema salva in DB (RegistroPresenze table)
7. Formatore stampa e raccoglie firme fisiche
8. Opzionale: Formatore compila digitalmente presenze e ricarica

### Dati Necessari per Generazione

**Sorgenti Dati**:
```prisma
const session = await prisma.courseSession.findUnique({
  where: { id: sessionId },
  include: {
    schedule: {
      include: {
        course: true,
        company: true,
        enrollments: {
          where: { status: 'COMPLETED' },  // Solo iscritti confermati
          include: {
            person: {
              include: { company: true }
            }
          }
        }
      }
    },
    trainer: true,
    coTrainer: true
  }
});
```

### Markers Disponibili

#### Categoria: Sessione (`session.*`)
```yaml
- session.date:
    descrizione: "Data sessione"
    esempio: "15/01/2025"
    
- session.startTime:
    descrizione: "Ora inizio"
    esempio: "09:00"
    
- session.endTime:
    descrizione: "Ora fine"
    esempio: "13:00"
    
- session.duration:
    descrizione: "Durata"
    esempio: "4 ore"
    computed: "endTime - startTime"
    
- session.trainer:
    descrizione: "Formatore principale"
    esempio: "Prof. Marco Rossi"
    
- session.coTrainer:
    descrizione: "Co-formatore"
    esempio: "Dott. Luigi Verdi"
    nullable: true
```

#### Categoria: Partecipanti (`participants.*`)
```yaml
- participants.count:
    descrizione: "Numero partecipanti"
    esempio: "12"
    
- participants.list:
    descrizione: "Lista partecipanti (loop)"
    loop: true
    
- participants[].fullName:
    descrizione: "Nome completo"
    esempio: "Mario Rossi"
    
- participants[].fiscalCode:
    descrizione: "Codice Fiscale"
    esempio: "RSSMRA80A01H501U"
    
- participants[].company:
    descrizione: "Azienda di appartenenza"
    esempio: "Acme SpA"
    
- participants[].role:
    descrizione: "Ruolo aziendale"
    esempio: "Operaio, Impiegato, Dirigente"
    source: "PersonRole.roleType"
```

#### Categoria: Corso (eredita da Lettere Incarico)
```yaml
- course.title
- course.code
- course.duration
- course.category
- course.riskLevel
- course.regulation
```

#### Categoria: Schedule (eredita da Lettere Incarico)
```yaml
- schedule.startDate
- schedule.endDate
- schedule.location
- schedule.deliveryMode
- schedule.maxParticipants
```

### Template Esempio - Registro Presenze

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    @page { size: A4 landscape; margin: 15mm; }
    body { font-family: Arial, sans-serif; font-size: 10pt; }
    .header { text-align: center; margin-bottom: 20px; }
    table.presenze { width: 100%; border-collapse: collapse; font-size: 9pt; }
    table.presenze th, table.presenze td { border: 1px solid #000; padding: 5px; }
    table.presenze th { background-color: #e0e0e0; font-weight: bold; }
    .signature-col { width: 150px; }
    .notes-col { width: 100px; }
    .footer { margin-top: 30px; font-size: 9pt; }
  </style>
</head>
<body>
  <div class="header">
    <h2>REGISTRO PRESENZE</h2>
    <h3>{{course.title}} ({{course.code}})</h3>
    <p><strong>Sessione del {{session.date}}</strong> - Orario: {{session.startTime}} - {{session.endTime}}</p>
    <p>Luogo: {{schedule.location}} | Durata: {{session.duration}}</p>
  </div>
  
  <table class="presenze">
    <thead>
      <tr>
        <th style="width: 30px;">#</th>
        <th>Cognome e Nome</th>
        <th style="width: 120px;">Codice Fiscale</th>
        <th style="width: 150px;">Azienda</th>
        <th style="width: 80px;">Ruolo</th>
        <th class="signature-col">Firma Ingresso<br>({{session.startTime}})</th>
        <th class="signature-col">Firma Uscita<br>({{session.endTime}})</th>
        <th class="notes-col">Note</th>
      </tr>
    </thead>
    <tbody>
      {{#each participants}}
      <tr>
        <td style="text-align: center;">{{@index_plus_1}}</td>
        <td><strong>{{this.fullName}}</strong></td>
        <td>{{this.fiscalCode}}</td>
        <td>{{this.company}}</td>
        <td>{{this.role}}</td>
        <td class="signature-col">&nbsp;</td>
        <td class="signature-col">&nbsp;</td>
        <td class="notes-col">&nbsp;</td>
      </tr>
      {{/each}}
    </tbody>
  </table>
  
  <div class="footer">
    <table style="width: 100%; border: none; margin-top: 30px;">
      <tr style="border: none;">
        <td style="border: none; width: 50%;">
          <p><strong>Docente:</strong></p>
          <p>{{session.trainer}}</p>
          <p>Firma: _____________________</p>
        </td>
        {{#if session.coTrainer}}
        <td style="border: none; width: 50%;">
          <p><strong>Co-Docente:</strong></p>
          <p>{{session.coTrainer}}</p>
          <p>Firma: _____________________</p>
        </td>
        {{/if}}
      </tr>
    </table>
    
    <div style="margin-top: 30px; padding: 10px; border: 1px solid #000; background-color: #f9f9f9;">
      <p><strong>Normativa di Riferimento:</strong> {{course.regulation}}</p>
      <p><strong>Argomenti Trattati:</strong></p>
      <p style="min-height: 80px; border-bottom: 1px solid #ccc;">&nbsp;</p>
    </div>
    
    <p style="text-align: center; margin-top: 20px; font-size: 8pt; color: #666;">
      Documento generato il {{system.currentDate}} - {{tenant.name}}
    </p>
  </div>
</body>
</html>
```

### Vincoli Specifici Registri Presenze

**Business Rules**:
- ✅ Un registro per sessione univoco
- ✅ Partecipanti solo con enrollment status = 'COMPLETED'
- ✅ Ordinamento alfabetico partecipanti per cognome
- ✅ Numerazione progressiva righe (1, 2, 3, ...)
- ✅ Landscape orientation per tabella ampia

**Post-Generazione**:
- Possibilità di compilare digitalmente presenze
- Upload registro scansionato con firme
- Collegamento con RegistroPresenzePartecipante per tracciamento ore

---

## 🏆 ATTESTATI PARTECIPANTI - Specifiche Dettagliate

### Caso d'Uso Principale

**Scenario**: L'amministratore deve generare attestati per tutti i partecipanti che hanno completato il corso.

**Trigger**: Utente clicca "Genera Attestati" da `/schedules/:id/participants`.

**Flusso**:
1. Sistema mostra modal con selezione template
2. Sistema elenca partecipanti con enrollment COMPLETED
3. Utente seleziona partecipanti (default: tutti)
4. Utente conferma generazione batch
5. Sistema genera PDF per ogni partecipante
6. Sistema assegna numero progressivo univoco
7. Sistema salva in DB (Attestato table)
8. Sistema mostra riepilogo con download ZIP

### Dati Necessari per Generazione

**Sorgenti Dati**:
```prisma
const schedule = await prisma.courseSchedule.findUnique({
  where: { id: scheduleId },
  include: {
    course: true,
    company: true,
    trainer: true,
    sessions: true,
    enrollments: {
      where: { status: 'COMPLETED' },
      include: {
        person: {
          include: { company: true }
        }
      }
    }
  }
});
```

### Markers Disponibili

#### Categoria: Partecipante (`participant.*`)
```yaml
- participant.fullName:
    descrizione: "Nome completo"
    esempio: "Mario Rossi"
    
- participant.firstName:
    descrizione: "Nome"
    esempio: "Mario"
    
- participant.lastName:
    descrizione: "Cognome"
    esempio: "Rossi"
    
- participant.fiscalCode:
    descrizione: "Codice Fiscale"
    esempio: "RSSMRA80A01H501U"
    
- participant.birthDate:
    descrizione: "Data di nascita"
    esempio: "01/01/1980"
    
- participant.birthPlace:
    descrizione: "Luogo di nascita"
    esempio: "Roma (RM)"
    
- participant.company:
    descrizione: "Azienda di appartenenza"
    esempio: "Acme SpA"
    
- participant.role:
    descrizione: "Ruolo aziendale"
    esempio: "Operaio"
```

#### Categoria: Certificazione (`certificate.*`)
```yaml
- certificate.number:
    descrizione: "Numero attestato"
    esempio: "123/2025"
    formato: "{progressive}/{year}"
    
- certificate.issueDate:
    descrizione: "Data emissione"
    esempio: "22/01/2025"
    default: "schedule.endDate"
    
- certificate.expiryDate:
    descrizione: "Data scadenza"
    esempio: "22/01/2028"
    computed: "issueDate + course.validityYears"
    nullable: true
    
- certificate.validityPeriod:
    descrizione: "Periodo di validità"
    esempio: "3 anni"
    source: "course.validityYears"
```

#### Categoria: Completamento (`completion.*`)
```yaml
- completion.date:
    descrizione: "Data completamento corso"
    esempio: "22/01/2025"
    source: "schedule.endDate"
    
- completion.totalHours:
    descrizione: "Ore totali frequentate"
    esempio: "16"
    
- completion.attendancePercentage:
    descrizione: "Percentuale presenza"
    esempio: "100%"
    computed: "hoursAttended / totalHours * 100"
    
- completion.finalGrade:
    descrizione: "Voto finale test"
    esempio: "28/30"
    source: "TestPartecipante.punteggio"
    nullable: true
```

### Template Esempio - Attestato

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    @page { size: A4; margin: 0; }
    body { 
      font-family: 'Georgia', serif; 
      margin: 0; 
      padding: 40mm 25mm;
      background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
    }
    .certificate-container {
      background: white;
      padding: 40px;
      border: 10px solid #2c3e50;
      box-shadow: 0 0 30px rgba(0,0,0,0.2);
      position: relative;
    }
    .header {
      text-align: center;
      border-bottom: 3px solid #3498db;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .logo {
      max-width: 180px;
      margin-bottom: 15px;
    }
    .title {
      font-size: 36pt;
      font-weight: bold;
      color: #2c3e50;
      margin: 20px 0;
      text-transform: uppercase;
      letter-spacing: 3px;
    }
    .subtitle {
      font-size: 14pt;
      color: #7f8c8d;
      font-style: italic;
    }
    .body {
      text-align: center;
      margin: 40px 0;
      line-height: 1.8;
    }
    .recipient-name {
      font-size: 28pt;
      font-weight: bold;
      color: #2c3e50;
      margin: 20px 0;
      text-decoration: underline;
      text-decoration-color: #3498db;
    }
    .course-info {
      margin: 30px 0;
      padding: 20px;
      background-color: #ecf0f1;
      border-left: 5px solid #3498db;
      text-align: left;
    }
    .course-title {
      font-size: 18pt;
      font-weight: bold;
      color: #2c3e50;
      margin-bottom: 10px;
    }
    .details-table {
      width: 100%;
      margin: 20px 0;
      font-size: 11pt;
    }
    .details-table td {
      padding: 5px 10px;
    }
    .details-table .label {
      font-weight: bold;
      color: #7f8c8d;
      width: 40%;
    }
    .footer {
      margin-top: 50px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .signature-block {
      text-align: center;
      width: 45%;
    }
    .signature-line {
      border-top: 2px solid #2c3e50;
      margin-top: 50px;
      padding-top: 10px;
      font-size: 10pt;
    }
    .certificate-number {
      position: absolute;
      top: 40px;
      right: 40px;
      font-size: 10pt;
      color: #7f8c8d;
    }
    .validity-stamp {
      position: absolute;
      bottom: 40px;
      left: 40px;
      padding: 10px 15px;
      border: 2px solid #e74c3c;
      border-radius: 5px;
      color: #e74c3c;
      font-weight: bold;
      font-size: 10pt;
      transform: rotate(-5deg);
    }
    .watermark {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-45deg);
      font-size: 120pt;
      color: rgba(52, 152, 219, 0.05);
      z-index: -1;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="certificate-container">
    <div class="watermark">ATTESTATO</div>
    
    <div class="certificate-number">
      N. {{certificate.number}}
    </div>
    
    <div class="header">
      {{#if tenant.logo}}
      <img src="{{tenant.logo}}" class="logo" alt="Logo">
      {{/if}}
      <div class="title">Attestato di Frequenza</div>
      <div class="subtitle">{{tenant.name}}</div>
    </div>
    
    <div class="body">
      <p style="font-size: 14pt;">Si attesta che</p>
      
      <div class="recipient-name">
        {{participant.fullName}}
      </div>
      
      <p style="font-size: 12pt;">
        nato/a a {{participant.birthPlace}} il {{participant.birthDate}}<br>
        C.F. {{participant.fiscalCode}}
      </p>
      
      <p style="font-size: 13pt; margin: 30px 0;">
        ha frequentato con profitto il corso di formazione:
      </p>
      
      <div class="course-info">
        <div class="course-title">{{course.title}}</div>
        
        <table class="details-table">
          <tr>
            <td class="label">Codice Corso:</td>
            <td>{{course.code}}</td>
          </tr>
          <tr>
            <td class="label">Categoria:</td>
            <td>{{course.category}} - Rischio {{course.riskLevel}}</td>
          </tr>
          <tr>
            <td class="label">Durata:</td>
            <td>{{course.duration}} ({{completion.totalHours}} ore complessive)</td>
          </tr>
          <tr>
            <td class="label">Periodo:</td>
            <td>dal {{schedule.startDate}} al {{schedule.endDate}}</td>
          </tr>
          <tr>
            <td class="label">Luogo:</td>
            <td>{{schedule.location}}</td>
          </tr>
          <tr>
            <td class="label">Modalità:</td>
            <td>{{schedule.deliveryMode}}</td>
          </tr>
          <tr>
            <td class="label">Azienda:</td>
            <td>{{company.name}}</td>
          </tr>
          <tr>
            <td class="label">Docente:</td>
            <td>{{trainer.fullName}}</td>
          </tr>
          {{#if completion.finalGrade}}
          <tr>
            <td class="label">Esito Verifica:</td>
            <td><strong>{{completion.finalGrade}}</strong></td>
          </tr>
          {{/if}}
        </table>
        
        <p style="margin-top: 15px; font-size: 10pt; color: #7f8c8d;">
          <strong>Normativa di riferimento:</strong> {{course.regulation}}
        </p>
      </div>
      
      {{#if certificate.validityPeriod}}
      <p style="font-size: 11pt; color: #e74c3c; font-weight: bold; margin-top: 20px;">
        Attestato valido per {{certificate.validityPeriod}} dalla data di emissione
      </p>
      {{/if}}
    </div>
    
    <div class="footer">
      <div class="signature-block">
        <div class="signature-line">
          Il Docente<br>
          <strong>{{trainer.fullName}}</strong>
        </div>
      </div>
      
      <div class="signature-block">
        <div class="signature-line">
          Per {{tenant.name}}<br>
          <strong>{{company.legalRepresentative}}</strong>
        </div>
      </div>
    </div>
    
    {{#if certificate.expiryDate}}
    <div class="validity-stamp">
      Valido fino al<br>{{certificate.expiryDate}}
    </div>
    {{/if}}
    
    <p style="text-align: center; font-size: 8pt; color: #95a5a6; margin-top: 40px;">
      Attestato emesso in data {{certificate.issueDate}} - Numero progressivo {{certificate.number}}
    </p>
  </div>
</body>
</html>
```

### Vincoli Specifici Attestati

**Business Rules**:
- ✅ Un attestato per combinazione (schedule + person) univoco
- ✅ Numerazione progressiva globale per anno (001/2025, 002/2025, ...)
- ✅ Generazione solo per enrollment status = 'COMPLETED'
- ✅ Data emissione = schedule.endDate
- ✅ Data scadenza = emissione + course.validityYears (se presente)

**Batch Generation**:
- Supporto generazione fino a 100 attestati simultanei
- Queue per batch > 50
- ZIP download per batch completi
- Email automatica ai partecipanti (opzionale)

---

## 🔧 Sistema Marker - Specifiche Tecniche

### Sintassi Marker

**Base Syntax**:
```handlebars
{{marker.property}}              // Simple property
{{marker.nested.property}}       // Nested property
{{marker|format:pattern}}        // With formatter
{{#if condition}}...{{/if}}      // Conditional
{{#each array}}...{{/each}}      // Loop
{{#unless condition}}...{{/unless}} // Negative conditional
```

**Esempi**:
```handlebars
{{person.fullName}}                          // Output: "Mario Rossi"
{{date|format:DD/MM/YYYY}}                   // Output: "15/01/2025"
{{currency|format:€ 0,0.00}}                 // Output: "€ 1.234,56"
{{#if course.validityYears}}Valido {{course.validityYears}} anni{{/if}}
{{#each sessions}}{{date}} {{start}}-{{end}}{{#unless @last}}, {{/unless}}{{/each}}
```

### Formatters Disponibili

```yaml
date:
  patterns:
    - "DD/MM/YYYY"    # 15/01/2025
    - "DD MMM YYYY"   # 15 Gen 2025
    - "MMMM YYYY"     # Gennaio 2025
    - "dddd DD MMMM"  # Lunedì 15 Gennaio
    
currency:
  patterns:
    - "€ 0,0.00"      # € 1.234,56
    - "€0.00"         # €1234.56
    
number:
  patterns:
    - "0,0"           # 1.234
    - "0,0.00"        # 1.234,56
    
uppercase:
  esempio: "{{person.lastName|uppercase}}"  # ROSSI
  
lowercase:
  esempio: "{{person.email|lowercase}}"     # mario.rossi@example.com
  
capitalize:
  esempio: "{{course.title|capitalize}}"    # Corso Antincendio...
```

### Validazione Markers

**Regole**:
1. Marker deve esistere in categoria per template type
2. Nested properties max 3 livelli (`person.company.name` ✅, `a.b.c.d` ❌)
3. Formatters devono essere supportati
4. Loop solo su array markers
5. Conditionals solo su boolean o nullables

**Errori Comuni**:
```handlebars
❌ {{partecipant.name}}           // Typo: partecipant vs participant
✅ {{participant.name}}

❌ {{course.titolo}}              // Campo inesistente
✅ {{course.title}}

❌ {{date|format:DD-MM-YY}}       // Formato non supportato
✅ {{date|format:DD/MM/YYYY}}

❌ {{#each course}}...{{/each}}   // course non è array
✅ {{#each sessions}}...{{/each}}
```

---

## 📏 Requisiti Non Funzionali

### Performance

| Requisito | Target | Metrica |
|-----------|--------|---------|
| Template Load Time | < 1s | p95 |
| Template Save Time | < 500ms | p95 |
| PDF Generation (single) | < 3s | p95 |
| Batch 50 PDFs | < 30s | p95 |
| Preview Rendering | < 1s | p95 |

### Scalabilità

- Supporto fino a 1000 template per tenant
- Generazione batch fino a 200 documenti
- Storage fino a 50MB per documento
- Concurrent generations: 10 per tenant

### Sicurezza

- ✅ Role-based access control (Admin, Manager, User)
- ✅ Multi-tenant isolation obbligatorio
- ✅ XSS protection nei markers
- ✅ GDPR compliance per dati personali
- ✅ Audit log per generazioni documenti
- ✅ Encrypted storage per PDF sensibili

### Usabilità

- Editor WYSIWYG intuitivo (< 5 minuti training)
- Marker autocomplete con < 3 caratteri
- Preview real-time < 1s latency
- Mobile-responsive dashboard
- Help contestuale disponibile

---

## 👤 User Stories

### US-001: Creazione Template
**Come** Admin  
**Voglio** creare un nuovo template per lettere di incarico  
**Così che** possa personalizzare il formato per la mia azienda

**Acceptance Criteria**:
- Posso scegliere tipo template da dropdown
- Posso inserire nome descrittivo
- Posso usare editor WYSIWYG
- Posso inserire markers con autocomplete
- Posso visualizzare preview con dati mock
- Posso salvare come draft o pubblicare
- Posso impostare come default

### US-002: Generazione Batch Attestati
**Come** Manager  
**Voglio** generare attestati per tutti i partecipanti di un corso completato  
**Così che** possa distribuirli rapidamente

**Acceptance Criteria**:
- Vedo lista partecipanti eligibili
- Posso selezionare partecipanti specifici o tutti
- Posso scegliere template (default pre-selezionato)
- Vedo progress bar durante generazione
- Ricevo ZIP con tutti i PDF
- Ogni attestato ha numero progressivo univoco

### US-003: Import da Google Docs
**Come** Admin  
**Voglio** importare un template da Google Docs  
**Così che** possa riutilizzare template già esistenti

**Acceptance Criteria**:
- Posso incollare URL Google Docs
- Sistema converte HTML correttamente
- Sistema suggerisce markers trovati
- Posso confermare o modificare markers
- Template importato appare nella lista

---

**Approvato da**: Project Manager  
**Data**: 4 Novembre 2025  
**Prossima Review**: Post-Phase 2 Implementation
