/**
 * VisiteSpecialistichePage
 *
 * Pagina "Visite Specialistiche" STATICA per elementmedica.com.
 * NON usa CMS API — contenuto hardcoded per SEO perfetto.
 * Ottimizzata per ricerche locali Padova/Selvazzano.
 */

import React, { useState, useEffect } from 'react';
import {
    Heart, Stethoscope, Eye, Bone, ArrowRight,
    MapPin, Phone, ChevronDown, CheckCircle,
    Calendar, Clock, Users, Award, Shield,
    Activity, Ear, Zap, User,
    Dumbbell, Brain, Accessibility, Atom,
} from 'lucide-react';
import { PublicLayout } from '../../components/public/PublicLayout';
import { HeroSection } from '../../components/public/HeroSection';
import { PublicButton } from '../../components/public/PublicButton';
import SEOHead from '../../components/seo/SEOHead';
import { ContactForm } from '../../components/public/ContactForm';

// ─────────────────────────────────────────────────────────────────
// VISITE SPECIALISTICHE
// ─────────────────────────────────────────────────────────────────

const SPECIALITA = [
    {
        icon: Heart,
        color: 'red',
        slug: 'cardiologia',
        branca: 'Cardiologia',
        title: 'Visita Cardiologica',
        subtitle: 'ECG, Test da Sforzo, Valutazione Cardiovascolare',
        desc: 'Visita cardiologica specialistica con anamnesi cardiovascolare completa, esame obiettivo e interpretazione di ECG. Il cardiologo valuta aritmie, cardiopatie ischemiche, scompenso cardiaco e patologie della pressione arteriosa.',
        details: [
            'Visita cardiologica completa con ECG a 12 derivazioni',
            'Interpretazione e refertazione ECG standard e da sforzo',
            'Valutazione pre-agonistica e per lavoro notturno',
            'Indicata per sorveglianza sanitaria autisti Cat. C/D',
            'Referto cardiologico emesso in giornata',
        ],
        indicazioni: 'Dolore toracico, palpitazioni, mancanza di fiato, ipertensione, scompenso cardiaco, prevenzione cardiovascolare, sorveglianza sanitaria lavorativa.',
        disponibilita: 'Prossima apertura',
    },
    {
        icon: Dumbbell,
        color: 'emerald',
        slug: 'medicina-sport',
        branca: 'Medicina dello Sport',
        title: 'Medicina dello Sport',
        subtitle: 'Idoneità Sportiva, Test da Sforzo, Valutazione Funzionale',
        desc: 'Il medico dello sport valuta l\'idoneità all\'attività sportiva agonistica e non agonistica, esegue l\'ECG da sforzo e la valutazione dell\'apparato muscolo-scheletrico per atleti e sportivi di ogni livello.',
        details: [
            'Certificato idoneità sportiva non agonistica e agonistica',
            'ECG da sforzo (cicloergometro o tapis roulant)',
            'Valutazione fisiatrica e posturale per sportivi',
            'Prescrizione programmi di allenamento personalizzati',
            'Prevenzione infortuni e ottimizzazione della performance',
        ],
        indicazioni: 'Idoneità sportiva, pratica di sport agonistico/non agonistico, prevenzione infortuni, recupero post-infortunio, ottimizzazione della prestazione sportiva.',
        disponibilita: 'Prossima apertura',
    },
    {
        icon: Brain,
        color: 'purple',
        slug: 'psicoterapia',
        branca: 'Psicologia',
        title: 'Psicoterapia',
        subtitle: 'Supporto Psicologico e Psicoterapia Individuale',
        desc: 'Il servizio di psicoterapia offre supporto psicologico individuale per adulti. Il professionista si occupa di ansia, depressione, stress lavorativo, difficoltà relazionali e supporto psicologico in percorsi di malattia.',
        details: [
            'Prima valutazione psicologica',
            'Psicoterapia cognitivo-comportamentale (CBT)',
            'Supporto psicologico per stress e burnout lavorativo',
            'Trattamento ansia, depressione e attacchi di panico',
            'Percorsi individuali di crescita personale',
        ],
        indicazioni: 'Ansia, depressione, attacchi di panico, stress lavorativo, burnout, difficoltà relazionali, supporto in malattia cronica, percorsi di crescita personale.',
        disponibilita: 'Prossima apertura',
    },
    {
        icon: User,
        color: 'rose',
        slug: 'dermatologia',
        branca: 'Dermatologia',
        title: 'Dermatologia',
        subtitle: 'Patologie della Pelle e Prevenzione Melanoma',
        desc: 'Visita dermatologica per la valutazione di lesioni cutanee, dermatiti, acne, psoriasi e screening dei nei. Il dermatologo esegue la mappatura dei nei con dermatoscopio digitale per la diagnosi precoce del melanoma.',
        details: [
            'Visita dermatologica specialistica',
            'Dermatoscopia digitale per mappatura nei',
            'Diagnosi e trattamento acne, psoriasi, eczema',
            'Rimozione cheratosi seborroiche e lesioni benigne',
            'Screening melanoma e carcinoma basocellulare',
        ],
        indicazioni: 'Controllo nei, acne, psoriasi, dermatiti, screening tumori cutanei, patologie della pelle professionali.',
        disponibilita: 'Prossima apertura',
    },
    {
        icon: Accessibility,
        color: 'amber',
        slug: 'fisiatria',
        branca: 'Fisiatria',
        title: 'Fisiatria',
        subtitle: 'Medicina Fisica e Riabilitazione',
        desc: 'Il fisiatra si occupa di diagnosi e trattamento delle patologie muscolo-scheletriche e neurologiche attraverso terapie fisiche e programmi riabilitativi. Indicata post-intervento, post-trauma e per patologie croniche.',
        details: [
            'Visita fisiatrica specialistica completa',
            'Prescrizione fisioterapia e terapia fisica',
            'Valutazione stato funzionale e programma riabilitativo',
            'Infiltrazioni ecoguidate per tendini e articolazioni',
            'Valutazione EMG e velocità di conduzione nervosa',
        ],
        indicazioni: 'Post-intervento chirurgico ortopedico, lombalgie, cervicalgie, tendinopatie croniche, riabilitazione neurologica, patologie da iperuso, dolore cronico.',
        disponibilita: 'Prossima apertura',
    },
    {
        icon: Atom,
        color: 'indigo',
        slug: 'endocrinologia',
        branca: 'Endocrinologia',
        title: 'Endocrinologia',
        subtitle: 'Patologie Ormonali, Tiroide e Metabolismo',
        desc: 'L\'endocrinologo diagnostica e tratta le patologie delle ghiandole endocrine: tiroide, surrene, ipofisi, gonadi e pancreas. Segue il paziente con diabete mellito, osteoporosi, disfunzioni tiroidee e sindromi metaboliche complesse.',
        details: [
            'Visita endocrinologica specialistica',
            'Valutazione e gestione patologie tiroidee (ipotiroidismo, ipertiroidismo)',
            'Diagnosi e terapia diabete mellito tipo 1 e 2',
            'Valutazione osteoporosi con indicazione MOC DXA',
            'Gestione sindromi metaboliche e dislipidemie complesse',
        ],
        indicazioni: 'Patologie tiroidee, diabete mellito, osteoporosi, sindrome metabolica, dislipidemie, stanchezza cronica, alterazioni ormonali.',
        disponibilita: 'Prossima apertura',
    },
    {
        icon: Bone,
        color: 'blue',
        slug: 'ortopedia',
        branca: 'Ortopedia',
        title: 'Visita Ortopedica',
        subtitle: 'Patologie Muscolo-Scheletriche e Traumatologia',
        desc: 'L\'ortopedico valuta patologie di ossa, articolazioni, tendini e muscoli. Indicata per dolori articolari, tendinopatie, traumi, artrosi e patologie occupazionali da movimentazione manuale dei carichi (MMC).',
        details: [
            'Visita ortopedica specialistica',
            'Valutazione per idoneità mansione MMC (D.Lgs 81/08)',
            'Diagnosi di artrosi, tendinopatie e patologie legamentose',
            'Prescrizione terapia conservativa e fisioterapia',
            'Eventuali infiltrazioni e blocchi antidolorifici',
        ],
        indicazioni: 'Dolori articolari, lombalgia, tendiniti, artrosi, infortuni sul lavoro, limitazioni funzionali, valutazione idoneità mansione.',
        disponibilita: 'Prossima apertura',
    },
    {
        icon: Eye,
        color: 'cyan',
        slug: 'oculistica',
        branca: 'Oculistica',
        title: 'Visita Oculistica',
        subtitle: 'Acuità Visiva, Campo Visivo, Tonometria',
        desc: 'Visita oculistica specialistica con valutazione dell\'acuità visiva, misurazione della pressione oculare (tonometria) e analisi del campo visivo. Obbligatoria per addetti a videoterminali (VDT) ≥20h/settimana.',
        details: [
            'Valutazione acuità visiva con e senza correzione',
            'Tonometria ad aria per prevenzione glaucoma',
            'Campo visivo computerizzato',
            'Obbligatoria per addetti VDT (D.Lgs 81/08)',
            'Idoneità alla guida professionale (Patente C/D)',
        ],
        indicazioni: 'Sorveglianza sanitaria addetti ai videoterminali, controllo glaucoma, idoneità guida professionale, disturbi visivi.',
        disponibilita: 'Prossima apertura',
    },
    {
        icon: Stethoscope,
        color: 'teal',
        slug: 'medicina-interna',
        branca: 'Medicina Interna',
        title: 'Medicina Interna',
        subtitle: 'Diagnosi e Gestione Patologie Internistiche',
        desc: 'Il medico internista si occupa di diagnosi e cura delle malattie degli organi interni: diabete, ipertensione, dislipidemia, patologie metaboliche. Visita di secondo livello per problematiche non affrontabili dal MMG.',
        details: [
            'Visita medica internistica completa',
            'Gestione diabete tipo 2 e sindrome metabolica',
            'Gestione ipertensione e dislipidemia',
            'Prescrizione esami diagnostici mirati',
            'Secondo parere e valutazione specialistica',
        ],
        indicazioni: 'Diabete, ipertensione non controllata, dislipidemia, patologie metaboliche, anemia, patologie epatiche, secondo parere.',
        disponibilita: 'Prossima apertura',
    },
    {
        icon: Ear,
        color: 'violet',
        slug: 'orl',
        branca: 'Otorinolaringoiatria',
        title: 'Otorinolaringoiatria (ORL)',
        subtitle: 'Orecchio, Naso, Gola e Voce',
        desc: 'Lo specialista ORL valuta patologie di orecchio, naso, seni paranasali, faringe, laringe e ghiandole salivari. Indicata anche per la valutazione dell\'udito nei lavoratori esposti a rumore.',
        details: [
            'Visita otorinolaringoiatrica specialistica',
            'Endoscopia naso-faringea',
            'Valutazione audiologica e trattamento ipoacusia',
            'Terapia sinusite, rinite, tonsillite ricorrente',
            'Valutazione disfonia e noduli delle corde vocali',
        ],
        indicazioni: 'Disturbi uditivi, sinusite, rinite allergica, mal di gola ricorrente, raucedine, vertigini, acufeni.',
        disponibilita: 'Prossima apertura',
    },
    {
        icon: Activity,
        color: 'orange',
        slug: 'pneumologia',
        branca: 'Pneumologia',
        title: 'Pneumologia',
        subtitle: 'Funzionalità Respiratoria e Patologie Polmonari',
        desc: 'Il pneumologo si occupa di asma bronchiale, BPCO, apnee notturne, patologie pleuriche e broncopolmonari. Include spirometria e valutazione dell\'idoneità per lavoratori esposti a sostanze nocive per l\'apparato respiratorio.',
        details: [
            'Visita pneumologica specialistica',
            'Spirometria con curva flusso-volume e interpretazione',
            'Diagnosi e gestione asma e BPCO',
            'Valutazione idoneità lavorativa per rischi respiratori',
            'Prescrizione terapia inalatoria e fisioterapia',
        ],
        indicazioni: 'Asma, BPCO, bronchiti croniche, apnee notturne, dispnea, sorveglianza sanitaria per esposizione a polveri/fumi.',
        disponibilita: 'Prossima apertura',
    },
    {
        icon: Zap,
        color: 'yellow',
        slug: 'neurologia',
        branca: 'Neurologia',
        title: 'Neurologia',
        subtitle: 'Patologie del Sistema Nervoso',
        desc: 'Il neurologo valuta e tratta malattie del cervello, midollo spinale e nervi periferici. Indicata per cefalee ricorrenti, disturbi della memoria, neuropatie periferiche e valutazione per lavori in quota.',
        details: [
            'Visita neurologica specialistica',
            'Valutazione cefalea e emicrania',
            'Diagnosi neuropatie periferiche (tunnel carpale, ecc.)',
            'EMG/ENG su richiesta specialistica',
            'Valutazione per idoneità lavori ad alto rischio',
        ],
        indicazioni: 'Cefalee, disturbi cognitivi, neuropatie, vertigini, epilessia, tunnel carpale, malattie neurodegenerative precoci.',
        disponibilita: 'Prossima apertura',
    },
];

