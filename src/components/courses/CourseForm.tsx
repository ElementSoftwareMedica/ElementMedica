import React, { useState, useMemo } from 'react';
import type { Course } from '../../types/courses';
import { useToast } from '../../hooks/useToast';
import { createCourse, updateCourse } from '../../services/courses';
import { isRLSCourse, getRiskLevelOptions } from '../../utils/courseLabels';
import { useTenantMode } from '../../contexts/TenantModeContext';
import {
  Award,
  BookOpen,
  Calendar,
  Clock,
  Euro,
  FileText,
  Globe,
  Hash,
  Image,
  Search,
  Users
} from 'lucide-react';
import EntityFormLayout from '../shared/form/EntityFormLayout';
import EntityFormField from '../shared/form/EntityFormField';
import EntityFormGrid, { EntityFormSection, EntityFormFullWidthField } from '../shared/form/EntityFormGrid';

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
  const { getOperateHeaders } = useTenantMode();
  const operateHeaders = getOperateHeaders();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: course?.title || '',
    description: course?.description || '',
    duration: course?.duration?.toString() || '',
    validityYears: course?.validityYears?.toString() || '',
    practicalHours: course?.practicalHours || 0,
    pricePerPerson: course?.pricePerPerson?.toString() || '',
    certifications: course?.certifications || '',
    maxPeople: course?.maxPeople?.toString() || '',
    regulation: course?.regulation || '',
    contents: course?.contents || '',
    code: course?.code || '',
    category: course?.category || '',
    status: course?.status || 'DRAFT',
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
        // duration come stringa normalizzata (coerente con backend)
        duration: formData.duration && formData.duration.trim() !== '' ? formData.duration.trim() : undefined,
        validityYears: formData.validityYears ? Number(formData.validityYears) : undefined,
        pricePerPerson: formData.pricePerPerson ? Number(formData.pricePerPerson) : undefined,
        maxPeople: formData.maxPeople ? Number(formData.maxPeople) : undefined,
        riskLevel: formData.riskLevel && formData.riskLevel !== '' ? formData.riskLevel as Course['riskLevel'] : undefined,
        courseType: formData.courseType && formData.courseType !== '' ? formData.courseType as Course['courseType'] : undefined,
        // Normalizza identificativi opzionali
        code: formData.code && formData.code.trim() !== '' ? formData.code.trim() : undefined,
        slug: formData.slug && formData.slug.trim() !== '' ? formData.slug.trim() : undefined,
      };

      if (course) {
        // Update existing course
        await updateCourse(course.id, payload, { headers: operateHeaders });
        showToast({
          message: 'Corso aggiornato con successo',
          type: 'success'
        });
      } else {
        // Create new course
        await createCourse(payload, { headers: operateHeaders });
        showToast({
          message: 'Corso creato con successo',
          type: 'success'
        });
      }
      onSubmit(payload);
    } catch (error) {
      showToast({
        message: `Errore: ${'Errore nel salvataggio del corso'}`,
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

  // Gestisce submit dal EntityFormLayout
  const handleFormSubmit = () => {
    // Crea un evento fake per il form submit
    const fakeEvent = { preventDefault: () => { } } as React.FormEvent;
    handleSubmit(fakeEvent);
  };

  // Options per i select
  const statusOptions = [
    { value: 'DRAFT', label: 'Bozza' },
    { value: 'ACTIVE', label: 'Attivo' },
    { value: 'PUBLISHED', label: 'Pubblicato' },
    { value: 'SUSPENDED', label: 'Sospeso' },
    { value: 'CANCELLED', label: 'Annullato' },
    { value: 'COMPLETED', label: 'Completato' }
  ];

  // Ottieni opzioni dinamiche per livello di rischio basate sul titolo del corso
  const isRLS = isRLSCourse(formData.title);
  const riskLevelOptions = useMemo(() => {
    const options = getRiskLevelOptions(formData.title);
    return [
      { value: '', label: 'Seleziona livello' },
      ...options
    ];
  }, [formData.title, isRLS]);

  const courseTypeOptions = [
    { value: '', label: 'Seleziona tipo' },
    { value: 'PRIMO_CORSO', label: 'Primo Corso' },
    { value: 'AGGIORNAMENTO', label: 'Aggiornamento' }
  ];

  return (
    <EntityFormLayout
      title={course ? 'Modifica Corso' : 'Nuovo Corso'}
      subtitle={course ? `Modifica i dati del corso ${course.title}` : 'Inserisci i dati del nuovo corso'}
      onSubmit={handleFormSubmit}
      onClose={onCancel}
      isSaving={isSubmitting}
      submitLabel={submitLabel}
      cancelLabel={cancelLabel}
    >
      {/* Sezione Informazioni Base */}
      <EntityFormSection title="Informazioni Base" description="Dati principali del corso">
        <EntityFormGrid>
          <EntityFormField
            label="Titolo Corso"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            placeholder="Inserisci il titolo del corso"
            leftIcon={<BookOpen className="h-5 w-5 text-gray-400" />}
          />

          <EntityFormField
            label="Codice"
            name="code"
            value={formData.code}
            onChange={handleChange}
            required
            placeholder="Inserisci il codice del corso"
            leftIcon={<Hash className="h-5 w-5 text-gray-400" />}
          />

          <EntityFormField
            label="Categoria"
            name="category"
            value={formData.category}
            onChange={handleChange}
            placeholder="Categoria del corso"
            leftIcon={<FileText className="h-5 w-5 text-gray-400" />}
          />

          <EntityFormField
            label="Stato"
            name="status"
            type="select"
            value={formData.status}
            onChange={handleChange}
            options={statusOptions}
          />
        </EntityFormGrid>
      </EntityFormSection>

      {/* Sezione Durata e Validità */}
      <EntityFormSection title="Durata e Validità" description="Informazioni su durata e validità del corso">
        <EntityFormGrid>
          <EntityFormField
            label="Durata corso (ore)"
            name="duration"
            type="number"
            value={formData.duration}
            onChange={handleChange}
            required
            placeholder="Es: 8"
            leftIcon={<Clock className="h-5 w-5 text-gray-400" />}
          />

          <EntityFormField
            label="Anni validità"
            name="validityYears"
            type="number"
            value={formData.validityYears}
            onChange={handleChange}
            placeholder="Es: 5"
            leftIcon={<Calendar className="h-5 w-5 text-gray-400" />}
          />

          <EntityFormField
            label="Ore formazione pratica"
            name="practicalHours"
            type="number"
            value={formData.practicalHours}
            onChange={handleChange}
            placeholder="Es: 4"
            leftIcon={<Clock className="h-5 w-5 text-gray-400" />}
          />
        </EntityFormGrid>
      </EntityFormSection>

      {/* Sezione Limiti e Costi */}
      <EntityFormSection title="Limiti e Costi" description="Informazioni su prezzi e limiti partecipanti">
        <EntityFormGrid>
          <EntityFormField
            label="Prezzo per persona (€)"
            name="pricePerPerson"
            type="number"
            value={formData.pricePerPerson}
            onChange={handleChange}
            placeholder="0.00"
            leftIcon={<Euro className="h-5 w-5 text-gray-400" />}
          />

          <EntityFormField
            label="Max partecipanti"
            name="maxPeople"
            type="number"
            value={formData.maxPeople}
            onChange={handleChange}
            placeholder="Numero massimo"
            leftIcon={<Users className="h-5 w-5 text-gray-400" />}
          />
        </EntityFormGrid>
      </EntityFormSection>

      {/* Sezione Frontend Pubblico */}
      <EntityFormSection title="Frontend Pubblico" description="Configurazione per la visualizzazione pubblica">
        <EntityFormGrid>
          <EntityFormField
            label="Sottocategoria"
            name="subcategory"
            value={formData.subcategory}
            onChange={handleChange}
            placeholder="Es: Sicurezza generale"
          />

          <EntityFormField
            label="Livello di Rischio"
            name="riskLevel"
            type="select"
            value={formData.riskLevel}
            onChange={handleChange}
            options={riskLevelOptions}
          />

          <EntityFormField
            label="Tipo Corso"
            name="courseType"
            type="select"
            value={formData.courseType}
            onChange={handleChange}
            options={courseTypeOptions}
          />

          <EntityFormField
            label="Visibile pubblicamente"
            name="isPublic"
            type="checkbox"
            value={formData.isPublic}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              isPublic: (e.target as HTMLInputElement).checked
            }))}
          />
        </EntityFormGrid>

        <EntityFormFullWidthField>
          <EntityFormField
            label="Descrizione Breve"
            name="shortDescription"
            value={formData.shortDescription}
            onChange={handleChange}
            multiline
            rows={2}
            placeholder="Breve descrizione per le card dei corsi"
          />
        </EntityFormFullWidthField>

        <EntityFormFullWidthField>
          <EntityFormField
            label="Descrizione Completa"
            name="fullDescription"
            value={formData.fullDescription}
            onChange={handleChange}
            multiline
            rows={4}
            placeholder="Descrizione dettagliata per la pagina del corso"
          />
        </EntityFormFullWidthField>

        <EntityFormGrid>
          <EntityFormField
            label="URL Immagine 1"
            name="image1Url"
            value={formData.image1Url}
            onChange={handleChange}
            placeholder="https://esempio.com/immagine1.jpg"
            leftIcon={<Image className="h-5 w-5 text-gray-400" />}
          />

          <EntityFormField
            label="URL Immagine 2"
            name="image2Url"
            value={formData.image2Url}
            onChange={handleChange}
            placeholder="https://esempio.com/immagine2.jpg"
            leftIcon={<Image className="h-5 w-5 text-gray-400" />}
          />

          <EntityFormField
            label="Titolo SEO"
            name="seoTitle"
            value={formData.seoTitle}
            onChange={handleChange}
            placeholder="Titolo ottimizzato per SEO"
            leftIcon={<Search className="h-5 w-5 text-gray-400" />}
          />

          <EntityFormField
            label="Slug URL"
            name="slug"
            value={formData.slug}
            onChange={handleChange}
            placeholder="corso-sicurezza-rischio-medio"
            leftIcon={<Globe className="h-5 w-5 text-gray-400" />}
          />
        </EntityFormGrid>

        <EntityFormFullWidthField>
          <EntityFormField
            label="Descrizione SEO"
            name="seoDescription"
            value={formData.seoDescription}
            onChange={handleChange}
            multiline
            rows={2}
            placeholder="Descrizione per i motori di ricerca (max 160 caratteri)"
            helpText="Massimo 160 caratteri per una visualizzazione ottimale nei risultati di ricerca"
          />
        </EntityFormFullWidthField>
      </EntityFormSection>

      {/* Sezione Dettagli Aggiuntivi */}
      <EntityFormSection title="Dettagli Aggiuntivi" description="Certificazioni, normativa e contenuti">
        <EntityFormGrid>
          <EntityFormField
            label="Certificazioni"
            name="certifications"
            value={formData.certifications}
            onChange={handleChange}
            required
            placeholder="Certificazioni rilasciate"
            leftIcon={<Award className="h-5 w-5 text-gray-400" />}
          />

          <EntityFormField
            label="Normativa"
            name="regulation"
            value={formData.regulation}
            onChange={handleChange}
            placeholder="Riferimenti normativi"
            leftIcon={<FileText className="h-5 w-5 text-gray-400" />}
          />
        </EntityFormGrid>

        <EntityFormFullWidthField>
          <EntityFormField
            label="Descrizione"
            name="description"
            value={formData.description}
            onChange={handleChange}
            multiline
            rows={3}
            placeholder="Inserisci una descrizione del corso"
          />
        </EntityFormFullWidthField>

        <EntityFormFullWidthField>
          <EntityFormField
            label="Contenuti"
            name="contents"
            value={formData.contents}
            onChange={handleChange}
            multiline
            rows={4}
            placeholder="Dettaglio dei contenuti del corso"
          />
        </EntityFormFullWidthField>
      </EntityFormSection>
    </EntityFormLayout>
  );
};