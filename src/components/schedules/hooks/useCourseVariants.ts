import { useState, useEffect } from 'react';
import { apiGet } from '../../../services/api';
import { extractCourses as extractCoursesUtil, normalizeText as normalizeTextUtil, sameCourseGroup, matchByExactNormalizedTitle } from '../utils';
import type { Training } from '../types';

export interface UseCourseVariantsProps {
  selectedCourse?: Training;
  trainings: Training[];
}

export interface UseCourseVariantsReturn {
  selectedCourseVariants: Training[];
  selectedCourseDetails: Training | undefined;
  setSelectedCourseDetails: React.Dispatch<React.SetStateAction<Training | undefined>>;
  loading: boolean;
  error: string | null;
}

export function useCourseVariants({
  selectedCourse,
  trainings,
}: UseCourseVariantsProps): UseCourseVariantsReturn {
  const [selectedCourseVariants, setSelectedCourseVariants] = useState<Training[]>([]);
  const [selectedCourseDetails, setSelectedCourseDetails] = useState<Training | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch course variants when selected course changes
  useEffect(() => {
    let cancelled = false;

    const rawTitle = (selectedCourse as any)?.title || (selectedCourse as any)?.name;
    const title = normalizeTextUtil(rawTitle);

    // DEBUG: Log dettagliato per capire cosa riceve l'hook
    if (import.meta?.env?.MODE === 'development') {
    }

    if (!title) {
      setSelectedCourseVariants([]);
      setSelectedCourseDetails(undefined);
      setError(null);
      return;
    }

    // First, try to find variants in local trainings (exact-first on normalized title, then fuzzy group)
    const exactLocal = trainings.filter((t: Training) =>
      matchByExactNormalizedTitle((t.title || (t as any).name) as string, rawTitle, normalizeTextUtil)
    ) as Training[];
    const localVariants = (exactLocal.length > 0 ? exactLocal : trainings.filter((t: Training) =>
      sameCourseGroup((t.title || (t as any).name) as string, rawTitle, normalizeTextUtil)
    )) as Training[];

    if (import.meta?.env?.MODE === 'development') {
    }

    // Se trovo più di una variante localmente, uso come base ma procedo comunque con il fetch remoto per arricchire i dati
    if (localVariants.length > 1) {
      setSelectedCourseVariants(localVariants);
      setError(null);
      // proseguiamo con il fetch per arricchire riskLevel/courseType
    }

    // In caso di 0 o 1 occorrenza locale (tipicamente solo il macrocorso),
    // imposto comunque la/le variante/i locale/i come stato provvisorio e proseguo con il fetch.
    setSelectedCourseVariants(localVariants);

    // If no local variants found (o solo 1), fetch from API per recuperare varianti effettive
    setLoading(true);
    setError(null);

    (async () => {
      // 1) Prova l'endpoint autenticato delle varianti
      try {
        const authUrl = `/api/v1/courses/variants?search=${encodeURIComponent(rawTitle as string)}`;
        if (import.meta?.env?.MODE === 'development') {
        }
        const authRes = await apiGet(authUrl);
        if (!cancelled) {
          const all = extractCoursesUtil(authRes) as Training[];
          if (import.meta?.env?.MODE === 'development') {
          }
          const exactFirst = Array.isArray(all) ? all.filter(v => matchByExactNormalizedTitle((v.title || (v as any).name) as string, rawTitle, normalizeTextUtil)) : [];
          const variants = (exactFirst.length > 0
            ? exactFirst
            : (Array.isArray(all) ? all.filter(v => sameCourseGroup((v.title || (v as any).name) as string, rawTitle, normalizeTextUtil)) : [])) as Training[];

          if (variants.length > 0) {
            setSelectedCourseVariants(variants);
            if (import.meta?.env?.MODE === 'development') {
            }
          } else if (import.meta?.env?.MODE === 'development') {
          }
          setLoading(false);
          setError(null);
          // Se arriviamo qui senza varianti, continuiamo con il fallback pubblico
          if (variants.length > 0) return;
        }
      } catch (authErr: unknown) {
        if (import.meta?.env?.MODE === 'development') {
        }
        // Continua al fallback pubblico
      }

      // 2) Fallback: endpoint pubblico che restituisce anche i corsi pubblici
      try {
        const pubUrl = `/api/v1/public/courses?search=${encodeURIComponent(rawTitle as string)}&limit=200`;
        if (import.meta?.env?.MODE === 'development') {
        }
        const pubRes = await apiGet(pubUrl);
        if (!cancelled) {
          const all = extractCoursesUtil(pubRes) as Training[];
          if (import.meta?.env?.MODE === 'development') {
          }
          const exactFirst = Array.isArray(all) ? all.filter(v => matchByExactNormalizedTitle((v.title || (v as any).name) as string, rawTitle, normalizeTextUtil)) : [];
          const variants = (exactFirst.length > 0
            ? exactFirst
            : (Array.isArray(all) ? all.filter(v => sameCourseGroup((v.title || (v as any).name) as string, rawTitle, normalizeTextUtil)) : [])) as Training[];
          if (import.meta?.env?.MODE === 'development') {
          }
          if (variants.length > 0) {
            setSelectedCourseVariants(variants);
            if (import.meta?.env?.MODE === 'development') {
            }
          } else if (import.meta?.env?.MODE === 'development') {
          }
          setLoading(false);
          setError(null);
          return;
        }
      } catch (pubErr: unknown) {
        if (!cancelled) {
          setError(pubErr instanceof Error ? pubErr.message : 'Errore nel caricamento delle varianti corso');
          setLoading(false);
          if (import.meta?.env?.MODE === 'development') {
          }
        }
      }
    })();

    return () => {
      cancelled = true;
      setLoading(false);
    };
  }, [selectedCourse, trainings]);

  // Update selected course details when course changes
  useEffect(() => {
    if (selectedCourse) {
      setSelectedCourseDetails(selectedCourse);
    }
  }, [selectedCourse]);

  return {
    selectedCourseVariants,
    selectedCourseDetails,
    setSelectedCourseDetails,
    loading,
    error,
  };
}