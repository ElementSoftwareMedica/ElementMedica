import { useCallback } from 'react';

interface UseNavigationHandlersParams {
  currentStep: number;
  setCurrentStep: (step: number) => void;
  addVisitedStep?: (step: number) => void; // Optional: mark step as visited
  validateCurrentStep: () => { isValid: boolean; errors: Array<{ field?: string; message: string }> };
  setError: (error: string | null) => void;
}

export function useNavigationHandlers({
  currentStep,
  setCurrentStep,
  addVisitedStep,
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
    const nextStep = currentStep + 1;
    setCurrentStep(nextStep);
    addVisitedStep?.(nextStep); // Mark next step as visited
  }, [currentStep, validateCurrentStep, setCurrentStep, setError, addVisitedStep]);

  const handleBack = useCallback(() => {
    setError(null);
    const prevStep = currentStep - 1;
    setCurrentStep(prevStep);
    // No need to mark as visited since we're going back
  }, [currentStep, setCurrentStep, setError]);

  return { handleNext, handleBack } as const;
}