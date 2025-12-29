import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

// Backup function inline
async function createBackup() {
  // Skip backup if SKIP_BACKUP env var is set
  if (process.env.SKIP_BACKUP === 'true') {
    console.log('⚠️  SKIP_BACKUP=true, saltando il backup di sicurezza');
    return null;
  }

  const backupDir = path.join(__dirname, '../migration-backups');

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const backupFile = path.join(backupDir, `backup_${timestamp}_before_seed.backup`);

  console.log('🔒 Creazione backup di sicurezza...');

  try {
    execSync(
      `PGPASSWORD=postgres pg_dump -h localhost -p 5432 -U postgres -d dev_db -Fc -f "${backupFile}"`,
      { stdio: 'inherit' }
    );

    const stats = fs.statSync(backupFile);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

    console.log(`✅ Backup creato: ${path.basename(backupFile)} (${sizeMB} MB)`);
    return backupFile;
  } catch (error) {
    console.error('❌ Errore backup:', error.message);
    // Non interrompere se il backup fallisce, solo log warning
    console.log('⚠️  Continuando senza backup...');
    return null;
  }
}

// CMS Pages Seed
async function seedCmsPages() {
  const tenant = await prisma.tenant.findFirst({
    where: { slug: { in: ['element-medica', 'default-company'] } }
  });

  if (!tenant) {
    console.log('⚠️  Nessun tenant trovato, skip CMS pages');
    return;
  }

  const cmsPages = [
    // HOMEPAGE (slug: homepage per compatibilità con frontend)
    {
      slug: 'homepage',
      title: 'Element Formazione - Sicurezza sul Lavoro',
      seoTitle: 'Element Formazione | Leader nella Sicurezza sul Lavoro',
      seoDescription: 'Leader nella formazione sulla sicurezza e consulenza aziendale. Offriamo soluzioni complete per la conformità normativa e la protezione dei lavoratori.',
      status: 'published',
      layout: 'full-width',
      content: {
        hero: {
          title: 'Sicurezza sul Lavoro',
          subtitle: 'Senza Compromessi',
          description: 'Leader nella formazione sulla sicurezza e consulenza aziendale. Offriamo soluzioni complete per la conformità normativa e la protezione dei lavoratori.',
          primaryButton: { text: 'Scopri i Corsi', href: '/corsi' },
          secondaryButton: { text: 'Richiedi Preventivo', href: '/contatti' },
          stats: [
            { number: '500+', label: 'Aziende Clienti' },
            { number: '10.000+', label: 'Lavoratori Formati' },
            { number: '15+', label: 'Anni di Esperienza' },
            { number: '98%', label: 'Soddisfazione Cliente' }
          ],
          backgroundVariant: 'gradient',
          showContactForm: true
        },
        services: [
          {
            icon: 'Shield',
            title: 'Corsi di Formazione',
            description: 'Corsi sulla sicurezza sul lavoro per tutti i settori e livelli di rischio',
            features: ['Rischio Alto, Medio, Basso', 'Aggiornamenti periodici', 'Certificazioni riconosciute'],
            href: '/corsi'
          },
          {
            icon: 'Users',
            title: 'Nomina RSPP',
            description: 'Servizio di Responsabile del Servizio di Prevenzione e Protezione',
            features: ['Consulenza specializzata', 'Supporto continuo', 'Conformità normativa'],
            href: '/rspp'
          },
          {
            icon: 'Award',
            title: 'Medico del Lavoro',
            description: 'Sorveglianza sanitaria e visite mediche per i lavoratori',
            features: ['Visite periodiche', 'Protocolli sanitari', 'Certificazioni mediche'],
            href: '/medicina-del-lavoro'
          }
        ],
        whyChooseUs: {
          title: 'Perché Scegliere Element Formazione',
          features: [
            { title: 'Esperienza Consolidata', description: 'Oltre 15 anni nel settore della sicurezza sul lavoro', icon: 'CheckCircle' },
            { title: 'Certificazioni Riconosciute', description: 'Tutti i nostri corsi rilasciano attestati validi a norma di legge', icon: 'CheckCircle' },
            { title: 'Supporto Continuo', description: 'Assistenza e consulenza anche dopo la formazione', icon: 'CheckCircle' }
          ]
        },
        testimonials: [
          { name: 'Marco Rossi', company: 'Industrie Meccaniche SRL', text: 'Servizio eccellente e professionale. La formazione è stata chiara e completa.', rating: 5 },
          { name: 'Laura Bianchi', company: 'Costruzioni Edili SpA', text: 'Supporto costante e competenza tecnica di alto livello. Consigliato!', rating: 5 }
        ],
        ourProcess: {
          title: 'Come Lavoriamo',
          description: 'Un processo semplice e strutturato per garantire la massima conformità normativa',
          steps: [
            {
              number: '01',
              title: 'Analisi Iniziale',
              description: 'Valutiamo le esigenze specifiche della tua azienda e identifichiamo le aree di intervento prioritarie',
              icon: 'Search'
            },
            {
              number: '02',
              title: 'Pianificazione',
              description: 'Sviluppiamo un piano personalizzato con tempistiche chiare e obiettivi misurabili',
              icon: 'Calendar'
            },
            {
              number: '03',
              title: 'Implementazione',
              description: 'Eseguiamo la formazione e implementiamo le soluzioni di sicurezza concordate',
              icon: 'CheckCircle'
            },
            {
              number: '04',
              title: 'Monitoraggio',
              description: 'Forniamo supporto continuo e verifichiamo il mantenimento degli standard di sicurezza',
              icon: 'Activity'
            }
          ]
        },
        companyNumbers: {
          title: 'I Nostri Numeri',
          description: 'La nostra esperienza parla attraverso i risultati',
          stats: [
            { number: '500+', label: 'Aziende Clienti', description: 'In tutta Italia' },
            { number: '10.000+', label: 'Lavoratori Formati', description: 'Annualmente' },
            { number: '15+', label: 'Anni di Esperienza', description: 'Nel settore' },
            { number: '98%', label: 'Soddisfazione Cliente', description: 'Verificata' },
            { number: '200+', label: 'Corsi Erogati', description: 'Ogni anno' },
            { number: '24/7', label: 'Supporto Disponibile', description: 'Per emergenze' }
          ]
        },
        certifications: {
          title: 'Certificazioni e Riconoscimenti',
          description: 'Siamo accreditati e riconosciuti dalle principali autorità del settore',
          items: [
            { name: 'Accreditamento Regionale', description: 'Ente accreditato per la formazione professionale', icon: 'Award' },
            { name: 'ISO 9001:2015', description: 'Certificazione per i sistemi di gestione della qualità', icon: 'Shield' },
            { name: 'Ordine degli Ingegneri', description: 'Professionisti iscritti agli ordini professionali', icon: 'Users' },
            { name: 'Rispetto GDPR', description: 'Conformità totale alle normative sulla privacy', icon: 'Lock' }
          ]
        },
        faq: {
          title: 'Domande Frequenti',
          description: 'Le risposte alle domande più comuni sulla sicurezza sul lavoro',
          items: [
            {
              question: 'Quanto dura un corso di formazione sulla sicurezza?',
              answer: 'La durata varia in base al livello di rischio dell\'azienda: 4 ore per il rischio basso, 8 ore per il medio e 16 ore per l\'alto rischio. I corsi di aggiornamento hanno durata ridotta (6 ore).'
            },
            {
              question: 'Gli attestati rilasciati sono validi a livello nazionale?',
              answer: 'Sì, tutti i nostri attestati sono rilasciati in conformità al D.Lgs. 81/08 e agli Accordi Stato-Regioni, quindi hanno validità su tutto il territorio nazionale.'
            },
            {
              question: 'È possibile organizzare corsi presso la sede aziendale?',
              answer: 'Assolutamente sì! Organizziamo corsi in sede per gruppi di almeno 10 partecipanti, con contenuti personalizzati sulle specifiche necessità dell\'azienda.'
            },
            {
              question: 'Cosa include il servizio di RSPP esterno?',
              answer: 'Il servizio include la nomina del Responsabile, la redazione e aggiornamento del DVR, supporto per la valutazione dei rischi, consulenza continua e gestione delle scadenze normative.'
            },
            {
              question: 'Quanto costa mediamente un corso di formazione?',
              answer: 'I costi variano in base al tipo di corso e al numero di partecipanti. Offriamo tariffe competitive e sconti per gruppi. Contattaci per un preventivo personalizzato gratuito.'
            }
          ]
        },
        cta: {
          title: 'Pronto a Migliorare la Sicurezza della Tua Azienda?',
          description: 'Contattaci oggi per una consulenza gratuita e scopri come possiamo aiutarti',
          primaryButton: { text: 'Contattaci Ora', href: '/contatti' },
          secondaryButton: { text: 'Vedi i Corsi', href: '/corsi' }
        },
        metadata: { layout: 'full-width', theme: 'light' }
      },
      blocks: []
    },

    // SERVIZI
    {
      slug: 'servizi',
      title: 'I Nostri Servizi - Element Formazione',
      seoTitle: 'Servizi di Sicurezza sul Lavoro | Formazione e Consulenza',
      seoDescription: 'Soluzioni complete per la sicurezza sul lavoro e la medicina del lavoro. Formazione, consulenza RSPP, medico del lavoro, DVR e molto altro.',
      status: 'published',
      layout: 'full-width',
      content: {
        hero: {
          title: 'I Nostri Servizi',
          description: 'Soluzioni complete per la sicurezza sul lavoro e la conformità normativa. Affidati alla nostra esperienza per garantire la conformità normativa della tua azienda.',
          backgroundVariant: 'gradient'
        },
        services: [
          {
            id: 1,
            title: 'Corsi di Formazione sulla Sicurezza',
            description: 'Corsi completi per la formazione dei lavoratori in materia di sicurezza sul lavoro, conformi al D.Lgs. 81/08.',
            features: ['Formazione generale e specifica', 'Corsi per preposti e dirigenti', 'Aggiornamenti periodici', 'Attestati riconosciuti'],
            icon: 'GraduationCap',
            buttonText: 'Scopri i Corsi',
            buttonHref: '/corsi'
          },
          {
            id: 2,
            title: 'Nomina RSPP',
            description: 'Servizio di Responsabile del Servizio di Prevenzione e Protezione per la vostra azienda.',
            features: ['Valutazione dei rischi', 'Elaborazione DVR', 'Consulenza continua', 'Sopralluoghi periodici'],
            icon: 'Shield',
            buttonText: 'Scopri di più',
            buttonHref: '/rspp'
          },
          {
            id: 3,
            title: 'Medico del Lavoro',
            description: 'Servizio di sorveglianza sanitaria per garantire la salute dei vostri dipendenti.',
            features: ['Visite mediche preventive', 'Visite periodiche', 'Giudizi di idoneità', 'Protocolli sanitari'],
            icon: 'Heart',
            buttonText: 'Scopri di più',
            buttonHref: '/medicina-del-lavoro'
          },
          {
            id: 4,
            title: 'Documento di Valutazione dei Rischi (DVR)',
            description: 'Elaborazione e aggiornamento del Documento di Valutazione dei Rischi secondo normativa.',
            features: ['Analisi dei rischi aziendali', 'Misure di prevenzione', 'Programma di miglioramento', 'Aggiornamenti periodici'],
            icon: 'FileText',
            buttonText: 'Richiedi Preventivo',
            buttonHref: '/contatti'
          },
          {
            id: 5,
            title: 'Consulenza Sicurezza',
            description: 'Consulenza specializzata per la gestione della sicurezza sul lavoro nella vostra azienda.',
            features: ['Audit di sicurezza', 'Procedure operative', 'Formazione personalizzata', 'Supporto normativo'],
            icon: 'Briefcase',
            buttonText: 'Richiedi Consulenza',
            buttonHref: '/contatti'
          },
          {
            id: 6,
            title: 'Gestione Emergenze',
            description: 'Pianificazione e gestione delle procedure di emergenza e primo soccorso.',
            features: ['Piani di emergenza', 'Formazione primo soccorso', 'Addetti antincendio', 'Prove di evacuazione'],
            icon: 'AlertTriangle',
            buttonText: 'Richiedi Informazioni',
            buttonHref: '/contatti'
          }
        ],
        whyChooseUs: {
          title: 'Perché Scegliere Element Formazione',
          description: 'La nostra esperienza e professionalità al servizio della vostra sicurezza',
          features: [
            { title: 'Esperienza Consolidata', description: 'Oltre 15 anni nel settore della sicurezza sul lavoro', icon: '🏆' },
            { title: 'Conformità Normativa', description: 'Sempre aggiornati alle ultime disposizioni legislative', icon: '📜' },
            { title: 'Team Qualificato', description: 'Professionisti certificati e costantemente formati', icon: '👥' },
            { title: 'Soluzioni Personalizzate', description: 'Servizi su misura per ogni tipologia di azienda', icon: '🎯' }
          ]
        },
        cta: {
          title: 'Hai bisogno di una consulenza?',
          description: 'Contattaci per una valutazione gratuita delle tue esigenze in materia di sicurezza sul lavoro',
          primaryButton: { text: 'Richiedi Preventivo Gratuito', href: '/contatti' },
          secondaryButton: { text: 'Contattaci Ora', href: '/contatti' }
        }
      },
      blocks: []
    },

    // CONTATTI
    {
      slug: 'contatti',
      title: 'Contattaci - Element Formazione',
      seoTitle: 'Contattaci | Element Formazione',
      seoDescription: 'Siamo qui per aiutarti. Contattaci per qualsiasi informazione sui nostri servizi o per richiedere una consulenza personalizzata.',
      status: 'published',
      layout: 'full-width',
      content: {
        hero: {
          title: 'Contattaci',
          description: 'Siamo qui per aiutarti. Contattaci per qualsiasi informazione sui nostri servizi o per richiedere una consulenza personalizzata.',
          backgroundVariant: 'gradient'
        },
        contactInfo: {
          address: { label: 'Sede Principale', value: 'Via Lanari, 14\n35129 Padova (PD)\nItalia', badge: 'Padova' },
          phones: [
            { label: 'Telefono', number: '351 318 1574', contact: 'Edoardo', badge: 'Attivo' },
            { label: 'Telefono', number: '351 623 9176', contact: 'Matteo', badge: 'Attivo' }
          ],
          emails: [
            { label: 'Email', address: 'info@elementformazione.com', badge: '24/7' },
            { label: 'Email Corsi', address: 'corsi@elementformazione.com', badge: 'Corsi' }
          ],
          hours: {
            weekdays: 'Lunedì - Venerdì: 8:00 - 19:00',
            saturday: 'Sabato: 8:00 - 13:00',
            sunday: 'Domenica: Chiuso'
          },
          social: {
            title: 'Seguici sui Social',
            badge: 'Social',
            links: []
          }
        },
        contactForm: {
          title: 'Invia un Messaggio',
          showCompanyField: true,
          showPhoneField: true,
          showSubjectField: true,
          subjects: [
            { value: 'informazioni-corsi', label: 'Informazioni sui corsi' },
            { value: 'preventivo', label: 'Richiesta preventivo' },
            { value: 'consulenza', label: 'Consulenza sicurezza' },
            { value: 'rspp', label: 'Servizio RSPP' },
            { value: 'medico-lavoro', label: 'Medico del lavoro' },
            { value: 'altro', label: 'Altro' }
          ]
        },
        map: {
          title: 'Come Raggiungerci',
          description: 'Siamo facilmente raggiungibili con i mezzi pubblici e disponiamo di parcheggio',
          showMap: true
        }
      },
      blocks: []
    },

    // RSPP
    {
      slug: 'rspp',
      title: 'Nomina RSPP - Element Formazione',
      seoTitle: 'Servizio RSPP | Responsabile Servizio Prevenzione e Protezione',
      seoDescription: 'Affida a professionisti certificati la gestione della sicurezza nella tua azienda. Dalla valutazione dei rischi alla formazione, ti accompagniamo in ogni fase.',
      status: 'published',
      layout: 'full-width',
      content: {
        hero: {
          title: 'Nomina RSPP',
          subtitle: 'Responsabile del Servizio di Prevenzione e Protezione',
          description: 'Affida a professionisti certificati la gestione della sicurezza nella tua azienda. Dalla valutazione dei rischi alla formazione, ti accompagniamo in ogni fase.',
          primaryButton: { text: 'Richiedi Preventivo', href: '/contatti' },
          secondaryButton: { text: 'Scopri i Corsi', href: '/corsi' },
          stats: [
            { number: '15+', label: 'Anni di esperienza' },
            { number: '500+', label: 'Aziende seguite' },
            { number: '98%', label: 'Clienti soddisfatti' }
          ],
          showContactForm: false
        },
        serviceIncludes: {
          title: 'Cosa include il servizio',
          description: 'Il nostro servizio di RSPP esterno garantisce la piena conformità al D.Lgs. 81/08 attraverso un percorso completo e personalizzato.',
          features: [
            'Consulenza specializzata RSPP esterno',
            'Valutazione dei rischi e analisi processi',
            'Elaborazione e aggiornamento DVR',
            'Sopralluoghi periodici e reportistica',
            'Formazione lavoratori e preposti',
            'Supporto continuo alla conformità normativa'
          ],
          cards: [
            { icon: 'Shield', title: 'Analisi dei Rischi', description: 'Sopralluoghi e raccolta dati per una mappatura accurata dei rischi aziendali.' },
            { icon: 'ClipboardList', title: 'DVR e Procedure', description: 'Redazione e aggiornamento del DVR e delle procedure operative.' },
            { icon: 'Users', title: 'Formazione', description: 'Percorsi formativi per lavoratori, preposti e dirigenti.' },
            { icon: 'Calendar', title: 'Sopralluoghi', description: 'Visite periodiche con report e piano di miglioramento.' }
          ]
        },
        cta: {
          title: 'Richiedi una consulenza gratuita',
          description: 'Valutiamo insieme lo stato di conformità della tua azienda e il piano di azione.',
          primaryButton: { text: 'Contattaci', href: '/contatti' },
          secondaryButton: { text: 'Vedi i corsi', href: '/corsi' }
        }
      },
      blocks: []
    },

    // MEDICINA DEL LAVORO
    {
      slug: 'medicina-del-lavoro',
      title: 'Medicina del Lavoro - Element Formazione',
      seoTitle: 'Medicina del Lavoro | Sorveglianza Sanitaria Aziendale',
      seoDescription: 'Supportiamo la salute dei lavoratori con un servizio completo e conforme. Dalla definizione dei protocolli sanitari alla gestione delle visite.',
      status: 'published',
      layout: 'full-width',
      content: {
        hero: {
          title: 'Medicina del Lavoro',
          subtitle: 'Sorveglianza Sanitaria per la Tua Azienda',
          description: 'Supportiamo la salute dei lavoratori con un servizio completo e conforme. Dalla definizione dei protocolli sanitari alla gestione delle visite.',
          primaryButton: { text: 'Richiedi Informazioni', href: '/contatti' },
          secondaryButton: { text: 'Scopri i Corsi', href: '/corsi' },
          stats: [
            { number: '1000+', label: 'Visite/anno' },
            { number: '50+', label: 'Aziende seguite' },
            { number: '24/7', label: 'Supporto' }
          ],
          showContactForm: false
        },
        services: {
          title: 'I nostri servizi',
          description: 'Una gestione strutturata e puntuale della sorveglianza sanitaria, integrata con i processi aziendali.',
          features: [
            'Sorveglianza sanitaria completa',
            'Visite preventive e periodiche',
            'Giudizi di idoneità',
            'Protocolli sanitari personalizzati',
            'Gestione scadenze e richiami',
            'Report conformi alla normativa vigente'
          ],
          cards: [
            { icon: 'Stethoscope', title: 'Visite Mediche', description: 'Programmazione e gestione di visite preventive e periodiche.' },
            { icon: 'ClipboardCheck', title: 'Idoneità', description: 'Emissione giudizi di idoneità conformi ai protocolli.' },
            { icon: 'Shield', title: 'Protocollo Sanitario', description: 'Definizione di protocolli per mansione e rischio.' },
            { icon: 'HeartPulse', title: 'Screening', description: 'Programmi di prevenzione e controllo periodico.' }
          ]
        },
        cta: {
          title: 'Parliamo delle tue esigenze',
          description: 'Ti proponiamo un piano di sorveglianza sanitaria in linea con la normativa e le mansioni del tuo personale.',
          primaryButton: { text: 'Contattaci', href: '/contatti' },
          secondaryButton: { text: 'Vedi i corsi', href: '/corsi' }
        }
      },
      blocks: []
    },

    // CAREERS
    {
      slug: 'carriere',
      title: 'Lavora con Noi - Element Formazione',
      seoTitle: 'Lavora con Noi | Opportunità di Carriera',
      seoDescription: 'Unisciti al nostro team di professionisti della sicurezza sul lavoro. Cresci con noi in un ambiente stimolante e all\'avanguardia.',
      status: 'published',
      layout: 'full-width',
      content: {
        hero: {
          title: 'Lavora con Noi',
          description: 'Unisciti al nostro team di professionisti della sicurezza sul lavoro. Cresci con noi in un ambiente stimolante e all\'avanguardia.',
          backgroundVariant: 'gradient'
        },
        whyWorkWithUs: {
          title: 'Perché Lavorare con Element Formazione',
          description: 'Offriamo un ambiente di lavoro dinamico, opportunità di crescita e la possibilità di fare la differenza nel campo della sicurezza sul lavoro',
          benefits: [
            { icon: '🚀', title: 'Crescita Professionale', description: 'Opportunità di formazione continua e sviluppo delle competenze' },
            { icon: '👥', title: 'Team Affiatato', description: 'Lavora in un ambiente collaborativo con professionisti esperti' },
            { icon: '⚖️', title: 'Work-Life Balance', description: 'Orari flessibili e attenzione al benessere dei dipendenti' },
            { icon: '💡', title: 'Innovazione', description: 'Utilizziamo tecnologie all\'avanguardia e metodologie innovative' },
            { icon: '🎯', title: 'Progetti Stimolanti', description: 'Lavora su progetti diversificati con aziende di vari settori' },
            { icon: '💰', title: 'Retribuzione Competitiva', description: 'Pacchetti retributivi allineati al mercato con benefit aggiuntivi' }
          ]
        },
        openPositions: [
          {
            id: 1,
            title: 'RSPP - Responsabile Servizio Prevenzione e Protezione',
            location: 'Milano',
            type: 'Full-time',
            experience: '3+ anni',
            description: 'Cerchiamo un RSPP qualificato per ampliare il nostro team di consulenti.',
            requirements: [
              'Laurea in Ingegneria o titolo equipollente',
              'Abilitazione RSPP per tutti i macrosettori',
              'Esperienza minima 3 anni nel settore',
              'Conoscenza approfondita D.Lgs. 81/08'
            ]
          },
          {
            id: 2,
            title: 'Medico del Lavoro',
            location: 'Milano / Lombardia',
            type: 'Collaborazione',
            experience: '2+ anni',
            description: 'Ricerchiamo medico del lavoro per sorveglianza sanitaria presso aziende clienti.'
          },
          {
            id: 3,
            title: 'Formatore Sicurezza sul Lavoro',
            location: 'Milano e provincia',
            type: 'Collaborazione',
            experience: '2+ anni',
            description: 'Cerchiamo formatori qualificati per corsi di sicurezza sul lavoro.'
          }
        ]
      },
      blocks: []
    },

    // CORSI (Listing Page)
    {
      slug: 'corsi',
      title: 'I Nostri Corsi - Element Formazione',
      seoTitle: 'Corsi Sicurezza sul Lavoro | Formazione Professionale',
      seoDescription: 'Esplora il catalogo completo dei corsi sulla sicurezza sul lavoro: formazione per tutti i settori e livelli di rischio. Corsi riconosciuti e certificati.',
      status: 'published',
      layout: 'full-width',
      content: {
        hero: {
          title: 'I Nostri Corsi',
          description: 'Formazione professionale sulla sicurezza sul lavoro per tutti i settori e livelli di rischio.',
          primaryButton: { text: 'Visualizza Corsi', href: '#courses-list' },
          backgroundVariant: 'solid'
        },
        sections: [
          {
            type: 'courses-list',
            id: 'courses-list-1',
            title: 'Catalogo Corsi',
            display: 'grid',
            itemsPerPage: 12,
            showFilters: true,
            filters: ['Tutti', 'RSPP/ASPP', 'Primo Soccorso', 'Antincendio', 'RLS', 'Preposti', 'Dirigenti']
          }
        ],
        metadata: { layout: 'full-width' }
      },
      blocks: []
    },

    // PRIVACY POLICY
    {
      slug: 'privacy-policy',
      title: 'Privacy Policy - Element Formazione',
      seoTitle: 'Privacy Policy | Informativa GDPR',
      seoDescription: 'La tua privacy è importante per noi. Scopri come proteggiamo i tuoi dati secondo il GDPR (Regolamento UE 2016/679).',
      status: 'published',
      layout: 'boxed',
      content: {
        hero: {
          title: 'Privacy Policy',
          description: 'La tua privacy è importante per noi. Scopri come proteggiamo i tuoi dati.',
          icon: 'Shield'
        },
        introduction: {
          title: 'Informazioni Generali',
          content: 'Element Formazione S.r.l. (di seguito "Element Formazione", "noi", "nostro") rispetta la tua privacy e si impegna a proteggere i tuoi dati personali. Questa Privacy Policy spiega come raccogliamo, utilizziamo e proteggiamo le tue informazioni quando utilizzi il nostro sito web e i nostri servizi.\n\nQuesta informativa è conforme al Regolamento Generale sulla Protezione dei Dati (GDPR) UE 2016/679 e al Codice Privacy italiano (D.Lgs. 196/2003 come modificato dal D.Lgs. 101/2018).'
        },
        dataController: {
          title: 'Titolare del Trattamento',
          company: 'Element Formazione S.r.l.',
          address: '[Indirizzo completo]',
          vat: '[Partita IVA]',
          email: 'privacy@elementformazione.it',
          phone: '+39 123 456 789'
        },
        dataCollected: {
          title: 'Dati Personali Raccolti',
          categories: [
            {
              title: 'Dati di Contatto',
              items: ['Nome e cognome', 'Indirizzo email', 'Numero di telefono', 'Azienda di appartenenza']
            },
            {
              title: 'Dati di Navigazione',
              items: ['Indirizzo IP', 'Tipo di browser e dispositivo', 'Pagine visitate e tempo di permanenza', 'Dati di geolocalizzazione approssimativa']
            },
            {
              title: 'Dati per Servizi di Formazione',
              items: ['Codice fiscale', 'Dati anagrafici completi', 'Qualifiche professionali', 'Storico corsi frequentati']
            }
          ]
        },
        purposes: {
          title: 'Finalità del Trattamento',
          items: [
            { title: 'Servizi Richiesti', description: 'Erogazione di corsi di formazione, consulenze sulla sicurezza, rilascio di certificazioni e gestione delle pratiche amministrative.' },
            { title: 'Comunicazione', description: 'Risposta a richieste di informazioni, invio di preventivi, comunicazioni relative ai servizi e supporto clienti.' },
            { title: 'Marketing', description: 'Invio di newsletter, promozioni e informazioni su nuovi corsi e servizi (solo con il tuo consenso esplicito).' },
            { title: 'Miglioramento Servizi', description: 'Analisi statistiche anonime per migliorare l\'esperienza utente e ottimizzare i nostri servizi.' }
          ]
        },
        legalBasis: {
          title: 'Base Giuridica del Trattamento',
          items: [
            { type: 'contract', title: 'Esecuzione del Contratto', description: 'Per l\'erogazione dei servizi di formazione e consulenza richiesti.' },
            { type: 'consent', title: 'Consenso', description: 'Per attività di marketing e comunicazioni promozionali.' },
            { type: 'legitimate', title: 'Interesse Legittimo', description: 'Per migliorare i nostri servizi e garantire la sicurezza del sito.' },
            { type: 'legal', title: 'Obbligo Legale', description: 'Per adempiere agli obblighi normativi in materia di formazione e sicurezza.' }
          ]
        },
        userRights: {
          title: 'I Tuoi Diritti',
          description: 'In conformità al GDPR, hai diritto a:',
          rights: [
            'Accesso ai tuoi dati personali',
            'Rettifica dei dati inesatti',
            'Cancellazione dei dati ("diritto all\'oblio")',
            'Limitazione del trattamento',
            'Portabilità dei dati',
            'Opposizione al trattamento',
            'Revoca del consenso',
            'Proporre reclamo al Garante Privacy'
          ],
          contact: 'Per esercitare i tuoi diritti, contattaci a: privacy@elementformazione.it'
        },
        lastUpdate: new Date().toISOString()
      },
      blocks: []
    },

    // COOKIE POLICY
    {
      slug: 'cookie-policy',
      title: 'Cookie Policy - Element Formazione',
      seoTitle: 'Cookie Policy | Utilizzo dei Cookie',
      seoDescription: 'Informazioni sui cookie utilizzati sul nostro sito web e sulle modalità di gestione del consenso.',
      status: 'published',
      layout: 'boxed',
      content: {
        hero: {
          title: 'Cookie Policy',
          description: 'Informazioni sui cookie utilizzati sul nostro sito web',
          icon: 'Cookie'
        },
        introduction: {
          title: 'Cosa sono i Cookie',
          content: 'I cookie sono piccoli file di testo che vengono memorizzati sul tuo dispositivo quando visiti un sito web. Ci aiutano a fornire una migliore esperienza di navigazione, ricordare le tue preferenze e analizzare come utilizzi il nostro sito.\n\nElement Formazione utilizza i cookie in conformità con la normativa europea e italiana sulla privacy e sui cookie.'
        },
        cookieTypes: [
          {
            type: 'necessary',
            title: 'Cookie Necessari',
            badge: 'Sempre Attivi',
            description: 'Questi cookie sono essenziali per il funzionamento del sito web e non possono essere disabilitati. Vengono utilizzati per:',
            purposes: ['Mantenere la sessione di navigazione', 'Ricordare le preferenze sui cookie', 'Garantire la sicurezza del sito', 'Abilitare funzionalità di base del sito'],
            cookies: [
              { name: 'sessionToken', description: 'Token di sessione', duration: 'sessione' },
              { name: 'cookieConsent', description: 'Preferenze cookie', duration: '1 anno' },
              { name: 'csrfToken', description: 'Protezione CSRF', duration: 'sessione' }
            ]
          },
          {
            type: 'analytics',
            title: 'Cookie di Analisi',
            badge: 'Opzionali',
            description: 'Questi cookie ci aiutano a capire come i visitatori interagiscono con il sito, fornendoci informazioni anonime su:',
            purposes: ['Numero di visitatori e visualizzazioni di pagina', 'Tempo trascorso sul sito', 'Pagine più visitate', 'Sorgenti di traffico'],
            services: [
              {
                name: 'Google Analytics',
                description: 'Analisi del traffico web',
                cookies: [
                  { name: '_ga', duration: '2 anni' },
                  { name: '_ga_*', duration: '2 anni' },
                  { name: '_gid', duration: '24 ore' }
                ]
              }
            ]
          },
          {
            type: 'marketing',
            title: 'Cookie di Marketing',
            badge: 'Opzionali',
            description: 'Questi cookie vengono utilizzati per mostrare annunci pubblicitari più rilevanti per te e per misurare l\'efficacia delle campagne pubblicitarie:',
            purposes: ['Personalizzazione degli annunci', 'Misurazione delle conversioni', 'Retargeting pubblicitario', 'Analisi delle campagne marketing'],
            services: [
              {
                name: 'Google Ads',
                description: 'Pubblicità personalizzata',
                cookies: [
                  { name: '_gcl_au', duration: '90 giorni' },
                  { name: '_gcl_aw', duration: '90 giorni' }
                ]
              },
              {
                name: 'Facebook Pixel',
                description: 'Analisi e retargeting',
                cookies: [
                  { name: '_fbp', duration: '90 giorni' },
                  { name: '_fbc', duration: '90 giorni' }
                ]
              }
            ]
          }
        ],
        management: {
          title: 'Gestione delle Preferenze Cookie',
          panel: {
            title: 'Pannello Preferenze',
            description: 'Puoi gestire le tue preferenze sui cookie in qualsiasi momento utilizzando il nostro pannello delle preferenze.',
            buttonText: 'Gestisci Preferenze Cookie'
          },
          browser: {
            title: 'Impostazioni Browser',
            description: 'Puoi anche gestire i cookie direttamente dalle impostazioni del tuo browser.',
            links: [
              { browser: 'Chrome', url: 'https://support.google.com/chrome/answer/95647' },
              { browser: 'Firefox', url: 'https://support.mozilla.org/it/kb/Gestione%20dei%20cookie' },
              { browser: 'Safari', url: 'https://support.apple.com/it-it/guide/safari/sfri11471/mac' },
              { browser: 'Edge', url: 'https://support.microsoft.com/it-it/microsoft-edge/eliminare-i-cookie-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09' }
            ]
          }
        },
        lastUpdate: new Date().toISOString()
      },
      blocks: []
    },

    // TERMINI DI SERVIZIO
    {
      slug: 'termini',
      title: 'Termini di Servizio - Element Formazione',
      seoTitle: 'Termini di Servizio | Condizioni Generali',
      seoDescription: 'Condizioni generali di utilizzo del sito e dei nostri servizi. Leggi i termini prima di utilizzare i servizi Element Formazione.',
      status: 'published',
      layout: 'boxed',
      content: {
        hero: {
          title: 'Termini di Servizio',
          description: 'Condizioni generali di utilizzo del sito e dei nostri servizi',
          icon: 'Scale'
        },
        introduction: {
          title: 'Informazioni Generali',
          content: 'I presenti Termini di Servizio disciplinano l\'utilizzo del sito web www.elementformazione.it e dei servizi offerti da Element Formazione S.r.l. (di seguito "Element Formazione", "noi", "nostro").\n\nUtilizzando il nostro sito web o i nostri servizi, accetti integralmente questi termini. Se non accetti questi termini, ti preghiamo di non utilizzare il nostro sito o i nostri servizi.'
        },
        companyInfo: {
          title: 'Informazioni sulla Società',
          company: 'Element Formazione S.r.l.',
          details: {
            address: '[Indirizzo completo]',
            vat: '[Partita IVA]',
            cf: '[Codice Fiscale]',
            rea: '[Numero REA]',
            email: 'info@elementformazione.it',
            phone: '+39 123 456 789',
            pec: 'elementformazione@pec.it',
            capital: '€ [Importo]'
          }
        },
        services: {
          title: 'Servizi Offerti',
          categories: [
            {
              title: 'Formazione Professionale',
              items: ['Corsi di sicurezza sui luoghi di lavoro', 'Formazione primo soccorso', 'Corsi antincendio', 'Aggiornamenti normativi', 'Formazione specialistica']
            },
            {
              title: 'Consulenza Specialistica',
              items: ['Servizi RSPP', 'Medico del Lavoro', 'Documento di Valutazione dei Rischi (DVR)', 'Consulenza normativa', 'Audit e verifiche']
            }
          ]
        },
        siteUsage: {
          title: 'Utilizzo del Sito Web',
          allowed: {
            title: 'Uso Consentito',
            description: 'Il sito web è destinato esclusivamente a:',
            items: ['Consultazione delle informazioni sui nostri servizi', 'Richiesta di preventivi e informazioni', 'Iscrizione ai corsi di formazione', 'Accesso all\'area riservata (per utenti autorizzati)']
          },
          prohibited: {
            title: 'Uso Vietato',
            description: 'È espressamente vietato:',
            items: ['Utilizzare il sito per scopi illegali o non autorizzati', 'Tentare di accedere a aree riservate senza autorizzazione', 'Interferire con il funzionamento del sito', 'Copiare, modificare o distribuire i contenuti senza autorizzazione', 'Utilizzare robot, spider o altri sistemi automatizzati']
          }
        },
        account: {
          title: 'Registrazione e Account Utente',
          creation: {
            title: 'Creazione Account',
            description: 'Per accedere a determinati servizi, potrebbe essere necessario creare un account. Ti impegni a:',
            obligations: ['Fornire informazioni accurate e complete', 'Mantenere aggiornate le tue informazioni', 'Proteggere la riservatezza delle tue credenziali', 'Notificarci immediatamente qualsiasi uso non autorizzato']
          },
          responsibility: {
            title: 'Responsabilità dell\'Account',
            description: 'Sei responsabile di tutte le attività che avvengono sotto il tuo account. Element Formazione non è responsabile per perdite derivanti dall\'uso non autorizzato del tuo account.'
          }
        },
        intellectualProperty: {
          title: 'Proprietà Intellettuale',
          content: {
            title: 'Contenuti del Sito',
            description: 'Tutti i contenuti presenti sul sito (testi, immagini, loghi, video, software) sono di proprietà di Element Formazione o dei rispettivi proprietari e sono protetti dalle leggi sul diritto d\'autore.'
          },
          license: {
            title: 'Licenza d\'Uso',
            description: 'Ti concediamo una licenza limitata, non esclusiva e non trasferibile per utilizzare il sito esclusivamente per scopi personali e non commerciali, in conformità con questi termini.'
          }
        },
        liability: {
          title: 'Limitazione di Responsabilità',
          description: 'Element Formazione non è responsabile per danni diretti, indiretti, incidentali o consequenziali derivanti dall\'uso o dall\'impossibilità di utilizzare il sito o i servizi.'
        },
        modifications: {
          title: 'Modifiche ai Termini',
          description: 'Ci riserviamo il diritto di modificare questi termini in qualsiasi momento. Le modifiche entreranno in vigore alla pubblicazione sul sito. L\'uso continuato del sito dopo la pubblicazione delle modifiche costituisce accettazione dei nuovi termini.'
        },
        law: {
          title: 'Legge Applicabile',
          description: 'Questi termini sono regolati dalla legge italiana. Per qualsiasi controversia sarà competente il Foro di [Città].'
        },
        contact: {
          title: 'Contatti',
          description: 'Per domande sui Termini di Servizio, contattaci a:',
          email: 'info@elementformazione.it',
          phone: '+39 123 456 789'
        },
        lastUpdate: new Date().toISOString()
      },
      blocks: []
    }
  ];

  let created = 0;
  let updated = 0;
  for (const pageData of cmsPages) {
    const existing = await prisma.cMSPage.findFirst({
      where: { slug: pageData.slug, tenantId: tenant.id }
    });

    if (!existing) {
      await prisma.cMSPage.create({
        data: { ...pageData, isPublished: true, publishedAt: new Date(), tenantId: tenant.id }
      });
      console.log(`✅ Creata pagina: ${pageData.slug}`);
      created++;
    } else {
      // Aggiorna la pagina esistente con i nuovi contenuti
      await prisma.cMSPage.update({
        where: { id: existing.id },
        data: {
          content: pageData.content,
          title: pageData.title,
          seoTitle: pageData.seoTitle,
          seoDescription: pageData.seoDescription,
          layout: pageData.layout
        }
      });
      console.log(`🔄 Aggiornata pagina: ${pageData.slug}`);
      updated++;
    }
  }

  console.log(`📊 Pagine CMS Element Formazione: ${created} create, ${updated} aggiornate`);
}

