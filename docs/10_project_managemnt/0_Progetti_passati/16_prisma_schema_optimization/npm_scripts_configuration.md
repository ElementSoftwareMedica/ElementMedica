# 📦 NPM Scripts Configuration - Ottimizzazione Schema Prisma

## 📋 Panoramica

Questo documento definisce tutti gli script NPM necessari per l'esecuzione del progetto di ottimizzazione dello schema Prisma, organizzati per fase e funzionalità.

## 🎯 Obiettivi

- **Automazione Completa**: Script per ogni fase del progetto
- **Facilità d'Uso**: Comandi semplici e intuitivi
- **Validazione Continua**: Script di test e validazione
- **Backup Automatico**: Script di backup e restore
- **Monitoraggio**: Script per monitoraggio e logging

## 📋 Package.json Scripts

### Script da Aggiungere al package.json

```json
{
  "scripts": {
    // === MASTER EXECUTION ===
    "schema:optimize": "node backend/scripts/master-schema-optimization.js",
    "schema:optimize:dry-run": "node backend/scripts/master-schema-optimization.js --dry-run",
    "schema:optimize:phase": "node backend/scripts/master-schema-optimization.js --phase=",
    
    // === PHASE SCRIPTS ===
    "schema:phase1": "node backend/scripts/phase-1-naming-conventions.js",
    "schema:phase2": "node backend/scripts/phase-2-indexes-constraints.js",
    "schema:phase3": "node backend/scripts/phase-3-relations-ondelete.js",
    "schema:phase4": "node backend/scripts/phase-4-soft-delete.js",
    "schema:phase5": "node backend/scripts/phase-5-performance-optimization.js",
    "schema:phase6": "node backend/scripts/phase-6-multitenant-security.js",
    "schema:phase7": "node backend/scripts/phase-7-enum-validation.js",
    "schema:phase8": "node backend/scripts/phase-8-modularization-versioning.js",
    "schema:phase9": "node backend/scripts/phase-9-middleware-logging.js",
    "schema:phase10": "node backend/scripts/phase-10-cleanup.js",
    
    // === ANALYSIS SCRIPTS ===
    "schema:analyze": "node backend/scripts/analyze-current-schema.js",
    "schema:analyze:naming": "node backend/scripts/analyze-naming-conventions.js",
    "schema:analyze:indexes": "node backend/scripts/analyze-indexes.js",
    "schema:analyze:relations": "node backend/scripts/analyze-relations.js",
    "schema:analyze:performance": "node backend/scripts/analyze-performance.js",
    "schema:analyze:security": "node backend/scripts/analyze-security.js",
    "schema:analyze:dependencies": "node backend/scripts/analyze-dependencies.js",
    
    // === VALIDATION SCRIPTS ===
    "schema:validate": "npx prisma validate && node backend/scripts/validate-schema.js",
    "schema:validate:syntax": "npx prisma validate",
    "schema:validate:db": "node backend/scripts/validate-database-mapping.js",
    "schema:validate:naming": "node backend/scripts/validate-naming-conventions.js",
    "schema:validate:indexes": "node backend/scripts/validate-indexes.js",
    "schema:validate:relations": "node backend/scripts/validate-relations.js",
    "schema:validate:security": "node backend/scripts/validate-security.js",
    
    // === BACKUP & RESTORE ===
    "schema:backup": "node backend/scripts/create-backup.js",
    "schema:backup:full": "node backend/scripts/create-full-backup.js",
    "schema:restore": "node backend/scripts/restore-backup.js",
    "schema:restore:latest": "node backend/scripts/restore-latest-backup.js",
    "schema:list-backups": "node backend/scripts/list-backups.js",
    
    // === TESTING SCRIPTS ===
    "test:schema": "jest backend/tests/schema --testTimeout=30000",
    "test:schema:unit": "jest backend/tests/schema/unit",
    "test:schema:integration": "jest backend/tests/schema/integration",
    "test:schema:performance": "jest backend/tests/schema/performance",
    "test:schema:security": "jest backend/tests/schema/security",
    "test:schema:all": "npm run test:schema:unit && npm run test:schema:integration && npm run test:schema:performance",
    
    // === MIGRATION SCRIPTS ===
    "schema:migrate:dev": "npx prisma migrate dev",
    "schema:migrate:deploy": "npx prisma migrate deploy",
    "schema:migrate:reset": "npx prisma migrate reset --force",
    "schema:migrate:status": "npx prisma migrate status",
    "schema:migrate:diff": "npx prisma migrate diff",
    
    // === GENERATION SCRIPTS ===
    "schema:generate": "npx prisma generate",
    "schema:generate:client": "npx prisma generate --generator client",
    "schema:db:push": "npx prisma db push",
    "schema:db:pull": "npx prisma db pull",
    "schema:db:seed": "npx prisma db seed",
    
    // === FORMATTING & LINTING ===
    "schema:format": "npx prisma format",
    "schema:lint": "node backend/scripts/lint-schema.js",
    "schema:fix": "npm run schema:format && npm run schema:lint",
    
    // === MONITORING & LOGGING ===
    "schema:monitor": "node backend/scripts/monitor-schema-changes.js",
    "schema:logs": "node backend/scripts/view-optimization-logs.js",
    "schema:metrics": "node backend/scripts/collect-schema-metrics.js",
    "schema:report": "node backend/scripts/generate-optimization-report.js",
    
    // === MODULARIZATION SCRIPTS ===
    "schema:build": "node backend/scripts/build-schema.js",
    "schema:build:watch": "node backend/scripts/build-schema.js --watch",
    "schema:modules:validate": "node backend/scripts/validate-schema-modules.js",
    "schema:modules:list": "node backend/scripts/list-schema-modules.js",
    
    // === VERSIONING SCRIPTS ===
    "schema:version": "node backend/scripts/version-schema.js",
    "schema:version:bump": "node backend/scripts/version-schema.js --bump",
    "schema:version:history": "node backend/scripts/schema-version-history.js",
    "schema:changelog": "node backend/scripts/generate-schema-changelog.js",
    
    // === UTILITY SCRIPTS ===
    "schema:clean": "node backend/scripts/clean-schema.js",
    "schema:stats": "node backend/scripts/schema-statistics.js",
    "schema:compare": "node backend/scripts/compare-schemas.js",
    "schema:docs": "node backend/scripts/generate-schema-docs.js",
    
    // === DEVELOPMENT HELPERS ===
    "schema:dev:setup": "npm run schema:backup && npm run schema:validate",
    "schema:dev:reset": "npm run schema:restore:latest && npm run schema:generate",
    "schema:dev:check": "npm run schema:validate && npm run test:schema:unit",
    "schema:dev:full-check": "npm run schema:validate && npm run test:schema:all",
    
    // === CI/CD SCRIPTS ===
    "schema:ci:validate": "npm run schema:validate && npm run test:schema:unit",
    "schema:ci:test": "npm run test:schema:all",
    "schema:ci:deploy": "npm run schema:validate && npm run schema:migrate:deploy",
    "schema:ci:rollback": "node backend/scripts/ci-rollback.js",
    
    // === EMERGENCY SCRIPTS ===
    "schema:emergency:backup": "node backend/scripts/emergency-backup.js",
    "schema:emergency:restore": "node backend/scripts/emergency-restore.js",
    "schema:emergency:validate": "node backend/scripts/emergency-validate.js",
    "schema:emergency:rollback": "node backend/scripts/emergency-rollback.js"
  }
}
```

