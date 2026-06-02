/**
 * CookiePolicyStaticPage
 *
 * Pagina Cookie Policy STATICA brand-aware (GDPR / ePrivacy Directive compliant).
 * NON usa CMS API — contenuto hardcoded per SEO e disponibilità garantita.
 * Ultimo aggiornamento: aprile 2025.
 */

import React, { useState } from 'react';
import { Cookie, ChevronDown, Shield, Settings, BarChart2, Megaphone, RefreshCw } from 'lucide-react';
import { PublicLayout } from '../../components/public/PublicLayout';
import SEOHead from '../../components/seo/SEOHead';

const brandId = import.meta.env.VITE_BRAND_ID || 'element-sicurezza';
const isMedica = brandId === 'element-medica';

const BRAND = isMedica
    ? {
        name: 'Element Medica',
        domain: 'elementmedica.com',
        email: 'info@elementmedica.com',
        canonical: 'https://www.elementmedica.com/cookie-policy',
    }
    : {
        name: 'Element Sicurezza',
        domain: 'elementsicurezza.com',
        email: 'info@elementsicurezza.com',
        canonical: 'https://www.elementsicurezza.com/cookie-policy',
    };

const LAST_UPDATE = 'Aprile 2025';

interface CookieRow {
    name: string;
    provider: string;
    purpose: string;
    expiry: string;
    type: string;
}

const TECNICI: CookieRow[] = [
    { name: 'session_id', provider: BRAND.domain, purpose: 'Mantiene la sessione utente autenticata', expiry: 'Fine sessione', type: 'Session' },
    { name: 'auth_token', provider: BRAND.domain, purpose: 'Token di autenticazione sicuro (JWT HttpOnly)', expiry: '7 giorni', type: 'Persistente' },
    { name: 'csrf_token', provider: BRAND.domain, purpose: 'Protezione CSRF (Cross-Site Request Forgery)', expiry: 'Fine sessione', type: 'Session' },
    { name: 'cookie-consent', provider: BRAND.domain, purpose: 'Salva le preferenze cookie dell\'utente', expiry: '1 anno', type: 'Persistente' },
    { name: '_locale', provider: BRAND.domain, purpose: 'Memorizza la lingua preferita', expiry: '1 anno', type: 'Persistente' },
];

const ANALYTICS: CookieRow[] = [
    { name: '_ga', provider: 'Google Analytics', purpose: 'Distingue gli utenti unici (Google Analytics 4)', expiry: '2 anni', type: 'Persistente' },
    { name: '_ga_*', provider: 'Google Analytics', purpose: 'Mantiene lo stato della sessione di Analytics', expiry: '2 anni', type: 'Persistente' },
    { name: '_gid', provider: 'Google Analytics', purpose: 'Distingue gli utenti nelle ultime 24 ore', expiry: '24 ore', type: 'Persistente' },
];

const MARKETING: CookieRow[] = [
    { name: '_fbp', provider: 'Meta (Facebook)', purpose: 'Pixel di tracciamento per campagne pubblicitarie Facebook', expiry: '90 giorni', type: 'Persistente' },
    { name: '_fbc', provider: 'Meta (Facebook)', purpose: 'Traccia i click su annunci Facebook', expiry: '2 anni', type: 'Persistente' },
    { name: 'li_sugr', provider: 'LinkedIn', purpose: 'LinkedIn Insight Tag per analytics e retargeting', expiry: '90 giorni', type: 'Persistente' },
];

