# Fix Errore 500 - Creazione Formatori

## Problema Identificato

**Errore**: `POST /api/v1/persons 500 (Internal Server Error)` durante la creazione di formatori dal frontend.

**Causa**: Campi vuoti (stringhe vuote `""`) nel payload JSON del form TrainerForm causavano problemi di validazione o parsing nel backend.

## Soluzione Implementata

### 1. Pulizia Dati Frontend

**File**: `src/services/trainers.ts` - Metodo `createTrainer`

**Modifiche**:
- Aggiunta pulizia automatica dei campi vuoti prima dell'invio
- Mantenimento di array vuoti e valori boolean
- Validazione obbligatoria di `firstName` e `lastName`
- Logging per debugging

```typescript
// Pulisci i dati rimuovendo campi vuoti
const cleanedData: any = {};
Object.keys(rest).forEach(key => {
  const value = rest[key];
  if (value !== '' && value !== null && value !== undefined) {
    cleanedData[key] = value;
  } else if (Array.isArray(value)) {
    cleanedData[key] = value; // Mantieni array vuoti
  } else if (typeof value === 'boolean') {
    cleanedData[key] = value; // Mantieni boolean
  }
});
```

### 2. Generazione Automatica Backend

**Funzionalità Esistenti** (già implementate):
- **Username**: Generato automaticamente da `firstName.lastName` se non fornito
- **Password**: Password temporanea generata automaticamente se non fornita
- **Hash Password**: Automatico con bcrypt (12 rounds)
- **TenantId**: Propagato da header `X-Tenant-ID` o utente autenticato

## Test di Verifica

### Test Minimi Funzionanti
```bash
# Test con dati minimi - STATUS 201 ✅
{
  "firstName": "Test",
  "lastName": "Trainer", 
  "email": "test@example.com",
  "roleType": "TRAINER"
}

# Test con tutti i campi form - STATUS 201 ✅
{
  "firstName": "Full",
  "lastName": "Trainer",
  "taxCode": "",
  "phone": "",
  "email": "full@example.com",
  "certifications": [],
  "vatNumber": "",
  "hourlyRate": "",
  // ... altri campi vuoti
  "status": "ACTIVE",
  "specialties": []
}
```

### Endpoint Testati
- ✅ **API Diretta**: `POST http://localhost:4001/api/v1/persons`
- ✅ **Via Proxy**: `POST http://localhost:4003/api/v1/persons`
- ✅ **Frontend**: Tramite `TrainersService.createTrainer()`

## Campi Gestiti Automaticamente

### Obbligatori (Frontend)
- `firstName` - Nome (richiesto)
- `lastName` - Cognome (richiesto)
- `email` - Email (richiesto, validato)

### Opzionali (Form)
- `taxCode` - Codice fiscale
- `phone` - Telefono
- `certifications` - Array certificazioni
- `vatNumber` - Partita IVA
- `hourlyRate` - Tariffa oraria
- `registerCode` - Codice registro
- `iban` - IBAN
- `birthDate` - Data nascita (auto-estratta da CF)
- `residenceAddress` - Indirizzo
- `residenceCity` - Città
- `province` - Provincia
- `postalCode` - CAP
- `notes` - Note
- `specialties` - Array specializzazioni

### Automatici (Backend)
- `username` - Generato da nome.cognome
- `password` - Password temporanea hashata
- `roleType` - Impostato a 'TRAINER'
- `tenantId` - Da header X-Tenant-ID
- `status` - Da campo `isActive`

## Conformità Regole Progetto

✅ **Entità Person**: Formatori creati come Person con roleType TRAINER  
✅ **Soft Delete**: Campo `deletedAt` per eliminazioni  
✅ **GDPR**: Nessun dato sensibile in log, audit trail attivo  
✅ **Porte Fisse**: API 4001, Proxy 4003 mantenute  
✅ **Architettura Modulare**: Fix localizzato nel servizio frontend  
✅ **Documentazione**: Aggiornata e allineata  

## Prevenzione Futuri Errori

1. **Validazione Frontend**: Campi obbligatori validati prima dell'invio
2. **Pulizia Dati**: Rimozione automatica campi vuoti
3. **Logging**: Console log per debugging in sviluppo
4. **Test Automatici**: Verificare creazione con dati minimi e completi

## Note Implementazione

- **Username**: Formato `nome.cognome`, reso univoco con suffisso numerico se necessario
- **Password**: Generata automaticamente, deve essere cambiata al primo login
- **Ruoli**: PersonRole creato automaticamente con roleType TRAINER
- **Tenant Isolation**: Rigoroso via tenantId dalla sessione utente
- **Company**: Opzionale, può essere assegnata successivamente