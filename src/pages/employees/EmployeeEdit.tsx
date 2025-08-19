import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { 
  ChevronLeft,
  Edit
} from 'lucide-react';
import EmployeeFormNew from '../../components/employees/EmployeeFormNew';
import { useToast } from '../../hooks/useToast';
import { apiGet } from '../../services/api';
import { Company } from '../../types';

const EmployeeEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [person, setPerson] = useState<any>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchAttempts, setFetchAttempts] = useState(0);
  const isFetchingRef = useRef(false);
  const dataFetchedRef = useRef(false); // Track if we've already fetched data
  const MAX_RETRY_ATTEMPTS = 3;

  // Fetch employee and companies with improved retry logic
  useEffect(() => {
    if (isFetchingRef.current || dataFetchedRef.current) return;
    
    const fetchData = async () => {
      if (fetchAttempts >= MAX_RETRY_ATTEMPTS) {
        showToast({
          message: `Failed to load data after ${MAX_RETRY_ATTEMPTS} attempts.`,
          type: 'error'
        });
        setLoading(false);
        return;
      }

      isFetchingRef.current = true;
      
      try {
        // Fetch companies first
        const companiesData = await apiGet<Company[]>('/api/v1/companies');
        setCompanies(companiesData || []);
        
        // Fetch person data
        const personData = await apiGet(`/api/v1/persons/${id}`) as any;
        // Ensure companyId is correctly set for compatibility with the form
        if (personData.companyId && !personData.companyId) {
          personData.companyId = personData.companyId;
        }
        setPerson(personData);
        
        // If we get here, both fetches succeeded
        dataFetchedRef.current = true; // Mark that we've successfully fetched data
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        
        // Increment attempt counter
        const nextAttempt = fetchAttempts + 1;
        setFetchAttempts(nextAttempt);
        
        if (nextAttempt >= MAX_RETRY_ATTEMPTS) {
          showToast({
            message: `Error: ${error instanceof Error ? error.message : 'Failed to load data'}`,
            type: 'error'
          });
          setLoading(false);
          
          // Only navigate away on person not found
          if (error instanceof Error && error.message.includes('Person not found')) {
            navigate('/employees');
          }
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
    
    fetchData();
  }, [id, navigate, showToast, fetchAttempts]);

  const handleSuccess = () => {
    navigate(id ? `/employees/${id}` : '/employees');
  };

  const handleClose = () => {
    navigate(id ? `/employees/${id}` : '/employees');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full p-8">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-600">
            {fetchAttempts > 0 ? `Loading data (attempt ${fetchAttempts + 1}/${MAX_RETRY_ATTEMPTS})...` : 'Loading data...'}
          </p>
        </div>
      </div>
    );
  }

  if (id && !person) {
    return (
      <div className="flex flex-col items-center justify-center h-80">
        <p className="text-red-500 mb-4">Persona non trovata</p>
        <Link 
          to="/employees" 
          className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Torna all'elenco persone
        </Link>
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
        person={person}
        companies={companies}
        onSuccess={handleSuccess}
        onClose={handleClose}
      />
    </div>
  );
};

export default EmployeeEdit;