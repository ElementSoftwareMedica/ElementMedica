/**
 * MedicinaDelLavoroPage
 *
 * Pagina STATICA sulla medicina del lavoro.
 * Brand-aware: renderizza contenuto diverso per Element Sicurezza vs Element Medica.
 * NON effettua chiamate CMS API — contenuto hardcoded per SEO perfetto.
 * Widget dinamici caricati dal tenant Element SRL.
 */

import React, { useState } from 'react';
import {
    Stethoscope, Shield, CheckCircle, Phone, ArrowRight,
    Clock, Users, Award, FileText, AlertTriangle, ChevronDown,
    Heart, Building2, Calendar, ClipboardList, BookOpen,
    Star, MapPin, Zap, Activity, Volume2, Monitor, TrendingUp,
} from 'lucide-react';
import { PublicLayout } from '../../components/public/PublicLayout';
import { HeroSection } from '../../components/public/HeroSection';
import { PublicButton } from '../../components/public/PublicButton';
import SEOHead from '../../components/seo/SEOHead';
import { ContactForm } from '../../components/public/ContactForm';
import { useBrandConfig } from '../../hooks/useBrandConfig';

const brandId = import.meta.env.VITE_BRAND_ID || 'element-sicurezza';
const isMedica = brandId === 'element-medica';

// ─────────────────────────────────────────────────────────────────
// DATI CONDIVISI / RIUTILIZZABILI
// ─────────────────────────────────────────────────────────────────

const NORMATIVA_ITEMS = [
    { art: 'Art. 25 D.Lgs 81/08', desc: 'Obblighi del medico competente: protocollo sanitario, giudizi idoneità, cartella sanitaria.' },
    { art: 'Art. 38 D.Lgs 81/08', desc: 'Requisiti per svolgere le funzioni di medico competente (specializzazione riconosciuta).' },
    { art: 'Art. 39-40 D.Lgs 81/08', desc: 'Modalità di svolgimento, collaborazione con SPP e obbligo di relazione annuale.' },
    { art: 'Art. 41 D.Lgs 81/08', desc: 'Sorveglianza sanitaria obbligatoria: visite preventive, periodiche, in occasione di cambio mansione, su richiesta.' },
    { art: 'Art. 42 D.Lgs 81/08', desc: 'Provvedimenti a tutela della salute del lavoratore dopo il giudizio di non idoneità.' },
    { art: 'Art. 229 D.Lgs 81/08', desc: 'Sorveglianza sanitaria per esposizione ad agenti cancerogeni e mutageni (rischio specifico, registro esposti 40 anni).' },
];

const ESAMI_PROTOCOLLI = [
    { risk: 'Rumore', icon: Volume2, exams: 'Visita medica + audiometria tonale', freq: 'Annuale >85dB / Biennale 80-85dB', color: 'orange' },
    { risk: 'Videoterminali (VDT)', icon: Monitor, exams: 'Visita medica + esame oculistico', freq: 'Quinquennale (biennale >50 anni)', color: 'blue' },
    { risk: 'Agenti chimici', icon: Zap, exams: 'Visita + esami ematochimici mirati', freq: 'Annuale rischio alto / Biennale moderato', color: 'yellow' },
    { risk: 'MMC / Carichi', icon: Activity, exams: 'Visita + visita osteoarticolare', freq: 'Annuale rischio alto / Biennale moderato', color: 'red' },
    { risk: 'Lavoro notturno', icon: Clock, exams: 'Visita + ECG + esami ematici', freq: 'Annuale', color: 'indigo' },
    { risk: 'Agenti biologici', icon: Shield, exams: 'Visita + sierologie + vaccinazioni', freq: 'Annuale + post-esposizione', color: 'green' },
];

const DOCUMENTI_OBBLIGATORI = [
    { icon: FileText, title: 'Cartella Sanitaria e di Rischio', law: 'Art. 25 c.1 lett. c)', desc: 'Anamnesi, visite, giudizi idoneità per ogni lavoratore.', years: '10 anni (40 per cancerogeni)' },
    { icon: CheckCircle, title: 'Giudizio di Idoneità', law: 'Art. 41 c.6', desc: 'Documento rilasciato al lavoratore e al DL dopo ogni visita.', years: 'Vd. cartella sanitaria' },
    { icon: ClipboardList, title: 'Protocollo Sanitario', law: 'Art. 25 c.1 lett. b)', desc: 'Elenco per mansione e rischio di visite, accertamenti e periodicità. Fa parte del DVR.', years: 'Aggiornamento annuale' },
    { icon: BookOpen, title: 'Registro Infortuni', law: 'Art. 53', desc: 'Registro cronologico infortuni con assenza ≥1 giorno.', years: '4 anni' },
    { icon: AlertTriangle, title: 'Registro Esposti Cancerogeni', law: 'Art. 243', desc: 'Mansione, livello e durata esposizione ad agenti cancerogeni.', years: '40 anni' },
    { icon: Activity, title: 'Relazione Sanitaria Annuale', law: 'Art. 40 c.1', desc: 'Relazione anonima aggregata sullo stato di salute della forza lavoro.', years: 'Invio entro 31 marzo' },
];

// ─────────────────────────────────────────────────────────────────
// VERSIONE ELEMENT SICUREZZA
// ─────────────────────────────────────────────────────────────────

