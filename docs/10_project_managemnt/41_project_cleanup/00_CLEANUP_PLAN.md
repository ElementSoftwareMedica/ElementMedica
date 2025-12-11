# 🧹 Piano Pulizia e Consolidamento Progetto

**Data**: 11 Dicembre 2025  
**Versione**: 2.0  
**Stato**: ✅ COMPLETATO

---

## ✅ CLEANUP COMPLETATO!

**Commit**: `ccc72e9` - "chore: major project cleanup - remove 400+ obsolete files"  
**Tag Backup**: `pre-cleanup-2025-12-11` (per rollback se necessario)

### Statistiche Finali
| Metrica | Valore |
|---------|--------|
| **File eliminati** | 423 |
| **Build** | ✅ Passa (9.24s) |
| **TypeScript** | Errori pre-esistenti invariati |

### Operazioni Eseguite
- ✅ ROOT: Eliminati ~40 file temporanei (token.txt, cookies.txt, debug-*.html/js, etc.)
- ✅ Cartelle ROOT: Eliminati cleanup-temp/, temp/, backups/, logs/, playwright-report/, test-results/
- ✅ Backend: Eliminati 60+ script check-*, fix-*, verify-*, export-*
- ✅ Backend: Eliminati logs/, migration-backups/, temp/
- ✅ Backend/scripts: Eliminati versioned templates (v7-v17), archived/, test/, debug/
- ✅ Docs: Eliminati debug/, smoke/, proxy/, cleanup-temp/, elementmedica-2-0/

### Script Preservati (Essenziali)
- `seed-*.js` - Seeding produzione
- `init-base-data.js` - Inizializzazione dati base
- `create-default-*-template.js` - Creazione template default
- `verify-*.js` - Verifiche integrità
- `maintenance/`, `seeds/`, `setup/` - Cartelle utility

---

## 📋 Indice

