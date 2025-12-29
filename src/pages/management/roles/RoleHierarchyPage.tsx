/**
 * Role Hierarchy Page - Management Section
 * 
 * Visual tree/list view of role hierarchy with full CRUD operations
 * - Tree and list view modes
 * - Create, edit, delete, move roles
 * - Drag & drop for easy role movement
 * - Permission inheritance visualization
 * - Level-based role organization (uses real API data with parent relationships)
 * 
 * @module pages/management/roles/RoleHierarchyPage
 * @project 43 - Tenant Roles Management System
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Layers,
    Search,
    RefreshCw,
    Plus,
    Edit2,
    Trash2,
    Move,
    ChevronRight,
    ChevronDown,
    Shield,
    Users,
    Key,
    Settings,
    AlertCircle,
    Loader2,
    Info,
    Save,
    X,
    Lock,
    Unlock,
    Check,
    ArrowUp,
    ArrowDown,
    Eye,
    Building2,
    GitBranch,
    Crown,
    Briefcase,
    GraduationCap,
    Stethoscope,
    UserCog,
    ClipboardList,
    HeartPulse,
    UserCheck,
    UserX,
    FileSearch,
    GripVertical,
    ExternalLink
} from 'lucide-react';
import { useAuth } from '../../../hooks/auth/useAuth';
import { apiGet, apiPost, apiPut, apiDelete } from '../../../services/api';
import { managementApi } from '../api';
import type { Tenant } from '../types';

// Role hierarchy node structure
interface RoleNode {
    id: string;
    roleType: string;
    name: string;
    displayName?: string;
    description?: string;
    level: number;
    parentId?: string | null;
    children: RoleNode[];
    userCount: number;
    permissions: string[];
    canAssignTo: string[];
    isSystemRole?: boolean;
    isActive: boolean;
    color: string;
    icon: React.ComponentType<{ className?: string }>;
}

// Backend hierarchy data structure
interface HierarchyRole {
    level: number;
    parent: string | null;
    name: string;
    description: string;
    canAssignTo: string[];
    permissions: string[];
}

// Complete role configurations with icons and colors for all 22 system roles
const ROLE_DISPLAY_CONFIG: Record<string, { 
    color: string; 
    icon: React.ComponentType<{ className?: string }>;
}> = {
    SUPER_ADMIN: { color: 'bg-purple-100 text-purple-800 border-purple-300', icon: Crown },
    ADMIN: { color: 'bg-red-100 text-red-800 border-red-300', icon: Shield },
    COMPANY_ADMIN: { color: 'bg-orange-100 text-orange-800 border-orange-300', icon: Building2 },
    TENANT_ADMIN: { color: 'bg-amber-100 text-amber-800 border-amber-300', icon: Key },
    TRAINING_ADMIN: { color: 'bg-blue-100 text-blue-800 border-blue-300', icon: GraduationCap },
    CLINIC_ADMIN: { color: 'bg-teal-100 text-teal-800 border-teal-300', icon: Stethoscope },
    HR_MANAGER: { color: 'bg-indigo-100 text-indigo-800 border-indigo-300', icon: UserCog },
    MANAGER: { color: 'bg-sky-100 text-sky-800 border-sky-300', icon: Briefcase },
    DEPARTMENT_HEAD: { color: 'bg-cyan-100 text-cyan-800 border-cyan-300', icon: ClipboardList },
    TRAINER_COORDINATOR: { color: 'bg-violet-100 text-violet-800 border-violet-300', icon: Users },
    COMPANY_MANAGER: { color: 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300', icon: Building2 },
    SENIOR_TRAINER: { color: 'bg-emerald-100 text-emerald-800 border-emerald-300', icon: GraduationCap },
    TRAINER: { color: 'bg-green-100 text-green-800 border-green-300', icon: GraduationCap },
    EXTERNAL_TRAINER: { color: 'bg-lime-100 text-lime-800 border-lime-300', icon: UserCheck },
    SUPERVISOR: { color: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: Eye },
    COORDINATOR: { color: 'bg-rose-100 text-rose-800 border-rose-300', icon: Users },
    OPERATOR: { color: 'bg-pink-100 text-pink-800 border-pink-300', icon: Settings },
    EMPLOYEE: { color: 'bg-gray-100 text-gray-700 border-gray-300', icon: Users },
    VIEWER: { color: 'bg-slate-100 text-slate-700 border-slate-300', icon: Eye },
    GUEST: { color: 'bg-zinc-100 text-zinc-600 border-zinc-300', icon: UserX },
    CONSULTANT: { color: 'bg-stone-100 text-stone-700 border-stone-300', icon: FileSearch },
    AUDITOR: { color: 'bg-neutral-100 text-neutral-700 border-neutral-300', icon: ClipboardList }
};

type ViewMode = 'tree' | 'list';

// Drag & drop state
interface DragState {
    isDragging: boolean;
    draggedRole: RoleNode | null;
    dropTarget: RoleNode | null;
    dropPosition: 'before' | 'after' | 'inside' | null;
}

const RoleHierarchyPage: React.FC = () => {
    const { user: currentUser } = useAuth();
    const navigate = useNavigate();
    const [roles, setRoles] = useState<RoleNode[]>([]);
    const [allRolesFlat, setAllRolesFlat] = useState<RoleNode[]>([]);
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>('tree');
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['SUPER_ADMIN', 'ADMIN', 'COMPANY_ADMIN', 'TENANT_ADMIN', 'TRAINING_ADMIN', 'CLINIC_ADMIN']));
    const [selectedRole, setSelectedRole] = useState<RoleNode | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showMoveModal, setShowMoveModal] = useState(false);
    
    // Drag & drop state
    const [dragState, setDragState] = useState<DragState>({
        isDragging: false,
        draggedRole: null,
        dropTarget: null,
        dropPosition: null
    });
    const [movingRole, setMovingRole] = useState(false);

    // Load data from API
    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            
            // Use the correct endpoint that returns the full hierarchy
            const response = await apiGet<{ success: boolean; data: Record<string, HierarchyRole> }>('/api/v1/roles/hierarchy');
            
            if (response?.success && response.data) {
                const hierarchyNodes = buildHierarchyFromAPI(response.data);
                setRoles(hierarchyNodes);
            } else {
                throw new Error('Invalid response from hierarchy API');
            }
            
            // Load tenants separately (non-blocking)
            try {
                const tenantsResponse = await managementApi.getMyTenants();
                setTenants(tenantsResponse.data || []);
            } catch (tenantErr) {
                console.warn('Could not load tenants:', tenantErr);
                // Continue without tenants data
            }
        } catch (err: any) {
            console.error('Error loading role hierarchy:', err);
            setError(err.message || 'Errore nel caricamento della gerarchia ruoli');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Build hierarchy tree from API response (uses parent field for proper relationships)
    const buildHierarchyFromAPI = (hierarchyData: Record<string, HierarchyRole>): RoleNode[] => {
        // Create nodes from API data
        const nodesMap = new Map<string, RoleNode>();
        const allNodes: RoleNode[] = [];
        
        Object.entries(hierarchyData).forEach(([roleType, roleData]) => {
            const displayConfig = ROLE_DISPLAY_CONFIG[roleType] || { 
                color: 'bg-gray-100 text-gray-700 border-gray-300', 
                icon: Users 
            };
            
            const node: RoleNode = {
                id: roleType,
                roleType,
                name: roleData.name,
                displayName: roleData.name,
                description: roleData.description,
                level: roleData.level,
                parentId: roleData.parent,
                children: [],
                userCount: 0, // Will be populated from user stats if available
                permissions: roleData.permissions || [],
                canAssignTo: roleData.canAssignTo || [],
                isSystemRole: true,
                isActive: true,
                color: displayConfig.color,
                icon: displayConfig.icon
            };
            
            nodesMap.set(roleType, node);
            allNodes.push(node);
        });
        
        // Store flat list for stats and list view
        setAllRolesFlat(allNodes);
        
        // Build parent-child relationships
        const rootNodes: RoleNode[] = [];
        
        allNodes.forEach(node => {
            if (node.parentId && nodesMap.has(node.parentId)) {
                const parent = nodesMap.get(node.parentId)!;
                parent.children.push(node);
            } else if (!node.parentId) {
                // Root node (no parent = SUPER_ADMIN)
                rootNodes.push(node);
            }
        });
        
        // Sort children by level for consistent display
        const sortChildren = (nodes: RoleNode[]) => {
            nodes.sort((a, b) => a.level - b.level);
            nodes.forEach(node => {
                if (node.children.length > 0) {
                    sortChildren(node.children);
                }
            });
        };
        
        rootNodes.forEach(root => sortChildren(root.children));
        
        return rootNodes;
    };

    // Toggle node expansion
    const toggleNode = (roleType: string) => {
        setExpandedNodes(prev => {
            const next = new Set(prev);
            if (next.has(roleType)) {
                next.delete(roleType);
            } else {
                next.add(roleType);
            }
            return next;
        });
    };

    // Get all roles flattened for list view (with depth info for indentation)
    const flattenedRoles = useMemo(() => {
        const flatten = (nodes: RoleNode[], depth = 0): (RoleNode & { depth: number })[] => {
            return nodes.flatMap(node => [
                { ...node, depth },
                ...flatten(node.children, depth + 1)
            ]);
        };
        return flatten(roles);
    }, [roles]);

    // Filter roles by search term
    const filteredRoles = useMemo(() => {
        if (!searchTerm) return flattenedRoles;
        const term = searchTerm.toLowerCase();
        return flattenedRoles.filter(role => 
            role.name.toLowerCase().includes(term) ||
            role.description?.toLowerCase().includes(term) ||
            role.roleType.toLowerCase().includes(term)
        );
    }, [flattenedRoles, searchTerm]);

    // Stats for role distribution
    const roleStats = useMemo(() => {
        return allRolesFlat.reduce((acc, role) => {
            acc[role.roleType] = {
                name: role.name,
                level: role.level,
                userCount: role.userCount,
                color: role.color
            };
            return acc;
        }, {} as Record<string, { name: string; level: number; userCount: number; color: string }>);
    }, [allRolesFlat]);

    // Handlers
    const handleViewRole = (role: RoleNode) => {
        setSelectedRole(role);
    };

    const handleEditRole = (role: RoleNode) => {
        setSelectedRole(role);
        setShowEditModal(true);
    };

    const handleCreateChild = (parentRole: RoleNode) => {
        setSelectedRole(parentRole);
        setShowCreateModal(true);
    };

    const handleMoveRole = (role: RoleNode) => {
        setSelectedRole(role);
        setShowMoveModal(true);
    };

    // Navigate to role detail page
    const handleNavigateToRole = (role: RoleNode) => {
        navigate(`/management/roles/${role.roleType}`);
    };

    // Drag & Drop handlers
    const handleDragStart = useCallback((e: React.DragEvent, role: RoleNode) => {
        if (role.isSystemRole && role.roleType === 'SUPER_ADMIN') {
            // Don't allow dragging SUPER_ADMIN
            e.preventDefault();
            return;
        }
        
        e.dataTransfer.setData('text/plain', role.roleType);
        e.dataTransfer.effectAllowed = 'move';
        
        setDragState({
            isDragging: true,
            draggedRole: role,
            dropTarget: null,
            dropPosition: null
        });
    }, []);

    const handleDragEnd = useCallback(() => {
        setDragState({
            isDragging: false,
            draggedRole: null,
            dropTarget: null,
            dropPosition: null
        });
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent, targetRole: RoleNode) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        
        const { draggedRole } = dragState;
        if (!draggedRole || draggedRole.roleType === targetRole.roleType) {
            return;
        }

        // Don't allow dropping on children of the dragged role
        const isDescendant = (parent: RoleNode, childType: string): boolean => {
            if (parent.roleType === childType) return true;
            return parent.children.some(child => isDescendant(child, childType));
        };
        
        if (isDescendant(draggedRole, targetRole.roleType)) {
            return;
        }

        setDragState(prev => ({
            ...prev,
            dropTarget: targetRole,
            dropPosition: 'inside'
        }));
    }, [dragState]);

    const handleDragLeave = useCallback(() => {
        setDragState(prev => ({
            ...prev,
            dropTarget: null,
            dropPosition: null
        }));
    }, []);

    const handleDrop = useCallback(async (e: React.DragEvent, targetRole: RoleNode) => {
        e.preventDefault();
        
        const { draggedRole } = dragState;
        if (!draggedRole || draggedRole.roleType === targetRole.roleType) {
            handleDragEnd();
            return;
        }

        // Don't allow dropping on children of the dragged role
        const isDescendant = (parent: RoleNode, childType: string): boolean => {
            if (parent.roleType === childType) return true;
            return parent.children.some(child => isDescendant(child, childType));
        };
        
        if (isDescendant(draggedRole, targetRole.roleType)) {
            handleDragEnd();
            return;
        }

        // Move the role
        try {
            setMovingRole(true);
            await managementApi.moveRoleInHierarchy(
                draggedRole.roleType,
                targetRole.roleType,
                targetRole.level + 1
            );
            await loadData();
        } catch (err: any) {
            console.error('Error moving role:', err);
            setError(err.message || 'Errore nello spostamento del ruolo');
        } finally {
            setMovingRole(false);
            handleDragEnd();
        }
    }, [dragState, loadData]);

    // Handle move from modal
    const handleMoveRoleConfirm = async (newParentId: string | null) => {
        if (!selectedRole) return;
        
        try {
            setMovingRole(true);
            const parentRole = newParentId ? allRolesFlat.find(r => r.roleType === newParentId) : null;
            const newLevel = parentRole ? parentRole.level + 1 : 1;
            
            await managementApi.moveRoleInHierarchy(
                selectedRole.roleType,
                newParentId,
                newLevel
            );
            setShowMoveModal(false);
            setSelectedRole(null);
            await loadData();
        } catch (err: any) {
            console.error('Error moving role:', err);
            setError(err.message || 'Errore nello spostamento del ruolo');
        } finally {
            setMovingRole(false);
        }
    };

    // Tree node component with drag & drop support
    const TreeNode: React.FC<{ node: RoleNode; depth: number }> = ({ node, depth }) => {
        const Icon = node.icon;
        const hasChildren = node.children.length > 0;
        const isExpanded = expandedNodes.has(node.roleType);
        const isDragTarget = dragState.dropTarget?.roleType === node.roleType;
        const isDragging = dragState.isDragging && dragState.draggedRole?.roleType === node.roleType;
        const canDrag = !node.isSystemRole || node.roleType !== 'SUPER_ADMIN';

        return (
            <div className="select-none group">
                <div 
                    className={`
                        flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all
                        ${selectedRole?.roleType === node.roleType 
                            ? 'bg-purple-50 border border-purple-200' 
                            : 'hover:bg-gray-50 border border-transparent'
                        }
                        ${isDragTarget ? 'bg-blue-50 border-blue-300 border-2 border-dashed' : ''}
                        ${isDragging ? 'opacity-50' : ''}
                    `}
                    style={{ paddingLeft: `${depth * 24 + 12}px` }}
                    onClick={() => handleViewRole(node)}
                    draggable={canDrag}
                    onDragStart={(e) => handleDragStart(e, node)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => handleDragOver(e, node)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, node)}
                >
                    {/* Drag handle */}
                    {canDrag && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing">
                            <GripVertical className="w-4 h-4 text-gray-400" />
                        </div>
                    )}

                    {/* Expand/Collapse */}
                    <button 
                        onClick={(e) => { e.stopPropagation(); toggleNode(node.roleType); }}
                        className={`w-5 h-5 flex items-center justify-center rounded hover:bg-gray-200 transition-colors ${!hasChildren ? 'invisible' : ''}`}
                    >
                        {hasChildren && (
                            isExpanded 
                                ? <ChevronDown className="w-4 h-4 text-gray-500" />
                                : <ChevronRight className="w-4 h-4 text-gray-500" />
                        )}
                    </button>

                    {/* Role Icon */}
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${node.color.split(' ')[0]}`}>
                        <Icon className={`w-4 h-4 ${node.color.split(' ')[1]}`} />
                    </div>

                    {/* Role Info - Clickable link to detail */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={(e) => { e.stopPropagation(); handleNavigateToRole(node); }}
                                className="font-medium text-gray-900 hover:text-purple-600 hover:underline transition-colors flex items-center gap-1"
                            >
                                {node.name}
                                <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                            <span className={`px-2 py-0.5 rounded text-xs ${node.color}`}>
                                Lv. {node.level}
                            </span>
                            {node.isSystemRole && (
                                <span title="Ruolo di sistema">
                                    <Lock className="w-3 h-3 text-gray-400" />
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-gray-500 truncate">{node.description}</p>
                    </div>

                    {/* User Count */}
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Users className="w-4 h-4" />
                        <span>{node.userCount}</span>
                    </div>

                    {/* Can Assign Badge */}
                    {node.canAssignTo.length > 0 && (
                        <div className="flex items-center gap-1 text-xs text-gray-400" title={`Può assegnare: ${node.canAssignTo.join(', ')}`}>
                            <ArrowDown className="w-3 h-3" />
                            <span>{node.canAssignTo.length}</span>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={(e) => { e.stopPropagation(); handleNavigateToRole(node); }}
                            className="p-1.5 rounded hover:bg-gray-200 text-gray-500 hover:text-blue-600"
                            title="Visualizza dettagli"
                        >
                            <Eye className="w-4 h-4" />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); handleEditRole(node); }}
                            className="p-1.5 rounded hover:bg-gray-200 text-gray-500 hover:text-purple-600"
                            title="Modifica"
                        >
                            <Edit2 className="w-4 h-4" />
                        </button>
                        {canDrag && (
                            <button
                                onClick={(e) => { e.stopPropagation(); handleMoveRole(node); }}
                                className="p-1.5 rounded hover:bg-gray-200 text-gray-500 hover:text-blue-600"
                                title="Sposta (o trascina)"
                            >
                                <Move className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Children */}
                {hasChildren && isExpanded && (
                    <div className="border-l-2 border-gray-200 ml-6">
                        {node.children.map(child => (
                            <TreeNode key={child.roleType} node={child} depth={depth + 1} />
                        ))}
                    </div>
                )}
            </div>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] bg-red-50 rounded-xl border border-red-200 p-6">
                <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                <h3 className="text-lg font-semibold text-red-700 mb-2">Errore</h3>
                <p className="text-red-600 text-center">{error}</p>
                <button 
                    onClick={loadData}
                    className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                >
                    <RefreshCw className="w-4 h-4" />
                    Riprova
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                        <GitBranch className="w-7 h-7 text-purple-600" />
                        Gerarchia Ruoli
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Visualizza e gestisci la struttura gerarchica dei ruoli
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={loadData}
                        className="px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Aggiorna"
                    >
                        <RefreshCw className="w-5 h-5" />
                    </button>
                    <div className="flex bg-gray-100 rounded-lg p-1">
                        <button
                            onClick={() => setViewMode('tree')}
                            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                                viewMode === 'tree' 
                                    ? 'bg-white text-purple-700 shadow' 
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            <GitBranch className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                                viewMode === 'list' 
                                    ? 'bg-white text-purple-700 shadow' 
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            <Layers className="w-4 h-4" />
                        </button>
                    </div>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                    >
                        <Plus className="w-5 h-5" />
                        Nuovo Ruolo
                    </button>
                </div>
            </div>

            {/* Info Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                    <p className="text-sm text-blue-800">
                        <strong>Come funziona la gerarchia:</strong> I ruoli di livello superiore possono gestire quelli inferiori. 
                        I permessi vengono ereditati lungo la catena gerarchica. I ruoli di sistema (🔒) non possono essere eliminati.
                    </p>
                </div>
            </div>

            {/* Search */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Cerca ruolo..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                </div>
            </div>

            {/* Content */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {movingRole && (
                    <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10">
                        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-lg">
                            <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
                            <span className="text-sm text-gray-600">Spostamento in corso...</span>
                        </div>
                    </div>
                )}
                {viewMode === 'tree' ? (
                    <div className="p-4 space-y-1">
                        {dragState.isDragging && (
                            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm flex items-center gap-2">
                                <Move className="w-4 h-4" />
                                Trascina "{dragState.draggedRole?.name}" su un altro ruolo per spostarlo. 
                                I ruoli figli verranno spostati automaticamente.
                            </div>
                        )}
                        {roles.map(node => (
                            <TreeNode key={node.roleType} node={node} depth={0} />
                        ))}
                    </div>
                ) : (
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Ruolo</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Descrizione</th>
                                <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Livello</th>
                                <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Può Assegnare</th>
                                <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Permessi</th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Azioni</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredRoles.map(role => {
                                const Icon = role.icon;
                                const canDrag = !role.isSystemRole || role.roleType !== 'SUPER_ADMIN';
                                return (
                                    <tr 
                                        key={role.roleType} 
                                        className={`hover:bg-gray-50 cursor-pointer ${
                                            selectedRole?.roleType === role.roleType ? 'bg-purple-50' : ''
                                        }`}
                                        onClick={() => handleViewRole(role)}
                                    >
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3" style={{ paddingLeft: `${role.depth * 20}px` }}>
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${role.color.split(' ')[0]}`}>
                                                    <Icon className={`w-4 h-4 ${role.color.split(' ')[1]}`} />
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleNavigateToRole(role); }}
                                                        className="font-medium text-gray-900 hover:text-purple-600 hover:underline transition-colors"
                                                    >
                                                        {role.name}
                                                    </button>
                                                    {role.isSystemRole && (
                                                        <Lock className="w-3 h-3 text-gray-400" />
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-500 max-w-[300px] truncate">
                                            {role.description}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${role.color}`}>
                                                {role.level}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center text-sm text-gray-600">
                                            {role.canAssignTo?.length || 0}
                                        </td>
                                        <td className="px-4 py-3 text-center text-sm text-gray-600">
                                            {role.permissions.length}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleNavigateToRole(role); }}
                                                    className="p-1.5 rounded hover:bg-gray-200 text-gray-500 hover:text-blue-600"
                                                    title="Visualizza dettagli"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleEditRole(role); }}
                                                    className="p-1.5 rounded hover:bg-gray-200 text-gray-500 hover:text-purple-600"
                                                    title="Modifica"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                {canDrag && (
                                                    <>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleMoveRole(role); }}
                                                            className="p-1.5 rounded hover:bg-gray-200 text-gray-500 hover:text-blue-600"
                                                            title="Sposta"
                                                        >
                                                            <Move className="w-4 h-4" />
                                                        </button>
                                                        {!role.isSystemRole && (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); /* delete */ }}
                                                                className="p-1.5 rounded hover:bg-gray-200 text-gray-500 hover:text-red-600"
                                                                title="Elimina"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Role Detail Panel */}
            {selectedRole && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${selectedRole.color.split(' ')[0]}`}>
                                <selectedRole.icon className={`w-6 h-6 ${selectedRole.color.split(' ')[1]}`} />
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold text-gray-900">{selectedRole.name}</h2>
                                <p className="text-gray-500">{selectedRole.description}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setSelectedRole(null)}
                            className="p-2 rounded hover:bg-gray-100"
                        >
                            <X className="w-5 h-5 text-gray-400" />
                        </button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                        <div className="bg-gray-50 rounded-lg p-3">
                            <div className="text-sm text-gray-500">Livello</div>
                            <div className="text-2xl font-bold text-gray-900">{selectedRole.level}</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                            <div className="text-sm text-gray-500">Utenti Assegnati</div>
                            <div className="text-2xl font-bold text-gray-900">{selectedRole.userCount}</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                            <div className="text-sm text-gray-500">Permessi Diretti</div>
                            <div className="text-2xl font-bold text-gray-900">{selectedRole.permissions.length}</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                            <div className="text-sm text-gray-500">Può Assegnare</div>
                            <div className="text-2xl font-bold text-gray-900">{selectedRole.canAssignTo?.length || 0}</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                            <div className="text-sm text-gray-500">Tipo</div>
                            <div className="text-lg font-medium text-gray-900">
                                {selectedRole.isSystemRole ? (
                                    <span className="flex items-center gap-1">
                                        <Lock className="w-4 h-4" /> Sistema
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1">
                                        <Unlock className="w-4 h-4" /> Custom
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Ruoli che può assegnare */}
                    {selectedRole.canAssignTo && selectedRole.canAssignTo.length > 0 && (
                        <div className="mb-4">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Ruoli Assegnabili</h4>
                            <div className="flex flex-wrap gap-2">
                                {selectedRole.canAssignTo.map(roleType => {
                                    const targetRole = allRolesFlat.find(r => r.roleType === roleType);
                                    const config = ROLE_DISPLAY_CONFIG[roleType] || { color: 'bg-gray-100 text-gray-700', icon: Users };
                                    return (
                                        <span 
                                            key={roleType} 
                                            className={`px-2 py-1 rounded text-xs cursor-pointer hover:opacity-80 ${config.color}`}
                                            onClick={() => targetRole && handleViewRole(targetRole)}
                                        >
                                            {targetRole?.name || roleType}
                                        </span>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {selectedRole.permissions.length > 0 && (
                        <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Permessi</h4>
                            <div className="flex flex-wrap gap-2">
                                {selectedRole.permissions.slice(0, 10).map(perm => (
                                    <span 
                                        key={perm} 
                                        className="px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs"
                                    >
                                        {perm}
                                    </span>
                                ))}
                                {selectedRole.permissions.length > 10 && (
                                    <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                                        +{selectedRole.permissions.length - 10} altri
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="mt-6 pt-4 border-t border-gray-200 flex gap-3">
                        <button
                            onClick={() => handleNavigateToRole(selectedRole)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                        >
                            <Eye className="w-4 h-4" />
                            Vedi Dettagli
                        </button>
                        <button
                            onClick={() => handleEditRole(selectedRole)}
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                        >
                            <Edit2 className="w-4 h-4" />
                            Modifica
                        </button>
                        <button
                            onClick={() => handleMoveRole(selectedRole)}
                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                        >
                            <Move className="w-4 h-4" />
                            Sposta
                        </button>
                        <button
                            onClick={() => handleCreateChild(selectedRole)}
                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Crea Sotto-ruolo
                        </button>
                    </div>
                </div>
            )}

            {/* Stats - Show top-level roles for quick access */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {allRolesFlat
                    .filter(role => role.level <= 3) // Show only top management roles
                    .sort((a, b) => a.level - b.level)
                    .map(role => {
                        const Icon = role.icon;
                        return (
                            <div 
                                key={role.roleType}
                                className="bg-white rounded-xl border border-gray-200 p-4 cursor-pointer hover:border-purple-300 transition-colors"
                                onClick={() => handleViewRole(role)}
                            >
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${role.color.split(' ')[0]}`}>
                                    <Icon className={`w-5 h-5 ${role.color.split(' ')[1]}`} />
                                </div>
                                <div className="font-medium text-gray-900 truncate">{role.name}</div>
                                <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                                    <span>Lv. {role.level}</span>
                                    <span>•</span>
                                    <span>{role.userCount} utenti</span>
                                </div>
                            </div>
                        );
                    })}
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <CreateRoleModal
                    parentRole={selectedRole}
                    onClose={() => {
                        setShowCreateModal(false);
                        setSelectedRole(null);
                    }}
                    onSuccess={() => {
                        setShowCreateModal(false);
                        setSelectedRole(null);
                        loadData();
                    }}
                />
            )}

            {/* Edit Modal */}
            {showEditModal && selectedRole && (
                <EditRoleModal
                    role={selectedRole}
                    onClose={() => {
                        setShowEditModal(false);
                        setSelectedRole(null);
                    }}
                    onSuccess={() => {
                        setShowEditModal(false);
                        setSelectedRole(null);
                        loadData();
                    }}
                />
            )}

            {/* Move Modal */}
            {showMoveModal && selectedRole && (
                <MoveRoleModal
                    role={selectedRole}
                    allRoles={allRolesFlat}
                    onClose={() => {
                        setShowMoveModal(false);
                        setSelectedRole(null);
                    }}
                    onMove={handleMoveRoleConfirm}
                    saving={movingRole}
                />
            )}
        </div>
    );
};

/**
 * Create Role Modal
 */
const CreateRoleModal: React.FC<{
    parentRole: RoleNode | null;
    onClose: () => void;
    onSuccess: () => void;
}> = ({ parentRole, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        name: '',
        roleType: '',
        displayName: '',
        description: '',
        level: parentRole ? parentRole.level - 10 : 50
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name) {
            setError('Nome ruolo obbligatorio');
            return;
        }
        setSaving(true);
        try {
            await managementApi.createRole({
                name: formData.name,
                roleType: formData.roleType || formData.name.toUpperCase().replace(/\s/g, '_'),
                displayName: formData.displayName || formData.name,
                description: formData.description,
                permissions: []
            });
            onSuccess();
        } catch (err: any) {
            setError(err.message || 'Errore nella creazione');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">
                        {parentRole ? `Nuovo sotto-ruolo di ${parentRole.name}` : 'Nuovo Ruolo'}
                    </h2>
                    <button onClick={onClose} className="p-2 rounded hover:bg-gray-100">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            {error}
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData(f => ({ ...f, description: e.target.value }))}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                            rows={3}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Livello</label>
                        <input
                            type="number"
                            value={formData.level}
                            onChange={(e) => setFormData(f => ({ ...f, level: parseInt(e.target.value) }))}
                            min={1}
                            max={parentRole ? parentRole.level - 1 : 99}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        />
                        {parentRole && (
                            <p className="text-xs text-gray-500 mt-1">
                                Deve essere inferiore al livello del ruolo padre ({parentRole.level})
                            </p>
                        )}
                    </div>
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                            Annulla
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Crea
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

/**
 * Edit Role Modal
 */
const EditRoleModal: React.FC<{
    role: RoleNode;
    onClose: () => void;
    onSuccess: () => void;
}> = ({ role, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        name: role.name,
        displayName: role.displayName || role.name,
        description: role.description || ''
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await managementApi.updateRole(role.id, {
                name: formData.name,
                displayName: formData.displayName,
                description: formData.description
            });
            onSuccess();
        } catch (err: any) {
            setError(err.message || 'Errore nel salvataggio');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">Modifica {role.name}</h2>
                    <button onClick={onClose} className="p-2 rounded hover:bg-gray-100">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            {error}
                        </div>
                    )}
                    {role.isSystemRole && (
                        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700 text-sm flex items-center gap-2">
                            <Lock className="w-4 h-4" />
                            Questo è un ruolo di sistema. Alcune proprietà non possono essere modificate.
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nome visualizzato</label>
                        <input
                            type="text"
                            value={formData.displayName}
                            onChange={(e) => setFormData(f => ({ ...f, displayName: e.target.value }))}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData(f => ({ ...f, description: e.target.value }))}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                            rows={3}
                        />
                    </div>
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                            Annulla
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Salva
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

/**
 * Move Role Modal - Select new parent for a role
 */
const MoveRoleModal: React.FC<{
    role: RoleNode;
    allRoles: RoleNode[];
    onClose: () => void;
    onMove: (newParentId: string | null) => void;
    saving: boolean;
}> = ({ role, allRoles, onClose, onMove, saving }) => {
    const [selectedParent, setSelectedParent] = useState<string | null>(role.parentId || null);

    // Filter roles that can be parent (not the role itself, not its children)
    const isDescendant = (parent: RoleNode, childType: string): boolean => {
        if (parent.roleType === childType) return true;
        return parent.children.some(child => isDescendant(child, childType));
    };

    const availableParents = allRoles.filter(r => {
        // Can't be its own parent
        if (r.roleType === role.roleType) return false;
        // Can't be a descendant of the role being moved
        if (isDescendant(role, r.roleType)) return false;
        return true;
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onMove(selectedParent);
    };

    const selectedParentRole = selectedParent ? allRoles.find(r => r.roleType === selectedParent) : null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <Move className="w-5 h-5 text-blue-600" />
                        Sposta {role.name}
                    </h2>
                    <button onClick={onClose} className="p-2 rounded hover:bg-gray-100">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm flex items-start gap-2">
                        <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <div>
                            Spostando questo ruolo, tutti i ruoli figli ({role.children.length > 0 ? role.children.map(c => c.name).join(', ') : 'nessuno'}) verranno spostati automaticamente insieme.
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Seleziona il nuovo ruolo padre
                        </label>
                        <select
                            value={selectedParent || ''}
                            onChange={(e) => setSelectedParent(e.target.value || null)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">-- Nessun padre (ruolo root) --</option>
                            {availableParents
                                .sort((a, b) => a.level - b.level)
                                .map(r => (
                                    <option key={r.roleType} value={r.roleType}>
                                        {'─'.repeat(r.level)} {r.name} (Lv. {r.level})
                                    </option>
                                ))
                            }
                        </select>
                    </div>

                    {selectedParentRole && (
                        <div className="p-3 bg-gray-50 rounded-lg">
                            <div className="text-sm text-gray-600 mb-1">Nuovo padre selezionato:</div>
                            <div className="flex items-center gap-2">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${selectedParentRole.color.split(' ')[0]}`}>
                                    <selectedParentRole.icon className={`w-4 h-4 ${selectedParentRole.color.split(' ')[1]}`} />
                                </div>
                                <div>
                                    <div className="font-medium text-gray-900">{selectedParentRole.name}</div>
                                    <div className="text-xs text-gray-500">Livello {selectedParentRole.level}</div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={saving}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                        >
                            Annulla
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Move className="w-4 h-4" />}
                            Sposta
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RoleHierarchyPage;