## 🔧 Script Dettagliati per Categoria

### 1. Master Execution Scripts

```bash
# Esecuzione completa ottimizzazione
npm run schema:optimize

# Modalità dry-run (solo analisi, nessuna modifica)
npm run schema:optimize:dry-run

# Esecuzione singola fase
npm run schema:optimize:phase 3
```

### 2. Phase-Specific Scripts

```bash
# Fase 1: Naming & Convenzioni
npm run schema:phase1

# Fase 2: Indici & Vincoli
npm run schema:phase2

# Fase 3: Relazioni & onDelete
npm run schema:phase3

# Fase 4: Soft-Delete
npm run schema:phase4

# Fase 5: Performance Optimization
npm run schema:phase5

# Fase 6: Multi-tenant & Security
npm run schema:phase6

# Fase 7: Enum & Validation
npm run schema:phase7

# Fase 8: Modularization & Versioning
npm run schema:phase8

# Fase 9: Middleware & Logging
npm run schema:phase9

# Fase 10: Cleanup
npm run schema:phase10
```

### 3. Analysis Scripts

```bash
# Analisi completa schema corrente
npm run schema:analyze

# Analisi naming conventions
npm run schema:analyze:naming

# Analisi indici
npm run schema:analyze:indexes

# Analisi relazioni
npm run schema:analyze:relations

# Analisi performance
npm run schema:analyze:performance

# Analisi sicurezza
npm run schema:analyze:security

# Analisi dipendenze tra modelli
npm run schema:analyze:dependencies
```

### 4. Validation Scripts

```bash
# Validazione completa
npm run schema:validate

# Validazione sintassi Prisma
npm run schema:validate:syntax

# Validazione mapping database
npm run schema:validate:db

# Validazione naming conventions
npm run schema:validate:naming

# Validazione indici
npm run schema:validate:indexes

# Validazione relazioni
npm run schema:validate:relations

# Validazione sicurezza
npm run schema:validate:security
```

### 5. Backup & Restore Scripts

