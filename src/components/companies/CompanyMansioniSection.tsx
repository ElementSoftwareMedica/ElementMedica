/**
 * CompanyMansioniSection - Sezione Mansioni nella pagina dettaglio azienda
 * 
 * Mostra le mansioni assegnate all'azienda con i relativi rischi.
 * Permette di aprire modal per assegnare nuove mansioni e cambiare/rimuovere
 * l'assegnazione per singolo dipendente.
 * 
 * @module components/companies/CompanyMansioniSection
 * @project P58 - Company Details Enhancement
 */

import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
    Briefcase,
    AlertTriangle,
    ExternalLink,
    Plus,
    ChevronDown,
    ChevronUp,
    Shield,
    Users,
    Loader2,
    X,
    ArrowRightLeft,
    Check
} from 'lucide-react';
import { useConfirmDialog } from '@/contexts/ConfirmDialogContext';
import { apiGet, apiDelete, apiPost } from '../../services/api';
import { cn } from '../../design-system/utils';
import { QuickActionMansioneModal } from './quick-actions/QuickActionMansioneModal';
import { useToast } from '../../hooks/useToast';

interface CompanyMansioniSectionProps {
    companyId: string;
    companyName: string;
    /** Se true, l'azienda è importata da altro tenant e non mostra mansioni locali */
    isCrossTenant?: boolean;
}

interface MansioneAssegnata {
    id: string;
    nome: string;
    descrizione?: string;
    categoria?: string;
    livelloRischio: 'BASSO' | 'MEDIO' | 'ALTO' | 'MOLTO_ALTO';
    rischi?: Array<{
        id: string;
        nome: string;
        categoria?: string;
    }>;
    dipendentiCount?: number;
    dipendenti?: Array<{
        id: string;
        firstName: string;
        lastName: string;
        assignmentId: string;
    }>;
}

interface MansioneOption {
    id: string;
    denominazione: string;
    settore?: string;
}

interface ChangeMansioneState {
    personId: string;
    personName: string;
    assignmentId: string;
    currentMansioneId: string;
    currentMansioneNome: string;
    newMansioneId: string;
}

const RISK_LEVELS = {
    BASSO: { label: 'Basso', color: 'green', bgColor: 'bg-green-100', textColor: 'text-green-700', borderColor: 'border-green-200' },
    MEDIO: { label: 'Medio', color: 'yellow', bgColor: 'bg-yellow-100', textColor: 'text-yellow-700', borderColor: 'border-yellow-200' },
    ALTO: { label: 'Alto', color: 'orange', bgColor: 'bg-orange-100', textColor: 'text-orange-700', borderColor: 'border-orange-200' },
    MOLTO_ALTO: { label: 'Molto Alto', color: 'red', bgColor: 'bg-red-100', textColor: 'text-red-700', borderColor: 'border-red-200' }
};

