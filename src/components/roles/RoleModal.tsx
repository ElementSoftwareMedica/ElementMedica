import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Modal } from '../../design-system/molecules/Modal';
import { Button } from '../../design-system/atoms/Button';
import { Label } from '../../design-system/atoms/Label';
import { FormField } from '../../design-system/molecules/FormField';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  Loader2, 
  AlertCircle, 
  Shield, 
  Database,
  Building2,
  BookOpen,
  TreePine,
  Building,
  Layers,
  MessageSquare,
  Globe,
  Users,
  Calendar,
  FileText,
  Settings,
  ChevronRight
} from 'lucide-react';
import { rolesService } from '../../services/roles';
import { advancedPermissionsService, EntityDefinition } from '../../services/advancedPermissions';
import { Role } from '../../hooks/useRoles';

interface Permission {
  key: string;
  label: string;
  description: string;
}

interface PermissionGroup {
  label: string;
  description: string;
  permissions: Permission[];
}

interface EntityGroup {
  entity: EntityDefinition;
  permissions: Permission[];
}

interface HierarchyLevel {
  level: number;
  name: string;
  description: string;
  assignableRoles: string[];
  permissions: string[];
}

interface RoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (roleData: Role) => Promise<void>;
  role?: Role;
  mode: 'create' | 'edit';
  hierarchy?: Record<string, HierarchyLevel>; // Aggiunto per la selezione del genitore
}

