# 🔧 Risoluzione Errore Unique Constraint Import CSV

**Data**: 06/08/2025  
**Problema**: Errore `unique constraint` su `taxCode` durante importazione CSV  
**Status**: ✅ **RISOLTO**

## 🎯 Problema Identificato

### Causa Root
La funzione `findExistingPerson` in <mcfile name="PersonImport.js" path="/Users/matteo.michielon/project 2.0/backend/services/PersonImport.js"></mcfile> escludeva le persone soft-deleted (`deletedAt: null`), causando tentativi di ricreazione di persone già esistenti ma soft-deleted.

### Errore Specifico
```
Error: Unique constraint failed on the fields: (`taxCode`)
```

## 🔧 Soluzioni Implementate

### 1. ✅ Modifica `findExistingPerson`
**File**: <mcfile name="PersonImport.js" path="/Users/matteo.michielon/project 2.0/backend/services/PersonImport.js"></mcfile>

**Modifiche**:
- Aggiunto parametro `options.includeSoftDeleted` (default: `true`)
- Rimossa condizione `deletedAt: null` dalla query
- Ritorno modificato: `{ person, isSoftDeleted }`

**Prima**:
```javascript
const existingPerson = await prisma.person.findFirst({
  where: {
    deletedAt: null, // ❌ Escludeva soft-deleted
    OR: conditions
  }
});
```

**Dopo**:
```javascript
const existingPerson = await prisma.person.findFirst({
  where: { OR: conditions } // ✅ Include soft-deleted
});

return {
  person: existingPerson,
  isSoftDeleted: existingPerson?.deletedAt !== null
};
```

### 2. ✅ Aggiunta Funzione `restorePerson`
**File**: <mcfile name="PersonCore.js" path="/Users/matteo.michielon/project 2.0/backend/services/PersonCore.js"></mcfile>

**Nuova funzione**:
```javascript
async restorePerson(personId) {
  return await prisma.person.update({
    where: { id: personId },
    data: {
      deletedAt: null,
      status: 'ACTIVE'
    }
  });
}
```

### 3. ✅ Logica Import Aggiornata
**File**: <mcfile name="PersonImport.js" path="/Users/matteo.michielon/project 2.0/backend/services/PersonImport.js"></mcfile>

**Nuova logica**:
```javascript
const { person: existingPerson, isSoftDeleted } = await this.findExistingPerson(personData);

if (existingPerson) {
  if (isSoftDeleted) {
    // Riattiva persona soft-deleted
    await PersonCore.restorePerson(existingPerson.id);
    
    // Aggiorna dati se necessario
    if (updateExisting) {
      await PersonCore.updatePerson(existingPerson.id, updateData);
    }
  }
  // ... resto della logica
}
```

## 🧪 Test di Verifica

### Scenario Testato
1. **Creazione** persona di test
2. **Soft delete** della persona
3. **Verifica** che `findExistingPerson` la trovi come soft-deleted
4. **Import CSV** per riattivare e aggiornare
5. **Verifica** riattivazione e aggiornamento dati

### Risultati
```
✅ findExistingPerson ha trovato la persona soft-deleted
✅ Persona riattivata con successo
📊 Risultato import: { imported: 0, updated: 1, skipped: 0, errors: [] }
✅ Status finale: ACTIVE
```

## 📊 Impatto della Risoluzione

### ✅ Benefici
- **Eliminato** errore `unique constraint` su `taxCode`
- **Riattivazione automatica** persone soft-deleted
- **Aggiornamento dati** durante riattivazione
- **Log dettagliati** per debugging

### 🔄 Compatibilità
- **Backward compatible**: Funziona con dati esistenti
- **Default sicuro**: `includeSoftDeleted: true` per evitare duplicati
- **Flessibile**: Parametro opzionale per controllo granulare

## 🎯 Prossimi Passi

### Rimanenti da Implementare
1. **Correzione conteggio selezione CSV** in <mcfile name="PersonImport.tsx" path="/Users/matteo.michielon/project 2.0/src/components/persons/PersonImport.tsx"></mcfile>

### Monitoraggio
- Verificare log import per confermare funzionamento
- Monitorare performance con grandi dataset
- Raccogliere feedback utenti

---

**Status**: ✅ **PROBLEMA RISOLTO**  
**Prossima revisione**: Dopo implementazione correzione conteggio selezione