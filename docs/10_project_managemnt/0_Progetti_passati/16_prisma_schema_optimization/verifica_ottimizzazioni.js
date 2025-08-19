#!/usr/bin/env node
/**
 * Script di Verifica Ottimizzazioni Schema Prisma
 * Controlla che tutte le modifiche siano state applicate correttamente
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../../');
const backendPath = path.join(projectRoot, 'backend');

/**
 * Verifica che i file utilizzino il client Prisma ottimizzato
 */
function verificaClientPrismaOttimizzato() {
  console.log('🔍 Verificando utilizzo client Prisma ottimizzato...');
  
  const filesCritici = [
    'services/authService.js',
    'services/personService.js',
    'services/gdpr-service.js',
    'services/tenantService.js',
    'auth/middleware.js',
    'auth/jwt.js',
    'middleware/tenant.js',
    'middleware/rbac.js',
    'routes/v1/auth.js',
    'routes/users-routes.js',
    'routes/companies-routes.js',
    'routes/roles.js'
  ];
  
  const risultati = {
    corretti: [],
    problematici: [],
    nonTrovati: []
  };
  
  filesCritici.forEach(file => {
    const filePath = path.join(backendPath, file);
    
    if (!fs.existsSync(filePath)) {
      risultati.nonTrovati.push(file);
      return;
    }
    
    const contenuto = fs.readFileSync(filePath, 'utf8');
    
    // Verifica che NON usi new PrismaClient()
    if (contenuto.includes('new PrismaClient()')) {
      risultati.problematici.push({
        file,
        problema: 'Usa ancora new PrismaClient() direttamente'
      });
      return;
    }
    
    // Verifica che usi il client ottimizzato
    if (contenuto.includes('from \'../config/prisma-optimization.js\'') || 
        contenuto.includes('from \'../../config/prisma-optimization.js\'')) {
      risultati.corretti.push(file);
    } else {
      risultati.problematici.push({
        file,
        problema: 'Non importa il client ottimizzato'
      });
    }
  });
  
  console.log(`✅ File corretti: ${risultati.corretti.length}`);
  console.log(`❌ File problematici: ${risultati.problematici.length}`);
  console.log(`⚠️  File non trovati: ${risultati.nonTrovati.length}`);
  
  if (risultati.problematici.length > 0) {
    console.log('\n🚨 Problemi rilevati:');
    risultati.problematici.forEach(p => {
      console.log(`  - ${p.file}: ${p.problema}`);
    });
  }
  
  if (risultati.nonTrovati.length > 0) {
    console.log('\n⚠️  File non trovati:');
    risultati.nonTrovati.forEach(f => {
      console.log(`  - ${f}`);
    });
  }
  
  return risultati.problematici.length === 0;
}

/**
 * Verifica esistenza del client ottimizzato
 */
function verificaClientOttimizzato() {
  console.log('\n🔍 Verificando client Prisma ottimizzato...');
  
  const clientPath = path.join(backendPath, 'config/prisma-optimization.js');
  
  if (!fs.existsSync(clientPath)) {
    console.log('❌ Client ottimizzato non trovato!');
    return false;
  }
  
  const contenuto = fs.readFileSync(clientPath, 'utf8');
  
  const verifiche = [
    {
      nome: 'Import PrismaClient',
      test: contenuto.includes('import { PrismaClient }'),
      richiesto: true
    },
    {
      nome: 'Configurazione logging',
      test: contenuto.includes('log: ['),
      richiesto: true
    },
    {
      nome: 'Middleware soft-delete',
      test: contenuto.includes('createAdvancedSoftDeleteMiddleware'),
      richiesto: true
    },
    {
      nome: 'Export default',
      test: contenuto.includes('export default prisma'),
      richiesto: true
    }
  ];
  
  let tutteOk = true;
  
  verifiche.forEach(v => {
    const status = v.test ? '✅' : '❌';
    console.log(`  ${status} ${v.nome}`);
    
    if (v.richiesto && !v.test) {
      tutteOk = false;
    }
  });
  
  return tutteOk;
}

/**
 * Verifica esistenza del middleware soft-delete
 */
