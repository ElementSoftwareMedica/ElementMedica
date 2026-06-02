/**
 * Template Form Modal - Orchestrator
 * 
 * Modal per la creazione/modifica di template documenti modulistica.
 * Decomposto in tab separati per rispettare max 500L per file.
 * 
 * Tabs: Info | Campi | Anteprima | Template PDF | Associazioni
 * 
 * @module pages/clinica/impostazioni/modulistica/components
 * @project P53 - Modulistica System
 */

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { X, FileText, Layout, Eye, FileCode, Link2 } from 'lucide-react';
import {
    prestazioniApi,
    mediciApi,
    type DocumentoTemplate,
    type DocumentoTemplateInput,
    type CampoTemplate
} from '../../../../../services/clinicaApi';
import type { FormData, TabId } from './types';
import { INITIAL_FORM_DATA, TIPI_QUESTIONARIO_MDL } from './types';
import TabInfo from './TabInfo';
import TabCampi from './TabCampi';
import TabAnteprima from './TabAnteprima';
import TabTemplate from './TabTemplate';
import TabAssociazioni from './TabAssociazioni';

// ============================================
// TYPES
// ============================================

interface TemplateFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: DocumentoTemplateInput) => void;
    template?: DocumentoTemplate;
    isLoading?: boolean;
}

// ============================================
// TABS CONFIG
// ============================================

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'info', label: 'Informazioni', icon: <FileText className="w-4 h-4" /> },
    { id: 'campi', label: 'Campi', icon: <Layout className="w-4 h-4" /> },
    { id: 'anteprima', label: 'Anteprima', icon: <Eye className="w-4 h-4" /> },
    { id: 'template', label: 'Template PDF', icon: <FileCode className="w-4 h-4" /> },
    { id: 'associazioni', label: 'Associazioni', icon: <Link2 className="w-4 h-4" /> },
];

// ============================================
// COMPONENT
// ============================================

