import React, { useState, useEffect } from 'react';
import { getEmployees, Employee } from '../../services/employees';

// Mock data for fallback when API fails
const MOCK_EMPLOYEES: Employee[] = [
  {
    id: "mock-emp-1",
    firstName: "Mario",
    lastName: "Rossi",
    email: "mario.rossi@example.com",
    phone: "+39 123 456 7890",
    companyId: "mock-company-1",
    isActive: true,
    status: "ACTIVE" as const,
    roleType: "EMPLOYEE" as const,
    company: {
      id: "mock-company-1",
      ragioneSociale: "Azienda Demo SpA"
    }
  },
  {
    id: "mock-emp-2", 
    firstName: "Luigi",
    lastName: "Verdi",
    email: "luigi.verdi@example.com",
    phone: "+39 123 456 7891",
    companyId: "mock-company-1",
    isActive: true,
    status: "ACTIVE" as const,
    roleType: "EMPLOYEE" as const,
    company: {
      id: "mock-company-1",
      ragioneSociale: "Azienda Demo SpA"
    }
  },
  {
    id: "mock-emp-3",
    firstName: "Giulia",
    lastName: "Bianchi",
    email: "giulia.bianchi@example.com",
    phone: "+39 123 456 7892",
    companyId: "mock-company-2",
    isActive: true,
    status: "ACTIVE" as const,
    roleType: "EMPLOYEE" as const,
    company: {
      id: "mock-company-2",
      ragioneSociale: "Test Srl"
    }
  }
];

export function useEmployees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [usingFallback, setUsingFallback] = useState(false);

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (filter.trim() === '') {
      setFilteredEmployees(employees);
    } else {
      const lowercaseFilter = filter.toLowerCase();
      const filtered = employees.filter(employee => 
        employee.firstName.toLowerCase().includes(lowercaseFilter) ||
        employee.lastName.toLowerCase().includes(lowercaseFilter) ||
        (employee.email && employee.email.toLowerCase().includes(lowercaseFilter)) ||
        (employee.company?.ragioneSociale && employee.company.ragioneSociale.toLowerCase().includes(lowercaseFilter))
      );
      setFilteredEmployees(filtered);
    }
  }, [filter, employees]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setError(null);
      setUsingFallback(false);
      
      // Use timeout to ensure we don't wait too long for API response
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      const response = await getEmployees();
      
      clearTimeout(timeoutId);
      
      if (response && Array.isArray(response)) {
        setEmployees(response);
        setFilteredEmployees(response);
      } else {
        throw new Error('Invalid data format received from API');
      }
    } catch (err: unknown) {
      // Use fallback data
      setEmployees(MOCK_EMPLOYEES);
      setFilteredEmployees(MOCK_EMPLOYEES);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch employees';
      setError(errorMessage);
      setUsingFallback(true);
    } finally {
      setLoading(false);
    }
  };

  return {
    employees,
    filteredEmployees,
    loading,
    error,
    filter,
    setFilter,
    fetchEmployees,
    usingFallback
  };
}