/**
 * GruppoServiziPage — Cross-Domain Services Overview
 * 
 * Shows ALL services from the Element group (both ElementSicurezza and ElementMedica).
 * Adapts automatically based on the current brand:
 * - Current brand's services → internal links
 * - Other brand's services → external links to the other domain
 * 
 * This creates a bridge between the two brand websites, helping users
 * discover all available services from the Element group.
 */

import React from 'react';
import { PublicLayout } from '../../components/public/PublicLayout';
import { PublicButton } from '../../components/public/PublicButton';
import { ScrollReveal } from '../../components/public/ScrollReveal';
import { getCurrentBrand, getBrandById } from '@/config/brands.config';
import {
    GraduationCap,
    Shield,
    FileText,
    Heart,
    Stethoscope,
    Activity,
    AlertTriangle,
    Users,
    Building2,
    ExternalLink,
    ArrowRight,
} from 'lucide-react';
import { trackCtaEvent } from '../../services/logs';
import SEOHead from '../../components/seo/SEOHead';
import { generateParentOrganizationSchema } from '../../components/seo/MedicalSchemas';

// ─────────────────────────────────────────────
// Service definitions per brand
// ─────────────────────────────────────────────

interface ServiceItem {
    title: string;
    description: string;
    icon: React.FC<{ className?: string; style?: React.CSSProperties }>;
    href: string;
    features: string[];
}

const sicurezzaServices: ServiceItem[] = [
    {
        title: 'Corsi di Formazione sulla Sicurezza',
        description: 'Corsi completi per la formazione dei lavoratori in materia di sicurezza sul lavoro, conformi al D.Lgs. 81/08.',
        icon: GraduationCap,
        href: '/corsi',
        features: ['Formazione generale e specifica', 'Corsi per preposti e dirigenti', 'Aggiornamenti periodici', 'Attestati riconosciuti'],
    },
    {
        title: 'Nomina RSPP',
        description: 'Servizio di Responsabile del Servizio di Prevenzione e Protezione per la vostra azienda.',
        icon: Shield,
        href: '/rspp',
        features: ['Valutazione dei rischi', 'Elaborazione DVR', 'Consulenza continua', 'Sopralluoghi periodici'],
    },
    {
        title: 'Medicina del Lavoro',
        description: 'Sorveglianza sanitaria completa per garantire la salute dei vostri dipendenti.',
        icon: Heart,
        href: '/medicina-del-lavoro',
        features: ['Visite mediche preventive', 'Visite periodiche', 'Giudizi di idoneità', 'Protocolli sanitari'],
    },
    {
        title: 'Documento di Valutazione dei Rischi',
        description: 'Elaborazione e aggiornamento del DVR secondo la normativa vigente.',
        icon: FileText,
        href: '/servizi',
        features: ['Analisi rischi aziendali', 'Misure di prevenzione', 'Programma miglioramento'],
    },
    {
        title: 'Gestione Emergenze',
        description: 'Pianificazione procedure di emergenza, primo soccorso e antincendio.',
        icon: AlertTriangle,
        href: '/contatti',
        features: ['Piani di emergenza', 'Formazione primo soccorso', 'Addetti antincendio'],
    },
];

const medicaServices: ServiceItem[] = [
    {
        title: 'Visite Specialistiche',
        description: 'Ampia gamma di visite mediche specialistiche con professionisti di alto livello.',
        icon: Stethoscope,
        href: '/visite-specialistiche',
        features: ['Cardiologia', 'Ortopedia', 'Dermatologia', 'Oculistica', 'Otorinolaringoiatria'],
    },
    {
        title: 'Diagnostica Strumentale',
        description: 'Esami diagnostici con apparecchiature di ultima generazione per diagnosi accurate.',
        icon: Activity,
        href: '/diagnostica',
        features: ['Ecografie', 'Elettrocardiogramma', 'Spirometria', 'Audiometria'],
    },
    {
        title: 'Medicina del Lavoro',
        description: 'Sorveglianza sanitaria e visite mediche per i lavoratori della vostra azienda.',
        icon: Heart,
        href: '/medicina-del-lavoro',
        features: ['Visite preventive e periodiche', 'Protocolli sanitari', 'Giudizi di idoneità'],
    },
    {
        title: 'Prenotazioni Online',
        description: 'Prenota la tua visita comodamente online, scegliendo medico, data e orario.',
        icon: Users,
        href: '/prenota',
        features: ['Selezione medico', 'Disponibilità in tempo reale', 'Conferma immediata'],
    },
];

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

