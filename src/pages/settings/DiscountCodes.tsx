import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPost, apiPut, apiDelete } from '../../services/api';
import { useConfirmDialog } from '../../contexts/ConfirmDialogContext';
import { ActionButton } from '../../components/ui';
import {
  Tag,
  Plus,
  Edit2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Percent,
  Euro,
  Users,
  Building2,
  AlertCircle,
  CheckCircle,
  Clock,
  Copy,
  TrendingUp,
  X,
  User,
  Calendar,
  Heart,
  Package,
  Stethoscope,
  Target,
  Filter,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface CodiceSconto {
  id: string;
  codice: string;
  nome: string;
  descrizione?: string;
  tipoSconto: 'PERCENTUALE' | 'VALORE_ASSOLUTO';
  valore: number;
  dataInizio: string;
  dataFine: string;
  attivo: boolean;
  utilizzoMassimo?: number;
  utilizzoCorrente: number;
  utilizzoPerUtente?: number;
  cumulabile: boolean;
  minImporto?: number;
  maxImporto?: number;
  applicabileA: 'TUTTI' | 'AZIENDE' | 'PERSONE' | 'SPECIFICI';
  applicabileServizi: string[];
  categorieCorso: string[];
  // Criteri avanzati
  etaMinima?: number;
  etaMassima?: number;
  genereApplicabile?: 'MALE' | 'FEMALE' | null;
  soloNuoviPazienti?: boolean;
  convenzioniIds?: string[];
  bundleIds?: string[];
  prestazioniIds?: string[];
  createdAt?: string;
  updatedAt?: string;
  _count?: {
    preventivi: number;
  };
}

const TIPO_SCONTO_OPTIONS = [
  { value: 'PERCENTUALE', label: 'Percentuale (%)', icon: Percent },
  { value: 'VALORE_ASSOLUTO', label: 'Valore Fisso (€)', icon: Euro }
];

const APPLICABILITA_OPTIONS = [
  { value: 'TUTTI', label: 'Tutti i clienti', icon: Users },
  { value: 'AZIENDE', label: 'Solo Aziende', icon: Building2 },
  { value: 'PERSONE', label: 'Solo Persone Fisiche', icon: Users },
  { value: 'SPECIFICI', label: 'Clienti Specifici', icon: Users }
];

const SERVIZI_OPTIONS = [
  { value: 'CORSO', label: 'Corsi di Formazione', icon: '📚' },
  { value: 'MEDICO_COMPETENTE', label: 'Medico Competente', icon: '👨‍⚕️' },
  { value: 'DVR', label: 'DVR', icon: '📋' },
  { value: 'RSPP', label: 'RSPP', icon: '🦺' },
  { value: 'VISITA', label: 'Visite Mediche (ElementMedica)', icon: '🏥' },
  { value: 'BUNDLE', label: 'Bundle/Pacchetti', icon: '📦' }
];

const GENERE_OPTIONS: { value: 'MALE' | 'FEMALE' | null, label: string, icon: string }[] = [
  { value: null, label: 'Tutti', icon: '👥' },
  { value: 'MALE', label: 'Maschi', icon: '👨' },
  { value: 'FEMALE', label: 'Femmine', icon: '👩' }
];

const DiscountCodesPage: React.FC = () => {
  const navigate = useNavigate();
  const { confirmDelete } = useConfirmDialog();
  const [codes, setCodes] = useState<CodiceSconto[]>([]);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'expired'>('all');
  const [filterType, setFilterType] = useState<string>('all');

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCode, setEditingCode] = useState<CodiceSconto | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    codice: '',
    nome: '',
    descrizione: '',
    tipoSconto: 'PERCENTUALE' as 'PERCENTUALE' | 'VALORE_ASSOLUTO',
    valore: '',
    dataInizio: new Date().toISOString().split('T')[0],
    dataFine: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    attivo: true,
    utilizzoMassimo: '',
    utilizzoPerUtente: '',
    cumulabile: false,
    minImporto: '',
    maxImporto: '',
    applicabileA: 'TUTTI' as 'TUTTI' | 'AZIENDE' | 'PERSONE' | 'SPECIFICI',
    applicabileServizi: ['CORSO'] as string[],
    categorieCorso: [] as string[],
    // Criteri avanzati di targeting
    etaMinima: '',
    etaMassima: '',
    genereApplicabile: null as 'MALE' | 'FEMALE' | null,
    soloNuoviPazienti: false,
    convenzioniIds: [] as string[],
    bundleIds: [] as string[],
    prestazioniIds: [] as string[]
  });

  // Advanced targeting section visibility
  const [showAdvancedTargeting, setShowAdvancedTargeting] = useState(false);

  useEffect(() => {
    fetchCodes();
  }, []);

  const fetchCodes = async () => {
    try {
      setLoading(true);
      const response = await apiGet<any>('/api/v1/codici-sconto');
      setCodes(response?.data || []);
    } catch (err) {
      showNotification('error', 'Errore nel recupero dei codici sconto');
      console.error('Error fetching discount codes:', err);
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const resetForm = () => {
    setFormData({
      codice: '',
      nome: '',
      descrizione: '',
      tipoSconto: 'PERCENTUALE',
      valore: '',
      dataInizio: new Date().toISOString().split('T')[0],
      dataFine: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      attivo: true,
      utilizzoMassimo: '',
      utilizzoPerUtente: '',
      cumulabile: false,
      minImporto: '',
      maxImporto: '',
      applicabileA: 'TUTTI',
      applicabileServizi: ['CORSO'],
      categorieCorso: [],
      etaMinima: '',
      etaMassima: '',
      genereApplicabile: null,
      soloNuoviPazienti: false,
      convenzioniIds: [],
      bundleIds: [],
      prestazioniIds: []
    });
    setEditingCode(null);
    setShowAdvancedTargeting(false);
  };

  const handleCreate = async () => {
    if (!formData.codice.trim() || !formData.nome.trim() || !formData.valore) {
      showNotification('error', 'Compila tutti i campi obbligatori');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        ...formData,
        valore: parseFloat(formData.valore),
        utilizzoMassimo: formData.utilizzoMassimo ? parseInt(formData.utilizzoMassimo) : null,
        utilizzoPerUtente: formData.utilizzoPerUtente ? parseInt(formData.utilizzoPerUtente) : null,
        minImporto: formData.minImporto ? parseFloat(formData.minImporto) : null,
        maxImporto: formData.maxImporto ? parseFloat(formData.maxImporto) : null,
        etaMinima: formData.etaMinima ? parseInt(formData.etaMinima) : null,
        etaMassima: formData.etaMassima ? parseInt(formData.etaMassima) : null,
        genereApplicabile: formData.genereApplicabile || null,
        soloNuoviPazienti: formData.soloNuoviPazienti,
        convenzioniIds: formData.convenzioniIds,
        bundleIds: formData.bundleIds,
        prestazioniIds: formData.prestazioniIds
      };

      await apiPost('/api/v1/codici-sconto', payload);
      showNotification('success', 'Codice sconto creato con successo');
      setShowCreateModal(false);
      resetForm();
      fetchCodes();
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || 'Errore nella creazione del codice sconto';
      showNotification('error', errorMsg);
      console.error('Error creating discount code:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingCode || !formData.codice.trim() || !formData.nome.trim() || !formData.valore) {
      showNotification('error', 'Compila tutti i campi obbligatori');
      return;
    }

    try {
      setLoading(true);
      // Converti date in formato ISO8601 completo per il backend
      const dataInizioISO = new Date(formData.dataInizio + 'T00:00:00.000Z').toISOString();
      const dataFineISO = new Date(formData.dataFine + 'T23:59:59.999Z').toISOString();

      const payload = {
        codice: formData.codice,
        nome: formData.nome,
        descrizione: formData.descrizione || undefined,
        tipoSconto: formData.tipoSconto,
        valore: parseFloat(formData.valore),
        dataInizio: dataInizioISO,
        dataFine: dataFineISO,
        attivo: formData.attivo,
        utilizzoMassimo: formData.utilizzoMassimo ? parseInt(formData.utilizzoMassimo) : null,
        utilizzoPerUtente: formData.utilizzoPerUtente ? parseInt(formData.utilizzoPerUtente) : null,
        cumulabile: formData.cumulabile,
        minImporto: formData.minImporto ? parseFloat(formData.minImporto) : null,
        maxImporto: formData.maxImporto ? parseFloat(formData.maxImporto) : null,
        applicabileA: formData.applicabileA,
        applicabileServizi: formData.applicabileServizi,
        categorieCorso: formData.categorieCorso,
        etaMinima: formData.etaMinima ? parseInt(formData.etaMinima) : null,
        etaMassima: formData.etaMassima ? parseInt(formData.etaMassima) : null,
        genereApplicabile: formData.genereApplicabile || null,
        soloNuoviPazienti: formData.soloNuoviPazienti,
        convenzioniIds: formData.convenzioniIds,
        bundleIds: formData.bundleIds,
        prestazioniIds: formData.prestazioniIds
      };

      await apiPut(`/api/v1/codici-sconto/${editingCode.id}`, payload);
      showNotification('success', 'Codice sconto aggiornato con successo');
      setShowCreateModal(false);
      resetForm();
      fetchCodes();
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || 'Errore nell\'aggiornamento del codice sconto';
      showNotification('error', errorMsg);
      console.error('Error updating discount code:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (code: CodiceSconto) => {
    setEditingCode(code);
    const hasAdvancedTargeting = !!(code.etaMinima || code.etaMassima || code.genereApplicabile || code.soloNuoviPazienti);
    setShowAdvancedTargeting(hasAdvancedTargeting);
    setFormData({
      codice: code.codice,
      nome: code.nome,
      descrizione: code.descrizione || '',
      tipoSconto: code.tipoSconto,
      valore: code.valore.toString(),
      dataInizio: code.dataInizio.split('T')[0],
      dataFine: code.dataFine.split('T')[0],
      attivo: code.attivo,
      utilizzoMassimo: code.utilizzoMassimo?.toString() || '',
      utilizzoPerUtente: code.utilizzoPerUtente?.toString() || '',
      cumulabile: code.cumulabile,
      minImporto: code.minImporto?.toString() || '',
      maxImporto: code.maxImporto?.toString() || '',
      applicabileA: code.applicabileA,
      applicabileServizi: code.applicabileServizi,
      categorieCorso: code.categorieCorso,
      etaMinima: code.etaMinima?.toString() || '',
      etaMassima: code.etaMassima?.toString() || '',
      genereApplicabile: code.genereApplicabile || null,
      soloNuoviPazienti: code.soloNuoviPazienti || false,
      convenzioniIds: code.convenzioniIds || [],
      bundleIds: code.bundleIds || [],
      prestazioniIds: code.prestazioniIds || []
    });
    setShowCreateModal(true);
  };

  const handleToggleStatus = async (code: CodiceSconto) => {
    try {
      await apiPut(`/api/v1/codici-sconto/${code.id}`, {
        attivo: !code.attivo
      });
      showNotification('success', `Codice ${!code.attivo ? 'attivato' : 'disattivato'} con successo`);
      fetchCodes();
    } catch (err) {
      showNotification('error', 'Errore nel cambio stato del codice');
      console.error('Error toggling code status:', err);
    }
  };

  const handleDelete = async (code: CodiceSconto) => {
    const shouldDelete = await confirmDelete(`il codice "${code.codice}"`);
    if (!shouldDelete) return;

    try {
      await apiDelete(`/api/v1/codici-sconto/${code.id}`);
      showNotification('success', 'Codice sconto eliminato con successo');
      fetchCodes();
    } catch (err) {
      showNotification('error', 'Errore nell\'eliminazione del codice sconto');
      console.error('Error deleting discount code:', err);
    }
  };

  const handleDuplicate = async (code: CodiceSconto) => {
    const hasAdvancedTargeting = !!(code.etaMinima || code.etaMassima || code.genereApplicabile || code.soloNuoviPazienti);
    setShowAdvancedTargeting(hasAdvancedTargeting);
    setFormData({
      codice: `${code.codice}_COPIA`,
      nome: `${code.nome} (Copia)`,
      descrizione: code.descrizione || '',
      tipoSconto: code.tipoSconto,
      valore: code.valore.toString(),
      dataInizio: new Date().toISOString().split('T')[0],
      dataFine: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      attivo: code.attivo,
      utilizzoMassimo: code.utilizzoMassimo?.toString() || '',
      utilizzoPerUtente: code.utilizzoPerUtente?.toString() || '',
      cumulabile: code.cumulabile,
      minImporto: code.minImporto?.toString() || '',
      maxImporto: code.maxImporto?.toString() || '',
      applicabileA: code.applicabileA,
      applicabileServizi: code.applicabileServizi,
      categorieCorso: code.categorieCorso,
      etaMinima: code.etaMinima?.toString() || '',
      etaMassima: code.etaMassima?.toString() || '',
      genereApplicabile: code.genereApplicabile || null,
      soloNuoviPazienti: code.soloNuoviPazienti || false,
      convenzioniIds: code.convenzioniIds || [],
      bundleIds: code.bundleIds || [],
      prestazioniIds: code.prestazioniIds || []
    });
    setShowCreateModal(true);
  };

  // Filtering logic
  const filteredCodes = codes.filter(code => {
    const matchesSearch = code.codice.toLowerCase().includes(searchQuery.toLowerCase()) ||
      code.nome.toLowerCase().includes(searchQuery.toLowerCase());

    const now = new Date();
    const dataInizio = new Date(code.dataInizio);
    const dataFine = new Date(code.dataFine);
    const isExpired = now > dataFine;
    const isActive = code.attivo && !isExpired && now >= dataInizio;

    const matchesStatus = filterStatus === 'all' ||
      (filterStatus === 'active' && isActive) ||
      (filterStatus === 'inactive' && !code.attivo) ||
      (filterStatus === 'expired' && isExpired);

    const matchesType = filterType === 'all' || code.tipoSconto === filterType;

    return matchesSearch && matchesStatus && matchesType;
  });

  // Stats
  const stats = {
    total: codes.length,
    active: codes.filter(c => {
      const now = new Date();
      const dataInizio = new Date(c.dataInizio);
      const dataFine = new Date(c.dataFine);
      return c.attivo && now >= dataInizio && now <= dataFine;
    }).length,
    expired: codes.filter(c => new Date() > new Date(c.dataFine)).length,
    totalUsage: codes.reduce((sum, c) => sum + c.utilizzoCorrente, 0)
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getStatusInfo = (code: CodiceSconto) => {
    const now = new Date();
    const dataInizio = new Date(code.dataInizio);
    const dataFine = new Date(code.dataFine);

    if (!code.attivo) {
      return { label: 'Disattivato', color: 'gray', icon: ToggleLeft };
    }
    if (now > dataFine) {
      return { label: 'Scaduto', color: 'red', icon: AlertCircle };
    }
    if (now < dataInizio) {
      return { label: 'Programmato', color: 'yellow', icon: Clock };
    }
    if (code.utilizzoMassimo && code.utilizzoCorrente >= code.utilizzoMassimo) {
      return { label: 'Esaurito', color: 'orange', icon: AlertCircle };
    }
    return { label: 'Attivo', color: 'green', icon: CheckCircle };
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Codici Sconto</h1>
          <p className="text-gray-600 mt-1">
            Gestisci i codici sconto applicabili ai preventivi
          </p>
        </div>
        <button
          onClick={() => navigate('/management/codici-sconto/nuovo')}
          className="inline-flex items-center px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5 mr-2" />
          Crea Codice Sconto
        </button>
      </div>

      {/* Notification */}
      {notification && (
        <div className={`p-4 rounded-lg ${notification.type === 'success'
          ? 'bg-green-50 border border-green-200 text-green-800'
          : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
          <p className="text-sm font-medium">{notification.message}</p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Totale Codici</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
            </div>
            <Tag className="w-10 h-10 text-blue-500 opacity-20" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Codici Attivi</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{stats.active}</p>
            </div>
            <CheckCircle className="w-10 h-10 text-green-500 opacity-20" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Scaduti</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{stats.expired}</p>
            </div>
            <AlertCircle className="w-10 h-10 text-red-500 opacity-20" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Utilizzi Totali</p>
              <p className="text-2xl font-bold text-purple-600 mt-1">{stats.totalUsage}</p>
            </div>
            <TrendingUp className="w-10 h-10 text-purple-500 opacity-20" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Cerca per codice o nome..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="md:w-48">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Tutti gli stati</option>
              <option value="active">Attivi</option>
              <option value="inactive">Disattivati</option>
              <option value="expired">Scaduti</option>
            </select>
          </div>
          <div className="md:w-48">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Tutti i tipi</option>
              <option value="PERCENTUALE">Percentuale</option>
              <option value="VALORE_ASSOLUTO">Valore Fisso</option>
            </select>
          </div>
        </div>
      </div>

      {/* Codes List */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Codici Disponibili ({filteredCodes.length})
          </h2>
        </div>

        <div className="divide-y divide-gray-200">
          {loading && codes.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-3 text-sm">Caricamento codici sconto...</p>
            </div>
          ) : filteredCodes.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Tag className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-sm font-medium">
                {codes.length === 0
                  ? 'Nessun codice sconto disponibile'
                  : 'Nessun codice trovato'
                }
              </p>
              <p className="text-xs mt-1">
                {codes.length === 0
                  ? 'Crea il tuo primo codice sconto'
                  : 'Prova a modificare i filtri'
                }
              </p>
            </div>
          ) : (
            /* Visualizzazione Compatta a Tabella */
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider w-20">Azioni</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Codice</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Nome</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Sconto</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Targeting</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Validità</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Utilizzi</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Stato</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredCodes.map((code) => {
                    const status = getStatusInfo(code);
                    const StatusIcon = status.icon;

                    return (
                      <tr key={code.id} className="hover:bg-gray-50 transition-colors">
                        {/* Colonna Azioni - PRIMA - usando ActionButton standard */}
                        <td className="px-4 py-3 text-center">
                          <ActionButton
                            actions={[
                              {
                                label: 'Visualizza',
                                icon: <TrendingUp className="w-4 h-4" />,
                                onClick: () => navigate(`/management/codici-sconto/${code.id}`)
                              },
                              {
                                label: 'Modifica',
                                icon: <Edit2 className="w-4 h-4" />,
                                onClick: () => navigate(`/management/codici-sconto/${code.id}/modifica`)
                              },
                              {
                                label: code.attivo ? 'Disattiva' : 'Attiva',
                                icon: code.attivo ? <ToggleLeft className="w-4 h-4" /> : <ToggleRight className="w-4 h-4" />,
                                onClick: () => handleToggleStatus(code)
                              },
                              {
                                label: 'Duplica',
                                icon: <Copy className="w-4 h-4" />,
                                onClick: () => handleDuplicate(code)
                              },
                              {
                                label: 'Elimina',
                                icon: <Trash2 className="w-4 h-4" />,
                                onClick: () => handleDelete(code),
                                variant: 'danger'
                              }
                            ]}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => navigate(`/management/codici-sconto/${code.id}`)}
                            className="hover:underline"
                          >
                            <code className="text-sm font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded hover:bg-blue-100 transition-colors">
                              {code.codice}
                            </code>
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-900 truncate max-w-[200px]" title={code.nome}>
                              {code.nome}
                            </span>
                            {code.descrizione && (
                              <span className="text-xs text-gray-500 truncate max-w-[200px]" title={code.descrizione}>
                                {code.descrizione}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-semibold text-green-600">
                            {code.tipoSconto === 'PERCENTUALE' ? `${code.valore}%` : `€${code.valore}`}
                          </span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {code.cumulabile && (
                              <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-700">
                                Cumulabile
                              </span>
                            )}
                            {code.minImporto && (
                              <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700">
                                Min €{code.minImporto}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {code.soloNuoviPazienti && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-pink-100 text-pink-700" title="Solo nuovi pazienti">
                                <Heart className="w-2.5 h-2.5" />
                                Nuovo
                              </span>
                            )}
                            {(code.etaMinima !== null || code.etaMassima !== null) && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-700" title={`Età: ${code.etaMinima || 0}-${code.etaMassima || '∞'}`}>
                                <Calendar className="w-2.5 h-2.5" />
                                {code.etaMinima || 0}-{code.etaMassima || '∞'}
                              </span>
                            )}
                            {code.genereApplicabile && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-100 text-indigo-700" title={`Genere: ${code.genereApplicabile}`}>
                                <User className="w-2.5 h-2.5" />
                                {code.genereApplicabile === 'MALE' ? 'M' : 'F'}
                              </span>
                            )}
                            {!code.soloNuoviPazienti && code.etaMinima === null && code.etaMassima === null && !code.genereApplicabile && (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-xs text-gray-600">
                            <div>{formatDate(code.dataInizio)}</div>
                            <div className="text-gray-400">→ {formatDate(code.dataFine)}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="font-medium text-gray-900">
                            {code.utilizzoCorrente}
                            <span className="text-gray-400">
                              /{code.utilizzoMassimo || '∞'}
                            </span>
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${status.color === 'green' ? 'bg-green-100 text-green-800' :
                            status.color === 'red' ? 'bg-red-100 text-red-800' :
                              status.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                                status.color === 'orange' ? 'bg-orange-100 text-orange-800' :
                                  'bg-gray-100 text-gray-800'
                            }`}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {status.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full my-8">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white rounded-t-lg z-10">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingCode ? 'Modifica Codice Sconto' : 'Crea Nuovo Codice Sconto'}
              </h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
              {/* Codice e Nome */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Codice Sconto * <span className="text-xs text-gray-500">(es: PROMO2025)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.codice}
                    onChange={(e) => setFormData({ ...formData, codice: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase font-mono"
                    placeholder="PROMO2025"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome Descrittivo *
                  </label>
                  <input
                    type="text"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Promozione Estate 2025"
                  />
                </div>
              </div>

              {/* Descrizione */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descrizione
                </label>
                <textarea
                  value={formData.descrizione}
                  onChange={(e) => setFormData({ ...formData, descrizione: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Descrizione dettagliata del codice sconto..."
                />
              </div>

              {/* Tipo e Valore Sconto */}
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Tipo e Valore Sconto</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tipo Sconto *
                    </label>
                    <div className="space-y-2">
                      {TIPO_SCONTO_OPTIONS.map(option => {
                        const Icon = option.icon;
                        return (
                          <label
                            key={option.value}
                            className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${formData.tipoSconto === option.value
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                              }`}
                          >
                            <input
                              type="radio"
                              name="tipoSconto"
                              value={option.value}
                              checked={formData.tipoSconto === option.value}
                              onChange={(e) => setFormData({ ...formData, tipoSconto: e.target.value as any })}
                              className="text-blue-600 focus:ring-blue-500"
                            />
                            <Icon className="w-5 h-5 mx-2" />
                            <span className="font-medium">{option.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Valore Sconto *
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max={formData.tipoSconto === 'PERCENTUALE' ? '100' : undefined}
                        value={formData.valore}
                        onChange={(e) => setFormData({ ...formData, valore: e.target.value })}
                        className="w-full px-3 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder={formData.tipoSconto === 'PERCENTUALE' ? '10' : '50'}
                      />
                      <span className="absolute right-3 top-2.5 text-gray-500 font-medium">
                        {formData.tipoSconto === 'PERCENTUALE' ? '%' : '€'}
                      </span>
                    </div>
                    {formData.tipoSconto === 'PERCENTUALE' && (
                      <p className="text-xs text-gray-500 mt-1">Valore tra 0 e 100</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Date Validità */}
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Periodo di Validità</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Data Inizio *
                    </label>
                    <input
                      type="date"
                      value={formData.dataInizio}
                      onChange={(e) => setFormData({ ...formData, dataInizio: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Data Fine *
                    </label>
                    <input
                      type="date"
                      value={formData.dataFine}
                      onChange={(e) => setFormData({ ...formData, dataFine: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Limitazioni Utilizzo */}
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Limitazioni Utilizzo</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Utilizzo Massimo Totale
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.utilizzoMassimo}
                      onChange={(e) => setFormData({ ...formData, utilizzoMassimo: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Illimitato"
                    />
                    <p className="text-xs text-gray-500 mt-1">Lascia vuoto per illimitato</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Utilizzo Max per Utente
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.utilizzoPerUtente}
                      onChange={(e) => setFormData({ ...formData, utilizzoPerUtente: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Illimitato"
                    />
                    <p className="text-xs text-gray-500 mt-1">Lascia vuoto per illimitato</p>
                  </div>
                </div>
              </div>

              {/* Restrizioni Importo */}
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Restrizioni Importo</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Importo Minimo Preventivo
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.minImporto}
                        onChange={(e) => setFormData({ ...formData, minImporto: e.target.value })}
                        className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Nessun minimo"
                      />
                      <span className="absolute right-3 top-2.5 text-gray-500">€</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sconto Massimo Applicabile
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.maxImporto}
                        onChange={(e) => setFormData({ ...formData, maxImporto: e.target.value })}
                        className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Nessun limite"
                      />
                      <span className="absolute right-3 top-2.5 text-gray-500">€</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Applicabilità */}
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Applicabilità</h3>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Applicabile a
                  </label>
                  <div className="space-y-2">
                    {APPLICABILITA_OPTIONS.map(option => {
                      const Icon = option.icon;
                      return (
                        <label
                          key={option.value}
                          className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${formData.applicabileA === option.value
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                            }`}
                        >
                          <input
                            type="radio"
                            name="applicabileA"
                            value={option.value}
                            checked={formData.applicabileA === option.value}
                            onChange={(e) => setFormData({ ...formData, applicabileA: e.target.value as any })}
                            className="text-blue-600 focus:ring-blue-500"
                          />
                          <Icon className="w-5 h-5 mx-2" />
                          <span className="font-medium">{option.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Servizi Applicabili
                  </label>
                  <div className="space-y-2">
                    {SERVIZI_OPTIONS.map(servizio => (
                      <label
                        key={servizio.value}
                        className="flex items-center p-2 hover:bg-gray-100 rounded-lg cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={formData.applicabileServizi.includes(servizio.value)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                applicabileServizi: [...formData.applicabileServizi, servizio.value]
                              });
                            } else {
                              setFormData({
                                ...formData,
                                applicabileServizi: formData.applicabileServizi.filter(s => s !== servizio.value)
                              });
                            }
                          }}
                          className="text-blue-600 focus:ring-blue-500 rounded"
                        />
                        <span className="ml-2 text-sm">{servizio.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Targeting Avanzato */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowAdvancedTargeting(!showAdvancedTargeting)}
                  className="w-full p-4 bg-gradient-to-r from-purple-50 to-indigo-50 flex items-center justify-between hover:from-purple-100 hover:to-indigo-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-purple-600" />
                    <span className="font-semibold text-gray-900">Targeting Avanzato</span>
                    <span className="text-xs text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">
                      {(formData.etaMinima || formData.etaMassima || formData.genereApplicabile || formData.soloNuoviPazienti) ? 'Attivo' : 'Opzionale'}
                    </span>
                  </div>
                  {showAdvancedTargeting ? (
                    <ChevronUp className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  )}
                </button>

                {showAdvancedTargeting && (
                  <div className="p-4 space-y-4 bg-white">
                    {/* Range Età */}
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                        <Calendar className="w-4 h-4 text-purple-500" />
                        Range Età Paziente
                      </label>
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <input
                            type="number"
                            value={formData.etaMinima || ''}
                            onChange={(e) => setFormData({ ...formData, etaMinima: e.target.value || '' })}
                            placeholder="Min"
                            min="0"
                            max="120"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                          />
                        </div>
                        <span className="text-gray-400">—</span>
                        <div className="flex-1">
                          <input
                            type="number"
                            value={formData.etaMassima || ''}
                            onChange={(e) => setFormData({ ...formData, etaMassima: e.target.value || '' })}
                            placeholder="Max"
                            min="0"
                            max="120"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                          />
                        </div>
                        <span className="text-xs text-gray-500">anni</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Lascia vuoto per applicare a tutte le età</p>
                    </div>

                    {/* Genere */}
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                        <User className="w-4 h-4 text-purple-500" />
                        Genere Paziente
                      </label>
                      <div className="flex gap-2">
                        {GENERE_OPTIONS.map((option) => (
                          <button
                            key={option.value || 'tutti'}
                            type="button"
                            onClick={() => setFormData({ ...formData, genereApplicabile: option.value })}
                            className={`flex-1 px-4 py-2 rounded-lg border-2 transition-all flex flex-col items-center ${formData.genereApplicabile === option.value
                                ? 'border-purple-500 bg-purple-50 text-purple-700'
                                : 'border-gray-200 hover:border-purple-200 text-gray-600'
                              }`}
                          >
                            <span className="text-xl mb-1">{option.icon}</span>
                            <span className="text-sm font-medium">{option.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Solo Nuovi Pazienti */}
                    <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-purple-300 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={formData.soloNuoviPazienti}
                        onChange={(e) => setFormData({ ...formData, soloNuoviPazienti: e.target.checked })}
                        className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Heart className="w-4 h-4 text-pink-500" />
                          <span className="text-sm font-medium text-gray-900">Solo Nuovi Pazienti</span>
                        </div>
                        <p className="text-xs text-gray-500">Il codice può essere usato solo da pazienti alla loro prima visita</p>
                      </div>
                    </label>

                    {/* Info Box */}
                    <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                      <div className="flex items-start gap-2">
                        <Filter className="w-4 h-4 text-purple-600 mt-0.5" />
                        <div className="text-xs text-purple-700">
                          <strong>Come funziona:</strong> I filtri di targeting vengono applicati in AND.
                          Il paziente deve soddisfare tutti i criteri impostati per poter utilizzare il codice.
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Opzioni Avanzate */}
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Opzioni Avanzate</h3>
                <div className="space-y-3">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.attivo}
                      onChange={(e) => setFormData({ ...formData, attivo: e.target.checked })}
                      className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-900">Codice Attivo</span>
                      <p className="text-xs text-gray-500">Il codice può essere utilizzato immediatamente</p>
                    </div>
                  </label>

                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.cumulabile}
                      onChange={(e) => setFormData({ ...formData, cumulabile: e.target.checked })}
                      className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-900">Cumulabile</span>
                      <p className="text-xs text-gray-500">Può essere combinato con altri codici sconto</p>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3 sticky bottom-0 bg-white rounded-b-lg">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="px-6 py-2 border border-gray-300 rounded-full text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={editingCode ? handleUpdate : handleCreate}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Salvataggio...' : editingCode ? 'Aggiorna Codice' : 'Crea Codice'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiscountCodesPage;
