/**
 * TariffarioAziendaleForm
 * 
 * Form per la creazione e modifica di Tariffari Aziende
 * Supporta sia tariffari BASE che AZIENDALI
 * P59 Sprint 11.2: Drag & Drop per riordinamento voci
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  FileText,
  GripVertical,
  Euro,
  Users,
  Calendar,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Printer,
  Search,
  Stethoscope,
  Briefcase
} from 'lucide-react';
// P59 Sprint 11.2: DnD Kit for drag & drop
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '../../../design-system/atoms/Button';
import { CRUDPrimaryButton } from '../../../components/shared/CRUDButton';
import { Input } from '../../../design-system/atoms/Input';
import { Label } from '../../../design-system/atoms/Label';
import { Badge } from '../../../design-system/atoms/Badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../design-system/molecules/Card';
import { Select } from '../../../design-system/atoms/Select';
import { Switch } from '../../../components/ui/switch';
import { DatePickerElegante } from '../../../components/ui/DatePickerElegante';
import { useToast } from '../../../hooks/useToast';
import { useConfirmDialog } from '../../../contexts/ConfirmDialogContext';
import { useTenantFilter } from '../../../context/TenantFilterContext';
import {
  tariffariAziendaliApi,
  TariffarioAziendale,
  VoceTariffario,
  PrestazioneMDL,
  TipoTariffario,
  TipoVoceTariffario,
  FrequenzaTariffario,
  UnitaCalcoloTariffario,
  ModalitaAttivazioneTariffario,
  CreateVocePayload,
  CreateFasciaPayload,
  FasciaDipendentiPrezzo,
  TIPO_VOCE_LABELS,
  TIPO_VOCE_DESCRIPTIONS,
  FREQUENZA_LABELS,
  UNITA_CALCOLO_LABELS,
  UNITA_CALCOLO_DESCRIPTIONS,
  MODALITA_ATTIVAZIONE_LABELS,
  MODALITA_ATTIVAZIONE_DESCRIPTIONS,
  TIPO_PRESTAZIONE_MDL_LABELS,
  formatFasciaDipendenti,
  getVoceDisplayName,
  // P59: Compenso professionista
  TipoCompensoMedico,
  TIPO_COMPENSO_LABELS,
  TIPO_COMPENSO_DESCRIPTIONS,
  TIPI_VOCE_CON_COMPENSO,
  // Categoria visita MDL (prima visita vs periodica)
  CategoriaVisitaMDL,
  CATEGORIA_VISITA_LABELS,
  CATEGORIA_VISITA_DESCRIPTIONS,
  // Questionari MDL
  QuestionarioMDL
} from '../../../services/tariffarioAziendaleApi';
import { apiGet } from '../../../services/api';

// Company interface for dropdown
interface CompanyOption {
  id: string;
  ragioneSociale: string;
}

// Convenzione interface for dropdown
interface ConvenzioneOption {
  id: string;
  codice: string;
  nome: string;
}

// Helper to format date for input fields (YYYY-MM-DD)
const formatDateForInput = (date: string | Date): string => {
  if (!date) return '';
  const d = new Date(date);
  return d.toISOString().split('T')[0];
};

// Tutte le 10 categorie visita MDL — D.Lgs 81/08 art. 41 + D.Lgs 19/2022
interface VisitaMDLCategory { key: CategoriaVisitaMDL; label: string; hint: string }
const VISITA_MDL_CATEGORIES: VisitaMDLCategory[] = [
  // Visite ordinarie
  { key: 'PREVENTIVA', label: 'Visita Preventiva', hint: 'Art. 41.2a – prima assunzione / prima visita nuovo lavoratore' },
  { key: 'PREVENTIVA_PREASSUNTIVA', label: 'Preventiva Preassuntiva', hint: 'Art. 41.2a-bis – in fase preassuntiva su scelta datore (D.Lgs 19/2022)' },
  { key: 'PERIODICA', label: 'Visita Periodica', hint: 'Art. 41.2b – periodicità stabilita dal MC nel protocollo sanitario' },
  { key: 'CAMBIO_MANSIONE', label: 'Cambio Mansione', hint: 'Art. 41.2c – cambio mansione con esposizione a rischi diversi' },
  { key: 'CESSAZIONE_RAPPORTO', label: 'Cessazione Rapporto', hint: 'Art. 41.2d – alla cessazione del rapporto (dove previsto)' },
  { key: 'PRECEDENTE_ASSENZA', label: 'Precedente Assenza >60gg', hint: 'Art. 41.2e – ripresa da assenza continuativa >60 gg per motivi di salute' },
  { key: 'SU_RICHIESTA_LAVORATORE', label: 'Su Richiesta Lavoratore', hint: 'Art. 41.2f – su richiesta del lavoratore (D.Lgs 19/2022)' },
  // Visite speciali
  { key: 'STRAORDINARIA', label: 'Visita Straordinaria', hint: 'Art. 41.3 – su disposizione organo vigilanza o MC' },
  { key: 'VERIFICA_IDONEITA', label: 'Verifica Idoneità', hint: 'Art. 41.9 – verifica idoneità per giudizio contestato' },
  { key: 'RIENTRO_MATERNITA', label: 'Rientro Maternità/Congedo', hint: 'Rientro da maternità o congedo parentale > 60 gg' },
];

/**
 * Combobox per la selezione prestazioni MDL con ricerca integrata nel dropdown.
 * Sostituisce il pattern Search esterno + Select nativo.
 */
interface PrestazioneComboboxProps {
  prestazioniMDL: PrestazioneMDL[];
  value: string;
  onChange: (id: string, prest: PrestazioneMDL | null) => void;
}

