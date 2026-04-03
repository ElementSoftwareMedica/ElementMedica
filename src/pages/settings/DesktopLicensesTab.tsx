import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiDelete } from '../../services/api';
import { useTenantFilter } from '../../context/TenantFilterContext';
import {
  Monitor,
  Plus,
  Copy,
  Check,
  Trash2,
  Edit2,
  Loader2,
  KeyRound,
  AlertTriangle,
  CheckCircle,
  Clock,
  WifiOff,
  RefreshCw,
  Download,
  Apple,
  MonitorDown,
  BookOpen,
  ExternalLink,
  ArrowDownToLine,
} from 'lucide-react';
import { CRUDButton, CRUDPrimaryButton } from '../../components/shared/CRUDButton';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../context/AuthContext';

interface DesktopLicense {
  id: string;
  licenseKey: string;
  label: string;
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'REVOKED' | 'EXPIRED';
  machineId: string | null;
  machineName: string | null;
  appVersion: string | null;
  activatedAt: string | null;
  lastSeenAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

interface SubscriptionInfo {
  subscriptionStatus: string | null;
  subscriptionExpiresAt: string | null;
  gracePeriodUntil: string | null;
}

interface DesktopLicensesResponse {
  success: boolean;
  data: DesktopLicense[];
  subscription: SubscriptionInfo;
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'In attesa',
  ACTIVE: 'Attiva',
  SUSPENDED: 'Sospesa',
  REVOKED: 'Revocata',
  EXPIRED: 'Scaduta',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  ACTIVE: 'bg-green-100 text-green-800',
  SUSPENDED: 'bg-orange-100 text-orange-800',
  REVOKED: 'bg-red-100 text-red-800',
  EXPIRED: 'bg-gray-100 text-gray-600',
};

const DesktopLicensesTab: React.FC = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { user } = useAuth();
  const { getTenantFilterParams, tenantFilterKey, isReady } = useTenantFilter();

  const isAdmin = user?.role === 'Admin' || user?.roles?.includes('ADMIN') || user?.roles?.includes('SUPER_ADMIN');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Load licenses — only for admins
  const { data, isLoading, isError, refetch } = useQuery<DesktopLicensesResponse>({
    queryKey: ['desktop-licenses', tenantFilterKey],
    queryFn: () => apiGet('/api/v1/desktop-licenses', getTenantFilterParams()),
    enabled: isReady && isAdmin,
  });

  const licenses = data?.data ?? [];
  const subscription = data?.subscription;

  // Create license
  const createMutation = useMutation({
    mutationFn: (label: string) =>
      apiPost('/api/v1/desktop-licenses', { label }, getTenantFilterParams()),
    onSuccess: () => {
      showToast({ message: 'Licenza creata con successo', type: 'success' });
      queryClient.invalidateQueries({ queryKey: ['desktop-licenses'] });
      setShowCreateModal(false);
      setNewLabel('');
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Errore nella creazione della licenza';
      showToast({ message: msg, type: 'error' });
    },
  });

  // Update label
  const updateMutation = useMutation({
    mutationFn: ({ id, label }: { id: string; label: string }) =>
      apiPut(`/api/v1/desktop-licenses/${id}`, { label }),
    onSuccess: () => {
      showToast({ message: 'Etichetta aggiornata', type: 'success' });
      queryClient.invalidateQueries({ queryKey: ['desktop-licenses'] });
      setEditingId(null);
    },
    onError: () => showToast({ message: "Errore nell'aggiornamento", type: 'error' }),
  });

