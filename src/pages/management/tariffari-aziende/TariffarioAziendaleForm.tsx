/**
 * TariffarioAziendaleForm
 * 
 * Form per la creazione e modifica di Tariffari Aziende
 * Supporta sia tariffari BASE che AZIENDALI
 */

import React, { useState, useEffect } from 'react';
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
  ChevronUp
} from 'lucide-react';
import { Button } from '../../../design-system/atoms/Button';
import { Input } from '../../../design-system/atoms/Input';
import { Label } from '../../../design-system/atoms/Label';
import { Badge } from '../../../design-system/atoms/Badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../design-system/molecules/Card';
import { Select } from '../../../design-system/atoms/Select';
import { Switch } from '../../../components/ui/switch';
import { useToast } from '../../../hooks/useToast';
import {
  tariffariAziendaliApi,
  TariffarioAziendale,
  VoceTariffario,
  PrestazioneMDL,
  TipoTariffario,
  TipoVoceTariffario,
  FrequenzaTariffario,
  CreateVocePayload,
  FasciaDipendentiPrezzo,
  TIPO_VOCE_LABELS,
  FREQUENZA_LABELS,
  formatFasciaDipendenti,
  getVoceDisplayName
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

const TariffarioAziendaleForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id && id !== 'nuovo';
  const { showToast } = useToast();

  // Form state
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
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

  // New voce form state
  const [showNewVoceForm, setShowNewVoceForm] = useState(false);
  const [newVoce, setNewVoce] = useState<CreateVocePayload>({
    tipo: 'PRESTAZIONE',
    prestazioneId: '',
    nome: '',
    descrizione: '',
    prezzoBase: 0,
    ivaAliquota: 22,
    frequenza: 'PER_VISITA',
    usaFasceDipendenti: false
  });

  // Load data
  useEffect(() => {
    const loadData = async () => {
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
        setPrestazioniMDL(prestazioniRes?.data || []);

        // Load tariffario if editing
        if (isEditing) {
          const response = await tariffariAziendaliApi.getById(id);
          if (response.success && response.data) {
            const t = response.data;
            setFormData({
              codice: t.codice,
              nome: t.nome,
              descrizione: t.descrizione || '',
              tipo: t.tipo,
              companyId: t.companyId || '',
              convenzioneId: t.convenzioneId || '',
              validoDa: t.validoDa.split('T')[0],
              validoA: t.validoA ? t.validoA.split('T')[0] : '',
              attivo: t.attivo,
              note: t.note || ''
            });
            setVoci(t.voci || []);
          }
        }
      } catch (error) {
        console.error('Error loading data:', error);
        showToast({ message: 'Errore nel caricamento dei dati', type: 'error' });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, isEditing]);

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

    if (newVoce.tipo !== 'PRESTAZIONE' && !newVoce.nome) {
      showToast({ message: 'Inserisci il nome della voce', type: 'error' });
      return;
    }

    try {
      setSaving(true);
      const response = await tariffariAziendaliApi.addVoce(id!, newVoce);
      if (response.success) {
        setVoci(prev => [...prev, response.data]);
        setShowNewVoceForm(false);
        setNewVoce({
          tipo: 'PRESTAZIONE',
          prestazioneId: '',
          nome: '',
          descrizione: '',
          prezzoBase: 0,
          ivaAliquota: 22,
          frequenza: 'PER_VISITA',
          usaFasceDipendenti: false
        });
        showToast({ message: 'Voce aggiunta con successo', type: 'success' });
      }
    } catch (error) {
      console.error('Error adding voce:', error);
      showToast({ message: 'Errore nell\'aggiunta della voce', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // Delete voce
  const handleDeleteVoce = async (voceId: string) => {
    if (!confirm('Sei sicuro di voler eliminare questa voce?')) return;

    try {
      await tariffariAziendaliApi.deleteVoce(id!, voceId);
      setVoci(prev => prev.filter(v => v.id !== voceId));
      showToast({ message: 'Voce eliminata', type: 'success' });
    } catch (error) {
      console.error('Error deleting voce:', error);
      showToast({ message: 'Errore nell\'eliminazione della voce', type: 'error' });
    }
  };

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
        showToast({ message: isEditing ? 'Tariffario aggiornato' : 'Tariffario creato', type: 'success' });
        if (!isEditing) {
          // Navigate to edit mode after create
          navigate(`/management/tariffari-aziende/${response.data.id}`);
        }
      }
    } catch (error: unknown) {
      console.error('Error saving tariffario:', error);
      const errorMessage = error instanceof Error ? error.message : 'Errore nel salvataggio';
      showToast({ message: errorMessage, type: 'error' });
    } finally {
      setSaving(false);
    }
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
          <Button variant="ghost" onClick={() => navigate('/management/tariffari-aziende')}>
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
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Salvataggio...' : 'Salva'}
        </Button>
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
                  <Input
                    id="validoDa"
                    type="date"
                    value={formData.validoDa}
                    onChange={(e) => handleChange('validoDa', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="validoA">Valido fino a</Label>
                  <Input
                    id="validoA"
                    type="date"
                    value={formData.validoA}
                    onChange={(e) => handleChange('validoA', e.target.value)}
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
                              nome: ''
                            }))}
                            options={[
                              { value: 'PRESTAZIONE', label: 'Prestazione MDL' },
                              { value: 'SPESA_FISSA', label: 'Spesa Fissa' },
                              { value: 'SPESA_RICORRENTE', label: 'Spesa Ricorrente' }
                            ]}
                          />
                        </div>

                        {newVoce.tipo === 'PRESTAZIONE' ? (
                          <div className="space-y-2">
                            <Label>Prestazione</Label>
                            <Select
                              value={newVoce.prestazioneId || ''}
                              onChange={(e) => {
                                const prest = prestazioniMDL.find(p => p.id === e.target.value);
                                setNewVoce(prev => ({
                                  ...prev,
                                  prestazioneId: e.target.value,
                                  prezzoBase: prest?.prezzoBase || 0
                                }));
                              }}
                              placeholder="Seleziona..."
                              options={prestazioniMDL.map((p) => ({
                                value: p.id,
                                label: `${p.nome} (€${p.prezzoBase})`
                              }))}
                            />
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

                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Prezzo Base (€)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={newVoce.prezzoBase}
                            onChange={(e) => setNewVoce(prev => ({ ...prev, prezzoBase: parseFloat(e.target.value) || 0 }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>IVA (%)</Label>
                          <Input
                            type="number"
                            value={newVoce.ivaAliquota}
                            onChange={(e) => setNewVoce(prev => ({ ...prev, ivaAliquota: parseFloat(e.target.value) || 22 }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Frequenza</Label>
                          <Select
                            value={newVoce.frequenza}
                            onChange={(e) => setNewVoce(prev => ({ ...prev, frequenza: e.target.value as FrequenzaTariffario }))}
                            options={Object.entries(FREQUENZA_LABELS).map(([key, label]) => ({
                              value: key,
                              label: label
                            }))}
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setShowNewVoceForm(false)}>
                          Annulla
                        </Button>
                        <Button onClick={handleAddVoce} disabled={saving}>
                          <Plus className="h-4 w-4 mr-2" />
                          Aggiungi
                        </Button>
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
                  <div className="space-y-2">
                    {voci.map((voce) => (
                      <VoceCard
                        key={voce.id}
                        voce={voce}
                        expanded={expandedVoci.has(voce.id)}
                        onToggle={() => toggleVoceExpanded(voce.id)}
                        onDelete={() => handleDeleteVoce(voce.id)}
                      />
                    ))}
                  </div>
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

// VoceCard component
interface VoceCardProps {
  voce: VoceTariffario;
  expanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
}

const VoceCard: React.FC<VoceCardProps> = ({ voce, expanded, onToggle, onDelete }) => {
  return (
    <div className="border rounded-lg">
      <div
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          <GripVertical className="h-4 w-4 text-gray-400" />
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
                {Number(voce.prezzoBase).toFixed(2)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {FREQUENZA_LABELS[voce.frequenza]}
              </span>
              {voce.usaFasceDipendenti && (
                <span className="flex items-center gap-1 text-blue-600">
                  <Users className="h-3 w-3" />
                  {voce.fasceDipendenti?.length || 0} fasce
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </div>

      {expanded && (
        <div className="border-t p-4 bg-gray-50 dark:bg-gray-800 space-y-4">
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

          {voce.note && (
            <p className="text-sm text-gray-500 italic">{voce.note}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default TariffarioAziendaleForm;