// ==============================================
// ELEMENT MEDICA CMS PAGES SEED
// ==============================================
async function seedElementMedicaCmsPages() {
  const tenant = await prisma.tenant.findFirst({
    where: { slug: 'element-medica' }
  });

  if (!tenant) {
    console.log('⚠️  Tenant Element Medica non trovato, skip CMS pages');
    return;
  }

  console.log('🏥 Caricamento pagine Element Medica...\n');

  try {
    // Importa il file JSON con le pagine Element Medica
    const seedData = JSON.parse(
      fs.readFileSync(
        path.join(__dirname, 'seed-element-medica-pages.json'),
        'utf-8'
      )
    );

    const pages = seedData.pages;
    let created = 0;
    let updated = 0;

    for (const pageData of pages) {
      const existing = await prisma.cMSPage.findFirst({
        where: { slug: pageData.slug, tenantId: tenant.id }
      });

      const data = {
        ...pageData,
        tenantId: tenant.id,
        publishedAt: pageData.isPublished ? new Date() : null
      };

      if (existing) {
        await prisma.cMSPage.update({
          where: { id: existing.id },
          data
        });
        console.log(`   🔄 Aggiornata: ${pageData.slug}`);
        updated++;
      } else {
        await prisma.cMSPage.create({ data });
        console.log(`   ✅ Creata: ${pageData.slug}`);
        created++;
      }
    }

    console.log(`\n📊 Pagine CMS Element Medica: ${created} create, ${updated} aggiornate\n`);
  } catch (error) {
    console.error('❌ Errore caricamento pagine Element Medica:', error.message);
    console.log('   Assicurarsi che esista il file: backend/prisma/seed-element-medica-pages.json');
    console.log('   Per generarlo: node backend/export-element-medica-json.cjs\n');
  }
}

