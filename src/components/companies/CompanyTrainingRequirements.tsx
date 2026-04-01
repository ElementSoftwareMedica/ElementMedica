/**
 * CompanyTrainingRequirements - Requisiti formativi azienda
 * 
 * Mostra i corsi scaduti e in scadenza per i dipendenti dell'azienda
 * con possibilità di programmare rinnovi.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    AlertTriangle,
    Calendar,
    Clock,
    User,
    CheckCircle2,
    XCircle,
    RefreshCw,
    ChevronDown,
    ChevronUp,
    ChevronRight,
    GraduationCap,
    ExternalLink,
    Plus
} from 'lucide-react';
import { apiGet } from '../../services/api';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '../../design-system/utils';

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
}

interface CompanyTrainingRequirementsProps {
    companyId: string;
    companyName: string;
}

const CompanyTrainingRequirements: React.FC<CompanyTrainingRequirementsProps> = ({
    companyId,
    companyName
}) => {
    const navigate = useNavigate();
    const [courses, setCourses] = useState<ExpiringCourse[]>([]);
    const [stats, setStats] = useState<ExpiringCoursesStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expanded, setExpanded] = useState(false);

    const fetchExpiringCourses = useCallback(async () => {
        setLoading(true);
        try {
            const response = await apiGet<{
                success: boolean;
                data: ExpiringCourse[];
                stats: ExpiringCoursesStats;
            }>(`/api/v1/schedules/expiring-courses?companyId=${companyId}&expiredDays=30&expiringDays=90`);

            setCourses(response.data || []);
            setStats(response.stats || null);
            setError(null);
        } catch (err) {
            setError('Errore nel caricamento');
        } finally {
            setLoading(false);
        }
    }, [companyId]);

    useEffect(() => {
        fetchExpiringCourses();
    }, [fetchExpiringCourses]);

    const getStatusBadge = (course: ExpiringCourse) => {
        if (course.alreadyScheduled && course.futureSchedule) {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                    <RefreshCw className="h-3 w-3" />
                    Rinnovo programmato
                </span>
            );
        }

        if (course.status === 'EXPIRED') {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">
                    <XCircle className="h-3 w-3" />
                    Scaduto
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

    // Non mostrare nulla se non ci sono dati e il loading è finito
    if (!loading && (!stats || stats.total === 0)) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900">Formazione Aggiornata</h3>
                            <p className="text-sm text-gray-500">
                                Nessun corso in scadenza per i dipendenti di questa azienda
                            </p>
                        </div>
                    </div>
                    <Link
                        to={`/formazione/schedules?companyId=${companyId}`}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium inline-flex items-center"
                    >
                        Storico completo
                        <ExternalLink className="h-3 w-3 ml-1" />
                    </Link>
                </div>
            </div>
        );
    }

    // Vista compatta
    if (!expanded) {
        return (
            <div
                className={cn(
                    "border rounded-xl p-4 cursor-pointer hover:shadow-md transition-shadow",
                    stats?.expired && stats.expired > 0
                        ? "bg-gradient-to-r from-red-50 to-orange-50 border-red-200"
                        : "bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200"
                )}
                onClick={() => setExpanded(true)}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            "p-2 rounded-lg",
                            stats?.expired && stats.expired > 0 ? "bg-red-100" : "bg-orange-100"
                        )}>
                            <AlertTriangle className={cn(
                                "h-5 w-5",
                                stats?.expired && stats.expired > 0 ? "text-red-600" : "text-orange-600"
                            )} />
                        </div>
                        <div>
                            <h3 className={cn(
                                "font-semibold",
                                stats?.expired && stats.expired > 0 ? "text-red-900" : "text-orange-900"
                            )}>
                                Corsi in Scadenza
                            </h3>
                            <p className={cn(
                                "text-sm",
                                stats?.expired && stats.expired > 0 ? "text-red-700" : "text-orange-700"
                            )}>
                                {loading ? 'Caricamento...' : (
                                    <>
                                        {stats?.needsAction || 0} da programmare
                                        {stats?.expired ? ` • ${stats.expired} scaduti` : ''}
                                        {stats?.expiring ? ` • ${stats.expiring} in scadenza` : ''}
                                    </>
                                )}
                            </p>
                        </div>
                    </div>
                    <ChevronDown className={cn(
                        "h-5 w-5",
                        stats?.expired && stats.expired > 0 ? "text-red-600" : "text-orange-600"
                    )} />
                </div>
            </div>
        );
    }

    // Vista espansa
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
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
                            Formazione da rinnovare per i dipendenti
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Link
                        to={`/formazione/schedules?companyId=${companyId}`}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                        onClick={(e) => e.stopPropagation()}
                    >
                        Gestisci
                    </Link>
                    <ChevronUp className="h-5 w-5 text-gray-400" />
                </div>
            </div>

            {/* Stats Row */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-gray-50 border-b border-gray-100">
                    <div className="bg-white rounded-lg p-3 border border-gray-200 text-center">
                        <p className="text-xs text-gray-500 mb-1">Totale</p>
                        <p className="text-xl font-bold text-gray-900">{stats.total}</p>
                    </div>
                    <div className="bg-red-50 rounded-lg p-3 border border-red-200 text-center">
                        <p className="text-xs text-red-600 mb-1">Scaduti</p>
                        <p className="text-xl font-bold text-red-700">{stats.expired}</p>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-3 border border-orange-200 text-center">
                        <p className="text-xs text-orange-600 mb-1">In Scadenza</p>
                        <p className="text-xl font-bold text-orange-700">{stats.expiring}</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3 border border-green-200 text-center">
                        <p className="text-xs text-green-600 mb-1">Programmati</p>
                        <p className="text-xl font-bold text-green-700">{stats.alreadyScheduled}</p>
                    </div>
                </div>
            )}

            {/* Content */}
            <div className="p-4">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-8 gap-3">
                        <RefreshCw className="h-8 w-8 animate-spin text-orange-500" />
                        <p className="text-sm text-gray-500">Caricamento...</p>
                    </div>
                ) : error ? (
                    <div className="text-center py-8 text-red-500">
                        <XCircle className="h-8 w-8 mx-auto mb-2" />
                        <p>{error}</p>
                        <button
                            onClick={fetchExpiringCourses}
                            className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                        >
                            Riprova
                        </button>
                    </div>
                ) : courses.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
                        <p>Nessun corso in scadenza</p>
                    </div>
                ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                        {courses
                            .filter(c => !c.alreadyScheduled) // Mostra solo quelli da programmare
                            .sort((a, b) => a.daysUntilExpiration - b.daysUntilExpiration)
                            .slice(0, 10) // Limita a 10
                            .map(course => (
                                <div
                                    key={course.id}
                                    className={cn(
                                        "flex items-center justify-between p-3 rounded-lg border",
                                        course.status === 'EXPIRED'
                                            ? "bg-red-50 border-red-200"
                                            : course.daysUntilExpiration <= 30
                                                ? "bg-orange-50 border-orange-200"
                                                : "bg-gray-50 border-gray-200"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <User className="h-4 w-4 text-gray-400" />
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">
                                                {course.person.fullName}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {course.course.title}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {getStatusBadge(course)}
                                        <button
                                            onClick={() => navigate(`/formazione/schedules?courseId=${course.course.id}&personIds=${course.person.id}`)}
                                            className="p-1.5 text-orange-600 hover:bg-orange-100 rounded-lg transition-colors"
                                            title="Programma rinnovo"
                                        >
                                            <Calendar className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}

                        {courses.filter(c => !c.alreadyScheduled).length > 10 && (
                            <div className="text-center pt-2">
                                <Link
                                    to={`/formazione/schedules?companyId=${companyId}`}
                                    className="text-sm text-orange-600 hover:text-orange-800 font-medium"
                                >
                                    Visualizza tutti ({courses.filter(c => !c.alreadyScheduled).length} corsi)
                                </Link>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Quick Action */}
            {!loading && stats && stats.needsAction > 0 && (
                <div className="p-4 border-t border-gray-100 bg-gray-50">
                    <Link
                        to={`/formazione/schedules?companyId=${companyId}`}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium"
                    >
                        <Plus className="h-4 w-4" />
                        Programma Rinnovi ({stats.needsAction})
                    </Link>
                </div>
            )}
        </div>
    );
};

export default CompanyTrainingRequirements;