const MedicinaDelLavoroSicurezza: React.FC = () => {
    const [openFaq, setOpenFaq] = useState<number | null>(null);

    const faqs = [
        { q: 'Quando è obbligatoria la sorveglianza sanitaria?', a: 'È obbligatoria per tutti i lavoratori esposti a rischi specifici previsti dal D.Lgs 81/08: rumore, vibrazioni, agenti chimici/biologici, videoterminali (≥20h/settimana), MMC, lavoro notturno, lavoro in quota. Il medico competente stabilisce il protocollo sanitario su base del DVR.' },
        { q: 'Chi può svolgere le funzioni di medico competente?', a: 'Solo medici con specializzazione in medicina del lavoro, medicina preventiva dei lavoratori, igiene industriale o con titolo equipollente (art. 38 D.Lgs 81/08). Element Sicurezza collabora con medici del lavoro iscritti all\'albo INAIL.' },
        { q: 'Cosa si intende per protocollo sanitario?', a: 'Il protocollo è un documento elaborato dal MC in base al DVR che elenca, per ogni mansione a rischio, le tipologie di visita, gli accertamenti integrativi (es. audiometria, spirometria, esami ematici) e la periodicità. Va aggiornato ogni anno o a ogni modifica dei processi produttivi.' },
        { q: 'Cosa succede se un lavoratore rifiuta la visita medica?', a: 'Il lavoratore che rifiuta la sorveglianza sanitaria obbligatoria espone il DL a sanzioni (€300-€3.000 mancata sorveglianza sanitaria art. 55 D.Lgs 81/08). Il MC può emettere giudizio di "non idoneità temporanea" per mancata conformità. Consigliamo di documentare sempre l\'invito formale.' },
        { q: 'Cosa contiene il giudizio di idoneità?', a: 'Il giudizio può essere: idoneo, idoneo con prescrizioni (limitazioni temporanee), idoneo con limitazioni (mansioni particolari), non idoneo temporaneamente (assenza per cure), non idoneo permanenzialmente (cambio mansione/licenziamento per gravi motivi di salute).' },
        { q: 'Qual è la differenza tra visita preventiva e periodica?', a: 'La visita preventiva avviene prima dell\'inizio dell\'esposizione al rischio (prima dell\'assunzione o del cambio mansione). La visita periodica si ripete con cadenza stabilita nel protocollo sanitario (di solito annuale o biennale) per monitorare nel tempo lo stato di salute.' },
        { q: 'RSPP e medico competente hanno le stesse responsabilità?', a: 'No. L\'RSPP coordina il Servizio di Prevenzione e Protezione (DVR, misure organizzative). Il medico competente è il professionista sanitario; è obbligatorio solo quando esistono rischi specifici. Entrambe le figure collaborano alla riunione annuale (art. 35 D.Lgs 81/08).' },
        { q: 'Posso delegare il servizio di medicina del lavoro all\'esterno?', a: 'Sì, è la soluzione più adottata dalle PMI. Il datore di lavoro nomina un medico competente esterno (libero professionista o studio medico). Element Sicurezza fornisce sia il servizio RSPP che il medico competente come package integrato per il Veneto.' },
        { q: 'Quanto costa un servizio di medicina del lavoro aziendale?', a: 'Il costo dipende dal numero di dipendenti, dal profilo di rischio e dagli accertamenti del protocollo. Con Element Sicurezza, per un\'impresa con 10-50 dipendenti a rischio medio, il servizio annuale parte da circa €70-100 per dipendente (visita + accertamenti base). Richiedi un preventivo gratuito.' },
        { q: 'Cosa si rischia senza sorveglianza sanitaria?', a: 'Sanzioni penali e amministrative per il datore di lavoro: arresto fino a 2 mesi o ammenda fino a €1.474 per omessa sorveglianza (art. 55 D.Lgs 81/08). In caso di infortuni o malattie professionali, l\'assenza di sorveglianza è aggravante in sede civile e penale.' },
        { q: 'La riunione periodica è obbligatoria?', a: 'Sì, per aziende con più di 15 lavoratori almeno una volta l\'anno (art. 35). Vi partecipano DL/dirigente, RSPP, MC e RLS. Si esaminano DVR, andamento infortuni/malattie professionali, idoneità DPI, programmi di formazione e informazione.' },
        { q: 'Posso avere un unico fornitore per sicurezza e salute?', a: 'Certamente. Element Sicurezza offre un servizio integrato: RSPP esterno, medico competente, corsi di formazione e consulenza DVR. Un solo interlocutore per tutte le obbligazioni del D.Lgs 81/08. Attivazione del servizio in 48 ore.' },
    ];

    const stats = [
        { icon: Building2, value: '300', label: 'Aziende Clienti' },
        { icon: Users, value: '5.000', label: 'Pazienti Seguiti' },
        { icon: Clock, value: 'Entro 48h', label: 'Attivazione Servizio' },
        { icon: Award, value: '15+', label: 'Anni Esperienza' },
        { icon: Star, value: '98%', label: 'Clienti Soddisfatti' },
        { icon: MapPin, value: 'Padova', label: 'e Provincia' },
    ];

    const structuredData = {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'MedicalOrganization',
                name: 'Element Sicurezza – Medicina del Lavoro',
                url: 'https://www.elementsicurezza.com/medicina-del-lavoro',
                telephone: '+39-351-623-9176',
                email: 'info@elementsicurezza.com',
                address: {
                    '@type': 'PostalAddress',
                    streetAddress: 'Via Bracciano 34',
                    addressLocality: 'Selvazzano Dentro',
                    postalCode: '35030',
                    addressRegion: 'PD',
                    addressCountry: 'IT',
                },
                medicalSpecialty: 'Occupational medicine',
                availableService: [
                    { '@type': 'MedicalProcedure', name: 'Visita medica preventiva D.Lgs 81/08' },
                    { '@type': 'MedicalProcedure', name: 'Sorveglianza sanitaria periodica' },
                    { '@type': 'MedicalProcedure', name: 'Audiometria tonale occupazionale' },
                    { '@type': 'MedicalProcedure', name: 'Spirometria occupazionale' },
                ],
                areaServed: { '@type': 'AdministrativeArea', name: 'Provincia di Padova' },
            },
            {
                '@type': 'FAQPage',
                mainEntity: faqs.map(faq => ({
                    '@type': 'Question',
                    name: faq.q,
                    acceptedAnswer: { '@type': 'Answer', text: faq.a },
                })),
            },
        ],
    };

    return (
        <PublicLayout>
            <SEOHead
                title="Medicina del Lavoro Padova | Sorveglianza Sanitaria Aziendale | Element Sicurezza"
                description="Sorveglianza sanitaria obbligatoria D.Lgs 81/08 a Padova: visite mediche preventive e periodiche, medico competente aziendale, esami strumentali. Attivazione in 48h. Preventivo gratuito."
                keywords={['medicina del lavoro', 'medico competente', 'sorveglianza sanitaria', 'visite mediche aziendali', 'D.Lgs 81/08', 'salute lavoratori', 'Padova', 'Selvazzano Dentro', 'medicina del lavoro Padova']}
                canonicalUrl="https://www.elementsicurezza.com/medicina-del-lavoro"
                ogTitle="Medicina del Lavoro | Element Sicurezza – Padova"
                ogDescription="Medico competente, sorveglianza sanitaria e visite mediche aziendali conformi D.Lgs 81/08. Attivazione in 48h. Serviamo tutta la provincia di Padova."
                ogType="website"
                structuredData={structuredData}
            />

            {/* HERO */}
            <HeroSection
                title={<>Medicina del Lavoro<br /><span style={{ color: 'var(--color-primary-300)' }}>Padova e Provincia</span></>}
                subtitle="Sorveglianza Sanitaria D.Lgs 81/08"
                description="Medico competente aziendale, visite mediche preventive e periodiche, protocollo sanitario personalizzato. Attivazione del servizio in 48 ore. Serviamo tutta la provincia di Padova da Selvazzano Dentro."
                backgroundVariant="gradient"
                backgroundPattern="diagonal-lines"
                primaryButton={{ text: 'Richiedi Preventivo Gratuito', href: '/contatti', icon: <ArrowRight className="w-5 h-5" /> }}
                secondaryButton={{ text: 'Chiama Ora', href: 'tel:+393516239176' }}
                stats={[
                    { value: '300', label: 'Aziende Servite', icon: <Building2 className="w-5 h-5" /> },
                    { value: 'Entro 48h', label: 'Attivazione', icon: <Clock className="w-5 h-5" />, highlight: true },
                    { value: '5.000', label: 'Pazienti/Anno', icon: <Stethoscope className="w-5 h-5" /> },
                    { value: 'Gratuito', label: 'Preventivo', icon: <CheckCircle className="w-5 h-5" /> },
                ]}
            />

            {/* NUMERI */}
            <section className="py-16 bg-gray-50">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-gray-900 mb-3">Dati INAIL 2023-2024: perché la Sorveglianza è Strategica</h2>
                        <p className="text-lg text-gray-600 max-w-2xl mx-auto">La sorveglianza sanitaria attiva riduce gli infortuni gravi e le malattie professionali, protegge il DL da responsabilità penali e riduce i costi assicurativi.</p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                        {stats.map((stat, i) => (
                            <div key={i} className="bg-white rounded-2xl p-6 text-center shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                                <stat.icon className="w-8 h-8 mx-auto mb-3 text-primary-600" />
                                <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                                <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-10 grid md:grid-cols-4 gap-4">
                        {[
                            { value: '585.356', label: 'Infortuni denunciati nel 2023 (fonte INAIL)', color: 'red' },
                            { value: '51.230', label: 'Malattie professionali (2023)', color: 'orange' },
                            { value: '€58 mld', label: 'Costo sociale annuo degli infortuni in Italia', color: 'amber' },
                            { value: '−23%', label: 'Riduzione infortuni gravi con sorveglianza attiva', color: 'green' },
                        ].map((d, i) => (
                            <div key={i} className={`bg-${d.color}-50 border border-${d.color}-200 rounded-xl p-5 text-center`}>
                                <div className={`text-2xl font-bold text-${d.color}-700`}>{d.value}</div>
                                <div className={`text-sm text-${d.color}-600 mt-1`}>{d.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* SERVIZI PRINCIPALI */}
            <section className="py-16 bg-white">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-gray-900 mb-3">Cosa Include il Nostro Servizio</h2>
                        <p className="text-gray-600 max-w-2xl mx-auto">Un servizio completo e integrato di medicina del lavoro per aziende di tutte le dimensioni</p>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[
                            { icon: Stethoscope, title: 'Visite Mediche Preventive', desc: 'Prima dell\'assunzione o cambio mansione, per verificare l\'idoneità del lavoratore alla mansione specifica con rischi.', badge: 'Obbligatoria' },
                            { icon: Calendar, title: 'Sorveglianza Periodica', desc: 'Visite di controllo a cadenza stabilita nel protocollo sanitario (annuale/biennale). Gestione automatica delle scadenze.', badge: 'Obbligatoria' },
                            { icon: ClipboardList, title: 'Protocollo Sanitario', desc: 'Elaborazione del protocollo personalizzato in base al DVR aziendale. Documento integrante del Sistema di Gestione Sicurezza.', badge: 'Personalizzato' },
                            { icon: FileText, title: 'Documentazione Legale', desc: 'Cartella sanitaria digitale, giudizi di idoneità, registro infortuni, relazione annuale (art. 40 D.Lgs 81/08) su piattaforma cloud.', badge: 'Digitale' },
                            { icon: Activity, title: 'Esami Strumentali', desc: 'Audiometria, spirometria, ECG, esami ematochimici, esame oculistico, visita osteoarticolare in base al profilo di rischio.', badge: 'Integrati' },
                            { icon: Users, title: 'Riunione Periodica', desc: 'Partecipazione alla riunione annuale (art. 35): analisi infortuni, idoneità DPI, aggiornamento protocollo sanitario con RSPP e RLS.', badge: 'Art. 35' },
                        ].map((service, i) => (
                            <div key={i} className="bg-gray-50 rounded-2xl p-6 hover:shadow-md transition-all hover:bg-white border border-transparent hover:border-gray-200">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0">
                                        <service.icon className="w-6 h-6 text-primary-700" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-bold text-gray-900">{service.title}</h3>
                                            <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">{service.badge}</span>
                                        </div>
                                        <p className="text-sm text-gray-600">{service.desc}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CHI SERVIAMO */}
            <section className="py-16 bg-gray-50">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-gray-900 mb-3">Chi Serviamo</h2>
                        <p className="text-gray-600 max-w-2xl mx-auto">Seguiamo realtà di ogni dimensione e settore, con soluzioni su misura per ciascuna</p>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
                        {[
                            { icon: Building2, title: 'Piccole e Medie Imprese', subtitle: 'fino a 100 dipendenti', desc: 'Artigiani, commercio, servizi, studi professionali. Protocollo sanitario semplice e prezzi accessibili. Unico interlocutore RSPP + MC.', color: 'blue' },
                            { icon: TrendingUp, title: 'Grandi Aziende', subtitle: '100+ dipendenti', desc: 'Industria, GDO, logistica, manifattura. Gestione multi-sede, report centralizzati, account manager dedicato e SLA garantito.', color: 'purple' },
                            { icon: Users, title: 'Cooperative', subtitle: 'sociali, di lavoro e di produzione', desc: 'Strutture con particolarità contrattuali e turnover elevato. Gestione scadenze automatica, visite rapide, documentazione digitale.', color: 'green' },
                            { icon: Stethoscope, title: 'Settore Sanitario e Assistenziale', subtitle: 'RSA, ambulatori, studi medici', desc: 'Rischi biologici, stress lavoro-correlato, MMC. Protocollo specializzato per operatori sanitari e socio-assistenziali.', color: 'teal' },
                            { icon: Activity, title: 'Edilizia e Industria', subtitle: 'cantieri, officine, produzione', desc: 'Rischi multipli: rumore, vibrazioni, polveri, agenti chimici. RSPP integrato e MC con esperienza nei settori ad alto rischio specifico.', color: 'orange' },
                            { icon: ClipboardList, title: 'Enti Pubblici e Scuole', subtitle: 'PA, istituti scolastici, comuni', desc: 'Conformità alle normative specifiche per il settore pubblico. Esperienza con D.Lgs 81/08 applicato agli Enti locali e al personale ATA.', color: 'indigo' },
                        ].map((seg, i) => (
                            <div key={i} className={`bg-white rounded-2xl p-6 border border-${seg.color}-100 hover:shadow-md hover:border-${seg.color}-300 transition-all`}>
                                <div className={`w-12 h-12 rounded-xl bg-${seg.color}-100 flex items-center justify-center mb-4`}>
                                    <seg.icon className={`w-6 h-6 text-${seg.color}-700`} />
                                </div>
                                <h3 className="font-bold text-gray-900 mb-0.5">{seg.title}</h3>
                                <p className={`text-xs text-${seg.color}-600 font-medium mb-3`}>{seg.subtitle}</p>
                                <p className="text-sm text-gray-600">{seg.desc}</p>
                            </div>
                        ))}
                    </div>
                    <div className="mt-10 text-center">
                        <p className="text-gray-600 mb-4">Non trovi la tua realtà? <strong>Serviamo ogni tipologia di azienda</strong> nel Veneto.</p>
                        <PublicButton to="/contatti" variant="primary">Richiedi Preventivo Gratuito</PublicButton>
                    </div>
                </div>
            </section>

            {/* RISCHI E PROTOCOLLI */}
            <section className="py-16 bg-white">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-gray-900 mb-3">Accertamenti per Ogni Profilo di Rischio</h2>
                        <p className="text-gray-600 max-w-2xl mx-auto">Il medico competente elabora un protocollo sanitario personalizzato basato sul DVR aziendale. <strong>Gli accertamenti e la periodicità delle visite possono variare</strong> in base al protocollo sanitario specifico, che viene personalizzato per ogni dipendente e per ogni realtà lavorativa.</p>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {ESAMI_PROTOCOLLI.map((proto, i) => (
                            <div key={i} className={`bg-${proto.color}-50 border border-${proto.color}-200 rounded-xl p-5`}>
                                <div className="flex items-center gap-3 mb-3">
                                    <proto.icon className={`w-5 h-5 text-${proto.color}-600`} />
                                    <h3 className={`font-bold text-${proto.color}-800`}>{proto.risk}</h3>
                                </div>
                                <p className="text-sm text-gray-700 mb-2"><strong>Accertamenti:</strong> {proto.exams}</p>
                                <p className="text-sm text-gray-600"><strong>Frequenza:</strong> {proto.freq}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* NORMATIVA */}
            <section className="py-16 bg-gray-50">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-10">
                        <h2 className="text-3xl font-bold text-gray-900 mb-3">Riferimenti Normativi</h2>
                        <p className="text-gray-600">La sorveglianza sanitaria è disciplinata dal D.Lgs 81/2008 "Testo Unico Sicurezza"</p>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">
                        {NORMATIVA_ITEMS.map((item, i) => (
                            <div key={i} className="bg-white border border-gray-200 rounded-xl p-5 flex gap-4">
                                <span className="bg-primary-100 text-primary-700 text-xs font-bold px-3 py-2 rounded-lg whitespace-nowrap h-fit">{item.art}</span>
                                <p className="text-sm text-gray-700">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* DOCUMENTAZIONE */}
            <section className="py-16 bg-white">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-gray-900 mb-3">Documentazione Obbligatoria</h2>
                        <p className="text-gray-600 max-w-2xl mx-auto">Il medico competente è responsabile della produzione e conservazione di questi documenti. Con Element Sicurezza tutto è digitale.</p>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {DOCUMENTI_OBBLIGATORI.map((doc, i) => (
                            <div key={i} className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0">
                                        <doc.icon className="w-5 h-5 text-primary-700" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900 text-sm mb-1">{doc.title}</h3>
                                        <span className="text-xs text-primary-600 bg-primary-50 px-2 py-0.5 rounded mb-2 inline-block">{doc.law}</span>
                                        <p className="text-xs text-gray-600 mb-2">{doc.desc}</p>
                                        <p className="text-xs text-gray-500"><strong>Conservazione:</strong> {doc.years}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* TESTIMONIALS */}
            <section className="py-16 bg-gray-50">
                <div className="container mx-auto px-4">
                    <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Cosa Dicono le Aziende Clienti</h2>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            { name: 'Ing. Alessandro Ferrari', role: 'Resp. Sicurezza', company: 'Logistica Padova SRL (120 dip.)', txt: 'Attivazione in 2 giorni, protocollo sanitario preciso per i nostri rischi logistici. Il sistema digitale per la gestione delle scadenze ci ha fatto risparmiare ore di lavoro ogni mese.' },
                            { name: 'Marco Conti', role: 'RSPP', company: 'Metalmeccanica Conti SRL (45 dip.)', txt: 'Rischi multipli: rumore, vibrazioni, agenti chimici. Il MC ha strutturato un protocollo molto preciso. L\'ultima ispezione UOPSAL è andata benissimo, documentazione ineccepibile.' },
                            { name: 'Dott.ssa Giorgia Neri', role: 'Titolare', company: 'Studio Dentistico (8 dip.)', txt: 'Ambiente sanitario, esposizione ad agenti biologici. Avevo bisogno di un MC che conoscesse il settore. Element ha risposto in 24 ore. Professionalità al top.' },
                            { name: 'Roberto Salamone', role: 'Direttore Operativo', company: 'GDO Distribuzione (300+ dip.)', txt: '7 punti vendita sul territorio. Element ha predisposto un calendario centralizzato per le visite. Sistema di gestione documentale eccellente e altamente scalabile.' },
                        ].map((t, i) => (
                            <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                                <div className="flex mb-3">
                                    {[...Array(5)].map((_, j) => <Star key={j} className="w-4 h-4 text-yellow-400 fill-yellow-400" />)}
                                </div>
                                <p className="text-gray-700 text-sm italic mb-4">"{t.txt}"</p>
                                <div>
                                    <div className="font-bold text-gray-900 text-sm">{t.name}</div>
                                    <div className="text-xs text-gray-500">{t.role} — {t.company}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* PARTNER E COLLABORAZIONI */}
            <section className="py-16 bg-gray-50">
                <div className="container mx-auto px-4 max-w-4xl">
                    <div className="text-center mb-12">
                        <div className="inline-flex items-center gap-2 bg-primary-50 text-primary-700 px-3 py-1 rounded-full text-sm font-medium mb-4">
                            <Users className="w-4 h-4" />
                            Partnership e Collaborazioni
                        </div>
                        <h2 className="text-3xl font-bold text-gray-900 mb-3">Le Nostre Collaborazioni</h2>
                        <p className="text-gray-600 max-w-2xl mx-auto">Collaboriamo con le principali associazioni datoriali del territorio per portare sicurezza e medicina del lavoro alle imprese associate</p>
                    </div>
                    <div className="grid md:grid-cols-2 gap-8">
                        <a href="https://www.confisipadova.it" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-4 p-8 bg-white rounded-2xl border border-gray-100 hover:border-primary-200 hover:shadow-md transition-all no-underline">
                            <img
                                src="/assets/logos/confisi-logo.png"
                                style={{ background: 'transparent' }}
                                alt="CONFISI – Confederazione Italiana Sviluppo Imprese"
                                className="h-20 w-auto max-w-full object-contain"
                                onError={(e) => {
                                    const el = e.currentTarget as HTMLImageElement;
                                    el.style.display = 'none';
                                    const next = el.nextElementSibling as HTMLElement | null;
                                    if (next) next.style.display = 'flex';
                                }}
                            />
                            <div style={{ display: 'none' }} className="flex-col items-center gap-1" aria-hidden="true">
                                <div className="text-2xl font-black text-gray-900">CONFISI</div>
                                <div className="text-xs text-gray-500 text-center">CONFEDERAZIONE ITALIANA SVILUPPO IMPRESE</div>
                            </div>
                            <div className="text-center">
                                <h3 className="font-bold text-gray-900">CONFISI</h3>
                                <p className="text-sm text-gray-600 mt-1">Confederazione Italiana Sviluppo Imprese — Offriamo formazione sicurezza e sorveglianza sanitaria alle aziende associate a condizioni dedicate.</p>
                            </div>
                        </a>
                        <a href="https://www.confartigianatopadova.it" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-4 p-8 bg-white rounded-2xl border border-gray-100 hover:border-primary-200 hover:shadow-md transition-all no-underline">
                            <img
                                src="/assets/logos/confartigianato-padova-logo.png"
                                alt="Confartigianato Imprese Padova"
                                className="h-20 w-auto max-w-full object-contain"
                                onError={(e) => {
                                    const el = e.currentTarget as HTMLImageElement;
                                    el.style.display = 'none';
                                    const next = el.nextElementSibling as HTMLElement | null;
                                    if (next) next.style.display = 'flex';
                                }}
                            />
                            <div style={{ display: 'none' }} className="flex-col items-center gap-1" aria-hidden="true">
                                <div className="text-xl font-bold text-blue-800">Confartigianato</div>
                                <div className="text-sm font-semibold text-blue-700">Imprese PADOVA</div>
                            </div>
                            <div className="text-center">
                                <h3 className="font-bold text-gray-900">Confartigianato Imprese Padova</h3>
                                <p className="text-sm text-gray-600 mt-1">Partner per i servizi di medicina del lavoro e sorveglianza sanitaria alle imprese artigiane del territorio padovano.</p>
                            </div>
                        </a>
                    </div>
                    <div className="mt-8 flex justify-center">
                        <a href="https://www.fimiebap.it/" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-4 p-8 bg-white rounded-2xl border border-gray-100 hover:border-primary-200 hover:shadow-md transition-all no-underline w-full max-w-lg">
                            <img
                                src="/assets/logos/fimi-ebap-logo.jpg"
                                alt="FIMI/EBAP – Ente Bilaterale per l'Agricoltura Padovana"
                                className="h-20 w-auto max-w-full object-contain"
                                onError={(e) => {
                                    const el = e.currentTarget as HTMLImageElement;
                                    el.style.display = 'none';
                                    const next = el.nextElementSibling as HTMLElement | null;
                                    if (next) next.style.display = 'flex';
                                }}
                            />
                            <div style={{ display: 'none' }} className="flex-col items-center gap-1" aria-hidden="true">
                                <div className="text-2xl font-black text-gray-900">FIMI/EBAP</div>
                                <div className="text-xs text-gray-500 text-center">ENTE BILATERALE PER L'AGRICOLTURA PADOVANA</div>
                            </div>
                            <div className="text-center">
                                <h3 className="font-bold text-gray-900">FIMI/EBAP</h3>
                                <p className="text-sm text-gray-600 mt-1">Ente Bilaterale per l'Agricoltura Padovana — Partner per i servizi di formazione sicurezza sul lavoro e medicina del lavoro a favore dei lavoratori agricoli padovani.</p>
                            </div>
                        </a>
                    </div>
                </div>
            </section>

            {/* FAQ */}
            <section className="py-16 bg-white">
                <div className="container mx-auto px-4 max-w-3xl">
                    <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Domande Frequenti sulla Medicina del Lavoro</h2>
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

            {/* CTA + CONTATTI */}
            <section className="py-16" style={{ background: 'linear-gradient(135deg, #283646 0%, #1d2f40 100%)' }}>
                <div className="container mx-auto px-4">
                    <div className="grid lg:grid-cols-2 gap-12 items-start">
                        <div className="text-white">
                            <h2 className="text-3xl font-bold mb-4">Attiva il Servizio di Medicina del Lavoro</h2>
                            <p className="text-white/90 mb-6 text-lg">Preventivo gratuito in 24 ore. Attivazione entro 48 ore. Serviamo tutto il Veneto.</p>
                            <div className="space-y-3">
                                {[
                                    'Medici del lavoro iscritti all\'albo',
                                    'Protocollo sanitario personalizzato',
                                    'Piattaforma digitale per scadenze e documentazione',
                                    'RSPP integrato disponibile',
                                    'Nessun costo hidden',
                                ].map((f, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <CheckCircle className="w-5 h-5 text-primary-300 flex-shrink-0" />
                                        <span className="text-white/95">{f}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-8 flex flex-wrap gap-4">
                                <a href="tel:+393516239176" className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-full font-medium transition-all">
                                    <Phone className="w-5 h-5" />+39 351 623 9176
                                </a>
                                <a href="https://wa.me/393516239176" className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-full font-medium transition-all">
                                    WhatsApp
                                </a>
                            </div>
                        </div>
                        <div className="bg-white rounded-2xl p-8 shadow-xl">
                            <h3 className="text-xl font-bold text-gray-900 mb-6">Richiedi Preventivo Gratuito</h3>
                            <ContactForm
                                variant="compact"
                                subjects={[
                                    { value: 'medicina-preventiva', label: 'Visita Medica Preventiva' },
                                    { value: 'medicina-periodica', label: 'Sorveglianza Periodica' },
                                    { value: 'mc-aziendale', label: 'Medico Competente Aziendale' },
                                    { value: 'protocollo', label: 'Elaborazione Protocollo Sanitario' },
                                    { value: 'preventivo', label: 'Preventivo Personalizzato' },
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

const MedicinaDelLavoroMedica: React.FC = () => {
    const [openFaq, setOpenFaq] = useState<number | null>(null);

    const faqs = [
        { q: 'Cos\'è la medicina del lavoro e quando è obbligatoria?', a: 'La medicina del lavoro è la branca della medicina che tutela la salute dei lavoratori in relazione al loro ambiente di lavoro. La sorveglianza sanitaria è obbligatoria per tutti i lavoratori esposti a rischi specifici (D.Lgs 81/08): rumore, agenti chimici, videoterminali ≥20h/settimana, MMC, lavoro notturno e altri. Element Medica offre il servizio a Selvazzano Dentro per aziende di tutta la provincia di Padova.' },
        { q: 'Quali esami si fanno durante la visita medica del lavoro?', a: 'Gli accertamenti dipendono dal profilo di rischio definito nel protocollo sanitario: esame obiettivo, esami ematici, spirometria per rischi respiratori, audiometria per il rumore, ECG per lavoro notturno e lavoro a rischio cardiovascolare, esame oculistico per videoterminali, visite osteoarticolari per MMC.' },
        { q: 'Quanto dura la visita medica e quando devo farla?', a: 'La visita medica preventiva avviene prima dell\'assunzione (o del cambio mansione) e dura circa 15-30 minuti inclusi gli accertamenti. Le visite periodiche si ripetono con cadenza definita nel protocollo: solitamente annuale o biennale. Element Medica offre prenotazione rapida anche con breve preavviso.' },
        { q: 'Posso fare la visita medica del lavoro qui a Element Medica?', a: 'Sì, Element Medica a Selvazzano Dentro offre completo il servizio di medicina del lavoro: visita medica, accertamenti integrativi (audiometria, spirometria, ECG, esami ematici, visita oculistica), giudizio di idoneità e compilazione della cartella sanitaria. Siamo a 10 minuti dal centro di Padova.' },
        { q: 'Serve prenotare la visita medica del lavoro?', a: 'Sì, è necessario prenotare. Puoi farlo online su elementmedica.com, telefonicamente al +39 351 318 1574 (Lun-Ven 8:00-19:30, Sab 8:00-13:00) o direttamente in sede.' },
        { q: 'Cosa succede dopo la visita medica?', a: 'Il medico del lavoro emette il giudizio di idoneità (idoneo, idoneo con prescrizioni/limitazioni, non idoneo temporaneamente o permanentemente). Il documento viene consegnato al lavoratore e al datore di lavoro. In caso di non idoneità, il lavoratore può ricorrere entro 30 giorni all\'organo di vigilanza come lo SPISAL per il Veneto.' },
        { q: 'Quanto costa una visita medica del lavoro?', a: 'Il costo dipende dagli accertamenti previsti dal protocollo sanitario aziendale. Per un preventivo personalizzato o per accordi aziendali (tariffe per aziende con molti dipendenti), contatta Element Medica al +39 351 318 1574.' },
        { q: 'Element Medica può essere nominata come medico competente della mia azienda?', a: 'Sì. Element Medica può assumere l\'incarico di medico competente aziendale come previsto dall\'art. 38 D.Lgs 81/08. Collaboriamo con aziende di diverse dimensioni nella provincia di Padova, elaborando protocolli sanitari personalizzati e gestendo tutta la documentazione in forma digitale.' },
    ];

    const structuredData = {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'MedicalOrganization',
                name: 'Element Medica – Poliambulatorio Selvazzano Dentro',
                url: 'https://www.elementmedica.com/medicina-del-lavoro',
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
                medicalSpecialty: 'Occupational medicine',
                openingHoursSpecification: [
                    { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], opens: '08:00', closes: '19:30' },
                    { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Saturday'], opens: '08:00', closes: '13:00' },
                ],
                availableService: [
                    { '@type': 'MedicalProcedure', name: 'Visita medica del lavoro preventiva' },
                    { '@type': 'MedicalProcedure', name: 'Sorveglianza sanitaria periodica D.Lgs 81/08' },
                    { '@type': 'MedicalProcedure', name: 'Audiometria occupazionale' },
                    { '@type': 'MedicalProcedure', name: 'Spirometria occupazionale' },
                    { '@type': 'MedicalProcedure', name: 'Giudizio di idoneità alla mansione' },
                    { '@type': 'MedicalProcedure', name: 'Medico competente aziendale' },
                ],
                areaServed: { '@type': 'AdministrativeArea', name: 'Provincia di Padova' },
            },
            {
                '@type': 'FAQPage',
                mainEntity: faqs.map(f => ({
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
                title="Medicina del Lavoro Selvazzano Dentro Padova | Poliambulatorio Element Medica"
                description="Visita medica del lavoro a Selvazzano Dentro vicino Padova: visite preventive e periodiche, audiometria, spirometria, ECG. Prenotazione online. Medico competente aziendale. Tel +39 351 318 1574."
                keywords={['medicina del lavoro Padova', 'medico competente Padova', 'visita medica aziendale', 'visite mediche Padova', 'visite mediche Selvazzano', 'visita medica del lavoro', 'poliambulatorio Selvazzano Dentro', 'sorveglianza sanitaria aziendale', 'audiometria', 'spirometria', 'visita medica preventiva', 'idoneità mansione']}
                canonicalUrl="https://www.elementmedica.com/medicina-del-lavoro"
                ogTitle="Medicina del Lavoro | Element Medica – Selvazzano Dentro (PD)"
                ogDescription="Visita medica del lavoro, sorveglianza sanitaria e medico competente a Selvazzano Dentro (PD). Online booking. +39 351 318 1574."
                ogType="website"
                structuredData={structuredData}
            />

            {/* HERO */}
            <HeroSection
                title={<>Medicina del Lavoro<br /><span style={{ color: 'var(--color-primary-300)' }}>a Selvazzano Dentro (Padova)</span></>}
                subtitle="Visite Mediche e Sorveglianza Sanitaria D.Lgs 81/08"
                description="Visite mediche preventive e periodiche per lavoratori, giudizi di idoneità, audiometria, spirometria, ECG e tutti gli accertamenti previsti dal protocollo sanitario aziendale. A 10 minuti da Padova."
                backgroundVariant="medical-teal"
                primaryButton={{ text: 'Prenota Online', href: '/prenota', icon: <Calendar className="w-5 h-5" /> }}
                secondaryButton={{ text: 'Chiama +39 351 318 1574', href: 'tel:+393513181574' }}
                stats={[
                    { value: '30+', label: 'Specialità Mediche', icon: <Heart className="w-5 h-5" /> },
                    { value: 'Rapida', label: 'Prenotazione', icon: <Clock className="w-5 h-5" />, highlight: true },
                    { value: '10 min', label: 'da Padova', icon: <MapPin className="w-5 h-5" /> },
                    { value: 'Digitale', label: 'Documentazione', icon: <FileText className="w-5 h-5" /> },
                ]}
                variant="medical"
            />

            {/* PERCHÉ ELEMENT MEDICA */}
            <section className="py-16 bg-white">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-gray-900 mb-3">Medicina del Lavoro al Poliambulatorio Element Medica</h2>
                        <p className="text-gray-600 max-w-2xl mx-auto">Tutto in un'unica sede a Selvazzano Dentro. Visita medica, accertamenti e documentazione a norma di legge in una sola seduta.</p>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[
                            { icon: Stethoscope, title: 'Visite Preventive e Periodiche', desc: 'Prima assunzione, cambio mansione e visite periodiche con cadenza da protocollo sanitario aziendale.' },
                            { icon: Volume2, title: 'Audiometria Tonale', desc: 'Esame audiometrico per lavoratori esposti a rumore.' },
                            { icon: Activity, title: 'Spirometria', desc: 'Valutazione della funzionalità respiratoria per rischi da polveri, agenti chimici e fumi.' },
                            { icon: Heart, title: 'Elettrocardiogramma ECG', desc: 'ECG a riposo per mansioni comportanti rischio cardiovascolare.' },
                            { icon: Monitor, title: 'Esame Oculistico', desc: 'Visita oculistica specialistica per addetti VDT e attività con rischi visivi specifici.' },
                            { icon: FileText, title: 'Cartella Sanitaria Digitale', desc: 'Documentazione legale completa — cartella, giudizio idoneità, relazione annuale — in formato digitale sicuro.' },
                        ].map((service, i) => (
                            <div key={i} className="flex gap-4 p-6 bg-teal-50 rounded-2xl border border-teal-100 hover:shadow-md transition-all">
                                <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center flex-shrink-0">
                                    <service.icon className="w-6 h-6 text-teal-700" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 mb-1">{service.title}</h3>
                                    <p className="text-sm text-gray-600">{service.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* RISCHI E ACCERTAMENTI */}
            <section className="py-16 bg-gray-50">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-gray-900 mb-3">Accertamenti per Ogni Profilo di Rischio</h2>
                        <p className="text-gray-600 max-w-2xl mx-auto">Il medico competente elabora un protocollo sanitario personalizzato basato sul DVR aziendale. <strong>Gli accertamenti e la periodicità delle visite possono variare</strong> in base al protocollo sanitario specifico, che viene personalizzato per ogni dipendente e per ogni realtà lavorativa.</p>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {ESAMI_PROTOCOLLI.map((proto, i) => (
                            <div key={i} className={`bg-${proto.color}-50 border border-${proto.color}-200 rounded-xl p-5`}>
                                <div className="flex items-center gap-3 mb-3">
                                    <proto.icon className={`w-5 h-5 text-${proto.color}-600`} />
                                    <h3 className={`font-bold text-${proto.color}-800`}>{proto.risk}</h3>
                                </div>
                                <p className="text-sm text-gray-700 mb-2"><strong>Accertamenti:</strong> {proto.exams}</p>
                                <p className="text-sm text-gray-600"><strong>Frequenza:</strong> {proto.freq}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* PROCESSO */}
            <section className="py-16 bg-white">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-gray-900 mb-3">Come Funziona la Visita Medica del Lavoro</h2>
                        <p className="text-gray-600">Processo semplice, rapido e completamente digitale</p>
                    </div>
                    <div className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto">
                        {[
                            { n: '01', title: 'Prenota Online', desc: 'Scegli data e orario su elementmedica.com o chiama il +39 351 318 1574.' },
                            { n: '02', title: 'Porta il DVR (o delegaci)', desc: 'Porta il Documento di Valutazione dei Rischi della tua azienda. In assenza, possiamo richiedere al DL.' },
                            { n: '03', title: 'Visita e Accertamenti', desc: 'Visita medica + esami strumentali previsti dal protocollo sanitario (audiometria, spirometria, ecc.).' },
                            { n: '04', title: 'Giudizio e Documentazione', desc: 'Ricevi il giudizio di idoneità e la documentazione digitale firmata dal medico competente.' },
                        ].map((step, i) => (
                            <div key={i} className="text-center">
                                <div className="w-14 h-14 rounded-full bg-teal-100 flex items-center justify-center mx-auto mb-4">
                                    <span className="text-teal-800 font-bold text-lg">{step.n}</span>
                                </div>
                                <h3 className="font-bold text-gray-900 mb-2">{step.title}</h3>
                                <p className="text-sm text-gray-600">{step.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* COME ADEGUARSI — STEP AZIENDALI */}
            <section className="py-16 bg-gray-50">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-gray-900 mb-3">Come Adeguarsi alla Medicina del Lavoro</h2>
                        <p className="text-gray-600 max-w-2xl mx-auto">6 step per mettere in regola la tua azienda con il D.Lgs 81/08 – Titolo I e IV</p>
                    </div>
                    <div className="relative max-w-4xl mx-auto">
                        <div className="hidden md:block absolute left-8 top-8 bottom-8 w-0.5 bg-teal-200" />
                        <div className="space-y-6">
                            {[
                                { n: '01', icon: ClipboardList, title: 'Nomina il Medico Competente', desc: 'Il Datore di Lavoro nomina per iscritto il MC (art. 18 D.Lgs 81/08) qualora esistano lavoratori esposti a rischi specifici. La nomina deve avvenire prima che il lavoratore venga assegnato alla mansione a rischio.', tag: 'Obbligo immediato' },
                                { n: '02', icon: FileText, title: 'Condividi il DVR con il Medico Competente', desc: 'Il Documento di Valutazione dei Rischi viene redatto dall\'RSPP in collaborazione con il Medico Competente che elabora il Protocollo Sanitario.', tag: 'Con DVR aziendale' },
                                { n: '03', icon: Shield, title: 'Definisci il Protocollo Sanitario', desc: 'Il Medico Competente redige il protocollo sanitario: per ogni mansione a rischio identifica visita medica, accertamenti integrativi (audiometria, spirometria, ECG, esami ematici…) e periodicità. Documento integrante del DVR.', tag: 'Personalizzato' },
                                { n: '04', icon: Calendar, title: 'Pianifica le Visite Mediche', desc: 'Si organizzano le visite preventive (prima dell\'assunzione o cambio mansione) e il calendario per le visite periodiche. Element Medica gestisce automaticamente le scadenze e invia reminder al datore di lavoro.', tag: 'Automatizzato' },
                                { n: '05', icon: Stethoscope, title: 'Esegui le Visite e gli Esami', desc: 'I lavoratori vengono visitati dal medico del lavoro. Vengono eseguiti tutti gli accertamenti del protocollo (audiometria, spirometria, ECG, esame oculistico, ematici). Il giudizio di idoneità viene rilasciato in giornata.', tag: 'Rapido e completo' },
                                { n: '06', icon: CheckCircle, title: 'Gestione Continua e Aggiornamenti', desc: 'Il servizio prosegue con sorveglianza periodica, aggiornamento protocollo a ogni modifica del DVR, relazione annuale (art. 40), partecipazione alla riunione periodica e supporto per l\'ottimizzazione della produttività aziendale.', tag: 'Ongoing' },
                            ].map((step, i) => (
                                <div key={i} className="flex gap-6 items-start relative">
                                    <div className="w-16 h-16 rounded-full bg-teal-600 flex flex-col items-center justify-center flex-shrink-0 z-10 shadow-md">
                                        <step.icon className="w-6 h-6 text-white" />
                                        <span className="text-[10px] text-teal-200 font-bold">{step.n}</span>
                                    </div>
                                    <div className="flex-1 bg-white rounded-2xl p-5 shadow-sm border border-teal-100 hover:shadow-md transition-shadow">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-bold text-gray-900">{step.title}</h3>
                                            <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">{step.tag}</span>
                                        </div>
                                        <p className="text-sm text-gray-600">{step.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* SEI SODDISFATTO DEL TUO SERVIZIO ATTUALE? */}
            <section className="py-16 bg-white">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-12">
                        <span className="text-sm font-semibold text-teal-600 uppercase tracking-wider">Confronto</span>
                        <h2 className="text-3xl font-bold text-gray-900 mt-2 mb-3">Sei davvero soddisfatto del tuo attuale servizio di Medicina del Lavoro?</h2>
                        <p className="text-gray-600 max-w-2xl mx-auto">Molte aziende continuano con lo stesso fornitore per abitudine, anche quando il servizio lascia a desiderare. Ecco cosa dovrebbe offrirti un servizio di medicina del lavoro moderno.</p>
                    </div>
                    <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-10">
                        <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
                            <h3 className="font-bold text-red-800 mb-4 text-lg flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5" /> Segnali che qualcosa non va
                            </h3>
                            <ul className="space-y-3">
                                {[
                                    'Attendi settimane per prenotare una visita urgente',
                                    'Ricevi solo il giudizio di idoneità, senza supporto documentale',
                                    'Non sai se il tuo protocollo sanitario è aggiornato al DVR attuale',
                                    'Gestisci le scadenze delle visite su un foglio Excel',
                                    'Il medico non conosce il profilo di rischio specifico della tua azienda',
                                    'La documentazione è cartacea e difficile da rintracciare',
                                    'Non ricevi mai una relazione annuale o è incompleta',
                                ].map((item, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm text-red-700">
                                        <span className="w-4 h-4 rounded-full bg-red-200 flex items-center justify-center flex-shrink-0 mt-0.5 text-red-600 font-bold text-xs">✗</span>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="bg-teal-50 border border-teal-200 rounded-2xl p-6">
                            <h3 className="font-bold text-teal-800 mb-4 text-lg flex items-center gap-2">
                                <CheckCircle className="w-5 h-5" /> Come lavoriamo noi
                            </h3>
                            <ul className="space-y-3">
                                {[
                                    'Prenotazione online in pochi minuti, anche con breve preavviso',
                                    'Cartella sanitaria digitale completa aggiornata in tempo reale',
                                    'Protocollo sanitario revisionato ogni volta che cambia il DVR',
                                    'Scadenze gestite automaticamente con notifiche al DL',
                                    'MC specializzato che conosce i rischi specifici del tuo settore',
                                    'Documentazione digitale sempre disponibile e tracciabile',
                                    'Relazione annuale (art. 40) inclusa nel servizio, puntuale',
                                ].map((item, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm text-teal-700">
                                        <CheckCircle className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                    <div className="bg-teal-700 rounded-2xl p-8 text-center text-white max-w-2xl mx-auto">
                        <h3 className="text-xl font-bold mb-2">Cambia fornitore è più semplice di quanto pensi</h3>
                        <p className="text-white/90 mb-6">Gestiamo noi la transizione. Prendiamo in carico la documentazione pregressa, aggiorniamo il protocollo e siamo operativi da subito. Zero burocrazia per te.</p>
                        <div className="flex flex-wrap justify-center gap-4">
                            <PublicButton to="/prenota" variant="medical" size="lg">
                                <Calendar className="w-5 h-5 mr-2" />Prenota una Consulenza Gratuita
                            </PublicButton>
                            <a href="tel:+393513181574" className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-full font-medium transition-all">
                                <Phone className="w-5 h-5" />+39 351 318 1574
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            {/* PARTNER E COLLABORAZIONI */}
            <section className="py-16 bg-white">
                <div className="container mx-auto px-4 max-w-4xl">
                    <div className="text-center mb-12">
                        <div className="inline-flex items-center gap-2 bg-teal-50 text-teal-700 px-3 py-1 rounded-full text-sm font-medium mb-4">
                            <Users className="w-4 h-4" />
                            Partnership e Collaborazioni
                        </div>
                        <h2 className="text-3xl font-bold text-gray-900 mb-3">Le Nostre Collaborazioni</h2>
                        <p className="text-gray-600 max-w-2xl mx-auto">Collaboriamo con le principali associazioni datoriali del territorio per portare medicina del lavoro e sorveglianza sanitaria alle imprese associate</p>
                    </div>
                    <div className="grid md:grid-cols-2 gap-8">
                        <a href="https://www.confisipadova.it" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-4 p-8 bg-teal-50 rounded-2xl border border-teal-100 hover:border-teal-200 hover:shadow-md transition-all no-underline">
                            <img
                                src="/assets/logos/confisi-logo.png"
                                style={{ background: 'transparent' }}
                                alt="CONFISI – Confederazione Italiana Sviluppo Imprese"
                                className="h-20 w-auto max-w-full object-contain"
                                onError={(e) => {
                                    const el = e.currentTarget as HTMLImageElement;
                                    el.style.display = 'none';
                                    const next = el.nextElementSibling as HTMLElement | null;
                                    if (next) next.style.display = 'flex';
                                }}
                            />
                            <div style={{ display: 'none' }} className="flex-col items-center gap-1" aria-hidden="true">
                                <div className="text-2xl font-black text-gray-900">CONFISI</div>
                                <div className="text-xs text-gray-500 text-center">CONFEDERAZIONE ITALIANA SVILUPPO IMPRESE</div>
                            </div>
                            <div className="text-center">
                                <h3 className="font-bold text-gray-900">CONFISI</h3>
                                <p className="text-sm text-gray-600 mt-1">Confederazione Italiana Sviluppo Imprese — Offriamo visite mediche del lavoro alle aziende associate a condizioni dedicate.</p>
                            </div>
                        </a>
                        <a href="https://www.confartigianatopadova.it" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-4 p-8 bg-teal-50 rounded-2xl border border-teal-100 hover:border-teal-200 hover:shadow-md transition-all no-underline">
                            <img
                                src="/assets/logos/confartigianato-padova-logo.png"
                                alt="Confartigianato Imprese Padova"
                                className="h-20 w-auto max-w-full object-contain"
                                onError={(e) => {
                                    const el = e.currentTarget as HTMLImageElement;
                                    el.style.display = 'none';
                                    const next = el.nextElementSibling as HTMLElement | null;
                                    if (next) next.style.display = 'flex';
                                }}
                            />
                            <div style={{ display: 'none' }} className="flex-col items-center gap-1" aria-hidden="true">
                                <div className="text-xl font-bold text-blue-800">Confartigianato</div>
                                <div className="text-sm font-semibold text-blue-700">Imprese PADOVA</div>
                            </div>
                            <div className="text-center">
                                <h3 className="font-bold text-gray-900">Confartigianato Imprese Padova</h3>
                                <p className="text-sm text-gray-600 mt-1">Partner per i servizi di medicina del lavoro e sorveglianza sanitaria alle imprese artigiane del territorio padovano.</p>
                            </div>
                        </a>
                    </div>
                    <div className="mt-8 flex justify-center">
                        <a href="https://www.fimiebap.it/" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-4 p-8 bg-teal-50 rounded-2xl border border-teal-100 hover:border-teal-200 hover:shadow-md transition-all no-underline w-full max-w-lg">
                            <img
                                src="/assets/logos/fimi-ebap-logo.jpg"
                                alt="FIMI EBAP – Ente Bilaterale per l'Agricoltura Padovana"
                                className="h-20 w-auto max-w-full object-contain"
                                onError={(e) => {
                                    const el = e.currentTarget as HTMLImageElement;
                                    el.style.display = 'none';
                                    const next = el.nextElementSibling as HTMLElement | null;
                                    if (next) next.style.display = 'flex';
                                }}
                            />
                            <div style={{ display: 'none' }} className="flex-col items-center gap-1" aria-hidden="true">
                                <div className="text-2xl font-black text-gray-900">FIMI/EBAP</div>
                                <div className="text-xs text-gray-500 text-center">ENTE BILATERALE PER L'AGRICOLTURA PADOVANA</div>
                            </div>
                            <div className="text-center">
                                <h3 className="font-bold text-gray-900">FIMI/EBAP</h3>
                                <p className="text-sm text-gray-600 mt-1">Ente Bilaterale per l'Agricoltura Padovana — Fondo Integrazione Indennità Malattia e Infortunio Lavoratori Agricoli. Partner per i servizi di medicina del lavoro e sorveglianza sanitaria in agricoltura.</p>
                            </div>
                        </a>
                    </div>
                </div>
            </section>

            {/* FAQ */}
            <section className="py-16 bg-gray-50">
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

            {/* CTA */}
            <section className="py-16 bg-teal-700 text-white">
                <div className="container mx-auto px-4 text-center">
                    <div className="max-w-2xl mx-auto">
                        <h2 className="text-3xl font-bold mb-4">Prenota la Visita di Medicina del Lavoro</h2>
                        <p className="text-white/90 text-lg mb-8">Poliambulatorio Element Medica • Via Bracciano 34, Selvazzano Dentro (PD) • A 10 minuti da Padova</p>
                        <div className="flex flex-wrap justify-center gap-4">
                            <PublicButton to="/prenota" variant="medical" size="lg">
                                <Calendar className="w-5 h-5 mr-2" />Prenota Visita
                            </PublicButton>
                            <a href="tel:+393513181574" className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-8 py-4 rounded-full font-bold text-lg transition-all">
                                <Phone className="w-5 h-5" />+39 351 318 1574
                            </a>
                        </div>
                        <p className="text-white/70 text-sm mt-6">Lun-Ven 8:00-19:30 | Sab 8:00-13:00</p>
                    </div>
                </div>
            </section>
        </PublicLayout>
    );
};

// ─────────────────────────────────────────────────────────────────
// EXPORT BRAND-AWARE
// ─────────────────────────────────────────────────────────────────

const MedicinaDelLavoroPage: React.FC = () => {
    return isMedica ? <MedicinaDelLavoroMedica /> : <MedicinaDelLavoroSicurezza />;
};

export default MedicinaDelLavoroPage;
