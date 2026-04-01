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
import { getStatusBadgeColor, getStatusRowColor, statusDotColors } from '../../utils/scheduleStatusColors';
import { apiGet, apiPut } from '../../services/api';
import { remove } from '../../services/apiClient';
import { getTrainers } from '../../services/trainers';
import { getCompanies } from '../../services/companies';
import { getPersons } from '../../services/persons';
import { getCourses } from '../../services/courses';
import { Company, Person } from '../../types';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { useTenantFilter } from '../../context/TenantFilterContext';
import { useTenantMode } from '../../contexts/TenantModeContext';
import { useToast } from '../../hooks/useToast';

interface Schedule {
  id: string;
  course: { id: string; name: string; title?: string };
  startDate: string;
  endDate: string;
  expiryDate?: string;
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
  // P49: ScheduleCompany has companyTenantProfile relation
  companies?: Array<{
    companyTenantProfileId?: string;
    companyTenantProfile?: {
      id: string;
      company: { id: string; ragioneSociale?: string };
    };
    company?: { id: string; ragioneSociale?: string };
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
  dataScadenza: string;
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
  const { getTenantFilterParams, tenantFilterKey, isReady } = useTenantFilter();

  // Multi-tenant CRUD operations - use selected tenant for operations
  const { getOperateHeaders } = useTenantMode();

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
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [activeSort, setActiveSort] = useState<{ field: string, direction: 'asc' | 'desc' } | undefined>({ field: 'startDate', direction: 'desc' });
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
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
        setEditingSchedule(existingSchedule);
        setSelectedSlot(null);
        setShowForm(true);
      } else {
        // Se non trovato nei dati locali, carica dal server
        apiGet(`/api/v1/schedules/${scheduleId}`)
          .then((data) => {
            setEditingSchedule(data as Schedule | null);
            setSelectedSlot(null);
            setShowForm(true);
          })
          .catch((err) => {
            if (import.meta.env.DEV) console.error('[SchedulesPage] ❌ Failed to load schedule:', err);
            showToast({ message: 'Impossibile caricare il corso programmato', type: 'error' });
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
      return;
    }

    loadingRef.current = true;
    setLoading(true);

    try {
      // Build tenant filter params
      const tenantParams = getTenantFilterParams();
      const tenantQueryString = tenantParams.tenantIds
        ? `?tenantIds=${tenantParams.tenantIds.join(',')}`
        : (tenantParams.allTenants ? '?allTenants=true' : '');

      // ✅ FIX: Carica solo i dati essenziali nel Promise.all principale
      // Build tenant params for companies and persons
      const companyTenantParams: { allTenants?: boolean; tenantIds?: string } = {};
      if (tenantParams.tenantIds) {
        companyTenantParams.tenantIds = tenantParams.tenantIds.join(',');
      } else if (tenantParams.allTenants) {
        companyTenantParams.allTenants = true;
      }

      // Carica tutti i dati necessari in parallelo (persons incluso — serve al modal)
      const personsFilter: Record<string, any> = { limit: 1000, page: 1 };
      if (tenantParams.tenantIds) {
        personsFilter.tenantIds = tenantParams.tenantIds.join(',');
      } else if (tenantParams.allTenants) {
        personsFilter.allTenants = true;
      }

      const [schedulesData, rawCourses, trainersData, companiesData, personsData] = await Promise.all([
        apiGet(`/api/v1/schedules${tenantQueryString}`),
        getCourses(),
        getTrainers(),
        getCompanies(companyTenantParams),
        getPersons(personsFilter).catch(err => {
          if (import.meta.env.DEV) console.warn('[SchedulesPage] ⚠️ Persons loading failed:', err);
          return { persons: [] };
        })
      ]);

      // Imposta persons subito
      const personsArray = (personsData as any)?.persons ?? personsData;
      setPersons(Array.isArray(personsArray) ? personsArray as Person[] : []);

      // Validazione robusta: assicurati che schedulesData sia un array
      const validSchedules = Array.isArray(schedulesData) ? schedulesData : [];

      if (!Array.isArray(schedulesData)) {
        if (import.meta.env.DEV) console.error('[SchedulesPage] ⚠️ schedulesData is not an array:', schedulesData);
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
    } catch (error) {
      if (import.meta.env.DEV) console.error('[SchedulesPage] ❌ Error fetching data:', error);

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
          showToast({
            type: 'error',
            message: 'Errore durante il caricamento dei dati. Riprova.'
          });
        }
      }
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [getTenantFilterParams, tenantFilterKey]); // Reload when tenant filter changes

  // ✅ FIX: Carica dati al mount e quando modal si chiude o tenant cambia
  useEffect(() => {
    if (!isReady) return;
    fetchData();
  }, [fetchData, showForm, tenantFilterKey, isReady]); // Reload when modal closes or tenant filter changes


  const handleDelete = async (id: string) => {
    const shouldDelete = await confirmDelete('questo programma');
    if (!shouldDelete) return;
    try {
      const headers = getOperateHeaders();
      await remove('schedules', id, { headers });
      showToast({ message: 'Corso eliminato con successo.', type: 'success' });
      await fetchData();
    } catch (error) {
      showToast({ message: 'Errore durante l\'eliminazione.', type: 'error' });
      if (import.meta.env.DEV) console.error('Error deleting schedule:', error);
    }
  };

  const handleDeleteSelected = async () => {
    if (!selectedIds.length) return;
    const shouldDelete = await confirmDelete('i corsi selezionati');
    if (!shouldDelete) return;
    setLoading(true);
    try {
      const headers = getOperateHeaders();
      await Promise.all(selectedIds.map(id => remove('schedules', id, { headers })));
      setSelectedIds([]);
      setSelectionMode(false);
      showToast({ message: 'Corsi eliminati con successo.', type: 'success' });
      await fetchData();
    } catch (error) {
      showToast({ message: 'Errore durante l\'eliminazione multipla.', type: 'error' });
      if (import.meta.env.DEV) console.error('Error deleting selected schedules:', error);
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
      const headers = getOperateHeaders();
      await apiPut(`/api/v1/schedules/${scheduleId}`, { status: newStatus }, { headers });
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
      showToast({ message: 'Stato aggiornato con successo.', type: 'success' });
    } catch (error) {
      showToast({ message: 'Errore durante l\'aggiornamento dello stato.', type: 'error' });
      if (import.meta.env.DEV) console.error('Error updating status:', error);
    }
  };

  // Prepara i dati per la tabella
  const data: DataRow[] = schedules.map(schedule => {
    // P49: Estrai i nomi delle aziende da schedule.companies
    const directCompanyNames = schedule.companies
      ?.map(c => {
        const company = c.companyTenantProfile?.company || c.company;
        return company?.ragioneSociale;
      })
      .filter(Boolean) || [];

    // P48/P49: Estrai anche i nomi aziende dai partecipanti (enrollments)
    // per mostrare le company effettive dei partecipanti iscritti
    const participantCompanyNames = schedule.enrollments
      ?.map(e => {
        const profile = (e as any).person?.tenantProfiles?.[0];
        const company = profile?.companyTenantProfile?.company;
        return company?.ragioneSociale;
      })
      .filter(Boolean) || [];

    // Unisci e deduplica i nomi delle aziende (priorità ai partecipanti)
    const allCompanyNames = [...new Set([...participantCompanyNames, ...directCompanyNames])];
    const companyNames = allCompanyNames.join(', ');

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
    const deliveryModeUpper = schedule.deliveryMode?.toUpperCase();
    if (deliveryModeUpper === 'IN_PERSON') deliveryModeItalian = 'In presenza';
    if (deliveryModeUpper === 'ONLINE') deliveryModeItalian = 'Online';
    if (deliveryModeUpper === 'HYBRID') deliveryModeItalian = 'Ibrida';

    // Mappa lo stato in italiano
    const statusMap: Record<string, string> = {
      'PREVENTIVO': 'Preventivo',
      'ACCETTATO': 'Accettato',
      'COMPLETATO': 'Completato',
      'FATTURATO': 'Fatturato'
    };
    const statusItalian = statusMap[schedule.status || 'PREVENTIVO'] || 'Preventivo';

    return {
      id: schedule.id,
      corso: schedule.course.title || schedule.course.name,
      aziende: companyNames || 'N/D',
      formatore: trainer,
      coFormatore: coTrainer,
      partecipanti: participantsCount,
      dataInizio: new Date(schedule.startDate).toLocaleDateString('it-IT'),
      dataFine: new Date(schedule.endDate).toLocaleDateString('it-IT'),
      dataScadenza: schedule.expiryDate ? new Date(schedule.expiryDate).toLocaleDateString('it-IT') : '',
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
    // P48/P49: Estrai i nomi delle aziende - combina companies e enrollments
    const directCompanyNames = schedule.companies
      ?.map(c => {
        const company = c.companyTenantProfile?.company || c.company;
        return company?.ragioneSociale;
      })
      .filter(Boolean) || [];

    const participantCompanyNames = schedule.enrollments
      ?.map(e => {
        const profile = (e as any).person?.tenantProfiles?.[0];
        const company = profile?.companyTenantProfile?.company;
        return company?.ragioneSociale;
      })
      .filter(Boolean) || [];

    const allCompanyNames = [...new Set([...participantCompanyNames, ...directCompanyNames])];
    const companyNames = allCompanyNames.join(', ');

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
            status: schedule.status || 'PREVENTIVO',
            sessions: schedule.sessions,
            companies: schedule.companies as unknown as ScheduleResource['companies']
          };

          events.push({
            id: session.id,
            scheduleId: schedule.id,
            title,
            start: startDateTime,
            end: endDateTime,
            resource,
            status: schedule.status || 'PREVENTIVO',
            tooltip: description || title,
            sessioniTooltipHtml: description || title
          });
        } catch (error) {
          if (import.meta.env.DEV) console.error('Error parsing session dates:', error);
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
            status: schedule.status || 'PREVENTIVO',
            sessions: schedule.sessions,
            companies: schedule.companies as unknown as ScheduleResource['companies']
          };

          events.push({
            id: schedule.id,
            scheduleId: schedule.id,
            title,
            start: startDate,
            end: endDate,
            resource,
            status: schedule.status || 'PREVENTIVO',
            tooltip: title,
            sessioniTooltipHtml: title
          });
        }
      } catch (error) {
        if (import.meta.env.DEV) console.error('Error parsing schedule dates:', error);
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
            // Status può essere una lista separata da virgole: PREVENTIVO,ACCETTATO,COMPLETATO
            const allowedStatuses = value.split(',').map(s => s.trim());
            return allowedStatuses.includes(item._original?.status || 'PREVENTIVO');
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
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStatusChange(row.id, 'PREVENTIVO'); }}>
                  <span className="w-2 h-2 rounded-full bg-yellow-500 mr-2" />
                  Preventivo
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStatusChange(row.id, 'ACCETTATO'); }}>
                  <span className={`w-2 h-2 rounded-full ${statusDotColors['Accettato']} mr-2`} />
                  Accettato
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStatusChange(row.id, 'COMPLETATO'); }}>
                  <span className={`w-2 h-2 rounded-full ${statusDotColors['Completato']} mr-2`} />
                  Completato
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStatusChange(row.id, 'FATTURATO'); }}>
                  <span className={`w-2 h-2 rounded-full ${statusDotColors['Fatturato']} mr-2`} />
                  Fatturato
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
    {
      key: 'corso',
      label: 'Corso',
      width: 200,
      sortable: true,
      renderCell: (row) => (
        <div className="whitespace-normal break-words line-clamp-2 leading-snug">
          {row.corso}
        </div>
      )
    },
    {
      key: 'aziende',
      label: 'Aziende',
      width: 180,
      sortable: true,
      renderCell: (row) => {
        const companies = row.aziende.split(', ').filter(c => c !== 'N/D');
        if (companies.length === 0) return <span className="text-gray-400 dark:text-gray-500">N/D</span>;
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
            <div className="text-xs text-gray-500 dark:text-gray-400">Co: {row.coFormatore}</div>
          )}
        </div>
      )
    },
    { key: 'partecipanti', label: 'Partecipanti', width: 100 },
    {
      key: 'dataInizio',
      label: 'Date',
      width: 140,
      sortable: true,
      renderCell: (row) => (
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-xs">
            <span className="text-gray-400 dark:text-gray-500 shrink-0">Esec.</span>
            <span className="font-medium text-gray-700 dark:text-gray-200">{row.dataInizio}</span>
          </div>
          {row.dataScadenza ? (
            <div className="flex items-center gap-1 text-xs">
              <span className="text-gray-400 dark:text-gray-500 shrink-0">Scad.</span>
              <span className="text-gray-600 dark:text-gray-300">{row.dataScadenza}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-xs">
              <span className="text-gray-400 dark:text-gray-500 shrink-0">Fine</span>
              <span className="text-gray-600 dark:text-gray-300">{row.dataFine}</span>
            </div>
          )}
        </div>
      )
    },
    {
      key: 'sessioni',
      label: 'Sessioni',
      width: 150,
      renderCell: (row) => {
        const sessions = row.sessioni.split(', ').filter(s => s !== 'N/D');
        if (sessions.length === 0) return <span className="text-gray-400 dark:text-gray-500">N/D</span>;
        return (
          <div className="space-y-1">
            {sessions.map((session, idx) => (
              <div key={idx} className="text-xs text-gray-600 dark:text-gray-400">{session}</div>
            ))}
          </div>
        );
      }
    },
    { key: 'modalità', label: 'Modalità', width: 100 },
    { key: 'location', label: 'Luogo', width: 120 },
  ];

  // Component for the search and filter bar (solo ricerca + filtri, senza titolo/bottoni primari)
  const SearchFilterBar = () => (
    <div className="space-y-4 mb-4">
      {/* Search bar a sinistra e pulsanti filtro a destra */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 max-w-md">
          <SearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Cerca pianificazioni..."
            className="h-10 bg-white dark:bg-gray-800"
            showButton={false}
            showClearButton={true}
          />
        </div>

        <div className="flex items-center gap-2">
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
              { value: 'dataInizio', label: 'Data esecuzione' },
              { value: 'dataFine', label: 'Data scadenza' },
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
      icon={<Calendar className="h-5 w-5" />}
      count={filteredSchedules.length}
      extraControls={
        <>
          <ViewModeToggle
            viewMode={view as 'table' | 'grid'}
            onChange={(newView) => setView(newView as 'table' | 'calendar')}
            gridLabel="Calendario"
            tableLabel="Tabella"
          />
          <Button
            variant={showImportedCourses ? 'outline' : 'secondary'}
            size="sm"
            onClick={() => setShowImportedCourses(!showImportedCourses)}
            className="h-9 flex items-center gap-2 whitespace-nowrap"
            title={showImportedCourses ? 'Nascondi corsi importati' : 'Mostra corsi importati'}
          >
            {showImportedCourses ? (
              <><EyeOff className="h-4 w-4" /> Importati</>
            ) : (
              <><Eye className="h-4 w-4" /> Importati</>
            )}
          </Button>
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
                  // TODO: implement CSV import
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
        </>
      }
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
            setPreSelectedCourseId(courseId);
            setPreSelectedPersonIds(personIds);
            setPreSelectedCompanyIds(companyIds);
            setEditingSchedule(null);
            setSelectedSlot(null);
            setShowForm(true);
          }}
        />
      </div>

      {selectionMode && (
        <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-blue-800 dark:text-blue-200">
              Modalità selezione attiva - {selectedIds.length} elementi selezionati
            </span>
            <button
              onClick={() => {
                setSelectionMode(false);
                setSelectedIds([]);
                setSelectAll(false);
              }}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
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
          rowClassName={(row) => getStatusRowColor(row.status)}
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
            // P49: usa CompanyTenantProfile.id (non global Company.id) per matchare getCompanies()
            // Fallback: se schedule.companies è vuoto, deriva da enrollments
            company_ids: (() => {
              const fromCompanies = (editingSchedule.companies || [])
                .map((c: any) => c?.companyTenantProfileId ?? c?.companyTenantProfile?.id)
                .filter(Boolean);
              if (fromCompanies.length > 0) return fromCompanies;
              const profileIds = new Set<string>();
              ((editingSchedule as any).enrollments || []).forEach((e: any) => {
                const id = e?.person?.tenantProfiles?.[0]?.companyTenantProfileId
                  ?? e?.person?.tenantProfiles?.[0]?.companyTenantProfile?.id;
                if (id) profileIds.add(String(id));
              });
              return Array.from(profileIds);
            })(),
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