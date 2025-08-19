import React from 'react';
import { Button } from '../../../design-system/atoms/Button';

interface Person {
  id: string | number;
  firstName: string;
  lastName: string;
  companyId: string | number;
  company_id?: string | number;
  company?: { id: string | number; name: string };
  email?: string;
}

interface DateEntry {
  date: string;
  start: string;
  end: string;
  trainerId: string | number;
  coTrainerId: string | number;
}

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
  onSelectedDayChange
}) => {
  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-gray-700">Registrazione Presenze</h3>
      
      {/* Date Selector */}
      <div className="flex flex-wrap gap-2">
        {dates.map((dateEntry, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onSelectedDayChange(idx)}
            className={`px-3 py-2 text-sm rounded border ${
              selectedDayIdx === idx
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {formatDate(dateEntry.date)}
            <div className="text-xs">
              {dateEntry.start} - {dateEntry.end}
            </div>
          </button>
        ))}
      </div>

      {/* Attendance for Selected Date */}
      {dates[selectedDayIdx] && (
        <div className="border rounded p-4">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-medium">
              Presenze per {formatDate(dates[selectedDayIdx].date)}
            </h4>
            <div className="space-x-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => onSelectAllForDate(selectedDayIdx)}
              >
                Tutti Presenti
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => onSelectNoneForDate(selectedDayIdx)}
              >
                Nessuno
              </Button>
            </div>
          </div>
          
          <div className="max-h-80 overflow-y-auto border rounded">
            {selectedPersons.length > 0 ? (
              persons
                .filter((person: Person) => selectedPersons.includes(person.id))
                .map((person: Person) => (
                  <div key={`${selectedDayIdx}-${person.id}`} className="flex items-center p-3 hover:bg-gray-50 border-b last:border-b-0">
                    <input
                      type="checkbox"
                      id={`attendance-${selectedDayIdx}-${person.id}`}
                      checked={(attendance[selectedDayIdx] || []).includes(person.id)}
                      onChange={(e) => onAttendanceChange(selectedDayIdx, person.id, e.target.checked)}
                      className="mr-3 w-4 h-4 accent-blue-600"
                    />
                    <div className="flex-1">
                      <div className="font-medium">
                        {person.firstName} {person.lastName}
                      </div>
                      <div className="text-sm text-gray-500">
                        {getCompanyName(person.company_id || person.companyId)}
                      </div>
                      {person.email && (
                        <div className="text-xs text-gray-400">{person.email}</div>
                      )}
                    </div>
                  </div>
                ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                Nessun partecipante selezionato
              </div>
            )}
          </div>
          
          {/* Attendance Summary */}
          <div className="mt-3 text-right text-sm text-gray-600">
            Presenti: <span className="font-medium">{(attendance[selectedDayIdx] || []).length}</span> / {selectedPersons.length}
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceManager;