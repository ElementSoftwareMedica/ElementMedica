/**
 * GroupedCourseDetails Component
 * 
 * Displays expandable details for a group of expiring courses.
 */

import React, { useState, useMemo } from 'react';
import {
    User,
    Building2,
    Calendar,
    CheckSquare,
    Square,
    ChevronDown,
    ChevronRight
} from 'lucide-react';
import { Button } from '../../../design-system/atoms/Button';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import type { ExpiringCourse, CourseGroup } from './types';

interface GroupedCourseDetailsProps {
    group: CourseGroup;
    selectedItems: Set<string>;
    toggleSelection: (id: string) => void;
    selectAllFromGroup: (group: CourseGroup) => void;
    deselectAllFromGroup: (group: CourseGroup) => void;
    onScheduleCourse?: (personId: string, courseId: string) => void;
    getStatusBadge: (course: ExpiringCourse) => JSX.Element;
    getScheduledBadge: (course: ExpiringCourse) => JSX.Element;
}

export const GroupedCourseDetails: React.FC<GroupedCourseDetailsProps> = ({
    group,
    selectedItems,
    toggleSelection,
    selectAllFromGroup,
    deselectAllFromGroup,
    onScheduleCourse,
    getStatusBadge,
    getScheduledBadge
}) => {
    const [expanded, setExpanded] = useState(false);

    // Conta quanti sono selezionati in questo gruppo
    const selectedInGroup = group.items.filter(item => selectedItems.has(item.id)).length;
    const selectableCount = group.items.filter(item => !item.alreadyScheduled).length;
    const allSelected = selectableCount > 0 && selectedInGroup === selectableCount;

    // Raggruppa per azienda
    const companiesMap = useMemo(() => {
        const map = new Map<string, { company: ExpiringCourse['company'], items: ExpiringCourse[] }>();

        group.items.forEach(item => {
            const companyId = item.company?.id || 'no-company';
            if (!map.has(companyId)) {
                map.set(companyId, { company: item.company, items: [] });
            }
            map.get(companyId)!.items.push(item);
        });

        return Array.from(map.values());
    }, [group.items]);

    return (
        <div>
            {/* Toggle per espandere/comprimere */}
            <div
                className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm cursor-pointer"
            >
                <div
                    className="flex items-center gap-2 text-gray-600 dark:text-gray-300 flex-1"
                    onClick={() => setExpanded(!expanded)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && setExpanded(!expanded)}
                >
                    {expanded ? (
                        <ChevronDown className="h-4 w-4" />
                    ) : (
                        <ChevronRight className="h-4 w-4" />
                    )}
                    <span>
                        Mostra {group.employeeCount} dipendenti di {group.companyCount} aziend{group.companyCount === 1 ? 'a' : 'e'}
                    </span>
                </div>
                {selectableCount > 0 && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (allSelected) {
                                deselectAllFromGroup(group);
                            } else {
                                selectAllFromGroup(group);
                            }
                        }}
                        className="flex items-center gap-1 text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300"
                    >
                        {allSelected ? (
                            <>
                                <CheckSquare className="h-4 w-4" />
                                Deseleziona tutti
                            </>
                        ) : (
                            <>
                                <Square className="h-4 w-4" />
                                Seleziona tutti ({selectableCount})
                            </>
                        )}
                    </button>
                )}
            </div>

            {/* Lista dettagliata dipendenti raggruppati per azienda */}
            {expanded && (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {companiesMap.map(({ company, items }) => (
                        <div key={company?.id || 'no-company'} className="p-3">
                            {/* Header azienda */}
                            <div className="flex items-center gap-2 mb-2 text-sm font-medium text-gray-700 dark:text-gray-200">
                                <Building2 className="h-4 w-4 text-purple-500 dark:text-purple-400" />
                                <span>{company?.ragioneSociale || 'Senza azienda'}</span>
                                <span className="text-gray-400 dark:text-gray-500">({items.length} dip.)</span>
                            </div>

                            {/* Lista dipendenti */}
                            <div className="ml-6 space-y-2">
                                {items
                                    .sort((a, b) => a.daysUntilExpiration - b.daysUntilExpiration)
                                    .map(item => (
                                        <div
                                            key={item.id}
                                            className={`flex items-center justify-between p-2 rounded-lg ${item.status === 'EXPIRED'
                                                    ? 'bg-red-50 dark:bg-red-900/30'
                                                    : 'bg-gray-50 dark:bg-gray-800'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                {!item.alreadyScheduled && (
                                                    <button
                                                        onClick={() => toggleSelection(item.id)}
                                                        className="text-gray-400 dark:text-gray-500 hover:text-orange-600 dark:hover:text-orange-400"
                                                    >
                                                        {selectedItems.has(item.id) ? (
                                                            <CheckSquare className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                                                        ) : (
                                                            <Square className="h-4 w-4" />
                                                        )}
                                                    </button>
                                                )}
                                                <User className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.person.fullName}</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                                        Scade: {format(new Date(item.expirationDate), 'dd/MM/yyyy', { locale: it })}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {getStatusBadge(item)}
                                                {getScheduledBadge(item)}
                                                {!item.alreadyScheduled && onScheduleCourse && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => onScheduleCourse(item.person.id, item.course.id)}
                                                        className="text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/30 h-7 px-2"
                                                    >
                                                        <Calendar className="h-3 w-3" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
