import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function createRemainingMedicaPages() {
  console.log('📄 Creando pagine rimanenti per Element Medica...\n');

  const tenantMedica = await prisma.tenant.findUnique({
    where: { id: 'tenant-id-medica' }
  });

  if (!tenantMedica) {
    console.error('❌ Tenant Element Medica non trovato!');
    process.exit(1);
  }

  // Chi Siamo
  const existingChiSiamo = await prisma.cMSPage.findFirst({
    where: { slug: 'chi-siamo-medica', tenantId: tenantMedica.id }
  });

  if (!existingChiSiamo) {
    await prisma.cMSPage.create({
      data: {
        slug: 'chi-siamo-medica',
        title: 'Chi Siamo - Element Medica Poliambulatorio',
        content: `
          <div class="container mx-auto px-4 py-12">
            <h1 class="text-4xl font-bold text-cyan-900 mb-8">Chi Siamo</h1>
            
            <div class="prose max-w-none">
              <p class="text-xl text-gray-700 mb-6">
                Element Medica è un poliambulatorio specializzato che pone al centro la medicina del lavoro 
                e la salute dei lavoratori, affiancando un'offerta completa di visite specialistiche e diagnostica.
              </p>

              <div class="bg-cyan-50 p-8 rounded-lg my-8">
                <h2 class="text-3xl font-bold text-cyan-900 mb-4">La Nostra Missione</h2>
                <p class="text-gray-700 text-lg">
                  Garantire la salute e la sicurezza dei lavoratori attraverso protocolli medici d'eccellenza, 
                  tecnologie avanzate e un team di professionisti altamente qualificati.
                </p>
              </div>

              <h2 class="text-3xl font-bold text-gray-900 mt-12 mb-6">I Nostri Valori</h2>
              
              <div class="grid md:grid-cols-2 gap-6 my-8">
                <div class="bg-white p-6 rounded-lg shadow-md border-l-4 border-cyan-500">
                  <h3 class="text-xl font-bold text-cyan-900 mb-3">Professionalità</h3>
                  <p class="text-gray-700">Medici specializzati con esperienza pluriennale in medicina del lavoro</p>
                </div>

                <div class="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
                  <h3 class="text-xl font-bold text-green-900 mb-3">Tecnologia</h3>
                  <p class="text-gray-700">Strumentazione diagnostica all'avanguardia per esami precisi</p>
                </div>

                <div class="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
                  <h3 class="text-xl font-bold text-blue-900 mb-3">Rapidità</h3>
                  <p class="text-gray-700">Tempi di attesa ridotti e prenotazioni online disponibili</p>
                </div>

                <div class="bg-white p-6 rounded-lg shadow-md border-l-4 border-purple-500">
                  <h3 class="text-xl font-bold text-purple-900 mb-3">Conformità</h3>
                  <p class="text-gray-700">Protocolli conformi a D.Lgs 81/08 e normative vigenti</p>
                </div>
              </div>

              <h2 class="text-3xl font-bold text-gray-900 mt-12 mb-6">Il Nostro Team</h2>
              <p class="text-gray-700 mb-4">
                Il nostro staff è composto da medici del lavoro, specialisti in varie discipline mediche, 
                infermieri professionali e personale amministrativo dedicato.
              </p>
              <p class="text-gray-700">
                Ogni membro del team è costantemente aggiornato sulle ultime normative e pratiche mediche 
                per garantire il massimo livello di servizio.
              </p>

              <div class="bg-cyan-900 text-white p-8 rounded-lg my-8">
                <h3 class="text-2xl font-bold mb-4">Vuoi Saperne di Più?</h3>
                <p class="mb-4">Contattaci per conoscere meglio i nostri servizi e il nostro team.</p>
                <a href="/contatti" class="inline-block bg-white text-cyan-900 px-6 py-3 rounded-lg font-bold hover:bg-cyan-50">
                  Contattaci Ora
                </a>
              </div>
            </div>
          </div>
        `,
        status: 'published',
        isPublished: true,
        seoTitle: 'Chi Siamo - Element Medica Poliambulatorio Milano',
        seoDescription: 'Scopri Element Medica: poliambulatorio specializzato in medicina del lavoro con team qualificato, tecnologie avanzate e servizi completi.',
        tenantId: tenantMedica.id
      }
    });
    console.log('✅ Pagina creata: chi-siamo-medica');
  } else {
    console.log('⏭️  Pagina già esistente: chi-siamo-medica');
  }

  // Visite Specialistiche
  const existingVisite = await prisma.cMSPage.findFirst({
    where: { slug: 'visite-specialistiche', tenantId: tenantMedica.id }
  });

  if (!existingVisite) {
    await prisma.cMSPage.create({
      data: {
        slug: 'visite-specialistiche',
        title: 'Visite Specialistiche - Element Medica',
        content: `
          <div class="container mx-auto px-4 py-12">
            <h1 class="text-4xl font-bold text-cyan-900 mb-8">Visite Specialistiche</h1>
            
            <p class="text-xl text-gray-700 mb-12">
              Il nostro poliambulatorio offre un'ampia gamma di visite specialistiche con medici qualificati 
              e strumentazione moderna.
            </p>

            <div class="grid md:grid-cols-3 gap-8">
              <div class="bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
                <div class="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center mb-4">
                  <span class="text-white text-2xl">🫀</span>
                </div>
                <h3 class="text-xl font-bold text-gray-900 mb-3">Cardiologia</h3>
                <p class="text-gray-600 mb-4">Visite cardiologiche complete, ECG, holter, test da sforzo</p>
                <ul class="text-sm text-gray-700 space-y-1">
                  <li>✓ Elettrocardiogramma</li>
                  <li>✓ Ecocardiogramma</li>
                  <li>✓ Holter 24h</li>
                </ul>
              </div>

              <div class="bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
                <div class="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mb-4">
                  <span class="text-white text-2xl">🫁</span>
                </div>
                <h3 class="text-xl font-bold text-gray-900 mb-3">Pneumologia</h3>
                <p class="text-gray-600 mb-4">Spirometrie, test respiratori, visite pneumologiche</p>
                <ul class="text-sm text-gray-700 space-y-1">
                  <li>✓ Spirometria</li>
                  <li>✓ Test allergologici</li>
                  <li>✓ Prick test</li>
                </ul>
              </div>

              <div class="bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
                <div class="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mb-4">
                  <span class="text-white text-2xl">👁️</span>
                </div>
                <h3 class="text-xl font-bold text-gray-900 mb-3">Oculistica</h3>
                <p class="text-gray-600 mb-4">Visite oculistiche, controllo vista, OCT</p>
                <ul class="text-sm text-gray-700 space-y-1">
                  <li>✓ Visita completa</li>
                  <li>✓ Controllo vista</li>
                  <li>✓ OCT retina</li>
                </ul>
              </div>

              <div class="bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
                <div class="w-16 h-16 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center mb-4">
                  <span class="text-white text-2xl">🦴</span>
                </div>
                <h3 class="text-xl font-bold text-gray-900 mb-3">Ortopedia</h3>
                <p class="text-gray-600 mb-4">Visite ortopediche, infiltrazioni, terapie</p>
                <ul class="text-sm text-gray-700 space-y-1">
                  <li>✓ Visita ortopedica</li>
                  <li>✓ Infiltrazioni</li>
                  <li>✓ Fisioterapia</li>
                </ul>
              </div>

              <div class="bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
                <div class="w-16 h-16 bg-gradient-to-br from-red-500 to-pink-500 rounded-full flex items-center justify-center mb-4">
                  <span class="text-white text-2xl">🧠</span>
                </div>
                <h3 class="text-xl font-bold text-gray-900 mb-3">Neurologia</h3>
                <p class="text-gray-600 mb-4">Visite neurologiche, elettromiografie</p>
                <ul class="text-sm text-gray-700 space-y-1">
                  <li>✓ Visita neurologica</li>
                  <li>✓ Elettromiografia</li>
                  <li>✓ Test cognitivi</li>
                </ul>
              </div>

              <div class="bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
                <div class="w-16 h-16 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-full flex items-center justify-center mb-4">
                  <span class="text-white text-2xl">🩺</span>
                </div>
                <h3 class="text-xl font-bold text-gray-900 mb-3">Dermatologia</h3>
                <p class="text-gray-600 mb-4">Visite dermatologiche, mappatura nei</p>
                <ul class="text-sm text-gray-700 space-y-1">
                  <li>✓ Visita dermatologica</li>
                  <li>✓ Mappatura nei</li>
                  <li>✓ Crioterapia</li>
                </ul>
              </div>
            </div>

            <div class="bg-gradient-to-r from-cyan-900 to-blue-900 text-white p-8 rounded-lg my-12">
              <h2 class="text-3xl font-bold mb-4">Prenota la Tua Visita</h2>
              <p class="text-lg mb-6">Contattaci per prenotare una visita specialistica o per maggiori informazioni.</p>
              <a href="/contatti" class="inline-block bg-white text-cyan-900 px-8 py-3 rounded-lg font-bold hover:bg-cyan-50 mr-4">
                Contattaci
              </a>
              <a href="/prenota" class="inline-block bg-cyan-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-cyan-700">
                Prenota Online
              </a>
            </div>
          </div>
        `,
        status: 'published',
        isPublished: true,
        seoTitle: 'Visite Specialistiche Milano - Element Medica',
        seoDescription: 'Cardiologia, pneumologia, oculistica, ortopedia, neurologia, dermatologia. Prenota la tua visita specialistica a Milano.',
        tenantId: tenantMedica.id
      }
    });
    console.log('✅ Pagina creata: visite-specialistiche');
  } else {
    console.log('⏭️  Pagina già esistente: visite-specialistiche');
  }

  // Diagnostica
  const existingDiagnostica = await prisma.cMSPage.findFirst({
    where: { slug: 'diagnostica', tenantId: tenantMedica.id }
  });

  if (!existingDiagnostica) {
    await prisma.cMSPage.create({
      data: {
        slug: 'diagnostica',
        title: 'Diagnostica Strumentale - Element Medica',
        content: `
          <div class="container mx-auto px-4 py-12">
            <h1 class="text-4xl font-bold text-cyan-900 mb-8">Diagnostica Strumentale</h1>
            
            <p class="text-xl text-gray-700 mb-12">
              Tecnologie diagnostiche all'avanguardia per esami precisi e tempestivi.
            </p>

            <div class="grid md:grid-cols-2 gap-8">
              <div class="bg-white p-8 rounded-lg shadow-lg">
                <h3 class="text-2xl font-bold text-cyan-900 mb-4">Elettrocardiogramma (ECG)</h3>
                <p class="text-gray-700 mb-4">Registrazione dell'attività elettrica del cuore per valutare ritmo, conduzione e possibili anomalie.</p>
                <ul class="text-gray-600 space-y-2">
                  <li>✓ ECG a riposo</li>
                  <li>✓ ECG sotto sforzo</li>
                  <li>✓ Holter 24-48h</li>
                </ul>
              </div>

              <div class="bg-white p-8 rounded-lg shadow-lg">
                <h3 class="text-2xl font-bold text-cyan-900 mb-4">Spirometria</h3>
                <p class="text-gray-700 mb-4">Test respiratorio per valutare la funzionalità polmonare, essenziale per medicina del lavoro.</p>
                <ul class="text-gray-600 space-y-2">
                  <li>✓ Spirometria semplice</li>
                  <li>✓ Test broncodilatazione</li>
                  <li>✓ Test provocazione</li>
                </ul>
              </div>

              <div class="bg-white p-8 rounded-lg shadow-lg">
                <h3 class="text-2xl font-bold text-cyan-900 mb-4">Audiometria</h3>
                <p class="text-gray-700 mb-4">Valutazione dell'udito per controlli occupazionali e diagnosi di ipoacusia.</p>
                <ul class="text-gray-600 space-y-2">
                  <li>✓ Audiometria tonale</li>
                  <li>✓ Audiometria vocale</li>
                  <li>✓ Impedenzometria</li>
                </ul>
              </div>

              <div class="bg-white p-8 rounded-lg shadow-lg">
                <h3 class="text-2xl font-bold text-cyan-900 mb-4">Esami di Laboratorio</h3>
                <p class="text-gray-700 mb-4">Prelievi ematici e analisi complete con risultati in 24-48h.</p>
                <ul class="text-gray-600 space-y-2">
                  <li>✓ Emocromo completo</li>
                  <li>✓ Profilo metabolico</li>
                  <li>✓ Esami tossicologici</li>
                </ul>
              </div>
            </div>

            <div class="bg-cyan-50 p-8 rounded-lg my-12">
              <h2 class="text-3xl font-bold text-cyan-900 mb-6">Perché Scegliere la Nostra Diagnostica</h2>
              <div class="grid md:grid-cols-3 gap-6">
                <div>
                  <h4 class="text-lg font-bold text-cyan-900 mb-2">⚡ Rapidità</h4>
                  <p class="text-gray-700">Risultati in tempi brevi per decisioni tempestive</p>
                </div>
                <div>
                  <h4 class="text-lg font-bold text-cyan-900 mb-2">🎯 Precisione</h4>
                  <p class="text-gray-700">Strumentazione certificata e calibrata regolarmente</p>
                </div>
                <div>
                  <h4 class="text-lg font-bold text-cyan-900 mb-2">👨‍⚕️ Esperienza</h4>
                  <p class="text-gray-700">Personale tecnico altamente qualificato</p>
                </div>
              </div>
            </div>

            <div class="bg-cyan-900 text-white p-8 rounded-lg">
              <h3 class="text-2xl font-bold mb-4">Prenota un Esame</h3>
              <p class="mb-4">Contattaci per prenotare esami diagnostici o per ricevere maggiori informazioni.</p>
              <a href="/contatti" class="inline-block bg-white text-cyan-900 px-6 py-3 rounded-lg font-bold hover:bg-cyan-50">
                Contattaci Ora
              </a>
            </div>
          </div>
        `,
        status: 'published',
        isPublished: true,
        seoTitle: 'Diagnostica Strumentale Milano - Element Medica',
        seoDescription: 'ECG, spirometria, audiometria, esami di laboratorio. Diagnostica strumentale con tecnologie avanzate a Milano.',
        tenantId: tenantMedica.id
      }
    });
    console.log('✅ Pagina creata: diagnostica');
  } else {
    console.log('⏭️  Pagina già esistente: diagnostica');
  }

  // Prenota Online (placeholder)
  const existingPrenota = await prisma.cMSPage.findFirst({
    where: { slug: 'prenota', tenantId: tenantMedica.id }
  });

  if (!existingPrenota) {
    await prisma.cMSPage.create({
      data: {
        slug: 'prenota',
        title: 'Prenota Online - Element Medica',
        content: `
          <div class="container mx-auto px-4 py-12">
            <h1 class="text-4xl font-bold text-cyan-900 mb-8">Prenota Online</h1>
            
            <div class="bg-gradient-to-br from-cyan-50 to-blue-50 p-8 rounded-lg mb-8">
              <p class="text-xl text-gray-700 mb-6">
                Il sistema di prenotazione online è in fase di implementazione.
              </p>
              <p class="text-lg text-gray-600">
                Nel frattempo, puoi prenotare la tua visita contattandoci telefonicamente o via email.
              </p>
            </div>

            <div class="grid md:grid-cols-2 gap-8">
              <div class="bg-white p-8 rounded-lg shadow-lg">
                <h3 class="text-2xl font-bold text-cyan-900 mb-4">📞 Telefono</h3>
                <p class="text-gray-700 mb-4">Chiamaci per prenotare immediatamente</p>
                <a href="tel:+390123999888" class="text-2xl font-bold text-cyan-600 hover:text-cyan-700">
                  +39 0123 999 888
                </a>
                <p class="text-sm text-gray-600 mt-4">Lun-Ven: 8:00-18:00 | Sab: 8:00-13:00</p>
              </div>

              <div class="bg-white p-8 rounded-lg shadow-lg">
                <h3 class="text-2xl font-bold text-cyan-900 mb-4">✉️ Email</h3>
                <p class="text-gray-700 mb-4">Scrivici per richiedere una prenotazione</p>
                <a href="mailto:info@elementmedica.it" class="text-2xl font-bold text-cyan-600 hover:text-cyan-700 break-all">
                  info@elementmedica.it
                </a>
                <p class="text-sm text-gray-600 mt-4">Risposta entro 24 ore lavorative</p>
              </div>
            </div>

            <div class="bg-cyan-900 text-white p-8 rounded-lg mt-12">
              <h3 class="text-2xl font-bold mb-4">🏥 Vieni di Persona</h3>
              <p class="mb-4">Puoi anche venire direttamente presso il nostro poliambulatorio per prenotare.</p>
              <p class="text-cyan-200">Via della Salute 10, 20100 Milano (MI)</p>
            </div>
          </div>
        `,
        status: 'published',
        isPublished: true,
        seoTitle: 'Prenota Visita Online - Element Medica Milano',
        seoDescription: 'Prenota la tua visita specialistica o esame diagnostico a Milano. Contattaci per fissare un appuntamento.',
        tenantId: tenantMedica.id
      }
    });
    console.log('✅ Pagina creata: prenota');
  } else {
    console.log('⏭️  Pagina già esistente: prenota');
  }

  console.log('\n🎉 Pagine Element Medica completate!\n');
  console.log('📊 Pagine disponibili:');
  console.log('   - homepage-medica');
  console.log('   - medicina-del-lavoro-medica');
  console.log('   - contatti-medica');
  console.log('   - chi-siamo-medica');
  console.log('   - visite-specialistiche');
  console.log('   - diagnostica');
  console.log('   - prenota');
  console.log('\n✅ Testa su: http://localhost:5174');
}

createRemainingMedicaPages()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
