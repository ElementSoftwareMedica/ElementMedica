# 📋 PLANNING DETTAGLIATO - Risoluzione Sistematica Errori API Globali

**Data**: 29 Dicembre 2024  
**Versione**: 1.0  
**Stato**: Planning Operativo  
**Priorità**: 🔴 CRITICA  
**Tempo Stimato**: 2 ore  
**GDPR Impact**: ⚠️ MEDIO - Correzione necessaria per compliance

## 🎯 Obiettivo Strategico

Risolvere sistematicamente tutti gli errori di connessione API `ERR_CONNECTION_REFUSED` presenti in tutte le pagine del progetto, applicando le correzioni già validate su `EmployeesPage.tsx` e `attestatiService.ts` a tutto il codebase.

## 📊 Analisi Situazione Attuale

### Stato Server (Verificato)
- ✅ **API Server**: Attivo su porta 4001
- ✅ **Documents Server**: Attivo su porta 4002  
- ✅ **Proxy Server**: Attivo su porta 4006
- ✅ **Frontend Dev**: Attivo su porta 5174
- ✅ **Vite Proxy**: Configurato `/api` → `localhost:4001`

### Correzioni Già Implementate
- ✅ `EmployeesPage.tsx` - 4 funzioni corrette
- ✅ `attestatiService.ts` - Endpoint multipli semplificati
- ✅ Script `fix-api-urls.cjs` - 23/24 file corretti automaticamente

### Scope Rimanente
Tutte le altre pagine e servizi che utilizzano ancora `http://localhost:4000`

## 🔍 FASE 1: Analisi Completa e Mappatura (15 min)

### 1.1 Scansione Sistematica Codebase

#### Comando di Ricerca
```bash
# Ricerca completa di tutti i pattern problematici
grep -r "localhost:4000" src/ --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx"
grep -r "127.0.0.1:4000" src/ --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx"
grep -r "localhost:4003" src/ --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx"
grep -r "127.0.0.1:4003" src/ --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx"
```

#### Categorizzazione File
```typescript
interface FileAnalysis {
  filePath: string;
  category: 'business-critical' | 'documents' | 'scheduling' | 'services' | 'hooks';
  errorCount: number;
  complexity: 'simple' | 'medium' | 'complex';
  gdprImpact: 'high' | 'medium' | 'low';
  priority: 1 | 2 | 3;
}
```

### 1.2 Prioritizzazione Correzioni

#### Priorità 1 - Business Critical (GDPR High Impact)
- `CompanyDetails.tsx` - Accesso dati aziende
- `EmployeeEdit.tsx` - Modifica dati personali
- `EmployeeDetails.tsx` - Visualizzazione dati personali
- `TrainerEdit.tsx` - Modifica dati formatori
- `TrainerDetails.tsx` - Visualizzazione dati formatori
- `CompanyEdit.tsx` - Modifica dati aziende

#### Priorità 2 - Documenti e Certificazioni (GDPR Medium Impact)
- `Attestati.tsx` - Gestione certificazioni
- `LettereIncarico.tsx` - Documenti ufficiali
- `Quotes.tsx` - Preventivi
- `Invoices.tsx` - Fatturazione
- `GenerateAttestatiModal.tsx` - Generazione documenti

#### Priorità 3 - Funzionalità Supporto (GDPR Low Impact)
- `ScheduleDetailPage.tsx` - Dettagli pianificazione
- `SchedulesPage.tsx` - Gestione pianificazioni
- `ScheduleTrainingWizard.tsx` - Wizard formazione
- `CourseDetails.tsx` - Dettagli corsi
- `TrainersPage.tsx` - Lista formatori

### 1.3 Analisi Pattern di Errori

#### Pattern Identificati
```typescript
// Pattern 1: Fetch dirette
fetch('http://localhost:4000/endpoint')

// Pattern 2: Axios con base URL
axios.get('http://localhost:4000/endpoint')

// Pattern 3: Configurazioni multiple
const API_URL = 'http://localhost:4000';

// Pattern 4: Template literals
`http://localhost:4000/${endpoint}`

// Pattern 5: Window.open
window.open('http://localhost:4000/download')

