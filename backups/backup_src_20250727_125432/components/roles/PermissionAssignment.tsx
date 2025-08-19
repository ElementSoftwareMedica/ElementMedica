import React, { useState, useEffect } from 'react';
import { 
  User, Shield, Check, X, AlertCircle, 
  ChevronDown, ChevronUp, Filter, Search 
} from 'lucide-react';
import { getAssignableRolesAndPermissions, assignPermissionsWithHierarchy } from '../../services/roles';
import type { AssignableRolesAndPermissions } from '../../services/roles';

interface PermissionAssignmentProps {
  targetUserId: string;
  targetUserName: string;
  targetUserRole: string;
  onClose: () => void;
  onSuccess?: () => void;
}

const PermissionAssignment: React.FC<PermissionAssignmentProps> = ({
  targetUserId,
  targetUserName,
  targetUserRole,
  onClose,
  onSuccess
}) => {
  const [assignableData, setAssignableData] = useState<AssignableRolesAndPermissions | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAssignableData();
  }, [targetUserRole]);

  const loadAssignableData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await getAssignableRolesAndPermissions(targetUserRole);
      setAssignableData(data);
      
      // Espandi automaticamente le categorie che hanno permessi
      const categories = new Set<string>();
      data.assignablePermissions.forEach(permission => {
        const category = getPermissionCategory(permission);
        categories.add(category);
      });
      setExpandedCategories(categories);
      
    } catch (err) {
      console.error('Error loading assignable data:', err);
      setError('Errore nel caricamento dei permessi assegnabili');
    } finally {
      setLoading(false);
    }
  };

  const getPermissionCategory = (permission: string): string => {
    if (permission.includes('ROLE')) return 'roles';
    if (permission.includes('USER')) return 'users';
    if (permission.includes('COMPAN')) return 'companies';
    if (permission.includes('COURSE')) return 'courses';
    if (permission.includes('DOCUMENT')) return 'documents';
    if (permission.includes('REPORT')) return 'reports';
    return 'other';
  };

  const getCategoryDisplayName = (category: string): string => {
    const names = {
      roles: 'Gestione Ruoli',
      users: 'Gestione Utenti',
      companies: 'Gestione Aziende',
      courses: 'Gestione Corsi',
      documents: 'Gestione Documenti',
      reports: 'Report e Analytics',
      other: 'Altri Permessi'
    };
    return names[category as keyof typeof names] || category;
  };

  const getPermissionDisplayName = (permission: string): string => {
    const names = {
      'ROLE_MANAGEMENT': 'Gestione Ruoli Completa',
      'VIEW_ROLES': 'Visualizza Ruoli',
      'CREATE_ROLES': 'Crea Ruoli',
      'EDIT_ROLES': 'Modifica Ruoli',
      'DELETE_ROLES': 'Elimina Ruoli',
      'USER_MANAGEMENT': 'Gestione Utenti Completa',
      'VIEW_USERS': 'Visualizza Utenti',
      'CREATE_USERS': 'Crea Utenti',
      'EDIT_USERS': 'Modifica Utenti',
      'DELETE_USERS': 'Elimina Utenti',
      'VIEW_COMPANIES': 'Visualizza Aziende',
      'CREATE_COMPANIES': 'Crea Aziende',
      'EDIT_COMPANIES': 'Modifica Aziende',
      'DELETE_COMPANIES': 'Elimina Aziende',
      'VIEW_COURSES': 'Visualizza Corsi',
      'CREATE_COURSES': 'Crea Corsi',
      'EDIT_COURSES': 'Modifica Corsi',
      'DELETE_COURSES': 'Elimina Corsi',
      'VIEW_DOCUMENTS': 'Visualizza Documenti',
      'CREATE_DOCUMENTS': 'Crea Documenti',
      'EDIT_DOCUMENTS': 'Modifica Documenti',
      'DELETE_DOCUMENTS': 'Elimina Documenti',
      'VIEW_REPORTS': 'Visualizza Report',
      'CREATE_REPORTS': 'Crea Report'
    };
    return names[permission as keyof typeof names] || permission;
  };

  const togglePermission = (permission: string) => {
    const newSelected = new Set(selectedPermissions);
    if (newSelected.has(permission)) {
      newSelected.delete(permission);
    } else {
      newSelected.add(permission);
    }
    setSelectedPermissions(newSelected);
  };

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const handleAssignPermissions = async () => {
    if (selectedPermissions.size === 0) {
      setError('Seleziona almeno un permesso da assegnare');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      await assignPermissionsWithHierarchy(targetUserId, Array.from(selectedPermissions));
      
      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error('Error assigning permissions:', err);
      setError(err.message || 'Errore nell\'assegnazione dei permessi');
    } finally {
      setSaving(false);
    }
  };

  const getFilteredPermissions = () => {
    if (!assignableData) return {};

    const permissionsByCategory: { [category: string]: string[] } = {};
    
    assignableData.assignablePermissions.forEach(permission => {
      const category = getPermissionCategory(permission);
      
      // Filtro per categoria
      if (selectedCategory !== 'all' && category !== selectedCategory) return;
      
      // Filtro per ricerca
      if (searchTerm && !getPermissionDisplayName(permission).toLowerCase().includes(searchTerm.toLowerCase())) {
        return;
      }
      
      if (!permissionsByCategory[category]) {
        permissionsByCategory[category] = [];
      }
      permissionsByCategory[category].push(permission);
    });

    return permissionsByCategory;
  };

  const categories = assignableData ? 
    Array.from(new Set(assignableData.assignablePermissions.map(getPermissionCategory))) : [];

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Caricamento permessi...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error && !assignableData) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Assegnazione Permessi</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-6 w-6" />
            </button>
          </div>
          <div className="text-center py-8">
            <div className="text-red-600 mb-2">⚠️ Errore</div>
            <p className="text-gray-600">{error}</p>
            <button
              onClick={loadAssignableData}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Riprova
            </button>
          </div>
        </div>
      </div>
    );
  }

  const filteredPermissions = getFilteredPermissions();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Shield className="h-6 w-6 text-blue-600 mr-2" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Assegnazione Permessi</h2>
              <p className="text-sm text-gray-600">
                Utente: <span className="font-medium">{targetUserName}</span> ({targetUserRole})
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
              <span className="text-red-800">{error}</span>
            </div>
          </div>
        )}

        {/* Filtri */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Cerca permessi..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="sm:w-48">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Tutte le categorie</option>
                {categories.map(category => (
                  <option key={category} value={category}>
                    {getCategoryDisplayName(category)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Informazioni sui permessi assegnabili */}
        {assignableData && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-medium text-blue-900 mb-2">Permessi disponibili per l'assegnazione</h3>
            <div className="text-sm text-blue-800">
              Puoi assegnare <span className="font-medium">{assignableData.assignablePermissions.length}</span> permessi
              a questo utente in base alla gerarchia dei ruoli.
            </div>
          </div>
        )}

        {/* Lista permessi per categoria */}
        <div className="space-y-4 mb-6">
          {Object.entries(filteredPermissions).map(([category, permissions]) => (
            <div key={category} className="border border-gray-200 rounded-lg">
              <button
                onClick={() => toggleCategory(category)}
                className="w-full p-4 text-left flex items-center justify-between bg-gray-50 hover:bg-gray-100 rounded-t-lg"
              >
                <div className="flex items-center">
                  <Filter className="h-5 w-5 text-gray-600 mr-2" />
                  <span className="font-medium text-gray-900">
                    {getCategoryDisplayName(category)}
                  </span>
                  <span className="ml-2 text-sm text-gray-600">
                    ({permissions.length} permess{permissions.length !== 1 ? 'i' : 'o'})
                  </span>
                </div>
                {expandedCategories.has(category) ? (
                  <ChevronUp className="h-5 w-5 text-gray-600" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-600" />
                )}
              </button>
              
              {expandedCategories.has(category) && (
                <div className="p-4 border-t border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {permissions.map(permission => (
                      <div
                        key={permission}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedPermissions.has(permission)
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                        onClick={() => togglePermission(permission)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center">
                              <div className={`w-4 h-4 rounded border-2 mr-3 flex items-center justify-center ${
                                selectedPermissions.has(permission)
                                  ? 'border-blue-500 bg-blue-500'
                                  : 'border-gray-300'
                              }`}>
                                {selectedPermissions.has(permission) && (
                                  <Check className="h-3 w-3 text-white" />
                                )}
                              </div>
                              <span className="font-medium text-gray-900">
                                {getPermissionDisplayName(permission)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1 ml-7">
                              {permission}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {Object.keys(filteredPermissions).length === 0 && (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">
              <Filter className="h-12 w-12 mx-auto" />
            </div>
            <p className="text-gray-600">
              {searchTerm || selectedCategory !== 'all' 
                ? 'Nessun permesso trovato con i filtri applicati'
                : 'Nessun permesso disponibile per l\'assegnazione'
              }
            </p>
          </div>
        )}

        {/* Footer con azioni */}
        <div className="flex items-center justify-between pt-6 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            {selectedPermissions.size > 0 && (
              <span>
                {selectedPermissions.size} permess{selectedPermissions.size !== 1 ? 'i' : 'o'} selezionat{selectedPermissions.size !== 1 ? 'i' : 'o'}
              </span>
            )}
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              disabled={saving}
            >
              Annulla
            </button>
            <button
              onClick={handleAssignPermissions}
              disabled={selectedPermissions.size === 0 || saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Assegnazione...
                </>
              ) : (
                'Assegna Permessi'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PermissionAssignment;