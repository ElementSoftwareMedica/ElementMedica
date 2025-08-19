import React, { useState, useEffect } from 'react';
import { 
  Award,
  Building,
  ChevronDown,
  ChevronRight,
  Crown,
  Edit3,
  Move,
  Plus,
  Save,
  Settings,
  Shield,
  Star,
  Trash2,
  UserCheck,
  Users,
  X
} from 'lucide-react';
import { getRoleHierarchy } from '../../services/roles';
import { isAuthenticated } from '../../services/auth';
import type { RoleHierarchy as RoleHierarchyType, UserRoleHierarchy } from '../../services/roles';
import { Role } from '../../hooks/useRoles';

interface TreeNode {
  id: string;
  name: string;
  description: string;
  level: number;
  roleType: string;
  children: TreeNode[];
  permissions: string[];
  assignableRoles: string[];
  parentId?: string;
}

interface HierarchyTreeViewProps {
  hierarchy?: RoleHierarchyType;
  currentUserHierarchy: UserRoleHierarchy | null;
  onRoleCreate?: (parentId: string | null, roleData: Role) => Promise<void>;
  onRoleUpdate?: (roleId: string, roleData: Role) => Promise<void>;
  onRoleDelete?: (roleId: string) => Promise<void>;
  onRoleMove?: (roleId: string, newParentId: string | null) => Promise<void>;
}

