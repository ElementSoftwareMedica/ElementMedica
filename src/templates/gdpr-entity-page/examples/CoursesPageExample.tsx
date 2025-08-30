import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '../../../components/ui/badge';
import { 
  BookOpen,
  Calendar,
  Clock,
  DollarSign,
  Users
} from 'lucide-react';
import { GDPREntityTemplate } from '../GDPREntityTemplate';
import { coursesConfig, createStandardColumns } from '../GDPREntityConfig';
import { Course } from '../../../types/courses';
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
      key: 'maxPeople',
      label: 'Max Partecipanti',
      sortable: true,
      width: 120,
      renderCell: (course: Course) => (
        <div className="flex items-center gap-1">
          <Users className="h-3.5 w-3.5 text-gray-400" />
          <span>{course.maxPeople || '∞'}</span>
        </div>
      )
    },
    {
      key: 'pricePerPerson',
      label: 'Prezzo',
      sortable: true,
      width: 120,
      renderCell: (course: Course) => (
        <div className="flex items-center gap-1">
          <DollarSign className="h-3.5 w-3.5 text-green-500" />
          <span>€{course.pricePerPerson || 0}</span>
        </div>
      )
    },
    {
      key: 'createdAt',
      label: 'Data Creazione',
      sortable: true,
      width: 120,
      renderCell: (course: Course) => (
        <div className="flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5 text-gray-400" />
          <span>
            {course.createdAt 
              ? new Date(course.createdAt).toLocaleDateString('it-IT')
              : '-'
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
  };
  
  const handleImportCourses = async (data: any[]) => {
    // Implementazione personalizzata per import corsi
    console.log('Import corsi personalizzato:', data);
    
    // Validazioni specifiche per corsi
    const validatedData = data.map(item => ({
      ...item,
      duration: parseInt(item.duration) || 0,
      pricePerPerson: parseFloat(item.pricePerPerson) || 0,
      maxPeople: parseInt(item.maxPeople) || null,
      status: item.status || 'draft'
    }));
  };
  
  const handleExportCourses = (courses: Course[]) => {
    // Implementazione personalizzata per export corsi
    console.log('Export corsi personalizzato:', courses);
    
    // Formattazione dati per export
    const formattedData = courses.map(course => ({
      ...course,
      duration_formatted: `${course.duration || 0} ore`,
      price_formatted: `€${course.pricePerPerson || 0}`,
      max_people_info: course.maxPeople || 'Illimitato',
      created_date_formatted: course.createdAt 
        ? new Date(course.createdAt).toLocaleDateString('it-IT')
        : '-'
    }));
  };
  
  const handleBatchAction = async (action: string, selectedIds: string[]) => {
    // Azioni batch personalizzate per corsi
    switch (action) {
      case 'activate':
        console.log('Attivazione corsi:', selectedIds);
        break;
      case 'deactivate':
        console.log('Disattivazione corsi:', selectedIds);
        break;
      case 'duplicate':
        console.log('Duplicazione corsi:', selectedIds);
        break;
      default:
        console.log('Azione batch:', action, selectedIds);
    }
  };

  return (
    <div className="space-y-6">
      <GDPREntityTemplate<Course>
        entityName="course"
        entityNamePlural="courses"
        entityDisplayName="Corso"
        entityDisplayNamePlural="Corsi"
        
        // Permessi
        readPermission="courses.read"
        writePermission="courses.write"
        deletePermission="courses.delete"
        exportPermission="courses.export"
        
        // API endpoint
        apiEndpoint="/api/courses"
        
        // Colonne personalizzate
        columns={columns}
        
        // Handler personalizzati
        onCreateEntity={handleCreateCourse}
        onEditEntity={handleEditCourse}
        onDeleteEntity={handleDeleteCourse}
        onImportEntities={handleImportCourses}
        onExportEntities={handleExportCourses}
        
        // Configurazioni di ricerca e filtri
        searchFields={['title', 'category', 'description']}
        
        // Opzioni di ordinamento personalizzate
        sortOptions={[
          { key: 'title', label: 'Titolo' },
          { key: 'category', label: 'Categoria' },
          { key: 'duration', label: 'Durata' },
          { key: 'pricePerPerson', label: 'Prezzo' },
          { key: 'createdAt', label: 'Data Creazione' },
          { key: 'status', label: 'Stato' }
        ]}
        
        // Configurazione card per vista mobile
        cardConfig={{
          titleField: 'title',
          subtitleField: 'category'
        }}
        
        // Configurazioni UI specifiche per corsi
        enableBatchOperations={true}
        enableImportExport={true}
        enableColumnSelector={true}
        enableAdvancedFilters={true}
        
        // Filtri personalizzati
        filterOptions={[
          {
            key: 'category',
            label: 'Categoria',
            options: [
              { label: 'Sicurezza', value: 'sicurezza' },
              { label: 'Formazione', value: 'formazione' },
              { label: 'Tecnico', value: 'tecnico' },
              { label: 'Gestionale', value: 'gestionale' }
            ]
          },
          {
            key: 'status',
            label: 'Stato',
            options: [
              { label: 'Attivo', value: 'active' },
              { label: 'Bozza', value: 'draft' },
              { label: 'Completato', value: 'completed' },
              { label: 'Annullato', value: 'cancelled' }
            ]
          },
          {
            key: 'duration',
            label: 'Durata',
            options: [
              { label: '1-4 ore', value: '1-4' },
              { label: '5-8 ore', value: '5-8' },
              { label: '9-16 ore', value: '9-16' },
              { label: 'Più di 16 ore', value: '16+' }
            ]
          }
        ]}
        
        // Configurazioni CSV
        csvHeaders={[
          { key: 'title', label: 'Titolo' },
          { key: 'category', label: 'Categoria' },
          { key: 'duration', label: 'Durata' },
          { key: 'status', label: 'Stato' }
        ]}
      />
    </div>
  );
};

// Dashboard semplificata per i corsi
export const CoursesPageDashboard: React.FC = () => {
  const columns: DataTableColumn<Course>[] = [
    { 
      key: 'title', 
      label: 'Titolo', 
      sortable: true,
      renderCell: (row: Course) => row.title || '-'
    },
    { 
      key: 'category', 
      label: 'Categoria', 
      sortable: true,
      renderCell: (row: Course) => (
        <Badge variant="outline">
          {row.category || 'Generale'}
        </Badge>
      )
    },
    {
      key: 'status',
      label: 'Stato',
      sortable: true,
      renderCell: (row: Course) => (
        <Badge variant={row.status === 'active' ? 'default' : 'secondary'}>
          {row.status || 'Bozza'}
        </Badge>
      )
    },
    {
      key: 'createdAt',
      label: 'Data Creazione',
      sortable: true,
      renderCell: (row: Course) => row.createdAt ? new Date(row.createdAt).toLocaleDateString('it-IT') : '-'
    },
    { 
      key: 'duration', 
      label: 'Durata', 
      sortable: true,
      renderCell: (row: Course) => `${row.duration || 0}h`
    }
  ];

  return (
    <GDPREntityTemplate<Course>
      entityName="course"
      entityNamePlural="courses"
      entityDisplayName="Corso"
      entityDisplayNamePlural="Corsi"
      readPermission="courses.read"
      writePermission="courses.write"
      deletePermission="courses.delete"
      apiEndpoint="/api/courses"
      columns={columns}
      searchFields={['title', 'category']}
      csvHeaders={[
        { key: 'title', label: 'Titolo' },
        { key: 'category', label: 'Categoria' }
      ]}
      enableBatchOperations={false}
      enableImportExport={false}
      enableColumnSelector={false}
      enableAdvancedFilters={false}
    />
  );
};