import React, { useState } from 'react';
import { GDPREntityTemplate } from '../../templates/gdpr-entity-page/GDPREntityTemplate';
import { DataTableColumn } from '../../components/shared/tables/DataTable';
import { Badge } from '../../design-system';
import { BookOpen, Clock, Users, Euro, FileText, Award, Calendar, Building, Hash } from 'lucide-react';
import type { Course } from '../../types/courses';
import CourseImport from '../../components/courses/CourseImport';
import { apiPost } from '../../services/api';

// Configurazione colonne per la tabella
const getCoursesColumns = (): DataTableColumn<Course>[] => [
  {
    key: 'title',
    label: 'Titolo',
    sortable: true,
    renderCell: (course) => (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
          <BookOpen className="h-4 w-4 text-blue-600" />
        </div>
        <div>
          <div className="font-medium text-gray-900">{course.title}</div>
          <div className="text-sm text-gray-500">{course.code}</div>
        </div>
      </div>
    )
  },
  {
    key: 'code',
    label: 'Codice',
    sortable: true,
    renderCell: (course) => (
      <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">{course.code}</span>
    )
  },
  {
    key: 'category',
    label: 'Categoria',
    sortable: true,
    renderCell: (course) => (
      <div className="flex items-center gap-2">
        <Building className="h-4 w-4 text-gray-400" />
        <Badge variant="secondary">{course.category}</Badge>
      </div>
    )
  },
  {
    key: 'duration',
    label: 'Durata',
    sortable: true,
    renderCell: (course) => (
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-gray-400" />
        <span>{course.duration}h</span>
      </div>
    )
  },
  {
    key: 'validityYears',
    label: 'Validità',
    sortable: true,
    renderCell: (course) => (
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-gray-400" />
        <span>{course.validityYears} anni</span>
      </div>
    )
  },
  {
    key: 'renewalDuration',
    label: 'Rinnovo',
    sortable: true,
    renderCell: (course) => (
      <div className="flex items-center gap-2">
        <Award className="h-4 w-4 text-gray-400" />
        <span>{course.renewalDuration}h</span>
      </div>
    )
  },
  {
    key: 'pricePerPerson',
    label: 'Prezzo',
    sortable: true,
    renderCell: (course) => (
      <div className="flex items-center gap-2">
        <Euro className="h-4 w-4 text-gray-400" />
        <span className="font-medium">€{Number(course.pricePerPerson || 0).toFixed(2)}</span>
      </div>
    )
  },
  {
    key: 'maxPeople',
    label: 'Max persone',
    sortable: true,
    renderCell: (course) => (
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-gray-400" />
        <span>{course.maxPeople}</span>
      </div>
    )
  },
  {
    key: 'certifications',
    label: 'Certificazioni',
    sortable: false,
    renderCell: (course) => (
      <div className="flex items-center gap-2">
        <Award className="h-4 w-4 text-gray-400" />
        <span className="text-sm">{course.certifications || 'N/A'}</span>
      </div>
    )
  },
  {
    key: 'regulation',
    label: 'Normativa',
    sortable: false,
    renderCell: (course) => (
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-gray-400" />
        <span className="text-sm">{course.regulation || 'N/A'}</span>
      </div>
    )
  },
  {
    key: 'description',
    label: 'Descrizione',
    sortable: false,
    renderCell: (course) => (
      <span className="text-sm text-gray-600 truncate max-w-xs block" title={course.description}>
        {course.description}
      </span>
    )
  }
];

// Configurazione card per la vista griglia
const getCourseCardConfig = () => ({
  titleField: 'title' as keyof Course,
  subtitleField: 'category' as keyof Course,
  badgeField: 'status' as keyof Course,
  descriptionField: 'description' as keyof Course,
  // Configurazione dinamica per compatibilità
  title: (course: Course) => course.title,
  subtitle: (course: Course) => course.category || 'Categoria non specificata',
  badge: (course: Course) => {
    const statusConfig = {
      Active: { label: 'Attivo', variant: 'default' as const },
      Inactive: { label: 'Inattivo', variant: 'destructive' as const },
      Draft: { label: 'Bozza', variant: 'outline' as const }
    };
    const config = statusConfig[course.status];
    return { text: config.label, variant: config.variant };
  },
  icon: () => <BookOpen className="h-5 w-5" />,
  fields: [
    {
      label: 'Codice',
      value: (course: Course) => course.code || 'N/A',
      icon: <Hash className="h-4 w-4" />
    },
    {
      label: 'Durata',
      value: (course: Course) => `${course.duration || 0} ore`,
      icon: <Clock className="h-4 w-4" />
    },
    {
      label: 'Validità',
      value: (course: Course) => `${course.validityYears || 0} anni`,
      icon: <Calendar className="h-4 w-4" />
    },
    {
      label: 'Prezzo',
      value: (course: Course) => `€${course.pricePerPerson || 0}`,
      icon: <Euro className="h-4 w-4" />
    },
    {
      label: 'Max partecipanti',
      value: (course: Course) => (course.maxPeople || 0).toString(),
      icon: <Users className="h-4 w-4" />
    }
  ],
  description: (course: Course) => course.description
});

