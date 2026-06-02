import { apiGet } from './api';

interface Course {
  id: string;
  title: string;
  shortDescription: string;
  category: string;
  subcategory?: string;
  riskLevel: 'ALTO' | 'MEDIO' | 'BASSO' | 'A' | 'B' | 'C';
  courseType: 'PRIMO_CORSO' | 'AGGIORNAMENTO';
  duration: number;
  maxParticipants: number;
  image1Url?: string;
  slug: string;
}

interface GroupedCourse {
  title: string;
  category: string;
  variants: Course[];
  mainCourse: Course;
}

interface CourseTitle {
  title: string;
  variantCount: number;
  category: string;
}

/**
 * Servizio per gestire i corsi raggruppati per titolo
 */
export class GroupedCoursesService {

  /**
   * Ottiene tutti i titoli dei corsi disponibili
   */
  static async getCourseTitles(): Promise<CourseTitle[]> {
    try {
      // Endpoint corretto secondo le routes backend: /api/v1/public/courses/titles/list
      const resp = await apiGet<any>('/api/v1/public/courses/titles/list', { _skipGdprCheck: true });
      // Lo shape può essere sia { data: CourseTitle[] } sia direttamente l'array; gestiamo entrambi
      const data = (resp?.data ?? resp?.titles ?? resp) as CourseTitle[] | undefined;
      if (Array.isArray(data) && data.length > 0) return data;
      // Se l'endpoint risponde ma non fornisce dati utili, eseguiamo fallback locale
      throw new Error('Empty titles list response');
    } catch (error) {
      // Fallback: ricava i titoli dal catalogo pubblico
      try {
        const grouped = await this.getGroupedCourses();
        if (!grouped || grouped.length === 0) return [];
        // Costruisci CourseTitle[] da grouped
        return grouped.map(g => ({
          title: g.title,
          category: g.category,
          variantCount: g.variants.length,
        })).sort((a, b) => a.title.localeCompare(b.title, 'it', { sensitivity: 'base' }));
      } catch (e) {
        return [];
      }
    }
  }

  /**
   * Ottiene tutti i corsi raggruppati per titolo
   */
  static async getGroupedCourses(): Promise<GroupedCourse[]> {
    try {
      // Richiedi tutti i corsi (limit alto per non perdere nessun corso)
      const resp = await apiGet('/api/v1/public/courses?limit=500', { _skipGdprCheck: true }) as any;
      const extractCourses = (r: any): Course[] => {
        if (Array.isArray(r)) return r as Course[];
        if (Array.isArray(r?.courses)) return r.courses as Course[];
        if (Array.isArray(r?.data?.courses)) return r.data.courses as Course[];
        if (Array.isArray(r?.data)) return r.data as Course[];
        if (Array.isArray(r?.items)) return r.items as Course[];
        if (Array.isArray(r?.results)) return r.results as Course[];
        return [] as Course[];
      };
      const courses = extractCourses(resp);
      return this.groupCoursesByTitle(courses);
    } catch (error) {
      return [];
    }
  }

  /**
   * Dati mock per testing quando l'API non è disponibile
   */
  private static getMockCourses(): Course[] {
    return [
      {
        id: '1',
        title: 'Primo Soccorso',
        shortDescription: 'Corso di primo soccorso aziendale per la gestione delle emergenze',
        category: 'Sicurezza',
        riskLevel: 'BASSO',
        courseType: 'PRIMO_CORSO',
        duration: 12,
        maxParticipants: 15,
        slug: 'primo-soccorso-basso'
      },
      {
        id: '2',
        title: 'Primo Soccorso',
        shortDescription: 'Corso di primo soccorso aziendale per la gestione delle emergenze',
        category: 'Sicurezza',
        riskLevel: 'MEDIO',
        courseType: 'PRIMO_CORSO',
        duration: 16,
        maxParticipants: 15,
        slug: 'primo-soccorso-medio'
      },
      {
        id: '3',
        title: 'Primo Soccorso',
        shortDescription: 'Corso di primo soccorso aziendale per la gestione delle emergenze',
        category: 'Sicurezza',
        riskLevel: 'ALTO',
        courseType: 'PRIMO_CORSO',
        duration: 16,
        maxParticipants: 15,
        slug: 'primo-soccorso-alto'
      },
      {
        id: '4',
        title: 'Primo Soccorso',
        shortDescription: 'Aggiornamento corso di primo soccorso aziendale',
        category: 'Sicurezza',
        riskLevel: 'BASSO',
        courseType: 'AGGIORNAMENTO',
        duration: 4,
        maxParticipants: 15,
        slug: 'primo-soccorso-aggiornamento-basso'
      },
      {
        id: '5',
        title: 'Antincendio',
        shortDescription: 'Corso antincendio per addetti alla prevenzione incendi',
        category: 'Sicurezza',
        riskLevel: 'BASSO',
        courseType: 'PRIMO_CORSO',
        duration: 4,
        maxParticipants: 15,
        slug: 'antincendio-basso'
      },
      {
        id: '6',
        title: 'Antincendio',
        shortDescription: 'Corso antincendio per addetti alla prevenzione incendi',
        category: 'Sicurezza',
        riskLevel: 'MEDIO',
        courseType: 'PRIMO_CORSO',
        duration: 8,
        maxParticipants: 15,
        slug: 'antincendio-medio'
      },
      {
        id: '7',
        title: 'Antincendio',
        shortDescription: 'Aggiornamento corso antincendio',
        category: 'Sicurezza',
        riskLevel: 'ALTO',
        courseType: 'AGGIORNAMENTO',
        duration: 5,
        maxParticipants: 15,
        slug: 'antincendio-aggiornamento-alto'
      }
    ];
  }