// Form Templates Seed
async function seedFormTemplates() {
  const tenant = await prisma.tenant.findFirst({
    where: { slug: { in: ['element-medica', 'default-company'] } }
  });

  if (!tenant) {
    console.log('⚠️  Nessun tenant trovato, skip form templates');
    return;
  }

  const templates = [
    {
      name: 'Modulo Contatti',
      description: 'Form di contatto pubblico',
      type: 'CONTACT',
      isPublic: true,
      allowAnonymous: true,
      settings: {
        sections: [
          { id: 'section-main', order: 0, title: 'Informazioni di Contatto', collapsible: false, description: 'Compila i campi per contattarci' }
        ]
      },
      fields: [
        { name: 'fullName', label: 'Nome e Cognome', type: 'TEXT', required: true, order: 1, sectionId: 'section-main', placeholder: 'Es. Mario Rossi' },
        { name: 'email', label: 'Email', type: 'EMAIL', required: true, order: 2, sectionId: 'section-main', placeholder: 'Es. mario@esempio.it' },
        { name: 'phone', label: 'Telefono', type: 'tel', required: false, order: 3, sectionId: 'section-main', placeholder: 'Es. +39 123 456 7890' },
        { name: 'subject', label: 'Oggetto', type: 'TEXT', required: true, order: 4, sectionId: 'section-main', placeholder: 'Es. Richiesta informazioni' },
        { name: 'message', label: 'Messaggio', type: 'TEXTAREA', required: true, order: 5, sectionId: 'section-main', placeholder: 'Scrivi qui il tuo messaggio...' }
      ]
    },
    {
      name: 'Richiesta Preventivo Standard',
      description: 'Template base per richieste di preventivo',
      type: 'QUOTE_REQUEST',
      isPublic: true,
      allowAnonymous: false,
      settings: {
        requiresApproval: true,
        notifyOnSubmission: true,
        expirationDays: 30,
        sections: [
          { id: 'section-azienda', order: 0, title: 'Dati Azienda', collapsible: false, description: 'Informazioni sull\'azienda richiedente' },
          { id: 'section-contatto', order: 1, title: 'Contatto Riferimento', collapsible: false, description: 'Persona da contattare' },
          { id: 'section-richiesta', order: 2, title: 'Dettagli Richiesta', collapsible: false, description: 'Specifiche del servizio richiesto' }
        ]
      },
      fields: [
        { name: 'companyName', label: 'Ragione Sociale', type: 'TEXT', required: true, order: 1, sectionId: 'section-azienda', placeholder: 'Es. Acme S.r.l.' },
        { name: 'vatNumber', label: 'Partita IVA', type: 'TEXT', required: true, order: 2, sectionId: 'section-azienda', placeholder: 'Es. IT12345678901' },
        { name: 'contactPerson', label: 'Persona di Riferimento', type: 'TEXT', required: true, order: 1, sectionId: 'section-contatto', placeholder: 'Es. Mario Rossi' },
        { name: 'email', label: 'Email', type: 'EMAIL', required: true, order: 2, sectionId: 'section-contatto', placeholder: 'Es. mario@acme.it' },
        { name: 'phone', label: 'Telefono', type: 'TEXT', required: true, order: 3, sectionId: 'section-contatto', placeholder: 'Es. +39 02 1234567' },
        { name: 'serviceType', label: 'Tipo di Servizio', type: 'SELECT', required: true, options: ['Formazione Sicurezza', 'Nomina RSPP', 'Medicina del Lavoro', 'Consulenza DVR', 'Altro'], order: 1, sectionId: 'section-richiesta' },
        { name: 'numEmployees', label: 'Numero Dipendenti', type: 'NUMBER', required: true, order: 2, sectionId: 'section-richiesta', placeholder: 'Es. 50' },
        { name: 'riskLevel', label: 'Livello di Rischio', type: 'RADIO', required: true, options: ['Basso', 'Medio', 'Alto'], order: 3, sectionId: 'section-richiesta' },
        { name: 'description', label: 'Descrizione Richiesta', type: 'TEXTAREA', required: true, order: 4, sectionId: 'section-richiesta', placeholder: 'Descrivi la tua richiesta...' },
        { name: 'urgency', label: 'Urgenza', type: 'SELECT', required: false, options: ['Normale', 'Urgente', 'Molto Urgente'], order: 5, sectionId: 'section-richiesta' },
        { name: 'notes', label: 'Note Aggiuntive', type: 'TEXTAREA', required: false, order: 6, sectionId: 'section-richiesta', placeholder: 'Eventuali note...' }
      ]
    },
    {
      name: 'Test Sicurezza sul Lavoro',
      description: 'Quiz ECM sulla sicurezza',
      type: 'COURSE_TEST',
      isPublic: false,
      allowAnonymous: false,
      settings: {
        passingScore: 18,
        maxScore: 30,
        timeLimit: 1800,
        sections: [
          { id: 'section-quiz', order: 0, title: 'Quiz', collapsible: false, description: 'Rispondi alle domande' }
        ]
      },
      fields: [
        { name: 'q1', label: 'Definizione di DPI?', type: 'RADIO', required: true, options: ['A) Dispositivo Protezione Individuale', 'B) Documento Prevenzione', 'C) Altro'], scoring: { correctAnswer: 'A) Dispositivo Protezione Individuale', points: 3 }, order: 1, sectionId: 'section-quiz' }
      ]
    },
    {
      id: 'demo-conditional-sections',
      name: 'Iscrizione Corso - Demo Sezioni Condizionali',
      description: 'Form dimostrativo con sezioni che appaiono in base alle risposte precedenti',
      type: 'COURSE_ENROLLMENT',
      isPublic: true,
      allowAnonymous: true,
      settings: {
        sections: [
          { id: 'section-base', order: 0, title: 'Informazioni di Base', collapsible: false, description: 'Dati personali e di contatto' },
          { id: 'section-company', order: 1, title: 'Informazioni Azienda', collapsible: true, conditional: { simple: { field: 'userType', operator: 'equals', value: 'company' } }, description: 'Compilare solo se si rappresenta un\'azienda', defaultCollapsed: false },
          { id: 'section-course', order: 2, title: 'Selezione Corso', collapsible: false, description: 'Scegli il corso che ti interessa' },
          { id: 'section-advanced', order: 3, title: 'Corsi Avanzati', collapsible: true, conditional: { simple: { field: 'courseLevel', operator: 'equals', value: 'advanced' } }, description: 'Opzioni aggiuntive per corsi avanzati' }
        ]
      },
      fields: [
        { id: 'field-name', name: 'name', label: 'Nome Completo', type: 'TEXT', required: true, placeholder: 'Mario Rossi', sectionId: 'section-base', order: 1 },
        { id: 'field-email', name: 'email', label: 'Email', type: 'EMAIL', required: true, placeholder: 'mario@example.com', sectionId: 'section-base', order: 2 },
        { id: 'field-phone', name: 'phone', label: 'Telefono', type: 'tel', required: true, placeholder: '+39 123 456 7890', sectionId: 'section-base', order: 3 },
        { id: 'field-usertype', name: 'userType', label: 'Tipo di Utente', type: 'radio', required: true, options: [{ label: 'Privato', value: 'private' }, { label: 'Azienda', value: 'company' }], sectionId: 'section-base', order: 4 },
        { id: 'field-company-name', name: 'companyName', label: 'Ragione Sociale', type: 'TEXT', required: true, placeholder: 'Acme S.r.l.', sectionId: 'section-company', order: 1 },
        { id: 'field-company-vat', name: 'companyVat', label: 'Partita IVA', type: 'TEXT', required: true, placeholder: 'IT12345678901', sectionId: 'section-company', order: 2 },
        { id: 'field-company-employees', name: 'employeeCount', label: 'Numero Dipendenti', type: 'NUMBER', required: false, placeholder: '10', sectionId: 'section-company', order: 3 },
        { id: 'field-courselevel', name: 'courseLevel', label: 'Livello Corso', type: 'select', required: true, options: [{ label: 'Base', value: 'basic' }, { label: 'Intermedio', value: 'intermediate' }, { label: 'Avanzato', value: 'advanced' }], sectionId: 'section-course', order: 1 },
        { id: 'field-course', name: 'course', label: 'Corso di Interesse', type: 'select', required: true, options: [{ label: 'Sicurezza sul Lavoro', value: 'safety' }, { label: 'Primo Soccorso', value: 'firstaid' }, { label: 'Antincendio', value: 'fire' }], sectionId: 'section-course', order: 2 },
        { id: 'field-certification', name: 'needsCertification', label: 'Necessita Certificazione?', type: 'radio', required: true, options: [{ label: 'Sì', value: 'yes' }, { label: 'No', value: 'no' }], sectionId: 'section-advanced', order: 1 },
        { id: 'field-prev-cert', name: 'previousCertification', label: 'Numero Certificazione Precedente', type: 'TEXT', required: false, placeholder: 'CERT-12345', conditional: { simple: { field: 'needsCertification', operator: 'equals', value: 'yes' } }, sectionId: 'section-advanced', order: 2 },
        { id: 'field-notes', name: 'notes', label: 'Note Aggiuntive', type: 'textarea', required: false, placeholder: 'Eventuali richieste particolari...', sectionId: 'section-advanced', order: 3 }
      ]
    }
  ];

  let created = 0;
  let updated = 0;

  for (const templateData of templates) {
    const existing = await prisma.form_templates.findFirst({
      where: { name: templateData.name, tenantId: tenant.id },
      include: { form_fields: true }
    });

    if (!existing) {
      // Crea nuovo template
      const template = await prisma.form_templates.create({
        data: {
          id: templateData.id || crypto.randomUUID(),
          name: templateData.name,
          description: templateData.description,
          type: templateData.type,
          isPublic: templateData.isPublic,
          allowAnonymous: templateData.allowAnonymous,
          settings: templateData.settings || null,
          schema: {},
          isActive: true,
          version: 1,
          tenantId: tenant.id
        }
      });

      for (const fieldData of templateData.fields) {
        await prisma.form_fields.create({
          data: {
            id: fieldData.id || crypto.randomUUID(),
            templateId: template.id,
            name: fieldData.name,
            label: fieldData.label,
            type: fieldData.type,
            required: fieldData.required,
            sectionId: fieldData.sectionId || null,
            placeholder: fieldData.placeholder || null,
            options: fieldData.options || null,
            validation: fieldData.validation || null,
            conditional: fieldData.conditional || null,
            scoring: fieldData.scoring || null,
            order: fieldData.order,
            isActive: true
          }
        });
      }

      console.log(`✅ Creato template: ${template.name} con ${templateData.fields.length} campi`);
      created++;
    } else if (existing.form_fields.length === 0) {
      // Template esiste ma non ha campi - aggiungili
      // Aggiorna anche le settings con le sezioni
      await prisma.form_templates.update({
        where: { id: existing.id },
        data: { settings: templateData.settings || null }
      });

      for (const fieldData of templateData.fields) {
        await prisma.form_fields.create({
          data: {
            id: fieldData.id || crypto.randomUUID(),
            templateId: existing.id,
            name: fieldData.name,
            label: fieldData.label,
            type: fieldData.type,
            required: fieldData.required,
            sectionId: fieldData.sectionId || null,
            placeholder: fieldData.placeholder || null,
            options: fieldData.options || null,
            validation: fieldData.validation || null,
            conditional: fieldData.conditional || null,
            scoring: fieldData.scoring || null,
            order: fieldData.order,
            isActive: true
          }
        });
      }

      console.log(`🔄 Aggiornato template: ${existing.name} - aggiunti ${templateData.fields.length} campi`);
      updated++;
    } else {
      console.log(`⏭️  Template esistente con campi: ${templateData.name} (${existing.form_fields.length} campi)`);
    }
  }

  console.log(`📊 Form templates: ${created} creati, ${updated} aggiornati`);
}

