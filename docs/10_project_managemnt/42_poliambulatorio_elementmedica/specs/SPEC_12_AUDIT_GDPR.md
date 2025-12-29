# 🔒 SPEC_12: Audit Trail e GDPR Compliance

**Versione**: 1.0  
**Ultimo aggiornamento**: 2025-12-11  
**Collegato a**: [SPEC_11_RUOLI_PERMESSI.md](./SPEC_11_RUOLI_PERMESSI.md), [SPEC_14_SICUREZZA.md](./SPEC_14_SICUREZZA.md)

---

## 1. OVERVIEW

Il sistema implementa audit trail completo e compliance GDPR per dati sanitari (PHI - Protected Health Information).

### 1.1 Requisiti Normativi

| Normativa | Requisito |
|-----------|-----------|
| GDPR Art. 17 | Diritto alla cancellazione |
| GDPR Art. 20 | Portabilità dei dati |
| GDPR Art. 30 | Registro trattamenti |
| D.Lgs 196/2003 | Privacy sanitaria Italia |
| Retention sanitaria | 10 anni minimo |

---

## 2. AUDIT LOG CLINICO

### 2.1 Modello AuditLogClinico

```prisma
model AuditLogClinico {
  id                    String   @id @default(uuid())
  
  // Entità tracciata
  entita                String               // "Visita", "Referto", etc.
  entitaId              String?
  
  // Operazione
  operazione            TipoAzioneClinica
  
  // Chi ha eseguito
  personId              String?
  person                Person?  @relation(fields: [personId], references: [id])
  
  // Dettagli richiesta
  ipAddress             String?
  userAgent             String?
  metodo                String?              // HTTP method
  path                  String?
  statusCode            Int?
  durationMs            Int?
  
  // Dati (before/after per UPDATE)
  dataPrima             Json?                // Snapshot prima modifica
  dataDopomodifica      Json?                // Snapshot dopo modifica
  campiModificati       String[]             // Lista campi modificati
  
  // Risultato
  esito                 EsitoAudit           @default(SUCCESSO)
  errore                String?
  
  // Metadata
  metadata              Json?
  
  // Multi-tenancy
  tenantId              String
  tenant                Tenant   @relation(fields: [tenantId], references: [id])
  
  // Timestamp (immutabile - no updatedAt)
  createdAt             DateTime @default(now())
  
  @@index([tenantId, entita, createdAt])
  @@index([personId, createdAt])
  @@index([entita, entitaId])
  @@index([operazione])
  @@index([createdAt])
}

enum TipoAzioneClinica {
  VIEW                  // Visualizzazione
  CREATE                // Creazione
  UPDATE                // Modifica
  DELETE                // Cancellazione (soft)
  EXPORT                // Export dati
  SIGN                  // Firma documento
  SEND                  // Invio (email, etc.)
  LOGIN                 // Accesso sistema
  LOGOUT                // Uscita
}

enum EsitoAudit {
  SUCCESSO
  FALLITO
  NEGATO                // Accesso negato
}
```

### 2.2 Entità PHI da Tracciare

| Entità | Operazioni Tracciate |
|--------|---------------------|
| Visita | VIEW, CREATE, UPDATE, DELETE |
| Referto | VIEW, CREATE, UPDATE, SIGN, EXPORT, SEND |
| Paziente | VIEW, CREATE, UPDATE, DELETE, EXPORT |
| Appuntamento | CREATE, UPDATE, DELETE |
| Allegati clinici | VIEW, CREATE, DELETE, DOWNLOAD |

---

## 3. MIDDLEWARE AUDIT

### 3.1 Implementazione

