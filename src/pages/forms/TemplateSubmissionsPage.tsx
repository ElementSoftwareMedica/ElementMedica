/**
 * TemplateSubmissionsPage - Visualizzazione risposte per form template
 * Route: /forms/templates/:templateId/submissions
 * 
 * Features:
 * - 3 modalità vista: Tabella, Cards, Analytics
 * - Pannello dettagli laterale
 * - Grafici aggregati (per status, per giorno)
 * - Export Excel
 * - Azioni rapide e cambio stato
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Download, ArrowLeft, RefreshCw, Eye, Table, LayoutGrid, Mail, User, Calendar,
  MoreVertical, ChevronDown, Check, Archive, X, BarChart3,
  Clock, CheckCircle, AlertCircle, FileText, TrendingUp, Filter
} from 'lucide-react';
import { PieChart, Pie, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer } from 'recharts';
import { Button } from '../../design-system/atoms/Button';
import { Card } from '../../design-system/molecules/Card';
import { Input } from '../../design-system/atoms/Input';
import { Select } from '../../design-system/atoms/Select';
import { formTemplatesService } from '../../services/formTemplates';
import { getContactSubmissions, ContactSubmission, updateContactSubmissionStatus } from '../../services/contactSubmissionsManagement';
import type { FormTemplate } from '../../services/formTemplates';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../context/AuthContext';
import { useTenantFilter } from '../../context/TenantFilterContext';
import * as XLSX from 'xlsx';

type ViewMode = 'table' | 'cards' | 'analytics';

// Status configuration
const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; chartColor: string; icon: React.ReactNode }> = {
  'NEW': { label: 'Nuova', color: 'text-blue-700', bgColor: 'bg-blue-100', chartColor: '#3B82F6', icon: <AlertCircle className="w-4 h-4" /> },
  'READ': { label: 'Letta', color: 'text-gray-700', bgColor: 'bg-gray-100', chartColor: '#6B7280', icon: <Eye className="w-4 h-4" /> },
  'IN_PROGRESS': { label: 'In Corso', color: 'text-yellow-700', bgColor: 'bg-yellow-100', chartColor: '#F59E0B', icon: <Clock className="w-4 h-4" /> },
  'RESOLVED': { label: 'Risolta', color: 'text-green-700', bgColor: 'bg-green-100', chartColor: '#10B981', icon: <CheckCircle className="w-4 h-4" /> },
  'ARCHIVED': { label: 'Archiviata', color: 'text-red-700', bgColor: 'bg-red-100', chartColor: '#EF4444', icon: <Archive className="w-4 h-4" /> },
  'pending': { label: 'In Attesa', color: 'text-blue-700', bgColor: 'bg-blue-100', chartColor: '#3B82F6', icon: <AlertCircle className="w-4 h-4" /> },
  'reviewed': { label: 'Revisionata', color: 'text-gray-700', bgColor: 'bg-gray-100', chartColor: '#6B7280', icon: <Eye className="w-4 h-4" /> },
  'archived': { label: 'Archiviata', color: 'text-red-700', bgColor: 'bg-red-100', chartColor: '#EF4444', icon: <Archive className="w-4 h-4" /> },
};

const STATUS_OPTIONS = [
  { value: 'NEW', label: 'Nuova' },
  { value: 'READ', label: 'Letta' },
  { value: 'IN_PROGRESS', label: 'In Corso' },
  { value: 'RESOLVED', label: 'Risolta' },
  { value: 'ARCHIVED', label: 'Archiviata' },
];

// ─── Risoluzione robusta dei valori dei campi submission ──────────────────────
// I dati del form sono salvati in submission.formData con chiave = field.name.
// Per robustezza (varianti di chiave, label, snake/camel, maiuscole) cerchiamo il
// valore con match normalizzato su formData → metadata → submission.
const normalizeKey = (k: string) => String(k || '').toLowerCase().replace(/[\s_\-.]+/g, '');
const lookupByKey = (obj: any, key: string): any => {
  if (!obj || typeof obj !== 'object' || !key) return undefined;
  if (obj[key] !== undefined) return obj[key];
  const target = normalizeKey(key);
  const found = Object.keys(obj).find(k => normalizeKey(k) === target);
  return found !== undefined ? obj[found] : undefined;
};
const isBlank = (v: any) => v === undefined || v === null || v === '';
const resolveFieldValue = (submission: any, field: any): any => {
  if (!submission || !field) return undefined;
  const fd = submission.formData || {};
  const md = submission.metadata || {};
  const candidates = [field.name, field.label, field.id].filter(Boolean);
  if (field.isStandardField && !isBlank(submission[field.name])) return submission[field.name];
  for (const key of candidates) { const v = lookupByKey(fd, key); if (!isBlank(v)) return v; }
  for (const key of candidates) { const v = lookupByKey(md, key); if (!isBlank(v)) return v; }
  for (const key of candidates) { if (!isBlank(submission[key])) return submission[key]; }
  return undefined;
};
const FALLBACK_NAMES = ['utente anonimo', 'anonimo', 'submission da form', ''];
const resolveSubmissionName = (submission: any): string => {
  const n = String(submission?.name || '').trim();
  if (n && !FALLBACK_NAMES.includes(n.toLowerCase())) return n;
  const fd = submission?.formData || {};
  const first = lookupByKey(fd, 'nome') ?? lookupByKey(fd, 'firstName') ?? lookupByKey(fd, 'name') ?? '';
  const last = lookupByKey(fd, 'cognome') ?? lookupByKey(fd, 'lastName') ?? lookupByKey(fd, 'surname') ?? '';
  const composed = `${first} ${last}`.trim();
  if (composed) return composed;
  const full = lookupByKey(fd, 'nomeCompleto') ?? lookupByKey(fd, 'fullName') ?? lookupByKey(fd, 'ragioneSociale') ?? lookupByKey(fd, 'companyName');
  return (full && String(full).trim()) || n || 'Anonimo';
};
const resolveSubmissionEmail = (submission: any): string => {
  const e = String(submission?.email || '').trim();
  if (e && !['noreply@example.com', 'noreply@form.local'].includes(e.toLowerCase())) return e;
  const fd = submission?.formData || {};
  const fe = lookupByKey(fd, 'email') ?? lookupByKey(fd, 'mail') ?? lookupByKey(fd, 'emailPersonal') ?? lookupByKey(fd, 'companyEmail');
  return (fe && String(fe).trim()) || e || '';
};

// Detail Panel Component
const DetailPanel: React.FC<{
  submission: ContactSubmission | null;
  fields: any[];
  onClose: () => void;
  onStatusChange: (id: string, status: string) => void;
  formatFieldValue: (value: any) => string;
}> = ({ submission, fields, onClose, onStatusChange, formatFieldValue }) => {
  if (!submission) return null;

  const statusConfig = STATUS_CONFIG[submission.status] || STATUS_CONFIG['NEW'];

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-white shadow-2xl z-50 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Dettagli Risposta</h2>
          <p className="text-sm text-gray-500">
            {submission.createdAt ? new Date(submission.createdAt).toLocaleString('it-IT') : 'N/A'}
          </p>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Info principali */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <User className="w-4 h-4" />
              Nome
            </div>
            <p className="font-medium text-gray-900">{resolveSubmissionName(submission)}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <Mail className="w-4 h-4" />
              Email
            </div>
            <p className="font-medium text-gray-900 break-all">{resolveSubmissionEmail(submission) || 'N/A'}</p>
          </div>
        </div>

        {/* Status con bottoni */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">Stato</label>
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map(option => {
              const config = STATUS_CONFIG[option.value];
              const isActive = submission.status === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => onStatusChange(submission.id, option.value)}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border-2 transition-all ${isActive
                    ? `${config.bgColor} ${config.color} border-current`
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                    }`}
                >
                  {config.icon}
                  {option.label}
                  {isActive && <Check className="w-4 h-4" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Campi del form */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Risposte del Form ({fields.length > 0 ? fields.length : Object.keys(submission.formData || {}).length} campi)
          </h3>
          <div className="space-y-3">
            {fields.length > 0 ? (
              fields.map(field => {
                // Risoluzione robusta del valore (formData/metadata/standard, varianti chiave)
                const value = resolveFieldValue(submission, field);
                return (
                  <div key={field.id || field.name} className="bg-gray-50 rounded-lg p-4">
                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </dt>
                    <dd className="text-sm text-gray-900 break-words whitespace-pre-wrap">
                      {formatFieldValue(value) || <span className="text-gray-400 italic">Non compilato</span>}
                    </dd>
                  </div>
                );
              })
            ) : (
              // Fallback: mostra tutti i campi da formData
              Object.entries(submission.formData || {}).map(([key, value]) => (
                <div key={key} className="bg-gray-50 rounded-lg p-4">
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    {key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim()}
                  </dt>
                  <dd className="text-sm text-gray-900 break-words whitespace-pre-wrap">
                    {formatFieldValue(value) || <span className="text-gray-400 italic">Non compilato</span>}
                  </dd>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Messaggio se presente */}
        {submission.message && !submission.message.startsWith('{') && (
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-700 mb-2">Messaggio</h3>
            <p className="text-sm text-gray-900 whitespace-pre-wrap">{submission.message}</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t bg-gray-50 px-6 py-4 flex gap-3">
        <Button variant="outline" onClick={onClose} className="flex-1">
          Chiudi
        </Button>
        <Button
          variant="destructive"
          onClick={() => {
            onStatusChange(submission.id, 'ARCHIVED');
            onClose();
          }}
          className="flex-1"
        >
          <Archive className="w-4 h-4 mr-2" />
          Archivia
        </Button>
      </div>
    </div>
  );
};

const TemplateSubmissionsPage: React.FC = () => {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const { hasPermission } = useAuth();

  // Detect context: CMS management or Test section
  const contextBasePath = location.pathname.includes('/management/cms')
    ? '/management/cms/forms'
    : '/test';
  const { getTenantFilterParams, tenantFilterKey, isReady } = useTenantFilter();

  const [loading, setLoading] = useState(true);
  const [template, setTemplate] = useState<FormTemplate | null>(null);
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
  const [fields, setFields] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [selectedSubmission, setSelectedSubmission] = useState<ContactSubmission | null>(null);
  const [openActionMenu, setOpenActionMenu] = useState<string | null>(null);
  const [openStatusMenu, setOpenStatusMenu] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [statusMenuPosition, setStatusMenuPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [filters, setFilters] = useState({
    status: '',
    search: '',
    dateFrom: '',
    dateTo: ''
  });

  const actionMenuRef = useRef<HTMLDivElement>(null);

  const canEdit = hasPermission('form_submissions', 'update');

  // Calcola statistiche
  const stats = useMemo(() => {
    const byStatus: Record<string, number> = {};
    const byDay: Record<string, number> = {};

    submissions.forEach(sub => {
      const status = sub.status || 'NEW';
      byStatus[status] = (byStatus[status] || 0) + 1;

      if (sub.createdAt) {
        const day = new Date(sub.createdAt).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
        byDay[day] = (byDay[day] || 0) + 1;
      }
    });

    const statusData = Object.entries(byStatus).map(([status, count]) => ({
      name: STATUS_CONFIG[status]?.label || status,
      value: count,
      color: STATUS_CONFIG[status]?.chartColor || '#6B7280'
    }));

    const dailyData = Object.entries(byDay)
      .sort((a, b) => {
        const [dayA, monthA] = a[0].split('/').map(Number);
        const [dayB, monthB] = b[0].split('/').map(Number);
        return monthA === monthB ? dayA - dayB : monthA - monthB;
      })
      .slice(-14)
      .map(([day, count]) => ({ day, risposte: count }));

    return {
      total: submissions.length,
      new: byStatus['NEW'] || byStatus['pending'] || 0,
      inProgress: byStatus['IN_PROGRESS'] || 0,
      resolved: byStatus['RESOLVED'] || byStatus['reviewed'] || 0,
      statusData,
      dailyData
    };
  }, [submissions]);

  // Filtri submissions
  const filteredSubmissions = useMemo(() => {
    return submissions.filter(sub => {
      if (filters.status && sub.status !== filters.status) return false;
      if (filters.search) {
        const search = filters.search.toLowerCase();
        if (!resolveSubmissionName(sub).toLowerCase().includes(search) &&
          !resolveSubmissionEmail(sub).toLowerCase().includes(search) &&
          !sub.subject?.toLowerCase().includes(search)) {
          return false;
        }
      }
      return true;
    });
  }, [submissions, filters]);

  // Chiudi dropdown quando si clicca fuori (ora gestito dai backdrop)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
        setOpenActionMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (templateId && isReady) loadData();
  }, [templateId, isReady, tenantFilterKey]);

  const loadData = useCallback(async () => {
    if (!templateId) return;
    try {
      setLoading(true);

      const tenantParams = getTenantFilterParams();

      // Carica template
      const tmpl = await formTemplatesService.getFormTemplate(templateId);
      setTemplate(tmpl);

      // Carica submissions con tenant params
      const data = await getContactSubmissions({
        templateName: tmpl.name,  // Filtra per nome template (campo presente su ContactSubmission)
        page: 1,
        limit: 100,
      });
      const fetchedSubmissions = data.submissions || [];
      setSubmissions(fetchedSubmissions);

      // Determina i campi dinamici
      let dynamicFields: any[] = tmpl.fields || [];

      // Se non ci sono campi definiti nel template, estrai i campi dalle submissions
      if (dynamicFields.length === 0 && fetchedSubmissions.length > 0) {
        // Campi standard per ContactSubmission (escludi quelli già mostrati come colonne fisse)
        const standardFields = ['subject', 'message', 'phone', 'company'];
        const standardLabels: Record<string, string> = {
          'subject': 'Oggetto',
          'message': 'Messaggio',
          'phone': 'Telefono',
          'company': 'Azienda'
        };

        // Aggiungi i campi standard che hanno valori
        const fieldsFromStandard = standardFields
          .filter(fieldName => fetchedSubmissions.some(s => (s as any)[fieldName]))
          .map((fieldName) => ({
            id: `std-${fieldName}`,
            name: fieldName,
            label: standardLabels[fieldName] || fieldName,
            type: 'text',
            isStandardField: true
          }));

        // Aggiungi i campi da formData se presente
        const fieldsFromFormData = new Set<string>();
        fetchedSubmissions.forEach(sub => {
          if (sub.formData && typeof sub.formData === 'object') {
            Object.keys(sub.formData as object).forEach(key => fieldsFromFormData.add(key));
          }
        });

        const formDataFields = Array.from(fieldsFromFormData).map((fieldName) => ({
          id: `fd-${fieldName}`,
          name: fieldName,
          label: fieldName.charAt(0).toUpperCase() + fieldName.slice(1).replace(/([A-Z])/g, ' $1'),
          type: 'text',
          isFormDataField: true
        }));

        // Aggiungi i campi da metadata se presente (per contact submissions da public page)
        const fieldsFromMetadata = new Set<string>();
        const metadataLabels: Record<string, string> = {
          'requestType': 'Tipo Richiesta',
          'courseTitle': 'Titolo Corso',
          'courseVariant': 'Variante Corso',
          'selectedVariant': 'Variante Selezionata'
        };
        fetchedSubmissions.forEach(sub => {
          if (sub.metadata && typeof sub.metadata === 'object') {
            Object.keys(sub.metadata as object).forEach(key => {
              // Escludi campi interni
              if (!['formTemplateId', 'submittedAt'].includes(key)) {
                fieldsFromMetadata.add(key);
              }
            });
          }
        });

        const metadataFields = Array.from(fieldsFromMetadata).map((fieldName) => ({
          id: `meta-${fieldName}`,
          name: fieldName,
          label: metadataLabels[fieldName] || fieldName.charAt(0).toUpperCase() + fieldName.slice(1).replace(/([A-Z])/g, ' $1'),
          type: 'text',
          isMetadataField: true
        }));

        dynamicFields = [...fieldsFromStandard, ...formDataFields, ...metadataFields];
      }

      setFields(dynamicFields);
    } catch (error) {
      showToast({ message: 'Errore nel caricamento dei dati', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [templateId, getTenantFilterParams, tenantFilterKey, showToast]);

  const handleStatusChange = async (submissionId: string, newStatus: string) => {
    try {
      // Chiama l'API per aggiornare lo status
      await updateContactSubmissionStatus(submissionId, newStatus as ContactSubmission['status']);

      // Aggiorna lo stato locale
      setSubmissions(prev => prev.map(sub =>
        sub.id === submissionId ? { ...sub, status: newStatus as ContactSubmission['status'] } : sub
      ));
      if (selectedSubmission?.id === submissionId) {
        setSelectedSubmission(prev => prev ? { ...prev, status: newStatus as ContactSubmission['status'] } : null);
      }
      setOpenStatusMenu(null);
      setOpenActionMenu(null);
      showToast({ message: 'Stato aggiornato con successo', type: 'success' });
    } catch (error) {
      showToast({ message: 'Errore nell\'aggiornamento dello stato', type: 'error' });
    }
  };

  const exportToExcel = () => {
    if (filteredSubmissions.length === 0) {
      showToast({ message: 'Nessun dato da esportare', type: 'warning' });
      return;
    }

    const excelData = filteredSubmissions.map(sub => {
      const row: any = {
        'Data': sub.createdAt ? new Date(sub.createdAt).toLocaleString('it-IT') : 'N/A',
        'Stato': STATUS_CONFIG[sub.status]?.label || sub.status,
        'Nome': resolveSubmissionName(sub) || 'N/A',
        'Email': resolveSubmissionEmail(sub) || 'N/A',
        'Telefono': sub.phone || '',
        'Oggetto': sub.subject || ''
      };

      // Aggiungi campi form
      if (fields.length > 0) {
        fields.forEach(field => {
          const value = resolveFieldValue(sub, field);
          row[field.label] = formatFieldValue(value);
        });
      } else {
        Object.entries(sub.formData || {}).forEach(([key, value]) => {
          row[key] = formatFieldValue(value);
        });
      }

      return row;
    });

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Risposte');
    const fileName = `${template?.name || 'form'}_risposte_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    showToast({ message: 'Export completato!', type: 'success' });
  };

  const formatFieldValue = (value: any): string => {
    if (value === null || value === undefined) return '';
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'boolean') return value ? 'Sì' : 'No';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  // Helper per ottenere il valore di un campo (risoluzione robusta condivisa)
  const getFieldValue = (submission: ContactSubmission, field: any): any =>
    resolveFieldValue(submission, field);

  // Guard: no templateId
  if (!templateId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="p-6 text-center">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Template non specificato</h3>
          <Button onClick={() => navigate(contextBasePath)}>Torna ai Form</Button>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Caricamento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 -mx-6 -mt-6 px-6 py-4 sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={() => navigate(contextBasePath)} className="flex items-center">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Indietro
            </Button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Risposte: {template?.name}</h1>
              <p className="text-sm text-gray-500">{filteredSubmissions.length} rispost{filteredSubmissions.length === 1 ? 'a' : 'e'}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${viewMode === 'table' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
              >
                <Table className="w-4 h-4" />
                <span className="hidden sm:inline">Tabella</span>
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${viewMode === 'cards' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
              >
                <LayoutGrid className="w-4 h-4" />
                <span className="hidden sm:inline">Cards</span>
              </button>
              <button
                onClick={() => setViewMode('analytics')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${viewMode === 'analytics' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span className="hidden sm:inline">Analytics</span>
              </button>
            </div>

            <Button variant="ghost" onClick={loadData}>
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button onClick={exportToExcel} disabled={filteredSubmissions.length === 0}>
              <Download className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Esporta</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <FileText className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-xs text-gray-500">Totale</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border border-blue-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <AlertCircle className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">{stats.new}</p>
              <p className="text-xs text-gray-500">Nuove</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border border-yellow-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-600">{stats.inProgress}</p>
              <p className="text-xs text-gray-500">In Corso</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border border-green-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
              <p className="text-xs text-gray-500">Risolte</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Filter className="h-5 w-5 text-gray-400" />
          <Input
            placeholder="Cerca per nome, email..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            className="flex-1 max-w-xs"
          />
          <Select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            options={[
              { value: '', label: 'Tutti gli stati' },
              ...STATUS_OPTIONS.map(s => ({ value: s.value, label: s.label }))
            ]}
            className="w-40"
          />
        </div>
      </Card>

      {/* Content */}
      {filteredSubmissions.length === 0 ? (
        <Card className="p-12 text-center">
          <Eye className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nessuna risposta</h3>
          <p className="text-gray-500">Non ci sono risposte che corrispondono ai filtri</p>
        </Card>
      ) : viewMode === 'analytics' ? (
        /* Vista Analytics */
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-gray-400" />
                Distribuzione per Stato
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                    >
                      {stats.statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-gray-400" />
                Risposte Ultimi 14 Giorni
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.dailyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="risposte" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Riepilogo campi */}
          {fields.length > 0 && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Riepilogo Campi</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {fields.map(field => {
                  const filledCount = filteredSubmissions.filter(s =>
                    (s.formData as Record<string, any>)?.[field.name]
                  ).length;
                  const percentage = filteredSubmissions.length > 0
                    ? Math.round((filledCount / filteredSubmissions.length) * 100)
                    : 0;
                  return (
                    <div key={field.id || field.name} className="bg-gray-50 rounded-lg p-3">
                      <p className="text-sm font-medium text-gray-700 truncate">{field.label}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${percentage}%` }} />
                        </div>
                        <span className="text-xs text-gray-500">{percentage}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      ) : viewMode === 'cards' ? (
        /* Vista Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSubmissions.map(submission => {
            const statusConfig = STATUS_CONFIG[submission.status] || STATUS_CONFIG['NEW'];
            return (
              <div
                key={submission.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer overflow-hidden"
                onClick={() => setSelectedSubmission(submission)}
              >
                <div className={`px-4 py-2 ${statusConfig.bgColor} flex items-center justify-between`}>
                  <span className={`text-xs font-semibold ${statusConfig.color} flex items-center gap-1`}>
                    {statusConfig.icon}
                    {statusConfig.label}
                  </span>
                  <span className="text-xs text-gray-500">
                    {submission.createdAt ? new Date(submission.createdAt).toLocaleDateString('it-IT') : ''}
                  </span>
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="font-medium text-gray-900">{submission.name || 'Anonimo'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                    <Mail className="w-3 h-3" />
                    <span className="truncate">{submission.email || 'N/A'}</span>
                  </div>

                  {/* Preview primi 3 campi */}
                  <div className="space-y-2 border-t pt-3">
                    {(fields.length > 0 ? fields.slice(0, 3) : Object.keys(submission.formData || {}).slice(0, 3).map(k => ({ name: k, label: k }))).map((field: any) => {
                      const value = field.isStandardField
                        ? (submission as any)[field.name]
                        : (submission.formData as Record<string, any>)?.[field.name];
                      if (!value) return null;
                      return (
                        <div key={field.name} className="text-sm">
                          <span className="text-gray-500">{field.label}: </span>
                          <span className="text-gray-900">{formatFieldValue(value).slice(0, 40)}</span>
                        </div>
                      );
                    })}
                    <p className="text-xs text-blue-600 font-medium">Clicca per dettagli →</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Vista Tabella */
        <Card>
          <div className="overflow-x-auto overflow-y-visible">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {/* Colonna # - PRIMA */}
                  <th className="px-3 py-3 text-center text-xs font-semibold text-gray-600 uppercase w-12">#</th>
                  {/* Colonna Azioni - SECONDA */}
                  <th className="px-3 py-3 text-center text-xs font-semibold text-gray-600 uppercase w-24">Azioni</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase w-28">Stato</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase w-36">Data</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Nome</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Email</th>
                  {/* TUTTI i campi del form */}
                  {fields.map(field => (
                    <th key={field.id || field.name} className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase min-w-[120px] max-w-[200px]">
                      <div className="truncate" title={field.label}>
                        {field.label}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredSubmissions.map((submission, index) => {
                  const statusConfig = STATUS_CONFIG[submission.status] || STATUS_CONFIG['NEW'];
                  return (
                    <tr
                      key={submission.id}
                      className="hover:bg-blue-50/50 cursor-pointer transition-colors"
                      onClick={() => setSelectedSubmission(submission)}
                    >
                      {/* Numero riga - PRIMA */}
                      <td className="px-3 py-3 text-sm text-gray-500 text-center whitespace-nowrap">
                        {index + 1}
                      </td>
                      {/* Colonna Azioni - SECONDA con pillola blu */}
                      <td className="px-3 py-3 text-sm whitespace-nowrap">
                        <div className="flex justify-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const rect = e.currentTarget.getBoundingClientRect();
                              setMenuPosition({ top: rect.bottom + 4, left: rect.left });
                              setOpenActionMenu(openActionMenu === submission.id ? null : submission.id);
                              setOpenStatusMenu(null);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-full transition-colors shadow-sm"
                          >
                            Azioni
                            <ChevronDown className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                      {/* Status Badge con dropdown */}
                      <td className="px-3 py-3 text-sm whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (canEdit) {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setStatusMenuPosition({ top: rect.bottom + 4, left: rect.left });
                              setOpenStatusMenu(openStatusMenu === submission.id ? null : submission.id);
                              setOpenActionMenu(null);
                            }
                          }}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full ${statusConfig.bgColor} ${statusConfig.color} ${canEdit ? 'hover:opacity-80 cursor-pointer' : ''}`}
                        >
                          {statusConfig.icon}
                          {statusConfig.label}
                          {canEdit && <ChevronDown className="w-3 h-3" />}
                        </button>
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-700 whitespace-nowrap">
                        {submission.createdAt ? new Date(submission.createdAt).toLocaleDateString('it-IT', {
                          day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit'
                        }) : 'N/A'}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-900 font-medium whitespace-nowrap">
                        {resolveSubmissionName(submission) || <span className="text-gray-400">Anonimo</span>}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-700 whitespace-nowrap max-w-[200px] truncate">
                        {resolveSubmissionEmail(submission) || 'N/A'}
                      </td>
                      {/* TUTTI i campi del form */}
                      {fields.map(field => {
                        const value = getFieldValue(submission, field);
                        return (
                          <td key={field.id || field.name} className="px-3 py-3 text-sm text-gray-600 min-w-[120px] max-w-[200px]">
                            <div className="truncate" title={formatFieldValue(value)}>
                              {formatFieldValue(value) || <span className="text-gray-300">-</span>}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Action Menu Portal - Renderizzato fuori dalla tabella */}
      {openActionMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpenActionMenu(null)}
          />
          <div
            className="fixed z-50 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-1"
            style={{ top: menuPosition.top, left: menuPosition.left }}
          >
            <button
              onClick={() => {
                const sub = filteredSubmissions.find(s => s.id === openActionMenu);
                if (sub) setSelectedSubmission(sub);
                setOpenActionMenu(null);
              }}
              className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              <Eye className="w-4 h-4" />
              Visualizza Dettagli
            </button>
            <hr className="my-1" />
            {STATUS_OPTIONS.map(option => (
              <button
                key={option.value}
                onClick={() => {
                  if (openActionMenu) {
                    handleStatusChange(openActionMenu, option.value);
                  }
                }}
                className={`flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-gray-50 ${filteredSubmissions.find(s => s.id === openActionMenu)?.status === option.value
                  ? 'font-semibold text-blue-600 bg-blue-50'
                  : 'text-gray-700'
                  }`}
              >
                {STATUS_CONFIG[option.value]?.icon}
                {option.label}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Status Menu Portal - Renderizzato fuori dalla tabella */}
      {openStatusMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpenStatusMenu(null)}
          />
          <div
            className="fixed z-50 w-40 bg-white rounded-lg shadow-xl border border-gray-200 py-1"
            style={{ top: statusMenuPosition.top, left: statusMenuPosition.left }}
          >
            {STATUS_OPTIONS.map(option => (
              <button
                key={option.value}
                onClick={(e) => {
                  e.stopPropagation();
                  if (openStatusMenu) {
                    handleStatusChange(openStatusMenu, option.value);
                  }
                }}
                className={`flex items-center justify-between w-full px-3 py-2 text-sm hover:bg-gray-50 ${filteredSubmissions.find(s => s.id === openStatusMenu)?.status === option.value
                  ? 'font-semibold text-blue-600 bg-blue-50'
                  : 'text-gray-700'
                  }`}
              >
                <span className="flex items-center gap-2">
                  {STATUS_CONFIG[option.value]?.icon}
                  {option.label}
                </span>
                {filteredSubmissions.find(s => s.id === openStatusMenu)?.status === option.value && (
                  <Check className="w-4 h-4" />
                )}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Detail Panel */}
      {selectedSubmission && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setSelectedSubmission(null)} />
          <DetailPanel
            submission={selectedSubmission}
            fields={fields}
            onClose={() => setSelectedSubmission(null)}
            onStatusChange={handleStatusChange}
            formatFieldValue={formatFieldValue}
          />
        </>
      )}
    </div>
  );
};

export default TemplateSubmissionsPage;
