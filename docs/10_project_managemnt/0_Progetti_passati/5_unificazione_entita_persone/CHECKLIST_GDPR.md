# Checklist GDPR: Unificazione Entità Persone

## 🎯 Obiettivo

Garantire la piena conformità al Regolamento Generale sulla Protezione dei Dati (GDPR) durante l'unificazione delle entità `Employee`, `Trainer` e `User` in un'unica entità `Person`.

## 📋 Principi GDPR da Rispettare

### 1. Liceità, Correttezza e Trasparenza
- [ ] **Base giuridica identificata** per il trattamento dei dati
- [ ] **Informativa privacy aggiornata** per riflettere le modifiche
- [ ] **Comunicazione trasparente** agli interessati sui cambiamenti
- [ ] **Documentazione** delle basi giuridiche per ogni tipo di dato

### 2. Limitazione della Finalità
- [ ] **Finalità specifiche** documentate per l'unificazione
- [ ] **Compatibilità** delle nuove finalità con quelle originali
- [ ] **Aggiornamento** delle finalità di trattamento
- [ ] **Consenso aggiuntivo** se necessario per nuove finalità

### 3. Minimizzazione dei Dati
- [ ] **Audit dei campi** per identificare dati non necessari
- [ ] **Eliminazione** dei dati ridondanti o obsoleti
- [ ] **Mappatura** dei dati essenziali per ogni ruolo
- [ ] **Pseudonimizzazione** dove possibile

### 4. Esattezza
- [ ] **Verifica qualità** dei dati durante migrazione
- [ ] **Correzione** delle inconsistenze identificate
- [ ] **Procedure** per mantenere i dati aggiornati
- [ ] **Meccanismi** di rettifica per gli interessati

### 5. Limitazione della Conservazione
- [ ] **Politiche di retention** definite per ogni tipo di dato
- [ ] **Date di scadenza** impostate per i dati temporanei
- [ ] **Cancellazione automatica** dei dati scaduti
- [ ] **Archiviazione** dei dati storici necessari

### 6. Integrità e Riservatezza
- [ ] **Crittografia** dei dati sensibili
- [ ] **Controlli di accesso** basati sui ruoli
- [ ] **Audit trail** completo delle operazioni
- [ ] **Backup sicuri** e crittografati

### 7. Responsabilizzazione
- [ ] **Documentazione** completa del processo
- [ ] **DPIA** (Data Protection Impact Assessment) completata
- [ ] **Registro trattamenti** aggiornato
- [ ] **Formazione** del personale sui nuovi processi

## 🔍 Data Protection Impact Assessment (DPIA)

### Valutazione Necessità DPIA
- [x] **Trattamento su larga scala** ✓ (Migliaia di record)
- [x] **Dati sensibili** ✓ (Dati personali dipendenti)
- [x] **Nuove tecnologie** ✓ (Nuovo schema database)
- [x] **Alto rischio** ✓ (Unificazione entità multiple)

**Conclusione**: DPIA OBBLIGATORIA

### Elementi DPIA

#### 1. Descrizione Sistematica del Trattamento
```yaml
Trattamento:
  nome: "Unificazione Entità Persone"
  finalità: 
    - "Semplificazione gestione dati personali"
    - "Miglioramento efficienza operativa"
    - "Conformità normativa"
  
  categorie_interessati:
    - "Dipendenti aziendali"
    - "Formatori interni ed esterni"
    - "Utenti sistema"
  
  categorie_dati:
    - "Dati anagrafici"
    - "Dati di contatto"
    - "Dati professionali"
    - "Dati di autenticazione"
    - "Dati di geolocalizzazione (indirizzi)"
  
  destinatari:
    - "Personale HR autorizzato"
    - "Amministratori sistema"
    - "Manager aziendali"
  
  trasferimenti_paesi_terzi: "Nessuno"
  
  tempi_conservazione:
    - "Dipendenti attivi: durata rapporto + 10 anni"
    - "Ex dipendenti: 10 anni dalla cessazione"
    - "Formatori: durata collaborazione + 5 anni"
    - "Utenti sistema: durata account + 2 anni"
```

