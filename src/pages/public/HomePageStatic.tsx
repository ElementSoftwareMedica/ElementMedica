/**
 * HomePageStatic
 *
 * Homepage STATICA brand-aware.
 * NON usa CMS API — contenuto hardcoded per SEO perfetto.
 * Widget dinamici (calendario corsi, prenotazioni) caricati dal tenant Element SRL.
 */

import React, { useState } from 'react';
import {
    GraduationCap, Shield, Stethoscope, CheckCircle,
    Phone, ArrowRight, Clock, Users, Award, Star,
    Building2, ChevronDown, TrendingUp, Heart,
    FileCheck, HeadphonesIcon, BookOpen, MapPin,
    Zap, Laptop, CalendarCheck, Bell, ClipboardList,
    MousePointerClick, MailCheck, UserCheck, FileText,
    Radar,
} from 'lucide-react';
import { PublicLayout } from '../../components/public/PublicLayout';
import { HeroSection } from '../../components/public/HeroSection';
import { PublicButton } from '../../components/public/PublicButton';
import SEOHead from '../../components/seo/SEOHead';
import { CourseCalendarSection } from '../../components/public/CourseCalendarSection';

// Tenant ID Element SRL (stesso per entrambi i brand)
const ELEMENT_SRL_TENANT_ID = import.meta.env.VITE_TENANT_ID || '6a8e68d7-1958-44d8-af50-2121f638db5c';

const brandId = import.meta.env.VITE_BRAND_ID || 'element-sicurezza';
const isMedica = brandId === 'element-medica';

// ─────────────────────────────────────────────────────────────────
// HOMEPAGE ELEMENT SICUREZZA
// ─────────────────────────────────────────────────────────────────

const HomePageSicurezza: React.FC = () => {
    const [openFaq, setOpenFaq] = useState<number | null>(null);

    const faqs = [
        { q: 'Quanto tempo ha l\'azienda per formare i nuovi assunti?', a: 'Secondo il D.Lgs 81/08 e l\'Accordo Stato-Regioni, la formazione deve avvenire entro 60 giorni dall\'assunzione. In caso di rischi gravi e immediati la formazione deve essere preventiva. Sanzione per omissione: arresto 2-4 mesi o ammenda €1.474–€6.388.' },
        { q: 'Quali corsi sono obbligatori per tutti i lavoratori?', a: 'La formazione obbligatoria D.Lgs 81/08 prevede: formazione generale (4h) + formazione specifica (4-12h in base al rischio basso/medio/alto). Per preposti e dirigenti sono previsti corsi aggiuntivi. Tutti richiedono aggiornamento ogni 5 anni.' },
        { q: 'Cosa sono i macrosettori ATECO e perché contano?', a: 'I 9 macrosettori ATECO determinano la durata della formazione specifica (4h rischio basso, 8h medio, 12h alto) e il tipo di formazione obbligatoria. Il macrosettore sbagliato invalida l\'attestato. Verifichiamo sempre il corretto ATECO della vostra azienda.' },
        { q: 'L\'attestato di formazione sicurezza vale a vita?', a: 'No. Quasi tutti gli attestati richiedono aggiornamento periodico (ogni 5 anni per la formazione base, ogni 3 anni per antincendio rischio medio-alto, ogni 3 anni per primo soccorso). Un attestato scaduto equivale a formazione non svolta.' },
        { q: 'Possiamo fare la formazione in azienda?', a: 'Sì. Offriamo formazione "in house" direttamente presso la vostra sede. Questo riduce i tempi di assenza dal lavoro ed è spesso più economico per gruppi di 5+ persone. Disponibili anche weekend e orario serale.' },
        { q: 'Cos\'è il DVR e chi deve redigerlo?', a: 'Il Documento di Valutazione dei Rischi è redatto dal datore di lavoro in collaborazione con RSPP e MC. È obbligatorio per TUTTE le aziende con almeno 1 dipendente. Deve essere aggiornato dopo ogni modifica significativa o infortunio.' },
        { q: 'Quando è obbligatoria la sorveglianza sanitaria?', a: 'La sorveglianza sanitaria (visite mediche del lavoro) è obbligatoria quando dalla valutazione dei rischi emergono: rumore, vibrazioni, VDT >20h/settimana, MMC, agenti chimici/biologici, lavoro notturno, ecc. Il medico competente decide protocollo e frequenza.' },
        { q: 'Cosa significa "ente accreditato" per la formazione sicurezza?', a: 'Un ente accreditato è riconosciuto dalla Regione per erogare formazione professionale. Gli attestati rilasciati da enti non accreditati non hanno valore legale per il D.Lgs 81/08. Element Sicurezza eroga la formazione in collaborazione con un Ente Accreditato in Regione.' },
    ];

    const structuredData = {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'EducationalOrganization',
                name: 'Element Sicurezza',
                alternateName: 'Element srl – Divisione Sicurezza',
                url: 'https://www.elementsicurezza.com',
                logo: 'https://www.elementsicurezza.com/assets/logos/element-sicurezza-logo.png',
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
                areaServed: { '@type': 'AdministrativeArea', name: 'Padova e Veneto' },
                sameAs: [
                    'https://linkedin.com/company/element-sicurezza',
                    'https://facebook.com/elementsicurezza',
                ],
                aggregateRating: {
                    '@type': 'AggregateRating',
                    ratingValue: '4.9',
                    reviewCount: '487',
                    bestRating: '5',
                    worstRating: '1',
                },
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
                title="Formazione Sicurezza Lavoro Padova | Element Sicurezza – Corsi, RSPP, Medicina del Lavoro"
                description="Element Sicurezza a Padova e Selvazzano Dentro: corsi di sicurezza D.Lgs 81/08, RSPP esterno, medico competente e sorveglianza sanitaria aziendale. 300+ aziende clienti. Preventivo gratuito."
                keywords={['corsi sicurezza sul lavoro', 'corsi di sicurezza Padova', 'formazione sicurezza lavoro', 'corsi D.Lgs 81/08 Selvazzano', 'RSPP esterno Padova', 'medicina del lavoro Padova', 'medico competente Padova', 'medico competente aziendale', 'sorveglianza sanitaria', 'attestato sicurezza', 'corso primo soccorso Padova', 'corso antincendio Padova', 'corsi azienda Padova', 'RLS formazione', 'lavoro in quota corso', 'trabattello', 'Selvazzano Dentro', 'Padova']}
                canonicalUrl="https://www.elementsicurezza.com"
                siteName="Element Sicurezza"
                ogTitle="Element Sicurezza \u2013 Formazione, RSPP e Medicina del Lavoro a Padova"
                ogDescription="Corsi di sicurezza sul lavoro, RSPP esterno, medico competente e sorveglianza sanitaria a Padova e Selvazzano Dentro. 100+ aziende clienti, preventivo gratuito."
                structuredData={structuredData}
            />

            {/* HERO */}
            <HeroSection
                title={<>Sicurezza sul Lavoro<br /><span style={{ color: 'var(--color-primary-300)' }}>Senza Compromessi</span></>}
                subtitle="Formazione · RSPP · Medicina del Lavoro"
                description="Leader nella formazione sulla sicurezza e medicina del lavoro. Oltre 3 anni di esperienza, 100+ aziende clienti. Attestati validi ai sensi del D.Lgs 81/08."
                backgroundVariant="gradient"
                backgroundPattern="diagonal-lines"
                primaryButton={{ text: 'Scopri i Corsi', href: '/corsi', icon: <GraduationCap className="w-5 h-5" /> }}
                secondaryButton={{ text: 'Richiedi Preventivo Gratuito', href: '/contatti' }}
                stats={[
                    { value: '100', label: 'Aziende', icon: <Building2 className="w-5 h-5" /> },
                    { value: '2.000', label: 'Lavoratori/anno', icon: <Users className="w-5 h-5" /> },
                    { value: '3+', label: 'Anni Esperienza', icon: <Award className="w-5 h-5" /> },
                    { value: '98%', label: 'Soddisfazione', icon: <Star className="w-5 h-5" />, highlight: true },
                ]}
                showTrustBadges
            />

            {/* SERVIZI PRINCIPALI */}
            <section className="py-16 bg-white">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-gray-900 mb-3">I Nostri Servizi per la Sicurezza Aziendale</h2>
                        <p className="text-gray-600 max-w-2xl mx-auto">Un unico fornitore per tutti gli adempimenti obbligatori D.Lgs 81/08</p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            {
                                icon: GraduationCap,
                                color: 'blue',
                                title: 'Corsi di Formazione Sicurezza',
                                href: '/corsi',
                                badge: 'Più Richiesto',
                                features: [
                                    'Formazione generale e specifica lavoratori',
                                    'Corsi preposti e dirigenti',
                                    'Aggiornamenti periodici obbligatori',
                                    'Rischio alto, medio, basso',
                                    'Aula, online e blended',
                                ],
                                desc: 'Formazione completa D.Lgs 81/08 per tutti i settori ATECO. Attestati riconosciuti a norma di legge.',
                            },
                            {
                                icon: Shield,
                                color: 'violet',
                                title: 'Nomina RSPP Esterno',
                                href: '/rspp',
                                badge: 'Pronto in 24h',
                                features: [
                                    'RSPP qualificato tutti macrosettori ATECO',
                                    'DVR e valutazione rischi specifica',
                                    'Sopralluoghi e riunioni periodiche',
                                    'Gestione documentazione sicurezza',
                                    'Consulenza continua telefonica',
                                ],
                                desc: 'Servizio RSPP esterno qualificato con consulenza continua. DVR incluso. Attivazione entro 24 ore.',
                            },
                            {
                                icon: Stethoscope,
                                color: 'teal',
                                title: 'Medicina del Lavoro',
                                href: '/medicina-del-lavoro',
                                badge: 'Medici Specializzati',
                                features: [
                                    'Visite mediche preventive e periodiche',
                                    'Sorveglianza sanitaria personalizzata',
                                    'Medico competente aziendale',
                                    'Esami specialistici certificati',
                                    'Gestione digitale scadenze',
                                ],
                                desc: 'Sorveglianza sanitaria completa con medici competenti specializzati. In azienda o ambulatorio.',
                            },
                        ].map((s, i) => (
                            <div key={i} className="bg-gray-50 rounded-2xl p-8 hover:shadow-lg transition-all border border-transparent hover:border-gray-200 group">
                                <div className="flex items-center gap-4 mb-5">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center bg-${s.color}-100`}>
                                        <s.icon className={`w-7 h-7 text-${s.color}-700`} />
                                    </div>
                                    <div>
                                        <span className={`text-xs bg-${s.color}-100 text-${s.color}-700 font-bold px-3 py-1 rounded-full`}>{s.badge}</span>
                                        <h3 className="font-bold text-gray-900 mt-1">{s.title}</h3>
                                    </div>
                                </div>
                                <p className="text-gray-600 text-sm mb-4">{s.desc}</p>
                                <ul className="space-y-2 mb-6">
                                    {s.features.map((f, j) => (
                                        <li key={j} className="flex items-center gap-2 text-sm text-gray-700">
                                            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />{f}
                                        </li>
                                    ))}
                                </ul>
                                <PublicButton to={s.href} variant="outline" className="w-full justify-center group-hover:bg-primary-600 group-hover:text-white group-hover:border-primary-600 transition-all" size="sm">
                                    Scopri di più <ArrowRight className="w-4 h-4 ml-1" />
                                </PublicButton>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* NUMERI */}
            <section className="py-16" style={{ background: 'linear-gradient(135deg, #283646 0%, #1d2f40 100%)' }}>
                <div className="container mx-auto px-4">
                    <h2 className="text-3xl font-bold text-white text-center mb-12">I Numeri della Nostra Esperienza</h2>
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-6">
                        {[
                            { n: '100', l: 'Aziende', d: 'Clienti attivi', icon: Building2 },
                            { n: '2.000', l: 'Lavoratori', d: 'Formati annualmente', icon: Users },
                            { n: '3+', l: 'Anni', d: 'Di esperienza', icon: Award },
                            { n: '98%', l: 'Soddisfazione', d: 'Cliente media', icon: Star },
                            { n: '50+', l: 'Corsi', d: 'Tipologie disponibili', icon: BookOpen },
                            { n: '9', l: 'Macrosettori', d: 'ATECO coperti', icon: TrendingUp },
                        ].map((s, i) => (
                            <div key={i} className="text-center text-white">
                                <s.icon className="w-6 h-6 mx-auto mb-2 opacity-70" />
                                <div className="text-3xl font-bold">{s.n}</div>
                                <div className="font-semibold text-white/90">{s.l}</div>
                                <div className="text-xs text-white/60 mt-0.5">{s.d}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* SETTORI SERVITI */}
            <section className="py-16 bg-white">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-10">
                        <h2 className="text-3xl font-bold text-gray-900 mb-3">Serviamo Aziende di Ogni Settore</h2>
                        <p className="text-gray-600 max-w-2xl mx-auto">Dalla piccola impresa alla grande azienda, in tutti i settori ATECO — con soluzioni adatte a ogni realtà</p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 max-w-5xl mx-auto mb-10">
                        {[
                            { icon: '🏭', name: 'Manifattura e Industria' },
                            { icon: '🏗️', name: 'Edilizia e Costruzioni' },
                            { icon: '🚚', name: 'Logistica e Trasporti' },
                            { icon: '🛒', name: 'Commercio e GDO' },
                            { icon: '🍽️', name: 'Ristorazione e Alberghi' },
                            { icon: '🖥️', name: 'Uffici e IT' },
                            { icon: '🏥', name: 'Sanità e Assistenza' },
                            { icon: '🌾', name: 'Agricoltura' },
                            { icon: '⚡', name: 'Energia e Utilities' },
                            { icon: '🎓', name: 'Scuole e Formazione' },
                            { icon: '🔧', name: 'Manutenzione e Impianti' },
                            { icon: '💼', name: 'Servizi Professionali' },
                        ].map((s, i) => (
                            <div key={i} className="flex flex-col items-center gap-2 p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-primary-200 hover:bg-primary-50 transition-all text-center">
                                <span className="text-2xl">{s.icon}</span>
                                <span className="text-xs font-medium text-gray-700 leading-tight">{s.name}</span>
                            </div>
                        ))}
                    </div>
                    <div className="text-center">
                        <PublicButton to="/contatti" variant="primary">
                            Richiedi Preventivo Gratuito <ArrowRight className="w-5 h-5 ml-2" />
                        </PublicButton>
                    </div>
                </div>
            </section>

            {/* PROSSIMI CORSI (widget dinamico) */}
            <section className="py-16" style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)' }}>
                <div className="container mx-auto px-4">
                    <div className="text-center mb-8">
                        <h2 className="text-3xl font-bold text-white mb-3">Prossimi Corsi in Calendario</h2>
                        <p className="text-white/70">Calendario aggiornato in tempo reale — iscriviti online in pochi secondi</p>
                    </div>
                    <CourseCalendarSection tenantId={ELEMENT_SRL_TENANT_ID} maxItems={6} />
                    <div className="text-center mt-8">
                        <PublicButton to="/corsi" variant="primary" size="lg">
                            Vedi Tutti i Corsi <ArrowRight className="w-5 h-5 ml-2" />
                        </PublicButton>
                    </div>
                </div>
            </section>

            {/* PERCHÉ SCEGLIERCI */}
            <section className="py-16 bg-white">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-gray-900 mb-3">Perché Oltre 100 Aziende ci Hanno Scelto</h2>
                        <p className="text-gray-600">Esperienza, qualità e professionalità per la sicurezza della tua azienda</p>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[
                            { icon: Award, color: 'blue', title: 'Accordo Stato-Regioni', desc: 'Formazione conforme agli Accordi Stato-Regioni 21/12/2011 e s.m.i. per tutti i corsi di sicurezza sul lavoro obbligatori.' },
                            { icon: Users, color: 'violet', title: 'Docenti Qualificati', desc: 'Team di formatori esperti con qualifica ai criteri del Decreto Interministeriale 6 marzo 2013.' },
                            { icon: Clock, color: 'teal', title: 'Flessibilità Oraria', desc: 'Corsi programmabili: aula, online, weekend, serali e in sede aziendale. Adattiamo noi alle vostre esigenze.' },
                            { icon: FileCheck, color: 'green', title: 'Documentazione Completa', desc: 'Gestione digitale attestati, registri presenze, materiali didattici sempre disponibili online.' },
                            { icon: HeadphonesIcon, color: 'orange', title: 'Supporto Continuo', desc: 'Assistenza post-corso, gestione scadenze, reminder automatici per aggiornamenti obbligatori.' },
                            { icon: TrendingUp, color: 'indigo', title: 'Aggiornamento Costante', desc: 'Programmi didattici sempre allineati alle ultime normative e best practice del settore.' },
                        ].map((f, i) => (
                            <div key={i} className="flex gap-4">
                                <div className={`w-12 h-12 rounded-xl bg-${f.color}-100 flex items-center justify-center flex-shrink-0`}>
                                    <f.icon className={`w-6 h-6 text-${f.color}-700`} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 mb-1">{f.title}</h3>
                                    <p className="text-sm text-gray-600">{f.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* PROCESSO */}
            <section className="py-16 bg-gray-50">
                <div className="container mx-auto px-4 max-w-4xl">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-gray-900 mb-3">Il Nostro Metodo di Lavoro</h2>
                        <p className="text-gray-600">Un approccio strutturato per la massima qualità</p>
                    </div>
                    <div className="grid md:grid-cols-4 gap-6">
                        {[
                            { n: '01', Icon: CalendarCheck, title: 'Prenota Online', desc: 'Scegli la specialità e il giorno preferito sul nostro portale di prenotazione.' },
                            { n: '02', Icon: Bell, title: 'Conferma', desc: 'Ricevi conferma via email e promemoria SMS il giorno prima.' },
                            { n: '03', Icon: Stethoscope, title: 'Visita', desc: "Accomodati nel nostro centro. Tempi d'attesa minimi, ambiente accogliente." },
                            { n: '04', Icon: ClipboardList, title: 'Referto Digitale', desc: 'Referto disponibile nel portale paziente entro 24-48 ore.' },
                        ].map((s, i) => (
                            <div key={i} className="bg-white rounded-2xl p-6 text-center shadow-sm border border-gray-100">
                                <div className="w-14 h-14 rounded-xl bg-teal-50 flex items-center justify-center mx-auto mb-4">
                                    <s.Icon className="w-7 h-7 text-teal-600" />
                                </div>
                                <div className="text-xs font-bold text-teal-600 mb-2">{s.n}</div>
                                <h3 className="font-bold text-gray-900 mb-2">{s.title}</h3>
                                <p className="text-sm text-gray-600">{s.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* TESTIMONIANZE */}
            <section className="py-16 bg-white">
                <div className="container mx-auto px-4">
                    <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Cosa Dicono i Nostri Clienti</h2>
                    <div className="grid md:grid-cols-3 gap-6">
                        {[
                            { n: 'Marco Rossi', r: 'Responsabile Risorse Umane', c: 'Industrie Meccaniche SRL', t: 'Collaboriamo con Element Sicurezza da 5 anni. Professionalità, puntualità e qualità eccellente. La formazione dei nostri dipendenti è sempre completa e aggiornata.' },
                            { n: 'Laura Bianchi', r: 'RSPP Aziendale', c: 'Costruzioni Edili SpA', t: 'Servizio impeccabile. Docenti preparati, materiali didattici di qualità e assistenza post-corso sempre disponibile. Consigliatissimi!' },
                            { n: 'Giuseppe Verdi', r: 'Titolare', c: 'Logistica Trasporti Nord', t: 'Finalmente un ente formativo serio e affidabile. Gestione digitale perfetta, niente più scartoffie e scadenze sempre sotto controllo.' },
                        ].map((t, i) => (
                            <div key={i} className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                                <div className="flex mb-3">{[...Array(5)].map((_, j) => <Star key={j} className="w-4 h-4 text-yellow-400 fill-yellow-400" />)}</div>
                                <p className="text-gray-700 text-sm italic mb-4">"{t.t}"</p>
                                <div>
                                    <div className="font-bold text-gray-900 text-sm">{t.n}</div>
                                    <div className="text-xs text-gray-500">{t.r} — {t.c}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CERTIFICAZIONI */}
            <section className="py-12 bg-gray-50 border-y border-gray-200">
                <div className="container mx-auto px-4">
                    <h2 className="text-xl font-bold text-gray-900 text-center mb-8">Certificazioni e Accreditamenti</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
                        {[
                            { icon: Shield, name: 'Ente Accreditato in Regione', desc: 'In collaborazione con ente accreditato', color: 'green' },
                            { icon: CheckCircle, name: 'Attestati Riconosciuti', desc: 'Validità legale D.Lgs 81/08', color: 'violet' },
                            { icon: Users, name: 'Docenti Qualificati', desc: 'D.I. 6 marzo 2013', color: 'teal' },
                        ].map((c, i) => (
                            <div key={i} className="bg-white rounded-xl p-5 text-center shadow-sm border border-gray-100">
                                <c.icon className={`w-8 h-8 text-${c.color}-600 mx-auto mb-3`} />
                                <div className="font-bold text-gray-900 text-sm">{c.name}</div>
                                <div className="text-xs text-gray-500 mt-1">{c.desc}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* FAQ */}
            <section className="py-16 bg-white">
                <div className="container mx-auto px-4 max-w-3xl">
                    <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Domande Frequenti sulla Formazione</h2>
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

            {/* CTA FINALE */}
            <section className="py-16" style={{ background: 'linear-gradient(135deg, #283646 0%, #1d2f40 100%)' }}>
                <div className="container mx-auto px-4 text-center">
                    <h2 className="text-3xl font-bold text-white mb-4">Pronto a Mettere in Regola la Tua Azienda?</h2>
                    <p className="text-white/90 mb-8 text-lg max-w-2xl mx-auto">Richiedi un preventivo gratuito senza impegno. I nostri esperti ti contatteranno entro 24 ore.</p>
                    <div className="flex flex-wrap gap-4 justify-center">
                        <PublicButton to="/contatti" variant="outline-light" size="lg">
                            Richiedi Preventivo Gratuito <ArrowRight className="w-5 h-5 ml-2" />
                        </PublicButton>
                        <a href="tel:+393516239176" className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-8 py-4 rounded-full text-lg font-medium transition-all">
                            <Phone className="w-5 h-5" />+39 351 623 9176
                        </a>
                    </div>
                </div>
            </section>
        </PublicLayout>
    );
};

// ─────────────────────────────────────────────────────────────────
// HOMEPAGE ELEMENT MEDICA
// ─────────────────────────────────────────────────────────────────

const HomePageMedica: React.FC = () => {
    const [openFaq, setOpenFaq] = useState<number | null>(null);

    const faqs = [
        { q: 'Come prenoto una visita al Poliambulatorio Element Medica?', a: 'Puoi prenotare online attraverso il nostro sistema di prenotazione (pulsante "Prenota Online"), chiamare il +39 351 318 1574 o inviarci un messaggio WhatsApp. Offriamo anche appuntamenti telefonici per chiarimenti preliminari gratuiti.' },
        { q: 'Effettuate visite domiciliari o in azienda?', a: 'Sì. Per le visite di medicina del lavoro (sorveglianza sanitaria d.lgs. 81/08) offriamo il servizio direttamente in azienda, con attrezzatura mobile per audiometrie, spirometrie e visita medica. Il medico competente può effettuare le visite periodiche presso la vostra sede.' },
        { q: 'Quanto tempo devo aspettare per un appuntamento?', a: 'I tempi variano in base alla specialità. Per medicina del lavoro, ortopedia, dermatologia e medicina generale i tempi sono di 3-7 giorni. Per alcune specialità la lista d\'attesa può essere di 2-3 settimane. Chiamate per verificare la disponibilità aggiornata.' },
        { q: 'I referti sono disponibili online?', a: 'Sì. Tutti i referti sono disponibili nel portale paziente entro 24-48 ore dalla visita. Riceverete notifica via email quando il referto è disponibile. Il portale garantisce la riservatezza dei dati sanitari in conformità al GDPR.' },
        { q: 'Qual è la differenza tra medico competente e medico di base?', a: 'Il medico competente (o medico del lavoro) è una figura specializzata nella medicina occupazionale e opera in relazione ai rischi professionali rilevati nel DVR. Effettua le visite previste dal protocollo sanitario aziendale. Il medico di base gestisce la salute generale e non ha compiti nella sorveglianza sanitaria lavorativa.' },
    ];

    const structuredData = {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'MedicalOrganization',
                name: 'Poliambulatorio Element Medica',
                alternateName: 'Element Medica – Poliambulatorio Selvazzano Dentro',
                url: 'https://www.elementmedica.com',
                logo: 'https://www.elementmedica.com/assets/logos/element-medica-logo.png',
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
                openingHoursSpecification: [
                    { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], opens: '08:00', closes: '19:00' },
                    { '@type': 'OpeningHoursSpecification', dayOfWeek: 'Saturday', opens: '08:00', closes: '13:00' },
                ],
                areaServed: [
                    { '@type': 'City', name: 'Selvazzano Dentro' },
                    { '@type': 'City', name: 'Padova' },
                    { '@type': 'AdministrativeArea', name: 'Provincia di Padova' },
                ],
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
                title="Poliambulatorio Element Medica – Selvazzano Dentro Padova | Visite e Medicina del Lavoro"
                description="Poliambulatorio Element Medica a Selvazzano Dentro, 10 minuti da Padova. Medicina del lavoro, visite mediche specialistiche, medico competente aziendale, diagnostica strumentale. Prenotazione online rapida."
                keywords={['poliambulatorio Padova', 'poliambulatorio Selvazzano Dentro', 'medicina del lavoro Padova', 'medico competente Padova', 'visita medica aziendale', 'visite mediche Selvazzano', 'visite specialistiche Padova', 'sorveglianza sanitaria D.Lgs 81/08', 'diagnostica Padova', 'medico competente Selvazzano']}
                canonicalUrl="https://www.elementmedica.com"
                siteName="Element Medica"
                ogTitle="Poliambulatorio Element Medica – Selvazzano Dentro Padova"
                ogDescription="Medicina del lavoro, visite mediche e visite specialistiche a Selvazzano Dentro (Padova). Medico competente aziendale qualificato, prenotazione online, 10 min da Padova."
                structuredData={structuredData}
            />

            {/* HERO */}
            <HeroSection
                title={<>Poliambulatorio<br /><span style={{ color: 'var(--color-primary-300)' }}>Element Medica</span></>}
                subtitle="Selvazzano Dentro – Padova"
                description="Centro medico specializzato in medicina del lavoro, visite specialistiche e diagnostica. Medici competenti qualificati, prenotazione online in pochi secondi."
                backgroundVariant="gradient"
                primaryButton={{ text: 'Prenota Online', href: '/prenota', icon: <Heart className="w-5 h-5" /> }}
                secondaryButton={{ text: '+39 351 318 1574', href: 'tel:+393513181574' }}
                stats={[
                    { value: '300+', label: 'Aziende Servite', icon: <Building2 className="w-5 h-5" /> },
                    { value: '10', label: 'Specialità Mediche', icon: <Stethoscope className="w-5 h-5" /> },
                    { value: '10 min', label: 'da Padova', icon: <MapPin className="w-5 h-5" /> },
                    { value: '48h', label: 'Attivazione MC', icon: <Clock className="w-5 h-5" />, highlight: true },
                ]}
                showTrustBadges
            />

            {/* APERTURA IMMINENTE */}
            <section className="py-6 bg-amber-50 border-y border-amber-200">
                <div className="container mx-auto px-4">
                    <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-amber-800">
                        <div className="flex items-center gap-2 font-semibold">
                            <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse inline-block"></span>
                            🏥 Poliambulatorio in fase di apertura
                        </div>
                        <span className="hidden md:inline text-amber-400">|</span>
                        <div className="flex items-center gap-1.5">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span><strong>GIÀ ATTIVO:</strong> Medicina del Lavoro e Nomina Medico Competente</span>
                        </div>
                        <span className="hidden md:inline text-amber-400">|</span>
                        <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse inline-block"></span>
                            <span>Specialistiche e diagnostica: <strong>presto disponibili</strong></span>
                        </div>
                        <a href="/prenota" className="bg-amber-600 text-white font-bold px-4 py-1.5 rounded-full text-xs hover:bg-amber-700 transition-all">
                            Prenota Medicina del Lavoro →
                        </a>
                    </div>
                </div>
            </section>

            {/* ORARI */}
            <section className="py-6 bg-teal-700 text-white">
                <div className="container mx-auto px-4">
                    <div className="flex flex-wrap justify-center items-center gap-8 text-sm">
                        <div className="flex items-center gap-2"><Clock className="w-4 h-4" /><span><strong>Lun–Ven:</strong> 8:00–19:00</span></div>
                        <div className="flex items-center gap-2"><Clock className="w-4 h-4" /><span><strong>Sabato:</strong> 8:00–13:00</span></div>
                        <div className="flex items-center gap-2"><Phone className="w-4 h-4" /><a href="tel:+393513181574" className="hover:underline">+39 351 318 1574</a></div>
                        <a href="/prenota" className="bg-white text-teal-700 font-bold px-6 py-2 rounded-full hover:bg-teal-50 transition-all">Prenota Online</a>
                    </div>
                </div>
            </section>

            {/* SERVIZI */}
            <section className="py-16 bg-white">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-gray-900 mb-3">I Nostri Servizi</h2>
                        <p className="text-gray-600 max-w-2xl mx-auto">Tutto ciò di cui hai bisogno in un unico centro specializzato</p>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[
                            { icon: '🩺', title: 'Medicina del Lavoro', href: '/medicina-del-lavoro', desc: 'Sorveglianza sanitaria aziendale completa. Medico competente qualificato, protocolli personalizzati, visite in sede e in azienda.' },
                            { icon: '💉', title: 'Visite Specialistiche', href: '/visite-specialistiche', desc: 'Ortopedia, dermatologia, medicina interna, oculistica, pneumologia e altro. Tempi ridotti, referti digitali in 24h.' },
                            { icon: '🔬', title: 'Diagnostica', href: '/diagnostica', desc: 'ECG, spirometria, audiometria, ematochimici, esami strumentali. Strumentazioni di ultima generazione.' },
                        ].map((s, i) => (
                            <a key={i} href={s.href} className="flex gap-4 p-6 rounded-2xl bg-gray-50 hover:bg-white hover:shadow-md hover:border-teal-200 border border-transparent transition-all">
                                <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center flex-shrink-0 text-2xl">{s.icon}</div>
                                <div>
                                    <h3 className="font-bold text-gray-900 mb-1">{s.title}</h3>
                                    <p className="text-sm text-gray-600">{s.desc}</p>
                                </div>
                            </a>
                        ))}
                    </div>
                </div>
            </section>

            {/* PERCHÉ SCEGLIERCI */}
            <section className="py-16 bg-teal-700 text-white">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold mb-3">Perché Scegliere Element Medica</h2>
                        <p className="text-white/80 max-w-2xl mx-auto">Un centro medico moderno costruito intorno alle esigenze di lavoratori e aziende</p>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
                        {[
                            { Icon: Zap, title: 'Attivazione Rapida', desc: 'Il Medico Competente aziendale viene attivato entro 48 ore dalla firma del contratto. Nessuna burocrazia.' },
                            { Icon: MapPin, title: 'Posizione Strategica', desc: 'A 10 minuti da Padova, lungo la SS11. Comodo da tutta la provincia con parcheggio incluso.' },
                            { Icon: Laptop, title: 'Digitale al 100%', desc: 'Prenotazioni online, referti digitali, cartelle sanitarie sicure, promemoria automatici via SMS/email.' },
                            { Icon: HeadphonesIcon, title: 'Supporto Aziendale', desc: 'Per ogni azienda un referente dedicato, protocollo sanitario personalizzato e riunione periodica annuale.' },
                            { Icon: Stethoscope, title: 'Visita anche in Azienda', desc: "Il medico porta l'attrezzatura direttamente da voi. Audiometrie, spirometrie e visite periodiche on-site." },
                            { Icon: FileCheck, title: 'Documenti Inclusi', desc: 'Giudizi di idoneità, DVR sanitario, registro esposti e tutta la documentazione obbligatoria D.Lgs. 81/08.' },
                        ].map((item, i) => (
                            <div key={i} className="bg-white/10 backdrop-blur rounded-2xl p-6 hover:bg-white/15 transition-all">
                                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center mb-4">
                                    <item.Icon className="w-6 h-6 text-white" />
                                </div>
                                <h3 className="font-bold text-white mb-2">{item.title}</h3>
                                <p className="text-white/80 text-sm">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* COME FUNZIONA */}
            <section className="py-16 bg-gray-50">
                <div className="container mx-auto px-4 max-w-4xl">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-gray-900 mb-3">Come Funziona</h2>
                    </div>
                    <div className="grid md:grid-cols-4 gap-6">
                        {[
                            { n: '01', Icon: MousePointerClick, title: 'Prenota Online', desc: 'Scegli la specialità e il giorno preferito sul nostro portale di prenotazione.' },
                            { n: '02', Icon: MailCheck, title: 'Conferma', desc: 'Ricevi conferma via email e promemoria SMS il giorno prima.' },
                            { n: '03', Icon: UserCheck, title: 'Visita', desc: "Accomodati nel nostro centro. Tempi d'attesa minimi, ambiente accogliente." },
                            { n: '04', Icon: FileText, title: 'Referto Digitale', desc: 'Referto disponibile nel portale paziente entro 24-48 ore.' },
                        ].map((s, i) => (
                            <div key={i} className="bg-white rounded-2xl p-6 text-center shadow-sm border border-gray-100">
                                <div className="w-14 h-14 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center mx-auto mb-4">
                                    <s.Icon className="w-7 h-7 text-teal-600" strokeWidth={1.5} />
                                </div>
                                <div className="text-xs font-bold text-teal-600 mb-2">{s.n}</div>
                                <h3 className="font-bold text-gray-900 mb-2">{s.title}</h3>
                                <p className="text-sm text-gray-600">{s.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* SPECIALIZZAZIONI */}
            <section className="py-16 bg-white">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-gray-900 mb-3">Specialità Mediche</h2>
                        <p className="text-gray-600 max-w-2xl mx-auto">Un poliambulatorio completo con le principali specialità, con attivazione progressiva</p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
                        {[
                            { Icon: Stethoscope, name: 'Medicina del Lavoro', status: 'attivo', href: '/medicina-del-lavoro' },
                            { icon: '🏃', name: 'Medicina dello Sport', status: 'apertura', href: '/visite-specialistiche' },
                            { icon: '🫀', name: 'Cardiologia', status: 'apertura', href: '/visite-specialistiche' },
                            { icon: '💭', name: 'Psicoterapia', status: 'apertura', href: '/visite-specialistiche' },
                            { icon: '🫁', name: 'Pneumologia', status: 'apertura', href: '/visite-specialistiche' },
                            { icon: '🦴', name: 'Ortopedia', status: 'apertura', href: '/visite-specialistiche' },
                            { icon: '🔬', name: 'Dermatologia', status: 'apertura', href: '/visite-specialistiche' },
                            { icon: '👁️', name: 'Oculistica', status: 'apertura', href: '/visite-specialistiche' },
                            { icon: '🧠', name: 'Neurologia', status: 'apertura', href: '/visite-specialistiche' },
                            { Icon: Radar, name: 'Diagnostica', status: 'apertura', href: '/diagnostica' },
                            { icon: '💉', name: 'Medicina Interna', status: 'apertura', href: '/visite-specialistiche' },
                            { icon: '📋', name: 'Medicina Preventiva', status: 'apertura', href: '/visite-specialistiche' },
                        ].map((s, i) => (
                            <a
                                key={i}
                                href={s.href}
                                className="flex flex-col items-center gap-2 p-4 rounded-xl border transition-all hover:shadow-md"
                                style={{ borderColor: s.status === 'attivo' ? '#0d9488' : '#e5e7eb', background: s.status === 'attivo' ? '#f0fdfa' : 'white' }}
                            >
                                {(() => { const I = ('Icon' in s ? s.Icon : null) as React.FC<{ className?: string }> | null; return I ? <span className="flex items-center justify-center w-8 h-8"><I className="w-6 h-6 text-teal-600" /></span> : <span className="text-2xl">{(s as { icon?: string }).icon}</span>; })()}
                                <span className="text-sm font-medium text-gray-900 text-center">{s.name}</span>
                                {s.status === 'attivo' ? (
                                    <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full font-medium">Attivo</span>
                                ) : (
                                    <span className="text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full">In apertura</span>
                                )}
                            </a>
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

            {/* CTA */}
            <section className="py-16 bg-teal-700">
                <div className="container mx-auto px-4 text-center">
                    <h2 className="text-3xl font-bold text-white mb-4">Prenota la Tua Visita Oggi</h2>
                    <p className="text-white/90 mb-8 text-lg">Disponibilità aggiornata in tempo reale. Prenotazione in meno di 2 minuti.</p>
                    <div className="flex flex-wrap gap-4 justify-center">
                        <a href="/prenota" className="flex items-center gap-2 bg-white text-teal-700 font-bold px-8 py-4 rounded-full text-lg hover:bg-teal-50 transition-all">
                            <Heart className="w-5 h-5" />Prenota Online
                        </a>
                        <a href="tel:+393513181574" className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-8 py-4 rounded-full text-lg font-medium transition-all">
                            <Phone className="w-5 h-5" />+39 351 318 1574
                        </a>
                    </div>
                </div>
            </section>
        </PublicLayout>
    );
};

// ─────────────────────────────────────────────────────────────────
// EXPORT BRAND-AWARE
// ─────────────────────────────────────────────────────────────────

const HomePageStatic: React.FC = () => isMedica ? <HomePageMedica /> : <HomePageSicurezza />;
export default HomePageStatic;
