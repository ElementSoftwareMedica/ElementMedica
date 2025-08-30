# Planning Dettagliato: Risoluzione Errori 404 nel Routing

## 🎯 Obiettivo

Risolvere tutti gli errori 404 nel sistema di routing del proxy-server per ripristinare la piena funzionalità dell'applicazione.

## 📋 Fasi di Implementazione

### Fase 1: Analisi Stato Attuale (15 min)

#### 1.1 Verifica Server Attivi
- [ ] Controllare stato proxy-server (porta 4003)
- [ ] Verificare se API server è attivo (porta 4001)
- [ ] Verificare se documents server è attivo (porta 4002)

#### 1.2 Analisi Configurazione Proxy
- [ ] Esaminare proxy-server.js per route esistenti
- [ ] Identificare endpoint mancanti
- [ ] Verificare configurazione middleware

#### 1.3 Mappatura Endpoint Richiesti
- [ ] `/api/auth/*` - Autenticazione
- [ ] `/api/tenant/*` - Multi-tenancy
- [ ] `/trainers` - Gestione formatori
- [ ] `/api/employees/*` - Gestione dipendenti
- [ ] `/api/courses/*` - Gestione corsi
- [ ] Altri endpoint critici

### Fase 2: Avvio Server Mancanti (10 min)

#### 2.1 Verifica API Server
- [ ] Controllare se api-server.js esiste
- [ ] Avviare API server sulla porta 4001
- [ ] Verificare health check

#### 2.2 Verifica Documents Server
- [ ] Controllare stato documents-server
- [ ] Verificare funzionalità

### Fase 3: Configurazione Routing Proxy (20 min)

#### 3.1 Configurazione Base
- [ ] Aggiungere proxy middleware per `/api/*` → porta 4001
- [ ] Configurare routing per `/trainers` → porta 4001
- [ ] Aggiungere gestione errori appropriata

#### 3.2 Configurazione Avanzata
- [ ] Implementare routing condizionale
- [ ] Aggiungere logging per debug
- [ ] Configurare timeout appropriati

#### 3.3 Middleware Specifici
- [ ] Middleware autenticazione per route protette
- [ ] Middleware CORS per tutte le route
- [ ] Middleware rate limiting

### Fase 4: Test e Verifica (15 min)

#### 4.1 Test Endpoint Critici
- [ ] Test login: `POST /api/auth/login`
- [ ] Test tenant: `GET /api/tenant/current`
- [ ] Test trainers: `GET /trainers`
- [ ] Test health: `GET /health`

#### 4.2 Test Frontend
- [ ] Verificare login funzionante
- [ ] Controllare caricamento dashboard
- [ ] Testare navigazione tra pagine

#### 4.3 Test Integrazione
- [ ] Verificare flusso completo utente
- [ ] Controllare gestione errori
- [ ] Testare performance

### Fase 5: Documentazione e Cleanup (10 min)

#### 5.1 Aggiornamento Documentazione
- [ ] Documentare nuove route
- [ ] Aggiornare README
- [ ] Creare file IMPLEMENTAZIONE.md

#### 5.2 Cleanup
- [ ] Rimuovere log di debug temporanei
- [ ] Ottimizzare configurazione
- [ ] Verificare sicurezza

## 🛠️ Implementazione Tecnica

### Configurazione Proxy Target

```javascript
// Configurazione base per proxy-server.js
const { createProxyMiddleware } = require('http-proxy-middleware');

// Proxy per API Server
const apiProxy = createProxyMiddleware({
  target: 'http://localhost:4001',
  changeOrigin: true,
  pathRewrite: {
    '^/api': '/api'
  },
  onError: (err, req, res) => {
    logger.error('Proxy error:', err);
    res.status(500).json({ error: 'Errore del server proxy' });
  }
});

// Proxy per Trainers
const trainersProxy = createProxyMiddleware({
  target: 'http://localhost:4001',
  changeOrigin: true,
  pathRewrite: {
    '^/trainers': '/api/trainers'
  }
});
```

### Route da Implementare

1. **Route API Generiche**
   ```javascript
   app.use('/api', apiProxy);
   ```

2. **Route Specifiche**
   ```javascript
   app.use('/trainers', trainersProxy);
   app.use('/employees', employeesProxy);
   app.use('/courses', coursesProxy);
   ```

3. **Route Documenti**
   ```javascript
   app.use('/documents', documentsProxy);
   app.use('/templates', templatesProxy);
   ```

## ⚡ Comandi di Verifica

### Test Endpoint
```bash
# Test health
curl http://localhost:4003/health

# Test API
curl http://localhost:4003/api/tenant/current

# Test trainers
curl http://localhost:4003/trainers
```

### Verifica Server
```bash
# Verifica porte in uso
lsof -i :4001
lsof -i :4002
lsof -i :4003
```

## 🎯 Criteri di Successo

- [ ] Tutti gli endpoint restituiscono status 200 o appropriato
- [ ] Login funziona correttamente
- [ ] Dashboard carica tutti i dati
- [ ] Nessun errore 404 nei log del browser
- [ ] Performance accettabile (<2s per caricamento pagina)

## ⚠️ Rollback Plan

In caso di problemi:
1. Ripristinare versione precedente proxy-server.js
2. Riavviare tutti i server
3. Verificare funzionalità base
4. Analizzare log per identificare causa

## 📊 Timeline

- **Totale stimato**: 70 minuti
- **Fase critica**: Configurazione routing (20 min)
- **Milestone**: Primo endpoint funzionante (30 min)
- **Completamento**: Tutti i test passati (70 min)

## 🔧 Strumenti Necessari

- Editor di codice
- Terminal per comandi
- Browser per test frontend
- Postman/curl per test API
- Log viewer per debugging