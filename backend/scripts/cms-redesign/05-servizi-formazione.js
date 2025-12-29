/**
 * CMS Redesign - Servizi Element Formazione
 * 
 * Eseguire: node backend/scripts/cms-redesign/05-servizi-formazione.js
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const TENANT_FORMAZIONE = 'd2bbc5b0-344c-47c7-8ef5-f57755293372';

const serviziFormazione = {
    slug: 'servizi',
    title: 'Servizi di Sicurezza sul Lavoro',
    seoTitle: 'Servizi Sicurezza Lavoro | Consulenza D.Lgs 81/08 | DVR | Element Formazione',
    seoDescription: 'Servizi completi di sicurezza sul lavoro: consulenza DVR, RSPP esterno, medicina del lavoro, formazione, audit sicurezza. Supporto a 360° per la conformità normativa.',
    status: 'published',
    layout: 'full-width',
    content: {
        metadata: { layout: 'full-width', theme: 'formazione' },
        hero: {
            title: 'Servizi Completi',
            subtitle: 'per la Sicurezza Aziendale',
            description: 'Supporto a 360° per la conformità normativa D.Lgs 81/08. Dalla valutazione dei rischi alla formazione, dalla medicina del lavoro alla consulenza continua.',
            primaryButton: { text: 'Richiedi Consulenza', href: '/contatti', icon: 'ArrowRight' },
            secondaryButton: { text: 'Chiama Ora', href: 'tel:+393516239176', icon: 'Phone' },
            stats: [
                { number: '500+', label: 'Aziende Seguite', icon: 'Building2' },
                { number: '15+', label: 'Anni Esperienza', icon: 'Award' },
                { number: '9', label: 'Macrosettori ATECO', icon: 'Target' },
                { number: '100%', label: 'Conformità', icon: 'Shield' }
            ],
            backgroundVariant: 'gradient',
            trustBadges: [
                { icon: 'Award', text: 'ISO 9001' },
                { icon: 'Shield', text: 'Accreditati' },
                { icon: 'CheckCircle', text: 'Certificati' }
            ]
        },
        services: [
            {
                icon: 'FileText',
                title: 'Documento Valutazione Rischi (DVR)',
                description: 'Redazione e aggiornamento del DVR secondo gli standard più recenti, con metodologie validate e personalizzate per la tua realtà aziendale.',
                features: ['Analisi completa dei rischi', 'Sopralluogo tecnico', 'Piano di miglioramento', 'Aggiornamento periodico', 'Supporto per ispezioni'],
                color: 'blue',
                badge: 'Obbligatorio',
                href: '/contatti'
            },
            {
                icon: 'UserCheck',
                title: 'RSPP Esterno',
                description: 'Servizio di Responsabile del Servizio Prevenzione e Protezione qualificato per tutti i macrosettori ATECO.',
                features: ['Qualifica tutti i settori', 'Sopralluoghi periodici', 'Riunione annuale art. 35', 'Consulenza telefonica', 'Gestione documentazione'],
                color: 'purple',
                badge: 'Premium',
                href: '/rspp'
            },
            {
                icon: 'Stethoscope',
                title: 'Medicina del Lavoro',
                description: 'Sorveglianza sanitaria completa con medico competente aziendale qualificato e gestione digitale delle scadenze.',
                features: ['Visite preventive e periodiche', 'Protocollo personalizzato', 'Esami strumentali', 'Gestione cartelle sanitarie', 'Alert scadenze'],
                color: 'teal',
                badge: 'Certificato',
                href: '/medicina-del-lavoro'
            },
            {
                icon: 'GraduationCap',
                title: 'Formazione Sicurezza',
                description: 'Catalogo completo corsi D.Lgs 81/08 per tutte le figure aziendali, con attestati riconosciuti a livello nazionale.',
                features: ['50+ corsi disponibili', 'Modalità aula/online/blended', 'Docenti qualificati', 'Attestati riconosciuti', 'Formazione in azienda'],
                color: 'green',
                badge: 'Più Richiesto',
                href: '/corsi'
            },
            {
                icon: 'ClipboardCheck',
                title: 'Audit e Verifiche',
                description: 'Audit di conformità per verificare lo stato di adempimento agli obblighi normativi e identificare aree di miglioramento.',
                features: ['Checklist complete', 'Report dettagliato', 'Piano azioni correttive', 'Follow-up periodici', 'Preparazione ispezioni'],
                color: 'orange',
                href: '/contatti'
            },
            {
                icon: 'FileSignature',
                title: 'Gestione Documentale',
                description: 'Organizzazione e gestione di tutta la documentazione sicurezza con archiviazione digitale e alert automatici.',
                features: ['Archivio digitale', 'Scadenzario automatico', 'Notifiche email/SMS', 'Accesso web 24/7', 'Backup sicuro'],
                color: 'indigo',
                href: '/contatti'
            }
        ],
        whyChooseUs: {
            title: 'Perché Affidarsi a Noi',
            description: 'Un partner affidabile per la sicurezza della tua azienda',
            features: [
                { icon: 'Award', title: 'Esperienza Certificata', description: 'Oltre 15 anni nel settore della sicurezza sul lavoro' },
                { icon: 'Users', title: 'Team Multidisciplinare', description: 'Tecnici, formatori, medici competenti qualificati' },
                { icon: 'HeadphonesIcon', title: 'Supporto Continuo', description: 'Assistenza telefonica e consulenza sempre disponibile' },
                { icon: 'Zap', title: 'Risposta Rapida', description: 'Interventi urgenti e attivazione servizi in 48h' },
                { icon: 'Banknote', title: 'Prezzi Chiari', description: 'Preventivi dettagliati senza sorprese' },
                { icon: 'Shield', title: 'Conformità Garantita', description: 'Piena aderenza alle normative vigenti' }
            ]
        },
        cta: {
            title: 'Richiedi una Consulenza Gratuita',
            description: 'I nostri esperti analizzeranno le tue esigenze e ti proporranno la soluzione più adatta.',
            primaryButton: { text: 'Contattaci Ora', href: '/contatti', icon: 'ArrowRight' },
            secondaryButton: { text: 'Vedi i Corsi', href: '/corsi', icon: 'BookOpen' },
            badges: ['✓ Consulenza gratuita', '✓ Preventivo in 24h', '✓ Nessun impegno']
        }
    }
};

async function updateServiziPage() {
    console.log('🔧 Aggiornamento Pagina Servizi...\n');
    try {
        const existingPage = await prisma.cMSPage.findFirst({
            where: { slug: serviziFormazione.slug, tenantId: TENANT_FORMAZIONE, deletedAt: null }
        });

        if (existingPage) {
            await prisma.cMSPage.update({
                where: { id: existingPage.id },
                data: {
                    title: serviziFormazione.title,
                    content: serviziFormazione.content,
                    seoTitle: serviziFormazione.seoTitle,
                    seoDescription: serviziFormazione.seoDescription,
                    status: 'published',
                    isPublished: true,
                    publishedAt: new Date()
                }
            });
            console.log('✅ Pagina Servizi aggiornata');
        } else {
            await prisma.cMSPage.create({
                data: {
                    slug: serviziFormazione.slug,
                    title: serviziFormazione.title,
                    content: serviziFormazione.content,
                    blocks: [],
                    layout: 'full-width',
                    status: 'published',
                    seoTitle: serviziFormazione.seoTitle,
                    seoDescription: serviziFormazione.seoDescription,
                    isPublished: true,
                    publishedAt: new Date(),
                    tenantId: TENANT_FORMAZIONE
                }
            });
            console.log('✅ Pagina Servizi creata');
        }
        console.log('🎉 Completato!');
    } catch (error) {
        console.error('❌ Errore:', error);
    } finally {
        await prisma.$disconnect();
    }
}

updateServiziPage();
