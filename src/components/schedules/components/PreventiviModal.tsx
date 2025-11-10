import { useState } from 'react';
import { X } from 'lucide-react';
import { usePreventivi } from '../../../hooks/finance/usePreventivi';
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
  onPreventiviCreated,
}: PreventiviModalProps) => {
  // API hooks
  const { createPreventivo, applySconto, loading } = usePreventivi();

  // Extracted custom hooks
  const {
    companiesConfig,
    selectedCompanyId,
    setSelectedCompanyId,
    updateCompanyParticipants,
    toggleCompanyEnabled,
    enabledCount,
  } = useCompanyConfig(selectedCompanies, editingPreventivo);

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
    if (result) {
      setScontoApplicato(result);
    } else {
      setScontoApplicato(null);
    }
  };

  // Generate or update preventivi
  const handleGeneratePreventivi = async () => {
    if (!scheduleId) {
      alert('❌ Salva il calendario prima di generare i preventivi');
      return;
    }

    // If editing a single preventivo, update it
    if (editingPreventivo) {
      try {
        const config = companiesConfig.get(editingPreventivo.aziendaId);
        const totals = companyTotals.get(editingPreventivo.aziendaId);

        if (!config || !totals) {
          alert('❌ Configurazione non valida');
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

        alert('✅ Preventivo aggiornato con successo!');
        onPreventiviCreated([editingPreventivo.id]);
      } catch (error: any) {
        console.error('Errore aggiornamento preventivo:', error);
        alert(`❌ Errore: ${error.response?.data?.message || error.message || 'Aggiornamento fallito'}`);
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

          const preventivoData = {
            aziendaId: String(companyId),
            corsoId: String(scheduleId),
            tipoServizio,
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
          console.error(`Errore creazione preventivo per azienda ${companyId}:`, error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        alert(
          `✅ Generati ${successCount} preventivo/i!${errorCount > 0 ? ` (${errorCount} errori)` : ''}`
        );
        onPreventiviCreated(preventiviCreati);
      } else {
        alert('❌ Nessun preventivo generato con successo');
      }
    } catch (error: any) {
      console.error('Errore generazione preventivi:', error);
      alert(
        `❌ Errore: ${error.response?.data?.message || error.message || 'Generazione fallita'}`
      );
    }
  };

  // Get selected company totals and config
  const selectedTotals = selectedCompanyId ? companyTotals.get(selectedCompanyId) : null;
  const selectedConfig = selectedCompanyId ? companiesConfig.get(selectedCompanyId) : null;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {editingPreventivo ? 'Modifica Preventivo' : 'Genera Preventivi'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {editingPreventivo
                ? 'Modifica i dettagli del preventivo'
                : `${enabledCount} ${enabledCount === 1 ? 'azienda selezionata' : 'aziende selezionate'}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/50 rounded-lg transition-colors"
            title="Chiudi"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <div className="grid grid-cols-12 h-full">
            {/* Sidebar - Company List */}
            <div className="col-span-4 border-r border-gray-200 overflow-y-auto bg-gray-50 p-4">
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
                <div className="flex items-center justify-center h-full text-gray-500">
                  <p>Seleziona un'azienda dalla lista per configurare il preventivo</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-4 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Annulla
          </button>
          <button
            onClick={handleGeneratePreventivi}
            disabled={loading || enabledCount === 0}
            className="px-8 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {loading
              ? 'Elaborazione...'
              : editingPreventivo
              ? 'Aggiorna Preventivo'
              : `Genera ${enabledCount} Preventivo${enabledCount !== 1 ? 'i' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
};

// Default export for compatibility with existing imports
export default PreventiviModal;
