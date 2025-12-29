const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔧 FIXING ALL CMS PAGES...\n');
  
  // ========================================
  // 1. FIX VISITE-SPECIALISTICHE
  // ========================================
  
  let visiteSpecPage = await prisma.cMSPage.findUnique({
    where: { slug: 'visite-specialistiche' }
  });
  
  if (visiteSpecPage) {
    let content = visiteSpecPage.content;
    
    // Remove any test banners
    content = content.replace(/<!-- ⚠️.*?<\/div>\s*/gs, '');
    content = content.replace(/<div[^>]*TEST MARKER.*?<\/div>/gs, '');
    content = content.replace(/<div[^>]*CACHE.*?<\/div>/gs, '');
    
    // Fix the malformed "Prenota la Tua Visita" section with duplicate div
    content = content.replace(
      /<div class="bg-gradient-to-r\s+<div class="bg-gradient-to-r from-teal-900 to-blue-900 text-white p-8 rounded-lg my-12 text-center">/g,
      '<div class="bg-gradient-to-r from-teal-900 to-blue-900 text-white p-8 rounded-lg my-12 text-center">'
    );
    
    // Enhance the section with better styling
    content = content.replace(
      /<div class="bg-gradient-to-r from-teal-900 to-blue-900 text-white p-8 rounded-lg my-12 text-center">([\s\S]*?)<\/div>/,
      function(match, innerContent) {
        return `
        <!-- Prenota Section with Enhanced Design -->
        <section class="py-16 relative overflow-hidden">
          <div class="absolute inset-0 bg-gradient-to-r from-teal-900 via-blue-900 to-teal-900" style="background-size: 200% 100%; animation: gradientShift 8s ease infinite;"></div>
          
          <!-- Decorative elements -->
          <div class="absolute top-0 right-0 w-96 h-96 bg-teal-400/10 rounded-full blur-3xl"></div>
          <div class="absolute bottom-0 left-0 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl"></div>
          
          <!-- Pattern overlay -->
          <div class="absolute inset-0 opacity-5" style="background-image: radial-gradient(circle at 2px 2px, white 1px, transparent 0); background-size: 40px 40px;"></div>
          
          <div class="container mx-auto px-4 relative z-10">
            <div class="max-w-3xl mx-auto text-center">
              <h2 class="text-4xl font-bold mb-6 text-white" style="text-shadow: 0 2px 10px rgba(0,0,0,0.3);">
                Prenota la Tua Visita
              </h2>
              <p class="text-xl mb-10 text-white/90 leading-relaxed">
                Contattaci per prenotare una visita specialistica o per maggiori informazioni.
              </p>
              
              <div class="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <a href="/contatti" class="inline-block bg-white text-teal-900 px-8 py-4 rounded-lg font-bold text-lg hover:bg-gray-50 transform hover:scale-105 transition-all shadow-xl hover:shadow-2xl">
                  📧 Contattaci
                </a>
                <a href="/prenota" class="inline-block px-8 py-4 rounded-lg font-bold text-lg text-white border-2 border-white hover:bg-white hover:text-teal-900 transform hover:scale-105 transition-all" style="background: rgba(255, 255, 255, 0.15); backdrop-filter: blur(10px);">
                  📅 Prenota Online
                </a>
              </div>
            </div>
          </div>
        </section>`;
      }
    );
    
    await prisma.cMSPage.update({
      where: { slug: 'visite-specialistiche' },
      data: { content }
    });
    
    console.log('✅ visite-specialistiche: Fixed duplicate div and enhanced section design');
  }
  
  // ========================================
  // 2. FIX MEDICINA-DEL-LAVORO-MEDICA
  // ========================================
  
  let medicinaPage = await prisma.cMSPage.findUnique({
    where: { slug: 'medicina-del-lavoro-medica' }
  });
  
  if (medicinaPage) {
    let content = medicinaPage.content;
    
    // Fix white-on-white issues by ensuring proper contrast
    // The hero section statistics should have better contrast
    content = content.replace(
      /<div class="text-4xl font-bold text-white mb-2">(\d+\+?)<\/div>\s*<div class="text-white">/g,
      '<div class="text-4xl font-bold text-white mb-2" style="text-shadow: 0 2px 8px rgba(0,0,0,0.4);">$1</div>\n                <div class="text-white/95" style="text-shadow: 0 1px 4px rgba(0,0,0,0.3);">'
    );
    
    // Fix trust badges
    content = content.replace(
      /<span class="font-semibold">/g,
      '<span class="font-semibold" style="text-shadow: 0 1px 3px rgba(0,0,0,0.2);">'
    );
    
    // Fix the CTA section - ensure buttons have proper background
    content = content.replace(
      /<a href="\/contatti" class="inline-block bg-white text-cyan-900/g,
      '<a href="/contatti" class="inline-block bg-white text-cyan-900 hover:bg-gray-50'
    );
    
    // Fix the partner badges at bottom
    content = content.replace(
      /<span class="bg-cyan-700 px-4 py-2 rounded-full">/g,
      '<span class="bg-cyan-800 px-4 py-2 rounded-full text-white font-medium">'
    );
    
    // Enhance service cards if they exist
    content = content.replace(
      /<div class="bg-white rounded-xl/g,
      '<div class="bg-gradient-to-br from-white via-gray-50 to-teal-50/30 rounded-xl border border-gray-200'
    );
    
    // Fix any white text that might be on white background in content sections
    content = content.replace(
      /<p class="text-gray-600">/g,
      '<p class="text-gray-700">'
    );
    
    await prisma.cMSPage.update({
      where: { slug: 'medicina-del-lavoro-medica' },
      data: { content }
    });
    
    console.log('✅ medicina-del-lavoro-medica: Enhanced contrast and fixed white-on-white issues');
  }
  
  // ========================================
  // 3. EXPAND & IMPROVE RSPP PAGE
  // ========================================
  
  let rsppPage = await prisma.cMSPage.findUnique({
    where: { slug: 'rspp' }
  });
  
  if (rsppPage) {
    let content = rsppPage.content;
    
    // Enhance the existing RSPP page with more comprehensive content
    // Add rich, expanded sections
    
    const enhancedRsppContent = `
<!-- Hero Section -->
<section class="relative py-24 bg-gradient-to-br from-gray-900 via-blue-900 to-teal-900 text-white overflow-hidden">
  <!-- Animated background -->
  <div class="absolute inset-0 opacity-20">
    <div class="absolute top-0 left-0 w-96 h-96 bg-teal-500 rounded-full blur-3xl animate-pulse"></div>
    <div class="absolute bottom-0 right-0 w-96 h-96 bg-blue-500 rounded-full blur-3xl animate-pulse" style="animation-delay: 1s;"></div>
  </div>
  
  <!-- Pattern overlay -->
  <div class="absolute inset-0 opacity-10" style="background-image: radial-gradient(circle at 2px 2px, white 1px, transparent 0); background-size: 40px 40px;"></div>
  
  <div class="container mx-auto px-4 relative z-10">
    <div class="max-w-4xl mx-auto text-center">
      <div class="inline-block bg-teal-500/20 backdrop-blur-sm border border-teal-400/30 rounded-full px-6 py-2 mb-6">
        <span class="text-teal-300 font-semibold">🛡️ Servizio RSPP Esterno Certificato</span>
      </div>
      
      <h1 class="text-5xl lg:text-6xl font-bold mb-6 leading-tight" style="text-shadow: 0 4px 20px rgba(0,0,0,0.5);">
        Responsabile Servizio Prevenzione e Protezione
      </h1>
      
      <p class="text-xl lg:text-2xl text-gray-200 mb-12 leading-relaxed" style="text-shadow: 0 2px 10px rgba(0,0,0,0.3);">
        Affidati a professionisti esperti per la gestione completa della sicurezza aziendale 
        secondo il D.Lgs 81/08. RSPP qualificati, supporto continuo e consulenza strategica.
      </p>
      
      <!-- Statistics -->
      <div class="grid grid-cols-2 md:grid-cols-3 gap-8 mb-12">
        <div class="text-center">
          <div class="text-5xl font-bold mb-2 text-teal-300" style="text-shadow: 0 2px 10px rgba(0,0,0,0.4);">500+</div>
          <div class="text-gray-300">Aziende Seguite</div>
        </div>
        <div class="text-center">
          <div class="text-5xl font-bold mb-2 text-teal-300" style="text-shadow: 0 2px 10px rgba(0,0,0,0.4);">15+</div>
          <div class="text-gray-300">Anni Esperienza</div>
        </div>
        <div class="text-center col-span-2 md:col-span-1">
          <div class="text-5xl font-bold mb-2 text-teal-300" style="text-shadow: 0 2px 10px rgba(0,0,0,0.4);">H24</div>
          <div class="text-gray-300">Assistenza Disponibile</div>
        </div>
      </div>
      
      <div class="flex flex-col sm:flex-row gap-4 justify-center items-center">
        <a href="/contatti" class="inline-block bg-white text-gray-900 px-8 py-4 rounded-lg font-bold text-lg hover:bg-gray-100 transform hover:scale-105 transition-all shadow-xl">
          📞 Richiedi Consulenza Gratuita
        </a>
        <a href="#servizi" class="inline-block px-8 py-4 rounded-lg font-bold text-lg text-white border-2 border-white hover:bg-white hover:text-gray-900 transform hover:scale-105 transition-all" style="background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(10px);">
          📋 Scopri i Servizi
        </a>
      </div>
    </div>
  </div>
</section>

<!-- Servizi RSPP Section -->
<section id="servizi" class="py-20 bg-gradient-to-br from-gray-50 via-teal-50/30 to-blue-50/30 relative overflow-hidden">
  <div class="absolute top-0 right-0 w-96 h-96 bg-teal-200/30 rounded-full blur-3xl"></div>
  <div class="absolute bottom-0 left-0 w-96 h-96 bg-blue-200/30 rounded-full blur-3xl"></div>
  
  <div class="container mx-auto px-4 relative z-10">
    <div class="text-center mb-16">
      <h2 class="text-4xl lg:text-5xl font-bold mb-4 bg-gradient-to-r from-teal-700 to-blue-700 bg-clip-text text-transparent">
        I Nostri Servizi RSPP
      </h2>
      <p class="text-xl text-gray-700 max-w-3xl mx-auto">
        Supporto completo per tutte le esigenze di sicurezza aziendale, 
        dalla valutazione dei rischi alla formazione del personale
      </p>
    </div>
    
    <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
      <!-- Servizio 1 -->
      <div class="bg-white rounded-xl p-8 shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-2 border border-gray-200">
        <div class="w-16 h-16 bg-gradient-to-br from-teal-500 to-blue-600 rounded-2xl flex items-center justify-center mb-6 transform rotate-3">
          <span class="text-3xl">📊</span>
        </div>
        <h3 class="text-2xl font-bold mb-4 text-gray-900">Valutazione dei Rischi</h3>
        <p class="text-gray-700 mb-4 leading-relaxed">
          Analisi approfondita di tutti i rischi aziendali con redazione del Documento di Valutazione 
          dei Rischi (DVR) secondo normativa vigente.
        </p>
        <ul class="space-y-2 text-gray-600">
          <li class="flex items-start gap-2">
            <span class="text-teal-600 font-bold">✓</span>
            <span>DVR completo e aggiornato</span>
          </li>
          <li class="flex items-start gap-2">
            <span class="text-teal-600 font-bold">✓</span>
            <span>Valutazione rischi specifici</span>
          </li>
          <li class="flex items-start gap-2">
            <span class="text-teal-600 font-bold">✓</span>
            <span>Piano di miglioramento</span>
          </li>
        </ul>
      </div>
      
      <!-- Servizio 2 -->
      <div class="bg-white rounded-xl p-8 shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-2 border border-gray-200">
        <div class="w-16 h-16 bg-gradient-to-br from-blue-500 to-teal-600 rounded-2xl flex items-center justify-center mb-6 transform -rotate-3">
          <span class="text-3xl">👥</span>
        </div>
        <h3 class="text-2xl font-bold mb-4 text-gray-900">Formazione del Personale</h3>
        <p class="text-gray-700 mb-4 leading-relaxed">
          Corsi di formazione obbligatori e specialistici per lavoratori, preposti, 
          dirigenti e figure della sicurezza.
        </p>
        <ul class="space-y-2 text-gray-600">
          <li class="flex items-start gap-2">
            <span class="text-blue-600 font-bold">✓</span>
            <span>Formazione generale e specifica</span>
          </li>
          <li class="flex items-start gap-2">
            <span class="text-blue-600 font-bold">✓</span>
            <span>Aggiornamenti periodici</span>
          </li>
          <li class="flex items-start gap-2">
            <span class="text-blue-600 font-bold">✓</span>
            <span>Corsi in presenza o online</span>
          </li>
        </ul>
      </div>
      
      <!-- Servizio 3 -->
      <div class="bg-white rounded-xl p-8 shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-2 border border-gray-200">
        <div class="w-16 h-16 bg-gradient-to-br from-teal-500 to-blue-600 rounded-2xl flex items-center justify-center mb-6 transform rotate-3">
          <span class="text-3xl">🔍</span>
        </div>
        <h3 class="text-2xl font-bold mb-4 text-gray-900">Sopralluoghi Aziendali</h3>
        <p class="text-gray-700 mb-4 leading-relaxed">
          Ispezioni periodiche per verificare l'applicazione delle misure di sicurezza 
          e identificare nuovi rischi.
        </p>
        <ul class="space-y-2 text-gray-600">
          <li class="flex items-start gap-2">
            <span class="text-teal-600 font-bold">✓</span>
            <span>Verifiche trimestrali</span>
          </li>
          <li class="flex items-start gap-2">
            <span class="text-teal-600 font-bold">✓</span>
            <span>Report dettagliati</span>
          </li>
          <li class="flex items-start gap-2">
            <span class="text-teal-600 font-bold">✓</span>
            <span>Azioni correttive immediate</span>
          </li>
        </ul>
      </div>
      
      <!-- Servizio 4 -->
      <div class="bg-white rounded-xl p-8 shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-2 border border-gray-200">
        <div class="w-16 h-16 bg-gradient-to-br from-blue-500 to-teal-600 rounded-2xl flex items-center justify-center mb-6 transform -rotate-3">
          <span class="text-3xl">🚨</span>
        </div>
        <h3 class="text-2xl font-bold mb-4 text-gray-900">Gestione Emergenze</h3>
        <p class="text-gray-700 mb-4 leading-relaxed">
          Elaborazione piani di emergenza, evacuazione e procedure per la gestione 
          delle situazioni critiche.
        </p>
        <ul class="space-y-2 text-gray-600">
          <li class="flex items-start gap-2">
            <span class="text-blue-600 font-bold">✓</span>
            <span>Piano di emergenza ed evacuazione</span>
          </li>
          <li class="flex items-start gap-2">
            <span class="text-blue-600 font-bold">✓</span>
            <span>Prove di evacuazione</span>
          </li>
          <li class="flex items-start gap-2">
            <span class="text-blue-600 font-bold">✓</span>
            <span>Formazione squadre emergenza</span>
          </li>
        </ul>
      </div>
      
      <!-- Servizio 5 -->
      <div class="bg-white rounded-xl p-8 shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-2 border border-gray-200">
        <div class="w-16 h-16 bg-gradient-to-br from-teal-500 to-blue-600 rounded-2xl flex items-center justify-center mb-6 transform rotate-3">
          <span class="text-3xl">📅</span>
        </div>
        <h3 class="text-2xl font-bold mb-4 text-gray-900">Gestione Scadenze</h3>
        <p class="text-gray-700 mb-4 leading-relaxed">
          Monitoraggio e promemoria per tutte le scadenze normative: visite mediche, 
          verifiche impianti, formazione.
        </p>
        <ul class="space-y-2 text-gray-600">
          <li class="flex items-start gap-2">
            <span class="text-teal-600 font-bold">✓</span>
            <span>Calendario scadenze completo</span>
          </li>
          <li class="flex items-start gap-2">
            <span class="text-teal-600 font-bold">✓</span>
            <span>Notifiche automatiche</span>
          </li>
          <li class="flex items-start gap-2">
            <span class="text-teal-600 font-bold">✓</span>
            <span>Gestione documentazione</span>
          </li>
        </ul>
      </div>
      
      <!-- Servizio 6 -->
      <div class="bg-white rounded-xl p-8 shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-2 border border-gray-200">
        <div class="w-16 h-16 bg-gradient-to-br from-blue-500 to-teal-600 rounded-2xl flex items-center justify-center mb-6 transform -rotate-3">
          <span class="text-3xl">💼</span>
        </div>
        <h3 class="text-2xl font-bold mb-4 text-gray-900">Consulenza Continua</h3>
        <p class="text-gray-700 mb-4 leading-relaxed">
          Supporto costante per dubbi normativi, interpretazione leggi, 
          aggiornamenti e best practices.
        </p>
        <ul class="space-y-2 text-gray-600">
          <li class="flex items-start gap-2">
            <span class="text-blue-600 font-bold">✓</span>
            <span>Assistenza telefonica e email</span>
          </li>
          <li class="flex items-start gap-2">
            <span class="text-blue-600 font-bold">✓</span>
            <span>Aggiornamenti normativi</span>
          </li>
          <li class="flex items-start gap-2">
            <span class="text-blue-600 font-bold">✓</span>
            <span>Supporto in caso di ispezioni</span>
          </li>
        </ul>
      </div>
    </div>
  </div>
</section>

<!-- Vantaggi Section -->
<section class="py-20 bg-white relative overflow-hidden">
  <div class="absolute inset-0 opacity-5" style="background-image: radial-gradient(circle at 2px 2px, #0d9488 1px, transparent 0); background-size: 40px 40px;"></div>
  
  <div class="container mx-auto px-4 relative z-10">
    <div class="text-center mb-16">
      <h2 class="text-4xl lg:text-5xl font-bold mb-4 bg-gradient-to-r from-teal-700 to-blue-700 bg-clip-text text-transparent">
        Perché Scegliere il Nostro Servizio RSPP
      </h2>
      <p class="text-xl text-gray-700 max-w-3xl mx-auto">
        Professionisti certificati al tuo servizio per garantire la massima sicurezza aziendale
      </p>
    </div>
    
    <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
      <div class="text-center">
        <div class="w-20 h-20 bg-gradient-to-br from-teal-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
          <span class="text-4xl">🎓</span>
        </div>
        <h3 class="text-xl font-bold mb-3 text-gray-900">Esperienza Consolidata</h3>
        <p class="text-gray-600">
          Oltre 15 anni di attività nel settore della sicurezza sul lavoro con centinaia di aziende seguite
        </p>
      </div>
      
      <div class="text-center">
        <div class="w-20 h-20 bg-gradient-to-br from-blue-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
          <span class="text-4xl">✅</span>
        </div>
        <h3 class="text-xl font-bold mb-3 text-gray-900">Conformità Garantita</h3>
        <p class="text-gray-600">
          Documenti sempre aggiornati alle ultime normative per evitare sanzioni e problemi legali
        </p>
      </div>
      
      <div class="text-center">
        <div class="w-20 h-20 bg-gradient-to-br from-teal-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
          <span class="text-4xl">🤝</span>
        </div>
        <h3 class="text-xl font-bold mb-3 text-gray-900">Supporto Personalizzato</h3>
        <p class="text-gray-600">
          Ogni azienda è unica: offriamo soluzioni su misura per le tue specifiche esigenze
        </p>
      </div>
      
      <div class="text-center">
        <div class="w-20 h-20 bg-gradient-to-br from-blue-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
          <span class="text-4xl">💰</span>
        </div>
        <h3 class="text-xl font-bold mb-3 text-gray-900">Costi Ottimizzati</h3>
        <p class="text-gray-600">
          Servizio esterno più conveniente rispetto all'assunzione di un RSPP interno
        </p>
      </div>
    </div>
  </div>
</section>

<!-- FAQ Section -->
<section class="py-20 bg-gradient-to-br from-gray-50 via-blue-50/30 to-teal-50/30">
  <div class="container mx-auto px-4">
    <div class="text-center mb-16">
      <h2 class="text-4xl lg:text-5xl font-bold mb-4 bg-gradient-to-r from-teal-700 to-blue-700 bg-clip-text text-transparent">
        Domande Frequenti
      </h2>
      <p class="text-xl text-gray-700">Tutto quello che devi sapere sul servizio RSPP</p>
    </div>
    
    <div class="max-w-4xl mx-auto space-y-6">
      <div class="bg-white rounded-xl p-8 shadow-lg border border-gray-200">
        <h3 class="text-xl font-bold mb-3 text-gray-900">Chi deve nominare il RSPP?</h3>
        <p class="text-gray-700 leading-relaxed">
          Tutti i datori di lavoro sono obbligati a nominare un Responsabile del Servizio di Prevenzione 
          e Protezione secondo l'art. 17 del D.Lgs 81/08. Il RSPP può essere interno all'azienda 
          (con formazione specifica) o esterno tramite consulenti qualificati.
        </p>
      </div>
      
      <div class="bg-white rounded-xl p-8 shadow-lg border border-gray-200">
        <h3 class="text-xl font-bold mb-3 text-gray-900">Quali sono i compiti del RSPP?</h3>
        <p class="text-gray-700 leading-relaxed">
          Il RSPP si occupa di individuare e valutare i rischi aziendali, elaborare misure preventive e protettive, 
          proporre programmi di formazione, partecipare alle consultazioni in materia di sicurezza e 
          fornire ai lavoratori le informazioni necessarie. Non ha potere decisionale ma fornisce consulenza al datore di lavoro.
        </p>
      </div>
      
      <div class="bg-white rounded-xl p-8 shadow-lg border border-gray-200">
        <h3 class="text-xl font-bold mb-3 text-gray-900">Quanto costa il servizio RSPP esterno?</h3>
        <p class="text-gray-700 leading-relaxed">
          Il costo varia in base alle dimensioni dell'azienda, al settore di attività e alla complessità dei rischi. 
          Offriamo preventivi personalizzati gratuiti. In generale, il servizio esterno risulta più conveniente 
          rispetto all'assunzione e formazione di un RSPP interno, soprattutto per PMI.
        </p>
      </div>
      
      <div class="bg-white rounded-xl p-8 shadow-lg border border-gray-200">
        <h3 class="text-xl font-bold mb-3 text-gray-900">Qual è la differenza tra RSPP e ASPP?</h3>
        <p class="text-gray-700 leading-relaxed">
          Il Responsabile del Servizio di Prevenzione e Protezione (RSPP) coordina l'intero servizio ed è il riferimento 
          principale del datore di lavoro. Gli Addetti al Servizio di Prevenzione e Protezione (ASPP) supportano 
          il RSPP nelle sue attività operative. Il RSPP ha maggiori responsabilità e requisiti formativi più elevati.
        </p>
      </div>
      
      <div class="bg-white rounded-xl p-8 shadow-lg border border-gray-200">
        <h3 class="text-xl font-bold mb-3 text-gray-900">È obbligatorio aggiornare il DVR?</h3>
        <p class="text-gray-700 leading-relaxed">
          Sì, il Documento di Valutazione dei Rischi deve essere aggiornato ogni volta che ci sono modifiche 
          significative del processo produttivo, dell'organizzazione del lavoro, in caso di infortuni significativi, 
          o quando i risultati della sorveglianza sanitaria ne evidenzino la necessità. È anche consigliato 
          un aggiornamento periodico anche in assenza di modifiche.
        </p>
      </div>
    </div>
  </div>
</section>

<!-- Final CTA -->
<section class="py-20 bg-gradient-to-r from-gray-900 via-blue-900 to-teal-900 text-white relative overflow-hidden">
  <div class="absolute inset-0 bg-black/20"></div>
  <div class="absolute inset-0 opacity-10" style="background-image: radial-gradient(circle at 2px 2px, white 1px, transparent 0); background-size: 40px 40px;"></div>
  
  <div class="container mx-auto px-4 relative z-10">
    <div class="max-w-4xl mx-auto text-center">
      <h2 class="text-4xl lg:text-5xl font-bold mb-6" style="text-shadow: 0 4px 20px rgba(0,0,0,0.5);">
        Metti in Sicurezza la Tua Azienda Oggi Stesso
      </h2>
      <p class="text-xl mb-10 text-gray-200 leading-relaxed" style="text-shadow: 0 2px 10px rgba(0,0,0,0.3);">
        Non aspettare ispezioni o incidenti. Affidati subito ai nostri esperti RSPP 
        per una gestione professionale della sicurezza aziendale.
      </p>
      
      <div class="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
        <a href="/contatti" class="inline-block bg-white text-gray-900 px-10 py-5 rounded-lg font-bold text-xl hover:bg-gray-100 transform hover:scale-105 transition-all shadow-2xl">
          📞 Richiedi Consulenza Gratuita
        </a>
        <a href="tel:+390123456789" class="inline-block px-10 py-5 rounded-lg font-bold text-xl text-white border-2 border-white hover:bg-white hover:text-gray-900 transform hover:scale-105 transition-all" style="background: rgba(255, 255, 255, 0.15); backdrop-filter: blur(10px);">
          📱 Chiamaci Ora
        </a>
      </div>
      
      <div class="pt-8 border-t border-white/30">
        <p class="text-gray-300 mb-4 text-lg">✅ Risposta entro 24 ore • ✅ Preventivo gratuito • ✅ Consulenza personalizzata</p>
      </div>
    </div>
  </div>
</section>
`;
    
    // Replace the entire RSPP content with the enhanced version
    await prisma.cMSPage.update({
      where: { slug: 'rspp' },
      data: { content: enhancedRsppContent }
    });
    
    console.log('✅ rspp: Completely rebuilt with comprehensive, expanded content');
  }
  
  console.log('\n✨ ALL CMS PAGES UPDATED SUCCESSFULLY!\n');
  
  await prisma.$disconnect();
}

main().catch(console.error);
