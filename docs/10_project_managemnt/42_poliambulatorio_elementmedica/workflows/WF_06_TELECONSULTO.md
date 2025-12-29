```markdown
# 📹 WORKFLOW 06: Teleconsulto

**Versione**: 1.0  
**Data**: 2025-12-11  
**Collegato a**: [SPEC_19_TELECONSULTO.md](../specs/SPEC_19_TELECONSULTO.md), [SPEC_07_APPUNTAMENTI.md](../specs/SPEC_07_APPUNTAMENTI.md)

---

## 1. OVERVIEW

Questo workflow descrive il processo completo di una visita medica in teleconsulto, dalla prenotazione alla refertazione.

---

## 2. DIAGRAMMA FLUSSO COMPLETO

```
                    PAZIENTE                              SISTEMA                           MEDICO
                        │                                     │                                │
                        │                                     │                                │
    ┌───────────────────┴───────────────────┐                │                                │
    │  1. PRENOTAZIONE TELECONSULTO         │                │                                │
    └───────────────────┬───────────────────┘                │                                │
                        │                                     │                                │
                        ▼                                     │                                │
              ┌─────────────────┐                             │                                │
              │ Scelta prestazione │                          │                                │
              │  "Teleconsulto"    │                          │                                │
              └────────┬────────┘                             │                                │
                       │                                      │                                │
                       ▼                                      │                                │
              ┌─────────────────┐                             │                                │
              │ Selezione medico │                            │                                │
              │ e slot orario    │                            │                                │
              └────────┬────────┘                             │                                │
                       │                                      │                                │
                       ▼                                      ▼                                │
              ┌─────────────────┐              ┌─────────────────────────┐                    │
              │ Pagamento       │───────────►  │ Creazione appuntamento  │                    │
              │ anticipato      │              │ + sessione teleconsulto │                    │
              └─────────────────┘              └───────────┬─────────────┘                    │
                                                          │                                   │
                                                          ▼                                   │
                                               ┌─────────────────────────┐                    │
                                               │  Email/SMS conferma:    │                    │
                       ┌───────────────────────│  - Link accesso         │                    │
                       │                       │  - Istruzioni tecniche  │                    │
                       │                       │  - Link test connessione│                    │
                       │                       └─────────────────────────┘                    │
                       │                                                                      │
                       │                                                                      │
    ┌──────────────────┴───────────────────┐                                                 │
    │  2. PRE-SESSIONE (24h-15min prima)   │                                                 │
    └──────────────────┬───────────────────┘                                                 │
                       │                                                                      │
                       ▼                                                                      │
              ┌─────────────────┐              ┌─────────────────────────┐                    │
              │ Reminder 24h    │◄─────────────│  Scheduler automatico   │                    │
              │ via Email/SMS/WA│              └─────────────────────────┘                    │
              └────────┬────────┘                                                            │
                       │                                                                      │
                       ▼                                                                      │
              ┌─────────────────┐                                                            │
              │ Reminder 1h     │                                                            │
              │ con link diretto│                                                            │
              └────────┬────────┘                                                            │
                       │                                                                      │
                       ▼                                                                      │
              ┌─────────────────┐                                                            │
              │ Test connessione│                                                            │
              │ (pre-call check)│                                                            │
              │ - Camera        │                                                            │
              │ - Microfono     │                                                            │
              │ - Rete          │                                                            │
              └────────┬────────┘                                                            │
                       │                                                                      │
                       │                                                                      │
    ┌──────────────────┴───────────────────┐                                                 │
    │  3. INGRESSO SESSIONE                │                                                 │
    └──────────────────┬───────────────────┘                                                 │
                       │                                                                      │
                       ▼                                     ▼                                ▼
              ┌─────────────────┐              ┌─────────────────────────┐      ┌────────────────┐
              │ Click link      │              │  Valida token accesso   │      │ Dashboard medico│
              │ accesso         │─────────────►│  paziente               │      │ "Prossimi       │
              └────────┬────────┘              └───────────┬─────────────┘      │  teleconsulti"  │
                       │                                   │                    └───────┬────────┘
                       ▼                                   │                            │
              ┌─────────────────┐                          │                            │
              │ Consenso        │                          │                            ▼
              │ teleconsulto    │                          │                    ┌────────────────┐
              │ (se non già dato)│                         │                    │ Click "Avvia   │
              └────────┬────────┘                          │                    │  sessione"     │
                       │                                   │                    └───────┬────────┘
                       ▼                                   │                            │
              ┌─────────────────┐              ┌───────────┴─────────────┐              │
              │ WAITING ROOM    │              │  Sessione: stato        │              │
              │ "In attesa del  │◄─────────────│  IN_ATTESA_MEDICO       │◄─────────────┘
              │  medico..."     │              └───────────┬─────────────┘
              └────────┬────────┘                          │
                       │                                   │
                       │      ┌────────────────────────────┘
                       │      │
                       │      ▼
                       │   ┌─────────────────────────┐              ┌────────────────┐
                       │   │ Medico entra in stanza  │─────────────►│ STANZA VIDEO   │
                       │   │ stato: IN_CORSO         │              │ - Video P2P    │
                       │   └───────────┬─────────────┘              │ - Audio        │
                       │               │                            │ - Chat         │
                       │               ▼                            │ - Condivisione │
                       │   ┌─────────────────────────┐              │   documenti    │
                       └──►│ "Ammetti paziente"      │──────────────┤                │
                           └─────────────────────────┘              └────────────────┘
                                                                            │
                                                                            │
    ┌───────────────────────────────────────────────────────────────────────┴──────────┐
    │  4. SESSIONE TELECONSULTO                                                         │
    └───────────────────────────────────────────────────────────────────────┬──────────┘
                                                                            │
                                                                            ▼
                                                                 ┌─────────────────────┐
                                                                 │ VIDEOCHIAMATA ATTIVA│
                                                                 │                     │
                                                                 │ ┌─────────────────┐ │
                                                                 │ │ Paziente        │ │
                                                                 │ │    ┌──────┐     │ │
                                                                 │ │    │VIDEO │     │ │
                                                                 │ │    └──────┘     │ │
                                                                 │ └─────────────────┘ │
                                                                 │         PiP         │
                                                                 │      ┌──────┐       │
                                                                 │      │Medico│       │
                                                                 │      └──────┘       │
                                                                 │                     │
                                                                 │ ┌─────────────────┐ │
                                                                 │ │ 🎤 📷 📺 📎 💬 │ │
                                                                 │ └─────────────────┘ │
                                                                 └──────────┬──────────┘
                                                                            │
                                                         ┌──────────────────┼──────────────────┐
                                                         │                  │                  │
                                                         ▼                  ▼                  ▼
                                              ┌───────────────┐  ┌───────────────┐  ┌───────────────┐
                                              │ Condivisione  │  │ Screen share  │  │ Chat testuale │
                                              │ documenti     │  │ (referto, esami)│  │               │
                                              └───────────────┘  └───────────────┘  └───────────────┘
                                                                            │
                                                                            │
    ┌───────────────────────────────────────────────────────────────────────┴──────────┐
    │  5. CHIUSURA E REFERTAZIONE                                                       │
    └───────────────────────────────────────────────────────────────────────┬──────────┘
                                                                            │
                                                                            ▼
                                                                 ┌─────────────────────┐
                                              ┌──────────────────│ Medico: "Termina    │
                                              │                  │  sessione"          │
                                              │                  └──────────┬──────────┘
                                              │                             │
                                              ▼                             ▼
                                   ┌─────────────────────┐      ┌─────────────────────┐
                                   │ Popup qualità       │      │ Redirect a          │
                                   │ (rating 1-5, note)  │      │ compilazione referto│
                                   └─────────────────────┘      └──────────┬──────────┘
                                                                           │
                                                                           ▼
                                                                ┌─────────────────────┐
                                                                │ Medico compila      │
                                                                │ referto teleconsulto│
                                                                │ (vedi WF_04)        │
                                                                └──────────┬──────────┘
                                                                           │
                                                                           ▼
                                                                ┌─────────────────────┐
                                                                │ Firma digitale      │
                                                                │ referto             │
                                                                └──────────┬──────────┘
                                                                           │
                                              ┌────────────────────────────┴────────────────────────┐
                                              │                                                     │
                                              ▼                                                     ▼
                                   ┌─────────────────────┐                              ┌─────────────────────┐
                                   │ Email paziente:     │                              │ Aggiornamento       │
                                   │ - Referto PDF       │                              │ cartella clinica    │
                                   │ - Link portale      │                              └─────────────────────┘
                                   └─────────────────────┘
