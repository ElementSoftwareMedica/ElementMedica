import React from 'react';
import { 
  AlertCircle,
  Settings,
  Shield,
  Users
} from 'lucide-react';
import { Role } from '../../hooks/useRoles';

interface RoleListProps {
  roles: Role[];
  selectedRole: Role | null;
  loading: boolean;
  onSelectRole: (role: Role) => void;
  onDeleteRole: (roleType: string) => void;
}

export const RoleList: React.FC<RoleListProps> = ({
  roles,
  selectedRole,
  loading,
  onSelectRole,
  onDeleteRole
}) => {
  if (loading) {
    return (
      <div className="p-4 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Ruoli Sistema</h2>
            <p className="text-sm text-gray-600">Gestisci i ruoli disponibili</p>
          </div>
        </div>
      </div>

      <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
        {roles.length === 0 ? (
          <div className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Nessun ruolo trovato</p>
          </div>
        ) : (
          roles.map((role) => (
            <div
              key={role.type}
              className={`p-4 cursor-pointer transition-all duration-200 hover:bg-blue-50 ${
                selectedRole?.type === role.type
                  ? 'bg-blue-50 border-r-4 border-blue-600'
                  : ''
              }`}
              onClick={() => onSelectRole(role)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <Users className="w-4 h-4 text-gray-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{role.name}</h3>
                    <p className="text-sm text-gray-500">{role.description}</p>
                    {role.userCount !== undefined && (
                      <p className="text-xs text-blue-600 mt-1">
                        {role.userCount} utenti
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteRole(role.type);
                    }}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                    title="Elimina ruolo"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};