// Document Templates Seed (TemplateLink per PDF generation)
async function seedDocumentTemplates() {
  const tenant = await prisma.tenant.findFirst({
    where: { slug: { in: ['element-medica', 'default-company'] } }
  });

  if (!tenant) {
    console.log('⚠️  Nessun tenant trovato, skip document templates');
    return;
  }

  let created = 0;

  // Template Preventivo Default (ex Ultra Elegante V5)
  const preventivoTemplate = {
    name: 'Preventivo Default',
    type: 'PREVENTIVO',
    isDefault: true,
    version: 6,
    content: `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <title>Preventivo {{preventivo.numeroProgressivo}}/{{preventivo.annoProgressivo}}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
      font-size: 8.5pt; 
      line-height: 1.3; 
      color: #1a1a1a; 
      background: white;
    }
    
    .container { max-width: 750px; margin: 0 auto; padding: 0; }
    
    /* Header azienda mittente */
    .company-header {
      background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
      color: white;
      padding: 12px 18px;
      border-radius: 6px 6px 0 0;
      margin-bottom: 0;
    }
    
    .company-header h1 { font-size: 13pt; font-weight: 700; margin-bottom: 4px; letter-spacing: 0.2px; }
    .company-header .company-details { font-size: 7pt; opacity: 0.95; display: flex; flex-wrap: wrap; gap: 8px; margin-top: 5px; }
    .company-header .company-details span { display: inline-flex; align-items: center; }
    
    /* Header documento */
    .doc-header { background: #f8fafc; border-left: 3px solid #2563eb; padding: 10px 18px; margin-bottom: 12px; }
    .doc-header h2 { color: #1e40af; font-size: 11pt; font-weight: 600; margin-bottom: 4px; }
    .doc-meta { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 6px; font-size: 7.5pt; color: #475569; }
    
    /* Sezioni */
    .section { margin-bottom: 10px; padding: 0 18px; }
    .section-title { font-size: 9pt; font-weight: 700; color: #1e40af; margin-bottom: 6px; padding-bottom: 2px; border-bottom: 1.5px solid #e2e8f0; text-transform: uppercase; letter-spacing: 0.4px; }
    
    /* Griglia destinatario */
    .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px 12px; background: #f9fafb; padding: 8px; border-radius: 4px; border: 1px solid #e5e7eb; }
    .info-item { display: flex; flex-direction: column; gap: 1px; }
    .info-label { font-weight: 700; color: #64748b; font-size: 6.5pt; text-transform: uppercase; letter-spacing: 0.2px; }
    .info-value { font-size: 8pt; color: #0f172a; font-weight: 500; }
    
    /* Dettagli corso */
    .course-details { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 4px; padding: 8px 10px; }
    .course-details p { margin-bottom: 4px; font-size: 8pt; }
    .course-details strong { color: #1e40af; font-weight: 700; display: inline-block; min-width: 90px; }
    
    /* Tabella prezzi - ULTRA ELEGANTE E LEGGIBILE */
    .price-table { 
      width: 100%; 
      border-collapse: separate; 
      border-spacing: 0; 
      margin: 10px 0; 
      border-radius: 8px; 
      overflow: hidden; 
      border: 1px solid #e2e8f0;
    }
    
    /* Header tabella - PIÙ LEGGIBILE */
    .price-table thead { 
      background: linear-gradient(to bottom, #3b82f6 0%, #2563eb 100%) !important; 
      color: white !important; 
    }
    .price-table th { 
      padding: 10px 12px; 
      text-align: left; 
      font-weight: 600; 
      font-size: 9pt; 
      text-transform: uppercase; 
      letter-spacing: 0.5px;
      border-bottom: 2px solid rgba(255, 255, 255, 0.2);
    }
    .price-table th:nth-child(2) { text-align: center; width: 80px; }
    .price-table th:nth-child(3) { text-align: right; width: 100px; }
    .price-table th:last-child { text-align: right; width: 100px; }
    
    /* Righe normali - BIANCO PURO */
    .price-table tbody tr { 
      background: white; 
      transition: background-color 0.2s ease; 
    }
    .price-table tbody tr:hover { 
      background: #f8fafc; 
    }
    
    .price-table td { 
      padding: 10px 12px; 
      border-bottom: 1px solid #f1f5f9; 
      font-size: 8.5pt; 
    }
    .price-table tbody tr:last-child td { border-bottom: none; }
    .price-table td.label { color: #374151; font-weight: 500; }
    .price-table td.qty { text-align: center; font-family: 'Courier New', monospace; font-weight: 600; color: #475569; }
    .price-table td.unit-price { text-align: right; font-family: 'Courier New', monospace; font-weight: 500; color: #64748b; }
    .price-table td.value { text-align: right; font-family: 'Courier New', monospace; font-weight: 600; color: #0f172a; }
    
    /* Riga sconto - VERDE */
    .price-table tr.discount { background: #f0fdf4 !important; }
    .price-table tr.discount td { color: #059669; font-weight: 600; }
    
    /* Riga subtotal - AZZURRO CHIARO */
    .price-table tr.subtotal { 
      background: #eff6ff !important; 
      border-top: 2px solid #bfdbfe; 
    }
    .price-table tr.subtotal td { 
      font-weight: 700; 
      color: #1e40af; 
      padding-top: 10px;
      padding-bottom: 8px;
    }
    
    /* Riga total - BLU ELEGANTE */
    .price-table tr.total { 
      background: linear-gradient(to right, #2563eb 0%, #1d4ed8 100%) !important; 
    }
    .price-table tr.total td { 
      border-top: none; 
      border-bottom: none; 
      padding: 12px 12px; 
      font-size: 10pt; 
      color: white; 
      font-weight: 700; 
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2); 
    }
    .price-table tr.total td.value { 
      font-size: 11pt; 
      letter-spacing: 0.3px; 
    }
    
    /* Note */
    .notes-section { background: #fffbeb; border-left: 3px solid #f59e0b; padding: 8px 10px; border-radius: 3px; margin-top: 3px; }
    .notes-section .section-title { color: #b45309; border-bottom-color: #fde047; margin-bottom: 5px; font-size: 8pt; }
    .notes-section p { font-size: 7.5pt; color: #78350f; line-height: 1.5; }
    
    /* Footer */
    .footer { 
      margin-top: 14px; 
      padding: 10px 18px; 
      background: #f8fafc; 
      border-top: 1px solid #e2e8f0; 
      font-size: 6.5pt; 
      color: #64748b; 
      border-radius: 0 0 6px 6px;
    }
    .footer p { margin-bottom: 2px; line-height: 1.3; }
    .footer strong { color: #334155; }
    
    /* Badge stato */
    .badge { display: inline-block; padding: 3px 8px; border-radius: 999px; font-size: 7pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px; }
    .badge.bozza { background: #fef3c7; color: #92400e; border: 1px solid #fbbf24; }
    .badge.inviato { background: #dbeafe; color: #1e40af; border: 1px solid #3b82f6; }
    .badge.accettato { background: #d1fae5; color: #065f46; border: 1px solid #10b981; }
  
    /* Fix per garantire stili header tabella */
    thead th,
    .price-table thead th {
      background: linear-gradient(to bottom, #3b82f6 0%, #2563eb 100%) !important;
      color: white !important;
    }
    </style>
</head>
<body>
  <div class="container">
    <!-- Header Azienda Mittente -->
    <div class="company-header">
      <h1>Element Medica Training S.r.l.</h1>
      <div class="company-details">
        <span>📍 Via Example 123, 20100 Milano (MI)</span>
        <span>📧 info@elementmedica.it</span>
        <span>📞 +39 02 1234567</span>
        <span>P.IVA: 12345678901</span>
      </div>
    </div>
    
    <!-- Header Documento -->
    <div class="doc-header">
      <h2>Preventivo N° {{preventivo.numeroProgressivo}}/{{preventivo.annoProgressivo}}</h2>
      <div class="doc-meta">
        <span><strong>Data Emissione:</strong> {{preventivo.dataEmissione}}</span>
        <span><strong>Valido fino al:</strong> {{preventivo.dataScadenza}}</span>
        <span class="badge {{preventivo.stato}}">{{preventivo.stato}}</span>
      </div>
    </div>
    
    <!-- Destinatario -->
    <div class="section">
      <div class="section-title">Spett.le Cliente</div>
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">Ragione Sociale</span>
          <span class="info-value">{{company.name}}</span>
        </div>
        <div class="info-item">
          <span class="info-label">P.IVA / C.F.</span>
          <span class="info-value">{{company.vatNumber}}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Indirizzo</span>
          <span class="info-value">{{company.address.full}}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Email</span>
          <span class="info-value">{{company.email}}</span>
        </div>
      </div>
    </div>
    
    <!-- Dettagli Corso (se servizio CORSO) -->
    <div class="section">
      <div class="section-title">Dettagli Servizio</div>
      <div class="course-details">
        <p><strong>Tipologia:</strong> {{preventivo.tipoServizio}}</p>
        {{#if course.title}}
        <p><strong>Corso:</strong> {{course.title}}</p>
        <p><strong>Durata:</strong> {{course.duration}} ore</p>
        <p><strong>Livello Rischio:</strong> {{course.riskLevel}}</p>
        <p><strong>Tipo Corso:</strong> {{course.courseType}}</p>
        <p><strong>Normativa:</strong> {{course.regulation}}</p>
        {{/if}}
        <p><strong>Partecipanti:</strong> {{preventivo.numPartecipanti}}</p>
      </div>
    </div>
    
    <!-- Riepilogo Economico -->
    <div class="section">
      <div class="section-title">Riepilogo Economico</div>
      <table class="price-table">
        <thead>
          <tr>
            <th>Descrizione</th>
            <th>Quantità</th>
            <th>Prezzo Unit.</th>
            <th>Totale</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="label">{{preventivo.tipoServizio}} - {{#if course.title}}{{course.title}}{{/if}}</td>
            <td class="qty">{{preventivo.numPartecipanti}}</td>
            <td class="unit-price">€ {{preventivo.prezzoUnitario}}</td>
            <td class="value">€ {{preventivo.prezzoTotale}}</td>
          </tr>
          {{#if preventivo.speseAccessorie}}
          <tr>
            <td class="label">Spese accessorie</td>
            <td class="qty">-</td>
            <td class="unit-price">-</td>
            <td class="value">€ {{preventivo.speseAccessorie}}</td>
          </tr>
          {{/if}}
          {{#if preventivo.scontoApplicato}}
          <tr class="discount">
            <td class="label">Sconto applicato</td>
            <td class="qty">-</td>
            <td class="unit-price">-</td>
            <td class="value">- € {{preventivo.importoSconto}}</td>
          </tr>
          {{/if}}
          <tr class="subtotal">
            <td colspan="3" class="label">Imponibile</td>
            <td class="value">€ {{preventivo.imponibile}}</td>
          </tr>
          <tr class="subtotal">
            <td colspan="3" class="label">IVA ({{preventivo.percentualeIva}}%)</td>
            <td class="value">€ {{preventivo.importoIva}}</td>
          </tr>
          <tr class="total">
            <td colspan="3" class="label">TOTALE PREVENTIVO</td>
            <td class="value">€ {{preventivo.importoFinale}}</td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <!-- Note (SOLO se compilato) -->
    {{#if preventivo.note}}
    <div class="section">
      <div class="notes-section">
        <div class="section-title">Note</div>
        <p>{{preventivo.note}}</p>
      </div>
    </div>
    {{/if}}
    
    <!-- Footer -->
    <div class="footer">
      <p><strong>Validità Offerta:</strong> Il presente preventivo è valido fino al {{preventivo.dataScadenza}}</p>
      <p><strong>Condizioni di Pagamento:</strong> Da concordare</p>
      <p><strong>Documento generato il:</strong> {{current.date}} alle ore {{current.time}}</p>
    </div>
  </div>
</body>
</html>`
  };

  // Check if template already exists
  const existingPreventivo = await prisma.templateLink.findFirst({
    where: {
      name: preventivoTemplate.name,
      tenantId: tenant.id,
      deletedAt: null
    }
  });

  if (!existingPreventivo) {
    await prisma.templateLink.create({
      data: {
        id: crypto.randomUUID(),
        name: preventivoTemplate.name,
        url: `template://preventivo-${crypto.randomUUID().slice(0, 8)}`,
        type: preventivoTemplate.type,
        content: preventivoTemplate.content,
        isDefault: preventivoTemplate.isDefault,
        version: preventivoTemplate.version,
        tenantId: tenant.id,
        isActive: true
      }
    });
    console.log(`✅ Creato template: ${preventivoTemplate.name}`);
    created++;
  } else {
    console.log(`⏭️  Template esistente: ${preventivoTemplate.name}`);
  }

  // ========================================
  // Template Attestato Default (ex Orizzontale Fullscreen)
  // ========================================
  const attestatoLandscapeTemplate = {
    name: 'Template Attestato Default',
    type: 'CERTIFICATE',
    isDefault: true,
    version: 1,
    content: `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <title>Attestato {{certificate.registrationNumber}}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 0;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Georgia', 'Times New Roman', serif;
      font-size: 11pt;
      color: #1a1a1a;
      background: white;
      width: 297mm;
      min-height: 210mm;
    }
    
    /* Layout principale con linea divisoria verticale */
    .document-container {
      display: flex;
      width: 100%;
      min-height: 210mm;
    }
    
    /* Sidebar sinistra */
    .sidebar {
      width: 50mm;
      background: linear-gradient(180deg, #1e40af 0%, #3b82f6 100%);
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 15mm 5mm;
      position: relative;
    }
    
    .logo-container {
      width: 35mm;
      height: 35mm;
      background: white;
      border-radius: 50%;
      padding: 3mm;
      margin-bottom: 8mm;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .logo-container img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }
    
    .logo-placeholder {
      font-size: 9pt;
      color: #64748b;
      text-align: center;
    }
    
    .sidebar-text {
      writing-mode: vertical-rl;
      text-orientation: mixed;
      transform: rotate(180deg);
      font-size: 18pt;
      font-weight: 700;
      color: white;
      letter-spacing: 3px;
      text-transform: uppercase;
      margin-top: 15mm;
      text-shadow: 1px 1px 2px rgba(0,0,0,0.2);
    }
    
    /* QR Code nella sidebar */
    .sidebar-qr {
      position: absolute;
      bottom: 15mm;
      text-align: center;
    }
    
    .sidebar-qr img {
      width: 25mm;
      height: 25mm;
      background: white;
      padding: 2mm;
      border-radius: 3mm;
    }
    
    .sidebar-qr-label {
      font-size: 7pt;
      color: rgba(255,255,255,0.8);
      margin-top: 2mm;
    }
    
    /* Contenuto principale */
    .main-content {
      flex: 1;
      padding: 12mm 20mm;
      display: flex;
      flex-direction: column;
    }
    
    /* Header con info ente */
    .header-section {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 8mm;
      padding-bottom: 5mm;
      border-bottom: 2px solid #e2e8f0;
    }
    
    .ente-info {
      font-size: 9pt;
      color: #64748b;
    }
    
    .ente-info strong {
      color: #1e40af;
      font-size: 11pt;
      display: block;
      margin-bottom: 2mm;
    }
    
    .certificate-info {
      text-align: right;
      font-size: 9pt;
    }
    
    .certificate-number {
      font-size: 11pt;
      font-weight: 700;
      color: #1e40af;
      margin-bottom: 2mm;
    }
    
    /* Titolo documento */
    .document-title {
      text-align: center;
      font-size: 32pt;
      font-weight: 700;
      color: #1a1a1a;
      margin-bottom: 8mm;
      letter-spacing: 5px;
      text-transform: uppercase;
    }
    
    .document-subtitle {
      text-align: center;
      font-size: 12pt;
      color: #64748b;
      margin-bottom: 10mm;
    }
    
    /* Corpo attestato */
    .attestato-body {
      flex: 1;
      font-size: 11pt;
      line-height: 1.9;
    }
    
    .certification-text {
      text-align: center;
      margin-bottom: 6mm;
    }
    
    .person-name {
      font-size: 18pt;
      font-weight: 700;
      color: #1e40af;
      display: block;
      margin: 3mm 0;
    }
    
    .person-cf {
      font-size: 10pt;
      color: #64748b;
    }
    
    .course-box {
      text-align: center;
      background: linear-gradient(90deg, #f8fafc 0%, #f1f5f9 50%, #f8fafc 100%);
      border-left: 4px solid #1e40af;
      border-right: 4px solid #1e40af;
      padding: 6mm 15mm;
      margin: 8mm 20mm;
    }
    
    .course-title {
      font-size: 16pt;
      font-weight: 700;
      color: #1a1a1a;
      margin-bottom: 3mm;
    }
    
    .course-regulation {
      font-size: 10pt;
      color: #64748b;
      font-style: italic;
    }
    
    /* Grid dettagli 2 colonne */
    .details-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4mm 15mm;
      margin: 8mm 0;
      padding: 0 10mm;
    }
    
    .detail-item {
      display: flex;
      gap: 2mm;
    }
    
    .detail-label {
      font-weight: 700;
      color: #374151;
      white-space: nowrap;
    }
    
    .detail-value {
      color: #1e40af;
    }
    
    /* Sezione firme */
    .signatures-section {
      display: flex;
      justify-content: space-around;
      margin-top: auto;
      padding-top: 10mm;
      border-top: 1px solid #e2e8f0;
    }
    
    .signature-block {
      text-align: center;
      width: 40%;
    }
    
    .signature-role {
      font-size: 9pt;
      color: #64748b;
      margin-bottom: 2mm;
    }
    
    .signature-name {
      font-size: 11pt;
      font-weight: 600;
      color: #1a1a1a;
      margin-bottom: 12mm;
    }
    
    .signature-line {
      border-bottom: 1px solid #1a1a1a;
      margin: 0 20mm;
    }
    
    .signature-label {
      font-size: 8pt;
      color: #94a3b8;
      margin-top: 2mm;
    }
    
    /* Footer */
    .footer-text {
      text-align: center;
      font-size: 8pt;
      color: #94a3b8;
      margin-top: 8mm;
      font-style: italic;
    }
  </style>
</head>
<body>
  <div class="document-container">
    <!-- Sidebar -->
    <div class="sidebar">
      <div class="logo-container">
        <div class="logo-placeholder">LOGO<br>ENTE</div>
      </div>
      <div class="sidebar-text">Certificato</div>
      
      <div class="sidebar-qr">
        <img src="{{document.qrCode}}" alt="QR" />
        <div class="sidebar-qr-label">Verifica</div>
      </div>
    </div>
    
    <!-- Contenuto Principale -->
    <div class="main-content">
      <!-- Header -->
      <div class="header-section">
        <div class="ente-info">
          <strong>{{tenant.name}}</strong>
          Ente accreditato per la formazione
        </div>
        <div class="certificate-info">
          <div class="certificate-number">N° {{certificate.registrationNumber}}</div>
          <div>Emesso il {{document.date}}</div>
          <div>Valido fino al {{certificate.validUntil}}</div>
        </div>
      </div>
      
      <!-- Titolo -->
      <h1 class="document-title">Attestato</h1>
      <p class="document-subtitle">di frequenza e superamento verifica finale</p>
      
      <!-- Corpo -->
      <div class="attestato-body">
        <p class="certification-text">
          Si certifica che
          <span class="person-name">{{person.fullName}}</span>
          <span class="person-cf">C.F. {{person.cf}}</span>
        </p>
        
        <p class="certification-text">
          dipendente di <strong>{{company.name}}</strong> (P.IVA {{company.vatNumber}})
          ha frequentato con profitto il corso di formazione:
        </p>
        
        <div class="course-box">
          <div class="course-title">{{course.title}}</div>
          <div class="course-regulation">{{course.regulation}}</div>
        </div>
        
        <div class="details-grid">
          <div class="detail-item">
            <span class="detail-label">Periodo:</span>
            <span class="detail-value">dal {{schedule.startDate}} al {{schedule.endDate}}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Durata:</span>
            <span class="detail-value">{{schedule.totalHours}} ore</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Modalità:</span>
            <span class="detail-value">{{schedule.deliveryMode}}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Sede:</span>
            <span class="detail-value">{{schedule.location}}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Settore ATECO:</span>
            <span class="detail-value">{{company.codiceAteco}}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Profilo:</span>
            <span class="detail-value">{{person.title}}</span>
          </div>
        </div>
      </div>
      
      <!-- Firme -->
      <div class="signatures-section">
        <div class="signature-block">
          <div class="signature-role">Il Responsabile del Corso</div>
          <div class="signature-name">{{tenant.name}}</div>
          <div class="signature-line"></div>
          <div class="signature-label">Firma e Timbro</div>
        </div>
        
        <div class="signature-block">
          <div class="signature-role">Il Docente</div>
          <div class="signature-name">{{trainer.fullName}}</div>
          <div class="signature-line"></div>
          <div class="signature-label">Firma</div>
        </div>
      </div>
      
      <p class="footer-text">
        Documento generato in data {{current.date}} - Riproduzione vietata - Validare tramite QR code
      </p>
    </div>
  </div>
</body>
</html>`
  };

  const existingAttestatoLandscape = await prisma.templateLink.findFirst({
    where: {
      name: attestatoLandscapeTemplate.name,
      tenantId: tenant.id,
      deletedAt: null
    }
  });

  if (!existingAttestatoLandscape) {
    await prisma.templateLink.create({
      data: {
        id: crypto.randomUUID(),
        name: attestatoLandscapeTemplate.name,
        url: `template://certificate-landscape-${crypto.randomUUID().slice(0, 8)}`,
        type: attestatoLandscapeTemplate.type,
        content: attestatoLandscapeTemplate.content,
        isDefault: attestatoLandscapeTemplate.isDefault,
        version: attestatoLandscapeTemplate.version,
        tenantId: tenant.id,
        isActive: true
      }
    });
    console.log(`✅ Creato template: ${attestatoLandscapeTemplate.name}`);
    created++;
  } else {
    console.log(`⏭️  Template esistente: ${attestatoLandscapeTemplate.name}`);
  }

  // ========================================
  // Template Attestato Professionale
  // ========================================
  const attestatoTemplate = {
    name: 'Attestato Professionale FPI',
    type: 'CERTIFICATE',
    isDefault: false,  // Non default - usa Attestato Orizzontale Fullscreen
    version: 1,
    content: `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <title>Attestato {{certificate.registrationNumber}}</title>
  <style>
    @page {
      size: A4;
      margin: 0;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Georgia', 'Times New Roman', serif;
      font-size: 11pt;
      color: #1a1a1a;
      background: white;
      width: 210mm;
      min-height: 297mm;
      padding: 15mm 20mm;
    }
    
    /* Layout principale con linea divisoria */
    .document-layout {
      display: flex;
      min-height: 267mm;
    }
    
    /* Sidebar sinistra con logo */
    .sidebar {
      width: 55mm;
      padding-right: 8mm;
      border-right: 2px solid #2563eb;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding-top: 10mm;
    }
    
    .logo-container {
      width: 45mm;
      height: 45mm;
      margin-bottom: 10mm;
    }
    
    .logo-container img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    
    .logo-placeholder {
      width: 45mm;
      height: 45mm;
      border: 2px dashed #94a3b8;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f8fafc;
      color: #64748b;
      font-size: 9pt;
      text-align: center;
    }
    
    .sidebar-text {
      writing-mode: vertical-rl;
      text-orientation: mixed;
      transform: rotate(180deg);
      font-size: 16pt;
      font-weight: 700;
      color: #1e40af;
      letter-spacing: 2px;
      margin-top: 20mm;
    }
    
    /* Contenuto principale */
    .main-content {
      flex: 1;
      padding-left: 10mm;
      display: flex;
      flex-direction: column;
    }
    
    /* Titolo documento */
    .document-title {
      text-align: center;
      font-size: 28pt;
      font-weight: 700;
      color: #1a1a1a;
      margin-bottom: 12mm;
      letter-spacing: 3px;
      text-transform: uppercase;
    }
    
    /* Corpo attestato */
    .attestato-body {
      font-size: 11pt;
      line-height: 1.8;
      text-align: justify;
      flex: 1;
    }
    
    .attestato-body p {
      margin-bottom: 6mm;
    }
    
    .person-name {
      font-size: 14pt;
      font-weight: 700;
      color: #1e40af;
    }
    
    .course-title {
      font-size: 16pt;
      font-weight: 700;
      color: #1a1a1a;
      text-align: center;
      margin: 8mm 0;
      padding: 5mm;
      border-top: 1px solid #e2e8f0;
      border-bottom: 1px solid #e2e8f0;
    }
    
    .regulation {
      font-size: 10pt;
      color: #64748b;
      font-style: italic;
    }
    
    .detail-row {
      margin: 4mm 0;
    }
    
    .detail-label {
      font-weight: 700;
      color: #374151;
    }
    
    .detail-value {
      color: #1e40af;
    }
    
    /* Firme */
    .signatures {
      display: flex;
      justify-content: space-between;
      margin-top: 15mm;
      padding-top: 10mm;
    }
    
    .signature-block {
      text-align: center;
      width: 45%;
    }
    
    .signature-line {
      border-bottom: 1px solid #1a1a1a;
      height: 15mm;
      margin-bottom: 3mm;
    }
    
    .signature-placeholder {
      height: 15mm;
      display: flex;
      align-items: flex-end;
      justify-content: center;
    }
    
    .signature-placeholder img {
      max-height: 15mm;
      max-width: 100%;
    }
    
    .signature-label {
      font-size: 9pt;
      color: #64748b;
    }
    
    .signature-name {
      font-size: 10pt;
      font-weight: 600;
    }
    
    /* Footer */
    .footer-note {
      text-align: center;
      font-size: 8pt;
      color: #94a3b8;
      margin-top: 10mm;
      font-style: italic;
    }
    
    /* QR Code */
    .qr-section {
      position: absolute;
      bottom: 15mm;
      right: 20mm;
      text-align: center;
    }
    
    .qr-section img {
      width: 25mm;
      height: 25mm;
    }
    
    .qr-label {
      font-size: 7pt;
      color: #94a3b8;
      margin-top: 2mm;
    }
  </style>
</head>
<body>
  <div class="document-layout">
    <!-- Sidebar con Logo -->
    <div class="sidebar">
      <div class="logo-container">
        <!-- Logo placeholder - può essere sostituito con {{tenant.logo}} -->
        <div class="logo-placeholder">LOGO<br>ENTE</div>
      </div>
      <div class="sidebar-text">Formazione<br>per Impresa</div>
    </div>
    
    <!-- Contenuto Principale -->
    <div class="main-content">
      <h1 class="document-title">ATTESTATO</h1>
      
      <div class="attestato-body">
        <p>
          Si attesta che <span class="person-name">{{person.fullName}}</span>, 
          <span class="detail-value">{{person.cf}}</span> in qualità di lavoratore/trice 
          (ai sensi dell'art.2 del Decreto Legislativo 9 aprile 2008 n.81 e s.m.i.) 
          presso <span class="detail-value">{{company.name}}</span>,
          ha frequentato il corso di formazione:
        </p>
        
        <div class="course-title">{{course.title}}</div>
        
        <p class="regulation">{{course.regulation}}</p>
        
        <p>
          svoltosi nel periodo dal <span class="detail-value">{{schedule.startDate}}</span> 
          al <span class="detail-value">{{schedule.endDate}}</span> per un totale 
          complessivo di <span class="detail-value">{{schedule.totalHours}}</span> ore.
        </p>
        
        <div class="detail-row">
          <span class="detail-label">Tipologia di svolgimento:</span> 
          erogato in <span class="detail-value">{{schedule.deliveryMode}}</span> con superamento della verifica finale di apprendimento
        </div>
        
        <div class="detail-row">
          <span class="detail-label">Settore Ateco di riferimento:</span> 
          <span class="detail-value">{{company.codiceAteco}}</span>
        </div>
        
        <div class="detail-row">
          <span class="detail-label">Profilo professionale:</span> 
          <span class="detail-value">{{person.title}}</span>
        </div>
        
        <div class="detail-row">
          <span class="detail-label">Contenuti:</span> 
          <span class="detail-value">{{course.topics}}</span>
        </div>
        
        <div class="detail-row">
          <span class="detail-label">Data emissione certificato:</span> 
          <span class="detail-value">{{schedule.endDate}}</span>
        </div>
      </div>
      
      <!-- Firme -->
      <div class="signatures">
        <div class="signature-block">
          <div class="signature-label">Il Soggetto Organizzatore:</div>
          <div class="signature-name">{{tenant.name}}</div>
          <div class="signature-placeholder">
            <!-- Firma placeholder -->
          </div>
          <div class="signature-line"></div>
        </div>
        
        <div class="signature-block">
          <div class="signature-label">Il Formatore:</div>
          <div class="signature-name">{{trainer.fullName}}</div>
          <div class="signature-placeholder">
            <!-- Firma formatore -->
          </div>
          <div class="signature-line"></div>
        </div>
      </div>
      
      <p class="footer-note">Riproduzione vietata</p>
    </div>
  </div>
  
  <!-- QR Code per verifica -->
  <div class="qr-section">
    <img src="{{document.qrCode}}" alt="QR Verifica" />
    <div class="qr-label">Scansiona per verificare</div>
  </div>
</body>
</html>`
  };

  const existingAttestato = await prisma.templateLink.findFirst({
    where: {
      name: attestatoTemplate.name,
      tenantId: tenant.id,
      deletedAt: null
    }
  });

  if (!existingAttestato) {
    await prisma.templateLink.create({
      data: {
        id: crypto.randomUUID(),
        name: attestatoTemplate.name,
        url: `template://certificate-${crypto.randomUUID().slice(0, 8)}`,
        type: attestatoTemplate.type,
        content: attestatoTemplate.content,
        isDefault: attestatoTemplate.isDefault,
        version: attestatoTemplate.version,
        tenantId: tenant.id,
        isActive: true
      }
    });
    console.log(`✅ Creato template: ${attestatoTemplate.name}`);
    created++;
  } else {
    console.log(`⏭️  Template esistente: ${attestatoTemplate.name}`);
  }

  // ========================================
  // Template Lettera di Incarico Default (ex Professionale)
  // ========================================
  const letteraIncaricoTemplate = {
    name: 'Lettera di Incarico Default',
    type: 'LETTER_OF_ENGAGEMENT',
    isDefault: true,
    version: 1,
    content: `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <title>Lettera di Incarico</title>
  <style>
    @page {
      size: A4;
      margin: 0;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Arial', sans-serif;
      font-size: 10pt;
      color: #1a1a1a;
      background: white;
    }
    
    /* Contenitore pagina */
    .page {
      width: 210mm;
      min-height: 297mm;
      padding: 15mm 20mm;
      position: relative;
    }
    
    /* Header a 3 colonne con tabella */
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 10mm;
    }
    
    .header-table td {
      border: 1px solid #1a1a1a;
      vertical-align: middle;
      padding: 5mm;
    }
    
    .header-logo {
      width: 35mm;
      text-align: center;
    }
    
    .header-logo img {
      max-width: 30mm;
      max-height: 25mm;
    }
    
    .logo-placeholder {
      width: 30mm;
      height: 25mm;
      border: 1px dashed #94a3b8;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto;
      font-size: 8pt;
      color: #64748b;
    }
    
    .header-title {
      text-align: center;
      font-size: 14pt;
      font-weight: 700;
    }
    
    .header-info {
      width: 35mm;
      font-size: 9pt;
      text-align: right;
    }
    
    .header-info p {
      margin: 1mm 0;
    }
    
    /* Destinatario */
    .destinatario {
      margin: 10mm 0;
      padding-left: 50%;
    }
    
    .destinatario p {
      margin: 1mm 0;
    }
    
    .destinatario .label {
      font-weight: 600;
    }
    
    /* Corpo lettera */
    .letter-body {
      margin: 10mm 0;
      text-align: justify;
      line-height: 1.6;
    }
    
    .letter-body p {
      margin-bottom: 5mm;
    }
    
    .letter-body h3 {
      font-size: 11pt;
      margin: 8mm 0 4mm 0;
      color: #1e40af;
    }
    
    .course-info {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: 5mm;
      margin: 5mm 0;
    }
    
    .course-info p {
      margin: 2mm 0;
    }
    
    .highlight {
      font-weight: 700;
      color: #1e40af;
    }
    
    /* Lista puntata */
    .list-section {
      margin: 5mm 0;
    }
    
    .list-section ol, .list-section ul {
      margin-left: 8mm;
    }
    
    .list-section li {
      margin: 2mm 0;
    }
    
    /* Compenso */
    .compenso-box {
      background: #eff6ff;
      border: 2px solid #2563eb;
      padding: 5mm;
      margin: 8mm 0;
      border-radius: 4px;
    }
    
    .compenso-box .amount {
      font-size: 14pt;
      font-weight: 700;
      color: #1e40af;
    }
    
    /* Firme */
    .signatures {
      display: flex;
      justify-content: space-between;
      margin-top: 15mm;
    }
    
    .signature-block {
      width: 45%;
    }
    
    .signature-line {
      border-bottom: 1px solid #1a1a1a;
      height: 20mm;
      margin-bottom: 2mm;
    }
    
    .signature-label {
      font-size: 9pt;
      text-align: center;
    }
    
    /* Footer */
    .footer {
      position: absolute;
      bottom: 10mm;
      left: 20mm;
      right: 20mm;
      border-top: 1px solid #e2e8f0;
      padding-top: 5mm;
      font-size: 8pt;
      color: #64748b;
      display: flex;
      justify-content: space-between;
    }
    
    .footer-company {
      font-weight: 600;
      color: #1a1a1a;
    }
    
    /* Page break */
    .page-break {
      page-break-after: always;
    }
  </style>
</head>
<body>
  <div class="page">
    <!-- Header a 3 colonne -->
    <table class="header-table">
      <tr>
        <td class="header-logo">
          <div class="logo-placeholder">LOGO</div>
        </td>
        <td class="header-title">
          Lettera di Incarico
        </td>
        <td class="header-info">
          <p>Pagina 1/3</p>
          <p>Rev. n. 01</p>
          <p>del {{current.date}}</p>
        </td>
      </tr>
    </table>
    
    <!-- Destinatario -->
    <div class="destinatario">
      <p class="label">Gent.</p>
      <p class="highlight">{{trainer.fullName}}</p>
      <p>{{trainer.address.street}}</p>
      <p>{{trainer.address.city}} ({{trainer.address.province}}) - {{trainer.address.postalCode}}</p>
    </div>
    
    <!-- Corpo Lettera -->
    <div class="letter-body">
      <p>
        <strong>Oggetto: Incarico professionale per attività di formazione</strong>
      </p>
      
      <p>
        Con la presente, Le confermiamo l'incarico per lo svolgimento di attività di 
        docenza/formazione relativa al seguente corso:
      </p>
      
      <div class="course-info">
        <p><strong>Corso:</strong> <span class="highlight">{{course.title}}</span></p>
        <p><strong>Codice:</strong> {{course.code}}</p>
        <p><strong>Normativa di riferimento:</strong> {{course.regulation}}</p>
        <p><strong>Durata:</strong> {{course.duration}} ore</p>
        <p><strong>Modalità:</strong> {{schedule.deliveryMode}}</p>
        <p><strong>Date:</strong> dal {{schedule.startDate}} al {{schedule.endDate}}</p>
        <p><strong>Sede:</strong> {{schedule.location}}</p>
      </div>
      
      <h3>Compenso</h3>
      <div class="compenso-box">
        <p>Tariffa oraria: <span class="highlight">{{trainer.hourlyRate}}</span>/ora</p>
        <p>Compenso totale: <span class="amount">{{trainer.totalCompensation}}</span></p>
        <p style="font-size: 9pt; color: #64748b;">(Compenso lordo, al netto di eventuali oneri fiscali e previdenziali)</p>
      </div>
      
      <h3>Obblighi del Formatore</h3>
      <div class="list-section">
        <ol>
          <li>Svolgere l'attività formativa secondo il programma concordato</li>
          <li>Compilare il registro presenze ad ogni sessione</li>
          <li>Predisporre e somministrare i test di verifica dell'apprendimento</li>
          <li>Rilasciare attestazione di partecipazione ai corsisti idonei</li>
          <li>Rispettare la normativa sulla privacy (GDPR)</li>
        </ol>
      </div>
      
      <h3>Allegati</h3>
      <div class="list-section">
        <ol>
          <li>Copia della lettera di incarico controfirmata per il consenso al trattamento dei dati personali e accettazione dell'incarico stesso;</li>
        </ol>
      </div>
      
      <p style="margin-top: 10mm;">
        In attesa di un Suo cortese riscontro, porgiamo cordiali saluti.
      </p>
      
      <p style="margin-top: 5mm;">
        {{schedule.location}}, {{current.date}}
      </p>
    </div>
    
    <!-- Firme -->
    <div class="signatures">
      <div class="signature-block">
        <div class="signature-label">Il Responsabile della Formazione</div>
        <div class="signature-line"></div>
        <div class="signature-label">{{tenant.name}}</div>
      </div>
      
      <div class="signature-block">
        <div class="signature-label">Per accettazione, il Formatore</div>
        <div class="signature-line"></div>
        <div class="signature-label">{{trainer.fullName}}</div>
      </div>
    </div>
    
    <!-- Footer -->
    <div class="footer">
      <div>
        <span class="footer-company">{{tenant.name}}</span><br>
        P.IVA: {{tenant.vatNumber}} - C.F.: {{tenant.fiscalCode}}
      </div>
      <div style="text-align: center;">
        {{tenant.address}}<br>
        {{tenant.website}}
      </div>
      <div style="text-align: right;">
        PEC: {{tenant.pec}}<br>
        {{tenant.email}}
      </div>
    </div>
  </div>
</body>
</html>`
  };

  const existingLettera = await prisma.templateLink.findFirst({
    where: {
      name: letteraIncaricoTemplate.name,
      tenantId: tenant.id,
      deletedAt: null
    }
  });

  if (!existingLettera) {
    await prisma.templateLink.create({
      data: {
        id: crypto.randomUUID(),
        name: letteraIncaricoTemplate.name,
        url: `template://letter-${crypto.randomUUID().slice(0, 8)}`,
        type: letteraIncaricoTemplate.type,
        content: letteraIncaricoTemplate.content,
        isDefault: letteraIncaricoTemplate.isDefault,
        version: letteraIncaricoTemplate.version,
        tenantId: tenant.id,
        isActive: true
      }
    });
    console.log(`✅ Creato template: ${letteraIncaricoTemplate.name}`);
    created++;
  } else {
    console.log(`⏭️  Template esistente: ${letteraIncaricoTemplate.name}`);
  }

  // ========================================
  // Template Registro Presenze Default
  // ========================================
  const registroPresenzeTemplate = {
    name: 'Registro Presenze Default',
    type: 'ATTENDANCE_REGISTER',
    isDefault: true,
    version: 1,
    content: `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <title>Registro Presenze - {{course.name}}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 10mm;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Arial', sans-serif;
      font-size: 9pt;
      color: #1a1a1a;
      background: white;
    }
    
    .page {
      width: 277mm;
      min-height: 190mm;
      padding: 8mm;
    }
    
    /* Header con logo e info corso */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #2563eb;
      padding-bottom: 8px;
      margin-bottom: 10px;
    }
    
    .header-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .logo-container {
      width: 50mm;
      height: 20mm;
    }
    
    .logo-container img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }
    
    .logo-placeholder {
      width: 50mm;
      height: 20mm;
      border: 1px dashed #94a3b8;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 8pt;
      color: #64748b;
    }
    
    .company-info {
      font-size: 8pt;
      color: #475569;
    }
    
    .header-right {
      text-align: right;
    }
    
    .doc-title {
      font-size: 14pt;
      font-weight: 700;
      color: #1e40af;
      margin-bottom: 4px;
    }
    
    .doc-number {
      font-size: 9pt;
      color: #64748b;
    }
    
    /* Info corso */
    .course-info {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      background: #f8fafc;
      padding: 10px;
      border-radius: 4px;
      margin-bottom: 12px;
      border: 1px solid #e2e8f0;
    }
    
    .info-item {
      display: flex;
      flex-direction: column;
    }
    
    .info-label {
      font-size: 7pt;
      color: #64748b;
      text-transform: uppercase;
      font-weight: 600;
    }
    
    .info-value {
      font-size: 9pt;
      color: #0f172a;
      font-weight: 500;
    }
    
    /* Session info */
    .session-info {
      display: flex;
      justify-content: space-between;
      background: #eff6ff;
      padding: 8px 12px;
      border-radius: 4px;
      margin-bottom: 10px;
      border: 1px solid #bfdbfe;
    }
    
    .session-label {
      font-weight: 700;
      color: #1e40af;
    }
    
    /* Tabella presenze */
    .attendance-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 15px;
    }
    
    .attendance-table th {
      background: linear-gradient(to bottom, #3b82f6 0%, #2563eb 100%);
      color: white;
      padding: 8px 10px;
      text-align: left;
      font-weight: 600;
      font-size: 8pt;
      text-transform: uppercase;
      border: 1px solid #1d4ed8;
    }
    
    .attendance-table th.sign-col {
      text-align: center;
      width: 80px;
      border-left: 2px solid white;
    }
    
    .attendance-table td {
      border: 1px solid #cbd5e1;
      padding: 6px 10px;
      font-size: 9pt;
    }
    
    .attendance-table td.sign-col {
      text-align: center;
      min-height: 25px;
      border-left: 2px solid #94a3b8;
    }
    
    .attendance-table tbody tr:nth-child(even) {
      background-color: #f8fafc;
    }
    
    .attendance-table tbody tr:hover {
      background-color: #eff6ff;
    }
    
    /* Footer */
    .footer {
      margin-top: 15px;
      padding-top: 10px;
      border-top: 1px solid #e2e8f0;
    }
    
    .signatures {
      display: flex;
      justify-content: space-between;
      margin-top: 20px;
    }
    
    .signature-box {
      width: 45%;
      text-align: center;
    }
    
    .signature-label {
      font-size: 8pt;
      color: #64748b;
      margin-bottom: 25px;
    }
    
    .signature-line {
      border-top: 1px solid #1a1a1a;
      padding-top: 4px;
      font-size: 8pt;
    }
    
    .footer-text {
      font-size: 7pt;
      color: #64748b;
      text-align: center;
      margin-top: 15px;
    }
    
    /* QR code */
    .qr-section {
      position: absolute;
      bottom: 10mm;
      right: 10mm;
      text-align: center;
    }
    
    .qr-section img {
      width: 25mm;
      height: 25mm;
    }
    
    .qr-label {
      font-size: 6pt;
      color: #64748b;
      margin-top: 2px;
    }
  </style>
</head>
<body>
  <div class="page">
    <!-- Header -->
    <div class="header">
      <div class="header-left">
        <div class="logo-container">
          {{#if tenant.logo}}
            <img src="{{tenant.logo}}" alt="Logo" />
          {{else}}
            <div class="logo-placeholder">Logo Azienda</div>
          {{/if}}
        </div>
        <div class="company-info">
          <strong>{{tenant.name}}</strong><br>
          {{tenant.address}}<br>
          P.IVA: {{tenant.vatNumber}}
        </div>
      </div>
      <div class="header-right">
        <div class="doc-title">REGISTRO PRESENZE</div>
        <div class="doc-number">N. {{registro.numeroProgressivo}}/{{registro.annoProgressivo}}</div>
      </div>
    </div>
    
    <!-- Corso Info -->
    <div class="course-info">
      <div class="info-item">
        <span class="info-label">Corso</span>
        <span class="info-value">{{course.name}}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Codice</span>
        <span class="info-value">{{course.code}}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Durata</span>
        <span class="info-value">{{course.duration}} ore</span>
      </div>
      <div class="info-item">
        <span class="info-label">Sede</span>
        <span class="info-value">{{schedule.location}}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Formatore</span>
        <span class="info-value">{{trainer.fullName}}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Modalità</span>
        <span class="info-value">{{schedule.deliveryMode}}</span>
      </div>
    </div>
    
    <!-- Session Info -->
    <div class="session-info">
      <span><span class="session-label">Sessione:</span> {{session.sessionNumber}} di {{schedule.totalSessions}}</span>
      <span><span class="session-label">Data:</span> {{session.date}}</span>
      <span><span class="session-label">Orario:</span> {{session.startTime}} - {{session.endTime}}</span>
      <span><span class="session-label">Durata:</span> {{session.hours}} ore</span>
    </div>
    
    <!-- Tabella Presenze - generata dinamicamente -->
    {{table.sessionAttendance}}
    
    <!-- Footer con firme -->
    <div class="footer">
      <div class="signatures">
        <div class="signature-box">
          <p class="signature-label">Il Formatore</p>
          <div class="signature-line">{{trainer.fullName}}</div>
        </div>
        <div class="signature-box">
          <p class="signature-label">Il Responsabile</p>
          <div class="signature-line">_______________________</div>
        </div>
      </div>
      
      <p class="footer-text">
        Documento generato il {{current.date}} alle ore {{current.time}} - {{tenant.name}}
      </p>
    </div>
    
    <!-- QR Code -->
    {{#if document.qrCode}}
    <div class="qr-section">
      <img src="{{document.qrCode}}" alt="QR Verifica" />
      <div class="qr-label">Verifica documento</div>
    </div>
    {{/if}}
  </div>
</body>
</html>`
  };

  const existingRegistroPresenze = await prisma.templateLink.findFirst({
    where: {
      name: registroPresenzeTemplate.name,
      tenantId: tenant.id,
      deletedAt: null
    }
  });

  if (!existingRegistroPresenze) {
    await prisma.templateLink.create({
      data: {
        id: crypto.randomUUID(),
        name: registroPresenzeTemplate.name,
        url: `template://attendance-${crypto.randomUUID().slice(0, 8)}`,
        type: registroPresenzeTemplate.type,
        content: registroPresenzeTemplate.content,
        isDefault: registroPresenzeTemplate.isDefault,
        version: registroPresenzeTemplate.version,
        tenantId: tenant.id,
        isActive: true
      }
    });
    console.log(`✅ Creato template: ${registroPresenzeTemplate.name}`);
    created++;
  } else {
    console.log(`⏭️  Template esistente: ${registroPresenzeTemplate.name}`);
  }

  console.log(`📊 Document templates: ${created} creati`);
}

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║   DATABASE SEED - Inizializzazione Completa                ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  const startTime = Date.now();

  // Step 0: Backup automatico
  console.log('📦 Step 0: Backup di sicurezza');
  console.log('────────────────────────────────────────────────────────────────\n');
  await createBackup();
  console.log('\n');

  // Step 1: Seed utenti e tenant (codice originale)
  console.log('👥 Step 1: Utenti e Tenant');
  console.log('────────────────────────────────────────────────────────────────\n');
  await seedUsersAndTenant();
  console.log('\n');

  // Step 2: CMS Pages Element Formazione
  console.log('🌐 Step 2: Pagine CMS Element Formazione');
  console.log('────────────────────────────────────────────────────────────────\n');
  await seedCmsPages();
  console.log('\n');

  // Step 3: CMS Pages Element Medica
  console.log('🏥 Step 3: Pagine CMS Element Medica');
  console.log('────────────────────────────────────────────────────────────────\n');
  await seedElementMedicaCmsPages();
  console.log('\n');

  // Step 4: Form Templates
  console.log('📋 Step 4: Form Templates con Conditional Logic');
  console.log('────────────────────────────────────────────────────────────────\n');
  await seedFormTemplates();
  console.log('\n');

  // Step 5: Document Templates (PDF templates)
  console.log('📄 Step 5: Document Templates (Preventivi, Attestati, etc.)');
  console.log('────────────────────────────────────────────────────────────────\n');
  await seedDocumentTemplates();
  console.log('\n');

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║   ✅ SEED COMPLETATO CON SUCCESSO                           ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');
  console.log(`⏱️  Tempo totale: ${duration}s`);
  console.log(`📅 Data: ${new Date().toLocaleString('it-IT')}\n`);
}