const RoleModal: React.FC<RoleModalProps> = ({
  isOpen,
  onClose,
  onSave,
  role,
  mode,
  hierarchy = {}
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    level: '1',
    parentRoleType: '',
    permissions: {} as Record<string, boolean>
  });
  const [availablePermissions, setAvailablePermissions] = useState<Record<string, PermissionGroup>>({});
  const [entities, setEntities] = useState<EntityDefinition[]>([]);
  const [entityGroups, setEntityGroups] = useState<EntityGroup[]>([]);
  const [selectedPermissionGroup, setSelectedPermissionGroup] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mappa delle icone per le entità
  const entityIcons: Record<string, React.ComponentType<any>> = useMemo(() => ({
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
    return entityIcons[entityName] || Database;
  }, [entityIcons]);

  // Carica i permessi disponibili
  useEffect(() => {
    if (isOpen) {
      loadAvailablePermissions();
    }
  }, [isOpen]);

  // Inizializza il form quando si apre il modal
  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && role) {
        setFormData({
          name: role.name || '',
          description: role.description || '',
          level: (role.level || 1).toString(),
          parentRoleType: '',
          permissions: {} // Inizializza vuoto, verrà caricato separatamente
        });
        // Carica i permessi del ruolo dal backend
        loadRolePermissions(role.type);
      } else {
        setFormData({
          name: '',
          description: '',
          level: '1',
          parentRoleType: '',
          permissions: {}
        });
      }
      setError(null);
    }
  }, [isOpen, mode, role]);

  const loadRolePermissions = async (roleType: string) => {
    try {
      setLoadingPermissions(true);
      console.log('🔍 [RoleModal] Loading permissions for role:', roleType);
      
      const rolePermissions = await rolesService.getRolePermissions(roleType);
      console.log('🔍 [RoleModal] Received permissions from API:', rolePermissions);
      console.log('🔍 [RoleModal] Permissions type:', typeof rolePermissions);
      console.log('🔍 [RoleModal] Is array:', Array.isArray(rolePermissions));
      console.log('🔍 [RoleModal] Length:', rolePermissions?.length);
      
      // Converte l'array di permessi in un oggetto Record<string, boolean>
      const permissionsMap: Record<string, boolean> = {};
      if (Array.isArray(rolePermissions)) {
        rolePermissions.forEach((permission: string) => {
          console.log('🔍 [RoleModal] Processing permission:', permission);
          // Il backend restituisce i permessi già normalizzati (maiuscoli)
          // Li usiamo direttamente come chiavi
          permissionsMap[permission] = true;
        });
      } else {
        console.warn('🔍 [RoleModal] Permissions is not an array:', rolePermissions);
      }
      
      console.log('🔍 [RoleModal] Final permissions map:', permissionsMap);
      console.log('🔍 [RoleModal] Permissions map keys:', Object.keys(permissionsMap));
      
      // Aggiorna il form con i permessi caricati
      setFormData(prev => {
        const newFormData = {
          ...prev,
          permissions: permissionsMap
        };
        console.log('🔍 [RoleModal] Updated form data:', newFormData);
        return newFormData;
      });
      
      console.log('🔍 [RoleModal] Form data updated with permissions successfully');
    } catch (error) {
      console.error('❌ [RoleModal] Error loading role permissions:', error);
      setError('Errore nel caricamento dei permessi del ruolo');
    } finally {
      setLoadingPermissions(false);
    }
  };

  const loadAvailablePermissions = async () => {
    try {
      setLoadingPermissions(true);
      
      // Carica sia i permessi che le entità
      const [permissions, entitiesData] = await Promise.all([
        rolesService.getPermissions(),
        advancedPermissionsService.getEntityDefinitions()
      ]);
      
      console.log('🔍 [RoleModal] Entità caricate:', entitiesData.length);
      console.log('🔍 [RoleModal] Lista entità:', entitiesData.map(e => e.name));
      
      // Verifica se le entità critiche sono presenti
      const criticalEntities = ['form_templates', 'form_submissions', 'public_cms'];
      const foundCriticalEntities = criticalEntities.filter(entity => 
        entitiesData.some(e => e.name === entity)
      );
      console.log('🔍 [RoleModal] Entità critiche trovate:', foundCriticalEntities);
      
      // Raggruppa i permessi per categoria (mantenendo la logica esistente)
      const groupedPermissions: Record<string, PermissionGroup> = {};
      permissions.forEach(permission => {
        const category = permission.category || 'general';
        if (!groupedPermissions[category]) {
          // Gestione sicura per evitare errori toUpperCase su undefined
          const categoryLabel = category && typeof category === 'string' 
            ? category.charAt(0).toUpperCase() + category.slice(1)
            : 'General';
          
          groupedPermissions[category] = {
            label: categoryLabel,
            description: `Permessi per ${category}`,
            permissions: []
          };
        }
        groupedPermissions[category].permissions.push({
          key: permission.id,
          label: permission.name,
          description: permission.description || ''
        });
      });
      
      // Crea gruppi di entità con permessi CRUD
      const entityGroupsData: EntityGroup[] = entitiesData.map(entity => {
        // Normalizza il nome dell'entità come fa il backend
        const normalizedEntityName = entity.name.trim().toUpperCase();
        
        const crudPermissions: Permission[] = [
          {
            key: `CREATE_${normalizedEntityName}`,
            label: `Crea ${entity.displayName}`,
            description: `Permesso per creare nuovi record di ${entity.displayName}`
          },
          {
            key: `VIEW_${normalizedEntityName}`,
            label: `Visualizza ${entity.displayName}`,
            description: `Permesso per visualizzare i record di ${entity.displayName}`
          },
          {
            key: `EDIT_${normalizedEntityName}`,
            label: `Modifica ${entity.displayName}`,
            description: `Permesso per modificare i record di ${entity.displayName}`
          },
          {
            key: `DELETE_${normalizedEntityName}`,
            label: `Elimina ${entity.displayName}`,
            description: `Permesso per eliminare i record di ${entity.displayName}`
          }
        ];
        
        return {
          entity,
          permissions: crudPermissions
        };
      });
      
      console.log('🔍 [RoleModal] Gruppi entità creati:', entityGroupsData.length);
      console.log('🔍 [RoleModal] Entità nei gruppi:', entityGroupsData.map(g => g.entity.name));
      
      setAvailablePermissions(groupedPermissions);
      setEntities(entitiesData);
      setEntityGroups(entityGroupsData);
    } catch (error) {
      console.error('Error loading permissions:', error);
      setError('Errore nel caricamento dei permessi');
    } finally {
      setLoadingPermissions(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePermissionChange = (permissionKey: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [permissionKey]: checked
      }
    }));
  };

  const handleSelectAllPermissions = () => {
    const allPermissions: Record<string, boolean> = {};
    
    // Seleziona tutti i permessi delle categorie esistenti
    Object.values(availablePermissions).forEach(group => {
      group.permissions.forEach(permission => {
        allPermissions[permission.key] = true;
      });
    });
    
    // Seleziona tutti i permessi delle entità
    entityGroups.forEach(entityGroup => {
      entityGroup.permissions.forEach(permission => {
        allPermissions[permission.key] = true;
      });
    });
    
    setFormData(prev => ({
      ...prev,
      permissions: allPermissions
    }));
  };

  const handleSelectNoPermissions = () => {
    setFormData(prev => ({
      ...prev,
      permissions: {}
    }));
  };

  const handleSelectGroupPermissions = (groupKey: string, selectAll: boolean) => {
    const newPermissions = { ...formData.permissions };
    
    if (groupKey.startsWith('entity_')) {
      // Gestione per gruppi di entità
      const entityIndex = parseInt(groupKey.replace('entity_', ''));
      const entityGroup = entityGroups[entityIndex];
      if (entityGroup) {
        entityGroup.permissions.forEach(permission => {
          if (selectAll) {
            newPermissions[permission.key] = true;
          } else {
            delete newPermissions[permission.key];
          }
        });
      }
    } else {
      // Gestione per gruppi di permessi esistenti
      const group = availablePermissions[groupKey];
      if (group) {
        group.permissions.forEach(permission => {
          if (selectAll) {
            newPermissions[permission.key] = true;
          } else {
            delete newPermissions[permission.key];
          }
        });
      }
    }
    
    setFormData(prev => ({
      ...prev,
      permissions: newPermissions
    }));
  };

  const getSelectedPermissionsCount = (groupPermissions: Permission[]) => {
    return groupPermissions.filter(perm => formData.permissions[perm.key]).length;
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      // Validazione
      if (!formData.name.trim()) {
        setError('Il nome del ruolo è obbligatorio');
        return;
      }

      if (!formData.description.trim()) {
        setError('La descrizione del ruolo è obbligatoria');
        return;
      }

      // Prepara i dati per l'API
      // Il backend si aspetta sempre un array di oggetti con { permissionId, granted, scope, ... }
      const permissions = Object.entries(formData.permissions)
        .map(([permissionId, granted]) => ({
          permissionId: permissionId.trim().toUpperCase(),
          granted: Boolean(granted),
          scope: 'all',
          tenantIds: [],
          fieldRestrictions: []
        }));

      console.log('🔧 RoleModal - Sending permissions:', permissions);

      const roleData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        type: role?.type || 'CUSTOM',
        permissions: permissions,
        ...(mode === 'create' && {
          level: parseInt(formData.level),
          parentRoleType: formData.parentRoleType || null
        })
      } as unknown as Role;

      await onSave(roleData);
      onClose();
    } catch (error: any) {
      console.error('Error saving role:', error);
      setError(error.message || 'Errore nel salvataggio del ruolo');
    } finally {
      setLoading(false);
    }
  };

  const totalSelectedPermissions = Object.values(formData.permissions).filter(Boolean).length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'create' ? 'Crea Nuovo Ruolo' : 'Modifica Ruolo'}
      size="lg"
    >
      <div className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Informazioni base */}
        <div className="space-y-4">
          <FormField
            label="Nome Ruolo *"
            name="name"
            type="text"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="Es. Manager Vendite"
            disabled={loading}
            required
          />

          <FormField
            label="Descrizione *"
            name="description"
            type="textarea"
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            placeholder="Descrizione del ruolo e delle sue responsabilità"
            rows={3}
            disabled={loading}
            required
          />

          {mode === 'create' && (
            <>
              <div className="space-y-3">
                <Label htmlFor="level" className="text-sm font-medium text-gray-700">
                  Livello Gerarchico *
                </Label>
                <div className="grid grid-cols-6 gap-2">
                  {[1, 2, 3, 4, 5, 6].map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => handleInputChange('level', level.toString())}
                      className={`
                        relative p-3 rounded-lg border-2 transition-all duration-200 text-center
                        ${parseInt(formData.level) === level
                          ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-md'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                        }
                      `}
                      disabled={loading}
                    >
                      <div className="text-lg font-bold">{level}</div>
                      <div className="text-xs mt-1">
                        {level === 1 ? 'CEO' : 
                         level === 2 ? 'Dir.' : 
                         level === 3 ? 'Mgr' : 
                         level === 4 ? 'Lead' : 
                         level === 5 ? 'Sr.' : 'Jr.'}
                      </div>
                      {parseInt(formData.level) === level && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full"></div>
                      )}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500">
                  Seleziona il livello gerarchico (1 = più alto, 6 = più basso)
                </p>
              </div>

              <div className="space-y-3">
                <Label htmlFor="parentRoleType" className="text-sm font-medium text-gray-700">
                  Ruolo Genitore
                </Label>
                
                {parseInt(formData.level) > 1 ? (
                  <div className="space-y-3 max-h-48 overflow-y-auto border rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <input
                        type="radio"
                        name="parentRole"
                        value=""
                        checked={!formData.parentRoleType}
                        onChange={() => handleInputChange('parentRoleType', '')}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                        disabled={loading}
                      />
                      <Label className="text-sm text-gray-600 cursor-pointer">
                        Nessun genitore specifico
                      </Label>
                    </div>
                    
                    {Object.entries(hierarchy)
                      .filter(([, roleData]) => roleData?.level === parseInt(formData.level) - 1)
                      .map(([roleType, roleData]) => (
                        <div key={roleType} className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                          <input
                            type="radio"
                            name="parentRole"
                            value={roleType}
                            checked={formData.parentRoleType === roleType}
                            onChange={() => handleInputChange('parentRoleType', roleType)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 mt-1"
                            disabled={loading}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <Label className="font-medium text-gray-900 cursor-pointer">
                                {roleData?.name || roleType}
                              </Label>
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                Livello {roleData?.level}
                              </span>
                            </div>
                            {roleData?.description && (
                              <p className="text-sm text-gray-500 mt-1">
                                {roleData.description}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="p-4 bg-gray-50 rounded-lg text-center">
                    <p className="text-sm text-gray-600">
                      I ruoli di livello 1 non possono avere un genitore
                    </p>
                  </div>
                )}
                
                <p className="text-xs text-gray-500">
                  {parseInt(formData.level) > 1 
                    ? `Seleziona un ruolo genitore dal livello ${parseInt(formData.level) - 1} (opzionale)`
                    : 'I ruoli di livello 1 sono ruoli radice'
                  }
                </p>
              </div>
            </>
          )}
        </div>

        {/* Permessi - Layout a colonne */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-blue-600" />
              <Label className="text-base font-medium">Permessi</Label>
            </div>
            <div className="flex items-center space-x-2">
              {totalSelectedPermissions > 0 && (
                <span className="text-sm text-gray-600">
                  {totalSelectedPermissions} permessi selezionati
                </span>
              )}
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={handleSelectAllPermissions}
                  className="px-4 py-2 bg-blue-500 text-white rounded-full text-xs font-medium hover:bg-blue-600 transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  Seleziona Tutti
                </button>
                <button
                  type="button"
                  onClick={handleSelectNoPermissions}
                  className="px-4 py-2 bg-gray-500 text-white rounded-full text-xs font-medium hover:bg-gray-600 transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  Deseleziona Tutti
                </button>
              </div>
            </div>
          </div>

          {loadingPermissions ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Caricamento permessi...</span>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200">
                <div className="grid grid-cols-2 h-12">
                  {/* Header Entità */}
                  <div className="flex items-center px-4 border-r border-gray-200">
                    <div className="flex items-center space-x-2">
                      <Database className="w-4 h-4 text-green-600" />
                      <div>
                        <h4 className="font-medium text-gray-900 text-sm">Entità del Sistema</h4>
                        <p className="text-xs text-gray-600">{entityGroups.length + Object.keys(availablePermissions).length} categorie</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Header Permessi */}
                  <div className="flex items-center px-4">
                    <div className="flex items-center space-x-2">
                      <Settings className="w-4 h-4 text-orange-600" />
                      <div>
                        <h4 className="font-medium text-gray-900 text-sm">Permessi</h4>
                        <p className="text-xs text-gray-600">Seleziona permessi specifici</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contenuto principale */}
              <div className="grid grid-cols-2 h-80">
                {/* Colonna 1: Lista Entità */}
                <div className="border-r border-gray-200 overflow-hidden">
                  <div className="overflow-y-auto h-full">
                    {/* Entità del sistema */}
                    {entityGroups.map((entityGroup, index) => {
                      const groupKey = `entity_${index}`;
                      const selectedCount = getSelectedPermissionsCount(entityGroup.permissions);
                      const hasPermissions = selectedCount > 0;
                      const EntityIcon = getEntityIcon(entityGroup.entity.name);
                      
                      return (
                        <button
                          key={groupKey}
                          type="button"
                          onClick={() => setSelectedPermissionGroup(groupKey)}
                          className={`w-full text-left p-3 border-b border-gray-100 transition-colors ${
                            selectedPermissionGroup === groupKey 
                              ? 'bg-blue-50 border-blue-200' 
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <div className={`p-2 rounded-lg ${hasPermissions ? 'bg-green-100' : 'bg-gray-100'}`}>
                              <EntityIcon className={`w-4 h-4 ${hasPermissions ? 'text-green-600' : 'text-gray-600'}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-gray-900 text-sm truncate">{entityGroup.entity.displayName}</div>
                              <div className="text-xs text-gray-500">
                                {selectedCount}/{entityGroup.permissions.length} selezionati
                              </div>
                            </div>
                            {selectedPermissionGroup === groupKey && (
                              <ChevronRight className="w-4 h-4 text-blue-600" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                    
                    {/* Categorie di permessi esistenti */}
                    {Object.entries(availablePermissions).map(([groupKey, group]) => {
                      const selectedCount = getSelectedPermissionsCount(group.permissions);
                      const hasPermissions = selectedCount > 0;
                      
                      return (
                        <button
                          key={groupKey}
                          type="button"
                          onClick={() => setSelectedPermissionGroup(groupKey)}
                          className={`w-full text-left p-3 border-b border-gray-100 transition-colors ${
                            selectedPermissionGroup === groupKey 
                              ? 'bg-blue-50 border-blue-200' 
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <div className={`p-2 rounded-lg ${hasPermissions ? 'bg-green-100' : 'bg-gray-100'}`}>
                              <Shield className={`w-4 h-4 ${hasPermissions ? 'text-green-600' : 'text-gray-600'}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-gray-900 text-sm truncate">{group.label}</div>
                              <div className="text-xs text-gray-500">
                                {selectedCount}/{group.permissions.length} selezionati
                              </div>
                            </div>
                            {selectedPermissionGroup === groupKey && (
                              <ChevronRight className="w-4 h-4 text-blue-600" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Colonna 2: Permessi del gruppo selezionato */}
                <div className="overflow-hidden">
                  {selectedPermissionGroup ? (
                    <div className="h-full overflow-y-auto">
                      {selectedPermissionGroup.startsWith('entity_') ? (
                        // Gestione entità
                        (() => {
                          const entityIndex = parseInt(selectedPermissionGroup.replace('entity_', ''));
                          const entityGroup = entityGroups[entityIndex];
                          if (!entityGroup) return null;
                          
                          return (
                            <>
                              <div className="p-3 border-b border-gray-200 bg-gray-50">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <h5 className="font-medium text-gray-900 text-sm">
                                      {entityGroup.entity.displayName}
                                    </h5>
                                    <p className="text-xs text-gray-600">
                                      Permessi CRUD per {entityGroup.entity.displayName}
                                    </p>
                                  </div>
                                  <div className="flex space-x-2">
                                    <button
                                      type="button"
                                      onClick={() => handleSelectGroupPermissions(selectedPermissionGroup, true)}
                                      className="px-3 py-1.5 bg-blue-500 text-white rounded-full text-xs font-medium hover:bg-blue-600 transition-all duration-200 shadow-sm hover:shadow-md"
                                    >
                                      Tutti
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleSelectGroupPermissions(selectedPermissionGroup, false)}
                                      className="px-3 py-1.5 bg-gray-500 text-white rounded-full text-xs font-medium hover:bg-gray-600 transition-all duration-200 shadow-sm hover:shadow-md"
                                    >
                                      Nessuno
                                    </button>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="p-3 space-y-1">
                                {entityGroup.permissions.map((permission) => {
                                  const isChecked = formData.permissions[permission.key] || false;
                                  
                                  return (
                                    <label 
                                      key={permission.key} 
                                      className={`flex items-start space-x-3 p-3 rounded-lg cursor-pointer transition-all duration-200 border ${
                                        isChecked 
                                          ? 'bg-blue-50 border-blue-200 hover:bg-blue-100' 
                                          : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        name={`permission-${permission.key}`}
                                        checked={isChecked}
                                        onChange={(e) => {
                                          const checked = e.target.checked;
                                          handlePermissionChange(permission.key, checked);
                                        }}
                                        className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                      />
                                      <div className="flex-1 min-w-0">
                                        <div className={`text-sm font-medium ${isChecked ? 'text-blue-900' : 'text-gray-900'}`}>
                                          {permission.label}
                                        </div>
                                        <p className={`text-xs mt-1 ${isChecked ? 'text-blue-700' : 'text-gray-500'}`}>
                                          {permission.description}
                                        </p>
                                      </div>
                                      {isChecked && (
                                        <div className="flex-shrink-0">
                                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                        </div>
                                      )}
                                    </label>
                                  );
                                })}
                              </div>
                            </>
                          );
                        })()
                      ) : availablePermissions[selectedPermissionGroup] ? (
                        // Gestione categorie di permessi esistenti
                        <>
                          <div className="p-3 border-b border-gray-200 bg-gray-50">
                            <div className="flex items-center justify-between">
                              <div>
                                <h5 className="font-medium text-gray-900 text-sm">
                                  {availablePermissions[selectedPermissionGroup].label}
                                </h5>
                                <p className="text-xs text-gray-600">
                                  {availablePermissions[selectedPermissionGroup].description}
                                </p>
                              </div>
                              <div className="flex space-x-2">
                                <button
                                  type="button"
                                  onClick={() => handleSelectGroupPermissions(selectedPermissionGroup, true)}
                                  className="px-3 py-1.5 bg-blue-500 text-white rounded-full text-xs font-medium hover:bg-blue-600 transition-all duration-200 shadow-sm hover:shadow-md"
                                >
                                  Tutti
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSelectGroupPermissions(selectedPermissionGroup, false)}
                                  className="px-3 py-1.5 bg-gray-500 text-white rounded-full text-xs font-medium hover:bg-gray-600 transition-all duration-200 shadow-sm hover:shadow-md"
                                >
                                  Nessuno
                                </button>
                              </div>
                            </div>
                          </div>
                          
                          <div className="p-3 space-y-1">
                            {availablePermissions[selectedPermissionGroup].permissions.map((permission) => {
                              const isChecked = formData.permissions[permission.key] || false;
                              
                              return (
                                <label 
                                  key={permission.key} 
                                  className={`flex items-start space-x-3 p-3 rounded-lg cursor-pointer transition-all duration-200 border ${
                                    isChecked 
                                      ? 'bg-blue-50 border-blue-200 hover:bg-blue-100' 
                                      : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    name={`permission-${permission.key}`}
                                    checked={isChecked}
                                    onChange={(e) => {
                                      const checked = e.target.checked;
                                      handlePermissionChange(permission.key, checked);
                                    }}
                                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className={`text-sm font-medium ${isChecked ? 'text-blue-900' : 'text-gray-900'}`}>
                                      {permission.label}
                                    </div>
                                    <p className={`text-xs mt-1 ${isChecked ? 'text-blue-700' : 'text-gray-500'}`}>
                                      {permission.description}
                                    </p>
                                  </div>
                                  {isChecked && (
                                    <div className="flex-shrink-0">
                                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                    </div>
                                  )}
                                </label>
                              );
                            })}
                          </div>
                        </>
                      ) : null}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      <div className="text-center">
                        <Shield className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm">Seleziona una categoria di permessi</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {!loadingPermissions && Object.keys(availablePermissions).length === 0 && entityGroups.length === 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Nessun permesso disponibile. Contatta l'amministratore di sistema.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>

      <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
        <Button variant="outline" onClick={onClose} disabled={loading}>
          Annulla
        </Button>
        <Button onClick={handleSubmit} disabled={loading || loadingPermissions}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {mode === 'create' ? 'Crea Ruolo' : 'Salva Modifiche'}
        </Button>
      </div>
    </Modal>
  );
};

export default RoleModal;