/**
 * RSPPStaticPage
 *
 * Pagina STATICA sulla nomina RSPP e consulenza sicurezza per Element Sicurezza.
 * NON effettua chiamate CMS API — contenuto hardcoded per SEO perfetto.
 */

import React, { useState } from 'react';
import {
    Shield, CheckCircle, Phone, ArrowRight, Clock, Users, Award,
    FileText, AlertTriangle, ChevronDown, Building2, Star,
    MapPin, ClipboardList, UserCheck, HardHat, TrendingUp, BookOpen,
} from 'lucide-react';
import { PublicLayout } from '../../components/public/PublicLayout';
import { HeroSection } from '../../components/public/HeroSection';
import { PublicButton } from '../../components/public/PublicButton';
import SEOHead from '../../components/seo/SEOHead';
import { ContactForm } from '../../components/public/ContactForm';

// ─────────────────────────────────────────────────────────────────
// DATI
// ─────────────────────────────────────────────────────────────────

const SANZIONI = [
    { viola: 'Omessa valutazione dei rischi (DVR mancante)', sanzione: 'Arresto 3-6 mesi o ammenda €2.457–€6.144', art: 'Art. 55 c.1 lett. a)', grave: true },
    { viola: 'Mancata nomina RSPP', sanzione: 'Arresto 3-6 mesi o ammenda €3.071–€7.862', art: 'Art. 55 c.2', grave: true },
    { viola: 'DVR non aggiornato dopo modifiche', sanzione: 'Ammenda €1.462–€4.386', art: 'Art. 55 c.4', grave: false },
    { viola: 'Omessa formazione lavoratori/preposti/dirigenti', sanzione: 'Arresto 2-4 mesi o ammenda €1.474–€6.388', art: 'Art. 55 c.5', grave: false },
    { viola: 'Mancata sorveglianza sanitaria', sanzione: 'Arresto 2 mesi o ammenda €300–€3.000', art: 'Art. 55 c.7', grave: false },
    { viola: 'Omessa nomina RLS nei tempi', sanzione: 'Ammenda €547–€1.969', art: 'Art. 47 c.7', grave: false },
    { viola: 'Mancata riunione periodica (>15 lav.)', sanzione: 'Sanzione amministrativa €500–€1.800', art: 'Art. 35', grave: false },
];

const MACROSETTORI = [
    { code: 'MS1', name: 'Agricoltura', icon: '🌾' },
    { code: 'MS2', name: 'Pesca', icon: '🐟' },
    { code: 'MS3', name: 'Estrazioni minerali', icon: '⛏️' },
    { code: 'MS4', name: 'Industria', icon: '🏭' },
    { code: 'MS5', name: 'Costruzioni', icon: '🔨' },
    { code: 'MS6', name: 'Trasporti e magazzinaggio', icon: '🚛' },
    { code: 'MS7', name: 'Sanità e servizi sociali', icon: '🏥' },
    { code: 'MS8', name: 'Uffici e servizi', icon: '💼' },
    { code: 'MS9', name: 'Istruzione', icon: '📚' },
];

const CASI_STUDIO = [
    { settore: 'PMI Manifatturiera', dip: 28, prob: 'DVR scaduto, nessun RSPP nominato. Visita ispettiva UOPSAL imminente.', soluz: 'RSPP nominato in 24h, DVR aggiornato in 2 settimane. Nessuna sanzione all\'ispezione.', risparmio: '€14.000 sanzioni evitate' },
    { settore: 'Studio Commercialisti', dip: 12, prob: 'Rischio VDT non valutato, formazione mai erogata.', soluz: 'DVR specifico redatto, corsi VDT e antincendio organizzati, RSPP da DL con corso 16h.', risparmio: 'Conformità completa in 3 settimane' },
    { settore: 'Officina Metalmeccanica', dip: 18, prob: 'Rischi rumore e vibrazioni non gestiti, sorveglianza sanitaria assente.', soluz: 'RSPP esterno qualificato MS4, protocollo sanitario con MC, valutazione rumore strumentale.', risparmio: 'INAIL rate −28% nel biennio' },
    { settore: 'GDO – 3 punti vendita', dip: 65, prob: 'Gestione sicurezza frammentata su più sedi, aggiornamenti scaduti.', soluz: 'RSPP unico per i 3 siti, piattaforma centralizzata scadenze, riqualificazione formazione completa.', risparmio: '-40% tempo gestione sicurezza' },
    { settore: 'Istituto Scolastico Privato', dip: 52, prob: 'Obblighi specifici scuola (D.M. 10/03/1998), piano emergenza assente.', soluz: 'DVR scolastico, piano emergenza, formazione antincendio liv.1 e primo soccorso per tutto il personale.', risparmio: 'Certificazione antincendio ottenuta' },
];

const CHECKLIST = [
    { cat: 'Nomine e Deleghe', items: ['RSPP nominato per iscritto', 'ASPP nominati (se richiesto)', 'MC nominato (se rischi specifici)', 'RLS eletto/designato', 'Addetti emergenza nominati'] },
    { cat: 'Documentazione', items: ['DVR redatto e aggiornato', 'Protocollo sanitario (con MC)', 'Registro infortuni', 'Verbali riunione periodica', 'Registro esposti (se cancerogeni)'] },
    { cat: 'Formazione', items: ['Form. lavoratori (gen. + spec.)', 'Form. preposti', 'Form. dirigenti', 'Primo soccorso addetti', 'Antincendio addetti'] },
    { cat: 'Attrezzature e Ambienti', items: ['Manutenzione DPI certificata', 'Registro attrezzature', 'Segnaletica sicurezza', 'Piano emergenza', 'Certificazioni impianti (D.M. 37/08)'] },
];