// Pattern 6: Href attributes
href="http://localhost:4000/export"
```

## 🛠️ FASE 2: Miglioramento Script Automatico (20 min)

### 2.1 Aggiornamento fix-api-urls.cjs

#### Nuovi Pattern da Gestire
```javascript
// Estensioni allo script esistente
const ADDITIONAL_PATTERNS = [
  // Axios calls
  {
    pattern: /axios\.(get|post|put|delete|patch)\s*\(\s*['"`]http:\/\/localhost:4000([^'"\`]*)['"`]/g,
    replacement: "axios.$1('/api$2'"
  },
  // Template literals con variabili
  {
    pattern: /`http:\/\/localhost:4000\/\$\{([^}]+)\}`/g,
    replacement: "`/api/${$1}`"
  },
  // Window.open calls
  {
    pattern: /window\.open\s*\(\s*['"`]http:\/\/localhost:4000([^'"\`]*)['"`]/g,
    replacement: "window.open('/api$1'"
  },
  // Href attributes in JSX
  {
    pattern: /href\s*=\s*['"`]http:\/\/localhost:4000([^'"\`]*)['"`]/g,
    replacement: "href='/api$1'"
  },
  // API_URL constants
  {
    pattern: /const\s+API_URL\s*=\s*['"`]http:\/\/localhost:4000['"`]/g,
    replacement: "const API_URL = '/api'"
  },
  // Base URL configurations
  {
    pattern: /baseURL\s*:\s*['"`]http:\/\/localhost:4000['"`]/g,
    replacement: "baseURL: '/api'"
  }
];
```

#### Script Migliorato
```javascript
// fix-api-urls-enhanced.cjs
const fs = require('fs');
const path = require('path');
const glob = require('glob');

class ApiUrlFixer {
  constructor() {
    this.patterns = [
      // Pattern esistenti + nuovi pattern
      ...EXISTING_PATTERNS,
      ...ADDITIONAL_PATTERNS
    ];
    this.stats = {
      filesProcessed: 0,
      filesModified: 0,
      replacementsMade: 0,
      errors: []
    };
  }

  async processAllFiles() {
    const files = glob.sync('src/**/*.{ts,tsx,js,jsx}', {
      ignore: ['node_modules/**', 'dist/**', 'build/**']
    });

    for (const file of files) {
      await this.processFile(file);
    }

    return this.generateReport();
  }

  async processFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      let modifiedContent = content;
      let fileModified = false;

      for (const pattern of this.patterns) {
        const matches = modifiedContent.match(pattern.pattern);
        if (matches) {
          modifiedContent = modifiedContent.replace(pattern.pattern, pattern.replacement);
          this.stats.replacementsMade += matches.length;
          fileModified = true;
        }
      }

      if (fileModified) {
        fs.writeFileSync(filePath, modifiedContent, 'utf8');
        this.stats.filesModified++;
        console.log(`✅ Modified: ${filePath}`);
      }

      this.stats.filesProcessed++;
    } catch (error) {
      this.stats.errors.push({ file: filePath, error: error.message });
      console.error(`❌ Error processing ${filePath}:`, error.message);
    }
  }

  generateReport() {
    return {
      summary: {
        filesProcessed: this.stats.filesProcessed,
        filesModified: this.stats.filesModified,
        replacementsMade: this.stats.replacementsMade,
        successRate: ((this.stats.filesModified / this.stats.filesProcessed) * 100).toFixed(2)
      },
      errors: this.stats.errors
    };
  }
}

// Esecuzione
const fixer = new ApiUrlFixer();
fixer.processAllFiles().then(report => {
  console.log('\n📊 REPORT FINALE:');
  console.log(JSON.stringify(report, null, 2));
});
```

### 2.2 Validazione Script

#### Test su File Campione
```bash
# Test su singolo file prima dell'esecuzione globale
node fix-api-urls-enhanced.cjs --test-file="src/pages/CompanyDetails.tsx"
```

#### Backup Automatico
```javascript
// Backup prima delle modifiche
const backupDir = `./backup-${Date.now()}`;
fs.mkdirSync(backupDir, { recursive: true });
// Copia file prima della modifica
```

## 🔧 FASE 3: Esecuzione Correzioni Automatiche (25 min)

### 3.1 Esecuzione Script Migliorato

#### Comando di Esecuzione
```bash
# Esecuzione con logging dettagliato
node fix-api-urls-enhanced.cjs 2>&1 | tee correction-log.txt
```

#### Monitoraggio Progresso
```bash
# Verifica progresso in tempo reale
tail -f correction-log.txt
```

### 3.2 Validazione Risultati Automatici

#### Verifica Completezza
```bash
# Controllo che non ci siano più localhost:4000
grep -r "localhost:4000" src/ --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" || echo "✅ Nessun localhost:4000 trovato"
```

#### Controllo Sintassi
```bash
# Verifica che i file siano ancora validi
npm run type-check
npm run lint
```

### 3.3 Identificazione File per Correzione Manuale

#### Criteri per Correzione Manuale
- File con logiche complesse non gestite dallo script
- File con configurazioni multiple
- File con pattern non standard
- File che generano errori di sintassi

## 🎯 FASE 4: Correzioni Manuali Mirate (30 min)

### 4.1 Analisi File Complessi

#### File Prioritari per Revisione Manuale
1. `src/api.ts` - Configurazione API centrale
2. `src/config/api/index.ts` - Configurazioni endpoint
3. `src/services/*` - Servizi con logiche specifiche
4. Hook personalizzati con chiamate API

### 4.2 Pattern di Correzione Manuale

#### Configurazioni API Centralizzate
```typescript
// PRIMA (❌ Configurazione inconsistente)
const API_URL = 'http://localhost:4000';
const DOCUMENTS_URL = 'http://localhost:4002';
const PROXY_URL = 'http://localhost:4003';

// DOPO (✅ Configurazione unificata)
const API_BASE_URL = '/api';  // Usa sempre proxy Vite
const DOCUMENTS_BASE_URL = '/api/documents';
```

#### Servizi con Endpoint Multipli
```typescript
// PRIMA (❌ Tentativi multipli)
const endpoints = [
  'http://localhost:4000/endpoint',
  'http://localhost:4001/endpoint',
  'http://localhost:4003/endpoint'
];

// DOPO (✅ Endpoint unificato)
const endpoint = '/api/endpoint';  // Solo proxy Vite
```

#### Hook Personalizzati
```typescript
// PRIMA (❌ URL hardcoded)
const useApiData = (endpoint: string) => {
  const url = `http://localhost:4000${endpoint}`;
  // ...
};

// DOPO (✅ Proxy Vite)
const useApiData = (endpoint: string) => {
  const url = `/api${endpoint}`;
  // ...
};
```

### 4.3 Validazione GDPR per Ogni Correzione

#### Checklist GDPR per Ogni File
```typescript
// Verificare che ogni correzione mantenga:
const GDPR_CHECKLIST = {
  auditTrail: 'Logging operazioni mantenuto',
  dataAccess: 'Accesso dati personali funzionante',
  dataModification: 'Modifica dati personali funzionante',
  dataDeletion: 'Cancellazione dati funzionante',
  dataExport: 'Export dati funzionante',
  consentManagement: 'Gestione consensi mantenuta',
  errorHandling: 'Gestione errori non espone dati sensibili'
};
```

## ✅ FASE 5: Test e Validazione Funzionale (20 min)

### 5.1 Test Funzionale per Priorità

#### Priorità 1 - Test Business Critical
```typescript
// Test plan per pagine critiche
const CRITICAL_TESTS = [
  {
    page: 'CompanyDetails.tsx',
    tests: [
      'Caricamento dettagli azienda',
      'Modifica informazioni azienda',
      'Salvataggio modifiche'
    ]
  },
  {
    page: 'EmployeeEdit.tsx',
    tests: [
      'Caricamento dati dipendente',
      'Modifica dati personali',
      'Salvataggio modifiche',
      'Audit trail generato'
    ]
  }
  // ... altri test
];
```

#### Test Automatizzati
```bash
# Esecuzione test suite
npm run test
npm run test:e2e
```

### 5.2 Verifica Chiamate API

#### Monitoring Network Tab
```javascript
// Script per verificare chiamate API nel browser
const monitorApiCalls = () => {
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    console.log('API Call:', args[0]);
    if (args[0].includes('localhost:4000')) {
      console.error('❌ ERRORE: Chiamata diretta a localhost:4000 rilevata!');
    }
    return originalFetch.apply(this, args);
  };
};
```

### 5.3 Test GDPR Compliance

#### Verifica Diritti Utente
```typescript
// Test dei diritti GDPR
const testGdprRights = async () => {
  // Test diritto di accesso
  const userData = await fetch('/api/users/me');
  assert(userData.ok, 'Diritto di accesso funzionante');
  
  // Test diritto di modifica
  const updateResult = await fetch('/api/users/me', {
    method: 'PUT',
    body: JSON.stringify({ firstName: 'Test' })
  });
  assert(updateResult.ok, 'Diritto di modifica funzionante');
  
  // Test diritto di cancellazione
  const deleteResult = await fetch('/api/users/me', {
    method: 'DELETE'
  });
  assert(deleteResult.ok, 'Diritto di cancellazione funzionante');
};
```

## 📊 FASE 6: Monitoraggio e Documentazione (10 min)

### 6.1 Setup Monitoraggio Continuo

#### Script di Controllo
```javascript
// monitor-api-urls.js
const checkForBadUrls = () => {
  const badPatterns = [
    'localhost:4000',
    '127.0.0.1:4000',
    'localhost:4003',
    '127.0.0.1:4003'
  ];
  
  // Scansione periodica del codebase
  // Alert se trovati pattern problematici
};
```

#### Git Hook Pre-commit
```bash
#!/bin/sh
# .git/hooks/pre-commit
echo "Controllo URL API..."
if grep -r "localhost:4000" src/ --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx"; then
  echo "❌ ERRORE: Trovati URL localhost:4000 nel commit!"
  exit 1
fi
echo "✅ Controllo URL API superato"
```

### 6.2 Documentazione Risultati

#### Report Finale
```markdown
# RISULTATI CORREZIONE API GLOBALE

## Statistiche
- File analizzati: X
- File corretti: Y
- Errori risolti: Z
- Tempo impiegato: W minuti

## Pagine Validate
- [x] CompanyDetails.tsx
- [x] EmployeeEdit.tsx
- [x] TrainerDetails.tsx
- ...

## Test GDPR
- [x] Diritto di accesso
- [x] Diritto di modifica
- [x] Diritto di cancellazione
- [x] Audit trail
```

## 🚨 Gestione Rischi e Contingency

### Rischi Identificati e Mitigazioni

#### 1. Regressioni Funzionali
- **Rischio**: Correzioni che rompono funzionalità
- **Mitigazione**: Test incrementale dopo ogni correzione
- **Contingency**: Rollback immediato da backup

#### 2. Performance Issues
- **Rischio**: Proxy introduce latenza
- **Mitigazione**: Monitoring tempi risposta
- **Contingency**: Ottimizzazione configurazione proxy

#### 3. GDPR Compliance Break
- **Rischio**: Perdita funzionalità GDPR
- **Mitigazione**: Test specifici per ogni diritto
- **Contingency**: Ripristino configurazione precedente

### Piano di Rollback
```bash
# Rollback completo se necessario
cp -r backup-[timestamp]/* src/
git checkout -- src/
npm run build
npm run test
```

## 📋 Checklist Esecuzione

### Pre-Esecuzione
- [ ] Backup completo codebase
- [ ] Verifica server attivi
- [ ] Test script su file campione
- [ ] Preparazione ambiente di test

### Durante Esecuzione
- [ ] Monitoraggio progresso script
- [ ] Validazione correzioni automatiche
- [ ] Correzioni manuali file complessi
- [ ] Test funzionale incrementale

### Post-Esecuzione
- [ ] Verifica completa assenza errori
- [ ] Test GDPR compliance
- [ ] Documentazione risultati
- [ ] Setup monitoraggio continuo

## 🎯 Criteri di Successo

### Tecnici
- ✅ Zero errori `ERR_CONNECTION_REFUSED`
- ✅ 100% file corretti
- ✅ Tutti i test passano
- ✅ Performance mantenuta

### GDPR
- ✅ Tutti i diritti utente funzionanti
- ✅ Audit trail completo
- ✅ Gestione consensi operativa
- ✅ Data retention rispettata

### Business
- ✅ Tutte le pagine operative
- ✅ User experience fluida
- ✅ Zero downtime
- ✅ Configurazione manutenibile

---

**Status**: 📋 **PLANNING COMPLETATO**  
**Prossimo Step**: Implementazione  
**Tempo Stimato**: 2 ore  
**Responsabile**: AI Assistant  
**GDPR Impact**: ⚠️ MEDIO - Correzione necessaria  
**Business Impact**: 🔴 CRITICO - Risoluzione prioritaria