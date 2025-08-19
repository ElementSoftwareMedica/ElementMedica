const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '../prisma/schema.prisma');

// Backup dello schema
const backupPath = schemaPath + '.backup-' + Date.now();
fs.copyFileSync(schemaPath, backupPath);
console.log(`Backup creato: ${backupPath}`);

// Leggi il contenuto dello schema
let content = fs.readFileSync(schemaPath, 'utf8');

// Mappatura dei campi da convertire
const fieldMappings = {
  'created_at': 'createdAt',
  'updated_at': 'updatedAt', 
  'deleted_at': 'deletedAt',
  'employee_id': 'personId',
  'partecipante_id': 'personId',
  'nome_file': 'fileName',
  'url': 'fileUrl',
  'data_generazione': 'generatedAt',
  'ragione_sociale': 'ragioneSociale',
  'codice_fiscale': 'codiceFiscale',
  'partita_iva': 'partitaIva',
  'numero_telefono': 'numeroTelefono',
  'numero_cellulare': 'numeroCellulare',
  'data_nascita': 'dataNascita',
  'luogo_nascita': 'luogoNascita',
  'first_name': 'firstName',
  'last_name': 'lastName'
};

console.log('Inizio conversione campi snake_case...');

// Converti i nomi dei campi
for (const [snakeCase, camelCase] of Object.entries(fieldMappings)) {
  // Pattern per trovare il campo con eventuali spazi e tipo
  const fieldPattern = new RegExp(`(\\s+)${snakeCase}(\\s+)`, 'g');
  const matches = content.match(fieldPattern);
  
  if (matches) {
    console.log(`Convertendo ${snakeCase} -> ${camelCase} (${matches.length} occorrenze)`);
    content = content.replace(fieldPattern, `$1${camelCase}$2`);
  }
}

console.log('Rimozione @map superflui...');

// Rimuovi @map superflui per i campi convertiti
for (const [snakeCase, camelCase] of Object.entries(fieldMappings)) {
  // Rimuovi @map("snake_case") quando il campo è già camelCase
  const mapPattern = new RegExp(`@map\\("${snakeCase}"\\)`, 'g');
  const mapMatches = content.match(mapPattern);
  
  if (mapMatches) {
    console.log(`Rimuovendo @map("${snakeCase}") (${mapMatches.length} occorrenze)`);
    content = content.replace(mapPattern, '');
  }
}

// Pulisci spazi extra
content = content.replace(/\s+@map\("([^"]+)"\)\s*$/gm, '');
content = content.replace(/\s{2,}/g, ' ');
content = content.replace(/\n\s*\n\s*\n/g, '\n\n');

// Scrivi il file aggiornato
fs.writeFileSync(schemaPath, content);

console.log('\n✅ Conversione completata!');
console.log(`📁 Backup salvato in: ${backupPath}`);
console.log('🔄 Schema aggiornato con naming conventions corrette');