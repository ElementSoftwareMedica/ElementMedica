# Common Issues and Troubleshooting Guide

**Versione:** 3.0 Post-Ottimizzazione Server  
**Data:** 27 Gennaio 2025  
**Sistema:** Architettura Ottimizzata GDPR-Compliant (Progetti 16-17)

## 📋 Panoramica

Questa guida fornisce soluzioni per i problemi più comuni che possono verificarsi nel Sistema Unificato Person con architettura a tre server. È organizzata per categoria e livello di gravità per facilitare la risoluzione rapida dei problemi.

## 🛠️ Problemi Risolti (Progetti 16-17)

### ✅ RISOLTO: Errore Login 401 (Progetto 17)
**Problema**: Login falliva con errore 401 Unauthorized
**Causa**: Bug nel middleware di performance dell'API Server
**Soluzione**: Ottimizzazione middleware e correzione timeout
**Prevenzione**: Test health check obbligatori post-modifica

### ✅ RISOLTO: Discrepanza Porte Server (Progetto 17)
**Problema**: Proxy configurato su porta 3000 invece di 4003
**Causa**: Configurazione inconsistente tra file
**Soluzione**: Standardizzazione porte (API: 4001, Proxy: 4003)
**Prevenzione**: Validazione porte in project_rules.md

### ✅ RISOLTO: Body Parsing POST Requests (Sistema V38)
**Problema**: Body delle richieste POST non veniva processato correttamente
**Causa**: Body parser non applicati ai router versionati nell'API server
**Soluzione**: Body parser applicati direttamente a v1Router e v2Router
**Prevenzione**: Test login obbligatorio dopo modifiche routing

### ✅ RISOLTO: Sistema Routing Avanzato Implementato
**Problema**: Routing frammentato e non scalabile
**Causa**: Configurazioni sparse e duplicazioni
**Soluzione**: Sistema routing centralizzato con RouterMap unificata
**Caratteristiche**:
- Versioning API automatico (`/api/v1`, `/api/v2`)
- Legacy redirects trasparenti (`/login` → `/api/v1/auth/login`)
- Endpoint diagnostici (`/routes`, `/routes/health`, `/routes/stats`)
- Rate limiting dinamico per tipo endpoint
- CORS dinamico basato su pattern
- Logging unificato con Request ID tracking

### ✅ RISOLTO: CORS Duplicati (Progetto 16)
**Problema**: 6+ handler OPTIONS duplicati causavano conflitti
**Causa**: CORS configurato in multipli file
**Soluzione**: CORS centralizzato in `proxy/middleware/cors.js`
**Prevenzione**: Architettura modulare con middleware separati

### ✅ RISOLTO: Rate Limiting Inconsistente (Progetto 16)
**Problema**: Rate limiting non applicato uniformemente
**Causa**: Configurazioni sparse e non modulari
**Soluzione**: Rate limiting centralizzato con esenzioni configurabili
**Prevenzione**: Modulo `rateLimiting.js` con test automatici

## 🏗️ Architettura Sistema

```
Proxy Server (4003) → API Server (4001) → Database
                   → Documents Server (4002)
```

**Server Components:**
- **API Server (4001)**: Person CRUD, Auth, GDPR endpoints
- **Documents Server (4002)**: PDF generation, file storage
- **Proxy Server (4003)**: Load balancing, SSL, routing

## ⚠️ REGOLE CRITICHE

### 🚫 **SEVERAMENTE VIETATO SENZA AUTORIZZAZIONE ESPLICITA**
```bash
# ❌ DIVIETO ASSOLUTO - Mai eseguire senza autorizzazione del proprietario:
pm2 restart [any-process]
pm2 stop [any-process]
pm2 delete [any-process]
kill -9 [any-pid]
pkill [any-process]
sudo systemctl restart [any-service]
sudo systemctl stop [any-service]
sudo reboot
sudo shutdown
# ❌ Modificare configurazioni server senza autorizzazione
# ❌ Interrompere PostgreSQL, Nginx, Redis
```

### ✅ **COMANDI PERMESSI PER DIAGNOSTICA**
```bash
# ✅ SEMPRE PERMESSI - Monitoring e diagnostica:
pm2 status
pm2 logs [process-name]
pm2 monit
curl http://localhost:4001/health
curl http://localhost:4002/health
curl http://localhost:4003/health
ps aux | grep node
netstat -tlnp | grep -E ':(4001|4002|4003)'
top -n 1
df -h
free -m
```

