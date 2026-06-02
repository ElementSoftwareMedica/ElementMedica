import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import CompanyForm from '../../components/companies/CompanyForm';
import { useCompanies } from '../../hooks/useCompanies';

export default function CompanyCreate() {
  const navigate = useNavigate();
  const location = useLocation();
  const { refresh: refreshCompanies } = useCompanies();
  const fallbackPath = location.pathname.startsWith('/poliambulatorio/mdl/aziende')
    ? '/poliambulatorio/mdl/aziende'
    : '/companies';
  const backPath = (location.state as { from?: string } | null)?.from || fallbackPath;

  const handleSuccess = () => {
    refreshCompanies();
    navigate(backPath);
  };

  const handleClose = () => {
    navigate(backPath);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-4">
        <Link
          to={backPath}
          className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Torna all'elenco aziende
        </Link>
      </div>

      <CompanyForm
        onSuccess={handleSuccess}
        onClose={handleClose}
      />
    </div>
  );
} 
