import { useEffect, useMemo } from 'react';
import type { Training } from '../types';
import { resolveVariantSelection } from '../utils';

export interface UseAutoSelectVariantParams {
  selectedCourse: Training | undefined;
  selectedCourseVariants: Training[];
  trainings: Training[];
  current: { training_id: string | number | ''; risk_level: string; course_type: string };
  normalizeText: (s: string) => string;
  riskOptions: { value: string; label: string }[];
  typeOptions: { value: string; label: string }[];
  onResolve: (id: string | number, details?: Training) => void;
}

export function useAutoSelectVariant(params: UseAutoSelectVariantParams) {
  const {
    selectedCourse,
    selectedCourseVariants,
    trainings,
    current,
    normalizeText,
    riskOptions,
    typeOptions,
    onResolve
  } = params;

  const res = useMemo(() => resolveVariantSelection(
    selectedCourse,
    selectedCourseVariants,
    trainings,
    { training_id: current.training_id, risk_level: current.risk_level, course_type: current.course_type },
    normalizeText,
    riskOptions,
    typeOptions
  ), [selectedCourse, selectedCourseVariants, trainings, current.training_id, current.risk_level, current.course_type, normalizeText, riskOptions, typeOptions]);

  useEffect(() => {
    if (res.id) onResolve(res.id, res.details);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [res.id]);

  return res as { id?: string | number; details?: Training };
}