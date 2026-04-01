/**
 * Modulistica Detail Page
 * 
 * Pagina dettaglio per un template modulistica.
 * Mostra info, campi, anteprima, associazioni e risposte compilate.
 * 
 * @module pages/clinica/impostazioni/modulistica
 * @project P53 - Session #23
 */

import React, { useState, useMemo } from 'react';
import { getOptionLabel } from '@/utils/optionHelpers';
import { getMedicoTitle } from '../../../../utils/textFormatters';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    ArrowLeft,
    FileText,
    Info,
    List,
    Eye,
    Link2,
    ClipboardList,
    Clock,
    FileSignature,
    Stethoscope,
    User,
    Settings,
    CheckCircle,
    XCircle,
    AlertTriangle,
    Calendar,
    Search,
    ChevronDown,
    ChevronUp,
    Edit2,
    DollarSign,
    Building2,
    ExternalLink
} from 'lucide-react';
import { useTenantFilter } from '../../../../context/TenantFilterContext';
import {
    modulisticaTemplatesApi,
    modulisticaDocumentiApi,
    tariffarioMedicoApi,
    type DocumentoTemplate,
    type DocumentoTemplateInput,
    type DocumentoCompilato,
    type StatoDocumentoCompilato,
    type TipoDocumentoTemplate,
    type FaseDocumento,
    type CampoTemplate,
    type TariffarioMedico,
    type TipoCompensoMedico
} from '../../../../services/clinicaApi';
import { CRUDPrimaryButton } from '../../../../components/shared/CRUDButton';
import { useToast } from '../../../../hooks/useToast';
import { tariffariAziendaliApi, type VoceTariffarioWithContext } from '../../../../services/tariffarioAziendaleApi';
import TabAnteprima from './components/TabAnteprima';
import TemplateFormModal from './components/TemplateFormModal';
import type { FormData } from './components/types';

// ============================================
// CONSTANTS
// ============================================

const TIPI_DOCUMENTO: Record<TipoDocumentoTemplate, string> = {
    'CONSENSO_INFORMATO': 'Consenso Informato',
    'PRIVACY': 'Informativa Privacy',
    'ANAMNESI': 'Anamnesi',
    'CERTIFICATO': 'Certificato',
    'PRESCRIZIONE': 'Prescrizione',
    'REFERTO': 'Referto',
    'MODULO_GENERICO': 'Modulo Generico',
    'DICHIARAZIONE': 'Dichiarazione',
    'QUESTIONARIO_ANAMNESI_MDL': 'Questionario Anamnesi MDL',
    'QUESTIONARIO_RISCHIO': 'Questionario Rischio',
    'QUESTIONARIO_SINTOMI': 'Questionario Sintomi',
    'SCHEDA_SORVEGLIANZA': 'Scheda Sorveglianza',
    'ALCOL_SCREENING': 'Alcol Screening',
    'ALTRO': 'Altro'
};

const FASI_DOCUMENTO: Record<FaseDocumento, string> = {
    'REGISTRAZIONE': 'Registrazione',
    'PRE_VISITA': 'Pre-visita',
    'DURANTE_VISITA': 'Durante visita',
    'POST_VISITA': 'Post-visita',
    'AMMINISTRATIVO': 'Amministrativo',
    'ALTRO': 'Altro'
};

