import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { usePreventivi } from '../../../hooks/finance/usePreventivi';
import { useToast } from '../../../hooks/useToast';
import preventiviService from '../../../services/preventiviService';

// Import extracted modules
import {
  type Company,
  type Training,
  type DateEntry,
  type CompanyConfig,
  type SpesaAccessoria,
  type ScontoApplicato,
  useCompanyConfig,
  useFormState,
  usePriceCalculation,
  useScontoValidation,
  CompanyList,
  FormFields,
  PriceBreakdown,
  buildPreventivoNote,
} from './PreventiviModal/index';

interface PreventiviModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCompanies: Company[];
  selectedCourse: Training;
  dates: DateEntry[];
  scheduleId?: string | number | null;
  editingPreventivo?: any | null;
  attendance?: Record<number, (string | number)[]>;
  persons?: Array<{ id: string | number; companyId?: string | number;[key: string]: any }>;
  onPreventiviCreated: (ids: string[]) => void;
}

export const PreventiviModal = ({
  isOpen,
  onClose,
  selectedCompanies,
  selectedCourse,
  dates,
  scheduleId,
  editingPreventivo = null,
  attendance,
  persons = [],
  onPreventiviCreated,
}: PreventiviModalProps) => {
  // API hooks
  const { createPreventivo, applySconto, loading } = usePreventivi();
  const { showToast } = useToast();

  // Extracted custom hooks
  const {
    companiesConfig,
    selectedCompanyId,
    setSelectedCompanyId,
    updateCompanyParticipants,
    toggleCompanyEnabled,
    enabledCount,
  } = useCompanyConfig(selectedCompanies, editingPreventivo, attendance, persons);

  const {
    prezzoUnitario,
    tipoServizio,
    speseAccessorie,
    codiceSconto,
    scontoApplicato,
    note,
    setPrezzoUnitario,
    setTipoServizio,
    handleAddSpesa,
    handleRemoveSpesa,
    handleUpdateSpesa,
    setCodiceSconto,
    setScontoApplicato,
    setNote,
  } = useFormState(selectedCourse, editingPreventivo);

  const companyTotals = usePriceCalculation(
    companiesConfig,
    prezzoUnitario,
    speseAccessorie,
    scontoApplicato,
    tipoServizio
  );

  const { validateAndApplySconto, loadingSconto } = useScontoValidation();

  // Wrapper for validateSconto to be called from FormFields
  const handleValidateSconto = async () => {
    const result = await validateAndApplySconto(
      codiceSconto,
      selectedCompanyId,
      companyTotals,
      tipoServizio,
      selectedCourse
    );

    // Show toast with result message
    showToast({
      message: result.message,
      type: result.type
    });

    if (result.success && result.sconto) {
      setScontoApplicato(result.sconto);
    } else {
      setScontoApplicato(null);
    }
  };

  // Generate or update preventivi
  const handleGeneratePreventivi = async () => {
    if (!scheduleId) {
      showToast({ message: 'Salva il calendario prima di generare i preventivi', type: 'warning' });
      return;
    }

    // If editing a single preventivo, update it
    if (editingPreventivo) {
      try {
        const config = companiesConfig.get(editingPreventivo.aziendaId);
        const totals = companyTotals.get(editingPreventivo.aziendaId);

        if (!config || !totals) {
          showToast({ message: 'Configurazione non valida', type: 'error' });
          return;
        }

        const noteBreakdown = buildPreventivoNote(
          selectedCourse,
          config,
          prezzoUnitario,
          totals,
          speseAccessorie,
          scontoApplicato,
          note
        );

        const updateData = {
          tipoServizio,
          prezzoTotale: totals.prezzoBase + totals.totaleSpese,
          imponibile: totals.imponibile,
          importoIva: totals.importoIva,
          importoFinale: totals.importoFinale,
          percentualeIva: totals.percentualeIva,
          note: noteBreakdown,
        };

        await preventiviService.update(editingPreventivo.id, updateData);

        // Apply or remove sconto
        if (scontoApplicato && scontoApplicato.codice !== editingPreventivo.scontoApplicato?.codice) {
          await applySconto(editingPreventivo.id, scontoApplicato.codice);
        } else if (!scontoApplicato && editingPreventivo.scontoApplicato) {
          await preventiviService.removeSconto(editingPreventivo.id);
        }

        showToast({ message: 'Preventivo aggiornato con successo!', type: 'success' });
        onPreventiviCreated([editingPreventivo.id]);
        // Chiudi automaticamente il modal dopo l'aggiornamento
        onClose();
      } catch (error: unknown) {
        showToast({
          message: 'Errore durante l\'aggiornamento del preventivo',
          type: 'error'
        });
      }
      return;
    }

    // Otherwise, create new preventivi
    try {
      const preventiviCreati: string[] = [];
      let successCount = 0;
      let errorCount = 0;

      for (const [companyId, config] of companiesConfig.entries()) {
        if (!config.enabled || config.numPartecipanti < 1) continue;

        const company = selectedCompanies.find((c) => c.id === companyId);
        const totals = companyTotals.get(companyId);

        if (!company || !totals) continue;

        try {
          const noteBreakdown = buildPreventivoNote(
            selectedCourse,
            config,
            prezzoUnitario,
            totals,
            speseAccessorie,
            scontoApplicato,
            note
          );

          // P49: Use companyTenantProfileId for backend API
          // The backend expects companyTenantProfileId, not company.id
          const companyTenantProfileId = (company as any).companyTenantProfileId || company.id;

          const preventivoData = {
            aziendaId: String(companyTenantProfileId),
            corsoId: String(scheduleId),
            tipoServizio,
            quantita: config.numPartecipanti,
            prezzoTotale: totals.prezzoBase + totals.totaleSpese,
            imponibile: totals.imponibile,
            importoIva: totals.importoIva,
            importoFinale: totals.importoFinale,
            percentualeIva: totals.percentualeIva,
            note: noteBreakdown,
          };


          const preventivo = await createPreventivo(preventivoData);

          // Apply sconto if present
          if (preventivo?.id && scontoApplicato) {
            await applySconto(preventivo.id, scontoApplicato.codice);
          }

          if (preventivo?.id) {
            preventiviCreati.push(preventivo.id);
            successCount++;
          }
        } catch (error) {
          errorCount++;
        }
      }

      if (successCount > 0) {
        showToast({
          message: `Generati ${successCount} preventivo/i!${errorCount > 0 ? ` (${errorCount} errori)` : ''}`,
          type: errorCount > 0 ? 'warning' : 'success'
        });
        onPreventiviCreated(preventiviCreati);
        // Chiudi automaticamente il modal dopo la creazione
        onClose();
      } else {
        showToast({ message: 'Nessun preventivo generato con successo', type: 'error' });
      }
    } catch (error: unknown) {
      showToast({
        message: 'Errore durante la generazione dei preventivi',
        type: 'error'
      });
    }
  };

  // Get selected company totals and config
  const selectedTotals = selectedCompanyId ? companyTotals.get(selectedCompanyId) : null;
  const selectedConfig = selectedCompanyId ? companiesConfig.get(selectedCompanyId) : null;

  if (!isOpen) return null;

  return createPortal(
    <>
      {/* Backdrop separato con z-index superiore al modal parent */}
      <div className="fixed inset-0 bg-black/60 z-[1099]" onClick={onClose}></div>

      {/* Modal content con z-index superiore */}
      <div className="fixed inset-0 flex items-center justify-center z-[1100] p-4 pointer-events-none">
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col pointer-events-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 relative">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {editingPreventivo ? 'Modifica Preventivo' : 'Genera Preventivi'}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {editingPreventivo
                  ? 'Modifica i dettagli del preventivo'
                  : `${enabledCount} ${enabledCount === 1 ? 'azienda selezionata' : 'aziende selezionate'}`}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Chiudi"
            >
              <X className="w-6 h-6 text-gray-600 dark:text-gray-400" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            <div className="grid grid-cols-12 gap-0 h-full divide-x divide-gray-200 dark:divide-gray-700">
              {/* Sidebar - Company List */}
              <div className="col-span-4 bg-gray-50 dark:bg-gray-900">
                <CompanyList
                  selectedCompanies={selectedCompanies}
                  companiesConfig={companiesConfig}
                  companyTotals={companyTotals}
                  selectedCompanyId={selectedCompanyId}
                  onSelectCompany={setSelectedCompanyId}
                  onUpdateParticipants={updateCompanyParticipants}
                  onToggleEnabled={toggleCompanyEnabled}
                />
              </div>

              {/* Main Form */}
              <div className="col-span-8 overflow-y-auto p-6">
                {selectedCompanyId && selectedConfig ? (
                  <div className="space-y-6">
                    <FormFields
                      prezzoUnitario={prezzoUnitario}
                      tipoServizio={tipoServizio}
                      speseAccessorie={speseAccessorie}
                      codiceSconto={codiceSconto}
                      scontoApplicato={scontoApplicato}
                      note={note}
                      onPrezzoChange={setPrezzoUnitario}
                      onTipoServizioChange={setTipoServizio}
                      onAddSpesa={handleAddSpesa}
                      onRemoveSpesa={handleRemoveSpesa}
                      onUpdateSpesa={handleUpdateSpesa}
                      onCodiceChange={setCodiceSconto}
                      onValidateSconto={handleValidateSconto}
                      onNoteChange={setNote}
                      loadingSconto={loadingSconto}
                    />

                    {selectedTotals && selectedConfig && (
                      <PriceBreakdown
                        totals={selectedTotals}
                        config={selectedConfig}
                        scontoApplicato={scontoApplicato}
                      />
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                    <p>Seleziona un'azienda dalla lista per configurare il preventivo</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-4 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-full hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors font-medium"
            >
              Annulla
            </button>
            <button
              onClick={handleGeneratePreventivi}
              disabled={loading || enabledCount === 0}
              className="px-8 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading
                ? 'Elaborazione...'
                : editingPreventivo
                  ? 'Aggiorna Preventivo'
                  : `Genera ${enabledCount} Preventiv${enabledCount === 1 ? 'o' : 'i'}`}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
};

// Default export for compatibility with existing imports
export default PreventiviModal;
