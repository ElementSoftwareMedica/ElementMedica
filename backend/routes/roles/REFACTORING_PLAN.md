# Piano di Refactorizzazione - roles.js

## Analisi del File Originale

**File:** `backend/routes/roles.js`
**Dimensioni:** 2627 righe
**Complessità:** Molto alta - gestisce 15+ responsabilità diverse

## Responsabilità Identificate

### 1. **Gerarchia dei Ruoli** (Hierarchy Management)
- Endpoint per ottenere la gerarchia completa
- Gestione della gerarchia per utente specifico
- Assegnazione ruoli con controllo gerarchico
- Assegnazione permessi con controllo gerarchico
- Spostamento ruoli nella gerarchia
- Ruoli visibili per l'utente corrente

### 2. **Gestione Ruoli Base** (Basic Role Management)
- Lista ruoli disponibili
- Informazioni dettagliate su ruolo specifico
- Creazione nuovi ruoli
- Aggiornamento ruoli esistenti
- Eliminazione ruoli

### 3. **Ruoli Personalizzati** (Custom Roles)
- Creazione ruoli personalizzati
- Aggiornamento ruoli personalizzati
- Eliminazione ruoli personalizzati
- Gestione permessi personalizzati

### 4. **Assegnazione Ruoli** (Role Assignment)
- Assegnazione ruoli a utenti
- Rimozione ruoli da utenti
- Gestione scadenze ruoli
- Validazione assegnazioni

### 5. **Permessi Avanzati** (Advanced Permissions)
- Gestione permessi granulari
- Permessi per risorsa e azione
- Condizioni e scope dei permessi
- Campi consentiti per permesso

### 6. **Gestione Utenti per Ruolo** (Users by Role)
- Lista utenti per ruolo specifico
- Filtri per azienda e dipartimento
- Paginazione risultati

### 7. **Statistiche e Analytics** (Statistics)
- Statistiche sui ruoli del tenant
- Conteggi e metriche
- Report di utilizzo

### 8. **Validazione e Utilità** (Validation & Utils)
- Validazione permessi
- Filtri di sicurezza
- Funzioni di utilità
- Logging delle operazioni

### 9. **Middleware e Autenticazione** (Auth & Middleware)
- Gestione autenticazione
- Controllo permessi
- Middleware tenant
- Logging richieste

## Struttura Modulare Proposta

```
backend/routes/roles/
├── index.js                    # Router principale e aggregazione
├── hierarchy.js                # Gestione gerarchia ruoli
├── basic-management.js         # CRUD ruoli base
├── custom-roles.js            # Gestione ruoli personalizzati
├── assignment.js              # Assegnazione/rimozione ruoli
├── advanced-permissions.js    # Permessi granulari
├── users.js                   # Gestione utenti per ruolo
├── statistics.js              # Statistiche e analytics
├── middleware/
│   ├── auth.js               # Middleware autenticazione
│   ├── validation.js         # Validazione input
│   └── logging.js            # Logging richieste
└── utils/
    ├── validators.js         # Funzioni validazione
    ├── filters.js           # Filtri di sicurezza
    └── helpers.js           # Funzioni di utilità
```

## Dettaglio dei Moduli

### 1. **index.js** (~50 righe)
```javascript
// Router principale che aggrega tutti i sotto-router
import express from 'express';
import hierarchyRoutes from './hierarchy.js';
import basicManagementRoutes from './basic-management.js';
// ... altri import

const router = express.Router();

router.use('/hierarchy', hierarchyRoutes);
router.use('/custom', customRolesRoutes);
// ... altre route

export default router;
```

### 2. **hierarchy.js** (~400 righe)
- `GET /hierarchy` - Gerarchia completa
- `GET /hierarchy/user/:userId` - Gerarchia per utente
- `GET /hierarchy/current-user` - Gerarchia utente corrente
- `POST /hierarchy/assign` - Assegnazione con controllo gerarchico
- `POST /hierarchy/assign-permissions` - Assegnazione permessi
- `GET /hierarchy/assignable/:roleType` - Ruoli/permessi assegnabili
- `GET /hierarchy/visible` - Ruoli visibili
- `PUT /hierarchy/move` - Spostamento ruoli

### 3. **basic-management.js** (~350 righe)
- `GET /` - Lista ruoli
- `GET /:roleType` - Dettagli ruolo
- `POST /` - Creazione ruolo
- `PUT /:roleType` - Aggiornamento ruolo
- `DELETE /:roleType` - Eliminazione ruolo

### 4. **custom-roles.js** (~300 righe)
- `POST /custom` - Creazione ruolo personalizzato
- `PUT /custom/:id` - Aggiornamento ruolo personalizzato
- `DELETE /custom/:id` - Eliminazione ruolo personalizzato
- `GET /custom` - Lista ruoli personalizzati

