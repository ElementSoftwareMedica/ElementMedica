/**
 * MedicoForm - Credentials Modal
 * 
 * Modal to display created medico credentials.
 */

import React from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import Modal from '../../../../design-system/molecules/Modal/Modal';
import type { CredentialsModalState } from './types';

interface CredentialsModalProps {
    state: CredentialsModalState;
    onClose: () => void;
}

const CredentialsModal: React.FC<CredentialsModalProps> = ({ state, onClose }) => {
    return (
        <Modal
            isOpen={state.open}
            onClose={onClose}
            title="Credenziali di accesso"
        >
            <div className="p-6">
                <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-green-100 rounded-full">
                        <CheckCircle2 className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                            Medico creato con successo
                        </h3>
                        <p className="text-gray-500">
                            Comunica queste credenziali al medico
                        </p>
                    </div>
                </div>
                {state.credentials && (
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                        <div>
                            <label className="text-xs font-medium text-gray-500 uppercase">
                                Username
                            </label>
                            <p className="text-lg font-mono font-semibold text-gray-900">
                                {state.credentials.username}
                            </p>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-500 uppercase">
                                Password Temporanea
                            </label>
                            <p className="text-lg font-mono font-semibold text-gray-900">
                                {state.credentials.temporaryPassword}
                            </p>
                        </div>
                    </div>
                )}
                <p className="text-sm text-amber-600 mt-4 flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    La password deve essere cambiata al primo accesso
                </p>
                <div className="flex justify-end mt-6">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                    >
                        Chiudi
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default CredentialsModal;
