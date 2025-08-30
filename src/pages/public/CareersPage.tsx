import React, { useState } from 'react';
import { PublicLayout } from '../../components/public/PublicLayout';
import { PublicButton } from '../../components/public/PublicButton';

const CareersPage: React.FC = () => {
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);
  const [applicationForm, setApplicationForm] = useState({
    name: '',
    email: '',
    phone: '',
    position: '',
    experience: '',
    motivation: '',
    cv: null as File | null
  });

  const openPositions = [
    {
      id: 1,
      title: 'RSPP - Responsabile Servizio Prevenzione e Protezione',
      location: 'Milano',
      type: 'Full-time',
      experience: '3+ anni',
      description: 'Cerchiamo un RSPP qualificato per ampliare il nostro team di consulenti.',
      requirements: [
        'Laurea in Ingegneria o titolo equipollente',
        'Abilitazione RSPP per tutti i macrosettori',
        'Esperienza minima 3 anni nel settore',
        'Conoscenza approfondita D.Lgs. 81/08',
        'Capacità di gestione clienti',
        'Disponibilità a trasferte'
      ],
      responsibilities: [
        'Elaborazione DVR e documenti di sicurezza',
        'Sopralluoghi aziendali e valutazioni rischi',
        'Consulenza tecnica ai clienti',
        'Formazione del personale aziendale',
        'Supporto nella gestione emergenze'
      ]
    },
    {
      id: 2,
      title: 'Medico del Lavoro',
      location: 'Milano / Lombardia',
      type: 'Collaborazione',
      experience: '2+ anni',
      description: 'Ricerchiamo medico del lavoro per sorveglianza sanitaria presso aziende clienti.',
      requirements: [
        'Laurea in Medicina e Chirurgia',
        'Specializzazione in Medicina del Lavoro',
        'Iscrizione all\'Ordine dei Medici',
        'Esperienza in sorveglianza sanitaria',
        'Conoscenza normativa di settore',
        'Automunito'
      ],
      responsibilities: [
        'Visite mediche preventive e periodiche',
        'Elaborazione protocolli sanitari',
        'Sopralluoghi negli ambienti di lavoro',
        'Giudizi di idoneità lavorativa',
        'Collaborazione con RSPP'
      ]
    },
    {
      id: 3,
      title: 'Formatore Sicurezza sul Lavoro',
      location: 'Milano e provincia',
      type: 'Collaborazione',
      experience: '2+ anni',
      description: 'Cerchiamo formatori qualificati per corsi di sicurezza sul lavoro.',
      requirements: [
        'Qualifica di formatore secondo Decreto Interministeriale 6/3/2013',
        'Esperienza nella formazione aziendale',
        'Competenze in sicurezza sul lavoro',
        'Capacità comunicative e didattiche',
        'Flessibilità oraria',
        'Disponibilità a trasferte'
      ],
      responsibilities: [
        'Erogazione corsi di formazione generale e specifica',
        'Formazione preposti e dirigenti',
        'Corsi di aggiornamento',
        'Preparazione materiale didattico',
        'Valutazione apprendimento'
      ]
    },
    {
      id: 4,
      title: 'Consulente Junior Sicurezza',
      location: 'Milano',
      type: 'Stage/Tirocinio',
      experience: 'Neolaureato',
      description: 'Opportunità di crescita per neolaureati interessati alla sicurezza sul lavoro.',
      requirements: [
        'Laurea in Ingegneria, Architettura o discipline tecniche',
        'Interesse per la sicurezza sul lavoro',
        'Buone capacità relazionali',
        'Conoscenza base normativa 81/08',
        'Pacchetto Office',
        'Patente B'
      ],
      responsibilities: [
        'Supporto nella redazione DVR',
        'Partecipazione a sopralluoghi',
        'Assistenza nella formazione',
        'Gestione documentazione',
        'Supporto amministrativo'
      ]
    }
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setApplicationForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setApplicationForm(prev => ({
      ...prev,
      cv: file
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implementare invio candidatura
    console.log('Application data:', applicationForm);
    alert('Candidatura inviata con successo! Ti contatteremo presto.');
  };

  return (
    <PublicLayout>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-50 to-primary-100 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl md:text-6xl">
              Lavora con Noi
            </h1>
            <p className="mt-6 max-w-3xl mx-auto text-xl text-gray-600">
              Unisciti al nostro team di professionisti della sicurezza sul lavoro. 
              Cresci con noi in un ambiente stimolante e all'avanguardia.
            </p>
          </div>
        </div>
      </section>

      {/* Why Work With Us */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Perché Lavorare con Element Formazione
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Offriamo un ambiente di lavoro dinamico, opportunità di crescita e la possibilità 
              di fare la differenza nel campo della sicurezza sul lavoro
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="bg-primary-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🚀</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Crescita Professionale</h3>
              <p className="text-gray-600">Opportunità di formazione continua e sviluppo delle competenze</p>
            </div>

            <div className="text-center p-6">
              <div className="bg-primary-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">👥</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Team Affiatato</h3>
              <p className="text-gray-600">Lavora in un ambiente collaborativo con professionisti esperti</p>
            </div>

            <div className="text-center p-6">
              <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">⚖️</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Work-Life Balance</h3>
              <p className="text-gray-600">Orari flessibili e attenzione al benessere dei dipendenti</p>
            </div>

            <div className="text-center p-6">
              <div className="bg-primary-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">💡</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Innovazione</h3>
              <p className="text-gray-600">Utilizziamo tecnologie all'avanguardia e metodologie innovative</p>
            </div>

            <div className="text-center p-6">
              <div className="bg-primary-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🎯</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Progetti Stimolanti</h3>
              <p className="text-gray-600">Lavora su progetti diversificati con aziende di vari settori</p>
            </div>

            <div className="text-center p-6">
              <div className="bg-primary-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">💰</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Retribuzione Competitiva</h3>
              <p className="text-gray-600">Pacchetti retributivi allineati al mercato con benefit aggiuntivi</p>
            </div>
          </div>
        </div>
      </section>

      {/* Open Positions */}
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

          <div className="space-y-6">
            {openPositions.map((position) => (
              <div
                key={position.id}
                className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8"
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">
                      {position.title}
                    </h3>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                      <span className="flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        </svg>
                        {position.location}
                      </span>
                      <span className="flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {position.type}
                      </span>
                      <span className="flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {position.experience}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 lg:mt-0">
                    <PublicButton
                      variant={selectedPosition === position.id.toString() ? "primary" : "outline"}
                      onClick={() => setSelectedPosition(
                        selectedPosition === position.id.toString() ? null : position.id.toString()
                      )}
                    >
                      {selectedPosition === position.id.toString() ? "Chiudi Dettagli" : "Vedi Dettagli"}
                    </PublicButton>
                  </div>
                </div>

                <p className="text-gray-600 mb-4">{position.description}</p>

                {selectedPosition === position.id.toString() && (
                  <div className="border-t pt-6 mt-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900 mb-4">Requisiti</h4>
                        <ul className="space-y-2">
                          {position.requirements.map((req, index) => (
                            <li key={index} className="flex items-start text-sm text-gray-600">
                              <svg className="w-4 h-4 text-primary-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              {req}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900 mb-4">Responsabilità</h4>
                        <ul className="space-y-2">
                          {position.responsibilities.map((resp, index) => (
                            <li key={index} className="flex items-start text-sm text-gray-600">
                              <svg className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              {resp}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    <div className="mt-6 pt-6 border-t">
                      <PublicButton
                        onClick={() => {
                          setApplicationForm(prev => ({ ...prev, position: position.title }));
                          document.getElementById('application-form')?.scrollIntoView({ behavior: 'smooth' });
                        }}
                      >
                        Candidati per questa posizione
                      </PublicButton>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Application Form */}
      <section id="application-form" className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Invia la tua Candidatura
            </h2>
            <p className="text-xl text-gray-600">
              Compila il form sottostante per candidarti alle nostre posizioni aperte
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Nome e Cognome *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  value={applicationForm.name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Il tuo nome completo"
                />
              </div>
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  value={applicationForm.email}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="la-tua-email@esempio.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                  Telefono *
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  required
                  value={applicationForm.phone}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="+39 123 456 7890"
                />
              </div>
              
              <div>
                <label htmlFor="position" className="block text-sm font-medium text-gray-700 mb-2">
                  Posizione di Interesse *
                </label>
                <select
                  id="position"
                  name="position"
                  required
                  value={applicationForm.position}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Seleziona una posizione</option>
                  {openPositions.map((position) => (
                    <option key={position.id} value={position.title}>
                      {position.title}
                    </option>
                  ))}
                  <option value="candidatura-spontanea">Candidatura Spontanea</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="experience" className="block text-sm font-medium text-gray-700 mb-2">
                Esperienza Professionale *
              </label>
              <textarea
                id="experience"
                name="experience"
                required
                rows={4}
                value={applicationForm.experience}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Descrivi brevemente la tua esperienza professionale nel settore..."
              />
            </div>

            <div>
              <label htmlFor="motivation" className="block text-sm font-medium text-gray-700 mb-2">
                Lettera di Motivazione *
              </label>
              <textarea
                id="motivation"
                name="motivation"
                required
                rows={4}
                value={applicationForm.motivation}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Spiega perché vorresti lavorare con noi e cosa puoi portare al nostro team..."
              />
            </div>

            <div>
              <label htmlFor="cv" className="block text-sm font-medium text-gray-700 mb-2">
                Curriculum Vitae *
              </label>
              <input
                type="file"
                id="cv"
                name="cv"
                required
                accept=".pdf,.doc,.docx"
                onChange={handleFileChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-sm text-gray-500 mt-1">
                Formati accettati: PDF, DOC, DOCX (max 5MB)
              </p>
            </div>

            <div className="flex items-start">
              <input
                type="checkbox"
                id="privacy-careers"
                required
                className="mt-1 mr-3 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="privacy-careers" className="text-sm text-gray-600">
                Accetto il trattamento dei dati personali secondo la{' '}
                <a href="#" className="text-primary-600 hover:text-primary-700 underline">
                  Privacy Policy
                </a>{' '}
                e autorizzo l'utilizzo del CV per processi di selezione. *
              </label>
            </div>

            <PublicButton type="submit" size="lg" className="w-full">
              Invia Candidatura
            </PublicButton>
          </form>
        </div>
      </section>
    </PublicLayout>
  );
};

export default CareersPage;