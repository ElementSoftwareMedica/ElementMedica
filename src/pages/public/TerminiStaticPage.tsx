/**
 * TerminiStaticPage
 *
 * Pagina Termini di Servizio STATICA brand-aware.
 * NON usa CMS API — contenuto hardcoded per SEO e disponibilità garantita.
 * Ultimo aggiornamento: aprile 2025.
 */

import React, { useState } from 'react';
import { FileText, ChevronDown, Shield, AlertTriangle, Scale, RefreshCw, Phone, Mail } from 'lucide-react';
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
        phone: '+39 351 318 1574',
        desc: 'poliambulatorio e servizi di medicina del lavoro',
        canonical: 'https://www.elementmedica.com/termini',
        services: [
            'Visite mediche specialistiche e di medicina del lavoro',
            'Sorveglianza sanitaria aziendale (D.Lgs 81/08)',
            'Esami diagnostici (audiometria, spirometria, ECG, oculistica)',
            'Prenotazione online di appuntamenti medici',
            'Rilascio di giudizi di idoneità alla mansione',
        ],
    }
    : {
        name: 'Element Sicurezza',
        companyFull: 'Element srl',
        domain: 'elementsicurezza.com',
        email: 'info@elementsicurezza.com',
        website: 'https://www.elementsicurezza.com',
        phone: '+39 351 623 9176',
        desc: 'formazione sicurezza lavoro e consulenza RSPP',
        canonical: 'https://www.elementsicurezza.com/termini',
        services: [
            'Corsi di formazione sicurezza sul lavoro obbligatori (D.Lgs 81/08)',
            'Servizi di RSPP esterno e consulenza HSE',
            'Medicina del lavoro e sorveglianza sanitaria',
            'Consulenza DVR (Documento di Valutazione dei Rischi)',
            'Formazione antincendio e primo soccorso',
        ],
    };

const COMMON = {
    vat: '05580640281',
    address: 'Via Bracciano 34, 35030 Selvazzano Dentro (PD)',
    lastUpdate: 'Aprile 2025',
    foro: 'Foro di Padova',
};