#### 2. Valutazione Necessità e Proporzionalità
- [x] **Necessità**: Unificazione necessaria per efficienza operativa
- [x] **Proporzionalità**: Benefici superano i rischi
- [x] **Mezzi meno invasivi**: Valutate alternative meno impattanti
- [x] **Salvaguardie**: Implementate misure di protezione adeguate

#### 3. Valutazione Rischi

| Rischio | Probabilità | Impatto | Livello | Misure Mitigazione |
|---------|-------------|---------|---------|--------------------|
| Accesso non autorizzato | Bassa | Alto | Medio | Controlli accesso, crittografia |
| Perdita dati | Bassa | Critico | Alto | Backup, procedure recovery |
| Uso improprio | Media | Medio | Medio | Formazione, audit |
| Violazione confidenzialità | Bassa | Alto | Medio | Pseudonimizzazione, logging |

#### 4. Misure di Mitigazione
- [x] **Crittografia** dati a riposo e in transito
- [x] **Pseudonimizzazione** dove tecnicamente possibile
- [x] **Controlli accesso** basati su ruoli e principio least privilege
- [x] **Audit logging** completo di tutte le operazioni
- [x] **Backup sicuri** con test di recovery regolari
- [x] **Formazione** personale su nuove procedure
- [x] **Monitoraggio** continuo accessi e operazioni

## 📝 Diritti degli Interessati

### Diritto di Informazione (Art. 13-14)
- [ ] **Informativa aggiornata** pubblicata sul sito
- [ ] **Comunicazione diretta** agli interessati sui cambiamenti
- [ ] **Dettagli tecnici** del nuovo sistema disponibili
- [ ] **Contatti DPO** chiaramente indicati

**Template Comunicazione**:
```
Oggetto: Importante aggiornamento sul trattamento dei tuoi dati personali

Caro [Nome],

Ti informiamo che stiamo aggiornando il nostro sistema di gestione dati per migliorare 
l'efficienza e la sicurezza. I tuoi dati personali saranno migrati in un nuovo sistema 
unificato che garantisce:

- Maggiore sicurezza dei dati
- Gestione più efficiente delle informazioni
- Migliore rispetto dei tuoi diritti privacy

I tuoi diritti rimangono invariati. Per maggiori informazioni:
- Consulta la nostra informativa privacy aggiornata: [link]
- Contatta il nostro DPO: privacy@company.com

Grazie per la fiducia.

Il Team Privacy
```

### Diritto di Accesso (Art. 15)
- [ ] **Procedura aggiornata** per richieste di accesso
- [ ] **Template risposta** per nuovo formato dati
- [ ] **Export automatico** dati Person unificati
- [ ] **Tempi di risposta** mantenuti (30 giorni)

**Implementazione Tecnica**:
```javascript
// Export dati GDPR per Person
const exportPersonData = async (personId) => {
  const person = await prisma.person.findUnique({
    where: { id: personId },
    include: {
      personRoles: true,
      courseEnrollments: {
        include: { course: true }
      },
      attestati: true,
      activityLogs: {
        orderBy: { performedAt: 'desc' },
        take: 100 // ultimi 100 log
      },
      gdprConsentRecords: true
    }
  });
  
  // Rimuovi dati sensibili per export
  const { password, ...exportData } = person;
  
  return {
    exportDate: new Date().toISOString(),
    dataSubject: {
      id: person.id,
      name: `${person.firstName} ${person.lastName}`,
      email: person.email
    },
    personalData: exportData,
    dataRetentionInfo: {
      retentionPeriod: calculateRetentionPeriod(person),
      deletionDate: calculateDeletionDate(person)
    },
    rights: {
      access: 'Granted',
      rectification: 'Available',
      erasure: 'Available with conditions',
      portability: 'Available',
      objection: 'Available'
    }
  };
};
```

### Diritto di Rettifica (Art. 16)
- [ ] **Interfaccia self-service** per correzioni
- [ ] **Workflow approvazione** per modifiche sensibili
- [ ] **Notifica automatica** di correzioni effettuate
- [ ] **Audit trail** delle rettifiche

### Diritto alla Cancellazione (Art. 17)
- [ ] **Procedura soft delete** implementata
- [ ] **Cancellazione cascata** delle relazioni
- [ ] **Conservazione dati** per obblighi legali
- [ ] **Anonimizzazione** invece di cancellazione dove appropriato

