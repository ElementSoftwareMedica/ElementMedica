# P55 - MDL Multi-Prestazioni

**Stato**: ✅ Completato  
**Data**: Gennaio 2026

---

## 📋 Obiettivo

Abilitare visite con prestazioni multiple.

---

## ✅ Feature Implementate

### Modello VisitaPrestazione

```prisma
model VisitaPrestazione {
  id            String   @id
  visitaId      String
  prestazioneId String
  eseguita      Boolean  @default(false)
  esito         String?
  note          String?
  eseguitaAt    DateTime?
  eseguitaDa    String?  // personId
  
  visita        Visita
  prestazione   Prestazione
}
```

### Workflow

1. Protocollo sanitario → Lista prestazioni
2. Creazione visita → VisitaPrestazione multiple
3. Esecuzione → Mark singole come eseguite
4. Completamento → Tutte eseguite

### UI

- Checklist prestazioni in visita
- Progress bar completamento
- Esecuzione singola con esito
- Batch mark completed

### Calcolo Prezzo

```javascript
// Somma prezzi singole prestazioni
const totalPrice = visitaPrestazioni.reduce((sum, vp) => 
  sum + (vp.eseguita ? vp.prestazione.prezzo : 0), 0
);
```
