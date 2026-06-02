/**
 * QuickActionMansioneModal - Modal per assegnare mansioni da CompanyDetails
 * 
 * Modal per assegnare rapidamente mansioni esistenti ai dipendenti dell'azienda,
 * con visualizzazione dei rischi associati.
 * 
 * @module components/companies/quick-actions/QuickActionMansioneModal
 * @project P58 - Company Details Enhancement
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Loader2,
    Briefcase,
    User,
    AlertTriangle,
    Shield,
    Search,
    Check,
    Info,
    Plus,
    X
} from 'lucide-react';
import { useToast } from '../../../hooks/useToast';
import Modal from '../../../design-system/molecules/Modal/Modal';
import { apiGet, apiPost } from '../../../services/api';
import { cn } from '../../../design-system/utils';
import { useTenantMode } from '../../../contexts/TenantModeContext';

interface QuickActionMansioneModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    companyId: string;
    companyName: string;
    /** Multi-tenant operation headers (X-Operate-Tenant-Id) */
    operateHeaders?: Record<string, string>;
}

interface MansioneOption {
    id: string;
    nome: string;
    denominazione?: string; // alias da backend Prisma model
    descrizione?: string;
    categoria?: string;
    livelloRischio: 'BASSO' | 'MEDIO' | 'ALTO' | 'MOLTO_ALTO';
    rischi?: Array<{
        id: string;
        nome: string;
        categoria?: string;
    }>;
    protocolliSanitari?: Array<{
        id: string;
        nome: string;
    }>;
}

interface EmployeeOption {
    id: string;
    firstName: string;
    lastName: string;
    taxCode?: string;
    mansioni?: Array<{ id: string; mansioneId?: string; nome: string }>;
}

const RISK_LEVELS = {
    BASSO: { label: 'Basso', color: 'green', bgColor: 'bg-green-100 dark:bg-green-900/40', textColor: 'text-green-700 dark:text-green-300' },
    MEDIO: { label: 'Medio', color: 'yellow', bgColor: 'bg-yellow-100 dark:bg-yellow-900/40', textColor: 'text-yellow-700 dark:text-yellow-300' },
    ALTO: { label: 'Alto', color: 'orange', bgColor: 'bg-orange-100 dark:bg-orange-900/40', textColor: 'text-orange-700 dark:text-orange-300' },
    MOLTO_ALTO: { label: 'Molto Alto', color: 'red', bgColor: 'bg-red-100 dark:bg-red-900/40', textColor: 'text-red-700 dark:text-red-300' }
};

