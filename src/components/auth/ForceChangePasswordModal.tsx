import { useState } from 'react';
import { Eye, EyeOff, Lock, AlertTriangle, CheckCircle } from 'lucide-react';
import { changePassword } from '@/services/auth';

interface ForceChangePasswordModalProps {
  currentPassword?: string; // Opzionale: può essere assente dopo page reload
  onSuccess: () => void;
  onLogout: () => void;
}

/**
 * Modal forzato per cambio password al primo accesso.
 * Non può essere chiuso senza cambiare la password o effettuare il logout.
 * Supporta sia il flusso post-login (currentPassword fornita) che post-reload (currentPassword assente).
 */
export default function ForceChangePasswordModal({
  currentPassword,
  onSuccess,
  onLogout,
}: ForceChangePasswordModalProps) {
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const effectiveCurrentPassword = currentPassword || currentPasswordInput;
  const needsCurrentInput = !currentPassword;

  // Validazione password
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(newPassword);
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;
  const isDifferentFromCurrent = newPassword !== effectiveCurrentPassword;

  const isValid =
    (!needsCurrentInput || currentPasswordInput.length > 0) &&
    hasMinLength &&
    hasUppercase &&
    hasLowercase &&
    hasNumber &&
    hasSpecial &&
    passwordsMatch &&
    isDifferentFromCurrent;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    setIsLoading(true);
    setError('');

    try {
      await changePassword(effectiveCurrentPassword, newPassword);
      onSuccess();
    } catch (err) {
      setError(
        'Errore durante il cambio password. Riprova.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const ValidationItem = ({
    valid,
    text,
  }: {
    valid: boolean;
    text: string;
  }) => (
    <li className={`flex items-center gap-2 text-sm ${valid ? 'text-green-600' : 'text-gray-500'}`}>
      {valid ? (
        <CheckCircle className="h-4 w-4 flex-shrink-0" />
      ) : (
        <div className="h-4 w-4 rounded-full border-2 border-gray-300 flex-shrink-0" />
      )}
      {text}
    </li>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-4 flex items-center gap-3">
          <div className="bg-amber-100 rounded-full p-2">
            <AlertTriangle className="h-6 w-6 text-amber-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Cambio Password Obbligatorio
            </h2>
            <p className="text-sm text-gray-600">
              Per motivi di sicurezza, devi aggiornare la password al primo accesso.
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Password attuale - solo se non viene dal flusso post-login */}
          {needsCurrentInput && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Password Attuale
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPasswordInput}
                  onChange={(e) => setCurrentPasswordInput(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                  placeholder="Inserisci la password attuale"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Nuova password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Nuova Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                placeholder="Inserisci la nuova password"
                autoFocus={!needsCurrentInput}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Conferma password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Conferma Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                placeholder="Ripeti la nuova password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Requisiti password */}
          {newPassword.length > 0 && (
            <ul className="space-y-1.5 bg-gray-50 rounded-lg p-3">
              <ValidationItem valid={hasMinLength} text="Almeno 8 caratteri" />
              <ValidationItem valid={hasUppercase} text="Almeno una lettera maiuscola" />
              <ValidationItem valid={hasLowercase} text="Almeno una lettera minuscola" />
              <ValidationItem valid={hasNumber} text="Almeno un numero" />
              <ValidationItem valid={hasSpecial} text="Almeno un carattere speciale" />
              <ValidationItem valid={isDifferentFromCurrent} text="Diversa dalla password attuale" />
              {confirmPassword.length > 0 && (
                <ValidationItem valid={passwordsMatch} text="Le password coincidono" />
              )}
            </ul>
          )}

          {/* Azioni */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onLogout}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Esci
            </button>
            <button
              type="submit"
              disabled={!isValid || isLoading}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              {isLoading ? 'Aggiornamento...' : 'Aggiorna Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
