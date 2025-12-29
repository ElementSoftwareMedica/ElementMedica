const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function fixMedicinaAndRspp() {
  console.log('🔧 COMPLETE FIX: medicina-del-lavoro + rspp expansion\n');
  
  // ===========================
  // 1. FIX MEDICINA-DEL-LAVORO
  // ===========================
  
  const medicina = await prisma.cMSPage.findFirst({
    where: { slug: 'medicina-del-lavoro-medica' }
  });
  
  if (medicina) {
    console.log('📝 MEDICINA-DEL-LAVORO: Applying professional design...');
    
    let content = String(medicina.content);
    
    // The page has bg-white cards with shadow effects but user reports white-on-white
    // Let's enhance with gradient overlays and better contrast
    
    // 1. Enhance hero with floating blur circles
    content = content.replace(
      /(<section class="relative bg-gradient-to-br from-teal-50\/30 via-white to-blue-50\/30 py-16 md:py-20">)/,
      `$1
        <!-- Floating Blur Circles -->
        <div class="absolute top-20 right-10 w-72 h-72 bg-teal-200/30 rounded-full blur-3xl animate-pulse"></div>
        <div class="absolute bottom-20 left-10 w-96 h-96 bg-blue-200/20 rounded-full blur-3xl"></div>
        <div class="absolute top-1/2 left-1/3 w-64 h-64 bg-purple-200/20 rounded-full blur-3xl"></div>
        `
    );
    
    // 2. Add pattern overlay to hero
    content = content.replace(
      /(<section class="relative bg-gradient-to-br from-teal-50\/30 via-white to-blue-50\/30 py-16 md:py-20">[\s\S]*?<!-- Floating Blur Circles -->[\s\S]*?<\/div>)/,
      `$1
        <!-- Pattern Overlay -->
        <div class="absolute inset-0 opacity-5" style="background-image: radial-gradient(circle at 2px 2px, rgba(13, 148, 136, 0.4) 1px, transparent 0); background-size: 32px 32px;"></div>
        `
    );
    
    // 3. Enhance service cards with gradient backgrounds instead of plain white
    content = content.replace(
      /<div class="bg-white rounded-xl shadow-xl hover:shadow-xl hover:shadow-3xl transition-shadow duration-300 transition-shadow duration-300 hover:shadow-xl hover:shadow-3xl transition-shadow duration-300 transition-all duration-300 overflow-hidden border border-gray-100 group">/g,
      '<div class="bg-gradient-to-br from-white via-teal-50/20 to-blue-50/30 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden border border-teal-100/50 group relative">'
    );
    
    // 4. Add icon badges to all service cards (make them more visible)
    content = content.replace(
      /<div class="w-14 h-14 md:w-16 md:h-16 bg-teal-100 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">/g,
      '<div class="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-teal-100 to-teal-200 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg border-2 border-white">'
    );
    
    // 5. Enhance section headers with gradient underlines
    content = content.replace(
      /<h2 class="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-4">/g,
      '<h2 class="text-3xl md:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-6 relative inline-block"><span class="absolute -bottom-2 left-0 w-full h-1 bg-gradient-to-r from-teal-500 to-blue-500 rounded-full"></span>'
    );
    
    // Close span for gradient underline
    content = content.replace(
      /<\/h2>/g,
      '</span></h2>'
    );
    
    // 6. Make "Medicina del Lavoro" section header more readable
    content = content.replace(
      /I Nostri Servizi di <span class="bg-gradient-to-r from-teal-600 to-blue-600 bg-clip-text text-transparent">Medicina del Lavoro<\/span>/,
      'I Nostri Servizi di <span class="text-teal-700 font-black">Medicina del Lavoro</span>'
    );
    
    // 7. Enhance service card titles
    content = content.replace(
      /<h3 class="text-xl font-bold text-gray-900 mb-3">/g,
      '<h3 class="text-xl md:text-2xl font-black text-gray-900 mb-4 group-hover:text-teal-700 transition-colors">'
    );
    
    // 8. Add hover effect to service paragraphs
    content = content.replace(
      /<p class="text-gray-600 mb-4">/g,
      '<p class="text-gray-700 mb-6 leading-relaxed">'
    );
    
    // 9. Enhance CTA buttons
    content = content.replace(
      /class="inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-teal-600 to-teal-700 text-white font-semibold/g,
      'class="inline-flex items-center justify-center px-10 py-5 bg-gradient-to-r from-teal-600 to-teal-700 text-white font-black text-lg'
    );
    
    // 10. Enhance white buttons
    content = content.replace(
      /class="inline-flex items-center justify-center px-8 py-4 bg-white !text-teal-700 font-semibold/g,
      'class="inline-flex items-center justify-center px-10 py-5 bg-white !text-teal-700 font-black text-lg'
    );
    
    // Update database
    await prisma.cMSPage.update({
      where: { id: medicina.id },
      data: { content }
    });
    
    console.log('   ✅ Medicina enhanced with gradients, patterns, and professional design');
    console.log('   📊 Final length:', content.length, 'chars');
  }
  
  // ===========================
  // 2. FIX AND EXPAND RSPP
  // ===========================
  
  const rspp = await prisma.cMSPage.findFirst({
    where: { slug: 'rspp' }
  });
  
  if (rspp) {
    console.log('\n📝 RSPP: Creating expanded professional page...');
    
    // Current content is just "[object Object]" - needs complete rewrite
    const newRsppContent = `
      <!-- Hero Section RSPP -->
      <section class="relative bg-gradient-to-br from-blue-900 via-teal-800 to-teal-900 py-20 md:py-28 overflow-hidden">
        <!-- Floating Blur Circles -->
        <div class="absolute top-20 right-10 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl"></div>
        <div class="absolute bottom-20 left-10 w-80 h-80 bg-teal-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div class="absolute top-1/2 right-1/3 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl"></div>
        
        <!-- Pattern Overlay -->
        <div class="absolute inset-0 opacity-5" style="background-image: radial-gradient(circle at 2px 2px, white 1px, transparent 0); background-size: 40px 40px;"></div>
        
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div class="space-y-8">
              <div class="inline-flex items-center space-x-3 bg-white/10 backdrop-blur-md text-white border border-white/30 px-6 py-3 rounded-full text-sm font-bold">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span>Sicurezza Certificata</span>
              </div>
              
              <h1 class="text-4xl md:text-5xl lg:text-6xl font-black !text-white leading-tight" style="text-shadow: 0 4px 12px rgba(0,0,0,0.3);">
                Servizio RSPP<br/>
                <span class="text-teal-300">Professionale</span>
              </h1>
              
              <p class="text-xl md:text-2xl !text-white/90 leading-relaxed" style="text-shadow: 0 2px 8px rgba(0,0,0,0.2);">
                Responsabile del Servizio di Prevenzione e Protezione esterno per la tua azienda. Competenza, esperienza e conformità normativa garantite.
              </p>
              
              <!-- Stats -->
              <div class="grid grid-cols-3 gap-6 pt-6">
                <div class="text-center">
                  <div class="text-4xl font-black !text-white">500+</div>
                  <div class="text-sm !text-white/80 mt-1">Aziende</div>
                </div>
                <div class="text-center">
                  <div class="text-4xl font-black !text-white">15+</div>
                  <div class="text-sm !text-white/80 mt-1">Anni Esperienza</div>
                </div>
                <div class="text-center">
                  <div class="text-4xl font-black !text-white">H24</div>
                  <div class="text-sm !text-white/80 mt-1">Supporto</div>
                </div>
              </div>
              
              <!-- CTAs -->
              <div class="flex flex-col sm:flex-row gap-4 pt-4">
                <a href="/contatti" class="inline-flex items-center justify-center px-10 py-5 bg-white !text-teal-700 font-black text-lg rounded-2xl hover:bg-teal-50 transition-all duration-300 shadow-2xl hover:shadow-3xl hover:-translate-y-1">
                  <span>Richiedi Preventivo</span>
                  <svg class="w-6 h-6 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </a>
                <a href="tel:+390422308999" class="inline-flex items-center justify-center px-10 py-5 border-3 border-white !text-white font-black text-lg rounded-2xl hover:bg-white hover:!text-teal-700 transition-all duration-300" style="background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(10px);">
                  <svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span>Chiama Ora</span>
                </a>
              </div>
            </div>
            
            <div class="relative lg:block hidden">
              <div class="aspect-square bg-gradient-to-br from-teal-300/20 to-blue-300/20 rounded-full flex items-center justify-center backdrop-blur-sm border-4 border-white/30 shadow-2xl">
                <svg class="w-48 h-48 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      <!-- Cosa Facciamo Section -->
      <section class="py-20 md:py-28 bg-gradient-to-b from-white via-gray-50/50 to-white relative">
        <div class="absolute top-0 left-1/4 w-96 h-96 bg-teal-100/30 rounded-full blur-3xl"></div>
        
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div class="text-center mb-16">
            <h2 class="text-4xl md:text-5xl font-black text-gray-900 mb-6 relative inline-block">
              <span class="absolute -bottom-2 left-0 w-full h-2 bg-gradient-to-r from-teal-500 to-blue-500 rounded-full"></span>
              <span>Cosa Fa il Nostro <span class="text-teal-700">RSPP Esterno</span></span>
            </h2>
            <p class="text-xl text-gray-600 max-w-3xl mx-auto mt-8">
              Un servizio completo per la gestione della sicurezza sul lavoro nella tua azienda
            </p>
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <!-- Service 1 -->
            <div class="bg-gradient-to-br from-white via-teal-50/20 to-blue-50/30 rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 border border-teal-100/50 group relative overflow-hidden">
              <div class="absolute -right-8 -top-8 w-32 h-32 bg-teal-100/30 rounded-full blur-2xl group-hover:bg-teal-200/50 transition-colors"></div>
              
              <div class="w-20 h-20 bg-gradient-to-br from-teal-100 to-teal-200 rounded-full flex items-center justify-center mb-6 shadow-lg border-2 border-white relative z-10 group-hover:scale-110 transition-transform">
                <svg class="w-10 h-10 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              
              <h3 class="text-2xl font-black text-gray-900 mb-4 group-hover:text-teal-700 transition-colors">Valutazione dei Rischi</h3>
              <p class="text-gray-700 leading-relaxed">
                Redazione e aggiornamento del Documento di Valutazione dei Rischi (DVR) secondo il D.Lgs. 81/08, con analisi dettagliata di tutti i rischi presenti in azienda.
              </p>
            </div>
            
            <!-- Service 2 -->
            <div class="bg-gradient-to-br from-white via-teal-50/20 to-blue-50/30 rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 border border-teal-100/50 group relative overflow-hidden">
              <div class="absolute -right-8 -top-8 w-32 h-32 bg-blue-100/30 rounded-full blur-2xl group-hover:bg-blue-200/50 transition-colors"></div>
              
              <div class="w-20 h-20 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center mb-6 shadow-lg border-2 border-white relative z-10 group-hover:scale-110 transition-transform">
                <svg class="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              
              <h3 class="text-2xl font-black text-gray-900 mb-4 group-hover:text-blue-700 transition-colors">Formazione Lavoratori</h3>
              <p class="text-gray-700 leading-relaxed">
                Pianificazione e coordinamento dei corsi di formazione obbligatori per tutti i livelli: generale, specifica, preposti, dirigenti e aggiornamenti periodici.
              </p>
            </div>
            
            <!-- Service 3 -->
            <div class="bg-gradient-to-br from-white via-teal-50/20 to-blue-50/30 rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 border border-teal-100/50 group relative overflow-hidden">
              <div class="absolute -right-8 -top-8 w-32 h-32 bg-purple-100/30 rounded-full blur-2xl group-hover:bg-purple-200/50 transition-colors"></div>
              
              <div class="w-20 h-20 bg-gradient-to-br from-purple-100 to-purple-200 rounded-full flex items-center justify-center mb-6 shadow-lg border-2 border-white relative z-10 group-hover:scale-110 transition-transform">
                <svg class="w-10 h-10 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              
              <h3 class="text-2xl font-black text-gray-900 mb-4 group-hover:text-purple-700 transition-colors">Sopralluoghi Periodici</h3>
              <p class="text-gray-700 leading-relaxed">
                Visite in azienda programmate per verificare l'applicazione delle misure di sicurezza, individuare nuovi rischi e proporre miglioramenti continui.
              </p>
            </div>
            
            <!-- Service 4 -->
            <div class="bg-gradient-to-br from-white via-teal-50/20 to-blue-50/30 rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 border border-teal-100/50 group relative overflow-hidden">
              <div class="absolute -right-8 -top-8 w-32 h-32 bg-orange-100/30 rounded-full blur-2xl group-hover:bg-orange-200/50 transition-colors"></div>
              
              <div class="w-20 h-20 bg-gradient-to-br from-orange-100 to-orange-200 rounded-full flex items-center justify-center mb-6 shadow-lg border-2 border-white relative z-10 group-hover:scale-110 transition-transform">
                <svg class="w-10 h-10 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              
              <h3 class="text-2xl font-black text-gray-900 mb-4 group-hover:text-orange-700 transition-colors">Gestione Emergenze</h3>
              <p class="text-gray-700 leading-relaxed">
                Elaborazione del piano di emergenza ed evacuazione, coordinamento con addetti antincendio e primo soccorso, simulazioni ed esercitazioni.
              </p>
            </div>
            
            <!-- Service 5 -->
            <div class="bg-gradient-to-br from-white via-teal-50/20 to-blue-50/30 rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 border border-teal-100/50 group relative overflow-hidden">
              <div class="absolute -right-8 -top-8 w-32 h-32 bg-green-100/30 rounded-full blur-2xl group-hover:bg-green-200/50 transition-colors"></div>
              
              <div class="w-20 h-20 bg-gradient-to-br from-green-100 to-green-200 rounded-full flex items-center justify-center mb-6 shadow-lg border-2 border-white relative z-10 group-hover:scale-110 transition-transform">
                <svg class="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              
              <h3 class="text-2xl font-black text-gray-900 mb-4 group-hover:text-green-700 transition-colors">Scadenze Normative</h3>
              <p class="text-gray-700 leading-relaxed">
                Monitoraggio e gestione di tutte le scadenze relative a formazione, visite mediche, verifiche impianti e aggiornamenti documentali obbligatori.
              </p>
            </div>
            
            <!-- Service 6 -->
            <div class="bg-gradient-to-br from-white via-teal-50/20 to-blue-50/30 rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 border border-teal-100/50 group relative overflow-hidden">
              <div class="absolute -right-8 -top-8 w-32 h-32 bg-red-100/30 rounded-full blur-2xl group-hover:bg-red-200/50 transition-colors"></div>
              
              <div class="w-20 h-20 bg-gradient-to-br from-red-100 to-red-200 rounded-full flex items-center justify-center mb-6 shadow-lg border-2 border-white relative z-10 group-hover:scale-110 transition-transform">
                <svg class="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              
              <h3 class="text-2xl font-black text-gray-900 mb-4 group-hover:text-red-700 transition-colors">Consulenza Continua</h3>
              <p class="text-gray-700 leading-relaxed">
                Supporto costante per dubbi normativi, gestione infortuni, rapporti con organi di vigilanza e implementazione di sistemi di gestione della sicurezza.
              </p>
            </div>
          </div>
        </div>
      </section>
      
      <!-- Vantaggi Section -->
      <section class="py-20 md:py-28 bg-gradient-to-br from-teal-50 via-blue-50/50 to-white relative overflow-hidden">
        <div class="absolute top-0 right-0 w-96 h-96 bg-teal-200/20 rounded-full blur-3xl"></div>
        <div class="absolute bottom-0 left-0 w-80 h-80 bg-blue-200/20 rounded-full blur-3xl"></div>
        
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div class="text-center mb-16">
            <h2 class="text-4xl md:text-5xl font-black text-gray-900 mb-6">
              Perché Scegliere il Nostro <span class="text-teal-700">RSPP Esterno</span>
            </h2>
            <p class="text-xl text-gray-600 max-w-3xl mx-auto">
              I vantaggi di affidarsi a professionisti esperti per la sicurezza aziendale
            </p>
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <div class="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-teal-100 hover:shadow-2xl transition-all duration-300">
              <div class="flex items-start space-x-4">
                <div class="flex-shrink-0">
                  <div class="w-12 h-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg">✓</div>
                </div>
                <div>
                  <h3 class="text-xl font-black text-gray-900 mb-2">Riduzione Costi</h3>
                  <p class="text-gray-700">Eviti l'assunzione di una figura interna dedicata, con tutti i relativi costi fissi di personale.</p>
                </div>
              </div>
            </div>
            
            <div class="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-teal-100 hover:shadow-2xl transition-all duration-300">
              <div class="flex items-start space-x-4">
                <div class="flex-shrink-0">
                  <div class="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg">✓</div>
                </div>
                <div>
                  <h3 class="text-xl font-black text-gray-900 mb-2">Competenza Specialistica</h3>
                  <p class="text-gray-700">Accesso a professionisti aggiornati su normative, best practice e tecnologie per la sicurezza.</p>
                </div>
              </div>
            </div>
            
            <div class="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-teal-100 hover:shadow-2xl transition-all duration-300">
              <div class="flex items-start space-x-4">
                <div class="flex-shrink-0">
                  <div class="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg">✓</div>
                </div>
                <div>
                  <h3 class="text-xl font-black text-gray-900 mb-2">Flessibilità</h3>
                  <p class="text-gray-700">Interventi calibrati sulle reali esigenze aziendali, senza vincoli di orario o presenza fissa.</p>
                </div>
              </div>
            </div>
            
            <div class="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-teal-100 hover:shadow-2xl transition-all duration-300">
              <div class="flex items-start space-x-4">
                <div class="flex-shrink-0">
                  <div class="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg">✓</div>
                </div>
                <div>
                  <h3 class="text-xl font-black text-gray-900 mb-2">Conformità Garantita</h3>
                  <p class="text-gray-700">Sicurezza di essere sempre in regola con tutte le disposizioni del D.Lgs. 81/08 e successive modifiche.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      <!-- FAQ Section -->
      <section class="py-20 md:py-28 bg-white">
        <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="text-center mb-16">
            <h2 class="text-4xl md:text-5xl font-black text-gray-900 mb-6">
              Domande <span class="text-teal-700">Frequenti</span>
            </h2>
            <p class="text-xl text-gray-600">
              Risposte alle domande più comuni sul servizio RSPP esterno
            </p>
          </div>
          
          <div class="space-y-6">
            <div class="bg-gradient-to-br from-white to-teal-50/30 rounded-2xl p-8 shadow-lg border border-teal-100/50">
              <h3 class="text-xl font-black text-gray-900 mb-3">Quali aziende devono nominare un RSPP?</h3>
              <p class="text-gray-700 leading-relaxed">
                Tutte le aziende con almeno un lavoratore dipendente o equiparato sono obbligate per legge ad avere un RSPP (Responsabile del Servizio di Prevenzione e Protezione). Può essere interno o esterno all'azienda.
              </p>
            </div>
            
            <div class="bg-gradient-to-br from-white to-blue-50/30 rounded-2xl p-8 shadow-lg border border-blue-100/50">
              <h3 class="text-xl font-black text-gray-900 mb-3">Che differenza c'è tra RSPP interno ed esterno?</h3>
              <p class="text-gray-700 leading-relaxed">
                L'RSPP interno è un dipendente dell'azienda formato specificamente, mentre l'RSPP esterno è un professionista o consulente esterno. La scelta dell'esterno offre maggiore flessibilità, competenza specialistica e riduzione dei costi.
              </p>
            </div>
            
            <div class="bg-gradient-to-br from-white to-purple-50/30 rounded-2xl p-8 shadow-lg border border-purple-100/50">
              <h3 class="text-xl font-black text-gray-900 mb-3">Quali sono i requisiti per essere RSPP esterno?</h3>
              <p class="text-gray-700 leading-relaxed">
                L'RSPP esterno deve possedere titolo di studio non inferiore al diploma di scuola superiore e aver frequentato corsi specifici (moduli A, B, C) secondo l'Accordo Stato-Regioni, con aggiornamenti periodici obbligatori.
              </p>
            </div>
            
            <div class="bg-gradient-to-br from-white to-green-50/30 rounded-2xl p-8 shadow-lg border border-green-100/50">
              <h3 class="text-xl font-black text-gray-900 mb-3">Quanto costa il servizio RSPP esterno?</h3>
              <p class="text-gray-700 leading-relaxed">
                Il costo varia in base a dimensioni aziendali, settore di attività, numero di dipendenti e complessità dei rischi. Contattateci per un preventivo personalizzato e senza impegno.
              </p>
            </div>
            
            <div class="bg-gradient-to-br from-white to-orange-50/30 rounded-2xl p-8 shadow-lg border border-orange-100/50">
              <h3 class="text-xl font-black text-gray-900 mb-3">Con quale frequenza l'RSPP visita l'azienda?</h3>
              <p class="text-gray-700 leading-relaxed">
                La frequenza è stabilita in base alle esigenze aziendali e ai rischi presenti. In generale si prevedono sopralluoghi periodici (mensili, trimestrali o semestrali) oltre a interventi su chiamata per necessità specifiche.
              </p>
            </div>
          </div>
        </div>
      </section>
      
      <!-- Final CTA -->
      <section class="py-20 bg-gradient-to-r from-teal-900 via-blue-900 to-teal-900 relative overflow-hidden">
        <div class="absolute inset-0 opacity-10" style="background-image: radial-gradient(circle at 2px 2px, white 1px, transparent 0); background-size: 32px 32px;"></div>
        
        <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 class="text-4xl md:text-5xl font-black !text-white mb-6" style="text-shadow: 0 4px 12px rgba(0,0,0,0.3);">
            Pronto a Mettere in Sicurezza la Tua Azienda?
          </h2>
          <p class="text-xl md:text-2xl !text-white/90 mb-10" style="text-shadow: 0 2px 8px rgba(0,0,0,0.2);">
            Contattaci per una consulenza gratuita e un preventivo personalizzato
          </p>
          
          <div class="flex flex-col sm:flex-row gap-6 justify-center">
            <a href="/contatti" class="inline-flex items-center justify-center px-12 py-6 bg-white !text-teal-700 font-black text-xl rounded-2xl hover:bg-teal-50 transition-all duration-300 shadow-2xl hover:shadow-3xl hover:-translate-y-1">
              <span>Richiedi Preventivo Gratuito</span>
              <svg class="w-6 h-6 ml-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </a>
            
            <a href="tel:+390422308999" class="inline-flex items-center justify-center px-12 py-6 border-3 border-white !text-white font-black text-xl rounded-2xl hover:bg-white hover:!text-teal-700 transition-all duration-300" style="background: rgba(255, 255, 255, 0.15); backdrop-filter: blur(10px);">
              <svg class="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <span>0422 308 999</span>
            </a>
          </div>
        </div>
      </section>
    `;
    
    // Update database with new expanded content
    await prisma.cMSPage.update({
      where: { id: rspp.id },
      data: { content: newRsppContent.trim() }
    });
    
    console.log('   ✅ RSPP completely rebuilt and expanded');
    console.log('   📊 New length:', newRsppContent.length, 'chars');
    console.log('   📋 Sections added: Hero, Services (6), Benefits (4), FAQ (5), Final CTA');
  }
  
  await prisma.$disconnect();
  console.log('\n✅ ALL DONE! Both pages updated successfully.');
}

fixMedicinaAndRspp().catch(console.error);