### 🔑 **CREDENZIALI TEST OBBLIGATORIE**
```bash
# ✅ SEMPRE utilizzare queste credenziali per test:
# Email: admin@example.com
# Password: Admin123!
# DIVIETO ASSOLUTO di modificare senza autorizzazione
```

## 🚨 Problemi Critici

### Sistema Non Raggiungibile

#### Sintomi
- Impossibile accedere all'applicazione
- Timeout di connessione
- Errore 502/503/504
- Health checks falliscono

#### Diagnosi
```bash
# ✅ PERMESSO - Verifica status PM2
pm2 status
pm2 logs --lines 50

# ✅ PERMESSO - Health checks
curl -f http://localhost:4001/health || echo "API Server DOWN"
curl -f http://localhost:4002/health || echo "Documents Server DOWN"
curl -f http://localhost:4003/health || echo "Proxy Server DOWN"

# ✅ PERMESSO -# Verifica porte
netstat -tlnp | grep -E ':(4001|4002|4003|5432)' ✅ PERMESSO - System status
top -n 1 | head -20
df -h
free -m
```

#### Soluzioni

**🚨 IMPORTANTE: Non riavviare server senza autorizzazione!**

**1. Diagnostica Immediata**
```bash
# ✅ PERMESSO - Esegui diagnostic script
./scripts/health-check.sh
./scripts/full-diagnostic.sh

# ✅ PERMESSO - Verifica logs
pm2 logs api-server --lines 100
pm2 logs documents-server --lines 100
pm2 logs proxy-server --lines 100
```

**2. Escalation Procedure**
```bash
# Se server down, ESCALARE IMMEDIATAMENTE:
echo "$(date): Server down - $(pm2 status)" >> /var/log/incidents.log

# Contattare Tech Lead con:
# - Output di pm2 status
# - Health check results
# - Error logs
```

### JWT secrets mancanti o non configurati (API Server)

#### Sintomi
- Login fallisce con 500 Internal Server Error
- Log API: "JWT_SECRET is not configured" o "JWT_REFRESH_SECRET is not configured"
- Endpoint /api/v1/auth/login risponde 500/401 in base al flusso

#### Diagnosi
```bash
# ✅ PERMESSO - Verifica variabili ambiente sul server API
printenv | grep -E "^JWT_(SECRET|REFRESH_SECRET|EXPIRES_IN|REFRESH_EXPIRES_IN)"

# ✅ PERMESSO - Verifica log specifici
pm2 logs api-server --lines 200 | grep -i JWT
```

#### Soluzione
- Impostare SEMPRE entrambe le variabili su API Server: JWT_SECRET e JWT_REFRESH_SECRET (nessun fallback)
- Verificare anche le scadenze: JWT_EXPIRES_IN (es. 15m), JWT_REFRESH_EXPIRES_IN (es. 7d)
- Il Proxy NON firma né valida token: non richiede variabili JWT
- Dopo l'aggiornamento delle env, ATTENDERE conferma del Tech Lead prima di qualsiasi riavvio

**2. Escalation Procedure**
```bash
# Se server down, ESCALARE IMMEDIATAMENTE:
echo "$(date): Server down - $(pm2 status)" >> /var/log/incidents.log

# Contattare Tech Lead con:
# - Output di pm2 status
# - Health check results
# - Error logs
# - Error logs
```

**3. Temporary Workarounds (Solo se autorizzati)**
```bash
# ✅ PERMESSO - Attivare maintenance mode
./scripts/maintenance-mode.sh enable

# ✅ PERMESSO - Verifica spazio disco
df -h
du -sh /var/log/* | sort -hr | head -10
```

### Database Non Disponibile

#### Sintomi
- Errori di connessione database
- Timeout query
- API Server non risponde
- Errori Prisma connection

