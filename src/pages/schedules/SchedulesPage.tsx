import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Calendar,
  CheckCircle,
  Download,
  Edit,
  Eye,
  EyeOff,
  FileText,
  MoreVertical,
  Pencil,
  Plus,
  Table,
  Trash2,
  Upload
} from 'lucide-react';
import { useConfirmDialog } from '../../contexts/ConfirmDialogContext';
import ScheduleCalendar from '../../components/dashboard/ScheduleCalendar';
import type { ScheduleEvent, ScheduleResource } from '../Dashboard/hooks/useCalendarEvents';
import ScheduleEventModalLazy from '../../components/schedules/ScheduleEventModal.lazy';
import ExpiringCoursesSection from '../../components/schedules/ExpiringCoursesSection';
import EntityListLayout from '../../components/layouts/EntityListLayout';
import ResizableTable, { ResizableTableColumn } from '../../components/shared/ResizableTable';
import { Button } from '../../design-system/atoms/Button';
import { ViewModeToggle } from '../../design-system/molecules/ViewModeToggle';
import { FilterPanel } from '../../design-system/organisms/FilterPanel';
import { SearchBar } from '../../design-system/molecules/SearchBar';
import AddEntityDropdown from '../../components/ui/AddEntityDropdown';
import ColumnSelector from '../../components/ui/ColumnSelector';
import ActionButton from '../../components/ui/ActionButton';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator
} from '../../design-system/molecules/DropdownMenu/DropdownMenu';
import { exportToCsv } from '../../utils/csvExport';
import { getStatusBadgeColor, statusDotColors } from '../../utils/scheduleStatusColors';
import { apiGet, apiPut } from '../../services/api';
import { remove } from '../../services/apiClient';
import { getTrainers } from '../../services/trainers';
import { getCompanies } from '../../services/companies';
import { getPersons } from '../../services/persons';
import { getCourses } from '../../services/courses';
import { Company, Person } from '../../types';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { useTenantFilter } from '../../context/TenantFilterContext';

interface Schedule {
  id: string;
  course: { id: string; name: string; title?: string };
  startDate: string;
  endDate: string;
  location?: string;
  maxParticipants?: number;
  notes?: string;
  deliveryMode?: string;
  status?: string;
  isPublic?: boolean;
  attendance?: Array<{
    date: string;
    employee_ids: string[];
  }>;
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
  status: string;
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
  const { confirmDelete } = useConfirmDialog();
  const loadingRef = useRef(false);

  // Tenant filter from global context
  const { getTenantFilterParams, tenantFilterKey } = useTenantFilter();

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
  const [activeSort, setActiveSort] = useState<{ field: string, direction: 'asc' | 'desc' } | undefined>({ field: 'startDate', direction: 'desc' });
  const [hiddenColumns, setHiddenColumns] = useState<string[]>(['dataInizio', 'dataFine']);
  const [columnOrder, setColumnOrder] = useState<Record<string, number>>({});
  const [showImportedCourses, setShowImportedCourses] = useState(false);
  const [returnToDetailPage, setReturnToDetailPage] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Pre-selezione per riprogrammazione rapida da corsi in scadenza
  const [preSelectedCourseId, setPreSelectedCourseId] = useState<string | null>(null);
  const [preSelectedPersonIds, setPreSelectedPersonIds] = useState<string[]>([]);
  const [preSelectedCompanyIds, setPreSelectedCompanyIds] = useState<string[]>([]);

  // Counter per refresh ExpiringCoursesSection senza chiuderla
  const [expiringCoursesRefreshKey, setExpiringCoursesRefreshKey] = useState(0);

