import React, { useState } from 'react';
import { GDPREntityTemplate } from '../../templates/gdpr-entity-page/GDPREntityTemplate';
import { DataTableColumn } from '../../templates/gdpr-entity-page/GDPREntityTemplate';
import { Badge } from '../../design-system';
import {
  Award,
  BookOpen,
  Calendar,
  Clock,
  Euro,
  FileText,
  Hash,
  Users
} from 'lucide-react';
import type { Course } from '../../types/courses';
import CourseImport from '../../components/courses/CourseImport';
import { apiPost, apiGet } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { getRiskLevelLabel } from '../../utils/courseLabels';
import { useTenantMode } from '../../contexts/TenantModeContext';
import { useAuth } from '../../context/AuthContext';
// Configurazione colonne per la tabella
const getCoursesColumns = (hidePrice = false): DataTableColumn<Course>[] => [
  {
    key: 'title',
    label: 'Titolo',
    sortable: true,
    renderCell: (course: Course) => (
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
    key: 'category',
    label: 'Categoria',
    sortable: true,
    renderCell: (course: Course) => (
      <Badge variant="secondary" size="sm" className="whitespace-normal leading-tight text-center max-w-[120px] block">
        {course.category}
      </Badge>
    )
  },
  {
    key: 'riskLevel',
    label: 'Tipo / Rischio',
    sortable: true,
    renderCell: (course: Course) => {
      const level = course.riskLevel;
      const riskVariant = level === 'BASSO' ? 'success' : level === 'MEDIO' ? 'warning' : level === 'ALTO' || (level as string) === 'MOLTO_ALTO' ? 'error' : 'outline';
      const isAggiornamento = course.courseType === 'AGGIORNAMENTO';
      const isPrimo = course.courseType === 'PRIMO_CORSO';
      return (
        <div className="flex flex-col gap-1">
          <Badge
            variant={isPrimo ? 'info' : isAggiornamento ? 'secondary' : 'outline'}
            size="sm"
            className={isAggiornamento ? 'bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300' : undefined}
          >
            {isPrimo ? 'Primo Corso' : isAggiornamento ? 'Aggiornamento' : 'N/D'}
          </Badge>
          <Badge variant={riskVariant} size="sm">
            {level ? getRiskLevelLabel(level, course.title) : 'N/D'}
          </Badge>
        </div>
      );
    }
  },
  {
    key: 'duration',
    label: 'Durata',
    sortable: true,
    renderCell: (course: Course) => (
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
    renderCell: (course: Course) => (
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-gray-400" />
        <span>{course.validityYears} anni</span>
      </div>
    )
  },
  {
    key: 'pricePerPerson',
    label: 'Prezzo',
    sortable: true,
    renderCell: (course: Course) => (
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
    renderCell: (course: Course) => (
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
    renderCell: (course: Course) => (
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
    renderCell: (course: Course) => (
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
    renderCell: (course: Course) => (
      <span className="text-sm text-gray-600 truncate max-w-xs block" title={course.description}>
        {course.description}
      </span>
    )
  }
].filter(col => !(hidePrice && col.key === 'pricePerPerson'));

// Configurazione card per la vista griglia
const getCourseCardConfig = (hidePrice = false) => ({
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
    const status = course.status || 'Draft';
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.Draft;
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
    ...(!hidePrice ? [{
      label: 'Prezzo',
      value: (course: Course) => `€${course.pricePerPerson || 0}`,
      icon: <Euro className="h-4 w-4" />
    }] : []),
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
    riskLevel: 'BASSO',
    courseType: 'PRIMO_CORSO',
    duration: 8,
    validityYears: 5,
    renewalDuration: '4',
    pricePerPerson: 150.0,
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
  { key: 'riskLevel', label: 'Livello Rischio' },
  { key: 'courseType', label: 'Tipo Corso' },
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
  // P51: refreshTrigger per forzare il refresh della lista dopo import
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { showToast } = useToast();
  // P51: Usa operateTenantId per operazioni CRUD multi-tenant
  const { getCreateTenantId, getOperateHeaders } = useTenantMode();
  const { user } = useAuth();

  // Il TRAINER non deve vedere il prezzo
  const isTrainerOnly =
    user?.roleType === 'TRAINER' &&
    !['ADMIN', 'TRAINING_ADMIN', 'HR_MANAGER', 'COMPANY_MANAGER', 'SITE_MANAGER'].some(r =>
      user?.roles?.includes(r)
    );

  // Carica i corsi esistenti per supportare la rilevazione duplicati nel modal di import
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await apiGet<Course[]>('/api/v1/courses');
        if (mounted && Array.isArray(res)) {
          setCourses(res);
        }
      } catch (e) {
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Funzione per gestire l'import dei corsi
  const handleImportEntities = async (data: any[]) => {
    // Questa funzione viene chiamata dal template quando c'è onImportEntities
    // Ma noi vogliamo aprire il modal invece, quindi apriamo il modal
    setShowImportModal(true);
    return Promise.resolve();
  };

  const handleImportCourses = async (importedCourses: any[], overwriteIds?: string[]) => {
    try {
      // P51: Usa getCreateTenantId per ottenere il tenant corretto per le operazioni CRUD
      const tenantId = getCreateTenantId();
      const headers = getOperateHeaders();

      // Includi tenantId su ogni riga per compat con prisma.createMany che richiede tenantId nel data
      const payloadCourses = (importedCourses || []).map((c) => ({
        ...c,
        ...(tenantId ? { tenantId } : {}),
      }));

      // Invia i dati al backend con headers multi-tenant
      const response: any = await apiPost('/api/v1/courses/bulk-import', {
        tenantId, // anche top-level per massima compatibilità
        courses: payloadCourses,
        overwriteIds: overwriteIds || []
      }, { headers });

      // Mostra riepilogo con eventuali duplicati
      const totalSubmitted = response?.totalSubmitted ?? payloadCourses.length;
      const validCourses = response?.validCourses ?? undefined;
      const created = response?.created ?? undefined;
      const skipped = response?.skipped ?? undefined;
      const report = response?.report || response?.precheckReport || {};
      const inPayload = Array.isArray(report?.duplicates?.inPayload) ? report.duplicates.inPayload : [];
      const inDatabase = Array.isArray(report?.duplicates?.inDatabase) ? report.duplicates.inDatabase : [];
      const codesPayload = inPayload.map((d: any) => d.code).filter(Boolean);
      const codesDb = inDatabase.map((d: any) => d.code).filter(Boolean);

      const hasDuplicates = (codesPayload.length + codesDb.length) > 0;
      const codesPayloadPreview = codesPayload.slice(0, 3).join(', ');
      const codesDbPreview = codesDb.slice(0, 3).join(', ');

      const baseMsgParts: string[] = [];
      baseMsgParts.push(`Inviati: ${totalSubmitted}`);
      if (validCourses !== undefined) baseMsgParts.push(`Validi: ${validCourses}`);
      if (created !== undefined) baseMsgParts.push(`Creati: ${created}`);
      if (skipped !== undefined) baseMsgParts.push(`Saltati: ${skipped}`);

      let message = `Import completato. ${baseMsgParts.join(' · ')}`;
      if (hasDuplicates) {
        const dupParts: string[] = [];
        if (codesPayload.length) dupParts.push(`Duplicati nel file (${codesPayload.length}): ${codesPayloadPreview}${codesPayload.length > 3 ? '…' : ''}`);
        if (codesDb.length) dupParts.push(`Duplicati a DB (${codesDb.length}): ${codesDbPreview}${codesDb.length > 3 ? '…' : ''}`);
        message += ` — ${dupParts.join(' | ')}`;
      }

      showToast({
        message,
        type: hasDuplicates ? 'info' : 'success'
      });

      // Chiudi il modal e forza refresh della lista
      setShowImportModal(false);
      // P51: Incrementa refreshTrigger per forzare il refresh del GDPREntityTemplate
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
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
        columns={getCoursesColumns(isTrainerOnly)}
        searchFields={['title', 'code', 'category', 'description', 'certifications', 'regulation', 'contents']}
        defaultSort={{ field: 'title', direction: 'asc' }}
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
            key: 'riskLevel',
            label: 'Livello Rischio',
            options: [
              { value: 'ALTO', label: 'Alto' },
              { value: 'MEDIO', label: 'Medio' },
              { value: 'BASSO', label: 'Basso' },
              { value: 'A', label: 'A' },
              { value: 'B', label: 'B' },
              { value: 'C', label: 'C' }
            ]
          },
          {
            key: 'courseType',
            label: 'Tipo Corso',
            options: [
              { value: 'PRIMO_CORSO', label: 'Primo Corso' },
              { value: 'AGGIORNAMENTO', label: 'Aggiornamento' }
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
        ].filter(f => !(isTrainerOnly && f.key === 'price_range'))}
        sortOptions={[
          { key: 'title', label: 'Titolo' },
          { key: 'code', label: 'Codice' },
          { key: 'category', label: 'Categoria' },
          { key: 'duration', label: 'Durata' },
          ...(!isTrainerOnly ? [{ key: 'pricePerPerson', label: 'Prezzo' }] : []),
          { key: 'validityYears', label: 'Validità' },
          { key: 'maxPeople', label: 'Max partecipanti' },
          { key: 'createdAt', label: 'Data creazione' }
        ]}
        csvHeaders={csvHeaders.filter(h => !(isTrainerOnly && h.key === 'pricePerPerson'))}
        csvTemplateData={csvTemplateData}
        cardConfig={getCourseCardConfig(isTrainerOnly)}
        enableBatchOperations={true}
        enableImportExport={true}
        enableColumnSelector={true}
        enableAdvancedFilters={true}
        defaultViewMode="table"
        onImportEntities={handleImportEntities}
        refreshTrigger={refreshTrigger}
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