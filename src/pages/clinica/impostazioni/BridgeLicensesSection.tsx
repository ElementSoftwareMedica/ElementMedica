/**
 * BridgeLicensesSection
 *
 * License management for Medical Device Bridge.
 * Admins can create, view, and revoke bridge licenses.
 * Each license generates a unique activation code (ELEM-XXXX-XXXX-XXXX)
 * that is entered in the Bridge app during initial setup.
 * 
 * @module pages/clinica/impostazioni/BridgeLicensesSection
 */

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Key,
    Monitor,
    Clock,
    CheckCircle,
    AlertCircle,
    Loader2,
    Copy,
    Shield,
    Ban,
    Plus,
    Trash2,
    Activity,
} from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { apiGet, apiPost, apiDelete } from '@/services/api';
import { useTenantFilter } from '@/context/TenantFilterContext';
import { CRUDButton, CRUDPrimaryButton } from '@/components/ui';

// ============================================
// TYPES
// ============================================

interface BridgeLicense {
    id: string;
    licenseKey: string;
    label: string;
    status: 'PENDING' | 'ACTIVE' | 'REVOKED';
    machineId?: string;
    machineName?: string;
    bridgeVersion?: string;
    deviceConfig?: unknown[];
    activatedAt?: string;
    lastSeenAt?: string;
    createdAt: string;
}

interface LicenseListResponse {
    success: boolean;
    data: BridgeLicense[];
}

interface LicenseCreateResponse {
    success: boolean;
    data: BridgeLicense;
}

// ============================================
// HELPERS
// ============================================

function formatDate(dateStr?: string): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function isOnline(lastSeenAt?: string): boolean {
    if (!lastSeenAt) return false;
    const diff = Date.now() - new Date(lastSeenAt).getTime();
    return diff < 10 * 60 * 1000; // 10 minutes
}

const STATUS_CONFIG = {
    PENDING: { label: 'In attesa', color: 'text-amber-700 bg-amber-50 border-amber-200', icon: Clock },
    ACTIVE: { label: 'Attiva', color: 'text-green-700 bg-green-50 border-green-200', icon: CheckCircle },
    REVOKED: { label: 'Revocata', color: 'text-red-700 bg-red-50 border-red-200', icon: Ban },
};

// ============================================
// COMPONENT
// ============================================

export default function BridgeLicensesSection() {
    const { showToast } = useToast();
    const queryClient = useQueryClient();
    const { getTenantFilterParams, tenantFilterKey, isReady } = useTenantFilter();

    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newLabel, setNewLabel] = useState('');
    const [copiedKey, setCopiedKey] = useState<string | null>(null);

    // Fetch licenses
    const { data: licensesRes, isLoading } = useQuery({
        queryKey: ['bridge-licenses', tenantFilterKey],
        queryFn: () => apiGet<LicenseListResponse>('/api/v1/clinica/strumenti-bridge/licenses', getTenantFilterParams()),
        enabled: isReady,
    });
    const licenses = licensesRes?.data || [];
    const activeLicenses = licenses.filter((lic) => lic.status === 'ACTIVE');
    const pendingLicenses = licenses.filter((lic) => lic.status === 'PENDING');
    const revokedLicenses = licenses.filter((lic) => lic.status === 'REVOKED');

    // Create license mutation
    const createMutation = useMutation({
        mutationFn: (label: string) =>
            apiPost<LicenseCreateResponse>('/api/v1/clinica/strumenti-bridge/licenses', { label }),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['bridge-licenses'] });
            setShowCreateForm(false);
            setNewLabel('');
            showToast({
                title: 'Licenza creata',
                message: `Codice: ${data.data.licenseKey} — Comunicalo all'utente per l'attivazione del Bridge.`,
                type: 'success',
            });
        },
        onError: () => {
            showToast({
                title: 'Errore',
                message: 'Impossibile creare la licenza. Verificare di avere i permessi e che il limite non sia raggiunto.',
                type: 'error',
            });
        },
    });

    // Revoke license mutation
    const revokeMutation = useMutation({
        mutationFn: (id: string) =>
            apiDelete(`/api/v1/clinica/strumenti-bridge/licenses/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bridge-licenses'] });
            showToast({
                title: 'Licenza revocata',
                message: 'Il Bridge associato verrà disconnesso al prossimo heartbeat.',
                type: 'success',
            });
        },
        onError: () => {
            showToast({
                title: 'Errore',
                message: 'Impossibile revocare la licenza.',
                type: 'error',
            });
        },
    });

    const handleCreate = useCallback(() => {
        if (newLabel.trim().length < 3) {
            showToast({ title: 'Errore', message: 'L\'etichetta deve avere almeno 3 caratteri', type: 'error' });
            return;
        }
        createMutation.mutate(newLabel.trim());
    }, [newLabel, createMutation, showToast]);

    const handleCopyKey = useCallback((key: string) => {
        navigator.clipboard.writeText(key).then(() => {
            setCopiedKey(key);
            setTimeout(() => setCopiedKey(null), 2000);
            showToast({ title: 'Copiato', message: 'Codice di attivazione copiato negli appunti', type: 'success' });
        });
    }, [showToast]);

    const handleRevoke = useCallback((license: BridgeLicense) => {
        if (!confirm(`Revocare la licenza "${license.label}"?\n\nIl Bridge su ${license.machineName || 'questo PC'} verrà disconnesso.`)) return;
        revokeMutation.mutate(license.id);
    }, [revokeMutation]);

    // ============================================
    // RENDER
    // ============================================

    return (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <div>
                    <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                        <Key className="w-5 h-5 text-teal-600" />
                        Key Bridge
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                        Crea, copia e revoca i codici di attivazione. Ogni key e legata a una postazione.
                    </p>
                </div>
                <CRUDPrimaryButton
                    operation="create"
                    theme="teal"
                    onClick={() => setShowCreateForm(true)}
                    className="flex items-center gap-1.5"
                >
                    <Plus className="w-4 h-4" />
                    Nuova key
                </CRUDPrimaryButton>
            </div>

            <div className="p-5 space-y-4">
                {showCreateForm && (
                    <div className="p-4 bg-teal-50 border border-teal-200 rounded-lg">
                        <p className="text-sm font-medium text-teal-800 mb-3">
                            Crea una nuova key per un PC
                        </p>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newLabel}
                                onChange={(e) => setNewLabel(e.target.value)}
                                placeholder="Es: Ambulatorio 1 - PC Dott. Rossi"
                                className="flex-1 px-3 py-2 border border-teal-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                                autoFocus
                            />
                            <CRUDPrimaryButton
                                operation="create"
                                theme="teal"
                                onClick={handleCreate}
                                disabled={createMutation.isPending}
                                className="px-4"
                            >
                                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Genera'}
                            </CRUDPrimaryButton>
                            <CRUDButton
                                operation="create"
                                variant="secondary"
                                onClick={() => { setShowCreateForm(false); setNewLabel(''); }}
                                className="px-3"
                            >
                                Annulla
                            </CRUDButton>
                        </div>
                        <p className="text-xs text-teal-700 mt-2">
                            Verrà generato un codice (es: ELEM-ABCD-1234-WXYZ) da comunicare all&apos;utente.
                            L&apos;utente lo inserirà nel Bridge alla prima esecuzione.
                        </p>
                    </div>
                )}

                {isLoading && (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 text-teal-600 animate-spin" />
                    </div>
                )}

                {!isLoading && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                            <p className="text-xs text-green-700 font-medium">Key attive</p>
                            <p className="text-2xl font-bold text-green-800 mt-1">{activeLicenses.length}</p>
                        </div>
                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                            <p className="text-xs text-amber-700 font-medium">In attesa</p>
                            <p className="text-2xl font-bold text-amber-800 mt-1">{pendingLicenses.length}</p>
                        </div>
                        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                            <p className="text-xs text-red-700 font-medium">Revocate</p>
                            <p className="text-2xl font-bold text-red-800 mt-1">{revokedLicenses.length}</p>
                        </div>
                    </div>
                )}

                {!isLoading && activeLicenses.length > 0 && (
                    <div className="rounded-lg border border-green-200 bg-green-50/40 p-4">
                        <p className="text-sm font-semibold text-green-800 flex items-center gap-2 mb-3">
                            <Activity className="w-4 h-4" />
                            Postazioni attive ({activeLicenses.length})
                        </p>
                        <div className="space-y-2">
                            {activeLicenses.map((lic) => {
                                const online = isOnline(lic.lastSeenAt);
                                return (
                                    <div key={lic.id} className="bg-white border border-green-100 rounded-lg p-3 flex items-center justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-gray-800 truncate">{lic.label}</p>
                                            <p className="text-xs text-gray-600 mt-1 flex items-center gap-1">
                                                <Monitor className="w-3 h-3" />
                                                {lic.machineName || 'PC non rilevato'}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-1">Ultimo contatto: {formatDate(lic.lastSeenAt)}</p>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            {online ? (
                                                <span className="inline-flex items-center gap-1 text-xs text-green-700 font-medium">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                                    Online
                                                </span>
                                            ) : (
                                                <span className="text-xs text-amber-700 font-medium">Offline</span>
                                            )}
                                            <button
                                                onClick={() => handleCopyKey(lic.licenseKey)}
                                                className="p-1.5 rounded text-gray-500 hover:text-teal-600 hover:bg-teal-50"
                                                title="Copia key"
                                            >
                                                {copiedKey === lic.licenseKey ? (
                                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                                ) : (
                                                    <Copy className="w-4 h-4" />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {!isLoading && licenses.length === 0 && (
                    <div className="text-center py-8">
                        <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-sm text-gray-500">
                            Nessuna key Bridge creata.
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                            Crea una key per ogni PC su cui vuoi installare il Medical Device Bridge.
                        </p>
                    </div>
                )}

                {licenses.length > 0 && (
                    <div className="space-y-3">
                        <p className="text-sm font-medium text-gray-800">Tutte le key</p>
                        {licenses.map((lic) => {
                            const statusCfg = STATUS_CONFIG[lic.status] || STATUS_CONFIG.PENDING;
                            const StatusIcon = statusCfg.icon;
                            const online = lic.status === 'ACTIVE' && isOnline(lic.lastSeenAt);

                            return (
                                <div
                                    key={lic.id}
                                    className={`border rounded-lg p-4 ${lic.status === 'REVOKED' ? 'opacity-50 bg-gray-50' : 'bg-white'
                                        }`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1 min-w-0">
                                            {/* Label + Status */}
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-medium text-gray-800 text-sm">
                                                    {lic.label}
                                                </span>
                                                <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${statusCfg.color}`}>
                                                    <StatusIcon className="w-3 h-3" />
                                                    {statusCfg.label}
                                                </span>
                                                {online && (
                                                    <span className="inline-flex items-center gap-1 text-xs text-green-600">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                                        Online
                                                    </span>
                                                )}
                                            </div>

                                            {/* License key */}
                                            <div className="flex items-center gap-1.5 mt-1.5">
                                                <code className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded select-all">
                                                    {lic.licenseKey}
                                                </code>
                                                {lic.status !== 'REVOKED' && (
                                                    <button
                                                        onClick={() => handleCopyKey(lic.licenseKey)}
                                                        className="text-gray-400 hover:text-teal-600 transition-colors"
                                                        title="Copia codice"
                                                    >
                                                        {copiedKey === lic.licenseKey ? (
                                                            <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                                                        ) : (
                                                            <Copy className="w-3.5 h-3.5" />
                                                        )}
                                                    </button>
                                                )}
                                            </div>

                                            {/* Details row */}
                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-gray-500">
                                                {lic.machineName && (
                                                    <span className="flex items-center gap-1">
                                                        <Monitor className="w-3 h-3" />
                                                        {lic.machineName}
                                                    </span>
                                                )}
                                                {lic.bridgeVersion && (
                                                    <span>v{lic.bridgeVersion}</span>
                                                )}
                                                {lic.activatedAt && (
                                                    <span>Attivata: {formatDate(lic.activatedAt)}</span>
                                                )}
                                                {lic.lastSeenAt && (
                                                    <span>Ultimo contatto: {formatDate(lic.lastSeenAt)}</span>
                                                )}
                                                {!lic.activatedAt && (
                                                    <span className="text-amber-600 flex items-center gap-1">
                                                        <AlertCircle className="w-3 h-3" />
                                                        Non ancora attivata — comunicare il codice all&apos;utente
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Revoke button */}
                                        {lic.status !== 'REVOKED' && (
                                            <CRUDButton
                                                operation="delete"
                                                variant="ghost"
                                                onClick={() => handleRevoke(lic)}
                                                disabled={revokeMutation.isPending}
                                                className="flex-shrink-0 ml-3 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Revoca licenza"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </CRUDButton>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                    <p className="text-xs font-medium text-blue-800 mb-1.5 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Flusso consigliato
                    </p>
                    <ol className="list-decimal list-inside text-xs text-blue-700 space-y-1 ml-1">
                        <li>Crea una key per ogni PC su cui installerai il Bridge</li>
                        <li>Comunica il codice <code className="bg-blue-100 px-1 rounded">ELEM-XXXX-XXXX-XXXX</code> all&apos;utente</li>
                        <li>L&apos;utente esegue <code className="bg-blue-100 px-1 rounded">install.bat</code> e inserisce il codice nella schermata di attivazione</li>
                        <li>Controlla in questa pagina se la key e attiva e su quale PC e stata registrata</li>
                    </ol>
                </div>
            </div>
        </div>
    );
}
