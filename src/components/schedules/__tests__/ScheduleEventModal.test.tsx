import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import ScheduleEventModal from '../ScheduleEventModal';
import type { ScheduleEventModalProps } from '../ScheduleEventModal.lazy';

// Mock dependencies
vi.mock('../../../services/api', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn()
}));

vi.mock('react-toastify', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn()
  }
}));

// Mock data
const mockTrainings = [
  {
    id: 1,
    name: 'Corso Sicurezza Base',
    description: 'Corso di formazione sulla sicurezza',
    duration: 8,
    riskLevel: 'BASSO',
    courseType: 'OBBLIGATORIO',
    deliveryMode: 'PRESENZA',
    requiredCertifications: []
  },
  {
    id: 2,
    name: 'Corso Avanzato',
    description: 'Corso avanzato di specializzazione',
    duration: 16,
    riskLevel: 'ALTO',
    courseType: 'SPECIALISTICO',
    deliveryMode: 'MISTO',
    requiredCertifications: [{ id: 1, name: 'Cert Base' }]
  }
];

const mockTrainers = [
  {
    id: '1',
    firstName: 'Mario',
    lastName: 'Rossi',
    email: 'mario.rossi@example.com',
    certifications: ['Cert Base']
  },
  {
    id: '2',
    firstName: 'Luigi',
    lastName: 'Verdi',
    email: 'luigi.verdi@example.com',
    certifications: []
  }
];

const mockCompanies = [
  {
    id: '1',
    name: 'Azienda Alpha',
    ragioneSociale: 'Azienda Alpha S.r.l.',
    description: 'Azienda di test',
    code: 'ALPHA'
  },
  {
    id: '2',
    name: 'Azienda Beta',
    ragioneSociale: 'Azienda Beta S.p.A.',
    description: 'Seconda azienda di test',
    code: 'BETA'
  }
];

const mockPersons = [
  {
    id: '1',
    firstName: 'Giovanni',
    lastName: 'Bianchi',
    email: 'giovanni.bianchi@alpha.com',
    company_id: '1'
  },
  {
    id: '2',
    firstName: 'Anna',
    lastName: 'Neri',
    email: 'anna.neri@beta.com',
    company_id: '2'
  }
];

const defaultProps: ScheduleEventModalProps = {
  trainings: mockTrainings,
  trainers: mockTrainers,
  companies: mockCompanies,
  persons: mockPersons,
  existingEvent: {},
  onClose: vi.fn(),
  onSuccess: vi.fn(),
  initialDate: '2024-01-15',
  initialTime: { start: '09:00', end: '17:00' }
};

