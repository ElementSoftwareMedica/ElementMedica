const prisma = new PrismaClient();

async function createSampleFormTemplates() {
  try {
    console.log('🔍 Creazione Form Templates di esempio...\n');

    // Trova l'admin per ottenere il tenantId
    const admin = await prisma.person.findUnique({
      where: { email: 'admin@example.com' }
    });

    if (!admin) {
      console.log('❌ Admin non trovato');
      return;
    }

    console.log(`👤 Admin trovato: ${admin.email} (Tenant: ${admin.tenantId})`);

    // Verifica se esistono già form templates
    const existingCount = await prisma.form_templates.count();
    console.log(`📋 Form Templates esistenti: ${existingCount}`);

    if (existingCount > 0) {
      console.log('✅ Form Templates già presenti nel database');
      
      // Mostra i template esistenti
      const templates = await prisma.form_templates.findMany({
        include: {
          form_fields: true
        }
      });

      templates.forEach((template, index) => {
        console.log(`${index + 1}. ${template.name} (${template.type})`);
        console.log(`   Attivo: ${template.isActive}`);
        console.log(`   Campi: ${template.form_fields.length}`);
      });
      
      return;
    }

    // Crea form templates di esempio
    console.log('\n📝 Creazione form templates di esempio...');

    const template1 = await prisma.form_templates.create({
      data: {
        id: 'template-course-info-001',
        name: 'Richiesta Informazioni Corso',
        description: 'Form per richiedere informazioni sui corsi di formazione',
        type: 'COURSE_ENROLLMENT',
        tenantId: admin.tenantId,
        schema: {
          type: 'object',
          properties: {
            nome: { type: 'string', title: 'Nome' },
            cognome: { type: 'string', title: 'Cognome' },
            email: { type: 'string', format: 'email', title: 'Email' },
            telefono: { type: 'string', title: 'Telefono' },
            azienda: { type: 'string', title: 'Azienda' },
            corso: { type: 'string', title: 'Corso di interesse' },
            messaggio: { type: 'string', title: 'Messaggio' }
          },
          required: ['nome', 'cognome', 'email', 'corso']
        },
        validationRules: {
          messaggio: { 'ui:widget': 'textarea' }
        },
        isActive: true,
        form_fields: {
          create: [
            { name: 'nome', label: 'Nome', type: 'text', required: true, order: 1 },
            { name: 'cognome', label: 'Cognome', type: 'text', required: true, order: 2 },
            { name: 'email', label: 'Email', type: 'email', required: true, order: 3 },
            { name: 'telefono', label: 'Telefono', type: 'tel', required: false, order: 4 },
            { name: 'azienda', label: 'Azienda', type: 'text', required: false, order: 5 },
            { name: 'corso', label: 'Corso di interesse', type: 'text', required: true, order: 6 },
            { name: 'messaggio', label: 'Messaggio', type: 'textarea', required: false, order: 7 }
          ]
        }
      }
    });

    const template2 = await prisma.form_templates.create({
      data: {
        id: 'template-course-feedback-001',
        name: 'Feedback Corso',
        description: 'Form per raccogliere feedback sui corsi completati',
        type: 'COURSE_EVALUATION',
        tenantId: admin.tenantId,
        schema: {
          type: 'object',
          properties: {
            nome: { type: 'string', title: 'Nome' },
            cognome: { type: 'string', title: 'Cognome' },
            email: { type: 'string', format: 'email', title: 'Email' },
            corso: { type: 'string', title: 'Corso frequentato' },
            valutazione: { type: 'integer', minimum: 1, maximum: 5, title: 'Valutazione (1-5)' },
            commenti: { type: 'string', title: 'Commenti' }
          },
          required: ['nome', 'cognome', 'email', 'corso', 'valutazione']
        },
        validationRules: {
          commenti: { 'ui:widget': 'textarea' },
          valutazione: { 'ui:widget': 'select' }
        },
        isActive: true,
        form_fields: {
          create: [
            { name: 'nome', label: 'Nome', type: 'text', required: true, order: 1 },
            { name: 'cognome', label: 'Cognome', type: 'text', required: true, order: 2 },
            { name: 'email', label: 'Email', type: 'email', required: true, order: 3 },
            { name: 'corso', label: 'Corso frequentato', type: 'text', required: true, order: 4 },
            { name: 'valutazione', label: 'Valutazione (1-5)', type: 'select', required: true, order: 5, options: JSON.stringify([{value: '1', label: '1'}, {value: '2', label: '2'}, {value: '3', label: '3'}, {value: '4', label: '4'}, {value: '5', label: '5'}]) },
            { name: 'commenti', label: 'Commenti', type: 'textarea', required: false, order: 6 }
          ]
        }
      }
    });

    const template3 = await prisma.form_templates.create({
      data: {
        id: 'template-job-application-001',
        name: 'Candidatura Lavoro',
        description: 'Form per candidature di lavoro',
        type: 'JOB_APPLICATION',
        tenantId: admin.tenantId,
        schema: {
          type: 'object',
          properties: {
            nome: { type: 'string', title: 'Nome' },
            cognome: { type: 'string', title: 'Cognome' },
            email: { type: 'string', format: 'email', title: 'Email' },
            telefono: { type: 'string', title: 'Telefono' },
            posizione: { type: 'string', title: 'Posizione di interesse' },
            esperienza: { type: 'string', title: 'Anni di esperienza' },
            cv: { type: 'string', title: 'Link CV o descrizione esperienza' },
            disponibilita: { type: 'string', title: 'Disponibilità' }
          },
          required: ['nome', 'cognome', 'email', 'posizione']
        },
        validationRules: {
          cv: { 'ui:widget': 'textarea' },
          disponibilita: { 'ui:widget': 'textarea' }
        },
        isActive: true,
        form_fields: {
          create: [
            { name: 'nome', label: 'Nome', type: 'text', required: true, order: 1 },
            { name: 'cognome', label: 'Cognome', type: 'text', required: true, order: 2 },
            { name: 'email', label: 'Email', type: 'email', required: true, order: 3 },
            { name: 'telefono', label: 'Telefono', type: 'tel', required: false, order: 4 },
            { name: 'posizione', label: 'Posizione di interesse', type: 'text', required: true, order: 5 },
            { name: 'esperienza', label: 'Anni di esperienza', type: 'text', required: false, order: 6 },
            { name: 'cv', label: 'Link CV o descrizione esperienza', type: 'textarea', required: false, order: 7 },
            { name: 'disponibilita', label: 'Disponibilità', type: 'textarea', required: false, order: 8 }
          ]
        }
      }
    });

    console.log(`✅ Creato template: ${template1.name}`);
    console.log(`✅ Creato template: ${template2.name}`);
    console.log(`✅ Creato template: ${template3.name}`);

    console.log('\n🎉 Form templates di esempio creati con successo!');

  } catch (error) {
    console.error('❌ Errore durante la creazione:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createSampleFormTemplates();