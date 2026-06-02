/**
 * Visit Template Detail Page
 * 
 * Pagina dettaglio per un template visita.
 * Mostra anteprima completa del template con info, campi, sidebar, stampa.
 * Permette di modificare il template (apre il modal editor) o tornare alla lista.
 * 
 * @module pages/clinica/impostazioni/visit-templates
 * @project P52 - Clinical Visit Template System
 */

import React, { useMemo, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    ArrowLeft,
    Edit,
    FileText,
    Settings,
    Layout,
    Printer,
    Calendar,
    User,
    Stethoscope,
    Package,
    Star,
    CheckCircle2,
    XCircle,
    Eye,
    EyeOff,
    Copy,
    Trash2,
    Check,
    X,
    Loader2,
    AlertCircle
} from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { useTenantFilter } from '../../../../context/TenantFilterContext';
import { useToast } from '../../../../hooks/useToast';
import { useConfirmDialog } from '@/contexts/ConfirmDialogContext';
import {
    visitTemplatesApi,
    prestazioniApi,
    mediciApi,
    type VisitTemplate,
    type VisitField,
    type VisitTemplateInput
} from '../../../../services/clinicaApi';
import { CRUDButton } from '../../../../components/shared/CRUDButton';
import { ActionButton } from '../../../../components/ui';
import { formatMedicoName } from '../../../../utils/textFormatters';
import TemplateEditorModal from './components/TemplateEditorModal';

// ============================================
// CONSTANTS
// ============================================

const FIELD_TYPE_ICONS: Record<string, string> = {
    TEXT: '📝',
    TEXTAREA: '📄',
    RICHTEXT: '📰',
    NUMBER: '🔢',
    DROPDOWN: '📋',
    MULTI_CHOICE: '☑️',
    DATE: '📅',
    DATETIME: '🕐',
    BOOLEAN: '✅',
    FILE: '📎',
    VITALS: '❤️'
};

const SECTION_LABELS: Record<string, string> = {
    anamnesi: 'Anamnesi',
    vitali: 'Parametri Vitali',
    esame: 'Esame Obiettivo',
    diagnosi: 'Diagnosi',
    terapia: 'Terapia',
    followup: 'Conclusione e Follow-Up'
};

const SCOPE_LABELS: Record<string, { label: string; color: string }> = {
    GLOBAL: { label: 'Globale', color: 'bg-purple-100 text-purple-700' },
    CATALOGO: { label: 'Catalogo', color: 'bg-blue-100 text-blue-700' },
    PRESTAZIONE: { label: 'Prestazione', color: 'bg-teal-100 text-teal-700' },
    PERSONAL: { label: 'Personale', color: 'bg-amber-100 text-amber-700' }
};

// ============================================
// MAIN COMPONENT
// ============================================

const VisitTemplateDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { showToast } = useToast();
    const queryClient = useQueryClient();
    const { tenantFilterKey, isReady } = useTenantFilter();
    const { confirmDelete } = useConfirmDialog();

    const [isEditing, setIsEditing] = useState(false);

    const isAdmin = useMemo(() => {
        return user?.roles?.includes('ADMIN') || user?.roles?.includes('SUPER_ADMIN');
    }, [user?.roles]);

    // ============================================
    // QUERIES
    // ============================================

    const {
        data: template,
        isLoading,
        error
    } = useQuery({
        queryKey: ['visit-template', id, tenantFilterKey],
        queryFn: () => visitTemplatesApi.getById(id!),
        enabled: !!id && isReady
    });

    const { data: defaults } = useQuery({
        queryKey: ['visit-templates', 'defaults'],
        queryFn: () => visitTemplatesApi.getDefaults()
    });

    const { data: prestazioni } = useQuery({
        queryKey: ['prestazioni', 'for-filter', tenantFilterKey],
        queryFn: () => prestazioniApi.getAll({ limit: 100 }),
        enabled: isReady
    });

    const { data: medici } = useQuery({
        queryKey: ['medici', 'for-filter', tenantFilterKey],
        queryFn: () => mediciApi.getAll({ limit: 100 }),
        enabled: isReady && !!isAdmin
    });

    // ============================================
    // MUTATIONS
    // ============================================

    const updateMutation = useMutation({
        mutationFn: (data: Partial<VisitTemplateInput>) =>
            visitTemplatesApi.update(id!, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['visit-template', id] });
            queryClient.invalidateQueries({ queryKey: ['visit-templates'] });
            showToast({ message: 'Template aggiornato con successo', type: 'success' });
            setIsEditing(false);
        },
        onError: (err: Error) => {
            showToast({ message: 'Errore nell\'aggiornamento', type: 'error' });
        }
    });

    const cloneMutation = useMutation({
        mutationFn: () => visitTemplatesApi.clone(id!, { newName: `${template?.name} (copia)` }),
        onSuccess: (cloned) => {
            queryClient.invalidateQueries({ queryKey: ['visit-templates'] });
            showToast({ message: 'Template clonato con successo', type: 'success' });
            navigate(`/poliambulatorio/impostazioni/visit-templates/${cloned.id}`);
        },
        onError: (err: Error) => {
            showToast({ message: 'Errore nella clonazione', type: 'error' });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: () => visitTemplatesApi.delete(id!),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['visit-templates'] });
            showToast({ message: 'Template eliminato', type: 'success' });
            navigate('/poliambulatorio/impostazioni/visit-templates');
        },
        onError: (err: Error) => {
            showToast({ message: 'Errore', type: 'error' });
        }
    });

    const toggleDefaultMutation = useMutation({
        mutationFn: () => visitTemplatesApi.update(id!, { isDefault: !template?.isDefault }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['visit-template', id] });
            queryClient.invalidateQueries({ queryKey: ['visit-templates'] });
            showToast({ message: template?.isDefault ? 'Rimosso come predefinito' : 'Impostato come predefinito', type: 'success' });
        }
    });

    const toggleActiveMutation = useMutation({
        mutationFn: () => visitTemplatesApi.update(id!, { isActive: !template?.isActive }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['visit-template', id] });
            queryClient.invalidateQueries({ queryKey: ['visit-templates'] });
            showToast({ message: template?.isActive ? 'Template disattivato' : 'Template attivato', type: 'success' });
        }
    });

    // ============================================
    // HANDLERS
    // ============================================

    const handleDelete = useCallback(async () => {
        const confirmed = await confirmDelete(template?.name || 'questo template');
        if (confirmed) {
            deleteMutation.mutate();
        }
    }, [template, confirmDelete, deleteMutation]);

    const handleUpdate = useCallback((data: Partial<VisitTemplateInput>) => {
        updateMutation.mutate(data);
    }, [updateMutation]);

    // ============================================
    // DERIVED DATA
    // ============================================

    const visibleFields = useMemo(() => {
        return (template?.fields || []).filter(f => f.visible !== false);
    }, [template?.fields]);

    const visibleSections = useMemo(() => {
        return (template?.sidebarConfig?.sections || []).filter(s => s.visible);
    }, [template?.sidebarConfig?.sections]);

    const fieldsBySection = useMemo(() => {
        const grouped: Record<string, VisitField[]> = {};
        visibleFields.forEach(field => {
            const section = field.section || 'anamnesi';
            if (!grouped[section]) {
                grouped[section] = [];
            }
            grouped[section].push(field);
        });
        return grouped;
    }, [visibleFields]);

    const stats = useMemo(() => ({
        totalFields: template?.fields?.length || 0,
        visibleFields: visibleFields.length,
        hiddenFields: (template?.fields?.length || 0) - visibleFields.length,
        requiredFields: visibleFields.filter(f => f.required).length,
        totalSections: template?.sidebarConfig?.sections?.length || 0,
        visibleSections: visibleSections.length
    }), [template, visibleFields, visibleSections]);

    // ============================================
    // RENDER
    // ============================================

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 text-teal-600 animate-spin mx-auto mb-4" />
                    <p className="text-gray-500">Caricamento template...</p>
                </div>
            </div>
        );
    }

    if (error || !template) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-4" />
                    <h2 className="text-lg font-semibold text-gray-900 mb-2">Template non trovato</h2>
                    <p className="text-gray-500 mb-4">Il template richiesto non esiste o non hai i permessi per visualizzarlo.</p>
                    <button
                        onClick={() => navigate('/poliambulatorio/impostazioni/visit-templates')}
                        className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                    >
                        Torna alla lista
                    </button>
                </div>
            </div>
        );
    }

    const scopeInfo = SCOPE_LABELS[template.scope || 'PERSONAL'];

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate('/poliambulatorio/impostazioni/visit-templates')}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                title="Torna alla lista"
                            >
                                <ArrowLeft className="w-5 h-5 text-gray-600" />
                            </button>
                            <div className={`p-2.5 rounded-xl ${template.isDefault ? 'bg-amber-100 text-amber-600' : 'bg-teal-100 text-teal-600'}`}>
                                <FileText className="w-6 h-6" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h1 className="text-xl font-bold text-gray-900">{template.name}</h1>
                                    {template.isDefault && (
                                        <Star className="w-4 h-4 text-amber-500 fill-current" />
                                    )}
                                    {scopeInfo && (
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${scopeInfo.color}`}>
                                            {scopeInfo.label}
                                        </span>
                                    )}
                                    {!template.isActive && (
                                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                            Non attivo
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-gray-500">
                                    {template.description || 'Template visita medica'}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <CRUDButton
                                onClick={() => setIsEditing(true)}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium"
                            >
                                <Edit className="w-4 h-4" />
                                Modifica
                            </CRUDButton>
                            <ActionButton
                                theme="teal"
                                actions={[
                                    {
                                        label: 'Clona',
                                        icon: <Copy className="w-4 h-4" />,
                                        onClick: () => cloneMutation.mutate()
                                    },
                                    {
                                        label: template.isDefault ? 'Rimuovi default' : 'Imposta default',
                                        icon: <Star className={`w-4 h-4 ${template.isDefault ? 'fill-current' : ''}`} />,
                                        onClick: () => toggleDefaultMutation.mutate()
                                    },
                                    {
                                        label: template.isActive ? 'Disattiva' : 'Attiva',
                                        icon: template.isActive ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />,
                                        onClick: () => toggleActiveMutation.mutate()
                                    },
                                    {
                                        label: 'Elimina',
                                        icon: <Trash2 className="w-4 h-4" />,
                                        onClick: handleDelete,
                                        variant: 'danger' as const
                                    }
                                ]}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6 space-y-6">
                {/* Stats Row */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex items-center gap-2 text-gray-500 mb-1">
                            <Settings className="w-4 h-4" />
                            <span className="text-sm">Campi visibili</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{stats.visibleFields}</p>
                        <p className="text-xs text-gray-500">{stats.hiddenFields} nascosti</p>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex items-center gap-2 text-gray-500 mb-1">
                            <AlertCircle className="w-4 h-4 text-red-400" />
                            <span className="text-sm">Obbligatori</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{stats.requiredFields}</p>
                        <p className="text-xs text-gray-500">di {stats.visibleFields} visibili</p>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex items-center gap-2 text-gray-500 mb-1">
                            <Layout className="w-4 h-4" />
                            <span className="text-sm">Sezioni sidebar</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{stats.visibleSections}</p>
                        <p className="text-xs text-gray-500">di {stats.totalSections} totali</p>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex items-center gap-2 text-gray-500 mb-1">
                            <Printer className="w-4 h-4" />
                            <span className="text-sm">Formato stampa</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{template.printConfig?.pageFormat || 'A4'}</p>
                        <p className="text-xs text-gray-500">
                            {template.printConfig?.orientation === 'landscape' ? 'Orizzontale' : 'Verticale'}
                        </p>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex items-center gap-2 text-gray-500 mb-1">
                            <Calendar className="w-4 h-4" />
                            <span className="text-sm">Versione</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">v{template.version}</p>
                        <p className="text-xs text-gray-500">
                            Layout: {template.sidebarConfig?.sectionLayout || 'sections'}
                        </p>
                    </div>
                </div>

                {/* Associations */}
                {(template.medico || template.prestazione || template.bundle) && (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                        <div className="flex items-center gap-6">
                            {template.medico && (
                                <div className="flex items-center gap-2 text-sm text-gray-700">
                                    <User className="w-4 h-4 text-teal-500" />
                                    <span className="font-medium">{formatMedicoName(template.medico)}</span>
                                </div>
                            )}
                            {template.prestazione && (
                                <div className="flex items-center gap-2 text-sm text-gray-700">
                                    <Stethoscope className="w-4 h-4 text-teal-500" />
                                    <span className="font-medium">{template.prestazione.nome}</span>
                                </div>
                            )}
                            {template.bundle && (
                                <div className="flex items-center gap-2 text-sm text-gray-700">
                                    <Package className="w-4 h-4 text-teal-500" />
                                    <span className="font-medium">{template.bundle.nome}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Fields - 2/3 */}
                    <div className="lg:col-span-2 space-y-4">
                        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-teal-600" />
                            Campi del form ({stats.visibleFields})
                        </h2>

                        {Object.keys(fieldsBySection).length === 0 ? (
                            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                                <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                                <p className="text-gray-500">Nessun campo visibile configurato</p>
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="mt-3 text-sm text-teal-600 hover:text-teal-700 font-medium"
                                >
                                    Configura i campi →
                                </button>
                            </div>
                        ) : (
                            Object.entries(fieldsBySection).map(([section, fields]) => (
                                <div key={section} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                    <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                                        <h3 className="font-medium text-gray-900">
                                            {SECTION_LABELS[section] || section}
                                        </h3>
                                        <span className="text-xs text-gray-400">{fields.length} campi</span>
                                    </div>
                                    <div className="divide-y divide-gray-50">
                                        {fields
                                            .sort((a, b) => a.order - b.order)
                                            .map(field => (
                                                <div key={field.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/50 transition-colors">
                                                    <span className="text-lg flex-shrink-0">
                                                        {FIELD_TYPE_ICONS[field.type] || '📝'}
                                                    </span>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-medium text-gray-900 truncate">
                                                            {field.label}
                                                            {field.required && <span className="text-red-500 ml-1">*</span>}
                                                        </p>
                                                        <p className="text-xs text-gray-400 truncate">
                                                            {field.type}
                                                            {field.size && ` • ${field.size.width}×${field.size.height}`}
                                                            {field.placeholder && ` • "${field.placeholder}"`}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-2 flex-shrink-0">
                                                        {field.required ? (
                                                            <span className="px-2 py-0.5 text-xs font-medium bg-red-50 text-red-600 rounded-full">
                                                                Obbligatorio
                                                            </span>
                                                        ) : (
                                                            <span className="px-2 py-0.5 text-xs font-medium bg-gray-50 text-gray-500 rounded-full">
                                                                Opzionale
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Sidebar + Print Config - 1/3 */}
                    <div className="space-y-4">
                        {/* Sidebar Config */}
                        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                            <Layout className="w-5 h-5 text-teal-600" />
                            Configurazione Sidebar
                        </h2>

                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 space-y-1">
                                <p className="text-sm text-gray-600">
                                    Layout: <span className="font-medium text-gray-900">{template.sidebarConfig?.sectionLayout || 'sections'}</span>
                                </p>
                                <p className="text-sm text-gray-600">
                                    Tab predefinito: <span className="font-medium text-gray-900">{template.sidebarConfig?.defaultTab || 'anamnesi'}</span>
                                </p>
                            </div>
                            <div className="divide-y divide-gray-50">
                                {(template.sidebarConfig?.sections || []).map(section => (
                                    <div
                                        key={section.id}
                                        className={`flex items-center gap-3 px-4 py-2.5 ${!section.visible ? 'opacity-50' : ''}`}
                                    >
                                        {section.visible ? (
                                            <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                                        ) : (
                                            <XCircle className="w-4 h-4 text-gray-300 flex-shrink-0" />
                                        )}
                                        <span className="flex-1 text-sm text-gray-900">{section.title}</span>
                                        {section.visible && section.expandedByDefault && (
                                            <span className="px-1.5 py-0.5 text-xs bg-blue-50 text-blue-600 rounded">
                                                Espanso
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Print Config */}
                        <h2 className="font-semibold text-gray-900 flex items-center gap-2 mt-6">
                            <Printer className="w-5 h-5 text-teal-600" />
                            Configurazione Stampa
                        </h2>

                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y divide-gray-50">
                            {[
                                { label: 'Intestazione', value: template.printConfig?.includeHeader },
                                { label: 'Logo', value: template.printConfig?.includeLogo },
                                { label: 'Firma', value: template.printConfig?.includeSignature },
                                { label: 'Piè di pagina', value: template.printConfig?.includeFooter },
                            ].map(item => (
                                <div key={item.label} className="flex items-center justify-between px-4 py-2.5">
                                    <span className="text-sm text-gray-700">{item.label}</span>
                                    {item.value ? (
                                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                                    ) : (
                                        <XCircle className="w-4 h-4 text-gray-300" />
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Description */}
                        {template.description && (
                            <>
                                <h2 className="font-semibold text-gray-900 mt-6">Descrizione</h2>
                                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                                    <p className="text-sm text-gray-600 leading-relaxed">{template.description}</p>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Edit Modal */}
            {isEditing && defaults && (
                <TemplateEditorModal
                    isOpen={true}
                    template={template}
                    defaults={defaults}
                    prestazioni={prestazioni?.data || []}
                    medici={medici?.data || []}
                    currentUserId={user?.id}
                    isAdmin={!!isAdmin}
                    onSave={(data) => handleUpdate(data as Partial<VisitTemplateInput>)}
                    onClose={() => setIsEditing(false)}
                    isSaving={updateMutation.isPending}
                />
            )}
        </div>
    );
};

export default VisitTemplateDetailPage;