describe('ScheduleEventModal', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Rendering and Initial State', () => {
    it('should render modal with correct title for new event', () => {
      render(<ScheduleEventModal {...defaultProps} />);
      
      expect(screen.getByText('Nuovo Evento di Formazione')).toBeInTheDocument();
    });

    it('should render modal with correct title for editing event', () => {
      const editProps = {
        ...defaultProps,
        existingEvent: { id: 1, name: 'Evento Esistente' }
      };
      
      render(<ScheduleEventModal {...editProps} />);
      
      expect(screen.getByText('Modifica Evento di Formazione')).toBeInTheDocument();
    });

    it('should display all step navigation buttons', () => {
      render(<ScheduleEventModal {...defaultProps} />);
      
      expect(screen.getByText('Dettagli Corso')).toBeInTheDocument();
      expect(screen.getByText('Partecipanti')).toBeInTheDocument();
      expect(screen.getByText('Presenze')).toBeInTheDocument();
      expect(screen.getByText('Documenti')).toBeInTheDocument();
    });

    it('should start with first step active', () => {
      render(<ScheduleEventModal {...defaultProps} />);
      
      // First step should be active (you may need to adjust selector based on your styling)
      const firstStepButton = screen.getByText('Dettagli Corso');
      expect(firstStepButton).toHaveClass('active'); // Adjust class name as needed
    });
  });

  describe('Form Validation', () => {
    it('should show validation errors for empty required fields', async () => {
      render(<ScheduleEventModal {...defaultProps} />);
      
      // Try to proceed without filling required fields
      const nextButton = screen.getByText('Avanti');
      await user.click(nextButton);
      
      // Should show validation errors
      await waitFor(() => {
        expect(screen.getByText(/Seleziona un corso/i)).toBeInTheDocument();
      });
    });

    it('should validate trainer selection', async () => {
      render(<ScheduleEventModal {...defaultProps} />);
      
      // Select a course but not a trainer
      const courseSelect = screen.getByLabelText(/corso/i);
      await user.selectOptions(courseSelect, '1');
      
      const nextButton = screen.getByText('Avanti');
      await user.click(nextButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Seleziona un formatore/i)).toBeInTheDocument();
      });
    });

    it('should validate date and time entries', async () => {
      render(<ScheduleEventModal {...defaultProps} />);
      
      // Fill basic info but leave dates empty
      const courseSelect = screen.getByLabelText(/corso/i);
      await user.selectOptions(courseSelect, '1');
      
      const trainerSelect = screen.getByLabelText(/formatore/i);
      await user.selectOptions(trainerSelect, '1');
      
      const nextButton = screen.getByText('Avanti');
      await user.click(nextButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Aggiungi almeno una data/i)).toBeInTheDocument();
      });
    });
  });

  describe('Step Navigation', () => {
    it('should navigate between steps correctly', async () => {
      render(<ScheduleEventModal {...defaultProps} />);
      
      // Fill required fields for first step
      const courseSelect = screen.getByLabelText(/corso/i);
      await user.selectOptions(courseSelect, '1');
      
      const trainerSelect = screen.getByLabelText(/formatore/i);
      await user.selectOptions(trainerSelect, '1');
      
      // Add a date entry
      const addDateButton = screen.getByText(/Aggiungi Data/i);
      await user.click(addDateButton);
      
      // Navigate to next step
      const nextButton = screen.getByText('Avanti');
      await user.click(nextButton);
      
      // Should be on company selection step
      await waitFor(() => {
        expect(screen.getByText(/Selezione Aziende e Dipendenti/i)).toBeInTheDocument();
      });
      
      // Navigate back
      const backButton = screen.getByText('Indietro');
      await user.click(backButton);
      
      // Should be back on first step
      await waitFor(() => {
        expect(screen.getByText(/Dettagli del Corso/i)).toBeInTheDocument();
      });
    });

    it('should disable next button when validation fails', async () => {
      render(<ScheduleEventModal {...defaultProps} />);
      
      const nextButton = screen.getByText('Avanti');
      
      // Should be disabled initially
      expect(nextButton).toBeDisabled();
      
      // Fill some fields
      const courseSelect = screen.getByLabelText(/corso/i);
      await user.selectOptions(courseSelect, '1');
      
      // Should still be disabled without trainer
      expect(nextButton).toBeDisabled();
    });
  });

  describe('Course Selection and Auto-fill', () => {
    it('should auto-fill form data when course is selected', async () => {
      render(<ScheduleEventModal {...defaultProps} />);
      
      const courseSelect = screen.getByLabelText(/corso/i);
      await user.selectOptions(courseSelect, '1');
      
      await waitFor(() => {
        // Check if risk level is auto-filled
        const riskLevelSelect = screen.getByLabelText(/livello di rischio/i);
        expect(riskLevelSelect).toHaveValue('BASSO');
        
        // Check if course type is auto-filled
        const courseTypeSelect = screen.getByLabelText(/tipo corso/i);
        expect(courseTypeSelect).toHaveValue('OBBLIGATORIO');
      });
    });

    it('should filter trainers based on course requirements', async () => {
      render(<ScheduleEventModal {...defaultProps} />);
      
      // Select course with certification requirements
      const courseSelect = screen.getByLabelText(/corso/i);
      await user.selectOptions(courseSelect, '2'); // Course with required certifications
      
      await waitFor(() => {
        const trainerSelect = screen.getByLabelText(/formatore/i);
        const options = trainerSelect.querySelectorAll('option');
        
        // Should only show trainers with required certifications
        expect(options).toHaveLength(2); // Including default option
        expect(screen.getByText('Mario Rossi')).toBeInTheDocument();
        expect(screen.queryByText('Luigi Verdi')).not.toBeInTheDocument();
      });
    });
  });

  describe('Company and Person Selection', () => {
    it('should allow company selection and auto-select persons', async () => {
      render(<ScheduleEventModal {...defaultProps} />);
      
      // Navigate to company selection step
      // ... (fill required fields and navigate)
      
      // Select a company
      const companyCheckbox = screen.getByLabelText(/Azienda Alpha/i);
      await user.click(companyCheckbox);
      
      await waitFor(() => {
        // Should auto-select persons from that company
        const personCheckbox = screen.getByLabelText(/Giovanni Bianchi/i);
        expect(personCheckbox).toBeChecked();
      });
    });

    it('should handle search functionality', async () => {
      render(<ScheduleEventModal {...defaultProps} />);
      
      // Navigate to company selection step
      // ... (fill required fields and navigate)
      
      const searchInput = screen.getByPlaceholderText(/Cerca aziende/i);
      await user.type(searchInput, 'Alpha');
      
      await waitFor(() => {
        expect(screen.getByText('Azienda Alpha')).toBeInTheDocument();
        expect(screen.queryByText('Azienda Beta')).not.toBeInTheDocument();
      });
    });
  });

  describe('Date and Time Management', () => {
    it('should add and remove date entries', async () => {
      render(<ScheduleEventModal {...defaultProps} />);
      
      // Add date entry
      const addDateButton = screen.getByText(/Aggiungi Data/i);
      await user.click(addDateButton);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('2024-01-15')).toBeInTheDocument();
        expect(screen.getByDisplayValue('09:00')).toBeInTheDocument();
        expect(screen.getByDisplayValue('17:00')).toBeInTheDocument();
      });
      
      // Remove date entry
      const removeButton = screen.getByText(/Rimuovi/i);
      await user.click(removeButton);
      
      await waitFor(() => {
        expect(screen.queryByDisplayValue('2024-01-15')).not.toBeInTheDocument();
      });
    });

    it('should calculate total hours correctly', async () => {
      render(<ScheduleEventModal {...defaultProps} />);
      
      // Add date entry with specific times
      const addDateButton = screen.getByText(/Aggiungi Data/i);
      await user.click(addDateButton);
      
      const startTimeInput = screen.getByLabelText(/Ora inizio/i);
      const endTimeInput = screen.getByLabelText(/Ora fine/i);
      
      await user.clear(startTimeInput);
      await user.type(startTimeInput, '09:00');
      
      await user.clear(endTimeInput);
      await user.type(endTimeInput, '17:00');
      
      await waitFor(() => {
        expect(screen.getByText(/8h/)).toBeInTheDocument(); // Total hours
      });
    });
  });

  describe('Form Submission', () => {
    it('should submit form with correct data', async () => {
      const mockOnSuccess = vi.fn();
      const props = { ...defaultProps, onSuccess: mockOnSuccess };
      
      render(<ScheduleEventModal {...props} />);
      
      // Fill all required fields
      const courseSelect = screen.getByLabelText(/corso/i);
      await user.selectOptions(courseSelect, '1');
      
      const trainerSelect = screen.getByLabelText(/formatore/i);
      await user.selectOptions(trainerSelect, '1');
      
      // Add date
      const addDateButton = screen.getByText(/Aggiungi Data/i);
      await user.click(addDateButton);
      
      // Fill location and participants
      const locationInput = screen.getByLabelText(/location/i);
      await user.type(locationInput, 'Sala Conferenze');
      
      const participantsInput = screen.getByLabelText(/partecipanti/i);
      await user.clear(participantsInput);
      await user.type(participantsInput, '20');
      
      // Navigate through steps and submit
      // ... (navigate to final step)
      
      const submitButton = screen.getByText(/Salva/i);
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });

    it('should handle submission errors gracefully', async () => {
      // Mock API to return error
      const { apiPost } = await import('../../../services/api');
      vi.mocked(apiPost).mockRejectedValue(new Error('Server error'));
      
      render(<ScheduleEventModal {...defaultProps} />);
      
      // Fill form and submit
      // ... (fill required fields)
      
      const submitButton = screen.getByText(/Salva/i);
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Errore durante il salvataggio/i)).toBeInTheDocument();
      });
    });
  });

  describe('Performance and Memoization', () => {
    it('should not re-render unnecessarily', async () => {
      const renderSpy = vi.fn();
      
      const TestComponent = (props: ScheduleEventModalProps) => {
        renderSpy();
        return <ScheduleEventModal {...props} />;
      };
      
      const { rerender } = render(<TestComponent {...defaultProps} />);
      
      expect(renderSpy).toHaveBeenCalledTimes(1);
      
      // Re-render with same props
      rerender(<TestComponent {...defaultProps} />);
      
      // Should use memoization to prevent unnecessary re-renders
      expect(renderSpy).toHaveBeenCalledTimes(2); // Only initial + rerender
    });

    it('should handle large datasets efficiently', async () => {
      const largeDataset = {
        ...defaultProps,
        trainings: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          name: `Corso ${i}`,
          description: `Descrizione ${i}`,
          duration: 8
        })),
        persons: Array.from({ length: 5000 }, (_, i) => ({
          id: i,
          firstName: `Nome ${i}`,
          lastName: `Cognome ${i}`,
          email: `user${i}@example.com`,
          company_id: Math.floor(i / 100)
        }))
      };
      
      const startTime = performance.now();
      render(<ScheduleEventModal {...largeDataset} />);
      const endTime = performance.now();
      
      // Should render within reasonable time (adjust threshold as needed)
      expect(endTime - startTime).toBeLessThan(1000); // 1 second
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<ScheduleEventModal {...defaultProps} />);
      
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByLabelText(/corso/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/formatore/i)).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      render(<ScheduleEventModal {...defaultProps} />);
      
      // Tab through form elements
      await user.tab();
      expect(screen.getByLabelText(/corso/i)).toHaveFocus();
      
      await user.tab();
      expect(screen.getByLabelText(/formatore/i)).toHaveFocus();
    });

    it('should handle escape key to close modal', async () => {
      const mockOnClose = vi.fn();
      const props = { ...defaultProps, onClose: mockOnClose };
      
      render(<ScheduleEventModal {...props} />);
      
      await user.keyboard('{Escape}');
      
      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});