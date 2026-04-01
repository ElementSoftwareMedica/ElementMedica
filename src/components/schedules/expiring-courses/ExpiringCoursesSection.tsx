/**
 * ExpiringCoursesSection - Main Component
 * 
 * Mostra i corsi scaduti (ultimi 30gg) e in scadenza (prossimi 60gg+)
 * per i dipendenti, con possibilità di filtrare per azienda e programmare rinnovi.
 * 
 * Refactored to use modular components for better maintainability.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
    AlertTriangle,
    Clock,
    Building2,
    User,
    Users,
    CheckCircle2,
    XCircle,
    RefreshCw,
    Filter,
    ChevronDown,
    ChevronUp,
    GraduationCap,
    LayoutList,
    LayoutGrid,
    Zap,
    CheckSquare,
    Square,
    Calendar,
    Eye
} from 'lucide-react';
import { Button } from '../../../design-system/atoms/Button';
import { apiGet } from '../../../services/api';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { DateRangeCalendar, type DateRange } from '../../../components/ui/DateRangeCalendar';

// Import modular components
import type {
    ExpiringCourse,
    ExpiringCoursesStats,
    Company,
    CourseGroup,
    ExpiringCoursesSectionProps
} from './types';
import { DownloadDropdown, ImportDropdown } from './DropdownComponents';
import { GroupedCourseDetails } from './GroupedCourseDetails';
import { ImportExpiringCoursesModal } from './ImportExpiringCoursesModal';
import { AddExternalCourseModal } from './AddExternalCourseModal';
import { getSourceBadge, getStatusBadge, getScheduledBadge } from './StatusBadges';
import { useTenantMode } from '../../../contexts/TenantModeContext';

const ExpiringCoursesSection: React.FC<ExpiringCoursesSectionProps> = ({
    onScheduleCourse,
    onQuickSchedule,
    refreshKey
}) => {
    // Multi-tenant CRUD operations
    const { getOperateHeaders } = useTenantMode();

    // State
    const [expiringCourses, setExpiringCourses] = useState<ExpiringCourse[]>([]);
    const [stats, setStats] = useState<ExpiringCoursesStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expanded, setExpanded] = useState(false);

    // View mode: 'list' (dettaglio per dipendente) o 'grouped' (raggruppato per corso)
    const [viewMode, setViewMode] = useState<'list' | 'grouped'>('grouped');

    // Selezione per riprogrammazione rapida
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

    // Filters
    const [filterCompany, setFilterCompany] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [filterScheduled, setFilterScheduled] = useState<string>('notScheduled');
    const [filterSource, setFilterSource] = useState<string>('all');

    // Date range for expiring courses (default: 30gg before → 60gg after today)
    const defaultStart = new Date();
    defaultStart.setDate(defaultStart.getDate() - 30);
    defaultStart.setHours(0, 0, 0, 0);
    const defaultEnd = new Date();
    defaultEnd.setDate(defaultEnd.getDate() + 60);
    defaultEnd.setHours(23, 59, 59, 999);
    const [dateRange, setDateRange] = useState<DateRange>({ start: defaultStart, end: defaultEnd });

    // Derive expiredDays/expiringDays from dateRange for API compatibility
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiredDays = dateRange.start
        ? Math.max(0, Math.ceil((today.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24)))
        : 30;
    const expiringDays = dateRange.end
        ? Math.max(0, Math.ceil((dateRange.end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)))
        : 60;

    // Custom presets for expiring courses calendar
    const expiringPresets = useMemo(() => [
        {
            label: '±30 giorni',
            getRange: (): DateRange => {
                const s = new Date(); s.setDate(s.getDate() - 30); s.setHours(0, 0, 0, 0);
                const e = new Date(); e.setDate(e.getDate() + 30); e.setHours(23, 59, 59, 999);
                return { start: s, end: e };
            }
        },
        {
            label: '±60 giorni',
            getRange: (): DateRange => {
                const s = new Date(); s.setDate(s.getDate() - 60); s.setHours(0, 0, 0, 0);
                const e = new Date(); e.setDate(e.getDate() + 60); e.setHours(23, 59, 59, 999);
                return { start: s, end: e };
            }
        },
        {
            label: '±90 giorni',
            getRange: (): DateRange => {
                const s = new Date(); s.setDate(s.getDate() - 90); s.setHours(0, 0, 0, 0);
                const e = new Date(); e.setDate(e.getDate() + 90); e.setHours(23, 59, 59, 999);
                return { start: s, end: e };
            }
        },
        {
            label: '±6 mesi',
            getRange: (): DateRange => {
                const s = new Date(); s.setDate(s.getDate() - 180); s.setHours(0, 0, 0, 0);
                const e = new Date(); e.setDate(e.getDate() + 180); e.setHours(23, 59, 59, 999);
                return { start: s, end: e };
            }
        },
        {
            label: '±1 anno',
            getRange: (): DateRange => {
                const s = new Date(); s.setDate(s.getDate() - 365); s.setHours(0, 0, 0, 0);
                const e = new Date(); e.setDate(e.getDate() + 365); e.setHours(23, 59, 59, 999);
                return { start: s, end: e };
            }
        },
        {
            label: 'Scaduti 30gg + 60gg',
            getRange: (): DateRange => {
                const s = new Date(); s.setDate(s.getDate() - 30); s.setHours(0, 0, 0, 0);
                const e = new Date(); e.setDate(e.getDate() + 60); e.setHours(23, 59, 59, 999);
                return { start: s, end: e };
            }
        }
    ], []);

    // Companies for filter
    const [companies, setCompanies] = useState<Company[]>([]);

    // Modals
    const [showImportModal, setShowImportModal] = useState(false);
    const [showAddExternalModal, setShowAddExternalModal] = useState(false);

    // Load stats on mount
    useEffect(() => {
        fetchStats();
    }, []);

    // Load full data when expanded or refreshKey changes
    useEffect(() => {
        if (expanded) {
            fetchExpiringCourses();
            fetchCompanies();
        }
    }, [expanded, expiredDays, expiringDays, refreshKey, dateRange]);

    const fetchStats = async () => {
        try {
            const params = new URLSearchParams({
                expiredDays: expiredDays.toString(),
                expiringDays: expiringDays.toString()
            });
            const response = await apiGet<{
                success: boolean;
                data: ExpiringCourse[];
                stats: ExpiringCoursesStats;
            }>(`/api/v1/schedules/expiring-courses?${params}`);
            setStats(response.stats || null);
        } catch (err) {
        }
    };

    const fetchExpiringCourses = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                expiredDays: expiredDays.toString(),
                expiringDays: expiringDays.toString()
            });
            const response = await apiGet<{
                success: boolean;
                data: ExpiringCourse[];
                stats: ExpiringCoursesStats;
            }>(`/api/v1/schedules/expiring-courses?${params}`);
            setExpiringCourses(response.data || []);
            setStats(response.stats || null);
            setError(null);
        } catch (err) {
            setError('Errore nel caricamento dei corsi in scadenza');
        } finally {
            setLoading(false);
        }
    };

    const fetchCompanies = async () => {
        try {
            const response = await apiGet<Company[]>('/api/v1/companies');
            setCompanies(Array.isArray(response) ? response : []);
        } catch (err) {
        }
    };

    // Filtered courses
    const filteredCourses = useMemo(() => {
        return expiringCourses
            .filter(course => {
                if (filterCompany !== 'all' && course.company?.id !== filterCompany) return false;
                if (filterStatus !== 'all' && course.status !== filterStatus) return false;
                if (filterScheduled === 'scheduled' && !course.alreadyScheduled) return false;
                if (filterScheduled === 'notScheduled' && course.alreadyScheduled) return false;
                if (filterSource !== 'all' && course.source !== filterSource) return false;
                return true;
            })
            .sort((a, b) => a.daysUntilExpiration - b.daysUntilExpiration);
    }, [expiringCourses, filterCompany, filterStatus, filterScheduled, filterSource]);

    // Grouped courses
    const groupedCourses = useMemo((): CourseGroup[] => {
        const groups = new Map<string, CourseGroup>();

        filteredCourses.forEach(item => {
            const courseId = item.course.id;

            if (!groups.has(courseId)) {
                groups.set(courseId, {
                    courseId,
                    courseTitle: item.course.title,
                    courseCode: item.course.code,
                    validityYears: item.course.validityYears,
                    riskLevel: item.course.riskLevel,
                    courseType: item.course.courseType,
                    items: [],
                    employeeIds: [],
                    employeeCount: 0,
                    companyIds: [],
                    companyCount: 0,
                    avgDaysUntilExpiration: 0,
                    earliestExpiration: item.expirationDate,
                    alreadyScheduledCount: 0,
                    needsActionCount: 0
                });
            }

            const group = groups.get(courseId)!;
            group.items.push(item);

            if (!group.employeeIds.includes(item.person.id)) {
                group.employeeIds.push(item.person.id);
            }

            if (item.company && !group.companyIds.includes(item.company.id)) {
                group.companyIds.push(item.company.id);
            }

            if (item.alreadyScheduled) {
                group.alreadyScheduledCount++;
            } else {
                group.needsActionCount++;
            }

            if (new Date(item.expirationDate) < new Date(group.earliestExpiration)) {
                group.earliestExpiration = item.expirationDate;
            }
        });

        return Array.from(groups.values())
            .map(group => ({
                ...group,
                employeeCount: group.employeeIds.length,
                companyCount: group.companyIds.length,
                avgDaysUntilExpiration: Math.round(
                    group.items.reduce((sum, item) => sum + item.daysUntilExpiration, 0) / group.items.length
                )
            }))
            .sort((a, b) => a.avgDaysUntilExpiration - b.avgDaysUntilExpiration);
    }, [filteredCourses]);

    // Selection handlers
    const toggleSelection = (id: string) => {
        setSelectedItems(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const selectAllFromGroup = (group: CourseGroup) => {
        setSelectedItems(prev => {
            const next = new Set(prev);
            group.items
                .filter(item => !item.alreadyScheduled)
                .forEach(item => next.add(item.id));
            return next;
        });
    };

    const deselectAllFromGroup = (group: CourseGroup) => {
        setSelectedItems(prev => {
            const next = new Set(prev);
            group.items.forEach(item => next.delete(item.id));
            return next;
        });
    };

    const handleQuickScheduleGroup = (group: CourseGroup) => {
        if (!onQuickSchedule) return;
        const personIds = group.items
            .filter(item => !item.alreadyScheduled)
            .map(item => item.person.id);
        const companyIds = group.companyIds;
        onQuickSchedule(group.courseId, personIds, companyIds);
    };

    const handleQuickScheduleSelected = () => {
        if (!onQuickSchedule || selectedItems.size === 0) return;

        const selectedCourses = filteredCourses.filter(item => selectedItems.has(item.id));
        const courseGroups = new Map<string, { personIds: string[], companyIds: Set<string> }>();

        selectedCourses.forEach(item => {
            const courseId = item.course.id;
            if (!courseGroups.has(courseId)) {
                courseGroups.set(courseId, { personIds: [], companyIds: new Set() });
            }
            const group = courseGroups.get(courseId)!;
            if (!group.personIds.includes(item.person.id)) {
                group.personIds.push(item.person.id);
            }
            if (item.company) {
                group.companyIds.add(item.company.id);
            }
        });

        const sortedGroups = Array.from(courseGroups.entries())
            .sort((a, b) => b[1].personIds.length - a[1].personIds.length);

        if (sortedGroups.length > 0) {
            const [courseId, data] = sortedGroups[0];
            onQuickSchedule(courseId, data.personIds, Array.from(data.companyIds));
        }

        setSelectedItems(new Set());
    };

    const exportToCSV = () => {
        const headers = ['Dipendente', 'Codice Fiscale', 'Azienda', 'Corso', 'Codice', 'Completato il', 'Scadenza', 'Giorni', 'Stato', 'Programmato'];
        const rows = filteredCourses.map(c => [
            c.person.fullName,
            c.person.taxCode || '',
            c.company?.ragioneSociale || '',
            c.course.title,
            c.course.code || '',
            format(new Date(c.completedDate), 'dd/MM/yyyy'),
            format(new Date(c.expirationDate), 'dd/MM/yyyy'),
            c.daysUntilExpiration.toString(),
            c.status === 'EXPIRED' ? 'Scaduto' : 'In scadenza',
            c.alreadyScheduled ? 'Sì' : 'No'
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `corsi-scadenza-${format(new Date(), 'yyyy-MM-dd')}.csv`;
        link.click();
    };

    // Collapsed view
    if (!expanded) {
        return (
            <div
                className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border border-orange-200 dark:border-orange-700 rounded-xl p-4 mb-6 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setExpanded(true)}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-100 dark:bg-orange-900/40 rounded-lg">
                            <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-orange-900 dark:text-orange-100">Corsi in Scadenza</h3>
                            <p className="text-sm text-orange-700 dark:text-orange-300">
                                {stats?.needsAction || 0} corsi da programmare • {stats?.expired || 0} scaduti • {stats?.expiring || 0} in scadenza
                            </p>
                        </div>
                    </div>
                    <ChevronDown className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
            </div>
        );
    }

    // Expanded view
    return (
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
            {/* Header */}
            <div
                className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                onClick={() => setExpanded(false)}
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 dark:bg-orange-900/40 rounded-lg">
                        <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">Corsi in Scadenza</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Gestisci le scadenze delle certificazioni dei dipendenti
                        </p>
                    </div>
                </div>
                <ChevronUp className="h-5 w-5 text-gray-400 dark:text-gray-500" />
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700">
                    <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Totale</p>
                        <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{stats.total}</p>
                    </div>
                    <div
                        className={`rounded-lg p-3 border cursor-pointer transition-colors ${filterStatus === 'EXPIRED'
                            ? 'bg-red-100 dark:bg-red-900/40 border-red-400 dark:border-red-600'
                            : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:border-red-300 dark:hover:border-red-600'
                            }`}
                        onClick={() => setFilterStatus(filterStatus === 'EXPIRED' ? 'all' : 'EXPIRED')}
                    >
                        <p className="text-xs text-red-600 dark:text-red-400 mb-1">Scaduti</p>
                        <p className="text-xl font-bold text-red-700 dark:text-red-300">{stats.expired}</p>
                    </div>
                    <div
                        className={`rounded-lg p-3 border cursor-pointer transition-colors ${filterStatus === 'EXPIRING'
                            ? 'bg-orange-100 dark:bg-orange-900/40 border-orange-400 dark:border-orange-600'
                            : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:border-orange-300 dark:hover:border-orange-600'
                            }`}
                        onClick={() => setFilterStatus(filterStatus === 'EXPIRING' ? 'all' : 'EXPIRING')}
                    >
                        <p className="text-xs text-orange-600 dark:text-orange-400 mb-1">In Scadenza</p>
                        <p className="text-xl font-bold text-orange-700 dark:text-orange-300">{stats.expiring}</p>
                    </div>
                    <div
                        className={`rounded-lg p-3 border cursor-pointer transition-colors ${filterScheduled === 'scheduled'
                            ? 'bg-green-100 dark:bg-green-900/40 border-green-400 dark:border-green-600'
                            : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-600'
                            }`}
                        onClick={() => setFilterScheduled(filterScheduled === 'scheduled' ? 'all' : 'scheduled')}
                    >
                        <p className="text-xs text-green-600 dark:text-green-400 mb-1">Programmati</p>
                        <p className="text-xl font-bold text-green-700 dark:text-green-300">{stats.alreadyScheduled}</p>
                    </div>
                    <div
                        className={`rounded-lg p-3 border cursor-pointer transition-colors ${filterScheduled === 'notScheduled'
                            ? 'bg-amber-100 dark:bg-amber-900/40 border-amber-400 dark:border-amber-600'
                            : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:border-amber-300 dark:hover:border-amber-600'
                            }`}
                        onClick={() => setFilterScheduled(filterScheduled === 'notScheduled' ? 'all' : 'notScheduled')}
                    >
                        <p className="text-xs text-amber-600 dark:text-amber-400 mb-1">Da Programmare</p>
                        <p className="text-xl font-bold text-amber-700 dark:text-amber-300">{stats.needsAction}</p>
                    </div>
                </div>
            )}

            {/* Filters Row */}
            <div className="flex flex-wrap items-center gap-2 p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30">
                <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Filtri:</span>
                </div>

                <select
                    value={filterCompany}
                    onChange={(e) => setFilterCompany(e.target.value)}
                    className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-orange-500 bg-white dark:bg-gray-800 dark:text-gray-100"
                >
                    <option value="all">Tutte le aziende</option>
                    {companies.map(c => (
                        <option key={c.id} value={c.id}>{c.ragioneSociale}</option>
                    ))}
                </select>

                <DateRangeCalendar
                    value={dateRange}
                    onChange={setDateRange}
                    placeholder="Periodo scadenze"
                    theme="orange"
                    size="sm"
                    clearable
                    showPresets
                    customPresets={expiringPresets}
                />

                <select
                    value={filterSource}
                    onChange={(e) => setFilterSource(e.target.value)}
                    className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-orange-500 bg-white dark:bg-gray-800 dark:text-gray-100"
                >
                    <option value="all">Tutte le fonti</option>
                    <option value="INTERNAL">Interni</option>
                    <option value="EXTERNAL">Esterni</option>
                    <option value="IMPORT">Importati</option>
                </select>
            </div>

            {/* Actions Row */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-4 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3">
                    {/* View Mode Toggle */}
                    <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
                        <button
                            onClick={() => setViewMode('grouped')}
                            className={`p-2 ${viewMode === 'grouped' ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300' : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                            title="Vista raggruppata per corso"
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 ${viewMode === 'list' ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300' : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                            title="Vista dettagliata per dipendente"
                        >
                            <LayoutList className="h-4 w-4" />
                        </button>
                    </div>

                    {/* Toggle Show Scheduled */}
                    <button
                        onClick={() => setFilterScheduled(filterScheduled === 'notScheduled' ? 'all' : 'notScheduled')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterScheduled === 'all'
                            ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border border-green-300 dark:border-green-600'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700'
                            }`}
                        title={filterScheduled === 'all' ? 'Nascondi programmati' : 'Mostra anche i programmati'}
                    >
                        {filterScheduled === 'all' ? (
                            <>
                                <Eye className="h-4 w-4" />
                                Programmati visibili
                            </>
                        ) : (
                            <>
                                <Calendar className="h-4 w-4" />
                                Mostra programmati
                            </>
                        )}
                        {stats && stats.alreadyScheduled > 0 && (
                            <span className={`ml-1 px-1.5 py-0.5 text-xs rounded-full ${filterScheduled === 'all' ? 'bg-green-200 dark:bg-green-800' : 'bg-gray-200 dark:bg-gray-700'
                                }`}>
                                {stats.alreadyScheduled}
                            </span>
                        )}
                    </button>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchExpiringCourses}
                        className="flex items-center gap-1"
                        title="Aggiorna lista"
                    >
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                </div>

                <div className="flex items-center gap-2">
                    <DownloadDropdown onExportCSV={exportToCSV} />
                    <ImportDropdown
                        onImportCSV={() => setShowImportModal(true)}
                        onAddExternal={() => setShowAddExternalModal(true)}
                    />
                </div>
            </div>

            {/* Selected Items Action Bar */}
            {selectedItems.size > 0 && onQuickSchedule && (
                <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/30 border-b border-orange-200 dark:border-orange-700">
                    <div className="flex items-center gap-2 text-sm text-orange-800 dark:text-orange-200">
                        <CheckSquare className="h-4 w-4" />
                        <span><strong>{selectedItems.size}</strong> dipendenti selezionati</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedItems(new Set())}
                            className="text-orange-700 dark:text-orange-300"
                        >
                            Deseleziona tutto
                        </Button>
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={handleQuickScheduleSelected}
                            className="bg-orange-600 hover:bg-orange-700 text-white flex items-center gap-1"
                        >
                            <Zap className="h-4 w-4" />
                            Programma Selezionati
                        </Button>
                    </div>
                </div>
            )}

            {/* Content */}
            <div className="p-4">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                        <RefreshCw className="h-8 w-8 animate-spin text-orange-500 dark:text-orange-400" />
                        <div className="text-center">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Caricamento corsi in scadenza...</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Analisi delle certificazioni in corso</p>
                        </div>
                    </div>
                ) : error ? (
                    <div className="text-center py-8 text-red-500 dark:text-red-400">
                        <XCircle className="h-8 w-8 mx-auto mb-2" />
                        <p>{error}</p>
                        <Button variant="outline" size="sm" onClick={fetchExpiringCourses} className="mt-2">
                            Riprova
                        </Button>
                    </div>
                ) : filteredCourses.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500 dark:text-green-400" />
                        <p>Nessun corso in scadenza trovato</p>
                        <p className="text-sm">Tutti i corsi sono in regola o non corrispondono ai filtri selezionati.</p>
                    </div>
                ) : viewMode === 'grouped' ? (
                    /* GROUPED VIEW */
                    <div className="space-y-4">
                        {groupedCourses.map((group) => (
                            <div
                                key={group.courseId}
                                className={`border rounded-lg overflow-hidden ${group.avgDaysUntilExpiration < 0
                                    ? 'border-red-300 dark:border-red-700 bg-red-50/30 dark:bg-red-900/20' :
                                    group.avgDaysUntilExpiration <= 30
                                        ? 'border-orange-300 dark:border-orange-700 bg-orange-50/30 dark:bg-orange-900/20' :
                                        'border-gray-200 dark:border-gray-700'
                                    }`}
                            >
                                {/* Group Header */}
                                <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-2 rounded-lg ${group.avgDaysUntilExpiration < 0 ? 'bg-red-100 dark:bg-red-900/40' :
                                            group.avgDaysUntilExpiration <= 30 ? 'bg-orange-100 dark:bg-orange-900/40' :
                                                'bg-gray-100 dark:bg-gray-800'
                                            }`}>
                                            <GraduationCap className={`h-5 w-5 ${group.avgDaysUntilExpiration < 0 ? 'text-red-600 dark:text-red-400' :
                                                group.avgDaysUntilExpiration <= 30 ? 'text-orange-600 dark:text-orange-400' :
                                                    'text-gray-600 dark:text-gray-400'
                                                }`} />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-gray-900 dark:text-gray-100">{group.courseTitle}</h4>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                {group.courseCode} • Validità {group.validityYears} anni
                                            </p>
                                        </div>
                                    </div>

                                    {/* Group Stats */}
                                    <div className="flex items-center gap-6">
                                        <div className="flex items-center gap-4 text-sm">
                                            <div className="flex items-center gap-1.5" title="Dipendenti">
                                                <Users className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                                                <span className="font-semibold text-blue-700 dark:text-blue-300">{group.employeeCount}</span>
                                                <span className="text-gray-500 dark:text-gray-400">dip.</span>
                                            </div>
                                            <div className="flex items-center gap-1.5" title="Aziende">
                                                <Building2 className="h-4 w-4 text-purple-500 dark:text-purple-400" />
                                                <span className="font-semibold text-purple-700 dark:text-purple-300">{group.companyCount}</span>
                                                <span className="text-gray-500 dark:text-gray-400">az.</span>
                                            </div>
                                            {group.alreadyScheduledCount > 0 && (
                                                <div className="flex items-center gap-1.5" title="Già programmati">
                                                    <CheckCircle2 className="h-4 w-4 text-green-500 dark:text-green-400" />
                                                    <span className="font-semibold text-green-700 dark:text-green-300">{group.alreadyScheduledCount}</span>
                                                </div>
                                            )}
                                            {group.needsActionCount > 0 && (
                                                <div className="flex items-center gap-1.5" title="Da programmare">
                                                    <AlertTriangle className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                                                    <span className="font-semibold text-amber-700 dark:text-amber-300">{group.needsActionCount}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Urgency Badge */}
                                        <div className={`px-3 py-1 rounded-full text-xs font-medium ${group.avgDaysUntilExpiration < 0
                                            ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-200'
                                            : group.avgDaysUntilExpiration <= 30
                                                ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-200'
                                                : 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-200'
                                            }`}>
                                            {group.avgDaysUntilExpiration < 0
                                                ? `Scaduto da ${Math.abs(group.avgDaysUntilExpiration)}gg`
                                                : `Scade tra ${group.avgDaysUntilExpiration}gg`}
                                        </div>

                                        {/* Quick Actions */}
                                        {group.needsActionCount > 0 && onQuickSchedule && (
                                            <Button
                                                variant="primary"
                                                size="sm"
                                                onClick={() => handleQuickScheduleGroup(group)}
                                                className="bg-orange-600 hover:bg-orange-700 text-white flex items-center gap-1"
                                            >
                                                <Zap className="h-4 w-4" />
                                                Programma tutti ({group.needsActionCount})
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                {/* Group Details */}
                                <GroupedCourseDetails
                                    group={group}
                                    selectedItems={selectedItems}
                                    toggleSelection={toggleSelection}
                                    selectAllFromGroup={selectAllFromGroup}
                                    deselectAllFromGroup={deselectAllFromGroup}
                                    onScheduleCourse={onScheduleCourse}
                                    getStatusBadge={getStatusBadge}
                                    getScheduledBadge={getScheduledBadge}
                                />
                            </div>
                        ))}
                    </div>
                ) : (
                    /* LIST VIEW */
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-700 text-left">
                                    <th className="py-3 px-3 font-medium text-gray-600 dark:text-gray-400 w-8"></th>
                                    <th className="py-3 px-3 font-medium text-gray-600 dark:text-gray-400">Dipendente</th>
                                    <th className="py-3 px-3 font-medium text-gray-600 dark:text-gray-400">Azienda</th>
                                    <th className="py-3 px-3 font-medium text-gray-600 dark:text-gray-400">Corso</th>
                                    <th className="py-3 px-3 font-medium text-gray-600 dark:text-gray-400">Completato</th>
                                    <th className="py-3 px-3 font-medium text-gray-600 dark:text-gray-400">Scadenza</th>
                                    <th className="py-3 px-3 font-medium text-gray-600 dark:text-gray-400">Stato</th>
                                    <th className="py-3 px-3 font-medium text-gray-600 dark:text-gray-400">Programmazione</th>
                                    <th className="py-3 px-3 font-medium text-gray-600 dark:text-gray-400">Azioni</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredCourses.map((course) => (
                                    <tr
                                        key={course.id}
                                        className={`border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 ${course.status === 'EXPIRED' ? 'bg-red-50/30 dark:bg-red-900/20' : ''
                                            }`}
                                    >
                                        <td className="py-3 px-3">
                                            {!course.alreadyScheduled && (
                                                <button
                                                    onClick={() => toggleSelection(course.id)}
                                                    className="text-gray-400 dark:text-gray-500 hover:text-orange-600 dark:hover:text-orange-400"
                                                >
                                                    {selectedItems.has(course.id) ? (
                                                        <CheckSquare className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                                                    ) : (
                                                        <Square className="h-4 w-4" />
                                                    )}
                                                </button>
                                            )}
                                        </td>
                                        <td className="py-3 px-3">
                                            <div className="flex items-center gap-2">
                                                <User className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                                                <div>
                                                    <p className="font-medium text-gray-900 dark:text-gray-100">{course.person.fullName}</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">{course.person.taxCode}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3 px-3">
                                            <div className="flex items-center gap-2">
                                                <Building2 className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                                                <span className="text-gray-700 dark:text-gray-300">{course.company?.ragioneSociale || '-'}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-3">
                                            <div className="flex items-center gap-2">
                                                <GraduationCap className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-medium text-gray-900 dark:text-gray-100">{course.course.title}</p>
                                                        {getSourceBadge(course.source)}
                                                    </div>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                                        {course.course.code} • {course.course.validityYears} anni
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3 px-3 text-gray-600 dark:text-gray-300">
                                            {format(new Date(course.completedDate), 'dd/MM/yyyy', { locale: it })}
                                        </td>
                                        <td className="py-3 px-3 text-gray-600 dark:text-gray-300">
                                            {format(new Date(course.expirationDate), 'dd/MM/yyyy', { locale: it })}
                                        </td>
                                        <td className="py-3 px-3">
                                            {getStatusBadge(course)}
                                        </td>
                                        <td className="py-3 px-3">
                                            {getScheduledBadge(course)}
                                        </td>
                                        <td className="py-3 px-3">
                                            {!course.alreadyScheduled && onScheduleCourse && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => onScheduleCourse(course.person.id, course.course.id)}
                                                    className="text-orange-600 dark:text-orange-400 border-orange-300 dark:border-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/30"
                                                >
                                                    <Calendar className="h-4 w-4 mr-1" />
                                                    Programma
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modals */}
            {showImportModal && (
                <ImportExpiringCoursesModal
                    onClose={() => setShowImportModal(false)}
                    onImported={() => {
                        setShowImportModal(false);
                        fetchExpiringCourses();
                    }}
                    operateHeaders={getOperateHeaders()}
                />
            )}

            {showAddExternalModal && (
                <AddExternalCourseModal
                    companies={companies}
                    onClose={() => setShowAddExternalModal(false)}
                    onAdded={() => {
                        setShowAddExternalModal(false);
                        fetchExpiringCourses();
                    }}
                    operateHeaders={getOperateHeaders()}
                />
            )}
        </div>
    );
};

export default ExpiringCoursesSection;
