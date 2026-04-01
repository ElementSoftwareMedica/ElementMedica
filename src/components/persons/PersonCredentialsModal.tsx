/**
 * PersonCredentialsModal
 *
 * Modal generico per la gestione credenziali di una o più persone.
 * Utilizzabile dalla pagina Dipendenti, Formatori, Persone e dalle pagine di
 * dettaglio singolo.
 *
 * Funzionalità:
 *  - Visualizza stato login (mai effettuato / effettuato) e presenza email
 *  - Selezione singola o multipla (checkbox)
 *  - Invia nuove credenziali via email (reset password + welcome mail)
 *  - Scarica schede credenziali PDF per chi non ha email
 *
 * Backend:
 *  - POST /api/v1/credentials/send-batch-welcome  { personIds }
 *  - POST /api/v1/credentials/batch-cards          { personIds }
 *  - POST /api/v1/credentials/send-welcome/:id
 *  - GET  /api/v1/credentials/card/:id
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CheckCircle,
  AlertCircle,
  Download,
  Loader2,
  Mail,
  Send,
  Users,
  XCircle,
  KeyRound,
  Check,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/design-system/atoms/Button';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/useToast';
import api from '@/services/api';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface PersonCredentialInfo {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  hasLoggedIn?: boolean;
  lastLoginAt?: string | null;
  createdAt?: string;
}

interface CredentialStatus {
  personId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  hasLoggedIn: boolean;
  lastLoginAt: string | null;
  createdAt?: string;
  /** Risultato operazione corrente (se eseguita) */
  operationResult?: 'success' | 'error' | 'no_email';
  operationError?: string;
}

