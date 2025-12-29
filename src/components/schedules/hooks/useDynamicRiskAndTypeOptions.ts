import { useMemo } from 'react';
import type { Training } from '../types';
import { computeDynamicRiskAndTypeOptions } from '../utils';

export interface UseDynamicRiskAndTypeOptionsParams {
  selectedCourse: Training | undefined;
  selectedCourseVariants: Training[];
  trainings: Training[];
  risk_level: string | undefined;
  course_type: string | undefined;
  normalizeText: (s?: unknown) => string; // Changed from (s: string) to match computeDynamicRiskAndTypeOptions
  baseRiskOptions: { value: string; label: string }[];
  baseTypeOptions: { value: string; label: string }[];
}

export function useDynamicRiskAndTypeOptions(params: UseDynamicRiskAndTypeOptionsParams) {
  const {
    selectedCourse,
    selectedCourseVariants,
    trainings,
    risk_level,
    course_type,
    normalizeText,
    baseRiskOptions,
    baseTypeOptions,
  } = params;

  const { riskOpts, typeOpts, riskValid, typeValid, titleEmpty } = useMemo(() =>
    computeDynamicRiskAndTypeOptions(
      selectedCourse,
      selectedCourseVariants,
      trainings,
      { risk_level, course_type },
      normalizeText,
      baseRiskOptions,
      baseTypeOptions
    ),
  [selectedCourse, selectedCourseVariants, trainings, risk_level, course_type, normalizeText, baseRiskOptions, baseTypeOptions]);

  return { riskOpts, typeOpts, riskValid, typeValid, titleEmpty } as const;
}