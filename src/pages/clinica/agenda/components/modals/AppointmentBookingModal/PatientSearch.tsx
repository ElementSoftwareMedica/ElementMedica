/**
 * PatientSearch - Patient search and selection component
 * @module pages/clinica/agenda/components/modals/AppointmentBookingModal/PatientSearch
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    User,
    Search,
    X,
    Check,
    RefreshCw,
    Edit,
    Phone,
    Mail,
    MapPin,
    Plus
} from 'lucide-react';

import { pazientiApi, Paziente } from '../../../../../../services/clinicaApi';
import type { PatientSearchProps } from './types';

export const PatientSearch: React.FC<PatientSearchProps> = ({
    pazienteSearch,
    setPazienteSearch,
    selectedPaziente,
    setSelectedPaziente,
    showNewPatientForm,
    setShowNewPatientForm,
    newPatientData,
    setNewPatientData,
    isCreatingPatient,
    handleCreateProvisionalPatient,
    isEditingPatient,
    editPatientData,
    setEditPatientData,
    isSavingPatient,
    handleSavePatientEdit,
    startEditingPatient,
    cancelEditingPatient
}) => {
    // Search pazienti
    const { data: pazientiData, isLoading: isLoadingPazienti } = useQuery({
        queryKey: ['pazienti-search-modal', pazienteSearch],
        queryFn: () => pazientiApi.getAll({ search: pazienteSearch, limit: 10 }),
        enabled: pazienteSearch.length >= 2 && !selectedPaziente
    });

    const formatPazienteDate = (date?: string) => {
        if (!date) return '';
        return new Date(date).toLocaleDateString('it-IT');
    };

    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <User className="h-4 w-4 inline mr-1" />
                Paziente *
            </label>

            {selectedPaziente ? (
                isEditingPatient ? (
                    /* Inline Patient Edit Form */
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-blue-900 flex items-center gap-2">
                                <Edit className="h-4 w-4" />
                                Modifica dati paziente
                            </h4>
                            <button
                                onClick={cancelEditingPatient}
                                className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Cognome *</label>
                                <input
                                    type="text"
                                    value={editPatientData.lastName}
                                    onChange={(e) => setEditPatientData({ ...editPatientData, lastName: e.target.value })}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Cognome"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Nome *</label>
                                <input
                                    type="text"
                                    value={editPatientData.firstName}
                                    onChange={(e) => setEditPatientData({ ...editPatientData, firstName: e.target.value })}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Nome"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Telefono</label>
                                <input
                                    type="tel"
                                    value={editPatientData.phone}
                                    onChange={(e) => setEditPatientData({ ...editPatientData, phone: e.target.value })}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="333 123 4567"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                                <input
                                    type="email"
                                    value={editPatientData.email}
                                    onChange={(e) => setEditPatientData({ ...editPatientData, email: e.target.value })}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="email@esempio.it"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                onClick={cancelEditingPatient}
                                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
                            >
                                Annulla
                            </button>
                            <button
                                onClick={handleSavePatientEdit}
                                disabled={isSavingPatient}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
                            >
                                {isSavingPatient ? (
                                    <>
                                        <RefreshCw className="h-4 w-4 animate-spin" />
                                        Salvataggio...
                                    </>
                                ) : (
                                    <>
                                        <Check className="h-4 w-4" />
                                        Salva
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                ) : (
                    /* Patient Display */
                    <div className="flex items-center gap-3 p-3 bg-teal-50 dark:bg-teal-900/30 border border-teal-200 dark:border-teal-800 rounded-lg">
                        <div className="w-10 h-10 rounded-full bg-teal-200 dark:bg-teal-800 flex items-center justify-center">
                            <User className="h-5 w-5 text-teal-700 dark:text-teal-300" />
                        </div>
                        <div className="flex-1">
                            <p className="font-medium text-gray-900 dark:text-gray-100">
                                {selectedPaziente.cognome || (selectedPaziente as Paziente & { lastName?: string }).lastName} {selectedPaziente.nome || (selectedPaziente as Paziente & { firstName?: string }).firstName}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {formatPazienteDate(selectedPaziente.dataNascita)}
                                {selectedPaziente.indirizzo && ` • ${selectedPaziente.indirizzo}`}
                            </p>
                            <div className="flex items-center gap-3 mt-1 text-sm text-gray-600 dark:text-gray-400">
                                {(selectedPaziente.telefono || (selectedPaziente as Paziente & { phone?: string }).phone) && (
                                    <span className="flex items-center gap-1">
                                        <Phone className="h-3.5 w-3.5" />
                                        {selectedPaziente.telefono || (selectedPaziente as Paziente & { phone?: string }).phone}
                                    </span>
                                )}
                                {selectedPaziente.email && (
                                    <span className="flex items-center gap-1">
                                        <Mail className="h-3.5 w-3.5" />
                                        {selectedPaziente.email}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-col gap-1">
                            <button
                                onClick={startEditingPatient}
                                className="p-1.5 text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/50 rounded"
                                title="Modifica dati paziente"
                            >
                                <Edit className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => setSelectedPaziente(null)}
                                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                                title="Cambia paziente"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )
            ) : (
                <div className="space-y-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            value={pazienteSearch}
                            onChange={(e) => setPazienteSearch(e.target.value)}
                            placeholder="Cerca per cognome, nome, codice fiscale..."
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        />

                        {/* Dropdown results container - absolutely positioned to prevent modal jumping */}
                        {(isLoadingPazienti || (pazientiData?.data && pazientiData.data.length > 0) || (pazienteSearch.length >= 2 && !isLoadingPazienti && pazientiData?.data?.length === 0 && !showNewPatientForm) || (pazienteSearch.length < 2 && pazienteSearch.length > 0 && !showNewPatientForm)) && (
                            <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10">
                                {isLoadingPazienti && (
                                    <div className="flex items-center justify-center py-3">
                                        <RefreshCw className="h-5 w-5 text-teal-600 animate-spin" />
                                    </div>
                                )}

                                {pazientiData?.data && pazientiData.data.length > 0 && (
                                    <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-48 overflow-y-auto">
                                        {pazientiData.data.map(paziente => (
                                            <button
                                                key={paziente.id}
                                                onClick={() => {
                                                    setSelectedPaziente(paziente);
                                                    setPazienteSearch('');
                                                }}
                                                className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 text-left"
                                            >
                                                <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center flex-shrink-0">
                                                    <User className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                                                        {(paziente as Paziente & { lastName?: string }).lastName || paziente.cognome} {(paziente as Paziente & { firstName?: string }).firstName || paziente.nome}
                                                    </p>
                                                    <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                                                        {(paziente.dataNascita || (paziente as Paziente & { birthDate?: string }).birthDate) && (
                                                            <span>{formatPazienteDate(paziente.dataNascita || (paziente as Paziente & { birthDate?: string }).birthDate)}</span>
                                                        )}
                                                        {paziente.indirizzo && (
                                                            <span className="flex items-center gap-0.5">
                                                                <MapPin className="h-3 w-3" />
                                                                {paziente.indirizzo.length > 30
                                                                    ? paziente.indirizzo.substring(0, 30) + '...'
                                                                    : paziente.indirizzo}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {pazienteSearch.length >= 2 && !isLoadingPazienti && pazientiData?.data?.length === 0 && !showNewPatientForm && (
                                    <div className="text-center py-3 space-y-2">
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Nessun paziente trovato</p>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const parts = pazienteSearch.trim().split(' ');
                                                setNewPatientData({
                                                    firstName: parts.length > 1 ? parts.slice(1).join(' ') : '',
                                                    lastName: parts[0] || '',
                                                    phone: '',
                                                    email: ''
                                                });
                                                setShowNewPatientForm(true);
                                            }}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/30 hover:bg-teal-100 dark:hover:bg-teal-900/50 rounded-lg transition-colors"
                                        >
                                            <Plus className="h-4 w-4" />
                                            Crea nuovo paziente
                                        </button>
                                    </div>
                                )}

                                {pazienteSearch.length < 2 && pazienteSearch.length > 0 && !showNewPatientForm && (
                                    <p className="text-center text-sm text-gray-400 dark:text-gray-500 py-2">
                                        Inserisci almeno 2 caratteri
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* New Patient Form */}
                    {showNewPatientForm && (
                        <div className="border border-teal-200 rounded-lg p-4 bg-teal-50/50 space-y-3">
                            <div className="flex items-center justify-between">
                                <h4 className="text-sm font-medium text-gray-700">Nuovo Paziente</h4>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowNewPatientForm(false);
                                        setNewPatientData({ firstName: '', lastName: '', phone: '', email: '' });
                                    }}
                                    className="p-1 text-gray-400 hover:text-gray-600 rounded"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">
                                        Cognome *
                                    </label>
                                    <input
                                        type="text"
                                        value={newPatientData.lastName}
                                        onChange={(e) => setNewPatientData({ ...newPatientData, lastName: e.target.value })}
                                        placeholder="Rossi"
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">
                                        Nome *
                                    </label>
                                    <input
                                        type="text"
                                        value={newPatientData.firstName}
                                        onChange={(e) => setNewPatientData({ ...newPatientData, firstName: e.target.value })}
                                        placeholder="Mario"
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">
                                        Telefono
                                    </label>
                                    <input
                                        type="tel"
                                        value={newPatientData.phone}
                                        onChange={(e) => setNewPatientData({ ...newPatientData, phone: e.target.value })}
                                        placeholder="+39 333 1234567"
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        value={newPatientData.email}
                                        onChange={(e) => setNewPatientData({ ...newPatientData, email: e.target.value })}
                                        placeholder="mario@email.com"
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                    />
                                </div>
                            </div>

                            <p className="text-xs text-gray-500">
                                * Almeno un recapito (telefono o email) è obbligatorio
                            </p>

                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowNewPatientForm(false);
                                        setNewPatientData({ firstName: '', lastName: '', phone: '', email: '' });
                                    }}
                                    className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
                                >
                                    Annulla
                                </button>
                                <button
                                    type="button"
                                    onClick={handleCreateProvisionalPatient}
                                    disabled={isCreatingPatient}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isCreatingPatient ? (
                                        <>
                                            <RefreshCw className="h-4 w-4 animate-spin" />
                                            Creazione...
                                        </>
                                    ) : (
                                        <>
                                            <Check className="h-4 w-4" />
                                            Crea e Seleziona
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default PatientSearch;
