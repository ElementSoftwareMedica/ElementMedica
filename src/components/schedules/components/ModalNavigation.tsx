import React from 'react';
import { Button } from '../../../design-system/atoms/Button';

interface ModalNavigationProps {
  currentStep: number;
  totalSteps: number;
  onPrevious: () => void;
  onNext: () => void;
  onClose: () => void;
  onSave: () => void;
  isLoading: boolean;
  canProceed: boolean;
  isLastStep: boolean;
  stepTitles: string[];
}

export const ModalNavigation: React.FC<ModalNavigationProps> = ({
  currentStep,
  totalSteps,
  onPrevious,
  onNext,
  onClose,
  onSave,
  isLoading,
  canProceed,
  isLastStep,
  stepTitles
}) => {
  return (
    <div className="space-y-4">
      {/* Step Indicator */}
      <div className="flex items-center justify-center space-x-2">
        {Array.from({ length: totalSteps }, (_, i) => (
          <React.Fragment key={i}>
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                i < currentStep
                  ? 'bg-green-500 text-white'
                  : i === currentStep
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}
            >
              {i < currentStep ? '✓' : i + 1}
            </div>
            {i < totalSteps - 1 && (
              <div
                className={`w-12 h-1 ${
                  i < currentStep ? 'bg-green-500' : 'bg-gray-200'
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step Title */}
      <div className="text-center">
        <h2 className="text-lg font-semibold text-gray-800">
          {stepTitles[currentStep]}
        </h2>
        <p className="text-sm text-gray-600">
          Passo {currentStep + 1} di {totalSteps}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
        />
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center pt-4 border-t">
        <div className="flex space-x-2">
          <Button
            type="button"
            onClick={onClose}
            variant="outline"
            disabled={isLoading}
          >
            Annulla
          </Button>
          
          {currentStep > 0 && (
            <Button
              type="button"
              onClick={onPrevious}
              variant="outline"
              disabled={isLoading}
            >
              ← Indietro
            </Button>
          )}
        </div>

        <div className="flex space-x-2">
          {!isLastStep ? (
            <Button
              type="button"
              onClick={onNext}
              disabled={!canProceed || isLoading}
              className="bg-blue-500 text-white hover:bg-blue-600 disabled:bg-gray-300"
            >
              Avanti →
            </Button>
          ) : (
            <Button
              type="button"
              onClick={onSave}
              disabled={!canProceed || isLoading}
              className="bg-green-500 text-white hover:bg-green-600 disabled:bg-gray-300"
            >
              {isLoading ? 'Salvataggio...' : 'Salva Evento'}
            </Button>
          )}
        </div>
      </div>

      {/* Step Validation Messages */}
      {!canProceed && (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
          <div className="text-sm text-yellow-800">
            {currentStep === 0 && 'Completa i dettagli del corso per continuare'}
            {currentStep === 1 && 'Seleziona almeno una data e un formatore per continuare'}
            {currentStep === 2 && 'Seleziona almeno un partecipante per continuare'}
            {currentStep === 3 && 'Verifica i dati prima di salvare'}
          </div>
        </div>
      )}

      {/* Loading Indicator */}
      {isLoading && (
        <div className="flex items-center justify-center space-x-2 text-blue-600">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="text-sm">Elaborazione in corso...</span>
        </div>
      )}
    </div>
  );
};

export default ModalNavigation;