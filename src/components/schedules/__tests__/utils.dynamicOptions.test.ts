/* @vitest-environment jsdom */
import { describe, it, expect } from 'vitest';
import {
  computeDynamicRiskAndTypeOptions,
  normalizeText,
  normalizeRiskValue,
  normalizeCourseTypeValue,
} from '../utils';
import type { Option } from '../types';

const RISK_LEVEL_OPTIONS: Option[] = [
  { value: 'BASSO', label: 'Basso' },
  { value: 'MEDIO', label: 'Medio' },
  { value: 'ALTO', label: 'Alto' },
];

const COURSE_TYPE_OPTIONS: Option[] = [
  { value: 'PRIMO_CORSO', label: 'Primo corso' },
  { value: 'AGGIORNAMENTO', label: 'Aggiornamento' },
];

describe('normalizeText', () => {
  it('normalizza accenti, simboli e spazi', () => {
    expect(normalizeText('  Prìmo & Soccórso — BÁSICO  ')).toBe('primo e soccorso basico');
  });
});

describe('normalizeRiskValue', () => {
  it('mappa forme italiane "rischio X"', () => {
    expect(normalizeRiskValue('rischio basso')).toBe('BASSO');
    expect(normalizeRiskValue('rischio medio')).toBe('MEDIO');
    expect(normalizeRiskValue('rischio alto')).toBe('ALTO');
  });

  it('mappa forme inglesi "risk X"', () => {
    expect(normalizeRiskValue('risk low')).toBe('BASSO');
    expect(normalizeRiskValue('risk medium')).toBe('MEDIO');
    expect(normalizeRiskValue('risk high')).toBe('ALTO');
  });

  it('mappa categorie/lettere e sinonimi', () => {
    expect(normalizeRiskValue('categoria a')).toBe('A');
    expect(normalizeRiskValue('classe b')).toBe('B');
    expect(normalizeRiskValue('gruppo c')).toBe('C');
    expect(normalizeRiskValue('alta')).toBe('ALTO');
  });

  it('mappa livelli numerici/romani', () => {
    expect(normalizeRiskValue('livello 1')).toBe('BASSO');
    expect(normalizeRiskValue('R2')).toBe('MEDIO');
    expect(normalizeRiskValue('III')).toBe('ALTO');
  });
});

describe('normalizeCourseTypeValue', () => {
  it('mappa aggiornamento e sinonimi', () => {
    expect(normalizeCourseTypeValue('aggiornamento periodico')).toBe('AGGIORNAMENTO');
    expect(normalizeCourseTypeValue('Refresher')).toBe('AGGIORNAMENTO');
  });

  it('mappa primo corso e sinonimi', () => {
    expect(normalizeCourseTypeValue('base')).toBe('PRIMO_CORSO');
    expect(normalizeCourseTypeValue('first course')).toBe('PRIMO_CORSO');
  });

  it('normalizza generico in UPPER_SNAKE', () => {
    expect(normalizeCourseTypeValue('corso specialistico')).toBe('CORSO_SPECIALISTICO');
  });
});

describe('computeDynamicRiskAndTypeOptions', () => {
  const selectedCourse = { id: 'c1', title: 'Corso Primo Soccorso' } as any;

  const variants = [
    { id: 'v1', title: 'Primo Soccorso Base', riskLevel: 'BASSO', courseType: 'PRIMO_CORSO' },
    { id: 'v2', title: 'Primo Soccorso Avanzato', riskLevel: 'MEDIO', courseType: 'AGGIORNAMENTO' },
    // unrelated title to ensure grouping works
    { id: 'v3', title: 'Antincendio Base', riskLevel: 'ALTO', courseType: 'PRIMO_CORSO' },
  ];

  it('ritorna titleEmpty=true e nessuna pillola senza corso selezionato', () => {
    const res = computeDynamicRiskAndTypeOptions(
      {},
      variants,
      [],
      { risk_level: '', course_type: '' },
      normalizeText,
      RISK_LEVEL_OPTIONS,
      COURSE_TYPE_OPTIONS
    );
    expect(res.titleEmpty).toBe(true);
    expect(res.riskOpts).toHaveLength(0);
    expect(res.typeOpts).toHaveLength(0);
    expect(res.riskValid).toBe(true);
    expect(res.typeValid).toBe(true);
  });

  it('estrae opzioni da varianti del macrocorso', () => {
    const res = computeDynamicRiskAndTypeOptions(
      selectedCourse,
      variants,
      [],
      { risk_level: '', course_type: '' },
      normalizeText,
      RISK_LEVEL_OPTIONS,
      COURSE_TYPE_OPTIONS
    );
    // Should include only BASSO+MEDIO and PRIMO_CORSO+AGGIORNAMENTO from the grouped variants
    const riskValues = res.riskOpts.map(o => o.value).sort();
    const typeValues = res.typeOpts.map(o => o.value).sort();
    expect(riskValues).toEqual(['BASSO', 'MEDIO']);
    expect(typeValues).toEqual(['AGGIORNAMENTO', 'PRIMO_CORSO']);
    expect(res.titleEmpty).toBe(false);
  });

  it('filtra le opzioni risk in base al course_type selezionato', () => {
    const res = computeDynamicRiskAndTypeOptions(
      selectedCourse,
      variants,
      [],
      { risk_level: '', course_type: 'AGGIORNAMENTO' },
      normalizeText,
      RISK_LEVEL_OPTIONS,
      COURSE_TYPE_OPTIONS
    );
    // Only v2 has AGGIORNAMENTO -> risk MEDIO only
    const riskValues = res.riskOpts.map(o => o.value);
    expect(riskValues).toEqual(['MEDIO']);
  });

  it('filtra le opzioni type in base al risk_level selezionato', () => {
    const res = computeDynamicRiskAndTypeOptions(
      selectedCourse,
      variants,
      [],
      { risk_level: 'BASSO', course_type: '' },
      normalizeText,
      RISK_LEVEL_OPTIONS,
      COURSE_TYPE_OPTIONS
    );
    // Only v1 has risk BASSO -> type PRIMO_CORSO only
    const typeValues = res.typeOpts.map(o => o.value);
    expect(typeValues).toEqual(['PRIMO_CORSO']);
  });

  it('usa fallback dal corso selezionato se non ci sono varianti del gruppo', () => {
    const selected = { id: 'c2', title: 'Corso Unico', riskLevel: 'MEDIO', courseType: 'AGGIORNAMENTO' } as any;
    const res = computeDynamicRiskAndTypeOptions(
      selected,
      [],
      [],
      { risk_level: '', course_type: '' },
      normalizeText,
      RISK_LEVEL_OPTIONS,
      COURSE_TYPE_OPTIONS
    );
    expect(res.riskOpts.map(o => o.value)).toEqual(['MEDIO']);
    expect(res.typeOpts.map(o => o.value)).toEqual(['AGGIORNAMENTO']);
  });

  it('imposta riskValid/typeValid correttamente quando i valori non sono nelle opzioni disponibili', () => {
    const res = computeDynamicRiskAndTypeOptions(
      selectedCourse,
      variants,
      [],
      { risk_level: 'ALTO', course_type: 'PRIMO_CORSO' },
      normalizeText,
      RISK_LEVEL_OPTIONS,
      COURSE_TYPE_OPTIONS
    );
    // Con risk_level=ALTO non ci sono varianti del macrocorso → nessuna type option disponibile, quindi typeValid=false
    expect(res.riskValid).toBe(false);
    expect(res.typeValid).toBe(false);
  });
});

