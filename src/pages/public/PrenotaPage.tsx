/**
 * PrenotaPage — Pagina di prenotazione online per Element Medica
 * 
 * Pagina dedicata con:
 * - Hero section
 * - Opzioni di prenotazione (cards)
 * - BookingCalendarIsland interattivo (selezione servizio → medico → data → conferma)
 * - Alternative di contatto
 */

import React, { lazy, Suspense, useEffect } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { PublicLayout } from '../../components/public/PublicLayout';
import { HeroSection } from '../../components/public/HeroSection';
import { ScrollReveal } from '../../components/public/ScrollReveal';
import { LoadingFallback } from '../../components/ui/LoadingFallback';
import { getCurrentBrand } from '@/config/brands.config';
import SEOHead from '../../components/seo/SEOHead';
import { generateMedicalClinicSchema } from '../../components/seo/MedicalSchemas';
import {
    Stethoscope,
    Building2,
    Activity,
    CalendarCheck,
    Phone,
    Clock,
    ShieldCheck,
    CheckCircle
} from 'lucide-react';

const BookingCalendarIsland = lazy(() => import('../../components/public/BookingCalendarIsland'));

const PrenotaPage: React.FC = () => {
    const brand = getCurrentBrand();
    const [searchParams] = useSearchParams();
    const location = useLocation();
    const initialBranca = searchParams.get('branca') || undefined;

    // Scroll to #booking after lazy content mounts
    useEffect(() => {
        if (location.hash === '#booking') {
            const timer = setTimeout(() => {
                document.getElementById('booking')?.scrollIntoView({ behavior: 'smooth' });
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [location.hash]);

    const bookingOptions = [
        {
            icon: Building2,
            title: 'Medicina del Lavoro',
            description: 'Visite mediche per aziende, sorveglianza sanitaria e protocolli conformi al D.Lgs 81/08.',
            href: '/medicina-del-lavoro',
            badge: 'Per Aziende',
        },
        {
            icon: Stethoscope,
            title: 'Visite Specialistiche',
            description: 'Cardiologia, ortopedia, dermatologia e altre specialità con medici qualificati.',
            href: '#booking',
            badge: 'Per Privati',
        },
        {
            icon: Activity,
            title: 'Diagnostica Strumentale',
            description: 'ECG, ecografia, spirometria, audiometria e altri esami diagnostici.',
            href: '#booking',
            badge: 'Esami',
        },
    ];

    const guarantees = [
        { icon: CalendarCheck, text: 'Conferma immediata via email' },
        { icon: Clock, text: 'Tempi di attesa ridotti' },
        { icon: ShieldCheck, text: 'Dati protetti e sicuri' },
        { icon: CheckCircle, text: 'Cancellazione gratuita 24h prima' },
    ];

    return (
        <PublicLayout>
            <SEOHead
                title="Prenota Online | Element Medica - Poliambulatorio Selvazzano Dentro (PD)"
                description="Prenota online visite specialistiche, diagnostica strumentale e medicina del lavoro al Poliambulatorio Element Medica di Selvazzano Dentro (Padova). Conferma immediata via email."
                keywords={['prenotazione online', 'visita specialistica', 'poliambulatorio Padova', 'medicina del lavoro', 'diagnostica strumentale', 'ecografia', 'cardiologia', 'ortopedia', 'Selvazzano Dentro']}
                canonicalUrl={`${brand.contacts.website}/prenota`}
                ogType="website"
                ogImage={`${brand.contacts.website}/assets/images/og-prenota.jpg`}
                structuredData={generateMedicalClinicSchema({
                    services: [
                        { name: 'Medicina del Lavoro', description: 'Sorveglianza sanitaria e visite mediche per aziende' },
                        { name: 'Visite Specialistiche', description: 'Cardiologia, ortopedia, dermatologia e altre specialità' },
                        { name: 'Diagnostica Strumentale', description: 'ECG, ecografia, spirometria, audiometria' },
                    ]
                })}
            />
            {/* Hero */}
            <HeroSection
                title="Prenota Online"
                subtitle="Semplice, veloce, sicuro"
                description="Scegli il servizio, il medico e l'orario che preferisci. Conferma immediata via email."
                primaryButton={{ text: 'Prenota Ora', href: '#booking' }}
                secondaryButton={{ text: 'Chiama', href: `tel:${brand.contacts.phone.replace(/\s/g, '')}` }}
                backgroundVariant="medical-teal"
                stats={[
                    { value: '24h', label: 'Conferma' },
                    { value: '100+', label: 'Servizi' },
                    { value: '4.9★', label: 'Recensioni' },
                ]}
            />

            {/* Booking Options Cards */}
            <section className="py-24 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <ScrollReveal>
                        <div className="text-center mb-12">
                            <span className="badge-premium mb-4 inline-flex">I Nostri Servizi</span>
                            <h2 className="text-3xl font-bold text-gray-900 mb-4">
                                Cosa Vuoi Prenotare?
                            </h2>
                            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                                Seleziona la categoria di servizio oppure usa il calendario qui sotto per prenotare direttamente
                            </p>
                        </div>
                    </ScrollReveal>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {bookingOptions.map((option, index) => (
                            <ScrollReveal key={index} delay={index * 100}>
                                <a
                                    href={option.href}
                                    onClick={option.href === '#booking' ? (e) => {
                                        e.preventDefault();
                                        document.getElementById('booking')?.scrollIntoView({ behavior: 'smooth' });
                                    } : undefined}
                                    className="card-premium p-8 block group hover:scale-[1.02] transition-transform duration-300"
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="icon-container-gradient">
                                            <option.icon className="w-7 h-7 text-white" />
                                        </div>
                                        <span className="text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full"
                                            style={{ backgroundColor: 'var(--color-primary-100)', color: 'var(--color-primary-800)' }}
                                        >
                                            {option.badge}
                                        </span>
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-primary-700 transition-colors">
                                        {option.title}
                                    </h3>
                                    <p className="text-gray-600">
                                        {option.description}
                                    </p>
                                </a>
                            </ScrollReveal>
                        ))}
                    </div>
                </div>
            </section>

            {/* Booking Calendar Widget */}
            <section id="booking" className="py-24 bg-gray-50 scroll-mt-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <ScrollReveal>
                        <div className="text-center mb-12">
                            <span className="badge-premium mb-4 inline-flex">Prenota Subito</span>
                            <h2 className="text-3xl font-bold text-gray-900 mb-4">
                                Calendario Prenotazioni
                            </h2>
                            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                                Seleziona servizio, medico e orario disponibile. Riceverai conferma immediata via email.
                            </p>
                        </div>
                    </ScrollReveal>

                    <ScrollReveal>
                        <Suspense fallback={<LoadingFallback message="Caricamento calendario..." />}>
                            <BookingCalendarIsland initialBranca={initialBranca} />
                        </Suspense>
                    </ScrollReveal>
                </div>
            </section>

            {/* Guarantees */}
            <section className="py-16 bg-white">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {guarantees.map((item, index) => (
                            <ScrollReveal key={index} delay={index * 80}>
                                <div className="text-center">
                                    <div className="icon-container-soft mx-auto mb-3 !w-12 !h-12">
                                        <item.icon className="w-5 h-5" />
                                    </div>
                                    <p className="text-sm font-medium text-gray-700">{item.text}</p>
                                </div>
                            </ScrollReveal>
                        ))}
                    </div>
                </div>
            </section>

            {/* Contact Alternative */}
            <section className="py-20 relative overflow-hidden" style={{ backgroundImage: 'linear-gradient(135deg, var(--color-primary-800), var(--color-primary-700))' }}>
                <div className="absolute top-10 left-10 w-64 h-64 bg-white/5 rounded-full blur-3xl animate-float" />
                <div className="absolute bottom-10 right-10 w-48 h-48 bg-white/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
                <ScrollReveal>
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
                        <Phone className="w-12 h-12 text-white/80 mx-auto mb-6" />
                        <h2 className="text-3xl font-bold text-white mb-4">
                            Preferisci Prenotare per Telefono?
                        </h2>
                        <p className="text-xl text-white/90 mb-8">
                            Il nostro staff è a disposizione per aiutarti con la prenotazione
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                            <a
                                href={`tel:${brand.contacts.phone.replace(/\s/g, '')}`}
                                className="inline-flex items-center gap-3 px-8 py-4 bg-white text-primary-800 font-bold rounded-xl hover:bg-white/90 transition-colors text-lg shadow-lg"
                            >
                                <Phone className="w-5 h-5" />
                                {brand.contacts.phone}
                            </a>
                            <div className="flex items-center gap-2 text-white/80">
                                <Clock className="w-4 h-4" />
                                <span>Lun-Ven 08:00-20:00 | Sab 08:00-13:00</span>
                            </div>
                        </div>
                    </div>
                </ScrollReveal>
            </section>
        </PublicLayout>
    );
};

export default PrenotaPage;
