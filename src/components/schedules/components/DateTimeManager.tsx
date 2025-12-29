import React, { useCallback } from 'react';
import { Button } from '../../../design-system/atoms/Button';
import { Input } from '../../../design-system/atoms/Input';
import { Label } from '../../../design-system/atoms/Label';
import DatePicker, { registerLocale } from 'react-datepicker';
import { it } from 'date-fns/locale';
import Select from 'react-select';
import { Clock, AlertCircle, CheckCircle, Calendar } from 'lucide-react';

registerLocale('it', it);

// Usa tipi condivisi dal dominio schedules
// In alternativa, allinea le interfacce locali ai tipi condivisi
type DateEntry = import('../types').ScheduleDateEntry;
type Trainer = import('../types').Trainer;

type OptionType = { value: string | number; label: string };

interface DateTimeManagerProps {
  dates: DateEntry[];
  trainers: Trainer[];
  filteredTrainers: Trainer[];
  coTrainerOptions: Trainer[];
  onUpdateDateTime: (idx: number, field: 'date' | 'start' | 'end' | 'trainerId' | 'coTrainerId', value: string) => void;
  onAddDateTime: () => void;
  onRemoveDateTime: (idx: number) => void;
  formatDate: (isoDate: string) => string;
  totalSelectedHours: number;
  courseDuration: number;
  hoursLeft: number;
}

