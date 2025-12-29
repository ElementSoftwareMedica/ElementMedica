import React, { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Eye, EyeOff, Lock, User, AlertCircle } from 'lucide-react';
import { PublicLayout } from '../../components/public/PublicLayout';
import { ValidationMessage } from '../../components/ui/ValidationMessage';

const LoginPage: React.FC = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [touched, setTouched] = useState<{ identifier: boolean; password: boolean }>({
    identifier: false,
    password: false
  });

  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Redirect quando isAuthenticated diventa true dopo login
  useEffect(() => {
    if (loginSuccess && isAuthenticated) {
      const savedRedirect = sessionStorage.getItem('redirectAfterLogin');
      if (savedRedirect && savedRedirect !== '/login') {
        sessionStorage.removeItem('redirectAfterLogin');
        navigate(savedRedirect, { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [loginSuccess, isAuthenticated, navigate]);

  // Se già autenticato, reindirizza alla dashboard
  if (isAuthenticated && !loginSuccess) {
    return <Navigate to="/dashboard" replace />;
  }

  // Validazione campi
  const getFieldError = (field: 'identifier' | 'password'): string | undefined => {
    if (!touched[field]) return undefined;
    if (field === 'identifier' && !identifier.trim()) {
      return 'Inserisci email, username o codice fiscale';
    }
    if (field === 'password' && !password) {
      return 'Inserisci la password';
    }
    return undefined;
  };

  const identifierError = getFieldError('identifier');
  const passwordError = getFieldError('password');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Marca tutti i campi come touched
    setTouched({ identifier: true, password: true });

    // Validazione
    if (!identifier.trim() || !password) {
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await login(identifier, password);
      // Setta il flag di successo, il useEffect farà il redirect quando isAuthenticated è true
      setLoginSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore durante il login');
      setIsLoading(false);
    }
  };

  return (
    <PublicLayout>
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Accedi al tuo account
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Inserisci le tue credenziali per accedere
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit} noValidate>
            <div className="rounded-md shadow-sm space-y-4">
              <div>
                <label htmlFor="identifier" className="block text-sm font-medium text-gray-700 mb-1">
                  Email, Username o Codice Fiscale <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className={`h-5 w-5 ${identifierError ? 'text-red-400' : 'text-gray-400'}`} />
                  </div>
                  <input
                    id="identifier"
                    name="identifier"
                    type="text"
                    autoComplete="username"
                    className={`appearance-none relative block w-full pl-10 pr-3 py-2 border placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:z-10 sm:text-sm transition-colors duration-200 ${identifierError
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                      : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
                      }`}
                    placeholder="Email, username o codice fiscale"
                    value={identifier}
                    onChange={(e) => {
                      setIdentifier(e.target.value);
                    }}
                    onBlur={() => setTouched(prev => ({ ...prev, identifier: true }))}
                    aria-invalid={!!identifierError}
                  />
                </div>
                <ValidationMessage message={identifierError} type="error" />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className={`h-5 w-5 ${passwordError ? 'text-red-400' : 'text-gray-400'}`} />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    className={`appearance-none relative block w-full pl-10 pr-10 py-2 border placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:z-10 sm:text-sm transition-colors duration-200 ${passwordError
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                      : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
                      }`}
                    placeholder="Inserisci la tua password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={() => setTouched(prev => ({ ...prev, password: true }))}
                    aria-invalid={!!passwordError}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
                <ValidationMessage message={passwordError} type="error" />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 px-3 py-2 rounded-lg border bg-red-50 border-red-200 animate-slide-down">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-500" />
                <span className="text-sm font-medium text-red-600">{error}</span>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Accesso in corso...
                  </div>
                ) : (
                  'Accedi'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </PublicLayout>
  );
};

export default LoginPage;