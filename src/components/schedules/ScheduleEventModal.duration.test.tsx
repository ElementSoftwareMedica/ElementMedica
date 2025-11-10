import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ScheduleEventModal from './ScheduleEventModal';
import { describe, test, expect } from 'vitest';

// Helpers
function makeTrainer(id: string, firstName = 'Mario', lastName = 'Rossi') {
  return { id, firstName, lastName, certifications: [] };
}

function makeCourse(id: string, title: string, duration: number) {
  return { id, title, duration, certifications: [], riskLevel: 'BASSO', courseType: 'PRIMO_CORSO' } as any;
}

describe('ScheduleEventModal - validazione durata (somma ore = durata corso)', () => {
  const trainers = [makeTrainer('t1')];
  const companies: any[] = [];
  const persons: any[] = [];

  test('disabilita Avanti quando la somma ore non coincide e lo abilita quando coincide', async () => {
    const course = makeCourse('c1', 'Corso Sicurezza', 8);

    const existingEvent = {
      id: 's1',
      training_id: 'c1',
      course: course,
      // 09:00 -> 12:00 = 3h (non coincide con 8h)
      dates: [
        { date: '2025-01-15', start: '09:00', end: '12:00', trainer_id: 't1', co_trainer_id: '' }
      ],
      location: 'Aula 1',
      max_participants: 10,
      notes: '',
      delivery_mode: 'in-person',
      risk_level: 'BASSO',
      course_type: 'PRIMO_CORSO',
    } as any;

    render(
      <ScheduleEventModal
        trainings={[course]}
        trainers={trainers as any}
        companies={companies as any}
        persons={persons as any}
        existingEvent={existingEvent}
        onClose={() => {}}
        onSuccess={() => {}}
      />
    );

    // "Avanti" deve essere disabilitato (3h != 8h)
    const nextBtn = await screen.findByRole('button', { name: /Avanti/i });
    expect(nextBtn).toBeDisabled();

    // Verifichiamo anche il messaggio di warning ore (dal DateTimeManager)
    expect(
      screen.getByText(/le ore selezionate non coincidono con la durata del corso/i)
    ).toBeInTheDocument();

    // Correggiamo l'orario fine a 17:00 per ottenere 8h totali (09:00 -> 17:00)
    const endTimeInput = screen.getByDisplayValue('12:00') as HTMLInputElement;
    fireEvent.change(endTimeInput, { target: { value: '17:00' } });

    await waitFor(() => {
      // Il bottone "Avanti" deve diventare abilitato quando la somma ore coincide con la durata
      expect(nextBtn).not.toBeDisabled();
    });

    // Verifica UI riepilogo ore
    expect(await screen.findByText(/Ore selezionate:/)).toBeInTheDocument();
    expect(screen.getByText(/Durata corso:/)).toBeInTheDocument();
    expect(screen.getByText(/Ore rimanenti:/)).toBeInTheDocument();

    // Dopo la correzione, il messaggio di attenzione non dovrebbe apparire
    expect(screen.queryByText(/Attenzione: le ore selezionate non coincidono/)).not.toBeInTheDocument();
  });
});