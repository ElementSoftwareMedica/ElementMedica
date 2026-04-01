/**
 * PrestazioniCard - Card per gestire le prestazioni della visita
 * 
 * Features:
 * - Prestazione principale con toggle Prima Visita / Controllo (P65.7)
 * - Prestazioni aggiuntive con medico refertante dedicato
 * - Convenzioni (permission-gated: clinica.visite:manage_convenzioni)
 * - Codici sconto (permission-gated: clinica.visite:manage_convenzioni)
 * - Prezzi visibili solo con permesso clinica.visite:view_prices
 * - Indicatore "a carico di" (paziente / azienda)
 * 
 * @module pages/clinica/clinica/components/PrestazioniCard
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
    Package,
    Plus,
    X,
    ChevronDown,
    ChevronUp,
    Search,
    Clock,
    Euro,
    Tag,
    Percent,
    Building2,
    Check,
    Star,
    RefreshCw,
    UserCheck,
    Briefcase,
    User,
    Link2
} from 'lucide-react';
import { CATEGORIA_VISITA_LABELS } from '../../../../services/tariffarioAziendaleApi';
import { getMedicoTitle } from '../../../../utils/textFormatters';

// Types
export interface PrestazioneItem {
    id: string;
    codice: string;
    nome: string;
    /** Tipo prestazione dal catalogo (es. VISITA_MEDICINA_LAVORO, ESAME_STRUMENTALE, ecc.) */
    tipo?: string;
    prezzo?: number;
    durata?: number;
    isPrimary?: boolean;
    // P65.7: Prima visita / Controllo
    prezzoPrimaVisita?: number;
    prezzoControllo?: number;
    // Medico refertante per prestazione aggiuntiva
    medicoRefertanteId?: string;
    medicoRefertanteNome?: string;
    // A carico di
    aCaricoTipo?: 'paziente' | 'azienda';
    /**
     * P72_15: ID del record AppuntamentoPrestazione creato quando questa prestazione
     * viene aggiunta durante la visita. Usato per generare/annullare movimenti contabili.
     */
    appPrestazioneId?: string;
    /**
     * P72_19+: Indica che questa voce è un questionario compilato (non una prestazione MDL).
     * Il billing è gestito automaticamente dal backend — non creare AppuntamentoPrestazione.
     */
    isQuestionario?: boolean;
    /**
     * P72_23: Per questionari periodici — DocumentoTemplate di riferimento.
     * Usato per creare ScadenzaPrestazioneProtocollo dopo la visita.
     */
    documentoTemplateId?: string;
    /**
     * P72_23: Periodicità in mesi del questionario (da DocumentoTemplate.periodicitaMesi).
     */
    periodicitaMesi?: number;
    /**
     * P73: ID della visita secondaria creata per il medico specialista.
     * Presente quando medicoRefertanteId != medicoId dell'appuntamento.
     */
    visitaSecondariaId?: string;
}

export interface MedicoOption {
    id: string;
    firstName: string;
    lastName: string;
    gender?: string;
}

export interface ConvenzioneItem {
    id: string;
    nome: string;
    tipo: string;
    scontoPercentuale?: number;
}

export interface CodiceSconto {
    codice: string;
    descrizione?: string;
    scontoPercentuale?: number;
    scontoFisso?: number;
}

/** Voce tariffario aziendale — usato dal selettore tipo visita MDL */
export interface VoceTariffarioItem {
    categoriaVisita?: string | null;
    prezzoBase: number | string;
}



interface PrestazioniCardProps {
    /** Prestazione principale dall'appuntamento */
    prestazionePrincipale?: PrestazioneItem | null;
    /** Prestazioni aggiuntive aggiunte durante la visita */
    prestazioniAggiuntive: PrestazioneItem[];
    /** Handler per aggiungere prestazione */
    onAddPrestazione?: (prestazione: PrestazioneItem) => void;
    /** Handler per rimuovere prestazione */
    onRemovePrestazione?: (prestazioneId: string) => void;
    /** Handler per aggiornare una prestazione aggiuntiva (refertante, aCarico) */
    onUpdatePrestazione?: (prestazioneId: string, updates: Partial<PrestazioneItem>) => void;
    /** Lista prestazioni disponibili per il medico (abilitazioni) */
    prestazioniDisponibili?: PrestazioneItem[];
    /** Se true, mostra tutte le prestazioni del tenant (non solo abilitazioni medico) */
    showAllPrestazioni?: boolean;
    /** Handler per toggle "Visualizza tutte" */
    onToggleShowAll?: (value: boolean) => void;
    /** Convenzione associata all'appuntamento */
    convenzioneAssociata?: ConvenzioneItem | null;
    /** Lista convenzioni disponibili */
    convenzioniDisponibili?: ConvenzioneItem[];
    /** Handler per cambiare convenzione */
    onChangeConvenzione?: (convenzioneId: string | null) => void;
    /** Codici sconto applicati */
    codiciScontoApplicati?: CodiceSconto[];
    /** Handler per aggiungere codice sconto */
    onAddCodiceSconto?: (codice: string) => void;
    /** Handler per rimuovere codice sconto */
    onRemoveCodiceSconto?: (codice: string) => void;
    /** Se true, la prestazione è già stata fatturata (no modifiche) */
    isFatturata?: boolean;
    /** Se true, non permette modifiche */
    disabled?: boolean;
    /** Classe CSS aggiuntiva */
    className?: string;
    // P65.7: Prima visita / Controllo
    /** Se la visita è prima visita */
    isPrimaVisita?: boolean;
    /** Handler per toggle prima visita / controllo */
    onTogglePrimaVisita?: (isPrima: boolean) => void;
    // Permission gates
    /** Se l'utente può vedere i prezzi */
    canViewPrices?: boolean;
    /** Se l'utente può gestire convenzioni/sconti */
    canManageConvenzioni?: boolean;
    // Multi-medico
    /** Medici disponibili per refertare prestazioni aggiuntive */
    mediciDisponibili?: MedicoOption[];
    /** ID del medico che esegue la visita */
    medicoId?: string;
    // P65: Medicina del Lavoro
    /** Se true, visita MDL - tutte le prestazioni a carico azienda (non modificabile) */
    isMDL?: boolean;
    /** Tipo visita MDL corrente (TipoVisitaMDL enum) */
    tipoVisitaMDL?: string;
    /** Handler per cambio tipo visita MDL */
    onChangeTipoVisita?: (tipo: string) => void;
    /** Voci tariffario per la prestazione principale (filtrare per categoriaVisita) */
    vociTariffarioPrincipale?: VoceTariffarioItem[];
}

