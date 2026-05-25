/**
 * HelpPage — §6.10 In-app user documentation
 *
 * Provides a structured guide for using ElementMedica Desktop,
 * covering installation, license activation, offline workflow, sync, and troubleshooting.
 */

import { useState } from 'react'
import {
    BookOpen,
    Download,
    HardDrive,
    KeyRound,
    LayoutDashboard,
    RefreshCw,
    Shield,
    Stethoscope,
    Wifi,
    WifiOff,
    ChevronDown,
    ChevronRight,
    AlertTriangle,
    CheckCircle2,
    Info,
} from 'lucide-react'

interface Section {
    id: string
    icon: React.ReactNode
    title: string
    content: React.ReactNode
}

function Accordion({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }): JSX.Element {
    const [open, setOpen] = useState(defaultOpen)
    return (
        <div className="border border-gray-200 rounded-lg overflow-hidden mb-3">
            <button
                className="w-full flex items-center justify-between px-4 py-3 text-left text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                onClick={() => setOpen(v => !v)}
            >
                <span>{title}</span>
                {open ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
            </button>
            {open && (
                <div className="px-4 pb-4 pt-1 text-sm text-gray-600 space-y-2 border-t border-gray-100">
                    {children}
                </div>
            )}
        </div>
    )
}

function Note({ type, children }: { type: 'info' | 'warning' | 'success'; children: React.ReactNode }): JSX.Element {
    const styles = {
        info: 'bg-blue-50 border-blue-200 text-blue-800',
        warning: 'bg-amber-50 border-amber-200 text-amber-800',
        success: 'bg-green-50 border-green-200 text-green-800',
    }
    const icons = {
        info: <Info className="w-4 h-4 shrink-0" />,
        warning: <AlertTriangle className="w-4 h-4 shrink-0" />,
        success: <CheckCircle2 className="w-4 h-4 shrink-0" />,
    }
    return (
        <div className={`flex gap-2 p-3 rounded-md border text-xs ${styles[type]}`}>
            {icons[type]}
            <span>{children}</span>
        </div>
    )
}

const sections: Section[] = [
    {
        id: 'install',
        icon: <Download className="w-5 h-5" />,
        title: 'Installazione',
        content: (
            <div className="space-y-3">
                <p>L'app è distribuita come file <strong>.dmg</strong> (macOS) o <strong>.exe NSIS</strong> (Windows).</p>
                <Accordion title="macOS — primo avvio">
                    <ol className="list-decimal list-inside space-y-1">
                        <li>Apri il file <code className="bg-gray-100 px-1 rounded">.dmg</code> e trascina l'app in Applicazioni.</li>
                        <li>Al primo avvio macOS può mostrare "Impossibile verificare lo sviluppatore".</li>
                        <li>Vai in <strong>Impostazioni → Privacy e Sicurezza</strong> e clicca "Apri comunque".</li>
                        <li>In alternativa, da Terminale rimuovi la quarantena:</li>
                    </ol>
                    <pre className="bg-gray-900 text-green-400 text-xs p-2 rounded mt-2 overflow-x-auto">
                        xattr -d com.apple.quarantine "/Applications/ElementMedica Desktop.app"
                    </pre>
                    <Note type="info">Questo è normale per app non distribuite tramite Mac App Store. Non indica virus.</Note>
                </Accordion>
                <Accordion title="Windows">
                    <ol className="list-decimal list-inside space-y-1">
                        <li>Avvia il file <code className="bg-gray-100 px-1 rounded">.exe</code> come Amministratore.</li>
                        <li>Se Windows SmartScreen mostra un avviso, clicca "Ulteriori informazioni" → "Esegui comunque".</li>
                        <li>L'installatore crea una voce nel menu Start e un collegamento sul desktop.</li>
                    </ol>
                </Accordion>
                <Accordion title="Aggiornamenti automatici">
                    <p>L'app verifica la disponibilità di aggiornamenti ad ogni avvio. Se disponibile, un banner nella barra in alto permette di scaricare e installare la nuova versione.</p>
                    <Note type="info">L'aggiornamento viene scaricato in background e applicato al prossimo riavvio.</Note>
                </Accordion>
            </div>
        ),
    },
    {
        id: 'license',
        icon: <KeyRound className="w-5 h-5" />,
        title: 'Attivazione Licenza',
        content: (
            <div className="space-y-3">
                <p>Ogni installazione richiede un <strong>codice licenza univoco</strong> (formato <code className="bg-gray-100 px-1 rounded">DESK-XXXX-XXXX-XXXX</code>), associato a questa macchina.</p>
                <Accordion title="Come ottenere la licenza" defaultOpen>
                    <ol className="list-decimal list-inside space-y-1">
                        <li>Accedi alla <strong>webapp ElementMedica</strong> con un account amministratore.</li>
                        <li>Vai in <strong>Impostazioni → Desktop Licenze</strong>.</li>
                        <li>Clicca <strong>Nuova Licenza</strong>, inserisci un'etichetta (es. "PC Ambulatorio B").</li>
                        <li>Copia il codice generato e inseriscilo nel campo di attivazione dell'app desktop.</li>
                    </ol>
                    <Note type="success">La licenza viene verificata online al primo utilizzo. Successivamente funziona anche offline per 30 giorni.</Note>
                </Accordion>
                <Accordion title="Licenza revocata o sospesa">
                    <p>Se la licenza risulta revocata, contatta il tuo amministratore per ricevere un nuovo codice. La macchina rimane comunque bloccata finché non viene inserita una licenza valida.</p>
                    <Note type="warning">Le licenze possono essere revocate dalla webapp in caso di dismissione del PC o cambio di medico.</Note>
                </Accordion>
            </div>
        ),
    },
    {
        id: 'offline',
        icon: <WifiOff className="w-5 h-5" />,
        title: 'Modalità Offline',
        content: (
            <div className="space-y-3">
                <p>ElementMedica Desktop funziona <strong>completamente offline</strong>. I dati vengono salvati in un database SQLite locale crittografato (AES-256).</p>
                <Accordion title="Prima di andare offline" defaultOpen>
                    <ol className="list-decimal list-inside space-y-1">
                        <li>Assicurati di essere connesso a Internet.</li>
                        <li>Dalla <strong>Dashboard</strong>, clicca <strong>"Scarica Giornata"</strong>.</li>
                        <li>Seleziona la data e attendi il completamento del download.</li>
                        <li>L'app scarica pazienti, appuntamenti, aziende, protocolli, tariffari e tutto il necessario.</li>
                    </ol>
                    <Note type="info">Per trasferte multi-giorno, puoi scaricare più giornate consecutive. Cada download aggiunge i dati senza sovrascrivere quelli esistenti.</Note>
                </Accordion>
                <Accordion title="Utilizzo offline">
                    <p>Una volta scaricata la giornata, disconnetti il cavo/WiFi. La barra di stato mostrerà <strong>OFFLINE</strong> in rosso.</p>
                    <p className="mt-1">Tutte le modifiche (visite, giudizi, scadenze) vengono salvate localmente e accodate per la sincronizzazione successiva.</p>
                </Accordion>
                <Accordion title="Dati disponibili offline">
                    <ul className="list-disc list-inside space-y-1">
                        <li>Agenda e appuntamenti della/e giornate scaricate</li>
                        <li>Anagrafica pazienti (con codice fiscale, dati MDL)</li>
                        <li>Aziende e dipendenti</li>
                        <li>Protocolli sanitari e mansioni</li>
                        <li>Tariffari e prestazioni</li>
                        <li>Scadenze MDL in evidenza</li>
                    </ul>
                </Accordion>
            </div>
        ),
    },
    {
        id: 'visita',
        icon: <Stethoscope className="w-5 h-5" />,
        title: 'Esecuzione Visita MDL',
        content: (
            <div className="space-y-3">
                <p>Le visite vengono eseguite dalla schermata <strong>Agenda</strong> (clic sull'appuntamento → "Avvia Visita") o da <strong>Visite → Nuova Visita</strong>.</p>
                <Accordion title="Schede della visita" defaultOpen>
                    <ul className="list-disc list-inside space-y-1">
                        <li><strong>Anamnesi</strong> — storia clinica e sintomi</li>
                        <li><strong>Parametri Vitali</strong> — PA, FC, SpO₂, peso/altezza</li>
                        <li><strong>Esame Obiettivo</strong> — dati strutturati per apparati</li>
                        <li><strong>Diagnosi</strong> — ICD-10 e diagnosi libera</li>
                        <li><strong>Terapia</strong> — prescrizioni e indicazioni</li>
                        <li><strong>Note</strong> — note interne e note per il paziente</li>
                    </ul>
                </Accordion>
                <Accordion title="Giudizio di Idoneità">
                    <p>Il pannello laterale destro include la sezione <strong>Giudizio di Idoneità</strong>. Compila il tipo di giudizio, le eventuali prescrizioni e la data di validità. Il giudizio viene incluso nel PDF finale.</p>
                    <Note type="warning">Ricorda di salvare il giudizio prima di chiudere la visita.</Note>
                </Accordion>
                <Accordion title="Prestazioni e costi">
                    <p>Il pannello <strong>Prestazioni</strong> carica automaticamente le voci associate all'appuntamento. I prezzi vengono risolti dal tariffario del contratto aziendale.</p>
                </Accordion>
                <Accordion title="Firma digitale">
                    <p>Nella sezione <strong>Firma</strong> è presente un canvas per la firma del paziente e del medico. La firma viene salvata come immagine PNG e allegata alla visita.</p>
                </Accordion>
                <Accordion title="Allegati">
                    <p>Nella sezione <strong>Allegati</strong> puoi caricare referti, immagini e documenti. I file vengono salvati localmente e sincronizzati al ritorno online.</p>
                </Accordion>
            </div>
        ),
    },
    {
        id: 'sync',
        icon: <RefreshCw className="w-5 h-5" />,
        title: 'Sincronizzazione',
        content: (
            <div className="space-y-3">
                <p>Quando torni online, l'app sincronizza automaticamente le modifiche locali con il server.</p>
                <Accordion title="Sync automatica" defaultOpen>
                    <ul className="list-disc list-inside space-y-1">
                        <li>La sync parte in automatico ogni 30 secondi quando sei online.</li>
                        <li>Un'icona nella barra in basso mostra lo stato: syncing / ok / errori.</li>
                        <li>Al termine, ricevi una notifica nativa del sistema operativo.</li>
                    </ul>
                </Accordion>
                <Accordion title="Sync manuale">
                    <p>Vai in <strong>Sync</strong> dal menu laterale per vedere la coda operazioni, forzare una sincronizzazione immediata o rivedere la cronologia.</p>
                </Accordion>
                <Accordion title="Conflitti">
                    <p>Se un dato è stato modificato sia offline che online contemporaneamente, si genera un <strong>conflitto</strong>. La schermata Sync mostra un diff fianco a fianco tra la versione locale e quella del server.</p>
                    <p className="mt-1">Puoi scegliere:</p>
                    <ul className="list-disc list-inside space-y-1 mt-1">
                        <li><strong>Mantieni locale</strong> — sovrascrive il server con la tua versione</li>
                        <li><strong>Usa server</strong> — scarta la modifica locale</li>
                    </ul>
                    <Note type="warning">I conflitti richiedono risoluzione manuale prima che la sync possa completarsi.</Note>
                </Accordion>
            </div>
        ),
    },
    {
        id: 'dashboard',
        icon: <LayoutDashboard className="w-5 h-5" />,
        title: 'Dashboard e Statistiche',
        content: (
            <div className="space-y-3">
                <p>La <strong>Dashboard</strong> mostra in tempo reale le statistiche della giornata calcolate sul database locale.</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Visite eseguite e in attesa di oggi</li>
                    <li>Scadenze MDL in evidenza</li>
                    <li>Numero pazienti e aziende attivi</li>
                    <li>Stato sync (operazioni pendenti, conflitti)</li>
                </ul>
                <Note type="info">Le statistiche vengono aggiornate ad ogni apertura della Dashboard e ogni 60 secondi.</Note>
            </div>
        ),
    },
    {
        id: 'backup',
        icon: <HardDrive className="w-5 h-5" />,
        title: 'Backup Locale',
        content: (
            <div className="space-y-3">
                <p>In <strong>Impostazioni → Backup</strong> puoi esportare e importare il database locale.</p>
                <Accordion title="Esporta backup">
                    <ol className="list-decimal list-inside space-y-1">
                        <li>Clicca <strong>Esporta Backup</strong>.</li>
                        <li>Scegli la destinazione (es. chiavetta USB o cartella sicura).</li>
                        <li>Il file <code className="bg-gray-100 px-1 rounded">.db</code> viene copiato nella posizione scelta.</li>
                    </ol>
                    <Note type="warning">Il backup contiene dati PII (pazienti, visite). Conservalo in luogo sicuro e conformemente al GDPR.</Note>
                </Accordion>
                <Accordion title="Ripristina backup">
                    <ol className="list-decimal list-inside space-y-1">
                        <li>Clicca <strong>Importa Backup</strong>.</li>
                        <li>Seleziona il file <code className="bg-gray-100 px-1 rounded">.db</code> precedentemente esportato.</li>
                        <li>L'app sostituisce il database attuale. <strong>Attenzione: operazione irreversibile.</strong></li>
                    </ol>
                </Accordion>
            </div>
        ),
    },
    {
        id: 'privacy',
        icon: <Shield className="w-5 h-5" />,
        title: 'Privacy e GDPR',
        content: (
            <div className="space-y-3">
                <p>ElementMedica Desktop è progettato per la conformità al GDPR in ambito sanitario.</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Database locale crittografato AES-256 at-rest</li>
                    <li>Nessun log con PII (codice fiscale, dati clinici) nei file di log</li>
                    <li>Eliminazione sempre soft-delete (audit trail conservato)</li>
                    <li>Audit GDPR locale sincronizzato con il server al ritorno online</li>
                    <li>Auto-lock dopo periodo di inattività configurabile</li>
                </ul>
                <Note type="info">I dati offline rimangono sul disco locale finché non vengono sincronizzati. Assicurati di sincronizzare prima di formattare o dismettere il PC.</Note>
            </div>
        ),
    },
    {
        id: 'troubleshoot',
        icon: <AlertTriangle className="w-5 h-5" />,
        title: 'Risoluzione Problemi',
        content: (
            <div className="space-y-3">
                <Accordion title="Non riesco ad effettuare il login" defaultOpen>
                    <ul className="list-disc list-inside space-y-1">
                        <li>Verifica di essere connesso a Internet.</li>
                        <li>Usa le stesse credenziali della webapp (email + password).</li>
                        <li>Se ricevi "Accesso non autorizzato", contatta il tuo amministratore per verificare il tuo profilo.</li>
                    </ul>
                </Accordion>
                <Accordion title="La licenza non viene accettata">
                    <ul className="list-disc list-inside space-y-1">
                        <li>Verifica di aver copiato il codice correttamente (include trattini: <code className="bg-gray-100 px-1 rounded">DESK-XXXX-XXXX-XXXX</code>).</li>
                        <li>Controlla dalla webapp che la licenza non sia già usata su un'altra macchina o sia stata revocata.</li>
                    </ul>
                </Accordion>
                <Accordion title="La sync si blocca o mostra errori">
                    <ul className="list-disc list-inside space-y-1">
                        <li>Vai in <strong>Sync</strong> e clicca <strong>"Riprova falliti"</strong>.</li>
                        <li>Se ci sono conflitti, risolvili manualmente dalla schermata Sync.</li>
                        <li>Controlla il log errori in <strong>Impostazioni → Log Errori</strong>.</li>
                    </ul>
                </Accordion>
                <Accordion title="L'app non si aggiorna">
                    <ul className="list-disc list-inside space-y-1">
                        <li>Verifica di essere online durante l'avvio dell'app.</li>
                        <li>Su macOS, assicurati che l'app abbia i permessi per scrivere nella propria cartella di dati.</li>
                        <li>In caso di aggiornamento bloccato, scarica manualmente l'ultima versione dalla webapp admin.</li>
                    </ul>
                </Accordion>
                <Accordion title="Contatti supporto">
                    <p>Per assistenza tecnica, contatta il reparto IT o scrivi a <strong>supporto@elementmedica.com</strong> con:</p>
                    <ul className="list-disc list-inside space-y-1 mt-1">
                        <li>Versione app (visibile in Impostazioni)</li>
                        <li>Sistema operativo e versione</li>
                        <li>Descrizione del problema</li>
                        <li>Log errori (copia da Impostazioni → Log Errori)</li>
                    </ul>
                </Accordion>
            </div>
        ),
    },
]

export function HelpPage(): JSX.Element {
    const [activeSection, setActiveSection] = useState<string>('install')
    const current = sections.find(s => s.id === activeSection) ?? sections[0]

    return (
        <div className="flex h-full bg-white">
            {/* Sidebar nav */}
            <aside className="w-56 shrink-0 border-r border-gray-200 bg-gray-50 py-4 px-3 space-y-1">
                <div className="flex items-center gap-2 px-2 mb-4">
                    <BookOpen className="w-5 h-5 text-teal-600" />
                    <h1 className="text-sm font-semibold text-gray-800">Guida utente</h1>
                </div>
                {sections.map(s => (
                    <button
                        key={s.id}
                        onClick={() => setActiveSection(s.id)}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors ${s.id === activeSection
                                ? 'bg-teal-50 text-teal-700 font-medium'
                                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
                            }`}
                    >
                        <span className={s.id === activeSection ? 'text-teal-600' : 'text-gray-400'}>
                            {s.icon}
                        </span>
                        {s.title}
                    </button>
                ))}
            </aside>

            {/* Content area */}
            <main className="flex-1 overflow-y-auto p-8 max-w-2xl">
                <div className="flex items-center gap-3 mb-6">
                    <span className="text-teal-600">{current.icon}</span>
                    <h2 className="text-xl font-bold text-gray-900">{current.title}</h2>
                </div>
                <div className="text-sm text-gray-700 leading-relaxed">
                    {current.content}
                </div>
            </main>
        </div>
    )
}
