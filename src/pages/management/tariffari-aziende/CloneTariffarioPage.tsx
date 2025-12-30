/**
 * CloneTariffarioPage
 * 
 * Pagina per clonare un tariffario BASE in uno AZIENDALE
 * Permette di selezionare l'azienda e personalizzare i dati prima della clonazione
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Copy,
  Building2,
  FileText,
  Euro,
  Calendar,
  Check,
  AlertCircle
} from 'lucide-react';
import { Button } from '../../../design-system/atoms/Button';
import { Input } from '../../../design-system/atoms/Input';
import { Label } from '../../../design-system/atoms/Label';
import { Badge } from '../../../design-system/atoms/Badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../design-system/molecules/Card';
import { Select } from '../../../design-system/atoms/Select';
import { useToast } from '../../../hooks/useToast';
import {
  tariffariAziendaliApi,
  TariffarioAziendale,
  TIPO_VOCE_LABELS
} from '../../../services/tariffarioAziendaleApi';
import { apiGet } from '../../../services/api';

interface CompanyOption {
  id: string;
  ragioneSociale: string;
}

const CloneTariffarioPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [cloning, setCloning] = useState(false);
  const [tariffarioOrigine, setTariffarioOrigine] = useState<TariffarioAziendale | null>(null);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);

  // Clone form data
  const [formData, setFormData] = useState({
    companyId: '',
    nuovoCodice: '',
    nuovoNome: '',
    validoDa: new Date().toISOString().split('T')[0],
    validoA: ''
  });

  // Load data
  useEffect(() => {
    const loadData = async () => {
      if (!id) {
        showToast({ message: 'ID tariffario mancante', type: 'error' });
        navigate('/management/tariffari-aziende');
        return;
      }

      setLoading(true);
      try {
        const [tariffarioRes, companiesRes] = await Promise.all([
          tariffariAziendaliApi.getById(id),
          apiGet<CompanyOption[]>('/api/v1/companies?limit=1000')
        ]);

        if (tariffarioRes.success && tariffarioRes.data) {
          setTariffarioOrigine(tariffarioRes.data);
          // Pre-fill form
          setFormData(prev => ({
            ...prev,
            nuovoNome: `${tariffarioRes.data.nome} - Copia`
          }));
        } else {
          showToast({ message: 'Tariffario non trovato', type: 'error' });
          navigate('/management/tariffari-aziende');
          return;
        }

        setCompanies(Array.isArray(companiesRes) ? companiesRes : []);
      } catch (error) {
        console.error('Error loading data:', error);
        showToast({ message: 'Errore nel caricamento', type: 'error' });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, navigate]);

  // Generate code when company selected
  useEffect(() => {
    if (formData.companyId && tariffarioOrigine) {
      const company = companies.find(c => c.id === formData.companyId);
      if (company) {
        const prefix = company.ragioneSociale.substring(0, 3).toUpperCase();
        const year = new Date().getFullYear();
        setFormData(prev => ({
          ...prev,
          nuovoCodice: `${prefix}-MDL-${year}`
        }));
      }
    }
  }, [formData.companyId, companies, tariffarioOrigine]);

  const handleClone = async () => {
    if (!formData.companyId) {
      showToast({ message: 'Seleziona un\'azienda', type: 'error' });
      return;
    }

    try {
      setCloning(true);
      const response = await tariffariAziendaliApi.clone(id!, {
        companyId: formData.companyId,
        codice: formData.nuovoCodice || undefined,
        nome: formData.nuovoNome || undefined,
        validoDa: formData.validoDa,
        validoA: formData.validoA || undefined
      });

      if (response.success) {
        showToast({ message: 'Tariffario clonato con successo', type: 'success' });
        navigate(`/management/tariffari-aziende/${response.data.id}`);
      }
    } catch (error: unknown) {
      console.error('Error cloning tariffario:', error);
      const errorMessage = error instanceof Error ? error.message : 'Errore nella clonazione';
      showToast({ message: errorMessage, type: 'error' });
    } finally {
      setCloning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!tariffarioOrigine) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <AlertCircle className="h-12 w-12 mb-4" />
        <p>Tariffario non trovato</p>
      </div>
    );
  }

  const selectedCompany = companies.find(c => c.id === formData.companyId);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/management/tariffari-aziende')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Indietro
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Copy className="h-6 w-6" />
            Clona Tariffario
          </h1>
          <p className="text-gray-500 text-sm">
            Crea un tariffario aziendale partendo da un template
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Source tariffario */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Tariffario Origine
            </CardTitle>
            <CardDescription>Template da clonare</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant={tariffarioOrigine.tipo === 'BASE' ? 'default' : 'secondary'}>
                {tariffarioOrigine.tipo}
              </Badge>
              {tariffarioOrigine.attivo && (
                <Badge variant="outline" className="text-green-600">
                  Attivo
                </Badge>
              )}
            </div>

            <div>
              <span className="text-sm text-gray-500">Codice</span>
              <p className="font-medium">{tariffarioOrigine.codice}</p>
            </div>

            <div>
              <span className="text-sm text-gray-500">Nome</span>
              <p className="font-medium">{tariffarioOrigine.nome}</p>
            </div>

            {tariffarioOrigine.descrizione && (
              <div>
                <span className="text-sm text-gray-500">Descrizione</span>
                <p className="text-sm">{tariffarioOrigine.descrizione}</p>
              </div>
            )}

            <hr className="my-4 border-gray-200" />

            <div>
              <span className="text-sm text-gray-500 flex items-center gap-1 mb-2">
                <Euro className="h-4 w-4" />
                Voci incluse ({tariffarioOrigine.voci?.length || 0})
              </span>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {tariffarioOrigine.voci?.map((voce) => (
                  <div
                    key={voce.id}
                    className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded text-sm"
                  >
                    <div>
                      <span className="font-medium">
                        {voce.prestazione?.nome || voce.nome}
                      </span>
                      <span className="text-gray-500 ml-2">
                        ({TIPO_VOCE_LABELS[voce.tipo]})
                      </span>
                    </div>
                    <span>€{Number(voce.prezzoBase).toFixed(2)}</span>
                  </div>
                ))}
                {(!tariffarioOrigine.voci || tariffarioOrigine.voci.length === 0) && (
                  <p className="text-sm text-gray-500 text-center py-2">
                    Nessuna voce
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Clone form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Nuovo Tariffario Aziendale
            </CardTitle>
            <CardDescription>Configura il nuovo tariffario</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyId">Azienda *</Label>
              <Select
                value={formData.companyId}
                onChange={(e) => setFormData(prev => ({ ...prev, companyId: e.target.value }))}
                options={[
                  { value: '', label: 'Seleziona l\'azienda...' },
                  ...companies.map((c) => ({ value: c.id, label: c.ragioneSociale }))
                ]}
              />
            </div>

            {selectedCompany && (
              <>
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <Check className="h-4 w-4 inline mr-1" />
                    Il tariffario sarà assegnato a <strong>{selectedCompany.ragioneSociale}</strong>
                  </p>
                </div>

                <hr className="my-4" />

                <div className="space-y-2">
                  <Label htmlFor="nuovoCodice">Codice</Label>
                  <Input
                    id="nuovoCodice"
                    value={formData.nuovoCodice}
                    onChange={(e) => setFormData(prev => ({ ...prev, nuovoCodice: e.target.value }))}
                    placeholder="Codice automatico se vuoto"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nuovoNome">Nome</Label>
                  <Input
                    id="nuovoNome"
                    value={formData.nuovoNome}
                    onChange={(e) => setFormData(prev => ({ ...prev, nuovoNome: e.target.value }))}
                    placeholder="Nome del nuovo tariffario"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="validoDa" className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Valido da
                    </Label>
                    <Input
                      id="validoDa"
                      type="date"
                      value={formData.validoDa}
                      onChange={(e) => setFormData(prev => ({ ...prev, validoDa: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="validoA">Valido fino a</Label>
                    <Input
                      id="validoA"
                      type="date"
                      value={formData.validoA}
                      onChange={(e) => setFormData(prev => ({ ...prev, validoA: e.target.value }))}
                    />
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={() => navigate('/management/tariffari-aziende')}>
          Annulla
        </Button>
        <Button
          onClick={handleClone}
          disabled={!formData.companyId || cloning}
        >
          {cloning ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Clonazione...
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 mr-2" />
              Clona Tariffario
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default CloneTariffarioPage;
