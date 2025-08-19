import React from 'react';
import { Label } from '../../../design-system/atoms/Label';
import Select from 'react-select';

interface Trainer {
  id: string | number;
  firstName: string;
  lastName: string;
  certifications?: string[];
}

interface TrainerSelectorProps {
  trainers: Trainer[];
  filteredTrainers: Trainer[];
  coTrainerOptions: Trainer[];
  formData: {
    trainer_id: string | number;
    co_trainer_id: string | number;
  };
  onFormDataChange: (field: string, value: unknown) => void;
  selectedCourse?: {
    certifications?: string[];
  };
}

export const TrainerSelector: React.FC<TrainerSelectorProps> = ({
  trainers,
  filteredTrainers,
  coTrainerOptions,
  formData,
  onFormDataChange,
  selectedCourse
}) => {
  const getTrainerName = (trainerId: string | number) => {
    const trainer = trainers.find(t => t.id === trainerId);
    return trainer ? `${trainer.firstName} ${trainer.lastName}` : '';
  };

  const getTrainerCertifications = (trainerId: string | number) => {
    const trainer = trainers.find(t => t.id === trainerId);
    return trainer?.certifications || [];
  };

  const isTrainerQualified = (trainer: Trainer) => {
    if (!selectedCourse?.certifications || selectedCourse.certifications.length === 0) {
      return true;
    }
    
    const trainerCerts = trainer.certifications || [];
    return selectedCourse.certifications.some(cert => 
      trainerCerts.includes(cert)
    );
  };

  const selectedTrainer = trainers.find(t => t.id === formData.trainer_id);
  const selectedCoTrainer = trainers.find(t => t.id === formData.co_trainer_id);

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-gray-700">Formatori</h3>
      
      {/* Main Trainer */}
      <div>
        <Label>Formatore Principale *</Label>
        <Select
          value={selectedTrainer ? {
            value: selectedTrainer.id,
            label: `${selectedTrainer.firstName} ${selectedTrainer.lastName}`
          } : null}
          onChange={(option) => {
            onFormDataChange('trainer_id', option ? option.value : '');
          }}
          options={filteredTrainers.map(t => ({
            value: t.id,
            label: `${t.firstName} ${t.lastName}`,
            isDisabled: !isTrainerQualified(t)
          }))}
          placeholder="Seleziona formatore principale"
          isClearable
          isSearchable
          formatOptionLabel={(option: { value: string | number; label: string }) => (
            <div className="flex justify-between items-center">
              <span className={!isTrainerQualified(trainers.find(t => t.id === option.value)!) ? 'text-gray-400' : ''}>
                {option.label}
              </span>
              {!isTrainerQualified(trainers.find(t => t.id === option.value)!) && (
                <span className="text-xs text-red-500">Non qualificato</span>
              )}
            </div>
          )}
        />
        
        {selectedTrainer && (
          <div className="mt-2 p-3 bg-blue-50 rounded border">
            <div className="text-sm">
              <div className="font-medium">{selectedTrainer.firstName} {selectedTrainer.lastName}</div>
              {selectedTrainer.certifications && selectedTrainer.certifications.length > 0 && (
                <div className="text-gray-600">
                  Certificazioni: {selectedTrainer.certifications.join(', ')}
                </div>
              )}
              {selectedCourse?.certifications && (
                <div className={`text-xs mt-1 ${isTrainerQualified(selectedTrainer) ? 'text-green-600' : 'text-red-600'}`}>
                  {isTrainerQualified(selectedTrainer) 
                    ? '✓ Qualificato per questo corso' 
                    : '⚠ Non ha le certificazioni richieste'
                  }
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Co-Trainer */}
      <div>
        <Label>Co-Formatore (Opzionale)</Label>
        <Select
          value={selectedCoTrainer ? {
            value: selectedCoTrainer.id,
            label: `${selectedCoTrainer.firstName} ${selectedCoTrainer.lastName}`
          } : null}
          onChange={(option) => {
            onFormDataChange('co_trainer_id', option ? option.value : '');
          }}
          options={coTrainerOptions.map(t => ({
            value: t.id,
            label: `${t.firstName} ${t.lastName}`,
            isDisabled: !isTrainerQualified(t)
          }))}
          placeholder="Seleziona co-formatore"
          isClearable
          isSearchable
          formatOptionLabel={(option: { value: string | number; label: string }) => (
            <div className="flex justify-between items-center">
              <span className={!isTrainerQualified(trainers.find(t => t.id === option.value)!) ? 'text-gray-400' : ''}>
                {option.label}
              </span>
              {!isTrainerQualified(trainers.find(t => t.id === option.value)!) && (
                <span className="text-xs text-red-500">Non qualificato</span>
              )}
            </div>
          )}
        />
        
        {selectedCoTrainer && (
          <div className="mt-2 p-3 bg-green-50 rounded border">
            <div className="text-sm">
              <div className="font-medium">{selectedCoTrainer.firstName} {selectedCoTrainer.lastName}</div>
              {selectedCoTrainer.certifications && selectedCoTrainer.certifications.length > 0 && (
                <div className="text-gray-600">
                  Certificazioni: {selectedCoTrainer.certifications.join(', ')}
                </div>
              )}
              {selectedCourse?.certifications && (
                <div className={`text-xs mt-1 ${isTrainerQualified(selectedCoTrainer) ? 'text-green-600' : 'text-red-600'}`}>
                  {isTrainerQualified(selectedCoTrainer) 
                    ? '✓ Qualificato per questo corso' 
                    : '⚠ Non ha le certificazioni richieste'
                  }
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Trainer Requirements Info */}
      {selectedCourse?.certifications && selectedCourse.certifications.length > 0 && (
        <div className="bg-yellow-50 p-3 rounded border">
          <div className="text-sm">
            <div className="font-medium text-yellow-800 mb-1">
              Certificazioni richieste per questo corso:
            </div>
            <div className="text-yellow-700">
              {selectedCourse.certifications.join(', ')}
            </div>
          </div>
        </div>
      )}

      {/* Available Qualified Trainers Summary */}
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

export default TrainerSelector;