```bash
# Backup schema corrente
npm run schema:backup

# Backup completo (schema + database)
npm run schema:backup:full

# Restore da backup specifico
npm run schema:restore

# Restore ultimo backup
npm run schema:restore:latest

# Lista backup disponibili
npm run schema:list-backups
```

### 6. Testing Scripts

```bash
# Test completi schema
npm run test:schema

# Test unitari
npm run test:schema:unit

# Test integrazione
npm run test:schema:integration

# Test performance
npm run test:schema:performance

# Test sicurezza
npm run test:schema:security

# Tutti i test
npm run test:schema:all
```

### 7. Migration Scripts

```bash
# Migrazione development
npm run schema:migrate:dev

# Deploy migrazioni
npm run schema:migrate:deploy

# Reset migrazioni
npm run schema:migrate:reset

# Status migrazioni
npm run schema:migrate:status

# Diff migrazioni
npm run schema:migrate:diff
```

### 8. Generation Scripts

```bash
# Genera client Prisma
npm run schema:generate

# Genera solo client
npm run schema:generate:client

# Push schema a database
npm run schema:db:push

# Pull schema da database
npm run schema:db:pull

# Seed database
npm run schema:db:seed
```

### 9. Formatting & Linting Scripts

```bash
# Formatta schema
npm run schema:format

# Lint schema
npm run schema:lint

# Fix automatico
npm run schema:fix
```

### 10. Monitoring & Logging Scripts

```bash
# Monitor cambiamenti schema
npm run schema:monitor

# Visualizza logs ottimizzazione
npm run schema:logs

# Raccogli metriche
npm run schema:metrics

# Genera report
npm run schema:report
```

### 11. Modularization Scripts

```bash
# Build schema da moduli
npm run schema:build

# Build con watch mode
npm run schema:build:watch

# Valida moduli
npm run schema:modules:validate

# Lista moduli
npm run schema:modules:list
```

### 12. Versioning Scripts

```bash
# Versiona schema
npm run schema:version

# Bump versione
npm run schema:version:bump

# Storia versioni
npm run schema:version:history

# Genera changelog
npm run schema:changelog
```

### 13. Utility Scripts

```bash
# Pulisci schema
npm run schema:clean

# Statistiche schema
npm run schema:stats

# Confronta schemi
npm run schema:compare

# Genera documentazione
npm run schema:docs
```

### 14. Development Helper Scripts

```bash
# Setup development
npm run schema:dev:setup

# Reset development
npm run schema:dev:reset

# Check rapido
npm run schema:dev:check

# Check completo
npm run schema:dev:full-check
```

### 15. CI/CD Scripts

```bash
# Validazione CI
npm run schema:ci:validate

# Test CI
npm run schema:ci:test

# Deploy CI
npm run schema:ci:deploy

# Rollback CI
npm run schema:ci:rollback
```

### 16. Emergency Scripts

```bash
# Backup emergenza
npm run schema:emergency:backup

# Restore emergenza
npm run schema:emergency:restore

# Validazione emergenza
npm run schema:emergency:validate

# Rollback emergenza
npm run schema:emergency:rollback
```

## 🔄 Workflow Tipici

### Workflow Sviluppo Quotidiano

```bash
# 1. Setup giornaliero
npm run schema:dev:setup

# 2. Analisi modifiche
npm run schema:analyze

# 3. Validazione rapida
npm run schema:dev:check

# 4. Backup prima modifiche
npm run schema:backup

# 5. Implementazione modifiche
# ... modifiche manuali ...

# 6. Validazione post-modifiche
npm run schema:validate

# 7. Test
npm run test:schema:unit

# 8. Formattazione
npm run schema:format
```

### Workflow Ottimizzazione Completa

```bash
# 1. Backup completo
npm run schema:backup:full

# 2. Analisi pre-ottimizzazione
npm run schema:analyze

# 3. Dry-run ottimizzazione
npm run schema:optimize:dry-run

# 4. Esecuzione ottimizzazione
npm run schema:optimize

# 5. Validazione post-ottimizzazione
npm run schema:validate

# 6. Test completi
npm run test:schema:all

# 7. Generazione report
npm run schema:report
```

### Workflow Singola Fase

```bash
# 1. Backup
npm run schema:backup

# 2. Analisi specifica
npm run schema:analyze:naming  # esempio per fase 1

# 3. Esecuzione fase
npm run schema:phase1

# 4. Validazione
npm run schema:validate:naming

# 5. Test
npm run test:schema:unit
```

### Workflow Emergenza

```bash
# 1. Backup emergenza
npm run schema:emergency:backup

# 2. Validazione stato
npm run schema:emergency:validate

# 3. Rollback se necessario
npm run schema:emergency:rollback

# 4. Restore se necessario
npm run schema:emergency:restore
```