```javascript
// backend/middleware/auditClinico.js

export const auditClinico = (operazione, entita) => {
  return async (req, res, next) => {
    const startTime = Date.now();
    
    // Cattura body originale per UPDATE
    let dataPrima = null;
    if (operazione === 'UPDATE' && req.params.id) {
      dataPrima = await getEntitySnapshot(entita, req.params.id);
    }
    
    // Intercetta risposta
    const originalJson = res.json.bind(res);
    res.json = async (data) => {
      const duration = Date.now() - startTime;
      
      // Log solo per entità sensibili
      const isPHI = ['Visita', 'Referto', 'Paziente', 'Appuntamento'].includes(entita);
      
      if (isPHI || operazione !== 'VIEW') {
        let dataDopomodifica = null;
        let campiModificati = [];
        
        if (operazione === 'UPDATE' && dataPrima) {
          dataDopomodifica = await getEntitySnapshot(entita, req.params.id);
          campiModificati = diffObjects(dataPrima, dataDopomodifica);
        }
        
        await prisma.auditLogClinico.create({
          data: {
            entita,
            entitaId: req.params.id || data?.data?.id,
            operazione,
            personId: req.person?.id,
            tenantId: req.tenantId,
            ipAddress: getClientIp(req),
            userAgent: req.get('User-Agent'),
            metodo: req.method,
            path: req.originalUrl,
            statusCode: res.statusCode,
            durationMs: duration,
            dataPrima: sanitizeForAudit(dataPrima),
            dataDopomodifica: sanitizeForAudit(dataDopomodifica),
            campiModificati,
            esito: res.statusCode < 400 ? 'SUCCESSO' : 'FALLITO',
            metadata: { query: req.query }
          }
        });
      }
      
      return originalJson(data);
    };
    
    next();
  };
};

// Sanitizza dati sensibili per audit
function sanitizeForAudit(data) {
  if (!data) return null;
  
  const sanitized = { ...data };
  const sensitiveFields = [
    'password', 'token', 'accessToken', 'refreshToken',
    'codiceFiscale', 'taxCode', 'iban', 'creditCard'
  ];
  
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }
  
  return sanitized;
}
```

---

## 4. GDPR FEATURES

### 4.1 Soft Delete (Già Implementato)

```prisma
// Tutti i modelli hanno deletedAt
model Paziente {
  // ...
  deletedAt DateTime?
}

// Query automatiche escludono deleted
const pazienti = await prisma.paziente.findMany({
  where: { tenantId, deletedAt: null }
});
```

### 4.2 Export Dati Paziente (Art. 20)

```javascript
// backend/services/gdprService.js

export async function exportPatientData(pazienteId, tenantId) {
  const paziente = await prisma.person.findFirst({
    where: { id: pazienteId, tenantId, deletedAt: null },
    include: {
      appuntamentiPaziente: true,
      visitePaziente: { include: { referto: true } },
      documenti: true,
      consensi: true
    }
  });
  
  // Audit log export
  await auditGdprAction('EXPORT', pazienteId, tenantId);
  
  return {
    datiAnagrafici: {
      nome: paziente.firstName,
      cognome: paziente.lastName,
      dataNascita: paziente.birthDate,
      codiceFiscale: paziente.taxCode,
      email: paziente.email,
      telefono: paziente.phone,
      indirizzo: paziente.address
    },
    appuntamenti: paziente.appuntamentiPaziente.map(a => ({
      data: a.dataOra,
      prestazione: a.prestazione?.nome,
      stato: a.stato
    })),
    visite: paziente.visitePaziente.map(v => ({
      data: v.oraInizio,
      prestazione: v.appuntamento?.prestazione?.nome,
      referto: v.referto ? {
        data: v.referto.createdAt,
        stato: v.referto.stato
      } : null
    })),
    consensi: paziente.consensi.map(c => ({
      tipo: c.tipo,
      dataConsenso: c.createdAt,
      revocato: c.revocatoAt !== null
    })),
    exportedAt: new Date().toISOString()
  };
}
```

### 4.3 Diritto alla Cancellazione (Art. 17)

```javascript
// Anonimizzazione invece di cancellazione per dati sanitari
export async function anonymizePatient(pazienteId, tenantId, motivo) {
  const paziente = await prisma.person.findFirst({
    where: { id: pazienteId, tenantId }
  });
  
  // Verifica retention (10 anni per dati sanitari)
  const lastVisit = await prisma.visita.findFirst({
    where: { appuntamento: { pazienteId } },
    orderBy: { createdAt: 'desc' }
  });
  
  if (lastVisit) {
    const yearsAgo = differenceInYears(new Date(), lastVisit.createdAt);
    if (yearsAgo < 10) {
      throw new Error('Dati sanitari: retention minima 10 anni non rispettata');
    }
  }
  
  // Anonimizza
  await prisma.person.update({
    where: { id: pazienteId },
    data: {
      firstName: 'ANONIMIZZATO',
      lastName: `PAZIENTE_${pazienteId.slice(0, 8)}`,
      email: `deleted_${pazienteId}@anonymized.local`,
      phone: null,
      address: null,
      taxCode: null,
      birthDate: null,
      deletedAt: new Date(),
      anonymizedAt: new Date(),
      anonymizationReason: motivo
    }
  });
  
  // Audit
  await auditGdprAction('ANONYMIZE', pazienteId, tenantId, { motivo });
  
  return { success: true, message: 'Paziente anonimizzato' };
}
```

### 4.4 Consensi

```prisma
model ConsentoGdpr {
  id                    String   @id @default(uuid())
  
  personaId             String
  persona               Person   @relation(fields: [personaId], references: [id])
  
  tipo                  TipoConsenso
  versione              String               // Versione informativa
  
  // Consenso
  acconsentito          Boolean
  dataConsenso          DateTime
  modalita              String               // "WEB", "CARTACEO", "APP"
  
  // Revoca
  revocatoAt            DateTime?
  motivoRevoca          String?
  
  // IP e tracciamento
  ipAddress             String?
  userAgent             String?
  
  // Multi-tenancy
  tenantId              String
  
  @@index([personaId])
  @@index([tenantId])
  @@index([tipo])
}

enum TipoConsenso {
  PRIVACY_BASE          // Trattamento dati
  MARKETING             // Comunicazioni commerciali
  TERZE_PARTI           // Condivisione con terzi
  PROFILAZIONE          // Profilazione automatica
  SANITARIO             // Trattamento dati sanitari
}
```

---

## 5. API ENDPOINTS

```
# Audit
GET    /api/v1/clinica/audit                           # Lista audit logs
GET    /api/v1/clinica/audit/:entita/:id               # Audit per entità
GET    /api/v1/clinica/audit/export                    # Export CSV/JSON

# GDPR
GET    /api/v1/gdpr/export/:pazienteId                 # Export dati paziente
POST   /api/v1/gdpr/anonymize/:pazienteId              # Anonimizza
GET    /api/v1/gdpr/consensi/:pazienteId               # Lista consensi
POST   /api/v1/gdpr/consensi                           # Registra consenso
DELETE /api/v1/gdpr/consensi/:id                       # Revoca consenso
```

---

## 6. UI COMPONENTS

### 6.1 Dashboard Audit
- `AuditLogList.tsx` - Lista filtrata
- `AuditLogDetail.tsx` - Dettaglio operazione
- `AuditExport.tsx` - Export compliance

### 6.2 GDPR
- `GdprDashboard.tsx` - Overview compliance
- `ConsensiManager.tsx` - Gestione consensi
- `DataExportRequest.tsx` - Richiesta export
- `AnonymizeDialog.tsx` - Conferma anonimizzazione

---

## 7. RETENTION POLICY

| Tipo Dato | Retention | Motivazione |
|-----------|-----------|-------------|
| Visite/Referti | 10 anni | Normativa sanitaria |
| Audit logs | 5 anni | Compliance |
| Consensi | Indefinito | Prova legale |
| Dati anagrafici | 10 anni post ultima visita | Normativa |
| Fatture | 10 anni | Fiscale |

---

## 8. COLLEGAMENTI

- **Precedente**: [SPEC_11_RUOLI_PERMESSI.md](./SPEC_11_RUOLI_PERMESSI.md)
- **Prossimo**: [SPEC_13_FILE_STORAGE.md](./SPEC_13_FILE_STORAGE.md)
- **Correlato**: [SPEC_14_SICUREZZA.md](./SPEC_14_SICUREZZA.md)
