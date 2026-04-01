/**
 * Types for AppointmentBookingModal
 * @module pages/clinica/agenda/components/modals/AppointmentBookingModal/types
 * @updated Project 51 - Added tenant context types
 */

import type { CalendarEvent } from '../../../types/calendar.types';
import type {
    Medico,
    Paziente,
    Prestazione,
    Convenzione,
    TariffarioMedico,
    OffertaBundle,
    TipoVisitaMDL,
    Mansione,
    ProtocolloSanitario,
    ProtocolloPrestazione,
    ScadenzaPrestazioneInScadenza
} from '../../../../../../services/clinicaApi';
import type { AccessibleTenant } from '../../../../../../hooks/useTenantAccess';

// ============================================
// MAIN MODAL PROPS
// ============================================

export interface AppointmentBookingModalProps {
    isOpen: boolean;
    onClose: () => void;
    slotInfo: {
        date: Date;
        hour: number;
        ambulatorioId: string;
        isOverbooking?: boolean;
        existingCount?: number;
    } | null;
    medico: Medico | null;
    onSuccess: () => void;
    existingAppointment?: CalendarEvent | null;
    allMedici?: Medico[];
    onDelete?: (id: string) => void;
}

// ============================================
// FORM STATE
// ============================================

export interface ScontoValidato {
    valid: boolean;
    tipo?: 'PERCENTUALE' | 'VALORE_ASSOLUTO';
    valore?: number;
    error?: string; // Messaggio di errore per feedback utente
}

export interface NewPatientData {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
}

export interface EditPatientData {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
}

export interface RescheduleData {
    date: string;
    time: string;
    medicoId: string;
}

// ============================================
// MDL SECTION TYPES
// ============================================

export interface MDLSorveglianzaData {
    isMDLVisit: boolean;
    mansioni: Mansione[];
    protocolli: ProtocolloSanitario[];
    prestazioniProtocollo: ProtocolloPrestazione[];
    /** Set degli ID delle prestazioni protocollo selezionate dall'utente */
    prestazioniSelezionate: Set<string>;
    /** Toggle per selezionare/deselezionare una prestazione protocollo */
    onTogglePrestazione: (prestazioneId: string) => void;
    ultimaVisitaMDL: { dataOra?: string; tipoVisitaMDL?: string; giudizioIdoneita?: string; isFallbackAppuntamento?: boolean } | null;
    prossimaVisitaData: Date | null;
    companyPrezzoTariffario: number | null;
    isLoading: boolean;
    /** true se il paziente è dipendente di un'azienda (companyTenantProfileId valorizzato) */
    isEmployee: boolean;
    /** true se il paziente ha già almeno una visita MDL registrata (determina auto-selezione PREVENTIVA vs PERIODICA) */
    hasPrevVisita: boolean;
    /** true se la prossima scadenza ha già un appuntamento prenotato attivo */
    prossimaScadenzaIsBooked: boolean;
    /** Data appuntamento prenotato per la prossima scadenza (valorizzata solo se prossimaScadenzaIsBooked) */
    prossimaScadenzaAppuntamentoData: string | null;
    /** Prestazioni in scadenza (±60 gg dalla data appuntamento) per il paziente selezionato */
    scadenzeInScadenza: ScadenzaPrestazioneInScadenza[];
    /** true quando la query scadenze è completata (non in caricamento) */
    hasScadenzeLoaded: boolean;
    /** true se hasScadenzeLoaded e nessuna scadenza trovata → richiede selezione tipo visita manuale */
    nessunScadenzaTrovata: boolean;
}

// ============================================
// HOOK RETURN TYPES
// ============================================

export interface UseAppointmentFormReturn {
    // Tenant context (Project 51)
    operateTenantId: string | null;
    operateTenant: AccessibleTenant | null;
    canPerformCRUD: boolean;

    // Patient state
    pazienteSearch: string;
    setPazienteSearch: (value: string) => void;
    selectedPaziente: Paziente | null;
    setSelectedPaziente: (value: Paziente | null) => void;

    // Prestazione/Bundle state
    selectedPrestazione: Prestazione | null;
    setSelectedPrestazione: (value: Prestazione | null) => void;
    selectedBundle: OffertaBundle | null;
    setSelectedBundle: (value: OffertaBundle | null) => void;
    selectionType: 'prestazione' | 'bundle';
    setSelectionType: (value: 'prestazione' | 'bundle') => void;
    selectedTariffario: TariffarioMedico | null;
    setSelectedTariffario: (value: TariffarioMedico | null) => void;

    // Duration and notes
    durataMinuti: number;
    setDurataMinuti: (value: number) => void;
    note: string;
    setNote: (value: string) => void;

