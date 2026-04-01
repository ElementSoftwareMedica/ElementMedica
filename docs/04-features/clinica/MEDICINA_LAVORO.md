# 🏥 Clinica - Medicina del Lavoro

**Versione**: 2.5.0  
**Data**: 22 Gennaio 2026  
**Normativa**: D.Lgs 81/08

---

## 📋 Overview

Il modulo Medicina del Lavoro (MDL) gestisce:
- Sorveglianza sanitaria dei lavoratori
- Protocolli sanitari per mansione
- Giudizi di idoneità
- Gestione rischi e prestazioni
- Allegati 3A e 3B per INAIL

---

## 🏛️ Architettura

### Entità Principali

```
Company (globale)
    │
    └── CompanyTenantProfile (per-tenant)
            │
            ├── CompanySite (sedi)
            │       │
            │       ├── Mansione
            │       │       │
            │       │       └── MansioneRischio (rischi per mansione)
            │       │
            │       └── NominaRuolo (MC, RSPP, RLS)
            │
            └── Lavoratori (PersonTenantProfile)
                    │
                    ├── LavoratoreMansione (assegnazione)
                    │
                    ├── GiudizioIdoneita
                    │
                    └── Visite MDL
```

---

## 📊 Catalogo Rischi

**28 codici rischio** conformi al D.Lgs 81/08:

### Rischi Fisici

| Codice | Nome | Prestazioni Tipiche |
|--------|------|---------------------|
| RUM | Rumore | Audiometria |
| VIB_MB | Vibrazioni mano-braccio | Spirometria, EMG |
| VIB_HAV | Vibrazioni corpo intero | Rx rachide |
| MIC | Microclima | Visita generale |
| TER | Esposizione termica | ECG |
| OTT | Radiazioni ottiche | Visita oculistica |
| RAD_ION | Radiazioni ionizzanti | Emocromo, dosimetria |
| RAD_NON | Radiazioni non ionizzanti | Visita dermatologica |

### Rischi Chimici

| Codice | Nome | Prestazioni Tipiche |
|--------|------|---------------------|
| CHI | Agenti chimici | Spirometria, esami sangue |
| POL | Polveri | Spirometria, Rx torace |
| SOL | Solventi | Esami epatici |
| GAS | Gas | Spirometria |
| FUM | Fumi | Spirometria, Rx torace |

### Rischi Biologici

| Codice | Nome | Prestazioni Tipiche |
|--------|------|---------------------|
| BIO | Agenti biologici | Screening infettivi |
| AGE_BIO | Agenti biologici specifici | Test specifici patogeno |

### Rischi Ergonomici

| Codice | Nome | Prestazioni Tipiche |
|--------|------|---------------------|
| MMC | Movimentazione manuale carichi | Rx rachide |
| MMC_TRA | Traino/spinta | Visita ortopedica |
| MMC_SOL | Sollevamento | Rx rachide |
| POS | Posture incongrue | Visita fisiatrica |
| MOV_RIP | Movimenti ripetitivi | EMG arti superiori |

### Rischi Psicosociali

| Codice | Nome | Prestazioni Tipiche |
|--------|------|---------------------|
| SLC | Stress lavoro-correlato | Valutazione psicologica |
| LAV_NOT | Lavoro notturno | ECG, esami sangue |
| TUR | Turnista | ECG, esami metabolici |
| VDT | Videoterminale | Visita oculistica |

### Rischi Sicurezza

| Codice | Nome | Prestazioni Tipiche |
|--------|------|---------------------|
| ALT | Lavoro in quota | ECG, visita vestibolare |
| ELE | Rischio elettrico | ECG |
| SPA_CON | Spazi confinati | Spirometria, ECG |
| GUI | Guida mezzi | Visita oculistica, audiometria |

---

## 📋 Tipi Visita MDL

