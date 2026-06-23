import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '../../hooks/useToast';
import { useNavigate, useLocation } from 'react-router-dom';
import { apiGet, apiPost, apiPut, apiDelete } from '../../services/api';
import { useConfirmDialog } from '../../contexts/ConfirmDialogContext';
import { CRUDButton } from '../../components/shared/CRUDButton';
import { useTenantFilter } from '../../context/TenantFilterContext';
import { useTenantMode } from '../../contexts/TenantModeContext';
import {
  FileText,
  Plus,
  Edit2,
  Trash2,
  Copy,
  Star,
  MoreVertical,
  History,
  Calendar,
  Info,
  Sparkles,
  Wand2,
  Loader2,
  Mail,
  Shield,
  ClipboardList,
  Stethoscope,
  LayoutTemplate,
  ExternalLink,
} from 'lucide-react';

interface Template {
  id: string;
  name: string;
  url: string;
  type: string;
  content?: string;
  header?: string;
  footer?: string;
  isDefault?: boolean;
  fileFormat?: string;
  logoImage?: string;
  logoPosition?: string;
  googleDocsUrl?: string;
  googleSlidesId?: string;
  source?: 'server' | 'local';
  createdAt?: string;
  updatedAt?: string;
  markers?: string[];
}

const TEMPLATE_TYPES = [
  {
    value: 'CERTIFICATE',
    label: 'Attestato',
    icon: '🎓',
    description: 'Certificati di partecipazione e completamento corsi',
    color: 'blue'
  },
  {
    value: 'LETTER_OF_ENGAGEMENT',
    label: 'Lettera di Incarico',
    icon: '📋',
    description: 'Lettere di incarico per formatori e consulenti',
    color: 'purple'
  },
  {
    value: 'ATTENDANCE_REGISTER',
    label: 'Registro Presenze',
    icon: '📝',
    description: 'Fogli presenza per la registrazione partecipanti',
    color: 'green'
  },
  {
    value: 'COURSE_PROGRAM',
    label: 'Programma Corso',
    icon: '📚',
    description: 'Programmi e piani didattici dei corsi di formazione',
    color: 'cyan'
  },
  {
    value: 'PREVENTIVO',
    label: 'Preventivo',
    icon: '💰',
    description: 'Preventivi e quotazioni per corsi e servizi',
    color: 'amber'
  },
  {
    value: 'INVOICE',
    label: 'Fattura',
    icon: '🧾',
    description: 'Fatture per corsi, visite mediche e servizi professionali',
    color: 'emerald'
  },
  {
    value: 'VISITA_MEDICA',
    label: 'Visita Medica',
    icon: '🩺',
    description: 'Template per referti e documentazione visite mediche',
    color: 'teal'
  },
  {
    value: 'VERBALE_RIUNIONE',
    label: 'Verbale Riunione Periodica',
    icon: '📄',
    description: 'Verbale riunione periodica Art. 35 D.Lgs 81/08 con dati sorveglianza',
    color: 'teal'
  },
  {
    value: 'GIUDIZIO_IDONEITA',
    label: 'Giudizio Idoneità',
    icon: '⚕️',
    description: 'Giudizio di idoneità alla mansione (sorveglianza sanitaria MDL)',
    color: 'indigo'
  },
];

