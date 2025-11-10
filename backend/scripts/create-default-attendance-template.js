/**
 * Script per creare template di default per Registri Presenze
 * 
 * Crea un template professionale in formato landscape per
 * la registrazione delle presenze alle sessioni di corso
 * 
 * Usage: node backend/scripts/create-default-attendance-template.js
 */

import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger.js';

const prisma = new PrismaClient();

/**
 * Template HTML per Registro Presenze
 * Layout: A4 Landscape, tabellare
 */
const createAttendanceTemplate = () => {
  const header = `
<div style="border-bottom: 3px solid #2563eb; padding-bottom: 15px; margin-bottom: 20px;">
  <div style="display: flex; justify-content: space-between; align-items: flex-start;">
    <div style="flex: 1;">
      {{#if tenant.logoUrl}}
      <img src="{{tenant.logoUrl}}" alt="Logo" style="max-height: 60px; margin-bottom: 10px;" />
      {{/if}}
      <h1 style="margin: 0; font-size: 18px; color: #1e40af; font-weight: 700;">
        {{tenant.name}}
      </h1>
      <p style="margin: 5px 0 0 0; font-size: 11px; color: #64748b;">
        {{tenant.address.street}}, {{tenant.address.city}} {{tenant.address.postalCode}}<br/>
        {{#if tenant.vatNumber}}P.IVA: {{tenant.vatNumber}} - {{/if}}
        {{#if tenant.email}}Email: {{tenant.email}} - {{/if}}
        {{#if tenant.phone}}Tel: {{tenant.phone}}{{/if}}
      </p>
    </div>
    <div style="text-align: right;">
      <h2 style="margin: 0; font-size: 22px; color: #1e293b; font-weight: 700;">
        REGISTRO PRESENZE
      </h2>
      <p style="margin: 5px 0 0 0; font-size: 11px; color: #64748b;">
        N° {{document.number}}<br/>
        Data: {{current.date|formatDate}}
      </p>
    </div>
  </div>
</div>
`;

  const content = `
<div style="margin-bottom: 20px;">
  <!-- Informazioni Corso -->
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
    <tr>
      <td style="width: 25%; padding: 8px; background: #f8fafc; border: 1px solid #e2e8f0; font-weight: 600; font-size: 11px;">
        Corso:
      </td>
      <td style="width: 75%; padding: 8px; border: 1px solid #e2e8f0; font-size: 11px;">
        <strong>{{course.title}}</strong>
        {{#if course.code}}(Codice: {{course.code}}){{/if}}
      </td>
    </tr>
    <tr>
      <td style="padding: 8px; background: #f8fafc; border: 1px solid #e2e8f0; font-weight: 600; font-size: 11px;">
        Sessione:
      </td>
      <td style="padding: 8px; border: 1px solid #e2e8f0; font-size: 11px;">
        {{session.date|formatDate}} - Orario: {{session.start}} - {{session.end}}
        {{#if session.location}}| Sede: {{session.location}}{{/if}}
      </td>
    </tr>
    <tr>
      <td style="padding: 8px; background: #f8fafc; border: 1px solid #e2e8f0; font-weight: 600; font-size: 11px;">
        Formatore:
      </td>
      <td style="padding: 8px; border: 1px solid #e2e8f0; font-size: 11px;">
        {{trainer.fullName}}
        {{#if coTrainer.fullName}}<br/>Co-Formatore: {{coTrainer.fullName}}{{/if}}
      </td>
    </tr>
    {{#if schedule.companies}}
    <tr>
      <td style="padding: 8px; background: #f8fafc; border: 1px solid #e2e8f0; font-weight: 600; font-size: 11px;">
        Aziende:
      </td>
      <td style="padding: 8px; border: 1px solid #e2e8f0; font-size: 11px;">
        {{schedule.companies}}
      </td>
    </tr>
    {{/if}}
  </table>

  <!-- Tabella Presenze -->
  <h3 style="margin: 20px 0 10px 0; font-size: 14px; color: #1e293b; font-weight: 700; border-bottom: 2px solid #2563eb; padding-bottom: 5px;">
    Elenco Partecipanti
  </h3>
  
  <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
    <thead>
      <tr style="background: #1e40af; color: white;">
        <th style="padding: 10px 8px; text-align: left; border: 1px solid #1e40af; width: 5%;">
          #
        </th>
        <th style="padding: 10px 8px; text-align: left; border: 1px solid #1e40af; width: 20%;">
          Cognome
        </th>
        <th style="padding: 10px 8px; text-align: left; border: 1px solid #1e40af; width: 20%;">
          Nome
        </th>
        <th style="padding: 10px 8px; text-align: left; border: 1px solid #1e40af; width: 15%;">
          Codice Fiscale
        </th>
        <th style="padding: 10px 8px; text-align: center; border: 1px solid #1e40af; width: 10%;">
          Presente
        </th>
        <th style="padding: 10px 8px; text-align: center; border: 1px solid #1e40af; width: 8%;">
          Ore
        </th>
        <th style="padding: 10px 8px; text-align: center; border: 1px solid #1e40af; width: 22%;">
          Firma
        </th>
      </tr>
    </thead>
    <tbody>
      {{#each participants}}
      <tr style="{{#if @odd}}background: #f8fafc;{{/if}}">
        <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center;">
          {{@index|increment}}
        </td>
        <td style="padding: 8px; border: 1px solid #e2e8f0;">
          {{lastName}}
        </td>
        <td style="padding: 8px; border: 1px solid #e2e8f0;">
          {{firstName}}
        </td>
        <td style="padding: 8px; border: 1px solid #e2e8f0; font-family: monospace;">
          {{cf}}
        </td>
        <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center;">
          {{#if present}}✓{{else}}-{{/if}}
        </td>
        <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center;">
          {{#if hours}}{{hours}}{{else}}-{{/if}}
        </td>
        <td style="padding: 8px; border: 1px solid #e2e8f0; height: 30px;">
          <!-- Spazio per firma -->
        </td>
      </tr>
      {{/each}}
    </tbody>
    <tfoot>
      <tr style="background: #f1f5f9; font-weight: 600;">
        <td colspan="4" style="padding: 10px 8px; border: 1px solid #e2e8f0; text-align: right;">
          TOTALI:
        </td>
        <td style="padding: 10px 8px; border: 1px solid #e2e8f0; text-align: center;">
          {{attendance.totalPresent}} / {{attendance.totalParticipants}}
        </td>
        <td style="padding: 10px 8px; border: 1px solid #e2e8f0; text-align: center;">
          {{attendance.totalHours}}
        </td>
        <td style="padding: 10px 8px; border: 1px solid #e2e8f0;">
        </td>
      </tr>
    </tfoot>
  </table>

  <!-- Note -->
  {{#if session.notes}}
  <div style="margin-top: 15px; padding: 10px; background: #fef3c7; border-left: 4px solid #f59e0b; font-size: 10px;">
    <strong>Note:</strong> {{session.notes}}
  </div>
  {{/if}}
</div>
`;

  const footer = `
<div style="margin-top: 20px; padding-top: 15px; border-top: 2px solid #e2e8f0; font-size: 9px; color: #64748b;">
  <div style="display: flex; justify-content: space-between;">
    <div style="flex: 1;">
      <p style="margin: 0 0 5px 0;"><strong>Firma Formatore:</strong></p>
      <div style="border-bottom: 1px solid #cbd5e1; width: 200px; height: 40px;"></div>
      <p style="margin: 5px 0 0 0; font-size: 8px;">{{trainer.fullName}}</p>
    </div>
    <div style="text-align: right;">
      <p style="margin: 0;">
        Documento generato il {{current.date|formatDate}} alle {{current.time}}<br/>
        Sistema {{tenant.name}} - Registro Presenze N° {{document.number}}
      </p>
    </div>
  </div>
  <p style="margin: 15px 0 0 0; text-align: center; font-size: 8px; color: #94a3b8;">
    {{#if tenant.legalInfo}}{{tenant.legalInfo}}{{/if}}
  </p>
</div>
`;

  return {
    name: 'Registro Presenze Standard',
    type: 'ATTENDANCE_REGISTER',
    fileFormat: 'HTML',
    content,
    header,
    footer,
    description: 'Template standard per registri presenze sessioni corso in formato landscape',
    category: 'documenti-corso',
    tags: ['presenze', 'sessioni', 'corso', 'formazione'],
    isDefault: true,
    isActive: true,
    syncEnabled: false,
    layout: {
      pageSize: 'A4',
      orientation: 'landscape',
      margins: {
        top: '1.5cm',
        right: '1.5cm',
        bottom: '1.5cm',
        left: '1.5cm'
      }
    },
    styles: {
      fontFamily: 'Arial, sans-serif',
      fontSize: '11px',
      color: '#1e293b',
      lineHeight: '1.4'
    },
    markers: {
      tenant: ['name', 'logoUrl', 'address.*', 'vatNumber', 'email', 'phone', 'legalInfo'],
      course: ['title', 'code', 'duration', 'category'],
      schedule: ['startDate', 'endDate', 'location', 'modality', 'companies'],
      session: ['date', 'start', 'end', 'location', 'notes'],
      trainer: ['fullName', 'cf', 'email', 'phone'],
      coTrainer: ['fullName', 'cf', 'email', 'phone'],
      participants: ['firstName', 'lastName', 'cf', 'present', 'hours'],
      attendance: ['totalPresent', 'totalParticipants', 'totalHours'],
      document: ['number'],
      current: ['date', 'time']
    },
    markerSchema: {
      tenant: {
        type: 'object',
        description: 'Informazioni tenant/azienda',
        properties: {
          name: { type: 'string', description: 'Nome azienda' },
          logoUrl: { type: 'string', description: 'URL logo azienda' },
          'address.street': { type: 'string', description: 'Via' },
          'address.city': { type: 'string', description: 'Città' },
          'address.postalCode': { type: 'string', description: 'CAP' },
          'address.province': { type: 'string', description: 'Provincia' },
          vatNumber: { type: 'string', description: 'Partita IVA' },
          email: { type: 'string', description: 'Email' },
          phone: { type: 'string', description: 'Telefono' },
          legalInfo: { type: 'string', description: 'Informazioni legali' }
        }
      },
      course: {
        type: 'object',
        description: 'Informazioni corso',
        properties: {
          title: { type: 'string', description: 'Titolo corso' },
          code: { type: 'string', description: 'Codice corso' },
          duration: { type: 'number', description: 'Durata in ore' },
          category: { type: 'string', description: 'Categoria corso' }
        }
      },
      schedule: {
        type: 'object',
        description: 'Informazioni schedule',
        properties: {
          startDate: { type: 'date', description: 'Data inizio', formatters: ['formatDate'] },
          endDate: { type: 'date', description: 'Data fine', formatters: ['formatDate'] },
          location: { type: 'string', description: 'Sede corso' },
          modality: { type: 'string', description: 'Modalità (presenza/online/blended)' },
          companies: { type: 'string', description: 'Aziende partecipanti (lista)' }
        }
      },
      session: {
        type: 'object',
        description: 'Informazioni sessione',
        properties: {
          date: { type: 'date', description: 'Data sessione', formatters: ['formatDate'] },
          start: { type: 'string', description: 'Ora inizio (HH:mm)' },
          end: { type: 'string', description: 'Ora fine (HH:mm)' },
          location: { type: 'string', description: 'Sede sessione' },
          notes: { type: 'string', description: 'Note sessione' }
        }
      },
      trainer: {
        type: 'object',
        description: 'Informazioni formatore principale',
        properties: {
          fullName: { type: 'string', description: 'Nome completo formatore' },
          cf: { type: 'string', description: 'Codice fiscale' },
          email: { type: 'string', description: 'Email' },
          phone: { type: 'string', description: 'Telefono' }
        }
      },
      coTrainer: {
        type: 'object',
        description: 'Informazioni co-formatore (opzionale)',
        properties: {
          fullName: { type: 'string', description: 'Nome completo co-formatore' },
          cf: { type: 'string', description: 'Codice fiscale' },
          email: { type: 'string', description: 'Email' },
          phone: { type: 'string', description: 'Telefono' }
        }
      },
      participants: {
        type: 'array',
        description: 'Lista partecipanti alla sessione',
        items: {
          type: 'object',
          properties: {
            firstName: { type: 'string', description: 'Nome' },
            lastName: { type: 'string', description: 'Cognome' },
            cf: { type: 'string', description: 'Codice fiscale' },
            present: { type: 'boolean', description: 'Presente alla sessione' },
            hours: { type: 'number', description: 'Ore di presenza' }
          }
        }
      },
      attendance: {
        type: 'object',
        description: 'Statistiche presenze',
        properties: {
          totalPresent: { type: 'number', description: 'Numero presenti' },
          totalParticipants: { type: 'number', description: 'Totale partecipanti' },
          totalHours: { type: 'number', description: 'Totale ore' }
        }
      },
      document: {
        type: 'object',
        description: 'Metadati documento',
        properties: {
          number: { type: 'string', description: 'Numero progressivo registro' }
        }
      },
      current: {
        type: 'object',
        description: 'Data/ora corrente',
        properties: {
          date: { type: 'date', description: 'Data generazione', formatters: ['formatDate'] },
          time: { type: 'string', description: 'Ora generazione (HH:mm)' }
        }
      }
    }
  };
};

