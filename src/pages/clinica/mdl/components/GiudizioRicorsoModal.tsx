/**
 * GiudizioRicorsoModal
 *
 * Modal per registrare un ricorso avverso giudizio di idoneità (Art. 41 c.9 D.Lgs 81/08).
 * Il lavoratore può presentare ricorso all'organo di vigilanza entro 30 giorni.
 */

import React, { useState } from 'react';
import { Scale, X, AlertTriangle, Loader2 } from 'lucide-react';
import { clinicaApi, type GiudizioIdoneita } from '../../../../services/clinicaApi';
import { DatePickerElegante } from '@/components/ui/DatePickerElegante';
import { useToast } from '../../../../hooks/useToast';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface GiudizioRicorsoModalProps {
    isOpen: boolean;
    giudizio: GiudizioIdoneita;
    onClose: () => void;
    onSuccess: () => void;
}

const GiudizioRicorsoModal: React.FC<GiudizioRicorsoModalProps> = ({
    isOpen,
    giudizio,
    onClose,
    onSuccess
}) => {
    const { showToast } = useToast();
    const [dataRicorso, setDataRicorso] = useState(
        new Date().toISOString().slice(0, 10)
    );
    const [motivazione, setMotivazione] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const workerName = giudizio.person
        ? `${giudizio.person.firstName || ''} ${giudizio.person.lastName || ''}`.trim()
        : '—';

    const ricorsoEntro = giudizio.ricorsoEntro
        ? format(new Date(giudizio.ricorsoEntro), 'dd/MM/yyyy', { locale: it })
        : null;

    const isExpired = giudizio.ricorsoEntro && new Date() > new Date(giudizio.ricorsoEntro);

    const handleSubmit = async () => {
        if (!dataRicorso) {
            setError('La data del ricorso è obbligatoria');
            return;
        }
        setError('');
        setSubmitting(true);
        try {
            await clinicaApi.giudiziIdoneita.registerAppeal(giudizio.id, {
                dataRicorso,
                motivazione: motivazione.trim() || undefined
            });
            onSuccess();
        } catch (err: any) {
            const msg = err?.response?.data?.error || 'Errore nella registrazione del ricorso';
            showToast({ message: msg, type: 'error' });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                            <Scale className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900 dark:text-gray-50">Registra Ricorso</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Art. 41 c.9 D.Lgs 81/08</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    {/* Info giudizio */}
                    <div className="rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700 p-3 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Lavoratore</span>
                            <span className="font-medium text-gray-900 dark:text-gray-50">{workerName}</span>
                        </div>
                        <div className="flex justify-between mt-1">
                            <span className="text-gray-500 dark:text-gray-400">Giudizio</span>
                            <span className="font-medium text-gray-900 dark:text-gray-50">{giudizio.tipoGiudizio.replace(/_/g, ' ')}</span>
                        </div>
                        {ricorsoEntro && (
                            <div className="flex justify-between mt-1">
                                <span className="text-gray-500 dark:text-gray-400">Ricorso entro</span>
                                <span className={`font-medium ${isExpired ? 'text-red-600' : 'text-gray-900 dark:text-gray-50'}`}>
                                    {ricorsoEntro}
                                </span>
                            </div>
                        )}
                    </div>

                    {isExpired && (
                        <div className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 text-sm text-red-700 dark:text-red-300">
                            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                            Il termine per la presentazione del ricorso è scaduto.
                        </div>
                    )}

                    {/* Data ricorso */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Data presentazione ricorso *
                        </label>
                        <DatePickerElegante
                            value={dataRicorso}
                            onChange={(date) => setDataRicorso(date ? date.toISOString().slice(0, 10) : '')}
                        />
                    </div>

                    {/* Motivazione */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Motivazione <span className="text-gray-400 font-normal">(opzionale)</span>
                        </label>
                        <textarea
                            value={motivazione}
                            onChange={(e) => setMotivazione(e.target.value)}
                            rows={3}
                            placeholder="Inserisci le motivazioni del ricorso..."
                            className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                    </div>

                    {error && (
                        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                        Annulla
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting || !dataRicorso}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                    >
                        {submitting ? (
                            <><Loader2 className="h-4 w-4 animate-spin" />Registrazione…</>
                        ) : (
                            <><Scale className="h-4 w-4" />Registra Ricorso</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GiudizioRicorsoModal;
