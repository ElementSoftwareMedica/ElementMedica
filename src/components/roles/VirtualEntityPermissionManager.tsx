import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  Loader2,
  Save,
  Users,
  X
} from 'lucide-react';
import { advancedPermissionsService } from '../../services/advancedPermissions';

interface VirtualEntityPermissionManagerProps {
  roleId: string;
  roleName: string;
  onClose?: () => void;
  onPermissionsSaved?: () => void;
  onPermissionsSaveError?: (error: string) => void;
}



const VirtualEntityPermissionManager: React.FC<VirtualEntityPermissionManagerProps> = ({
  roleId,
  roleName,
  onClose,
  onPermissionsSaved,
  onPermissionsSaveError
}) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [employeePermissions, setEmployeePermissions] = useState<string[]>([]);
  const [trainerPermissions, setTrainerPermissions] = useState<string[]>([]);

  const availablePermissions = [
    { id: 'VIEW_VIRTUAL_EMPLOYEES', label: 'Visualizza', description: 'Visualizzare i dipendenti' },
    { id: 'CREATE_VIRTUAL_EMPLOYEES', label: 'Crea', description: 'Creare nuovi dipendenti' },
    { id: 'EDIT_VIRTUAL_EMPLOYEES', label: 'Modifica', description: 'Modificare i dipendenti esistenti' },
    { id: 'DELETE_VIRTUAL_EMPLOYEES', label: 'Elimina', description: 'Eliminare i dipendenti' }
  ];

  const availableTrainerPermissions = [
    { id: 'VIEW_VIRTUAL_TRAINERS', label: 'Visualizza', description: 'Visualizzare i formatori' },
    { id: 'CREATE_VIRTUAL_TRAINERS', label: 'Crea', description: 'Creare nuovi formatori' },
    { id: 'EDIT_VIRTUAL_TRAINERS', label: 'Modifica', description: 'Modificare i formatori esistenti' },
    { id: 'DELETE_VIRTUAL_TRAINERS', label: 'Elimina', description: 'Eliminare i formatori' }
  ];

  useEffect(() => {
    loadRolePermissions();
  }, [roleId]);

  const loadRolePermissions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const permissions = await advancedPermissionsService.getRoleVirtualEntityPermissions(roleId);
      
      // Filtra i permessi per dipendenti e formatori
      const employeePerms = permissions
        .filter(p => p.virtualEntityName === 'EMPLOYEES')
        .flatMap(p => p.permissions || []);
      
      const trainerPerms = permissions
        .filter(p => p.virtualEntityName === 'TRAINERS')
        .flatMap(p => p.permissions || []);
      
      setEmployeePermissions(employeePerms);
      setTrainerPermissions(trainerPerms);
    } catch (err) {
      console.error('Errore nel caricamento permessi:', err);
      setError('Errore nel caricamento dei permessi del ruolo');
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeePermissionChange = (permissionId: string, checked: boolean) => {
    setEmployeePermissions(prev => 
      checked 
        ? [...prev, permissionId]
        : prev.filter(p => p !== permissionId)
    );
  };

  const handleTrainerPermissionChange = (permissionId: string, checked: boolean) => {
    setTrainerPermissions(prev => 
      checked 
        ? [...prev, permissionId]
        : prev.filter(p => p !== permissionId)
    );
  };

  const savePermissions = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      // Salva i permessi per i dipendenti
      if (employeePermissions.length > 0) {
        await advancedPermissionsService.assignVirtualEntityPermissions(
          roleId, 
          'EMPLOYEES', 
          employeePermissions
        );
      }

      // Salva i permessi per i formatori
      if (trainerPermissions.length > 0) {
        await advancedPermissionsService.assignVirtualEntityPermissions(
          roleId, 
          'TRAINERS', 
          trainerPermissions
        );
      }

      setSuccess('Permessi salvati con successo');
      onPermissionsSaved?.();
      
      // Ricarica i permessi per confermare il salvataggio
      setTimeout(() => {
        loadRolePermissions();
      }, 1000);

    } catch (err) {
      console.error('Errore nel salvataggio permessi:', err);
      const errorMessage = 'Errore nel salvataggio dei permessi';
      setError(errorMessage);
      onPermissionsSaveError?.(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin mr-2" />
          <span>Caricamento permessi...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Gestione Permessi Entità Virtuali - {roleName}
          </CardTitle>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {success && (
          <Alert>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* Permessi Dipendenti */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold">Permessi Dipendenti</h3>
            <Badge variant="secondary">
              {employeePermissions.length} permessi attivi
            </Badge>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availablePermissions.map(permission => (
              <div key={permission.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                <input
                  type="checkbox"
                  id={`employee-${permission.id}`}
                  checked={employeePermissions.includes(permission.id)}
                  onChange={(e) => 
                    handleEmployeePermissionChange(permission.id, e.target.checked)
                  }
                  className="mt-1"
                />
                <div className="flex-1">
                  <label 
                    htmlFor={`employee-${permission.id}`}
                    className="text-sm font-medium cursor-pointer"
                  >
                    {permission.label}
                  </label>
                  <p className="text-xs text-gray-600 mt-1">
                    {permission.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Permessi Formatori */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-green-600" />
            <h3 className="text-lg font-semibold">Permessi Formatori</h3>
            <Badge variant="secondary">
              {trainerPermissions.length} permessi attivi
            </Badge>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableTrainerPermissions.map(permission => (
              <div key={permission.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                <input
                  type="checkbox"
                  id={`trainer-${permission.id}`}
                  checked={trainerPermissions.includes(permission.id)}
                  onChange={(e) => 
                    handleTrainerPermissionChange(permission.id, e.target.checked)
                  }
                  className="mt-1"
                />
                <div className="flex-1">
                  <label 
                    htmlFor={`trainer-${permission.id}`}
                    className="text-sm font-medium cursor-pointer"
                  >
                    {permission.label}
                  </label>
                  <p className="text-xs text-gray-600 mt-1">
                    {permission.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Azioni */}
        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button
            onClick={savePermissions}
            disabled={saving}
            className="flex items-center gap-2"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? 'Salvataggio...' : 'Salva Permessi'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default VirtualEntityPermissionManager;