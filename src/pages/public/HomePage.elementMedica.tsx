import React from 'react';
import { PublicLayout } from '../../components/public/PublicLayout';
import { HeroSection } from '../../components/public/HeroSection';
import { PublicButton } from '../../components/public/PublicButton';
import { 
  Stethoscope, 
  HeartPulse, 
  Activity, 
  Calendar, 
  Shield, 
  CheckCircle, 
  Phone,
  MapPin,
  Clock,
  Award,
  Users,
  FileText,
  Target,
  Microscope,
  Brain,
  Eye,
  Bone
} from 'lucide-react';
import { trackCtaEvent } from '../../services/logs';

/**
 * Homepage Element Medica - Poliambulatorio
 * Focus: Medicina del Lavoro come servizio PRIMARIO + Visite specialistiche
 */
const HomePageElementMedica: React.FC = () => {
  const mainServices = [
    {
      icon: <HeartPulse className="w-8 h-8" />,
      title: 'Medicina del Lavoro',
      description: 'Sorveglianza sanitaria completa per la tua azienda. Visite preventive, periodiche, protocolli personalizzati e piena conformità D.Lgs. 81/08.',
      badge: 'Servizio Principale',
      badgeColor: 'bg-teal-600',
      href: '/medicina-del-lavoro',
      features: ['Visite mediche', 'Protocolli sanitari', 'Gestione scadenze', 'Report conformi']
    },
    {
      icon: <Stethoscope className="w-8 h-8" />,
      title: 'Visite Specialistiche',
      description: 'Specialisti qualificati per diagnosi accurate e percorsi terapeutici personalizzati. Prenota la tua visita online.',
      badge: null,
      badgeColor: null,
      href: '/visite-specialistiche',
      features: ['Cardiologia', 'Ortopedia', 'Dermatologia', 'Oculistica']
    },
    {
      icon: <Microscope className="w-8 h-8" />,
      title: 'Diagnostica',
      description: 'Esami diagnostici con tecnologie avanzate. Risultati rapidi e refertazione accurata per supportare il tuo percorso di cura.',
      badge: null,
      badgeColor: null,
      href: '/diagnostica',
      features: ['Analisi cliniche', 'ECG', 'Ecografie', 'Spirometrie']
    }
  ];

  const specialties = [
    { icon: <HeartPulse className="w-6 h-6" />, name: 'Cardiologia', available: true },
    { icon: <Bone className="w-6 h-6" />, name: 'Ortopedia', available: true },
    { icon: <Eye className="w-6 h-6" />, name: 'Oculistica', available: true },
    { icon: <Brain className="w-6 h-6" />, name: 'Neurologia', available: true },
    { icon: <Activity className="w-6 h-6" />, name: 'Dermatologia', available: true },
    { icon: <Stethoscope className="w-6 h-6" />, name: 'Medicina Generale', available: true }
  ];

  const whyChooseUs = [
    {
      icon: <Award className="w-6 h-6" />,
      title: 'Certificazioni',
      description: 'ISO 9001 e accreditamento regionale'
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: 'Specialisti Qualificati',
      description: 'Team medico esperto e aggiornato'
    },
    {
      icon: <Clock className="w-6 h-6" />,
      title: 'Tempi Rapidi',
      description: 'Appuntamenti flessibili e refertazione veloce'
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: 'Privacy e Sicurezza',
      description: 'Massima riservatezza dei dati sanitari'
    }
  ];

  return (
    <PublicLayout>
      {/* Hero Section */}
      <HeroSection
        variant="medical"
        backgroundPattern="medical-grid"
        title={<>Element Medica<span className="block text-3xl lg:text-4xl mt-2">Il tuo Poliambulatorio di Fiducia</span></>}
        subtitle="Salute e prevenzione al centro"
        description="Medicina del Lavoro, visite specialistiche e diagnostica avanzata. Professionisti qualificati e tecnologie moderne per prenderci cura di te e della tua azienda."
        primaryButton={{
          text: 'Prenota una Visita',
          href: '/prenota',
          variant: 'medical',
          icon: <Calendar className="w-5 h-5" />
        }}
        secondaryButton={{
          text: 'Medicina del Lavoro',
          href: '/medicina-del-lavoro',
          variant: 'outline'
        }}
        stats={[
          {
            value: '1200+',
            label: 'Visite/anno',
            icon: <Stethoscope className="w-5 h-5" />,
            highlight: true,
            color: 'medical'
          },
          {
            value: '15+',
            label: 'Specialità',
            icon: <Activity className="w-5 h-5" />,
            color: 'default'
          },
          {
            value: '80+',
            label: 'Aziende assistite',
            icon: <Users className="w-5 h-5" />,
            highlight: true,
            color: 'health'
          },
          {
            value: '24h',
            label: 'Tempi refertazione',
            icon: <Clock className="w-5 h-5" />,
            color: 'default'
          }
        ]}
        showTrustBadges={true}
        showContactForm={false}
      />

      {/* Main Services - Medicina del Lavoro in primo piano */}
      <section className="py-20 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-teal-100 text-teal-800 rounded-full text-sm font-medium mb-4">
              <Target className="w-4 h-4" />
              I Nostri Servizi
            </div>
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              Salute completa per te e la tua azienda
            </h2>
            <p className="text-xl text-gray-600">
              Dalla medicina del lavoro alle visite specialistiche, tutto in un unico centro
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {mainServices.map((service, index) => (
              <div
                key={index}
                className={`group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden ${
                  index === 0 ? 'lg:col-span-3 lg:row-span-1' : ''
                }`}
              >
                {/* Badge servizio principale */}
                {service.badge && (
                  <div className="absolute top-4 right-4 z-10">
                    <span className={`${service.badgeColor} text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg`}>
                      {service.badge}
                    </span>
                  </div>
                )}

                <div className={`p-8 ${index === 0 ? 'lg:flex lg:items-center lg:gap-12' : ''}`}>
                  {/* Icon */}
                  <div className={`flex-shrink-0 ${index === 0 ? 'lg:w-1/4' : ''}`}>
                    <div className={`${
                      index === 0 
                        ? 'w-24 h-24 lg:w-32 lg:h-32' 
                        : 'w-16 h-16'
                    } bg-gradient-medical rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-xl`}>
                      <div className="text-white">
                        {React.cloneElement(service.icon, { 
                          className: index === 0 ? 'w-12 h-12 lg:w-16 lg:h-16' : 'w-8 h-8' 
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className={index === 0 ? 'lg:flex-1' : ''}>
                    <h3 className={`${
                      index === 0 ? 'text-3xl lg:text-4xl' : 'text-2xl'
                    } font-bold text-gray-900 mb-4`}>
                      {service.title}
                    </h3>
                    <p className={`${
                      index === 0 ? 'text-lg' : 'text-base'
                    } text-gray-600 mb-6`}>
                      {service.description}
                    </p>

                    {/* Features */}
                    <div className={`grid ${
                      index === 0 ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-2'
                    } gap-3 mb-6`}>
                      {service.features.map((feature, i) => (
                        <div key={i} className="flex items-center text-sm text-gray-700">
                          <CheckCircle className="w-4 h-4 text-health-500 mr-2 flex-shrink-0" />
                          {feature}
                        </div>
                      ))}
                    </div>

                    {/* CTA */}
                    <PublicButton
                      variant={index === 0 ? 'medical' : 'primary'}
                      size={index === 0 ? 'lg' : 'md'}
                      to={service.href}
                      onClick={() => trackCtaEvent({ 
                        resource: 'public', 
                        action: 'cta_click', 
                        details: { 
                          label: `Scopri ${service.title}`, 
                          href: service.href, 
                          section: 'ElementMedica-MainServices' 
                        } 
                      })}
                    >
                      {index === 0 ? 'Scopri il Servizio' : 'Maggiori Info'}
                    </PublicButton>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Specialties Grid */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Le nostre specialità
            </h2>
            <p className="text-lg text-gray-600">
              Professionisti esperti in diverse aree mediche per offrirti cure complete
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {specialties.map((specialty, index) => (
              <div
                key={index}
                className="group p-6 bg-gray-50 rounded-xl hover:bg-gradient-to-r hover:from-teal-600 hover:to-teal-700 hover:text-white transition-all duration-300 text-center cursor-pointer"
              >
                <div className="flex justify-center mb-3 text-teal-600 group-hover:text-white transition-colors">
                  {specialty.icon}
                </div>
                <div className="text-sm font-medium text-gray-900 group-hover:text-white">
                  {specialty.name}
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <PublicButton
              variant="outline"
              size="lg"
              to="/visite-specialistiche"
              onClick={() => trackCtaEvent({ 
                resource: 'public', 
                action: 'cta_click', 
                details: { 
                  label: 'Tutte le specialità', 
                  href: '/visite-specialistiche', 
                  section: 'ElementMedica-Specialties' 
                } 
              })}
            >
              Vedi Tutte le Specialità
            </PublicButton>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Perché scegliere Element Medica
            </h2>
            <p className="text-lg text-gray-600">
              Qualità, professionalità e attenzione al paziente in ogni momento
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {whyChooseUs.map((item, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 bg-gradient-medical rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <div className="text-white">{item.icon}</div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section - Prenota */}
      <section className="py-20 bg-gradient-medical relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}></div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-full text-sm font-medium mb-6">
            <Calendar className="w-4 h-4" />
            Prenota Online
          </div>
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
            Prenota la tua visita in pochi click
          </h2>
          <p className="text-xl text-white/95 mb-10 max-w-2xl mx-auto">
            Sistema di prenotazione online semplice e veloce. Scegli data, ora e specialista in totale autonomia.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <PublicButton 
              variant="medical"
              size="lg"
              to="/prenota"
              className="bg-white text-teal-700 hover:bg-teal-50 shadow-2xl"
              onClick={() => trackCtaEvent({ 
                resource: 'public', 
                action: 'cta_click', 
                details: { 
                  label: 'Prenota Ora', 
                  href: '/prenota', 
                  section: 'ElementMedica-CTA' 
                } 
              })}
            >
              <Calendar className="w-5 h-5 mr-2" />
              Prenota Ora
            </PublicButton>
            <PublicButton 
              variant="outline" 
              size="lg"
              to="/contatti"
              className="border-2 border-white text-white hover:bg-white hover:text-teal-700"
              onClick={() => trackCtaEvent({ 
                resource: 'public', 
                action: 'cta_click', 
                details: { 
                  label: 'Contattaci', 
                  href: '/contatti', 
                  section: 'ElementMedica-CTA' 
                } 
              })}
            >
              <Phone className="w-5 h-5 mr-2" />
              Contattaci
            </PublicButton>
          </div>

          {/* Contact Info */}
          <div className="mt-12 pt-8 border-t border-white/20">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-white">
              <div className="flex items-center justify-center gap-3">
                <Phone className="w-5 h-5" />
                <span className="font-medium">0123 456 789</span>
              </div>
              <div className="flex items-center justify-center gap-3">
                <MapPin className="w-5 h-5" />
                <span className="font-medium">Via della Salute, 10</span>
              </div>
              <div className="flex items-center justify-center gap-3">
                <Clock className="w-5 h-5" />
                <span className="font-medium">Lun-Ven 8:00-19:00</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works - Process Flow */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-teal-100 text-teal-800 rounded-full text-sm font-medium mb-4">
              <Target className="w-4 h-4" />
              Come Funziona
            </div>
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              Prenotare è semplice
            </h2>
            <p className="text-xl text-gray-600">
              In 3 semplici passaggi puoi prenotare la tua visita medica
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connecting line (hidden on mobile) */}
            <div className="hidden md:block absolute top-16 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-teal-400 to-teal-600" style={{ transform: 'translateY(-50%)' }}></div>
            
            {[
              {
                step: '1',
                icon: <Calendar className="w-8 h-8" />,
                title: 'Scegli la Specialità',
                description: 'Seleziona il tipo di visita o esame di cui hai bisogno dal nostro catalogo completo'
              },
              {
                step: '2',
                icon: <Clock className="w-8 h-8" />,
                title: 'Prenota Online',
                description: 'Scegli data e orario più comodi per te. Sistema di prenotazione disponibile 24/7'
              },
              {
                step: '3',
                icon: <CheckCircle className="w-8 h-8" />,
                title: 'Ricevi Conferma',
                description: 'Conferma immediata via email e SMS con tutti i dettagli del tuo appuntamento'
              }
            ].map((item, index) => (
              <div key={index} className="relative">
                {/* Step number badge */}
                <div className="flex justify-center mb-6">
                  <div className="relative">
                    <div className="w-20 h-20 bg-gradient-medical rounded-full flex items-center justify-center shadow-xl relative z-10">
                      <span className="text-3xl font-bold text-white">{item.step}</span>
                    </div>
                    <div className="absolute inset-0 bg-gradient-medical rounded-full animate-pulse opacity-20"></div>
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="flex justify-center mb-4 text-teal-600">
                    {item.icon}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{item.title}</h3>
                  <p className="text-gray-600">{item.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <PublicButton
              variant="medical"
              size="lg"
              to="/prenota"
              onClick={() => trackCtaEvent({ 
                resource: 'public', 
                action: 'cta_click', 
                details: { 
                  label: 'Inizia Ora', 
                  href: '/prenota', 
                  section: 'ElementMedica-HowItWorks' 
                } 
              })}
            >
              Inizia Ora
            </PublicButton>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-teal-100 text-teal-800 rounded-full text-sm font-medium mb-4">
              <Users className="w-4 h-4" />
              Testimonianze
            </div>
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              Cosa dicono i nostri pazienti
            </h2>
            <p className="text-xl text-gray-600">
              La soddisfazione dei nostri pazienti è la nostra migliore referenza
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                name: 'Marco R.',
                role: 'Responsabile HR',
                company: 'Azienda Manifatturiera',
                text: 'Servizio di medicina del lavoro impeccabile. Gestione professionale di tutte le visite periodiche dei nostri 50 dipendenti. Consigliatissimo!',
                rating: 5
              },
              {
                name: 'Laura S.',
                role: 'Paziente',
                company: null,
                text: 'Ho effettuato una visita cardiologica. Personale cortese, ambiente pulito e professionale. Molto soddisfatta del servizio ricevuto.',
                rating: 5
              },
              {
                name: 'Giuseppe M.',
                role: 'Titolare',
                company: 'PMI Edile',
                text: 'Finalmente un poliambulatorio che capisce le esigenze delle aziende. Protocolli personalizzati e supporto costante. Ottimo rapporto qualità-prezzo.',
                rating: 5
              }
            ].map((testimonial, index) => (
              <div key={index} className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300">
                {/* Rating stars */}
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <svg key={i} className="w-5 h-5 text-yellow-400 fill-current" viewBox="0 0 20 20">
                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                    </svg>
                  ))}
                </div>
                
                <p className="text-gray-700 mb-6 italic">"{testimonial.text}"</p>
                
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-medical rounded-full flex items-center justify-center text-white font-bold">
                    {testimonial.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-bold text-gray-900">{testimonial.name}</div>
                    <div className="text-sm text-gray-600">{testimonial.role}</div>
                    {testimonial.company && (
                      <div className="text-xs text-teal-600">{testimonial.company}</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-teal-100 text-teal-800 rounded-full text-sm font-medium mb-4">
              <FileText className="w-4 h-4" />
              Domande Frequenti
            </div>
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              Hai qualche dubbio?
            </h2>
            <p className="text-xl text-gray-600">
              Risposte alle domande più comuni dei nostri pazienti
            </p>
          </div>

          <div className="space-y-4">
            {[
              {
                question: 'Come posso prenotare una visita?',
                answer: 'Puoi prenotare online tramite il nostro sistema di prenotazione, telefonicamente chiamando lo 0123 456 789, oppure via email. Il sistema online è disponibile 24/7 per la massima flessibilità.'
              },
              {
                question: 'Quali documenti devo portare alla prima visita?',
                answer: 'Per la prima visita ti consigliamo di portare: documento di identità, tessera sanitaria, eventuali esami precedenti e la lista dei farmaci che assumi. Per le visite di medicina del lavoro, sarà necessaria anche la documentazione aziendale.'
              },
              {
                question: 'Quanto tempo prima devo arrivare?',
                answer: 'Ti consigliamo di arrivare 10-15 minuti prima dell\'orario dell\'appuntamento per completare eventuali procedure amministrative. Questo ci aiuta a rispettare gli orari di tutti i pazienti.'
              },
              {
                question: 'Offrite servizi di medicina del lavoro per aziende?',
                answer: 'Sì, offriamo un servizio completo di medicina del lavoro: sorveglianza sanitaria, visite preventive e periodiche, protocolli personalizzati e piena conformità al D.Lgs. 81/08. Contattaci per un preventivo personalizzato.'
              },
              {
                question: 'In quanto tempo ricevo i risultati degli esami?',
                answer: 'I tempi variano in base al tipo di esame. Per le analisi di routine, i risultati sono disponibili entro 24-48 ore. Per esami più complessi, il medico ti comunicherà i tempi di refertazione durante la visita.'
              }
            ].map((faq, index) => (
              <details key={index} className="group bg-gray-50 rounded-xl p-6 hover:bg-gray-100 transition-colors">
                <summary className="flex justify-between items-center cursor-pointer list-none">
                  <span className="font-bold text-gray-900 text-lg">{faq.question}</span>
                  <span className="ml-4 flex-shrink-0 text-teal-600 group-open:rotate-180 transition-transform">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </summary>
                <p className="mt-4 text-gray-600 leading-relaxed">{faq.answer}</p>
              </details>
            ))}
          </div>

          <div className="text-center mt-12">
            <p className="text-gray-600 mb-4">Non hai trovato la risposta che cercavi?</p>
            <PublicButton
              variant="outline"
              size="md"
              to="/contatti"
              onClick={() => trackCtaEvent({ 
                resource: 'public', 
                action: 'cta_click', 
                details: { 
                  label: 'Contattaci per Altre Domande', 
                  href: '/contatti', 
                  section: 'ElementMedica-FAQ' 
                } 
              })}
            >
              Contattaci per Altre Domande
            </PublicButton>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-16 bg-gradient-to-b from-white to-gray-50 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Element Medica in Numeri
            </h2>
            <p className="text-gray-600">I risultati che parlano per noi</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div className="p-6 bg-white rounded-xl shadow-sm">
              <div className="text-4xl font-bold bg-gradient-to-r from-teal-600 to-teal-700 bg-clip-text text-transparent mb-2">100%</div>
              <div className="text-sm text-gray-600 font-medium">Conformità Normativa</div>
            </div>
            <div className="p-6 bg-white rounded-xl shadow-sm">
              <div className="text-4xl font-bold bg-gradient-to-r from-teal-600 to-teal-700 bg-clip-text text-transparent mb-2">1200+</div>
              <div className="text-sm text-gray-600 font-medium">Visite Annuali</div>
            </div>
            <div className="p-6 bg-white rounded-xl shadow-sm">
              <div className="text-4xl font-bold bg-gradient-to-r from-teal-600 to-teal-700 bg-clip-text text-transparent mb-2">15+</div>
              <div className="text-sm text-gray-600 font-medium">Specialità Mediche</div>
            </div>
            <div className="p-6 bg-white rounded-xl shadow-sm">
              <div className="text-4xl font-bold bg-gradient-to-r from-teal-600 to-teal-700 bg-clip-text text-transparent mb-2">80+</div>
              <div className="text-sm text-gray-600 font-medium">Aziende Assistite</div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Banner */}
      <section className="py-16 bg-gradient-to-r from-teal-600 to-blue-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
            Pronto a prenderti cura della tua salute?
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Prenota subito la tua visita o contattaci per maggiori informazioni
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <PublicButton 
              variant="medical"
              size="lg"
              to="/prenota"
              className="bg-white text-teal-700 hover:bg-gray-50 shadow-xl"
              onClick={() => trackCtaEvent({ 
                resource: 'public', 
                action: 'cta_click', 
                details: { 
                  label: 'Prenota Visita', 
                  href: '/prenota', 
                  section: 'ElementMedica-FinalCTA' 
                } 
              })}
            >
              <Calendar className="w-5 h-5 mr-2" />
              Prenota Visita
            </PublicButton>
            <PublicButton 
              variant="outline"
              size="lg"
              to="/contatti"
              className="border-2 border-white text-white hover:bg-white hover:text-teal-700"
              onClick={() => trackCtaEvent({ 
                resource: 'public', 
                action: 'cta_click', 
                details: { 
                  label: 'Richiedi Info', 
                  href: '/contatti', 
                  section: 'ElementMedica-FinalCTA' 
                } 
              })}
            >
              <Phone className="w-5 h-5 mr-2" />
              Richiedi Info
            </PublicButton>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
};

export default HomePageElementMedica;
