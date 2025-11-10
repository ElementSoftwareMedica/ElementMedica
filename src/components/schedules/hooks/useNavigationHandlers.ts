import { useCallback } from 'react';

interface UseNavigationHandlersParams {
  currentStep: number;
  setCurrentStep: (step: number) => void;
  validateCurrentStep: () => { isValid: boolean; errors: Array<{ field?: string; message: string }> };
  setError: (error: string | null) => void;
}

export function useNavigationHandlers({
  currentStep,
  setCurrentStep,
  validateCurrentStep,
  setError
}: UseNavigationHandlersParams) {
  const handleNext = useCallback(() => {
    if (currentStep === 0) {
      const validation = validateCurrentStep();
      if (!validation.isValid) {
        const errorMessage = validation.errors.length > 0
          ? validation.errors[0].message
          : 'Errore di validazione';
        setError(errorMessage);
        return;
      }
      setError(null);
    }
    setCurrentStep(currentStep + 1);
  }, [currentStep, validateCurrentStep, setCurrentStep, setError]);

  const handleBack = useCallback(() => {
    setError(null);
    setCurrentStep(currentStep - 1);
  }, [currentStep, setCurrentStep, setError]);

  return { handleNext, handleBack } as const;
}