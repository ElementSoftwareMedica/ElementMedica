import React, { useState, useEffect, useCallback } from 'react';
import { Users } from 'lucide-react';
import { apiGet } from '../../services/api';
import { useToast } from '../../hooks/useToast';

interface Person {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  title?: string;
  photo_url?: string;
  siteId?: string;
}

interface EmployeesSectionProps {
  companyId: string;
}

const EmployeesSection: React.FC<EmployeesSectionProps> = ({ companyId }) => {
  const [employees, setEmployees] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const fetchEmployees = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiGet(`/api/v1/persons?companyId=${companyId}&roleType=EMPLOYEE`) as { persons?: Person[] };
      setEmployees(response.persons || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
      showToast({ message: 'Errore nel caricamento delle persone', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [companyId, showToast]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex flex-col items-center space-y-2">
                <div className="w-16 h-16 bg-gray-200 rounded-full"></div>
                <div className="h-4 bg-gray-200 rounded w-20"></div>
                <div className="h-3 bg-gray-200 rounded w-16"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-800 flex items-center">
          <Users className="h-5 w-5 mr-2" />
          Persone
        </h2>
        <span className="text-sm text-gray-500">
          {employees.length} persone
        </span>
      </div>
      
      <div className="p-6">
        {employees.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nessuna persona trovata</h3>
            <p className="text-gray-500">Non ci sono persone associate a questa azienda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {employees.map((employee) => (
              <div key={employee.id} className="flex flex-col items-center space-y-3 group">
                {/* Avatar con foto o iniziali */}
                <div className="relative">
                  {employee.photo_url ? (
                    <img
                      src={employee.photo_url}
                      alt={`${employee.firstName} ${employee.lastName}`}
                      className="w-16 h-16 rounded-full object-cover border-2 border-gray-200 group-hover:border-blue-300 transition-colors"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center border-2 border-gray-200 group-hover:border-blue-300 transition-colors">
                      <span className="text-white font-semibold text-lg">
                        {getInitials(employee.firstName, employee.lastName)}
                      </span>
                    </div>
                  )}
                  
                  {/* Indicatore online/status */}
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-400 border-2 border-white rounded-full"></div>
                </div>
                
                {/* Informazioni persona */}
                <div className="text-center space-y-1">
                  <h3 className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                    {employee.firstName} {employee.lastName}
                  </h3>
                  <p className="text-xs text-gray-500 leading-tight">
                    {employee.title || 'Persona'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeesSection;