/**
 * MedicoForm - Conflict Modal
 * 
 * Modal to handle 409 Conflict when a person already exists.
 */

import React from 'react';
import { AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import Modal from '../../../../design-system/molecules/Modal/Modal';
import type { ConflictModalState } from './types';

interface ConflictModalProps {
    state: ConflictModalState;
    onClose: () => void;
    onEnable: () => void;
    onBack: () => void;
    isEnabling: boolean;
}

const ConflictModal: React.FC<ConflictModalProps> = ({
    state,
    onClose,
    onEnable,
    onBack,
    isEnabling
}) => {
    return (
        <Modal
            isOpen={state.open}
            onClose={onClose}
            title="Persona già esistente"
        >
            <div className="p-6">
                <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-amber-100 rounded-full">
                        <AlertCircle className="h-6 w-6 text-amber-600" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                            Attenzione
                        </h3>
                        <p className="text-gray-500">
                            {state.message}
                        </p>
                    </div>
                </div>

                {state.existingPersonName && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                        <p className="text-sm text-gray-700">
                            <strong>Persona trovata:</strong> {state.existingPersonName}
                        </p>
                    </div>
                )}

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-amber-800">
                        {state.canEnable ? (
                            <>
                                Questa persona esiste già nel sistema. Puoi abilitarla come medico
                                per la tua organizzazione cliccando su "Abilita come Medico".
                            </>
                        ) : (
                            <>
                                Una persona con lo stesso codice fiscale è già registrata come medico
                                per questa organizzazione. Verifica i dati inseriti.
                            </>
                        )}
                    </p>
                </div>

                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                        Modifica Dati
                    </button>
                    {state.canEnable ? (
                        <button
                            onClick={onEnable}
                            disabled={isEnabling}
                            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
                        >
                            {isEnabling ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Abilitazione...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="h-4 w-4" />
                                    Abilita come Medico
                                </>
                            )}
                        </button>
                    ) : (
                        <button
                            onClick={onBack}
                            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                        >
                            Torna alla Lista
                        </button>
                    )}
                </div>
            </div>
        </Modal>
    );
};

export default ConflictModal;
