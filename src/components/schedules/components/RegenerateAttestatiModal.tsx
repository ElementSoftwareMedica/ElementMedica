/**
 * RegenerateAttestatiModal
 * Modal per confermare la rigenerazione degli attestati con opzione di selezione
 */

import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '../../../design-system/atoms/Button';
import { useConfirmDialog } from '../../../contexts/ConfirmDialogContext';
import { useToast } from '../../../hooks/useToast';

interface Person {
  id: string;
  firstName: string;
  lastName: string;
  hasAttestato?: boolean;
}

interface RegenerateAttestatiModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (personIds: string[], regenerateExisting: boolean) => void;
  persons: Person[];
  existingAttestati: Array<{ personId: string }>;
  scheduleTitle?: string;
}

export const RegenerateAttestatiModal: React.FC<RegenerateAttestatiModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  persons,
  existingAttestati,
  scheduleTitle
}) => {
  const [selectedPersons, setSelectedPersons] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [regenerateExisting, setRegenerateExisting] = useState(false);
  const { confirm } = useConfirmDialog();
  const { showToast } = useToast();

  // Identifica persone con attestati esistenti
  const personsWithAttestati = new Set(existingAttestati.map(a => a.personId));
  const personsWithoutAttestati = persons.filter(p => !personsWithAttestati.has(p.id));
  const personsWithExistingAttestati = persons.filter(p => personsWithAttestati.has(p.id));

  useEffect(() => {
    if (isOpen) {
      // Auto-seleziona persone senza attestati
      setSelectedPersons(new Set(personsWithoutAttestati.map(p => p.id)));
      setSelectAll(false);
      setRegenerateExisting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTogglePerson = (personId: string) => {
    const newSelected = new Set(selectedPersons);
    if (newSelected.has(personId)) {
      newSelected.delete(personId);
    } else {
      newSelected.add(personId);
    }
    setSelectedPersons(newSelected);
    setSelectAll(newSelected.size === persons.length);
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedPersons(new Set());
    } else {
      setSelectedPersons(new Set(persons.map(p => p.id)));
    }
    setSelectAll(!selectAll);
  };

  const handleConfirm = async () => {
    if (selectedPersons.size === 0) {
      showToast({ message: '⚠️ Seleziona almeno un partecipante', type: 'warning' });
      return;
    }

    // Verifica se ci sono attestati esistenti selezionati
    const selectedWithExisting = Array.from(selectedPersons).filter(id =>
      personsWithAttestati.has(id)
    );

    if (selectedWithExisting.length > 0 && !regenerateExisting) {
      const confirmed = await confirm({
        title: 'Attestati Esistenti',
        message: `Hai selezionato ${selectedWithExisting.length} partecipanti che hanno già un attestato. Verranno ignorati. Vuoi procedere comunque?`,
        variant: 'warning',
        confirmLabel: 'Procedi',
        cancelLabel: 'Annulla'
      });
      if (!confirmed) return;
    }

    onConfirm(Array.from(selectedPersons), regenerateExisting);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col border border-slate-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-gray-700 bg-gradient-to-r from-slate-50 to-white dark:from-gray-800 dark:to-gray-900">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-gray-100">
              Genera/Rigenera Attestati
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-full transition-colors text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* Info Schedule */}
          {scheduleTitle && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-md">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                <strong>Corso:</strong> {scheduleTitle}
              </p>
            </div>
          )}

          {/* Statistiche */}
          <div className="mb-6 grid grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 dark:bg-gray-800 rounded-lg border border-slate-200 dark:border-gray-700">
              <p className="text-xs text-slate-600 dark:text-gray-400 mb-1">Totale Partecipanti</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-gray-100">{persons.length}</p>
            </div>
            <div className="p-4 bg-green-50 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-xs text-green-700 dark:text-green-400 mb-1">Senza Attestato</p>
              <p className="text-2xl font-bold text-green-700 dark:text-green-400">{personsWithoutAttestati.length}</p>
            </div>
            <div className="p-4 bg-amber-50 dark:bg-amber-900/30 rounded-lg border border-amber-200 dark:border-amber-800">
              <p className="text-xs text-amber-700 dark:text-amber-400 mb-1">Con Attestato</p>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{personsWithExistingAttestati.length}</p>
            </div>
          </div>

          {/* Warning esistenti */}
          {personsWithExistingAttestati.length > 0 && (
            <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-md">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-900 dark:text-amber-300 mb-1">
                    Attestati già esistenti
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    {personsWithExistingAttestati.length} partecipanti hanno già un attestato.
                    Puoi scegliere di rigenerarli (gli attestati vecchi verranno eliminati).
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Opzione rigenera esistenti */}
          {personsWithExistingAttestati.length > 0 && (
            <div className="mb-4">
              <label className="flex items-center gap-3 p-3 border border-slate-200 dark:border-gray-700 rounded-md hover:bg-slate-50 dark:hover:bg-gray-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={regenerateExisting}
                  onChange={(e) => setRegenerateExisting(e.target.checked)}
                  className="h-4 w-4 text-blue-600 rounded border-slate-300 dark:border-gray-600 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <span className="text-sm font-medium text-slate-900 dark:text-gray-100">
                    Rigenera attestati esistenti
                  </span>
                  <p className="text-xs text-slate-600 dark:text-gray-400 mt-0.5">
                    Gli attestati vecchi verranno eliminati e ricreati
                  </p>
                </div>
              </label>
            </div>
          )}

          {/* Select All */}
          <div className="mb-3">
            <label className="flex items-center gap-3 p-3 bg-slate-100 dark:bg-gray-800 border border-slate-300 dark:border-gray-600 rounded-md cursor-pointer">
              <input
                type="checkbox"
                checked={selectAll}
                onChange={handleSelectAll}
                className="h-4 w-4 text-blue-600 rounded border-slate-300 dark:border-gray-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-slate-900 dark:text-gray-100">
                Seleziona tutti ({persons.length})
              </span>
            </label>
          </div>

          {/* Lista Partecipanti */}
          <div className="space-y-2 max-h-64 overflow-y-auto border border-slate-200 dark:border-gray-700 rounded-md p-3">
            {/* Senza attestati */}
            {personsWithoutAttestati.length > 0 && (
              <>
                <div className="text-xs font-medium text-slate-600 dark:text-gray-400 mb-2 sticky top-0 bg-white dark:bg-gray-900 py-1">
                  Senza Attestato ({personsWithoutAttestati.length})
                </div>
                {personsWithoutAttestati.map((person) => (
                  <label
                    key={person.id}
                    className="flex items-center gap-3 p-2 hover:bg-green-50 dark:hover:bg-green-900/30 rounded cursor-pointer border border-transparent hover:border-green-200 dark:hover:border-green-700"
                  >
                    <input
                      type="checkbox"
                      checked={selectedPersons.has(person.id)}
                      onChange={() => handleTogglePerson(person.id)}
                      className="h-4 w-4 text-blue-600 rounded border-slate-300 dark:border-gray-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-slate-900 dark:text-gray-200 flex-1">
                      {person.firstName} {person.lastName}
                    </span>
                    <span className="text-xs text-green-600 dark:text-green-400 font-medium">Nuovo</span>
                  </label>
                ))}
              </>
            )}

            {/* Con attestati */}
            {personsWithExistingAttestati.length > 0 && (
              <>
                <div className="text-xs font-medium text-slate-600 dark:text-gray-400 mb-2 mt-4 sticky top-0 bg-white dark:bg-gray-900 py-1">
                  Con Attestato Esistente ({personsWithExistingAttestati.length})
                </div>
                {personsWithExistingAttestati.map((person) => (
                  <label
                    key={person.id}
                    className={`flex items-center gap-3 p-2 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded cursor-pointer border border-transparent hover:border-amber-200 dark:hover:border-amber-700 ${!regenerateExisting ? 'opacity-50' : ''
                      }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedPersons.has(person.id)}
                      onChange={() => handleTogglePerson(person.id)}
                      disabled={!regenerateExisting}
                      className="h-4 w-4 text-blue-600 rounded border-slate-300 dark:border-gray-600 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <span className="text-sm text-slate-900 dark:text-gray-200 flex-1">
                      {person.firstName} {person.lastName}
                    </span>
                    <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">Esistente</span>
                  </label>
                ))}
              </>
            )}
          </div>

          {/* Info selezionati */}
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-md">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              <strong>{selectedPersons.size}</strong> partecipanti selezionati
              {regenerateExisting && personsWithExistingAttestati.length > 0 && (
                <> (inclusi <strong>{Array.from(selectedPersons).filter(id => personsWithAttestati.has(id)).length}</strong> da rigenerare)</>
              )}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800">
          <Button
            variant="outline"
            onClick={onClose}
            className="rounded-full"
          >
            Annulla
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={selectedPersons.size === 0}
            className="rounded-full"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Genera {selectedPersons.size > 0 ? `(${selectedPersons.size})` : ''} Attestati
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RegenerateAttestatiModal;
