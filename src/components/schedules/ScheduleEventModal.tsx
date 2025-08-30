import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "../../design-system/atoms/Button";
import { create, update } from '../../services/apiClient';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Company } from '../../types';

// Import modular components
import {
  CourseDetailsForm,
  CompanyEmployeeSelector,
  AttendanceManager,
  DocumentManager
} from './components';

interface Person {
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
  persons: Person[];
  existingEvent?: Record<string, unknown>;
  onClose: () => void;
  onSuccess: () => void;
  initialDate?: string;
  initialTime?: { start: string; end: string; };
}

type DateEntry = { 
  date: string; 
  start: string; 
  end: string; 
  trainerId: string | number; 
  coTrainerId: string | number 
};

const DELIVERY_MODES = [
  { value: 'in-person', label: 'In presenza' },
  { value: 'online', label: 'Online' },
  { value: 'hybrid', label: 'Ibrido' },
  { value: 'blended', label: 'Blended' }
];

export default function ScheduleEventModal({ 
  trainings, 
  trainers, 
  companies, 
  persons, 
  existingEvent = {}, 
  onClose, 
  onSuccess, 
  initialDate, 
  initialTime 
}: ScheduleEventModalProps) {
  
  // Core state
  const isEditing = existingEvent && Object.keys(existingEvent).length > 0;
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasScheduled, setHasScheduled] = useState(isEditing);
  const [scheduleId, setScheduleId] = useState<string | number | null>((existingEvent as Record<string, unknown>)?.id as string | number || null);

  // Form data state
  const initialFormData = useMemo(() => {
    if (isEditing) {
      const event = existingEvent as Record<string, unknown>;
      const course = event.course as Record<string, unknown> | undefined;
      const dates = (event.dates as Record<string, unknown>[]) || [];
      
      return {
        training_id: (event.training_id as string) || (course?.id as string) || "",
        trainer_id: "",
        co_trainer_id: "",
        dates: dates.map((d: Record<string, unknown>) => ({
          date: d.date as string,
          start: d.start as string,
          end: d.end as string,
          trainerId: (d.trainer_id || d.trainerId) as string | number,
          coTrainerId: (d.co_trainer_id || d.coTrainerId) as string | number,
        })),
        location: (event.location as string) || "",
        max_participants: (event.max_participants as number) || 20,
        notes: (event.notes as string) || "",
        delivery_mode: (event.delivery_mode as string) || "",
      };
    }
    
    return {
      training_id: "",
      trainer_id: "",
      co_trainer_id: "",
      dates: [{
        date: initialDate || new Date().toISOString().split("T")[0],
        start: initialTime?.start || "09:00",
        end: initialTime?.end || "13:00",
        trainerId: "",
        coTrainerId: "",
      }],
      location: "",
      max_participants: 20,
      notes: "",
      delivery_mode: "",
    };
  }, [existingEvent, isEditing, initialDate, initialTime]);

  const [formData, setFormData] = useState(initialFormData);

  // Selection state
  const [selectedCompanies, setSelectedCompanies] = useState<(string | number)[]>(
    (existingEvent?.company_ids as (string | number)[]) || (existingEvent?.companies as Company[])?.map((c: Company) => c.id) || []
  );
  const [selectedPersons, setSelectedPersons] = useState<(string | number)[]>(
    (existingEvent?.employee_ids as (string | number)[]) || (existingEvent?.employees as Person[])?.map((e: Person) => e.id) || []
  );

  // Attendance state
  const [attendance, setAttendance] = useState<Record<number, (string | number)[]>>({});
  const [status, setStatus] = useState('Preventivo');

  // Search states
  const [courseSearch, setCourseSearch] = useState('');
  const [companySearch, setCompanySearch] = useState('');
  const [personSearch, setPersonSearch] = useState('');
  const [personTab, setPersonTab] = useState<string | number>('');
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  // Computed values
  const selectedCourse = useMemo(() => 
    trainings.find(t => t.id === formData.training_id), 
    [trainings, formData.training_id]
  );

  const requiredCerts = useMemo(() => 
    selectedCourse?.certifications || [], 
    [selectedCourse]
  );

  const filteredTrainers = useMemo(() => 
    trainers.filter(trainer => 
      requiredCerts.length === 0 || 
      requiredCerts.every(cert => trainer.certifications?.includes(cert))
    ), 
    [trainers, requiredCerts]
  );

  const coTrainerOptions = useMemo(() => 
    filteredTrainers.filter(t => t.id !== formData.trainer_id), 
    [filteredTrainers, formData.trainer_id]
  );

  // Step configuration
  const stepItems = useMemo(() => [
    { label: "Dettagli", step: 0, enabled: true },
    { label: "Partecipanti", step: 1, enabled: true },
    { label: "Presenti", step: 2, enabled: hasScheduled || isEditing },
    { label: "Documenti", step: 3, enabled: hasScheduled || isEditing },
  ], [hasScheduled, isEditing]);

  // Utility functions
  const normalizeAttendanceData = useCallback((attendanceData: unknown): Record<number, (string | number)[]> => {
    if (!attendanceData) return {};
    
    if (Array.isArray(attendanceData)) {
      return attendanceData.reduce((acc, entry, idx) => {
        const session = entry as Record<string, unknown>;
        acc[idx] = (session?.employee_ids as (string | number)[]) || [];
        return acc;
      }, {} as Record<number, (string | number)[]>);
    }
    
    if (typeof attendanceData === 'object') {
      const result: Record<number, (string | number)[]> = {};
      const attendanceObj = attendanceData as Record<string, unknown>;
      Object.keys(attendanceObj).forEach((key, idx) => {
        const session = attendanceObj[key] as Record<string, unknown>;
        if (session && session.attendees) {
          const attendees = session.attendees as Record<string, Record<string, unknown>>;
          const presentIds = Object.values(attendees)
            .filter((a: Record<string, unknown>) => a.attended)
            .map((a: Record<string, unknown>) => a.id as string | number);
          result[idx] = presentIds;
        } else if (session && session.employee_ids) {
          result[idx] = session.employee_ids as (string | number)[];
        }
      });
      return result;
    }
    
    return {};
  }, []);

  // Form handlers
  const handleFormDataChange = useCallback((field: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  // Utility functions
  const getCompanyName = useCallback((companyId: string | number) => {
    const company = companies.find(c => c.id === companyId);
    return company?.name || 'Azienda sconosciuta';
  }, [companies]);

  const getPersonIdsForCompany = useCallback((companyId: string) => {
    return persons
      .filter(person => (person.company_id || person.companyId) === companyId)
      .map(person => person.id);
  }, [persons]);

  const formatDate = useCallback((isoDate: string) => {
    return new Date(isoDate).toLocaleDateString('it-IT');
  }, []);

  // Company/Employee handlers
  const handleCompanyToggle = useCallback((companyId: string | number) => {
    setSelectedCompanies(prev => 
      prev.includes(companyId) 
        ? prev.filter(id => id !== companyId)
        : [...prev, companyId]
    );
  }, []);

  const handlePersonToggle = useCallback((personId: string | number) => {
    setSelectedPersons(prev => 
      prev.includes(personId) 
        ? prev.filter(id => id !== personId)
        : [...prev, personId]
    );
  }, []);

  const handleSelectAllPersons = useCallback((companyId: string | number) => {
    const companyPersonIds = getPersonIdsForCompany(String(companyId));
    setSelectedPersons(prev => [...new Set([...prev, ...companyPersonIds])]);
  }, [getPersonIdsForCompany]);

  const handleDeselectAllPersons = useCallback((companyId: string | number) => {
    const companyPersonIds = getPersonIdsForCompany(String(companyId));
    setSelectedPersons(prev => prev.filter(id => !companyPersonIds.includes(id)));
  }, [getPersonIdsForCompany]);

  // Attendance handlers
  const handleAttendanceChange = useCallback((dateIdx: number, personId: string | number, isPresent: boolean) => {
    setAttendance(prev => {
      const newAttendance = { ...prev };
      if (!newAttendance[dateIdx]) {
        newAttendance[dateIdx] = [];
      }
      
      if (isPresent) {
        if (!newAttendance[dateIdx].includes(personId)) {
          newAttendance[dateIdx] = [...newAttendance[dateIdx], personId];
        }
      } else {
        newAttendance[dateIdx] = newAttendance[dateIdx].filter(id => id !== personId);
      }
      
      return newAttendance;
    });
  }, []);

  const handleSelectAllForDate = useCallback((dateIdx: number) => {
    setAttendance(prev => ({
      ...prev,
      [dateIdx]: [...selectedPersons]
    }));
  }, [selectedPersons]);

  const handleSelectNoneForDate = useCallback((dateIdx: number) => {
    setAttendance(prev => ({
      ...prev,
      [dateIdx]: []
    }));
  }, []);

  // Validation
  const validateAll = useCallback(() => {
    if (!formData.training_id) {
      setError('Seleziona un corso');
      return false;
    }
    if (!formData.location) {
      setError('Inserisci il luogo del corso');
      return false;
    }
    if (formData.dates.length === 0) {
      setError('Aggiungi almeno una data');
      return false;
    }
    if (selectedCompanies.length === 0) {
      setError('Seleziona almeno un\'azienda');
      return false;
    }
    if (selectedPersons.length === 0) {
      setError('Seleziona almeno un partecipante');
      return false;
    }
    setError(null);
    return true;
  }, [formData, selectedCompanies, selectedPersons]);

  // Navigation handlers
  const handleNext = useCallback(() => {
    setError(null);
    setCurrentStep(s => s + 1);
  }, []);
  
  const handleBack = useCallback(() => {
    setError(null);
    setCurrentStep(s => s - 1);
  }, []);

  // Build schedule payload
  const buildSchedulePayload = useCallback(() => {
    const dates: string[] = formData.dates.map((d: DateEntry) => d.date);
    const startDateStr = dates.reduce((a, b) => (a < b ? a : b));
    const endDateStr = dates.reduce((a, b) => (a > b ? a : b));
    
    const firstDate = formData.dates.find((d: DateEntry) => d.date === startDateStr);
    const lastDate = formData.dates.find((d: DateEntry) => d.date === endDateStr);
    
    const startDateTimeLocal = `${startDateStr}T${firstDate?.start || '09:00'}:00`;
    const endDateTimeLocal = `${endDateStr}T${lastDate?.end || '17:00'}:00`;
    const startDateTimeISO = new Date(startDateTimeLocal).toISOString();
    const endDateTimeISO = new Date(endDateTimeLocal).toISOString();
    
    const attendanceArr = formData.dates.map((dt: DateEntry, idx: number) => ({
      date: dt.date,
      employee_ids: attendance[idx] || []
    }));
    
    const validCompanyIds = selectedCompanies.filter(id => id !== null && id !== undefined);
    const validPersonIds = selectedPersons.filter(id => id !== null && id !== undefined);
    
    const schedulePayload = {
      courseId: formData.training_id,
      start_date: startDateTimeISO,
      end_date: endDateTimeISO,
      location: formData.location,
      max_participants: formData.max_participants,
      notes: formData.notes,
      delivery_mode: formData.delivery_mode,
      dates: formData.dates.map((dt: DateEntry) => ({
        date: dt.date,
        start: dt.start,
        end: dt.end,
        trainer_id: dt.trainerId,
        co_trainer_id: dt.coTrainerId,
      })),
      companies: validCompanyIds.map(id => ({ companyId: String(id) })),
      company_ids: validCompanyIds.map(id => String(id)),
      enrollments: validPersonIds.map(id => ({ employeeId: String(id) })),
      employee_ids: validPersonIds.map(id => String(id)),
      attendance: attendanceArr,
      status,
    };
    
    if (isEditing && scheduleId) {
      return { ...schedulePayload, id: scheduleId };
    }
    
    return schedulePayload;
  }, [formData, scheduleId, isEditing, selectedCompanies, selectedPersons, attendance, status]);

  // Main schedule handler
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
      toast.success('Corso programmato con successo!', { 
        position: 'top-right', 
        autoClose: 2500 
      });
      
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Errore durante la programmazione del corso';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [validateAll, buildSchedulePayload, isEditing, scheduleId, onSuccess]);

  // Initialize attendance data
  useEffect(() => {
    if (existingEvent && Object.keys(existingEvent).length > 0 && existingEvent.attendance) {
      const normalizedAttendance = normalizeAttendanceData(existingEvent.attendance);
      if (Object.keys(normalizedAttendance).length > 0) {
        setAttendance(normalizedAttendance);
      }
    }
  }, [existingEvent, normalizeAttendanceData]);

  // Prevent body scrolling when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  // Render step content
  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <CourseDetailsForm
            trainings={trainings}
            trainers={trainers}
            formData={formData}
            onFormDataChange={handleFormDataChange}
            selectedCourse={selectedCourse}
            filteredTrainers={filteredTrainers}
            coTrainerOptions={coTrainerOptions}
            courseSearch={courseSearch}
            onCourseSearchChange={setCourseSearch}
            DELIVERY_MODES={DELIVERY_MODES}
          />
        );
      
      case 1:
        return (
          <CompanyEmployeeSelector
            companies={companies}
            persons={persons}
            selectedCompanies={selectedCompanies}
            selectedPersons={selectedPersons}
            onCompanyToggle={handleCompanyToggle}
            onPersonToggle={handlePersonToggle}
            onSelectAllPersons={handleSelectAllPersons}
            onDeselectAllPersons={handleDeselectAllPersons}
            getCompanyName={getCompanyName}
            getPersonIdsForCompany={getPersonIdsForCompany}
            companySearch={companySearch}
            onCompanySearchChange={setCompanySearch}
            personSearch={personSearch}
            onPersonSearchChange={setPersonSearch}
            personTab={personTab}
            onPersonTabChange={setPersonTab}
          />
        );
      
      case 2:
        return (
          <AttendanceManager
            dates={formData.dates}
            selectedPersons={selectedPersons}
            persons={persons}
            attendance={attendance}
            onAttendanceChange={handleAttendanceChange}
            onSelectAllForDate={handleSelectAllForDate}
            onSelectNoneForDate={handleSelectNoneForDate}
            getCompanyName={getCompanyName}
            formatDate={formatDate}
            selectedDayIdx={selectedDayIdx}
            onSelectedDayChange={setSelectedDayIdx}
          />
        );
      
      case 3:
        return (
          <DocumentManager
            status={status}
            onStatusChange={setStatus}
            selectedEmployees={selectedPersons}
            selectedCompanies={selectedCompanies}
            attendance={attendance}
            dates={formData.dates}
            showStatusMenu={showStatusMenu}
            onShowStatusMenuChange={setShowStatusMenu}
          />
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 overflow-hidden">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-2xl relative max-h-[95vh] overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">
            {isEditing ? "Modifica Programma Corso" : "Nuovo Programma Corso"}
          </h2>
          <button
            className="text-gray-400 hover:text-gray-600 text-2xl"
            onClick={onClose}
          >
            &times;
          </button>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-center space-x-2 mb-6">
          {stepItems.map((item, i) => (
            <React.Fragment key={i}>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium cursor-pointer ${
                  i < currentStep
                    ? 'bg-green-500 text-white'
                    : i === currentStep
                    ? 'bg-blue-500 text-white'
                    : item.enabled
                    ? 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    : 'bg-gray-100 text-gray-400'
                }`}
                onClick={() => item.enabled && setCurrentStep(i)}
              >
                {i < currentStep ? '✓' : i + 1}
              </div>
              {i < stepItems.length - 1 && (
                <div
                  className={`w-12 h-1 ${
                    i < currentStep ? 'bg-green-500' : 'bg-gray-200'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        <div className="text-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">
            {stepItems[currentStep]?.label}
          </h3>
          <p className="text-sm text-gray-600">
            Passo {currentStep + 1} di {stepItems.length}
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {/* Step Content */}
        <div className="border-2 border-blue-300 rounded-lg p-4 mb-6 flex-1 overflow-y-auto">
          {renderStep()}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end space-x-2">
          <Button onClick={onClose} variant="secondary">
            Annulla
          </Button>
          
          {currentStep > 0 && (
            <Button onClick={handleBack} variant="secondary">
              Indietro
            </Button>
          )}
          
          {currentStep < 3 && (
            <Button onClick={handleNext}>
              Avanti
            </Button>
          )}
          
          <Button onClick={handleSchedule} disabled={loading}>
            {loading ? 'Salvando...' : (isEditing ? "Aggiorna Corso" : "Programma Corso")}
          </Button>
        </div>
      </div>
    </div>
  );
}