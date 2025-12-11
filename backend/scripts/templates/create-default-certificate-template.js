/**
 * Script per creare template di default per Attestati (Certificates)
 * 
 * Questo script crea un template HTML elegante per attestati di partecipazione/completamento
 * utilizzando il Template Management System.
 * 
 * LAYOUT: Portrait A4 (210x297mm)
 * STYLE: Elegante, professionale, con bordo decorativo
 * 
 * MARKERS (8 gruppi, ~38 markers totali):
 * 1. tenant: Dati azienda (name, logoUrl, address.*, contact)
 * 2. person: Dati partecipante (fullName, cf, birthDate, birthPlace)
 * 3. course: Dati corso (title, code, duration, category, regulation)
 * 4. schedule: Dati pianificazione (startDate, endDate, location, totalHours)
 * 5. trainer: Dati formatore (fullName, qualifications)
 * 6. document: Metadati documento (number, date)
 * 7. current: Timestamp generazione (date, time, year)
 * 8. certificate: Specifici attestato (issueDate, validUntil, registrationNumber)
 */

import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger.js';

const prisma = new PrismaClient();

// Template HTML per attestato - Design elegante portrait
const CERTIFICATE_HTML_TEMPLATE = `
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Attestato di Partecipazione</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    @page {
      size: A4 portrait;
      margin: 0;
    }

    body {
      font-family: 'Georgia', 'Times New Roman', serif;
      font-size: 12pt;
      line-height: 1.6;
      color: #2c3e50;
      background: #ffffff;
      width: 210mm;
      height: 297mm;
      margin: 0;
      padding: 0;
      position: relative;
    }

    /* Decorative border */
    .certificate-border {
      position: absolute;
      top: 15mm;
      left: 15mm;
      right: 15mm;
      bottom: 15mm;
      border: 3pt solid #2c5f8d;
      border-radius: 5mm;
    }

    .certificate-border-inner {
      position: absolute;
      top: 18mm;
      left: 18mm;
      right: 18mm;
      bottom: 18mm;
      border: 1pt solid #5d8aa8;
    }

    /* Main container */
    .certificate-container {
      position: relative;
      width: 100%;
      height: 100%;
      padding: 25mm 30mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    /* Header with logo */
    .certificate-header {
      text-align: center;
      margin-bottom: 15mm;
    }

    .certificate-logo {
      max-width: 120px;
      max-height: 80px;
      margin-bottom: 5mm;
    }

    .certificate-title {
      font-family: 'Georgia', serif;
      font-size: 32pt;
      font-weight: bold;
      color: #2c5f8d;
      text-transform: uppercase;
      letter-spacing: 3pt;
      margin-bottom: 3mm;
      text-align: center;
    }

    .certificate-subtitle {
      font-size: 14pt;
      color: #5d8aa8;
      font-style: italic;
      margin-bottom: 8mm;
      text-align: center;
    }

    /* Body content */
    .certificate-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      text-align: center;
      padding: 0 10mm;
    }

    .certificate-text {
      font-size: 13pt;
      line-height: 2;
      margin-bottom: 5mm;
    }

    .certificate-recipient {
      font-family: 'Georgia', serif;
      font-size: 22pt;
      font-weight: bold;
      color: #2c3e50;
      margin: 5mm 0;
      padding: 3mm 0;
      border-bottom: 2pt solid #2c5f8d;
      display: inline-block;
      min-width: 60%;
    }

    .certificate-cf {
      font-size: 11pt;
      color: #7f8c8d;
      margin-top: 2mm;
      font-style: italic;
    }

    .certificate-course {
      font-size: 16pt;
      font-weight: bold;
      color: #2c5f8d;
      margin: 5mm 0;
      padding: 3mm;
      background: #f8f9fa;
      border-radius: 3mm;
    }

    .certificate-details {
      font-size: 11pt;
      line-height: 1.8;
      margin: 5mm 0;
      text-align: left;
      display: inline-block;
    }

    .certificate-details-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 2mm;
      min-width: 400px;
    }

    .certificate-details-label {
      font-weight: bold;
      color: #5d8aa8;
      min-width: 150px;
    }

    .certificate-details-value {
      text-align: right;
      flex: 1;
    }

    /* Footer with signatures */
    .certificate-footer {
      margin-top: 10mm;
    }

    .certificate-signatures {
      display: flex;
      justify-content: space-around;
      margin: 10mm 0 5mm 0;
    }

    .certificate-signature {
      text-align: center;
      min-width: 150px;
    }

    .certificate-signature-line {
      border-top: 1pt solid #2c3e50;
      margin-bottom: 2mm;
      padding-top: 15mm;
    }

    .certificate-signature-name {
      font-size: 11pt;
      font-weight: bold;
      margin-bottom: 1mm;
    }

    .certificate-signature-role {
      font-size: 9pt;
      color: #7f8c8d;
      font-style: italic;
    }

    /* Registration info */
    .certificate-registration {
      text-align: center;
      font-size: 9pt;
      color: #95a5a6;
      margin-top: 5mm;
      padding-top: 3mm;
      border-top: 1pt solid #ecf0f1;
    }

    .certificate-qr {
      text-align: center;
      margin-top: 3mm;
    }

    /* Company info footer */
    .certificate-company-footer {
      text-align: center;
      font-size: 8pt;
      color: #95a5a6;
      margin-top: 3mm;
      line-height: 1.4;
    }

    /* Decoration elements */
    .certificate-decoration {
      position: absolute;
      width: 20mm;
      height: 20mm;
      border: 2pt solid #5d8aa8;
      border-radius: 50%;
    }

    .decoration-top-left {
      top: 20mm;
      left: 20mm;
      border-right: none;
      border-bottom: none;
    }

    .decoration-top-right {
      top: 20mm;
      right: 20mm;
      border-left: none;
      border-bottom: none;
    }

    .decoration-bottom-left {
      bottom: 20mm;
      left: 20mm;
      border-right: none;
      border-top: none;
    }

    .decoration-bottom-right {
      bottom: 20mm;
      right: 20mm;
      border-left: none;
      border-top: none;
    }

    /* Print optimization */
    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  <!-- Decorative borders -->
  <div class="certificate-border"></div>
  <div class="certificate-border-inner"></div>
  
  <!-- Corner decorations -->
  <div class="certificate-decoration decoration-top-left"></div>
  <div class="certificate-decoration decoration-top-right"></div>
  <div class="certificate-decoration decoration-bottom-left"></div>
  <div class="certificate-decoration decoration-bottom-right"></div>

  <div class="certificate-container">
    <!-- Header -->
    <div class="certificate-header">
      {{#if tenant.logoUrl}}
      <img src="{{tenant.logoUrl}}" alt="{{tenant.name}}" class="certificate-logo">
      {{/if}}
      
      <div class="certificate-title">Attestato</div>
      <div class="certificate-subtitle">di Partecipazione e Completamento</div>
    </div>

    <!-- Body -->
    <div class="certificate-body">
      <div class="certificate-text">
        Si certifica che
      </div>

      <div class="certificate-recipient">
        {{person.fullName}}
      </div>
      
      {{#if person.cf}}
      <div class="certificate-cf">
        C.F. {{person.cf}}
      </div>
      {{/if}}

      <div class="certificate-text">
        ha partecipato con profitto al corso di formazione
      </div>

      <div class="certificate-course">
        {{course.title}}
      </div>

      {{#if course.code}}
      <div style="font-size: 10pt; color: #7f8c8d; margin-top: -3mm; margin-bottom: 3mm;">
        Codice corso: {{course.code}}
      </div>
      {{/if}}

      <div class="certificate-details">
        <div class="certificate-details-row">
          <span class="certificate-details-label">Durata:</span>
          <span class="certificate-details-value">{{course.duration}} ore</span>
        </div>
        
        {{#if schedule.startDate}}
        <div class="certificate-details-row">
          <span class="certificate-details-label">Periodo:</span>
          <span class="certificate-details-value">dal {{schedule.startDate|date}} al {{schedule.endDate|date}}</span>
        </div>
        {{/if}}

        {{#if schedule.location}}
        <div class="certificate-details-row">
          <span class="certificate-details-label">Sede:</span>
          <span class="certificate-details-value">{{schedule.location}}</span>
        </div>
        {{/if}}

        {{#if course.category}}
        <div class="certificate-details-row">
          <span class="certificate-details-label">Categoria:</span>
          <span class="certificate-details-value">{{course.category}}</span>
        </div>
        {{/if}}

        {{#if course.regulation}}
        <div class="certificate-details-row">
          <span class="certificate-details-label">Normativa:</span>
          <span class="certificate-details-value">{{course.regulation}}</span>
        </div>
        {{/if}}

        {{#if certificate.validUntil}}
        <div class="certificate-details-row">
          <span class="certificate-details-label">Validità:</span>
          <span class="certificate-details-value">fino al {{certificate.validUntil|date}}</span>
        </div>
        {{/if}}
      </div>
    </div>

    <!-- Footer with signatures -->
    <div class="certificate-footer">
      <div class="certificate-signatures">
        <!-- Trainer signature -->
        {{#if trainer.fullName}}
        <div class="certificate-signature">
          <div class="certificate-signature-line"></div>
          <div class="certificate-signature-name">{{trainer.fullName}}</div>
          <div class="certificate-signature-role">Docente del corso</div>
        </div>
        {{/if}}

        <!-- Company representative signature -->
        <div class="certificate-signature">
          <div class="certificate-signature-line"></div>
          <div class="certificate-signature-name">{{tenant.legalRepresentative}}</div>
          <div class="certificate-signature-role">Rappresentante Legale</div>
        </div>
      </div>

      <!-- Registration info -->
      <div class="certificate-registration">
        {{#if document.number}}
        Attestato N° {{document.number}} rilasciato in data {{current.date|date}}
        {{else}}
        Attestato rilasciato in data {{current.date|date}}
        {{/if}}
        {{#if certificate.registrationNumber}}
        <br>Numero di registrazione: {{certificate.registrationNumber}}
        {{/if}}
      </div>

      <!-- Company footer info -->
      <div class="certificate-company-footer">
        {{tenant.name}}
        {{#if tenant.address.street}}
        <br>{{tenant.address.street}}, {{tenant.address.city}} {{tenant.address.zipCode}} ({{tenant.address.province}})
        {{/if}}
        {{#if tenant.email}}
        <br>Email: {{tenant.email}} 
        {{/if}}
        {{#if tenant.phone}}
        | Tel: {{tenant.phone}}
        {{/if}}
        {{#if tenant.vatNumber}}
        <br>P.IVA: {{tenant.vatNumber}}
        {{/if}}
      </div>
    </div>
  </div>
</body>
</html>
`;

// Definizione markers per attestato
const CERTIFICATE_MARKERS = {
  // Gruppo 1: Tenant (azienda)
  tenant: {
    name: { type: 'string', description: 'Nome azienda', example: 'Element Software Medica S.r.l.' },
    logoUrl: { type: 'string', description: 'URL logo azienda', example: 'https://example.com/logo.png' },
    'address.street': { type: 'string', description: 'Indirizzo via', example: 'Via Roma 123' },
    'address.city': { type: 'string', description: 'Città', example: 'Milano' },
    'address.zipCode': { type: 'string', description: 'CAP', example: '20100' },
    'address.province': { type: 'string', description: 'Provincia', example: 'MI' },
    vatNumber: { type: 'string', description: 'Partita IVA', example: '12345678901' },
    email: { type: 'string', description: 'Email aziendale', example: 'info@example.com' },
    phone: { type: 'string', description: 'Telefono aziendale', example: '+39 02 1234567' },
    legalRepresentative: { type: 'string', description: 'Rappresentante legale', example: 'Dr. Mario Rossi' }
  },

  // Gruppo 2: Person (partecipante)
  person: {
    fullName: { type: 'string', description: 'Nome completo partecipante', example: 'Mario Rossi' },
    firstName: { type: 'string', description: 'Nome partecipante', example: 'Mario' },
    lastName: { type: 'string', description: 'Cognome partecipante', example: 'Rossi' },
    cf: { type: 'string', description: 'Codice fiscale', example: 'RSSMRA80A01H501X' },
    birthDate: { type: 'date', description: 'Data di nascita', example: '1980-01-01' },
    birthPlace: { type: 'string', description: 'Luogo di nascita', example: 'Roma' }
  },

  // Gruppo 3: Course (corso)
  course: {
    title: { type: 'string', description: 'Titolo corso', example: 'Corso di Primo Soccorso' },
    code: { type: 'string', description: 'Codice corso', example: 'PS-2024-001' },
    duration: { type: 'number', description: 'Durata in ore', example: '12' },
    category: { type: 'string', description: 'Categoria corso', example: 'Sicurezza sul Lavoro' },
    regulation: { type: 'string', description: 'Normativa di riferimento', example: 'D.Lgs. 81/2008' },
    validityYears: { type: 'number', description: 'Anni di validità', example: '3' },
    description: { type: 'string', description: 'Descrizione breve corso', example: 'Corso base di primo soccorso aziendale' }
  },

  // Gruppo 4: Schedule (pianificazione)
  schedule: {
    startDate: { type: 'date', description: 'Data inizio', example: '2024-11-01' },
    endDate: { type: 'date', description: 'Data fine', example: '2024-11-05' },
    location: { type: 'string', description: 'Sede corso', example: 'Milano - Sede Centrale' },
    totalHours: { type: 'number', description: 'Ore totali effettive', example: '12' },
    modality: { type: 'string', description: 'Modalità erogazione', example: 'In presenza' },
    notes: { type: 'string', description: 'Note aggiuntive', example: '' }
  },

  // Gruppo 5: Trainer (formatore)
  trainer: {
    fullName: { type: 'string', description: 'Nome completo formatore', example: 'Dr. Luigi Bianchi' },
    qualifications: { type: 'string', description: 'Qualifiche formatore', example: 'Medico specialista in medicina del lavoro' },
    cf: { type: 'string', description: 'CF formatore', example: 'BNCLGU75M15H501Y' },
    email: { type: 'string', description: 'Email formatore', example: 'l.bianchi@example.com' }
  },

  // Gruppo 6: Document (metadati documento)
  document: {
    number: { type: 'string', description: 'Numero progressivo attestato', example: '123/2024' },
    date: { type: 'date', description: 'Data emissione', example: '2024-11-05' }
  },

  // Gruppo 7: Current (timestamp generazione)
  current: {
    date: { type: 'date', description: 'Data corrente', example: '2024-11-04' },
    time: { type: 'string', description: 'Ora corrente', example: '14:30' },
    year: { type: 'number', description: 'Anno corrente', example: '2024' }
  },

  // Gruppo 8: Certificate (dati specifici attestato)
  certificate: {
    issueDate: { type: 'date', description: 'Data rilascio', example: '2024-11-05' },
    validUntil: { type: 'date', description: 'Valido fino al', example: '2027-11-05' },
    registrationNumber: { type: 'string', description: 'Numero di registrazione/protocollo', example: 'REG/2024/000123' }
  }
};