function verificaMiddlewareSoftDelete() {
  console.log('\n🔍 Verificando middleware soft-delete...');
  
  const middlewarePath = path.join(backendPath, 'middleware/soft-delete-advanced.js');
  
  if (!fs.existsSync(middlewarePath)) {
    console.log('❌ Middleware soft-delete non trovato!');
    return false;
  }
  
  const contenuto = fs.readFileSync(middlewarePath, 'utf8');
  
  const verifiche = [
    {
      nome: 'Array SOFT_DELETE_MODELS',
      test: contenuto.includes('SOFT_DELETE_MODELS'),
      richiesto: true
    },
    {
      nome: 'Array IS_ACTIVE_MODELS',
      test: contenuto.includes('IS_ACTIVE_MODELS'),
      richiesto: true
    },
    {
      nome: 'Funzione createAdvancedSoftDeleteMiddleware',
      test: contenuto.includes('export function createAdvancedSoftDeleteMiddleware'),
      richiesto: true
    },
    {
      nome: 'Gestione operazioni FIND',
      test: contenuto.includes('handleFindOperations'),
      richiesto: true
    },
    {
      nome: 'Gestione operazioni DELETE',
      test: contenuto.includes('handleDeleteOperations'),
      richiesto: true
    }
  ];
  
  let tutteOk = true;
  
  verifiche.forEach(v => {
    const status = v.test ? '✅' : '❌';
    console.log(`  ${status} ${v.nome}`);
    
    if (v.richiesto && !v.test) {
      tutteOk = false;
    }
  });
  
  return tutteOk;
}

/**
 * Verifica schema Prisma
 */
function verificaSchemaPrisma() {
  console.log('\n🔍 Verificando schema Prisma...');
  
  const schemaPath = path.join(backendPath, 'prisma/schema.prisma');
  
  if (!fs.existsSync(schemaPath)) {
    console.log('❌ Schema Prisma non trovato!');
    return false;
  }
  
  console.log('✅ Schema Prisma trovato');
  console.log('ℹ️  Per validazione completa eseguire: npx prisma validate');
  
  return true;
}

/**
 * Verifica script di test
 */
function verificaScriptTest() {
  console.log('\n🔍 Verificando script di test...');
  
  const testPath = path.join(__dirname, 'test_login_after_optimization.js');
  
  if (!fs.existsSync(testPath)) {
    console.log('❌ Script di test non trovato!');
    return false;
  }
  
  console.log('✅ Script di test trovato');
  console.log('ℹ️  Per eseguire: node test_login_after_optimization.js');
  
  return true;
}

/**
 * Esegue tutte le verifiche
 */
function eseguiTutteLeVerifiche() {
  console.log('🚀 Avvio verifica ottimizzazioni Schema Prisma...');
  console.log('=' .repeat(60));
  
  const risultati = {
    clientOttimizzato: verificaClientOttimizzato(),
    middlewareSoftDelete: verificaMiddlewareSoftDelete(),
    utilizzoClient: verificaClientPrismaOttimizzato(),
    schemaPrisma: verificaSchemaPrisma(),
    scriptTest: verificaScriptTest()
  };
  
  console.log('\n' + '=' .repeat(60));
  console.log('📊 RIEPILOGO VERIFICHE:');
  
  Object.entries(risultati).forEach(([nome, successo]) => {
    const status = successo ? '✅' : '❌';
    const nomeFormattato = nome.replace(/([A-Z])/g, ' $1').toLowerCase();
    console.log(`  ${status} ${nomeFormattato}`);
  });
  
  const tutteOk = Object.values(risultati).every(r => r === true);
  
  console.log('\n' + '=' .repeat(60));
  
  if (tutteOk) {
    console.log('🎉 TUTTE LE VERIFICHE SUPERATE!');
    console.log('✅ Le ottimizzazioni sono state applicate correttamente.');
    console.log('🚀 Il sistema è pronto per il testing con server attivi.');
  } else {
    console.log('⚠️  ALCUNE VERIFICHE FALLITE!');
    console.log('❌ Controllare i problemi riportati sopra.');
    console.log('🔧 Applicare le correzioni necessarie prima del testing.');
  }
  
  return tutteOk;
}

// Esegui le verifiche se il file viene chiamato direttamente
if (import.meta.url === `file://${process.argv[1]}`) {
  const successo = eseguiTutteLeVerifiche();
  process.exit(successo ? 0 : 1);
}

export {
  verificaClientOttimizzato,
  verificaMiddlewareSoftDelete,
  verificaClientPrismaOttimizzato,
  verificaSchemaPrisma,
  verificaScriptTest,
  eseguiTutteLeVerifiche
};