/**
 * Main execution
 */
async function main() {
  try {
    console.log('📝 Creazione template di default per Registri Presenze...\n');

    // Get all active tenants
    const tenants = await prisma.tenant.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true }
    });

    if (tenants.length === 0) {
      console.log('⚠️  Nessun tenant trovato nel sistema');
      return;
    }

    console.log(`✅ Trovati ${tenants.length} tenant(s)\n`);

    const templateData = createAttendanceTemplate();
    let created = 0;
    let skipped = 0;

    for (const tenant of tenants) {
      // Check if default template already exists
      const existing = await prisma.templateLink.findFirst({
        where: {
          tenantId: tenant.id,
          type: 'ATTENDANCE_REGISTER',
          isDefault: true,
          deletedAt: null
        }
      });

      if (existing) {
        console.log(`⏭️  Tenant "${tenant.name}": template di default già esistente (ID: ${existing.id})`);
        skipped++;
        continue;
      }

      // Create template
      const template = await prisma.templateLink.create({
        data: {
          ...templateData,
          url: '', // URL will be populated when template is actually used
          tenantId: tenant.id,
          version: 1
        }
      });

      console.log(`✅ Tenant "${tenant.name}": template creato con ID ${template.id}`);
      created++;
    }

    console.log('\n📊 Riepilogo:');
    console.log(`   ✅ Creati: ${created}`);
    console.log(`   ⏭️  Saltati: ${skipped}`);
    console.log(`   📝 Totale tenant: ${tenants.length}`);
    console.log('\n✅ Script completato con successo!');

  } catch (error) {
    console.error('\n❌ Errore durante la creazione del template:', error);
    logger.error('Script create-default-attendance-template failed', {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default main;
