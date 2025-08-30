import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../design-system/molecules/Card';
import { Button } from '../../design-system/atoms/Button';
import { Input } from '../../design-system/atoms/Input';
import { Label } from '../../design-system/atoms/Label';
import { Badge } from '../../design-system/atoms/Badge';
import { 
  AlertTriangle,
  Calendar,
  CheckCircle,
  Edit,
  FileText,
  Plus,
  Trash2
} from 'lucide-react';
import { apiGet, apiDelete } from '../../services/api';
import { useToast } from '../../hooks/useToast';

interface DVR {
  id: string;
  titolo: string;
  descrizione: string;
  dataCreazione: string;
  dataScadenza: string;
  stato: 'attivo' | 'scaduto' | 'in_revisione';
  responsabile: string;
  versione: string;
  note?: string;
}

interface DVRManagerProps {
  siteId: string;
  siteName: string;
}

export const DVRManager: React.FC<DVRManagerProps> = ({ siteId, siteName }) => {
  const [dvrs, setDvrs] = useState<DVR[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingDvr, setEditingDvr] = useState<DVR | null>(null);
  const [formData, setFormData] = useState({
    titolo: '',
    descrizione: '',
    dataScadenza: '',
    responsabile: '',
    versione: '',
    note: ''
  });
  const { showToast } = useToast();

  useEffect(() => {
    fetchDvrs();
  }, [siteId]);

  const fetchDvrs = async () => {
    try {
      setLoading(true);
      const response = await apiGet(`/api/v1/dvr/site/${siteId}`) as { dvrs?: DVR[] };
      setDvrs(response.dvrs || []);
    } catch (error) {
      console.error('Error fetching DVRs:', error);
      showToast({ message: 'Errore nel caricamento dei DVR', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const payload = {
        ...formData,
        siteId,
        dataCreazione: editingDvr ? editingDvr.dataCreazione : new Date().toISOString(),
        stato: editingDvr ? editingDvr.stato : 'attivo'
      };

      if (editingDvr) {
        await apiPut(`/api/v1/dvr/${editingDvr.id}`, payload);
        showToast({ message: 'DVR aggiornato con successo', type: 'success' });
      } else {
        await apiPost('/api/v1/dvr', payload);
        showToast({ message: 'DVR creato con successo', type: 'success' });
      }

      await fetchDvrs();
      handleCloseForm();
    } catch (error) {
      console.error('Error saving DVR:', error);
      showToast({ message: 'Errore nel salvataggio del DVR', type: 'error' });
    }
  };

  const handleEdit = (dvr: DVR) => {
    setEditingDvr(dvr);
    setFormData({
      titolo: dvr.titolo,
      descrizione: dvr.descrizione,
      dataScadenza: dvr.dataScadenza.split('T')[0],
      responsabile: dvr.responsabile,
      versione: dvr.versione,
      note: dvr.note || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo DVR?')) return;

    try {
      await apiDelete(`/api/v1/dvr/${id}`);
      showToast({ message: 'DVR eliminato con successo', type: 'success' });
      await fetchDvrs();
    } catch (error) {
      console.error('Error deleting DVR:', error);
      showToast({ message: 'Errore nell\'eliminazione del DVR', type: 'error' });
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingDvr(null);
    setFormData({
      titolo: '',
      descrizione: '',
      dataScadenza: '',
      responsabile: '',
      versione: '',
      note: ''
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const getStatoBadgeVariant = (stato: string) => {
    switch (stato) {
      case 'attivo': return 'default';
      case 'scaduto': return 'destructive';
      case 'in_revisione': return 'secondary';
      default: return 'default';
    }
  };

  const getStatoIcon = (stato: string) => {
    switch (stato) {
      case 'attivo': return <CheckCircle className="h-4 w-4" />;
      case 'scaduto': return <AlertTriangle className="h-4 w-4" />;
      case 'in_revisione': return <AlertTriangle className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
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
          <h2 className="text-2xl font-bold text-gray-900">DVR - {siteName}</h2>
          <p className="text-gray-600">Gestione Documenti di Valutazione dei Rischi</p>
        </div>
        <Button onClick={() => setShowForm(true)} variant="primary">
          <Plus className="h-4 w-4 mr-2" />
          Nuovo DVR
        </Button>
      </div>

      {dvrs.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nessun DVR presente</h3>
            <p className="text-gray-500 mb-4">Inizia creando il primo documento di valutazione dei rischi per questa sede.</p>
            <Button onClick={() => setShowForm(true)} variant="primary">
              <Plus className="h-4 w-4 mr-2" />
              Crea primo DVR
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {dvrs.map((dvr) => (
            <Card key={dvr.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {getStatoIcon(dvr.stato)}
                      {dvr.titolo}
                      <Badge variant={getStatoBadgeVariant(dvr.stato)}>
                        {dvr.stato.replace('_', ' ')}
                      </Badge>
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1">Versione {dvr.versione}</p>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(dvr)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(dvr.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-gray-700">{dvr.descrizione}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center text-gray-600">
                      <Calendar className="h-4 w-4 mr-2" />
                      <span>Creato: {new Date(dvr.dataCreazione).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <Calendar className="h-4 w-4 mr-2" />
                      <span>Scadenza: {new Date(dvr.dataScadenza).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <User className="h-4 w-4 mr-2" />
                      <span>Responsabile: {dvr.responsabile}</span>
                    </div>
                  </div>

                  {dvr.note && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-700">{dvr.note}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingDvr ? 'Modifica DVR' : 'Nuovo DVR'}
              </h3>
              <button
                onClick={handleCloseForm}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="sr-only">Chiudi</span>
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <Label htmlFor="titolo">Titolo *</Label>
                <Input
                  id="titolo"
                  name="titolo"
                  value={formData.titolo}
                  onChange={handleChange}
                  required
                />
              </div>

              <div>
                <Label htmlFor="descrizione">Descrizione *</Label>
                <textarea
                  id="descrizione"
                  name="descrizione"
                  value={formData.descrizione}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleChange(e)}
                  required
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <Label htmlFor="versione">Versione *</Label>
                <Input
                  id="versione"
                  name="versione"
                  value={formData.versione}
                  onChange={handleChange}
                  required
                  placeholder="es. 1.0"
                />
              </div>

              <div>
                <Label htmlFor="responsabile">Responsabile *</Label>
                <Input
                  id="responsabile"
                  name="responsabile"
                  value={formData.responsabile}
                  onChange={handleChange}
                  required
                />
              </div>

              <div>
                <Label htmlFor="dataScadenza">Data Scadenza *</Label>
                <Input
                  id="dataScadenza"
                  name="dataScadenza"
                  type="date"
                  value={formData.dataScadenza}
                  onChange={handleChange}
                  required
                />
              </div>

              <div>
                <Label htmlFor="note">Note</Label>
                <textarea
                  id="note"
                  name="note"
                  value={formData.note}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleChange(e)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <Button type="button" variant="outline" onClick={handleCloseForm}>
                  Annulla
                </Button>
                <Button type="submit" variant="primary">
                  {editingDvr ? 'Aggiorna' : 'Crea'} DVR
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};