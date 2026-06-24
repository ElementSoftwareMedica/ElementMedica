/**
 * GDPR — Pagina Esportazione & Cancellazione dati
 *
 * Esportazione dati personali (download diretto) + richiesta di cancellazione
 * ("diritto all'oblio"). Sostituisce i vecchi tab MUI `DataExportTab` +
 * `DeletionRequestTab`.
 */

import React, { useState } from 'react';
import {
  Download,
  Database,
  FileJson,
  FileSpreadsheet,
  Trash2,
  AlertTriangle,
  Clock,
  Ban
} from 'lucide-react';
import { useDataExport } from '../../../hooks/useDataExport';
import { useDeletionRequest } from '../../../hooks/useDeletionRequest';
import { useToast } from '../../../hooks/useToast';
import { useAuth } from '../../../context/AuthContext';
import { DeletionRequestFormData } from '../../../types/gdpr';
import { GDPRPageHeader } from './GDPRPageHeader';
import { GDPRConfirmDialog } from './GDPRConfirmDialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription
} from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';

// Formattazione data robusta (evita crash su date assenti/non valide)
const fmtDate = (value: unknown): string => {
  if (!value) return '—';
  const d = new Date(value as string);
  return isNaN(d.getTime()) ? '—' : d.toLocaleString('it-IT', { dateStyle: 'medium', timeStyle: 'short' });
};

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-blue-100 text-blue-700',
  processing: 'bg-blue-100 text-blue-700',
  completed: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-600'
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'In attesa',
  approved: 'Approvata',
  processing: 'In elaborazione',
  completed: 'Completata',
  rejected: 'Rifiutata',
  cancelled: 'Annullata'
};