export const QuickActionMansioneModal: React.FC<QuickActionMansioneModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    companyId,
    companyName,
    operateHeaders
}) => {
    const { showToast } = useToast();
    const { getOperateHeaders } = useTenantMode();
    const effectiveHeaders = operateHeaders || getOperateHeaders();
    const queryClient = useQueryClient();

    // Form state
    const [selectedMansioneId, setSelectedMansioneId] = useState('');
    const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Create new mansione state
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newCodice, setNewCodice] = useState('');
    const [newDenominazione, setNewDenominazione] = useState('');
    const [newDescrizione, setNewDescrizione] = useState('');
    const [createErrors, setCreateErrors] = useState<Record<string, string>>({});

    // Reset form quando si apre
    useEffect(() => {
        if (isOpen) {
            setSelectedMansioneId('');
            setSelectedEmployeeIds([]);
            setSearchTerm('');
            setEmployeeSearchTerm('');
            setErrors({});
            setShowCreateForm(false);
            setNewCodice('');
            setNewDenominazione('');
            setNewDescrizione('');
            setCreateErrors({});
        }
    }, [isOpen]);

    // Normalizza risposta backend (denominazione → nome, calcola livelloRischio dai rischi)
    const normalizeMansione = (m: any): MansioneOption => {
        const rischiAssociati: Array<{ livello?: string }> = m.rischiAssociati || [];
        const livelloMap: Record<string, number> = { BASSO: 1, MEDIO: 2, ALTO: 3, MOLTO_ALTO: 4 };
        const maxLivello = rischiAssociati.reduce((max, r) => {
            const v = livelloMap[r.livello || ''] || 0;
            return v > max ? v : max;
        }, 0);
        const livelloRischio = (Object.keys(livelloMap).find(k => livelloMap[k] === (maxLivello || 1)) as MansioneOption['livelloRischio']) || 'BASSO';
        return {
            id: m.id,
            nome: m.denominazione || m.nome || m.codice || 'Mansione',
            denominazione: m.denominazione,
            descrizione: m.descrizione,
            categoria: m.settore || m.areaLavoro || m.categoria,
            livelloRischio,
            rischi: rischiAssociati.map((r: any) => ({ id: r.id, nome: r.codiceRischio || r.nome || r.categoria || '', categoria: r.categoria })),
            protocolliSanitari: (m.protocolli || []).map((p: any) => ({ id: p.id, nome: p.nome || '' }))
        };
    };

    // Fetch mansioni disponibili
    const { data: mansioniData, isLoading: isLoadingMansioni } = useQuery({
        queryKey: ['mansioni-quick-action', searchTerm],
        queryFn: async () => {
            const response = await apiGet<{ data: any[] }>('/api/v1/clinica/mansioni', {
                search: searchTerm,
                limit: 50
            });
            return (response.data || []).map(normalizeMansione);
        },
        staleTime: 60 * 1000,
        enabled: isOpen
    });

    // Fetch dipendenti dell'azienda
    const { data: employeesData, isLoading: isLoadingEmployees } = useQuery({
        queryKey: ['company-employees-mansioni', companyId],
        queryFn: async () => {
            const response = await apiGet<{ data: EmployeeOption[] }>('/api/v1/persons', {
                companyId,
                limit: 200
            });
            return response.data || [];
        },
        staleTime: 60 * 1000,
        enabled: isOpen && !!companyId
    });

    const { data: assignedMansioniData } = useQuery({
        queryKey: ['company-assigned-mansioni-map', companyId],
        queryFn: async () => {
            const response = await apiGet<{ mansioni?: any[]; data?: any[] }>(`/api/v1/companies/${companyId}/mansioni`);
            const source = response.mansioni || response.data || [];
            const byPerson: Record<string, Array<{ id: string; mansioneId?: string; nome: string }>> = {};

            source.forEach((mansione: any) => {
                const mansioneId = mansione.id || mansione.mansioneId;
                const nome = mansione.denominazione || mansione.nome || mansione.codice || 'Mansione';
                const dipendenti = mansione.dipendenti || mansione.lavoratori || mansione.employeeAssignments || [];

                dipendenti.forEach((assignment: any) => {
                    const personId = assignment.personId || assignment.person?.id || assignment.employee?.id || assignment.id;
                    if (!personId) return;
                    if (!byPerson[personId]) byPerson[personId] = [];
                    if (!byPerson[personId].some(item => (item.mansioneId || item.id) === mansioneId)) {
                        byPerson[personId].push({ id: mansioneId, mansioneId, nome });
                    }
                });
            });

            return byPerson;
        },
        staleTime: 60 * 1000,
        enabled: isOpen && !!companyId
    });

    const mansioni = mansioniData || [];
    const employees = employeesData || [];
    const assignedMansioniByPerson = assignedMansioniData || {};

    const selectedMansione = useMemo(() =>
        mansioni.find(m => m.id === selectedMansioneId),
        [mansioni, selectedMansioneId]
    );

    const filteredEmployees = useMemo(() => {
        if (!employeeSearchTerm) return employees;
        const term = employeeSearchTerm.toLowerCase();
        return employees.filter(e =>
            e.firstName?.toLowerCase().includes(term) ||
            e.lastName?.toLowerCase().includes(term) ||
            e.taxCode?.toLowerCase().includes(term)
        );
    }, [employees, employeeSearchTerm]);

    // Mutation per creare nuova mansione
    const createMutation = useMutation({
        mutationFn: async (data: { codice: string; denominazione: string; descrizione?: string }) => {
            return apiPost<any>('/api/v1/clinica/mansioni', data, { headers: effectiveHeaders });
        },
        onSuccess: (newMansione: any) => {
            showToast({ type: 'success', message: `Mansione "${newMansione.denominazione || newMansione.nome}" creata` });
            queryClient.invalidateQueries({ queryKey: ['mansioni-quick-action'] });
            setSelectedMansioneId(newMansione.id);
            setShowCreateForm(false);
            setNewCodice('');
            setNewDenominazione('');
            setNewDescrizione('');
        },
        onError: (error: Error) => {
            showToast({ type: 'error', message: 'Errore nella creazione' });
        }
    });

    const handleCreateMansione = () => {
        const errs: Record<string, string> = {};
        if (!newCodice.trim()) errs.codice = 'Codice obbligatorio';
        if (!newDenominazione.trim()) errs.denominazione = 'Denominazione obbligatoria';
        if (Object.keys(errs).length) { setCreateErrors(errs); return; }
        setCreateErrors({});
        createMutation.mutate({ codice: newCodice.trim(), denominazione: newDenominazione.trim(), descrizione: newDescrizione.trim() || undefined });
    };

    // Mutation per assegnare mansione - usa POST /api/v1/clinica/mansioni/:id/bulk-assign
    const assignMutation = useMutation({
        mutationFn: async () => {
            // Assegna la mansione a tutti i dipendenti selezionati in un'unica chiamata
            return apiPost(`/api/v1/clinica/mansioni/${selectedMansioneId}/bulk-assign`, {
                personIds: selectedEmployeeIds,
                dataInizio: new Date().toISOString().split('T')[0]
            }, { headers: effectiveHeaders });
        },
        onSuccess: (results: any) => {
            const assigned = results?.assigned?.length ?? selectedEmployeeIds.length;
            const skipped = results?.skipped?.length ?? 0;
            const errors = results?.errors?.length ?? 0;

            if (errors > 0) {
                showToast({
                    type: 'warning',
                    message: `Assegnati ${assigned}, già presenti ${skipped}, errori ${errors}`
                });
            } else {
                showToast({
                    type: 'success',
                    message: skipped > 0
                        ? `Mansione assegnata a ${assigned} dipendenti (${skipped} già assegnati ignorati)`
                        : `Mansione assegnata a ${assigned} dipendenti`
                });
            }
            onSuccess();
            onClose();
        },
        onError: (error: Error) => {
            showToast({ type: 'error', message: 'Errore durante l\'assegnazione' });
        }
    });

    const validateForm = useCallback(() => {
        const newErrors: Record<string, string> = {};

        if (!selectedMansioneId) {
            newErrors.mansione = 'Seleziona una mansione';
        }
        if (selectedEmployeeIds.length === 0) {
            newErrors.employees = 'Seleziona almeno un dipendente';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [selectedMansioneId, selectedEmployeeIds]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validateForm()) {
            assignMutation.mutate();
        }
    };

    const toggleEmployee = (employeeId: string) => {
        setSelectedEmployeeIds(prev =>
            prev.includes(employeeId)
                ? prev.filter(id => id !== employeeId)
                : [...prev, employeeId]
        );
        if (errors.employees) {
            setErrors(prev => ({ ...prev, employees: '' }));
        }
    };

    const selectAllEmployees = () => {
        setSelectedEmployeeIds(filteredEmployees.map(e => e.id));
        if (errors.employees) {
            setErrors(prev => ({ ...prev, employees: '' }));
        }
    };

    const deselectAllEmployees = () => {
        setSelectedEmployeeIds([]);
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Assegna Mansione"
            size="xl"
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Info azienda */}
                <div className="p-4 rounded-lg bg-violet-50 dark:bg-violet-900/30 border border-violet-200 dark:border-violet-700">
                    <div className="flex items-center">
                        <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-800 text-violet-600 dark:text-violet-300">
                            <Briefcase className="h-5 w-5" />
                        </div>
                        <div className="ml-3">
                            <p className="text-sm font-semibold text-violet-800 dark:text-violet-200">
                                {companyName}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Assegnazione mansioni e rischi - Art. 28 D.Lgs 81/08
                            </p>
                        </div>
                    </div>
                </div>

                {/* Selezione mansione */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Mansione *
                        </label>
                        <button
                            type="button"
                            onClick={() => setShowCreateForm(prev => !prev)}
                            className="inline-flex items-center text-xs text-teal-700 dark:text-teal-400 hover:text-teal-900 font-medium"
                        >
                            {showCreateForm ? (
                                <><X className="h-3.5 w-3.5 mr-1" />Annulla creazione</>
                            ) : (
                                <><Plus className="h-3.5 w-3.5 mr-1" />Crea nuova</>
                            )}
                        </button>
                    </div>

                    {/* Form creazione nuova mansione */}
                    {showCreateForm && (
                        <div className="mb-3 p-4 bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-700 rounded-lg space-y-3">
                            <p className="text-xs font-semibold text-teal-700 dark:text-teal-300 uppercase tracking-wide">Nuova Mansione</p>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <input
                                        type="text"
                                        placeholder="Codice *"
                                        value={newCodice}
                                        onChange={e => { setNewCodice(e.target.value); if (createErrors.codice) setCreateErrors(p => ({ ...p, codice: '' })); }}
                                        className={`w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-700 dark:text-gray-100 ${createErrors.codice ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'} focus:ring-2 focus:ring-teal-500`}
                                    />
                                    {createErrors.codice && <p className="mt-1 text-xs text-red-600">{createErrors.codice}</p>}
                                </div>
                                <div>
                                    <input
                                        type="text"
                                        placeholder="Denominazione *"
                                        value={newDenominazione}
                                        onChange={e => { setNewDenominazione(e.target.value); if (createErrors.denominazione) setCreateErrors(p => ({ ...p, denominazione: '' })); }}
                                        className={`w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-700 dark:text-gray-100 ${createErrors.denominazione ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'} focus:ring-2 focus:ring-teal-500`}
                                    />
                                    {createErrors.denominazione && <p className="mt-1 text-xs text-red-600">{createErrors.denominazione}</p>}
                                </div>
                            </div>
                            <textarea
                                rows={2}
                                placeholder="Descrizione (opzionale)"
                                value={newDescrizione}
                                onChange={e => setNewDescrizione(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-gray-100 focus:ring-2 focus:ring-teal-500 resize-none"
                            />
                            <div className="flex justify-end">
                                <button
                                    type="button"
                                    onClick={handleCreateMansione}
                                    disabled={createMutation.isPending}
                                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50"
                                >
                                    {createMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                                    Crea Mansione
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="relative mb-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                        <input
                            type="text"
                            placeholder="Cerca mansione..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
                        />
                        {isLoadingMansioni && (
                            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400 dark:text-gray-500" />
                        )}
                    </div>

                    <div className={cn(
                        "max-h-56 overflow-y-auto border rounded-lg divide-y divide-gray-100 dark:divide-gray-700",
                        errors.mansione ? "border-red-300 dark:border-red-700" : "border-gray-200 dark:border-gray-700"
                    )}>
                        {mansioni.length === 0 ? (
                            <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                                {isLoadingMansioni ? 'Caricamento...' : 'Nessuna mansione trovata'}
                            </div>
                        ) : (
                            mansioni.map((mansione) => {
                                const riskLevel = RISK_LEVELS[mansione.livelloRischio] || RISK_LEVELS.BASSO;
                                return (
                                    <div
                                        key={mansione.id}
                                        onClick={() => {
                                            setSelectedMansioneId(mansione.id);
                                            if (errors.mansione) {
                                                setErrors(prev => ({ ...prev, mansione: '' }));
                                            }
                                        }}
                                        className={cn(
                                            "p-3 cursor-pointer transition-colors",
                                            selectedMansioneId === mansione.id
                                                ? "bg-blue-50 dark:bg-blue-900/30 border-l-4 border-l-blue-500"
                                                : "hover:bg-gray-50 dark:hover:bg-gray-700"
                                        )}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                    {mansione.nome}
                                                </p>
                                                {mansione.categoria && (
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">{mansione.categoria}</p>
                                                )}
                                            </div>
                                            <span className={cn(
                                                "px-2 py-0.5 rounded-full text-xs font-medium",
                                                riskLevel.bgColor,
                                                riskLevel.textColor
                                            )}>
                                                {riskLevel.label}
                                            </span>
                                        </div>
                                        {mansione.rischi && mansione.rischi.length > 0 && (
                                            <div className="mt-2 flex flex-wrap gap-1">
                                                {mansione.rischi.slice(0, 3).map(r => (
                                                    <span key={r.id} className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                                        <AlertTriangle className="h-3 w-3 mr-1" />
                                                        {r.nome}
                                                    </span>
                                                ))}
                                                {mansione.rischi.length > 3 && (
                                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                                        +{mansione.rischi.length - 3} altri
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                    {errors.mansione && (
                        <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.mansione}</p>
                    )}
                </div>

                {/* Dettaglio mansione selezionata */}
                {selectedMansione && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg">
                        <div className="flex items-start">
                            <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                            <div className="ml-3">
                                <p className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                                    {selectedMansione.nome}
                                </p>
                                {selectedMansione.descrizione && (
                                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{selectedMansione.descrizione}</p>
                                )}
                                {selectedMansione.rischi && selectedMansione.rischi.length > 0 && (
                                    <div className="mt-2">
                                        <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Rischi associati:</p>
                                        <div className="flex flex-wrap gap-1">
                                            {selectedMansione.rischi.map(r => (
                                                <span key={r.id} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300">
                                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                                    {r.nome}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {selectedMansione.protocolliSanitari && selectedMansione.protocolliSanitari.length > 0 && (
                                    <div className="mt-2">
                                        <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Protocolli sanitari:</p>
                                        <div className="flex flex-wrap gap-1">
                                            {selectedMansione.protocolliSanitari.map(p => (
                                                <span key={p.id} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300">
                                                    {p.nome}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Selezione dipendenti */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            <User className="inline h-4 w-4 mr-1" />
                            Dipendenti * ({selectedEmployeeIds.length} selezionati)
                        </label>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={selectAllEmployees}
                                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                            >
                                Seleziona tutti
                            </button>
                            <button
                                type="button"
                                onClick={deselectAllEmployees}
                                className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300"
                            >
                                Deseleziona
                            </button>
                        </div>
                    </div>

                    <div className="relative mb-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                        <input
                            type="text"
                            placeholder="Cerca dipendente..."
                            value={employeeSearchTerm}
                            onChange={(e) => setEmployeeSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
                        />
                    </div>

                    <div className={cn(
                        "max-h-72 overflow-y-auto border rounded-lg",
                        errors.employees ? "border-red-300 dark:border-red-700" : "border-gray-200 dark:border-gray-700"
                    )}>
                        {isLoadingEmployees ? (
                            <div className="p-4 flex justify-center">
                                <Loader2 className="h-5 w-5 animate-spin text-gray-400 dark:text-gray-500" />
                            </div>
                        ) : filteredEmployees.length === 0 ? (
                            <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                                Nessun dipendente trovato
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                {filteredEmployees.map((employee) => {
                                    const isSelected = selectedEmployeeIds.includes(employee.id);
                                    const employeeMansioni = assignedMansioniByPerson[employee.id] || employee.mansioni || [];
                                    const hasMansione = employeeMansioni.some(m => (m.mansioneId || m.id) === selectedMansioneId);
                                    const assignedMansioni = employeeMansioni
                                        .map(m => m.nome)
                                        .filter(Boolean);
                                    return (
                                        <div
                                            key={employee.id}
                                            onClick={() => !hasMansione && toggleEmployee(employee.id)}
                                            className={cn(
                                                "flex items-center p-3 transition-colors",
                                                hasMansione
                                                    ? "bg-gray-50 dark:bg-gray-800 cursor-not-allowed opacity-50"
                                                    : isSelected
                                                        ? "bg-blue-50 dark:bg-blue-900/30 cursor-pointer"
                                                        : "hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                                            )}
                                        >
                                            <div className={cn(
                                                "w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0",
                                                hasMansione
                                                    ? "border-gray-300 dark:border-gray-600 bg-gray-200 dark:bg-gray-700"
                                                    : isSelected
                                                        ? "border-blue-500 bg-blue-500"
                                                        : "border-gray-300 dark:border-gray-600"
                                            )}>
                                                {(isSelected || hasMansione) && (
                                                    <Check className="h-3 w-3 text-white" />
                                                )}
                                            </div>
                                            <div className="ml-3 min-w-0 flex-1">
                                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                    {employee.lastName} {employee.firstName}
                                                </p>
                                                {employee.taxCode && (
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                                                        {employee.taxCode}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="ml-3 flex max-w-[48%] flex-wrap justify-end gap-1">
                                                {assignedMansioni.slice(0, 3).map((mansione) => (
                                                    <span
                                                        key={mansione}
                                                        className="max-w-[150px] truncate rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                                                        title={mansione}
                                                    >
                                                        {mansione}
                                                    </span>
                                                ))}
                                                {assignedMansioni.length > 3 && (
                                                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                                                        +{assignedMansioni.length - 3}
                                                    </span>
                                                )}
                                                {hasMansione && (
                                                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                                                        Gia assegnata
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                    {errors.employees && (
                        <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.employees}</p>
                    )}
                </div>

                {/* Info normativa */}
                <div className="flex items-start p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                    <Info className="h-4 w-4 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
                    <p className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                        L'assegnazione della mansione determina automaticamente i rischi e il protocollo
                        sanitario da applicare per la sorveglianza sanitaria (Art. 41 D.Lgs 81/08).
                    </p>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
                        disabled={assignMutation.isPending}
                    >
                        Annulla
                    </button>
                    <button
                        type="submit"
                        disabled={assignMutation.isPending}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                        {assignMutation.isPending ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Assegnazione...
                            </>
                        ) : (
                            <>
                                <Briefcase className="h-4 w-4 mr-2" />
                                Assegna Mansione
                            </>
                        )}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default QuickActionMansioneModal;
