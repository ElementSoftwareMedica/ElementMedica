// Shared utilities for schedules module: text normalization, certificate synonyms, extraction helpers, time/date utils

import type { ScheduleDateEntry, Option, Person, ScheduleFormData, ValidationResult, Trainer, CertificateFilter } from './types';

// Normalize attendance data keys from string to number
export const normalizeAttendanceData = (
  attendance: Record<string, (string | number)[]>
): Record<number, (string | number)[]> => {
  const normalized: Record<number, (string | number)[]> = {};
  Object.entries(attendance).forEach(([key, value]) => {
    const numKey = parseInt(key, 10);
    if (!isNaN(numKey)) {
      normalized[numKey] = value;
    }
  });
  return normalized;
};

export const normalizeText = (s?: unknown): string =>
  String(s ?? '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' e ')
    .replace(/[^a-z0-9]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// NEW: Fuzzy match per raggruppare varianti dello stesso macrocorso
export const sameCourseGroup = (a?: unknown, b?: unknown, normalizeTextFn: (s?: unknown) => string = normalizeText): boolean => {
  const A = normalizeTextFn(a);
  const B = normalizeTextFn(b);
  if (!A || !B) return false;

  // Alias per abbreviazioni comuni dei titoli di corso (es. "PS" → "primo soccorso")
  const aliasCourse = (s: string) => s.replace(/\bps\b/g, ' primo soccorso ');
  const A1 = aliasCourse(A);
  const B1 = aliasCourse(B);

  if (A1 === B1 || A1.includes(B1) || B1.includes(A1)) return true;
  // Migliora il matching: confronta token significativi ed usa Jaccard/overlap
  const STOPWORDS = new Set(['corso', 'corsi', 'di', 'del', 'della', 'dei', 'delle', 'per', 'e', 'con', 'per', 'ed', 'il', 'lo', 'la', 'gli', 'le', 'un', 'una', 'uno', 'livello', 'rischio', 'tipo', 'formazione', 'lavoratori', 'addetto', 'addetti']);
  const toTokens = (s: string) => Array.from(new Set(s.split(' ').filter(t => t.length >= 3 && !STOPWORDS.has(t))));
  const tA = toTokens(A1);
  const tB = toTokens(B1);
  if (tA.length === 0 || tB.length === 0) return false;
  const setA = new Set(tA);
  const setB = new Set(tB);
  const intersection: string[] = [];
  for (const t of setA) if (setB.has(t)) intersection.push(t);
  const overlap = intersection.length;
  const jaccard = overlap / (new Set([...tA, ...tB]).size);
  // Considera stesso gruppo se condividono almeno 2 token significativi oppure Jaccard >= 0.5
  return overlap >= 2 || jaccard >= 0.5;
};

// Semplice confronto per stesso titolo normalizzato (richiesta: varianti per stesso "title")
export const matchByExactNormalizedTitle = (
  a?: unknown,
  b?: unknown,
  normalizeTextFn: (s?: unknown) => string = normalizeText
): boolean => {
  const A = normalizeTextFn(a);
  const B = normalizeTextFn(b);
  return !!A && !!B && A === B;
};

// NEW: Normalizzazione canonica per valori di rischio e tipo corso
export const normalizeRiskValue = (v?: unknown): string => {
  const raw = String(v ?? '').trim();
  const norm = normalizeText(raw);
  if (!raw) return '';
  // Pattern "rischio X" e abbreviazioni comuni
  const rischioMatch = norm.match(/\brischio\s*(basso|medio|alto|a|b|c)\b/);
  if (rischioMatch) {
    const x = rischioMatch[1];
    if (x === 'a') return 'A';
    if (x === 'b') return 'B';
    if (x === 'c') return 'C';
    if (x === 'basso') return 'BASSO';
    if (x === 'medio') return 'MEDIO';
    if (x === 'alto') return 'ALTO';
  }
  // Pattern inglese "risk X"
  const riskMatch = norm.match(/\brisk\s*(low|medium|high|a|b|c)\b/);
  if (riskMatch) {
    const x = riskMatch[1];
    if (x === 'a') return 'A';
    if (x === 'b') return 'B';
    if (x === 'c') return 'C';
    if (x === 'low') return 'BASSO';
    if (x === 'medium') return 'MEDIO';
    if (x === 'high') return 'ALTO';
  }
  // Gestione lettere A/B/C
  if (norm === 'a') return 'A';
  if (norm === 'b') return 'B';
  if (norm === 'c') return 'C';
  // Pattern descrittivi (es. "gruppo/categoria/classe A/B/C" + abbreviazioni "cat"/"categ")
  if (/(\bgruppo|\bcategoria|\bclasse|\bcat\b|\bcateg\b)\s*a\b/.test(norm)) return 'A';
  if (/(\bgruppo|\bcategoria|\bclasse|\bcat\b|\bcateg\b)\s*b\b/.test(norm)) return 'B';
  if (/(\bgruppo|\bcategoria|\bclasse|\bcat\b|\bcateg\b)\s*c\b/.test(norm)) return 'C';
  // Sinonimi comuni (+ forme con parola rischio)
  if (['basso', 'bassa', 'low', 'rischio basso'].includes(norm)) return 'BASSO';
  if (['medio', 'media', 'intermedio', 'medium', 'rischio medio'].includes(norm)) return 'MEDIO';
  if (['alto', 'alta', 'high', 'rischio alto'].includes(norm)) return 'ALTO';
  // Mappature numeriche e romane (es. livello 1/2/3, I/II/III, R1/R2/R3)
  if (/^(?:livello\s*)?1$/.test(norm) || /\br1\b/.test(norm) || /\bi\b/.test(norm)) return 'BASSO';
  if (/^(?:livello\s*)?2$/.test(norm) || /\br2\b/.test(norm) || /\bii\b/.test(norm)) return 'MEDIO';
  if (/^(?:livello\s*)?3$/.test(norm) || /\br3\b/.test(norm) || /\biii\b/.test(norm)) return 'ALTO';
  return raw.toUpperCase();
};

export const normalizeCourseTypeValue = (v?: unknown): string => {
  const raw = String(v ?? '').trim();
  const norm = normalizeText(raw);
  if (!raw) return '';
  // Aggiornamento: sinonimi e abbreviazioni IT/EN
  if (
    norm.includes('aggiorn') ||
    ['agg', 'agg.', 'update', 'refresher', 'refresh', 'retraining', 'periodico', 'ricorrente', 'aggiornamento periodico'].includes(norm)
  ) {
    return 'AGGIORNAMENTO';
  }
  // Primo corso / base: sinonimi IT/EN
  if (
    ['primo corso', 'primo', 'base', 'iniziale', 'obbligatorio', 'obbl', 'prima formazione', 'formazione iniziale', 'corso base', 'formazione base', 'first course', 'first_course', 'first'].includes(norm)
  ) {
    return 'PRIMO_CORSO';
  }
  return raw.toUpperCase().replace(/\s+/g, '_');
};


// Helpers: estrai valori risk/type dalle varianti, supportando camelCase e snake_case e possibili nested details
const getVariantRisk = (v: any): string => {
  const raw = (
    v?.riskLevel ?? v?.risk_level ??
    // Varianti italiane frequentemente usate in CSV/API
    (v as any)?.LivelloRischio ?? (v as any)?.livelloRischio ?? (v as any)?.livello_rischio ??
    // Alias aggiuntivi comuni per gruppo/categoria/classe (A/B/C)
    (v as any)?.gruppo ?? (v as any)?.categoria ?? (v as any)?.classe ?? v?.group ?? v?.category ?? v?.class ??
    // Altri alias sintetici
    v?.risk ?? v?.risk_category ?? v?.riskLevelLabel ?? v?.risk_level_label ??
    // Nested details/metadata
    v?.details?.riskLevel ?? v?.details?.risk_level ?? (v as any)?.details?.LivelloRischio ?? v?.details?.risk ??
    v?.metadata?.riskLevel ?? v?.metadata?.risk_level ?? v?.metadata?.risk
  ) as unknown;
  let out = normalizeRiskValue(raw);
  if (!out) {
    // Fallback: prova a dedurre dal titolo/nome
    const titleRaw = (v?.title ?? v?.name ?? v?.details?.title ?? '') as string;
    const t = normalizeText(titleRaw);
    // pattern espliciti "rischio X"
    if (/rischio\s+a\b/.test(t)) out = 'A';
    else if (/rischio\s+b\b/.test(t)) out = 'B';
    else if (/rischio\s+c\b/.test(t)) out = 'C';
    // categorie/gruppi/classi con lettere A/B/C, inclusi abbreviazioni e punteggiatura (cat., categ:, ecc.)
    else if (/\b(?:cat|categ|categoria|gruppo|classe)\s*[.:]?\s*a\b/.test(t)) out = 'A';
    else if (/\b(?:cat|categ|categoria|gruppo|classe)\s*[.:]?\s*b\b/.test(t)) out = 'B';
    else if (/\b(?:cat|categ|categoria|gruppo|classe)\s*[.:]?\s*c\b/.test(t)) out = 'C';
    else if (/\bbasso\b/.test(t)) out = 'BASSO';
    else if (/\bmedio\b/.test(t)) out = 'MEDIO';
    else if (/\balto\b/.test(t)) out = 'ALTO';
    // Deduzione anche da numeri/romani nel titolo (es. livello 1, corso II, R3)
    else if (/\blivello\s*1\b/.test(t) || /\bi\b/.test(t) || /\br1\b/.test(t)) out = 'BASSO';
    else if (/\blivello\s*2\b/.test(t) || /\bii\b/.test(t) || /\br2\b/.test(t)) out = 'MEDIO';
    else if (/\blivello\s*3\b/.test(t) || /\biii\b/.test(t) || /\br3\b/.test(t)) out = 'ALTO';
  }
  return out;
};
const getVariantType = (v: any): string => {
  const raw = (
    v?.courseType ?? v?.course_type ??
    // Varianti italiane frequentemente usate in CSV/API
    (v as any)?.TipoCorso ?? (v as any)?.tipoCorso ?? (v as any)?.tipo_corso ?? (v as any)?.tipo ??
    // Alias aggiuntivi comuni
    (v as any)?.Tipologia ?? (v as any)?.tipologia ?? (v as any)?.tipologia_corso ??
    // Altri alias sintetici
    v?.type ?? v?.courseTypeLabel ?? v?.course_type_label ??
    // Nested details/metadata
    v?.details?.courseType ?? v?.details?.course_type ?? (v as any)?.details?.TipoCorso ?? v?.details?.tipo ??
    v?.metadata?.courseType ?? v?.metadata?.course_type ?? v?.metadata?.tipo
  ) as unknown;
  let out = normalizeCourseTypeValue(raw);
  if (!out) {
    const titleRaw = (v?.title ?? v?.name ?? v?.details?.title ?? '') as string;
    const t = normalizeText(titleRaw);
    if (/\baggiorn/.test(t) || /\bagg\b/.test(t)) out = 'AGGIORNAMENTO';
    else if (/\bprimo\b.*\bcorso\b/.test(t) || /\bbase\b/.test(t) || /\biniziale\b/.test(t) || /\bobbligatorio\b/.test(t)) out = 'PRIMO_CORSO';
  }
  return out;
};

// Sinonimi/alias per certificazioni corsi e formatori (normalizzati)
export const CERT_SYNONYMS: Record<string, string[]> = {
  sanitario: ['sanitario', 'blsd', 'bls d', 'bls', 'dae', 'defibrillatore', 'irc'],
  'primo soccorso': ['primo soccorso', 'addetto primo soccorso', 'ps', 'blsd', 'bls'],
  antincendio: ['antincendio', 'addetto antincendio', 'rischio basso', 'rischio medio', 'rischio alto', 'corso vvff', 'vvff', 'vigili del fuoco', 'prevenzione incendio', 'lotta antincendio', 'gestione emergenza'],
  'sicurezza generale': ['sicurezza generale', 'formazione generale', 'lavoratori generale'],
  'sicurezza specifica': ['sicurezza specifica', 'formazione specifica', 'lavoratori specifica', 'basso', 'medio', 'alto'],
  'preposto': ['preposto', 'formazione preposti', 'aggiornamento preposti'],
  'rspp': ['rspp', 'responsabile servizio prevenzione e protezione'],
  'aspp': ['aspp', 'addetto servizio prevenzione e protezione'],
};

export const expandTerms = (term: string): string[] => {
  const t = normalizeText(term);
  const out = new Set<string>([t]);
  Object.entries(CERT_SYNONYMS).forEach(([k, arr]) => {
    const key = normalizeText(k);
    const arrNorm = arr.map(x => normalizeText(x));
    const matches = t.includes(key) || key.includes(t) || arrNorm.some(a => t.includes(a) || a.includes(t));
    if (matches) {
      arrNorm.forEach(x => out.add(x));
      out.add(key);
    }
  });
  return Array.from(out);
};

export const normalizeCertList = (certs?: string[] | string): string[] => {
  if (Array.isArray(certs)) return certs;
  if (typeof certs === 'string') return certs.split(',').map(c => c.trim()).filter(Boolean);
  return [];
};

// Generic extraction of course arrays from various API response shapes
export const extractCourses = (res: any): any[] => {
  if (Array.isArray(res)) return res as any[];
  if (Array.isArray(res?.courses)) return res.courses as any[];
  if (Array.isArray(res?.items)) return res.items as any[];
  if (Array.isArray(res?.results)) return res.results as any[];
  if (Array.isArray(res?.data)) return res.data as any[];
  return [] as any[];
};

export const toIdString = (value: unknown): string => {
  try {
    if (value == null) return '';
    return String((value as any).id ?? value);
  } catch {
    return '';
  }
};

export const timeStringToMinutes = (t: string): number => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
};

// NEW: Calcolo dei minuti totali selezionati dalle date del form
export function computeTotalSelectedMinutes(
  dates: Array<Partial<Pick<ScheduleDateEntry, 'start' | 'end'>>> | undefined,
  timeStringToMinutesFn: (time: string) => number = timeStringToMinutes
): number {
  if (!Array.isArray(dates) || dates.length === 0) return 0;
  return dates.reduce((sum, d) => {
    const start = d?.start;
    const end = d?.end;
    if (!start || !end) return sum;
    const s = timeStringToMinutesFn(String(start));
    const e = timeStringToMinutesFn(String(end));
    if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s) return sum;
    return sum + (e - s);
  }, 0);
}

