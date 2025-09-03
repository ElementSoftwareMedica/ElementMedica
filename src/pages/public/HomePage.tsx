import React from 'react';
import { 
  Award,
  CheckCircle,
  Shield,
  Star,
  Users
} from 'lucide-react';
import { PublicLayout } from '../../components/public/PublicLayout';
import { HeroSection } from '../../components/public/HeroSection';
import { PublicButton } from '../../components/public/PublicButton';
import { trackCtaEvent } from '../../services/logs';
import { useNavigate } from 'react-router-dom';

/**
 * Homepage pubblica di Element Formazione
 * Presenta l'azienda e i servizi offerti
 */
 export const HomePage: React.FC = () => {
  const navigate = useNavigate();
   const services = [
    {
      icon: Shield,
      title: 'Corsi di Formazione',
      description: 'Corsi sulla sicurezza sul lavoro per tutti i settori e livelli di rischio',
      features: ['Rischio Alto, Medio, Basso', 'Aggiornamenti periodici', 'Certificazioni riconosciute'],
      href: '/corsi'
    },
    {
      icon: Users,
      title: 'Nomina RSPP',
      description: 'Servizio di Responsabile del Servizio di Prevenzione e Protezione',
      features: ['Consulenza specializzata', 'Supporto continuo', 'Conformità normativa'],
      href: '/rspp'
    },
    {
      icon: Award,
      title: 'Medico del Lavoro',
      description: 'Sorveglianza sanitaria e visite mediche per i lavoratori',
      features: ['Visite periodiche', 'Protocolli sanitari', 'Certificazioni mediche'],
      href: '/medicina-del-lavoro'
    }
  ];

  const stats = [
    { number: '500+', label: 'Aziende Clienti' },
    { number: '10.000+', label: 'Lavoratori Formati' },
    { number: '15+', label: 'Anni di Esperienza' },
    { number: '98%', label: 'Soddisfazione Cliente' }
  ];

  const testimonials = [
    {
      name: 'Marco Rossi',
      company: 'Industrie Meccaniche SRL',
      text: 'Servizio eccellente e professionale. La formazione è stata chiara e completa.',
      rating: 5
    },
    {
      name: 'Laura Bianchi',
      company: 'Costruzioni Edili SpA',
      text: 'Supporto costante e competenza tecnica di alto livello. Consigliato!',
      rating: 5
    }
  ];

  return (
    <PublicLayout>
      <HeroSection
        title="Sicurezza sul Lavoro"
        subtitle="Senza Compromessi"
        description="Leader nella formazione sulla sicurezza e consulenza aziendale. Offriamo soluzioni complete per la conformità normativa e la protezione dei lavoratori."
        primaryButton={{
          text: "Scopri i Corsi",
          href: "/corsi"
        }}
        secondaryButton={{
          text: "Richiedi Preventivo",
          href: "/contatti"
        }}
        stats={stats}
        showContactForm={true}
      />

      {/* Services Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              I Nostri Servizi
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Soluzioni complete per la sicurezza sul lavoro e la conformità normativa
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {services.map((service, index) => {
              const IconComponent = service.icon;
              return (
                <div
                  key={index}
                  className="bg-gray-50 rounded-2xl p-8 hover:shadow-lg transition-shadow cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500"
                  role="link"
                  tabIndex={0}
                  onClick={() => {
                    trackCtaEvent({
                      resource: 'public',
                      action: 'cta_click',
                      details: {
                        label: 'Apri servizio',
                        href: service.href,
                        section: 'HomePage Services',
                        title: service.title,
                      },
                    });
                    navigate(service.href);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      trackCtaEvent({
                        resource: 'public',
                        action: 'cta_click',
                        details: {
                          label: 'Apri servizio (keyboard)',
                          href: service.href,
                          section: 'HomePage Services',
                          title: service.title,
                        },
                      });
                      navigate(service.href);
                    }
                  }}
                >
                  <div className="w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center mb-6">
                    <IconComponent className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">{service.title}</h3>
                  <p className="text-gray-600 mb-6">{service.description}</p>
                  <ul className="space-y-2 mb-6">
                    {service.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center text-sm text-gray-700">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <PublicButton
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      trackCtaEvent({
                        resource: 'public',
                        action: 'cta_click',
                        details: {
                          label: 'Scopri di più',
                          href: service.href,
                          section: 'HomePage Services',
                          title: service.title,
                        },
                      });
                      navigate(service.href);
                    }}
                  >
                    Scopri di più
                  </PublicButton>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6">
                Perché Scegliere Element Formazione
              </h2>
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Esperienza Consolidata</h3>
                    <p className="text-gray-600">Oltre 15 anni nel settore della sicurezza sul lavoro</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Certificazioni Riconosciute</h3>
                    <p className="text-gray-600">Tutti i nostri corsi rilasciano attestati validi a norma di legge</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Supporto Continuo</h3>
                    <p className="text-gray-600">Assistenza e consulenza anche dopo la formazione</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <h3 className="text-2xl font-semibold text-gray-900 mb-6">Cosa Dicono i Nostri Clienti</h3>
              <div className="space-y-6">
                {testimonials.map((testimonial, index) => (
                  <div key={index} className="border-l-4 border-primary-600 pl-4">
                    <div className="flex items-center mb-2">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                      ))}
                    </div>
                    <p className="text-gray-700 mb-2">"{testimonial.text}"</p>
                    <div className="text-sm text-gray-600">
                      <strong>{testimonial.name}</strong> - {testimonial.company}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-6">
            Pronto a Migliorare la Sicurezza della Tua Azienda?
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Contattaci oggi per una consulenza gratuita e scopri come possiamo aiutarti
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <PublicButton 
              variant="secondary" 
              size="lg"
              to="/contatti"
              onClick={() => {
                trackCtaEvent({ resource: 'public', action: 'cta_click', details: { label: 'Contattaci Ora', href: '/contatti', section: 'HomePage' } });
              }}
            >
              Contattaci Ora
            </PublicButton>
            <PublicButton 
              variant="outline" 
              size="lg"
              to="/corsi"
              onClick={() => {
                trackCtaEvent({ resource: 'public', action: 'cta_click', details: { label: 'Vedi i Corsi', href: '/corsi', section: 'HomePage' } });
              }}
            >
              Vedi i Corsi
            </PublicButton>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
};

export default HomePage;