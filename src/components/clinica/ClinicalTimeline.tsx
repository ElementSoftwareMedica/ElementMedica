/**
 * ClinicalTimeline Component
 * Displays patient clinical history in timeline format
 * 
 * Features:
 * - Chronological event display
 * - Event type filtering
 * - Expandable details
 * - Activity grouping
 * 
 * @module components/clinica/ClinicalTimeline
 */

import React, { useState, useMemo } from 'react';
import {
    Calendar,
    Clock,
    User,
    FileText,
    Stethoscope,
    Pill,
    ClipboardList,
    AlertTriangle,
    ChevronDown,
    ChevronUp,
    Filter
} from 'lucide-react';
import { formatDate, formatTime } from '@/utils/dateUtils';
import { StatusBadge } from './StatusBadge';
import { getDoctorTitle } from '@/utils/codiceFiscale';

// =====================================================
// TYPES
// =====================================================

export type TimelineEventType =
    | 'VISITA'
    | 'REFERTO'
    | 'PRESCRIZIONE'
    | 'APPUNTAMENTO'
    | 'NOTA'
    | 'DOCUMENTO'
    | 'ESAME'
    | 'ALLERGIA';

export interface TimelineEvent {
    id: string;
    tipo: TimelineEventType;
    titolo: string;
    descrizione?: string;
    dataOra: string | Date;
    medico?: {
        id: string;
        firstName?: string;
        lastName?: string;
        specialties?: string[];
        taxCode?: string;
        gender?: string;
    };
    dettagli?: Record<string, unknown>;
    stato?: string;
    urgenza?: 'BASSA' | 'NORMALE' | 'ALTA' | 'URGENTE';
}

interface ClinicalTimelineProps {
    events: TimelineEvent[];
    showFilters?: boolean;
    maxItems?: number;
    groupByDate?: boolean;
    onEventClick?: (event: TimelineEvent) => void;
    className?: string;
}

// =====================================================
// EVENT TYPE CONFIG
// =====================================================

const eventTypeConfig: Record<TimelineEventType, {
    label: string;
    icon: React.ReactNode;
    color: string;
    bgColor: string;
}> = {
    VISITA: {
        label: 'Visita',
        icon: <Stethoscope className="w-full h-full" />,
        color: 'text-blue-600',
        bgColor: 'bg-blue-100'
    },
    REFERTO: {
        label: 'Referto',
        icon: <FileText className="w-full h-full" />,
        color: 'text-green-600',
        bgColor: 'bg-green-100'
    },
    PRESCRIZIONE: {
        label: 'Prescrizione',
        icon: <Pill className="w-full h-full" />,
        color: 'text-purple-600',
        bgColor: 'bg-purple-100'
    },
    APPUNTAMENTO: {
        label: 'Appuntamento',
        icon: <Calendar className="w-full h-full" />,
        color: 'text-indigo-600',
        bgColor: 'bg-indigo-100'
    },
    NOTA: {
        label: 'Nota',
        icon: <ClipboardList className="w-full h-full" />,
        color: 'text-gray-600',
        bgColor: 'bg-gray-100'
    },
    DOCUMENTO: {
        label: 'Documento',
        icon: <FileText className="w-full h-full" />,
        color: 'text-orange-600',
        bgColor: 'bg-orange-100'
    },
    ESAME: {
        label: 'Esame',
        icon: <ClipboardList className="w-full h-full" />,
        color: 'text-teal-600',
        bgColor: 'bg-teal-100'
    },
    ALLERGIA: {
        label: 'Allergia',
        icon: <AlertTriangle className="w-full h-full" />,
        color: 'text-red-600',
        bgColor: 'bg-red-100'
    }
};

// =====================================================
// HELPERS
// =====================================================

function groupEventsByDate(events: TimelineEvent[]): Map<string, TimelineEvent[]> {
    const groups = new Map<string, TimelineEvent[]>();

    events.forEach(event => {
        const date = new Date(event.dataOra).toISOString().split('T')[0];
        const existing = groups.get(date) || [];
        groups.set(date, [...existing, event]);
    });

    return groups;
}

function formatGroupDate(dateStr: string): string {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (dateStr === today.toISOString().split('T')[0]) {
        return 'Oggi';
    }
    if (dateStr === yesterday.toISOString().split('T')[0]) {
        return 'Ieri';
    }

    return formatDate(date, 'long');
}

// =====================================================
// COMPONENT
// =====================================================

export const ClinicalTimeline: React.FC<ClinicalTimelineProps> = ({
    events,
    showFilters = true,
    maxItems,
    groupByDate = true,
    onEventClick,
    className = ''
}) => {
    const [selectedTypes, setSelectedTypes] = useState<Set<TimelineEventType>>(new Set());
    const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
    const [showAllFilters, setShowAllFilters] = useState(false);

    // Filter events
    const filteredEvents = useMemo(() => {
        let filtered = [...events];

        if (selectedTypes.size > 0) {
            filtered = filtered.filter(e => selectedTypes.has(e.tipo));
        }

        // Sort by date descending
        filtered.sort((a, b) =>
            new Date(b.dataOra).getTime() - new Date(a.dataOra).getTime()
        );

        if (maxItems) {
            filtered = filtered.slice(0, maxItems);
        }

        return filtered;
    }, [events, selectedTypes, maxItems]);

    // Group events
    const groupedEvents = useMemo(() => {
        if (!groupByDate) return null;
        return groupEventsByDate(filteredEvents);
    }, [filteredEvents, groupByDate]);

    // Toggle filter
    const toggleFilter = (type: TimelineEventType) => {
        const newSelected = new Set(selectedTypes);
        if (newSelected.has(type)) {
            newSelected.delete(type);
        } else {
            newSelected.add(type);
        }
        setSelectedTypes(newSelected);
    };

    // Toggle event expansion
    const toggleEvent = (eventId: string) => {
        const newExpanded = new Set(expandedEvents);
        if (newExpanded.has(eventId)) {
            newExpanded.delete(eventId);
        } else {
            newExpanded.add(eventId);
        }
        setExpandedEvents(newExpanded);
    };

    // Get unique event types
    const eventTypes = useMemo(() => {
        return [...new Set(events.map(e => e.tipo))];
    }, [events]);

    // Render single event
    const renderEvent = (event: TimelineEvent, isLast: boolean) => {
        const config = eventTypeConfig[event.tipo];
        const isExpanded = expandedEvents.has(event.id);

        return (
            <div key={event.id} className="relative">
                {/* Timeline connector */}
                {!isLast && (
                    <div className="absolute left-5 top-12 bottom-0 w-0.5 bg-gray-200" />
                )}

                {/* Event card */}
                <div className="flex gap-4">
                    {/* Icon */}
                    <div className={`
            w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
            ${config.bgColor} ${config.color}
          `}>
                        <span className="w-5 h-5">{config.icon}</span>
                    </div>

                    {/* Content */}
                    <div
                        className={`
              flex-1 bg-white rounded-lg border border-gray-200 p-4 mb-4
              hover:border-gray-300 hover:shadow-sm transition-all
              ${onEventClick ? 'cursor-pointer' : ''}
            `}
                        onClick={() => onEventClick?.(event)}
                    >
                        {/* Header */}
                        <div className="flex items-start justify-between mb-2">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-xs font-medium ${config.color}`}>
                                        {config.label}
                                    </span>
                                    {event.stato && (
                                        <StatusBadge status={event.stato as any} size="xs" />
                                    )}
                                </div>
                                <h4 className="font-medium text-gray-900">{event.titolo}</h4>
                            </div>

                            <div className="text-right text-sm text-gray-500">
                                <div className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    <span>{formatTime(event.dataOra)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        {event.descrizione && (
                            <p className={`text-sm text-gray-600 ${isExpanded ? '' : 'line-clamp-2'}`}>
                                {event.descrizione}
                            </p>
                        )}

                        {/* Doctor */}
                        {event.medico && (
                            <div className="flex items-center gap-2 mt-3 text-sm text-gray-500">
                                <User className="w-4 h-4" />
                                <span>
                                    {getDoctorTitle(event.medico.taxCode, event.medico.gender as import('@/utils/codiceFiscale').Gender | null | undefined)} {event.medico.lastName} {event.medico.firstName}
                                    {event.medico.specialties && event.medico.specialties.length > 0 && (
                                        <span className="text-gray-400"> - {event.medico.specialties[0]}</span>
                                    )}
                                </span>
                            </div>
                        )}

                        {/* Expandable details */}
                        {event.dettagli && Object.keys(event.dettagli).length > 0 && (
                            <div className="mt-3">
                                <button
                                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggleEvent(event.id);
                                    }}
                                >
                                    {isExpanded ? (
                                        <>
                                            <ChevronUp className="w-4 h-4" />
                                            Nascondi dettagli
                                        </>
                                    ) : (
                                        <>
                                            <ChevronDown className="w-4 h-4" />
                                            Mostra dettagli
                                        </>
                                    )}
                                </button>

                                {isExpanded && (
                                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                                        <dl className="grid grid-cols-2 gap-2 text-sm">
                                            {Object.entries(event.dettagli).map(([key, value]) => (
                                                <div key={key}>
                                                    <dt className="text-gray-500 capitalize">
                                                        {key.replace(/([A-Z])/g, ' $1').trim()}
                                                    </dt>
                                                    <dd className="font-medium text-gray-900">
                                                        {String(value)}
                                                    </dd>
                                                </div>
                                            ))}
                                        </dl>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className={className}>
            {/* Filters */}
            {showFilters && eventTypes.length > 1 && (
                <div className="mb-6">
                    <div className="flex items-center gap-2 mb-2">
                        <Filter className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700">Filtra per tipo</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {(showAllFilters ? eventTypes : eventTypes.slice(0, 4)).map(type => {
                            const config = eventTypeConfig[type];
                            const isSelected = selectedTypes.has(type);

                            return (
                                <button
                                    key={type}
                                    className={`
                    flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
                    transition-all border
                    ${isSelected
                                            ? `${config.bgColor} ${config.color} border-current`
                                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                                        }
                  `}
                                    onClick={() => toggleFilter(type)}
                                >
                                    <span className="w-4 h-4">{config.icon}</span>
                                    {config.label}
                                </button>
                            );
                        })}
                        {eventTypes.length > 4 && (
                            <button
                                className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700"
                                onClick={() => setShowAllFilters(!showAllFilters)}
                            >
                                {showAllFilters ? 'Mostra meno' : `+${eventTypes.length - 4} altri`}
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Empty state */}
            {filteredEvents.length === 0 && (
                <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                        <Calendar className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-1">
                        Nessun evento
                    </h3>
                    <p className="text-gray-500">
                        {selectedTypes.size > 0
                            ? 'Nessun evento corrisponde ai filtri selezionati'
                            : 'Non ci sono eventi nella storia clinica'
                        }
                    </p>
                </div>
            )}

            {/* Timeline */}
            {groupByDate && groupedEvents ? (
                // Grouped view
                Array.from(groupedEvents.entries()).map(([date, dateEvents]) => (
                    <div key={date} className="mb-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="h-px flex-1 bg-gray-200" />
                            <span className="text-sm font-medium text-gray-500 px-2">
                                {formatGroupDate(date)}
                            </span>
                            <div className="h-px flex-1 bg-gray-200" />
                        </div>
                        <div>
                            {dateEvents.map((event, idx) =>
                                renderEvent(event, idx === dateEvents.length - 1)
                            )}
                        </div>
                    </div>
                ))
            ) : (
                // Flat view
                <div>
                    {filteredEvents.map((event, idx) =>
                        renderEvent(event, idx === filteredEvents.length - 1)
                    )}
                </div>
            )}
        </div>
    );
};

export default ClinicalTimeline;
