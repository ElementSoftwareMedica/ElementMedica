import React from 'react';
import { Button } from '../../../design-system/atoms/Button';
import { Label } from '../../../design-system/atoms/Label';
import Select from 'react-select';

// Tipi condivisi dal dominio schedules
type DateEntry = import('../types').ScheduleDateEntry;
type Person = import('../types').Person;
type Trainer = import('../types').Trainer;

// rimosso: interface Trainer { id: string; firstName: string; lastName: string; certifications?: string[] }
interface AttendanceManagerProps {
  dates: DateEntry[];
  selectedPersons: (string | number)[];
  persons: Person[];
  attendance: Record<number, (string | number)[]>;
  onAttendanceChange: (dateIdx: number, personId: string | number, isPresent: boolean) => void;
  onSelectAllForDate: (dateIdx: number) => void;
  onSelectNoneForDate: (dateIdx: number) => void;
  getCompanyName: (companyId: string | number) => string;
  formatDate: (isoDate: string) => string;
  selectedDayIdx: number;
  onSelectedDayChange: (idx: number) => void;
  // Nuove props per gestione docenti per sessione
  trainers: Trainer[];
  filteredTrainers: Trainer[];
  coTrainerOptions: Trainer[];
  onUpdateDateTime: (idx: number, field: 'date' | 'start' | 'end' | 'trainerId' | 'coTrainerId', value: string) => void;
}

export const AttendanceManager: React.FC<AttendanceManagerProps> = ({
  dates,
  selectedPersons,
  persons,
  attendance,
  onAttendanceChange,
  onSelectAllForDate,
  onSelectNoneForDate,
  getCompanyName,
  formatDate,
  selectedDayIdx,
  onSelectedDayChange,
  trainers,
  filteredTrainers,
  coTrainerOptions,
  onUpdateDateTime
}) => {
  const getTrainerName = React.useCallback((trainerId: string | number) => {
    const trainer = trainers.find(t => String(t.id) === String(trainerId));
    return trainer ? `${trainer.firstName} ${trainer.lastName}` : '';
  }, [trainers]);

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-gray-700 dark:text-gray-200">Registrazione Presenze per Sessione</h3>

      {/* Sessioni come Card Orizzontali con Scroll */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-6" style={{ minWidth: 'min-content' }}>
          {dates.map((dateEntry, idx) => (
            <div key={idx} className="flex-shrink-0 w-80 border-2 dark:border-gray-700 rounded-lg shadow-md bg-white dark:bg-gray-800 overflow-hidden">
              {/* Header Compatto con Data, Ora e Docenti */}
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-700 dark:to-blue-800 text-white p-2">
                <div className="text-center mb-2">
                  <h4 className="text-sm font-semibold">
                    Sessione {idx + 1} - {formatDate(dateEntry.date)}
                  </h4>
                  <p className="text-xs text-blue-100 dark:text-blue-200">
                    {dateEntry.start} - {dateEntry.end}
                  </p>
                </div>

                {/* Docenti (Read-only) */}
                <div className="bg-blue-600/50 dark:bg-blue-900/50 rounded px-2 py-1 text-xs space-y-1">
                  <div className="flex items-center gap-1">
                    <span className="text-blue-200">👨‍🏫</span>
                    <span className="font-medium">{getTrainerName(dateEntry.trainerId) || 'Non assegnato'}</span>
                  </div>
                  {dateEntry.coTrainerId && (
                    <div className="flex items-center gap-1">
                      <span className="text-blue-200">👥</span>
                      <span>{getTrainerName(dateEntry.coTrainerId)}</span>
                    </div>
                  )}
                </div>

                {/* Contatore Presenti */}
                <div className="mt-2 pt-2 border-t border-blue-400 dark:border-blue-600 text-center">
                  <div className="text-xs text-blue-100">Presenti</div>
                  <div className="text-lg font-bold">
                    {(attendance[idx] || []).length}/{selectedPersons.length}
                  </div>
                </div>
              </div>

              {/* Lista Partecipanti Scrollabile */}
              <div className="p-3">
                <div className="flex justify-between items-center mb-2">
                  <h5 className="font-medium text-xs text-gray-700 dark:text-gray-200">👥 Partecipanti</h5>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => onSelectAllForDate(idx)}
                      className="text-xs py-1 px-2"
                    >
                      Tutti
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => onSelectNoneForDate(idx)}
                      className="text-xs py-1 px-2"
                    >
                      Nessuno
                    </Button>
                  </div>
                </div>

                <div className="border dark:border-gray-700 rounded overflow-y-auto max-h-64">
                  {(() => {
                    const selectedPersonsStrings = selectedPersons.map(String);
                    const filteredPersons = persons.filter((person: Person) =>
                      selectedPersonsStrings.includes(String(person.id))
                    );

                    if (idx === 0) { // Debug solo per prima sessione
                    }

                    return filteredPersons.length > 0 ? (
                      filteredPersons
                        .sort((a: Person, b: Person) => {
                          // Ordina alfabeticamente per cognome, poi per nome
                          const lastNameCompare = (a.lastName || '').localeCompare(b.lastName || '', 'it-IT');
                          if (lastNameCompare !== 0) return lastNameCompare;
                          return (a.firstName || '').localeCompare(b.firstName || '', 'it-IT');
                        })
                        .map((person: Person) => (
                          <div key={`${idx}-${person.id}`} className="flex items-center p-2 hover:bg-gray-50 dark:hover:bg-gray-700 border-b dark:border-gray-700 last:border-b-0">
                            <input
                              type="checkbox"
                              id={`attendance-${idx}-${person.id}`}
                              checked={(attendance[idx] || []).map(String).includes(String(person.id))}
                              onChange={(e) => onAttendanceChange(idx, person.id, e.target.checked)}
                              className="mr-2 w-3 h-3 accent-blue-600"
                            />
                            <div className="flex-1">
                              <div className="text-xs font-medium dark:text-gray-100">
                                {person.lastName} {person.firstName}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {person.companyId != null ? getCompanyName(person.companyId) : 'Senza azienda'}
                              </div>
                            </div>
                          </div>
                        ))
                    ) : (
                      <div className="text-center py-6 text-xs text-gray-500 dark:text-gray-400">
                        Nessun partecipante selezionato nello Step 2
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {dates.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400 border-2 border-dashed dark:border-gray-700 rounded-lg">
          Nessuna sessione programmata. Aggiungi date nello Step 1.
        </div>
      )}
    </div>
  );
};

export default AttendanceManager;