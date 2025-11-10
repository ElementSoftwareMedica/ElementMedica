import React from 'react';
import { renderHook } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useAdvancedMemoization } from '../hooks/useAdvancedMemoization';
import type { Training, Trainer, Person } from '../types';

// Mock data
const mockTrainings: Training[] = [
  {
    id: '1',
    name: 'Corso Sicurezza Base',
    duration: 8,
    riskLevel: 'BASSO',
    courseType: 'OBBLIGATORIO',
    certifications: ['Cert Base']
  },
  {
    id: '2',
    name: 'Corso Avanzato',
    duration: 16,
    riskLevel: 'ALTO',
    courseType: 'SPECIALISTICO',
    certifications: ['Cert Avanzata']
  }
];

const mockTrainers: Trainer[] = [
  {
    id: '1',
    firstName: 'Mario',
    lastName: 'Rossi',
    certifications: ['Cert Base']
  },
  {
    id: '2',
    firstName: 'Luigi',
    lastName: 'Verdi',
    certifications: ['Cert Avanzata']
  }
];

const mockPersons: Person[] = [
  {
    id: '1',
    firstName: 'Giovanni',
    lastName: 'Bianchi',
    email: 'giovanni.bianchi@alpha.com',
    companyId: '1'
  },
  {
    id: '2',
    firstName: 'Anna',
    lastName: 'Neri',
    email: 'anna.neri@beta.com',
    companyId: '2'
  }
];

const mockCompanies = [
  {
    id: '1',
    name: 'Azienda Alpha',
    ragioneSociale: 'Azienda Alpha S.r.l.'
  },
  {
    id: '2',
    name: 'Azienda Beta',
    ragioneSociale: 'Azienda Beta S.p.A.'
  }
];

describe('useAdvancedMemoization Hook', () => {
  const defaultParams = {
    trainings: mockTrainings,
    trainers: mockTrainers,
    companies: mockCompanies,
    persons: mockPersons,
    selectedCourse: undefined,
    formData: {
       training_id: '',
       trainer_id: '',
       co_trainer_id: '',
       location: '',
       max_participants: 20,
       notes: '',
       delivery_mode: '',
       risk_level: '',
       course_type: '',
       dates: []
     },
    dates: [],
    selectedCompanies: [],
    selectedPersons: [],
    companySearch: '',
    personSearch: '',
    courseSearch: '',
    dynamicRiskOptions: [{ value: 'BASSO', label: 'Basso' }],
    dynamicCourseTypeOptions: [{ value: 'OBBLIGATORIO', label: 'Obbligatorio' }]
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return memoized data structure', () => {
    const { result } = renderHook(() => useAdvancedMemoization(defaultParams));
    
    expect(result.current).toHaveProperty('filteredTrainings');
    expect(result.current).toHaveProperty('filteredTrainers');
    expect(result.current).toHaveProperty('filteredCompanies');
    expect(result.current).toHaveProperty('filteredPersons');
    expect(result.current).toHaveProperty('courseOptions');
    expect(result.current).toHaveProperty('trainerOptions');
    expect(result.current).toHaveProperty('totalSelectedHours');
     expect(result.current).toHaveProperty('isFormValid');
     expect(result.current).toHaveProperty('selectionStats');
  });

  it('should filter trainings based on search', () => {
    const paramsWithSearch = {
      ...defaultParams,
      courseSearch: 'Sicurezza'
    };
    
    const { result } = renderHook(() => useAdvancedMemoization(paramsWithSearch));
    
    expect(result.current.filteredTrainings).toHaveLength(1);
    expect(result.current.filteredTrainings[0].name).toContain('Sicurezza');
  });

  it('should filter trainers based on course requirements', () => {
    const paramsWithSelectedCourse = {
      ...defaultParams,
      selectedCourse: mockTrainings[0] // Course requiring 'Cert Base'
    };
    
    const { result } = renderHook(() => useAdvancedMemoization(paramsWithSelectedCourse));
    
    // Should only include trainers with required certification
    expect(result.current.filteredTrainers).toHaveLength(1);
    expect(result.current.filteredTrainers[0].firstName).toBe('Mario');
  });

  it('should filter companies based on search', () => {
    const paramsWithCompanySearch = {
      ...defaultParams,
      companySearch: 'Alpha'
    };
    
    const { result } = renderHook(() => useAdvancedMemoization(paramsWithCompanySearch));
    
    expect(result.current.filteredCompanies).toHaveLength(1);
    expect(result.current.filteredCompanies[0].name).toContain('Alpha');
  });

  it('should filter persons based on search', () => {
    const paramsWithPersonSearch = {
      ...defaultParams,
      personSearch: 'Giovanni'
    };
    
    const { result } = renderHook(() => useAdvancedMemoization(paramsWithPersonSearch));
    
    expect(result.current.filteredPersons).toHaveLength(1);
    expect(result.current.filteredPersons[0].firstName).toBe('Giovanni');
  });

  it('should calculate time correctly', () => {
    const paramsWithDates = {
      ...defaultParams,
      dates: [
        {
          date: '2024-01-15',
          start: '09:00',
          end: '17:00',
          trainerId: '1',
          coTrainerId: ''
        }
      ],
      selectedCourse: mockTrainings[0] // 8 hours duration
    };
    
    const { result } = renderHook(() => useAdvancedMemoization(paramsWithDates));
    
    expect(result.current.totalSelectedHours).toBe(8);
     expect(result.current.courseDuration).toBe(8);
     expect(result.current.hoursLeft).toBe(0);
  });

  it('should provide validation results', () => {
     const { result } = renderHook(() => useAdvancedMemoization(defaultParams));
     
     expect(result.current).toHaveProperty('isFormValid');
     expect(result.current).toHaveProperty('validationErrors');
     expect(Array.isArray(result.current.validationErrors)).toBe(true);
   });

  it('should calculate selection statistics', () => {
    const paramsWithSelections = {
      ...defaultParams,
      selectedCompanies: ['1'],
      selectedPersons: ['1', '2']
    };
    
    const { result } = renderHook(() => useAdvancedMemoization(paramsWithSelections));
    
    expect(result.current.selectionStats.companies.selected).toBe(1);
     expect(result.current.selectionStats.persons.selected).toBe(2);
     expect(result.current.selectionStats.companies.total).toBe(2);
     expect(result.current.selectionStats.persons.total).toBe(2);
  });

  it('should generate course options', () => {
    const { result } = renderHook(() => useAdvancedMemoization(defaultParams));
    
    expect(result.current.courseOptions).toHaveLength(2);
    expect(result.current.courseOptions[0]).toHaveProperty('value');
    expect(result.current.courseOptions[0]).toHaveProperty('label');
  });

  it('should generate trainer options', () => {
    const { result } = renderHook(() => useAdvancedMemoization(defaultParams));
    
    expect(result.current.trainerOptions).toHaveLength(2);
    expect(result.current.trainerOptions[0]).toHaveProperty('value');
    expect(result.current.trainerOptions[0]).toHaveProperty('label');
  });

  it('should memoize results to prevent unnecessary recalculations', () => {
    const { result, rerender } = renderHook(
      (props) => useAdvancedMemoization(props),
      { initialProps: defaultParams }
    );
    
    const firstResult = result.current;
    
    // Rerender with same props
    rerender(defaultParams);
    
    const secondResult = result.current;
    
    // Results should be the same object (memoized)
    expect(firstResult.filteredTrainings).toBe(secondResult.filteredTrainings);
    expect(firstResult.filteredTrainers).toBe(secondResult.filteredTrainers);
    expect(firstResult.courseOptions).toBe(secondResult.courseOptions);
  });

  it('should recalculate when dependencies change', () => {
    const { result, rerender } = renderHook(
      (props) => useAdvancedMemoization(props),
      { initialProps: defaultParams }
    );
    
    const firstResult = result.current;
    
    // Rerender with different search
    const newParams = {
      ...defaultParams,
      courseSearch: 'Avanzato'
    };
    rerender(newParams);
    
    const secondResult = result.current;
    
    // Results should be different (recalculated)
    expect(firstResult.filteredTrainings).not.toBe(secondResult.filteredTrainings);
    expect(secondResult.filteredTrainings).toHaveLength(1);
    expect(secondResult.filteredTrainings[0].name).toContain('Avanzato');
  });

  it('should handle edge cases gracefully', () => {
    const edgeCaseParams = {
      ...defaultParams,
      trainings: [],
      trainers: [],
      companies: [],
      persons: [],
      selectedCourse: undefined
    };
    
    const { result } = renderHook(() => useAdvancedMemoization(edgeCaseParams));
    
    expect(result.current.filteredTrainings).toHaveLength(0);
    expect(result.current.filteredTrainers).toHaveLength(0);
    expect(result.current.filteredCompanies).toHaveLength(0);
    expect(result.current.filteredPersons).toHaveLength(0);
    expect(result.current.totalSelectedHours).toBe(0);
     expect(result.current.selectionStats.companies.selected).toBe(0);
  });
});

