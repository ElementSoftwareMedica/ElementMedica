import React, { useState, useEffect } from 'react';
import { useToast } from '../../hooks/useToast';
import { 
  Shield, 
  Search, 
  Filter, 
  ChevronDown,
  Edit,
  Trash2,
  Move,
  Crown,
  Award,
  Building,
  TreePine,
  Users,
  Star,
  UserCheck,
  Plus,
  ChevronRight
} from 'lucide-react';
import { rolesService, moveRoleInHierarchy, createRole, deleteRole, updateRole, updateSystemRolePermissions } from '../../services/roles';
import { getRoleHierarchy, getCurrentUserRoleHierarchy } from '../../services/roles';
import { isAuthenticated } from '../../services/auth';
import type { RoleHierarchy as RoleHierarchyType, RoleHierarchyLevel, UserRoleHierarchy } from '../../services/roles';
import { Role } from '../../hooks/useRoles';
import HierarchyTreeView from './HierarchyTreeView';
import RoleModal from './RoleModal';
import DeleteRoleModal from './DeleteRoleModal';
import MoveRoleModal from './MoveRoleModal';

interface RoleHierarchyProps {
  onRoleAssignment?: (targetUserId: string, roleType: string) => void;
}

const RoleHierarchy: React.FC<RoleHierarchyProps> = ({ onRoleAssignment }) => {
  const { showToast } = useToast();
  const [hierarchy, setHierarchy] = useState<RoleHierarchyType>({});
  const [currentUserHierarchy, setCurrentUserHierarchy] = useState<UserRoleHierarchy | null>(null);
  const [expandedLevels, setExpandedLevels] = useState<Set<number>>(new Set([1, 2, 3, 4, 5]));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyAssignable, setShowOnlyAssignable] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'tree'>('tree');
  
  // Stati per i modali CRUD
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
  const [roleToMove, setRoleToMove] = useState<Role | null>(null);

  useEffect(() => {
    loadHierarchyData();
  }, []);

  const loadHierarchyData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!isAuthenticated()) {
        setError('Accesso non autorizzato. Effettua il login per visualizzare la gerarchia dei ruoli.');
        setHierarchy({});
        setCurrentUserHierarchy(null);
        return;
      }
      
      const [hierarchyData, userHierarchyData] = await Promise.all([
        getRoleHierarchy(),
        getCurrentUserRoleHierarchy()
      ]);
      
      // Verifica che hierarchyData sia un oggetto valido
      setHierarchy(hierarchyData && typeof hierarchyData === 'object' ? hierarchyData : {});
      setCurrentUserHierarchy(userHierarchyData || null);
    } catch (err: unknown) {
      console.error('Error loading hierarchy data:', err);
      
      // Assicurati che hierarchy rimanga un oggetto vuoto in caso di errore
      setHierarchy({});
      setCurrentUserHierarchy(null);
      
      const error = err as { response?: { status?: number }; message?: string };
      if (error?.response?.status === 401 || error?.message?.includes('Authentication required')) {
        setError('Accesso non autorizzato. Effettua il login per visualizzare la gerarchia dei ruoli.');
      } else if (error?.response?.status === 403) {
        setError('Non hai i permessi necessari per visualizzare la gerarchia dei ruoli.');
      } else if (error?.response?.status === 404) {
        setError('Endpoint della gerarchia dei ruoli non trovato. Contatta l\'amministratore di sistema.');
      } else {
        setError('Errore nel caricamento della gerarchia dei ruoli. Riprova più tardi.');
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleLevel = (level: number) => {
    const newExpanded = new Set(expandedLevels);
    if (newExpanded.has(level)) {
      newExpanded.delete(level);
    } else {
      newExpanded.add(level);
    }
    setExpandedLevels(newExpanded);
  };

  const getRolesByLevel = () => {
    const rolesByLevel: { [level: number]: Array<{ roleType: string; data: RoleHierarchyLevel }> } = {};
    
    // Verifica di sicurezza per hierarchy
    if (!hierarchy || typeof hierarchy !== 'object') {
      return rolesByLevel;
    }
    
    Object.entries(hierarchy).forEach(([roleType, roleData]) => {
      const level = roleData.level;
      if (!rolesByLevel[level]) {
        rolesByLevel[level] = [];
      }
      
      // Applica filtri
      const matchesSearch = !searchTerm || 
        roleData.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        roleData.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        roleType.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesAssignable = !showOnlyAssignable || canAssignRole(roleType);
      
      if (matchesSearch && matchesAssignable) {
        rolesByLevel[level].push({ roleType, data: roleData });
      }
    });
    
    return rolesByLevel;
  };

  const canAssignRole = (roleType: string): boolean => {
    if (!currentUserHierarchy || !currentUserHierarchy.assignableRoles) return false;
    return currentUserHierarchy.assignableRoles.includes(roleType);
  };

  const isCurrentUserRole = (roleType: string): boolean => {
    if (!currentUserHierarchy || !currentUserHierarchy.userRoles) return false;
    return currentUserHierarchy.userRoles.includes(roleType);
  };

  const getLevelColor = (level: number): string => {
    const colors = {
      0: 'bg-gradient-to-r from-purple-100 to-purple-200 border-purple-400 text-purple-900',
      1: 'bg-gradient-to-r from-red-100 to-red-200 border-red-400 text-red-900',
      2: 'bg-gradient-to-r from-orange-100 to-orange-200 border-orange-400 text-orange-900',
      3: 'bg-gradient-to-r from-yellow-100 to-yellow-200 border-yellow-400 text-yellow-900',
      4: 'bg-gradient-to-r from-blue-100 to-blue-200 border-blue-400 text-blue-900',
      5: 'bg-gradient-to-r from-green-100 to-green-200 border-green-400 text-green-900'
    };
    return colors[level as keyof typeof colors] || 'bg-gradient-to-r from-gray-100 to-gray-200 border-gray-400 text-gray-900';
  };

  const getLevelIcon = (level: number) => {
    const icons = {
      0: <Crown className="w-5 h-5" />,
      1: <Star className="w-5 h-5" />,
      2: <Award className="w-5 h-5" />,
      3: <Building className="w-5 h-5" />,
      4: <UserCheck className="w-5 h-5" />,
      5: <Users className="w-5 h-5" />
    };
    return icons[level as keyof typeof icons] || <Shield className="w-5 h-5" />;
  };

  const getLevelName = (level: number): string => {
    const names = {
      0: 'Super Amministratore',
      1: 'Amministratore',
      2: 'Amministratore Aziendale',
      3: 'Manager',
      4: 'Formatore',
      5: 'Dipendente'
    };
    return names[level as keyof typeof names] || `Livello ${level}`;
  };

  const getRoleIcon = (roleType: string) => {
    if (roleType.includes('SUPER_ADMIN')) return <Crown className="w-4 h-4 text-purple-600" />;
    if (roleType.includes('ADMIN')) return <Star className="w-4 h-4 text-red-600" />;
    if (roleType.includes('MANAGER')) return <Award className="w-4 h-4 text-orange-600" />;
    if (roleType.includes('TRAINER')) return <UserCheck className="w-4 h-4 text-blue-600" />;
    return <Users className="w-4 h-4 text-green-600" />;
  };

  // Funzioni CRUD
  const handleCreateRole = () => {
    setEditingRole(null);
    setIsRoleModalOpen(true);
  };

  const handleEditRole = (roleType: string) => {
    if (!hierarchy || !hierarchy[roleType]) {
      showToast({
        message: "Ruolo non trovato nella gerarchia.",
        type: "error"
      });
      return;
    }
    const roleData = hierarchy[roleType];
    setEditingRole({ roleType, ...roleData });
    setIsRoleModalOpen(true);
  };

  const handleDeleteRole = (roleType: string) => {
    if (!hierarchy || !hierarchy[roleType]) {
      showToast({
        message: "Ruolo non trovato nella gerarchia.",
        type: "error"
      });
      return;
    }
    const roleData = hierarchy[roleType];
    setRoleToDelete({ roleType, ...roleData });
    setIsDeleteModalOpen(true);
  };

  const handleMoveRole = (roleType: string) => {
    if (!hierarchy || !hierarchy[roleType]) {
      showToast({
        message: "Ruolo non trovato nella gerarchia.",
        type: "error"
      });
      return;
    }
    const roleData = hierarchy[roleType];
    setRoleToMove({ roleType, ...roleData });
    setIsMoveModalOpen(true);
  };

  const handleRoleSubmit = async (roleData: { name: string; description: string; permissions?: string[]; level?: number; parentRoleType?: string }) => {
    try {
      // Converte i permessi dal formato del modal al formato atteso dal backend
      let permissions: string[] = [];
      let fullPermissions: Array<{ permissionId: string; granted: boolean; scope: string; tenantIds: string[]; fieldRestrictions: string[] }> = [];
      
      console.log('🔧 Original permissions from modal:', roleData.permissions);
      
      if (roleData.permissions) {
        if (Array.isArray(roleData.permissions)) {
          // Se è già un array di oggetti con il formato corretto, usalo direttamente
           if (roleData.permissions.length > 0 && typeof roleData.permissions[0] === 'object' && 'permissionId' in roleData.permissions[0]) {
             fullPermissions = roleData.permissions as Array<{ permissionId: string; granted: boolean; scope: string; tenantIds: string[]; fieldRestrictions: string[] }>;
             permissions = fullPermissions.filter((p) => p.granted && p.permissionId && p.permissionId.trim() !== '').map((p) => p.permissionId.trim());
          } else {
            // Se è un array di stringhe, convertilo
            permissions = roleData.permissions
               .map((perm: unknown) => {
                 if (typeof perm === 'string') return perm;
                 if (perm && typeof perm === 'object' && 'permissionId' in perm) {
                   return (perm as { permissionId: string }).permissionId;
                 }
                 return '';
               })
               .filter((p: string) => p && typeof p === 'string' && p.trim() !== '')
               .map((p: string) => p.trim());
            fullPermissions = permissions.map(permissionId => ({
              permissionId,
              granted: true,
              scope: 'all',
              tenantIds: [],
              fieldRestrictions: []
            }));
          }
        } else if (typeof roleData.permissions === 'object') {
          // Se è un oggetto Record<string, boolean>, convertilo
          permissions = Object.entries(roleData.permissions)
            .filter(([permissionId, granted]) => granted && permissionId && permissionId.trim() !== '')
            .map(([permissionId]) => permissionId.trim());
          fullPermissions = Object.entries(roleData.permissions)
            .filter(([permissionId]) => permissionId && permissionId.trim() !== '')
            .map(([permissionId, granted]) => ({
              permissionId: permissionId.trim(),
              granted: Boolean(granted),
              scope: 'all',
              tenantIds: [],
              fieldRestrictions: []
            }));
        }
      }

      console.log('🔧 Processed permissions:', permissions);
      console.log('🔧 Permissions count:', permissions.length);
      console.log('🔧 Full permissions:', fullPermissions);

      if (editingRole) {
        // Aggiorna ruolo esistente
        console.log('🔧 Updating role with data:', { ...roleData, permissions });
        
        // Per i ruoli personalizzati, aggiorna sia i dati base che i permessi
        if (editingRole.roleType.startsWith('CUSTOM_')) {
          // Estrai l'ID del ruolo personalizzato
          const customRoleId = editingRole.roleType.replace('CUSTOM_', '');
          
          // Aggiorna il ruolo personalizzato con i permessi (usa array di stringhe)
          const updateData = {
            name: roleData.name,
            description: roleData.description,
            permissions: permissions // Array di stringhe per ruoli personalizzati
          };
          
          await rolesService.updateCustomRole(customRoleId, updateData);
        } else {
          // Per i ruoli di sistema, aggiorna prima i dati base
          await updateRole(editingRole.roleType, {
            name: roleData.name,
            description: roleData.description
          });
          
          // Prepara il formato corretto per l'endpoint /permissions dei ruoli di sistema
          // Il backend si aspetta un array di oggetti con permissionId, granted, scope, etc.
          const systemRolePermissions = permissions.map(permissionId => ({
            permissionId: permissionId.trim().toUpperCase(), // Normalizza il permissionId
            granted: true,
            scope: 'all',
            tenantIds: [],
            fieldRestrictions: []
          }));
          
          console.log('🔧 Formatted permissions for backend:', systemRolePermissions);
          
          // Usa updateSystemRolePermissions che chiama l'endpoint /permissions
          await updateSystemRolePermissions(editingRole.roleType, systemRolePermissions);
        }
        
        showToast({
          message: "Il ruolo è stato aggiornato con successo.",
          type: "success"
        });
      } else {
        // Crea nuovo custom role (usa array di stringhe)
        const customRoleData = {
          name: roleData.name,
          description: roleData.description,
          level: roleData.level || 1,
          parentRoleType: roleData.parentRoleType || null,
          permissions: permissions
        };
        
        console.log('🔧 Creating role with data:', customRoleData);
        await createRole(customRoleData);
        showToast({
          message: "Il nuovo ruolo è stato creato con successo.",
          type: "success"
        });
      }
      
      // Ricarica i dati
      await loadHierarchyData();
      setIsRoleModalOpen(false);
      setEditingRole(null);
    } catch (error: unknown) {
      console.error('❌ Error in handleRoleSubmit:', error);
        showToast({
          message: (error as Error).message || "Si è verificato un errore durante il salvataggio.",
        type: "error"
      });
    }
  };

  const handleRoleDelete = async (roleType: string) => {
    try {
      await deleteRole(roleType);
      showToast({
        message: "Il ruolo è stato eliminato con successo.",
        type: "success"
      });
      
      // Ricarica i dati
      await loadHierarchyData();
      setIsDeleteModalOpen(false);
      setRoleToDelete(null);
    } catch (error: unknown) {
      showToast({
          message: (error as Error).message || "Si è verificato un errore durante l'eliminazione.",
        type: "error"
      });
    }
  };

  const handleRoleMove = async (roleType: string, newLevel: number, parentRoleType?: string) => {
    try {
      // Usa il nuovo servizio per spostare il ruolo
      await moveRoleInHierarchy(roleType, newLevel, parentRoleType);
      
      showToast({
        message: `Il ruolo è stato spostato con successo al livello ${newLevel}${parentRoleType ? ` sotto ${parentRoleType}` : ''}.`,
        type: "success"
      });
      
      // Ricarica i dati
      await loadHierarchyData();
      setIsMoveModalOpen(false);
      setRoleToMove(null);
    } catch (error: unknown) {
      showToast({
          message: (error as Error).message || "Si è verificato un errore durante lo spostamento.",
        type: "error"
      });
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
          <span className="ml-4 text-lg font-medium text-gray-700">Caricamento gerarchia...</span>
        </div>
      </div>
    );
  }

  if (error) {
    const isAuthError = error.includes('Accesso non autorizzato') || error.includes('login');
    
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <div className="text-red-600 mb-4 text-4xl">⚠️</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Errore di Accesso</h3>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            {isAuthError ? (
              <button
                onClick={() => window.location.href = '/login'}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                Vai al Login
              </button>
            ) : (
              <button
                onClick={loadHierarchyData}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                Riprova
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const rolesByLevel = getRolesByLevel();
  const sortedLevels = Object.keys(rolesByLevel).map(Number).sort((a, b) => a - b);

  return (
    <div className="space-y-6">
      {/* Header con controlli - Layout compatto */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex flex-col space-y-3">
          {/* Prima riga: Tab di navigazione e controlli principali */}
          <div className="flex items-center justify-between">
            {/* Selettore modalità vista compatto */}
            <div className="flex space-x-1 bg-gray-100 p-0.5 rounded-full">
              <button
                onClick={() => setViewMode('tree')}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 flex items-center space-x-1.5 ${
                  viewMode === 'tree'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                }`}
              >
                <TreePine className="w-3.5 h-3.5" />
                <span>Albero</span>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 flex items-center space-x-1.5 ${
                  viewMode === 'list'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Lista</span>
              </button>
            </div>

            {/* Controlli di destra */}
            <div className="flex items-center space-x-3">
              {/* Statistiche compatte */}
              <div className="flex items-center space-x-4 text-xs text-gray-500">
                <span className="flex items-center">
                  <Users className="w-3 h-3 mr-1" />
                  {Object.keys(hierarchy).length} totali
                </span>
                <span className="flex items-center">
                  <UserCheck className="w-3 h-3 mr-1" />
                  {currentUserHierarchy?.assignableRoles?.length || 0} assegnabili
                </span>
              </div>

              {/* Pulsante Nuovo Ruolo compatto */}
              <button
                onClick={() => {
                  setEditingRole(null);
                  setIsRoleModalOpen(true);
                }}
                className="px-3 py-1.5 bg-green-600 text-white rounded-full hover:bg-green-700 transition-all duration-200 text-sm font-medium flex items-center space-x-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nuovo</span>
              </button>
            </div>
          </div>

          {/* Seconda riga: Controlli specifici per modalità (solo se vista lista) */}
          {viewMode === 'list' && (
            <div className="flex items-center space-x-3 pt-2 border-t border-gray-100">
              {/* Barra di ricerca compatta */}
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Cerca ruoli..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
              </div>

              {/* Filtro ruoli assegnabili compatto */}
              <button
                onClick={() => setShowOnlyAssignable(!showOnlyAssignable)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-1.5 whitespace-nowrap ${
                  showOnlyAssignable
                    ? 'bg-green-100 text-green-800 border border-green-300'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                <span>Solo Assegnabili</span>
              </button>
            </div>
          )}

          {/* Informazioni utente corrente compatte */}
          {currentUserHierarchy && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center space-x-3">
                <UserCheck className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <div className="flex items-center space-x-4 text-xs">
                  <span className="text-blue-800">
                    <strong>Ruolo:</strong> {currentUserHierarchy.highestRole}
                  </span>
                  <span className="text-blue-800">
                    <strong>Livello:</strong> {currentUserHierarchy.userLevel}
                  </span>
                  <span className="text-blue-800">
                    <strong>Assegnabili:</strong> {currentUserHierarchy.assignableRoles?.length || 0}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Contenuto principale */}
      {viewMode === 'tree' ? (
        <HierarchyTreeView
          hierarchy={hierarchy}
          currentUserHierarchy={currentUserHierarchy}
          onRoleCreate={async (parentId, roleData) => {
            try {
              // Prepara i dati per il backend come custom role
              const roleDataForBackend = {
                name: roleData.name,
                description: roleData.description,
                permissions: roleData.permissions || []
              };
              
              console.log('Creating custom role with data:', roleDataForBackend);
              await createRole(roleDataForBackend);
              
              showToast({
                message: "Il nuovo ruolo è stato creato con successo.",
                type: "success"
              });
              
              await loadHierarchyData();
            } catch (error: unknown) {
              console.error('Error creating role:', error);
              showToast({
                message: (error as Error).message || "Si è verificato un errore durante la creazione del ruolo.",
                type: "error"
              });
            }
          }}
          onRoleUpdate={async (roleId, roleData) => {
            try {
              await handleRoleSubmit(roleData);
              await loadHierarchyData();
            } catch (error) {
              console.error('Error updating role:', error);
            }
          }}
          onRoleDelete={async (roleId) => {
            try {
              await handleRoleDelete(roleId);
            } catch (error) {
              console.error('Error deleting role:', error);
            }
          }}
          onRoleMove={async (roleId, newParentId) => {
            try {
              // Trova il nuovo livello basato sul parent
              const newLevel = newParentId && hierarchy[newParentId] ? hierarchy[newParentId].level + 1 : 1;
              await handleRoleMove(roleId, newLevel);
            } catch (error) {
              console.error('Error moving role:', error);
            }
          }}
        />
      ) : (
        /* Vista lista esistente */
        <div className="space-y-3">
          {sortedLevels.map((level) => {
            const isExpanded = expandedLevels.has(level);
            const roles = rolesByLevel[level];
            
            if (!roles || roles.length === 0) return null;
            
            return (
              <div key={level} className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                <button
                  onClick={() => toggleLevel(level)}
                  className={`w-full p-3 text-left flex items-center justify-between transition-all duration-300 ${getLevelColor(level)} ${!isExpanded ? 'rounded-lg' : 'rounded-t-lg'}`}
                >
                  <div className="flex items-center">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 mr-2" />
                    ) : (
                      <ChevronRight className="h-4 w-4 mr-2" />
                    )}
                    <div className="mr-2">
                      {React.cloneElement(getLevelIcon(level), { className: "w-4 h-4" })}
                    </div>
                    <div>
                      <span className="font-medium text-sm">
                        Livello {level}: {getLevelName(level)}
                      </span>
                      <div className="text-xs opacity-80 mt-0.5">
                        {roles?.length || 0} ruol{(roles?.length || 0) !== 1 ? 'i' : 'o'} disponibil{(roles?.length || 0) !== 1 ? 'i' : 'e'}
                      </div>
                    </div>
                  </div>
                </button>
                
                {isExpanded && (
                  <div className="p-4 bg-white border-t border-gray-200">
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                      {roles.map(({ roleType, data }) => (
                        <div
                          key={roleType}
                          className={`p-3 border-2 rounded-lg transition-all duration-300 cursor-pointer hover:shadow-md transform hover:scale-101 ${
                            isCurrentUserRole(roleType)
                              ? 'border-blue-500 bg-blue-50 shadow-sm'
                              : canAssignRole(roleType)
                              ? 'border-green-400 bg-green-50 hover:border-green-500'
                              : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                          } ${selectedRole === roleType ? 'ring-2 ring-blue-300' : ''}`}
                          onClick={() => setSelectedRole(selectedRole === roleType ? null : roleType)}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center">
                              {React.cloneElement(getRoleIcon(roleType), { className: "w-3.5 h-3.5" })}
                              <h4 className="font-medium text-sm text-gray-900 ml-1.5">{data.name}</h4>
                            </div>
                            <div className="flex items-center space-x-1">
                              {isCurrentUserRole(roleType) && (
                                <span className="text-xs bg-blue-500 text-white px-1.5 py-0.5 rounded-full font-medium">
                                  TUO
                                </span>
                              )}
                              
                              {/* Pulsanti azioni CRUD */}
                              <div className="flex space-x-0.5">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditRole(roleType);
                                  }}
                                  className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                                  title="Modifica ruolo"
                                >
                                  <Edit className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMoveRole(roleType);
                                  }}
                                  className="p-1 text-amber-600 hover:bg-amber-100 rounded transition-colors"
                                  title="Sposta ruolo"
                                >
                                  <Move className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteRole(roleType);
                                  }}
                                  className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                                  title="Elimina ruolo"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                          
                          <p className="text-xs text-gray-600 mb-3 line-clamp-2">{data.description}</p>
                          
                          <div className="space-y-2">
                            <div>
                              <span className="text-xs font-medium text-gray-700 block mb-1">Ruoli assegnabili:</span>
                              <div className="text-xs text-gray-600">
                                {data.assignableRoles && data.assignableRoles.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {data.assignableRoles.slice(0, 2).map((role: string) => (
                                      <span key={role} className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">
                                        {role}
                                      </span>
                                    ))}
                                    {data.assignableRoles.length > 2 && (
                                      <span className="text-gray-500 px-1.5 py-0.5 text-xs">
                                        +{data.assignableRoles.length - 2}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-gray-400 italic text-xs">Nessuno</span>
                                )}
                              </div>
                            </div>
                            
                            <div>
                              <span className="text-xs font-medium text-gray-700 block mb-1">Permessi:</span>
                              <div className="text-xs text-gray-600">
                                {data.permissions?.length > 0 ? (
                                  <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded text-xs">
                                    {data.permissions.length} permess{data.permissions.length !== 1 ? 'i' : 'o'}
                                  </span>
                                ) : (
                                  <span className="text-gray-400 italic text-xs">Nessuno</span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {canAssignRole(roleType) && onRoleAssignment && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onRoleAssignment('', roleType);
                              }}
                              className="mt-3 w-full text-xs bg-gradient-to-r from-green-600 to-emerald-600 text-white px-3 py-1.5 rounded hover:from-green-700 hover:to-emerald-700 transition-all duration-300 font-medium shadow-sm hover:shadow-md transform hover:scale-105"
                            >
                              Assegna Ruolo
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      
      {/* Modali CRUD */}
      <RoleModal
        isOpen={isRoleModalOpen}
        onClose={() => {
          setIsRoleModalOpen(false);
          setEditingRole(null);
        }}
        onSave={handleRoleSubmit}
        role={editingRole}
        mode={editingRole ? 'edit' : 'create'}
        hierarchy={hierarchy}
      />
      
      <DeleteRoleModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setRoleToDelete(null);
        }}
        onConfirm={() => roleToDelete && handleRoleDelete(roleToDelete.roleType)}
        role={roleToDelete}
      />
      
      <MoveRoleModal
        isOpen={isMoveModalOpen}
        onClose={() => {
          setIsMoveModalOpen(false);
          setRoleToMove(null);
        }}
        onMove={(newLevel) => roleToMove && handleRoleMove(roleToMove.roleType, newLevel)}
        role={roleToMove}
        hierarchy={hierarchy}
        currentLevel={roleToMove?.level || 0}
      />
    </div>
  );
};

export default RoleHierarchy;