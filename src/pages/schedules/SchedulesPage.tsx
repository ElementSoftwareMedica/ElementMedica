import React, { useEffect, useState, useCallback, useRef } from 'react';
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
import ResizableTable, { ResizableTableColumn } from '../../components/shared/ResizableTable';
import { HeaderPanel } from '../../design-system/organisms/HeaderPanel';
import { SearchBarControls } from '../../design-system/molecules/SearchBarControls';
import { FilterPanel } from '../../design-system/organisms/FilterPanel';
import { SearchBar } from '../../design-system/molecules/SearchBar';
import { exportToCsv } from '../../utils/csvExport';
import { apiGet } from '../../services/api';
import { remove } from '../../services/apiClient';
import { getTrainers } from '../../services/trainers';
import { getCompanies } from '../../services/companies';
import { getPersons } from '../../services/persons';
import { getCourses } from '../../services/courses';
import { Company, Person } from '../../types';
import { useSearchParams, useNavigate } from 'react-router-dom';

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

// Riga dati per la tabella di ResizableTable
interface DataRow {
  id: string;
  corso: string;
  aziende: string;
  formatore: string;
  coFormatore: string;
  partecipanti: number;
  dataInizio: string;
  dataFine: string;
  sessioni: string;
  modalità: string;
  location: string;
  selected: boolean;
  _original: Schedule;
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
  const loadingRef = useRef(false);
  
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [persons, setPersons] = useState<Person[]>([]);
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
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // ✅ FIX: Carica schedule esistente quando scheduleId è nell'URL
  useEffect(() => {
    const openModal = searchParams.get('openModal');
    const scheduleId = searchParams.get('scheduleId');
    
    if (openModal && scheduleId && !showForm) {
      // Cerca lo schedule nei dati già caricati
      const existingSchedule = schedules.find(s => s.id === scheduleId);
      
      if (existingSchedule) {
        console.log('[SchedulesPage] 📝 Loading schedule for edit:', scheduleId, existingSchedule);
        setEditingSchedule(existingSchedule);
        setSelectedSlot(null);
        setShowForm(true);
      } else {
        // Se non trovato nei dati locali, carica dal server
        console.log('[SchedulesPage] 🔄 Schedule not found in local data, fetching from server...');
        apiGet(`/api/v1/schedules/${scheduleId}`)
          .then((data) => {
            console.log('[SchedulesPage] ✅ Schedule loaded:', data);
            setEditingSchedule(data);
            setSelectedSlot(null);
            setShowForm(true);
          })
          .catch((err) => {
            console.error('[SchedulesPage] ❌ Failed to load schedule:', err);
            setAlert({ type: 'error', message: 'Impossibile caricare il corso programmato' });
          });
      }
    } else if (openModal && !scheduleId && !showForm) {
      // Nuovo schedule
      setEditingSchedule(null);
      setSelectedSlot(null);
      setShowForm(true);
    }
  }, [searchParams, showForm, schedules]);

  // Rimuove il parametro openModal dalla URL per evitare riaperture automatiche del modal
  const clearOpenModalParam = () => {
    if (searchParams.get('openModal')) {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('openModal');
      setSearchParams(newParams, { replace: true });
    }
  };

  // Salva view preference
  useEffect(() => {
    localStorage.setItem('schedulesViewMode', view);
  }, [view]);

