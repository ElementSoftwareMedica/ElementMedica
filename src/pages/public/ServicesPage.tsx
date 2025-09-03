import React from 'react';
import { PublicLayout } from '../../components/public/PublicLayout';
import { PublicButton } from '../../components/public/PublicButton';
import { ServiceCard } from '../../components/public/ServiceCard';
import { Shield, Heart, Briefcase, AlertTriangle, GraduationCap, FileText } from 'lucide-react';
// import { useNavigate } from 'react-router-dom';
import { trackCtaEvent } from '../../services/logs';

const ServicesPage: React.FC = () => {
  // const navigate = useNavigate(); // not used currently
  // const track = trackCtaEvent; // reserved for future tracking usage
  const services = [
    {
      id: 1,
      title: 'Corsi di Formazione sulla Sicurezza',
      description: 'Corsi completi per la formazione dei lavoratori in materia di sicurezza sul lavoro, conformi al D.Lgs. 81/08.',
      features: [
        'Formazione generale e specifica',
        'Corsi per preposti e dirigenti',
        'Aggiornamenti periodici',
        'Attestati riconosciuti'
      ],
      icon: GraduationCap,
      buttonText: 'Scopri i Corsi',
      buttonHref: '/corsi'
    },
    {
      id: 2,
      title: 'Nomina RSPP',
      description: 'Servizio di Responsabile del Servizio di Prevenzione e Protezione per la vostra azienda.',
      features: [
        'Valutazione dei rischi',
        'Elaborazione DVR',
        'Consulenza continua',
        'Sopralluoghi periodici'
      ],
      icon: Shield,
      buttonText: 'Scopri di più',
      buttonHref: '/rspp'
    },
    {
      id: 3,
      title: 'Medico del Lavoro',
      description: 'Servizio di sorveglianza sanitaria per garantire la salute dei vostri dipendenti.',
      features: [
        'Visite mediche preventive',
        'Visite periodiche',
        'Giudizi di idoneità',
        'Protocolli sanitari'
      ],
      icon: Heart,
      buttonText: 'Scopri di più',
      buttonHref: '/medicina-del-lavoro'
    },
    {
      id: 4,
      title: 'Documento di Valutazione dei Rischi (DVR)',
      description: 'Elaborazione e aggiornamento del Documento di Valutazione dei Rischi secondo normativa.',
      features: [
        'Analisi dei rischi aziendali',
        'Misure di prevenzione',
        'Programma di miglioramento',
        'Aggiornamenti periodici'
      ],
      icon: FileText,
      buttonText: 'Richiedi Preventivo',
      buttonHref: '/contatti'
    },
    {
      id: 5,
      title: 'Consulenza Sicurezza',
      description: 'Consulenza specializzata per la gestione della sicurezza sul lavoro nella vostra azienda.',
      features: [
        'Audit di sicurezza',
        'Procedure operative',
        'Formazione personalizzata',
        'Supporto normativo'
      ],
      icon: Briefcase,
      buttonText: 'Richiedi Consulenza',
      buttonHref: '/contatti'
    },
    {
      id: 6,
      title: 'Gestione Emergenze',
      description: 'Pianificazione e gestione delle procedure di emergenza e primo soccorso.',
      features: [
        'Piani di emergenza',
        'Formazione primo soccorso',
        'Addetti antincendio',
        'Prove di evacuazione'
      ],
      icon: AlertTriangle,
      buttonText: 'Richiedi Informazioni',
      buttonHref: '/contatti'
    }
  ];

  return (
    <PublicLayout>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 to-indigo-100 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl md:text-6xl">
              I Nostri Servizi
            </h1>
            <p className="mt-6 max-w-3xl mx-auto text-xl text-gray-600">
              Soluzioni complete per la sicurezza sul lavoro e la medicina del lavoro. 
              Affidati alla nostra esperienza per garantire la conformità normativa della tua azienda.
            </p>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service) => (
              <ServiceCard
                key={service.id}
                icon={service.icon}
                title={service.title}
                description={service.description}
                features={service.features}
                buttonText={service.buttonText}
                buttonHref={service.buttonHref}
                variant="default"
              />
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Perché Scegliere Element Formazione
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              La nostra esperienza e professionalità al servizio della vostra sicurezza
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="bg-primary-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🏆</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Esperienza Consolidata</h3>
              <p className="text-gray-600">Oltre 15 anni nel settore della sicurezza sul lavoro</p>
            </div>

            <div className="text-center">
              <div className="bg-primary-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📜</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Conformità Normativa</h3>
              <p className="text-gray-600">Sempre aggiornati alle ultime disposizioni legislative</p>
            </div>

            <div className="text-center">
              <div className="bg-primary-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">👥</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Team Qualificato</h3>
              <p className="text-gray-600">Professionisti certificati e costantemente formati</p>
            </div>

            <div className="text-center">
              <div className="bg-primary-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🎯</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Soluzioni Personalizzate</h3>
              <p className="text-gray-600">Servizi su misura per ogni tipologia di azienda</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-primary-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Hai bisogno di una consulenza?
          </h2>
          <p className="text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
            Contattaci per una valutazione gratuita delle tue esigenze in materia di sicurezza sul lavoro
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <PublicButton 
              variant="secondary" 
              size="lg"
              to="/contatti"
              onClick={() => {
                trackCtaEvent({ resource: 'public', action: 'cta_click', details: { label: 'Richiedi Preventivo Gratuito', href: '/contatti', section: 'ServicesPage' } });
              }}
            >
              Richiedi Preventivo Gratuito
            </PublicButton>
            <PublicButton 
              variant="outline" 
              size="lg" 
              className="border-white text-white hover:bg-white hover:text-primary-600"
              to="/contatti"
              onClick={() => {
                trackCtaEvent({ resource: 'public', action: 'cta_click', details: { label: 'Contattaci Ora', href: '/contatti', section: 'ServicesPage' } });
              }}
            >
              Contattaci Ora
            </PublicButton>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
};

export default ServicesPage;