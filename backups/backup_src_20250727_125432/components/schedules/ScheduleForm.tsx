import React, { useState } from 'react';
import { X } from 'lucide-react';
import AsyncSelect from 'react-select/async';
import { apiGet } from '../../api/api';
import { Company } from '../../types';

interface Course {
  id: string;
  name: string;
  title: string;
}

interface Trainer {
  id: string;
  firstName: string;
  lastName: string;
}

interface ScheduleFormProps {
  initialData?: {
    id?: string;
    courseId?: string;
    trainerId?: string;
    companyId?: string;
    start_date?: string;
    end_date?: string;
    location?: string;
    max_participants?: number;
    notes?: string;
  };
  courses: Course[];
  trainers: Trainer[];
  companies: Company[];
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
}

const ScheduleForm: React.FC<ScheduleFormProps> = ({
  initialData,
  courses,
  trainers,
  companies,
  onSubmit,
  onCancel
}) => {
  const [formData, setFormData] = useState({
    courseId: initialData?.courseId || '',
    trainerId: initialData?.trainerId || '',
    companyId: initialData?.companyId || '',
    startDate: initialData?.start_date ? new Date(initialData.start_date).toISOString().split('T')[0] : '',
    startTime: initialData?.start_date ? new Date(initialData.start_date).toISOString().split('T')[1].substring(0, 5) : '09:00',
    endDate: initialData?.end_date ? new Date(initialData.end_date).toISOString().split('T')[0] : '',
    endTime: initialData?.end_date ? new Date(initialData.end_date).toISOString().split('T')[1].substring(0, 5) : '17:00',
    location: initialData?.location || '',
    maxParticipants: initialData?.max_participants || 20,
    notes: initialData?.notes || ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      ...formData,
      startDate: new Date(`${formData.startDate}T${formData.startTime}`).toISOString(),
      endDate: new Date(`${formData.endDate}T${formData.endTime}`).toISOString(),
    };
    await onSubmit(data);
  };

  // Async load courses for react-select
  const loadCourses = async (inputValue: string) => {
    const data = await apiGet(`/courses?search=${encodeURIComponent(inputValue)}`) as any[];
    const options = data.map((course: any) => ({
      value: course.id,
      label: course.title || course.name || String(course.id)
    }));
    console.log('Course options:', options);
    return options;
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-lg bg-white">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">
            {initialData?.id ? 'Modifica Programma Corso' : 'Nuovo Programma Corso'}
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Corso</label>
            <AsyncSelect
              cacheOptions
              defaultOptions
              loadOptions={loadCourses}
              value={formData.courseId ? { value: formData.courseId, label: courses.find(c => c.id === formData.courseId)?.title || '' } : null}
              onChange={option => setFormData({ ...formData, courseId: option?.value || '' })}
              placeholder="Seleziona un corso"
              isClearable
              styles={{ menu: base => ({ ...base, zIndex: 9999 }) }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Docente</label>
            <select
              value={formData.trainerId}
              onChange={(e) => setFormData({ ...formData, trainerId: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            >
              <option value="">Seleziona un docente</option>
              {trainers.map((trainer) => (
                <option key={trainer.id} value={trainer.id}>
                  {trainer.firstName} {trainer.lastName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Azienda</label>
            <select
              value={formData.companyId}
              onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">Seleziona un'azienda</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.ragioneSociale}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Data Inizio</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Ora Inizio</label>
              <input
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Data Fine</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Ora Fine</label>
              <input
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Luogo</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="Inserisci il luogo"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Numero Massimo Partecipanti
            </label>
            <input
              type="number"
              value={formData.maxParticipants}
              onChange={(e) => setFormData({ ...formData, maxParticipants: parseInt(e.target.value) })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              min="1"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Note</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              rows={3}
              placeholder="Inserisci eventuali note"
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Annulla
            </button>
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              {initialData?.id ? 'Salva Modifiche' : 'Crea Programma'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ScheduleForm;