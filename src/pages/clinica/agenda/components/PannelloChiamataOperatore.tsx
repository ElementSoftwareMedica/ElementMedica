/**
 * Pannello Chiamata Operatore - F6.6.2
 * 
 * Interfaccia completa per operatori per gestire le chiamate pazienti:
 * - Lista pazienti accettati in attesa
 * - Chiamata/richiamata con WebSocket broadcast
 * - Assegnazione ambulatorio
 * - Storico chiamate del giorno
 * - Statistiche tempi attesa
 * 
 * @module PannelloChiamataOperatore
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
    Bell,
    BellRing,
    Phone,
    PhoneOff,
    Clock,
    User,
    Users,
    MapPin,
    CheckCircle,
    AlertCircle,
    Search,
    RefreshCw,
    Volume2,
    Timer,
    ArrowRight,
    History,
    TrendingUp,
    Filter
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

interface PazienteInAttesa {
    id: string;
    numeroChiamata: number;
    personaId: string;
    nome: string;
    cognome: string;
    codiceFiscale: string;
    appuntamentoId: string;
    prestazione: string;
    medicoNome: string;
    ambulatorio: string;
    ambulatorioId: string;
    oraArrivo: Date;
    oraAccettazione: Date;
    stato: 'accettato' | 'chiamato' | 'richiamato' | 'in_visita' | 'completato';
    priorita: 'normale' | 'urgente';
    note?: string;
}

interface ChiamataLog {
    id: string;
    numeroChiamata: number;
    pazienteNome: string;
    ambulatorio: string;
    orarioChiamata: Date;
    tipo: 'prima_chiamata' | 'richiamata';
    operatore: string;
}

interface StatisticheChiamate {
    mediaAttesa: number; // minuti
    totaleChiamati: number;
    totaleRichiamati: number;
    totaleInVisita: number;
    totaleCompletati: number;
}

interface PannelloChiamataOperatoreProps {
    /** ID del poliambulatorio */
    poliambulatorioId?: string;
    /** Nome operatore corrente */
    operatoreNome?: string;
    /** Callback quando paziente viene chiamato */
    onChiamata?: (paziente: PazienteInAttesa, tipo: 'chiamata' | 'richiamata') => void;
    /** Callback quando paziente entra in visita */
    onInVisita?: (paziente: PazienteInAttesa) => void;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

