import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function createElementMedicaPages() {
  console.log('📄 Creando pagine per Element Medica...\n');

  const tenantMedica = await prisma.tenant.findUnique({
    where: { id: 'tenant-id-medica' }
  });

  if (!tenantMedica) {
    console.error('❌ Tenant Element Medica non trovato!');
    process.exit(1);
  }

  // Homepage - Focus su Medicina del Lavoro nel contesto poliambulatorio
  const existingHomepage = await prisma.cMSPage.findFirst({
    where: {
      slug: 'homepage-medica',
      tenantId: tenantMedica.id
    }
  });

  const homepage = existingHomepage || await prisma.cMSPage.create({
    data: {
      slug: 'homepage-medica',
      title: 'Element Medica - Poliambulatorio Specializzato in Medicina del Lavoro',
      content: `
        <div class="medical-hero bg-gradient-to-br from-cyan-50 to-green-50 py-20">
          <div class="container mx-auto px-4">
            <h1 class="text-5xl font-bold text-cyan-900 mb-6">
              Medicina del Lavoro & Servizi Specialistici
            </h1>
            <p class="text-xl text-cyan-700 mb-8 max-w-3xl">
              Poliambulatorio specializzato in medicina del lavoro, sorveglianza sanitaria e servizi medici aziendali. 
              Professionalità al servizio della salute dei lavoratori.
            </p>
            <div class="flex gap-4">
              <a href="/medicina-del-lavoro" class="btn-primary bg-cyan-600 hover:bg-cyan-700">
                Medicina del Lavoro
              </a>
              <a href="/contatti" class="btn-secondary border-cyan-600 text-cyan-600">
                Prenota Visita
              </a>
            </div>
          </div>
        </div>

        <div class="container mx-auto px-4 py-16">
          <h2 class="text-3xl font-bold text-gray-900 mb-12 text-center">I Nostri Servizi</h2>
          <div class="grid md:grid-cols-3 gap-8">
            <div class="service-card bg-white p-8 rounded-lg shadow-lg border-t-4 border-cyan-500">
              <h3 class="text-2xl font-bold text-cyan-900 mb-4">Medicina del Lavoro</h3>
              <ul class="space-y-2 text-gray-700">
                <li>✓ Visite mediche preventive e periodiche</li>
                <li>✓ Sorveglianza sanitaria ex D.Lgs 81/08</li>
                <li>✓ Idoneità alla mansione specifica</li>
                <li>✓ Protocolli sanitari personalizzati</li>
              </ul>
            </div>

            <div class="service-card bg-white p-8 rounded-lg shadow-lg border-t-4 border-green-500">
              <h3 class="text-2xl font-bold text-green-900 mb-4">Servizi Aziendali</h3>
              <ul class="space-y-2 text-gray-700">
                <li>✓ Consulenza medico-competente</li>
                <li>✓ Gestione emergenze sanitarie</li>
                <li>✓ Formazione primo soccorso</li>
                <li>✓ Valutazione rischi specifici</li>
              </ul>
            </div>

            <div class="service-card bg-white p-8 rounded-lg shadow-lg border-t-4 border-blue-500">
              <h3 class="text-2xl font-bold text-blue-900 mb-4">Specialità Mediche</h3>
              <ul class="space-y-2 text-gray-700">
                <li>✓ Cardiologia & ECG</li>
                <li>✓ Spirometria & esami respiratori</li>
                <li>✓ Audiometria</li>
                <li>✓ Esami di laboratorio</li>
              </ul>
            </div>
          </div>
        </div>

        <div class="bg-cyan-900 text-white py-16">
          <div class="container mx-auto px-4 text-center">
            <h2 class="text-3xl font-bold mb-6">Certificazioni e Qualità</h2>
            <p class="text-xl text-cyan-100 mb-8 max-w-3xl mx-auto">
              Struttura accreditata con personale medico specializzato. 
              Protocolli conformi alle normative vigenti in materia di salute e sicurezza sul lavoro.
            </p>
            <div class="flex justify-center gap-8">
              <div class="certification-badge">
                <span class="text-4xl font-bold">ISO 9001</span>
                <p class="text-cyan-200">Qualità Certificata</p>
              </div>
              <div class="certification-badge">
                <span class="text-4xl font-bold">D.Lgs 81/08</span>
                <p class="text-cyan-200">Conformità Normativa</p>
              </div>
            </div>
          </div>
        </div>
      `,
      status: 'published',
      seoTitle: 'Element Medica - Poliambulatorio Medicina del Lavoro',
      seoDescription: 'Poliambulatorio specializzato in medicina del lavoro, sorveglianza sanitaria e visite mediche aziendali. Certificazioni ISO 9001.',
      tenantId: tenantMedica.id
    }
  });

  console.log(`✅ Homepage creata: ${homepage.slug}`);

  // Medicina del Lavoro - Pagina dettagliata
  const existingMdl = await prisma.cMSPage.findFirst({
    where: { slug: 'medicina-del-lavoro-medica', tenantId: tenantMedica.id }
  });

  const medicinaLavoro = existingMdl || await prisma.cMSPage.create({
    data: {
      slug: 'medicina-del-lavoro-medica',
      title: 'Medicina del Lavoro - Sorveglianza Sanitaria Aziendale',
      content: `
        <div class="container mx-auto px-4 py-12">
          <h1 class="text-4xl font-bold text-cyan-900 mb-8">Medicina del Lavoro</h1>
          
          <div class="prose max-w-none">
            <p class="text-xl text-gray-700 mb-6">
              Il nostro poliambulatorio offre servizi completi di medicina del lavoro, garantendo la tutela della salute 
              dei lavoratori attraverso visite mediche preventive, periodiche e protocolli sanitari personalizzati.
            </p>

            <h2 class="text-3xl font-bold text-gray-900 mt-12 mb-6">Servizi Offerti</h2>
            
            <div class="grid md:grid-cols-2 gap-8 my-8">
              <div class="bg-cyan-50 p-6 rounded-lg">
                <h3 class="text-xl font-bold text-cyan-900 mb-4">Visite Preventive e Periodiche</h3>
                <p>Valutazione dell'idoneità alla mansione specifica secondo D.Lgs 81/08</p>
              </div>

              <div class="bg-green-50 p-6 rounded-lg">
                <h3 class="text-xl font-bold text-green-900 mb-4">Sorveglianza Sanitaria</h3>
                <p>Programmi di controllo continuo per esposizioni a rischi professionali</p>
              </div>

              <div class="bg-blue-50 p-6 rounded-lg">
                <h3 class="text-xl font-bold text-blue-900 mb-4">Esami Specialistici</h3>
                <p>Spirometria, audiometria, ECG, esami tossicologici e di laboratorio</p>
              </div>

              <div class="bg-purple-50 p-6 rounded-lg">
                <h3 class="text-xl font-bold text-purple-900 mb-4">Consulenza Medica</h3>
                <p>Supporto al datore di lavoro nella gestione della salute aziendale</p>
              </div>
            </div>

            <h2 class="text-3xl font-bold text-gray-900 mt-12 mb-6">Normativa di Riferimento</h2>
            <p>
              Operiamo in piena conformità con il D.Lgs 81/2008 (Testo Unico sulla Sicurezza sul Lavoro) e successive 
              modifiche. Il nostro team di medici competenti è regolarmente aggiornato sulle normative vigenti.
            </p>

            <div class="bg-cyan-900 text-white p-8 rounded-lg my-8">
              <h3 class="text-2xl font-bold mb-4">Richiedi una Consulenza</h3>
              <p class="mb-4">Contattaci per un preventivo personalizzato o per maggiori informazioni sui nostri servizi.</p>
              <a href="/contatti" class="inline-block bg-white text-cyan-900 px-6 py-3 rounded-lg font-bold hover:bg-cyan-50">
                Contattaci Ora
              </a>
            </div>
          </div>
        </div>
      `,
      status: 'published',
      seoTitle: 'Medicina del Lavoro - Element Medica Poliambulatorio',
      seoDescription: 'Servizi di medicina del lavoro, sorveglianza sanitaria e visite preventive conformi D.Lgs 81/08. Medici competenti specializzati.',
      tenantId: tenantMedica.id
    }
  });

  console.log(`✅ Pagina creata: ${medicinaLavoro.slug}`);

  // Contatti
  const existingContatti = await prisma.cMSPage.findFirst({
    where: { slug: 'contatti-medica', tenantId: tenantMedica.id }
  });

  const contatti = existingContatti || await prisma.cMSPage.create({
    data: {
      slug: 'contatti-medica',
      title: 'Contatti - Element Medica Poliambulatorio',
      content: `
        <div class="container mx-auto px-4 py-12">
          <h1 class="text-4xl font-bold text-cyan-900 mb-8">Contattaci</h1>
          
          <div class="grid md:grid-cols-2 gap-12">
            <div>
              <h2 class="text-2xl font-bold text-gray-900 mb-6">Informazioni di Contatto</h2>
              
              <div class="space-y-4">
                <div class="flex items-start gap-4">
                  <span class="text-cyan-600 text-xl">📍</span>
                  <div>
                    <h3 class="font-bold">Sede Principale</h3>
                    <p class="text-gray-700">Via Example, 123<br>00100 Roma</p>
                  </div>
                </div>

                <div class="flex items-start gap-4">
                  <span class="text-cyan-600 text-xl">📞</span>
                  <div>
                    <h3 class="font-bold">Telefono</h3>
                    <p class="text-gray-700">+39 06 1234567</p>
                  </div>
                </div>

                <div class="flex items-start gap-4">
                  <span class="text-cyan-600 text-xl">✉️</span>
                  <div>
                    <h3 class="font-bold">Email</h3>
                    <p class="text-gray-700">info@elementmedica.it</p>
                  </div>
                </div>

                <div class="flex items-start gap-4">
                  <span class="text-cyan-600 text-xl">🕐</span>
                  <div>
                    <h3 class="font-bold">Orari</h3>
                    <p class="text-gray-700">Lun-Ven: 8:00 - 18:00<br>Sab: 9:00 - 13:00</p>
                  </div>
                </div>
              </div>
            </div>

            <div class="bg-cyan-50 p-8 rounded-lg">
              <h2 class="text-2xl font-bold text-cyan-900 mb-6">Prenota una Visita</h2>
              <p class="text-gray-700 mb-6">
                Compila il form o contattaci telefonicamente per prenotare una visita medica o richiedere informazioni 
                sui nostri servizi di medicina del lavoro.
              </p>
              <a href="tel:+390612345 67" class="block bg-cyan-600 text-white text-center px-6 py-3 rounded-lg font-bold hover:bg-cyan-700 mb-4">
                Chiama Ora
              </a>
              <a href="mailto:info@elementmedica.it" class="block bg-white text-cyan-600 text-center px-6 py-3 rounded-lg font-bold border-2 border-cyan-600 hover:bg-cyan-50">
                Invia Email
              </a>
            </div>
          </div>
        </div>
      `,
      status: 'published',
      seoTitle: 'Contatti - Element Medica Poliambulatorio',
      seoDescription: 'Contatta Element Medica per prenotare visite di medicina del lavoro. Telefono, email, orari e sede.',
      tenantId: tenantMedica.id
    }
  });

  console.log(`✅ Pagina creata: ${contatti.slug}`);

  console.log('\n🎉 Pagine Element Medica create con successo!\n');
  console.log('📊 Pagine create:');
  console.log('   - homepage-medica');
  console.log('   - medicina-del-lavoro-medica');
  console.log('   - contatti-medica');
  console.log('\n✅ Testa su: http://localhost:5174');
  console.log('\n⚠️  NOTA: Aggiornare HomePage.tsx per usare homepage-medica su Element Medica');
}

createElementMedicaPages()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