1. [Panoramica Situazione Attuale](#1-panoramica-situazione-attuale)
2. [File da Eliminare](#2-file-da-eliminare)
3. [File da Consolidare](#3-file-da-consolidare)
4. [Struttura Target](#4-struttura-target)
5. [Checklist Esecuzione](#5-checklist-esecuzione)
6. [Log Operazioni](#6-log-operazioni)

---

## 1. Panoramica Situazione Attuale

### Problemi Identificati

| Categoria | Problema | Impatto |
|-----------|----------|---------|
| **ROOT** | 30+ file temporanei/test/debug | Confusione, disordine |
| **ROOT** | 10+ file .txt con token/log | Sicurezza, disordine |
| **ROOT** | 8+ file .md report obsoleti | Confusione |
| **Backend** | 80+ script di debug/fix/check | Difficile manutenzione |
| **Docs** | Documentazione duplicata | Incoerenza |
| **Backups** | Backup locali obsoleti | Spreco spazio |
| **Temp** | File temporanei non rimossi | Spreco spazio |

### Statistiche Pre-Pulizia

```
📁 File nella ROOT:          ~90 file
📁 Script debug backend:     ~80 file
📁 Documentazione:           ~150 file
📁 Backup locali:            ~15 cartelle/file
📁 File temporanei:          ~20 file
```

---

## 2. File da Eliminare

### 2.1 ROOT - File Temporanei e Debug (ALTA PRIORITÀ)

```bash
# File di debug/test da ELIMINARE
access_token.txt              # Token sensibile
backend_cookies.txt           # Cookie sensibile
cookies.txt                   # Cookie sensibile
fresh_token.txt               # Token sensibile
tenant_id.txt                 # Dato sensibile
token.txt                     # Token sensibile
login_response.json           # Response sensibile
tenants_response.json         # Response sensibile

# File di test temporanei
cms-debug.html
debug-script-fixed.js
debug-script.js
debug-token.html
force-logout.html
test-css-fix.html

# Script di test one-shot
test-counters-endpoint.js
test-css-fix.sh
test-login-verify-preventivi.sh
test-preventivi-endpoint.sh
test-production.sh
test-seed-cms.sh
test-templates-api.cjs
test-visite-page.sh
test-vite-proxy-verify.cjs
test_frontend_behavior.js
test_local_api.cjs
test_vite_proxy.js
show-visite-summary.sh
verify-visite-layout.sh

# Log e report di build
build-output.txt
eslint-errors.json
eslint-report.txt
eslint-schedules.txt
ts-errors-current.txt
ts-errors-post-gdpr.txt
ts-errors-session2.txt
ts-report.txt
ts_errors.txt
tsc-errors.log
tsc-errors.txt
tsc.out
tscheck.log
.trae_tscheck.out
backend-api.log
backend-import-fix.log
backend-restart.log
frontend-restart.log

# Report MD obsoleti
ADMIN_USER_CREATED.md
COMPLETE_FIX_REPORT.md
CORREZIONI_FINALI_ELEMENT_MEDICA.md
CRITICAL_FIXES_NEEDED.md
FIX_CSS_FINALE.md
MULTI_FRONTEND_STATUS.md
SEED_CMS_COMPLETO.md
VISITE_DESIGN_COMPLETO.md
VISITE_SPECIALISTICHE_COMPLETE.md
VISITE_SPECIALISTICHE_FIXED.md
prisma_index_improvement.md
```

### 2.2 Backend - Script Obsoleti (ALTA PRIORITÀ)

```bash
# Script di check one-shot (backend/)
check-actual-db-state.cjs
check-admin-tenant.js
check-cms-pages-status.cjs
check-markers.cjs
check-medicina-formazione.cjs
check-pdf-timestamp.cjs
check-preventivo-template.cjs
check-preventivo.cjs
check-template-css.cjs
check-template.js
check-template.mjs
check-templates.cjs
check-tenant.cjs
check_admin.mjs
check_admin_roles.js
check_admin_user.js
check_admin_user.mjs
check_certifications.mjs
check_employees.mjs
check_public_submissions.cjs
check_sites.mjs
check_submissions.cjs
check_tenant.mjs
check_tenants.sql
check_title.mjs
check_trainer_data.mjs
check_trainer_fields.mjs

# Script di fix one-shot (backend/)
fix-admin-complete.js
fix-admin-permissions-simple.js
fix-admin-permissions.js
fix-all-cms-colors.cjs
fix-all-cms-pages-final.cjs
fix-cms-colors-final.cjs
fix-comprehensive-colors.cjs
fix-default-template.mjs
fix-google-ids.mjs
fix-google-template-ids.js
fix-medicina-thoroughly.cjs
fix-real-contrast-issues.cjs
fix-remaining-issues.cjs
fix-template-css.cjs
fix-template-tenant.cjs
fix-visite-specialistiche-layout.cjs
force-db-refresh.cjs
force-reload-hierarchy.js

# Script di verifica one-shot (backend/)
verify-certificate-template.cjs
verify-cms-pages-final.cjs
verify-color-fixes.cjs
verify-persons-permissions.js
verify-preventivo-template.cjs
verify-template.mjs
verify-templates-per-tenant.cjs
verify-thead-css.cjs
verify-v5-tenant.cjs
verify-visite-layout.cjs
verify_db.mjs

# Script di export/insert one-shot (backend/)
export-cms-pages.cjs
export-element-medica-json.cjs
export-template.cjs
extract-full-sections.cjs
insert-preventivo-template-v2.cjs
insert-preventivo-template-v3.cjs
insert-preventivo-template-v4-elegante.cjs
insert-preventivo-template-v5-ultra-elegante.cjs
insert-preventivo-template.cjs
generate-element-medica-seed.cjs

# Altri script obsoleti (backend/)
activate_tenant.mjs
add-conditional-navigation-form.js
add-employee-permissions.js
add-missing-permissions.js
analyze-all-cms-pages.cjs
analyze-cms-sections.cjs
apply-v5-to-all-tenants.cjs
detailed-section-analysis.cjs
diagnose-attestato.cjs
diagnose-cms-colors.cjs
find-tbody-css.cjs
inspect-medicina-content.cjs
list-all-cms-pages.cjs
optimize-cms-balanced.cjs
show-actual-content.cjs
touch-cms-pages.cjs
update-preventivo-template.js
update_test_data.mjs

# File di output/temp (backend/)
-1
0
api-server.log
cms-pages-export.json
template-content.html
template-export.html
.tmp_cookies.txt
```

### 2.3 Cartelle da Eliminare

```bash
# Cartelle temporanee/backup locali
/cleanup-temp/                    # Vecchi file rimossi
/temp/                            # File temporanei
/backups/                         # Backup locali (sono su server)
/backend/backups/                 # Backup locali backend
/backend/migration-backups/       # Migration backup vecchi
/backend/temp/                    # Temp backend
/logs/                            # Log locali (sono su server)

# Cartelle di test/coverage
/playwright-report/               # Report playwright (rigenera)
/test-results/                    # Risultati test (rigenera)
/backend/coverage/                # Coverage (rigenera)
```

### 2.4 Documentazione da Archiviare

```bash
# In docs/10_project_managemnt/0_Progetti_passati/
# Già archiviati - OK

# Da spostare in archive
docs/10_project_managemnt/cleanup-temp/
docs/10_project_managemnt/debug/
docs/10_project_managemnt/smoke/
docs/10_project_managemnt/proxy/
docs/10_project_managemnt/elementmedica-2-0/
```

---

## 3. File da Consolidare

### 3.1 Documentazione Deployment

**CONSOLIDARE IN**: `docs/deployment/DEPLOYMENT_GUIDE_UNIFIED.md`

File da integrare e rimuovere:
- `docs/MULTI_FRONTEND_SETUP.md` → Sezione in UNIFIED
- `docs/technical/MULTI_FRONTEND_ARCHITECTURE.md` → Sezione in UNIFIED
- `docs/technical/MULTI_FRONTEND_DEPLOYMENT.md` → Sezione in UNIFIED
- `DEPLOYMENT_CHECKLIST.md` (root) → Sezione in UNIFIED

### 3.2 File .env

**MANTENERE**:
- `.env` (development)
- `.env.example` (template)
- `.env.production.formazione` (produzione)
- `.env.production.medica` (produzione)

**ELIMINARE**:
- `.env.element-formazione` (duplicato)
- `.env.element-medica` (duplicato)

### 3.3 Script Utili da Mantenere (backend/scripts/)

```bash
# Script UTILI da MANTENERE
seed-production-essential.js    # Seed dati essenziali
seed-role-default-permissions.js # Seed permessi
add-cms-media-permissions.js    # Fix permessi media
create-sample-form-templates.js # Template form

# Script di TEST da mantenere
test-attestati-debug.cjs        # Debug attestati (utile)
test-pdf-generation.js          # Test PDF
test-default-templates.mjs      # Test template
```

---

## 4. Struttura Target

### 4.1 ROOT Pulita

```
/project 2.0/
├── .env                          # Config development
├── .env.example                  # Template
├── .env.production.formazione    # Produzione formazione
├── .env.production.medica        # Produzione medica
├── .github/                      # GitHub config
├── .gitignore
├── .vscode/                      # VS Code config
├── backend/                      # Backend code
├── dist/                         # Build CRM
├── dist-public/                  # Build pubblico
├── docker-compose.production.yml
├── Dockerfile.frontend
├── docs/                         # Documentazione
├── eslint.config.js
├── index.html
├── jest.config.js
├── monitoring/                   # Configurazione monitoring
├── nginx/                        # Config Nginx
├── node_modules/
├── package-lock.json
├── package.json
├── playwright.config.ts
├── postcss.config.js
├── public/
├── scripts/                      # Script deploy/build
├── src/                          # Frontend code
├── ssl/                          # Certificati (vuoto)
├── tailwind.config.js
├── tests/                        # Test E2E
├── tsconfig.json
├── tsconfig.node.json
├── uploads/                      # Upload development
├── vite.config.ts
└── vitest.config.ts
```

### 4.2 Backend Pulito

```
/backend/
├── auth/
├── config/
├── constants/
├── controllers/
├── middleware/
├── prisma/
├── proxy/
├── routes/
├── routing/
├── scripts/                      # SOLO script essenziali
│   ├── seed-production-essential.js
│   ├── seed-role-default-permissions.js
│   ├── add-cms-media-permissions.js
│   └── create-sample-form-templates.js
├── servers/
├── services/
├── src/
├── tests/
├── utils/
├── validation/
├── validations/
├── documents-server.js
├── package.json
├── .env
├── .env.example
└── Dockerfile.*
```

---

## 5. Checklist Esecuzione

### Fase 1: Backup Pre-Pulizia
- [ ] Commit git con stato attuale
- [ ] Tag version: `git tag pre-cleanup-2025-12-11`

### Fase 2: Eliminazione File ROOT
- [ ] Eliminare file .txt sensibili
- [ ] Eliminare file debug/test
- [ ] Eliminare log/report
- [ ] Eliminare MD obsoleti

### Fase 3: Eliminazione Cartelle Temp
- [ ] Rimuovere /cleanup-temp/
- [ ] Rimuovere /temp/
- [ ] Rimuovere /backups/
- [ ] Rimuovere /logs/

### Fase 4: Pulizia Backend
- [ ] Spostare script utili in scripts/
- [ ] Eliminare script check-*
- [ ] Eliminare script fix-*
- [ ] Eliminare script verify-*
- [ ] Eliminare file temporanei

### Fase 5: Consolidamento Docs
- [ ] Archiviare cartelle obsolete
- [ ] Consolidare documentazione deployment
- [ ] Aggiornare README

### Fase 6: Verifica
- [ ] `npm run build` funziona
- [ ] `npm run dev` funziona
- [ ] Server backend parte
- [ ] Nessun file critico mancante

### Fase 7: Commit Finale
- [ ] `git add -A`
- [ ] `git commit -m "chore: major cleanup - remove temp files and obsolete scripts"`
- [ ] `git tag post-cleanup-2025-12-11`

---

## 6. Log Operazioni

### 11 Dicembre 2025

| Ora | Operazione | Stato |
|-----|------------|-------|
| ... | Analisi struttura progetto | ✅ |
| ... | Creazione piano pulizia | ✅ |
| ... | In attesa conferma utente | ⏳ |

---

## ⚠️ Note Importanti

1. **PRIMA del cleanup**: Assicurati che il server di produzione funzioni
2. **Git**: Usa `git stash` se hai modifiche non committate
3. **Backup**: I backup importanti sono già sul server Hetzner
4. **Reversibilità**: Con git puoi sempre tornare indietro

---

## 📊 Stima Risparmio

| Metrica | Prima | Dopo | Risparmio |
|---------|-------|------|-----------|
| File ROOT | ~90 | ~25 | -72% |
| Script backend | ~120 | ~15 | -87% |
| Cartelle temp | 6 | 0 | -100% |
| Chiarezza | 🔴 | 🟢 | +++ |