// Funzione originale seed users/tenant
async function seedUsersAndTenant() {
  console.log('🌱 Seeding users and tenant...');

  const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD;
  if (!ADMIN_PASSWORD) {
    console.error('❌ SEED_ADMIN_PASSWORD non configurata. Impostare la variabile d\'ambiente prima di eseguire il seed.');
    process.exit(1);
  }

  // Create or get default tenant
  let defaultTenant = await prisma.tenant.findUnique({
    where: { slug: 'default-company' }
  });

  if (!defaultTenant) {
    defaultTenant = await prisma.tenant.create({
      data: {
        name: 'Default Company',
        slug: 'default-company',
        domain: 'localhost',
        settings: {},
        billingPlan: 'enterprise',
        maxUsers: 1000,
        maxCompanies: 100,
        isActive: true
      }
    });
    console.log('✅ Default tenant created:', defaultTenant.slug);
  } else {
    console.log('✅ Default tenant found:', defaultTenant.slug);
  }

  // Create or get admin user
  let adminUser = await prisma.person.findUnique({
    where: { email: 'admin@example.com' }
  });

  if (!adminUser) {
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

    adminUser = await prisma.person.create({
      data: {
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@example.com',
        username: 'admin',
        password: hashedPassword,
        status: 'ACTIVE',
        globalRole: 'ADMIN',
        tenantId: defaultTenant.id,
        gdprConsentDate: new Date(),
        gdprConsentVersion: '1.0',
        personRoles: {
          create: {
            roleType: 'ADMIN',
            tenantId: defaultTenant.id,
            isActive: true,
            isPrimary: true
          }
        }
      }
    });
    console.log('✅ Admin user created:', adminUser.email);
  } else {
    console.log('✅ Admin user found:', adminUser.email);
  }

  // Assegna TUTTI i permessi all'admin per evitare problemi futuri
  console.log('🔐 Assegnazione permessi completi all\'admin...');

  const adminRole = await prisma.personRole.findFirst({
    where: {
      personId: adminUser.id,
      roleType: 'ADMIN',
      deletedAt: null
    }
  });

  if (adminRole) {
    // Lista completa di TUTTI i permessi disponibili nel sistema
    const ALL_PERMISSIONS = [
      'ADMIN_PANEL', 'ASSIGN_ROLES', 'CREATE_ADMINISTRATION', 'CREATE_API_KEYS', 'CREATE_AUDIT_LOGS',
      'CREATE_CMS', 'CREATE_CMS_MEDIA', 'CREATE_CMS_PAGES', 'CREATE_CODICI_SCONTO', 'CREATE_COMPANIES',
      'CREATE_COURSES', 'CREATE_DOCUMENTS', 'CREATE_EMPLOYEES', 'CREATE_FORM_SUBMISSIONS', 'CREATE_FORM_TEMPLATES',
      'CREATE_GDPR', 'CREATE_HIERARCHY', 'CREATE_INVOICES', 'CREATE_NOTIFICATIONS', 'CREATE_PERSONS',
      'CREATE_PREVENTIVI', 'CREATE_PUBLIC_CMS', 'CREATE_QUOTES', 'CREATE_REPORTS', 'CREATE_ROLES',
      'CREATE_SCHEDULES', 'CREATE_SEO', 'CREATE_SUBMISSIONS', 'CREATE_TEMPLATES', 'CREATE_TENANTS',
      'CREATE_TRAINERS', 'CREATE_USERS', 'DELETE_ADMINISTRATION', 'DELETE_API_KEYS', 'DELETE_AUDIT_LOGS',
      'DELETE_CMS', 'DELETE_CMS_MEDIA', 'DELETE_CMS_PAGES', 'DELETE_CODICI_SCONTO', 'DELETE_COMPANIES',
      'DELETE_COURSES', 'DELETE_DOCUMENTS', 'DELETE_EMPLOYEES', 'DELETE_FORM_SUBMISSIONS', 'DELETE_FORM_TEMPLATES',
      'DELETE_GDPR', 'DELETE_GDPR_DATA', 'DELETE_HIERARCHY', 'DELETE_INVOICES', 'DELETE_NOTIFICATIONS',
      'DELETE_PERSONS', 'DELETE_PREVENTIVI', 'DELETE_PUBLIC_CMS', 'DELETE_QUOTES', 'DELETE_REPORTS',
      'DELETE_ROLES', 'DELETE_SCHEDULES', 'DELETE_SEO', 'DELETE_SUBMISSIONS', 'DELETE_TEMPLATES',
      'DELETE_TENANTS', 'DELETE_TRAINERS', 'DELETE_USERS', 'DOWNLOAD_DOCUMENTS', 'EDIT_ADMINISTRATION',
      'EDIT_API_KEYS', 'EDIT_AUDIT_LOGS', 'EDIT_CMS', 'EDIT_CMS_MEDIA', 'EDIT_CMS_NAVIGATION',
      'EDIT_CMS_PAGES', 'EDIT_CODICI_SCONTO', 'EDIT_COMPANIES', 'EDIT_COURSES', 'EDIT_DOCUMENTS',
      'EDIT_EMPLOYEES', 'EDIT_FORM_SUBMISSIONS', 'EDIT_FORM_TEMPLATES', 'EDIT_GDPR', 'EDIT_HIERARCHY',
      'EDIT_INVOICES', 'EDIT_NOTIFICATIONS', 'EDIT_PERSONS', 'EDIT_PREVENTIVI', 'EDIT_PUBLIC_CMS',
      'EDIT_QUOTES', 'EDIT_REPORTS', 'EDIT_ROLES', 'EDIT_SCHEDULES', 'EDIT_SEO', 'EDIT_SUBMISSIONS',
      'EDIT_TEMPLATES', 'EDIT_TENANTS', 'EDIT_TRAINERS', 'EDIT_USERS', 'EXPORT_AUDIT_LOGS',
      'EXPORT_FORM_SUBMISSIONS', 'EXPORT_GDPR_DATA', 'EXPORT_REPORTS', 'EXPORT_SUBMISSIONS',
      'GENERATE_PREVENTIVI_PDF', 'GENERATE_SITEMAP', 'HIERARCHY_MANAGEMENT', 'MANAGE_API_KEYS',
      'MANAGE_AUDIT_LOGS', 'MANAGE_CMS_MEDIA', 'MANAGE_CMS_NAVIGATION', 'MANAGE_CMS_PAGES',
      'MANAGE_CODICI_SCONTO', 'MANAGE_CONSENTS', 'MANAGE_ENROLLMENTS', 'MANAGE_FORM_SUBMISSIONS',
      'MANAGE_FORM_TEMPLATES', 'MANAGE_HIERARCHY', 'MANAGE_NOTIFICATIONS', 'MANAGE_PREVENTIVI',
      'MANAGE_PUBLIC_CMS', 'MANAGE_PUBLIC_CONTENT', 'MANAGE_SEO', 'MANAGE_SUBMISSIONS',
      'MANAGE_TEMPLATES', 'MANAGE_USERS', 'PUBLISH_CMS_PAGES', 'READ_PUBLIC_CONTENT',
      'REGENERATE_API_KEYS', 'RESTORE_CMS_VERSIONS', 'REVOKE_ROLES', 'ROLE_CREATE', 'ROLE_DELETE',
      'ROLE_EDIT', 'ROLE_MANAGEMENT', 'SEND_NOTIFICATIONS', 'SEND_PREVENTIVI', 'SYSTEM_SETTINGS',
      'TENANT_MANAGEMENT', 'USER_MANAGEMENT', 'VIEW_ADMINISTRATION', 'VIEW_API_KEYS', 'VIEW_AUDIT_LOGS',
      'VIEW_CMS', 'VIEW_CMS_MEDIA', 'VIEW_CMS_NAVIGATION', 'VIEW_CMS_PAGES', 'VIEW_CMS_VERSIONS',
      'VIEW_CODICI_SCONTO', 'VIEW_COMPANIES', 'VIEW_COURSES', 'VIEW_DOCUMENTS', 'VIEW_EMPLOYEES',
      'VIEW_FORM_SUBMISSIONS', 'VIEW_FORM_TEMPLATES', 'VIEW_GDPR', 'VIEW_GDPR_DATA', 'VIEW_HIERARCHY',
      'VIEW_INVOICES', 'VIEW_NOTIFICATIONS', 'VIEW_PERSONS', 'VIEW_PREVENTIVI', 'VIEW_PUBLIC_CMS',
      'VIEW_QUOTES', 'VIEW_REPORTS', 'VIEW_ROLES', 'VIEW_SCHEDULES', 'VIEW_SEO', 'VIEW_SUBMISSIONS',
      'VIEW_TEMPLATES', 'VIEW_TENANTS', 'VIEW_TRAINERS', 'VIEW_USERS'
    ];

    let permissionsAdded = 0;
    let permissionsExisting = 0;

    for (const permission of ALL_PERMISSIONS) {
      try {
        const existing = await prisma.rolePermission.findUnique({
          where: {
            personRoleId_permission: {
              personRoleId: adminRole.id,
              permission: permission
            }
          }
        });

        if (!existing) {
          await prisma.rolePermission.create({
            data: {
              id: crypto.randomUUID(),
              personRoleId: adminRole.id,
              permission: permission,
              isGranted: true,
              grantedBy: adminUser.id
            }
          });
          permissionsAdded++;
        } else if (!existing.isGranted || existing.deletedAt) {
          // Riattiva permesso se disabilitato
          await prisma.rolePermission.update({
            where: { id: existing.id },
            data: {
              isGranted: true,
              deletedAt: null
            }
          });
          permissionsAdded++;
        } else {
          permissionsExisting++;
        }
      } catch (error) {
        console.error(`⚠️  Errore assegnando permesso ${permission}:`, error.message);
      }
    }

    console.log(`✅ Permessi admin: ${permissionsAdded} aggiunti/riattivati, ${permissionsExisting} già presenti`);
    console.log(`📊 Totale permessi disponibili: ${ALL_PERMISSIONS.length}`);
  } else {
    console.log('⚠️  Ruolo ADMIN non trovato per l\'utente admin');
  }

  // Create or get test company
  let testCompany = await prisma.company.findFirst({
    where: {
      codiceFiscale: '12345678901',
      tenantId: defaultTenant.id
    }
  });

  if (!testCompany) {
    testCompany = await prisma.company.create({
      data: {
        ragioneSociale: 'Test Company S.r.l.',
        codiceFiscale: '12345678901',
        piva: '12345678901',
        mail: 'info@testcompany.com',
        telefono: '+39 123 456 7890',
        sedeAzienda: 'Via Test 123, Milano',
        cap: '20100',
        citta: 'Milano',
        provincia: 'MI',
        personaRiferimento: 'Mario Rossi',
        isActive: true,
        tenantId: defaultTenant.id
      }
    });
    console.log('✅ Test company created:', testCompany.ragioneSociale);
  } else {
    console.log('✅ Test company found:', testCompany.ragioneSociale);
  }

  // Create or get test course
  let testCourse = await prisma.course.findUnique({
    where: { code: 'SEC001' }
  });

  if (!testCourse) {
    testCourse = await prisma.course.create({
      data: {
        title: 'Corso di Sicurezza sul Lavoro',
        category: 'Sicurezza',
        description: 'Corso base sulla sicurezza nei luoghi di lavoro',
        duration: '8 ore',
        status: 'ACTIVE',
        code: 'SEC001',
        maxPeople: 20,
        pricePerPerson: 150.00,
        validityYears: 5,
        tenantId: defaultTenant.id
      }
    });
    console.log('✅ Test course created:', testCourse.title);
  } else {
    console.log('✅ Test course found:', testCourse.title);
  }

  // Create test employees
  const employees = [
    {
      firstName: 'Mario',
      lastName: 'Rossi',
      email: 'mario.rossi@testcompany.com',
      username: 'mario.rossi',
      taxCode: 'RSSMRA80A01H501Z',
      phone: '+39 333 123 4567',
      birthDate: new Date('1980-01-01'),
      residenceAddress: 'Via Roma 123',
      residenceCity: 'Milano',
      province: 'MI',
      postalCode: '20100',
      hiredDate: new Date('2020-01-15'),
      title: 'Impiegato',
      notes: 'Dipendente di test',
      companyId: testCompany.id
    },
    {
      firstName: 'Giulia',
      lastName: 'Bianchi',
      email: 'giulia.bianchi@testcompany.com',
      username: 'giulia.bianchi',
      taxCode: 'BNCGLI85B15F205X',
      phone: '+39 333 765 4321',
      birthDate: new Date('1985-02-15'),
      residenceAddress: 'Via Milano 456',
      residenceCity: 'Milano',
      province: 'MI',
      postalCode: '20121',
      hiredDate: new Date('2021-03-10'),
      title: 'Responsabile',
      notes: 'Dipendente di test',
      companyId: testCompany.id
    },
    {
      firstName: 'Luca',
      lastName: 'Verdi',
      email: 'luca.verdi@testcompany.com',
      username: 'luca.verdi',
      taxCode: 'VRDLCU90C20L219Y',
      phone: '+39 333 987 6543',
      birthDate: new Date('1990-03-20'),
      residenceAddress: 'Via Torino 789',
      residenceCity: 'Milano',
      province: 'MI',
      postalCode: '20122',
      hiredDate: new Date('2022-06-01'),
      title: 'Tecnico',
      notes: 'Dipendente di test',
      companyId: testCompany.id
    }
  ];

  for (const employeeData of employees) {
    const existingEmployee = await prisma.person.findUnique({
      where: { taxCode: employeeData.taxCode }
    });

    if (!existingEmployee) {
      // Genera una password casuale e sicura per i dipendenti, senza loggarla
      const randomPassword = crypto.randomBytes(18).toString('base64url');
      const hashedPassword = await bcrypt.hash(randomPassword, 10);

      const employee = await prisma.person.create({
        data: {
          ...employeeData,
          password: hashedPassword,
          status: 'ACTIVE',
          globalRole: 'USER',
          tenantId: defaultTenant.id,
          gdprConsentDate: new Date(),
          gdprConsentVersion: '1.0',
          personRoles: {
            create: {
              roleType: 'EMPLOYEE',
              tenantId: defaultTenant.id,
              isActive: true,
              isPrimary: true
            }
          }
        }
      });
      console.log('✅ Employee created:', employee.firstName, employee.lastName);
    } else {
      console.log('✅ Employee already exists:', employeeData.firstName, employeeData.lastName);
    }
  }

  console.log('✅ Users and tenant seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Database seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });