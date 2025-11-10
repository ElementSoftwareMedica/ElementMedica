# Manuale Utente - Gestione Codici Sconto

## 📌 Panoramica

La funzionalità **Codici Sconto** permette di creare, gestire e monitorare promozioni applicabili ai preventivi di ElementMedica.

## 🎯 Obiettivi

- **Creare promozioni** con validità temporale
- **Tracciare utilizzi** con limiti configurabili
- **Applicare sconti** percentuali o assoluti
- **Monitorare statistiche** in tempo reale
- **Gestire visibilità** per aziende/persone specifiche

---

## 🚀 Quick Start

### Creare un Codice Sconto Base

1. **Accedi** al pannello amministrazione
2. Vai su **Marketing** > **Codici Sconto**
3. Clicca **[+ Nuovo Codice]**
4. Compila i campi obbligatori:
   - **Codice**: `PROMO2025` (univoco, 3-50 caratteri)
   - **Nome**: `Promozione Natale 2025`
   - **Tipo Sconto**: Seleziona `Percentuale` o `Valore Assoluto`
   - **Valore**: `20` (se percentuale) o `100.00` (se € assoluti)
   - **Data Inizio**: `01/01/2025`
   - **Data Fine**: `31/12/2025`
5. Clicca **[Salva]**

✅ **Risultato**: Il codice è subito attivo e applicabile

---

## 📋 Funzionalità Dettagliate

### 1. Campi del Codice Sconto

#### 🔴 Campi Obbligatori

| Campo | Descrizione | Esempio | Validazione |
|-------|-------------|---------|-------------|
| **Codice** | Identificatore univoco | `ESTATE50` | 3-50 char, alfanumerico + `-_` |
| **Nome** | Nome descrittivo | `Sconto Estate` | Max 200 caratteri |
| **Tipo Sconto** | Percentuale o Assoluto | `Percentuale` | Enum: `PERCENTUALE` \| `VALORE_ASSOLUTO` |
| **Valore** | Importo sconto | `20.00` | > 0, se % deve essere ≤ 100 |
| **Data Inizio** | Inizio validità | `01/06/2025 00:00` | Deve essere < Data Fine |
| **Data Fine** | Fine validità | `31/08/2025 23:59` | Deve essere > Data Inizio |
| **Attivo** | Stato on/off | ☑ Attivo | Checkbox |
| **Applicabile A** | Ambito | `Tutti` | Enum: `TUTTI` \| `AZIENDE_SPECIFICHE` \| ... |
| **Cumulabile** | Combina con altri | ☐ | Checkbox |

#### 🔵 Campi Opzionali

| Campo | Descrizione | Esempio | Quando Usare |
|-------|-------------|---------|--------------|
| **Descrizione** | Dettagli promo | `Sconto valido su tutti i corsi di sicurezza` | Per comunicazioni marketing |
| **Utilizzo Massimo** | Limite globale | `100` utilizzi | Promozioni limitate (es. Black Friday) |
| **Utilizzo Per Utente** | Limite per cliente | `1` | Codici "welcome" o "primo acquisto" |
| **Min Importo** | Soglia minima | `500.00` € | Incentivare acquisti maggiori |
| **Max Importo** | Cap sconto | `200.00` € | Limitare perdita su ordini grandi |
| **Applicabile Servizi** | Filtra servizi | `[CORSO, DVR]` | Promozioni mirate (es. solo corsi) |
| **Categorie Corso** | Filtra categorie | `[sicurezza-base]` | Ultra-specifico (raro) |

### 2. Tipi di Sconto

#### 📊 Sconto Percentuale

**Quando usare**: Promozioni generiche, % costante

**Esempio**:
```
Codice: SCONTO20
Tipo: PERCENTUALE
Valore: 20.00
```

**Calcolo**:
```
Preventivo: €1,000.00
Sconto 20%: €1,000 × 20% = €200.00
Imponibile: €800.00
IVA 22%: €176.00
Totale: €976.00
```

**Best Practice**:
- Usa valori "rotondi": 10%, 15%, 20%, 25%, 50%
- Evita decimali strani (es. 17.38%)
- Considera cap con `maxImporto` per ordini grandi

#### 💶 Sconto Valore Assoluto