const TemplateFormModal: React.FC<TemplateFormModalProps> = ({
    isOpen,
    onClose,
    onSave,
    template,
    isLoading = false
}) => {
    const isEditing = !!template;

    // Form state
    const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
    const [activeTab, setActiveTab] = useState<TabId>('info');
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Fetch prestazioni e medici per associazioni
    const { data: prestazioniData } = useQuery({
        queryKey: ['prestazioni-select'],
        queryFn: () => prestazioniApi.getAll({ limit: 200 }),
        staleTime: 5 * 60 * 1000
    });

    const { data: mediciData } = useQuery({
        queryKey: ['medici-select'],
        queryFn: () => mediciApi.getAll({ limit: 200 }),
        staleTime: 5 * 60 * 1000
    });

    const prestazioni = prestazioniData?.data || [];
    const medici = mediciData?.data || [];

    // Populate form when editing
    useEffect(() => {
        if (template) {
            setFormData({
                nome: template.nome || '',
                descrizione: template.descrizione || '',
                codice: template.codice || '',
                tipo: template.tipo || 'MODULO_GENERICO',
                fase: template.fase || 'ALTRO',
                branchTypes: template.branchTypes || ['MEDICA'],
                richiedeFirma: template.richiedeFirma || false,
                richiedeFirmaMedico: template.richiedeFirmaMedico || false,
                richiedeFirmaDipendente: template.richiedeFirmaDipendente || false,
                richiedeFirmaFormatore: template.richiedeFirmaFormatore || false,
                richiedeFirmaDatore: template.richiedeFirmaDatore || false,
                firmaPosition: (template as any).firmaPosition || 'footer',
                validitaGiorni: template.validitaGiorni?.toString() || '',
                scadenzaFissa: template.scadenzaFissa ? template.scadenzaFissa.split('T')[0] : '',
                obbligatorio: template.obbligatorio || false,
                isActive: template.isActive !== false,
                ordine: template.ordine || 0,
                contenutoHtml: template.contenutoHtml || '',
                campi: template.campi || [],
                consensoCodici: template.consensoCodici || [],
                prestazioniIds: template.prestazioni?.map(p => p.prestazioneId) || [],
                mediciIds: template.medici?.map(m => m.medicoId) || [],
                haScoring: template.questionarioConfig?.haScoring || false,
                scoringMaxScore: template.questionarioConfig?.scoringConfig?.maxScore || 100,
                scoringPassingScore: template.questionarioConfig?.scoringConfig?.passingScore || 60,
                sogliaCritica: template.questionarioConfig?.sogliaCritica || 30,
                // MDL
                specializzazione: template.questionarioConfig?.specializzazione || '',
                codiciRischio: template.questionarioConfig?.codiciRischio || [],
                tipiVisitaMDL: template.questionarioConfig?.tipiVisitaMDL || [],
                compilabileDa: template.questionarioConfig?.compilabileDa || 'MEDICO',
                tempoStimato: template.questionarioConfig?.tempoStimato?.toString() || '',
                istruzioniPaziente: template.questionarioConfig?.istruzioniPaziente || '',
                istruzioniMedico: template.questionarioConfig?.istruzioniMedico || '',
                richiedeRevisione: template.questionarioConfig?.richiedeRevisione !== false,
                periodicitaMesi: template.questionarioConfig?.periodicitaMesi?.toString() || '',
                promemoria: template.questionarioConfig?.promemoria || false,
                isPagamento: template.questionarioConfig?.isPagamento || false,
                fatturabile: template.questionarioConfig?.fatturabile !== false,
                prezzoDefault: template.questionarioConfig?.prezzoDefault?.toString() || '',
            });
        } else {
            setFormData(INITIAL_FORM_DATA);
        }
        setActiveTab('info');
        setErrors({});
    }, [template, isOpen]);

    // Update helpers
    const handleFormChange = useCallback((updates: Partial<FormData>) => {
        setFormData(prev => ({ ...prev, ...updates }));
    }, []);

    const handleCampiUpdate = useCallback((campi: CampoTemplate[]) => {
        setFormData(prev => ({ ...prev, campi }));
    }, []);

    const togglePrestazione = useCallback((id: string) => {
        setFormData(prev => ({
            ...prev,
            prestazioniIds: prev.prestazioniIds.includes(id)
                ? prev.prestazioniIds.filter(p => p !== id)
                : [...prev.prestazioniIds, id]
        }));
    }, []);

    const toggleMedico = useCallback((id: string) => {
        setFormData(prev => ({
            ...prev,
            mediciIds: prev.mediciIds.includes(id)
                ? prev.mediciIds.filter(m => m !== id)
                : [...prev.mediciIds, id]
        }));
    }, []);

    const toggleConsensoCodice = useCallback((codice: string) => {
        setFormData(prev => ({
            ...prev,
            consensoCodici: prev.consensoCodici.includes(codice)
                ? prev.consensoCodici.filter(c => c !== codice)
                : [...prev.consensoCodici, codice]
        }));
    }, []);

    // Validate form
    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.nome.trim()) {
            newErrors.nome = 'Il nome è obbligatorio';
        }

        if (formData.validitaGiorni && isNaN(parseInt(formData.validitaGiorni))) {
            newErrors.validitaGiorni = 'Deve essere un numero';
        }

        formData.campi.forEach((campo, index) => {
            if (!campo.name.trim()) {
                newErrors[`campo_${index}_name`] = 'Nome campo obbligatorio';
            }
            if (!campo.label.trim()) {
                newErrors[`campo_${index}_label`] = 'Etichetta obbligatoria';
            }
            if (['select', 'multiselect', 'radio'].includes(campo.type) && (!campo.options || campo.options.length === 0)) {
                newErrors[`campo_${index}_options`] = 'Aggiungi almeno un\'opzione';
            }
        });

        setErrors(newErrors);

        // Navigate to the tab with errors
        if (Object.keys(newErrors).some(k => k === 'nome' || k === 'validitaGiorni')) {
            setActiveTab('info');
        } else if (Object.keys(newErrors).some(k => k.startsWith('campo_'))) {
            setActiveTab('campi');
        }

        return Object.keys(newErrors).length === 0;
    };

    // Handle save
    const handleSave = () => {
        if (!validate()) return;

        const data: DocumentoTemplateInput = {
            nome: formData.nome.trim(),
            descrizione: formData.descrizione.trim() || undefined,
            codice: formData.codice.trim() || undefined,
            tipo: formData.tipo,
            fase: formData.fase,
            branchTypes: formData.branchTypes,
            richiedeFirma: formData.richiedeFirma,
            richiedeFirmaMedico: formData.richiedeFirmaMedico,
            richiedeFirmaDipendente: formData.richiedeFirmaDipendente,
            richiedeFirmaFormatore: formData.richiedeFirmaFormatore,
            richiedeFirmaDatore: formData.richiedeFirmaDatore,
            validitaGiorni: formData.validitaGiorni ? parseInt(formData.validitaGiorni) : undefined,
            scadenzaFissa: formData.scadenzaFissa || undefined,
            obbligatorio: formData.obbligatorio,
            isActive: formData.isActive,
            ordine: formData.ordine,
            contenutoHtml: formData.contenutoHtml || undefined,
            campi: formData.campi.length > 0 ? formData.campi : undefined,
            consensoCodici: formData.consensoCodici,
            prestazioniIds: formData.prestazioniIds.length > 0 ? formData.prestazioniIds : undefined,
            mediciIds: formData.mediciIds.length > 0 ? formData.mediciIds : undefined,
            // QuestionarioMedicoConfig: inviato se scoring attivo o tipo MDL
            questionarioConfig: (formData.haScoring || TIPI_QUESTIONARIO_MDL.includes(formData.tipo)) ? {
                haScoring: formData.haScoring,
                scoringConfig: formData.haScoring ? {
                    maxScore: formData.scoringMaxScore,
                    passingScore: formData.scoringPassingScore,
                } : undefined,
                sogliaCritica: formData.haScoring ? formData.sogliaCritica : undefined,
                // MDL
                specializzazione: formData.specializzazione.trim() || undefined,
                codiciRischio: formData.codiciRischio.length > 0 ? formData.codiciRischio : undefined,
                tipiVisitaMDL: formData.tipiVisitaMDL.length > 0 ? formData.tipiVisitaMDL : undefined,
                compilabileDa: formData.compilabileDa,
                tempoStimato: formData.tempoStimato ? parseInt(formData.tempoStimato) : undefined,
                istruzioniPaziente: formData.istruzioniPaziente.trim() || undefined,
                istruzioniMedico: formData.istruzioniMedico.trim() || undefined,
                richiedeRevisione: formData.richiedeRevisione,
                periodicitaMesi: formData.periodicitaMesi ? parseInt(formData.periodicitaMesi) : undefined,
                promemoria: formData.promemoria,
                isPagamento: formData.isPagamento,
                fatturabile: formData.fatturabile,
                prezzoDefault: formData.prezzoDefault ? parseFloat(formData.prezzoDefault) : undefined,
            } : undefined,
        };

        onSave(data);
    };

    if (!isOpen) return null;

    const campiCount = formData.campi.length;

    const content = (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />

            {/* Modal */}
            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-teal-50 rounded-lg">
                            <FileText className="w-5 h-5 text-teal-600" />
                        </div>
                        <h2 className="text-lg font-semibold text-gray-900">
                            {isEditing ? 'Modifica Template' : 'Nuovo Template'}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 overflow-x-auto flex-shrink-0">
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${activeTab === tab.id
                                ? 'border-teal-500 text-teal-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            {tab.icon}
                            {tab.label}
                            {tab.id === 'campi' && campiCount > 0 && (
                                <span className="ml-1 px-1.5 py-0.5 text-xs bg-teal-100 text-teal-700 rounded-full">
                                    {campiCount}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {activeTab === 'info' && (
                        <TabInfo formData={formData} errors={errors} onChange={handleFormChange} />
                    )}
                    {activeTab === 'campi' && (
                        <TabCampi
                            campi={formData.campi}
                            errors={errors}
                            onUpdate={handleCampiUpdate}
                            haScoring={formData.haScoring}
                        />
                    )}
                    {activeTab === 'anteprima' && (
                        <TabAnteprima formData={formData} />
                    )}
                    {activeTab === 'template' && (
                        <TabTemplate
                            contenutoHtml={formData.contenutoHtml}
                            formData={formData}
                            onChange={(html) => handleFormChange({ contenutoHtml: html })}
                            currentTemplateId={template?.id}
                        />
                    )}
                    {activeTab === 'associazioni' && (
                        <TabAssociazioni
                            prestazioniIds={formData.prestazioniIds}
                            mediciIds={formData.mediciIds}
                            consensoCodici={formData.consensoCodici}
                            prestazioni={prestazioni}
                            medici={medici as { id: string; firstName: string; lastName: string; gender?: string }[]}
                            onTogglePrestazione={togglePrestazione}
                            onToggleMedico={toggleMedico}
                            onToggleConsensoCodice={toggleConsensoCodice}
                        />
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isLoading}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                        Annulla
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isLoading}
                        className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50 flex items-center gap-2"
                    >
                        {isLoading && (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        )}
                        {isEditing ? 'Salva Modifiche' : 'Crea Template'}
                    </button>
                </div>
            </div>
        </div>
    );

    return createPortal(content, document.body);
};

export default TemplateFormModal;