const GruppoServiziPage: React.FC = () => {
    const currentBrand = getCurrentBrand();
    const isSicurezza = currentBrand.id === 'element-sicurezza';
    const sicurezzaBrand = getBrandById('element-sicurezza');
    const medicaBrand = getBrandById('element-medica');

    return (
        <PublicLayout>
            <SEOHead
                title={`Tutti i Servizi del Gruppo Element | ${currentBrand.displayName}`}
                description="Scopri tutti i servizi del Gruppo Element: formazione sicurezza sul lavoro, medicina del lavoro, visite specialistiche, diagnostica strumentale a Selvazzano Dentro (Padova)."
                keywords={['gruppo Element', 'sicurezza sul lavoro', 'medicina del lavoro', 'formazione', 'visite specialistiche', 'poliambulatorio', 'Padova', 'Selvazzano Dentro']}
                canonicalUrl={`${currentBrand.contacts.website}/gruppo-servizi`}
                siteName={currentBrand.displayName}
                ogType="website"
                structuredData={generateParentOrganizationSchema()}
            />
            {/* Hero Section */}
            <section
                className="py-20 relative overflow-hidden"
                style={{
                    backgroundImage: 'linear-gradient(135deg, var(--color-secondary-800), var(--color-secondary-900))',
                }}
            >
                {/* Ambient orbs */}
                <div className="absolute top-10 left-10 w-72 h-72 bg-primary-500/10 rounded-full blur-3xl animate-float" />
                <div className="absolute bottom-10 right-10 w-56 h-56 bg-accent-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <ScrollReveal>
                        <div className="text-center">
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm text-white/90 text-sm font-medium mb-6">
                                <Building2 className="w-4 h-4" />
                                <span>Il Gruppo Element</span>
                            </div>
                            <h1 className="text-4xl font-bold text-white sm:text-5xl md:text-6xl font-heading">
                                Tutti i Nostri Servizi
                            </h1>
                            <p className="mt-6 max-w-3xl mx-auto text-xl text-white/80">
                                Due brand, un'unica missione: la salute e la sicurezza dei lavoratori.
                                Scopri l'offerta completa del gruppo Element.
                            </p>
                        </div>
                    </ScrollReveal>
                </div>
            </section>

            {/* Brands Side-by-Side */}
            <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <ScrollReveal>
                        <div className="text-center mb-12">
                            <h2 className="text-3xl font-bold text-gray-900 mb-4">Due Brand, Una Squadra</h2>
                            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                                Ogni area del gruppo Element è specializzata per offrirti il massimo in sicurezza e salute.
                            </p>
                        </div>
                    </ScrollReveal>

                    <div className="grid md:grid-cols-2 gap-8 items-stretch">
                        {/* ElementSicurezza — LEFT */}
                        <ScrollReveal className="h-full">
                            <div className="rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow h-full flex flex-col" style={{ border: '1px solid rgba(233,186,73,0.35)' }}>
                                {/* Brand header */}
                                <div className="p-8 relative overflow-hidden" style={{ background: '#283646' }}>
                                    <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-2xl" style={{ background: 'rgba(233,186,73,0.20)' }} />
                                    <img src={sicurezzaBrand.logoWhite} alt={sicurezzaBrand.logoAlt} className="h-10 mb-4 object-contain" />
                                    <h2 className="text-2xl font-bold text-white">{sicurezzaBrand.displayName}</h2>
                                    <p className="text-sm mt-1 font-medium" style={{ color: '#E9BA49' }}>{sicurezzaBrand.tagline}</p>
                                </div>
                                {/* Services */}
                                <div className="bg-white p-5 space-y-2 flex-1">
                                    {sicurezzaServices.map((service, i) => (
                                        <a
                                            key={i}
                                            href={isSicurezza ? service.href : `${sicurezzaBrand.contacts.website}${service.href}`}
                                            target={isSicurezza ? undefined : '_blank'}
                                            rel={isSicurezza ? undefined : 'noopener noreferrer'}
                                            className="flex items-start gap-3 p-3 rounded-xl hover:bg-amber-50 transition-colors group/item"
                                            onClick={() => trackCtaEvent({ resource: 'public', action: isSicurezza ? 'cta_click' : 'cross_brand_click', details: { label: service.title, href: service.href, from: currentBrand.id, to: 'element-sicurezza' } })}
                                        >
                                            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors" style={{ background: 'rgba(233,186,73,0.2)' }}>
                                                <service.icon className="w-4 h-4" style={{ color: '#283646' }} />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="font-semibold text-gray-900 text-sm transition-colors flex items-center gap-1" style={{}} onMouseEnter={e => (e.currentTarget.style.color = '#c49910')} onMouseLeave={e => (e.currentTarget.style.color = '')}>
                                                    {service.title}
                                                    {!isSicurezza && <ExternalLink className="w-3 h-3 opacity-40 flex-shrink-0" />}
                                                </div>
                                                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed line-clamp-2">{service.description}</p>
                                            </div>
                                        </a>
                                    ))}
                                </div>
                                {/* CTA */}
                                <div className="bg-white px-5 pb-5">
                                    <a
                                        href={isSicurezza ? '/contatti' : sicurezzaBrand.contacts.website}
                                        target={isSicurezza ? undefined : '_blank'}
                                        rel={isSicurezza ? undefined : 'noopener noreferrer'}
                                        className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-sm transition-all hover:opacity-90 active:scale-95"
                                        style={{ background: '#E9BA49', color: '#283646' }}
                                        onClick={() => trackCtaEvent({ resource: 'public', action: isSicurezza ? 'cta_click' : 'cross_brand_visit', details: { label: 'CTA sicurezza', from: currentBrand.id, to: 'element-sicurezza' } })}
                                    >
                                        {isSicurezza ? 'Richiedi Preventivo Gratuito' : 'Visita Element Sicurezza'}
                                        {!isSicurezza ? <ExternalLink className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                                    </a>
                                </div>
                            </div>
                        </ScrollReveal>

                        {/* ElementMedica — RIGHT */}
                        <ScrollReveal delay={150} className="h-full">
                            <div className="rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow h-full flex flex-col" style={{ border: '1px solid rgba(160,200,193,0.5)' }}>
                                {/* Brand header */}
                                <div className="p-8 relative overflow-hidden" style={{ background: '#283646' }}>
                                    <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-2xl" style={{ background: 'rgba(160,200,193,0.15)' }} />
                                    <img src={medicaBrand.logoWhite} alt={medicaBrand.logoAlt} className="h-10 mb-4 object-contain" />
                                    <h2 className="text-2xl font-bold text-white">{medicaBrand.displayName}</h2>
                                    <p className="text-sm mt-1" style={{ color: '#A0C8C1' }}>{medicaBrand.tagline}</p>
                                </div>
                                {/* Services */}
                                <div className="bg-white p-5 space-y-2 flex-1">
                                    {medicaServices.map((service, i) => (
                                        <a
                                            key={i}
                                            href={!isSicurezza ? service.href : `${medicaBrand.contacts.website}${service.href}`}
                                            target={!isSicurezza ? undefined : '_blank'}
                                            rel={!isSicurezza ? undefined : 'noopener noreferrer'}
                                            className="flex items-start gap-3 p-3 rounded-xl hover:bg-teal-50 transition-colors group/item"
                                            onClick={() => trackCtaEvent({ resource: 'public', action: !isSicurezza ? 'cta_click' : 'cross_brand_click', details: { label: service.title, href: service.href, from: currentBrand.id, to: 'element-medica' } })}
                                        >
                                            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors" style={{ background: 'rgba(160,200,193,0.3)' }}>
                                                <service.icon className="w-4 h-4" style={{ color: '#283646' }} />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="font-semibold text-gray-900 text-sm group-hover/item:text-teal-700 transition-colors flex items-center gap-1">
                                                    {service.title}
                                                    {isSicurezza && <ExternalLink className="w-3 h-3 opacity-40 flex-shrink-0" />}
                                                </div>
                                                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed line-clamp-2">{service.description}</p>
                                            </div>
                                        </a>
                                    ))}
                                </div>
                                {/* CTA */}
                                <div className="bg-white px-5 pb-5">
                                    <a
                                        href={!isSicurezza ? '/prenota' : medicaBrand.contacts.website}
                                        target={!isSicurezza ? undefined : '_blank'}
                                        rel={!isSicurezza ? undefined : 'noopener noreferrer'}
                                        className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-sm transition-all hover:opacity-90 active:scale-95"
                                        style={{ background: '#A0C8C1', color: '#283646' }}
                                        onClick={() => trackCtaEvent({ resource: 'public', action: !isSicurezza ? 'cta_click' : 'cross_brand_visit', details: { label: 'CTA medica', from: currentBrand.id, to: 'element-medica' } })}
                                    >
                                        {!isSicurezza ? 'Prenota Online' : 'Visita Element Medica'}
                                        {isSicurezza ? <ExternalLink className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                                    </a>
                                </div>
                            </div>
                        </ScrollReveal>
                    </div>
                </div>
            </section>

            {/* Shared Value Proposition */}
            <section className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <ScrollReveal>
                        <div className="text-center mb-12">
                            <span className="badge-premium mb-4 inline-flex">Perché Sceglierci</span>
                            <h2 className="text-3xl font-bold text-gray-900 mb-4">
                                Un Gruppo, Due Eccellenze
                            </h2>
                            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                                Element Sicurezza ed Element Medica condividono la stessa missione:
                                proteggere la salute e la sicurezza dei lavoratori.
                            </p>
                        </div>
                    </ScrollReveal>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <ScrollReveal delay={0}>
                            <div className="text-center p-6">
                                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(233,186,73,0.2)' }}>
                                    <Building2 className="w-7 h-7" style={{ color: '#283646' }} />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">Sede Unica</h3>
                                <p className="text-gray-600 text-sm">
                                    Tutti i servizi in un'unica sede a Selvazzano Dentro (PD), per la massima comodità.
                                </p>
                            </div>
                        </ScrollReveal>
                        <ScrollReveal delay={100}>
                            <div className="text-center p-6">
                                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'linear-gradient(135deg, rgba(233,186,73,0.25) 0%, rgba(160,200,193,0.35) 100%)' }}>
                                    <Users className="w-7 h-7" style={{ color: '#283646' }} />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">Team Integrato</h3>
                                <p className="text-gray-600 text-sm">
                                    Medici, formatori e consulenti che lavorano in sinergia per offrire soluzioni complete.
                                </p>
                            </div>
                        </ScrollReveal>
                        <ScrollReveal delay={200}>
                            <div className="text-center p-6">
                                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(160,200,193,0.3)' }}>
                                    <Shield className="w-7 h-7" style={{ color: '#283646' }} />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">Conformità Totale</h3>
                                <p className="text-gray-600 text-sm">
                                    Dalla formazione alle visite mediche, un unico interlocutore per tutti gli adempimenti.
                                </p>
                            </div>
                        </ScrollReveal>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section
                className="py-20 relative overflow-hidden"
                style={{ backgroundImage: 'linear-gradient(135deg, #283646 0%, #1d2f3f 100%)' }}
            >
                <div className="absolute top-10 left-10 w-64 h-64 bg-white/5 rounded-full blur-3xl animate-float" />
                <div className="absolute bottom-10 right-10 w-48 h-48 bg-white/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
                <ScrollReveal>
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
                        <h2 className="text-3xl font-bold text-white mb-4">
                            Hai bisogno di informazioni?
                        </h2>
                        <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
                            Contattaci per scoprire come i servizi del gruppo Element possono supportare la tua azienda.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <PublicButton
                                variant="secondary"
                                size="lg"
                                to="/contatti"
                                onClick={() => trackCtaEvent({ resource: 'public', action: 'cta_click', details: { label: 'Contattaci', href: '/contatti', section: 'GruppoServizi-cta' } })}
                            >
                                Contattaci
                            </PublicButton>
                            {isSicurezza ? (
                                <PublicButton
                                    variant="outline"
                                    size="lg"
                                    className="border-white text-white hover:bg-white hover:text-primary-800"
                                    to="/corsi"
                                >
                                    Scopri i Corsi
                                </PublicButton>
                            ) : (
                                <PublicButton
                                    variant="outline"
                                    size="lg"
                                    className="border-white text-white hover:bg-white hover:text-primary-800"
                                    to="/prenota"
                                >
                                    Prenota Online
                                </PublicButton>
                            )}
                        </div>
                    </div>
                </ScrollReveal>
            </section>
        </PublicLayout>
    );
};

export default GruppoServiziPage;
