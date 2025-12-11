/**
 * GenerateRegistriModal Component
 * 
 * Modal per la generazione del registro presenze per singola sessione.
 * Mostra:
 * - Selezione della sessione
 * - Elenco partecipanti con selezione
 * - Aziende coinvolte
 * - Preview tabella presenze
 */

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, FileText, Users, Building2, Calendar, CheckCircle2, Loader2 } from 'lucide-react';
import templateService from '../../../services/templateService';
import registriPresenzeService from '../../../services/registriPresenzeService';
import { invalidateCache } from '../../../services/api';
import type { Template } from '../../../types/templates';

interface DateEntry {
    date: string;
    // Supporta entrambi i formati: start/end (da FormData) e startTime/endTime (da ScheduleDetailPage)
    start?: string;
    end?: string;
    startTime?: string;
    endTime?: string;
    trainerId?: string | number;
    sessionId?: string;
    duration?: number;
}

// Helper per normalizzare i campi start/end dei date entries
const getStartTime = (date: DateEntry): string | undefined => date.startTime || date.start;
const getEndTime = (date: DateEntry): string | undefined => date.endTime || date.end;

interface Person {
    id: string | number;
    firstName: string;
    lastName: string;
    company?: {
        id: string | number;
        ragioneSociale?: string;
        name?: string;
    };
    companyId?: string | number;
}

interface Company {
    id: string | number;
    ragioneSociale?: string;
    name?: string;
}

interface Trainer {
    id: string | number;
    firstName: string;
    lastName: string;
}

interface GenerateRegistriModalProps {
    isOpen: boolean;
    onClose: () => void;
    scheduleId: string | number | null | undefined;
    dates: DateEntry[];
    attendance: Record<number, (string | number)[]>;
    persons: Person[];
    companies: Company[];
    trainers: Trainer[];
    onSuccess: () => void;
}

