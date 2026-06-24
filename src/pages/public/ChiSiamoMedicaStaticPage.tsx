/**
 * ChiSiamoMedicaStaticPage
 *
 * Pagina "Chi Siamo" STATICA per elementmedica.com.
 * NON usa CMS API — contenuto hardcoded per SEO perfetto.
 */

import React from 'react';
import {
    Award, Users, Shield, CheckCircle, Star,
    MapPin, Phone, ArrowRight, Building2,
    Clock, Heart, Stethoscope,
} from 'lucide-react';
import { PublicLayout } from '../../components/public/PublicLayout';
import { HeroSection } from '../../components/public/HeroSection';
import { PublicButton } from '../../components/public/PublicButton';
import SEOHead from '../../components/seo/SEOHead';

const ChiSiamoMedicaStaticPage: React.FC = () => {
    const structuredData = {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'MedicalOrganization',
                name: 'Poliambulatorio Element Medica',
                alternateName: 'Element Medica – Poliambulatorio Selvazzano Dentro',
                url: 'https://www.elementmedica.com',
                logo: 'https://www.elementmedica.com/assets/logos/element-medica-logo.png',
                foundingDate: '2023',
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
                areaServed: [
                    { '@type': 'City', name: 'Selvazzano Dentro' },
                    { '@type': 'City', name: 'Padova' },
                ],
            },
        ],
    };

    return (
        <PublicLayout>
            <SEOHead
                title="Chi Siamo | Element Medica – Poliambulatorio Selvazzano Dentro Padova"
                description="Element Medica: poliambulatorio specializzato in medicina del lavoro a Selvazzano Dentro (PD), 10 minuti da Padova. Medici competenti qualificati, sorveglianza sanitaria aziendale, visite specialistiche in apertura."
                keywords={[
                    'Element Medica chi siamo',
                    'poliambulatorio Selvazzano Dentro',
                    'medicina del lavoro Padova',
                    'medico competente Padova',
                    'sorveglianza sanitaria Selvazzano',
                    'poliambulatorio apertura Padova',
                    'visite mediche aziendali Padova',
                    'Selvazzano Dentro Padova',
                ]}
                canonicalUrl="https://www.elementmedica.com/chi-siamo"
                ogTitle="Chi Siamo – Element Medica Poliambulatorio"
                ogDescription="Poliambulatorio Element Medica a Selvazzano Dentro: medicina del lavoro attiva, visite specialistiche in apertura. 300+ aziende clienti, medici competenti qualificati."
                structuredData={structuredData}
            />

            {/* HERO */}
            <HeroSection
                title={<>Chi Siamo<br /><span style={{ color: 'var(--color-primary-300)' }}>Element Medica</span></>}
                subtitle="Salute e Cura al Centro di Tutto"
                description="Nati dalla stessa radice di Element Sicurezza, portiamo la medicina del lavoro e la cura specialistica in un unico centro moderno a Selvazzano Dentro, a 10 minuti da Padova."
                backgroundVariant="gradient"
                primaryButton={{ text: 'Prenota Online', href: '/prenota', icon: <Heart className="w-5 h-5" /> }}
                secondaryButton={{ text: '+39 351 318 1574', href: 'tel:+393513181574' }}
                stats={[
                    { value: '300+', label: 'Aziende Clienti', icon: <Building2 className="w-5 h-5" /> },
                    { value: '5.000', label: 'Pazienti/Anno', icon: <Stethoscope className="w-5 h-5" /> },
                    { value: '10', label: 'Specialità Mediche', icon: <Award className="w-5 h-5" /> },
                    { value: '4', label: 'Anni nel Settore', icon: <Star className="w-5 h-5" />, highlight: true },
                ]}
                showTrustBadges
            />

            {/* LA NOSTRA STORIA */}
            <section className="py-16 bg-white">
                <div className="container mx-auto px-4 max-w-5xl">
                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        <div>
                            <div className="inline-flex items-center gap-2 bg-teal-50 text-teal-700 px-3 py-1 rounded-full text-sm font-medium mb-4">
                                <Shield className="w-4 h-4" />
                                La Nostra Missione
                            </div>
                            <h2 className="text-3xl font-bold text-gray-900 mb-6">La Nostra Storia</h2>
                            <p className="text-gray-600 mb-4 leading-relaxed">
                                Element Medica nasce nel 2025 come evoluzione naturale di Element Sicurezza, con l'obiettivo di portare la medicina del lavoro e la salute specialistica in un unico centro di eccellenza.
                            </p>
                            <p className="text-gray-600 mb-6 leading-relaxed">
                                La nostra visione: rendere accessibile la salute preventiva a tutti i lavoratori e alle aziende del territorio, con tempi rapidi, professionalità e tecnologia al servizio della persona.
                            </p>
                            <div className="flex items-center gap-3 text-teal-600 font-semibold">
                                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                                Medici competenti qualificati D.Lgs 81/08
                            </div>
                            <div className="flex items-center gap-3 text-teal-600 font-semibold mt-2">
                                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                                Piattaforma digitale per la gestione della sorveglianza sanitaria
                            </div>
                            <div className="flex items-center gap-3 text-teal-600 font-semibold mt-2">
                                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                                Collegato al gruppo Element per un servizio integrato sicurezza + salute
                            </div>
                        </div>

                        {/* TIMELINE */}
                        <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100">
                            <h3 className="text-xl font-bold text-gray-900 mb-6">Le Tappe Principali</h3>
                            <div className="space-y-5">
                                {[
                                    {
                                        year: '2023',
                                        title: 'Nasce Element Sicurezza',
                                        desc: 'Partiamo con l\'erogazione di corsi di formazione e consulenza antinfortunistica, diventando partner strategico per le imprese locali.',
                                        active: true,
                                    },
                                    {
                                        year: '2025',
                                        title: 'Nasce Element Medica',
                                        desc: 'Si affianca Element Medica grazie all\'integrazione dei servizi di Medicina del Lavoro. La prevenzione diventa clinica: affianchiamo alla sicurezza sul campo la sorveglianza sanitaria professionale.',
                                        active: true,
                                    },
                                    {
                                        year: '2026',
                                        title: 'Inaugurazione Poliambulatorio',
                                        desc: 'Inauguriamo il Poliambulatorio Element Medica. Una struttura all\'avanguardia aperta a tutti, dove la cura della salute incontra l\'eccellenza e la tecnologia.',
                                        active: true,
                                    },
                                ].map((item, i) => (
                                    <div key={i} className="flex gap-4">
                                        <div className="flex-shrink-0">
                                            <div className={`w-14 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${item.active ? 'bg-teal-100 text-teal-700' : 'bg-gray-100 text-gray-500'}`}>
                                                {item.year}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="font-semibold text-gray-900 text-sm">{item.title}</div>
                                            <div className="text-xs text-gray-500 mt-0.5">{item.desc}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* VALORI */}
            <section className="py-16 bg-teal-700">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-white mb-3">I Nostri Valori</h2>
                        <p className="text-white/70 max-w-2xl mx-auto">I principi che guidano ogni nostra azione quotidiana</p>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
                        {[
                            { icon: Shield, title: 'Professionalità', desc: 'Medici competenti abilitati e costantemente aggiornati sulle normative D.Lgs 81/08 e le best practice cliniche.' },
                            { icon: Heart, title: 'Cura del Paziente', desc: 'Ogni persona è al centro. Ascolto, empatia e tempi rapidi per garantire la migliore esperienza di cura.' },
                            { icon: Award, title: 'Qualità', desc: 'Standard clinici elevati, strumentazioni moderne e processi certificati per risultati affidabili.' },
                            { icon: Building2, title: 'Partnership Aziendale', desc: 'Supporto completo alle aziende: dal medico competente nominato al protocollo sanitario personalizzato.' },
                        ].map((v, i) => (
                            <div key={i} className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center border border-white/20">
                                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                                    <v.icon className="w-6 h-6 text-white" />
                                </div>
                                <h3 className="font-bold text-white mb-2">{v.title}</h3>
                                <p className="text-white/70 text-sm">{v.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* TEAM */}
            <section className="py-16 bg-white">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-gray-900 mb-3">Il Nostro Team</h2>
                        <p className="text-gray-600 max-w-2xl mx-auto">Professionisti qualificati con anni di esperienza, dedicati alla salute dei lavoratori e dei loro familiari</p>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
                        {[
                            { role: 'Medici del Lavoro', emoji: '🩺', color: 'teal', desc: 'Medici competenti iscritti all\'albo, specializzati in medicina occupazionale. Sorveglianza sanitaria, protocolli personalizzati, giudizi di idoneità.' },
                            { role: 'Medici Specialisti', emoji: '👨‍⚕️', color: 'blue', desc: 'Specialisti in varie discipline: cardiologia, ortopedia, pneumologia, dermatologia e altro. In progressiva attivazione.' },
                            { role: 'Personale Infermieristico', emoji: '💉', color: 'green', desc: 'Infermieri professionali per prelievi, ECG, spirometrie e supporto alle visite mediche.' },
                            { role: 'Tecnici Sanitari', emoji: '🔬', color: 'violet', desc: 'Tecnici per audiometria, esami strumentali e diagnostica clinica con strumentazione di ultima generazione.' },
                            { role: 'Assistenti Amministrativi', emoji: '📋', color: 'orange', desc: 'Gestione prenotazioni, cartelle cliniche digitali, fatturazioni e supporto agli adempimenti aziendali.' },
                            { role: 'Coordinamento Aziendale', emoji: '🏢', color: 'indigo', desc: 'Figure dedicate alle aziende per la gestione del piano di sorveglianza sanitaria e la comunicazione con il MC.' },
                        ].map((m, i) => (
                            <div key={i} className={`flex gap-4 p-6 rounded-2xl bg-${m.color}-50 border border-${m.color}-100`}>
                                <div className={`w-12 h-12 rounded-xl bg-${m.color}-100 flex items-center justify-center flex-shrink-0 text-2xl`}>{m.emoji}</div>
                                <div>
                                    <h3 className="font-bold text-gray-900 mb-1">{m.role}</h3>
                                    <p className="text-sm text-gray-600">{m.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* NUMERI */}
            <section className="py-16 bg-gray-50">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-gray-900 mb-3">I Numeri che ci Raccontano</h2>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
                        {[
                            { n: '5.000', l: 'Pazienti/Anno', d: 'Pazienti seguiti ogni anno' },
                            { n: '300+', l: 'Aziende Clienti', d: 'Aziende servite nel territorio' },
                            { n: '10', l: 'Specialità', d: 'Branche mediche attive o in attivazione' },
                            { n: '4', l: 'Anni nel Settore', d: 'Dal 2023 con Element Sicurezza' },
                        ].map((s, i) => (
                            <div key={i} className="bg-white rounded-2xl p-6 text-center shadow-sm border border-gray-100">
                                <div className="text-4xl font-bold text-teal-600 mb-1">{s.n}</div>
                                <div className="font-semibold text-gray-900">{s.l}</div>
                                <div className="text-xs text-gray-500 mt-1">{s.d}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* COLLABORAZIONI */}
            <section className="py-16 bg-white">
                <div className="container mx-auto px-4 max-w-4xl">
                    <div className="text-center mb-12">
                        <div className="inline-flex items-center gap-2 bg-teal-50 text-teal-700 px-3 py-1 rounded-full text-sm font-medium mb-4">
                            <Users className="w-4 h-4" />
                            Partnership e Collaborazioni
                        </div>
                        <h2 className="text-3xl font-bold text-gray-900 mb-3">Le Nostre Collaborazioni</h2>
                        <p className="text-gray-600 max-w-2xl mx-auto">Collaboriamo con le principali associazioni datoriali del territorio per portare salute e sicurezza alle imprese associate</p>
                    </div>
                    <div className="grid md:grid-cols-2 gap-8">
                        <a href="https://www.ascompd.com/" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-4 p-8 bg-gray-50 rounded-2xl border border-gray-100 hover:border-teal-200 hover:shadow-md transition-all no-underline">
                            <img
                                src="/assets/logos/confcommercio-padova-logo.png"
                                style={{ background: 'transparent' }}
                                alt="Confcommercio Padova"
                                className="h-20 w-auto max-w-full object-contain"
                                onError={(e) => {
                                    const el = e.currentTarget as HTMLImageElement;
                                    el.style.display = 'none';
                                    const next = el.nextElementSibling as HTMLElement | null;
                                    if (next) next.style.display = 'flex';
                                }}
                            />
                            <div style={{ display: 'none' }} className="flex-col items-center gap-1" aria-hidden="true">
                                <div className="text-2xl font-black text-blue-900">Confcommercio</div>
                                <div className="text-sm font-semibold text-blue-700">PADOVA</div>
                            </div>
                            <div className="text-center">
                                <h3 className="font-bold text-gray-900">Confcommercio Padova</h3>
                                <p className="text-sm text-gray-600 mt-1">Partner per i servizi di medicina del lavoro e sorveglianza sanitaria alle imprese del commercio, turismo e servizi del territorio padovano.</p>
                            </div>
                        </a>
                        <a href="https://www.confartigianatopadova.it" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-4 p-8 bg-gray-50 rounded-2xl border border-gray-100 hover:border-teal-200 hover:shadow-md transition-all no-underline">
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
                                <p className="text-sm text-gray-600 mt-1">Partner ufficiale per i servizi medico-sanitari e di sicurezza sul lavoro alle imprese artigiane del territorio padovano.</p>
                            </div>
                        </a>
                        <a href="https://www.confisipadova.it" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-4 p-8 bg-gray-50 rounded-2xl border border-gray-100 hover:border-teal-200 hover:shadow-md transition-all no-underline">
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
                                <p className="text-sm text-gray-600 mt-1">Confederazione Italiana Sviluppo Imprese — Offriamo servizi di medicina del lavoro e formazione sicurezza alle aziende associate.</p>
                            </div>
                        </a>
                        <a href="https://www.fimiebap.it/" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-4 p-8 bg-gray-50 rounded-2xl border border-gray-100 hover:border-teal-200 hover:shadow-md transition-all no-underline">
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
                                <p className="text-sm text-gray-600 mt-1">Ente Bilaterale per l'Agricoltura Padovana — Fondo Integrazione Indennità Malattia e Infortunio Lavoratori Agricoli. Partner per i servizi di medicina del lavoro a favore dei lavoratori agricoli padovani.</p>
                            </div>
                        </a>
                    </div>
                    <div className="bg-teal-50 border border-teal-200 rounded-2xl p-6 text-center mt-8">
                        <p className="text-teal-800 text-sm">
                            <strong>Sei membro di un'associazione di categoria?</strong> Contattaci per conoscere le condizioni riservate agli associati.
                        </p>
                        <a href="/contatti" className="inline-flex items-center gap-2 mt-3 bg-teal-600 text-white px-6 py-2 rounded-full text-sm font-medium hover:bg-teal-700 transition-all">
                            Richiedi informazioni <ArrowRight className="w-4 h-4" />
                        </a>
                    </div>
                </div>
            </section>

            {/* SEDE */}
            <section className="py-16 bg-gray-50">
                <div className="container mx-auto px-4 max-w-4xl">
                    <div className="grid md:grid-cols-2 gap-10 items-center">
                        <div>
                            <div className="inline-flex items-center gap-2 bg-teal-50 text-teal-700 px-3 py-1 rounded-full text-sm font-medium mb-4">
                                <MapPin className="w-4 h-4" />
                                La Nostra Sede
                            </div>
                            <h2 className="text-3xl font-bold text-gray-900 mb-4">Selvazzano Dentro – Padova</h2>
                            <p className="text-gray-600 mb-6">
                                Il Poliambulatorio Element Medica è situato a Selvazzano Dentro, a soli 10 minuti da Padova centro, facilmente raggiungibile dalla SS11 e dall'autostrada A4.
                            </p>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 text-gray-700">
                                    <MapPin className="w-5 h-5 text-teal-500 flex-shrink-0" />
                                    <span>Via Bracciano 34, 35030 Selvazzano Dentro (PD)</span>
                                </div>
                                <div className="flex items-center gap-3 text-gray-700">
                                    <Phone className="w-5 h-5 text-teal-500 flex-shrink-0" />
                                    <a href="tel:+393513181574" className="hover:text-teal-600">+39 351 318 1574</a>
                                </div>
                                <div className="flex items-center gap-3 text-gray-700">
                                    <Clock className="w-5 h-5 text-teal-500 flex-shrink-0" />
                                    <span>Lun–Ven: 8:00–19:00 · Sab: 8:00–13:00</span>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
                            <h3 className="font-bold text-gray-900 mb-4">Zone Servite</h3>
                            <div className="grid grid-cols-2 gap-2">
                                {['Padova', 'Selvazzano Dentro', 'Abano Terme', 'Vigonza', 'Mestrino', 'Rubano', 'Saonara', 'Noventa Padovana', 'Cadoneghe', 'Saccolongo', 'Montegrotto Terme', 'Teolo'].map((z, i) => (
                                    <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                                        <CheckCircle className="w-3.5 h-3.5 text-teal-500 flex-shrink-0" />
                                        {z}
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-gray-500 mt-4">Visite in azienda disponibili su tutto il territorio provinciale</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* APERTURA */}
            <section className="py-12 bg-amber-50 border-y border-amber-200">
                <div className="container mx-auto px-4 max-w-3xl text-center">
                    <span className="inline-flex items-center gap-2 bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-sm font-medium mb-4">
                        <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
                        In apertura
                    </span>
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">Apertura dei Servizi</h2>
                    <p className="text-gray-600 mb-6">Il Poliambulatorio Element Medica sta completando la propria operatività. Alcuni servizi specialistici verranno attivati nei prossimi mesi.</p>
                    <div className="grid md:grid-cols-3 gap-4 text-left mb-6">
                        <div className="bg-white rounded-xl p-4 border border-green-200">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="w-2.5 h-2.5 bg-green-500 rounded-full"></span>
                                <span className="font-bold text-green-700 text-sm">GIÀ ATTIVO</span>
                            </div>
                            <ul className="text-sm text-gray-700 space-y-1">
                                <li>✓ Medicina del Lavoro</li>
                                <li>✓ Medico Competente Aziendale</li>
                                <li>✓ Sorveglianza Sanitaria</li>
                            </ul>
                        </div>
                        <div className="bg-white rounded-xl p-4 border border-amber-200">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse"></span>
                                <span className="font-bold text-amber-700 text-sm">IN ATTIVAZIONE</span>
                            </div>
                            <ul className="text-sm text-gray-700 space-y-1">
                                <li>○ Visite Specialistiche</li>
                                <li>○ Poliambulatorio Completo</li>
                                <li>○ Prenotazioni e Referti Online</li>
                            </ul>
                        </div>
                        <div className="bg-white rounded-xl p-4 border border-gray-200">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="w-2.5 h-2.5 bg-gray-400 rounded-full"></span>
                                <span className="font-bold text-gray-600 text-sm">IN PROGRAMMAZIONE</span>
                            </div>
                            <ul className="text-sm text-gray-700 space-y-1">
                                <li>○ Diagnostica Strumentale</li>
                                <li>○ Punto Prelievi</li>
                                <li>○ Convenzioni Fondi Sanitari</li>
                            </ul>
                        </div>
                    </div>
                    <a href="/contatti" className="inline-flex items-center gap-2 bg-teal-600 text-white px-8 py-3 rounded-full font-bold hover:bg-teal-700 transition-all">
                        Vuoi Essere Informato all'Apertura? <ArrowRight className="w-4 h-4" />
                    </a>
                </div>
            </section>

            {/* CTA */}
            <section className="py-16 bg-teal-700">
                <div className="container mx-auto px-4 text-center">
                    <h2 className="text-3xl font-bold text-white mb-4">Prenota la Tua Visita</h2>
                    <p className="text-white/90 mb-8 text-lg max-w-2xl mx-auto">
                        Medicina del Lavoro e sorveglianza sanitaria già disponibili. Contattaci per informazioni sui prossimi servizi in attivazione.
                    </p>
                    <div className="flex flex-wrap gap-4 justify-center">
                        <PublicButton to="/prenota" variant="primary" size="lg" className="bg-white text-teal-700 hover:bg-teal-50">
                            Prenota Online <ArrowRight className="w-5 h-5 ml-2" />
                        </PublicButton>
                        <a href="tel:+393513181574" className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-8 py-4 rounded-full text-lg font-medium transition-all">
                            <Phone className="w-5 h-5" />+39 351 318 1574
                        </a>
                    </div>
                </div>
            </section>
        </PublicLayout>
    );
};

export default ChiSiamoMedicaStaticPage;
