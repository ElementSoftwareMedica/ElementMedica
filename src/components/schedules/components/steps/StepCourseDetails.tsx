import React from 'react';
import { Label } from '../../../../design-system/atoms/Label';
import { CourseDetailsForm, DateTimeManager } from '../index';
import type { Training, Trainer, Option } from '../../types';
import type { FormData } from '../../hooks/useFormData';
import { normalizeText } from '../../utils';

interface StepCourseDetailsProps {
  // Form data
  formData: FormData;
  onFormDataChange: (field: string, value: unknown) => void;
  setFormData: (data: Partial<FormData>) => void;

  // Course data
  trainings: Training[];
  selectedCourse?: Training;
  setSelectedCourseDetails: (course: Training | undefined) => void;

  // Trainers
  effectiveTrainers: Trainer[];
  filteredTrainers: Trainer[];
  allCoTrainers: Trainer[];

  // Options
  dynamicRiskOptions: Option[];
  dynamicCourseTypeOptions: Option[];
  DELIVERY_MODES: Option[];

  // Search
  courseSearch: string;
  setCourseSearch: (value: string) => void;

  // Date/Time handlers
  handleDateChange: (index: number, field: 'date' | 'start' | 'end', value: string) => void;
  handleRemoveDate: (index: number) => void;

  // Computed values
  totalSelectedHours: number;
  courseDuration: number;
  hoursLeft: number;
  formatDate: (isoDate: string) => string;

  // Nuovo: conteggio varianti del corso selezionato
  variantsCount?: number;
}

export const StepCourseDetails: React.FC<StepCourseDetailsProps> = ({
  formData,
  onFormDataChange,
  setFormData,
  trainings = [],
  selectedCourse,
  setSelectedCourseDetails,
  effectiveTrainers = [],
  filteredTrainers = [],
  allCoTrainers = [],
  dynamicRiskOptions = [],
  dynamicCourseTypeOptions = [],
  DELIVERY_MODES = [],
  courseSearch,
  setCourseSearch,
  handleDateChange,
  handleRemoveDate,
  totalSelectedHours,
  courseDuration,
  hoursLeft,
  formatDate,
  variantsCount,
}) => {
  return (
    <div className="space-y-6">
      <CourseDetailsForm
        trainings={trainings}
        trainers={effectiveTrainers}
        formData={formData}
        onFormDataChange={onFormDataChange}
        selectedCourse={selectedCourse}
        filteredTrainers={filteredTrainers}
        coTrainerOptions={allCoTrainers}
        courseSearch={courseSearch}
        onCourseSearchChange={setCourseSearch}
        DELIVERY_MODES={DELIVERY_MODES}
        RISK_LEVEL_OPTIONS={dynamicRiskOptions}
        COURSE_TYPE_OPTIONS={dynamicCourseTypeOptions}
        // Propaga il conteggio varianti al form per la logica di visualizzazione delle pillole
        variantsCount={variantsCount}
        onCourseSelected={(course: Training | undefined) => {
          // Persist selection locally for details/preview
          setSelectedCourseDetails(course);

          // Build updates for form state
          const updates: Partial<FormData> = {};

          if (course) {
            // Try to anchor selection to the first matching variant by normalized title
            const raw = course.title ?? course.name ?? '';
            const norm = normalizeText(raw);
            const firstVariant = trainings.find(t => {
              const tRaw = t.title ?? t.name ?? '';
              return normalizeText(tRaw) === norm;
            });
            if (firstVariant && firstVariant.id != null) {
              updates.training_id = firstVariant.id;
            }

            // Pre-fill suggested risk/type if available and not already set
            const courseRisk = course.riskLevel;
            const courseType = course.courseType;

            if (!formData.risk_level && courseRisk && dynamicRiskOptions.some(o => o.value === String(courseRisk))) {
              updates.risk_level = String(courseRisk) as FormData['risk_level'];
            }
            if (!formData.course_type && courseType && dynamicCourseTypeOptions.some(o => o.value === String(courseType))) {
              updates.course_type = String(courseType) as FormData['course_type'];
            }
          } else {
            // Clearing selection resets related fields
            updates.training_id = '' as FormData['training_id'];
            updates.risk_level = '' as FormData['risk_level'];
            updates.course_type = '' as FormData['course_type'];
          }

          if (Object.keys(updates).length) setFormData(updates);
        }}
      />

      <DateTimeManager
        dates={formData.dates}
        trainers={effectiveTrainers}
        filteredTrainers={filteredTrainers}
        coTrainerOptions={allCoTrainers}
        onUpdateDateTime={(index, field, value) => {
          if (field === 'date' || field === 'start' || field === 'end') {
            handleDateChange(index, field, value);
          } else if (field === 'trainerId' || field === 'coTrainerId') {
            const newDates = formData.dates.map((date, i: number) =>
              i === index ? { ...date, [field]: value } : date
            );
            setFormData({ dates: newDates });
          }
        }}
        onAddDateTime={() => {
          // ✅ FIX: Logica intelligente per auto-fill date e orari nuove sessioni
          const lastSession = formData.dates[formData.dates.length - 1];
          const lastDate = lastSession?.date || '';
          const lastEnd = lastSession?.end || '';

          // Parse ora fine ultima sessione (in minuti dalla mezzanotte)
          const [lastEndHours, lastEndMinutes] = (lastEnd || '18:00').split(':').map(Number);
          const lastEndInMinutes = lastEndHours * 60 + lastEndMinutes;

          // Calcola ore da programmare: min tra hoursLeft e 4 (max per sessione)
          const maxHoursPerSession = 4;
          const durationInHours = Math.min(hoursLeft > 0 ? hoursLeft : 4, maxHoursPerSession);

          let newDate = '';
          let startTime = '09:00';
          let startInMinutes = 9 * 60;

          // Se l'ultima sessione finisce prima delle 14:00 → sessione pomeridiana stesso giorno
          if (lastEndInMinutes <= 14 * 60 && lastDate) {
            // Stessa data, orario pomeridiano 14:00-18:00
            newDate = lastDate;
            startTime = '14:00';
            startInMinutes = 14 * 60;
          } else if (lastDate) {
            // Prossimo giorno lavorativo (salta weekend)
            const currentDate = new Date(lastDate);
            currentDate.setDate(currentDate.getDate() + 1);

            // Salta sabato (6) e domenica (0)
            while (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
              currentDate.setDate(currentDate.getDate() + 1);
            }

            newDate = currentDate.toISOString().split('T')[0];
            startTime = '09:00';
            startInMinutes = 9 * 60;
          }

          // Calcola ora di fine
          const endInMinutes = startInMinutes + (durationInHours * 60);
          const endHours = Math.floor(endInMinutes / 60);
          const endMinutesVal = endInMinutes % 60;
          const endTime = `${String(endHours).padStart(2, '0')}:${String(endMinutesVal).padStart(2, '0')}`;

          setFormData({
            dates: [...formData.dates, { date: newDate, start: startTime, end: endTime, trainerId: '', coTrainerId: '' }]
          });
        }}
        onRemoveDateTime={handleRemoveDate}
        formatDate={formatDate}
        totalSelectedHours={totalSelectedHours}
        courseDuration={courseDuration}
        hoursLeft={hoursLeft}
      />

      <div>
        <Label>Note</Label>
        <textarea
          className="w-full p-2 border rounded resize-none"
          rows={3}
          placeholder="Note aggiuntive sul corso..."
          value={formData.notes || ''}
          onChange={(e) => onFormDataChange('notes', e.target.value)}
        />
      </div>
    </div>
  );
};

export default StepCourseDetails;