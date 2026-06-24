/**
 * ChiSiamoStaticPage
 *
 * Pagina "Chi Siamo" STATICA per elementsicurezza.com.
 * NON usa CMS API — contenuto hardcoded per SEO perfetto.
 * Per elementmedica.com la pagina chi-siamo rimane gestita dal CMS.
 */

import React from 'react';
import {
    Award, Users, Shield, CheckCircle, Star,
    MapPin, Phone, ArrowRight, Building2,
    FileCheck, Clock, TrendingUp, Heart,
} from 'lucide-react';
import { PublicLayout } from '../../components/public/PublicLayout';
import { HeroSection } from '../../components/public/HeroSection';
import { PublicButton } from '../../components/public/PublicButton';
import SEOHead from '../../components/seo/SEOHead';

const ChiSiamoStaticPage: React.FC = () => {
    const structuredData = {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'Organization',
                name: 'Element Sicurezza',
                alternateName: 'Element srl – Divisione Sicurezza sul Lavoro',
                url: 'https://www.elementsicurezza.com',
                logo: 'https://www.elementsicurezza.com/assets/logos/element-sicurezza-logo.png',
                foundingDate: '2023',
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
                hasCredential: [
                    { '@type': 'EducationalOccupationalCredential', credentialCategory: 'Collaborazione con Ente Accreditato in Regione per la Formazione' },
                ],
            },
        ],
    };

    return (
        <PublicLayout>
            <SEOHead
                title="Chi Siamo | Element Sicurezza – Ente Formazione Sicurezza Lavoro Padova"
                description="Element Sicurezza: formazione D.Lgs 81/08 in collaborazione con un Ente Accreditato in Regione, RSPP esterno e medicina del lavoro a Padova e Selvazzano Dentro. Scopri la nostra storia, il team e i nostri valori."
                keywords={[
                    'Element Sicurezza chi siamo',
                    'ente formazione sicurezza Padova',
                    'corsi sicurezza lavoro Padova',
                    'RSPP esterno Padova',
                    'medicina del lavoro Selvazzano',
                    'formazione D.Lgs 81/08',
                    'ente accreditato Regione Veneto',
                    'Selvazzano Dentro',
                ]}
                canonicalUrl="https://www.elementsicurezza.com/chi-siamo"
                ogTitle="Chi Siamo – Element Sicurezza"
                ogDescription="Dal 2023 nella sicurezza sul lavoro. Formazione in collaborazione con un Ente Accreditato in Regione. 300+ aziende servite a Padova e Veneto."
                structuredData={structuredData}
            />

            {/* HERO */}
            <HeroSection
                title={<>Chi Siamo<br /><span style={{ color: 'var(--color-primary-300)' }}>Element Sicurezza</span></>}
                subtitle="La Sicurezza Sul Lavoro è il Nostro Impegno"
                description="Dal 2023 accompagniamo le aziende nella gestione della sicurezza e della salute dei lavoratori. Team di professionisti qualificati, 300+ aziende clienti, con formazione D.Lgs 81/08 e RSPP esterno."
                backgroundVariant="gradient"
                backgroundPattern="diagonal-lines"
                primaryButton={{ text: 'Contattaci', href: '/contatti', icon: <Phone className="w-5 h-5" /> }}
                secondaryButton={{ text: 'I Nostri Servizi', href: '/servizi' }}
                stats={[
                    { value: '3+', label: 'Anni di Esperienza', icon: <Award className="w-5 h-5" /> },
                    { value: '300+', label: 'Aziende Clienti', icon: <Building2 className="w-5 h-5" /> },
                    { value: '5.000+', label: 'Lavoratori/Anno', icon: <Users className="w-5 h-5" /> },
                    { value: '98%', label: 'Soddisfazione', icon: <Star className="w-5 h-5" />, highlight: true },
                ]}
                showTrustBadges
            />

            {/* STORIA & MISSIONE */}
            <section className="py-16 bg-white">
                <div className="container mx-auto px-4 max-w-5xl">
                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        <div>
                            <div className="inline-flex items-center gap-2 bg-primary-50 text-primary-700 px-3 py-1 rounded-full text-sm font-medium mb-4">
                                <Shield className="w-4 h-4" />
                                La Nostra Missione
                            </div>
                            <h2 className="text-3xl font-bold text-gray-900 mb-6">Sicurezza e Formazione di Qualità dal 2023</h2>
                            <p className="text-gray-600 mb-4 leading-relaxed">
                                Element Sicurezza nasce nel 2023 dalla visione di professionisti esperti nel campo della sicurezza sul lavoro e della formazione professionale. La nostra missione è semplice: rendere accessibile e comprensibile la normativa D.Lgs 81/08 a tutte le realtà aziendali, indipendentemente dalla dimensione.
                            </p>
                            <p className="text-gray-600 mb-6 leading-relaxed">
                                Negli anni abbiamo costruito un metodo di lavoro rigoroso, orientato alla qualità e alla soddisfazione del cliente. Ogni azienda ha esigenze particolari, e noi le ascoltiamo per costruire soluzioni su misura.
                            </p>
                            <div className="flex items-center gap-3 text-primary-600 font-semibold">
                                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                                In collaborazione con un Ente Accreditato dalla Regione Veneto per la formazione professionale
                            </div>
                        </div>
                        <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100">
                            <h3 className="text-xl font-bold text-gray-900 mb-6">Le Tappe Principali</h3>
                            <div className="space-y-5">
                                {[
                                    { year: '2023', title: 'Nasce Element Sicurezza', desc: 'Partiamo con l\'erogazione di corsi di formazione e consulenza antinfortunistica, diventando partner strategico per le imprese locali.', active: true },
                                    { year: '2025', title: 'Nasce Element Medica', desc: 'Si affianca Element Medica grazie all\'integrazione dei servizi di Medicina del Lavoro. La prevenzione diventa clinica: affianchiamo alla sicurezza sul campo la sorveglianza sanitaria professionale.', active: true },
                                    { year: '2026', title: 'Inaugurazione Poliambulatorio', desc: 'Inauguriamo il Poliambulatorio Element Medica. Una struttura all\'avanguardia aperta a tutti, dove la cura della salute incontra l\'eccellenza e la tecnologia.', active: true },
                                ].map((item, i) => (
                                    <div key={i} className="flex gap-4">
                                        <div className="flex-shrink-0">
                                            <div className={`w-14 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${item.active ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-500'}`}>{item.year}</div>
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
            <section className="py-16" style={{ background: 'linear-gradient(135deg, #283646 0%, #1d2f40 100%)' }}>
                <div className="container mx-auto px-4">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-white mb-3">I Nostri Valori</h2>
                        <p className="text-white/70 max-w-2xl mx-auto">I principi che guidano ogni nostra azione quotidiana</p>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
                        {[
                            { icon: Shield, title: 'Professionalità', desc: 'Ogni consulente è qualificato, aggiornato e opera con rigore metodologico.' },
                            { icon: Award, title: 'Qualità e Conformità', desc: 'Formazione erogata in collaborazione con un Ente Accreditato in Regione. Docenti qualificati ai criteri del D.I. 6 Marzo 2013.' },
                            { icon: Heart, title: 'Cura del Cliente', desc: 'Ascoltiamo le esigenze di ciascuna azienda e costruiamo soluzioni personalizzate.' },
                            { icon: TrendingUp, title: 'Innovazione', desc: 'Piattaforme digitali, e-learning e strumenti avanzati per semplificare la conformità.' },
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

            {/* TEAM / DOCENTI */}
            <section className="py-16 bg-white">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-gray-900 mb-3">Il Nostro Team</h2>
                        <p className="text-gray-600 max-w-2xl mx-auto">Professionisti qualificati con anni di esperienza sul campo, sempre aggiornati sulle ultime normative</p>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
                        {[
                            { role: 'RSPP Responsabili', icon: Shield, color: 'blue', desc: 'Professionisti qualificati per tutti i 9 macrosettori ATECO, con esperienza in aziende di ogni dimensione e settore.', skills: ['D.Lgs 81/08', 'DVR', 'Sopralluoghi'] },
                            { role: 'Formatori Sicurezza', icon: GraduationCap, color: 'primary', desc: 'Docenti con qualifica ai criteri del D.I. 6 Marzo 2013. Specializzati in formazione generale, specifica, antincendio e primo soccorso.', skills: ['D.Lgs 81/08', 'D.I. 6 Marzo 2013', 'Accordo Stato-Regioni'] },
                            { role: 'Medici del Lavoro', icon: Stethoscope, color: 'teal', desc: 'Medici competenti iscritti all\'albo dei medici del lavoro. Sorveglianza sanitaria, protocolli personalizzati, visite in azienda.', skills: ['Sorveglianza sanitaria', 'DVR', 'Giudizi idoneità'] },
                            { role: 'Consulenti Normativi', icon: FileCheck, color: 'green', desc: 'Esperti in legislazione e normative di sicurezza. Aggiornamenti costanti su circolari, linee guida e prassi di riferimento.', skills: ['Normativa', 'Audit', 'Compliance'] },
                            { role: 'Assistenti Amministrativi', icon: Users, color: 'violet', desc: 'Gestione pratiche, scadenze, attestati e documentazione digitale. Supporto rapido e professionale per ogni esigenza.', skills: ['Gestione scadenze', 'Attestati digitali', 'Supporto'] },
                            { role: 'Tutor E-learning', icon: Clock, color: 'orange', desc: 'Supporto personalizzato per i corsi online. Assistenza tecnica e didattica per garantire il completamento della formazione.', skills: ['E-learning', 'FAD', 'Supporto didattico'] },
                        ].map((m, i) => (
                            <div key={i} className="flex gap-4 p-6 rounded-2xl bg-gray-50 border border-gray-100">
                                <div className={`w-12 h-12 rounded-xl bg-${m.color}-100 flex items-center justify-center flex-shrink-0`}>
                                    <m.icon className={`w-6 h-6 text-${m.color}-700`} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 mb-1">{m.role}</h3>
                                    <p className="text-sm text-gray-600 mb-3">{m.desc}</p>
                                    <div className="flex flex-wrap gap-1">
                                        {m.skills.map((s, j) => (
                                            <span key={j} className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full">{s}</span>
                                        ))}
                                    </div>
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
                            { n: '300+', l: 'Aziende', d: 'Clienti attivi nel territorio' },
                            { n: '5.000+', l: 'Lavoratori', d: 'Formati ogni anno' },
                            { n: '50+', l: 'Corsi', d: 'Tipologie disponibili' },
                            { n: '3+', l: 'Anni', d: 'Di esperienza sul campo' },
                        ].map((s, i) => (
                            <div key={i} className="bg-white rounded-2xl p-6 text-center shadow-sm border border-gray-100">
                                <div className="text-4xl font-bold text-primary-600 mb-1">{s.n}</div>
                                <div className="font-semibold text-gray-900">{s.l}</div>
                                <div className="text-xs text-gray-500 mt-1">{s.d}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* QUALIFICHE E CREDENZIALI */}
            <section className="py-16 bg-white">
                <div className="container mx-auto px-4 max-w-4xl">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-gray-900 mb-3">Qualifiche e Credenziali</h2>
                        <p className="text-gray-600">Le nostre qualifiche professionali garantiscono la validità legale di tutti gli attestati e i servizi erogati</p>
                    </div>
                    <div className="grid md:grid-cols-2 gap-6">
                        {[
                            {
                                icon: CheckCircle,
                                color: 'green',
                                title: 'Collaborazione con Ente Accreditato in Regione',
                                subtitle: 'Formazione professionale – Regione Veneto',
                                badge: 'Attivo',
                                badgeColor: 'green',
                                desc: 'Eroghiamo la formazione professionale in collaborazione con un Ente Accreditato dalla Regione Veneto. Gli attestati sono validi ai sensi del D.Lgs 81/08 con docenti qualificati.',
                            },
                            {
                                icon: Shield,
                                color: 'blue',
                                title: 'Qualifica Docenti D.I. 6/3/2013',
                                subtitle: 'Decreto Interministeriale',
                                badge: 'Attivo',
                                badgeColor: 'green',
                                desc: 'Tutti i formatori sono in possesso dei requisiti richiesti dal Decreto Interministeriale 6 Marzo 2013 per l\'erogazione di formazione in materia di salute e sicurezza.',
                            },
                            {
                                icon: FileCheck,
                                color: 'teal',
                                title: 'Qualifica RSPP',
                                subtitle: 'D.Lgs 81/08 – Tutti i macrosettori ATECO',
                                badge: 'Attivo',
                                badgeColor: 'green',
                                desc: 'I nostri RSPP sono qualificati per tutti i 9 macrosettori ATECO con formazione aggiornata ai sensi dell\'Accordo Stato-Regioni del 7 luglio 2016.',
                            },
                        ].map((c, i) => (
                            <div key={i} className={`flex gap-4 p-6 rounded-2xl bg-${c.color}-50 border border-${c.color}-100`}>
                                <div className={`w-12 h-12 rounded-xl bg-${c.color}-100 flex items-center justify-center flex-shrink-0`}>
                                    <c.icon className={`w-6 h-6 text-${c.color}-700`} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <h3 className="font-bold text-gray-900">{c.title}</h3>
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium bg-${c.badgeColor}-100 text-${c.badgeColor}-700`}>{c.badge}</span>
                                    </div>
                                    <p className={`text-xs text-${c.color}-700 font-medium mb-2`}>{c.subtitle}</p>
                                    <p className="text-sm text-gray-600">{c.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* COLLABORAZIONI */}
            <section className="py-16 bg-gray-50">
                <div className="container mx-auto px-4 max-w-4xl">
                    <div className="text-center mb-12">
                        <div className="inline-flex items-center gap-2 bg-primary-50 text-primary-700 px-3 py-1 rounded-full text-sm font-medium mb-4">
                            <Users className="w-4 h-4" />
                            Partnership e Collaborazioni
                        </div>
                        <h2 className="text-3xl font-bold text-gray-900 mb-3">Le Nostre Collaborazioni</h2>
                        <p className="text-gray-600 max-w-2xl mx-auto">Collaboriamo con le principali associazioni datoriali del territorio per portare sicurezza e formazione alle imprese associate</p>
                    </div>
                    <div className="grid md:grid-cols-2 gap-8">
                        <a href="https://www.ascompd.com/" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-4 p-8 bg-white rounded-2xl border border-gray-100 hover:border-primary-200 hover:shadow-md transition-all no-underline">
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
                                <p className="text-sm text-gray-600 mt-1">Partner per i servizi di formazione sicurezza e consulenza RSPP alle imprese del commercio, turismo e servizi del territorio padovano.</p>
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
                                <p className="text-sm text-gray-600 mt-1">Partner per i servizi di formazione sicurezza e consulenza RSPP alle imprese artigiane del territorio padovano.</p>
                            </div>
                        </a>
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
                                <p className="text-sm text-gray-600 mt-1">Confederazione Italiana Sviluppo Imprese — Offriamo formazione sicurezza e RSPP esterno alle aziende associate a condizioni dedicate.</p>
                            </div>
                        </a>
                        <a href="https://www.fimiebap.it/" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-4 p-8 bg-white rounded-2xl border border-gray-100 hover:border-primary-200 hover:shadow-md transition-all no-underline">
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
                                <p className="text-sm text-gray-600 mt-1">Ente Bilaterale per l'Agricoltura Padovana — Fondo Integrazione Indennità Malattia e Infortunio Lavoratori Agricoli. Partner per i servizi di sicurezza sul lavoro e formazione in agricoltura.</p>
                            </div>
                        </a>
                    </div>
                    <div className="bg-primary-50 border border-primary-200 rounded-2xl p-6 text-center mt-8">
                        <p className="text-primary-800 text-sm">
                            <strong>Sei membro di un'associazione di categoria?</strong> Contattaci per conoscere le condizioni riservate agli associati.
                        </p>
                        <a href="/contatti" className="inline-flex items-center gap-2 mt-3 bg-primary-600 text-white px-6 py-2 rounded-full text-sm font-medium hover:bg-primary-700 transition-all">
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
                            <div className="inline-flex items-center gap-2 bg-primary-50 text-primary-700 px-3 py-1 rounded-full text-sm font-medium mb-4">
                                <MapPin className="w-4 h-4" />
                                La Nostra Sede
                            </div>
                            <h2 className="text-3xl font-bold text-gray-900 mb-4">Selvazzano Dentro – Padova</h2>
                            <p className="text-gray-600 mb-6">
                                La nostra sede è strategicamente posizionata a Selvazzano Dentro (PD), a pochi minuti da Padova e facilmente raggiungibile dall'autostrada A4. Serviamo aziende in tutto il Veneto e in Italia.
                            </p>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 text-gray-700">
                                    <MapPin className="w-5 h-5 text-primary-500 flex-shrink-0" />
                                    <span>Via Bracciano 34, 35030 Selvazzano Dentro (PD)</span>
                                </div>
                                <div className="flex items-center gap-3 text-gray-700">
                                    <Phone className="w-5 h-5 text-primary-500 flex-shrink-0" />
                                    <a href="tel:+393516239176" className="hover:text-primary-600">+39 351 623 9176</a>
                                </div>
                                <div className="flex items-center gap-3 text-gray-700">
                                    <Clock className="w-5 h-5 text-primary-500 flex-shrink-0" />
                                    <span>Lun–Ven: 8:30–18:30 · Servizio corsi anche sabato</span>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
                            <h3 className="font-bold text-gray-900 mb-4">Zone Servite Regolarmente</h3>
                            <div className="grid grid-cols-2 gap-2">
                                {['Padova', 'Selvazzano Dentro', 'Abano Terme', 'Vigonza', 'Mestrino', 'Rubano', 'Saonara', 'Noventa Padovana', 'Cadoneghe', 'Venezia', 'Vicenza', 'Treviso'].map((z, i) => (
                                    <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                                        <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                                        {z}
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-gray-500 mt-4">E in tutta Italia con formazione online e in azienda</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-16" style={{ background: 'linear-gradient(135deg, var(--color-primary-600), var(--color-primary-800))' }}>
                <div className="container mx-auto px-4 text-center">
                    <h2 className="text-3xl font-bold text-white mb-4">Vuoi Collaborare con Noi?</h2>
                    <p className="text-white/80 mb-8 text-lg max-w-2xl mx-auto">
                        Contattaci per un preventivo gratuito, senza impegno. Il nostro team ti aiuterà a trovare la soluzione più adatta alla tua azienda.
                    </p>
                    <div className="flex flex-wrap gap-4 justify-center">
                        <PublicButton to="/contatti" variant="primary" size="lg" className="bg-white text-primary-700 hover:bg-primary-50">
                            Contattaci Ora <ArrowRight className="w-5 h-5 ml-2" />
                        </PublicButton>
                        <a href="tel:+393516239176" className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-8 py-4 rounded-full text-lg font-medium transition-all">
                            <Phone className="w-5 h-5" />+39 351 623 9176
                        </a>
                    </div>
                </div>
            </section>
        </PublicLayout>
    );
};

// Icons used in team section (not imported at top to avoid unused import warning)
const GraduationCap = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
    </svg>
);

const Stethoscope = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
);

export default ChiSiamoStaticPage;
