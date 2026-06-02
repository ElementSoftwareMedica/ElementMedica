/**
 * PrivacyPolicyStaticPage
 *
 * Pagina Privacy Policy STATICA brand-aware (GDPR compliant).
 * NON usa CMS API — contenuto hardcoded per SEO e disponibilità garantita.
 * Ultimo aggiornamento: aprile 2025.
 */

import React, { useState } from 'react';
import { Shield, ChevronDown, Mail, Phone, MapPin, FileText, Lock, Eye, RefreshCw, Trash2, Download } from 'lucide-react';
import { PublicLayout } from '../../components/public/PublicLayout';
import SEOHead from '../../components/seo/SEOHead';

const brandId = import.meta.env.VITE_BRAND_ID || 'element-sicurezza';
const isMedica = brandId === 'element-medica';

const BRAND = isMedica
    ? {
        name: 'Element Medica',
        companyFull: 'Element srl',
        domain: 'elementmedica.com',
        email: 'info@elementmedica.com',
        website: 'https://www.elementmedica.com',
        desc: 'servizi di medicina del lavoro, visite mediche specialistiche e sorveglianza sanitaria',
        canonical: 'https://www.elementmedica.com/privacy-policy',
    }
    : {
        name: 'Element Sicurezza',
        companyFull: 'Element srl',
        domain: 'elementsicurezza.com',
        email: 'info@elementsicurezza.com',
        website: 'https://www.elementsicurezza.com',
        desc: 'servizi di formazione sicurezza lavoro, consulenza RSPP e medicina del lavoro',
        canonical: 'https://www.elementsicurezza.com/privacy-policy',
    };

const COMMON = {
    vat: '05580640281',
    address: 'Via Bracciano 34, 35030 Selvazzano Dentro (PD)',
    dpoEmail: 'privacy@element.srl',
    lastUpdate: 'Aprile 2025',
    pec: 'element@legalmail.it',
};

interface Section {
    id: string;
    title: string;
    content: React.ReactNode;
}

const PrivacyPolicyStaticPage: React.FC = () => {
    const [openSection, setOpenSection] = useState<string | null>('raccolta');

    const sections: Section[] = [
        {
            id: 'titolare',
            title: '1. Titolare del Trattamento',
            content: (
                <div className="space-y-3 text-gray-700 text-sm leading-relaxed">
                    <p>Il titolare del trattamento dei dati personali è:</p>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-1">
                        <p><strong>{BRAND.companyFull}</strong></p>
                        <p className="flex items-center gap-2"><MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" /> {COMMON.address}</p>
                        <p className="flex items-center gap-2"><Mail className="w-4 h-4 text-gray-400 flex-shrink-0" /> {BRAND.email}</p>
                        <p className="flex items-center gap-2"><FileText className="w-4 h-4 text-gray-400 flex-shrink-0" /> P.IVA / C.F. {COMMON.vat}</p>
                        <p className="flex items-center gap-2"><Mail className="w-4 h-4 text-gray-400 flex-shrink-0" /> PEC: {COMMON.pec}</p>
                    </div>
                    <p>Per qualsiasi questione relativa al trattamento dei tuoi dati personali puoi contattare il Titolare all'indirizzo e-mail: <a href={`mailto:${COMMON.dpoEmail}`} className="text-primary-600 underline">{COMMON.dpoEmail}</a></p>
                </div>
            ),
        },
        {
            id: 'raccolta',
            title: '2. Dati Raccolti e Finalità del Trattamento',
            content: (
                <div className="space-y-4 text-gray-700 text-sm leading-relaxed">
                    <p>Raccogliamo i tuoi dati personali nella misura strettamente necessaria per le seguenti finalità:</p>

                    <div className="space-y-3">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <h4 className="font-semibold text-blue-800 mb-2">A) Fornire i nostri servizi (base giuridica: esecuzione del contratto, art. 6(1)(b) GDPR)</h4>
                            <ul className="list-disc list-inside space-y-1 text-blue-900">
                                <li>Erogazione di {BRAND.desc}</li>
                                <li>Gestione prenotazioni, appuntamenti e fatturazione</li>
                                <li>Emissione di attestati, giudizi di idoneità e documentazione legale</li>
                                <li>Comunicazioni relative ai servizi acquistati</li>
                            </ul>
                        </div>

                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <h4 className="font-semibold text-green-800 mb-2">B) Adempimenti legali e obblighi normativi (base giuridica: obbligo legale, art. 6(1)(c) GDPR)</h4>
                            <ul className="list-disc list-inside space-y-1 text-green-900">
                                <li>Conservazione documentazione contabile e fiscale</li>
                                <li>Gestione cartelle sanitarie e di rischio (D.Lgs 81/08)</li>
                                <li>Notifiche agli enti preposti (INAIL, UOPSAL) ove obbligatorio</li>
                                <li>Registro degli esposti ad agenti cancerogeni (art. 243 D.Lgs 81/08)</li>
                            </ul>
                        </div>

                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <h4 className="font-semibold text-yellow-800 mb-2">C) Risposte a richieste di contatto (base giuridica: consenso / legittimo interesse, art. 6(1)(a)(f) GDPR)</h4>
                            <ul className="list-disc list-inside space-y-1 text-yellow-900">
                                <li>Gestione form di contatto sul sito web</li>
                                <li>Risposta a richieste di preventivo</li>
                                <li>Comunicazioni commerciali (solo con consenso esplicito)</li>
                            </ul>
                        </div>

                        {isMedica && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                <h4 className="font-semibold text-red-800 mb-2">D) Dati sanitari (base giuridica: art. 9(2)(h) GDPR – finalità di medicina preventiva e del lavoro)</h4>
                                <ul className="list-disc list-inside space-y-1 text-red-900">
                                    <li>Anamnesi e cartella clinica per visite specialistiche</li>
                                    <li>Risultati di esami diagnostici (audiometria, spirometria, ECG, ecc.)</li>
                                    <li>Giudizi di idoneità alla mansione specifica</li>
                                    <li>Protocolli sanitari aziendali</li>
                                </ul>
                                <p className="mt-2 text-sm text-red-700"><strong>Nota:</strong> I dati sanitari sono trattati esclusivamente da personale medico qualificato e vincolato al segreto professionale.</p>
                            </div>
                        )}
                    </div>
                </div>
            ),
        },
        {
            id: 'tipologie',
            title: '3. Categorie di Dati Personali',
            content: (
                <div className="space-y-3 text-gray-700 text-sm leading-relaxed">
                    <p>Potremo trattare le seguenti categorie di dati:</p>
                    <div className="grid md:grid-cols-2 gap-3">
                        {[
                            { title: 'Dati identificativi', items: ['Nome e cognome', 'Codice fiscale', 'Data di nascita', 'Documento d\'identità'] },
                            { title: 'Dati di contatto', items: ['Indirizzo e-mail', 'Numero di telefono', 'Indirizzo postale'] },
                            { title: 'Dati lavorativi', items: ['Azienda di appartenenza', 'Mansione/ruolo', 'Datore di lavoro'] },
                            ...(isMedica ? [{ title: 'Dati sanitari (art. 9 GDPR)', items: ['Anamnesi medica', 'Risultati esami', 'Diagnosi e terapie', 'Cartella sanitaria'] }] : []),
                            { title: 'Dati di navigazione', items: ['Indirizzo IP (anonimizzato)', 'Cookie tecnici', 'Log di accesso al sito'] },
                        ].map((cat, i) => (
                            <div key={i} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                <h4 className="font-semibold text-gray-800 mb-2 text-xs uppercase tracking-wide">{cat.title}</h4>
                                <ul className="list-disc list-inside text-gray-600 space-y-0.5">
                                    {cat.items.map((item, j) => <li key={j}>{item}</li>)}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
            ),
        },
        {
            id: 'conservazione',
            title: '4. Tempi di Conservazione',
            content: (
                <div className="space-y-3 text-gray-700 text-sm leading-relaxed">
                    <p>I dati vengono conservati per il tempo strettamente necessario alle finalità per cui sono stati raccolti, nel rispetto della normativa applicabile:</p>
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-sm">
                            <thead>
                                <tr className="bg-gray-100">
                                    <th className="border border-gray-200 p-2 text-left font-semibold text-gray-800">Tipologia</th>
                                    <th className="border border-gray-200 p-2 text-left font-semibold text-gray-800">Periodo conservazione</th>
                                    <th className="border border-gray-200 p-2 text-left font-semibold text-gray-800">Base normativa</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[
                                    { tipo: 'Dati contabili e fiscali', periodo: '10 anni', norma: 'Art. 2220 c.c.' },
                                    { tipo: 'Documenti formativi e attestati', periodo: '10 anni', norma: 'D.Lgs 81/08' },
                                    ...(isMedica ? [
                                        { tipo: 'Cartella sanitaria e di rischio', periodo: '10 anni (conservati dal MC fino a cessazione attività lavorativa)', norma: 'Art. 25 D.Lgs 81/08' },
                                        { tipo: 'Registro esposti cancerogeni', periodo: '40 anni', norma: 'Art. 243 D.Lgs 81/08' },
                                    ] : []),
                                    { tipo: 'Richieste di contatto/preventivo', periodo: '2 anni dalla richiesta', norma: 'Legittimo interesse' },
                                    { tipo: 'Consensi marketing', periodo: 'Fino a revoca + 1 anno', norma: 'Art. 7 GDPR' },
                                    { tipo: 'Log di sistema e sicurezza', periodo: '6 mesi', norma: 'Linee guida EDPB' },
                                ].map((row, i) => (
                                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                        <td className="border border-gray-200 p-2 text-gray-700">{row.tipo}</td>
                                        <td className="border border-gray-200 p-2 text-gray-700 font-medium">{row.periodo}</td>
                                        <td className="border border-gray-200 p-2 text-gray-500">{row.norma}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ),
        },
        {
            id: 'destinatari',
            title: '5. Destinatari dei Dati',
            content: (
                <div className="space-y-3 text-gray-700 text-sm leading-relaxed">
                    <p>I tuoi dati possono essere comunicati a:</p>
                    <ul className="space-y-2">
                        {[
                            { icon: '🏢', text: 'Dipendenti e collaboratori autorizzati di ' + BRAND.companyFull + ', nel rispetto del principio di need-to-know' },
                            { icon: '📊', text: 'Software gestionali e CRM in cloud (Prisma/PostgreSQL su server europei), che operano come responsabili del trattamento ex art. 28 GDPR' },
                            { icon: '💳', text: 'Istituti di pagamento per la gestione delle transazioni (Stripe, bonifici bancari)' },
                            { icon: '⚖️', text: 'Commercialista e consulente del lavoro per adempimenti fiscali e giuslavoristici' },
                            { icon: '🏛️', text: 'Autorità pubbliche (INAIL, Agenzia delle Entrate, UOPSAL) ove obbligatorio per legge' },
                            ...(isMedica ? [{ icon: '🩺', text: 'Datore di lavoro del paziente (esclusivamente per giudizi di idoneità — art. 25 D.Lgs 81/08)' }] : []),
                        ].map((item, i) => (
                            <li key={i} className="flex items-start gap-2">
                                <span className="text-base flex-shrink-0">{item.icon}</span>
                                <span>{item.text}</span>
                            </li>
                        ))}
                    </ul>
                    <p className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-yellow-800">
                        <strong>Trasferimenti extra-UE:</strong> I dati non vengono trasferiti a paesi terzi al di fuori dello Spazio Economico Europeo, salvo che per l'utilizzo di servizi cloud certificati (es. Microsoft Azure EU) con garanzie adeguate ex artt. 44-49 GDPR.
                    </p>
                </div>
            ),
        },
        {
            id: 'diritti',
            title: '6. I Tuoi Diritti (artt. 15-22 GDPR)',
            content: (
                <div className="space-y-3 text-gray-700 text-sm leading-relaxed">
                    <p>In qualità di interessato hai i seguenti diritti nei confronti del titolare del trattamento:</p>
                    <div className="grid md:grid-cols-2 gap-3">
                        {[
                            { icon: Eye, color: 'blue', title: 'Diritto di accesso (art. 15)', desc: 'Ottenere conferma che siano trattati dati che ti riguardano e riceverne copia.' },
                            { icon: RefreshCw, color: 'green', title: 'Diritto di rettifica (art. 16)', desc: 'Ottenere la rettifica di dati personali inesatti o incompleti.' },
                            { icon: Trash2, color: 'red', title: 'Diritto alla cancellazione (art. 17)', desc: 'Ottenere la cancellazione ("diritto all\'oblio") nei casi previsti dalla legge.' },
                            { icon: Lock, color: 'orange', title: 'Diritto alla limitazione (art. 18)', desc: 'Ottenere la limitazione del trattamento nei casi previsti dalla legge.' },
                            { icon: Download, color: 'purple', title: 'Diritto alla portabilità (art. 20)', desc: 'Ricevere i dati in formato strutturato e leggibile da dispositivo automatico.' },
                            { icon: Shield, color: 'gray', title: 'Diritto di opposizione (art. 21)', desc: 'Opporsi al trattamento per motivi legati alla tua situazione particolare.' },
                        ].map((right, i) => (
                            <div key={i} className={`flex gap-3 p-3 bg-${right.color}-50 border border-${right.color}-200 rounded-lg`}>
                                <right.icon className={`w-5 h-5 text-${right.color}-600 flex-shrink-0 mt-0.5`} />
                                <div>
                                    <h4 className={`font-semibold text-${right.color}-800 text-xs`}>{right.title}</h4>
                                    <p className={`text-${right.color}-700 text-xs mt-0.5`}>{right.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="bg-gray-100 rounded-lg p-4 mt-2">
                        <p><strong>Come esercitare i diritti:</strong> Invia una richiesta scritta a <a href={`mailto:${COMMON.dpoEmail}`} className="text-primary-600 underline">{COMMON.dpoEmail}</a>. Ti risponderemo entro 30 giorni. Hai inoltre il diritto di proporre reclamo al Garante per la Protezione dei Dati Personali (<a href="https://www.garanteprivacy.it" className="text-primary-600 underline" target="_blank" rel="noopener noreferrer">www.garanteprivacy.it</a>).</p>
                    </div>
                </div>
            ),
        },
        {
            id: 'sicurezza',
            title: '7. Sicurezza dei Dati',
            content: (
                <div className="space-y-3 text-gray-700 text-sm leading-relaxed">
                    <p>Adottiamo misure tecnico-organizzative adeguate per proteggere i tuoi dati personali, tra cui:</p>
                    <ul className="space-y-2">
                        {[
                            'Trasmissione dei dati esclusivamente via HTTPS con certificato TLS 1.3',
                            'Database cifrati con crittografia AES-256 at rest',
                            'Backup giornalieri automatizzati su server europei certificati ISO 27001',
                            'Accesso ai dati secondo il principio di minimo privilegio (RBAC)',
                            'Log di audit per ogni accesso ai dati sensibili',
                            'Aggiornamenti di sicurezza e patch management periodici',
                        ].map((item, i) => (
                            <li key={i} className="flex items-start gap-2">
                                <Shield className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>
                    <p>In caso di violazione dei dati personali (data breach) che possa comportare un rischio per i tuoi diritti e libertà, provvederemo alla notifica all'Autorità di controllo entro 72 ore e ti informeremo tempestivamente ove richiesto dall'art. 34 GDPR.</p>
                </div>
            ),
        },
        {
            id: 'cookie',
            title: '8. Cookie e Tecnologie di Tracciamento',
            content: (
                <div className="space-y-3 text-gray-700 text-sm leading-relaxed">
                    <p>Il sito {BRAND.domain} utilizza cookie tecnici necessari per il funzionamento e, con il tuo consenso, cookie analitici e di marketing. Per informazioni dettagliate consulta la nostra <a href="/cookie-policy" className="text-primary-600 underline">Cookie Policy</a>.</p>
                    <p>Puoi gestire le tue preferenze cookie in qualsiasi momento tramite il banner presente nella parte inferiore del sito o cancellando i cookie dal tuo browser.</p>
                </div>
            ),
        },
        {
            id: 'aggiornamenti',
            title: '9. Aggiornamenti alla Privacy Policy',
            content: (
                <div className="space-y-3 text-gray-700 text-sm leading-relaxed">
                    <p>La presente Privacy Policy può essere soggetta ad aggiornamenti periodici per rispecchiare eventuali modifiche normative o operative. La data dell'ultimo aggiornamento è indicata in calce al documento.</p>
                    <p>Ti invitiamo a consultare periodicamente questa pagina. Le modifiche sostanziali saranno comunicate via e-mail agli utenti registrati.</p>
                    <p className="text-gray-500 text-xs">Ultimo aggiornamento: {COMMON.lastUpdate} — Versione 2.0</p>
                </div>
            ),
        },
    ];

    return (
        <PublicLayout>
            <SEOHead
                title={`Privacy Policy | ${BRAND.name}`}
                description={`Informativa sulla privacy e protezione dei dati personali di ${BRAND.companyFull} (${BRAND.name}). Via Bracciano 34, Selvazzano Dentro, Padova. GDPR compliant.`}
                canonicalUrl={BRAND.canonical}
            />

            {/* HEADER */}
            <div style={{ background: '#283646' }} className="py-16 text-white">
                <div className="container mx-auto px-4 max-w-4xl">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                            <Shield className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <p className="text-white/70 text-sm font-medium uppercase tracking-wider">Informativa Privacy</p>
                            <h1 className="text-3xl font-bold">Privacy Policy</h1>
                        </div>
                    </div>
                    <p className="text-white/90 text-lg max-w-2xl mt-4">
                        Questa informativa descrive come {BRAND.companyFull} ({BRAND.name}) raccoglie, utilizza e protegge i tuoi dati personali, nel rispetto del Regolamento UE 2016/679 (GDPR) e del D.Lgs 196/2003 come modificato dal D.Lgs 101/2018.
                    </p>
                    <div className="flex flex-wrap gap-4 mt-6 text-sm text-white/80">
                        <span className="flex items-center gap-1"><FileText className="w-4 h-4" /> Reg. UE 2016/679 (GDPR)</span>
                        <span className="flex items-center gap-1"><Shield className="w-4 h-4" /> D.Lgs 196/2003</span>
                        <span className="flex items-center gap-1"><RefreshCw className="w-4 h-4" /> Agg. {COMMON.lastUpdate}</span>
                    </div>
                </div>
            </div>

            {/* CONTENUTO */}
            <div className="py-12 bg-white">
                <div className="container mx-auto px-4 max-w-4xl">
                    <div className="space-y-3">
                        {sections.map((section) => (
                            <div key={section.id} className="border border-gray-200 rounded-xl overflow-hidden">
                                <button
                                    className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 transition-colors"
                                    onClick={() => setOpenSection(openSection === section.id ? null : section.id)}
                                >
                                    <span className="font-semibold text-gray-900">{section.title}</span>
                                    <ChevronDown className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${openSection === section.id ? 'rotate-180' : ''}`} />
                                </button>
                                {openSection === section.id && (
                                    <div className="px-5 pb-5 border-t border-gray-100">
                                        <div className="pt-4">
                                            {section.content}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* CONTATTI DPO */}
                    <div className="mt-10 bg-gray-50 border border-gray-200 rounded-2xl p-6">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">Contatti per la Privacy</h2>
                        <div className="grid md:grid-cols-3 gap-4">
                            <div className="flex items-start gap-3">
                                <Mail className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-medium text-gray-800 text-sm">Email Privacy</p>
                                    <a href={`mailto:${COMMON.dpoEmail}`} className="text-primary-600 text-sm underline">{COMMON.dpoEmail}</a>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <MapPin className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-medium text-gray-800 text-sm">Sede Legale</p>
                                    <p className="text-gray-600 text-sm">{COMMON.address}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Phone className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-medium text-gray-800 text-sm">P.IVA</p>
                                    <p className="text-gray-600 text-sm">{COMMON.vat}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </PublicLayout>
    );
};

export default PrivacyPolicyStaticPage;