const CompanyMansioniSection: React.FC<CompanyMansioniSectionProps> = ({
    companyId,
    companyName,
    isCrossTenant = false
}) => {
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [expandedMansioneId, setExpandedMansioneId] = useState<string | null>(null);
    const [changeState, setChangeState] = useState<ChangeMansioneState | null>(null);

    // Fetch mansioni assegnate all'azienda
    const { data: mansioniData, isLoading } = useQuery({
        queryKey: ['company-mansioni', companyId],
        queryFn: async () => {
            const response = await apiGet<{ data: MansioneAssegnata[] }>(`/api/v1/companies/${companyId}/mansioni`);
            return response.data || [];
        },
        staleTime: 60 * 1000,
        enabled: !isCrossTenant,
        retry: false
    });

    // Fetch tutte le mansioni disponibili (per il picker "Cambia mansione")
    const { data: allMansioniData } = useQuery({
        queryKey: ['all-mansioni'],
        queryFn: async () => {
            const response = await apiGet<{ data: MansioneOption[] }>('/api/v1/clinica/mansioni?limit=200');
            return response.data || [];
        },
        staleTime: 5 * 60 * 1000,
        enabled: !isCrossTenant
    });

    const allMansioni = allMansioniData || [];
    const mansioni = mansioniData || [];



    // Mutation: rimuovi un'assegnazione
    const removeAssignmentMutation = useMutation({
        mutationFn: ({ assignmentId }: { assignmentId: string }) =>
            apiDelete(`/api/v1/clinica/mansioni/assignment/${assignmentId}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['company-mansioni', companyId] });
            queryClient.invalidateQueries({ queryKey: [`company-sorveglianza-${companyId}`] });
            showToast({ message: 'Assegnazione rimossa con successo', type: 'success' });
        },
        onError: () => showToast({ message: 'Errore durante la rimozione', type: 'error' })
    });

    // Mutation: cambia mansione (elimina vecchia, crea nuova)
    const changeAssignmentMutation = useMutation({
        mutationFn: async ({
            assignmentId,
            newMansioneId,
            personId
        }: { assignmentId: string; newMansioneId: string; personId: string }) => {
            await apiDelete(`/api/v1/clinica/mansioni/assignment/${assignmentId}`);
            await apiPost(`/api/v1/clinica/mansioni/${newMansioneId}/assign`, { personId });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['company-mansioni', companyId] });
            queryClient.invalidateQueries({ queryKey: [`company-sorveglianza-${companyId}`] });
            setChangeState(null);
            showToast({ message: 'Mansione aggiornata con successo', type: 'success' });
        },
        onError: () => showToast({ message: 'Errore durante il cambio mansione', type: 'error' })
    });

    const handleModalSuccess = () => {
        setIsModalOpen(false);
        queryClient.invalidateQueries({ queryKey: ['company-mansioni', companyId] });
    };

    const toggleExpanded = (mansioneId: string) => {
        setExpandedMansioneId(prev => prev === mansioneId ? null : mansioneId);
    };

    const { confirm: confirmDialog } = useConfirmDialog();

    const handleRemoveDipendente = useCallback(async (e: React.MouseEvent, assignmentId: string) => {
        e.stopPropagation();
        e.preventDefault();
        const confirmed = await confirmDialog({
            title: 'Conferma rimozione',
            message: 'Rimuovere questa assegnazione mansione?',
            variant: 'danger'
        });
        if (confirmed) {
            removeAssignmentMutation.mutate({ assignmentId });
        }
    }, [confirmDialog, removeAssignmentMutation]);

    const handleChangeMansione = (e: React.MouseEvent, dip: NonNullable<MansioneAssegnata['dipendenti']>[0], mansione: MansioneAssegnata) => {
        e.stopPropagation();
        e.preventDefault();
        setChangeState({
            personId: dip.id,
            personName: `${dip.lastName} ${dip.firstName}`,
            assignmentId: dip.assignmentId,
            currentMansioneId: mansione.id,
            currentMansioneNome: mansione.nome,
            newMansioneId: ''
        });
    };

    return (
        <>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-black/30 border border-gray-100 dark:border-gray-700 overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <Briefcase className="h-5 w-5 text-amber-600 mr-2" />
                            <h2 className="text-lg font-semibold text-amber-800 dark:text-amber-400">Mansioni e Rischi</h2>
                            {!isCrossTenant && mansioni.length > 0 && (
                                <span className="ml-2 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
                                    {mansioni.length}
                                </span>
                            )}
                        </div>
                        {!isCrossTenant && (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setIsModalOpen(true)}
                                    className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-amber-700 bg-amber-100 rounded-lg hover:bg-amber-200 transition-colors"
                                >
                                    <Plus className="h-4 w-4 mr-1" />
                                    Assegna
                                </button>
                                <Link
                                    to={`/poliambulatorio/mdl/mansioni?companyId=${companyId}`}
                                    className="text-sm text-amber-600 hover:text-amber-800 font-medium inline-flex items-center"
                                >
                                    Gestisci
                                    <ExternalLink className="h-3 w-3 ml-1" />
                                </Link>
                            </div>
                        )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Mansioni assegnate ai dipendenti con rischi associati - Art. 28 D.Lgs 81/08
                    </p>
                </div>

                {/* Content */}
                <div className="p-6">
                    {isCrossTenant ? (
                        <div className="text-center py-8">
                            <Shield className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500 dark:text-gray-400 font-medium">Azienda Importata</p>
                            <p className="text-sm text-gray-400 mt-1">
                                Le mansioni sono gestite dal tenant proprietario di questa azienda.
                            </p>
                        </div>
                    ) : isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                        </div>
                    ) : mansioni.length === 0 ? (
                        <div className="text-center py-8">
                            <Briefcase className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Nessuna mansione assegnata</p>
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="inline-flex items-center px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium"
                            >
                                <Briefcase className="h-4 w-4 mr-2" />
                                Assegna Mansione
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {mansioni.map((mansione) => {
                                const riskLevel = RISK_LEVELS[mansione.livelloRischio];
                                const isExpanded = expandedMansioneId === mansione.id;

                                return (
                                    <div
                                        key={mansione.id}
                                        className={cn(
                                            "rounded-lg border transition-colors",
                                            riskLevel.borderColor,
                                            isExpanded ? "bg-gray-50 dark:bg-gray-700/50" : "bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
                                        )}
                                    >
                                        {/* Main row */}
                                        <div
                                            className="flex items-center p-4 cursor-pointer"
                                            onClick={() => toggleExpanded(mansione.id)}
                                        >
                                            <div className={cn(
                                                "p-2 rounded-lg flex-shrink-0",
                                                riskLevel.bgColor,
                                                riskLevel.textColor
                                            )}>
                                                <Shield className="h-5 w-5" />
                                            </div>
                                            <div className="ml-4 flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-50 truncate">
                                                        {mansione.nome}
                                                    </p>
                                                    <span className={cn(
                                                        "px-2 py-0.5 rounded-full text-xs font-medium",
                                                        riskLevel.bgColor,
                                                        riskLevel.textColor
                                                    )}>
                                                        {riskLevel.label}
                                                    </span>
                                                </div>
                                                {mansione.categoria && (
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{mansione.categoria}</p>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-4 ml-4">
                                                {mansione.dipendentiCount !== undefined && (
                                                    <div className="flex items-center text-gray-500 dark:text-gray-400 text-sm">
                                                        <Users className="h-4 w-4 mr-1" />
                                                        {mansione.dipendentiCount}
                                                    </div>
                                                )}
                                                {mansione.rischi && mansione.rischi.length > 0 && (
                                                    <div className="flex items-center text-orange-500 text-sm">
                                                        <AlertTriangle className="h-4 w-4 mr-1" />
                                                        {mansione.rischi.length}
                                                    </div>
                                                )}
                                                {isExpanded ? (
                                                    <ChevronUp className="h-5 w-5 text-gray-400" />
                                                ) : (
                                                    <ChevronDown className="h-5 w-5 text-gray-400" />
                                                )}
                                            </div>
                                        </div>

                                        {/* Expanded details */}
                                        {isExpanded && (
                                            <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700 mt-1">
                                                <div className="pt-3">
                                                    {mansione.descrizione && (
                                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                                            {mansione.descrizione}
                                                        </p>
                                                    )}

                                                    {/* Dipendenti con azioni */}
                                                    {mansione.dipendenti && mansione.dipendenti.length > 0 && (
                                                        <div className="mb-3">
                                                            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                                                                Dipendenti assegnati ({mansione.dipendenti.length})
                                                            </h4>
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {mansione.dipendenti.map(dip => (
                                                                    <div
                                                                        key={dip.id}
                                                                        className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700"
                                                                    >
                                                                        <Link
                                                                            to={`/employees/${dip.id}`}
                                                                            className="inline-flex items-center text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100 transition-colors"
                                                                            onClick={e => e.stopPropagation()}
                                                                        >
                                                                            <Users className="h-3 w-3 mr-1 flex-shrink-0" />
                                                                            {dip.lastName} {dip.firstName}
                                                                        </Link>
                                                                        {/* Cambia mansione */}
                                                                        <button
                                                                            title="Cambia mansione"
                                                                            onClick={e => handleChangeMansione(e, dip, mansione)}
                                                                            className="ml-0.5 text-blue-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                                                                        >
                                                                            <ArrowRightLeft className="h-3 w-3" />
                                                                        </button>
                                                                        {/* Rimuovi assegnazione */}
                                                                        <button
                                                                            title="Rimuovi assegnazione"
                                                                            onClick={e => handleRemoveDipendente(e, dip.assignmentId)}
                                                                            disabled={removeAssignmentMutation.isPending}
                                                                            className="ml-0.5 text-blue-300 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                                                                        >
                                                                            <X className="h-3 w-3" />
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Rischi */}
                                                    {mansione.rischi && mansione.rischi.length > 0 && (
                                                        <div>
                                                            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                                                                Rischi Associati ({mansione.rischi.length})
                                                            </h4>
                                                            <div className="flex flex-wrap gap-2">
                                                                {mansione.rischi.map(rischio => (
                                                                    <Link
                                                                        key={rischio.id}
                                                                        to={`/poliambulatorio/mdl/mansioni/${mansione.id}`}
                                                                        className="inline-flex items-center px-2 py-1 rounded text-xs bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100 transition-colors"
                                                                        onClick={e => e.stopPropagation()}
                                                                    >
                                                                        <AlertTriangle className="h-3 w-3 mr-1" />
                                                                        {rischio.nome}
                                                                    </Link>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Link dettaglio */}
                                                    <div className="mt-4 flex justify-end">
                                                        <Link
                                                            to={`/poliambulatorio/mdl/mansioni/${mansione.id}`}
                                                            className="text-sm text-blue-600 hover:text-blue-800 inline-flex items-center"
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
            </div>

            {/* Modal assegna */}
            <QuickActionMansioneModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={handleModalSuccess}
                companyId={companyId}
                companyName={companyName}
            />

            {/* Modal cambia mansione */}
            {changeState && (
                <div
                    className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                    onClick={() => setChangeState(null)}
                >
                    <div
                        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-50 flex items-center gap-2">
                                <ArrowRightLeft className="h-4 w-4 text-amber-600" />
                                Cambia Mansione
                            </h3>
                            <button
                                onClick={() => setChangeState(null)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
                            <span className="font-medium">{changeState.personName}</span>
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                            Mansione attuale: <span className="font-medium text-gray-700 dark:text-gray-200">{changeState.currentMansioneNome}</span>
                        </p>

                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                            Nuova Mansione
                        </label>
                        <select
                            value={changeState.newMansioneId}
                            onChange={e => setChangeState(prev => prev ? { ...prev, newMansioneId: e.target.value } : null)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        >
                            <option value="">Seleziona nuova mansione...</option>
                            {allMansioni
                                .filter(m => m.id !== changeState.currentMansioneId)
                                .map(m => (
                                    <option key={m.id} value={m.id}>
                                        {m.denominazione}{m.settore ? ` (${m.settore})` : ''}
                                    </option>
                                ))
                            }
                        </select>

                        <div className="flex gap-3 mt-5">
                            <button
                                onClick={() => setChangeState(null)}
                                className="flex-1 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                            >
                                Annulla
                            </button>
                            <button
                                disabled={!changeState.newMansioneId || changeAssignmentMutation.isPending}
                                onClick={() => {
                                    if (!changeState.newMansioneId) return;
                                    changeAssignmentMutation.mutate({
                                        assignmentId: changeState.assignmentId,
                                        newMansioneId: changeState.newMansioneId,
                                        personId: changeState.personId
                                    });
                                }}
                                className="flex-1 px-4 py-2 text-sm text-white bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300 dark:disabled:bg-amber-800 rounded-lg transition-colors inline-flex items-center justify-center gap-2"
                            >
                                {changeAssignmentMutation.isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Check className="h-4 w-4" />
                                )}
                                Conferma
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default CompanyMansioniSection;
