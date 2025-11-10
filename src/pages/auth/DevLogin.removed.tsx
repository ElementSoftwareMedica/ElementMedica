import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { PublicLayout } from '../../components/public/PublicLayout';

// Dev-only auto login page. Uses standard test credentials and redirects to /schedules.
// This route is meant for local development ONLY.
const DevLogin: React.FC = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated, enableDevBypass } = useAuth();
  const [error, setError] = useState<string>('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Run only in development to avoid leaking credentials in production
    if (!(import.meta as any).env?.DEV) {
      setError('Questa pagina è disponibile solo in ambiente di sviluppo');
      return;
    }

    const run = async () => {
      try {
        // Prefer real login; if it fails, enable dev bypass for local checks
        try {
          await login('admin@example.com', 'Admin123!');
        } catch (e) {
          console.warn('⚠️ DevLogin: real login failed, enabling dev bypass');
          enableDevBypass?.();
        }
        setDone(true);
        // Open schedules and auto-open modal for quick visual checks
        navigate('/schedules?openModal=1', { replace: true });
      } catch (e: any) {
        setError(e?.message || 'Errore di login dev');
      }
    };

    run();
  }, [login, navigate]);

  if (isAuthenticated && done) {
    return <Navigate to="/schedules?openModal=1" replace />;
  }

  return (
    <PublicLayout>
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-6 text-center">
          <h2 className="text-2xl font-semibold">Dev Auto Login</h2>
          {error ? (
            <div className="rounded-md bg-red-50 p-4 text-red-700 text-sm">{error}</div>
          ) : (
            <div className="text-gray-600">Eseguo login di sviluppo e reindirizzo…</div>
          )}
        </div>
      </div>
    </PublicLayout>
  );
};

export default DevLogin;