const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Fix Visite Specialistiche Page Layout
 * 
 * Crea un HTML ottimizzato con card perfettamente allineate,
 * pulsanti uniformi e design professionale
 */

const optimizedHTML = `
<!-- Hero Section -->
<section class="relative bg-gradient-to-br from-teal-50 via-blue-50/30 to-white">
  <div class="absolute inset-0 bg-gradient-to-br from-teal-50 via-blue-50/30 to-white opacity-70"></div>
  <div class="container mx-auto px-4 py-16 relative z-10">
    <div class="text-center max-w-4xl mx-auto">
      <h1 class="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-700 to-blue-700 mb-6">
        Visite Specialistiche
      </h1>
      <p class="text-xl text-gray-600 mb-8 leading-relaxed">
        Il nostro poliambulatorio offre un'ampia gamma di visite specialistiche con medici qualificati e strumentazione moderna.
      </p>
    </div>
  </div>
</section>

<!-- I Nostri Specialisti Section -->
<section class="py-20 bg-gradient-to-br from-teal-50 via-white to-cyan-50 relative overflow-hidden">
  <!-- Background decorations -->
  <div class="absolute top-0 right-0 w-64 h-64 bg-teal-200/20 rounded-full blur-3xl"></div>
  <div class="absolute bottom-0 left-0 w-96 h-96 bg-blue-200/20 rounded-full blur-3xl"></div>
  
  <div class="container mx-auto px-4 relative z-10">
    <!-- Section Header -->
    <div class="text-center mb-12">
      <div class="inline-block bg-teal-100 p-3 rounded-full mb-4">
        <svg class="w-8 h-8 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
        </svg>
      </div>
      <h2 class="text-4xl font-extrabold text-teal-900 mb-3">I Nostri Specialisti</h2>
      <div class="w-24 h-1 bg-gradient-to-r from-teal-500 to-blue-500 mx-auto rounded-full mb-6"></div>
      <p class="text-gray-600 max-w-2xl mx-auto text-lg">
        Professionisti qualificati e costantemente aggiornati per garantirti le migliori cure
      </p>
    </div>

    <!-- Specialisti Cards Grid - UNIFORMI E ALLINEATE -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
      
      <!-- Card Cardiologia -->
      <div class="bg-white rounded-2xl shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 border border-gray-100 overflow-hidden flex flex-col h-full">
        <div class="p-8 flex flex-col flex-grow">
          <!-- Icon -->
          <div class="w-16 h-16 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
            </svg>
          </div>
          
          <!-- Content -->
          <h3 class="text-2xl font-bold text-gray-900 mb-3">Cardiologia</h3>
          <p class="text-gray-600 mb-6 flex-grow">
            Visita cardiologica completa, ECG, Holter pressorio e cardiaco
          </p>
          
          <!-- Button -->
          <a href="/prenota" class="inline-flex items-center justify-center w-full px-6 py-3 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 transition-colors shadow-md hover:shadow-lg">
            <span>Prenota Ora</span>
            <svg class="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
            </svg>
          </a>
        </div>
      </div>

      <!-- Card Dermatologia -->
      <div class="bg-white rounded-2xl shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 border border-gray-100 overflow-hidden flex flex-col h-full">
        <div class="p-8 flex flex-col flex-grow">
          <!-- Icon -->
          <div class="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          
          <!-- Content -->
          <h3 class="text-2xl font-bold text-gray-900 mb-3">Dermatologia</h3>
          <p class="text-gray-600 mb-6 flex-grow">
            Controllo nei, mappatura e trattamento patologie cutanee
          </p>
          
          <!-- Button -->
          <a href="/prenota" class="inline-flex items-center justify-center w-full px-6 py-3 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 transition-colors shadow-md hover:shadow-lg">
            <span>Prenota Ora</span>
            <svg class="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
            </svg>
          </a>
        </div>
      </div>

      <!-- Card Ortopedia -->
      <div class="bg-white rounded-2xl shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 border border-gray-100 overflow-hidden flex flex-col h-full">
        <div class="p-8 flex flex-col flex-grow">
          <!-- Icon -->
          <div class="w-16 h-16 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
            </svg>
          </div>
          
          <!-- Content -->
          <h3 class="text-2xl font-bold text-gray-900 mb-3">Ortopedia</h3>
          <p class="text-gray-600 mb-6 flex-grow">
            Valutazione e trattamento patologie muscolo-scheletriche
          </p>
          
          <!-- Button -->
          <a href="/prenota" class="inline-flex items-center justify-center w-full px-6 py-3 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 transition-colors shadow-md hover:shadow-lg">
            <span>Prenota Ora</span>
            <svg class="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
            </svg>
          </a>
        </div>
      </div>

      <!-- Card Oculistica -->
      <div class="bg-white rounded-2xl shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 border border-gray-100 overflow-hidden flex flex-col h-full">
        <div class="p-8 flex flex-col flex-grow">
          <!-- Icon -->
          <div class="w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
            </svg>
          </div>
          
          <!-- Content -->
          <h3 class="text-2xl font-bold text-gray-900 mb-3">Oculistica</h3>
          <p class="text-gray-600 mb-6 flex-grow">
            Controllo della vista, esame del fondo oculare e test specifici
          </p>
          
          <!-- Button -->
          <a href="/prenota" class="inline-flex items-center justify-center w-full px-6 py-3 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 transition-colors shadow-md hover:shadow-lg">
            <span>Prenota Ora</span>
            <svg class="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
            </svg>
          </a>
        </div>
      </div>

      <!-- Card Ginecologia -->
      <div class="bg-white rounded-2xl shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 border border-gray-100 overflow-hidden flex flex-col h-full">
        <div class="p-8 flex flex-col flex-grow">
          <!-- Icon -->
          <div class="w-16 h-16 bg-gradient-to-br from-pink-500 to-pink-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
            </svg>
          </div>
          
          <!-- Content -->
          <h3 class="text-2xl font-bold text-gray-900 mb-3">Ginecologia</h3>
          <p class="text-gray-600 mb-6 flex-grow">
            Visita ginecologica, pap-test ed ecografia ginecologica
          </p>
          
          <!-- Button -->
          <a href="/prenota" class="inline-flex items-center justify-center w-full px-6 py-3 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 transition-colors shadow-md hover:shadow-lg">
            <span>Prenota Ora</span>
            <svg class="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
            </svg>
          </a>
        </div>
      </div>

      <!-- Card Otorinolaringoiatria -->
      <div class="bg-white rounded-2xl shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 border border-gray-100 overflow-hidden flex flex-col h-full">
        <div class="p-8 flex flex-col flex-grow">
          <!-- Icon -->
          <div class="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path>
            </svg>
          </div>
          
          <!-- Content -->
          <h3 class="text-2xl font-bold text-gray-900 mb-3">Otorinolaringoiatria</h3>
          <p class="text-gray-600 mb-6 flex-grow">
            Visita ORL, esame audiometrico e trattamento patologie naso-gola
          </p>
          
          <!-- Button -->
          <a href="/prenota" class="inline-flex items-center justify-center w-full px-6 py-3 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 transition-colors shadow-md hover:shadow-lg">
            <span>Prenota Ora</span>
            <svg class="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
            </svg>
          </a>
        </div>
      </div>

    </div>
  </div>
</section>

<!-- CTA Section - Prenota la Tua Visita -->
<section class="py-20 bg-gradient-to-r from-teal-700 via-teal-800 to-blue-800 relative overflow-hidden">
  <!-- Background effects -->
  <div class="absolute inset-0 bg-black/10"></div>
  <div class="absolute top-0 left-0 w-96 h-96 bg-teal-500/20 rounded-full blur-3xl"></div>
  <div class="absolute bottom-0 right-0 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl"></div>
  
  <div class="container mx-auto px-4 relative z-10">
    <div class="text-center max-w-4xl mx-auto">
      <h2 class="text-4xl md:text-5xl font-extrabold text-white mb-6 drop-shadow-lg">
        Prenota Subito la Tua Visita Specialistica
      </h2>
      <p class="text-xl text-white/90 mb-10 leading-relaxed">
        Professionisti qualificati, tecnologie all'avanguardia e tempi di attesa ridotti
      </p>
      
      <div class="flex flex-col sm:flex-row gap-6 justify-center items-center">
        <a href="/prenota" class="inline-flex items-center justify-center px-8 py-4 bg-white text-teal-800 font-bold text-lg rounded-xl hover:bg-teal-50 transition-all duration-300 shadow-2xl hover:shadow-3xl hover:scale-105">
          <svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
          </svg>
          <span>Prenota Online</span>
        </a>
        
        <a href="/contatti" class="inline-flex items-center justify-center px-8 py-4 bg-white/10 backdrop-blur-lg text-white font-bold text-lg rounded-xl border-2 border-white hover:bg-white hover:text-teal-800 transition-all duration-300 shadow-xl hover:scale-105">
          <svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
          </svg>
          <span>Richiedi Informazioni</span>
        </a>
      </div>
    </div>
  </div>
</section>
`;

