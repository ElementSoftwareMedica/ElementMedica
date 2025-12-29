/**
 * Script 03: RSPP Element Formazione - Premium Redesign
 * Eseguire: node backend/scripts/cms-redesign/03-rspp-formazione.js
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const TENANT_FORMAZIONE = 'd2bbc5b0-344c-47c7-8ef5-f57755293372';

const rsppContent = {
    metadata: {
        layout: 'full-width',
        theme: 'formazione',
        version: '2.0'
    },

    hero: {
        badge: { text: '🛡️ Tutti i Macrosettori ATECO', variant: 'premium' },
        title: 'Servizio RSPP Esterno',
        subtitle: 'Responsabile Sicurezza Qualificato',
        description: 'Affida la sicurezza della tua azienda a professionisti esperti. Servizio RSPP completo con DVR, consulenza continua e conformità normativa garantita.',
        primaryButton: { text: 'Richiedi Preventivo', href: '/contatti', icon: 'ArrowRight' },
        secondaryButton: { text: 'Scopri il Servizio', href: '#servizio' },
        stats: [
            { number: '200+', label: 'Aziende Seguite', icon: 'Building2' },
            { number: '9', label: 'Macrosettori ATECO', icon: 'Grid3X3' },
            { number: '15+', label: 'Anni Esperienza', icon: 'Award' },
            { number: '100%', label: 'Conformità', icon: 'Shield' }
        ],
        trustBadges: [
            { icon: 'Award', text: 'RSPP Qualificati' },
            { icon: 'FileCheck', text: 'DVR Completo' },
            { icon: 'HeadphonesIcon', text: 'Supporto Continuo' }
        ],
        backgroundVariant: 'gradient-premium'
    },

    whatIsRSPP: {
        sectionTitle: 'Cos\'è l\'RSPP?',
        backgroundVariant: 'white',
        content: 'Il Responsabile del Servizio di Prevenzione e Protezione (RSPP) è la figura professionale incaricata dal datore di lavoro per coordinare il sistema di prevenzione e protezione dai rischi. È una figura obbligatoria per tutte le aziende con almeno un lavoratore.',
        keyPoints: [
            {
                icon: 'Scale',
                title: 'Obbligo di Legge',
                description: 'Ogni azienda deve avere un RSPP nominato (art. 17 D.Lgs 81/08). La mancata nomina comporta sanzioni da €2.500 a €6.400 e responsabilità penali.'
            },
            {
                icon: 'UserCog',
                title: 'Chi può fare l\'RSPP?',
                description: 'Può essere interno (dipendente formato), esterno (consulente qualificato) o il datore di lavoro stesso (con limitazioni e formazione specifica).'
            },
            {
                icon: 'Shield',
                title: 'Perché RSPP Esterno?',
                description: 'L\'RSPP esterno garantisce competenza certificata, aggiornamento costante e visione imparziale. Ideale per PMI senza risorse interne dedicate.'
            }
        ],
        comparison: {
            title: 'RSPP Interno vs Esterno',
            internal: {
                title: 'RSPP Interno',
                pros: ['Presenza costante', 'Conoscenza diretta'],
                cons: ['Costo formazione', 'Aggiornamento continuo', 'Possibili conflitti']
            },
            external: {
                title: 'RSPP Esterno',
                pros: ['Competenza certificata', 'Visione imparziale', 'Sempre aggiornato', 'Responsabilità condivisa'],
                cons: ['Presenza su richiesta']
            }
        }
    },

    serviceIncludes: {
        sectionTitle: 'Cosa Include il Nostro Servizio RSPP',
        sectionSubtitle: 'Un pacchetto completo per la gestione della sicurezza aziendale',
        backgroundVariant: 'gradient-mesh',
        services: [
            {
                icon: 'FileText',
                title: 'DVR - Documento Valutazione Rischi',
                description: 'Redazione e aggiornamento completo del Documento di Valutazione dei Rischi.',
                included: [
                    'Analisi rischi generici e specifici',
                    'Valutazione stress lavoro-correlato',
                    'Valutazione rischio chimico',
                    'Valutazione rumore e vibrazioni',
                    'Valutazione MMC e movimenti ripetitivi',
                    'Valutazione rischio incendio',
                    'Aggiornamenti periodici'
                ],
                highlight: true
            },
            {
                icon: 'Building',
                title: 'Sopralluoghi Aziendali',
                description: 'Visite periodiche per verificare l\'applicazione delle misure di prevenzione.',
                included: [
                    'Sopralluoghi programmati',
                    'Verifica conformità luoghi di lavoro',
                    'Controllo attrezzature',
                    'Verifica DPI',
                    'Report con osservazioni',
                    'Piano di miglioramento'
                ]
            },
            {
                icon: 'Users',
                title: 'Riunione Periodica',
                description: 'Organizzazione e partecipazione alla riunione annuale art. 35 D.Lgs 81/08.',
                included: [
                    'Convocazione partecipanti',
                    'Preparazione documentazione',
                    'Conduzione riunione',
                    'Verbale con decisioni',
                    'Follow-up azioni'
                ]
            },
            {
                icon: 'GraduationCap',
                title: 'Piano Formativo',
                description: 'Definizione e gestione del piano di formazione aziendale sulla sicurezza.',
                included: [
                    'Analisi fabbisogni formativi',
                    'Piano formativo annuale',
                    'Gestione scadenze',
                    'Coordinamento corsi',
                    'Verifica attestati'
                ]
            },
            {
                icon: 'AlertTriangle',
                title: 'Gestione Emergenze',
                description: 'Predisposizione del piano di emergenza e delle procedure operative.',
                included: [
                    'Piano di emergenza ed evacuazione',
                    'Planimetrie con vie di fuga',
                    'Procedure operative',
                    'Designazione addetti',
                    'Prove di evacuazione'
                ]
            },
            {
                icon: 'HeadphonesIcon',
                title: 'Consulenza Continua',
                description: 'Supporto costante per qualsiasi esigenza relativa alla sicurezza.',
                included: [
                    'Assistenza telefonica',
                    'Risposta email 24h',
                    'Pareri su modifiche',
                    'Supporto ispezioni',
                    'Aggiornamento normativo'
                ]
            }
        ]
    },

    macrosettori: {
        sectionTitle: 'Macrosettori ATECO Coperti',
        sectionSubtitle: 'I nostri RSPP sono abilitati per tutti i settori di attività',
        backgroundVariant: 'light-pattern',
        description: 'L\'Accordo Stato-Regioni classifica le attività in macrosettori con diversi livelli di rischio. Forniamo RSPP qualificati per ogni settore.',
        sectors: [
            { code: '1', name: 'Agricoltura, Silvicoltura e Pesca', risk: 'ALTO', examples: 'Aziende agricole, forestali, pesca' },
            { code: '2', name: 'Estrazioni Minerali', risk: 'ALTO', examples: 'Cave, miniere, perforazioni' },
            { code: '3', name: 'Costruzioni', risk: 'ALTO', examples: 'Edilizia, impiantistica, ristrutturazioni' },
            { code: '4', name: 'Industrie Manifatturiere', risk: 'VARIABILE', examples: 'Metalmeccanica, chimica, alimentare' },
            { code: '5', name: 'Energia e Gas', risk: 'ALTO', examples: 'Produzione energia, distribuzione gas' },
            { code: '6', name: 'Commercio e Artigianato', risk: 'BASSO-MEDIO', examples: 'Negozi, officine, laboratori' },
            { code: '7', name: 'Sanità e Servizi Sociali', risk: 'MEDIO-ALTO', examples: 'Ospedali, RSA, ambulatori' },
            { code: '8', name: 'Pubblica Amministrazione', risk: 'BASSO', examples: 'Uffici pubblici, scuole' },
            { code: '9', name: 'Altri Servizi', risk: 'VARIABILE', examples: 'Uffici, trasporti, servizi' }
        ]
    },

    responsibilities: {
        sectionTitle: 'Compiti dell\'RSPP',
        backgroundVariant: 'white',
        description: 'L\'art. 33 del D.Lgs 81/08 definisce i compiti del Responsabile del Servizio di Prevenzione e Protezione:',
        tasks: [
            {
                icon: 'Search',
                title: 'Individuazione Rischi',
                description: 'Identificare i fattori di rischio presenti negli ambienti di lavoro'
            },
            {
                icon: 'ClipboardList',
                title: 'Valutazione Rischi',
                description: 'Collaborare alla valutazione dei rischi con datore e medico competente'
            },
            {
                icon: 'Lightbulb',
                title: 'Misure Preventive',
                description: 'Proporre misure di prevenzione e protezione adeguate ai rischi'
            },
            {
                icon: 'FileText',
                title: 'Procedure Sicurezza',
                description: 'Elaborare procedure operative per le varie attività aziendali'
            },
            {
                icon: 'PresentationChart',
                title: 'Informazione',
                description: 'Proporre programmi di informazione, formazione e addestramento'
            },
            {
                icon: 'Users',
                title: 'Riunione Periodica',
                description: 'Partecipare alla riunione periodica sulla sicurezza'
            }
        ],
        note: 'L\'RSPP non ha poteri decisionali autonomi né di spesa. Le decisioni spettano al datore di lavoro che rimane il responsabile ultimo della sicurezza.'
    },

    pricing: {
        sectionTitle: 'Quanto Costa il Servizio RSPP?',
        backgroundVariant: 'gradient-subtle',
        description: 'Il costo del servizio RSPP esterno dipende da diversi fattori:',
        factors: [
            { icon: 'Users', factor: 'Numero dipendenti', impact: 'Maggiore complessità organizzativa' },
            { icon: 'Factory', factor: 'Settore attività', impact: 'Livello di rischio specifico' },
            { icon: 'Building', factor: 'Numero sedi', impact: 'Sopralluoghi e documentazione multipli' },
            { icon: 'Calendar', factor: 'Frequenza sopralluoghi', impact: 'Mensile, trimestrale, semestrale' },
            { icon: 'FileStack', factor: 'Complessità DVR', impact: 'Valutazioni specifiche richieste' }
        ],
        packages: [
            {
                name: 'Base',
                suitable: 'Uffici e attività a basso rischio',
                employees: '< 10 dipendenti',
                features: ['DVR base', '2 sopralluoghi/anno', 'Consulenza telefonica', 'Riunione periodica']
            },
            {
                name: 'Standard',
                suitable: 'PMI settori vari',
                employees: '10-50 dipendenti',
                features: ['DVR completo', '4 sopralluoghi/anno', 'Consulenza prioritaria', 'Piano formativo', 'Gestione emergenze'],
                recommended: true
            },
            {
                name: 'Premium',
                suitable: 'Aziende strutturate',
                employees: '> 50 dipendenti',
                features: ['DVR dettagliato', 'Sopralluoghi mensili', 'Referente dedicato', 'Supporto ispezioni', 'Audit interni']
            }
        ],
        cta: 'Contattaci per un preventivo personalizzato senza impegno'
    },

    sanctions: {
        sectionTitle: 'Sanzioni per Mancata Nomina RSPP',
        backgroundVariant: 'light',
        description: 'La mancata nomina del RSPP comporta sanzioni severe per il datore di lavoro:',
        penalties: [
            {
                type: 'Sanzione Amministrativa',
                amount: '€2.500 - €6.400',
                description: 'Per mancata nomina o nomina di soggetto non qualificato'
            },
            {
                type: 'Responsabilità Penale',
                amount: 'Arresto da 3 a 6 mesi',
                description: 'In caso di infortunio grave con omissione degli obblighi'
            },
            {
                type: 'Sospensione Attività',
                amount: 'Provvedimento ASL',
                description: 'L\'organo di vigilanza può sospendere l\'attività'
            }
        ],
        warning: 'Non rischiare sanzioni e responsabilità. Affidati a professionisti qualificati.'
    },

    faq: {
        sectionTitle: 'Domande Frequenti sull\'RSPP',
        backgroundVariant: 'white',
        items: [
            {
                question: 'Posso fare l\'RSPP della mia azienda?',
                answer: 'Sì, il datore di lavoro può assumere il ruolo di RSPP in aziende fino a 30 dipendenti (200 in agricoltura/zootecnia) previa frequenza di corso specifico. Per aziende più grandi o a rischio elevato è necessario un RSPP qualificato.'
            },
            {
                question: 'Quali requisiti deve avere l\'RSPP?',
                answer: 'L\'RSPP deve possedere almeno un diploma di scuola superiore e aver frequentato i moduli A, B (specifico per settore) e C previsti dall\'Accordo Stato-Regioni, con aggiornamento quinquennale.'
            },
            {
                question: 'L\'RSPP esterno può essere sanzionato?',
                answer: 'L\'RSPP ha responsabilità penali in caso di consulenza errata o omissioni colpose che causino infortuni. Per questo forniamo copertura assicurativa professionale.'
            },
            {
                question: 'Quanto tempo serve per attivare il servizio?',
                answer: 'Il servizio può essere attivato in 5-7 giorni lavorativi. In caso di urgenza (ispezioni, nuova attività) possiamo accelerare i tempi.'
            },
            {
                question: 'Cosa succede se cambio RSPP?',
                answer: 'È necessario revocare la nomina precedente, nominare il nuovo RSPP e comunicare la variazione. Vi assistiamo in tutto il processo di transizione.'
            },
            {
                question: 'L\'RSPP deve essere sempre presente in azienda?',
                answer: 'No, l\'RSPP esterno effettua sopralluoghi periodici e fornisce consulenza continuativa. Non è richiesta la presenza costante, ma la reperibilità per le esigenze aziendali.'
            }
        ]
    },

    cta: {
        backgroundVariant: 'gradient-premium',
        title: 'Affida la Sicurezza a Professionisti Qualificati',
        subtitle: 'Servizio RSPP completo e conformità garantita',
        description: 'Richiedi un preventivo personalizzato. Analizzeremo le tue esigenze e ti proporremo la soluzione più adatta.',
        primaryButton: { text: 'Richiedi Preventivo Gratuito', href: '/contatti', icon: 'ArrowRight' },
        secondaryButton: { text: 'Chiama: +39 351 623 9176', href: 'tel:+393516239176', icon: 'Phone' },
        badges: [
            '✓ RSPP Certificati',
            '✓ Tutti i Macrosettori',
            '✓ Attivazione Rapida'
        ]
    }
};

async function updateRSPP() {
    console.log('🛡️ Aggiornamento RSPP - Element Formazione...\n');

    try {
        const page = await prisma.cMSPage.findFirst({
            where: { slug: 'rspp', tenantId: TENANT_FORMAZIONE }
        });

        if (!page) {
            console.log('❌ Pagina non trovata');
            return;
        }

        await prisma.cMSPage.update({
            where: { id: page.id },
            data: {
                title: 'Servizio RSPP Esterno - Element Formazione',
                content: rsppContent,
                seoTitle: 'RSPP Esterno Padova | Responsabile Sicurezza Aziendale | DVR | Element Formazione',
                seoDescription: 'Servizio RSPP esterno qualificato per tutti i macrosettori ATECO. DVR completo, consulenza continua, sopralluoghi, gestione sicurezza aziendale. Conformità D.Lgs 81/08.',
                updatedAt: new Date()
            }
        });

        console.log('✅ Pagina aggiornata con successo!');
        console.log('   - Sezioni: ' + Object.keys(rsppContent).length);

    } catch (error) {
        console.error('❌ Errore:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

updateRSPP();