const CookieTable: React.FC<{ rows: CookieRow[] }> = ({ rows }) => (
    <div className="overflow-x-auto mt-3">
        <table className="w-full border-collapse text-sm">
            <thead>
                <tr className="bg-gray-100">
                    <th className="border border-gray-200 p-2 text-left font-semibold text-gray-800">Nome</th>
                    <th className="border border-gray-200 p-2 text-left font-semibold text-gray-800">Fornitore</th>
                    <th className="border border-gray-200 p-2 text-left font-semibold text-gray-800">Finalità</th>
                    <th className="border border-gray-200 p-2 text-left font-semibold text-gray-800">Scadenza</th>
                    <th className="border border-gray-200 p-2 text-left font-semibold text-gray-800">Tipo</th>
                </tr>
            </thead>
            <tbody>
                {rows.map((row, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="border border-gray-200 p-2 font-mono text-xs text-gray-700">{row.name}</td>
                        <td className="border border-gray-200 p-2 text-gray-700">{row.provider}</td>
                        <td className="border border-gray-200 p-2 text-gray-600">{row.purpose}</td>
                        <td className="border border-gray-200 p-2 text-gray-700 whitespace-nowrap">{row.expiry}</td>
                        <td className="border border-gray-200 p-2 text-gray-700">{row.type}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

const CookiePolicyStaticPage: React.FC = () => {
    const [openSection, setOpenSection] = useState<string | null>('cosa');

    const sections = [
        {
            id: 'cosa',
            title: '1. Cosa sono i Cookie',
            icon: Cookie,
            color: 'gray',
            content: (
                <div className="space-y-3 text-gray-700 text-sm leading-relaxed">
                    <p>I cookie sono piccoli file di testo che i siti web visitati dagli utenti inviano e registrano nel loro browser, per poi essere ritrasmessi agli stessi siti alla successiva visita.</p>
                    <p>I cookie consentono ai siti di ricordare le scelte dell'utente (es. nome utente, lingua, caratteristiche del terminale usato per la connessione), al fine di erogare un servizio personalizzato.</p>
                    <p>I cookie possono essere classificati in base a:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                        <li><strong>Durata:</strong> di sessione (eliminati alla chiusura del browser) o persistenti (rimangono per un periodo definito)</li>
                        <li><strong>Provenienza:</strong> di prima parte (impostati dal sito visitato) o di terza parte (impostati da domini diversi)</li>
                        <li><strong>Finalità:</strong> tecnici necessari, analitici, di marketing/profilazione</li>
                    </ul>
                </div>
            ),
        },
        {
            id: 'tecnici',
            title: '2. Cookie Tecnici Necessari',
            icon: Shield,
            color: 'green',
            content: (
                <div className="space-y-3 text-gray-700 text-sm leading-relaxed">
                    <p>I cookie tecnici sono <strong>strettamente necessari</strong> per il corretto funzionamento del sito e non richiedono il tuo consenso (art. 122 comma 1 D.Lgs 196/2003 e Linee guida Garante 2021).</p>
                    <p>Questi cookie non raccolgono dati personali a fini di profilazione e non vengono ceduti a terzi.</p>
                    <CookieTable rows={TECNICI} />
                </div>
            ),
        },
        {
            id: 'analytics',
            title: '3. Cookie Analitici',
            icon: BarChart2,
            color: 'blue',
            content: (
                <div className="space-y-3 text-gray-700 text-sm leading-relaxed">
                    <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-semibold mb-2">
                        Richiede il tuo consenso
                    </div>
                    <p>I cookie analitici vengono utilizzati per raccogliere informazioni sull'utilizzo del sito (pagine visitate, tempo trascorso, flussi di navigazione) in forma anonima o aggregata, al fine di migliorare l'esperienza utente.</p>
                    <p>Utilizziamo <strong>Google Analytics 4</strong> con IP anonimizzato e senza condivisione con altri prodotti Google. Per informazioni sulla privacy di Google: <a href="https://policies.google.com/privacy" className="text-blue-600 underline" target="_blank" rel="noopener noreferrer">policies.google.com/privacy</a>.</p>
                    <CookieTable rows={ANALYTICS} />
                    <p className="text-sm text-gray-600">Puoi disabilitare Google Analytics tramite il plugin ufficiale: <a href="https://tools.google.com/dlpage/gaoptout" className="text-blue-600 underline" target="_blank" rel="noopener noreferrer">Google Analytics Opt-out</a>.</p>
                </div>
            ),
        },
        {
            id: 'marketing',
            title: '4. Cookie di Marketing e Profilazione',
            icon: Megaphone,
            color: 'purple',
            content: (
                <div className="space-y-3 text-gray-700 text-sm leading-relaxed">
                    <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-xs font-semibold mb-2">
                        Richiede il tuo consenso
                    </div>
                    <p>I cookie di marketing vengono utilizzati per mostrare annunci pubblicitari rilevanti in base ai tuoi interessi, misurare l'efficacia delle campagne e costruire un profilo delle tue preferenze.</p>
                    <p>Utilizziamo il Meta Pixel (Facebook) e il LinkedIn Insight Tag a fini di retargeting pubblicitario.</p>
                    <CookieTable rows={MARKETING} />
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mt-2">
                        <p className="text-purple-800 text-xs">Puoi gestire le impostazioni pubblicitarie di Facebook su <a href="https://www.facebook.com/adpreferences" className="underline" target="_blank" rel="noopener noreferrer">facebook.com/adpreferences</a> e quelle di LinkedIn su <a href="https://www.linkedin.com/psettings/advertising" className="underline" target="_blank" rel="noopener noreferrer">linkedin.com/psettings</a>.</p>
                    </div>
                </div>
            ),
        },
        {
            id: 'gestione',
            title: '5. Come Gestire i Cookie',
            icon: Settings,
            color: 'orange',
            content: (
                <div className="space-y-4 text-gray-700 text-sm leading-relaxed">
                    <div>
                        <h4 className="font-semibold text-gray-800 mb-2">Tramite il banner del sito</h4>
                        <p>Puoi gestire le tue preferenze sui cookie in qualsiasi momento cliccando su "Preferenze Cookie" nel banner presente nella parte inferiore del sito o contattandoci all'indirizzo <a href={`mailto:${BRAND.email}`} className="text-primary-600 underline">{BRAND.email}</a>.</p>
                    </div>
                    <div>
                        <h4 className="font-semibold text-gray-800 mb-2">Tramite le impostazioni del browser</h4>
                        <p>Puoi configurare il tuo browser per bloccare o eliminare i cookie. Consulta la guida del tuo browser:</p>
                        <ul className="mt-2 space-y-1">
                            {[
                                { name: 'Google Chrome', url: 'https://support.google.com/chrome/answer/95647' },
                                { name: 'Mozilla Firefox', url: 'https://support.mozilla.org/kb/enhanced-tracking-protection-firefox-desktop' },
                                { name: 'Safari (macOS/iOS)', url: 'https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac' },
                                { name: 'Microsoft Edge', url: 'https://support.microsoft.com/microsoft-edge/delete-cookies-63947406-40ac-c3b8-57b9-2a946a29ae09' },
                            ].map((b, i) => (
                                <li key={i}>
                                    <a href={b.url} className="text-primary-600 underline" target="_blank" rel="noopener noreferrer">{b.name}</a>
                                </li>
                            ))}
                        </ul>
                        <p className="mt-2 text-gray-500 text-xs">Nota: disabilitare i cookie tecnici potrebbe compromettere il funzionamento di alcune funzionalità del sito.</p>
                    </div>
                    <div>
                        <h4 className="font-semibold text-gray-800 mb-2">Opt-out di terze parti</h4>
                        <p>Puoi disabilitare i cookie di più fornitori contemporaneamente tramite:</p>
                        <ul className="mt-1 space-y-1">
                            <li><a href="https://www.youronlinechoices.com/it/" className="text-primary-600 underline" target="_blank" rel="noopener noreferrer">Your Online Choices (EU)</a></li>
                            <li><a href="https://optout.networkadvertising.org" className="text-primary-600 underline" target="_blank" rel="noopener noreferrer">NAI Opt-out</a></li>
                        </ul>
                    </div>
                </div>
            ),
        },
        {
            id: 'aggiornamenti',
            title: '6. Aggiornamenti alla Cookie Policy',
            icon: RefreshCw,
            color: 'gray',
            content: (
                <div className="space-y-3 text-gray-700 text-sm leading-relaxed">
                    <p>La presente Cookie Policy può essere soggetta ad aggiornamenti. Ti invitiamo a consultarla periodicamente. La data dell'ultimo aggiornamento è indicata in calce.</p>
                    <p>Per ulteriori informazioni sul trattamento dei dati personali consulta la nostra <a href="/privacy-policy" className="text-primary-600 underline">Privacy Policy</a>.</p>
                    <p className="text-gray-500 text-xs">Ultimo aggiornamento: {LAST_UPDATE} — Versione 1.2</p>
                </div>
            ),
        },
    ];

    return (
        <PublicLayout>
            <SEOHead
                title={`Cookie Policy | ${BRAND.name}`}
                description={`Informativa sull'utilizzo dei cookie su ${BRAND.domain}. Scopri quali cookie usiamo, perché e come gestire le tue preferenze. GDPR e ePrivacy compliant.`}
                canonicalUrl={BRAND.canonical}

            />

            {/* HEADER */}
            <div style={{ background: '#283646' }} className="py-16 text-white">
                <div className="container mx-auto px-4 max-w-4xl">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                            <Cookie className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <p className="text-white/70 text-sm font-medium uppercase tracking-wider">Informativa Cookie</p>
                            <h1 className="text-3xl font-bold">Cookie Policy</h1>
                        </div>
                    </div>
                    <p className="text-white/90 text-lg max-w-2xl mt-4">
                        Questa pagina descrive come {BRAND.name} utilizza i cookie e tecnologie simili sul sito {BRAND.domain}, nel rispetto del GDPR (Reg. UE 2016/679) e della Direttiva ePrivacy.
                    </p>
                    <p className="text-white/70 text-sm mt-4">Ultimo aggiornamento: {LAST_UPDATE}</p>
                </div>
            </div>

            {/* RIEPILOGO TIPI */}
            <div className="bg-gray-50 py-8 border-b border-gray-200">
                <div className="container mx-auto px-4 max-w-4xl">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-start gap-3 bg-white p-4 rounded-xl border border-green-200">
                            <Shield className="w-6 h-6 text-green-600 flex-shrink-0" />
                            <div>
                                <h3 className="font-semibold text-gray-900 text-sm">Tecnici Necessari</h3>
                                <p className="text-xs text-gray-600 mt-0.5">Sempre attivi — Nessun consenso richiesto</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3 bg-white p-4 rounded-xl border border-blue-200">
                            <BarChart2 className="w-6 h-6 text-blue-600 flex-shrink-0" />
                            <div>
                                <h3 className="font-semibold text-gray-900 text-sm">Analitici</h3>
                                <p className="text-xs text-gray-600 mt-0.5">Solo con il tuo consenso</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3 bg-white p-4 rounded-xl border border-purple-200">
                            <Megaphone className="w-6 h-6 text-purple-600 flex-shrink-0" />
                            <div>
                                <h3 className="font-semibold text-gray-900 text-sm">Marketing</h3>
                                <p className="text-xs text-gray-600 mt-0.5">Solo con il tuo consenso</p>
                            </div>
                        </div>
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
                                    <div className="flex items-center gap-3">
                                        <section.icon className={`w-5 h-5 text-${section.color}-600 flex-shrink-0`} />
                                        <span className="font-semibold text-gray-900">{section.title}</span>
                                    </div>
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

                    <div className="mt-8 bg-gray-50 border border-gray-200 rounded-2xl p-6 text-center">
                        <p className="text-sm text-gray-700">Per qualsiasi domanda sui cookie e sulla privacy, contattaci a <a href={`mailto:${BRAND.email}`} className="text-primary-600 underline font-medium">{BRAND.email}</a></p>
                        <p className="text-xs text-gray-500 mt-2">Consulta anche la nostra <a href="/privacy-policy" className="text-primary-600 underline">Privacy Policy completa</a></p>
                    </div>
                </div>
            </div>
        </PublicLayout>
    );
};

export default CookiePolicyStaticPage;
