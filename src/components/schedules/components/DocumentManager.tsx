import React from 'react';
import { Label } from '../../../design-system/atoms/Label';

interface DocumentManagerProps {
  status: string;
  onStatusChange: (status: string) => void;
  selectedEmployees: (string | number)[];
  selectedCompanies: (string | number)[];
  attendance: Record<number, (string | number)[]>;
  dates: Record<string, unknown>[];
  showStatusMenu: boolean;
  onShowStatusMenuChange: (show: boolean) => void;
}

export const DocumentManager: React.FC<DocumentManagerProps> = ({
  status,
  onStatusChange,
  selectedEmployees,
  selectedCompanies,
  attendance,
  dates,
  showStatusMenu,
  onShowStatusMenuChange
}) => {
  const statusOptions = ['Preventivo', 'Conferma', 'Fattura', 'Pagamento'];
  
  const hasAttendanceData = dates.every((_, idx) => 
    attendance[idx] && attendance[idx].length > 0
  );

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-gray-700">Documenti</h3>
      
      <div className="border rounded-md p-4 bg-gray-50 space-y-4">
        {/* Document Status */}
        <div>
          <Label>Stato Documentazione</Label>
          <div className="relative mt-1">
            <button
              type="button"
              className="w-full p-2 border rounded flex justify-between items-center bg-white hover:bg-gray-50"
              onClick={() => onShowStatusMenuChange(!showStatusMenu)}
            >
              <span>{status}</span>
              <span className="text-gray-400">▼</span>
            </button>
            
            {showStatusMenu && (
              <div className="absolute left-0 right-0 mt-1 border rounded bg-white shadow-lg z-10">
                {statusOptions.map(s => (
                  <div
                    key={s}
                    className="p-2 hover:bg-gray-100 cursor-pointer"
                    onClick={() => {
                      onStatusChange(s);
                      onShowStatusMenuChange(false);
                    }}
                  >
                    {s}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Participants Summary */}
        <div>
          <Label>Partecipanti confermati</Label>
          <div className="mt-1 p-3 border rounded bg-white">
            <div className="text-sm text-gray-600">
              <span className="font-semibold">{selectedEmployees.length}</span> partecipanti da{' '}
              <span className="font-semibold">{selectedCompanies.length}</span> aziende
            </div>
          </div>
        </div>
        
        {/* Document Generation Options */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm">Opzioni di generazione</h4>
          
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <input 
                type="checkbox" 
                id="preventivo" 
                checked={status === 'Preventivo'} 
                readOnly 
                className="w-4 h-4"
              />
              <label htmlFor="preventivo" className="text-sm">
                Genera Preventivo
              </label>
            </div>
            
            <div className="flex items-center gap-3">
              <input 
                type="checkbox" 
                id="attestati" 
                disabled={!hasAttendanceData}
                className="w-4 h-4"
              />
              <label 
                htmlFor="attestati" 
                className={`text-sm ${!hasAttendanceData ? "text-gray-400" : ""}`}
              >
                Genera Attestati
              </label>
              {!hasAttendanceData && (
                <span className="text-gray-400 text-xs">
                  (disponibile dopo la registrazione delle presenze)
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              <input 
                type="checkbox" 
                id="registro" 
                disabled={!hasAttendanceData}
                className="w-4 h-4"
              />
              <label 
                htmlFor="registro" 
                className={`text-sm ${!hasAttendanceData ? "text-gray-400" : ""}`}
              >
                Genera Registro Presenze
              </label>
            </div>
          </div>
        </div>
        
        {/* Status Information */}
        <div className="bg-blue-50 p-3 rounded border">
          <div className="text-sm">
            <div className="font-medium text-blue-800 mb-1">Stato attuale: {status}</div>
            <div className="text-blue-600 text-xs">
              {status === 'Preventivo' && 'Il corso è in fase di preventivazione'}
              {status === 'Conferma' && 'Il corso è confermato e pronto per l\'erogazione'}
              {status === 'Fattura' && 'Il corso è stato fatturato'}
              {status === 'Pagamento' && 'Il pagamento è stato ricevuto'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentManager;