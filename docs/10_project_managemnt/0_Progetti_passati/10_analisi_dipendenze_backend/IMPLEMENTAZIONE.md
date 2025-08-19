# Implementazione: Analisi Sistematica Dipendenze Backend

## 🚀 Script di Esecuzione

### Script Principale di Analisi

```bash
#!/bin/bash
# dependency-analysis.sh

echo "🔍 ANALISI SISTEMATICA DIPENDENZE BACKEND"
echo "==========================================="

# Configurazione
BACKEND_DIR="/Users/matteo.michielon/project 2.0/backend"
REPORT_DIR="./dependency-reports"
DATE=$(date +"%Y%m%d_%H%M%S")

# Crea directory report
mkdir -p $REPORT_DIR

cd $BACKEND_DIR

echo "📁 Directory di lavoro: $(pwd)"
echo "📊 Report salvati in: $REPORT_DIR"
echo ""

# FASE 1: SECURITY AUDIT
echo "🔒 FASE 1: SECURITY AUDIT"
echo "========================="

# NPM Audit base
echo "Eseguendo npm audit..."
npm audit > "$REPORT_DIR/npm-audit-$DATE.txt" 2>&1
npm audit --json > "$REPORT_DIR/npm-audit-$DATE.json" 2>&1

# Conta vulnerabilità per severità
echo "📈 Riepilogo Vulnerabilità:"
if [ -f "$REPORT_DIR/npm-audit-$DATE.json" ]; then
    CRITICAL=$(cat "$REPORT_DIR/npm-audit-$DATE.json" | jq '.metadata.vulnerabilities.critical // 0')
    HIGH=$(cat "$REPORT_DIR/npm-audit-$DATE.json" | jq '.metadata.vulnerabilities.high // 0')
    MODERATE=$(cat "$REPORT_DIR/npm-audit-$DATE.json" | jq '.metadata.vulnerabilities.moderate // 0')
    LOW=$(cat "$REPORT_DIR/npm-audit-$DATE.json" | jq '.metadata.vulnerabilities.low // 0')
    
    echo "   🔴 Critical: $CRITICAL"
    echo "   🟠 High: $HIGH"
    echo "   🟡 Moderate: $MODERATE"
    echo "   🟢 Low: $LOW"
else
    echo "   ⚠️  Impossibile parsare report JSON"
fi
echo ""

# FASE 2: DEPENDENCY TREE ANALYSIS
echo "🌳 FASE 2: DEPENDENCY TREE ANALYSIS"
echo "==================================="

# Lista dipendenze con versioni
echo "Generando lista dipendenze..."
npm ls --depth=0 > "$REPORT_DIR/dependencies-list-$DATE.txt" 2>&1
npm ls --all > "$REPORT_DIR/dependencies-tree-$DATE.txt" 2>&1

# Verifica dipendenze obsolete
echo "Verificando dipendenze obsolete..."
npm outdated > "$REPORT_DIR/outdated-$DATE.txt" 2>&1

# Verifica peer dependencies
echo "Verificando peer dependencies..."
npm ls 2>&1 | grep "WARN.*peer dep" > "$REPORT_DIR/peer-deps-warnings-$DATE.txt"

echo ""

# FASE 3: BUNDLE SIZE ANALYSIS
echo "📦 FASE 3: BUNDLE SIZE ANALYSIS"
echo "==============================="

# Analisi dimensioni node_modules
echo "Calcolando dimensioni node_modules..."
du -sh node_modules > "$REPORT_DIR/bundle-size-$DATE.txt"
du -sh node_modules/* | sort -hr >> "$REPORT_DIR/bundle-size-$DATE.txt"

echo ""

# FASE 4: LICENSE COMPLIANCE
echo "⚖️  FASE 4: LICENSE COMPLIANCE"
echo "=============================="

# Verifica licenze (se license-checker è installato)
if command -v license-checker &> /dev/null; then
    echo "Generando report licenze..."
    npx license-checker --summary > "$REPORT_DIR/licenses-summary-$DATE.txt"
    npx license-checker --csv > "$REPORT_DIR/licenses-detailed-$DATE.csv"
else
    echo "⚠️  license-checker non disponibile, installare con: npm install -g license-checker"
fi

echo ""
echo "✅ ANALISI COMPLETATA"
echo "📊 Report disponibili in: $REPORT_DIR"
echo "📅 Timestamp: $DATE"
```

