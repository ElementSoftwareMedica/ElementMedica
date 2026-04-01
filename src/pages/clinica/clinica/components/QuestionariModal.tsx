/**
 * QuestionariModal
 * 
 * P61 - Modal per compilare questionari medici durante una visita MDL.
 * Suggerisce automaticamente questionari in base a:
 * - Tipo di visita MDL
 * - Codici rischio associati
 * - Protocollo sanitario
 * 
 * @module pages/clinica/clinica/components
 * @project P61 - Questionari Medici
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    X,
    FileText,
    Check,
    Clock,
    AlertTriangle,
    ClipboardList,
    ChevronRight,
    Plus,
    Eye,
    Loader2,
    FileSignature,
    AlertCircle,
    Search,
    Trash2,
    Pencil,
    FileCheck,
    User,
    Stethoscope,
    CheckCircle2,
    Wand2,
    RefreshCw,
    Info
} from 'lucide-react';
import { cn } from '@/design-system/utils';
import { useToast } from '@/hooks/useToast';
import { useConfirmDialog } from '@/contexts/ConfirmDialogContext';
import { QuestionarioRenderer } from '@/components/clinica/questionari';
import questionariService, {
    type QuestionarioTemplate,
    type QuestionarioCompilato,
    type CompilaQuestionarioData,
    type CampoQuestionario,
    type PaginatedResponse,
    isQuestionarioTipo
} from '@/services/questionariService';
import { tariffariAziendaliApi } from '@/services/tariffarioAziendaleApi';

// ============================================
// TYPES
// ============================================

interface QuestionariModalProps {
    isOpen: boolean;
    onClose: () => void;
    pazienteId: string;
    visitaId?: string;
    tipoVisitaMDL?: string;
    codiciRischio?: string[];
    pazienteNome?: string;
    medicoId?: string;
    readOnly?: boolean;
    onQuestionarioCompletato?: (questionarioId: string) => void;
    /** R17: ID profilo aziendale per auto-check tariffario al termine compilazione */
    companyTenantProfileId?: string;
    /** R17: Callback quando trovata una voce tariffario per il questionario appena compilato */
    onPrestazioneSuggerita?: (data: { nome: string; prezzoBase: number; prestazioneId?: string; compilatoId?: string; documentoTemplateId?: string; periodicitaMesi?: number }) => void;
}

type ModalView = 'list' | 'fill' | 'view';

// ============================================
// HELPERS
// ============================================

/**
 * Builds a default datiCompilati object from a template's campi
 * using each field's defaultValue (mirrors the 'da-template' preset in QuestionarioRenderer)
 */
function buildDefaultDatiCompilati(template: QuestionarioTemplate): Record<string, unknown> {
    const campi: CampoQuestionario[] = template.campi || [];
    const values: Record<string, unknown> = {};

    for (const campo of campi) {
        if (campo.defaultValue != null && campo.defaultValue !== '') {
            switch (campo.type) {
                case 'boolean':
                    values[campo.name] = campo.defaultValue === 'true' || campo.defaultValue === '1';
                    break;
                case 'number':
                case 'scale':
                    values[campo.name] = Number(campo.defaultValue) || 0;
                    break;
                case 'multiselect':
                    try { values[campo.name] = JSON.parse(campo.defaultValue); }
                    catch { values[campo.name] = [campo.defaultValue]; }
                    break;
                default:
                    values[campo.name] = campo.defaultValue;
            }
        } else {
            switch (campo.type) {
                case 'boolean': values[campo.name] = false; break;
                case 'multiselect': values[campo.name] = []; break;
                case 'number':
                case 'scale': values[campo.name] = campo.min ?? 0; break;
                case 'select':
                case 'radio': {
                    const allOpts: CampoQuestionario['options'] = campo.options || [];
                    const firstNonEmpty = allOpts.find(o => (typeof o === 'string' ? o : o.value) !== '');
                    values[campo.name] = firstNonEmpty
                        ? (typeof firstNonEmpty === 'string' ? firstNonEmpty : firstNonEmpty.value)
                        : '';
                    break;
                }
                case 'text':
                case 'textarea': values[campo.name] = 'Nella norma'; break;
                case 'date': values[campo.name] = new Date().toISOString().split('T')[0]; break;
                default: values[campo.name] = '';
            }
        }
    }

    return values;
}

// ============================================
// CONSTANTS
// ============================================

