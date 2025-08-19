import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mappatura dei campi snake_case da convertire
const FIELD_MAPPINGS = {
  'created_at': 'createdAt',
  'updated_at': 'updatedAt',
  'deleted_at': 'deletedAt',
  'codice_ateco': 'codiceAteco',
  'codice_fiscale': 'codiceFiscale',
  'persona_riferimento': 'personaRiferimento',
  'ragione_sociale': 'ragioneSociale',
  'sede_azienda': 'sedeAzienda',
  'subscription_plan': 'subscriptionPlan',
  'is_active': 'isActive',
  'first_name': 'firstName',
  'last_name': 'lastName',
  'hired_date': 'hiredDate',
  'birth_date': 'birthDate',
  'postal_code': 'postalCode',
  'residence_address': 'residenceAddress',
  'residence_city': 'residenceCity',
  'photo_url': 'photoUrl',
  'start_date': 'startDate',
  'end_date': 'endDate',
  'max_participants': 'maxParticipants',
  'delivery_mode': 'deliveryMode',
  'co_trainer': 'coTrainer',
  'employee_id': 'personId'
};

function convertSnakeCaseFields() {
  const schemaPath = path.join(__dirname, '../prisma/schema.prisma');
  
  console.log('🔄 Conversione campi snake_case...');
  
  // Backup
  const backupPath = schemaPath + '.backup-snake-case-' + Date.now();
  fs.copyFileSync(schemaPath, backupPath);
  console.log(`📦 Backup creato: ${backupPath}`);
  
  let content = fs.readFileSync(schemaPath, 'utf8');
  let changes = 0;
  
  // Converti ogni campo
  for (const [snakeCase, camelCase] of Object.entries(FIELD_MAPPINGS)) {
    // Pattern per trovare il campo (con spazi prima e dopo)
    const fieldPattern = new RegExp(`(\\s+)${snakeCase}(\\s+)`, 'g');
    
    if (content.match(fieldPattern)) {
      content = content.replace(fieldPattern, `$1${camelCase}$2`);
      console.log(`  ✅ ${snakeCase} → ${camelCase}`);
      changes++;
    }
  }
  
  // Rimuovi @map superflui dopo la conversione
  const mapPatterns = [
    /@map\("created_at"\)/g,
    /@map\("updated_at"\)/g,
    /@map\("deleted_at"\)/g,
    /@map\("employee_id"\)/g
  ];
  
  mapPatterns.forEach(pattern => {
    if (content.match(pattern)) {
      content = content.replace(pattern, '');
      console.log(`  🗑️  Rimosso @map superfluo`);
      changes++;
    }
  });
  
  // Salva il file modificato
  fs.writeFileSync(schemaPath, content);
  
  console.log(`\n✅ Conversione completata: ${changes} modifiche`);
  
  return changes;
}

// Esegui se chiamato direttamente
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    convertSnakeCaseFields();
    console.log('\n🎉 Conversione snake_case completata con successo!');
  } catch (error) {
    console.error('❌ Errore durante la conversione:', error.message);
    process.exit(1);
  }
}

export default convertSnakeCaseFields;