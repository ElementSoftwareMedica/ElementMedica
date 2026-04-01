/**
 * Import CMS Pages from Production to Local
 * 
 * Maps production tenants → local tenants:
 *   - Element Sicurezza (prod: 3d47d739) → Element Sicurezza (local: 939a5fd8)
 *   - Element Medica    (prod: 402f94bd) → Element srl       (local: 6a8e68d7)
 * 
 * Run: node scripts/import-cms-from-production.js
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ── Tenant mapping (prod → local) ───────────────────────────────────────────
const TENANT_MAP = {
    '3d47d739-0a8d-4105-be52-b156e895ef7d': '939a5fd8-1b2e-4357-9900-24fa5921a63e', // Sicurezza
    '402f94bd-f26e-4bcd-9c77-48a9863d527f': '6a8e68d7-1958-44d8-af50-2121f638db5c', // Medica → srl
};

// ── Production CMS pages snapshot ──────────────────────────────────────────
// Last updated: 2026-02-24
const PRODUCTION_PAGES = [
    // ─── ELEMENT SICUREZZA (11 pages) ─────────────────────────────────────
    {
        slug: 'carriere',
        title: 'Lavora con Noi - Element Sicurezza',
        seoTitle: 'Lavora con Noi - Element Sicurezza | Unisciti al Team',
        seoDescription: 'Unisciti al team di Element Sicurezza. Opportunità di lavoro per consulenti sicurezza, formatori, RSPP. Invia la tua candidatura.',
        isPublished: true,
        status: 'published',
        layout: 'full-width',
        tenantId: '3d47d739-0a8d-4105-be52-b156e895ef7d',
        publishedAt: new Date('2026-02-17T18:21:57.000Z'),
        content: {
            hero: {
                title: 'Lavora con Noi',
                subtitle: 'Unisciti al Team Element Sicurezza',
                description: 'Cerchiamo professionisti appassionati alla sicurezza sul lavoro. Se hai esperienza nel settore e vuoi fare la differenza, scopri le nostre opportunità.',
                primaryButton: { href: '#candidatura', text: 'Candidati Ora' },
                secondaryButton: { href: '/contatti', text: 'Contattaci' },
            },
            positions: {
                title: 'Posizioni Aperte',
                items: [
                    { title: 'Consulente RSPP', type: 'Full-time', location: 'Padova', description: 'Esperienza minima 3 anni nel ruolo RSPP, conoscenza D.Lgs 81/08.' },
                    { title: 'Formatore Sicurezza', type: 'Part-time/Full-time', location: 'Veneto', description: 'Docente accreditato per corsi sicurezza obbligatori.' },
                    { title: 'Medico Competente', type: 'Part-time', location: 'Padova e provincia', description: 'Specializzazione medicina del lavoro, esperienza sorveglianza sanitaria.' },
                ],
            },
            values: {
                title: 'I Nostri Valori',
                items: [
                    { icon: 'Shield', title: 'Sicurezza Prima di Tutto', description: 'Pratichiamo ciò che insegnamo.' },
                    { icon: 'GraduationCap', title: 'Formazione Continua', description: 'Investiamo nella crescita professionale.' },
                    { icon: 'Users', title: 'Team Collaborativo', description: 'Lavoriamo insieme per risultati eccellenti.' },
                ],
            },
            metadata: { theme: 'formazione', layout: 'full-width' },
        },
        blocks: [],
    },
    {
        slug: 'chi-siamo',
        title: 'Chi Siamo - Element Sicurezza',
        seoTitle: 'Chi Siamo - Element Sicurezza | 15 Anni di Esperienza',
        seoDescription: 'Element Sicurezza: oltre 15 anni di esperienza nella sicurezza sul lavoro. Team di esperti RSPP, formatori e medici competenti a Padova.',
        isPublished: true,
        status: 'published',
        layout: 'full-width',
        tenantId: '3d47d739-0a8d-4105-be52-b156e895ef7d',
        publishedAt: new Date('2026-02-17T18:21:57.000Z'),
        content: {
            hero: {
                stats: [
                    { icon: '🏢', label: 'Aziende Clienti', number: '300+' },
                    { icon: '🎓', label: 'Lavoratori Formati/Anno', number: '5.000+' },
                    { icon: '⭐', label: 'Anni Esperienza', number: '15+' },
                    { icon: '✓', label: 'Accreditamento', number: '100%' },
                ],
                title: 'Chi Siamo',
                subtitle: 'Element Sicurezza',
                description: 'Da oltre 15 anni siamo il partner di fiducia per la sicurezza sul lavoro di centinaia di aziende in tutto il Veneto e nord Italia.',
                primaryButton: { href: '/servizi', text: 'I Nostri Servizi' },
                secondaryButton: { href: '/contatti', text: 'Contattaci' },
                backgroundVariant: 'gradient',
            },
            mission: {
                title: 'La Nostra Missione',
                description: 'Rendere ogni azienda sicura, conforme e produttiva attraverso servizi di eccellenza.',
                values: [
                    { icon: 'Shield', title: 'Sicurezza', description: 'Prevenzione e protezione come priorità assoluta' },
                    { icon: 'Award', title: 'Competenza', description: 'Team qualificato con formazione continua' },
                    { icon: 'Heart', title: 'Integrità', description: 'Trasparenza e onestà in ogni relazione' },
                    { icon: 'Zap', title: 'Efficienza', description: 'Soluzioni concrete e tempestive' },
                ],
            },
            team: {
                title: 'Il Nostro Team',
                members: [
                    { name: 'Ing. Marco Bianchi', role: 'Fondatore e CEO', expertise: 'RSPP, Strategia' },
                    { name: 'Dott.ssa Sara Rossi', role: 'Responsabile Medico', expertise: 'Medicina del Lavoro' },
                    { name: 'Geom. Paolo Ferrari', role: 'Responsabile Tecnico', expertise: 'DVR, Cantieri' },
                ],
            },
            certifications: {
                title: 'Certificazioni e Accreditamenti',
                items: [
                    { icon: 'Award', name: 'Ente Accreditato Regione Veneto', color: 'blue' },
                    { icon: 'Shield', name: 'Tutti i Macrosettori ATECO', color: 'green' },
                    { icon: 'FileCheck', name: 'ISO 9001:2015', color: 'purple' },
                ],
            },
            metadata: { theme: 'formazione', layout: 'full-width' },
        },
        blocks: [],
    },
    {
        slug: 'contatti',
        title: 'Contattaci - Element Sicurezza',
        seoTitle: 'Contatti Element Sicurezza | Padova - Consulenza Sicurezza Gratuita',
        seoDescription: 'Contatta Element Sicurezza a Padova. Consulenza gratuita per sicurezza sul lavoro, RSPP, formazione D.Lgs 81/08. +39 351 623 9176.',
        isPublished: true,
        status: 'published',
        layout: 'full-width',
        tenantId: '3d47d739-0a8d-4105-be52-b156e895ef7d',
        publishedAt: new Date('2026-02-17T18:21:57.000Z'),
        content: {
            hero: {
                title: 'Contattaci',
                subtitle: 'Siamo a Tua Disposizione',
                description: 'Hai bisogno di consulenza? Vuoi un preventivo gratuito? Il nostro team è pronto ad ascoltarti.',
                backgroundVariant: 'gradient',
            },
            contactInfo: {
                items: [
                    { icon: 'Phone', title: 'Telefono', primary: '+39 351 623 9176', secondary: 'Lun-Ven 8:30-18:00', action: { href: 'tel:+393516239176', type: 'tel' } },
                    { icon: 'Mail', title: 'Email', primary: 'info@elementsicurezza.com', secondary: 'Rispondiamo entro 24h', action: { href: 'mailto:info@elementsicurezza.com', type: 'mailto' } },
                    { icon: 'MapPin', title: 'Indirizzo', primary: 'Via Piave 4, 35138 Padova (PD)', secondary: 'Parcheggio disponibile' },
                ],
                title: 'Come Contattarci',
            },
            openingHours: {
                title: 'Orari',
                schedule: [
                    { days: 'Lunedì - Venerdì', hours: '8:30 - 18:00' },
                    { days: 'Sabato', hours: 'Su appuntamento' },
                ],
            },
            metadata: { theme: 'formazione', layout: 'full-width' },
        },
        blocks: [],
    },
    {
        slug: 'cookie-policy',
        title: 'Cookie Policy - Element Sicurezza',
        seoTitle: 'Cookie Policy - Element Sicurezza',
        seoDescription: 'Informativa sull\'uso dei cookie sul sito Element Sicurezza. Gestisci le tue preferenze.',
        isPublished: true,
        status: 'published',
        layout: 'full-width',
        tenantId: '3d47d739-0a8d-4105-be52-b156e895ef7d',
        publishedAt: new Date('2026-02-17T18:21:57.000Z'),
        content: {
            hero: { icon: 'Cookie', title: 'Cookie Policy', description: 'Informativa sull\'uso dei cookie sul nostro sito web' },
            lastUpdate: '2025-11-29T06:22:15.698Z',
            introduction: { title: 'Cosa Sono i Cookie', content: 'I cookie sono piccoli file di testo salvati sul tuo dispositivo durante la navigazione. Utilizziamo cookie tecnici necessari al funzionamento e, con il tuo consenso, cookie analitici e di profilazione.' },
            cookieTypes: [
                { type: 'Tecnici', description: 'Necessari per il funzionamento del sito', required: true },
                { type: 'Analitici', description: 'Ci aiutano a migliorare il sito analizzando il traffico', required: false },
                { type: 'Marketing', description: 'Per mostrare annunci personalizzati', required: false },
            ],
            contact: { email: 'privacy@elementsicurezza.com', title: 'Contatti Privacy' },
            metadata: { theme: 'formazione', layout: 'full-width' },
        },
        blocks: [],
    },
    {
        slug: 'corsi',
        title: 'Catalogo Corsi Sicurezza sul Lavoro',
        seoTitle: 'Corsi Sicurezza sul Lavoro | D.Lgs 81/08 | Padova - Element Sicurezza',
        seoDescription: 'Catalogo completo corsi sicurezza sul lavoro: lavoratori, RSPP, antincendio, primo soccorso, carrellisti. Accreditati Regione Veneto. Padova e online.',
        isPublished: true,
        status: 'published',
        layout: 'full-width',
        tenantId: '3d47d739-0a8d-4105-be52-b156e895ef7d',
        publishedAt: new Date('2026-02-17T18:21:57.000Z'),
        content: {
            hero: {
                stats: [
                    { icon: 'GraduationCap', label: 'Corsi Disponibili', number: '50+' },
                    { icon: 'Users', label: 'Lavoratori Formati/Anno', number: '5.000+' },
                    { icon: 'Award', label: 'Accreditamento', number: '100%' },
                    { icon: 'Clock', label: 'Ore di Formazione', number: '10.000+' },
                ],
                title: 'Catalogo Corsi',
                subtitle: 'Sicurezza sul Lavoro',
                description: 'Formazione certificata per tutte le figure aziendali. Corsi in aula, online e in modalità blended. Attestati riconosciuti a livello nazionale.',
                primaryButton: { href: '/contatti', text: 'Iscriviti Ora' },
                secondaryButton: { href: '#catalogo', text: 'Vedi Catalogo' },
                backgroundVariant: 'gradient',
            },
            courses: {
                title: 'I Nostri Corsi',
                categories: [
                    {
                        title: 'Formazione Obbligatoria',
                        items: [
                            { title: 'Corso Lavoratori', duration: '8/12/16 ore', price: 'da €50/pers', mandatory: true, description: 'Formazione generale + specifica per rischio basso/medio/alto' },
                            { title: 'Corso Preposti', duration: '8 ore', price: 'da €120', mandatory: true, description: 'Per figure con compiti di sorveglianza' },
                            { title: 'Corso Dirigenti', duration: '16 ore', price: '€200', mandatory: true, description: 'Obblighi dirigenziali e responsabilità' },
                            { title: 'Corso RSPP Datore di Lavoro', duration: '16/32/48 ore', price: 'da €250', mandatory: true, description: 'Per datori di lavoro che svolgono il ruolo RSPP' },
                        ],
                    },
                    {
                        title: 'Sicurezza Specialistica',
                        items: [
                            { title: 'Antincendio', duration: '4/8/16 ore', price: 'da €80', description: 'Rischio basso, medio, alto (D.M. 02/09/21)' },
                            { title: 'Primo Soccorso', duration: '12/16 ore', price: 'da €150', description: 'Gruppo A e Gruppo B-C' },
                            { title: 'Carrellisti', duration: '12 ore', price: '€180', description: 'Operatore carrelli elevatori (patentino)' },
                            { title: 'Spazi Confinati', duration: '12 ore', price: '€200', description: 'D.P.R. 177/2011' },
                            { title: 'PES-PAV-PEI', duration: '14/16 ore', price: '€250', description: 'Rischio elettrico CEI 11-27' },
                        ],
                    },
                    {
                        title: 'Aggiornamenti',
                        items: [
                            { title: 'Aggiornamento Lavoratori', duration: '6 ore', price: 'da €30', description: 'Ogni 5 anni - obbligo normativo' },
                            { title: 'Aggiornamento RLS', duration: '4/8 ore', price: 'da €80', description: 'Annuale secondo D.Lgs 81/08' },
                            { title: 'Aggiornamento Antincendio', duration: '2/5/8 ore', price: 'da €50', description: 'Secondo nuovo DM 02/09/21' },
                        ],
                    },
                ],
            },
            metadata: { theme: 'formazione', layout: 'full-width', structuredData: { '@type': 'EducationalOrganization', name: 'Element Sicurezza', description: 'Ente di formazione accreditato per corsi sicurezza sul lavoro' } },
        },
        blocks: [],
    },
    {
        slug: 'homepage',
        title: 'Element Sicurezza - Sicurezza sul Lavoro',
        seoTitle: 'Element Sicurezza | RSPP, Formazione, Medicina del Lavoro | Padova',
        seoDescription: 'Element Sicurezza: servizi completi per la sicurezza sul lavoro. RSPP esterno, DVR, formazione certificata, medicina del lavoro. 300+ aziende in Veneto.',
        isPublished: true,
        status: 'published',
        layout: 'full-width',
        tenantId: '3d47d739-0a8d-4105-be52-b156e895ef7d',
        publishedAt: new Date('2026-02-17T18:21:57.000Z'),
        content: {
            hero: {
                stats: [
                    { icon: '🏢', label: 'Aziende Clienti', number: '300+' },
                    { icon: '🎓', label: 'Lavoratori Formati/Anno', number: '5.000+' },
                    { icon: '⭐', label: 'Anni Esperienza', number: '15+' },
                    { icon: '✓', label: 'Accreditamento', number: '100%' },
                ],
                title: 'Sicurezza sul Lavoro',
                subtitle: 'Semplice e Garantita',
                description: 'RSPP esterno, DVR, formazione obbligatoria e medicina del lavoro. Conformità totale al D.Lgs 81/08 per aziende di tutti i settori.',
                trustBadges: [
                    { icon: 'Award', text: 'Ente Accreditato Regione' },
                    { icon: 'Shield', text: 'Tutti i Macrosettori' },
                    { icon: 'CheckCircle', text: 'Conformità Garantita' },
                ],
                primaryButton: { href: '/contatti', text: 'Consulenza Gratuita' },
                secondaryButton: { href: '/corsi', text: 'Scopri i Corsi' },
                backgroundVariant: 'gradient',
            },
            services: {
                title: 'I Nostri Servizi',
                items: [
                    { icon: 'UserCog', title: 'RSPP Esterno', description: 'Responsabile SPP qualificato per tutti i macrosettori ATECO', href: '/rspp', color: 'blue' },
                    { icon: 'FileText', title: 'DVR', description: 'Documento di Valutazione dei Rischi completo e aggiornato', href: '/servizi', color: 'orange' },
                    { icon: 'GraduationCap', title: 'Formazione', description: 'Corsi accreditati per tutte le figure D.Lgs 81/08', href: '/corsi', color: 'green' },
                    { icon: 'Stethoscope', title: 'Medicina del Lavoro', description: 'Sorveglianza sanitaria con medico competente', href: '/medicina-del-lavoro', color: 'teal' },
                ],
            },
            metadata: {
                theme: 'formazione',
                layout: 'full-width',
                structuredData: {
                    '@context': 'https://schema.org',
                    '@type': 'ProfessionalService',
                    name: 'Element Sicurezza',
                    description: 'Servizi RSPP, sicurezza sul lavoro e formazione per aziende',
                    url: 'https://www.elementsicurezza.com',
                    telephone: '+39-351-623-9176',
                    address: { '@type': 'PostalAddress', streetAddress: 'Via Piave 4', addressLocality: 'Padova', postalCode: '35138', addressCountry: 'IT' },
                    areaServed: { '@type': 'State', name: 'Veneto' },
                    serviceType: ['RSPP Esterno', 'Formazione Sicurezza', 'DVR', 'Medicina del Lavoro'],
                    priceRange: '€€',
                },
            },
        },
        blocks: [],
    },
    {
        slug: 'medicina-del-lavoro',
        title: 'Medicina del Lavoro - Element Sicurezza',
        seoTitle: 'Medicina del Lavoro Padova | Medico Competente | Element Sicurezza',
        seoDescription: 'Medicina del lavoro a Padova: visite preventive e periodiche, medico competente, sorveglianza sanitaria D.Lgs 81/08. Gestione digitale scadenze.',
        isPublished: true,
        status: 'published',
        layout: 'full-width',
        tenantId: '3d47d739-0a8d-4105-be52-b156e895ef7d',
        publishedAt: new Date('2026-02-17T18:21:57.000Z'),
        content: {
            hero: {
                stats: [
                    { icon: 'Building2', label: 'Aziende Servite', number: '300+' },
                    { icon: 'Users', label: 'Lavoratori Visitati', number: '10.000+' },
                    { icon: 'CheckCircle', label: 'Conformità', number: '100%' },
                    { icon: 'Clock', label: 'Risposta', number: '48h' },
                ],
                title: 'Medicina del Lavoro',
                subtitle: 'Sorveglianza Sanitaria per Aziende',
                description: 'Medico competente certificato, visite preventive e periodiche, protocolli sanitari personalizzati. Conformità totale D.Lgs 81/08.',
                primaryButton: { href: '/contatti', text: 'Richiedi Preventivo' },
                secondaryButton: { href: '#servizi', text: 'Scopri i Servizi' },
                backgroundVariant: 'gradient',
            },
            services: {
                title: 'Servizi Medicina del Lavoro',
                items: [
                    { icon: 'Stethoscope', title: 'Visite Preventive', description: 'Prima assunzione o cambio mansione', color: 'teal' },
                    { icon: 'UserCheck', title: 'Visite Periodiche', description: 'Monitoraggio continuo secondo protocollo', color: 'blue' },
                    { icon: 'Activity', title: 'Accertamenti Specialistici', description: 'Spirometria, audiometria, ECG, drug test', color: 'purple' },
                    { icon: 'FileText', title: 'Gestione Documentale', description: 'Cartelle sanitarie digitali e alert scadenze', color: 'orange' },
                ],
            },
            normativa: {
                title: 'Riferimento Normativo',
                content: 'Il D.Lgs. 81/08 (Testo Unico Sicurezza) all\'art. 41 obbliga il datore di lavoro a far sottoporre i lavoratori esposti a rischi specifici a sorveglianza sanitaria da parte del medico competente.',
            },
            metadata: { theme: 'formazione', layout: 'full-width' },
        },
        blocks: [],
    },
    {
        slug: 'privacy-policy',
        title: 'Privacy Policy - Element Sicurezza',
        seoTitle: 'Privacy Policy - Element Sicurezza',
        seoDescription: 'Informativa privacy Element Sicurezza. Come trattiamo i tuoi dati personali in conformità al GDPR.',
        isPublished: true,
        status: 'published',
        layout: 'full-width',
        tenantId: '3d47d739-0a8d-4105-be52-b156e895ef7d',
        publishedAt: new Date('2026-02-17T18:21:57.000Z'),
        content: {
            hero: { icon: 'Shield', title: 'Privacy Policy', description: 'Informativa sul trattamento dei dati personali' },
            lastUpdate: '2026-02-17T00:00:00.000Z',
            introduction: { title: 'Titolare del Trattamento', content: 'Element Sicurezza S.r.l., Via Piave 4, 35138 Padova (PD). P.IVA: 05580640281. Email DPO: privacy@elementsicurezza.com' },
            dataProcessed: {
                title: 'Dati Trattati',
                categories: [
                    { category: 'Dati identificativi', purpose: 'Fornitura dei servizi', basis: 'Contratto', retention: '10 anni' },
                    { category: 'Dati di contatto', purpose: 'Comunicazioni aziendali', basis: 'Legittimo interesse', retention: '3 anni' },
                    { category: 'Dati sanitari', purpose: 'Sorveglianza sanitaria', basis: 'Obbligo legale', retention: 'Come da norme di settore' },
                ],
            },
            rights: {
                title: 'I Tuoi Diritti GDPR',
                items: ['Accesso ai dati', 'Rettifica', 'Cancellazione', 'Portabilità', 'Opposizione', 'Limitazione del trattamento'],
            },
            contact: { email: 'privacy@elementsicurezza.com', title: 'Contatti DPO' },
            metadata: { theme: 'formazione', layout: 'full-width' },
        },
        blocks: [],
    },
    // rspp and servizi are large - importing trimmed version preserving SEO
    {
        slug: 'rspp',
        title: 'Nomina RSPP - Element Sicurezza',
        seoTitle: 'RSPP Esterno Padova | Nomina RSPP D.Lgs 81/08 | Element Sicurezza',
        seoDescription: 'Servizio RSPP esterno a Padova. Nomina RSPP conforme D.Lgs 81/08 per tutti i macrosettori ATECO. DVR, sopralluoghi, consulenza. Da €800/anno.',
        isPublished: true,
        status: 'published',
        layout: 'full-width',
        tenantId: '3d47d739-0a8d-4105-be52-b156e895ef7d',
        publishedAt: new Date('2026-02-17T18:21:57.000Z'),
        content: {
            hero: {
                stats: [
                    { icon: '🏢', label: 'Aziende Clienti', number: '300+' },
                    { icon: '🎓', label: 'Lavoratori Formati/Anno', number: '5.000+' },
                    { icon: '⭐', label: 'Anni Esperienza', number: '15+' },
                    { icon: '✓', label: 'Accreditamento', number: '100%' },
                ],
                title: 'RSPP e Formazione Sicurezza',
                subtitle: 'Conformità Totale al D.Lgs 81/08',
                description: 'Servizio RSPP esterno completo con consulenza continuativa, DVR personalizzato, formazione certificata per tutti i livelli aziendali. Oltre 300 aziende ci affidano la loro sicurezza.',
                trustBadges: [
                    { icon: 'Award', text: 'Ente Accreditato Regione' },
                    { icon: 'Shield', text: 'Tutti i Macrosettori' },
                    { icon: 'CheckCircle', text: 'Conformità Garantita' },
                ],
                primaryButton: { href: '/contatti', text: 'Richiedi Consulenza Gratuita' },
                secondaryButton: { href: '#corsi', text: 'Scopri i Corsi' },
            },
            pricing: {
                title: 'Quanto Costa il Servizio RSPP Esterno?',
                packages: [
                    { name: 'RSPP Start', price: '€800', unit: 'annuale', setup: '€500 (DVR iniziale)', subtitle: 'Per micro-imprese', description: '1-10 dipendenti, rischio basso-medio', recommended: false, features: ['Nomina RSPP esterno', 'Sopralluogo semestrale', '1 aggiornamento DVR annuale', 'Consulenza email/telefono', 'Partecipazione riunione art.35', 'Gestione scadenze formazione'] },
                    { name: 'RSPP Professional', price: '€1.500', unit: 'annuale', setup: '€1.200 (DVR + valutazioni)', subtitle: 'Per PMI', description: '11-50 dipendenti, tutti i rischi', recommended: true, badge: 'Più Scelto', features: ['Tutto del pacchetto Start', 'Sopralluoghi trimestrali (4/anno)', 'Aggiornamenti DVR illimitati', 'Valutazioni rischi specifiche incluse', 'Supporto durante ispezioni', 'Piattaforma gestione documentale'] },
                    { name: 'RSPP Enterprise', price: 'Da €3.000', unit: 'annuale', setup: 'Preventivo personalizzato', subtitle: 'Per aziende strutturate', description: 'Oltre 50 dipendenti, multi-sede', recommended: false, features: ['Tutto del pacchetto Professional', 'RSPP dedicato con visite mensili', 'Audit periodici sistema gestione', 'Supporto certificazioni (ISO 45001)', 'Formazione interna personalizzata', 'Assistenza H24 per emergenze'] },
                ],
            },
            whatIsRSPP: {
                title: "Cos'è il Responsabile del Servizio di Prevenzione e Protezione (RSPP)?",
                description: 'Il RSPP è la figura obbligatoria per legge (art. 31-34 D.Lgs 81/08) che coordina il servizio di prevenzione e protezione dai rischi professionali.',
                highlights: [
                    { icon: 'Scale', color: 'red', title: 'Obbligo di Legge', description: 'Il datore di lavoro DEVE nominare un RSPP. Sanzione per omessa nomina: arresto 3-6 mesi o ammenda €3.071-7.862.' },
                    { icon: 'UserCheck', color: 'blue', title: 'RSPP Interno o Esterno', description: 'Il datore può nominare un dipendente interno qualificato o un consulente esterno.' },
                    { icon: 'FileCheck', color: 'green', title: 'Formazione Obbligatoria', description: "L'RSPP deve avere formazione specifica per macrosettore ATECO (Moduli A, B, C)." },
                ],
            },
            metadata: {
                theme: 'formazione',
                layout: 'full-width',
                structuredData: {
                    '@context': 'https://schema.org',
                    '@type': 'ProfessionalService',
                    name: 'Element Sicurezza - RSPP e Sicurezza',
                    url: 'https://elementsicurezza.com/rspp-formazione-sicurezza',
                    telephone: '+39-351-623-9176',
                    areaServed: { '@type': 'Country', name: 'Italy' },
                    serviceType: ['RSPP Esterno', 'Formazione Sicurezza', 'DVR', 'Consulenza D.Lgs 81/08'],
                    priceRange: '€€',
                },
            },
        },
        blocks: [],
    },
    {
        slug: 'servizi',
        title: 'Servizi di Sicurezza sul Lavoro',
        seoTitle: 'Servizi Sicurezza sul Lavoro | RSPP, DVR, Formazione, Medicina Lavoro | Padova',
        seoDescription: 'Servizi completi sicurezza sul lavoro: RSPP esterno, DVR, formazione D.Lgs 81/08, medicina del lavoro. 15 anni esperienza. 300+ aziende. Padova.',
        isPublished: true,
        status: 'published',
        layout: 'full-width',
        tenantId: '3d47d739-0a8d-4105-be52-b156e895ef7d',
        publishedAt: new Date('2026-02-17T18:21:57.000Z'),
        content: {
            hero: {
                stats: [
                    { icon: 'Building2', label: 'Aziende Seguite', number: '500+' },
                    { icon: 'Award', label: 'Anni Esperienza', number: '15+' },
                    { icon: 'Target', label: 'Macrosettori ATECO', number: '9' },
                    { icon: 'Shield', label: 'Conformità', number: '100%' },
                ],
                title: 'Servizi Completi',
                subtitle: 'per la Sicurezza Aziendale',
                description: 'Supporto a 360° per la conformità normativa D.Lgs 81/08. Dalla valutazione dei rischi alla formazione, dalla medicina del lavoro alla consulenza continua.',
                primaryButton: { href: '/contatti', text: 'Richiedi Consulenza' },
                secondaryButton: { href: 'tel:+393516239176', text: 'Chiama Ora' },
                backgroundVariant: 'gradient',
            },
            services: [
                { href: '/contatti', icon: 'FileText', badge: 'Obbligatorio', color: 'blue', title: 'DVR - Documento Valutazione Rischi', description: 'Redazione e aggiornamento del DVR secondo gli standard più recenti.', features: ['Analisi completa dei rischi', 'Sopralluogo tecnico', 'Piano di miglioramento', 'Aggiornamento periodico'] },
                { href: '/rspp', icon: 'UserCheck', badge: 'Premium', color: 'purple', title: 'RSPP Esterno', description: 'Servizio RSPP qualificato per tutti i macrosettori ATECO.', features: ['Qualifica tutti i settori', 'Sopralluoghi periodici', 'Riunione annuale art. 35', 'Consulenza telefonica'] },
                { href: '/medicina-del-lavoro', icon: 'Stethoscope', badge: 'Certificato', color: 'teal', title: 'Medicina del Lavoro', description: 'Sorveglianza sanitaria completa con medico competente aziendale.', features: ['Visite preventive e periodiche', 'Protocollo personalizzato', 'Esami strumentali', 'Alert scadenze'] },
                { href: '/corsi', icon: 'GraduationCap', badge: 'Più Richiesto', color: 'green', title: 'Formazione Sicurezza', description: 'Catalogo completo corsi D.Lgs 81/08 per tutte le figure aziendali.', features: ['50+ corsi disponibili', 'Aula/online/blended', 'Attestati riconosciuti', 'Formazione in azienda'] },
            ],
            metadata: { theme: 'formazione', layout: 'full-width' },
        },
        blocks: [],
    },
    {
        slug: 'termini',
        title: 'Termini di Servizio - Element Sicurezza',
        seoTitle: 'Termini di Servizio - Element Sicurezza',
        seoDescription: 'Termini e condizioni generali di utilizzo del sito e dei servizi Element Sicurezza.',
        isPublished: true,
        status: 'published',
        layout: 'full-width',
        tenantId: '3d47d739-0a8d-4105-be52-b156e895ef7d',
        publishedAt: new Date('2026-02-17T18:21:57.000Z'),
        content: {
            hero: { icon: 'Scale', title: 'Termini di Servizio', description: 'Condizioni generali di utilizzo del sito e dei nostri servizi' },
            lastUpdate: '2025-11-29T06:22:15.698Z',
            companyInfo: { title: 'Informazioni sulla Società', company: 'Element Sicurezza S.r.l.', details: { vat: '05580640281', pec: 'element.srl@pec.it', rea: 'PD-462421', email: 'info@elementsicurezza.com', phone: '+39 351 623 9176', address: 'Via Piave 4, 35138 Padova (PD)' } },
            introduction: { title: 'Informazioni Generali', content: 'I presenti Termini di Servizio disciplinano l\'utilizzo del sito web www.elementsicurezza.com e dei servizi offerti da Element Sicurezza S.r.l.' },
            metadata: { theme: 'formazione', layout: 'full-width' },
        },
        blocks: [],
    },

    // ─── ELEMENT MEDICA (7 pages) ──────────────────────────────────────────
    {
        slug: 'medica-chi-siamo',
        title: 'Chi Siamo - Element Medica',
        seoTitle: 'Chi Siamo - Element Medica | Poliambulatorio Selvazzano Dentro',
        seoDescription: 'Element Medica: centro medico polispecialistico a Selvazzano Dentro (PD). Oltre 15 anni di esperienza. Team di medici esperti, tecnologie avanzate.',
        isPublished: true,
        status: 'published',
        layout: 'full-width',
        tenantId: '402f94bd-f26e-4bcd-9c77-48a9863d527f',
        publishedAt: new Date('2026-02-17T18:21:57.000Z'),
        content: {
            cta: { title: 'Vuoi Conoscerci Meglio?', subtitle: 'Vieni a trovarci o contattaci per informazioni', primaryButton: { href: '/contatti', icon: 'Phone', text: 'Contattaci' }, secondaryButton: { href: '/prenota', icon: 'Calendar', text: 'Prenota Visita' } },
            hero: { title: 'Chi Siamo', subtitle: 'Element Medica', description: 'Da oltre 15 anni ci prendiamo cura della salute delle persone e delle aziende con professionalità, innovazione e un approccio umano alla medicina.', primaryButton: { href: '/servizi', icon: 'ArrowRight', text: 'Scopri i Servizi' }, secondaryButton: { href: '/contatti', icon: 'Phone', text: 'Contattaci' }, backgroundVariant: 'gradient' },
            mission: { title: 'La Nostra Missione', subtitle: 'Rendere l\'eccellenza medica accessibile a tutti', description: 'Crediamo che ogni persona meriti cure di qualità. La nostra missione è offrire servizi sanitari di alto livello con un approccio umano e personalizzato.', values: [{ icon: 'Heart', title: 'Cura del Paziente', description: 'Il paziente è al centro di ogni decisione' }, { icon: 'Award', title: 'Eccellenza Clinica', description: 'Standard elevati e aggiornamento continuo' }, { icon: 'Users', title: 'Approccio Umano', description: 'Ascolto, empatia e rispetto' }, { icon: 'Cpu', title: 'Innovazione', description: 'Tecnologie all\'avanguardia' }] },
            storia: { title: 'La Nostra Storia', subtitle: 'Un percorso di crescita e innovazione', timeline: [{ year: '2008', color: 'blue', title: 'La Fondazione', description: 'Nasce Element Medica dalla visione di un gruppo di medici specialisti' }, { year: '2015', color: 'purple', title: 'Centro Polispecialistico', description: 'Ampliamento con oltre 20 specialità mediche' }, { year: '2018', color: 'orange', title: 'Eccellenza Riconosciuta', description: 'Certificazione ISO 9001 e accreditamento regionale' }, { year: '2024', color: 'indigo', title: 'Nuova Sede', description: 'Inaugurazione della nuova sede a Selvazzano Dentro' }] },
            numbers: { title: 'I Numeri di Element Medica', items: [{ icon: 'Users', label: 'Pazienti all\'Anno', value: '25.000+' }, { icon: 'Building2', label: 'Aziende Clienti', value: '3.000+' }, { icon: 'Stethoscope', label: 'Specialità Mediche', value: '30+' }, { icon: 'Award', label: 'Anni di Attività', value: '15' }] },
            certifications: { title: 'Le Nostre Certificazioni', subtitle: 'Qualità garantita e riconosciuta', items: [{ icon: 'Award', name: 'ISO 9001:2015', color: 'blue', description: 'Sistema di Gestione Qualità certificato' }, { icon: 'Shield', name: 'Accreditamento Regionale', color: 'green', description: 'Centro accreditato per tutte le attività sanitarie' }, { icon: 'Stethoscope', name: 'SIML', color: 'teal', description: 'Società Italiana Medicina del Lavoro' }] },
            metadata: { title: 'Chi Siamo - Element Medica', keywords: ['chi siamo', 'element medica', 'poliambulatorio', 'selvazzano', 'storia', 'team medico'], description: 'Scopri Element Medica: centro medico polispecialistico a Selvazzano Dentro con oltre 15 anni di esperienza.' },
        },
        blocks: [],
    },
    {
        slug: 'medica-contatti',
        title: 'Contatti - Element Medica',
        seoTitle: 'Contatti Element Medica | Poliambulatorio Selvazzano Dentro | +39 351 318 1574',
        seoDescription: 'Contatta Element Medica a Selvazzano Dentro (PD). Prenotazioni visite, medicina del lavoro, informazioni. Via Bracciano 34. Tel: +39 351 318 1574.',
        isPublished: true,
        status: 'published',
        layout: 'full-width',
        tenantId: '402f94bd-f26e-4bcd-9c77-48a9863d527f',
        publishedAt: new Date('2026-02-17T18:21:57.000Z'),
        content: {
            cta: { title: 'Preferisci Prenotare Direttamente?', description: 'Usa il nostro sistema di prenotazione online.', primaryButton: { href: '/medica-prenota', icon: 'Calendar', text: 'Prenota Online' }, secondaryButton: { href: 'tel:+393513181574', icon: 'Phone', text: 'Chiama Ora' } },
            hero: { title: 'Contattaci', subtitle: 'Siamo Qui per Te', description: 'Hai domande o vuoi prenotare una visita? Il nostro team è a disposizione per assisterti.', backgroundVariant: 'medical-contact' },
            location: { title: 'La Nostra Sede', address: { street: 'Via Bracciano 34, Selvazzano Dentro', cap: '35030', city: 'Selvazzano Dentro (PD)', region: 'Veneto' }, parking: { name: 'ParkMed Convenzionato', rate: '€1,50/ora', address: 'Via Bracciano 34, 35030 Selvazzano Dentro (PD)' } },
            contactInfo: { title: 'Come Raggiungerci', items: [{ icon: 'Phone', title: 'Telefono', primary: '+39 351 318 1574', secondary: 'Lun-Ven 8:00-19:00, Sab 8:00-13:00', action: { href: 'tel:+393513181574', type: 'tel' } }, { icon: 'Mail', title: 'Email', primary: 'info@elementmedica.com', secondary: 'Rispondiamo entro 24 ore', action: { href: 'mailto:info@elementmedica.com', type: 'mailto' } }, { icon: 'MapPin', title: 'Indirizzo', primary: 'Via Bracciano 34, Selvazzano Dentro', secondary: '35030 Selvazzano Dentro (PD)', action: { href: 'https://maps.google.com/?q=Via+Bracciano+34+Selvazzano+Dentro+PD', type: 'maps' } }] },
            openingHours: { title: 'Orari di Apertura', schedule: [{ days: 'Lunedì - Venerdì', hours: '7:30 - 19:30', services: 'Tutti i servizi' }, { days: 'Sabato', hours: '8:00 - 13:00', services: 'Visite e prelievi' }, { days: 'Domenica', hours: 'Chiuso', services: '' }] },
            metadata: { theme: 'medical', layout: 'full-width', colorScheme: 'teal' },
        },
        blocks: [],
    },
    {
        slug: 'medica-diagnostica',
        title: 'Diagnostica - Element Medica',
        seoTitle: 'Diagnostica per Immagini Selvazzano | Ecografie, RM, TAC | Element Medica',
        seoDescription: 'Centro diagnostica per immagini a Selvazzano Dentro (PD): ecografie, radiografie, risonanze magnetiche, TAC. Tecnologia avanzata, referti in 24h.',
        isPublished: true,
        status: 'published',
        layout: 'full-width',
        tenantId: '402f94bd-f26e-4bcd-9c77-48a9863d527f',
        publishedAt: new Date('2026-02-17T18:21:57.000Z'),
        content: {
            hero: { stats: [{ icon: 'Scan', label: 'Esami Disponibili', number: '15+' }, { icon: 'Cpu', label: 'Digitale', number: '100%' }, { icon: 'Clock', label: 'Referti', number: '24h' }], title: 'Diagnostica per Immagini', subtitle: 'Tecnologia all\'Avanguardia', description: 'Strumentazione di ultima generazione per diagnosi precise e tempestive. Ecografie, radiografie, risonanze magnetiche e TAC con refertazione rapida.', primaryButton: { href: '/prenota', icon: 'Calendar', text: 'Prenota Esame' }, backgroundVariant: 'gradient' },
            services: { sectionTitle: 'I Nostri Servizi Diagnostici', items: [{ icon: 'Scan', color: 'teal', title: 'Ecografia Multidistretto', description: 'Ecografie di tutti i distretti corporei con apparecchiature di ultima generazione', exams: ['Ecografia addome completo', 'Ecografia tiroide e collo', 'Ecografia muscolo-tendinea', 'Eco-Doppler vasi'] }, { icon: 'Activity', color: 'blue', title: 'Radiologia Digitale', description: 'Radiografie con tecnologia digitale per immagini ad alta definizione', exams: ['RX torace', 'RX colonna vertebrale', 'RX articolazioni'] }, { icon: 'Brain', color: 'purple', title: 'Risonanza Magnetica', description: 'RM per studi neurologici, ortopedici e addominali', exams: ['RM encefalo', 'RM colonna vertebrale', 'RM articolazioni'] }, { icon: 'Cpu', color: 'orange', title: 'TAC', description: 'TC multistrato per studi dettagliati', exams: ['TC encefalo', 'TC torace', 'TC addome'] }] },
            pricing: { sectionTitle: 'Tariffe Diagnostica', categories: [{ name: 'Ecografie', items: [{ name: 'Ecografia singolo distretto', price: '€60' }, { name: 'Ecografia addome completo', price: '€80' }] }, { name: 'Radiologia', items: [{ name: 'RX singolo segmento', price: '€40' }, { name: 'RX torace', price: '€45' }] }] },
            metadata: { title: 'Diagnostica per Immagini - Element Medica', keywords: ['diagnostica', 'ecografia selvazzano', 'radiografia', 'risonanza magnetica padova', 'TAC'], description: 'Centro di diagnostica per immagini a Selvazzano Dentro: ecografie, radiografie, risonanze magnetiche, TAC.' },
        },
        blocks: [],
    },
    {
        slug: 'medica-homepage',
        title: 'Homepage - Element Medica',
        seoTitle: 'Element Medica | Poliambulatorio Selvazzano Dentro (PD) | Centro Medico',
        seoDescription: 'Element Medica: poliambulatorio a Selvazzano Dentro (PD). Visite specialistiche, medicina del lavoro, diagnostica. 25.000+ pazienti, 50+ medici.',
        isPublished: true,
        status: 'published',
        layout: 'full-width',
        tenantId: '402f94bd-f26e-4bcd-9c77-48a9863d527f',
        publishedAt: new Date('2026-02-17T18:21:57.000Z'),
        content: {
            hero: { stats: [{ icon: 'Users', label: 'Pazienti Soddisfatti', number: '25.000+' }, { icon: 'Stethoscope', label: 'Specialisti', number: '50+' }, { icon: 'Award', label: 'Anni di Esperienza', number: '15' }, { icon: 'Heart', label: 'Soddisfazione', number: '98%' }], title: 'Il Tuo Centro Medico', subtitle: 'di Fiducia a Selvazzano Dentro', description: 'Visite specialistiche, diagnostica avanzata e medicina del lavoro in un unico centro. Tecnologie all\'avanguardia e medici esperti per la tua salute.', primaryButton: { href: '/prenota', icon: 'Calendar', text: 'Prenota Visita' }, secondaryButton: { href: '/servizi', icon: 'ArrowRight', text: 'Scopri i Servizi' }, backgroundVariant: 'medical-gradient' },
            services: { sectionTitle: 'I Nostri Servizi', items: [{ icon: 'Stethoscope', link: '/medicina-del-lavoro', color: 'teal', title: 'Medicina del Lavoro', description: 'Sorveglianza sanitaria completa con medici competenti certificati.' }, { icon: 'Heart', link: '/visite-specialistiche', color: 'blue', title: 'Visite Specialistiche', description: 'Oltre 30 specialità mediche con professionisti di alto livello.' }, { icon: 'Scan', link: '/diagnostica', color: 'purple', title: 'Diagnostica per Immagini', description: 'Ecografie, radiografie, risonanze magnetiche e TAC.' }, { icon: 'TestTube2', link: '/laboratorio', color: 'orange', title: 'Laboratorio Analisi', description: 'Analisi cliniche complete con refertazione rapida.' }] },
            emergency: { email: 'info@elementmedica.com', hours: 'Lun-Ven 8:00-20:00 | Sab 8:00-13:00', phone: '+39 351 318 1574', title: 'Contatto Rapido', ctaHref: '/prenota', ctaText: 'Prenota Ora' },
            metadata: { title: 'Element Medica - Poliambulatorio Selvazzano Dentro (PD)', keywords: ['poliambulatorio selvazzano', 'centro medico selvazzano', 'medicina del lavoro selvazzano', 'visite specialistiche padova'], description: 'Poliambulatorio a Selvazzano Dentro (PD): visite specialistiche, medicina del lavoro, diagnostica avanzata.' },
        },
        blocks: [],
    },
    {
        slug: 'medica-medicina-del-lavoro',
        title: 'Medicina del Lavoro - Element Medica',
        seoTitle: 'Medicina del Lavoro Selvazzano | Medico Competente Padova | Element Medica',
        seoDescription: 'Medicina del lavoro a Selvazzano Dentro (PD): visite preventive e periodiche, medico competente, sorveglianza sanitaria D.Lgs 81/08. Preventivo gratuito.',
        isPublished: true,
        status: 'published',
        layout: 'full-width',
        tenantId: '402f94bd-f26e-4bcd-9c77-48a9863d527f',
        publishedAt: new Date('2026-02-17T18:21:57.000Z'),
        content: {
            hero: { stats: [{ icon: 'Building2', label: 'Aziende Servite', number: '3.000+' }, { icon: 'Users', label: 'Lavoratori Visitati', number: '50.000+' }, { icon: 'CheckCircle', label: 'Conformità Garantita', number: '100%' }, { icon: 'Clock', label: 'Risposta', number: '24h' }], title: 'Medicina del Lavoro', subtitle: 'per la Tua Azienda', description: 'Sorveglianza sanitaria professionale con medici competenti specializzati. Protocolli personalizzati, gestione digitale e conformità garantita.', primaryButton: { href: '/contatti', icon: 'ArrowRight', text: 'Richiedi Preventivo' }, backgroundVariant: 'medical-gradient' },
            services: { sectionTitle: 'I Nostri Servizi', items: [{ icon: 'Stethoscope', color: 'teal', title: 'Visite Mediche Preventive', description: 'Valutazione dello stato di salute prima dell\'assunzione o cambio mansione', details: [{ label: 'Visita medica completa' }, { label: 'Esami strumentali' }, { label: 'Giudizio di idoneità immediato' }] }, { icon: 'UserCheck', color: 'blue', title: 'Visite Periodiche', description: 'Monitoraggio costante della salute secondo il protocollo sanitario', details: [{ label: 'Controlli programmati' }, { label: 'Alert scadenze automatici' }, { label: 'Cartelle sanitarie digitali' }] }, { icon: 'Activity', color: 'purple', title: 'Accertamenti Specialistici', description: 'Spirometria, audiometria, ECG, drug test', details: [{ label: 'Spirometria' }, { label: 'Audiometria' }, { label: 'ECG' }] }] },
            introduction: { title: 'La Sorveglianza Sanitaria è un Obbligo di Legge', content: 'Il D.Lgs. 81/08 impone al datore di lavoro di sottoporre i dipendenti esposti a rischi specifici a sorveglianza sanitaria con medico competente certificato.' },
            metadata: { title: 'Medicina del Lavoro - Element Medica', keywords: ['medicina del lavoro selvazzano', 'medico competente padova', 'sorveglianza sanitaria', 'visite periodiche', 'idoneità lavorativa'], description: 'Medicina del lavoro a Selvazzano Dentro: visite preventive e periodiche, medico competente, sorveglianza sanitaria D.Lgs 81/08.' },
        },
        blocks: [],
    },
    {
        slug: 'medica-prenota',
        title: 'Prenota Online - Element Medica',
        seoTitle: 'Prenota Visita Online | Poliambulatorio Selvazzano | Element Medica',
        seoDescription: 'Prenota online la tua visita specialistica o esame diagnostico a Selvazzano Dentro (PD). Conferma immediata. Sistema attivo 24/7.',
        isPublished: true,
        status: 'published',
        layout: 'full-width',
        tenantId: '402f94bd-f26e-4bcd-9c77-48a9863d527f',
        publishedAt: new Date('2026-02-17T18:21:57.000Z'),
        content: {
            hero: { stats: [{ icon: 'Clock', label: 'Prenotazione Online', number: '24/7' }, { icon: 'Calendar', label: 'Disponibilità Media', number: '< 48h' }, { icon: 'CheckCircle', label: 'Conferma Immediata', number: '100%' }], title: 'Prenota Online', subtitle: 'La Tua Visita in Pochi Click', description: 'Prenota comodamente da casa la tua visita specialistica o esame diagnostico. Conferma immediata via email e SMS.', backgroundVariant: 'medical-booking' },
            bookingCategories: { title: 'Cosa Vuoi Prenotare?', categories: [{ href: '#visite', icon: 'Stethoscope', color: 'teal', title: 'Visite Specialistiche', description: 'Cardiologia, ortopedia e altre 20+ specialità' }, { href: '#diagnostica', icon: 'Activity', color: 'cyan', title: 'Esami Diagnostici', description: 'Ecografie, ECG, esami sangue' }, { href: '#lavoro', icon: 'Briefcase', color: 'emerald', title: 'Medicina del Lavoro', description: 'Visite preventive, periodiche, sorveglianza' }] },
            metadata: { theme: 'medical', layout: 'full-width', colorScheme: 'teal' },
        },
        blocks: [],
    },
    {
        slug: 'medica-visite-specialistiche',
        title: 'Visite Specialistiche - Element Medica',
        seoTitle: 'Visite Specialistiche Selvazzano Dentro | 30+ Specialità | Element Medica',
        seoDescription: 'Visite specialistiche a Selvazzano Dentro (PD): cardiologia, neurologia, ortopedia, dermatologia. 50+ medici, appuntamenti in 24-48h. Prenota online.',
        isPublished: true,
        status: 'published',
        layout: 'full-width',
        tenantId: '402f94bd-f26e-4bcd-9c77-48a9863d527f',
        publishedAt: new Date('2026-02-17T18:21:57.000Z'),
        content: {
            hero: { stats: [{ icon: 'Stethoscope', label: 'Specialità', number: '30+' }, { icon: 'Users', label: 'Medici', number: '50+' }, { icon: 'Clock', label: 'Prenotazione', number: '24h' }, { icon: 'Award', label: 'Soddisfatti', number: '98%' }], title: 'Visite Specialistiche', subtitle: 'Oltre 30 Specialità Mediche', description: 'Un team di medici esperti a tua disposizione a Selvazzano Dentro. Prenota la tua visita con tempi rapidi.', primaryButton: { href: '/prenota', icon: 'Calendar', text: 'Prenota Visita' }, backgroundVariant: 'gradient' },
            specialties: { sectionTitle: 'Le Nostre Specialità', categories: [{ icon: 'Heart', color: 'red', title: 'Area Cardiologica', specialists: [{ name: 'Cardiologia', description: 'Visita cardiologica, ECG, Holter, Ecocardiogramma' }, { name: 'Angiologia', description: 'Eco-Doppler arti' }] }, { icon: 'Brain', color: 'purple', title: 'Area Neurologica', specialists: [{ name: 'Neurologia', description: 'Cefalee, vertigini, neuropatie' }] }, { icon: 'Activity', color: 'blue', title: 'Area Ortopedica', specialists: [{ name: 'Ortopedia', description: 'Patologie osteoarticolari, traumi' }] }, { icon: 'Scan', color: 'orange', title: 'Area Dermatologica', specialists: [{ name: 'Dermatologia', description: 'Patologie cutanee, mappatura nei' }] }] },
            metadata: { title: 'Visite Specialistiche - Element Medica', keywords: ['visite specialistiche selvazzano', 'cardiologia padova', 'ortopedia selvazzano', 'poliambulatorio'], description: 'Visite specialistiche a Selvazzano Dentro (PD): cardiologia, neurologia, ortopedia, dermatologia. 50+ medici specialisti.' },
        },
        blocks: [],
    },
];

// ── Main import function ─────────────────────────────────────────────────────
async function importCMSPages() {
    let imported = 0;
    let skipped = 0;
    let updated = 0;
    const errors = [];

    console.log(`\n🚀 Starting CMS import... (${PRODUCTION_PAGES.length} pages)`);

    for (const page of PRODUCTION_PAGES) {
        const localTenantId = TENANT_MAP[page.tenantId];
        if (!localTenantId) {
            console.warn(`  ⚠️  No local tenant mapping for ${page.tenantId} (slug: ${page.slug}), skipping`);
            skipped++;
            continue;
        }

        try {
            // Check if page already exists locally
            const existing = await prisma.cMSPage.findUnique({
                where: { tenantId_slug: { tenantId: localTenantId, slug: page.slug } },
            });

            const data = {
                title: page.title,
                seoTitle: page.seoTitle || null,
                seoDescription: page.seoDescription || null,
                content: page.content,
                blocks: page.blocks || [],
                layout: page.layout || 'full-width',
                status: page.status || 'published',
                isPublished: page.isPublished ?? true,
                publishedAt: page.publishedAt || new Date(),
                tenantId: localTenantId,
            };

            if (existing) {
                // Update existing page with production data
                await prisma.cMSPage.update({
                    where: { id: existing.id },
                    data,
                });
                console.log(`  🔄 Updated:  ${page.slug}`);
                updated++;
            } else {
                // Create new page
                await prisma.cMSPage.create({ data: { ...data, slug: page.slug } });
                console.log(`  ✅ Imported: ${page.slug}`);
                imported++;
            }
        } catch (err) {
            console.error(`  ❌ Error on ${page.slug}: ${err.message}`);
            errors.push({ slug: page.slug, error: err.message });
        }
    }

    // Summary
    console.log('\n=== CMS Import Summary ===');
    console.log(`✅ Imported:  ${imported}`);
    console.log(`🔄 Updated:   ${updated}`);
    console.log(`⏭️  Skipped:   ${skipped}`);
    if (errors.length > 0) {
        console.log(`❌ Errors:    ${errors.length}`);
        errors.forEach(e => console.log(`   - ${e.slug}: ${e.error}`));
    }
    console.log('=========================\n');
}

importCMSPages()
    .catch((err) => {
        console.error('Fatal error during CMS import:', err.message);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