export const DateTimeManager: React.FC<DateTimeManagerProps> = ({
  dates,
  trainers,
  filteredTrainers,
  coTrainerOptions,
  onUpdateDateTime,
  onAddDateTime,
  onRemoveDateTime,
  totalSelectedHours,
  courseDuration,
  hoursLeft
}) => {
  const getTrainerName = useCallback((trainerId: string | number) => {
    const trainer = trainers.find(t => String(t.id) === String(trainerId));
    return trainer ? `${trainer.firstName} ${trainer.lastName}` : '';
  }, [trainers]);

  // Calcola suggerimenti per completare la programmazione
  const getSuggestions = useCallback(() => {
    if (courseDuration <= 0) return null;

    const remainingHours = hoursLeft;
    if (remainingHours <= 0) return null;

    // Suggerisci sessioni aggiuntive
    const suggestedSessions = [];
    let remaining = remainingHours;

    // Sessioni da 8 ore (giornata intera)
    const fullDays = Math.floor(remaining / 8);
    if (fullDays > 0) {
      suggestedSessions.push(`${fullDays} giornata${fullDays > 1 ? 'e' : ''} intera (8h)`);
      remaining -= fullDays * 8;
    }

    // Sessioni da 4 ore (mezza giornata)
    const halfDays = Math.floor(remaining / 4);
    if (halfDays > 0) {
      suggestedSessions.push(`${halfDays} mezza giornata (4h)`);
      remaining -= halfDays * 4;
    }

    // Ore rimanenti
    if (remaining > 0) {
      suggestedSessions.push(`${remaining}h aggiuntive`);
    }

    return suggestedSessions;
  }, [courseDuration, hoursLeft]);

  const selectStyles = {
    control: (base: any) => ({
      ...base,
      borderRadius: 9999,
      minHeight: 40
    }),
    valueContainer: (base: any) => ({ ...base, paddingLeft: 14, paddingRight: 14 }),
    indicatorsContainer: (base: any) => ({ ...base, paddingRight: 8 })
  } as const;

  const menuPortalTarget = typeof window !== 'undefined' ? document.body : undefined;
  const suggestions = getSuggestions();

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-gray-700 flex items-center">
          <Calendar className="w-5 h-5 mr-2" />
          Date e Orari
        </h3>
        <Button type="button" onClick={onAddDateTime} variant="secondary" size="sm">
          + Aggiungi Data
        </Button>
      </div>

      {dates.map((dateEntry, idx) => (
        <div key={idx} className="border rounded p-4 bg-gray-50">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-medium">Sessione {idx + 1}</h4>
            {dates.length > 1 && (
              <Button
                type="button"
                onClick={() => onRemoveDateTime(idx)}
                variant="destructive"
                size="sm"
              >
                Rimuovi
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Date */}
            <div>
              <Label>Data</Label>
              <DatePicker
                selected={dateEntry.date ? new Date(dateEntry.date) : null}
                onChange={(date) => {
                  if (date) {
                    onUpdateDateTime(idx, 'date', date.toISOString().split('T')[0]);
                  }
                }}
                dateFormat="eee dd MMM yyyy"
                locale="it"
                placeholderText="Seleziona data"
                className="w-full border rounded-full px-4 py-2"
                calendarClassName="shadow-lg border border-gray-200 rounded-lg"
                wrapperClassName="w-full"
                popperClassName="z-50"
                popperPlacement="bottom-start"
              />
            </div>

            {/* Time Range */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Inizio</Label>
                <Input
                  type="time"
                  step="900"
                  value={dateEntry.start || ''}
                  onChange={(e) => onUpdateDateTime(idx, 'start', e.target.value)}
                  placeholder="09:00"
                  className="text-base"
                />
              </div>
              <div>
                <Label>Fine</Label>
                <Input
                  type="time"
                  step="900"
                  value={dateEntry.end || ''}
                  onChange={(e) => onUpdateDateTime(idx, 'end', e.target.value)}
                  placeholder="18:00"
                  className="text-base"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {/* Trainer */}
            <div>
              <Label>Formatore</Label>
              <Select
                value={
                  dateEntry.trainerId
                    ? { value: dateEntry.trainerId, label: getTrainerName(dateEntry.trainerId) }
                    : null
                }
                onChange={(option) => onUpdateDateTime(idx, 'trainerId', option?.value?.toString() || '')}
                options={filteredTrainers.map(t => ({ value: t.id, label: `${t.firstName} ${t.lastName}` }))}
                placeholder="Seleziona formatore"
                isClearable
                classNamePrefix="react-select"
                styles={{
                  ...selectStyles,
                  menuPortal: (base: any) => ({ ...base, zIndex: 9999 })
                }}
                menuPortalTarget={menuPortalTarget}
              />
              {filteredTrainers.length === 0 && (
                <div className="text-xs text-orange-600 mt-1 flex items-center">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Nessun formatore qualificato disponibile.
                </div>
              )}
            </div>

            {/* Co-Trainer */}
            <div>
              <Label>Co-Formatore (opzionale)</Label>
              <Select
                value={
                  dateEntry.coTrainerId
                    ? { value: dateEntry.coTrainerId, label: getTrainerName(dateEntry.coTrainerId) }
                    : null
                }
                onChange={(option) => onUpdateDateTime(idx, 'coTrainerId', option?.value?.toString() || '')}
                options={coTrainerOptions.map(t => ({ value: t.id, label: `${t.firstName} ${t.lastName}` }))}
                placeholder="Seleziona co-formatore"
                isClearable
                classNamePrefix="react-select"
                styles={{
                  ...selectStyles,
                  menuPortal: (base: any) => ({ ...base, zIndex: 9999 })
                }}
                menuPortalTarget={menuPortalTarget}
              />
              {coTrainerOptions.length === 0 && (
                <div className="text-xs text-gray-500 mt-1">
                  Nessun co-formatore disponibile.
                </div>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Enhanced Hours Summary */}
      <div className={`p-4 rounded-lg border-2 ${hoursLeft === 0 ? 'bg-green-50 border-green-200' :
          hoursLeft > 0 ? 'bg-orange-50 border-orange-200' :
            'bg-red-50 border-red-200'
        }`}>
        <div className="flex items-center mb-2">
          <Clock className="w-5 h-5 mr-2" />
          <h4 className="font-semibold">Riepilogo Ore Corso</h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center">
            <span className="font-medium">Ore programmate:</span>
            <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
              {totalSelectedHours}h
            </span>
          </div>

          {courseDuration > 0 && (
            <>
              <div className="flex items-center">
                <span className="font-medium">Durata corso:</span>
                <span className="ml-2 px-2 py-1 bg-gray-100 text-gray-800 rounded-full">
                  {courseDuration}h
                </span>
              </div>

              <div className="flex items-center">
                <span className="font-medium">Ore rimanenti:</span>
                <span className={`ml-2 px-2 py-1 rounded-full flex items-center ${hoursLeft === 0 ? 'bg-green-100 text-green-800' :
                    hoursLeft > 0 ? 'bg-orange-100 text-orange-800' :
                      'bg-red-100 text-red-800'
                  }`}>
                  {hoursLeft === 0 ? (
                    <CheckCircle className="w-3 h-3 mr-1" />
                  ) : (
                    <AlertCircle className="w-3 h-3 mr-1" />
                  )}
                  {hoursLeft}h
                </span>
              </div>
            </>
          )}
        </div>

        {/* Status Messages and Suggestions */}
        {courseDuration > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            {hoursLeft === 0 ? (
              <div className="flex items-center text-green-700 text-sm">
                <CheckCircle className="w-4 h-4 mr-2" />
                <span className="font-medium">Perfetto! Le ore programmate corrispondono alla durata del corso.</span>
              </div>
            ) : hoursLeft > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center text-orange-700 text-sm">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  <span className="font-medium">Mancano ancora {hoursLeft} ore da programmare.</span>
                </div>
                {suggestions && suggestions.length > 0 && (
                  <div className="text-xs text-orange-600">
                    <span className="font-medium">Suggerimento:</span> Aggiungi {suggestions.join(' + ')}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center text-red-700 text-sm">
                <AlertCircle className="w-4 h-4 mr-2" />
                <span className="font-medium">
                  Attenzione: hai programmato {Math.abs(hoursLeft)} ore in più rispetto alla durata del corso.
                </span>
              </div>
            )}
          </div>
        )}

        {courseDuration <= 0 && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="flex items-center text-gray-600 text-sm">
              <AlertCircle className="w-4 h-4 mr-2" />
              <span>Seleziona un corso per vedere il calcolo delle ore rimanenti.</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DateTimeManager;