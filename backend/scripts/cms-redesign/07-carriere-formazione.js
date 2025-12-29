/**
 * CMS Redesign - Carriere Element Formazione
 * 
 * Eseguire: node backend/scripts/cms-redesign/07-carriere-formazione.js
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const TENANT_FORMAZIONE = 'd2bbc5b0-344c-47c7-8ef5-f57755293372';

const carriereFormazione = {
    slug: 'carriere',
    title: 'Lavora con Noi - Element Formazione',
    seoTitle: 'Lavora con Noi | Carriere Element Formazione | Posizioni Aperte Sicurezza Lavoro',
    seoDescription: 'Unisciti al team Element Formazione. Cerchiamo formatori, consulenti sicurezza, medici del lavoro. Ambiente dinamico, formazione continua, crescita professionale.',
    status: 'published',
    layout: 'full-width',
    content: {
        metadata: { layout: 'full-width', theme: 'formazione' },
        hero: {
            title: 'Costruisci il Futuro',
            subtitle: 'della Sicurezza sul Lavoro',
            description: 'Unisciti a un team di professionisti appassionati. In Element Formazione valorizziamo il talento e investiamo nella crescita delle nostre persone.',
            primaryButton: { text: 'Vedi Posizioni Aperte', href: '#posizioni', icon: 'ArrowRight' },
            secondaryButton: { text: 'Candidatura Spontanea', href: '/contatti', icon: 'Send' },
            stats: [
                { number: '25+', label: 'Collaboratori', icon: 'Users' },
                { number: '15+', label: 'Anni di Storia', icon: 'Calendar' },
                { number: '98%', label: 'Soddisfazione Team', icon: 'Heart' }
            ],
            backgroundVariant: 'gradient'
        },
        whyWorkWithUs: {
            title: 'Perché Lavorare con Noi',
            description: 'Un ambiente che valorizza le persone e investe nel loro sviluppo professionale',
            benefits: [
                { icon: '📈', title: 'Crescita Professionale', description: 'Percorsi di carriera chiari e formazione continua su competenze tecniche e soft skills' },
                { icon: '⚖️', title: 'Work-Life Balance', description: 'Flessibilità oraria, smart working e rispetto del tempo personale' },
                { icon: '🎓', title: 'Formazione Continua', description: 'Accesso gratuito a tutti i nostri corsi e budget annuale per formazione esterna' },
                { icon: '🤝', title: 'Team Collaborativo', description: 'Ambiente di lavoro positivo, collaborazione e supporto reciproco' },
                { icon: '💰', title: 'Retribuzione Equa', description: 'Stipendi competitivi, bonus performance e benefit aziendali' },
                { icon: '🌱', title: 'Impatto Sociale', description: 'Lavoro con significato: contribuisci a rendere i luoghi di lavoro più sicuri' }
            ]
        },
        openPositions: [
            {
                title: 'Formatore Sicurezza sul Lavoro',
                location: 'Padova / Ibrido',
                type: 'Full-time',
                description: 'Cerchiamo un formatore esperto per erogare corsi D.Lgs 81/08 presso la nostra sede e le aziende clienti.',
                requirements: [
                    'Requisiti formatore D.I. 6 marzo 2013',
                    'Esperienza minima 3 anni nella formazione',
                    'Conoscenza normativa sicurezza lavoro',
                    'Ottime capacità comunicative',
                    'Disponibilità trasferte regionali'
                ]
            },
            {
                title: 'Consulente RSPP',
                location: 'Padova / Ibrido',
                type: 'Full-time',
                description: 'Consulente per servizio RSPP esterno, redazione DVR e supporto alla conformità normativa.',
                requirements: [
                    'Laurea in discipline tecniche/scientifiche',
                    'Abilitazione RSPP moduli A, B, C',
                    'Esperienza minima 2 anni',
                    'Capacità di gestione autonoma clienti',
                    'Patente B e auto propria'
                ]
            },
            {
                title: 'Medico Competente',
                location: 'Padova e Provincia',
                type: 'Collaborazione',
                description: 'Medico del lavoro per servizi di sorveglianza sanitaria aziendale.',
                requirements: [
                    'Specializzazione medicina del lavoro',
                    'Iscrizione elenco medici competenti',
                    'Esperienza pregressa',
                    'Disponibilità visite in azienda',
                    'Flessibilità oraria'
                ]
            }
        ],
        applicationProcess: {
            title: 'Come Candidarsi',
            steps: [
                { number: '01', title: 'Invia CV', description: 'Compila il form con i tuoi dati e allega il curriculum vitae aggiornato' },
                { number: '02', title: 'Screening', description: 'Valutiamo il tuo profilo e ti contattiamo entro 7 giorni lavorativi' },
                { number: '03', title: 'Colloquio', description: 'Incontro conoscitivo per approfondire competenze e aspettative' },
                { number: '04', title: 'Proposta', description: 'Se c\'è match, riceverai la nostra proposta di collaborazione' }
            ]
        },
        cta: {
            title: 'Non Trovi la Posizione Giusta?',
            description: 'Inviaci comunque la tua candidatura spontanea. Siamo sempre interessati a conoscere professionisti motivati.',
            primaryButton: { text: 'Candidatura Spontanea', href: '/contatti', icon: 'Send' },
            secondaryButton: { text: 'Scopri di Più su di Noi', href: '/', icon: 'ArrowRight' },
            badges: ['✓ Rispondiamo a tutti', '✓ Feedback in 7 giorni', '✓ Colloquio informale']
        }
    }
};

async function updateCarrierePage() {
    console.log('👔 Aggiornamento Pagina Carriere...\n');
    try {
        const existingPage = await prisma.cMSPage.findFirst({
            where: { slug: carriereFormazione.slug, tenantId: TENANT_FORMAZIONE, deletedAt: null }
        });

        if (existingPage) {
            await prisma.cMSPage.update({
                where: { id: existingPage.id },
                data: {
                    title: carriereFormazione.title,
                    content: carriereFormazione.content,
                    seoTitle: carriereFormazione.seoTitle,
                    seoDescription: carriereFormazione.seoDescription,
                    status: 'published',
                    isPublished: true,
                    publishedAt: new Date()
                }
            });
            console.log('✅ Pagina Carriere aggiornata');
        } else {
            await prisma.cMSPage.create({
                data: {
                    slug: carriereFormazione.slug,
                    title: carriereFormazione.title,
                    content: carriereFormazione.content,
                    blocks: [],
                    layout: 'full-width',
                    status: 'published',
                    seoTitle: carriereFormazione.seoTitle,
                    seoDescription: carriereFormazione.seoDescription,
                    isPublished: true,
                    publishedAt: new Date(),
                    tenantId: TENANT_FORMAZIONE
                }
            });
            console.log('✅ Pagina Carriere creata');
        }
        console.log('🎉 Completato!');
    } catch (error) {
        console.error('❌ Errore:', error);
    } finally {
        await prisma.$disconnect();
    }
}

updateCarrierePage();
