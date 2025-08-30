import React, { useEffect, useState } from 'react';
import { 
  Calendar,
  Download,
  Pencil,
  Table,
  Trash2
} from 'lucide-react';
import ScheduleCalendar, { ScheduleEvent } from '../../components/dashboard/ScheduleCalendar';
import ScheduleEventModalLazy from '../../components/schedules/ScheduleEventModal.lazy';
import EntityListLayout from '../../components/layouts/EntityListLayout';
import ResizableTable from '../../components/shared/ResizableTable';
import { HeaderPanel } from '../../design-system/organisms/HeaderPanel';
import { SearchBarControls } from '../../design-system/molecules/SearchBarControls';
import { FilterPanel } from '../../design-system/organisms/FilterPanel';
import { SearchBar } from '../../design-system/molecules/SearchBar';
import { exportToCsv } from '../../utils/csvExport';
import { apiGet, apiPost, apiPut, apiDelete } from '../../services/api';
import { Company } from '../../types';

interface Schedule {
  id: string;
  course: { id: string; name: string; title?: string };
  startDate: string;
  endDate: string;
  location?: string;
  maxParticipants?: number;
  notes?: string;
  deliveryMode?: string;
  sessions?: Array<{
    id: string;
    date: string;
    start: string;
    end: string;
    trainer?: { id: string; firstName: string; lastName: string };
    co_trainer?: { id: string; firstName: string; lastName: string };
  }>;
  companies?: Array<{
    company: { id: string; ragioneSociale?: string; name?: string };
  }>;
  enrollments?: Array<{
    employee: { id: string; firstName: string; lastName: string };
  }>;
}

interface Course {
  id: string;
  name: string;
}

interface Trainer {
  id: string;
  firstName: string;
  lastName: string;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  companyId: string;
  email?: string;
  position?: string;
}

// Funzione helper per combinare data e ora in modo robusto
function combineDateAndTime(dateStr: string, timeStr: string) {
  const [year, month, day] = dateStr.split('T')[0].split('-');
  const [hour, minute] = timeStr.split(':');
  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute)
  );
}

