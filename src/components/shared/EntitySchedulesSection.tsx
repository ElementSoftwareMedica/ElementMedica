/**
 * EntitySchedulesSection Component
 * 
 * Componente riutilizzabile per mostrare i corsi programmati e documenti
 * collegati a un'entità (azienda, formatore, dipendente, corso).
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    Calendar,
    ChevronRight,
    Clock,
    Award,
    ClipboardList,
    FileText,
    MapPin,
    Users,
    Download,
    Eye,
    GraduationCap,
    Building2,
    User
} from 'lucide-react';
import { apiGet } from '../../services/api';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

type EntityType = 'company' | 'trainer' | 'person' | 'course';

interface Schedule {
    id: string;
    code?: string;
    startDate: string;
    endDate: string;
    location?: string;
    status: string;
    course: {
        id: string;
        title: string;
        code?: string;
        duration?: number;
    };
    trainer?: {
        id: string;
        firstName: string;
        lastName: string;
    };
    companies?: Array<{
        company: {
            id: string;
            ragioneSociale: string;
        };
    }>;
    enrollments?: Array<{
        person: {
            id: string;
            firstName: string;
            lastName: string;
        };
    }>;
    _count?: {
        attestati?: number;
        registri?: number;
        lettere?: number;
    };
}

interface Document {
    id: string;
    type: 'attestato' | 'registro' | 'lettera';
    nomeFile: string;
    url?: string;
    dataGenerazione?: string;
    createdAt?: string;
}

interface EntitySchedulesSectionProps {
    entityType: EntityType;
    entityId: string;
    title?: string;
    showDocuments?: boolean;
    maxItems?: number;
    showQuickDownloads?: boolean; // New prop for quick download buttons
}

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
    SCHEDULED: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Programmato' },
    IN_PROGRESS: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'In Corso' },
    COMPLETED: { bg: 'bg-green-100', text: 'text-green-700', label: 'Completato' },
    CANCELLED: { bg: 'bg-red-100', text: 'text-red-700', label: 'Cancellato' }
};

const EntitySchedulesSection: React.FC<EntitySchedulesSectionProps> = ({
    entityType,
    entityId,
    title,
    showDocuments = true,
    maxItems = 5,
    showQuickDownloads = false
}) => {
    const navigate = useNavigate();
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'schedules' | 'documents'>('schedules');
    const [showAll, setShowAll] = useState(false);

    // Aggregate document counts across all schedules
    const totalCounts = schedules.reduce((acc, schedule) => {
        if (schedule._count) {
            acc.attestati += schedule._count.attestati || 0;
            acc.registri += schedule._count.registri || 0;
            acc.lettere += schedule._count.lettere || 0;
        }
        return acc;
    }, { attestati: 0, registri: 0, lettere: 0 });

    useEffect(() => {
        fetchData();
    }, [entityType, entityId]);

    const fetchData = async () => {
        try {
            setLoading(true);

            // Build query based on entity type
            let scheduleEndpoint = '/api/v1/schedules?';

            switch (entityType) {
                case 'company':
                    scheduleEndpoint += `companyId=${entityId}`;
                    break;
                case 'trainer':
                    scheduleEndpoint += `trainerId=${entityId}`;
                    break;
                case 'person':
                    scheduleEndpoint += `personId=${entityId}`;
                    break;
                case 'course':
                    scheduleEndpoint += `courseId=${entityId}`;
                    break;
            }

            // Fetch schedules (documents are included via _count in the response)
            const schedulesData = await apiGet<Schedule[]>(scheduleEndpoint).catch(() => []);
            setSchedules(schedulesData || []);

            // Note: Documents are fetched via schedules - no separate endpoint needed
            // The _count field in schedules includes attestati, registri, lettere counts
            setDocuments([]);
        } catch (error) {
            console.error('Error fetching entity schedules:', error);
        } finally {
            setLoading(false);
        }
    };

    const getTitle = () => {
        if (title) return title;
        switch (entityType) {
            case 'company': return 'Corsi Programmati';
            case 'trainer': return 'Corsi Come Formatore';
            case 'person': return 'Corsi Frequentati';
            case 'course': return 'Programmazioni';
            default: return 'Corsi';
        }
    };

    const displayedSchedules = showAll ? schedules : schedules.slice(0, maxItems);
    const displayedDocuments = showAll ? documents : documents.slice(0, maxItems);

    if (loading) {
        return (
            <div className="bg-white rounded-lg shadow p-6">
                <div className="animate-pulse">
                    <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-16 bg-gray-100 rounded"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow">
            {/* Header */}
            <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                        <GraduationCap className="h-5 w-5 mr-2 text-orange-600" />
                        {getTitle()}
                    </h2>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">
                            {schedules.length} cors{schedules.length === 1 ? 'o' : 'i'}
                        </span>
                    </div>
                </div>



                {/* Tabs */}
                {showDocuments && documents.length > 0 && (
                    <div className="flex mt-4 border-b border-gray-200">
                        <button
                            onClick={() => setActiveTab('schedules')}
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'schedules'
                                ? 'border-orange-500 text-orange-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <Calendar className="h-4 w-4 inline mr-1" />
                            Corsi ({schedules.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('documents')}
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'documents'
                                ? 'border-orange-500 text-orange-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <FileText className="h-4 w-4 inline mr-1" />
                            Documenti ({documents.length})
                        </button>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="p-4">
                {activeTab === 'schedules' ? (
                    <>
                        {displayedSchedules.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                                <p>Nessun corso programmato</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {displayedSchedules.map(schedule => {
                                    const status = statusColors[schedule.status] || statusColors.SCHEDULED;
                                    return (
                                        <div
                                            key={schedule.id}
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => navigate(`/schedules/${schedule.id}`)}
                                            onKeyDown={(e) => e.key === 'Enter' && navigate(`/schedules/${schedule.id}`)}
                                            className="block p-3 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-orange-300 transition-colors cursor-pointer"
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-medium text-gray-900 truncate">
                                                        {schedule.course.title}
                                                    </h3>
                                                    <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-gray-500">
                                                        <span className="flex items-center">
                                                            <Calendar className="h-3.5 w-3.5 mr-1" />
                                                            {format(new Date(schedule.startDate), 'dd MMM yyyy', { locale: it })}
                                                            {schedule.endDate && schedule.startDate !== schedule.endDate && (
                                                                <> - {format(new Date(schedule.endDate), 'dd MMM yyyy', { locale: it })}</>
                                                            )}
                                                        </span>
                                                        {schedule.location && (
                                                            <span className="flex items-center">
                                                                <MapPin className="h-3.5 w-3.5 mr-1" />
                                                                {schedule.location}
                                                            </span>
                                                        )}
                                                        {schedule.course.duration && (
                                                            <span className="flex items-center">
                                                                <Clock className="h-3.5 w-3.5 mr-1" />
                                                                {schedule.course.duration}h
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Extra info based on entity type */}
                                                    {entityType === 'company' && schedule.trainer && (
                                                        <div className="mt-2 text-sm text-gray-600">
                                                            <User className="h-3.5 w-3.5 inline mr-1" />
                                                            Formatore: {schedule.trainer.firstName} {schedule.trainer.lastName}
                                                        </div>
                                                    )}
                                                    {entityType === 'trainer' && schedule.companies && schedule.companies.length > 0 && (
                                                        <div className="mt-2 text-sm text-gray-600">
                                                            <Building2 className="h-3.5 w-3.5 inline mr-1" />
                                                            {schedule.companies.map(c => c.company.ragioneSociale).join(', ')}
                                                        </div>
                                                    )}
                                                    {entityType === 'course' && schedule.enrollments && (
                                                        <div className="mt-2 text-sm text-gray-600">
                                                            <Users className="h-3.5 w-3.5 inline mr-1" />
                                                            {schedule.enrollments.length} partecipanti
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-2 ml-4">
                                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${status.bg} ${status.text}`}>
                                                        {status.label}
                                                    </span>
                                                    <ChevronRight className="h-4 w-4 text-gray-400" />
                                                </div>
                                            </div>

                                            {/* Document counts with download buttons */}
                                            {schedule._count && ((schedule._count.attestati ?? 0) > 0 || (schedule._count.registri ?? 0) > 0 || (schedule._count.lettere ?? 0) > 0) && (
                                                <div className="flex items-center flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100" onClick={(e) => e.preventDefault()}>
                                                    {/* For person entity: Show direct download for their attestato */}
                                                    {entityType === 'person' && (schedule._count.attestati ?? 0) > 0 && (
                                                        <Link
                                                            to={`/documents-corsi?type=attestato&scheduleId=${schedule.id}&personId=${entityId}`}
                                                            className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <Award className="h-3 w-3" />
                                                            Mio Attestato
                                                            <Download className="h-2.5 w-2.5" />
                                                        </Link>
                                                    )}
                                                    {/* For trainer entity: Show direct download for their lettera + registri */}
                                                    {entityType === 'trainer' && (
                                                        <>
                                                            {(schedule._count.lettere ?? 0) > 0 && (
                                                                <Link
                                                                    to={`/documents-corsi?type=lettera&scheduleId=${schedule.id}&trainerId=${entityId}`}
                                                                    className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-purple-700 bg-purple-50 rounded hover:bg-purple-100 transition-colors"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    <FileText className="h-3 w-3" />
                                                                    Mia Lettera
                                                                    <Download className="h-2.5 w-2.5" />
                                                                </Link>
                                                            )}
                                                            {(schedule._count.registri ?? 0) > 0 && (
                                                                <Link
                                                                    to={`/documents-corsi?type=registro&scheduleId=${schedule.id}&trainerId=${entityId}`}
                                                                    className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-green-700 bg-green-50 rounded hover:bg-green-100 transition-colors"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    <ClipboardList className="h-3 w-3" />
                                                                    Miei Registri
                                                                    <Download className="h-2.5 w-2.5" />
                                                                </Link>
                                                            )}
                                                        </>
                                                    )}
                                                    {/* For company/course: Show general document links */}
                                                    {(entityType === 'company' || entityType === 'course') && (
                                                        <>
                                                            {(schedule._count.attestati ?? 0) > 0 && (
                                                                <Link
                                                                    to={`/documents-corsi?type=attestato&scheduleId=${schedule.id}`}
                                                                    className="inline-flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:text-blue-800"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    <Award className="h-3 w-3" />
                                                                    {schedule._count.attestati}
                                                                </Link>
                                                            )}
                                                            {(schedule._count.registri ?? 0) > 0 && (
                                                                <Link
                                                                    to={`/documents-corsi?type=registro&scheduleId=${schedule.id}`}
                                                                    className="inline-flex items-center gap-1 px-2 py-1 text-xs text-green-600 hover:text-green-800"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    <ClipboardList className="h-3 w-3" />
                                                                    {schedule._count.registri}
                                                                </Link>
                                                            )}
                                                            {(schedule._count.lettere ?? 0) > 0 && (
                                                                <Link
                                                                    to={`/documents-corsi?type=lettera&scheduleId=${schedule.id}`}
                                                                    className="inline-flex items-center gap-1 px-2 py-1 text-xs text-purple-600 hover:text-purple-800"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    <FileText className="h-3 w-3" />
                                                                    {schedule._count.lettere}
                                                                </Link>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        {displayedDocuments.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                                <p>Nessun documento disponibile</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {displayedDocuments.map(doc => {
                                    const typeInfo = {
                                        attestato: { icon: Award, color: 'text-blue-600 bg-blue-50' },
                                        registro: { icon: ClipboardList, color: 'text-green-600 bg-green-50' },
                                        lettera: { icon: FileText, color: 'text-purple-600 bg-purple-50' }
                                    }[doc.type] || { icon: FileText, color: 'text-gray-600 bg-gray-50' };
                                    const Icon = typeInfo.icon;

                                    return (
                                        <div
                                            key={doc.id}
                                            className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${typeInfo.color}`}>
                                                    <Icon className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900 text-sm">{doc.nomeFile}</p>
                                                    {(doc.dataGenerazione || doc.createdAt) && (
                                                        <p className="text-xs text-gray-500">
                                                            {format(new Date(doc.dataGenerazione || doc.createdAt!), 'dd MMM yyyy', { locale: it })}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {doc.url && (
                                                    <>
                                                        <a
                                                            href={doc.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                                            title="Visualizza"
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </a>
                                                        <a
                                                            href={doc.url}
                                                            download
                                                            className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded"
                                                            title="Scarica"
                                                        >
                                                            <Download className="h-4 w-4" />
                                                        </a>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}

                {/* Show more button */}
                {((activeTab === 'schedules' && schedules.length > maxItems) ||
                    (activeTab === 'documents' && documents.length > maxItems)) && (
                        <button
                            onClick={() => setShowAll(!showAll)}
                            className="w-full mt-4 py-2 text-sm text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded-lg transition-colors"
                        >
                            {showAll ? 'Mostra meno' : `Mostra tutti (${activeTab === 'schedules' ? schedules.length : documents.length})`}
                        </button>
                    )}
            </div>
        </div>
    );
};

export default EntitySchedulesSection;
