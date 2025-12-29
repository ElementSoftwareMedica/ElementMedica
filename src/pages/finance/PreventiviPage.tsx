/**
 * PreventiviPage - Gestione Preventivi
 * 
 * Pagina completa per la gestione preventivi con:
 * - Layout moderno stile DocumentsCorsi
 * - Stats cards cliccabili per filtrare
 * - Creazione preventivi multi-servizio (Corso, DVR, RSPP, etc.)
 * - Applicazione codici sconto
 * - Merge preventivi stessa azienda
 * - Download PDF
 * - GDPR compliant
 */

import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import {
  FileText,
  Calendar,
  Euro,
  AlertCircle,
  Clock,
  Send,
  Eye,
  ThumbsUp,
  Receipt,
  XCircle,
  Merge,
  Plus,
  Download,
  Trash2,
  MoreHorizontal,
  Building2,
  User,
  Search,
  Filter,
  CheckCircle2,
  GraduationCap,
  Shield,
  Stethoscope,
  Lock,
  HelpCircle,
  Tag,
  Percent,
  X,
  TrendingUp,
  LayoutGrid,
  Table2,
  Layers,
  Scissors,
  Info,
  Briefcase,
  Pencil
} from 'lucide-react';
import { Button } from '../../design-system/atoms/Button';
import { ViewModeToggle } from '../../design-system/molecules/ViewModeToggle';
import { ConfirmModal } from '../../design-system/molecules/Modal';
import { ActionButton } from '../../components/ui';
import { usePreventivi, Preventivo } from '../../hooks/finance/usePreventivi';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../hooks/useToast';
import { apiGet, apiPost } from '../../services/api';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

// ============================================================================
// Types
// ============================================================================

interface Company {
  id: string;
  ragioneSociale: string;
}

interface Person {
  id: string;
  firstName: string;
  lastName: string;
}

interface CourseSchedule {
  id: string;
  course: {
    id: string;
    title: string;
    code: string;
  };
  startDate: string;
}

interface CreatePreventivoData {
  tipoServizio: 'CORSO' | 'DVR' | 'RSPP' | 'MEDICO_COMPETENTE' | 'CONSULENZA' | 'COMPENSO_FORMATORE' | 'ALTRO';
  titoloServizio: string;
  descrizioneServizio?: string;
  prezzoTotale: number;
  aliquotaIva: number;
  aziendaId?: string;
  personaId?: string;
  corsoId?: string;
  scheduleId?: string;
  trainerId?: string;
  note?: string;
  voci?: PreventivoVoce[];
  codiceSconto?: string;
}

// Voce singola del preventivo
interface PreventivoVoce {
  id: string;
  descrizione: string;
  quantita: number;
  prezzoUnitario: number;
  subtotale: number;
}

// ============================================================================
// Status Configuration
// ============================================================================

const STATUS_CONFIG: Record<string, {
  label: string;
  className: string;
  bgClass: string;
  icon: React.FC<{ className?: string }>
}> = {
  'BOZZA': {
    label: 'Bozza',
    className: 'bg-gray-100 text-gray-800',
    bgClass: 'bg-gray-50 border-gray-200',
    icon: Clock
  },
  'INVIATO': {
    label: 'Inviato',
    className: 'bg-blue-100 text-blue-800',
    bgClass: 'bg-blue-50 border-blue-200',
    icon: Send
  },
  'VISUALIZZATO': {
    label: 'Visualizzato',
    className: 'bg-cyan-100 text-cyan-800',
    bgClass: 'bg-cyan-50 border-cyan-200',
    icon: Eye
  },
  'ACCETTATO': {
    label: 'Accettato',
    className: 'bg-green-100 text-green-800',
    bgClass: 'bg-green-50 border-green-200',
    icon: ThumbsUp
  },
  'RIFIUTATO': {
    label: 'Rifiutato',
    className: 'bg-red-100 text-red-800',
    bgClass: 'bg-red-50 border-red-200',
    icon: XCircle
  },
  'SCADUTO': {
    label: 'Scaduto',
    className: 'bg-orange-100 text-orange-800',
    bgClass: 'bg-orange-50 border-orange-200',
    icon: AlertCircle
  },
  'CONVERTITO': {
    label: 'Convertito',
    className: 'bg-emerald-100 text-emerald-800',
    bgClass: 'bg-emerald-50 border-emerald-200',
    icon: CheckCircle2
  },
  'ANNULLATO': {
    label: 'Annullato',
    className: 'bg-gray-200 text-gray-600',
    bgClass: 'bg-gray-100 border-gray-300',
    icon: XCircle
  },
  'FATTURATO': {
    label: 'Fatturato',
    className: 'bg-purple-100 text-purple-800',
    bgClass: 'bg-purple-50 border-purple-200',
    icon: Receipt
  },
  'ARCHIVIATO': {
    label: 'Archiviato',
    className: 'bg-slate-100 text-slate-800',
    bgClass: 'bg-slate-50 border-slate-200',
    icon: Lock
  }
};

/**
 * Transizioni di stato valide per i preventivi
 * Allineato con backend/services/preventivi-service.js
 */
const STATO_TRANSITIONS: Record<string, string[]> = {
  BOZZA: ['INVIATO', 'ACCETTATO', 'SCADUTO', 'ARCHIVIATO'],
  INVIATO: ['VISUALIZZATO', 'ACCETTATO', 'RIFIUTATO', 'SCADUTO', 'ARCHIVIATO'],
  VISUALIZZATO: ['ACCETTATO', 'RIFIUTATO', 'SCADUTO', 'ARCHIVIATO'],
  ACCETTATO: ['FATTURATO', 'CONVERTITO', 'ANNULLATO'],
  RIFIUTATO: ['ARCHIVIATO'],
  SCADUTO: ['ARCHIVIATO'],
  CONVERTITO: ['FATTURATO', 'ARCHIVIATO'],
  FATTURATO: ['ARCHIVIATO'],
  ANNULLATO: ['ARCHIVIATO'],
  ARCHIVIATO: []
};

const TIPO_SERVIZIO_CONFIG: Record<string, {
  label: string;
  icon: React.FC<{ className?: string }>;
  color: string
}> = {
  'CORSO': { label: 'Corso', icon: GraduationCap, color: 'text-blue-600' },
  'DVR': { label: 'DVR', icon: FileText, color: 'text-green-600' },
  'RSPP': { label: 'RSPP', icon: Shield, color: 'text-orange-600' },
  'MEDICO_COMPETENTE': { label: 'Medico Competente', icon: Stethoscope, color: 'text-red-600' },
  'CONSULENZA': { label: 'Consulenza', icon: HelpCircle, color: 'text-cyan-600' },
  'COMPENSO_FORMATORE': { label: 'Compenso Formatore', icon: User, color: 'text-amber-600' },
  'ALTRO': { label: 'Altro', icon: Briefcase, color: 'text-gray-600' }
};

// ============================================================================
// Searchable Dropdown Component (integrated search in dropdown)
// ============================================================================

interface SearchableDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  required?: boolean;
}

const SearchableDropdown: React.FC<SearchableDropdownProps> = ({
  value,
  onChange,
  options,
  placeholder = "Seleziona...",
  searchPlaceholder = "Cerca...",
  className = "",
  required = false
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  React.useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedOption = options.find(option => option.value === value);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        className={`w-full px-4 py-2 text-left bg-white border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 flex items-center justify-between ${required && !value ? 'border-gray-300' : 'border-gray-300'
          }`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={selectedOption ? 'text-gray-900' : 'text-gray-500'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <svg className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
          <div className="p-2 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
          <div className="max-h-60 overflow-auto">
            {/* Option to clear selection */}
            <button
              type="button"
              className={`w-full px-4 py-2 text-left text-gray-500 hover:bg-gray-50 focus:outline-none focus:bg-gray-50 text-sm ${!value ? 'bg-orange-50 text-orange-600' : ''
                }`}
              onClick={() => {
                onChange('');
                setIsOpen(false);
                setSearchTerm('');
              }}
            >
              {placeholder}
            </button>
            {filteredOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`w-full px-4 py-2 text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50 text-sm ${option.value === value ? 'bg-orange-50 text-orange-600 font-medium' : 'text-gray-900'
                  }`}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                  setSearchTerm('');
                }}
              >
                {option.label}
              </button>
            ))}
            {filteredOptions.length === 0 && (
              <div className="px-4 py-3 text-gray-500 text-sm text-center">
                Nessun risultato trovato
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Create Preventivo Modal
// ============================================================================

interface CreatePreventivoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreatePreventivoData) => Promise<void>;
}