**Implementazione Cancellazione**:
```javascript
// Diritto all'oblio con conservazione legale
const exerciseRightToErasure = async (personId, reason) => {
  const person = await prisma.person.findUnique({
    where: { id: personId },
    include: { personRoles: true }
  });
  
  // Verifica obblighi legali di conservazione
  const legalObligations = await checkLegalRetentionRequirements(person);
  
  if (legalObligations.mustRetain) {
    // Pseudonimizzazione invece di cancellazione
    await pseudonymizePerson(personId);
    
    return {
      status: 'pseudonymized',
      reason: 'Legal retention requirements',
      retentionUntil: legalObligations.retentionDate,
      deletionScheduled: legalObligations.retentionDate
    };
  } else {
    // Cancellazione completa
    await softDeletePerson(personId, reason);
    
    return {
      status: 'deleted',
      deletionDate: new Date(),
      reason: reason
    };
  }
};

const pseudonymizePerson = async (personId) => {
  const pseudoId = generatePseudoId();
  
  await prisma.person.update({
    where: { id: personId },
    data: {
      firstName: 'DELETED',
      lastName: 'USER',
      email: `deleted-${pseudoId}@pseudonymized.local`,
      phone: null,
      taxCode: null,
      residenceAddress: null,
      residenceCity: null,
      postalCode: null,
      province: null,
      notes: 'Data pseudonymized for legal retention',
      profileImage: null,
      isDeleted: true,
      deletedAt: new Date()
    }
  });
};
```

### Diritto alla Portabilità (Art. 20)
- [ ] **Export formato strutturato** (JSON, CSV, XML)
- [ ] **API per trasferimento** dati
- [ ] **Documentazione formato** dati esportati
- [ ] **Verifica identità** prima dell'export

### Diritto di Opposizione (Art. 21)
- [ ] **Meccanismo opt-out** per trattamenti non obbligatori
- [ ] **Gestione opposizioni** marketing
- [ ] **Blocco trattamenti** automatizzati
- [ ] **Notifica** delle opposizioni al team

## 🔒 Misure di Sicurezza

### Sicurezza Tecnica
- [ ] **Crittografia AES-256** per dati a riposo
- [ ] **TLS 1.3** per dati in transito
- [ ] **Hashing bcrypt** per password (cost factor ≥ 12)
- [ ] **Tokenizzazione** dati sensibili dove possibile

```javascript
// Configurazione sicurezza
const securityConfig = {
  encryption: {
    algorithm: 'aes-256-gcm',
    keyRotation: '90 days',
    keyStorage: 'HSM' // Hardware Security Module
  },
  
  hashing: {
    algorithm: 'bcrypt',
    rounds: 12,
    pepper: process.env.PASSWORD_PEPPER
  },
  
  tokenization: {
    sensitiveFields: ['taxCode', 'iban', 'phone'],
    tokenFormat: 'format-preserving',
    detokenizationAudit: true
  }
};
```

### Controlli di Accesso
- [ ] **Autenticazione multi-fattore** per admin
- [ ] **Principio least privilege** applicato
- [ ] **Segregation of duties** per operazioni critiche
- [ ] **Session timeout** configurato (30 minuti)

```javascript
// Matrice permessi GDPR
const gdprPermissions = {
  'DATA_CONTROLLER': [
    'VIEW_ALL_PERSONAL_DATA',
    'EXPORT_PERSONAL_DATA',
    'DELETE_PERSONAL_DATA',
    'MANAGE_CONSENTS'
  ],
  
  'DATA_PROCESSOR': [
    'VIEW_ASSIGNED_DATA',
    'PROCESS_DATA',
    'AUDIT_OPERATIONS'
  ],
  
  'DPO': [
    'VIEW_ALL_PERSONAL_DATA',
    'AUDIT_ALL_OPERATIONS',
    'MANAGE_GDPR_REQUESTS',
    'EXPORT_AUDIT_LOGS'
  ],
  
  'HR_MANAGER': [
    'VIEW_EMPLOYEE_DATA',
    'EDIT_EMPLOYEE_DATA',
    'MANAGE_EMPLOYEE_CONSENTS'
  ]
};
```

### Audit e Monitoring
- [ ] **Logging completo** operazioni sui dati personali
- [ ] **Monitoring real-time** accessi anomali
- [ ] **Alerting automatico** per violazioni
- [ ] **Retention log** di 7 anni

