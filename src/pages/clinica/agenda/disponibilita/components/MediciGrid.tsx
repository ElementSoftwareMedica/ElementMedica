/**
 * MediciGrid - Griglia di card medici
 * @module pages/clinica/agenda/disponibilita/components/MediciGrid
 */

import React, { useState, useMemo } from 'react';
import { Search, Users, Filter, SortAsc, Clock } from 'lucide-react';
import { MedicoCard } from './MedicoCard';
import type { MedicoWithStats } from '../types';

interface MediciGridProps {
    medici: MedicoWithStats[];
    onSelectMedico: (medico: MedicoWithStats) => void;
    selectedMedicoId?: string;
    isLoading?: boolean;
}

type SortOption = 'name' | 'hours' | 'slots';
type FilterOption = 'all' | 'configured' | 'unconfigured' | 'vacation';

export const MediciGrid: React.FC<MediciGridProps> = ({
    medici,
    onSelectMedico,
    selectedMedicoId,
    isLoading
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState<SortOption>('name');
    const [filterBy, setFilterBy] = useState<FilterOption>('all');

    // Filtered and sorted medici
    const filteredMedici = useMemo(() => {
        let result = [...medici];

        // Search filter
        if (searchTerm) {
            const search = searchTerm.toLowerCase();
            result = result.filter(m => {
                const firstName = (m.firstName || m.nome || '').toLowerCase();
                const lastName = (m.lastName || m.cognome || '').toLowerCase();
                const spec = (m.specialties?.join(' ') || m.specializzazione || '').toLowerCase();
                return firstName.includes(search) || lastName.includes(search) || spec.includes(search);
            });
        }

        // Status filter
        switch (filterBy) {
            case 'configured':
                result = result.filter(m => m.slotsCount > 0);
                break;
            case 'unconfigured':
                result = result.filter(m => m.slotsCount === 0);
                break;
            case 'vacation':
                result = result.filter(m => m.hasActiveVacation);
                break;
        }

        // Sort
        switch (sortBy) {
            case 'name':
                result.sort((a, b) => {
                    const nameA = `${a.lastName || a.cognome || ''} ${a.firstName || a.nome || ''}`;
                    const nameB = `${b.lastName || b.cognome || ''} ${b.firstName || b.nome || ''}`;
                    return nameA.localeCompare(nameB);
                });
                break;
            case 'hours':
                result.sort((a, b) => b.weeklyHours - a.weeklyHours);
                break;
            case 'slots':
                result.sort((a, b) => b.slotsCount - a.slotsCount);
                break;
        }

        return result;
    }, [medici, searchTerm, sortBy, filterBy]);

    // Stats
    const stats = useMemo(() => ({
        total: medici.length,
        configured: medici.filter(m => m.slotsCount > 0).length,
        unconfigured: medici.filter(m => m.slotsCount === 0).length,
        onVacation: medici.filter(m => m.hasActiveVacation).length
    }), [medici]);

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                    <div key={i} className="h-48 bg-gray-100 rounded-xl animate-pulse" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Stats Bar */}
            <div className="flex flex-wrap gap-3">
                <button
                    onClick={() => setFilterBy('all')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${filterBy === 'all'
                        ? 'bg-teal-100 text-teal-700 font-medium'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                >
                    <Users className="h-4 w-4" />
                    <span>Tutti</span>
                    <span className="ml-1 px-2 py-0.5 bg-white rounded-full text-xs font-medium">
                        {stats.total}
                    </span>
                </button>
                <button
                    onClick={() => setFilterBy('configured')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${filterBy === 'configured'
                        ? 'bg-green-100 text-green-700 font-medium'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                >
                    <Clock className="h-4 w-4" />
                    <span>Configurati</span>
                    <span className="ml-1 px-2 py-0.5 bg-white rounded-full text-xs font-medium">
                        {stats.configured}
                    </span>
                </button>
                <button
                    onClick={() => setFilterBy('unconfigured')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${filterBy === 'unconfigured'
                        ? 'bg-amber-100 text-amber-700 font-medium'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                >
                    <span>Da configurare</span>
                    <span className="ml-1 px-2 py-0.5 bg-white rounded-full text-xs font-medium">
                        {stats.unconfigured}
                    </span>
                </button>
                {stats.onVacation > 0 && (
                    <button
                        onClick={() => setFilterBy('vacation')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${filterBy === 'vacation'
                            ? 'bg-amber-100 text-amber-700 font-medium'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        <span>In ferie</span>
                        <span className="ml-1 px-2 py-0.5 bg-amber-200 rounded-full text-xs font-medium text-amber-800">
                            {stats.onVacation}
                        </span>
                    </button>
                )}
            </div>

            {/* Search and Sort */}
            <div className="flex flex-col sm:flex-row gap-4">
                {/* Search */}
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Cerca medico..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                </div>

                {/* Sort */}
                <div className="flex items-center gap-2">
                    <SortAsc className="h-5 w-5 text-gray-400" />
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as SortOption)}
                        className="px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500"
                    >
                        <option value="name">Ordina per nome</option>
                        <option value="hours">Ordina per ore</option>
                        <option value="slots">Ordina per fasce</option>
                    </select>
                </div>
            </div>

            {/* Grid */}
            {filteredMedici.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredMedici.map(medico => (
                        <MedicoCard
                            key={medico.id}
                            medico={medico}
                            onClick={() => onSelectMedico(medico)}
                            isSelected={selectedMedicoId === medico.id}
                        />
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 bg-gray-50 rounded-xl">
                    <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">
                        {searchTerm
                            ? 'Nessun medico trovato per la ricerca'
                            : 'Nessun medico disponibile'}
                    </p>
                </div>
            )}
        </div>
    );
};