export const formatDate = (isoDate: string): string => new Date(isoDate).toLocaleDateString('it-IT');

export const computeTrainerCertFilter = (
  selectedCourse: any,
  selectedCourseVariants: any[] | undefined,
  trainings: any[],
  formData: { risk_level?: string; course_type?: string },
  normalizeTextFn: (s?: unknown) => string = normalizeText,
  expandTermsFn: (term: string) => string[] = expandTerms
): { allOf: string[]; anyOf: string[] } => {
  const rawTitle = (selectedCourse as any)?.title || (selectedCourse as any)?.name;
  const title = normalizeTextFn(rawTitle || '');
  if (!title) {
    return { allOf: [], anyOf: [] };
  }

  const source = (selectedCourseVariants && Array.isArray(selectedCourseVariants) && selectedCourseVariants.length > 0)
    ? selectedCourseVariants
    : (trainings as any[]);
  const exactForDyn = (source as any[]).filter((t: any) => matchByExactNormalizedTitle((t.title || t.name), rawTitle, normalizeTextFn));
  const variants = exactForDyn.length > 0
    ? exactForDyn
    : (source as any[]).filter((t: any) => sameCourseGroup((t.title || t.name), rawTitle, normalizeTextFn));

  let filtered = variants;
  if (formData?.risk_level) filtered = filtered.filter((v: any) => getVariantRisk(v) === normalizeRiskValue(formData.risk_level));
  if (formData?.course_type) filtered = filtered.filter((v: any) => getVariantType(v) === normalizeCourseTypeValue(formData.course_type));

  const lists: string[][] = filtered.map((v: any) => {
    // Supporta sia array che stringhe separate da virgola
    const c1 = (v as any).certifications as unknown;
    if (Array.isArray(c1)) {
      const base = (c1 as unknown[]).map(s => normalizeTextFn(String(s))).filter(Boolean);
      return Array.from(new Set(base.flatMap(expandTermsFn)));
    }
    if (typeof c1 === 'string' && c1.trim()) {
      // Caso stringa separata da virgola (formato backend)
      const base = c1.split(',').map(s => normalizeTextFn(s)).filter(Boolean);
      return Array.from(new Set(base.flatMap(expandTermsFn)));
    }
    const c2 = (v as any).requiredCerts as unknown;
    if (Array.isArray(c2)) {
      const base = (c2 as unknown[]).map(s => normalizeTextFn(String(s))).filter(Boolean);
      return Array.from(new Set(base.flatMap(expandTermsFn)));
    }
    if (typeof c2 === 'string' && c2.trim()) {
      const base = c2.split(',').map(s => normalizeTextFn(s)).filter(Boolean);
      return Array.from(new Set(base.flatMap(expandTermsFn)));
    }
    const d = (v as any).details as any;
    if (d && Array.isArray(d.certifications)) {
      const base = (d.certifications as unknown[]).map(s => normalizeTextFn(String(s))).filter(Boolean);
      return Array.from(new Set(base.flatMap(expandTermsFn)));
    }
    if (d && typeof d.certifications === 'string' && d.certifications.trim()) {
      const base = d.certifications.split(',').map((s: string) => normalizeTextFn(s)).filter(Boolean);
      return Array.from(new Set(base.flatMap(expandTermsFn)));
    }
    if (d && Array.isArray(d.requiredCerts)) {
      const base = (d.requiredCerts as unknown[]).map(s => normalizeTextFn(String(s))).filter(Boolean);
      return Array.from(new Set(base.flatMap(expandTermsFn)));
    }
    if (d && typeof d.requiredCerts === 'string' && d.requiredCerts.trim()) {
      const base = d.requiredCerts.split(',').map((s: string) => normalizeTextFn(s)).filter(Boolean);
      return Array.from(new Set(base.flatMap(expandTermsFn)));
    }
    return [] as string[];
  });

  const all = lists.filter(arr => arr.length > 0);
  if (all.length === 0) {
    return { allOf: [], anyOf: [] };
  }
  const intersect = (arrays: string[][]): string[] => {
    const base = arrays[0] || [];
    return base.filter(x => arrays.every(arr => arr.includes(x)));
  };
  const union = (arrays: string[][]): string[] => Array.from(new Set(arrays.flat()));
  const result = { allOf: intersect(all), anyOf: union(all) };
  return result;
};

