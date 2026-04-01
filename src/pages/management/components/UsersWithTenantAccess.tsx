/**
 * UsersWithTenantAccess Component
 * 
 * Mostra gli utenti con accesso a un tenant specifico
 * Carica direttamente le persone associate al tenant via tenantId
 * @project 43 - Tenant Roles Management System
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Shield, Search, Filter, Plus, Edit2, Trash2, Check, X, Eye, Loader2 } from 'lucide-react';
import { apiGet } from '../../../services/api';
import { managementApi } from '../api';
import type { TenantAccessLevel, Feature } from '../types';
import type { PersonTenantProfile } from '../../../types/personMultiTenant';

interface Person {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  globalRole?: string;
  status?: string;
  profileImage?: string;
  tenantId: string;
  isActive?: boolean;
  personRoles?: Array<{
    roleType: string;
    isActive: boolean;
    isPrimary: boolean;
  }>;
  // Progetto 48: Multi-tenant support
  tenantProfiles?: PersonTenantProfile[];
  currentProfile?: PersonTenantProfile;
}

interface UsersWithTenantAccessProps {
  tenantId: string;
  tenantName?: string;
}

const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'bg-red-100 text-red-800',
  SUPER_ADMIN: 'bg-purple-100 text-purple-800',
  MANAGER: 'bg-blue-100 text-blue-800',
  TRAINER: 'bg-green-100 text-green-800',
  EMPLOYEE: 'bg-gray-100 text-gray-800',
};

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin',
  SUPER_ADMIN: 'Super Admin',
  MANAGER: 'Manager',
  TRAINER: 'Formatore',
  EMPLOYEE: 'Dipendente',
};

const UsersWithTenantAccess: React.FC<UsersWithTenantAccessProps> = ({ tenantId, tenantName }) => {
  const navigate = useNavigate();
  const [persons, setPersons] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('');

  useEffect(() => {
    loadData();
  }, [tenantId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Carica le persone direttamente filtrando per tenantId
      const response = await apiGet<{ data: Person[]; total: number }>(
        `/api/v1/persons?tenantId=${tenantId}&limit=500`
      );

      setPersons(response.data || []);
    } catch (err: unknown) {
      setError('Errore nel caricamento degli utenti');
    } finally {
      setLoading(false);
    }
  };

  // Naviga alla pagina di dettaglio
  const handleViewPerson = (person: Person) => {
    navigate(`/management/persons/${person.id}`);
  };

  // Filtra le persone
  const filteredPersons = persons.filter(person => {
    const matchesSearch = !searchTerm ||
      `${person.firstName} ${person.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      person.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const primaryRole = person.personRoles?.find(r => r.isPrimary)?.roleType || person.globalRole || 'EMPLOYEE';
    const matchesRole = !filterRole || primaryRole === filterRole;

    return matchesSearch && matchesRole;
  });

  // Ottiene il ruolo primario
  const getPrimaryRole = (person: Person): string => {
    if (person.globalRole) return person.globalRole;
    const primaryRole = person.personRoles?.find(r => r.isActive);
    return primaryRole?.roleType || 'EMPLOYEE';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        <span className="ml-3 text-gray-600">Caricamento utenti...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Users className="h-5 w-5 mr-2 text-purple-600" />
            Persone in "{tenantName || 'Tenant'}"
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {filteredPersons.length} person{filteredPersons.length !== 1 ? 'e' : 'a'} trovate
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Cerca persona..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          />
        </div>

        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
        >
          <option value="">Tutti i ruoli</option>
          <option value="ADMIN">Admin</option>
          <option value="SUPER_ADMIN">Super Admin</option>
          <option value="MANAGER">Manager</option>
          <option value="TRAINER">Formatore</option>
          <option value="EMPLOYEE">Dipendente</option>
        </select>
      </div>

      {/* Persons Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {filteredPersons.length === 0 ? (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Nessuna persona trovata</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || filterRole
                ? 'Prova a modificare i filtri di ricerca'
                : 'Nessuna persona appartiene a questo tenant'}
            </p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Persona
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ruolo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stato
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Azioni
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPersons.map(person => (
                <tr
                  key={person.id}
                  onClick={() => handleViewPerson(person)}
                  className="hover:bg-purple-50 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0">
                        {person.profileImage ? (
                          <img
                            className="h-10 w-10 rounded-full object-cover"
                            src={person.profileImage}
                            alt=""
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                            <span className="text-purple-600 font-medium text-sm">
                              {person.firstName?.[0]}{person.lastName?.[0]}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {person.firstName} {person.lastName}
                        </div>
                        <div className="text-sm text-gray-500">{person.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[getPrimaryRole(person)] || ROLE_COLORS.EMPLOYEE
                      }`}>
                      <Shield className="w-3 h-3 mr-1" />
                      {ROLE_LABELS[getPrimaryRole(person)] || getPrimaryRole(person)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${person.status === 'ACTIVE' || person.isActive !== false
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                      }`}>
                      {person.status === 'ACTIVE' || person.isActive !== false ? (
                        <><Check className="h-3 w-3 mr-1" /> Attivo</>
                      ) : (
                        <><X className="h-3 w-3 mr-1" /> Inattivo</>
                      )}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewPerson(person);
                      }}
                      className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-full transition-colors inline-flex items-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      Azioni
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default UsersWithTenantAccess;
