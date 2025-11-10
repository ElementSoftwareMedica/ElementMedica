/* @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { CourseDetailsForm } from '../components/CourseDetailsForm';

// Helper: build minimal trainings list with >= 10 unique titles to avoid AsyncSelect auto-fetch
const buildTrainings = (count = 12) => {
  return Array.from({ length: count }).map((_, i) => ({ id: `${i + 1}`, title: `Corso ${i + 1}` }));
};

const DELIVERY_MODES = [
  { value: 'IN_PERSON', label: 'In presenza' },
  { value: 'ONLINE', label: 'Online' },
];

const baseProps = () => ({
  trainings: buildTrainings(),
  trainers: [],
  filteredTrainers: [],
  coTrainerOptions: [],
  formData: {
    training_id: '',
    trainer_id: '',
    co_trainer_id: '',
    location: '',
    max_participants: 0,
    notes: '',
    delivery_mode: '',
    risk_level: '',
    course_type: ''
  },
  onFormDataChange: vi.fn(),
  selectedCourse: undefined as any,
  courseSearch: '',
  onCourseSearchChange: vi.fn(),
  DELIVERY_MODES,
  RISK_LEVEL_OPTIONS: undefined as any,
  COURSE_TYPE_OPTIONS: undefined as any,
});

describe('CourseDetailsForm - Selection Pills (risk/type)', () => {
  it('mostra "Non applicabile" quando non c\'è corso selezionato (risk/type disabilitati)', () => {
    const props = baseProps();
    props.RISK_LEVEL_OPTIONS = [
      { value: 'BASSO', label: 'Basso' },
      { value: 'MEDIO', label: 'Medio' },
    ];
    props.COURSE_TYPE_OPTIONS = [
      { value: 'PRIMO_CORSO', label: 'Primo corso' },
      { value: 'AGGIORNAMENTO', label: 'Aggiornamento' },
    ];

    render(<CourseDetailsForm {...props} />);

    const disabledMsgs = screen.getAllByText('Non applicabile per questo corso');
    // Sia il rischio che il tipo sono disabilitati senza corso selezionato
    expect(disabledMsgs.length).toBe(2);
  });

  it('renderizza le pillole quando corso selezionato e opzioni presenti', () => {
    const props = baseProps();
    props.selectedCourse = { id: '999', title: 'Corso Speciale' } as any;
    props.RISK_LEVEL_OPTIONS = [
      { value: 'BASSO', label: 'Basso' },
      { value: 'MEDIO', label: 'Medio' },
      { value: 'ALTO', label: 'Alto' },
    ];
    props.COURSE_TYPE_OPTIONS = [
      { value: 'PRIMO_CORSO', label: 'Primo corso' },
      { value: 'AGGIORNAMENTO', label: 'Aggiornamento' },
    ];

    render(<CourseDetailsForm {...props} />);

    // Le pillole sono bottoni con l'etichetta come nome
    expect(screen.getByRole('button', { name: 'Basso' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Medio' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Alto' })).toBeInTheDocument();

    expect(screen.getByRole('button', { name: 'Primo corso' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Aggiornamento' })).toBeInTheDocument();
  });

  it('autoseleziona risk quando c\'è una sola opzione e nessun valore impostato', () => {
    const props = baseProps();
    props.selectedCourse = { id: '1000', title: 'Corso Mono-Rischio' } as any; // senza riskLevel
    props.RISK_LEVEL_OPTIONS = [{ value: 'ALTO', label: 'Alto' }];
    props.COURSE_TYPE_OPTIONS = [
      { value: 'PRIMO_CORSO', label: 'Primo corso' },
      { value: 'AGGIORNAMENTO', label: 'Aggiornamento' },
    ];

    render(<CourseDetailsForm {...props} />);

    // L'effetto useEffect deve chiamare onFormDataChange con il valore unico
    expect(props.onFormDataChange).toHaveBeenCalledWith('risk_level', 'ALTO');
  });

  it('autoseleziona course_type quando c\'è una sola opzione e nessun valore impostato', () => {
    const props = baseProps();
    props.selectedCourse = { id: '1001', title: 'Corso Mono-Tipo' } as any; // senza courseType
    props.RISK_LEVEL_OPTIONS = [
      { value: 'BASSO', label: 'Basso' },
      { value: 'MEDIO', label: 'Medio' },
    ];
    props.COURSE_TYPE_OPTIONS = [{ value: 'PRIMO_CORSO', label: 'Primo corso' }];

    render(<CourseDetailsForm {...props} />);

    expect(props.onFormDataChange).toHaveBeenCalledWith('course_type', 'PRIMO_CORSO');
  });

  it('mostra il suggerimento quando selectedCourse contiene riskLevel/courseType', () => {
    const props = baseProps();
    props.selectedCourse = { id: '1002', title: 'Corso Suggerito', riskLevel: 'MEDIO', courseType: 'PRIMO_CORSO' } as any;
    props.RISK_LEVEL_OPTIONS = [
      { value: 'BASSO', label: 'Basso' },
      { value: 'MEDIO', label: 'Medio' },
    ];
    props.COURSE_TYPE_OPTIONS = [
      { value: 'PRIMO_CORSO', label: 'Primo corso' },
      { value: 'AGGIORNAMENTO', label: 'Aggiornamento' },
    ];

    render(<CourseDetailsForm {...props} />);

    expect(screen.getByText(/Rischio suggerito: MEDIO/i)).toBeInTheDocument();
    expect(screen.getByText(/Tipo suggerito: PRIMO_CORSO/i)).toBeInTheDocument();
  });

  it('mostra "Non applicabile" quando non ci sono opzioni disponibili per il corso selezionato', () => {
    const props = baseProps();
    props.selectedCourse = { id: '1003', title: 'Corso senza opzioni' } as any;
    props.RISK_LEVEL_OPTIONS = [];
    props.COURSE_TYPE_OPTIONS = [];

    render(<CourseDetailsForm {...props} />);

    const grid = screen.getByText(/Livello di Rischio/i).closest('div')?.parentElement as HTMLElement;
    // Deve comparire il messaggio per entrambi i campi
    const msgs = screen.getAllByText('Non applicabile per questo corso');
    expect(msgs.length).toBe(2);

    // E non devono esserci bottoni pill per risk/type
    expect(screen.queryByRole('button', { name: /Basso|Medio|Alto/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Primo corso|Aggiornamento/ })).not.toBeInTheDocument();
  });
});