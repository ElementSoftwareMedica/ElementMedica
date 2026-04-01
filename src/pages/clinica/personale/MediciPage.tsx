/**
 * MediciPage
 * 
 * Gestione medici poliambulatorio.
 * Lista medici con possibilità di CRUD e creazione account.
 * 
 * @module pages/poliambulatorio/personale/MediciPage
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
    Stethoscope,
    Plus,
    Search,
    Phone,
    Mail,
    Edit2,
    Trash2,
    ChevronRight,
    CheckCircle2,
    XCircle,
    Loader2,
    AlertCircle,
    User,
    Shield,
    Key,
    UserPlus
} from 'lucide-react';
import { mediciApi, type Medico } from '../../../services/clinicaApi';
import { useToast } from '../../../hooks/useToast';
import { formatDoctorName } from '../../../utils/codiceFiscale';
import Modal from '../../../design-system/molecules/Modal/Modal';
import { useTenantFilter } from '../../../context/TenantFilterContext';
import { useViewMode } from '../../../hooks/useViewMode';
import { ViewModeToggle } from '../../../components/clinica/ViewModeToggle';
import { ActionMenu, createCrudActions } from '@/components/ui/ActionMenu';
import { CRUDButton } from '../../../components/shared/CRUDButton';
import { PersonCredentialsModal, type PersonCredentialInfo } from '../../../components/persons/PersonCredentialsModal';

// Import Element Medica theme
import '../../../styles/clinica-theme.css';

const MediciPage: React.FC = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    // Tenant filter from global context
    const { getTenantFilterParams, isReady, tenantFilterKey } = useTenantFilter();

    // State
    const [searchTerm, setSearchTerm] = useState('');
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [medicoToDelete, setMedicoToDelete] = useState<Medico | null>(null);
    const [credentialsModal, setCredentialsModal] = useState<{
        open: boolean;
        credentials: { username: string; temporaryPassword: string } | null;
    }>({ open: false, credentials: null });

    // State for post-creation credentials management
    const [showCredentialsModal, setShowCredentialsModal] = useState(false);
    const [selectedMediciForCredentials, setSelectedMediciForCredentials] = useState<PersonCredentialInfo[]>([]);

    // View mode with localStorage persistence
    const { viewMode, setViewMode } = useViewMode({ storageKey: 'medici' });

    // Fetch medici
    const { data: mediciResponse, isLoading, error } = useQuery({
        queryKey: ['medici', tenantFilterKey],
        queryFn: async () => {
            const tenantParams = getTenantFilterParams();
            return mediciApi.getAll({
                ...(tenantParams.tenantIds && { tenantIds: tenantParams.tenantIds.join(',') }),
                ...(tenantParams.allTenants && { allTenants: 'true' })
            });
        },
        enabled: isReady
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: (medicoId: string) => mediciApi.delete(medicoId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['medici'] });
            showToast({ type: 'success', message: 'Medico eliminato con successo' });
            setDeleteModalOpen(false);
            setMedicoToDelete(null);
        },
        onError: (error: Error) => {
            showToast({ type: 'error', message: 'Errore durante l\'eliminazione' });
        }
    });

    // Extract medici array from response
    const medici: Medico[] = Array.isArray(mediciResponse)
        ? mediciResponse
        : mediciResponse?.data || [];

    // Filter medici by search
    const filteredMedici = medici.filter(medico => {
        const search = searchTerm.toLowerCase();
        return (
            medico.firstName?.toLowerCase().includes(search) ||
            medico.lastName?.toLowerCase().includes(search) ||
            medico.email?.toLowerCase().includes(search) ||
            medico.taxCode?.toLowerCase().includes(search) ||
            medico.specializzazione?.toLowerCase().includes(search)
        );
    });

    const handleDelete = () => {
        if (medicoToDelete) {
            deleteMutation.mutate(medicoToDelete.id);
        }
    };

    const handleConfirmCreate = (credentials: { username: string; temporaryPassword: string }) => {
        setCredentialsModal({ open: true, credentials });
    };

    const handleManageCredentials = (medico: Medico) => {
        setSelectedMediciForCredentials([{
            id: medico.id,
            firstName: medico.firstName || '',
            lastName: medico.lastName || '',
            email: medico.email ?? undefined,
        }]);
        setShowCredentialsModal(true);
    };

    // Get medico notes data (specializzazione, etc.)
    const getMedicoNotes = (medico: Medico) => {
        try {
            if (medico.notes && typeof medico.notes === 'string') {
                return JSON.parse(medico.notes);
            }
        } catch {
            // Ignore parse errors
        }
        return {};
    };

    if (isLoading) {
        return (
            <div className="p-6 clinica-theme">
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 text-teal-600 animate-spin" />
                    <span className="ml-2 text-gray-600">Caricamento medici...</span>
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
                        <Stethoscope className="h-7 w-7 text-teal-600" />
                        Gestione Medici
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Staff medico del poliambulatorio con gestione account
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <ViewModeToggle viewMode={viewMode} onViewModeChange={setViewMode} />
                    <CRUDButton
                        operation="create"
                        onClick={() => navigate('/poliambulatorio/personale/medici/nuovo')}
                        className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                    >
                        <UserPlus className="h-4 w-4" />
                        Nuovo Medico
                    </CRUDButton>
                </div>
            </div>

            {/* Search bar */}
            <div className="mb-6">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Cerca medico per nome, email, codice fiscale, specializzazione..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                    />
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-teal-50 rounded-lg">
                            <Stethoscope className="h-5 w-5 text-teal-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Totale Medici</p>
                            <p className="text-xl font-bold text-gray-900">{medici.length}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-50 rounded-lg">
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Attivi</p>
                            <p className="text-xl font-bold text-gray-900">
                                {medici.filter(m => m.status === 'ACTIVE').length}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 rounded-lg">
                            <Key className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Con Account</p>
                            <p className="text-xl font-bold text-gray-900">
                                {medici.filter(m => m.username).length}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-50 rounded-lg">
                            <XCircle className="h-5 w-5 text-orange-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Inattivi</p>
                            <p className="text-xl font-bold text-gray-900">
                                {medici.filter(m => m.status !== 'ACTIVE').length}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Empty state */}
            {filteredMedici.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                    <Stethoscope className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                        {searchTerm ? 'Nessun medico trovato' : 'Nessun medico registrato'}
                    </h3>
                    <p className="text-gray-500 mb-6">
                        {searchTerm
                            ? 'Prova a modificare i criteri di ricerca'
                            : 'Inizia aggiungendo il primo medico al poliambulatorio'}
                    </p>
                    {!searchTerm && (
                        <CRUDButton
                            operation="create"
                            onClick={() => navigate('/poliambulatorio/personale/medici/nuovo')}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                        >
                            <UserPlus className="h-4 w-4" />
                            Aggiungi Medico
                        </CRUDButton>
                    )}
                </div>
            ) : (
                <>
                    {/* Grid View */}
                    {viewMode === 'grid' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredMedici.map(medico => {
                                const notes = getMedicoNotes(medico);
                                return (
                                    <div
                                        key={medico.id}
                                        className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg transition-all group cursor-pointer"
                                        onClick={() => navigate(`/poliambulatorio/personale/medici/${medico.id}`)}
                                    >
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center">
                                                    <User className="h-6 w-6 text-teal-600" />
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-gray-900">
                                                        {formatDoctorName({ firstName: medico.firstName, lastName: medico.lastName, taxCode: medico.taxCode })}
                                                    </h3>
                                                    {notes.specializzazione && (
                                                        <p className="text-sm text-gray-500">{notes.specializzazione}</p>
                                                    )}
                                                </div>
                                            </div>
                                            <ActionMenu
                                                actions={[
                                                    ...createCrudActions(
                                                        () => navigate(`/poliambulatorio/personale/medici/${medico.id}`),
                                                        () => navigate(`/poliambulatorio/personale/medici/${medico.id}/modifica`),
                                                        () => {
                                                            setMedicoToDelete(medico);
                                                            setDeleteModalOpen(true);
                                                        }
                                                    ),
                                                    {
                                                        label: 'Gestisci Credenziali',
                                                        icon: Key,
                                                        onClick: () => handleManageCredentials(medico),
                                                    }
                                                ]}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            {medico.email && (
                                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                                    <Mail className="h-4 w-4 text-gray-400" />
                                                    {medico.email}
                                                </div>
                                            )}
                                            {medico.phone && (
                                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                                    <Phone className="h-4 w-4 text-gray-400" />
                                                    {medico.phone}
                                                </div>
                                            )}
                                        </div>

                                        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                {medico.status === 'ACTIVE' ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-full">
                                                        <CheckCircle2 className="h-3 w-3" />
                                                        Attivo
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                                                        <XCircle className="h-3 w-3" />
                                                        Inattivo
                                                    </span>
                                                )}
                                                {medico.username && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                                                        <Key className="h-3 w-3" />
                                                        Account
                                                    </span>
                                                )}
                                            </div>
                                            <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-teal-600 transition-colors" />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* List View */}
                    {viewMode === 'list' && (
                        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Medico
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Contatti
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Specializzazione
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Stato
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Azioni
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredMedici.map(medico => {
                                        const notes = getMedicoNotes(medico);
                                        return (
                                            <tr
                                                key={medico.id}
                                                className="hover:bg-gray-50 cursor-pointer"
                                                onClick={() => navigate(`/poliambulatorio/personale/medici/${medico.id}`)}
                                            >
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                                                            <User className="h-5 w-5 text-teal-600" />
                                                        </div>
                                                        <div>
                                                            <div className="font-medium text-gray-900">
                                                                {formatDoctorName({ firstName: medico.firstName, lastName: medico.lastName, taxCode: medico.taxCode })}
                                                            </div>
                                                            {medico.taxCode && (
                                                                <div className="text-sm text-gray-500">{medico.taxCode}</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900">{medico.email || '-'}</div>
                                                    <div className="text-sm text-gray-500">{medico.phone || '-'}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900">
                                                        {notes.specializzazione || '-'}
                                                    </div>
                                                    {notes.alboRegione && notes.numeroIscrizione && (
                                                        <div className="text-sm text-gray-500">
                                                            Albo {notes.alboRegione} n. {notes.numeroIscrizione}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        {medico.status === 'ACTIVE' ? (
                                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-full">
                                                                <CheckCircle2 className="h-3 w-3" />
                                                                Attivo
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                                                                <XCircle className="h-3 w-3" />
                                                                Inattivo
                                                            </span>
                                                        )}
                                                        {medico.username && (
                                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                                                                <Key className="h-3 w-3" />
                                                                Account
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <ActionMenu
                                                        actions={[
                                                            ...createCrudActions(
                                                                () => navigate(`/poliambulatorio/personale/medici/${medico.id}`),
                                                                () => navigate(`/poliambulatorio/personale/medici/${medico.id}/modifica`),
                                                                () => {
                                                                    setMedicoToDelete(medico);
                                                                    setDeleteModalOpen(true);
                                                                }
                                                            ),
                                                            {
                                                                label: 'Gestisci Credenziali',
                                                                icon: Key,
                                                                onClick: () => handleManageCredentials(medico),
                                                            }
                                                        ]}
                                                    />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}

            {/* Delete Modal */}
            <Modal
                isOpen={deleteModalOpen}
                onClose={() => {
                    setDeleteModalOpen(false);
                    setMedicoToDelete(null);
                }}
                title="Conferma eliminazione"
            >
                <div className="p-6">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 bg-red-100 rounded-full">
                            <AlertCircle className="h-6 w-6 text-red-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                                Eliminare questo medico?
                            </h3>
                            <p className="text-gray-500">
                                {medicoToDelete && formatDoctorName({ firstName: medicoToDelete.firstName, lastName: medicoToDelete.lastName, taxCode: medicoToDelete.taxCode })}
                            </p>
                        </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-6">
                        Questa azione disattiverà l'account del medico. I dati saranno mantenuti
                        per conformità GDPR ma il medico non potrà più accedere al sistema.
                    </p>
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={() => {
                                setDeleteModalOpen(false);
                                setMedicoToDelete(null);
                            }}
                            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                            Annulla
                        </button>
                        <button
                            onClick={handleDelete}
                            disabled={deleteMutation.isPending}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                        >
                            {deleteMutation.isPending ? 'Eliminazione...' : 'Elimina'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Credentials Modal — Post-creation send/resend */}
            <PersonCredentialsModal
                open={showCredentialsModal}
                onOpenChange={setShowCredentialsModal}
                persons={selectedMediciForCredentials}
            />

            {/* Credentials Modal — First-time display at creation */}
            <Modal
                isOpen={credentialsModal.open}
                onClose={() => setCredentialsModal({ open: false, credentials: null })}
                title="Credenziali di accesso"
            >
                <div className="p-6">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 bg-green-100 rounded-full">
                            <Key className="h-6 w-6 text-green-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                                Account creato con successo
                            </h3>
                            <p className="text-gray-500">
                                Comunica queste credenziali al medico
                            </p>
                        </div>
                    </div>
                    {credentialsModal.credentials && (
                        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                            <div>
                                <label className="text-xs font-medium text-gray-500 uppercase">
                                    Username
                                </label>
                                <p className="text-lg font-mono font-semibold text-gray-900">
                                    {credentialsModal.credentials.username}
                                </p>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-500 uppercase">
                                    Password Temporanea
                                </label>
                                <p className="text-lg font-mono font-semibold text-gray-900">
                                    {credentialsModal.credentials.temporaryPassword}
                                </p>
                            </div>
                        </div>
                    )}
                    <p className="text-sm text-amber-600 mt-4 flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        La password deve essere cambiata al primo accesso
                    </p>
                    <div className="flex justify-end mt-6">
                        <button
                            onClick={() => setCredentialsModal({ open: false, credentials: null })}
                            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                        >
                            Chiudi
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default MediciPage;
