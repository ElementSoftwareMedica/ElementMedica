/**
 * ProtocolloSanitarioDetailPage - Dettaglio protocollo sanitario
 * 
 * Mostra il dettaglio completo di un protocollo sanitario:
 * - Informazioni base (codice, denominazione, periodicità)
 * - Prestazioni associate con periodicità individuale
 * - Mansione collegata con rischi
 * 
 * @module pages/clinica/mdl/ProtocolloSanitarioDetailPage
 */

import React, { useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    ArrowLeft,
    FileText,
    Edit2,
    Trash2,
    Loader2,
    AlertCircle,
    Briefcase,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Calendar,
    ClipboardList,
    ClipboardCheck,
    Copy,
    Euro,
    ToggleLeft,
    ToggleRight
} from 'lucide-react';
import { clinicaApi, type ProtocolloSanitario, type TipoPeriodicita } from '../../../services/clinicaApi';
import { useToast } from '../../../hooks/useToast';
import { useTenantFilter } from '../../../context/TenantFilterContext';
import Modal from '../../../design-system/molecules/Modal/Modal';
import ProtocolloFormModal from './components/ProtocolloFormModal';

const PERIODICITA_LABELS: Record<TipoPeriodicita, string> = {
    MESI_6: '6 mesi',
    MESI_12: '12 mesi',
    MESI_24: '24 mesi',
    MESI_36: '36 mesi',
    MESI_60: '60 mesi',
    SU_INDICAZIONE: 'Su indicazione MC',
    UNA_TANTUM: 'Una tantum'
};

const ProtocolloSanitarioDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const queryClient = useQueryClient();
    const { tenantFilterKey } = useTenantFilter();

    const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);

    const { data: protocollo, isLoading, error } = useQuery({
        queryKey: ['protocollo-sanitario', id, tenantFilterKey],
        queryFn: () => clinicaApi.protocolliSanitari.getById(id!),
        enabled: !!id
    });

    const deleteMutation = useMutation({
        mutationFn: () => clinicaApi.protocolliSanitari.delete(id!),
        onSuccess: () => {
            showToast({ type: 'success', message: 'Protocollo eliminato con successo' });
            queryClient.invalidateQueries({ queryKey: ['protocolli-sanitari'] });
            navigate('/poliambulatorio/mdl/protocolli-sanitari');
        },
        onError: () => {
            showToast({ type: 'error', message: 'Errore durante l\'eliminazione' });
        }
    });

    const toggleActiveMutation = useMutation({
        mutationFn: ({ isAttivo }: { isAttivo: boolean }) =>
            clinicaApi.protocolliSanitari.setActive(id!, isAttivo),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['protocollo-sanitario', id] });
            queryClient.invalidateQueries({ queryKey: ['protocolli-sanitari'] });
            showToast({ type: 'success', message: 'Stato protocollo aggiornato' });
        },
        onError: () => {
            showToast({ type: 'error', message: 'Errore durante l\'aggiornamento' });
        }
    });

    const duplicateMutation = useMutation({
        mutationFn: () => clinicaApi.protocolliSanitari.duplicate(id!),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['protocolli-sanitari'] });
            showToast({ type: 'success', message: 'Protocollo duplicato con successo' });
            if (data?.id) navigate(`/poliambulatorio/mdl/protocolli-sanitari/${data.id}`);
        },
        onError: () => {
            showToast({ type: 'error', message: 'Errore durante la duplicazione' });
        }
    });

    const handleEditSuccess = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ['protocollo-sanitario', id] });
        queryClient.invalidateQueries({ queryKey: ['protocolli-sanitari'] });
        setIsEditModalOpen(false);
    }, [queryClient, id]);

    const handleDelete = useCallback(() => {
        deleteMutation.mutate();
        setIsDeleteModalOpen(false);
    }, [deleteMutation]);

    const prestazioni = protocollo?.prestazioni || [];
    const prestazioniObbligatorie = prestazioni.filter(p => p.isObbligatoria);
    const prestazioniFacoltative = prestazioni.filter(p => !p.isObbligatoria);
    const questionari = protocollo?.questionari || [];

    if (isLoading) {
        return (
            <div className="p-6 clinica-theme">
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 text-teal-600 animate-spin" />
                    <span className="ml-2 text-gray-600">Caricamento protocollo sanitario...</span>
                </div>
            </div>
        );
    }

    if (error || !protocollo) {
        return (
            <div className="p-6 clinica-theme">
                <div className="flex flex-col items-center justify-center py-12 text-red-500">
                    <AlertCircle className="h-12 w-12 mb-4" />
                    <h3 className="text-lg font-medium">Errore nel caricamento</h3>
                    <p className="text-sm text-gray-500 mt-1">Protocollo non trovato</p>
                    <button
                        onClick={() => navigate('/poliambulatorio/mdl/protocolli-sanitari')}
                        className="mt-4 px-4 py-2 text-sm font-medium text-teal-600 hover:text-teal-700"
                    >
                        ← Torna alla lista
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 clinica-theme">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/poliambulatorio/mdl/protocolli-sanitari')}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-xl ${protocollo.isAttivo ? 'bg-teal-100' : 'bg-gray-100'}`}>
                            <FileText className={`h-6 w-6 ${protocollo.isAttivo ? 'text-teal-600' : 'text-gray-400'}`} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">
                                {protocollo.denominazione}
                            </h1>
                            <p className="text-sm text-gray-500">
                                Codice: {protocollo.codice}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsEditModalOpen(true)}
                        className="btn-clinica-secondary flex items-center gap-2"
                    >
                        <Edit2 className="h-4 w-4" />
                        Modifica
                    </button>
                    <button
                        onClick={() => setIsDeleteModalOpen(true)}
                        className="btn-clinica-danger flex items-center gap-2"
                    >
                        <Trash2 className="h-4 w-4" />
                        Elimina
                    </button>
                </div>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Info */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Basic Info Card */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <FileText className="h-5 w-5 text-teal-600" />
                            Informazioni Generali
                        </h2>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Codice</label>
                                <p className="text-sm text-gray-900 mt-1">{protocollo.codice}</p>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Denominazione</label>
                                <p className="text-sm text-gray-900 mt-1">{protocollo.denominazione}</p>
                            </div>
                            {/* M:N mansioni associate */}
                            {((protocollo.mansioniAssociate?.length ?? 0) > 0 || protocollo.mansione) && (
                                <div className="col-span-2">
                                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Mansioni Associate</label>
                                    <div className="flex flex-wrap gap-2 mt-1">
                                        {(protocollo.mansioniAssociate || []).map((ma) => (
                                            <button
                                                key={ma.mansione?.id || ma.mansioneId}
                                                onClick={() => navigate(`/poliambulatorio/mdl/mansioni/${ma.mansione?.id || ma.mansioneId}`)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1 bg-teal-50 text-teal-700 rounded-full text-sm hover:bg-teal-100 transition-colors"
                                            >
                                                <Briefcase className="h-3.5 w-3.5" />
                                                {ma.mansione?.denominazione || 'Mansione'}
                                            </button>
                                        ))}
                                        {/* Fallback for legacy single mansione */}
                                        {!protocollo.mansioniAssociate?.length && protocollo.mansione && (
                                            <button
                                                onClick={() => navigate(`/poliambulatorio/mdl/mansioni/${protocollo.mansione!.id}`)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1 bg-teal-50 text-teal-700 rounded-full text-sm hover:bg-teal-100 transition-colors"
                                            >
                                                <Briefcase className="h-3.5 w-3.5" />
                                                {protocollo.mansione.denominazione}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                            {protocollo.descrizione && (
                                <div className="col-span-2">
                                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Descrizione</label>
                                    <p className="text-sm text-gray-900 mt-1">{protocollo.descrizione}</p>
                                </div>
                            )}
                            {protocollo.note && (
                                <div className="col-span-2">
                                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Note</label>
                                    <p className="text-sm text-gray-900 mt-1">{protocollo.note}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Prestazioni Obbligatorie Card */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <ClipboardList className="h-5 w-5 text-teal-600" />
                            Prestazioni Obbligatorie ({prestazioniObbligatorie.length})
                        </h2>
                        {prestazioniObbligatorie.length === 0 ? (
                            <div className="text-center py-6 text-gray-500">
                                <ClipboardList className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                                <p>Nessuna prestazione obbligatoria</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {prestazioniObbligatorie.map((pp) => (
                                    <div key={pp.id} className="flex items-center justify-between p-3 bg-teal-50 rounded-lg border border-teal-100">
                                        <div className="flex items-center gap-3">
                                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-teal-100 text-teal-700 text-xs font-bold">
                                                {pp.prestazione?.codice?.substring(0, 3) || '—'}
                                            </span>
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">
                                                    {pp.prestazione?.nome || 'Prestazione'}
                                                </p>
                                                {pp.condizioniApplicazione && (
                                                    <p className="text-xs text-gray-500 mt-0.5">{pp.condizioniApplicazione}</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {pp.periodicita && (
                                                <span className="text-xs bg-teal-100 text-teal-700 px-2 py-1 rounded-full">
                                                    {PERIODICITA_LABELS[pp.periodicita] || pp.periodicita}
                                                </span>
                                            )}
                                            {pp.prestazione?.prezzoBase != null && (
                                                <span className="text-xs text-gray-500">
                                                    € {Number(pp.prestazione.prezzoBase).toFixed(2)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Prestazioni Facoltative Card */}
                    {prestazioniFacoltative.length > 0 && (
                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <ClipboardList className="h-5 w-5 text-gray-400" />
                                Prestazioni Facoltative ({prestazioniFacoltative.length})
                            </h2>
                            <div className="space-y-3">
                                {prestazioniFacoltative.map((pp) => (
                                    <div key={pp.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-600 text-xs font-bold">
                                                {pp.prestazione?.codice?.substring(0, 3) || '—'}
                                            </span>
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">
                                                    {pp.prestazione?.nome || 'Prestazione'}
                                                </p>
                                                {pp.condizioniApplicazione && (
                                                    <p className="text-xs text-gray-500 mt-0.5">{pp.condizioniApplicazione}</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {pp.periodicita && (
                                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                                                    {PERIODICITA_LABELS[pp.periodicita] || pp.periodicita}
                                                </span>
                                            )}
                                            {pp.prestazione?.prezzoBase != null && (
                                                <span className="text-xs text-gray-500">
                                                    € {Number(pp.prestazione.prezzoBase).toFixed(2)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Questionari nel Protocollo */}
                    {questionari.length > 0 && (
                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <ClipboardCheck className="h-5 w-5 text-teal-600" />
                                Questionari ({questionari.length})
                            </h2>
                            <div className="space-y-3">
                                {questionari.map((q: any) => (
                                    <div key={q.id} className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-100">
                                        <div className="flex items-center gap-3">
                                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-700 text-xs font-bold">
                                                {q.documentoTemplate?.codice?.substring(0, 3) || 'Q'}
                                            </span>
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">
                                                    {q.documentoTemplate?.nome || 'Questionario'}
                                                </p>
                                                {q.compilabileDa && (
                                                    <p className="text-xs text-gray-500 mt-0.5">
                                                        Compilabile da: {q.compilabileDa === 'MEDICO' ? 'Medico' : q.compilabileDa === 'PAZIENTE' ? 'Paziente' : q.compilabileDa === 'ENTRAMBI' ? 'Entrambi' : q.compilabileDa}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {q.periodicitaMesi && (
                                                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                                                    Ogni {q.periodicitaMesi} mesi
                                                </span>
                                            )}
                                            {q.haScoring && (
                                                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
                                                    Scoring
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Status Card */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h3 className="text-sm font-semibold text-gray-900 mb-4">Stato</h3>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                {protocollo.isAttivo ? (
                                    <>
                                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                                        <span className="text-sm font-medium text-green-700">Attivo</span>
                                    </>
                                ) : (
                                    <>
                                        <XCircle className="h-5 w-5 text-gray-400" />
                                        <span className="text-sm font-medium text-gray-500">Inattivo</span>
                                    </>
                                )}
                            </div>
                            <button
                                onClick={() => toggleActiveMutation.mutate({ isAttivo: !protocollo.isAttivo })}
                                className="text-xs text-teal-600 hover:text-teal-700"
                                disabled={toggleActiveMutation.isPending}
                            >
                                {protocollo.isAttivo ? (
                                    <span className="flex items-center gap-1"><ToggleLeft className="h-4 w-4" /> Disattiva</span>
                                ) : (
                                    <span className="flex items-center gap-1"><ToggleRight className="h-4 w-4" /> Attiva</span>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Riepilogo Card */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h3 className="text-sm font-semibold text-gray-900 mb-4">Riepilogo</h3>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-500">Prestazioni totali</span>
                                <span className="font-medium text-gray-900">{prestazioni.length}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Obbligatorie</span>
                                <span className="font-medium text-teal-700">{prestazioniObbligatorie.length}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Facoltative</span>
                                <span className="font-medium text-gray-600">{prestazioniFacoltative.length}</span>
                            </div>
                            {questionari.length > 0 && (
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Questionari</span>
                                    <span className="font-medium text-purple-700">{questionari.length}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Mansioni Card */}
                    {((protocollo.mansioniAssociate?.length ?? 0) > 0 || protocollo.mansione) && (
                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <Briefcase className="h-4 w-4 text-teal-600" />
                                Mansioni Collegate
                            </h3>
                            <div className="space-y-2">
                                {(protocollo.mansioniAssociate || []).map((ma) => (
                                    <button
                                        key={ma.mansione?.id || ma.mansioneId}
                                        onClick={() => navigate(`/poliambulatorio/mdl/mansioni/${ma.mansione?.id || ma.mansioneId}`)}
                                        className="w-full text-left p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                    >
                                        <p className="text-sm font-medium text-gray-900">{ma.mansione?.denominazione}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">Codice: {ma.mansione?.codice}</p>
                                    </button>
                                ))}
                                {/* Fallback for legacy single mansione */}
                                {!protocollo.mansioniAssociate?.length && protocollo.mansione && (
                                    <button
                                        onClick={() => navigate(`/poliambulatorio/mdl/mansioni/${protocollo.mansione!.id}`)}
                                        className="w-full text-left p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                    >
                                        <p className="text-sm font-medium text-gray-900">{protocollo.mansione.denominazione}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">Codice: {protocollo.mansione.codice}</p>
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Actions Card */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <FileText className="h-4 w-4 text-teal-600" />
                            Azioni Rapide
                        </h3>
                        <div className="space-y-2">
                            <button
                                onClick={() => setIsEditModalOpen(true)}
                                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors flex items-center gap-2"
                            >
                                <Edit2 className="h-4 w-4 text-gray-400" />
                                Modifica protocollo
                            </button>
                            <button
                                onClick={() => duplicateMutation.mutate()}
                                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors flex items-center gap-2"
                                disabled={duplicateMutation.isPending}
                            >
                                <Copy className="h-4 w-4 text-gray-400" />
                                Duplica protocollo
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Edit Modal */}
            <ProtocolloFormModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onSuccess={handleEditSuccess}
                protocollo={protocollo}
            />

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Conferma Eliminazione"
                size="sm"
            >
                <div className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-red-100 rounded-full">
                            <AlertTriangle className="h-6 w-6 text-red-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-medium text-gray-900">
                                Eliminare il protocollo?
                            </h3>
                            <p className="text-sm text-gray-500 mt-1">
                                Stai per eliminare <strong>{protocollo.denominazione}</strong>.
                                Questa azione non può essere annullata.
                            </p>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={() => setIsDeleteModalOpen(false)}
                            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                        >
                            Annulla
                        </button>
                        <button
                            onClick={handleDelete}
                            disabled={deleteMutation.isPending}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm flex items-center gap-2"
                        >
                            {deleteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                            Elimina
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default ProtocolloSanitarioDetailPage;
