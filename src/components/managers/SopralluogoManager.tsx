import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../design-system/molecules/Card';
import { Button } from '../../design-system/atoms/Button';
import { Input } from '../../design-system/atoms/Input';
import { Label } from '../../design-system/atoms/Label';
import { Badge } from '../../design-system/atoms/Badge';
import { apiGet, apiDelete } from '../../services/api';
import { toast } from 'react-hot-toast';

interface Sopralluogo {
  id: string;
  esecutoreId: string;
  dataEsecuzione: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
  site: {
    id: string;
    siteName: string;
    company: {
      id: string;
      name: string;
    };
  };
  esecutore: {
    id: string;
    nome: string;
    cognome: string;
  };
}

interface SopralluogoFormData {
  esecutoreId: string;
  dataEsecuzione: string;
  note?: string;
}

interface SopralluogoManagerProps {
  siteId: string;
  siteName: string;
}

const SopralluogoManager: React.FC<SopralluogoManagerProps> = ({ siteId, siteName }) => {
  const [sopralluoghi, setSopralluoghi] = useState<Sopralluogo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSopralluogo, setEditingSopralluogo] = useState<Sopralluogo | null>(null);
  const [formData, setFormData] = useState<SopralluogoFormData>({
    esecutoreId: '',
    dataEsecuzione: '',
    note: ''
  });

  useEffect(() => {
    loadSopralluoghi();
  }, [siteId]);

  const loadSopralluoghi = async () => {
    try {
      setLoading(true);
      const response = await apiGet(`/api/v1/sopralluogo/site/${siteId}`) as { sopralluoghi?: Sopralluogo[] };
      setSopralluoghi(response.sopralluoghi || []);
    } catch (error) {
      console.error('Error loading sopralluoghi:', error);
      toast.error('Errore nel caricamento dei sopralluoghi');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingSopralluogo) {
        // Update existing sopralluogo
        await apiPut(`/api/v1/sopralluogo/${editingSopralluogo.id}`, formData);
        toast.success('Sopralluogo aggiornato con successo');
      } else {
        // Create new sopralluogo
        await apiPost(`/api/v1/sopralluogo/site/${siteId}`, formData);
        toast.success('Sopralluogo creato con successo');
      }
      
      resetForm();
      loadSopralluoghi();
    } catch (error) {
      console.error('Error saving sopralluogo:', error);
      toast.error('Errore nel salvataggio del sopralluogo');
    }
  };

  const handleEdit = (sopralluogo: Sopralluogo) => {
    setEditingSopralluogo(sopralluogo);
    setFormData({
      esecutoreId: sopralluogo.esecutoreId,
      dataEsecuzione: sopralluogo.dataEsecuzione.split('T')[0], // Format for date input
      note: sopralluogo.note || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (sopralluogoId: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo sopralluogo?')) {
      return;
    }

    try {
      await apiDelete(`/api/v1/sopralluogo/${sopralluogoId}`);
      toast.success('Sopralluogo eliminato con successo');
      loadSopralluoghi();
    } catch (error) {
      console.error('Error deleting sopralluogo:', error);
      toast.error('Errore nell\'eliminazione del sopralluogo');
    }
  };

  const resetForm = () => {
    setFormData({
      esecutoreId: '',
      dataEsecuzione: '',
      note: ''
    });
    setEditingSopralluogo(null);
    setShowForm(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT');
  };

  const isRecentSopralluogo = (dateString: string) => {
    const sopralluogoDate = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - sopralluogoDate.getTime()) / (1000 * 60 * 60 * 24));
    return diffInDays <= 30; // Recent if within 30 days
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sopralluoghi - {siteName}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Caricamento sopralluoghi...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Sopralluoghi - {siteName}</CardTitle>
          <Button 
            onClick={() => setShowForm(!showForm)}
            variant={showForm ? "outline" : "primary"}
          >
            {showForm ? 'Annulla' : 'Nuovo Sopralluogo'}
          </Button>
        </CardHeader>
        <CardContent>
          {showForm && (
            <form onSubmit={handleSubmit} className="space-y-4 mb-6 p-4 border rounded-lg bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="esecutoreId">ID Esecutore *</Label>
                  <Input
                    id="esecutoreId"
                    type="text"
                    value={formData.esecutoreId}
                    onChange={(e) => setFormData({ ...formData, esecutoreId: e.target.value })}
                    required
                    placeholder="ID della persona che esegue il sopralluogo"
                  />
                </div>
                <div>
                  <Label htmlFor="dataEsecuzione">Data Esecuzione *</Label>
                  <Input
                    id="dataEsecuzione"
                    type="date"
                    value={formData.dataEsecuzione}
                    onChange={(e) => setFormData({ ...formData, dataEsecuzione: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="note">Note</Label>
                <textarea
                  id="note"
                  value={formData.note}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, note: e.target.value })}
                  placeholder="Note aggiuntive sul sopralluogo..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit">
                  {editingSopralluogo ? 'Aggiorna Sopralluogo' : 'Crea Sopralluogo'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Annulla
                </Button>
              </div>
            </form>
          )}

          {sopralluoghi.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>Nessun sopralluogo registrato per questa sede.</p>
              <p className="text-sm mt-2">Clicca su "Nuovo Sopralluogo" per aggiungerne uno.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sopralluoghi.map((sopralluogo) => (
                <div key={sopralluogo.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">
                          Sopralluogo del {formatDate(sopralluogo.dataEsecuzione)}
                        </h3>
                        {isRecentSopralluogo(sopralluogo.dataEsecuzione) && (
                          <Badge variant="default">Recente</Badge>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>
                          <strong>Esecutore:</strong> {sopralluogo.esecutore.nome} {sopralluogo.esecutore.cognome}
                        </p>
                        {sopralluogo.note && (
                          <p>
                            <strong>Note:</strong> {sopralluogo.note}
                          </p>
                        )}
                        <p>
                          <strong>Creato il:</strong> {formatDate(sopralluogo.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(sopralluogo)}
                      >
                        Modifica
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(sopralluogo.id)}
                      >
                        Elimina
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SopralluogoManager;