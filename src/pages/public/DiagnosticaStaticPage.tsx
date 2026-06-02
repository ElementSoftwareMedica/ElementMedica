/**
 * DiagnosticaStaticPage
 *
 * Pagina "Diagnostica" STATICA per elementmedica.com.
 * NON usa CMS API — contenuto hardcoded per SEO perfetto.
 * Risonanza magnetica, TAC e radiologia non inclusi (fuori scope).
 * Tutti i servizi diagnostici sono "in programmazione".
 */

import React, { useState } from 'react';
import {
    Activity, Heart, Clock, CheckCircle, Phone, ArrowRight,
    AlertCircle, ChevronDown, Stethoscope, Zap, Shield,
    Users, MapPin, Calendar, FileText, Award,
    Droplets, Ear, Eye, Wind,
} from 'lucide-react';
import { PublicLayout } from '../../components/public/PublicLayout';
import { HeroSection } from '../../components/public/HeroSection';
import { PublicButton } from '../../components/public/PublicButton';
import SEOHead from '../../components/seo/SEOHead';
import { ContactForm } from '../../components/public/ContactForm';

// ─────────────────────────────────────────────────────────────────
// DATI SERVIZI DIAGNOSTICI
// ─────────────────────────────────────────────────────────────────

const DIAGNOSTICA_SERVIZI = [
    {
        icon: Activity,
        color: 'red',
        title: 'Elettrocardiogramma (ECG)',
        subtitle: 'ECG a Riposo e sotto Sforzo',
        desc: 'Registrazione dell\'attività elettrica del cuore per la diagnosi di aritmie, ischemia, blocchi di branca e patologie cardiache. Indispensabile nella sorveglianza sanitaria per lavoratori a rischio cardiovascolare.',
        details: ['ECG a riposo 12 derivazioni', 'Interpretazione cardiologica refertata', 'Disponibile anche per sorveglianza sanitaria MDL', 'Referto in giornata'],
        indicazioni: 'Controllo cardiologico periodico, pre-operatorio, sorveglianza sanitaria, lavoro notturno, autisti di mezzi pesanti (Cat. C/D/E).',
    },
    {
        icon: Wind,
        color: 'blue',
        title: 'Spirometria',
        subtitle: 'Esame della Funzionalità Respiratoria',
        desc: 'Misurazione della capacità polmonare e dei flussi respiratori. Fondamentale per diagnosi e monitoraggio di asma, BPCO, bronchiti croniche e valutazione dell\'idoneità al lavoro in ambienti con polveri e fumi.',
        details: ['Spirometria semplice e globale', 'Curva flusso-volume', 'Refertazione specialistica', 'Indicato per lavoratori esposti a polveri/fumi'],
        indicazioni: 'Sorveglianza sanitaria per esposizione a polveri, fumi, gas. Diagnosi e follow-up asma e BPCO.',
    },
    {
        icon: Ear,
        color: 'yellow',
        title: 'Audiometria',
        subtitle: 'Valutazione dell\'Udito',
        desc: 'Esame audiometrico tonale e vocale per la valutazione delle soglie uditive. Obbligatorio per i lavoratori esposti a rumore superiore agli 80 dB(A) ai sensi del D.Lgs 81/08 (Titolo VIII Capo II).',
        details: ['Audiometria tonale liminare', 'Audiometria vocale', 'Cabina silente certificata', 'Obbligatorio per rischio rumore >80 dB(A)'],
        indicazioni: 'Sorveglianza sanitaria per rischio rumore. Diagnosi ipoacusia professionale. Controllo in lavoratori con sordità preesistente.',
    },
    {
        icon: Heart,
        color: 'rose',
        title: 'Holter Cardiaco',
        subtitle: 'Monitoraggio ECG 24-48 Ore',
        desc: 'Registrazione continua dell\'attività cardiaca nelle 24 o 48 ore, nella vita quotidiana del paziente. Rileva aritmie intermittenti, extrasistoli, fibrillazione atriale parossistica non evidenziabili con ECG standard.',
        details: ['Monitoraggio 24 o 48 ore', 'Dispositivo leggero e indossabile', 'Analisi automatica + referto specialistico', 'Indispensabile per aritmie intermittenti'],
        indicazioni: 'Palpitazioni, sincopi, cardiopalmo episodico. Controllo post-ablazione. Valutazione rischio professionale per piloti, autisti, operatori macchinari.',
    },
    {
        icon: Activity,
        color: 'violet',
        title: 'Holter Pressorio (ABPM)',
        subtitle: 'Monitoraggio Pressione 24 Ore',
        desc: 'Misurazione automatica della pressione arteriosa per tutta la giornata, inclusa la notte (dipping pattern). Permette diagnosi accurata di ipertensione arteriosa, ipertensione da camice bianco e ipotensione ortostatica.',
        details: ['Misurazione ogni 20 min (diurna) / 30 min (notturna)', 'Analisi circadiana completa', 'Referto con indicazione terapeutica', 'Utile per ipertensione da camice bianco'],
        indicazioni: 'Ipertensione arteriosa sospetta o da monitorare. Valutazione terapia antipertensiva. Idoneità alla guida professionale.',
    },
    {
        icon: Stethoscope,
        color: 'teal',
        title: 'Ecografia Addominale',
        subtitle: 'Fegato, Milza, Reni, Pancreas, Vescica',
        desc: 'Ecografia degli organi addominali: fegato, colecisti, vie biliari, milza, reni, pancreas, aorta addominale e vescica. Esame non invasivo per la diagnosi di cisti, calcoli, steatosi, noduli e alterazioni morfologiche.',
        details: ['Fegato, colecisti e vie biliari', 'Reni e surreni', 'Milza e pancreas', 'Aorta addominale'],
        indicazioni: 'Dolore addominale, alterazioni degli indici epatici, sospetta colelitiasi, controllo periodico. Screening oncologico.',
    },
    {
        icon: Stethoscope,
        color: 'cyan',
        title: 'Ecografia Tiroidea',
        subtitle: 'Tiroide e Paratiroidi',
        desc: 'Valutazione morfologica e strutturale della ghiandola tiroidea. Permette di rilevare noduli, gozzo, tiroidite, cisti e lesioni. Fondamentale per il follow-up di noduli già noti e la diagnosi differenziale.',
        details: ['Studio morfologico completo', 'Misurazione volume ghiandola', 'Caratterizzazione noduli (TIRADS)', 'Valutazione linfonodi laterocervicali'],
        indicazioni: 'Noduli tiroidei, gozzo, tiroiditi. Follow-up tiroide. Controllo post-chirurgia tiroidea.',
    },
    {
        icon: Stethoscope,
        color: 'orange',
        title: 'Ecografia Muscolo-Tendinea',
        subtitle: 'Tendini, Muscoli e Articolazioni',
        desc: 'Esame ecografico dell\'apparato muscolo-scheletrico: tendini, legamenti, borse, muscoli e articolazioni. Particolarmente utile per tendiniti, lesioni della cuffia, sindrome del tunnel carpale, ernie muscolari.',
        details: ['Spalla e cuffia dei rotatori', 'Gomito, polso e mano', 'Ginocchio e articolazioni', 'Caviglia e piede'],
        indicazioni: 'Spalla dolorosa, epicondilite, tendinite del polso, lesioni legamentose, tunnel carpale. Lavoratori con MMC o movimenti ripetitivi.',
    },
    {
        icon: Droplets,
        color: 'indigo',
        title: 'Punto Prelievi',
        subtitle: 'Esami Ematochimici e Microbiologici',
        desc: 'Prelievo venoso e capillare per esami di laboratorio completi: emocromo, profilo biochimico, assetto lipidico, glicemia, funzionalità epatica e renale, marcatori tumorali, sierologie, profilo tiroideo, ormoni.',
        details: ['Prelievo venoso e capillare', 'Convenzionato con laboratori accreditati', 'Risposta in 24-48 ore', 'Disponibile anche a digiuno mattutino'],
        indicazioni: 'Esami di controllo periodici, sorveglianza sanitaria, medicina preventiva, diagnostica specialistica.',
    },
    {
        icon: Zap,
        color: 'amber',
        title: 'Test Allergologici',
        subtitle: 'Prick Test e RAST',
        desc: 'Valutazione allergologica cutanea e sierologica per pneumoallergeni (pollini, acari, muffe, animali), trofoallergeni (alimenti) e allergeni professionali. Indicato per asma, rinite allergica, orticaria e dermatiti.',
        details: ['Prick test cutanei standardizzati', 'RAST / IgE specifiche su sangue', 'Panel inalanti e alimentari', 'Allergeni professionali (latice, farine, legni)'],
        indicazioni: 'Rinite, asma, orticaria, eczema. Allergie professionali. Valutazione idoneità per lavoratori a rischio.',
    },
    {
        icon: Eye,
        color: 'green',
        title: 'Visita Oculistica e Tonometria',
        subtitle: 'Visus, Campo Visivo, Pressione Oculare',
        desc: 'Valutazione dell\'acuità visiva, della pressione intraoculare (tonometria) e del campo visivo. Obbligatoria per i lavoratori addetti ai videoterminali (VDT) ≥20h/settimana ai sensi del D.Lgs 81/08.',
        details: ['Acuità visiva correzione ottica', 'Tonometria ad aria', 'Campo visivo computerizzato', 'Obbligatoria per addetti VDT'],
        indicazioni: 'Sorveglianza sanitaria VDT e operatori al videoterminale. Prevenzione glaucoma. Idoneità alla guida professionale.',
    },
    {
        icon: Shield,
        color: 'emerald',
        title: 'Ecografia Ostetrica / Ginecologica',
        subtitle: 'Pelvica e in Gravidanza',
        desc: 'Ecografia pelvica femminile per la valutazione dell\'utero e delle ovaie. In programma anche ecografia ostetrica per il monitoraggio della gravidanza nella sua evoluzione fisiologica.',
        details: ['Ecografia pelvica trans-addominale', 'Ecografia ostetrica I, II e III trimestre', 'Morfologia fetale', 'Monitoraggio gravidanza fisiologica'],
        indicazioni: 'Controllo ginecologico, dolore pelvico, cisti ovariche. Ecografia in gravidanza. Pianificazione familiare.',
    },
];

