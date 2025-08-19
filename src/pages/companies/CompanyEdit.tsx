import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import CompanyFormNew from '../../components/companies/CompanyFormNew';
import { useCompanies } from '../../hooks/useCompanies';
import { useToast } from '../../hooks/useToast';
import { apiGet } from '../../services/api';
import { getLoadingErrorMessage } from '../../utils/errorUtils';

export default function CompanyEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { companies, refresh: refreshCompanies } = useCompanies();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(id ? true : false);
  const [company, setCompany] = useState<any>(null);
  const [fetchAttempts, setFetchAttempts] = useState(0);
  const isFetchingRef = useRef(false);
  const companyDataFetchedRef = useRef(false); // Track if we've already fetched company data
  const MAX_RETRY_ATTEMPTS = 3;
  
  // Fetch company data with improved retry logic
  useEffect(() => {
    // If we've already successfully fetched the company data, don't fetch again
    // This prevents the company data from being reloaded during form editing
    if (!id || isFetchingRef.current || companyDataFetchedRef.current) return;
    
    const fetchCompany = async () => {
      if (fetchAttempts >= MAX_RETRY_ATTEMPTS) {
        showToast({
          message: `Failed to load company data after ${MAX_RETRY_ATTEMPTS} attempts.`,
          type: 'error'
        });
        setLoading(false);
        navigate('/companies');
        return;
      }
      
      isFetchingRef.current = true;
      
      try {
        const data = await apiGet(`/companies/${id}`);
        setCompany(data);
        companyDataFetchedRef.current = true; // Mark that we've successfully fetched company data
        setLoading(false);
      } catch (error) {
        console.error('Error fetching company:', error);
        
        // Increment attempt counter
        const nextAttempt = fetchAttempts + 1;
        setFetchAttempts(nextAttempt);
        
        if (error instanceof Error && error.message.includes('not found')) {
          // If it's a 404, show message and navigate away immediately
          showToast({
            message: 'Errore: Azienda non trovata',
            type: 'error'
          });
          setLoading(false);
          navigate('/companies');
        } else if (nextAttempt >= MAX_RETRY_ATTEMPTS) {
          // If we've reached max attempts, give up
          const sanitizedError = getLoadingErrorMessage('companies', error);
          showToast({
            message: `Errore: ${sanitizedError}`,
            type: 'error'
          });
          setLoading(false);
          navigate('/companies');
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
    
    fetchCompany();
  }, [id, navigate, showToast, fetchAttempts]);

  const handleSuccess = () => {
    refreshCompanies();
    navigate('/companies');
  };

  const handleClose = () => {
    navigate('/companies');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full p-8">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-600">
            {fetchAttempts > 0 ? `Loading company data (attempt ${fetchAttempts + 1}/${MAX_RETRY_ATTEMPTS})...` : 'Loading company data...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-4">
        <Link 
          to="/companies" 
          className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Torna all'elenco aziende
        </Link>
      </div>
      
      <CompanyFormNew
        company={company}
        onSuccess={handleSuccess}
        onClose={handleClose}
      />
    </div>
  );
}