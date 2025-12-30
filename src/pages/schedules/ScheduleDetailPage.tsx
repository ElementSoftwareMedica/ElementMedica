import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useConfirmDialog } from '../../contexts/ConfirmDialogContext';
import {
  BookOpen,
  Building2,
  Calendar,
  ChevronRight,
  Clock,
  Edit,
  Eye,
  GraduationCap,
  MapPin,
  Shield,
  Trash2,
  User,
  Users,
  FileText,
  Award,
  ClipboardList,
  File,
  Download,
  Plus,
  Folder,
  FolderArchive,
  Loader2,
  ClipboardCheck
} from 'lucide-react';
import { getLoadingErrorMessage } from '../../utils/errorUtils';
import { dbStatusToItalian, statusBadgeColors, statusBadgeHoverColors } from '../../utils/scheduleStatusColors';
import { getCourseTypeLabel, getRiskLevelLabel } from '../../utils/courseLabels';
import { apiGet, apiDelete } from '../../services/api';
import { remove } from '../../services/apiClient';
import PreventiviModal from '../../components/schedules/components/PreventiviModal';
import { GenerateCertificatesDialog } from '../../components/schedules/GenerateCertificatesDialog';
import { GenerateRegistriModal } from '../../components/schedules/components/GenerateRegistriModal';
import { GenerateLettereModal } from '../../components/schedules/components/GenerateLettereModal';
import preventiviService from '../../services/preventiviService';
import attestatiService from '../../services/attestatiService';
import registriPresenzeService from '../../services/registriPresenzeService';
import lettereIncaricoService from '../../services/lettereIncaricoService';
import TestManager from '../../components/schedules/components/TestManager';

interface Schedule {
  id: string;
  courseId: string;
  startDate: string;
  endDate: string;
  location?: string;
  maxParticipants?: number;
  notes?: string;
  deliveryMode?: string;
  status?: string;
  createdAt: string;
  updatedAt: string;
  attendance?: Array<{
    date: string;
    employee_ids: string[];
  }>;
  course: {
    id: string;
    name: string;
    title?: string;
    duration?: number;
    description?: string;
    riskLevel?: 'ALTO' | 'MEDIO' | 'BASSO';
    courseType?: 'PRIMO_CORSO' | 'AGGIORNAMENTO';
    isPublic?: boolean;
  };
  sessions?: Array<{
    id: string;
    date: string;
    start: string;
    end: string;
    duration?: number;
    trainer?: {
      id: string;
      firstName: string;
      lastName: string;
      email?: string;
    };
    coTrainer?: {
      id: string;
      firstName: string;
      lastName: string;
      email?: string;
    };
  }>;
  companies?: Array<{
    company: {
      id: string;
      ragioneSociale?: string;
      name?: string;
    };
  }>;
  enrollments?: Array<{
    id: string;
    status?: string;
    person: {
      id: string;
      firstName: string;
      lastName: string;
      email?: string;
      companyId?: string;
      company?: {
        id: string;
        ragioneSociale?: string;
        name?: string;
      };
    };
  }>;
}

const ScheduleDetailPage: React.FC = () => {
  const { confirmDelete } = useConfirmDialog();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Documents state
  const [documents, setDocuments] = useState<{
    preventivi: any[];
    attestati: any[];
    registri: any[];
    lettere: any[];
  }>({
    preventivi: [],
    attestati: [],
    registri: [],
    lettere: []
  });
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [showPreventiviModal, setShowPreventiviModal] = useState(false);
  const [showGenerateAttestatiDialog, setShowGenerateAttestatiDialog] = useState(false);
  const [showGenerateRegistriModal, setShowGenerateRegistriModal] = useState(false);
  const [showGenerateLettereModal, setShowGenerateLettereModal] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [downloadingZip, setDownloadingZip] = useState<string | null>(null);

  // Funzione per download ZIP
  const handleDownloadZip = async (type: 'attestati' | 'registri' | 'lettere') => {
    if (!id) return;
    setDownloadingZip(type);
    try {
      const docIds = documents[type].map((d: any) => d.id);
      if (docIds.length === 0) {
        setAlert({ type: 'error', message: 'Nessun documento da scaricare' });
        return;
      }

      switch (type) {
        case 'attestati':
          await attestatiService.downloadZipBatch(docIds);
          break;
        case 'registri':
          await registriPresenzeService.downloadZip(String(id), docIds);
          break;
        case 'lettere':
          await lettereIncaricoService.downloadZip(String(id), docIds);
          break;
      }
    } catch (err) {
      console.error('Error downloading ZIP:', err);
      setAlert({ type: 'error', message: 'Errore durante il download del file ZIP' });
      setTimeout(() => setAlert(null), 3000);
    } finally {
      setDownloadingZip(null);
    }
  };

  useEffect(() => {
    fetchScheduleData();
  }, [id]);

  const fetchScheduleData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet(`/api/v1/schedules/${id}`);
      setSchedule(data as Schedule | null);
      // Fetch documenti
      await fetchDocuments();
    } catch (err) {
      console.error('Error fetching schedule:', err);
      setError(getLoadingErrorMessage('generic', err)); // 'schedules' not in union, use 'generic'
      setSchedule(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async () => {
    if (!id) return;
    setLoadingDocs(true);
    try {
      const [preventiviRes, attestatiRes, registriRes, lettereRes] = await Promise.all([
        apiGet(`/api/v1/preventivi?scheduleId=${id}`).catch(() => ({ data: [] })),
        apiGet(`/api/v1/attestati?scheduleId=${id}`).catch(() => []),
        apiGet(`/api/v1/registri-presenze?scheduleId=${id}`).catch(() => []),
        apiGet(`/api/v1/lettere-incarico?scheduleId=${id}`).catch(() => [])
      ]);

      console.log('📄 Documents fetched:', {
        preventivi: preventiviRes,
        attestati: attestatiRes,
        registri: registriRes,
        lettere: lettereRes
      });

      // Backend returns { success, data: { preventivi: [...], ... } } for preventivi
      const preventiviData = (preventiviRes as any)?.data?.preventivi || (preventiviRes as any)?.data || [];

      setDocuments({
        preventivi: Array.isArray(preventiviData) ? preventiviData : [],
        attestati: Array.isArray(attestatiRes) ? attestatiRes : [],
        registri: Array.isArray(registriRes) ? registriRes : [],
        lettere: Array.isArray(lettereRes) ? lettereRes : []
      });
    } catch (err) {
      console.error('Error fetching documents:', err);
    } finally {
      setLoadingDocs(false);
    }
  };

  const handleDeleteDocument = async (type: string, docId: string) => {
    const shouldDelete = await confirmDelete('questo documento');
    if (!shouldDelete) return;

    try {
      // Construct correct endpoint for each document type
      const endpoint = type === 'preventivi'
        ? `/api/preventivi/${docId}`
        : `/api/v1/${type}/${docId}`;

      // Use apiDelete instead of remove to avoid endpoint construction issues
      await apiDelete(endpoint);
      setAlert({ type: 'success', message: 'Documento eliminato con successo' });
      await fetchDocuments();
      setTimeout(() => setAlert(null), 3000);
    } catch (err) {
      console.error('Error deleting document:', err);
      setAlert({ type: 'error', message: 'Errore durante l\'eliminazione del documento' });
      setTimeout(() => setAlert(null), 3000);
    }
  };

  const handleDownloadDocument = async (type: string, docId: string, filename: string) => {
    try {
      // Use dedicated services with proper authentication handling
      switch (type) {
        case 'preventivi':
          await preventiviService.download(docId);
          break;
        case 'attestati':
          await attestatiService.download(docId);
          break;
        case 'registri-presenze':
          await registriPresenzeService.download(docId);
          break;
        case 'lettere-incarico':
          await lettereIncaricoService.download(docId);
          break;
        default:
          throw new Error(`Unknown document type: ${type}`);
      }
      // No need for success alert - download happens automatically
    } catch (err) {
      console.error('Error downloading document:', err);
      setAlert({ type: 'error', message: 'Errore durante il download del documento' });
      setTimeout(() => setAlert(null), 3000);
    }
  };

  // ZIP download functions
  const handleDownloadZipAttestati = async () => {
    if (!id || documents.attestati.length === 0) return;
    try {
      await attestatiService.downloadZipBatch(documents.attestati.map((d: any) => d.id));
    } catch (err) {
      console.error('Error downloading ZIP attestati:', err);
      setAlert({ type: 'error', message: 'Errore durante il download ZIP' });
      setTimeout(() => setAlert(null), 3000);
    }
  };

  const handleDownloadZipRegistri = async () => {
    if (!id || documents.registri.length === 0) return;
    try {
      await registriPresenzeService.downloadZip(id);
    } catch (err) {
      console.error('Error downloading ZIP registri:', err);
      setAlert({ type: 'error', message: 'Errore durante il download ZIP' });
      setTimeout(() => setAlert(null), 3000);
    }
  };

  const handleDownloadZipLettere = async () => {
    if (!id || documents.lettere.length === 0) return;
    try {
      await lettereIncaricoService.downloadZip(id);
    } catch (err) {
      console.error('Error downloading ZIP lettere:', err);
      setAlert({ type: 'error', message: 'Errore durante il download ZIP' });
      setTimeout(() => setAlert(null), 3000);
    }
  };

  const handleDelete = async () => {
    const shouldDelete = await confirmDelete('questo corso programmato');
    if (!shouldDelete) return;

    try {
      await remove('schedules', id!);
      setAlert({ type: 'success', message: 'Corso programmato eliminato con successo' });
      setTimeout(() => navigate('/schedules'), 1500);
    } catch (err) {
      console.error('Error deleting schedule:', err);
      setAlert({ type: 'error', message: 'Errore durante l\'eliminazione del corso programmato' });
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!schedule || isUpdatingStatus) return;

    setIsUpdatingStatus(true);
    try {
      const api = (await import('../../services/api')).default;
      console.log('[ScheduleDetailPage] 🔄 Updating status to:', newStatus, 'for schedule:', id);

      // Send only the status field, not the entire schedule object
      await api.put(`/schedules/${id}`, { status: newStatus });

      console.log('[ScheduleDetailPage] ✅ Status updated successfully');
      setSchedule({ ...schedule, status: newStatus });
      setAlert({ type: 'success', message: 'Stato aggiornato con successo' });
      setTimeout(() => setAlert(null), 3000);
    } catch (err: any) {
      console.error('[ScheduleDetailPage] ❌ Error updating status:', {
        error: err,
        message: err?.message,
        response: err?.response?.data,
        status: err?.response?.status
      });
      const errorMsg = err?.response?.data?.message || err?.response?.data?.error || 'Errore durante l\'aggiornamento dello stato';
      setAlert({ type: 'error', message: errorMsg });
      setTimeout(() => setAlert(null), 3000);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatTime = (timeStr: string) => {
    return timeStr.substring(0, 5); // HH:MM
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDeliveryModeLabel = (mode?: string) => {
    switch (mode) {
      case 'IN_PERSON': return 'In presenza';
      case 'ONLINE': return 'Online';
      case 'HYBRID': return 'Ibrido';
      case 'SELF_PACED': return 'Autoapprendimento';
      default: return 'Non specificato';
    }
  };

  const getStatusBadge = (status?: string) => {
    const statusMap: Record<string, { label: string; color: string }> = {
      'PENDING': { label: 'In attesa', color: 'bg-yellow-100 text-yellow-800' },
      'CONFIRMED': { label: 'Confermato', color: 'bg-green-100 text-green-800' },
      'CANCELLED': { label: 'Annullato', color: 'bg-red-100 text-red-800' },
      'COMPLETED': { label: 'Completato', color: 'bg-blue-100 text-blue-800' },
    };

    const statusInfo = statusMap[status || 'PENDING'] || { label: status || 'N/D', color: 'bg-gray-100 text-gray-800' };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
        {statusInfo.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-80">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Caricamento...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-80">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600">Errore nel caricamento</h2>
          <p className="text-gray-600 mt-2">{error}</p>
          <Link to="/schedules" className="mt-4 inline-block text-blue-600 hover:text-blue-800">
            Torna ai Corsi Programmati
          </Link>
        </div>
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="flex items-center justify-center h-80">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-800">Corso programmato non trovato</h2>
          <p className="text-gray-600 mt-2">Il corso che stai cercando non esiste o è stato rimosso.</p>
          <Link to="/schedules" className="mt-4 inline-block text-blue-600 hover:text-blue-800">
            Torna ai Corsi Programmati
          </Link>
        </div>
      </div>
    );
  }

  const courseName = schedule.course.title || schedule.course.name;
  const companyNames = schedule.companies?.map(c => c.company.ragioneSociale || c.company.name).join(', ') || 'Nessuna azienda';

  return (
    <div className="space-y-6">
      {/* Alert */}
      {alert && (
        <div className={`p-4 rounded-lg ${alert.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {alert.message}
        </div>
      )}

      {/* Back link */}
      <div>
        <Link
          to="/schedules"
          className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
        >
          <span className="transform rotate-180">
            <ChevronRight className="h-4 w-4 mr-1" />
          </span>
          Torna ai Corsi Programmati
        </Link>
      </div>

      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div className="flex items-center">
            <div className="h-16 w-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <GraduationCap className="h-8 w-8 text-white" />
            </div>
            <div className="ml-4">
              <h1 className="text-2xl font-bold text-gray-800">{courseName}</h1>
              <p className="text-sm text-gray-600 mt-1">{companyNames}</p>
              <div className="mt-2">
                <select
                  value={schedule.status || 'PENDING'}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  disabled={isUpdatingStatus}
                  className={`
                    px-3 py-1.5 rounded-full text-sm font-medium cursor-pointer transition-all
                    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                    disabled:opacity-50 disabled:cursor-not-allowed border-0
                    ${statusBadgeColors[dbStatusToItalian(schedule.status || 'PENDING')] || 'bg-gray-100 text-gray-800'} 
                    ${statusBadgeHoverColors[dbStatusToItalian(schedule.status || 'PENDING')] || 'hover:bg-gray-200'}
                  `}
                  style={{
                    appearance: 'none',
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
                    backgroundPosition: 'right 0.5rem center',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '1.25em 1.25em',
                    paddingRight: '2.5rem'
                  }}
                >
                  <option value="PENDING">Preventivo</option>
                  <option value="CONFIRMED">Confermato</option>
                  <option value="ACTIVE">Attivo</option>
                  <option value="COMPLETED">Completato</option>
                  <option value="CANCELLED">Cancellato</option>
                  <option value="SUSPENDED">Sospeso</option>
                </select>
              </div>
            </div>
          </div>
          <div className="mt-4 md:mt-0 flex gap-2">
            <button
              onClick={() => navigate(`/schedules?openModal=true&scheduleId=${schedule.id}`)}
              className="btn-primary flex items-center rounded-full"
            >
              <Edit className="h-4 w-4 mr-1" />
              Modifica
            </button>
            <button
              onClick={handleDelete}
              className="btn-danger flex items-center rounded-full"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Elimina
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Course Info - Compatto */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-4 py-3 border-b border-gray-200">
              <h2 className="text-base font-semibold text-gray-800 flex items-center">
                <BookOpen className="h-4 w-4 mr-2" />
                Informazioni Corso
              </h2>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-2">
                <div>
                  <label className="text-xs font-medium text-gray-500">Corso</label>
                  <p className="text-sm text-gray-900 truncate" title={courseName}>{courseName}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Modalità</label>
                  <p className="text-sm text-gray-900">{getDeliveryModeLabel(schedule.deliveryMode)}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Inizio</label>
                  <p className="text-sm text-gray-900 flex items-center">
                    <Calendar className="h-3 w-3 mr-1 text-gray-400" />
                    {formatDate(schedule.startDate)}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Fine</label>
                  <p className="text-sm text-gray-900 flex items-center">
                    <Calendar className="h-3 w-3 mr-1 text-gray-400" />
                    {formatDate(schedule.endDate)}
                  </p>
                </div>
                {schedule.course?.riskLevel && (
                  <div>
                    <label className="text-xs font-medium text-gray-500">Rischio</label>
                    <p className="mt-0.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${schedule.course.riskLevel === 'ALTO' ? 'bg-red-100 text-red-800' :
                        schedule.course.riskLevel === 'MEDIO' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                        <Shield className="h-2.5 w-2.5 mr-0.5" />
                        {getRiskLevelLabel(schedule.course.riskLevel, schedule.course.title)}
                      </span>
                    </p>
                  </div>
                )}
                {schedule.course?.courseType && (
                  <div>
                    <label className="text-xs font-medium text-gray-500">Tipo</label>
                    <p className="mt-0.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${schedule.course.courseType === 'PRIMO_CORSO' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                        }`}>
                        <GraduationCap className="h-2.5 w-2.5 mr-0.5" />
                        {getCourseTypeLabel(schedule.course.courseType)}
                      </span>
                    </p>
                  </div>
                )}
                <div>
                  <label className="text-xs font-medium text-gray-500">Visibilità</label>
                  <p className="mt-0.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${schedule.course?.isPublic ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                      }`}>
                      <Eye className="h-2.5 w-2.5 mr-0.5" />
                      {schedule.course?.isPublic ? 'Pubblico' : 'Privato'}
                    </span>
                  </p>
                </div>
                {schedule.location && (
                  <div>
                    <label className="text-xs font-medium text-gray-500">Sede</label>
                    <p className="text-sm text-gray-900 flex items-center truncate" title={schedule.location}>
                      <MapPin className="h-3 w-3 mr-1 text-gray-400 flex-shrink-0" />
                      {schedule.location}
                    </p>
                  </div>
                )}
                <div>
                  <label className="text-xs font-medium text-gray-500">Max Part.</label>
                  <p className="text-sm text-gray-900 flex items-center">
                    <Users className="h-3 w-3 mr-1 text-gray-400" />
                    {schedule.maxParticipants || 'N/S'}
                  </p>
                </div>
              </div>
              {schedule.notes && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <label className="text-xs font-medium text-gray-500">Note</label>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{schedule.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Sessions - 2 Columns Layout with Participants */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                Sessioni ({schedule.sessions?.length || 0})
              </h2>
            </div>
            <div className="p-6">
              {schedule.sessions && schedule.sessions.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {schedule.sessions.map((session, index) => {
                    // ✅ FIX: Filtra partecipanti per sessione usando attendance JSON
                    const sessionDate = session.date.split('T')[0];
                    const attendanceForSession = schedule.attendance?.find(a => a.date === sessionDate);
                    const sessionParticipantIds = attendanceForSession?.employee_ids || [];

                    // Filtra e ordina alfabeticamente per cognome
                    const allParticipants = (schedule.enrollments || [])
                      .filter(enrollment => sessionParticipantIds.includes(enrollment.person.id))
                      .sort((a, b) => a.person.lastName.localeCompare(b.person.lastName));

                    return (
                      <div key={session.id} className="border-2 border-gray-200 rounded-xl overflow-hidden flex flex-col">
                        {/* Session Header */}
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4">
                          <h3 className="font-semibold text-lg text-gray-900 mb-3">Sessione {index + 1}</h3>

                          <div className="space-y-2 mb-3">
                            <p className="text-sm text-gray-700 flex items-center">
                              <Calendar className="h-4 w-4 mr-2 text-blue-600 flex-shrink-0" />
                              {formatDate(session.date)}
                            </p>
                            <p className="text-sm text-gray-700 flex items-center">
                              <Clock className="h-4 w-4 mr-2 text-blue-600 flex-shrink-0" />
                              {formatTime(session.start)} - {formatTime(session.end)}
                            </p>
                          </div>

                          {/* Trainers */}
                          <div className="space-y-2 border-t border-blue-100 pt-3">
                            {session.trainer && (
                              <div className="flex items-start">
                                <User className="h-4 w-4 mr-2 text-blue-600 flex-shrink-0 mt-0.5" />
                                <div>
                                  <p className="text-xs text-gray-600 font-medium">Formatore</p>
                                  <Link
                                    to={`/persons/${session.trainer.id}`}
                                    className="text-sm font-semibold text-blue-600 hover:text-blue-800"
                                  >
                                    {session.trainer.firstName} {session.trainer.lastName}
                                  </Link>
                                </div>
                              </div>
                            )}
                            {session.coTrainer && (
                              <div className="flex items-start">
                                <User className="h-4 w-4 mr-2 text-indigo-600 flex-shrink-0 mt-0.5" />
                                <div>
                                  <p className="text-xs text-gray-600 font-medium">Co-Formatore</p>
                                  <Link
                                    to={`/persons/${session.coTrainer.id}`}
                                    className="text-sm font-semibold text-indigo-600 hover:text-indigo-800"
                                  >
                                    {session.coTrainer.firstName} {session.coTrainer.lastName}
                                  </Link>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Session Participants */}
                        <div className="p-4 bg-white flex-1">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-semibold text-gray-700 flex items-center">
                              <Users className="h-4 w-4 mr-2 text-gray-500" />
                              Partecipanti ({allParticipants.length})
                            </h4>
                          </div>
                          {allParticipants.length > 0 ? (
                            <div className="space-y-2 max-h-80 overflow-y-auto">
                              {allParticipants.map((enrollment) => (
                                <Link
                                  key={enrollment.id}
                                  to={`/persons/${enrollment.person.id}`}
                                  className="flex items-center p-2 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-blue-300 transition group"
                                >
                                  <div className="h-8 w-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold mr-2 flex-shrink-0">
                                    {enrollment.person.lastName[0]}{enrollment.person.firstName[0]}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600">
                                      {enrollment.person.lastName} {enrollment.person.firstName}
                                    </p>
                                    {enrollment.person.email && (
                                      <p className="text-xs text-gray-500 truncate">{enrollment.person.email}</p>
                                    )}
                                  </div>
                                </Link>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500 text-center py-3 bg-gray-50 rounded-lg">
                              Nessun partecipante iscritto
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">Nessuna sessione programmata</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Companies */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                <Building2 className="h-5 w-5 mr-2" />
                Aziende
              </h2>
            </div>
            <div className="p-6">
              {schedule.companies && schedule.companies.length > 0 ? (
                <div className="space-y-2">
                  {schedule.companies.map((item) => (
                    <Link
                      key={item.company.id}
                      to={`/companies/${item.company.id}`}
                      className="block p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                    >
                      <p className="text-sm font-medium text-blue-600 hover:text-blue-800">
                        {item.company.ragioneSociale || item.company.name}
                      </p>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">Nessuna azienda associata</p>
              )}
            </div>
          </div>

          {/* Documenti Generati */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                  <Folder className="h-5 w-5 mr-2" />
                  Documenti
                </h2>
                {loadingDocs && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                )}
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {/* Preventivi */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <FileText className="h-4 w-4 mr-2 text-violet-600" />
                      <span className="text-sm font-medium text-gray-700">Preventivi</span>
                      <span className="ml-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-violet-100 text-violet-800">
                        {documents.preventivi.length}
                      </span>
                    </div>
                    <button
                      onClick={() => setShowPreventiviModal(true)}
                      className="p-1 text-violet-600 hover:bg-violet-50 rounded transition"
                      title="Genera Preventivo"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  {documents.preventivi.length > 0 ? (
                    <div className="space-y-1 ml-6">
                      {documents.preventivi.map((doc: any) => {
                        // Format filename like modal: yyyy.mm.gg - Nome azienda
                        const date = new Date(doc.dataEmissione);
                        const formattedDate = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
                        const companyName = doc.azienda?.ragioneSociale || 'Azienda';
                        const displayName = doc.nomeFile || `${formattedDate} - ${companyName}`;

                        // Use imponibile (price without VAT) or importoFinale (price with VAT)
                        // Handle Prisma Decimal conversion
                        const imponibileValue = typeof doc.imponibile === 'object' && doc.imponibile !== null
                          ? parseFloat(doc.imponibile.toString())
                          : parseFloat(doc.imponibile || 0);
                        const importoFinaleValue = typeof doc.importoFinale === 'object' && doc.importoFinale !== null
                          ? parseFloat(doc.importoFinale.toString())
                          : parseFloat(doc.importoFinale || 0);
                        const price = (imponibileValue || importoFinaleValue || 0).toFixed(2);

                        return (
                          <div key={doc.id} className="flex items-center justify-between p-2 border border-gray-200 rounded hover:bg-gray-50 group">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-gray-900 truncate">
                                {displayName}
                              </p>
                              <p className="text-xs text-gray-500">
                                €{price}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleDownloadDocument('preventivi', doc.id, displayName)}
                                className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                title="Download"
                              >
                                <Download className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => handleDeleteDocument('preventivi', doc.id)}
                                className="p-1 text-red-600 hover:bg-red-50 rounded"
                                title="Elimina"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 ml-6">Nessun preventivo generato</p>
                  )}
                </div>

                {/* Attestati */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <Award className="h-4 w-4 mr-2 text-green-600" />
                      <span className="text-sm font-medium text-gray-700">Attestati</span>
                      <span className="ml-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        {documents.attestati.length}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {documents.attestati.length > 1 && (
                        <button
                          onClick={handleDownloadZipAttestati}
                          className="p-1 text-green-600 hover:bg-green-50 rounded transition"
                          title="Scarica ZIP Attestati"
                        >
                          <FolderArchive className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => setShowGenerateAttestatiDialog(true)}
                        className="p-1 text-green-600 hover:bg-green-50 rounded transition"
                        title="Genera Attestati"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  {documents.attestati.length > 0 ? (
                    <div className="space-y-1 ml-6">
                      {documents.attestati.map((doc: any) => (
                        <div key={doc.id} className="flex items-center justify-between p-2 border border-gray-200 rounded hover:bg-gray-50 group">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-900 truncate">
                              {doc.person?.firstName && doc.person?.lastName
                                ? `${doc.person.firstName} ${doc.person.lastName}`
                                : doc.nomeFile || `Attestato ${doc.numeroProgressivo || doc.id?.slice(0, 8) || 'N/A'}`}
                            </p>
                            <p className="text-xs text-gray-500">
                              {doc.numeroProgressivo && doc.annoProgressivo
                                ? `N° ${doc.numeroProgressivo}/${doc.annoProgressivo}`
                                : doc.personName || 'Partecipante'}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleDownloadDocument('attestati', doc.id, doc.nomeFile)}
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                              title="Download"
                            >
                              <Download className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteDocument('attestati', doc.id)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded"
                              title="Elimina"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 ml-6">Nessun attestato generato</p>
                  )}
                </div>

                {/* Registri */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <ClipboardList className="h-4 w-4 mr-2 text-yellow-600" />
                      <span className="text-sm font-medium text-gray-700">Registri</span>
                      <span className="ml-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                        {documents.registri.length}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {documents.registri.length > 1 && (
                        <button
                          onClick={handleDownloadZipRegistri}
                          className="p-1 text-yellow-600 hover:bg-yellow-50 rounded transition"
                          title="Scarica ZIP Registri"
                        >
                          <FolderArchive className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => setShowGenerateRegistriModal(true)}
                        className="p-1 text-yellow-600 hover:bg-yellow-50 rounded transition"
                        title="Genera Registro Presenze"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  {documents.registri.length > 0 ? (
                    <div className="space-y-1 ml-6">
                      {documents.registri.map((doc: any) => (
                        <div key={doc.id} className="flex items-center justify-between p-2 border border-gray-200 rounded hover:bg-gray-50 group">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-900 truncate">
                              {doc.nomeFile || `Registro ${doc.id}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleDownloadDocument('registri-presenze', doc.id, doc.nomeFile)}
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                              title="Download"
                            >
                              <Download className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteDocument('registri-presenze', doc.id)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded"
                              title="Elimina"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 ml-6">Nessun registro generato</p>
                  )}
                </div>

                {/* Lettere */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <File className="h-4 w-4 mr-2 text-blue-600" />
                      <span className="text-sm font-medium text-gray-700">Lettere</span>
                      <span className="ml-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        {documents.lettere.length}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {documents.lettere.length > 1 && (
                        <button
                          onClick={handleDownloadZipLettere}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded transition"
                          title="Scarica ZIP Lettere di Incarico"
                        >
                          <FolderArchive className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => setShowGenerateLettereModal(true)}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded transition"
                        title="Genera Lettere di Incarico"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  {documents.lettere.length > 0 ? (
                    <div className="space-y-1 ml-6">
                      {documents.lettere.map((doc: any) => (
                        <div key={doc.id} className="flex items-center justify-between p-2 border border-gray-200 rounded hover:bg-gray-50 group">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-900 truncate">
                              {doc.nomeFile || `Lettera ${doc.id}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleDownloadDocument('lettere-incarico', doc.id, doc.nomeFile)}
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                              title="Download"
                            >
                              <Download className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteDocument('lettere-incarico', doc.id)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded"
                              title="Elimina"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 ml-6">Nessuna lettera generata</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Test e Questionari */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                  <ClipboardCheck className="h-5 w-5 mr-2" />
                  Test e Questionari
                </h2>
              </div>
            </div>
            <div className="p-6">
              {schedule && (
                <TestManager
                  scheduleId={schedule.id}
                  courseId={schedule.course?.id}
                  riskLevel={schedule.course?.riskLevel}
                  courseType={schedule.course?.courseType}
                  persons={schedule.enrollments?.map(e => ({
                    id: e.person.id,
                    firstName: e.person.firstName,
                    lastName: e.person.lastName,
                    email: e.person.email || ''
                  })) || []}
                />
              )}
            </div>
          </div>

          {/* Meta Info */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">Metadata</h2>
            </div>
            <div className="p-6 space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500">Creato il</label>
                <p className="text-sm text-gray-900">{formatDateTime(schedule.createdAt)}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Ultimo aggiornamento</label>
                <p className="text-sm text-gray-900">{formatDateTime(schedule.updatedAt)}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">ID</label>
                <p className="text-xs text-gray-600 font-mono">{schedule.id}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Preventivi */}
      {showPreventiviModal && schedule && (() => {
        // Build attendance data from schedule.attendance JSON
        // Format: { [sessionIndex]: [personId1, personId2, ...] }
        const attendance: Record<number, (string | number)[]> = {};
        if (schedule.sessions && schedule.attendance) {
          schedule.sessions.forEach((session, index) => {
            const sessionDate = session.date.split('T')[0];
            const attendanceForSession = schedule.attendance?.find(a => a.date === sessionDate);
            attendance[index] = attendanceForSession?.employee_ids || [];
          });
        }

        // Ensure course has price field for pre-compilation
        const courseWithPrice = {
          ...schedule.course,
          price: (schedule.course as any).price ||
            (schedule.course as any).pricePerPerson ||
            (schedule.course as any).prezzo ||
            (schedule.course as any).prezzoBase ||
            0
        };

        const personsData = schedule.enrollments?.map(e => ({
          id: e.person.id,
          firstName: e.person.firstName,
          lastName: e.person.lastName,
          email: e.person.email,
          aziendaId: e.person.companyId
        })) || [];

        const companiesData = schedule.companies?.map(c => ({
          id: c.company.id,
          ragioneSociale: c.company.ragioneSociale || c.company.name || ''
        })) || [];

        console.log('[ScheduleDetailPage] 📋 Preparing PreventiviModal data:', {
          companiesCount: companiesData.length,
          companies: companiesData,
          personsCount: personsData.length,
          persons: personsData,
          attendanceKeys: Object.keys(attendance).length,
          attendance: attendance
        });

        return (
          <PreventiviModal
            isOpen={showPreventiviModal}
            onClose={() => {
              setShowPreventiviModal(false);
              fetchDocuments();
            }}
            selectedCompanies={companiesData}
            selectedCourse={courseWithPrice as any}
            dates={schedule.sessions?.map(s => ({
              date: s.date,
              startTime: s.start,
              endTime: s.end
            })) || []}
            scheduleId={schedule.id}
            attendance={attendance}
            persons={personsData}
            onPreventiviCreated={(ids) => {
              console.log('Preventivi created:', ids);
              setAlert({ type: 'success', message: `${ids.length} preventivo/i generato/i con successo` });
              fetchDocuments();
              setTimeout(() => setAlert(null), 3000);
            }}
          />
        );
      })()}

      {/* Dialog Genera Attestati */}
      {schedule && (
        <GenerateCertificatesDialog
          open={showGenerateAttestatiDialog}
          onOpenChange={setShowGenerateAttestatiDialog}
          schedule={{
            id: schedule.id,
            course: {
              title: schedule.course.title || schedule.course.name || 'Corso',
              validityYears: (schedule.course as any).validityYears
            },
            // Passa tutti i partecipanti in una singola "company" fittizia
            // dato che il dialog fa flatMap, questo funziona
            companies: [{
              company: {
                persons: schedule.enrollments
                  ?.map(e => ({
                    id: e.person.id,
                    firstName: e.person.firstName,
                    lastName: e.person.lastName,
                    cf: (e.person as any).cf || (e.person as any).taxCode || ''
                  })) || []
              }
            }]
          }}
          onSuccess={() => {
            setAlert({ type: 'success', message: 'Attestati generati con successo' });
            fetchDocuments();
            setTimeout(() => setAlert(null), 3000);
          }}
        />
      )}

      {/* Modal Genera Registri Presenze */}
      {schedule && (() => {
        // Build attendance data from schedule.attendance JSON
        // Format: { [sessionIndex]: [personId1, personId2, ...] }
        const registriAttendance: Record<number, (string | number)[]> = {};
        if (schedule.sessions && schedule.attendance) {
          schedule.sessions.forEach((session, index) => {
            const sessionDate = session.date.split('T')[0];
            const attendanceForSession = schedule.attendance?.find(a => a.date === sessionDate);
            registriAttendance[index] = attendanceForSession?.employee_ids || [];
          });
        }

        return (
          <GenerateRegistriModal
            isOpen={showGenerateRegistriModal}
            onClose={() => setShowGenerateRegistriModal(false)}
            scheduleId={schedule.id}
            dates={(schedule.sessions || []).map(s => ({
              date: s.date,
              startTime: s.start,
              endTime: s.end,
              trainerId: s.trainer?.id,
              sessionId: s.id,
              duration: 0 // verrà calcolato nel modal
            }))}
            attendance={registriAttendance}
            persons={(schedule.enrollments || []).map(e => ({
              id: e.person.id,
              firstName: e.person.firstName,
              lastName: e.person.lastName,
              companyId: e.person.companyId,
              company: e.person.company ? {
                id: e.person.company.id,
                ragioneSociale: e.person.company.ragioneSociale,
                name: e.person.company.name
              } : undefined
            }))}
            companies={(schedule.companies || []).map(c => ({
              id: c.company.id,
              ragioneSociale: c.company.ragioneSociale,
              name: c.company.name
            }))}
            trainers={
              // Estrai tutti i trainer dalle sessioni
              Array.from(
                new Map(
                  (schedule.sessions || [])
                    .filter(s => s.trainer)
                    .map(s => [s.trainer!.id, s.trainer!])
                ).values()
              ).map(t => ({
                id: t.id,
                firstName: t.firstName,
                lastName: t.lastName,
                email: (t as any).email,
                hourlyRate: (t as any).hourlyRate
              }))
            }
            onSuccess={() => {
              setAlert({ type: 'success', message: 'Registro presenze generato con successo' });
              fetchDocuments();
              setTimeout(() => setAlert(null), 3000);
            }}
          />
        );
      })()}

      {/* Generate Lettere di Incarico Modal */}
      {schedule && (() => {
        return (
          <GenerateLettereModal
            isOpen={showGenerateLettereModal}
            onClose={() => setShowGenerateLettereModal(false)}
            scheduleId={schedule.id}
            trainers={
              Array.from(
                new Map(
                  (schedule.sessions || [])
                    .filter(s => s.trainer)
                    .map(s => [s.trainer!.id, s.trainer!])
                ).values()
              ).map(t => ({
                id: t.id,
                firstName: t.firstName,
                lastName: t.lastName,
                email: (t as any).email,
                hourlyRate: (t as any).hourlyRate
              }))
            }
            dates={(schedule.sessions || []).map(s => ({
              date: s.date,
              start: s.start,
              end: s.end,
              duration: s.duration || 0,
              trainerId: s.trainer?.id
            }))}
            onSuccess={() => {
              setAlert({ type: 'success', message: 'Lettere di incarico generate con successo' });
              fetchDocuments();
              setTimeout(() => setAlert(null), 3000);
            }}
          />
        );
      })()}
    </div>
  );
};

export default ScheduleDetailPage;