**Quando usare**: Buoni regalo, cashback, premi fedeltà

**Esempio**:
```
Codice: BENVENUTO50
Tipo: VALORE_ASSOLUTO
Valore: 50.00
Min Importo: 200.00
```

**Calcolo**:
```
Preventivo: €500.00
Sconto fisso: €50.00
Imponibile: €450.00
IVA 22%: €99.00
Totale: €549.00
```

**Best Practice**:
- Imposta sempre `minImporto` per evitare perdite
- Usa valori "psicologici": €50, €100, €250
- Ideale per "welcome bonus" con `utilizzoPerUtente: 1`

### 3. Ambito Applicabilità

#### 🌍 TUTTI (Default)
- **Descrizione**: Chiunque può usare il codice
- **Quando**: Promozioni pubbliche, marketing generico
- **Esempio**: `NATALE2025` per tutti i clienti

#### 🏢 AZIENDE_SPECIFICHE
- **Descrizione**: Solo aziende selezionate
- **Quando**: Partnership B2B, clienti VIP
- **Setup**:
  1. Seleziona `Aziende Specifiche`
  2. Nella sezione **Aziende Autorizzate**, cerca e aggiungi aziende
  3. Salva
- **Esempio**: Sconto 15% per "Acme Corp" e "Beta Industries"

#### 👤 PERSONE_SPECIFICHE
- **Descrizione**: Solo persone selezionate
- **Quando**: Premi personali, referral
- **Setup**: Come aziende, ma seleziona singole persone
- **Esempio**: `REFERMARIOROSSI` per referral

#### 📚 CORSI_SPECIFICI
- **Descrizione**: Solo determinati corsi
- **Quando**: Promozione mirata (es. "50% su Corso Antincendio")
- **Setup**: Seleziona corsi dalla lista
- **Nota**: Richiede che preventivo abbia `corsoId` collegato

### 4. Utilizzo e Limiti

#### 📈 Contatori Automatici

Il sistema traccia automaticamente:
- **Utilizzo Corrente**: Quante volte è stato usato
- **Utilizzo Rimasti**: Se hai impostato `utilizzoMassimo`
- **Utilizzo %**: Percentuale esaurimento

**Visualizzazione**:
```
[PROMO2025] Utilizzo: 15/100 (15%) 
Rimasti: 85 utilizzi
```

#### 🚫 Blocco Automatico

Il codice viene automaticamente bloccato se:
- ❌ `dataFine` superata → **Scaduto**
- ❌ `utilizzoCorrente >= utilizzoMassimo` → **Esaurito**
- ❌ `attivo = false` → **Disabilitato**

**Messaggio errore applicazione**:
```
❌ Codice sconto scaduto (validità fino al 31/12/2024)
❌ Codice sconto esaurito (utilizzi: 100/100)
❌ Codice sconto non attivo
```

#### 🔄 Riattivazione

Per riattivare un codice:
1. **Scaduto**: Modifica `dataFine` con data futura
2. **Esaurito**: Aumenta `utilizzoMassimo` o rimuovi limite (null)
3. **Disabilitato**: Spunta checkbox `☑ Attivo`

### 5. Statistiche e Monitoraggio

#### 📊 Dashboard Codici Sconto

**Vista Lista**:
| Codice | Tipo | Valore | Stato | Utilizzi | Totale Scontato | Azioni |
|--------|------|--------|-------|----------|-----------------|--------|
| PROMO2025 | % | 20% | 🟢 Attivo | 15/100 | €3,450.00 | [👁️][✏️][🗑️] |
| ESTATE50 | € | €50 | 🔴 Scaduto | 42/∞ | €2,100.00 | [👁️][✏️] |
| VIP15 | % | 15% | 🟡 Esaurito | 50/50 | €8,750.00 | [👁️][✏️] |

**Filtri Disponibili**:
- **Stato**: Attivi | Scaduti | Esauriti | Disabilitati | Tutti
- **Tipo**: Percentuale | Valore Assoluto
- **Applicabilità**: Tutti | Aziende | Persone | Corsi
- **Ricerca**: Cerca per codice o nome

#### 🔍 Dettaglio Codice

Cliccando su [👁️ Visualizza], vedi:

