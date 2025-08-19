import React from 'react';
import { Download, FileText, Trash2, Pencil } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Dropdown, type DropdownAction } from '../../../design-system/molecules/Dropdown';

export interface Attestato {
  id: string;
  scheduledCourseId: string;
  partecipanteId: string;
  nomeFile: string;
  url: string;
  numeroProgressivo: number;
  annoProgressivo?: number;
  dataGenerazione: string;
  scheduledCourse: {
    course: { title: string; duration: string; anni_validita: string; validityYears: string; };
    sessions: { date: string; trainer?: { firstName: string; lastName: string; } }[];
    location?: string;
  };
  partecipante: {
    firstName: string;
    lastName: string;
    company?: { ragioneSociale: string; };
  };
  sede_corso?: string;
}

interface AttestatiTableProps {
  attestati: Attestato[];
  selectionMode: boolean;
  selectedIds: string[];
  toggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onDeleteClick: (id: string) => void;
  loading: boolean;
  error: any;
}

const AttestatiTable: React.FC<AttestatiTableProps> = ({
  attestati,
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

  if (loading) return <div className="flex justify-center py-8">Caricamento attestati...</div>;
  if (error) return <div className="text-red-500 py-8">Errore: impossibile caricare gli attestati</div>;
  if (attestati.length === 0) return <div className="text-center text-gray-500 py-8">Nessun attestato trovato</div>;

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
                  checked={selectedIds.length > 0 && selectedIds.length === attestati.length}
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
              Partecipante
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Azienda
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Sede
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Data Generazione
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {attestati.map((attestato) => (
            <tr key={attestato.id}>
              {selectionMode && (
                <td className="px-6 py-4 whitespace-nowrap">
                  <input 
                    type="checkbox"
                    checked={selectedIds.includes(attestato.id)}
                    onChange={() => toggleSelect(attestato.id)}
                    className="rounded text-blue-600"
                  />
                </td>
              )}
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <Dropdown
                  label="Azioni"
                  variant="outline" 
                  pill={true}
                  className="text-xs"
                  actions={[
                    {
                      label: "Dettagli",
                      icon: <FileText className="w-4 h-4" />,
                      onClick: () => navigate(`/attestati/${attestato.id}`),
                      variant: 'default'
                    },
                    {
                      label: "Scarica",
                      icon: <Download className="w-4 h-4" />,
                      onClick: () => window.open(attestato.url),
                      variant: 'default'
                    },
                    {
                      label: "Modifica",
                      icon: <Pencil className="w-4 h-4" />,
                      onClick: () => console.log('Edit attestato', attestato.id),
                      variant: 'default'
                    },
                    {
                      label: "Elimina",
                      icon: <Trash2 className="w-4 h-4" />,
                      onClick: () => onDeleteClick(attestato.id),
                      variant: 'danger'
                    }
                  ]}
                />
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {attestato.scheduledCourse?.course?.title || 'N/D'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {`${attestato.partecipante?.firstName || ''} ${attestato.partecipante?.lastName || ''}`}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {attestato.partecipante?.company?.ragioneSociale || 'N/D'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {attestato.sede_corso || attestato.scheduledCourse?.location || 'N/D'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {new Date(attestato.dataGenerazione).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AttestatiTable;