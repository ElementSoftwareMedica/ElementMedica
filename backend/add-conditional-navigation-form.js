/**
 * Script to add a test form with conditional navigation via option nextSectionId
 * This demonstrates how options can link to specific sections
 */

import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Adding test form with conditional navigation...\n');

  // Find tenant
  const tenant = await prisma.tenant.findFirst({
    where: { slug: { in: ['element-medica', 'default-company'] } }
  });

  if (!tenant) {
    throw new Error('❌ Tenant not found');
  }

  console.log(`✅ Found tenant: ${tenant.companyName}`);

  // Check if form already exists
  const existing = await prisma.form_templates.findFirst({
    where: { 
      name: 'Test Navigazione Condizionale',
      tenantId: tenant.id 
    }
  });

  if (existing) {
    console.log('⚠️  Form already exists, deleting old version...');
    await prisma.form_fields.deleteMany({
      where: { templateId: existing.id }
    });
    await prisma.form_templates.delete({
      where: { id: existing.id }
    });
  }

  // Create form template with sections
  const template = await prisma.form_templates.create({
    data: {
      id: 'test-conditional-nav',
      name: 'Test Navigazione Condizionale',
      description: 'Form dimostrativo con navigazione basata su opzioni. Le risposte portano a sezioni diverse.',
      type: 'CUSTOM_FORM',
      isPublic: true,
      allowAnonymous: true,
      settings: {
        sections: [
          { 
            id: 'section-1', 
            order: 0, 
            title: 'Domanda Iniziale', 
            description: 'Scegli un\'opzione per proseguire',
            collapsible: false 
          },
          { 
            id: 'section-2a', 
            order: 1, 
            title: 'Percorso A - Informazioni Personali', 
            description: 'Hai scelto l\'opzione A',
            collapsible: false 
          },
          { 
            id: 'section-2b', 
            order: 2, 
            title: 'Percorso B - Informazioni Aziendali', 
            description: 'Hai scelto l\'opzione B',
            collapsible: false 
          },
          { 
            id: 'section-3-advanced', 
            order: 3, 
            title: 'Sezione Avanzata', 
            description: 'Solo per chi sceglie il livello avanzato',
            collapsible: false 
          },
          { 
            id: 'section-final', 
            order: 4, 
            title: 'Conferma Finale', 
            description: 'Ultimi dettagli prima dell\'invio',
            collapsible: false 
          }
        ]
      },
      schema: {},
      isActive: true,
      version: 1,
      tenantId: tenant.id
    }
  });

  console.log(`✅ Created template: ${template.name}`);

  // Define fields with nextSectionId in options
  const fields = [
    // Section 1: Initial question with branching
    {
      id: crypto.randomUUID(),
      name: 'initialChoice',
      label: 'Che tipo di utente sei?',
      type: 'radio',
      required: true,
      sectionId: 'section-1',
      order: 1,
      options: [
        { 
          label: 'Opzione A - Privato', 
          value: 'private', 
          nextSectionId: 'section-2a' 
        },
        { 
          label: 'Opzione B - Azienda', 
          value: 'company', 
          nextSectionId: 'section-2b' 
        }
      ]
    },

    // Section 2A: Personal info
    {
      id: crypto.randomUUID(),
      name: 'namePersonal',
      label: 'Nome Completo',
      type: 'text',
      required: true,
      placeholder: 'Mario Rossi',
      sectionId: 'section-2a',
      order: 1
    },
    {
      id: crypto.randomUUID(),
      name: 'emailPersonal',
      label: 'Email Personale',
      type: 'email',
      required: true,
      placeholder: 'mario@example.com',
      sectionId: 'section-2a',
      order: 2
    },
    {
      id: crypto.randomUUID(),
      name: 'levelPersonal',
      label: 'Livello di Esperienza',
      type: 'select',
      required: true,
      sectionId: 'section-2a',
      order: 3,
      options: [
        { label: 'Base', value: 'basic', nextSectionId: 'section-final' },
        { label: 'Intermedio', value: 'intermediate', nextSectionId: 'section-final' },
        { label: 'Avanzato', value: 'advanced', nextSectionId: 'section-3-advanced' }
      ]
    },

    // Section 2B: Company info
    {
      id: crypto.randomUUID(),
      name: 'companyName',
      label: 'Ragione Sociale',
      type: 'text',
      required: true,
      placeholder: 'Acme S.r.l.',
      sectionId: 'section-2b',
      order: 1
    },
    {
      id: crypto.randomUUID(),
      name: 'companyVat',
      label: 'Partita IVA',
      type: 'text',
      required: true,
      placeholder: 'IT12345678901',
      sectionId: 'section-2b',
      order: 2
    },
    {
      id: crypto.randomUUID(),
      name: 'levelCompany',
      label: 'Dimensione Azienda',
      type: 'radio',
      required: true,
      sectionId: 'section-2b',
      order: 3,
      options: [
        { label: 'Piccola (1-10 dipendenti)', value: 'small', nextSectionId: 'section-final' },
        { label: 'Media (11-50 dipendenti)', value: 'medium', nextSectionId: 'section-final' },
        { label: 'Grande (50+ dipendenti)', value: 'large', nextSectionId: 'section-3-advanced' }
      ]
    },

    // Section 3: Advanced (conditional)
    {
      id: crypto.randomUUID(),
      name: 'advancedRequirements',
      label: 'Requisiti Speciali',
      type: 'textarea',
      required: false,
      placeholder: 'Descrivi eventuali requisiti particolari...',
      sectionId: 'section-3-advanced',
      order: 1
    },
    {
      id: crypto.randomUUID(),
      name: 'needsCertification',
      label: 'Necessiti di Certificazione?',
      type: 'radio',
      required: true,
      sectionId: 'section-3-advanced',
      order: 2,
      options: [
        { label: 'Sì', value: 'yes', nextSectionId: 'section-final' },
        { label: 'No', value: 'no', nextSectionId: 'section-final' }
      ]
    },

    // Section Final: Confirmation
    {
      id: crypto.randomUUID(),
      name: 'notes',
      label: 'Note Aggiuntive',
      type: 'textarea',
      required: false,
      placeholder: 'Eventuali note o commenti...',
      sectionId: 'section-final',
      order: 1
    },
    {
      id: crypto.randomUUID(),
      name: 'acceptPrivacy',
      label: 'Accetto la privacy policy',
      type: 'checkbox',
      required: true,
      sectionId: 'section-final',
      order: 2
    }
  ];

  // Create all fields
  for (const fieldData of fields) {
    await prisma.form_fields.create({
      data: {
        id: fieldData.id,
        templateId: template.id,
        name: fieldData.name,
        label: fieldData.label,
        type: fieldData.type,
        required: fieldData.required,
        sectionId: fieldData.sectionId,
        placeholder: fieldData.placeholder || null,
        options: fieldData.options || null,
        order: fieldData.order,
        isActive: true
      }
    });
    console.log(`  ✅ Created field: ${fieldData.label}`);
  }

  console.log('\n✨ Form created successfully!');
  console.log(`📋 Template ID: ${template.id}`);
  console.log(`🔗 Test URL: http://localhost:5173/form/${template.id}`);
  console.log('\n📊 Form Structure:');
  console.log('  Section 1: Initial choice');
  console.log('    → Option A (Private) → Section 2A');
  console.log('    → Option B (Company) → Section 2B');
  console.log('  Section 2A: Personal info');
  console.log('    → Basic/Intermediate → Section Final');
  console.log('    → Advanced → Section 3');
  console.log('  Section 2B: Company info');
  console.log('    → Small/Medium → Section Final');
  console.log('    → Large → Section 3');
  console.log('  Section 3: Advanced (conditional)');
  console.log('    → Always → Section Final');
  console.log('  Section Final: Confirmation & submit');
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch(async (e) => {
    console.error('\n❌ Error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
