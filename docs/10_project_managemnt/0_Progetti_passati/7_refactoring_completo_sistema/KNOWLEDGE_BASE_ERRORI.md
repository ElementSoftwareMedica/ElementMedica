# 🧠 KNOWLEDGE BASE ERRORI COMUNI

## 🎯 OBIETTIVO
Documentare errori ricorrenti identificati durante il refactoring completo del sistema per prevenire regressioni future.

---

## 🚨 ERRORI CRITICI RICORRENTI

### 1. 🗄️ Schema Mismatch (ALTA FREQUENZA)

#### **Pattern di Errore**
Codice backend usa campi che non esistono nello schema Prisma o usa nomi di campo obsoleti.

#### **Esempi Risolti**
- ❌ `userAgent` vs ✅ `deviceInfo.userAgent` (RefreshToken)
- ❌ `deleted_at` vs ✅ `deletedAt` (standardizzazione soft delete)
- ❌ `eliminato` vs ✅ `deletedAt` (migrazione completata)
- ❌ `sessions` vs ✅ `schedules` (Course relations)
- ❌ `isDeleted` vs ✅ `deletedAt` (standardizzazione completata)

#### **Prevenzione**
1. ⚠️ **SEMPRE verificare schema Prisma prima di implementare**
2. 🔍 Usare `npx prisma generate` per aggiornare client
3. 📋 Consultare documentazione schema aggiornata
4. 🧪 Testare query su database di sviluppo

---

### 2. 🔗 API Contract Mismatch (MEDIA FREQUENZA)

#### **Pattern di Errore**
Frontend chiama endpoint con parametri non supportati dal backend o struttura dati non allineata.

#### **Esempi Risolti**
- ❌ Frontend richiede `sessions` ma backend fornisce `schedules`
- ❌ Parametri di filtro non implementati nel backend
- ❌ Struttura response diversa da quella attesa

#### **Prevenzione**
1. 📄 Mantenere documentazione API aggiornata
2. 🔄 Sincronizzare contratti API tra frontend e backend
3. 🧪 Test di integrazione per verificare compatibilità
4. 📋 Versionamento API per gestire breaking changes

---

### 3. 🔐 Autenticazione e Token Management (MEDIA FREQUENZA)

#### **Pattern di Errore**
Problemi con salvataggio, validazione e refresh dei token JWT.

#### **Esempi Risolti**
- ❌ RefreshToken non salvato per struttura dati errata
- ❌ Token validation fallisce per middleware non configurato
- ❌ Timeout su operazioni database per query non ottimizzate

#### **Prevenzione**
1. 🔍 Verificare struttura dati prima del salvataggio
2. 🧪 Test specifici per flusso autenticazione completo
3. ⚡ Ottimizzare query database per performance
4. 📊 Monitoring e logging dettagliato per debug

---

### 4. 🗂️ File e Directory Management (BASSA FREQUENZA)

#### **Pattern di Errore**
Accumulo di file test duplicati, documentazione obsoleta, codice morto.

#### **Esempi Risolti**
- ❌ 112 file test duplicati eliminati
- ❌ Planning sistematici multipli consolidati
- ❌ Documentazione frammentata unificata

#### **Prevenzione**
1. 🧹 Pulizia periodica file temporanei e test debug
2. 📋 Convenzioni naming per file test
3. 📁 Organizzazione strutturata directory `/tests/`
4. 🔄 Review periodiche per identificare codice obsoleto

---

## 🛠️ BEST PRACTICES IDENTIFICATE

### ✅ Sviluppo
1. **Schema First**: Sempre partire dallo schema Prisma
2. **Test Driven**: Scrivere test prima dell'implementazione
3. **Documentation**: Mantenere documentazione API aggiornata
4. **Incremental**: Implementare cambiamenti incrementali

### ✅ Database
1. **Soft Delete Standard**: Usare solo `deletedAt` (no `isDeleted`)
2. **Migration Scripts**: Sempre creare script di migrazione
3. **Backup**: Backup prima di modifiche strutturali
4. **Performance**: Ottimizzare query per evitare timeout

### ✅ Testing
1. **Organized**: Test strutturati in directory `/tests/`
2. **Naming**: Convenzioni chiare per nomi file test
3. **Cleanup**: Eliminare test debug temporanei
4. **Coverage**: Coprire flussi critici (auth, CRUD, permissions)

### ✅ Documentazione
1. **Centralized**: Documentazione centralizzata e organizzata
2. **Updated**: Aggiornare documentazione con ogni modifica
3. **Versioned**: Versionare documentazione API
4. **Accessible**: Documentazione facilmente accessibile al team

---

## 🔍 DEBUGGING CHECKLIST

### Quando si verifica un errore:

#### 1. 🗄️ Verificare Schema
- [ ] Campo esiste nello schema Prisma?
- [ ] Nome campo è corretto?
- [ ] Relazione è definita correttamente?
- [ ] Client Prisma è aggiornato?

#### 2. 🔗 Verificare API Contract
- [ ] Endpoint implementato nel backend?
- [ ] Parametri richiesti supportati?
- [ ] Struttura response corretta?
- [ ] Documentazione API aggiornata?

#### 3. 🔐 Verificare Autenticazione
- [ ] Token valido e non scaduto?
- [ ] Middleware autenticazione configurato?
- [ ] Permessi utente sufficienti?
- [ ] RefreshToken salvato correttamente?

#### 4. 📊 Verificare Performance
- [ ] Query database ottimizzate?
- [ ] Timeout configurati correttamente?
- [ ] Indici database presenti?
- [ ] Logging abilitato per debug?

---

## 📈 METRICHE DI SUCCESSO

### Prima del Refactoring
- 🚨 100+ file test duplicati
- 🚨 8 entità con doppio sistema soft delete
- 🚨 Documentazione frammentata
- 🚨 Errori ricorrenti non documentati

### Dopo il Refactoring
- ✅ Solo test strutturati in `/tests/`
- ✅ Sistema soft delete standardizzato
- ✅ Documentazione consolidata
- ✅ Knowledge base errori comuni

### Benefici Ottenuti
- 🎯 **Manutenibilità**: Codice più pulito e organizzato
- ⚡ **Performance**: Query ottimizzate e schema coerente
- 🧪 **Testing**: Test organizzati e funzionali
- 📚 **Documentazione**: Informazioni centralizzate e aggiornate
- 🔄 **Prevenzione**: Errori comuni documentati e prevenibili

---

## ⚠️ RACCOMANDAZIONI FUTURE

1. **Review Periodiche**: Pianificare review trimestrali del codice
2. **Monitoring**: Implementare monitoring proattivo per errori ricorrenti
3. **Training**: Formare il team sui pattern identificati
4. **Automation**: Automatizzare controlli per prevenire regressioni
5. **Documentation**: Mantenere questa knowledge base aggiornata