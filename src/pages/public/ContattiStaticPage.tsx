/**
 * ContattiStaticPage
 *
 * Pagina "Contatti" STATICA brand-aware (elementsicurezza.com + elementmedica.com).
 * NON usa CMS API — contenuto hardcoded per SEO perfetto.
 */

import React, { useState } from 'react';
import {
    Phone, Mail, MapPin, Clock, ArrowRight,
    CheckCircle, Building2, Users, MessageSquare,
    Send, Shield, Stethoscope,
} from 'lucide-react';
import { PublicLayout } from '../../components/public/PublicLayout';
import { HeroSection } from '../../components/public/HeroSection';
import SEOHead from '../../components/seo/SEOHead';
import { ContactForm } from '../../components/public/ContactForm';

const brandId = import.meta.env.VITE_BRAND_ID || 'element-sicurezza';
const isMedica = brandId === 'element-medica';

// ─────────────────────────────────────────────────────────────────
// CONTATTI ELEMENT SICUREZZA
// ─────────────────────────────────────────────────────────────────

const ContattiSicurezza: React.FC = () => {
    const [selectedReason, setSelectedReason] = useState('');

    const reasons = [
        { value: 'preventivo', label: '📋 Preventivo gratuito', icon: '📋' },
        { value: 'corsi', label: '🎓 Informazioni corsi', icon: '🎓' },
        { value: 'rspp', label: '🛡️ Nomina RSPP esterno', icon: '🛡️' },
        { value: 'medicina', label: '🩺 Medicina del lavoro', icon: '🩺' },
        { value: 'dvr', label: '📄 DVR e consulenza', icon: '📄' },
        { value: 'altro', label: '💬 Altro', icon: '💬' },
    ];

    const structuredData = {
        '@context': 'https://schema.org',
        '@type': 'ContactPage',
        name: 'Contatti Element Sicurezza',
        url: 'https://www.elementsicurezza.com/contatti',
        mainEntity: {
            '@type': 'LocalBusiness',
            name: 'Element Sicurezza',
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
            openingHoursSpecification: [
                { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], opens: '08:30', closes: '18:30' },
            ],
        },
    };

    return (
        <PublicLayout>
            <SEOHead
                title="Contatti | Element Sicurezza – Sicurezza sul Lavoro Padova Selvazzano"
                description="Contatta Element Sicurezza per preventivi gratuiti su corsi di sicurezza D.Lgs 81/08, RSPP esterno, medicina del lavoro. Padova, Selvazzano Dentro. Risposta entro 24 ore."
                keywords={['contatti Element Sicurezza', 'preventivo corsi sicurezza Padova', 'RSPP esterno contatto', 'medicina del lavoro Padova', 'formazione sicurezza Selvazzano', 'consulenza D.Lgs 81/08']}
                canonicalUrl="https://www.elementsicurezza.com/contatti"
                ogTitle="Contatti – Element Sicurezza | Padova"
                ogDescription="Scrivi o chiama Element Sicurezza per corsi, RSPP, medicina del lavoro e consulenza sicurezza. Via Bracciano 34, Selvazzano Dentro (PD)."
                structuredData={structuredData}
            />

            {/* HERO */}
            <HeroSection
                title={<>Siamo qui<br /><span style={{ color: 'var(--color-primary-300)' }}>per aiutarti</span></>}
                subtitle="Risposta garantita entro 24 ore"
                description="Hai bisogno di un preventivo, informazioni sui corsi o una consulenza? Contattaci — i nostri esperti ti risponderanno al più presto, senza impegno."
                backgroundVariant="gradient"
                backgroundPattern="diagonal-lines"
                primaryButton={{ text: 'Chiama Ora', href: 'tel:+393516239176', icon: <Phone className="w-5 h-5" /> }}
                secondaryButton={{ text: 'Scrivi su WhatsApp', href: 'https://wa.me/393516239176' }}
                stats={[
                    { value: '24h', label: 'Risposta garantita', icon: <Clock className="w-5 h-5" /> },
                    { value: '300+', label: 'Aziende servite', icon: <Building2 className="w-5 h-5" /> },
                    { value: '98%', label: 'Clienti soddisfatti', icon: <CheckCircle className="w-5 h-5" /> },
                ]}
                showTrustBadges
            />

            {/* MOTIVO CONTATTO */}
            <section className="py-12 bg-white">
                <div className="container mx-auto px-4 max-w-4xl">
                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Come possiamo aiutarti?</h2>
                        <p className="text-gray-600">Seleziona il motivo della tua richiesta — ti inoltreremo al referente più adatto</p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-w-2xl mx-auto">
                        {reasons.map((r) => (
                            <button
                                key={r.value}
                                onClick={() => setSelectedReason(r.value)}
                                className={`p-4 rounded-xl border-2 text-sm font-medium transition-all text-left ${selectedReason === r.value ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-primary-300'}`}
                            >
                                <span className="mr-2">{r.icon}</span>
                                {r.label.replace(/^.{2} /, '')}
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            {/* FORM + INFO */}
            <section className="py-8 bg-gray-50">
                <div className="container mx-auto px-4">
                    <div className="grid lg:grid-cols-2 gap-12 max-w-5xl mx-auto">

                        {/* FORM */}
                        <div>
                            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
                                <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                                    <MessageSquare className="w-5 h-5 text-primary-600" />
                                    Invia un Messaggio
                                </h3>
                                <ContactForm
                                    defaultSubject={selectedReason ? `Richiesta: ${reasons.find(r => r.value === selectedReason)?.label || selectedReason}` : undefined}
                                />
                            </div>
                        </div>

                        {/* INFO CONTATTO */}
                        <div className="space-y-6">
                            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                                <h3 className="text-lg font-bold text-gray-900 mb-5">Contatti Diretti</h3>
                                <div className="space-y-4">
                                    <a href="tel:+393516239176" className="flex items-center gap-4 p-4 bg-primary-50 rounded-xl hover:bg-primary-100 transition-all group">
                                        <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center flex-shrink-0">
                                            <Phone className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                            <div className="font-bold text-gray-900">+39 351 623 9176</div>
                                            <div className="text-sm text-gray-500">Linea principale sicurezza</div>
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-primary-400 ml-auto opacity-0 group-hover:opacity-100 transition-all" />
                                    </a>
                                    <a href="mailto:info@elementsicurezza.com" className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all group">
                                        <div className="w-10 h-10 bg-gray-700 rounded-xl flex items-center justify-center flex-shrink-0">
                                            <Mail className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                            <div className="font-bold text-gray-900">info@elementsicurezza.com</div>
                                            <div className="text-sm text-gray-500">Risposta entro 24h</div>
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-gray-400 ml-auto opacity-0 group-hover:opacity-100 transition-all" />
                                    </a>
                                    <a href="https://wa.me/393516239176" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-4 bg-green-50 rounded-xl hover:bg-green-100 transition-all group">
                                        <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center flex-shrink-0">
                                            <MessageSquare className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                            <div className="font-bold text-gray-900">WhatsApp</div>
                                            <div className="text-sm text-gray-500">Risposta rapida in chat</div>
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-green-400 ml-auto opacity-0 group-hover:opacity-100 transition-all" />
                                    </a>
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                                <h3 className="text-lg font-bold text-gray-900 mb-4">Sede e Orari</h3>
                                <div className="space-y-3">
                                    <div className="flex items-start gap-3">
                                        <MapPin className="w-5 h-5 text-primary-500 mt-0.5 flex-shrink-0" />
                                        <div>
                                            <div className="font-medium text-gray-900">Via Bracciano 34</div>
                                            <div className="text-sm text-gray-600">35030 Selvazzano Dentro (PD)</div>
                                            <a href="https://maps.google.com/?q=Via+Bracciano+34+Selvazzano+Dentro" target="_blank" rel="noopener noreferrer" className="text-xs text-primary-600 hover:underline mt-1 inline-block">
                                                Apri su Google Maps →
                                            </a>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <Clock className="w-5 h-5 text-primary-500 mt-0.5 flex-shrink-0" />
                                        <div className="text-sm text-gray-700">
                                            <div><strong>Lun–Ven:</strong> 8:30–18:30</div>
                                            <div><strong>Sabato:</strong> Servizio corsi (dietro appuntamento)</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-primary-50 rounded-2xl p-6 border border-primary-100">
                                <h3 className="text-lg font-bold text-gray-900 mb-3">Servizi Disponibili</h3>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { icon: Shield, label: 'RSPP Esterno', href: '/rspp' },
                                        { icon: Users, label: 'Corsi Sicurezza', href: '/corsi' },
                                        { icon: Stethoscope, label: 'Medicina del Lavoro', href: '/medicina-del-lavoro' },
                                        { icon: CheckCircle, label: 'DVR e Consulenza', href: '/rspp' },
                                    ].map((s, i) => (
                                        <a key={i} href={s.href} className="flex items-center gap-2 text-sm text-primary-700 hover:text-primary-900 hover:underline">
                                            <s.icon className="w-4 h-4 flex-shrink-0" />
                                            {s.label}
                                        </a>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* MAPPA */}
            <section className="bg-gray-200 h-64 relative overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                    <div className="text-center">
                        <MapPin className="w-8 h-8 text-primary-600 mx-auto mb-2" />
                        <div className="font-bold text-gray-900">Via Bracciano 34, Selvazzano Dentro (PD)</div>
                        <a href="https://maps.google.com/?q=Via+Bracciano+34+Selvazzano+Dentro" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline text-sm mt-1 inline-block">
                            Apri su Google Maps →
                        </a>
                    </div>
                </div>
            </section>

            {/* RISPOSTA RAPIDA */}
            <section className="py-12 bg-white">
                <div className="container mx-auto px-4 max-w-4xl">
                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Cosa succede dopo che ci contatti?</h2>
                    </div>
                    <div className="grid md:grid-cols-4 gap-6">
                        {[
                            { n: '01', icon: Send, title: 'Ricevi conferma', desc: 'Ti mandiamo una email di conferma entro pochi minuti.' },
                            { n: '02', icon: Phone, title: 'Ti chiamiamo', desc: 'Un nostro consulente ti contatta entro 24 ore lavorative.' },
                            { n: '03', icon: CheckCircle, title: 'Preventivo', desc: 'Ricevi un preventivo personalizzato e gratuito senza impegno.' },
                            { n: '04', icon: ArrowRight, title: 'Iniziamo', desc: 'Una volta approvato, partiamo in tempi record.' },
                        ].map((s, i) => (
                            <div key={i} className="text-center">
                                <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-3">
                                    <s.icon className="w-5 h-5 text-primary-600" />
                                </div>
                                <div className="text-xs font-bold text-primary-500 mb-1">{s.n}</div>
                                <h3 className="font-bold text-gray-900 mb-1">{s.title}</h3>
                                <p className="text-sm text-gray-600">{s.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </PublicLayout>
    );
};

// ─────────────────────────────────────────────────────────────────
// CONTATTI ELEMENT MEDICA
// ─────────────────────────────────────────────────────────────────

const ContattiMedica: React.FC = () => {
    const [selectedReason, setSelectedReason] = useState('');

    const reasons = [
        { value: 'medicina-lavoro', label: '🩺 Medicina del Lavoro', icon: '🩺' },
        { value: 'prenota', label: '📅 Prenota una visita', icon: '📅' },
        { value: 'mc-aziendale', label: '🏢 Medico Competente', icon: '🏢' },
        { value: 'info-apertura', label: '🏥 Info apertura', icon: '🏥' },
        { value: 'convenzioni', label: '🤝 Convenzioni', icon: '🤝' },
        { value: 'altro', label: '💬 Altro', icon: '💬' },
    ];

    const structuredData = {
        '@context': 'https://schema.org',
        '@type': 'ContactPage',
        name: 'Contatti Element Medica',
        url: 'https://www.elementmedica.com/contatti',
        mainEntity: {
            '@type': 'MedicalOrganization',
            name: 'Poliambulatorio Element Medica',
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
        },
    };

    return (
        <PublicLayout>
            <SEOHead
                title="Contatti | Element Medica – Poliambulatorio Selvazzano Dentro Padova"
                description="Contatta il Poliambulatorio Element Medica per prenotazioni, medicina del lavoro aziendale, nomina medico competente. Selvazzano Dentro (PD), 10 minuti da Padova."
                keywords={['contatti Element Medica', 'poliambulatorio Selvazzano contatti', 'medicina del lavoro Padova prenota', 'medico competente contatto', 'visita medica aziendale Padova']}
                canonicalUrl="https://www.elementmedica.com/contatti"
                ogTitle="Contatti – Poliambulatorio Element Medica | Selvazzano Dentro"
                ogDescription="Prenota una visita o richiedi informazioni su medicina del lavoro e sorveglianza sanitaria aziendale. Via Bracciano 34, Selvazzano Dentro (PD)."
                structuredData={structuredData}
            />

            {/* HERO */}
            <HeroSection
                title={<>Contattaci<br /><span style={{ color: 'var(--color-primary-300)' }}>siamo qui per te</span></>}
                subtitle="Prenotazioni e informazioni"
                description="Prenota una visita, richiedi informazioni sulla medicina del lavoro o contattaci per qualsiasi esigenza. I nostri operatori ti risponderanno entro poche ore."
                backgroundVariant="gradient"
                primaryButton={{ text: 'Prenota Online', href: '/prenota', icon: <Stethoscope className="w-5 h-5" /> }}
                secondaryButton={{ text: 'Chiama Ora', href: 'tel:+393513181574' }}
                stats={[
                    { value: '24h', label: 'Risposta garantita', icon: <Clock className="w-5 h-5" /> },
                    { value: '10 min', label: 'da Padova', icon: <MapPin className="w-5 h-5" /> },
                    { value: '48h', label: 'Attivazione MC', icon: <CheckCircle className="w-5 h-5" /> },
                ]}
                showTrustBadges
            />

            {/* ALERT APERTURA */}
            <section className="py-4 bg-amber-50 border-b border-amber-200">
                <div className="container mx-auto px-4">
                    <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-amber-800">
                        <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse inline-block"></span>
                        <strong>Poliambulatorio in fase di apertura.</strong>
                        <span>Già attivo: Medicina del Lavoro e nomina Medico Competente.</span>
                        <a href="/prenota" className="bg-amber-600 text-white font-bold px-3 py-1 rounded-full text-xs hover:bg-amber-700 transition-all">Prenota Ora →</a>
                    </div>
                </div>
            </section>

            {/* MOTIVO CONTATTO */}
            <section className="py-12 bg-white">
                <div className="container mx-auto px-4 max-w-4xl">
                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Come possiamo aiutarti?</h2>
                        <p className="text-gray-600">Seleziona il motivo della tua richiesta</p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-w-2xl mx-auto">
                        {reasons.map((r) => (
                            <button
                                key={r.value}
                                onClick={() => setSelectedReason(r.value)}
                                className={`p-4 rounded-xl border-2 text-sm font-medium transition-all text-left ${selectedReason === r.value ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-teal-300'}`}
                            >
                                <span className="mr-2">{r.icon}</span>
                                {r.label.replace(/^.{2} /, '')}
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            {/* FORM + INFO */}
            <section className="py-8 bg-gray-50">
                <div className="container mx-auto px-4">
                    <div className="grid lg:grid-cols-2 gap-12 max-w-5xl mx-auto">

                        {/* FORM */}
                        <div>
                            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
                                <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                                    <MessageSquare className="w-5 h-5 text-teal-600" />
                                    Invia un Messaggio
                                </h3>
                                <ContactForm
                                    defaultSubject={selectedReason ? `Richiesta: ${reasons.find(r => r.value === selectedReason)?.label || selectedReason}` : undefined}
                                />
                            </div>
                        </div>

                        {/* INFO CONTATTO */}
                        <div className="space-y-6">
                            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                                <h3 className="text-lg font-bold text-gray-900 mb-5">Contatti Diretti</h3>
                                <div className="space-y-4">
                                    <a href="tel:+393513181574" className="flex items-center gap-4 p-4 bg-teal-50 rounded-xl hover:bg-teal-100 transition-all group">
                                        <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center flex-shrink-0">
                                            <Phone className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                            <div className="font-bold text-gray-900">+39 351 318 1574</div>
                                            <div className="text-sm text-gray-500">Linea prenotazioni e info</div>
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-teal-400 ml-auto opacity-0 group-hover:opacity-100 transition-all" />
                                    </a>
                                    <a href="mailto:info@elementmedica.com" className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all group">
                                        <div className="w-10 h-10 bg-gray-700 rounded-xl flex items-center justify-center flex-shrink-0">
                                            <Mail className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                            <div className="font-bold text-gray-900">info@elementmedica.com</div>
                                            <div className="text-sm text-gray-500">Risposta entro 24h</div>
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-gray-400 ml-auto opacity-0 group-hover:opacity-100 transition-all" />
                                    </a>
                                    <a href="https://wa.me/393513181574" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-4 bg-green-50 rounded-xl hover:bg-green-100 transition-all group">
                                        <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center flex-shrink-0">
                                            <MessageSquare className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                            <div className="font-bold text-gray-900">WhatsApp</div>
                                            <div className="text-sm text-gray-500">Per prenotazioni rapide</div>
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-green-400 ml-auto opacity-0 group-hover:opacity-100 transition-all" />
                                    </a>
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                                <h3 className="text-lg font-bold text-gray-900 mb-4">Sede e Orari</h3>
                                <div className="space-y-3">
                                    <div className="flex items-start gap-3">
                                        <MapPin className="w-5 h-5 text-teal-500 mt-0.5 flex-shrink-0" />
                                        <div>
                                            <div className="font-medium text-gray-900">Via Bracciano 34</div>
                                            <div className="text-sm text-gray-600">35030 Selvazzano Dentro (PD)</div>
                                            <div className="text-xs text-gray-500 mt-0.5">A 10 minuti da Padova centro</div>
                                            <a href="https://maps.google.com/?q=Via+Bracciano+34+Selvazzano+Dentro" target="_blank" rel="noopener noreferrer" className="text-xs text-teal-600 hover:underline mt-1 inline-block">
                                                Apri su Google Maps →
                                            </a>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <Clock className="w-5 h-5 text-teal-500 mt-0.5 flex-shrink-0" />
                                        <div className="text-sm text-gray-700">
                                            <div><strong>Lun–Ven:</strong> 8:00–19:00</div>
                                            <div><strong>Sabato:</strong> 8:00–13:00</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-teal-50 rounded-2xl p-6 border border-teal-100">
                                <h3 className="text-lg font-bold text-gray-900 mb-3">Servizi Attivi</h3>
                                <div className="space-y-2">
                                    {[
                                        { label: 'Medicina del Lavoro', active: true, href: '/medicina-del-lavoro' },
                                        { label: 'Nomina Medico Competente', active: true, href: '/medicina-del-lavoro' },
                                        { label: 'Sorveglianza Sanitaria', active: true, href: '/medicina-del-lavoro' },
                                        { label: 'Visite Specialistiche', active: false, href: '/visite-specialistiche' },
                                        { label: 'Diagnostica Strumentale', active: false, href: '/diagnostica' },
                                    ].map((s, i) => (
                                        <a key={i} href={s.href} className={`flex items-center gap-2 text-sm hover:underline ${s.active ? 'text-teal-700' : 'text-gray-500'}`}>
                                            <span className={`w-2 h-2 rounded-full ${s.active ? 'bg-green-500' : 'bg-amber-400 animate-pulse'}`}></span>
                                            {s.label}
                                            {!s.active && <span className="text-xs">(in apertura)</span>}
                                        </a>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* MAPPA */}
            <section className="bg-gray-200 h-64 relative overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                    <div className="text-center">
                        <MapPin className="w-8 h-8 text-teal-600 mx-auto mb-2" />
                        <div className="font-bold text-gray-900">Via Bracciano 34, Selvazzano Dentro (PD)</div>
                        <div className="text-sm text-gray-500 mt-1">10 minuti da Padova centro · SS11</div>
                        <a href="https://maps.google.com/?q=Via+Bracciano+34+Selvazzano+Dentro" target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline text-sm mt-1 inline-block">
                            Apri su Google Maps →
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

const ContattiStaticPage: React.FC = () => isMedica ? <ContattiMedica /> : <ContattiSicurezza />;
export default ContattiStaticPage;
