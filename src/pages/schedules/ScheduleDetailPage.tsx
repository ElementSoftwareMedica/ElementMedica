import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useConfirmDialog } from '../../contexts/ConfirmDialogContext';
import {
  BookOpen,
  Building2,
  Calendar,
  ChevronRight,
  CheckCircle,
  Clock,
  Edit,
  Eye,
  GraduationCap,
  MapPin,
  PenLine,
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
import { useTenantMode } from '../../contexts/TenantModeContext';
import { useAuth } from '../../hooks/auth/useAuth';
import { remove } from '../../services/apiClient';
import PreventiviModal from '../../components/schedules/components/PreventiviModal';
import { GenerateCertificatesDialog } from '../../components/schedules/GenerateCertificatesDialog';
import { GenerateRegistriModal } from '../../components/schedules/components/GenerateRegistriModal';
import { GenerateLettereModal } from '../../components/schedules/components/GenerateLettereModal';
import { PDFPreviewDialog } from '../../components/ui/PDFPreviewDialog';
import preventiviService from '../../services/preventiviService';
import attestatiService from '../../services/attestatiService';
import registriPresenzeService from '../../services/registriPresenzeService';
import lettereIncaricoService from '../../services/lettereIncaricoService';
import TestManager from '../../components/schedules/components/TestManager';
import ParticipantCredentialsCard from '../../components/schedules/components/ParticipantCredentialsCard';
import { useToast } from '../../hooks/useToast';
import SigningWorkflowModal from '../../components/schedules/components/DocumentManager/components/SigningWorkflowModal';
import type { SignaturePlacement } from '../../components/schedules/components/DocumentManager/components/SigningWorkflowModal';
import { useDocumentActions } from '../../components/schedules/components/DocumentManager/hooks/useDocumentActions';
// ✅ NEW: Import per ScheduleEventModal inline edit
import ScheduleEventModalLazy from '../../components/schedules/ScheduleEventModal.lazy';
import { getTrainers } from '../../services/trainers';
import { getCompanies } from '../../services/companies';
import { getPersons } from '../../services/persons';
import { getCourses } from '../../services/courses';
import type { Company, Person } from '../../types';

interface Schedule {
  id: string;
  tenantId?: string;  // P48: Added for cross-tenant template loading
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
    sessionIndex?: number;  // P48: Added for multi-session per day support
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
  // P49: ScheduleCompany has companyTenantProfile relation, not direct company
  companies?: Array<{
    companyTenantProfileId?: string;
    companyTenantProfile?: {
      id: string;
      company: {
        id: string;
        ragioneSociale?: string;
        name?: string;
      };
    };
    // Legacy fallback
    company?: {
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
      taxCode?: string;
      // P48: Person company comes from tenantProfiles
      tenantProfiles?: Array<{
        companyTenantProfileId?: string;
        companyTenantProfile?: {
          id: string;
          company: {
            id: string;
            ragioneSociale?: string;
            name?: string;
          };
        };
      }>;
      // Legacy fallback - deprecated
      companyId?: string;
      company?: {
        id: string;
        ragioneSociale?: string;
        name?: string;
      };
    };
  }>;
}

// Types for modal data
interface Course {
  id: string;
  name: string;
  title?: string;
  duration?: number;
  riskLevel?: string;
  courseType?: string;
}

interface Trainer {
  id: string;
  firstName: string;
  lastName: string;
}

const ScheduleDetailPage: React.FC = () => {
  const { confirmDelete, confirm } = useConfirmDialog();
  const { getOperateHeaders } = useTenantMode();
  const operateHeaders = getOperateHeaders();
  const { user } = useAuth();

  // Role-based access control for schedule detail view
  const _roles = user?.roles || [];
  const isAdminOrStaff = _roles.some(r =>
    ['ADMIN', 'SUPER_ADMIN', 'TENANT_ADMIN', 'TRAINING_ADMIN', 'OPERATOR', 'COORDINATOR', 'SUPERVISOR', 'SEGRETERIA_CLINICA'].includes(r)
  ) || user?.role === 'Admin' || user?.role === 'Administrator';
  const isTrainer = !isAdminOrStaff &&
    _roles.some(r => ['TRAINER', 'SENIOR_TRAINER', 'EXTERNAL_TRAINER', 'TRAINER_COORDINATOR'].includes(r));
  const isCompanyAdmin = !isAdminOrStaff && !isTrainer &&
    _roles.some(r => ['COMPANY_ADMIN', 'COMPANY_MANAGER'].includes(r));
  const isEmployee = !isAdminOrStaff && !isTrainer && !isCompanyAdmin && _roles.includes('EMPLOYEE');
  // Derived permissions
  const canEditSchedule = isAdminOrStaff;
  const canGenerateDocs = isAdminOrStaff;
  const canSeeLettereSec = isAdminOrStaff || isTrainer; // Lettere incarico: nascoste per company admin
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  // Saved signature for the signing modal: auto-loaded from /impostazioni/firma
  const [savedSignatureUrl, setSavedSignatureUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!user?.id) return;
    apiGet<{ firmaId: string; imageUrl: string } | { data: null }>(`/api/v1/signatures/saved/${user.id}`)
      .then((res) => {
        // API returns { data: null } when no signature saved, or { firmaId, imageUrl } otherwise
        if (res && 'imageUrl' in res && res.imageUrl) {
          setSavedSignatureUrl(res.imageUrl);
        }
      })
      .catch(() => {
        // Silently ignore — no saved signature is a normal state
      });
  }, [user?.id]);

  // ✅ NEW: State per ScheduleEventModal inline edit
  const [showEditModal, setShowEditModal] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [persons, setPersons] = useState<Person[]>([]);
  const [modalDataLoading, setModalDataLoading] = useState(false);

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

  // PDF Preview state
  const [pdfPreview, setPdfPreview] = useState<{ url: string; title: string } | null>(null);

  // Signature modal state
  const [signatureModal, setSignatureModal] = useState<{
    open: boolean;
    documentId: string;
    label: string;
    batchDocIds: string[];
    batchLabel?: string;
    documentType?: 'attestato' | 'lettera' | 'registro';
  }>({
    open: false,
    documentId: '',
    label: '',
    batchDocIds: []
  });

  // Stable ref so useDocumentActions always calls the latest fetchDocuments
  const fetchDocumentsRef = useRef<() => void>(() => { });
  const { signDocument, signDocumentsBulk } = useDocumentActions(() => fetchDocumentsRef.current(), id);

  // ✅ NEW: Funzione per caricare dati necessari per il modal di modifica
  const loadModalData = useCallback(async () => {
    if (modalDataLoading) return;
    setModalDataLoading(true);
    try {
      const [coursesData, trainersData, companiesData, personsData] = await Promise.all([
        getCourses(),
        getTrainers(),
        getCompanies(),
        getPersons({ limit: 1000, page: 1 })
      ]);
      setCourses(coursesData as Course[]);
      setTrainers(trainersData as Trainer[]);
      setCompanies(companiesData as Company[]);
      const personsArray = (personsData as any)?.persons ?? personsData;
      setPersons(personsArray as Person[]);
    } catch (err) {
      if (import.meta.env.DEV) console.error('Error loading modal data:', err);
      showToast({ message: 'Errore nel caricamento dei dati per la modifica', type: 'error' });
    } finally {
      setModalDataLoading(false);
    }
  }, [modalDataLoading]);

  // ✅ NEW: Handler per aprire il modal di modifica
  const handleOpenEditModal = useCallback(async () => {
    // Carica dati se non già caricati
    if (courses.length === 0 || trainers.length === 0) {
      await loadModalData();
    }
    setShowEditModal(true);
  }, [courses.length, trainers.length, loadModalData]);

  // Funzione per download ZIP
  const handleDownloadZip = async (type: 'attestati' | 'registri' | 'lettere') => {
    if (!id) return;
    setDownloadingZip(type);
    try {
      const docIds = documents[type].map((d: any) => d.id);
      if (docIds.length === 0) {
        showToast({ message: 'Nessun documento da scaricare', type: 'error' });
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
      if (import.meta.env.DEV) console.error('Error downloading ZIP:', err);
      showToast({ message: 'Errore durante il download del file ZIP', type: 'error' });
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
      if (import.meta.env.DEV) console.error('Error fetching schedule:', err);
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

      // Backend returns { success, data: { preventivi: [...], ... } } for preventivi
      const preventiviRaw = (preventiviRes as any)?.data?.preventivi || (preventiviRes as any)?.data || [];
      // Exclude COMPENSO_FORMATORE — trainer compensation is tracked in MovimentoContabile
      const preventiviData = Array.isArray(preventiviRaw)
        ? preventiviRaw.filter((p: any) => p.tipoServizio !== 'COMPENSO_FORMATORE')
        : [];

      setDocuments({
        preventivi: preventiviData,
        attestati: Array.isArray(attestatiRes) ? attestatiRes : [],
        registri: Array.isArray(registriRes) ? registriRes : [],
        lettere: Array.isArray(lettereRes) ? lettereRes : []
      });
    } catch (err) {
      if (import.meta.env.DEV) console.error('Error fetching documents:', err);
    } finally {
      setLoadingDocs(false);
    }
  };
  // Keep ref in sync with latest fetchDocuments (called on every render, before any action)
  fetchDocumentsRef.current = fetchDocuments;

  const handleDeleteDocument = async (type: string, docId: string) => {
    const shouldDelete = await confirmDelete('questo documento');
    if (!shouldDelete) return;

    try {
      // Construct correct endpoint for each document type
      const endpoint = `/api/v1/${type}/${docId}`;

      // Use apiDelete instead of remove to avoid endpoint construction issues
      await apiDelete(endpoint, { headers: operateHeaders });
      showToast({ message: 'Documento eliminato con successo', type: 'success' });
      await fetchDocuments();
    } catch (err) {
      if (import.meta.env.DEV) console.error('Error deleting document:', err);
      showToast({ message: 'Errore durante l\'eliminazione del documento', type: 'error' });
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
      if (import.meta.env.DEV) console.error('Error downloading document:', err);
      showToast({ message: 'Errore durante il download del documento', type: 'error' });
    }
  };

  // PDF Preview handler
  const handlePreviewDocument = (type: string, docId: string, title: string, url?: string) => {
    // Build the preview URL based on document type
    let previewUrl = url;
    if (!previewUrl) {
      switch (type) {
        case 'preventivi':
          previewUrl = preventiviService.getDownloadUrl(docId);
          break;
        case 'attestati':
          previewUrl = attestatiService.getDownloadUrl(docId);
          break;
        case 'registri-presenze':
          previewUrl = registriPresenzeService.getDownloadUrl(docId);
          break;
        case 'lettere-incarico':
          previewUrl = lettereIncaricoService.getDownloadUrl(docId);
          break;
        default:
          return;
      }
    }
    setPdfPreview({ url: previewUrl, title });
  };

  // ── Signing handlers ──────────────────────────────────────────────────────

  const openSignModal = useCallback((docId: string, label: string, documentType?: 'attestato' | 'lettera' | 'registro') => {
    setSignatureModal({ open: true, documentId: docId, label, batchDocIds: [], documentType });
  }, []);

  const openSignAllModal = useCallback((docIds: string[], label: string, batchLabel?: string, documentType?: 'attestato' | 'lettera' | 'registro') => {
    if (docIds.length === 0) return;
    const [first, ...rest] = docIds;
    setSignatureModal({ open: true, documentId: first, label, batchDocIds: rest, batchLabel, documentType });
  }, []);

  const closeSignModal = useCallback(() => {
    setSignatureModal(prev => ({ ...prev, open: false }));
  }, []);

  const handleSignConfirm = useCallback(async ({
    signatureDataUrl,
    placement,
    applyToAll
  }: {
    signatureDataUrl: string;
    placement: SignaturePlacement;
    applyToAll: boolean;
  }) => {
    const { documentId, batchDocIds, documentType } = signatureModal;
    closeSignModal();
    if (applyToAll && batchDocIds.length > 0) {
      await signDocumentsBulk([documentId, ...batchDocIds], signatureDataUrl, placement, documentType);
    } else {
      await signDocument(documentId, signatureDataUrl, placement, documentType);
    }
  }, [signatureModal, closeSignModal, signDocument, signDocumentsBulk]);

  // ZIP download functions
  const handleDownloadZipAttestati = async () => {
    if (!id || documents.attestati.length === 0) return;
    try {
      await attestatiService.downloadZipBatch(documents.attestati.map((d: any) => d.id));
    } catch (err) {
      if (import.meta.env.DEV) console.error('Error downloading ZIP attestati:', err);
      showToast({ message: 'Errore durante il download ZIP', type: 'error' });
    }
  };

  const handleDownloadZipRegistri = async () => {
    if (!id || documents.registri.length === 0) return;
    try {
      await registriPresenzeService.downloadZip(id);
    } catch (err) {
      if (import.meta.env.DEV) console.error('Error downloading ZIP registri:', err);
      showToast({ message: 'Errore durante il download ZIP', type: 'error' });
    }
  };

  const handleDownloadZipLettere = async () => {
    if (!id || documents.lettere.length === 0) return;
    try {
      await lettereIncaricoService.downloadZip(id);
    } catch (err) {
      if (import.meta.env.DEV) console.error('Error downloading ZIP lettere:', err);
      showToast({ message: 'Errore durante il download ZIP', type: 'error' });
    }
  };

  const handleDelete = async () => {
    // Fetch linked documents to build a detailed warning
    let message = 'Sei sicuro di voler eliminare questo corso programmato? L\'operazione non può essere annullata.';
    try {
      const result = await apiGet<{
        success: boolean;
        data: {
          attestati: number; preventivi: number; lettereIncarico: number;
          registriPresenze: number; movimentiContabili: number;
          movimentiFatturati: number; movimentiEliminabili: number; total: number;
        };
      }>(`/api/v1/schedules/${id}/linked-documents`);
      const docs = result.data;
      if (docs.total > 0) {
        const parts: string[] = [];
        if (docs.attestati > 0) parts.push(`${docs.attestati} attestat${docs.attestati === 1 ? 'o' : 'i'}`);
        if (docs.preventivi > 0) parts.push(`${docs.preventivi} preventiv${docs.preventivi === 1 ? 'o' : 'i'}`);
        if (docs.lettereIncarico > 0) parts.push(`${docs.lettereIncarico} letter${docs.lettereIncarico === 1 ? 'a' : 'e'} di incarico`);
        if (docs.registriPresenze > 0) parts.push(`${docs.registriPresenze} registr${docs.registriPresenze === 1 ? 'o' : 'i'} presenze`);
        if (docs.movimentiEliminabili > 0) parts.push(`${docs.movimentiEliminabili} movement${docs.movimentiEliminabili === 1 ? 'o contabile' : 'i contabili'}`);
        message = `Attenzione: l'eliminazione di questo corso comporterà la cancellazione di tutti i documenti collegati: ${parts.join(', ')}.`;
        if (docs.movimentiFatturati > 0) {
          message += ` I ${docs.movimentiFatturati} moviment${docs.movimentiFatturati === 1 ? 'o già fatturato' : 'i già fatturati'} non saranno eliminati.`;
        }
        message += ' L\'operazione non può essere annullata.';
      }
    } catch { /* usa messaggio generico */ }

    const shouldDelete = await confirm({
      title: 'Elimina corso programmato',
      message,
      confirmLabel: 'Elimina',
      cancelLabel: 'Annulla',
      variant: 'danger'
    });
    if (!shouldDelete) return;

    try {
      await remove('schedules', id!);
      showToast({ message: 'Corso programmato eliminato con successo', type: 'success' });
      setTimeout(() => navigate('/schedules'), 1500);
    } catch (err) {
      if (import.meta.env.DEV) console.error('Error deleting schedule:', err);
      showToast({ message: 'Errore durante l\'eliminazione del corso programmato', type: 'error' });
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!schedule || isUpdatingStatus) return;

    setIsUpdatingStatus(true);
    try {
      const api = (await import('../../services/api')).default;

      // Send only the status field, not the entire schedule object
      await api.put(`/api/v1/schedules/${id}`, { status: newStatus });

      setSchedule({ ...schedule, status: newStatus });
      showToast({ message: 'Stato aggiornato con successo', type: 'success' });
    } catch (err: unknown) {
      if (import.meta.env.DEV) console.error('[ScheduleDetailPage] ❌ Error updating status:', {
        error: err,
        message: (err as any)?.message,
        response: (err as any)?.response?.data,
        status: (err as any)?.response?.status
      });
      const errorMsg = (err as any)?.response?.data?.message || (err as any)?.response?.data?.error || 'Errore durante l\'aggiornamento dello stato';
      showToast({ message: errorMsg, type: 'error' });
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
    const normalizedMode = mode?.toUpperCase();
    switch (normalizedMode) {
      case 'IN_PERSON': return 'In presenza';
      case 'ONLINE': return 'Online';
      case 'HYBRID': return 'Ibrido';
      case 'SELF_PACED': return 'Autoapprendimento';
      default: return mode || 'Non specificato';
    }
  };

  const getStatusBadge = (status?: string) => {
    const statusMap: Record<string, { label: string; color: string }> = {
      'PREVENTIVO': { label: 'Preventivo', color: 'bg-yellow-100 text-yellow-800' },
      'ACCETTATO': { label: 'Accettato', color: 'bg-blue-100 text-blue-800' },
      'COMPLETATO': { label: 'Completato', color: 'bg-green-100 text-green-800' },
      'FATTURATO': { label: 'Fatturato', color: 'bg-gray-100 text-gray-800' },
    };

    const statusInfo = statusMap[status || 'PREVENTIVO'] || { label: status || 'N/D', color: 'bg-gray-100 text-gray-800' };

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
          <p className="mt-4 text-gray-600 dark:text-gray-400">Caricamento...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-80">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600 dark:text-red-400">Errore nel caricamento</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">{error}</p>
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
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-50">Corso programmato non trovato</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Il corso che stai cercando non esiste o è stato rimosso.</p>
          <Link to="/schedules" className="mt-4 inline-block text-blue-600 hover:text-blue-800">
            Torna ai Corsi Programmati
          </Link>
        </div>
      </div>
    );
  }

  const courseName = schedule.course.title || schedule.course.name;
  // P48/P49: Extract company names from enrollments' tenantProfiles
  // schedule.companies may be empty - the real company data is in enrollments
  const companyNamesSet = new Set<string>();
  schedule.enrollments?.forEach(e => {
    const company = e.person?.tenantProfiles?.[0]?.companyTenantProfile?.company;
    if (company?.ragioneSociale) {
      companyNamesSet.add(company.ragioneSociale);
    }
  });
  const companyNames = companyNamesSet.size > 0
    ? Array.from(companyNamesSet).join(', ')
    : 'Nessuna azienda';

  // Employee: accesso negato — non deve poter aprire questo dettaglio
  if (isEmployee) {
    return (
      <div className="flex items-center justify-center h-80">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600 dark:text-red-400">Accesso non autorizzato</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Non hai i permessi per visualizzare questa sezione.</p>
          <Link to="/dashboard" className="mt-4 inline-block text-blue-600 hover:text-blue-800">
            Torna alla Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Trainer: mostra solo le sessioni in cui è docente (principale o co-docente)
  const displayedSessions = isTrainer
    ? (schedule.sessions || []).filter(s =>
      s.trainer?.id === user?.id || s.coTrainer?.id === user?.id
    )
    : (schedule.sessions || []);

  // ── Filtraggio documenti per ruolo ──────────────────────────────────────────
  // COMPANY_ADMIN: vede solo partecipanti/documenti della propria azienda
  // TRAINER: vede solo registri e lettere dove è il formatore, no preventivi
  // ─────────────────────────────────────────────────────────────────────────────

  // Person IDs dei partecipanti della stessa azienda del company admin corrente
  const myCompanyPersonIds: Set<string> | null = isCompanyAdmin && user?.companyTenantProfileId
    ? new Set(
      (schedule.enrollments || [])
        .filter(e => {
          const ctpId = e.person?.tenantProfiles?.[0]?.companyTenantProfileId;
          return ctpId === user.companyTenantProfileId;
        })
        .map(e => e.person.id)
    )
    : null;

  // Iscrizioni visibili per ruolo
  const displayedEnrollments = isCompanyAdmin && myCompanyPersonIds
    ? (schedule.enrollments || []).filter(e => myCompanyPersonIds!.has(e.person.id))
    : isTrainer
      ? (() => {
        // Il trainer vede solo gli iscritti delle sue sessioni
        const trainerParticipantIds = new Set<string>();
        displayedSessions.forEach(s => {
          const sessionDate = s.date.split('T')[0];
          const attendanceForSession = schedule.attendance?.find(a =>
            a.sessionIndex !== undefined
              ? a.sessionIndex === (schedule.sessions || []).indexOf(s)
              : a.date && a.date.split('T')[0] === sessionDate
          );
          if (attendanceForSession?.employee_ids) {
            attendanceForSession.employee_ids.forEach(id => trainerParticipantIds.add(String(id)));
          }
        });
        // Se non c'è attendance data, mostra tutti gli iscritti
        return trainerParticipantIds.size === 0
          ? (schedule.enrollments || [])
          : (schedule.enrollments || []).filter(e => trainerParticipantIds.has(String(e.person.id)));
      })()
      : (schedule.enrollments || []);

  // Documenti filtrati per visualizzazione
  const displayedPreventivi = isCompanyAdmin
    ? documents.preventivi.filter(d =>
      // Filtra per companyTenantProfile matching
      d.companyTenantProfile?.id === user?.companyTenantProfileId ||
      // Fallback: se il preventivo ha un personId che è tra i dipendenti dell'azienda
      (myCompanyPersonIds && d.personId && myCompanyPersonIds.has(d.personId))
    )
    : isTrainer
      ? [] // I trainer non vedono i preventivi commerciali
      : documents.preventivi;

  const displayedAttestati = isCompanyAdmin && myCompanyPersonIds
    ? documents.attestati.filter(d => myCompanyPersonIds!.has(d.person?.id || d.personId))
    : documents.attestati;

  const displayedRegistri = isTrainer
    ? documents.registri.filter(d => d.formatoreId === user?.id)
    : documents.registri;

  // lettere: il filtraggio per trainer è fatto a livello UI (canSeeLettereSec)
  const displayedLettere = isTrainer
    ? documents.lettere.filter(d => d.trainerId === user?.id)
    : documents.lettere;

  return (
    <div className="space-y-6">
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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-black/30 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div className="flex items-center">
            <div className="h-16 w-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <GraduationCap className="h-8 w-8 text-white" />
            </div>
            <div className="ml-4">
              <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-50">{courseName}</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{companyNames}</p>
              <div className="mt-2">
                <select
                  value={schedule.status || 'PREVENTIVO'}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  disabled={isUpdatingStatus || !canEditSchedule}
                  className={`
                    px-3 py-1.5 rounded-full text-sm font-medium cursor-pointer transition-all
                    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                    disabled:opacity-50 disabled:cursor-not-allowed border-0
                    ${statusBadgeColors[dbStatusToItalian(schedule.status || 'PREVENTIVO')] || 'bg-gray-100 text-gray-800'} 
                    ${statusBadgeHoverColors[dbStatusToItalian(schedule.status || 'PREVENTIVO')] || 'hover:bg-gray-200'}
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
                  <option value="PREVENTIVO">Preventivo</option>
                  <option value="ACCETTATO">Accettato</option>
                  <option value="COMPLETATO">Completato</option>
                  <option value="FATTURATO">Fatturato</option>
                </select>
              </div>
            </div>
          </div>
          <div className="mt-4 md:mt-0 flex gap-2">
            {canEditSchedule && (<>
              <button
                onClick={handleOpenEditModal}
                disabled={modalDataLoading}
                className="btn-primary flex items-center rounded-full"
              >
                {modalDataLoading ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Edit className="h-4 w-4 mr-1" />
                )}
                Modifica
              </button>
              <button
                onClick={handleDelete}
                className="btn-danger flex items-center rounded-full"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Elimina
              </button>
            </>)}
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Course Info - Compatto */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-black/30">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-base font-semibold text-gray-800 dark:text-gray-50 flex items-center">
                <BookOpen className="h-4 w-4 mr-2" />
                Informazioni Corso
              </h2>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-2">
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Corso</label>
                  <p className="text-sm text-gray-900 dark:text-gray-50 truncate" title={courseName}>{courseName}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Modalità</label>
                  <p className="text-sm text-gray-900 dark:text-gray-50">{getDeliveryModeLabel(schedule.deliveryMode)}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Inizio</label>
                  <p className="text-sm text-gray-900 dark:text-gray-50 flex items-center">
                    <Calendar className="h-3 w-3 mr-1 text-gray-400 dark:text-gray-500" />
                    {formatDate(schedule.startDate)}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Fine</label>
                  <p className="text-sm text-gray-900 dark:text-gray-50 flex items-center">
                    <Calendar className="h-3 w-3 mr-1 text-gray-400 dark:text-gray-500" />
                    {formatDate(schedule.endDate)}
                  </p>
                </div>
                {schedule.course?.riskLevel && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Rischio</label>
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
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Tipo</label>
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
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Visibilità</label>
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
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Sede</label>
                    <p className="text-sm text-gray-900 dark:text-gray-50 flex items-center truncate" title={schedule.location}>
                      <MapPin className="h-3 w-3 mr-1 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                      {schedule.location}
                    </p>
                  </div>
                )}
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Max Part.</label>
                  <p className="text-sm text-gray-900 dark:text-gray-50 flex items-center">
                    <Users className="h-3 w-3 mr-1 text-gray-400 dark:text-gray-500" />
                    {schedule.maxParticipants || 'N/S'}
                  </p>
                </div>
              </div>
              {schedule.notes && (
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Note</label>
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{schedule.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Sessions - 2 Columns Layout with Participants */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-black/30">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-50 flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                Sessioni ({displayedSessions.length})
              </h2>
            </div>
            <div className="p-6">
              {displayedSessions.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {displayedSessions.map((session, index) => {
                    // P48 FIX: Usa sessionIndex prima, poi fallback a date matching
                    // Questo gestisce correttamente più sessioni nella stessa data
                    const sessionDate = session.date.split('T')[0];

                    // Prima cerca per indice (nuovo formato), poi fallback per data (legacy)
                    let attendanceForSession = schedule.attendance?.find(a => a.sessionIndex === index);
                    if (!attendanceForSession) {
                      // Legacy fallback: usa la entry all'indice corrispondente se esiste
                      attendanceForSession = schedule.attendance?.[index];
                    }

                    // ✅ FIX: Normalizza employee_ids a string per confronto coerente
                    const sessionParticipantIds = (attendanceForSession?.employee_ids || []).map(id => String(id));

                    // ✅ FIX: Se non c'è attendance per questa sessione, mostra tutti i partecipanti (fallback legacy)
                    const hasAttendanceData = schedule.attendance && schedule.attendance.length > 0 && attendanceForSession;

                    // Filtra e ordina alfabeticamente per cognome
                    // Applica anche il filtro per ruolo (company admin vede solo la propria azienda)
                    const enrollmentPool = isCompanyAdmin && myCompanyPersonIds
                      ? (schedule.enrollments || []).filter(e => myCompanyPersonIds!.has(e.person.id))
                      : (schedule.enrollments || []);
                    const allParticipants = enrollmentPool
                      .filter(enrollment =>
                        hasAttendanceData
                          ? sessionParticipantIds.includes(String(enrollment.person.id))
                          : true // Fallback: mostra tutti se non c'è attendance data
                      )
                      .sort((a, b) => a.person.lastName.localeCompare(b.person.lastName));

                    return (
                      <div key={session.id} className="border-2 border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden flex flex-col">
                        {/* Session Header */}
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 p-4">
                          <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-50 mb-3">Sessione {index + 1}</h3>

                          <div className="space-y-2 mb-3">
                            <p className="text-sm text-gray-700 dark:text-gray-300 flex items-center">
                              <Calendar className="h-4 w-4 mr-2 text-blue-600 flex-shrink-0" />
                              {formatDate(session.date)}
                            </p>
                            <p className="text-sm text-gray-700 dark:text-gray-300 flex items-center">
                              <Clock className="h-4 w-4 mr-2 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                              {formatTime(session.start)} - {formatTime(session.end)}
                            </p>
                          </div>

                          {/* Trainers */}
                          <div className="space-y-2 border-t border-blue-100 dark:border-blue-800 pt-3">
                            {session.trainer && (
                              <div className="flex items-start">
                                <User className="h-4 w-4 mr-2 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                                <div>
                                  <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Formatore</p>
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
                                <User className="h-4 w-4 mr-2 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
                                <div>
                                  <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Co-Formatore</p>
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
                        <div className="p-4 bg-white dark:bg-gray-800 flex-1">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center">
                              <Users className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-400" />
                              Partecipanti ({allParticipants.length})
                            </h4>
                          </div>
                          {allParticipants.length > 0 ? (
                            <div className="space-y-2 max-h-80 overflow-y-auto">
                              {allParticipants.map((enrollment) => (
                                <Link
                                  key={enrollment.id}
                                  to={`/persons/${enrollment.person.id}`}
                                  className="flex items-center p-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:border-blue-300 dark:hover:border-blue-600 transition group"
                                >
                                  <div className="h-8 w-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold mr-2 flex-shrink-0">
                                    {enrollment.person.lastName[0]}{enrollment.person.firstName[0]}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-50 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                                      {enrollment.person.lastName} {enrollment.person.firstName}
                                    </p>
                                    {enrollment.person.email && (
                                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{enrollment.person.email}</p>
                                    )}
                                  </div>
                                </Link>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                              Nessun partecipante iscritto
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-center py-4">Nessuna sessione programmata</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Companies - P48/P49: Extract from enrollments' tenantProfiles */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-black/30">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-50 flex items-center">
                <Building2 className="h-5 w-5 mr-2" />
                Aziende
              </h2>
            </div>
            <div className="p-6">
              {(() => {
                // P48/P49: Extract UNIQUE companies from enrollments' tenantProfiles
                // Usa displayedEnrollments per rispettare il filtraggio per ruolo
                const enrollmentCompaniesMap = new Map<string, { id: string; ragioneSociale: string }>();
                displayedEnrollments.forEach(e => {
                  const profile = e.person?.tenantProfiles?.[0];
                  const company = profile?.companyTenantProfile?.company;
                  if (company?.id && !enrollmentCompaniesMap.has(company.id)) {
                    enrollmentCompaniesMap.set(company.id, {
                      id: company.id,
                      ragioneSociale: company.ragioneSociale || ''
                    });
                  }
                });
                const enrollmentCompanies = Array.from(enrollmentCompaniesMap.values());

                return enrollmentCompanies.length > 0 ? (
                  <div className="space-y-2">
                    {enrollmentCompanies.map((company) => (
                      <Link
                        key={company.id}
                        to={`/companies/${company.id}`}
                        className="block p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
                      >
                        <p className="text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                          {company.ragioneSociale || 'Azienda'}
                        </p>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-sm">Nessuna azienda associata</p>
                );
              })()}
            </div>
          </div>

          {/* Documenti Generati */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-black/30">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-50 flex items-center">
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
                      <FileText className="h-4 w-4 mr-2 text-violet-600 dark:text-violet-400" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Preventivi</span>
                      <span className="ml-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-violet-100 text-violet-800">
                        {displayedPreventivi.length}
                      </span>
                    </div>
                    {canGenerateDocs && (
                      <button
                        onClick={() => setShowPreventiviModal(true)}
                        className="p-1 text-violet-600 hover:bg-violet-50 rounded transition"
                        title="Genera Preventivo"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  {displayedPreventivi.length > 0 ? (
                    <div className="space-y-1 ml-6">
                      {displayedPreventivi.map((doc: any) => {
                        // Format filename like modal: yyyy.mm.gg - Nome azienda
                        const date = new Date(doc.dataEmissione);
                        const formattedDate = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
                        // P49: Company data is now in companyTenantProfile.company
                        const companyName = doc.companyTenantProfile?.company?.ragioneSociale || doc.azienda?.ragioneSociale || 'Azienda';
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
                          <div key={doc.id} className="flex items-center justify-between p-2 border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50 group">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-gray-900 dark:text-gray-50 truncate">
                                {displayName}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                €{price}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handlePreviewDocument('preventivi', doc.id, displayName)}
                                className="p-1 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                                title="Anteprima"
                              >
                                <Eye className="h-3 w-3" />
                              </button>
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
                    <p className="text-xs text-gray-400 dark:text-gray-500 ml-6">Nessun preventivo generato</p>
                  )}
                </div>

                {/* Attestati */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <Award className="h-4 w-4 mr-2 text-green-600 dark:text-green-400" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Attestati</span>
                      <span className="ml-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        {displayedAttestati.length}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {displayedAttestati.length > 1 && (
                        <button
                          onClick={handleDownloadZipAttestati}
                          className="p-1 text-green-600 hover:bg-green-50 rounded transition"
                          title="Scarica ZIP Attestati"
                        >
                          <FolderArchive className="h-4 w-4" />
                        </button>
                      )}
                      {displayedAttestati.some((d: any) => !d.firmaFormatore) && (
                        <button
                          onClick={() => openSignAllModal(
                            displayedAttestati.filter((d: any) => !d.firmaFormatore).map((d: any) => d.id),
                            'Attestato',
                            'tutti gli attestati non firmati',
                            'attestato'
                          )}
                          className="p-1 text-green-600 hover:bg-green-50 rounded transition"
                          title="Firma tutti gli attestati non firmati"
                        >
                          <PenLine className="h-4 w-4" />
                        </button>
                      )}
                      {canGenerateDocs && (
                        <button
                          onClick={() => setShowGenerateAttestatiDialog(true)}
                          className="p-1 text-green-600 hover:bg-green-50 rounded transition"
                          title="Genera Attestati"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  {displayedAttestati.length > 0 ? (
                    <div className="space-y-1 ml-6">
                      {displayedAttestati.map((doc: any) => (
                        <div key={doc.id} className="flex items-center justify-between p-2 border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50 group">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-900 dark:text-gray-50 truncate">
                              {doc.person?.firstName && doc.person?.lastName
                                ? `${doc.person.firstName} ${doc.person.lastName}`
                                : doc.nomeFile || `Attestato ${doc.numeroProgressivo || doc.id?.slice(0, 8) || 'N/A'}`}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {doc.numeroProgressivo && doc.annoProgressivo
                                ? `N° ${doc.numeroProgressivo}/${doc.annoProgressivo}`
                                : doc.personName || 'Partecipante'}
                            </p>
                          </div>
                          {doc.firmaFormatore && (
                            <span
                              className="flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-1.5 py-0.5 rounded-full mr-2 flex-shrink-0"
                              title={doc.firmaFormatoreAt ? `Firmato il ${new Date(doc.firmaFormatoreAt).toLocaleDateString('it-IT')}` : 'Documento firmato'}
                            >
                              <CheckCircle className="w-3 h-3" />
                              Firmato
                            </span>
                          )}
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {!doc.firmaFormatore && (
                              <button
                                onClick={() => openSignModal(doc.id, doc.nomeFile || `Attestato - ${doc.person?.firstName} ${doc.person?.lastName}`, 'attestato')}
                                className="p-1 text-green-600 hover:bg-green-50 rounded"
                                title="Firma"
                              >
                                <PenLine className="h-3 w-3" />
                              </button>
                            )}
                            <button
                              onClick={() => handlePreviewDocument('attestati', doc.id, doc.nomeFile || `Attestato - ${doc.person?.firstName} ${doc.person?.lastName}`)}
                              className="p-1 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                              title="Anteprima"
                            >
                              <Eye className="h-3 w-3" />
                            </button>
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
                    <p className="text-xs text-gray-400 dark:text-gray-500 ml-6">Nessun attestato generato</p>
                  )}
                </div>

                {/* Registri */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <ClipboardList className="h-4 w-4 mr-2 text-yellow-600 dark:text-yellow-400" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Registri</span>
                      <span className="ml-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                        {displayedRegistri.length}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {displayedRegistri.length > 1 && (
                        <button
                          onClick={handleDownloadZipRegistri}
                          className="p-1 text-yellow-600 hover:bg-yellow-50 rounded transition"
                          title="Scarica ZIP Registri"
                        >
                          <FolderArchive className="h-4 w-4" />
                        </button>
                      )}
                      {displayedRegistri.some((d: any) => !d.firmaFormatore) && (
                        <button
                          onClick={() => openSignAllModal(
                            displayedRegistri.filter((d: any) => !d.firmaFormatore).map((d: any) => d.id),
                            'Registro Presenze',
                            'tutti i registri non firmati',
                            'registro'
                          )}
                          className="p-1 text-yellow-600 hover:bg-yellow-50 rounded transition"
                          title="Firma tutti i registri non firmati"
                        >
                          <PenLine className="h-4 w-4" />
                        </button>
                      )}
                      {canGenerateDocs && (
                        <button
                          onClick={() => setShowGenerateRegistriModal(true)}
                          className="p-1 text-yellow-600 hover:bg-yellow-50 rounded transition"
                          title="Genera Registro Presenze"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  {displayedRegistri.length > 0 ? (
                    <div className="space-y-1 ml-6">
                      {displayedRegistri.map((doc: any) => (
                        <div key={doc.id} className="flex items-center justify-between p-2 border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50 group">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-900 dark:text-gray-50 truncate">
                              {doc.nomeFile || `Registro ${doc.id}`}
                            </p>
                          </div>
                          {doc.firmaFormatore && (
                            <span
                              className="flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-1.5 py-0.5 rounded-full mr-2 flex-shrink-0"
                              title={doc.firmaFormatoreAt ? `Firmato il ${new Date(doc.firmaFormatoreAt).toLocaleDateString('it-IT')}` : 'Documento firmato'}
                            >
                              <CheckCircle className="w-3 h-3" />
                              Firmato
                            </span>
                          )}
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {!doc.firmaFormatore && (
                              <button
                                onClick={() => openSignModal(doc.id, doc.nomeFile || 'Registro Presenze', 'registro')}
                                className="p-1 text-yellow-600 hover:bg-yellow-50 rounded"
                                title="Firma"
                              >
                                <PenLine className="h-3 w-3" />
                              </button>
                            )}
                            <button
                              onClick={() => handlePreviewDocument('registri-presenze', doc.id, doc.nomeFile || `Registro Presenze`)}
                              className="p-1 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                              title="Anteprima"
                            >
                              <Eye className="h-3 w-3" />
                            </button>
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
                    <p className="text-xs text-gray-400 dark:text-gray-500 ml-6">Nessun registro generato</p>
                  )}
                </div>

                {/* Lettere: nascoste per company admin — permesse solo ad admin e trainer */}
                {canSeeLettereSec && <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <File className="h-4 w-4 mr-2 text-blue-600 dark:text-blue-400" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Lettere</span>
                      <span className="ml-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        {displayedLettere.length}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {displayedLettere.length > 1 && (
                        <button
                          onClick={handleDownloadZipLettere}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded transition"
                          title="Scarica ZIP Lettere di Incarico"
                        >
                          <FolderArchive className="h-4 w-4" />
                        </button>
                      )}
                      {displayedLettere.some((d: any) => !d.firmaFormatore) && (
                        <button
                          onClick={() => openSignAllModal(
                            displayedLettere.filter((d: any) => !d.firmaFormatore).map((d: any) => d.id),
                            'Lettera di Incarico',
                            'tutte le lettere non firmate',
                            'lettera'
                          )}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded transition"
                          title="Firma tutte le lettere non firmate"
                        >
                          <PenLine className="h-4 w-4" />
                        </button>
                      )}
                      {canGenerateDocs && (
                        <button
                          onClick={() => setShowGenerateLettereModal(true)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded transition"
                          title="Genera Lettere di Incarico"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  {displayedLettere.length > 0 ? (
                    <div className="space-y-1 ml-6">
                      {displayedLettere.map((doc: any) => (
                        <div key={doc.id} className="flex items-center justify-between p-2 border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50 group">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-900 dark:text-gray-50 truncate">
                              {doc.nomeFile || `Lettera ${doc.id}`}
                            </p>
                          </div>
                          {doc.firmaFormatore && (
                            <span
                              className="flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-1.5 py-0.5 rounded-full mr-2 flex-shrink-0"
                              title={doc.firmaFormatoreAt ? `Firmato il ${new Date(doc.firmaFormatoreAt).toLocaleDateString('it-IT')}` : 'Documento firmato'}
                            >
                              <CheckCircle className="w-3 h-3" />
                              Firmato
                            </span>
                          )}
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {!doc.firmaFormatore && (
                              <button
                                onClick={() => openSignModal(doc.id, doc.nomeFile || 'Lettera di Incarico', 'lettera')}
                                className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                title="Firma"
                              >
                                <PenLine className="h-3 w-3" />
                              </button>
                            )}
                            <button
                              onClick={() => handlePreviewDocument('lettere-incarico', doc.id, doc.nomeFile || `Lettera di Incarico`)}
                              className="p-1 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                              title="Anteprima"
                            >
                              <Eye className="h-3 w-3" />
                            </button>
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
                    <p className="text-xs text-gray-400 dark:text-gray-500 ml-6">Nessuna lettera generata</p>
                  )}
                </div>}
              </div>
            </div>
          </div>

          {/* Test e Questionari */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-black/30">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-50 flex items-center">
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

          {/* Credenziali Partecipanti */}
          {schedule && schedule.enrollments && schedule.enrollments.length > 0 && (
            <ParticipantCredentialsCard
              scheduleId={schedule.id}
              enrollments={schedule.enrollments}
              onUpdate={() => fetchScheduleData()}
            />
          )}

          {/* Meta Info */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-black/30">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-50">Metadata</h2>
            </div>
            <div className="p-6 space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Creato il</label>
                <p className="text-sm text-gray-900 dark:text-gray-50">{formatDateTime(schedule.createdAt)}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Ultimo aggiornamento</label>
                <p className="text-sm text-gray-900 dark:text-gray-50">{formatDateTime(schedule.updatedAt)}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">ID</label>
                <p className="text-xs text-gray-600 dark:text-gray-400 font-mono">{schedule.id}</p>
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

        // P49: Extract UNIQUE companies from schedule.companies (primary source)
        // and supplement from enrollments' tenantProfiles (secondary source)
        const companyMap = new Map<string, { id: string; companyTenantProfileId: string; ragioneSociale: string }>();

        // PRIMARY: Use ScheduleCompany records (direct company-schedule assignments)
        schedule.companies?.forEach(sc => {
          const profile = sc.companyTenantProfile;
          const company = profile?.company;
          if (company?.id && profile?.id && !companyMap.has(company.id)) {
            companyMap.set(company.id, {
              id: company.id,
              companyTenantProfileId: profile.id,
              ragioneSociale: company.ragioneSociale || company.name || ''
            });
          }
        });

        // SECONDARY: Also check enrollments for any additional company info
        schedule.enrollments?.forEach(e => {
          const profile = e.person.tenantProfiles?.[0];
          const companyTenantProfile = profile?.companyTenantProfile;
          const company = companyTenantProfile?.company;
          if (company?.id && companyTenantProfile?.id && !companyMap.has(company.id)) {
            companyMap.set(company.id, {
              id: company.id,
              companyTenantProfileId: companyTenantProfile.id,
              ragioneSociale: company.ragioneSociale || ''
            });
          }
        });

        const companiesData = Array.from(companyMap.values());

        // P48: Build a map of personId -> company for person-company association
        const personCompanyMap = new Map<string, { id: string; ragioneSociale: string }>();
        schedule.enrollments?.forEach(e => {
          const profile = e.person.tenantProfiles?.[0];
          const company = profile?.companyTenantProfile?.company;
          if (company) {
            personCompanyMap.set(e.person.id, {
              id: company.id,
              ragioneSociale: company.ragioneSociale || ''
            });
          }
        });

        // P48/P49: Use person's actual company from tenantProfiles
        const defaultCompanyId = companiesData.length === 1 ? companiesData[0].id : undefined;

        const personsData = schedule.enrollments?.map(e => {
          const personCompany = personCompanyMap.get(e.person.id);
          return {
            id: e.person.id,
            firstName: e.person.firstName,
            lastName: e.person.lastName,
            email: e.person.email,
            // P48: Get company from tenantProfiles, fallback to default schedule company
            aziendaId: personCompany?.id || defaultCompanyId
          };
        }) || [];

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
              showToast({ message: `${ids.length} preventivo/i generato/i con successo`, type: 'success' });
              fetchDocuments();
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
            tenantId: (schedule as any).tenantId, // P48: Pass tenantId for cross-tenant template loading
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
            showToast({ message: 'Attestati generati con successo', type: 'success' });
            fetchDocuments();
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
            // P48/P49: Derive per-person company from tenantProfiles (included in schedule detail)
            persons={(() => {
              return (schedule.enrollments || []).map(e => {
                // Primary: company from tenantProfiles (P48 pattern, included by backend)
                const profile = e.person.tenantProfiles?.[0];
                const company = profile?.companyTenantProfile?.company;
                // Fallback: single schedule company
                const fallbackCompany = schedule.companies?.length === 1
                  ? (schedule.companies[0].companyTenantProfile?.company || (schedule.companies[0] as any).company)
                  : undefined;
                const resolvedCompany = company || fallbackCompany;
                return {
                  id: e.person.id,
                  firstName: e.person.firstName,
                  lastName: e.person.lastName,
                  companyId: resolvedCompany?.id,
                  company: resolvedCompany ? {
                    id: resolvedCompany.id,
                    ragioneSociale: resolvedCompany.ragioneSociale,
                    name: resolvedCompany.name
                  } : undefined
                };
              });
            })()}
            companies={(schedule.companies || []).map(c => {
              // P49: companies -> companyTenantProfile -> company
              const company = c.companyTenantProfile?.company || c.company;
              const id = company?.id || c.companyTenantProfileId;
              return {
                id: id || '',
                ragioneSociale: company?.ragioneSociale
              };
            }).filter(c => c.id)}
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
              showToast({ message: 'Registro presenze generato con successo', type: 'success' });
              fetchDocuments();
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
            tenantId={schedule.tenantId}
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
              showToast({ message: 'Lettere di incarico generate con successo', type: 'success' });
              fetchDocuments();
            }}
          />
        );
      })()}

      {/* ✅ NEW: Modal per modifica schedule inline (senza navigare via dalla pagina) */}
      {showEditModal && schedule && (
        <ScheduleEventModalLazy
          key={schedule.id}
          trainings={courses.map(c => ({ ...c, title: c.title || c.name }))}
          trainers={trainers}
          companies={companies}
          persons={persons}
          existingEvent={{
            id: schedule.id,
            training_id: schedule.course?.id || '',
            dates: schedule.sessions?.map(sess => ({
              sessionId: sess.id,
              date: sess.date.split('T')[0],
              start: sess.start,
              end: sess.end,
              trainerId: sess.trainer?.id || '',
              coTrainerId: sess.coTrainer?.id || '',
            })) || [],
            location: schedule.location || '',
            max_participants: schedule.maxParticipants || 0,
            notes: schedule.notes || '',
            delivery_mode: schedule.deliveryMode?.toLowerCase().replace('_', '-') || '',
            risk_level: schedule.course?.riskLevel || '',
            course_type: schedule.course?.courseType || '',
            // P49: usa CompanyTenantProfile.id per matchare getCompanies()
            // Fallback: se schedule.companies è vuoto, deriva da enrollments
            company_ids: (() => {
              const fromCompanies = (schedule.companies || [])
                .map((c) => (c as any).companyTenantProfileId ?? c.companyTenantProfile?.id)
                .filter(Boolean) as string[];
              if (fromCompanies.length > 0) return fromCompanies;
              const profileIds = new Set<string>();
              (schedule.enrollments || []).forEach(e => {
                const id = (e as any).person?.tenantProfiles?.[0]?.companyTenantProfileId
                  ?? (e as any).person?.tenantProfiles?.[0]?.companyTenantProfile?.id;
                if (id) profileIds.add(String(id));
              });
              return Array.from(profileIds);
            })(),
            employee_ids: schedule.enrollments?.map((e) => e.person?.id).filter(Boolean) || [],
            attendance: schedule.attendance || [],
            isPublic: (schedule as any).isPublic || false,
          }}
          onClose={() => {
            setShowEditModal(false);
          }}
          onSuccess={async () => {
            // Ricarica i dati dello schedule per mostrare le modifiche
            await fetchScheduleData();
            setShowEditModal(false);
            showToast({ message: 'Schedule modificato con successo', type: 'success' });
          }}
        />
      )}

      {/* Modal: Firma Documento */}
      <SigningWorkflowModal
        isOpen={signatureModal.open}
        documentId={signatureModal.documentId}
        documentLabel={signatureModal.label}
        batchDocIds={signatureModal.batchDocIds}
        batchLabel={signatureModal.batchLabel}
        savedSignatureUrl={savedSignatureUrl}
        previewHttpHeaders={operateHeaders}
        previewUrl={signatureModal.documentType && signatureModal.documentId
          ? `/api/v1/${signatureModal.documentType === 'attestato' ? 'attestati' : signatureModal.documentType === 'lettera' ? 'lettere-incarico' : 'registri-presenze'}/${signatureModal.documentId}/preview`
          : undefined}
        onClose={closeSignModal}
        onConfirm={handleSignConfirm}
      />

      {/* PDF Preview Dialog */}
      <PDFPreviewDialog
        isOpen={!!pdfPreview}
        onClose={() => setPdfPreview(null)}
        url={pdfPreview?.url || null}
        title={pdfPreview?.title}
      />
    </div>
  );
};

export default ScheduleDetailPage;