const PrestazioneCombobox: React.FC<PrestazioneComboboxProps> = ({ prestazioniMDL, value, onChange }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Chiudi su click esterno
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  const selected = prestazioniMDL.find(p => p.id === value);

  // Filtra e raggruppa
  const filtered = prestazioniMDL.filter(p =>
    !search ||
    p.nome.toLowerCase().includes(search.toLowerCase()) ||
    (p.codice && p.codice.toLowerCase().includes(search.toLowerCase()))
  );
  const grouped: Record<string, PrestazioneMDL[]> = {};
  filtered.forEach(p => {
    const key = TIPO_PRESTAZIONE_MDL_LABELS[p.tipo] || p.tipo;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(p);
  });

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => { setOpen(o => !o); setSearch(''); }}
        className="w-full flex items-center justify-between px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
      >
        <span className={selected ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400'}>
          {selected ? selected.nome : 'Seleziona prestazione...'}
        </span>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg overflow-hidden">
          {/* Search inside dropdown */}
          <div className="p-2 border-b border-gray-100 dark:border-gray-700">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <input
                autoFocus
                type="text"
                className="pl-8 pr-3 py-1.5 text-sm w-full border border-gray-200 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Cerca per nome o codice..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* List */}
          <div className="max-h-64 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-sm text-gray-500 text-center">Nessun risultato</p>
            ) : (
              Object.entries(grouped).map(([tipoLabel, items]) => (
                <div key={tipoLabel}>
                  <div className="px-3 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 uppercase tracking-wide">
                    {tipoLabel}
                  </div>
                  {items.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => { onChange(p.id, p); setOpen(false); setSearch(''); }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors flex items-center justify-between ${p.id === value ? 'bg-primary/10 text-primary font-medium' : 'text-gray-700 dark:text-gray-200'
                        }`}
                    >
                      <span>{p.nome}</span>
                      {p.prezzoBase ? (
                        <span className="text-xs text-gray-400 ml-2">€{Number(p.prezzoBase).toFixed(2)}</span>
                      ) : null}
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Combobox per la selezione di un questionario MDL (DocumentoTemplate)
 */
interface QuestionarioComboboxProps {
  questionariMDL: QuestionarioMDL[];
  value: string;
  onChange: (id: string, q: QuestionarioMDL | null) => void;
}

const TIPO_QUESTIONARIO_LABELS: Record<string, string> = {
  QUESTIONARIO_ANAMNESI_MDL: 'Anamnesi MDL',
  QUESTIONARIO_RISCHIO: 'Rischio',
  QUESTIONARIO_SINTOMI: 'Sintomi',
  SCHEDA_SORVEGLIANZA: 'Sorveglianza Sanitaria',
  ALCOL_SCREENING: 'Screening Alcol/Sostanze',
  ANAMNESI: 'Anamnesi Generica',
};

const QuestionarioCombobox: React.FC<QuestionarioComboboxProps> = ({ questionariMDL, value, onChange }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  const selected = questionariMDL.find(q => q.id === value);

  const filtered = questionariMDL.filter(q =>
    !search ||
    q.nome.toLowerCase().includes(search.toLowerCase()) ||
    (q.codice && q.codice.toLowerCase().includes(search.toLowerCase()))
  );

  const grouped: Record<string, QuestionarioMDL[]> = {};
  filtered.forEach(q => {
    const key = TIPO_QUESTIONARIO_LABELS[q.tipo] || q.tipo;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(q);
  });

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        onClick={() => { setOpen(o => !o); setSearch(''); }}
        className="w-full flex items-center justify-between px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
      >
        <span className={selected ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400'}>
          {selected ? selected.nome : 'Seleziona questionario...'}
        </span>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg overflow-hidden">
          <div className="p-2 border-b border-gray-100 dark:border-gray-700">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <input
                autoFocus
                type="text"
                className="pl-8 pr-3 py-1.5 text-sm w-full border border-gray-200 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Cerca questionario..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-sm text-gray-500 text-center">Nessun questionario disponibile</p>
            ) : (
              Object.entries(grouped).map(([tipoLabel, items]) => (
                <div key={tipoLabel}>
                  <div className="px-3 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 uppercase tracking-wide">
                    {tipoLabel}
                  </div>
                  {items.map(q => (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => { onChange(q.id, q); setOpen(false); setSearch(''); }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors ${q.id === value ? 'bg-primary/10 text-primary font-medium' : 'text-gray-700 dark:text-gray-200'
                        }`}
                    >
                      <div>{q.nome}</div>
                      {q.codice && <div className="text-xs text-gray-400">{q.codice}</div>}
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Categorizzazione delle voci nelle 3 sezioni (specchia il PDF e la pagina di dettaglio)
type SezioneVoce = 'MDL' | 'CONSULENZA' | 'SPESE';
const CONSULENZA_VOCE_TYPES = [
  'CONSULENZA', 'SOPRALLUOGO_MC', 'SOPRALLUOGO_RSPP', 'NOMINA_MC', 'NOMINA_RSPP',
  'DVR_NUOVO', 'DVR_AGGIORNAMENTO_CON_MODIFICHE', 'DVR_AGGIORNAMENTO_SENZA_MODIFICHE',
];
const SPESE_VOCE_TYPES = ['SPESA_FISSA', 'SPESA_RICORRENTE', 'USCITA_MC'];
const categoriaVoce = (tipo: string): SezioneVoce => {
  if (tipo === 'PRESTAZIONE' || tipo === 'QUESTIONARIO') return 'MDL';
  if (CONSULENZA_VOCE_TYPES.includes(tipo)) return 'CONSULENZA';
  if (SPESE_VOCE_TYPES.includes(tipo)) return 'SPESE';
  return 'SPESE';
};
const SEZIONI_VOCI: { key: SezioneVoce; label: string; icon: React.ElementType; color: string }[] = [
  { key: 'MDL', label: 'Prestazioni Medicina del Lavoro', icon: Stethoscope, color: 'text-teal-700 dark:text-teal-400' },
  { key: 'CONSULENZA', label: 'Consulenza e Sicurezza', icon: Briefcase, color: 'text-purple-700 dark:text-purple-400' },
  { key: 'SPESE', label: 'Spese Accessorie', icon: Euro, color: 'text-gray-600 dark:text-gray-400' },
];

const TariffarioAziendaleForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id && id !== 'nuovo';
  const { showToast } = useToast();
  const { confirmDelete } = useConfirmDialog();
  const { getTenantFilterParams, isReady, tenantFilterKey } = useTenantFilter();
  // P59 Sprint 11.2: DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  // Form state - P59 Sprint 11.2: loading=true di default in edit mode per evitare flash
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reordering, setReordering] = useState(false);  // P59 Sprint 11.2
  const [formData, setFormData] = useState({
    codice: '',
    nome: '',
    descrizione: '',
    tipo: 'BASE' as TipoTariffario,
    companyId: '',
    convenzioneId: '',
    validoDa: new Date().toISOString().split('T')[0],
    validoA: '',
    attivo: true,
    note: ''
  });

  // Voci state
  const [voci, setVoci] = useState<VoceTariffario[]>([]);
  const [expandedVoci, setExpandedVoci] = useState<Set<string>>(new Set());

  // Options
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [convenzioni, setConvenzioni] = useState<ConvenzioneOption[]>([]);
  const [prestazioniMDL, setPrestazioniMDL] = useState<PrestazioneMDL[]>([]);
  const [questionariMDL, setQuestionariMDL] = useState<QuestionarioMDL[]>([]);

  // New voce form state
  const [showNewVoceForm, setShowNewVoceForm] = useState(false);
  const [newVoce, setNewVoce] = useState<CreateVocePayload>({
    tipo: 'PRESTAZIONE',
    prestazioneId: '',
    documentoTemplateId: '',
    nome: '',
    descrizione: '',
    prezzoBase: 0,
    ivaAliquota: 22,
    frequenza: 'ANNUALE',
    unitaCalcolo: 'PER_DIPENDENTE',
    modalitaAttivazione: 'SU_ESECUZIONE',
    usaFasceDipendenti: false,
    fasceDipendenti: [],
    // Categoria visita MDL (prima visita vs periodica)
    categoriaVisita: undefined,
    // Durata minima per CONSULENZA
    durataMinimaMinuti: undefined as number | undefined,
    // P59: Compenso professionista (default 70%)
    compensoProfessionistaTipo: undefined,
    compensoProfessionistaValore: undefined,
    compensoProfessionistaMinimo: undefined,
    compensoProfessionistaMassimo: undefined
  });

  // Ricerca prestazioni MDL
  const [prestazioneSearch, setPrestazioneSearch] = useState(''); // kept for backward compat, not rendered

  // Prezzi per le 10 categorie visita MDL (tabella multi-prezzo, D.Lgs 81/08 art.41 + D.Lgs 19/2022)
  const [visitPrices, setVisitPrices] = useState<Partial<Record<CategoriaVisitaMDL, number>>>({
    PREVENTIVA: 0, PREVENTIVA_PREASSUNTIVA: 0, PERIODICA: 0, CAMBIO_MANSIONE: 0,
    CESSAZIONE_RAPPORTO: 0, PRECEDENTE_ASSENZA: 0, SU_RICHIESTA_LAVORATORE: 0,
    STRAORDINARIA: 0, VERIFICA_IDONEITA: 0, RIENTRO_MATERNITA: 0,
  });

  // Prezzi per le 3 tipologie DVR (tabella mono-gruppo, sezione separata come per VML)
  const [dvrPrices, setDvrPrices] = useState<Record<string, number>>({
    DVR_NUOVO: 0,
    DVR_AGGIORNAMENTO_CON_MODIFICHE: 0,
    DVR_AGGIORNAMENTO_SENZA_MODIFICHE: 0,
  });

  // Prestazione selezionata corrente
  const selectedPrestazione = prestazioniMDL.find(p => p.id === newVoce.prestazioneId);
  const isVisitaMDL = selectedPrestazione?.tipo === 'VISITA_MEDICINA_LAVORO';

  // Load data
  useEffect(() => {
    const loadData = async () => {
      // Wait for tenant filter to be ready
      if (!isReady) return;

      setLoading(true);
      try {
        // Load options
        const [companiesRes, convenzioniRes, prestazioniRes] = await Promise.all([
          apiGet<CompanyOption[]>('/api/v1/companies?limit=1000'),
          apiGet<{ data: ConvenzioneOption[] }>('/api/v1/clinica/convenzioni'),
          tariffariAziendaliApi.getPrestazioniMDL()
        ]);

        setCompanies(Array.isArray(companiesRes) ? companiesRes : []);
        setConvenzioni(convenzioniRes?.data || []);
        setPrestazioniMDL(prestazioniRes?.data?.prestazioni || []);
        setQuestionariMDL(prestazioniRes?.data?.questionari || []);

        // Load tariffario if editing
        if (isEditing) {
          // Get tenant params for cross-tenant access
          const tenantParams = getTenantFilterParams();
          const response = await tariffariAziendaliApi.getById(id, tenantParams);
          if (response.success && response.data) {
            const t = response.data as TariffarioAziendale & { companyTenantProfileId?: string; companyId?: string; tipo?: string };
            // P49: companyTenantProfileId è il campo corretto, companyId è alias
            const companyId = t.companyTenantProfileId || t.companyId || '';
            setFormData({
              codice: t.codice,
              nome: t.nome,
              descrizione: t.descrizione || '',
              tipo: (t.tipo || 'BASE') as TipoTariffario,
              companyId: companyId,
              convenzioneId: t.convenzioneId || '',
              validoDa: t.validoDa ? t.validoDa.split('T')[0] : new Date().toISOString().split('T')[0],
              validoA: t.validoA ? t.validoA.split('T')[0] : '',
              attivo: t.attivo,
              note: t.note || ''
            });
            setVoci(t.voci || []);
          }
        }

        // Se non ci sono prestazioni MDL disponibili, imposta il tipo di default a SPESA_FISSA
        if (!prestazioniRes?.data?.prestazioni || prestazioniRes.data.prestazioni.length === 0) {
          setNewVoce(prev => ({
            ...prev,
            tipo: 'SPESA_FISSA'
          }));
        }
      } catch (error) {
        showToast({ message: 'Errore nel caricamento dei dati', type: 'error' });
      } finally {
        setLoading(false);
      }
    };

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEditing, isReady, tenantFilterKey]);

  // Handle form change
  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Toggle voce expansion
  const toggleVoceExpanded = (voceId: string) => {
    setExpandedVoci(prev => {
      const next = new Set(prev);
      if (next.has(voceId)) {
        next.delete(voceId);
      } else {
        next.add(voceId);
      }
      return next;
    });
  };

  // Add new voce
  const handleAddVoce = async () => {
    if (!isEditing) {
      showToast({ message: 'Salva prima il tariffario per aggiungere voci', type: 'error' });
      return;
    }

    if (newVoce.tipo === 'PRESTAZIONE' && !newVoce.prestazioneId) {
      showToast({ message: 'Seleziona una prestazione', type: 'error' });
      return;
    }

    if (newVoce.tipo === 'QUESTIONARIO' && !newVoce.documentoTemplateId) {
      showToast({ message: 'Seleziona un questionario MDL', type: 'error' });
      return;
    }

    // DVR è un tipo virtuale (espanso in 3 tipi reali) — non ha campo nome
    if (newVoce.tipo !== 'PRESTAZIONE' && newVoce.tipo !== 'QUESTIONARIO' && (newVoce.tipo as string) !== 'DVR' && !newVoce.nome) {
      showToast({ message: 'Inserisci il nome della voce', type: 'error' });
      return;
    }

    const resetVoce = () => {
      setNewVoce({
        tipo: 'PRESTAZIONE',
        prestazioneId: '',
        documentoTemplateId: '',
        nome: '',
        descrizione: '',
        prezzoBase: 0,
        ivaAliquota: 22,
        frequenza: 'SECONDO_SORVEGLIANZA',
        unitaCalcolo: 'PER_DIPENDENTE',
        modalitaAttivazione: 'SU_ESECUZIONE',
        usaFasceDipendenti: false,
        fasceDipendenti: [],
        categoriaVisita: undefined,
        durataMinimaMinuti: undefined,
        // P59: Reset compenso fields
        compensoProfessionistaTipo: undefined,
        compensoProfessionistaValore: undefined,
        compensoProfessionistaMinimo: undefined,
        compensoProfessionistaMassimo: undefined
      });
      setPrestazioneSearch('');
      setVisitPrices({
        PREVENTIVA: 0, PREVENTIVA_PREASSUNTIVA: 0, PERIODICA: 0, CAMBIO_MANSIONE: 0,
        CESSAZIONE_RAPPORTO: 0, PRECEDENTE_ASSENZA: 0, SU_RICHIESTA_LAVORATORE: 0,
        STRAORDINARIA: 0, VERIFICA_IDONEITA: 0, RIENTRO_MATERNITA: 0,
      });
      setDvrPrices({ DVR_NUOVO: 0, DVR_AGGIORNAMENTO_CON_MODIFICHE: 0, DVR_AGGIORNAMENTO_SENZA_MODIFICHE: 0 });
    };

    try {
      setSaving(true);

      // Caso speciale: DVR — batch insert, una voce per ogni tipologia DVR con prezzo > 0
      if ((newVoce.tipo as string) === 'DVR') {
        const dvrEntries = Object.entries(dvrPrices).filter(([, price]) => price && price > 0);
        if (dvrEntries.length === 0) {
          showToast({ message: 'Inserisci almeno un prezzo per una tipologia DVR', type: 'error' });
          return;
        }
        const dvrPayload = dvrEntries.map(([tipoStr, price]) => ({
          tipo: tipoStr as TipoVoceTariffario,
          nome: tipoStr === 'DVR_NUOVO' ? 'Nuovo DVR'
            : tipoStr === 'DVR_AGGIORNAMENTO_CON_MODIFICHE' ? 'Aggiornamento DVR (con modifiche)'
              : 'Aggiornamento DVR (senza modifiche)',
          prezzoBase: price,
          ivaAliquota: newVoce.ivaAliquota ?? 22,
          frequenza: newVoce.frequenza,
          unitaCalcolo: 'FLAT' as const,
          modalitaAttivazione: 'SU_CONFERMA' as const,
          usaFasceDipendenti: false,
          ...(newVoce.compensoProfessionistaTipo && {
            compensoProfessionistaTipo: newVoce.compensoProfessionistaTipo,
            compensoProfessionistaValore: newVoce.compensoProfessionistaValore,
            compensoProfessionistaMinimo: newVoce.compensoProfessionistaMinimo,
            compensoProfessionistaMassimo: newVoce.compensoProfessionistaMassimo,
          }),
        }));
        const response = await tariffariAziendaliApi.addVoceBatch(id!, dvrPayload);
        if (response.success) {
          setVoci(prev => [...prev, ...response.data]);
          setShowNewVoceForm(false);
          resetVoce();
          showToast({ message: `${response.data.length} voci DVR aggiunte con successo`, type: 'success' });
        }
        return;
      }

      // Caso speciale: VISITA_MEDICINA_LAVORO — batch insert, una voce per ogni categoria con prezzo > 0
      if (newVoce.tipo === 'PRESTAZIONE' && isVisitaMDL) {
        const categorie = Object.entries(visitPrices).filter(([, price]) => price && price > 0);
        if (categorie.length === 0) {
          showToast({ message: 'Inserisci almeno un prezzo per una categoria visita', type: 'error' });
          return;
        }
        const vociPayload = categorie.map(([categoria, price]) => ({
          ...newVoce,
          prezzoBase: price!,
          categoriaVisita: categoria as CategoriaVisitaMDL,
          durataMinimaMinuti: undefined
        }));
        const response = await tariffariAziendaliApi.addVoceBatch(id!, vociPayload);
        if (response.success) {
          setVoci(prev => [...prev, ...response.data]);
          setShowNewVoceForm(false);
          resetVoce();
          showToast({ message: `${response.data.length} voci visita aggiunte con successo`, type: 'success' });
        }
        return;
      }

      // Caso normale
      const response = await tariffariAziendaliApi.addVoce(id!, newVoce);
      if (response.success) {
        setVoci(prev => [...prev, response.data]);
        setShowNewVoceForm(false);
        resetVoce();
        showToast({ message: 'Voce aggiunta con successo', type: 'success' });
      }
    } catch (error) {
      showToast({ message: 'Errore nell\'aggiunta della voce', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // Delete voce - P59 Sprint 11.2: usa confirmDelete dialog invece di confirm() del browser
  const handleDeleteVoce = async (voceId: string, voceName?: string) => {
    const confirmed = await confirmDelete(voceName || 'questa voce');
    if (!confirmed) return;

    try {
      await tariffariAziendaliApi.deleteVoce(id!, voceId);
      setVoci(prev => prev.filter(v => v.id !== voceId));
      showToast({ message: 'Voce eliminata', type: 'success' });
    } catch (error) {
      showToast({ message: 'Errore nell\'eliminazione della voce', type: 'error' });
    }
  };

  // Elimina tutte le voci di un gruppo VISITA_MDL
  const handleDeleteVisitaMDLGroup = useCallback(async (groupVoci: VoceTariffario[]) => {
    try {
      for (const voce of groupVoci) {
        await tariffariAziendaliApi.deleteVoce(id!, voce.id);
      }
      setVoci(prev => prev.filter(v => !groupVoci.some(g => g.id === v.id)));
      showToast({ message: `${groupVoci.length} voci visita eliminate`, type: 'success' });
    } catch (error) {
      showToast({ message: 'Errore nell\'eliminazione del gruppo', type: 'error' });
    }
  }, [id, showToast]);

  // Mappa prestazioneId → voci VISITA_MDL (per il rendering gruppi)
  const visitaMDLGroups = useMemo(() => {
    const map = new Map<string, VoceTariffario[]>();
    voci.forEach(voce => {
      if (
        voce.tipo === 'PRESTAZIONE' &&
        voce.categoriaVisita &&
        voce.prestazione?.tipo === 'VISITA_MEDICINA_LAVORO' &&
        voce.prestazioneId
      ) {
        if (!map.has(voce.prestazioneId)) map.set(voce.prestazioneId, []);
        map.get(voce.prestazioneId)!.push(voce);
      }
    });
    return map;
  }, [voci]);

  // Raggruppa tutte le voci DVR_* in un unico gruppo (per rendering tabella simile a VML)
  const dvrGroupVoci = useMemo(() => {
    return voci.filter(v =>
      v.tipo === 'DVR_NUOVO' ||
      v.tipo === 'DVR_AGGIORNAMENTO_CON_MODIFICHE' ||
      v.tipo === 'DVR_AGGIORNAMENTO_SENZA_MODIFICHE'
    );
  }, [voci]);

  // Elimina tutte le voci del gruppo DVR
  const handleDeleteDVRGroup = useCallback(async (groupVoci: VoceTariffario[]) => {
    try {
      for (const voce of groupVoci) {
        await tariffariAziendaliApi.deleteVoce(id!, voce.id);
      }
      setVoci(prev => prev.filter(v => !groupVoci.some(g => g.id === v.id)));
      showToast({ message: `${groupVoci.length} voci DVR eliminate`, type: 'success' });
    } catch (error) {
      showToast({ message: 'Errore nell\'eliminazione del gruppo DVR', type: 'error' });
    }
  }, [id, showToast]);

  // P59 Sprint 11.2: Handle drag end for reordering voci
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = voci.findIndex(v => v.id === active.id);
    const newIndex = voci.findIndex(v => v.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    // Optimistic update - rearrange locally first
    const newVoci = arrayMove(voci, oldIndex, newIndex);
    setVoci(newVoci);

    // Save the new order to the backend
    try {
      setReordering(true);
      // Update the ordine field for all affected voci
      const updates = newVoci.map((voce, index) => ({
        id: voce.id,
        ordine: index + 1
      }));

      // Send reorder request to backend
      await tariffariAziendaliApi.reorderVoci(id!, updates);
      showToast({ message: 'Ordine aggiornato', type: 'success' });
    } catch (error) {
      // Revert to original order on error
      setVoci(voci);
      showToast({ message: 'Errore nel riordinamento', type: 'error' });
    } finally {
      setReordering(false);
    }
  }, [voci, id, showToast]);

  // Save tariffario
  const handleSave = async () => {
    // Validation
    if (!formData.codice.trim()) {
      showToast({ message: 'Il codice è obbligatorio', type: 'error' });
      return;
    }
    if (!formData.nome.trim()) {
      showToast({ message: 'Il nome è obbligatorio', type: 'error' });
      return;
    }
    if (formData.tipo === 'AZIENDALE' && !formData.companyId) {
      showToast({ message: 'Seleziona un\'azienda per un tariffario aziendale', type: 'error' });
      return;
    }

    try {
      setSaving(true);

      const payload = {
        ...formData,
        companyId: formData.tipo === 'AZIENDALE' ? formData.companyId : undefined,
        convenzioneId: formData.convenzioneId || undefined,
        validoA: formData.validoA || undefined
      };

      let response;
      if (isEditing) {
        response = await tariffariAziendaliApi.update(id, payload);
      } else {
        response = await tariffariAziendaliApi.create(payload);
      }

      if (response.success) {
        showToast({
          message: isEditing ? 'Tariffario aggiornato con successo' : 'Tariffario creato con successo',
          type: 'success'
        });
        // P59 Sprint 11.2: Naviga sempre alla pagina view dopo salvataggio
        navigate(`/poliambulatorio/mdl/tariffari-aziende/${response.data.id}`);
      }
    } catch (error: unknown) {
      const errorMessage = 'Errore nel salvataggio';
      showToast({ message: errorMessage, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // Stampa PDF
  const [printing, setPrinting] = useState(false);
  const handlePrint = async () => {
    if (!id) {
      showToast({ message: 'Salva prima il tariffario per stamparlo', type: 'error' });
      return;
    }

    try {
      setPrinting(true);
      await tariffariAziendaliApi.downloadPDF(id, getTenantFilterParams());
    } catch (error) {
      showToast({ message: 'Errore nella generazione del PDF', type: 'error' });
    } finally {
      setPrinting(false);
    }
  };

  // Render di una singola voce (gestisce i gruppi DVR / Visita MDL con pattern leader+hidden)
  const renderVoceCard = (voce: VoceTariffario) => {
    const isVisitaMDLVoce =
      voce.tipo === 'PRESTAZIONE' &&
      !!voce.categoriaVisita &&
      voce.prestazione?.tipo === 'VISITA_MEDICINA_LAVORO';

    // DVR group: tutte le tipologie DVR_* renderizzate come un unico gruppo
    const isDVRVoce = voce.tipo === 'DVR_NUOVO' ||
      voce.tipo === 'DVR_AGGIORNAMENTO_CON_MODIFICHE' ||
      voce.tipo === 'DVR_AGGIORNAMENTO_SENZA_MODIFICHE';

    if (isDVRVoce) {
      const isLeader = dvrGroupVoci.length > 0 && dvrGroupVoci[0].id === voce.id;
      if (!isLeader) {
        return <HiddenSortableItem key={voce.id} id={voce.id} disabled={reordering} />;
      }
      return (
        <SortableDVRGroupCard
          key={voce.id}
          voce={voce}
          groupVoci={dvrGroupVoci}
          tariffarioId={id!}
          expanded={expandedVoci.has(voce.id)}
          onToggle={() => toggleVoceExpanded(voce.id)}
          onDeleteGroup={() => handleDeleteDVRGroup(dvrGroupVoci)}
          onUpdateGroup={(updatedVoci, deletedIds) => {
            setVoci(prev => {
              const withoutDeleted = prev.filter(v => !deletedIds.includes(v.id));
              const withUpdated = withoutDeleted.map(v => {
                const u = updatedVoci.find(x => x.id === v.id);
                return u || v;
              });
              const newOnes = updatedVoci.filter(u => !withoutDeleted.some(v => v.id === u.id));
              return [...withUpdated, ...newOnes];
            });
          }}
          disabled={reordering}
        />
      );
    }

    if (isVisitaMDLVoce && voce.prestazioneId) {
      const group = visitaMDLGroups.get(voce.prestazioneId) || [voce];
      const isLeader = group[0].id === voce.id;

      if (!isLeader) {
        // Voce secondaria: invisibile ma mantenuta nel DnD
        return <HiddenSortableItem key={voce.id} id={voce.id} disabled={reordering} />;
      }

      return (
        <SortableVisitaMDLGroupCard
          key={voce.id}
          voce={voce}
          groupVoci={group}
          tariffarioId={id!}
          expanded={expandedVoci.has(voce.id)}
          onToggle={() => toggleVoceExpanded(voce.id)}
          onDeleteGroup={() => handleDeleteVisitaMDLGroup(group)}
          onUpdateGroup={(updatedVoci, deletedIds) => {
            setVoci(prev => {
              const withoutDeleted = prev.filter(v => !deletedIds.includes(v.id));
              const withUpdated = withoutDeleted.map(v => {
                const u = updatedVoci.find(x => x.id === v.id);
                return u || v;
              });
              const newOnes = updatedVoci.filter(u => !withoutDeleted.some(v => v.id === u.id));
              return [...withUpdated, ...newOnes];
            });
          }}
          disabled={reordering}
        />
      );
    }

    return (
      <SortableVoceCard
        key={voce.id}
        voce={voce}
        tariffarioId={id!}
        expanded={expandedVoci.has(voce.id)}
        onToggle={() => toggleVoceExpanded(voce.id)}
        onDelete={() => handleDeleteVoce(voce.id, getVoceDisplayName(voce))}
        onUpdate={(updatedVoce) => {
          setVoci(prev => prev.map(v => v.id === updatedVoce.id ? updatedVoce : v));
        }}
        disabled={reordering}
      />
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/poliambulatorio/mdl/tariffari-aziende')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Indietro
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {isEditing ? 'Modifica Tariffario' : 'Nuovo Tariffario'}
            </h1>
            {isEditing && (
              <p className="text-gray-500 text-sm">Codice: {formData.codice}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isEditing && (
            <Button variant="outline" onClick={handlePrint} disabled={printing}>
              <Printer className="h-4 w-4 mr-2" />
              {printing ? 'Generazione...' : 'Stampa PDF'}
            </Button>
          )}
          <CRUDPrimaryButton operation={isEditing ? 'update' : 'create'} onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Salvataggio...' : 'Salva'}
          </CRUDPrimaryButton>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Informazioni Base
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="codice">Codice *</Label>
                  <Input
                    id="codice"
                    value={formData.codice}
                    onChange={(e) => handleChange('codice', e.target.value)}
                    placeholder="MDL-2024-001"
                    disabled={isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tipo">Tipo *</Label>
                  {isEditing ? (
                    <Input
                      value={formData.tipo === 'BASE' ? 'Template Base' : 'Aziendale'}
                      disabled
                    />
                  ) : (
                    <Select
                      value={formData.tipo}
                      onChange={(e) => handleChange('tipo', e.target.value)}
                      options={[
                        { value: 'BASE', label: 'Template Base' },
                        { value: 'AZIENDALE', label: 'Aziendale' }
                      ]}
                    />
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => handleChange('nome', e.target.value)}
                  placeholder="Tariffario Standard Medicina Lavoro 2024"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="descrizione">Descrizione</Label>
                <textarea
                  id="descrizione"
                  className="flex min-h-[80px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  value={formData.descrizione}
                  onChange={(e) => handleChange('descrizione', e.target.value)}
                  placeholder="Descrizione del tariffario..."
                  rows={3}
                />
              </div>

              {formData.tipo === 'AZIENDALE' && (
                <div className="space-y-2">
                  <Label htmlFor="companyId">Azienda *</Label>
                  <Select
                    value={formData.companyId}
                    onChange={(e) => handleChange('companyId', e.target.value)}
                    placeholder="Seleziona azienda"
                    options={companies.map((c) => ({
                      value: c.id,
                      label: c.ragioneSociale
                    }))}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="convenzioneId">Convenzione (opzionale)</Label>
                <Select
                  value={formData.convenzioneId}
                  onChange={(e) => handleChange('convenzioneId', e.target.value === '_none' ? '' : e.target.value)}
                  placeholder="Nessuna convenzione"
                  options={[
                    { value: '_none', label: 'Nessuna convenzione' },
                    ...convenzioni.map((c) => ({
                      value: c.id,
                      label: `${c.codice} - ${c.nome}`
                    }))
                  ]}
                />
              </div>
            </CardContent>
          </Card>

          {/* Validità */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Validità
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="validoDa">Valido da *</Label>
                  <DatePickerElegante
                    value={formData.validoDa}
                    onChange={(date) => handleChange('validoDa', date ? date.toISOString().split('T')[0] : '')}
                    theme="blue"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="validoA">Valido fino a</Label>
                  <DatePickerElegante
                    value={formData.validoA}
                    onChange={(date) => handleChange('validoA', date ? date.toISOString().split('T')[0] : '')}
                    theme="blue"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Attivo</Label>
                  <p className="text-sm text-gray-500">Il tariffario è utilizzabile</p>
                </div>
                <Switch
                  checked={formData.attivo}
                  onCheckedChange={(v) => handleChange('attivo', v)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Voci */}
          {isEditing && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Euro className="h-5 w-5" />
                      Voci Tariffario ({voci.length})
                    </CardTitle>
                    <CardDescription>
                      Prestazioni e spese incluse nel tariffario
                    </CardDescription>
                  </div>
                  <Button onClick={() => setShowNewVoceForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Aggiungi Voce
                  </Button>
                </div>

                {/* Banner informativo filtro branca */}
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium text-blue-800">Prestazioni Medicina del Lavoro</p>
                      <p className="text-blue-700 mt-1">
                        Sono visibili le prestazioni con branca <strong>"Medicina del Lavoro"</strong> o branchType <strong>MEDICA</strong>.
                        Per aggiungere prestazioni al catalogo, vai in <span className="font-medium">Clinica → Prestazioni</span>.
                      </p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* New voce form */}
                {showNewVoceForm && (
                  <Card className="border-dashed border-2 border-primary/50">
                    <CardContent className="pt-4 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Tipo Voce</Label>
                          <Select
                            value={newVoce.tipo}
                            onChange={(e) => setNewVoce(prev => ({
                              ...prev,
                              tipo: e.target.value as TipoVoceTariffario,
                              prestazioneId: '',
                              documentoTemplateId: '',
                              nome: ''
                            }))}
                            options={[
                              // Tipi standard (esclusi DVR_* e DVR aggregato sotto un'unica voce)
                              ...Object.entries(TIPO_VOCE_LABELS)
                                .filter(([v]) => !v.startsWith('DVR_'))
                                .map(([value, label]) => ({ value, label })),
                              // Voce aggregata DVR — espansa in tabella tipologie
                              { value: 'DVR', label: 'DVR (Documento Valutazione Rischi)' },
                            ]}
                          />
                          <p className="text-xs text-muted-foreground">
                            {(newVoce.tipo as string) === 'DVR'
                              ? 'Imposta prezzi differenziati per Nuovo DVR, Aggiornamento con modifiche e Aggiornamento senza modifiche (Art. 17 D.Lgs 81/08).'
                              : TIPO_VOCE_DESCRIPTIONS[newVoce.tipo as TipoVoceTariffario]
                            }
                          </p>
                        </div>

                        {newVoce.tipo === 'PRESTAZIONE' ? (
                          <div className="space-y-2">
                            <Label>Prestazione</Label>
                            {prestazioniMDL.length === 0 ? (
                              <div className="p-3 border border-amber-200 bg-amber-50 rounded-lg">
                                <div className="flex items-start gap-2">
                                  <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                                  <div className="text-sm">
                                    <p className="font-medium text-amber-800">Nessuna prestazione MDL disponibile</p>
                                    <p className="text-amber-700 mt-1">
                                      Configura le prestazioni in <span className="font-medium">Clinica → Prestazioni</span> prima di creare voci tariffario.
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <PrestazioneCombobox
                                  prestazioniMDL={prestazioniMDL}
                                  value={newVoce.prestazioneId || ''}
                                  onChange={(id, prest) => {
                                    setNewVoce(prev => ({
                                      ...prev,
                                      prestazioneId: id,
                                      prezzoBase: prest?.prezzoBase ? Number(prest.prezzoBase) : 0,
                                      ivaAliquota: prest?.ivaAliquota ?? 22
                                    }));
                                    setVisitPrices({ PREVENTIVA: 0, PERIODICA: 0, STRAORDINARIA: 0 } as Partial<Record<CategoriaVisitaMDL, number>>);
                                  }}
                                />
                                {selectedPrestazione && (
                                  <p className="text-xs text-muted-foreground">
                                    <span className="font-medium">{TIPO_PRESTAZIONE_MDL_LABELS[selectedPrestazione.tipo] || selectedPrestazione.tipo}</span>
                                    {selectedPrestazione.durataPrevista ? ` · ${selectedPrestazione.durataPrevista} min` : ''}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        ) : newVoce.tipo === 'QUESTIONARIO' ? (
                          <div className="space-y-2">
                            <Label>Questionario MDL</Label>
                            {questionariMDL.length === 0 ? (
                              <div className="p-3 border border-amber-200 bg-amber-50 rounded-lg">
                                <div className="flex items-start gap-2">
                                  <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                                  <div className="text-sm">
                                    <p className="font-medium text-amber-800">Nessun questionario MDL disponibile</p>
                                    <p className="text-amber-700 mt-1">
                                      Crea questionari MDL in <span className="font-medium">Clinica → Modulistica</span> con tipo Questionario MDL.
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <QuestionarioCombobox
                                questionariMDL={questionariMDL}
                                value={newVoce.documentoTemplateId || ''}
                                onChange={(id) => setNewVoce(prev => ({ ...prev, documentoTemplateId: id }))}
                              />
                            )}
                          </div>
                        ) : (newVoce.tipo as string) === 'DVR' ? (
                          // DVR: nessun campo aggiuntivo nella seconda colonna — prezzi nella tabella dedicata sotto
                          <div className="space-y-2 flex items-center justify-center">
                            <p className="text-sm text-gray-500 italic">Prezzi definiti nella tabella DVR qui sotto</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <Label>Nome</Label>
                            <Input
                              value={newVoce.nome || ''}
                              onChange={(e) => setNewVoce(prev => ({ ...prev, nome: e.target.value }))}
                              placeholder="Nome spesa"
                            />
                          </div>
                        )}
                      </div>

                      {/* Tabella prezzi DVR — 3 tipologie (Art. 17 D.Lgs 81/08) */}
                      {(newVoce.tipo as string) === 'DVR' && (
                        <div className="border rounded-lg p-4 space-y-3 bg-orange-50/50 dark:bg-orange-900/10">
                          <div className="flex items-center gap-2 mb-1">
                            <FileText className="h-4 w-4 text-orange-600" />
                            <Label className="text-orange-800 dark:text-orange-200 font-medium">Prezzi per tipologia DVR (Art. 17 D.Lgs 81/08)</Label>
                          </div>
                          <p className="text-xs text-orange-700 dark:text-orange-300">
                            Imposta un prezzo per ogni tipologia DVR. Le tipologie con prezzo 0 non verranno aggiunte al tariffario.
                          </p>
                          <div className="space-y-2">
                            {([
                              ['DVR_NUOVO', 'Nuovo DVR', 'Prima redazione del Documento di Valutazione dei Rischi (obbligo datore, Art. 17 c.1a)'],
                              ['DVR_AGGIORNAMENTO_CON_MODIFICHE', 'Aggiornamento con modifiche', 'Revisione DVR con variazioni sostanziali a rischi o misure preventive'],
                              ['DVR_AGGIORNAMENTO_SENZA_MODIFICHE', 'Aggiornamento senza modifiche', 'Revisione annuale di conferma senza variazioni sostanziali'],
                            ] as [string, string, string][]).map(([key, label, hint]) => (
                              <div key={key} className="grid grid-cols-[1fr_160px] gap-3 items-center">
                                <div>
                                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{label}</p>
                                  <p className="text-xs text-gray-500">{hint}</p>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="text-sm text-gray-500">€</span>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="0.00"
                                    value={dvrPrices[key] || ''}
                                    onChange={(e) => setDvrPrices(prev => ({
                                      ...prev,
                                      [key]: parseFloat(e.target.value) || 0
                                    }))}
                                    className="text-right"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Tabella prezzi per VISITA_MEDICINA_LAVORO — 10 categorie D.Lgs 81/08 + D.Lgs 19/2022 */}
                      {newVoce.tipo === 'PRESTAZIONE' && isVisitaMDL && (
                        <div className="border rounded-lg p-4 space-y-3 bg-teal-50/50">
                          <div className="flex items-center gap-2 mb-1">
                            <Calendar className="h-4 w-4 text-teal-600" />
                            <Label className="text-teal-800 font-medium">Prezzi per categoria visita (D.Lgs 81/08 art.41 + D.Lgs 19/2022)</Label>
                          </div>
                          <p className="text-xs text-teal-700">Imposta un prezzo per ogni categoria di visita. Le categorie con prezzo 0 non verranno aggiunte al tariffario.</p>
                          <div className="space-y-2">
                            {VISITA_MDL_CATEGORIES.map(({ key, label, hint }) => (
                              <div key={key} className="grid grid-cols-[1fr_160px] gap-3 items-center">
                                <div>
                                  <p className="text-sm font-medium text-gray-800">{label}</p>
                                  <p className="text-xs text-gray-500">{hint}</p>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="text-sm text-gray-500">€</span>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="0.00"
                                    value={visitPrices[key] || ''}
                                    onChange={(e) => setVisitPrices(prev => ({
                                      ...prev,
                                      [key]: parseFloat(e.target.value) || 0
                                    }))}
                                    className="text-right"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Categoria Visita MDL - solo per PRESTAZIONE non VISITA_MEDICINA_LAVORO */}
                      {newVoce.tipo === 'PRESTAZIONE' && !isVisitaMDL && (
                        <div className="space-y-2">
                          <Label>Categoria Visita <span className="text-muted-foreground font-normal">(opzionale)</span></Label>
                          <Select
                            value={newVoce.categoriaVisita || ''}
                            onChange={(e) => setNewVoce(prev => ({
                              ...prev,
                              categoriaVisita: (e.target.value as CategoriaVisitaMDL) || undefined
                            }))}
                            options={[
                              { value: '', label: 'Non specificata' },
                              ...Object.entries(CATEGORIA_VISITA_LABELS).map(([value, label]) => ({
                                value,
                                label
                              }))
                            ]}
                          />
                          {newVoce.categoriaVisita && (
                            <p className="text-xs text-muted-foreground">
                              {CATEGORIA_VISITA_DESCRIPTIONS[newVoce.categoriaVisita]}
                            </p>
                          )}
                        </div>
                      )}

                      {/* CONSULENZA: tariffa oraria e durata minima */}
                      {newVoce.tipo === 'CONSULENZA' && (
                        <div className="border rounded-lg p-4 space-y-4 bg-violet-50/50">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-violet-600" />
                            <Label className="text-violet-800 font-medium">Parametri Consulenza</Label>
                          </div>
                          <p className="text-xs text-violet-700">
                            Il prezzo base è la tariffa oraria. La durata minima definisce la frazione minima fatturabile (es. 30 min = 0.5h).
                          </p>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Durata Minima Fatturabile</Label>
                              <Select
                                value={String(newVoce.durataMinimaMinuti || '')}
                                onChange={(e) => setNewVoce(prev => ({
                                  ...prev,
                                  durataMinimaMinuti: e.target.value ? parseInt(e.target.value) : undefined
                                }))}
                                options={[
                                  { value: '', label: 'Non specificata (1h intera)' },
                                  { value: '15', label: '15 minuti (¼ ora)' },
                                  { value: '30', label: '30 minuti (½ ora)' },
                                  { value: '60', label: '60 minuti (1 ora intera)' },
                                ]}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Tariffa Oraria (€/ora)</Label>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={newVoce.prezzoBase}
                                onChange={(e) => setNewVoce(prev => ({ ...prev, prezzoBase: parseFloat(e.target.value) || 0 }))}
                                placeholder="Es: 150.00"
                              />
                              {newVoce.prezzoBase > 0 && newVoce.durataMinimaMinuti && (
                                <p className="text-xs text-violet-700">
                                  Prezzo per {newVoce.durataMinimaMinuti} min: €{(newVoce.prezzoBase * newVoce.durataMinimaMinuti / 60).toFixed(2)}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        {/* Prezzo base: nascosto per CONSULENZA, VISITA_MEDICINA_LAVORO (ha tabella), DVR (ha tabella tipologie), e quando usaFasceDipendenti (usa fasce) */}
                        {newVoce.tipo !== 'CONSULENZA' && !isVisitaMDL && (newVoce.tipo as string) !== 'DVR' && !newVoce.usaFasceDipendenti && (
                          <div className="space-y-2">
                            <Label>Prezzo Base (€)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={newVoce.prezzoBase}
                              onChange={(e) => setNewVoce(prev => ({ ...prev, prezzoBase: parseFloat(e.target.value) || 0 }))}
                            />
                          </div>
                        )}
                        <div className="space-y-2">
                          <Label>IVA (%)</Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={newVoce.ivaAliquota}
                            onChange={(e) => {
                              const value = e.target.value;
                              const parsed = parseFloat(value);
                              // Permetti 0 come valore valido (prestazioni sanitarie esenti)
                              setNewVoce(prev => ({
                                ...prev,
                                ivaAliquota: isNaN(parsed) ? 22 : parsed
                              }));
                            }}
                          />
                        </div>
                      </div>

                      {/* Frequenza, Unità di Calcolo e Modalità Attivazione */}
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Frequenza Temporale</Label>
                          <Select
                            value={newVoce.frequenza}
                            onChange={(e) => setNewVoce(prev => ({ ...prev, frequenza: e.target.value as FrequenzaTariffario }))}
                            options={Object.entries(FREQUENZA_LABELS)
                              .filter(([key]) => key !== 'PER_VISITA' && key !== 'PER_DIPENDENTE') // Deprecati
                              .map(([key, label]) => ({
                                value: key,
                                label: label
                              }))}
                          />
                          <p className="text-xs text-muted-foreground">
                            Ogni quanto si applica questa voce
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label>Unità di Calcolo</Label>
                          <Select
                            value={newVoce.unitaCalcolo || 'FLAT'}
                            onChange={(e) => setNewVoce(prev => ({ ...prev, unitaCalcolo: e.target.value as UnitaCalcoloTariffario }))}
                            options={Object.entries(UNITA_CALCOLO_LABELS).map(([key, label]) => ({
                              value: key,
                              label: label
                            }))}
                          />
                          <p className="text-xs text-muted-foreground">
                            {UNITA_CALCOLO_DESCRIPTIONS[newVoce.unitaCalcolo as UnitaCalcoloTariffario || 'FLAT']}
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label>Attivazione Fattura</Label>
                          <Select
                            value={newVoce.modalitaAttivazione || 'AUTOMATICA'}
                            onChange={(e) => setNewVoce(prev => ({ ...prev, modalitaAttivazione: e.target.value as ModalitaAttivazioneTariffario }))}
                            options={Object.entries(MODALITA_ATTIVAZIONE_LABELS).map(([key, label]) => ({
                              value: key,
                              label: label
                            }))}
                          />
                          <p className="text-xs text-muted-foreground">
                            {MODALITA_ATTIVAZIONE_DESCRIPTIONS[newVoce.modalitaAttivazione as ModalitaAttivazioneTariffario || 'AUTOMATICA']}
                          </p>
                        </div>
                      </div>

                      {/* P59: Compenso Professionista Section - Tutti i tipi con compenso + DVR (tipo virtuale) */}
                      {(TIPI_VOCE_CON_COMPENSO.includes(newVoce.tipo) || (newVoce.tipo as string) === 'DVR') && (
                        <div className="border rounded-lg p-4 space-y-4 bg-amber-50/50">
                          <div className="flex items-center gap-2">
                            <Euro className="h-4 w-4 text-amber-600" />
                            <Label className="text-amber-800 font-medium">
                              {(newVoce.tipo as string) === 'DVR' || newVoce.tipo === 'DVR_NUOVO' || newVoce.tipo === 'DVR_AGGIORNAMENTO_CON_MODIFICHE' || newVoce.tipo === 'DVR_AGGIORNAMENTO_SENZA_MODIFICHE'
                                ? 'Compenso RSPP'
                                : newVoce.tipo === 'NOMINA_RSPP' || newVoce.tipo === 'SOPRALLUOGO_RSPP'
                                  ? 'Compenso RSPP'
                                  : 'Compenso Professionista'}
                            </Label>
                          </div>
                          <p className="text-xs text-amber-700">
                            {(newVoce.tipo as string) === 'DVR' || newVoce.tipo === 'DVR_NUOVO' || newVoce.tipo === 'DVR_AGGIORNAMENTO_CON_MODIFICHE' || newVoce.tipo === 'DVR_AGGIORNAMENTO_SENZA_MODIFICHE'
                              ? 'Quota corrisposta all\'RSPP per la redazione del DVR. Applicata a tutte le tipologie DVR inserite.'
                              : 'Quota corrisposta al professionista (medico / MC / RSPP) per questa prestazione. Ha priorità assoluta sul tariffario del medico.'}
                          </p>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Tipo Compenso</Label>
                              <Select
                                value={newVoce.compensoProfessionistaTipo || ''}
                                onChange={(e) => {
                                  const tipo = e.target.value as TipoCompensoMedico | '';
                                  setNewVoce(prev => ({
                                    ...prev,
                                    compensoProfessionistaTipo: tipo || undefined,
                                    // Default 70% per percentuale, 50% prezzoBase per fisso
                                    compensoProfessionistaValore: tipo === 'PERCENTUALE' || tipo === 'MINIMO_MASSIMO' ? 70 : tipo === 'FISSO' ? Math.round((prev.prezzoBase || 0) * 0.5 * 100) / 100 : undefined
                                  }));
                                }}
                                options={[
                                  { value: '', label: 'Nessun compenso' },
                                  ...Object.entries(TIPO_COMPENSO_LABELS).map(([key, label]) => ({
                                    value: key,
                                    label: label
                                  }))
                                ]}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>
                                {newVoce.compensoProfessionistaTipo === 'PERCENTUALE' || newVoce.compensoProfessionistaTipo === 'MINIMO_MASSIMO' ? 'Percentuale (%)' : 'Importo (€)'}
                              </Label>
                              <Input
                                type="number"
                                step={newVoce.compensoProfessionistaTipo === 'FISSO' ? '0.01' : '1'}
                                min="0"
                                max={newVoce.compensoProfessionistaTipo === 'PERCENTUALE' || newVoce.compensoProfessionistaTipo === 'MINIMO_MASSIMO' ? '100' : undefined}
                                value={newVoce.compensoProfessionistaValore ?? ''}
                                disabled={!newVoce.compensoProfessionistaTipo}
                                onChange={(e) => setNewVoce(prev => ({
                                  ...prev,
                                  compensoProfessionistaValore: e.target.value ? parseFloat(e.target.value) : undefined
                                }))}
                              />
                            </div>
                          </div>
                          {/* Min/Max solo per MINIMO_MASSIMO */}
                          {newVoce.compensoProfessionistaTipo === 'MINIMO_MASSIMO' && (
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Minimo (€)</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={newVoce.compensoProfessionistaMinimo ?? ''}
                                  onChange={(e) => setNewVoce(prev => ({
                                    ...prev,
                                    compensoProfessionistaMinimo: e.target.value ? parseFloat(e.target.value) : undefined
                                  }))}
                                  placeholder="Es: 50"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Massimo (€)</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={newVoce.compensoProfessionistaMassimo ?? ''}
                                  onChange={(e) => setNewVoce(prev => ({
                                    ...prev,
                                    compensoProfessionistaMassimo: e.target.value ? parseFloat(e.target.value) : undefined
                                  }))}
                                  placeholder="Es: 500"
                                />
                              </div>
                            </div>
                          )}
                          {newVoce.compensoProfessionistaTipo && newVoce.compensoProfessionistaValore && (
                            <p className="text-xs text-amber-700 bg-amber-100 p-2 rounded">
                              Compenso stimato: {newVoce.compensoProfessionistaTipo === 'FISSO'
                                ? `€${newVoce.compensoProfessionistaValore.toFixed(2)}`
                                : `${newVoce.compensoProfessionistaValore}% di €${newVoce.prezzoBase.toFixed(2)} = €${(newVoce.prezzoBase * newVoce.compensoProfessionistaValore / 100).toFixed(2)}`
                              }
                            </p>
                          )}
                        </div>
                      )}

                      {/* Fasce Dipendenti Section */}
                      <div className="border rounded-lg p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Switch
                              checked={newVoce.usaFasceDipendenti || false}
                              onCheckedChange={(checked) => setNewVoce(prev => ({
                                ...prev,
                                usaFasceDipendenti: checked,
                                fasceDipendenti: checked ? (prev.fasceDipendenti?.length ? prev.fasceDipendenti : [
                                  { minDipendenti: 1, maxDipendenti: 5, prezzo: prev.prezzoBase, descrizione: 'Micro impresa' },
                                  { minDipendenti: 6, maxDipendenti: 20, prezzo: prev.prezzoBase * 0.9, descrizione: 'Piccola impresa' },
                                  { minDipendenti: 21, maxDipendenti: null, prezzo: prev.prezzoBase * 0.8, descrizione: 'Media/Grande impresa' }
                                ]) : []
                              }))}
                            />
                            <div>
                              <Label className="mb-0">Usa fasce dipendenti</Label>
                              <p className="text-xs text-gray-500">Prezzi differenziati in base al numero di dipendenti</p>
                            </div>
                          </div>
                        </div>

                        {newVoce.usaFasceDipendenti && (
                          <div className="space-y-3">
                            <div className="grid grid-cols-[1fr_1fr_1fr_2fr_auto] gap-2 text-xs font-medium text-gray-500 px-1">
                              <span>Da (dip.)</span>
                              <span>A (dip.)</span>
                              <span>Prezzo (€)</span>
                              <span>Descrizione</span>
                              <span></span>
                            </div>
                            {(newVoce.fasceDipendenti || []).map((fascia, idx) => (
                              <div key={idx} className="grid grid-cols-[1fr_1fr_1fr_2fr_auto] gap-2 items-center">
                                <Input
                                  type="number"
                                  min="0"
                                  value={fascia.minDipendenti}
                                  onChange={(e) => {
                                    const fasce = [...(newVoce.fasceDipendenti || [])];
                                    fasce[idx] = { ...fasce[idx], minDipendenti: parseInt(e.target.value) || 0 };
                                    setNewVoce(prev => ({ ...prev, fasceDipendenti: fasce }));
                                  }}
                                />
                                <Input
                                  type="number"
                                  min="0"
                                  placeholder="∞"
                                  value={fascia.maxDipendenti ?? ''}
                                  onChange={(e) => {
                                    const fasce = [...(newVoce.fasceDipendenti || [])];
                                    const val = e.target.value ? parseInt(e.target.value) : null;
                                    fasce[idx] = { ...fasce[idx], maxDipendenti: val };
                                    setNewVoce(prev => ({ ...prev, fasceDipendenti: fasce }));
                                  }}
                                />
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={fascia.prezzo}
                                  onChange={(e) => {
                                    const fasce = [...(newVoce.fasceDipendenti || [])];
                                    fasce[idx] = { ...fasce[idx], prezzo: parseFloat(e.target.value) || 0 };
                                    setNewVoce(prev => ({ ...prev, fasceDipendenti: fasce }));
                                  }}
                                />
                                <Input
                                  value={fascia.descrizione || ''}
                                  placeholder="Es. Micro impresa"
                                  onChange={(e) => {
                                    const fasce = [...(newVoce.fasceDipendenti || [])];
                                    fasce[idx] = { ...fasce[idx], descrizione: e.target.value };
                                    setNewVoce(prev => ({ ...prev, fasceDipendenti: fasce }));
                                  }}
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const fasce = (newVoce.fasceDipendenti || []).filter((_, i) => i !== idx);
                                    setNewVoce(prev => ({ ...prev, fasceDipendenti: fasce }));
                                  }}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const fasce = [...(newVoce.fasceDipendenti || [])];
                                const lastMax = fasce.length > 0 ? (fasce[fasce.length - 1].maxDipendenti ?? 0) : 0;
                                fasce.push({
                                  minDipendenti: lastMax + 1,
                                  maxDipendenti: null,
                                  prezzo: newVoce.prezzoBase,
                                  descrizione: ''
                                });
                                setNewVoce(prev => ({ ...prev, fasceDipendenti: fasce }));
                              }}
                            >
                              <Plus className="h-4 w-4 mr-1" /> Aggiungi fascia
                            </Button>
                          </div>
                        )}
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setShowNewVoceForm(false)}>
                          Annulla
                        </Button>
                        <CRUDPrimaryButton
                          operation="create"
                          onClick={handleAddVoce}
                          disabled={saving || (newVoce.tipo === 'PRESTAZIONE' && prestazioniMDL.length === 0) || (newVoce.tipo === 'QUESTIONARIO' && questionariMDL.length === 0)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Aggiungi
                        </CRUDPrimaryButton>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Voci list */}
                {voci.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Nessuna voce nel tariffario</p>
                    <p className="text-sm">Aggiungi prestazioni o spese</p>
                  </div>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    {/* Voci divise in 3 sezioni come nella pagina di dettaglio e nel PDF.
                        Il riordino (drag) resta possibile all'interno di ciascuna sezione. */}
                    <div className="space-y-5">
                      {SEZIONI_VOCI.map((sezione) => {
                        const bucket = voci.filter(v => categoriaVoce(v.tipo) === sezione.key);
                        if (bucket.length === 0) return null;
                        const SezioneIcon = sezione.icon;
                        return (
                          <div key={sezione.key} className="space-y-2">
                            <div className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide ${sezione.color}`}>
                              <SezioneIcon className="h-3.5 w-3.5" />
                              {sezione.label}
                              <span className="text-gray-400 font-normal normal-case">({bucket.length})</span>
                            </div>
                            <SortableContext
                              items={bucket.map(v => v.id)}
                              strategy={verticalListSortingStrategy}
                            >
                              <div className="space-y-2">
                                {bucket.map((voce) => renderVoceCard(voce))}
                              </div>
                            </SortableContext>
                          </div>
                        );
                      })}
                    </div>
                  </DndContext>
                )}
              </CardContent>
            </Card>
          )}

          {!isEditing && (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center text-gray-500">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Salva il tariffario per poter aggiungere le voci</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Note</CardTitle>
            </CardHeader>
            <CardContent>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                value={formData.note}
                onChange={(e) => handleChange('note', e.target.value)}
                placeholder="Note interne sul tariffario..."
                rows={5}
              />
            </CardContent>
          </Card>

          {isEditing && (
            <Card>
              <CardHeader>
                <CardTitle>Riepilogo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">Totale voci:</span>
                  <span className="font-medium">{voci.length}</span>
                </div>
                <div className="border-t border-gray-200 my-4" />
                <div className="flex justify-between">
                  <span className="text-gray-500">Prestazioni:</span>
                  <span>{voci.filter(v => v.tipo === 'PRESTAZIONE').length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Spese fisse:</span>
                  <span>{voci.filter(v => v.tipo === 'SPESA_FISSA').length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Spese ricorrenti:</span>
                  <span>{voci.filter(v => v.tipo === 'SPESA_RICORRENTE').length}</span>
                </div>
                <div className="border-t border-gray-200 my-4" />
                <div className="flex justify-between">
                  <span className="text-gray-500">Con fasce:</span>
                  <span>{voci.filter(v => v.usaFasceDipendenti).length}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

// P59 Sprint 11.2: Sortable wrapper for drag & drop reordering
interface SortableVoceCardProps {
  voce: VoceTariffario;
  tariffarioId: string;
  expanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onUpdate: (updatedVoce: VoceTariffario) => void;
  disabled?: boolean;
}

const SortableVoceCard: React.FC<SortableVoceCardProps> = (props) => {
  const { voce, disabled, ...otherProps } = props;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: voce.id,
    disabled: disabled
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1 : 0,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <VoceCard
        voce={voce}
        {...otherProps}
        dragHandleListeners={listeners}
      />
    </div>
  );
};

// ==================================================================
// HiddenSortableItem — voce invisibile mantenuta nel DnD items list
// per le voci secondarie di un gruppo VISITA_MDL
// ==================================================================
const HiddenSortableItem: React.FC<{ id: string; disabled?: boolean }> = ({ id, disabled }) => {
  const { setNodeRef, attributes } = useSortable({ id, disabled });
  return <div ref={setNodeRef} {...attributes} style={{ height: 0, overflow: 'hidden', margin: 0, padding: 0 }} />;
};

// ==================================================================
// VisitaMDLGroupCardEdit — card compatta con edit mode per gruppo
// voci VISITA_MEDICINA_LAVORO che condividono la stessa prestazione
// ==================================================================
interface VisitaMDLGroupCardEditProps {
  groupKey: string;
  prestazioneName: string;
  groupVoci: VoceTariffario[];
  tariffarioId: string;
  expanded: boolean;
  onToggle: () => void;
  onDeleteGroup: () => void;
  onUpdateGroup: (updatedVoci: VoceTariffario[], deletedIds: string[]) => void;
  dragHandleListeners?: Record<string, unknown>;
}

const VisitaMDLGroupCardEdit: React.FC<VisitaMDLGroupCardEditProps> = ({
  groupKey, prestazioneName, groupVoci, tariffarioId, expanded,
  onToggle, onDeleteGroup, onUpdateGroup, dragHandleListeners
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editPrices, setEditPrices] = useState<Partial<Record<CategoriaVisitaMDL, number>>>({});
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();
  const { confirmDelete: confirmDel } = useConfirmDialog();

  const enterEdit = () => {
    const prices: Partial<Record<CategoriaVisitaMDL, number>> = {};
    groupVoci.forEach(v => { if (v.categoriaVisita) prices[v.categoriaVisita] = Number(v.prezzoBase); });
    setEditPrices(prices);
    setIsEditing(true);
  };

  const cancelEdit = () => { setIsEditing(false); setEditPrices({}); };

  const handleSave = async () => {
    try {
      setSaving(true);
      const updatedVoci: VoceTariffario[] = [];
      const deletedIds: string[] = [];
      const toCreate: CategoriaVisitaMDL[] = [];

      for (const cat of VISITA_MDL_CATEGORIES) {
        const newPrice = editPrices[cat.key] ?? 0;
        const existing = groupVoci.find(v => v.categoriaVisita === cat.key);

        if (existing && newPrice > 0) {
          const res = await tariffariAziendaliApi.updateVoce(tariffarioId, existing.id, { prezzoBase: newPrice });
          if (res.success) updatedVoci.push({ ...existing, prezzoBase: newPrice });
        } else if (existing && newPrice === 0) {
          await tariffariAziendaliApi.deleteVoce(tariffarioId, existing.id);
          deletedIds.push(existing.id);
        } else if (!existing && newPrice > 0) {
          toCreate.push(cat.key);
        }
      }

      if (toCreate.length > 0) {
        const first = groupVoci[0];
        const batchRes = await tariffariAziendaliApi.addVoceBatch(tariffarioId, toCreate.map(categoria => ({
          tipo: 'PRESTAZIONE' as TipoVoceTariffario,
          prestazioneId: groupKey,
          prezzoBase: editPrices[categoria]!,
          categoriaVisita: categoria,
          ivaAliquota: first.ivaAliquota,
          frequenza: first.frequenza,
          unitaCalcolo: first.unitaCalcolo,
          modalitaAttivazione: first.modalitaAttivazione,
          usaFasceDipendenti: false,
        })));
        if (batchRes.success) updatedVoci.push(...batchRes.data);
      }

      onUpdateGroup(updatedVoci, deletedIds);
      showToast({ message: 'Voci visita aggiornate', type: 'success' });
      setIsEditing(false);
    } catch (error) {
      showToast({ message: "Errore nel salvataggio", type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGroup = async () => {
    const confirmed = await confirmDel(prestazioneName);
    if (!confirmed) return;
    onDeleteGroup();
  };

  return (
    <div className="border border-teal-200 dark:border-teal-700 rounded-lg">
      {/* Header */}
      <div
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-teal-50 dark:hover:bg-teal-900/20"
        onClick={() => !isEditing && onToggle()}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            type="button"
            className={`touch-none flex-shrink-0 ${dragHandleListeners ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
            onClick={(e) => e.stopPropagation()}
            {...(dragHandleListeners || {})}
          >
            <GripVertical className="h-4 w-4 text-gray-400 hover:text-gray-600" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-gray-900 dark:text-gray-50">{prestazioneName}</span>
              <Badge variant="outline" className="text-xs">Prestazione</Badge>
              <Badge className="text-xs bg-teal-100 text-teal-800 dark:bg-teal-800 dark:text-teal-100 border-0">
                {groupVoci.length} {groupVoci.length === 1 ? 'categoria' : 'categorie'} visita
              </Badge>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500 dark:text-gray-400 mt-1">
              {VISITA_MDL_CATEGORIES
                .filter(cat => groupVoci.some(v => v.categoriaVisita === cat.key))
                .map(({ key }) => {
                  const voce = groupVoci.find(v => v.categoriaVisita === key)!;
                  return (
                    <span key={key} className="flex items-center gap-0.5">
                      <span className="text-teal-600 dark:text-teal-400">{CATEGORIA_VISITA_LABELS[key]}:</span>
                      <span className="ml-0.5 font-medium text-gray-700 dark:text-gray-200"> €{Number(voce.prezzoBase).toFixed(2)}</span>
                    </span>
                  );
                })}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {!isEditing && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); enterEdit(); }}
                className="text-xs px-2 py-1 rounded text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
              >
                Modifica
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleDeleteGroup(); }}
                className="p-1.5 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
              {expanded
                ? <ChevronUp className="h-4 w-4 text-gray-400" />
                : <ChevronDown className="h-4 w-4 text-gray-400" />
              }
            </>
          )}
        </div>
      </div>

      {/* Edit mode */}
      {isEditing && (
        <div className="border-t border-teal-200 dark:border-teal-700 p-4 bg-teal-50/50 dark:bg-teal-900/20 space-y-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-teal-600" />
            <span className="text-sm font-medium text-teal-800 dark:text-teal-200">
              Prezzi per categoria visita (D.Lgs 81/08 art.41)
            </span>
          </div>
          <div className="space-y-2">
            {VISITA_MDL_CATEGORIES.map(({ key, label, hint }) => (
              <div key={key} className="grid grid-cols-[1fr_160px] gap-3 items-center">
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{label}</p>
                  <p className="text-xs text-gray-500">{hint}</p>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-gray-500">€</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editPrices[key] ?? 0}
                    onChange={e => setEditPrices(prev => ({ ...prev, [key]: parseFloat(e.target.value) || 0 }))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm
                               focus:outline-none focus:ring-2 focus:ring-teal-500
                               bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Prezzo 0 = categoria rimossa dal tariffario</p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={cancelEdit}
              className="px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600
                         hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
            >
              Annulla
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-3 py-1.5 text-sm rounded bg-teal-600 text-white hover:bg-teal-700
                         disabled:opacity-50 flex items-center gap-2"
            >
              {saving && <span className="inline-block h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              Salva Prezzi
            </button>
          </div>
        </div>
      )}

      {/* Expanded detail (non-edit) */}
      {expanded && !isEditing && (
        <div className="border-t border-teal-200 dark:border-teal-700 bg-teal-50/50 dark:bg-teal-900/10 p-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-teal-200 dark:border-teal-700 text-left bg-teal-100/50 dark:bg-teal-800/30">
                <th className="p-2 font-medium text-gray-700 dark:text-gray-300">Categoria</th>
                <th className="p-2 text-right font-medium text-gray-700 dark:text-gray-300">Prezzo</th>
                <th className="p-2 text-right font-medium text-gray-700 dark:text-gray-300">IVA</th>
                <th className="p-2 text-right font-medium text-gray-700 dark:text-gray-300">Frequenza</th>
              </tr>
            </thead>
            <tbody>
              {VISITA_MDL_CATEGORIES
                .filter(cat => groupVoci.some(v => v.categoriaVisita === cat.key))
                .map(({ key, label }) => {
                  const voce = groupVoci.find(v => v.categoriaVisita === key)!;
                  return (
                    <tr key={key} className="border-b border-teal-100 dark:border-teal-800/40 last:border-0">
                      <td className="p-2 font-medium text-gray-900 dark:text-gray-50">{label}</td>
                      <td className="p-2 text-right font-semibold text-teal-700 dark:text-teal-300">€ {Number(voce.prezzoBase).toFixed(2)}</td>
                      <td className="p-2 text-right text-gray-600 dark:text-gray-400">{voce.ivaAliquota}%</td>
                      <td className="p-2 text-right text-gray-600 dark:text-gray-400">{FREQUENZA_LABELS[voce.frequenza]}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ==================================================================
// SortableVisitaMDLGroupCard — wrapper DnD per VisitaMDLGroupCardEdit
// ==================================================================
interface SortableVisitaMDLGroupCardProps {
  voce: VoceTariffario;
  groupVoci: VoceTariffario[];
  tariffarioId: string;
  expanded: boolean;
  onToggle: () => void;
  onDeleteGroup: () => void;
  onUpdateGroup: (updatedVoci: VoceTariffario[], deletedIds: string[]) => void;
  disabled?: boolean;
}

const SortableVisitaMDLGroupCard: React.FC<SortableVisitaMDLGroupCardProps> = ({
  voce, groupVoci, tariffarioId, expanded, onToggle, onDeleteGroup, onUpdateGroup, disabled
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: voce.id,
    disabled
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1 : 0,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <VisitaMDLGroupCardEdit
        groupKey={voce.prestazioneId!}
        prestazioneName={voce.prestazione?.nome || 'Visita Medica del Lavoro'}
        groupVoci={groupVoci}
        tariffarioId={tariffarioId}
        expanded={expanded}
        onToggle={onToggle}
        onDeleteGroup={onDeleteGroup}
        onUpdateGroup={onUpdateGroup}
        dragHandleListeners={listeners}
      />
    </div>
  );
};

// ==================================================================
// DVRGroupCardEdit — card compatta con edit mode per il gruppo DVR
// Raggruppa DVR_NUOVO, DVR_AGGIORNAMENTO_CON_MODIFICHE, DVR_AGGIORNAMENTO_SENZA_MODIFICHE
// Conforme D.Lgs 81/08 art. 17 c.1a + art. 29
// ==================================================================
const DVR_TYPES: { key: TipoVoceTariffario; label: string; hint: string }[] = [
  { key: 'DVR_NUOVO', label: 'Nuovo DVR', hint: 'Prima redazione — Art. 17 c.1a D.Lgs 81/08' },
  { key: 'DVR_AGGIORNAMENTO_CON_MODIFICHE', label: 'Aggiornamento con modifiche', hint: 'Revisione con variazioni sostanziali ai rischi o misure preventive — Art. 29 c.3' },
  { key: 'DVR_AGGIORNAMENTO_SENZA_MODIFICHE', label: 'Aggiornamento senza modifiche', hint: 'Revisione annuale di conferma senza variazioni sostanziali' },
];

interface DVRGroupCardEditProps {
  groupVoci: VoceTariffario[];
  tariffarioId: string;
  expanded: boolean;
  onToggle: () => void;
  onDeleteGroup: () => void;
  onUpdateGroup: (updatedVoci: VoceTariffario[], deletedIds: string[]) => void;
  dragHandleListeners?: Record<string, unknown>;
}

const DVRGroupCardEdit: React.FC<DVRGroupCardEditProps> = ({
  groupVoci, tariffarioId, expanded, onToggle, onDeleteGroup, onUpdateGroup, dragHandleListeners
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editPrices, setEditPrices] = useState<Partial<Record<TipoVoceTariffario, number>>>({});
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();
  const { confirmDelete: confirmDel } = useConfirmDialog();

  const enterEdit = () => {
    const prices: Partial<Record<TipoVoceTariffario, number>> = {};
    groupVoci.forEach(v => { prices[v.tipo] = Number(v.prezzoBase); });
    setEditPrices(prices);
    setIsEditing(true);
  };

  const cancelEdit = () => { setIsEditing(false); setEditPrices({}); };

  const handleSave = async () => {
    try {
      setSaving(true);
      const updatedVoci: VoceTariffario[] = [];
      const deletedIds: string[] = [];

      for (const { key, label } of DVR_TYPES) {
        const newPrice = editPrices[key] ?? 0;
        const existing = groupVoci.find(v => v.tipo === key);

        if (existing && newPrice > 0) {
          const res = await tariffariAziendaliApi.updateVoce(tariffarioId, existing.id, { prezzoBase: newPrice });
          if (res.success) updatedVoci.push({ ...existing, prezzoBase: newPrice });
        } else if (existing && newPrice === 0) {
          await tariffariAziendaliApi.deleteVoce(tariffarioId, existing.id);
          deletedIds.push(existing.id);
        } else if (!existing && newPrice > 0) {
          const first = groupVoci[0];
          const createRes = await tariffariAziendaliApi.addVoceBatch(tariffarioId, [{
            tipo: key,
            nome: label,
            prezzoBase: newPrice,
            ivaAliquota: first?.ivaAliquota ?? 22,
            frequenza: first?.frequenza ?? 'UNA_TANTUM',
            unitaCalcolo: 'FLAT' as const,
            modalitaAttivazione: 'SU_CONFERMA' as const,
            usaFasceDipendenti: false,
          }]);
          if (createRes.success) updatedVoci.push(...createRes.data);
        }
      }

      onUpdateGroup(updatedVoci, deletedIds);
      showToast({ message: 'Voci DVR aggiornate', type: 'success' });
      setIsEditing(false);
    } catch (error) {
      showToast({ message: 'Errore nel salvataggio del DVR', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGroup = async () => {
    const confirmed = await confirmDel('Documento Valutazione Rischi');
    if (!confirmed) return;
    onDeleteGroup();
  };

  return (
    <div className="border border-orange-200 dark:border-orange-700 rounded-lg">
      {/* Header */}
      <div
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-orange-50 dark:hover:bg-orange-900/20"
        onClick={() => !isEditing && onToggle()}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            type="button"
            className={`touch-none flex-shrink-0 ${dragHandleListeners ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
            onClick={(e) => e.stopPropagation()}
            {...(dragHandleListeners || {})}
          >
            <GripVertical className="h-4 w-4 text-gray-400 hover:text-gray-600" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-gray-900 dark:text-gray-50">Documento Valutazione Rischi</span>
              <Badge className="text-xs bg-orange-100 text-orange-800 dark:bg-orange-800 dark:text-orange-100 border-0">
                DVR
              </Badge>
              <Badge variant="outline" className="text-xs">
                {groupVoci.length} {groupVoci.length === 1 ? 'tipologia' : 'tipologie'}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500 dark:text-gray-400 mt-1">
              {DVR_TYPES
                .filter(dt => groupVoci.some(v => v.tipo === dt.key))
                .map(({ key, label }) => {
                  const voce = groupVoci.find(v => v.tipo === key)!;
                  return (
                    <span key={key} className="flex items-center gap-0.5">
                      <span className="text-orange-600 dark:text-orange-400">{label}:</span>
                      <span className="ml-0.5 font-medium text-gray-700 dark:text-gray-200"> €{Number(voce.prezzoBase).toFixed(2)}</span>
                    </span>
                  );
                })}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {!isEditing && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); enterEdit(); }}
                className="text-xs px-2 py-1 rounded text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
              >
                Modifica
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleDeleteGroup(); }}
                className="p-1.5 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
              {expanded
                ? <ChevronUp className="h-4 w-4 text-gray-400" />
                : <ChevronDown className="h-4 w-4 text-gray-400" />
              }
            </>
          )}
        </div>
      </div>

      {/* Edit mode */}
      {isEditing && (
        <div className="border-t border-orange-200 dark:border-orange-700 p-4 bg-orange-50/50 dark:bg-orange-900/20 space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-orange-600" />
            <span className="text-sm font-medium text-orange-800 dark:text-orange-200">
              Prezzi per tipologia DVR (D.Lgs 81/08 artt. 17, 29)
            </span>
          </div>
          <div className="space-y-2">
            {DVR_TYPES.map(({ key, label, hint }) => (
              <div key={key} className="grid grid-cols-[1fr_160px] gap-3 items-center">
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{label}</p>
                  <p className="text-xs text-gray-500">{hint}</p>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-gray-500">€</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editPrices[key] ?? 0}
                    onChange={e => setEditPrices(prev => ({ ...prev, [key]: parseFloat(e.target.value) || 0 }))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm
                               focus:outline-none focus:ring-2 focus:ring-orange-500
                               bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Prezzo 0 = tipologia rimossa dal tariffario</p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={cancelEdit}
              className="px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600
                         hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
            >
              Annulla
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-3 py-1.5 text-sm rounded bg-orange-600 text-white hover:bg-orange-700
                         disabled:opacity-50 flex items-center gap-2"
            >
              {saving && <span className="inline-block h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              Salva Prezzi
            </button>
          </div>
        </div>
      )}

      {/* Expanded detail (non-edit) */}
      {expanded && !isEditing && (
        <div className="border-t border-orange-200 dark:border-orange-700 bg-orange-50/50 dark:bg-orange-900/10 p-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-orange-200 dark:border-orange-700 text-left bg-orange-100/50 dark:bg-orange-800/30">
                <th className="p-2 font-medium text-gray-700 dark:text-gray-300">Tipologia DVR</th>
                <th className="p-2 text-right font-medium text-gray-700 dark:text-gray-300">Prezzo</th>
                <th className="p-2 text-right font-medium text-gray-700 dark:text-gray-300">IVA</th>
                <th className="p-2 text-right font-medium text-gray-700 dark:text-gray-300">Frequenza</th>
              </tr>
            </thead>
            <tbody>
              {DVR_TYPES
                .filter(dt => groupVoci.some(v => v.tipo === dt.key))
                .map(({ key, label }) => {
                  const voce = groupVoci.find(v => v.tipo === key)!;
                  return (
                    <tr key={key} className="border-b border-orange-100 dark:border-orange-800/40 last:border-0">
                      <td className="p-2 font-medium text-gray-900 dark:text-gray-50">{label}</td>
                      <td className="p-2 text-right font-semibold text-orange-700 dark:text-orange-300">€ {Number(voce.prezzoBase).toFixed(2)}</td>
                      <td className="p-2 text-right text-gray-600 dark:text-gray-400">{voce.ivaAliquota}%</td>
                      <td className="p-2 text-right text-gray-600 dark:text-gray-400">{FREQUENZA_LABELS[voce.frequenza]}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ==================================================================
// SortableDVRGroupCard — wrapper DnD per DVRGroupCardEdit
// ==================================================================
interface SortableDVRGroupCardProps {
  voce: VoceTariffario;
  groupVoci: VoceTariffario[];
  tariffarioId: string;
  expanded: boolean;
  onToggle: () => void;
  onDeleteGroup: () => void;
  onUpdateGroup: (updatedVoci: VoceTariffario[], deletedIds: string[]) => void;
  disabled?: boolean;
}

const SortableDVRGroupCard: React.FC<SortableDVRGroupCardProps> = ({
  voce, groupVoci, tariffarioId, expanded, onToggle, onDeleteGroup, onUpdateGroup, disabled
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: voce.id,
    disabled
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1 : 0,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <DVRGroupCardEdit
        groupVoci={groupVoci}
        tariffarioId={tariffarioId}
        expanded={expanded}
        onToggle={onToggle}
        onDeleteGroup={onDeleteGroup}
        onUpdateGroup={onUpdateGroup}
        dragHandleListeners={listeners}
      />
    </div>
  );
};

// VoceCard component with inline editing
interface VoceCardProps {
  voce: VoceTariffario;
  tariffarioId: string;
  expanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onUpdate: (updatedVoce: VoceTariffario) => void;
  dragHandleListeners?: Record<string, unknown>;
}

const VoceCard: React.FC<VoceCardProps> = ({ voce, tariffarioId, expanded, onToggle, onDelete, onUpdate, dragHandleListeners }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    prezzoBase: Number(voce.prezzoBase),
    frequenza: voce.frequenza,
    unitaCalcolo: voce.unitaCalcolo,
    usaFasceDipendenti: voce.usaFasceDipendenti,
    descrizione: voce.descrizione || '',
    note: voce.note || '',
    // P59: Campi compenso professionista per edit mode
    compensoProfessionistaTipo: voce.compensoProfessionistaTipo || undefined,
    compensoProfessionistaValore: voce.compensoProfessionistaValore ?? undefined,
    compensoProfessionistaMinimo: voce.compensoProfessionistaMinimo ?? undefined,
    compensoProfessionistaMassimo: voce.compensoProfessionistaMassimo ?? undefined,
    // CONSULENZA: frazione di ora minima
    durataMinimaMinuti: voce.durataMinimaMinuti ?? undefined
  });
  const [fasciaEdit, setFasciaEdit] = useState<{ [id: string]: { prezzo: number } }>({});
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  // Inizializza i valori delle fasce
  useEffect(() => {
    const initialFasceState: { [id: string]: { prezzo: number } } = {};
    voce.fasceDipendenti?.forEach(f => {
      initialFasceState[f.id] = { prezzo: Number(f.prezzo) };
    });
    setFasciaEdit(initialFasceState);
  }, [voce.fasceDipendenti]);

  const handleSaveVoce = async () => {
    try {
      setSaving(true);

      // Aggiorna la voce principale - P59: includi anche campi compenso professionista
      const response = await tariffariAziendaliApi.updateVoce(tariffarioId, voce.id, {
        prezzoBase: editData.prezzoBase,
        frequenza: editData.frequenza,
        unitaCalcolo: editData.unitaCalcolo,
        usaFasceDipendenti: editData.usaFasceDipendenti,
        descrizione: editData.descrizione || undefined,
        note: editData.note || undefined,
        // P59: Campi compenso professionista
        compensoProfessionistaTipo: editData.compensoProfessionistaTipo || undefined,
        compensoProfessionistaValore: editData.compensoProfessionistaValore ?? undefined,
        compensoProfessionistaMinimo: editData.compensoProfessionistaMinimo ?? undefined,
        compensoProfessionistaMassimo: editData.compensoProfessionistaMassimo ?? undefined,
        // CONSULENZA: frazione di ora
        ...(voce.tipo === 'CONSULENZA' ? { durataMinimaMinuti: editData.durataMinimaMinuti ?? null } : {})
      });

      if (response.success) {
        // Aggiorna le fasce se modificate
        if (voce.usaFasceDipendenti && voce.fasceDipendenti) {
          for (const fascia of voce.fasceDipendenti) {
            const newPrezzo = fasciaEdit[fascia.id]?.prezzo;
            if (newPrezzo !== undefined && newPrezzo !== Number(fascia.prezzo)) {
              await tariffariAziendaliApi.updateFascia(voce.id, fascia.id, {
                prezzo: newPrezzo
              });
            }
          }
        }

        // Notifica il parent con i dati aggiornati
        onUpdate({
          ...voce,
          ...editData,
          durataMinimaMinuti: editData.durataMinimaMinuti ?? null,
          fasceDipendenti: voce.fasceDipendenti?.map(f => ({
            ...f,
            prezzo: fasciaEdit[f.id]?.prezzo ?? f.prezzo
          }))
        });

        showToast({ message: 'Voce aggiornata', type: 'success' });
        setIsEditing(false);
      }
    } catch (error) {
      showToast({ message: 'Errore nell\'aggiornamento', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    // Reset ai valori originali - P59: includi anche campi compenso
    setEditData({
      prezzoBase: Number(voce.prezzoBase),
      frequenza: voce.frequenza,
      unitaCalcolo: voce.unitaCalcolo,
      usaFasceDipendenti: voce.usaFasceDipendenti,
      descrizione: voce.descrizione || '',
      note: voce.note || '',
      compensoProfessionistaTipo: voce.compensoProfessionistaTipo || undefined,
      compensoProfessionistaValore: voce.compensoProfessionistaValore ?? undefined,
      compensoProfessionistaMinimo: voce.compensoProfessionistaMinimo ?? undefined,
      compensoProfessionistaMassimo: voce.compensoProfessionistaMassimo ?? undefined,
      durataMinimaMinuti: voce.durataMinimaMinuti ?? undefined
    });
    const resetFasceState: { [id: string]: { prezzo: number } } = {};
    voce.fasceDipendenti?.forEach(f => {
      resetFasceState[f.id] = { prezzo: Number(f.prezzo) };
    });
    setFasciaEdit(resetFasceState);
    setIsEditing(false);
  };

  return (
    <div className="border rounded-lg">
      <div
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
        onClick={() => !isEditing && onToggle()}
      >
        <div className="flex items-center gap-3">
          {/* P59 Sprint 11.2: Drag handle - only active if listeners provided */}
          <button
            type="button"
            className={`touch-none ${dragHandleListeners ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
            onClick={(e) => e.stopPropagation()}
            {...(dragHandleListeners || {})}
          >
            <GripVertical className="h-4 w-4 text-gray-400 hover:text-gray-600" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">{getVoceDisplayName(voce)}</span>
              <Badge variant="outline" className="text-xs">
                {TIPO_VOCE_LABELS[voce.tipo]}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
              <span className="flex items-center gap-1">
                <Euro className="h-3 w-3" />
                {isEditing ? editData.prezzoBase.toFixed(2) : Number(voce.prezzoBase).toFixed(2)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {FREQUENZA_LABELS[editData.frequenza]}
              </span>
              {voce.usaFasceDipendenti && (
                <span className="flex items-center gap-1 text-blue-600">
                  <Users className="h-3 w-3" />
                  {voce.fasceDipendenti?.length || 0} fasce
                </span>
              )}
              {/* P59: Mostra compenso professionista se configurato */}
              {voce.compensoProfessionistaTipo && (
                <span className="flex items-center gap-1 text-amber-600" title="Compenso professionista">
                  <Euro className="h-3 w-3" />
                  {voce.compensoProfessionistaTipo === 'FISSO'
                    ? `€${Number(voce.compensoProfessionistaValore || 0).toFixed(2)}`
                    : `${voce.compensoProfessionistaValore || 0}%`
                  }
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isEditing && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => { e.stopPropagation(); setIsEditing(true); if (!expanded) onToggle(); }}
                title="Modifica voce"
              >
                <Euro className="h-4 w-4 text-blue-500" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                title="Elimina voce"
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </>
          )}
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </div>

      {expanded && (
        <div className="border-t p-4 bg-gray-50 dark:bg-gray-800 space-y-4">
          {isEditing ? (
            // Editing mode
            <>
              <div className="grid grid-cols-2 gap-4">
                {/* Hide standalone prezzoBase for CONSULENZA — handled in CONSULENZA block below */}
                {voce.tipo !== 'CONSULENZA' && (
                  <div>
                    <Label>Prezzo Base (€)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editData.prezzoBase}
                      onChange={(e) => setEditData(prev => ({ ...prev, prezzoBase: parseFloat(e.target.value) || 0 }))}
                      className="mt-1"
                    />
                  </div>
                )}
                <div>
                  <Label>Frequenza</Label>
                  <Select
                    value={editData.frequenza}
                    onChange={(e) => setEditData(prev => ({ ...prev, frequenza: e.target.value as FrequenzaTariffario }))}
                  >
                    {Object.entries(FREQUENZA_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Unità di Calcolo</Label>
                  <Select
                    value={editData.unitaCalcolo}
                    onChange={(e) => setEditData(prev => ({ ...prev, unitaCalcolo: e.target.value as UnitaCalcoloTariffario }))}
                  >
                    {Object.entries(UNITA_CALCOLO_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </Select>
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Switch
                    checked={editData.usaFasceDipendenti}
                    onCheckedChange={(checked) => setEditData(prev => ({ ...prev, usaFasceDipendenti: checked }))}
                  />
                  <Label>Usa fasce dipendenti</Label>
                </div>
              </div>

              {/* Fasce dipendenti editing */}
              {editData.usaFasceDipendenti && voce.fasceDipendenti && voce.fasceDipendenti.length > 0 && (
                <div className="border rounded-lg p-3 bg-white dark:bg-gray-700">
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Fasce Dipendenti - Modifica Prezzi
                  </h4>
                  <div className="space-y-2">
                    {voce.fasceDipendenti.map((fascia: FasciaDipendentiPrezzo) => (
                      <div
                        key={fascia.id}
                        className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-600 rounded"
                      >
                        <span className="flex-1 text-sm">
                          {formatFasciaDipendenti(fascia.minDipendenti, fascia.maxDipendenti)}
                          {fascia.descrizione && <span className="text-gray-500 ml-2">({fascia.descrizione})</span>}
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="text-sm">€</span>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={fasciaEdit[fascia.id]?.prezzo ?? fascia.prezzo}
                            onChange={(e) => setFasciaEdit(prev => ({
                              ...prev,
                              [fascia.id]: { prezzo: parseFloat(e.target.value) || 0 }
                            }))}
                            className="w-24"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* P59: Compenso Professionista Section in Edit Mode */}
              {TIPI_VOCE_CON_COMPENSO.includes(voce.tipo) && (
                <div className="border rounded-lg p-4 space-y-4 bg-amber-50/50 dark:bg-amber-900/20">
                  <div className="flex items-center gap-2">
                    <Euro className="h-4 w-4 text-amber-600" />
                    <Label className="text-amber-800 dark:text-amber-200 font-medium">Compenso Medico</Label>
                  </div>
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    Quota corrisposta al professionista (medico / MC / RSPP) per questa prestazione. Ha priorità assoluta sul tariffario del medico.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tipo Compenso</Label>
                      <Select
                        value={editData.compensoProfessionistaTipo || ''}
                        onChange={(e) => {
                          const tipo = e.target.value as TipoCompensoMedico | '';
                          setEditData(prev => ({
                            ...prev,
                            compensoProfessionistaTipo: tipo || undefined,
                            compensoProfessionistaValore: tipo === 'PERCENTUALE' || tipo === 'MINIMO_MASSIMO' ? 70 : tipo === 'FISSO' ? 300 : undefined,
                            compensoProfessionistaMinimo: undefined,
                            compensoProfessionistaMassimo: undefined
                          }));
                        }}
                        options={[
                          { value: '', label: 'Nessun compenso' },
                          ...Object.entries(TIPO_COMPENSO_LABELS).map(([key, label]) => ({
                            value: key,
                            label: label
                          }))
                        ]}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>
                        {editData.compensoProfessionistaTipo === 'PERCENTUALE' || editData.compensoProfessionistaTipo === 'MINIMO_MASSIMO' ? 'Percentuale (%)' : 'Importo (€)'}
                      </Label>
                      <Input
                        type="number"
                        step={editData.compensoProfessionistaTipo === 'FISSO' ? '0.01' : '1'}
                        min="0"
                        max={editData.compensoProfessionistaTipo === 'PERCENTUALE' || editData.compensoProfessionistaTipo === 'MINIMO_MASSIMO' ? '100' : undefined}
                        value={editData.compensoProfessionistaValore ?? ''}
                        disabled={!editData.compensoProfessionistaTipo}
                        onChange={(e) => setEditData(prev => ({
                          ...prev,
                          compensoProfessionistaValore: e.target.value ? parseFloat(e.target.value) : undefined
                        }))}
                      />
                    </div>
                  </div>
                  {/* Min/Max per MINIMO_MASSIMO */}
                  {editData.compensoProfessionistaTipo === 'MINIMO_MASSIMO' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Minimo (€)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={editData.compensoProfessionistaMinimo ?? ''}
                          onChange={(e) => setEditData(prev => ({
                            ...prev,
                            compensoProfessionistaMinimo: e.target.value ? parseFloat(e.target.value) : undefined
                          }))}
                          placeholder="Es. 100"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Massimo (€)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={editData.compensoProfessionistaMassimo ?? ''}
                          onChange={(e) => setEditData(prev => ({
                            ...prev,
                            compensoProfessionistaMassimo: e.target.value ? parseFloat(e.target.value) : undefined
                          }))}
                          placeholder="Es. 500"
                        />
                      </div>
                    </div>
                  )}
                  {/* Preview compenso calcolato */}
                  {editData.compensoProfessionistaTipo && editData.compensoProfessionistaValore && (
                    <div className="bg-amber-100 dark:bg-amber-800/30 rounded p-2 text-sm">
                      <span className="text-amber-800 dark:text-amber-200 font-medium">
                        {editData.compensoProfessionistaTipo === 'FISSO'
                          ? `€${editData.compensoProfessionistaValore.toFixed(2)} fissi`
                          : `${editData.compensoProfessionistaValore}% di €${editData.prezzoBase.toFixed(2)} = €${(editData.prezzoBase * editData.compensoProfessionistaValore / 100).toFixed(2)}`
                        }
                        {editData.compensoProfessionistaTipo === 'MINIMO_MASSIMO' && (
                          <span className="text-amber-600 dark:text-amber-300 ml-2">
                            (min €{editData.compensoProfessionistaMinimo ?? 0}, max €{editData.compensoProfessionistaMassimo ?? '∞'})
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* CONSULENZA: modifica durataMinimaMinuti */}
              {voce.tipo === 'CONSULENZA' && (
                <div className="border rounded-lg p-4 space-y-3 bg-violet-50/50 dark:bg-violet-900/20">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-violet-600" />
                    <Label className="text-violet-800 dark:text-violet-200 font-medium">Frazione Minima (Consulenza)</Label>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Durata Minima Fatturabile</Label>
                      <Select
                        value={String(editData.durataMinimaMinuti || '')}
                        onChange={(e) => setEditData(prev => ({ ...prev, durataMinimaMinuti: e.target.value ? parseInt(e.target.value) : undefined }))}
                      >
                        <option value="">Nessuna (oraria)</option>
                        <option value="15">15 min (¼ ora)</option>
                        <option value="30">30 min (½ ora)</option>
                        <option value="60">60 min (1 ora)</option>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Tariffa Oraria (€)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editData.prezzoBase}
                        onChange={(e) => setEditData(prev => ({ ...prev, prezzoBase: parseFloat(e.target.value) || 0 }))}
                      />
                    </div>
                  </div>
                  {editData.prezzoBase > 0 && editData.durataMinimaMinuti && (
                    <div className="bg-violet-100 dark:bg-violet-800/30 rounded p-2 text-sm text-violet-800 dark:text-violet-200">
                      Prezzo per {editData.durataMinimaMinuti} min: €{(editData.prezzoBase * editData.durataMinimaMinuti / 60).toFixed(2)}
                    </div>
                  )}
                </div>
              )}

              <div>
                <Label>Note</Label>
                <textarea
                  className="flex min-h-[60px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 mt-1"
                  value={editData.note}
                  onChange={(e) => setEditData(prev => ({ ...prev, note: e.target.value }))}
                  placeholder="Note sulla voce..."
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleSaveVoce}
                  disabled={saving}
                  className="bg-teal-600 hover:bg-teal-700 text-white"
                >
                  {saving ? 'Salvataggio...' : 'Salva Modifiche'}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCancelEdit}
                  disabled={saving}
                >
                  Annulla
                </Button>
              </div>
            </>
          ) : (
            // View mode
            <>
              {voce.descrizione && (
                <p className="text-sm text-gray-600">{voce.descrizione}</p>
              )}

              {voce.usaFasceDipendenti && voce.fasceDipendenti && voce.fasceDipendenti.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Fasce Dipendenti
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {voce.fasceDipendenti.map((fascia: FasciaDipendentiPrezzo) => (
                      <div
                        key={fascia.id}
                        className="flex justify-between items-center p-2 bg-white dark:bg-gray-700 rounded border text-sm"
                      >
                        <span>{formatFasciaDipendenti(fascia.minDipendenti, fascia.maxDipendenti)}</span>
                        <span className="font-medium">€{Number(fascia.prezzo).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {voce.tipo === 'CONSULENZA' && voce.durataMinimaMinuti && (
                <div className="flex items-center gap-2 text-sm text-violet-700">
                  <Clock className="h-3 w-3" />
                  Frazione minima: {voce.durataMinimaMinuti} min — €{(Number(voce.prezzoBase) * voce.durataMinimaMinuti / 60).toFixed(2)} / frazione
                </div>
              )}

              {voce.note && (
                <p className="text-sm text-gray-500 italic">{voce.note}</p>
              )}

              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="text-blue-600 border-blue-300 hover:bg-blue-50"
                >
                  <Euro className="h-4 w-4 mr-1" />
                  Modifica Prezzo e Fasce
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default TariffarioAziendaleForm;
