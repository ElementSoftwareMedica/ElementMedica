import React, { useState, useEffect } from 'react';
import { Shield, CheckCircle, AlertCircle, AlertTriangle, Save } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useRoles, type Role } from '../../hooks/useRoles';
import { useTenants } from '../../hooks/useTenants';
import OptimizedPermissionManager from '../../components/roles/OptimizedPermissionManager';

const RolesTab: React.FC = () => {
  const { hasPermission } = useAuth();
  const { roles, selectedRole, loading: rolesLoading, loadRoles, selectRole, deleteRole, setSelectedRole } = useRoles();
  const { tenants, loadTenants } = useTenants();
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isChangingRole, setIsChangingRole] = useState(false);
  const [pendingRoleChange, setPendingRoleChange] = useState<Role | null>(null);
  const [showUnsavedChangesModal, setShowUnsavedChangesModal] = useState(false);
  // Carica ruoli e tenants all'avvio (solo una volta)
  useEffect(() => {
    console.log('🔄 RolesTab: Initial load');
    loadRoles();
    loadTenants();
  }, []); // Rimuovo le dipendenze per evitare loop

  // Ricarica i ruoli quando la tab diventa visibile (con debouncing)
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const handleVisibilityChange = () => {
      if (!document.hidden && roles.length > 0) {
        // Debounce per evitare troppe richieste
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          console.log('🔄 RolesTab: Tab became visible, refreshing data');
          loadRoles(true); // Force refresh
        }, 500);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearTimeout(timeoutId);
    };
  }, [roles.length]); // Solo roles.length come dipendenza

  // Mostra messaggio temporaneo
  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };



  // Gestione cambio ruolo con controllo modifiche non salvate
  const handleRoleChange = async (role: Role) => {
    if (hasUnsavedChanges && selectedRole) {
      setPendingRoleChange(role);
      setShowUnsavedChangesModal(true);
      return;
    }
    
    await performRoleChange(role);
  };

  // Esegue il cambio ruolo
  const performRoleChange = async (role: Role | null) => {
    if (!role) return;
    
    setIsChangingRole(true);
    try {
      await selectRole(role);
      setHasUnsavedChanges(false);
      // Rimosso il messaggio di successo per la selezione del ruolo
    } catch (error) {
      showMessage('error', 'Errore nel cambio ruolo');
    } finally {
      setIsChangingRole(false);
    }
  };

  // Salva e cambia ruolo
  const saveAndChangeRole = async () => {
    // Per ora procediamo direttamente al cambio ruolo
    // In futuro si potrà implementare il salvataggio automatico
    if (pendingRoleChange) {
      await performRoleChange(pendingRoleChange);
      setPendingRoleChange(null);
    }
    setShowUnsavedChangesModal(false);
  };

  // Cambia ruolo senza salvare
  const changeRoleWithoutSaving = async () => {
    if (pendingRoleChange) {
      await performRoleChange(pendingRoleChange);
      setPendingRoleChange(null);
    }
    setShowUnsavedChangesModal(false);
  };

  // Annulla cambio ruolo
  const cancelRoleChange = () => {
    setPendingRoleChange(null);
    setShowUnsavedChangesModal(false);
  };

  // Torna alla selezione dei ruoli
  const handleBackToRoleSelection = () => {
    setSelectedRole(null);
    setHasUnsavedChanges(false);
  };

  // Converte il ruolo da useRoles al formato richiesto da OptimizedPermissionManager
  const convertRole = (role: Role | null) => {
    if (!role) return null;
    return {
      ...role,
      description: role.description || '',
      userCount: role.userCount || 0,
      isActive: true
    };
  };

  // Verifica permessi di lettura ruoli
  if (!hasPermission('roles', 'read')) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center p-8">
          <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Accesso negato</h3>
          <p className="text-gray-600">Non hai i permessi necessari per visualizzare i ruoli.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl shadow-lg">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-2xl font-bold text-gray-900">Gestione Ruoli e Permessi</h1>
                {hasUnsavedChanges && (
                  <div className="flex items-center space-x-1 px-2 py-1 bg-amber-100 border border-amber-300 rounded-lg">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span className="text-xs font-medium text-amber-700">Modifiche non salvate</span>
                  </div>
                )}
                {isChangingRole && (
                  <div className="flex items-center space-x-1 px-2 py-1 bg-blue-100 border border-blue-300 rounded-lg">
                    <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-xs font-medium text-blue-700">Cambio ruolo...</span>
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-600">Configura ruoli, permessi CRUD, scope tenant e campi specifici</p>
            </div>
          </div>
          
          {/* Statistiche rapide */}
          <div className="flex items-center space-x-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{roles.length}</div>
              <div className="text-xs text-gray-500">Ruoli</div>
            </div>
            {selectedRole && (
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{selectedRole.userCount || 0}</div>
                <div className="text-xs text-gray-500">Utenti</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Messaggi di stato */}
      {message && (
        <div className={`mx-6 mt-4 p-4 rounded-lg border shadow-sm ${
          message.type === 'success' 
            ? 'bg-green-50 border-green-200 text-green-800' 
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <div className="flex items-center">
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5 mr-2" />
            ) : (
              <AlertCircle className="w-5 h-5 mr-2" />
            )}
            <span>{message.text}</span>
          </div>
        </div>
      )}

      {/* Selezione ruolo se nessuno è selezionato */}
      {!selectedRole && !rolesLoading && (
        <div className="mx-6 mt-4 p-6 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center space-x-3">
            <Shield className="w-6 h-6 text-blue-600" />
            <div>
              <h3 className="font-semibold text-blue-900">Seleziona un ruolo</h3>
              <p className="text-sm text-blue-700">
                Scegli un ruolo dalla lista per configurare i permessi CRUD, scope tenant e campi specifici
              </p>
            </div>
          </div>
          
          {/* Lista ruoli rapida */}
          <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {roles.map((role, index) => (
              <button
                key={role?.type || `role-${index}`}
                onClick={() => role && handleRoleChange(role)}
                disabled={isChangingRole || !role}
                className={`p-3 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors text-left relative ${
                  isChangingRole || !role ? 'opacity-50 cursor-not-allowed' : ''
                } ${
                  selectedRole?.type === role?.type ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                }`}
              >
                <div className="font-medium text-blue-900 text-sm">{role?.name || 'Ruolo sconosciuto'}</div>
                <div className="text-xs text-blue-600 mt-1">{role?.userCount || 0} utenti</div>
                {selectedRole?.type === role?.type && (
                  <div className="absolute top-2 right-2">
                    <CheckCircle className="w-4 h-4 text-blue-600" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Gestore permessi unificato */}
      {selectedRole && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header sezione permessi */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center space-x-2">
              <Shield className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                Gestione Permessi - {selectedRole.name}
              </h3>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Configura i permessi per tutte le entità del sistema, incluse quelle virtuali (Dipendenti e Formatori)
            </p>
          </div>

          {/* Contenuto principale */}
          <div className="flex-1 overflow-hidden">
            <div className="h-full p-6 overflow-hidden">
              <OptimizedPermissionManager
                role={convertRole(selectedRole)!}
                tenants={tenants}
                onBack={handleBackToRoleSelection}
              />
            </div>
          </div>
        </div>
      )}

      {/* Loading state */}
      {rolesLoading && (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Caricamento ruoli...</p>
          </div>
        </div>
      )}

      {/* Modale conferma cambio ruolo */}
      {showUnsavedChangesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-amber-100 rounded-full">
                  <AlertTriangle className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Modifiche non salvate</h3>
                  <p className="text-sm text-gray-600">
                    Hai modifiche non salvate per il ruolo "{selectedRole?.name}"
                  </p>
                </div>
              </div>
              
              <p className="text-gray-700 mb-6">
                Vuoi salvare le modifiche prima di cambiare ruolo o procedere senza salvare?
              </p>
              
              <div className="flex space-x-3">
                <button
                  onClick={saveAndChangeRole}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <Save className="w-4 h-4" />
                  <span>Salva e cambia</span>
                </button>
                <button
                  onClick={changeRoleWithoutSaving}
                  className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Non salvare
                </button>
                <button
                  onClick={cancelRoleChange}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Annulla
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RolesTab;