## 🎯 Script Personalizzati per Progetto

### Script Combinati Utili

```json
{
  "scripts": {
    // Workflow completo sviluppo
    "schema:dev:workflow": "npm run schema:backup && npm run schema:analyze && npm run schema:validate && npm run test:schema:unit",
    
    // Workflow pre-commit
    "schema:pre-commit": "npm run schema:format && npm run schema:validate && npm run test:schema:unit",
    
    // Workflow post-merge
    "schema:post-merge": "npm run schema:validate && npm run schema:generate && npm run test:schema:integration",
    
    // Workflow release
    "schema:release": "npm run schema:validate && npm run test:schema:all && npm run schema:version:bump && npm run schema:changelog",
    
    // Workflow hotfix
    "schema:hotfix": "npm run schema:emergency:backup && npm run schema:validate && npm run test:schema:unit",
    
    // Workflow monitoring
    "schema:health-check": "npm run schema:validate && npm run schema:metrics && npm run test:schema:unit"
  }
}
```

## 📋 Configurazione Avanzata

### Variabili d'Ambiente

```bash
# .env.schema-optimization
SCHEMA_BACKUP_DIR=./backups/schema
SCHEMA_LOG_LEVEL=info
SCHEMA_DRY_RUN=false
SCHEMA_AUTO_BACKUP=true
SCHEMA_VALIDATION_STRICT=true
SCHEMA_TEST_TIMEOUT=30000
SCHEMA_PARALLEL_EXECUTION=false
```

### Configurazione Jest per Test Schema

```javascript
// jest.schema.config.js
module.exports = {
  displayName: 'Schema Tests',
  testMatch: ['**/tests/schema/**/*.test.js'],
  testTimeout: 30000,
  setupFilesAfterEnv: ['<rootDir>/tests/schema/setup.js'],
  globalSetup: '<rootDir>/tests/schema/globalSetup.js',
  globalTeardown: '<rootDir>/tests/schema/globalTeardown.js',
  testEnvironment: 'node',
  collectCoverageFrom: [
    'backend/scripts/**/*.js',
    'backend/middleware/**/*.js',
    '!**/node_modules/**',
    '!**/tests/**'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

### Configurazione Husky per Git Hooks

```json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run schema:pre-commit",
      "post-merge": "npm run schema:post-merge",
      "pre-push": "npm run schema:ci:validate"
    }
  }
}
```

## 🚀 Esempi d'Uso Avanzati

### Esecuzione Condizionale

```bash
# Esegui solo se ci sono modifiche al schema
if git diff --name-only | grep -q "prisma/schema.prisma"; then
  npm run schema:validate
fi

# Esegui test solo se validazione passa
npm run schema:validate && npm run test:schema:unit

# Backup automatico prima di ogni modifica
npm run schema:backup && npm run schema:phase1
```

### Parallelizzazione

```bash
# Esegui analisi in parallelo
npm run schema:analyze:naming & 
npm run schema:analyze:indexes & 
npm run schema:analyze:relations & 
wait

# Test paralleli
npm run test:schema:unit & 
npm run test:schema:integration & 
wait
```

### Logging Avanzato

```bash
# Log con timestamp
npm run schema:optimize 2>&1 | ts '[%Y-%m-%d %H:%M:%S]' | tee logs/optimization.log

# Log con colori
npm run schema:validate | ccze -A

# Log strutturato
npm run schema:metrics | jq '.'
```

## 📊 Monitoraggio e Metriche

### Script di Monitoraggio Continuo

```bash
# Monitor cambiamenti schema ogni 5 minuti
watch -n 300 'npm run schema:health-check'

# Alert su fallimenti
npm run schema:validate || echo "ALERT: Schema validation failed" | mail -s "Schema Alert" admin@example.com

# Metriche giornaliere
0 9 * * * cd /path/to/project && npm run schema:metrics >> logs/daily-metrics.log
```

### Dashboard Metriche

```bash
# Genera dashboard HTML
npm run schema:metrics | node scripts/generate-dashboard.js > dashboard.html

# Export metriche per Grafana
npm run schema:metrics | node scripts/export-grafana.js
```

---

## 📋 Metadati Documento

- **Versione**: 1.0
- **Data Creazione**: 2024-12-19
- **Ultima Modifica**: 2024-12-19
- **Autore**: AI Assistant
- **Stato**: Completo
- **Tipo**: NPM Scripts Configuration
- **Categoria**: Automazione
- **Priorità**: Alta
- **Dipendenze**: package.json, Node.js, Prisma CLI

**Note**: Questi script devono essere aggiunti al package.json del progetto e testati in ambiente di sviluppo prima dell'uso in produzione. Alcuni script richiedono la creazione dei file JavaScript corrispondenti nella directory backend/scripts/.