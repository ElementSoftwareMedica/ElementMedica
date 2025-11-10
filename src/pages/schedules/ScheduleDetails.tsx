import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  BookOpen,
  Building2,
  Calendar,
  ChevronRight,
  Clock,
  Edit,
  GraduationCap,
  MapPin,
  Trash2,
  User,
  Users
} from 'lucide-react';
import { getLoadingErrorMessage } from '../../utils/errorUtils';
import { apiGet } from '../../services/api';
import { remove } from '../../services/apiClient';

interface Schedule {
  id: string;
  courseId: string;
  startDate: string;
  endDate: string;
  location?: string;
  maxParticipants?: number;
  notes?: string;
  deliveryMode?: string;
  status?: string;
  createdAt: string;
  updatedAt: string;
  course: {
    id: string;
    name: string;
    title?: string;
    duration?: number;
    description?: string;
  };
  sessions?: Array<{
    id: string;
    date: string;
    start: string;
    end: string;
    trainer?: {
      id: string;
      firstName: string;
      lastName: string;
      email?: string;
    };
    coTrainer?: {
      id: string;
      firstName: string;
      lastName: string;
      email?: string;
    };
  }>;
  companies?: Array<{
    company: {
      id: string;
      ragioneSociale?: string;
      name?: string;
    };
  }>;
  enrollments?: Array<{
    id: string;
    status?: string;
    person: {
      id: string;
      firstName: string;
      lastName: string;
      email?: string;
      companyId?: string;
    };
  }>;
}

const ScheduleDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    fetchScheduleData();
  }, [id]);

  const fetchScheduleData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet(`/api/v1/schedules/${id}`);
      setSchedule(data);
    } catch (err) {
      console.error('Error fetching schedule:', err);
      setError(getLoadingErrorMessage('schedules', err));
      setSchedule(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Sei sicuro di voler eliminare questo corso programmato? Questa azione non può essere annullata.')) {
      return;
    }

    try {
      await remove('schedules', id!);
      setAlert({ type: 'success', message: 'Corso programmato eliminato con successo' });
      setTimeout(() => navigate('/schedules'), 1500);
    } catch (err) {
      console.error('Error deleting schedule:', err);
      setAlert({ type: 'error', message: 'Errore durante l\'eliminazione del corso programmato' });
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatTime = (timeStr: string) => {
    return timeStr.substring(0, 5); // HH:MM
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDeliveryModeLabel = (mode?: string) => {
    switch (mode) {
      case 'IN_PERSON': return 'In presenza';
      case 'ONLINE': return 'Online';
      case 'HYBRID': return 'Ibrido';
      case 'SELF_PACED': return 'Autoapprendimento';
      default: return 'Non specificato';
    }
  };

  const getStatusBadge = (status?: string) => {
    const statusMap: Record<string, { label: string; color: string }> = {
      'PENDING': { label: 'In attesa', color: 'bg-yellow-100 text-yellow-800' },
      'CONFIRMED': { label: 'Confermato', color: 'bg-green-100 text-green-800' },
      'CANCELLED': { label: 'Annullato', color: 'bg-red-100 text-red-800' },
      'COMPLETED': { label: 'Completato', color: 'bg-blue-100 text-blue-800' },
    };

    const statusInfo = statusMap[status || 'PENDING'] || { label: status || 'N/D', color: 'bg-gray-100 text-gray-800' };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
        {statusInfo.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-80">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Caricamento...</p>
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
          <Link to="/schedules" className="mt-4 inline-block text-blue-600 hover:text-blue-800">
            Torna ai Corsi Programmati
          </Link>
        </div>
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="flex items-center justify-center h-80">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-800">Corso programmato non trovato</h2>
          <p className="text-gray-600 mt-2">Il corso che stai cercando non esiste o è stato rimosso.</p>
          <Link to="/schedules" className="mt-4 inline-block text-blue-600 hover:text-blue-800">
            Torna ai Corsi Programmati
          </Link>
        </div>
      </div>
    );
  }

  const courseName = schedule.course.title || schedule.course.name;
  const companyNames = schedule.companies?.map(c => c.company.ragioneSociale || c.company.name).join(', ') || 'Nessuna azienda';

  return (
    <div className="space-y-6">
      {/* Alert */}
      {alert && (
        <div className={`p-4 rounded-lg ${alert.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {alert.message}
        </div>
      )}

      {/* Back link */}
      <div>
        <Link 
          to="/schedules" 
          className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
        >
          <span className="transform rotate-180">
            <ChevronRight className="h-4 w-4 mr-1" />
          </span>
          Torna ai Corsi Programmati
        </Link>
      </div>

      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div className="flex items-center">
            <div className="h-16 w-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <GraduationCap className="h-8 w-8 text-white" />
            </div>
            <div className="ml-4">
              <h1 className="text-2xl font-bold text-gray-800">{courseName}</h1>
              <p className="text-sm text-gray-600 mt-1">{companyNames}</p>
              <div className="mt-2">{getStatusBadge(schedule.status)}</div>
            </div>
          </div>
          <div className="mt-4 md:mt-0 flex gap-2">
            <button
              onClick={() => navigate(`/schedules?openModal=true&scheduleId=${schedule.id}`)}
              className="btn-primary flex items-center rounded-full"
            >
              <Edit className="h-4 w-4 mr-1" />
              Modifica
            </button>
            <button
              onClick={handleDelete}
              className="btn-danger flex items-center rounded-full"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Elimina
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Course Info */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                <BookOpen className="h-5 w-5 mr-2" />
                Informazioni Corso
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Corso</label>
                  <p className="mt-1 text-gray-900">{courseName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Modalità di Erogazione</label>
                  <p className="mt-1 text-gray-900">{getDeliveryModeLabel(schedule.deliveryMode)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Data Inizio</label>
                  <p className="mt-1 text-gray-900 flex items-center">
                    <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                    {formatDate(schedule.startDate)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Data Fine</label>
                  <p className="mt-1 text-gray-900 flex items-center">
                    <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                    {formatDate(schedule.endDate)}
                  </p>
                </div>
                {schedule.location && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Sede</label>
                    <p className="mt-1 text-gray-900 flex items-center">
                      <MapPin className="h-4 w-4 mr-1 text-gray-400" />
                      {schedule.location}
                    </p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-gray-500">Max Partecipanti</label>
                  <p className="mt-1 text-gray-900 flex items-center">
                    <Users className="h-4 w-4 mr-1 text-gray-400" />
                    {schedule.maxParticipants || 'Non specificato'}
                  </p>
                </div>
              </div>
              {schedule.notes && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Note</label>
                  <p className="mt-1 text-gray-700 whitespace-pre-wrap">{schedule.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Sessions - 2 Columns Layout with Participants */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                Sessioni ({schedule.sessions?.length || 0})
              </h2>
            </div>
            <div className="p-6">
              {schedule.sessions && schedule.sessions.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {schedule.sessions.map((session, index) => {
                    // ✅ FIX: Mostra TUTTI i partecipanti per ogni sessione
                    // (in futuro si può aggiungere attendance per-session dal backend)
                    const allParticipants = schedule.enrollments || [];

                    return (
                      <div key={session.id} className="border-2 border-gray-200 rounded-xl overflow-hidden flex flex-col">
                        {/* Session Header */}
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4">
                          <h3 className="font-semibold text-lg text-gray-900 mb-3">Sessione {index + 1}</h3>
                          
                          <div className="space-y-2 mb-3">
                            <p className="text-sm text-gray-700 flex items-center">
                              <Calendar className="h-4 w-4 mr-2 text-blue-600 flex-shrink-0" />
                              {formatDate(session.date)}
                            </p>
                            <p className="text-sm text-gray-700 flex items-center">
                              <Clock className="h-4 w-4 mr-2 text-blue-600 flex-shrink-0" />
                              {formatTime(session.start)} - {formatTime(session.end)}
                            </p>
                          </div>

                          {/* Trainers */}
                          <div className="space-y-2 border-t border-blue-100 pt-3">
                            {session.trainer && (
                              <div className="flex items-start">
                                <User className="h-4 w-4 mr-2 text-blue-600 flex-shrink-0 mt-0.5" />
                                <div>
                                  <p className="text-xs text-gray-600 font-medium">Formatore</p>
                                  <Link
                                    to={`/persons/${session.trainer.id}`}
                                    className="text-sm font-semibold text-blue-600 hover:text-blue-800"
                                  >
                                    {session.trainer.firstName} {session.trainer.lastName}
                                  </Link>
                                </div>
                              </div>
                            )}
                            {session.coTrainer && (
                              <div className="flex items-start">
                                <User className="h-4 w-4 mr-2 text-indigo-600 flex-shrink-0 mt-0.5" />
                                <div>
                                  <p className="text-xs text-gray-600 font-medium">Co-Formatore</p>
                                  <Link
                                    to={`/persons/${session.coTrainer.id}`}
                                    className="text-sm font-semibold text-indigo-600 hover:text-indigo-800"
                                  >
                                    {session.coTrainer.firstName} {session.coTrainer.lastName}
                                  </Link>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Session Participants */}
                        <div className="p-4 bg-white flex-1">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-semibold text-gray-700 flex items-center">
                              <Users className="h-4 w-4 mr-2 text-gray-500" />
                              Partecipanti ({allParticipants.length})
                            </h4>
                          </div>
                          {allParticipants.length > 0 ? (
                            <div className="space-y-2 max-h-80 overflow-y-auto">
                              {allParticipants.map((enrollment) => (
                                <Link
                                  key={enrollment.id}
                                  to={`/persons/${enrollment.person.id}`}
                                  className="flex items-center p-2 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-blue-300 transition group"
                                >
                                  <div className="h-8 w-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold mr-2 flex-shrink-0">
                                    {enrollment.person.firstName[0]}{enrollment.person.lastName[0]}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600">
                                      {enrollment.person.firstName} {enrollment.person.lastName}
                                    </p>
                                    {enrollment.person.email && (
                                      <p className="text-xs text-gray-500 truncate">{enrollment.person.email}</p>
                                    )}
                                  </div>
                                </Link>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500 text-center py-3 bg-gray-50 rounded-lg">
                              Nessun partecipante iscritto
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">Nessuna sessione programmata</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Companies */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                <Building2 className="h-5 w-5 mr-2" />
                Aziende
              </h2>
            </div>
            <div className="p-6">
              {schedule.companies && schedule.companies.length > 0 ? (
                <div className="space-y-2">
                  {schedule.companies.map((item) => (
                    <Link
                      key={item.company.id}
                      to={`/companies/${item.company.id}`}
                      className="block p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                    >
                      <p className="text-sm font-medium text-blue-600 hover:text-blue-800">
                        {item.company.ragioneSociale || item.company.name}
                      </p>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">Nessuna azienda associata</p>
              )}
            </div>
          </div>

          {/* Meta Info */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">Metadata</h2>
            </div>
            <div className="p-6 space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500">Creato il</label>
                <p className="text-sm text-gray-900">{formatDateTime(schedule.createdAt)}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Ultimo aggiornamento</label>
                <p className="text-sm text-gray-900">{formatDateTime(schedule.updatedAt)}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">ID</label>
                <p className="text-xs text-gray-600 font-mono">{schedule.id}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScheduleDetails;
