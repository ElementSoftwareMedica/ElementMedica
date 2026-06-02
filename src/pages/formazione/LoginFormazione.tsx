/**
 * LoginFormazione - Login Page for Element Sicurezza
 * 
 * Variante del login con branding Element Sicurezza (Blue theme)
 * e redirect specifico al modulo formazione.
 * 
 * @module pages/formazione/LoginFormazione
 */

import React, { useState, useEffect } from 'react';
import { Navigate, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Eye, EyeOff, Lock, User, GraduationCap, Building2, Award, Phone, Mail } from 'lucide-react';
import ForceChangePasswordModal from '../../components/auth/ForceChangePasswordModal';

const LoginFormazione: React.FC = () => {
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [loginSuccess, setLoginSuccess] = useState(false);

    const { login, isAuthenticated, mustChangePassword, pendingPassword, clearMustChangePassword, logout } = useAuth();
    const navigate = useNavigate();

    // Redirect quando isAuthenticated diventa true dopo login
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!identifier.trim()) {
            setError('Inserisci email o username');
            return;
        }
        if (!password) {
            setError('Inserisci la password');
            return;
        }
        setIsLoading(true);
        setError('');

        try {
            await login(identifier, password);
            // Setta il flag di successo, il useEffect farà il redirect quando isAuthenticated è true
            setLoginSuccess(true);
        } catch (err) {
            setError('Errore durante il login');
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex" data-brand="element-sicurezza">
            {/* Modal forzato cambio password */}
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
                        setError('');
                        setPassword('');
                    }}
                />
            )}
            {/* Left Panel - Branding */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden" style={{ backgroundImage: 'linear-gradient(to bottom right, var(--color-primary-600), var(--color-primary-700), var(--color-primary-800))' }}>
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                    <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <pattern id="education-pattern" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
                                <circle cx="30" cy="30" r="4" fill="white" />
                                <path d="M30 10 L40 20 L30 30 L20 20 Z" stroke="white" strokeWidth="1" fill="none" />
                            </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#education-pattern)" />
                    </svg>
                </div>

                <div className="relative z-10 flex flex-col justify-center px-12 text-white">
                    {/* Logo */}
                    <div className="flex items-center gap-4 mb-12">
                        <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                            <GraduationCap className="h-10 w-10 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold">ElementSicurezza</h1>
                            <p className="text-white/70">Formazione & Lavoro</p>
                        </div>
                    </div>

                    {/* Features */}
                    <div className="space-y-8 mb-12">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
                                <Building2 className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold mb-1">Gestione Corsi</h3>
                                <p className="text-white/80 text-sm">
                                    Pianificazione, gestione aule e calendario corsi in un'unica piattaforma.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
                                <GraduationCap className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold mb-1">Formazione Sicurezza</h3>
                                <p className="text-white/80 text-sm">
                                    Corsi D.Lgs 81/08, RSPP, primo soccorso e antincendio certificati.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
                                <Award className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold mb-1">Attestati Digitali</h3>
                                <p className="text-white/80 text-sm">
                                    Generazione automatica attestati con QR code verificabile online.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
                                <Lock className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold mb-1">GDPR Compliant</h3>
                                <p className="text-white/80 text-sm">
                                    Sicurezza dei dati e conformità normativa garantita.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="text-sm text-white/70">
                        <p>© 2025 ElementSicurezza - Formazione e Lavoro</p>
                        <p className="mt-1">Un prodotto Element Software</p>
                    </div>
                </div>
            </div>

            {/* Right Panel - Login Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-12">
                <div className="w-full max-w-md">
                    {/* Mobile Logo */}
                    <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
                        <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center">
                            <GraduationCap className="h-7 w-7 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-50">ElementSicurezza</h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Formazione e Lavoro</p>
                        </div>
                    </div>

                    {/* Form Card */}
                    <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-bold text-gray-900">Accedi</h2>
                            <p className="text-gray-500 mt-2">Inserisci le tue credenziali</p>
                        </div>

                        {error && (
                            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} noValidate className="space-y-5">
                            <div>
                                <label htmlFor="identifier" className="block text-sm font-medium text-gray-700 mb-2">
                                    Email o Username
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <User className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        id="identifier"
                                        name="identifier"
                                        type="text"
                                        autoComplete="username"
                                        required
                                        className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all outline-none"
                                        placeholder="email@esempio.com"
                                        value={identifier}
                                        onChange={(e) => setIdentifier(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                                    Password
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        id="password"
                                        name="password"
                                        type={showPassword ? 'text' : 'password'}
                                        autoComplete="current-password"
                                        required
                                        className="w-full pl-12 pr-12 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all outline-none"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
                                    >
                                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                                    />
                                    <span className="ml-2 text-sm text-gray-600">Ricordami</span>
                                </label>
                                <Link to="/forgot-password" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                                    Password dimenticata?
                                </Link>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-3 text-base font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary-200"
                            >
                                {isLoading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        Accesso in corso...
                                    </span>
                                ) : (
                                    'Accedi'
                                )}
                            </button>
                        </form>
                    </div>

                    {/* Contact Info */}
                    <div className="mt-8 text-center">
                        <p className="text-sm text-gray-500 mb-3">Hai bisogno di assistenza?</p>
                        <div className="flex items-center justify-center gap-4 text-sm">
                            <a href="tel:+393516239176" className="flex items-center gap-1 text-gray-600 hover:text-primary-600">
                                <Phone className="h-4 w-4" />
                                <span>Supporto</span>
                            </a>
                            <span className="text-gray-300">|</span>
                            <a href="mailto:info@elementsicurezza.com" className="flex items-center gap-1 text-gray-600 hover:text-primary-600">
                                <Mail className="h-4 w-4" />
                                <span>Email</span>
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginFormazione;
