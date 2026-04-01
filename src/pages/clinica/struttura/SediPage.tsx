/**
 * SediPage
 * 
 * Gestione sedi poliambulatorio.
 * Mostra la lista delle sedi con possibilità di CRUD.
 * 
 * @module pages/poliambulatorio/struttura/SediPage
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    Building2,
    Plus,
    Search,
    MapPin,
    Phone,
    Mail,
    Edit2,
    Trash2,
    ChevronRight,
    Star,
    CheckCircle2,
    XCircle,
    Loader2,
    AlertCircle,
    User
} from 'lucide-react';
import { clinicaApi, type SedePoliambulatorio } from '../../../services/clinicaApi';
import { useToast } from '../../../hooks/useToast';
import Modal from '../../../design-system/molecules/Modal/Modal';
import { useTenantFilter } from '../../../context/TenantFilterContext';
import { useViewMode } from '../../../hooks/useViewMode';
import { ViewModeToggle } from '../../../components/clinica/ViewModeToggle';
import { ActionMenu, createCrudActions } from '@/components/ui/ActionMenu';
import { CRUDButton } from '../../../components/shared/CRUDButton';
import { formatMedicoName } from '../../../utils/textFormatters';

// Import Element Medica theme
import '../../../styles/clinica-theme.css';

const SediPage: React.FC = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const [searchParams] = useSearchParams();
    const poliambulatorioId = searchParams.get('poliambulatorioId');

    // Tenant filter from global context
    const { getTenantFilterParams, isReady, tenantFilterKey } = useTenantFilter();

    // State
    const [searchTerm, setSearchTerm] = useState('');
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [sedeToDelete, setSedeToDelete] = useState<SedePoliambulatorio | null>(null);

    // View mode with localStorage persistence
    const { viewMode, setViewMode } = useViewMode({ storageKey: 'sedi' });

    // Fetch sedi
    const { data: sediResponse, isLoading, error } = useQuery({
        queryKey: ['sedi', poliambulatorioId, tenantFilterKey],
        queryFn: async () => {
            const tenantParams = getTenantFilterParams();
            if (poliambulatorioId) {
                return clinicaApi.sedi.getByPoliambulatorio(poliambulatorioId);
            }
            // Se non c'è poliambulatorioId, carica tutti le sedi
            return clinicaApi.sedi.getAll({
                ...(tenantParams.tenantIds && { tenantIds: tenantParams.tenantIds.join(',') }),
                ...(tenantParams.allTenants && { allTenants: 'true' })
            });
        },
        enabled: isReady
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: (sedeId: string) => clinicaApi.sedi.delete(sedeId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sedi'] });
            showToast({ type: 'success', message: 'Sede eliminata con successo' });
            setDeleteModalOpen(false);
            setSedeToDelete(null);
        },
        onError: (error: Error) => {
            showToast({ type: 'error', message: 'Errore durante l\'eliminazione' });
        }
    });

    // Extract sedi array from response
    const sedi: SedePoliambulatorio[] = Array.isArray(sediResponse)
        ? sediResponse
        : sediResponse?.data || [];

    // Filter sedi by search
    const filteredSedi = sedi.filter(sede => {
        const search = searchTerm.toLowerCase();
        return (
            sede.nome.toLowerCase().includes(search) ||
            sede.citta?.toLowerCase().includes(search) ||
            sede.indirizzo?.toLowerCase().includes(search) ||
            sede.codice?.toLowerCase().includes(search)
        );
    });

    const handleDelete = () => {
        if (sedeToDelete) {
            deleteMutation.mutate(sedeToDelete.id);
        }
    };

    if (isLoading) {
        return (
            <div className="p-6 clinica-theme">
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 text-teal-600 animate-spin" />
                    <span className="ml-2 text-gray-600">Caricamento sedi...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 clinica-theme">
                <div className="flex flex-col items-center justify-center py-12 text-red-500">
                    <AlertCircle className="h-12 w-12 mb-4" />
                    <h3 className="text-lg font-medium">Errore nel caricamento</h3>
                    <p className="text-sm text-gray-500 mt-1">
                        {'Errore sconosciuto'}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 clinica-theme" data-brand="element-medica">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Building2 className="h-7 w-7 text-teal-600" />
                        Sedi Poliambulatorio
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Gestisci le sedi operative del poliambulatorio
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <ViewModeToggle viewMode={viewMode} onViewModeChange={setViewMode} />
                    <button
                        onClick={() => navigate(poliambulatorioId
                            ? `/poliambulatorio/sedi/nuovo?poliambulatorioId=${poliambulatorioId}`
                            : '/poliambulatorio/sedi/nuovo')}
                        className="btn-clinica-primary inline-flex items-center gap-2"
                    >
                        <Plus className="h-4 w-4" />
                        Nuova Sede
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Cerca per nome, città, indirizzo..."
                        className="input-clinica pl-10"
                    />
                </div>
            </div>

            {/* Sedi Grid */}
            {filteredSedi.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                    <Building2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                        {searchTerm ? 'Nessuna sede trovata' : 'Nessuna sede registrata'}
                    </h3>
                    <p className="text-gray-500 mb-6">
                        {searchTerm
                            ? 'Prova a modificare i criteri di ricerca'
                            : 'Inizia aggiungendo la prima sede del poliambulatorio'
                        }
                    </p>
                    {!searchTerm && (
                        <CRUDButton
                            operation="create"
                            onClick={() => navigate('/poliambulatorio/sedi/nuovo')}
                            className="btn-clinica-primary inline-flex items-center gap-2"
                        >
                            <Plus className="h-4 w-4" />
                            Aggiungi Sede
                        </CRUDButton>
                    )}
                </div>
            ) : viewMode === 'grid' ? (
                /* Grid View */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredSedi.map((sede) => (
                        <div
                            key={sede.id}
                            className="bg-white rounded-xl border border-gray-200 hover:border-teal-300 
                                       hover:shadow-md transition-all cursor-pointer"
                            onClick={() => navigate(`/poliambulatorio/sedi/${sede.id}`)}
                        >
                            {/* Card Header */}
                            <div className="p-4 border-b border-gray-100">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${sede.isAttiva ? 'bg-teal-100' : 'bg-gray-100'
                                            }`}>
                                            <Building2 className={`h-5 w-5 ${sede.isAttiva ? 'text-teal-600' : 'text-gray-400'
                                                }`} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-semibold text-gray-900">
                                                    {sede.nome}
                                                </h3>
                                                {sede.isPrincipale && (
                                                    <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                                                )}
                                            </div>
                                            {sede.codice && (
                                                <p className="text-sm text-gray-500">
                                                    {sede.codice}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${sede.isAttiva
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-gray-100 text-gray-600'
                                        }`}>
                                        {sede.isAttiva ? 'Attiva' : 'Inattiva'}
                                    </span>
                                </div>
                            </div>

                            {/* Card Body */}
                            <div className="p-4 space-y-3">
                                {/* Address */}
                                <div className="flex items-start gap-2 text-sm">
                                    <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="text-gray-700">{sede.indirizzo}</p>
                                        <p className="text-gray-500">
                                            {sede.cap} {sede.citta} ({sede.provincia})
                                        </p>
                                    </div>
                                </div>

                                {/* Phone */}
                                {sede.telefono && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <Phone className="h-4 w-4 text-gray-400" />
                                        <span className="text-gray-700">{sede.telefono}</span>
                                    </div>
                                )}

                                {/* Email */}
                                {sede.email && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <Mail className="h-4 w-4 text-gray-400" />
                                        <span className="text-gray-700">{sede.email}</span>
                                    </div>
                                )}

                                {/* Direttore Sanitario */}
                                {sede.direttoreSanitario && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <User className="h-4 w-4 text-gray-400" />
                                        <span className="text-gray-700">
                                            {formatMedicoName(sede.direttoreSanitario)}
                                        </span>
                                    </div>
                                )}

                                {/* Ambulatori count */}
                                {sede._count?.ambulatori !== undefined && (
                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                        <Building2 className="h-4 w-4" />
                                        <span>{sede._count.ambulatori} ambulatori</span>
                                    </div>
                                )}
                            </div>

                            {/* Card Actions */}
                            <div className="p-4 border-t border-gray-100" onClick={(e) => e.stopPropagation()}>
                                <ActionMenu
                                    actions={createCrudActions(
                                        () => navigate(`/poliambulatorio/sedi/${sede.id}`),
                                        () => navigate(`/poliambulatorio/sedi/${sede.id}/modifica`),
                                        () => {
                                            setSedeToDelete(sede);
                                            setDeleteModalOpen(true);
                                        }
                                    )}
                                    size="sm"
                                />
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                /* List View */
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <table className="table-clinica">
                        <thead>
                            <tr>
                                <th>Nome</th>
                                <th>Indirizzo</th>
                                <th>Contatti</th>
                                <th>Stato</th>
                                <th className="w-24">Azioni</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredSedi.map((sede) => (
                                <tr
                                    key={sede.id}
                                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                                    onClick={() => navigate(`/poliambulatorio/sedi/${sede.id}`)}
                                >
                                    <td>
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${sede.isAttiva ? 'bg-teal-50' : 'bg-gray-50'}`}>
                                                <Building2 className={`h-5 w-5 ${sede.isAttiva ? 'text-teal-600' : 'text-gray-400'}`} />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="font-medium text-gray-900">{sede.nome}</p>
                                                    {sede.isPrincipale && (
                                                        <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                                                    )}
                                                </div>
                                                {sede.codice && (
                                                    <p className="text-sm text-gray-500">{sede.codice}</p>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        {sede.indirizzo ? (
                                            <div className="flex items-center gap-1.5 text-gray-600">
                                                <MapPin className="h-4 w-4 text-gray-400" />
                                                <span className="text-sm">
                                                    {sede.indirizzo}{sede.citta && `, ${sede.citta}`}{sede.provincia && ` (${sede.provincia})`}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-gray-400 text-sm">-</span>
                                        )}
                                    </td>
                                    <td>
                                        <div className="space-y-1">
                                            {sede.telefono && (
                                                <div className="flex items-center gap-1.5 text-gray-600">
                                                    <Phone className="h-3.5 w-3.5 text-gray-400" />
                                                    <span className="text-sm">{sede.telefono}</span>
                                                </div>
                                            )}
                                            {sede.email && (
                                                <div className="flex items-center gap-1.5 text-gray-600">
                                                    <Mail className="h-3.5 w-3.5 text-gray-400" />
                                                    <span className="text-sm">{sede.email}</span>
                                                </div>
                                            )}
                                            {!sede.telefono && !sede.email && (
                                                <span className="text-gray-400 text-sm">-</span>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${sede.isAttiva
                                            ? 'bg-emerald-100 text-emerald-700'
                                            : 'bg-gray-100 text-gray-600'
                                            }`}>
                                            {sede.isAttiva ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                                            {sede.isAttiva ? 'Attiva' : 'Inattiva'}
                                        </span>
                                    </td>
                                    <td onClick={(e) => e.stopPropagation()}>
                                        <ActionMenu
                                            actions={createCrudActions(
                                                () => navigate(`/poliambulatorio/sedi/${sede.id}`),
                                                () => navigate(`/poliambulatorio/sedi/${sede.id}/modifica`),
                                                () => {
                                                    setSedeToDelete(sede);
                                                    setDeleteModalOpen(true);
                                                }
                                            )}
                                            size="sm"
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={deleteModalOpen}
                onClose={() => {
                    setDeleteModalOpen(false);
                    setSedeToDelete(null);
                }}
                title="Conferma Eliminazione"
            >
                <div className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 rounded-full bg-red-100">
                            <AlertCircle className="h-6 w-6 text-red-600" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900">
                                Eliminare la sede "{sedeToDelete?.nome}"?
                            </h3>
                            <p className="text-sm text-gray-500 mt-1">
                                Questa azione non può essere annullata.
                            </p>
                        </div>
                    </div>

                    {sedeToDelete?._count?.ambulatori && sedeToDelete._count.ambulatori > 0 && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                            <p className="text-sm text-amber-700">
                                <strong>Attenzione:</strong> questa sede ha {sedeToDelete._count.ambulatori} ambulatori associati.
                                Riassegna gli ambulatori prima di eliminare la sede.
                            </p>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 mt-6">
                        <button
                            onClick={() => {
                                setDeleteModalOpen(false);
                                setSedeToDelete(null);
                            }}
                            className="btn-clinica-secondary"
                            disabled={deleteMutation.isPending}
                        >
                            Annulla
                        </button>
                        <button
                            onClick={handleDelete}
                            disabled={deleteMutation.isPending}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 
                                       disabled:opacity-50 inline-flex items-center gap-2"
                        >
                            {deleteMutation.isPending ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Eliminazione...
                                </>
                            ) : (
                                <>
                                    <Trash2 className="h-4 w-4" />
                                    Elimina
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default SediPage;
