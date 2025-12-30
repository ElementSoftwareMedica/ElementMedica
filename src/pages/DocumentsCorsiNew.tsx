import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useToast } from '../hooks/useToast';
import {
  FileText,
  Award,
  ClipboardList,
  Calendar,
  User,
  Building2,
  Download,
  Eye,
  Trash2,
  Filter,
  Search,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  LayoutGrid,
  Table
} from 'lucide-react';
import { useConfirmDialog } from '../contexts/ConfirmDialogContext';
import { apiGet, apiDelete } from '../services/api';
import { format, addYears, differenceInDays, isPast, isFuture } from 'date-fns';
import { it } from 'date-fns/locale';
import DocumentListPage from './documents/DocumentListPage';

// Types
interface Document {
  id: string;
  type: 'attestato' | 'registro' | 'lettera';
  nomeFile: string;
  dataGenerazione: string;
  url?: string;
  fileUrl?: string;

  // Common fields
  scheduledCourse?: {
    id: string;
    course: {
      id: string;
      title: string;
      code: string;
      category: string;
      duration: number;
      validity?: number; // in years
    };
    startDate: string;
    endDate: string;
    trainer?: {
      firstName: string;
      lastName: string;
    };
  };

  // Attestato specific
  person?: {
    firstName: string;
    lastName: string;
    taxCode: string;
    email: string;
  };
  numeroProgressivo?: number;
  annoProgressivo?: number;
  expiryDate?: string; // Calculated
  daysUntilExpiry?: number; // Calculated

  // Registro specific
  sessions?: any[];

  // Lettera specific
  trainer?: {
    firstName: string;
    lastName: string;
  };
}

interface Stats {
  total: number;
  attestati: number;
  registri: number;
  lettere: number;
  expiringSoon: number; // Attestati expiring in next 90 days
  expired: number;
}