### Script di Profiling Performance

```javascript
// performance-profiler.js
import { performance } from 'perf_hooks';
import fs from 'fs';

const results = {
  timestamp: new Date().toISOString(),
  dependencies: {},
  totalTime: 0,
  memoryUsage: {}
};

// Memoria iniziale
const initialMemory = process.memoryUsage();
const startTime = performance.now();

console.log('🚀 Avvio profiling dipendenze...');

// Lista dipendenze da profilare
const dependencies = [
  'express',
  '@prisma/client',
  'axios',
  'bcryptjs',
  'jsonwebtoken',
  'cors',
  'helmet',
  'winston',
  'redis',
  'ioredis',
  'googleapis',
  'multer',
  'docxtemplater',
  'swagger-ui-express',
  'http-proxy-middleware'
];

// Profila ogni dipendenza
for (const dep of dependencies) {
  const depStartTime = performance.now();
  const depStartMemory = process.memoryUsage();
  
  try {
    console.log(`📦 Caricando ${dep}...`);
    
    // Carica la dipendenza
    await import(dep);
    
    const depEndTime = performance.now();
    const depEndMemory = process.memoryUsage();
    
    results.dependencies[dep] = {
      loadTime: depEndTime - depStartTime,
      memoryImpact: {
        rss: depEndMemory.rss - depStartMemory.rss,
        heapTotal: depEndMemory.heapTotal - depStartMemory.heapTotal,
        heapUsed: depEndMemory.heapUsed - depStartMemory.heapUsed
      },
      status: 'success'
    };
    
    console.log(`   ✅ ${dep}: ${(depEndTime - depStartTime).toFixed(2)}ms`);
    
  } catch (error) {
    console.log(`   ❌ ${dep}: ${error.message}`);
    results.dependencies[dep] = {
      loadTime: 0,
      memoryImpact: { rss: 0, heapTotal: 0, heapUsed: 0 },
      status: 'error',
      error: error.message
    };
  }
}

const endTime = performance.now();
const finalMemory = process.memoryUsage();

results.totalTime = endTime - startTime;
results.memoryUsage = {
  initial: initialMemory,
  final: finalMemory,
  total: {
    rss: finalMemory.rss - initialMemory.rss,
    heapTotal: finalMemory.heapTotal - initialMemory.heapTotal,
    heapUsed: finalMemory.heapUsed - initialMemory.heapUsed
  }
};

// Salva risultati
const reportPath = `./dependency-reports/performance-profile-${Date.now()}.json`;
fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));

console.log('\n📊 RIEPILOGO PERFORMANCE:');
console.log(`⏱️  Tempo totale: ${results.totalTime.toFixed(2)}ms`);
console.log(`🧠 Memoria totale: ${(results.memoryUsage.total.rss / 1024 / 1024).toFixed(2)}MB`);
console.log(`📄 Report salvato: ${reportPath}`);

// Top 5 dipendenze più lente
const slowest = Object.entries(results.dependencies)
  .filter(([_, data]) => data.status === 'success')
  .sort(([_, a], [__, b]) => b.loadTime - a.loadTime)
  .slice(0, 5);

console.log('\n🐌 Top 5 dipendenze più lente:');
slowtest.forEach(([name, data], index) => {
  console.log(`${index + 1}. ${name}: ${data.loadTime.toFixed(2)}ms`);
});
```

### Script di Analisi Sicurezza Avanzata