const FAQS = [
    {
        q: 'Posso prenotare una visita specialistica online?',
        a: 'Sì, puoi prenotare online attraverso il sistema di prenotazione di Element Medica o chiamando il +39 351 318 1574 (Lun-Ven 8:00-19:00, Sab 8:00-13:00). Cerchiamo di garantire un appuntamento entro 3-7 giorni per la maggior parte delle specialità.',
    },
    {
        q: 'Quanto costa una visita specialistica?',
        a: 'Le tariffe variano in base alla specialità e al tipo di visita. Per informazioni sui prezzi attuali contattaci al +39 351 318 1574 o invia una richiesta via email. Per aziende che necessitano di visite multiple offriamo tariffe dedicate.',
    },
    {
        q: 'Le visite specialistiche sono in convenzione con il SSN?',
        a: 'In prima fase operiamo come struttura privata. Stiamo valutando convenzioni con fondi sanitari integrativi e casse di assistenza. Alcune prestazioni possono essere detraibili fiscalmente. Chiedi all\'accettazione per dettagli.',
    },
    {
        q: 'Dove si trova il poliambulatorio?',
        a: 'Il Poliambulatorio Element Medica si trova a Via Bracciano 34, Selvazzano Dentro (PD), a 10 minuti dal centro di Padova lungo la SS11. C\'è parcheggio disponibile ed è facilmente raggiungibile in auto o con i mezzi pubblici.',
    },
    {
        q: 'Dove vengono inviati i referti?',
        a: 'I referti delle visite specialistiche vengono consegnati digitalmente nel portale paziente entro 24-48 ore dalla visita. Riceverai una notifica via email al momento della disponibilità del referto.',
    },
    {
        q: 'Posso portare documentazione clinica precedente alla visita?',
        a: 'Sì, anzi è consigliato portare tutta la documentazione clinica rilevante (referti, esami, prescrizioni precedenti). Questo permette allo specialista di valutare l\'evoluzione nel tempo e prescrivere gli esami più appropriati.',
    },
];

const colorMap: Record<string, { bg: string; text: string; border: string; badge: string }> = {
    red: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-100', badge: 'bg-red-100 text-red-700' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100', badge: 'bg-blue-100 text-blue-700' },
    cyan: { bg: 'bg-cyan-50', text: 'text-cyan-600', border: 'border-cyan-100', badge: 'bg-cyan-100 text-cyan-700' },
    teal: { bg: 'bg-teal-50', text: 'text-teal-600', border: 'border-teal-100', badge: 'bg-teal-100 text-teal-700' },
    rose: { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-100', badge: 'bg-rose-100 text-rose-700' },
    violet: { bg: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-100', badge: 'bg-violet-100 text-violet-700' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-100', badge: 'bg-orange-100 text-orange-700' },
    yellow: { bg: 'bg-yellow-50', text: 'text-yellow-600', border: 'border-yellow-100', badge: 'bg-yellow-100 text-yellow-700' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100', badge: 'bg-emerald-100 text-emerald-700' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-100', badge: 'bg-purple-100 text-purple-700' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100', badge: 'bg-amber-100 text-amber-700' },
    indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-100', badge: 'bg-indigo-100 text-indigo-700' },
};

// ─────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPALE
// ─────────────────────────────────────────────────────────────────

const VisiteSpecialistichePage: React.FC = () => {
    const [openFaq, setOpenFaq] = useState<number | null>(null);
    const [expandedCard, setExpandedCard] = useState<number | null>(null);
    const [doctors, setDoctors] = useState<Array<{ id: string; nome: string; specialties: string[] }>>([]);

    useEffect(() => {
        const brandId = import.meta.env.VITE_BRAND_ID || 'element-medica';
        fetch('/api/v1/public/doctors?limit=100', {
            headers: { 'X-Frontend-Id': brandId }
        })
            .then(r => r.ok ? r.json() : null)
            .then(data => { if (data?.success) setDoctors(data.data); })
            .catch(() => { });
    }, []);

    const structuredData = {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'MedicalOrganization',
                name: 'Poliambulatorio Element Medica – Visite Specialistiche',
                url: 'https://www.elementmedica.com/visite-specialistiche',
                telephone: '+39-351-318-1574',
                email: 'info@elementmedica.com',
                image: 'https://www.elementmedica.com/assets/logos/element-medica-og-preview.png',
                address: {
                    '@type': 'PostalAddress',
                    streetAddress: 'Via Bracciano 34',
                    addressLocality: 'Selvazzano Dentro',
                    postalCode: '35030',
                    addressRegion: 'PD',
                    addressCountry: 'IT',
                },
                openingHoursSpecification: [
                    { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], opens: '08:00', closes: '19:00' },
                    { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Saturday'], opens: '08:00', closes: '13:00' },
                ],
                areaServed: [
                    { '@type': 'City', name: 'Selvazzano Dentro' },
                    { '@type': 'City', name: 'Padova' },
                    { '@type': 'AdministrativeArea', name: 'Provincia di Padova' },
                ],
                medicalSpecialty: [
                    'Cardiologia', 'Medicina dello Sport', 'Psicologia',
                    'Dermatologia', 'Fisiatria', 'Endocrinologia',
                    'Ortopedia', 'Oculistica', 'Medicina Interna',
                    'Otorinolaringoiatria', 'Pneumologia', 'Neurologia',
                ],
                availableService: SPECIALITA.map(s => ({
                    '@type': 'MedicalProcedure',
                    name: s.title,
                    description: s.desc,
                })),
            },
            {
                '@type': 'FAQPage',
                mainEntity: FAQS.map(f => ({
                    '@type': 'Question',
                    name: f.q,
                    acceptedAnswer: { '@type': 'Answer', text: f.a },
                })),
            },
            {
                '@type': 'BreadcrumbList',
                itemListElement: [
                    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.elementmedica.com' },
                    { '@type': 'ListItem', position: 2, name: 'Visite Specialistiche', item: 'https://www.elementmedica.com/visite-specialistiche' },
                ],
            },
        ],
    };

    return (
        <PublicLayout>
            <SEOHead
                title="Visite Specialistiche Padova – Cardiologica, Ortopedica, ORL, Psicoterapia | Element Medica Selvazzano"
                description="Visite specialistiche private a Selvazzano Dentro vicino Padova: cardiologica, ortopedica, oculistica, dermatologica, medicina dello sport, psicoterapia, fisiatria, endocrinologia e altre. Prenotazione online rapida. Tel +39 351 318 1574."
                keywords={[
                    'visite specialistiche Padova',
                    'visita cardiologica Padova',
                    'medicina dello sport Padova',
                    'psicoterapia Selvazzano',
                    'fisiatria Padova',
                    'endocrinologia Padova',
                    'visita ortopedica Padova',
                    'visita oculistica Padova',
                    'dermatologia Padova',
                    'ORL Padova',
                    'pneumologia Padova',
                    'visita specialistica privata Padova',
                    'specialista Selvazzano Dentro',
                    'poliambulatorio visite Padova',
                    'prenotare visita medica Padova',
                    'visita neurologica Padova',
                    'visita medica privata Selvazzano',
                    'visite mediche specialistiche Veneto',
                ]}
                canonicalUrl="https://www.elementmedica.com/visite-specialistiche"
                siteName="Element Medica"
                ogTitle="Visite Specialistiche – Poliambulatorio Element Medica Selvazzano (Padova)"
                ogDescription="Cardiologia, ortopedia, oculistica, dermatologia, ORL, pneumologia a Selvazzano Dentro (PD). Prenotazione online, referti digitali in 24h. 10 min da Padova."
                structuredData={structuredData}
            />

            {/* HERO */}
            <HeroSection
                title={<>Visite<br /><span style={{ color: 'var(--color-primary-300)' }}>Specialistiche</span></>}
                subtitle="Selvazzano Dentro – a 10 min da Padova"
                description="Cardiologia, ortopedia, medicina dello sport, psicoterapia, fisiatria, endocrinologia, oculistica, dermatologia, ORL, pneumologia e neurologia in un unico centro. Prenotazione online o telefonica, referti digitali in 24-48 ore."
                backgroundVariant="gradient"
                backgroundPattern="diagonal-lines"
                primaryButton={{ text: 'Prenota Online', href: '/prenota', icon: <Calendar className="w-5 h-5" /> }}
                secondaryButton={{ text: '+39 351 318 1574', href: 'tel:+393513181574' }}
                stats={[
                    { value: '12', label: 'Specialità', icon: <Stethoscope className="w-5 h-5" /> },
                    { value: '3-7 gg', label: 'Tempi di attesa', icon: <Clock className="w-5 h-5" />, highlight: true },
                    { value: '10 min', label: 'da Padova', icon: <MapPin className="w-5 h-5" /> },
                    { value: '24-48h', label: 'Referto digitale', icon: <Award className="w-5 h-5" /> },
                ]}
            />

            {/* VANTAGGI */}
            <section className="py-8 bg-teal-700 text-white">
                <div className="container mx-auto px-4">
                    <div className="flex flex-wrap justify-center items-center gap-8 text-sm">
                        <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-teal-200" />
                            <span>Prenotazione online rapida</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-teal-200" />
                            <span>Referti digitali in 24-48h</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-teal-200" />
                            <span>Tempi di attesa 3-7 giorni</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-teal-200" />
                            <span>Selvazzano Dentro — 10 min da Padova</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-teal-200" />
                            <a href="tel:+393513181574" className="hover:underline">+39 351 318 1574</a>
                        </div>
                    </div>
                </div>
            </section>

            {/* SPECIALITÀ */}
            <section className="py-16 bg-white">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-gray-900 mb-3">Le Nostre Specialità</h2>
                        <p className="text-gray-600 max-w-2xl mx-auto">
                            Specialisti qualificati per ogni esigenza, in un unico centro a Selvazzano Dentro (Padova).
                            Clicca su ogni specialità per i dettagli.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        {SPECIALITA.map((s, i) => {
                            const colors = colorMap[s.color] || colorMap['teal'];
                            const isExpanded = expandedCard === i;
                            const specDoctors = doctors.filter(d =>
                                d.specialties?.some(sp =>
                                    sp.toLowerCase().includes(s.branca.toLowerCase()) ||
                                    s.branca.toLowerCase().includes(sp.toLowerCase())
                                )
                            );
                            return (
                                <div
                                    key={i}
                                    className={`rounded-2xl border ${colors.border} ${colors.bg} p-6 cursor-pointer transition-all hover:shadow-md`}
                                    onClick={() => setExpandedCard(isExpanded ? null : i)}
                                >
                                    <div className="flex items-start gap-4">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${colors.bg}`}>
                                            <s.icon className={`w-6 h-6 ${colors.text}`} />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between">
                                                <h3 className="font-bold text-gray-900 text-lg">{s.title}</h3>
                                                <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                            </div>
                                            <p className="text-sm text-gray-500 mb-2">{s.subtitle}</p>
                                            {/* Prossima apertura badge */}
                                            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-amber-200 mb-2">
                                                🔜 Prossima apertura
                                            </span>
                                            <p className="text-sm text-gray-700">{s.desc}</p>
                                            {/* Doctors preview (collapsed) */}
                                            {!isExpanded && specDoctors.length > 0 && (
                                                <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                                                    <Users className="w-3 h-3 flex-shrink-0" />
                                                    {specDoctors.map(d => d.nome).join(' · ')}
                                                </p>
                                            )}
                                            {isExpanded && (
                                                <div className="mt-4 space-y-3">
                                                    <div>
                                                        <h4 className="font-semibold text-sm text-gray-900 mb-2">Cosa include:</h4>
                                                        <ul className="space-y-1">
                                                            {s.details.map((d, di) => (
                                                                <li key={di} className="flex items-start gap-2 text-sm text-gray-700">
                                                                    <CheckCircle className={`w-4 h-4 ${colors.text} flex-shrink-0 mt-0.5`} />
                                                                    {d}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                    <div className={`p-3 rounded-lg ${colors.bg} border ${colors.border}`}>
                                                        <span className="text-xs font-semibold text-gray-700">📋 Indicazioni: </span>
                                                        <span className="text-xs text-gray-600">{s.indicazioni}</span>
                                                    </div>
                                                    {/* Doctors (expanded) */}
                                                    {specDoctors.length > 0 && (
                                                        <div className={`p-3 rounded-lg ${colors.bg} border ${colors.border}`}>
                                                            <span className="text-xs font-semibold text-gray-700 block mb-1.5">👨‍⚕️ Specialisti:</span>
                                                            <div className="flex flex-wrap gap-2">
                                                                {specDoctors.map(d => (
                                                                    <a
                                                                        key={d.id}
                                                                        href={`/medici/${d.id}`}
                                                                        onClick={e => e.stopPropagation()}
                                                                        className={`text-xs font-medium ${colors.text} hover:underline`}
                                                                    >
                                                                        {d.nome}
                                                                    </a>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                    <div className="flex items-center gap-2 mt-3">
                                                        <a
                                                            href={`/prenota?branca=${s.slug}`}
                                                            onClick={e => e.stopPropagation()}
                                                            className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-teal-700 transition-colors"
                                                        >
                                                            Prenota {s.title}
                                                        </a>
                                                        <a
                                                            href="tel:+393513181574"
                                                            onClick={e => e.stopPropagation()}
                                                            className="flex items-center gap-1 text-teal-600 text-sm font-medium hover:underline"
                                                        >
                                                            <Phone className="w-4 h-4" /> Chiama
                                                        </a>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* PERCHÉ SCEGLIERCI */}
            <section className="py-16 bg-gray-50">
                <div className="container mx-auto px-4 max-w-5xl">
                    <div className="text-center mb-10">
                        <h2 className="text-3xl font-bold text-gray-900 mb-3">Perché Scegliere Element Medica</h2>
                        <p className="text-gray-600">Un poliambulatorio moderno, vicino a Padova, con un servizio che mette il paziente al centro.</p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-6">
                        {[
                            { Icon: Clock, title: 'Tempi Ridotti', desc: 'Appuntamenti disponibili in 3-7 giorni per la maggior parte delle specialità. Nessuna lista di attesa eterna come nel SSN.' },
                            { Icon: MapPin, title: 'Posizione Comoda', desc: 'Via Bracciano 34, Selvazzano Dentro: 10 minuti dal centro di Padova lungo la SS11, con parcheggio gratuito.' },
                            { Icon: Award, title: 'Specialisti Qualificati', desc: 'Medici specialisti con esperienza e formazione universitaria. Ogni visita è accurata, approfondita e refertatata.' },
                            { Icon: Shield, title: 'Privacy e GDPR', desc: 'I tuoi dati sanitari sono gestiti con la massima riservatezza secondo il GDPR. Cartelle cliniche digitali sicure.' },
                            { Icon: Calendar, title: 'Referto Digitale', desc: 'Il referto è disponibile nel portale online entro 24-48 ore dalla visita, con notifica via email.' },
                            { Icon: Users, title: 'Medicina del Lavoro', desc: 'Oltre alle specialistiche, siamo il riferimento per la sorveglianza sanitaria aziendale (D.Lgs 81/08) per le aziende del territorio.' },
                        ].map((item, i) => (
                            <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                                <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center mb-4">
                                    <item.Icon className="w-5 h-5 text-teal-600" />
                                </div>
                                <h3 className="font-bold text-gray-900 mb-2">{item.title}</h3>
                                <p className="text-sm text-gray-600">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-16 bg-teal-700 text-white">
                <div className="container mx-auto px-4 text-center">
                    <h2 className="text-3xl font-bold mb-4">Prenota la Tua Visita Specialistica</h2>
                    <p className="text-white/80 mb-8 max-w-xl mx-auto">
                        Siamo a Selvazzano Dentro, 10 minuti da Padova. Prenotazione online rapida o chiamaci al nostro numero.
                    </p>
                    <div className="flex flex-wrap gap-4 justify-center">
                        <a
                            href="/prenota"
                            className="inline-flex items-center gap-2 bg-white text-teal-700 font-bold px-8 py-3 rounded-full hover:bg-teal-50 transition-all"
                        >
                            <Calendar className="w-5 h-5" /> Prenota Online
                        </a>
                        <a
                            href="tel:+393513181574"
                            className="inline-flex items-center gap-2 border-2 border-white text-white font-bold px-8 py-3 rounded-full hover:bg-white/10 transition-all"
                        >
                            <Phone className="w-5 h-5" /> +39 351 318 1574
                        </a>
                    </div>
                    <div className="mt-6 flex flex-wrap justify-center gap-6 text-sm text-white/70">
                        <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> Lun-Ven 8:00-19:00</span>
                        <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> Sabato 8:00-13:00</span>
                        <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> Via Bracciano 34, Selvazzano Dentro (PD)</span>
                    </div>
                </div>
            </section>

            {/* FAQ */}
            <section className="py-16 bg-white">
                <div className="container mx-auto px-4 max-w-3xl">
                    <div className="text-center mb-10">
                        <h2 className="text-2xl font-bold text-gray-900 mb-3">Domande Frequenti</h2>
                        <p className="text-gray-600">Tutto quello che devi sapere sulle visite specialistiche a Element Medica.</p>
                    </div>
                    <div className="space-y-3">
                        {FAQS.map((faq, i) => (
                            <div key={i} className="rounded-xl border border-gray-200 overflow-hidden">
                                <button
                                    className="w-full flex items-center justify-between px-5 py-4 text-left font-medium text-gray-900 hover:bg-gray-50"
                                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                >
                                    <span>{faq.q}</span>
                                    <ChevronDown className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ml-4 ${openFaq === i ? 'rotate-180' : ''}`} />
                                </button>
                                {openFaq === i && (
                                    <div className="px-5 pb-4 text-sm text-gray-700 bg-gray-50">{faq.a}</div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CONTATTO */}
            <section className="py-16 bg-gray-50">
                <div className="container mx-auto px-4 max-w-2xl">
                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Hai una domanda?</h2>
                        <p className="text-gray-600">Scrivici e ti risponderemo entro 24 ore.</p>
                    </div>
                    <ContactForm defaultSubject="Informazioni visite specialistiche" />
                </div>
            </section>
        </PublicLayout>
    );
};

export default VisiteSpecialistichePage;
