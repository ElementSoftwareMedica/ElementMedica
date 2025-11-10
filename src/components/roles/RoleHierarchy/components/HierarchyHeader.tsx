/**
 * Component: HierarchyHeader
 * 
 * Header section with view mode toggle, search, filters, and statistics.
 */

import React from 'react';
import { 
  TreePine, 
  Shield, 
  Users, 
  UserCheck, 
  Plus, 
  Search, 
  Filter 
} from 'lucide-react';
import type { RoleHierarchyType, UserRoleHierarchy } from '../types';

interface HierarchyHeaderProps {
  viewMode: 'list' | 'tree';
  setViewMode: (mode: 'list' | 'tree') => void;
  hierarchy: RoleHierarchyType;
  currentUserHierarchy: UserRoleHierarchy | null;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  showOnlyAssignable: boolean;
  setShowOnlyAssignable: (show: boolean) => void;
  onCreateRole: () => void;
}

export const HierarchyHeader: React.FC<HierarchyHeaderProps> = ({
  viewMode,
  setViewMode,
  hierarchy,
  currentUserHierarchy,
  searchTerm,
  setSearchTerm,
  showOnlyAssignable,
  setShowOnlyAssignable,
  onCreateRole
}) => {
  return (
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
              onClick={onCreateRole}
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
  );
};
