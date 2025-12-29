/**
 * Script 02: Medicina del Lavoro Element Formazione - Premium Redesign
 * Eseguire: node backend/scripts/cms-redesign/02-medicina-lavoro-formazione.js
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const TENANT_FORMAZIONE = 'd2bbc5b0-344c-47c7-8ef5-f57755293372';

const medicinaLavoroContent = {
    metadata: {
        layout: 'full-width',
        theme: 'formazione',
        version: '2.0',
        lastUpdate: new Date().toISOString()
    },

    hero: {
        badge: { text: '🏥 Servizio Completo D.Lgs 81/08', variant: 'medical' },
        title: 'Medicina del Lavoro',
        subtitle: 'per la Tua Azienda',
        description: 'Sorveglianza sanitaria professionale con medici competenti specializzati. Protocolli personalizzati, gestione digitale e conformità garantita.',
        primaryButton: { text: 'Richiedi Preventivo', href: '/contatti', icon: 'ArrowRight' },
        secondaryButton: { text: 'Chiama Ora', href: 'tel:+393516239176', icon: 'Phone' },
        stats: [
            { number: '300+', label: 'Aziende Servite', icon: 'Building2' },
            { number: '8.000+', label: 'Visite/Anno', icon: 'Stethoscope' },
            { number: '48h', label: 'Attivazione', icon: 'Clock' },
            { number: '100%', label: 'Conformità', icon: 'Shield' }
        ],
        trustBadges: [
            { icon: 'Award', text: 'Medici Specializzati' },
            { icon: 'Shield', text: 'D.Lgs 81/08 Compliant' },
            { icon: 'FileCheck', text: 'Cartelle Digitali' }
        ],
        backgroundVariant: 'medical-gradient'
    },

    introduction: {
        backgroundVariant: 'white',
        title: 'Cos\'è la Medicina del Lavoro?',
        content: 'La medicina del lavoro è una branca specialistica che si occupa della prevenzione, diagnosi e cura delle malattie professionali e degli infortuni sul lavoro. Il D.Lgs 81/08 impone ai datori di lavoro l\'obbligo di sottoporre i lavoratori esposti a rischi specifici a sorveglianza sanitaria.',
        highlights: [
            {
                icon: 'Scale',
                title: 'Obbligo di Legge',
                description: 'La sorveglianza sanitaria è obbligatoria per i lavoratori esposti a rischi specifici (art. 41 D.Lgs 81/08)'
            },
            {
                icon: 'Shield',
                title: 'Tutela del Lavoratore',
                description: 'Verifica l\'idoneità alla mansione specifica e protegge la salute del lavoratore'
            },
            {
                icon: 'FileCheck',
                title: 'Responsabilità Datoriale',
                description: 'Il datore di lavoro deve nominare il medico competente e attuare la sorveglianza'
            }
        ]
    },

    services: {
        sectionTitle: 'I Nostri Servizi di Medicina del Lavoro',
        sectionSubtitle: 'Copertura completa per tutte le esigenze di sorveglianza sanitaria',
        backgroundVariant: 'gradient-mesh',
        items: [
            {
                icon: 'Stethoscope',
                title: 'Visite Mediche',
                description: 'Visite preventive, periodiche, su richiesta, per cambio mansione e al rientro da malattia prolungata.',
                details: [
                    { label: 'Visita Pre-assuntiva', desc: 'Prima dell\'assunzione per verificare l\'idoneità' },
                    { label: 'Visita Periodica', desc: 'Controlli regolari secondo il protocollo' },
                    { label: 'Visita Straordinaria', desc: 'Su richiesta del lavoratore o del datore' },
                    { label: 'Cambio Mansione', desc: 'Verifica idoneità per nuova mansione' },
                    { label: 'Rientro Malattia', desc: 'Dopo assenza >60 giorni continuativi' }
                ],
                color: 'teal'
            },
            {
                icon: 'UserCheck',
                title: 'Medico Competente',
                description: 'Nomina del medico competente aziendale con tutti gli adempimenti previsti dalla normativa.',
                details: [
                    { label: 'Nomina Formale', desc: 'Atto di nomina conforme alla legge' },
                    { label: 'Sopralluoghi', desc: 'Visite periodiche agli ambienti di lavoro' },
                    { label: 'Protocollo Sanitario', desc: 'Definizione personalizzata per l\'azienda' },
                    { label: 'Riunione Periodica', desc: 'Partecipazione art. 35 D.Lgs 81/08' },
                    { label: 'Consulenza DVR', desc: 'Collaborazione per valutazione rischi' }
                ],
                color: 'blue'
            },
            {
                icon: 'Activity',
                title: 'Esami Strumentali',
                description: 'Diagnostica completa con strumentazione certificata e personale qualificato.',
                details: [
                    { label: 'Spirometria', desc: 'Valutazione funzionalità respiratoria' },
                    { label: 'Audiometria', desc: 'Test dell\'udito per esposti al rumore' },
                    { label: 'Visiotest', desc: 'Controllo vista per videoterminalisti' },
                    { label: 'ECG', desc: 'Elettrocardiogramma a riposo' },
                    { label: 'Esami Ematici', desc: 'Analisi del sangue e tossicologiche' }
                ],
                color: 'purple'
            },
            {
                icon: 'Syringe',
                title: 'Vaccinazioni',
                description: 'Programmi vaccinali per lavoratori esposti a rischi biologici specifici.',
                details: [
                    { label: 'Antitetanica', desc: 'Obbligatoria per molte categorie' },
                    { label: 'Epatite B', desc: 'Per operatori sanitari e a rischio' },
                    { label: 'Epatite A', desc: 'Per addetti settore alimentare' },
                    { label: 'Antinfluenzale', desc: 'Campagna stagionale aziendale' },
                    { label: 'Anti-COVID', desc: 'Secondo protocolli vigenti' }
                ],
                color: 'orange'
            }
        ]
    },

    whenRequired: {
        sectionTitle: 'Quando è Obbligatoria la Sorveglianza Sanitaria?',
        backgroundVariant: 'light-pattern',
        description: 'La sorveglianza sanitaria è obbligatoria quando i lavoratori sono esposti a specifici fattori di rischio:',
        risks: [
            {
                icon: 'Volume2',
                title: 'Rumore',
                description: 'Esposizione a livelli > 80 dB(A)',
                threshold: 'LEX,8h > 80 dB(A)'
            },
            {
                icon: 'Monitor',
                title: 'Videoterminali',
                description: 'Utilizzo sistematico per 20+ ore/settimana',
                threshold: '≥ 20 ore/settimana'
            },
            {
                icon: 'FlaskConical',
                title: 'Agenti Chimici',
                description: 'Esposizione a sostanze pericolose',
                threshold: 'Rischio non irrilevante'
            },
            {
                icon: 'Dumbbell',
                title: 'Movimentazione Carichi',
                description: 'Sollevamento pesi e movimenti ripetitivi',
                threshold: 'NIOSH > 1 o OCRA > 2.2'
            },
            {
                icon: 'Vibrate',
                title: 'Vibrazioni',
                description: 'Esposizione a vibrazioni mano-braccio o corpo intero',
                threshold: 'A(8) > valori d\'azione'
            },
            {
                icon: 'Bug',
                title: 'Agenti Biologici',
                description: 'Esposizione a virus, batteri, funghi',
                threshold: 'Gruppo 2, 3 o 4'
            },
            {
                icon: 'Moon',
                title: 'Lavoro Notturno',
                description: 'Prestazioni in orario notturno regolare',
                threshold: '≥ 3 ore/notte per 80 gg/anno'
            },
            {
                icon: 'Car',
                title: 'Guida Veicoli',
                description: 'Conducenti mezzi aziendali',
                threshold: 'Autisti professionali'
            }
        ]
    },

    medicalExam: {
        sectionTitle: 'Il Giudizio di Idoneità',
        backgroundVariant: 'white',
        description: 'Al termine della visita medica, il medico competente esprime un giudizio di idoneità alla mansione specifica:',
        judgments: [
            {
                type: 'IDONEO',
                color: 'green',
                description: 'Il lavoratore può svolgere la mansione senza limitazioni',
                icon: 'CheckCircle'
            },
            {
                type: 'IDONEO CON PRESCRIZIONI',
                color: 'yellow',
                description: 'Idoneità condizionata all\'uso di DPI specifici o limitazioni',
                icon: 'AlertCircle'
            },
            {
                type: 'IDONEO CON LIMITAZIONI',
                color: 'orange',
                description: 'Alcune attività della mansione non possono essere svolte',
                icon: 'AlertTriangle'
            },
            {
                type: 'NON IDONEO TEMPORANEO',
                color: 'red',
                description: 'Inidoneità per un periodo definito, con rivalutazione',
                icon: 'Clock'
            },
            {
                type: 'NON IDONEO PERMANENTE',
                color: 'gray',
                description: 'Il lavoratore deve essere adibito ad altra mansione',
                icon: 'XCircle'
            }
        ],
        note: 'Il lavoratore può fare ricorso contro il giudizio entro 30 giorni all\'organo di vigilanza territorialmente competente.'
    },

    process: {
        sectionTitle: 'Come Attiviamo il Servizio',
        backgroundVariant: 'gradient-subtle',
        steps: [
            {
                number: '01',
                title: 'Analisi Esigenze',
                description: 'Studiamo il DVR e identifichiamo i lavoratori da sottoporre a sorveglianza e i rischi specifici.',
                icon: 'FileSearch',
                duration: '1-2 giorni'
            },
            {
                number: '02',
                title: 'Protocollo Sanitario',
                description: 'Il medico competente definisce esami e periodicità per ogni mansione/rischio.',
                icon: 'ClipboardList',
                duration: '2-3 giorni'
            },
            {
                number: '03',
                title: 'Pianificazione',
                description: 'Organizziamo il calendario visite in base alle vostre esigenze operative.',
                icon: 'Calendar',
                duration: '1 giorno'
            },
            {
                number: '04',
                title: 'Esecuzione Visite',
                description: 'Visite presso la nostra sede o la vostra azienda con strumentazione completa.',
                icon: 'Stethoscope',
                duration: 'Variabile'
            },
            {
                number: '05',
                title: 'Gestione Continua',
                description: 'Monitoriamo scadenze, aggiorniamo cartelle e vi avvisiamo automaticamente.',
                icon: 'RefreshCw',
                duration: 'Continuo'
            }
        ]
    },

    advantages: {
        sectionTitle: 'Vantaggi del Nostro Servizio',
        backgroundVariant: 'white',
        items: [
            {
                icon: 'Zap',
                title: 'Attivazione Rapida',
                description: 'Servizio operativo in 48 ore dalla richiesta'
            },
            {
                icon: 'MapPin',
                title: 'Visite in Azienda',
                description: 'Il medico viene presso la vostra sede'
            },
            {
                icon: 'FileDigit',
                title: 'Cartelle Digitali',
                description: 'Gestione documentale completamente informatizzata'
            },
            {
                icon: 'Bell',
                title: 'Promemoria Automatici',
                description: 'Notifiche per scadenze visite e documenti'
            },
            {
                icon: 'HeadphonesIcon',
                title: 'Referente Dedicato',
                description: 'Un unico interlocutore per tutte le esigenze'
            },
            {
                icon: 'Banknote',
                title: 'Prezzi Trasparenti',
                description: 'Tariffe chiare senza costi nascosti'
            }
        ]
    },

    normativa: {
        sectionTitle: 'Riferimenti Normativi',
        backgroundVariant: 'light',
        articles: [
            {
                code: 'Art. 41',
                title: 'Sorveglianza Sanitaria',
                description: 'Definisce quando e come deve essere effettuata la sorveglianza sanitaria',
                link: '#'
            },
            {
                code: 'Art. 38',
                title: 'Medico Competente',
                description: 'Requisiti professionali e titoli per svolgere il ruolo',
                link: '#'
            },
            {
                code: 'Art. 25',
                title: 'Obblighi MC',
                description: 'Compiti e responsabilità del medico competente',
                link: '#'
            },
            {
                code: 'Art. 18',
                title: 'Obblighi Datore',
                description: 'Obblighi del datore di lavoro in materia di sorveglianza',
                link: '#'
            }
        ]
    },

    faq: {
        sectionTitle: 'Domande Frequenti sulla Medicina del Lavoro',
        backgroundVariant: 'gradient-subtle',
        items: [
            {
                question: 'Quando è obbligatorio nominare il medico competente?',
                answer: 'Il medico competente deve essere nominato quando dalla valutazione dei rischi emergono fattori che richiedono la sorveglianza sanitaria: rumore, vibrazioni, agenti chimici/biologici, videoterminali >20h/settimana, movimentazione carichi, lavoro notturno, ecc.'
            },
            {
                question: 'Quanto costano le visite mediche del lavoro?',
                answer: 'Il costo dipende dal protocollo sanitario richiesto (solo visita base, con spirometria, audiometria, esami ematici, ecc.). Forniamo preventivi personalizzati gratuiti basati sulle effettive esigenze.'
            },
            {
                question: 'Le visite si fanno presso di voi o in azienda?',
                answer: 'Entrambe le opzioni sono disponibili. Per gruppi numerosi è conveniente organizzare le visite presso la vostra sede. Per singoli lavoratori o piccoli gruppi, vi accogliamo nel nostro ambulatorio.'
            },
            {
                question: 'Ogni quanto vanno ripetute le visite?',
                answer: 'La periodicità è definita dal protocollo sanitario e varia in base ai rischi: può essere annuale, biennale o con altra frequenza. Il medico competente può modificarla in base alle condizioni di salute.'
            },
            {
                question: 'Cosa succede se un lavoratore risulta non idoneo?',
                answer: 'Il datore di lavoro deve adibire il lavoratore ad altra mansione compatibile con il suo stato di salute, se disponibile. In caso contrario, si applicano le tutele previste dalla legge.'
            },
            {
                question: 'Come gestite le cartelle sanitarie?',
                answer: 'Utilizziamo un sistema informatizzato che garantisce la riservatezza dei dati sanitari, la tracciabilità degli accessi e la conservazione per i 10 anni previsti dalla legge (40 anni per cancerogeni).'
            }
        ]
    },

    cta: {
        backgroundVariant: 'gradient-medical',
        title: 'Attiva la Sorveglianza Sanitaria',
        subtitle: 'Proteggi i tuoi lavoratori e la tua azienda',
        description: 'Richiedi un preventivo personalizzato senza impegno. I nostri esperti ti contatteranno entro 24 ore.',
        primaryButton: { text: 'Richiedi Preventivo Gratuito', href: '/contatti', icon: 'ArrowRight' },
        secondaryButton: { text: 'Chiama: +39 351 623 9176', href: 'tel:+393516239176', icon: 'Phone' },
        badges: [
            '✓ Medici Specializzati',
            '✓ Attivazione in 48h',
            '✓ Conformità Garantita'
        ]
    }
};

async function updateMedicinaLavoro() {
    console.log('🏥 Aggiornamento Medicina del Lavoro - Element Formazione...\n');

    try {
        const page = await prisma.cMSPage.findFirst({
            where: { slug: 'medicina-del-lavoro', tenantId: TENANT_FORMAZIONE }
        });

        if (!page) {
            console.log('❌ Pagina non trovata');
            return;
        }

        await prisma.cMSPage.update({
            where: { id: page.id },
            data: {
                title: 'Medicina del Lavoro - Element Formazione',
                content: medicinaLavoroContent,
                seoTitle: 'Medicina del Lavoro Padova | Sorveglianza Sanitaria Aziendale | Medico Competente | Element Formazione',
                seoDescription: 'Servizi completi di medicina del lavoro: visite mediche preventive e periodiche, medico competente, esami strumentali, vaccinazioni. Conformità D.Lgs 81/08 garantita. Attivazione in 48h.',
                updatedAt: new Date()
            }
        });

        console.log('✅ Pagina aggiornata con successo!');
        console.log('   - Sezioni: ' + Object.keys(medicinaLavoroContent).length);

    } catch (error) {
        console.error('❌ Errore:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

updateMedicinaLavoro();
