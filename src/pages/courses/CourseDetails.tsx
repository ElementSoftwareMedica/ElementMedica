import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Award,
  ChevronRight,
  Clock,
  Edit,
  Euro,
  FileText,
  GraduationCap,
  Calendar,
  Users,
  AlertTriangle,
  BookOpen,
  Layers,
  Eye,
  EyeOff,
  Globe
} from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import { getCourse } from '../../services/courses';
import { useValidatedParams } from '../../hooks/routing/useValidatedParams';
import EntitySchedulesSection from '../../components/shared/EntitySchedulesSection';
import { Button } from '../../design-system/atoms/Button';
import { getRiskLevelLabel } from '../../utils/courseLabels';

const CourseDetails: React.FC = () => {
  const { id, isValidating, isValid, errorMessage } = useValidatedParams();
  const { showToast } = useToast();
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  // TODO: In futuro questi dati verranno caricati da API reali
  // Per ora mostriamo placeholder per non avere dati hardcoded fittizi

  const fetchCourse = async (courseId: string, retryCount = 0) => {
    try {
      setLoading(true);
      setError(null);
      const data = await getCourse(courseId);
      setCourse(data);
      setNotFound(false);
    } catch (err: any) {
      console.error('Error fetching course:', err);

      if (err.status === 404) {
        setNotFound(true);
        setError(null);
      } else if (retryCount < 2) {
        // Retry up to 2 times for non-404 errors
        setTimeout(() => fetchCourse(courseId, retryCount + 1), 1000);
        return;
      } else {
        setError(err.message || 'Errore nel caricamento del corso');
        setNotFound(false);
      }
      setCourse(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isValidating) return;

    if (!isValid) {
      if (errorMessage) {
        showToast({ message: errorMessage, type: 'error' });
      }
      return;
    }

    if (id) {
      fetchCourse(id);
    }
  }, [id, isValid, isValidating, errorMessage]);

  if (isValidating || loading) {
    return (
      <div className="flex items-center justify-center h-80">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Caricamento corso...</p>
        </div>
      </div>
    );
  }

  if (!isValid || notFound) {
    return (
      <div className="flex items-center justify-center h-80">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-800">Corso non trovato</h2>
          <p className="text-gray-600 mt-2">Il corso che stai cercando non esiste o è stato rimosso.</p>
          <Link to="/courses" className="mt-4 inline-block text-blue-600 hover:text-blue-800">
            Torna ai Corsi
          </Link>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-80">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600">Errore nel caricamento</h2>
          <p className="text-gray-600 mt-2">{error}</p>
          <div className="mt-4 space-x-4">
            <Button
              onClick={() => fetchCourse(id!)}
              variant="primary"
            >
              Riprova
            </Button>
            <Link to="/courses" className="text-blue-600 hover:text-blue-800">
              Torna ai Corsi
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!course) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <div>
        <Link
          to="/courses"
          className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
        >
          <span className="transform rotate-180">
            <ChevronRight className="h-4 w-4 mr-1" />
          </span>
          Torna ai Corsi
        </Link>
      </div>

      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div className="flex items-center">
            <div className="h-16 w-16 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
              <GraduationCap className="h-8 w-8 text-white" />
            </div>
            <div className="ml-4">
              <div className="flex items-center space-x-2 mb-1">
                <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                  {course.category || 'Sicurezza'}
                </span>
                {course.subcategory && (
                  <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
                    {course.subcategory}
                  </span>
                )}
                <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                  {course.code || 'N/D'}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-gray-800">
                {course.title || 'Corso di Sicurezza sul Lavoro'}
              </h1>
            </div>
          </div>
          <div className="mt-4 md:mt-0">
            <Link to={`/courses/${course.id}/edit`} className="btn-primary flex items-center rounded-full">
              <Edit className="h-4 w-4 mr-1" />
              Modifica Corso
            </Link>
          </div>
        </div>

        <div className="mt-4 border-t border-gray-200 pt-4 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-3">Informazioni Generali</h2>
            <ul className="space-y-2">
              <li className="flex items-start">
                <Clock className="h-4 w-4 text-gray-400 mt-0.5" />
                <div className="ml-2">
                  <span className="block text-xs font-medium text-gray-800">Durata</span>
                  <span className="block text-sm text-gray-600">{course.duration || 'N/D'} ore</span>
                </div>
              </li>
              {course.practicalHours && (
                <li className="flex items-start">
                  <BookOpen className="h-4 w-4 text-gray-400 mt-0.5" />
                  <div className="ml-2">
                    <span className="block text-xs font-medium text-gray-800">Ore Pratiche</span>
                    <span className="block text-sm text-gray-600">{course.practicalHours} ore</span>
                  </div>
                </li>
              )}
              <li className="flex items-start">
                <Calendar className="h-4 w-4 text-gray-400 mt-0.5" />
                <div className="ml-2">
                  <span className="block text-xs font-medium text-gray-800">Validità</span>
                  <span className="block text-sm text-gray-600">{course.validityYears ? `${course.validityYears} anni` : 'N/D'}</span>
                </div>
              </li>
              <li className="flex items-start">
                <Users className="h-4 w-4 text-gray-400 mt-0.5" />
                <div className="ml-2">
                  <span className="block text-xs font-medium text-gray-800">Max Partecipanti</span>
                  <span className="block text-sm text-gray-600">{course.maxPeople || 'N/D'}</span>
                </div>
              </li>
              {course.riskLevel && (
                <li className="flex items-start">
                  <AlertTriangle className="h-4 w-4 text-gray-400 mt-0.5" />
                  <div className="ml-2">
                    <span className="block text-xs font-medium text-gray-800">Livello di Rischio</span>
                    <span className={`inline-block px-2 py-0.5 text-xs rounded-full font-medium ${course.riskLevel === 'ALTO' || course.riskLevel === 'A' ? 'bg-red-100 text-red-800' :
                      course.riskLevel === 'MEDIO' || course.riskLevel === 'B' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                      {getRiskLevelLabel(course.riskLevel, course.title)}
                    </span>
                  </div>
                </li>
              )}
              {course.courseType && (
                <li className="flex items-start">
                  <Layers className="h-4 w-4 text-gray-400 mt-0.5" />
                  <div className="ml-2">
                    <span className="block text-xs font-medium text-gray-800">Tipo Corso</span>
                    <span className={`inline-block px-2 py-0.5 text-xs rounded-full font-medium ${course.courseType === 'PRIMO_CORSO' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                      }`}>
                      {course.courseType === 'PRIMO_CORSO' ? 'Primo Corso' : course.courseType === 'AGGIORNAMENTO' ? 'Aggiornamento' : course.courseType}
                    </span>
                  </div>
                </li>
              )}
              <li className="flex items-start">
                {course.isPublic ? (
                  <Globe className="h-4 w-4 text-green-500 mt-0.5" />
                ) : (
                  <EyeOff className="h-4 w-4 text-gray-400 mt-0.5" />
                )}
                <div className="ml-2">
                  <span className="block text-xs font-medium text-gray-800">Visibilità Pubblica</span>
                  <span className={`inline-block px-2 py-0.5 text-xs rounded-full font-medium ${course.isPublic ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                    {course.isPublic ? 'Visibile sul sito pubblico' : 'Non visibile'}
                  </span>
                </div>
              </li>
            </ul>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-3">Dettagli Commerciali</h2>
            <ul className="space-y-2">
              <li className="flex items-start">
                <Euro className="h-4 w-4 text-gray-400 mt-0.5" />
                <div className="ml-2">
                  <span className="block text-xs font-medium text-gray-800">Prezzo per Persona</span>
                  <span className="block text-sm text-gray-600">
                    {course.pricePerPerson ? `€ ${Number(course.pricePerPerson).toFixed(2)}` : 'N/D'}
                  </span>
                </div>
              </li>
              <li className="flex items-start">
                <Award className="h-4 w-4 text-gray-400 mt-0.5" />
                <div className="ml-2">
                  <span className="block text-xs font-medium text-gray-800">Certificazioni</span>
                  <span className="block text-sm text-gray-600">{course.certifications || 'Attestato di Partecipazione'}</span>
                </div>
              </li>
              <li className="flex items-start">
                <FileText className="h-4 w-4 text-gray-400 mt-0.5" />
                <div className="ml-2">
                  <span className="block text-xs font-medium text-gray-800">Normativa</span>
                  <span className="block text-sm text-gray-600">{course.regulation || 'D.Lgs. 81/08'}</span>
                </div>
              </li>
            </ul>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-3">Descrizione</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              {course.description || course.shortDescription || 'Nessuna descrizione disponibile.'}
            </p>
            {course.contents && (
              <div className="mt-3">
                <h3 className="text-sm font-medium text-gray-800 mb-1">Contenuti</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{course.contents}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sezione Corsi Programmati basati su questo corso */}
      {course && (
        <EntitySchedulesSection
          entityType="course"
          entityId={course.id}
          title="Corsi Programmati basati su questo Corso"
          showQuickDownloads={true}
        />
      )}
    </div>
  );
};

export default CourseDetails;