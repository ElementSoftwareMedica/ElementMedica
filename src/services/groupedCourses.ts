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
      const response = await apiGet('/api/public/courses/titles') as { data: CourseTitle[] };
      return response.data || [];
    } catch (error) {
      console.error('Error fetching course titles:', error);
      return [];
    }
  }

  /**
   * Ottiene tutti i corsi raggruppati per titolo
   */
  static async getGroupedCourses(): Promise<GroupedCourse[]> {
    try {
      const response = await apiGet('/api/public/courses') as { data: Course[] };
      const courses: Course[] = response.data || [];
      
      return this.groupCoursesByTitle(courses);
    } catch (error) {
      console.error('Error fetching grouped courses:', error);
      // Fallback con dati mock per testing
      return this.groupCoursesByTitle(this.getMockCourses());
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
        maxParticipants: 20,
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
        maxParticipants: 20,
        slug: 'antincendio-medio'
      },
      {
        id: '7',
        title: 'RSPP Modulo A',
        shortDescription: 'Corso per Responsabile del Servizio di Prevenzione e Protezione - Modulo A',
        category: 'RSPP',
        riskLevel: 'MEDIO',
        courseType: 'PRIMO_CORSO',
        duration: 28,
        maxParticipants: 25,
        slug: 'rspp-modulo-a'
      },
      {
        id: '8',
        title: 'Formazione Generale Lavoratori',
        shortDescription: 'Formazione generale per tutti i lavoratori sulla sicurezza',
        category: 'Formazione Lavoratori',
        riskLevel: 'BASSO',
        courseType: 'PRIMO_CORSO',
        duration: 4,
        maxParticipants: 30,
        slug: 'formazione-generale-lavoratori'
      }
    ];
  }

  /**
   * Ottiene un corso unificato per titolo con tutte le sue varianti
   */
  static async getUnifiedCourseByTitle(courseTitle: string): Promise<{
    title: string;
    category: string;
    variants: Course[];
    mainCourse: Course;
  } | null> {
    try {
      const response = await apiGet(`/api/public/courses/unified/${encodeURIComponent(courseTitle)}`) as { 
        data: {
          title: string;
          category: string;
          variants: Course[];
          mainCourse: Course;
        } 
      };
      return response.data || null;
    } catch (error) {
      console.error('Error fetching unified course:', error);
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

    // Converte in array di GroupedCourse
    return Array.from(grouped.entries()).map(([title, variants]) => {
      // Ordina le varianti: prima i primi corsi, poi gli aggiornamenti
      // All'interno di ogni tipo, ordina per livello di rischio (BASSO -> MEDIO -> ALTO)
      const sortedVariants = variants.sort((a, b) => {
        // Prima ordina per tipo di corso
        if (a.courseType !== b.courseType) {
          return a.courseType === 'PRIMO_CORSO' ? -1 : 1;
        }
        
        // Poi ordina per livello di rischio
        const riskOrder = { 'BASSO': 1, 'C': 1, 'MEDIO': 2, 'B': 2, 'ALTO': 3, 'A': 3 };
        const aRisk = riskOrder[a.riskLevel as keyof typeof riskOrder] || 0;
        const bRisk = riskOrder[b.riskLevel as keyof typeof riskOrder] || 0;
        
        return aRisk - bRisk;
      });

      // Il corso principale è il primo della lista ordinata
      const mainCourse = sortedVariants[0];

      return {
        title,
        category: mainCourse.category,
        variants: sortedVariants,
        mainCourse
      };
    }).sort((a, b) => a.title.localeCompare(b.title)); // Ordina alfabeticamente per titolo
  }

  /**
   * Filtra i corsi raggruppati in base ai criteri
   */
  static filterGroupedCourses(
    groupedCourses: GroupedCourse[],
    filters: {
      searchTerm?: string;
      category?: string;
      riskLevel?: string;
      courseType?: string;
    }
  ): GroupedCourse[] {
    const { searchTerm, category, riskLevel, courseType } = filters;

    return groupedCourses.filter(group => {
      // Filtro per termine di ricerca
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesTitle = group.title.toLowerCase().includes(searchLower);
        const matchesDescription = group.mainCourse.shortDescription.toLowerCase().includes(searchLower);
        const matchesCategory = group.category.toLowerCase().includes(searchLower);
        
        if (!matchesTitle && !matchesDescription && !matchesCategory) {
          return false;
        }
      }

      // Filtro per categoria
      if (category && group.category !== category) {
        return false;
      }

      // Filtro per livello di rischio - controlla se almeno una variante ha il livello richiesto
      if (riskLevel) {
        const hasRiskLevel = group.variants.some(variant => variant.riskLevel === riskLevel);
        if (!hasRiskLevel) {
          return false;
        }
      }

      // Filtro per tipo di corso - controlla se almeno una variante ha il tipo richiesto
      if (courseType) {
        const hasCourseType = group.variants.some(variant => variant.courseType === courseType);
        if (!hasCourseType) {
          return false;
        }
      }

      return true;
    });
  }
}

export default GroupedCoursesService;