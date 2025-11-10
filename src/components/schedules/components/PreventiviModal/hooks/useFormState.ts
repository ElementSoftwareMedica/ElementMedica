import { useState, useEffect, useRef } from 'react';
import type { SpesaAccessoria, ScontoApplicato, TipoServizio, Training } from '../types';

interface UseFormStateReturn {
  prezzoUnitario: number;
  setPrezzoUnitario: (value: number) => void;
  tipoServizio: TipoServizio;
  setTipoServizio: (value: TipoServizio) => void;
  speseAccessorie: SpesaAccessoria[];
  setSpeseAccessorie: (value: SpesaAccessoria[]) => void;
  codiceSconto: string;
  setCodiceSconto: (value: string) => void;
  scontoApplicato: ScontoApplicato | null;
  setScontoApplicato: (value: ScontoApplicato | null) => void;
  note: string;
  setNote: (value: string) => void;
  handleAddSpesa: () => void;
  handleRemoveSpesa: (index: number) => void;
  handleUpdateSpesa: (index: number, field: 'descrizione' | 'importo', value: string | number) => void;
}

/**
 * Hook for managing form state (prices, services, expenses, discounts, notes)
 * 
 * Centralizes all form field state management with utilities for spese accessorie
 * 
 * @param selectedCourse - Selected training course (for auto-populating price)
 * @param editingPreventivo - Optional preventivo being edited (for pre-population)
 * @returns Form state and manipulation methods
 */
export function useFormState(
  selectedCourse: Training,
  editingPreventivo?: any | null
): UseFormStateReturn {
  const [prezzoUnitario, setPrezzoUnitario] = useState<number>(0);
  const [tipoServizio, setTipoServizio] = useState<TipoServizio>('MEDICO_COMPETENTE');
  const [speseAccessorie, setSpeseAccessorie] = useState<SpesaAccessoria[]>([]);
  const [codiceSconto, setCodiceSconto] = useState<string>('');
  const [scontoApplicato, setScontoApplicato] = useState<ScontoApplicato | null>(null);
  const [note, setNote] = useState<string>('');
  
  const editingInitializedRef = useRef(false);

  // Auto-populate prezzoUnitario from course
  useEffect(() => {
    if (selectedCourse && 'price' in selectedCourse && !editingPreventivo) {
      setPrezzoUnitario((selectedCourse as any).price || 0);
    }
  }, [selectedCourse, editingPreventivo]);

  // Pre-populate fields when editing
  useEffect(() => {
    if (editingPreventivo && !editingInitializedRef.current) {
      if (editingPreventivo.tipoServizio) {
        setTipoServizio(editingPreventivo.tipoServizio);
      }
      
      // Parse spese accessorie from note
      let parsedSpese: SpesaAccessoria[] = [];
      let noteAggiuntive = '';
      
      if (editingPreventivo.note) {
        const speseMatch = editingPreventivo.note.match(/Spese accessorie:\n((?:- .+: €[\d.]+\n?)+)/);
        if (speseMatch) {
          const speseLines = speseMatch[1].split('\n').filter(Boolean);
          parsedSpese = speseLines.map((line: string) => {
            const match = line.match(/- (.+): €([\d.]+)/);
            if (match) {
              return {
                descrizione: match[1],
                importo: parseFloat(match[2])
              };
            }
            return null;
          }).filter(Boolean) as SpesaAccessoria[];
        }
        
        const noteMatch = editingPreventivo.note.match(/Note aggiuntive:\n(.+)$/s);
        if (noteMatch) {
          noteAggiuntive = noteMatch[1];
        }
      }
      
      setSpeseAccessorie(parsedSpese);
      setNote(noteAggiuntive);
      
      // Calculate prezzoUnitario from totals
      const numPartecipanti = 1;
      const totaleSpese = parsedSpese.reduce((sum, s) => sum + s.importo, 0);
      const prezzoBase = Number(editingPreventivo.prezzoTotale) - totaleSpese;
      const calcolatedPrezzoUnitario = prezzoBase / numPartecipanti;
      setPrezzoUnitario(calcolatedPrezzoUnitario);
      
      // Set sconto if present
      if (editingPreventivo.scontoApplicato) {
        setScontoApplicato(editingPreventivo.scontoApplicato);
        setCodiceSconto(editingPreventivo.scontoApplicato.codice);
      }
      
      editingInitializedRef.current = true;
    }
  }, [editingPreventivo]);

  // Add spesa accessoria
  const handleAddSpesa = () => {
    setSpeseAccessorie([...speseAccessorie, { descrizione: '', importo: 0 }]);
  };

  // Remove spesa accessoria
  const handleRemoveSpesa = (index: number) => {
    setSpeseAccessorie(speseAccessorie.filter((_, i) => i !== index));
  };

  // Update spesa accessoria
  const handleUpdateSpesa = (index: number, field: 'descrizione' | 'importo', value: string | number) => {
    const updated = [...speseAccessorie];
    if (field === 'importo') {
      updated[index].importo = typeof value === 'number' ? value : parseFloat(value) || 0;
    } else {
      updated[index].descrizione = String(value);
    }
    setSpeseAccessorie(updated);
  };

  return {
    prezzoUnitario,
    setPrezzoUnitario,
    tipoServizio,
    setTipoServizio,
    speseAccessorie,
    setSpeseAccessorie,
    codiceSconto,
    setCodiceSconto,
    scontoApplicato,
    setScontoApplicato,
    note,
    setNote,
    handleAddSpesa,
    handleRemoveSpesa,
    handleUpdateSpesa
  };
}