interface PersonCredentialsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Persone su cui operare. Passare solo {id, firstName, lastName, email} è sufficiente. */
  persons: PersonCredentialInfo[];
  /** Callback dopo operazioni completate */
  onComplete?: () => void;
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export const PersonCredentialsModal: React.FC<PersonCredentialsModalProps> = ({
  open,
  onOpenChange,
  persons,
  onComplete,
}) => {
  const { showToast } = useToast();

  // Stato tabella e selezione
  const [statuses, setStatuses] = useState<CredentialStatus[]>([]);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Stato operazioni
  const [sendingEmail, setSendingEmail] = useState(false);
  const [downloadingCards, setDownloadingCards] = useState(false);

  // ── Carica stato credenziali dal backend ──
  const loadStatuses = useCallback(async () => {
    if (!persons.length) return;
    setLoadingStatus(true);
    try {
      const personIds = persons.map(p => p.id);
      const response = await api.post('/api/v1/credentials/participants-status', { personIds });
      if (response.data?.success) {
        const statusMap = new Map(
          (response.data.data as CredentialStatus[]).map(s => [s.personId, s])
        );
        setStatuses(
          persons.map(p => ({
            personId: p.id,
            firstName: p.firstName,
            lastName: p.lastName,
            email: statusMap.get(p.id)?.email ?? p.email ?? null,
            hasLoggedIn: statusMap.get(p.id)?.hasLoggedIn ?? !!p.hasLoggedIn,
            lastLoginAt: statusMap.get(p.id)?.lastLoginAt ?? p.lastLoginAt ?? null,
            createdAt: statusMap.get(p.id)?.createdAt ?? p.createdAt,
          }))
        );
      } else {
        // Fallback: usa i dati forniti direttamente
        setStatuses(
          persons.map(p => ({
            personId: p.id,
            firstName: p.firstName,
            lastName: p.lastName,
            email: p.email ?? null,
            hasLoggedIn: false,
            lastLoginAt: null,
            createdAt: p.createdAt,
          }))
        );
      }
    } catch {
      // Fallback silenzioso
      setStatuses(
        persons.map(p => ({
          personId: p.id,
          firstName: p.firstName,
          lastName: p.lastName,
          email: p.email ?? null,
          hasLoggedIn: false,
          lastLoginAt: null,
        }))
      );
    } finally {
      setLoadingStatus(false);
    }
  }, [persons]);

  useEffect(() => {
    if (open) {
      setStatuses([]);
      setSelectedIds(new Set());
      loadStatuses();
    }
  }, [open, loadStatuses]);

  // ── Selezione ──
  const allSelected = statuses.length > 0 && selectedIds.size === statuses.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  const toggleAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(statuses.map(s => s.personId)));
  };

  const toggleOne = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const effectiveIds = useMemo(
    () => (selectedIds.size > 0 ? Array.from(selectedIds) : statuses.map(s => s.personId)),
    [selectedIds, statuses]
  );

  const withEmail = useMemo(
    () => statuses.filter(s => effectiveIds.includes(s.personId) && !!s.email),
    [statuses, effectiveIds]
  );

  const withoutEmail = useMemo(
    () => statuses.filter(s => effectiveIds.includes(s.personId) && !s.email),
    [statuses, effectiveIds]
  );

  // ── Invia email ──
  const handleSendEmails = async () => {
    if (withEmail.length === 0) {
      showToast({ type: 'warning', message: 'Nessuna persona selezionata ha un indirizzo email.' });
      return;
    }
    setSendingEmail(true);
    try {
      const response = await api.post('/api/v1/credentials/send-batch-welcome', {
        personIds: withEmail.map(p => p.personId),
      });
      const data = response.data?.data;
      const msg = `Email inviate: ${data?.sent ?? 0}${data?.failed ? `, fallite: ${data.failed}` : ''}${data?.noEmail ? `, senza email: ${data.noEmail}` : ''}`;
      showToast({ type: data?.failed ? 'warning' : 'success', message: msg });

      // Marca risultati
      setStatuses(prev =>
        prev.map(s =>
          withEmail.some(w => w.personId === s.personId)
            ? { ...s, operationResult: 'success' }
            : s
        )
      );
      onComplete?.();
    } catch (err: unknown) {
      showToast({ type: 'error', message: 'Errore durante l\'invio delle email.' });
    } finally {
      setSendingEmail(false);
    }
  };

  // ── Scarica schede PDF ──
  const handleDownloadCards = async () => {
    if (effectiveIds.length === 0) return;
    setDownloadingCards(true);
    try {
      const response = await api.post(
        '/api/v1/credentials/batch-cards',
        { personIds: effectiveIds },
        { responseType: 'blob' }
      );
      const blob = new Blob([response.data], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `credenziali_${new Date().toISOString().split('T')[0]}.html`;
      a.click();
      URL.revokeObjectURL(url);
      showToast({ type: 'success', message: 'Schede credenziali scaricate. Aprile nel browser e stampa come PDF.' });
      onComplete?.();
    } catch (err: unknown) {
      showToast({ type: 'error', message: 'Errore durante la generazione delle schede.' });
    } finally {
      setDownloadingCards(false);
    }
  };

  // ── Helpers ──
  const getInitials = (first: string, last: string) =>
    `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();

  const formatDate = (d?: string | null) =>
    d ? new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit' }) : null;

  const isBusy = sendingEmail || downloadingCards;

  return (
    <Dialog open={open} onOpenChange={v => { if (!isBusy) onOpenChange(v); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0">
        {/* ── Header ── */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-700 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30">
              <KeyRound className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Gestione Credenziali
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {persons.length === 1
                  ? `${persons[0].firstName} ${persons[0].lastName}`
                  : `${persons.length} persone selezionate`}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* ── Summary pills ── */}
        <div className="px-6 py-3 flex items-center gap-3 flex-wrap border-b border-gray-50 dark:border-gray-700/50 shrink-0">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs font-medium">
            <Users className="h-3.5 w-3.5" />
            {statuses.length} persone
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 text-xs font-medium">
            <Mail className="h-3.5 w-3.5" />
            {statuses.filter(s => !!s.email).length} con email
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs font-medium">
            <AlertCircle className="h-3.5 w-3.5" />
            {statuses.filter(s => !s.email).length} senza email
          </span>
          {selectedIds.size > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 text-xs font-medium">
              <Check className="h-3.5 w-3.5" />
              {selectedIds.size} selezionate
            </span>
          )}
        </div>

        {/* ── Table ── */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {loadingStatus ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
              <span className="ml-3 text-sm text-gray-500">Caricamento stato credenziali…</span>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800/80 backdrop-blur-sm">
                <tr>
                  <th className="w-10 px-4 py-2.5">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={toggleAll}
                      aria-label="Seleziona tutti"
                      className={someSelected ? 'opacity-50' : ''}
                    />
                  </th>
                  <th className="px-3 py-2.5 text-left font-medium text-gray-600 dark:text-gray-400">Nome</th>
                  <th className="px-3 py-2.5 text-left font-medium text-gray-600 dark:text-gray-400">Email</th>
                  <th className="px-3 py-2.5 text-left font-medium text-gray-600 dark:text-gray-400">Stato login</th>
                  <th className="px-3 py-2.5 text-left font-medium text-gray-600 dark:text-gray-400">Operazione</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700/40">
                {statuses.map(s => (
                  <tr
                    key={s.personId}
                    className={`hover:bg-gray-50/60 dark:hover:bg-gray-700/20 transition-colors ${selectedIds.has(s.personId) ? 'bg-blue-50/40 dark:bg-blue-900/10' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <Checkbox
                        checked={selectedIds.has(s.personId)}
                        onCheckedChange={() => toggleOne(s.personId)}
                        aria-label={`Seleziona ${s.firstName} ${s.lastName}`}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shrink-0">
                          <span className="text-white text-xs font-semibold">{getInitials(s.firstName, s.lastName)}</span>
                        </div>
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {s.lastName} {s.firstName}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      {s.email ? (
                        <span className="flex items-center gap-1.5 text-green-700 dark:text-green-400">
                          <Mail className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate max-w-[180px]">{s.email}</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500 italic">
                          <XCircle className="h-3.5 w-3.5 shrink-0" />
                          Nessuna email
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {s.hasLoggedIn ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs font-medium">
                          <CheckCircle className="h-3 w-3" />
                          {s.lastLoginAt ? `Accesso ${formatDate(s.lastLoginAt)}` : 'Ha effettuato accesso'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-xs font-medium">
                          <AlertCircle className="h-3 w-3" />
                          Mai effettuato
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {s.operationResult === 'success' && (
                        <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 text-xs font-medium">
                          <CheckCircle className="h-3.5 w-3.5" />
                          Inviato
                        </span>
                      )}
                      {s.operationResult === 'error' && (
                        <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 text-xs" title={s.operationError}>
                          <AlertCircle className="h-3.5 w-3.5" />
                          Errore
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Info box ── */}
        {!loadingStatus && withoutEmail.length > 0 && (
          <div className="px-6 py-3 bg-amber-50 dark:bg-amber-900/10 border-t border-amber-100 dark:border-amber-800/30 shrink-0">
            <p className="text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>
                <strong>{withoutEmail.length}</strong> persone non hanno un indirizzo email e non riceveranno l'email.
                Scarica le schede credenziali PDF per consegnarle fisicamente.
              </span>
            </p>
          </div>
        )}

        {/* ── Actions footer ── */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 shrink-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed max-w-sm">
            L'invio genera una <strong>nuova password</strong> e la comunica all'utente.
            L'utente dovrà cambiarla al primo accesso.
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              disabled={isBusy || effectiveIds.length === 0}
              onClick={handleDownloadCards}
              className="flex items-center gap-2"
            >
              {downloadingCards ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Schede PDF
              {withoutEmail.length > 0 && !selectedIds.size && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
                  {withoutEmail.length}
                </span>
              )}
            </Button>
            <Button
              size="sm"
              disabled={isBusy || withEmail.length === 0}
              onClick={handleSendEmails}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {sendingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Invia email
              {withEmail.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-blue-500 text-white text-xs font-medium">
                  {withEmail.length}
                </span>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PersonCredentialsModal;
