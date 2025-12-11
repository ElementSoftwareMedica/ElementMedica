/**
 * VerifyAttestato.tsx
 * Pagina pubblica per la verifica degli attestati tramite QR code
 * Route: /verify/:attestatoNumber
 * 
 * Mostra: cognome, nome, corso, riskLevel, courseType, validità
 */

import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
    CheckCircle,
    XCircle,
    AlertTriangle,
    Calendar,
    User,
    BookOpen,
    Shield,
    Clock,
    Building,
    Loader2
} from 'lucide-react';

interface AttestationData {
    isValid: boolean;
    attestatoNumber: string;
    participant: {
        firstName: string;
        lastName: string;
    };
    course: {
        title: string;
        riskLevel: string;
        courseType: string;
    };
    validity: {
        issueDate: string;
        expirationDate: string;
        validityYears: number;
        isExpired: boolean;
        daysRemaining: number;
    };
    organization?: {
        name: string;
    };
}

interface VerifyResponse {
    success: boolean;
    data?: AttestationData;
    error?: string;
}

// Configurazione colori per risk level
const riskLevelConfig: Record<string, { color: string; bgColor: string; label: string }> = {
    LOW: { color: 'text-green-700', bgColor: 'bg-green-100', label: 'Basso' },
    MEDIUM: { color: 'text-yellow-700', bgColor: 'bg-yellow-100', label: 'Medio' },
    HIGH: { color: 'text-orange-700', bgColor: 'bg-orange-100', label: 'Alto' },
    VERY_HIGH: { color: 'text-red-700', bgColor: 'bg-red-100', label: 'Molto Alto' },
};

// Configurazione per course type (chiavi matchano enum Prisma: CourseType)
const courseTypeConfig: Record<string, { label: string; icon: React.ElementType }> = {
    PRIMO_CORSO: { label: 'Formazione Iniziale', icon: BookOpen },
    AGGIORNAMENTO: { label: 'Aggiornamento', icon: Clock },
};