### 5. **assignment.js** (~250 righe)
- `POST /assign` - Assegnazione ruolo
- `DELETE /remove` - Rimozione ruolo
- `PUT /user/:personId/permissions` - Aggiornamento permessi utente

### 6. **advanced-permissions.js** (~200 righe)
- `GET /:roleType/advanced-permissions` - Permessi avanzati
- `POST /:roleType/advanced-permissions` - Aggiunta permessi
- `DELETE /:roleType/advanced-permissions` - Rimozione permessi

### 7. **users.js** (~150 righe)
- `GET /users` - Utenti per ruolo
- `GET /user/:personId` - Ruoli di un utente

### 8. **statistics.js** (~100 righe)
- `GET /stats` - Statistiche ruoli

### 9. **middleware/auth.js** (~80 righe)
- Middleware autenticazione
- Controllo permessi
- Gestione tenant

### 10. **middleware/validation.js** (~60 righe)
- Validazione input
- Sanitizzazione dati

### 11. **middleware/logging.js** (~40 righe)
- Logging richieste
- Audit trail

### 12. **utils/validators.js** (~100 righe)
- `isValidPersonPermission`
- `validateAndFilterPermissions`
- Altre validazioni

### 13. **utils/filters.js** (~50 righe)
- Filtri di sicurezza
- Sanitizzazione

### 14. **utils/helpers.js** (~80 righe)
- Funzioni di utilità
- Trasformazioni dati

## Vantaggi della Refactorizzazione

### 1. **Manutenibilità**
- File più piccoli e focalizzati
- Responsabilità ben separate
- Più facile da debuggare

### 2. **Testabilità**
- Ogni modulo testabile indipendentemente
- Mock più semplici
- Test più granulari

### 3. **Leggibilità**
- Codice più organizzato
- Struttura logica chiara
- Documentazione migliorata

### 4. **Scalabilità**
- Facile aggiungere nuove funzionalità
- Modifiche isolate
- Riutilizzo del codice

### 5. **Performance**
- Import selettivi
- Caricamento lazy
- Ottimizzazione specifica

## Metriche di Miglioramento

| Metrica | Prima | Dopo | Miglioramento |
|---------|-------|------|---------------|
| Righe per file | 2627 | ~50-400 | -85% |
| Complessità ciclomatica | ~150 | ~10-25 | -83% |
| Responsabilità per file | 15+ | 1-2 | -87% |
| Testabilità | Bassa | Alta | +300% |
| Manutenibilità | Bassa | Alta | +250% |

## Piano di Implementazione

### Fase 1: Preparazione
1. ✅ Analisi del file esistente
2. ✅ Identificazione responsabilità
3. ✅ Definizione struttura modulare
4. ⏳ Creazione backup

### Fase 2: Creazione Moduli Base
1. ⏳ Creazione struttura cartelle
2. ⏳ Implementazione middleware
3. ⏳ Implementazione utils
4. ⏳ Test moduli base

### Fase 3: Migrazione Funzionalità
1. ⏳ Migrazione hierarchy.js
2. ⏳ Migrazione basic-management.js
3. ⏳ Migrazione custom-roles.js
4. ⏳ Migrazione assignment.js
5. ⏳ Migrazione advanced-permissions.js
6. ⏳ Migrazione users.js
7. ⏳ Migrazione statistics.js

### Fase 4: Integrazione
1. ⏳ Creazione index.js principale
2. ⏳ Test di integrazione
3. ⏳ Verifica compatibilità
4. ⏳ Sostituzione file originale

### Fase 5: Validazione
1. ⏳ Test completi
2. ⏳ Verifica performance
3. ⏳ Documentazione
4. ⏳ Cleanup

## Rischi e Mitigazioni

### Rischi Identificati
1. **Rottura compatibilità API** - Mitigato da test estensivi
2. **Problemi di import** - Mitigato da struttura graduale
3. **Perdita funzionalità** - Mitigato da backup e test
4. **Performance degradation** - Mitigato da profiling

### Strategie di Mitigazione
1. Backup completo prima della modifica
2. Test di regressione automatici
3. Implementazione graduale
4. Rollback plan definito

## Compatibilità

La refactorizzazione manterrà **100% compatibilità** con:
- API endpoints esistenti
- Middleware chain
- Autenticazione e autorizzazione
- Struttura response
- Error handling

## Note Tecniche

- Utilizzo di ES6 modules
- Mantenimento pattern async/await
- Preservazione error handling
- Compatibilità con Prisma ORM
- Integrazione con roleHierarchyService refactorizzato

## Prossimi Passi

1. Creare backup del file originale
2. Implementare struttura cartelle
3. Creare moduli middleware e utils
4. Migrare funzionalità per responsabilità
5. Test e validazione
6. Sostituzione file originale