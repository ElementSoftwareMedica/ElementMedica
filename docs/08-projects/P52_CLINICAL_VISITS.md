# P52 - Clinical Visit System

**Stato**: ✅ Completato  
**Data**: Gennaio 2026

---

## 📋 Obiettivo

Sistema completo per gestione visite cliniche.

---

## ✅ Feature Implementate

### Modelli

- `Visita` - Visita medica
- `VisitaPrestazione` - Prestazioni eseguite
- `Referto` - Referti medici
- `AllegatoVisita` - Allegati

### Stati Visita

```prisma
enum StatoVisita {
  PROGRAMMATA
  IN_CORSO
  COMPLETATA
  ANNULLATA
  REFERTATA
}
```

### API

```
GET    /api/v1/clinica/visite
GET    /api/v1/clinica/visite/:id
POST   /api/v1/clinica/visite
PUT    /api/v1/clinica/visite/:id
POST   /api/v1/clinica/visite/:id/start
POST   /api/v1/clinica/visite/:id/complete
POST   /api/v1/clinica/visite/:id/referto
```

### Frontend

- `/poliambulatorio/visite`
- Vista dettaglio visita
- Form referto
- Stampa referto PDF
