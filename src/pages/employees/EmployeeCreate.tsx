import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import EmployeeFormNew from '../../components/employees/EmployeeFormNew';
import { useToast } from '../../hooks/useToast';
import { apiGet} from '../../services/api';
import { Company } from '../../types';

const EmployeeCreate: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchAttempts, setFetchAttempts] = useState(0);
  const isFetchingRef = useRef(false);
  const MAX_RETRY_ATTEMPTS = 3;

  // Fetch companies with improved retry logic
  useEffect(() => {
    if (isFetchingRef.current) return;
    
    const fetchCompanies = async () => {
      if (fetchAttempts >= MAX_RETRY_ATTEMPTS) {
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
      } catch (error) {
        console.error('Error fetching companies:', error);
        
        // Increment attempt counter
        const nextAttempt = fetchAttempts + 1;
        setFetchAttempts(nextAttempt);
        
        if (nextAttempt >= MAX_RETRY_ATTEMPTS) {
          showToast({
            message: `Error: ${error instanceof Error ? error.message : 'Failed to load companies'}`,
            type: 'error'
          });
          setLoading(false);
        } else {
          // Try again after delay with exponential backoff
          setTimeout(() => {
            isFetchingRef.current = false;
            // Force re-render to trigger useEffect again
            setLoading(true);
          }, 1000 * Math.pow(2, nextAttempt - 1));
        }
      } finally {
        isFetchingRef.current = false;
      }
    };
    
    fetchCompanies();
  }, [showToast, fetchAttempts]);

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
          <p className="mt-4 text-gray-600">
            {fetchAttempts > 0 ? `Loading companies (attempt ${fetchAttempts + 1}/${MAX_RETRY_ATTEMPTS})...` : 'Loading companies...'}
          </p>
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
      />
    </div>
  );
};

export default EmployeeCreate;