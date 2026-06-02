import React, { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth, IdentifyAccount } from '../../context/AuthContext';
import { Eye, EyeOff, Lock, User, AlertCircle, ChevronRight, ArrowLeft, Users, Shield, AlertTriangle } from 'lucide-react';
import { PublicLayout } from '../../components/public/PublicLayout';
import { ValidationMessage } from '../../components/ui/ValidationMessage';
import ForceChangePasswordModal from '../../components/auth/ForceChangePasswordModal';

// Subscription error codes e messaggi user-friendly
const SUBSCRIPTION_ERROR_MESSAGES: Record<string, string> = {
  TENANT_INACTIVE: 'L\'organizzazione non è attiva. Contatta l\'amministratore per informazioni.',
  SUBSCRIPTION_CANCELLED: 'L\'abbonamento è stato cancellato. Contatta l\'amministratore per riattivarlo.',
  SUBSCRIPTION_SUSPENDED: 'L\'abbonamento è sospeso per mancato pagamento. Contatta l\'amministratore.',
  SUBSCRIPTION_EXPIRED: 'L\'abbonamento è scaduto. Contatta l\'amministratore per rinnovare.',
  TRIAL_EXPIRED: 'Il periodo di prova è terminato. Attiva un piano per continuare a utilizzare la piattaforma.',
  ALL_FEATURES_EXPIRED: 'Tutte le funzionalità sono scadute. Contatta l\'amministratore per rinnovare.',
};

const isSubscriptionError = (code: string | undefined): boolean =>
  !!code && code in SUBSCRIPTION_ERROR_MESSAGES;

type LoginStep = 'identify' | 'select-account' | 'password';

interface AccountWithSelection extends IdentifyAccount {
  selected?: boolean;
}

