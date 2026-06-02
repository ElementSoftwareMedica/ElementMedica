import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, RefreshCw, UserPlus, Building2 } from 'lucide-react';
import TrainerForm from '../../components/trainers/TrainerForm';
import TrainersService, { getTrainerById, createTrainer, updateTrainer } from '../../services/trainers';
import { apiPost } from '../../services/api';
import { useTenantMode } from '../../contexts/TenantModeContext';

interface ExistingPersonInfo {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  taxCode: string;
  status: 'active' | 'deleted';
  currentRoles: string[];
  message: string;
  action: 'REACTIVATE_AND_UPDATE' | 'ADD_ROLE_SAME_TENANT' | 'ADD_ROLE_NEW_TENANT' | 'ROLE_EXISTS_IN_TENANT' | string;
  isSameTenant: boolean;
  newRoleType: string;
}

export default function TrainerEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getOperateHeaders } = useTenantMode();
  const operateHeaders = getOperateHeaders();
  const [trainer, setTrainer] = useState<any>(null);
  const [loading, setLoading] = useState(!!id);
  const [error, setError] = useState('');
  const [pendingData, setPendingData] = useState<Record<string, unknown> | null>(null);
  const [existingPersonInfo, setExistingPersonInfo] = useState<ExistingPersonInfo | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isReactivating, setIsReactivating] = useState(false);

  useEffect(() => {
    if (id) {
      setLoading(true);
      getTrainerById(id)
        .then(data => setTrainer(data))
        .catch(err => setError(err?.message || 'Trainer not found'))
        .finally(() => setLoading(false));
    }
  }, [id]);

  const handleSubmit = async (data: Record<string, unknown>) => {
    try {
      setError('');
      if (id) {
        await updateTrainer(id, data as any, { headers: operateHeaders });
        navigate(`/trainers/${id}`);
      } else {
        const created = await createTrainer(data as any, { headers: operateHeaders });
        navigate(`/trainers/${created.id}`);
      }
    } catch (err: unknown) {
      const responseData = (err as any)?.response?.data;

      // Check se è una richiesta di conferma per persona esistente
      if ((err as any)?.response?.status === 409 && responseData?.code === 'PERSON_EXISTS') {
        setExistingPersonInfo({
          id: responseData.existingPerson.id,
          firstName: responseData.existingPerson.firstName,
          lastName: responseData.existingPerson.lastName,
          email: responseData.existingPerson.email,
          taxCode: responseData.existingPerson.taxCode,
          status: responseData.existingPerson.status,
          currentRoles: responseData.existingPerson.currentRoles || [],
          message: responseData.message,
          action: responseData.action,
          isSameTenant: responseData.isSameTenant ?? true,
          newRoleType: responseData.newRoleType
        });
        setPendingData(data);
        setShowConfirmDialog(true);
        return;
      }

      // Altri errori
      const errorMessage = responseData?.error
        || responseData?.message
        || (err as any)?.message
        || 'Errore nel salvataggio del formatore';
      setError(errorMessage);
    }
  };

  const handleConfirmReactivation = async () => {
    if (!pendingData) return;

    setIsReactivating(true);
    try {
      // Riprova con forceReactivate=true
      const dataWithForce = { ...pendingData, forceReactivate: true, roleType: 'TRAINER' };
      const resp = await apiPost<any>('/api/v1/persons', dataWithForce, { headers: operateHeaders });
      const response = resp?.data ?? resp;

      setShowConfirmDialog(false);
      setExistingPersonInfo(null);
      setPendingData(null);

      // Naviga al trainer riattivato/aggiornato
      navigate(`/trainers/${response.id}`);
    } catch (err: unknown) {
      const errorMessage = (err as any)?.response?.data?.error
        || (err as any)?.response?.data?.message
        || (err as any)?.message
        || 'Errore nella riattivazione del formatore';
      setError(errorMessage);
      setShowConfirmDialog(false);
    } finally {
      setIsReactivating(false);
    }
  };

  const handleCancelReactivation = () => {
    setShowConfirmDialog(false);
    setExistingPersonInfo(null);
    setPendingData(null);
  };

  const handleCancel = () => {
    navigate(id ? `/trainers/${id}` : '/trainers');
  };

  if (loading) {
    return <div className="flex items-center justify-center h-80">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Confirmation Dialog */}
      {showConfirmDialog && existingPersonInfo && (() => {
        const isDeleted = existingPersonInfo.action === 'REACTIVATE_AND_UPDATE';
        const isCrossTenant = existingPersonInfo.action === 'ADD_ROLE_NEW_TENANT';
        const headerBg = isDeleted
          ? 'bg-amber-50 border-b border-amber-100'
          : isCrossTenant
            ? 'bg-teal-50 border-b border-teal-100'
            : 'bg-blue-50 border-b border-blue-100';
        const iconBg = isDeleted ? 'bg-amber-100' : isCrossTenant ? 'bg-teal-100' : 'bg-blue-100';
        const btnClass = isDeleted
          ? 'bg-amber-600 hover:bg-amber-700'
          : isCrossTenant
            ? 'bg-teal-600 hover:bg-teal-700'
            : 'bg-blue-600 hover:bg-blue-700';
        const title = isDeleted
          ? 'Riattivare persona eliminata?'
          : isCrossTenant
            ? 'Crea accesso in questa organizzazione'
            : 'Aggiungi ruolo alla persona';
        const btnLabel = isDeleted ? 'Riattiva e Aggiorna' : isCrossTenant ? 'Crea Accesso' : 'Aggiungi Ruolo';
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden">
              <div className={`p-4 ${headerBg}`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${iconBg}`}>
                    {isDeleted ? (
                      <RefreshCw className="w-5 h-5 text-amber-600" />
                    ) : isCrossTenant ? (
                      <Building2 className="w-5 h-5 text-teal-600" />
                    ) : (
                      <UserPlus className="w-5 h-5 text-blue-600" />
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {title}
                  </h3>
                </div>
              </div>

              <div className="p-6">
                <p className="text-gray-600 mb-4">{existingPersonInfo.message}</p>

                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-4">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Dati esistenti:</p>
                  <div className="mt-2 text-sm text-gray-600 space-y-1">
                    <p><span className="font-medium">Nome:</span> {existingPersonInfo.firstName} {existingPersonInfo.lastName}</p>
                    {existingPersonInfo.email && <p><span className="font-medium">Email:</span> {existingPersonInfo.email}</p>}
                    {existingPersonInfo.taxCode && <p><span className="font-medium">Codice Fiscale:</span> {existingPersonInfo.taxCode}</p>}
                    <p><span className="font-medium">Ruoli attuali:</span> {existingPersonInfo.currentRoles.join(', ') || 'Nessuno'}</p>
                    <p><span className="font-medium">Stato:</span>
                      <span className={`ml-1 px-2 py-0.5 rounded text-xs ${existingPersonInfo.status === 'deleted' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {existingPersonInfo.status === 'deleted' ? 'Eliminato' : 'Attivo'}
                      </span>
                    </p>
                  </div>
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {error}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 p-4 bg-gray-50 border-t">
                <button
                  onClick={handleCancelReactivation}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={isReactivating}
                >
                  Annulla
                </button>
                <button
                  onClick={handleConfirmReactivation}
                  disabled={isReactivating}
                  className={`px-4 py-2 text-white rounded-lg transition-colors flex items-center gap-2 ${btnClass} disabled:opacity-50`}
                >
                  {isReactivating && <RefreshCw className="w-4 h-4 animate-spin" />}
                  {btnLabel}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Back link */}
      <div>
        <Link
          to={id ? `/trainers/${id}` : '/trainers'}
          className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          {id ? 'Torna al dettaglio formatore' : 'Torna ai formatori'}
        </Link>
      </div>

      {error && !showConfirmDialog && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <TrainerForm
        trainer={trainer}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        roleType="TRAINER"
      />
    </div>
  );
}