const TerminiStaticPage: React.FC = () => {
    const [openSection, setOpenSection] = useState<string | null>('oggetto');

    const sections = [
        {
            id: 'oggetto',
            title: '1. Oggetto e Ambito di Applicazione',
            content: (
                <div className="space-y-3 text-gray-700 text-sm leading-relaxed">
                    <p>I presenti Termini di Servizio ("Termini") disciplinano l'utilizzo del sito web <strong>{BRAND.website}</strong> e l'acquisto dei servizi offerti da <strong>{BRAND.companyFull}</strong> ({BRAND.name}), con sede in {COMMON.address}, P.IVA {COMMON.vat}.</p>
                    <p>Accedendo al sito e/o acquistando i nostri servizi, l'utente dichiara di aver letto, compreso e accettato i presenti Termini. Si invita a non utilizzare il sito qualora non si accettino integralmente le presenti condizioni.</p>
                    <p>I Termini si applicano a tutte le tipologie di utenti: persone fisiche (consumatori e professionisti), aziende, enti pubblici e privati.</p>
                </div>
            ),
        },
        {
            id: 'servizi',
            title: '2. Descrizione dei Servizi',
            content: (
                <div className="space-y-3 text-gray-700 text-sm leading-relaxed">
                    <p>{BRAND.name} eroga i seguenti servizi di {BRAND.desc}:</p>
                    <ul className="space-y-2">
                        {BRAND.services.map((s, i) => (
                            <li key={i} className="flex items-start gap-2">
                                <Shield className="w-4 h-4 text-primary-600 flex-shrink-0 mt-0.5" />
                                <span>{s}</span>
                            </li>
                        ))}
                    </ul>
                    <p>Le caratteristiche specifiche di ciascun servizio sono descritte nelle relative pagine del sito e/o nella documentazione contrattuale fornita al cliente.</p>
                    {isMedica && (
                        <div className="bg-teal-50 border border-teal-200 rounded-lg p-3">
                            <p className="text-teal-800 text-sm"><strong>Nota medica importante:</strong> Le informazioni presenti sul sito {BRAND.domain} hanno carattere meramente informativo e non costituiscono in alcun modo parere medico, diagnosi o consiglio terapeutico. Per qualsiasi problema di salute si raccomanda di consultare un medico qualificato.</p>
                        </div>
                    )}
                </div>
            ),
        },
        {
            id: 'registrazione',
            title: '3. Accesso all\'Area Riservata',
            content: (
                <div className="space-y-3 text-gray-700 text-sm leading-relaxed">
                    <p>Per accedere ad alcune funzionalità del sito (es. area clienti, documenti, attestati) è necessaria la registrazione. L'utente si impegna a:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                        <li>Fornire dati veritieri, aggiornati e completi al momento della registrazione</li>
                        <li>Mantenere riservate le proprie credenziali di accesso (username e password)</li>
                        <li>Notificare immediatamente {BRAND.name} in caso di utilizzo non autorizzato del proprio account</li>
                        <li>Non condividere l'accesso con terzi non autorizzati</li>
                    </ul>
                    <p>{BRAND.companyFull} si riserva il diritto di sospendere o cancellare account che violino i presenti Termini.</p>
                </div>
            ),
        },
        {
            id: 'contratto',
            title: '4. Formazione del Contratto e Preventivi',
            content: (
                <div className="space-y-3 text-gray-700 text-sm leading-relaxed">
                    <p>Le richieste di preventivo e i form di contatto presenti sul sito costituiscono una manifestazione di interesse e non un'offerta vincolante.</p>
                    <p>Il contratto si perfeziona quando:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                        <li>Il cliente firma il preventivo/ordine di servizio a noi inviato (per contratti B2B), oppure</li>
                        <li>Il cliente effettua il pagamento del servizio (per prenotazioni online singole), oppure</li>
                        <li>Viene firmato un contratto di servizio ricorrente (es. RSPP esterno annuale)</li>
                    </ul>
                    <p>I preventivi formulati sono validi per 30 giorni salvo diversa indicazione scritta.</p>
                </div>
            ),
        },
        {
            id: 'pagamenti',
            title: '5. Prezzi e Modalità di Pagamento',
            content: (
                <div className="space-y-3 text-gray-700 text-sm leading-relaxed">
                    <p>I prezzi dei servizi sono indicati in Euro (€) e, salvo diversa indicazione, sono comprensivi di IVA ove applicabile.</p>
                    <p><strong>Modalità di pagamento accettate:</strong></p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                        <li>Bonifico bancario (dati comunicati con la fattura/preventivo)</li>
                        <li>Carta di credito/debito tramite circuiti sicuri (Stripe)</li>
                        <li>POS in sede (per servizi erogati in loco)</li>
                    </ul>
                    <p>In caso di mancato pagamento nei termini concordati, si applicheranno gli interessi moratori previsti dal D.Lgs 231/2002 per i contratti B2B.</p>
                    <p>{BRAND.companyFull} si riserva il diritto di modificare i prezzi dei servizi dandone comunicazione preventiva di almeno 30 giorni.</p>
                </div>
            ),
        },
        {
            id: 'disdetta',
            title: '6. Disdetta e Recesso',
            content: (
                <div className="space-y-3 text-gray-700 text-sm leading-relaxed">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <h4 className="font-semibold text-yellow-800 mb-2">Consumatori (art. 52 Codice del Consumo)</h4>
                        <p className="text-yellow-900">Se sei un consumatore (persona fisica che acquista al di fuori dell'attività professionale), hai il diritto di recedere dal contratto entro <strong>14 giorni</strong> dalla stipula senza alcuna penale, salvo per servizi già completamente eseguiti con il tuo esplicito consenso.</p>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="font-semibold text-blue-800 mb-2">Contratti B2B (aziende)</h4>
                        <p className="text-blue-900">Per i contratti di servizio continuativo (es. RSPP annuale, medicina del lavoro), la disdetta deve essere comunicata per iscritto con almeno <strong>30 giorni</strong> di preavviso prima della scadenza contrattuale. Si applicano le condizioni specifiche indicate nel contratto firmato.</p>
                    </div>
                    <p>Per comunicare una disdetta: <a href={`mailto:${BRAND.email}`} className="text-primary-600 underline">{BRAND.email}</a> oppure tramite PEC a <strong>element@legalmail.it</strong>.</p>
                </div>
            ),
        },
        {
            id: 'responsabilita',
            title: '7. Limitazione di Responsabilità',
            content: (
                <div className="space-y-3 text-gray-700 text-sm leading-relaxed">
                    <p>{BRAND.companyFull} si impegna a erogare i propri servizi con la massima diligenza professionale. Tuttavia:</p>
                    <ul className="space-y-2">
                        {[
                            'Non garantisce la disponibilità ininterrotta del sito web (manutenzioni programmate e/o eventi di forza maggiore)',
                            'Non è responsabile per danni indiretti, perdite di profitto o danni consequenziali derivanti dall\'utilizzo dei servizi',
                            'Non è responsabile per contenuti di siti web terzi raggiungibili tramite link presenti sul sito',
                            isMedica ? 'Non è responsabile per diagnosi errate derivanti da informazioni personali incomplete o non veritiere fornite dal paziente' : 'Non è responsabile per violazioni normative derivanti dall\'utilizzo improprio degli attestati di formazione da parte del datore di lavoro',
                        ].map((item, i) => (
                            <li key={i} className="flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>
                    <p>La responsabilità di {BRAND.companyFull} è in ogni caso limitata al valore del servizio acquistato, salvo dolo o colpa grave.</p>
                </div>
            ),
        },
        {
            id: 'proprieta',
            title: '8. Proprietà Intellettuale',
            content: (
                <div className="space-y-3 text-gray-700 text-sm leading-relaxed">
                    <p>Tutti i contenuti presenti sul sito {BRAND.domain} — inclusi testi, immagini, loghi, grafica, materiali formativi, software — sono di proprietà esclusiva di {BRAND.companyFull} o concessi in licenza da terzi.</p>
                    <p>È vietato riprodurre, distribuire, modificare o utilizzare tali contenuti senza previa autorizzazione scritta di {BRAND.companyFull}, salvo per uso personale non commerciale.</p>
                    <p>Gli attestati di formazione rilasciati da {BRAND.name} sono documenti ufficiali: la contraffazione o l'alterazione costituisce reato ai sensi del Codice Penale.</p>
                </div>
            ),
        },
        {
            id: 'legge',
            title: '9. Legge Applicabile e Foro Competente',
            content: (
                <div className="space-y-3 text-gray-700 text-sm leading-relaxed">
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                            <Scale className="w-5 h-5 text-gray-600 flex-shrink-0" />
                            <div>
                                <p><strong>Legge applicabile:</strong> Diritto italiano</p>
                                <p className="mt-1"><strong>Foro competente (B2B):</strong> {COMMON.foro}</p>
                                <p className="mt-1"><strong>Foro competente (Consumatori):</strong> Il foro del luogo di residenza o domicilio del consumatore, conformemente all'art. 66-bis Cod. Consumo</p>
                            </div>
                        </div>
                    </div>
                    <p>Per la risoluzione di controversie, si tenta preliminarmente una composizione amichevole tramite comunicazione scritta a <a href={`mailto:${BRAND.email}`} className="text-primary-600 underline">{BRAND.email}</a>.</p>
                    <p>Per i consumatori: la Commissione UE mette a disposizione una piattaforma ODR per la risoluzione online delle controversie: <a href="https://ec.europa.eu/consumers/odr" className="text-primary-600 underline" target="_blank" rel="noopener noreferrer">ec.europa.eu/consumers/odr</a>.</p>
                </div>
            ),
        },
        {
            id: 'modifiche',
            title: '10. Modifiche ai Termini',
            content: (
                <div className="space-y-3 text-gray-700 text-sm leading-relaxed">
                    <p>{BRAND.companyFull} si riserva il diritto di modificare i presenti Termini in qualsiasi momento. Le modifiche saranno comunicate tramite avviso sul sito e/o via e-mail agli utenti registrati.</p>
                    <p>L'utilizzo continuato del sito dopo la pubblicazione delle modifiche implica l'accettazione delle stesse. In caso di modifiche sostanziali, verrà richiesto il consenso esplicito.</p>
                    <p className="text-gray-500 text-xs">Ultimo aggiornamento: {COMMON.lastUpdate} — Versione 2.0</p>
                </div>
            ),
        },
    ];

    return (
        <PublicLayout>
            <SEOHead
                title={`Termini di Servizio | ${BRAND.name}`}
                description={`Termini e condizioni di utilizzo del sito ${BRAND.domain} e dei servizi di ${BRAND.companyFull} (${BRAND.name}). Diritto italiano applicabile.`}
                canonicalUrl={BRAND.canonical}

            />

            {/* HEADER */}
            <div style={{ background: '#283646' }} className="py-16 text-white">
                <div className="container mx-auto px-4 max-w-4xl">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                            <Scale className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <p className="text-white/70 text-sm font-medium uppercase tracking-wider">Condizioni Contrattuali</p>
                            <h1 className="text-3xl font-bold">Termini di Servizio</h1>
                        </div>
                    </div>
                    <p className="text-white/90 text-lg max-w-2xl mt-4">
                        Questi Termini regolano il rapporto contrattuale tra {BRAND.companyFull} ({BRAND.name}) e i propri clienti/utenti. Ti invitiamo a leggerli attentamente.
                    </p>
                    <div className="flex flex-wrap gap-4 mt-6 text-sm text-white/80">
                        <span className="flex items-center gap-1"><FileText className="w-4 h-4" /> Diritto Italiano</span>
                        <span className="flex items-center gap-1"><Shield className="w-4 h-4" /> GDPR compliant</span>
                        <span className="flex items-center gap-1"><RefreshCw className="w-4 h-4" /> Agg. {COMMON.lastUpdate}</span>
                    </div>
                </div>
            </div>

            {/* SEZIONI */}
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

                    {/* CONTATTI */}
                    <div className="mt-10 bg-gray-50 border border-gray-200 rounded-2xl p-6">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">Contatti per Informazioni Contrattuali</h2>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="flex items-center gap-3">
                                <Mail className="w-5 h-5 text-primary-600 flex-shrink-0" />
                                <div>
                                    <p className="font-medium text-gray-800 text-sm">Email</p>
                                    <a href={`mailto:${BRAND.email}`} className="text-primary-600 text-sm underline">{BRAND.email}</a>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Phone className="w-5 h-5 text-primary-600 flex-shrink-0" />
                                <div>
                                    <p className="font-medium text-gray-800 text-sm">Telefono</p>
                                    <a href={`tel:${BRAND.phone.replace(/\s/g, '')}`} className="text-primary-600 text-sm underline">{BRAND.phone}</a>
                                </div>
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-4">
                            {BRAND.companyFull} • P.IVA {COMMON.vat} • {COMMON.address}
                        </p>
                    </div>
                </div>
            </div>
        </PublicLayout>
    );
};

export default TerminiStaticPage;