export const GenerateRegistriModal: React.FC<GenerateRegistriModalProps> = ({
    isOpen,
    onClose,
    scheduleId,
    dates,
    attendance,
    persons,
    companies,
    trainers,
    onSuccess
}) => {
    const [selectedSessionIndices, setSelectedSessionIndices] = useState<Set<number>>(new Set([0]));
    const [selectedParticipants, setSelectedParticipants] = useState<Set<string>>(new Set());
    const [templates, setTemplates] = useState<Template[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [loadingTemplates, setLoadingTemplates] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Helper per formattare la data
    const formatDate = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
        } catch {
            return dateStr;
        }
    };

    // Load templates when modal opens
    useEffect(() => {
        if (isOpen) {
            loadTemplates();
            // Reset selection when modal opens
            setError(null);
            if (dates.length > 0) {
                setSelectedSessionIndices(new Set([0]));
            }
        }
    }, [isOpen, dates.length]);

    // Initialize selected participants when session changes
    useEffect(() => {
        // Se abbiamo attendance, usa quello, altrimenti seleziona tutti i persons
        const hasAttendanceData = Object.keys(attendance).length > 0 &&
            Object.values(attendance).some(arr => arr.length > 0);

        if (hasAttendanceData) {
            // Combina attendance da tutte le sessioni selezionate
            const allAttendees = new Set<string>();
            selectedSessionIndices.forEach(idx => {
                const sessionAttendance = attendance[idx] || [];
                sessionAttendance.forEach(id => allAttendees.add(String(id)));
            });
            setSelectedParticipants(allAttendees);
        } else {
            // Se non c'è attendance, seleziona tutti i partecipanti
            setSelectedParticipants(new Set(persons.map(p => String(p.id))));
        }
    }, [selectedSessionIndices, attendance, persons]);

    const loadTemplates = async () => {
        try {
            setLoadingTemplates(true);
            const result = await templateService.list({
                type: 'ATTENDANCE_REGISTER',
                isActive: true
            });
            setTemplates(result.data || []);

            // Auto-select default template
            const defaultTemplate = (result.data || []).find((t: Template) => t.isDefault);
            if (defaultTemplate) {
                setSelectedTemplateId(defaultTemplate.id);
            } else if (result.data?.length > 0) {
                setSelectedTemplateId(result.data[0].id);
            }
        } catch (err) {
            console.error('Failed to load templates:', err);
            setError('Impossibile caricare i template disponibili');
        } finally {
            setLoadingTemplates(false);
        }
    };

    // Get session participants sorted by company then by lastName
    // Se attendance è vuoto, mostra tutti i persons
    const sessionParticipants = useMemo(() => {
        const hasAttendanceData = Object.keys(attendance).length > 0 &&
            Object.values(attendance).some(arr => arr.length > 0);

        // Prendi la prima sessione selezionata per la visualizzazione
        const firstSelectedIndex = Array.from(selectedSessionIndices)[0] ?? 0;
        const sessionAttendance = attendance[firstSelectedIndex] || [];

        let filtered: Person[];
        if (hasAttendanceData && sessionAttendance.length > 0) {
            filtered = persons.filter(p =>
                sessionAttendance.includes(p.id as any) ||
                sessionAttendance.includes(String(p.id) as any)
            );
        } else {
            // Se non c'è attendance, mostra tutti i partecipanti
            filtered = [...persons];
        }

        // Sort by company name first, then by lastName
        return filtered.sort((a, b) => {
            const companyA = (a.company?.ragioneSociale || a.company?.name || '').toLowerCase();
            const companyB = (b.company?.ragioneSociale || b.company?.name || '').toLowerCase();

            // First sort by company
            if (companyA < companyB) return -1;
            if (companyA > companyB) return 1;

            // Then sort by lastName
            const lastNameA = (a.lastName || '').toLowerCase();
            const lastNameB = (b.lastName || '').toLowerCase();
            if (lastNameA < lastNameB) return -1;
            if (lastNameA > lastNameB) return 1;

            // Finally sort by firstName
            const firstNameA = (a.firstName || '').toLowerCase();
            const firstNameB = (b.firstName || '').toLowerCase();
            return firstNameA.localeCompare(firstNameB);
        });
    }, [persons, attendance, selectedSessionIndices]);

    // Get companies involved in session
    const sessionCompanies = useMemo(() => {
        const companyIds = new Set<string>();
        sessionParticipants.forEach(p => {
            const companyId = p.company?.id || p.companyId;
            if (companyId) {
                companyIds.add(String(companyId));
            }
        });

        return companies.filter(c => companyIds.has(String(c.id)));
    }, [sessionParticipants, companies]);

    // Get trainer for session (prima sessione selezionata)
    const sessionTrainer = useMemo(() => {
        const firstSelectedIndex = Array.from(selectedSessionIndices)[0] ?? 0;
        const date = dates[firstSelectedIndex];
        if (!date?.trainerId) return null;
        return trainers.find(t => String(t.id) === String(date.trainerId)) || null;
    }, [dates, selectedSessionIndices, trainers]);

    const handleParticipantToggle = (personId: string) => {
        setSelectedParticipants(prev => {
            const newSet = new Set(prev);
            if (newSet.has(personId)) {
                newSet.delete(personId);
            } else {
                newSet.add(personId);
            }
            return newSet;
        });
    };

    const handleSelectAll = () => {
        const allIds = sessionParticipants.map(p => String(p.id));
        if (selectedParticipants.size === allIds.length) {
            setSelectedParticipants(new Set());
        } else {
            setSelectedParticipants(new Set(allIds));
        }
    };

    const handleGenerate = async () => {
        if (!scheduleId || !selectedTemplateId) {
            setError('Seleziona un template prima di generare');
            return;
        }

        if (selectedParticipants.size === 0) {
            setError('Seleziona almeno un partecipante');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Genera un registro per ogni sessione selezionata
            for (const sessionIndex of Array.from(selectedSessionIndices)) {
                const date = dates[sessionIndex];
                if (!date) continue;

                const sessionId = date.sessionId || `${scheduleId}-session-${date.date}-${sessionIndex}`;

                await registriPresenzeService.generate({
                    sessionId,
                    scheduleId: String(scheduleId),
                    sessionIndex: sessionIndex,
                    sessionDate: date.date,
                    sessionStart: getStartTime(date) || '09:00',
                    sessionEnd: getEndTime(date) || '18:00',
                    formatoreId: String(date.trainerId || trainers[0]?.id || ''),
                    templateId: selectedTemplateId,
                    attendanceData: Array.from(selectedParticipants).map(personId => ({
                        personId,
                        present: true,
                        hours: date.duration || 8
                    }))
                });
            }

            // Invalidate cache and refresh
            invalidateCache('/api/v1/registri-presenze');
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Errore generazione registro:', err);
            setError(err.response?.data?.message || err.message || 'Errore durante la generazione');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const firstSelectedIndex = Array.from(selectedSessionIndices)[0] ?? 0;
    const currentDate = dates[firstSelectedIndex];

    return createPortal(
        <div className="fixed inset-0 z-[1100] flex items-center justify-center">
            {/* Backdrop - higher z-index to cover parent modal */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-purple-50 to-indigo-50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                            <FileText className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Genera Registro Presenze</h2>
                            <p className="text-sm text-gray-500">Seleziona la sessione e i partecipanti</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Session Selector */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                            <Calendar className="w-4 h-4 inline mr-1" />
                            Seleziona Sessione
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                            {dates.map((date, index) => (
                                <button
                                    key={index}
                                    onClick={() => {
                                        setSelectedSessionIndices(prev => {
                                            const newSet = new Set(prev);
                                            if (newSet.has(index)) {
                                                if (newSet.size > 1) newSet.delete(index); // Mantieni almeno una selezione
                                            } else {
                                                newSet.add(index);
                                            }
                                            return newSet;
                                        });
                                    }}
                                    className={`p-3 rounded-lg border text-left transition-all ${selectedSessionIndices.has(index)
                                        ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-200'
                                        : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                                        }`}
                                >
                                    <div className="font-medium text-sm">Sessione {index + 1}</div>
                                    <div className="text-xs text-gray-500">{formatDate(date.date)}</div>
                                    {(getStartTime(date) || getEndTime(date)) && (
                                        <div className="text-xs text-gray-400">
                                            {getStartTime(date) || '--:--'} - {getEndTime(date) || '--:--'}
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Template Selector */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                            <FileText className="w-4 h-4 inline mr-1" />
                            Template
                        </label>
                        <select
                            value={selectedTemplateId}
                            onChange={(e) => setSelectedTemplateId(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                            disabled={loadingTemplates}
                        >
                            <option value="">{loadingTemplates ? 'Caricamento...' : 'Seleziona template'}</option>
                            {templates.map(t => (
                                <option key={t.id} value={t.id}>
                                    {t.name} {t.isDefault ? '(Default)' : ''} - v{t.version}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Session Info */}
                    {currentDate && (
                        <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <div className="text-xs text-gray-500">Data</div>
                                <div className="font-medium">{formatDate(currentDate.date)}</div>
                            </div>
                            <div>
                                <div className="text-xs text-gray-500">Orario</div>
                                <div className="font-medium">
                                    {(getStartTime(currentDate) || getEndTime(currentDate))
                                        ? `${getStartTime(currentDate) || '--:--'} - ${getEndTime(currentDate) || '--:--'}`
                                        : '-'}
                                </div>
                            </div>
                            <div>
                                <div className="text-xs text-gray-500">Durata</div>
                                <div className="font-medium">{currentDate.duration || 8} ore</div>
                            </div>
                            <div>
                                <div className="text-xs text-gray-500">Formatore</div>
                                <div className="font-medium">
                                    {sessionTrainer
                                        ? `${sessionTrainer.firstName} ${sessionTrainer.lastName}`
                                        : '-'}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Companies involved */}
                    {sessionCompanies.length > 0 && (
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                                <Building2 className="w-4 h-4 inline mr-1" />
                                Aziende Partecipanti ({sessionCompanies.length})
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {sessionCompanies.map(company => (
                                    <span
                                        key={company.id}
                                        className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm"
                                    >
                                        {company.ragioneSociale || company.name}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Participants */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="block text-sm font-medium text-gray-700">
                                <Users className="w-4 h-4 inline mr-1" />
                                Partecipanti ({selectedParticipants.size}/{sessionParticipants.length})
                            </label>
                            <button
                                onClick={handleSelectAll}
                                className="text-sm text-purple-600 hover:text-purple-800"
                            >
                                {selectedParticipants.size === sessionParticipants.length ? 'Deseleziona tutti' : 'Seleziona tutti'}
                            </button>
                        </div>

                        {/* Preview table */}
                        <div className="border rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="w-10 p-2"></th>
                                        <th className="p-2 text-left">Cognome</th>
                                        <th className="p-2 text-left">Nome</th>
                                        <th className="p-2 text-left">Azienda</th>
                                        <th className="p-2 text-center">Firma Ingresso</th>
                                        <th className="p-2 text-center">Firma Uscita</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sessionParticipants.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="p-4 text-center text-gray-500">
                                                Nessun partecipante per questa sessione
                                            </td>
                                        </tr>
                                    ) : (
                                        sessionParticipants.map((person, idx) => {
                                            const personId = String(person.id);
                                            const isSelected = selectedParticipants.has(personId);
                                            const company = person.company || companies.find(c => String(c.id) === String(person.companyId));

                                            return (
                                                <tr
                                                    key={personId}
                                                    className={`border-t ${isSelected ? 'bg-purple-50' : 'hover:bg-gray-50'}`}
                                                >
                                                    <td className="p-2 text-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={() => handleParticipantToggle(personId)}
                                                            className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                                                        />
                                                    </td>
                                                    <td className="p-2 font-medium">{person.lastName}</td>
                                                    <td className="p-2">{person.firstName}</td>
                                                    <td className="p-2 text-gray-600">
                                                        {company?.ragioneSociale || company?.name || '-'}
                                                    </td>
                                                    <td className="p-2 text-center text-gray-400 border-l">
                                                        <span className="text-xs">_______________</span>
                                                    </td>
                                                    <td className="p-2 text-center text-gray-400 border-l">
                                                        <span className="text-xs">_______________</span>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                            ❌ {error}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                        Annulla
                    </button>
                    <button
                        onClick={handleGenerate}
                        disabled={loading || !selectedTemplateId || selectedParticipants.size === 0}
                        className="flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Generazione...
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="w-4 h-4" />
                                Genera {selectedSessionIndices.size} Registr{selectedSessionIndices.size === 1 ? 'o' : 'i'}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default GenerateRegistriModal;
