/**
 * Form Submissions View - Visualizzazione risposte per form template
 * 
 * Features:
 * - 3 modalità vista: Tabella, Cards, Analytics
 * - Pannello dettagli laterale
 * - Grafici aggregati (per status, per giorno)
 * - Export Excel
 * - Azioni rapide e cambio stato
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Download, ArrowLeft, RefreshCw, Eye, Table, Grid3x3, Mail, User, Calendar,
  MoreVertical, ChevronDown, Check, Archive, X, BarChart3,
  Clock, CheckCircle, AlertCircle, FileText, TrendingUp
} from 'lucide-react';
import { PieChart, Pie, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell, ResponsiveContainer } from 'recharts';
import { Button } from '../../design-system/atoms/Button';
import { Card } from '../../design-system/molecules/Card';
import { formTemplatesService, getFormSubmissions, updateSubmissionStatus } from '../../services/formTemplates';
import type { FormSubmission, FormTemplate } from '../../types/forms';
import { useToast } from '../../hooks/useToast';
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

// Detail Panel Component
const DetailPanel: React.FC<{
  submission: FormSubmission | null;
  fields: any[];
  onClose: () => void;
  onStatusChange: (id: string, status: FormSubmission['status']) => void;
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
            <p className="font-medium text-gray-900">{submission.name || 'Anonimo'}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <Mail className="w-4 h-4" />
              Email
            </div>
            <p className="font-medium text-gray-900 break-all">{submission.email || 'N/A'}</p>
          </div>
        </div>

        {/* Status con dropdown */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">Stato</label>
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map(option => {
              const config = STATUS_CONFIG[option.value];
              const isActive = submission.status === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => onStatusChange(submission.id, option.value as FormSubmission['status'])}
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
            Risposte del Form ({fields.length} campi)
          </h3>
          <div className="space-y-3">
            {fields.map(field => {
              // Supporta sia campi standard che formData
              const value = field.isStandardField
                ? (submission as any)[field.name]
                : submission.formData?.[field.name];
              return (
                <div key={field.id} className="bg-gray-50 rounded-lg p-4">
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </dt>
                  <dd className="text-sm text-gray-900 break-words whitespace-pre-wrap">
                    {formatFieldValue(value) || <span className="text-gray-400 italic">Non compilato</span>}
                  </dd>
                </div>
              );
            })}
          </div>
        </div>

        {/* Metadata */}
        {submission.metadata && Object.keys(submission.metadata).length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Metadata</h3>
            <pre className="bg-gray-100 rounded-lg p-3 text-xs overflow-x-auto">
              {JSON.stringify(submission.metadata, null, 2)}
            </pre>
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

export const FormSubmissionsView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [template, setTemplate] = useState<FormTemplate | null>(null);
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [fields, setFields] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [selectedSubmission, setSelectedSubmission] = useState<FormSubmission | null>(null);
  const [openActionMenu, setOpenActionMenu] = useState<string | null>(null);
  const [openStatusMenu, setOpenStatusMenu] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const actionMenuRef = useRef<HTMLDivElement>(null);
  const statusMenuRef = useRef<HTMLDivElement>(null);

  // Calcola statistiche
  const stats = useMemo(() => {
    const byStatus: Record<string, number> = {};
    const byDay: Record<string, number> = {};

    submissions.forEach(sub => {
      // Per status
      const status = sub.status || 'NEW';
      byStatus[status] = (byStatus[status] || 0) + 1;

      // Per giorno
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
      .slice(-14) // Ultimi 14 giorni
      .map(([day, count]) => ({ day, risposte: count }));

    return {
      total: submissions.length,
      new: byStatus['NEW'] || 0,
      inProgress: byStatus['IN_PROGRESS'] || 0,
      resolved: byStatus['RESOLVED'] || 0,
      statusData,
      dailyData
    };
  }, [submissions]);

  // Chiudi dropdown quando si clicca fuori
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
        setOpenActionMenu(null);
      }
      if (statusMenuRef.current && !statusMenuRef.current.contains(event.target as Node)) {
        setOpenStatusMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  const loadData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const templateData = await formTemplatesService.getFormTemplate(id);
      setTemplate(templateData);

      const response = await getFormSubmissions({ formTemplateId: id });
      const fetchedSubmissions = response.submissions || [];
      setSubmissions(fetchedSubmissions);

      // Determina i campi dinamici
      let dynamicFields: any[] = templateData.fields || [];

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
          .map((fieldName, idx) => ({
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
            Object.keys(sub.formData).forEach(key => fieldsFromFormData.add(key));
          }
        });

        const formDataFields = Array.from(fieldsFromFormData).map((fieldName, idx) => ({
          id: `fd-${fieldName}`,
          name: fieldName,
          label: fieldName.charAt(0).toUpperCase() + fieldName.slice(1).replace(/([A-Z])/g, ' $1'),
          type: 'text',
          isFormDataField: true
        }));

        dynamicFields = [...fieldsFromStandard, ...formDataFields];
      }

      setFields(dynamicFields);
    } catch (error) {
      console.error('Error loading data:', error);
      showToast({ message: 'Errore nel caricamento dei dati', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (submissionId: string, newStatus: FormSubmission['status']) => {
    try {
      await updateSubmissionStatus(submissionId, newStatus);
      setSubmissions(prev => prev.map(sub => sub.id === submissionId ? { ...sub, status: newStatus } : sub));
      if (selectedSubmission?.id === submissionId) {
        setSelectedSubmission(prev => prev ? { ...prev, status: newStatus } : null);
      }
      setOpenStatusMenu(null);
      setOpenActionMenu(null);
      showToast({ message: 'Stato aggiornato con successo', type: 'success' });
    } catch (error) {
      console.error('Error updating status:', error);
      showToast({ message: 'Errore nell\'aggiornamento dello stato', type: 'error' });
    }
  };

  const exportToExcel = () => {
    if (submissions.length === 0) {
      showToast({ message: 'Nessun dato da esportare', type: 'warning' });
      return;
    }
    const excelData = submissions.map(sub => {
      const row: any = {
        'ID': sub.id,
        'Data Invio': sub.createdAt ? new Date(sub.createdAt).toLocaleString('it-IT') : 'N/A',
        'Stato': STATUS_CONFIG[sub.status]?.label || sub.status,
        'Nome': sub.name || 'N/A',
        'Email': sub.email || 'N/A'
      };
      fields.forEach(field => {
        row[field.label] = formatFieldValue(getFieldValue(sub, field));
      });
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
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  // Helper per ottenere il valore di un campo (sia da submission diretta che da formData)
  const getFieldValue = (submission: FormSubmission, field: any): any => {
    // Se è un campo standard (subject, message, phone, company), leggi direttamente dalla submission
    if (field.isStandardField) {
      return (submission as any)[field.name];
    }
    // Altrimenti leggi da formData
    return submission.formData?.[field.name];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Caricamento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={() => navigate('/forms')} className="flex items-center">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Indietro
              </Button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Risposte: {template?.name}</h1>
                <p className="text-sm text-gray-500">{submissions.length} rispost{submissions.length === 1 ? 'a' : 'e'}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {/* View Mode Toggle */}
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${viewMode === 'table' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  title="Vista Tabella"
                >
                  <Table className="w-4 h-4" />
                  <span className="hidden sm:inline">Tabella</span>
                </button>
                <button
                  onClick={() => setViewMode('cards')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${viewMode === 'cards' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  title="Vista Cards"
                >
                  <Grid3x3 className="w-4 h-4" />
                  <span className="hidden sm:inline">Cards</span>
                </button>
                <button
                  onClick={() => setViewMode('analytics')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${viewMode === 'analytics' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  title="Analytics"
                >
                  <BarChart3 className="w-4 h-4" />
                  <span className="hidden sm:inline">Analytics</span>
                </button>
              </div>

              <Button variant="ghost" onClick={loadData}>
                <RefreshCw className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Aggiorna</span>
              </Button>
              <Button onClick={exportToExcel} disabled={submissions.length === 0}>
                <Download className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Esporta</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards - Always visible */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <FileText className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                <p className="text-xs text-gray-500">Totale</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 border border-blue-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <AlertCircle className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{stats.new}</p>
                <p className="text-xs text-gray-500">Nuove</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 border border-yellow-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-600">{stats.inProgress}</p>
                <p className="text-xs text-gray-500">In Corso</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 border border-green-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
                <p className="text-xs text-gray-500">Risolte</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {submissions.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Eye className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nessuna risposta</h3>
            <p className="text-gray-500">Non ci sono ancora risposte per questo form</p>
          </div>
        ) : viewMode === 'analytics' ? (
          /* Vista Analytics */
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pie Chart - Status Distribution */}
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

              {/* Bar Chart - Daily Submissions */}
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

            {/* Quick stats per campo */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Riepilogo Campi</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {fields.map(field => {
                  const filledCount = submissions.filter(s => s.formData?.[field.name]).length;
                  const percentage = Math.round((filledCount / submissions.length) * 100);
                  return (
                    <div key={field.id} className="bg-gray-50 rounded-lg p-3">
                      <p className="text-sm font-medium text-gray-700 truncate" title={field.label}>
                        {field.label}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">{percentage}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        ) : viewMode === 'cards' ? (
          /* Vista Cards */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {submissions.map(submission => {
              const statusConfig = STATUS_CONFIG[submission.status] || STATUS_CONFIG['NEW'];
              return (
                <div
                  key={submission.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer overflow-hidden"
                  onClick={() => setSelectedSubmission(submission)}
                >
                  {/* Card Header con Status */}
                  <div className={`px-4 py-2 ${statusConfig.bgColor} flex items-center justify-between`}>
                    <span className={`text-xs font-semibold ${statusConfig.color} flex items-center gap-1`}>
                      {statusConfig.icon}
                      {statusConfig.label}
                    </span>
                    <span className="text-xs text-gray-500">
                      {submission.createdAt ? new Date(submission.createdAt).toLocaleDateString('it-IT') : ''}
                    </span>
                  </div>

                  {/* Card Content */}
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-gray-900">{submission.name || 'Anonimo'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                      <Mail className="w-3 h-3" />
                      <span className="truncate">{submission.email || 'N/A'}</span>
                    </div>

                    {/* Preview dei primi 3 campi */}
                    <div className="space-y-2 border-t pt-3">
                      {fields.slice(0, 3).map(field => {
                        const value = getFieldValue(submission, field);
                        if (!value) return null;
                        return (
                          <div key={field.id} className="text-sm">
                            <span className="text-gray-500">{field.label}: </span>
                            <span className="text-gray-900 truncate">{formatFieldValue(value).slice(0, 50)}</span>
                          </div>
                        );
                      })}
                      {fields.length > 3 && (
                        <p className="text-xs text-blue-600 font-medium">+{fields.length - 3} altri campi →</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Vista Tabella */
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="overflow-x-auto overflow-y-visible">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {/* Colonna Azioni - PRIMA */}
                    <th className="px-3 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider w-16 sticky left-0 bg-gray-50 z-10">
                      Azioni
                    </th>
                    <th className="px-3 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider w-12">
                      #
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-28">
                      Stato
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-36">
                      Data
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Nome
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Email
                    </th>
                    {/* TUTTI i campi del form */}
                    {fields.map(field => (
                      <th key={field.id} className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[120px] max-w-[200px]">
                        <div className="truncate" title={field.label}>
                          {field.label}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {submissions.map((submission, index) => {
                    const statusConfig = STATUS_CONFIG[submission.status] || STATUS_CONFIG['NEW'];
                    return (
                      <tr
                        key={submission.id}
                        className="hover:bg-blue-50/50 cursor-pointer transition-colors"
                        onClick={() => setSelectedSubmission(submission)}
                      >
                        {/* Colonna Azioni - PRIMA */}
                        <td className="px-3 py-3 text-sm whitespace-nowrap sticky left-0 bg-white z-20">
                          <div className="flex justify-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const rect = e.currentTarget.getBoundingClientRect();
                                setMenuPosition({ top: rect.bottom + 4, left: rect.left });
                                setOpenActionMenu(openActionMenu === submission.id ? null : submission.id);
                                setOpenStatusMenu(null);
                              }}
                              className="flex items-center justify-center w-9 h-9 text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors border border-gray-300 shadow-sm"
                              title="Azioni"
                            >
                              <MoreVertical className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                        {/* Numero riga */}
                        <td className="px-3 py-3 text-sm text-gray-500 text-center whitespace-nowrap">
                          {index + 1}
                        </td>
                        {/* Status Badge con dropdown */}
                        <td className="px-3 py-3 text-sm whitespace-nowrap">
                          <div className="relative" ref={openStatusMenu === submission.id ? statusMenuRef : null}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenStatusMenu(openStatusMenu === submission.id ? null : submission.id);
                              }}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full ${statusConfig.bgColor} ${statusConfig.color} hover:opacity-80 transition-opacity`}
                            >
                              {statusConfig.icon}
                              {statusConfig.label}
                              <ChevronDown className="w-3 h-3" />
                            </button>
                            {openStatusMenu === submission.id && (
                              <div className="absolute left-0 top-full mt-1 w-36 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                                {STATUS_OPTIONS.map(option => (
                                  <button
                                    key={option.value}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStatusChange(submission.id, option.value as FormSubmission['status']);
                                    }}
                                    className={`flex items-center justify-between w-full px-3 py-2 text-sm hover:bg-gray-50 ${submission.status === option.value ? 'font-semibold text-blue-600 bg-blue-50' : 'text-gray-700'
                                      }`}
                                  >
                                    <span className="flex items-center gap-2">
                                      {STATUS_CONFIG[option.value]?.icon}
                                      {option.label}
                                    </span>
                                    {submission.status === option.value && <Check className="w-4 h-4" />}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-700 whitespace-nowrap">
                          {submission.createdAt ? new Date(submission.createdAt).toLocaleDateString('it-IT', {
                            day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit'
                          }) : 'N/A'}
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-900 font-medium whitespace-nowrap">
                          {submission.name || <span className="text-gray-400">Anonimo</span>}
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-700 whitespace-nowrap max-w-[200px] truncate">
                          {submission.email || 'N/A'}
                        </td>
                        {/* TUTTI i campi del form */}
                        {fields.map(field => {
                          const value = getFieldValue(submission, field);
                          return (
                            <td key={field.id} className="px-3 py-3 text-sm text-gray-600 min-w-[120px] max-w-[200px]">
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
          </div>
        )}
      </div>

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
                const sub = submissions.find(s => s.id === openActionMenu);
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
                    handleStatusChange(openActionMenu, option.value as FormSubmission['status']);
                  }
                }}
                className={`flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-gray-50 ${submissions.find(s => s.id === openActionMenu)?.status === option.value
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

      {/* Detail Panel (Slide-in) */}
      {selectedSubmission && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-40"
            onClick={() => setSelectedSubmission(null)}
          />
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

export default FormSubmissionsView;
