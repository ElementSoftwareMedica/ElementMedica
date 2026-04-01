/**
 * QuickActionSiteModal - Modal per aggiungere una sede da CompanyDetails
 * 
 * Modal semplificato per creare rapidamente una nuova sede aziendale.
 * Campi essenziali: nome sede, indirizzo, città, CAP, provincia.
 * 
 * @module components/companies/quick-actions/QuickActionSiteModal
 * @project P58 - Company Details Enhancement
 */

import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Loader2,
    Building2,
    MapPin,
    Phone,
    Mail,
    CheckCircle2,
    AlertTriangle
} from 'lucide-react';
import { useToast } from '../../../hooks/useToast';
import Modal from '../../../design-system/molecules/Modal/Modal';
import { apiPost } from '../../../services/api';
import { cn } from '../../../design-system/utils';
import { useTenantMode } from '../../../contexts/TenantModeContext';

interface QuickActionSiteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    companyId: string;
    companyName: string;
    /** Multi-tenant operation headers (X-Operate-Tenant-Id) */
    operateHeaders?: Record<string, string>;
}

interface FormData {
    siteName: string;
    citta: string;
    indirizzo: string;
    cap: string;
    provincia: string;
    telefono: string;
    mail: string;
}

const initialFormData: FormData = {
    siteName: '',
    citta: '',
    indirizzo: '',
    cap: '',
    provincia: '',
    telefono: '',
    mail: ''
};

export const QuickActionSiteModal: React.FC<QuickActionSiteModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    companyId,
    companyName,
    operateHeaders
}) => {
    const { showToast } = useToast();
    const queryClient = useQueryClient();
    const { getOperateHeaders } = useTenantMode();

    // Usa headers passati o fallback a context
    const effectiveHeaders = operateHeaders || getOperateHeaders();

    const [formData, setFormData] = useState<FormData>(initialFormData);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Reset form quando si apre il modal
    useEffect(() => {
        if (isOpen) {
            setFormData(initialFormData);
            setErrors({});
        }
    }, [isOpen]);

    // Mutation per creare la sede
    const createSiteMutation = useMutation({
        mutationFn: async (data: FormData) => {
            return await apiPost('/api/v1/company-sites', {
                companyId,
                siteName: data.siteName,
                citta: data.citta,
                indirizzo: data.indirizzo,
                cap: data.cap,
                provincia: data.provincia,
                telefono: data.telefono || null,
                mail: data.mail || null
            }, { headers: effectiveHeaders });
        },
        onSuccess: () => {
            showToast({
                message: `Sede "${formData.siteName}" creata con successo`,
                type: 'success'
            });
            // Invalida le query per refresh dati
            queryClient.invalidateQueries({ queryKey: ['company-sites'] });
            queryClient.invalidateQueries({ queryKey: ['company', companyId] });
            onSuccess();
        },
        onError: (error: Error) => {
            showToast({
                message: 'Errore durante la creazione della sede',
                type: 'error'
            });
        }
    });

    // Validazione form
    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.siteName.trim()) {
            newErrors.siteName = 'Il nome della sede è obbligatorio';
        }

        if (!formData.citta.trim()) {
            newErrors.citta = 'La città è obbligatoria';
        }

        if (!formData.indirizzo.trim()) {
            newErrors.indirizzo = 'L\'indirizzo è obbligatorio';
        }

        if (!formData.cap.trim()) {
            newErrors.cap = 'Il CAP è obbligatorio';
        } else if (!/^\d{5}$/.test(formData.cap)) {
            newErrors.cap = 'Il CAP deve essere di 5 cifre';
        }

        if (!formData.provincia.trim()) {
            newErrors.provincia = 'La provincia è obbligatoria';
        } else if (formData.provincia.length !== 2) {
            newErrors.provincia = 'La provincia deve essere di 2 caratteri (es. MI)';
        }

        if (formData.mail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.mail)) {
            newErrors.mail = 'Email non valida';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Handler submit
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validateForm()) {
            createSiteMutation.mutate(formData);
        }
    };

    // Handler change
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        // Clear error when user types
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    // Input component per ridurre ripetizione
    const InputField = ({
        name,
        label,
        icon: Icon,
        placeholder,
        required = false,
        maxLength,
        type = 'text'
    }: {
        name: keyof FormData;
        label: string;
        icon: React.ElementType;
        placeholder: string;
        required?: boolean;
        maxLength?: number;
        type?: string;
    }) => (
        <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <div className="relative">
                <Icon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                <input
                    type={type}
                    name={name}
                    value={formData[name]}
                    onChange={handleChange}
                    placeholder={placeholder}
                    maxLength={maxLength}
                    className={cn(
                        "w-full pl-10 pr-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 bg-white dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400",
                        errors[name]
                            ? "border-red-300 dark:border-red-700 focus:ring-red-500 focus:border-red-500"
                            : "border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-transparent"
                    )}
                />
            </div>
            {errors[name] && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {errors[name]}
                </p>
            )}
        </div>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Aggiungi Sede"
            size="md"
        >
            <form onSubmit={handleSubmit} className="space-y-5">
                {/* Info azienda */}
                <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-4 border border-blue-100 dark:border-blue-800">
                    <div className="flex items-center">
                        <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2" />
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Nuova sede per:</p>
                            <p className="font-medium text-gray-900 dark:text-gray-100">{companyName}</p>
                        </div>
                    </div>
                </div>

                {/* Campi form */}
                <div className="space-y-4">
                    <InputField
                        name="siteName"
                        label="Nome Sede"
                        icon={Building2}
                        placeholder="es. Sede Operativa Milano"
                        required
                    />

                    <InputField
                        name="indirizzo"
                        label="Indirizzo"
                        icon={MapPin}
                        placeholder="es. Via Roma, 1"
                        required
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <InputField
                            name="citta"
                            label="Città"
                            icon={MapPin}
                            placeholder="es. Milano"
                            required
                        />
                        <div className="grid grid-cols-2 gap-2">
                            <InputField
                                name="cap"
                                label="CAP"
                                icon={MapPin}
                                placeholder="20100"
                                required
                                maxLength={5}
                            />
                            <InputField
                                name="provincia"
                                label="Prov."
                                icon={MapPin}
                                placeholder="MI"
                                required
                                maxLength={2}
                            />
                        </div>
                    </div>

                    {/* Campi opzionali */}
                    <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Contatti (opzionali)</p>
                        <div className="grid grid-cols-2 gap-4">
                            <InputField
                                name="telefono"
                                label="Telefono"
                                icon={Phone}
                                placeholder="es. 02 1234567"
                                type="tel"
                            />
                            <InputField
                                name="mail"
                                label="Email"
                                icon={Mail}
                                placeholder="sede@azienda.it"
                                type="email"
                            />
                        </div>
                    </div>
                </div>

                {/* Bottoni */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={createSiteMutation.isPending}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                    >
                        Annulla
                    </button>
                    <button
                        type="submit"
                        disabled={createSiteMutation.isPending}
                        className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center"
                    >
                        {createSiteMutation.isPending ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Creazione...
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Crea Sede
                            </>
                        )}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default QuickActionSiteModal;