export const GDPRExportPage: React.FC = () => {
  const exportHook = useDataExport();
  const deletion = useDeletionRequest();
  const { showToast } = useToast();
  const { user } = useAuth();

  const [format, setFormat] = useState<'json' | 'csv'>('json');
  const [exporting, setExporting] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<DeletionRequestFormData>({
    reason: '',
    confirmEmail: '',
    anonymize: false,
    confirmDeletion: false,
    additionalInfo: ''
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const exportRequests = Array.isArray(exportHook.exportRequests) ? exportHook.exportRequests : [];
  const deletionRequests = Array.isArray(deletion.deletionRequests) ? deletion.deletionRequests : [];
  const dStats = deletion.getDeletionStats();

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportHook.exportAndDownload(format);
      showToast({ type: 'success', message: `Esportazione ${format.toUpperCase()} avviata: download in corso.` });
    } catch {
      showToast({ type: 'error', message: 'Esportazione non riuscita. Verifica i consensi e riprova.' });
    } finally {
      setExporting(false);
    }
  };

  const handleSubmitDeletion = async () => {
    const validation = deletion.validateFormData(form);
    if (!validation.isValid) {
      setFormErrors(validation.errors);
      return;
    }
    setSubmitting(true);
    try {
      await deletion.submitDeletionRequest(form);
      showToast({ type: 'success', message: 'Richiesta di cancellazione inviata.' });
      setFormOpen(false);
      setForm({ reason: '', confirmEmail: '', anonymize: false, confirmDeletion: false, additionalInfo: '' });
      setFormErrors({});
    } catch {
      showToast({ type: 'error', message: 'Invio della richiesta non riuscito. Controlla l’email e riprova.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelDeletion = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await deletion.cancelDeletionRequest(cancelTarget);
      showToast({ type: 'success', message: 'Richiesta di cancellazione annullata.' });
    } catch {
      showToast({ type: 'error', message: 'Annullamento non riuscito.' });
    } finally {
      setCancelling(false);
      setCancelTarget(null);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <GDPRPageHeader
        icon={Database}
        title="Esportazione e Cancellazione dati"
        subtitle="Esporta i tuoi dati personali o richiedi la cancellazione (diritto all’oblio)"
        onRefresh={() => {
          void exportHook.refreshRequests();
          void deletion.refreshRequests();
        }}
        refreshing={exportHook.loading || deletion.loading}
      />

      {/* ESPORTAZIONE */}
      <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
          <Download className="h-5 w-5 text-blue-600" />
          <h2 className="font-semibold text-gray-900 dark:text-gray-50">Esporta i tuoi dati</h2>
        </div>

        <div className="p-6 space-y-5">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Scarica una copia dei tuoi dati personali. Scegli il formato e avvia l’esportazione: il file verrà
            scaricato automaticamente.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setFormat('json')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${
                format === 'json'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <FileJson className="h-4 w-4" /> JSON
            </button>
            <button
              type="button"
              onClick={() => setFormat('csv')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${
                format === 'csv'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <FileSpreadsheet className="h-4 w-4" /> CSV
            </button>

            <Button variant="primary" onClick={handleExport} disabled={exporting} className="gap-2">
              <Download className="h-4 w-4" />
              {exporting ? 'Esportazione…' : 'Esporta i miei dati'}
            </Button>
          </div>

          <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-4 text-sm text-blue-800 dark:text-blue-200">
            L’esportazione include i tuoi dati personali e lo storico dei consensi. Il tempo di elaborazione dipende
            dalla quantità di dati.
          </div>
        </div>

        {/* Storico esportazioni (informativo) */}
        <div className="px-6 pb-6">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Storico esportazioni</h3>
          {exportRequests.length === 0 ? (
            <p className="text-sm text-gray-500 py-4">Nessuna esportazione registrata.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-700">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700/50 text-left text-gray-500 dark:text-gray-400">
                  <tr>
                    <th className="px-4 py-2 font-medium">Data</th>
                    <th className="px-4 py-2 font-medium">Formato</th>
                    <th className="px-4 py-2 font-medium">Stato</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {exportRequests.map((req) => (
                    <tr key={req.id}>
                      <td className="px-4 py-2 text-gray-700 dark:text-gray-200">{fmtDate(req.requestDate)}</td>
                      <td className="px-4 py-2 uppercase text-gray-700 dark:text-gray-200">{req.format}</td>
                      <td className="px-4 py-2">
                        <span className={`inline-flex px-2 py-0.5 rounded-lg text-xs font-semibold ${STATUS_BADGE[req.status] || 'bg-gray-100 text-gray-600'}`}>
                          {STATUS_LABEL[req.status] || req.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* CANCELLAZIONE */}
      <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-red-600" />
            <h2 className="font-semibold text-gray-900 dark:text-gray-50">Cancellazione dati — Diritto all’oblio</h2>
          </div>
          <Button
            variant="destructive"
            onClick={() => setFormOpen(true)}
            disabled={!deletion.canSubmitNewRequest() || deletion.loading}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Richiedi cancellazione
          </Button>
        </div>

        <div className="p-6 space-y-5">
          <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800 dark:text-amber-200">
              La cancellazione dei dati è <strong>permanente</strong>. Una volta approvata e processata, tutte le
              informazioni personali verranno rimosse definitivamente dai nostri sistemi.
            </p>
          </div>

          {!deletion.canSubmitNewRequest() && (
            <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 text-sm text-blue-800 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Hai già una richiesta di cancellazione attiva. È possibile averne una sola alla volta.
            </div>
          )}

          {/* Storico richieste */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Le tue richieste {deletionRequests.length > 0 && `(${dStats.total})`}
            </h3>
            {deletionRequests.length === 0 ? (
              <p className="text-sm text-gray-500 py-4">Nessuna richiesta di cancellazione.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-700">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700/50 text-left text-gray-500 dark:text-gray-400">
                    <tr>
                      <th className="px-4 py-2 font-medium">Stato</th>
                      <th className="px-4 py-2 font-medium">Motivazione</th>
                      <th className="px-4 py-2 font-medium">Inviata</th>
                      <th className="px-4 py-2 font-medium">Processata</th>
                      <th className="px-4 py-2 font-medium text-right">Azioni</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {deletionRequests.map((req) => (
                      <tr key={req.id}>
                        <td className="px-4 py-2">
                          <span className={`inline-flex px-2 py-0.5 rounded-lg text-xs font-semibold ${STATUS_BADGE[req.status] || 'bg-gray-100 text-gray-600'}`}>
                            {STATUS_LABEL[req.status] || req.status}
                          </span>
                        </td>
                        <td className="px-4 py-2 max-w-xs truncate text-gray-700 dark:text-gray-200" title={req.reason}>
                          {req.reason || '—'}
                        </td>
                        <td className="px-4 py-2 text-gray-700 dark:text-gray-200">{fmtDate(req.requestDate)}</td>
                        <td className="px-4 py-2 text-gray-700 dark:text-gray-200">{fmtDate(req.processedDate)}</td>
                        <td className="px-4 py-2 text-right">
                          {req.status === 'pending' && (
                            <button
                              type="button"
                              onClick={() => setCancelTarget(req.id)}
                              className="inline-flex items-center gap-1 text-red-600 hover:text-red-700 text-xs font-medium"
                            >
                              <Ban className="h-3.5 w-3.5" /> Annulla
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Form richiesta cancellazione */}
      <Dialog open={formOpen} onOpenChange={(o) => !submitting && setFormOpen(o)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" /> Richiedi cancellazione dati
            </DialogTitle>
            <DialogDescription>
              Questa azione è irreversibile. Una volta approvata, i tuoi dati personali verranno eliminati
              permanentemente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                Motivazione *
              </label>
              <textarea
                rows={3}
                value={form.reason}
                onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))}
                placeholder="Spiega perché desideri eliminare i tuoi dati (min. 10 caratteri)…"
                className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {formErrors.reason && <p className="text-xs text-red-600 mt-1">{formErrors.reason}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                Conferma la tua email *
              </label>
              <input
                type="email"
                value={form.confirmEmail}
                onChange={(e) => setForm((p) => ({ ...p, confirmEmail: e.target.value }))}
                placeholder={user?.email || 'la-tua-email@esempio.it'}
                className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {formErrors.confirmEmail && <p className="text-xs text-red-600 mt-1">{formErrors.confirmEmail}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                Informazioni aggiuntive (opzionale)
              </label>
              <textarea
                rows={2}
                value={form.additionalInfo}
                onChange={(e) => setForm((p) => ({ ...p, additionalInfo: e.target.value }))}
                className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={submitting}>
              Annulla
            </Button>
            <Button variant="destructive" onClick={handleSubmitDeletion} disabled={submitting}>
              {submitting ? 'Invio…' : 'Invia richiesta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <GDPRConfirmDialog
        open={!!cancelTarget}
        onOpenChange={(o) => !o && setCancelTarget(null)}
        title="Annulla richiesta di cancellazione"
        description="Vuoi annullare questa richiesta di cancellazione ancora in attesa?"
        confirmLabel="Annulla richiesta"
        destructive
        loading={cancelling}
        onConfirm={handleCancelDeletion}
      />
    </div>
  );
};

export default GDPRExportPage;
