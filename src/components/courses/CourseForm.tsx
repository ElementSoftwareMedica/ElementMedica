import React, { useState } from 'react';
import type { Course } from '../../types/courses';
import { useToast } from '../../hooks/useToast';
import { createCourse, updateCourse } from '../../services/courses';
import { Save, X } from 'lucide-react';
import { Button } from '../../design-system/atoms/Button';

type CourseFormData = Omit<Course, 'id' | 'createdAt' | 'updatedAt'> & {
  riskLevel?: string;
  courseType?: string;
};

interface CourseFormProps {
  course?: Course;
  onSubmit: (formData: CourseFormData) => void;
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
    // Nuovi campi per frontend pubblico
    subcategory: course?.subcategory || '',
    riskLevel: course?.riskLevel || '',
    courseType: course?.courseType || '',
    shortDescription: course?.shortDescription || '',
    fullDescription: course?.fullDescription || '',
    image1Url: course?.image1Url || '',
    image2Url: course?.image2Url || '',
    isPublic: course?.isPublic || false,
    seoTitle: course?.seoTitle || '',
    seoDescription: course?.seoDescription || '',
    slug: course?.slug || '',
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
        riskLevel: formData.riskLevel && formData.riskLevel !== '' ? formData.riskLevel as Course['riskLevel'] : undefined,
        courseType: formData.courseType && formData.courseType !== '' ? formData.courseType as Course['courseType'] : undefined,
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
      <div className="bg-gradient-to-r from-gray-700 to-gray-800 px-6 py-4">
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
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
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
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
        
        {/* Sezione Frontend Pubblico */}
        <div className="mb-8">
          <h3 className="text-lg font-medium text-gray-800 mb-4 pb-2 border-b">Frontend Pubblico</h3>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sottocategoria
                </label>
                <input
                  type="text"
                  name="subcategory"
                  value={formData.subcategory}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                  placeholder="Es: Sicurezza generale"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Livello di Rischio
                </label>
                <select
                  name="riskLevel"
                  value={formData.riskLevel}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                >
                  <option value="">Seleziona livello</option>
                  <option value="ALTO">Alto</option>
                  <option value="MEDIO">Medio</option>
                  <option value="BASSO">Basso</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo Corso
                </label>
                <select
                  name="courseType"
                  value={formData.courseType}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                >
                  <option value="">Seleziona tipo</option>
                  <option value="PRIMO_CORSO">Primo Corso</option>
                  <option value="AGGIORNAMENTO">Aggiornamento</option>
                </select>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="isPublic"
                  checked={formData.isPublic}
                  onChange={(e) => setFormData(prev => ({ ...prev, isPublic: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm font-medium text-gray-700">
                  Visibile nel frontend pubblico
                </label>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descrizione Breve
              </label>
              <textarea
                name="shortDescription"
                value={formData.shortDescription}
                onChange={handleChange}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                placeholder="Breve descrizione per le card dei corsi"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descrizione Completa
              </label>
              <textarea
                name="fullDescription"
                value={formData.fullDescription}
                onChange={handleChange}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                placeholder="Descrizione dettagliata per la pagina del corso"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL Immagine 1
                </label>
                <input
                  type="url"
                  name="image1Url"
                  value={formData.image1Url}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                  placeholder="https://esempio.com/immagine1.jpg"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL Immagine 2
                </label>
                <input
                  type="url"
                  name="image2Url"
                  value={formData.image2Url}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                  placeholder="https://esempio.com/immagine2.jpg"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Titolo SEO
                </label>
                <input
                  type="text"
                  name="seoTitle"
                  value={formData.seoTitle}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                  placeholder="Titolo ottimizzato per SEO"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Slug URL
                </label>
                <input
                  type="text"
                  name="slug"
                  value={formData.slug}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                  placeholder="corso-sicurezza-rischio-medio"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descrizione SEO
              </label>
              <textarea
                name="seoDescription"
                value={formData.seoDescription}
                onChange={handleChange}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                placeholder="Descrizione per i motori di ricerca (max 160 caratteri)"
                maxLength={160}
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
            onClick={onCancel}
            disabled={isSubmitting}
            leftIcon={<X className="h-4 w-4" />}
          >
            {cancelLabel}
          </Button>
          
          <Button
            variant="primary"
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