export const PrestazioniCard: React.FC<PrestazioniCardProps> = ({
    prestazionePrincipale,
    prestazioniAggiuntive = [],
    onAddPrestazione,
    onRemovePrestazione,
    onUpdatePrestazione,
    prestazioniDisponibili = [],
    showAllPrestazioni = false,
    onToggleShowAll,
    convenzioneAssociata,
    convenzioniDisponibili = [],
    onChangeConvenzione,
    codiciScontoApplicati = [],
    onAddCodiceSconto,
    onRemoveCodiceSconto,
    isFatturata = false,
    disabled = false,
    className = '',
    isPrimaVisita = false,
    onTogglePrimaVisita,
    canViewPrices = false,
    canManageConvenzioni = false,
    mediciDisponibili = [],
    medicoId,
    isMDL = false,
    tipoVisitaMDL,
    onChangeTipoVisita,
    vociTariffarioPrincipale = [],
}) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isConvenzioneOpen, setIsConvenzioneOpen] = useState(false);
    const [convenzioneSearchQuery, setConvenzioneSearchQuery] = useState('');
    const [scontoInput, setScontoInput] = useState('');

    // Can modify (not disabled and not fatturata)
    const canModify = !disabled && !isFatturata;

    // Deduplicate vociTariffarioPrincipale by categoriaVisita to prevent React duplicate-key warnings.
    // A tariffario may have multiple voci for the same categoriaVisita (e.g. legacy entries or edits);
    // we keep the first occurrence for each category.
    const uniqueVociTariffario = useMemo(() => {
        const seen = new Set<string>();
        return vociTariffarioPrincipale.filter(v => {
            const key = v.categoriaVisita ?? '__null__';
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }, [vociTariffarioPrincipale]);

    const filteredPrestazioni = useMemo(() => {
        const addedIds = new Set([
            ...(prestazionePrincipale ? [prestazionePrincipale.id] : []),
            ...prestazioniAggiuntive.map(p => p.id)
        ]);

        return prestazioniDisponibili.filter(p => {
            // Exclude already added
            if (addedIds.has(p.id)) return false;
            // Filter by search query
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                return p.nome.toLowerCase().includes(query) ||
                    p.codice.toLowerCase().includes(query);
            }
            return true;
        });
    }, [prestazionePrincipale, prestazioniAggiuntive, prestazioniDisponibili, searchQuery]);

    // Filter convenzioni disponibili
    const filteredConvenzioni = useMemo(() => {
        if (!convenzioneSearchQuery) return convenzioniDisponibili;
        const query = convenzioneSearchQuery.toLowerCase();
        return convenzioniDisponibili.filter(c =>
            c.nome.toLowerCase().includes(query) ||
            c.tipo.toLowerCase().includes(query)
        );
    }, [convenzioniDisponibili, convenzioneSearchQuery]);

    const handleAddPrestazione = useCallback((prestazione: PrestazioneItem) => {
        // Attribuire a carico azienda se:
        // - la visita è MDL (isMDL = true, impostato dall'appuntamento.tipoVisitaMDL)
        // - OPPURE la prestazione principale ha tipo VISITA_MEDICINA_LAVORO (check esplicito)
        // - OPPURE una delle prestazioni aggiuntive già aggiunte è VMdL (edge case)
        const hasVMdL = isMDL
            || prestazionePrincipale?.tipo === 'VISITA_MEDICINA_LAVORO'
            || prestazioniAggiuntive.some(p => p.tipo === 'VISITA_MEDICINA_LAVORO');
        const prestazioneWithDefaults = hasVMdL
            ? { ...prestazione, aCaricoTipo: 'azienda' as const }
            : prestazione;
        onAddPrestazione?.(prestazioneWithDefaults);
        setSearchQuery('');
        setIsSearchOpen(false);
    }, [onAddPrestazione, isMDL, prestazionePrincipale, prestazioniAggiuntive]);

    const handleRemovePrestazione = useCallback((prestazioneId: string) => {
        onRemovePrestazione?.(prestazioneId);
    }, [onRemovePrestazione]);

    const handleSelectConvenzione = useCallback((convenzioneId: string) => {
        onChangeConvenzione?.(convenzioneId);
        setIsConvenzioneOpen(false);
        setConvenzioneSearchQuery('');
    }, [onChangeConvenzione]);

    const handleRemoveConvenzione = useCallback(() => {
        onChangeConvenzione?.(null);
    }, [onChangeConvenzione]);

    const handleAddSconto = useCallback(() => {
        if (scontoInput.trim()) {
            onAddCodiceSconto?.(scontoInput.trim().toUpperCase());
            setScontoInput('');
        }
    }, [scontoInput, onAddCodiceSconto]);

    // Calculate effective price for primary prestazione
    // MDL: use tariffario voce matching tipoVisitaMDL (price updates live as MC changes tipo)
    // Non-MDL: prima visita / controllo toggle
    const effectivePrimaryPrice = useMemo(() => {
        if (!prestazionePrincipale) return 0;
        if (isMDL && uniqueVociTariffario.length > 0) {
            const matchingVoce = tipoVisitaMDL
                ? uniqueVociTariffario.find(v => v.categoriaVisita === tipoVisitaMDL)
                : null;
            const bestVoce = matchingVoce ?? uniqueVociTariffario[0];
            if (bestVoce) return Number(bestVoce.prezzoBase) || 0;
        }
        if (isPrimaVisita && prestazionePrincipale.prezzoPrimaVisita != null) {
            return prestazionePrincipale.prezzoPrimaVisita;
        }
        if (!isPrimaVisita && prestazionePrincipale.prezzoControllo != null) {
            return prestazionePrincipale.prezzoControllo;
        }
        return prestazionePrincipale.prezzo || 0;
    }, [prestazionePrincipale, isPrimaVisita, isMDL, tipoVisitaMDL, uniqueVociTariffario]);

    // Calculate totals
    const totals = useMemo(() => {
        let durata = prestazionePrincipale?.durata || 0;
        let prezzo = effectivePrimaryPrice;

        prestazioniAggiuntive.forEach(p => {
            durata += p.durata || 0;
            prezzo += p.prezzo || 0;
        });

        // Apply convenzione discount
        if (convenzioneAssociata?.scontoPercentuale) {
            prezzo = prezzo * (1 - convenzioneAssociata.scontoPercentuale / 100);
        }

        // Apply codici sconto
        codiciScontoApplicati.forEach(cs => {
            if (cs.scontoPercentuale) {
                prezzo = prezzo * (1 - cs.scontoPercentuale / 100);
            }
            if (cs.scontoFisso) {
                prezzo = Math.max(0, prezzo - cs.scontoFisso);
            }
        });

        return { durata, prezzo: Math.max(0, prezzo) };
    }, [effectivePrimaryPrice, prestazionePrincipale, prestazioniAggiuntive, convenzioneAssociata, codiciScontoApplicati]);

    const totalCount = 1 + prestazioniAggiuntive.length;

    // Has prima visita / controllo pricing?
    const hasPrimaControlloVariant = !!(
        prestazionePrincipale?.prezzoPrimaVisita != null ||
        prestazionePrincipale?.prezzoControllo != null
    );

    // Render prestazione row — card con sub-sezioni integrate al suo interno
    const renderPrestazioneRow = (p: PrestazioneItem, isPrimary: boolean) => {
        const borderClass = isPrimary ? 'border-indigo-200' : 'border-purple-200';
        const bgHeaderClass = isPrimary ? 'bg-indigo-50/70' : 'bg-purple-50/70';
        const indicatorClass = isPrimary ? 'bg-indigo-500' : 'bg-purple-500';
        const displayPrice = isPrimary ? effectivePrimaryPrice : (p.prezzo || 0);

        // Lookup medico corretto per onorifico gender-aware
        const currentMedicoId = !isPrimary ? (p.medicoRefertanteId || medicoId || '') : '';
        const medicoObj = mediciDisponibili.find(m => m.id === currentMedicoId);
        /** Onorifico gender-aware: usa getMedicoTitle (Dott. per maschi/default, Dott.ssa per femmine) */
        const getHonorific = (m: MedicoOption) => getMedicoTitle(m.gender as 'MALE' | 'FEMALE' | 'OTHER' | 'NOT_SPECIFIED' | null);
        const showSubRow = !isPrimary && (canModify || !!p.medicoRefertanteId || !!p.medicoRefertanteNome);

        return (
            <div key={p.id} className={`rounded-lg border overflow-hidden ${borderClass}`}>
                <div className={`relative flex items-center gap-2 p-2 ${bgHeaderClass}`}>
                    {/* Primary indicator - star in top right corner */}
                    {isPrimary && (
                        <div
                            className="absolute -top-1 -right-1 w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center shadow-sm"
                            title="Prestazione principale"
                        >
                            <Star className="w-3 h-3 text-white fill-white" />
                        </div>
                    )}

                    {/* Selection indicator */}
                    <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${indicatorClass}`}>
                        <Check className="w-3 h-3 text-white" />
                    </div>

                    {/* Prestazione info */}
                    <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 text-sm leading-tight">
                            {p.nome}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-1.5">
                            <span>{p.codice}</span>
                            {/* A carico di badge */}
                            {(isMDL || (!isPrimary && p.aCaricoTipo)) && (
                                <span className={`inline-flex items-center gap-0.5 px-1 py-0 rounded text-[10px] font-medium ${(isMDL || p.aCaricoTipo === 'azienda')
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-gray-100 text-gray-600'
                                    }`}>
                                    {(isMDL || p.aCaricoTipo === 'azienda')
                                        ? <><Briefcase className="h-2.5 w-2.5" /> Azienda</>
                                        : <><User className="h-2.5 w-2.5" /> Paziente</>
                                    }
                                </span>
                            )}
                            {/* P73: Visita secondaria creata per specialista */}
                            {!isPrimary && p.visitaSecondariaId && (
                                <span className="inline-flex items-center gap-0.5 px-1 py-0 rounded text-[10px] font-medium bg-teal-100 text-teal-700" title="Visita specialistica generata">
                                    <Link2 className="h-2.5 w-2.5" /> Specialista
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Duration & Price */}
                    <div className="flex flex-col items-end text-xs flex-shrink-0">
                        {canViewPrices && displayPrice > 0 && (
                            <span className="font-semibold text-gray-700">
                                €{displayPrice.toFixed(0)}
                            </span>
                        )}
                        {p.durata !== undefined && p.durata > 0 && (
                            <span className="flex items-center gap-0.5 text-gray-500">
                                <Clock className="h-3 w-3 text-gray-400" />
                                {p.durata}&apos;
                            </span>
                        )}
                    </div>

                    {/* Remove button (only for additional prestazioni when can modify) */}
                    {!isPrimary && canModify && (
                        <button
                            type="button"
                            onClick={() => handleRemovePrestazione(p.id)}
                            className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Rimuovi"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>

                {/* ── MDL Tipo Visita — sezione interna alla card VML, larghezza piena ── */}
                {isPrimary && isMDL && (
                    <div className="flex items-center gap-2 px-2 py-1.5 bg-teal-50/60 border-t border-teal-100">
                        <Briefcase className="h-3 w-3 text-teal-500 flex-shrink-0" />
                        <span className="text-xs text-gray-600 font-medium whitespace-nowrap">Tipo MDL:</span>
                        {canModify ? (
                            <select
                                value={tipoVisitaMDL || ''}
                                onChange={(e) => onChangeTipoVisita?.(e.target.value)}
                                className="flex-1 min-w-0 text-xs border border-gray-200 rounded px-1.5 py-0.5 bg-white
                                         focus:border-teal-300 focus:ring-1 focus:ring-teal-100 outline-none"
                            >
                                <option value="">— seleziona tipo visita —</option>
                                {uniqueVociTariffario.length > 0
                                    ? uniqueVociTariffario.map(v => (
                                        <option key={v.categoriaVisita || 'default'} value={v.categoriaVisita || ''}>
                                            {CATEGORIA_VISITA_LABELS[v.categoriaVisita as keyof typeof CATEGORIA_VISITA_LABELS] || v.categoriaVisita || 'Standard'}
                                            {canViewPrices ? ` — €${Number(v.prezzoBase).toFixed(0)}` : ''}
                                        </option>
                                    ))
                                    : Object.entries(CATEGORIA_VISITA_LABELS).map(([key, label]) => (
                                        <option key={key} value={key}>{label}</option>
                                    ))
                                }
                            </select>
                        ) : tipoVisitaMDL ? (
                            <span className="text-xs text-teal-700 font-medium">
                                {CATEGORIA_VISITA_LABELS[tipoVisitaMDL as keyof typeof CATEGORIA_VISITA_LABELS] || tipoVisitaMDL}
                                {canViewPrices && (() => {
                                    const v = uniqueVociTariffario.find(v => v.categoriaVisita === tipoVisitaMDL);
                                    return v ? ` — €${Number(v.prezzoBase).toFixed(0)}` : null;
                                })()}
                            </span>
                        ) : (
                            <span className="text-xs text-gray-400 italic">Non specificato</span>
                        )}
                    </div>
                )}

                {/* ── Prestazione aggiuntiva: refertante (Dott./Dott.ssa) + a carico di ── */}
                {showSubRow && (
                    <div className="flex items-center gap-2 px-2 py-1.5 bg-purple-50/30 border-t border-purple-100">
                        {canModify ? (
                            <>
                                {mediciDisponibili.length > 0 && (
                                    <div className="flex items-center gap-1 flex-1 min-w-0">
                                        <UserCheck className="h-3 w-3 text-violet-500 flex-shrink-0" />
                                        <select
                                            value={currentMedicoId}
                                            onChange={(e) => {
                                                const sel = mediciDisponibili.find(m => m.id === e.target.value);
                                                onUpdatePrestazione?.(p.id, {
                                                    medicoRefertanteId: e.target.value || undefined,
                                                    medicoRefertanteNome: sel ? `${sel.lastName} ${sel.firstName}` : undefined
                                                });
                                            }}
                                            className="flex-1 min-w-0 border border-gray-200 rounded px-1.5 py-0.5 text-xs bg-white
                                                     focus:border-violet-300 focus:ring-1 focus:ring-violet-100 outline-none"
                                            title="Medico refertante"
                                        >
                                            {mediciDisponibili.map(m => (
                                                <option key={m.id} value={m.id}>
                                                    {getHonorific(m)} {m.lastName} {m.firstName}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                {!isMDL && (
                                    <div className="flex-shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => onUpdatePrestazione?.(p.id, {
                                                aCaricoTipo: p.aCaricoTipo === 'azienda' ? 'paziente' : 'azienda'
                                            })}
                                            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${p.aCaricoTipo === 'azienda'
                                                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                }`}
                                            title="Cambia: a carico paziente / azienda"
                                        >
                                            <RefreshCw className="h-2.5 w-2.5" />
                                            {p.aCaricoTipo === 'azienda' ? 'Azienda' : 'Paziente'}
                                        </button>
                                    </div>
                                )}
                            </>
                        ) : (
                            /* Readonly: mostra refertante con onorifico corretto (Dott./Dott.ssa) */
                            <div className="flex items-center gap-1 text-xs text-violet-700">
                                <UserCheck className="h-3 w-3 flex-shrink-0" />
                                {medicoObj ? (
                                    <span>Refertata da: {getHonorific(medicoObj)} {medicoObj.lastName} {medicoObj.firstName}</span>
                                ) : p.medicoRefertanteNome ? (
                                    <span>Refertata da: {p.medicoRefertanteNome}</span>
                                ) : null}
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className={`bg-white rounded-xl border border-gray-200 shadow-sm ${className}`}>
            {/* Header */}
            <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full px-3 py-2.5 flex items-center justify-between border-b border-gray-100 
                         bg-gradient-to-r from-indigo-50 to-purple-50 rounded-t-xl hover:from-indigo-100 hover:to-purple-100 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-indigo-600" />
                    <h3 className="text-sm font-semibold text-gray-700">Prestazioni</h3>
                    <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-full">
                        {totalCount}
                    </span>
                    {isMDL && (
                        <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-medium rounded-full flex items-center gap-0.5">
                            <Briefcase className="h-2.5 w-2.5" />
                            MDL
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {!isExpanded && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <Clock className="h-3 w-3" />
                            <span>{totals.durata}&apos;</span>
                            {canViewPrices && (
                                <>
                                    <span className="mx-0.5">•</span>
                                    <span className="font-medium text-indigo-600">€{totals.prezzo.toFixed(0)}</span>
                                </>
                            )}
                        </div>
                    )}
                    {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-gray-500" />
                    ) : (
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                    )}
                </div>
            </button>

            {/* Content */}
            {isExpanded && (
                <div className="p-3 space-y-3">
                    {/* Prestazioni List */}
                    <div className="space-y-1.5">
                        {prestazionePrincipale && renderPrestazioneRow(prestazionePrincipale, true)}
                        {prestazioniAggiuntive.map(p => renderPrestazioneRow(p, false))}
                    </div>

                    {/* Prima Visita / Controllo Toggle (P65.7) — solo per visite non-MDL o senza vociTariffario */}
                    {hasPrimaControlloVariant && canModify && !isMDL && (
                        <div className="flex items-center gap-2 p-2 bg-amber-50/70 border border-amber-200 rounded-lg">
                            <RefreshCw className="h-3.5 w-3.5 text-amber-600 flex-shrink-0" />
                            <span className="text-xs text-gray-700 font-medium">Tipo visita:</span>
                            <div className="flex gap-1">
                                <button
                                    type="button"
                                    onClick={() => onTogglePrimaVisita?.(true)}
                                    className={`px-2 py-0.5 text-xs font-medium rounded transition-colors ${isPrimaVisita
                                        ? 'bg-amber-500 text-white shadow-sm'
                                        : 'bg-white text-gray-600 border border-gray-200 hover:bg-amber-50'
                                        }`}
                                >
                                    Prima visita
                                    {canViewPrices && prestazionePrincipale?.prezzoPrimaVisita != null && (
                                        <span className="ml-1 opacity-75">€{prestazionePrincipale.prezzoPrimaVisita}</span>
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onTogglePrimaVisita?.(false)}
                                    className={`px-2 py-0.5 text-xs font-medium rounded transition-colors ${!isPrimaVisita
                                        ? 'bg-amber-500 text-white shadow-sm'
                                        : 'bg-white text-gray-600 border border-gray-200 hover:bg-amber-50'
                                        }`}
                                >
                                    Controllo
                                    {canViewPrices && prestazionePrincipale?.prezzoControllo != null && (
                                        <span className="ml-1 opacity-75">€{prestazionePrincipale.prezzoControllo}</span>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Add Prestazione - Searchbar */}
                    {canModify && (
                        <div>
                            {!isSearchOpen ? (
                                <button
                                    type="button"
                                    onClick={() => setIsSearchOpen(true)}
                                    className="w-full flex items-center justify-center gap-1.5 py-2 
                                             border border-dashed border-gray-300 rounded-lg 
                                             text-gray-500 hover:border-indigo-400 hover:text-indigo-600 
                                             transition-colors text-sm"
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                    <span className="font-medium">Aggiungi</span>
                                </button>
                            ) : (
                                <div className="border border-gray-200 rounded-lg bg-white shadow-sm">
                                    <div className="flex items-center gap-2 p-2 border-b border-gray-100">
                                        <Search className="h-4 w-4 text-gray-400" />
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Cerca tra le prestazioni del medico..."
                                            className="flex-1 text-sm outline-none bg-transparent"
                                            autoFocus
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsSearchOpen(false);
                                                setSearchQuery('');
                                            }}
                                            className="p-1 text-gray-400 hover:text-gray-600 rounded"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                    <div className="max-h-36 overflow-y-auto">
                                        {filteredPrestazioni.length > 0 ? (
                                            filteredPrestazioni.slice(0, 8).map(p => (
                                                <button
                                                    key={p.id}
                                                    type="button"
                                                    onClick={() => handleAddPrestazione(p)}
                                                    className="w-full flex items-center justify-between px-3 py-2 
                                                             hover:bg-indigo-50 transition-colors text-left text-sm"
                                                >
                                                    <div className="min-w-0">
                                                        <div className="font-medium text-gray-900 truncate">
                                                            {p.nome}
                                                        </div>
                                                        <div className="text-xs text-gray-500">{p.codice}</div>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs text-gray-500 flex-shrink-0 ml-2">
                                                        {p.durata !== undefined && p.durata > 0 && <span>{p.durata}&apos;</span>}
                                                        {canViewPrices && p.prezzo !== undefined && p.prezzo > 0 && (
                                                            <span className="font-medium text-gray-700">€{p.prezzo.toFixed(0)}</span>
                                                        )}
                                                    </div>
                                                </button>
                                            ))
                                        ) : (
                                            <div className="p-3 text-center text-xs text-gray-500">
                                                {searchQuery ? 'Nessuna prestazione trovata' : 'Nessuna prestazione disponibile'}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Visualizza tutte le prestazioni toggle */}
                            {onToggleShowAll && (
                                <label className="flex items-center gap-1.5 px-2 py-1 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={showAllPrestazioni}
                                        onChange={(e) => onToggleShowAll(e.target.checked)}
                                        className="h-3.5 w-3.5 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                                    />
                                    <span className="text-xs text-gray-500">Visualizza tutte</span>
                                </label>
                            )}
                        </div>
                    )}

                    {/* Divider */}
                    <div className="border-t border-gray-100 pt-2" />

                    {/* Convenzione Section - permission gated */}
                    {canManageConvenzioni && (
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600 uppercase tracking-wide">
                                    <Building2 className="h-3.5 w-3.5" />
                                    Convenzione
                                </div>
                            </div>

                            {convenzioneAssociata ? (
                                <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg border border-blue-200">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <Tag className="h-4 w-4 text-blue-600 flex-shrink-0" />
                                        <div className="min-w-0">
                                            <span className="text-sm font-medium text-gray-900 truncate block">{convenzioneAssociata.nome}</span>
                                            <span className="text-xs text-gray-500">({convenzioneAssociata.tipo})</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        {convenzioneAssociata.scontoPercentuale && convenzioneAssociata.scontoPercentuale > 0 && (
                                            <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded">
                                                -{convenzioneAssociata.scontoPercentuale}%
                                            </span>
                                        )}
                                        {canModify && !isFatturata && (
                                            <button
                                                type="button"
                                                onClick={handleRemoveConvenzione}
                                                className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                title="Rimuovi convenzione"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    {isConvenzioneOpen ? (
                                        <div className="border border-gray-200 rounded-lg bg-white shadow-sm">
                                            <div className="flex items-center gap-2 p-2 border-b border-gray-100">
                                                <Search className="h-4 w-4 text-gray-400" />
                                                <input
                                                    type="text"
                                                    value={convenzioneSearchQuery}
                                                    onChange={(e) => setConvenzioneSearchQuery(e.target.value)}
                                                    placeholder="Cerca convenzione..."
                                                    className="flex-1 text-sm outline-none bg-transparent"
                                                    autoFocus
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setIsConvenzioneOpen(false);
                                                        setConvenzioneSearchQuery('');
                                                    }}
                                                    className="p-1 text-gray-400 hover:text-gray-600 rounded"
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                            </div>
                                            <div className="max-h-36 overflow-y-auto">
                                                {filteredConvenzioni.length > 0 ? (
                                                    filteredConvenzioni.map(c => (
                                                        <button
                                                            key={c.id}
                                                            type="button"
                                                            onClick={() => handleSelectConvenzione(c.id)}
                                                            className="w-full flex items-center justify-between px-3 py-2 
                                                                 hover:bg-blue-50 transition-colors text-left text-sm"
                                                        >
                                                            <div className="min-w-0">
                                                                <div className="font-medium text-gray-900 truncate">{c.nome}</div>
                                                                <div className="text-xs text-gray-500">{c.tipo}</div>
                                                            </div>
                                                            {c.scontoPercentuale && c.scontoPercentuale > 0 && (
                                                                <span className="text-xs font-medium text-green-600 flex-shrink-0 ml-2">
                                                                    -{c.scontoPercentuale}%
                                                                </span>
                                                            )}
                                                        </button>
                                                    ))
                                                ) : (
                                                    <div className="p-3 text-center text-xs text-gray-500">
                                                        {convenzioneSearchQuery ? 'Nessuna convenzione trovata' : 'Nessuna convenzione disponibile'}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ) : canModify && !isFatturata ? (
                                        <button
                                            type="button"
                                            onClick={() => setIsConvenzioneOpen(true)}
                                            className="w-full py-2 text-xs text-gray-500 border border-dashed border-gray-300 
                                                 rounded-lg hover:border-blue-400 hover:text-blue-600 transition-colors"
                                        >
                                            + Aggiungi convenzione
                                        </button>
                                    ) : (
                                        <div className="text-xs text-gray-400 italic">Nessuna convenzione</div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Codici Sconto Section - permission gated */}
                    {canManageConvenzioni && (
                        <div>
                            <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600 uppercase tracking-wide mb-1.5">
                                <Percent className="h-3.5 w-3.5" />
                                Codici Sconto
                            </div>

                            {codiciScontoApplicati.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mb-2">
                                    {codiciScontoApplicati.map(cs => (
                                        <span
                                            key={cs.codice}
                                            className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 
                                                 border border-green-200 rounded text-xs font-medium"
                                        >
                                            {cs.codice}
                                            {cs.scontoPercentuale && ` (-${cs.scontoPercentuale}%)`}
                                            {cs.scontoFisso && ` (-€${cs.scontoFisso})`}
                                            {canModify && !isFatturata && (
                                                <button
                                                    type="button"
                                                    onClick={() => onRemoveCodiceSconto?.(cs.codice)}
                                                    className="text-green-600 hover:text-red-600 ml-0.5"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            )}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {canModify && !isFatturata && (
                                <div className="flex gap-1.5">
                                    <input
                                        type="text"
                                        value={scontoInput}
                                        onChange={(e) => setScontoInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddSconto()}
                                        placeholder="Inserisci codice..."
                                        className="flex-1 px-2 py-1.5 text-xs border border-gray-200 rounded-lg 
                                             focus:border-green-400 focus:ring-1 focus:ring-green-100 outline-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddSconto}
                                        disabled={!scontoInput.trim()}
                                        className="px-2.5 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg 
                                             hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Applica
                                    </button>
                                </div>
                            )}

                            {!canModify && codiciScontoApplicati.length === 0 && (
                                <div className="text-xs text-gray-400 italic">Nessun codice sconto</div>
                            )}
                        </div>
                    )}

                    {/* Totals Summary */}
                    <div className="pt-2 border-t border-gray-200">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700">Totale</span>
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1 text-sm text-gray-600">
                                    <Clock className="h-4 w-4" />
                                    <span>{totals.durata} min</span>
                                </div>
                                {canViewPrices && (
                                    <div className="flex items-center gap-1 text-sm font-bold text-indigo-600">
                                        <Euro className="h-4 w-4" />
                                        <span>{totals.prezzo.toFixed(2)}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        {isFatturata && (
                            <div className="mt-1 text-xs text-amber-600 flex items-center gap-1">
                                <Tag className="h-3 w-3" />
                                <span>Prestazione fatturata - modifiche non consentite</span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PrestazioniCard;
