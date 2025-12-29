/**
 * PreventiviPage - Gestione Preventivi (Refactored)
 * 
 * Pagina completa per la gestione preventivi con:
 * - Layout moderno stile DocumentsCorsi
 * - Stats cards cliccabili per filtrare
 * - Creazione preventivi multi-servizio (Corso, DVR, RSPP, etc.)
 * - Applicazione codici sconto
 * - Merge preventivi stessa azienda
 * - Download PDF
 * - GDPR compliant
 * 
 * @module pages/finance/preventivi
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
  Tag,
  X,
  TrendingUp,
  Layers,
  Scissors,
  Pencil,
  GraduationCap
} from 'lucide-react';
import { Button } from '@/design-system/atoms/Button';
import { ViewModeToggle } from '@/design-system/molecules/ViewModeToggle';
import { ConfirmModal } from '@/design-system/molecules/Modal';
import { ActionButton } from '@/components/ui';
import { usePreventivi, Preventivo } from '@/hooks/finance/usePreventivi';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/useToast';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

// Import types and configuration from extracted module
import {
  STATUS_CONFIG,
  STATO_TRANSITIONS,
  TIPO_SERVIZIO_CONFIG,
  CreatePreventivoData
} from './types';

// Import extracted modal components
import {
  CreatePreventivoModal,
  MergeModal,
  MergedDetailsModal,
  ApplyScontoModal,
  QuicklookModal,
  EditPreventivoModal
} from './components';

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
    const all = (preventivi || []).filter(p => !p.dettagliServizio?.mergedIntoId);
    const preventiviNormali = all.filter(p => p.tipoServizio !== 'COMPENSO_FORMATORE');
    const compensiFormatori = all.filter(p => p.tipoServizio === 'COMPENSO_FORMATORE');
    const filteredNormali = preventiviNormali.filter(p => filterByPeriod(p.dataEmissione, filterPeriodo));
    const filteredCompensi = compensiFormatori.filter(p => filterByPeriod(p.dataEmissione, filterPeriodo));

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
      valoreEntrate,
      valoreCompensi,
      valoreNetto: valoreEntrate - valoreCompensi,
      numCompensi: filteredCompensi.length,
      compensiBozze: compensiFormatori.filter(p => p.stato === 'BOZZA').length,
      compensiAccettati: compensiFormatori.filter(p => p.stato === 'ACCETTATO').length
    };
  }, [preventivi, filterPeriodo]);

  // Filtered documents
  const filteredPreventivi = useMemo(() => {
    const filtered = (preventivi || []).filter(p => {
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

    return filtered.sort((a, b) => {
      const dateA = new Date(a.createdAt || a.dataEmissione || 0).getTime();
      const dateB = new Date(b.createdAt || b.dataEmissione || 0).getTime();
      return dateB - dateA;
    });
  }, [preventivi, filterStato, filterTipo, filterPeriodo, searchQuery]);

  const selectedPreventivi = preventivi.filter(p => selectedIds.includes(p.id));
  const canMerge = selectedIds.length >= 2 && selectedPreventivi.some(
    (p, _, arr) => arr.filter(x => x.aziendaId === p.aziendaId).length >= 2
  );
  const canUnmerge = selectedIds.length === 1 &&
    selectedPreventivi[0]?.dettagliServizio?.mergedFromIds?.length > 0;

  // Handlers
  const handleCreate = async (data: CreatePreventivoData) => {
    const { codiceSconto, ...preventivoData } = data;
    const newPreventivo = await createPreventivo(preventivoData as any);

    if (codiceSconto && newPreventivo?.id) {
      try {
        await applySconto(newPreventivo.id, codiceSconto);
        showToast({ message: `Preventivo creato e sconto "${codiceSconto}" applicato`, type: 'success' });
      } catch (scontoErr: any) {
        showToast({ message: `Preventivo creato, ma errore applicazione sconto: ${scontoErr?.message || 'codice non valido'}`, type: 'warning' });
      }
    }
  };

  const handleQuicklook = (preventivo: Preventivo) => {
    setSelectedPreventivo(preventivo);
    setShowQuicklookModal(true);
  };

  const handleEdit = (preventivo: Preventivo) => {
    setSelectedPreventivo(preventivo);
    setShowEditModal(true);
    setShowQuicklookModal(false);
  };

  const handleUpdate = async (id: string, data: Partial<CreatePreventivoData>) => {
    const { codiceSconto, ...preventivoData } = data;
    try {
      await updatePreventivo(id, preventivoData as any);

      if (codiceSconto) {
        try {
          await applySconto(id, codiceSconto);
          showToast({ message: `Preventivo aggiornato e sconto "${codiceSconto}" applicato`, type: 'success' });
        } catch (scontoErr: any) {
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

  const handleDelete = (id: string) => {
    setConfirmDeleteId(id);
  };

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

  const handleBulkDelete = () => {
    setConfirmBulkDelete(true);
  };

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
      await fetchPreventivi();
    } catch (err: any) {
      showToast({ message: err.message || 'Impossibile unire i preventivi', type: 'error' });
    }
  };

  const handleUnmergePreventivo = (preventivo: Preventivo) => {
    const mergedFromIds = preventivo.dettagliServizio?.mergedFromIds;
    if (!mergedFromIds || mergedFromIds.length === 0) {
      showToast({ message: 'Questo preventivo non è unito da altri preventivi', type: 'error' });
      return;
    }
    setConfirmUnmerge(preventivo);
  };

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
          className={`rounded-xl shadow-sm border p-4 cursor-pointer hover:shadow-md transition-shadow ${filterStato === 'BOZZA' ? 'bg-gray-100 border-gray-400' : 'bg-gray-50 border-gray-200'}`}
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
          className={`rounded-xl shadow-sm border p-4 cursor-pointer hover:shadow-md transition-shadow ${filterStato === 'INVIATO' ? 'bg-blue-100 border-blue-400' : 'bg-blue-50 border-blue-200'}`}
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
          className={`rounded-xl shadow-sm border p-4 cursor-pointer hover:shadow-md transition-shadow ${filterStato === 'ACCETTATO' ? 'bg-green-100 border-green-400' : 'bg-green-50 border-green-200'}`}
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
          className={`rounded-xl shadow-sm border p-4 cursor-pointer hover:shadow-md transition-shadow ${filterStato === 'RIFIUTATO' ? 'bg-red-100 border-red-400' : 'bg-red-50 border-red-200'}`}
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
          className={`rounded-xl shadow-sm border p-4 cursor-pointer hover:shadow-md transition-shadow ${filterStato === 'FATTURATO' ? 'bg-purple-100 border-purple-400' : 'bg-purple-50 border-purple-200'}`}
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

                  const actions = [
                    { label: 'Anteprima', icon: <Eye className="h-4 w-4" />, onClick: () => handleQuicklook(preventivo), variant: 'default' as const },
                    { label: 'Modifica', icon: <Pencil className="h-4 w-4" />, onClick: () => handleEdit(preventivo), variant: 'default' as const },
                    { label: 'Applica sconto', icon: <Tag className="h-4 w-4" />, onClick: () => { setSelectedForSconto(preventivo); setShowScontoModal(true); }, variant: 'default' as const },
                    { label: 'Scarica PDF', icon: <Download className="h-4 w-4" />, onClick: () => handleDownloadPdf(preventivo.id), variant: 'default' as const },
                    ...(isMerged ? [{ label: 'Separa preventivi', icon: <Scissors className="h-4 w-4" />, onClick: () => handleUnmergePreventivo(preventivo), variant: 'default' as const }] : []),
                    { label: 'Elimina', icon: <Trash2 className="h-4 w-4" />, onClick: () => handleDelete(preventivo.id), variant: 'danger' as const },
                  ];

                  return (
                    <tr
                      key={preventivo.id}
                      className={`hover:bg-gray-50 transition-colors cursor-pointer ${isSelected ? 'bg-orange-50' : ''}`}
                      onClick={() => handleQuicklook(preventivo)}
                    >
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(preventivo.id)}
                          className="h-4 w-4 text-orange-600 rounded border-gray-300"
                        />
                      </td>

                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <ActionButton actions={actions} />
                      </td>

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
                                style={{ top: statusDropdownPosition.top, left: statusDropdownPosition.left }}
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
                                  <p className="px-3 py-2 text-xs text-gray-400 italic">Nessuna transizione disponibile</p>
                                )}
                              </div>
                            </>,
                            document.body
                          )}
                        </div>
                      </td>

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

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <TipoIcon className={`h-4 w-4 ${tipoConfig.color}`} />
                          <span className="text-gray-700">{tipoConfig.label}</span>
                        </div>
                      </td>

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

                      <td className="px-4 py-3 text-gray-600">
                        {preventivo.dataEmissione && format(new Date(preventivo.dataEmissione), 'dd/MM/yyyy', { locale: it })}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <span className="font-semibold text-gray-900">
                          € {Number(preventivo.importoFinale || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                        </span>
                        {preventivo.sconti && preventivo.sconti.length > 0 && (
                          <span className="ml-2 text-xs text-green-600">-{preventivo.sconti.length}</span>
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
                className={`bg-white rounded-xl shadow-sm border hover:shadow-md transition-all ${isSelected ? 'border-orange-500 ring-2 ring-orange-200' : 'border-gray-200'}`}
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

                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {preventivo.dataEmissione && format(new Date(preventivo.dataEmissione), 'dd MMM yyyy', { locale: it })}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                      <Euro className="h-4 w-4 text-gray-400" />
                      <span className="text-lg font-bold text-gray-900">
                        {Number(preventivo.importoFinale || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

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

      {/* Modals - Using extracted components */}
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

      <QuicklookModal
        isOpen={showQuicklookModal}
        onClose={() => { setShowQuicklookModal(false); setSelectedPreventivo(null); }}
        preventivo={selectedPreventivo}
        onEdit={() => selectedPreventivo && handleEdit(selectedPreventivo)}
        onDownloadPdf={() => selectedPreventivo && handleDownloadPdf(selectedPreventivo.id)}
      />

      <EditPreventivoModal
        isOpen={showEditModal}
        onClose={() => { setShowEditModal(false); setSelectedPreventivo(null); }}
        preventivo={selectedPreventivo}
        onSubmit={handleUpdate}
        onRemoveSconto={removeSconto}
        onApplySconto={applySconto}
        onRefresh={fetchPreventivi}
      />

      {/* Confirm Modals */}
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
