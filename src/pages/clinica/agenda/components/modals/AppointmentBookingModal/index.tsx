/**
 * AppointmentBookingModal - Main modal for booking/editing appointments
 * Orchestrates all sub-components for appointment management
 * 
 * @module pages/clinica/agenda/components/modals/AppointmentBookingModal
 */

import React from 'react';
import {
    Calendar as CalendarIcon,
    Clock,
    X,
    AlertTriangle,
    RefreshCw,
    Edit,
    Plus,
    Trash2,
    FileText,
    Building2
} from 'lucide-react';

import { formatDate } from '../../../../../../utils/dateUtils';
import { formatMedicoName } from '../../../../../../utils/textFormatters';
import { minutesToTimeString } from '../../../utils';
import type { AppointmentBookingModalProps } from './types';
import { useAppointmentForm } from './useAppointmentForm';
import { PatientSearch } from './PatientSearch';
import { PrestazionePicker } from './PrestazionePicker';
import { ConvenzionePicker } from './ConvenzionePicker';
import { ReschedulePanel } from './ReschedulePanel';
import { MDLSorveglianzaPanel } from './MDLSorveglianzaPanel';
import { useConfirmDialog } from '@/contexts/ConfirmDialogContext';

export const AppointmentBookingModal: React.FC<AppointmentBookingModalProps> = (props) => {
    const { isOpen, onClose, slotInfo, medico, existingAppointment, onDelete } = props;

    // Use the form hook with all state and handlers
    const form = useAppointmentForm(props);
    const { confirmDelete } = useConfirmDialog();

    const {
        // Form state
        pazienteSearch,
        setPazienteSearch,
        selectedPaziente,
        setSelectedPaziente,
        selectedPrestazione,
        setSelectedPrestazione,
        selectedBundle,
        setSelectedBundle,
        selectionType,
        setSelectionType,
        setSelectedTariffario,
        durataMinuti,
        setDurataMinuti,
        note,
        setNote,
        selectedConvenzione,
        setSelectedConvenzione,
        codiceSconto,
        setCodiceSconto,
        scontoValidato,
        setScontoValidato,
        isValidatingSconto,
        convenzioneWarning,
        overbookingAccepted,
        setOverbookingAccepted,
        showReschedulePanel,
        setShowReschedulePanel,
        rescheduleData,
        setRescheduleData,
        showNewPatientForm,
        setShowNewPatientForm,
        newPatientData,
        setNewPatientData,
        isCreatingPatient,
        isEditingPatient,
        setIsEditingPatient,
        editPatientData,
        setEditPatientData,
        isSavingPatient,
        isSubmitting,
        isEditMode,
        isOverbooking,
        // MDL
        tipoVisitaMDL,
        setTipoVisitaMDL,
        mdlData,
        // Actions
        handleValidateSconto,
        handleCreateProvisionalPatient,
        handleSavePatientEdit,
        startEditingPatient,
        cancelEditingPatient,
        handleSubmit,
        calcolaPrezzoScontato
    } = form;

    // Get filtered data from hook (extended return)
    const {
        filteredPrestazioni,
        filteredBundles,
        filteredMediciForReschedule,
        filteredConvenzioni,
        medicoDetails,
        showDuplicateWarning,
        duplicateAppointments,
        handleConfirmDuplicate,
        handleCancelDuplicate,
        // Tenant context (Project 51)
        operateTenant,
        canPerformCRUD
    } =
        form as typeof form & {
            filteredPrestazioni: any[];
            filteredBundles: any[];
            filteredMediciForReschedule: any[];
            filteredConvenzioni: any[];
            medicoDetails: any;
            showDuplicateWarning: boolean;
            duplicateAppointments: any[];
            handleConfirmDuplicate: () => void;
            handleCancelDuplicate: () => void;
            operateTenant: any;
            canPerformCRUD: boolean;
        };

    if (!isOpen || (!slotInfo && !existingAppointment)) return null;

    // Determine displayed time/date
    const displayDate = existingAppointment ? existingAppointment.start : slotInfo?.date;
    const displayHour = existingAppointment
        ? existingAppointment.start.getHours() + existingAppointment.start.getMinutes() / 60
        : slotInfo?.hour || 0;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className={`p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between ${isOverbooking ? 'bg-amber-50 dark:bg-amber-900/30' : isEditMode ? 'bg-blue-50 dark:bg-blue-900/30' : 'bg-teal-50 dark:bg-teal-900/30'}`}>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {isOverbooking ? '⚠️ Overbooking' : isEditMode ? 'Modifica Appuntamento' : 'Prenota Appuntamento'}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            {displayDate && formatDate(displayDate, 'full')} alle {minutesToTimeString(displayHour * 60)}
                            {medico && ` • ${formatMedicoName(medico)}`}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {isEditMode && (
                            <button
                                onClick={() => setShowReschedulePanel(!showReschedulePanel)}
                                className={`p-2 rounded-lg transition-colors ${showReschedulePanel ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                                title="Modifica data, ora e medico"
                            >
                                <CalendarIcon className="h-5 w-5" />
                            </button>
                        )}
                        <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Reschedule Panel */}
                {isEditMode && (
                    <ReschedulePanel
                        showReschedulePanel={showReschedulePanel}
                        setShowReschedulePanel={setShowReschedulePanel}
                        rescheduleData={rescheduleData}
                        setRescheduleData={setRescheduleData}
                        filteredMediciForReschedule={filteredMediciForReschedule}
                        selectedPrestazione={selectedPrestazione}
                    />
                )}

                {/* Tenant Info Banner (Project 51) */}
                {operateTenant && (
                    <div className="mx-4 mt-4 px-3 py-2 bg-teal-50 dark:bg-teal-900/30 border border-teal-200 dark:border-teal-800 rounded-lg">
                        <div className="flex items-center gap-2 text-sm text-teal-700 dark:text-teal-400">
                            <Building2 className="h-4 w-4 flex-shrink-0" />
                            <span>
                                Operando su: <strong>{operateTenant.name || operateTenant.companyName}</strong>
                            </span>
                        </div>
                    </div>
                )}

                {/* CRUD Disabled Warning (Project 51) */}
                {!canPerformCRUD && !isEditMode && (
                    <div className="mx-4 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <h4 className="font-semibold text-red-800 text-sm">Operazioni non disponibili</h4>
                                <p className="text-xs text-red-700 mt-1">
                                    Seleziona un tenant specifico nel selettore in alto per poter creare appuntamenti.
                                    Attualmente stai visualizzando "Tutti i tenant".
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Overbooking Warning */}
                {isOverbooking && (
                    <div className="mx-4 mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <h4 className="font-semibold text-amber-800">Attenzione: Overbooking</h4>
                                <p className="text-sm text-amber-700 mt-1">
                                    Esistono già {slotInfo?.existingCount || 1} appuntament{(slotInfo?.existingCount || 1) > 1 ? 'i' : 'o'} in questo slot orario.
                                    Stai per creare un appuntamento in overbooking.
                                </p>
                                <label className="flex items-center gap-2 mt-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={overbookingAccepted}
                                        onChange={(e) => setOverbookingAccepted(e.target.checked)}
                                        className="w-4 h-4 rounded border-amber-400 text-amber-600 focus:ring-amber-500"
                                    />
                                    <span className="text-sm font-medium text-amber-800">
                                        Confermo di voler procedere con l'overbooking
                                    </span>
                                </label>
                            </div>
                        </div>
                    </div>
                )}

                {/* Duplicate Booking Warning Dialog */}
                {showDuplicateWarning && duplicateAppointments.length > 0 && (
                    <div className="mx-4 mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="h-6 w-6 text-orange-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <h4 className="font-semibold text-orange-800">Attenzione: Prenotazione duplicata</h4>
                                <p className="text-sm text-orange-700 mt-1">
                                    Questo paziente ha già {duplicateAppointments.length} appuntament{duplicateAppointments.length > 1 ? 'i' : 'o'} con lo stesso medico oggi:
                                </p>
                                <ul className="mt-2 space-y-1">
                                    {duplicateAppointments.map((app) => (
                                        <li key={app.id} className="text-sm text-orange-700 bg-orange-100 px-2 py-1 rounded">
                                            • Ore {new Date(app.dataOra).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                                            {app.prestazione?.nome && ` - ${app.prestazione.nome}`}
                                            {app.ambulatorio?.nome && ` (${app.ambulatorio.nome})`}
                                        </li>
                                    ))}
                                </ul>
                                <p className="text-sm text-orange-700 mt-2 font-medium">
                                    Vuoi comunque procedere con la prenotazione?
                                </p>
                                <div className="flex gap-2 mt-3">
                                    <button
                                        onClick={handleConfirmDuplicate}
                                        className="px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 transition-colors"
                                    >
                                        Sì, procedi comunque
                                    </button>
                                    <button
                                        onClick={handleCancelDuplicate}
                                        className="px-4 py-2 bg-white text-orange-700 text-sm font-medium rounded-lg border border-orange-300 hover:bg-orange-50 transition-colors"
                                    >
                                        Annulla
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    {/* Patient Search */}
                    <PatientSearch
                        pazienteSearch={pazienteSearch}
                        setPazienteSearch={setPazienteSearch}
                        selectedPaziente={selectedPaziente}
                        setSelectedPaziente={setSelectedPaziente}
                        showNewPatientForm={showNewPatientForm}
                        setShowNewPatientForm={setShowNewPatientForm}
                        newPatientData={newPatientData}
                        setNewPatientData={setNewPatientData}
                        isCreatingPatient={isCreatingPatient}
                        handleCreateProvisionalPatient={handleCreateProvisionalPatient}
                        isEditingPatient={isEditingPatient}
                        editPatientData={editPatientData}
                        setEditPatientData={setEditPatientData}
                        isSavingPatient={isSavingPatient}
                        handleSavePatientEdit={handleSavePatientEdit}
                        startEditingPatient={startEditingPatient}
                        cancelEditingPatient={cancelEditingPatient}
                    />

                    {/* Prestazione Selection */}
                    <PrestazionePicker
                        selectedPrestazione={selectedPrestazione}
                        setSelectedPrestazione={setSelectedPrestazione}
                        selectedBundle={selectedBundle}
                        setSelectedBundle={setSelectedBundle}
                        selectionType={selectionType}
                        setSelectionType={setSelectionType}
                        setSelectedTariffario={setSelectedTariffario}
                        filteredPrestazioni={filteredPrestazioni}
                        filteredBundles={filteredBundles}
                        medicoDetails={medicoDetails}
                        scontoValidato={scontoValidato}
                        calcolaPrezzoScontato={calcolaPrezzoScontato}
                    />

                    {/* MDL Sorveglianza Sanitaria Panel — visible when MDL prestazione selected */}
                    {mdlData.isMDLVisit && selectedPaziente && (
                        <MDLSorveglianzaPanel
                            mdlData={mdlData}
                            tipoVisitaMDL={tipoVisitaMDL}
                            setTipoVisitaMDL={setTipoVisitaMDL}
                            selectedPrestazione={selectedPrestazione}
                        />
                    )}

                    {/* Duration */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            <Clock className="h-4 w-4 inline mr-1" />
                            Durata (minuti)
                        </label>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                value={durataMinuti}
                                onChange={(e) => setDurataMinuti(Number(e.target.value))}
                                onWheel={(e) => e.currentTarget.blur()}
                                min={5}
                                max={480}
                                step={5}
                                className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                            />
                            <div className="flex gap-1">
                                {[15, 30, 45, 60].map(d => (
                                    <button
                                        key={d}
                                        type="button"
                                        onClick={() => setDurataMinuti(d)}
                                        className={`px-2.5 py-1.5 text-xs rounded-lg transition-colors ${durataMinuti === d
                                            ? 'bg-teal-100 text-teal-700 border border-teal-300'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            }`}
                                    >
                                        {d}'
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Convenzione e Sconto */}
                    <ConvenzionePicker
                        selectedConvenzione={selectedConvenzione}
                        setSelectedConvenzione={setSelectedConvenzione}
                        codiceSconto={codiceSconto}
                        setCodiceSconto={setCodiceSconto}
                        scontoValidato={scontoValidato}
                        setScontoValidato={setScontoValidato}
                        isValidatingSconto={isValidatingSconto}
                        handleValidateSconto={handleValidateSconto}
                        filteredConvenzioni={filteredConvenzioni}
                        selectedPrestazione={selectedPrestazione}
                        selectedBundle={selectedBundle}
                        convenzioneWarning={convenzioneWarning}
                    />

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            <FileText className="h-4 w-4 inline mr-1" />
                            Note
                        </label>
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Note aggiuntive per l'appuntamento..."
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-none"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200 flex gap-3 justify-between bg-gray-50">
                    <div>
                        {isEditMode && onDelete && existingAppointment && (
                            <button
                                onClick={async () => {
                                    if (await confirmDelete('questo appuntamento')) {
                                        onDelete(existingAppointment.id);
                                        onClose();
                                    }
                                }}
                                className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg flex items-center gap-2 transition-colors"
                                disabled={isSubmitting}
                            >
                                <Trash2 className="h-4 w-4" />
                                Elimina
                            </button>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                            disabled={isSubmitting}
                        >
                            Annulla
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={!selectedPaziente || (!selectedPrestazione && !selectedBundle) || isSubmitting || (isOverbooking && !overbookingAccepted) || (!isEditMode && !canPerformCRUD)}
                            className={`px-4 py-2 ${isOverbooking ? 'bg-amber-600 hover:bg-amber-700' : isEditMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-teal-600 hover:bg-teal-700'} text-white rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
                            title={!canPerformCRUD && !isEditMode ? 'Seleziona un tenant specifico per creare appuntamenti' : undefined}
                        >
                            {isSubmitting ? (
                                <>
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                    Salvataggio...
                                </>
                            ) : (
                                <>
                                    {isEditMode ? <Edit className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                                    {isOverbooking ? 'Conferma Overbooking' : isEditMode ? 'Salva Modifiche' : 'Prenota Appuntamento'}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AppointmentBookingModal;
