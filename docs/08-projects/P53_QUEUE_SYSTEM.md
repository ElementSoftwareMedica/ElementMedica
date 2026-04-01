# P53 - Queue Calling System

**Stato**: ✅ Completato  
**Data**: Gennaio 2026

---

## 📋 Obiettivo

Sistema chiamata pazienti in sala d'attesa.

---

## ✅ Feature Implementate

### Workflow

1. Paziente arriva → Check-in
2. Stato: IN_ATTESA
3. Medico chiama → API chiama()
4. Display sala attesa aggiornato
5. Stato: IN_CORSO

### API

```
POST /api/v1/clinica/appuntamenti/:id/chiama
POST /api/v1/clinica/appuntamenti/:id/richiama
GET  /api/v1/clinica/appuntamenti/sala-attesa
```

### Frontend

- Pulsante "Chiama" in tooltip appuntamento
- Display sala attesa (TV)
- Audio notification
- Counter pazienti in attesa

### WebSocket

Real-time updates per:
- Nuovo paziente in attesa
- Paziente chiamato
- Aggiornamento stato