```javascript
// security-analyzer.js
import fs from 'fs';
import { execSync } from 'child_process';

const securityReport = {
  timestamp: new Date().toISOString(),
  vulnerabilities: [],
  recommendations: [],
  riskScore: 0
};

console.log('🔒 Avvio analisi sicurezza avanzata...');

try {
  // Esegui npm audit e cattura output JSON
  const auditOutput = execSync('npm audit --json', { encoding: 'utf8' });
  const auditData = JSON.parse(auditOutput);
  
  if (auditData.vulnerabilities) {
    Object.entries(auditData.vulnerabilities).forEach(([packageName, vulnData]) => {
      const vulnerability = {
        package: packageName,
        severity: vulnData.severity,
        title: vulnData.title,
        url: vulnData.url,
        range: vulnData.range,
        fixAvailable: vulnData.fixAvailable
      };
      
      securityReport.vulnerabilities.push(vulnerability);
      
      // Calcola risk score
      const severityScores = {
        'critical': 10,
        'high': 7,
        'moderate': 4,
        'low': 1
      };
      
      securityReport.riskScore += severityScores[vulnData.severity] || 0;
    });
  }
  
  // Genera raccomandazioni
  const criticalVulns = securityReport.vulnerabilities.filter(v => v.severity === 'critical');
  const highVulns = securityReport.vulnerabilities.filter(v => v.severity === 'high');
  
  if (criticalVulns.length > 0) {
    securityReport.recommendations.push({
      priority: 'IMMEDIATE',
      action: `Fix ${criticalVulns.length} critical vulnerabilities immediately`,
      packages: criticalVulns.map(v => v.package)
    });
  }
  
  if (highVulns.length > 0) {
    securityReport.recommendations.push({
      priority: 'HIGH',
      action: `Address ${highVulns.length} high severity vulnerabilities within 24h`,
      packages: highVulns.map(v => v.package)
    });
  }
  
} catch (error) {
  console.error('❌ Errore durante audit:', error.message);
  securityReport.error = error.message;
}

// Verifica dipendenze con versioni pinned vs range
const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
const pinnedDeps = [];
const rangeDeps = [];

Object.entries(packageJson.dependencies || {}).forEach(([name, version]) => {
  if (version.startsWith('^') || version.startsWith('~')) {
    rangeDeps.push({ name, version });
  } else {
    pinnedDeps.push({ name, version });
  }
});

securityReport.versioningAnalysis = {
  pinnedDependencies: pinnedDeps.length,
  rangeDependencies: rangeDeps.length,
  recommendation: rangeDeps.length > pinnedDeps.length ? 
    'Consider pinning more dependencies for security' : 
    'Good dependency versioning strategy'
};

// Salva report
const reportPath = `./dependency-reports/security-analysis-${Date.now()}.json`;
fs.writeFileSync(reportPath, JSON.stringify(securityReport, null, 2));

console.log('\n🔒 RIEPILOGO SICUREZZA:');
console.log(`🎯 Risk Score: ${securityReport.riskScore}`);
console.log(`🚨 Vulnerabilità totali: ${securityReport.vulnerabilities.length}`);
console.log(`📋 Raccomandazioni: ${securityReport.recommendations.length}`);
console.log(`📄 Report salvato: ${reportPath}`);

if (securityReport.recommendations.length > 0) {
  console.log('\n🚨 AZIONI IMMEDIATE:');
  securityReport.recommendations.forEach((rec, index) => {
    console.log(`${index + 1}. [${rec.priority}] ${rec.action}`);
  });
}
```

## 🔧 Comandi di Esecuzione

### Setup Iniziale
```bash
# Naviga nella directory backend
cd /Users/matteo.michielon/project\ 2.0/backend

# Crea directory per i report
mkdir -p dependency-reports

# Rendi eseguibile lo script principale
chmod +x dependency-analysis.sh
```

### Esecuzione Analisi Completa
```bash
# Esegui analisi completa
./dependency-analysis.sh

# Esegui profiling performance
node performance-profiler.js

# Esegui analisi sicurezza avanzata
node security-analyzer.js
```

### Comandi Specifici per Categoria

#### Security
```bash
# Audit base
npm audit

# Audit con fix automatico
npm audit fix

# Audit solo vulnerabilità high/critical
npm audit --audit-level=high

# Snyk scan (se disponibile)
npx snyk test
```

#### Compatibility
```bash
# Verifica dipendenze obsolete
npm outdated

# Verifica peer dependencies
npm ls 2>&1 | grep "WARN.*peer dep"

# Check compatibilità Node.js
node --version
npm ls --depth=0
```