/**
 * Crea template di default per attestati
 */
async function createDefaultCertificateTemplates() {
  try {
    logger.info('🎓 Inizio creazione template attestati di default...');

    // Get tutti i tenants
    const tenants = await prisma.tenant.findMany({
      where: { deletedAt: null }
    });

    if (tenants.length === 0) {
      logger.warn('⚠️  Nessun tenant trovato. Impossibile creare template.');
      return;
    }

    logger.info(`📋 Trovati ${tenants.length} tenant(s)`);

    let createdCount = 0;
    let skippedCount = 0;

    for (const tenant of tenants) {
      logger.info(`\n🏢 Elaborazione tenant: ${tenant.name} (${tenant.id})`);

      // Verifica se esiste già un template di default per CERTIFICATE
      const existingTemplate = await prisma.templateLink.findFirst({
        where: {
          tenantId: tenant.id,
          type: 'CERTIFICATE',
          isDefault: true,
          deletedAt: null
        }
      });

      if (existingTemplate) {
        logger.info(`   ⏭️  Template CERTIFICATE di default già esistente (ID: ${existingTemplate.id})`);
        skippedCount++;
        continue;
      }

      // Crea nuovo template
      const template = await prisma.templateLink.create({
        data: {
          name: 'Attestato Standard',
          type: 'CERTIFICATE',
          fileFormat: 'HTML',
          isDefault: true,
          url: '', // URL vuoto per template HTML embedded
          content: CERTIFICATE_HTML_TEMPLATE,
          markers: CERTIFICATE_MARKERS,
          markerSchema: {
            version: '1.0',
            groups: Object.keys(CERTIFICATE_MARKERS),
            totalMarkers: Object.values(CERTIFICATE_MARKERS).reduce(
              (sum, group) => sum + Object.keys(group).length,
              0
            ),
            description: 'Template elegante portrait A4 per attestati di partecipazione/completamento',
            layout: 'portrait',
            pageSize: 'A4',
            features: [
              'Bordo decorativo elegante',
              'Logo azienda in header',
              'Design professionale con serif font',
              'Dettagli corso tabellari',
              'Area firme formatore e rappresentante legale',
              'Numero progressivo e registrazione',
              'Footer con dati azienda completi'
            ]
          },
          description: 'Template elegante per attestati di partecipazione ai corsi. Layout portrait A4 con design professionale, bordo decorativo, area per logo aziendale e firme.',
          category: 'certificates',
          tags: ['attestato', 'certificate', 'partecipazione', 'completamento', 'formazione'],
          version: 1,
          isActive: true,
          tenantId: tenant.id
        }
      });

      logger.info(`   ✅ Template creato con ID: ${template.id}`);
      logger.info(`      - Nome: ${template.name}`);
      logger.info(`      - Tipo: ${template.type}`);
      logger.info(`      - Formato: ${template.fileFormat}`);
      logger.info(`      - Markers: ${Object.values(CERTIFICATE_MARKERS).reduce((sum, g) => sum + Object.keys(g).length, 0)} totali in ${Object.keys(CERTIFICATE_MARKERS).length} gruppi`);
      logger.info(`      - Default: ${template.isDefault}`);
      logger.info(`      - Versione: ${template.version}`);

      createdCount++;
    }

    logger.info(`\n✅ Creazione completata!`);
    logger.info(`   📊 Template creati: ${createdCount}`);
    logger.info(`   ⏭️  Template già esistenti: ${skippedCount}`);
    logger.info(`   📝 Totale tenant elaborati: ${tenants.length}`);

  } catch (error) {
    logger.error('❌ Errore durante la creazione dei template:', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Esegui lo script
createDefaultCertificateTemplates()
  .then(() => {
    logger.info('\n🎉 Script completato con successo!');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('\n💥 Script terminato con errore:', error);
    process.exit(1);
  });
