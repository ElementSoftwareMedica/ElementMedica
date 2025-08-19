import React, { useState, useEffect } from 'react';
import { 
  Activity,
  Building,
  Edit,
  Plus,
  Trash,
  Users
} from 'lucide-react';
import { format } from 'date-fns';
import { Company } from '../../types';
import { getAllTenants, createTenant, updateTenant, deleteTenant, getTenantUsage, TenantCreateDTO, TenantUpdateDTO } from '../../services/tenants';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';
import TenantModal from './TenantModal';
import TenantUsageModal from './TenantUsageModal';

const TenantsPage: React.FC = () => {
  const [tenants, setTenants] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUsageModalOpen, setIsUsageModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentTenant, setCurrentTenant] = useState<Company | null>(null);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  
  const { user } = useAuth();

  // Verifica se l'utente è un SUPER_ADMIN
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    if (!isSuperAdmin) {
      setError('Accesso negato. Solo i Super Admin possono gestire i tenant.');
      setIsLoading(false);
      return;
    }
    
    fetchTenants();
  }, [isSuperAdmin]);

  const fetchTenants = async () => {
    try {
      setIsLoading(true);
      const data = await getAllTenants();
      setTenants(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = () => {
    setCurrentTenant(null);
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const handleEdit = (tenant: Company) => {
    setCurrentTenant(tenant);
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleDelete = async (tenantId: string) => {
    if (!window.confirm('Sei sicuro di voler eliminare questo tenant? Questa azione è irreversibile.')) {
      return;
    }

    try {
      await deleteTenant(tenantId);
      await fetchTenants();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSave = async (tenantData: TenantCreateDTO | TenantUpdateDTO) => {
    try {
      if (isEditing && currentTenant) {
        await updateTenant(currentTenant.id, tenantData as TenantUpdateDTO);
      } else {
        await createTenant(tenantData as TenantCreateDTO);
      }
      
      setIsModalOpen(false);
      await fetchTenants();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleViewUsage = (tenantId: string) => {
    setSelectedTenantId(tenantId);
    setIsUsageModalOpen(true);
  };

  const getStatusBadge = (isActive: boolean) => {
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
        isActive 
          ? 'bg-green-100 text-green-800' 
          : 'bg-red-100 text-red-800'
      }`}>
        {isActive ? 'Attivo' : 'Inattivo'}
      </span>
    );
  };

  const getPlanBadge = (plan: string) => {
    const planColors = {
      'FREE': 'bg-gray-100 text-gray-800',
      'BASIC': 'bg-blue-100 text-blue-800',
      'PREMIUM': 'bg-purple-100 text-purple-800',
      'ENTERPRISE': 'bg-yellow-100 text-yellow-800'
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
        planColors[plan as keyof typeof planColors] || 'bg-gray-100 text-gray-800'
      }`}>
        {plan}
      </span>
    );
  };

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Accesso Negato</h1>
          <p className="text-gray-600">Solo i Super Admin possono accedere a questa sezione.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestione Tenant</h1>
          <p className="text-gray-600">Gestisci tutti i tenant del sistema</p>
        </div>
        <button
          onClick={handleCreate}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Nuovo Tenant
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Tenants Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tenants.map((tenant) => (
          <div key={tenant.id} className="bg-white rounded-lg shadow border hover:shadow-md transition-shadow">
            <div className="p-6">
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Building className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{tenant.name}</h3>
                    <p className="text-sm text-gray-500">{tenant.slug}</p>
                  </div>
                </div>
                {getStatusBadge(tenant.isActive)}
              </div>

              {/* Info */}
              <div className="space-y-2 mb-4">
                {tenant.domain && (
                  <div className="text-sm">
                    <span className="text-gray-500">Dominio:</span>
                    <span className="ml-2 text-gray-900">{tenant.domain}</span>
                  </div>
                )}
                <div className="text-sm">
                  <span className="text-gray-500">Piano:</span>
                  <span className="ml-2">{getPlanBadge('FREE')}</span>
                </div>
                <div className="text-sm">
                  <span className="text-gray-500">Creato:</span>
                  <span className="ml-2 text-gray-900">
                    {tenant.createdAt ? format(new Date(tenant.createdAt), 'dd/MM/yyyy') : 'N/A'}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-between items-center pt-4 border-t">
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(tenant)}
                    className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                    title="Modifica"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleViewUsage(tenant.id)}
                    className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded"
                    title="Visualizza utilizzo"
                  >
                    <Activity className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(tenant.id)}
                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded"
                    title="Elimina"
                  >
                    <Trash className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <Users className="h-4 w-4" />
                  <span>0</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {tenants.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nessun tenant trovato</h3>
          <p className="text-gray-500 mb-4">Inizia creando il primo tenant del sistema.</p>
          <button
            onClick={handleCreate}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Crea Primo Tenant
          </button>
        </div>
      )}

      {/* Modals */}
      {isModalOpen && (
        <TenantModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSave}
          tenant={currentTenant}
          isEditing={isEditing}
        />
      )}

      {isUsageModalOpen && selectedTenantId && (
        <TenantUsageModal
          isOpen={isUsageModalOpen}
          onClose={() => setIsUsageModalOpen(false)}
          tenantId={selectedTenantId}
        />
      )}
    </div>
  );
};

export default TenantsPage;