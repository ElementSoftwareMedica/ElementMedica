const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '../prisma/schema.prisma');

// Backup dello schema
const backupPath = schemaPath + '.backup-safe-' + Date.now();
fs.copyFileSync(schemaPath, backupPath);
console.log(`✅ Backup creato: ${backupPath}`);

// Leggi il contenuto dello schema
let content = fs.readFileSync(schemaPath, 'utf8');

console.log('🔄 Inizio conversione sicura dei campi snake_case...');

// Conversioni specifiche e sicure
const conversions = [
  // Rimuovi @map per campi già convertiti
  { from: /@map\("created_at"\)/g, to: '', desc: 'Rimozione @map("created_at")' },
  { from: /@map\("updated_at"\)/g, to: '', desc: 'Rimozione @map("updated_at")' },
  { from: /@map\("deleted_at"\)/g, to: '', desc: 'Rimozione @map("deleted_at")' },
  { from: /@map\("employee_id"\)/g, to: '', desc: 'Rimozione @map("employee_id")' },
  { from: /@map\("partecipante_id"\)/g, to: '', desc: 'Rimozione @map("partecipante_id")' },
  { from: /@map\("nome_file"\)/g, to: '', desc: 'Rimozione @map("nome_file")' },
  { from: /@map\("data_generazione"\)/g, to: '', desc: 'Rimozione @map("data_generazione")' },
  { from: /@map\("ragione_sociale"\)/g, to: '', desc: 'Rimozione @map("ragione_sociale")' },
  { from: /@map\("user_id"\)/g, to: '', desc: 'Rimozione @map("user_id")' },
  
  // Converti campi specifici mantenendo la struttura
  { from: /\s+url\s+String/g, to: ' fileUrl String', desc: 'url -> fileUrl' },
  { from: /\s+ragione_sociale\s+String/g, to: ' ragioneSociale String', desc: 'ragione_sociale -> ragioneSociale' },
  { from: /\s+codice_fiscale\s+String/g, to: ' codiceFiscale String', desc: 'codice_fiscale -> codiceFiscale' },
  { from: /\s+partita_iva\s+String/g, to: ' partitaIva String', desc: 'partita_iva -> partitaIva' },
  { from: /\s+data_nascita\s+DateTime/g, to: ' dataNascita DateTime', desc: 'data_nascita -> dataNascita' },
  { from: /\s+luogo_nascita\s+String/g, to: ' luogoNascita String', desc: 'luogo_nascita -> luogoNascita' },
  { from: /\s+numero_telefono\s+String/g, to: ' numeroTelefono String', desc: 'numero_telefono -> numeroTelefono' },
  { from: /\s+numero_cellulare\s+String/g, to: ' numeroCellulare String', desc: 'numero_cellulare -> numeroCellulare' },
  { from: /\s+first_name\s+String/g, to: ' firstName String', desc: 'first_name -> firstName' },
  { from: /\s+last_name\s+String/g, to: ' lastName String', desc: 'last_name -> lastName' },
  { from: /\s+nome_file\s+String/g, to: ' fileName String', desc: 'nome_file -> fileName' },
  { from: /\s+data_generazione\s+DateTime/g, to: ' generatedAt DateTime', desc: 'data_generazione -> generatedAt' }
];

let totalChanges = 0;

conversions.forEach(conversion => {
  const matches = content.match(conversion.from);
  if (matches && matches.length > 0) {
    console.log(`  ✓ ${conversion.desc} (${matches.length} occorrenze)`);
    content = content.replace(conversion.from, conversion.to);
    totalChanges += matches.length;
  }
});

// Pulisci spazi extra solo dove necessario
content = content.replace(/\s+@map\("[^"]+"\)\s*$/gm, '');
content = content.replace(/\s{3,}/g, '  '); // Riduci spazi multipli ma mantieni indentazione

// Scrivi il file aggiornato
fs.writeFileSync(schemaPath, content);

console.log(`\n🎉 Conversione completata!`);
console.log(`📊 Totale modifiche applicate: ${totalChanges}`);
console.log(`📁 Backup salvato in: ${backupPath}`);
console.log('🔄 Schema aggiornato con naming conventions corrette');