/**
 * Script per creare template di default per Lettere di Incarico
 * 
 * Esegui con: node backend/scripts/create-default-letter-template.js
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_TEMPLATE = {
  name: 'Lettera di Incarico Standard',
  type: 'LETTER_OF_ENGAGEMENT',
  fileFormat: 'HTML',
  description: 'Template standard per lettere di incarico formatori',
  category: 'Formazione',
  isActive: true,
  isDefault: true,
  version: 1,

  // Header della lettera
  header: `
    <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #333;">
      <h1 style="color: #333; font-size: 24px; margin-bottom: 10px;">
        {{tenant.name}}
      </h1>
      <p style="color: #666; font-size: 12px; margin: 5px 0;">
        {{tenant.address.street}} - {{tenant.address.city}} ({{tenant.address.province}}) - {{tenant.address.zip}}
      </p>
      <p style="color: #666; font-size: 12px; margin: 5px 0;">
        P.IVA: {{tenant.vatNumber}} | Email: {{tenant.email}}
        {{#if tenant.phone}} | Tel: {{tenant.phone}}{{/if}}
      </p>
    </div>
  `,

  // Contenuto principale
  content: `
    <div style="font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.6; color: #333;">
      
      <!-- Riferimenti lettera -->
      <div style="margin-bottom: 30px;">
        <p style="margin: 5px 0;"><strong>Data:</strong> {{current.date|date:DD/MM/YYYY}}</p>
        <p style="margin: 5px 0;"><strong>Protocollo:</strong> {{document.number}}</p>
        <p style="margin: 5px 0;"><strong>Oggetto:</strong> Incarico per attività di docenza</p>
      </div>

      <!-- Destinatario -->
      <div style="margin-bottom: 30px;">
        <p style="margin: 5px 0;"><strong>Spett.le</strong></p>
        <p style="margin: 5px 0;">{{trainer.fullName}}</p>
        <p style="margin: 5px 0;">C.F.: {{trainer.cf|cf}}</p>
        {{#if trainer.address}}
        <p style="margin: 5px 0;">{{trainer.address.street}}</p>
        <p style="margin: 5px 0;">{{trainer.address.zip}} {{trainer.address.city}} ({{trainer.address.province}})</p>
        {{/if}}
      </div>

      <!-- Corpo della lettera -->
      <div style="margin-bottom: 30px; text-align: justify;">
        <p style="margin-bottom: 15px;">
          Con la presente, Le confermiamo l'incarico per l'attività di <strong>docenza</strong> 
          relativa al corso di formazione di seguito dettagliato:
        </p>

        <!-- Dettagli corso -->
        <div style="background-color: #f5f5f5; padding: 20px; margin: 20px 0; border-left: 4px solid #007bff;">
          <p style="margin: 10px 0;"><strong>Titolo Corso:</strong> {{course.title}}</p>
          <p style="margin: 10px 0;"><strong>Codice Corso:</strong> {{course.code}}</p>
          <p style="margin: 10px 0;"><strong>Durata:</strong> {{course.duration}} ore</p>
          {{#if course.category}}
          <p style="margin: 10px 0;"><strong>Categoria:</strong> {{course.category}}</p>
          {{/if}}
          {{#if schedule}}
          <p style="margin: 10px 0;"><strong>Periodo:</strong> {{schedule.startDate|date:DD/MM/YYYY}} - {{schedule.endDate|date:DD/MM/YYYY}}</p>
          <p style="margin: 10px 0;"><strong>Sede:</strong> {{schedule.location}}</p>
          <p style="margin: 10px 0;"><strong>Modalità:</strong> {{schedule.modality}}</p>
          {{/if}}
        </div>

        <!-- Aziende coinvolte -->
        {{#if schedule.companies}}
        <p style="margin: 15px 0;">
          <strong>Aziende partecipanti:</strong>
        </p>
        <ul style="list-style-type: disc; padding-left: 20px;">
          {{#each schedule.companies}}
          <li>{{this.name}} ({{this.city}})</li>
          {{/each}}
        </ul>
        {{/if}}

        <!-- Condizioni incarico -->
        <p style="margin-top: 20px; margin-bottom: 15px;">
          L'incarico prevede lo svolgimento delle seguenti attività:
        </p>
        <ul style="list-style-type: disc; padding-left: 20px;">
          <li>Preparazione del materiale didattico</li>
          <li>Erogazione delle lezioni secondo il calendario concordato</li>
          <li>Valutazione dei partecipanti</li>
          <li>Compilazione dei registri presenze</li>
          <li>Rilascio degli attestati di partecipazione</li>
        </ul>

        <!-- Compenso (se specificato) -->
        {{#if schedule.trainerFee}}
        <p style="margin-top: 20px;">
          <strong>Compenso:</strong> € {{schedule.trainerFee|currency}} + IVA di legge
        </p>
        {{/if}}

        <p style="margin-top: 20px;">
          La preghiamo di confermare l'accettazione del presente incarico firmando 
          e restituendo copia della presente lettera.
        </p>

        <p style="margin-top: 20px;">
          Restiamo a disposizione per qualsiasi chiarimento.
        </p>
      </div>

      <!-- Firma -->
      <div style="margin-top: 50px;">
        <p style="margin: 5px 0;">Cordiali saluti,</p>
        <br>
        <p style="margin: 5px 0;"><strong>{{tenant.legalRepresentative}}</strong></p>
        <p style="margin: 5px 0; color: #666; font-size: 10pt;">
          {{tenant.legalRepresentativeRole}}
        </p>
      </div>

      <!-- Firma per accettazione -->
      <div style="margin-top: 80px; border-top: 1px solid #ccc; padding-top: 20px;">
        <p style="margin-bottom: 40px;"><strong>Per accettazione:</strong></p>
        <div style="display: flex; justify-content: space-between;">
          <div>
            <p style="margin: 5px 0;">Data: _______________</p>
          </div>
          <div>
            <p style="margin: 5px 0;">Firma: _______________</p>
          </div>
        </div>
      </div>
    </div>
  `,

  // Footer
  footer: `
    <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ccc; font-size: 9pt; color: #666;">
      <p style="margin: 5px 0;">
        {{tenant.name}} - {{tenant.address.street}}, {{tenant.address.zip}} {{tenant.address.city}} ({{tenant.address.province}})
      </p>
      <p style="margin: 5px 0;">
        P.IVA: {{tenant.vatNumber}} | Email: {{tenant.email}}
        {{#if tenant.website}} | Web: {{tenant.website}}{{/if}}
      </p>
      <p style="margin: 5px 0; font-size: 8pt; color: #999;">
        Documento generato automaticamente il {{current.date|date:DD/MM/YYYY}} alle {{current.time}}
      </p>
    </div>
  `,

  // Layout settings
  layout: {
    orientation: 'portrait',
    format: 'A4',
    margin: {
      top: '2cm',
      right: '2cm',
      bottom: '2cm',
      left: '2cm'
    }
  },

  // Styles
  styles: {
    fontSize: '11pt',
    fontFamily: 'Arial, sans-serif',
    lineHeight: '1.6',
    color: '#333'
  },

  // Marker configuration
  markers: [
    'tenant.name',
    'tenant.address.*',
    'tenant.vatNumber',
    'tenant.email',
    'tenant.phone',
    'tenant.legalRepresentative',
    'tenant.legalRepresentativeRole',
    'trainer.fullName',
    'trainer.cf',
    'trainer.email',
    'trainer.phone',
    'trainer.address.*',
    'course.title',
    'course.code',
    'course.duration',
    'course.category',
    'schedule.startDate',
    'schedule.endDate',
    'schedule.location',
    'schedule.modality',
    'schedule.companies',
    'schedule.trainerFee',
    'document.number',
    'current.date',
    'current.time'
  ],

  markerSchema: {
    required: ['trainer.fullName', 'trainer.cf', 'course.title', 'course.code'],
    optional: ['schedule.*', 'trainer.address.*']
  }
};

async function createDefaultTemplate() {
  try {
    console.log('📝 Creazione template di default per Lettere di Incarico...\n');

    // Get all tenants
    const tenants = await prisma.tenant.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true }
    });

    if (tenants.length === 0) {
      console.error('❌ Nessun tenant trovato nel database');
      process.exit(1);
    }

    console.log(`✅ Trovati ${tenants.length} tenant(s)`);

    let created = 0;
    let skipped = 0;

    for (const tenant of tenants) {
      // Check if default template already exists
      const existing = await prisma.templateLink.findFirst({
        where: {
          tenantId: tenant.id,
          type: 'LETTER_OF_ENGAGEMENT',
          isDefault: true,
          deletedAt: null
        }
      });

      if (existing) {
        console.log(`⏭️  Tenant "${tenant.name}": template già esistente (${existing.name})`);
        skipped++;
        continue;
      }

      // Create template for this tenant
      const template = await prisma.templateLink.create({
        data: {
          ...DEFAULT_TEMPLATE,
          url: '', // URL will be populated when template is actually used
          tenantId: tenant.id,
          tags: ['default', 'formazione', 'incarico']
        }
      });

      console.log(`✅ Tenant "${tenant.name}": template creato con ID ${template.id}`);
      created++;
    }

    console.log(`\n📊 Riepilogo:`);
    console.log(`   ✅ Creati: ${created}`);
    console.log(`   ⏭️  Saltati: ${skipped}`);
    console.log(`   📝 Totale tenant: ${tenants.length}\n`);

    console.log('✅ Script completato con successo!');
  } catch (error) {
    console.error('❌ Errore durante la creazione del template:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run script
createDefaultTemplate();
