# 💰 Clinica - Fatturazione

**Versione**: 2.5.0  
**Data**: 22 Gennaio 2026

---

## 📋 Overview

Il modulo fatturazione gestisce:
- Emissione fatture B2B/B2C
- Integrazione SDI (Sistema di Interscambio)
- Tariffari per aziende
- Bundle e offerte
- Codici sconto
- Export contabile

---

## 🏛️ Architettura

### Entità

```
Tenant
    │
    ├── Tariffario
    │       │
    │       └── TariffarioVoce
    │
    ├── TariffarioAzienda
    │       │
    │       └── TariffarioAziendaVoce
    │
    ├── Bundle/Offerta
    │       │
    │       └── BundlePrestazione
    │
    ├── Fattura
    │       │
    │       ├── FatturaRiga
    │       │
    │       └── FatturaAllegato
    │
    └── DiscountCode
```

---

## 📊 Tipi Documento

| Tipo | Codice SDI | Uso |
|------|------------|-----|
| Fattura | TD01 | Standard B2B |
| Fattura Semplificata | TD07 | B2C < €400 |
| Nota di Credito | TD04 | Storno parziale/totale |
| Nota di Debito | TD05 | Integrazione |
| Parcella | TD06 | Professionisti |
| Fattura PA | TD01 | Pubblica Amministrazione |

---

## 📊 Stati Fattura

| Stato | Descrizione |
|-------|-------------|
| BOZZA | In preparazione |
| EMESSA | Emessa, non inviata |
| INVIATA_SDI | Inviata al Sistema di Interscambio |
| CONSEGNATA | Consegnata al destinatario |
| ACCETTATA | Accettata dalla PA |
| RIFIUTATA | Rifiutata (errore) |
| SCARTATA | Scartata da SDI |
| PAGATA | Incassata |
| ANNULLATA | Annullata con nota di credito |

---

## 💵 Tariffari

### Tariffario Base (Tenant)

Listino prezzi predefinito del poliambulatorio:

```json
{
  "tariffario": {
    "nome": "Listino 2026",
    "validoDal": "2026-01-01",
    "voci": [
      {
        "prestazioneId": "uuid",
        "prezzo": 80.00,
        "iva": 22,
        "durataMinuti": 30
      }
    ]
  }
}
```

### Tariffario Azienda

Listino personalizzato per azienda cliente:

```json
{
  "tariffarioAzienda": {
    "aziendaId": "uuid",
    "nome": "Convenzione ABC Srl",
    "scontoGlobale": 15,  // % sconto su tutto
    "validoDal": "2026-01-01",
    "voci": [
      {
        "prestazioneId": "uuid",
        "prezzoCustom": 68.00,  // sovrascrive base
        "inclusoNelPacchetto": false
      }
    ]
  }
}
```

---

## 🎁 Bundle e Offerte

### Tipi Bundle

| Tipo | Descrizione |
|------|-------------|
| PACCHETTO_BASE | Set fisso di prestazioni |
| PACCHETTO_MDL | Pacchetto medicina del lavoro |
| CONVENZIONE | Accordo quadro con azienda |
| PROMOZIONE | Offerta temporanea |

### Struttura Bundle

```json
{
  "bundle": {
    "nome": "Visita Periodica Completa",
    "tipo": "PACCHETTO_MDL",
    "prezzoTotale": 120.00,
    "prezzoListino": 150.00,  // per mostrare sconto
    "prestazioni": [
      { "prestazioneId": "visita-mc", "inclusa": true },
      { "prestazioneId": "audiometria", "inclusa": true },
      { "prestazioneId": "spirometria", "inclusa": true },
      { "prestazioneId": "ecg", "inclusa": false, "prezzoAggiuntivo": 25 }
    ]
  }
}
```

---

## 🏷️ Codici Sconto

### Tipi Sconto

| Tipo | Applicazione |
|------|--------------|
| PERCENTUALE | % sul totale |
| FISSO | Importo fisso |
| PRIMA_VISITA | Solo prima visita |
| AZIENDA | Solo per aziende convenzionate |
| PROMOZIONE | Periodo limitato |

### Struttura

```json
{
  "discountCode": {
    "codice": "BENVENUTO2026",
    "tipo": "PERCENTUALE",
    "valore": 10,
    "validoDal": "2026-01-01",
    "validoAl": "2026-12-31",
    "usoMassimo": 100,
    "usoCorrente": 45,
    "applicabileA": ["VISITE", "ESAMI"]
  }
}
```

---