#### Performance
```bash
# Dimensioni node_modules
du -sh node_modules
du -sh node_modules/* | sort -hr | head -20

# Analisi bundle (se webpack configurato)
npx webpack-bundle-analyzer dist/stats.json
```

#### Cleanup
```bash
# Rimuovi node_modules e reinstalla
rm -rf node_modules package-lock.json
npm install

# Deduplica dipendenze
npm dedupe

# Pulisci cache npm
npm cache clean --force
```

## 📊 Template Report Finale

```markdown
# Report Analisi Dipendenze Backend

**Data**: [DATE]
**Versione Node.js**: [VERSION]
**Totale Dipendenze**: [COUNT]

## 🔒 Sicurezza

### Vulnerabilità Identificate
- 🔴 Critical: [COUNT]
- 🟠 High: [COUNT]
- 🟡 Moderate: [COUNT]
- 🟢 Low: [COUNT]

### Azioni Immediate Richieste
1. [ACTION 1]
2. [ACTION 2]

## 📦 Compatibilità

### Node.js LTS Compatibility
- ✅ Compatible: [COUNT]
- ❌ Incompatible: [COUNT]
- ⚠️  Unknown: [COUNT]

### Peer Dependencies
- ✅ Satisfied: [COUNT]
- ❌ Missing: [COUNT]

## 🚀 Performance

### Bundle Size
- **Total**: [SIZE]MB
- **Top 5 Largest**:
  1. [PACKAGE]: [SIZE]MB
  2. [PACKAGE]: [SIZE]MB
  ...

### Load Time
- **Total Dependencies Load**: [TIME]ms
- **Slowest Dependencies**:
  1. [PACKAGE]: [TIME]ms
  2. [PACKAGE]: [TIME]ms
  ...

## 🧹 Cleanup Opportunities

### Dipendenze Ridondanti
- [ ] redis + ioredis
- [ ] crypto + crypto-js
- [ ] [OTHER]

### Aggiornamenti Disponibili
- [ ] [PACKAGE]: [CURRENT] → [LATEST]
- [ ] [PACKAGE]: [CURRENT] → [LATEST]

## 📋 Piano Azione

### Priorità 1 (Immediate)
- [ ] Fix vulnerabilità critical
- [ ] [SPECIFIC ACTION]

### Priorità 2 (Questa settimana)
- [ ] Aggiornamenti sicurezza
- [ ] [SPECIFIC ACTION]

### Priorità 3 (Prossima settimana)
- [ ] Cleanup dipendenze ridondanti
- [ ] [SPECIFIC ACTION]

## ✅ Checklist Validazione

- [ ] Zero vulnerabilità critical/high
- [ ] Tutti i server si avviano
- [ ] Test suite passa
- [ ] Performance non degradate
- [ ] Documentazione aggiornata
```

## 🎯 Metriche di Successo

### Before/After Comparison
```json
{
  "before": {
    "vulnerabilities": {
      "critical": 0,
      "high": 0,
      "moderate": 0,
      "low": 0
    },
    "bundleSize": "0MB",
    "loadTime": "0ms",
    "dependencies": 0
  },
  "after": {
    "vulnerabilities": {
      "critical": 0,
      "high": 0,
      "moderate": 0,
      "low": 0
    },
    "bundleSize": "0MB",
    "loadTime": "0ms",
    "dependencies": 0
  },
  "improvements": {
    "securityScore": "+100%",
    "bundleReduction": "-20%",
    "performanceGain": "+15%"
  }
}
```

## 🚨 Procedura Emergenza

### In caso di problemi durante l'analisi:

1. **Stop immediato** di tutti i processi
2. **Ripristino backup** package.json/package-lock.json
3. **Reinstallazione** dipendenze originali
4. **Verifica funzionamento** dei 3 server
5. **Analisi causa** del problema
6. **Ripianificazione** approccio

### Comandi di emergenza:
```bash
# Ripristina package.json originale
git checkout HEAD -- package.json package-lock.json

# Reinstalla dipendenze
rm -rf node_modules
npm install

# Verifica server
node --check server.js
node --check proxy-server.js
node --check documents-server.js
```