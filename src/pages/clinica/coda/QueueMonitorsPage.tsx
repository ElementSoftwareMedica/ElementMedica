/**
 * Queue Monitors Management Page
 * Gestione configurazione monitor display per sale d'attesa (P53.3)
 * 
 * Features:
 * - Lista monitor configurati
 * - CRUD monitor con selezione ambulatori
 * - Generazione token accesso pubblico
 * - Link diretto al display
 * 
 * @module pages/clinica/coda/QueueMonitorsPage
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Monitor,
    Plus,
    Edit,
    Trash2,
    ExternalLink,
    Copy,
    RefreshCw,
    Settings,
    CheckCircle,
    XCircle,
    Building2
} from 'lucide-react';
import queueApi, { DisplayMonitor, CreateMonitorInput, UpdateMonitorInput } from '@/services/queueApi';
import { poliambulatoriApi, ambulatoriApi } from '@/services/clinicaApi';
import { useToast } from '@/hooks/useToast';
import { useConfirmDialog } from '@/contexts/ConfirmDialogContext';
import { useTenantFilter } from '@/context/TenantFilterContext';
import { CRUDButton } from '@/components/shared/CRUDButton';
import { ActionMenu, createCrudActions } from '@/components/ui/ActionMenu';

import '@/styles/clinica-theme.css';

// =====================================================
// SUB-COMPONENTS
// =====================================================

interface MonitorFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    monitor?: DisplayMonitor;
    poliambulatori: { id: string; nome: string }[];
    ambulatoriList: { id: string; nome: string; codice: string; poliambulatorioId: string }[];
    onSubmit: (data: CreateMonitorInput | UpdateMonitorInput) => void;
    isLoading: boolean;
}

const buildMonitorFormData = (monitor?: DisplayMonitor) => ({
    nome: monitor?.nome || '',
    codice: monitor?.codice || '',
    descrizione: monitor?.descrizione || '',
    poliambulatorioId: monitor?.poliambulatorioId || '',
    ambulatoriIds: monitor?.ambulatori?.map(a => a.id) || [] as string[],
    config: {
        theme: monitor?.config?.theme || 'light',
        fontSize: monitor?.config?.fontSize || 150,
        showRecentCalls: monitor?.config?.showRecentCalls ?? true,
        recentCallsCount: monitor?.config?.recentCallsCount || 5,
        enableAudio: monitor?.config?.enableAudio ?? true,
        audioType: monitor?.config?.audioType || 'beep' as 'beep' | 'tts' | 'both',
        showMarquee: monitor?.config?.showMarquee ?? true,
        marqueeText: monitor?.config?.marqueeText || ''
    }
});

const MonitorFormModal: React.FC<MonitorFormModalProps> = ({
    isOpen,
    onClose,
    monitor,
    poliambulatori,
    ambulatoriList,
    onSubmit,
    isLoading
}) => {
    const [formData, setFormData] = useState(() => buildMonitorFormData(monitor));

    useEffect(() => {
        if (isOpen) {
            setFormData(buildMonitorFormData(monitor));
        }
    }, [isOpen, monitor]);

    // Filter ambulatori by selected poliambulatorio
    const filteredAmbulatori = formData.poliambulatorioId
        ? ambulatoriList.filter(a => a.poliambulatorioId === formData.poliambulatorioId)
        : ambulatoriList;

    const handleToggleAmbulatorio = (id: string) => {
        setFormData(prev => ({
            ...prev,
            ambulatoriIds: prev.ambulatoriIds.includes(id)
                ? prev.ambulatoriIds.filter(a => a !== id)
                : [...prev.ambulatoriIds, id]
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto mx-4">
                <div className="p-6 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900">
                        {monitor ? 'Modifica Monitor' : 'Nuovo Monitor Display'}
                    </h2>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Basic Info */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                            <input
                                type="text"
                                value={formData.nome}
                                onChange={e => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                                className="input-clinica w-full"
                                placeholder="es. Monitor Sala Attesa 1"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Codice *</label>
                            <input
                                type="text"
                                value={formData.codice}
                                onChange={e => setFormData(prev => ({ ...prev, codice: e.target.value.toUpperCase() }))}
                                className="input-clinica w-full"
                                placeholder="es. MON1"
                                maxLength={10}
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione</label>
                        <textarea
                            value={formData.descrizione}
                            onChange={e => setFormData(prev => ({ ...prev, descrizione: e.target.value }))}
                            className="input-clinica w-full"
                            rows={2}
                            placeholder="Descrizione opzionale..."
                        />
                    </div>

                    {/* Poliambulatorio */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Poliambulatorio</label>
                        <select
                            value={formData.poliambulatorioId}
                            onChange={e => setFormData(prev => ({
                                ...prev,
                                poliambulatorioId: e.target.value,
                                ambulatoriIds: [] // Reset quando cambia poliambulatorio
                            }))}
                            className="select-clinica w-full"
                        >
                            <option value="">Tutti i poliambulatori</option>
                            {poliambulatori.map(p => (
                                <option key={p.id} value={p.id}>{p.nome}</option>
                            ))}
                        </select>
                    </div>

                    {/* Ambulatori Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Ambulatori da mostrare ({formData.ambulatoriIds.length} selezionati)
                        </label>
                        <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto p-2 space-y-1">
                            {filteredAmbulatori.length === 0 ? (
                                <p className="text-gray-500 text-sm p-2">Nessun ambulatorio disponibile</p>
                            ) : (
                                filteredAmbulatori.map(amb => (
                                    <label
                                        key={amb.id}
                                        className={`flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-gray-50 ${formData.ambulatoriIds.includes(amb.id) ? 'bg-teal-50' : ''
                                            }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={formData.ambulatoriIds.includes(amb.id)}
                                            onChange={() => handleToggleAmbulatorio(amb.id)}
                                            className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                                        />
                                        <span className="font-medium text-gray-700">{amb.nome}</span>
                                        <span className="text-sm text-gray-500">({amb.codice})</span>
                                    </label>
                                ))
                            )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            Se nessun ambulatorio è selezionato, il monitor mostrerà tutti gli ambulatori
                        </p>
                    </div>

                    {/* Config Options */}
                    <div className="border-t border-gray-200 pt-4">
                        <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                            <Settings className="w-4 h-4" />
                            Configurazione Display
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={formData.config.showRecentCalls}
                                    onChange={e => setFormData(prev => ({
                                        ...prev,
                                        config: { ...prev.config, showRecentCalls: e.target.checked }
                                    }))}
                                    className="h-4 w-4 rounded border-gray-300 text-teal-600"
                                />
                                <span className="text-sm text-gray-700">Mostra chiamate recenti</span>
                            </label>
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={formData.config.enableAudio}
                                    onChange={e => setFormData(prev => ({
                                        ...prev,
                                        config: { ...prev.config, enableAudio: e.target.checked }
                                    }))}
                                    className="h-4 w-4 rounded border-gray-300 text-teal-600"
                                />
                                <span className="text-sm text-gray-700">Abilita audio</span>
                            </label>
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={formData.config.showMarquee}
                                    onChange={e => setFormData(prev => ({
                                        ...prev,
                                        config: { ...prev.config, showMarquee: e.target.checked }
                                    }))}
                                    className="h-4 w-4 rounded border-gray-300 text-teal-600"
                                />
                                <span className="text-sm text-gray-700">Mostra ticker scorrevole</span>
                            </label>
                            <div>
                                <label className="block text-sm text-gray-700 mb-1">Tema</label>
                                <select
                                    value={formData.config.theme}
                                    onChange={e => setFormData(prev => ({
                                        ...prev,
                                        config: { ...prev.config, theme: e.target.value as 'light' | 'dark' }
                                    }))}
                                    className="select-clinica w-full"
                                >
                                    <option value="light">Chiaro</option>
                                    <option value="dark">Scuro</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn-clinica-secondary"
                        >
                            Annulla
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading || !formData.nome || !formData.codice}
                            className="btn-clinica-primary"
                        >
                            {isLoading ? 'Salvataggio...' : monitor ? 'Salva Modifiche' : 'Crea Monitor'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// =====================================================
// MAIN COMPONENT
// =====================================================

const QueueMonitorsPage: React.FC = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const { confirmDelete } = useConfirmDialog();
    const { getTenantFilterParams, isReady, tenantFilterKey } = useTenantFilter();

    // State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingMonitor, setEditingMonitor] = useState<DisplayMonitor | undefined>();
    const [selectedPoliambulatorio, setSelectedPoliambulatorio] = useState<string>('');

    // Fetch monitors
    const { data: monitors = [], isLoading: loadingMonitors } = useQuery({
        queryKey: ['queue-monitors', tenantFilterKey, selectedPoliambulatorio],
        queryFn: () => queueApi.getMonitors({
            poliambulatorioId: selectedPoliambulatorio || undefined,
            activeOnly: false
        }),
        enabled: isReady
    });

    // Fetch poliambulatori for filter and form
    const { data: poliambulatoriData } = useQuery({
        queryKey: ['poliambulatori-list', tenantFilterKey],
        queryFn: () => {
            const tenantParams = getTenantFilterParams();
            return poliambulatoriApi.getAll({
                limit: 100,
                ...(tenantParams.tenantIds && { tenantIds: tenantParams.tenantIds.join(',') }),
                ...(tenantParams.allTenants && { allTenants: 'true' })
            });
        },
        enabled: isReady
    });

    // Fetch ambulatori for form
    const { data: ambulatoriData } = useQuery({
        queryKey: ['ambulatori-list', tenantFilterKey],
        queryFn: () => {
            const tenantParams = getTenantFilterParams();
            return ambulatoriApi.getAll({
                limit: 200,
                ...(tenantParams.tenantIds && { tenantIds: tenantParams.tenantIds.join(',') }),
                ...(tenantParams.allTenants && { allTenants: 'true' })
            });
        },
        enabled: isReady
    });

    const poliambulatori = poliambulatoriData?.data || [];
    const ambulatoriList = (ambulatoriData?.data || []).map(a => ({
        id: a.id,
        nome: a.nome,
        codice: a.codice,
        poliambulatorioId: a.poliambulatorioId
    }));

    // Mutations
    const createMutation = useMutation({
        mutationFn: (data: CreateMonitorInput) => queueApi.createMonitor(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['queue-monitors'] });
            showToast({ type: 'success', message: 'Monitor creato con successo' });
            setIsModalOpen(false);
        },
        onError: (error: Error) => {
            showToast({ type: 'error', message: 'Errore nella creazione' });
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: UpdateMonitorInput }) =>
            queueApi.updateMonitor(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['queue-monitors'] });
            showToast({ type: 'success', message: 'Monitor aggiornato' });
            setIsModalOpen(false);
            setEditingMonitor(undefined);
        },
        onError: (error: Error) => {
            showToast({ type: 'error', message: 'Errore nell\'aggiornamento' });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => queueApi.deleteMonitor(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['queue-monitors'] });
            showToast({ type: 'success', message: 'Monitor eliminato' });
        },
        onError: () => {
            showToast({ type: 'error', message: 'Errore nell\'eliminazione' });
        }
    });

    const regenerateTokenMutation = useMutation({
        mutationFn: (id: string) => queueApi.regenerateMonitorToken(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['queue-monitors'] });
            showToast({ type: 'success', message: 'Token rigenerato' });
        },
        onError: () => {
            showToast({ type: 'error', message: 'Errore nella rigenerazione del token' });
        }
    });

    // Handlers
    const handleCreate = useCallback(() => {
        setEditingMonitor(undefined);
        setIsModalOpen(true);
    }, []);

    const handleEdit = useCallback((monitor: DisplayMonitor) => {
        setEditingMonitor(monitor);
        setIsModalOpen(true);
    }, []);

    const handleDelete = useCallback(async (id: string) => {
        if (await confirmDelete('questo monitor')) {
            deleteMutation.mutate(id);
        }
    }, [deleteMutation, confirmDelete]);

    const handleCopyUrl = useCallback((url: string) => {
        const fullUrl = `${window.location.origin}${url}`;
        navigator.clipboard.writeText(fullUrl);
        showToast({ type: 'success', message: 'URL copiato negli appunti' });
    }, [showToast]);

    const handleOpenDisplay = useCallback((monitor: DisplayMonitor) => {
        if (monitor.accessToken) {
            window.open(`/display/monitor/${monitor.accessToken}`, '_blank');
        } else {
            showToast({ type: 'error', message: 'Token non disponibile' });
        }
    }, [showToast]);

    const handleFormSubmit = (data: CreateMonitorInput | UpdateMonitorInput) => {
        if (editingMonitor) {
            updateMutation.mutate({ id: editingMonitor.id, data });
        } else {
            createMutation.mutate(data as CreateMonitorInput);
        }
    };

    return (
        <div className="p-6 space-y-6 clinica-theme" data-brand="element-medica">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Monitor Display</h1>
                    <p className="text-gray-500 mt-1">
                        Configurazione monitor per sale d'attesa - ogni monitor mostra ambulatori specifici
                    </p>
                </div>
                <CRUDButton operation="create" onClick={handleCreate} className="btn-clinica-primary inline-flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Nuovo Monitor
                </CRUDButton>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center gap-4">
                    <Building2 className="h-4 w-4 text-gray-400" />
                    <select
                        value={selectedPoliambulatorio}
                        onChange={e => setSelectedPoliambulatorio(e.target.value)}
                        className="select-clinica"
                    >
                        <option value="">Tutti i poliambulatori</option>
                        {poliambulatori.map(p => (
                            <option key={p.id} value={p.id}>{p.nome}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Content */}
            {loadingMonitors ? (
                <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-teal-600 border-t-transparent mx-auto"></div>
                    <p className="text-gray-500 mt-2">Caricamento...</p>
                </div>
            ) : monitors.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                    <Monitor className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500">Nessun monitor configurato</p>
                    <p className="text-sm text-gray-400 mt-1">
                        Crea un monitor per visualizzare le chiamate in sala d'attesa
                    </p>
                    <CRUDButton operation="create" onClick={handleCreate} className="btn-clinica-primary mt-4">
                        Crea il primo monitor
                    </CRUDButton>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {monitors.map(monitor => (
                        <div
                            key={monitor.id}
                            className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow"
                        >
                            {/* Header */}
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-teal-50">
                                        <Monitor className="h-5 w-5 text-teal-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900">{monitor.nome}</h3>
                                        <p className="text-sm text-gray-500">{monitor.codice}</p>
                                    </div>
                                </div>
                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${monitor.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                                    }`}>
                                    {monitor.isActive ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                                    {monitor.isActive ? 'Attivo' : 'Inattivo'}
                                </span>
                            </div>

                            {/* Description */}
                            {monitor.descrizione && (
                                <p className="text-sm text-gray-600 mb-3">{monitor.descrizione}</p>
                            )}

                            {/* Poliambulatorio */}
                            {monitor.poliambulatorio && (
                                <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-3">
                                    <Building2 className="h-4 w-4 text-gray-400" />
                                    <span>{monitor.poliambulatorio.nome}</span>
                                </div>
                            )}

                            {/* Ambulatori */}
                            <div className="mb-4">
                                <p className="text-xs font-medium text-gray-500 uppercase mb-2">
                                    Ambulatori ({monitor.ambulatori.length})
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                    {monitor.ambulatori.length === 0 ? (
                                        <span className="text-sm text-gray-400">Tutti gli ambulatori</span>
                                    ) : (
                                        monitor.ambulatori.slice(0, 5).map(amb => (
                                            <span
                                                key={amb.id}
                                                className="px-2 py-1 bg-teal-50 text-teal-700 rounded text-xs font-medium"
                                            >
                                                {amb.codice}
                                            </span>
                                        ))
                                    )}
                                    {monitor.ambulatori.length > 5 && (
                                        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                                            +{monitor.ambulatori.length - 5}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Access URL */}
                            {monitor.accessToken && (
                                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                                    <p className="text-xs font-medium text-gray-500 uppercase mb-1">URL Pubblico</p>
                                    <div className="flex items-center gap-2">
                                        <code className="text-xs text-gray-700 bg-white px-2 py-1 rounded border flex-1 truncate">
                                            {window.location.origin}/display/monitor/{monitor.accessToken.slice(0, 12)}...
                                        </code>
                                        <button
                                            onClick={() => handleCopyUrl(`/display/monitor/${monitor.accessToken}`)}
                                            className="p-1.5 hover:bg-gray-200 rounded"
                                            title="Copia URL"
                                        >
                                            <Copy className="h-4 w-4 text-gray-500" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleOpenDisplay(monitor)}
                                        className="btn-clinica-secondary text-sm inline-flex items-center gap-1"
                                    >
                                        <ExternalLink className="h-3.5 w-3.5" />
                                        Apri Display
                                    </button>
                                    <button
                                        onClick={() => regenerateTokenMutation.mutate(monitor.id)}
                                        className="p-2 hover:bg-gray-100 rounded text-gray-500"
                                        title="Rigenera token"
                                    >
                                        <RefreshCw className="h-4 w-4" />
                                    </button>
                                </div>
                                <ActionMenu
                                    actions={createCrudActions({
                                        onEdit: () => handleEdit(monitor),
                                        onDelete: () => handleDelete(monitor.id)
                                    })}
                                    size="sm"
                                />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            <MonitorFormModal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setEditingMonitor(undefined); }}
                monitor={editingMonitor}
                poliambulatori={poliambulatori.map(p => ({ id: p.id, nome: p.nome }))}
                ambulatoriList={ambulatoriList}
                onSubmit={handleFormSubmit}
                isLoading={createMutation.isPending || updateMutation.isPending}
            />
        </div>
    );
};

export default QueueMonitorsPage;