#### Diagnosi
```bash
# ✅ PERMESSO - Test connessione database
psql -h localhost -U postgres -d person_system -c "SELECT 1;"

# ✅ PERMESSO - Verifica tabelle Person
psql -d person_system -c "SELECT count(*) FROM \"Person\" WHERE \"deletedAt\" IS NULL;"

# ✅ PERMESSO - Connessioni attive
psql -d person_system -c "SELECT count(*) FROM pg_stat_activity WHERE datname='person_system';"

# ✅ PERMESSO - Verifica performance
psql -d person_system -c "SELECT query, calls, total_exec_time FROM pg_stat_statements ORDER BY total_exec_time DESC LIMIT 5;"

# ✅ NUOVO - Test health check ottimizzato (Progetto 17)
curl -f http://localhost:4003/healthz || echo "Proxy Server DOWN"
curl -f http://localhost:4001/health || echo "API Server DOWN"

# ✅ NUOVO - Test sistema routing avanzato
curl -f http://localhost:4003/routes/health || echo "Routing System DOWN"
curl -f http://localhost:4003/routes/stats || echo "Routing Stats UNAVAILABLE"
```

## 🔄 Problemi Sistema Routing Avanzato

### Routing Non Funziona

#### Sintomi
- Route API non raggiungibili
- Errori 404 su endpoint esistenti
- Legacy redirects non funzionano
- Header `x-api-version` mancanti

#### Diagnosi
```bash
# ✅ PERMESSO - Verifica sistema routing
curl -f http://localhost:4003/routes || echo "Diagnostic endpoint DOWN"

# ✅ PERMESSO - Test versioning API
curl -H "x-api-version: v1" http://localhost:4003/api/v1/health
curl -H "x-api-version: v2" http://localhost:4003/api/v2/health

# ✅ PERMESSO - Test legacy redirects
curl -I http://localhost:4003/login
curl -I http://localhost:4003/logout

# ✅ PERMESSO - Verifica RouterMap
curl http://localhost:4003/routes/config | jq '.routerMap'
```

#### Soluzioni
```bash
# ✅ PERMESSO - Verifica configurazione RouterMap
curl http://localhost:4003/routes/config | jq '.services'

# ✅ PERMESSO - Test specifico route
curl -v http://localhost:4003/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin@example.com","password":"Admin123!"}'

# ✅ PERMESSO - Verifica middleware stack
pm2 logs proxy-server | grep -E "(MIDDLEWARE|ROUTING|VERSION)"
```

### Body Parsing Issues

#### Sintomi
- Errori 400 Bad Request su POST
- Body vuoto nell'API server
- Login fallisce con credenziali corrette

#### Diagnosi
```bash
# ✅ PERMESSO - Test body parsing
curl -X POST http://localhost:4003/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin@example.com","password":"Admin123!"}' \
  -v

# ✅ PERMESSO - Verifica logs body parsing
pm2 logs proxy-server | grep -E "(BODY|PARSER|V38)"
pm2 logs api-server | grep -E "(BODY|REQUEST|LOGIN)"
```

#### Soluzioni
```bash
# ✅ PERMESSO - Verifica Sistema V38 attivo
pm2 logs api-server | grep "Body parser applied to versioned routers"

# Se Sistema V38 non attivo, escalare immediatamente
echo "$(date): Body parsing issue - Sistema V38 not active" >> /var/log/incidents.log
```

### Rate Limiting Issues

#### Sintomi
- Errori 429 Too Many Requests
- Rate limiting non applicato
- Esenzioni non funzionano

#### Diagnosi
```bash
# ✅ PERMESSO - Verifica rate limiting
curl -I http://localhost:4003/api/v1/auth/login
curl -I http://localhost:4003/routes/health  # Dovrebbe essere esente

# ✅ PERMESSO - Test rate limiting dinamico
for i in {1..6}; do
  curl -I http://localhost:4003/api/v1/auth/login
  echo "Request $i"
done
```

### CORS Issues

#### Sintomi
- Errori CORS nel browser
- Preflight OPTIONS falliscono
- Headers CORS mancanti

#### Diagnosi
```bash
# ✅ PERMESSO - Test CORS
curl -X OPTIONS http://localhost:4003/api/v1/auth/login \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: POST" \
  -v

# ✅ PERMESSO - Verifica configurazione CORS
curl http://localhost:4003/routes/config | jq '.cors'
```

## 🔄 UI routing mostra JSON su reload di pagine SPA (es. /courses)

### Sintomi
- Visitando http://localhost:5173/courses l'UI appare correttamente, ma ricaricando (F5) viene visualizzato JSON invece della pagina React.

