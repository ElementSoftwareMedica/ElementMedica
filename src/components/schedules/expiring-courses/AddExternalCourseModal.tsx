/**
 * AddExternalCourseModal Component
 * 
 * Modal for adding a single external course manually.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    User,
    Building2,
    ExternalLink,
    X
} from 'lucide-react';
import { Button } from '../../../design-system/atoms/Button';
import { apiGet, apiPost } from '../../../services/api';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import type { Company, CourseOption, PersonOption, ImportResults } from './types';

interface AddExternalCourseModalProps {
    companies: Company[];
    onClose: () => void;
    onAdded: () => void;
}

export const AddExternalCourseModal: React.FC<AddExternalCourseModalProps> = ({ companies, onClose, onAdded }) => {
    const [loading, setLoading] = useState(false);
    const [courses, setCourses] = useState<CourseOption[]>([]);
    const [persons, setPersons] = useState<PersonOption[]>([]);

    // Search state
    const [personSearch, setPersonSearch] = useState<string>('');
    const [showPersonDropdown, setShowPersonDropdown] = useState(false);
    const personSearchRef = useRef<HTMLDivElement>(null);

    // Form state
    const [selectedPerson, setSelectedPerson] = useState<PersonOption | null>(null);
    const [selectedCourseId, setSelectedCourseId] = useState<string>('');
    const [completedDate, setCompletedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState<string>('');

    // Result state
    const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (personSearchRef.current && !personSearchRef.current.contains(event.target as Node)) {
                setShowPersonDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Load courses on mount
    useEffect(() => {
        const fetchCourses = async () => {
            try {
                const response = await apiGet<CourseOption[]>('/api/v1/courses');
                setCourses(Array.isArray(response) ? response : []);
            } catch (err) {
                console.error('Error fetching courses:', err);
            }
        };
        fetchCourses();
    }, []);

    // Load persons on mount
    useEffect(() => {
        const fetchPersons = async () => {
            try {
                const response = await apiGet<{ persons?: PersonOption[] } | PersonOption[]>('/api/v1/persons?limit=1000&include=company');
                const personsList = Array.isArray(response) ? response : (response?.persons || []);
                // Enrich with company info
                const enrichedPersons = personsList.map(p => ({
                    ...p,
                    company: p.company || companies.find(c => c.id === p.companyId) ?
                        { id: p.companyId!, ragioneSociale: companies.find(c => c.id === p.companyId)?.ragioneSociale || 'N/D' } :
                        undefined
                }));
                setPersons(enrichedPersons);
            } catch (err) {
                console.error('Error fetching persons:', err);
            }
        };
        fetchPersons();
    }, [companies]);

    // Filter persons by search term
    const filteredPersons = useMemo(() => {
        if (!personSearch || personSearch.length < 2) return [];

        const searchLower = personSearch.toLowerCase();
        return persons.filter(p =>
            `${p.firstName} ${p.lastName}`.toLowerCase().includes(searchLower) ||
            p.taxCode?.toLowerCase().includes(searchLower) ||
            p.company?.ragioneSociale?.toLowerCase().includes(searchLower)
        ).slice(0, 10); // Limit to 10 results
    }, [persons, personSearch]);

    // Get selected course details
    const selectedCourse = courses.find(c => c.id === selectedCourseId);

    const handlePersonSelect = (person: PersonOption) => {
        setSelectedPerson(person);
        setPersonSearch(`${person.firstName} ${person.lastName}`);
        setShowPersonDropdown(false);
    };

    const handleSubmit = async () => {
        if (!selectedPerson || !selectedCourseId || !completedDate) {
            setResult({ success: false, message: 'Compila tutti i campi obbligatori' });
            return;
        }

        setLoading(true);
        setResult(null);

        try {
            // Use apiPost for authenticated request
            const response = await apiPost<{ results: ImportResults }>(
                '/api/v1/schedules/import-expiring-courses',
                {
                    records: [{
                        taxCode: selectedPerson.taxCode,
                        courseName: selectedCourse?.title,
                        riskLevel: selectedCourse?.riskLevel,
                        courseType: selectedCourse?.courseType,
                        completedDate,
                        notes
                    }]
                }
            );

            if (response.results?.imported?.length > 0) {
                setResult({ success: true, message: 'Corso esterno aggiunto con successo!' });
                setTimeout(onAdded, 1500);
            } else if (response.results?.skipped?.length > 0) {
                setResult({ success: false, message: 'Questo corso è già stato registrato per questo dipendente' });
            } else if (response.results?.errors?.length > 0) {
                setResult({ success: false, message: response.results.errors[0].error || 'Errore durante il salvataggio' });
            } else {
                setResult({ success: false, message: 'Errore sconosciuto' });
            }
        } catch (err) {
            console.error('Error adding external course:', err);
            setResult({ success: false, message: 'Errore durante il salvataggio' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div className="p-4 border-b border-gray-200 sticky top-0 bg-white">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-purple-100 rounded-lg">
                            <ExternalLink className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold">Aggiungi Corso Esterno</h3>
                            <p className="text-sm text-gray-500">Registra un corso completato presso ente esterno</p>
                        </div>
                    </div>
                </div>

                <div className="p-4 space-y-4">
                    {/* Person Search with Autocomplete */}
                    <div ref={personSearchRef} className="relative">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Cerca Dipendente *
                        </label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Cerca per nome, cognome o codice fiscale..."
                                value={personSearch}
                                onChange={(e) => {
                                    setPersonSearch(e.target.value);
                                    setShowPersonDropdown(true);
                                    if (selectedPerson && e.target.value !== `${selectedPerson.firstName} ${selectedPerson.lastName}`) {
                                        setSelectedPerson(null);
                                    }
                                }}
                                onFocus={() => setShowPersonDropdown(true)}
                                className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                            />
                        </div>

                        {/* Autocomplete dropdown */}
                        {showPersonDropdown && personSearch.length >= 2 && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                                {filteredPersons.length > 0 ? (
                                    filteredPersons.map(person => (
                                        <button
                                            key={person.id}
                                            onClick={() => handlePersonSelect(person)}
                                            className="w-full px-3 py-2.5 text-left hover:bg-purple-50 border-b border-gray-100 last:border-0 transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                                                    <User className="h-5 w-5 text-purple-600" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium text-gray-900">
                                                        {person.firstName} {person.lastName}
                                                    </div>
                                                    <div className="text-xs text-gray-500 flex items-center gap-2">
                                                        <span className="font-mono">{person.taxCode || 'N/D'}</span>
                                                        {person.company && (
                                                            <>
                                                                <span>•</span>
                                                                <span className="flex items-center gap-1">
                                                                    <Building2 className="h-3 w-3" />
                                                                    {person.company.ragioneSociale}
                                                                </span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </button>
                                    ))
                                ) : (
                                    <div className="px-3 py-4 text-sm text-gray-500 text-center">
                                        Nessun dipendente trovato
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Selected person info card */}
                        {selectedPerson && (
                            <div className="mt-2 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className="flex-shrink-0 w-12 h-12 bg-purple-200 rounded-full flex items-center justify-center">
                                        <User className="h-6 w-6 text-purple-700" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-semibold text-purple-900">
                                            {selectedPerson.firstName} {selectedPerson.lastName}
                                        </div>
                                        <div className="text-sm text-purple-700 font-mono">
                                            CF: {selectedPerson.taxCode || 'Non specificato'}
                                        </div>
                                        {selectedPerson.company && (
                                            <div className="text-sm text-purple-600 flex items-center gap-1 mt-0.5">
                                                <Building2 className="h-3.5 w-3.5" />
                                                {selectedPerson.company.ragioneSociale}
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => {
                                            setSelectedPerson(null);
                                            setPersonSearch('');
                                        }}
                                        className="text-purple-500 hover:text-purple-700 p-1"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Course Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Corso Completato *
                        </label>
                        <select
                            value={selectedCourseId}
                            onChange={(e) => setSelectedCourseId(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500"
                        >
                            <option value="">Seleziona corso...</option>
                            {courses.map(c => (
                                <option key={c.id} value={c.id}>
                                    {c.title} {c.riskLevel ? `(${c.riskLevel})` : ''} - {c.validityYears} anni
                                </option>
                            ))}
                        </select>
                        {selectedCourse && completedDate && (() => {
                            try {
                                const dateObj = new Date(completedDate);
                                if (isNaN(dateObj.getTime())) return null;
                                const expirationDate = new Date(
                                    dateObj.getFullYear() + selectedCourse.validityYears,
                                    dateObj.getMonth(),
                                    dateObj.getDate()
                                );
                                return (
                                    <p className="text-xs text-gray-500 mt-1">
                                        Validità: {selectedCourse.validityYears} anni •
                                        Scadenza calcolata: {format(expirationDate, 'dd/MM/yyyy', { locale: it })}
                                    </p>
                                );
                            } catch {
                                return null;
                            }
                        })()}
                    </div>

                    {/* Completion Date */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Data Completamento *
                        </label>
                        <input
                            type="date"
                            value={completedDate}
                            onChange={(e) => setCompletedDate(e.target.value)}
                            max={new Date().toISOString().split('T')[0]}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500"
                        />
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Note (opzionale)
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Es: Ente erogatore, numero attestato..."
                            rows={2}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500"
                        />
                    </div>

                    {/* Result message */}
                    {result && (
                        <div className={`p-3 rounded-lg ${result.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                            {result.success ? '✓' : '✗'} {result.message}
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-gray-200 flex justify-end gap-2 sticky bottom-0 bg-white">
                    <Button variant="outline" onClick={onClose}>
                        Annulla
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={loading || !selectedPerson || !selectedCourseId || !completedDate}
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                    >
                        {loading ? 'Salvataggio...' : 'Aggiungi Corso Esterno'}
                    </Button>
                </div>
            </div>
        </div>
    );
};
