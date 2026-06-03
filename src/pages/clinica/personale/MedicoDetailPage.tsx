/**
 * MedicoDetailPage
 * 
 * Pagina dettaglio medico con visualizzazione completa
 * 
 * @module pages/poliambulatorio/personale/MedicoDetailPage
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Stethoscope,
    ArrowLeft,
    Edit2,
    User,
    Mail,
    Phone,
    CreditCard,
    Building,
    Building2,
    Key,
    AlertCircle,
    Loader2,
    CheckCircle2,
    XCircle,
    Calendar,
    Clock,
    Shield,
    Activity,
    DollarSign,
    Info,
    Plus,
    Save,
    X,
    Trash2,
    Percent,
    RefreshCw,
    FileText,
    ChevronDown,
    ChevronUp,
    TrendingDown,
    Banknote,
    UserCheck,
    Package,
    Check,
    FileSpreadsheet,
} from 'lucide-react';
import {
    mediciApi,
    tariffarioMedicoApi,
    listiniApi,
    bundleApi,
    modulisticaTemplatesApi,
    type Medico,
    type TariffarioMedico,
    type TipoCompensoMedico,
    type ListinoPrezzo,
    type OffertaBundle,
    type DocumentoTemplate
} from '../../../services/clinicaApi';
import { useToast } from '../../../hooks/useToast';
import { formatDoctorName } from '../../../utils/codiceFiscale';
// Progetto 48: Widget multi-tenant
import { PersonTenantProfilesWidget } from '../../../components/person/PersonTenantProfilesWidget';
// P59: Card nomine e attività
import { NomineRuoloCard, AttivitaProfessionistaCard } from '../../../components/nomine';
// Visit permissions card
import { MedicoVisitPermissionsCard } from './components/MedicoVisitPermissionsCard';
import { PersonCredentialsModal } from '../../../components/persons/PersonCredentialsModal';

// Import Element Medica theme
import '../../../styles/clinica-theme.css';
import { apiGet } from '../../../services/api';
import movimentiContabiliService, { type StatoMovimento } from '../../../services/movimentiContabiliService';
import { DateRangeCalendar, DateRange } from '../../../components/ui/DateRangeCalendar';
import { useAuth } from '../../../context/AuthContext';
import { useRoleGuard } from '../../../hooks/useRoleGuard';

// ============================================
// HELPERS
// ============================================

type MedicoTab = 'anagrafica' | 'tariffario' | 'compensi';

const MEDICO_TABS: { id: MedicoTab; label: string; icon: typeof Info }[] = [
    { id: 'anagrafica', label: 'Anagrafica', icon: User },
    { id: 'tariffario', label: 'Tariffario Medico', icon: DollarSign },
    { id: 'compensi', label: 'Compensi', icon: CreditCard },
];

const COMPENSO_TIPO_LABELS: Record<TipoCompensoMedico, string> = {
    PERCENTUALE: 'Percentuale',
    FISSO: 'Fisso',
    MINIMO_MASSIMO: 'Min/Max'
};

const COMPENSO_TIPO_OPTIONS: { value: TipoCompensoMedico; label: string; icon: React.ReactNode }[] = [
    { value: 'PERCENTUALE', label: 'Percentuale', icon: <Percent className="w-3.5 h-3.5" /> },
    { value: 'FISSO', label: 'Importo Fisso', icon: <DollarSign className="w-3.5 h-3.5" /> },
    { value: 'MINIMO_MASSIMO', label: 'Min/Max', icon: <Activity className="w-3.5 h-3.5" /> },
];

const formatData = (d?: string) => d ? new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

const formatCompensoListino = (l: ListinoPrezzo): string => {
    if (!l.compensoMedicoTipo) return '-';
    if (l.compensoMedicoTipo === 'PERCENTUALE') return `${l.compensoMedicoValore ?? '—'}%`;
    if (l.compensoMedicoTipo === 'FISSO') return `€${Number(l.compensoMedicoValore ?? 0).toFixed(2)}`;
    const min = l.compensoMedicoMinimo != null ? `€${Number(l.compensoMedicoMinimo).toFixed(2)}` : '—';
    const max = l.compensoMedicoMassimo != null ? `€${Number(l.compensoMedicoMassimo).toFixed(2)}` : '—';
    return `${min} – ${max}`;
};

const formatCompensо = (t: TariffarioMedico): string => {
    if (t.compensoMedicoTipo === 'PERCENTUALE') return `${t.compensoMedicoValore ?? '—'}%`;
    if (t.compensoMedicoTipo === 'FISSO') return `€${Number(t.compensoMedicoValore ?? 0).toFixed(2)}`;
    const min = t.compensoMedicoMinimo != null ? `€${Number(t.compensoMedicoMinimo).toFixed(2)}` : '—';
    const max = t.compensoMedicoMassimo != null ? `€${Number(t.compensoMedicoMassimo).toFixed(2)}` : '—';
    return `${min} – ${max}`;
};

// ============================================
// TAB TARIFFARIO MEDICO
// ============================================

type ListinoFormTipo = 'prestazione' | 'bundle' | 'questionario';

type ListinoForm = {
    tipo: ListinoFormTipo;
    prestazioneId: string;
    bundleId: string;
    documentoTemplateId: string; // P72_19
    prezzo: string;
    durataMedico: string;
    compensoTipo: TipoCompensoMedico;
    compensoValore: string;
    compensoMinimo: string;
    compensoMassimo: string;
    attivo: boolean;
};

const emptyListinoForm = (): ListinoForm => ({
    tipo: 'prestazione',
    prestazioneId: '',
    bundleId: '',
    documentoTemplateId: '',
    prezzo: '',
    durataMedico: '',
    compensoTipo: 'PERCENTUALE',
    compensoValore: '30',
    compensoMinimo: '',
    compensoMassimo: '',
    attivo: true
});

const TabTariffarioMedici: React.FC<{ medicoId: string; abilitazioni: Medico['abilitazioni'] }> = ({ medicoId, abilitazioni }) => {
    const { showToast } = useToast();
    const queryClient = useQueryClient();
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<ListinoForm>(emptyListinoForm());
    const [showGenericRules, setShowGenericRules] = useState(false);

    // Listini per prestazione (controparte di prestazioni/:id > Listini Medici)
    const { data: listini = [], isLoading: loadingListini } = useQuery({
        queryKey: ['listini-medico', medicoId],
        queryFn: () => listiniApi.getByMedico(medicoId),
        staleTime: 2 * 60 * 1000
    });

    // Regole generali compenso (TariffarioMedico)
    const { data: regoleGenerali = [], isLoading: loadingRegole } = useQuery({
        queryKey: ['tariffario-medico', medicoId],
        queryFn: () => tariffarioMedicoApi.getByMedico(medicoId),
        staleTime: 2 * 60 * 1000
    });

    // P72_18: Bundle disponibili per compenso
    const { data: bundlesData, isLoading: loadingBundles } = useQuery({
        queryKey: ['bundle-list'],
        queryFn: () => bundleApi.getAll(),
        staleTime: 5 * 60 * 1000
    });
    const bundles: OffertaBundle[] = (bundlesData as any)?.data ?? (Array.isArray(bundlesData) ? bundlesData as OffertaBundle[] : []);

    // P72_19: Questionari (DocumentoTemplate con tipo questionario)
    // P72_23: include anche tipi ALCOL_SCREENING e SCHEDA_SORVEGLIANZA (non partono da 'QUESTIONARIO')
    const { data: templateData } = useQuery({
        queryKey: ['modulistica-templates-questionari'],
        queryFn: () => modulisticaTemplatesApi.getAll({ limit: 200 } as any),
        staleTime: 5 * 60 * 1000,
        select: (res) => (res.data ?? []).filter((t: DocumentoTemplate) => {
            const tipo = t.tipo;
            return tipo.startsWith('QUESTIONARIO') || tipo === 'ALCOL_SCREENING' || tipo === 'SCHEDA_SORVEGLIANZA';
        })
    });
    const questionariTemplates: DocumentoTemplate[] = templateData ?? [];

    const createMutation = useMutation({
        mutationFn: (data: Partial<ListinoPrezzo>) => listiniApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['listini-medico', medicoId] });
            showToast({ type: 'success', message: 'Compenso prestazione creato' });
            setIsAdding(false);
            setForm(emptyListinoForm());
        },
        onError: (err: Error) => showToast({ type: 'error', message: 'Errore del server' })
    });

    // P72_19: Separate mutation for bundle creation (dedicated endpoint)
    const createBundleMutation = useMutation({
        mutationFn: (data: Partial<ListinoPrezzo> & { bundleId: string }) => listiniApi.createForBundle(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['listini-medico', medicoId] });
            showToast({ type: 'success', message: 'Compenso bundle creato' });
            setIsAdding(false);
            setForm(emptyListinoForm());
        },
        onError: (err: Error) => showToast({ type: 'error', message: 'Errore del server' })
    });

    // P72_19: Separate mutation for questionario creation
    const createQuestionarioMutation = useMutation({
        mutationFn: (data: Partial<ListinoPrezzo> & { documentoTemplateId: string }) => listiniApi.createForDocumentoTemplate(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['listini-medico', medicoId] });
            showToast({ type: 'success', message: 'Compenso questionario creato' });
            setIsAdding(false);
            setForm(emptyListinoForm());
        },
        onError: (err: Error) => showToast({ type: 'error', message: 'Errore del server' })
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<ListinoPrezzo> }) => listiniApi.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['listini-medico', medicoId] });
            showToast({ type: 'success', message: 'Compenso aggiornato' });
            setEditingId(null);
            setForm(emptyListinoForm());
        },
        onError: (err: Error) => showToast({ type: 'error', message: 'Errore del server' })
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => listiniApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['listini-medico', medicoId] });
            showToast({ type: 'success', message: 'Compenso eliminato' });
        },
        onError: (err: Error) => showToast({ type: 'error', message: 'Errore del server' })
    });

    const handleEdit = (l: ListinoPrezzo) => {
        const tipo: ListinoFormTipo = l.documentoTemplateId ? 'questionario' : l.bundleId ? 'bundle' : 'prestazione';
        setForm({
            tipo,
            prestazioneId: l.prestazioneId || '',
            bundleId: l.bundleId || '',
            documentoTemplateId: l.documentoTemplateId || '',
            prezzo: String(l.prezzo),
            durataMedico: l.durataMedico ? String(l.durataMedico) : '',
            compensoTipo: l.compensoMedicoTipo || 'PERCENTUALE',
            compensoValore: String(l.compensoMedicoValore ?? 30),
            compensoMinimo: l.compensoMedicoMinimo != null ? String(l.compensoMedicoMinimo) : '',
            compensoMassimo: l.compensoMedicoMassimo != null ? String(l.compensoMedicoMassimo) : '',
            attivo: l.attivo
        });
        setEditingId(l.id);
        setIsAdding(false);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (form.tipo === 'prestazione' && !form.prestazioneId) {
            showToast({ type: 'warning', message: 'Seleziona una prestazione' });
            return;
        }
        if (form.tipo === 'bundle' && !form.bundleId) {
            showToast({ type: 'warning', message: 'Seleziona un bundle' });
            return;
        }
        if (form.tipo === 'questionario' && !form.documentoTemplateId) {
            showToast({ type: 'warning', message: 'Seleziona un questionario' });
            return;
        }
        const compensoFields = {
            compensoMedicoTipo: form.compensoTipo,
            compensoMedicoValore: form.compensoTipo !== 'MINIMO_MASSIMO' ? (parseFloat(form.compensoValore) || undefined) : undefined,
            compensoMedicoMinimo: form.compensoMinimo ? parseFloat(form.compensoMinimo) : undefined,
            compensoMedicoMassimo: form.compensoMassimo ? parseFloat(form.compensoMassimo) : undefined,
        };
        const baseFields = {
            medicoId,
            prezzo: parseFloat(form.prezzo) || 0,
            durataMedico: form.durataMedico ? parseInt(form.durataMedico) : undefined,
            attivo: form.attivo,
            ...compensoFields
        };
        if (editingId) {
            // update: send compenso + base fields only (entity ID cannot change)
            updateMutation.mutate({ id: editingId, data: baseFields });
            return;
        }
        // Create: dispatch to correct endpoint by tipo
        if (form.tipo === 'questionario') {
            createQuestionarioMutation.mutate({ ...baseFields, documentoTemplateId: form.documentoTemplateId } as Partial<ListinoPrezzo> & { documentoTemplateId: string });
        } else if (form.tipo === 'bundle') {
            createBundleMutation.mutate({ ...baseFields, bundleId: form.bundleId } as Partial<ListinoPrezzo> & { bundleId: string });
        } else {
            createMutation.mutate({ ...baseFields, prestazioneId: form.prestazioneId });
        }
    };

    const handleCancel = () => {
        setIsAdding(false);
        setEditingId(null);
        setForm(emptyListinoForm());
    };

    if (loadingListini || loadingRegole) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 text-teal-600 animate-spin" />
            </div>
        );
    }

    // Prestazioni disponibili = abilitazioni del medico
    const prestazioniOptions = (abilitazioni || []).filter(a => a.prestazione);

    return (
        <div className="space-y-6">
            {/* === LISTA COMPENSI PER PRESTAZIONE === */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                            <Stethoscope className="h-4 w-4 text-teal-600" />
                            Compensi per Prestazione / Bundle
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Prezzi e compensi specifici per prestazione o bundle — controparte di Prestazioni &gt; Listini Medici
                        </p>
                    </div>
                    {!isAdding && !editingId && (
                        <button
                            onClick={() => setIsAdding(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 transition-colors"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            Aggiungi
                        </button>
                    )}
                </div>

                {/* Form aggiunta / modifica */}
                {(isAdding || editingId) && (
                    <form onSubmit={handleSubmit} className="bg-teal-50 border border-teal-200 rounded-xl p-4 space-y-4">
                        <div className="flex items-center justify-between">
                            <h4 className="text-sm font-semibold text-teal-700">
                                {editingId ? 'Modifica compenso' : 'Nuovo compenso'}
                            </h4>
                        </div>
                        {/* P72_22: picker a 2 colonne — sinistra: categoria, destra: items */}
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Tipo prestazione *</label>
                            {editingId ? (
                                /* Editing: voce selezionata in sola lettura */
                                <div className="px-2.5 py-2 border border-gray-200 bg-gray-50 rounded-lg text-sm text-gray-700 flex items-center gap-2">
                                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${form.tipo === 'prestazione' ? 'bg-teal-100 text-teal-700' : 'bg-violet-100 text-violet-700'
                                        }`}>
                                        {form.tipo === 'prestazione' ? 'Prestazione MDL' : form.tipo === 'questionario' ? 'Questionario' : 'Bundle'}
                                    </span>
                                    <span className="font-medium truncate">
                                        {form.tipo === 'prestazione'
                                            ? prestazioniOptions.find(a => a.prestazione!.id === form.prestazioneId)?.prestazione?.nome
                                            : form.tipo === 'questionario'
                                                ? questionariTemplates.find(t => t.id === form.documentoTemplateId)?.nome
                                                : bundles.find(b => b.id === form.bundleId)?.nome}
                                    </span>
                                    <span className="text-[10px] text-gray-400 ml-auto flex-shrink-0">non modificabile</span>
                                </div>
                            ) : (
                                <div className="flex border border-gray-300 rounded-lg overflow-hidden" style={{ minHeight: '10rem' }}>
                                    {/* Sinistra: tab categoria */}
                                    <div className="flex flex-col border-r border-gray-200 bg-gray-50 shrink-0 w-36">
                                        {([
                                            { tipo: 'prestazione' as ListinoFormTipo, label: 'Prestazioni MDL', count: prestazioniOptions.length, Icon: Stethoscope },
                                            { tipo: 'questionario' as ListinoFormTipo, label: 'Questionari', count: questionariTemplates.length, Icon: FileText },
                                            { tipo: 'bundle' as ListinoFormTipo, label: 'Bundle', count: bundles.filter(b => b.attivo).length, Icon: Package },
                                        ] as const).map(cat => (
                                            <button
                                                key={cat.tipo}
                                                type="button"
                                                onClick={() => setForm(f => ({
                                                    ...f,
                                                    tipo: cat.tipo,
                                                    prestazioneId: cat.tipo === 'prestazione' ? f.prestazioneId : '',
                                                    bundleId: cat.tipo === 'bundle' ? f.bundleId : '',
                                                    documentoTemplateId: cat.tipo === 'questionario' ? f.documentoTemplateId : '',
                                                }))}
                                                className={`flex-1 px-2.5 py-2 text-left text-xs font-medium border-b border-gray-200 last:border-b-0 flex items-center gap-2 transition-colors ${form.tipo === cat.tipo
                                                    ? 'bg-teal-600 text-white shadow-sm'
                                                    : 'text-gray-600 hover:bg-teal-50 hover:text-teal-700'
                                                    }`}
                                            >
                                                <cat.Icon className={`h-3.5 w-3.5 flex-shrink-0 ${form.tipo === cat.tipo ? 'text-white' : 'text-gray-400'}`} />
                                                <span className="leading-tight flex-1 truncate">{cat.label}</span>
                                                <span className={`flex-shrink-0 text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${form.tipo === cat.tipo ? 'bg-white/25 text-white' : 'bg-gray-200 text-gray-500'
                                                    }`}>{cat.count}</span>
                                            </button>
                                        ))}
                                    </div>
                                    {/* Destra: lista items */}
                                    <div className="flex-1 overflow-y-auto" style={{ maxHeight: '10rem' }}>
                                        {form.tipo === 'prestazione' && (
                                            prestazioniOptions.length === 0
                                                ? <p className="p-2.5 text-xs text-gray-400 italic">Nessuna abilitazione MDL per questo medico.</p>
                                                : prestazioniOptions.map(a => {
                                                    const isSel = form.prestazioneId === a.prestazione!.id;
                                                    return (
                                                        <button key={a.prestazione!.id} type="button"
                                                            onClick={() => setForm(f => ({ ...f, prestazioneId: a.prestazione!.id, bundleId: '', documentoTemplateId: '' }))}
                                                            className={`w-full text-left px-2.5 py-1.5 text-xs border-b border-gray-100 last:border-b-0 transition-colors flex items-center gap-2 ${isSel ? 'bg-teal-50 text-teal-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'}`}
                                                        >
                                                            <Check className={`h-3 w-3 flex-shrink-0 ${isSel ? 'text-teal-600' : 'opacity-0'}`} />
                                                            <span className="flex-1">
                                                                {a.prestazione!.codice && <span className="font-mono text-[9px] text-gray-400 mr-1">[{a.prestazione!.codice}]</span>}
                                                                {a.prestazione!.nome}
                                                            </span>
                                                        </button>
                                                    );
                                                })
                                        )}
                                        {form.tipo === 'questionario' && (
                                            questionariTemplates.length === 0
                                                ? <p className="p-2.5 text-xs text-gray-400 italic">Nessun questionario disponibile.</p>
                                                : questionariTemplates.map(t => {
                                                    const isSel = form.documentoTemplateId === t.id;
                                                    return (
                                                        <button key={t.id} type="button"
                                                            onClick={() => setForm(f => ({ ...f, documentoTemplateId: t.id, prestazioneId: '', bundleId: '' }))}
                                                            className={`w-full text-left px-2.5 py-1.5 text-xs border-b border-gray-100 last:border-b-0 transition-colors flex items-center gap-2 ${isSel ? 'bg-violet-50 text-violet-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'}`}
                                                        >
                                                            <Check className={`h-3 w-3 flex-shrink-0 ${isSel ? 'text-violet-600' : 'opacity-0'}`} />
                                                            <span className="flex-1">
                                                                {(t as any).codice && <span className="font-mono text-[9px] text-gray-400 mr-1">[{(t as any).codice}]</span>}
                                                                {t.nome}
                                                            </span>
                                                        </button>
                                                    );
                                                })
                                        )}
                                        {form.tipo === 'bundle' && (
                                            bundles.filter(b => b.attivo).length === 0
                                                ? <p className="p-2.5 text-xs text-gray-400 italic">Nessun bundle attivo.</p>
                                                : bundles.filter(b => b.attivo).map(b => {
                                                    const isSel = form.bundleId === b.id;
                                                    return (
                                                        <button key={b.id} type="button"
                                                            onClick={() => setForm(f => ({ ...f, bundleId: b.id, prestazioneId: '', documentoTemplateId: '' }))}
                                                            className={`w-full text-left px-2.5 py-1.5 text-xs border-b border-gray-100 last:border-b-0 transition-colors flex items-center gap-2 ${isSel ? 'bg-violet-50 text-violet-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'}`}
                                                        >
                                                            <Check className={`h-3 w-3 flex-shrink-0 ${isSel ? 'text-violet-600' : 'opacity-0'}`} />
                                                            {b.nome}
                                                        </button>
                                                    );
                                                })
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {/* Prezzo */}
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Prezzo al paziente (€)
                                    <span className="ml-1 text-gray-400 font-normal">— vuoto = come da tariffario aziendale</span>
                                </label>
                                <input
                                    type="number" step="0.01" min="0"
                                    value={form.prezzo}
                                    onChange={e => setForm(f => ({ ...f, prezzo: e.target.value }))}
                                    className="w-full px-2.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
                                    placeholder="come da tariffario aziendale"
                                />
                            </div>
                            {/* Durata */}
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Durata (min)</label>
                                <input
                                    type="number" step="5" min="5"
                                    value={form.durataMedico}
                                    onChange={e => setForm(f => ({ ...f, durataMedico: e.target.value }))}
                                    className="w-full px-2.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
                                    placeholder="30"
                                />
                            </div>
                        </div>

                        {/* Tipo compenso */}
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Tipo compenso</label>
                            <div className="flex gap-2">
                                {COMPENSO_TIPO_OPTIONS.map(opt => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => setForm(f => ({ ...f, compensoTipo: opt.value, compensoMinimo: '', compensoMassimo: '' }))}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${form.compensoTipo === opt.value
                                            ? 'bg-teal-600 text-white border-teal-600'
                                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                            }`}
                                    >
                                        {opt.icon}{opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {form.compensoTipo !== 'MINIMO_MASSIMO' && (
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                        {form.compensoTipo === 'PERCENTUALE' ? 'Percentuale (%)' : 'Importo fisso (€)'}
                                    </label>
                                    <input
                                        type="number"
                                        step={form.compensoTipo === 'PERCENTUALE' ? '1' : '0.01'}
                                        value={form.compensoValore}
                                        onChange={e => setForm(f => ({ ...f, compensoValore: e.target.value }))}
                                        className="w-full px-2.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
                                    />
                                </div>
                            )}
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    {form.compensoTipo === 'MINIMO_MASSIMO' ? 'Minimo (€) *' : 'Compenso minimo (€)'}
                                </label>
                                <input
                                    type="number" step="0.01"
                                    value={form.compensoMinimo}
                                    onChange={e => setForm(f => ({ ...f, compensoMinimo: e.target.value }))}
                                    className="w-full px-2.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
                                    placeholder="0.00"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    {form.compensoTipo === 'MINIMO_MASSIMO' ? 'Massimo (€) *' : 'Compenso massimo (€)'}
                                </label>
                                <input
                                    type="number" step="0.01"
                                    value={form.compensoMassimo}
                                    onChange={e => setForm(f => ({ ...f, compensoMassimo: e.target.value }))}
                                    className="w-full px-2.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-2">
                            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={form.attivo}
                                    onChange={e => setForm(f => ({ ...f, attivo: e.target.checked }))}
                                    className="rounded border-gray-300 text-teal-600"
                                />
                                Attivo
                            </label>
                            <div className="flex gap-2">
                                <button type="button" onClick={handleCancel}
                                    className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                                    <X className="h-4 w-4" />
                                </button>
                                <button
                                    type="submit"
                                    disabled={createMutation.isPending || createBundleMutation.isPending || createQuestionarioMutation.isPending || updateMutation.isPending}
                                    className="flex items-center gap-1.5 px-4 py-1.5 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
                                >
                                    {(createMutation.isPending || createBundleMutation.isPending || createQuestionarioMutation.isPending || updateMutation.isPending)
                                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        : <Save className="h-3.5 w-3.5" />}
                                    {editingId ? 'Aggiorna' : 'Salva'}
                                </button>
                            </div>
                        </div>
                    </form>
                )}

                {/* Lista listini */}
                {listini.length === 0 ? (
                    <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                        <DollarSign className="mx-auto h-10 w-10 text-gray-300 mb-3" />
                        <p className="text-gray-500 font-medium text-sm">Nessun compenso per prestazione configurato</p>
                        <p className="text-xs text-gray-400 mt-1">
                            I compensi agiunti da Prestazioni &gt; Listini Medici appaiono qui.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-xl border border-gray-200">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Voce</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Prezzo paziente</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo compenso</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Compenso</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Durata</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Stato</th>
                                    <th className="px-4 py-3" />
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {listini.map(l => (
                                    <tr key={l.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3">
                                            {l.documentoTemplateId ? (
                                                <div className="flex items-center gap-1.5">
                                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-xs font-medium">Questionario</span>
                                                    <p className="font-medium text-gray-900">{(l as any).documentoTemplate?.nome || l.documentoTemplateId}</p>
                                                </div>
                                            ) : l.bundleId ? (
                                                <div className="flex items-center gap-1.5">
                                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 text-xs font-medium">Bundle</span>
                                                    <p className="font-medium text-gray-900">{(l as any).bundle?.nome || l.bundleId}</p>
                                                </div>
                                            ) : (
                                                <>
                                                    <p className="font-medium text-gray-900">{l.prestazione?.nome || l.prestazioneId}</p>
                                                    {l.prestazione?.codice && (
                                                        <p className="text-xs text-gray-400 font-mono">{l.prestazione.codice}</p>
                                                    )}
                                                    {l.convenzione && (
                                                        <span className="text-xs text-blue-600">Conv: {l.convenzione.nome}</span>
                                                    )}
                                                </>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono text-teal-700">
                                            {Number(l.prezzo) > 0
                                                ? `€${Number(l.prezzo).toFixed(2)}`
                                                : <span className="text-xs text-gray-400 font-sans">come da tariffario aziendale</span>
                                            }
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-teal-50 text-teal-700 text-xs">
                                                {COMPENSO_TIPO_LABELS[l.compensoMedicoTipo!] || '-'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono text-sm">
                                            {formatCompensoListino(l)}
                                        </td>
                                        <td className="px-4 py-3 text-right text-gray-500 text-xs">
                                            {l.durataMedico ? `${l.durataMedico} min` : '—'}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {l.attivo ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs">
                                                    <CheckCircle2 className="h-3 w-3" />Attivo
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs">
                                                    <XCircle className="h-3 w-3" />Inattivo
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center gap-1 justify-end">
                                                <button
                                                    onClick={() => handleEdit(l)}
                                                    className="p-1.5 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded transition-colors"
                                                    title="Modifica"
                                                >
                                                    <Edit2 className="h-3.5 w-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => deleteMutation.mutate(l.id)}
                                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                    title="Elimina"
                                                    disabled={deleteMutation.isPending}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* === REGOLE GENERALI DI COMPENSO (collapsible) === */}
            <div className="border-t border-gray-200 pt-4">
                <button
                    onClick={() => setShowGenericRules(v => !v)}
                    className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                >
                    <Activity className="h-4 w-4" />
                    Regole generali di compenso ({regoleGenerali.length})
                    <span className="text-xs text-gray-400 font-normal ml-1">
                        — per branca / convenzione
                    </span>
                    <span className="ml-2 text-xs text-teal-600">{showGenericRules ? '▲ Nascondi' : '▼ Mostra'}</span>
                </button>
                {showGenericRules && regoleGenerali.length > 0 && (
                    <div className="mt-3 overflow-x-auto rounded-xl border border-gray-200">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Branca</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Convenzione</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Compenso</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Validità</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Stato</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {regoleGenerali.map(v => (
                                    <tr key={v.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-teal-50 text-teal-700">
                                                {COMPENSO_TIPO_LABELS[v.compensoMedicoTipo]}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-700">
                                            {v.brancaSpecialistica || <span className="text-gray-400 italic text-xs">Tutte</span>}
                                        </td>
                                        <td className="px-4 py-3 text-gray-700">
                                            {(v.convenzione as { nome?: string } | undefined)?.nome || v.convenzioneId
                                                ? <span className="text-xs">{(v.convenzione as { nome?: string } | undefined)?.nome ?? v.convenzioneId}</span>
                                                : <span className="text-gray-400 italic text-xs">Tutte</span>}
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono text-sm">
                                            {formatCompensо(v)}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                                            {formatData((v as TariffarioMedico & { validoDa?: string }).validoDa)}
                                            {(v as TariffarioMedico & { validoA?: string }).validoA && (
                                                <span className="text-gray-400"> → {formatData((v as TariffarioMedico & { validoA?: string }).validoA)}</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {v.attivo ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                                                    <CheckCircle2 className="h-3 w-3" />Attivo
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs">
                                                    <XCircle className="h-3 w-3" />Inattivo
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                {showGenericRules && regoleGenerali.length === 0 && (
                    <p className="mt-2 text-sm text-gray-400 italic">Nessuna regola generale configurata.</p>
                )}
            </div>
        </div>
    );
};

// ============================================
// TAB COMPENSI MEDICO
// ============================================

interface CompensoProfessionista {
    id: string;
    tipo: string;
    stato: string;
    importoLordo: number;
    importoNetto: number;
    compensoTipo: string | null;
    compensoValore?: number | null;
    importoRiferimento: number | null;
    dataEsecuzione: string | null;
    descrizione: string | null;
    companyTenantProfileId: string | null;
    movimentoCollegato?: { importoNetto: number; importoLordo: number } | null;
    person?: { firstName?: string | null; lastName?: string | null } | null;
    paziente?: { firstName?: string | null; lastName?: string | null } | null;
    prestazioni?: Array<{ nome?: string | null; prestazione?: { nome?: string | null } | null }> | null;
    site?: { nome?: string | null } | null;
    sede?: { nome?: string | null } | null;
    visita?: {
        person?: { firstName?: string | null; lastName?: string | null } | null;
        prestazioni?: Array<{ nome?: string | null; prestazione?: { nome?: string | null } | null }> | null;
        appuntamento?: {
            ambulatorio?: { nome?: string | null } | null;
            site?: { nome?: string | null } | null;
            prestazioni?: Array<{ nome?: string | null; prestazione?: { nome?: string | null } | null }> | null;
        } | null;
    } | null;
    appuntamento?: {
        ambulatorio?: { nome?: string | null } | null;
        site?: { nome?: string | null } | null;
        prestazioni?: Array<{ nome?: string | null; prestazione?: { nome?: string | null } | null }> | null;
    } | null;
    // enriched: controparte ENTRATA (per USCITA) che porta info sulla company
    controparteCollegata?: {
        companyTenantProfile?: {
            company?: { ragioneSociale: string } | null;
        } | null;
    } | null;
}

const TIPO_COMPENSO_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
    VISITA_MDL: { label: 'Visita MDL', icon: Stethoscope, color: 'text-teal-600' },
    SOPRALLUOGO_MC: { label: 'Sopralluogo MC', icon: Building2, color: 'text-purple-600' },
    SOPRALLUOGO_RSPP: { label: 'Sopralluogo RSPP', icon: Shield, color: 'text-indigo-600' },
    NOMINA_MC: { label: 'Nomina MC', icon: UserCheck, color: 'text-violet-600' },
    NOMINA_RSPP: { label: 'Nomina RSPP', icon: Shield, color: 'text-blue-700' },
    CONSULENZA: { label: 'Consulenza', icon: FileText, color: 'text-indigo-600' },
    DVR_NUOVO: { label: 'Nuovo DVR', icon: FileText, color: 'text-orange-600' },
    DVR_AGGIORNAMENTO_CON_MODIFICHE: { label: 'Agg. DVR (con mod.)', icon: RefreshCw, color: 'text-amber-600' },
    DVR_AGGIORNAMENTO_SENZA_MODIFICHE: { label: 'Agg. DVR (senza mod.)', icon: RefreshCw, color: 'text-amber-500' },
};

const STATO_COMPENSO_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
    BOZZA: { label: 'Bozza', bg: 'bg-gray-100', text: 'text-gray-600' },
    DA_FATTURARE: { label: 'Da Fatturare', bg: 'bg-amber-50 border border-amber-200', text: 'text-amber-700' },
    CONFERMATO: { label: 'Da Fatturare', bg: 'bg-amber-50 border border-amber-200', text: 'text-amber-700' },
    FATTURATO: { label: 'Fatturato', bg: 'bg-blue-50 border border-blue-200', text: 'text-blue-700' },
    PAGATO: { label: 'Pagato', bg: 'bg-emerald-50 border border-emerald-200', text: 'text-emerald-700' },
    ANNULLATO: { label: 'Annullato', bg: 'bg-red-50 border border-red-200', text: 'text-red-600' },
    STORNATO: { label: 'Stornato', bg: 'bg-gray-100', text: 'text-gray-500' },
};

const COMPENSI_STATUS_FILTERS: Array<{ key: string; label: string; stati?: StatoMovimento[] }> = [
    { key: 'TUTTI', label: 'Tutti' },
    { key: 'DA_FATTURARE', label: 'Da Fatturare', stati: ['DA_FATTURARE', 'CONFERMATO'] },
    { key: 'FATTURATO', label: 'Fatturati', stati: ['FATTURATO'] },
    { key: 'PAGATO', label: 'Pagati', stati: ['PAGATO'] },
    { key: 'BOZZA', label: 'Bozze', stati: ['BOZZA'] },
];

const COMPENSI_BULK_STATES: Array<{ value: StatoMovimento; label: string }> = [
    { value: 'DA_FATTURARE', label: 'Da Fatturare' },
    { value: 'FATTURATO', label: 'Fatturato' },
    { value: 'PAGATO', label: 'Pagato' },
    { value: 'ANNULLATO', label: 'Annullato' }
];

const formatEuroMedico = (n: number) =>
    new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);

const formatDateMedico = (s: string | null | undefined) => {
    if (!s) return '-';
    return new Date(s).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
};

const getCurrentMonthRange = (): DateRange => {
    const now = new Date();
    return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: new Date(now.getFullYear(), now.getMonth() + 1, 0)
    };
};

const getRollingRange = (months: number): DateRange => {
    const end = new Date();
    const start = new Date(end);
    start.setMonth(start.getMonth() - months);
    return { start, end };
};

const getPreviousMonthRange = (): DateRange => {
    const now = new Date();
    return {
        start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        end: new Date(now.getFullYear(), now.getMonth(), 0)
    };
};

const getNextMonthRange = (): DateRange => {
    const now = new Date();
    return {
        start: new Date(now.getFullYear(), now.getMonth() + 1, 1),
        end: new Date(now.getFullYear(), now.getMonth() + 2, 0)
    };
};

const getYearToDateRange = (): DateRange => {
    const now = new Date();
    return { start: new Date(now.getFullYear(), 0, 1), end: now };
};

const COMPENSI_DATE_PRESETS: Array<{ label: string; getRange: () => DateRange }> = [
    { label: 'Mese corrente', getRange: getCurrentMonthRange },
    { label: 'Mese precedente', getRange: getPreviousMonthRange },
    { label: 'Prossimo mese', getRange: getNextMonthRange },
    { label: '1 mese', getRange: () => getRollingRange(1) },
    { label: '1 anno', getRange: () => getRollingRange(12) },
    { label: 'Da inizio anno', getRange: getYearToDateRange },
];

const formatPrestazioniExport = (items?: Array<{ nome?: string | null; prestazione?: { nome?: string | null } | null }> | null) =>
    (items || [])
        .map(item => item.prestazione?.nome || item.nome)
        .filter(Boolean)
        .join(', ');

const TabCompensiMedico: React.FC<{ medicoId: string }> = ({ medicoId }) => {
    const { showToast } = useToast();
    const { hasPermission } = useAuth();
    const [expandedId, setExpandedId] = React.useState<string | null>(null);
    const [dateRange, setDateRange] = React.useState<DateRange>(() => getCurrentMonthRange());
    const [statusFilter, setStatusFilter] = React.useState<string>('TUTTI');
    const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
    const [bulkState, setBulkState] = React.useState<StatoMovimento>('FATTURATO');
    const canManageCompensi = hasPermission('movimenti_contabili', 'write') || hasPermission('movimenti_contabili', 'manage');

    const buildCompensiParams = React.useCallback((pageSize = '100') => {
        const selectedFilter = COMPENSI_STATUS_FILTERS.find(f => f.key === statusFilter);
        const params: Record<string, string> = {
            direzione: 'USCITA',
            personId: medicoId,
            pageSize,
            sortBy: 'dataEsecuzione',
            sortOrder: 'desc',
        };
        if (selectedFilter?.stati?.length) params['stato'] = selectedFilter.stati.join(',');
        if (dateRange.start) params['dataEsecuzioneDa'] = dateRange.start.toISOString().slice(0, 10);
        if (dateRange.end) params['dataEsecuzioneA'] = dateRange.end.toISOString().slice(0, 10);
        return params;
    }, [dateRange.end, dateRange.start, medicoId, statusFilter]);

    const { data, isLoading, isError, refetch, isFetching } = useQuery({
        queryKey: ['compensi-medico', medicoId, dateRange.start?.toISOString(), dateRange.end?.toISOString(), statusFilter],
        queryFn: async () => {
            const resp = await apiGet<{
                success: boolean;
                data: CompensoProfessionista[];
                total: number;
            }>(`/api/v1/movimenti-contabili`, buildCompensiParams());
            return resp;
        },
        enabled: !!medicoId,
        staleTime: 60_000,
    });

    const compensi = data?.data ?? [];
    React.useEffect(() => {
        setSelectedIds(prev => prev.filter(id => compensi.some(c => c.id === id)));
    }, [compensi]);

    const bulkMutation = useMutation({
        mutationFn: async () => movimentiContabiliService.bulkUpdateStatoDetailed(selectedIds, bulkState),
        onSuccess: (result) => {
            showToast({
                type: result.failed ? 'warning' : 'success',
                message: result.failed
                    ? `${result.updated} movimenti aggiornati, ${result.failed} non aggiornati`
                    : `${result.updated} movimenti aggiornati`
            });
            setSelectedIds([]);
            refetch();
        },
        onError: () => showToast({ type: 'error', message: 'Errore durante l\'aggiornamento massivo' })
    });

    const toggleSelected = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
    };

    const allVisibleSelected = canManageCompensi && compensi.length > 0 && compensi.every(c => selectedIds.includes(c.id));
    const toggleAllVisible = () => {
        if (!canManageCompensi) return;
        if (allVisibleSelected) {
            setSelectedIds(prev => prev.filter(id => !compensi.some(c => c.id === id)));
        } else {
            setSelectedIds(prev => [...new Set([...prev, ...compensi.map(c => c.id)])]);
        }
    };

    const totale = compensi.reduce((s, c) => s + (Number(c.importoNetto) || 0), 0);
    const totalePagato = compensi
        .filter(c => c.stato === 'PAGATO')
        .reduce((s, c) => s + (Number(c.importoNetto) || 0), 0);
    const totaleDaPagare = compensi
        .filter(c => c.stato === 'DA_FATTURARE' || c.stato === 'CONFERMATO')
        .reduce((s, c) => s + (Number(c.importoNetto) || 0), 0);

    const handleDownloadExcel = React.useCallback(async () => {
        try {
            const resp = await apiGet<{
                success: boolean;
                data: CompensoProfessionista[];
                total: number;
            }>('/api/v1/movimenti-contabili', buildCompensiParams('5000'));
            const rows = (resp.data || []).map(c => {
                const patient = c.person || c.paziente || c.visita?.person || null;
                const prestazioni = formatPrestazioniExport(c.prestazioni)
                    || formatPrestazioniExport(c.visita?.prestazioni)
                    || formatPrestazioniExport(c.appuntamento?.prestazioni)
                    || formatPrestazioniExport(c.visita?.appuntamento?.prestazioni)
                    || c.descrizione
                    || '';
                const sede = c.site?.nome
                    || c.sede?.nome
                    || c.appuntamento?.ambulatorio?.nome
                    || c.appuntamento?.site?.nome
                    || c.visita?.appuntamento?.ambulatorio?.nome
                    || c.visita?.appuntamento?.site?.nome
                    || c.controparteCollegata?.companyTenantProfile?.company?.ragioneSociale
                    || '';
                return {
                    Paziente: patient ? `${patient.lastName || ''} ${patient.firstName || ''}`.trim() : '',
                    Prestazioni: prestazioni,
                    'Percentuale spettante': c.compensoTipo === 'PERCENTUALE' && c.compensoValore != null ? `${c.compensoValore}%` : '',
                    'Compenso medico': Number(c.importoNetto || 0),
                    'Quanto ha pagato il pz': Number(c.importoRiferimento ?? c.movimentoCollegato?.importoLordo ?? c.movimentoCollegato?.importoNetto ?? 0),
                    'Giorno esecuzione': c.dataEsecuzione ? new Date(c.dataEsecuzione).toLocaleDateString('it-IT') : '',
                    'Sede esecuzione': sede,
                    Stato: STATO_COMPENSO_CONFIG[c.stato]?.label || c.stato,
                    Descrizione: c.descrizione || '',
                };
            });
            const XLSX = await import('xlsx');
            const workbook = XLSX.utils.book_new();
            const sheet = XLSX.utils.json_to_sheet(rows);
            XLSX.utils.book_append_sheet(workbook, sheet, 'Compensi');
            const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `compensi-medico-${medicoId}-${new Date().toISOString().slice(0, 10)}.xlsx`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
        } catch {
            showToast({ type: 'error', message: 'Errore durante il download Excel dei compensi' });
        }
    }, [buildCompensiParams, medicoId, showToast]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 text-teal-600 animate-spin" />
                <span className="ml-2 text-gray-500 text-sm">Caricamento compensi...</span>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg border border-red-200 text-red-700">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <span className="text-sm">Errore nel caricamento dei compensi.</span>
                <button
                    onClick={() => refetch()}
                    className="ml-auto text-sm text-red-600 hover:text-red-800 underline"
                >
                    Riprova
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {/* Header con totali */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex items-center gap-2">
                    <TrendingDown className="h-5 w-5 text-teal-600" />
                    <h3 className="font-semibold text-gray-900">Compensi e Pagamenti</h3>
                    <span className="text-xs text-gray-500">({compensi.length} movimenti{dateRange.start || dateRange.end ? ' filtrati' : ''})</span>
                </div>
                <button
                    onClick={() => refetch()}
                    disabled={isFetching}
                    className="p-1.5 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                    title="Aggiorna"
                >
                    <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="flex flex-col xl:flex-row xl:items-end gap-3">
                <DateRangeCalendar
                    value={dateRange}
                    onChange={setDateRange}
                    placeholder="Filtra per periodo..."
                    clearable
                    theme="teal"
                    className="w-full max-w-sm"
                    customPresets={COMPENSI_DATE_PRESETS}
                />
                <button
                    type="button"
                    onClick={handleDownloadExcel}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-teal-200 bg-white px-3 py-2 text-sm font-medium text-teal-700 transition-colors hover:border-teal-300 hover:bg-teal-50"
                >
                    <FileSpreadsheet className="h-4 w-4" />
                    Excel
                </button>
                <div className="flex flex-wrap gap-2">
                    {COMPENSI_STATUS_FILTERS.map(filter => (
                        <button
                            key={filter.key}
                            onClick={() => setStatusFilter(filter.key)}
                            className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${statusFilter === filter.key
                                ? 'bg-teal-600 border-teal-600 text-white'
                                : 'bg-white border-gray-200 text-gray-600 hover:border-teal-300 hover:text-teal-700'
                                }`}
                        >
                            {filter.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
                    <p className="text-xs font-medium text-teal-600 uppercase mb-1">Totale Maturato</p>
                    <p className="text-xl font-bold text-teal-800">{formatEuroMedico(totale)}</p>
                    <p className="text-xs text-teal-500 mt-0.5">{compensi.length} prestazioni</p>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                    <p className="text-xs font-medium text-emerald-600 uppercase mb-1">Pagato</p>
                    <p className="text-xl font-bold text-emerald-800">{formatEuroMedico(totalePagato)}</p>
                    <p className="text-xs text-emerald-500 mt-0.5">{compensi.filter(c => c.stato === 'PAGATO').length} pagamenti</p>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <p className="text-xs font-medium text-amber-600 uppercase mb-1">Da Pagare</p>
                    <p className="text-xl font-bold text-amber-800">{formatEuroMedico(totaleDaPagare)}</p>
                    <p className="text-xs text-amber-500 mt-0.5">{compensi.filter(c => c.stato === 'CONFERMATO').length} in attesa</p>
                </div>
            </div>

            {/* Lista compensi */}
            {compensi.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50">
                    <Banknote className="h-8 w-8 text-gray-300" />
                    <p className="text-sm font-medium text-gray-400">Nessun compenso registrato</p>
                    <p className="text-xs text-gray-400 text-center max-w-xs">
                        I compensi vengono generati automaticamente quando viene completata una visita MDL, un sopralluogo o una nomina.
                    </p>
                </div>
            ) : (
                <div className="space-y-2">
                    {!canManageCompensi && (
                        <div className="flex items-start gap-2 p-3 rounded-xl border border-blue-100 bg-blue-50 text-blue-700">
                            <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            <p className="text-xs">
                                Puoi consultare i compensi. Il cambio stato e gestito da chi ha i permessi contabili.
                            </p>
                        </div>
                    )}
                    {canManageCompensi && (
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 p-3 rounded-xl border border-teal-100 bg-teal-50">
                        <label className="flex items-center gap-2 text-sm font-medium text-teal-900">
                            <input
                                type="checkbox"
                                checked={allVisibleSelected}
                                onChange={toggleAllVisible}
                                className="w-4 h-4 rounded border-teal-300 text-teal-600 focus:ring-teal-500"
                            />
                            Seleziona movimenti filtrati
                            {selectedIds.length > 0 && <span className="text-teal-700">({selectedIds.length} selezionati)</span>}
                        </label>
                        <div className="flex flex-wrap items-center gap-2">
                            <select
                                value={bulkState}
                                onChange={(e) => setBulkState(e.target.value as StatoMovimento)}
                                className="px-3 py-2 rounded-lg border border-teal-200 bg-white text-sm text-gray-900 focus:ring-2 focus:ring-teal-500"
                            >
                                {COMPENSI_BULK_STATES.map(state => (
                                    <option key={state.value} value={state.value}>{state.label}</option>
                                ))}
                            </select>
                            <button
                                onClick={() => bulkMutation.mutate()}
                                disabled={selectedIds.length === 0 || bulkMutation.isPending}
                                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {bulkMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                Aggiorna stato
                            </button>
                        </div>
                    </div>
                    )}
                    {compensi.map(c => {
                        const cfg = TIPO_COMPENSO_CONFIG[c.tipo] || { label: c.tipo, icon: FileText, color: 'text-gray-600' };
                        const statoCfg = STATO_COMPENSO_CONFIG[c.stato] || STATO_COMPENSO_CONFIG['BOZZA'];
                        const Icon = cfg.icon;
                        const isExpanded = expandedId === c.id;
                        return (
                            <div
                                key={c.id}
                                className="rounded-lg border border-gray-100 bg-white overflow-hidden shadow-sm"
                            >
                                <button
                                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                                    onClick={() => setExpandedId(isExpanded ? null : c.id)}
                                >
                                    {canManageCompensi && (
                                        <span
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleSelected(c.id);
                                            }}
                                            className="inline-flex"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.includes(c.id)}
                                                onClick={(e) => e.stopPropagation()}
                                                onChange={() => toggleSelected(c.id)}
                                                className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                                            />
                                        </span>
                                    )}
                                    <Icon className={`h-4 w-4 flex-shrink-0 ${cfg.color}`} />
                                    <div className="flex-1 min-w-0">
                                        <span className="block text-sm font-medium text-gray-900 truncate">
                                            {c.descrizione || cfg.label}
                                        </span>
                                        <span className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
                                            <Calendar className="h-3 w-3" />
                                            {formatDateMedico(c.dataEsecuzione)}
                                            {c.controparteCollegata?.companyTenantProfile?.company?.ragioneSociale && (
                                                <>
                                                    <span>·</span>
                                                    <Building2 className="h-3 w-3 text-teal-500" />
                                                    <span className="text-teal-600 font-medium truncate max-w-[160px]">
                                                        {c.controparteCollegata.companyTenantProfile.company.ragioneSociale}
                                                    </span>
                                                </>
                                            )}
                                        </span>
                                    </div>
                                    <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${statoCfg.bg} ${statoCfg.text}`}>
                                        {statoCfg.label}
                                    </span>
                                    <span className="flex-shrink-0 text-sm font-bold text-gray-900 ml-2">
                                        {formatEuroMedico(Number(c.importoNetto))}
                                    </span>
                                    {isExpanded ? (
                                        <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                    ) : (
                                        <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                    )}
                                </button>
                                {isExpanded && (
                                    <div className="border-t border-gray-100 px-4 py-3 bg-gray-50/60 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                                        <div>
                                            <span className="text-xs text-gray-500 uppercase font-medium">Tipo</span>
                                            <p className="text-gray-800 font-medium">{cfg.label}</p>
                                        </div>
                                        <div>
                                            <span className="text-xs text-gray-500 uppercase font-medium">Importo Netto</span>
                                            <p className="text-gray-800 font-medium">{formatEuroMedico(Number(c.importoNetto))}</p>
                                        </div>
                                        {c.compensoTipo && (
                                            <div>
                                                <span className="text-xs text-gray-500 uppercase font-medium">Modalità</span>
                                                <p className="text-gray-800">{
                                                    c.compensoTipo === 'FISSO' ? 'Importo Fisso' :
                                                        c.compensoTipo === 'PERCENTUALE' ? `Percentuale${c.importoRiferimento ? ` su ${formatEuroMedico(Number(c.importoRiferimento))}` : ''}` :
                                                            c.compensoTipo
                                                }</p>
                                            </div>
                                        )}
                                        <div>
                                            <span className="text-xs text-gray-500 uppercase font-medium">Stato</span>
                                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statoCfg.bg} ${statoCfg.text}`}>
                                                {statoCfg.label}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

// ============================================
// MAIN COMPONENT
// ============================================

const MedicoDetailPage: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const { user } = useAuth();
    const { isMedico, isMedicoCompetente } = useRoleGuard();
    const currentMedicoPersonId = isMedico && !isMedicoCompetente ? user?.id : undefined;
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = (searchParams.get('tab') as MedicoTab) || 'anagrafica';
    const setActiveTab = (tab: MedicoTab) => {
        setSearchParams(prev => { prev.set('tab', tab); return prev; }, { replace: true });
    };
    const [showCredentialsModal, setShowCredentialsModal] = useState(false);

    useEffect(() => {
        const allowedSelfTabs: MedicoTab[] = ['anagrafica', 'compensi'];
        if (currentMedicoPersonId && !allowedSelfTabs.includes(activeTab)) {
            setSearchParams(prev => { prev.set('tab', 'anagrafica'); return prev; }, { replace: true });
        }
    }, [currentMedicoPersonId, activeTab, setSearchParams]);

    // Fetch medico
    const { data: medico, isLoading, error } = useQuery({
        queryKey: ['medico', id],
        queryFn: () => mediciApi.getById(id!),
        enabled: !!id
    });

    // Parse notes for additional data
    const getMedicoNotes = (m: Medico | undefined) => {
        if (!m) return {};
        try {
            if (m.notes && typeof m.notes === 'string') {
                return JSON.parse(m.notes);
            }
        } catch {
            // Ignore parse errors
        }
        return {};
    };

    if (isLoading) {
        return (
            <div className="p-6 clinica-theme">
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 text-teal-600 animate-spin" />
                    <span className="ml-2 text-gray-600">Caricamento medico...</span>
                </div>
            </div>
        );
    }

    if (error || !medico) {
        return (
            <div className="p-6 clinica-theme">
                <div className="flex flex-col items-center justify-center py-12 text-red-500">
                    <AlertCircle className="h-12 w-12 mb-4" />
                    <h3 className="text-lg font-medium">Medico non trovato</h3>
                    <p className="text-sm text-gray-500 mt-1">
                        {'Il medico richiesto non esiste'}
                    </p>
                    <button
                        onClick={() => navigate('/poliambulatorio/personale/medici')}
                        className="mt-4 px-4 py-2 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                    >
                        Torna alla lista
                    </button>
                </div>
            </div>
        );
    }

    const notes = getMedicoNotes(medico);
    const isOwnProfile = !currentMedicoPersonId || medico.id === currentMedicoPersonId || medico.personId === currentMedicoPersonId;
    const visibleTabs = currentMedicoPersonId
        ? MEDICO_TABS.filter(tab => tab.id === 'anagrafica' || tab.id === 'compensi')
        : MEDICO_TABS;

    if (!isOwnProfile) {
        return (
            <div className="p-6 clinica-theme">
                <div className="flex flex-col items-center justify-center py-12 text-gray-600">
                    <Shield className="h-12 w-12 mb-4 text-teal-600" />
                    <h3 className="text-lg font-medium">Profilo non accessibile</h3>
                    <p className="text-sm text-gray-500 mt-1">Puoi visualizzare solo le informazioni del tuo profilo medico.</p>
                    <button
                        onClick={() => navigate('/poliambulatorio/personale/medici')}
                        className="mt-4 px-4 py-2 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                    >
                        Torna al mio profilo
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 clinica-theme" data-brand="element-medica">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/poliambulatorio/personale/medici')}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center">
                            <User className="h-8 w-8 text-teal-600" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">
                                {formatDoctorName({ firstName: medico.firstName, lastName: medico.lastName, taxCode: medico.taxCode })}
                            </h1>
                            <p className="text-gray-500">
                                {(medico.specialties && medico.specialties.length > 0) ? medico.specialties.join(', ') : (notes.specializzazione || 'Medico')}
                            </p>
                        </div>
                    </div>
                </div>
                <button
                    onClick={() => navigate(`/poliambulatorio/personale/medici/${id}/modifica`)}
                    className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                >
                    <Edit2 className="h-4 w-4" />
                    Modifica
                </button>
            </div>

            {/* Tab Navigation */}
            <div className="bg-white rounded-xl border border-gray-200 mb-6">
                <nav className="flex overflow-x-auto scrollbar-hide -mb-px px-4 pt-2" aria-label="Tabs">
                    {visibleTabs.map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap mr-1 ${isActive
                                    ? 'border-teal-600 text-teal-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                <Icon className="h-4 w-4" />
                                {tab.label}
                            </button>
                        );
                    })}
                </nav>
            </div>

            {/* Tab: Anagrafica */}
            {activeTab === 'anagrafica' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Info */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Stato */}
                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <Shield className="h-5 w-5 text-teal-600" />
                                Stato Account
                            </h2>
                            <div className="flex flex-wrap gap-3">
                                {medico.status === 'ACTIVE' ? (
                                    <span className="inline-flex items-center gap-2 px-3 py-2 bg-green-50 text-green-700 text-sm font-medium rounded-lg">
                                        <CheckCircle2 className="h-4 w-4" />
                                        Medico Attivo
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-600 text-sm font-medium rounded-lg">
                                        <XCircle className="h-4 w-4" />
                                        Medico Inattivo
                                    </span>
                                )}
                                {medico.username ? (
                                    <span className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 text-sm font-medium rounded-lg">
                                        <Key className="h-4 w-4" />
                                        Account Attivo: {medico.username}
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-2 px-3 py-2 bg-orange-50 text-orange-700 text-sm font-medium rounded-lg">
                                        <Key className="h-4 w-4" />
                                        Senza Account
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Dati Anagrafici */}
                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <User className="h-5 w-5 text-teal-600" />
                                Dati Anagrafici
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-gray-500 uppercase">Nome</label>
                                    <p className="text-gray-900">{medico.firstName}</p>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-gray-500 uppercase">Cognome</label>
                                    <p className="text-gray-900">{medico.lastName}</p>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-gray-500 uppercase flex items-center gap-1">
                                        <Mail className="h-3 w-3" />
                                        Email
                                    </label>
                                    <p className="text-gray-900">{medico.email || '-'}</p>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-gray-500 uppercase flex items-center gap-1">
                                        <Phone className="h-3 w-3" />
                                        Telefono
                                    </label>
                                    <p className="text-gray-900">{medico.phone || '-'}</p>
                                </div>
                                <div className="space-y-1 md:col-span-2">
                                    <label className="text-xs font-medium text-gray-500 uppercase flex items-center gap-1">
                                        <CreditCard className="h-3 w-3" />
                                        Codice Fiscale
                                    </label>
                                    <p className="text-gray-900 font-mono">{medico.taxCode || '-'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Dati Professionali */}
                        {!currentMedicoPersonId && (
                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <Stethoscope className="h-5 w-5 text-teal-600" />
                                Dati Professionali
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1 md:col-span-2">
                                    <label className="text-xs font-medium text-gray-500 uppercase">Specializzazioni</label>
                                    <div className="flex flex-wrap gap-2">
                                        {medico.specialties && medico.specialties.length > 0 ? (
                                            medico.specialties.map((spec, idx) => (
                                                <span
                                                    key={idx}
                                                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm bg-teal-100 text-teal-800"
                                                >
                                                    {spec}
                                                </span>
                                            ))
                                        ) : (
                                            <span className="text-gray-500">-</span>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-gray-500 uppercase flex items-center gap-1">
                                        <Building className="h-3 w-3" />
                                        Regione Albo
                                    </label>
                                    <p className="text-gray-900">{medico.preferences?.alboRegione || notes.alboRegione || '-'}</p>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-gray-500 uppercase">N° Iscrizione Albo</label>
                                    <p className="text-gray-900">{medico.registerCode || notes.numeroIscrizione || '-'}</p>
                                </div>
                                {medico.registerCode2 && (
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-gray-500 uppercase">N° Iscrizione (2°)</label>
                                        <p className="text-gray-900">{medico.registerCode2}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                        )}

                        {/* Prestazioni Abilitate */}
                        {!currentMedicoPersonId && (
                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <Activity className="h-5 w-5 text-teal-600" />
                                Prestazioni Abilitate
                            </h2>
                            {medico.abilitazioni && medico.abilitazioni.length > 0 ? (
                                <div className="space-y-2">
                                    {medico.abilitazioni.map((abilitazione) => (
                                        <div
                                            key={abilitazione.id}
                                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                                        >
                                            <div>
                                                <p className="font-medium text-gray-900">
                                                    {abilitazione.prestazione?.nome || 'Prestazione'}
                                                </p>
                                                <p className="text-sm text-gray-500">
                                                    {abilitazione.prestazione?.codice}
                                                    {abilitazione.prestazione?.brancaSpecialistica && (
                                                        <span className="ml-2 text-teal-600">
                                                            • {abilitazione.prestazione.brancaSpecialistica}
                                                        </span>
                                                    )}
                                                </p>
                                            </div>
                                            {abilitazione.attivo && (
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                                    Attiva
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-500 text-sm">
                                    Nessuna prestazione abilitata.
                                    <button
                                        onClick={() => navigate(`/poliambulatorio/personale/medici/${id}/modifica`)}
                                        className="ml-1 text-teal-600 hover:text-teal-700 underline"
                                    >
                                        Aggiungi prestazioni
                                    </button>
                                </p>
                            )}
                        </div>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Progetto 48: Profili Multi-Tenant */}
                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                            <PersonTenantProfilesWidget
                                personId={medico.id}
                                compactMode={true}
                                editable={false}
                                theme="teal"
                            />
                        </div>

                        {/* P59: Nomine Medico Competente */}
                        {!currentMedicoPersonId && (
                            <NomineRuoloCard
                                personId={medico.id}
                                filterTipoRuolo="MEDICO_COMPETENTE"
                                theme="teal"
                                title="Nomine Medico Competente"
                            />
                        )}

                        {/* P59: Attività eseguite (Sopralluoghi, DVR) */}
                        {!currentMedicoPersonId && (
                            <AttivitaProfessionistaCard
                                personId={medico.id}
                                theme="teal"
                                title="Attività Eseguite"
                            />
                        )}

                        {/* Permessi Visite */}
                        {!currentMedicoPersonId && (
                            <MedicoVisitPermissionsCard
                                medicoId={medico.id}
                            />
                        )}

                        {/* Quick Info */}
                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <Clock className="h-5 w-5 text-teal-600" />
                                Informazioni
                            </h2>
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-gray-500 uppercase">Creato il</label>
                                    <p className="text-gray-900">
                                        {medico.createdAt
                                            ? new Date(medico.createdAt).toLocaleDateString('it-IT', {
                                                day: '2-digit',
                                                month: 'long',
                                                year: 'numeric'
                                            })
                                            : '-'}
                                    </p>
                                </div>
                                {medico.lastLogin && (
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-gray-500 uppercase">Ultimo accesso</label>
                                        <p className="text-gray-900">
                                            {new Date(medico.lastLogin).toLocaleDateString('it-IT', {
                                                day: '2-digit',
                                                month: 'long',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">
                                Azioni Rapide
                            </h2>
                            <div className="space-y-2">
                                <button
                                    onClick={() => navigate(`/poliambulatorio/personale/medici/${id}/modifica`)}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                >
                                    <Edit2 className="h-4 w-4" />
                                    Modifica Dati
                                </button>
                                <button
                                    onClick={() => navigate(`/poliambulatorio/agenda?medicoId=${id}`)}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                >
                                    <Calendar className="h-4 w-4" />
                                    Vedi Agenda
                                </button>
                                <button
                                    onClick={() => setShowCredentialsModal(true)}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                                >
                                    <Key className="h-4 w-4" />
                                    Gestione Credenziali
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )} {/* end tab anagrafica */}

            {showCredentialsModal && medico && (
                <PersonCredentialsModal
                    open={showCredentialsModal}
                    onOpenChange={setShowCredentialsModal}
                    persons={[{ id: medico.id, firstName: medico.firstName || '', lastName: medico.lastName || '', email: medico.email ?? undefined }]}
                />
            )}

            {/* Tab: Tariffario Medico */}
            {activeTab === 'tariffario' && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <TabTariffarioMedici medicoId={medico.id} abilitazioni={medico.abilitazioni} />
                </div>
            )}

            {/* Tab: Compensi */}
            {activeTab === 'compensi' && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <TabCompensiMedico medicoId={medico.id} />
                </div>
            )}
        </div>
    );
};

export default MedicoDetailPage;
