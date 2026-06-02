import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { forgotPassword } from '../../services/auth';
import { getCurrentBrand } from '../../config/brands.config';

const brand = getCurrentBrand();
const isElementMedica = brand.id === 'element-medica';

const ForgotPasswordPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);
        try {
            await forgotPassword(email);
            setSuccess(true);
        } catch {
            setError('Si è verificato un errore. Verifica l\'indirizzo email e riprova.');
        } finally {
            setIsLoading(false);
        }
    };

    if (isElementMedica) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="w-full max-w-md">
                    <div className="bg-white rounded-2xl shadow-xl p-8">
                        <div className="text-center mb-8">
                            <div className="inline-flex items-center justify-center w-14 h-14 bg-teal-100 rounded-full mb-4">
                                <Mail className="h-7 w-7 text-teal-600" />
                            </div>
                            <h1 className="text-2xl font-bold text-gray-900">Recupera Password</h1>
                            <p className="text-gray-500 mt-2 text-sm">
                                Inserisci la tua email per ricevere le istruzioni di reset.
                            </p>
                        </div>

                        {success ? (
                            <div className="text-center py-4">
                                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                                <h2 className="text-lg font-semibold text-gray-900 mb-2">Email inviata!</h2>
                                <p className="text-sm text-gray-600 mb-6">
                                    Se l'indirizzo è registrato, riceverai a breve le istruzioni per reimpostare la password.
                                </p>
                                <Link
                                    to="/login"
                                    className="inline-flex items-center gap-2 text-sm text-teal-600 hover:text-teal-700 font-medium"
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                    Torna al login
                                </Link>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                                        Indirizzo Email
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <Mail className="h-5 w-5 text-gray-400" />
                                        </div>
                                        <input
                                            id="email"
                                            type="email"
                                            required
                                            className="input-clinica"
                                            style={{ paddingLeft: '3rem' }}
                                            placeholder="email@esempio.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                        />
                                    </div>
                                </div>

                                {error && (
                                    <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                                        {error}
                                    </p>
                                )}

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="btn-clinica-primary w-full py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? 'Invio in corso...' : 'Invia istruzioni'}
                                </button>

                                <div className="text-center">
                                    <Link
                                        to="/login"
                                        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-teal-600"
                                    >
                                        <ArrowLeft className="h-4 w-4" />
                                        Torna al login
                                    </Link>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-primary-900 to-slate-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="bg-white rounded-2xl shadow-2xl p-8">
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-14 h-14 bg-primary-100 rounded-full mb-4">
                            <Mail className="h-7 w-7 text-primary-600" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900">Recupera Password</h1>
                        <p className="text-gray-500 mt-2 text-sm">
                            Inserisci la tua email per ricevere le istruzioni di reset.
                        </p>
                    </div>

                    {success ? (
                        <div className="text-center py-4">
                            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                            <h2 className="text-lg font-semibold text-gray-900 mb-2">Email inviata!</h2>
                            <p className="text-sm text-gray-600 mb-6">
                                Se l'indirizzo è registrato, riceverai a breve le istruzioni per reimpostare la password.
                            </p>
                            <Link
                                to="/login"
                                className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Torna al login
                            </Link>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                                    Indirizzo Email
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Mail className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        id="email"
                                        type="email"
                                        required
                                        className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all outline-none"
                                        placeholder="email@esempio.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>
                            </div>

                            {error && (
                                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                                    {error}
                                </p>
                            )}

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-3 text-base font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary-200"
                            >
                                {isLoading ? 'Invio in corso...' : 'Invia istruzioni'}
                            </button>

                            <div className="text-center">
                                <Link
                                    to="/login"
                                    className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-600"
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                    Torna al login
                                </Link>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ForgotPasswordPage;
