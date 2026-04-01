import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../design-system/molecules/Card';
import { Button } from '../../design-system/atoms/Button';
import { Input } from '../../design-system/atoms/Input';
import { Label } from '../../design-system/atoms/Label';
import { Badge } from '../../design-system/atoms/Badge';
import { apiGet, apiDelete, apiPost, apiPut } from '../../services/api';
import { useTenantMode } from '../../contexts/TenantModeContext';
import { useToast } from '../../hooks/useToast';
import { useConfirmDialog } from '../../contexts/ConfirmDialogContext';

interface Reparto {
  id: string;
  nome: string;
  responsabileId?: string;
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
  responsabile?: {
    id: string;
    nome: string;
    cognome: string;
  };
}

interface RepartoFormData {
  nome: string;
  responsabileId?: string;
}

interface RepartoManagerProps {
  siteId: string;
  siteName: string;
}

const RepartoManager: React.FC<RepartoManagerProps> = ({ siteId, siteName }) => {
  const { getOperateHeaders } = useTenantMode();
  const operateHeaders = getOperateHeaders();
  const [reparti, setReparti] = useState<Reparto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingReparto, setEditingReparto] = useState<Reparto | null>(null);
  const [formData, setFormData] = useState<RepartoFormData>({
    nome: '',
    responsabileId: ''
  });
  const { confirmDelete } = useConfirmDialog();
  const { showToast } = useToast();

  useEffect(() => {
    loadReparti();
  }, [siteId]);

  const loadReparti = async () => {
    try {
      setLoading(true);
      const response = await apiGet(`/api/v1/reparto/site/${siteId}`) as { reparti?: Reparto[] };
      setReparti(response.reparti || []);
    } catch (error) {
      showToast({ message: 'Errore nel caricamento dei reparti', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingReparto) {
        // Update existing reparto
        await apiPut(`/api/v1/reparto/${editingReparto.id}`, formData, { headers: operateHeaders });
        showToast({ message: 'Reparto aggiornato con successo', type: 'success' });
      } else {
        // Create new reparto
        await apiPost(`/api/v1/reparto/site/${siteId}`, formData, { headers: operateHeaders });
        showToast({ message: 'Reparto creato con successo', type: 'success' });
      }

      resetForm();
      loadReparti();
    } catch (error) {
      showToast({ message: 'Errore nel salvataggio del reparto', type: 'error' });
    }
  };

  const handleEdit = (reparto: Reparto) => {
    setEditingReparto(reparto);
    setFormData({
      nome: reparto.nome,
      responsabileId: reparto.responsabileId || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (repartoId: string) => {
    const confirmed = await confirmDelete('Sei sicuro di voler eliminare questo reparto?');
    if (!confirmed) {
      return;
    }

    try {
      await apiDelete(`/api/v1/reparto/${repartoId}`, { headers: operateHeaders });
      showToast({ message: 'Reparto eliminato con successo', type: 'success' });
      loadReparti();
    } catch (error) {
      showToast({ message: 'Errore nell\'eliminazione del reparto', type: 'error' });
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      responsabileId: ''
    });
    setEditingReparto(null);
    setShowForm(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT');
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Reparti - {siteName}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Caricamento reparti...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Reparti - {siteName}</CardTitle>
          <Button
            onClick={() => setShowForm(!showForm)}
            variant={showForm ? "outline" : "primary"}
          >
            {showForm ? 'Annulla' : 'Nuovo Reparto'}
          </Button>
        </CardHeader>
        <CardContent>
          {showForm && (
            <form onSubmit={handleSubmit} className="space-y-4 mb-6 p-4 border rounded-lg bg-gray-50" noValidate>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nome">Nome Reparto *</Label>
                  <Input
                    id="nome"
                    type="text"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    required
                    placeholder="Nome del reparto"
                  />
                </div>
                <div>
                  <Label htmlFor="responsabileId">ID Responsabile</Label>
                  <Input
                    id="responsabileId"
                    type="text"
                    value={formData.responsabileId}
                    onChange={(e) => setFormData({ ...formData, responsabileId: e.target.value })}
                    placeholder="ID della persona responsabile (opzionale)"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit">
                  {editingReparto ? 'Aggiorna Reparto' : 'Crea Reparto'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Annulla
                </Button>
              </div>
            </form>
          )}

          {reparti.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>Nessun reparto registrato per questa sede.</p>
              <p className="text-sm mt-2">Clicca su "Nuovo Reparto" per aggiungerne uno.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reparti.map((reparto) => (
                <div key={reparto.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">
                          {reparto.nome}
                        </h3>
                        <Badge variant="secondary">Reparto</Badge>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        {reparto.responsabile ? (
                          <p>
                            <strong>Responsabile:</strong> {reparto.responsabile.nome} {reparto.responsabile.cognome}
                          </p>
                        ) : (
                          <p className="text-gray-400">
                            <strong>Responsabile:</strong> Non assegnato
                          </p>
                        )}
                        <p>
                          <strong>Creato il:</strong> {formatDate(reparto.createdAt)}
                        </p>
                        {reparto.updatedAt !== reparto.createdAt && (
                          <p>
                            <strong>Ultimo aggiornamento:</strong> {formatDate(reparto.updatedAt)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(reparto)}
                      >
                        Modifica
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(reparto.id)}
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

export default RepartoManager;