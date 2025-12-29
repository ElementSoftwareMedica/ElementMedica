/**
 * CMS Redesign - Contatti Element Formazione
 * 
 * Eseguire: node backend/scripts/cms-redesign/06-contatti-formazione.js
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const TENANT_FORMAZIONE = 'd2bbc5b0-344c-47c7-8ef5-f57755293372';

const contattiFormazione = {
    slug: 'contatti',
    title: 'Contattaci - Element Formazione',
    seoTitle: 'Contatti Element Formazione | Richiedi Preventivo | Sicurezza Lavoro Padova',
    seoDescription: 'Contatta Element Formazione per informazioni su corsi sicurezza, RSPP, medicina del lavoro. Preventivo gratuito in 24h. Sede a Selvazzano Dentro (Padova).',
    status: 'published',
    layout: 'full-width',
    content: {
        metadata: { layout: 'full-width', theme: 'formazione' },
        hero: {
            title: 'Parliamo della',
            subtitle: 'Sicurezza della Tua Azienda',
            description: 'Siamo qui per aiutarti. Compila il form o contattaci direttamente: ti risponderemo entro 24 ore con una proposta personalizzata.',
            primaryButton: { text: 'Chiama Ora', href: 'tel:+393516239176', icon: 'Phone' },
            secondaryButton: { text: 'Scrivi Email', href: 'mailto:info@elementformazione.it', icon: 'Mail' },
            stats: [
                { number: '24h', label: 'Tempo Risposta', icon: 'Clock' },
                { number: '100%', label: 'Risposte', icon: 'CheckCircle' },
                { number: 'Gratuito', label: 'Preventivo', icon: 'Award' }
            ],
            backgroundVariant: 'gradient'
        },
        contactInfo: {
            address: {
                label: 'Sede Operativa',
                value: 'Via Bracciano 34\n35030 Selvazzano Dentro (PD)',
                badge: 'Sede Principale'
            },
            phones: [
                { label: 'Telefono', number: '+39 351 623 9176', icon: 'Phone' },
                { label: 'WhatsApp', number: '+39 351 623 9176', icon: 'MessageCircle' }
            ],
            emails: [
                { label: 'Info Generali', address: 'info@elementformazione.it' },
                { label: 'Preventivi', address: 'preventivi@elementformazione.it' }
            ],
            hours: {
                weekdays: 'Lun - Ven: 9:00 - 18:00',
                saturday: 'Sab: Su appuntamento',
                sunday: 'Dom: Chiuso'
            }
        },
        contactForm: {
            title: 'Richiedi Informazioni',
            description: 'Compila il form e riceverai una risposta personalizzata entro 24 ore lavorative.',
            showCompanyField: true,
            showPhoneField: true,
            showSubjectField: true,
            subjects: [
                { value: 'corsi', label: 'Informazioni Corsi di Formazione' },
                { value: 'rspp', label: 'Servizio RSPP Esterno' },
                { value: 'medicina', label: 'Medicina del Lavoro' },
                { value: 'dvr', label: 'DVR e Valutazione Rischi' },
                { value: 'preventivo', label: 'Richiesta Preventivo' },
                { value: 'altro', label: 'Altro' }
            ]
        },
        faq: {
            title: 'Domande Frequenti',
            items: [
                {
                    question: 'Quanto tempo ci vuole per ricevere un preventivo?',
                    answer: 'Rispondiamo a tutte le richieste entro 24 ore lavorative. Per richieste urgenti, chiamaci direttamente.'
                },
                {
                    question: 'Fate consulenze in tutta Italia?',
                    answer: 'Operiamo principalmente in Veneto e regioni limitrofe. Per la formazione online e alcuni servizi siamo disponibili su tutto il territorio nazionale.'
                },
                {
                    question: 'È possibile fissare un appuntamento?',
                    answer: 'Certamente! Puoi prenotare un appuntamento in sede o richiedere una videochiamata compilando il form o chiamandoci.'
                },
                {
                    question: 'Offrite consulenze gratuite?',
                    answer: 'Sì, la prima consulenza per analizzare le tue esigenze è sempre gratuita e senza impegno.'
                }
            ]
        },
        cta: {
            title: 'Preferisci Parlare con un Esperto?',
            description: 'Chiama ora e parla direttamente con un nostro consulente per ricevere assistenza immediata.',
            primaryButton: { text: 'Chiama +39 351 623 9176', href: 'tel:+393516239176', icon: 'Phone' },
            secondaryButton: { text: 'Scrivi su WhatsApp', href: 'https://wa.me/393516239176', icon: 'MessageCircle' },
            badges: ['✓ Risposta immediata', '✓ Consulenza gratuita', '✓ Esperti disponibili']
        }
    }
};

async function updateContattiPage() {
    console.log('📞 Aggiornamento Pagina Contatti...\n');
    try {
        const existingPage = await prisma.cMSPage.findFirst({
            where: { slug: contattiFormazione.slug, tenantId: TENANT_FORMAZIONE, deletedAt: null }
        });

        if (existingPage) {
            await prisma.cMSPage.update({
                where: { id: existingPage.id },
                data: {
                    title: contattiFormazione.title,
                    content: contattiFormazione.content,
                    seoTitle: contattiFormazione.seoTitle,
                    seoDescription: contattiFormazione.seoDescription,
                    status: 'published',
                    isPublished: true,
                    publishedAt: new Date()
                }
            });
            console.log('✅ Pagina Contatti aggiornata');
        } else {
            await prisma.cMSPage.create({
                data: {
                    slug: contattiFormazione.slug,
                    title: contattiFormazione.title,
                    content: contattiFormazione.content,
                    blocks: [],
                    layout: 'full-width',
                    status: 'published',
                    seoTitle: contattiFormazione.seoTitle,
                    seoDescription: contattiFormazione.seoDescription,
                    isPublished: true,
                    publishedAt: new Date(),
                    tenantId: TENANT_FORMAZIONE
                }
            });
            console.log('✅ Pagina Contatti creata');
        }
        console.log('🎉 Completato!');
    } catch (error) {
        console.error('❌ Errore:', error);
    } finally {
        await prisma.$disconnect();
    }
}

updateContattiPage();