```

---

## 3. STATI SESSIONE TELECONSULTO

```
┌────────────────┐     ┌────────────────┐     ┌────────────────┐
│  PROGRAMMATO   │────►│ IN_ATTESA_     │────►│  IN_CORSO      │
│                │     │    PAZIENTE    │     │                │
└────────────────┘     └────────────────┘     └────────┬───────┘
                              │                        │
                              │                        ├────►┌────────────────┐
                              ▼                        │     │  COMPLETATO    │
                       ┌────────────────┐              │     └────────────────┘
                       │ IN_ATTESA_     │──────────────┘
                       │    MEDICO      │                     
                       └────────────────┘              
                              │                               ┌────────────────┐
                              │                               │  CANCELLATO    │
                              └──────────────────────────────►└────────────────┘
                                                              
                                                              ┌────────────────┐
                                                              │ NO_SHOW_       │
                                                              │   PAZIENTE     │
                                                              └────────────────┘
                                                              
                                                              ┌────────────────┐
                                                              │ NO_SHOW_       │
                                                              │   MEDICO       │
                                                              └────────────────┘
                                                              
                                                              ┌────────────────┐
                                                              │   FALLITO      │
                                                              │ (tecnico)      │
                                                              └────────────────┘
```

---

## 4. DETTAGLIO PASSAGGI

### 4.1 Prenotazione Teleconsulto

| Step | Attore | Azione | Sistema | Validazione |
|------|--------|--------|---------|-------------|
| 1.1 | Paziente | Seleziona prestazione teleconsulto | Mostra solo prestazioni `tipo=TELECONSULTO` | ✅ |
| 1.2 | Paziente | Seleziona medico | Lista medici abilitati teleconsulto | ✅ |
| 1.3 | Paziente | Seleziona slot | Solo slot con `modalita=ONLINE` | ✅ |
| 1.4 | Paziente | Inserisce dati | Form paziente + consensi | ✅ Email, phone |
| 1.5 | Sistema | Calcola prezzo | Listino teleconsulto | - |
| 1.6 | Paziente | Pagamento anticipato | Stripe/PayPal | ✅ Obbligatorio |
| 1.7 | Sistema | Crea appuntamento | `stato=PRENOTATO` | - |
| 1.8 | Sistema | Crea sessione teleconsulto | `roomId`, tokens | - |
| 1.9 | Sistema | Invia conferma | Email + SMS con link | - |

### 4.2 Pre-Sessione

| Step | Attore | Azione | Timing |
|------|--------|--------|--------|
| 2.1 | Sistema | Reminder 24h | -24h |
| 2.2 | Sistema | Reminder 1h con link | -1h |
| 2.3 | Sistema | Reminder 15min | -15min |
| 2.4 | Paziente | Test connessione (opzionale) | Anytime pre-sessione |
| 2.5 | Medico | Revisione cartella paziente | -15min consigliato |

### 4.3 Ingresso Sessione

| Step | Attore | Azione | Note |
|------|--------|--------|------|
| 3.1 | Paziente | Click link accesso | Token JWT valido 2h |
| 3.2 | Sistema | Verifica consensi | Mostra form se mancanti |
| 3.3 | Paziente | Entra in waiting room | `stato=IN_ATTESA_MEDICO` |
| 3.4 | Medico | Entra in stanza | Dashboard → "Avvia sessione" |
| 3.5 | Medico | Ammette paziente | Button "Ammetti" |
| 3.6 | Sistema | Connessione P2P | WebRTC via Jitsi/Twilio |

### 4.4 Durante Sessione

| Funzionalità | Paziente | Medico |
|--------------|----------|--------|
| Video | ✅ On/Off | ✅ On/Off |
| Audio | ✅ On/Off | ✅ On/Off |
| Chat | ✅ Invia/ricevi | ✅ Invia/ricevi |
| Condividi documento | ✅ Upload | ✅ Upload |
| Screen share | ❌ | ✅ Condividi schermo |
| Visualizza cartella | ❌ | ✅ Full access |
| Termina sessione | ❌ (solo abbandona) | ✅ |

### 4.5 Chiusura

| Step | Attore | Azione |
|------|--------|--------|
| 5.1 | Medico | Click "Termina sessione" |
| 5.2 | Sistema | Mostra popup rating (paziente) |
| 5.3 | Sistema | Redirect medico a referto |
| 5.4 | Medico | Compila referto teleconsulto |
| 5.5 | Medico | Firma digitale |
| 5.6 | Sistema | Genera PDF |
| 5.7 | Sistema | Invia a paziente (email + portale) |

---

## 5. GESTIONE ERRORI

### 5.1 Problemi Connessione

| Scenario | Azione Sistema | Azione Utente |
|----------|----------------|---------------|
| Paziente perde connessione | Notifica medico, timer 5min | Auto-reconnect |
| Medico perde connessione | Notifica paziente, timer 5min | Auto-reconnect |
| Timeout 5min paziente | `stato=NO_SHOW_PAZIENTE` | - |
| Timeout 5min medico | `stato=NO_SHOW_MEDICO`, alert admin | - |
| Problemi audio/video | Suggerisci switch a chat | Toggle device |

### 5.2 Cancellazioni

| Timing | Regola |
|--------|--------|
| > 24h prima | Rimborso completo |
| 12-24h prima | Rimborso 50% |
| < 12h prima | No rimborso |
| No-show paziente | No rimborso + flag |
| No-show medico | Rimborso completo + scuse |

---

## 6. REQUISITI TECNICI

### 6.1 Browser Supportati

| Browser | Versione Minima | Note |
|---------|-----------------|------|
| Chrome | 72+ | ✅ Consigliato |
| Firefox | 66+ | ✅ |
| Safari | 12.1+ | ⚠️ Richiede HTTPS |
| Edge | 79+ | ✅ |
| Mobile Chrome | 72+ | ✅ |
| Mobile Safari | 12.1+ | ⚠️ iOS 12.1+ |

### 6.2 Requisiti Rete

| Parametro | Minimo | Consigliato |
|-----------|--------|-------------|
| Download | 1 Mbps | 5 Mbps |
| Upload | 1 Mbps | 3 Mbps |
| Latency | < 300ms | < 100ms |
| Packet loss | < 5% | < 1% |

### 6.3 Permessi Richiesti

- Camera (obbligatorio)
- Microfono (obbligatorio)
- Notifiche (opzionale, consigliato)

---

## 7. METRICHE DA TRACCIARE

| Metrica | Calcolo | Target |
|---------|---------|--------|
| Tasso completamento | Completate / Prenotate | > 95% |
| Durata media | Media(oraFine - oraInizio) | ~durata_prevista |
| Rating medio | Media(qualityScore) | > 4.0/5 |
| Tempo attesa medio | Media(oraIngresso - scheduledStart) | < 5 min |
| Problemi tecnici | count(stato=FALLITO) | < 2% |
| No-show paziente | count(NO_SHOW_PAZIENTE) / totale | < 5% |

---

## 8. COLLEGAMENTI

- **Specifica**: [SPEC_19_TELECONSULTO.md](../specs/SPEC_19_TELECONSULTO.md)
- **Workflow correlati**:
  - [WF_01_PRENOTAZIONE.md](./WF_01_PRENOTAZIONE.md) - Booking base
  - [WF_04_REFERTO.md](./WF_04_REFERTO.md) - Refertazione post-visita
- **Specifiche correlate**:
  - [SPEC_07_APPUNTAMENTI.md](../specs/SPEC_07_APPUNTAMENTI.md)
  - [SPEC_17_COMUNICAZIONI.md](../specs/SPEC_17_COMUNICAZIONI.md)

```