// NEW: Filtra i formatori in base al filtro certificazioni calcolato
export function filterTrainersByCerts(
  trainers: Trainer[] = [],
  filter: CertificateFilter | undefined,
  normalizeTextFn: (s?: unknown) => string = normalizeText
): Trainer[] {
  const allOf = (filter?.allOf || []).map(normalizeTextFn).filter(Boolean);
  const anyOf = (filter?.anyOf || []).map(normalizeTextFn).filter(Boolean);

  // 🔍 DEBUG: Analizza struttura trainers

  // Se non ci sono vincoli, tutti i formatori sono idonei
  if (allOf.length === 0 && anyOf.length === 0) {
    return trainers || [];
  }

  let debugCount = 0;
  const filtered = (trainers || []).filter(tr => {
    const rawCerts = tr?.certifications;
    const certs = normalizeCertList(rawCerts).map(normalizeTextFn);

    // Espandi anche le certificazioni del trainer per matching flessibile
    const expandedTrainerCerts = certs.flatMap(c => expandTerms(c));

    // LOGICA CORRETTA: 
    // - Se allOf non è vuoto, il trainer DEVE avere tutte quelle cert (comuni a tutte le varianti)
    // - Altrimenti, basta che abbia almeno una cert in anyOf
    let match = false;
    if (allOf.length > 0) {
      // Deve avere TUTTE le cert obbligatorie (comuni)
      match = allOf.every(c => expandedTrainerCerts.includes(c));
    } else if (anyOf.length > 0) {
      // Basta che ne abbia almeno una
      match = anyOf.some(c => expandedTrainerCerts.includes(c));
    }

    // Debug dettagliato per i primi 2 trainers
    if (debugCount < 2) {
      debugCount++;
    }

    return match;
  });

  return filtered;
}

