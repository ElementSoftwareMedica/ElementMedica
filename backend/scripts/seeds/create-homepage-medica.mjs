import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createHomepageMedica() {
  console.log('📄 Creando Homepage per Element Medica...\n');

  const htmlContent = `
    <div class="homepage-medica">
      <!-- Hero Section -->
      <section class="relative bg-gradient-to-br from-medical-600 via-medical-700 to-medical-800 text-white py-24 overflow-hidden">
        <div class="absolute inset-0 opacity-10">
          <svg class="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <pattern id="medical-pattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
              <circle cx="20" cy="20" r="1" fill="currentColor"/>
            </pattern>
            <rect width="100%" height="100%" fill="url(#medical-pattern)"/>
          </svg>
        </div>
        
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div class="space-y-6">
              <div class="inline-flex items-center space-x-2 bg-medical-500 bg-opacity-30 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span>Poliambulatorio Certificato ISO 9001</span>
              </div>
              
              <h1 class="text-5xl lg:text-6xl font-bold leading-tight">
                La Tua Salute è la Nostra <span class="text-medical-200">Priorità</span>
              </h1>
              
              <p class="text-xl text-medical-100 leading-relaxed">
                Poliambulatorio specializzato in medicina del lavoro, visite specialistiche e diagnostica strumentale. 
                Prenota online la tua visita.
              </p>

              <div class="flex flex-col sm:flex-row gap-4 pt-4">
                <a href="/prenota" class="inline-flex items-center justify-center px-8 py-4 bg-white text-medical-600 font-bold rounded-lg hover:bg-medical-50 transition-colors shadow-xl">
                  <span>Prenota Visita</span>
                  <svg class="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </a>
                <a href="/medicina-del-lavoro" class="inline-flex items-center justify-center px-8 py-4 bg-medical-800 text-white font-bold rounded-lg hover:bg-medical-900 transition-colors border-2 border-white">
                  <span>Medicina del Lavoro</span>
                  <svg class="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </a>
              </div>
            </div>

            <div class="relative">
              <div class="aspect-square bg-gradient-to-br from-medical-400 to-medical-600 rounded-3xl flex items-center justify-center shadow-2xl">
                <svg class="w-48 h-48 text-white opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Servizi Principali -->
      <section class="py-20 bg-white">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="text-center mb-16">
            <h2 class="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              I Nostri <span class="text-medical-600">Servizi</span>
            </h2>
            <p class="text-xl text-gray-600 max-w-3xl mx-auto">
              Servizi sanitari completi per aziende e privati
            </p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <!-- Medicina del Lavoro -->
            <a href="/medicina-del-lavoro" class="group bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100">
              <div class="p-8">
                <div class="w-16 h-16 bg-medical-100 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <svg class="w-8 h-8 text-medical-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 class="text-xl font-bold text-gray-900 mb-3 group-hover:text-medical-600 transition-colors">Medicina del Lavoro</h3>
                <p class="text-gray-600 mb-4">
                  Sorveglianza sanitaria completa, visite mediche aziendali e medico competente.
                </p>
                <span class="inline-flex items-center text-medical-600 font-semibold group-hover:translate-x-2 transition-transform">
                  <span>Scopri di più</span>
                  <svg class="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
              </div>
            </a>

            <!-- Visite Specialistiche -->
            <a href="/visite-specialistiche" class="group bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100">
              <div class="p-8">
                <div class="w-16 h-16 bg-medical-100 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <svg class="w-8 h-8 text-medical-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h3 class="text-xl font-bold text-gray-900 mb-3 group-hover:text-medical-600 transition-colors">Visite Specialistiche</h3>
                <p class="text-gray-600 mb-4">
                  Cardiologia, ortopedia, medicina generale e specialisti esperti.
                </p>
                <span class="inline-flex items-center text-medical-600 font-semibold group-hover:translate-x-2 transition-transform">
                  <span>Scopri di più</span>
                  <svg class="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
              </div>
            </a>

            <!-- Diagnostica -->
            <a href="/diagnostica" class="group bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100">
              <div class="p-8">
                <div class="w-16 h-16 bg-medical-100 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <svg class="w-8 h-8 text-medical-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h3 class="text-xl font-bold text-gray-900 mb-3 group-hover:text-medical-600 transition-colors">Diagnostica Strumentale</h3>
                <p class="text-gray-600 mb-4">
                  ECG, spirometria, audiometria, visiotest ed esami di laboratorio.
                </p>
                <span class="inline-flex items-center text-medical-600 font-semibold group-hover:translate-x-2 transition-transform">
                  <span>Scopri di più</span>
                  <svg class="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
              </div>
            </a>
          </div>
        </div>
      </section>

      <!-- CTA Section -->
      <section class="py-20 bg-gradient-to-br from-medical-600 to-medical-700 text-white">
        <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 class="text-3xl lg:text-4xl font-bold mb-6">
            Prenota la Tua Visita Oggi
          </h2>
          <p class="text-xl text-medical-100 mb-8">
            Sistema di prenotazione online semplice e veloce
          </p>
          <div class="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/prenota" class="inline-flex items-center justify-center px-8 py-4 bg-white text-medical-600 font-bold rounded-lg hover:bg-medical-50 transition-colors shadow-xl">
              <span>Prenota Online</span>
              <svg class="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </a>
            <a href="tel:+390422308999" class="inline-flex items-center justify-center px-8 py-4 bg-medical-800 text-white font-bold rounded-lg hover:bg-medical-900 transition-colors border-2 border-white">
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <span>Chiama Ora</span>
            </a>
          </div>
        </div>
      </section>
    </div>
  `;

  // Cerca se esiste già
  let page = await prisma.cMSPage.findFirst({
    where: {
      slug: 'homepage-medica',
      tenantId: 'tenant-id-medica'
    }
  });

  if (page) {
    // Aggiorna
    await prisma.cMSPage.update({
      where: { id: page.id },
      data: {
        title: 'Element Medica - Poliambulatorio Milano',
        content: htmlContent,
        seoTitle: 'Element Medica - Poliambulatorio e Medicina del Lavoro Milano',
        seoDescription: 'Poliambulatorio specializzato: medicina del lavoro, visite specialistiche, diagnostica strumentale. Prenota online la tua visita.',
        status: 'published',
        updatedAt: new Date()
      }
    });
    console.log('✅ Homepage Element Medica aggiornata!');
  } else {
    // Crea
    await prisma.cMSPage.create({
      data: {
        slug: 'homepage-medica',
        title: 'Element Medica - Poliambulatorio Milano',
        content: htmlContent,
        tenantId: 'tenant-id-medica',
        status: 'published',
        layout: 'full-width',
        seoTitle: 'Element Medica - Poliambulatorio e Medicina del Lavoro Milano',
        seoDescription: 'Poliambulatorio specializzato: medicina del lavoro, visite specialistiche, diagnostica strumentale. Prenota online la tua visita.',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    console.log('✅ Homepage Element Medica creata!');
  }

  console.log('\n📊 Contenuto:');
  console.log('   - Hero section con CTA (Prenota + Medicina del Lavoro)');
  console.log('   - 3 card servizi principali (Medicina Lavoro, Visite, Diagnostica)');
  console.log('   - CTA finale per prenotazioni');
}

createHomepageMedica()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