  // Revoke
  const revokeMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/v1/desktop-licenses/${id}`),
    onSuccess: () => {
      showToast({ message: 'Licenza revocata', type: 'success' });
      queryClient.invalidateQueries({ queryKey: ['desktop-licenses'] });
      setRevokeId(null);
    },
    onError: () => showToast({ message: 'Errore nella revoca', type: 'error' }),
  });

  const copyKey = async (key: string): Promise<void> => {
    await navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const formatDate = (date: string | null): string => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDaysUntilExpiry = (expiresAt: string | null): number | null => {
    if (!expiresAt) return null;
    return Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000);
  };

  const daysExpiry = subscription ? getDaysUntilExpiry(subscription.subscriptionExpiresAt) : null;

  return (
    <div className="space-y-6">

      {/* ===== DOWNLOAD CARD — visible to ALL users ===== */}
      <div className="rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50 to-white p-6">
        <div className="flex flex-col md:flex-row md:items-start gap-6">
          {/* Icon + title */}
          <div className="flex-shrink-0 flex items-center justify-center w-14 h-14 bg-teal-600 rounded-2xl shadow-lg">
            <MonitorDown className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              ElementMedica Desktop — App MDL Offline
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              L'app desktop consente al Medico Competente di lavorare offline durante le visite in azienda.
              Sincronizza automaticamente pazienti, visite e giudizi quando torna online.
            </p>

            {/* Download buttons */}
            <div className="flex flex-wrap gap-3 mb-5">
              <a
                href="https://releases.elementmedica.com/desktop/ElementMedica-Desktop-latest-Setup.exe"
                download
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-xl shadow transition-colors"
              >
                <ArrowDownToLine className="w-4 h-4" />
                Scarica per Windows (.exe)
              </a>
              <a
                href="https://releases.elementmedica.com/desktop/ElementMedica-Desktop-latest-x64.dmg"
                download
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-900 text-white text-sm font-medium rounded-xl shadow transition-colors"
              >
                <Apple className="w-4 h-4" />
                Scarica per macOS (.dmg)
              </a>
              <a
                href="https://releases.elementmedica.com/desktop/ElementMedica-Desktop-latest-x64.AppImage"
                download
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-xl shadow border border-gray-200 transition-colors"
              >
                <Download className="w-4 h-4" />
                Scarica per Linux (.AppImage)
              </a>
            </div>

            {/* Installation steps */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5 mb-3">
                <BookOpen className="w-4 h-4 text-teal-600" />
                Istruzioni di installazione
              </h4>
              <ol className="space-y-2">
                {[
                  { step: '1', title: 'Crea una licenza', desc: 'Da questa pagina, crea una nuova licenza per il PC del medico (es. "Ambulatorio 1 – PC Medico").' },
                  { step: '2', title: 'Scarica e installa', desc: 'Scarica l\'installer sopra per il sistema operativo del PC. Esegui il file e segui la procedura guidata.' },
                  { step: '3', title: 'Primo avvio', desc: 'All\'avvio l\'app chiede l\'URL del server (es. https://app.elementmedica.com) e le credenziali. Accedi con le tue credenziali di rete.' },
                  { step: '4', title: 'Inserisci la chiave di licenza', desc: 'Nella schermata di attivazione, inserisci la chiave di licenza generata al passo 1. La chiave viene associata automaticamente al PC.' },
                  { step: '5', title: 'Scarica i dati', desc: 'Seleziona la data di lavoro e clicca "Scarica dati" per sincronizzare pazienti, appuntamenti e protocolli MDL. Ora puoi lavorare offline.' },
                ].map(({ step, title, desc }) => (
                  <li key={step} className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-teal-100 text-teal-700 text-xs font-bold flex items-center justify-center mt-0.5">
                      {step}
                    </span>
                    <div>
                      <span className="text-sm font-medium text-gray-900">{title}: </span>
                      <span className="text-sm text-gray-600">{desc}</span>
                    </div>
                  </li>
                ))}
              </ol>
              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-500">
                <ExternalLink className="w-3.5 h-3.5" />
                <span>
                  Per supporto tecnico: <a href="mailto:supporto@elementmedica.com" className="text-teal-600 hover:underline">supporto@elementmedica.com</a>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== LICENSE MANAGEMENT — visible only to admins ===== */}
      {!isAdmin && (
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 flex items-start gap-3">
          <KeyRound className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-blue-900">Hai bisogno di una chiave di licenza?</p>
            <p className="text-sm text-blue-700 mt-0.5">
              Contatta il tuo amministratore di sistema per ricevere il codice di attivazione da inserire al primo avvio dell'app.
            </p>
          </div>
        </div>
      )}

      {isAdmin && isLoading && (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-6 h-6 text-teal-600 animate-spin mr-2" />
          <span className="text-gray-500">Caricamento licenze...</span>
        </div>
      )}

      {isAdmin && isError && (
        <div className="flex items-center justify-center py-10 gap-3 text-red-600">
          <AlertTriangle className="w-5 h-5" />
          <span>Errore nel caricamento licenze.</span>
          <CRUDButton onClick={() => refetch()}><RefreshCw className="w-4 h-4" /> Riprova</CRUDButton>
        </div>
      )}

      {/* Subscription status card */}
      {isAdmin && subscription && (
        <div className={`rounded-xl border p-4 flex items-start gap-4 ${
          daysExpiry !== null && daysExpiry <= 30
            ? 'bg-amber-50 border-amber-200'
            : 'bg-green-50 border-green-200'
        }`}>
          <div className={`mt-0.5 ${daysExpiry !== null && daysExpiry <= 30 ? 'text-amber-600' : 'text-green-600'}`}>
            {daysExpiry !== null && daysExpiry <= 0
              ? <AlertTriangle className="w-5 h-5" />
              : <CheckCircle className="w-5 h-5" />}
          </div>
          <div>
            <p className="font-medium text-gray-900">
              Abbonamento:{' '}
              <span className="capitalize">{subscription.subscriptionStatus || 'Non disponibile'}</span>
            </p>
            {subscription.subscriptionExpiresAt && (
              <p className="text-sm text-gray-600 mt-0.5">
                Scade il {new Date(subscription.subscriptionExpiresAt).toLocaleDateString('it-IT', {
                  day: 'numeric', month: 'long', year: 'numeric'
                })}
                {daysExpiry !== null && (
                  <span className={`ml-2 font-medium ${daysExpiry <= 30 ? 'text-amber-700' : 'text-green-700'}`}>
                    ({daysExpiry <= 0 ? 'Scaduto' : `tra ${daysExpiry} giorni`})
                  </span>
                )}
              </p>
            )}
            {subscription.gracePeriodUntil && (
              <p className="text-xs text-amber-700 mt-1">
                Periodo di grazia fino al {new Date(subscription.gracePeriodUntil).toLocaleDateString('it-IT')}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Header + create button */}
      {isAdmin && <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Monitor className="w-4 h-4 text-teal-600" />
            Licenze Desktop App MDL
          </h3>
          <p className="text-sm text-gray-500 mt-0.5">
            {licenses.length} licenz{licenses.length === 1 ? 'a' : 'e'} — ogni licenza corrisponde a un'installazione su PC
          </p>
        </div>
        <CRUDPrimaryButton
          onClick={() => setShowCreateModal(true)}
        >
          <Plus className="w-4 h-4" /> Nuova Licenza
        </CRUDPrimaryButton>
      </div>}

      {/* Licenses table */}
      {isAdmin && licenses.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
          <KeyRound className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Nessuna licenza creata</p>
          <p className="text-sm text-gray-400 mt-1">
            Crea una nuova licenza e fornisci il codice all'utente per attivare l'app sul PC.
          </p>
        </div>
      )}

      {isAdmin && licenses.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Codice Licenza</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Etichetta</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Stato</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">PC</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Ultima attività</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Attivata il</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {licenses.map((license) => (
                <tr key={license.id} className="hover:bg-gray-50 transition-colors">
                  {/* License key */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-700">
                        {license.licenseKey}
                      </code>
                      <button
                        type="button"
                        onClick={() => copyKey(license.licenseKey)}
                        className="text-gray-400 hover:text-teal-600 transition-colors"
                        title="Copia codice"
                      >
                        {copiedKey === license.licenseKey
                          ? <Check className="w-3.5 h-3.5 text-green-500" />
                          : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </td>

                  {/* Label (inline edit) */}
                  <td className="px-4 py-3">
                    {editingId === license.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={editLabel}
                          onChange={(e) => setEditLabel(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') updateMutation.mutate({ id: license.id, label: editLabel });
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          className="border border-gray-300 rounded px-2 py-1 text-xs w-40 focus:outline-none focus:border-teal-500"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => updateMutation.mutate({ id: license.id, label: editLabel })}
                          className="text-teal-600 hover:text-teal-700"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => { setEditingId(license.id); setEditLabel(license.label); }}
                        className="flex items-center gap-1 text-gray-700 hover:text-teal-600 group"
                      >
                        <span>{license.label}</span>
                        <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[license.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {STATUS_LABELS[license.status] ?? license.status}
                    </span>
                  </td>

                  {/* Machine */}
                  <td className="px-4 py-3">
                    {license.machineName ? (
                      <div className="flex items-center gap-1.5">
                        <Monitor className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-gray-700">{license.machineName}</span>
                        {license.appVersion && (
                          <span className="text-xs text-gray-400">v{license.appVersion}</span>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-gray-400">
                        <WifiOff className="w-3.5 h-3.5" />
                        <span className="text-xs">Non attivata</span>
                      </div>
                    )}
                  </td>

                  {/* Last seen */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-gray-500 text-xs">
                      <Clock className="w-3.5 h-3.5" />
                      {formatDate(license.lastSeenAt)}
                    </div>
                  </td>

                  {/* Activated at */}
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {formatDate(license.activatedAt)}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      {license.status !== 'REVOKED' && (
                        <button
                          type="button"
                          onClick={() => setRevokeId(license.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded transition-colors"
                          title="Revoca licenza"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create modal */}
      {isAdmin && showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Nuova Licenza Desktop</h3>
            <p className="text-sm text-gray-500 mb-4">
              Inserisci un'etichetta descrittiva per identificare il PC a cui è destinata questa licenza.
            </p>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Etichetta (es. "Ambulatorio 1 – PC Medico")
            </label>
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && newLabel.trim().length >= 3 && createMutation.mutate(newLabel.trim())}
              placeholder="Es. Ambulatorio 1 – PC Medico"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-500 mb-4"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <CRUDButton onClick={() => { setShowCreateModal(false); setNewLabel(''); }}>
                Annulla
              </CRUDButton>
              <CRUDPrimaryButton
                onClick={() => createMutation.mutate(newLabel.trim())}
                disabled={newLabel.trim().length < 3 || createMutation.isPending}
              >
                {createMutation.isPending
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Creazione...</>
                  : <><Plus className="w-4 h-4" /> Crea Licenza</>}
              </CRUDPrimaryButton>
            </div>
          </div>
        </div>
      )}

      {/* Revoke confirmation modal */}
      {isAdmin && revokeId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mb-4">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Revoca Licenza</h3>
            <p className="text-sm text-gray-500 mb-6">
              L'app desktop associata a questa licenza non potrà più accedere. L'azione è irreversibile.
            </p>
            <div className="flex justify-center gap-2">
              <CRUDButton onClick={() => setRevokeId(null)}>Annulla</CRUDButton>
              <button
                type="button"
                onClick={() => revokeMutation.mutate(revokeId)}
                disabled={revokeMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {revokeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Revoca
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DesktopLicensesTab;
