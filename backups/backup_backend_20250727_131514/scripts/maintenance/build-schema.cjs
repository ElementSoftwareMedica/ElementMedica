#!/usr/bin/env node

/**
 * Build Script per Schema Modulare
 * Combina tutti i moduli in un unico schema Prisma
 */

const fs = require('fs');
const path = require('path');

class SchemaBuild {
  constructor() {
    this.modulesDir = path.join(__dirname, '../prisma/modules');
    this.outputPath = path.join(__dirname, '../prisma/schema.prisma');
  }

  async build() {
    console.log('🔧 Building unified schema...');
    
    let unifiedSchema = '';
    
    // Aggiungi header
    unifiedSchema += this.getSchemaHeader();
    
    // Aggiungi enum da modulo enum
    const enumPath = path.join(this.modulesDir, 'enums/schema.prisma');
    if (fs.existsSync(enumPath)) {
      const enumContent = fs.readFileSync(enumPath, 'utf8');
      unifiedSchema += this.extractContent(enumContent);
    }
    
    // Aggiungi modelli da tutti i moduli
    const modules = fs.readdirSync(this.modulesDir)
      .filter(dir => dir !== 'enums' && fs.statSync(path.join(this.modulesDir, dir)).isDirectory());
    
    for (const module of modules) {
      const modulePath = path.join(this.modulesDir, module, 'schema.prisma');
      if (fs.existsSync(modulePath)) {
        const moduleContent = fs.readFileSync(modulePath, 'utf8');
        unifiedSchema += `\n// === MODULE: ${module.toUpperCase()} ===\n`;
        unifiedSchema += this.extractContent(moduleContent);
      }
    }
    
    // Salva schema unificato
    fs.writeFileSync(this.outputPath, unifiedSchema);
    
    console.log('✅ Schema unificato generato');
    console.log(`📁 Output: ${this.outputPath}`);
  }

  getSchemaHeader() {
    return `// === PRISMA SCHEMA UNIFICATO ===
// Generato automaticamente dal build script
// NON MODIFICARE DIRETTAMENTE - Editare i moduli in prisma/modules/

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

`;
  }

  extractContent(content) {
    // Rimuovi commenti header e mantieni solo definizioni
    return content
      .replace(//**[sS]*?*//g, '') // Rimuovi commenti block
      .replace(///.*$/gm, '') // Rimuovi commenti line
      .replace(/^s*$/gm, '') // Rimuovi righe vuote
      .trim() + '

';
  }
}

if (require.main === module) {
  const builder = new SchemaBuild();
  builder.build().catch(console.error);
}

module.exports = SchemaBuild;
