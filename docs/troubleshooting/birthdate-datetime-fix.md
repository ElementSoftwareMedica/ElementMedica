# Fix Errore birthDate DateTime - Creazione Formatori

## Problema Identificato

**Errore**: `Invalid value for argument 'birthDate': premature end of input. Expected ISO-8601 DateTime.`

**Causa**: Il campo `birthDate` nel modello Prisma Person è definito come `DateTime? @db.Date` ma veniva inviato come stringa nel formato `YYYY-MM-DD` invece che come ISO-8601 DateTime.

## Soluzione Implementata

### 1. Frontend - Conversione Date a ISO String

**File**: `src/services/trainers.ts` - Metodo `createTrainer`

**Modifiche**:
- Conversione automatica di `birthDate` e `hiredDate` da formato `YYYY-MM-DD` a ISO string
- Gestione robusta degli errori di parsing
- Rimozione automatica di date non valide

```typescript
// Converti date da stringa a ISO string per Prisma
if (cleanedData.birthDate && typeof cleanedData.birthDate === 'string') {
  try {
    const dateStr = cleanedData.birthDate.trim();
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // Formato YYYY-MM-DD: converti a ISO string
      cleanedData.birthDate = new Date(dateStr + 'T00:00:00.000Z').toISOString();
    } else {
      // Altri formati: usa costruttore Date standard
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        cleanedData.birthDate = date.toISOString();
      } else {
        delete cleanedData.birthDate; // Rimuovi se non valida
      }
    }
  } catch (error) {
    delete cleanedData.birthDate; // Rimuovi se errore
  }
}
```

### 2. Backend - Conversione Date nel Controller

**File**: `backend/controllers/personController.js` - Metodo `createPerson`

**Modifiche**:
- Conversione automatica di stringhe date a oggetti Date
- Supporto per formato `YYYY-MM-DD` e ISO string
- Gestione timezone sicura con UTC

```javascript
// Converti date da stringa a Date se necessario
if (transformedData.birthDate && typeof transformedData.birthDate === 'string') {
  try {
    const dateStr = transformedData.birthDate.trim();
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // Formato YYYY-MM-DD: aggiungi orario per evitare problemi timezone
      transformedData.birthDate = new Date(dateStr + 'T00:00:00.000Z');
    } else {
      // Altri formati: usa costruttore Date standard
      transformedData.birthDate = new Date(dateStr);
    }
    
    // Verifica che la data sia valida
    if (isNaN(transformedData.birthDate.getTime())) {
      transformedData.birthDate = null;
    }
  } catch (error) {
    transformedData.birthDate = null;
  }
}
```

### 3. Backend - Conversione Date nel Servizio

**File**: `backend/services/person/core/PersonCore.js` - Metodo `createPerson`

**Modifiche**:
- Doppia protezione per conversione date
- Logging di warning per date non valide
- Gestione robusta degli errori

## Schema Prisma

**Campo birthDate nel modello Person**:
```prisma
model Person {
  // ...
  birthDate DateTime? @db.Date
  hiredDate DateTime? @db.Date
  // ...
}
```

- **Tipo**: `DateTime?` (opzionale)
- **Database**: `@db.Date` (solo data, senza orario)
- **Formato richiesto**: ISO-8601 DateTime string

## Test di Verifica

### Test Formati Supportati
```bash
# ✅ Formato YYYY-MM-DD → STATUS 201
{
  "birthDate": "1994-06-12"
}

# ✅ Formato ISO string → STATUS 201  
{
  "birthDate": "1994-06-12T00:00:00.000Z"
}

# ✅ Campo vuoto/null → STATUS 201
{
  "birthDate": null
}

# ✅ Campo mancante → STATUS 201
{
  // birthDate non presente
}
```

### Test Endpoint
- ✅ **API Diretta**: `POST http://localhost:4001/api/v1/persons`
- ✅ **Via Proxy**: `POST http://localhost:4003/api/v1/persons`
- ✅ **Frontend**: Tramite `TrainersService.createTrainer()`

## Campi Date Gestiti

### Automatici (Frontend + Backend)
- `birthDate` - Data di nascita
- `hiredDate` - Data assunzione

### Formati Supportati
- `YYYY-MM-DD` - Formato standard form
- ISO-8601 DateTime - Formato Prisma
- `null`/`undefined` - Valori vuoti

### Gestione Errori
- Date non valide → Impostate a `null`
- Formati non riconosciuti → Rimosse dal payload
- Errori di parsing → Logging + fallback sicuro

## Conformità Regole Progetto

✅ **Entità Person**: Formatori creati come Person unificata  
✅ **Soft Delete**: Campo `deletedAt` per eliminazioni  
✅ **GDPR**: Nessun dato sensibile in log, audit trail attivo  
✅ **Porte fisse**: API 4001, Proxy 4003 mantenute  
✅ **Architettura modulare**: Fix distribuito su frontend/backend  
✅ **Compatibilità ambienti**: Funziona localhost e Hetzner/Supabase  

## Prevenzione Futuri Errori

1. **Validazione Frontend**: Conversione automatica date a ISO string
2. **Doppia Protezione**: Controller + Servizio gestiscono conversioni
3. **Logging**: Warning per date non valide senza esporre dati sensibili
4. **Test Automatici**: Verificare creazione con vari formati date

## Note Implementazione

- **Timezone**: Uso di UTC (`T00:00:00.000Z`) per evitare problemi timezone
- **Validazione**: Controllo `isNaN()` per verificare validità date
- **Fallback**: Date non valide impostate a `null` invece di causare errori
- **Compatibilità**: Supporto sia per form frontend che API dirette
- **Performance**: Conversioni efficienti senza overhead significativo