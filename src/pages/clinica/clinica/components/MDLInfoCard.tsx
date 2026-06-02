/**
 * MDLInfoCard - Card compatta per Visita Medica del Lavoro
 *
 * Mostra mansioni, protocollo sanitario e rischi lavorativi del paziente.
 * Consente la modifica inline dei rischi senza modificare mansione o protocollo.
 *
 * @module pages/clinica/clinica/components/MDLInfoCard
 */

import React, { useState, useMemo } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import {
    Briefcase, Shield, FileText, ChevronDown, ChevronUp,
    Edit3, X, Plus, Trash2, AlertTriangle, Loader2
} from 'lucide-react';
import { useToast } from '../../../../hooks/useToast';
import type { Mansione, MansioneRischio, ProtocolloSanitario, LivelloRischio, CodiceRischio, CategoriaRischio } from '../../../../services/clinicaApi';
import { mansioniApi } from '../../../../services/clinicaApi';

// ─── Label mappings ──────────────────────────────────────────────────────────

const CODICE_RISCHIO_LABELS: Record<string, string> = {
    RUM: 'Rumore', VIB_MB: 'Vibrazioni mano-braccio', VIB_WBV: 'Vibrazioni corpo intero',
    RAD_ION: 'Radiazioni ionizzanti', RAD_NIR: 'Radiazioni non ionizzanti',
    CEM: 'Campi elettromagnetici', MIC: 'Microclima severo',
    CHI: 'Agenti chimici', CAN: 'Cancerogeni/mutageni', AMI: 'Amianto',
    PIO: 'Piombo', POL: 'Polveri/silice',
    BIO: 'Agenti biologici',
    MMC: 'Movimentazione carichi', MOV_RIP: 'Movimenti ripetitivi', POS: 'Posture incongrue',
    NOT: 'Lavoro notturno', VDT: 'Videoterminale', SLC: 'Stress lavoro-correlato',
    QUO: 'Lavoro in quota', SPA_CON: 'Spazi confinati', GUI_MEZ: 'Guida mezzi',
    ISO: 'Lavoro isolato', IPE: 'Funi/ipogei',
    CAR_ELE: 'Carrelli elevatori', ELE: 'Rischio elettrico',
    INC: 'Incendio/emergenza', ALC: 'Alcol/sostanze',
};

const LIVELLO_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
    BASSO: { label: 'Basso', bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
    MEDIO: { label: 'Medio', bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200' },
    ALTO: { label: 'Alto', bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' },
    MOLTO_ALTO: { label: 'Molto Alto', bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },
};

const CATEGORIA_LABELS: Record<string, string> = {
    FISICI: 'Fisici', CHIMICI: 'Chimici', BIOLOGICI: 'Biologici',
    ERGONOMICI: 'Ergonomici', ORGANIZZATIVI: 'Organizzativi',
    SPECIFICI: 'Specifici', SETTORIALI: 'Settoriali',
};

const RISCHI_PER_CATEGORIA: Record<string, { code: CodiceRischio; label: string }[]> = {
    FISICI: [
        { code: 'RUM', label: 'Rumore' }, { code: 'VIB_MB', label: 'Vibrazioni mano-braccio' },
        { code: 'VIB_WBV', label: 'Vibrazioni corpo intero' }, { code: 'RAD_ION', label: 'Radiazioni ionizzanti' },
        { code: 'RAD_NIR', label: 'Radiazioni non ionizzanti' }, { code: 'CEM', label: 'Campi elettromagnetici' },
        { code: 'MIC', label: 'Microclima severo' },
    ],
    CHIMICI: [
        { code: 'CHI', label: 'Agenti chimici' }, { code: 'CAN', label: 'Cancerogeni/mutageni' },
        { code: 'AMI', label: 'Amianto' }, { code: 'PIO', label: 'Piombo' }, { code: 'POL', label: 'Polveri/silice' },
    ],
    BIOLOGICI: [{ code: 'BIO', label: 'Agenti biologici' }],
    ERGONOMICI: [
        { code: 'MMC', label: 'Movimentazione carichi' }, { code: 'MOV_RIP', label: 'Movimenti ripetitivi' },
        { code: 'POS', label: 'Posture incongrue' },
    ],
    ORGANIZZATIVI: [
        { code: 'NOT', label: 'Lavoro notturno' }, { code: 'VDT', label: 'Videoterminale' },
        { code: 'SLC', label: 'Stress lavoro-correlato' },
    ],
    SPECIFICI: [
        { code: 'QUO', label: 'Lavoro in quota' }, { code: 'SPA_CON', label: 'Spazi confinati' },
        { code: 'GUI_MEZ', label: 'Guida mezzi' }, { code: 'ISO', label: 'Lavoro isolato' },
        { code: 'IPE', label: 'Funi/ipogei' },
    ],
    SETTORIALI: [
        { code: 'CAR_ELE', label: 'Carrelli elevatori' }, { code: 'ELE', label: 'Rischio elettrico' },
        { code: 'INC', label: 'Incendio/emergenza' }, { code: 'ALC', label: 'Alcol/sostanze' },
    ],
};

// ─── Types ───────────────────────────────────────────────────────────────────

/** Rischio aggregato per il lavoratore (da getWorkerRisks) */
interface WorkerRischio {
    codiceRischio: CodiceRischio;
    livello: LivelloRischio;
    categoria: CategoriaRischio;
    mansioni?: string[];
    periodicitaMesi?: number;
}

interface Props {
    /** Mansioni assegnate al paziente */
    mansioni: Mansione[];
    /** Protocolli sanitari associati alla mansione primaria */
    protocolli: ProtocolloSanitario[] | null;
    /** Rischi del lavoratore (da getWorkerRisks) */
    rischi: (MansioneRischio & { mansioni?: string[]; _isPersonalizzato?: boolean; _recordId?: string; _sourceMansioneId?: string | null })[];
    /** Se il lavoratore ha rischi personalizzati (vs fallback mansione) */
    hasPersonalizedRisks?: boolean;
    /** ID del paziente */
    pazienteId: string;
    /** Read-only mode */
    isReadonly?: boolean;
    className?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function MDLInfoCard({
    mansioni,
    protocolli,
    rischi,
    hasPersonalizedRisks = false,
    pazienteId,
    isReadonly = false,
    className = '',
}: Props) {
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const [expanded, setExpanded] = useState(true);
    const [editingRischio, setEditingRischio] = useState<string | null>(null);
    const [showAddRischio, setShowAddRischio] = useState(false);
    const [addCodice, setAddCodice] = useState<CodiceRischio | ''>('');
    const [addLivello, setAddLivello] = useState<LivelloRischio>('MEDIO');
    const [editingMansioni, setEditingMansioni] = useState(false);
    const [selectedMansioneId, setSelectedMansioneId] = useState('');

    const activeProtocollo = useMemo(() => {
        if (!protocolli?.length) return null;
        return protocolli.find(p => p.isAttivo) ?? protocolli[0];
    }, [protocolli]);

    const primaryMansione = mansioni[0] ?? null;

    // Fetch all available mansioni for the assignment dropdown
    const { data: allMansioniData } = useQuery({
        queryKey: ['mansioni-all'],
        queryFn: () => mansioniApi.getAll({ limit: 200 }),
        enabled: editingMansioni,
        staleTime: 60_000,
    });
    const allMansioni = useMemo(() => {
        const list = (allMansioniData as any)?.data ?? allMansioniData ?? [];
        return Array.isArray(list) ? list : [];
    }, [allMansioniData]);
    const assignedMansioneIds = useMemo(() => new Set(mansioni.map(m => m.id)), [mansioni]);
    const availableMansioni = useMemo(
        () => allMansioni.filter((m: Mansione) => !assignedMansioneIds.has(m.id)),
        [allMansioni, assignedMansioneIds]
    );

    // Rischi già presenti (per filtrare quelli disponibili nell'add)
    const existingCodici = useMemo(() => new Set(rischi.map(r => r.codiceRischio)), [rischi]);

    // ── Mutations ─────────────────────────────────────────────────────────────

    // Tutti i rischi sono ora gestiti a livello per-worker (LavoratoreRischioAggiuntivo)
    const updateWorkerRischioMutation = useMutation({
        mutationFn: async ({ id, livello }: { id: string; livello: LivelloRischio }) => {
            return mansioniApi.updateWorkerRischio(id, { livello });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['worker-risks', pazienteId] });
            queryClient.invalidateQueries({ queryKey: ['mdl-rischi-paziente', pazienteId] });
            setEditingRischio(null);
            showToast({ type: 'success', message: 'Livello rischio aggiornato' });
        },
        onError: () => showToast({ type: 'error', message: 'Errore aggiornamento rischio' }),
    });

    const addWorkerRischioMutation = useMutation({
        mutationFn: async ({ codiceRischio, livello, categoria }: { codiceRischio: CodiceRischio; livello: LivelloRischio; categoria: CategoriaRischio }) => {
            return mansioniApi.addWorkerRischio(pazienteId, { codiceRischio, livello, categoria });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['worker-risks', pazienteId] });
            queryClient.invalidateQueries({ queryKey: ['mdl-rischi-paziente', pazienteId] });
            setShowAddRischio(false);
            setAddCodice('');
            setAddLivello('MEDIO');
            showToast({ type: 'success', message: 'Rischio aggiunto' });
        },
        onError: () => showToast({ type: 'error', message: 'Errore aggiunta rischio' }),
    });

    const removeWorkerRischioMutation = useMutation({
        mutationFn: async (id: string) => {
            return mansioniApi.removeWorkerRischio(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['worker-risks', pazienteId] });
            queryClient.invalidateQueries({ queryKey: ['mdl-rischi-paziente', pazienteId] });
            showToast({ type: 'success', message: 'Rischio rimosso' });
        },
        onError: () => showToast({ type: 'error', message: 'Errore rimozione rischio' }),
    });

    const assignMansioneMutation = useMutation({
        mutationFn: async (mansioneId: string) => {
            return mansioniApi.assignWorker(mansioneId, { personId: pazienteId });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['worker-risks', pazienteId] });
            queryClient.invalidateQueries({ queryKey: ['mdl-rischi-paziente', pazienteId] });
            queryClient.invalidateQueries({ queryKey: ['protocolli-mansione'] });
            setSelectedMansioneId('');
            showToast({ type: 'success', message: 'Mansione assegnata' });
        },
        onError: () => showToast({ type: 'error', message: 'Errore assegnazione mansione' }),
    });

    const removeMansioneMutation = useMutation({
        mutationFn: async (assignmentId: string) => {
            return mansioniApi.removeWorkerAssignment(assignmentId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['worker-risks', pazienteId] });
            queryClient.invalidateQueries({ queryKey: ['mdl-rischi-paziente', pazienteId] });
            queryClient.invalidateQueries({ queryKey: ['protocolli-mansione'] });
            showToast({ type: 'success', message: 'Mansione rimossa' });
        },
        onError: () => showToast({ type: 'error', message: 'Errore rimozione mansione' }),
    });

    // Inizializza rischi per lavoratori legacy (copia da mansione a per-worker)
    const initializeRisksMutation = useMutation({
        mutationFn: async () => {
            return mansioniApi.initializeWorkerRisks(pazienteId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['worker-risks', pazienteId] });
            queryClient.invalidateQueries({ queryKey: ['mdl-rischi-paziente', pazienteId] });
            showToast({ type: 'success', message: 'Rischi personalizzati inizializzati' });
        },
        onError: () => showToast({ type: 'error', message: 'Errore inizializzazione rischi' }),
    });

    // Trova la categoria per un codice rischio
    const findCategoriaForCodice = (codice: string): CategoriaRischio => {
        for (const [cat, items] of Object.entries(RISCHI_PER_CATEGORIA)) {
            if (items.some(r => r.code === codice)) return cat as CategoriaRischio;
        }
        return 'SPECIFICI' as CategoriaRischio;
    };

    if (!mansioni.length && !rischi.length) return null;

    return (
        <div className={`bg-white rounded-xl border border-teal-200 shadow-sm overflow-hidden ${className}`}>
            {/* Header */}
            <div className="px-4 py-2.5 border-b border-teal-100 bg-teal-50">
                <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-teal-600 flex-shrink-0" />
                    <span className="text-sm font-semibold text-teal-800 flex-1">Medicina del Lavoro</span>
                    <button
                        type="button"
                        onClick={() => setExpanded(v => !v)}
                        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
                    >
                        {rischi.length > 0 && (
                            <span className="text-[10px] bg-teal-100 text-teal-700 font-semibold px-1.5 py-0.5 rounded-full border border-teal-200">
                                {rischi.length} rischi
                            </span>
                        )}
                        {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>
                </div>
            </div>

            {expanded && (
                <div className="p-3 space-y-3">
                    {/* Mansioni */}
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1.5">
                                <Shield className="h-3 w-3 text-gray-400" />
                                <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Mansioni</span>
                            </div>
                            {!isReadonly && (
                                <button
                                    type="button"
                                    onClick={() => setEditingMansioni(v => !v)}
                                    className="flex items-center gap-0.5 text-[10px] font-medium text-teal-600 hover:text-teal-700"
                                >
                                    {editingMansioni ? <X className="h-3 w-3" /> : <Edit3 className="h-3 w-3" />}
                                    {editingMansioni ? 'Chiudi' : 'Modifica'}
                                </button>
                            )}
                        </div>
                        {mansioni.length > 0 ? (
                            <div className="space-y-0.5">
                                {mansioni.map(m => (
                                    <div key={m.id} className="flex items-center gap-1.5 text-xs text-gray-700 group">
                                        <span className="w-1.5 h-1.5 rounded-full bg-teal-400 flex-shrink-0" />
                                        <span className="font-medium flex-1">{m.denominazione}</span>
                                        {m.codice && <span className="text-[10px] text-gray-400">({m.codice})</span>}
                                        {editingMansioni && (m as any)._assignmentId && (
                                            <button
                                                type="button"
                                                disabled={removeMansioneMutation.isPending}
                                                onClick={() => removeMansioneMutation.mutate((m as any)._assignmentId)}
                                                className="hidden group-hover:flex p-0.5 text-gray-400 hover:text-red-500"
                                                title="Rimuovi mansione"
                                            >
                                                {removeMansioneMutation.isPending ? (
                                                    <Loader2 className="h-3 w-3 animate-spin" />
                                                ) : (
                                                    <Trash2 className="h-3 w-3" />
                                                )}
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-gray-400 italic">Nessuna mansione assegnata</p>
                        )}
                        {/* Aggiungi mansione inline */}
                        {editingMansioni && (
                            <div className="mt-1.5 flex items-center gap-1.5">
                                <select
                                    value={selectedMansioneId}
                                    onChange={e => setSelectedMansioneId(e.target.value)}
                                    className="flex-1 text-xs border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white"
                                >
                                    <option value="">Aggiungi mansione…</option>
                                    {availableMansioni.map((m: Mansione) => (
                                        <option key={m.id} value={m.id}>{m.denominazione}{m.codice ? ` (${m.codice})` : ''}</option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    disabled={!selectedMansioneId || assignMansioneMutation.isPending}
                                    onClick={() => {
                                        if (selectedMansioneId) assignMansioneMutation.mutate(selectedMansioneId);
                                    }}
                                    className="flex items-center gap-0.5 text-[10px] font-semibold px-2 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors"
                                >
                                    {assignMansioneMutation.isPending ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                        <Plus className="h-3 w-3" />
                                    )}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Protocollo Sanitario */}
                    <div>
                        <div className="flex items-center gap-1.5 mb-1">
                            <FileText className="h-3 w-3 text-gray-400" />
                            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Protocollo Sanitario</span>
                        </div>
                        {activeProtocollo ? (
                            <div className="text-xs text-gray-700">
                                <span className="font-medium">{activeProtocollo.denominazione}</span>
                                <span className="text-gray-400 ml-1">— {activeProtocollo.periodicitaVisiteMesi} mesi</span>
                                {activeProtocollo._count?.prestazioni != null && (
                                    <span className="text-[10px] text-gray-400 ml-1">
                                        ({activeProtocollo._count.prestazioni} prestazioni)
                                    </span>
                                )}
                            </div>
                        ) : (
                            <p className="text-xs text-gray-400 italic">Nessun protocollo configurato</p>
                        )}
                    </div>

                    {/* Rischi Lavorativi */}
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1.5">
                                <AlertTriangle className="h-3 w-3 text-gray-400" />
                                <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Rischi Lavorativi</span>
                            </div>
                            {!isReadonly && !showAddRischio && (
                                <button
                                    type="button"
                                    onClick={() => setShowAddRischio(true)}
                                    className="flex items-center gap-0.5 text-[10px] font-medium text-teal-600 hover:text-teal-700"
                                >
                                    <Plus className="h-3 w-3" />
                                    Aggiungi
                                </button>
                            )}
                        </div>

                        {/* Banner per lavoratori legacy senza rischi personalizzati */}
                        {!isReadonly && !hasPersonalizedRisks && mansioni.length > 0 && rischi.length > 0 && (
                            <div className="mb-1.5 p-1.5 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
                                <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                                <span className="text-[10px] text-amber-700 flex-1">
                                    Rischi ereditati dalla mansione. Personalizza per gestirli individualmente.
                                </span>
                                <button
                                    type="button"
                                    disabled={initializeRisksMutation.isPending}
                                    onClick={() => initializeRisksMutation.mutate()}
                                    className="text-[10px] font-semibold px-2 py-0.5 bg-amber-600 text-white rounded hover:bg-amber-700 disabled:opacity-50 transition-colors flex items-center gap-1"
                                >
                                    {initializeRisksMutation.isPending ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                        <Shield className="h-3 w-3" />
                                    )}
                                    Personalizza
                                </button>
                            </div>
                        )}

                        {rischi.length > 0 ? (
                            <ul className="space-y-1">
                                {rischi.map(r => {
                                    const livConf = LIVELLO_CONFIG[(r.livello ?? r.livelloRischio) as string] ?? LIVELLO_CONFIG.MEDIO;
                                    const isEditing = editingRischio === r.codiceRischio;
                                    const recordId = r._recordId;
                                    const isMutating = updateWorkerRischioMutation.isPending;

                                    return (
                                        <li key={r.codiceRischio} className="flex items-center gap-1.5 text-xs group">
                                            {isEditing ? (
                                                <div className="flex items-center gap-1 flex-1">
                                                    <span className="text-gray-700 font-medium truncate flex-1">
                                                        {CODICE_RISCHIO_LABELS[r.codiceRischio] ?? r.codiceRischio}
                                                    </span>
                                                    <div className="flex gap-0.5">
                                                        {(['BASSO', 'MEDIO', 'ALTO', 'MOLTO_ALTO'] as LivelloRischio[]).map(lv => {
                                                            const c = LIVELLO_CONFIG[lv];
                                                            const isCurrent = lv === (r.livello ?? (r as any).livelloRischio);
                                                            return (
                                                                <button
                                                                    key={lv}
                                                                    type="button"
                                                                    disabled={isMutating || !recordId}
                                                                    onClick={() => {
                                                                        if (isCurrent) { setEditingRischio(null); return; }
                                                                        if (recordId) {
                                                                            updateWorkerRischioMutation.mutate({ id: recordId, livello: lv });
                                                                        }
                                                                    }}
                                                                    className={`px-1.5 py-0.5 rounded text-[9px] font-medium border transition-colors ${isCurrent
                                                                        ? `${c.bg} ${c.text} ${c.border} ring-1 ring-offset-1 ring-teal-400`
                                                                        : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100'
                                                                        }`}
                                                                >
                                                                    {c.label}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                    {isMutating ? (
                                                        <Loader2 className="h-3 w-3 text-teal-600 animate-spin" />
                                                    ) : (
                                                        <button type="button" onClick={() => setEditingRischio(null)} className="p-0.5 text-gray-400 hover:text-gray-600">
                                                            <X className="h-3 w-3" />
                                                        </button>
                                                    )}
                                                </div>
                                            ) : (
                                                <>
                                                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full border text-[9px] font-medium ${livConf.bg} ${livConf.text} ${livConf.border}`}>
                                                        {livConf.label}
                                                    </span>
                                                    <span className="text-gray-700 font-medium truncate flex-1">
                                                        {CODICE_RISCHIO_LABELS[r.codiceRischio] ?? r.codiceRischio}
                                                    </span>
                                                    {r._isPersonalizzato && !r._sourceMansioneId && (
                                                        <span className="text-[8px] bg-violet-100 text-violet-600 px-1 py-0.5 rounded border border-violet-200" title="Rischio aggiunto manualmente per questo lavoratore">
                                                            individuale
                                                        </span>
                                                    )}
                                                    {r.periodicitaMesi && (
                                                        <span className="text-[9px] text-gray-400">{r.periodicitaMesi}m</span>
                                                    )}
                                                    {!isReadonly && (
                                                    <div className="hidden group-hover:flex items-center gap-0.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => setEditingRischio(r.codiceRischio)}
                                                            className={`p-0.5 text-gray-400 hover:text-teal-600 ${!recordId ? 'opacity-30 cursor-not-allowed' : ''}`}
                                                            title="Modifica livello"
                                                            disabled={!recordId}
                                                        >
                                                            <Edit3 className="h-3 w-3" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                if (recordId) {
                                                                    removeWorkerRischioMutation.mutate(recordId);
                                                                }
                                                            }}
                                                            className={`p-0.5 text-gray-400 hover:text-red-500 ${!recordId ? 'opacity-30 cursor-not-allowed' : ''}`}
                                                            title="Rimuovi rischio"
                                                            disabled={!recordId}
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </button>
                                                    </div>
                                                    )}
                                                </>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        ) : (
                            <p className="text-xs text-gray-400 italic">Nessun rischio lavorativo associato</p>
                        )}

                        {/* Add rischio inline */}
                        {!isReadonly && showAddRischio && (
                            <div className="mt-2 p-2 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
                                <div>
                                    <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Rischio</label>
                                    <select
                                        value={addCodice}
                                        onChange={e => setAddCodice(e.target.value as CodiceRischio)}
                                        className="w-full text-xs border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white"
                                    >
                                        <option value="">Seleziona rischio…</option>
                                        {Object.entries(RISCHI_PER_CATEGORIA).map(([cat, items]) => (
                                            <optgroup key={cat} label={CATEGORIA_LABELS[cat] ?? cat}>
                                                {items.filter(r => !existingCodici.has(r.code)).map(r => (
                                                    <option key={r.code} value={r.code}>{r.label}</option>
                                                ))}
                                            </optgroup>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Livello</label>
                                    <div className="flex gap-1">
                                        {(['BASSO', 'MEDIO', 'ALTO', 'MOLTO_ALTO'] as LivelloRischio[]).map(lv => {
                                            const c = LIVELLO_CONFIG[lv];
                                            return (
                                                <button
                                                    key={lv}
                                                    type="button"
                                                    onClick={() => setAddLivello(lv)}
                                                    className={`flex-1 px-1 py-1 rounded text-[10px] font-medium border transition-colors ${addLivello === lv
                                                        ? `${c.bg} ${c.text} ${c.border}`
                                                        : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-100'
                                                        }`}
                                                >
                                                    {c.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                                <div className="flex items-center justify-end gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => { setShowAddRischio(false); setAddCodice(''); }}
                                        className="text-[10px] text-gray-500 hover:text-gray-700 px-2 py-1"
                                    >
                                        Annulla
                                    </button>
                                    <button
                                        type="button"
                                        disabled={!addCodice || addWorkerRischioMutation.isPending}
                                        onClick={() => {
                                            if (!addCodice) return;
                                            addWorkerRischioMutation.mutate({
                                                codiceRischio: addCodice,
                                                livello: addLivello,
                                                categoria: findCategoriaForCodice(addCodice),
                                            });
                                        }}
                                        className="flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 text-white rounded-lg disabled:opacity-50 transition-colors bg-teal-600 hover:bg-teal-700"
                                    >
                                        <Plus className="h-3 w-3" />
                                        Aggiungi
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