| Tipo | Descrizione | Art. |
|------|-------------|------|
| PREVENTIVA | Prima dell'assunzione | Art. 41 c.2 lett.a |
| PERIODICA | Controlli programmati | Art. 41 c.2 lett.b |
| STRAORDINARIA | Su richiesta lavoratore | Art. 41 c.2 lett.c |
| CAMBIO_MANSIONE | Cambio rischi | Art. 41 c.1 |
| CESSAZIONE | Fine rapporto | Art. 41 c.2 lett.e |
| RIENTRO_ASSENZA | Dopo assenza >60gg | Art. 41 c.2 lett.e-ter |
| PRE_ASSUNTIVA | Prima dell'assunzione | Art. 41 c.2 lett.a |
| PRECEDENTE_A_MANSIONE | Prima assegnazione rischio | Art. 41 c.2 lett.e-bis |

---

## 📊 Giudizi Idoneità

| Giudizio | Descrizione |
|----------|-------------|
| IDONEO | Nessuna limitazione |
| IDONEO_CON_PRESCRIZIONI | Con limitazioni/prescrizioni |
| IDONEO_CON_LIMITAZIONI | Con limitazioni specifiche |
| NON_IDONEO_TEMPORANEO | Non idoneo temporaneamente |
| NON_IDONEO | Non idoneo alla mansione |

### Notifiche Obbligatorie

1. **Al lavoratore**: Sempre, entro 24h
2. **Al datore di lavoro**: In caso di limitazioni/non idoneità
3. **Via PEC**: Per giudizi con prescrizioni/limitazioni

---

## 📄 Allegati INAIL

### Allegato 3A - Cartella Sanitaria

Contenuto:
- Dati anagrafici lavoratore
- Storia lavorativa
- Rischi espositivi
- Anamnesi lavorativa
- Accertamenti sanitari
- Giudizi di idoneità

### Allegato 3B - Relazione Annuale

Report annuale al Servizio di Prevenzione:
- Numero lavoratori sottoposti a sorveglianza
- Rischi per mansione
- Esiti giudizi di idoneità
- Malattie professionali segnalate

---

## 🔗 API Endpoints

### Mansioni

```
GET    /api/v1/clinica/mansioni
POST   /api/v1/clinica/mansioni
GET    /api/v1/clinica/mansioni/:id
PUT    /api/v1/clinica/mansioni/:id
DELETE /api/v1/clinica/mansioni/:id
POST   /api/v1/clinica/mansioni/:id/duplicate
POST   /api/v1/clinica/mansioni/:id/assign
```

### Giudizi Idoneità

```
GET    /api/v1/clinica/giudizi-idoneita
POST   /api/v1/clinica/giudizi-idoneita
GET    /api/v1/clinica/giudizi-idoneita/:id
GET    /api/v1/clinica/giudizi-idoneita/expiring
POST   /api/v1/clinica/giudizi-idoneita/:id/notify-worker
POST   /api/v1/clinica/giudizi-idoneita/:id/notify-employer
```

### Rischio-Prestazioni

```
GET    /api/v1/clinica/rischio-prestazioni/catalogo
GET    /api/v1/clinica/rischio-prestazioni/default-mapping
POST   /api/v1/clinica/rischio-prestazioni/seed-defaults
```

---

## 📱 Pagine Frontend

| Pagina | Route |
|--------|-------|
| Mansioni | `/poliambulatorio/mdl/mansioni` |
| Protocolli Sanitari | `/poliambulatorio/mdl/protocolli-sanitari` |
| Giudizi Idoneità | `/poliambulatorio/mdl/giudizi-idoneita` |
| Nomine Ruolo | `/poliambulatorio/mdl/nomine-ruolo` |
| Rischio-Prestazioni | `/poliambulatorio/mdl/rischio-prestazioni` |
| Scadenze | `/poliambulatorio/mdl/scadenze` |
| Allegato 3A | `/poliambulatorio/mdl/allegato-3a` |
| Allegato 3B | `/poliambulatorio/mdl/allegato-3b` |
