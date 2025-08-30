# 📋 Analisi File da Spostare dalla Directory Backend

**Data:** 25 Gennaio 2025  
**Obiettivo:** Identificare e catalogare tutti i file temporanei, di test e documenti che devono essere spostati dalla directory backend

## 🔍 File Identificati per lo Spostamento

### 📄 Documenti di Sintesi e Stato (DA SPOSTARE)
- `SINTESI_ERRORI_RISOLTI.md` → `/docs/10_project_managemnt/13_riordino_e_ottimizzazione_sistema/documenti_planning_root/`
- `STATO_SISTEMA_FINALE.md` → `/docs/10_project_managemnt/13_riordino_e_ottimizzazione_sistema/documenti_planning_root/`
- `docs/PERSON_MANAGEMENT.md` → `/docs/technical/api/`

### 🔧 Script di Gestione Utenti e Permessi (DA SPOSTARE)
- `add_admin_permissions.cjs` → `/docs/10_project_managemnt/13_riordino_e_ottimizzazione_sistema/script_test_root/`
- `check-admin-user.cjs` → `/docs/10_project_managemnt/13_riordino_e_ottimizzazione_sistema/script_test_root/`
- `check_admin_permissions.cjs` → `/docs/10_project_managemnt/13_riordino_e_ottimizzazione_sistema/script_test_root/`
- `check_users.js` → `/docs/10_project_managemnt/13_riordino_e_ottimizzazione_sistema/script_test_root/`
- `create-admin.js` → `/docs/10_project_managemnt/13_riordino_e_ottimizzazione_sistema/script_test_root/`
- `init-admin.js` → `/docs/10_project_managemnt/13_riordino_e_ottimizzazione_sistema/script_test_root/`
- `reset-admin-password.cjs` → `/docs/10_project_managemnt/13_riordino_e_ottimizzazione_sistema/script_test_root/`
- `setup-advanced-permissions.cjs` → `/docs/10_project_managemnt/13_riordino_e_ottimizzazione_sistema/script_test_root/`
- `setup-auth-system.js` → `/docs/10_project_managemnt/13_riordino_e_ottimizzazione_sistema/script_test_root/`
- `update-admin-password.cjs` → `/docs/10_project_managemnt/13_riordino_e_ottimizzazione_sistema/script_test_root/`

### 🧪 Script di Debug e Test (DA SPOSTARE)
- `debug-admin-permissions.cjs` → `/docs/10_project_managemnt/13_riordino_e_ottimizzazione_sistema/script_test_root/`
- `debug-jwt-token.cjs` → `/docs/10_project_managemnt/13_riordino_e_ottimizzazione_sistema/script_test_root/`
- `clearTrainers.js` → `/docs/10_project_managemnt/13_riordino_e_ottimizzazione_sistema/script_test_root/`

### 🗄️ File di Backup (DA SPOSTARE)
- `backup_pre_person_migration.sql` → `/docs/10_project_managemnt/7_refactoring_completo_sistema/backup/`
- `auth/middleware.js.backup` → `/docs/10_project_managemnt/13_riordino_e_ottimizzazione_sistema/backend_cleanup/backup/`
- `prisma/schema.prisma.backup` → `/docs/10_project_managemnt/13_riordino_e_ottimizzazione_sistema/backend_cleanup/backup/`

### 🔄 Script di Migrazione Temporanei (DA SPOSTARE)
- `migrate.js` → `/docs/10_project_managemnt/7_refactoring_completo_sistema/migrazioni/`

### 🌐 Server di Test/Proxy Temporanei (DA SPOSTARE)
- `minimal-proxy.js` → `/docs/10_project_managemnt/13_riordino_e_ottimizzazione_sistema/script_test_root/`
- `simple-proxy.js` → `/docs/10_project_managemnt/13_riordino_e_ottimizzazione_sistema/script_test_root/`

### 📁 Directory Generated (DA PULIRE)
- `generated/` → Verificare se necessaria, altrimenti eliminare

## ✅ File da Mantenere nella Directory Backend

### 🚀 Server Principali (MANTENERE)
- `api-server.js` ✅
- `documents-server.js` ✅
- `proxy-server.js` ✅
- `start-servers.sh` ✅

### ⚙️ Configurazione (MANTENERE)
- `.babelrc` ✅
- `.env.example` ✅
- `.env.test` ✅
- `.gitignore` ✅
- `jest.config.js` ✅
- `package.json` ✅
- `package-lock.json` ✅

### 📂 Directory Principali (MANTENERE)
- `auth/` ✅ (eccetto backup)
- `config/` ✅
- `controllers/` ✅
- `middleware/` ✅
- `migrations/` ✅
- `prisma/` ✅ (eccetto backup)
- `routes/` ✅
- `scripts/` ✅ (directory strutturale)
- `services/` ✅
- `src/` ✅
- `tests/` ✅ (directory strutturale)
- `uploads/` ✅
- `utils/` ✅

## 🎯 Piano di Azione

1. **Creare strutture di destinazione** nelle cartelle di project management
2. **Spostare file temporanei e di test** nelle cartelle appropriate
3. **Spostare documenti** nelle cartelle di documentazione
4. **Spostare backup** nelle cartelle di backup appropriate
5. **Pulire directory generated** se non necessaria
6. **Verificare funzionalità** dopo la pulizia
7. **Aggiornare documentazione** con la nuova struttura

## 📊 Statistiche

- **File da spostare:** ~25 file
- **Directory da pulire:** 1 (generated)
- **File da mantenere:** Tutti i file core del sistema
- **Impatto funzionalità:** Nessuno (solo riorganizzazione)

## ⚠️ Note Importanti

- **NON toccare i server principali** (api-server.js, documents-server.js, proxy-server.js)
- **NON modificare le directory core** (auth, config, controllers, etc.)
- **Mantenere tutti i file di configurazione** nella directory backend
- **Verificare che tutti i test passino** dopo la pulizia