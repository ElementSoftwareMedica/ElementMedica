/**
 * Script per aggiornare i campi dei form templates esistenti nel database
 * Eseguire con: node backend/scripts/update-form-template-fields.cjs
 */

const { PrismaClient } = require('@prisma/client');
const { randomUUID } = require('crypto');
const prisma = new PrismaClient();

async function updateFormTemplateFields() {
    console.log('🔄 Aggiornamento campi form templates...\n');

    const tenant = await prisma.tenant.findFirst({
        where: { slug: { in: ['element-medica', 'default-company'] } }
    });

    if (!tenant) {
        console.log('⚠️  Nessun tenant trovato');
        await prisma.$disconnect();
        return;
    }

    console.log(`✅ Tenant trovato: ${tenant.name} (${tenant.id})\n`);

    // Definizione dei campi per ogni template
    const templatesConfig = {
        'Modulo Contatti': {
            settings: {
                sections: [
                    { id: 'section-main', order: 0, title: 'Informazioni di Contatto', collapsible: false, description: 'Compila i campi per contattarci' }
                ]
            },
            fields: [
                { name: 'fullName', label: 'Nome e Cognome', type: 'TEXT', required: true, order: 1, sectionId: 'section-main', placeholder: 'Es. Mario Rossi' },
                { name: 'email', label: 'Email', type: 'EMAIL', required: true, order: 2, sectionId: 'section-main', placeholder: 'Es. mario@esempio.it' },
                { name: 'phone', label: 'Telefono', type: 'tel', required: false, order: 3, sectionId: 'section-main', placeholder: 'Es. +39 123 456 7890' },
                { name: 'subject', label: 'Oggetto', type: 'TEXT', required: true, order: 4, sectionId: 'section-main', placeholder: 'Es. Richiesta informazioni' },
                { name: 'message', label: 'Messaggio', type: 'TEXTAREA', required: true, order: 5, sectionId: 'section-main', placeholder: 'Scrivi qui il tuo messaggio...' }
            ]
        },
        'Richiesta Preventivo Standard': {
            settings: {
                requiresApproval: true,
                notifyOnSubmission: true,
                expirationDays: 30,
                sections: [
                    { id: 'section-azienda', order: 0, title: 'Dati Azienda', collapsible: false, description: 'Informazioni sull\'azienda richiedente' },
                    { id: 'section-contatto', order: 1, title: 'Contatto Riferimento', collapsible: false, description: 'Persona da contattare' },
                    { id: 'section-richiesta', order: 2, title: 'Dettagli Richiesta', collapsible: false, description: 'Specifiche del servizio richiesto' }
                ]
            },
            fields: [
                { name: 'companyName', label: 'Ragione Sociale', type: 'TEXT', required: true, order: 1, sectionId: 'section-azienda', placeholder: 'Es. Acme S.r.l.' },
                { name: 'vatNumber', label: 'Partita IVA', type: 'TEXT', required: true, order: 2, sectionId: 'section-azienda', placeholder: 'Es. IT12345678901' },
                { name: 'contactPerson', label: 'Persona di Riferimento', type: 'TEXT', required: true, order: 1, sectionId: 'section-contatto', placeholder: 'Es. Mario Rossi' },
                { name: 'email', label: 'Email', type: 'EMAIL', required: true, order: 2, sectionId: 'section-contatto', placeholder: 'Es. mario@acme.it' },
                { name: 'phone', label: 'Telefono', type: 'TEXT', required: true, order: 3, sectionId: 'section-contatto', placeholder: 'Es. +39 02 1234567' },
                { name: 'serviceType', label: 'Tipo di Servizio', type: 'SELECT', required: true, options: ['Formazione Sicurezza', 'Nomina RSPP', 'Medicina del Lavoro', 'Consulenza DVR', 'Altro'], order: 1, sectionId: 'section-richiesta' },
                { name: 'numEmployees', label: 'Numero Dipendenti', type: 'NUMBER', required: true, order: 2, sectionId: 'section-richiesta', placeholder: 'Es. 50' },
                { name: 'riskLevel', label: 'Livello di Rischio', type: 'RADIO', required: true, options: ['Basso', 'Medio', 'Alto'], order: 3, sectionId: 'section-richiesta' },
                { name: 'description', label: 'Descrizione Richiesta', type: 'TEXTAREA', required: true, order: 4, sectionId: 'section-richiesta', placeholder: 'Descrivi la tua richiesta...' },
                { name: 'urgency', label: 'Urgenza', type: 'SELECT', required: false, options: ['Normale', 'Urgente', 'Molto Urgente'], order: 5, sectionId: 'section-richiesta' },
                { name: 'notes', label: 'Note Aggiuntive', type: 'TEXTAREA', required: false, order: 6, sectionId: 'section-richiesta', placeholder: 'Eventuali note...' }
            ]
        }
    };

    let updated = 0;
    let skipped = 0;

    for (const [templateName, config] of Object.entries(templatesConfig)) {
        const template = await prisma.form_templates.findFirst({
            where: { name: templateName, tenantId: tenant.id },
            include: { form_fields: true }
        });

        if (!template) {
            console.log(`⚠️  Template non trovato: ${templateName}`);
            continue;
        }

        if (template.form_fields.length > 0) {
            console.log(`⏭️  Template "${templateName}" ha già ${template.form_fields.length} campi - skip`);
            skipped++;
            continue;
        }

        console.log(`🔄 Aggiornamento template: ${templateName}...`);

        // Aggiorna settings
        await prisma.form_templates.update({
            where: { id: template.id },
            data: { settings: config.settings }
        });
        console.log(`   ✅ Settings aggiornate`);

        // Crea i campi
        for (const fieldData of config.fields) {
            await prisma.form_fields.create({
                data: {
                    id: randomUUID(),
                    templateId: template.id,
                    name: fieldData.name,
                    label: fieldData.label,
                    type: fieldData.type,
                    required: fieldData.required,
                    sectionId: fieldData.sectionId || null,
                    placeholder: fieldData.placeholder || null,
                    options: fieldData.options || null,
                    order: fieldData.order,
                    isActive: true
                }
            });
        }

        console.log(`   ✅ Aggiunti ${config.fields.length} campi`);
        updated++;
    }

    console.log(`\n📊 Risultato: ${updated} template aggiornati, ${skipped} skip\n`);

    // Verifica finale
    console.log('📋 Stato finale templates:');
    const templates = await prisma.form_templates.findMany({
        where: { tenantId: tenant.id },
        include: { form_fields: true }
    });

    templates.forEach(t => {
        console.log(`   - ${t.name}: ${t.form_fields.length} campi`);
    });

    await prisma.$disconnect();
    console.log('\n✅ Script completato!');
}

updateFormTemplateFields().catch(console.error);
