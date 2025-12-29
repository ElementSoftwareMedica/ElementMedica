/**
 * DiscountCodeDetail Component
 * 
 * Pagina dedicata per visualizzare i dettagli di un codice sconto
 * Rotta: /management/codici-sconto/:id
 */

import React from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../../services/api';
import {
    ArrowLeft,
    Edit2,
    Tag,
    Calendar,
    Percent,
    Euro,
    Users,
    Building2,
    User,
    Heart,
    Target,
    CheckCircle,
    XCircle,
    Clock,
    AlertCircle,
    Copy,
    Loader2,
    TrendingUp
} from 'lucide-react';

interface CodiceSconto {
    id: string;
    codice: string;
    nome: string;
    descrizione?: string;
    tipoSconto: 'PERCENTUALE' | 'VALORE_ASSOLUTO';
    valore: number;
    dataInizio: string;
    dataFine: string;
    attivo: boolean;
    utilizzoMassimo?: number;
    utilizzoCorrente: number;
    utilizzoPerUtente?: number;
    cumulabile: boolean;
    minImporto?: number;
    maxImporto?: number;
    applicabileA: 'TUTTI' | 'AZIENDE' | 'PERSONE' | 'SPECIFICI';
    applicabileServizi: string[];
    categorieCorso: string[];
    etaMinima?: number | null;
    etaMassima?: number | null;
    genereApplicabile?: 'MALE' | 'FEMALE' | null;
    soloNuoviPazienti?: boolean;
    createdAt?: string;
    updatedAt?: string;
}

const SERVIZI_LABELS: Record<string, { label: string; icon: string }> = {
    CORSO: { label: 'Corsi di Formazione', icon: '📚' },
    MEDICO_COMPETENTE: { label: 'Medico Competente', icon: '👨‍⚕️' },
    DVR: { label: 'DVR', icon: '📋' },
    RSPP: { label: 'RSPP', icon: '🦺' },
    VISITA: { label: 'Visite Mediche', icon: '🏥' },
    BUNDLE: { label: 'Bundle/Pacchetti', icon: '📦' }
};

const APPLICABILITA_LABELS: Record<string, { label: string; icon: typeof Users }> = {
    TUTTI: { label: 'Tutti i clienti', icon: Users },
    AZIENDE: { label: 'Solo Aziende', icon: Building2 },
    PERSONE: { label: 'Solo Privati', icon: User },
    SPECIFICI: { label: 'Clienti Specifici', icon: Target }
};

