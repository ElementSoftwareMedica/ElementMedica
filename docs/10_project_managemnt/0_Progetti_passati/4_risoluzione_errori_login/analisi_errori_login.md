# Analisi e Risoluzione Errori Login

## Problema Identificato

### 1. Errore EADDRINUSE sulla porta 4001
```
Error: listen EADDRINUSE: address already in use 127.0.0.1:4001
```

### 2. Timeout di Login
```
Login error: AxiosError {message: 'timeout of 60000ms exceeded', name: 'AxiosError', code: 'ECONNABORTED'}
```

## Analisi dei File Server

### API Server (api-server.js)

**Configurazione Porta:**
- Porta configurata: 4001 (hardcoded)
- Host: 127.0.0.1
- Endpoint di test: `/test` e `/health`

**Caratteristiche principali:**
- Inizializzazione Prisma client
- Sistema di autenticazione
- Google API Service
- Redis (opzionale, attualmente disabilitato)
- Performance monitoring
- Gestione graceful shutdown per SIGTERM e SIGINT

**Endpoint di autenticazione:**
- `/api/auth/login` - Login utenti
- `/api/auth/logout` - Logout
- `/api/auth/refresh` - Refresh token
- `/api/auth/verify` - Verifica token

### Proxy Server (proxy-server.js)

**Configurazione Porta:**
- Porta configurata: 4003 (configurazione corretta)
- Host: 127.0.0.1
- Target API Server: http://127.0.0.1:4001

**Funzionalità principali:**
- Proxy middleware per rotte API
- Rate limiting
- CORS configuration
- Autenticazione middleware
- Load balancing
- Gestione errori globale

**Rotte gestite localmente:**
- `/courses` - Lista corsi con filtri aziendali
- `/schedules-with-attestati` - Programmazioni con attestati
- `/templates` - Gestione template documenti
- `/attestati` - Lista attestati aziendali

**Proxy configuration:**
- `/auth` → `/api/auth` (API Server)
- `/api` → API Server (con rate limiting)
- `/trainers` → API Server
- `/employees` → API Server
- `/generate` → Documents Server

## Causa del Problema

### 1. Conflitto di Porta
Il problema EADDRINUSE era causato da:
- Un processo `test-simple-server.js` (PID 97507) che occupava la porta 4001
- Tentativo di avvio simultaneo dell'api-server.js sulla stessa porta

### 2. Timeout di Login
Il timeout di login è causato da:
- **Configurazione porta errata**: Il proxy server è in esecuzione sulla porta 4003 invece della porta 8888 prevista
- **Timeout eccessivo**: Le richieste di login rimangono in attesa senza risposta
- **Possibile loop di richieste**: I log mostrano richieste HTTP ripetute ogni 30 secondi

## Soluzione Implementata

### 1. Risoluzione Conflitto Porta
```bash
# Identificazione processi sulla porta 4001
lsof -i :4001

# Terminazione processo conflittuale
kill -9 97507

# Verifica liberazione porta
lsof -i :4001
```

### 2. Verifica Stato Servizi
```bash
# Verifica API server attivo
ps -p 842
# Output: node api-server.js

# Verifica proxy server attivo  
ps -p 98397
# Output: node proxy-server.js
```

### 3. Identificazione Problema Critico ⚠️
- **Scoperta**: File `.env` completamente vuoto (solo commento)
- **Impatto**: Nessuna variabile d'ambiente configurata
- **Conseguenza**: Impossibilità di connessione al database e autenticazione

## Configurazione Corretta

### Architettura dei Servizi
```
Client → Proxy Server (4003) → API Server (4001)
                            → Documents Server (4002)
```

### Flusso di Autenticazione
1. Client invia richiesta login a `http://localhost:4003/auth/login`
2. Proxy server reindirizza a `http://127.0.0.1:4001/api/auth/login`
3. API server processa autenticazione
4. Risposta ritorna attraverso proxy al client

## Istruzioni Configurazione .env

