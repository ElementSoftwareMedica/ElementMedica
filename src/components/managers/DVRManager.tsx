import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../design-system/molecules/Card';
import { Button } from '../../design-system/atoms/Button';
import { Input } from '../../design-system/atoms/Input';
import { Label } from '../../design-system/atoms/Label';
import { Badge } from '../../design-system/atoms/Badge';
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  Download,
  Edit,
  Eye,
  FileText,
  Plus,
  Trash2,
  Upload,
  User,
  X
} from 'lucide-react';
import { apiGet, apiDelete, apiUpload } from '../../services/api';
import { useTenantMode } from '../../contexts/TenantModeContext';
import { useToast } from '../../hooks/useToast';
import { useConfirmDialog } from '../../contexts/ConfirmDialogContext';
import { CRUDButton } from '../shared/CRUDButton';
import { DatePickerElegante } from '../ui/DatePickerElegante';

type TipoDVR = 'NUOVO' | 'AGGIORNAMENTO_CON_MODIFICHE' | 'AGGIORNAMENTO_SENZA_MODIFICHE';

interface DVR {
  id: string;
  effettuatoDa: string;
  dataEsecuzione: string;
  dataScadenza: string;
  rischiRilevati?: string;
  note?: string;
  tipoDVR: TipoDVR;
  documentoUrl?: string;
  documentoNome?: string;
  createdAt: string;
  site?: {
    id: string;
    siteName: string;
    companyTenantProfile?: {
      id: string;
      company?: { id: string; ragioneSociale: string };
    };
  };
}

interface DVRManagerProps {
  siteId: string;
  siteName: string;
}

