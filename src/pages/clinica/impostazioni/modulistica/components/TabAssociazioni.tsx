/**
 * Tab Associazioni - Associazione template a prestazioni e medici
 * 
 * @module pages/clinica/impostazioni/modulistica/components
 */

import React from 'react';
import { Info, Search } from 'lucide-react';
import { formatMedicoName } from '../../../../../utils/textFormatters';

// ============================================
// TYPES
// ============================================

interface TabAssociazioniProps {
    prestazioniIds: string[];
    mediciIds: string[];
    consensoCodici: string[];
    prestazioni: Array<{ id: string; nome: string; codice?: string }>;
    medici: Array<{ id: string; firstName: string; lastName: string; gender?: string }>;
    onTogglePrestazione: (id: string) => void;
    onToggleMedico: (id: string) => void;
    onToggleConsensoCodice: (codice: string) => void;
}

const CONSENSO_TYPES = [
    { codice: 'gdpr', label: 'Trattamento dati personali (GDPR)' },
    { codice: 'sanitari', label: 'Trattamento dati sanitari' },
    { codice: 'prestazione', label: 'Consenso alla prestazione sanitaria' },
    { codice: 'chirurgico', label: 'Consenso atto chirurgico/invasivo' },
    { codice: 'marketing', label: 'Marketing' },
    { codice: 'comunicazioni', label: 'Comunicazioni di servizio' },
    { codice: 'fse_alimentazione', label: 'FSE - alimentazione documenti' },
    { codice: 'fse_consultazione', label: 'FSE - consultazione' },
    { codice: 'fse_pregresso', label: 'FSE - dati pregressi' },
    { codice: 'mdl_sorveglianza', label: 'Medicina del Lavoro - sorveglianza sanitaria' },
];

// ============================================
// COMPONENT
// ============================================

const TabAssociazioni: React.FC<TabAssociazioniProps> = ({
    prestazioniIds,
    mediciIds,
    consensoCodici,
    prestazioni,
    medici,
    onTogglePrestazione,
    onToggleMedico,
    onToggleConsensoCodice
}) => {
    const [searchPrestazioni, setSearchPrestazioni] = React.useState('');
    const [searchMedici, setSearchMedici] = React.useState('');

    const filteredPrestazioni = prestazioni.filter(p =>
        p.nome.toLowerCase().includes(searchPrestazioni.toLowerCase()) ||
        p.codice?.toLowerCase().includes(searchPrestazioni.toLowerCase())
    );

    const filteredMedici = medici.filter(m => {
        const fullName = `${m.lastName} ${m.firstName}`.toLowerCase();
        return fullName.includes(searchMedici.toLowerCase());
    });

    return (
        <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                    <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-blue-700">
                        Se non selezioni prestazioni o medici, il template sarà disponibile per tutti.
                        Selezionando associazioni specifiche, il template sarà visibile solo per quei casi.
                    </p>
                </div>
            </div>

            {/* Tipologie consenso */}
            <div>
                <h3 className="font-medium text-gray-900 mb-3">
                    Tipologie consenso associate ({consensoCodici.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {CONSENSO_TYPES.map(consenso => (
                        <label
                            key={consenso.codice}
                            className="flex items-start gap-3 rounded-lg border border-gray-200 p-3 hover:bg-gray-50 cursor-pointer"
                        >
                            <input
                                type="checkbox"
                                checked={consensoCodici.includes(consenso.codice)}
                                onChange={() => onToggleConsensoCodice(consenso.codice)}
                                className="mt-0.5 rounded text-teal-600 focus:ring-teal-500"
                            />
                            <div>
                                <p className="text-sm font-medium text-gray-900">{consenso.label}</p>
                                <p className="text-xs text-gray-500 font-mono">{consenso.codice}</p>
                            </div>
                        </label>
                    ))}
                </div>
            </div>

            {/* Prestazioni */}
            <div>
                <h3 className="font-medium text-gray-900 mb-3">
                    Prestazioni associate ({prestazioniIds.length})
                </h3>
                {prestazioni.length > 10 && (
                    <div className="relative mb-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            value={searchPrestazioni}
                            onChange={(e) => setSearchPrestazioni(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500"
                            placeholder="Cerca prestazione..."
                        />
                    </div>
                )}
                <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                    {filteredPrestazioni.length === 0 ? (
                        <p className="p-4 text-gray-500 text-center text-sm">
                            {searchPrestazioni ? 'Nessuna prestazione trovata' : 'Nessuna prestazione disponibile'}
                        </p>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {filteredPrestazioni.map(p => (
                                <label
                                    key={p.id}
                                    className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer"
                                >
                                    <input
                                        type="checkbox"
                                        checked={prestazioniIds.includes(p.id)}
                                        onChange={() => onTogglePrestazione(p.id)}
                                        className="rounded text-teal-600 focus:ring-teal-500"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-900 truncate text-sm">{p.nome}</p>
                                        {p.codice && <p className="text-xs text-gray-500">{p.codice}</p>}
                                    </div>
                                </label>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Medici */}
            <div>
                <h3 className="font-medium text-gray-900 mb-3">
                    Medici associati ({mediciIds.length})
                </h3>
                {medici.length > 10 && (
                    <div className="relative mb-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            value={searchMedici}
                            onChange={(e) => setSearchMedici(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500"
                            placeholder="Cerca medico..."
                        />
                    </div>
                )}
                <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                    {filteredMedici.length === 0 ? (
                        <p className="p-4 text-gray-500 text-center text-sm">
                            {searchMedici ? 'Nessun medico trovato' : 'Nessun medico disponibile'}
                        </p>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {filteredMedici.map(m => (
                                <label
                                    key={m.id}
                                    className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer"
                                >
                                    <input
                                        type="checkbox"
                                        checked={mediciIds.includes(m.id)}
                                        onChange={() => onToggleMedico(m.id)}
                                        className="rounded text-teal-600 focus:ring-teal-500"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-900 truncate text-sm">
                                            {formatMedicoName(m as Parameters<typeof formatMedicoName>[0])}
                                        </p>
                                    </div>
                                </label>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TabAssociazioni;