const formatTempoAttesa = (oraArrivo: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - oraArrivo.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 60) {
        return `${diffMins} min`;
    }
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m`;
};

const getStatoBadge = (stato: PazienteInAttesa['stato']) => {
    const config = {
        accettato: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'In attesa' },
        chiamato: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Chiamato' },
        richiamato: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Richiamato' },
        in_visita: { bg: 'bg-green-100', text: 'text-green-700', label: 'In visita' },
        completato: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Completato' }
    };
    return config[stato];
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const PannelloChiamataOperatore: React.FC<PannelloChiamataOperatoreProps> = ({
    poliambulatorioId,
    operatoreNome = 'Operatore',
    onChiamata,
    onInVisita
}) => {
    // State - inizializzato vuoto, i dati verranno caricati da API
    const [pazienti, setPazienti] = useState<PazienteInAttesa[]>([]);
    const [selectedPaziente, setSelectedPaziente] = useState<PazienteInAttesa | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterAmbulatorio, setFilterAmbulatorio] = useState<string>('');
    const [filterStato, setFilterStato] = useState<string>('');
    const [showStoricoModal, setShowStoricoModal] = useState(false);
    const [storicoChiamate, setStoricoChiamate] = useState<ChiamataLog[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Statistiche
    const statistiche = useMemo<StatisticheChiamate>(() => {
        const totaleChiamati = pazienti.filter(p => p.stato === 'chiamato' || p.stato === 'richiamato').length;
        const totaleInVisita = pazienti.filter(p => p.stato === 'in_visita').length;
        const totaleCompletati = pazienti.filter(p => p.stato === 'completato').length;

        const tempiAttesa = pazienti
            .filter(p => p.stato === 'accettato')
            .map(p => (new Date().getTime() - p.oraArrivo.getTime()) / 60000);
        const mediaAttesa = tempiAttesa.length > 0
            ? Math.round(tempiAttesa.reduce((a, b) => a + b, 0) / tempiAttesa.length)
            : 0;

        return {
            mediaAttesa,
            totaleChiamati,
            totaleRichiamati: pazienti.filter(p => p.stato === 'richiamato').length,
            totaleInVisita,
            totaleCompletati
        };
    }, [pazienti]);

    // Ambulatori disponibili
    const ambulatori = useMemo(() => {
        const uniqueAmb = [...new Set(pazienti.map(p => p.ambulatorio))];
        return uniqueAmb;
    }, [pazienti]);

    // Filtro pazienti
    const pazientiFiltrati = useMemo(() => {
        return pazienti.filter(p => {
            const matchSearch = !searchQuery ||
                p.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.cognome.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.numeroChiamata.toString().includes(searchQuery);
            const matchAmb = !filterAmbulatorio || p.ambulatorio === filterAmbulatorio;
            const matchStato = !filterStato || p.stato === filterStato;
            return matchSearch && matchAmb && matchStato;
        });
    }, [pazienti, searchQuery, filterAmbulatorio, filterStato]);

    // Handlers
    const handleChiama = useCallback((paziente: PazienteInAttesa) => {
        const tipo = paziente.stato === 'chiamato' ? 'richiamata' : 'chiamata';

        setPazienti(prev => prev.map(p =>
            p.id === paziente.id
                ? { ...p, stato: tipo === 'richiamata' ? 'richiamato' : 'chiamato' }
                : p
        ));

        // Log chiamata
        setStoricoChiamate(prev => [{
            id: Date.now().toString(),
            numeroChiamata: paziente.numeroChiamata,
            pazienteNome: `${paziente.nome} ${paziente.cognome}`,
            ambulatorio: paziente.ambulatorio,
            orarioChiamata: new Date(),
            tipo: tipo === 'richiamata' ? 'richiamata' : 'prima_chiamata',
            operatore: operatoreNome
        }, ...prev]);

        onChiamata?.(paziente, tipo as 'chiamata' | 'richiamata');

        // Simula broadcast WebSocket
        console.log(`[WebSocket] Broadcast chiamata: ${paziente.numeroChiamata} - ${paziente.ambulatorio}`);
    }, [operatoreNome, onChiamata]);

    const handleInVisita = useCallback((paziente: PazienteInAttesa) => {
        setPazienti(prev => prev.map(p =>
            p.id === paziente.id
                ? { ...p, stato: 'in_visita' }
                : p
        ));
        setSelectedPaziente(null);
        onInVisita?.(paziente);
    }, [onInVisita]);

    const handleRefresh = useCallback(async () => {
        setIsLoading(true);
        // Simula refresh da API
        await new Promise(resolve => setTimeout(resolve, 500));
        setIsLoading(false);
    }, []);

    return (
        <div className="flex flex-col h-full bg-gray-50">
            {/* Header con statistiche */}
            <div className="bg-white border-b border-gray-200 p-4">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-teal-100 rounded-lg">
                            <BellRing className="h-6 w-6 text-teal-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Gestione Chiamate</h2>
                            <p className="text-sm text-gray-500">Operatore: {operatoreNome}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowStoricoModal(true)}
                            className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <History className="h-4 w-4" />
                            Storico
                        </button>
                        <button
                            onClick={handleRefresh}
                            disabled={isLoading}
                            className="flex items-center gap-2 px-3 py-2 bg-teal-50 text-teal-700 hover:bg-teal-100 rounded-lg transition-colors disabled:opacity-50"
                        >
                            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                            Aggiorna
                        </button>
                    </div>
                </div>

                {/* Stats cards */}
                <div className="grid grid-cols-4 gap-4">
                    <div className="bg-blue-50 rounded-xl p-3">
                        <div className="flex items-center gap-2 text-blue-600 mb-1">
                            <Timer className="h-4 w-4" />
                            <span className="text-xs font-medium">Media Attesa</span>
                        </div>
                        <p className="text-2xl font-bold text-blue-700">{statistiche.mediaAttesa} min</p>
                    </div>
                    <div className="bg-yellow-50 rounded-xl p-3">
                        <div className="flex items-center gap-2 text-yellow-600 mb-1">
                            <Bell className="h-4 w-4" />
                            <span className="text-xs font-medium">Chiamati</span>
                        </div>
                        <p className="text-2xl font-bold text-yellow-700">{statistiche.totaleChiamati}</p>
                    </div>
                    <div className="bg-green-50 rounded-xl p-3">
                        <div className="flex items-center gap-2 text-green-600 mb-1">
                            <CheckCircle className="h-4 w-4" />
                            <span className="text-xs font-medium">In Visita</span>
                        </div>
                        <p className="text-2xl font-bold text-green-700">{statistiche.totaleInVisita}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                        <div className="flex items-center gap-2 text-gray-600 mb-1">
                            <TrendingUp className="h-4 w-4" />
                            <span className="text-xs font-medium">Completati</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-700">{statistiche.totaleCompletati}</p>
                    </div>
                </div>
            </div>

            {/* Filtri */}
            <div className="bg-white border-b border-gray-200 p-4">
                <div className="flex items-center gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Cerca per nome, cognome o numero..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        />
                    </div>
                    <select
                        value={filterAmbulatorio}
                        onChange={(e) => setFilterAmbulatorio(e.target.value)}
                        className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500"
                    >
                        <option value="">Tutti gli ambulatori</option>
                        {ambulatori.map(amb => (
                            <option key={amb} value={amb}>{amb}</option>
                        ))}
                    </select>
                    <select
                        value={filterStato}
                        onChange={(e) => setFilterStato(e.target.value)}
                        className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500"
                    >
                        <option value="">Tutti gli stati</option>
                        <option value="accettato">In attesa</option>
                        <option value="chiamato">Chiamato</option>
                        <option value="richiamato">Richiamato</option>
                        <option value="in_visita">In visita</option>
                    </select>
                </div>
            </div>

            {/* Lista pazienti */}
            <div className="flex-1 overflow-auto p-4">
                <div className="space-y-3">
                    {pazientiFiltrati.map(paziente => {
                        const statoBadge = getStatoBadge(paziente.stato);
                        const isSelected = selectedPaziente?.id === paziente.id;

                        return (
                            <div
                                key={paziente.id}
                                onClick={() => setSelectedPaziente(isSelected ? null : paziente)}
                                className={`bg-white rounded-xl border-2 transition-all cursor-pointer ${isSelected
                                    ? 'border-teal-500 shadow-lg'
                                    : 'border-gray-200 hover:border-gray-300 hover:shadow'
                                    } ${paziente.priorita === 'urgente' ? 'ring-2 ring-red-200' : ''}`}
                            >
                                <div className="p-4">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-4">
                                            {/* Numero */}
                                            <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${paziente.stato === 'in_visita' ? 'bg-green-100' :
                                                paziente.stato === 'chiamato' || paziente.stato === 'richiamato' ? 'bg-yellow-100' :
                                                    'bg-teal-100'
                                                }`}>
                                                <span className={`text-2xl font-bold ${paziente.stato === 'in_visita' ? 'text-green-700' :
                                                    paziente.stato === 'chiamato' || paziente.stato === 'richiamato' ? 'text-yellow-700' :
                                                        'text-teal-700'
                                                    }`}>
                                                    {paziente.numeroChiamata}
                                                </span>
                                            </div>

                                            {/* Info paziente */}
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-semibold text-gray-900">
                                                        {paziente.cognome} {paziente.nome}
                                                    </h3>
                                                    {paziente.priorita === 'urgente' && (
                                                        <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                                                            URGENTE
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-gray-500">{paziente.prestazione}</p>
                                                <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                                                    <span className="flex items-center gap-1">
                                                        <User className="h-3 w-3" />
                                                        {paziente.medicoNome}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <MapPin className="h-3 w-3" />
                                                        {paziente.ambulatorio}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-end gap-2">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${statoBadge.bg} ${statoBadge.text}`}>
                                                {statoBadge.label}
                                            </span>
                                            <span className="flex items-center gap-1 text-sm text-gray-500">
                                                <Clock className="h-3 w-3" />
                                                {formatTempoAttesa(paziente.oraArrivo)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Actions - expanded */}
                                    {isSelected && (
                                        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                                            <div className="text-sm text-gray-500">
                                                <p>Accettato: {paziente.oraAccettazione.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {(paziente.stato === 'accettato' || paziente.stato === 'chiamato') && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleChiama(paziente);
                                                        }}
                                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${paziente.stato === 'chiamato'
                                                            ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                                                            : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                                                            }`}
                                                    >
                                                        <Bell className="h-4 w-4" />
                                                        {paziente.stato === 'chiamato' ? 'Richiama' : 'Chiama'}
                                                    </button>
                                                )}
                                                {(paziente.stato === 'chiamato' || paziente.stato === 'richiamato') && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleInVisita(paziente);
                                                        }}
                                                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                                                    >
                                                        <ArrowRight className="h-4 w-4" />
                                                        In Visita
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {pazientiFiltrati.length === 0 && (
                        <div className="text-center py-12">
                            <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500">Nessun paziente trovato</p>
                            <p className="text-sm text-gray-400">Modifica i filtri o attendi nuovi check-in</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Quick call footer */}
            <div className="bg-white border-t border-gray-200 p-4">
                <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                        {pazientiFiltrati.filter(p => p.stato === 'accettato').length} pazienti in attesa
                    </div>
                    {pazientiFiltrati.filter(p => p.stato === 'accettato').length > 0 && (
                        <button
                            onClick={() => {
                                const prossimo = pazientiFiltrati.find(p => p.stato === 'accettato');
                                if (prossimo) {
                                    handleChiama(prossimo);
                                }
                            }}
                            className="flex items-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 transition-colors shadow-lg"
                        >
                            <Volume2 className="h-5 w-5" />
                            Chiama Prossimo
                        </button>
                    )}
                </div>
            </div>

            {/* Storico Modal */}
            {showStoricoModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
                        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                            <h3 className="text-lg font-semibold">Storico Chiamate Oggi</h3>
                            <button
                                onClick={() => setShowStoricoModal(false)}
                                className="p-2 hover:bg-gray-100 rounded-lg"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="p-6 overflow-auto max-h-[60vh]">
                            {storicoChiamate.length > 0 ? (
                                <div className="space-y-2">
                                    {storicoChiamate.map(log => (
                                        <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <span className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center font-bold text-teal-700">
                                                    {log.numeroChiamata}
                                                </span>
                                                <div>
                                                    <p className="font-medium">{log.pazienteNome}</p>
                                                    <p className="text-sm text-gray-500">{log.ambulatorio}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className={`px-2 py-1 rounded text-xs ${log.tipo === 'richiamata' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                                                    }`}>
                                                    {log.tipo === 'richiamata' ? 'Richiamato' : 'Chiamato'}
                                                </span>
                                                <p className="text-xs text-gray-400 mt-1">
                                                    {log.orarioChiamata.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    <History className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                                    <p>Nessuna chiamata registrata oggi</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PannelloChiamataOperatore;