const FAQS = [
    {
        q: 'Quando sarà disponibile il Punto Prelievi?',
        a: 'Il Punto Prelievi è in fase di attivazione presso il nostro poliambulatorio di Selvazzano Dentro. Prevediamo l\'apertura nella seconda metà del 2026. Iscriviti alla newsletter o contattaci per essere informato non appena sarà operativo.',
    },
    {
        q: 'Quali esami ecografici saranno disponibili?',
        a: 'Stiamo pianificando una gamma completa di ecografie: addominale, tiroidea, muscolo-tendinea, pelvica e ostetrica. Utilizzeremo apparecchiature di ultima generazione con refertazione da parte di specialisti ecografisti.',
    },
    {
        q: 'Cosa è già attivo oggi?',
        a: 'Oggi sono già attivi tutti i servizi di Medicina del Lavoro: sorveglianza sanitaria D.Lgs 81/08, visite del medico competente, giudizi di idoneità, protocolli sanitari e visite in azienda. Contattaci per una valutazione.',
    },
    {
        q: 'L\'ECG e la spirometria saranno disponibili per la sorveglianza sanitaria?',
        a: 'Sì, ECG e spirometria saranno disponibili anche come parte del protocollo di sorveglianza sanitaria aziendale. Questo permetterà di effettuare tutti gli accertamenti en suite, senza dover inviare il lavoratore in strutture esterne.',
    },
    {
        q: 'Sarà possibile prenotare online?',
        a: 'Sì, stiamo sviluppando il sistema di prenotazione online integrato per tutti i servizi diagnostici. Nel frattempo, è possibile contattarci via telefono o compilare il modulo di contatto per prendere un appuntamento.',
    },
    {
        q: 'I servizi saranno convenzionati SSN o solo privati?',
        a: 'In prima fase opereremo come struttura privata. Stiamo valutando convenzioni con fondi sanitari integrativi e casse di assistenza. Le tariffe saranno competitive e trasparenti. Seguici per aggiornamenti.',
    },
    {
        q: 'L\'audiometria è obbligatoria per la sorveglianza sanitaria?',
        a: 'Sì, l\'audiometria tonale è obbligatoria per i lavoratori esposti a rumore superiore a 80 dB(A) ai sensi del D.Lgs 81/08, Titolo VIII. Con il nostro poliambulatorio potrete effettuare audiometria e visita del medico competente nella stessa struttura.',
    },
    {
        q: 'Come posso essere informato sull\'apertura dei nuovi servizi?',
        a: 'Compila il modulo di contatto indicando il servizio di tuo interesse: ti contatteremo non appena sarà disponibile. Puoi anche seguirci sui social o chiamarci per informazioni aggiornate.',
    },
];