  static async getUnifiedCourseByTitle(courseTitle: string): Promise<{
    title: string;
    category: string;
    variants: Course[];
    mainCourse: Course;
  } | null> {
    // Normalizzatore robusto per confronti titolo
    const normalize = (s: string) => (s || '')
      .toLowerCase()
      .normalize('NFD').replace(/\p{Diacritic}/gu, '')
      .replace(/&/g, ' e ')
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Normalizza gli apostrofi/virgolette tipografici in ASCII per evitare 404 lato backend
    const normalizeApostrophes = (s: string) => (s || '')
      .replace(/[\u2018\u2019\u201B]/g, "'") // ‘ ’ ‛ → '
      .replace(/[\u201C\u201D]/g, '"');      // “ ” → "

    // Stopwords italiane comuni da ignorare nel matching
    const STOPWORDS = new Set([
      'di', 'dei', 'degli', 'delle', 'della', 'del', 'dell', 'lo', 'la', 'le', 'gli', 'il', 'i', 'e', 'ed', 'da', 'un', 'una', 'uno',
      'per', 'con', 'su', 'tra', 'fra', 'al', 'allo', 'alla', 'ai', 'agli', 'alle', 'dello', 'in', 'a', 'ad', 'dal', 'dai', 'dagli', 'dalle'
    ]);
    const tokenize = (s: string): string[] => normalize(s).split(' ').filter(w => w && !STOPWORDS.has(w));
    const tokenOverlap = (a: string[] | Set<string>, b: string[]): number => {
      const aSet = a instanceof Set ? a : new Set(a);
      let overlap = 0;
      const bSet = new Set(b);
      for (const t of aSet) if (bSet.has(t)) overlap++;
      return overlap;
    };

    const tryFetch = async (t: string) => {
      const attempt = async (titleVariant: string) => {
        const resp = await apiGet<{
          baseTitle: string;
          category: string;
          subcategory?: string;
          variants: Course[];
        }>(`/api/v1/public/courses/unified/${encodeURIComponent(titleVariant)}`, { _skipGdprCheck: true });

        const rawVariants = (resp as any)?.variants ?? [];
        const title = (resp as any)?.baseTitle ?? titleVariant;
        const category = (resp as any)?.category ?? '';
        // Ordiniamo le varianti come in groupCoursesByTitle per coerenza
        const sortedVariants = [...rawVariants].sort((a, b) => {
          if (a.courseType !== b.courseType) {
            return a.courseType === 'PRIMO_CORSO' ? -1 : 1;
          }
          const riskOrder: Record<string, number> = { 'BASSO': 1, 'C': 1, 'MEDIO': 2, 'B': 2, 'ALTO': 3, 'A': 3 };
          const aRisk = riskOrder[a.riskLevel] ?? 0;
          const bRisk = riskOrder[b.riskLevel] ?? 0;
          return aRisk - bRisk;
        });
        const mainCourse = sortedVariants[0] ?? rawVariants[0];

        return { title, category, variants: sortedVariants, mainCourse };
      };

      const candidates = Array.from(new Set([t, normalizeApostrophes(t)]));
      let lastError: unknown;
      for (const cand of candidates) {
        try {
          return await attempt(cand);
        } catch (e) {
          lastError = e;
        }
      }
      throw lastError || new Error('Unified course fetch failed');
    };

    try {
      // Primo tentativo: titolo così com'è
      return await tryFetch(courseTitle);
    } catch (err) {
      // Fallback 1: prova a risolvere il titolo dalla lista titoli con matching a token
      try {
        const titles = await this.getCourseTitles();
        if (titles && (titles as any[]).length) {
          const getTitleStr = (t: any) => typeof t === 'string' ? t : t?.title;
          const wantedTokens = tokenize(courseTitle);
          let bestTitle: string | null = null;
          let bestScore = -1;
          for (const t of titles as any[]) {
            const titleStr = getTitleStr(t);
            if (!titleStr) continue;
            const tokens = tokenize(titleStr);
            const allIncluded = wantedTokens.every(tok => tokens.includes(tok));
            const score = tokenOverlap(wantedTokens, tokens);
            if (allIncluded) {
              bestTitle = titleStr;
              bestScore = score;
              break;
            }
            if (score > bestScore) {
              bestScore = score;
              bestTitle = titleStr;
            }
          }
          if (bestTitle) {
            try {
              return await tryFetch(bestTitle);
            } catch { }
          }
        }
      } catch (_) {
        // Ignora, gestito nei fallback successivi
      }

      // Fallback 1.5: usa la ricerca pubblica per ricavare un titolo rappresentativo e riprova
      try {
        const qRaw = (courseTitle || '').trim();
        if (qRaw.length >= 2) {
          const q = encodeURIComponent(qRaw);
          const resp = await apiGet<any>(`/api/v1/public/courses/search?q=${q}&limit=10`, { _skipGdprCheck: true });
          const listCandidate = (resp as any);
          const list = Array.isArray(listCandidate?.data)
            ? listCandidate.data
            : Array.isArray(listCandidate)
              ? listCandidate
              : Array.isArray(listCandidate?.items)
                ? listCandidate.items
                : Array.isArray(listCandidate?.results)
                  ? listCandidate.results
                  : [];
          const wantedTokens = tokenize(courseTitle);
          let bestTitle: string | null = null;
          let bestScore = -1;
          for (const item of list) {
            const titleStr = item?.title ?? '';
            if (!titleStr) continue;
            const tokens = tokenize(titleStr);
            const allIncluded = wantedTokens.every(tok => tokens.includes(tok));
            const score = tokenOverlap(wantedTokens, tokens);
            if (allIncluded) {
              bestTitle = titleStr;
              bestScore = score;
              break;
            }
            if (score > bestScore) {
              bestScore = score;
              bestTitle = titleStr;
            }
          }
          if (bestTitle) {
            return await tryFetch(bestTitle);
          }
        }
      } catch (e: unknown) {
        // Ignora 400 (bad request per query troppo corta/parametri mancanti), logga il resto a livello debug
        if ((e as any)?.response?.status && (e as any).response.status !== 400) {
        }
        // Ignora, gestito nel fallback successivo
      }

      // Fallback 2: ricostruisci localmente dal catalogo corsi con matching a token
      try {
        const grouped = await this.getGroupedCourses();
        if (grouped && grouped.length) {
          const wantedTokens = tokenize(courseTitle);
          let match = grouped.find(g => {
            const tokens = tokenize(g.title);
            return wantedTokens.every(tok => tokens.includes(tok));
          });
          if (!match) {
            let best: GroupedCourse | null = null;
            let bestScore = -1;
            for (const g of grouped) {
              const score = tokenOverlap(wantedTokens, tokenize(g.title));
              if (score > bestScore) {
                best = g;
                bestScore = score;
              }
            }
            if (bestScore > 0) match = best!;
          }
          if (match) {
            const variants = [...match.variants];
            const sortedVariants = [...variants].sort((a, b) => {
              if (a.courseType !== b.courseType) {
                return a.courseType === 'PRIMO_CORSO' ? -1 : 1;
              }
              const riskOrder: Record<string, number> = { 'BASSO': 1, 'C': 1, 'MEDIO': 2, 'B': 2, 'ALTO': 3, 'A': 3 };
              const aRisk = riskOrder[a.riskLevel] ?? 0;
              const bRisk = riskOrder[b.riskLevel] ?? 0;
              return aRisk - bRisk;
            });
            const mainCourse = sortedVariants[0] ?? variants[0];
            return { title: match.title, category: match.category, variants, mainCourse };
          }
        }
      } catch (_) {
        // Ignora, segnaleremo l'assenza sotto
      }

      return null;
    }
  }

