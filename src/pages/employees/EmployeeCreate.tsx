import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import EmployeeFormNew from '../../components/employees/EmployeeFormNew';
import { useToast } from '../../hooks/useToast';
import { apiGet } from '../../services/api';
import { Company } from '../../types';

const MAX_RETRY_ATTEMPTS = 3;

const EmployeeCreate: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const isFetchingRef = useRef(false);
  const attemptsRef = useRef(0);
  const hasFetchedRef = useRef(false);

  // Stable fetch function using refs to avoid dependency issues
  const fetchCompanies = useCallback(async () => {
    // Prevent concurrent fetches and re-fetching after success
    if (isFetchingRef.current || hasFetchedRef.current) return;

    if (attemptsRef.current >= MAX_RETRY_ATTEMPTS) {
      showToast({
        message: `Failed to load companies after ${MAX_RETRY_ATTEMPTS} attempts. You can continue, but won't be able to select a company.`,
        type: 'error'
      });
      setLoading(false);
      return;
    }

    isFetchingRef.current = true;

    try {
      const data = await apiGet<Company[]>('/api/v1/companies');
      setCompanies(data);
      setLoading(false);
      hasFetchedRef.current = true; // Mark as successfully fetched
    } catch (error) {
      console.error('Error fetching companies:', error);

      attemptsRef.current += 1;

      if (attemptsRef.current >= MAX_RETRY_ATTEMPTS) {
        showToast({
          message: `Error: ${error instanceof Error ? error.message : 'Failed to load companies'}`,
          type: 'error'
        });
        setLoading(false);
      } else {
        // Retry with exponential backoff - NO state updates to avoid re-renders
        const delay = 1000 * Math.pow(2, attemptsRef.current - 1);
        setTimeout(() => {
          isFetchingRef.current = false;
          fetchCompanies(); // Direct recursive call instead of state trigger
        }, delay);
        return; // Don't reset isFetchingRef yet - will be done after retry
      }
    }

    isFetchingRef.current = false;
  }, [showToast]);

  // Single fetch on mount - no dependencies that could cause re-runs
  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const handleSuccess = () => {
    navigate('/employees');
  };

  const handleClose = () => {
    navigate('/employees');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full p-8">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-600">Caricamento aziende...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-4">
        <Link
          to="/employees"
          className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Torna all'elenco persone
        </Link>
      </div>

      <EmployeeFormNew
        companies={companies}
        onSuccess={handleSuccess}
        onClose={handleClose}
        roleType="EMPLOYEE"
      />
    </div>
  );
};

export default EmployeeCreate;