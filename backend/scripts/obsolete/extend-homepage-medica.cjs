const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    console.log('🚀 Extending homepage-medica with new sections...\n');

    const page = await prisma.cMSPage.findFirst({
      where: { slug: 'homepage-medica' }
    });

    if (!page) {
      console.log('❌ homepage-medica not found');
      return;
    }

    let content = typeof page.content === 'string' ? page.content : JSON.stringify(page.content);

    // Find the closing </section> before final </div>
    const endMarker = '</section>\n    </div>';
    const insertPosition = content.lastIndexOf(endMarker);

    if (insertPosition === -1) {
      console.log('❌ Could not find insertion point');
      return;
    }

    const newSections = `

      <!-- How It Works Section -->
      <section class="py-20 bg-white">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="text-center max-w-3xl mx-auto mb-16">
            <div class="inline-flex items-center gap-2 px-4 py-2 bg-teal-100 text-teal-800 rounded-full text-sm font-medium mb-4">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Come Funziona
            </div>
            <h2 class="text-4xl font-bold text-gray-900 mb-6">
              Prenotare è semplice
            </h2>
            <p class="text-xl text-gray-600">
              In 3 semplici passaggi puoi prenotare la tua visita medica
            </p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            <div class="hidden md:block absolute top-16 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-teal-400 to-teal-600" style="transform: translateY(-50%);"></div>
            
            <div class="relative text-center">
              <div class="flex justify-center mb-6">
                <div class="relative">
                  <div class="w-20 h-20 bg-gradient-to-r from-teal-600 to-teal-700 rounded-full flex items-center justify-center shadow-xl relative z-10">
                    <span class="text-3xl font-bold text-white">1</span>
                  </div>
                  <div class="absolute inset-0 bg-gradient-to-r from-teal-600 to-teal-700 rounded-full animate-pulse opacity-20"></div>
                </div>
              </div>
              <div class="flex justify-center mb-4 text-teal-600">
                <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 class="text-xl font-bold text-gray-900 mb-3">Scegli la Specialità</h3>
              <p class="text-gray-600">Seleziona il tipo di visita o esame di cui hai bisogno dal nostro catalogo completo</p>
            </div>

            <div class="relative text-center">
              <div class="flex justify-center mb-6">
                <div class="relative">
                  <div class="w-20 h-20 bg-gradient-to-r from-teal-600 to-teal-700 rounded-full flex items-center justify-center shadow-xl relative z-10">
                    <span class="text-3xl font-bold text-white">2</span>
                  </div>
                  <div class="absolute inset-0 bg-gradient-to-r from-teal-600 to-teal-700 rounded-full animate-pulse opacity-20"></div>
                </div>
              </div>
              <div class="flex justify-center mb-4 text-teal-600">
                <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 class="text-xl font-bold text-gray-900 mb-3">Prenota Online</h3>
              <p class="text-gray-600">Scegli data e orario più comodi per te. Sistema di prenotazione disponibile 24/7</p>
            </div>

            <div class="relative text-center">
              <div class="flex justify-center mb-6">
                <div class="relative">
                  <div class="w-20 h-20 bg-gradient-to-r from-teal-600 to-teal-700 rounded-full flex items-center justify-center shadow-xl relative z-10">
                    <span class="text-3xl font-bold text-white">3</span>
                  </div>
                  <div class="absolute inset-0 bg-gradient-to-r from-teal-600 to-teal-700 rounded-full animate-pulse opacity-20"></div>
                </div>
              </div>
              <div class="flex justify-center mb-4 text-teal-600">
                <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 class="text-xl font-bold text-gray-900 mb-3">Ricevi Conferma</h3>
              <p class="text-gray-600">Conferma immediata via email e SMS con tutti i dettagli del tuo appuntamento</p>
            </div>
          </div>

          <div class="text-center mt-12">
            <a href="/prenota" class="inline-block bg-teal-600 text-white px-8 py-4 rounded-xl font-bold hover:bg-teal-700 transition-all duration-300 shadow-lg hover:shadow-xl">
              Inizia Ora
            </a>
          </div>
        </div>
      </section>

      <!-- Testimonials Section -->
      <section class="py-20 bg-gradient-to-b from-gray-50 to-white">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="text-center max-w-3xl mx-auto mb-16">
            <div class="inline-flex items-center gap-2 px-4 py-2 bg-teal-100 text-teal-800 rounded-full text-sm font-medium mb-4">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Testimonianze
            </div>
            <h2 class="text-4xl font-bold text-gray-900 mb-6">
              Cosa dicono i nostri pazienti
            </h2>
            <p class="text-xl text-gray-600">
              La soddisfazione dei nostri pazienti è la nostra migliore referenza
            </p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div class="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300">
              <div class="flex gap-1 mb-4">
                <svg class="w-5 h-5 text-yellow-400 fill-current" viewBox="0 0 20 20"><path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" /></svg>
                <svg class="w-5 h-5 text-yellow-400 fill-current" viewBox="0 0 20 20"><path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" /></svg>
                <svg class="w-5 h-5 text-yellow-400 fill-current" viewBox="0 0 20 20"><path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" /></svg>
                <svg class="w-5 h-5 text-yellow-400 fill-current" viewBox="0 0 20 20"><path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" /></svg>
                <svg class="w-5 h-5 text-yellow-400 fill-current" viewBox="0 0 20 20"><path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" /></svg>
              </div>
              <p class="text-gray-700 mb-6 italic">"Servizio di medicina del lavoro impeccabile. Gestione professionale di tutte le visite periodiche dei nostri 50 dipendenti. Consigliatissimo!"</p>
              <div class="flex items-center gap-4">
                <div class="w-12 h-12 bg-gradient-to-r from-teal-600 to-teal-700 rounded-full flex items-center justify-center text-white font-bold">M</div>
                <div>
                  <div class="font-bold text-gray-900">Marco R.</div>
                  <div class="text-sm text-gray-600">Responsabile HR</div>
                  <div class="text-xs text-teal-600">Azienda Manifatturiera</div>
                </div>
              </div>
            </div>

            <div class="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300">
              <div class="flex gap-1 mb-4">
                <svg class="w-5 h-5 text-yellow-400 fill-current" viewBox="0 0 20 20"><path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" /></svg>
                <svg class="w-5 h-5 text-yellow-400 fill-current" viewBox="0 0 20 20"><path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" /></svg>
                <svg class="w-5 h-5 text-yellow-400 fill-current" viewBox="0 0 20 20"><path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" /></svg>
                <svg class="w-5 h-5 text-yellow-400 fill-current" viewBox="0 0 20 20"><path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" /></svg>
                <svg class="w-5 h-5 text-yellow-400 fill-current" viewBox="0 0 20 20"><path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" /></svg>
              </div>
              <p class="text-gray-700 mb-6 italic">"Ho effettuato una visita cardiologica. Personale cortese, ambiente pulito e professionale. Molto soddisfatta del servizio ricevuto."</p>
              <div class="flex items-center gap-4">
                <div class="w-12 h-12 bg-gradient-to-r from-teal-600 to-teal-700 rounded-full flex items-center justify-center text-white font-bold">L</div>
                <div>
                  <div class="font-bold text-gray-900">Laura S.</div>
                  <div class="text-sm text-gray-600">Paziente</div>
                </div>
              </div>
            </div>

            <div class="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300">
              <div class="flex gap-1 mb-4">
                <svg class="w-5 h-5 text-yellow-400 fill-current" viewBox="0 0 20 20"><path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" /></svg>
                <svg class="w-5 h-5 text-yellow-400 fill-current" viewBox="0 0 20 20"><path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" /></svg>
                <svg class="w-5 h-5 text-yellow-400 fill-current" viewBox="0 0 20 20"><path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" /></svg>
                <svg class="w-5 h-5 text-yellow-400 fill-current" viewBox="0 0 20 20"><path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" /></svg>
                <svg class="w-5 h-5 text-yellow-400 fill-current" viewBox="0 0 20 20"><path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" /></svg>
              </div>
              <p class="text-gray-700 mb-6 italic">"Finalmente un poliambulatorio che capisce le esigenze delle aziende. Protocolli personalizzati e supporto costante. Ottimo rapporto qualità-prezzo."</p>
              <div class="flex items-center gap-4">
                <div class="w-12 h-12 bg-gradient-to-r from-teal-600 to-teal-700 rounded-full flex items-center justify-center text-white font-bold">G</div>
                <div>
                  <div class="font-bold text-gray-900">Giuseppe M.</div>
                  <div class="text-sm text-gray-600">Titolare</div>
                  <div class="text-xs text-teal-600">PMI Edile</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- FAQ Section -->
      <section class="py-20 bg-white">
        <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="text-center mb-16">
            <div class="inline-flex items-center gap-2 px-4 py-2 bg-teal-100 text-teal-800 rounded-full text-sm font-medium mb-4">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Domande Frequenti
            </div>
            <h2 class="text-4xl font-bold text-gray-900 mb-6">
              Hai qualche dubbio?
            </h2>
            <p class="text-xl text-gray-600">
              Risposte alle domande più comuni dei nostri pazienti
            </p>
          </div>

          <div class="space-y-4">
            <details class="group bg-gray-50 rounded-xl p-6 hover:bg-gray-100 transition-colors">
              <summary class="flex justify-between items-center cursor-pointer list-none">
                <span class="font-bold text-gray-900 text-lg">Come posso prenotare una visita?</span>
                <span class="ml-4 flex-shrink-0 text-teal-600 group-open:rotate-180 transition-transform">
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </summary>
              <p class="mt-4 text-gray-600 leading-relaxed">Puoi prenotare online tramite il nostro sistema di prenotazione, telefonicamente chiamando lo 0123 456 789, oppure via email. Il sistema online è disponibile 24/7 per la massima flessibilità.</p>
            </details>

            <details class="group bg-gray-50 rounded-xl p-6 hover:bg-gray-100 transition-colors">
              <summary class="flex justify-between items-center cursor-pointer list-none">
                <span class="font-bold text-gray-900 text-lg">Quali documenti devo portare alla prima visita?</span>
                <span class="ml-4 flex-shrink-0 text-teal-600 group-open:rotate-180 transition-transform">
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </summary>
              <p class="mt-4 text-gray-600 leading-relaxed">Per la prima visita ti consigliamo di portare: documento di identità, tessera sanitaria, eventuali esami precedenti e la lista dei farmaci che assumi. Per le visite di medicina del lavoro, sarà necessaria anche la documentazione aziendale.</p>
            </details>

            <details class="group bg-gray-50 rounded-xl p-6 hover:bg-gray-100 transition-colors">
              <summary class="flex justify-between items-center cursor-pointer list-none">
                <span class="font-bold text-gray-900 text-lg">Quanto tempo prima devo arrivare?</span>
                <span class="ml-4 flex-shrink-0 text-teal-600 group-open:rotate-180 transition-transform">
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </summary>
              <p class="mt-4 text-gray-600 leading-relaxed">Ti consigliamo di arrivare 10-15 minuti prima dell'orario dell'appuntamento per completare eventuali procedure amministrative. Questo ci aiuta a rispettare gli orari di tutti i pazienti.</p>
            </details>

            <details class="group bg-gray-50 rounded-xl p-6 hover:bg-gray-100 transition-colors">
              <summary class="flex justify-between items-center cursor-pointer list-none">
                <span class="font-bold text-gray-900 text-lg">Offrite servizi di medicina del lavoro per aziende?</span>
                <span class="ml-4 flex-shrink-0 text-teal-600 group-open:rotate-180 transition-transform">
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </summary>
              <p class="mt-4 text-gray-600 leading-relaxed">Sì, offriamo un servizio completo di medicina del lavoro: sorveglianza sanitaria, visite preventive e periodiche, protocolli personalizzati e piena conformità al D.Lgs. 81/08. Contattaci per un preventivo personalizzato.</p>
            </details>

            <details class="group bg-gray-50 rounded-xl p-6 hover:bg-gray-100 transition-colors">
              <summary class="flex justify-between items-center cursor-pointer list-none">
                <span class="font-bold text-gray-900 text-lg">In quanto tempo ricevo i risultati degli esami?</span>
                <span class="ml-4 flex-shrink-0 text-teal-600 group-open:rotate-180 transition-transform">
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </summary>
              <p class="mt-4 text-gray-600 leading-relaxed">I tempi variano in base al tipo di esame. Per le analisi di routine, i risultati sono disponibili entro 24-48 ore. Per esami più complessi, il medico ti comunicherà i tempi di refertazione durante la visita.</p>
            </details>
          </div>

          <div class="text-center mt-12">
            <p class="text-gray-600 mb-4">Non hai trovato la risposta che cercavi?</p>
            <a href="/contatti" class="inline-block bg-white text-teal-700 border-2 border-teal-700 px-6 py-3 rounded-xl font-bold hover:bg-teal-50 transition-all duration-300">
              Contattaci per Altre Domande
            </a>
          </div>
        </div>
      </section>

      <!-- Final CTA Banner -->
      <section class="py-16 bg-gradient-to-r from-teal-600 to-blue-600">
        <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 class="text-3xl lg:text-4xl font-bold text-white mb-4">
            Pronto a prenderti cura della tua salute?
          </h2>
          <p class="text-xl text-white opacity-90 mb-8">
            Prenota subito la tua visita o contattaci per maggiori informazioni
          </p>
          <div class="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/prenota" class="inline-block bg-white !text-teal-700 px-8 py-4 rounded-xl font-bold hover:bg-gray-50 shadow-xl transition-all duration-300">
              📅 Prenota Visita
            </a>
            <a href="/contatti" class="inline-block border-2 border-white !text-white px-8 py-4 rounded-xl font-bold hover:bg-white hover:!text-teal-700 transition-all duration-300">
              📞 Richiedi Info
            </a>
          </div>
        </div>
      </section>
`;

    // Insert new sections before the final closing tags
    content = content.substring(0, insertPosition) + newSections + content.substring(insertPosition);

    await prisma.cMSPage.update({
      where: { id: page.id },
      data: { content }
    });

    console.log('✅ homepage-medica extended successfully!');
    console.log(`📊 Old length: 11179 chars`);
    console.log(`📊 New length: ${content.length} chars (+${content.length - 11179} chars)`);
    console.log('\n🎉 Added sections:');
    console.log('  - How It Works (3 steps)');
    console.log('  - Testimonials (3 reviews)');
    console.log('  - FAQ (5 questions)');
    console.log('  - Final CTA Banner');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
})();
