# 🔄 Modal Rigenerazione Attestati

## 📋 Panoramica
Sistema di rigenerazione attestati con conferma utente e selezione individuale partecipanti.

## 🎯 Problema Risolto
- **Errore 409 Conflict**: Backend restituiva errore quando si tentava di rigenerare attestati già esistenti
- **Mancanza di controllo**: Nessuna possibilità di scegliere quali attestati rigenerare
- **Rate Limiting 429**: Chiamate DELETE simultanee causavano errore "Troppe richieste"
- **Identificazione partecipanti**: Mostrava ID invece di nomi cognomi

## 🏗️ Architettura

### Componenti Modificati

#### 1. `RegenerateAttestatiModal.tsx` (NUOVO)
Modal di conferma con selezione partecipanti.

**Features**:
- ✅ Statistiche (Totale/Senza/Con attestati esistenti)
- ✅ Selezione individuale con checkbox
- ✅ Toggle "Seleziona tutti"
- ✅ Opzione "Rigenera esistenti" con warning
- ✅ Visual distinction (verde=nuovo, ambra=esistente)
- ✅ Validazione (almeno 1 partecipante)
- ✅ Auto-selezione partecipanti senza attestati all'apertura

**Props**:
```typescript
interface RegenerateAttestatiModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (personIds: string[], regenerateExisting: boolean) => void;
  persons: Person[];
  existingAttestati: Array<{ personId: string }>;
  scheduleTitle?: string;
}
```

#### 2. `DocumentManager.tsx` (MODIFICATO)
Gestisce generazione documenti e attestati.

**Modifiche**:
```typescript
// Aggiunta prop persons
interface DocumentManagerProps {
  // ... altre props
  persons?: Person[];
}

// Nuovo state
const [showRegenerateModal, setShowRegenerateModal] = useState(false);

// Handler refactored - apre modal invece di generare direttamente
const handleGenerateAttestati = async () => {
  if (!scheduleId || selectedPersons.length === 0) return;
  setShowRegenerateModal(true);
};

// Nuovo handler per conferma
const handleConfirmGeneration = async (personIds: string[], regenerateExisting: boolean) => {
  if (regenerateExisting) {
    // Delete esistenti
    await attestatiService.deleteMultipleAttestati(existingToDelete);
  } else {
    // Filtra solo nuovi
    personIds = personIds.filter(id => !personsWithAttestati.has(id));
  }
  
  // Genera batch
  const result = await attestatiService.generateBatch({...});
};
```

**Modal JSX**:
```tsx
<RegenerateAttestatiModal
  isOpen={showRegenerateModal}
  onClose={() => setShowRegenerateModal(false)}
  onConfirm={handleConfirmGeneration}
  persons={selectedPersons
    .map(id => persons.find(p => String(p.id) === String(id)))
    .filter((p): p is Person => p !== undefined)
    .map(p => ({
      id: String(p.id),
      firstName: p.firstName,
      lastName: p.lastName
    }))}
  existingAttestati={attestatiList}
  scheduleTitle="Corso"
/>
```

#### 3. `StepDocuments.tsx` (MODIFICATO)
Wrapper per DocumentManager nello step wizard.

**Modifiche**:
```typescript
interface StepDocumentsProps {
  // ... altre props
  persons?: Person[];
}

// Passa persons a DocumentManager
<DocumentManager
  // ... altre props
  persons={persons}
/>
```

#### 4. `ScheduleEventModal.tsx` (MODIFICATO)
Modal principale gestione schedulazioni.

**Modifiche**:
```typescript
// Già aveva persons dal context
const { persons } = useScheduleModalContext();

// Step 3 (Documents)
<StepDocuments
  // ... altre props
  persons={persons}
/>
```

#### 5. `attestatiService.ts` (MODIFICATO)
Service layer per API attestati.

