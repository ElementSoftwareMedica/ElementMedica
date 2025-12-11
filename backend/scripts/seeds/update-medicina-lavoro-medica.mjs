import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateMedicinaLavoroMedica() {
  console.log('📄 Aggiornando Medicina del Lavoro per Element Medica...\n');

  // Trova la pagina esistente o creala
  let page = await prisma.cMSPage.findFirst({
    where: {
      slug: 'medicina-del-lavoro-medica',
      tenantId: 'tenant-id-medica'
    }
  });

  // Se non esiste, creala prima
  if (!page) {
    console.log('📝 Pagina non trovata, creazione in corso...');
    page = await prisma.cMSPage.create({
      data: {
        slug: 'medicina-del-lavoro-medica',
        title: 'Medicina del Lavoro - Poliambulatorio Specializzato',
        tenantId: 'tenant-id-medica',
        status: 'published',
        layout: 'full-width',
        content: '',
        seoTitle: 'Medicina del Lavoro | Poliambulatorio Element Medica',
        seoDescription: 'Servizi completi di medicina del lavoro: visite aziendali, esami diagnostici, medico competente.',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    console.log('✅ Pagina creata!\n');
  }

  // HTML content ottimizzato per poliambulatorio medico
    const htmlContent = `
      <!-- Hero Section Medical -->
      <section class="relative bg-gradient-to-br from-medical-50 via-white to-medical-50 py-20">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <!-- Content -->
            <div class="space-y-6">
              <div class="inline-flex items-center space-x-2 bg-medical-100 text-medical-700 px-4 py-2 rounded-full text-sm font-medium">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span>Poliambulatorio Specializzato</span>
              </div>
              
              <h1 class="text-4xl lg:text-5xl font-bold text-gray-900 leading-tight">
                Medicina del Lavoro <span class="text-medical-600">Completa</span>
              </h1>
              
              <p class="text-xl text-gray-600 leading-relaxed">
                Servizi sanitari integrati per la sorveglianza sanitaria dei lavoratori. 
                Dal medico competente agli esami specialistici, tutto in un'unica struttura.
              </p>

              <!-- Quick Stats -->
              <div class="grid grid-cols-3 gap-4 pt-4">
                <div class="text-center p-4 bg-white rounded-lg shadow-sm">
                  <div class="text-3xl font-bold text-medical-600">10+</div>
                  <div class="text-sm text-gray-600 mt-1">Specialità Mediche</div>
                </div>
                <div class="text-center p-4 bg-white rounded-lg shadow-sm">
                  <div class="text-3xl font-bold text-medical-600">2000+</div>
                  <div class="text-sm text-gray-600 mt-1">Aziende Assistite</div>
                </div>
                <div class="text-center p-4 bg-white rounded-lg shadow-sm">
                  <div class="text-3xl font-bold text-medical-600">H24</div>
                  <div class="text-sm text-gray-600 mt-1">Supporto Urgenze</div>
                </div>
              </div>

              <!-- CTA Buttons -->
              <div class="flex flex-col sm:flex-row gap-4 pt-4">
                <a href="/contatti" class="inline-flex items-center justify-center px-6 py-3 bg-medical-600 text-white font-semibold rounded-lg hover:bg-medical-700 transition-colors shadow-lg">
                  <span>Prenota Visita</span>
                  <svg class="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </a>
                <a href="tel:+390422308999" class="inline-flex items-center justify-center px-6 py-3 bg-white text-medical-600 font-semibold rounded-lg hover:bg-gray-50 transition-colors border-2 border-medical-600">
                  <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span>Chiama Ora</span>
                </a>
              </div>
            </div>

            <!-- Image Placeholder -->
            <div class="relative">
              <div class="aspect-[4/3] bg-gradient-to-br from-medical-100 to-medical-200 rounded-2xl flex items-center justify-center shadow-2xl">
                <svg class="w-32 h-32 text-medical-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <!-- Floating Badge -->
              <div class="absolute -bottom-6 -right-6 bg-white p-6 rounded-xl shadow-xl border-t-4 border-medical-500">
                <div class="text-center">
                  <div class="text-3xl font-bold text-medical-600">ISO 9001</div>
                  <div class="text-sm text-gray-600 mt-1">Certificato</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Servizi Section -->
      <section class="py-20 bg-white">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="text-center mb-16">
            <h2 class="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              I Nostri Servizi di <span class="text-medical-600">Medicina del Lavoro</span>
            </h2>
            <p class="text-xl text-gray-600 max-w-3xl mx-auto">
              Offriamo un servizio completo e integrato per la salute e sicurezza dei lavoratori
            </p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <!-- Servizio 1: Visite Aziendali -->
            <div class="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 group">
              <div class="p-8">
                <div class="w-16 h-16 bg-medical-100 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <svg class="w-8 h-8 text-medical-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 class="text-xl font-bold text-gray-900 mb-3">Visite Mediche Aziendali</h3>
                <p class="text-gray-600 mb-4">
                  Visite preventive, periodiche e straordinarie presso la vostra sede o il nostro poliambulatorio.
                </p>
                <ul class="space-y-2 text-sm text-gray-600">
                  <li class="flex items-start">
                    <svg class="w-5 h-5 text-medical-500 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Visite preassuntive e periodiche</span>
                  </li>
                  <li class="flex items-start">
                    <svg class="w-5 h-5 text-medical-500 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Idoneità alla mansione specifica</span>
                  </li>
                  <li class="flex items-start">
                    <svg class="w-5 h-5 text-medical-500 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Disponibilità per visite domiciliari</span>
                  </li>
                </ul>
              </div>
            </div>

            <!-- Servizio 2: Esami Diagnostici -->
            <div class="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 group">
              <div class="p-8">
                <div class="w-16 h-16 bg-medical-100 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <svg class="w-8 h-8 text-medical-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h3 class="text-xl font-bold text-gray-900 mb-3">Esami Diagnostici Completi</h3>
                <p class="text-gray-600 mb-4">
                  Centro diagnostico interno per esami strumentali e di laboratorio con refertazione rapida.
                </p>
                <ul class="space-y-2 text-sm text-gray-600">
                  <li class="flex items-start">
                    <svg class="w-5 h-5 text-medical-500 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Spirometria e prove allergologiche</span>
                  </li>
                  <li class="flex items-start">
                    <svg class="w-5 h-5 text-medical-500 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Audiometria tonale e vocale</span>
                  </li>
                  <li class="flex items-start">
                    <svg class="w-5 h-5 text-medical-500 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Elettrocardiogramma e visiotest</span>
                  </li>
                  <li class="flex items-start">
                    <svg class="w-5 h-5 text-medical-500 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Esami ematochimici e tossicologici</span>
                  </li>
                </ul>
              </div>
            </div>

            <!-- Servizio 3: Protocolli Sanitari -->
            <div class="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 group">
              <div class="p-8">
                <div class="w-16 h-16 bg-medical-100 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <svg class="w-8 h-8 text-medical-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 class="text-xl font-bold text-gray-900 mb-3">Protocolli Sanitari Personalizzati</h3>
                <p class="text-gray-600 mb-4">
                  Elaborazione di protocolli sanitari specifici in base ai rischi aziendali identificati.
                </p>
                <ul class="space-y-2 text-sm text-gray-600">
                  <li class="flex items-start">
                    <svg class="w-5 h-5 text-medical-500 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Analisi rischi mansione specifica</span>
                  </li>
                  <li class="flex items-start">
                    <svg class="w-5 h-5 text-medical-500 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Periodicità visite personalizzate</span>
                  </li>
                  <li class="flex items-start">
                    <svg class="w-5 h-5 text-medical-500 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Conformità D.Lgs 81/08</span>
                  </li>
                </ul>
              </div>
            </div>

            <!-- Servizio 4: Medico Competente -->
            <div class="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 group">
              <div class="p-8">
                <div class="w-16 h-16 bg-medical-100 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <svg class="w-8 h-8 text-medical-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h3 class="text-xl font-bold text-gray-900 mb-3">Nomina Medico Competente</h3>
                <p class="text-gray-600 mb-4">
                  Medici specialisti iscritti all'albo per la nomina come medico competente aziendale.
                </p>
                <ul class="space-y-2 text-sm text-gray-600">
                  <li class="flex items-start">
                    <svg class="w-5 h-5 text-medical-500 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Specialisti in medicina del lavoro</span>
                  </li>
                  <li class="flex items-start">
                    <svg class="w-5 h-5 text-medical-500 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Sopralluoghi e relazioni annuali</span>
                  </li>
                  <li class="flex items-start">
                    <svg class="w-5 h-5 text-medical-500 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Collaborazione con RSPP</span>
                  </li>
                </ul>
              </div>
            </div>

            <!-- Servizio 5: Gestione Digitale -->
            <div class="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 group">
              <div class="p-8">
                <div class="w-16 h-16 bg-medical-100 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <svg class="w-8 h-8 text-medical-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 class="text-xl font-bold text-gray-900 mb-3">Gestione Sanitaria Digitale</h3>
                <p class="text-gray-600 mb-4">
                  Piattaforma digitale per la gestione completa delle cartelle sanitarie e scadenzari.
                </p>
                <ul class="space-y-2 text-sm text-gray-600">
                  <li class="flex items-start">
                    <svg class="w-5 h-5 text-medical-500 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Cartelle sanitarie elettroniche</span>
                  </li>
                  <li class="flex items-start">
                    <svg class="w-5 h-5 text-medical-500 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Alert automatici scadenze</span>
                  </li>
                  <li class="flex items-start">
                    <svg class="w-5 h-5 text-medical-500 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Report e statistiche sanitarie</span>
                  </li>
                </ul>
              </div>
            </div>

            <!-- Servizio 6: Consulenza -->
            <div class="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 group">
              <div class="p-8">
                <div class="w-16 h-16 bg-medical-100 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <svg class="w-8 h-8 text-medical-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <h3 class="text-xl font-bold text-gray-900 mb-3">Consulenza Specialistica</h3>
                <p class="text-gray-600 mb-4">
                  Supporto medico-legale e consulenza per la gestione della salute aziendale.
                </p>
                <ul class="space-y-2 text-sm text-gray-600">
                  <li class="flex items-start">
                    <svg class="w-5 h-5 text-medical-500 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Consulenza medico-legale</span>
                  </li>
                  <li class="flex items-start">
                    <svg class="w-5 h-5 text-medical-500 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Supporto per ispezioni ASL</span>
                  </li>
                  <li class="flex items-start">
                    <svg class="w-5 h-5 text-medical-500 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Formazione e aggiornamenti</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Vantaggi Section -->
      <section class="py-20 bg-gradient-to-br from-medical-50 to-white">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="text-center mb-16">
            <h2 class="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Perché Scegliere il Nostro <span class="text-medical-600">Poliambulatorio</span>
            </h2>
            <p class="text-xl text-gray-600 max-w-3xl mx-auto">
              Vantaggi concreti per la tua azienda
            </p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div class="bg-white p-6 rounded-xl shadow-lg text-center">
              <div class="w-16 h-16 bg-medical-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg class="w-8 h-8 text-medical-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 class="text-lg font-bold text-gray-900 mb-2">Servizio Rapido</h3>
              <p class="text-gray-600 text-sm">Tempi di attesa ridotti e refertazione immediata</p>
            </div>

            <div class="bg-white p-6 rounded-xl shadow-lg text-center">
              <div class="w-16 h-16 bg-medical-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg class="w-8 h-8 text-medical-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 class="text-lg font-bold text-gray-900 mb-2">Team Specializzato</h3>
              <p class="text-gray-600 text-sm">Medici competenti e specialisti esperti</p>
            </div>

            <div class="bg-white p-6 rounded-xl shadow-lg text-center">
              <div class="w-16 h-16 bg-medical-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg class="w-8 h-8 text-medical-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 class="text-lg font-bold text-gray-900 mb-2">Certificazioni</h3>
              <p class="text-gray-600 text-sm">ISO 9001 e accreditamenti regionali</p>
            </div>

            <div class="bg-white p-6 rounded-xl shadow-lg text-center">
              <div class="w-16 h-16 bg-medical-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg class="w-8 h-8 text-medical-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 class="text-lg font-bold text-gray-900 mb-2">Flessibilità</h3>
              <p class="text-gray-600 text-sm">Orari estesi e visite presso la tua sede</p>
            </div>
          </div>
        </div>
      </section>

      <!-- CTA Final -->
      <section class="py-20 bg-gradient-to-br from-medical-600 to-medical-700 text-white">
        <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 class="text-3xl lg:text-4xl font-bold mb-6">
            Richiedi una Consulenza Gratuita
          </h2>
          <p class="text-xl text-medical-100 mb-8">
            I nostri medici competenti sono a tua disposizione per valutare le esigenze della tua azienda
          </p>
          <div class="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/contatti" class="inline-flex items-center justify-center px-8 py-4 bg-white text-medical-600 font-bold rounded-lg hover:bg-medical-50 transition-colors shadow-xl">
              <span>Contattaci Ora</span>
              <svg class="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </a>
            <a href="tel:+390422308999" class="inline-flex items-center justify-center px-8 py-4 bg-medical-800 text-white font-bold rounded-lg hover:bg-medical-900 transition-colors border-2 border-white">
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <span>0422 308 999</span>
            </a>
          </div>
        </div>
      </section>
    `;

  // Aggiorna la pagina esistente
  await prisma.cMSPage.update({
    where: {
      id: page.id
    },
    data: {
      title: 'Medicina del Lavoro - Poliambulatorio Specializzato',
      content: htmlContent,
      seoTitle: 'Medicina del Lavoro | Poliambulatorio Element Medica',
      seoDescription: 'Servizi completi di medicina del lavoro: visite aziendali, esami diagnostici, medico competente. Poliambulatorio specializzato con certificazione ISO 9001. ✓ 10+ specialità ✓ 2000+ aziende',
      updatedAt: new Date()
    }
  });

  console.log('✅ Pagina Medicina del Lavoro Element Medica aggiornata!\n');
  console.log('📊 Miglioramenti applicati:');
  console.log('   - Hero section con quick stats (10+ specialità, 2000+ aziende, H24 urgenze)');
  console.log('   - 6 servizi dettagliati: visite aziendali, esami diagnostici, protocolli, medico competente, gestione digitale, consulenza');
  console.log('   - Sezione vantaggi con 4 card (servizio rapido, team specializzato, certificazioni, flessibilità)');
  console.log('   - CTA section con doppio bottone (contatti + telefono)');
  console.log('   - Design medical theme con gradienti e ombre');
  console.log('   - SEO ottimizzato per poliambulatorio');
}

updateMedicinaLavoroMedica()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
