import React, { useState, useEffect } from 'react';
import { Search, Filter, ChevronDown } from 'lucide-react';
import { PublicLayout } from '../../components/public/PublicLayout';
import { PublicButton } from '../../components/public/PublicButton';
import { CourseCard } from '../../components/public/CourseCard';
import { GroupedCourseCard } from '../../components/public/GroupedCourseCard';
import { GroupedCoursesService } from '../../services/groupedCourses';
import { useNavigate } from 'react-router-dom';
import { trackCtaEvent } from '../../services/logs';

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

/**
 * Pagina pubblica dei corsi di formazione
 * Con filtri per categoria, tipo di rischio e ricerca
 */
export const CoursesPage: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [groupedCourses, setGroupedCourses] = useState<GroupedCourse[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
  const [filteredGroupedCourses, setFilteredGroupedCourses] = useState<GroupedCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedRiskLevel, setSelectedRiskLevel] = useState('');
  const [selectedCourseType, setSelectedCourseType] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [isGroupedView, setIsGroupedView] = useState(true); // Default: vista raggruppata

  const categories = [
    'Sicurezza Generale',
    'Antincendio',
    'Primo Soccorso',
    'Lavori in Quota',
    'Spazi Confinati',
    'Movimentazione Manuale',
    'Videoterminali'
  ];

  const riskLevels = [
    { value: 'ALTO', label: 'Rischio Alto' },
    { value: 'MEDIO', label: 'Rischio Medio' },
    { value: 'BASSO', label: 'Rischio Basso' },
    { value: 'A', label: 'Categoria A' },
    { value: 'B', label: 'Categoria B' },
    { value: 'C', label: 'Categoria C' }
  ];

  const courseTypes = [
    { value: 'PRIMO_CORSO', label: 'Primo Corso' },
    { value: 'AGGIORNAMENTO', label: 'Aggiornamento' }
  ];

  // Carica i corsi al mount del componente
  useEffect(() => {
    const loadCourses = async () => {
      try {
        setLoading(true);
        
        // Carica i corsi raggruppati
        const grouped = await GroupedCoursesService.getGroupedCourses();
        setGroupedCourses(grouped);
        setFilteredGroupedCourses(grouped);
        
        // Estrae tutti i corsi individuali per la vista non raggruppata
        const allCourses = grouped.flatMap(group => group.variants);
        setCourses(allCourses);
        setFilteredCourses(allCourses);
        
      } catch (error) {
        console.error('Error loading courses:', error);
        
        // Fallback con dati mock in caso di errore
        const mockCourses: Course[] = [
          {
            id: '1',
            title: 'Sicurezza Generale Lavoratori',
            shortDescription: 'Corso base sulla sicurezza sul lavoro per tutti i settori',
            category: 'Sicurezza Generale',
            riskLevel: 'BASSO',
            courseType: 'PRIMO_CORSO',
            duration: 4,
            maxParticipants: 20,
            slug: 'sicurezza-generale-lavoratori-basso'
          },
          {
            id: '2',
            title: 'Sicurezza Generale Lavoratori',
            shortDescription: 'Corso sulla sicurezza sul lavoro per settori a rischio medio',
            category: 'Sicurezza Generale',
            riskLevel: 'MEDIO',
            courseType: 'PRIMO_CORSO',
            duration: 8,
            maxParticipants: 20,
            slug: 'sicurezza-generale-lavoratori-medio'
          },
          {
            id: '3',
            title: 'Primo Soccorso',
            shortDescription: 'Corso di primo soccorso aziendale',
            category: 'Primo Soccorso',
            riskLevel: 'BASSO',
            courseType: 'PRIMO_CORSO',
            duration: 12,
            maxParticipants: 15,
            slug: 'primo-soccorso-basso'
          }
        ];
        
        setCourses(mockCourses);
        setFilteredCourses(mockCourses);
        
        // Raggruppa i dati mock
        const mockGrouped = GroupedCoursesService.groupCoursesByTitle(mockCourses);
        setGroupedCourses(mockGrouped);
        setFilteredGroupedCourses(mockGrouped);
      } finally {
        setLoading(false);
      }
    };

    loadCourses();
  }, []);

  // Filtro dei corsi
  useEffect(() => {
    if (isGroupedView) {
      // Filtro per vista raggruppata
      const filtered = GroupedCoursesService.filterGroupedCourses(groupedCourses, {
        searchTerm,
        category: selectedCategory,
        riskLevel: selectedRiskLevel,
        courseType: selectedCourseType
      });
      setFilteredGroupedCourses(filtered);
    } else {
      // Filtro per vista individuale
      let filtered = courses;

      // Filtro per termine di ricerca
      if (searchTerm) {
        filtered = filtered.filter(course =>
          course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          course.shortDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
          course.category.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      // Filtro per categoria
      if (selectedCategory) {
        filtered = filtered.filter(course => course.category === selectedCategory);
      }

      // Filtro per livello di rischio
      if (selectedRiskLevel) {
        filtered = filtered.filter(course => course.riskLevel === selectedRiskLevel);
      }

      // Filtro per tipo di corso
      if (selectedCourseType) {
        filtered = filtered.filter(course => course.courseType === selectedCourseType);
      }

      setFilteredCourses(filtered);
    }
  }, [courses, groupedCourses, searchTerm, selectedCategory, selectedRiskLevel, selectedCourseType, isGroupedView]);

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setSelectedRiskLevel('');
    setSelectedCourseType('');
  };

  const getRiskLevelLabel = (riskLevel: string) => {
    const level = riskLevels.find(r => r.value === riskLevel);
    return level ? level.label : riskLevel;
  };

  const getCourseTypeLabel = (courseType: string) => {
    const type = courseTypes.find(t => t.value === courseType);
    return type ? type.label : courseType;
  };

  return (
    <PublicLayout>
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h1 className="text-4xl lg:text-5xl font-bold mb-6">
              Catalogo Corsi di Formazione
            </h1>
            <p className="text-xl text-white/90 max-w-3xl mx-auto">
              Scopri la nostra offerta completa di corsi sulla sicurezza sul lavoro, 
              certificati e riconosciuti a norma di legge
            </p>
          </div>
        </div>
      </section>

      {/* Search and Filters */}
      <section className="bg-white py-8 border-b border-gray-200">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Cerca corsi..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Filter Toggle */}
            <div className="flex items-center gap-4">
              <PublicButton
                variant="outline"
                size="md"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center"
              >
                <Filter className="w-4 h-4 mr-2" />
                Filtri
                <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </PublicButton>
              
              {(selectedCategory || selectedRiskLevel || selectedCourseType) && (
                <PublicButton
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                >
                  Cancella Filtri
                </PublicButton>
              )}
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="mt-6 p-6 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Category Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Categoria
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Tutte le categorie</option>
                    {categories.map(category => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Risk Level Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Livello di Rischio
                  </label>
                  <select
                    value={selectedRiskLevel}
                    onChange={(e) => setSelectedRiskLevel(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Tutti i livelli</option>
                    {riskLevels.map(level => (
                      <option key={level.value} value={level.value}>
                        {level.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Course Type Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo di Corso
                  </label>
                  <select
                    value={selectedCourseType}
                    onChange={(e) => setSelectedCourseType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Tutti i tipi</option>
                    {courseTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Results */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Caricamento corsi...</p>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900">
                  {isGroupedView ? filteredGroupedCourses.length : filteredCourses.length} {(isGroupedView ? filteredGroupedCourses.length : filteredCourses.length) === 1 ? 'corso trovato' : 'corsi trovati'}
                </h2>
                
                {/* Toggle vista */}
                <div className="flex bg-gray-100 rounded-full p-1">
                  <button
                    onClick={() => setIsGroupedView(true)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      isGroupedView
                        ? 'bg-primary-600 text-white'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    Vista Raggruppata
                  </button>
                  <button
                    onClick={() => setIsGroupedView(false)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      !isGroupedView
                        ? 'bg-primary-600 text-white'
                  : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    Vista Dettagliata
                  </button>
                </div>
              </div>

              {((isGroupedView && filteredGroupedCourses.length === 0) || (!isGroupedView && filteredCourses.length === 0)) ? (
                <div className="text-center py-12">
                  <p className="text-gray-600 text-lg">
                    Nessun corso trovato con i filtri selezionati.
                  </p>
                  <PublicButton
                    variant="outline"
                    size="md"
                    onClick={clearFilters}
                    className="mt-4"
                  >
                    Cancella Filtri
                  </PublicButton>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {isGroupedView ? (
                    filteredGroupedCourses.map(groupedCourse => (
                       <GroupedCourseCard
                         key={groupedCourse.title}
                         groupedCourse={groupedCourse}
                         getRiskLevelLabel={getRiskLevelLabel}
                         getCourseTypeLabel={getCourseTypeLabel}
                       />
                     ))
                  ) : (
                    filteredCourses.map(course => (
                      <CourseCard
                        key={course.id}
                        course={course}
                        getRiskLevelLabel={getRiskLevelLabel}
                        getCourseTypeLabel={getCourseTypeLabel}
                      />
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gray-50 py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Non Trovi il Corso che Cerchi?
          </h2>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            Contattaci per corsi personalizzati o per maggiori informazioni sui nostri programmi formativi
          </p>
          <PublicButton
            variant="primary"
            size="lg"
            to="/contatti"
            onClick={() => { trackCtaEvent({ resource: 'public', action: 'cta_click', details: { label: 'Contattaci', href: '/contatti', section: 'CoursesPage' } }); }}
          >
            Contattaci
          </PublicButton>
        </div>
      </section>
    </PublicLayout>
  );
};

export default CoursesPage;