```javascript
// Sistema audit GDPR
const auditGdprOperation = async (operation) => {
  await prisma.gdprAuditLog.create({
    data: {
      operation: operation.type,
      dataSubjectId: operation.personId,
      performedBy: operation.userId,
      timestamp: new Date(),
      ipAddress: operation.ipAddress,
      userAgent: operation.userAgent,
      details: {
        fieldsAccessed: operation.fields,
        purpose: operation.purpose,
        legalBasis: operation.legalBasis
      },
      riskLevel: calculateRiskLevel(operation)
    }
  });
  
  // Alert per operazioni ad alto rischio
  if (operation.riskLevel === 'HIGH') {
    await sendGdprAlert(operation);
  }
};
```

## 📊 Registro delle Attività di Trattamento

### Aggiornamento Registro
- [ ] **Nuova attività** "Gestione Unificata Persone" aggiunta
- [ ] **Finalità dettagliate** documentate
- [ ] **Categorie dati** aggiornate
- [ ] **Misure sicurezza** specificate

```yaml
Attività_Trattamento:
  id: "ATP-001-PERSON-UNIFIED"
  nome: "Gestione Unificata Entità Persone"
  
  titolare:
    nome: "[Nome Azienda]"
    contatto: "privacy@company.com"
  
  responsabile:
    nome: "[Nome Responsabile IT]"
    contatto: "it@company.com"
  
  dpo:
    nome: "[Nome DPO]"
    contatto: "dpo@company.com"
  
  finalità:
    - "Gestione rapporti di lavoro"
    - "Amministrazione personale"
    - "Formazione e sviluppo"
    - "Sicurezza sistemi informativi"
  
  base_giuridica:
    - "Art. 6(1)(b) GDPR - Esecuzione contratto"
    - "Art. 6(1)(c) GDPR - Obbligo legale"
    - "Art. 6(1)(f) GDPR - Interesse legittimo"
  
  categorie_interessati:
    - "Dipendenti"
    - "Collaboratori"
    - "Formatori"
    - "Utenti sistema"
  
  categorie_dati:
    - "Dati anagrafici"
    - "Dati contatto"
    - "Dati professionali"
    - "Dati bancari (IBAN formatori)"
    - "Credenziali accesso"
  
  destinatari:
    - "Personale HR"
    - "Amministratori sistema"
    - "Manager autorizzati"
    - "Consulenti del lavoro"
  
  trasferimenti_internazionali: "Nessuno"
  
  tempi_conservazione:
    - "Dipendenti: 10 anni post cessazione"
    - "Formatori: 5 anni post collaborazione"
    - "Utenti: 2 anni post disattivazione"
    - "Log audit: 7 anni"
  
  misure_sicurezza:
    - "Crittografia dati"
    - "Controllo accessi"
    - "Audit trail"
    - "Backup sicuri"
    - "Formazione personale"
```

## 🚨 Gestione Violazioni (Data Breach)

### Procedura Breach Response
- [ ] **Team risposta** identificato e formato
- [ ] **Procedure escalation** definite
- [ ] **Template notifica** autorità preparati
- [ ] **Comunicazione interessati** pianificata

```javascript
// Sistema rilevamento breach
const detectDataBreach = async () => {
  const indicators = {
    // Accessi anomali
    suspiciousLogins: await detectSuspiciousLogins(),
    
    // Esportazioni massive
    massiveExports: await detectMassiveDataExports(),
    
    // Modifiche non autorizzate
    unauthorizedChanges: await detectUnauthorizedChanges(),
    
    // Accessi fuori orario
    afterHoursAccess: await detectAfterHoursAccess()
  };
  
  const riskScore = calculateBreachRisk(indicators);
  
  if (riskScore > BREACH_THRESHOLD) {
    await initiateBreachResponse({
      indicators,
      riskScore,
      timestamp: new Date(),
      autoDetected: true
    });
  }
};

const initiateBreachResponse = async (breach) => {
  // 1. Contenimento immediato
  await containBreach(breach);
  
  // 2. Valutazione impatto
  const impact = await assessBreachImpact(breach);
  
  // 3. Notifica se necessario (72h)
  if (impact.requiresNotification) {
    await scheduleAuthorityNotification(breach, impact);
  }
  
  // 4. Comunicazione interessati se alto rischio
  if (impact.highRisk) {
    await scheduleDataSubjectNotification(breach, impact);
  }
  
  // 5. Documentazione
  await documentBreach(breach, impact);
};
```

### Template Notifica Autorità
```
Oggetto: Notifica violazione dati personali - [ID Breach]

Spett.le Autorità Garante,

con la presente notifichiamo una violazione dei dati personali verificatasi 
in data [DATA] presso i nostri sistemi.

DETTAGLI VIOLAZIONE:
- Tipologia: [Confidenzialità/Integrità/Disponibilità]
- Data/ora: [TIMESTAMP]
- Durata: [DURATA]
- Dati coinvolti: [CATEGORIE DATI]
- Interessati: [NUMERO E TIPOLOGIA]
- Causa: [DESCRIZIONE CAUSA]

MISURE ADOTTATE:
- Contenimento: [AZIONI IMMEDIATE]
- Investigazione: [STATO INDAGINI]
- Notifica interessati: [SE APPLICABILE]
- Misure preventive: [AZIONI FUTURE]

VALUTAZIONE RISCHI:
- Probabilità danno: [BASSA/MEDIA/ALTA]
- Gravità conseguenze: [DESCRIZIONE]
- Misure mitigazione: [ELENCO]

CONTATTI:
DPO: [NOME] - [EMAIL] - [TELEFONO]
Referente tecnico: [NOME] - [EMAIL] - [TELEFONO]

Rimaniamo a disposizione per ogni chiarimento.

Distinti saluti,
[FIRMA TITOLARE]
```

## ✅ Checklist Pre-Migrazione

### Documentazione
- [ ] DPIA completata e approvata
- [ ] Registro trattamenti aggiornato
- [ ] Informative privacy aggiornate
- [ ] Procedure GDPR documentate
- [ ] Contratti DPA aggiornati

### Tecnico
- [ ] Crittografia implementata
- [ ] Controlli accesso configurati
- [ ] Audit logging attivo
- [ ] Backup sicuri testati
- [ ] Procedure recovery validate

### Organizzativo
- [ ] Team formato su GDPR
- [ ] DPO informato e coinvolto
- [ ] Procedure breach testate
- [ ] Contatti emergenza aggiornati
- [ ] Comunicazione stakeholder pianificata

### Legale
- [ ] Basi giuridiche verificate
- [ ] Consensi aggiornati se necessario
- [ ] Obblighi retention verificati
- [ ] Contratti fornitori aggiornati
- [ ] Assicurazione cyber aggiornata

## ✅ Checklist Post-Migrazione

### Verifica Tecnica
- [ ] Integrità dati verificata
- [ ] Controlli accesso funzionanti
- [ ] Audit trail completo
- [ ] Export GDPR testato
- [ ] Procedure cancellazione testate

### Verifica Procedurale
- [ ] Diritti interessati funzionanti
- [ ] Tempi risposta rispettati
- [ ] Comunicazioni inviate
- [ ] Formazione completata
- [ ] Documentazione aggiornata

### Monitoraggio Continuo
- [ ] Dashboard GDPR attivo
- [ ] Alert configurati
- [ ] Review periodiche pianificate
- [ ] Audit interni schedulati
- [ ] Aggiornamenti normativi monitorati

## 📞 Contatti GDPR

```yaml
Contatti_GDPR:
  DPO:
    nome: "[Nome DPO]"
    email: "dpo@company.com"
    telefono: "+39 XXX XXX XXXX"
    ruolo: "Data Protection Officer"
  
  Privacy_Team:
    email: "privacy@company.com"
    ruolo: "Gestione richieste interessati"
  
  Legal:
    email: "legal@company.com"
    ruolo: "Questioni legali GDPR"
  
  IT_Security:
    email: "security@company.com"
    ruolo: "Sicurezza tecnica"
  
  Breach_Response:
    email: "breach@company.com"
    telefono: "+39 XXX XXX XXXX" # 24/7
    ruolo: "Gestione violazioni dati"
```

---

**Versione**: 1.0
**Data**: $(date +%Y-%m-%d)
**Responsabile**: Data Protection Officer
**Prossima Revisione**: Trimestrale
**Stato**: ✅ Approvato per implementazione