### Causa
- Un proxy Vite generico su `/courses` intercettava la richiesta di pagina e la inoltrava al Proxy Server (4003), che rispondeva con l'endpoint API `/courses` in JSON. La rotta SPA doveva invece essere gestita dal dev server per servire `index.html`.

### Soluzione
- Limitare il proxy Vite ai soli endpoint API necessari e NON proxare le rotte SPA. In particolare:
  - Rimuovere il proxy generico `'/courses'`.
  - Mantenere solo l'endpoint specifico `'/courses/bulk-import'` se necessario per compatibilità locale.

### Verifica
- Avviare il dev server e ricaricare `http://localhost:5173/courses`: deve essere servita la UI (content-type `text/html`) e non JSON.
- Le chiamate API a `/courses` lato frontend sono comunque normalizzate dal layer `src/services/api.ts` a `/api/v1/...`, quindi non richiedono proxy dedicati.

### Note
- Le porte fisse restano: frontend 5173, proxy 4003, API 4001. Nessun cambio di porte.
- Non creare bypass: seguire sempre il versioning API e la normalizzazione centralizzata nel layer API.


## ⚠️ React Warning: Maximum update depth exceeded (Frontend)

### Sintomi
- Console browser mostra: "Warning: Maximum update depth exceeded" in componenti come ImportModal.
- L’interfaccia si blocca o va in loop durante l’anteprima/import CSV.

### Causa
- Un useEffect chiama setState e nella dependency array è presente una funzione/prop che cambia identità ad ogni render (es. funzione di validazione passata dal parent). Questo provoca l’esecuzione continua dell’effetto e quindi un loop.

### Soluzione
- Memoizzare le funzioni passate come prop a componenti che le usano dentro useEffect, usando useCallback con un set di dipendenze minimo e stabile.
- Evitare catene circolari: non aggiornare, nello stesso effetto, stato che a sua volta cambia le dipendenze dell’effetto.

### Applicazione nel progetto
- La funzione di validazione righe è stata resa stabile con useCallback nel componente generico di importazione.
  - File: <mcfile name="GenericImport.tsx" path="/Users/matteo.michielon/project 2.0/src/components/shared/GenericImport.tsx"></mcfile>
  - Simbolo: <mcsymbol name="validateRows" filename="GenericImport.tsx" path="/Users/matteo.michielon/project 2.0/src/components/shared/GenericImport.tsx" startline="449" type="function"></mcsymbol>
- L’effetto che reagisce a validateRows e initialPreviewData nel modale ora non viene più triggerato all’infinito.
  - File: <mcfile name="ImportModal.tsx" path="/Users/matteo.michielon/project 2.0/src/components/shared/modals/ImportModal.tsx"></mcfile>

### Checklist di verifica
- Apri la pagina Corsi e il modale “Importa Corsi”.
- Carica un CSV di test valido e verifica che:
  - non compaia più il warning in console;
  - la selezione automatica esclude le righe con errori;
  - i pulsanti Seleziona/Deseleziona tutto funzionino senza loop.
- Procedi con l’import parziale e verifica che gli endpoint siano chiamati tramite il proxy (porta 4003) e versioning API v1.

### Prevenzione
- Quando si passano callback a componenti che usano useEffect, avvolgerle sempre in useCallback;
- Preferire dipendenze primitive/stabili nelle dependency array; estrarre logiche in useMemo/useCallback dove necessario.


# Troubleshooting - Issues Comuni

## 📚 Import Corsi da CSV — Errori nonostante template corretto

Sintomi
- Errore in fase di import dai Corsi anche usando il template scaricato dalla webapp
- Messaggi generici di fallimento o validazioni che segnalano campi mancanti

Cause note
- Mismatch tra intestazioni del template e mappatura lato import (csvHeaderMap)
- Formati numerici non normalizzati (virgola/punto decimale)
- File salvato con encoding non UTF-8 o delimitatore inconsistente

Soluzione (v4.0+)
- Allineata la mappatura csvHeaderMap agli header del template (es. "Titolo", "Livello Rischio", "Tipo Corso", "Durata (ore)", "Validità (anni)", "Durata rinnovo (ore)", "Prezzo per persona", "Max partecipanti", "Stato").
- Aggiunti alias comuni per robustezza (es. "Durata", "Validita (anni)", "Max persone").
- Normalizzazione numeri lato frontend: supporto sia virgola sia punto decimale; i valori sono convertiti in numero dove richiesto.

