import React from 'react';
import { Input } from '../../../design-system/atoms/Input';
import { Label } from '../../../design-system/atoms/Label';
import Select from 'react-select';

interface Training {
  id: string | number;
  title: string;
  certifications?: string[];
  duration?: string | number;
}

interface Trainer {
  id: string | number;
  firstName: string;
  lastName: string;
  certifications?: string[];
}

interface CourseDetailsFormProps {
  trainings: Training[];
  trainers: Trainer[];
  formData: {
    training_id: string | number;
    trainer_id: string | number;
    co_trainer_id: string | number;
    location: string;
    max_participants: number;
    notes: string;
    delivery_mode?: string;
  };
  onFormDataChange: (field: string, value: unknown) => void;
  selectedCourse: Training | undefined;
  filteredTrainers: Trainer[];
  coTrainerOptions: Trainer[];
  courseSearch: string;
  onCourseSearchChange: (search: string) => void;
  DELIVERY_MODES: Array<{ value: string; label: string }>;
}

export const CourseDetailsForm: React.FC<CourseDetailsFormProps> = ({
  trainings,
  trainers,
  formData,
  onFormDataChange,
  selectedCourse,
  filteredTrainers,
  coTrainerOptions,
  courseSearch,
  onCourseSearchChange,
  DELIVERY_MODES
}) => {
  const courseOptions = trainings.map((t: Training) => ({ 
    value: t.id, 
    label: t.title, 
    ...t 
  }));
  
  const selectedCourseOption = courseOptions.find(opt => opt.value === formData.training_id) || null;

  const getTrainerName = (trainerId: string | number) => {
    const trainer = trainers.find(t => t.id === trainerId);
    return trainer ? `${trainer.firstName} ${trainer.lastName}` : '';
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-gray-700">Dettagli del Corso</h3>
      
      {/* Course Selection */}
      <div>
        <Label>Corso *</Label>
        <div className="space-y-2">
          <Input
            type="text"
            placeholder="Cerca corso..."
            value={courseSearch}
            onChange={(e) => onCourseSearchChange(e.target.value)}
          />
          <Select
            value={selectedCourseOption}
            onChange={(option) => onFormDataChange('training_id', option ? option.value : '')}
            options={courseOptions.filter(opt => 
              courseSearch === '' || 
              opt.label.toLowerCase().includes(courseSearch.toLowerCase())
            )}
            placeholder="Seleziona un corso"
            isClearable
            isSearchable
          />
        </div>
        
        {selectedCourse && (
          <div className="mt-2 p-3 bg-blue-50 rounded border">
            <div className="text-sm">
              <div className="font-medium">{selectedCourse.title}</div>
              {selectedCourse.duration && (
                <div className="text-gray-600">Durata: {selectedCourse.duration} ore</div>
              )}
              {selectedCourse.certifications && selectedCourse.certifications.length > 0 && (
                <div className="text-gray-600">
                  Certificazioni richieste: {selectedCourse.certifications.join(', ')}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Location */}
      <div>
        <Label>Luogo *</Label>
        <Input
          type="text"
          placeholder="Inserisci il luogo del corso"
          value={formData.location}
          onChange={(e) => onFormDataChange('location', e.target.value)}
        />
      </div>

      {/* Delivery Mode */}
      <div>
        <Label>Modalità di Erogazione</Label>
        <Select
          value={DELIVERY_MODES.find(mode => mode.value === formData.delivery_mode) || null}
          onChange={(option) => onFormDataChange('delivery_mode', option ? option.value : '')}
          options={DELIVERY_MODES}
          placeholder="Seleziona modalità"
          isClearable
        />
      </div>

      {/* Max Participants */}
      <div>
        <Label>Numero Massimo Partecipanti</Label>
        <Input
          type="number"
          min="1"
          max="100"
          value={formData.max_participants}
          onChange={(e) => onFormDataChange('max_participants', parseInt(e.target.value) || 20)}
        />
      </div>

      {/* Notes */}
      <div>
        <Label>Note</Label>
        <textarea
          className="w-full p-2 border rounded resize-none"
          rows={3}
          placeholder="Note aggiuntive sul corso..."
          value={formData.notes}
          onChange={(e) => onFormDataChange('notes', e.target.value)}
        />
      </div>

      {/* Trainer Information */}
      {filteredTrainers.length > 0 && (
        <div className="bg-green-50 p-3 rounded border">
          <div className="text-sm">
            <div className="font-medium text-green-800 mb-1">
              Formatori qualificati disponibili: {filteredTrainers.length}
            </div>
            <div className="text-green-600 text-xs">
              {filteredTrainers.slice(0, 3).map(t => `${t.firstName} ${t.lastName}`).join(', ')}
              {filteredTrainers.length > 3 && ` e altri ${filteredTrainers.length - 3}`}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseDetailsForm;