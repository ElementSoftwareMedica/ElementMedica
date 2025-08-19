import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Button } from "../../design-system/atoms/Button";
import { Input } from "../../design-system/atoms/Input";
import { Label } from "../../design-system/atoms/Label";
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { it } from 'date-fns/locale';
import '../../styles/datepicker-custom.css';
import Select from 'react-select';
import { create, update } from '../../services/apiClient';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { API_ENDPOINTS } from '../../config/api';
import scheduleService from '../../services/scheduleService';
import { Company } from '../../types';

interface Employee {
  id: string | number;
  firstName: string;
  lastName: string;
  companyId: string | number;
  company_id?: string | number;
  company?: { id: string | number; name: string };
  email?: string;
  position?: string;
}
interface Trainer {
  id: string | number;
  firstName: string;
  lastName: string;
  certifications?: string[];
}
interface Training {
  id: string | number;
  title: string;
  certifications?: string[];
  duration?: string | number;
}
interface ScheduleEventModalProps {
  trainings: Training[];
  trainers: Trainer[];
  companies: Company[];
  employees: Employee[];
  existingEvent?: any;
  onClose: () => void;
  onSuccess: () => void;
  initialDate?: string;
  initialTime?: { start: string; end: string; };
}

// Define type for date entries
type DateEntry = { date: string; start: string; end: string; trainerId: string | number; coTrainerId: string | number };

export default function ScheduleEventModal({ trainings, trainers, companies, employees, existingEvent = {}, onClose, onSuccess, initialDate, initialTime }: ScheduleEventModalProps) {
  // Remove mock data, use props
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  // Initialize selections and form data based on existing event or new
  const initialSelectedCompanies: (string | number)[] = existingEvent && Object.keys(existingEvent).length > 0
    ? (existingEvent.company_ids || existingEvent.companies?.map((c: any) => c.id) || [])
    : [];
  const initialSelectedEmployees: (string | number)[] = existingEvent && Object.keys(existingEvent).length > 0
    ? (existingEvent.employee_ids || existingEvent.employees?.map((e: any) => e.id) || [])
    : [];
  const [selectedCompanies, setSelectedCompanies] = useState<(string | number)[]>(initialSelectedCompanies);
  const [selectedEmployees, setSelectedEmployees] = useState<(string | number)[]>(initialSelectedEmployees);
  const [searchTerm, setSearchTerm] = useState("");
  // Compute initial form data
  const initialFormData: {
    training_id: string | number;
    trainer_id: string | number;
    co_trainer_id: string | number;
    dates: DateEntry[];
    location: string;
    max_participants: number;
    notes: string;
    delivery_mode?: string;
  } = existingEvent && Object.keys(existingEvent).length > 0
    ? {
        training_id: existingEvent.training_id || existingEvent.course?.id || "",
        trainer_id: "",
        co_trainer_id: "",
        dates: (existingEvent.dates || []).map((d: any) => ({
          date: d.date,
          start: d.start,
          end: d.end,
          trainerId: d.trainer_id || d.trainerId,
          coTrainerId: d.co_trainer_id || d.coTrainerId,
        })),
        location: existingEvent.location || "",
        max_participants: existingEvent.max_participants || 20,
        notes: existingEvent.notes || "",
        delivery_mode: existingEvent.delivery_mode || "",
      }
    : {
        training_id: "",
        trainer_id: "",
        co_trainer_id: "",
        dates: [
          {
            date: initialDate || new Date().toISOString().split("T")[0],
            start: initialTime?.start || "09:00",
            end: initialTime?.end || "13:00",
            trainerId: "",
            coTrainerId: "",
          },
        ],
        location: "",
        max_participants: 20,
        notes: "",
      };
  const [formData, setFormData] = useState<{
    training_id: string | number;
    trainer_id: string | number;
    co_trainer_id: string | number;
    dates: DateEntry[];
    location: string;
    max_participants: number;
    notes: string;
    delivery_mode?: string;
  }>(initialFormData);
  const [error, setError] = useState<string | null>(null);
  const isEditing = existingEvent && Object.keys(existingEvent).length > 0;
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<number>(0); // 0: details, 1: companies, 2: employees
  const [hasScheduled, setHasScheduled] = useState(isEditing);
  const [attendance, setAttendance] = useState<Record<number, (string | number)[]>>({});
  const [attendanceSaved, setAttendanceSaved] = useState(false);
  // Trainers list (always reflect props)
  // (qualifiedTrainers already defined above)
  const [companySearch, setCompanySearch] = useState('');
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [employeeTab, setEmployeeTab] = useState<string | number>('');
  const [localCompanySearch, setLocalCompanySearch] = useState('');
  const [localEmployeeSearch, setLocalEmployeeSearch] = useState('');
  const [pendingEmployeeToSelect, setPendingEmployeeToSelect] = useState<string | null>(null);
  const [selectedDayIdx, setSelectedDayIdx] = useState<number>(0);
  const [courseSearch, setCourseSearch] = useState('');
  // Attendance status dropdown in Documenti
  const [status, setStatus] = useState('Preventivo');
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  // Track schedule ID for updates (new or existing)
  const [scheduleId, setScheduleId] = useState<string | number | null>(existingEvent?.id || null);
  // Ref for company tabs scroll container
  const companyTabsRef = useRef<HTMLDivElement>(null);
  const [successToast, setSuccessToast] = useState(false);
  // Aggiungo ref per lo scroll orizzontale delle sessioni e controlli di navigazione
  const sessionContainerRef = useRef<HTMLDivElement>(null);
  // Add horizontal scroll handling for company tabs
  const companyTabsScrollRef = useRef<HTMLDivElement>(null);

  // Utility function to normalize attendance data format
  const normalizeAttendanceData = useCallback((attendanceData: any): Record<number, (string | number)[]> => {
    if (!attendanceData) return {};
    
    // If it's an array (new format), map it directly
    if (Array.isArray(attendanceData)) {
      return attendanceData.reduce((acc, entry, idx) => {
        acc[idx] = entry.employee_ids || [];
        return acc;
      }, {} as Record<number, (string | number)[]>);
    }
    
    // If it's an object with keys (old format), convert it
    if (typeof attendanceData === 'object') {
      const result: Record<number, (string | number)[]> = {};
      
      Object.keys(attendanceData).forEach((key, idx) => {
        const session = attendanceData[key];
        if (session && session.attendees) {
          const presentIds = Object.values(session.attendees)
            .filter((a: any) => a.attended)
            .map((a: any) => a.id);
          result[idx] = presentIds;
        } else if (session && session.employee_ids) {
          result[idx] = session.employee_ids;
        }
      });
      
      return result;
    }
    
    return {};
  }, []);

  // When existing event changes, update the attendance state using normalized data
  useEffect(() => {
    if (existingEvent && Object.keys(existingEvent).length > 0 && existingEvent.attendance) {
      const normalizedAttendance = normalizeAttendanceData(existingEvent.attendance);
      if (Object.keys(normalizedAttendance).length > 0) {
        console.log('Setting normalized attendance data:', normalizedAttendance);
        setAttendance(normalizedAttendance);
      }
    }
  }, [existingEvent, normalizeAttendanceData]);

  // Debug log for attendance data
  useEffect(() => {
    if (existingEvent && existingEvent.attendance) {
      console.log('Existing attendance data format:', existingEvent.attendance);
    }
  }, [existingEvent]);

  // Helper: calculate total selected hours
  const getTotalSelectedHours = useCallback(() => {
    let total = 0;
    for (const dt of formData.dates) {
      if (dt.start && dt.end) {
        const [sh, sm] = dt.start.split(':').map(Number);
        const [eh, em] = dt.end.split(':').map(Number);
        const diff = (eh * 60 + em) - (sh * 60 + sm);
        if (diff > 0) total += diff / 60;
      }
    }
    return Math.round(total * 100) / 100;
  }, [formData.dates]);

  const DELIVERY_MODES = [
    { value: 'in-person', label: 'In presenza' },
    { value: 'online', label: 'Online' },
    { value: 'hybrid', label: 'Ibrido' },
  ];

  // Parse required certifications from selected course
  const selectedCourse = useMemo(() => trainings.find(t => t.id === formData.training_id), [trainings, formData.training_id]);
  
  const requiredCerts = useMemo(() => {
    let certString = '';
    if (selectedCourse && selectedCourse.certifications) {
      if (typeof selectedCourse.certifications === 'string') {
        certString = selectedCourse.certifications;
      } else if (Array.isArray(selectedCourse.certifications)) {
        certString = selectedCourse.certifications.join(',');
      }
    }
    return certString
      ? certString.split(',').map((c: string) => c.trim()).filter(Boolean)
      : [];
  }, [selectedCourse]);

  // Filter trainers by required certifications
  const filteredTrainers = useMemo(() => {
    return requiredCerts.length > 0
      ? trainers.filter(tr =>
          Array.isArray(tr.certifications)
            ? requiredCerts.every((cert: string) => (tr.certifications || []).includes(cert))
            : false
        )
      : trainers;
  }, [trainers, requiredCerts]);

  // Co-trainer options: all trainers (no filtering)
  const coTrainerOptions = trainers;

  // Filter employees by selected companies and search term
  useEffect(() => {
    async function fetchEmployeesByCompany() {
      // Only fetch if companies are selected
      if (selectedCompanies.length > 0) {
        try {
          console.log('Fetching employees for companies:', selectedCompanies);
          
          // Use our service instead of direct fetch
          const companyEmployees = await scheduleService.getEmployeesByCompany(
            selectedCompanies.map(id => String(id))
          );
          
          console.log(`Retrieved ${companyEmployees.length} employees for selected companies`);
          
          // Debug first few employees to see their structure
          if (companyEmployees.length > 0) {
            console.log('First employee sample:', companyEmployees[0]);
          }
          
          // Apply search term filtering if needed
          let filtered = [...companyEmployees];
          if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter((emp: any) =>
              `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(term) ||
              (emp.email && emp.email.toLowerCase().includes(term)) ||
              (emp.position && emp.position.toLowerCase().includes(term))
            );
          }
          
          console.log(`After filtering: ${filtered.length} employees match search criteria`);
          setFilteredEmployees(filtered);
        } catch (error) {
          console.error('Error fetching employees by company:', error);
          
          // Fallback to client-side filtering of provided employees
          console.log('Attempting fallback to client-side filtering with', employees.length, 'employees');
          let filtered = [...(employees || [])];
          
          // Convert all IDs to strings for reliable comparison
          const companyIdsStrings = selectedCompanies.map(id => String(id));
          
          // Debug what fields exist in the employee objects
          if (filtered.length > 0) {
            const sampleEmp = filtered[0];
            console.log('Sample employee fields:', Object.keys(sampleEmp).join(', '));
            
            // Check for company fields
            console.log('Company ID fields:', 
              'companyId =', sampleEmp.companyId, 
              'company_id =', sampleEmp.company_id, 
              'company =', sampleEmp.company);
          }
          
          // Filter by any company ID field that might exist
          filtered = filtered.filter((emp: any) => {
            if (emp.companyId && companyIdsStrings.includes(String(emp.companyId))) return true;
            if (emp.company_id && companyIdsStrings.includes(String(emp.company_id))) return true;
            if (emp.company && emp.company.id && companyIdsStrings.includes(String(emp.company.id))) return true;
            return false;
          });
          
          console.log(`Client-side filtering found ${filtered.length} employees for selected companies`);
          
          if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter((emp: any) =>
              `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(term) ||
              (emp.email && emp.email.toLowerCase().includes(term)) ||
              (emp.position && emp.position.toLowerCase().includes(term))
            );
          }
          
          setFilteredEmployees(filtered);
        }
      } else {
        // No companies selected, just apply search filtering to all employees
        let filtered = [...(employees || [])];
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase();
          filtered = filtered.filter((emp: any) =>
            `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(term) ||
            (emp.email && emp.email.toLowerCase().includes(term)) ||
            (emp.position && emp.position.toLowerCase().includes(term))
          );
        }
        setFilteredEmployees(filtered);
      }
    }
    
    fetchEmployeesByCompany();
  }, [employees, selectedCompanies, searchTerm]);

  // Handle selecting a pending employee
  useEffect(() => {
    if (pendingEmployeeToSelect) {
      const emp = employees.find((e: any) => e.id === pendingEmployeeToSelect);
      if (emp) {
        setSelectedEmployees(prev => [...prev, emp.id]);
        setPendingEmployeeToSelect(null);
      }
    }
  }, [pendingEmployeeToSelect, employees]);

  // Only validate on submit
  const validateAll = useCallback(() => {
    if (!formData.training_id) {
      setError("Seleziona un corso.");
      return false;
    }
    if (formData.dates.length === 0) {
      setError("Aggiungi almeno una data.");
      return false;
    }
    // Check if all dates have a trainer
    const hasMissingTrainer = formData.dates.some((dt: DateEntry) => !dt.trainerId);
    if (hasMissingTrainer) {
      setError("Seleziona un docente per ogni data.");
      return false;
    }
    if (!formData.delivery_mode) {
      setError("Seleziona la modalità di erogazione.");
      return false;
    }
    if (selectedCompanies.length === 0) {
      setError("Seleziona almeno un'azienda.");
      return false;
    }
    if (selectedEmployees.length === 0) {
      setError("Seleziona almeno un dipendente.");
      return false;
    }
    setError(null);
    return true;
  }, [formData, selectedCompanies, selectedEmployees, setError]);

  // Navigation functions
  const handleNext = useCallback(() => {
    setError(null);
    setCurrentStep((s) => s + 1);
  }, [setError]);
  
  const handleBack = useCallback(() => {
    setError(null);
    setCurrentStep((s) => s - 1);
  }, [setError]);

  // Build schedule payload
  const buildSchedulePayload = useCallback(() => {
    // Get the earliest and latest dates from the dates array (YYYY-MM-DD strings)
    const dates: string[] = formData.dates.map((d: DateEntry) => d.date);
    const startDateStr = dates.reduce((a, b) => (a < b ? a : b));
    const endDateStr = dates.reduce((a, b) => (a > b ? a : b));
    // Find the corresponding time for start and end
    const firstDate = formData.dates.find(d => d.date === startDateStr);
    const lastDate = formData.dates.find(d => d.date === endDateStr);
    // Compose local datetime strings
    const startDateTimeLocal = `${startDateStr}T${firstDate?.start || '09:00'}:00`;
    const endDateTimeLocal = `${endDateStr}T${lastDate?.end || '17:00'}:00`;
    // Convert to ISO string (UTC) for Prisma
    const startDateTimeISO = new Date(startDateTimeLocal).toISOString();
    const endDateTimeISO = new Date(endDateTimeLocal).toISOString();
    
    // Build attendance array - using simpler format
    const attendanceArr = formData.dates.map((dt, idx) => ({
      date: dt.date,
      employee_ids: attendance[idx] || []
    }));
    
    // Ensure selectedCompanies and selectedEmployees are arrays of strings/numbers
    const validCompanyIds = selectedCompanies.filter(id => id !== null && id !== undefined);
    const validEmployeeIds = selectedEmployees.filter(id => id !== null && id !== undefined);
    
    // Create schedule object without ID if creating a new schedule
    const schedulePayload = {
      courseId: formData.training_id,
      start_date: startDateTimeISO,
      end_date: endDateTimeISO,
      location: formData.location,
      max_participants: formData.max_participants,
      notes: formData.notes,
      delivery_mode: formData.delivery_mode,
      dates: formData.dates.map(dt => ({
        date: dt.date,
        start: dt.start,
        end: dt.end,
        trainer_id: dt.trainerId,
        co_trainer_id: dt.coTrainerId,
      })),
      // Format company IDs as objects with companyId property
      companies: validCompanyIds.map(id => ({ companyId: String(id) })),
      // Keep the old format for backward compatibility
      company_ids: validCompanyIds.map(id => String(id)),
      // Format employee IDs as objects with employeeId property
      enrollments: validEmployeeIds.map(id => ({ employeeId: String(id) })),
      // Keep the old format for backward compatibility
      employee_ids: validEmployeeIds.map(id => String(id)),
      attendance: attendanceArr,
      status,
    };
    
    // Only add ID if editing an existing schedule
    if (isEditing && scheduleId) {
      return { ...schedulePayload, id: scheduleId };
    }
    
    return schedulePayload;
  }, [formData, scheduleId, isEditing, selectedCompanies, selectedEmployees, attendance, status]);

  // Schedule (Programma) logic
  const handleSchedule = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!validateAll()) return;
      const schedulePayload = buildSchedulePayload();
      let result: { id: string | number };
      
      if (isEditing && scheduleId) {
        result = await update('schedules', String(scheduleId), schedulePayload) as { id: string | number };
      } else {
        result = await create('schedules', schedulePayload) as { id: string | number };
        setScheduleId(result?.id);
      }
      setHasScheduled(true);
      toast.success('Corso programmato con successo!', { position: 'top-right', autoClose: 2500, hideProgressBar: false, closeOnClick: true, pauseOnHover: true, draggable: true, progress: undefined });
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || 'Errore durante la programmazione del corso');
    }
    setLoading(false);
  }, [validateAll, buildSchedulePayload, isEditing, scheduleId, onSuccess]);

  // Save attendance (Presenti)
  const handleSaveAttendance = useCallback(async () => {
    if (!scheduleId) return;
    setLoading(true);
    
    try {
      // Build attendance payload per date - simpler format
      const attendanceDates = formData.dates.map((dt, idx) => ({
        date: dt.date,
        employee_ids: attendance[idx] || []
      }));
      
      // Save attendance, plus selected companies and employees
      await update('schedules', String(scheduleId), {
        attendance: attendanceDates,
        company_ids: selectedCompanies,
        employee_ids: selectedEmployees,
      });
      
      setCurrentStep(3);
      setError('Presenze salvate con successo');
      setTimeout(() => setError(''), 3000);
    } catch (error: any) {
      console.error('Errore nel salvataggio delle presenze:', error);
      setError('Errore nel salvataggio delle presenze: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [scheduleId, formData.dates, attendance, selectedCompanies, selectedEmployees, setCurrentStep, setError, setLoading, update]);

  // Save documents/status (Step 4)
  const handleSaveDocuments = useCallback(async () => {
    if (!scheduleId) return;
    setLoading(true);
    try {
      // Save both attendance and status - simpler format
      const attendanceDates = formData.dates.map((dt, idx) => ({
        date: dt.date,
        employee_ids: attendance[idx] || []
      }));
      
      await update('schedules', String(scheduleId), {
        attendance: attendanceDates,
        status,
        company_ids: selectedCompanies,
        employee_ids: selectedEmployees,
      });
      onSuccess();
      onClose();
    } catch (error: any) {
      setError('Errore salvando documenti: ' + error.message);
    }
    setLoading(false);
  }, [scheduleId, formData.dates, attendance, status, selectedCompanies, selectedEmployees, onSuccess, onClose, setError, setLoading, update]);

  // Date management functions
  const addDateTime = useCallback(() => {
    if (formData.dates.length < 4) {
      // Default values
      let defaultStart = '09:00';
      let defaultEnd = '13:00';
      let defaultTrainer = formData.trainer_id || '';
      let defaultCoTrainer = formData.co_trainer_id || '';
      let defaultDate = '';
      
      // For second and subsequent dates
      if (formData.dates.length > 0) {
        // Use trainer/co-trainer from first day for consistency
        defaultTrainer = formData.dates[0].trainerId || '';
        defaultCoTrainer = formData.dates[0].coTrainerId || '';
        
        // Get the last date entry
        const prev = formData.dates[formData.dates.length - 1];
        
        // Smart defaults for dates/times based on previous entry
        if (prev) {
          // If the last session was in the morning (ends before 13:30), set afternoon session on the same day
          if (prev.date && prev.end && (prev.end <= '13:30')) {
            console.log("Setting afternoon session on same day");
            defaultStart = '14:00';
            defaultEnd = '18:00';
            defaultDate = prev.date; // Keep the same date
          } 
          // Otherwise, set a session for the next day
          else if (prev.date) {
            console.log("Setting session for next day");
            // Calculate next working day (skip weekends)
            const prevDate = new Date(prev.date + 'T12:00:00');
            const nextDay = new Date(prevDate);
            nextDay.setDate(prevDate.getDate() + 1);
            
            // Skip to Monday if it's a weekend
            if (nextDay.getDay() === 0) { // Sunday
              nextDay.setDate(nextDay.getDate() + 1); // Move to Monday
            } else if (nextDay.getDay() === 6) { // Saturday
              nextDay.setDate(nextDay.getDate() + 2); // Move to Monday
            }
            
            defaultDate = nextDay.toISOString().split('T')[0];
            defaultStart = '09:00';
            defaultEnd = '13:00';
          }
        }
        
        // Calculate hours based on course duration
        const courseDuration = selectedCourse && selectedCourse.duration ? Number(selectedCourse.duration) : 0;
        if (courseDuration > 0) {
          const totalSelectedHours = getTotalSelectedHours();
          const hoursLeft = Math.max(0, courseDuration - totalSelectedHours);
          
          // If we have hours left and the session is in the afternoon, adjust end time
          if (hoursLeft > 0 && defaultStart >= '13:00') {
            const endHour = parseInt(defaultStart.split(':')[0]) + Math.min(hoursLeft, 4);
            let endMinute = 0;
            
            if (hoursLeft < 1) {
              endMinute = Math.round((hoursLeft % 1) * 60);
            }
            
            let endStr = endHour.toString().padStart(2, '0') + ':' + endMinute.toString().padStart(2, '0');
            if (endStr > '18:00') endStr = '18:00'; // Cap at 6PM
            defaultEnd = endStr;
          }
        }
      }
      
      console.log("Adding new date with calculated defaults:", {
        date: defaultDate,
        start: defaultStart,
        end: defaultEnd,
        trainerId: defaultTrainer,
        coTrainerId: defaultCoTrainer,
      });
      
      setFormData({
        ...formData,
        dates: [
          ...formData.dates,
          {
            date: defaultDate,
            start: defaultStart,
            end: defaultEnd,
            trainerId: defaultTrainer,
        coTrainerId: defaultCoTrainer,
          },
        ],
      });
      
      // Auto-select new day
      setSelectedDayIdx(formData.dates.length);
    }
  }, [formData, selectedCourse, getTotalSelectedHours]);
  
  const updateDateTime = useCallback((idx: number, field: 'date' | 'start' | 'end' | 'trainerId' | 'coTrainerId', value: string) => {
    const newDates = formData.dates.map((dt, i) =>
      i === idx ? { ...dt, [field]: value } : dt
    );
    setFormData({ ...formData, dates: newDates });
  }, [formData]);
  
  const removeDateTime = useCallback((idx: number) => {
    const newDates = formData.dates.filter((_, i) => i !== idx);
    setFormData({ ...formData, dates: newDates });
    if (selectedDayIdx >= newDates.length) {
      setSelectedDayIdx(Math.max(0, newDates.length - 1));
    }
  }, [formData, selectedDayIdx]);

  // Helper to format ISO date (YYYY-MM-DD) into dd/mm/yyyy
  const formatDate = useCallback((isoDate: string) => {
    const [year, month, day] = isoDate.split('-');
    return `${day}/${month}/${year}`;
  }, []);

  const totalSelectedHours = useMemo(() => getTotalSelectedHours(), [getTotalSelectedHours]);
  const courseDuration = useMemo(() => selectedCourse && selectedCourse.duration ? Number(selectedCourse.duration) : 0, [selectedCourse]);
  const hoursLeft = useMemo(() => Math.max(0, courseDuration - totalSelectedHours), [courseDuration, totalSelectedHours]);

  // For react-select course options
  const courseOptions = useMemo(() => trainings.map((t: any) => ({ value: t.id, label: t.title, ...t })), [trainings]);
  const selectedCourseOption = useMemo(() => courseOptions.find(opt => opt.value === formData.training_id) || null, [courseOptions, formData.training_id]);

  // Define static steps; Presenti/Documenti enabled once scheduled or editing
  const stepItems = useMemo(() => [
    { label: "Dettagli", step: 0, enabled: true },
    { label: "Partecipanti", step: 1, enabled: true },
    { label: "Presenti", step: 2, enabled: hasScheduled || isEditing },
    { label: "Documenti", step: 3, enabled: hasScheduled || isEditing },
  ], [hasScheduled, isEditing]);

  // Helper to get company name
  const getCompanyName = useCallback((cid: any) => 
    companies.find((c: any) => String(c.id) === String(cid))?.ragioneSociale || '', 
    [companies]
  );

  // Helper to get employee IDs for a company
  const getEmployeeIdsForCompany = useCallback((companyId: string) => 
    employees.filter(e => String(e.company_id) === companyId).map(e => String(e.id)),
    [employees]
  );

  // Quando selected companies change, default employeeTab to first or clear
  useEffect(() => {
    if (selectedCompanies.length > 0) {
      // Seleziona sempre la prima azienda quando cambiano le aziende selezionate
      setEmployeeTab(selectedCompanies[0]);
    } else {
      setEmployeeTab('');
    }
  }, [selectedCompanies]);

  // Questo useEffect specifico assicura che employeeTab sia sempre uno delle aziende selezionate
  useEffect(() => {
    // Se employeeTab non è in selectedCompanies ma ci sono aziende selezionate
    if (employeeTab && selectedCompanies.length > 0 && !selectedCompanies.includes(employeeTab)) {
      setEmployeeTab(selectedCompanies[0]);
    }
  }, [employeeTab, selectedCompanies]);

  // Aggiungi stile per lo scroll orizzontale con rotella del mouse
  useEffect(() => {
    if (companyTabsRef.current) {
      const handleWheel = (e: WheelEvent) => {
        if (e.deltaY !== 0) {
          e.preventDefault();
          companyTabsRef.current!.scrollLeft += e.deltaY;
        }
      };
      const tabsEl = companyTabsRef.current;
      tabsEl.addEventListener('wheel', handleWheel);
      
      return () => {
        tabsEl.removeEventListener('wheel', handleWheel);
      };
    }
    
    // Aggiungi lo stesso comportamento per il container delle sessioni
    if (sessionContainerRef.current) {
      const handleWheel = (e: WheelEvent) => {
        if (e.deltaY !== 0) {
          e.preventDefault();
          sessionContainerRef.current!.scrollLeft += e.deltaY;
        }
      };
      const containerEl = sessionContainerRef.current;
      containerEl.addEventListener('wheel', handleWheel);
      return () => {
        containerEl.removeEventListener('wheel', handleWheel);
      };
    }
  }, [companyTabsRef.current, sessionContainerRef.current]);

  // Funzione per centrare l'azienda selezionata nello scroll
  const centerSelectedCompany = useCallback((companyId: string | number) => {
    setTimeout(() => {
      const tabsEl = companyTabsRef.current;
      const tabEl = document.getElementById(`company-tab-${companyId}`);
      if (tabsEl && tabEl) {
        // Calcola posizione per centrare l'elemento
        const containerWidth = tabsEl.offsetWidth;
        const tabWidth = tabEl.offsetWidth;
        const tabLeft = tabEl.offsetLeft;
        const scrollLeft = tabLeft - (containerWidth / 2) + (tabWidth / 2);
        
        tabsEl.scrollTo({
          left: scrollLeft,
          behavior: 'smooth'
        });
      }
    }, 50);
  }, []);

  // Selezione automatica partecipanti allo step 3
  useEffect(() => {
    if (
      currentStep === 2 &&
      selectedEmployees.length > 0 &&
      formData.dates.length > 0
    ) {
      // Se attendance è vuoto o incompleto, seleziona tutti i partecipanti per ogni data
      let needsUpdate = false;
      const newAttendance: Record<number, (string | number)[]> = {};
      formData.dates.forEach((_, idx) => {
        if (!attendance[idx] || attendance[idx].length === 0) {
          newAttendance[idx] = [...selectedEmployees];
          needsUpdate = true;
        } else {
          newAttendance[idx] = attendance[idx];
        }
      });
      if (needsUpdate) {
        setAttendance(newAttendance);
      }
    }
  }, [currentStep, selectedEmployees, formData.dates]);

  // Quando viene salvato lo stato, aggiorna lo state per prevenire perdita
  useEffect(() => {
    if (scheduleId) {
      // Salva lo stato nel localStorage per prevenire perdita
      localStorage.setItem(`schedule_status_${scheduleId}`, status);
    }
  }, [status, scheduleId]);

  // Recupera lo stato salvato quando si cambia step
  useEffect(() => {
    if (scheduleId && currentStep === 3) {
      const savedStatus = localStorage.getItem(`schedule_status_${scheduleId}`);
      if (savedStatus) {
        setStatus(savedStatus);
      }
    }
  }, [currentStep, scheduleId]);

  // Aggiunge il salvataggio automatico delle presenze quando si cambia step o si preme "Crea Programma"
  useEffect(() => {
    // Salva le presenze quando si cambia step o si preme pulsante di completamento
    if (scheduleId && hasScheduled && currentStep !== 2) {
      const saveAttendanceData = async () => {
        try {
          console.log(`Auto-saving attendance data for scheduleId: ${scheduleId}`);
          
          // Format attendance data in the expected structure - simpler format
          const attendanceDates = formData.dates.map((dt, idx) => ({
            date: dt.date,
            employee_ids: attendance[idx] || []
          }));
          
          // Create a minimal update payload to avoid sending unnecessary data
          const updatePayload = {
            attendance: attendanceDates,
            company_ids: selectedCompanies,
            employee_ids: selectedEmployees,
          };
          
          console.log('Sending update with payload:', JSON.stringify(updatePayload).substring(0, 200) + '...');
          
          // Update the attendance data via API
          await update('schedules', String(scheduleId), updatePayload);
          console.log('Auto-saved attendance data successfully');
        } catch (error) {
          console.error('Errore nel salvataggio automatico delle presenze:', error);
        }
      };
      
      // Wait a bit to avoid too many requests
      const timer = setTimeout(() => {
        saveAttendanceData();
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleId, currentStep, hasScheduled]); // Only run when these critical dependencies change

  // Funzione per far scorrere automaticamente la barra orizzontale per mostrare l'azienda selezionata
  const scrollToCompanyTab = useCallback((companyId: string | number) => {
    setTimeout(() => {
      // Trova l'elemento della tab selezionata
      const tabElement = document.getElementById(`company-tab-${companyId}`);
      
      if (tabElement) {
        // Usa scrollIntoView per un approccio più diretto e affidabile
        tabElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center'  // Centra l'elemento orizzontalmente
        });
      }
    }, 100); // Aumentato il ritardo per assicurarsi che il DOM sia completamente aggiornato
  }, []);

  // Forza lo scroll sia quando cambia employeeTab che quando vengono visualizzati i dipendenti
  useEffect(() => {
    if (employeeTab && currentStep === 1) {
      scrollToCompanyTab(employeeTab);
    }
  }, [employeeTab, scrollToCompanyTab, currentStep]);

  // Add horizontal scroll handling for company tabs
  useEffect(() => {
    // Handle horizontal scrolling with vertical mouse wheel for company tabs
    const companyTabsEl = companyTabsScrollRef.current;
    if (companyTabsEl) {
      const handleWheel = (e: WheelEvent) => {
        if (e.deltaY !== 0) {
          e.preventDefault();
          companyTabsEl.scrollLeft += e.deltaY;
        }
      };

      companyTabsEl.addEventListener('wheel', handleWheel, { passive: false });
      return () => {
        companyTabsEl.removeEventListener('wheel', handleWheel);
      };
    }
  }, [companyTabsScrollRef.current]);

  // Render the right column with employee selection list
  const renderEmployeeList = () => {
    // Debug the filter process
    console.log(`Rendering employee list: ${filteredEmployees.length} employees for company ${employeeTab}`);
    
    // Extra debug if no employees are showing
    if (filteredEmployees.length > 0 && employeeTab) {
      console.log('First few employees:', filteredEmployees.slice(0, 3).map(e => `${e.firstName} ${e.lastName} (${e.company_id || e.companyId})`));
    } else if (employeeTab) {
      console.log('No filtered employees found despite having a selected company tab');
      console.log('Selected company tab ID:', employeeTab);
      console.log('Selected companies:', selectedCompanies);
    }
    
    if (!employeeTab) {
      return (
        <div className="flex-1 flex items-center justify-center text-center py-4 text-gray-500 border rounded-lg bg-white">
          Seleziona almeno un'azienda per visualizzare i partecipanti
        </div>
      );
    }
    
    // Filter to employees for the selected company tab
    const companyEmployees = filteredEmployees.filter((emp: any) => {
      const empCompanyId = emp.company_id || emp.companyId || (emp.company && emp.company.id);
      return String(empCompanyId) === String(employeeTab);
    });
    
    console.log(`Filtered ${companyEmployees.length} employees for selected company tab ${employeeTab}`);
    
    if (companyEmployees.length === 0) {
      return (
        <div className="flex-1 flex items-center justify-center text-center py-4 text-gray-500 border rounded-lg bg-white">
          Nessun dipendente trovato per questa azienda
        </div>
      );
    }
    
    return (
      <div className="flex-1 overflow-y-auto border rounded-lg bg-white">
        {companyEmployees.map(employee => (
          <div key={employee.id} className="flex items-center p-1.5 hover:bg-gray-50 border-b last:border-b-0">
            <input
              type="checkbox"
              id={`employee-${employee.id}`}
              checked={selectedEmployees.includes(employee.id)}
              onChange={() => {
                if (selectedEmployees.includes(employee.id)) {
                  setSelectedEmployees(prev => prev.filter(id => id !== employee.id));
                } else {
                  setSelectedEmployees(prev => [...prev, employee.id]);
                }
              }}
              className="mr-2"
            />
            <label htmlFor={`employee-${employee.id}`} className="flex-1 cursor-pointer text-sm">
              {employee.firstName} {employee.lastName}
            </label>
          </div>
        ))}
      </div>
    );
  };

  // UI for each step
  const renderStep = (stepIdx?: number) => {
    const idx = stepIdx ?? currentStep;
    if (idx === 0) {
      return (
        <div className="flex flex-col gap-4 h-[500px] overflow-y-auto">
          {/* Top row: Corso e Modalità di erogazione */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Corso *</Label>
              <Select
                options={courseOptions}
                value={selectedCourseOption}
                onChange={opt => setFormData({ ...formData, training_id: opt ? opt.value : '' })}
                placeholder="Cerca o seleziona un corso..."
                isClearable
                classNamePrefix="react-select"
                styles={{ menu: base => ({ ...base, zIndex: 9999 }) }}
              />
            </div>
            <div>
              <Label>Modalità di erogazione *</Label>
              <select
                className="w-full border rounded-lg p-2 h-10"
                value={formData.delivery_mode || ''}
                onChange={e => setFormData({ ...formData, delivery_mode: e.target.value })}
              >
                <option value="">Seleziona modalità</option>
                {DELIVERY_MODES.map(mode => (
                  <option key={mode.value} value={mode.value}>{mode.label}</option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Tre colonne in una riga: certificazioni, durata, conteggio ore - Design migliorato */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Certificazioni */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-3">
              <div className="text-sm font-medium text-gray-700 mb-1">Certificazioni richieste</div>
              <div className="max-h-[70px] overflow-y-auto">
                {requiredCerts.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {requiredCerts.map((cert: string) => (
                      <span key={cert} className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md text-xs font-medium">{cert}</span>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-500 text-xs">Nessuna certificazione richiesta</div>
                )}
              </div>
            </div>
            
            {/* Durata corso */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-3">
              <div className="text-sm font-medium text-gray-700 mb-1">Durata Corso</div>
              {selectedCourse && selectedCourse.duration ? (
                <div className="font-semibold text-gray-800 text-lg">{selectedCourse.duration}h</div>
              ) : (
                <div className="text-gray-500 text-xs">Non specificata</div>
              )}
            </div>
            
            {/* Conteggio ore */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-3">
              <div className="text-sm font-medium text-gray-700 mb-1">Conteggio ore</div>
              <div className="text-gray-800 text-lg font-semibold">
                {totalSelectedHours}h
                {totalSelectedHours < courseDuration && (
                  <span className="text-red-600 ml-1 text-sm">(-{hoursLeft}h)</span>
                )}
                {totalSelectedHours === courseDuration && (
                  <span className="text-green-600 ml-1 text-sm">✓</span>
                )}
                {totalSelectedHours > courseDuration && (
                  <span className="text-red-600 ml-1 text-sm">(+{Math.abs(courseDuration - totalSelectedHours)}h)</span>
                )}
              </div>
            </div>
          </div>
          
          {/* Middle: Days/times and Docente/Co-docente per day - Compattato */}
          <div className="flex flex-col gap-1">
            {/* Header row for columns, aligned with input widths */}
            <div className="flex gap-1 items-center px-2 text-xs font-semibold text-gray-500">
              <div className="w-28">Data</div>
              <div className="w-20">Ora inizio</div>
              <div className="w-4"></div>
              <div className="w-20">Ora fine</div>
              <div className="flex-1">Docente</div>
              <div className="flex-1">Co-docente</div>
              <div className="w-6"></div>
            </div>
            {formData.dates.map((dt: any, idx: number) => {
              // Build trainer options for this day, filtered by required certifications and always including the current trainer
              const filteredDayTrainers = (() => {
                const base = requiredCerts.length > 0
                  ? trainers.filter(tr =>
                      Array.isArray(tr.certifications)
                        ? requiredCerts.every((cert: string) => (tr.certifications || []).includes(cert))
                        : false
                    )
                  : trainers;
                if (dt.trainerId) {
          const currentTr = trainers.find(tr => String(tr.id) === String(dt.trainerId));
                  if (currentTr && !base.some(tr => String(tr.id) === String(currentTr.id))) {
                    return [currentTr, ...base];
                  }
                }
                return base;
              })();
              // Build co-trainer options for this day, always including the current co-trainer
              const coTrainerOptionsDay = (() => {
                const base = trainers;
                if (dt.coTrainerId) {
          const currentCoTr = trainers.find(tr => String(tr.id) === String(dt.coTrainerId));
                  if (currentCoTr && !base.some(tr => String(tr.id) === String(currentCoTr.id))) {
                    return [currentCoTr, ...base];
                  }
                }
                return base;
              })();
              // Parse date/time values for DatePicker
              const dateValue = dt.date ? new Date(dt.date) : null;
              const startValue = dt.start ? new Date(`1970-01-01T${dt.start}`) : null;
              const endValue = dt.end ? new Date(`1970-01-01T${dt.end}`) : null;
              // If this is not the first slot, and the date matches a previous date, default to 14:00-18:00
              if (dt.date && idx > 0) {
                const prevIdx = formData.dates.findIndex((d, i) => i < idx && d.date === dt.date);
                if (prevIdx !== -1 && (!dt.start || !dt.end)) {
                  dt.start = '14:00';
                  dt.end = '18:00';
                }
              }
              return (
                <div key={idx} className="flex flex-col md:flex-row gap-2 items-center border rounded-lg px-2 py-1.5 bg-white shadow-sm">
                  {/* Left: Date/time */}
                  <div className="flex gap-1 items-center w-full">
                    <DatePicker
                      selected={dateValue}
                      onChange={date => updateDateTime(idx, 'date', date ? format(date, 'yyyy-MM-dd') : '')}
                      dateFormat="dd/MM/yyyy"
                      placeholderText="dd/mm/yyyy"
                      locale={it}
                      className="w-28 border rounded-lg p-1.5"
                      calendarStartDay={1}
                    />
                    <DatePicker
                      selected={startValue}
                      onChange={date => {
                        if (date) {
                          const hours = date.getHours().toString().padStart(2, '0');
                          const minutes = date.getMinutes().toString().padStart(2, '0');
                          const timeString = `${hours}:${minutes}`;
                          updateDateTime(idx, 'start', timeString);
                        } else {
                          updateDateTime(idx, 'start', '');
                        }
                      }}
                      showTimeSelect
                      showTimeSelectOnly
                      timeIntervals={15}
                      timeCaption="Ora inizio"
                      dateFormat="HH:mm"
                      placeholderText="--:--"
                      locale={it}
                      className="w-20 border rounded-lg p-1.5"
                    />
                    <span>-</span>
                    <DatePicker
                      selected={endValue}
                      onChange={date => {
                        if (date) {
                          const hours = date.getHours().toString().padStart(2, '0');
                          const minutes = date.getMinutes().toString().padStart(2, '0');
                          const timeString = `${hours}:${minutes}`;
                          updateDateTime(idx, 'end', timeString);
                        } else {
                          updateDateTime(idx, 'end', '');
                        }
                      }}
                      showTimeSelect
                      showTimeSelectOnly
                      timeIntervals={15}
                      timeCaption="Ora fine"
                      dateFormat="HH:mm"
                      placeholderText="--:--"
                      locale={it}
                      className="w-20 border rounded-lg p-1.5"
                    />
                  </div>
                  {/* Right: Docente/Co-docente for this day */}
                  <div className="flex gap-2 items-center w-full">
                    <select
                      className="border rounded-lg p-1.5 w-full"
                      value={String(dt.trainerId) || ''}
                  onChange={e => updateDateTime(idx, 'trainerId', e.target.value)}
                      disabled={!formData.training_id}
                    >
                      <option value="">Seleziona un docente</option>
                      {filteredDayTrainers.length === 0 && (
                        <option value="" disabled>Nessun docente con le certificazioni richieste</option>
                      )}
                      {filteredDayTrainers.map((tr: any) => (
                        <option key={tr.id} value={String(tr.id)}>{tr.first_name} {tr.last_name}</option>
                      ))}
                    </select>
                    <select
                      className="border rounded-lg p-1.5 w-full"
                      value={String(dt.coTrainerId) || ''}
                  onChange={e => updateDateTime(idx, 'coTrainerId', e.target.value)}
                  disabled={!dt.trainerId}
                    >
                      <option value="">Nessuno</option>
                      {coTrainerOptionsDay.map((tr: any) => (
                        <option key={tr.id} value={String(tr.id)}>{tr.first_name} {tr.last_name}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="text-red-500 hover:text-red-700"
                      onClick={() => removeDateTime(idx)}
                    >
                      &times;
                    </button>
                  </div>
                </div>
              );
            })}
            {formData.dates.length < 4 && (
              <button
                type="button"
                className="text-blue-600 hover:underline text-sm mt-1 self-start"
                onClick={addDateTime}
              >
                + Aggiungi data e orario
              </button>
            )}
          </div>

          {/* Bottom: Luogo e Note (stessa dimensione, una riga) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            <div>
              <Label>Luogo</Label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Inserisci il luogo"
                className="rounded-lg"
              />
            </div>
            <div>
              <Label>Note</Label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Inserisci eventuali note"
                className="rounded-lg"
              />
            </div>
          </div>
        </div>
      );
    }
    else if (idx === 1) {
      // Step 2 - Partecipanti
      return (
        <div className="flex flex-col md:flex-row gap-4 h-[500px]">
          {/* Left column - Company selection */}
          <div className="md:w-1/2 w-full">
            <div className="border rounded-md p-4 bg-gray-50 h-full overflow-y-auto">
              <h3 className="font-semibold mb-3 text-gray-700">Seleziona Aziende</h3>
              <div className="relative mb-2">
                <Input
                  type="text"
                  placeholder="Cerca azienda..."
                  value={companySearch}
                  onChange={(e) => setCompanySearch(e.target.value)}
                  className="mb-2 rounded-lg"
                />
              </div>
              
              {/* Company list with checkboxes */}
              <div className="max-h-[400px] overflow-y-auto border rounded-lg bg-white">
                {companies
                  .filter(c => c.ragioneSociale.toLowerCase().includes(companySearch.toLowerCase()))
                  .map(company => (
                    <div key={company.id} className="flex items-center p-2 hover:bg-gray-50 border-b last:border-b-0">
                      <input
                        type="checkbox"
                        id={`company-${company.id}`}
                        checked={selectedCompanies.includes(company.id)}
                        onChange={() => {
                          if (selectedCompanies.includes(company.id)) {
                            // Remove company and its employees
                            const empIds = getEmployeeIdsForCompany(String(company.id));
                            setSelectedCompanies(prev => prev.filter(id => id !== company.id));
                            setSelectedEmployees(prev => prev.filter(id => !empIds.includes(String(id))));
                            
                            // Se abbiamo deselezionato l'azienda attualmente visualizzata, passiamo alla prima disponibile
                            if (employeeTab === company.id) {
                              const remainingCompanies = selectedCompanies.filter(id => id !== company.id);
                              if (remainingCompanies.length > 0) {
                                setEmployeeTab(remainingCompanies[0]);
                              } else {
                                setEmployeeTab('');
                              }
                            }
                          } else {
                            // Aggiungi l'azienda
                            setSelectedCompanies(prev => [...prev, company.id]);
                            // IMPORTANTE: Imposta immediatamente l'azienda come tab attivo
                            setTimeout(() => {
                              setEmployeeTab(company.id);
                            }, 0);
                          }
                        }}
                        className="mr-2"
                      />
                      <label 
                        htmlFor={`company-${company.id}`} 
                        className="flex-1 cursor-pointer text-sm"
                        onClick={() => {
                          // Forza il cambio di azienda attiva con un timeout per garantire il re-render
                          setTimeout(() => {
                            setEmployeeTab(company.id);
                          }, 0);
                        }}
                      >
                        {company.ragioneSociale}
                      </label>
                    </div>
                  ))}
              </div>
            </div>
          </div>
          
          {/* Right column - Employee selection */}
          <div className="md:w-1/2 w-full">
            <div className="border rounded-md p-4 bg-gray-50 h-full flex flex-col">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold text-gray-700">Seleziona Partecipanti</h3>
                <div className="flex space-x-1">
                  <button 
                    className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                    onClick={() => {
                      if (!employeeTab) return;
                      
                      // Seleziona tutti i dipendenti dell'azienda filtrati
                      const filteredEmployeeIds = employees
                        .filter(e => String(e.company_id) === String(employeeTab))
                        .filter(e => {
                          const fullName = `${e.firstName} ${e.lastName}`.toLowerCase();
                          return fullName.includes(employeeSearch.toLowerCase());
                        })
                        .map(e => e.id);
                      
                      // Aggiunge solo quelli che non sono già selezionati
                      setSelectedEmployees(prev => {
                        const newIds = [...prev];
                        filteredEmployeeIds.forEach(id => {
                          if (!newIds.includes(id)) {
                            newIds.push(id);
                          }
                        });
                        return newIds;
                      });
                    }}
                    disabled={!employeeTab}
                  >
                    Tutti
                  </button>
                  <button 
                    className="text-xs bg-gray-600 text-white px-2 py-1 rounded hover:bg-gray-700"
                    onClick={() => {
                      if (!employeeTab) return;
                      
                      // Deseleziona tutti i dipendenti dell'azienda
                      const companyEmployeeIds = employees
                        .filter(e => String(e.company_id) === String(employeeTab))
                        .map(e => e.id);
                      
                      setSelectedEmployees(prev => 
                        prev.filter(id => !companyEmployeeIds.includes(id))
                      );
                    }}
                    disabled={!employeeTab}
                  >
                    Nessuno
                  </button>
                </div>
              </div>
              
              {/* Search input */}
              <div className="relative mb-2">
                <Input
                  type="text"
                  placeholder="Cerca partecipante..."
                  value={employeeSearch}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                  className="mb-2 rounded-lg"
                  disabled={!selectedCompanies.length}
                />
              </div>
              
              {/* Company pills in horizontal row with scrolling */}
              {selectedCompanies.length > 0 ? (
                <>
                  <div className="mb-2 overflow-x-auto whitespace-nowrap pb-2 no-scrollbar" ref={companyTabsScrollRef}>
                    {selectedCompanies.map(companyId => (
                      <button
                        key={companyId}
                        className={`inline-block px-3 py-1 text-sm rounded-full whitespace-nowrap mr-1 ${
                          employeeTab === companyId ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                        onClick={() => {
                          // Forza il cambio di azienda attiva con un timeout per garantire il re-render
                          setTimeout(() => {
                            setEmployeeTab(companyId);
                          }, 0);
                        }}
                        id={`company-tab-${companyId}`}
                      >
                        {getCompanyName(companyId)}
                      </button>
                    ))}
                  </div>
                  
                  {/* Employee list for selected company */}
                  {employeeTab ? renderEmployeeList() : (
                    <div className="flex-1 flex items-center justify-center text-center text-gray-500 border rounded-lg bg-white">
                      Seleziona un'azienda per visualizzare i dipendenti
                    </div>
                  )}
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-center py-4 text-gray-500 border rounded-lg bg-white">
                  Seleziona almeno un'azienda per visualizzare i partecipanti
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }
    else if (idx === 2) {
      // Step 3 - Presenti (design moderno con sessioni orizzontali)
      return (
        <div className="flex flex-col gap-4 h-[500px]">
          <h3 className="font-semibold mb-2 text-gray-700">Registra presenze nelle sessioni del corso</h3>
          
          {/* Design ottimizzato con sessioni orizzontali più strette */}
          <div className="p-4 bg-gray-50 border rounded-md h-full overflow-y-auto">
            {/* Container scrollabile orizzontalmente per le sessioni */}
            <div 
              className="flex flex-nowrap overflow-x-auto pb-2 gap-2" 
              ref={sessionContainerRef} 
              style={{ scrollBehavior: 'smooth' }}
            >
              {formData.dates.map((dt, dateIdx) => (
                <div 
                  key={dateIdx} 
                  className="bg-white rounded-lg border border-gray-200 overflow-hidden flex-shrink-0" 
                  style={{ width: 'min(100%, 280px)' }}
                >
                  {/* Intestazione sessione */}
                  <div className="bg-blue-50 p-2">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-blue-600 font-semibold text-sm">Sessione {dateIdx + 1}</div>
                        <div className="text-gray-700 text-sm">{formatDate(dt.date)}</div>
                      </div>
                      <div className="text-gray-800 text-sm">
                        {dt.start} - {dt.end}
                      </div>
                    </div>
                  </div>
                  
                  {/* Controlli e lista presenze */}
                  <div className="p-1.5">
                    <div className="flex justify-between mb-1 items-center">
                      <div className="text-gray-600 text-xs">Partecipanti</div>
                      <div className="flex gap-1 text-xs">
                        <button
                          type="button"
                          className="text-blue-600 hover:underline"
                          onClick={() => {
                            const newAttendance = {...attendance};
                            newAttendance[dateIdx] = [...selectedEmployees];
                            setAttendance(newAttendance);
                            
                            // Trigger immediate auto-save
                            if (scheduleId && hasScheduled) {
                              const saveAttendanceData = async () => {
                                try {
                                  // Format attendance data
                                  const attendanceDates = formData.dates.map((dt, idx) => ({
                                    date: dt.date,
                                    employee_ids: newAttendance[idx] || []
                                  }));
                                  
                                  // Create a minimal update payload
                                  const updatePayload = {
                                    attendance: attendanceDates,
                                    company_ids: selectedCompanies,
                                    employee_ids: selectedEmployees,
                                  };
                                  
                                  // Update via API
                                  await update('schedules', String(scheduleId), updatePayload);
                                  console.log('Saved "Select All" attendance data');
                                } catch (error) {
                                  console.error('Error saving attendance:', error);
                                }
                              };
                              saveAttendanceData();
                            }
                          }}
                        >
                          Tutti
                        </button>
                        <span className="text-gray-400">|</span>
                        <button
                          type="button"
                          className="text-blue-600 hover:underline"
                          onClick={() => {
                            const newAttendance = {...attendance};
                            newAttendance[dateIdx] = [];
                            setAttendance(newAttendance);
                            
                            // Trigger immediate auto-save
                            if (scheduleId && hasScheduled) {
                              const saveAttendanceData = async () => {
                                try {
                                  // Format attendance data
                                  const attendanceDates = formData.dates.map((dt, idx) => ({
                                    date: dt.date,
                                    employee_ids: newAttendance[idx] || []
                                  }));
                                  
                                  // Create a minimal update payload
                                  const updatePayload = {
                                    attendance: attendanceDates,
                                    company_ids: selectedCompanies,
                                    employee_ids: selectedEmployees,
                                  };
                                  
                                  // Update via API
                                  await update('schedules', String(scheduleId), updatePayload);
                                  console.log('Saved "Select None" attendance data');
                                } catch (error) {
                                  console.error('Error saving attendance:', error);
                                }
                              };
                              saveAttendanceData();
                            }
                          }}
                        >
                          Nessuno
                        </button>
                      </div>
                    </div>
                    
                    <div className="h-[320px] overflow-y-auto border rounded">
                      {selectedEmployees.length > 0 ? (
                        employees
                          .filter(e => selectedEmployees.includes(e.id))
                          .map(employee => (
                            <div key={`${dateIdx}-${employee.id}`} className="flex items-center p-1 hover:bg-gray-50 border-b last:border-b-0">
                              <input
                                type="checkbox"
                                id={`attendance-${dateIdx}-${employee.id}`}
                                checked={(attendance[dateIdx] || []).includes(employee.id)}
                                onChange={() => {
                                  const newAttendance = {...attendance};
                                  if (!newAttendance[dateIdx]) {
                                    newAttendance[dateIdx] = [];
                                  }
                                  
                                  if (newAttendance[dateIdx].includes(employee.id)) {
                                    newAttendance[dateIdx] = newAttendance[dateIdx].filter(id => id !== employee.id);
                                  } else {
                                    newAttendance[dateIdx].push(employee.id);
                                  }
                                  
                                  setAttendance(newAttendance);
                                }}
                                className="mr-1 w-3 h-3 accent-blue-600"
                              />
                              <div className="flex-1 overflow-hidden">
                                <div className="font-medium text-xs truncate">{employee.firstName} {employee.lastName}</div>
                                <div className="text-xs text-gray-500 truncate">{getCompanyName(employee.company_id)}</div>
                              </div>
                            </div>
                          ))
                      ) : (
                        <div className="text-center py-3 text-gray-500 text-xs">
                          Nessun partecipante selezionato
                        </div>
                      )}
                    </div>
                    
                    {/* Conteggio presenze */}
                    <div className="mt-1 text-right text-gray-500 text-xs">
                      Presenti: {(attendance[dateIdx] || []).length}/{selectedEmployees.length}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }
    else if (idx === 3) {
      // Step 4 - Documenti
      return (
        <div className="flex flex-col gap-4 h-[500px]">
          <h3 className="font-semibold mb-2 text-gray-700">Documenti</h3>
          
          {/* Document Status */}
          <div className="border rounded-md p-4 bg-gray-50 flex-1 overflow-y-auto">
            <div className="mb-4">
              <Label>Stato Documentazione</Label>
              <div className="relative mt-1">
                <button
                  type="button"
                  className="w-full p-2 border rounded flex justify-between items-center bg-white"
                  onClick={() => setShowStatusMenu(!showStatusMenu)}
                >
                  <span>{status}</span>
                  <span>▼</span>
                </button>
                
                {showStatusMenu && (
                  <div className="absolute left-0 right-0 mt-1 border rounded bg-white shadow-lg z-10">
                    {['Preventivo', 'Conferma', 'Fattura', 'Pagamento'].map(s => (
                      <div
                        key={s}
                        className="p-2 hover:bg-gray-100 cursor-pointer"
                        onClick={() => {
                          setStatus(s);
                          setShowStatusMenu(false);
                          // Salva lo stato immediatamente
                          if (scheduleId) {
                            update('schedules', String(scheduleId), { status: s });
                          }
                        }}
                      >
                        {s}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* Selected participants summary */}
            <div className="mb-4">
              <Label>Partecipanti confermati</Label>
              <div className="mt-1 p-2 border rounded bg-white">
                <div className="text-sm text-gray-600">
                  <span className="font-semibold">{selectedEmployees.length}</span> partecipanti da <span className="font-semibold">{selectedCompanies.length}</span> aziende
                </div>
              </div>
            </div>
            
            {/* Document generation options */}
            <div className="space-y-2">
              <div className="flex gap-2">
                <input type="checkbox" id="preventivo" checked={status === 'Preventivo'} readOnly />
                <label htmlFor="preventivo">Genera Preventivo</label>
              </div>
              <div className="flex gap-2">
                <input type="checkbox" id="attestati" disabled={!formData.dates.every(dt => attendance[formData.dates.indexOf(dt)]?.length > 0)} />
                <label htmlFor="attestati" className={!formData.dates.every(dt => attendance[formData.dates.indexOf(dt)]?.length > 0) ? "text-gray-500" : ""}>Genera Attestati</label>
                {!formData.dates.every(dt => attendance[formData.dates.indexOf(dt)]?.length > 0) && (
                  <span className="text-gray-500 text-xs">(disponibile dopo la registrazione delle presenze)</span>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }
  };

  // Prevent body scrolling when modal is open
  useEffect(() => {
    // Disable scrolling on body when modal is open
    document.body.style.overflow = 'hidden';
    
    // Re-enable scrolling when modal is closed
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []); // Run once when modal opens/closes

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 overflow-hidden" onClick={(e) => {
      // Prevent clicks from propagating to elements behind the modal
      e.stopPropagation();
    }}>
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-2xl relative max-h-[95vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Stepper */}
        <button
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          onClick={onClose}
        >
          &times;
        </button>
        <h2 className="text-xl font-bold mb-6">{isEditing ? "Modifica Programma Corso" : "Nuovo Programma Corso"}</h2>
        {/* STEP PILL NAVIGATION */}
        <div className="flex w-full mb-6 justify-center">
          <div className="flex bg-gray-100 rounded-full shadow-sm border border-gray-200 overflow-x-auto px-2 py-1 gap-1" style={{ minHeight: 40 }}>
          {stepItems.map((item, idx) => (
            <button
              key={item.step}
              type="button"
                className={`px-4 py-1 text-base font-semibold rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300
                  ${currentStep === item.step ? 'bg-blue-600 text-white shadow' : 'bg-transparent text-gray-700 hover:bg-blue-100'}`}
                onClick={() => setCurrentStep(item.step)}
                style={{ minWidth: 0 }}
              >{item.label}</button>
          ))}
          </div>
        </div>
        {error && <div className="mb-4 text-red-600">{error}</div>}
        <div className="border-2 border-blue-300 rounded-lg p-4 mb-6">
          {renderStep()}
        </div>
        {/* Navigation buttons and actions */}
        <div className="flex justify-end space-x-2 mt-4">
          <Button onClick={onClose} variant="secondary">Annulla</Button>
          {currentStep > 0 && (
            <Button onClick={handleBack} variant="secondary">Indietro</Button>
          )}
          {currentStep < 3 && (
            <Button onClick={handleNext}>Avanti</Button>
          )}
          <Button onClick={handleSchedule}>
            {isEditing ? "Aggiorna Corso" : "Programma Corso"}
          </Button>
        </div>
      </div>
    </div>
  );
}