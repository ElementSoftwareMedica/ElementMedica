import React from 'react';
import { PublicLayout } from '../../components/public/PublicLayout';
import { 
  Eye,
  FileText,
  Lock,
  Mail,
  Phone,
  Shield
} from 'lucide-react';

/**
 * Pagina Privacy Policy per Element Formazione
 * Conforme GDPR e normative italiane
 */
const PrivacyPage: React.FC = () => {
  return (
    <PublicLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-primary-600 text-white py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <Shield className="w-16 h-16 mx-auto mb-6 text-white/80" />
              <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
              <p className="text-xl text-primary-100">
                La tua privacy è importante per noi. Scopri come proteggiamo i tuoi dati.
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
                  <Eye className="w-6 h-6 mr-3 text-primary-600" />
                  Informazioni Generali
                </h2>
                <div className="prose prose-lg max-w-none">
                  <p className="text-gray-700 leading-relaxed mb-4">
                    Element Formazione S.r.l. (di seguito "Element Formazione", "noi", "nostro") 
                    rispetta la tua privacy e si impegna a proteggere i tuoi dati personali. 
                    Questa Privacy Policy spiega come raccogliamo, utilizziamo e proteggiamo 
                    le tue informazioni quando utilizzi il nostro sito web e i nostri servizi.
                  </p>
                  <p className="text-gray-700 leading-relaxed">
                    Questa informativa è conforme al Regolamento Generale sulla Protezione 
                    dei Dati (GDPR) UE 2016/679 e al Codice Privacy italiano (D.Lgs. 196/2003 
                    come modificato dal D.Lgs. 101/2018).
                  </p>
                </div>
              </section>

              {/* Titolare del trattamento */}
              <section className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                  <FileText className="w-6 h-6 mr-3 text-primary-600" />
                  Titolare del Trattamento
                </h2>
                <div className="bg-primary-50 p-6 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-3">Element Formazione S.r.l.</h3>
                  <div className="space-y-2 text-gray-700">
                    <p>Sede legale: [Indirizzo completo]</p>
                    <p>P.IVA: [Partita IVA]</p>
                    <p>Email: <a href="mailto:privacy@elementformazione.it" className="text-primary-600 hover:underline">privacy@elementformazione.it</a></p>
                    <p>Telefono: <a href="tel:+39123456789" className="text-primary-600 hover:underline">+39 123 456 789</a></p>
                  </div>
                </div>
              </section>

              {/* Dati raccolti */}
              <section className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                  <Lock className="w-6 h-6 mr-3 text-primary-600" />
                  Dati Personali Raccolti
                </h2>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Dati di Contatto</h3>
                    <ul className="list-disc list-inside text-gray-700 space-y-1">
                      <li>Nome e cognome</li>
                      <li>Indirizzo email</li>
                      <li>Numero di telefono</li>
                      <li>Azienda di appartenenza</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Dati di Navigazione</h3>
                    <ul className="list-disc list-inside text-gray-700 space-y-1">
                      <li>Indirizzo IP</li>
                      <li>Tipo di browser e dispositivo</li>
                      <li>Pagine visitate e tempo di permanenza</li>
                      <li>Dati di geolocalizzazione approssimativa</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Dati per Servizi di Formazione</h3>
                    <ul className="list-disc list-inside text-gray-700 space-y-1">
                      <li>Codice fiscale</li>
                      <li>Dati anagrafici completi</li>
                      <li>Qualifiche professionali</li>
                      <li>Storico corsi frequentati</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* Finalità del trattamento */}
              <section className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Finalità del Trattamento</h2>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <h3 className="font-semibold text-gray-900 mb-3">Servizi Richiesti</h3>
                    <p className="text-gray-700 text-sm">
                      Erogazione di corsi di formazione, consulenze sulla sicurezza, 
                      rilascio di certificazioni e gestione delle pratiche amministrative.
                    </p>
                  </div>
                  
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <h3 className="font-semibold text-gray-900 mb-3">Comunicazione</h3>
                    <p className="text-gray-700 text-sm">
                      Risposta a richieste di informazioni, invio di preventivi, 
                      comunicazioni relative ai servizi e supporto clienti.
                    </p>
                  </div>
                  
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <h3 className="font-semibold text-gray-900 mb-3">Marketing</h3>
                    <p className="text-gray-700 text-sm">
                      Invio di newsletter, promozioni e informazioni su nuovi corsi 
                      e servizi (solo con il tuo consenso esplicito).
                    </p>
                  </div>
                  
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <h3 className="font-semibold text-gray-900 mb-3">Miglioramento Servizi</h3>
                    <p className="text-gray-700 text-sm">
                      Analisi statistiche anonime per migliorare l'esperienza utente 
                      e ottimizzare i nostri servizi.
                    </p>
                  </div>
                </div>
              </section>

              {/* Base giuridica */}
              <section className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Base Giuridica del Trattamento</h2>
                <div className="space-y-4">
                  <div className="border-l-4 border-primary-500 pl-4">
                    <h3 className="font-semibold text-gray-900">Esecuzione del Contratto</h3>
                    <p className="text-gray-700 text-sm">
                      Per l'erogazione dei servizi di formazione e consulenza richiesti.
                    </p>
                  </div>
                  
                  <div className="border-l-4 border-green-500 pl-4">
                    <h3 className="font-semibold text-gray-900">Consenso</h3>
                    <p className="text-gray-700 text-sm">
                      Per attività di marketing e comunicazioni promozionali.
                    </p>
                  </div>
                  
                  <div className="border-l-4 border-orange-500 pl-4">
                    <h3 className="font-semibold text-gray-900">Interesse Legittimo</h3>
                    <p className="text-gray-700 text-sm">
                      Per migliorare i nostri servizi e garantire la sicurezza del sito.
                    </p>
                  </div>
                  
                  <div className="border-l-4 border-red-500 pl-4">
                    <h3 className="font-semibold text-gray-900">Obbligo Legale</h3>
                    <p className="text-gray-700 text-sm">
                      Per adempiere agli obblighi normativi in materia di formazione e sicurezza.
                    </p>
                  </div>
                </div>
              </section>

              {/* Diritti dell'interessato */}
              <section className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">I Tuoi Diritti</h2>
                <div className="bg-primary-50 p-6 rounded-lg">
                  <p className="text-gray-700 mb-4">
                    In conformità al GDPR, hai diritto a:
                  </p>
                  <div className="grid md:grid-cols-2 gap-4">
                    <ul className="space-y-2 text-gray-700">
                      <li className="flex items-center">
                        <span className="w-2 h-2 bg-primary-500 rounded-full mr-3"></span>
                        Accesso ai tuoi dati personali
                      </li>
                      <li className="flex items-center">
                        <span className="w-2 h-2 bg-primary-500 rounded-full mr-3"></span>
                        Rettifica di dati inesatti
                      </li>
                      <li className="flex items-center">
                        <span className="w-2 h-2 bg-primary-500 rounded-full mr-3"></span>
                        Cancellazione dei dati
                      </li>
                      <li className="flex items-center">
                        <span className="w-2 h-2 bg-primary-500 rounded-full mr-3"></span>
                        Limitazione del trattamento
                      </li>
                    </ul>
                    <ul className="space-y-2 text-gray-700">
                      <li className="flex items-center">
                        <span className="w-2 h-2 bg-primary-500 rounded-full mr-3"></span>
                        Portabilità dei dati
                      </li>
                      <li className="flex items-center">
                        <span className="w-2 h-2 bg-primary-500 rounded-full mr-3"></span>
                        Opposizione al trattamento
                      </li>
                      <li className="flex items-center">
                        <span className="w-2 h-2 bg-primary-500 rounded-full mr-3"></span>
                        Revoca del consenso
                      </li>
                      <li className="flex items-center">
                        <span className="w-2 h-2 bg-primary-500 rounded-full mr-3"></span>
                        Reclamo al Garante
                      </li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* Contatti */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Contatti per la Privacy</h2>
                <div className="bg-gray-50 p-6 rounded-lg">
                  <p className="text-gray-700 mb-4">
                    Per esercitare i tuoi diritti o per qualsiasi domanda relativa al trattamento 
                    dei tuoi dati personali, puoi contattarci:
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <a 
                      href="mailto:privacy@elementformazione.it"
                      className="flex items-center text-primary-600 hover:text-primary-700 transition-colors"
                    >
                      <Mail className="w-5 h-5 mr-2" />
                      privacy@elementformazione.it
                    </a>
                    <a 
                      href="tel:+39123456789"
                      className="flex items-center text-primary-600 hover:text-primary-700 transition-colors"
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
                  Questa Privacy Policy può essere aggiornata periodicamente. 
                  Ti invitiamo a consultarla regolarmente.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
};

export default PrivacyPage;