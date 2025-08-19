import React from 'react';
import { PublicLayout } from '../../components/public/PublicLayout';
import { 
  AlertTriangle,
  FileText,
  Mail,
  Phone,
  Scale,
  Shield
} from 'lucide-react';

/**
 * Pagina Termini di Servizio per Element Formazione
 * Condizioni generali di utilizzo del sito e dei servizi
 */
const TerminiPage: React.FC = () => {
  return (
    <PublicLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-primary-600 text-white py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <Scale className="w-16 h-16 mx-auto mb-6 text-primary-200" />
              <h1 className="text-4xl font-bold mb-4">Termini di Servizio</h1>
              <p className="text-xl text-primary-100">
                Condizioni generali di utilizzo del sito e dei nostri servizi
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
                  <FileText className="w-6 h-6 mr-3 text-primary-600" />
                  Informazioni Generali
                </h2>
                <div className="prose prose-lg max-w-none">
                  <p className="text-gray-700 leading-relaxed mb-4">
                    I presenti Termini di Servizio disciplinano l'utilizzo del sito web 
                    www.elementformazione.it e dei servizi offerti da Element Formazione S.r.l. 
                    (di seguito "Element Formazione", "noi", "nostro").
                  </p>
                  <p className="text-gray-700 leading-relaxed">
                    Utilizzando il nostro sito web o i nostri servizi, accetti integralmente 
                    questi termini. Se non accetti questi termini, ti preghiamo di non utilizzare 
                    il nostro sito o i nostri servizi.
                  </p>
                </div>
              </section>

              {/* Informazioni società */}
              <section className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                  <Shield className="w-6 h-6 mr-3 text-primary-600" />
                  Informazioni sulla Società
                </h2>
                <div className="bg-primary-50 p-6 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-3">Element Formazione S.r.l.</h3>
                  <div className="grid md:grid-cols-2 gap-4 text-gray-700">
                    <div>
                      <p><strong>Sede legale:</strong> [Indirizzo completo]</p>
                      <p><strong>P.IVA:</strong> [Partita IVA]</p>
                      <p><strong>Codice Fiscale:</strong> [Codice Fiscale]</p>
                      <p><strong>REA:</strong> [Numero REA]</p>
                    </div>
                    <div>
                      <p><strong>Email:</strong> info@elementformazione.it</p>
                      <p><strong>Telefono:</strong> +39 123 456 789</p>
                      <p><strong>PEC:</strong> elementformazione@pec.it</p>
                      <p><strong>Capitale Sociale:</strong> € [Importo]</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Servizi offerti */}
              <section className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Servizi Offerti</h2>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <h3 className="font-semibold text-gray-900 mb-3">Formazione Professionale</h3>
                    <ul className="text-gray-700 text-sm space-y-1">
                      <li>• Corsi di sicurezza sui luoghi di lavoro</li>
                      <li>• Formazione primo soccorso</li>
                      <li>• Corsi antincendio</li>
                      <li>• Aggiornamenti normativi</li>
                      <li>• Formazione specialistica</li>
                    </ul>
                  </div>
                  
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <h3 className="font-semibold text-gray-900 mb-3">Consulenza Specialistica</h3>
                    <ul className="text-gray-700 text-sm space-y-1">
                      <li>• Servizi RSPP (Responsabile Servizio Prevenzione e Protezione)</li>
                      <li>• Medico del Lavoro</li>
                      <li>• Documento di Valutazione dei Rischi (DVR)</li>
                      <li>• Consulenza normativa</li>
                      <li>• Audit e verifiche</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* Utilizzo del sito */}
              <section className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Utilizzo del Sito Web</h2>
                
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Uso Consentito</h3>
                    <p className="text-gray-700 mb-3">
                      Il sito web è destinato esclusivamente a:
                    </p>
                    <ul className="list-disc list-inside text-gray-700 space-y-1">
                      <li>Consultazione delle informazioni sui nostri servizi</li>
                      <li>Richiesta di preventivi e informazioni</li>
                      <li>Iscrizione ai corsi di formazione</li>
                      <li>Accesso all'area riservata (per utenti autorizzati)</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Uso Vietato</h3>
                    <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                      <p className="text-gray-700 mb-3">È espressamente vietato:</p>
                      <ul className="list-disc list-inside text-gray-700 space-y-1">
                        <li>Utilizzare il sito per scopi illegali o non autorizzati</li>
                        <li>Tentare di accedere a aree riservate senza autorizzazione</li>
                        <li>Interferire con il funzionamento del sito</li>
                        <li>Copiare, modificare o distribuire i contenuti senza autorizzazione</li>
                        <li>Utilizzare robot, spider o altri sistemi automatizzati</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </section>

              {/* Registrazione e account */}
              <section className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Registrazione e Account Utente</h2>
                
                <div className="space-y-6">
                  <div className="bg-primary-50 p-6 rounded-lg">
                    <h3 className="font-semibold text-gray-900 mb-3">Creazione Account</h3>
                    <p className="text-gray-700 mb-3">
                      Per accedere a determinati servizi, potrebbe essere necessario creare un account. 
                      Ti impegni a:
                    </p>
                    <ul className="list-disc list-inside text-gray-700 space-y-1">
                      <li>Fornire informazioni accurate e complete</li>
                      <li>Mantenere aggiornate le tue informazioni</li>
                      <li>Proteggere la riservatezza delle tue credenziali</li>
                      <li>Notificarci immediatamente qualsiasi uso non autorizzato</li>
                    </ul>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-lg">
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <AlertTriangle className="w-5 h-5 mr-2 text-yellow-600" />
                      Responsabilità dell'Account
                    </h3>
                    <p className="text-gray-700">
                      Sei responsabile di tutte le attività che avvengono sotto il tuo account. 
                      Element Formazione non è responsabile per perdite derivanti dall'uso non 
                      autorizzato del tuo account.
                    </p>
                  </div>
                </div>
              </section>

              {/* Proprietà intellettuale */}
              <section className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Proprietà Intellettuale</h2>
                
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Contenuti del Sito</h3>
                    <p className="text-gray-700 mb-3">
                      Tutti i contenuti presenti sul sito (testi, immagini, loghi, video, software) 
                      sono di proprietà di Element Formazione o dei rispettivi proprietari e sono 
                      protetti dalle leggi sul diritto d'autore.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Licenza d'Uso</h3>
                    <p className="text-gray-700">
                      Ti concediamo una licenza limitata, non esclusiva e non trasferibile per 
                      utilizzare il sito esclusivamente per scopi personali e non commerciali, 
                      in conformità con questi termini.
                    </p>
                  </div>
                </div>
              </section>

              {/* Prezzi e pagamenti */}
              <section className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Prezzi e Pagamenti</h2>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <h3 className="font-semibold text-gray-900 mb-3">Prezzi</h3>
                    <ul className="text-gray-700 text-sm space-y-1">
                      <li>• I prezzi sono indicati in Euro e includono IVA</li>
                      <li>• I prezzi possono variare senza preavviso</li>
                      <li>• Offerte speciali hanno validità limitata</li>
                      <li>• Preventivi personalizzati su richiesta</li>
                    </ul>
                  </div>
                  
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <h3 className="font-semibold text-gray-900 mb-3">Modalità di Pagamento</h3>
                    <ul className="text-gray-700 text-sm space-y-1">
                      <li>• Bonifico bancario</li>
                      <li>• Carta di credito/debito</li>
                      <li>• PayPal (dove disponibile)</li>
                      <li>• Fatturazione per aziende</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* Cancellazioni e rimborsi */}
              <section className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Cancellazioni e Rimborsi</h2>
                
                <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-3">Politica di Cancellazione</h3>
                  <div className="space-y-3 text-gray-700">
                    <p><strong>Corsi di Formazione:</strong></p>
                    <ul className="list-disc list-inside ml-4 space-y-1">
                      <li>Cancellazione gratuita fino a 7 giorni prima del corso</li>
                      <li>Cancellazione con penale del 50% da 7 a 3 giorni prima</li>
                      <li>Nessun rimborso per cancellazioni entro 3 giorni</li>
                    </ul>
                    
                    <p className="mt-4"><strong>Servizi di Consulenza:</strong></p>
                    <ul className="list-disc list-inside ml-4 space-y-1">
                      <li>Cancellazione gratuita fino a 24 ore prima</li>
                      <li>Penale del 100% per cancellazioni tardive</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* Limitazione responsabilità */}
              <section className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Limitazione di Responsabilità</h2>
                
                <div className="bg-red-50 border border-red-200 p-6 rounded-lg">
                  <p className="text-gray-700 mb-4">
                    Element Formazione si impegna a fornire servizi di qualità, tuttavia:
                  </p>
                  <ul className="list-disc list-inside text-gray-700 space-y-1">
                    <li>Non garantiamo che il sito sia sempre disponibile o privo di errori</li>
                    <li>Non siamo responsabili per danni indiretti o consequenziali</li>
                    <li>La nostra responsabilità è limitata all'importo pagato per il servizio</li>
                    <li>Non siamo responsabili per contenuti di siti web di terze parti</li>
                  </ul>
                </div>
              </section>

              {/* Modifiche ai termini */}
              <section className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Modifiche ai Termini</h2>
                
                <div className="bg-blue-50 p-6 rounded-lg">
                  <p className="text-gray-700 mb-3">
                    Ci riserviamo il diritto di modificare questi Termini di Servizio in qualsiasi momento. 
                    Le modifiche entreranno in vigore dalla data di pubblicazione sul sito.
                  </p>
                  <p className="text-gray-700">
                    Ti consigliamo di consultare periodicamente questa pagina per rimanere aggiornato 
                    sui termini applicabili.
                  </p>
                </div>
              </section>

              {/* Legge applicabile */}
              <section className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Legge Applicabile e Foro Competente</h2>
                
                <div className="bg-gray-50 p-6 rounded-lg">
                  <p className="text-gray-700 mb-3">
                    I presenti Termini di Servizio sono disciplinati dalla legge italiana. 
                    Per qualsiasi controversia sarà competente il Foro di [Città], con esclusione 
                    di qualsiasi altro foro.
                  </p>
                  <p className="text-gray-700">
                    Prima di ricorrere all'autorità giudiziaria, le parti si impegnano a tentare 
                    una risoluzione amichevole della controversia.
                  </p>
                </div>
              </section>

              {/* Contatti */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Contatti</h2>
                <div className="bg-gray-50 p-6 rounded-lg">
                  <p className="text-gray-700 mb-4">
                    Per qualsiasi domanda relativa a questi Termini di Servizio, puoi contattarci:
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <a 
                      href="mailto:info@elementformazione.it"
                      className="flex items-center text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      <Mail className="w-5 h-5 mr-2" />
                      info@elementformazione.it
                    </a>
                    <a 
                      href="tel:+39123456789"
                      className="flex items-center text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      <Phone className="w-5 h-5 mr-2" />
                      +39 123 456 789
                    </a>
                  </div>
                </div>
              </section>

              {/* Footer */}
              <div className="text-center text-sm text-gray-500 pt-8 border-t border-gray-200">
                <p>Ultimo aggiornamento: {new Date().toLocaleDateString('it-IT')}</p>
                <p className="mt-2">
                  Questi Termini di Servizio costituiscono l'accordo completo tra te e Element Formazione 
                  riguardo all'utilizzo del sito e dei servizi.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
};

export default TerminiPage;