/**
 * ExpiringCoursesSection - Sezione corsi in scadenza
 * 
 * Mostra i corsi scaduti (ultimi 30gg) e in scadenza (prossimi 60gg+)
 * per i dipendenti, con possibilità di filtrare per azienda e programmare rinnovi.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
    AlertTriangle,
    AlertCircle,
    Calendar,
    Clock,
    Building2,
    User,
    Users,
    CheckCircle2,
    XCircle,
    RefreshCw,
    Upload,
    Download,
    Filter,
    ChevronDown,
    ChevronUp,
    ChevronRight,
    GraduationCap,
    CalendarClock,
    LayoutList,
    LayoutGrid,
    Zap,
    CheckSquare,
    Square,
    Plus,
    ExternalLink,
    FileDown,
    MoreVertical,
    FileSpreadsheet,
    X,
    Eye,
    EyeOff
} from 'lucide-react';
import { Button } from '../../design-system/atoms/Button';
import { apiGet, apiPost } from '../../services/api';
import { format, differenceInDays, parse } from 'date-fns';
import { it } from 'date-fns/locale';

interface ExpiringCourse {
    id: string;
    enrollmentId: string;
    scheduleId: string;
    source: 'INTERNAL' | 'EXTERNAL' | 'IMPORT';
    person: {
        id: string;
        firstName: string;
        lastName: string;
        taxCode: string;
        fullName: string;
    };
    company: {
        id: string;
        ragioneSociale: string;
    } | null;
    course: {
        id: string;
        title: string;
        code: string;
        validityYears: number;
        riskLevel: string;
        courseType: string;
    };
    completedDate: string;
    expirationDate: string;
    daysUntilExpiration: number;
    status: 'EXPIRED' | 'EXPIRING';
    alreadyScheduled: boolean;
    futureSchedule: {
        id: string;
        startDate: string;
        status: string;
    } | null;
}

interface ExpiringCoursesStats {
    total: number;
    expired: number;
    expiring: number;
    alreadyScheduled: number;
    needsAction: number;
    internal: number;
    external: number;
    imported: number;
}

interface Company {
    id: string;
    ragioneSociale: string;
}

/** Gruppo di corsi in scadenza per lo stesso corso */
interface CourseGroup {
    courseId: string;
    courseTitle: string;
    courseCode: string;
    validityYears: number;
    riskLevel: string;
    courseType: string;
    /** Tutti i record di scadenza per questo corso */
    items: ExpiringCourse[];
    /** ID univoci dei dipendenti */
    employeeIds: string[];
    /** Numero di dipendenti unici */
    employeeCount: number;
    /** ID univoci delle aziende */
    companyIds: string[];
    /** Numero di aziende uniche */
    companyCount: number;
    /** Giorni medi alla scadenza (negativo = già scaduto) */
    avgDaysUntilExpiration: number;
    /** Data scadenza più critica (più vicina/già passata) */
    earliestExpiration: string;
    /** Numero di dipendenti già riprogrammati */
    alreadyScheduledCount: number;
    /** Numero di dipendenti da programmare */
    needsActionCount: number;
}

interface ExpiringCoursesSectionProps {
    /** Callback per programmare un singolo dipendente */
    onScheduleCourse?: (personId: string, courseId: string) => void;
    /** Callback per riprogrammazione rapida di gruppo (più dipendenti, più aziende) */
    onQuickSchedule?: (courseId: string, personIds: string[], companyIds: string[]) => void;
    /** Key for triggering refresh from parent (incrementing this re-fetches data) */
    refreshKey?: number;
}

// ============================================================================
// DROPDOWN COMPONENTS
// ============================================================================

/** Dropdown per il download/esportazione */
const DownloadDropdown: React.FC<{ onExportCSV: () => void }> = ({ onExportCSV }) => {
    const [open, setOpen] = useState(false);
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    // Close on click outside
    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            <Button
                variant="outline"
                size="sm"
                onClick={() => setOpen(!open)}
                className="flex items-center gap-1"
            >
                <Download className="h-4 w-4" />
                Esporta
                <ChevronDown className="h-3 w-3 ml-1" />
            </Button>

            {open && (
                <div className="absolute right-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                    <button
                        onClick={() => { onExportCSV(); setOpen(false); }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                    >
                        <FileSpreadsheet className="h-4 w-4 text-green-600" />
                        Esporta dati CSV
                    </button>
                </div>
            )}
        </div>
    );
};