**Sezione Info Generali**:
```
Codice: PROMO2025
Nome: Promozione Natale 2025
Descrizione: Sconto del 20% valido fino al 31/12/2025
Tipo: Percentuale (20%)
Periodo: 01/01/2025 - 31/12/2025
Stato: 🟢 Attivo
```

**Sezione Utilizzo**:
```
Utilizzi Totali: 15/100 (15%)
Utilizzi Rimasti: 85
Utilizzo Per Utente: 1 (max)
Totale Importo Scontato: €3,450.00
Sconto Medio: €230.00
```

**Sezione Regole**:
```
✅ Cumulabile: No
✅ Min Importo: €500.00
✅ Max Sconto (cap): €200.00
✅ Applicabile A: TUTTI
✅ Servizi: CORSO, DVR
```

**Sezione Preventivi Collegati** (Tab):
| # Preventivo | Cliente | Importo | Sconto | Data Applicazione |
|--------------|---------|---------|--------|-------------------|
| PREV-2025-0042 | Acme Corp | €1,000 | €200 | 05/11/2025 10:30 |
| PREV-2025-0038 | Beta Ind. | €1,500 | €200 | 03/11/2025 14:20 |
| ... | ... | ... | ... | ... |

---

## 🎓 Casi d'Uso Comuni

### Caso 1: Black Friday (Limitato nel Tempo)

**Obiettivo**: Sconto 30% per 48 ore, max 200 utilizzi

**Configurazione**:
```
Codice: BLACKFRIDAY2025
Nome: Black Friday 2025
Tipo: PERCENTUALE
Valore: 30.00
Data Inizio: 29/11/2025 00:00
Data Fine: 30/11/2025 23:59
Utilizzo Massimo: 200
Utilizzo Per Utente: 1
Cumulabile: No
Min Importo: null
Max Importo: null
Applicabile A: TUTTI
```

**Strategia Marketing**:
- Newsletter 2 giorni prima
- Banner sul sito
- Push notification alle 00:00
- Email reminder alle 18:00 del 30/11

### Caso 2: Codice Welcome per Nuovi Clienti

**Obiettivo**: €50 su primo acquisto >€200

**Configurazione**:
```
Codice: BENVENUTO50
Nome: Benvenuto - Primo Ordine
Tipo: VALORE_ASSOLUTO
Valore: 50.00
Data Inizio: 01/01/2025 00:00
Data Fine: 31/12/2025 23:59
Utilizzo Massimo: null (illimitato)
Utilizzo Per Utente: 1 (una volta a testa)
Cumulabile: No
Min Importo: 200.00
Applicabile A: TUTTI
```

**Automazione**:
- Email benvenuto post-registrazione
- Codice nel footer della mail
- Reminder dopo 7 giorni se non usato

### Caso 3: Partnership Aziendale Esclusiva

**Obiettivo**: 15% solo per "Acme Corp" e "Beta Industries"

**Configurazione**:
```
Codice: PARTNER15
Nome: Partnership Aziende Premium
Tipo: PERCENTUALE
Valore: 15.00
Data Inizio: 01/01/2025 00:00
Data Fine: 31/12/2025 23:59
Utilizzo Massimo: null
Utilizzo Per Utente: null
Cumulabile: No
Min Importo: 1000.00
Applicabile A: AZIENDE_SPECIFICHE
  Aziende:
    - Acme Corp S.r.l.
    - Beta Industries S.p.A.
```

**Comunicazione**:
- Email diretta al responsabile acquisti
- Contratto partnership allegato
- Report mensile utilizzi

### Caso 4: Promo Corso Sicurezza Estate

**Obiettivo**: 25% solo su corsi di sicurezza per 3 mesi

**Configurazione**:
```
Codice: SICUREZZAESTATE
Nome: Promo Estate Sicurezza
Tipo: PERCENTUALE
Valore: 25.00
Data Inizio: 01/06/2025 00:00
Data Fine: 31/08/2025 23:59
Utilizzo Massimo: null
Cumulabile: No
Min Importo: null
Max Importo: 300.00 (cap su ordini grandi)
Applicabile A: TUTTI
Applicabile Servizi: [CORSO]
Categorie Corso: [sicurezza-base, primo-soccorso, antincendio]
```

