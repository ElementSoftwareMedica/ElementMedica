import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import CompanyFormNew from '../../components/companies/CompanyFormNew';
import { useCompanies } from '../../hooks/useCompanies';

export default function CompanyCreate() {
  const navigate = useNavigate();
  const { refresh: refreshCompanies } = useCompanies();

  const handleSuccess = () => {
    refreshCompanies();
    navigate('/companies');
  };

  const handleClose = () => {
    navigate('/companies');
  };

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
        onSuccess={handleSuccess}
        onClose={handleClose}
      />
    </div>
  );
} 