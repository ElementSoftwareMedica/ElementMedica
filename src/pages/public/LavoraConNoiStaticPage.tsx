/**
 * LavoraConNoiStaticPage
 *
 * Pagina "Lavora con Noi" STATICA brand-aware.
 * Sicurezza: formatori, RSPP, consulenti HSE.
 * Medica: medici, infermieri, personale sanitario.
 * NON usa CMS API — contenuto hardcoded per SEO perfetto.
 */

import React, { useState } from 'react';
import {
    Users, MapPin, Clock, ArrowRight,
    CheckCircle, Briefcase, Heart, Star,
    GraduationCap, Send, Phone, Mail,
    Stethoscope, Shield, BookOpen, Award,
    ChevronDown,
} from 'lucide-react';
import { PublicLayout } from '../../components/public/PublicLayout';
import { HeroSection } from '../../components/public/HeroSection';
import SEOHead from '../../components/seo/SEOHead';
import { ContactForm } from '../../components/public/ContactForm';

const brandId = import.meta.env.VITE_BRAND_ID || 'element-sicurezza';
const isMedica = brandId === 'element-medica';

// ─────────────────────────────────────────────────────────────────
// VERSIONE ELEMENT SICUREZZA
// ─────────────────────────────────────────────────────────────────

const LavoraConNoiSicurezza: React.FC = () => {
    const [openFaq, setOpenFaq] = useState<number | null>(null);

    const openPositions = [
        {
            title: 'Formatore Sicurezza sul Lavoro',
            type: 'Collaborazione / P.IVA',
            location: 'Veneto (Padova e provincia)',
            description: 'Erogazione di corsi di formazione obbligatoria in materia di sicurezza sul lavoro (D.Lgs 81/08): primo soccorso, antincendio, sicurezza generale, corsi per RLS, dirigenti, preposti.',
            requirements: [
                'Iscrizione all\'albo dei formatori sicurezza (MdI/MLPS) o equipollente',
                'Esperienza documentata in formazione sicurezza aziendale',
                'Conoscenza del D.Lgs 81/08, Accordo Stato-Regioni 2011/2012',
                'Ottime capacità comunicative e didattiche',
                'Disponibilità a trasferte in provincia di Padova e Veneto',
            ],
            preferred: [
                'Specializzazione in antincendio (almeno livello 4 ore)',
                'Abilitazione decreto interministeriale 3/9/2021',
                'Esperienza con piattaforme e-learning',
            ],
            color: 'blue',
            icon: GraduationCap,
            tag: 'Aperta',
        },
        {
            title: 'RSPP / Consulente HSE',
            type: 'Collaborazione / P.IVA',
            location: 'Padova e Provincia',
            description: 'Svolgimento di attività di Responsabile del Servizio di Prevenzione e Protezione (RSPP) in outsourcing per PMI del Veneto: redazione DVR, aggiornamento protocolli, sopralluoghi, gestione documentazione 81/08.',
            requirements: [
                'Attestato RSPP moduli A-B-C o laurea in Ingegneria/Scienze della Sicurezza',
                'Esperienza minima 2 anni in ruolo RSPP esterno o HSE Manager',
                'Conoscenza approfondita D.Lgs 81/08 e normativa antincendio',
                'Capacità di redazione e aggiornamento DVR/DUVRI',
                'Autonomia organizzativa e gestione portfolio clienti',
            ],
            preferred: [
                'Certificazione CPT o INAIL per RSPP',
                'Esperienza in settori: manifatturiero, edilizia, logistica',
                'Conoscenza software gestione sicurezza',
            ],
            color: 'green',
            icon: Shield,
            tag: 'Aperta',
        },
        {
            title: 'Consulente Commerciale – Sicurezza Aziendale',
            type: 'Agente / Collaborazione',
            location: 'Veneto',
            description: 'Sviluppo del portafoglio clienti aziendale nel settore sicurezza sul lavoro: presentazione e vendita di pacchetti formativi, RSPP esterno e medicina del lavoro. Commissioni su portfolio clienti generato.',
            requirements: [
                'Esperienza in vendita B2B (preferibilmente in ambito HR, consulenza o sicurezza)',
                'Ottima capacità relazionale e di negoziazione',
                'Autonomia nella gestione del territorio',
                'Possesso di Partita IVA o disponibilità ad aprirla',
            ],
            preferred: [
                'Conoscenza del tessuto produttivo veneto (PMI manifatturiere)',
                'Portfolio clienti esistente nel settore',
            ],
            color: 'orange',
            icon: Briefcase,
            tag: 'Aperta',
        },
        {
            title: 'Medico Competente (collaboratore)',
            type: 'Libero professionista',
            location: 'Padova e Provincia',
            description: 'Svolgimento di attività di medico competente (art. 38 D.Lgs 81/08) per aziende clienti di Element Sicurezza in provincia di Padova e Veneto. Gestione del protocollo sanitario e visite mediche aziendali.',
            requirements: [
                'Specializzazione in Medicina del Lavoro (o equipollente)',
                'Titolo abilitante ex art. 38 D.Lgs 81/08',
                'Iscrizione all\'Ordine dei Medici',
                'Autonomia nella gestione del portfolio clienti',
            ],
            preferred: [
                'Esperienza con industria manifatturiera/logistica',
                'Disponibilità a integrare la gestione digitale (piattaforma Element)',
            ],
            color: 'red',
            icon: Heart,
            tag: 'Aperta',
        },
    ];

    const benefits = [
        { icon: Clock, title: 'Flessibilità', desc: 'Collaborazione autonoma: tu scegli i tuoi orari e gestisci il tuo calendario.' },
        { icon: MapPin, title: 'Veneto', desc: 'Attività prevalentemente in provincia di Padova e Veneto. Zero pendolarismo a lungo raggio.' },
        { icon: Star, title: 'Crescita professionale', desc: 'Portfolio clienti in espansione e possibilità di incrementare il volume di lavoro.' },
        { icon: Users, title: 'Team di supporto', desc: 'Supporto amministrativo e commerciale dedicato. Tu ti concentri sull\'erogazione.' },
        { icon: Award, title: 'Pagamenti puntuali', desc: 'Rendicontazione mensile e pagamento puntuale. Nessuna attesa.' },
        { icon: BookOpen, title: 'Aggiornamenti inclusi', desc: 'Accesso gratuito ai nostri corsi di aggiornamento per formatori e consulenti.' },
    ];

    const faqs = [
        { q: 'Posso collaborare con Element Sicurezza avendo già altri clienti?', a: 'Assolutamente sì. Collaboriamo in esclusiva territoriale (per alcuni ruoli) o in modo non esclusivo. La collaborazione è sempre strutturata come libera professione P.IVA, quindi sei libero di avere altri clienti salvo accordi specifici.' },
        { q: 'Come funziona la rendicontazione del lavoro?', a: 'Utilizziamo una piattaforma digitale dove carichi gli interventi completati (formazione erogata, sopralluoghi, visite MC). A fine mese viene generato automaticamente il report per la fatturazione. Pagamento entro 30 giorni dalla fattura.' },
        { q: 'Quante ore/mese richiede la collaborazione come formatore?', a: 'Dipende dalla tua disponibilità e dal territorio. Mediamente un formatore attivo gestisce tra le 20 e le 60 ore di aula mensili. Puoi accettare o declinare le singole commesse in base agli impegni.' },
        { q: 'Element Sicurezza fornisce il materiale didattico?', a: 'Sì. Forniamo tutto il materiale didattico (slide, attestati, registro presenze) già strutturato e conforme alla normativa vigente. Ti occupi solo dell\'erogazione.' },
        { q: 'Come faccio a candidarmi?', a: 'Compila il form sottostante selezionando il ruolo di interesse, allegando il tuo CV. Ti contatteremo entro 5 giorni lavorativi per un primo incontro conoscitivo (anche online).' },
    ];

    return (
        <PublicLayout>
            <SEOHead
                title="Lavora con Noi | Element Sicurezza – Formatori, RSPP, Consulenti HSE"
                description="Collabora con Element Sicurezza: selezioniamo formatori sicurezza sul lavoro, RSPP esterni, medici del lavoro e consulenti HSE in Veneto. Invia la tua candidatura."
                keywords={['formatore sicurezza lavoro', 'RSPP esterno Padova', 'lavoro sicurezza aziendale', 'formatore D.Lgs 81/08', 'collaborazione Element Sicurezza']}
                canonicalUrl="https://www.elementsicurezza.com/lavora-con-noi"
                ogType="website"
            />

            <HeroSection
                title={<>Lavora con<br /><span style={{ color: 'var(--color-primary-300)' }}>Element Sicurezza</span></>}
                subtitle="Opportunità di Collaborazione – Veneto"
                description="Siamo alla ricerca di formatori, consulenti RSPP, medici del lavoro e professionisti HSE per espandere la nostra rete nel Veneto. Collaborazione autonoma, pagamenti puntuali, portfolio clienti in crescita."
                backgroundVariant="gradient"
                backgroundPattern="diagonal-lines"
                primaryButton={{ text: 'Vedi le Posizioni Aperte', href: '#posizioni', icon: <ArrowRight className="w-5 h-5" /> }}
                secondaryButton={{ text: 'Candidatura Spontanea', href: '#contatto' }}
                stats={[
                    { value: '500+', label: 'Aziende Clienti', icon: <Briefcase className="w-5 h-5" /> },
                    { value: '4', label: 'Posizioni Aperte', icon: <Users className="w-5 h-5" />, highlight: true },
                    { value: 'Veneto', label: 'Area operativa', icon: <MapPin className="w-5 h-5" /> },
                    { value: 'P.IVA', label: 'Collaborazione', icon: <CheckCircle className="w-5 h-5" /> },
                ]}
                showTrustBadges
            />

            {/* PERCHÉ ELEMENT SICUREZZA */}
            <section className="py-16 bg-white">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-gray-900 mb-3">Perché Collaborare con Noi</h2>
                        <p className="text-gray-600 max-w-2xl mx-auto">Siamo una realtà in crescita nel Veneto con oltre 500 aziende clienti. Offriamo collaborazione professionale, strumenti digitali e supporto continuo.</p>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {benefits.map((b, i) => (
                            <div key={i} className="flex gap-4 p-6 bg-gray-50 rounded-2xl border border-gray-100 hover:shadow-md transition-all">
                                <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0">
                                    <b.icon className="w-6 h-6 text-primary-700" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 mb-1">{b.title}</h3>
                                    <p className="text-sm text-gray-600">{b.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* POSIZIONI APERTE */}
            <section id="posizioni" className="py-16 bg-gray-50">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-gray-900 mb-3">Posizioni Aperte</h2>
                        <p className="text-gray-600 max-w-2xl mx-auto">Collaborazione professionale P.IVA in Veneto</p>
                    </div>
                    <div className="space-y-6 max-w-4xl mx-auto">
                        {openPositions.map((pos, i) => (
                            <div key={i} className={`bg-white border-2 border-${pos.color}-200 rounded-2xl p-6 hover:shadow-md transition-all`}>
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-start gap-3">
                                        <div className={`w-12 h-12 rounded-xl bg-${pos.color}-100 flex items-center justify-center flex-shrink-0`}>
                                            <pos.icon className={`w-6 h-6 text-${pos.color}-700`} />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-gray-900">{pos.title}</h3>
                                            <div className="flex flex-wrap gap-2 mt-1">
                                                <span className={`text-xs bg-${pos.color}-100 text-${pos.color}-700 px-2 py-0.5 rounded-full font-medium`}>{pos.type}</span>
                                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full flex items-center gap-1"><MapPin className="w-3 h-3" />{pos.location}</span>
                                                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">{pos.tag}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <p className="text-gray-700 text-sm mb-4 leading-relaxed">{pos.description}</p>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div>
                                        <h4 className="font-semibold text-gray-800 text-sm mb-2">Requisiti richiesti</h4>
                                        <ul className="space-y-1">
                                            {pos.requirements.map((req, j) => (
                                                <li key={j} className="flex items-start gap-2 text-sm text-gray-600">
                                                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                                                    {req}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-800 text-sm mb-2">Preferenziali</h4>
                                        <ul className="space-y-1">
                                            {pos.preferred.map((p, j) => (
                                                <li key={j} className="flex items-start gap-2 text-sm text-gray-500">
                                                    <Star className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                                                    {p}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                                <div className="mt-4 pt-4 border-t border-gray-100">
                                    <a href="#contatto" className={`inline-flex items-center gap-2 bg-${pos.color}-600 hover:bg-${pos.color}-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors`}>
                                        <Send className="w-4 h-4" /> Candidati per questo ruolo
                                    </a>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* FAQ */}
            <section className="py-16 bg-white">
                <div className="container mx-auto px-4 max-w-3xl">
                    <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Domande Frequenti</h2>
                    <div className="space-y-3">
                        {faqs.map((faq, i) => (
                            <div key={i} className="border border-gray-200 rounded-xl overflow-hidden">
                                <button
                                    className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 transition-colors"
                                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                >
                                    <span className="font-medium text-gray-900 pr-4">{faq.q}</span>
                                    <ChevronDown className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                                </button>
                                {openFaq === i && (
                                    <div className="px-5 pb-5 text-gray-700 text-sm leading-relaxed">{faq.a}</div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* FORM CANDIDATURA */}
            <section id="contatto" className="py-16" style={{ background: 'linear-gradient(135deg, #283646 0%, #1d2f40 100%)' }}>
                <div className="container mx-auto px-4">
                    <div className="grid lg:grid-cols-2 gap-12 items-start max-w-5xl mx-auto">
                        <div className="text-white">
                            <h2 className="text-3xl font-bold mb-4">Invia la tua Candidatura</h2>
                            <p className="text-white/90 mb-6">Anche se non hai trovato il profilo che cerchi, accettiamo candidature spontanee da professionisti del settore sicurezza, formazione e medicina del lavoro.</p>
                            <div className="space-y-3">
                                {[
                                    { icon: Clock, text: 'Risposta entro 5 giorni lavorativi' },
                                    { icon: Phone, text: 'Primo colloquio anche in videocall' },
                                    { icon: CheckCircle, text: 'Processo di selezione trasparente' },
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <item.icon className="w-5 h-5 text-primary-300 flex-shrink-0" />
                                        <span className="text-white/95">{item.text}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-6 p-4 bg-white/10 rounded-xl">
                                <p className="text-white/80 text-sm">Puoi anche inviare il CV direttamente a:<br />
                                    <a href="mailto:lavoro@elementsicurezza.com" className="text-white font-semibold underline">lavoro@elementsicurezza.com</a>
                                </p>
                            </div>
                        </div>
                        <div className="bg-white rounded-2xl p-8 shadow-xl">
                            <h3 className="text-xl font-bold text-gray-900 mb-6">Candidatura</h3>
                            <ContactForm
                                variant="compact"
                                subjects={[
                                    { value: 'formatore', label: 'Formatore sicurezza' },
                                    { value: 'rspp', label: 'RSPP / Consulente HSE' },
                                    { value: 'commerciale', label: 'Consulente commerciale' },
                                    { value: 'medico', label: 'Medico competente' },
                                    { value: 'spontanea', label: 'Candidatura spontanea' },
                                    { value: 'altro', label: 'Altro ruolo' },
                                ]}
                            />
                        </div>
                    </div>
                </div>
            </section>
        </PublicLayout>
    );
};

// ─────────────────────────────────────────────────────────────────
// VERSIONE ELEMENT MEDICA
// ─────────────────────────────────────────────────────────────────

const LavoraConNoiMedica: React.FC = () => {
    const [openFaq, setOpenFaq] = useState<number | null>(null);

    const openPositions = [
        {
            title: 'Medico Specialista (varie specialità)',
            type: 'Libero professionista / dipendente',
            location: 'Selvazzano Dentro (PD)',
            description: 'Visite specialistiche ambulatoriali presso il Poliambulatorio Element Medica a Selvazzano Dentro. Cerchiamo medici specialisti per ampliare le specialità disponibili ai nostri pazienti.',
            requirements: [
                'Laurea in Medicina e Chirurgia con specializzazione',
                'Iscrizione all\'Ordine dei Medici attiva',
                'Disponibilità a svolgere almeno 4-8 ore settimanali in sede',
                'Orientamento al paziente e attenzione alla qualità clinica',
            ],
            specialties: ['Medicina del Lavoro', 'Cardiologia', 'Ortopedia', 'Pneumologia', 'Oculistica', 'Neurologia', 'Ginecologia', 'Dermatologia', 'Psichiatria / Psicologia'],
            preferred: [
                'Esperienza in ambito ambulatoriale privato/convenzionato',
                'Utilizzo cartella clinica digitale',
            ],
            color: 'teal',
            icon: Stethoscope,
            tag: 'Aperta',
        },
        {
            title: 'Medico Competente Aziendale',
            type: 'Libero professionista',
            location: 'Padova e Provincia',
            description: 'Svolgimento dell\'attività di medico competente (art. 38 D.Lgs 81/08) per le aziende clienti del gruppo Element Sicurezza/Element Medica in Veneto.',
            requirements: [
                'Specializzazione in Medicina del Lavoro (o equipollente D.Lgs 81/08 art. 38)',
                'Iscrizione all\'Ordine dei Medici',
                'Autonomia nella gestione del portfolio clienti aziendale',
                'Disponibilità a visite in sede e in loco presso aziende clienti',
            ],
            preferred: [
                'Esperienza con industria manifatturiera, logistica, edilizia',
                'Conoscenza software gestione sorveglianza sanitaria digitale',
            ],
            color: 'blue',
            icon: Shield,
            tag: 'Aperta',
        },
        {
            title: 'Infermiere / Tecnico Sanitario',
            type: 'Collaborazione / dipendente part-time',
            location: 'Selvazzano Dentro (PD)',
            description: 'Supporto alle attività ambulatoriali del poliambulatorio: accoglienza pazienti, assistenza alle visite, prelievi, ECG, audiometria, spirometria, gestione della documentazione clinica digitale.',
            requirements: [
                'Laurea triennale in Infermieristica o diploma di tecnico sanitario',
                'Iscrizione all\'Ordine delle Professioni Infermieristiche (OPI)',
                'Esperienza in contesto ambulatoriale o ospedaliero',
                'Dimestichezza con sistemi informatici sanitari',
            ],
            preferred: [
                'Esperienza con audiometria e spirometria occupazionale',
                'Conoscenza ECG di base',
            ],
            color: 'green',
            icon: Heart,
            tag: 'Aperta',
        },
        {
            title: 'Receptionist / Operatore Front Office',
            type: 'Dipendente / Collaborazione',
            location: 'Selvazzano Dentro (PD)',
            description: 'Gestione delle prenotazioni, accoglienza pazienti, cassa e fatturazione elettronica, coordinamento agenda medici. Punto di riferimento per i pazienti del poliambulatorio.',
            requirements: [
                'Diploma di scuola superiore (preferibilmente indirizzo amministrativo/turistico)',
                'Ottime capacità relazionali e attitudine al servizio al cliente',
                'Buona conoscenza dei principali strumenti informatici (Office, gestionale)',
                'Precisione, puntualità e capacità di multitasking',
            ],
            preferred: [
                'Esperienza in receptionist o front office in ambito sanitario',
                'Conoscenza di inglese base',
                'Disponibilità a lavorare il sabato mattina',
            ],
            color: 'orange',
            icon: Users,
            tag: 'Aperta',
        },
    ];

    const benefits = [
        { icon: MapPin, title: 'Selvazzano Dentro', desc: 'Struttura moderna a 10 minuti da Padova, ottimi collegamenti, parcheggio gratuito.' },
        { icon: Clock, title: 'Orari flessibili', desc: 'Struttura aperta Lun-Ven 8-19:30 e Sab 8-13. Gestione condivisa dei turni.' },
        { icon: Star, title: 'Ambiente professionale', desc: 'Attrezzature diagnostiche moderne, software clinico avanzato, team affiatato.' },
        { icon: GraduationCap, title: 'Aggiornamento continuo', desc: 'Supporto per ECM e formazione continua. Accesso alle nostre piattaforme formative.' },
        { icon: Award, title: 'Opportunità di crescita', desc: 'Struttura in espansione con apertura di nuove specialità. Cresce il team, cresce la tua opportunità.' },
        { icon: Heart, title: 'Missione condivisa', desc: 'Lavoriamo per la salute delle persone e delle aziende. Valore reale, ogni giorno.' },
    ];

    const faqs = [
        { q: 'Posso lavorare come libero professionista mantenendo altri incarichi?', a: 'Assolutamente sì. Molti dei nostri medici specialisti collaborano come liberi professionisti P.IVA mantenendo altri incarichi. Definiamo insieme orari e disponibilità compatibili.' },
        { q: 'Come vengono gestite le prenotazioni dei pazienti?', a: 'Utilizziamo una piattaforma di gestione clinica digitale che include l\'agenda online. La reception gestisce le prenotazioni e ti avvisa delle visite. Tu ti concentri sull\'attività clinica.' },
        { q: 'La struttura è attrezzata per eseguire esami diagnostici?', a: 'Sì. Il poliambulatorio è dotato di ECG, audiometro in cabina silente, spirometro, sala visita attrezzata. Disponibile anche collegamento per refertazione remota.' },
        { q: 'Qual è la procedura di candidatura?', a: 'Compila il form sottostante con il tuo CV e la specializzazione/ruolo di interesse. Ti contatteremo entro 5 giorni per un colloquio conoscitivo (anche videocall). Il processo selezione è trasparente e rapido.' },
        { q: 'Il poliambulatorio è convenzionato con il SSN?', a: 'Attualmente siamo prevalentemente privati. Alcune prestazioni sono in regime di mutua o convenzionate con fondi sanitari integrativi. Per i medici competenti aziendale l\'attività è interamente in ambito privato B2B.' },
    ];

    return (
        <PublicLayout>
            <SEOHead
                title="Lavora con Noi | Element Medica – Medici, Infermieri, Personale Sanitario"
                description="Opportunità di lavoro al Poliambulatorio Element Medica a Selvazzano Dentro (Padova): medici specialisti, infermieri, personale sanitario. Invia la tua candidatura."
                keywords={['lavoro medico Padova', 'lavoro infermiere Padova', 'poliambulatorio Element Medica', 'medico specialista Selvazzano', 'lavoro sanitario Padova', 'medico competente Padova']}
                canonicalUrl="https://www.elementmedica.com/lavora-con-noi"
                ogType="website"
            />

            <HeroSection
                title={<>Lavora con<br /><span style={{ color: 'var(--color-primary-300)' }}>Element Medica</span></>}
                subtitle="Opportunità in Ambito Sanitario – Selvazzano Dentro (PD)"
                description="Siamo in crescita e cerchiamo medici specialisti, medici competenti, infermieri e personale sanitario per il nostro poliambulatorio a Selvazzano Dentro, a 10 minuti da Padova."
                backgroundVariant="medical-teal"
                primaryButton={{ text: 'Vedi le Posizioni Aperte', href: '#posizioni', icon: <ArrowRight className="w-5 h-5" /> }}
                secondaryButton={{ text: 'Candidatura Spontanea', href: '#contatto' }}
                stats={[
                    { value: '30+', label: 'Specialità', icon: <Stethoscope className="w-5 h-5" /> },
                    { value: '4', label: 'Posizioni Aperte', icon: <Users className="w-5 h-5" />, highlight: true },
                    { value: '10 min', label: 'da Padova', icon: <MapPin className="w-5 h-5" /> },
                    { value: 'Lun-Sab', label: 'Apertura', icon: <Clock className="w-5 h-5" /> },
                ]}
                showTrustBadges
                variant="medical"
            />

            {/* PERCHÉ ELEMENT MEDICA */}
            <section className="py-16 bg-white">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-gray-900 mb-3">Perché Scegliere Element Medica</h2>
                        <p className="text-gray-600 max-w-2xl mx-auto">Un poliambulatorio moderno in espansione, con tecnologia digitale avanzata e un team focalizzato sul benessere del paziente.</p>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {benefits.map((b, i) => (
                            <div key={i} className="flex gap-4 p-6 bg-teal-50 rounded-2xl border border-teal-100 hover:shadow-md transition-all">
                                <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center flex-shrink-0">
                                    <b.icon className="w-6 h-6 text-teal-700" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 mb-1">{b.title}</h3>
                                    <p className="text-sm text-gray-600">{b.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* POSIZIONI APERTE */}
            <section id="posizioni" className="py-16 bg-gray-50">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-gray-900 mb-3">Posizioni Aperte</h2>
                        <p className="text-gray-600 max-w-2xl mx-auto">Poliambulatorio Element Medica — Selvazzano Dentro (PD)</p>
                    </div>
                    <div className="space-y-6 max-w-4xl mx-auto">
                        {openPositions.map((pos, i) => (
                            <div key={i} className={`bg-white border-2 border-${pos.color}-200 rounded-2xl p-6 hover:shadow-md transition-all`}>
                                <div className="flex items-start gap-3 mb-4">
                                    <div className={`w-12 h-12 rounded-xl bg-${pos.color}-100 flex items-center justify-center flex-shrink-0`}>
                                        <pos.icon className={`w-6 h-6 text-${pos.color}-700`} />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-xl font-bold text-gray-900">{pos.title}</h3>
                                        <div className="flex flex-wrap gap-2 mt-1">
                                            <span className={`text-xs bg-${pos.color}-100 text-${pos.color}-700 px-2 py-0.5 rounded-full font-medium`}>{pos.type}</span>
                                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full flex items-center gap-1"><MapPin className="w-3 h-3" />{pos.location}</span>
                                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">{pos.tag}</span>
                                        </div>
                                    </div>
                                </div>
                                <p className="text-gray-700 text-sm mb-4 leading-relaxed">{pos.description}</p>
                                {'specialties' in pos && pos.specialties && (
                                    <div className="mb-4">
                                        <h4 className="font-semibold text-gray-800 text-sm mb-2">Specialità ricercate (non esaustivo)</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {pos.specialties.map((s, j) => (
                                                <span key={j} className="text-xs bg-teal-50 text-teal-700 border border-teal-200 px-2 py-1 rounded-lg">{s}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div>
                                        <h4 className="font-semibold text-gray-800 text-sm mb-2">Requisiti richiesti</h4>
                                        <ul className="space-y-1">
                                            {pos.requirements.map((req, j) => (
                                                <li key={j} className="flex items-start gap-2 text-sm text-gray-600">
                                                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                                                    {req}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-800 text-sm mb-2">Preferenziali</h4>
                                        <ul className="space-y-1">
                                            {pos.preferred.map((p, j) => (
                                                <li key={j} className="flex items-start gap-2 text-sm text-gray-500">
                                                    <Star className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                                                    {p}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                                <div className="mt-4 pt-4 border-t border-gray-100">
                                    <a href="#contatto" className={`inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors`}>
                                        <Send className="w-4 h-4" /> Candidati per questo ruolo
                                    </a>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* FAQ */}
            <section className="py-16 bg-white">
                <div className="container mx-auto px-4 max-w-3xl">
                    <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Domande Frequenti</h2>
                    <div className="space-y-3">
                        {faqs.map((faq, i) => (
                            <div key={i} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                                <button
                                    className="w-full flex items-center justify-between p-5 text-left hover:bg-teal-50 transition-colors"
                                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                >
                                    <span className="font-medium text-gray-900 pr-4">{faq.q}</span>
                                    <ChevronDown className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                                </button>
                                {openFaq === i && (
                                    <div className="px-5 pb-5 text-gray-700 text-sm leading-relaxed">{faq.a}</div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* FORM CANDIDATURA */}
            <section id="contatto" className="py-16 bg-teal-700">
                <div className="container mx-auto px-4">
                    <div className="grid lg:grid-cols-2 gap-12 items-start max-w-5xl mx-auto">
                        <div className="text-white">
                            <h2 className="text-3xl font-bold mb-4">Invia la tua Candidatura</h2>
                            <p className="text-white/90 mb-6">Non hai trovato la posizione che cerchi? Accettiamo sempre candidature spontanee da professionisti sanitari motivati.</p>
                            <div className="space-y-3">
                                {[
                                    { icon: Clock, text: 'Risposta entro 5 giorni lavorativi' },
                                    { icon: Phone, text: 'Colloquio conoscitivo anche in videochiamata' },
                                    { icon: CheckCircle, text: 'Processo di selezione diretto e trasparente' },
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <item.icon className="w-5 h-5 text-teal-200 flex-shrink-0" />
                                        <span className="text-white/95">{item.text}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-6 p-4 bg-white/10 rounded-xl">
                                <p className="text-white/80 text-sm">Puoi anche inviare il CV direttamente a:<br />
                                    <a href="mailto:lavoro@elementmedica.com" className="text-white font-semibold underline">lavoro@elementmedica.com</a>
                                </p>
                            </div>
                        </div>
                        <div className="bg-white rounded-2xl p-8 shadow-xl">
                            <h3 className="text-xl font-bold text-gray-900 mb-6">Candidatura</h3>
                            <ContactForm
                                variant="compact"
                                subjects={[
                                    { value: 'medico-specialista', label: 'Medico Specialista' },
                                    { value: 'medico-competente', label: 'Medico Competente Aziendale' },
                                    { value: 'infermiere', label: 'Infermiere / Tecnico Sanitario' },
                                    { value: 'front-office', label: 'Receptionist / Front Office' },
                                    { value: 'spontanea', label: 'Candidatura Spontanea' },
                                    { value: 'altro', label: 'Altro ruolo' },
                                ]}
                            />
                        </div>
                    </div>
                </div>
            </section>
        </PublicLayout>
    );
};

// ─────────────────────────────────────────────────────────────────
// EXPORT BRAND-AWARE
// ─────────────────────────────────────────────────────────────────

const LavoraConNoiStaticPage: React.FC = () => {
    return isMedica ? <LavoraConNoiMedica /> : <LavoraConNoiSicurezza />;
};

export default LavoraConNoiStaticPage;