const DocumentsCorsiNew: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { confirmDelete } = useConfirmDialog();
  const { showToast } = useToast();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'attestato' | 'registro' | 'lettera'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'valid' | 'expiring' | 'expired'>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [stats, setStats] = useState<Stats>({
    total: 0,
    attestati: 0,
    registri: 0,
    lettere: 0,
    expiringSoon: 0,
    expired: 0
  });

  // Apply URL filters on mount
  useEffect(() => {
    const typeParam = searchParams.get('type');
    if (typeParam && ['attestato', 'registro', 'lettera'].includes(typeParam)) {
      setFilterType(typeParam as 'attestato' | 'registro' | 'lettera');
    }
  }, [searchParams]);

  // Refetch when searchParams change (for schedule/person/trainer filtering)
  useEffect(() => {
    fetchAllDocuments();
  }, [searchParams]);

  const fetchAllDocuments = async () => {
    try {
      setLoading(true);

      // Build query params for filtering
      const scheduleId = searchParams.get('scheduleId');
      const personId = searchParams.get('personId');
      const trainerId = searchParams.get('trainerId');

      // Build query strings for each endpoint
      const attestatiParams = new URLSearchParams();
      const registriParams = new URLSearchParams();
      const lettereParams = new URLSearchParams();

      if (scheduleId) {
        attestatiParams.set('scheduleId', scheduleId);
        registriParams.set('scheduleId', scheduleId);
        lettereParams.set('scheduleId', scheduleId);
      }
      if (personId) {
        attestatiParams.set('personId', personId);
      }
      if (trainerId) {
        lettereParams.set('trainerId', trainerId);
        registriParams.set('formatoreId', trainerId); // API uses formatoreId for trainer filter
      }

      const attestatiQuery = attestatiParams.toString() ? `?${attestatiParams.toString()}` : '';
      const registriQuery = registriParams.toString() ? `?${registriParams.toString()}` : '';
      const lettereQuery = lettereParams.toString() ? `?${lettereParams.toString()}` : '';

      // Fetch all document types in parallel with filters
      const [attestatiRes, registriRes, lettereRes] = await Promise.all([
        apiGet<any[]>(`/api/v1/attestati${attestatiQuery}`).catch(() => []),
        apiGet<any[]>(`/api/v1/registri-presenze${registriQuery}`).catch(() => []),
        apiGet<any[]>(`/api/v1/lettere-incarico${lettereQuery}`).catch(() => [])
      ]);

      // Process attestati with expiry calculation
      const attestati: Document[] = (attestatiRes || []).map((att: any) => {
        const doc: Document = {
          id: att.id,
          type: 'attestato',
          nomeFile: att.nomeFile,
          dataGenerazione: att.dataGenerazione,
          url: att.url,
          fileUrl: att.fileUrl,
          scheduledCourse: att.scheduledCourse,
          person: att.person,
          numeroProgressivo: att.numeroProgressivo,
          annoProgressivo: att.annoProgressivo
        };

        // Calculate expiry date
        if (att.scheduledCourse?.endDate && att.scheduledCourse?.course?.validity) {
          const courseEndDate = new Date(att.scheduledCourse.endDate);
          const validityYears = att.scheduledCourse.course.validity;
          const expiryDate = addYears(courseEndDate, validityYears);

          doc.expiryDate = expiryDate.toISOString();
          doc.daysUntilExpiry = differenceInDays(expiryDate, new Date());
        }

        return doc;
      });

      // Process registri
      const registri: Document[] = (registriRes || []).map((reg: any) => ({
        id: reg.id,
        type: 'registro',
        nomeFile: reg.nomeFile || `Registro ${reg.scheduledCourse?.course?.title || 'N/A'}`,
        dataGenerazione: reg.createdAt,
        url: reg.url,
        fileUrl: reg.fileUrl,
        scheduledCourse: reg.scheduledCourse,
        sessions: reg.sessions
      }));

      // Process lettere
      const lettere: Document[] = (lettereRes || []).map((lett: any) => ({
        id: lett.id,
        type: 'lettera',
        nomeFile: lett.nomeFile || `Lettera ${lett.trainer?.firstName || 'N/A'}`,
        dataGenerazione: lett.createdAt,
        url: lett.url,
        fileUrl: lett.fileUrl,
        scheduledCourse: lett.scheduledCourse,
        trainer: lett.trainer
      }));

      const allDocs = [...attestati, ...registri, ...lettere].sort((a, b) => {
        const dateA = a.dataGenerazione ? new Date(a.dataGenerazione).getTime() : 0;
        const dateB = b.dataGenerazione ? new Date(b.dataGenerazione).getTime() : 0;
        return dateB - dateA;
      });

      setDocuments(allDocs);

      // Calculate stats
      const expiringSoon = attestati.filter(a =>
        a.daysUntilExpiry !== undefined &&
        a.daysUntilExpiry > 0 &&
        a.daysUntilExpiry <= 90
      ).length;

      const expired = attestati.filter(a =>
        a.daysUntilExpiry !== undefined &&
        a.daysUntilExpiry < 0
      ).length;

      setStats({
        total: allDocs.length,
        attestati: attestati.length,
        registri: registri.length,
        lettere: lettere.length,
        expiringSoon,
        expired
      });

    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (doc: Document) => {
    const shouldDelete = await confirmDelete(doc.nomeFile);
    if (!shouldDelete) return;

    try {
      const endpoint = doc.type === 'attestato' ? 'attestati'
        : doc.type === 'registro' ? 'registri-presenze'
          : 'lettere-incarico';

      await apiDelete(`/api/${endpoint}/${doc.id}`);
      setDocuments(docs => docs.filter(d => d.id !== doc.id));

      // Update stats
      setStats(prev => ({
        ...prev,
        total: prev.total - 1,
        [doc.type === 'attestato' ? 'attestati' : doc.type === 'registro' ? 'registri' : 'lettere']:
          prev[doc.type === 'attestato' ? 'attestati' : doc.type === 'registro' ? 'registri' : 'lettere'] - 1
      }));
    } catch (error) {
      console.error('Error deleting document:', error);
      showToast({ message: 'Errore durante l\'eliminazione del documento', type: 'error' });
    }
  };

  const getTypeInfo = (type: string) => {
    switch (type) {
      case 'attestato':
        return { icon: Award, label: 'Attestato', color: 'text-blue-600 bg-blue-50' };
      case 'registro':
        return { icon: ClipboardList, label: 'Registro', color: 'text-green-600 bg-green-50' };
      case 'lettera':
        return { icon: FileText, label: 'Lettera', color: 'text-purple-600 bg-purple-50' };
      default:
        return { icon: FileText, label: 'Documento', color: 'text-gray-600 bg-gray-50' };
    }
  };

  const getExpiryStatus = (doc: Document) => {
    if (doc.type !== 'attestato' || !doc.daysUntilExpiry) return null;

    if (doc.daysUntilExpiry < 0) {
      return {
        label: 'Scaduto',
        color: 'text-red-600 bg-red-50 border-red-200',
        icon: XCircle
      };
    } else if (doc.daysUntilExpiry <= 90) {
      return {
        label: `Scade tra ${doc.daysUntilExpiry} giorni`,
        color: 'text-orange-600 bg-orange-50 border-orange-200',
        icon: AlertCircle
      };
    } else {
      return {
        label: `Valido per ${Math.floor(doc.daysUntilExpiry / 365)} anni`,
        color: 'text-green-600 bg-green-50 border-green-200',
        icon: CheckCircle2
      };
    }
  };

  // Filter documents
  const filteredDocuments = documents.filter(doc => {
    // Type filter
    if (filterType !== 'all' && doc.type !== filterType) return false;

    // Status filter (for attestati only)
    if (filterStatus !== 'all' && doc.type === 'attestato') {
      if (filterStatus === 'expired' && (doc.daysUntilExpiry === undefined || doc.daysUntilExpiry >= 0)) return false;
      if (filterStatus === 'expiring' && (doc.daysUntilExpiry === undefined || doc.daysUntilExpiry < 0 || doc.daysUntilExpiry > 90)) return false;
      if (filterStatus === 'valid' && (doc.daysUntilExpiry === undefined || doc.daysUntilExpiry < 0)) return false;
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        (doc.nomeFile?.toLowerCase().includes(query)) ||
        (doc.scheduledCourse?.course?.title?.toLowerCase().includes(query)) ||
        (doc.person?.firstName?.toLowerCase().includes(query)) ||
        (doc.person?.lastName?.toLowerCase().includes(query)) ||
        (doc.trainer?.firstName?.toLowerCase().includes(query)) ||
        (doc.trainer?.lastName?.toLowerCase().includes(query))
      );
    }

    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header with Toggle */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Documenti Corsi
          </h1>
          <p className="text-gray-500">
            Gestisci documenti corsi
          </p>
        </div>

        {/* View Toggle Switch */}
        <div className="flex items-center bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('cards')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${viewMode === 'cards'
                ? 'bg-white shadow-sm text-orange-600'
                : 'text-gray-600 hover:text-gray-800'
              }`}
          >
            <LayoutGrid className="h-4 w-4" />
            Corsi
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${viewMode === 'table'
                ? 'bg-white shadow-sm text-orange-600'
                : 'text-gray-600 hover:text-gray-800'
              }`}
          >
            <Table className="h-4 w-4" />
            Tutti i Documenti
          </button>
        </div>
      </div>

      {/* Conditional Content Based on View Mode */}
      {viewMode === 'table' ? (
        <DocumentListPage />
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Totale</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <FileText className="h-8 w-8 text-gray-400" />
              </div>
            </div>

            <div
              className="bg-blue-50 rounded-xl shadow-sm border border-blue-200 p-4 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setFilterType(filterType === 'attestato' ? 'all' : 'attestato')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 mb-1">Attestati</p>
                  <p className="text-2xl font-bold text-blue-900">{stats.attestati}</p>
                </div>
                <Award className="h-8 w-8 text-blue-500" />
              </div>
            </div>

            <div
              className="bg-green-50 rounded-xl shadow-sm border border-green-200 p-4 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setFilterType(filterType === 'registro' ? 'all' : 'registro')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 mb-1">Registri</p>
                  <p className="text-2xl font-bold text-green-900">{stats.registri}</p>
                </div>
                <ClipboardList className="h-8 w-8 text-green-500" />
              </div>
            </div>

            <div
              className="bg-purple-50 rounded-xl shadow-sm border border-purple-200 p-4 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setFilterType(filterType === 'lettera' ? 'all' : 'lettera')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600 mb-1">Lettere</p>
                  <p className="text-2xl font-bold text-purple-900">{stats.lettere}</p>
                </div>
                <FileText className="h-8 w-8 text-purple-500" />
              </div>
            </div>

            <div
              className="bg-orange-50 rounded-xl shadow-sm border border-orange-200 p-4 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setFilterStatus(filterStatus === 'expiring' ? 'all' : 'expiring')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-600 mb-1">In Scadenza</p>
                  <p className="text-2xl font-bold text-orange-900">{stats.expiringSoon}</p>
                </div>
                <Clock className="h-8 w-8 text-orange-500" />
              </div>
            </div>

            <div
              className="bg-red-50 rounded-xl shadow-sm border border-red-200 p-4 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setFilterStatus(filterStatus === 'expired' ? 'all' : 'expired')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-600 mb-1">Scaduti</p>
                  <p className="text-2xl font-bold text-red-900">{stats.expired}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-500" />
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cerca per nome file, corso, persona, formatore..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Type Filter */}
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="all">Tutti i tipi</option>
                <option value="attestato">Attestati</option>
                <option value="registro">Registri</option>
                <option value="lettera">Lettere</option>
              </select>

              {/* Status Filter (only for attestati) */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                disabled={filterType !== 'all' && filterType !== 'attestato'}
              >
                <option value="all">Tutti gli stati</option>
                <option value="valid">Validi</option>
                <option value="expiring">In scadenza (90gg)</option>
                <option value="expired">Scaduti</option>
              </select>
            </div>

            {/* Active filters */}
            {(filterType !== 'all' || filterStatus !== 'all' || searchQuery) && (
              <div className="flex flex-wrap gap-2 mt-4">
                {filterType !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                    Tipo: {filterType}
                    <button onClick={() => setFilterType('all')} className="hover:bg-blue-200 rounded-full p-0.5">
                      <XCircle className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {filterStatus !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm">
                    Stato: {filterStatus}
                    <button onClick={() => setFilterStatus('all')} className="hover:bg-orange-200 rounded-full p-0.5">
                      <XCircle className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {searchQuery && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                    Cerca: "{searchQuery}"
                    <button onClick={() => setSearchQuery('')} className="hover:bg-gray-200 rounded-full p-0.5">
                      <XCircle className="h-3 w-3" />
                    </button>
                  </span>
                )}
                <button
                  onClick={() => {
                    setFilterType('all');
                    setFilterStatus('all');
                    setSearchQuery('');
                  }}
                  className="text-sm text-gray-600 hover:text-gray-900 underline"
                >
                  Cancella tutto
                </button>
              </div>
            )}
          </div>

          {/* Results count */}
          <div className="mb-4 text-sm text-gray-600">
            {filteredDocuments.length === documents.length
              ? `${documents.length} documenti totali`
              : `${filteredDocuments.length} di ${documents.length} documenti`}
          </div>

          {/* Documents Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredDocuments.map((doc) => {
              const typeInfo = getTypeInfo(doc.type);
              const TypeIcon = typeInfo.icon;
              const expiryStatus = getExpiryStatus(doc);
              const ExpiryIcon = expiryStatus?.icon;

              return (
                <div
                  key={doc.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
                >
                  {/* Card Header */}
                  <div className="p-4 border-b border-gray-100">
                    <div className="flex items-start justify-between mb-3">
                      <div className={`p-2 rounded-lg ${typeInfo.color}`}>
                        <TypeIcon className="h-5 w-5" />
                      </div>
                      <div className="flex items-center gap-2">
                        {doc.url && (
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Visualizza"
                          >
                            <Eye className="h-4 w-4" />
                          </a>
                        )}
                        {doc.fileUrl && (
                          <a
                            href={doc.fileUrl}
                            download
                            className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Scarica"
                          >
                            <Download className="h-4 w-4" />
                          </a>
                        )}
                        <button
                          onClick={() => handleDelete(doc)}
                          className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Elimina"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">
                      {doc.nomeFile}
                    </h3>

                    {doc.type === 'attestato' && doc.numeroProgressivo && (
                      <p className="text-xs text-gray-500">
                        N° {doc.numeroProgressivo}/{doc.annoProgressivo}
                      </p>
                    )}
                  </div>

                  {/* Card Body */}
                  <div className="p-4 space-y-3">
                    {/* Course Info */}
                    {doc.scheduledCourse && (
                      <div className="flex items-start gap-2">
                        <Building2 className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {doc.scheduledCourse.course.title}
                          </p>
                          <p className="text-xs text-gray-500">
                            {doc.scheduledCourse.course.code} • {doc.scheduledCourse.course.category}
                          </p>
                          {/* Course dates */}
                          <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                            <Calendar className="h-3 w-3" />
                            <span>
                              {format(new Date(doc.scheduledCourse.startDate), 'dd/MM/yyyy', { locale: it })}
                              {doc.scheduledCourse.endDate && doc.scheduledCourse.endDate !== doc.scheduledCourse.startDate && (
                                <> - {format(new Date(doc.scheduledCourse.endDate), 'dd/MM/yyyy', { locale: it })}</>
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Person Info (for attestati) */}
                    {doc.person && (
                      <div className="flex items-start gap-2">
                        <User className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-gray-900 truncate">
                            {doc.person.firstName} {doc.person.lastName}
                          </p>
                          <p className="text-xs text-gray-500">{doc.person.taxCode}</p>
                        </div>
                      </div>
                    )}

                    {/* Trainer Info (for lettere) */}
                    {doc.trainer && doc.type === 'lettera' && (
                      <div className="flex items-start gap-2">
                        <User className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-gray-900 truncate">
                            {doc.trainer.firstName} {doc.trainer.lastName}
                          </p>
                          <p className="text-xs text-gray-500">Formatore</p>
                        </div>
                      </div>
                    )}

                    {/* Generation Date */}
                    {doc.dataGenerazione && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <p className="text-sm text-gray-600">
                          Generato il {format(new Date(doc.dataGenerazione), 'dd MMM yyyy', { locale: it })}
                        </p>
                      </div>
                    )}

                    {/* Expiry Status (for attestati) */}
                    {expiryStatus && ExpiryIcon && (
                      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${expiryStatus.color}`}>
                        <ExpiryIcon className="h-4 w-4 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{expiryStatus.label}</p>
                          {doc.expiryDate && (
                            <p className="text-xs opacity-75">
                              Scadenza: {format(new Date(doc.expiryDate), 'dd MMM yyyy', { locale: it })}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Empty State */}
          {filteredDocuments.length === 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Nessun documento trovato
              </h3>
              <p className="text-gray-600 mb-4">
                {searchQuery || filterType !== 'all' || filterStatus !== 'all'
                  ? 'Prova a modificare i filtri di ricerca'
                  : 'Non ci sono ancora documenti generati'}
              </p>
              {(searchQuery || filterType !== 'all' || filterStatus !== 'all') && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setFilterType('all');
                    setFilterStatus('all');
                  }}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                  Cancella filtri
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DocumentsCorsiNew;
