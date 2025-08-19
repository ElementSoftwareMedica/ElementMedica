import React from 'react';
import { Download, FileText, Trash2, Pencil } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Dropdown, type DropdownAction } from '../../../design-system/molecules/Dropdown';

export interface LetteraIncarico {
  id: string;
  scheduled_course_id: string;
  trainerId: string;
  nome_file: string;
  url: string;
  numero_progressivo: number;
  anno_progressivo?: number;
  data_generazione: string;
  scheduledCourse?: {
    course: { title: string; };
    sessions: { date: string; trainer?: { firstName: string; lastName: string; }; co_trainer?: { firstName: string; lastName: string; } }[];
    companies: { company: { ragioneSociale: string; } }[];
  };
  scheduled_course?: {
    course: { title: string; };
    sessions: { date: string; trainer?: { firstName: string; lastName: string; }; co_trainer?: { firstName: string; lastName: string; } }[];
    companies: { company: { ragioneSociale: string; } }[];
  };
  trainer: {
    firstName: string;
    lastName: string;
    tariffa_oraria?: number;
  };
}

interface LettereTableProps {
  lettere: LetteraIncarico[];
  selectionMode: boolean;
  selectedIds: string[];
  toggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onDeleteClick: (id: string) => void;
  loading: boolean;
  error: any;
}

const LettereTable: React.FC<LettereTableProps> = ({
  lettere,
  selectionMode,
  selectedIds,
  toggleSelect,
  onSelectAll,
  onDeselectAll,
  onDeleteClick,
  loading,
  error
}) => {
  const navigate = useNavigate();

  if (loading) return <div className="flex justify-center py-8">Caricamento lettere di incarico...</div>;
  if (error) return <div className="text-red-500 py-8">Errore: impossibile caricare le lettere di incarico</div>;
  
  if (lettere.length === 0) return <div className="text-center text-gray-500 py-8">Nessuna lettera di incarico trovata</div>;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {selectionMode && (
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <input 
                  type="checkbox"
                  onChange={e => e.target.checked ? onSelectAll() : onDeselectAll()}
                  checked={selectedIds.length > 0 && selectedIds.length === lettere.length}
                  className="rounded text-blue-600"
                />
              </th>
            )}
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Azioni
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Corso
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Formatore
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Data Generazione
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {lettere.map((lettera) => {
            // Get course title, handling different field naming
            const course = lettera.scheduled_course || lettera.scheduledCourse;
            const courseTitle = course?.course?.title || 'Corso senza titolo';
            
            // Get trainer name, handling nulls safely
            const trainerName = lettera.trainer ? 
              `${lettera.trainer.firstName || ''} ${lettera.trainer.lastName || ''}`.trim() :
              'Formatore non specificato';
              
            return (
              <tr key={lettera.id}>
                {selectionMode && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input 
                      type="checkbox"
                      checked={selectedIds.includes(lettera.id)}
                      onChange={() => toggleSelect(lettera.id)}
                      className="rounded text-blue-600"
                    />
                  </td>
                )}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <Dropdown
                    variant="outline" 
                    pill={true}
                    className="text-xs"
                    actions={[
                      {
                        label: "Dettagli",
                        icon: <FileText className="w-4 h-4" />,
                        onClick: () => navigate(`/lettera-incarico/${lettera.id}`),
                        variant: 'default'
                      },
                      {
                        label: "Scarica",
                        icon: <Download className="w-4 h-4" />,
                        onClick: () => window.open(lettera.url),
                        variant: 'default'
                      },
                      {
                        label: "Modifica",
                        icon: <Pencil className="w-4 h-4" />,
                        onClick: () => console.log('Edit lettera', lettera.id),
                        variant: 'default'
                      },
                      {
                        label: "Elimina",
                        icon: <Trash2 className="w-4 h-4" />,
                        onClick: () => onDeleteClick(lettera.id),
                        variant: 'danger'
                      }
                    ]}
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                  {courseTitle}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                  {trainerName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {lettera.data_generazione ? new Date(lettera.data_generazione).toLocaleDateString() : '-'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default LettereTable;