import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import ScheduleEventModalLazy from '../../components/schedules/ScheduleEventModal.lazy';
import { Folder, ClipboardList, Award, FileText } from 'lucide-react';
import { apiGet } from '../../api/api';

const sidebarButtons = [
  { label: 'Lettere di Incarico', icon: <Folder className="w-5 h-5 text-blue-500" /> },
  { label: 'Registri Presenze', icon: <ClipboardList className="w-5 h-5 text-yellow-500" /> },
  { label: 'Attestati', icon: <Award className="w-5 h-5 text-green-500" /> },
  { label: 'Preventivi', icon: <FileText className="w-5 h-5 text-violet-500" /> },
  { label: 'Fatture', icon: <FileText className="w-5 h-5 text-red-500" /> },
];

const ScheduleDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [schedule, setSchedule] = useState<any>(null);
  const [trainers, setTrainers] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      try {
        const [schedData, trData, compData, empData, crsData] = await Promise.all([
          apiGet(`/schedules/${id}`),
          apiGet('/trainers'),
          apiGet('/companies'),
          apiGet('/employees'),
          apiGet('/courses'),
        ]);
        setSchedule(schedData);
        setTrainers(trData);
        setCompanies(compData);
        setEmployees(empData);
        setCourses(crsData);
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, [id]);

  const handleSidebarAction = (label: string) => {
    // Qui in futuro genererai i documenti usando le info di scheduled courses
    alert(`Azione: ${label}`);
  };

  if (loading) return <div className="text-center p-6">Loading...</div>;
  if (!schedule) return <div className="text-center p-6">Programma non trovato.</div>;

  // Mappa per la traduzione della modalità di erogazione
  const modalitaMap: Record<string, string> = {
    'in-person': 'In presenza',
    'online': 'Online',
    'hybrid': 'Ibrido',
  };
  const modalitaErogazione = modalitaMap[schedule.deliveryMode] || schedule.deliveryMode;

  // Raggruppa partecipanti per azienda senza duplicati
  const aziendePartecipanti: Record<string, { nome: string, partecipanti: { id: string, nome: string }[] }> = {};
  schedule.enrollments?.forEach((enr: any) => {
    const aziendaId = enr.employee.companyId;
    if (!aziendaId) return;
    if (!aziendePartecipanti[aziendaId]) {
      const companyObj = schedule.companies.find((c: any) => c.company.id === aziendaId)?.company;
      aziendePartecipanti[aziendaId] = {
        nome: companyObj?.ragioneSociale || companyObj?.name || 'Azienda sconosciuta',
        partecipanti: []
      };
    }
    aziendePartecipanti[aziendaId].partecipanti.push({
      id: enr.employee.id,
      nome: `${enr.employee.firstName} ${enr.employee.lastName}`
    });
  });

  return (
    <div className="flex">
      {/* Contenuto principale */}
      <div className="flex-1 mr-8">
        <div
          className={`max-w-5xl mx-auto p-8 rounded-lg shadow-lg relative
            ${schedule.status === 'Preventivo' ? 'bg-yellow-50' :
              schedule.status === 'Confermato' ? 'bg-orange-50' :
              schedule.status === 'Fatturato' ? 'bg-blue-50' :
              schedule.status === 'Pagato' ? 'bg-green-50' :
              'bg-gray-50'}
          `}
        >
      {/* Edit Modal */}
      {showEdit && (
        <ScheduleEventModalLazy
          trainings={courses.map(c => ({ id: c.id, title: c.title || c.name, duration: c.duration, certifications: c.certifications }))}
          trainers={trainers}
          companies={companies.map(c => ({ id: c.id, ragioneSociale: c.ragioneSociale, name: c.name }))}
          employees={employees}
          existingEvent={{
            ...schedule,
            trainingId: schedule.course.id,
            trainerId: schedule.sessions?.[0]?.trainer?.id || '',
            coTrainerId: schedule.sessions?.[0]?.co_trainer?.id || '',
            dates: schedule.sessions?.map((sess: any) => ({
              date: sess.date.split('T')[0],
              start: sess.start,
              end: sess.end,
              trainerId: sess.trainer?.id || '',
              coTrainerId: sess.co_trainer?.id || '',
            })) || [],
            location: schedule.location,
            maxParticipants: schedule.maxParticipants,
            notes: schedule.notes,
            deliveryMode: schedule.deliveryMode,
            companyIds: schedule.companies?.map((sc: any) => sc.company.id) || [],
            employeeIds: schedule.enrollments?.map((e: any) => e.employee.id) || [],
          }}
          initialDate={schedule.sessions?.[0]?.date.split('T')[0]}
          initialTime={{ start: schedule.sessions?.[0]?.start, end: schedule.sessions?.[0]?.end }}
          onClose={() => setShowEdit(false)}
          onSuccess={async () => {
            setShowEdit(false);
            const schedData = await apiGet(`/schedules/${id}`);
            setSchedule(schedData);
          }}
        />
      )}
      {/* Detail Card */}
          <h1
            className={`text-3xl font-bold mb-6 
              ${schedule.status === 'Preventivo' ? 'text-yellow-700' :
                schedule.status === 'Confermato' ? 'text-orange-700' :
                schedule.status === 'Fatturato' ? 'text-blue-700' :
                schedule.status === 'Pagato' ? 'text-green-700' :
                'text-gray-700'}
            `}
          >
            Dettaglio Programma Corso
          </h1>
      <div className="space-y-6">
        {/* Corso */}
            <div className="bg-white p-4 rounded-lg shadow flex items-center justify-between">
              <div>
                <h2 className={`text-xl font-semibold 
                  ${schedule.status === 'Preventivo' ? 'text-yellow-700' :
                    schedule.status === 'Confermato' ? 'text-orange-700' :
                    schedule.status === 'Fatturato' ? 'text-blue-700' :
                    schedule.status === 'Pagato' ? 'text-green-700' :
                    'text-gray-700'}
                `}>Corso</h2>
          <p className="mt-2 text-gray-800">{schedule.course?.title || schedule.course?.name}</p>
              </div>
              {schedule.status && (
                <span className={`ml-4 px-4 py-2 rounded-full text-sm font-semibold shadow-sm border 
                  ${schedule.status === 'Preventivo' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                    schedule.status === 'Confermato' ? 'bg-orange-100 text-orange-800 border-orange-300' :
                    schedule.status === 'Fatturato' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                    schedule.status === 'Pagato' ? 'bg-green-100 text-green-800 border-green-300' :
                    'bg-gray-100 text-gray-800 border-gray-300'}
                `}>
                  {schedule.status}
                </span>
              )}
        </div>
        {/* Partecipanti per Azienda */}
        <div className="bg-white p-4 rounded-lg shadow">
              <h2 className={`text-xl font-semibold 
                ${schedule.status === 'Preventivo' ? 'text-yellow-700' :
                  schedule.status === 'Confermato' ? 'text-orange-700' :
                  schedule.status === 'Fatturato' ? 'text-blue-700' :
                  schedule.status === 'Pagato' ? 'text-green-700' :
                  'text-gray-700'}
              `}>Partecipanti per Azienda</h2>
          {Object.keys(aziendePartecipanti).length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
              {Object.entries(aziendePartecipanti).map(([aziendaId, azienda]) => (
                <div key={aziendaId} className="border rounded p-3">
                  <h3 className={`font-semibold mb-2 
                    ${schedule.status === 'Preventivo' ? 'text-yellow-700' :
                      schedule.status === 'Confermato' ? 'text-orange-700' :
                      schedule.status === 'Fatturato' ? 'text-blue-700' :
                      schedule.status === 'Pagato' ? 'text-green-700' :
                      'text-gray-700'}
                  `}>{azienda.nome}</h3>
                  {azienda.partecipanti.length ? (
                    <ul className="list-disc pl-5 space-y-1 text-gray-800">
                      {azienda.partecipanti.map(p => (
                        <li key={p.id}>{p.nome}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500 italic">Nessun dipendente</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">-</p>
          )}
        </div>
        {/* Sessioni */}
        <div className="bg-white p-4 rounded-lg shadow">
              <h2 className={`text-xl font-semibold 
                ${schedule.status === 'Preventivo' ? 'text-yellow-700' :
                  schedule.status === 'Confermato' ? 'text-orange-700' :
                  schedule.status === 'Fatturato' ? 'text-blue-700' :
                  schedule.status === 'Pagato' ? 'text-green-700' :
                  'text-gray-700'}
              `}>Sessioni</h2>
          {schedule.sessions?.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
                  {schedule.sessions.map((sess: any, idx: number) => {
                    // Get present employee IDs for this session
                    const presentIds = schedule.attendance && schedule.attendance[idx] && Array.isArray(schedule.attendance[idx].employeeIds)
                      ? schedule.attendance[idx].employeeIds
                      : [];
                    // Get employee objects for present IDs
                    const presentEmployees = schedule.enrollments
                      ? schedule.enrollments.filter((enr: any) => presentIds.includes(enr.employee.id))
                      : [];
                    return (
                      <div key={sess.id} className="border rounded p-3 flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <h3 className={`font-semibold mb-1 
                            ${schedule.status === 'Preventivo' ? 'text-yellow-700' :
                              schedule.status === 'Confermato' ? 'text-orange-700' :
                              schedule.status === 'Fatturato' ? 'text-blue-700' :
                              schedule.status === 'Pagato' ? 'text-green-700' :
                              'text-gray-700'}
                          `}>{new Date(sess.date).toLocaleDateString('it-IT')}</h3>
                          {schedule.attendance && schedule.attendance[idx] && (
                            <span className="ml-2 px-2 py-0.5 rounded-full bg-green-100 text-green-800 text-xs font-semibold align-middle">
                              Presenti: {presentIds.length}
                            </span>
                          )}
                        </div>
                  <p><span className="font-semibold">Orario:</span> {sess.start} - {sess.end}</p>
                  <p><span className="font-semibold">Docente:</span> {sess.trainer ? `${sess.trainer.firstName} ${sess.trainer.lastName}` : '-'}</p>
                  {sess.co_trainer && <p><span className="font-semibold">Co-Docente:</span> {sess.co_trainer.firstName} {sess.co_trainer.lastName}</p>}
                        {/* List of present employees for this session */}
                        {presentEmployees.length > 0 && (
                          <div className="mt-2">
                            <span className="font-semibold text-xs text-gray-500">Presenti:</span>
                            <ul className="list-disc pl-5 text-sm text-gray-800">
                              {presentEmployees.map((enr: any) => (
                                <li key={enr.employee.id}>{enr.employee.firstName} {enr.employee.lastName}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                </div>
                    );
                  })}
            </div>
          ) : (
            <p className="text-gray-500 italic mt-2">Nessuna sessione</p>
          )}
        </div>
            {/* Luogo, Modalità & Note */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
                <h2 className={`text-lg font-semibold 
                  ${schedule.status === 'Preventivo' ? 'text-yellow-700' :
                    schedule.status === 'Confermato' ? 'text-orange-700' :
                    schedule.status === 'Fatturato' ? 'text-blue-700' :
                    schedule.status === 'Pagato' ? 'text-green-700' :
                    'text-gray-700'}
                `}>Luogo</h2>
            <p className="mt-1 text-gray-800">{schedule.location || '-'}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
                <h2 className={`text-lg font-semibold 
                  ${schedule.status === 'Preventivo' ? 'text-yellow-700' :
                    schedule.status === 'Confermato' ? 'text-orange-700' :
                    schedule.status === 'Fatturato' ? 'text-blue-700' :
                    schedule.status === 'Pagato' ? 'text-green-700' :
                    'text-gray-700'}
                `}>Modalità di erogazione</h2>
                <p className="mt-1 text-gray-800">{modalitaErogazione || '-'}</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow col-span-2">
                <h2 className={`text-lg font-semibold 
                  ${schedule.status === 'Preventivo' ? 'text-yellow-700' :
                    schedule.status === 'Confermato' ? 'text-orange-700' :
                    schedule.status === 'Fatturato' ? 'text-blue-700' :
                    schedule.status === 'Pagato' ? 'text-green-700' :
                    'text-gray-700'}
                `}>Note</h2>
            <p className="mt-1 text-gray-800">{schedule.notes || '-'}</p>
          </div>
        </div>
      </div>
      <button
            className="px-4 py-2 bg-blue-600 text-white rounded-full absolute top-4 right-4 hover:bg-blue-700 transition"
        onClick={() => setShowEdit(true)}
      >
        Modifica
      </button>
        </div>
      </div>
      {/* Sidebar pulsanti a destra */}
      <div className="flex flex-col gap-4 pt-8 pl-2 min-w-[210px]">
        {sidebarButtons.map(btn => (
          <button
            key={btn.label}
            className="flex items-center justify-between gap-3 px-5 py-3 rounded-full bg-white shadow border border-gray-200 text-gray-700 font-medium text-base hover:bg-blue-50 hover:text-blue-700 transition"
            type="button"
            onClick={() => handleSidebarAction(btn.label)}
          >
            {btn.label}
            {btn.icon}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ScheduleDetailPage;