const LoginPage: React.FC = () => {
  // Step state
  const [step, setStep] = useState<LoginStep>('identify');

  // Form state
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Multi-step state
  const [accounts, setAccounts] = useState<AccountWithSelection[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [selectedDisplayName, setSelectedDisplayName] = useState<string>('');
  const [useAlternativeId, setUseAlternativeId] = useState(false);
  const [alternativeIdentifier, setAlternativeIdentifier] = useState('');

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [touched, setTouched] = useState<{ identifier: boolean; password: boolean; alternativeId: boolean }>({
    identifier: false,
    password: false,
    alternativeId: false
  });

  const { login, loginWithPersonId, identify, isAuthenticated, mustChangePassword, pendingPassword, clearMustChangePassword, logout } = useAuth();
  const navigate = useNavigate();

  // Mostra errore abbonamento se l'utente è stato disconnesso mid-session
  useEffect(() => {
    const savedError = sessionStorage.getItem('subscriptionError');
    const savedCode = sessionStorage.getItem('subscriptionErrorCode');
    if (savedError && savedCode) {
      setError(savedError);
      setErrorCode(savedCode);
      sessionStorage.removeItem('subscriptionError');
      sessionStorage.removeItem('subscriptionErrorCode');
    }
  }, []);

  // Redirect quando isAuthenticated diventa true dopo login (ma non se deve cambiare password)
  useEffect(() => {
    if (loginSuccess && isAuthenticated && !mustChangePassword) {
      const savedRedirect = sessionStorage.getItem('redirectAfterLogin');
      if (savedRedirect && savedRedirect !== '/login') {
        sessionStorage.removeItem('redirectAfterLogin');
        navigate(savedRedirect, { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [loginSuccess, isAuthenticated, mustChangePassword, navigate]);

  // Se già autenticato, reindirizza alla dashboard
  if (isAuthenticated && !loginSuccess) {
    return <Navigate to="/dashboard" replace />;
  }

  // Validazione campi
  const getFieldError = (field: 'identifier' | 'password' | 'alternativeId'): string | undefined => {
    if (!touched[field]) return undefined;
    if (field === 'identifier' && !identifier.trim()) {
      return 'Inserisci email, username o codice fiscale';
    }
    if (field === 'password' && !password) {
      return 'Inserisci la password';
    }
    if (field === 'alternativeId' && useAlternativeId && !alternativeIdentifier.trim()) {
      return 'Inserisci username o codice fiscale';
    }
    return undefined;
  };

  const identifierError = getFieldError('identifier');
  const passwordError = getFieldError('password');
  const alternativeIdError = getFieldError('alternativeId');

  // Step 1: Identify
  const handleIdentify = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ ...touched, identifier: true });

    if (!identifier.trim()) return;

    setIsLoading(true);
    setError('');

    try {
      const result = await identify(identifier);

      if (!result.success) {
        setError(result.message || 'Account non trovato');
        setIsLoading(false);
        return;
      }

      if (result.unique) {
        // Account univoco - vai diretto alla password
        setSelectedPersonId(result.personId!);
        setSelectedDisplayName(result.displayName || identifier);
        setStep('password');
      } else if (result.accounts && result.accounts.length > 0) {
        // Più account - mostra selezione
        setAccounts(result.accounts);
        setStep('select-account');
      } else {
        setError('Nessun account attivo trovato');
      }
    } catch (err) {
      setError('Errore durante l\'identificazione');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2a: Select account
  const handleSelectAccount = (personId: string, displayName: string) => {
    setSelectedPersonId(personId);
    setSelectedDisplayName(displayName);
    setStep('password');
  };

  // Step 2b: Use alternative identifier (username/CF)
  const handleUseAlternative = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ ...touched, alternativeId: true });

    if (!alternativeIdentifier.trim()) return;

    setIsLoading(true);
    setError('');

    try {
      const result = await identify(alternativeIdentifier);

      if (!result.success) {
        setError(result.message || 'Account non trovato');
        setIsLoading(false);
        return;
      }

      if (result.unique) {
        setSelectedPersonId(result.personId!);
        setSelectedDisplayName(result.displayName || alternativeIdentifier);
        setStep('password');
      } else {
        setError('Username o Codice Fiscale non univoco. Riprova con un identificativo diverso.');
      }
    } catch (err) {
      setError('Errore durante l\'identificazione');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Login with password
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ ...touched, password: true });

    if (!password) return;

    setIsLoading(true);
    setError('');
    setErrorCode(null);

    try {
      if (selectedPersonId) {
        // Multi-step: login con personId
        await loginWithPersonId(selectedPersonId, password);
      } else {
        // Fallback: login standard
        await login(identifier, password);
      }
      setLoginSuccess(true);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { code?: string; message?: string } } };
      const code = axiosErr?.response?.data?.code;
      if (isSubscriptionError(code)) {
        setErrorCode(code!);
        setError(SUBSCRIPTION_ERROR_MESSAGES[code!]);
      } else {
        setError('Password errata');
      }
      setIsLoading(false);
    }
  };

  // Go back handler
  const handleBack = () => {
    setError('');
    setErrorCode(null);
    setPassword('');
    setTouched({ identifier: false, password: false, alternativeId: false });

    if (step === 'password') {
      if (accounts.length > 0) {
        setStep('select-account');
      } else {
        setStep('identify');
        setSelectedPersonId(null);
        setSelectedDisplayName('');
      }
    } else if (step === 'select-account') {
      setStep('identify');
      setAccounts([]);
      setSelectedPersonId(null);
      setUseAlternativeId(false);
      setAlternativeIdentifier('');
    }
  };

  return (
    <PublicLayout>
      {/* Modal forzato cambio password (primo accesso) */}
      {mustChangePassword && pendingPassword && (
        <ForceChangePasswordModal
          currentPassword={pendingPassword}
          onSuccess={() => {
            clearMustChangePassword();
            setLoginSuccess(true);
          }}
          onLogout={async () => {
            clearMustChangePassword();
            await logout();
            setStep('identify');
            setPassword('');
            setError('');
          }}
        />
      )}
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Accedi al tuo account
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              {step === 'identify' && 'Inserisci le tue credenziali per accedere'}
              {step === 'select-account' && 'Seleziona il tuo account'}
              {step === 'password' && `Inserisci la password per ${selectedDisplayName}`}
            </p>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center justify-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${step === 'identify' ? 'bg-primary-600' : 'bg-gray-300'}`} />
            <div className={`w-8 h-0.5 ${step !== 'identify' ? 'bg-primary-600' : 'bg-gray-300'}`} />
            <div className={`w-3 h-3 rounded-full ${step === 'select-account' ? 'bg-primary-600' : step === 'password' && accounts.length > 0 ? 'bg-primary-600' : 'bg-gray-300'}`} />
            <div className={`w-8 h-0.5 ${step === 'password' ? 'bg-primary-600' : 'bg-gray-300'}`} />
            <div className={`w-3 h-3 rounded-full ${step === 'password' ? 'bg-primary-600' : 'bg-gray-300'}`} />
          </div>

          {/* Step 1: Identify */}
          {step === 'identify' && (
            <form className="mt-8 space-y-6" onSubmit={handleIdentify} noValidate>
              <div className="rounded-md shadow-sm space-y-4">
                <div>
                  <label htmlFor="identifier" className="block text-sm font-medium text-gray-700 mb-1">
                    Email, Username o Codice Fiscale <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                      <User className={`h-4 w-4 ${identifierError ? 'text-red-400' : 'text-gray-400'}`} />
                    </div>
                    <input
                      id="identifier"
                      name="identifier"
                      type="text"
                      autoComplete="username"
                      autoFocus
                      className={`appearance-none relative block w-full pl-9 pr-4 py-2 border placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:z-10 sm:text-sm transition-colors duration-200 ${identifierError
                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                        : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
                        }`}
                      placeholder="Email, username o codice fiscale"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      onBlur={() => setTouched(prev => ({ ...prev, identifier: true }))}
                      aria-invalid={!!identifierError}
                    />
                  </div>
                  <ValidationMessage message={identifierError} type="error" />
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 px-3 py-2 rounded-lg border bg-red-50 border-red-200 animate-slide-down">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-500" />
                  <span className="text-sm font-medium text-red-600">{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Verifica in corso...
                  </div>
                ) : (
                  <div className="flex items-center">
                    Continua
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </div>
                )}
              </button>
            </form>
          )}

          {/* Step 2: Select Account */}
          {step === 'select-account' && (
            <div className="mt-8 space-y-6">
              <button
                type="button"
                onClick={handleBack}
                className="flex items-center text-sm text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Indietro
              </button>

              <div className="space-y-3">
                <p className="text-sm text-gray-600 flex items-center">
                  <Users className="w-4 h-4 mr-2" />
                  Abbiamo trovato {accounts.length} account associati a questa email:
                </p>

                {accounts.map((account) => (
                  <button
                    key={account.personId}
                    onClick={() => handleSelectAccount(account.personId, account.displayName)}
                    className="w-full p-4 border border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors text-left group"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900 group-hover:text-primary-700">
                          {account.displayName}
                        </p>
                        <div className="mt-1 space-y-0.5">
                          {account.tenants.map((tenant) => (
                            <p key={tenant.tenantId} className="text-xs text-gray-500">
                              {tenant.tenantName}
                            </p>
                          ))}
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-primary-600" />
                    </div>
                  </button>
                ))}
              </div>

              {/* Alternative: Use username/CF */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">oppure</span>
                </div>
              </div>

              {!useAlternativeId ? (
                <button
                  type="button"
                  onClick={() => setUseAlternativeId(true)}
                  className="w-full flex items-center justify-center py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Usa Username o Codice Fiscale
                </button>
              ) : (
                <form onSubmit={handleUseAlternative} className="space-y-4">
                  <div>
                    <label htmlFor="alternativeId" className="block text-sm font-medium text-gray-700 mb-1">
                      Username o Codice Fiscale
                    </label>
                    <input
                      id="alternativeId"
                      type="text"
                      autoFocus
                      className={`appearance-none relative block w-full px-3 py-2 border placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:z-10 sm:text-sm ${alternativeIdError
                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                        : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
                        }`}
                      placeholder="Username o RSSMRA85M01H501Z"
                      value={alternativeIdentifier}
                      onChange={(e) => setAlternativeIdentifier(e.target.value)}
                      onBlur={() => setTouched(prev => ({ ...prev, alternativeId: true }))}
                    />
                    <ValidationMessage message={alternativeIdError} type="error" />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
                  >
                    {isLoading ? 'Verifica...' : 'Verifica'}
                  </button>
                </form>
              )}

              {error && (
                <div className={`flex items-start gap-2 px-3 py-2 rounded-lg border ${isSubscriptionError(errorCode ?? undefined)
                  ? 'bg-amber-50 border-amber-300'
                  : 'bg-red-50 border-red-200'
                  }`}>
                  {isSubscriptionError(errorCode ?? undefined)
                    ? <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-500" />
                    : <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-500" />
                  }
                  <span className={`text-sm font-medium ${isSubscriptionError(errorCode ?? undefined) ? 'text-amber-700' : 'text-red-600'
                    }`}>{error}</span>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Password */}
          {step === 'password' && (
            <form className="mt-8 space-y-6" onSubmit={handleLogin} noValidate>
              <button
                type="button"
                onClick={handleBack}
                className="flex items-center text-sm text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Indietro
              </button>

              <div className="rounded-md shadow-sm space-y-4">
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                      <Lock className={`h-4 w-4 ${passwordError ? 'text-red-400' : 'text-gray-400'}`} />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      autoFocus
                      className={`appearance-none relative block w-full pl-[2.25rem] pr-10 py-2 border placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:z-10 sm:text-sm transition-colors duration-200 ${passwordError
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
                      className="absolute inset-y-0 right-0 pr-3 flex items-center z-10"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                      )}
                    </button>
                  </div>
                  <ValidationMessage message={passwordError} type="error" />
                </div>
              </div>

              {error && (
                <div className={`flex items-start gap-2 px-3 py-2 rounded-lg border animate-slide-down ${isSubscriptionError(errorCode ?? undefined)
                  ? 'bg-amber-50 border-amber-300'
                  : 'bg-red-50 border-red-200'
                  }`}>
                  {isSubscriptionError(errorCode ?? undefined)
                    ? <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-500" />
                    : <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-500" />
                  }
                  <span className={`text-sm font-medium ${isSubscriptionError(errorCode ?? undefined) ? 'text-amber-700' : 'text-red-600'
                    }`}>{error}</span>
                </div>
              )}

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
            </form>
          )}
        </div>
      </div>
    </PublicLayout>
  );
};

export default LoginPage;