Checklist rapida
- Scarica il template aggiornato dalla pagina Corsi
- Compila almeno il campo obbligatorio: Titolo
- Salva in UTF-8 (con o senza BOM) e usa separatore ; o , (autodetect supportato)
- Evita colonne extra non previste; eventuali colonne non mappate vengono ignorate
- Riprova l’import: se persiste l’errore, controlla il toast/risposta e invia i dettagli

Note
- Il tenant viene determinato dalla sessione; eventuali colonne tenantId nel CSV sono ignorate dall’API
- I duplicati sul campo code sono rilevati e riportati nel riepilogo (payload e database)

## 🚨 500 su POST /courses/bulk-import

Sintomi
- Durante l’import corsi compare errore 500 nel browser.
- Console mostra richieste a http://localhost:5173/courses/bulk-import anziché al proxy 4003.

Cause probabili
- Tenant non disponibile nella sessione (req.user.tenantId nullo) oppure token scaduto → il middleware risponde 403/401 ma una catena di parsing o dedup genera 500.
- Dati non sanitizzati (NaN su campi numerici, enum non validi, code con spazi/case non normalizzato) che mandano in errore Prisma createMany.
- Proxy dev non instrada correttamente l’endpoint dedicato di bulk-import.

Diagnosi rapida
- Verifica autenticazione e tenant: accedi come admin e controlla che localStorage contenga tenantId (non "default-company").
- Usa Network tab:
  - L’URL deve essere /courses/bulk-import e lo status 201 o 4xx (non 5xx generici).
  - Controlla header inviati: Authorization: Bearer <token> e X-Tenant-ID valorizzato dal client quando presente.
- Verifica proxy Vite: controlla i log [VITE PROXY] in console del dev server; la request deve andare a target http://localhost:4003.

Soluzioni applicate
- Sanitizzazione robusta lato backend per i campi numerici/boolean/stringa ed enum con whitelist; normalizzazione `code` in uppercase; enforcement di `tenantId` dalla sessione utente.
- Proxy Vite limitato al solo endpoint `/courses/bulk-import` per evitare interferenze con il routing SPA.

Verifica finale
- Ripeti l’import con il template CSV: la risposta deve essere 201 con `report.duplicates` popolato e `created` >= 0; nessun 500.
- Se persiste 403/401, ri-autenticati; se manca il tenantId, verifica la configurazione multi-tenant e la rotta `/tenants/current`.

## 🧩 UI - ScheduleEventModal: Ricerca corsi e filtro formatori

### Sintomi
- Digitando nella searchbar non compaiono risultati coerenti o, dopo la selezione, il campo mantiene il testo cercato e non aggiorna lo stato del corso selezionato.
- Dopo la selezione del corso, l’elenco dei formatori non si filtra correttamente in base alle certificazioni richieste.

### Causa
- Comportamento della AsyncSelect non allineato: l’input non veniva ripulito dopo selezione/cancellazione, causando disallineamento tra inputValue e value.
- Filtro formatori basato su confronto sensibile a maiuscole/minuscole e senza gestione robusta delle varianti di corso (intersezione/unione certificazioni).

### Soluzione
- Ricerca corsi: pulizia esplicita dell’input della AsyncSelect dopo selezione o cancellazione del corso; normalizzazione dell’input e wiring coerente di onInputChange/onChange.
- Filtro formatori: normalizzazione case-insensitive delle certificazioni e applicazione di logica a doppio stadio:
  - Intersezione delle certificazioni quando disponibile su varianti coerenti del corso selezionato.
  - Fallback all’unione quando l’intersezione è vuota, per evitare sotto-filtri e lasciare scelta all’utente.

### Verifica rapida
1) Apri Schedules → Nuovo evento → Step 1.
2) Cerca un corso digitando almeno 2-3 caratteri, selezionalo: il campo si svuota e il corso selezionato appare correttamente, con eventuale auto-fill di rischio/tipo.
3) Apri la tendina Formatore: l’elenco risulta filtrato in base alle certificazioni richieste dal corso/variante.

### Note
- Nessun riavvio server richiesto; se il browser mantiene cache, effettuare un hard refresh della pagina.
- Rispettate le porte fisse: Frontend 5173, API 4001, Proxy 4003.