### 1. Configurazione Immediata Richiesta

```bash
# Copiare il file di esempio
cp .env.example .env
```

### 2. Variabili Critiche da Configurare

```env
# Database (CRITICO)
DATABASE_URL="postgresql://username:password@localhost:5432/training_platform?schema=public"

# JWT Secrets (CRITICO)
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-change-in-production"

# Application
NODE_ENV=development
PORT=4001

# Session
SESSION_SECRET="your-super-secret-session-key-change-this-in-production"
```

### 3. Verifica Configurazione

```bash
# Verificare che le variabili siano caricate
node -e "require('dotenv').config(); console.log(process.env.DATABASE_URL ? 'DATABASE_URL configurata' : 'DATABASE_URL mancante');"
```

## Raccomandazioni

### 1. Gestione Porte
- Utilizzare variabili d'ambiente per configurazione porte
- Implementare controllo disponibilità porta prima dell'avvio
- Aggiungere logging dettagliato per conflitti di porta

### 2. Monitoring
- Implementare health check endpoints
- Aggiungere timeout configurabili
- Monitoraggio stato servizi dipendenti

### 3. Gestione Errori
- Migliorare gestione errori di connessione nel proxy
- Implementare retry logic per richieste fallite
- Aggiungere circuit breaker pattern

### 4. Configurazione Ambiente
```env
# .env file
API_PORT=4001
PROXY_PORT=8888
API_SERVER_URL=http://127.0.0.1:4001
DOCUMENTS_SERVER_URL=http://127.0.0.1:3001
```

## Stato Attuale

✅ **Risolto**: Conflitto porta 4001  
✅ **Attivo**: API Server (PID 842) sulla porta 4001  
✅ **Attivo**: Proxy Server (PID 98397) sulla porta 4003 (configurazione corretta)  
✅ **Identificato**: Causa principale timeout (file .env vuoto)
❌ **Timeout**: Login non funzionante - richieste rimangono in attesa  
🔄 **Da risolvere**: Configurazione .env e riavvio servizi

## Prossimi Passi

### Priorità CRITICA ⚠️
1. **Configurare file .env** (IMMEDIATO)
   - Copiare `.env.example` in `.env`
   - Configurare `DATABASE_URL` con credenziali corrette
   - Impostare `JWT_SECRET` e `JWT_REFRESH_SECRET`
   - Configurare altre variabili essenziali

### Priorità Alta
2. **Riavviare servizi dopo configurazione**
   - Riavviare API Server (porta 4001)
   - Riavviare Proxy Server (porta 4003)
   - Verificare connessione database

3. **Testare il flusso di login completo**
   - Verificare endpoint `/auth/login` su porta 4003
   - Controllare risposta e gestione errori
   - Validare generazione e gestione token JWT

4. **URGENTE**: Verificare configurazione proxy middleware
5. Test completo del flusso di login
6. Implementazione monitoring avanzato
7. Documentazione procedure di troubleshooting

## Problemi Identificati

### 1. Timeout Login ⚠️ **CRITICO**
- **Sintomo**: Timeout (`ECONNABORTED`) durante le richieste di login
- **Stato**: **CAUSA IDENTIFICATA**
- **Causa principale**: **File .env vuoto - mancano tutte le variabili d'ambiente**
  - DATABASE_URL non configurata
  - JWT_SECRET non configurata
  - Altre variabili critiche mancanti
- **Impatto**: L'applicazione non riesce a connettersi al database, causando timeout nelle operazioni di autenticazione

### 2. Possibili Cause Timeout
- Configurazione proxy middleware errata
- Problemi di routing tra proxy e API server
- Configurazione timeout insufficiente
- Possibili loop di richieste
- Problemi di autenticazione OAuth

### 3. Configurazione Corretta Porte
- **API Server**: 4001 ✅ (Funzionante)
- **Documents Server**: 4002 (da verificare)
- **Proxy Server**: 4003 ✅ (Configurazione corretta)