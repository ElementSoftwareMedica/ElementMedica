import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '../../../design-system';
import { BookOpen, Clock, Users, DollarSign, Calendar } from 'lucide-react';
import { GDPREntityTemplate } from '../GDPREntityTemplate';
import { coursesConfig, createStandardColumns } from '../GDPREntityConfig';
import { Course } from '../../../types';
import { DataTableColumn } from '../../../components/shared/tables/DataTable';

/**
 * Esempio di implementazione del template GDPR per la gestione dei corsi
 * Dimostra l'integrazione dei componenti UI specifici dalla pagina courses
 */

export const CoursesPageExample: React.FC = () => {
  const navigate = useNavigate();
  
  // Definizione colonne personalizzate per i corsi
  const columns: DataTableColumn<Course>[] = [
    {
      key: 'title',
      label: 'Titolo Corso',
      sortable: true,
      width: 300,
      renderCell: (course: Course) => (
        <div className="font-medium">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-blue-500" />
            {course.title}
          </div>
          {course.code && (
            <div className="text-xs text-gray-500 mt-1">
              Codice: {course.code}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'category',
      label: 'Categoria',
      sortable: true,
      width: 150,
      renderCell: (course: Course) => (
        <Badge variant="outline">
          {course.category || 'Generale'}
        </Badge>
      )
    },
    {
      key: 'duration',
      label: 'Durata',
      sortable: true,
      width: 120,
      renderCell: (course: Course) => (
        <div className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5 text-gray-400" />
          <span>{course.duration || 0}h</span>
        </div>
      )
    },
    {
      key: 'max_participants',
      label: 'Partecipanti',
      sortable: true,
      width: 120,
      renderCell: (course: Course) => (
        <div className="flex items-center gap-1">
          <Users className="h-3.5 w-3.5 text-gray-400" />
          <span>{course.enrolled_count || 0}/{course.max_participants || '∞'}</span>
        </div>
      )
    },
    {
      key: 'price',
      label: 'Prezzo',
      sortable: true,
      width: 120,
      renderCell: (course: Course) => (
        <div className="flex items-center gap-1">
          <DollarSign className="h-3.5 w-3.5 text-green-500" />
          <span>€{course.price || 0}</span>
        </div>
      )
    },
    {
      key: 'start_date',
      label: 'Data Inizio',
      sortable: true,
      width: 120,
      renderCell: (course: Course) => (
        <div className="flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5 text-gray-400" />
          <span>
            {course.start_date 
              ? new Date(course.start_date).toLocaleDateString('it-IT')
              : 'Da definire'
            }
          </span>
        </div>
      )
    },
    {
      key: 'status',
      label: 'Stato',
      sortable: true,
      width: 120,
      renderCell: (course: Course) => {
        const getStatusVariant = (status: string) => {
          switch (status) {
            case 'active': return 'default';
            case 'draft': return 'secondary';
            case 'completed': return 'outline';
            case 'cancelled': return 'destructive';
            default: return 'secondary';
          }
        };
        
        return (
          <Badge variant={getStatusVariant(course.status || 'draft')}>
            {course.status || 'Bozza'}
          </Badge>
        );
      }
    },
    {
      key: 'instructor',
      label: 'Istruttore',
      sortable: true,
      width: 150,
      renderCell: (course: Course) => course.instructor || '-'
    }
  ];
  
  // Handler personalizzati per i corsi
  const handleCreateCourse = () => {
    navigate('/courses/create');
  };
  
  const handleEditCourse = (course: Course) => {
    navigate(`/courses/${course.id}/edit`);
  };
  
  const handleDeleteCourse = async (id: string) => {
    // Implementazione personalizzata per eliminazione corso
    console.log('Eliminazione corso personalizzata:', id);
    
    // Logica specifica per corsi (es. controllo iscrizioni attive)
    // const hasActiveEnrollments = await checkActiveEnrollments(id);
    // if (hasActiveEnrollments) {
    //   throw new Error('Impossibile eliminare un corso con iscrizioni attive');
    // }
  };
  
  const handleImportCourses = async (data: any[]) => {
    // Implementazione personalizzata per import corsi
    console.log('Import corsi personalizzato:', data);
    
    // Validazioni specifiche per corsi
    const validatedData = data.map(item => ({
      ...item,
      // Validazioni specifiche
      duration: parseInt(item.duration) || 0,
      price: parseFloat(item.price) || 0,
      max_participants: parseInt(item.max_participants) || null,
      start_date: item.start_date ? new Date(item.start_date).toISOString() : null,
      status: item.status || 'draft'
    }));
    
    // Chiamata API per import
    // await importCourses(validatedData);
  };
  
  const handleExportCourses = (courses: Course[]) => {
    // Implementazione personalizzata per export corsi
    console.log('Export corsi personalizzato:', courses);
    
    // Formattazione dati per export
    const formattedData = courses.map(course => ({
      ...course,
      duration_formatted: `${course.duration || 0} ore`,
      price_formatted: `€${course.price || 0}`,
      participants_info: `${course.enrolled_count || 0}/${course.max_participants || '∞'}`,
      start_date_formatted: course.start_date 
        ? new Date(course.start_date).toLocaleDateString('it-IT')
        : 'Da definire'
    }));
    
    // Esportazione con dati formattati
    // exportToCsv(formattedData, customHeaders, 'corsi_export.csv');
  };
  
  const handleBatchAction = async (action: string, selectedIds: string[]) => {
    // Azioni batch personalizzate per corsi
    switch (action) {
      case 'activate':
        console.log('Attivazione corsi:', selectedIds);
        // await batchActivateCourses(selectedIds);
        break;
      case 'deactivate':
        console.log('Disattivazione corsi:', selectedIds);
        // await batchDeactivateCourses(selectedIds);
        break;
      case 'duplicate':
        console.log('Duplicazione corsi:', selectedIds);
        // await batchDuplicateCourses(selectedIds);
        break;
      default:
        console.log('Azione batch non riconosciuta:', action);
    }
  };
  
  return (
    <GDPREntityTemplate<Course>
      // Configurazione base da config
      {...coursesConfig}
      
      // Colonne personalizzate
      columns={columns}
      
      // Handler personalizzati
      onCreateEntity={handleCreateCourse}
      onEditEntity={handleEditCourse}
      onDeleteEntity={handleDeleteCourse}
      onImportEntities={handleImportCourses}
      onExportEntities={handleExportCourses}
      onBatchAction={handleBatchAction}
      
      // Configurazioni specifiche per corsi
      filterOptions={[
        {
          label: 'Stato',
          value: 'status',
          options: [
            { label: 'Attivo', value: 'active' },
            { label: 'Bozza', value: 'draft' },
            { label: 'Completato', value: 'completed' },
            { label: 'Annullato', value: 'cancelled' }
          ]
        },
        {
          label: 'Categoria',
          value: 'category',
          options: [
            { label: 'Informatica', value: 'informatica' },
            { label: 'Lingue', value: 'lingue' },
            { label: 'Management', value: 'management' },
            { label: 'Sicurezza', value: 'sicurezza' },
            { label: 'Soft Skills', value: 'soft-skills' }
          ]
        },
        {
          label: 'Durata',
          value: 'duration',
          options: [
            { label: 'Fino a 8 ore', value: '0-8' },
            { label: '8-16 ore', value: '8-16' },
            { label: '16-40 ore', value: '16-40' },
            { label: 'Oltre 40 ore', value: '40+' }
          ]
        },
        {
          label: 'Prezzo',
          value: 'price',
          options: [
            { label: 'Gratuito', value: '0' },
            { label: 'Fino a €100', value: '0-100' },
            { label: '€100-500', value: '100-500' },
            { label: 'Oltre €500', value: '500+' }
          ]
        }
      ]}
      
      sortOptions={[
        { label: 'Titolo (A-Z)', value: 'title-asc' },
        { label: 'Titolo (Z-A)', value: 'title-desc' },
        { label: 'Data inizio (recente)', value: 'start_date-desc' },
        { label: 'Data inizio (meno recente)', value: 'start_date-asc' },
        { label: 'Prezzo (crescente)', value: 'price-asc' },
        { label: 'Prezzo (decrescente)', value: 'price-desc' },
        { label: 'Durata (crescente)', value: 'duration-asc' },
        { label: 'Durata (decrescente)', value: 'duration-desc' },
        { label: 'Partecipanti (crescente)', value: 'enrolled_count-asc' },
        { label: 'Partecipanti (decrescente)', value: 'enrolled_count-desc' }
      ]}
      
      // Configurazione card per vista griglia (specifica per corsi)
      cardConfig={{
        titleField: 'title',
        subtitleField: 'category',
        badgeField: 'status',
        descriptionField: 'description',
        additionalFields: [
          {
            key: 'duration',
            label: 'Durata',
            icon: <Clock className="h-3.5 w-3.5" />,
            formatter: (value) => `${value || 0}h`
          },
          {
            key: 'price',
            label: 'Prezzo',
            icon: <DollarSign className="h-3.5 w-3.5" />,
            formatter: (value) => `€${value || 0}`
          },
          {
            key: 'max_participants',
            label: 'Partecipanti',
            icon: <Users className="h-3.5 w-3.5" />,
            formatter: (value, item) => `${item.enrolled_count || 0}/${value || '∞'}`
          },
          {
            key: 'start_date',
            label: 'Inizio',
            icon: <Calendar className="h-3.5 w-3.5" />,
            formatter: (value) => value 
              ? new Date(value).toLocaleDateString('it-IT')
              : 'Da definire'
          },
          {
            key: 'instructor',
            label: 'Istruttore',
            icon: <BookOpen className="h-3.5 w-3.5" />
          }
        ]
      }}
      
      // Azioni batch personalizzate per corsi
      batchActions={[
        {
          label: 'Attiva corsi selezionati',
          value: 'activate',
          variant: 'default',
          requiresConfirmation: true,
          confirmationMessage: 'Sei sicuro di voler attivare i corsi selezionati?'
        },
        {
          label: 'Disattiva corsi selezionati',
          value: 'deactivate',
          variant: 'secondary',
          requiresConfirmation: true,
          confirmationMessage: 'Sei sicuro di voler disattivare i corsi selezionati?'
        },
        {
          label: 'Duplica corsi selezionati',
          value: 'duplicate',
          variant: 'outline',
          requiresConfirmation: false
        },
        {
          label: 'Elimina corsi selezionati',
          value: 'delete',
          variant: 'destructive',
          requiresConfirmation: true,
          confirmationMessage: 'Attenzione: questa azione eliminerà definitivamente i corsi selezionati. Continuare?'
        }
      ]}
      
      // Configurazioni UI specifiche per corsi
      enableBatchOperations={true}
      enableImportExport={true}
      enableColumnSelector={true}
      enableAdvancedFilters={true}
      defaultViewMode="grid" // I corsi si prestano bene alla vista griglia
      pageSize={12} // Numero più alto per la vista griglia
      
      // Configurazioni di ricerca avanzata
      searchPlaceholder="Cerca corsi per titolo, categoria, istruttore..."
      searchFields={['title', 'category', 'instructor', 'code', 'description']}
    />
  );
};

export default CoursesPageExample;

/**
 * Esempio di utilizzo con vista semplificata per dashboard
 */
export const CoursesPageDashboard: React.FC = () => {
  const simpleColumns = createStandardColumns<Course>([
    { 
      key: 'title', 
      label: 'Corso', 
      width: 250,
      formatter: (value, item) => (
        <div>
          <div className="font-medium">{value}</div>
          <div className="text-xs text-gray-500">{item.category}</div>
        </div>
      )
    },
    { 
      key: 'start_date', 
      label: 'Inizio', 
      width: 120,
      formatter: (value) => value 
        ? new Date(value).toLocaleDateString('it-IT')
        : 'Da definire'
    },
    { 
      key: 'enrolled_count', 
      label: 'Iscritti', 
      width: 100,
      formatter: (value, item) => `${value || 0}/${item.max_participants || '∞'}`
    },
    { 
      key: 'status', 
      label: 'Stato', 
      width: 100,
      formatter: (value) => (
        <Badge variant={value === 'active' ? 'default' : 'secondary'}>
          {value || 'Bozza'}
        </Badge>
      )
    }
  ]);
  
  return (
    <GDPREntityTemplate<Course>
      {...coursesConfig}
      columns={simpleColumns}
      enableBatchOperations={false}
      enableImportExport={false}
      enableColumnSelector={false}
      enableAdvancedFilters={false}
      defaultViewMode="table"
      pageSize={5}
    />
  );
};