const HierarchyTreeView: React.FC<HierarchyTreeViewProps> = ({
  hierarchy: externalHierarchy,
  currentUserHierarchy,
  onRoleCreate,
  onRoleUpdate,
  onRoleDelete,
  onRoleMove
}) => {
  const [hierarchy, setHierarchy] = useState<RoleHierarchyType>({});
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [editingNode, setEditingNode] = useState<string | null>(null);
  const [creatingChild, setCreatingChild] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draggedNode, setDraggedNode] = useState<string | null>(null);

  // Form state per editing/creating
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    roleType: '',
    permissions: [] as string[],
    level: 1
  });

  useEffect(() => {
    if (externalHierarchy && Object.keys(externalHierarchy).length > 0) {
      // Usa la gerarchia fornita come prop
      setHierarchy(externalHierarchy);
      const tree = buildTreeStructure(externalHierarchy);
      setTreeData(tree);
      
      // Espandi i primi livelli per default
      const initialExpanded = new Set<string>();
      tree.forEach(node => {
        if (node.level <= 2) {
          initialExpanded.add(node.id);
          expandChildrenRecursively(node, initialExpanded, 3);
        }
      });
      setExpandedNodes(initialExpanded);
      setLoading(false);
    } else {
      // Carica la gerarchia internamente se non fornita
      loadHierarchyData();
    }
  }, [externalHierarchy]);

  const loadHierarchyData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!isAuthenticated()) {
        setError('Accesso non autorizzato. Effettua il login per visualizzare la gerarchia dei ruoli.');
        return;
      }
      
      const hierarchyData = await getRoleHierarchy();
      
      // Controllo se i dati della gerarchia sono validi
      if (!hierarchyData) {
        setError('Nessun dato di gerarchia disponibile. Verifica la configurazione dei ruoli.');
        return;
      }
      
      setHierarchy(hierarchyData);
      
      // Converti i dati della gerarchia in struttura ad albero
      const tree = buildTreeStructure(hierarchyData);
      setTreeData(tree);
      
      // Espandi i primi livelli per default
      const initialExpanded = new Set<string>();
      tree.forEach(node => {
        if (node.level <= 2) {
          initialExpanded.add(node.id);
          expandChildrenRecursively(node, initialExpanded, 3);
        }
      });
      setExpandedNodes(initialExpanded);
      
    } catch (err: any) {
      console.error('Error loading hierarchy data:', err);
      setError('Errore nel caricamento della gerarchia dei ruoli. Riprova più tardi.');
    } finally {
      setLoading(false);
    }
  };

  const expandChildrenRecursively = (node: TreeNode, expanded: Set<string>, maxLevel: number) => {
    if (node.level < maxLevel) {
      node.children.forEach(child => {
        expanded.add(child.id);
        expandChildrenRecursively(child, expanded, maxLevel);
      });
    }
  };

  const buildTreeStructure = (hierarchyData: RoleHierarchyType): TreeNode[] => {
    // Controllo se hierarchyData è valido
    if (!hierarchyData || typeof hierarchyData !== 'object') {
      console.warn('buildTreeStructure: hierarchyData is invalid:', hierarchyData);
      return [];
    }

    const nodes: { [key: string]: TreeNode } = {};
    const rootNodes: TreeNode[] = [];

    // Crea tutti i nodi
    Object.entries(hierarchyData).forEach(([roleType, data]) => {
      const node: TreeNode = {
        id: roleType,
        name: data.name,
        description: data.description,
        level: data.level,
        roleType: roleType,
        children: [],
        permissions: data.permissions || [],
        assignableRoles: data.assignableRoles || [],
        parentId: undefined
      };
      nodes[roleType] = node;
    });

    // Determina le relazioni parent-child basandosi sui livelli
    // Un nodo è figlio del nodo di livello immediatamente superiore più vicino
    Object.values(nodes).forEach(node => {
      if (node.level === 0) {
        // Livello 0 è sempre root
        rootNodes.push(node);
      } else {
        // Trova il parent con il livello immediatamente superiore
        const potentialParents = Object.values(nodes).filter(
          parent => parent.level === node.level - 1
        );
        
        if (potentialParents.length > 0) {
          // Se ci sono più potenziali parent dello stesso livello, 
          // usa il primo o implementa una logica più specifica
          const parent = potentialParents[0];
          node.parentId = parent.id;
          parent.children.push(node);
        } else {
          // Se non trova un parent del livello immediatamente superiore,
          // cerca il parent di livello più alto disponibile
          const allPotentialParents = Object.values(nodes).filter(
            parent => parent.level < node.level
          );
          
          if (allPotentialParents.length > 0) {
            // Ordina per livello decrescente e prendi il primo
            allPotentialParents.sort((a, b) => b.level - a.level);
            const parent = allPotentialParents[0];
            node.parentId = parent.id;
            parent.children.push(node);
          } else {
            // Se non trova nessun parent, è un root node
            rootNodes.push(node);
          }
        }
      }
    });

    // Ordina per livello e nome
    const sortNodes = (nodeArray: TreeNode[]) => {
      nodeArray.sort((a, b) => {
        if (a.level !== b.level) return a.level - b.level;
        return a.name.localeCompare(b.name);
      });
      nodeArray.forEach(node => sortNodes(node.children));
    };

    sortNodes(rootNodes);
    return rootNodes;
  };

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const canEditRole = (roleType: string): boolean => {
    if (!currentUserHierarchy) return false;
    // Se l'utente ha ALL_PERMISSIONS o è SUPER_ADMIN, può modificare tutto
    if (currentUserHierarchy.assignablePermissions?.includes('ALL_PERMISSIONS') ||
        currentUserHierarchy.userRoles?.includes('SUPER_ADMIN')) {
      return true;
    }
    
    // I ruoli assegnabili potrebbero essere oggetti con proprietà type/name
    return currentUserHierarchy.assignableRoles?.some((role: any) => {
      const roleTypeToCheck = typeof role === 'object' ? (role.type || role.name) : role;
      return roleTypeToCheck === roleType;
    }) || false;
  };

  const hasPermission = (permission: string): boolean => {
    console.log('🔍 Checking permission:', permission);
    console.log('📊 currentUserHierarchy:', currentUserHierarchy);
    
    if (!currentUserHierarchy) {
      console.log('❌ No currentUserHierarchy found');
      return false;
    }
    
    // Se l'utente ha ALL_PERMISSIONS o è SUPER_ADMIN, ha tutti i permessi
    if (currentUserHierarchy.assignablePermissions?.includes('ALL_PERMISSIONS') ||
        currentUserHierarchy.userRoles?.includes('SUPER_ADMIN')) {
      console.log('✅ User has ALL_PERMISSIONS or SUPER_ADMIN');
      return true;
    }
    
    const hasPermissionResult = currentUserHierarchy.assignablePermissions?.includes(permission) || false;
    console.log(`🎯 Permission ${permission} result:`, hasPermissionResult);
    console.log('📋 Available permissions:', currentUserHierarchy.assignablePermissions);
    
    return hasPermissionResult;
  };

  const startEditing = (node: TreeNode) => {
    if (!canEditRole(node.roleType)) return;
    
    setEditingNode(node.id);
    setFormData({
      name: node.name,
      description: node.description,
      roleType: node.roleType,
      permissions: node.permissions,
      level: node.level
    });
  };

  const startCreating = (parentId: string | null) => {
    if (!hasPermission('CREATE_ROLES')) return;
    
    const parentNode = parentId ? findNodeById(treeData, parentId) : null;
    const newLevel = parentNode ? parentNode.level + 1 : 1;
    
    setCreatingChild(parentId);
    setFormData({
      name: '',
      description: '',
      roleType: '',
      permissions: [],
      level: newLevel
    });
  };

  const findNodeById = (nodes: TreeNode[], id: string): TreeNode | null => {
    for (const node of nodes) {
      if (node.id === id) return node;
      const found = findNodeById(node.children, id);
      if (found) return found;
    }
    return null;
  };

  const saveRole = async () => {
    try {
      if (editingNode) {
        // Modifica ruolo esistente
        if (onRoleUpdate) {
          await onRoleUpdate(editingNode, {
            ...formData,
            type: formData.roleType
          });
        }
      } else if (creatingChild !== null) {
        // Crea nuovo ruolo
        if (onRoleCreate) {
          await onRoleCreate(creatingChild, {
            ...formData,
            type: formData.roleType
          });
        }
      }
      
      // Ricarica i dati
      await loadHierarchyData();
      cancelEditing();
    } catch (error) {
      console.error('Error saving role:', error);
    }
  };

  const deleteRole = async (nodeId: string) => {
    if (!canEditRole(nodeId) || !hasPermission('DELETE_ROLES')) return;
    
    if (window.confirm('Sei sicuro di voler eliminare questo ruolo? Questa azione non può essere annullata.')) {
      try {
        if (onRoleDelete) {
          await onRoleDelete(nodeId);
        }
        await loadHierarchyData();
      } catch (error) {
        console.error('Error deleting role:', error);
      }
    }
  };

  const cancelEditing = () => {
    setEditingNode(null);
    setCreatingChild(null);
    setFormData({
      name: '',
      description: '',
      roleType: '',
      permissions: [],
      level: 1
    });
  };

  const handleDragStart = (nodeId: string) => {
    setDraggedNode(nodeId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetNodeId: string | null) => {
    e.preventDefault();
    
    if (!draggedNode || !hasPermission('EDIT_HIERARCHY')) return;
    
    try {
      if (onRoleMove) {
        await onRoleMove(draggedNode, targetNodeId);
      }
      await loadHierarchyData();
    } catch (error) {
      console.error('Error moving role:', error);
    } finally {
      setDraggedNode(null);
    }
  };

  const getRoleIcon = (level: number, roleType: string) => {
    if (roleType.includes('SUPER_ADMIN')) return <Crown className="w-4 h-4 text-purple-600" />;
    if (roleType.includes('ADMIN')) return <Star className="w-4 h-4 text-red-600" />;
    if (roleType.includes('MANAGER')) return <Award className="w-4 h-4 text-orange-600" />;
    if (roleType.includes('TRAINER')) return <UserCheck className="w-4 h-4 text-blue-600" />;
    if (level <= 2) return <Building className="w-4 h-4 text-indigo-600" />;
    return <Users className="w-4 h-4 text-green-600" />;
  };

  const renderTreeNode = (node: TreeNode, depth: number = 0): React.ReactNode => {
    const isExpanded = expandedNodes.has(node.id);
    const isEditing = editingNode === node.id;
    const isCreating = creatingChild === node.id;
    const hasChildren = node.children.length > 0;
    const canEdit = canEditRole(node.roleType);
    const canCreate = hasPermission('CREATE_ROLES');
    const canDelete = canEditRole(node.roleType) && hasPermission('DELETE_ROLES');

    // Debug log per capire perché i pulsanti sono disabilitati
    console.log(`🔍 Debug pulsanti per nodo ${node.name} (${node.roleType}):`);
    console.log(`  - canEdit: ${canEdit}`);
    console.log(`  - canCreate: ${canCreate}`);
    console.log(`  - canDelete: ${canDelete}`);
    console.log(`  - hasChildren: ${hasChildren}`);
    console.log(`  - currentUserHierarchy:`, currentUserHierarchy);

    return (
      <div key={node.id} className="select-none">
        {/* Nodo principale */}
        <div
          className={`flex items-center py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors ${
            draggedNode === node.id ? 'opacity-50' : ''
          }`}
          style={{ marginLeft: `${depth * 24}px` }}
          draggable={canEdit}
          onDragStart={() => handleDragStart(node.id)}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, node.id)}
        >
          {/* Icona espansione */}
          <div className="w-6 h-6 flex items-center justify-center">
            {hasChildren && (
              <button
                onClick={() => toggleNode(node.id)}
                className="p-1 hover:bg-gray-200 rounded"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-gray-600" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                )}
              </button>
            )}
          </div>

          {/* Icona ruolo */}
          <div className="mr-3">
            {getRoleIcon(node.level, node.roleType)}
          </div>

          {/* Contenuto nodo */}
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  placeholder="Nome ruolo"
                />
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  placeholder="Descrizione"
                />
              </div>
            ) : (
              <div>
                <div className="font-medium text-gray-900 truncate">{node.name}</div>
                <div className="text-sm text-gray-500 truncate">{node.description}</div>
                <div className="text-xs text-gray-400">
                  Livello {node.level} • {node.permissions.length} permessi
                </div>
              </div>
            )}
          </div>

          {/* Azioni - Stile uguale alla visualizzazione a lista */}
          <div className="flex items-center space-x-0.5 ml-4">
            {isEditing ? (
              <>
                <button
                  onClick={saveRole}
                  className="p-1 text-green-600 hover:bg-green-100 rounded transition-colors"
                  title="Salva"
                >
                  <Save className="w-3 h-3" />
                </button>
                <button
                  onClick={cancelEditing}
                  className="p-1 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                  title="Annulla"
                >
                  <X className="w-3 h-3" />
                </button>
              </>
            ) : (
              <>
                {/* Pulsante Aggiungi sotto-ruolo */}
                <button
                  onClick={canCreate ? () => startCreating(node.id) : undefined}
                  disabled={!canCreate}
                  className={`p-1 transition-colors rounded bg-transparent border-0 shadow-none ${
                    canCreate 
                      ? 'text-green-600 hover:bg-green-100 cursor-pointer' 
                      : 'text-gray-400 opacity-50 cursor-not-allowed'
                  }`}
                  title={canCreate ? "Aggiungi sotto-ruolo" : "Non hai permessi per creare ruoli"}
                >
                  <Plus className="w-3 h-3" />
                </button>
                
                {/* Pulsante Modifica */}
                <button
                  onClick={canEdit ? () => startEditing(node) : undefined}
                  disabled={!canEdit}
                  className={`p-1 transition-colors rounded bg-transparent border-0 shadow-none ${
                    canEdit 
                      ? 'text-blue-600 hover:bg-blue-100 cursor-pointer' 
                      : 'text-gray-400 opacity-50 cursor-not-allowed'
                  }`}
                  title={canEdit ? "Modifica" : "Non hai permessi per modificare questo ruolo"}
                >
                  <Edit3 className="w-3 h-3" />
                </button>
                
                {/* Pulsante Elimina */}
                <button
                  onClick={(canDelete && node.children.length === 0) ? () => deleteRole(node.id) : undefined}
                  disabled={!(canDelete && node.children.length === 0)}
                  className={`p-1 transition-colors rounded bg-transparent border-0 shadow-none ${
                    canDelete && node.children.length === 0
                      ? 'text-red-600 hover:bg-red-100 cursor-pointer' 
                      : 'text-gray-400 opacity-50 cursor-not-allowed'
                  }`}
                  title={
                    !canDelete 
                      ? "Non hai permessi per eliminare questo ruolo" 
                      : node.children.length > 0 
                        ? "Non puoi eliminare un ruolo con sotto-ruoli" 
                        : "Elimina"
                  }
                >
                  <Trash2 className="w-3 h-3" />
                </button>
                
                {/* Pulsante Trascina */}
                <button 
                  disabled={!canEdit}
                  className={`p-1 transition-colors rounded bg-transparent border-0 shadow-none ${
                    canEdit 
                      ? 'text-amber-600 hover:bg-amber-100 cursor-move' 
                      : 'text-gray-400 opacity-50 cursor-not-allowed'
                  }`} 
                  title={canEdit ? "Trascina per riordinare" : "Non hai permessi per riordinare"}
                >
                  <Move className="w-3 h-3" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Form per creare nuovo figlio */}
        {isCreating && (
          <div
            className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-2"
            style={{ marginLeft: `${(depth + 1) * 24}px` }}
          >
            <div className="space-y-2">
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                placeholder="Nome nuovo ruolo"
              />
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                placeholder="Descrizione"
              />
              <input
                type="text"
                value={formData.roleType}
                onChange={(e) => setFormData({ ...formData, roleType: e.target.value })}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                placeholder="Tipo ruolo (es: ADMIN_LAVORO_FORMAZIONE)"
              />
              <div className="flex space-x-2">
                <button
                  onClick={saveRole}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                >
                  Crea
                </button>
                <button
                  onClick={cancelEditing}
                  className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
                >
                  Annulla
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Figli */}
        {isExpanded && hasChildren && (
          <div>
            {node.children.map(child => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
        <span className="ml-3 text-gray-600">Caricamento gerarchia...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">⚠️</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Errore</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={loadHierarchyData}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Riprova
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header con azioni globali */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-3">
          <Shield className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">Vista ad Albero della Gerarchia</h3>
        </div>
        <div className="flex items-center space-x-2">
          {hasPermission('CREATE_ROLES') && (
            <button
              onClick={() => startCreating(null)}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 flex items-center space-x-1.5 transition-colors text-sm"
            >
              <Plus className="w-3 h-3" />
              <span>Nuovo Ruolo Radice</span>
            </button>
          )}
          <button
            onClick={loadHierarchyData}
            className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300 flex items-center space-x-1.5 transition-colors text-sm"
          >
            <Settings className="w-3 h-3" />
            <span>Aggiorna</span>
          </button>
        </div>
      </div>

      {/* Contenuto principale */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="p-4">
          {/* Form per nuovo ruolo radice */}
          {creatingChild === null && editingNode === null && formData.name !== '' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
              <div className="space-y-2">
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  placeholder="Nome nuovo ruolo radice"
                />
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  placeholder="Descrizione"
                />
                <input
                  type="text"
                  value={formData.roleType}
                  onChange={(e) => setFormData({ ...formData, roleType: e.target.value })}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  placeholder="Tipo ruolo (es: ADMIN_LAVORO_FORMAZIONE)"
                />
                <div className="flex space-x-2">
                  <button
                    onClick={saveRole}
                    className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                  >
                    Crea Ruolo Radice
                  </button>
                  <button
                    onClick={cancelEditing}
                    className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
                  >
                    Annulla
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Albero della gerarchia */}
          <div 
            className="space-y-1"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, null)}
          >
            {treeData.map(node => renderTreeNode(node))}
          </div>

          {treeData.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Shield className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Nessun ruolo trovato nella gerarchia.</p>
              {hasPermission('CREATE_ROLES') && (
                <button
                  onClick={() => startCreating(null)}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Crea il primo ruolo
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HierarchyTreeView;