const SchedulesPage: React.FC = () => {
  
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [view, setView] = useState<'table' | 'calendar'>(() => {
    return (localStorage.getItem('schedulesViewMode') as 'table' | 'calendar') || 'table';
  });
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date } | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectAll, setSelectAll] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [activeSort, setActiveSort] = useState<{ field: string, direction: 'asc' | 'desc' } | undefined>(undefined);

  useEffect(() => {
    fetchData();
    localStorage.setItem('schedulesViewMode', view);
  }, [view]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [schedulesData, coursesData, trainersData, companiesData, employeesData] = await Promise.all([
        apiGet('/schedules'),
        apiGet('/courses'),
        apiGet('/trainers'),
        apiGet('/companies'),
        apiGet('/persons')
      ]);

      setSchedules(schedulesData as Schedule[]);
      setCourses(coursesData as Course[]);
      setTrainers(trainersData as Trainer[]);
      setCompanies(companiesData as Company[]);
      setEmployees(employeesData as Employee[]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };



  const handleDelete = async (id: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo programma?')) return;
    try {
      await apiDelete(`/schedules/${id}`);
      setAlert({ type: 'success', message: 'Corso eliminato con successo.' });
      await fetchData();
    } catch (error) {
      setAlert({ type: 'error', message: 'Errore durante l\'eliminazione.' });
      console.error('Error deleting schedule:', error);
    }
  };

  const handleDeleteSelected = async () => {
    if (!selectedIds.length) return;
    if (!confirm('Sei sicuro di voler eliminare i corsi selezionati?')) return;
    setLoading(true);
    try {
      await Promise.all(selectedIds.map(id => apiDelete(`/schedules/${id}`)));
      setSelectedIds([]);
      setSelectionMode(false);
      setAlert({ type: 'success', message: 'Corsi eliminati con successo.' });
      await fetchData();
    } catch (error) {
      setAlert({ type: 'error', message: 'Errore durante l\'eliminazione multipla.' });
      console.error('Error deleting selected schedules:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleSelectAll = () => {
    setSelectAll(!selectAll);
    setSelectedIds(selectAll ? [] : schedules.map(s => s.id));
  };

  // Prepara i dati per la tabella
  const data = schedules.map(schedule => {
    // Estrai i nomi delle aziende
    const companyNames = schedule.companies
      ?.map(c => c.company.ragioneSociale || c.company.name)
      .filter(Boolean)
      .join(', ');

    // Estrai il formatore della prima sessione
    const trainer = schedule.sessions?.[0]?.trainer
      ? `${schedule.sessions[0].trainer.firstName} ${schedule.sessions[0].trainer.lastName}`
      : 'N/A';

    // Estrai il co-formatore della prima sessione
    const coTrainer = schedule.sessions?.[0]?.co_trainer
      ? `${schedule.sessions[0].co_trainer.firstName} ${schedule.sessions[0].co_trainer.lastName}`
      : '-';

    // Conta i partecipanti
    const participantsCount = schedule.enrollments?.length || 0;

    // Estrai le date delle sessioni
    const sessionDates = schedule.sessions
      ?.map(s => {
        const date = new Date(s.date);
        return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
      })
      .join(', ');

    // Determina la modalità di erogazione in italiano
    let deliveryModeItalian = 'N/D';
    if (schedule.deliveryMode === 'IN_PERSON') deliveryModeItalian = 'In presenza';
    if (schedule.deliveryMode === 'ONLINE') deliveryModeItalian = 'Online';
    if (schedule.deliveryMode === 'HYBRID') deliveryModeItalian = 'Ibrida';

    return {
      id: schedule.id,
      corso: schedule.course.title || schedule.course.name,
      aziende: companyNames || 'N/D',
      formatore: trainer,
      coFormatore: coTrainer,
      partecipanti: participantsCount,
      dataInizio: new Date(schedule.startDate).toLocaleDateString('it-IT'),
      dataFine: new Date(schedule.endDate).toLocaleDateString('it-IT'),
      sessioni: sessionDates || 'N/D',
      modalità: deliveryModeItalian,
      location: schedule.location || 'N/D',
      selected: selectedIds.includes(schedule.id),
      _original: schedule
    };
  });

  // Prepara gli eventi per il calendario
  const events: ScheduleEvent[] = [];
  schedules.forEach(schedule => {
    const courseName = schedule.course.title || schedule.course.name;
    const companyNames = schedule.companies
      ?.map(c => c.company.ragioneSociale || c.company.name)
      .filter(Boolean)
      .join(', ');

    // Se ci sono sessioni, crea un evento per ogni sessione
    if (schedule.sessions && schedule.sessions.length > 0) {
      schedule.sessions.forEach(session => {
        try {
          const sessionDate = session.date.split('T')[0];
          const startTime = session.start;
          const endTime = session.end;
          
          // Combina data e ora per ottenere gli oggetti Date completi
          const startDateTime = combineDateAndTime(sessionDate, startTime);
          const endDateTime = combineDateAndTime(sessionDate, endTime);
          
          // Estrai i nomi dei formatori
          const trainerName = session.trainer
            ? `${session.trainer.firstName} ${session.trainer.lastName}`
            : '';
          
          const coTrainerName = session.co_trainer
            ? `${session.co_trainer.firstName} ${session.co_trainer.lastName}`
            : '';
          
          // Formatta il titolo dell'evento
          let title = courseName;
          if (companyNames) title += ` - ${companyNames}`;
          
          // Aggiungi formatori al titolo se disponibili
          let description = '';
          if (trainerName) description += `Formatore: ${trainerName}`;
          if (coTrainerName) description += description ? `, Co-formatore: ${coTrainerName}` : `Co-formatore: ${coTrainerName}`;
          
          events.push({
            id: session.id,
            scheduleId: schedule.id,
            title,
            description,
            start: startDateTime,
            end: endDateTime,
            resource: schedule
          });
        } catch (error) {
          console.error('Error parsing session dates:', error);
        }
      });
    } else {
      // Se non ci sono sessioni, crea un evento basato sulle date di inizio e fine
      try {
        const startDate = new Date(schedule.startDate);
        const endDate = new Date(schedule.endDate);
        
        // Se le date sono valide, aggiungi l'evento
        if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
          let title = courseName;
          if (companyNames) title += ` - ${companyNames}`;
          
          events.push({
            id: schedule.id,
            title,
        start: startDate,
        end: endDate,
            resource: schedule
    });
        }
      } catch (error) {
        console.error('Error parsing schedule dates:', error);
      }
    }
  });

  // Funzione rimossa - non utilizzata

  const handleDownloadTemplate = () => {
    const template = [
      {
        corso_id: 'ID del corso',
        data_inizio: 'YYYY-MM-DD',
        data_fine: 'YYYY-MM-DD',
        location: 'Sede del corso',
        partecipanti_max: 'Numero massimo',
        note: 'Note opzionali',
        modalita: 'IN_PERSON/ONLINE/HYBRID',
        formatore_id: 'ID del formatore',
        co_formatore_id: 'ID del co-formatore (opzionale)',
        sessioni: 'YYYY-MM-DD:HH:MM-HH:MM,YYYY-MM-DD:HH:MM-HH:MM',
        aziende_ids: 'ID1,ID2,ID3',
        dipendenti_ids: 'ID1,ID2,ID3'
      }
    ];
    exportToCsv(template, 'template_pianificazioni.csv');
  };
    
  // Applica ricerca e filtri
  const filteredSchedules = data
    .filter(item => {
      // Ricerca testuale
      if (searchTerm) {
        const searchRegex = new RegExp(searchTerm, 'i');
        return (
          searchRegex.test(item.corso) ||
          searchRegex.test(item.aziende) ||
          searchRegex.test(item.formatore) ||
          searchRegex.test(item.location)
        );
      }
      return true;
    })
    .filter(item => {
      // Filtri attivi
      return Object.entries(activeFilters).every(([field, value]) => {
        if (!value) return true;
        switch (field) {
          case 'modalità':
            return item.modalità === value;
          case 'formatore':
            return item.formatore.toLowerCase().includes(value.toLowerCase());
          case 'aziende':
            return item.aziende.toLowerCase().includes(value.toLowerCase());
          default:
            return true;
        }
      });
    })
    .sort((a, b) => {
      // Ordinamento
      if (!activeSort) return 0;
      
      const { field, direction } = activeSort;
      const multiplier = direction === 'asc' ? 1 : -1;
      
      switch (field) {
        case 'corso':
          return multiplier * a.corso.localeCompare(b.corso);
        case 'dataInizio':
          return multiplier * (new Date(a.dataInizio).getTime() - new Date(b.dataInizio).getTime());
        case 'dataFine':
          return multiplier * (new Date(a.dataFine).getTime() - new Date(b.dataFine).getTime());
        case 'formatore':
          return multiplier * a.formatore.localeCompare(b.formatore);
        case 'aziende':
          return multiplier * a.aziende.localeCompare(b.aziende);
        default:
          return 0;
      }
    });

  const handleDownloadCsv = () => {
    const csvData = filteredSchedules.map(item => ({
      ID: item.id,
      Corso: item.corso,
      Aziende: item.aziende,
      Formatore: item.formatore,
      'Co-Formatore': item.coFormatore,
      Partecipanti: item.partecipanti,
      'Data Inizio': item.dataInizio,
      'Data Fine': item.dataFine,
      Sessioni: item.sessioni,
      Modalità: item.modalità,
      Location: item.location
    }));
    
    exportToCsv(csvData, 'pianificazioni.csv');
  };

  const columns = [
    {
      id: 'select',
      header: selectionMode ? (
            <input
              type="checkbox"
              checked={selectAll}
              onChange={handleSelectAll}
          className="w-4 h-4"
            />
      ) : null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      cell: (info: any) => selectionMode ? (
            <input
              type="checkbox"
          checked={selectedIds.includes(info.row.original.id)}
          onChange={() => handleSelect(info.row.original.id)}
          className="w-4 h-4"
            />
      ) : null,
      width: 35,
      minWidth: 35,
      maxWidth: 35,
    },
    {
      id: 'corso',
      header: 'Corso',
      accessorKey: 'corso',
      width: 150,
    },
    { 
      id: 'aziende',
      header: 'Aziende',
      accessorKey: 'aziende',
      width: 150,
    },
    {
      id: 'formatore',
      header: 'Formatore',
      accessorKey: 'formatore',
      width: 120,
    },
    {
      id: 'coFormatore',
      header: 'Co-Formatore',
      accessorKey: 'coFormatore',
      width: 120,
    },
    {
      id: 'partecipanti',
      header: 'Partecipanti',
      accessorKey: 'partecipanti',
      width: 100,
    },
    { 
      id: 'dataInizio',
      header: 'Data Inizio',
      accessorKey: 'dataInizio',
      width: 100,
    },
    {
      id: 'dataFine',
      header: 'Data Fine',
      accessorKey: 'dataFine',
      width: 100,
    },
    {
      id: 'sessioni',
      header: 'Sessioni',
      accessorKey: 'sessioni',
      width: 150,
    },
    {
      id: 'modalità',
      header: 'Modalità',
      accessorKey: 'modalità',
      width: 100,
    },
    {
      id: 'location',
      header: 'Location',
      accessorKey: 'location',
      width: 120,
    },
    { 
      id: 'actions',
      header: 'Azioni',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      cell: (info: any) => (
        <div className="flex space-x-1">
          <button
            onClick={() => {
              const schedule = info.row.original._original;
              setEditingSchedule(schedule);
              setShowForm(true);
            }}
            className="p-1 text-blue-600 hover:text-blue-800"
            title="Modifica"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={() => handleDelete(info.row.original.id)}
            className="p-1 text-red-600 hover:text-red-800"
            title="Elimina"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
      width: 80,
    },
  ];

  // Component for the search and filter bar
  const SearchFilterBar = () => (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-2 md:space-y-0 md:space-x-4 mb-4">
      <SearchBarControls>
        <SearchBar
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Cerca pianificazioni..."
        />
        <FilterPanel
          filterOptions={[
            {
              field: 'modalità',
              label: 'Modalità',
              options: [
                { value: 'In presenza', label: 'In presenza' },
                { value: 'Online', label: 'Online' },
                { value: 'Ibrida', label: 'Ibrida' },
              ]
            },
            {
              field: 'formatore',
              label: 'Formatore',
              options: Array.from(new Set(data.map(d => d.formatore)))
                .filter(f => f !== 'N/A')
                .map(f => ({ value: f, label: f }))
            },
            {
              field: 'aziende',
              label: 'Aziende',
              options: Array.from(new Set(
                data.flatMap(d => d.aziende.split(', ').filter(a => a !== 'N/D'))
              )).map(a => ({ value: a, label: a }))
            }
          ]}
          activeFilters={activeFilters}
          onFilterChange={(field, value) => {
            setActiveFilters(prev => ({
              ...prev,
              [field]: value
            }));
          }}
          sortOptions={[
            { field: 'corso', label: 'Corso' },
            { field: 'dataInizio', label: 'Data inizio' },
            { field: 'dataFine', label: 'Data fine' },
            { field: 'formatore', label: 'Formatore' },
            { field: 'aziende', label: 'Aziende' }
          ]}
          activeSort={activeSort}
          onSortChange={setActiveSort}
        />
      </SearchBarControls>
      
      <HeaderPanel
        entityType="programmazione"
        entityGender="female"
        onAdd={() => {
          setEditingSchedule(null);
          setShowForm(true);
        }}
        onImport={() => {/* TODO: Implementare import */}}
        onDownload={handleDownloadTemplate}
        viewMode={view}
        onViewModeChange={(newView) => setView(newView as 'table' | 'calendar')}
        viewModeOptions={[
          { value: 'table', icon: <Table size={18} /> },
          { value: 'calendar', icon: <Calendar size={18} /> }
        ]}
        additionalActions={view === 'table' ? [
          {
            icon: <Download size={16} />,
            onClick: handleDownloadCsv,
            tooltip: "Esporta CSV"
          }
        ] : []}
      />
      </div>
    );

  return (
    <EntityListLayout
      title="Pianificazioni"
      subtitle="Gestisci tutti i corsi pianificati"
      searchFilterBar={<SearchFilterBar />}
      loading={loading}
      error={null}
      alert={alert}
      onAlertClose={() => setAlert(null)}
      selectionMode={selectionMode}
      onToggleSelection={() => {
        setSelectionMode(!selectionMode);
        if (selectionMode) {
          setSelectedIds([]);
          setSelectAll(false);
        }
      }}
      selectedCount={selectedIds.length}
      onDeleteSelected={handleDeleteSelected}
          >
      {view === 'table' ? (
        <ResizableTable
          columns={columns}
          data={filteredSchedules}
        />
      ) : (
        <ScheduleCalendar
          events={events}
          onSelectEvent={(event) => {
            const schedule = schedules.find(s => s.id === (event.scheduleId || event.id));
            if (schedule) {
              setEditingSchedule(schedule);
              setShowForm(true);
              setSelectedSlot(null);
            }
          }}
          onSelectSlot={(slotInfo) => {
            setEditingSchedule(null);
            setSelectedSlot({ start: slotInfo.start, end: slotInfo.end });
            setShowForm(true);
          }}
        />
      )}

      {showForm && (
        <ScheduleEventModalLazy
          key={editingSchedule?.id || 'new-schedule'}
          trainings={courses.map((c: Course & { title?: string }) => ({ ...c, title: c.title || c.name }))}
          trainers={trainers}
          companies={companies}
          employees={employees}
          existingEvent={editingSchedule ? {
            ...editingSchedule,
            trainingId: editingSchedule.course.id,
            trainerId: editingSchedule.sessions?.[0]?.trainer?.id || '',
            coTrainerId: editingSchedule.sessions?.[0]?.co_trainer?.id || '',
            dates: editingSchedule.sessions?.map(sess => ({
              date: sess.date.split('T')[0],
              start: sess.start,
              end: sess.end,
              trainerId: sess.trainer?.id || '',
              coTrainerId: sess.co_trainer?.id || '',
            })) || [],
            location: editingSchedule.location,
            maxParticipants: editingSchedule.maxParticipants,
            notes: editingSchedule.notes,
            deliveryMode: editingSchedule.deliveryMode,
            companyIds: editingSchedule.companies?.map((c) => c.company.id) || [],
            personIds: editingSchedule.enrollments?.map((e) => e.employee.id) || [],
          } : undefined}
          initialDate={
            selectedSlot
              ? selectedSlot.start.getFullYear() +
                '-' +
                String(selectedSlot.start.getMonth() + 1).padStart(2, '0') +
                '-' +
                String(selectedSlot.start.getDate()).padStart(2, '0')
              : undefined
          }
          initialTime={selectedSlot ? {
            start: selectedSlot.start.toTimeString().slice(0, 5),
            end: selectedSlot.end.toTimeString().slice(0, 5),
          } : undefined}
          onClose={() => {
            setShowForm(false);
            setEditingSchedule(null);
            setSelectedSlot(null);
          }}
          onSuccess={async () => {
            await fetchData();
            setShowForm(false);
            setEditingSchedule(null);
            setSelectedSlot(null);
          }}
        />
      )}
    </EntityListLayout>
  );
};

export default SchedulesPage;