const DiscountCodeDetail: React.FC = () => {
    const navigate = useNavigate();
    const { id: paramId } = useParams<{ id: string }>();

    // Extract ID from path when useParams doesn't work (nested management routing)
    const id = React.useMemo(() => {
        if (paramId) return paramId;
        // Try to extract from path: /management/codici-sconto/:id
        const pathMatch = window.location.pathname.match(/\/codici-sconto\/([a-f0-9-]+)/i);
        return pathMatch ? pathMatch[1] : undefined;
    }, [paramId]);

    const { data: codiceSconto, isLoading, error } = useQuery({
        queryKey: ['codici-sconto', id],
        queryFn: async () => {
            const response = await apiGet<{ success: boolean; data: CodiceSconto }>(`/api/v1/codici-sconto/${id}`);
            return response?.data;
        },
        enabled: Boolean(id),
    });

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('it-IT', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });
    };

    const getStatus = () => {
        if (!codiceSconto) return null;

        const now = new Date();
        const dataInizio = new Date(codiceSconto.dataInizio);
        const dataFine = new Date(codiceSconto.dataFine);

        if (!codiceSconto.attivo) {
            return { label: 'Disattivato', color: 'gray', icon: XCircle, bgColor: 'bg-gray-100', textColor: 'text-gray-800' };
        }
        if (now > dataFine) {
            return { label: 'Scaduto', color: 'red', icon: AlertCircle, bgColor: 'bg-red-100', textColor: 'text-red-800' };
        }
        if (now < dataInizio) {
            return { label: 'Programmato', color: 'yellow', icon: Clock, bgColor: 'bg-yellow-100', textColor: 'text-yellow-800' };
        }
        if (codiceSconto.utilizzoMassimo && codiceSconto.utilizzoCorrente >= codiceSconto.utilizzoMassimo) {
            return { label: 'Esaurito', color: 'orange', icon: AlertCircle, bgColor: 'bg-orange-100', textColor: 'text-orange-800' };
        }
        return { label: 'Attivo', color: 'green', icon: CheckCircle, bgColor: 'bg-green-100', textColor: 'text-green-800' };
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        // Could add toast notification here
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (error || !codiceSconto) {
        return (
            <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Codice non trovato</h2>
                <p className="text-gray-600 mb-4">Il codice sconto richiesto non esiste o è stato eliminato.</p>
                <button
                    onClick={() => navigate('/management/codici-sconto')}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                >
                    ← Torna alla lista
                </button>
            </div>
        );
    }

    const status = getStatus();
    const StatusIcon = status?.icon || CheckCircle;
    const ApplicabilitaIcon = APPLICABILITA_LABELS[codiceSconto.applicabileA]?.icon || Users;

    return (
        <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <button
                    onClick={() => navigate('/management/codici-sconto')}
                    className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 mr-2" />
                    Torna ai Codici Sconto
                </button>

                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                            <Tag className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h1 className="text-2xl font-bold text-gray-900">{codiceSconto.nome}</h1>
                                {status && (
                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${status.bgColor} ${status.textColor}`}>
                                        <StatusIcon className="w-4 h-4 mr-1" />
                                        {status.label}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <code className="text-lg font-mono font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-lg">
                                    {codiceSconto.codice}
                                </code>
                                <button
                                    onClick={() => copyToClipboard(codiceSconto.codice)}
                                    className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                                    title="Copia codice"
                                >
                                    <Copy className="w-4 h-4 text-gray-400" />
                                </button>
                            </div>
                        </div>
                    </div>

                    <Link
                        to={`/management/codici-sconto/${id}/modifica`}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Edit2 className="w-4 h-4 mr-2" />
                        Modifica
                    </Link>
                </div>
            </div>

            {/* Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Info */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Descrizione */}
                    {codiceSconto.descrizione && (
                        <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Descrizione</h2>
                            <p className="text-gray-700">{codiceSconto.descrizione}</p>
                        </section>
                    )}

                    {/* Valore Sconto */}
                    <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            {codiceSconto.tipoSconto === 'PERCENTUALE' ? (
                                <Percent className="w-5 h-5 text-green-600" />
                            ) : (
                                <Euro className="w-5 h-5 text-green-600" />
                            )}
                            Valore Sconto
                        </h2>

                        <div className="flex items-baseline gap-2 mb-4">
                            <span className="text-4xl font-bold text-green-600">
                                {codiceSconto.tipoSconto === 'PERCENTUALE'
                                    ? `${codiceSconto.valore}%`
                                    : `€${Number(codiceSconto.valore).toFixed(2)}`}
                            </span>
                            <span className="text-gray-500">
                                {codiceSconto.tipoSconto === 'PERCENTUALE' ? 'di sconto' : 'fisso'}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 bg-gray-50 rounded-lg">
                                <div className="text-sm text-gray-500">Importo Minimo</div>
                                <div className="font-semibold text-gray-900">
                                    {codiceSconto.minImporto ? `€${Number(codiceSconto.minImporto).toFixed(2)}` : 'Nessuno'}
                                </div>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-lg">
                                <div className="text-sm text-gray-500">Sconto Massimo</div>
                                <div className="font-semibold text-gray-900">
                                    {codiceSconto.maxImporto ? `€${Number(codiceSconto.maxImporto).toFixed(2)}` : 'Nessuno'}
                                </div>
                            </div>
                        </div>

                        {codiceSconto.cumulabile && (
                            <div className="mt-4 flex items-center gap-2 text-purple-600 bg-purple-50 px-3 py-2 rounded-lg">
                                <CheckCircle className="w-4 h-4" />
                                <span className="font-medium text-sm">Cumulabile con altri codici</span>
                            </div>
                        )}
                    </section>

                    {/* Applicabilità */}
                    <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <ApplicabilitaIcon className="w-5 h-5 text-purple-600" />
                            Applicabilità
                        </h2>

                        <div className="mb-4">
                            <div className="text-sm text-gray-500 mb-1">Tipo Cliente</div>
                            <div className="font-semibold text-gray-900">
                                {APPLICABILITA_LABELS[codiceSconto.applicabileA]?.label || codiceSconto.applicabileA}
                            </div>
                        </div>

                        <div>
                            <div className="text-sm text-gray-500 mb-2">Servizi Applicabili</div>
                            <div className="flex flex-wrap gap-2">
                                {codiceSconto.applicabileServizi.map((servizio) => (
                                    <span
                                        key={servizio}
                                        className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium"
                                    >
                                        <span>{SERVIZI_LABELS[servizio]?.icon || '📌'}</span>
                                        {SERVIZI_LABELS[servizio]?.label || servizio}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* Targeting Avanzato */}
                    {(codiceSconto.etaMinima || codiceSconto.etaMassima || codiceSconto.genereApplicabile || codiceSconto.soloNuoviPazienti) && (
                        <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <Target className="w-5 h-5 text-purple-600" />
                                Targeting Avanzato
                            </h2>

                            <div className="space-y-3">
                                {(codiceSconto.etaMinima || codiceSconto.etaMassima) && (
                                    <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                                        <Calendar className="w-5 h-5 text-purple-600" />
                                        <div>
                                            <div className="text-sm text-gray-500">Range Età</div>
                                            <div className="font-semibold text-gray-900">
                                                {codiceSconto.etaMinima || 0} - {codiceSconto.etaMassima || '∞'} anni
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {codiceSconto.genereApplicabile && (
                                    <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-lg">
                                        <User className="w-5 h-5 text-indigo-600" />
                                        <div>
                                            <div className="text-sm text-gray-500">Genere</div>
                                            <div className="font-semibold text-gray-900">
                                                {codiceSconto.genereApplicabile === 'MALE' ? 'Solo Maschi' : 'Solo Femmine'}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {codiceSconto.soloNuoviPazienti && (
                                    <div className="flex items-center gap-3 p-3 bg-pink-50 rounded-lg">
                                        <Heart className="w-5 h-5 text-pink-600" />
                                        <div>
                                            <div className="text-sm text-gray-500">Tipo Paziente</div>
                                            <div className="font-semibold text-gray-900">Solo Nuovi Pazienti</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </section>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Validità */}
                    <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-orange-600" />
                            Validità
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <div className="text-sm text-gray-500">Da</div>
                                <div className="font-semibold text-gray-900">{formatDate(codiceSconto.dataInizio)}</div>
                            </div>
                            <div>
                                <div className="text-sm text-gray-500">A</div>
                                <div className="font-semibold text-gray-900">{formatDate(codiceSconto.dataFine)}</div>
                            </div>
                        </div>
                    </section>

                    {/* Utilizzi */}
                    <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-blue-600" />
                            Utilizzi
                        </h2>

                        <div className="text-center mb-4">
                            <div className="text-4xl font-bold text-blue-600">{codiceSconto.utilizzoCorrente}</div>
                            <div className="text-gray-500">
                                {codiceSconto.utilizzoMassimo
                                    ? `su ${codiceSconto.utilizzoMassimo} disponibili`
                                    : 'utilizzi totali'}
                            </div>
                        </div>

                        {codiceSconto.utilizzoMassimo && (
                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                                <div
                                    className="bg-blue-600 h-2.5 rounded-full transition-all"
                                    style={{ width: `${Math.min((codiceSconto.utilizzoCorrente / codiceSconto.utilizzoMassimo) * 100, 100)}%` }}
                                />
                            </div>
                        )}

                        {codiceSconto.utilizzoPerUtente && (
                            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                                <div className="text-sm text-gray-500">Max per utente</div>
                                <div className="font-semibold text-gray-900">{codiceSconto.utilizzoPerUtente}</div>
                            </div>
                        )}
                    </section>

                    {/* Meta */}
                    <section className="bg-gray-50 rounded-xl border border-gray-200 p-4">
                        <div className="space-y-2 text-sm">
                            {codiceSconto.createdAt && (
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Creato il</span>
                                    <span className="text-gray-700">{formatDate(codiceSconto.createdAt)}</span>
                                </div>
                            )}
                            {codiceSconto.updatedAt && (
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Modificato il</span>
                                    <span className="text-gray-700">{formatDate(codiceSconto.updatedAt)}</span>
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default DiscountCodeDetail;
