#!/usr/bin/env node
/**
 * Console.log Migration Script
 * Automatically replaces console.* with logger.* in production files
 * Phase 2.8: Console.log Migration
 */

const fs = require('fs');
const path = require('path');

// Files to process (HIGH PRIORITY - Production servers)
const filesToProcess = [
  'backend/servers/api-server.js',
  'backend/servers/proxy-server.js',
  'backend/servers/documents-server.js',
  'backend/src/server.js'
];

// Mapping rules
const replacementRules = [
  // console.error -> logger.error
  {
    pattern: /console\.error\(/g,
    replacement: 'logger.error(',
    type: 'error'
  },
  // console.warn -> logger.warn
  {
    pattern: /console\.warn\(/g,
    replacement: 'logger.warn(',
    type: 'warn'
  },
  // console.info -> logger.info
  {
    pattern: /console\.info\(/g,
    replacement: 'logger.info(',
    type: 'info'
  },
  // console.debug -> logger.debug
  {
    pattern: /console\.debug\(/g,
    replacement: 'logger.debug(',
    type: 'debug'
  },
  // console.log -> logger.info (startup messages, info level)
  {
    pattern: /console\.log\(/g,
    replacement: 'logger.info(',
    type: 'log->info'
  }
];

// Check if logger import exists
function hasLoggerImport(content) {
  return /import\s+.*logger.*from\s+['"].*logger/.test(content) ||
         /const\s+.*logger.*=\s+require\(['"].*logger/.test(content);
}

// Add logger import if missing
function addLoggerImport(content, filePath) {
  if (hasLoggerImport(content)) {
    return content;
  }
  
  // Find first import/require
  const firstImportMatch = content.match(/^(import\s+.+from\s+.+;?|const\s+.+require\(.+\);?)/m);
  
  if (firstImportMatch) {
    const loggerImport = "import logger from '../utils/logger.js';\n";
    return content.replace(firstImportMatch[0], firstImportMatch[0] + '\n' + loggerImport);
  }
  
  // If no imports, add at top
  return "import logger from '../utils/logger.js';\n\n" + content;
}

// Process single file
function processFile(filePath) {
  console.log(`\n📝 Processing: ${filePath}`);
  
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`   ⚠️  File not found, skipping`);
    return { processed: false, replacements: 0 };
  }
  
  let content = fs.readFileSync(fullPath, 'utf8');
  let replacements = 0;
  
  // Apply replacements
  replacementRules.forEach(rule => {
    const matches = content.match(rule.pattern);
    if (matches) {
      console.log(`   ✅ Found ${matches.length} ${rule.type} statements`);
      content = content.replace(rule.pattern, rule.replacement);
      replacements += matches.length;
    }
  });
  
  if (replacements > 0) {
    // Add logger import if needed
    content = addLoggerImport(content, filePath);
    
    // Write back
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`   ✨ Replaced ${replacements} statements`);
    return { processed: true, replacements };
  } else {
    console.log(`   ℹ️  No console.* found`);
    return { processed: false, replacements: 0 };
  }
}

// Main execution
console.log('🚀 Console.log Migration Script - Phase 2.8\n');
console.log('Target: Production servers (HIGH PRIORITY)\n');

let totalReplacements = 0;
let filesProcessed = 0;

filesToProcess.forEach(filePath => {
  const result = processFile(filePath);
  if (result.processed) {
    filesProcessed++;
    totalReplacements += result.replacements;
  }
});

console.log('\n' + '='.repeat(50));
console.log('📊 SUMMARY:');
console.log(`   Files processed: ${filesProcessed}/${filesToProcess.length}`);
console.log(`   Total replacements: ${totalReplacements}`);
console.log('='.repeat(50));

if (totalReplacements > 0) {
  console.log('\n✅ Migration complete! Remember to:');
  console.log('   1. Test the servers');
  console.log('   2. Verify logger output');
  console.log('   3. Commit changes');
  console.log('   4. Add ESLint rule: no-console');
}

process.exit(0);
