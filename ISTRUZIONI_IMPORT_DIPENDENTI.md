# 🔧 Istruzioni per Risolvere i Problemi di Import Dipendenti

## ⚠️ IMPORTANTE: Riavviare il Backend

**Tutti i problemi** che stai riscontrando sono causati dal fatto che **il backend non è stato riavviato** dopo le modifiche al codice.

### 🚀 Passi da Seguire (IN ORDINE):

#### 1. Ferma tutti i server in esecuzione
```bash
# Ferma il backend
cd /Users/matteo.michielon/project\ 2.0/backend
pkill -f "node.*api-server"
pkill -f "node.*proxy"

# Verifica che siano fermati
lsof -i:4001  # Dovrebbe essere vuoto
lsof -i:4003  # Dovrebbe essere vuoto
```

#### 2. Avvia il backend
```bash
cd /Users/matteo.michielon/project\ 2.0/backend
npm run dev:api
```

**Attendi** che il server mostri:
```
✅ API Server started on port 4001
✅ Counters endpoint configured successfully
```

#### 3. In un altro terminale, avvia il proxy
```bash
cd /Users/matteo.michielon/project\ 2.0/backend
npm run dev:proxy
```

#### 4. Ricarica il frontend nel browser
- Premi `Cmd+Shift+R` (Mac) o `Ctrl+Shift+R` (Windows) per hard reload
- Oppure apri DevTools → Application → Clear Storage → Clear site data

---

## 📊 Cosa Verificare Dopo il Riavvio

### 1. Counter Dipendenti

**Aspettati nel log del backend:**
```
[COUNTERS] Fetching counts for tenant: <tenant-id>
[COUNTERS] Debug results: {
  tenantId: '...',
  totalPersons: 23,
  totalRoles: X,
  employeeRolesAll: Y,
  employeesCount: Z,
  companies: 12
}
```

**Cosa significa:**
- `totalPersons: 23` → Ci sono 23 persone nel database
- `employeeRolesAll: 0` → Nessuna di queste ha `personRole` con `roleType='EMPLOYEE'`
- **Soluzione**: Devi importare dipendenti per crearli, oppure aggiungere manualmente il ruolo EMPLOYEE alle persone esistenti

### 2. Identificazione Conflitti

**Aspettati nel log del frontend:**
```
🔍 [IMPORT] Backend validation result: {
  total: 36,
  valid: 36,
  conflicts: 36,
  sampleConflict: {
    taxCode: 'MJCMSL74R12Z153G',  // ✅ DEVE essere valorizzato
    existingPerson: { id: '...', firstName: '...', ... },
    newItem: { ... }
  }
}
```

**Se taxCode è ancora undefined:**
- Il backend NON è stato riavviato correttamente
- Riprova i passi 1-3

### 3. Sovrascrizione Dipendenti

**Nel modal di import:**
1. Carica CSV con dipendenti già in DB
2. Verifica che appaiano nel pannello "Conflitti rilevati (36)"
3. Clicca "Sovrascrivi" sui dipendenti che vuoi aggiornare
4. Verifica log frontend:
   ```
   🔍 [IMPORT] Preparing import: {
     overwriteIdsCount: X,  // ✅ Deve essere > 0
     overwriteIds: ['id1', 'id2', ...]
   }
   ```
5. Completa l'import

**Nel log backend aspettati:**
```
[EMPLOYEE_IMPORT] Found existing employee <id> (<taxCode>), softDeleted: false, in overwriteIds: true
[EMPLOYEE_IMPORT] Updated employee <id> (<taxCode>)
```

### 4. PascalCase

I nomi vengono automaticamente convertiti durante la validazione.

**Nel log backend aspettati:**
```
[EMPLOYEE_IMPORT] Creating new employee <taxCode> {
  name: 'Mario Rossi',  // ✅ PascalCase applicato
  ...
}
```

### 5. Import con Azienda Manuale

**Nel modal:**
1. Carica CSV (anche senza colonna azienda)
2. Seleziona i dipendenti da importare
3. Nel pannello "Assegnazione Azienda", seleziona l'azienda dal dropdown
4. Clicca "Assegna a X dipendenti selezionati"

**Nel log backend aspettati:**
```
[EMPLOYEE_IMPORT] Starting import: {
  totalEmployees: 36,
  defaultCompanyId: '<company-id>',  // ✅ DEVE essere valorizzato
  overwriteIdsCount: X
}

[EMPLOYEE_IMPORT] Creating new employee <taxCode> {
  hasDefaultCompany: true,  // ✅ DEVE essere true
  finalCompanyId: '<company-id>'
}
```

**Se l'import fallisce:**
```
[EMPLOYEE_IMPORT] Failed to import employee <taxCode>: {
  error: '...',  // ✅ Mostra l'errore specifico
  employee: { taxCode: '...', firstName: '...', ... }
}
```

---

## 🐛 Debug Avanzato

### Se il counter è ancora 0:

Le 23 persone esistenti probabilmente non hanno `personRole` EMPLOYEE. Verifica nel database:

```sql
-- Controlla le persone senza personRole
SELECT p.id, p.firstName, p.lastName, p.taxCode
FROM "Person" p
LEFT JOIN "PersonRole" pr ON p.id = pr."personId" AND pr."roleType" = 'EMPLOYEE'
WHERE p."tenantId" = '<your-tenant-id>'
  AND p."deletedAt" IS NULL
  AND pr.id IS NULL;
```

### Se i conflitti non appaiono:

1. Verifica che il CSV contenga gli stessi codici fiscali del DB
2. Controlla il log `Sample conflict structure:` per vedere la struttura effettiva
3. Verifica che `existingPerson` contenga i dati

### Se l'import viene "saltato":

Significa che:
- Il dipendente esiste già in DB
- NON è in `overwriteIds` (non hai cliccato "Sovrascrivi")
- NON è soft-deleted

**Soluzione**: Clicca "Sovrascrivi" nel pannello conflitti prima di importare.

---

## ✅ Checklist Finale

- [ ] Backend API server riavviato (porta 4001)
- [ ] Backend Proxy riavviato (porta 4003)
- [ ] Frontend ricaricato (hard reload)
- [ ] Log backend mostrano `[COUNTERS] Debug results`
- [ ] Log frontend mostrano `taxCode` valorizzato nei conflitti
- [ ] Import funziona e crea dipendenti
- [ ] Nomi salvati in PascalCase
- [ ] Counter dashboard mostra numero corretto

---

## 📞 Se i Problemi Persistono

Invia questi log:

1. **Log backend counters:**
   ```bash
   tail -50 logs/backend-*.log | grep "\[COUNTERS\]"
   ```

2. **Log backend import:**
   ```bash
   tail -100 logs/backend-*.log | grep "\[EMPLOYEE_IMPORT\]"
   ```

3. **Screenshot console frontend** con:
   - `🔍 [IMPORT] Backend validation result`
   - `🔍 [IMPORT] Sample conflict structure`
   - `🔍 [IMPORT] Preparing import`
