# Template System - Risoluzione Errori Comuni

## Errore 500: GET /api/v1/attestati

### Sintomi
```
GET http://localhost:5173/api/v1/attestati?scheduleId=... 500 (Internal Server Error)
Error listing attestati: AxiosError {message: 'Request failed with status code 500'}
```

### Causa
La query Prisma include la relazione `template` (TemplateLink) che potrebbe:
- Non esistere nel database
- Avere problemi di referential integrity
- Non essere configurata correttamente nello schema

### Soluzione
Rimuovere temporaneamente l'include dalla query in `backend/routes/attestati-routes.js`:

```javascript
// ❌ Prima (causa errore)
const attestati = await prisma.attestato.findMany({
  where,
  include: {
    person: { ... },
    scheduledCourse: { ... },
    template: {  // ← Questa relazione causa il 500
      select: {
        id: true,
        name: true,
        version: true
      }
    }
  }
});

// ✅ Dopo (funzionante)
const attestati = await prisma.attestato.findMany({
  where,
  include: {
    person: { ... },
    scheduledCourse: { ... }
    // template rimosso
  }
});
```

### Verifica Template nel Database
```sql
-- Verifica esistenza template
SELECT * FROM "TemplateLink" WHERE type = 'CERTIFICATE';

-- Verifica relazioni attestati
SELECT a.id, a."templateId", t.name 
FROM "Attestato" a 
LEFT JOIN "TemplateLink" t ON a."templateId" = t.id 
LIMIT 10;
```

---

## Errore 404: POST /api/v1/attestati/generate-batch

### Sintomi
```
POST http://localhost:5173/api/v1/attestati/generate-batch 404 (Not Found)
```

### Causa Possibile 1: Ordine Route Express
Le route con parametri dinamici (`:id`) catturano path prima delle route specifiche.

**Ordine SCORRETTO**:
```javascript
router.get('/:id', ...);  // ← Cattura /generate-batch come :id
router.post('/generate-batch', ...);  // ← Non viene mai raggiunta
```

**Ordine CORRETTO**:
```javascript
router.post('/generate-batch', ...);  // ← Route specifica prima
router.get('/:id', ...);  // ← Route dinamica dopo
```

### Causa Possibile 2: Cache/Server non Riavviato
Il server potrebbe avere vecchie route in cache.

**Soluzione**:
```bash
# Killa tutti i processi backend
pkill -9 -f "node.*api-server|node.*proxy-server"

# Riavvia
cd backend
PORT=4001 node servers/api-server.js &
PORT=4003 node servers/proxy-server.js &
```

---

## Best Practices

### 1. Logging Dettagliato
Sempre includere stack trace negli errori:

```javascript
catch (error) {
  logger.error('Failed to fetch attestati', {
    error: error.message,
    stack: error.stack,  // ← Fondamentale per debug
    personId: req.user?.id
  });
  
  res.status(500).json({ 
    error: 'Failed to fetch attestati',
    message: error.message,
    // Solo in development
    details: process.env.NODE_ENV === 'development' ? error.stack : undefined
  });
}
```

### 2. Ordine Route Express
Sempre registrare route in questo ordine:

1. GET / (liste)
2. POST /specific-action (azioni specifiche)
3. GET /:id/sub-resource (sotto-risorse con :id)
4. GET /:id (dettaglio generico)
5. PUT /:id (update generico)
6. DELETE /:id (delete generico)

### 3. Verifiche Prisma
Prima di fare query con `include`, verifica che:
- Le relazioni esistano nello schema
- I dati referenziati esistano nel database
- Non ci siano foreign key constraint violations

```javascript
// Verifica esistenza prima di include
const hasTemplate = await prisma.templateLink.count({
  where: { type: 'CERTIFICATE', deletedAt: null }
}) > 0;

const attestati = await prisma.attestato.findMany({
  where,
  include: {
    person: true,
    scheduledCourse: true,
    ...(hasTemplate ? { template: true } : {})  // Include condizionale
  }
});
```

---

## Checklist Debug Veloce

Quando si verificano errori 500/404:

- [ ] Verificare log backend (`/tmp/api-final.log`)
- [ ] Controllare ordine route nel file routes
- [ ] Verificare sintassi JavaScript (`node --check file.js`)
- [ ] Riavviare server backend
- [ ] Hard refresh browser (Cmd+Shift+R)
- [ ] Controllare Network tab DevTools per dettagli errore
- [ ] Verificare database Prisma Studio per dati mancanti
- [ ] Testare endpoint direttamente con curl/Postman

---

## Riferimenti

- [Express Routing Documentation](https://expressjs.com/en/guide/routing.html)
- [Prisma Relations](https://www.prisma.io/docs/concepts/components/prisma-schema/relations)
- `docs/technical/TEMPLATE_SYSTEM.md` - Documentazione completa Template System