// Helper per ottenere i placeholder disponibili per tipo
const getPlaceholdersForType = (type: string): string[] => {
  const placeholders: Record<string, string[]> = {
    'CERTIFICATE': [
      'partecipante.nome', 'partecipante.cognome', 'corso.titolo',
      'corso.durata', 'corso.data', 'azienda.nome'
    ],
    'LETTER_OF_ENGAGEMENT': [
      'formatore.nome', 'formatore.cognome', 'corso.titolo',
      'corso.data', 'corso.orario', 'compenso.importo'
    ],
    'ATTENDANCE_REGISTER': [
      'corso.titolo', 'corso.data', 'azienda.nome',
      'partecipanti.lista', 'sessione.data', 'sessione.orario'
    ],
    'COURSE_PROGRAM': [
      'corso.titolo', 'corso.codice', 'corso.descrizione',
      'corso.durataOre', 'corso.moduli', 'formatore.nome',
      'formatore.cognome', 'azienda.nome'
    ],
    'PREVENTIVO': [
      'azienda.ragioneSociale', 'azienda.indirizzo', 'azienda.pIva',
      'corso.titolo', 'corso.durata', 'corso.prezzo',
      'preventivo.numero', 'preventivo.data', 'preventivo.totale',
      'preventivo.iva', 'preventivo.imponibile', 'partecipanti.numero'
    ],
    'INVOICE': [
      'fattura.numero', 'fattura.data', 'fattura.scadenza',
      'cliente.ragioneSociale', 'cliente.pIva', 'cliente.codiceFiscale',
      'cliente.indirizzo', 'cliente.sdi', 'cliente.pec',
      'voci.lista', 'fattura.imponibile', 'fattura.iva', 'fattura.totale',
      'tenant.name', 'tenant.piva', 'tenant.iban'
    ],
    'SLIDES': [
      'corso.titolo', 'corso.descrizione', 'formatore.nome',
      'azienda.logo', 'data.corrente'
    ],
    'VISITA_MEDICA': [
      'paziente.nome', 'paziente.cognome', 'paziente.codiceFiscale',
      'paziente.dataNascita', 'paziente.indirizzo', 'paziente.telefono',
      'visita.data', 'visita.ora', 'visita.tipo',
      'medico.nome', 'medico.cognome', 'medico.titolo',
      'prestazione.nome', 'prestazione.codice',
      'anamnesi.familiare', 'anamnesi.patologica', 'anamnesi.lavorativa',
      'vitali.peso', 'vitali.altezza', 'vitali.bmi',
      'vitali.pressioneSistolica', 'vitali.pressioneDiastolica',
      'vitali.frequenzaCardiaca', 'vitali.saturazioneO2', 'vitali.temperatura',
      'esameObiettivo', 'diagnosi.principale', 'diagnosi.secondarie',
      'terapia', 'prescrizioni', 'prossimoControllo', 'noteFollowup'
    ],
    'VERBALE_RIUNIONE': [
      'azienda.ragioneSociale', 'azienda.codiceFiscale', 'azienda.partitaIva',
      'azienda.settoreAttivita', 'azienda.sedi',
      'annoRiferimento', 'periodo.da', 'periodo.a',
      'sorveglianza.totaleVisite', 'sorveglianza.lavoratoriDistinti',
      'sorveglianza.giudizi', 'sorveglianza.esami', 'sorveglianza.prescrizioni',
      'partecipanti.datoreLavoro', 'partecipanti.medicoCompetente',
      'partecipanti.rspp', 'partecipanti.rls',
      'rischi', 'protocolliSanitari', 'delibere'
    ],
    'GIUDIZIO_IDONEITA': [
      'lavoratore.nome', 'lavoratore.cognome', 'lavoratore.codiceFiscale',
      'lavoratore.dataNascita', 'lavoratore.mansione',
      'azienda.ragioneSociale', 'azienda.partitaIva',
      'visita.data', 'visita.tipo',
      'medico.nome', 'medico.cognome',
      'giudizio.esito', 'giudizio.prescrizioni', 'giudizio.limitazioni',
      'giudizio.scadenza'
    ],
    'CUSTOM': []
  };
  return placeholders[type] || [];
};

import TemplateListPage from '../templates/TemplateListPage';

type ViewMode = 'cards' | 'table';

const TemplatesSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { confirmDelete } = useConfirmDialog();
  const { getTenantFilterParams, tenantFilterKey, isReady } = useTenantFilter();
  const { getOperateHeaders } = useTenantMode();
  const operateHeaders = getOperateHeaders();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  // Determine the base path for navigation (management or settings)
  const isInManagement = location.pathname.startsWith('/management');
  const basePath = isInManagement ? '/management/templates' : '/settings/templates';

  // View mode toggle
  const [viewMode, setViewMode] = useState<ViewMode>('cards');

  // Filters and search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [showOnlyDefaults, setShowOnlyDefaults] = useState(false);

  // Create template modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    type: 'CERTIFICATE',
    description: '',
    content: '<h1>Nuovo Template</h1>',
    fileFormat: 'HTML'
  });

  // Edit template state
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);

  // Dropdown menu
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Seed defaults state
  const [seedingDefaults, setSeedingDefaults] = useState(false);

  const fetchTemplates = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      const tenantParams = getTenantFilterParams();
      const queryParams = new URLSearchParams();
      if (tenantParams.tenantIds) {
        queryParams.append('tenantIds', tenantParams.tenantIds.join(','));
      }
      if (tenantParams.allTenants) {
        queryParams.append('allTenants', 'true');
      }
      const url = `/api/v1/templates${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await apiGet<any>(url);
      setTemplates(response?.data || []);
    } catch (err) {
      showToast({ message: 'Errore nel recupero dei template', type: 'error' });
      if (import.meta.env.DEV) console.error('Error fetching templates:', err);
    } finally {
      setLoading(false);
    }
  }, [getTenantFilterParams, tenantFilterKey]);

  useEffect(() => {
    if (isReady) {
      fetchTemplates();
    }
  }, [fetchTemplates, isReady]);

  // Filtered templates
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === 'all' || template.type === selectedType;
    const matchesDefault = !showOnlyDefaults || template.isDefault;
    return matchesSearch && matchesType && matchesDefault;
  });

  // Stats
  const stats = {
    total: templates.length,
    certificate: templates.filter(t => t.type === 'CERTIFICATE').length,
    letterOfEngagement: templates.filter(t => t.type === 'LETTER_OF_ENGAGEMENT').length,
    attendanceRegister: templates.filter(t => t.type === 'ATTENDANCE_REGISTER').length,
    courseProgram: templates.filter(t => t.type === 'COURSE_PROGRAM').length,
    preventivo: templates.filter(t => t.type === 'PREVENTIVO').length,
    invoice: templates.filter(t => t.type === 'INVOICE').length,
    visitaMedica: templates.filter(t => t.type === 'VISITA_MEDICA').length,
    custom: templates.filter(t => t.type === 'CUSTOM').length
  };

  const handleSeedDefaults = async () => {
    try {
      setSeedingDefaults(true);
      const response = await apiPost<any>('/api/v1/templates/seed-defaults', {}, { headers: operateHeaders });
      const { created, skipped } = response?.data || {};

      if (created > 0) {
        showToast({
          message: `${created} template predefiniti creati con successo${skipped > 0 ? ` (${skipped} già presenti)` : ''}`,
          type: 'success'
        });
        await fetchTemplates();
      } else {
        showToast({
          message: 'Tutti i template predefiniti sono già presenti',
          type: 'info'
        });
      }
    } catch (err) {
      showToast({ message: 'Errore nella creazione dei template predefiniti', type: 'error' });
    } finally {
      setSeedingDefaults(false);
    }
  };

  const handleCreateTemplate = async () => {
    if (!newTemplate.name.trim()) {
      showToast({ message: 'Il nome del template è obbligatorio', type: 'error' });
      return;
    }

    try {
      setLoading(true);
      const response = await apiPost<any>('/api/v1/templates', newTemplate, { headers: operateHeaders });
      const createdTemplate = response?.data;

      showToast({ message: 'Template creato con successo', type: 'success' });
      setShowCreateModal(false);
      setNewTemplate({ name: '', type: 'CERTIFICATE', description: '', content: '<h1>Nuovo Template</h1>', fileFormat: 'HTML' });

      // Redirect to template editor using dynamic base path
      if (createdTemplate?.id) {
        navigate(`${basePath}/${createdTemplate.id}?format=${newTemplate.fileFormat || 'HTML'}`);
      } else {
        await fetchTemplates();
      }
    } catch (err) {
      showToast({ message: 'Errore nella creazione del template', type: 'error' });
      if (import.meta.env.DEV) console.error('Error creating template:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditTemplate = (template: Template) => {
    navigate(`${basePath}/${template.id}`);
  };

  const handleSetAsDefault = async (templateId: string) => {
    try {
      await apiPut(`/api/v1/templates/${templateId}/set-default`, {}, { headers: operateHeaders });
      showToast({ message: 'Template predefinito impostato', type: 'success' });
      await fetchTemplates();
    } catch (err) {
      showToast({ message: 'Errore nell\'impostare il template predefinito', type: 'error' });
      if (import.meta.env.DEV) console.error('Error setting default template:', err);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    const template = templates.find(t => t.id === templateId);

    if (template?.isDefault) {
      showToast({ message: 'Non puoi eliminare un template predefinito. Imposta prima un altro template come predefinito.', type: 'error' });
      return;
    }

    const shouldDelete = await confirmDelete('questo template');
    if (!shouldDelete) return;

    try {
      await apiDelete(`/api/v1/templates/${templateId}`, { headers: operateHeaders });
      showToast({ message: 'Template eliminato con successo', type: 'success' });
      await fetchTemplates();
    } catch (err) {
      showToast({ message: 'Errore nell\'eliminazione del template', type: 'error' });
      if (import.meta.env.DEV) console.error('Error deleting template:', err);
    }
  };

  const handleDuplicateTemplate = async (template: Template) => {
    try {
      await apiPost(`/api/v1/templates/${template.id}/duplicate`, {
        name: `${template.name} (Copia)`
      }, { headers: operateHeaders });
      showToast({ message: 'Template duplicato con successo', type: 'success' });
      await fetchTemplates();
    } catch (err) {
      showToast({ message: 'Errore nella duplicazione del template', type: 'error' });
      if (import.meta.env.DEV) console.error('Error duplicating template:', err);
    }
  };

  const handleViewVersions = (template: Template) => {
    navigate(`${basePath}/${template.id}/versions`);
  };

  const getTemplateIcon = (_template: Template) => {
    return <FileText className="w-5 h-5 text-gray-600" />;
  };

  const getTemplateTypeInfo = (type: string) => {
    const typeObj = TEMPLATE_TYPES.find(t => t.value === type);
    return typeObj || { value: type, label: type, icon: '📄', color: 'gray', description: '' };
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Gestione Template</h1>
          <p className="text-sm text-gray-500 mt-1">
            Crea e gestisci template per attestati, fatture, preventivi e documentazione clinica
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'cards'
                  ? 'bg-white text-violet-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-800'
                }`}
            >
              Cards
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'table'
                  ? 'bg-white text-violet-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-800'
                }`}
            >
              Tabella
            </button>
          </div>
          <CRUDButton
            operation="create"
            onClick={handleSeedDefaults}
            disabled={seedingDefaults}
            className="inline-flex items-center px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors text-sm font-medium shadow-sm"
          >
            {seedingDefaults ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <Wand2 className="w-4 h-4 mr-1.5" />
            )}
            {seedingDefaults ? 'Generazione...' : 'Genera Predefiniti'}
          </CRUDButton>
          <CRUDButton
            operation="create"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium shadow-sm"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Crea Template
          </CRUDButton>
        </div>
      </div>

      {/* Show Table View or Cards View based on toggle */}
      {viewMode === 'table' ? (
        <TemplateListPage />
      ) : (
        <>


          {/* Stats Cards */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Panoramica Template</h2>
              <div className="text-sm text-gray-500">Totale: {stats.total}</div>
            </div>

            {/* Panoramica: tutte le tipologie su un'unica riga */}
            <div
              className="grid gap-2"
              style={{ gridTemplateColumns: `repeat(${TEMPLATE_TYPES.length}, minmax(0, 1fr))` }}
            >
              {TEMPLATE_TYPES.map((type) => {
                const count = templates.filter(t => t.type === type.value).length;

                const colorClasses = {
                  blue: 'bg-blue-50 border-blue-200 text-blue-700',
                  purple: 'bg-purple-50 border-purple-200 text-purple-700',
                  green: 'bg-green-50 border-green-200 text-green-700',
                  cyan: 'bg-cyan-50 border-cyan-200 text-cyan-700',
                  amber: 'bg-amber-50 border-amber-200 text-amber-700',
                  emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
                  teal: 'bg-teal-50 border-teal-200 text-teal-700',
                  indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700',
                  gray: 'bg-gray-50 border-gray-200 text-gray-700'
                }[type.color] || 'bg-gray-50 border-gray-200 text-gray-700';

                return (
                  <div
                    key={type.value}
                    className={`border rounded-lg p-3 transition-all hover:shadow-md cursor-pointer ${colorClasses}`}
                    onClick={() => setSelectedType(type.value)}
                  >
                    <div className="text-2xl mb-1">{type.icon}</div>
                    <div className="text-xl font-bold mb-0.5">{count}</div>
                    <div className="text-xs font-medium opacity-90 leading-tight">{type.label}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Default Templates Section */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Star className="w-5 h-5 mr-2 text-yellow-500" />
                  Template Predefiniti per Tipologia
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Seleziona il template predefinito da utilizzare per ogni tipo di documento
                </p>
              </div>
            </div>

            {/* Predefiniti: massimo 3 righe → colonne = ceil(N / 3) */}
            <div
              className="grid gap-4"
              style={{ gridTemplateColumns: `repeat(${Math.ceil(TEMPLATE_TYPES.length / 3)}, minmax(0, 1fr))` }}
            >
              {TEMPLATE_TYPES.map((type) => {
                const defaultTemplate = templates.find(t => t.type === type.value && t.isDefault);
                const typeTemplates = templates.filter(t => t.type === type.value);

                return (
                  <div key={type.value} className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center">
                        <span className="text-2xl mr-2">{type.icon}</span>
                        <div>
                          <h3 className="font-medium text-gray-900">{type.label}</h3>
                          <p className="text-xs text-gray-500 mt-0.5">{typeTemplates.length} disponibili</p>
                        </div>
                      </div>
                    </div>

                    {typeTemplates.length > 0 ? (
                      <>
                        <select
                          value={defaultTemplate?.id || ''}
                          onChange={(e) => e.target.value && handleSetAsDefault(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                        >
                          <option value="">Nessun predefinito</option>
                          {typeTemplates.map(template => (
                            <option key={template.id} value={template.id}>
                              {template.name}
                            </option>
                          ))}
                        </select>

                        {defaultTemplate && (
                          <div className="mt-2 flex items-center text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded px-2 py-1.5">
                            <Star className="w-3.5 h-3.5 mr-1.5 fill-current" />
                            Attivo: {defaultTemplate.name}
                          </div>
                        )}
                      </>
                    ) : (
                      <button
                        onClick={() => {
                          setNewTemplate({ ...newTemplate, type: type.value });
                          setShowCreateModal(true);
                        }}
                        className="w-full text-sm text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border-2 border-dashed border-blue-300 rounded-lg p-3 text-center transition-colors font-medium"
                      >
                        <Plus className="w-4 h-4 inline mr-1" />
                        Crea primo template
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Template Systems — by Module */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-1">
              <LayoutTemplate className="w-5 h-5 text-violet-500" />
              <h2 className="text-base font-semibold text-gray-900">Sistemi Template Specializzati</h2>
            </div>
            <p className="text-xs text-gray-500 mb-5">Accedi alle pagine dedicate per ogni modulo</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">

              {/* --- CLINICA --- */}
              <div className="col-span-full text-xs font-semibold uppercase tracking-wider text-gray-400 pb-1 border-b border-gray-100">Clinica (ElementMedica)</div>

              <button
                onClick={() => navigate('/poliambulatorio/impostazioni/visit-templates')}
                className="group text-left p-4 rounded-xl border border-gray-200 hover:border-teal-400 hover:bg-teal-50/60 transition-all"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🩺</span>
                    <span className="font-medium text-sm text-gray-800 group-hover:text-teal-700">Template Visite</span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-gray-300 group-hover:text-teal-500" />
                </div>
                <p className="text-xs text-gray-400">Layout, campi e sezioni per le visite mediche di idoneità e specialistiche</p>
              </button>

              <button
                onClick={() => navigate('/poliambulatorio/impostazioni/modulistica')}
                className="group text-left p-4 rounded-xl border border-gray-200 hover:border-blue-400 hover:bg-blue-50/60 transition-all"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="w-4.5 h-4.5 text-blue-500" style={{ width: '1.1rem', height: '1.1rem' }} />
                    <span className="font-medium text-sm text-gray-800 group-hover:text-blue-700">Modulistica (P53)</span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-gray-300 group-hover:text-blue-500" />
                </div>
                <p className="text-xs text-gray-400">Moduli compilabili: anamnesi, questionari MDL, schede sorveglianza sanitaria</p>
              </button>

              <button
                onClick={() => navigate('/poliambulatorio/impostazioni/consensi-firma')}
                className="group text-left p-4 rounded-xl border border-gray-200 hover:border-teal-400 hover:bg-teal-50/60 transition-all"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-teal-600" />
                    <span className="font-medium text-sm text-gray-800 group-hover:text-teal-700">Consensi Firma</span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-gray-300 group-hover:text-teal-500" />
                </div>
                <p className="text-xs text-gray-400">Privacy GDPR, consenso al trattamento, prestazioni chirurgiche — firma tablet</p>
              </button>

              <button
                onClick={() => navigate('/poliambulatorio/impostazioni/email-template')}
                className="group text-left p-4 rounded-xl border border-gray-200 hover:border-indigo-400 hover:bg-indigo-50/60 transition-all"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-indigo-500" />
                    <span className="font-medium text-sm text-gray-800 group-hover:text-indigo-700">Template Email</span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-gray-300 group-hover:text-indigo-500" />
                </div>
                <p className="text-xs text-gray-400">Email automatiche: conferma appuntamento, promemoria, esiti visita</p>
              </button>

              {/* --- FORMAZIONE --- */}
              <div className="col-span-full text-xs font-semibold uppercase tracking-wider text-gray-400 pb-1 border-b border-gray-100 mt-3">Formazione (ElementSicurezza)</div>

              <button
                onClick={() => navigate('/test')}
                className="group text-left p-4 rounded-xl border border-gray-200 hover:border-blue-400 hover:bg-blue-50/60 transition-all"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">📝</span>
                    <span className="font-medium text-sm text-gray-800 group-hover:text-blue-700">Questionari e Moduli</span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-gray-300 group-hover:text-blue-500" />
                </div>
                <p className="text-xs text-gray-400">Test formativi, valutazioni corsi, formulari personalizzati compilabili</p>
              </button>

            </div>
          </div>

          {/* Search and Filters */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Cerca template per nome..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="md:w-64">
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">📑 Tutti i tipi</option>
                  {TEMPLATE_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.icon} {type.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showOnlyDefaults}
                    onChange={(e) => setShowOnlyDefaults(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 whitespace-nowrap">Solo predefiniti</span>
                </label>
              </div>
            </div>
          </div>

          {/* Templates List Section */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Template Disponibili ({filteredTemplates.length})
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {searchQuery || selectedType !== 'all'
                      ? `Filtrati da ${templates.length} template totali`
                      : 'Visualizza, modifica ed elimina i template esistenti'
                    }
                  </p>
                </div>
              </div>
            </div>

            <div className="divide-y divide-gray-200">
              {loading && templates.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4">Caricamento template...</p>
                </div>
              ) : filteredTemplates.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  <FileText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <p className="text-lg font-medium">
                    {templates.length === 0
                      ? 'Nessun template disponibile'
                      : 'Nessun template trovato'
                    }
                  </p>
                  <p className="text-sm mt-2">
                    {templates.length === 0
                      ? 'Crea un nuovo template o importane uno da Google'
                      : 'Prova a modificare i filtri di ricerca'
                    }
                  </p>
                </div>
              ) : (
                filteredTemplates.map((template) => (
                  <div key={template.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4 flex-1">
                        <div className="mt-1">
                          {getTemplateIcon(template)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <h3 className="text-lg font-semibold text-gray-900 truncate">
                              {template.name}
                            </h3>
                            {template.isDefault && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                <Star className="w-3 h-3 mr-1" />
                                Predefinito
                              </span>
                            )}
                            {template.markers && Array.isArray(template.markers) && (template.markers as any[]).length > 0 && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                <Sparkles className="w-3 h-3 mr-1" />
                                {(template.markers as any[]).length} Placeholder
                              </span>
                            )}
                          </div>

                          <div className="mt-2 flex items-center space-x-3 text-sm">
                            {(() => {
                              const typeInfo = getTemplateTypeInfo(template.type);
                              const colorClasses = {
                                blue: 'bg-blue-100 text-blue-800 border-blue-200',
                                purple: 'bg-purple-100 text-purple-800 border-purple-200',
                                green: 'bg-green-100 text-green-800 border-green-200',
                                cyan: 'bg-cyan-100 text-cyan-800 border-cyan-200',
                                amber: 'bg-amber-100 text-amber-800 border-amber-200',
                                emerald: 'bg-emerald-100 text-emerald-800 border-emerald-200',
                                teal: 'bg-teal-100 text-teal-800 border-teal-200',
                                indigo: 'bg-indigo-100 text-indigo-800 border-indigo-200',
                                gray: 'bg-gray-100 text-gray-800 border-gray-200'
                              }[typeInfo.color] || 'bg-gray-100 text-gray-800 border-gray-200';

                              return (
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorClasses}`}>
                                  <span className="mr-1">{typeInfo.icon}</span>
                                  {typeInfo.label}
                                </span>
                              );
                            })()}
                            <span className="inline-flex items-center text-gray-600">
                              <Calendar className="w-4 h-4 mr-1" />
                              {formatDate(template.updatedAt)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Actions Menu */}
                      <div className="relative ml-4">
                        <button
                          onClick={() => setOpenMenuId(openMenuId === template.id ? null : template.id)}
                          className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          <MoreVertical className="w-5 h-5 text-gray-600" />
                        </button>

                        {openMenuId === template.id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setOpenMenuId(null)}
                            />
                            <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                              <button
                                onClick={() => {
                                  handleEditTemplate(template);
                                  setOpenMenuId(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                              >
                                <Edit2 className="w-4 h-4 mr-2" />
                                Modifica
                              </button>

                              {!template.isDefault && (
                                <button
                                  onClick={() => {
                                    handleSetAsDefault(template.id);
                                    setOpenMenuId(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                                >
                                  <Star className="w-4 h-4 mr-2" />
                                  Imposta come predefinito
                                </button>
                              )}

                              <button
                                onClick={() => {
                                  handleDuplicateTemplate(template);
                                  setOpenMenuId(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                              >
                                <Copy className="w-4 h-4 mr-2" />
                                Duplica
                              </button>

                              <button
                                onClick={() => {
                                  handleViewVersions(template);
                                  setOpenMenuId(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                              >
                                <History className="w-4 h-4 mr-2" />
                                Storico versioni
                              </button>

                              <hr className="my-1 border-gray-200" />

                              <button
                                onClick={() => {
                                  handleDeleteTemplate(template.id);
                                  setOpenMenuId(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Elimina
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Create Template Modal */}
          {showCreateModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col">
                <div className="p-6 border-b border-gray-200 flex-shrink-0">
                  <h2 className="text-xl font-semibold text-gray-900">Crea Nuovo Template</h2>
                </div>

                <div className="p-6 space-y-4 overflow-y-auto flex-1">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nome Template
                    </label>
                    <input
                      type="text"
                      value={newTemplate.name}
                      onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Es. Attestato Partecipazione Corso"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tipo Template
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {TEMPLATE_TYPES.map(type => (
                        <label
                          key={type.value}
                          className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${newTemplate.type === type.value
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                            }`}
                        >
                          <input
                            type="radio"
                            name="templateType"
                            value={type.value}
                            checked={newTemplate.type === type.value}
                            onChange={(e) => setNewTemplate({ ...newTemplate, type: e.target.value })}
                            className="text-blue-600 focus:ring-blue-500"
                          />
                          <div className="ml-2">
                            <div className="flex items-center">
                              <span className="text-lg mr-1">{type.icon}</span>
                              <span className="font-medium text-gray-900 text-sm">{type.label}</span>
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                    {newTemplate.type && (
                      <p className="text-xs text-gray-500 mt-2">
                        {TEMPLATE_TYPES.find(t => t.value === newTemplate.type)?.description}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Descrizione (opzionale)
                    </label>
                    <textarea
                      value={newTemplate.description}
                      onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Breve descrizione del template..."
                    />
                  </div>

                  {/* Info panel with available placeholders */}
                  {newTemplate.type && getPlaceholdersForType(newTemplate.type).length > 0 && (
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-start">
                        <Sparkles className="w-4 h-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-xs font-medium text-blue-900 mb-1">
                            Placeholder disponibili
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {getPlaceholdersForType(newTemplate.type).slice(0, 4).map((placeholder) => (
                              <code
                                key={placeholder}
                                className="inline-block px-1.5 py-0.5 bg-white/80 border border-blue-300 rounded text-xs text-blue-800 font-mono"
                              >
                                {`{{${placeholder}}}`}
                              </code>
                            ))}
                            {getPlaceholdersForType(newTemplate.type).length > 4 && (
                              <span className="text-xs text-blue-700 self-center">
                                +{getPlaceholdersForType(newTemplate.type).length - 4} altri
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-xs text-blue-800">
                      <strong>💡 Suggerimento:</strong> Dopo aver creato il template, potrai modificarne
                      il contenuto nell'editor visuale.
                    </p>
                  </div>
                </div>

                <div className="p-4 border-t border-gray-200 flex justify-end space-x-3 flex-shrink-0">
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      setNewTemplate({ name: '', type: 'CERTIFICATE', description: '', content: '<h1>Nuovo Template</h1>', fileFormat: 'HTML' });
                    }}
                    className="px-6 py-2 border border-gray-300 rounded-full text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Annulla
                  </button>
                  <button
                    onClick={handleCreateTemplate}
                    disabled={loading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {loading ? 'Creazione...' : 'Crea Template'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TemplatesSettingsPage;
