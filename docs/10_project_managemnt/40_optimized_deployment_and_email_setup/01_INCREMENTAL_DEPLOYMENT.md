# 🚀 Sistema di Deployment Incrementale

**Versione**: 1.0  
**Data**: 10 Dicembre 2025

---

## 📋 Indice

1. [Architettura Deployment](#architettura-deployment)
2. [Script Disponibili](#script-disponibili)
3. [Workflow Consigliato](#workflow-consigliato)
4. [Comandi Rapidi](#comandi-rapidi)
5. [Best Practices](#best-practices)

---

## 🏗️ Architettura Deployment

### Struttura Server

```
Server: 128.140.15.15 (root)
│
├── /var/www/elementmedica/           # Frontend CRM
│   └── dist/                         # → elementformazione.com
│
├── /var/www/elementformazione/       # Backend + Uploads
│   ├── backend/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── middleware/
│   │   ├── config/
│   │   └── scripts/
│   └── uploads/
│
└── PM2 Services
    ├── api-server (4001)
    ├── documents-server (4002)
    └── proxy-server (4003)
```

### Tipi di Deployment

| Tipo | Quando Usarlo | Richiede Restart |
|------|---------------|------------------|
| **Frontend** | Modifiche React/UI | ❌ No |
| **Backend Route/Controller** | Logica API | ✅ Sì (api-server) |
| **Backend Service** | Business logic | ✅ Sì (api-server) |
| **Backend Script** | Script utility | ❌ No |
| **Configurazione** | .env, config | ✅ Sì (tutti) |
| **Prisma Schema** | Database schema | ✅ + Migration |

---

## 📜 Script Disponibili

### 1. `deploy-frontend.sh` - Deploy Frontend Veloce

```bash
#!/bin/bash
# Deploy solo frontend (post npm run build)

set -e

SSH_KEY="$HOME/.ssh/id_ed25519"
SERVER="root@128.140.15.15"
REMOTE_PATH="/var/www/elementmedica/dist"

echo "🚀 Deploying frontend..."

# Usa rsync per sync incrementale (solo file modificati)
rsync -avz --delete \
    --exclude '.DS_Store' \
    -e "ssh -i $SSH_KEY" \
    dist/ \
    $SERVER:$REMOTE_PATH/

echo "✅ Frontend deployed!"
echo "🌐 https://www.elementformazione.com"
```

### 2. `deploy-backend-file.sh` - Deploy Singolo File Backend

```bash
#!/bin/bash
# Deploy singolo file backend
# Uso: ./deploy-backend-file.sh routes/cms-routes.js

set -e

if [ -z "$1" ]; then
    echo "❌ Specificare il file da deployare"
    echo "Uso: $0 <percorso-relativo-da-backend>"
    echo "Esempio: $0 routes/cms-routes.js"
    exit 1
fi

FILE_PATH="$1"
SSH_KEY="$HOME/.ssh/id_ed25519"
SERVER="root@128.140.15.15"
REMOTE_BASE="/var/www/elementformazione/backend"

# Verifica che il file esista localmente
if [ ! -f "backend/$FILE_PATH" ]; then
    echo "❌ File non trovato: backend/$FILE_PATH"
    exit 1
fi

echo "📤 Uploading: backend/$FILE_PATH"

scp -i $SSH_KEY \
    "backend/$FILE_PATH" \
    "$SERVER:$REMOTE_BASE/$FILE_PATH"

echo "✅ File uploaded!"

# Determina se serve restart
NEEDS_RESTART=false
if [[ "$FILE_PATH" == routes/* ]] || \
   [[ "$FILE_PATH" == controllers/* ]] || \
   [[ "$FILE_PATH" == services/* ]] || \
   [[ "$FILE_PATH" == middleware/* ]]; then
    NEEDS_RESTART=true
fi

if [ "$NEEDS_RESTART" = true ]; then
    read -p "⚠️  Riavviare api-server? (y/N): " RESTART
    if [[ "$RESTART" =~ ^[Yy]$ ]]; then
        ssh -i $SSH_KEY $SERVER "pm2 restart api-server"
        echo "✅ api-server riavviato!"
    else
        echo "⚠️  Ricorda di riavviare api-server manualmente"
    fi
fi
```

### 3. `deploy-backend-folder.sh` - Deploy Cartella Backend

```bash
#!/bin/bash
# Deploy intera cartella backend (es. routes/)
# Uso: ./deploy-backend-folder.sh routes

set -e

if [ -z "$1" ]; then
    echo "❌ Specificare la cartella da deployare"
    echo "Uso: $0 <nome-cartella>"
    echo "Esempio: $0 routes"
    exit 1
fi

FOLDER="$1"
SSH_KEY="$HOME/.ssh/id_ed25519"
SERVER="root@128.140.15.15"
REMOTE_BASE="/var/www/elementformazione/backend"

if [ ! -d "backend/$FOLDER" ]; then
    echo "❌ Cartella non trovata: backend/$FOLDER"
    exit 1
fi

echo "📤 Syncing: backend/$FOLDER/"

rsync -avz --delete \
    --exclude 'node_modules' \
    --exclude '*.log' \
    -e "ssh -i $SSH_KEY" \
    "backend/$FOLDER/" \
    "$SERVER:$REMOTE_BASE/$FOLDER/"

echo "✅ Folder synced!"

read -p "⚠️  Riavviare api-server? (y/N): " RESTART
if [[ "$RESTART" =~ ^[Yy]$ ]]; then
    ssh -i $SSH_KEY $SERVER "pm2 restart api-server"
    echo "✅ api-server riavviato!"
fi
```

### 4. `check-diff.sh` - Verifica Differenze

```bash
#!/bin/bash
# Mostra differenze tra locale e server

SSH_KEY="$HOME/.ssh/id_ed25519"
SERVER="root@128.140.15.15"

echo "📊 Checking differences..."
echo ""

# Frontend diff
echo "=== FRONTEND (dist/) ==="
rsync -avzn --delete \
    -e "ssh -i $SSH_KEY" \
    dist/ \
    $SERVER:/var/www/elementmedica/dist/ 2>/dev/null | grep -v "^$" | head -20

echo ""
echo "=== BACKEND (routes/) ==="
rsync -avzn \
    -e "ssh -i $SSH_KEY" \
    backend/routes/ \
    $SERVER:/var/www/elementformazione/backend/routes/ 2>/dev/null | grep -v "^$" | head -20

echo ""
echo "💡 Usa -n per dry-run, rimuovilo per sync effettivo"
```

---

## 🔄 Workflow Consigliato

### Scenario 1: Modifica Solo Frontend (React/UI)

```bash
# 1. Sviluppo locale
npm run dev                           # Test su localhost:5173

# 2. Quando pronto, build
npm run build                         # Genera dist/

# 3. Deploy incrementale
./scripts/deploy-frontend.sh          # Solo file modificati!

# Tempo totale: ~20 secondi (vs 2+ minuti full deploy)
```

### Scenario 2: Modifica Singolo File Backend

```bash
# 1. Modifica il file (es. backend/routes/cms-routes.js)
code backend/routes/cms-routes.js

# 2. Deploy solo quel file
./scripts/deploy-backend-file.sh routes/cms-routes.js

# 3. Restart se necessario (lo script chiede)

# Tempo totale: ~5 secondi!
```

### Scenario 3: Modifica Backend Multipla (stessa cartella)

```bash
# 1. Modifica più file in una cartella
# backend/services/mediaService.js
# backend/services/cmsService.js

# 2. Sync intera cartella
./scripts/deploy-backend-folder.sh services

# 3. Restart
ssh root@128.140.15.15 "pm2 restart api-server"
```

### Scenario 4: Full Deploy (raro)

```bash
# Solo quando:
# - Prima installazione
# - Aggiornamento node_modules
# - Migrazione database

./scripts/deploy-production.sh
```

---

## ⚡ Comandi Rapidi (Alias)

Aggiungi al tuo `~/.zshrc`:

```bash
# ElementMedica Deploy Aliases
alias em-ssh="ssh -i ~/.ssh/id_ed25519 root@128.140.15.15"
alias em-logs="ssh -i ~/.ssh/id_ed25519 root@128.140.15.15 'pm2 logs --lines 50'"
alias em-status="ssh -i ~/.ssh/id_ed25519 root@128.140.15.15 'pm2 status'"
alias em-restart="ssh -i ~/.ssh/id_ed25519 root@128.140.15.15 'pm2 restart api-server'"

# Quick deploy functions
em-deploy-fe() {
    cd ~/project\ 2.0
    npm run build && ./scripts/deploy-frontend.sh
}

em-deploy-file() {
    cd ~/project\ 2.0
    ./scripts/deploy-backend-file.sh "$1"
}

em-deploy-folder() {
    cd ~/project\ 2.0  
    ./scripts/deploy-backend-folder.sh "$1"
}
```

Poi ricarica: `source ~/.zshrc`

---

## 📋 Matrice Decisionale

| Ho modificato... | Comando | Restart? |
|-----------------|---------|----------|
| Solo CSS/HTML/React | `em-deploy-fe` | ❌ |
| Un file route | `em-deploy-file routes/xyz.js` | ✅ api-server |
| Un controller | `em-deploy-file controllers/xyz.js` | ✅ api-server |
| Un service | `em-deploy-file services/xyz.js` | ✅ api-server |
| Script utility | `em-deploy-file scripts/xyz.js` | ❌ |
| Middleware | `em-deploy-file middleware/xyz.js` | ✅ api-server |
| Configurazione | Deploy + restart all | ✅ tutti |
| package.json | Full deploy | ✅ tutti |
| Prisma schema | Migration + deploy | ✅ tutti |

---

## 🛡️ Best Practices

### 1. Test Locale SEMPRE Prima

```bash
# Frontend
npm run dev
# Testa su http://localhost:5173

# Backend  
# Usa Postman/curl per testare API modificate
```

### 2. Usa Dry-Run per Verificare

```bash
# Vedi cosa verrà sincronizzato senza farlo
rsync -avzn --delete dist/ root@128.140.15.15:/var/www/elementmedica/dist/
```

### 3. Monitora i Log Post-Deploy

```bash
# Dopo deploy backend
em-logs  # o: ssh root@... "pm2 logs api-server --lines 30"
```

### 4. Health Check

```bash
curl -s https://www.elementformazione.com/api/v1/health | jq
```

### 5. Rollback Rapido

Se qualcosa va storto:

```bash
# I backup sono in /var/www/elementmedica/backups/
ssh root@128.140.15.15 "
  cd /var/www/elementmedica
  ls -la backups/frontend/
  # Restore: tar -xzf backups/frontend/dist_YYYYMMDD_HHMMSS.tar.gz
"
```

---

## 📊 Confronto Performance

| Metodo | Tempo | File Trasferiti |
|--------|-------|-----------------|
| Full deploy (scp -r) | 2-3 min | TUTTI (~500+ file) |
| rsync incrementale | 10-30 sec | Solo modificati (1-10 file) |
| Single file | 3-5 sec | 1 file |

**Risparmio**: 80-95% del tempo di deploy!

---

## 🔧 Troubleshooting

### SSH Key Non Funziona

```bash
# Aggiungi la key all'agent
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519
# Inserisci passphrase: Fulmicotone50!
```

### Permessi File

```bash
# Se rsync fallisce per permessi
ssh root@128.140.15.15 "chown -R root:root /var/www/elementformazione/backend"
```

### PM2 Non Risponde

```bash
ssh root@128.140.15.15 "pm2 kill && pm2 start ecosystem.config.js"
```

