import React, { useState, useEffect } from 'react';
import { Modal } from '../../design-system/molecules/Modal';
import { Button } from '../../design-system/atoms/Button';
import { Input } from '../../design-system/atoms/Input';
import { Label } from '../../design-system/atoms/Label';
import { FormField } from '../../design-system/molecules/FormField';
import { Alert, AlertDescription } from '../ui/alert';
import { Loader2, AlertCircle, Shield, Users } from 'lucide-react';
import { rolesService } from '../../services/roles';

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

interface RoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (roleData: any) => Promise<void>;
  role?: any;
  mode: 'create' | 'edit';
  hierarchy?: Record<string, any>; // Aggiunto per la selezione del genitore
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
  const [loading, setLoading] = useState(false);
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          parentRoleType: role.parentRoleType || '',
          permissions: {} // Inizializza vuoto, verrà caricato separatamente
        });
        // Carica i permessi del ruolo dal backend
        loadRolePermissions(role.roleType);
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
      console.log('🔍 Loading permissions for role:', roleType);
      const rolePermissions = await rolesService.getRolePermissions(roleType);
      console.log('🔍 Received permissions:', rolePermissions);
      
      // Converte l'array di permessi in un oggetto Record<string, boolean>
      const permissionsMap: Record<string, boolean> = {};
      if (Array.isArray(rolePermissions)) {
        rolePermissions.forEach((permission: string) => {
          permissionsMap[permission] = true;
        });
      }
      
      console.log('🔍 Permissions map:', permissionsMap);
      
      // Aggiorna il form con i permessi caricati
      setFormData(prev => ({
        ...prev,
        permissions: permissionsMap
      }));
      
      console.log('🔍 Form data updated with permissions');
    } catch (error) {
      console.error('Error loading role permissions:', error);
      setError('Errore nel caricamento dei permessi del ruolo');
    } finally {
      setLoadingPermissions(false);
    }
  };

  const loadAvailablePermissions = async () => {
    try {
      setLoadingPermissions(true);
      const permissions = await rolesService.getPermissions();
      // Raggruppa i permessi per categoria
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
      setAvailablePermissions(groupedPermissions);
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

  const handleSelectAllGroup = (groupPermissions: Permission[], checked: boolean) => {
    const updates: Record<string, boolean> = {};
    groupPermissions.forEach(perm => {
      updates[perm.key] = checked;
    });
    
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        ...updates
      }
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
      const roleData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        permissions: Object.entries(formData.permissions)
          .filter(([_, granted]) => granted)
          .map(([permissionId]) => ({
            permissionId,
            granted: true,
            scope: 'global'
          })),
        ...(mode === 'create' && {
          level: parseInt(formData.level),
          parentRoleType: formData.parentRoleType || null
        })
      };

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
                      .filter(([_, roleData]) => roleData?.level === parseInt(formData.level) - 1)
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

        {/* Permessi */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-blue-600" />
              <Label className="text-base font-medium">Permessi</Label>
            </div>
            {totalSelectedPermissions > 0 && (
              <span className="text-sm text-gray-600">
                {totalSelectedPermissions} permessi selezionati
              </span>
            )}
          </div>

          {loadingPermissions ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Caricamento permessi...</span>
            </div>
          ) : (
            <div className="space-y-6 max-h-96 overflow-y-auto border rounded-lg p-4">
              {Object.entries(availablePermissions).map(([groupKey, group]) => {
                const selectedCount = getSelectedPermissionsCount(group.permissions);
                const allSelected = selectedCount === group.permissions.length;
                const someSelected = selectedCount > 0 && selectedCount < group.permissions.length;

                return (
                  <div key={groupKey} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <FormField
                          name={`group-${groupKey}`}
                          label=""
                          type="checkbox"
                          value={allSelected}
                          onChange={(e) => {
                            const checked = (e.target as HTMLInputElement).checked;
                            handleSelectAllGroup(group.permissions, checked);
                          }}
                        />
                        <div>
                          <Label className="font-medium">{group.label}</Label>
                          <p className="text-sm text-gray-500">
                            {group.description}
                          </p>
                        </div>
                      </div>
                      {selectedCount > 0 && (
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {selectedCount}/{group.permissions.length}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 ml-6">
                      {group.permissions.map((permission) => {
                        const isChecked = formData.permissions[permission.key] || false;
                        console.log(`🔍 Permission ${permission.key}: checked=${isChecked}`);
                        
                        return (
                          <div key={permission.key} className="flex items-start space-x-2">
                            <FormField
                              name={`permission-${permission.key}`}
                              label=""
                              type="checkbox"
                              value={isChecked}
                              onChange={(e) => {
                                const checked = (e.target as HTMLInputElement).checked;
                                handlePermissionChange(permission.key, checked);
                              }}
                            />
                            <div className="flex-1 min-w-0">
                              <Label className="text-sm font-medium cursor-pointer">
                                {permission.label}
                              </Label>
                              <p className="text-xs text-gray-500">
                                {permission.description}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!loadingPermissions && Object.keys(availablePermissions).length === 0 && (
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