export function buildSchedulePayload(
  formData: ScheduleFormData,
  isEditing: boolean,
  scheduleId: string | number | null,
  datesArr: Array<ScheduleDateEntry & { trainerId?: string; coTrainerId?: string }>,
  selectedCompanies: (string | number)[],
  selectedPersons: (string | number)[],
  attendance: (string | number)[][],
  status: string,
) {
  const firstDate = datesArr[0];
  const lastDate = datesArr[datesArr.length - 1];

  const startDateStr = firstDate?.date || new Date().toISOString().split('T')[0];
  const endDateStr = lastDate?.date || startDateStr;

  const startDateTimeLocal = `${startDateStr}T${firstDate?.start || '09:00'}:00`;
  const endDateTimeLocal = `${endDateStr}T${lastDate?.end || '17:00'}:00`;
  const startDateTimeISO = new Date(startDateTimeLocal).toISOString();
  const endDateTimeISO = new Date(endDateTimeLocal).toISOString();

  // ✅ FIX: Normalizza employee_ids a stringa per consistenza con backend/frontend
  // P48 FIX: Include sessionIndex per supportare più sessioni nella stessa data
  const attendanceArr = datesArr.map((dt, idx: number) => ({
    date: dt.date,
    sessionIndex: idx,  // P48: Unique identifier for each session
    employee_ids: (attendance[idx] || []).map(id => String(id))
  }));

  const validCompanyIds = (selectedCompanies || []).filter(id => id !== null && id !== undefined);
  const validPersonIds = (selectedPersons || []).filter(id => id !== null && id !== undefined);

  const schedulePayload: any = {
    courseId: formData.training_id,
    startDate: startDateTimeISO,
    endDate: endDateTimeISO,
    location: formData.location,
    maxParticipants: formData.max_participants,
    notes: formData.notes,
    deliveryMode: formData.delivery_mode,
    isPublic: formData.isPublic || false,
    riskLevel: formData.risk_level || undefined,
    courseType: formData.course_type || undefined,
    dates: datesArr.map(dt => ({
      date: dt.date,
      start: dt.start,
      end: dt.end,
      trainerId: dt.trainerId && String(dt.trainerId).trim() ? String(dt.trainerId) : null,
      coTrainerId: dt.coTrainerId && String(dt.coTrainerId).trim() ? String(dt.coTrainerId) : null,
    })),
    companyIds: validCompanyIds.map(id => String(id)),
    personIds: validPersonIds.map(id => String(id)),
    attendance: attendanceArr,
    status,
  };

  if (isEditing && scheduleId) {
    return { ...schedulePayload, id: scheduleId };
  }
  return schedulePayload;
};

export function computeDynamicRiskAndTypeOptions(
  selectedCourse: any,
  selectedCourseVariants: any[] | undefined,
  trainings: any[],
  formData: { risk_level?: string; course_type?: string },
  normalizeText: (s?: unknown) => string,
  RISK_LEVEL_OPTIONS: Option[],
  COURSE_TYPE_OPTIONS: Option[]
): { riskOpts: Option[]; typeOpts: Option[]; riskValid: boolean; typeValid: boolean; titleEmpty: boolean } {
  const rawTitle = (selectedCourse as any)?.title || (selectedCourse as any)?.name;
  const title = normalizeText(rawTitle || '');

  // Se non c'è titolo (nessun corso selezionato), non mostrare pillole
  if (!title) {
    const riskOpts: Option[] = [];
    const typeOpts: Option[] = [];
    const riskValid = !formData.risk_level || !!riskOpts.find(o => o.value === formData.risk_level);
    const typeValid = !formData.course_type || !!typeOpts.find(o => o.value === formData.course_type);
    if (process.env.NODE_ENV === 'development') {
    }
    return { riskOpts, typeOpts, riskValid, typeValid, titleEmpty: true };
  }

  const source = (selectedCourseVariants && Array.isArray(selectedCourseVariants) && selectedCourseVariants.length > 0)
    ? selectedCourseVariants
    : (trainings as any[]);
  const exactForDyn = (source as any[]).filter((t: any) => matchByExactNormalizedTitle((t.title || t.name), rawTitle, normalizeText));
  const variants = exactForDyn.length > 0
    ? exactForDyn
    : (source as any[]).filter((t: any) => sameCourseGroup((t.title || t.name), rawTitle, normalizeText));

  // Se non troviamo varianti per il macrocorso selezionato, prova a usare i valori del corso selezionato
  if (!Array.isArray(variants) || variants.length === 0) {
    // DEBUG: Log struttura selectedCourse PRIMA di estrarre i campi
    if (process.env.NODE_ENV === 'development') {
    }

    const courseRisk = getVariantRisk(selectedCourse);
    const courseType = getVariantType(selectedCourse);

    const riskOpts = courseRisk
      ? RISK_LEVEL_OPTIONS.filter(o => String(o.value) === String(courseRisk))
      : [];
    const typeOpts = courseType
      ? COURSE_TYPE_OPTIONS.filter(o => String(o.value) === String(courseType))
      : [];

    const riskValid = !formData.risk_level || !!riskOpts.find(o => o.value === formData.risk_level);
    const typeValid = !formData.course_type || !!typeOpts.find(o => o.value === formData.course_type);

    if (process.env.NODE_ENV === 'development') {
    }
    return { riskOpts, typeOpts, riskValid, typeValid, titleEmpty: false };
  }

  const filteredByRisk = formData.risk_level
    ? variants.filter((v: any) => getVariantRisk(v) === normalizeRiskValue(formData.risk_level))
    : variants;
  const filteredByType = formData.course_type
    ? variants.filter((v: any) => getVariantType(v) === normalizeCourseTypeValue(formData.course_type))
    : variants;

  const riskSet = new Set<string>(filteredByType.map((v: any) => getVariantRisk(v)).filter(Boolean));
  const typeSet = new Set<string>(filteredByRisk.map((v: any) => getVariantType(v)).filter(Boolean));

  // Fallback: se non ci sono varianti di rischio ma i titoli indicano A/B/C per Primo Soccorso, deduci dalle lettere presenti
  if (riskSet.size === 0) {
    const fallback = new Set<string>();
    for (const v of variants) {
      const vt = normalizeText(((v as any).title || (v as any).name || '') as string);
      const isPs = /\b(primo\s+socc|ps)\b/.test(vt);
      if (isPs) {
        if (/\b(?:cat|categ|categoria|gruppo|classe)?\s*[.:]?\s*a\b/.test(vt)) fallback.add('A');
        if (/\b(?:cat|categ|categoria|gruppo|classe)?\s*[.:]?\s*b\b/.test(vt)) fallback.add('B');
        if (/\b(?:cat|categ|categoria|gruppo|classe)?\s*[.:]?\s*c\b/.test(vt)) fallback.add('C');
      }
      if (/\bbasso\b/.test(vt)) fallback.add('BASSO');
      if (/\bmedio\b/.test(vt)) fallback.add('MEDIO');
      if (/\balto\b/.test(vt)) fallback.add('ALTO');
    }
    if (fallback.size > 0) {
      riskSet.clear();
      for (const r of fallback) riskSet.add(r);
    }
  }

  const riskOpts = (riskSet.size > 0)
    ? RISK_LEVEL_OPTIONS.filter(o => riskSet.has(String(o.value)))
    : [];
  const typeOpts = (typeSet.size > 0)
    ? COURSE_TYPE_OPTIONS.filter(o => typeSet.has(String(o.value)))
    : [];

  const riskValid = !formData.risk_level || !!riskOpts.find(o => o.value === formData.risk_level);
  const typeValid = !formData.course_type || !!typeOpts.find(o => o.value === formData.course_type);

  if (process.env.NODE_ENV === 'development') {
  }

  return { riskOpts, typeOpts, riskValid, typeValid, titleEmpty: false };
}