const getStatoBadge = (stato: QuestionarioCompilato['stato']) => {
    const badges: Record<typeof stato, { bg: string; text: string; label: string }> = {
        BOZZA: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Bozza' },
        DA_FIRMARE: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Da firmare' },
        FIRMATO_PAZIENTE: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Firmato Paz.' },
        FIRMATO_MEDICO: { bg: 'bg-green-100', text: 'text-green-800', label: 'Firmato Med.' },
        COMPLETATO: { bg: 'bg-green-100', text: 'text-green-800', label: 'Completato' },
        SCADUTO: { bg: 'bg-red-100', text: 'text-red-800', label: 'Scaduto' },
        ANNULLATO: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Annullato' }
    };

    const badge = badges[stato];
    if (!badge) return null;

    return (
        <span className={`px-2 py-0.5 text-xs font-medium rounded ${badge.bg} ${badge.text}`}>
            {badge.label}
        </span>
    );
};

// ============================================
// COMPONENT
// ============================================

export const QuestionariModal: React.FC<QuestionariModalProps> = ({
    isOpen,
    onClose,
    pazienteId,
    visitaId,
    tipoVisitaMDL,
    codiciRischio = [],
    pazienteNome,
    medicoId,
    readOnly = false,
    onQuestionarioCompletato,
    companyTenantProfileId,
    onPrestazioneSuggerita
}) => {
    const { showToast } = useToast();
    const { confirmDelete } = useConfirmDialog();
    const queryClient = useQueryClient();

    const [view, setView] = useState<ModalView>('list');
    const [selectedTemplate, setSelectedTemplate] = useState<QuestionarioTemplate | null>(null);
    const [selectedCompilato, setSelectedCompilato] = useState<QuestionarioCompilato | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // R17: Track which compilati have already been checked to avoid redundant tariffario API calls.
    // Uses a ref (not state) to avoid re-render loops.
    const checkedForTariffario = useRef(new Set<string>());

    // ============================================
    // QUERIES
    // ============================================

    // S67: Fetch suggestion context (risk codes + protocolli from patient's mansione)
    const { data: contesto } = useQuery({
        queryKey: ['questionari-contesto', visitaId],
        queryFn: () => questionariService.getContestoSuggerimenti(visitaId!),
        enabled: isOpen && !!visitaId
    });

    // Merge context data with props (context overrides hardcoded values)
    const effectiveCodiciRischio = contesto?.codiciRischio?.length ? contesto.codiciRischio : codiciRischio;
    const effectiveProtocolliIds = contesto?.protocolliIds || [];

    // Questionari suggeriti in base a rischio/tipo visita/protocollo
    const { data: suggeriti, isLoading: isLoadingSuggeriti } = useQuery({
        queryKey: ['questionari-suggeriti', tipoVisitaMDL, effectiveCodiciRischio, effectiveProtocolliIds],
        queryFn: async () => {
            const results: QuestionarioTemplate[] = [];
            const seen = new Set<string>();
            const addUnique = (templates: QuestionarioTemplate[]) => {
                for (const t of templates) {
                    if (!seen.has(t.id)) {
                        seen.add(t.id);
                        results.push(t);
                    }
                }
            };

            // Per tipo visita
            if (tipoVisitaMDL) {
                const byTipo = await questionariService.getQuestionariPerTipoVisita(tipoVisitaMDL);
                addUnique(byTipo);
            }

            // Per codici rischio
            for (const codice of effectiveCodiciRischio) {
                const byRischio = await questionariService.getQuestionariPerRischio(codice);
                addUnique(byRischio);
            }

            // Per protocolli sanitari
            for (const protocolloId of effectiveProtocolliIds) {
                const byProtocollo = await questionariService.getQuestionariPerProtocollo(protocolloId);
                addUnique(byProtocollo);
            }

            return results;
        },
        enabled: isOpen && (!!tipoVisitaMDL || effectiveCodiciRischio.length > 0 || effectiveProtocolliIds.length > 0)
    });

    // Tutti i template disponibili
    const { data: allTemplates, isLoading: isLoadingTemplates } = useQuery({
        queryKey: ['questionari-templates'],
        queryFn: () => questionariService.getQuestionariTemplates({ limit: 100, isActive: true }),
        enabled: isOpen
    });

    // Questionari già compilati per questa visita
    const { data: compilati, isLoading: isLoadingCompilati, refetch: refetchCompilati } = useQuery({
        queryKey: ['questionari-visita', visitaId],
        queryFn: () => questionariService.getQuestionariVisita(visitaId!),
        enabled: isOpen && !!visitaId
    });

    // R17: Auto-check tariffario for any COMPLETATO questionnaire when the list loads.
    // This covers the case where compilation + signing happened in a previous session —
    // firmaMutation/compilaMutation never fire on load, so without this effect the
    // prestazione would never be suggested.
    useEffect(() => {
        if (!compilati || !companyTenantProfileId || !onPrestazioneSuggerita) return;

        const completati = compilati.filter(
            c => c.stato === 'COMPLETATO' && c.documentoTemplateId && !checkedForTariffario.current.has(c.id)
        );
        if (completati.length === 0) return;

        const runCheck = async () => {
            for (const compilato of completati) {
                // Mark immediately so concurrent re-renders don't trigger a double-check
                checkedForTariffario.current.add(compilato.id);
                try {
                    const tariffarioResp = await tariffariAziendaliApi.getVociByTemplate(compilato.documentoTemplateId!);
                    const voci = tariffarioResp?.data || [];
                    // periodicitaMesi è su questionarioConfig, NON su documentoTemplate direttamente
                    const periodicitaMesi = (compilato as any).documentoTemplate?.questionarioConfig?.periodicitaMesi ?? 0;
                    // Preferisce voce associata alla company del paziente, poi qualsiasi voce attiva
                    const voce = companyTenantProfileId
                        ? (voci.find(v =>
                            v.tariffarioAziendale?.companyAssociations?.some(
                                (assoc: { companyTenantProfile?: { id: string } }) =>
                                    assoc.companyTenantProfile?.id === companyTenantProfileId
                            )
                        ) || voci[0])
                        : voci[0];
                    if (voce) {
                        onPrestazioneSuggerita({
                            nome: voce.nome || voce.documentoTemplate?.nome || 'Questionario',
                            prezzoBase: Number(voce.prezzoBase),
                            prestazioneId: voce.prestazioneId || undefined,
                            compilatoId: compilato.id,
                            documentoTemplateId: compilato.documentoTemplateId!,
                            periodicitaMesi
                        });
                    } else {
                        // Nessuna voce tariffario: segnala comunque il compilato al piano (prezzoBase = 0)
                        onPrestazioneSuggerita({
                            nome: (compilato as any).documentoTemplate?.nome || 'Questionario compilato',
                            prezzoBase: 0,
                            compilatoId: compilato.id,
                            documentoTemplateId: compilato.documentoTemplateId!,
                            periodicitaMesi
                        });
                    }
                } catch {
                    // best-effort — tariffario check must not break the modal
                }
            }
        };

        runCheck();
    }, [compilati, companyTenantProfileId, onPrestazioneSuggerita]);

    // ============================================
    // MUTATIONS
    // ============================================

    const compilaMutation = useMutation({
        mutationFn: (data: { templateId: string; payload: CompilaQuestionarioData }) =>
            questionariService.compilaQuestionario(data.templateId, data.payload),
        onSuccess: async (result: QuestionarioCompilato) => {
            showToast({ message: 'Questionario compilato con successo', type: 'success' });
            refetchCompilati();
            queryClient.invalidateQueries({ queryKey: ['questionari-visita'] });
            onQuestionarioCompletato?.(result.id);
            setView('list');
            setSelectedTemplate(null);

            // R17+: Background check – tariffario per template+azienda; poi in ogni caso notifica il compilato
            const runDisplaySignal = async () => {
                // periodicitaMesi è su DocumentoTemplate.questionarioConfig.periodicitaMesi, NON su documentoTemplate direttamente
                const periodicitaMesi = (result as any).documentoTemplate?.questionarioConfig?.periodicitaMesi ?? 0;
                let signalData: { nome: string; prezzoBase: number; prestazioneId?: string; compilatoId?: string; documentoTemplateId?: string; periodicitaMesi?: number } | null = null;
                let voceFound = false;
                if (result.documentoTemplateId) {
                    try {
                        const tariffarioResp = await tariffariAziendaliApi.getVociByTemplate(result.documentoTemplateId);
                        const voci = tariffarioResp?.data || [];
                        // Preferisce voce associata alla company del paziente, poi qualsiasi voce attiva
                        const voce = companyTenantProfileId
                            ? (voci.find(v =>
                                v.tariffarioAziendale?.companyAssociations?.some(
                                    assoc => assoc.companyTenantProfile?.id === companyTenantProfileId
                                )
                            ) || voci[0])
                            : voci[0];
                        if (voce) {
                            voceFound = true;
                            signalData = {
                                nome: voce.nome || voce.documentoTemplate?.nome || 'Questionario',
                                prezzoBase: Number(voce.prezzoBase),
                                prestazioneId: voce.prestazioneId || undefined,
                                compilatoId: result.id,
                                documentoTemplateId: result.documentoTemplateId,
                                periodicitaMesi
                            };
                        }
                    } catch {
                        // best-effort — non blocca
                    }
                }
                // Se nessuna voce tariffario trovata, segnala comunque il compilato per il Piano
                if (!signalData) {
                    signalData = {
                        nome: (result as any).documentoTemplate?.nome || 'Questionario compilato',
                        prezzoBase: 0,
                        prestazioneId: undefined,
                        compilatoId: result.id,
                        documentoTemplateId: result.documentoTemplateId,
                        periodicitaMesi
                    };
                }
                onPrestazioneSuggerita?.(signalData);
                // Avvisi informativi post-compilazione
                if (visitaId) {
                    if (!voceFound) {
                        showToast({
                            message: 'Nessuna voce tariffario configurata: nessun movimento contabile sarà generato. Per abilitare la fatturazione, aggiungi una VoceTariffario nel template da Amministrazione → Template.',
                            type: 'info',
                            duration: 8000
                        });
                    }
                    if (!periodicitaMesi) {
                        showToast({
                            message: 'Periodicità non configurata: nessuna scadenza di follow-up sarà generata. Per abilitare, imposta i mesi di periodicità nella configurazione del template.',
                            type: 'info',
                            duration: 8000
                        });
                    }
                }
            };
            runDisplaySignal();
        },
        onError: (error: Error) => {
            showToast({ message: 'Errore', type: 'error' });
        }
    });

    const firmaMutation = useMutation({
        mutationFn: (data: { compilatoId: string; firma: string; tipo: 'paziente' | 'medico' }) =>
            data.tipo === 'paziente'
                ? questionariService.firmaPaziente(data.compilatoId, data.firma)
                : questionariService.firmaMedico(data.compilatoId, data.firma),
        onSuccess: async (compilato) => {
            showToast({ message: 'Firma registrata', type: 'success' });
            refetchCompilati();

            // R17: Trigger prestazione check when questionnaire reaches COMPLETATO after signing.
            // This covers the case where the questionnaire was compiled in a previous session
            // and the user is now just signing it (compilaMutation never fires in that case).
            if (
                compilato.stato === 'COMPLETATO' &&
                compilato.documentoTemplateId &&
                onPrestazioneSuggerita
            ) {
                try {
                    // periodicitaMesi è su DocumentoTemplate.questionarioConfig.periodicitaMesi, NON su documentoTemplate direttamente
                    const periodicitaMesi = (compilato as any).documentoTemplate?.questionarioConfig?.periodicitaMesi ?? 0;
                    const tariffarioResp = await tariffariAziendaliApi.getVociByTemplate(compilato.documentoTemplateId);
                    const voci = tariffarioResp?.data || [];
                    // Preferisce voce associata alla company del paziente, poi qualsiasi voce attiva
                    const voce = companyTenantProfileId
                        ? (voci.find(v =>
                            v.tariffarioAziendale?.companyAssociations?.some(
                                (assoc: { companyTenantProfile?: { id: string } }) =>
                                    assoc.companyTenantProfile?.id === companyTenantProfileId
                            )
                        ) || voci[0])
                        : voci[0];
                    onPrestazioneSuggerita({
                        nome: voce?.nome || voce?.documentoTemplate?.nome || (compilato as any).documentoTemplate?.nome || 'Questionario compilato',
                        prezzoBase: voce ? Number(voce.prezzoBase) : 0,
                        prestazioneId: voce?.prestazioneId || undefined,
                        compilatoId: compilato.id,
                        documentoTemplateId: compilato.documentoTemplateId,
                        periodicitaMesi
                    });
                } catch {
                    // swallow — tariffario check is best-effort
                }
            }
        },
        onError: (error: Error) => {
            showToast({ message: 'Errore firma', type: 'error' });
        }
    });

    // S67: Delete compilato mutation
    const deleteMutation = useMutation({
        mutationFn: (data: { compilatoId: string; deletionReason: string }) =>
            questionariService.deleteQuestionarioCompilato(data.compilatoId, data.deletionReason),
        onSuccess: () => {
            showToast({ message: 'Questionario eliminato', type: 'success' });
            refetchCompilati();
            queryClient.invalidateQueries({ queryKey: ['questionari-visita'] });
        },
        onError: (error: Error) => {
            showToast({ message: 'Errore eliminazione', type: 'error' });
        }
    });

    // S71: Generate PDF mutation
    const generatePdfMutation = useMutation({
        mutationFn: (compilatoId: string) =>
            questionariService.generateCompilatoPdf(compilatoId),
        onSuccess: () => {
            showToast({ message: 'PDF generato con successo', type: 'success' });
            refetchCompilati();
            queryClient.invalidateQueries({ queryKey: ['questionari-visita'] });
        },
        onError: (error: Error) => {
            showToast({ message: 'Errore generazione PDF', type: 'error' });
        }
    });

    // ============================================
    // HANDLERS
    // ============================================

    const handleSelectTemplate = useCallback((template: QuestionarioTemplate) => {
        setSelectedTemplate(template);
        setView('fill');
    }, []);

    const handleViewCompilato = useCallback((compilato: QuestionarioCompilato) => {
        setSelectedCompilato(compilato);
        setView('view');
    }, []);

    const handleSubmitQuestionario = useCallback((data: CompilaQuestionarioData) => {
        if (!selectedTemplate) return;
        compilaMutation.mutate({
            templateId: selectedTemplate.id,
            payload: { ...data, visitaId, companyTenantProfileId: companyTenantProfileId || undefined }
        });
    }, [selectedTemplate, visitaId, compilaMutation, companyTenantProfileId]);

    // Bulk compile: compiles all pending suggested questionari with template defaults
    const [isCompilingAll, setIsCompilingAll] = useState(false);
    const handleCompilaTutti = useCallback(async () => {
        if (!visitaId || readOnly) return;
        const pending = (suggeriti || []).filter((t: QuestionarioTemplate) =>
            !(compilati || []).some((c: QuestionarioCompilato) => c.documentoTemplateId === t.id)
        );
        if (pending.length === 0) {
            showToast({ message: 'Tutti i questionari suggeriti sono già compilati', type: 'info' });
            return;
        }
        setIsCompilingAll(true);
        let successCount = 0;
        let errorCount = 0;
        // Memorizza id + periodicitaMesi dal template (da questionarioConfig), usato nel check R17 successivo
        const compiledTemplates: { id: string; periodicitaMesi: number }[] = [];
        for (const template of pending) {
            try {
                const datiCompilati = buildDefaultDatiCompilati(template);
                await questionariService.compilaQuestionario(template.id, {
                    pazienteId,
                    visitaId,
                    companyTenantProfileId: companyTenantProfileId || undefined,
                    datiCompilati,
                });
                successCount++;
                compiledTemplates.push({
                    id: template.id,
                    // periodicitaMesi è su questionarioConfig, NON su documentoTemplate direttamente
                    periodicitaMesi: (template as any).questionarioConfig?.periodicitaMesi ?? 0
                });
            } catch {
                errorCount++;
            }
        }
        setIsCompilingAll(false);
        refetchCompilati();
        queryClient.invalidateQueries({ queryKey: ['questionari-visita'] });
        if (successCount > 0) {
            showToast({ message: `${successCount} questionari pre-compilati con i valori di default`, type: 'success' });
        }
        if (errorCount > 0) {
            showToast({ message: `${errorCount} questionari non compilati per errori`, type: 'error' });
        }

        // R17: Background tariffario check for each compiled template
        if (onPrestazioneSuggerita && compiledTemplates.length > 0) {
            for (const { id: templateId, periodicitaMesi } of compiledTemplates) {
                try {
                    const tariffarioResp = await tariffariAziendaliApi.getVociByTemplate(templateId);
                    const voci = tariffarioResp?.data || [];
                    // Preferisce voce associata alla company del paziente, poi qualsiasi voce attiva
                    const voce = companyTenantProfileId
                        ? (voci.find(v =>
                            v.tariffarioAziendale?.companyAssociations?.some(
                                assoc => assoc.companyTenantProfile?.id === companyTenantProfileId
                            )
                        ) || voci[0])
                        : voci[0];
                    if (voce) {
                        onPrestazioneSuggerita({
                            nome: voce.nome || voce.documentoTemplate?.nome || 'Questionario',
                            prezzoBase: Number(voce.prezzoBase),
                            prestazioneId: voce.prestazioneId || undefined,
                            documentoTemplateId: templateId,
                            periodicitaMesi
                        });
                    }
                } catch {
                    // swallow — best-effort
                }
            }
        }
    }, [suggeriti, compilati, visitaId, pazienteId, readOnly, refetchCompilati, queryClient, showToast, companyTenantProfileId, onPrestazioneSuggerita]);

    const handleBack = useCallback(() => {
        setView('list');
        setSelectedTemplate(null);
        setSelectedCompilato(null);
    }, []);

    const handleClose = useCallback(() => {
        handleBack();
        onClose();
    }, [handleBack, onClose]);

    // S67/S71: Handle delete compilato — allowed for all states (GDPR soft-delete)
    const handleDeleteCompilato = useCallback(async (compilato: QuestionarioCompilato, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent card click (view)
        const nome = compilato.documentoTemplate?.nome || 'Questionario';
        const isSigned = !!compilato.firmaPaziente || !!compilato.firmaMedico || compilato.stato === 'COMPLETATO';
        const confirmMsg = isSigned ? `${nome} (già firmato)` : nome;
        if (!await confirmDelete(confirmMsg)) return;
        deleteMutation.mutate({
            compilatoId: compilato.id,
            deletionReason: isSigned
                ? `Eliminazione manuale questionario firmato "${nome}" (stato: ${compilato.stato})`
                : `Eliminazione manuale questionario compilato "${nome}" prima della firma`
        });
    }, [deleteMutation, confirmDelete]);

    // S68: Handle edit (re-compile) a BOZZA compilato
    const handleEditCompilato = useCallback((compilato: QuestionarioCompilato, e: React.MouseEvent) => {
        e.stopPropagation();
        if (compilato.documentoTemplate) {
            setSelectedTemplate(compilato.documentoTemplate);
            setSelectedCompilato(compilato); // Keep reference for initialData
            setView('fill');
        }
    }, []);

    // ============================================
    // FILTERED DATA
    // ============================================

    const filteredTemplates = useMemo(() => {
        if (!allTemplates?.data) return [];
        // S65: Only show questionario types (not modulistica)
        const questionarioTemplates = allTemplates.data.filter((t: QuestionarioTemplate) =>
            isQuestionarioTipo(t.tipo)
        );
        if (!searchTerm) return questionarioTemplates;

        const term = searchTerm.toLowerCase();
        return questionarioTemplates.filter((t: QuestionarioTemplate) =>
            t.nome.toLowerCase().includes(term) ||
            t.descrizione?.toLowerCase().includes(term)
        );
    }, [allTemplates, searchTerm]);

    // ============================================
    // RENDER HELPERS
    // ============================================

    const renderTemplateCard = (template: QuestionarioTemplate, isSuggested = false) => {
        const config = template.questionarioConfig;
        const alreadyCompiled = compilati?.some((c: QuestionarioCompilato) => c.documentoTemplateId === template.id);
        // Warning badges only in visit context
        const hasPeriodicity = visitaId && config?.periodicitaMesi && config.periodicitaMesi > 0;
        const missingPeriodicity = visitaId && !readOnly && (!config?.periodicitaMesi);

        return (
            <div
                key={template.id}
                onClick={() => !alreadyCompiled && !readOnly && handleSelectTemplate(template)}
                className={cn(
                    'p-4 border rounded-lg transition-colors',
                    alreadyCompiled || readOnly
                        ? 'bg-gray-50 border-gray-200 cursor-not-allowed'
                        : 'hover:border-teal-500 hover:bg-teal-50/50 cursor-pointer'
                )}
            >
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <ClipboardList className={cn('h-5 w-5 flex-shrink-0', isSuggested ? 'text-teal-600' : 'text-gray-500')} />
                            <span className="font-medium text-gray-900">{template.nome}</span>
                            {isSuggested && (
                                <span className="px-2 py-0.5 text-xs font-medium rounded bg-teal-100 text-teal-800">
                                    Suggerito
                                </span>
                            )}
                            {alreadyCompiled && (
                                <span className="px-2 py-0.5 text-xs font-medium rounded bg-green-100 text-green-800">
                                    Già compilato
                                </span>
                            )}
                            {hasPeriodicity && (
                                <span
                                    className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded bg-teal-50 text-teal-700 border border-teal-200"
                                    title={`Genera una scadenza di follow-up ogni ${config!.periodicitaMesi} mesi`}
                                >
                                    <RefreshCw className="h-3 w-3" />
                                    Ogni {config!.periodicitaMesi} mesi
                                </span>
                            )}
                            {missingPeriodicity && !alreadyCompiled && (
                                <span
                                    className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded bg-amber-50 text-amber-700 border border-amber-200"
                                    title="Periodicità non configurata nel template: compilando questo questionario non verrà generata nessuna scadenza di follow-up automatica."
                                >
                                    <AlertTriangle className="h-3 w-3" />
                                    Nessuna periodicità
                                </span>
                            )}
                        </div>
                        {template.descrizione && (
                            <p className="mt-1 text-sm text-gray-600">{template.descrizione}</p>
                        )}
                        <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                            {config?.tempoStimato && (
                                <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {config.tempoStimato} min
                                </span>
                            )}
                            {config?.haScoring && (
                                <span className="flex items-center gap-1">
                                    <Check className="h-3 w-3" />
                                    Con scoring
                                </span>
                            )}
                            {template.richiedeFirma && (
                                <span className="flex items-center gap-1">
                                    <FileSignature className="h-3 w-3" />
                                    Firma richiesta
                                </span>
                            )}
                            {/* P61: Mostra prezzo se fatturabile */}
                            {config?.fatturabile && (config.prezzoDefault || config.voceTariffario) && (
                                <span className="flex items-center gap-1 text-teal-700 font-medium">
                                    € {config.voceTariffario?.prezzoBase ?? config.prezzoDefault ?? 0}
                                </span>
                            )}
                        </div>
                    </div>
                    {!alreadyCompiled && (
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                    )}
                </div>
            </div>
        );
    };

    const renderCompilatoCard = (compilato: QuestionarioCompilato) => {
        const template = compilato.documentoTemplate;
        // S71: Allow delete for all states (GDPR soft-delete), block edit after paziente signs
        const isDeletable = !readOnly && !['ANNULLATO', 'SCADUTO'].includes(compilato.stato);
        const isEditable = compilato.stato === 'BOZZA' && !readOnly && !compilato.firmaPaziente;
        const hasPdf = !!compilato.pdfUrl;

        return (
            <div
                key={compilato.id}
                onClick={() => handleViewCompilato(compilato)}
                className="p-4 border rounded-lg hover:border-blue-500 hover:bg-blue-50/50 cursor-pointer transition-colors"
            >
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-blue-600" />
                            <span className="font-medium text-gray-900">{template?.nome || 'Questionario'}</span>
                            {getStatoBadge(compilato.stato)}
                        </div>
                        <div className="mt-2 flex items-center gap-4 text-xs text-gray-500 flex-wrap">
                            {compilato.punteggioTotale !== null && compilato.punteggioTotale !== undefined && (
                                <span className="flex items-center gap-1">
                                    Punteggio: <strong>{compilato.punteggioTotale}</strong>
                                    {compilato.punteggioPercentuale && ` (${compilato.punteggioPercentuale.toFixed(0)}%)`}
                                </span>
                            )}
                            {compilato.esitoCritico && (
                                <span className="flex items-center gap-1 text-red-600">
                                    <AlertTriangle className="h-3 w-3" />
                                    Esito critico
                                </span>
                            )}
                            <span>
                                Compilato: {new Date(compilato.dataCompilazione || compilato.createdAt).toLocaleDateString('it-IT')}
                            </span>
                            {/* S68: Firma status indicators */}
                            {template?.richiedeFirma && (
                                <span className={`flex items-center gap-0.5 ${compilato.firmaPaziente ? 'text-green-600' : 'text-orange-500'}`}
                                    title={compilato.firmaPaziente ? 'Firma paziente acquisita' : 'Firma paziente mancante'}>
                                    <User className="h-3 w-3" />
                                    {compilato.firmaPaziente ? <CheckCircle2 className="h-3 w-3" /> : '!'}
                                </span>
                            )}
                            {template?.richiedeFirmaMedico && (
                                <span className={`flex items-center gap-0.5 ${compilato.firmaMedico ? 'text-green-600' : 'text-orange-500'}`}
                                    title={compilato.firmaMedico ? 'Firma medico acquisita' : 'Firma medico mancante'}>
                                    <Stethoscope className="h-3 w-3" />
                                    {compilato.firmaMedico ? <CheckCircle2 className="h-3 w-3" /> : '!'}
                                </span>
                            )}
                        </div>
                    </div>
                    {/* S68: Improved action buttons */}
                    <div className="flex items-center gap-1 ml-2">
                        {hasPdf ? (
                            <button
                                onClick={(e) => { e.stopPropagation(); window.open(compilato.pdfUrl, '_blank'); }}
                                className="p-1.5 text-teal-500 hover:text-teal-700 hover:bg-teal-50 rounded transition-colors"
                                title="Anteprima PDF"
                            >
                                <FileCheck className="h-4 w-4" />
                            </button>
                        ) : compilato.stato === 'COMPLETATO' || compilato.firmaPaziente || compilato.firmaMedico ? (
                            <button
                                onClick={(e) => { e.stopPropagation(); generatePdfMutation.mutate(compilato.id); }}
                                disabled={generatePdfMutation.isPending}
                                className="p-1.5 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded transition-colors"
                                title="Genera PDF"
                            >
                                {generatePdfMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCheck className="h-4 w-4" />}
                            </button>
                        ) : null}
                        {isEditable && (
                            <button
                                onClick={(e) => handleEditCompilato(compilato, e)}
                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                title="Modifica questionario"
                            >
                                <Pencil className="h-4 w-4" />
                            </button>
                        )}
                        {isDeletable && (
                            <button
                                onClick={(e) => handleDeleteCompilato(compilato, e)}
                                disabled={deleteMutation.isPending}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Elimina questionario"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        )}
                        <Eye className="h-5 w-5 text-gray-400" />
                    </div>
                </div>
            </div>
        );
    };

    // ============================================
    // RENDER
    // ============================================

    if (!isOpen) return null;

    const isLoading = isLoadingSuggeriti || isLoadingTemplates || isLoadingCompilati;

    const modalContent = (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50"
                onClick={handleClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b bg-gray-50">
                    <div className="flex items-center gap-3">
                        {view !== 'list' && (
                            <button
                                onClick={handleBack}
                                className="p-1 hover:bg-gray-200 rounded-lg transition-colors"
                            >
                                <ChevronRight className="h-5 w-5 rotate-180 text-gray-600" />
                            </button>
                        )}
                        <ClipboardList className="h-6 w-6 text-teal-600" />
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">
                                {view === 'list' && 'Questionari Medici'}
                                {view === 'fill' && selectedTemplate?.nome}
                                {view === 'view' && selectedCompilato?.documentoTemplate?.nome}
                            </h2>
                            {pazienteNome && (
                                <p className="text-sm text-gray-600">Paziente: {pazienteNome}</p>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                        <X className="h-5 w-5 text-gray-600" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    {isLoading && view === 'list' ? (
                        <div className="flex items-center justify-center h-48">
                            <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
                        </div>
                    ) : view === 'list' ? (
                        <div className="space-y-6">
                            {/* Nota operativa — solo in contesto visita MDL */}
                            {visitaId && !readOnly && (
                                <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-800">
                                    <Info className="h-4 w-4 flex-shrink-0 text-blue-500 mt-0.5" />
                                    <div className="space-y-1">
                                        <p className="font-semibold">Note per la visita MDL</p>
                                        <p>I questionari contrassegnati con <span className="font-medium text-amber-700">Nessuna periodicità</span> non genereranno scadenze di follow-up automatiche. Per abilitarle, configura i mesi di periodicità nel template.</p>
                                        <p>I movimenti contabili vengono generati solo se il template è associato a una <span className="font-medium">VoceTariffario</span> nel tariffario aziendale.</p>
                                    </div>
                                </div>
                            )}

                            {/* Questionari già compilati */}
                            {compilati && compilati.length > 0 && (
                                <section>
                                    <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                        <FileText className="h-4 w-4" />
                                        Già compilati ({compilati.length})
                                    </h3>
                                    <div className="space-y-2">
                                        {compilati.map(renderCompilatoCard)}
                                    </div>
                                </section>
                            )}

                            {/* Questionari suggeriti */}
                            {suggeriti && suggeriti.length > 0 && ((() => {
                                const pending = suggeriti.filter((t: QuestionarioTemplate) =>
                                    !(compilati || []).some((c: QuestionarioCompilato) => c.documentoTemplateId === t.id)
                                );
                                return (
                                    <section>
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="text-sm font-semibold text-teal-700 flex items-center gap-2">
                                                <AlertCircle className="h-4 w-4" />
                                                Suggeriti per questa visita ({suggeriti.length})
                                            </h3>
                                            {pending.length > 0 && !readOnly && (
                                                <button
                                                    onClick={handleCompilaTutti}
                                                    disabled={isCompilingAll}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-60 transition-colors"
                                                    title={`Pre-compila ${pending.length} questionari con i valori di default`}
                                                >
                                                    {isCompilingAll
                                                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                        : <Wand2 className="h-3.5 w-3.5" />
                                                    }
                                                    Pre-compila risposte
                                                </button>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            {suggeriti.map((t: QuestionarioTemplate) => renderTemplateCard(t, true))}
                                        </div>
                                    </section>
                                );
                            })())}

                            {/* Tutti i questionari */}
                            <section>
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                        <ClipboardList className="h-4 w-4" />
                                        Tutti i questionari
                                    </h3>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Cerca..."
                                            value={searchTerm}
                                            onChange={e => setSearchTerm(e.target.value)}
                                            className="pl-9 pr-3 py-1.5 text-sm border rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-teal-500"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    {filteredTemplates.map((t: QuestionarioTemplate) => renderTemplateCard(t))}
                                    {filteredTemplates.length === 0 && (
                                        <p className="text-sm text-gray-500 text-center py-8">
                                            Nessun questionario trovato
                                        </p>
                                    )}
                                </div>
                            </section>
                        </div>
                    ) : view === 'fill' && selectedTemplate ? (
                        <div className="space-y-4">
                            {readOnly && (
                                <div className="flex items-center gap-2 px-3 py-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg">
                                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                                    <span>Visita completata — questionario in sola lettura</span>
                                </div>
                            )}
                            {/* S68: When editing a BOZZA, pass initialData to pre-fill answers */}
                            <QuestionarioRenderer
                                key={selectedTemplate.id}
                                template={selectedTemplate}
                                compilatoDa="MEDICO"
                                pazienteId={pazienteId}
                                visitaId={visitaId}
                                readOnly={readOnly}
                                initialData={selectedCompilato?.stato === 'BOZZA' ? selectedCompilato : undefined}
                                onSubmit={handleSubmitQuestionario}
                                isLoading={compilaMutation.isPending}
                            />
                        </div>
                    ) : view === 'view' && selectedCompilato?.documentoTemplate ? (
                        <QuestionarioRenderer
                            template={selectedCompilato.documentoTemplate}
                            compilatoDa="MEDICO"
                            pazienteId={pazienteId}
                            visitaId={visitaId}
                            readOnly
                            initialData={selectedCompilato}
                            onSubmit={() => { }}
                        />
                    ) : null}
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};

export default QuestionariModal;
