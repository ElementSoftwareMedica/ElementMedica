import React, { useState } from 'react';
import type { Course } from '../../types/courses';
import { useToast } from '../../hooks/useToast';
import { createCourse, updateCourse } from '../../services/courses';
import { Save, X } from 'lucide-react';
import { Button } from '../../design-system/atoms/Button';

interface CourseFormProps {
  course?: Course;
  onSubmit: (formData: any) => void;
  onCancel: () => void;
  submitLabel?: string;
  cancelLabel?: string;
}

export const CourseForm: React.FC<CourseFormProps> = ({ 
  course, 
  onSubmit, 
  onCancel,
  submitLabel = 'Salva',
  cancelLabel = 'Annulla'
}) => {
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: course?.title || '',
    description: course?.description || '',
    duration: course?.duration?.toString() || '',
    validityYears: course?.validityYears?.toString() || '',
    renewalDuration: course?.renewalDuration || '',
    pricePerPerson: course?.pricePerPerson?.toString() || '',
    certifications: course?.certifications || '',
    maxPeople: course?.maxPeople?.toString() || '',
    regulation: course?.regulation || '',
    contents: course?.contents || '',
    code: course?.code || '',
    category: course?.category || '',
    status: course?.status || 'Active',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const payload = {
        ...formData,
        duration: formData.duration ? Number(formData.duration) : 0,
        validityYears: formData.validityYears ? Number(formData.validityYears) : undefined,
        pricePerPerson: formData.pricePerPerson ? Number(formData.pricePerPerson) : undefined,
        maxPeople: formData.maxPeople ? Number(formData.maxPeople) : undefined,
      };
      
      if (course) {
        // Update existing course
        await updateCourse(course.id, payload);
        showToast({
          message: 'Corso aggiornato con successo',
          type: 'success'
        });
      } else {
        // Create new course
        await createCourse(payload);
        showToast({
          message: 'Corso creato con successo',
          type: 'success'
        });
      }
      onSubmit(payload);
    } catch (error) {
      console.error('Error saving course:', error);
      showToast({
        message: `Errore: ${error instanceof Error ? error.message : 'Errore nel salvataggio del corso'}`,
        type: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="bg-white shadow-md rounded-lg overflow-hidden">
      {/* Header con titolo */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
        <h2 className="text-xl font-semibold text-white">{course ? 'Modifica Corso' : 'Nuovo Corso'}</h2>
      </div>
      
      <form onSubmit={handleSubmit} className="p-6">
        {/* Sezione Informazioni Base */}
        <div className="mb-8">
          <h3 className="text-lg font-medium text-gray-800 mb-4 pb-2 border-b">Informazioni Base</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Corso <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                placeholder="Inserisci il titolo del corso"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Codice <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="code"
                value={formData.code}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                placeholder="Inserisci il codice del corso"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categoria
              </label>
              <input
                type="text"
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                placeholder="Categoria del corso"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stato
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              >
                <option value="Active">Attivo</option>
                <option value="Inactive">Inattivo</option>
                <option value="Draft">Bozza</option>
              </select>
            </div>
          </div>
        </div>
        
        {/* Sezione Durata e Validità */}
        <div className="mb-8">
          <h3 className="text-lg font-medium text-gray-800 mb-4 pb-2 border-b">Durata e Validità</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Durata corso (ore) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="duration"
                value={formData.duration}
                onChange={handleChange}
                required
                min="0"
                step="0.5"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Anni validità
              </label>
              <input
                type="number"
                name="validityYears"
                value={formData.validityYears}
                onChange={handleChange}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Durata corso aggiornamento
              </label>
              <input
                type="text"
                name="renewalDuration"
                value={formData.renewalDuration}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                placeholder="Es: 4 ore"
              />
            </div>
          </div>
        </div>
        
        {/* Sezione Limiti e Costi */}
        <div className="mb-8">
          <h3 className="text-lg font-medium text-gray-800 mb-4 pb-2 border-b">Limiti e Costi</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                €/persona
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">€</span>
                <input
                  type="number"
                  name="pricePerPerson"
                  value={formData.pricePerPerson}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                  placeholder="0.00"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max persone
              </label>
              <input
                type="number"
                name="maxPeople"
                value={formData.maxPeople}
                onChange={handleChange}
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                placeholder="Numero massimo di partecipanti"
              />
            </div>
          </div>
        </div>
        
        {/* Sezione Dettagli Aggiuntivi */}
        <div className="mb-8">
          <h3 className="text-lg font-medium text-gray-800 mb-4 pb-2 border-b">Dettagli Aggiuntivi</h3>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Certificazioni <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="certifications"
                value={formData.certifications}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                placeholder="Certificazioni rilasciate"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Normativa
              </label>
              <input
                type="text"
                name="regulation"
                value={formData.regulation}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                placeholder="Riferimenti normativi"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descrizione
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                placeholder="Inserisci una descrizione del corso"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contenuti
              </label>
              <textarea
                name="contents"
                value={formData.contents}
                onChange={handleChange}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                placeholder="Dettaglio dei contenuti del corso"
              />
            </div>
          </div>
        </div>
        
        {/* Sezione pulsanti di azione */}
        <div className="flex justify-end pt-4 space-x-4 border-t mt-8">
          <Button
            variant="outline"
            shape="pill"
            onClick={onCancel}
            disabled={isSubmitting}
            leftIcon={<X className="h-4 w-4" />}
          >
            {cancelLabel}
          </Button>
          
          <Button
            variant="primary"
            shape="pill"
            type="submit"
            disabled={isSubmitting}
            leftIcon={<Save className="h-4 w-4" />}
          >
            {isSubmitting ? 'Salvataggio...' : submitLabel}
          </Button>
        </div>
      </form>
    </div>
  );
};