## 🔗 API Endpoints

### Fatture

```
GET    /api/v1/clinica/fatture
POST   /api/v1/clinica/fatture
GET    /api/v1/clinica/fatture/:id
PUT    /api/v1/clinica/fatture/:id
DELETE /api/v1/clinica/fatture/:id
POST   /api/v1/clinica/fatture/:id/emetti
POST   /api/v1/clinica/fatture/:id/invia-sdi
POST   /api/v1/clinica/fatture/:id/annulla
POST   /api/v1/clinica/fatture/:id/duplica
GET    /api/v1/clinica/fatture/:id/pdf
GET    /api/v1/clinica/fatture/:id/xml
```

### Tariffari

```
GET    /api/v1/clinica/tariffari
POST   /api/v1/clinica/tariffari
PUT    /api/v1/clinica/tariffari/:id
DELETE /api/v1/clinica/tariffari/:id
```

### Tariffari Azienda

```
GET    /api/v1/clinica/tariffari-aziende
POST   /api/v1/clinica/tariffari-aziende
GET    /api/v1/clinica/tariffari-aziende/:id
PUT    /api/v1/clinica/tariffari-aziende/:id
DELETE /api/v1/clinica/tariffari-aziende/:id
```

### Bundle

```
GET    /api/v1/clinica/bundles
POST   /api/v1/clinica/bundles
PUT    /api/v1/clinica/bundles/:id
DELETE /api/v1/clinica/bundles/:id
```

### Codici Sconto

```
GET    /api/v1/clinica/discount-codes
POST   /api/v1/clinica/discount-codes
PUT    /api/v1/clinica/discount-codes/:id
DELETE /api/v1/clinica/discount-codes/:id
POST   /api/v1/clinica/discount-codes/validate
```

---

## 📱 Pagine Frontend

| Pagina | Route |
|--------|-------|
| Lista Fatture | `/poliambulatorio/fatture` |
| Dashboard Fatturazione | `/poliambulatorio/fatturazione` |
| Tariffario | `/poliambulatorio/tariffario` |
| Tariffari Aziende | `/poliambulatorio/tariffari-aziende` |
| Bundle/Offerte | `/poliambulatorio/bundles` |
| Codici Sconto | `/poliambulatorio/codici-sconto` |
| Convenzioni | `/poliambulatorio/convenzioni` |

---

## 📄 Generazione PDF

### Template Fattura

Il sistema genera PDF con:
- Logo tenant
- Dati fiscali emittente
- Dati destinatario
- Righe con descrizione, quantità, prezzo, IVA
- Totali e scadenze pagamento
- QR code per pagamento (opzionale)
- Firma digitale (opzionale)

### Endpoint PDF

```
GET /api/v1/clinica/fatture/:id/pdf
Accept: application/pdf
```

---

## 📤 Integrazione SDI

### Flusso Invio

```
Fattura BOZZA
     │
     ▼
Emissione (TD01/TD07)
     │
     ▼
Generazione XML FatturaPA
     │
     ▼
Firma XML (p7m)
     │
     ▼
Invio a SDI
     │
     ├── Ricevuta di consegna ──► CONSEGNATA
     │
     ├── Notifica scarto ──► SCARTATA (errore XML)
     │
     ├── Notifica mancata consegna ──► Retry
     │
     └── (PA) Esito committente
              ├── Accettata ──► ACCETTATA
              └── Rifiutata ──► RIFIUTATA
```

### Feature Flag

```javascript
// Richiede: FATTURAZIONE_ELETTRONICA feature abilitata
router.post('/fatture/:id/invia-sdi',
  requireFeature('FATTURAZIONE_ELETTRONICA'),
  fatturaController.inviaSdi
);
```

---

## 📊 Report Contabili

### Export Disponibili

| Report | Formato | Descrizione |
|--------|---------|-------------|
| Registro IVA | CSV/Excel | Fatture per periodo |
| Scadenzario | Excel | Fatture da incassare |
| Clienti | Excel | Fatturato per cliente |
| Prestazioni | Excel | Fatturato per prestazione |
| Riconciliazione | CSV | Per commercialista |

---

## 🔒 Permessi

| Azione | Permesso |
|--------|----------|
| Visualizza fatture | `fatture:read` |
| Crea bozza | `fatture:write` |
| Emetti fattura | `fatture:emit` |
| Invia SDI | `fatture:sdi` |
| Annulla fattura | `fatture:delete` |
| Gestione tariffari | `tariffari:write` |
| Gestione sconti | `discounts:write` |