export const DVRManager: React.FC<DVRManagerProps> = ({ siteId, siteName }) => {
  const { getOperateHeaders } = useTenantMode();
  const operateHeaders = getOperateHeaders();
  const [dvrs, setDvrs] = useState<DVR[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingDvr, setEditingDvr] = useState<DVR | null>(null);
  const [formData, setFormData] = useState({
    effettuatoDa: '',
    dataEsecuzione: '',
    dataScadenza: '',
    rischiRilevati: '',
    tipoDVR: 'NUOVO' as TipoDVR,
    note: ''
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();
  const { confirmDelete } = useConfirmDialog();

  useEffect(() => {
    fetchDvrs();
  }, [siteId]);

  const fetchDvrs = async () => {
    try {
      setLoading(true);
      const response = await apiGet(`/api/v1/dvr/site/${siteId}`) as { dvrs?: DVR[] };
      setDvrs(response.dvrs || []);
    } catch (error) {
      showToast({ message: 'Errore nel caricamento dei DVR', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    try {
      setSubmitting(true);
      const body = new FormData();
      body.append('siteId', siteId);
      body.append('effettuatoDa', formData.effettuatoDa);
      body.append('dataEsecuzione', formData.dataEsecuzione);
      body.append('dataScadenza', formData.dataScadenza);
      body.append('tipoDVR', formData.tipoDVR);
      if (formData.rischiRilevati) body.append('rischiRilevati', formData.rischiRilevati);
      if (formData.note) body.append('note', formData.note);
      if (selectedFile) body.append('documento', selectedFile);

      if (editingDvr) {
        await apiUpload(`/api/v1/dvr/${editingDvr.id}`, body, { headers: operateHeaders, method: 'put' });
        showToast({ message: 'DVR aggiornato con successo', type: 'success' });
      } else {
        await apiUpload('/api/v1/dvr', body, { headers: operateHeaders });
        showToast({ message: 'DVR creato con successo', type: 'success' });
      }

      await fetchDvrs();
      handleCloseForm();
    } catch (error) {
      showToast({ message: 'Errore nel salvataggio del DVR', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (dvr: DVR) => {
    setEditingDvr(dvr);
    setFormData({
      effettuatoDa: dvr.effettuatoDa || '',
      dataEsecuzione: dvr.dataEsecuzione ? dvr.dataEsecuzione.split('T')[0] : '',
      dataScadenza: dvr.dataScadenza ? dvr.dataScadenza.split('T')[0] : '',
      rischiRilevati: dvr.rischiRilevati || '',
      tipoDVR: dvr.tipoDVR || 'NUOVO',
      note: dvr.note || ''
    });
    setSelectedFile(null);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirmDelete('Sei sicuro di voler eliminare questo DVR?');
    if (!confirmed) return;

    try {
      await apiDelete(`/api/v1/dvr/${id}`, { headers: operateHeaders });
      showToast({ message: 'DVR eliminato con successo', type: 'success' });
      await fetchDvrs();
    } catch (error) {
      showToast({ message: 'Errore nell\'eliminazione del DVR', type: 'error' });
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingDvr(null);
    setSelectedFile(null);
    setFormData({
      effettuatoDa: '',
      dataEsecuzione: '',
      dataScadenza: '',
      rischiRilevati: '',
      tipoDVR: 'NUOVO',
      note: ''
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const getScadenzaStatus = (dataScadenza: string) => {
    const scadenza = new Date(dataScadenza);
    const oggi = new Date();
    const diffDays = Math.ceil((scadenza.getTime() - oggi.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { label: 'Scaduto', variant: 'destructive' as const, icon: <AlertTriangle className="h-4 w-4" /> };
    if (diffDays < 30) return { label: 'In scadenza', variant: 'secondary' as const, icon: <AlertTriangle className="h-4 w-4" /> };
    return { label: 'Valido', variant: 'default' as const, icon: <CheckCircle className="h-4 w-4" /> };
  };

  const TIPO_DVR_LABELS: Record<TipoDVR, string> = {
    'NUOVO': 'Nuovo',
    'AGGIORNAMENTO_CON_MODIFICHE': 'Aggiornamento con modifiche',
    'AGGIORNAMENTO_SENZA_MODIFICHE': 'Aggiornamento senza modifiche'
  };

  const handleViewDocument = async (dvr: DVR) => {
    if (!dvr.documentoUrl) return;
    try {
      const response = await fetch(`/api/v1/dvr/${dvr.id}/documento`, {
        credentials: 'include',
        headers: {
          ...operateHeaders,
          'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`
        }
      });
      if (!response.ok) throw new Error('Apertura fallita');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      setPreviewName(dvr.documentoNome || 'DVR');
    } catch {
      showToast({ message: 'Errore nell\'apertura del documento', type: 'error' });
    }
  };

  const closePreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewName('');
  };

  const handleDownloadDocument = async (dvr: DVR) => {
    if (!dvr.documentoUrl) return;
    try {
      const response = await fetch(`/api/v1/dvr/${dvr.id}/documento`, {
        credentials: 'include',
        headers: {
          ...operateHeaders,
          'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`
        }
      });
      if (!response.ok) throw new Error('Download fallito');
      const blob = await response.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = dvr.documentoNome || 'dvr.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    } catch {
      showToast({ message: 'Errore nel download del documento', type: 'error' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Caricamento DVR...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">DVR - {siteName}</h2>
          <p className="text-gray-600 dark:text-gray-400">Gestione Documenti di Valutazione dei Rischi</p>
        </div>
        <CRUDButton onClick={() => setShowForm(true)} className="inline-flex items-center px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition-colors">
          <Plus className="h-4 w-4 mr-2" />
          Nuovo DVR
        </CRUDButton>
      </div>

      {dvrs.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Nessun DVR presente</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">Inizia creando il primo documento di valutazione dei rischi per questa sede.</p>
            <CRUDButton onClick={() => setShowForm(true)} className="inline-flex items-center px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition-colors">
              <Plus className="h-4 w-4 mr-2" />
              Crea primo DVR
            </CRUDButton>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {dvrs.map((dvr) => {
            const scadenza = getScadenzaStatus(dvr.dataScadenza);
            return (
              <Card key={dvr.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {scadenza.icon}
                        DVR — {TIPO_DVR_LABELS[dvr.tipoDVR] || dvr.tipoDVR}
                        <Badge variant={scadenza.variant}>
                          {scadenza.label}
                        </Badge>
                      </CardTitle>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Effettuato da: {dvr.effettuatoDa}</p>
                    </div>
                    <div className="flex space-x-2">
                      {dvr.documentoUrl && (
                        <>
                          <Button variant="outline" size="sm" onClick={() => handleViewDocument(dvr)} title="Apri documento">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleDownloadDocument(dvr)} title="Scarica documento">
                            <Download className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      <Button variant="outline" size="sm" onClick={() => handleEdit(dvr)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <CRUDButton
                        onClick={() => handleDelete(dvr.id)}
                        className="inline-flex items-center px-2 py-1 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </CRUDButton>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {dvr.rischiRilevati && (
                      <p className="text-gray-700 dark:text-gray-300">{dvr.rischiRilevati}</p>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center text-gray-600 dark:text-gray-400">
                        <Calendar className="h-4 w-4 mr-2" />
                        <span>Esecuzione: {new Date(dvr.dataEsecuzione).toLocaleDateString('it-IT')}</span>
                      </div>
                      <div className="flex items-center text-gray-600 dark:text-gray-400">
                        <Calendar className="h-4 w-4 mr-2" />
                        <span>Scadenza: {new Date(dvr.dataScadenza).toLocaleDateString('it-IT')}</span>
                      </div>
                      <div className="flex items-center text-gray-600 dark:text-gray-400">
                        <User className="h-4 w-4 mr-2" />
                        <span>Effettuato da: {dvr.effettuatoDa}</span>
                      </div>
                    </div>

                    {dvr.documentoNome && (
                      <div className="flex items-center gap-2 text-sm text-teal-600 dark:text-teal-400">
                        <FileText className="h-4 w-4" />
                        <span>{dvr.documentoNome}</span>
                      </div>
                    )}

                    {dvr.note && (
                      <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <p className="text-sm text-gray-700 dark:text-gray-300">{dvr.note}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Form Modal — z-[60] to layer above CompanySites modal (z-50) */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]" onClick={(e) => { if (e.target === e.currentTarget) handleCloseForm(); }}>
          <div className="bg-white dark:bg-gray-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {editingDvr ? 'Modifica DVR' : 'Nuovo DVR'}
              </h3>
              <button
                onClick={handleCloseForm}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4" noValidate>
              <div>
                <Label htmlFor="effettuatoDa">Effettuato da *</Label>
                <Input
                  id="effettuatoDa"
                  name="effettuatoDa"
                  value={formData.effettuatoDa}
                  onChange={handleChange}
                  required
                  placeholder="Nome del professionista / studio"
                />
              </div>

              <div>
                <Label htmlFor="tipoDVR">Tipo DVR *</Label>
                <select
                  id="tipoDVR"
                  name="tipoDVR"
                  value={formData.tipoDVR}
                  onChange={(e) => setFormData(prev => ({ ...prev, tipoDVR: e.target.value as TipoDVR }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="NUOVO">Nuovo</option>
                  <option value="AGGIORNAMENTO_CON_MODIFICHE">Aggiornamento con modifiche</option>
                  <option value="AGGIORNAMENTO_SENZA_MODIFICHE">Aggiornamento senza modifiche</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dataEsecuzione">Data esecuzione *</Label>
                  <DatePickerElegante
                    value={formData.dataEsecuzione}
                    onChange={(date) => handleChange({ target: { name: 'dataEsecuzione', value: date ? date.toISOString().split('T')[0] : '' } } as any)}
                    theme="teal"
                  />
                </div>
                <div>
                  <Label htmlFor="dataScadenza">Data scadenza *</Label>
                  <DatePickerElegante
                    value={formData.dataScadenza}
                    onChange={(date) => handleChange({ target: { name: 'dataScadenza', value: date ? date.toISOString().split('T')[0] : '' } } as any)}
                    theme="teal"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="rischiRilevati">Rischi rilevati</Label>
                <textarea
                  id="rischiRilevati"
                  name="rischiRilevati"
                  value={formData.rischiRilevati}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleChange(e)}
                  rows={3}
                  placeholder="Descrizione dei rischi individuati..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <Label htmlFor="note">Note</Label>
                <textarea
                  id="note"
                  name="note"
                  value={formData.note}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleChange(e)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* File upload */}
              <div>
                <Label>Documento PDF</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                />
                <div className="flex items-center gap-3 mt-1">
                  <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="h-4 w-4 mr-2" />
                    {selectedFile ? 'Cambia file' : 'Carica PDF'}
                  </Button>
                  {selectedFile && (
                    <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                      <FileText className="h-4 w-4" />
                      {selectedFile.name}
                      <button type="button" onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} className="ml-1 text-red-500 hover:text-red-700">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  )}
                  {!selectedFile && editingDvr?.documentoNome && (
                    <span className="text-sm text-teal-600 dark:text-teal-400 flex items-center gap-1">
                      <FileText className="h-4 w-4" />
                      {editingDvr.documentoNome} (già caricato)
                    </span>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <Button type="button" variant="outline" onClick={handleCloseForm}>
                  Annulla
                </Button>
                <CRUDButton
                  type="submit"
                  disabled={submitting || !formData.effettuatoDa || !formData.dataEsecuzione || !formData.dataScadenza}
                  className="inline-flex items-center px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
                >
                  {submitting ? 'Salvataggio...' : (editingDvr ? 'Aggiorna' : 'Crea')} DVR
                </CRUDButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PDF Preview Overlay */}
      {previewUrl && (
        <div className="fixed inset-0 bg-black/60 z-[70] flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 bg-gray-900 text-white">
            <span className="font-medium truncate">{previewName}</span>
            <div className="flex items-center gap-2">
              <a href={previewUrl} target="_blank" rel="noopener noreferrer"
                className="text-sm px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-md flex items-center gap-1.5 transition-colors">
                <Eye className="h-3.5 w-3.5" />
                Nuova scheda
              </a>
              <button onClick={closePreview}
                className="p-1.5 hover:bg-gray-700 rounded-md transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
          <iframe src={previewUrl} className="flex-1 w-full border-0 bg-white" title="Anteprima DVR" />
        </div>
      )}
    </div>
  );
};