**Targeting**:
- Segmenta clienti che hanno già fatto corsi
- Email con scadenze corsi in vista
- Landing page dedicata

### Caso 5: Referral Program

**Obiettivo**: €100 sconto per chi porta nuovo cliente

**Setup**:
1. Crea codice unico per cliente referrer:
   ```
   Codice: REF-MARIOROSSI
   Nome: Referral Mario Rossi
   Tipo: VALORE_ASSOLUTO
   Valore: 100.00
   Utilizzo Massimo: 10 (max 10 amici)
   Utilizzo Per Utente: 1
   Min Importo: 500.00
   Applicabile A: PERSONE_SPECIFICHE
   ```

2. Cliente condivide codice con amici
3. Ad ogni utilizzo:
   - Amico ottiene €100 sconto
   - Sistema notifica referrer
   - A 5 utilizzi → Premio fedeltà referrer

---

## ⚠️ Errori Comuni e Soluzioni

### ❌ "Codice già esistente"

**Causa**: Codice duplicato nel sistema

**Soluzione**:
- Cambia il testo del codice
- Esempio: `PROMO2025` → `PROMO2025B`
- I codici devono essere **univoci** per tenant

### ❌ "Data fine deve essere successiva a data inizio"

**Causa**: Validazione temporale fallita

**Soluzione**:
```
❌ Sbagliato:
Data Inizio: 31/12/2025
Data Fine: 01/01/2025

✅ Corretto:
Data Inizio: 01/01/2025
Data Fine: 31/12/2025
```

### ❌ "Valore sconto deve essere maggiore di 0"

**Causa**: Valore negativo o zero

**Soluzione**:
- Percentuale: Valore tra 0.01 e 100.00
- Assoluto: Valore > 0 (es. 10.00, 50.00)

### ❌ "Importo minimo non raggiunto"

**Scenario**: Cliente applica codice a preventivo troppo basso

**Causa**: Preventivo €300, codice richiede min €500

**Messaggio**:
```
❌ Importo minimo non raggiunto.
   Importo preventivo: €300.00
   Importo minimo richiesto: €500.00
```

**Soluzione**: Cliente deve aggiungere servizi o scegliere altro codice

### ❌ "Codice non cumulabile con altri sconti"

**Scenario**: Preventivo ha già sconto applicato

**Causa**: Codice ha `cumulabile: false`

**Messaggio**:
```
❌ Questo codice non può essere combinato con altri sconti.
   Sconti già applicati:
   - PROMO10 (10%)
```

**Soluzioni**:
1. Rimuovi sconto esistente prima
2. Oppure usa codice cumulabile
3. Oppure modifica codice impostando `cumulabile: true`

---

## 🔐 Permessi e Ruoli RBAC

### Permessi Richiesti

| Azione | Permesso | Ruoli Tipici |
|--------|----------|--------------|
| **Visualizzare** codici | `codici_sconto_read` | Admin, Manager, Commerciale |
| **Creare** nuovo codice | `codici_sconto_create` | Admin, Manager Marketing |
| **Modificare** codice | `codici_sconto_update` | Admin, Manager Marketing |
| **Eliminare** codice | `codici_sconto_delete` | Solo Admin |
| **Applicare** a preventivo | `preventivi_update` | Admin, Commerciale |

### Setup Ruolo Commerciale

Per abilitare commerciali a gestire codici:
```sql
-- Via admin UI oppure SQL
INSERT INTO person_permissions (personId, permission)
VALUES 
  ('uuid-commerciale', 'codici_sconto_read'),
  ('uuid-commerciale', 'codici_sconto_create'),
  ('uuid-commerciale', 'preventivi_update');
```

---

## 📊 Best Practices

### ✅ DO - Buone Pratiche

1. **Codici Brevi e Memorabili**
   - ✅ `ESTATE50`, `NATALE2025`, `WELCOME10`
   - ❌ `PROMO-2025-NATALE-SCONTO-PERCENTUALE-20`

2. **Nomi Descrittivi**
   - ✅ "Promozione Black Friday 2025 - 30% su tutto"
   - ❌ "Promo 1"

3. **Descrizioni Complete**
   - Include: Validità, condizioni, servizi inclusi
   - Esempio: "Sconto del 20% valido su tutti i corsi di sicurezza acquistati entro il 31/12/2025. Non cumulabile."