  const fetchData = useCallback(async () => {
    // Evita chiamate multiple durante il loading usando ref
    if (loadingRef.current) {
      console.log('[SchedulesPage] ⏭️ Already loading, skipping fetchData');
      return;
    }
    
    loadingRef.current = true;
    setLoading(true);
    console.log('[SchedulesPage] 🔄 Fetching data... (loading=true)');
    
    try {
      console.log('[SchedulesPage] ⏳ Calling Promise.all for schedules, courses, trainers, companies...');
      
      // ✅ FIX: Carica solo i dati essenziali nel Promise.all principale
      // Persons viene caricato separatamente per evitare di bloccare il rendering
      const [schedulesData, rawCourses, trainersData, companiesData] = await Promise.all([
        apiGet('/api/v1/schedules').then(data => {
          console.log('[SchedulesPage] ✅ Schedules API response received:', Array.isArray(data) ? `${data.length} items` : typeof data);
          return data;
        }),
        getCourses().then(data => {
          console.log('[SchedulesPage] ✅ Courses service response received:', Array.isArray(data) ? `${data.length} items` : typeof data);
          return data;
        }),
        getTrainers().then(data => {
          console.log('[SchedulesPage] ✅ Trainers service response received:', Array.isArray(data) ? `${data.length} items` : typeof data);
          return data;
        }),
        getCompanies().then(data => {
          console.log('[SchedulesPage] ✅ Companies service response received:', Array.isArray(data) ? `${data.length} items` : typeof data);
          return data;
        })
      ]);
      
      console.log('[SchedulesPage] 🎉 Essential data loaded! Loading persons in background...');
      
      // ✅ Carica persons in background senza bloccare il rendering
      getPersons({ limit: 1000, page: 1 })
        .then(data => {
          console.log('[SchedulesPage] ✅ Persons loaded in background:', (data as any)?.persons?.length || 0, 'persons');
          const personsArray = (data as any)?.persons ?? data;
          setPersons(personsArray as Person[]);
        })
        .catch(err => {
          console.warn('[SchedulesPage] ⚠️ Persons loading failed (non-critical):', err);
          setPersons([]);
        });

      console.log('[SchedulesPage] 📊 Essential data fetched:', {
        schedulesCount: Array.isArray(schedulesData) ? schedulesData.length : 0,
        schedulesType: typeof schedulesData,
        schedulesIsArray: Array.isArray(schedulesData),
        coursesCount: Array.isArray(rawCourses) ? rawCourses.length : 0,
        trainersCount: Array.isArray(trainersData) ? trainersData.length : 0,
        companiesCount: Array.isArray(companiesData) ? companiesData.length : 0,
        sampleSchedule: Array.isArray(schedulesData) && schedulesData[0] ? schedulesData[0] : null
      });

      // Validazione robusta: assicurati che schedulesData sia un array
      const validSchedules = Array.isArray(schedulesData) ? schedulesData : [];
      
      if (!Array.isArray(schedulesData)) {
        console.error('[SchedulesPage] ⚠️ schedulesData is not an array:', schedulesData);
      }

      // Mappa i corsi del service unificato alla shape locale { id, name }
      const coursesData: Course[] = (Array.isArray(rawCourses) ? rawCourses : []).map((c: any) => ({ 
        id: c.id, 
        name: c.title || c.name || 'N/A' 
      }));

      // ✅ Imposta i dati essenziali usando setState batch per evitare flickering
      setSchedules(validSchedules as Schedule[]);
      setCourses(coursesData);
      setTrainers(Array.isArray(trainersData) ? trainersData as Trainer[] : []);
      setCompanies(Array.isArray(companiesData) ? companiesData as Company[] : []);
      // Persons viene impostato dal promise in background (vedi sopra)
      
      console.log('[SchedulesPage] ✅ States updated with valid data');
    } catch (error) {
      console.error('[SchedulesPage] ❌ Error fetching data:', error);
      
      // Imposta stati di default per evitare UI vuota o inconsistente
      setSchedules([]);
      setCourses([]);
      setTrainers([]);
      setCompanies([]);
      setPersons([]);
      
      // Mostra alert solo se non è un errore di autenticazione temporaneo
      if (error && typeof error === 'object' && 'response' in error) {
        const responseError = error as { response?: { status?: number } };
        if (responseError.response?.status !== 401 && responseError.response?.status !== 403) {
          setAlert({ 
            type: 'error', 
            message: 'Errore durante il caricamento dei dati. Riprova.' 
          });
        }
      }
    } finally {
      loadingRef.current = false;
      setLoading(false);
      console.log('[SchedulesPage] ✅ Loading complete (loading=false)');
    }
  }, []); // Nessuna dipendenza - usa ref per evitare loop

  // ✅ FIX: Carica dati al mount e quando modal si chiude
  useEffect(() => {
    console.log('[SchedulesPage] 🎯 Component mounted or modal closed, fetching data...');
    fetchData();
  }, [fetchData, showForm]); // Reload when modal closes (showForm becomes false)


  const handleDelete = async (id: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo programma?')) return;
    try {
      await remove('schedules', id);
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
      await Promise.all(selectedIds.map(id => remove('schedules', id)));
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
  const data: DataRow[] = schedules.map(schedule => {
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

  const columns: ResizableTableColumn<DataRow>[] = [
    {
      key: 'select',
      label: '',
      width: 35,
      minWidth: 35,
      renderHeader: () => selectionMode ? (
        <input
          type="checkbox"
          checked={selectAll}
          onChange={handleSelectAll}
          className="w-4 h-4"
        />
      ) : null,
      renderCell: (row) => selectionMode ? (
        <input
          type="checkbox"
          checked={selectedIds.includes(row.id)}
          onChange={() => handleSelect(row.id)}
          className="w-4 h-4"
        />
      ) : null,
    },
    { key: 'corso', label: 'Corso', width: 150, sortable: true },
    { key: 'aziende', label: 'Aziende', width: 150, sortable: true },
    { key: 'formatore', label: 'Formatore', width: 120, sortable: true },
    { key: 'coFormatore', label: 'Co-Formatore', width: 120 },
    { key: 'partecipanti', label: 'Partecipanti', width: 100 },
    { key: 'dataInizio', label: 'Data Inizio', width: 100, sortable: true },
    { key: 'dataFine', label: 'Data Fine', width: 100, sortable: true },
    { key: 'sessioni', label: 'Sessioni', width: 150 },
    { key: 'modalità', label: 'Modalità', width: 100 },
    { key: 'location', label: 'Location', width: 120 },
    {
      key: 'actions',
      label: 'Azioni',
      width: 80,
      renderCell: (row) => (
        <div className="flex space-x-1">
          <button
            onClick={() => {
              const schedule = row._original;
              setEditingSchedule(schedule);
              setShowForm(true);
            }}
            className="p-1 text-blue-600 hover:text-blue-800"
            title="Modifica"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={() => handleDelete(row.id)}
            className="p-1 text-red-600 hover:text-red-800"
            title="Elimina"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
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
        entityGender="f"
        onAdd={() => {
          setEditingSchedule(null);
          setShowForm(true);
        }}
        onImport={() => {/* TODO: Implementare import */}}
        onDownloadTemplate={handleDownloadTemplate}
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
      headerContent={<SearchFilterBar />}
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
        <ResizableTable<DataRow>
          columns={columns}
          data={filteredSchedules}
          onRowClick={(row) => {
            if (!selectionMode) {
              navigate(`/schedules/${row.id}`);
            }
          }}
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
          persons={persons}
          existingEvent={editingSchedule ? ({
            id: editingSchedule.id,
            training_id: editingSchedule.course?.id || '',
            dates: editingSchedule.sessions?.map(sess => ({
              date: sess.date.split('T')[0],
              start: sess.start,
              end: sess.end,
              trainerId: sess.trainer?.id || '',
              coTrainerId: sess.co_trainer?.id || '',
            })) || [],
            location: editingSchedule.location || '',
            max_participants: editingSchedule.maxParticipants || 0,
            notes: editingSchedule.notes || '',
            delivery_mode: editingSchedule.deliveryMode?.toLowerCase().replace('_', '-') || '',
            risk_level: (editingSchedule.course as any)?.riskLevel || '',
            course_type: (editingSchedule.course as any)?.courseType || '',
            company_ids: editingSchedule.companies?.map((c) => c.company.id) || [],
            employee_ids: editingSchedule.enrollments?.map((e: any) => e.person?.id || e.employee?.id).filter(Boolean) || [],
          }) : undefined}
          initialDate={
            selectedSlot
              ? selectedSlot.start.getFullYear() +
                '-' +
                String(selectedSlot.start.getMonth() + 1).padStart(2, '0') +
                '-' +
                String(selectedSlot.start.getDate()).padStart(2, '0')
              : undefined
          }
          initialTime={selectedSlot ? ({
            start: selectedSlot.start.toTimeString().slice(0, 5),
            end: selectedSlot.end.toTimeString().slice(0, 5),
          }) : undefined}
          onClose={() => {
            setShowForm(false);
            setEditingSchedule(null);
            setSelectedSlot(null);
            clearOpenModalParam();
          }}
          onSuccess={async () => {
            await fetchData();
            setShowForm(false);
            setEditingSchedule(null);
            setSelectedSlot(null);
            clearOpenModalParam();
          }}
        />
      )}
    </EntityListLayout>
  );
};

export default SchedulesPage;