// Integration test for performance
describe('Performance Tests', () => {
  it('should handle large datasets efficiently', () => {
    const largeDataset = {
      trainings: Array.from({ length: 1000 }, (_, i) => ({
        id: String(i),
        name: `Corso ${i}`,
        duration: 8,
        riskLevel: 'BASSO' as const,
        courseType: 'OBBLIGATORIO' as const,
        certifications: [`Cert ${i}`]
      })),
      trainers: Array.from({ length: 500 }, (_, i) => ({
        id: String(i),
        firstName: `Nome ${i}`,
        lastName: `Cognome ${i}`,
        certifications: [`Cert ${i % 10}`]
      })),
      companies: Array.from({ length: 100 }, (_, i) => ({
        id: String(i),
        name: `Azienda ${i}`,
        ragioneSociale: `Azienda ${i} S.r.l.`
      })),
      persons: Array.from({ length: 5000 }, (_, i) => ({
        id: String(i),
        firstName: `Nome ${i}`,
        lastName: `Cognome ${i}`,
        email: `user${i}@example.com`,
        companyId: String(Math.floor(i / 50))
      })),
      selectedCourse: undefined,
      formData: {
         training_id: '',
         trainer_id: '',
         co_trainer_id: '',
         location: '',
         max_participants: 20,
         notes: '',
         delivery_mode: '',
         risk_level: '',
         course_type: '',
         dates: []
       },
      dates: [],
      selectedCompanies: [],
      selectedPersons: [],
      companySearch: '',
      personSearch: '',
      courseSearch: '',
      dynamicRiskOptions: [{ value: 'BASSO', label: 'Basso' }],
      dynamicCourseTypeOptions: [{ value: 'OBBLIGATORIO', label: 'Obbligatorio' }]
    };
    
    const startTime = performance.now();
    const { result } = renderHook(() => useAdvancedMemoization(largeDataset));
    const endTime = performance.now();
    
    // Should complete within reasonable time
    expect(endTime - startTime).toBeLessThan(100); // 100ms threshold
    
    // Should return correct data structure
    expect(result.current.filteredTrainings).toHaveLength(1000);
    expect(result.current.filteredTrainers).toHaveLength(500);
    expect(result.current.filteredCompanies).toHaveLength(100);
    expect(result.current.filteredPersons).toHaveLength(5000);
  });
});