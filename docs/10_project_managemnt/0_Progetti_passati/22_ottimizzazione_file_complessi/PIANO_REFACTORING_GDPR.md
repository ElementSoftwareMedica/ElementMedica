# Piano di Refactoring - GDPR Routes

## 📊 Analisi Attuale

### File: `backend/routes/gdpr.js`
- **Righe totali**: 1452 righe
- **Route totali**: 18 endpoint
- **Stato**: File monolitico critico
- **Priorità**: Alta (>1000 righe)

### Route Identificate
1. `/consents/grant` - POST - Concedere consensi
2. `/consents/revoke` - POST - Revocare consensi  
3. `/consents` - POST - Gestione consensi (legacy)
4. `/consent` - POST - Consenso singolo (legacy)
5. `/consent/withdraw` - POST - Ritiro consenso (legacy)
6. `/consents/current-user` - GET - Consensi utente corrente
7. `/consents/:personId` - GET - Consensi per persona
8. `/consent` - GET - Consenso singolo (legacy)
9. `/export` - POST - Esportazione dati
10. `/delete-request` - POST - Richiesta cancellazione
11. `/process-deletion/:requestId` - POST - Processare cancellazione
12. `/audit` - GET - Audit trail
13. `/audit/export` - GET - Esportazione audit
14. `/audit` - POST - Creare audit log
15. `/audit/batch` - POST - Audit batch
16. `/audit-trail` - GET - Trail audit utente
17. `/compliance-report` - GET - Report conformità
18. `/deletion-requests` - GET - Richieste cancellazione

## 🎯 Strategia di Refactoring

### Moduli Proposti

#### 1. **Consent Management** (`consent-management.js`)
**Route**: 8 endpoint
- `/consents/grant` - POST
- `/consents/revoke` - POST
- `/consents` - POST (legacy)
- `/consent` - POST (legacy)
- `/consent/withdraw` - POST (legacy)
- `/consents/current-user` - GET
- `/consents/:personId` - GET
- `/consent` - GET (legacy)

**Responsabilità**:
- Gestione consensi GDPR
- Validazione tipi di consenso
- Storico consensi
- API legacy e nuove

#### 2. **Data Export** (`data-export.js`)
**Route**: 1 endpoint
- `/export` - POST

**Responsabilità**:
- Diritto alla portabilità dei dati
- Generazione export personalizzati
- Formati di esportazione
- Validazione richieste export

#### 3. **Data Deletion** (`data-deletion.js`)
**Route**: 3 endpoint
- `/delete-request` - POST
- `/process-deletion/:requestId` - POST
- `/deletion-requests` - GET

**Responsabilità**:
- Diritto all'oblio
- Workflow approvazione cancellazioni
- Gestione richieste admin
- Anonimizzazione dati

#### 4. **Audit & Compliance** (`audit-compliance.js`)
**Route**: 6 endpoint
- `/audit` - GET
- `/audit/export` - GET
- `/audit` - POST
- `/audit/batch` - POST
- `/audit-trail` - GET
- `/compliance-report` - GET

**Responsabilità**:
- Audit trail GDPR
- Report di conformità
- Logging attività
- Esportazione audit

#### 5. **Router Principale** (`index.js`)
**Responsabilità**:
- Orchestrazione moduli
- Middleware comuni
- Rate limiting
- Health check
- Documentazione API

## 📋 Piano di Implementazione

### Fase 1: Preparazione
- [x] Analisi file esistente
- [x] Identificazione sezioni logiche
- [x] Definizione architettura modulare
- [ ] Backup file originale
- [ ] Setup struttura cartelle

### Fase 2: Creazione Moduli
- [ ] Creare `backend/routes/gdpr/`
- [ ] Implementare `consent-management.js`
- [ ] Implementare `data-export.js`
- [ ] Implementare `data-deletion.js`
- [ ] Implementare `audit-compliance.js`
- [ ] Creare router principale `index.js`

### Fase 3: Migrazione e Test
- [ ] Sostituire file originale con redirect
- [ ] Test funzionalità consent management
- [ ] Test export dati
- [ ] Test cancellazione dati
- [ ] Test audit e compliance
- [ ] Verifica rate limiting

### Fase 4: Validazione
- [ ] Test integrazione completa
- [ ] Verifica performance
- [ ] Controllo conformità GDPR
- [ ] Documentazione aggiornata

## 🎯 Obiettivi di Ottimizzazione

### Metriche Target
- **File principale**: < 50 righe (router redirect)
- **Moduli singoli**: < 300 righe ciascuno
- **Tempo risposta**: < 500ms per endpoint
- **Copertura test**: > 90%

### Benefici Attesi
- ✅ **Manutenibilità**: Codice organizzato per dominio
- ✅ **Testabilità**: Moduli indipendenti
- ✅ **Scalabilità**: Facile aggiungere nuove funzionalità GDPR
- ✅ **Conformità**: Migliore tracciabilità GDPR
- ✅ **Performance**: Caricamento modulare

## ⚠️ Rischi e Mitigazioni

### Rischi Identificati
1. **Breaking Changes**: API esistenti potrebbero rompersi
2. **Conformità GDPR**: Perdita di funzionalità critiche
3. **Rate Limiting**: Configurazione complessa
4. **Audit Trail**: Continuità logging

### Mitigazioni
1. **Compatibilità**: Mantenere tutte le route esistenti
2. **Test Estensivi**: Validare ogni endpoint GDPR
3. **Rollback Plan**: Backup e procedura di ripristino
4. **Monitoring**: Logging dettagliato durante migrazione

## 📝 Note Tecniche

### Dipendenze Condivise
- `GDPRService` - Servizio principale GDPR
- `authenticateAdvanced` - Middleware autenticazione
- `requireRoles/requirePermissions` - RBAC
- `express-rate-limit` - Rate limiting
- `express-validator` - Validazione input

### Middleware Comuni
- Rate limiting GDPR (10 req/hour)
- Autenticazione avanzata
- Validazione input
- Logging audit
- Gestione errori GDPR

### Configurazioni Critiche
- Rate limiting per endpoint sensibili
- Validazione tipi di consenso
- Formati export supportati
- Workflow approvazione cancellazioni

---

**Status**: 📋 Pianificazione Completata
**Prossimo Step**: Implementazione Fase 1 - Preparazione
**Responsabile**: Sistema di Ottimizzazione
**Data**: Dicembre 2024