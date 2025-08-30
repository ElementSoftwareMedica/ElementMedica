import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  BookOpen,
  Building,
  Building2,
  Calendar,
  Check,
  ChevronRight,
  Database,
  Edit,
  Eye,
  FileText,
  Filter,
  Globe,
  Layers,
  Lock,
  MessageSquare,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings,
  Shield,
  Trash2,
  TreePine,
  User,
  Users,
  X
} from 'lucide-react';
import { advancedPermissionsService } from '../../services/advancedPermissions';
import type { EntityDefinition, EntityPermission } from '../../services/advancedPermissions';
import type { Person } from '../../hooks/useRoles';

interface Role {
  type: string;
  name: string;
  description: string;
  userCount: number;
  isActive?: boolean;
  persons?: Person[];
  permissions?: string[];
}

interface AdvancedPermissionManagerProps {
  selectedRole: Role | null;
  onPermissionsChange: (permissions: EntityPermission[]) => void;
}

const AdvancedPermissionManager: React.FC<AdvancedPermissionManagerProps> = ({
  selectedRole,
  onPermissionsChange
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [entities, setEntities] = useState<EntityDefinition[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<EntityDefinition | null>(null);
  const [permissions, setPermissions] = useState<EntityPermission[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Definizione delle azioni CRUD ottimizzata
  const actions = useMemo(() => [
    { id: 'create', name: 'create', displayName: 'Creare', icon: Plus, color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-200' },
    { id: 'read', name: 'read', displayName: 'Visualizzare', icon: Eye, color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
    { id: 'update', name: 'update', displayName: 'Modificare', icon: Edit, color: 'text-yellow-600', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-200' },
    { id: 'delete', name: 'delete', displayName: 'Eliminare', icon: Trash2, color: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-200' }
  ], []);

  // Definizione degli scope ottimizzata
  const scopes = useMemo(() => [
    { id: 'all', name: 'all', displayName: 'Tutti i record', icon: Globe, description: 'Accesso a tutti i record del sistema', color: 'text-purple-600' },
    { id: 'tenant', name: 'tenant', displayName: 'Solo del proprio tenant', icon: Building, description: 'Accesso limitato ai record del proprio tenant', color: 'text-blue-600' },
    { id: 'own', name: 'own', displayName: 'Solo i propri record', icon: User, description: 'Accesso limitato ai propri record', color: 'text-green-600' }
  ], []);

  // Mappa delle icone per le entità ottimizzata
  const entityIcons: Record<string, React.ComponentType<{ className?: string; size?: number }>> = useMemo(() => ({
    persons: Users,
    companies: Building2,
    courses: BookOpen,
    trainings: Calendar,
    roles: Shield,
    hierarchy: TreePine,
    documents: Database,
    sites: Building,
    reparti: Layers,
    form_templates: FileText,
    form_submissions: MessageSquare,
    public_cms: Globe,
    templates: FileText
  }), []);

  // Funzione per ottenere l'icona dell'entità
  const getEntityIcon = useCallback((entityName: string) => {
    return entityIcons[entityName] || Settings;
  }, [entityIcons]);

  // Entità filtrate per la ricerca (memoizzata)
  const filteredEntities = useMemo(() => {
    return entities.filter(entity =>
      entity.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entity.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [entities, searchTerm]);

  // Statistiche permessi (memoizzate)
  const permissionStats = useMemo(() => {
    const totalEntities = entities.length;
    const entitiesWithPermissions = new Set(permissions.map(p => p.entity)).size;
    const totalPermissions = permissions.length;
    
    return {
      totalEntities,
      entitiesWithPermissions,
      totalPermissions,
      coverage: totalEntities > 0 ? Math.round((entitiesWithPermissions / totalEntities) * 100) : 0
    };
  }, [entities, permissions]);

  // Carica le entità disponibili
  useEffect(() => {
    const loadEntities = async () => {
      try {
        setLoading(true);
        setError(null);
        const entityDefinitions = await advancedPermissionsService.getEntityDefinitions();
        
        // Aggiungo le icone alle entità
        const entitiesWithIcons = entityDefinitions.map(entity => ({
          ...entity,
          icon: getEntityIcon(entity.name)
        }));
        
        setEntities(entitiesWithIcons);
        
        // Seleziona automaticamente la prima entità se non ce n'è una selezionata
        if (entitiesWithIcons.length > 0 && !selectedEntity) {
          setSelectedEntity(entitiesWithIcons[0]);
        }
      } catch (error) {
        console.error('Error loading entities:', error);
        setError('Errore nel caricamento delle entità');
      } finally {
        setLoading(false);
      }
    };

    loadEntities();
  }, [selectedEntity, getEntityIcon]);

  // Carica i permessi del ruolo selezionato
  useEffect(() => {
    const loadRolePermissions = async () => {
      if (!selectedRole?.type) {
        setPermissions([]);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const rolePermissions = await advancedPermissionsService.getRolePermissions(selectedRole.type);
        setPermissions(rolePermissions);
      } catch (error) {
        console.error('Error loading role permissions:', error);
        setError('Errore nel caricamento dei permessi del ruolo');
      } finally {
        setLoading(false);
      }
    };

    loadRolePermissions();
  }, [selectedRole]);

  // Funzioni di utilità per gestire i permessi (ottimizzate con useCallback)
  const getPermission = useCallback((entity: string, action: string): EntityPermission | undefined => {
    return permissions.find(p => p.entity === entity && p.action === action as 'create' | 'read' | 'update' | 'delete');
  }, [permissions]);

  const hasPermission = useCallback((entity: string, action: string): boolean => {
    return permissions.some(p => p.entity === entity && p.action === action as 'create' | 'read' | 'update' | 'delete');
  }, [permissions]);

  const updatePermission = useCallback(async (entity: string, action: string, scope: 'all' | 'tenant' | 'own' | 'none', fields?: string[]) => {
    if (isUpdating) return; // Previeni click multipli
    
    setIsUpdating(true);
    console.log('Permissions changed:', { entity, action, scope, fields });
    
    try {
      if (scope === 'none') {
        // Rimuovi il permesso se esiste
        const newPermissions = permissions.filter(p => !(p.entity === entity && p.action === action));
        setPermissions(newPermissions);
        onPermissionsChange(newPermissions);
        return;
      }

      const existingPermissionIndex = permissions.findIndex(p => p.entity === entity && p.action === action);
      
      if (existingPermissionIndex >= 0) {
        // Aggiorna permesso esistente
        const newPermissions = [...permissions];
        newPermissions[existingPermissionIndex] = {
          ...newPermissions[existingPermissionIndex],
          scope: scope as 'all' | 'tenant' | 'own',
          fields: fields || newPermissions[existingPermissionIndex].fields
        };
        setPermissions(newPermissions);
        onPermissionsChange(newPermissions);
      } else {
        // Crea nuovo permesso
        const newPermission: EntityPermission = {
          entity,
          action: action as 'create' | 'read' | 'update' | 'delete',
          scope: scope as 'all' | 'tenant' | 'own',
          fields: fields || []
        };
        const newPermissions = [...permissions, newPermission];
        setPermissions(newPermissions);
        onPermissionsChange(newPermissions);
      }
    } finally {
      // Rilascia il lock dopo un breve delay per permettere l'aggiornamento del DOM
      setTimeout(() => setIsUpdating(false), 100);
    }
  }, [permissions, onPermissionsChange, isUpdating]);

  const toggleField = useCallback((entity: string, action: string, fieldId: string) => {
    const permission = getPermission(entity, action);
    if (!permission) return;

    const currentFields = permission.fields || [];
    const newFields = currentFields.includes(fieldId)
      ? currentFields.filter(f => f !== fieldId)
      : [...currentFields, fieldId];

    updatePermission(entity, action, permission.scope, newFields);
  }, [getPermission, updatePermission]);

  const savePermissions = useCallback(async () => {
    if (!selectedRole?.type) return;

    try {
      setSaving(true);
      setError(null);
      await advancedPermissionsService.updateRolePermissions(selectedRole.type, permissions);
    } catch (error) {
      console.error('Error saving permissions:', error);
      setError('Errore nel salvataggio dei permessi');
    } finally {
      setSaving(false);
    }
  }, [selectedRole, permissions]);

  // Funzione per applicare permessi rapidi
  const applyQuickPermissions = useCallback((entity: string, permissionType: 'full' | 'readonly' | 'none') => {
    const newPermissions = permissions.filter(p => p.entity !== entity);
    
    if (permissionType === 'full') {
      actions.forEach(action => {
        newPermissions.push({
          entity,
          action: action.name as 'create' | 'read' | 'update' | 'delete',
          scope: 'all',
          fields: []
        });
      });
    } else if (permissionType === 'readonly') {
      newPermissions.push({
        entity,
        action: 'read',
        scope: 'all',
        fields: []
      });
    }
    
    setPermissions(newPermissions);
    onPermissionsChange(newPermissions);
  }, [permissions, actions, onPermissionsChange]);

  if (loading && entities.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Caricamento...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 m-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <X className="h-5 w-5 text-red-500 mr-2" />
            <span className="text-red-700">{error}</span>
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="text-red-600 hover:text-red-800 p-1"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  if (!selectedRole) {
    return (
      <div className="flex items-center justify-center h-full bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="text-center p-8">
          <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Seleziona un ruolo</h3>
          <p className="text-gray-600">Scegli un ruolo dalla lista per gestire i permessi avanzati</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden">
      {/* Header ottimizzato con statistiche */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Gestione Permessi - {selectedRole.name}
              </h2>
              <div className="flex items-center space-x-4 mt-1">
                <span className="text-sm text-gray-600">
                  {permissionStats.entitiesWithPermissions}/{permissionStats.totalEntities} entità configurate
                </span>
                <span className="text-sm text-gray-600">
                  {permissionStats.totalPermissions} permessi totali
                </span>
                <div className="flex items-center space-x-1">
                  <div className="w-16 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${permissionStats.coverage}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-500">{permissionStats.coverage}%</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={`px-4 py-2 rounded-lg border transition-colors ${
                showAdvanced 
                  ? 'bg-blue-50 border-blue-200 text-blue-700' 
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Filter className="w-4 h-4 mr-2 inline" />
              Vista Avanzata
            </button>
            <button
              type="button"
              onClick={savePermissions}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2 rounded-lg flex items-center space-x-2 transition-colors font-medium"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? 'Salvataggio...' : 'Salva Permessi'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Layout ottimizzato a 2 colonne */}
      <div className="flex flex-1 overflow-hidden">
        {/* Colonna sinistra: Entità e ricerca */}
        <div className="w-1/3 border-r border-gray-200 flex flex-col bg-gray-50">
          {/* Header ricerca */}
          <div className="p-4 border-b border-gray-200 bg-white">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Cerca entità..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          {/* Lista entità ottimizzata */}
          <div className="flex-1 overflow-y-auto">
            {filteredEntities.map((entity) => {
              const IconComponent = entity.icon;
              const entityPermissions = permissions.filter(p => p.entity === entity.name);
              const hasPermissions = entityPermissions.length > 0;
              
              return (
                <div
                  key={entity.id}
                  className={`border-b border-gray-200 ${
                    selectedEntity?.id === entity.id ? 'bg-blue-50 border-blue-200' : 'bg-white hover:bg-gray-50'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedEntity(entity)}
                    className="w-full text-left p-4 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${hasPermissions ? 'bg-green-100' : 'bg-gray-100'}`}>
                          {IconComponent && <IconComponent className={`w-4 h-4 ${hasPermissions ? 'text-green-600' : 'text-gray-600'}`} />}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{entity.displayName}</div>
                          <div className="text-sm text-gray-500">
                            {entityPermissions.length} permessi • {entity.fields.length} campi
                          </div>
                        </div>
                      </div>
                      <ChevronRight className={`w-4 h-4 ${selectedEntity?.id === entity.id ? 'text-blue-600' : 'text-gray-400'}`} />
                    </div>
                  </button>
                  
                  {/* Azioni rapide */}
                  <div className="px-4 pb-3 flex space-x-2">
                    <button
                      type="button"
                      onClick={() => applyQuickPermissions(entity.name, 'full')}
                      className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                    >
                      Completo
                    </button>
                    <button
                      type="button"
                      onClick={() => applyQuickPermissions(entity.name, 'readonly')}
                      className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                    >
                      Solo Lettura
                    </button>
                    <button
                      type="button"
                      onClick={() => applyQuickPermissions(entity.name, 'none')}
                      className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                    >
                      Nessuno
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Colonna destra: Configurazione permessi */}
        <div className="flex-1 flex flex-col">
          {selectedEntity ? (
            <>
              {/* Header entità selezionata */}
              <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
                <div className="flex items-center space-x-3">
                  {selectedEntity.icon && React.createElement(selectedEntity.icon, { className: "w-5 h-5 text-blue-600" })}
                  <div>
                     <h3 className="font-semibold text-gray-900">{selectedEntity.displayName}</h3>
                     <p className="text-sm text-gray-600">Configura permessi CRUD e scope per questa entità</p>
                   </div>
                </div>
              </div>
              
              {/* Configurazione permessi ottimizzata */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="grid gap-6">
                  {actions.map((action) => {
                    const permission = getPermission(selectedEntity.name, action.name);
                    const ActionIcon = action.icon;
                    
                    return (
                      <div key={action.id} className={`border rounded-xl p-4 ${action.borderColor} ${action.bgColor}`}>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-white rounded-lg shadow-sm">
                              <ActionIcon className={`w-5 h-5 ${action.color}`} />
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-900">{action.displayName}</h4>
                              <p className="text-sm text-gray-600">Configura scope e campi per questa azione</p>
                            </div>
                          </div>
                        </div>
                        
                        {/* Scope selection */}
                        <div className="grid grid-cols-2 gap-3 mb-4">
                          {scopes.map((scope) => {
                            const ScopeIcon = scope.icon;
                            const isSelected = permission?.scope === scope.name;
                            
                            return (
                              <button
                                type="button"
                                key={scope.id}
                                disabled={isUpdating}
                                onClick={() => updatePermission(selectedEntity.name, action.name, scope.name as 'all' | 'tenant' | 'own')}
                                className={`p-3 rounded-lg border-2 transition-all duration-200 text-left ${
                                  isUpdating 
                                    ? 'opacity-50 cursor-not-allowed border-gray-200 bg-gray-50'
                                    : isSelected 
                                      ? 'border-blue-500 bg-blue-50 shadow-md' 
                                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                }`}
                              >
                                <div className="flex items-center space-x-2 mb-1">
                                  <ScopeIcon className={`w-4 h-4 ${isUpdating ? 'text-gray-400' : isSelected ? 'text-blue-600' : 'text-gray-500'}`} />
                                  <span className={`font-medium ${isUpdating ? 'text-gray-400' : isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                                    {scope.displayName}
                                  </span>
                                  {isSelected && !isUpdating && <Check className="w-4 h-4 text-blue-600 ml-auto" />}
                                </div>
                                <p className="text-xs text-gray-600">{scope.description}</p>
                              </button>
                            );
                          })}
                          
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => updatePermission(selectedEntity.name, action.name, 'none')}
                            className={`p-3 rounded-lg border-2 transition-all duration-200 text-left ${
                              isUpdating 
                                ? 'opacity-50 cursor-not-allowed border-gray-200 bg-gray-50'
                                : !permission 
                                  ? 'border-red-500 bg-red-50 shadow-md' 
                                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center space-x-2 mb-1">
                              <X className={`w-4 h-4 ${isUpdating ? 'text-gray-400' : !permission ? 'text-red-600' : 'text-gray-500'}`} />
                              <span className={`font-medium ${isUpdating ? 'text-gray-400' : !permission ? 'text-red-900' : 'text-gray-900'}`}>
                                Nessun accesso
                              </span>
                              {!permission && !isUpdating && <Check className="w-4 h-4 text-red-600 ml-auto" />}
                            </div>
                            <p className="text-xs text-gray-600">Rimuovi completamente questo permesso</p>
                          </button>
                        </div>
                        
                        {/* Campi specifici (solo se avanzato e permesso attivo) */}
                        {showAdvanced && permission && (
                          <div className="border-t pt-4">
                            <h5 className="font-medium text-gray-900 mb-3 flex items-center">
                              <Lock className="w-4 h-4 mr-2" />
                              Campi Specifici
                            </h5>
                            <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                              {selectedEntity.fields.map((field) => {
                                const isSelected = permission.fields?.includes(field.id) ?? true;
                                
                                return (
                                  <button
                                    type="button"
                                    key={field.id}
                                    onClick={() => toggleField(selectedEntity.name, action.name, field.id)}
                                    className={`p-2 rounded border text-left transition-colors ${
                                      isSelected 
                                        ? 'border-green-500 bg-green-50 text-green-900' 
                                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center space-x-2">
                                        {field.sensitive && <Lock className="w-3 h-3 text-orange-500" />}
                                        <span className="text-sm font-medium">{field.displayName}</span>
                                      </div>
                                      {isSelected ? (
                                        <Check className="w-3 h-3 text-green-600" />
                                      ) : (
                                        <X className="w-3 h-3 text-gray-400" />
                                      )}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">
                                      {field.type} {field.sensitive && '• Sensibile'}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center p-8">
                <Database className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Seleziona un'entità</h3>
                <p className="text-gray-600">Scegli un'entità dalla lista per configurare i permessi</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdvancedPermissionManager;