import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function updateMedicinaLavoroFormazione() {
  console.log('📄 Aggiornando Medicina del Lavoro per Element Sicurezza...\n');

  const page = await prisma.cMSPage.findFirst({
    where: {
      slug: 'medicina-del-lavoro',
      tenantId: 'tenant-id-formazione'
    }
  });

  if (!page) {
    console.error('❌ Pagina non trovata!');
    process.exit(1);
  }

  const updatedContent = `
    <div class="medicina-lavoro-page">
      <!-- Hero Section Medical Theme -->
      <div class="relative bg-gradient-to-br from-cyan-900 via-blue-900 to-cyan-800 text-white py-24 overflow-hidden">
        <div class="absolute inset-0 opacity-10">
          <div class="medical-grid-pattern"></div>
        </div>
        <div class="container mx-auto px-4 relative z-10">
          <div class="max-w-4xl">
            <h1 class="text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              Medicina del Lavoro
            </h1>
            <p class="text-2xl text-cyan-100 mb-8 leading-relaxed">
              Proteggiamo la salute dei lavoratori con protocolli medici certificati, 
              sorveglianza sanitaria completa e consulenza specializzata secondo D.Lgs 81/08
            </p>
            
            <!-- Statistics -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-6 mt-12">
              <div class="text-center">
                <div class="text-4xl font-bold text-cyan-300 mb-2">15+</div>
                <div class="text-cyan-100">Anni Esperienza</div>
              </div>
              <div class="text-center">
                <div class="text-4xl font-bold text-cyan-300 mb-2">500+</div>
                <div class="text-cyan-100">Aziende Clienti</div>
              </div>
              <div class="text-center">
                <div class="text-4xl font-bold text-cyan-300 mb-2">10K+</div>
                <div class="text-cyan-100">Visite Annuali</div>
              </div>
              <div class="text-center">
                <div class="text-4xl font-bold text-cyan-300 mb-2">98%</div>
                <div class="text-cyan-100">Soddisfazione</div>
              </div>
            </div>

            <!-- Trust Badges -->
            <div class="flex flex-wrap items-center gap-6 mt-12 pt-8 border-t border-cyan-700">
              <div class="flex items-center gap-2 text-cyan-200">
                <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
                  <path fill-rule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm9.707 5.707a1 1 0 00-1.414-1.414L9 12.586l-1.293-1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                </svg>
                <span class="font-semibold">ISO 9001 Certificato</span>
              </div>
              <div class="flex items-center gap-2 text-cyan-200">
                <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                </svg>
                <span class="font-semibold">Accreditamento Regionale</span>
              </div>
              <div class="flex items-center gap-2 text-cyan-200">
                <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"/>
                </svg>
                <span class="font-semibold">Medici Competenti Specializzati</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Servizi Principali -->
      <section class="py-20 bg-white">
        <div class="container mx-auto px-4">
          <div class="text-center mb-16">
            <h2 class="text-4xl font-bold text-gray-900 mb-4">I Nostri Servizi di Medicina del Lavoro</h2>
            <p class="text-xl text-gray-600 max-w-3xl mx-auto">
              Soluzioni complete per la tutela della salute dei lavoratori e la conformità normativa aziendale
            </p>
          </div>

          <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <!-- Visite Mediche -->
            <div class="group bg-gradient-to-br from-cyan-50 to-blue-50 p-8 rounded-2xl hover:shadow-2xl transition-all duration-300 border-2 border-transparent hover:border-cyan-400">
              <div class="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
              </div>
              <h3 class="text-2xl font-bold text-gray-900 mb-4">Visite Mediche Preventive e Periodiche</h3>
              <p class="text-gray-700 mb-6">
                Valutazione dell'idoneità alla mansione specifica secondo i protocolli sanitari aziendali e il D.Lgs 81/08.
              </p>
              <ul class="space-y-3">
                <li class="flex items-start gap-2">
                  <svg class="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                  </svg>
                  <span class="text-gray-700">Visita medica pre-assuntiva</span>
                </li>
                <li class="flex items-start gap-2">
                  <svg class="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                  </svg>
                  <span class="text-gray-700">Controlli periodici programmati</span>
                </li>
                <li class="flex items-start gap-2">
                  <svg class="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                  </svg>
                  <span class="text-gray-700">Visite su richiesta lavoratore</span>
                </li>
                <li class="flex items-start gap-2">
                  <svg class="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                  </svg>
                  <span class="text-gray-700">Cambio mansione</span>
                </li>
                <li class="flex items-start gap-2">
                  <svg class="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                  </svg>
                  <span class="text-gray-700">Rientro post-malattia >60gg</span>
                </li>
              </ul>
            </div>

            <!-- Sorveglianza Sanitaria -->
            <div class="group bg-gradient-to-br from-green-50 to-emerald-50 p-8 rounded-2xl hover:shadow-2xl transition-all duration-300 border-2 border-transparent hover:border-green-400">
              <div class="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
                </svg>
              </div>
              <h3 class="text-2xl font-bold text-gray-900 mb-4">Sorveglianza Sanitaria</h3>
              <p class="text-gray-700 mb-6">
                Programmi di monitoraggio continuo per lavoratori esposti a rischi specifici, con protocolli personalizzati.
              </p>
              <ul class="space-y-3">
                <li class="flex items-start gap-2">
                  <svg class="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                  </svg>
                  <span class="text-gray-700">Protocolli sanitari personalizzati</span>
                </li>
                <li class="flex items-start gap-2">
                  <svg class="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                  </svg>
                  <span class="text-gray-700">Monitoraggio esposizioni professionali</span>
                </li>
                <li class="flex items-start gap-2">
                  <svg class="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                  </svg>
                  <span class="text-gray-700">Giudizi di idoneità motivati</span>
                </li>
                <li class="flex items-start gap-2">
                  <svg class="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                  </svg>
                  <span class="text-gray-700">Cartelle sanitarie digitali</span>
                </li>
                <li class="flex items-start gap-2">
                  <svg class="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                  </svg>
                  <span class="text-gray-700">Scadenzario automatico</span>
                </li>
              </ul>
            </div>

            <!-- Medico Competente -->
            <div class="group bg-gradient-to-br from-blue-50 to-indigo-50 p-8 rounded-2xl hover:shadow-2xl transition-all duration-300 border-2 border-transparent hover:border-blue-400">
              <div class="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                </svg>
              </div>
              <h3 class="text-2xl font-bold text-gray-900 mb-4">Medico Competente</h3>
              <p class="text-gray-700 mb-6">
                Nomina del medico competente aziendale con supporto continuativo e consulenza specializzata.
              </p>
              <ul class="space-y-3">
                <li class="flex items-start gap-2">
                  <svg class="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                  </svg>
                  <span class="text-gray-700">Nomina medico competente</span>
                </li>
                <li class="flex items-start gap-2">
                  <svg class="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                  </svg>
                  <span class="text-gray-700">Sopralluoghi aziendali</span>
                </li>
                <li class="flex items-start gap-2">
                  <svg class="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                  </svg>
                  <span class="text-gray-700">Collaborazione con RSPP</span>
                </li>
                <li class="flex items-start gap-2">
                  <svg class="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                  </svg>
                  <span class="text-gray-700">Pareri su DPI</span>
                </li>
                <li class="flex items-start gap-2">
                  <svg class="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                  </svg>
                  <span class="text-gray-700">Partecipazione riunioni periodiche</span>
                </li>
              </ul>
            </div>

            <!-- Esami Specialistici -->
            <div class="group bg-gradient-to-br from-purple-50 to-pink-50 p-8 rounded-2xl hover:shadow-2xl transition-all duration-300 border-2 border-transparent hover:border-purple-400">
              <div class="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                </svg>
              </div>
              <h3 class="text-2xl font-bold text-gray-900 mb-4">Esami Specialistici</h3>
              <p class="text-gray-700 mb-6">
                Diagnostica strumentale completa con strumentazione certificata e personale qualificato.
              </p>
              <ul class="space-y-3">
                <li class="flex items-start gap-2">
                  <svg class="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                  </svg>
                  <span class="text-gray-700">Spirometria</span>
                </li>
                <li class="flex items-start gap-2">
                  <svg class="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                  </svg>
                  <span class="text-gray-700">Audiometria</span>
                </li>
                <li class="flex items-start gap-2">
                  <svg class="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                  </svg>
                  <span class="text-gray-700">Elettrocardiogramma</span>
                </li>
                <li class="flex items-start gap-2">
                  <svg class="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                  </svg>
                  <span class="text-gray-700">Esami di laboratorio</span>
                </li>
                <li class="flex items-start gap-2">
                  <svg class="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                  </svg>
                  <span class="text-gray-700">Tossicologia</span>
                </li>
              </ul>
            </div>

            <!-- Vaccinazioni -->
            <div class="group bg-gradient-to-br from-orange-50 to-yellow-50 p-8 rounded-2xl hover:shadow-2xl transition-all duration-300 border-2 border-transparent hover:border-orange-400">
              <div class="w-16 h-16 bg-gradient-to-br from-orange-500 to-yellow-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/>
                </svg>
              </div>
              <h3 class="text-2xl font-bold text-gray-900 mb-4">Vaccinazioni Occupazionali</h3>
              <p class="text-gray-700 mb-6">
                Programmi vaccinali per prevenzione rischi biologici e protezione lavoratori esposti.
              </p>
              <ul class="space-y-3">
                <li class="flex items-start gap-2">
                  <svg class="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                  </svg>
                  <span class="text-gray-700">Antitetanica</span>
                </li>
                <li class="flex items-start gap-2">
                  <svg class="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                  </svg>
                  <span class="text-gray-700">Epatite A e B</span>
                </li>
                <li class="flex items-start gap-2">
                  <svg class="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                  </svg>
                  <span class="text-gray-700">Influenza stagionale</span>
                </li>
                <li class="flex items-start gap-2">
                  <svg class="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                  </svg>
                  <span class="text-gray-700">COVID-19</span>
                </li>
                <li class="flex items-start gap-2">
                  <svg class="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                  </svg>
                  <span class="text-gray-700">Protocolli personalizzati</span>
                </li>
              </ul>
            </div>

            <!-- Consulenza Sicurezza -->
            <div class="group bg-gradient-to-br from-red-50 to-rose-50 p-8 rounded-2xl hover:shadow-2xl transition-all duration-300 border-2 border-transparent hover:border-red-400">
              <div class="w-16 h-16 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/>
                </svg>
              </div>
              <h3 class="text-2xl font-bold text-gray-900 mb-4">Consulenza Sicurezza</h3>
              <p class="text-gray-700 mb-6">
                Supporto specialistico per la gestione integrata di sicurezza sul lavoro e salute aziendale.
              </p>
              <ul class="space-y-3">
                <li class="flex items-start gap-2">
                  <svg class="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                  </svg>
                  <span class="text-gray-700">Valutazione rischi specifici</span>
                </li>
                <li class="flex items-start gap-2">
                  <svg class="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                  </svg>
                  <span class="text-gray-700">Gestione emergenze sanitarie</span>
                </li>
                <li class="flex items-start gap-2">
                  <svg class="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                  </svg>
                  <span class="text-gray-700">Primo soccorso aziendale</span>
                </li>
                <li class="flex items-start gap-2">
                  <svg class="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                  </svg>
                  <span class="text-gray-700">Formazione personale</span>
                </li>
                <li class="flex items-start gap-2">
                  <svg class="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                  </svg>
                  <span class="text-gray-700">Audit conformità</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <!-- Normativa e Conformità -->
      <section class="py-20 bg-gradient-to-br from-gray-50 to-gray-100">
        <div class="container mx-auto px-4">
          <div class="max-w-4xl mx-auto">
            <h2 class="text-4xl font-bold text-gray-900 mb-8 text-center">Normativa di Riferimento</h2>
            <div class="bg-white p-8 rounded-2xl shadow-lg">
              <p class="text-lg text-gray-700 mb-6">
                La medicina del lavoro è regolamentata dal <strong class="text-cyan-900">D.Lgs 81/2008 (Testo Unico sulla Sicurezza)</strong> 
                e successive modifiche ed integrazioni. I nostri servizi garantiscono piena conformità normativa.
              </p>
              
              <div class="grid md:grid-cols-2 gap-6 mt-8">
                <div class="bg-cyan-50 p-6 rounded-lg">
                  <h4 class="font-bold text-cyan-900 mb-3">Art. 41 - Sorveglianza Sanitaria</h4>
                  <p class="text-gray-700 text-sm">
                    Definisce modalità e periodicità delle visite mediche obbligatorie per i lavoratori esposti a rischi specifici.
                  </p>
                </div>

                <div class="bg-blue-50 p-6 rounded-lg">
                  <h4 class="font-bold text-blue-900 mb-3">Art. 38 - Medico Competente</h4>
                  <p class="text-gray-700 text-sm">
                    Requisiti e compiti del medico competente aziendale, figura obbligatoria per molte attività.
                  </p>
                </div>

                <div class="bg-green-50 p-6 rounded-lg">
                  <h4 class="font-bold text-green-900 mb-3">Art. 18 - Obblighi Datore Lavoro</h4>
                  <p class="text-gray-700 text-sm">
                    Nomina medico competente e attuazione sorveglianza sanitaria secondo protocolli specifici.
                  </p>
                </div>

                <div class="bg-purple-50 p-6 rounded-lg">
                  <h4 class="font-bold text-purple-900 mb-3">Art. 25 - Cartella Sanitaria</h4>
                  <p class="text-gray-700 text-sm">
                    Gestione documentazione sanitaria riservata con conservazione per almeno 10 anni.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- CTA Section -->
      <section class="py-20 bg-gradient-to-br from-cyan-900 via-blue-900 to-cyan-800 text-white relative overflow-hidden">
        <div class="absolute inset-0 opacity-10">
          <div class="medical-grid-pattern"></div>
        </div>
        <div class="container mx-auto px-4 relative z-10">
          <div class="max-w-4xl mx-auto text-center">
            <h2 class="text-4xl font-bold mb-6">Proteggi la Salute dei Tuoi Lavoratori</h2>
            <p class="text-xl text-cyan-100 mb-8">
              Contattaci per un consulto gratuito e scopri come possiamo supportare la tua azienda 
              nella gestione della medicina del lavoro e della sicurezza.
            </p>
            
            <div class="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <a href="/contatti" class="inline-block bg-white text-cyan-900 px-8 py-4 rounded-lg font-bold text-lg hover:bg-cyan-50 transition-colors shadow-lg">
                Richiedi Consulto Gratuito
              </a>
              <a href="tel:+390123456789" class="inline-block bg-cyan-700 text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-cyan-600 transition-colors">
                📞 Chiamaci Ora
              </a>
            </div>

            <div class="mt-12 pt-8 border-t border-cyan-700">
              <p class="text-cyan-200 mb-4">🏆 Partner di fiducia per oltre 500 aziende</p>
              <div class="flex flex-wrap justify-center gap-6 text-sm">
                <span class="bg-cyan-800 px-4 py-2 rounded-full">✓ Risposta in 24h</span>
                <span class="bg-cyan-800 px-4 py-2 rounded-full">✓ Preventivo Gratuito</span>
                <span class="bg-cyan-800 px-4 py-2 rounded-full">✓ Supporto Continuativo</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  `;

  await prisma.cMSPage.update({
    where: { id: page.id },
    data: {
      content: updatedContent,
      seoTitle: 'Medicina del Lavoro Padova - Sorveglianza Sanitaria | Element Sicurezza',
      seoDescription: 'Servizi completi di medicina del lavoro: visite preventive, sorveglianza sanitaria, medico competente, esami specialistici. Conformità D.Lgs 81/08. ✓ ISO 9001 ✓ 500+ aziende clienti',
      updatedAt: new Date()
    }
  });

  console.log('✅ Pagina Medicina del Lavoro Element Sicurezza aggiornata!\n');
  console.log('📊 Miglioramenti applicati:');
  console.log('   - Hero section medical con statistics e trust badges');
  console.log('   - 6 servizi dettagliati con icone e features');
  console.log('   - Sezione normativa D.Lgs 81/08');
  console.log('   - CTA section migliorata');
  console.log('   - SEO ottimizzato');
}

updateMedicinaLavoroFormazione()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
