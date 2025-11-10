# Fix Errore 500 - Endpoint /courses/variants

## Problema Identificato

**Errore**: `GET /api/v1/courses/variants?search=p 500 (Internal Server Error)` durante la ricerca corsi in ScheduleEventModal.

**Causa**: Il campo `renewalDuration` era ancora referenziato nel codice backend ma è stato rimosso dal modello Prisma Course nella migrazione `20251018083345_element_formazione`.

## Soluzione Implementata

### 1. Rimozione renewalDuration da courses-routes.js

**File**: `backend/routes/courses-routes.js`

**Modifiche**:
- Rimosso `renewalDuration: true` dal `baseSelect` nell'endpoint `/variants`
- Aggiunto `practicalHours: true` per allineare con il nuovo schema
- Rimosso riferimenti a `renewalDuration` in `allowedCourseFields`
- Aggiornato middleware `convertCourseTypes` per gestire `practicalHours`
- Aggiornato `sanitizeCoursePayload` per rimuovere logica `renewalDuration`

```javascript
// Prima (ERRORE)
const baseSelect = {
  // ...
  renewalDuration: true,  // ❌ Campo rimosso dal DB
  // ...
};

// Dopo (CORRETTO)
const baseSelect = {
  // ...
  practicalHours: true,   // ✅ Campo presente nel DB
  // ...
};
```

### 2. Rimozione renewalDuration da publicCoursesController.js

**File**: `backend/controllers/publicCoursesController.js`

**Modifiche**:
- Sostituito tutti i `renewalDuration: true` con `practicalHours: true` nei select Prisma
- Aggiornati 5 punti nel controller dove veniva referenziato il campo obsoleto

### 3. Aggiunta Logging Diagnostico

**Miglioramenti**:
- Aggiunto logging dettagliato nell'endpoint `/variants` per debugging futuro
- Tracciamento delle query Prisma per identificare rapidamente problemi simili
- Logging dei parametri di accesso e filtri applicati

## Schema Prisma Aggiornato

**Campo rimosso**:
```prisma
// ❌ RIMOSSO nella migrazione 20251018083345_element_formazione
renewalDuration String?
```

**Campo aggiunto**:
```prisma
// ✅ AGGIUNTO nella migrazione 20251018083345_element_formazione  
practicalHours Int?
```

## Test di Verifica

### Test Endpoint Funzionanti
```bash
# ✅ Lista corsi base → STATUS 200
GET /api/v1/courses

# ✅ Query Prisma diretta → SUCCESS
prisma.course.findMany({ select: { practicalHours: true } })

# ✅ Endpoint variants (dopo fix) → STATUS 200
GET /api/v1/courses/variants?search=p
```

### Test Routing
- ✅ **API Diretta**: `GET http://localhost:4001/api/v1/courses/variants`
- ✅ **Via Proxy**: `GET http://localhost:4003/api/v1/courses/variants`  
- ✅ **Frontend**: Tramite `CourseDetailsForm.fetchVariantsBySearch()`

## Campi Course Aggiornati

### Rimossi (Obsoleti)
- `renewalDuration` - Durata rinnovo corso

### Aggiunti (Nuovi)
- `practicalHours` - Ore pratiche del corso

### Mantenuti (Esistenti)
- `validityYears` - Anni validità certificazione
- `duration` - Durata totale corso
- Tutti gli altri campi del modello Course

## Conformità Regole Progetto

✅ **Entità Course**: Modello unificato per tutti i corsi  
✅ **Soft Delete**: Campo `deletedAt` per eliminazioni  
✅ **GDPR**: Nessun dato sensibile in log, audit trail attivo  
✅ **Porte fisse**: API 4001, Proxy 4003 mantenute  
✅ **Architettura modulare**: Fix localizzato nei controller/routes  
✅ **Compatibilità ambienti**: Funziona localhost e Hetzner/Supabase  

## Prevenzione Futuri Errori

1. **Sincronizzazione Schema**: Verificare allineamento codice-DB dopo migrazioni
2. **Test Automatici**: Includere test endpoint dopo modifiche schema
3. **Logging Diagnostico**: Mantenere logging dettagliato per debugging rapido
4. **Code Review**: Verificare riferimenti campi rimossi prima del deploy

## Note Implementazione

- **Migrazione**: Campo `renewalDuration` rimosso in migrazione Prisma esistente
- **Backward Compatibility**: Nessuna necessità, campo non utilizzato nel frontend
- **Performance**: Nessun impatto, stesso numero di campi nel select
- **Logging**: Aggiunto logging dettagliato per debugging futuro
- **Testing**: Verificato funzionamento con query reali

## Errori Correlati Risolti

- ✅ **500 su /variants**: Risolto rimuovendo `renewalDuration`
- ✅ **Prisma validation**: Allineato select con schema DB
- ✅ **Frontend search**: Ripristinato funzionamento ricerca corsi
- ✅ **ScheduleEventModal**: Risolto caricamento opzioni corso

Il sistema di ricerca corsi ora funziona correttamente e l'endpoint `/variants` restituisce i risultati attesi per la selezione corsi nel ScheduleEventModal.