describe('computeDynamicRiskAndTypeOptions - Primo Soccorso categorie A/B/C dai titoli', () => {
  const baseRiskOpts: Option[] = [
    { value: 'A', label: 'A' },
    { value: 'B', label: 'B' },
    { value: 'C', label: 'C' },
    { value: 'BASSO', label: 'Basso' },
    { value: 'MEDIO', label: 'Medio' },
    { value: 'ALTO', label: 'Alto' },
  ];
  const baseTypeOpts: Option[] = [
    { value: 'PRIMO_CORSO', label: 'Primo corso' },
    { value: 'AGGIORNAMENTO', label: 'Aggiornamento' },
  ];

  it('deduce A/B/C da varianti con titoli "cat. A", "categ: B", "classe C"', () => {
    const selectedCourse = { id: 'ps', title: 'Corso Primo Soccorso' } as any;
    const variants = [
      { id: 'vA', title: 'Primo Soccorso cat. A', courseType: 'PRIMO_CORSO' },
      { id: 'vB', title: 'Primo Soccorso categ: B', courseType: 'PRIMO_CORSO' },
      { id: 'vC', title: 'PS classe C', courseType: 'AGGIORNAMENTO' },
    ];
    const res = computeDynamicRiskAndTypeOptions(
      selectedCourse,
      variants,
      [],
      { risk_level: '', course_type: '' },
      normalizeText,
      baseRiskOpts,
      baseTypeOpts
    );
    const riskValues = res.riskOpts.map(o => o.value).sort();
    expect(riskValues).toEqual(['A', 'B', 'C']);
  });

  it('filtra typeOpts in base a risk_level dedotto dal titolo (A -> solo PRIMO_CORSO)', () => {
    const selectedCourse = { id: 'ps', title: 'Corso Primo Soccorso' } as any;
    const variants = [
      { id: 'vA', title: 'Primo Soccorso cat. A', courseType: 'PRIMO_CORSO' },
      { id: 'vB', title: 'Primo Soccorso categ: B', courseType: 'PRIMO_CORSO' },
      { id: 'vC', title: 'PS classe C', courseType: 'AGGIORNAMENTO' },
    ];
    const res = computeDynamicRiskAndTypeOptions(
      selectedCourse,
      variants,
      [],
      { risk_level: 'A', course_type: '' },
      normalizeText,
      baseRiskOpts,
      baseTypeOpts
    );
    const typeValues = res.typeOpts.map(o => o.value).sort();
    expect(typeValues).toEqual(['PRIMO_CORSO']);
  });

  // Nuovo test: risk_level C -> typeOpts solo AGGIORNAMENTO quando le varianti C sono di aggiornamento
  it('filtra typeOpts in base a risk_level dedotto dal titolo (C -> solo AGGIORNAMENTO)', () => {
    const selectedCourse = { id: 'ps', title: 'Corso Primo Soccorso' } as any;
    const variants = [
      { id: 'vA', title: 'Primo Soccorso cat. A', courseType: 'PRIMO_CORSO' },
      { id: 'vB', title: 'Primo Soccorso categ: B', courseType: 'PRIMO_CORSO' },
      { id: 'vC', title: 'PS classe C', courseType: 'AGGIORNAMENTO' },
    ];
    const res = computeDynamicRiskAndTypeOptions(
      selectedCourse,
      variants,
      [],
      { risk_level: 'C', course_type: '' },
      normalizeText,
      baseRiskOpts,
      baseTypeOpts
    );
    const typeValues = res.typeOpts.map(o => o.value).sort();
    expect(typeValues).toEqual(['AGGIORNAMENTO']);
  });
});