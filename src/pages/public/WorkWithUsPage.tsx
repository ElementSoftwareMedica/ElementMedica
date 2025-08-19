import React from 'react';
import { PublicLayout } from '../../components/public/PublicLayout';
import { ContactForm } from '../../components/public/ContactForm';
import { PublicButton } from '../../components/public/PublicButton';
import { 
  Award, 
  TrendingUp, 
  Heart, 
  Clock, 
  MapPin,
  Mail,
  Phone,
  Briefcase,
  Target,
  GraduationCap
} from 'lucide-react';

/**
 * Pagina "Lavora con Noi" - Opportunità di carriera e candidature
 */
const WorkWithUsPage: React.FC = () => {
  const benefits = [
    {
      icon: TrendingUp,
      title: 'Crescita Professionale',
      description: 'Opportunità di sviluppo e formazione continua nel settore della sicurezza sul lavoro'
    },
    {
      icon: Heart,
      title: 'Ambiente Stimolante',
      description: 'Team giovane e dinamico con focus sul benessere e la soddisfazione lavorativa'
    },
    {
      icon: Award,
      title: 'Riconoscimenti',
      description: 'Sistema di incentivi e riconoscimenti basato sui risultati e sul merito'
    },
    {
      icon: Clock,
      title: 'Flessibilità',
      description: 'Orari flessibili e possibilità di smart working per un migliore work-life balance'
    }
  ];

  const openPositions = [
    {
      title: 'Formatore Sicurezza sul Lavoro',
      department: 'Formazione',
      type: 'Full-time',
      location: 'Milano + Trasferte',
      description: 'Cerchiamo un formatore esperto per tenere corsi di sicurezza sul lavoro presso aziende clienti.',
      requirements: [
        'Laurea in Ingegneria o discipline tecniche',
        'Esperienza minima 3 anni nel settore sicurezza',
        'Abilitazione come formatore per la sicurezza',
        'Ottime capacità comunicative e di public speaking',
        'Disponibilità a trasferte'
      ]
    },
    {
      title: 'Consulente RSPP',
      department: 'Consulenza',
      type: 'Full-time',
      location: 'Milano',
      description: 'Ricerchiamo un consulente per servizi di RSPP esterno presso aziende di vari settori.',
      requirements: [
        'Laurea in Ingegneria o Architettura',
        'Abilitazione RSPP per tutti i macrosettori',
        'Esperienza minima 5 anni in consulenza aziendale',
        'Conoscenza normativa D.Lgs. 81/08',
        'Capacità di gestione clienti'
      ]
    },
    {
      title: 'Coordinatore Commerciale',
      department: 'Vendite',
      type: 'Full-time',
      location: 'Milano',
      description: 'Cerchiamo una figura per lo sviluppo commerciale e la gestione del portafoglio clienti.',
      requirements: [
        'Diploma o Laurea in discipline economiche',
        'Esperienza minima 2 anni in ruoli commerciali',
        'Conoscenza del settore sicurezza (preferibile)',
        'Ottime capacità relazionali',
        'Orientamento al risultato'
      ]
    }
  ];

  return (
    <PublicLayout>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 to-indigo-100 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl md:text-6xl">
              Lavora con Noi
            </h1>
            <p className="mt-6 max-w-3xl mx-auto text-xl text-gray-600">
              Unisciti al nostro team di professionisti e contribuisci a rendere 
              i luoghi di lavoro più sicuri. Scopri le opportunità di carriera in Element Formazione.
            </p>
            <div className="mt-8">
              <PublicButton
                variant="primary"
                size="lg"
                onClick={() => document.getElementById('candidatura')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Candidati Ora
              </PublicButton>
            </div>
          </div>
        </div>
      </section>

      {/* Perché Lavorare con Noi */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Perché Scegliere Element Formazione
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Siamo un'azienda in crescita che investe nelle persone e nel loro sviluppo professionale
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {benefits.map((benefit, index) => (
              <div key={index} className="text-center">
                <div className="bg-primary-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <benefit.icon className="w-8 h-8 text-primary-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {benefit.title}
                </h3>
                <p className="text-gray-600">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Posizioni Aperte */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Posizioni Aperte
            </h2>
            <p className="text-xl text-gray-600">
              Scopri le opportunità di lavoro disponibili nel nostro team
            </p>
          </div>

          <div className="space-y-8">
            {openPositions.map((position, index) => (
              <div key={index} className="bg-white rounded-lg shadow-md p-8">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-4">
                      <Briefcase className="w-6 h-6 text-primary-600 mr-3" />
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">
                          {position.title}
                        </h3>
                        <div className="flex items-center text-sm text-gray-600 mt-1">
                          <span className="bg-primary-600 text-white px-2 py-1 rounded-full text-xs font-medium mr-2">
                            {position.department}
                          </span>
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium mr-2">
                            {position.type}
                          </span>
                          <MapPin className="w-4 h-4 mr-1" />
                          <span>{position.location}</span>
                        </div>
                      </div>
                    </div>

                    <p className="text-gray-600 mb-4">
                      {position.description}
                    </p>

                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                        <Target className="w-4 h-4 mr-2" />
                        Requisiti:
                      </h4>
                      <ul className="list-disc list-inside text-gray-600 space-y-1">
                        {position.requirements.map((req, reqIndex) => (
                          <li key={reqIndex}>{req}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="mt-6 lg:mt-0 lg:ml-8">
                    <PublicButton
                      variant="primary"
                      size="md"
                      onClick={() => document.getElementById('candidatura')?.scrollIntoView({ behavior: 'smooth' })}
                    >
                      Candidati
                    </PublicButton>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Processo di Selezione */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Il Nostro Processo di Selezione
            </h2>
            <p className="text-xl text-gray-600">
              Un percorso trasparente e professionale per trovare i migliori talenti
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="bg-primary-600 text-white rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4 text-lg font-bold">
                1
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Candidatura</h3>
              <p className="text-gray-600 text-sm">
                Invia il tuo CV e una lettera di presentazione
              </p>
            </div>

            <div className="text-center">
              <div className="bg-primary-600 text-white rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4 text-lg font-bold">
                  2
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Screening</h3>
              <p className="text-gray-600 text-sm">
                Valutazione del profilo e primo contatto telefonico
              </p>
            </div>

            <div className="text-center">
              <div className="bg-primary-600 text-white rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4 text-lg font-bold">
                  3
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Colloquio</h3>
              <p className="text-gray-600 text-sm">
                Incontro conoscitivo con il team e test tecnici
              </p>
            </div>

            <div className="text-center">
              <div className="bg-primary-600 text-white rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4 text-lg font-bold">
                  4
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Inserimento</h3>
              <p className="text-gray-600 text-sm">
                Onboarding e formazione per il nuovo ruolo
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Form Candidatura */}
      <section id="candidatura" className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            
            {/* Info Contatto */}
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-8">
                Invia la Tua Candidatura
              </h2>
              
              <div className="space-y-6">
                <p className="text-lg text-gray-600">
                  Sei interessato a lavorare con noi? Compila il form di candidatura 
                  o contattaci direttamente per maggiori informazioni.
                </p>

                <div className="space-y-4">
                  <div className="flex items-center">
                    <div className="bg-primary-100 rounded-lg p-3 mr-4">
                      <Mail className="w-6 h-6 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Email HR</h3>
                      <p className="text-gray-600">
                        <a href="mailto:hr@elementformazione.it" className="hover:text-primary-600 transition-colors">
                          hr@elementformazione.it
                        </a>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <div className="bg-blue-100 rounded-lg p-3 mr-4">
                      <Phone className="w-6 h-6 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Telefono</h3>
                      <p className="text-gray-600">
                        <a href="tel:+390212345678" className="hover:text-primary-600 transition-colors">
                          +39 02 1234 5678
                        </a>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <div className="bg-blue-100 rounded-lg p-3 mr-4">
                      <GraduationCap className="w-6 h-6 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Candidature Spontanee</h3>
                      <p className="text-gray-600">
                        Anche se non trovi la posizione adatta, inviaci il tuo CV!
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Form Candidatura */}
            <div>
              <ContactForm
                title="Candidatura"
                variant="default"
                showCompanyField={false}
                showPhoneField={true}
                showSubjectField={true}
                subjects={[
                  { value: 'formatore', label: 'Formatore Sicurezza sul Lavoro' },
                  { value: 'rspp', label: 'Consulente RSPP' },
                  { value: 'commerciale', label: 'Coordinatore Commerciale' },
                  { value: 'spontanea', label: 'Candidatura Spontanea' },
                  { value: 'stage', label: 'Stage/Tirocinio' }
                ]}
                onSubmit={(data) => {
                  console.log('Candidatura data:', data);
                  alert('Grazie per la tua candidatura! Ti contatteremo presto per valutare il tuo profilo.');
                }}
              />
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
};

export default WorkWithUsPage;