  // ✅ FIX: Carica schedule esistente quando scheduleId è nell'URL
  useEffect(() => {
    const openModal = searchParams.get('openModal');
    const scheduleId = searchParams.get('scheduleId');

    if (openModal && scheduleId && !showForm) {
      // Salva l'ID per il redirect dopo chiusura modal
      setReturnToDetailPage(scheduleId);

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
            setEditingSchedule(data as Schedule | null);
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
      setReturnToDetailPage(null);
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

  // Scroll alla sezione corsi in scadenza se hash presente
  useEffect(() => {
    if (location.hash === '#expiring-courses') {
      // Attendi che il DOM sia renderizzato
      setTimeout(() => {
        const element = document.getElementById('expiring-courses');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }, [location.hash]);

  // ✅ Applica filtri da URL (trainerId, status)
  useEffect(() => {
    const trainerId = searchParams.get('trainerId');
    const status = searchParams.get('status');

    if (trainerId && trainers.length > 0) {
      // Trova il nome del formatore per applicare il filtro
      const trainer = trainers.find(t => t.id === trainerId);
      if (trainer) {
        const trainerName = `${trainer.firstName} ${trainer.lastName}`.trim();
        setActiveFilters(prev => ({ ...prev, formatore: trainerName }));
      }
    }

    if (status) {
      // Status può essere una lista separata da virgole: PENDING,CONFIRMED,ACTIVE
      setActiveFilters(prev => ({ ...prev, status: status }));
    }
  }, [searchParams, trainers]);

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

      // Build tenant filter params
      const tenantParams = getTenantFilterParams();
      const tenantQueryString = tenantParams.tenantIds
        ? `?tenantIds=${tenantParams.tenantIds.join(',')}`
        : (tenantParams.allTenants ? '?allTenants=true' : '');

      // ✅ FIX: Carica solo i dati essenziali nel Promise.all principale
      // Persons viene caricato separatamente per evitare di bloccare il rendering
      const [schedulesData, rawCourses, trainersData, companiesData] = await Promise.all([
        apiGet(`/api/v1/schedules${tenantQueryString}`).then(data => {
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
  }, [getTenantFilterParams]); // Reload when tenant filter changes

  // ✅ FIX: Carica dati al mount e quando modal si chiude o tenant cambia
  useEffect(() => {
    console.log('[SchedulesPage] 🎯 Component mounted or modal closed, fetching data...');
    fetchData();
  }, [fetchData, showForm, tenantFilterKey]); // Reload when modal closes or tenant filter changes


  const handleDelete = async (id: string) => {
    const shouldDelete = await confirmDelete('questo programma');
    if (!shouldDelete) return;
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
    const shouldDelete = await confirmDelete('i corsi selezionati');
    if (!shouldDelete) return;
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

  const handleStatusChange = async (scheduleId: string, newStatus: string) => {
    try {
      await apiPut(`/api/v1/schedules/${scheduleId}`, { status: newStatus });
      // Aggiorna solo lo schedule nella lista locale senza ricaricare tutto
      // Questo evita di chiudere la sezione "Corsi in Scadenza"
      setSchedules(prevSchedules =>
        prevSchedules.map(schedule =>
          schedule.id === scheduleId
            ? { ...schedule, status: newStatus }
            : schedule
        )
      );
      // Trigger refresh della sezione corsi in scadenza (senza chiuderla)
      setExpiringCoursesRefreshKey(prev => prev + 1);
      setAlert({ type: 'success', message: 'Stato aggiornato con successo.' });
      setTimeout(() => setAlert(null), 3000);
    } catch (error) {
      setAlert({ type: 'error', message: 'Errore durante l\'aggiornamento dello stato.' });
      console.error('Error updating status:', error);
      setTimeout(() => setAlert(null), 3000);
    }
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

    // Mappa lo stato in italiano
    const statusMap: Record<string, string> = {
      'PENDING': 'Preventivo',
      'CONFIRMED': 'Confermato',
      'ACTIVE': 'Attivo',
      'COMPLETED': 'Completato',
      'CANCELLED': 'Cancellato',
      'SUSPENDED': 'Sospeso'
    };
    const statusItalian = statusMap[schedule.status || 'PENDING'] || 'Preventivo';

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
      status: statusItalian,
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

          // Crea resource compatibile con ScheduleResource
          const resource: ScheduleResource = {
            id: schedule.id,
            course: schedule.course,
            startDate: schedule.startDate,
            endDate: schedule.endDate,
            location: schedule.location,
            status: schedule.status || 'PENDING',
            sessions: schedule.sessions,
            companies: schedule.companies
          };

          events.push({
            id: session.id,
            scheduleId: schedule.id,
            title,
            start: startDateTime,
            end: endDateTime,
            resource,
            status: schedule.status || 'PENDING',
            tooltip: description || title,
            sessioniTooltipHtml: description || title
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

          // Crea resource compatibile con ScheduleResource
          const resource: ScheduleResource = {
            id: schedule.id,
            course: schedule.course,
            startDate: schedule.startDate,
            endDate: schedule.endDate,
            location: schedule.location,
            status: schedule.status || 'PENDING',
            sessions: schedule.sessions,
            companies: schedule.companies
          };

          events.push({
            id: schedule.id,
            scheduleId: schedule.id,
            title,
            start: startDate,
            end: endDate,
            resource,
            status: schedule.status || 'PENDING',
            tooltip: title,
            sessioniTooltipHtml: title
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
    const templateHeaders = {
      'Corso ID': 'corso_id',
      'Data Inizio': 'data_inizio',
      'Data Fine': 'data_fine',
      'Location': 'location',
      'Max Partecipanti': 'partecipanti_max',
      'Note': 'note',
      'Modalità': 'modalita',
      'Formatore ID': 'formatore_id',
      'Co-Formatore ID': 'co_formatore_id',
      'Sessioni': 'sessioni',
      'Aziende IDs': 'aziende_ids',
      'Dipendenti IDs': 'dipendenti_ids'
    };
    exportToCsv(template, templateHeaders, 'template_pianificazioni.csv');
  };

  // Applica ricerca e filtri
  const filteredSchedules = data
    .filter(item => {
      // Filtro per nascondere corsi importati
      if (!showImportedCourses) {
        const notes = item._original?.notes || '';
        if (notes.toLowerCase().includes('corso esterno importato')) {
          return false;
        }
      }
      return true;
    })
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
          case 'status':
            // Status può essere una lista separata da virgole: PENDING,CONFIRMED,ACTIVE
            const allowedStatuses = value.split(',').map(s => s.trim());
            return allowedStatuses.includes(item._original?.status || 'PENDING');
          default:
            return true;
        }
      });
    })
    .sort((a, b) => {
      // Ordinamento: se activeSort è impostato su startDate, usa ordinamento personalizzato
      // Futuri prima (dal più prossimo), poi passati recenti, infine i più remoti
      const now = new Date();
      const parseItalianDate = (dateStr: string): Date => {
        // Formato italiano: DD/MM/YYYY
        const [day, month, year] = dateStr.split('/').map(Number);
        return new Date(year, month - 1, day);
      };

      const dateA = parseItalianDate(a.dataInizio);
      const dateB = parseItalianDate(b.dataInizio);
      const isFutureA = dateA >= now;
      const isFutureB = dateB >= now;

      // Se activeSort non è impostato o è su startDate, usa ordinamento personalizzato
      if (!activeSort || activeSort.field === 'startDate') {
        // Se uno è futuro e l'altro no, il futuro viene prima
        if (isFutureA && !isFutureB) return -1;
        if (!isFutureA && isFutureB) return 1;

        // Se entrambi futuri: ordina dal più prossimo (asc)
        if (isFutureA && isFutureB) {
          return dateA.getTime() - dateB.getTime();
        }

        // Se entrambi passati: ordina dal più recente al più remoto (desc)
        return dateB.getTime() - dateA.getTime();
      }

      // Altri ordinamenti
      const { field, direction } = activeSort;
      const multiplier = direction === 'asc' ? 1 : -1;

      switch (field) {
        case 'corso':
          return multiplier * a.corso.localeCompare(b.corso);
        case 'dataInizio':
          return multiplier * (dateA.getTime() - dateB.getTime());
        case 'dataFine':
          return multiplier * (parseItalianDate(a.dataFine).getTime() - parseItalianDate(b.dataFine).getTime());
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
      id: item.id,
      corso: item.corso,
      aziende: item.aziende,
      formatore: item.formatore,
      coFormatore: item.coFormatore,
      partecipanti: item.partecipanti,
      dataInizio: item.dataInizio,
      dataFine: item.dataFine,
      sessioni: item.sessioni,
      modalita: item.modalità,
      location: item.location
    }));

    const csvHeaders = {
      'ID': 'id',
      'Corso': 'corso',
      'Aziende': 'aziende',
      'Formatore': 'formatore',
      'Co-Formatore': 'coFormatore',
      'Partecipanti': 'partecipanti',
      'Data Inizio': 'dataInizio',
      'Data Fine': 'dataFine',
      'Sessioni': 'sessioni',
      'Modalità': 'modalita',
      'Location': 'location'
    };

    exportToCsv(csvData, csvHeaders, 'pianificazioni.csv');
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
    {
      key: 'actions',
      label: 'Azioni',
      width: 120,
      renderCell: (row) => (
        <ActionButton
          actions={[
            {
              label: 'Visualizza',
              icon: <Eye className="h-4 w-4" />,
              onClick: () => {
                navigate(`/schedules/${row.id}`);
              },
              variant: 'default',
            },
            {
              label: 'Modifica',
              icon: <Edit className="h-4 w-4" />,
              onClick: () => {
                const schedule = row._original;
                setEditingSchedule(schedule);
                setShowForm(true);
              },
              variant: 'default',
            },
            {
              label: 'Elimina',
              icon: <Trash2 className="h-4 w-4" />,
              onClick: () => handleDelete(row.id),
              variant: 'danger',
            },
          ]}
          asPill={true}
        />
      ),
    },
    {
      key: 'status',
      label: 'Stato',
      width: 140,
      renderCell: (row) => {
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(row.status)} hover:opacity-80 transition cursor-pointer`}>
                  {row.status}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStatusChange(row.id, 'PENDING'); }}>
                  <span className="w-2 h-2 rounded-full bg-yellow-500 mr-2" />
                  Preventivo
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStatusChange(row.id, 'CONFIRMED'); }}>
                  <span className={`w-2 h-2 rounded-full ${statusDotColors['Confermato']} mr-2`} />
                  Confermato
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStatusChange(row.id, 'ACTIVE'); }}>
                  <span className={`w-2 h-2 rounded-full ${statusDotColors['Attivo']} mr-2`} />
                  Attivo
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStatusChange(row.id, 'COMPLETED'); }}>
                  <span className={`w-2 h-2 rounded-full ${statusDotColors['Completato']} mr-2`} />
                  Completato
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStatusChange(row.id, 'SUSPENDED'); }}>
                  <span className={`w-2 h-2 rounded-full ${statusDotColors['Sospeso']} mr-2`} />
                  Sospeso
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => { e.stopPropagation(); handleStatusChange(row.id, 'CANCELLED'); }}
                  className="text-red-600 focus:text-red-700 focus:bg-red-50"
                >
                  <span className={`w-2 h-2 rounded-full ${statusDotColors['Cancellato']} mr-2`} />
                  Cancellato
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
    { key: 'corso', label: 'Corso', width: 150, sortable: true },
    {
      key: 'aziende',
      label: 'Aziende',
      width: 180,
      sortable: true,
      renderCell: (row) => {
        const companies = row.aziende.split(', ').filter(c => c !== 'N/D');
        if (companies.length === 0) return <span className="text-gray-400">N/D</span>;
        return (
          <div className="space-y-1">
            {companies.map((company, idx) => (
              <div key={idx} className="text-sm">{company}</div>
            ))}
          </div>
        );
      }
    },
    {
      key: 'formatore',
      label: 'Formatore',
      width: 150,
      sortable: true,
      renderCell: (row) => (
        <div className="space-y-1">
          <div className="text-sm font-medium">{row.formatore}</div>
          {row.coFormatore !== '-' && (
            <div className="text-xs text-gray-500">Co: {row.coFormatore}</div>
          )}
        </div>
      )
    },
    { key: 'partecipanti', label: 'Partecipanti', width: 100 },
    { key: 'dataInizio', label: 'Data Inizio', width: 100, sortable: true, hidden: true },
    { key: 'dataFine', label: 'Data Fine', width: 100, sortable: true, hidden: true },
    {
      key: 'sessioni',
      label: 'Sessioni',
      width: 150,
      renderCell: (row) => {
        const sessions = row.sessioni.split(', ').filter(s => s !== 'N/D');
        if (sessions.length === 0) return <span className="text-gray-400">N/D</span>;
        return (
          <div className="space-y-1">
            {sessions.map((session, idx) => (
              <div key={idx} className="text-xs text-gray-600">{session}</div>
            ))}
          </div>
        );
      }
    },
    { key: 'modalità', label: 'Modalità', width: 100 },
    { key: 'location', label: 'Luogo', width: 120 },
  ];

  // Component for the search and filter bar
  const SearchFilterBar = () => (
    <div className="space-y-4 mb-4">
      {/* Prima riga: Descrizione con toggle view mode e pulsante Aggiungi */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex-1">
          <p className="text-gray-500">
            Gestisci le pianificazioni dei corsi, visualizza il calendario e crea nuovi eventi.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <ViewModeToggle
            viewMode={view as 'table' | 'grid'}
            onChange={(newView) => setView(newView as 'table' | 'calendar')}
            gridLabel="Calendario"
            tableLabel="Tabella"
          />

          <AddEntityDropdown
            label="Aggiungi Pianificazione"
            options={[
              {
                label: 'Nuova Pianificazione',
                icon: <Plus className="h-4 w-4" />,
                onClick: () => {
                  setEditingSchedule(null);
                  setShowForm(true);
                }
              },
              {
                label: 'Importa da CSV',
                icon: <Upload className="h-4 w-4" />,
                onClick: () => {
                  // TODO: Implementare import CSV
                  console.log('Import CSV');
                }
              },
              {
                label: 'Scarica template CSV',
                icon: <FileText className="h-4 w-4" />,
                onClick: handleDownloadTemplate
              }
            ]}
            icon={<Plus className="h-4 w-4" />}
            variant="primary"
          />
        </div>
      </div>

      {/* Seconda riga: Search bar a sinistra e pulsanti a destra */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 max-w-md">
          <SearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Cerca pianificazioni..."
            className="h-10 bg-white"
            showButton={false}
            showClearButton={true}
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle per mostrare/nascondere corsi importati */}
          <Button
            variant={showImportedCourses ? 'outline' : 'secondary'}
            size="sm"
            onClick={() => setShowImportedCourses(!showImportedCourses)}
            className="h-10 flex items-center gap-2 whitespace-nowrap"
            title={showImportedCourses ? 'Nascondi corsi importati' : 'Mostra corsi importati'}
          >
            {showImportedCourses ? (
              <><EyeOff className="h-4 w-4" /> Nascondi importati</>
            ) : (
              <><Eye className="h-4 w-4" /> Mostra importati</>
            )}
          </Button>

          <FilterPanel
            filterOptions={[
              {
                value: 'modalità',
                label: 'Modalità',
                options: [
                  { value: 'In presenza', label: 'In presenza' },
                  { value: 'Online', label: 'Online' },
                  { value: 'Ibrida', label: 'Ibrida' },
                ]
              },
              {
                value: 'formatore',
                label: 'Formatore',
                options: Array.from(new Set(data.map(d => d.formatore)))
                  .filter(f => f !== 'N/A')
                  .map(f => ({ value: f, label: f }))
              },
              {
                value: 'aziende',
                label: 'Aziende',
                options: Array.from(new Set(
                  data.flatMap(d => d.aziende.split(', ').filter(a => a !== 'N/D'))
                )).map(a => ({ value: a, label: a }))
              }
            ]}
            activeFilters={activeFilters}
            onFilterChange={(filters) => {
              setActiveFilters(filters as Record<string, string>);
            }}
            sortOptions={[
              { value: 'corso', label: 'Corso' },
              { value: 'dataInizio', label: 'Data inizio' },
              { value: 'dataFine', label: 'Data fine' },
              { value: 'formatore', label: 'Formatore' },
              { value: 'aziende', label: 'Aziende' }
            ]}
            activeSort={activeSort}
            onSortChange={setActiveSort}
            className="h-10"
          />

          {/* Pulsante Colonne */}
          <div className="flex items-center gap-2">
            {view === 'table' && (
              <ColumnSelector
                columns={columns.filter(col => col.key !== 'select' && col.key !== 'actions').map(col => ({
                  key: col.key,
                  label: col.label,
                  required: false
                }))}
                hiddenColumns={hiddenColumns}
                onChange={setHiddenColumns}
                onOrderChange={setColumnOrder}
                columnOrder={columnOrder}
                buttonClassName="h-10 flex items-center gap-2"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <EntityListLayout
      title="Pianificazioni"
      subtitle="Gestisci tutti i corsi pianificati"
      headerContent={<SearchFilterBar />}
      loading={loading}
      error={undefined}
    >
      {/* Sezione Corsi in Scadenza */}
      <div id="expiring-courses">
        <ExpiringCoursesSection
          refreshKey={expiringCoursesRefreshKey}
          onScheduleCourse={(personId, courseId) => {
            // Apri il modal di creazione schedule con corso pre-selezionato
            setPreSelectedCourseId(courseId);
            setPreSelectedPersonIds([personId]);
            setPreSelectedCompanyIds([]);
            setEditingSchedule(null);
            setSelectedSlot(null);
            setShowForm(true);
          }}
          onQuickSchedule={(courseId, personIds, companyIds) => {
            // Riprogrammazione rapida: apri modal con dipendenti e aziende pre-selezionati
            console.log('[SchedulesPage] 🚀 Quick schedule:', { courseId, personIds, companyIds });
            setPreSelectedCourseId(courseId);
            setPreSelectedPersonIds(personIds);
            setPreSelectedCompanyIds(companyIds);
            setEditingSchedule(null);
            setSelectedSlot(null);
            setShowForm(true);
          }}
        />
      </div>

      {alert && (
        <div className={`mb-4 p-4 ${alert.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
          } border rounded-lg`}>
          <div className="flex items-center justify-between">
            <span>{alert.message}</span>
            <button
              onClick={() => setAlert(null)}
              className={alert.type === 'success' ? 'text-green-600 hover:text-green-800' : 'text-red-600 hover:text-red-800'}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {selectionMode && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-blue-800">
              Modalità selezione attiva - {selectedIds.length} elementi selezionati
            </span>
            <button
              onClick={() => {
                setSelectionMode(false);
                setSelectedIds([]);
                setSelectAll(false);
              }}
              className="text-blue-600 hover:text-blue-800"
            >
              Annulla
            </button>
          </div>
        </div>
      )}
      {view === 'table' ? (
        <ResizableTable<DataRow>
          columns={columns}
          data={filteredSchedules}
          onRowClick={(row) => {
            if (!selectionMode) {
              navigate(`/schedules/${row.id}`);
            }
          }}
          rowClassName={(row) => {
            const rowColors: Record<string, string> = {
              'Preventivo': 'bg-yellow-50 hover:bg-yellow-100',
              'Confermato': 'bg-blue-50 hover:bg-blue-100',
              'Attivo': 'bg-green-50 hover:bg-green-100',
              'Completato': 'bg-gray-50 hover:bg-gray-100',
              'Cancellato': 'bg-red-50 hover:bg-red-100',
              'Sospeso': 'bg-orange-50 hover:bg-orange-100'
            };
            return rowColors[row.status] || '';
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
          key={editingSchedule?.id || preSelectedCourseId || 'new-schedule'}
          trainings={courses.map((c: Course & { title?: string }) => ({ ...c, title: c.title || c.name }))}
          trainers={trainers}
          companies={companies}
          persons={persons}
          preSelectedCourseId={preSelectedCourseId}
          preSelectedPersonIds={preSelectedPersonIds}
          preSelectedCompanyIds={preSelectedCompanyIds}
          existingEvent={editingSchedule ? ({
            id: editingSchedule.id,
            training_id: editingSchedule.course?.id || '',
            dates: editingSchedule.sessions?.map(sess => ({
              sessionId: sess.id, // ID reale della sessione per generazione registri
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
            attendance: editingSchedule.attendance || [],
            isPublic: editingSchedule.isPublic || false, // ✅ FIX: Aggiunto isPublic per calendario pubblico
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
            // Reset pre-selezione
            setPreSelectedCourseId(null);
            setPreSelectedPersonIds([]);
            setPreSelectedCompanyIds([]);
            clearOpenModalParam();
            // Naviga alla detail page se aperto da lì
            if (returnToDetailPage) {
              navigate(`/schedules/${returnToDetailPage}`);
              setReturnToDetailPage(null);
            }
          }}
          onSuccess={async () => {
            await fetchData();
            setShowForm(false);
            setEditingSchedule(null);
            setSelectedSlot(null);
            // Reset pre-selezione
            setPreSelectedCourseId(null);
            setPreSelectedPersonIds([]);
            setPreSelectedCompanyIds([]);
            clearOpenModalParam();
            // Naviga alla detail page se aperto da lì
            if (returnToDetailPage) {
              navigate(`/schedules/${returnToDetailPage}`);
              setReturnToDetailPage(null);
            }
          }}
        />
      )}
    </EntityListLayout>
  );
};

export default SchedulesPage;