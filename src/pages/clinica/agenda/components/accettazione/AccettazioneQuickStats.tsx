/**
 * AccettazioneQuickStats - Stats cards per accettazione
 * 
 * Mostra statistiche rapide: totale, da accettare, in attesa, in visita, completati.
 * Cards cliccabili per filtrare la lista.
 * 
 * @module pages/clinica/agenda/components/accettazione
 */

import React from 'react';
import {
    Calendar,
    Clock,
    Timer,
    Stethoscope,
    CheckCircle,
    XCircle
} from 'lucide-react';
import { AccettazioneStats, AccettazioneFilters } from './useAccettazioneData';

// ============================================
// TYPES
// ============================================

export interface AccettazioneQuickStatsProps {
    stats: AccettazioneStats;
    isToday?: boolean;
    activeFilter?: AccettazioneFilters['stato'];
    onFilterClick?: (stato: AccettazioneFilters['stato']) => void;
}

interface StatCardConfig {
    key: AccettazioneFilters['stato'];
    label: string;
    icon: React.ElementType;
    bgClass: string;
    textClass: string;
    borderClass: string;
    getValue: (stats: AccettazioneStats) => number;
}

// ============================================
// CONSTANTS
// ============================================

const STAT_CARDS: StatCardConfig[] = [
    {
        key: 'tutti',
        label: 'Totale',
        icon: Calendar,
        bgClass: 'bg-white dark:bg-gray-800',
        textClass: 'text-gray-900 dark:text-gray-100',
        borderClass: 'border-gray-200 dark:border-gray-700',
        getValue: (s) => s.totale
    },
    {
        key: 'da_accettare',
        label: 'Da Accettare',
        icon: Clock,
        bgClass: 'bg-blue-50 dark:bg-blue-900/30',
        textClass: 'text-blue-700 dark:text-blue-300',
        borderClass: 'border-blue-200 dark:border-blue-700',
        getValue: (s) => s.daAccettare
    },
    {
        key: 'in_attesa',
        label: 'In Attesa',
        icon: Timer,
        bgClass: 'bg-amber-50 dark:bg-amber-900/30',
        textClass: 'text-amber-700 dark:text-amber-300',
        borderClass: 'border-amber-200 dark:border-amber-700',
        getValue: (s) => s.inAttesa
    },
    {
        key: 'in_corso',
        label: 'In Visita',
        icon: Stethoscope,
        bgClass: 'bg-purple-50 dark:bg-purple-900/30',
        textClass: 'text-purple-700 dark:text-purple-300',
        borderClass: 'border-purple-200 dark:border-purple-700',
        getValue: (s) => s.inCorso
    },
    {
        key: 'completati',
        label: 'Completati',
        icon: CheckCircle,
        bgClass: 'bg-green-50 dark:bg-green-900/30',
        textClass: 'text-green-700 dark:text-green-300',
        borderClass: 'border-green-200 dark:border-green-700',
        getValue: (s) => s.completati
    }
];

// ============================================
// COMPONENT
// ============================================

export const AccettazioneQuickStats: React.FC<AccettazioneQuickStatsProps> = ({
    stats,
    isToday = true,
    activeFilter = 'tutti',
    onFilterClick
}) => {
    return (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {STAT_CARDS.map((card) => {
                const Icon = card.icon;
                const value = card.getValue(stats);
                const isActive = activeFilter === card.key;

                return (
                    <button
                        key={card.key}
                        onClick={() => onFilterClick?.(card.key)}
                        className={`
                            ${card.bgClass} rounded-lg border-2 p-4 transition-all text-left
                            ${isActive
                                ? `${card.borderClass} ring-2 ring-offset-1 ring-teal-500`
                                : `${card.borderClass} hover:border-teal-300`
                            }
                            ${onFilterClick ? 'cursor-pointer' : 'cursor-default'}
                        `}
                    >
                        <div className="flex items-center justify-between mb-1">
                            <span className={`text-sm ${card.textClass.replace('text-', 'text-').replace('700', '600')}`}>
                                {card.label}
                            </span>
                            <Icon className={`h-4 w-4 ${card.textClass}`} />
                        </div>
                        <p className={`text-2xl font-bold ${card.textClass}`}>
                            {value}
                        </p>
                        {card.key === 'tutti' && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                {isToday ? 'oggi' : 'giorno'}
                            </p>
                        )}
                    </button>
                );
            })}
        </div>
    );
};

export default AccettazioneQuickStats;