const VerifyAttestato: React.FC = () => {
    const { attestatoNumber } = useParams<{ attestatoNumber: string }>();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<AttestationData | null>(null);

    useEffect(() => {
        const verifyAttestation = async () => {
            if (!attestatoNumber) {
                setError('Numero attestato non fornito');
                setLoading(false);
                return;
            }

            try {
                // Decodifica l'attestatoNumber dall'URL
                const decodedNumber = decodeURIComponent(attestatoNumber);

                // Chiamata API pubblica per verifica - usa path relativo che viene gestito da Nginx proxy
                const response = await fetch(
                    `/api/v1/public/verify-attestato/${encodeURIComponent(decodedNumber)}`
                );

                if (!response.ok) {
                    if (response.status === 404) {
                        setError('Attestato non trovato nel sistema');
                    } else {
                        setError('Errore durante la verifica dell\'attestato');
                    }
                    setLoading(false);
                    return;
                }

                const result: VerifyResponse = await response.json();

                if (result.success && result.data) {
                    setData(result.data);
                } else {
                    setError(result.error || 'Attestato non valido');
                }
            } catch (err) {
                console.error('Verification error:', err);
                setError('Impossibile verificare l\'attestato. Riprova più tardi.');
            } finally {
                setLoading(false);
            }
        };

        verifyAttestation();
    }, [attestatoNumber]);

    // Loading state
    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
                    <Loader2 className="w-16 h-16 text-blue-500 animate-spin mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-gray-700">Verifica in corso...</h2>
                    <p className="text-gray-500 mt-2">Stiamo controllando la validità dell'attestato</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
                    <div className="text-center">
                        <div className="mx-auto w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mb-6">
                            <XCircle className="w-12 h-12 text-red-500" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-800 mb-2">Verifica Fallita</h1>
                        <p className="text-gray-600 mb-6">{error}</p>
                        {attestatoNumber && (
                            <div className="bg-gray-100 rounded-lg p-3 mb-6">
                                <p className="text-sm text-gray-500">Numero attestato ricercato:</p>
                                <p className="font-mono text-gray-700">{decodeURIComponent(attestatoNumber)}</p>
                            </div>
                        )}
                        <div className="text-sm text-gray-500">
                            <p>Se ritieni che questo sia un errore, contatta:</p>
                            <a
                                href="mailto:info@elementmedica.it"
                                className="text-blue-600 hover:underline"
                            >
                                info@elementmedica.it
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Not found state
    if (!data) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
                    <div className="mx-auto w-20 h-20 rounded-full bg-yellow-100 flex items-center justify-center mb-6">
                        <AlertTriangle className="w-12 h-12 text-yellow-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-800 mb-2">Attestato Non Trovato</h1>
                    <p className="text-gray-600">L'attestato richiesto non è stato trovato nel nostro sistema.</p>
                </div>
            </div>
        );
    }

    // Success state - Valid or Expired attestation
    const { isValid, participant, course, validity, organization } = data;
    const riskConfig = riskLevelConfig[course.riskLevel] || riskLevelConfig.LOW;
    const typeConfig = courseTypeConfig[course.courseType] || courseTypeConfig.INITIAL;
    const TypeIcon = typeConfig.icon;

    return (
        <div className={`min-h-screen flex items-center justify-center p-4 ${isValid && !validity.isExpired
            ? 'bg-gradient-to-br from-green-50 to-emerald-100'
            : 'bg-gradient-to-br from-yellow-50 to-orange-100'
            }`}>
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden max-w-lg w-full">
                {/* Header con stato */}
                <div className={`p-6 text-center ${isValid && !validity.isExpired
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600'
                    : 'bg-gradient-to-r from-yellow-500 to-orange-500'
                    }`}>
                    <div className="mx-auto w-20 h-20 rounded-full bg-white/20 backdrop-blur flex items-center justify-center mb-4">
                        {isValid && !validity.isExpired ? (
                            <CheckCircle className="w-12 h-12 text-white" />
                        ) : (
                            <AlertTriangle className="w-12 h-12 text-white" />
                        )}
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-1">
                        {isValid && !validity.isExpired ? 'Attestato Valido' : 'Attestato Scaduto'}
                    </h1>
                    <p className="text-white/80 text-sm">
                        {isValid && !validity.isExpired
                            ? 'Questo attestato è verificato e in corso di validità'
                            : 'Questo attestato è scaduto e richiede rinnovo'
                        }
                    </p>
                </div>

                {/* Contenuto */}
                <div className="p-6 space-y-6">
                    {/* Numero attestato */}
                    <div className="text-center pb-4 border-b">
                        <p className="text-sm text-gray-500 mb-1">Numero Attestato</p>
                        <p className="font-mono text-lg font-semibold text-gray-800">{data.attestatoNumber}</p>
                    </div>

                    {/* Info partecipante */}
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <User className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Partecipante</p>
                            <p className="text-lg font-semibold text-gray-800">
                                {participant.lastName} {participant.firstName}
                            </p>
                        </div>
                    </div>

                    {/* Info corso */}
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                            <BookOpen className="w-6 h-6 text-purple-600" />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm text-gray-500">Corso</p>
                            <p className="text-lg font-semibold text-gray-800">{course.title}</p>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {/* Risk Level Badge */}
                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${riskConfig.bgColor} ${riskConfig.color}`}>
                                    <Shield className="w-3 h-3" />
                                    Rischio {riskConfig.label}
                                </span>
                                {/* Course Type Badge */}
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                                    <TypeIcon className="w-3 h-3" />
                                    {typeConfig.label}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Validità */}
                    <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${validity.isExpired ? 'bg-red-100' : 'bg-green-100'
                            }`}>
                            <Calendar className={`w-6 h-6 ${validity.isExpired ? 'text-red-600' : 'text-green-600'}`} />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm text-gray-500">Validità</p>
                            <div className="space-y-1">
                                <p className="text-sm text-gray-600">
                                    <span className="text-gray-500">Rilasciato:</span>{' '}
                                    <span className="font-medium">{formatDate(validity.issueDate)}</span>
                                </p>
                                <p className="text-sm text-gray-600">
                                    <span className="text-gray-500">Scadenza:</span>{' '}
                                    <span className={`font-medium ${validity.isExpired ? 'text-red-600' : 'text-gray-800'}`}>
                                        {formatDate(validity.expirationDate)}
                                    </span>
                                </p>
                                <p className="text-sm text-gray-600">
                                    <span className="text-gray-500">Durata:</span>{' '}
                                    <span className="font-medium">{validity.validityYears} {validity.validityYears === 1 ? 'anno' : 'anni'}</span>
                                </p>
                                {!validity.isExpired && validity.daysRemaining <= 90 && (
                                    <p className="text-sm text-yellow-600 font-medium mt-2">
                                        ⚠️ Scade tra {validity.daysRemaining} giorni
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Organizzazione (se presente) */}
                    {organization?.name && (
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                                <Building className="w-6 h-6 text-gray-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Rilasciato da</p>
                                <p className="text-lg font-semibold text-gray-800">{organization.name}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-6 py-4 text-center border-t">
                    <p className="text-xs text-gray-500">
                        Verifica effettuata il {formatDate(new Date().toISOString())} alle {formatTime(new Date().toISOString())}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                        Powered by <span className="font-semibold">ElementMedica</span>
                    </p>
                </div>
            </div>
        </div>
    );
};

// Helper functions
function formatDate(dateString: string): string {
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('it-IT', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });
    } catch {
        return dateString;
    }
}

function formatTime(dateString: string): string {
    try {
        const date = new Date(dateString);
        return date.toLocaleTimeString('it-IT', {
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return '';
    }
}

export default VerifyAttestato;
