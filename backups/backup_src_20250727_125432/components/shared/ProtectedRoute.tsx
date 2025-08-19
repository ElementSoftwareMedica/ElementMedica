import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface ProtectedRouteProps {
  resource?: string;
  action?: string;
}

/**
 * Protegge le rotte che richiedono autenticazione e verifica i permessi
 * Se resource e action sono specificati, verifica anche i permessi specifici
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ resource, action }) => {
  const { isAuthenticated, isLoading, hasPermission } = useAuth();

  // Mostra loader durante la verifica dell'autenticazione
  if (isLoading) {
    return (
      <div className="h-screen flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Se non autenticato, reindirizza al login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Se sono richiesti permessi specifici, verifica
  if (resource && action && !hasPermission(resource, action)) {
    return (
      <div className="h-screen flex flex-col justify-center items-center text-center px-4">
        <h1 className="text-2xl font-bold mb-4">Accesso negato</h1>
        <p className="text-gray-600 mb-6">
          Non hai i permessi necessari per accedere a questa sezione.
        </p>
        <button 
          onClick={() => window.history.back()} 
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Torna indietro
        </button>
      </div>
    );
  }

  // Se autenticato e con i permessi corretti, mostra il contenuto
  return <Outlet />;
};

export default ProtectedRoute;