const RSPPStaticPage: React.FC = () => {
    const [openFaq, setOpenFaq] = useState<number | null>(null);
    const [openChecklist, setOpenChecklist] = useState<number | null>(null);

    const faqs = [
        { q: 'Chi è il RSPP e perché è obbligatorio?', a: 'Il Responsabile del Servizio di Prevenzione e Protezione è la figura obbligatoria per legge (art. 17 D.Lgs 81/08) incaricata di coordinare la gestione della sicurezza aziendale: valutazione rischi, DVR, misure preventive, formazione. Il DL non può delegare la nomina RSPP — è un obbligo non delegabile.' },
        { q: 'Il datore di lavoro può fare il RSPP da solo?', a: 'Sì, ma solo se: (a) ha frequentato il corso specifico di formazione per il suo macrosettore (16, 32 o 48 ore + 6 ore di aggiornamento ogni 5 anni) e (b) l\'azienda non supera i limiti dimensionali di legge per i settori ad alto rischio. Sopra certi limiti è obbligatorio nominare un RSPP diverso dal DL.' },
        { q: 'Cosa fa concretamente il RSPP esterno di Element Sicurezza?', a: 'L\'RSPP esterno: redige o aggiorna il DVR, elabora le misure preventive, collabora con il MC (se richiesto), partecipa alla riunione periodica annuale (art. 35), effettua sopralluoghi periodici aziendali, risponde a ispezioni di UOPSAL/VV.F/INL, fornisce consulenza continua telefonica.' },
        { q: 'Quanto costa il servizio RSPP esterno?', a: 'Il costo dipende dalla dimensione dell\'azienda e dal macrosettore ATECO. Indicativamente: micro-imprese fino a 10 dip. da €400/anno in base al rischio; PMI 10-30 dip. da €1.000/anno in base al rischio; aziende 30-100 dip. €2.000-€3.500/anno. Le tariffe includono DVR, riunione periodica, sopralluogo e consulenza. Richiedi un preventivo gratuito.' },
        { q: 'RSPP esterno o RSPP interno: quale conviene?', a: 'L\'RSPP esterno conviene a PMI (< 100-150 dip.) che non hanno un dipendente con la specializzazione richiesta dagli Accordi Stato-Regioni. Costi fissi ridotti, nessuna formazione da organizzare, competenza specialistica immediata. L\'RSPP interno conviene ad aziende grandi con necessità di presidio continuo.' },
        { q: 'Cosa succede se l\'RSPP si dimette o recede dall\'incarico?', a: 'L\'RSPP esterno che cessa l\'incarico deve darne comunicazione scritta con preavviso. Il DL deve nominare immediatamente un nuovo RSPP. Element Sicurezza garantisce la continuità del servizio e la gestione ordinata della transizione, consegnando tutta la documentazione prodotta.' },
        { q: 'Il RSPP esterno ha responsabilità penali?', a: 'Sì. L\'RSPP esterno risponde penalmente per le omissioni nell\'ambito del proprio mandato (mancata segnalazione di rischi, DVR incompleto, omessa relazione). Per questo è fondamentale nominare un RSPP qualificato e competente per il vostro macrosettore ATECO.' },
        { q: 'Come si aggiorna il DVR?', a: 'Il DVR va aggiornato: (a) immediatamente dopo ogni infortunio grave, (b) quando cambiano le lavorazioni/macchinari/sostanze, (c) in base all\'evoluzione normativa, (d) ogni qualvolta i vecchi provvedimenti si rivelano insufficienti. Element Sicurezza include gli aggiornamenti nel contratto annuale.' },
        { q: 'Con quanti dipendenti è obbligatoria la riunione periodica?', a: 'La riunione periodica (art. 35) è obbligatoria almeno 1 volta all\'anno per aziende con più di 15 lavoratori. Vi partecipano DL (o delegato), RSPP, MC (se nominato) e RLS. Va verbalizzata e il verbale conservato.' },
        { q: 'Posso avere un unico fornitore per RSPP, formazione e medicina del lavoro?', a: 'Sì. Element Sicurezza offre un servizio integrato: RSPP esterno, medico competente aziendale, corsi di formazione obbligatoria D.Lgs 81/08. Un solo contratto, un solo interlocutore, gestione centralizzata di scadenze e documentazione. Preventivo integrato gratuito.' },
    ];

    const structuredData = {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'ProfessionalService',
                name: 'Element Sicurezza – Servizio RSPP Esterno',
                url: 'https://www.elementsicurezza.com/rspp',
                telephone: '+39-351-623-9176',
                email: 'info@elementsicurezza.com',
                address: {
                    '@type': 'PostalAddress',
                    streetAddress: 'Via Bracciano 34',
                    addressLocality: 'Selvazzano Dentro',
                    postalCode: '35030',
                    addressRegion: 'PD',
                    addressCountry: 'IT',
                },
                areaServed: { '@type': 'AdministrativeArea', name: 'Padova e Veneto' },
                hasOfferCatalog: {
                    '@type': 'OfferCatalog',
                    name: 'Servizio RSPP Esterno',
                    itemListElement: [
                        { '@type': 'Offer', name: 'RSPP Esterno Micro', price: '400', priceCurrency: 'EUR', description: 'Fino a 10 dipendenti/anno, in base al rischio' },
                        { '@type': 'Offer', name: 'RSPP Esterno Business', price: '1200', priceCurrency: 'EUR', description: 'Fino a 50 dipendenti/anno' },
                    ],
                },
            },
            {
                '@type': 'FAQPage',
                mainEntity: faqs.map(f => ({
                    '@type': 'Question',
                    name: f.q,
                    acceptedAnswer: { '@type': 'Answer', text: f.a },
                })),
            },
        ],
    };

    return (
        <PublicLayout>
            <SEOHead
                title="RSPP Esterno Padova | Nomina RSPP e DVR | Element Sicurezza"
                description="Servizio RSPP esterno a Padova: nomina RSPP qualificato per tutti i macrosettori ATECO, DVR, valutazione rischi, riunione periodica. Da €400/anno. Attivazione 24h. Preventivo gratuito."
                keywords={['RSPP esterno Padova', 'nomina RSPP', 'RSPP esterno Selvazzano', 'DVR valutazione rischi', 'D.Lgs 81/08 sicurezza', 'sicurezza sul lavoro Padova', 'RSPP Padova', 'servizio sicurezza aziendale', 'Selvazzano Dentro', 'corsi di sicurezza RSPP', 'responsabile sicurezza Padova']}
                canonicalUrl="https://www.elementsicurezza.com/rspp"
                ogTitle="RSPP Esterno | Element Sicurezza – Padova e Veneto"
                ogDescription="Nomina RSPP esterno qualificato, DVR e consulenza sicurezza per aziende a Padova e Veneto. Da €400/anno. Preventivo gratuito."
                structuredData={structuredData}
            />

            {/* HERO */}
            <HeroSection
                title={<>Nomina RSPP Esterno<br /><span style={{ color: 'var(--color-primary-300)' }}>Padova e Veneto</span></>}
                subtitle="Responsabile Servizio Prevenzione e Protezione Qualificato"
                description="RSPP esterno qualificato per tutti i 9 macrosettori ATECO. DVR, valutazione rischi, riunione periodica e consulenza continua. Attivazione entro 24 ore. Prevenzione sanzioni fino a €7.800."
                backgroundVariant="gradient"
                backgroundPattern="diagonal-lines"
                primaryButton={{ text: 'Richiedi Preventivo Gratuito', href: '/contatti', icon: <ArrowRight className="w-5 h-5" /> }}
                secondaryButton={{ text: 'Chiama +39 351 623 9176', href: 'tel:+393516239176' }}
                stats={[
                    { value: '500+', label: 'Aziende Servite', icon: <Building2 className="w-5 h-5" /> },
                    { value: '9', label: 'Macrosettori ATECO', icon: <Shield className="w-5 h-5" /> },
                    { value: '24h', label: 'Attivazione', icon: <Clock className="w-5 h-5" />, highlight: true },
                    { value: '15+', label: 'Anni Esperienza', icon: <Award className="w-5 h-5" /> },
                ]}
            />

            {/* PERCHÉ IL RSPP È OBBLIGO */}
            <section className="py-16 bg-amber-50 border-b border-amber-200">
                <div className="container mx-auto px-4">
                    <div className="max-w-4xl mx-auto flex gap-6 items-start">
                        <AlertTriangle className="w-12 h-12 text-amber-600 flex-shrink-0 mt-1" />
                        <div>
                            <h2 className="text-2xl font-bold text-amber-900 mb-3">La Nomina RSPP è un Obbligo Non Delegabile del Datore di Lavoro</h2>
                            <p className="text-amber-800 text-lg mb-4">L'art. 17 D.Lgs 81/08 stabilisce che <strong>la nomina dell'RSPP non può essere delegata</strong>. Il datore di lavoro deve designare l'RSPP sin dall'inizio dell'attività, indipendentemente dal numero di dipendenti. La mancata nomina comporta <strong>arresto da 3 a 6 mesi o ammenda da €3.071 a €7.862</strong>.</p>
                            <div className="grid md:grid-cols-3 gap-4 mt-6">
                                {[
                                    { label: 'Sanzione massima mancata nomina RSPP', value: '€7.862' },
                                    { label: 'Sanzione massima DVR mancante', value: '€6.144' },
                                    { label: 'Costo RSPP esterno da', value: '€400/anno' },
                                ].map((s, i) => (
                                    <div key={i} className="bg-white rounded-xl p-4 text-center border border-amber-200">
                                        <div className="text-2xl font-bold text-amber-700">{s.value}</div>
                                        <div className="text-sm text-amber-600 mt-1">{s.label}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* SERVIZI INCLUSI */}
            <section className="py-16 bg-white">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-gray-900 mb-3">Cosa Include il Servizio RSPP Esterno</h2>
                        <p className="text-gray-600 max-w-2xl mx-auto">Un servizio completo per la gestione della sicurezza in conformità al D.Lgs 81/08</p>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[
                            { icon: ClipboardList, title: 'DVR – Documento Valutazione Rischi', desc: 'Redazione e aggiornamento del DVR con identificazione dei rischi specifici, misure preventive e cronoprogramma interventi.', badge: 'Obbligatorio' },
                            { icon: UserCheck, title: 'Nomina RSPP Formale', desc: 'Lettera di nomina formale conforme art. 17 D.Lgs 81/08, con indicazione delle responsabilità. Adempimento completo in 24h.', badge: '24h' },
                            { icon: Users, title: 'Riunione Periodica (Art. 35)', desc: 'Organizzazione e partecipazione alla riunione annuale obbligatoria (aziende >15 dip.) con RSPP, MC, RLS e DL.', badge: 'Annuale' },
                            { icon: MapPin, title: 'Sopralluogi Aziendali', desc: 'Visite periodiche in azienda per verifica condizioni di sicurezza, aggiornamento valutazioni e identificazione nuovi rischi.', badge: 'Periodici' },
                            { icon: BookOpen, title: 'Gestione Formazione', desc: 'Pianificazione e coordinamento corsi obbligatori (lavoratori, preposti, dirigenti, RLS, PS, antincendio). Gestione automatica scadenze.', badge: 'Integrato' },
                            { icon: Phone, title: 'Consulenza Continua', desc: 'Assistenza telefonica e via email su questioni di sicurezza, fornitori DPI, procedure operative, ispezioni e modifiche normative.', badge: 'H24/5' },
                        ].map((s, i) => (
                            <div key={i} className="bg-gray-50 rounded-2xl p-6 hover:shadow-md transition-all hover:bg-white border border-transparent hover:border-gray-200">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0">
                                        <s.icon className="w-6 h-6 text-primary-700" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-bold text-gray-900">{s.title}</h3>
                                            <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">{s.badge}</span>
                                        </div>
                                        <p className="text-sm text-gray-600">{s.desc}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* PRICING */}
            <section className="py-16 bg-gray-50">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-gray-900 mb-3">Tariffe RSPP Esterno</h2>
                        <p className="text-gray-600">Prezzi chiari e all-inclusive. Nessun costo nascosto.</p>
                    </div>
                    <div className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto">
                        {[
                            { name: 'Micro', subtitle: 'Fino a 10 dip.', price: 'da €400', period: '/anno', note: 'in base al rischio', included: ['DVR base', 'Nomina RSPP', '1 sopralluogo/anno', 'Consulenza telefonica', 'Gestione scadenze'], badge: null },
                            { name: 'Small', subtitle: '10-30 dip.', price: 'da €1.000', period: '/anno', note: 'in base al rischio', included: ['Tutto Small +', 'DVR completo', '2 sopralluoghi/anno', 'Riunione periodica', 'Pianificazione corsi'], badge: null },
                            { name: 'Business', subtitle: '30-100 dip.', price: '€2.000', period: '/anno', note: 'in base al rischio', included: ['Tutto Small +', 'Aggiornamenti DVR illimitati', '4 sopralluoghi/anno', 'Formazione coordinata', 'Piattaforma digitale HR', 'Assistenza ispezioni'], badge: null },
                            { name: 'Enterprise', subtitle: '100+ dip.', price: 'Su Misura', period: '', note: 'in base al rischio', included: ['Account manager', 'Multi-sede', 'SLA 24h', 'Integrazione SW aziendale', 'Audit sicurezza', 'Reportistica avanzata'], badge: null },
                        ].map((p, i) => (
                            <div key={i} className={`bg-white rounded-2xl p-6 shadow-sm border-2 ${p.badge ? 'border-primary-500 relative' : 'border-gray-100'}`}>
                                {p.badge && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                        <span className="bg-primary-600 text-white text-xs font-bold px-4 py-1 rounded-full">{p.badge}</span>
                                    </div>
                                )}
                                <h3 className="text-lg font-bold text-gray-900 mb-1">{p.name}</h3>
                                <p className="text-xs text-gray-500 mb-4">{p.subtitle}</p>
                                <div className="mb-5">
                                    {p.price !== 'Su Misura' ? (
                                        <>
                                            <span className="text-3xl font-bold">{p.price}</span>
                                            <span className="text-gray-500 text-sm">{p.period}</span>
                                            {p.note && <p className="text-xs text-gray-500 mt-1">{p.note}</p>}
                                        </>
                                    ) : (
                                        <>
                                            <span className="text-2xl font-bold">{p.price}</span>
                                            {p.note && <p className="text-xs text-gray-500 mt-1">{p.note}</p>}
                                        </>
                                    )}
                                </div>
                                <ul className="space-y-2 mb-6">
                                    {p.included.map((f, j) => (
                                        <li key={j} className="flex items-center gap-2 text-sm text-gray-700">
                                            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />{f}
                                        </li>
                                    ))}
                                </ul>
                                <PublicButton to="/contatti" variant={p.badge ? 'primary' : 'outline'} className="w-full justify-center" size="sm">
                                    Richiedi Preventivo
                                </PublicButton>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* MACROSETTORI */}
            <section className="py-16 bg-white">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-10">
                        <h2 className="text-3xl font-bold text-gray-900 mb-3">Qualificato per Tutti i 9 Macrosettori ATECO</h2>
                        <p className="text-gray-600">Gli RSPP di Element Sicurezza hanno la formazione specifica richiesta dagli Accordi Stato-Regioni per ogni macrosettore</p>
                    </div>
                    <div className="grid grid-cols-3 md:grid-cols-9 gap-3 max-w-4xl mx-auto">
                        {MACROSETTORI.map((ms, i) => (
                            <div key={i} className="bg-gray-50 rounded-xl p-3 text-center border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-all">
                                <div className="text-2xl mb-1">{ms.icon}</div>
                                <div className="text-xs font-bold text-primary-700">{ms.code}</div>
                                <div className="text-xs text-gray-600 mt-0.5">{ms.name}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* SANZIONI */}
            <section className="py-16 bg-red-50 border-y border-red-200">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-10">
                        <h2 className="text-3xl font-bold text-red-900 mb-3">Sanzioni per Violazioni D.Lgs 81/2008</h2>
                        <p className="text-red-700">Conoscere le sanzioni aiuta a capire l'importanza dell'investimento nella sicurezza</p>
                    </div>
                    <div className="overflow-x-auto max-w-4xl mx-auto">
                        <table className="w-full bg-white rounded-2xl overflow-hidden shadow-sm">
                            <thead className="bg-red-700 text-white">
                                <tr>
                                    <th className="text-left p-4 text-sm">Violazione</th>
                                    <th className="text-left p-4 text-sm">Sanzione</th>
                                    <th className="text-left p-4 text-sm">Riferimento</th>
                                </tr>
                            </thead>
                            <tbody>
                                {SANZIONI.map((s, i) => (
                                    <tr key={i} className="border-b border-gray-200 bg-white">
                                        <td className="p-4 text-sm text-gray-800">{s.viola}</td>
                                        <td className="p-4 text-sm font-bold text-red-700">{s.sanzione}</td>
                                        <td className="p-4 text-xs text-gray-500 whitespace-nowrap">{s.art}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            {/* CHECKLIST */}
            <section className="py-16 bg-white">
                <div className="container mx-auto px-4 max-w-4xl">
                    <div className="text-center mb-10">
                        <h2 className="text-3xl font-bold text-gray-900 mb-3">Checklist Conformità D.Lgs 81/08</h2>
                        <p className="text-gray-600">Verifica in pochi click se la tua azienda è in regola</p>
                    </div>
                    <div className="space-y-3">
                        {CHECKLIST.map((cat, i) => (
                            <div key={i} className="border border-gray-200 rounded-xl overflow-hidden">
                                <button
                                    className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 transition-colors"
                                    onClick={() => setOpenChecklist(openChecklist === i ? null : i)}
                                >
                                    <div className="flex items-center gap-3">
                                        <HardHat className="w-5 h-5 text-primary-600" />
                                        <span className="font-bold text-gray-900">{cat.cat}</span>
                                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{cat.items.length} punti</span>
                                    </div>
                                    <ChevronDown className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${openChecklist === i ? 'rotate-180' : ''}`} />
                                </button>
                                {openChecklist === i && (
                                    <div className="px-5 pb-5">
                                        <ul className="grid md:grid-cols-2 gap-2">
                                            {cat.items.map((item, j) => (
                                                <li key={j} className="flex items-center gap-2 text-sm text-gray-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                                                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                                                    {item}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CASI STUDIO */}
            <section className="py-16 bg-gray-50">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-gray-900 mb-3">Case Study: Aziende che Abbiamo Messo in Regola</h2>
                        <p className="text-gray-600">Esempi reali di come affrontiamo ogni tipo di situazione</p>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {CASI_STUDIO.map((cs, i) => (
                            <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                                <div className="flex items-center gap-3 mb-4">
                                    <Building2 className="w-6 h-6 text-primary-600" />
                                    <div>
                                        <div className="font-bold text-gray-900">{cs.settore}</div>
                                        <div className="text-xs text-gray-500">{cs.dip} dipendenti</div>
                                    </div>
                                </div>
                                <div className="mb-3">
                                    <div className="text-xs font-bold text-red-600 mb-1">PROBLEMA</div>
                                    <p className="text-sm text-gray-700">{cs.prob}</p>
                                </div>
                                <div className="mb-3">
                                    <div className="text-xs font-bold text-green-600 mb-1">SOLUZIONE</div>
                                    <p className="text-sm text-gray-700">{cs.soluz}</p>
                                </div>
                                <div className="bg-primary-50 rounded-lg px-3 py-2 mt-3">
                                    <div className="text-xs font-bold text-primary-700"><TrendingUp className="w-3 h-3 inline mr-1" />{cs.risparmio}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* TESTIMONIALS */}
            <section className="py-16 bg-white">
                <div className="container mx-auto px-4">
                    <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Cosa Dicono i Nostri Clienti</h2>
                    <div className="grid md:grid-cols-3 gap-6">
                        {[
                            { n: 'Marco Rossi', r: 'Resp. RU', c: 'Industrie Meccaniche SRL', t: 'Collaboriamo da 5 anni. DVR sempre aggiornato, nessuna sorpresa alle ispezioni. RSPP reperibile e competente. Consigliatissimi.' },
                            { n: 'Laura Bianchi', r: 'RSPP aziendale', c: 'Costruzioni Edili SpA', t: 'Affiancamento impeccabile. Hanno gestito 3 sopralluoghi in cantieri diversi in un\'unica giornata. Documentazione sempre in ordine.' },
                            { n: 'Giuseppe Verdi', r: 'Titolare', c: 'Logistica Trasporti Nord', t: 'Finalmente un RSPP che capisce davvero i rischi della logistica. Sistema digitale eccellente, zero scartoffie cartacee.' },
                            { n: 'Anna Ferretti', r: 'Office Manager', c: 'Studio Commercialisti 40 pers.', t: 'Pensavo fosse complicato adeguarsi. Element ci ha guidati passo per passo. Tutto in regola in 3 settimane.' },
                            { n: 'Roberto Neri', r: 'Direttore Produzione', c: 'Metalmeccanica (18 dip.)', t: 'Ottima conoscenza dei rischi metalmeccanici. DVR molto dettagliato, piano miglioramento con priorità chiare.' },
                            { n: 'Silvia Martini', r: 'HR Manager', c: 'GDO – 3 sedi (65 dip.)', t: 'Gestione centralizzata per le nostre 3 sedi. Un solo referente, tutto sotto controllo. Il costo è inferiore a quello che pagavamo prima per 1 sede sola.' },
                        ].map((t, i) => (
                            <div key={i} className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                                <div className="flex mb-3">{[...Array(5)].map((_, j) => <Star key={j} className="w-4 h-4 text-yellow-400 fill-yellow-400" />)}</div>
                                <p className="text-gray-700 text-sm italic mb-4">"{t.t}"</p>
                                <div>
                                    <div className="font-bold text-gray-900 text-sm">{t.n}</div>
                                    <div className="text-xs text-gray-500">{t.r} — {t.c}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* FAQ */}
            <section className="py-16 bg-gray-50">
                <div className="container mx-auto px-4 max-w-3xl">
                    <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Domande Frequenti sull'RSPP</h2>
                    <div className="space-y-3">
                        {faqs.map((faq, i) => (
                            <div key={i} className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                                <button
                                    className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 transition-colors"
                                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                >
                                    <span className="font-medium text-gray-900 pr-4">{faq.q}</span>
                                    <ChevronDown className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                                </button>
                                {openFaq === i && (
                                    <div className="px-5 pb-5 text-gray-700 text-sm leading-relaxed">{faq.a}</div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA CONTATTI */}
            <section className="py-16" style={{ background: 'linear-gradient(135deg, #283646 0%, #1d2f40 100%)' }}>
                <div className="container mx-auto px-4">
                    <div className="grid lg:grid-cols-2 gap-12 items-start">
                        <div className="text-white">
                            <h2 className="text-3xl font-bold mb-4">Nomina il tuo RSPP Esterno Oggi</h2>
                            <p className="text-white/90 mb-6 text-lg">Preventivo gratuito in 24 ore. Nomina formalizzata entro 24 ore dalla firma del mandato. Servizio attivo immediatamente.</p>
                            <div className="space-y-3">
                                {['RSPP qualificato tutti macrosettori ATECO', 'DVR incluso nel servizio', 'Riunione periodica annuale inclusa', 'Consultazione continua H24/5', 'Piattaforma digitale scadenze inclusa'].map((f, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <CheckCircle className="w-5 h-5 text-primary-300 flex-shrink-0" />
                                        <span className="text-white/95">{f}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-8 flex flex-wrap gap-4">
                                <a href="tel:+393516239176" className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-full font-medium transition-all">
                                    <Phone className="w-5 h-5" />+39 351 623 9176
                                </a>
                                <a href="https://wa.me/393516239176" className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-full font-medium transition-all">
                                    WhatsApp
                                </a>
                            </div>
                        </div>
                        <div className="bg-white rounded-2xl p-8 shadow-xl">
                            <h3 className="text-xl font-bold text-gray-900 mb-6">Richiedi Preventivo RSPP Gratuito</h3>
                            <ContactForm
                                variant="compact"
                                subjects={[
                                    { value: 'rspp-micro', label: 'RSPP Micro (fino a 10 dip.)' },
                                    { value: 'rspp-pmi', label: 'RSPP PMI (10-100 dip.)' },
                                    { value: 'rspp-enterprise', label: 'RSPP Enterprise (100+ dip.)' },
                                    { value: 'dvr', label: 'DVR Valutazione Rischi' },
                                    { value: 'pacchetto-integrato', label: 'Pacchetto RSPP + Formazione + MC' },
                                    { value: 'preventivo', label: 'Preventivo Personalizzato' },
                                ]}
                            />
                        </div>
                    </div>
                </div>
            </section>
        </PublicLayout>
    );
};

export default RSPPStaticPage;
