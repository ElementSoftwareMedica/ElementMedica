import React from 'react';
import { Label } from '../../../../design-system/atoms/Label';
import { Input } from '../../../../design-system/atoms/Input';
import { Select } from '../../../../design-system/atoms/Select';
import type { Training } from '../../types';

interface StepCourseDetailsSimpleProps {
  formData: {
    training_id: string | number;
    trainer_id: string | number;
    co_trainer_id: string | number;
    location: string;
    max_participants: number;
    notes: string;
    delivery_mode: string;
    risk_level: string;
    course_type: string;
    dates: Array<{
      date: string;
      start: string;
      end: string;
      trainerId: string | number;
      coTrainerId: string | number;
    }>;
  };
  trainings: Training[];
  trainers: any[];
  selectedCourse?: Training;
  courseSearch: string;
  onFormDataChange: (field: string, value: unknown) => void;
  onCourseSearchChange: (search: string) => void;
  totalSelectedHours: number;
  courseDuration: number;
  hoursLeft: number;
}

export const StepCourseDetailsSimple: React.FC<StepCourseDetailsSimpleProps> = ({
  formData,
  trainings,
  trainers,
  selectedCourse,
  courseSearch,
  onFormDataChange,
  onCourseSearchChange,
  totalSelectedHours,
  courseDuration,
  hoursLeft
}) => {
  const filteredTrainings = trainings.filter(training => 
    training.name?.toLowerCase().includes(courseSearch.toLowerCase()) ||
    training.description?.toLowerCase().includes(courseSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Ricerca Corso */}
        <div className="md:col-span-2">
          <Label htmlFor="courseSearch">Cerca Corso</Label>
          <Input
            id="courseSearch"
            type="text"
            value={courseSearch}
            onChange={(e) => onCourseSearchChange(e.target.value)}
            placeholder="Cerca per nome o descrizione..."
          />
        </div>

        {/* Selezione Corso */}
        <div className="md:col-span-2">
          <Label htmlFor="training_id">Corso *</Label>
          <Select
            id="training_id"
            value={formData.training_id}
            onChange={(value) => onFormDataChange('training_id', value)}
            required
          >
            <option value="">Seleziona un corso...</option>
            {filteredTrainings.map((training) => (
              <option key={training.id} value={training.id}>
                {training.name} {training.duration ? `(${training.duration}h)` : ''}
              </option>
            ))}
          </Select>
        </div>

        {/* Trainer Principale */}
        <div>
          <Label htmlFor="trainer_id">Trainer Principale *</Label>
          <Select
            id="trainer_id"
            value={formData.trainer_id}
            onChange={(value) => onFormDataChange('trainer_id', value)}
            required
          >
            <option value="">Seleziona trainer...</option>
            {trainers.map((trainer) => (
              <option key={trainer.id} value={trainer.id}>
                {trainer.name} {trainer.surname}
              </option>
            ))}
          </Select>
        </div>

        {/* Co-Trainer */}
        <div>
          <Label htmlFor="co_trainer_id">Co-Trainer</Label>
          <Select
            id="co_trainer_id"
            value={formData.co_trainer_id}
            onChange={(value) => onFormDataChange('co_trainer_id', value)}
          >
            <option value="">Nessun co-trainer</option>
            {trainers.map((trainer) => (
              <option key={trainer.id} value={trainer.id}>
                {trainer.name} {trainer.surname}
              </option>
            ))}
          </Select>
        </div>

        {/* Location */}
        <div>
          <Label htmlFor="location">Luogo *</Label>
          <Input
            id="location"
            type="text"
            value={formData.location}
            onChange={(e) => onFormDataChange('location', e.target.value)}
            placeholder="Inserisci il luogo del corso"
            required
          />
        </div>

        {/* Max Participants */}
        <div>
          <Label htmlFor="max_participants">Max Partecipanti</Label>
          <Input
            id="max_participants"
            type="number"
            value={formData.max_participants}
            onChange={(e) => onFormDataChange('max_participants', parseInt(e.target.value) || 0)}
            min="1"
            max="100"
          />
        </div>
      </div>

      {/* Informazioni Corso Selezionato */}
      {selectedCourse && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">{selectedCourse.name}</h4>
          {selectedCourse.description && (
            <p className="text-blue-700 text-sm mb-2">{selectedCourse.description}</p>
          )}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-medium text-blue-900">Durata:</span>
              <span className="ml-1 text-blue-700">{courseDuration}h</span>
            </div>
            <div>
              <span className="font-medium text-blue-900">Ore Selezionate:</span>
              <span className="ml-1 text-blue-700">{totalSelectedHours}h</span>
            </div>
            <div>
              <span className="font-medium text-blue-900">Ore Rimanenti:</span>
              <span className={`ml-1 ${hoursLeft > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                {hoursLeft}h
              </span>
            </div>
            <div>
              <span className="font-medium text-blue-900">Stato:</span>
              <span className={`ml-1 ${hoursLeft === 0 ? 'text-green-600' : 'text-orange-600'}`}>
                {hoursLeft === 0 ? 'Completo' : 'Incompleto'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Note */}
      <div>
        <Label htmlFor="notes">Note</Label>
        <textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => onFormDataChange('notes', e.target.value)}
          placeholder="Note aggiuntive..."
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
    </div>
  );
};

export default StepCourseDetailsSimple;