  /**
   * Raggruppa i corsi per titolo
   */
  static groupCoursesByTitle(courses: Course[]): GroupedCourse[] {
    const grouped = new Map<string, Course[]>();

    // Raggruppa i corsi per titolo
    courses.forEach(course => {
      const title = course.title;
      if (!grouped.has(title)) {
        grouped.set(title, []);
      }
      grouped.get(title)!.push(course);
    });

    // Costruisce l'array finale mantenendo un ordinamento coerente
    const result: GroupedCourse[] = [];
    grouped.forEach((variants, title) => {
      const sortedVariants = [...variants].sort((a, b) => {
        if (a.courseType !== b.courseType) {
          return a.courseType === 'PRIMO_CORSO' ? -1 : 1;
        }
        const riskOrder: Record<string, number> = { 'BASSO': 1, 'C': 1, 'MEDIO': 2, 'B': 2, 'ALTO': 3, 'A': 3 };
        const aRisk = riskOrder[a.riskLevel] ?? 0;
        const bRisk = riskOrder[b.riskLevel] ?? 0;
        return aRisk - bRisk;
      });

      const mainCourse = sortedVariants[0] ?? variants[0];
      result.push({
        title,
        category: mainCourse.category,
        variants,
        mainCourse
      });
    });

    // Ordine prioritario: primo soccorso → antincendio → formazione dei lavoratori/sicurezza lavoratori → sicurezza generale → RLS → dirigenti → preposti → altri (alfabetico)
    const PRIORITY_KEYWORDS = [
      'primo soccorso',
      'antincendio',
      'formazione dei lavoratori',
      'sicurezza lavoratori',
      'sicurezza generale',
      'rls',
      'rappresentante dei lavoratori',
      'dirigenti',
      'preposti',
    ];

    const getPriority = (title: string): number => {
      const norm = title.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
      const idx = PRIORITY_KEYWORDS.findIndex(kw => norm.includes(kw));
      return idx === -1 ? PRIORITY_KEYWORDS.length : idx;
    };

    result.sort((a, b) => {
      const pa = getPriority(a.title);
      const pb = getPriority(b.title);
      if (pa !== pb) return pa - pb;
      return a.title.localeCompare(b.title, 'it');
    });

    return result;
  }

  static filterGroupedCourses(
    groupedCourses: GroupedCourse[],
    filters: {
      searchTerm?: string;
      category?: string;
      riskLevel?: string;
      courseType?: string;
    }
  ): GroupedCourse[] {
    const { searchTerm = '', category, riskLevel, courseType } = filters;

    const normalize = (s: string) => (s || '')
      .toLowerCase()
      .normalize('NFD').replace(/\p{Diacritic}/gu, '')
      .replace(/&/g, ' e ')
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const term = normalize(searchTerm);

    return groupedCourses
      .filter(gc => !category || gc.category === category)
      .map(gc => ({
        ...gc,
        variants: gc.variants.filter(v => {
          const matchesSearch = !term || normalize(v.title).includes(term);
          const matchesRisk = !riskLevel || v.riskLevel === riskLevel;
          const matchesType = !courseType || v.courseType === courseType;
          return matchesSearch && matchesRisk && matchesType;
        })
      }))
      .filter(gc => gc.variants.length > 0);
  }
}

export default GroupedCoursesService;