/**
 * GDPR — Pagina Registro attività (Audit Trail)
 *
 * Elenco filtrabile e paginato delle attività GDPR, con export CSV/JSON.
 * Sostituisce il vecchio tab MUI `AuditTrailTab`.
 */

import React, { useState } from 'react';
import {
  History,
  Download,
  Filter,
  X,
  Activity,
  Clock,
  ListChecks
} from 'lucide-react';
import { useAuditTrail } from '../../../hooks/useAuditTrail';
import { useToast } from '../../../hooks/useToast';
import { AuditAction, AuditTrailFilters } from '../../../types/gdpr';
import { GDPRPageHeader } from './GDPRPageHeader';
import { Button } from '../../../components/ui/button';
import { DatePickerElegante } from '../../../components/ui/DatePickerElegante';

const ACTION_OPTIONS: { value: AuditAction; label: string }[] = [
  { value: 'DATA_ACCESS', label: 'Accesso ai dati' },
  { value: 'DATA_EXPORT', label: 'Esportazione dati' },
  { value: 'DATA_MODIFICATION', label: 'Modifica dati' },
  { value: 'DATA_DELETION', label: 'Cancellazione dati' },
  { value: 'CONSENT_GRANTED', label: 'Consenso concesso' },
  { value: 'CONSENT_WITHDRAWN', label: 'Consenso revocato' },
  { value: 'DELETION_REQUESTED', label: 'Cancellazione richiesta' },
  { value: 'DELETION_PROCESSED', label: 'Cancellazione processata' },
  { value: 'LOGIN', label: 'Accesso' },
  { value: 'LOGOUT', label: 'Disconnessione' },
  { value: 'PASSWORD_CHANGE', label: 'Cambio password' },
  { value: 'PROFILE_UPDATE', label: 'Aggiornamento profilo' }
];

const ACTION_BADGE = (action: string): string => {
  const a = (action || '').toLowerCase();
  if (a.includes('granted') || a.includes('login')) return 'bg-emerald-100 text-emerald-700';
  if (a.includes('withdrawn') || a.includes('delet')) return 'bg-red-100 text-red-700';
  if (a.includes('export') || a.includes('access')) return 'bg-blue-100 text-blue-700';
  if (a.includes('modification') || a.includes('update') || a.includes('change')) return 'bg-amber-100 text-amber-700';
  return 'bg-gray-100 text-gray-600';
};

const actionLabel = (action: string) =>
  ACTION_OPTIONS.find((o) => o.value === action)?.label ||
  String(action || '')
    .split('_')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');

const fmtDate = (value: unknown): string => {
  if (!value) return '—';
  const d = new Date(value as string);
  return isNaN(d.getTime()) ? '—' : d.toLocaleString('it-IT', { dateStyle: 'medium', timeStyle: 'short' });
};

export const GDPRAuditPage: React.FC = () => {
  const {
    auditLogs,
    loading,
    error,
    pagination,
    filters,
    refreshAuditTrail,
    goToPage,
    applyFilters,
    clearFilters,
    getAuditStats,
    exportToCSV,
    exportToJSON,
    hasFilters
  } = useAuditTrail();

  const { showToast } = useToast();

  const [draft, setDraft] = useState<AuditTrailFilters>(filters || {});
  const [exporting, setExporting] = useState<'csv' | 'json' | null>(null);

  const logs = Array.isArray(auditLogs) ? auditLogs : [];
  const stats = getAuditStats();
  const page = pagination?.currentPage || 1;
  const totalPages = pagination?.totalPages || 1;

  const handleApply = () => {
    applyFilters(draft);
  };

  const handleClear = () => {
    setDraft({});
    clearFilters();
  };

  const handleExport = async (fmt: 'csv' | 'json') => {
    setExporting(fmt);
    try {
      if (fmt === 'csv') await exportToCSV();
      else await exportToJSON();
      showToast({ type: 'success', message: `Export ${fmt.toUpperCase()} avviato.` });
    } catch {
      showToast({ type: 'error', message: `Export ${fmt.toUpperCase()} non riuscito.` });
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <GDPRPageHeader
        icon={History}
        title="Registro attività"
        subtitle="Tracciabilità completa delle attività GDPR sul tuo account"
        onRefresh={refreshAuditTrail}
        refreshing={loading}
        rightSlot={
          <>
            <Button variant="outline" onClick={() => handleExport('csv')} disabled={exporting === 'csv'} className="gap-2">
              <Download className="h-4 w-4" /> CSV
            </Button>
            <Button variant="outline" onClick={() => handleExport('json')} disabled={exporting === 'json'} className="gap-2">
              <Download className="h-4 w-4" /> JSON
            </Button>
          </>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <ListChecks className="h-5 w-5" />
            </div>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Voci totali</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-50">{stats.totalEntries}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <Clock className="h-5 w-5" />
            </div>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Ultime 24 ore</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-50">{stats.recentActivity}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <Activity className="h-5 w-5" />
            </div>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">In questa pagina</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-50">{stats.currentPageEntries}</p>
        </div>
      </div>

      {/* Filtri */}
      <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-5 w-5 text-blue-600" />
          <h2 className="font-semibold text-gray-900 dark:text-gray-50">Filtri</h2>
          {hasFilters && (
            <button onClick={handleClear} className="ml-auto inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
              <X className="h-4 w-4" /> Azzera
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Azione</label>
            <select
              value={draft.action || ''}
              onChange={(e) => setDraft((p) => ({ ...p, action: (e.target.value || undefined) as AuditAction | undefined }))}
              className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tutte</option>
              {ACTION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Da</label>
            <DatePickerElegante
              value={draft.startDate || null}
              onChange={(d) => setDraft((p) => ({ ...p, startDate: d || undefined }))}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">A</label>
            <DatePickerElegante
              value={draft.endDate || null}
              onChange={(d) => setDraft((p) => ({ ...p, endDate: d || undefined }))}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Tipo di dato</label>
            <input
              type="text"
              value={draft.dataType || ''}
              onChange={(e) => setDraft((p) => ({ ...p, dataType: e.target.value || undefined }))}
              placeholder="es. Person, Consent…"
              className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <Button variant="primary" onClick={handleApply} className="gap-2">
            <Filter className="h-4 w-4" /> Applica filtri
          </Button>
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 text-red-800 p-4 text-sm">{error}</div>
      )}

      {/* Tabella */}
      <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700/50 text-left text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3 font-medium">Data/ora</th>
                <th className="px-4 py-3 font-medium">Azione</th>
                <th className="px-4 py-3 font-medium">Tipo di dato</th>
                <th className="px-4 py-3 font-medium">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-gray-500">Caricamento registro…</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-gray-500">Nessuna attività registrata.</td>
                </tr>
              ) : (
                logs.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-700/30">
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-200 whitespace-nowrap">{fmtDate(entry.timestamp)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-lg text-xs font-semibold ${ACTION_BADGE(entry.action)}`}>
                        {actionLabel(entry.action)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-200">{entry.dataType || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 font-mono text-xs">{entry.ipAddress || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginazione */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <span className="text-sm text-gray-500">
              Pagina {page} di {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => goToPage(page - 1)} disabled={page <= 1 || loading}>
                Precedente
              </Button>
              <Button variant="outline" size="sm" onClick={() => goToPage(page + 1)} disabled={page >= totalPages || loading}>
                Successiva
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default GDPRAuditPage;