const CreatePreventivoModal: React.FC<CreatePreventivoModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState<CreatePreventivoData>({
    tipoServizio: 'CORSO',
    titoloServizio: '',
    descrizioneServizio: '',
    prezzoTotale: 0,
    aliquotaIva: 22,
    note: '',
    voci: [{ id: '1', descrizione: '', quantita: 1, prezzoUnitario: 0, subtotale: 0 }]
  });
  const [companies, setCompanies] = useState<Company[]>([]);
  const [persons, setPersons] = useState<Person[]>([]);
  const [schedules, setSchedules] = useState<CourseSchedule[]>([]);
  const [clienteType, setClienteType] = useState<'azienda' | 'persona'>('azienda');
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  // Stato validazione codice sconto
  const [scontoValidation, setScontoValidation] = useState<{
    valid: boolean;
    importoSconto: number;
    codiceNome?: string;
    tipoSconto?: string;
    valore?: number;
    error?: string;
  } | null>(null);
  const [validatingSconto, setValidatingSconto] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadFormData();
    }
  }, [isOpen]);

  const loadFormData = async () => {
    setLoadingData(true);
    try {
      const [companiesRes, personsRes, schedulesRes] = await Promise.all([
        apiGet<Company[]>('/api/v1/companies').catch(() => []),
        apiGet<Person[]>('/api/v1/persons').catch(() => []),
        apiGet<CourseSchedule[]>('/api/v1/schedules').catch(() => [])
      ]);

      // Sort companies alphabetically
      const sortedCompanies = Array.isArray(companiesRes)
        ? companiesRes.sort((a, b) => (a.ragioneSociale || '').localeCompare(b.ragioneSociale || ''))
        : [];
      setCompanies(sortedCompanies);
      setPersons(Array.isArray(personsRes) ? personsRes : []);

      // Sort schedules by date (most recent/future first) and exclude expired
      const now = new Date();
      const validSchedules = (Array.isArray(schedulesRes) ? schedulesRes : [])
        .filter(s => {
          // Exclude expired schedules (endDate < now and status COMPLETED)
          const endDate = (s as any).endDate ? new Date((s as any).endDate) : new Date(s.startDate);
          return endDate >= now || (s as any).status !== 'COMPLETED';
        })
        .sort((a, b) => {
          const dateA = new Date(a.startDate);
          const dateB = new Date(b.startDate);
          return dateB.getTime() - dateA.getTime(); // Descending (newest first)
        });
      setSchedules(validSchedules);
    } catch (err) {
      console.error('Error loading form data:', err);
    } finally {
      setLoadingData(false);
    }
  };

  // Funzione per validare il codice sconto
  const validateCodiceSconto = async (codice: string) => {
    if (!codice || codice.trim().length === 0) {
      setScontoValidation(null);
      return;
    }

    // Verifica che ci sia un cliente selezionato
    const clienteId = formData.aziendaId || formData.personaId;
    if (!clienteId) {
      setScontoValidation({
        valid: false,
        importoSconto: 0,
        error: 'Seleziona prima un cliente per validare il codice sconto'
      });
      return;
    }

    setValidatingSconto(true);
    try {
      const response = await apiPost<{
        success: boolean;
        valid: boolean;
        codice?: {
          id: string;
          codice: string;
          nome: string;
          descrizione?: string;
          tipoSconto: string;
          valore: number;
          cumulabile: boolean;
        };
        calcolo?: {
          prezzoBase: number;
          importoSconto: number;
          prezzoFinale: number;
          risparmioPercentuale: string;
        };
        errors?: string[];
        error?: string;
      }>('/api/v1/codici-sconto/valida', {
        codice: codice.trim().toUpperCase(),
        prezzoBase: totaleVoci,
        tipoServizio: formData.tipoServizio,
        clienteId: clienteId,
        clienteType: formData.aziendaId ? 'azienda' : 'persona',
        ...(formData.corsoId && { corsoId: formData.corsoId })
      });

      if (response.valid && response.calcolo) {
        setScontoValidation({
          valid: true,
          importoSconto: response.calcolo.importoSconto,
          codiceNome: response.codice?.nome,
          tipoSconto: response.codice?.tipoSconto,
          valore: response.codice?.valore
        });
      } else {
        setScontoValidation({
          valid: false,
          importoSconto: 0,
          error: response.errors?.[0] || response.error || 'Codice sconto non valido'
        });
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Errore nella validazione del codice sconto';
      setScontoValidation({
        valid: false,
        importoSconto: 0,
        error: errorMessage
      });
    } finally {
      setValidatingSconto(false);
    }
  };

  // Calcola subtotale per una voce
  const updateVoceSubtotale = (voce: PreventivoVoce): PreventivoVoce => ({
    ...voce,
    subtotale: voce.quantita * voce.prezzoUnitario
  });

  // Aggiungi nuova voce
  const addVoce = () => {
    const newVoci = [...(formData.voci || []), {
      id: Date.now().toString(),
      descrizione: '',
      quantita: 1,
      prezzoUnitario: 0,
      subtotale: 0
    }];
    setFormData({ ...formData, voci: newVoci });
  };

  // Rimuovi voce
  const removeVoce = (id: string) => {
    if ((formData.voci?.length || 0) <= 1) return; // Keep at least one
    const newVoci = (formData.voci || []).filter(v => v.id !== id);
    setFormData({ ...formData, voci: newVoci });
  };

  // Aggiorna voce
  const updateVoce = (id: string, field: keyof PreventivoVoce, value: string | number) => {
    const newVoci = (formData.voci || []).map(v => {
      if (v.id !== id) return v;
      const updated = { ...v, [field]: value };
      return updateVoceSubtotale(updated);
    });
    setFormData({ ...formData, voci: newVoci });
  };

  // Calcola totali (con sconto se validato)
  const totaleVoci = (formData.voci || []).reduce((sum, v) => sum + v.subtotale, 0);
  const importoScontoCalcolato = scontoValidation?.valid ? scontoValidation.importoSconto : 0;
  const imponibileScontato = totaleVoci - importoScontoCalcolato;
  const importoIva = imponibileScontato * (formData.aliquotaIva / 100);
  const importoFinale = imponibileScontato + importoIva;

  // Effetto per validare il codice sconto con debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (formData.codiceSconto && totaleVoci > 0 && (formData.aziendaId || formData.personaId)) {
        validateCodiceSconto(formData.codiceSconto);
      } else if (!formData.aziendaId && !formData.personaId && formData.codiceSconto) {
        // Resetta se non c'è cliente ma c'è codice
        setScontoValidation({
          valid: false,
          importoSconto: 0,
          error: 'Seleziona prima un cliente per validare il codice sconto'
        });
      } else {
        setScontoValidation(null);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.codiceSconto, totaleVoci, formData.aziendaId, formData.personaId, formData.tipoServizio, formData.corsoId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Build description from voci
      const vociDescription = (formData.voci || [])
        .filter(v => v.descrizione && v.subtotale > 0)
        .map(v => `• ${v.descrizione}: ${v.quantita} x €${v.prezzoUnitario.toFixed(2)} = €${v.subtotale.toFixed(2)}`)
        .join('\n');

      const fullDescription = vociDescription
        ? `${formData.descrizioneServizio || ''}\n\nDettaglio voci:\n${vociDescription}`.trim()
        : formData.descrizioneServizio;

      await onSubmit({
        ...formData,
        prezzoTotale: totaleVoci,
        descrizioneServizio: fullDescription
      });
      onClose();
      // Reset form
      setFormData({
        tipoServizio: 'CORSO',
        titoloServizio: '',
        descrizioneServizio: '',
        prezzoTotale: 0,
        aliquotaIva: 22,
        note: '',
        voci: [{ id: '1', descrizione: '', quantita: 1, prezzoUnitario: 0, subtotale: 0 }],
        codiceSconto: ''
      });
    } catch (err) {
      console.error('Error creating preventivo:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-orange-500 to-orange-600">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Nuovo Preventivo
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
            <X className="h-5 w-5 text-white" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]" noValidate>
          {loadingData ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Tipo Servizio */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo Servizio *</label>
                <div className="grid grid-cols-4 gap-2">
                  {Object.entries(TIPO_SERVIZIO_CONFIG).map(([key, config]) => {
                    const Icon = config.icon;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setFormData({ ...formData, tipoServizio: key as any })}
                        className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-1 ${formData.tipoServizio === key
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-gray-200 hover:border-gray-300'
                          }`}
                      >
                        <Icon className={`h-5 w-5 ${config.color}`} />
                        <span className="text-xs font-medium text-center">{config.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Cliente Type Toggle */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Cliente *</label>
                <div className="flex gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => {
                      setClienteType('azienda');
                      setFormData({ ...formData, personaId: undefined });
                    }}
                    className={`flex-1 py-2 px-4 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${clienteType === 'azienda'
                      ? 'border-orange-500 bg-orange-50 text-orange-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                  >
                    <Building2 className="h-4 w-4" />
                    Azienda
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setClienteType('persona');
                      setFormData({ ...formData, aziendaId: undefined });
                    }}
                    className={`flex-1 py-2 px-4 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${clienteType === 'persona'
                      ? 'border-orange-500 bg-orange-50 text-orange-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                  >
                    <User className="h-4 w-4" />
                    Persona
                  </button>
                </div>

                {clienteType === 'azienda' ? (
                  <SearchableDropdown
                    value={formData.aziendaId || ''}
                    onChange={(value) => setFormData({ ...formData, aziendaId: value || undefined })}
                    options={companies.map(c => ({
                      value: c.id,
                      label: c.ragioneSociale || 'N/A'
                    }))}
                    placeholder="Seleziona azienda..."
                    searchPlaceholder="Cerca azienda..."
                    required
                  />
                ) : (
                  <SearchableDropdown
                    value={formData.personaId || ''}
                    onChange={(value) => setFormData({ ...formData, personaId: value || undefined })}
                    options={persons.map(p => ({
                      value: p.id,
                      label: `${p.firstName} ${p.lastName}`
                    }))}
                    placeholder="Seleziona persona..."
                    searchPlaceholder="Cerca persona..."
                    required
                  />
                )}
              </div>

              {/* Corso (if tipo = CORSO) */}
              {formData.tipoServizio === 'CORSO' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Corso Programmato</label>
                  <SearchableDropdown
                    value={formData.corsoId || ''}
                    onChange={(value) => setFormData({ ...formData, corsoId: value || undefined })}
                    options={schedules.map(s => ({
                      value: s.id,
                      label: `${s.course?.title || 'N/A'} - ${format(new Date(s.startDate), 'dd/MM/yyyy')}`
                    }))}
                    placeholder="Seleziona corso (opzionale)..."
                    searchPlaceholder="Cerca corso..."
                  />
                </div>
              )}

              {/* Titolo Servizio */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Titolo Servizio *</label>
                <input
                  type="text"
                  value={formData.titoloServizio}
                  onChange={(e) => setFormData({ ...formData, titoloServizio: e.target.value })}
                  placeholder="Es. Corso Sicurezza sul Lavoro"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  required
                />
              </div>

              {/* VOCI DEL PREVENTIVO */}
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-4">
                  <label className="text-sm font-medium text-gray-700">
                    Voci del Preventivo
                  </label>
                  <button
                    type="button"
                    onClick={addVoce}
                    className="text-sm text-orange-600 hover:text-orange-700 flex items-center gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    Aggiungi voce
                  </button>
                </div>

                <div className="space-y-3">
                  {/* Header */}
                  <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 px-1">
                    <div className="col-span-5">Descrizione</div>
                    <div className="col-span-2 text-center">Qtà</div>
                    <div className="col-span-2 text-right">Prezzo Unit.</div>
                    <div className="col-span-2 text-right">Subtotale</div>
                    <div className="col-span-1"></div>
                  </div>

                  {/* Voci */}
                  {(formData.voci || []).map((voce, index) => (
                    <div key={voce.id} className="grid grid-cols-12 gap-2 items-center bg-white p-2 rounded-lg border border-gray-200">
                      <div className="col-span-5">
                        <input
                          type="text"
                          value={voce.descrizione}
                          onChange={(e) => updateVoce(voce.id, 'descrizione', e.target.value)}
                          placeholder="Es. Partecipante corso base"
                          className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={voce.quantita}
                          onChange={(e) => updateVoce(voce.id, 'quantita', parseInt(e.target.value) || 1)}
                          className="w-full px-3 py-1.5 text-sm text-center border border-gray-200 rounded focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                        />
                      </div>
                      <div className="col-span-2">
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">€</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={voce.prezzoUnitario}
                            onChange={(e) => updateVoce(voce.id, 'prezzoUnitario', parseFloat(e.target.value) || 0)}
                            className="w-full pl-5 pr-2 py-1.5 text-sm text-right border border-gray-200 rounded focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                          />
                        </div>
                      </div>
                      <div className="col-span-2 text-right font-medium text-gray-900 text-sm">
                        € {voce.subtotale.toFixed(2)}
                      </div>
                      <div className="col-span-1 text-center">
                        {(formData.voci?.length || 0) > 1 && (
                          <button
                            type="button"
                            onClick={() => removeVoce(voce.id)}
                            className="p-1 text-red-500 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Codice Sconto */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-green-600" />
                    Codice Sconto (opzionale)
                  </div>
                </label>
                <input
                  type="text"
                  value={formData.codiceSconto || ''}
                  onChange={(e) => setFormData({ ...formData, codiceSconto: e.target.value.toUpperCase() })}
                  placeholder="Es. SCONTO20"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 uppercase"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Il codice sconto verrà applicato dopo la creazione del preventivo
                </p>
              </div>

              {/* IVA */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Aliquota IVA</label>
                <select
                  value={formData.aliquotaIva}
                  onChange={(e) => setFormData({ ...formData, aliquotaIva: parseFloat(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="0">0% (Esente)</option>
                  <option value="4">4%</option>
                  <option value="10">10%</option>
                  <option value="22">22%</option>
                </select>
              </div>

              {/* Totali Preview */}
              <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                <h4 className="font-medium text-gray-700 mb-3">Riepilogo</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Totale voci ({(formData.voci || []).filter(v => v.subtotale > 0).length}):</span>
                    <span className="font-medium">€ {totaleVoci.toFixed(2)}</span>
                  </div>

                  {/* Sconto - mostra solo se validato o in validazione */}
                  {formData.codiceSconto && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 flex items-center gap-1">
                        Sconto
                        {validatingSconto && (
                          <span className="inline-block animate-spin rounded-full h-3 w-3 border-b-2 border-orange-500"></span>
                        )}
                        {scontoValidation?.valid && scontoValidation.codiceNome && (
                          <span className="text-xs text-green-600">({scontoValidation.codiceNome})</span>
                        )}
                        {scontoValidation && !scontoValidation.valid && (
                          <span className="text-xs text-red-500" title={scontoValidation.error}>⚠️</span>
                        )}
                      </span>
                      {scontoValidation?.valid ? (
                        <span className="font-medium text-green-600">- € {importoScontoCalcolato.toFixed(2)}</span>
                      ) : (
                        <span className="font-medium text-gray-400">€ 0.00</span>
                      )}
                    </div>
                  )}

                  {/* Subtotale scontato (mostra solo se c'è uno sconto valido) */}
                  {scontoValidation?.valid && importoScontoCalcolato > 0 && (
                    <div className="flex justify-between text-gray-600">
                      <span>Imponibile scontato:</span>
                      <span className="font-medium">€ {imponibileScontato.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <span className="text-gray-600">IVA ({formData.aliquotaIva}%):</span>
                    <span className="font-medium">€ {importoIva.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-orange-300">
                    <span className="text-gray-900 font-semibold">Totale:</span>
                    <span className="text-xl font-bold text-orange-600">€ {importoFinale.toFixed(2)}</span>
                  </div>

                  {/* Messaggio risparmio */}
                  {scontoValidation?.valid && importoScontoCalcolato > 0 && (
                    <div className="mt-2 p-2 bg-green-50 rounded-lg border border-green-200 text-center">
                      <span className="text-green-700 text-xs font-medium">
                        🎉 Risparmi € {importoScontoCalcolato.toFixed(2)} con il codice sconto!
                      </span>
                    </div>
                  )}

                  {/* Errore codice sconto */}
                  {scontoValidation && !scontoValidation.valid && scontoValidation.error && (
                    <div className="mt-2 p-2 bg-red-50 rounded-lg border border-red-200 text-center">
                      <span className="text-red-600 text-xs">
                        ⚠️ {scontoValidation.error}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Note</label>
                <textarea
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  placeholder="Note aggiuntive..."
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </div>
          )}
        </form>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 bg-gray-50">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Annulla
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={loading || !formData.titoloServizio || totaleVoci <= 0 || (!formData.aziendaId && !formData.personaId)}
            className="flex items-center gap-2"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Crea Preventivo
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
};

// ============================================================================
// Merge Modal
// ============================================================================

interface MergeModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPreventivi: Preventivo[];
  onMerge: (aziendaId: string, ids: string[]) => void;
}

const MergeModal: React.FC<MergeModalProps> = ({ isOpen, onClose, selectedPreventivi, onMerge }) => {
  const groupedByAzienda = useMemo(() => {
    const groups: Record<string, { azienda?: { id: string; ragioneSociale: string }; preventivi: Preventivo[] }> = {};

    selectedPreventivi.forEach(p => {
      const key = p.aziendaId || 'no-azienda';
      if (!groups[key]) {
        groups[key] = { azienda: p.azienda, preventivi: [] };
      }
      groups[key].preventivi.push(p);
    });

    return groups;
  }, [selectedPreventivi]);

  const mergeableGroups = Object.entries(groupedByAzienda).filter(
    ([_, group]) => group.azienda && group.preventivi.length >= 2
  );

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Merge className="h-5 w-5 text-orange-600" />
            Unisci Preventivi
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {mergeableGroups.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Impossibile unire i preventivi
              </h3>
              <p className="text-gray-600">
                Seleziona almeno 2 preventivi della stessa azienda per procedere.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {mergeableGroups.map(([aziendaId, group]) => (
                <div key={aziendaId} className="border border-gray-200 rounded-lg p-4 hover:border-orange-300 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-gray-500" />
                      <span className="font-medium text-gray-900">{group.azienda?.ragioneSociale}</span>
                    </div>
                    <span className="text-sm text-gray-500">{group.preventivi.length} preventivi</span>
                  </div>

                  <div className="space-y-2 mb-4">
                    {group.preventivi.map(p => (
                      <div key={p.id} className="flex items-center justify-between text-sm bg-gray-50 px-3 py-2 rounded">
                        <span className="font-mono">{p.numero}</span>
                        <span>{p.tipoServizio}</span>
                        <span className="font-medium">€ {Number(p.importoFinale || 0).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div className="text-sm">
                      <span className="text-gray-500">Totale: </span>
                      <span className="font-bold text-gray-900">
                        € {group.preventivi.reduce((sum, p) => sum + Number(p.importoFinale || 0), 0).toFixed(2)}
                      </span>
                    </div>
                    <Button
                      variant="primary"
                      onClick={() => { onMerge(aziendaId, group.preventivi.map(p => p.id)); onClose(); }}
                      className="flex items-center gap-2"
                    >
                      <Merge className="h-4 w-4" />
                      Unisci
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <Button variant="outline" onClick={onClose}>Chiudi</Button>
        </div>
      </div>
    </div>,
    document.body
  );
};

// ============================================================================
// Merged Details Modal - Mostra i dettagli dei preventivi uniti
// ============================================================================

interface MergedDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  preventivo: Preventivo | null;
}

interface MergedVoce {
  originalPreventivoId?: string;
  originalNumero?: string;
  titoloServizio?: string;
  descrizioneServizio?: string;
  tipoServizio?: string;
  prezzoUnitario?: number;
  quantita?: number;
  prezzoTotale?: number;
  scontoTotale?: number;
  descrizione?: string;
  importo?: number;
}

const MergedDetailsModal: React.FC<MergedDetailsModalProps> = ({ isOpen, onClose, preventivo }) => {
  if (!isOpen || !preventivo) return null;

  const mergedFromIds = preventivo.dettagliServizio?.mergedFromIds || [];
  const mergedFromNumeri = preventivo.dettagliServizio?.mergedFromNumeri || [];
  const mergedAt = preventivo.dettagliServizio?.mergedAt;
  const voci: MergedVoce[] = preventivo.dettagliServizio?.voci || [];

  // Calculate totals from voci
  const totalePreventivi = voci.reduce((sum, v) => sum + Number(v.prezzoTotale || v.importo || 0), 0);
  const totaleSconti = voci.reduce((sum, v) => sum + Number(v.scontoTotale || 0), 0);

  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-purple-50">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Layers className="h-5 w-5 text-purple-600" />
            Preventivo Unificato
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-purple-100 rounded-lg">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[65vh]">
          {/* Info preventivo corrente */}
          <div className="mb-6 bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-gray-400" />
                <span className="font-mono font-bold text-lg text-gray-900">{preventivo.numero}</span>
              </div>
              <span className="text-lg font-bold text-green-600">
                € {Number(preventivo.importoFinale || 0).toFixed(2)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Cliente:</span>
                <span className="ml-2 font-medium text-gray-900">
                  {preventivo.azienda?.ragioneSociale || `${preventivo.persona?.firstName} ${preventivo.persona?.lastName}` || '-'}
                </span>
              </div>
              {mergedAt && (
                <div>
                  <span className="text-gray-500">Unificato il:</span>
                  <span className="ml-2 font-medium text-gray-900">
                    {format(new Date(mergedAt), 'dd/MM/yyyy HH:mm', { locale: it })}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Preventivi originali con dettagli completi */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-xs">
                {voci.length || mergedFromNumeri.length}
              </span>
              Preventivi originali uniti:
            </h3>
            <div className="space-y-3">
              {voci.length > 0 ? (
                // Se abbiamo le voci dettagliate
                voci.map((voce, index) => {
                  const tipoConfig = TIPO_SERVIZIO_CONFIG[voce.tipoServizio || 'ALTRO'] || TIPO_SERVIZIO_CONFIG.ALTRO;
                  const TipoIcon = tipoConfig.icon;

                  return (
                    <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 hover:border-purple-300 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100">
                            <span className="text-sm font-bold text-purple-700">{index + 1}</span>
                          </div>
                          <div>
                            <span className="font-mono font-medium text-gray-900">{voce.originalNumero || mergedFromNumeri[index] || '-'}</span>
                            <div className="flex items-center gap-2 mt-0.5">
                              <TipoIcon className={`h-3.5 w-3.5 ${tipoConfig.color}`} />
                              <span className="text-xs text-gray-500">{tipoConfig.label}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-gray-900">€ {Number(voce.prezzoTotale || voce.importo || 0).toFixed(2)}</div>
                          {Number(voce.scontoTotale) > 0 && (
                            <div className="text-xs text-red-500">-€ {Number(voce.scontoTotale).toFixed(2)} sconto</div>
                          )}
                        </div>
                      </div>
                      <div className="ml-11">
                        <p className="text-sm font-medium text-gray-700">{voce.titoloServizio || '-'}</p>
                        {voce.descrizioneServizio && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{voce.descrizioneServizio}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                          <span>Qta: {voce.quantita || 1}</span>
                          <span>Prezzo unit.: € {Number(voce.prezzoUnitario || 0).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                // Fallback se non abbiamo le voci dettagliate
                mergedFromNumeri.map((numero: string, index: number) => (
                  <div key={index} className="flex items-center gap-3 bg-gray-50 px-4 py-3 rounded-lg">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100">
                      <span className="text-sm font-bold text-purple-700">{index + 1}</span>
                    </div>
                    <div>
                      <span className="font-mono font-medium text-gray-900">{numero}</span>
                      {mergedFromIds[index] && (
                        <span className="ml-2 text-xs text-gray-400">ID: {mergedFromIds[index].slice(0, 8)}...</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Riepilogo totali */}
          <div className="bg-purple-50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-purple-700 mb-3">Riepilogo</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Totale preventivi originali:</span>
                <span className="font-medium text-gray-900">€ {totalePreventivi.toFixed(2)}</span>
              </div>
              {totaleSconti > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Totale sconti:</span>
                  <span className="font-medium text-red-600">-€ {totaleSconti.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-purple-200">
                <span className="font-semibold text-gray-700">Imponibile:</span>
                <span className="font-bold text-gray-900">€ {Number(preventivo.imponibile || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">IVA ({preventivo.aliquotaIva || 22}%):</span>
                <span className="font-medium text-gray-900">€ {Number(preventivo.importoIva || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-purple-200">
                <span className="font-bold text-purple-700">Totale unificato:</span>
                <span className="font-bold text-lg text-purple-700">€ {Number(preventivo.importoFinale || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <Button variant="outline" onClick={onClose}>Chiudi</Button>
        </div>
      </div>
    </div>,
    document.body
  );
};

// ============================================================================
// Apply Sconto Modal
// ============================================================================

interface ApplyScontoModalProps {
  isOpen: boolean;
  onClose: () => void;
  preventivo: Preventivo | null;
  onApply: (preventivoId: string, codice: string) => Promise<void>;
}

const ApplyScontoModal: React.FC<ApplyScontoModalProps> = ({ isOpen, onClose, preventivo, onApply }) => {
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Codice Sconto</label>
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

// ============================================================================
// Quicklook Modal - Preview rapido del preventivo
// ============================================================================

interface QuicklookModalProps {
  isOpen: boolean;
  onClose: () => void;
  preventivo: Preventivo | null;
  onEdit: () => void;
  onDownloadPdf: () => void;
}

const QuicklookModal: React.FC<QuicklookModalProps> = ({ isOpen, onClose, preventivo, onEdit, onDownloadPdf }) => {
  if (!isOpen || !preventivo) return null;

  const statusConfig = STATUS_CONFIG[preventivo.stato] || STATUS_CONFIG.BOZZA;
  const StatusIcon = statusConfig.icon;
  const tipoConfig = TIPO_SERVIZIO_CONFIG[preventivo.tipoServizio] || TIPO_SERVIZIO_CONFIG.ALTRO;
  const TipoIcon = tipoConfig.icon;

  const voci = preventivo.dettagliServizio?.voci || [];

  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-orange-500 to-orange-600">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Anteprima Preventivo
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
            <X className="h-5 w-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[55vh]">
          {/* Header info */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <FileText className="h-6 w-6 text-gray-400" />
              <span className="font-mono font-bold text-xl text-gray-900">{preventivo.numero}</span>
            </div>
            <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium ${statusConfig.className}`}>
              <StatusIcon className="h-4 w-4" />
              {statusConfig.label}
            </span>
          </div>

          {/* Cliente */}
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              {preventivo.azienda ? (
                <>
                  <Building2 className="h-4 w-4 text-gray-500" />
                  <span className="font-medium text-gray-900">{preventivo.azienda.ragioneSociale}</span>
                </>
              ) : preventivo.persona ? (
                <>
                  <User className="h-4 w-4 text-gray-500" />
                  <span className="font-medium text-gray-900">{preventivo.persona.firstName} {preventivo.persona.lastName}</span>
                </>
              ) : (
                <span className="text-gray-400">Cliente non specificato</span>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <TipoIcon className={`h-4 w-4 ${tipoConfig.color}`} />
                <span>{tipoConfig.label}</span>
              </div>
              {preventivo.dataEmissione && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{format(new Date(preventivo.dataEmissione), 'dd/MM/yyyy', { locale: it })}</span>
                </div>
              )}
            </div>
          </div>

          {/* Servizio */}
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-500 mb-1">Servizio</h3>
            <p className="font-medium text-gray-900">{preventivo.titoloServizio || '-'}</p>
            {/* Mostra descrizione senza la sezione "Dettaglio voci:" che viene aggiunta automaticamente */}
            {preventivo.descrizioneServizio && !preventivo.descrizioneServizio.includes('Dettaglio voci:') && (
              <p className="text-sm text-gray-600 mt-1 line-clamp-3">{preventivo.descrizioneServizio}</p>
            )}
            {preventivo.descrizioneServizio && preventivo.descrizioneServizio.includes('Dettaglio voci:') && (
              <p className="text-sm text-gray-600 mt-1 line-clamp-3">
                {preventivo.descrizioneServizio.split('Dettaglio voci:')[0].trim()}
              </p>
            )}
          </div>

          {/* Voci se presenti */}
          {voci.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Dettaglio voci</h3>
              <div className="space-y-2">
                {voci.slice(0, 5).map((voce: any, index: number) => (
                  <div key={index} className="flex justify-between items-center text-sm bg-gray-50 px-3 py-2 rounded">
                    <div className="flex-1">
                      <span className="text-gray-700">{voce.descrizione || voce.titoloServizio || '-'}</span>
                      {voce.quantita && voce.quantita > 1 && (
                        <span className="text-gray-500 text-xs ml-2">x{voce.quantita}</span>
                      )}
                    </div>
                    <span className="font-medium text-gray-900">€ {Number(voce.subtotale || voce.importo || voce.prezzoTotale || 0).toFixed(2)}</span>
                  </div>
                ))}
                {voci.length > 5 && (
                  <p className="text-xs text-gray-400 text-center">+{voci.length - 5} altre voci</p>
                )}
              </div>
            </div>
          )}

          {/* Sconti */}
          {preventivo.sconti && preventivo.sconti.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Sconti applicati</h3>
              <div className="space-y-1">
                {preventivo.sconti.map((sconto: any, index: number) => (
                  <div key={index} className="flex items-center justify-between text-sm bg-green-50 px-3 py-2 rounded">
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-green-600" />
                      <span className="text-green-700">{sconto.codiceTesto || sconto.codice?.codice || 'Sconto'}</span>
                      {sconto.tipoSconto === 'PERCENTUALE' && sconto.valoreSconto && (
                        <span className="text-green-500 text-xs">({Number(sconto.valoreSconto)}%)</span>
                      )}
                    </div>
                    <span className="font-medium text-green-600">-€ {Number(sconto.importoScontato || 0).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Totali con breakdown chiaro */}
          <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
            <div className="space-y-2 text-sm">
              {/* Subtotale voci (prezzo originale) */}
              {(() => {
                const totaleVoci = voci.length > 0
                  ? voci.reduce((sum: number, v: any) => sum + Number(v.subtotale || v.importo || v.prezzoTotale || 0), 0)
                  : Number(preventivo.prezzoTotale || preventivo.imponibile || 0);
                const hasSconti = preventivo.sconti && preventivo.sconti.length > 0;
                const totaleSconto = hasSconti && preventivo.sconti
                  ? preventivo.sconti.reduce((sum: number, s: any) => sum + Number(s.importoScontato || 0), 0)
                  : 0;

                return (
                  <>
                    {/* Mostra subtotale solo se c'è sconto applicato */}
                    {hasSconti && totaleSconto > 0 && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Subtotale voci:</span>
                          <span className="font-medium">€ {totaleVoci.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-green-600 bg-green-50 -mx-2 px-2 py-1 rounded">
                          <span className="flex items-center gap-1">
                            <Tag className="h-3.5 w-3.5" />
                            Sconto applicato
                          </span>
                          <span className="font-medium">-€ {totaleSconto.toFixed(2)}</span>
                        </div>
                      </>
                    )}
                  </>
                );
              })()}

              <div className="flex justify-between">
                <span className="text-gray-600">Imponibile:</span>
                <span className="font-medium">€ {Number(preventivo.imponibile || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">IVA ({preventivo.aliquotaIva || 22}%):</span>
                <span className="font-medium">€ {Number(preventivo.importoIva || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-orange-300">
                <span className="text-gray-900 font-semibold">Totale:</span>
                <span className="text-xl font-bold text-orange-600">€ {Number(preventivo.importoFinale || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Note */}
          {preventivo.note && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-500 mb-1">Note</h3>
              <p className="text-sm text-gray-600">{preventivo.note}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-between gap-3 bg-gray-50">
          <Button variant="outline" onClick={onClose}>
            Chiudi
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onDownloadPdf} className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              PDF
            </Button>
            <Button variant="primary" onClick={onEdit} className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Modifica
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

// ============================================================================
// Edit Preventivo Modal
// ============================================================================

interface EditPreventivoModalProps {
  isOpen: boolean;
  onClose: () => void;
  preventivo: Preventivo | null;
  onSubmit: (id: string, data: Partial<CreatePreventivoData>) => Promise<void>;
  onRemoveSconto?: (preventivoId: string, scontoId: string) => Promise<any>;
  onApplySconto?: (preventivoId: string, codiceSconto: string) => Promise<any>;
  onRefresh?: () => void;
}

const EditPreventivoModal: React.FC<EditPreventivoModalProps> = ({
  isOpen, onClose, preventivo, onSubmit, onRemoveSconto, onApplySconto, onRefresh
}) => {
  const [formData, setFormData] = useState<CreatePreventivoData>({
    tipoServizio: 'CORSO',
    titoloServizio: '',
    descrizioneServizio: '',
    prezzoTotale: 0,
    aliquotaIva: 22,
    note: '',
    voci: [{ id: '1', descrizione: '', quantita: 1, prezzoUnitario: 0, subtotale: 0 }],
    codiceSconto: ''
  });
  const [loading, setLoading] = useState(false);
  const [scontoInfo, setScontoInfo] = useState<{
    id: string;
    codiceTesto: string;
    tipoSconto: string;
    valoreSconto: number;
    importoScontato: number;
    cumulabile?: boolean;
  } | null>(null);

  // Stato per validazione e preview sconto
  const [scontoValidation, setScontoValidation] = useState<{
    isValid: boolean;
    isValidating: boolean;
    error: string | null;
    preview: {
      tipoSconto: string;
      valore: number;
      importoSconto: number;
      cumulabile: boolean;
    } | null;
  }>({ isValid: false, isValidating: false, error: null, preview: null });

  // Popola il form quando il preventivo cambia
  useEffect(() => {
    if (preventivo && isOpen) {
      const dettagliVoci = preventivo.dettagliServizio?.voci || [];

      // IMPORTANTE: prezzoTotale è il prezzo ORIGINALE (prima dello sconto)
      // imponibile è il prezzo DOPO lo sconto
      const prezzoOriginale = Number(preventivo.prezzoTotale || preventivo.imponibile || 0);

      const voci: PreventivoVoce[] = dettagliVoci.length > 0
        ? dettagliVoci.map((v: any, i: number) => ({
          id: String(i + 1),
          descrizione: v.descrizione || v.titoloServizio || '',
          quantita: v.quantita || 1,
          prezzoUnitario: Number(v.prezzoUnitario || v.importo || 0),
          subtotale: Number(v.prezzoTotale || v.subtotale || v.importo || 0)
        }))
        : [{
          id: '1',
          descrizione: preventivo.titoloServizio || '',
          quantita: 1,
          prezzoUnitario: prezzoOriginale,
          subtotale: prezzoOriginale
        }];

      // Controlla se c'è già uno sconto applicato
      if (preventivo.sconti && preventivo.sconti.length > 0) {
        const sconto = preventivo.sconti[0];
        setScontoInfo({
          id: sconto.id,
          codiceTesto: sconto.codiceTesto || sconto.nomeCodice || '',
          tipoSconto: sconto.tipoSconto || 'PERCENTUALE',
          valoreSconto: sconto.valoreSconto || 0,
          importoScontato: sconto.importoScontato || 0
        });
      } else {
        setScontoInfo(null);
      }

      setFormData({
        tipoServizio: preventivo.tipoServizio as any || 'ALTRO',
        titoloServizio: preventivo.titoloServizio || '',
        descrizioneServizio: preventivo.descrizioneServizio || '',
        prezzoTotale: prezzoOriginale, // Usa prezzo originale, NON imponibile
        aliquotaIva: Number(preventivo.aliquotaIva || 22),
        note: preventivo.note || '',
        aziendaId: preventivo.aziendaId || undefined,
        personaId: preventivo.personaId || undefined,
        corsoId: preventivo.corsoId || undefined,
        voci,
        codiceSconto: ''
      });

      // Reset validazione sconto
      setScontoValidation({ isValid: false, isValidating: false, error: null, preview: null });
    }
  }, [preventivo, isOpen]);

  // Valida codice sconto in tempo reale
  const validateCodiceSconto = async (codice: string) => {
    if (!codice || codice.length < 3) {
      setScontoValidation({ isValid: false, isValidating: false, error: null, preview: null });
      return;
    }

    setScontoValidation(prev => ({ ...prev, isValidating: true, error: null }));

    try {
      const totaleVoci = (formData.voci || []).reduce((sum, v) => sum + v.subtotale, 0);
      const response = await apiPost<any>('/api/v1/codici-sconto/valida-preview', {
        codice,
        importo: totaleVoci,
        tipoServizio: formData.tipoServizio
      });

      if (response.valido) {
        const preview = {
          tipoSconto: response.codice.tipoSconto,
          valore: response.codice.valore,
          importoSconto: response.importoSconto,
          cumulabile: response.codice.cumulabile
        };
        setScontoValidation({
          isValid: true,
          isValidating: false,
          error: null,
          preview
        });
      } else {
        setScontoValidation({
          isValid: false,
          isValidating: false,
          error: response.motivo || 'Codice non valido',
          preview: null
        });
      }
    } catch (err: any) {
      setScontoValidation({
        isValid: false,
        isValidating: false,
        error: err.response?.data?.error || 'Errore validazione codice',
        preview: null
      });
    }
  };

  // Debounce validazione codice
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.codiceSconto && formData.codiceSconto.length >= 3) {
        validateCodiceSconto(formData.codiceSconto);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [formData.codiceSconto, formData.voci]);

  // Gestione rimozione sconto
  const handleRemoveSconto = async () => {
    if (!preventivo || !scontoInfo || !onRemoveSconto) return;

    setLoading(true);
    try {
      await onRemoveSconto(preventivo.id, scontoInfo.id);
      setScontoInfo(null);
      onRefresh?.();
    } catch (err: any) {
      console.error('Errore rimozione sconto:', err);
    } finally {
      setLoading(false);
    }
  };

  // Gestione applicazione nuovo sconto
  const handleApplySconto = async () => {
    if (!preventivo || !formData.codiceSconto || !scontoValidation.isValid || !onApplySconto) return;

    setLoading(true);
    try {
      await onApplySconto(preventivo.id, formData.codiceSconto);
      setFormData(prev => ({ ...prev, codiceSconto: '' }));
      setScontoValidation({ isValid: false, isValidating: false, error: null, preview: null });
      onRefresh?.();
      onClose();
    } catch (err: any) {
      const errorMsg = err.response?.status === 409
        ? 'Sconto già applicato a questo preventivo'
        : err.response?.data?.error || 'Errore applicazione sconto';
      setScontoValidation(prev => ({ ...prev, error: errorMsg }));
    } finally {
      setLoading(false);
    }
  };

  // Calcola subtotale per una voce
  const updateVoceSubtotale = (voce: PreventivoVoce): PreventivoVoce => ({
    ...voce,
    subtotale: voce.quantita * voce.prezzoUnitario
  });

  // Aggiungi nuova voce
  const addVoce = () => {
    const newVoci = [...(formData.voci || []), {
      id: Date.now().toString(),
      descrizione: '',
      quantita: 1,
      prezzoUnitario: 0,
      subtotale: 0
    }];
    setFormData({ ...formData, voci: newVoci });
  };

  // Rimuovi voce
  const removeVoce = (id: string) => {
    if ((formData.voci?.length || 0) <= 1) return;
    const newVoci = (formData.voci || []).filter(v => v.id !== id);
    setFormData({ ...formData, voci: newVoci });
  };

  // Aggiorna voce
  const updateVoce = (id: string, field: keyof PreventivoVoce, value: string | number) => {
    const newVoci = (formData.voci || []).map(v => {
      if (v.id !== id) return v;
      const updated = { ...v, [field]: value };
      return updateVoceSubtotale(updated);
    });
    setFormData({ ...formData, voci: newVoci });
  };

  // Calcola totali
  const totaleVoci = (formData.voci || []).reduce((sum, v) => sum + v.subtotale, 0);
  const imponibile = totaleVoci;
  const importoIva = imponibile * (formData.aliquotaIva / 100);
  const importoFinale = imponibile + importoIva;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!preventivo) return;

    setLoading(true);
    try {
      const vociDescription = (formData.voci || [])
        .filter(v => v.descrizione && v.subtotale > 0)
        .map(v => `• ${v.descrizione}: ${v.quantita} x €${v.prezzoUnitario.toFixed(2)} = €${v.subtotale.toFixed(2)}`)
        .join('\n');

      const fullDescription = vociDescription
        ? `${formData.descrizioneServizio || ''}\n\nDettaglio voci:\n${vociDescription}`.trim()
        : formData.descrizioneServizio;

      await onSubmit(preventivo.id, {
        ...formData,
        prezzoTotale: totaleVoci,
        descrizioneServizio: fullDescription
      });
      onClose();
    } catch (err) {
      console.error('Error updating preventivo:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !preventivo) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-500 to-blue-600">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Modifica Preventivo {preventivo.numero}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
            <X className="h-5 w-5 text-white" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]" noValidate>
          <div className="space-y-6">
            {/* Tipo Servizio */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tipo Servizio</label>
              <div className="grid grid-cols-4 gap-2">
                {Object.entries(TIPO_SERVIZIO_CONFIG).map(([key, config]) => {
                  const Icon = config.icon;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setFormData({ ...formData, tipoServizio: key as any })}
                      className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-1 ${formData.tipoServizio === key
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                        }`}
                    >
                      <Icon className={`h-5 w-5 ${config.color}`} />
                      <span className="text-xs font-medium text-center">{config.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Titolo Servizio */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Titolo Servizio *</label>
              <input
                type="text"
                value={formData.titoloServizio}
                onChange={(e) => setFormData({ ...formData, titoloServizio: e.target.value })}
                placeholder="Es. Corso Sicurezza sul Lavoro"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            {/* VOCI DEL PREVENTIVO */}
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <div className="flex items-center justify-between mb-4">
                <label className="text-sm font-medium text-gray-700">Voci del Preventivo</label>
                <button
                  type="button"
                  onClick={addVoce}
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <Plus className="h-4 w-4" />
                  Aggiungi voce
                </button>
              </div>

              <div className="space-y-3">
                {/* Header */}
                <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 px-1">
                  <div className="col-span-5">Descrizione</div>
                  <div className="col-span-2 text-center">Qtà</div>
                  <div className="col-span-2 text-right">Prezzo Unit.</div>
                  <div className="col-span-2 text-right">Subtotale</div>
                  <div className="col-span-1"></div>
                </div>

                {/* Voci */}
                {(formData.voci || []).map((voce) => (
                  <div key={voce.id} className="grid grid-cols-12 gap-2 items-center bg-white p-2 rounded-lg border border-gray-200">
                    <div className="col-span-5">
                      <input
                        type="text"
                        value={voce.descrizione}
                        onChange={(e) => updateVoce(voce.id, 'descrizione', e.target.value)}
                        placeholder="Es. Partecipante corso base"
                        className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={voce.quantita}
                        onChange={(e) => updateVoce(voce.id, 'quantita', parseInt(e.target.value) || 1)}
                        className="w-full px-3 py-1.5 text-sm text-center border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div className="col-span-2">
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">€</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={voce.prezzoUnitario}
                          onChange={(e) => updateVoce(voce.id, 'prezzoUnitario', parseFloat(e.target.value) || 0)}
                          className="w-full pl-5 pr-2 py-1.5 text-sm text-right border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                    <div className="col-span-2 text-right font-medium text-gray-900 text-sm">
                      € {voce.subtotale.toFixed(2)}
                    </div>
                    <div className="col-span-1 text-center">
                      {(formData.voci?.length || 0) > 1 && (
                        <button
                          type="button"
                          onClick={() => removeVoce(voce.id)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Codice Sconto */}
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-green-600" />
                  Gestione Sconto
                </div>
              </label>

              {/* Sconto già applicato */}
              {scontoInfo && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-green-700">
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="font-medium">Sconto applicato: {scontoInfo.codiceTesto}</span>
                      </div>
                      <div className="mt-1 text-sm text-green-600">
                        {scontoInfo.tipoSconto === 'PERCENTUALE'
                          ? `${scontoInfo.valoreSconto}% = -€${Number(scontoInfo.importoScontato || 0).toFixed(2)}`
                          : `-€${Number(scontoInfo.importoScontato || 0).toFixed(2)}`
                        }
                      </div>
                    </div>
                    {onRemoveSconto && (
                      <button
                        type="button"
                        onClick={handleRemoveSconto}
                        disabled={loading}
                        className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg border border-red-200 flex items-center gap-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Rimuovi
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Input nuovo codice sconto */}
              {(!scontoInfo || scontoInfo.cumulabile) && (
                <div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.codiceSconto || ''}
                      onChange={(e) => setFormData({ ...formData, codiceSconto: e.target.value.toUpperCase() })}
                      placeholder="Inserisci codice sconto"
                      className={`flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 uppercase ${scontoValidation.error ? 'border-red-300' :
                        scontoValidation.isValid ? 'border-green-300' : 'border-gray-300'
                        }`}
                    />
                    {scontoValidation.isValid && onApplySconto && (
                      <button
                        type="button"
                        onClick={handleApplySconto}
                        disabled={loading}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-1"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Applica
                      </button>
                    )}
                  </div>

                  {/* Stato validazione */}
                  {scontoValidation.isValidating && (
                    <div className="mt-1 text-xs text-blue-600 flex items-center gap-1">
                      <span className="animate-spin rounded-full h-3 w-3 border-b border-blue-600"></span>
                      Verifica codice in corso...
                    </div>
                  )}
                  {scontoValidation.error && (
                    <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {scontoValidation.error}
                    </p>
                  )}
                  {scontoValidation.isValid && scontoValidation.preview && (
                    <div className="mt-2 p-2 bg-green-50 rounded border border-green-200 text-sm">
                      <div className="flex items-center gap-1 text-green-700">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span className="font-medium">Codice valido!</span>
                      </div>
                      <div className="text-green-600 mt-1">
                        {scontoValidation.preview.tipoSconto === 'PERCENTUALE'
                          ? `Sconto ${scontoValidation.preview.valore}% = -€${scontoValidation.preview.importoSconto.toFixed(2)}`
                          : `Sconto fisso: -€${scontoValidation.preview.importoSconto.toFixed(2)}`
                        }
                        {scontoValidation.preview.cumulabile && (
                          <span className="ml-2 text-xs bg-green-200 px-1.5 py-0.5 rounded">Cumulabile</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* IVA */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Aliquota IVA</label>
              <select
                value={formData.aliquotaIva}
                onChange={(e) => setFormData({ ...formData, aliquotaIva: parseFloat(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="0">0% (Esente)</option>
                <option value="4">4%</option>
                <option value="10">10%</option>
                <option value="22">22%</option>
              </select>
            </div>

            {/* Totali Preview con dettaglio sconto */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h4 className="font-medium text-gray-700 mb-3">Riepilogo Economico</h4>
              <div className="space-y-2 text-sm">
                {/* Subtotale voci */}
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotale voci ({(formData.voci || []).filter(v => v.subtotale > 0).length}):</span>
                  <span className="font-medium">€ {totaleVoci.toFixed(2)}</span>
                </div>

                {/* Sconto applicato */}
                {scontoInfo && (
                  <div className="flex justify-between text-green-700 bg-green-50 -mx-2 px-2 py-1 rounded">
                    <span className="flex items-center gap-1">
                      <Tag className="h-3.5 w-3.5" />
                      Sconto ({scontoInfo.codiceTesto})
                      {scontoInfo.tipoSconto === 'PERCENTUALE' && ` ${scontoInfo.valoreSconto}%`}
                    </span>
                    <span className="font-medium">-€ {Number(scontoInfo.importoScontato || 0).toFixed(2)}</span>
                  </div>
                )}

                {/* Preview sconto nuovo (non ancora applicato) */}
                {!scontoInfo && scontoValidation.isValid && scontoValidation.preview && (
                  <div className="flex justify-between text-amber-700 bg-amber-50 -mx-2 px-2 py-1 rounded">
                    <span className="flex items-center gap-1">
                      <Tag className="h-3.5 w-3.5" />
                      Sconto (da applicare)
                      {scontoValidation.preview.tipoSconto === 'PERCENTUALE' && ` ${scontoValidation.preview.valore}%`}
                    </span>
                    <span className="font-medium">-€ {scontoValidation.preview.importoSconto.toFixed(2)}</span>
                  </div>
                )}

                {/* Imponibile */}
                <div className="flex justify-between">
                  <span className="text-gray-600">Imponibile:</span>
                  <span className="font-medium">€ {(
                    totaleVoci -
                    (scontoInfo?.importoScontato || 0) -
                    (scontoValidation.preview?.importoSconto || 0)
                  ).toFixed(2)}</span>
                </div>

                {/* IVA */}
                <div className="flex justify-between">
                  <span className="text-gray-600">IVA ({formData.aliquotaIva}%):</span>
                  <span className="font-medium">€ {(
                    (totaleVoci - (scontoInfo?.importoScontato || 0) - (scontoValidation.preview?.importoSconto || 0))
                    * (formData.aliquotaIva / 100)
                  ).toFixed(2)}</span>
                </div>

                {/* Totale finale */}
                <div className="flex justify-between pt-2 border-t border-blue-300">
                  <span className="text-gray-900 font-semibold">TOTALE:</span>
                  <span className="text-xl font-bold text-blue-600">€ {(
                    (totaleVoci - (scontoInfo?.importoScontato || 0) - (scontoValidation.preview?.importoSconto || 0))
                    * (1 + formData.aliquotaIva / 100)
                  ).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Note */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Note</label>
              <textarea
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                placeholder="Note aggiuntive..."
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </form>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 bg-gray-50">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Annulla
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={loading || !formData.titoloServizio || totaleVoci <= 0}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Salva Modifiche
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
};

// ============================================================================
// Main Component
// ============================================================================

const PreventiviPage: React.FC = () => {
  // CRITICAL: Wait for auth to complete before fetching data
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const { showToast } = useToast();

  const {
    preventivi,
    loading,
    error,
    pagination,
    fetchPreventivi,
    createPreventivo,
    updatePreventivo,
    deletePreventivo,
    bulkDelete,
    applySconto,
    removeSconto,
    generatePdf,
    changeStato,
    mergePreventivi,
    unmergePreventivo
  } = usePreventivi();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStato, setFilterStato] = useState<string>('all');
  const [filterTipo, setFilterTipo] = useState<string>('all');
  const [filterPeriodo, setFilterPeriodo] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [showScontoModal, setShowScontoModal] = useState(false);
  const [showMergedDetailsModal, setShowMergedDetailsModal] = useState(false);
  const [showQuicklookModal, setShowQuicklookModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedForSconto, setSelectedForSconto] = useState<Preventivo | null>(null);
  const [selectedMergedPreventivo, setSelectedMergedPreventivo] = useState<Preventivo | null>(null);
  const [selectedPreventivo, setSelectedPreventivo] = useState<Preventivo | null>(null);
  const [showStatusDropdown, setShowStatusDropdown] = useState<string | null>(null);
  const [statusDropdownPosition, setStatusDropdownPosition] = useState<{ top: number; left: number } | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Stati per i ConfirmModal eleganti
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [confirmUnmerge, setConfirmUnmerge] = useState<Preventivo | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  // CRITICAL FIX: Only fetch preventivi AFTER auth is complete
  // This prevents API calls before token is available (causing empty data on reload)
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      fetchPreventivi();
    }
  }, [authLoading, isAuthenticated, fetchPreventivi]);

  // Helper per filtrare per periodo
  const filterByPeriod = (date: string | undefined, period: string): boolean => {
    if (!date || period === 'all') return true;
    const d = new Date(date);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (period) {
      case 'last30':
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return d >= thirtyDaysAgo && d <= now;
      case 'last90':
        const ninetyDaysAgo = new Date(today);
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        return d >= ninetyDaysAgo && d <= now;
      case 'lastYear':
        const oneYearAgo = new Date(today);
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        return d >= oneYearAgo && d <= now;
      case 'thisMonth':
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      case 'thisYear':
        return d.getFullYear() === now.getFullYear();
      case 'next30':
        const thirtyDaysLater = new Date(today);
        thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
        return d >= today && d <= thirtyDaysLater;
      case 'next90':
        const ninetyDaysLater = new Date(today);
        ninetyDaysLater.setDate(ninetyDaysLater.getDate() + 90);
        return d >= today && d <= ninetyDaysLater;
      default:
        return true;
    }
  };

  // Stats con separazione compensi formatori
  const stats = useMemo(() => {
    // Exclude preventivi that were merged into another (they're archived source preventivi)
    const all = (preventivi || []).filter(p => !p.dettagliServizio?.mergedIntoId);

    // Separa preventivi normali da compensi formatori
    const preventiviNormali = all.filter(p => p.tipoServizio !== 'COMPENSO_FORMATORE');
    const compensiFormatori = all.filter(p => p.tipoServizio === 'COMPENSO_FORMATORE');

    // Applica filtro periodo se attivo
    const filteredNormali = preventiviNormali.filter(p => filterByPeriod(p.dataEmissione, filterPeriodo));
    const filteredCompensi = compensiFormatori.filter(p => filterByPeriod(p.dataEmissione, filterPeriodo));

    // Per le entrate, escludiamo BOZZA, INVIATO, RIFIUTATO e SCADUTO (non sono entrate confermate)
    const STATI_ESCLUSI_ENTRATE = ['BOZZA', 'INVIATO', 'RIFIUTATO', 'SCADUTO'];
    const valoreEntrate = filteredNormali
      .filter(p => !STATI_ESCLUSI_ENTRATE.includes(p.stato))
      .reduce((sum, p) => sum + Number(p.importoFinale || 0), 0);
    const valoreCompensi = filteredCompensi.reduce((sum, p) => sum + Number(p.importoFinale || 0), 0);

    return {
      total: all.length,
      bozze: all.filter(p => p.stato === 'BOZZA').length,
      inviati: all.filter(p => p.stato === 'INVIATO').length,
      accettati: all.filter(p => p.stato === 'ACCETTATO').length,
      rifiutati: all.filter(p => p.stato === 'RIFIUTATO').length,
      fatturati: all.filter(p => p.stato === 'FATTURATO').length,
      // Valori finanziari
      valoreEntrate, // Totale preventivi (esclusi compensi)
      valoreCompensi, // Totale compensi formatori
      valoreNetto: valoreEntrate - valoreCompensi, // Differenza
      numCompensi: filteredCompensi.length,
      // Compensi per stato
      compensiBozze: compensiFormatori.filter(p => p.stato === 'BOZZA').length,
      compensiAccettati: compensiFormatori.filter(p => p.stato === 'ACCETTATO').length
    };
  }, [preventivi, filterPeriodo]);

  // Filtered documents - exclude preventivi that were merged into another one
  // Ordinati cronologicamente dal più recente al meno recente
  const filteredPreventivi = useMemo(() => {
    const filtered = (preventivi || []).filter(p => {
      // Exclude preventivi that have been merged into another (they're archived source preventivi)
      if (p.dettagliServizio?.mergedIntoId) return false;

      if (filterStato !== 'all' && p.stato !== filterStato) return false;
      if (filterTipo !== 'all' && p.tipoServizio !== filterTipo) return false;
      if (!filterByPeriod(p.dataEmissione, filterPeriodo)) return false;

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          p.numero?.toLowerCase().includes(q) ||
          p.azienda?.ragioneSociale?.toLowerCase().includes(q) ||
          p.persona?.firstName?.toLowerCase().includes(q) ||
          p.persona?.lastName?.toLowerCase().includes(q) ||
          p.tipoServizio?.toLowerCase().includes(q) ||
          p.titoloServizio?.toLowerCase().includes(q) ||
          p.schedule?.course?.title?.toLowerCase().includes(q)
        );
      }

      return true;
    });

    // Ordinamento cronologico: dal più recente al meno recente (per data creazione)
    return filtered.sort((a, b) => {
      const dateA = new Date(a.createdAt || a.dataEmissione || 0).getTime();
      const dateB = new Date(b.createdAt || b.dataEmissione || 0).getTime();
      return dateB - dateA; // Ordine decrescente (più recente prima)
    });
  }, [preventivi, filterStato, filterTipo, filterPeriodo, searchQuery]);

  const selectedPreventivi = preventivi.filter(p => selectedIds.includes(p.id));
  const canMerge = selectedIds.length >= 2 && selectedPreventivi.some(
    (p, _, arr) => arr.filter(x => x.aziendaId === p.aziendaId).length >= 2
  );

  // Può separare solo se è selezionato esattamente UN preventivo merged
  const canUnmerge = selectedIds.length === 1 &&
    selectedPreventivi[0]?.dettagliServizio?.mergedFromIds?.length > 0;

  const handleCreate = async (data: CreatePreventivoData) => {
    const { codiceSconto, ...preventivoData } = data;
    const newPreventivo = await createPreventivo(preventivoData as any);

    // Applica codice sconto se fornito
    if (codiceSconto && newPreventivo?.id) {
      try {
        await applySconto(newPreventivo.id, codiceSconto);
        showToast({ message: `Preventivo creato e sconto "${codiceSconto}" applicato`, type: 'success' });
      } catch (scontoErr: any) {
        showToast({ message: `Preventivo creato, ma errore applicazione sconto: ${scontoErr?.message || 'codice non valido'}`, type: 'warning' });
      }
    }
  };

  // Apre il quicklook di un preventivo
  const handleQuicklook = (preventivo: Preventivo) => {
    setSelectedPreventivo(preventivo);
    setShowQuicklookModal(true);
  };

  // Apre il modal di modifica di un preventivo
  const handleEdit = (preventivo: Preventivo) => {
    setSelectedPreventivo(preventivo);
    setShowEditModal(true);
    setShowQuicklookModal(false); // Chiudi quicklook se aperto
  };

  // Salva le modifiche al preventivo
  const handleUpdate = async (id: string, data: Partial<CreatePreventivoData>) => {
    const { codiceSconto, ...preventivoData } = data;
    try {
      await updatePreventivo(id, preventivoData as any);

      // Applica codice sconto se fornito
      if (codiceSconto) {
        try {
          await applySconto(id, codiceSconto);
          showToast({ message: `Preventivo aggiornato e sconto "${codiceSconto}" applicato`, type: 'success' });
        } catch (scontoErr: any) {
          // Gestisci errore 409 - sconto già applicato
          const statusCode = scontoErr?.response?.status;
          const errorMsg = scontoErr?.response?.data?.error || scontoErr?.message || 'codice non valido';

          if (statusCode === 409 || errorMsg.includes('già applicato')) {
            showToast({
              message: `Preventivo aggiornato. Il codice sconto "${codiceSconto}" è già stato applicato a questo preventivo.`,
              type: 'info'
            });
          } else {
            showToast({
              message: `Preventivo aggiornato, ma errore applicazione sconto: ${errorMsg}`,
              type: 'warning'
            });
          }
        }
      } else {
        showToast({ message: 'Preventivo aggiornato con successo', type: 'success' });
      }
    } catch (err: any) {
      showToast({ message: err?.message || 'Errore durante l\'aggiornamento', type: 'error' });
      throw err;
    }
  };

  // Mostra modal di conferma eliminazione singola
  const handleDelete = (id: string) => {
    setConfirmDeleteId(id);
  };

  // Conferma eliminazione singola
  const handleConfirmDelete = async () => {
    if (!confirmDeleteId) return;
    setConfirmLoading(true);
    try {
      await deletePreventivo(confirmDeleteId);
      showToast({ message: 'Preventivo eliminato con successo', type: 'success' });
    } catch (err: any) {
      showToast({ message: err?.message || 'Errore durante l\'eliminazione', type: 'error' });
    } finally {
      setConfirmLoading(false);
      setConfirmDeleteId(null);
    }
  };

  // Mostra modal di conferma eliminazione multipla
  const handleBulkDelete = () => {
    setConfirmBulkDelete(true);
  };

  // Conferma eliminazione multipla
  const handleConfirmBulkDelete = async () => {
    setConfirmLoading(true);
    try {
      await bulkDelete(selectedIds);
      setSelectedIds([]);
      showToast({ message: `${selectedIds.length} preventivi eliminati con successo`, type: 'success' });
    } catch (err: any) {
      showToast({ message: err?.message || 'Errore durante l\'eliminazione', type: 'error' });
    } finally {
      setConfirmLoading(false);
      setConfirmBulkDelete(false);
    }
  };

  const handleDownloadPdf = async (id: string) => {
    try {
      const { blob, filename } = await generatePdf(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // Usa il filename dal server se disponibile, altrimenti fallback
      a.download = filename || `preventivo-${id}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      showToast({ message: 'Errore nel download del PDF', type: 'error' });
    }
  };

  const handleApplySconto = async (preventivoId: string, codice: string) => {
    await applySconto(preventivoId, codice);
  };

  const handleMerge = async (aziendaId: string, ids: string[]) => {
    try {
      const result = await mergePreventivi(ids);
      setSelectedIds([]);
      setShowMergeModal(false);
      showToast({
        message: `${ids.length} preventivi uniti con successo! Nuovo preventivo: ${result.preventivo.numero}`,
        type: 'success',
        duration: 5000
      });
      // Refresh per mostrare il nuovo preventivo
      await fetchPreventivi();
    } catch (err: any) {
      showToast({ message: err.message || 'Impossibile unire i preventivi', type: 'error' });
    }
  };

  // Mostra modal di conferma separazione
  const handleUnmergePreventivo = (preventivo: Preventivo) => {
    const mergedFromIds = preventivo.dettagliServizio?.mergedFromIds;
    if (!mergedFromIds || mergedFromIds.length === 0) {
      showToast({ message: 'Questo preventivo non è unito da altri preventivi', type: 'error' });
      return;
    }
    setConfirmUnmerge(preventivo);
  };

  // Conferma separazione preventivi
  const handleConfirmUnmerge = async () => {
    if (!confirmUnmerge) return;
    setConfirmLoading(true);
    try {
      const result = await unmergePreventivo(confirmUnmerge.id);
      showToast({
        message: `Preventivi separati con successo! Ripristinati ${result.restoredPreventivi.length} preventivi originali.`,
        type: 'success',
        duration: 5000
      });
      // Refresh per mostrare i preventivi ripristinati
      await fetchPreventivi();
      setSelectedIds([]);
    } catch (err: any) {
      showToast({ message: err.message || 'Impossibile separare i preventivi', type: 'error' });
    } finally {
      setConfirmLoading(false);
      setConfirmUnmerge(null);
    }
  };

  const handleChangeStato = async (id: string, nuovoStato: string) => {
    try {
      await changeStato(id, nuovoStato);
      setShowStatusDropdown(null);
      showToast({ message: `Stato aggiornato a ${nuovoStato}`, type: 'success' });
    } catch (err: any) {
      showToast({ message: err?.message || 'Errore nel cambio stato del preventivo', type: 'error' });
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Show loading while auth is verifying OR while data is loading
  if (authLoading || (loading && preventivi.length === 0)) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Preventivi</h1>
            <p className="text-gray-500">Gestisci preventivi</p>
          </div>
          <div className="flex items-center gap-3">
            <ViewModeToggle
              viewMode={viewMode === 'cards' ? 'grid' : 'table'}
              onChange={(mode) => setViewMode(mode === 'grid' ? 'cards' : 'table')}
              gridLabel="Cards"
              tableLabel="Tabella"
            />
            <Button
              variant="primary"
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Nuovo Preventivo
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Totale</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <FileText className="h-8 w-8 text-gray-400" />
          </div>
        </div>

        <div
          className={`rounded-xl shadow-sm border p-4 cursor-pointer hover:shadow-md transition-shadow ${filterStato === 'BOZZA' ? 'bg-gray-100 border-gray-400' : 'bg-gray-50 border-gray-200'
            }`}
          onClick={() => setFilterStato(filterStato === 'BOZZA' ? 'all' : 'BOZZA')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Bozze</p>
              <p className="text-2xl font-bold text-gray-900">{stats.bozze}</p>
            </div>
            <Clock className="h-8 w-8 text-gray-500" />
          </div>
        </div>

        <div
          className={`rounded-xl shadow-sm border p-4 cursor-pointer hover:shadow-md transition-shadow ${filterStato === 'INVIATO' ? 'bg-blue-100 border-blue-400' : 'bg-blue-50 border-blue-200'
            }`}
          onClick={() => setFilterStato(filterStato === 'INVIATO' ? 'all' : 'INVIATO')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 mb-1">Inviati</p>
              <p className="text-2xl font-bold text-blue-900">{stats.inviati}</p>
            </div>
            <Send className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div
          className={`rounded-xl shadow-sm border p-4 cursor-pointer hover:shadow-md transition-shadow ${filterStato === 'ACCETTATO' ? 'bg-green-100 border-green-400' : 'bg-green-50 border-green-200'
            }`}
          onClick={() => setFilterStato(filterStato === 'ACCETTATO' ? 'all' : 'ACCETTATO')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 mb-1">Accettati</p>
              <p className="text-2xl font-bold text-green-900">{stats.accettati}</p>
            </div>
            <ThumbsUp className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div
          className={`rounded-xl shadow-sm border p-4 cursor-pointer hover:shadow-md transition-shadow ${filterStato === 'RIFIUTATO' ? 'bg-red-100 border-red-400' : 'bg-red-50 border-red-200'
            }`}
          onClick={() => setFilterStato(filterStato === 'RIFIUTATO' ? 'all' : 'RIFIUTATO')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-600 mb-1">Rifiutati</p>
              <p className="text-2xl font-bold text-red-900">{stats.rifiutati}</p>
            </div>
            <XCircle className="h-8 w-8 text-red-500" />
          </div>
        </div>

        <div
          className={`rounded-xl shadow-sm border p-4 cursor-pointer hover:shadow-md transition-shadow ${filterStato === 'FATTURATO' ? 'bg-purple-100 border-purple-400' : 'bg-purple-50 border-purple-200'
            }`}
          onClick={() => setFilterStato(filterStato === 'FATTURATO' ? 'all' : 'FATTURATO')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-600 mb-1">Fatturati</p>
              <p className="text-2xl font-bold text-purple-900">{stats.fatturati}</p>
            </div>
            <Receipt className="h-8 w-8 text-purple-500" />
          </div>
        </div>

        {/* Filtro Periodo */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-2">Periodo</p>
          <select
            value={filterPeriodo}
            onChange={(e) => setFilterPeriodo(e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1 focus:ring-1 focus:ring-orange-500"
          >
            <option value="all">Tutti</option>
            <option value="thisMonth">Questo mese</option>
            <option value="last30">Ultimi 30gg</option>
            <option value="last90">Ultimi 90gg</option>
            <option value="thisYear">Quest'anno</option>
            <option value="lastYear">Ultimo anno</option>
            <option value="next30">Prossimi 30gg</option>
            <option value="next90">Prossimi 90gg</option>
          </select>
        </div>
      </div>

      {/* Financial Summary - Entrate vs Compensi */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-sm p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-100 mb-1">Entrate Preventivi</p>
              <p className="text-2xl font-bold">€ {stats.valoreEntrate.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-200" />
          </div>
        </div>

        <div
          className={`rounded-xl shadow-sm p-4 cursor-pointer transition-all ${filterTipo === 'COMPENSO_FORMATORE'
            ? 'bg-amber-600 text-white'
            : 'bg-gradient-to-br from-amber-500 to-amber-600 text-white'
            }`}
          onClick={() => setFilterTipo(filterTipo === 'COMPENSO_FORMATORE' ? 'all' : 'COMPENSO_FORMATORE')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-amber-100 mb-1">Compensi Formatori ({stats.numCompensi})</p>
              <p className="text-2xl font-bold">- € {stats.valoreCompensi.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
            </div>
            <User className="h-8 w-8 text-amber-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-sm p-4 text-white col-span-1 md:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-orange-100 mb-1">Margine Netto (Entrate - Compensi)</p>
              <p className={`text-3xl font-bold ${stats.valoreNetto < 0 ? 'text-red-200' : ''}`}>
                € {stats.valoreNetto.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-orange-200">
                {filterPeriodo !== 'all' && (
                  <span className="bg-orange-400/30 px-2 py-1 rounded">
                    {filterPeriodo === 'last30' ? 'Ultimi 30 giorni' :
                      filterPeriodo === 'last90' ? 'Ultimi 90 giorni' :
                        filterPeriodo === 'thisMonth' ? 'Questo mese' :
                          filterPeriodo === 'thisYear' ? "Quest'anno" :
                            filterPeriodo === 'lastYear' ? 'Ultimo anno' :
                              filterPeriodo === 'next30' ? 'Prossimi 30 giorni' :
                                filterPeriodo === 'next90' ? 'Prossimi 90 giorni' : ''}
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cerca per numero, cliente, tipo..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
          </div>

          <select
            value={filterTipo}
            onChange={(e) => setFilterTipo(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
          >
            <option value="all">Tutti i tipi</option>
            {Object.entries(TIPO_SERVIZIO_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>

          {selectedIds.length > 0 && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowMergeModal(true)}
                disabled={!canMerge}
                className="flex items-center gap-2"
                title={canMerge ? 'Unisci preventivi' : 'Seleziona 2+ preventivi della stessa azienda'}
              >
                <Merge className="h-4 w-4" />
                Unisci ({selectedIds.length})
              </Button>
              {canUnmerge && (
                <Button
                  variant="outline"
                  onClick={() => handleUnmergePreventivo(selectedPreventivi[0])}
                  className="flex items-center gap-2 text-purple-600 border-purple-300 hover:bg-purple-50"
                  title="Separa i preventivi originali dal preventivo unificato"
                >
                  <Scissors className="h-4 w-4" />
                  Separa
                </Button>
              )}
              <Button
                variant="outline"
                onClick={handleBulkDelete}
                className="flex items-center gap-2 text-red-600 border-red-300 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
                Elimina
              </Button>
              <Button
                variant="outline"
                onClick={() => setSelectedIds([])}
              >
                Annulla
              </Button>
            </div>
          )}
        </div>

        {(filterStato !== 'all' || filterTipo !== 'all' || searchQuery) && (
          <div className="flex flex-wrap gap-2 mt-4">
            {filterStato !== 'all' && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm">
                Stato: {STATUS_CONFIG[filterStato]?.label}
                <button onClick={() => setFilterStato('all')}><X className="h-3 w-3" /></button>
              </span>
            )}
            {filterTipo !== 'all' && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                Tipo: {TIPO_SERVIZIO_CONFIG[filterTipo]?.label}
                <button onClick={() => setFilterTipo('all')}><X className="h-3 w-3" /></button>
              </span>
            )}
            <button
              onClick={() => { setFilterStato('all'); setFilterTipo('all'); setSearchQuery(''); }}
              className="text-sm text-gray-600 hover:text-gray-900 underline"
            >
              Cancella filtri
            </button>
          </div>
        )}
      </div>

      {/* Results count */}
      <div className="mb-4 text-sm text-gray-600">
        {filteredPreventivi.length === preventivi.length
          ? `${preventivi.length} preventivi totali`
          : `${filteredPreventivi.length} di ${preventivi.length} preventivi`}
      </div>

      {/* Preventivi Grid */}
      {error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-700">{error}</p>
          <Button variant="outline" onClick={() => fetchPreventivi()} className="mt-4">Riprova</Button>
        </div>
      ) : filteredPreventivi.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Nessun preventivo trovato</h3>
          <p className="text-gray-600 mb-4">
            {searchQuery || filterStato !== 'all' || filterTipo !== 'all'
              ? 'Prova a modificare i filtri di ricerca'
              : 'Crea il tuo primo preventivo'}
          </p>
          <Button variant="primary" onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 mx-auto">
            <Plus className="h-4 w-4" />
            Nuovo Preventivo
          </Button>
        </div>
      ) : viewMode === 'table' ? (
        /* ===== TABLE VIEW ===== */
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-visible">
          <div className="overflow-x-auto overflow-y-visible">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === filteredPreventivi.length && filteredPreventivi.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds(filteredPreventivi.map(p => p.id));
                        } else {
                          setSelectedIds([]);
                        }
                      }}
                      className="h-4 w-4 text-orange-600 rounded border-gray-300"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Azioni</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Stato</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Numero</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Tipo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Cliente</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Data</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Importo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredPreventivi.map((preventivo) => {
                  const statusConfig = STATUS_CONFIG[preventivo.stato] || STATUS_CONFIG.BOZZA;
                  const StatusIcon = statusConfig.icon;
                  const tipoConfig = TIPO_SERVIZIO_CONFIG[preventivo.tipoServizio] || TIPO_SERVIZIO_CONFIG.ALTRO;
                  const TipoIcon = tipoConfig.icon;
                  const isSelected = selectedIds.includes(preventivo.id);
                  const isMerged = preventivo.dettagliServizio?.mergedFromIds?.length > 0;
                  const mergedCount = preventivo.dettagliServizio?.mergedFromIds?.length || 0;

                  // Build actions based on whether it's a merged preventivo
                  const actions = [
                    {
                      label: 'Anteprima',
                      icon: <Eye className="h-4 w-4" />,
                      onClick: () => handleQuicklook(preventivo),
                      variant: 'default' as const,
                    },
                    {
                      label: 'Modifica',
                      icon: <Pencil className="h-4 w-4" />,
                      onClick: () => handleEdit(preventivo),
                      variant: 'default' as const,
                    },
                    {
                      label: 'Applica sconto',
                      icon: <Tag className="h-4 w-4" />,
                      onClick: () => { setSelectedForSconto(preventivo); setShowScontoModal(true); },
                      variant: 'default' as const,
                    },
                    {
                      label: 'Scarica PDF',
                      icon: <Download className="h-4 w-4" />,
                      onClick: () => handleDownloadPdf(preventivo.id),
                      variant: 'default' as const,
                    },
                    ...(isMerged ? [{
                      label: 'Separa preventivi',
                      icon: <Scissors className="h-4 w-4" />,
                      onClick: () => handleUnmergePreventivo(preventivo),
                      variant: 'default' as const,
                    }] : []),
                    {
                      label: 'Elimina',
                      icon: <Trash2 className="h-4 w-4" />,
                      onClick: () => handleDelete(preventivo.id),
                      variant: 'danger' as const,
                    },
                  ];

                  return (
                    <tr
                      key={preventivo.id}
                      className={`hover:bg-gray-50 transition-colors cursor-pointer ${isSelected ? 'bg-orange-50' : ''}`}
                      onClick={() => handleQuicklook(preventivo)}
                    >
                      {/* Checkbox */}
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(preventivo.id)}
                          className="h-4 w-4 text-orange-600 rounded border-gray-300"
                        />
                      </td>

                      {/* Actions - ActionButton pillola */}
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <ActionButton actions={actions} />
                      </td>

                      {/* Status Dropdown */}
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setStatusDropdownPosition({
                                top: rect.bottom + window.scrollY + 4,
                                left: rect.left + window.scrollX
                              });
                              setShowStatusDropdown(showStatusDropdown === `status-${preventivo.id}` ? null : `status-${preventivo.id}`);
                            }}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 ${statusConfig.className}`}
                          >
                            <StatusIcon className="h-3 w-3" />
                            {statusConfig.label}
                          </button>

                          {showStatusDropdown === `status-${preventivo.id}` && statusDropdownPosition && ReactDOM.createPortal(
                            <>
                              <div className="fixed inset-0 z-[9999]" onClick={() => { setShowStatusDropdown(null); setStatusDropdownPosition(null); }} />
                              <div
                                className="fixed w-48 bg-white rounded-lg shadow-2xl border border-gray-200 py-1 z-[10000]"
                                style={{
                                  top: statusDropdownPosition.top,
                                  left: statusDropdownPosition.left
                                }}
                              >
                                <p className="px-3 py-1.5 text-xs text-gray-500 font-medium border-b bg-gray-50 rounded-t-lg">Cambia stato:</p>
                                {(STATO_TRANSITIONS[preventivo.stato] || []).length > 0 ? (
                                  (STATO_TRANSITIONS[preventivo.stato] || [])
                                    .filter(key => STATUS_CONFIG[key])
                                    .map((key) => {
                                      const config = STATUS_CONFIG[key];
                                      const Icon = config.icon;
                                      return (
                                        <button
                                          key={key}
                                          onClick={() => {
                                            handleChangeStato(preventivo.id, key);
                                            setShowStatusDropdown(null);
                                            setStatusDropdownPosition(null);
                                          }}
                                          className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                                        >
                                          <Icon className="h-4 w-4" />
                                          {config.label}
                                        </button>
                                      );
                                    })
                                ) : (
                                  <p className="px-3 py-2 text-xs text-gray-400 italic">
                                    Nessuna transizione disponibile
                                  </p>
                                )}
                              </div>
                            </>,
                            document.body
                          )}
                        </div>
                      </td>

                      {/* Numero + Merged Icon */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold text-gray-900">{preventivo.numero}</span>
                          {isMerged && (
                            <button
                              onClick={() => { setSelectedMergedPreventivo(preventivo); setShowMergedDetailsModal(true); }}
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-purple-100 rounded-full hover:bg-purple-200 transition-colors cursor-pointer"
                              title={`Preventivo unito da ${mergedCount} preventivi - clicca per dettagli`}
                            >
                              <Layers className="h-3.5 w-3.5 text-purple-600" />
                              <span className="text-xs font-medium text-purple-700">{mergedCount}</span>
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Tipo */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <TipoIcon className={`h-4 w-4 ${tipoConfig.color}`} />
                          <span className="text-gray-700">{tipoConfig.label}</span>
                        </div>
                      </td>

                      {/* Cliente */}
                      <td className="px-4 py-3">
                        {preventivo.azienda ? (
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-900 truncate max-w-[200px]">{preventivo.azienda.ragioneSociale}</span>
                          </div>
                        ) : preventivo.persona ? (
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-900">{preventivo.persona.firstName} {preventivo.persona.lastName}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>

                      {/* Data */}
                      <td className="px-4 py-3 text-gray-600">
                        {preventivo.dataEmissione && format(new Date(preventivo.dataEmissione), 'dd/MM/yyyy', { locale: it })}
                      </td>

                      {/* Importo */}
                      <td className="px-4 py-3 text-right">
                        <span className="font-semibold text-gray-900">
                          € {Number(preventivo.importoFinale || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                        </span>
                        {preventivo.sconti && preventivo.sconti.length > 0 && (
                          <span className="ml-2 text-xs text-green-600">
                            -{preventivo.sconti.length}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ===== CARDS VIEW ===== */
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredPreventivi.map((preventivo) => {
            const statusConfig = STATUS_CONFIG[preventivo.stato] || STATUS_CONFIG.BOZZA;
            const StatusIcon = statusConfig.icon;
            const tipoConfig = TIPO_SERVIZIO_CONFIG[preventivo.tipoServizio] || TIPO_SERVIZIO_CONFIG.ALTRO;
            const TipoIcon = tipoConfig.icon;
            const isSelected = selectedIds.includes(preventivo.id);
            const isMerged = preventivo.dettagliServizio?.mergedFromIds?.length > 0;
            const mergedCount = preventivo.dettagliServizio?.mergedFromIds?.length || 0;

            return (
              <div
                key={preventivo.id}
                className={`bg-white rounded-xl shadow-sm border hover:shadow-md transition-all ${isSelected ? 'border-orange-500 ring-2 ring-orange-200' : 'border-gray-200'
                  }`}
              >
                {/* Card Header */}
                <div className="p-4 border-b border-gray-100">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(preventivo.id)}
                        className="h-4 w-4 text-orange-600 rounded border-gray-300"
                      />
                      <div className={`p-2 rounded-lg ${tipoConfig.color} bg-gray-50`}>
                        <TipoIcon className="h-5 w-5" />
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.className}`}>
                      <StatusIcon className="h-3 w-3" />
                      {statusConfig.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="h-4 w-4 text-gray-400" />
                    <span className="font-mono font-semibold text-gray-900">{preventivo.numero}</span>
                    {isMerged && (
                      <button
                        onClick={() => { setSelectedMergedPreventivo(preventivo); setShowMergedDetailsModal(true); }}
                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-purple-100 rounded-full hover:bg-purple-200 transition-colors cursor-pointer"
                        title={`Preventivo unito da ${mergedCount} preventivi - clicca per dettagli`}
                      >
                        <Layers className="h-3.5 w-3.5 text-purple-600" />
                        <span className="text-xs font-medium text-purple-700">{mergedCount}</span>
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{tipoConfig.label}</p>
                </div>

                {/* Card Body */}
                <div className="p-4 space-y-3">
                  {/* Cliente */}
                  <div className="flex items-center gap-2">
                    {preventivo.azienda ? (
                      <>
                        <Building2 className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900">{preventivo.azienda.ragioneSociale}</span>
                      </>
                    ) : preventivo.persona ? (
                      <>
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-900">{preventivo.persona.firstName} {preventivo.persona.lastName}</span>
                      </>
                    ) : (
                      <span className="text-sm text-gray-400">Cliente non specificato</span>
                    )}
                  </div>

                  {/* Corso/Schedule (if presente) */}
                  {preventivo.schedule?.course && (
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-blue-500" />
                      <span className="text-sm text-gray-600">
                        {preventivo.schedule.course.title}
                        {preventivo.schedule.startDate && (
                          <span className="text-gray-400 ml-1">
                            ({format(new Date(preventivo.schedule.startDate), 'dd/MM/yy', { locale: it })})
                          </span>
                        )}
                      </span>
                    </div>
                  )}

                  {/* Data */}
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {preventivo.dataEmissione && format(new Date(preventivo.dataEmissione), 'dd MMM yyyy', { locale: it })}
                    </span>
                  </div>

                  {/* Importo */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                      <Euro className="h-4 w-4 text-gray-400" />
                      <span className="text-lg font-bold text-gray-900">
                        {Number(preventivo.importoFinale || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    {/* Sconti badge */}
                    {preventivo.sconti && preventivo.sconti.length > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded text-xs">
                        <Tag className="h-3 w-3" />
                        {preventivo.sconti.length} scont{preventivo.sconti.length === 1 ? 'o' : 'i'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
                  {/* Status Change Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setShowStatusDropdown(showStatusDropdown === preventivo.id ? null : preventivo.id)}
                      className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-1"
                      title="Cambia stato"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                      Stato
                    </button>
                    {showStatusDropdown === preventivo.id && (
                      <div className="absolute left-0 bottom-full mb-1 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                        <p className="px-3 py-1 text-xs text-gray-500 border-b">Cambia stato in:</p>
                        {Object.entries(STATUS_CONFIG)
                          .filter(([key]) => key !== preventivo.stato)
                          .map(([key, config]) => {
                            const Icon = config.icon;
                            return (
                              <button
                                key={key}
                                onClick={() => handleChangeStato(preventivo.id, key)}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                              >
                                <Icon className="h-4 w-4" />
                                {config.label}
                              </button>
                            );
                          })}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => { setSelectedForSconto(preventivo); setShowScontoModal(true); }}
                      className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="Applica sconto"
                    >
                      <Tag className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDownloadPdf(preventivo.id)}
                      className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Scarica PDF"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(preventivo.id)}
                      className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Elimina"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <CreatePreventivoModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreate}
      />

      <MergeModal
        isOpen={showMergeModal}
        onClose={() => setShowMergeModal(false)}
        selectedPreventivi={selectedPreventivi}
        onMerge={handleMerge}
      />

      <MergedDetailsModal
        isOpen={showMergedDetailsModal}
        onClose={() => { setShowMergedDetailsModal(false); setSelectedMergedPreventivo(null); }}
        preventivo={selectedMergedPreventivo}
      />

      <ApplyScontoModal
        isOpen={showScontoModal}
        onClose={() => { setShowScontoModal(false); setSelectedForSconto(null); }}
        preventivo={selectedForSconto}
        onApply={handleApplySconto}
      />

      {/* QuicklookModal - Anteprima rapida preventivo */}
      <QuicklookModal
        isOpen={showQuicklookModal}
        onClose={() => { setShowQuicklookModal(false); setSelectedPreventivo(null); }}
        preventivo={selectedPreventivo}
        onEdit={() => selectedPreventivo && handleEdit(selectedPreventivo)}
        onDownloadPdf={() => selectedPreventivo && handleDownloadPdf(selectedPreventivo.id)}
      />

      {/* EditPreventivoModal - Modifica preventivo */}
      <EditPreventivoModal
        isOpen={showEditModal}
        onClose={() => { setShowEditModal(false); setSelectedPreventivo(null); }}
        preventivo={selectedPreventivo}
        onSubmit={handleUpdate}
        onRemoveSconto={removeSconto}
        onApplySconto={applySconto}
        onRefresh={fetchPreventivi}
      />

      {/* ConfirmModal - Eliminazione singola */}
      <ConfirmModal
        open={confirmDeleteId !== null}
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={handleConfirmDelete}
        title="Conferma eliminazione"
        message="Sei sicuro di voler eliminare questo preventivo? L'operazione non può essere annullata."
        variant="danger"
        confirmLabel="Elimina"
        cancelLabel="Annulla"
        loading={confirmLoading}
      />

      {/* ConfirmModal - Eliminazione multipla */}
      <ConfirmModal
        open={confirmBulkDelete}
        onCancel={() => setConfirmBulkDelete(false)}
        onConfirm={handleConfirmBulkDelete}
        title="Conferma eliminazione multipla"
        message={`Sei sicuro di voler eliminare ${selectedIds.length} preventivi selezionati? L'operazione non può essere annullata.`}
        variant="danger"
        confirmLabel={`Elimina ${selectedIds.length} preventivi`}
        cancelLabel="Annulla"
        loading={confirmLoading}
      />

      {/* ConfirmModal - Separazione preventivi uniti */}
      <ConfirmModal
        open={confirmUnmerge !== null}
        onCancel={() => setConfirmUnmerge(null)}
        onConfirm={handleConfirmUnmerge}
        title="Separa preventivi"
        message={confirmUnmerge
          ? `Vuoi separare il preventivo "${confirmUnmerge.numero}" nei ${confirmUnmerge.dettagliServizio?.mergedFromIds?.length || 0} preventivi originali? Il preventivo unito verrà eliminato.`
          : ''
        }
        variant="warning"
        confirmLabel="Separa"
        cancelLabel="Annulla"
        loading={confirmLoading}
      />
    </div>
  );
};

export default PreventiviPage;