**Fix Rate Limiting**:
```typescript
async deleteMultipleAttestati(ids: string[]): Promise<...> {
  try {
    // Prima prova batch endpoint
    const response = await api.post('/api/v1/attestati/delete-batch', ...);
    return response.data;
  } catch (batchError) {
    if (batchError.response?.status === 404) {
      // Fallback: sequential delete con delay
      const results = [];
      for (const id of ids) {
        try {
          await this.delete(id);
          results.push({ status: 'fulfilled' });
          // Delay 200ms per evitare 429
          if (ids.indexOf(id) < ids.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        } catch (err) {
          results.push({ status: 'rejected' });
        }
      }
      // ...
    }
  }
}
```

## 🔄 Flusso Operativo

### Scenario 1: Genera Solo Nuovi Attestati
```
1. User: Click "Genera Attestati"
2. Modal: Si apre con auto-selezione partecipanti senza attestati
3. Modal: Mostra statistiche (es. 3 senza, 2 con attestati)
4. User: Conferma selezione (toggle "Rigenera esistenti" OFF)
5. Backend: handleConfirmGeneration filtra solo persone senza attestati
6. Backend: generateBatch con personIds filtrati
7. Success: Alert "✅ Generati N attestati!"
8. Refresh: Lista attestati aggiornata
```

### Scenario 2: Rigenera Attestati Esistenti
```
1. User: Click "Genera Attestati"
2. Modal: Si apre, mostra partecipanti con/senza attestati
3. User: Abilita "Rigenera esistenti"
4. Modal: Abilita checkbox per partecipanti con attestati (bordo ambra)
5. User: Seleziona partecipanti da rigenerare + conferma
6. Backend: handleConfirmGeneration chiama deleteMultipleAttestati
7. Service: Delete sequenziale con delay 200ms tra richieste
8. Backend: generateBatch per personIds selezionati
9. Success: Alert "✅ Generati N attestati!"
10. Refresh: Lista attestati aggiornata
```

### Scenario 3: Selezione Parziale
```
1. User: Click "Genera Attestati"
2. Modal: Auto-seleziona 3 senza attestati
3. User: Deseleziona 1 persona
4. User: Conferma con 2 persone selezionate
5. Backend: Genera attestati solo per 2 persone
6. Success: Alert "✅ Generati 2 attestati!"
```

## 🛡️ Validazioni

### Frontend (Modal)
- ✅ Almeno 1 persona selezionata
- ✅ Conferma esplicita se rigenerazione con esistenti
- ✅ Disabilita checkbox se attestato esistente e toggle OFF
- ⚠️ Warning visivo per attestati esistenti (bordo ambra)

### Backend (DocumentManager)
- ✅ Verifica scheduleId valido
- ✅ Verifica selectedPersons non vuoto
- ✅ Filtro automatico se regenerateExisting=false
- ✅ Check lista vuota dopo filtro
- ✅ Error handling 409 con messaggio user-friendly

## 🚨 Error Handling

### 409 Conflict
```typescript
if (error.response?.status === 409) {
  alert('⚠️ Alcuni partecipanti hanno già un attestato. Usa il modal per rigenerarli o seleziona solo chi non ce l\'ha.');
}
```

### 429 Rate Limiting
```typescript
// Risolto con sequential delete + delay 200ms
for (const id of ids) {
  await this.delete(id);
  if (ids.indexOf(id) < ids.length - 1) {
    await new Promise(resolve => setTimeout(resolve, 200));
  }
}
```

### 404 Batch Endpoint
```typescript
// Fallback automatico a single delete
catch (batchError) {
  if (batchError.response?.status === 404) {
    // Sequential delete con delay
  }
}
```

## 📊 Statistiche Modal

```tsx
<div className="grid grid-cols-3 gap-4 mb-6">
  {/* Totale Partecipanti */}
  <div className="bg-blue-50 p-4 rounded-lg">
    <div className="text-sm text-gray-600 mb-1">Totale</div>
    <div className="text-2xl font-bold text-blue-700">{persons.length}</div>
  </div>
  
  {/* Senza Attestati */}
  <div className="bg-green-50 p-4 rounded-lg">
    <div className="text-sm text-gray-600 mb-1">Senza Attestati</div>
    <div className="text-2xl font-bold text-green-700">{personsWithoutAttestati.length}</div>
  </div>
  
  {/* Con Attestati */}
  <div className="bg-amber-50 p-4 rounded-lg">
    <div className="text-sm text-gray-600 mb-1">Con Attestati</div>
    <div className="text-2xl font-bold text-amber-700">{personsWithExistingAttestati.length}</div>
  </div>
</div>
```

## 🎨 Visual Design

### Badge Status
- 🟢 **Verde** (`bg-green-100 text-green-800`): Nuovo attestato
- 🟠 **Ambra** (`bg-amber-100 text-amber-800`): Attestato esistente

### Checkbox States
- ✅ Abilitato + Verde: Persona senza attestato (sempre selezionabile)
- 🔒 Disabilitato + Ambra: Persona con attestato (toggle OFF)
- ✅ Abilitato + Ambra: Persona con attestato (toggle ON)

### Warning
```tsx
{!regenerateExisting && personsWithExistingAttestati.length > 0 && (
  <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-4">
    <div className="flex">
      <AlertTriangle className="h-5 w-5 text-amber-400 mr-2" />
      <p className="text-sm text-amber-700">
        {personsWithExistingAttestati.length} partecipanti hanno già un attestato.
        Abilita "Rigenera esistenti" per sovrascriverli.
      </p>
    </div>
  </div>
)}
```

## 🧪 Testing

### Test Manuali
1. ✅ Modal si apre correttamente
2. ✅ Statistiche accurate
3. ✅ Nomi cognomi visualizzati (non ID)
4. ✅ Auto-selezione partecipanti senza attestati
5. ✅ Toggle "Seleziona tutti" funziona
6. ✅ Toggle "Rigenera esistenti" abilita checkbox
7. ✅ Validazione almeno 1 selezionato
8. ✅ Conferma con warning se esistenti
9. ✅ Eliminazione con delay funziona (no 429)
10. ✅ Generazione batch funziona
11. ✅ Refresh automatico lista attestati
12. ✅ Nessun errore 409

### Test Backend
```bash
# Test delete singolo
curl -X DELETE http://localhost:4001/api/v1/attestati/{id}

# Test batch generation
curl -X POST http://localhost:4001/api/v1/attestati/generate-batch \
  -H "Content-Type: application/json" \
  -d '{"scheduleId":"123","personIds":["1","2"]}'
```

## 📝 Note Tecniche

### Type Safety
```typescript
type Person = { id: string | number; firstName: string; lastName: string };

// Filter con type predicate per eliminare undefined
.filter((p): p is Person => p !== undefined)
```

### ID Normalization
```typescript
// Conversione consistente a string per confronto
.map(id => persons.find(p => String(p.id) === String(id)))
```

### Performance
- Delay 200ms tra delete è un compromesso accettabile (3 delete = 600ms)
- Sequential delete solo in fallback (batch endpoint dovrebbe essere implementato)
- Auto-selezione con `useEffect` dipende solo da `isOpen`

## 🔮 Miglioramenti Futuri

### P1 - Backend
- [ ] Implementare `/api/v1/attestati/delete-batch` endpoint
- [ ] Rate limiting configuration (es. 10 req/sec invece di fallback)

### P2 - UX
- [ ] Progress bar durante delete sequenziali
- [ ] Toast notifications invece di alert()
- [ ] Bulk download dopo generazione
- [ ] Preview attestati prima di conferma

### P3 - Features
- [ ] Filtro/ricerca partecipanti nel modal
- [ ] Ordinamento per nome/cognome/status
- [ ] Export lista partecipanti selezionati
- [ ] Invio email automatico dopo generazione

## 🔗 File Correlati
- `/src/components/schedules/components/RegenerateAttestatiModal.tsx`
- `/src/components/schedules/components/DocumentManager.tsx`
- `/src/components/schedules/components/steps/StepDocuments.tsx`
- `/src/components/schedules/ScheduleEventModal.tsx`
- `/src/services/attestatiService.ts`
- `/src/components/schedules/context/ScheduleModalContext.tsx`

## 📅 Data Implementazione
6 novembre 2025

## 👤 Implementato da
GitHub Copilot + Matteo Michielon