const STATO_CONFIG: Record<StatoDocumentoCompilato, { label: string; color: string; icon: typeof CheckCircle }> = {
    'BOZZA': { label: 'Bozza', color: 'bg-gray-100 text-gray-700', icon: FileText },
    'DA_FIRMARE': { label: 'Da firmare', color: 'bg-yellow-100 text-yellow-700', icon: FileSignature },
    'FIRMATO_PAZIENTE': { label: 'Firmato paziente', color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
    'FIRMATO_MEDICO': { label: 'Firmato medico', color: 'bg-green-100 text-green-700', icon: CheckCircle },
    'COMPLETATO': { label: 'Completato', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
    'SCADUTO': { label: 'Scaduto', color: 'bg-orange-100 text-orange-700', icon: AlertTriangle },
    'ANNULLATO': { label: 'Annullato', color: 'bg-red-100 text-red-700', icon: XCircle }
};

const TIPO_COLOR: Record<TipoDocumentoTemplate, string> = {
    'CONSENSO_INFORMATO': 'bg-blue-100 text-blue-800',
    'PRIVACY': 'bg-purple-100 text-purple-800',
    'ANAMNESI': 'bg-teal-100 text-teal-800',
    'CERTIFICATO': 'bg-green-100 text-green-800',
    'PRESCRIZIONE': 'bg-orange-100 text-orange-800',
    'REFERTO': 'bg-cyan-100 text-cyan-800',
    'MODULO_GENERICO': 'bg-gray-100 text-gray-800',
    'DICHIARAZIONE': 'bg-yellow-100 text-yellow-800',
    'QUESTIONARIO_ANAMNESI_MDL': 'bg-indigo-100 text-indigo-800',
    'QUESTIONARIO_RISCHIO': 'bg-rose-100 text-rose-800',
    'QUESTIONARIO_SINTOMI': 'bg-amber-100 text-amber-800',
    'SCHEDA_SORVEGLIANZA': 'bg-emerald-100 text-emerald-800',
    'ALCOL_SCREENING': 'bg-violet-100 text-violet-800',
    'ALTRO': 'bg-slate-100 text-slate-800'
};

type DetailTab = 'info' | 'campi' | 'anteprima' | 'associazioni' | 'risposte' | 'tariffario';

const TABS: { id: DetailTab; label: string; icon: typeof Info }[] = [
    { id: 'info', label: 'Informazioni', icon: Info },
    { id: 'campi', label: 'Campi', icon: List },
    { id: 'anteprima', label: 'Anteprima', icon: Eye },
    { id: 'associazioni', label: 'Associazioni', icon: Link2 },
    { id: 'risposte', label: 'Risposte', icon: ClipboardList },
    { id: 'tariffario', label: 'Tariffario MDL', icon: DollarSign }
];

// ============================================
// HELPER
// ============================================

const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('it-IT', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
};

const getCampoTypeLabel = (tipo: string): string => {
    const labels: Record<string, string> = {
        'TEXT': 'Testo',
        'TEXTAREA': 'Testo lungo',
        'NUMBER': 'Numero',
        'EMAIL': 'Email',
        'PHONE': 'Telefono',
        'DATE': 'Data',
        'SELECT': 'Selezione',
        'RADIO': 'Radio',
        'CHECKBOX': 'Checkbox',
        'BOOLEAN': 'Sì/No',
        'SIGNATURE': 'Firma',
        'FILE': 'File',
        'HEADER': 'Intestazione',
        'PARAGRAPH': 'Paragrafo',
        'SEPARATOR': 'Separatore',
        'SCALA_VALUTAZIONE': 'Scala valutazione'
    };
    return labels[tipo] || tipo;
};

// ============================================
// SUB-COMPONENTS
// ============================================

/** Tab Informazioni — read-only template overview */
const TabInfoDetail: React.FC<{ template: DocumentoTemplate }> = ({ template }) => (
    <div className="space-y-6">
        {/* Basic info grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <InfoCard label="Nome" value={template.nome} />
            <InfoCard label="Codice" value={template.codice || '—'} />
            <InfoCard label="Tipo">
                <span className={`px-2 py-0.5 text-xs font-medium rounded ${TIPO_COLOR[template.tipo]}`}>
                    {TIPI_DOCUMENTO[template.tipo] || template.tipo}
                </span>
            </InfoCard>
            <InfoCard label="Fase">
                <span className="text-sm text-gray-900">
                    {FASI_DOCUMENTO[template.fase] || template.fase}
                </span>
            </InfoCard>
            <InfoCard label="Versione" value={`v${template.versione}`} />
            <InfoCard label="Ordine" value={String(template.ordine)} />
        </div>

        {/* Description */}
        {template.descrizione && (
            <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-700 mb-1">Descrizione</h4>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{template.descrizione}</p>
            </div>
        )}

        {/* Flags */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <FlagBadge label="Attivo" active={template.isActive} />
            <FlagBadge label="Obbligatorio" active={template.obbligatorio} />
            <FlagBadge label="Firma paziente" active={template.richiedeFirma} />
            <FlagBadge label="Firma medico" active={template.richiedeFirmaMedico} />
        </div>

        {/* Validity */}
        {template.validitaGiorni && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="w-4 h-4 text-orange-500" />
                Validità: <span className="font-medium">{template.validitaGiorni} giorni</span>
            </div>
        )}
        {template.scadenzaFissa && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4 text-red-500" />
                Scadenza fissa: <span className="font-medium">{formatDate(template.scadenzaFissa as string)}</span>
            </div>
        )}

        {/* Metadata */}
        <div className="pt-4 border-t border-gray-200 text-xs text-gray-500 space-y-1">
            <p>Creato il: {formatDate(template.createdAt)}</p>
            <p>Ultimo aggiornamento: {formatDate(template.updatedAt)}</p>
            <p>Compilati totali: <span className="font-medium text-gray-700">{template._count?.compilati || 0}</span></p>
        </div>
    </div>
);

/** Tab Campi — read-only field list */
const TabCampiDetail: React.FC<{ campi: CampoTemplate[] }> = ({ campi }) => {
    if (!campi?.length) {
        return (
            <div className="text-center py-12 text-gray-500">
                <List className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>Nessun campo configurato</p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {campi.map((campo, idx) => (
                <div
                    key={campo.name || idx}
                    className="bg-white border border-gray-200 rounded-lg p-3 flex items-start gap-3"
                >
                    <span className="flex-shrink-0 w-7 h-7 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center text-xs font-medium">
                        {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-gray-900 text-sm">{campo.label}</span>
                            <span className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                                {getCampoTypeLabel(campo.type)}
                            </span>
                            {campo.required && (
                                <span className="px-1.5 py-0.5 text-xs bg-red-50 text-red-600 rounded">
                                    Obbligatorio
                                </span>
                            )}
                        </div>
                        {campo.placeholder && (
                            <p className="text-xs text-gray-500 mt-0.5">Placeholder: {campo.placeholder}</p>
                        )}
                        {campo.options && campo.options.length > 0 && (
                            <p className="text-xs text-gray-500 mt-0.5">
                                Opzioni: {campo.options.map(o => getOptionLabel(o)).join(', ')}
                            </p>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

/** Tab Associazioni — read-only */
const TabAssociazioniDetail: React.FC<{ template: DocumentoTemplate }> = ({ template }) => {
    const prestazioni = template.prestazioni || [];
    const medici = template.medici || [];

    if (!prestazioni.length && !medici.length) {
        return (
            <div className="text-center py-12 text-gray-500">
                <Link2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>Nessuna associazione configurata</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {prestazioni.length > 0 && (
                <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                        <Settings className="w-4 h-4" />
                        Prestazioni associate ({prestazioni.length})
                    </h4>
                    <div className="space-y-1">
                        {prestazioni.map(p => (
                            <div key={p.prestazioneId} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg text-sm">
                                <CheckCircle className="w-4 h-4 text-teal-500 flex-shrink-0" />
                                <span className="text-gray-900">
                                    {p.prestazione?.nome || p.prestazioneId}
                                </span>
                                {p.prestazione?.codice && (
                                    <span className="text-xs text-gray-500">({p.prestazione.codice})</span>
                                )}
                                {p.obbligatorio && (
                                    <span className="ml-auto text-xs text-red-600">Obbligatorio</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {medici.length > 0 && (
                <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Medici associati ({medici.length})
                    </h4>
                    <div className="space-y-1">
                        {medici.map(m => (
                            <div key={m.medicoId} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg text-sm">
                                <Stethoscope className="w-4 h-4 text-teal-500 flex-shrink-0" />
                                <span className="text-gray-900">
                                    {m.medico
                                        ? `${getMedicoTitle(m.medico.gender as 'MALE' | 'FEMALE' | 'OTHER' | 'NOT_SPECIFIED' | null)} ${m.medico.lastName} ${m.medico.firstName}`
                                        : m.medicoId
                                    }
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// ============================================
// HELPERS – Tab Tariffario MDL
// ============================================

const COMPENSO_MDL_LABELS: Record<TipoCompensoMedico, string> = {
    PERCENTUALE: '%',
    FISSO: '€',
    MINIMO_MASSIMO: 'min/max',
};

function formatCompensoMDL(tm: TariffarioMedico): string {
    const v = Number(tm.compensoMedicoValore ?? 0);
    const min = tm.compensoMedicoMinimo != null ? `min €${Number(tm.compensoMedicoMinimo).toFixed(2)}` : null;
    const max = tm.compensoMedicoMassimo != null ? `max €${Number(tm.compensoMedicoMassimo).toFixed(2)}` : null;
    const bounds = [min, max].filter(Boolean).join(' / ');
    switch (tm.compensoMedicoTipo) {
        case 'PERCENTUALE': return `${v.toFixed(1)}%${bounds ? ` (${bounds})` : ''}`;
        case 'FISSO': return `€${v.toFixed(2)} fisso`;
        case 'MINIMO_MASSIMO': return bounds || `€${v.toFixed(2)}`;
        default: return `€${v.toFixed(2)}`;
    }
}

/** Tab Tariffario MDL — voci di tipo QUESTIONARIO che puntano a questo template
 *  + compensi dei medici del lavoro associati via convenzione */
const TabTariffarioMDL: React.FC<{ templateId: string }> = ({ templateId }) => {
    const { data, isLoading } = useQuery({
        queryKey: ['template-voci-tariffario', templateId],
        queryFn: () => tariffariAziendaliApi.getVociByTemplate(templateId),
        staleTime: 2 * 60 * 1000
    });

    const { data: medicoData, isLoading: loadingMedici } = useQuery({
        queryKey: ['tariffari-medico-mdl'],
        queryFn: () => tariffarioMedicoApi.getAll({ limit: 500 }),
        staleTime: 5 * 60 * 1000
    });

    const voci: VoceTariffarioWithContext[] = data?.data || [];
    const tariffariMedico: TariffarioMedico[] = medicoData?.data || [];

    // Raggruppa per tariffario aziendale (una voce per tariffario in questo contesto)
    const tariffariMap = new Map<string, { voce: VoceTariffarioWithContext; mediciLegati: TariffarioMedico[] }>();
    voci.forEach(voce => {
        const tar = voce.tariffarioAziendale;
        const mediciLegati = tar.convenzioneId
            ? tariffariMedico.filter(tm => tm.convenzioneId === tar.convenzioneId && tm.attivo)
            : [];
        if (!tariffariMap.has(tar.id)) {
            tariffariMap.set(tar.id, { voce, mediciLegati });
        }
    });
    const entries = Array.from(tariffariMap.values());

    if (isLoading || loadingMedici) {
        return (
            <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
            </div>
        );
    }

    if (entries.length === 0) {
        return (
            <div className="text-center py-16">
                <DollarSign className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                <p className="text-gray-500 font-medium">Nessuna voce tariffario collegata</p>
                <p className="text-sm text-gray-400 mt-1">
                    Questo documento non è ancora associato ad alcun tariffario aziendale MDL.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-teal-600" />
                <h3 className="text-sm font-semibold text-gray-700">
                    Tariffari aziendali che includono questo documento ({entries.length})
                </h3>
            </div>
            {entries.map(({ voce, mediciLegati }) => {
                const tar = voce.tariffarioAziendale;
                const aziende = tar.companyAssociations.map(a => a.companyTenantProfile.company.ragioneSociale);
                return (
                    <div key={tar.id} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                        {/* Intestazione tariffario */}
                        <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-200">
                            <div className="flex items-center gap-3">
                                <div>
                                    <a
                                        href={`/poliambulatorio/mdl/tariffari-aziende/${tar.id}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="group flex items-center gap-1.5 font-semibold text-gray-900 hover:text-teal-700 transition-colors"
                                    >
                                        {tar.nome}
                                        <ExternalLink className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-teal-600" />
                                    </a>
                                    <span className="text-xs text-gray-400">{tar.codice}</span>
                                </div>
                                {tar.convenzione && (
                                    <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs border border-blue-200">
                                        Conv. {tar.convenzione.nome}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="text-right">
                                    <span className="font-mono font-bold text-teal-700 text-sm">€{Number(voce.prezzoBase).toFixed(2)}</span>
                                    <span className="text-xs text-gray-400 ml-1">+ {voce.ivaAliquota}% IVA</span>
                                </div>
                                {tar.attivo ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                                        <CheckCircle className="h-3 w-3" />Attivo
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs">
                                        <XCircle className="h-3 w-3" />Inattivo
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="px-5 py-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Aziende associate */}
                            <div>
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                                    <Building2 className="h-3.5 w-3.5" />Aziende associate
                                </p>
                                {aziende.length === 0 ? (
                                    <span className="text-gray-400 text-xs italic">Nessuna azienda</span>
                                ) : (
                                    <div className="flex flex-wrap gap-1">
                                        {aziende.map((az, i) => (
                                            <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs">
                                                <Building2 className="h-3 w-3" />{az}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Compensi medici legati alla convenzione */}
                            <div>
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                                    <Stethoscope className="h-3.5 w-3.5" />
                                    Compensi medici
                                    {tar.convenzioneId ? (
                                        <span className="ml-1 text-xs font-normal text-blue-500">(via convenzione)</span>
                                    ) : (
                                        <span className="ml-1 text-xs font-normal text-gray-400">(nessuna convenzione)</span>
                                    )}
                                </p>
                                {!tar.convenzioneId ? (
                                    <p className="text-xs text-gray-400 italic">
                                        Associa una convenzione al tariffario per collegare i compensi medici.
                                    </p>
                                ) : mediciLegati.length === 0 ? (
                                    <p className="text-xs text-gray-400 italic">
                                        Nessun medico con compenso specifico per la convenzione "{tar.convenzione?.nome}".
                                    </p>
                                ) : (
                                    <div className="space-y-1.5">
                                        {mediciLegati.map(tm => {
                                            const medico = tm.medico;
                                            const nomeStr = medico
                                                ? `${medico.lastName} ${medico.firstName}`.trim()
                                                : `Medico (${tm.medicoId.slice(-6)})`;
                                            return (
                                                <div key={tm.id} className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-teal-50 border border-teal-100 text-xs">
                                                    <span className="font-medium text-gray-800 flex items-center gap-1">
                                                        <Stethoscope className="h-3 w-3 text-teal-600" />
                                                        {nomeStr}
                                                    </span>
                                                    <span className="font-mono font-semibold text-teal-700">
                                                        {formatCompensoMDL(tm)}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

/** Tab Risposte — compiled documents list */
const TabRisposte: React.FC<{ templateId: string }> = ({ templateId }) => {
    const { tenantFilterKey, isReady } = useTenantFilter();
    const [page, setPage] = useState(1);
    const [statoFilter, setStatoFilter] = useState<StatoDocumentoCompilato | ''>('');
    const [search, setSearch] = useState('');
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const limit = 15;

    const { data, isLoading, error } = useQuery({
        queryKey: ['modulistica-documenti', templateId, tenantFilterKey, page, statoFilter],
        queryFn: () => modulisticaDocumentiApi.getAll({
            templateId,
            stato: statoFilter || undefined,
            page,
            limit
        }),
        enabled: isReady
    });

    const documenti = data?.data || [];
    const totalPages = Math.ceil((data?.total || 0) / limit);

    // Client-side filter by patient name
    const filtered = useMemo(() => {
        if (!search.trim()) return documenti;
        const q = search.toLowerCase().trim();
        return documenti.filter(d => {
            const name = `${d.paziente?.lastName || ''} ${d.paziente?.firstName || ''}`.toLowerCase();
            return name.includes(q) || d.paziente?.taxCode?.toLowerCase().includes(q);
        });
    }, [documenti, search]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center text-red-700">
                <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
                Errore nel caricamento delle risposte
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Filters row */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Cerca per paziente..."
                        className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    />
                </div>
                <select
                    value={statoFilter}
                    onChange={e => { setStatoFilter(e.target.value as StatoDocumentoCompilato | ''); setPage(1); }}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
                >
                    <option value="">Tutti gli stati</option>
                    {Object.entries(STATO_CONFIG).map(([value, cfg]) => (
                        <option key={value} value={value}>{cfg.label}</option>
                    ))}
                </select>
            </div>

            {/* Results */}
            {filtered.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                    <ClipboardList className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>{data?.total ? 'Nessuna risposta trovata per i filtri selezionati' : 'Nessuna risposta compilata per questo template'}</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {filtered.map(doc => {
                        const statoCfg = STATO_CONFIG[doc.stato] || STATO_CONFIG['BOZZA'];
                        const StatoIcon = statoCfg.icon;
                        const isExpanded = expandedId === doc.id;

                        return (
                            <div key={doc.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                                {/* Summary row — clickable */}
                                <button
                                    onClick={() => setExpandedId(isExpanded ? null : doc.id)}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-medium text-gray-900 text-sm">
                                                {doc.paziente
                                                    ? `${doc.paziente.lastName} ${doc.paziente.firstName}`
                                                    : 'Paziente sconosciuto'
                                                }
                                            </span>
                                            {doc.paziente?.taxCode && (
                                                <span className="text-xs text-gray-500">{doc.paziente.taxCode}</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {formatDate(doc.createdAt)}
                                            </span>
                                        </div>
                                    </div>
                                    <span className={`flex-shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${statoCfg.color}`}>
                                        <StatoIcon className="w-3 h-3" />
                                        {statoCfg.label}
                                    </span>
                                    {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                                </button>

                                {/* Expanded detail */}
                                {isExpanded && doc.datiCompilati && (
                                    <div className="px-4 pb-4 border-t border-gray-100">
                                        <div className="mt-3 space-y-2">
                                            {Object.entries(doc.datiCompilati as Record<string, unknown>).map(([key, value]) => (
                                                <div key={key} className="flex gap-2 text-sm">
                                                    <span className="text-gray-500 min-w-[140px]">{key}:</span>
                                                    <span className="text-gray-900 font-medium">
                                                        {value === true ? 'Sì' : value === false ? 'No' : String(value ?? '—')}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                        {doc.note && (
                                            <p className="mt-3 text-sm text-gray-600 italic">Note: {doc.note}</p>
                                        )}
                                        {doc.firmaPaziente && (
                                            <p className="mt-2 text-xs text-green-600">
                                                ✓ Firmato dal paziente il {formatDate(doc.firmaPazienteAt)}
                                            </p>
                                        )}
                                        {doc.firmaMedico && (
                                            <p className="text-xs text-green-600">
                                                ✓ Firmato dal medico il {formatDate(doc.firmaMedicoAt)}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-2">
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="px-4 py-2 text-sm border rounded-lg disabled:opacity-50 hover:bg-gray-50"
                    >
                        Precedente
                    </button>
                    <span className="px-4 py-2 text-sm text-gray-600">
                        {page} / {totalPages}
                    </span>
                    <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="px-4 py-2 text-sm border rounded-lg disabled:opacity-50 hover:bg-gray-50"
                    >
                        Successiva
                    </button>
                </div>
            )}
        </div>
    );
};

/** Small helper components */
const InfoCard: React.FC<{ label: string; value?: string; children?: React.ReactNode }> = ({ label, value, children }) => (
    <div className="bg-gray-50 rounded-lg px-4 py-3">
        <span className="block text-xs text-gray-500 mb-0.5">{label}</span>
        {children || <span className="text-sm font-medium text-gray-900">{value}</span>}
    </div>
);

const FlagBadge: React.FC<{ label: string; active: boolean }> = ({ label, active }) => (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${active ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-400'
        }`}>
        {active ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
        {label}
    </div>
);

// ============================================
// MAIN COMPONENT
// ============================================

const ModulisticaDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const { tenantFilterKey, isReady } = useTenantFilter();
    const [activeTab, setActiveTab] = useState<DetailTab>('info');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // Fetch template by ID
    const { data: template, isLoading, error } = useQuery({
        queryKey: ['modulistica-template', id, tenantFilterKey],
        queryFn: () => modulisticaTemplatesApi.getById(id!),
        enabled: isReady && !!id
    });

    // Update mutation
    const updateMutation = useMutation({
        mutationFn: (data: Partial<DocumentoTemplateInput>) =>
            modulisticaTemplatesApi.update(id!, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['modulistica-template', id] });
            queryClient.invalidateQueries({ queryKey: ['modulistica-templates'] });
            showToast({ message: 'Template aggiornato con successo', type: 'success' });
            setIsEditModalOpen(false);
        },
        onError: (error: Error) => {
            showToast({ message: 'Errore nell\'aggiornamento', type: 'error' });
        }
    });

    // Build FormData shape for TabAnteprima (read-only reuse)
    const formDataForPreview: FormData | null = useMemo(() => {
        if (!template) return null;
        return {
            nome: template.nome,
            descrizione: template.descrizione || '',
            codice: template.codice || '',
            tipo: template.tipo,
            fase: template.fase,
            branchTypes: template.branchTypes || [],
            richiedeFirma: template.richiedeFirma,
            richiedeFirmaMedico: template.richiedeFirmaMedico,
            richiedeFirmaDipendente: (template as any).richiedeFirmaDipendente ?? false,
            richiedeFirmaFormatore: (template as any).richiedeFirmaFormatore ?? false,
            richiedeFirmaDatore: (template as any).richiedeFirmaDatore ?? false,
            firmaPosition: ((template as any).firmaPosition as FormData['firmaPosition']) || 'footer',
            validitaGiorni: String(template.validitaGiorni || ''),
            scadenzaFissa: template.scadenzaFissa ? (template.scadenzaFissa as string).split('T')[0] : '',
            obbligatorio: template.obbligatorio,
            isActive: template.isActive,
            ordine: template.ordine,
            contenutoHtml: template.contenutoHtml || '',
            campi: (template.campi as CampoTemplate[]) || [],
            prestazioniIds: template.prestazioni?.map(p => p.prestazioneId) || [],
            mediciIds: template.medici?.map(m => m.medicoId) || [],
            haScoring: (template as any).questionarioConfig?.haScoring ?? false,
            scoringMaxScore: (template as any).questionarioConfig?.scoringConfig?.maxScore ?? 100,
            scoringPassingScore: (template as any).questionarioConfig?.scoringConfig?.passingScore ?? 60,
            sogliaCritica: (template as any).questionarioConfig?.sogliaCritica ?? 30,
            // MDL
            specializzazione: (template as any).questionarioConfig?.specializzazione ?? '',
            codiciRischio: (template as any).questionarioConfig?.codiciRischio ?? [],
            tipiVisitaMDL: (template as any).questionarioConfig?.tipiVisitaMDL ?? [],
            compilabileDa: (template as any).questionarioConfig?.compilabileDa ?? 'MEDICO',
            tempoStimato: String((template as any).questionarioConfig?.tempoStimato ?? ''),
            istruzioniPaziente: (template as any).questionarioConfig?.istruzioniPaziente ?? '',
            istruzioniMedico: (template as any).questionarioConfig?.istruzioniMedico ?? '',
            richiedeRevisione: (template as any).questionarioConfig?.richiedeRevisione !== false,
            periodicitaMesi: String((template as any).questionarioConfig?.periodicitaMesi ?? ''),
            promemoria: (template as any).questionarioConfig?.promemoria ?? false,
            isPagamento: (template as any).questionarioConfig?.isPagamento ?? false,
            fatturabile: (template as any).questionarioConfig?.fatturabile !== false,
            prezzoDefault: String((template as any).questionarioConfig?.prezzoDefault ?? ''),
        };
    }, [template]);

    // ----------------------------------------
    // LOADING / ERROR
    // ----------------------------------------

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600" />
            </div>
        );
    }

    if (error || !template) {
        return (
            <div className="max-w-4xl mx-auto py-12 text-center">
                <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Template non trovato</h2>
                <p className="text-gray-500 mb-6">Il template richiesto non esiste o non è accessibile.</p>
                <button
                    onClick={() => navigate('/poliambulatorio/impostazioni/modulistica')}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Torna alla lista
                </button>
            </div>
        );
    }

    // ----------------------------------------
    // RENDER
    // ----------------------------------------

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-start gap-4">
                <button
                    onClick={() => navigate('/poliambulatorio/impostazioni/modulistica')}
                    className="mt-1 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Torna alla lista"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`px-2.5 py-0.5 text-xs font-medium rounded ${TIPO_COLOR[template.tipo]}`}>
                            {TIPI_DOCUMENTO[template.tipo] || template.tipo}
                        </span>
                        {!template.isActive && (
                            <span className="px-2 py-0.5 text-xs font-medium rounded bg-red-100 text-red-700">Disattivato</span>
                        )}
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 truncate">{template.nome}</h1>
                    {template.codice && (
                        <p className="text-sm text-gray-500 mt-0.5">Codice: {template.codice}</p>
                    )}
                </div>
                <CRUDPrimaryButton
                    onClick={() => setIsEditModalOpen(true)}
                    className="flex-shrink-0"
                >
                    <Edit2 className="w-4 h-4 mr-2" />
                    Modifica
                </CRUDPrimaryButton>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="border-b border-gray-200">
                    <nav className="flex overflow-x-auto scrollbar-hide -mb-px" aria-label="Tabs">
                        {TABS.map(tab => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${isActive
                                        ? 'border-teal-600 text-teal-700'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                >
                                    <Icon className="w-4 h-4" />
                                    {tab.label}
                                    {tab.id === 'risposte' && template._count?.compilati ? (
                                        <span className="ml-1 px-1.5 py-0.5 text-xs bg-teal-100 text-teal-700 rounded-full">
                                            {template._count.compilati}
                                        </span>
                                    ) : null}
                                </button>
                            );
                        })}
                    </nav>
                </div>

                {/* Tab content */}
                <div className="p-6">
                    {activeTab === 'info' && <TabInfoDetail template={template} />}
                    {activeTab === 'campi' && <TabCampiDetail campi={(template.campi as CampoTemplate[]) || []} />}
                    {activeTab === 'anteprima' && formDataForPreview && <TabAnteprima formData={formDataForPreview} />}
                    {activeTab === 'associazioni' && <TabAssociazioniDetail template={template} />}
                    {activeTab === 'risposte' && <TabRisposte templateId={template.id} />}
                    {activeTab === 'tariffario' && <TabTariffarioMDL templateId={template.id} />}
                </div>
            </div>

            {/* Edit Modal */}
            {isEditModalOpen && template && (
                <TemplateFormModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    onSave={(data) => updateMutation.mutate(data)}
                    template={template}
                    isLoading={updateMutation.isPending}
                />
            )}
        </div>
    );
};

export default ModulisticaDetailPage;
