/**
 * ApplyScontoModal Component
 * 
 * Modal for applying discount codes to preventivi.
 * Extracted from PreventiviPage.tsx as part of Project 46 modularization.
 */

import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { 
  X, 
  Tag, 
  Percent, 
  CheckCircle2 
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Preventivo } from '../types';

interface ApplyScontoModalProps {
  isOpen: boolean;
  onClose: () => void;
  preventivo: Preventivo | null;
  onApply: (preventivoId: string, codice: string) => Promise<void>;
}

const ApplyScontoModal: React.FC<ApplyScontoModalProps> = ({ 
  isOpen, 
  onClose, 
  preventivo, 
  onApply 
}) => {
  const [codice, setCodice] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleApply = async () => {
    if (!preventivo || !codice.trim()) return;

    setLoading(true);
    setError(null);

    try {
      await onApply(preventivo.id, codice.trim().toUpperCase());
      setCodice('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Codice sconto non valido');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !preventivo) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Tag className="h-5 w-5 text-green-600" />
            Applica Codice Sconto
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-1">Preventivo</p>
            <p className="font-mono font-medium">{preventivo.numero}</p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Codice Sconto
            </label>
            <div className="relative">
              <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={codice}
                onChange={(e) => setCodice(e.target.value.toUpperCase())}
                placeholder="Es. SCONTO20"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 uppercase"
              />
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Annulla</Button>
          <Button
            variant="primary"
            onClick={handleApply}
            disabled={loading || !codice.trim()}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Applica Sconto
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ApplyScontoModal;
