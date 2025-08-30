# 🧪 Guida Test Pratico - Users e Roles
**Data: 2025-01-27**
**Progetto 2.0 - Sistema GDPR Compliant**

## 🎯 Obiettivo
Guida step-by-step per testare tutte le funzionalità implementate nel sistema Users e Roles.

## 🔐 Accesso al Sistema

### 1. Accedi al Frontend
- **URL**: http://localhost:5173
- **Email**: admin@example.com
- **Password**: Admin123!

### 2. Naviga alle Impostazioni
- Clicca su "Impostazioni" nel menu principale
- Seleziona la tab "Users" o "Roles"

## 👥 Test Pagina Users

### ✅ Test 1: Verifica Ordinamento LastLogin
**Obiettivo**: Verificare che gli utenti siano ordinati per ultimo login (più recente prima)

**Passi**:
1. Vai alla pagina Users
2. Osserva l'ordine degli utenti nella lista
3. **Risultato Atteso**: 
   - Utenti con login recente mostrati per primi
   - Utenti senza login (nuovi) mostrati dopo
   - Ordinamento per data decrescente

### ✅ Test 2: Creazione Nuovo Utente
**Obiettivo**: Verificare generazione automatica username e password

**Passi**:
1. Clicca "Aggiungi Utente"
2. Compila il form:
   - **Nome**: Mario
   - **Cognome**: Rossi
   - **Email**: mario.rossi@test.com
   - **Ruolo**: EMPLOYEE
3. Clicca "Salva"
4. **Risultato Atteso**:
   - Username generato: "mario.rossi"
   - Password di default: "Password123!"
   - Messaggio di successo mostrato
   - Utente aggiunto alla lista

### ✅ Test 3: Gestione Omonimie
**Obiettivo**: Verificare contatore per username duplicati

**Passi**:
1. Crea un secondo utente "Mario Rossi":
   - **Nome**: Mario
   - **Cognome**: Rossi
   - **Email**: mario.rossi2@test.com
   - **Ruolo**: TRAINER
2. **Risultato Atteso**:
   - Username generato: "mario.rossi1"
   - Nessun conflitto con il primo utente

### ✅ Test 4: Modifica Utente
**Obiettivo**: Verificare funzionalità di modifica

**Passi**:
1. Clicca l'icona "Modifica" su un utente
2. Modifica alcuni campi
3. Clicca "Salva"
4. **Risultato Atteso**:
   - Modifiche salvate correttamente
   - Lista aggiornata
   - Messaggio di successo

### ✅ Test 5: Filtri e Ricerca
**Obiettivo**: Verificare funzionalità di filtro

**Passi**:
1. Usa la barra di ricerca per cercare "Mario"
2. Filtra per ruolo "EMPLOYEE"
3. Filtra per stato "Attivo"
4. **Risultato Atteso**:
   - Risultati filtrati correttamente
   - Contatori aggiornati
   - Paginazione funzionante

## 🔐 Test Pagina Roles

### ✅ Test 6: Layout Due Sezioni
**Obiettivo**: Verificare layout split screen

**Passi**:
1. Vai alla pagina Roles
2. Osserva il layout
3. **Risultato Atteso**:
   - Sezione sinistra: Lista ruoli (2/6 larghezza)
   - Sezione destra: Permessi granulari (4/6 larghezza)
   - Layout responsive

### ✅ Test 7: Gestione CRUD Ruoli
**Obiettivo**: Verificare creazione, modifica, eliminazione ruoli

**Passi**:
1. **Creazione**:
   - Clicca "Aggiungi Ruolo"
   - Nome: "FORMATORE_TEST"
   - Descrizione: "Ruolo di test per formatori"
   - Clicca "Salva"

2. **Modifica**:
   - Seleziona il ruolo creato
   - Clicca "Modifica"
   - Cambia la descrizione
   - Salva

3. **Eliminazione**:
   - Clicca "Elimina" sul ruolo
   - Conferma eliminazione

**Risultato Atteso**:
- Tutte le operazioni CRUD funzionanti
- Messaggi di conferma appropriati
- Lista aggiornata in tempo reale

### ✅ Test 8: Permessi Granulari
**Obiettivo**: Verificare gestione permessi dettagliata

**Passi**:
1. Seleziona un ruolo (es. "TRAINER")
2. Nella sezione destra, configura permessi:
   - **Corsi**: ✅ Lettura (Scope: "own")
   - **Dipendenti**: ✅ Lettura (Scope: "own")
   - **Aziende**: ✅ Lettura (Scope: "tenant")
   - **Sistema**: ❌ Nessun accesso
3. Clicca "Salva Permessi"

**Risultato Atteso**:
- Matrice permessi funzionante
- Scope selezionabili (all/own/tenant)
- Salvataggio persistente

### ✅ Test 9: Restrizioni Campo
**Obiettivo**: Verificare limitazioni accesso campi sensibili

**Passi**:
1. Seleziona ruolo "TRAINER"
2. Per l'entità "Dipendenti":
   - Abilita lettura
   - Scope: "own"
   - Restrizioni campo: Seleziona "residenceAddress"
3. Salva configurazione

**Risultato Atteso**:
- Restrizioni campo configurabili
- Campi sensibili nascosti per il ruolo
- Configurazione salvata

### ✅ Test 10: Selezione Tenant
**Obiettivo**: Verificare controllo accesso per tenant

**Passi**:
1. Configura permesso con scope "tenant"
2. Seleziona tenant specifici dalla lista
3. Salva configurazione

**Risultato Atteso**:
- Lista tenant caricata correttamente
- Selezione multipla funzionante
- Accesso limitato ai tenant selezionati

## 🔒 Test GDPR Compliance

### ✅ Test 11: Audit Trail
**Obiettivo**: Verificare tracciamento azioni

**Passi**:
1. Esegui alcune azioni (crea utente, modifica ruolo)
2. Controlla i log di sistema
3. **Risultato Atteso**:
   - Tutte le azioni tracciate
   - Timestamp e utente registrati
   - Dati sensibili protetti

### ✅ Test 12: Soft Delete
**Obiettivo**: Verificare eliminazione soft

**Passi**:
1. Elimina un utente
2. Verifica che non appaia più nella lista
3. Controlla database per campo `deletedAt`

**Risultato Atteso**:
- Utente nascosto dalla UI
- Record mantenuto nel database
- Campo `deletedAt` popolato

## 📊 Scenario Completo: Ruolo FORMATORE

### ✅ Test 13: Configurazione Formatore
**Obiettivo**: Implementare scenario richiesto

**Passi**:
1. Crea ruolo "FORMATORE"
2. Configura permessi:
   ```
   Corsi:
   - Lettura: ✅ (Scope: own)
   - Modifica: ✅ (Scope: own)
   
   Dipendenti:
   - Lettura: ✅ (Scope: own)
   - Restrizioni: residenceAddress, fiscalCode, iban
   
   Aziende:
   - Lettura: ✅ (Scope: tenant)
   
   Sistema:
   - Tutti: ❌
   ```
3. Assegna ruolo a un utente test
4. Testa accesso con quell'utente

**Risultato Atteso**:
- Formatore vede solo i suoi corsi
- Accesso limitato ai dati dipendenti
- Campi sensibili nascosti
- Nessun accesso amministrativo

## ✅ Checklist Finale

### Funzionalità Users
- [ ] Ordinamento per lastLogin funzionante
- [ ] Username automatico generato correttamente
- [ ] Password default "Password123!" assegnata
- [ ] Gestione omonimie con contatore
- [ ] CRUD completo operativo
- [ ] Filtri e ricerca funzionanti
- [ ] Paginazione corretta

### Funzionalità Roles
- [ ] Layout due sezioni responsive
- [ ] CRUD ruoli completo
- [ ] Permessi granulari configurabili
- [ ] Scope (all/own/tenant) selezionabili
- [ ] Restrizioni campo implementate
- [ ] Selezione tenant funzionante
- [ ] Salvataggio persistente

### GDPR Compliance
- [ ] Audit trail attivo
- [ ] Soft delete implementato
- [ ] Controlli privacy operativi
- [ ] Template GDPR utilizzato
- [ ] Consensi gestiti

### Performance
- [ ] Caricamento pagine < 2s
- [ ] Nessun errore JavaScript console
- [ ] Interfaccia responsive
- [ ] UX fluida e intuitiva

## 🎯 Risultati Attesi

### ✅ Sistema Completamente Funzionante
Se tutti i test passano, il sistema è:
- ✅ **Conforme ai requisiti** specificati
- ✅ **GDPR compliant** al 100%
- ✅ **Pronto per produzione**
- ✅ **Scalabile e manutenibile**

### 🚀 Pronto per Deployment
Il sistema può essere utilizzato immediatamente per:
- Gestione completa utenti
- Configurazione ruoli avanzati
- Controllo accessi granulari
- Conformità normative

---

**Guida creata**: 2025-01-27
**Sistema testato**: Users e Roles v2.0
**Status**: 🟢 **PRONTO PER TEST UTENTE**