const colorMap: Record<string, { bg: string; text: string; border: string; badge: string }> = {
    red: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-100', badge: 'bg-red-100 text-red-700' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100', badge: 'bg-blue-100 text-blue-700' },
    yellow: { bg: 'bg-yellow-50', text: 'text-yellow-600', border: 'border-yellow-100', badge: 'bg-yellow-100 text-yellow-700' },
    rose: { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-100', badge: 'bg-rose-100 text-rose-700' },
    violet: { bg: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-100', badge: 'bg-violet-100 text-violet-700' },
    teal: { bg: 'bg-teal-50', text: 'text-teal-600', border: 'border-teal-100', badge: 'bg-teal-100 text-teal-700' },
    cyan: { bg: 'bg-cyan-50', text: 'text-cyan-600', border: 'border-cyan-100', badge: 'bg-cyan-100 text-cyan-700' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-100', badge: 'bg-orange-100 text-orange-700' },
    indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-100', badge: 'bg-indigo-100 text-indigo-700' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100', badge: 'bg-amber-100 text-amber-700' },
    green: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-100', badge: 'bg-green-100 text-green-700' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100', badge: 'bg-emerald-100 text-emerald-700' },
};

// ─────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPALE
// ─────────────────────────────────────────────────────────────────

const DiagnosticaStaticPage: React.FC = () => {
    const [openFaq, setOpenFaq] = useState<number | null>(null);
    const [expandedCard, setExpandedCard] = useState<number | null>(null);

    const structuredData = {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'MedicalOrganization',
                name: 'Poliambulatorio Element Medica – Diagnostica',
                url: 'https://www.elementmedica.com/diagnostica',
                telephone: '+39-351-318-1574',
                email: 'info@elementmedica.com',
                address: {
                    '@type': 'PostalAddress',
                    streetAddress: 'Via Bracciano 34',
                    addressLocality: 'Selvazzano Dentro',
                    postalCode: '35030',
                    addressRegion: 'PD',
                    addressCountry: 'IT',
                },
                areaServed: ['Selvazzano Dentro', 'Padova', 'Provincia di Padova', 'Veneto'],
                medicalSpecialty: ['Diagnostica', 'Cardiologia', 'Pneumologia', 'Audiologia', 'Ecografia'],
            },
            {
                '@type': 'FAQPage',
                mainEntity: FAQS.map(f => ({
                    '@type': 'Question',
                    name: f.q,
                    acceptedAnswer: { '@type': 'Answer', text: f.a },
                })),
            },
        ],
    };

    return (
        <PublicLayout>
            <SEOHead
                title="Diagnostica Strumentale Padova | ECG, Ecografia, Punto Prelievi – Element Medica Selvazzano"
                description="Diagnostica strumentale in programmazione a Selvazzano Dentro (Padova): ECG, spirometria, audiometria, ecografia, punto prelievi, Holter, test allergie. Già attiva la Medicina del Lavoro."
                keywords={[
                    'diagnostica medica Padova',
                    'ecografia Selvazzano',
                    'punto prelievi Padova',
                    'ECG Padova',
                    'spirometria Padova',
                    'audiometria Padova',
                    'Holter cardiaco Padova',
                    'esami del sangue Selvazzano',
                    'poliambulatorio Padova',
                    'diagnostica strumentale Veneto',
                    'Element Medica Selvazzano',
                    'ecografia addominale Padova',
                    'test allergie Padova',
                ]}
                canonicalUrl="https://www.elementmedica.com/diagnostica"
                ogTitle="Diagnostica Strumentale – Element Medica Selvazzano"
                ogDescription="ECG, ecografia, spirometria, audiometria, punto prelievi e molto altro in arrivo al Poliambulatorio Element Medica di Selvazzano Dentro (PD)."
                structuredData={structuredData}
            />

            {/* HERO */}
            <HeroSection
                title={<>Diagnostica<br /><span style={{ color: 'var(--color-primary-300)' }}>Strumentale</span></>}
                subtitle="Tutti i Servizi Diagnostici in un'Unica Struttura"
                description="ECG, spirometria, audiometria, ecografia, punto prelievi e molto altro. Il Poliambulatorio Element Medica di Selvazzano Dentro sta attivando progressivamente tutti i servizi diagnostici per privati e aziende."
                backgroundVariant="gradient"
                backgroundPattern="diagonal-lines"
                primaryButton={{ text: 'Prenota', href: '/prenota', icon: <Calendar className="w-5 h-5" /> }}
                secondaryButton={{ text: 'Medicina del Lavoro', href: '/medicina-del-lavoro' }}
                stats={[
                    { value: '12+', label: 'Servizi Diagnostici', icon: <Activity className="w-5 h-5" /> },
                    { value: '2026', label: 'Anno di Apertura', icon: <Clock className="w-5 h-5" /> },
                    { value: 'Privato', label: 'e Aziendale', icon: <Users className="w-5 h-5" /> },
                    { value: 'Padova', label: 'e Selvazzano', icon: <MapPin className="w-5 h-5" />, highlight: true },
                ]}
                showTrustBadges
            />

            {/* AVVISO PROGRAMMAZIONE */}
            <section className="py-8 bg-amber-50 border-b border-amber-200">
                <div className="container mx-auto px-4 max-w-4xl">
                    <div className="flex items-start gap-4 bg-white rounded-2xl p-6 shadow-sm border border-amber-200">
                        <AlertCircle className="w-8 h-8 text-amber-500 flex-shrink-0 mt-0.5" />
                        <div>
                            <h2 className="text-lg font-bold text-amber-800 mb-1">Servizi in Programmazione</h2>
                            <p className="text-amber-700 text-sm leading-relaxed">
                                I servizi di diagnostica strumentale sono in fase di attivazione progressiva presso il nostro poliambulatorio di Selvazzano Dentro.{' '}
                                <strong>Già attivi oggi:</strong> Medicina del Lavoro, sorveglianza sanitaria D.Lgs 81/08, visite del medico competente e giudizi di idoneità.{' '}
                                Compila il form in fondo alla pagina per essere informato non appena un servizio sarà disponibile.
                            </p>
                            <div className="flex flex-wrap gap-3 mt-3">
                                <a href="/medicina-del-lavoro" className="inline-flex items-center gap-1.5 bg-teal-600 text-white px-4 py-1.5 rounded-full text-sm font-semibold hover:bg-teal-700 transition-colors">
                                    <CheckCircle className="w-3.5 h-3.5" /> Medicina del Lavoro – Attiva ora
                                </a>
                                <a href="/prenota" className="inline-flex items-center gap-1.5 bg-white border border-amber-300 text-amber-700 px-4 py-1.5 rounded-full text-sm font-semibold hover:bg-amber-50 transition-colors">
                                    <Calendar className="w-3.5 h-3.5" /> Prenota una visita
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* GRIGLIA SERVIZI */}
            <section className="py-16 bg-white">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-12">
                        <div className="inline-flex items-center gap-2 bg-teal-50 text-teal-700 px-3 py-1 rounded-full text-sm font-medium mb-4">
                            <Activity className="w-4 h-4" />
                            Diagnostica Completa
                        </div>
                        <h2 className="text-3xl font-bold text-gray-900 mb-3">I Servizi Diagnostici in Arrivo</h2>
                        <p className="text-gray-600 max-w-2xl mx-auto">
                            Una gamma completa di esami e accertamenti strumentali per privati e aziende. Tutte le dotazioni saranno disponibili nella nostra sede di Selvazzano Dentro.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
                        {DIAGNOSTICA_SERVIZI.map((s, i) => {
                            const colors = colorMap[s.color] || colorMap.teal;
                            const isExpanded = expandedCard === i;
                            return (
                                <div key={i} className={`rounded-2xl border ${colors.border} bg-white shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden`}>
                                    <div className="p-6">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className={`w-12 h-12 ${colors.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                                                <s.icon className={`w-6 h-6 ${colors.text}`} />
                                            </div>
                                            <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                                                <Clock className="w-3 h-3" /> In Programmazione
                                            </span>
                                        </div>
                                        <h3 className="text-lg font-bold text-gray-900 mb-0.5">{s.title}</h3>
                                        <p className={`text-xs font-medium ${colors.text} mb-3`}>{s.subtitle}</p>
                                        <p className="text-gray-600 text-sm leading-relaxed">{s.desc}</p>

                                        <button
                                            onClick={() => setExpandedCard(isExpanded ? null : i)}
                                            className={`mt-4 text-sm font-medium ${colors.text} flex items-center gap-1 hover:opacity-80 transition-opacity`}
                                        >
                                            {isExpanded ? 'Mostra meno' : 'Dettagli e indicazioni'}
                                            <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                        </button>

                                        {isExpanded && (
                                            <div className="mt-4 space-y-3">
                                                <div>
                                                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1.5">Include</p>
                                                    <ul className="space-y-1">
                                                        {s.details.map((d, j) => (
                                                            <li key={j} className="flex items-center gap-2 text-sm text-gray-700">
                                                                <CheckCircle className={`w-3.5 h-3.5 ${colors.text} flex-shrink-0`} />
                                                                {d}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                                <div className={`${colors.bg} rounded-lg p-3`}>
                                                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Indicazioni</p>
                                                    <p className="text-xs text-gray-600 leading-relaxed">{s.indicazioni}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* SEZIONE PUNTO PRELIEVI */}
            <section className="py-16" style={{ background: 'linear-gradient(135deg, #0f766e, #134e4a)' }}>
                <div className="container mx-auto px-4 max-w-5xl">
                    <div className="grid md:grid-cols-2 gap-10 items-center">
                        <div>
                            <div className="inline-flex items-center gap-2 bg-white/20 text-white px-3 py-1 rounded-full text-sm font-medium mb-4">
                                <Droplets className="w-4 h-4" /> In Attivazione
                            </div>
                            <h2 className="text-3xl font-bold text-white mb-4">Punto Prelievi</h2>
                            <p className="text-white/80 leading-relaxed mb-6">
                                Il nostro Punto Prelievi sarà operativo per prelievi venosi e capillari, in convenzione con laboratori analisi accreditati. Potrai eseguire tutti gli esami del sangue in un ambiente confortevole e senza lunghe attese.
                            </p>
                            <div className="space-y-3">
                                {[
                                    'Emocromo completo e formula leucocitaria',
                                    'Profilo biochimico (glicemia, colesterolo, trigliceridi)',
                                    'Funzionalità epatica e renale (transaminasi, creatinina)',
                                    'Marcatori tumorali (PSA, CEA, CA125, CA19-9)',
                                    'Sierologie (HIV, HBV, HCV, sifilide, toxo)',
                                    'Assetto tiroideo (TSH, FT4, FT3, Ab anti-tiroide)',
                                    'Ormoni sessuali e riproduttivi',
                                    'Coagulazione (INR, PT, PTT)',
                                    'Esami urine e urinocoltura',
                                    'Esami per medicina del lavoro (piombemia, creatininuria)',
                                ].map((riga, i) => (
                                    <div key={i} className="flex items-center gap-3 text-white/90 text-sm">
                                        <CheckCircle className="w-4 h-4 text-teal-300 flex-shrink-0" />
                                        {riga}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
                            <h3 className="text-xl font-bold text-white mb-4">Come Funzionerà</h3>
                            <div className="space-y-5">
                                {[
                                    { n: '1', t: "Prenota l'appuntamento", d: 'Online o telefonicamente, scegliendo data e orario. Disponibili slot mattutini a digiuno.' },
                                    { n: '2', t: 'Presenta la richiesta', d: 'Porta la richiesta del medico di base o specialista. Saranno accettate anche richieste private.' },
                                    { n: '3', t: 'Prelievo rapido', d: 'Il prelievo avviene in ambiente confortevole e con operatori qualificati. Durata 5-10 minuti.' },
                                    { n: '4', t: 'Risultati online', d: 'Riceverai i referti via email o potrai consultarli sul portale paziente del laboratorio convenzionato.' },
                                ].map((step) => (
                                    <div key={step.n} className="flex gap-4">
                                        <div className="w-8 h-8 bg-teal-400 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-white text-sm">{step.n}</div>
                                        <div>
                                            <div className="font-semibold text-white text-sm">{step.t}</div>
                                            <div className="text-white/70 text-xs mt-0.5">{step.d}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* MEDICINA DEL LAVORO - GIA' ATTIVA */}
            <section className="py-16 bg-teal-50">
                <div className="container mx-auto px-4 max-w-4xl text-center">
                    <div className="inline-flex items-center gap-2 bg-teal-600 text-white px-3 py-1 rounded-full text-sm font-bold mb-6">
                        <CheckCircle className="w-4 h-4" /> Già Attivo
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-4">Medicina del Lavoro – Disponibile Ora</h2>
                    <p className="text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
                        Mentre i servizi diagnostici sono in programmazione, <strong>Medicina del Lavoro e Sorveglianza Sanitaria sono già pienamente operative</strong>. Medici del lavoro qualificati per sorveglianza sanitaria D.Lgs 81/08, giudizi di idoneità e protocolli personalizzati per aziende di ogni settore.
                    </p>
                    <div className="grid sm:grid-cols-3 gap-4 mb-8">
                        {[
                            { icon: FileText, t: 'Protocollo Sanitario', d: 'Personalizzato per ogni rischio e mansione aziendale' },
                            { icon: CheckCircle, t: 'Giudizi di Idoneità', d: 'Visita medica D.Lgs 81/08 con attestato immediato' },
                            { icon: Stethoscope, t: 'Visite in Azienda', d: 'Il medico competente viene direttamente da voi' },
                        ].map((item, i) => (
                            <div key={i} className="bg-white rounded-xl p-5 border border-teal-100 shadow-sm">
                                <item.icon className="w-8 h-8 text-teal-600 mx-auto mb-2" />
                                <div className="font-semibold text-gray-900 text-sm mb-1">{item.t}</div>
                                <div className="text-xs text-gray-500">{item.d}</div>
                            </div>
                        ))}
                    </div>
                    <PublicButton to="/medicina-del-lavoro" variant="primary" size="lg" className="bg-teal-600 hover:bg-teal-700 text-white">
                        Scopri Medicina del Lavoro <ArrowRight className="w-5 h-5 ml-2" />
                    </PublicButton>
                </div>
            </section>

            {/* FAQ */}
            <section className="py-16 bg-white">
                <div className="container mx-auto px-4 max-w-3xl">
                    <div className="text-center mb-10">
                        <h2 className="text-3xl font-bold text-gray-900 mb-3">Domande Frequenti</h2>
                        <p className="text-gray-600">Tutto quello che vuoi sapere sulla diagnostica in arrivo a Selvazzano Dentro</p>
                    </div>
                    <div className="space-y-3">
                        {FAQS.map((faq, i) => (
                            <div key={i} className="border border-gray-200 rounded-xl overflow-hidden">
                                <button
                                    className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 transition-colors"
                                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                >
                                    <span className="font-semibold text-gray-900 pr-4">{faq.q}</span>
                                    <ChevronDown className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                                </button>
                                {openFaq === i && (
                                    <div className="px-5 pb-5 text-gray-600 text-sm leading-relaxed border-t border-gray-100 pt-3">
                                        {faq.a}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* DOVE SIAMO */}
            <section className="py-10 bg-gray-50 border-t border-gray-100">
                <div className="container mx-auto px-4 max-w-4xl">
                    <div className="grid sm:grid-cols-3 gap-6 text-center">
                        <div className="flex flex-col items-center gap-2">
                            <MapPin className="w-8 h-8 text-teal-600" />
                            <div className="font-bold text-gray-900">Sede</div>
                            <div className="text-sm text-gray-600">Via Bracciano 34, Selvazzano Dentro (PD)</div>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            <Phone className="w-8 h-8 text-teal-600" />
                            <div className="font-bold text-gray-900">Telefono</div>
                            <a href="tel:+393513181574" className="text-sm text-teal-600 hover:underline">+39 351 318 1574</a>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            <Award className="w-8 h-8 text-teal-600" />
                            <div className="font-bold text-gray-900">Medicina del Lavoro</div>
                            <div className="text-sm text-gray-600">Attiva · Pronta in 48h</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* FORM CONTATTI */}
            <section className="py-16 bg-white">
                <div className="container mx-auto px-4 max-w-2xl">
                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Vuoi essere informato?</h2>
                        <p className="text-gray-500 text-sm">Compila il form e ti contatteremo non appena il servizio di interesse sarà disponibile.</p>
                    </div>
                    <ContactForm
                        title="Richiesta informazioni diagnostica"
                        showCompanyField={false}
                    />
                </div>
            </section>
        </PublicLayout>
    );
};

export default DiagnosticaStaticPage;
