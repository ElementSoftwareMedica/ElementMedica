import React, { useCallback } from 'react';
import { Button } from '../../../design-system/atoms/Button';
import { Input } from '../../../design-system/atoms/Input';
import { Label } from '../../../design-system/atoms/Label';
import DatePicker from 'react-datepicker';
import { it } from 'date-fns/locale';
import Select from 'react-select';

interface DateEntry {
  date: string;
  start: string;
  end: string;
  trainerId: string | number;
  coTrainerId: string | number;
}

interface Trainer {
  id: string | number;
  firstName: string;
  lastName: string;
  certifications?: string[];
}

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
    const trainer = trainers.find(t => t.id === trainerId);
    return trainer ? `${trainer.firstName} ${trainer.lastName}` : '';
  }, [trainers]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-gray-700">Date e Orari</h3>
        <Button type="button" onClick={onAddDateTime} variant="secondary" size="sm">
          + Aggiungi Data
        </Button>
      </div>

      {/* Hours Summary */}
      <div className="bg-blue-50 p-3 rounded border">
        <div className="text-sm">
          <span className="font-medium">Ore selezionate:</span> {totalSelectedHours}h
          {courseDuration > 0 && (
            <>
              <span className="mx-2">|</span>
              <span className="font-medium">Durata corso:</span> {courseDuration}h
              <span className="mx-2">|</span>
              <span className={`font-medium ${hoursLeft === 0 ? 'text-green-600' : 'text-orange-600'}`}>
                Ore rimanenti: {hoursLeft}h
              </span>
            </>
          )}
        </div>
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
                selected={new Date(dateEntry.date)}
                onChange={(date) => {
                  if (date) {
                    onUpdateDateTime(idx, 'date', date.toISOString().split('T')[0]);
                  }
                }}
                dateFormat="dd/MM/yyyy"
                locale={it}
                className="w-full p-2 border rounded"
                placeholderText="Seleziona data"
              />
            </div>

            {/* Time Range */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Ora Inizio</Label>
                <Input
                  type="time"
                  value={dateEntry.start}
                  onChange={(e) => onUpdateDateTime(idx, 'start', e.target.value)}
                />
              </div>
              <div>
                <Label>Ora Fine</Label>
                <Input
                  type="time"
                  value={dateEntry.end}
                  onChange={(e) => onUpdateDateTime(idx, 'end', e.target.value)}
                />
              </div>
            </div>

            {/* Main Trainer */}
            <div>
              <Label>Formatore Principale</Label>
              <Select
                value={filteredTrainers.find(t => t.id === dateEntry.trainerId) ? {
                  value: dateEntry.trainerId,
                  label: getTrainerName(dateEntry.trainerId)
                } : null}
                onChange={(option) => {
                  onUpdateDateTime(idx, 'trainerId', option ? String(option.value) : '');
                }}
                options={filteredTrainers.map(t => ({
                  value: t.id,
                  label: `${t.firstName} ${t.lastName}`
                }))}
                placeholder="Seleziona formatore"
                isClearable
              />
            </div>

            {/* Co-Trainer */}
            <div>
              <Label>Co-Formatore (Opzionale)</Label>
              <Select
                value={coTrainerOptions.find(t => t.id === dateEntry.coTrainerId) ? {
                  value: dateEntry.coTrainerId,
                  label: getTrainerName(dateEntry.coTrainerId)
                } : null}
                onChange={(option) => {
                  onUpdateDateTime(idx, 'coTrainerId', option ? String(option.value) : '');
                }}
                options={coTrainerOptions.map(t => ({
                  value: t.id,
                  label: `${t.firstName} ${t.lastName}`
                }))}
                placeholder="Seleziona co-formatore"
                isClearable
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default DateTimeManager;