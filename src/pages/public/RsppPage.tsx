import React from 'react';
import { PublicLayout } from '../../components/public/PublicLayout';
import { HeroSection } from '../../components/public/HeroSection';
import { PublicButton } from '../../components/public/PublicButton';
import { CheckCircle, Shield, ClipboardList, Users, Calendar } from 'lucide-react';
import { trackCtaEvent } from '../../services/logs';

const RsppPage: React.FC = () => {
  const features = [
    'Consulenza specializzata RSPP esterno',
    'Valutazione dei rischi e analisi processi',
    'Elaborazione e aggiornamento DVR',
    'Sopralluoghi periodici e reportistica',
    'Formazione lavoratori e preposti',
    'Supporto continuo alla conformità normativa'
  ];

  return (
    <PublicLayout>
      <HeroSection
        title="Nomina RSPP"
        subtitle="Responsabile del Servizio di Prevenzione e Protezione"
        description="Affida a professionisti certificati la gestione della sicurezza nella tua azienda. Dalla valutazione dei rischi alla formazione, ti accompagniamo in ogni fase."
        primaryButton={{ text: 'Richiedi Preventivo', href: '/contatti' }}
        secondaryButton={{ text: 'Scopri i Corsi', href: '/corsi' }}
        stats={[
          { number: '15+', label: 'Anni di esperienza' },
          { number: '500+', label: 'Aziende seguite' },
          { number: '98%', label: 'Clienti soddisfatti' },
        ]}
        showContactForm={false}
      />

      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Cosa include il servizio</h2>
              <p className="text-gray-600 mb-6">
                Il nostro servizio di RSPP esterno garantisce la piena conformità al D.Lgs. 81/08 attraverso un percorso completo e personalizzato.
              </p>
              <ul className="space-y-3">
                {features.map((f, i) => (
                  <li key={i} className="flex items-start text-gray-700">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="p-6 bg-gray-50 rounded-xl">
                <Shield className="w-8 h-8 text-primary-600 mb-3" />
                <h3 className="font-semibold mb-2">Analisi dei Rischi</h3>
                <p className="text-gray-600 text-sm">Sopralluoghi e raccolta dati per una mappatura accurata dei rischi aziendali.</p>
              </div>
              <div className="p-6 bg-gray-50 rounded-xl">
                <ClipboardList className="w-8 h-8 text-primary-600 mb-3" />
                <h3 className="font-semibold mb-2">DVR e Procedure</h3>
                <p className="text-gray-600 text-sm">Redazione e aggiornamento del DVR e delle procedure operative.</p>
              </div>
              <div className="p-6 bg-gray-50 rounded-xl">
                <Users className="w-8 h-8 text-primary-600 mb-3" />
                <h3 className="font-semibold mb-2">Formazione</h3>
                <p className="text-gray-600 text-sm">Percorsi formativi per lavoratori, preposti e dirigenti.</p>
              </div>
              <div className="p-6 bg-gray-50 rounded-xl">
                <Calendar className="w-8 h-8 text-primary-600 mb-3" />
                <h3 className="font-semibold mb-2">Sopralluoghi</h3>
                <p className="text-gray-600 text-sm">Visite periodiche con report e piano di miglioramento.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Richiedi una consulenza gratuita</h2>
          <p className="text-gray-600 mb-6">Valutiamo insieme lo stato di conformità della tua azienda e il piano di azione.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <PublicButton 
              size="lg" 
              to="/contatti"
              onClick={() => trackCtaEvent({ resource: 'public', action: 'cta_click', details: { label: 'Contattaci', href: '/contatti', section: 'RsppPage' } })}
            >
              Contattaci
            </PublicButton>
            <PublicButton 
              variant="outline" 
              size="lg"
              to="/corsi"
              onClick={() => trackCtaEvent({ resource: 'public', action: 'cta_click', details: { label: 'Vedi i corsi', href: '/corsi', section: 'RsppPage' } })}
            >
              Vedi i corsi
            </PublicButton>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
};

export default RsppPage;