/**
 * CompanyProtocolliSanitariSection - Card dedicata ai Protocolli Sanitari in dettaglio azienda
 *
 * Mostra i protocolli sanitari associati alle mansioni dell'azienda,
 * con dettaglio prestazioni, dipendenti coinvolti e stato attivo.
 *
 * @module components/companies/CompanyProtocolliSanitariSection
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
    FileText,
    ExternalLink,
    ChevronDown,
    ChevronUp,
    Shield,
    Users,
    User,
    Loader2,
    Activity,
    Clock,
    ClipboardList,
    Plus,
    Search,
    X,
    Save
} from 'lucide-react';
import { apiGet, apiPut } from '../../services/api';
import { clinicaApi, ProtocolloSanitario } from '../../services/clinicaApi';
import { cn } from '../../design-system/utils';
import { ElegantSelect } from '@/components/ui/ElegantSelect';
import { useToast } from '../../hooks/useToast';

interface CompanyProtocolliSanitariSectionProps {
    companyId: string;
    isCrossTenant?: boolean;
}

interface MansioneWithProtocollo {
    id: string;
    nome: string;
    dipendenti?: Array<{
        id: string;
        firstName: string;
        lastName: string;
    }>;
    protocollo?: {
        id: string;
        codice: string;
        denominazione: string;
    };
}

interface CompanyMansioneResponse {
    data: Array<{
        id: string;
        nome: string;
        dipendenti?: Array<{
            id: string;
            firstName: string;
            lastName: string;
        }>;
    }>;
}

const CompanyProtocolliSanitariSection: React.FC<CompanyProtocolliSanitariSectionProps> = ({
    companyId,
    isCrossTenant = false
}) => {
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const { showToast } = useToast();
    const queryClient = useQueryClient();

    // State per il modal di assegnazione protocollo per dipendente
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [dipendentiAssignments, setDipendentiAssignments] = useState<Record<string, string>>({});
    const [protSearch, setProtSearch] = useState('');

    // Fetch mansioni dell'azienda per ottenere gli ID
    const { data: mansioniData, isLoading: loadingMansioni } = useQuery({
        queryKey: ['company-mansioni', companyId],
        queryFn: async () => {
            const response = await apiGet<CompanyMansioneResponse>(`/api/v1/companies/${companyId}/mansioni`);
            return response.data || [];
        },
        staleTime: 60 * 1000,
        enabled: !isCrossTenant
    });

    const mansioneIds = (mansioniData || []).map(m => m.id);

    // Fetch protocolli per tutte le mansioni dell'azienda (aggregati)
    const { data: protocolliData, isLoading: loadingProtocolli } = useQuery({
        queryKey: ['company-protocolli', companyId, mansioneIds],
        queryFn: async () => {
            if (mansioneIds.length === 0) return [];
            // Fetch protocolli per ogni mansione in parallelo e deduplicare
            const results = await Promise.all(
                mansioneIds.map(id => clinicaApi.protocolliSanitari.getByMansione(id).catch(() => []))
            );
            // Dedup by protocollo ID, tenendo traccia delle mansioni associate e dipendenti
            const protMap = new Map<string, ProtocolloSanitario & { mansioniAssociateNomi: string[]; dipendentiCoinvolti: Array<{ id: string; firstName: string; lastName: string }> }>();
            results.forEach((protocolli, idx) => {
                const mansione = mansioniData?.[idx];
                const mansioneNome = mansione?.nome || '';
                const mansioneDipendenti = mansione?.dipendenti || [];
                if (Array.isArray(protocolli)) {
                    for (const p of protocolli) {
                        if (!protMap.has(p.id)) {
                            protMap.set(p.id, { ...p, mansioniAssociateNomi: [mansioneNome], dipendentiCoinvolti: [...mansioneDipendenti] });
                        } else {
                            const existing = protMap.get(p.id)!;
                            existing.mansioniAssociateNomi.push(mansioneNome);
                            // Dedup dipendenti by person ID
                            for (const dip of mansioneDipendenti) {
                                if (!existing.dipendentiCoinvolti.some(d => d.id === dip.id)) {
                                    existing.dipendentiCoinvolti.push(dip);
                                }
                            }
                        }
                    }
                }
            });
            return Array.from(protMap.values());
        },
        staleTime: 60 * 1000,
        enabled: mansioneIds.length > 0
    });

    const protocolli = protocolliData || [];
    const isLoading = loadingMansioni || loadingProtocolli;
    const attiviCount = protocolli.filter(p => p.isAttivo).length;

    // Fetch protocolli disponibili per il modal assegnazione
    const { data: allProtocolliList } = useQuery({
        queryKey: ['protocolli-sanitari-for-assign'],
        queryFn: () => clinicaApi.protocolliSanitari.getAll({ isAttivo: true, limit: 100 }),
        enabled: showAssignModal,
        staleTime: 30 * 1000
    });

    // Mutation per assegnare protocollo a mansione
    // Fetch dipendenti con protocolli assegnati
    const { data: dipendentiData, isLoading: loadingDipendenti } = useQuery({
        queryKey: ['company-dipendenti-protocolli', companyId],
        queryFn: async () => {
            const response = await apiGet<{
                success: boolean; data: Array<{
                    personId: string;
                    firstName: string;
                    lastName: string;
                    taxCode: string;
                    protocolloSanitarioId: string | null;
                    protocolloSanitario: { id: string; codice: string; denominazione: string } | null;
                }>
            }>(`/api/v1/companies/${companyId}/dipendenti-protocolli`);
            return response.data || [];
        },
        staleTime: 30 * 1000,
        enabled: showAssignModal && !isCrossTenant
    });

    // Mutation per assegnazione batch per dipendente
    const batchAssignMutation = useMutation({
        mutationFn: (assignments: Array<{ personId: string; protocolloSanitarioId: string | null }>) =>
            apiPut(`/api/v1/companies/${companyId}/dipendenti-protocolli`, { assignments }),
        onSuccess: () => {
            showToast({ message: 'Protocolli sanitari assegnati ai dipendenti', type: 'success' });
            setShowAssignModal(false);
            setDipendentiAssignments({});
            setProtSearch('');
            queryClient.invalidateQueries({ queryKey: ['company-protocolli', companyId] });
            queryClient.invalidateQueries({ queryKey: ['company-dipendenti-protocolli', companyId] });
        },
        onError: () => {
            showToast({ message: 'Errore nell\'assegnazione dei protocolli', type: 'error' });
        }
    });

    // Initialize assignments from server data when modal opens
    const initializeAssignments = () => {
        if (dipendentiData) {
            const initial: Record<string, string> = {};
            for (const d of dipendentiData) {
                initial[d.personId] = d.protocolloSanitarioId || '';
            }
            setDipendentiAssignments(initial);
        }
    };

    // Check if there are unsaved changes
    const hasChanges = useMemo(() => {
        if (!dipendentiData) return false;
        return dipendentiData.some(d => {
            const current = d.protocolloSanitarioId || '';
            const newVal = dipendentiAssignments[d.personId] ?? current;
            return newVal !== current;
        });
    }, [dipendentiData, dipendentiAssignments]);

    const handleSaveAssignments = () => {
        if (!dipendentiData) return;
        const assignments = dipendentiData.map(d => ({
            personId: d.personId,
            protocolloSanitarioId: dipendentiAssignments[d.personId] || null
        }));
        batchAssignMutation.mutate(assignments);
    };

    // Filter dipendenti by search
    const filteredDipendenti = useMemo(() => {
        if (!dipendentiData) return [];
        const q = protSearch.toLowerCase().trim();
        if (!q) return dipendentiData;
        return dipendentiData.filter(d =>
            d.firstName.toLowerCase().includes(q) ||
            d.lastName.toLowerCase().includes(q) ||
            d.taxCode?.toLowerCase().includes(q)
        );
    }, [dipendentiData, protSearch]);

    // Initialize assignments when dipendenti data loads while modal is open
    useEffect(() => {
        if (showAssignModal && dipendentiData) {
            initializeAssignments();
        }
    }, [showAssignModal, dipendentiData]);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-black/30 border border-gray-100 dark:border-gray-700 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-900/20 dark:to-emerald-900/20">
                <div className="flex items-center justify-between">
                    <div className="flex items-center">
                        <ClipboardList className="h-5 w-5 text-teal-600 mr-2" />
                        <h2 className="text-lg font-semibold text-teal-800 dark:text-teal-400">Protocolli Sanitari</h2>
                        {protocolli.length > 0 && (
                            <span className="ml-2 px-2 py-0.5 rounded-full bg-teal-100 text-teal-700 text-xs font-medium">
                                {attiviCount}/{protocolli.length}
                            </span>
                        )}
                    </div>
                    {!isCrossTenant && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowAssignModal(true)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors"
                            >
                                <Plus className="h-3.5 w-3.5" />
                                Assegna
                            </button>
                            <Link
                                to="/poliambulatorio/mdl/protocolli-sanitari"
                                className="text-sm text-teal-600 hover:text-teal-800 font-medium inline-flex items-center"
                            >
                                Gestisci
                                <ExternalLink className="h-3 w-3 ml-1" />
                            </Link>
                        </div>
                    )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Protocolli sanitari assegnati alle mansioni aziendali - Art. 41 D.Lgs 81/08
                </p>
            </div>

            {/* Content */}
            <div className="p-6">
                {isCrossTenant ? (
                    <div className="text-center py-8">
                        <Shield className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 dark:text-gray-400 font-medium">Azienda Importata</p>
                        <p className="text-sm text-gray-400 mt-1">
                            I protocolli sanitari sono gestiti dal tenant proprietario.
                        </p>
                    </div>
                ) : isLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                    </div>
                ) : protocolli.length === 0 ? (
                    <div className="text-center py-8">
                        <ClipboardList className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                            Nessun protocollo sanitario associato
                        </p>
                        <p className="text-xs text-gray-400 mb-4">
                            Assegna protocolli sanitari alle mansioni dalla sezione dedicata.
                        </p>
                        <button
                            onClick={() => setShowAssignModal(true)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors"
                        >
                            <Plus className="h-4 w-4" />
                            Assegna protocollo sanitario
                        </button>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {protocolli.map(proto => {
                            const isExpanded = expandedId === proto.id;
                            const prestazioniCount = proto._count?.prestazioni || proto.prestazioni?.length || 0;
                            const questionariCount = proto._count?.questionari || proto.questionari?.length || 0;

                            return (
                                <div
                                    key={proto.id}
                                    className={cn(
                                        "rounded-lg border transition-colors",
                                        proto.isAttivo
                                            ? "border-teal-200 dark:border-teal-800"
                                            : "border-gray-200 dark:border-gray-700",
                                        isExpanded
                                            ? "bg-gray-50 dark:bg-gray-700/50"
                                            : "bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
                                    )}
                                >
                                    {/* Riga principale */}
                                    <div
                                        className="flex items-center p-3 cursor-pointer"
                                        onClick={() => setExpandedId(isExpanded ? null : proto.id)}
                                    >
                                        <div className={cn(
                                            "p-2 rounded-lg flex-shrink-0",
                                            proto.isAttivo
                                                ? "bg-teal-100 text-teal-600"
                                                : "bg-gray-100 text-gray-400"
                                        )}>
                                            <FileText className="h-4 w-4" />
                                        </div>
                                        <div className="ml-3 flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
                                                    {proto.codice}
                                                </span>
                                                <p className="text-sm font-medium text-gray-900 dark:text-gray-50 truncate">
                                                    {proto.denominazione}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-3 mt-0.5">
                                                <span className="text-[11px] text-gray-500 flex items-center gap-1">
                                                    <Activity className="h-3 w-3" />
                                                    {prestazioniCount} prest.
                                                </span>
                                                {questionariCount > 0 && (
                                                    <span className="text-[11px] text-gray-500 flex items-center gap-1">
                                                        <ClipboardList className="h-3 w-3" />
                                                        {questionariCount} quest.
                                                    </span>
                                                )}
                                                <span className="text-[11px] text-gray-500 flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    ogni {proto.periodicitaVisiteMesi} mesi
                                                </span>
                                                {'dipendentiCoinvolti' in proto && (proto as { dipendentiCoinvolti: unknown[] }).dipendentiCoinvolti.length > 0 && (
                                                    <span className="text-[11px] text-blue-600 dark:text-blue-400 flex items-center gap-1">
                                                        <Users className="h-3 w-3" />
                                                        {(proto as { dipendentiCoinvolti: unknown[] }).dipendentiCoinvolti.length} dip.
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 ml-3">
                                            {proto.isAttivo ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700 border border-green-200">
                                                    Attivo
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-500 border border-gray-200">
                                                    Inattivo
                                                </span>
                                            )}
                                            {isExpanded ? (
                                                <ChevronUp className="h-4 w-4 text-gray-400" />
                                            ) : (
                                                <ChevronDown className="h-4 w-4 text-gray-400" />
                                            )}
                                        </div>
                                    </div>

                                    {/* Dettaglio espanso */}
                                    {isExpanded && (
                                        <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700">
                                            <div className="pt-3 space-y-3">
                                                {proto.descrizione && (
                                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                                        {proto.descrizione}
                                                    </p>
                                                )}

                                                {/* Mansioni associate */}
                                                {'mansioniAssociateNomi' in proto && (proto as { mansioniAssociateNomi: string[] }).mansioniAssociateNomi.length > 0 && (
                                                    <div>
                                                        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1.5">
                                                            Mansioni associate
                                                        </h4>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {(proto as { mansioniAssociateNomi: string[] }).mansioniAssociateNomi.map((nome, i) => (
                                                                <span
                                                                    key={i}
                                                                    className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-amber-50 text-amber-700 border border-amber-200"
                                                                >
                                                                    <Users className="h-3 w-3 mr-1" />
                                                                    {nome}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Dipendenti coinvolti */}
                                                {'dipendentiCoinvolti' in proto && (proto as { dipendentiCoinvolti: Array<{ id: string; firstName: string; lastName: string }> }).dipendentiCoinvolti.length > 0 && (
                                                    <div>
                                                        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1.5">
                                                            Dipendenti coinvolti ({(proto as { dipendentiCoinvolti: Array<{ id: string; firstName: string; lastName: string }> }).dipendentiCoinvolti.length})
                                                        </h4>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {(proto as { dipendentiCoinvolti: Array<{ id: string; firstName: string; lastName: string }> }).dipendentiCoinvolti.slice(0, 8).map(dip => (
                                                                <span
                                                                    key={dip.id}
                                                                    className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700"
                                                                >
                                                                    <User className="h-3 w-3 mr-1 flex-shrink-0" />
                                                                    {dip.lastName} {dip.firstName}
                                                                </span>
                                                            ))}
                                                            {(proto as { dipendentiCoinvolti: Array<{ id: string; firstName: string; lastName: string }> }).dipendentiCoinvolti.length > 8 && (
                                                                <span className="text-[10px] text-gray-400 self-center">
                                                                    +{(proto as { dipendentiCoinvolti: Array<{ id: string; firstName: string; lastName: string }> }).dipendentiCoinvolti.length - 8} altri
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Prestazioni */}
                                                {proto.prestazioni && proto.prestazioni.length > 0 && (
                                                    <div>
                                                        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1.5">
                                                            Prestazioni ({proto.prestazioni.length})
                                                        </h4>
                                                        <div className="space-y-1">
                                                            {proto.prestazioni.slice(0, 5).map(prest => (
                                                                <div
                                                                    key={prest.id}
                                                                    className="flex items-center justify-between px-2 py-1 rounded bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-600 text-xs"
                                                                >
                                                                    <div className="flex items-center gap-1.5">
                                                                        <Activity className="h-3 w-3 text-teal-500 flex-shrink-0" />
                                                                        <span className="font-mono text-gray-400">{prest.prestazione?.codice}</span>
                                                                        <span className="text-gray-700 dark:text-gray-300">{prest.prestazione?.nome}</span>
                                                                    </div>
                                                                    {prest.isObbligatoria && (
                                                                        <span className="text-[10px] text-red-500 font-medium">Obbl.</span>
                                                                    )}
                                                                </div>
                                                            ))}
                                                            {proto.prestazioni.length > 5 && (
                                                                <p className="text-[10px] text-gray-400 pl-2">
                                                                    +{proto.prestazioni.length - 5} altre prestazioni
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Link dettaglio */}
                                                <div className="flex justify-end pt-1">
                                                    <Link
                                                        to={`/poliambulatorio/mdl/protocolli-sanitari/${proto.id}`}
                                                        className="text-sm text-teal-600 hover:text-teal-800 inline-flex items-center"
                                                    >
                                                        Vedi dettaglio
                                                        <ExternalLink className="h-3 w-3 ml-1" />
                                                    </Link>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Modal Assegnazione Protocollo Sanitario ai Dipendenti */}
            {showAssignModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/40" onClick={() => { setShowAssignModal(false); setProtSearch(''); }} />
                    <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
                        {/* Header */}
                        <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                    Assegna Protocollo Sanitario ai Dipendenti
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    Seleziona il protocollo sanitario per ciascun dipendente
                                </p>
                            </div>
                            <button onClick={() => { setShowAssignModal(false); setProtSearch(''); }}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Search */}
                        <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-700">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                                <input type="text" value={protSearch} onChange={e => setProtSearch(e.target.value)}
                                    placeholder="Cerca dipendente…"
                                    className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700/50 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                                    autoFocus />
                            </div>
                        </div>

                        {/* Content - Employee list with protocollo dropdown */}
                        <div className="overflow-y-auto flex-1 px-4 py-3">
                            {loadingDipendenti ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                                </div>
                            ) : filteredDipendenti.length === 0 ? (
                                <div className="text-center py-8 text-sm text-gray-400">
                                    {protSearch ? 'Nessun dipendente trovato' : 'Nessun dipendente associato all\'azienda'}
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {filteredDipendenti.map(dip => (
                                        <div key={dip.personId} className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40">
                                            <div className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 flex-shrink-0">
                                                <User className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                                    {dip.lastName} {dip.firstName}
                                                </p>
                                                {dip.taxCode && (
                                                    <span className="text-[10px] font-mono text-gray-400">{dip.taxCode}</span>
                                                )}
                                            </div>
                                            <div className="w-64">
                                                <ElegantSelect
                                                    value={dipendentiAssignments[dip.personId] ?? (dip.protocolloSanitarioId || '')}
                                                    onChange={v => setDipendentiAssignments(prev => ({ ...prev, [dip.personId]: v }))}
                                                    placeholder="– Nessun protocollo –"
                                                    options={[
                                                        { value: '', label: '– Nessun protocollo –' },
                                                        ...(allProtocolliList?.data || []).map((p: ProtocolloSanitario) => ({ value: p.id, label: `${p.codice} - ${p.denominazione}` }))
                                                    ]}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                            <span className="text-xs text-gray-400">
                                {filteredDipendenti.length} dipendenti
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => { setShowAssignModal(false); setProtSearch(''); }}
                                    className="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                >
                                    Annulla
                                </button>
                                <button
                                    onClick={handleSaveAssignments}
                                    disabled={!hasChanges || batchAssignMutation.isPending}
                                    className={cn(
                                        'inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-lg transition-colors',
                                        hasChanges
                                            ? 'bg-teal-600 hover:bg-teal-700 text-white'
                                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    )}
                                >
                                    {batchAssignMutation.isPending ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                        <Save className="h-3.5 w-3.5" />
                                    )}
                                    Salva
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CompanyProtocolliSanitariSection;
