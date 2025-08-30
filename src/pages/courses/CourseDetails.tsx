import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Award,
  BookOpen,
  Calendar,
  CheckCircle,
  ChevronRight,
  Clock,
  Edit,
  Euro,
  FileText,
  GraduationCap,
  MapPin,
  Star,
  Target,
  User,
  Users
} from 'lucide-react';
import { Button } from '../../design-system/atoms/Button';
import { useToast } from '../../hooks/useToast';
import { getCourse } from '../../services/courses';
import { useValidatedParams } from '../../hooks/routing/useValidatedParams';

const CourseDetails: React.FC = () => {
  const { id, isValidating, isValid, errorMessage } = useValidatedParams();
  const { showToast } = useToast();
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Mock data for course modules
  const mockModules = [
    {
      id: '1',
      title: 'Introduzione alla Sicurezza sul Lavoro',
      duration: '2 ore',
      description: 'Panoramica generale sui principi di sicurezza'
    },
    {
      id: '2',
      title: 'Normative e Regolamenti',
      duration: '3 ore',
      description: 'Studio delle normative vigenti in materia di sicurezza'
    },
    {
      id: '3',
      title: 'Dispositivi di Protezione Individuale',
      duration: '2 ore',
      description: 'Utilizzo corretto dei DPI'
    },
    {
      id: '4',
      title: 'Gestione delle Emergenze',
      duration: '3 ore',
      description: 'Procedure di evacuazione e primo soccorso'
    }
  ];

  // Mock data for upcoming sessions
  const mockSessions = [
    {
      id: '1',
      startDate: '2024-02-15',
      endDate: '2024-02-16',
      location: 'Aula A - Sede Principale',
      instructor: 'Dott. Mario Rossi',
      availableSpots: 8,
      totalSpots: 20
    },
    {
      id: '2',
      startDate: '2024-03-10',
      endDate: '2024-03-11',
      location: 'Aula B - Sede Secondaria',
      instructor: 'Ing. Laura Bianchi',
      availableSpots: 15,
      totalSpots: 20
    }
  ];

  // Mock data for enrolled employees
  const mockEnrolledEmployees = [
    {
      id: '1',
      firstName: 'Marco',
      lastName: 'Verdi',
      company: 'ABC S.r.l.',
      enrollmentDate: '2024-01-15',
      status: 'Confermato'
    },
    {
      id: '2',
      firstName: 'Anna',
      lastName: 'Neri',
      company: 'XYZ S.p.A.',
      enrollmentDate: '2024-01-20',
      status: 'In attesa'
    }
  ];

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
                <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                  {course.code || 'CORSO-001'}
                </span>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  course.status === 'active' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {course.status === 'active' ? 'Attivo' : 'Bozza'}
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
                  <span className="block text-sm text-gray-600">{course.duration || '10 ore'}</span>
                </div>
              </li>
              <li className="flex items-start">
                <Calendar className="h-4 w-4 text-gray-400 mt-0.5" />
                <div className="ml-2">
                  <span className="block text-xs font-medium text-gray-800">Validità</span>
                  <span className="block text-sm text-gray-600">{course.validity || '3 anni'}</span>
                </div>
              </li>
              <li className="flex items-start">
                <Users className="h-4 w-4 text-gray-400 mt-0.5" />
                <div className="ml-2">
                  <span className="block text-xs font-medium text-gray-800">Max Partecipanti</span>
                  <span className="block text-sm text-gray-600">{course.maxParticipants || '20'}</span>
                </div>
              </li>
              <li className="flex items-start">
                <Star className="h-4 w-4 text-gray-400 mt-0.5" />
                <div className="ml-2">
                  <span className="block text-xs font-medium text-gray-800">Valutazione</span>
                  <span className="block text-sm text-gray-600">{course.rating || '4.5'}/5</span>
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
                  <span className="block text-xs font-medium text-gray-800">Prezzo</span>
                  <span className="block text-sm text-gray-600">€{course.price || '150,00'}</span>
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
              {course.content || course.description || 'Questo corso fornisce una formazione completa sui principi fondamentali della sicurezza sul lavoro, in conformità con le normative vigenti.'}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <BookOpen className="h-4 w-4 inline mr-2" />
              Panoramica
            </button>
            <button
              onClick={() => setActiveTab('sessions')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'sessions'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Calendar className="h-4 w-4 inline mr-2" />
              Sessioni Programmate
            </button>
            <button
              onClick={() => setActiveTab('enrolled')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'enrolled'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Users className="h-4 w-4 inline mr-2" />
              Dipendenti Iscritti
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Course Description */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Descrizione del Corso</h3>
                <p className="text-gray-600 leading-relaxed">
                  {course.description || 'Questo corso fornisce una formazione completa sui principi fondamentali della sicurezza sul lavoro, in conformità con le normative vigenti. I partecipanti acquisiranno le competenze necessarie per identificare i rischi, implementare misure preventive e gestire situazioni di emergenza nel proprio ambiente lavorativo.'}
                </p>
              </div>

              {/* What You'll Learn */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <Target className="h-5 w-5 mr-2 text-blue-600" />
                  Cosa Imparerai
                </h3>
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600">Principi fondamentali della sicurezza sul lavoro</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600">Identificazione e valutazione dei rischi</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600">Utilizzo corretto dei dispositivi di protezione individuale</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600">Procedure di emergenza e primo soccorso</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600">Normative e regolamenti vigenti</span>
                  </li>
                </ul>
              </div>

              {/* Course Content */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Contenuto del Corso</h3>
                <div className="space-y-3">
                  {mockModules.map((module, index) => (
                    <div key={module.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="h-8 w-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium mr-3">
                            {index + 1}
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">{module.title}</h4>
                            <p className="text-sm text-gray-600">{module.description}</p>
                          </div>
                        </div>
                        <span className="text-sm text-gray-500 font-medium">{module.duration}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'sessions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Sessioni Programmate</h3>
                <Button variant="primary" size="sm">
                  <Calendar className="h-4 w-4 mr-1" />
                  Nuova Sessione
                </Button>
              </div>
              {mockSessions.length > 0 ? (
                <div className="space-y-4">
                  {mockSessions.map((session) => (
                    <div key={session.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-start">
                          <Calendar className="h-5 w-5 text-blue-600 mr-3 mt-0.5" />
                          <div>
                            <h4 className="font-medium text-gray-900">
                              {new Date(session.startDate).toLocaleDateString('it-IT')} - {new Date(session.endDate).toLocaleDateString('it-IT')}
                            </h4>
                            <div className="mt-1 space-y-1">
                              <p className="text-sm text-gray-600 flex items-center">
                                <MapPin className="h-4 w-4 mr-1" />
                                {session.location}
                              </p>
                              <p className="text-sm text-gray-600 flex items-center">
                                <User className="h-4 w-4 mr-1" />
                                Formatore: {session.instructor}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">
                            {session.availableSpots}/{session.totalSpots} posti disponibili
                          </p>
                          <div className="w-24 bg-gray-200 rounded-full h-2 mt-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${((session.totalSpots - session.availableSpots) / session.totalSpots) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Nessuna sessione programmata al momento.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'enrolled' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Dipendenti Iscritti</h3>
                <Button variant="primary" size="sm">
                  <Users className="h-4 w-4 mr-1" />
                  Aggiungi Dipendente
                </Button>
              </div>
              {mockEnrolledEmployees.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Dipendente
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Azienda
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Data Iscrizione
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Stato
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {mockEnrolledEmployees.map((employee) => (
                        <tr key={employee.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="h-8 w-8 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center">
                                <span className="text-xs font-bold text-white">
                                  {employee.firstName.charAt(0)}{employee.lastName.charAt(0)}
                                </span>
                              </div>
                              <div className="ml-3">
                                <div className="text-sm font-medium text-gray-900">
                                  {employee.firstName} {employee.lastName}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-600">{employee.company}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-600">
                              {new Date(employee.enrollmentDate).toLocaleDateString('it-IT')}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              employee.status === 'Confermato' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {employee.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Nessun dipendente iscritto al momento.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CourseDetails;