    // Convenzione and discount
    selectedConvenzione: Convenzione | null;
    setSelectedConvenzione: (value: Convenzione | null) => void;
    codiceSconto: string;
    setCodiceSconto: (value: string) => void;
    scontoValidato: ScontoValidato | null;
    setScontoValidato: (value: ScontoValidato | null) => void;
    isValidatingSconto: boolean;
    convenzioneWarning: string | null;

    // Overbooking
    forceOverbooking: boolean;
    setForceOverbooking: (value: boolean) => void;
    overbookingAccepted: boolean;
    setOverbookingAccepted: (value: boolean) => void;

    // Reschedule
    showReschedulePanel: boolean;
    setShowReschedulePanel: (value: boolean) => void;
    rescheduleData: RescheduleData;
    setRescheduleData: (value: RescheduleData) => void;

    // New patient
    showNewPatientForm: boolean;
    setShowNewPatientForm: (value: boolean) => void;
    newPatientData: NewPatientData;
    setNewPatientData: (value: NewPatientData) => void;
    isCreatingPatient: boolean;

    // Edit patient
    isEditingPatient: boolean;
    setIsEditingPatient: (value: boolean) => void;
    editPatientData: EditPatientData;
    setEditPatientData: (value: EditPatientData) => void;
    isSavingPatient: boolean;

    // Submit state
    isSubmitting: boolean;

    // Computed values
    isEditMode: boolean;
    isOverbooking: boolean;

    // MDL - Medicina del Lavoro
    tipoVisitaMDL: TipoVisitaMDL | null;
    setTipoVisitaMDL: (value: TipoVisitaMDL | null) => void;
    mdlData: MDLSorveglianzaData;

    // Actions
    handleValidateSconto: () => Promise<void>;
    handleCreateProvisionalPatient: () => Promise<void>;
    handleSavePatientEdit: () => Promise<void>;
    startEditingPatient: () => void;
    cancelEditingPatient: () => void;
    handleSubmit: () => Promise<void>;
    calcolaPrezzoScontato: (prezzoBase: number | undefined) => number | null;
    resetForm: () => void;
}

// ============================================
// SUB-COMPONENT PROPS
// ============================================

export interface PatientSearchProps {
    pazienteSearch: string;
    setPazienteSearch: (value: string) => void;
    selectedPaziente: Paziente | null;
    setSelectedPaziente: (value: Paziente | null) => void;
    showNewPatientForm: boolean;
    setShowNewPatientForm: (value: boolean) => void;
    newPatientData: NewPatientData;
    setNewPatientData: (value: NewPatientData) => void;
    isCreatingPatient: boolean;
    handleCreateProvisionalPatient: () => Promise<void>;
    isEditingPatient: boolean;
    editPatientData: EditPatientData;
    setEditPatientData: (value: EditPatientData) => void;
    isSavingPatient: boolean;
    handleSavePatientEdit: () => Promise<void>;
    startEditingPatient: () => void;
    cancelEditingPatient: () => void;
}

export interface PrestazionePickerProps {
    selectedPrestazione: Prestazione | null;
    setSelectedPrestazione: (value: Prestazione | null) => void;
    selectedBundle: OffertaBundle | null;
    setSelectedBundle: (value: OffertaBundle | null) => void;
    selectionType: 'prestazione' | 'bundle';
    setSelectionType: (value: 'prestazione' | 'bundle') => void;
    setSelectedTariffario: (value: TariffarioMedico | null) => void;
    filteredPrestazioni: Prestazione[];
    filteredBundles: OffertaBundle[];
    medicoDetails: Medico | null;
    scontoValidato: ScontoValidato | null;
    calcolaPrezzoScontato: (prezzoBase: number | undefined) => number | null;
}

export interface ConvenzionePickerProps {
    selectedConvenzione: Convenzione | null;
    setSelectedConvenzione: (value: Convenzione | null) => void;
    codiceSconto: string;
    setCodiceSconto: (value: string) => void;
    scontoValidato: ScontoValidato | null;
    setScontoValidato: (value: ScontoValidato | null) => void;
    isValidatingSconto: boolean;
    handleValidateSconto: () => Promise<void>;
    filteredConvenzioni: Convenzione[];
    selectedPrestazione: Prestazione | null;
    selectedBundle: OffertaBundle | null;
    convenzioneWarning: string | null;
}

export interface ReschedulePanelProps {
    showReschedulePanel: boolean;
    setShowReschedulePanel: (value: boolean) => void;
    rescheduleData: RescheduleData;
    setRescheduleData: (value: RescheduleData) => void;
    filteredMediciForReschedule: Medico[];
    selectedPrestazione: Prestazione | null;
}

export interface MDLSorveglianzaPanelProps {
    mdlData: MDLSorveglianzaData;
    tipoVisitaMDL: TipoVisitaMDL | null;
    setTipoVisitaMDL: (value: TipoVisitaMDL | null) => void;
    selectedPrestazione: Prestazione | null;
}