4. **Imposta Limiti Intelligenti**
   - Usa `utilizzoMassimo` per promo limitate
   - Usa `minImporto` per proteggere margini
   - Usa `maxImporto` (cap) per ordini grandi

5. **Monitora Statistiche**
   - Controlla utilizzi settimanalmente
   - Analizza `totale scontato` vs budget
   - Disattiva codici poco performanti

6. **Testa Prima di Pubblicare**
   - Crea codice test
   - Applica a preventivo di prova
   - Verifica calcoli corretti
   - Poi disattiva e crea quello reale

### ❌ DON'T - Errori da Evitare

1. **Non Creare Codici Generici**
   - ❌ `SCONTO`, `PROMO`, `TEST`
   - Rischio confusione e uso improprio

2. **Non Dimenticare Data Fine**
   - Codici senza scadenza rimangono attivi per sempre
   - Rischio: Clienti usano vecchie promo

3. **Non Ignorare Min/Max Importo**
   - Senza `minImporto`: Perdita su ordini piccoli
   - Senza `maxImporto`: Perdita su ordini grandi

4. **Non Sovrapporre Promo**
   - Se hai `ESTATE20` e `PROMO20` attivi insieme → Confusione
   - Coordina periodi di validità

5. **Non Riutilizzare Codici**
   - Scaduto `NATALE2024`? Non riattivare per 2025
   - Crea nuovo `NATALE2025` per tracciabilità

6. **Non Dare Troppi Permessi**
   - Solo admin possono eliminare
   - Commerciali: solo read + apply

---

## 🛠️ Troubleshooting

### Problema: "Codice non funziona su preventivo"

**Checklist**:
- [ ] Codice è `attivo: true`?
- [ ] Data corrente è tra `dataInizio` e `dataFine`?
- [ ] Utilizzo non ha raggiunto `utilizzoMassimo`?
- [ ] Importo preventivo > `minImporto`?
- [ ] Cliente/Azienda è nei filtri (se `applicabileA` specifico)?
- [ ] Servizio preventivo è in `applicabileServizi`?
- [ ] No altri sconti se `cumulabile: false`?

### Problema: "Sconto calcolato sbagliato"

**Verifica**:
1. Tipo sconto: Percentuale o Assoluto?
2. Se percentuale:
   ```
   Sconto = prezzoTotale × (valore / 100)
   Se maxImporto definito: sconto = min(sconto, maxImporto)
   ```
3. Se assoluto:
   ```
   Sconto = valore
   ```

**Esempio Calcolo**:
```
Preventivo:
  prezzoTotale: €1,500.00
  speseAccessorie: €50.00
  subtotale: €1,550.00

Codice PROMO20 (20%, cap €200):
  Sconto teorico: €1,550 × 20% = €310.00
  Con cap: min(€310, €200) = €200.00  ← APPLICATO
  
  imponibile: €1,550 - €200 = €1,350.00
  IVA 22%: €1,350 × 0.22 = €297.00
  Totale finale: €1,647.00
```

### Problema: "Non riesco a eliminare codice"

**Causa**: Codice usato in preventivi esistenti

**Soluzione**: Soft delete (GDPR)
- Click [🗑️ Elimina]
- Conferma
- Codice non è eliminato fisicamente, ma:
  - `deletedAt` impostato a data corrente
  - Non appare più in lista
  - Preventivi collegati mantengono snapshot

**Ripristino**: Solo via SQL (contattare admin)

---

## 📞 Supporto

### Documentazione Aggiuntiva
- [API Reference](../../technical/api/README.md)
- [Testing Report](../../testing/FASE_6_TESTING_REPORT.md)
- [Piano Implementazione](../../10_project_managemnt/preventivi-e-codici-sconto/03_PIANO_IMPLEMENTAZIONE.md)

### Contatti
- **Support Email**: support@elementmedica.it
- **Ticket System**: https://support.elementmedica.it
- **Documentazione Online**: https://docs.elementmedica.it

---

**Versione**: 1.0.0  
**Ultimo Aggiornamento**: 9 Novembre 2025  
**Autori**: ElementMedica Dev Team  
**Stato**: ✅ Completo e Validato
