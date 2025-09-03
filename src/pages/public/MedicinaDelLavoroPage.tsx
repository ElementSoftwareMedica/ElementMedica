import React from 'react';
import { PublicLayout } from '../../components/public/PublicLayout';
import { HeroSection } from '../../components/public/HeroSection';
import { PublicButton } from '../../components/public/PublicButton';
import { HeartPulse, Stethoscope, ClipboardCheck, Shield, CheckCircle } from 'lucide-react';
import { trackCtaEvent } from '../../services/logs';

const MedicinaDelLavoroPage: React.FC = () => {
  const features = [
    'Sorveglianza sanitaria completa',
    'Visite preventive e periodiche',
    'Giudizi di idoneità',
    'Protocolli sanitari personalizzati',
    'Gestione scadenze e richiami',
    'Report conformi alla normativa vigente'
  ];

  return (
    <PublicLayout>
      <HeroSection
        title="Medicina del Lavoro"
        subtitle="Sorveglianza Sanitaria per la Tua Azienda"
        description="Supportiamo la salute dei lavoratori con un servizio completo e conforme. Dalla definizione dei protocolli sanitari alla gestione delle visite."
        primaryButton={{ text: 'Richiedi Informazioni', href: '/contatti' }}
        secondaryButton={{ text: 'Scopri i Corsi', href: '/corsi' }}
        stats={[
          { number: '1000+', label: 'Visite/anno' },
          { number: '50+', label: 'Aziende seguite' },
          { number: '24/7', label: 'Supporto' },
        ]}
        showContactForm={false}
      />

      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">I nostri servizi</h2>
              <p className="text-gray-600 mb-6">
                Una gestione strutturata e puntuale della sorveglianza sanitaria, integrata con i processi aziendali.
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
                <Stethoscope className="w-8 h-8 text-primary-600 mb-3" />
                <h3 className="font-semibold mb-2">Visite Mediche</h3>
                <p className="text-gray-600 text-sm">Programmazione e gestione di visite preventive e periodiche.</p>
              </div>
              <div className="p-6 bg-gray-50 rounded-xl">
                <ClipboardCheck className="w-8 h-8 text-primary-600 mb-3" />
                <h3 className="font-semibold mb-2">Idoneità</h3>
                <p className="text-gray-600 text-sm">Emissione giudizi di idoneità conformi ai protocolli.</p>
              </div>
              <div className="p-6 bg-gray-50 rounded-xl">
                <Shield className="w-8 h-8 text-primary-600 mb-3" />
                <h3 className="font-semibold mb-2">Protocollo Sanitario</h3>
                <p className="text-gray-600 text-sm">Definizione di protocolli per mansione e rischio.</p>
              </div>
              <div className="p-6 bg-gray-50 rounded-xl">
                <HeartPulse className="w-8 h-8 text-primary-600 mb-3" />
                <h3 className="font-semibold mb-2">Screening</h3>
                <p className="text-gray-600 text-sm">Programmi di prevenzione e controllo periodico.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Parliamo delle tue esigenze</h2>
          <p className="text-gray-600 mb-6">Ti proponiamo un piano di sorveglianza sanitaria in linea con la normativa e le mansioni del tuo personale.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <PublicButton 
              size="lg"
              to="/contatti"
              onClick={() => trackCtaEvent({ resource: 'public', action: 'cta_click', details: { label: 'Contattaci', href: '/contatti', section: 'MedicinaDelLavoroPage' } })}
            >
              Contattaci
            </PublicButton>
            <PublicButton 
              variant="outline" 
              size="lg"
              to="/corsi"
              onClick={() => trackCtaEvent({ resource: 'public', action: 'cta_click', details: { label: 'Vedi i corsi', href: '/corsi', section: 'MedicinaDelLavoroPage' } })}
            >
              Vedi i corsi
            </PublicButton>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
};

export default MedicinaDelLavoroPage;