async function fixVisitePage() {
  console.log('\n🔧 FIXING VISITE SPECIALISTICHE PAGE LAYOUT\n');
  
  try {
    const updated = await prisma.cMSPage.update({
      where: { slug: 'visite-specialistiche' },
      data: {
        content: optimizedHTML.trim(),
        updatedAt: new Date()
      }
    });
    
    console.log('✅ Page updated successfully!');
    console.log('   Slug:', updated.slug);
    console.log('   Title:', updated.title);
    console.log('   Content length:', updated.content.length, 'characters');
    console.log('\n📋 Changes applied:');
    console.log('   ✓ Hero section pulita e centrata');
    console.log('   ✓ Card specialisti uniformi e allineate (h-full + flex)');
    console.log('   ✓ Tutti i pulsanti uguali (stesso stile e dimensione)');
    console.log('   ✓ Spacing consistente (gap-8, padding-8)');
    console.log('   ✓ Grid responsive (1 col mobile, 2 tablet, 3 desktop)');
    console.log('   ✓ CTA section finale con design professionale');
    console.log('\n🎨 Visual improvements:');
    console.log('   ✓ Icone colorate con gradient');
    console.log('   ✓ Hover effects consistenti');
    console.log('   ✓ Shadows uniformi');
    console.log('   ✓ Typography coerente');
    
  } catch (error) {
    console.error('❌ Error updating page:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fixVisitePage();