export function resolveVariantSelection(
  selectedCourse: any,
  selectedCourseVariants: any[] | undefined,
  trainings: any[],
  formData: { training_id?: string | number; risk_level?: string; course_type?: string },
  normalizeText: (s?: unknown) => string,
  dynamicRiskOptions: Option[],
  dynamicCourseTypeOptions: Option[]
): { id?: string | number; details?: any } {
  const rawTitle = (selectedCourse as any)?.title || (selectedCourse as any)?.name;
  const title = normalizeText(rawTitle || '');
  if (!title) return {};

  const source = (selectedCourseVariants && Array.isArray(selectedCourseVariants) && selectedCourseVariants.length > 0) ? selectedCourseVariants : trainings;
  const exactForSel = (source as any[]).filter((t: any) => matchByExactNormalizedTitle(((t as any).title || (t as any).name) as string, rawTitle, normalizeText));
  const variants = exactForSel.length > 0
    ? exactForSel
    : (source as any[]).filter((t: any) => sameCourseGroup(((t as any).title || (t as any).name) as string, rawTitle, normalizeText));

  let filtered = variants;
  if (formData.risk_level) {
    filtered = filtered.filter((v: any) => getVariantRisk(v) === normalizeRiskValue(formData.risk_level));
  }
  if (formData.course_type) {
    filtered = filtered.filter((v: any) => getVariantType(v) === normalizeCourseTypeValue(formData.course_type));
  }

  const hasRiskOptions = (dynamicRiskOptions?.length || 0) > 0;
  const hasTypeOptions = (dynamicCourseTypeOptions?.length || 0) > 0;

  if (process.env.NODE_ENV === 'development') {
  }

  if (filtered.length === 1) {
    const only = filtered[0] as any;
    if (process.env.NODE_ENV === 'development') {
    }
    return { id: only.id, details: only };
  }

  if (!hasRiskOptions && !hasTypeOptions && variants.length >= 1 && !formData.training_id) {
    const first = variants[0] as any;
    if (process.env.NODE_ENV === 'development') {
    }
    return { id: first.id, details: first };
  }

  if (process.env.NODE_ENV === 'development') {
  }
  return {};
}

export function deriveRequiredCerts(
  selectedCourse: any,
  selectedCourseVariants: any[] | undefined,
  trainings: any[],
  formData: { risk_level?: string; course_type?: string },
  normalizeText: (s?: unknown) => string
): string[] {
  const directCerts = (selectedCourse as any)?.certifications as unknown;
  let certsFromSelected: string[] = [];
  if (Array.isArray(directCerts)) certsFromSelected = (directCerts as unknown[]).map(x => String(x)).filter(Boolean);
  else if (typeof directCerts === 'string') certsFromSelected = (directCerts as string).split(',').map(c => c.trim()).filter(Boolean);

  if ((certsFromSelected?.length || 0) > 0) {
    if (process.env.NODE_ENV === 'development') {
    }
    return certsFromSelected;
  }

  const rawTitle = (selectedCourse as any)?.title || (selectedCourse as any)?.name;
  const title = normalizeText(rawTitle || '');
  if (!title) return [] as string[];

  const source = (selectedCourseVariants && Array.isArray(selectedCourseVariants) && selectedCourseVariants.length > 0)
    ? selectedCourseVariants
    : (trainings as any[]);
  const exactForCerts = (source as any[]).filter((t: any) => matchByExactNormalizedTitle((t.title || t.name), rawTitle, normalizeText));
  const variants = exactForCerts.length > 0
    ? exactForCerts
    : (source as any[]).filter((t: any) => sameCourseGroup((t.title || t.name), rawTitle, normalizeText));

  let filtered = variants;
  if (formData.risk_level) {
    filtered = filtered.filter((v: any) => getVariantRisk(v) === normalizeRiskValue(formData.risk_level));
  }
  if (formData.course_type) {
    filtered = filtered.filter((v: any) => getVariantType(v) === normalizeCourseTypeValue(formData.course_type));
  }

  const lists: string[][] = filtered.map((v: any) => normalizeCertList((v as any).certifications));
  const flat = lists.flat().filter(Boolean);

  if (process.env.NODE_ENV === 'development') {
  }

  const uniq = Array.from(new Set(flat));
  return uniq;
}

