import React from 'react';
import { PublicLayout } from '../../components/public/PublicLayout';
import { 
  BarChart3,
  Cookie,
  Info,
  Settings,
  Shield,
  Target
} from 'lucide-react';
import { PublicBadge } from '../../components/public/PublicBadge';

/**
 * Pagina Cookie Policy per Element Formazione
 * Informazioni dettagliate sui cookie utilizzati
 */
const CookiePage: React.FC = () => {
  return (
    <PublicLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-primary-600 text-white py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <Cookie className="w-16 h-16 mx-auto mb-6 text-primary-200" />
              <h1 className="text-4xl font-bold mb-4">Cookie Policy</h1>
              <p className="text-xl text-primary-100">
                Informazioni sui cookie utilizzati sul nostro sito web
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm p-8">
              
              {/* Introduzione */}
              <section className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                  <Info className="w-6 h-6 mr-3 text-primary-600" />
                  Cosa sono i Cookie
                </h2>
                <div className="prose prose-lg max-w-none">
                  <p className="text-gray-700 leading-relaxed mb-4">
                    I cookie sono piccoli file di testo che vengono memorizzati sul tuo dispositivo 
                    quando visiti un sito web. Ci aiutano a fornire una migliore esperienza di 
                    navigazione, ricordare le tue preferenze e analizzare come utilizzi il nostro sito.
                  </p>
                  <p className="text-gray-700 leading-relaxed">
                    Element Formazione utilizza i cookie in conformità con la normativa europea 
                    e italiana sulla privacy e sui cookie.
                  </p>
                </div>
              </section>

              {/* Tipi di cookie */}
              <section className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                  <Settings className="w-6 h-6 mr-3 text-primary-600" />
                  Tipi di Cookie Utilizzati
                </h2>
                
                <div className="space-y-8">
                  {/* Cookie Necessari */}
                  <div className="border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center mb-4">
                      <Shield className="w-6 h-6 text-green-600 mr-3" />
                      <h3 className="text-xl font-semibold text-gray-900">Cookie Necessari</h3>
                      <span className="ml-auto bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded">
                        Sempre Attivi
                      </span>
                    </div>
                    <p className="text-gray-700 mb-4">
                      Questi cookie sono essenziali per il funzionamento del sito web e non possono 
                      essere disabilitati. Vengono utilizzati per:
                    </p>
                    <ul className="list-disc list-inside text-gray-700 space-y-1">
                      <li>Mantenere la sessione di navigazione</li>
                      <li>Ricordare le preferenze sui cookie</li>
                      <li>Garantire la sicurezza del sito</li>
                      <li>Abilitare funzionalità di base del sito</li>
                    </ul>
                    
                    <div className="mt-4 bg-gray-50 p-4 rounded">
                      <h4 className="font-medium text-gray-900 mb-2">Cookie Utilizzati:</h4>
                      <div className="text-sm text-gray-700 space-y-1">
                        <div><strong>sessionToken</strong> - Token di sessione (durata: sessione)</div>
                        <div><strong>cookieConsent</strong> - Preferenze cookie (durata: 1 anno)</div>
                        <div><strong>csrfToken</strong> - Protezione CSRF (durata: sessione)</div>
                      </div>
                    </div>
                  </div>

                  {/* Cookie di Analisi */}
                  <div className="border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center mb-4">
                      <BarChart3 className="w-6 h-6 text-primary-600 mr-3" />
                      <h3 className="text-xl font-semibold text-gray-900">Cookie di Analisi</h3>
                      <PublicBadge variant="blue" size="sm">
                        Opzionali
                      </PublicBadge>
                    </div>
                    <p className="text-gray-700 mb-4">
                      Questi cookie ci aiutano a capire come i visitatori interagiscono con il sito, 
                      fornendoci informazioni anonime su:
                    </p>
                    <ul className="list-disc list-inside text-gray-700 space-y-1">
                      <li>Numero di visitatori e visualizzazioni di pagina</li>
                      <li>Tempo trascorso sul sito</li>
                      <li>Pagine più visitate</li>
                      <li>Sorgenti di traffico</li>
                    </ul>
                    
                    <div className="mt-4 bg-gray-50 p-4 rounded">
                      <h4 className="font-medium text-gray-900 mb-2">Servizi Utilizzati:</h4>
                      <div className="text-sm text-gray-700 space-y-2">
                        <div>
                          <strong>Google Analytics</strong> - Analisi del traffico web
                          <br />
                          <span className="text-gray-600">
                            Cookie: _ga, _ga_*, _gid (durata: 2 anni, 2 anni, 24 ore)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Cookie di Marketing */}
                  <div className="border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center mb-4">
                      <Target className="w-6 h-6 text-purple-600 mr-3" />
                      <h3 className="text-xl font-semibold text-gray-900">Cookie di Marketing</h3>
                      <span className="ml-auto bg-purple-100 text-purple-800 text-xs font-medium px-2.5 py-0.5 rounded">
                        Opzionali
                      </span>
                    </div>
                    <p className="text-gray-700 mb-4">
                      Questi cookie vengono utilizzati per mostrare annunci pubblicitari più 
                      rilevanti per te e per misurare l'efficacia delle campagne pubblicitarie:
                    </p>
                    <ul className="list-disc list-inside text-gray-700 space-y-1">
                      <li>Personalizzazione degli annunci</li>
                      <li>Misurazione delle conversioni</li>
                      <li>Retargeting pubblicitario</li>
                      <li>Analisi delle campagne marketing</li>
                    </ul>
                    
                    <div className="mt-4 bg-gray-50 p-4 rounded">
                      <h4 className="font-medium text-gray-900 mb-2">Servizi Utilizzati:</h4>
                      <div className="text-sm text-gray-700 space-y-2">
                        <div>
                          <strong>Google Ads</strong> - Pubblicità personalizzata
                          <br />
                          <span className="text-gray-600">
                            Cookie: _gcl_au, _gcl_aw (durata: 90 giorni)
                          </span>
                        </div>
                        <div>
                          <strong>Facebook Pixel</strong> - Analisi e retargeting
                          <br />
                          <span className="text-gray-600">
                            Cookie: _fbp, _fbc (durata: 90 giorni)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Gestione cookie */}
              <section className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Gestione delle Preferenze Cookie</h2>
                
                <div className="bg-primary-50 p-6 rounded-lg mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Pannello Preferenze</h3>
                  <p className="text-gray-700 mb-4">
                    Puoi gestire le tue preferenze sui cookie in qualsiasi momento utilizzando 
                    il nostro pannello delle preferenze. Clicca sul pulsante qui sotto per aprirlo:
                  </p>
                  <button 
                    onClick={() => {
                      // Trigger del cookie notice per mostrare le impostazioni
                      const event = new CustomEvent('showCookieSettings');
                      window.dispatchEvent(event);
                    }}
                    className="bg-primary-600 text-white px-6 py-2 rounded-full hover:bg-primary-700 transition-colors"
                  >
                    Gestisci Preferenze Cookie
                  </button>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <h3 className="font-semibold text-gray-900 mb-3">Impostazioni Browser</h3>
                    <p className="text-gray-700 text-sm mb-3">
                      Puoi anche gestire i cookie direttamente dalle impostazioni del tuo browser:
                    </p>
                    <ul className="text-sm text-gray-700 space-y-1">
                      <li>• Chrome: Impostazioni → Privacy e sicurezza → Cookie</li>
                      <li>• Firefox: Impostazioni → Privacy e sicurezza</li>
                      <li>• Safari: Preferenze → Privacy</li>
                      <li>• Edge: Impostazioni → Privacy e servizi</li>
                    </ul>
                  </div>
                  
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <h3 className="font-semibold text-gray-900 mb-3">Opt-out Servizi Terzi</h3>
                    <p className="text-gray-700 text-sm mb-3">
                      Puoi disattivare i cookie di servizi specifici:
                    </p>
                    <ul className="text-sm space-y-2">
                      <li>
                        <a 
                          href="https://tools.google.com/dlpage/gaoptout" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary-600 hover:underline"
                        >
                          Google Analytics Opt-out
                        </a>
                      </li>
                      <li>
                        <a 
                          href="https://www.facebook.com/settings?tab=ads" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary-600 hover:underline"
                        >
                          Facebook Ads Settings
                        </a>
                      </li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* Cookie di terze parti */}
              <section className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Cookie di Terze Parti</h2>
                <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-lg">
                  <p className="text-gray-700 mb-4">
                    Il nostro sito può contenere contenuti incorporati da servizi di terze parti 
                    (come video di YouTube, mappe di Google, ecc.). Questi servizi possono impostare 
                    i propri cookie quando interagisci con i loro contenuti.
                  </p>
                  <p className="text-gray-700">
                    Ti consigliamo di consultare le privacy policy di questi servizi per 
                    comprendere come utilizzano i cookie:
                  </p>
                  <ul className="mt-3 space-y-1 text-sm">
                    <li>
                      <a 
                        href="https://policies.google.com/privacy" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:underline"
                      >
                        Google Privacy Policy
                      </a>
                    </li>
                    <li>
                      <a 
                        href="https://www.facebook.com/privacy/explanation" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:underline"
                      >
                        Facebook Privacy Policy
                      </a>
                    </li>
                  </ul>
                </div>
              </section>

              {/* Contatti */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Domande sui Cookie</h2>
                <div className="bg-gray-50 p-6 rounded-lg">
                  <p className="text-gray-700 mb-4">
                    Se hai domande sulla nostra Cookie Policy o su come utilizziamo i cookie, 
                    non esitare a contattarci:
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <a 
                      href="mailto:privacy@elementformazione.it"
                      className="flex items-center text-primary-600 hover:text-primary-700 transition-colors"
                    >
                      <span className="w-5 h-5 mr-2">📧</span>
                      privacy@elementformazione.it
                    </a>
                    <a 
                      href="tel:+39123456789"
                      className="flex items-center text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      <span className="w-5 h-5 mr-2">📞</span>
                      +39 123 456 789
                    </a>
                  </div>
                </div>
              </section>

              {/* Footer */}
              <div className="text-center text-sm text-gray-500 pt-8 border-t border-gray-200">
                <p>Ultimo aggiornamento: {new Date().toLocaleDateString('it-IT')}</p>
                <p className="mt-2">
                  Questa Cookie Policy può essere aggiornata periodicamente per riflettere 
                  cambiamenti nei cookie utilizzati o per altri motivi operativi, legali o normativi.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
};

export default CookiePage;