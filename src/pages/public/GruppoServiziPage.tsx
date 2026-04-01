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
    icon: React.FC<{ className?: string }>;
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

    // Determine which brand is "ours" and which is the "other"
    const otherBrand = getBrandById(isSicurezza ? 'element-medica' : 'element-sicurezza');
    const otherDomain = otherBrand.contacts.website;

    const currentServices = isSicurezza ? sicurezzaServices : medicaServices;
    const otherServices = isSicurezza ? medicaServices : sicurezzaServices;

    const currentBrandColor = isSicurezza ? 'amber' : 'teal';
    const otherBrandColor = isSicurezza ? 'teal' : 'amber';

    return (
        <PublicLayout>
            <SEOHead
                title={`Tutti i Servizi del Gruppo Element | ${currentBrand.displayName}`}
                description="Scopri tutti i servizi del Gruppo Element: formazione sicurezza sul lavoro, medicina del lavoro, visite specialistiche, diagnostica strumentale a Selvazzano Dentro (Padova)."
                keywords={['gruppo Element', 'sicurezza sul lavoro', 'medicina del lavoro', 'formazione', 'visite specialistiche', 'poliambulatorio', 'Padova', 'Selvazzano Dentro']}
                canonicalUrl={`${currentBrand.contacts.website}/gruppo-servizi`}
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

            {/* Current Brand Services */}
            <section className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <ScrollReveal>
                        <div className="text-center mb-12">
                            <span className="badge-premium mb-4 inline-flex">{currentBrand.displayName}</span>
                            <h2 className="text-3xl font-bold text-gray-900 mb-4">
                                {isSicurezza ? 'Formazione e Sicurezza sul Lavoro' : 'Poliambulatorio e Medicina del Lavoro'}
                            </h2>
                            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                                {currentBrand.description}
                            </p>
                        </div>
                    </ScrollReveal>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {currentServices.map((service, index) => (
                            <ScrollReveal key={service.title} delay={index * 100}>
                                <div className="card-premium p-6 h-full flex flex-col">
                                    <div className="icon-container-gradient mb-4">
                                        <service.icon className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{service.title}</h3>
                                    <p className="text-gray-600 text-sm mb-4 flex-grow">{service.description}</p>
                                    <ul className="space-y-1 mb-4">
                                        {service.features.slice(0, 3).map((f) => (
                                            <li key={f} className="text-sm text-gray-500 flex items-center gap-2">
                                                <ArrowRight className="w-3 h-3 text-primary-500 flex-shrink-0" />
                                                {f}
                                            </li>
                                        ))}
                                    </ul>
                                    <PublicButton
                                        variant="outline"
                                        size="sm"
                                        to={service.href}
                                        onClick={() => trackCtaEvent({ resource: 'public', action: 'cta_click', details: { label: service.title, href: service.href, section: 'GruppoServizi-current' } })}
                                    >
                                        Scopri di più
                                    </PublicButton>
                                </div>
                            </ScrollReveal>
                        ))}
                    </div>
                </div>
            </section>

            {/* Divider */}
            <div className="divider-gradient" />

            {/* Other Brand Services */}
            <section className="py-20" style={{ backgroundImage: 'linear-gradient(to bottom, var(--color-accent-50), #ffffff)' }}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <ScrollReveal>
                        <div className="text-center mb-12">
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent-100 text-accent-700 text-sm font-medium mb-4">
                                <ExternalLink className="w-4 h-4" />
                                <span>{otherBrand.displayName}</span>
                            </div>
                            <h2 className="text-3xl font-bold text-gray-900 mb-4">
                                {isSicurezza ? 'Poliambulatorio e Visite Specialistiche' : 'Formazione e Sicurezza sul Lavoro'}
                            </h2>
                            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                                {otherBrand.description}
                            </p>
                        </div>
                    </ScrollReveal>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {otherServices.map((service, index) => (
                            <ScrollReveal key={service.title} delay={index * 100}>
                                <a
                                    href={`${otherDomain}${service.href}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block card-premium p-6 h-full group hover:shadow-xl transition-shadow"
                                    onClick={() => trackCtaEvent({ resource: 'public', action: 'cross_brand_click', details: { label: service.title, href: `${otherDomain}${service.href}`, from: currentBrand.id, to: otherBrand.id } })}
                                >
                                    <div className="flex items-start gap-4">
                                        <div className="icon-container-soft flex-shrink-0">
                                            <service.icon className="w-5 h-5" />
                                        </div>
                                        <div className="flex-grow">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                                                    {service.title}
                                                </h3>
                                                <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-primary-500 transition-colors" />
                                            </div>
                                            <p className="text-gray-600 text-sm mb-3">{service.description}</p>
                                            <div className="flex flex-wrap gap-2">
                                                {service.features.slice(0, 3).map((f) => (
                                                    <span
                                                        key={f}
                                                        className="inline-block px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full"
                                                    >
                                                        {f}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </a>
                            </ScrollReveal>
                        ))}
                    </div>

                    <ScrollReveal delay={200}>
                        <div className="text-center mt-10">
                            <a
                                href={otherDomain}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-accent-100 text-accent-700 hover:bg-accent-200 transition-colors font-medium"
                                onClick={() => trackCtaEvent({ resource: 'public', action: 'cross_brand_visit', details: { from: currentBrand.id, to: otherBrand.id } })}
                            >
                                Visita {otherBrand.displayName}
                                <ExternalLink className="w-4 h-4" />
                            </a>
                        </div>
                    </ScrollReveal>
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
                                <div className="icon-container-gradient mx-auto mb-4">
                                    <Building2 className="w-7 h-7" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">Sede Unica</h3>
                                <p className="text-gray-600 text-sm">
                                    Tutti i servizi in un'unica sede a Selvazzano Dentro (PD), per la massima comodità.
                                </p>
                            </div>
                        </ScrollReveal>
                        <ScrollReveal delay={100}>
                            <div className="text-center p-6">
                                <div className="icon-container-gradient mx-auto mb-4">
                                    <Users className="w-7 h-7" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">Team Integrato</h3>
                                <p className="text-gray-600 text-sm">
                                    Medici, formatori e consulenti che lavorano in sinergia per offrire soluzioni complete.
                                </p>
                            </div>
                        </ScrollReveal>
                        <ScrollReveal delay={200}>
                            <div className="text-center p-6">
                                <div className="icon-container-gradient mx-auto mb-4">
                                    <Shield className="w-7 h-7" />
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
                style={{ backgroundImage: 'linear-gradient(135deg, var(--color-primary-800), var(--color-primary-700))' }}
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