// Template CSV per l'import
const csvTemplateData: Partial<Course>[] = [
  {
    code: 'CORSO001',
    title: 'Esempio Corso di Sicurezza',
    category: 'Sicurezza',
    duration: 8,
    validityYears: 5,
    renewalDuration: '4',
    pricePerPerson: 150.00,
    maxPeople: 20,
    certifications: 'ISO 45001',
    regulation: 'D.Lgs. 81/08',
    description: 'Corso di formazione sulla sicurezza sul lavoro',
    contents: 'Contenuti del corso di esempio'
  }
];

// Headers CSV
const csvHeaders = [
  { key: 'title', label: 'Titolo' },
  { key: 'code', label: 'Codice' },
  { key: 'category', label: 'Categoria' },
  { key: 'duration', label: 'Durata (ore)' },
  { key: 'validityYears', label: 'Validità (anni)' },
  { key: 'renewalDuration', label: 'Durata rinnovo (ore)' },
  { key: 'pricePerPerson', label: 'Prezzo per persona' },
  { key: 'maxPeople', label: 'Max partecipanti' },
  { key: 'certifications', label: 'Certificazioni' },
  { key: 'regulation', label: 'Normativa' },
  { key: 'description', label: 'Descrizione' },
  { key: 'status', label: 'Stato' }
];

export default function CoursesPage(): JSX.Element {
  const [showImportModal, setShowImportModal] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);

  // Funzione per gestire l'import dei corsi
  const handleImportEntities = async (data: any[]) => {
    // Questa funzione viene chiamata dal template quando c'è onImportEntities
    // Ma noi vogliamo aprire il modal invece, quindi apriamo il modal
    setShowImportModal(true);
    return Promise.resolve();
  };

  const handleImportCourses = async (importedCourses: any[], overwriteIds?: string[]) => {
    try {
      // Invia i dati al backend
      const response = await apiPost('/api/v1/courses/import', {
        courses: importedCourses,
        overwriteIds: overwriteIds || []
      });
      
      // Aggiorna la lista locale (il template si ricaricherà automaticamente)
      console.log('Import completato:', response);
      
      // Chiudi il modal
      setShowImportModal(false);
    } catch (error) {
      console.error('Errore durante l\'import:', error);
      throw error; // Rilancia l'errore per permettere al modal di gestirlo
    }
  };

  return (
    <>
      <GDPREntityTemplate<Course>
        entityName="course"
        entityNamePlural="courses"
        entityDisplayName="Corso"
        entityDisplayNamePlural="Corsi"
        readPermission="courses:read"
        writePermission="courses:write"
        deletePermission="courses:delete"
        exportPermission="courses:export"
        apiEndpoint="/api/v1/courses"
        columns={getCoursesColumns()}
        searchFields={['title', 'code', 'category', 'description', 'certifications', 'regulation', 'contents']}
        filterOptions={[
          {
            key: 'category',
            label: 'Categoria',
            options: [
              { value: 'Sicurezza', label: 'Sicurezza' },
              { value: 'Qualità', label: 'Qualità' },
              { value: 'Ambiente', label: 'Ambiente' },
              { value: 'Privacy', label: 'Privacy' },
              { value: 'Formazione generale', label: 'Formazione generale' },
              { value: 'Tecnico', label: 'Tecnico' },
              { value: 'Gestionale', label: 'Gestionale' }
            ]
          },
          {
            key: 'duration_range',
            label: 'Durata',
            options: [
              { value: 'short', label: 'Breve (≤4h)' },
              { value: 'medium', label: 'Media (4-8h)' },
              { value: 'long', label: 'Lunga (>8h)' }
            ]
          },
          {
            key: 'price_range',
            label: 'Fascia prezzo',
            options: [
              { value: 'low', label: 'Economico (≤100€)' },
              { value: 'medium', label: 'Medio (101-300€)' },
              { value: 'high', label: 'Premium (>300€)' }
            ]
          }
        ]}
        sortOptions={[
          { key: 'title', label: 'Titolo' },
          { key: 'code', label: 'Codice' },
          { key: 'category', label: 'Categoria' },
          { key: 'duration', label: 'Durata' },
          { key: 'pricePerPerson', label: 'Prezzo' },
          { key: 'validityYears', label: 'Validità' },
          { key: 'maxPeople', label: 'Max partecipanti' },
          { key: 'createdAt', label: 'Data creazione' }
        ]}
        csvHeaders={csvHeaders}
        csvTemplateData={csvTemplateData}
        cardConfig={getCourseCardConfig()}
        enableBatchOperations={true}
        enableImportExport={true}
         enableColumnSelector={true}
         enableAdvancedFilters={true}
         defaultViewMode="table"
         onImportEntities={handleImportEntities}
      />
      
      {showImportModal && (
        <CourseImport
          onImport={handleImportCourses}
          onClose={() => setShowImportModal(false)}
          existingCourses={courses}
        />
      )}
    </>
  );
}

export { CoursesPage };