export function getPersonIdsForCompanyUniversal(persons: Person[], companyId: string | number): (string | number)[] {
  const cid = String(companyId);
  return persons
    .filter((p) => {
      // P49: person.companyId = CTP UUID, person.company?.id = global Company UUID
      // Match against both independently (don't use ?? which short-circuits)
      return String(p.companyId ?? '') === cid || String(p.company?.id ?? '') === cid;
    })
    .map((p) => p.id)
    .filter((id): id is string | number => id !== undefined && id !== null);
}

// Import centralized types
export function validateScheduleForm(
  formData: ScheduleFormData,
  dynamicRiskOptions: Option[] = [],
  dynamicCourseTypeOptions: Option[] = [],
  timeStringToMinutes: (time: string) => number,
  courseDuration?: number | string,
  totalSelectedHours?: number
): ValidationResult {
  const err = (message: string): ValidationResult => ({ valid: false, error: message });

  // Corso selezionato
  if (!formData?.training_id) {
    return err('Seleziona un corso');
  }

  // Rischio e tipo richiesti solo se esistono opzioni dinamiche
  if ((dynamicRiskOptions?.length || 0) > 1 && !formData?.risk_level) {
    return err('Seleziona il livello di rischio');
  }
  if ((dynamicCourseTypeOptions?.length || 0) > 1 && !formData?.course_type) {
    return err('Seleziona il tipo di corso');
  }

  // Modalità di erogazione
  if (!('delivery_mode' in formData) || !formData.delivery_mode) {
    return err('Seleziona la modalità di erogazione');
  }

  // Date e orari
  const dates = formData?.dates || [];
  if (!Array.isArray(dates) || dates.length === 0) {
    return err('Aggiungi almeno una data');
  }

  // ✅ NEW: Valida che le date successive non siano precedenti alla prima data
  const firstDate = dates[0]?.date;
  if (firstDate && dates.length > 1) {
    const firstDateObj = new Date(firstDate);
    for (let i = 1; i < dates.length; i++) {
      const d = dates[i] as any;
      if (d?.date) {
        const currentDateObj = new Date(d.date);
        if (currentDateObj < firstDateObj) {
          return err(`La data della sessione ${i + 1} non può essere precedente alla prima data (${firstDate})`);
        }
      }
    }
  }

  for (let i = 0; i < dates.length; i++) {
    const d = dates[i] as any;
    const idx = i + 1;
    if (!d?.date) return err(`Data ${idx} è obbligatoria`);
    if (!d?.start) return err(`Orario inizio ${idx} è obbligatorio`);
    if (!d?.end) return err(`Orario fine ${idx} è obbligatorio`);

    // Orari coerenti
    if (d.start && d.end) {
      const startMinutes = timeStringToMinutes(String(d.start));
      const endMinutes = timeStringToMinutes(String(d.end));
      if (!(startMinutes < endMinutes)) {
        return err(`L'orario di fine deve essere successivo all'orario di inizio per la data ${idx}`);
      }
    }

    // Trainer e co-trainer
    const trainerId = d.trainerId;
    if (!trainerId || String(trainerId).trim() === '') {
      return err(`Seleziona un formatore per la sessione ${idx}`);
    }
    const coTrainerId = d.coTrainerId;
    if (trainerId && coTrainerId && String(trainerId) === String(coTrainerId)) {
      return err(`Il co-formatore non può coincidere con il formatore nella sessione ${idx}`);
    }
  }

  // Coerenza durata totale selezionata vs durata corso (se disponibili)
  const durationNum = Number(courseDuration ?? 0);
  const totalHoursNum = Number(totalSelectedHours ?? 0);
  if (Number.isFinite(durationNum) && durationNum > 0 && Number.isFinite(totalHoursNum) && totalHoursNum > 0) {
    if (totalHoursNum < durationNum) {
      return err('Le ore selezionate sono inferiori alla durata del corso');
    }
  }

  return { valid: true, error: '' };
}

export type {
  Training,
  ScheduleDateEntry,
  Option,
  Trainer,
  Person,
  ScheduleFormData,
  ValidationResult,
  DynamicOptionsResult,
} from './types';