/** Dropdown per import e aggiunta corsi esterni */
const ImportDropdown: React.FC<{
    onImportCSV: () => void;
    onAddExternal: () => void;
}> = ({ onImportCSV, onAddExternal }) => {
    const [open, setOpen] = useState(false);
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    // Close on click outside
    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const downloadTemplate = () => {
        const headers = ['CodiceFiscale', 'NomeCorso', 'DataCompletamento', 'LivelloRischio', 'TipoCorso', 'Note'];
        const exampleRows = [
            ['RSSMRA80A01H501X', 'Formazione Generale', '15/03/2024', 'BASSO', 'GENERALE', 'Corso esterno'],
            ['VRDLGI75B02F205Y', 'Formazione Specifica', '20/06/2024', 'ALTO', 'SPECIFICA', ''],
        ];

        const csvContent = [
            headers.join(';'),
            ...exampleRows.map(row => row.join(';'))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'template-import-corsi-scadenza.csv';
        link.click();
        setOpen(false);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <Button
                variant="outline"
                size="sm"
                onClick={() => setOpen(!open)}
                className="flex items-center gap-1 text-orange-600 border-orange-300 hover:bg-orange-50"
            >
                <Plus className="h-4 w-4" />
                Aggiungi Scadenza
                <ChevronDown className="h-3 w-3 ml-1" />
            </Button>

            {open && (
                <div className="absolute right-0 mt-1 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                    <button
                        onClick={() => { onAddExternal(); setOpen(false); }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                    >
                        <Plus className="h-4 w-4 text-purple-600" />
                        <div>
                            <div className="font-medium">Aggiungi singolo corso</div>
                            <div className="text-xs text-gray-500">Inserimento manuale</div>
                        </div>
                    </button>
                    <div className="border-t border-gray-100 my-1" />
                    <button
                        onClick={() => { onImportCSV(); setOpen(false); }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                    >
                        <Upload className="h-4 w-4 text-orange-600" />
                        <div>
                            <div className="font-medium">Importa da CSV</div>
                            <div className="text-xs text-gray-500">Carica file con corsi esterni</div>
                        </div>
                    </button>
                    <button
                        onClick={downloadTemplate}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                    >
                        <FileDown className="h-4 w-4 text-blue-600" />
                        <div>
                            <div className="font-medium">Scarica template CSV</div>
                            <div className="text-xs text-gray-500">Formato: dd/mm/yyyy</div>
                        </div>
                    </button>
                </div>
            )}
        </div>
    );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const ExpiringCoursesSection: React.FC<ExpiringCoursesSectionProps> = ({ onScheduleCourse, onQuickSchedule, refreshKey }) => {
    const [expiringCourses, setExpiringCourses] = useState<ExpiringCourse[]>([]);
    const [stats, setStats] = useState<ExpiringCoursesStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expanded, setExpanded] = useState(false);

    // View mode: 'list' (dettaglio per dipendente) o 'grouped' (raggruppato per corso)
    const [viewMode, setViewMode] = useState<'list' | 'grouped'>('grouped');

    // Selezione per riprogrammazione rapida
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

    // Toggle per mostrare/nascondere i corsi già programmati
    const [showScheduled, setShowScheduled] = useState<boolean>(false);

    // Filters
    const [filterCompany, setFilterCompany] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [filterScheduled, setFilterScheduled] = useState<string>('notScheduled'); // Default: nascondi programmati
    const [filterSource, setFilterSource] = useState<string>('all');
    const [expiredDays, setExpiredDays] = useState<number>(30);
    const [expiringDays, setExpiringDays] = useState<number>(60);

    // Companies for filter
    const [companies, setCompanies] = useState<Company[]>([]);

    // Import modal
    const [showImportModal, setShowImportModal] = useState(false);

    // Add external course modal
    const [showAddExternalModal, setShowAddExternalModal] = useState(false);

    // Carica le statistiche al mount del componente (per mostrare i numeri anche quando collassato)
    useEffect(() => {
        fetchStats();
    }, []);

    // Carica i dati completi quando si espande o quando refreshKey cambia
    useEffect(() => {
        if (expanded) {
            fetchExpiringCourses();
            fetchCompanies();
        }
    }, [expanded, expiredDays, expiringDays, refreshKey]);

    // Funzione per caricare solo le statistiche (leggera, per il contatore)
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
            console.error('Error fetching expiring courses stats:', err);
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
            console.error('Error fetching expiring courses:', err);
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
            console.error('Error fetching companies:', err);
        }
    };

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
            // Ordina per data scadenza: prima i più scaduti, poi quelli in scadenza più vicina
            .sort((a, b) => a.daysUntilExpiration - b.daysUntilExpiration);
    }, [expiringCourses, filterCompany, filterStatus, filterScheduled, filterSource]);

    // Raggruppamento corsi per ID corso (per vista raggruppata)
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

            // Aggiungi dipendente se non già presente
            if (!group.employeeIds.includes(item.person.id)) {
                group.employeeIds.push(item.person.id);
            }

            // Aggiungi azienda se non già presente
            if (item.company && !group.companyIds.includes(item.company.id)) {
                group.companyIds.push(item.company.id);
            }

            // Aggiorna contatori
            if (item.alreadyScheduled) {
                group.alreadyScheduledCount++;
            } else {
                group.needsActionCount++;
            }

            // Trova la data di scadenza più critica
            if (new Date(item.expirationDate) < new Date(group.earliestExpiration)) {
                group.earliestExpiration = item.expirationDate;
            }
        });

        // Calcola statistiche finali e ordina
        return Array.from(groups.values())
            .map(group => ({
                ...group,
                employeeCount: group.employeeIds.length,
                companyCount: group.companyIds.length,
                avgDaysUntilExpiration: Math.round(
                    group.items.reduce((sum, item) => sum + item.daysUntilExpiration, 0) / group.items.length
                )
            }))
            // Ordina per urgenza: prima quelli con scadenza media più bassa
            .sort((a, b) => a.avgDaysUntilExpiration - b.avgDaysUntilExpiration);
    }, [filteredCourses]);

    // Handler per selezione/deselezione elementi
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

    // Handler per selezionare tutti i dipendenti non programmati di un gruppo
    const selectAllFromGroup = (group: CourseGroup) => {
        setSelectedItems(prev => {
            const next = new Set(prev);
            group.items
                .filter(item => !item.alreadyScheduled)
                .forEach(item => next.add(item.id));
            return next;
        });
    };

    // Handler per deselezionare tutti i dipendenti di un gruppo
    const deselectAllFromGroup = (group: CourseGroup) => {
        setSelectedItems(prev => {
            const next = new Set(prev);
            group.items.forEach(item => next.delete(item.id));
            return next;
        });
    };

    // Handler per riprogrammazione rapida di gruppo
    const handleQuickScheduleGroup = (group: CourseGroup) => {
        if (!onQuickSchedule) return;

        // Prendi solo i dipendenti non già programmati
        const personIds = group.items
            .filter(item => !item.alreadyScheduled)
            .map(item => item.person.id);

        // Prendi tutte le aziende coinvolte
        const companyIds = group.companyIds;

        onQuickSchedule(group.courseId, personIds, companyIds);
    };

    // Handler per riprogrammazione rapida dei selezionati
    const handleQuickScheduleSelected = () => {
        if (!onQuickSchedule || selectedItems.size === 0) return;

        // Raggruppa i selezionati per corso
        const selectedCourses = filteredCourses.filter(item => selectedItems.has(item.id));

        // Per ora gestiamo un solo corso alla volta (il primo trovato)
        // In futuro si potrebbe estendere per multi-corso
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

        // Schedula il primo gruppo (quello con più selezioni)
        const sortedGroups = Array.from(courseGroups.entries())
            .sort((a, b) => b[1].personIds.length - a[1].personIds.length);

        if (sortedGroups.length > 0) {
            const [courseId, data] = sortedGroups[0];
            onQuickSchedule(courseId, data.personIds, Array.from(data.companyIds));
        }

        // Resetta selezione
        setSelectedItems(new Set());
    };

    const getSourceBadge = (source: string) => {
        switch (source) {
            case 'EXTERNAL':
                return (
                    <span className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded bg-purple-100 text-purple-700">
                        Esterno
                    </span>
                );
            case 'IMPORT':
                return (
                    <span className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded bg-blue-100 text-blue-700">
                        Importato
                    </span>
                );
            default:
                return null; // Internal non mostra badge
        }
    };

    const getStatusBadge = (course: ExpiringCourse) => {
        // Se il corso è stato riprogrammato con status attivo, mostra "Rinnovo in corso"
        // Usa EnrollmentStatus enum values: PENDING, CONFIRMED, ACTIVE
        const activeStatuses = ['PENDING', 'CONFIRMED', 'ACTIVE'];
        if (course.alreadyScheduled && course.futureSchedule &&
            activeStatuses.includes(course.futureSchedule.status)) {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                    <RefreshCw className="h-3 w-3" />
                    Rinnovo in corso
                </span>
            );
        }

        if (course.status === 'EXPIRED') {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">
                    <XCircle className="h-3 w-3" />
                    Scaduto da {Math.abs(course.daysUntilExpiration)}gg
                </span>
            );
        }

        if (course.daysUntilExpiration <= 30) {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-700">
                    <AlertTriangle className="h-3 w-3" />
                    Scade tra {course.daysUntilExpiration}gg
                </span>
            );
        }

        return (
            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700">
                <Clock className="h-3 w-3" />
                Scade tra {course.daysUntilExpiration}gg
            </span>
        );
    };

    const getScheduledBadge = (course: ExpiringCourse) => {
        if (course.futureSchedule) {
            // Mappa EnrollmentStatus enum -> etichette italiane
            const statusLabels: Record<string, string> = {
                'PENDING': 'In attesa',
                'CONFIRMED': 'Confermato',
                'ACTIVE': 'In corso',
                'COMPLETED': 'Completato',
                'CANCELLED': 'Cancellato',
                'SUSPENDED': 'Sospeso'
            };

            // Colori specifici per ogni stato (usando EnrollmentStatus enum values)
            const statusStyles: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
                'PENDING': {
                    bg: 'bg-amber-100',
                    text: 'text-amber-700',
                    icon: <Clock className="h-3 w-3" />
                },
                'CONFIRMED': {
                    bg: 'bg-blue-100',
                    text: 'text-blue-700',
                    icon: <CheckCircle2 className="h-3 w-3" />
                },
                'ACTIVE': {
                    bg: 'bg-green-100',
                    text: 'text-green-700',
                    icon: <CheckCircle2 className="h-3 w-3" />
                },
                'COMPLETED': {
                    bg: 'bg-emerald-100',
                    text: 'text-emerald-700',
                    icon: <CheckCircle2 className="h-3 w-3" />
                },
                'CANCELLED': {
                    bg: 'bg-red-100',
                    text: 'text-red-700',
                    icon: <XCircle className="h-3 w-3" />
                },
                'SUSPENDED': {
                    bg: 'bg-orange-100',
                    text: 'text-orange-700',
                    icon: <AlertCircle className="h-3 w-3" />
                }
            };

            const statusLabel = statusLabels[course.futureSchedule.status] || course.futureSchedule.status;
            const style = statusStyles[course.futureSchedule.status] || {
                bg: 'bg-gray-100',
                text: 'text-gray-600',
                icon: <CalendarClock className="h-3 w-3" />
            };

            return (
                <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${style.bg} ${style.text}`}>
                    {style.icon}
                    {statusLabel} {format(new Date(course.futureSchedule.startDate), 'dd/MM/yyyy')}
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                <CalendarClock className="h-3 w-3" />
                Da programmare
            </span>
        );
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

    if (!expanded) {
        return (
            <div
                className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-4 mb-6 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setExpanded(true)}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-100 rounded-lg">
                            <AlertTriangle className="h-5 w-5 text-orange-600" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-orange-900">Corsi in Scadenza</h3>
                            <p className="text-sm text-orange-700">
                                {stats?.needsAction || 0} corsi da programmare • {stats?.expired || 0} scaduti • {stats?.expiring || 0} in scadenza
                            </p>
                        </div>
                    </div>
                    <ChevronDown className="h-5 w-5 text-orange-600" />
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
            {/* Header */}
            <div
                className="flex items-center justify-between p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50"
                onClick={() => setExpanded(false)}
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 rounded-lg">
                        <AlertTriangle className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900">Corsi in Scadenza</h3>
                        <p className="text-sm text-gray-500">
                            Gestisci le scadenze delle certificazioni dei dipendenti
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <ChevronUp className="h-5 w-5 text-gray-400" />
                </div>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-4 bg-gray-50 border-b border-gray-100">
                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                        <p className="text-xs text-gray-500 mb-1">Totale</p>
                        <p className="text-xl font-bold text-gray-900">{stats.total}</p>
                    </div>
                    <div
                        className={`rounded-lg p-3 border cursor-pointer transition-colors ${filterStatus === 'EXPIRED' ? 'bg-red-100 border-red-400' : 'bg-white border-gray-200 hover:border-red-300'
                            }`}
                        onClick={() => setFilterStatus(filterStatus === 'EXPIRED' ? 'all' : 'EXPIRED')}
                    >
                        <p className="text-xs text-red-600 mb-1">Scaduti</p>
                        <p className="text-xl font-bold text-red-700">{stats.expired}</p>
                    </div>
                    <div
                        className={`rounded-lg p-3 border cursor-pointer transition-colors ${filterStatus === 'EXPIRING' ? 'bg-orange-100 border-orange-400' : 'bg-white border-gray-200 hover:border-orange-300'
                            }`}
                        onClick={() => setFilterStatus(filterStatus === 'EXPIRING' ? 'all' : 'EXPIRING')}
                    >
                        <p className="text-xs text-orange-600 mb-1">In Scadenza</p>
                        <p className="text-xl font-bold text-orange-700">{stats.expiring}</p>
                    </div>
                    <div
                        className={`rounded-lg p-3 border cursor-pointer transition-colors ${filterScheduled === 'scheduled' ? 'bg-green-100 border-green-400' : 'bg-white border-gray-200 hover:border-green-300'
                            }`}
                        onClick={() => setFilterScheduled(filterScheduled === 'scheduled' ? 'all' : 'scheduled')}
                    >
                        <p className="text-xs text-green-600 mb-1">Programmati</p>
                        <p className="text-xl font-bold text-green-700">{stats.alreadyScheduled}</p>
                    </div>
                    <div
                        className={`rounded-lg p-3 border cursor-pointer transition-colors ${filterScheduled === 'notScheduled' ? 'bg-amber-100 border-amber-400' : 'bg-white border-gray-200 hover:border-amber-300'
                            }`}
                        onClick={() => setFilterScheduled(filterScheduled === 'notScheduled' ? 'all' : 'notScheduled')}
                    >
                        <p className="text-xs text-amber-600 mb-1">Da Programmare</p>
                        <p className="text-xl font-bold text-amber-700">{stats.needsAction}</p>
                    </div>
                </div>
            )}

            {/* Filters Row */}
            <div className="flex flex-wrap items-center gap-2 p-4 border-b border-gray-100 bg-gray-50/50">
                <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-600">Filtri:</span>
                </div>

                <select
                    value={filterCompany}
                    onChange={(e) => setFilterCompany(e.target.value)}
                    className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-orange-500 bg-white"
                >
                    <option value="all">Tutte le aziende</option>
                    {companies.map(c => (
                        <option key={c.id} value={c.id}>{c.ragioneSociale}</option>
                    ))}
                </select>

                <select
                    value={expiredDays}
                    onChange={(e) => setExpiredDays(Number(e.target.value))}
                    className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-orange-500 bg-white"
                >
                    <option value={30}>Scaduti da 30gg</option>
                    <option value={60}>Scaduti da 60gg</option>
                    <option value={90}>Scaduti da 90gg</option>
                    <option value={180}>Scaduti da 6 mesi</option>
                </select>

                <select
                    value={expiringDays}
                    onChange={(e) => setExpiringDays(Number(e.target.value))}
                    className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-orange-500 bg-white"
                >
                    <option value={30}>In scadenza 30gg</option>
                    <option value={60}>In scadenza 60gg</option>
                    <option value={90}>In scadenza 90gg</option>
                    <option value={180}>In scadenza 6 mesi</option>
                </select>

                <select
                    value={filterSource}
                    onChange={(e) => setFilterSource(e.target.value)}
                    className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-orange-500 bg-white"
                >
                    <option value="all">Tutte le fonti</option>
                    <option value="INTERNAL">Interni</option>
                    <option value="EXTERNAL">Esterni</option>
                    <option value="IMPORT">Importati</option>
                </select>
            </div>

            {/* Actions Row */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                    {/* View Mode Toggle */}
                    <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                        <button
                            onClick={() => setViewMode('grouped')}
                            className={`p-2 ${viewMode === 'grouped' ? 'bg-orange-100 text-orange-700' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                            title="Vista raggruppata per corso"
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 ${viewMode === 'list' ? 'bg-orange-100 text-orange-700' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                            title="Vista dettagliata per dipendente"
                        >
                            <LayoutList className="h-4 w-4" />
                        </button>
                    </div>

                    {/* Toggle Mostra Programmati */}
                    <button
                        onClick={() => setFilterScheduled(filterScheduled === 'notScheduled' ? 'all' : 'notScheduled')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterScheduled === 'all'
                                ? 'bg-green-100 text-green-700 border border-green-300'
                                : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200'
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
                            <span className={`ml-1 px-1.5 py-0.5 text-xs rounded-full ${filterScheduled === 'all' ? 'bg-green-200' : 'bg-gray-200'
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
                    {/* Download dropdown */}
                    <DownloadDropdown onExportCSV={exportToCSV} />

                    {/* Import dropdown */}
                    <ImportDropdown
                        onImportCSV={() => setShowImportModal(true)}
                        onAddExternal={() => setShowAddExternalModal(true)}
                    />
                </div>
            </div>

            {/* Selected Items Action Bar */}
            {selectedItems.size > 0 && onQuickSchedule && (
                <div className="flex items-center justify-between p-3 bg-orange-50 border-b border-orange-200">
                    <div className="flex items-center gap-2 text-sm text-orange-800">
                        <CheckSquare className="h-4 w-4" />
                        <span><strong>{selectedItems.size}</strong> dipendenti selezionati</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedItems(new Set())}
                            className="text-orange-700"
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
                        <RefreshCw className="h-8 w-8 animate-spin text-orange-500" />
                        <div className="text-center">
                            <p className="text-sm font-medium text-gray-700">Caricamento corsi in scadenza...</p>
                            <p className="text-xs text-gray-500 mt-1">Analisi delle certificazioni in corso</p>
                        </div>
                    </div>
                ) : error ? (
                    <div className="text-center py-8 text-red-500">
                        <XCircle className="h-8 w-8 mx-auto mb-2" />
                        <p>{error}</p>
                        <Button variant="outline" size="sm" onClick={fetchExpiringCourses} className="mt-2">
                            Riprova
                        </Button>
                    </div>
                ) : filteredCourses.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
                        <p>Nessun corso in scadenza trovato</p>
                        <p className="text-sm">Tutti i corsi sono in regola o non corrispondono ai filtri selezionati.</p>
                    </div>
                ) : viewMode === 'grouped' ? (
                    /* VISTA RAGGRUPPATA PER CORSO */
                    <div className="space-y-4">
                        {groupedCourses.map((group) => (
                            <div
                                key={group.courseId}
                                className={`border rounded-lg overflow-hidden ${group.avgDaysUntilExpiration < 0 ? 'border-red-300 bg-red-50/30' :
                                    group.avgDaysUntilExpiration <= 30 ? 'border-orange-300 bg-orange-50/30' :
                                        'border-gray-200'
                                    }`}
                            >
                                {/* Header del gruppo */}
                                <div className="flex items-center justify-between p-4 bg-white border-b border-gray-100">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-2 rounded-lg ${group.avgDaysUntilExpiration < 0 ? 'bg-red-100' :
                                            group.avgDaysUntilExpiration <= 30 ? 'bg-orange-100' :
                                                'bg-gray-100'
                                            }`}>
                                            <GraduationCap className={`h-5 w-5 ${group.avgDaysUntilExpiration < 0 ? 'text-red-600' :
                                                group.avgDaysUntilExpiration <= 30 ? 'text-orange-600' :
                                                    'text-gray-600'
                                                }`} />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-gray-900">{group.courseTitle}</h4>
                                            <p className="text-xs text-gray-500">
                                                {group.courseCode} • Validità {group.validityYears} anni
                                            </p>
                                        </div>
                                    </div>

                                    {/* Stats del gruppo */}
                                    <div className="flex items-center gap-6">
                                        <div className="flex items-center gap-4 text-sm">
                                            <div className="flex items-center gap-1.5" title="Dipendenti">
                                                <Users className="h-4 w-4 text-blue-500" />
                                                <span className="font-semibold text-blue-700">{group.employeeCount}</span>
                                                <span className="text-gray-500">dip.</span>
                                            </div>
                                            <div className="flex items-center gap-1.5" title="Aziende">
                                                <Building2 className="h-4 w-4 text-purple-500" />
                                                <span className="font-semibold text-purple-700">{group.companyCount}</span>
                                                <span className="text-gray-500">az.</span>
                                            </div>
                                            {group.alreadyScheduledCount > 0 && (
                                                <div className="flex items-center gap-1.5" title="Già programmati">
                                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                                    <span className="font-semibold text-green-700">{group.alreadyScheduledCount}</span>
                                                </div>
                                            )}
                                            {group.needsActionCount > 0 && (
                                                <div className="flex items-center gap-1.5" title="Da programmare">
                                                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                                                    <span className="font-semibold text-amber-700">{group.needsActionCount}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Badge urgenza */}
                                        <div className={`px-3 py-1 rounded-full text-xs font-medium ${group.avgDaysUntilExpiration < 0
                                            ? 'bg-red-100 text-red-700'
                                            : group.avgDaysUntilExpiration <= 30
                                                ? 'bg-orange-100 text-orange-700'
                                                : 'bg-yellow-100 text-yellow-700'
                                            }`}>
                                            {group.avgDaysUntilExpiration < 0
                                                ? `Scaduto da ${Math.abs(group.avgDaysUntilExpiration)}gg`
                                                : `Scade tra ${group.avgDaysUntilExpiration}gg`}
                                        </div>

                                        {/* Azioni rapide */}
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

                                {/* Lista dipendenti del gruppo (collassabile) */}
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
                    /* VISTA LISTA DETTAGLIATA */
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-200 text-left">
                                    <th className="py-3 px-3 font-medium text-gray-600 w-8">
                                        {/* Checkbox header */}
                                    </th>
                                    <th className="py-3 px-3 font-medium text-gray-600">Dipendente</th>
                                    <th className="py-3 px-3 font-medium text-gray-600">Azienda</th>
                                    <th className="py-3 px-3 font-medium text-gray-600">Corso</th>
                                    <th className="py-3 px-3 font-medium text-gray-600">Completato</th>
                                    <th className="py-3 px-3 font-medium text-gray-600">Scadenza</th>
                                    <th className="py-3 px-3 font-medium text-gray-600">Stato</th>
                                    <th className="py-3 px-3 font-medium text-gray-600">Programmazione</th>
                                    <th className="py-3 px-3 font-medium text-gray-600">Azioni</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredCourses.map((course) => (
                                    <tr
                                        key={course.id}
                                        className={`border-b border-gray-100 hover:bg-gray-50 ${course.status === 'EXPIRED' ? 'bg-red-50/30' : ''
                                            }`}
                                    >
                                        <td className="py-3 px-3">
                                            {!course.alreadyScheduled && (
                                                <button
                                                    onClick={() => toggleSelection(course.id)}
                                                    className="text-gray-400 hover:text-orange-600"
                                                >
                                                    {selectedItems.has(course.id) ? (
                                                        <CheckSquare className="h-4 w-4 text-orange-600" />
                                                    ) : (
                                                        <Square className="h-4 w-4" />
                                                    )}
                                                </button>
                                            )}
                                        </td>
                                        <td className="py-3 px-3">
                                            <div className="flex items-center gap-2">
                                                <User className="h-4 w-4 text-gray-400" />
                                                <div>
                                                    <p className="font-medium text-gray-900">{course.person.fullName}</p>
                                                    <p className="text-xs text-gray-500">{course.person.taxCode}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3 px-3">
                                            <div className="flex items-center gap-2">
                                                <Building2 className="h-4 w-4 text-gray-400" />
                                                <span className="text-gray-700">{course.company?.ragioneSociale || '-'}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-3">
                                            <div className="flex items-center gap-2">
                                                <GraduationCap className="h-4 w-4 text-gray-400" />
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-medium text-gray-900">{course.course.title}</p>
                                                        {getSourceBadge(course.source)}
                                                    </div>
                                                    <p className="text-xs text-gray-500">
                                                        {course.course.code} • {course.course.validityYears} anni
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3 px-3 text-gray-600">
                                            {format(new Date(course.completedDate), 'dd/MM/yyyy', { locale: it })}
                                        </td>
                                        <td className="py-3 px-3 text-gray-600">
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
                                                    className="text-orange-600 border-orange-300 hover:bg-orange-50"
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

            {/* Import Modal */}
            {showImportModal && (
                <ImportExpiringCoursesModal
                    onClose={() => setShowImportModal(false)}
                    onImported={() => {
                        setShowImportModal(false);
                        fetchExpiringCourses();
                    }}
                />
            )}

            {/* Add External Course Modal */}
            {showAddExternalModal && (
                <AddExternalCourseModal
                    companies={companies}
                    onClose={() => setShowAddExternalModal(false)}
                    onAdded={() => {
                        setShowAddExternalModal(false);
                        fetchExpiringCourses();
                    }}
                />
            )}
        </div>
    );
};

// Componente per mostrare i dettagli di un gruppo di corsi
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

const GroupedCourseDetails: React.FC<GroupedCourseDetailsProps> = ({
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
                className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors text-sm cursor-pointer"
            >
                <div
                    className="flex items-center gap-2 text-gray-600 flex-1"
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
                        className="flex items-center gap-1 text-orange-600 hover:text-orange-700"
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
                <div className="divide-y divide-gray-100">
                    {companiesMap.map(({ company, items }) => (
                        <div key={company?.id || 'no-company'} className="p-3">
                            {/* Header azienda */}
                            <div className="flex items-center gap-2 mb-2 text-sm font-medium text-gray-700">
                                <Building2 className="h-4 w-4 text-purple-500" />
                                <span>{company?.ragioneSociale || 'Senza azienda'}</span>
                                <span className="text-gray-400">({items.length} dip.)</span>
                            </div>

                            {/* Lista dipendenti */}
                            <div className="ml-6 space-y-2">
                                {items
                                    .sort((a, b) => a.daysUntilExpiration - b.daysUntilExpiration)
                                    .map(item => (
                                        <div
                                            key={item.id}
                                            className={`flex items-center justify-between p-2 rounded-lg ${item.status === 'EXPIRED' ? 'bg-red-50' : 'bg-gray-50'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                {!item.alreadyScheduled && (
                                                    <button
                                                        onClick={() => toggleSelection(item.id)}
                                                        className="text-gray-400 hover:text-orange-600"
                                                    >
                                                        {selectedItems.has(item.id) ? (
                                                            <CheckSquare className="h-4 w-4 text-orange-600" />
                                                        ) : (
                                                            <Square className="h-4 w-4" />
                                                        )}
                                                    </button>
                                                )}
                                                <User className="h-4 w-4 text-gray-400" />
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900">{item.person.fullName}</p>
                                                    <p className="text-xs text-gray-500">
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
                                                        className="text-orange-600 hover:bg-orange-50 h-7 px-2"
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

// ============================================================================
// IMPORT MODAL COMPONENT
// ============================================================================
interface ImportExpiringCoursesModalProps {
    onClose: () => void;
    onImported: () => void;
}

/** Parsa la data da vari formati (dd/mm/yyyy, dd-mm-yyyy, yyyy-mm-dd) a yyyy-mm-dd */
const parseDate = (dateStr: string): string | null => {
    if (!dateStr) return null;

    // Try dd/mm/yyyy or dd-mm-yyyy
    const ddmmyyyy = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (ddmmyyyy) {
        const [, day, month, year] = ddmmyyyy;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    // Try yyyy-mm-dd (already correct format)
    const yyyymmdd = dateStr.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
    if (yyyymmdd) {
        const [, year, month, day] = yyyymmdd;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    return null;
};

const ImportExpiringCoursesModal: React.FC<ImportExpiringCoursesModalProps> = ({ onClose, onImported }) => {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<{
        imported: any[];
        errors: any[];
        skipped: any[];
    } | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setResults(null);
        }
    };

    const downloadTemplate = () => {
        const headers = ['CodiceFiscale', 'NomeCorso', 'DataCompletamento', 'LivelloRischio', 'TipoCorso', 'Note'];
        const exampleRows = [
            ['RSSMRA80A01H501X', 'Formazione Generale', '15/03/2024', 'BASSO', 'GENERALE', 'Corso esterno'],
            ['VRDLGI75B02F205Y', 'Formazione Specifica', '20/06/2024', 'ALTO', 'SPECIFICA', ''],
        ];

        const csvContent = [
            headers.join(';'),
            ...exampleRows.map(row => row.join(';'))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'template-import-corsi-scadenza.csv';
        link.click();
    };

    const handleImport = async () => {
        if (!file) return;

        setLoading(true);
        try {
            const text = await file.text();
            const lines = text.split('\n').filter(line => line.trim());

            // Detect separator (comma or semicolon)
            const firstLine = lines[0];
            const separator = firstLine.includes(';') ? ';' : ',';

            const headers = firstLine.split(separator).map(h => h.trim().replace(/"/g, '').toLowerCase());

            const records = lines.slice(1).map(line => {
                const values = line.split(separator).map(v => v.trim().replace(/"/g, ''));
                const record: Record<string, string> = {};
                headers.forEach((header, i) => {
                    record[header] = values[i] || '';
                });

                // Parse date from dd/mm/yyyy format
                const rawDate = record.datacompletamento || record.completeddate || record.datacorso || record.data;
                const parsedDate = parseDate(rawDate);

                return {
                    taxCode: record.codicefiscale || record.taxcode || record.cf,
                    courseName: record.nomecorso || record.course || record.corso || record.coursename,
                    riskLevel: record.livellorischio || record.risklevel || record.rischio,
                    courseType: record.tipocorso || record.coursetype || record.tipo,
                    completedDate: parsedDate,
                    notes: record.note || record.notes
                };
            }).filter(r => r.taxCode && r.courseName && r.completedDate);

            // Use apiPost for authenticated request
            const response = await apiPost<{ results: { imported: any[]; errors: any[]; skipped: any[] } }>(
                '/api/v1/schedules/import-expiring-courses',
                { records }
            );

            setResults(response.results);

            if (response.results?.imported?.length > 0) {
                setTimeout(onImported, 2000);
            }
        } catch (err) {
            console.error('Import error:', err);
            setResults({
                imported: [],
                errors: [{ error: 'Errore durante l\'importazione. Verifica il formato del file.' }],
                skipped: []
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4">
                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-orange-100 rounded-lg">
                            <Upload className="h-5 w-5 text-orange-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold">Importa Corsi in Scadenza</h3>
                            <p className="text-sm text-gray-500">Carica corsi completati presso enti esterni</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-4">
                    {/* Template download */}
                    <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <FileDown className="h-5 w-5 text-blue-600" />
                                <div>
                                    <p className="text-sm font-medium text-blue-800">Template CSV</p>
                                    <p className="text-xs text-blue-600">Formato data: dd/mm/yyyy</p>
                                </div>
                            </div>
                            <Button variant="outline" size="sm" onClick={downloadTemplate} className="text-blue-600 border-blue-300">
                                <Download className="h-4 w-4 mr-1" />
                                Scarica
                            </Button>
                        </div>
                    </div>

                    {/* Column info */}
                    <div className="mb-4">
                        <p className="text-sm font-medium text-gray-700 mb-2">Colonne richieste:</p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="p-2 bg-gray-50 rounded">
                                <span className="font-medium text-gray-700">CodiceFiscale</span>
                                <span className="text-gray-500"> *</span>
                            </div>
                            <div className="p-2 bg-gray-50 rounded">
                                <span className="font-medium text-gray-700">NomeCorso</span>
                                <span className="text-gray-500"> *</span>
                            </div>
                            <div className="p-2 bg-gray-50 rounded">
                                <span className="font-medium text-gray-700">DataCompletamento</span>
                                <span className="text-gray-500"> * (dd/mm/yyyy)</span>
                            </div>
                            <div className="p-2 bg-gray-50 rounded">
                                <span className="text-gray-500">LivelloRischio</span>
                            </div>
                            <div className="p-2 bg-gray-50 rounded">
                                <span className="text-gray-500">TipoCorso</span>
                            </div>
                            <div className="p-2 bg-gray-50 rounded">
                                <span className="text-gray-500">Note</span>
                            </div>
                        </div>
                    </div>

                    {/* File input */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Seleziona file CSV
                        </label>
                        <input
                            type="file"
                            accept=".csv"
                            onChange={handleFileChange}
                            className="w-full border border-gray-300 rounded-lg p-2 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                        />
                        {file && (
                            <p className="mt-1 text-xs text-gray-500">
                                File selezionato: {file.name}
                            </p>
                        )}
                    </div>

                    {/* Results */}
                    {results && (
                        <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
                            {results.imported.length > 0 && (
                                <div className="flex items-center gap-2 text-sm text-green-600">
                                    <CheckCircle2 className="h-4 w-4" />
                                    {results.imported.length} record importati con successo
                                </div>
                            )}
                            {results.skipped.length > 0 && (
                                <div className="flex items-center gap-2 text-sm text-yellow-600">
                                    <AlertTriangle className="h-4 w-4" />
                                    {results.skipped.length} record saltati (già esistenti)
                                </div>
                            )}
                            {results.errors.length > 0 && (
                                <div className="text-sm text-red-600">
                                    <div className="flex items-center gap-2 mb-1">
                                        <XCircle className="h-4 w-4" />
                                        {results.errors.length} errori:
                                    </div>
                                    <ul className="text-xs ml-6 list-disc">
                                        {results.errors.slice(0, 5).map((err, i) => (
                                            <li key={i}>{err.error}</li>
                                        ))}
                                        {results.errors.length > 5 && (
                                            <li>...e altri {results.errors.length - 5}</li>
                                        )}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
                    <Button variant="outline" onClick={onClose}>
                        Chiudi
                    </Button>
                    <Button
                        onClick={handleImport}
                        disabled={!file || loading}
                        className="bg-orange-500 hover:bg-orange-600 text-white"
                    >
                        {loading ? (
                            <>
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                Importazione...
                            </>
                        ) : (
                            <>
                                <Upload className="h-4 w-4 mr-2" />
                                Importa
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
};

// ============================================================================
// ADD EXTERNAL COURSE MODAL COMPONENT
// ============================================================================
interface AddExternalCourseModalProps {
    companies: Company[];
    onClose: () => void;
    onAdded: () => void;
}

interface CourseOption {
    id: string;
    title: string;
    code: string;
    validityYears: number;
    riskLevel: string;
    courseType: string;
}

interface PersonOption {
    id: string;
    firstName: string;
    lastName: string;
    taxCode: string;
    companyId?: string;
    company?: {
        id: string;
        ragioneSociale: string;
    };
}

const AddExternalCourseModal: React.FC<AddExternalCourseModalProps> = ({ companies, onClose, onAdded }) => {
    const [loading, setLoading] = useState(false);
    const [courses, setCourses] = useState<CourseOption[]>([]);
    const [persons, setPersons] = useState<PersonOption[]>([]);

    // Search state
    const [personSearch, setPersonSearch] = useState<string>('');
    const [showPersonDropdown, setShowPersonDropdown] = useState(false);
    const personSearchRef = React.useRef<HTMLDivElement>(null);

    // Form state
    const [selectedPerson, setSelectedPerson] = useState<PersonOption | null>(null);
    const [selectedCourseId, setSelectedCourseId] = useState<string>('');
    const [completedDate, setCompletedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState<string>('');

    // Result state
    const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

    // Close dropdown on click outside
    React.useEffect(() => {
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
            const response = await apiPost<{ results: { imported: any[]; errors: any[]; skipped: any[] } }>(
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

export default ExpiringCoursesSection;
