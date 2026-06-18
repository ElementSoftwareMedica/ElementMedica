/**
 * Email Template Settings Page
 * Gestione template email per invio referto:
 * configurabili per branca, medico o prestazione specifica.
 *
 * Route: /poliambulatorio/impostazioni/email-template
 * @project P74 - Document Management & Email Templates
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Mail,
    Plus,
    Trash2,
    Edit,
    ChevronLeft,
    Loader2,
    X,
    Eye,
    EyeOff,
    Info,
    Paperclip,
    UserCheck,
    Stethoscope
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/useToast';
import { useConfirmDialog } from '@/contexts/ConfirmDialogContext';
import { useAuth } from '@/context/AuthContext';
import { useRoleGuard } from '@/hooks/useRoleGuard';
import { CRUDButton, CRUDPrimaryButton } from '@/components/shared/CRUDButton';
import { ActionButton } from '@/components/ui';
import type { DropdownAction } from '@/design-system/molecules/Dropdown/Dropdown';
import {
    emailTemplatesApi,
    mediciApi,
    prestazioniApi,
    type EmailTemplate,
    type EmailTemplateInput,
    type Medico,
    type Prestazione
} from '@/services/clinicaApi';
import { internalDocumentApi } from '@/services/managementDocsApi';
import { formatMedicoName } from '@/utils/textFormatters';
import { ElegantSelect } from '@/components/ui/ElegantSelect';

// ============================================================
// CONSTANTS
// ============================================================

const BRANCHE = [
    { value: '', label: '— Tutte le branche (default tenant) —' },
    { value: 'MEDICA', label: 'Poliambulatorio (MEDICA)' },
    { value: 'MDL', label: 'Medicina del Lavoro (MDL)' }
];

const TEMPLATE_VARS = [
    { var: '{{paziente}}', desc: 'Nome e cognome del paziente' },
    { var: '{{data}}', desc: 'Data della visita' },
    { var: '{{medico}}', desc: 'Nome del medico' },
    { var: '{{prestazione}}', desc: 'Nome della prestazione' },
    { var: '{{struttura}}', desc: 'Nome della struttura' }
];

// ============================================================
// HELPER: build priority label
// ============================================================

function buildPriorityBadge(tpl: EmailTemplate): { label: string; className: string } {
    if (tpl.prestazioneId) return { label: 'Per prestazione', className: 'bg-purple-100 text-purple-800' };
    if (tpl.medicoId) return { label: 'Per medico', className: 'bg-blue-100 text-blue-800' };
    if (tpl.branca) return { label: `Branca ${tpl.branca}`, className: 'bg-teal-100 text-teal-800' };
    return { label: 'Default tenant', className: 'bg-gray-100 text-gray-700' };
}

// ============================================================
// FORM MODAL
// ============================================================

interface EmailTemplateFormProps {
    existing?: EmailTemplate | null;
    medici: Medico[];
    prestazioni: Prestazione[];
    isBaseMedico: boolean;
    currentMedicoId?: string;
    onClose: () => void;
    onSuccess: () => void;
}

const EmailTemplateForm: React.FC<EmailTemplateFormProps> = ({
    existing,
    medici,
    prestazioni,
    isBaseMedico,
    currentMedicoId,
    onClose,
    onSuccess
}) => {
    const { showToast } = useToast();

    const [nome, setNome] = useState(existing?.nome || '');
    const [branca, setBranca] = useState(existing?.branca || '');
    const [subject, setSubject] = useState(existing?.subject || 'Referto visita — {{prestazione}}');
    const [bodyHtml, setBodyHtml] = useState(
        existing?.bodyHtml ||
        `<p>Gentile {{paziente}},</p>
<p>In allegato trova il referto della visita del <strong>{{data}}</strong> con il dott. <strong>{{medico}}</strong>.</p>
<p>Prestazione: {{prestazione}}</p>
<br>
<p>Cordiali saluti,<br>{{struttura}}</p>`
    );
    const [allegatiIds, setAllegatiIds] = useState<string[]>(existing?.allegatiIds || []);
    const [isDefault, setIsDefault] = useState(existing?.isDefault || false);
    const [isActive, setIsActive] = useState(existing ? (existing.isActive !== false) : true);
    const [medicoId, setMedicoId] = useState(existing?.medicoId || (isBaseMedico ? currentMedicoId || '' : ''));
    const [prestazioneId, setPrestazioneId] = useState(existing?.prestazioneId || '');
    const [showVars, setShowVars] = useState(false);
    const allowedPrestazioneIds = useMemo(() => new Set(prestazioni.map(p => p.id)), [prestazioni]);

    // Load marketing docs for allegati
    const { data: marketingDocs } = useQuery({
        queryKey: ['marketing-docs'],
        queryFn: internalDocumentApi.getMarketing,
        staleTime: 60_000
    });

    const insertVar = (v: string) => {
        setBodyHtml(prev => prev + v);
    };

    const mutation = useMutation({
        mutationFn: (input: EmailTemplateInput) =>
            existing ? emailTemplatesApi.update(existing.id, input) : emailTemplatesApi.create(input),
        onSuccess: () => {
            showToast({ message: existing ? 'Template aggiornato' : 'Template creato', type: 'success' });
            onSuccess();
            onClose();
        },
        onError: () => showToast({ message: 'Errore nel salvataggio del template', type: 'error' })
    });

    const handleSubmit = () => {
        if (!nome.trim()) { showToast({ message: 'Il nome è obbligatorio', type: 'error' }); return; }
        if (!subject.trim()) { showToast({ message: "L'oggetto email è obbligatorio", type: 'error' }); return; }
        if (!bodyHtml.trim()) { showToast({ message: 'Il corpo email è obbligatorio', type: 'error' }); return; }

        const effectiveMedicoId = isBaseMedico ? currentMedicoId : medicoId || undefined;
        const effectivePrestazioneId = prestazioneId || undefined;
        if (isBaseMedico && effectivePrestazioneId && !allowedPrestazioneIds.has(effectivePrestazioneId)) {
            showToast({ message: 'Puoi usare solo le prestazioni abilitate per il tuo profilo', type: 'warning' });
            return;
        }

        mutation.mutate({
            nome: nome.trim(),
            branca: isBaseMedico ? undefined : branca || undefined,
            medicoId: effectiveMedicoId,
            prestazioneId: effectivePrestazioneId,
            subject: subject.trim(),
            bodyHtml,
            allegatiIds,
            isDefault,
            isActive
        });
    };

    const toggleAllegato = (id: string) => {
        setAllegatiIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between border-b px-6 py-4 flex-shrink-0">
                    <h2 className="text-lg font-semibold text-gray-900">
                        {existing ? 'Modifica template' : 'Nuovo template email'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                    {/* Nome */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nome template *</label>
                        <input
                            type="text"
                            value={nome}
                            onChange={e => setNome(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            placeholder="es. Referto standard MEDICA"
                            autoFocus
                        />
                    </div>

                    {/* Scope section */}
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-4">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                            <Info className="h-3.5 w-3.5" />
                            Ambito di applicazione (dal più generico al più specifico)
                        </p>

                        {/* Branca */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Branca</label>
                            <ElegantSelect
                                value={branca}
                                onChange={v => setBranca(v)}
                                disabled={isBaseMedico}
                                options={BRANCHE}
                            />
                        </div>

                        {/* Medico */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1.5">
                                <UserCheck className="h-3.5 w-3.5 text-blue-500" />
                                Medico specifico <span className="font-normal text-xs text-gray-400">(sovrascrive branca)</span>
                            </label>
                            <ElegantSelect
                                value={medicoId}
                                onChange={v => setMedicoId(v)}
                                disabled={isBaseMedico}
                                options={[
                                    ...(!isBaseMedico ? [{ value: '', label: '— Tutti i medici —' }] : []),
                                    ...medici.map(m => ({ value: m.id, label: formatMedicoName(m) }))
                                ]}
                            />
                        </div>

                        {/* Prestazione */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1.5">
                                <Stethoscope className="h-3.5 w-3.5 text-purple-500" />
                                Prestazione specifica <span className="font-normal text-xs text-gray-400">(sovrascrive medico e branca)</span>
                            </label>
                            <ElegantSelect
                                value={prestazioneId}
                                onChange={v => setPrestazioneId(v)}
                                options={[
                                    ...(!isBaseMedico ? [{ value: '', label: '— Tutte le prestazioni —' }] : []),
                                    ...prestazioni.map(p => ({ value: p.id, label: `${p.codice} — ${p.nome}` }))
                                ]}
                            />
                        </div>
                    </div>

                    {/* Is Active + Is Default */}
                    <div className="flex items-center gap-6 flex-wrap">
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setIsActive(!isActive)}
                                className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200
                                    ${isActive ? 'bg-teal-600' : 'bg-gray-200'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${isActive ? 'translate-x-4' : 'translate-x-0'}`} />
                            </button>
                            <label className="text-sm text-gray-700">Template attivo</label>
                        </div>

                        {/* Is Default */}
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setIsDefault(!isDefault)}
                                className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200
                                    ${isDefault ? 'bg-amber-500' : 'bg-gray-200'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${isDefault ? 'translate-x-4' : 'translate-x-0'}`} />
                            </button>
                            <label className="text-sm text-gray-700">Template predefinito per ambito</label>
                            <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                                Un solo default per ambito
                            </span>
                        </div>
                    </div>

                    {/* Subject */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Oggetto email *</label>
                        <input
                            type="text"
                            value={subject}
                            onChange={e => setSubject(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500"
                        />
                    </div>

                    {/* Body HTML */}
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="block text-sm font-medium text-gray-700">Corpo email (HTML) *</label>
                            <button
                                type="button"
                                onClick={() => setShowVars(!showVars)}
                                className="text-xs text-teal-600 hover:text-teal-700 flex items-center gap-1"
                            >
                                <Info className="h-3.5 w-3.5" />
                                Variabili disponibili
                            </button>
                        </div>
                        {showVars && (
                            <div className="mb-2 bg-teal-50 border border-teal-200 rounded-lg p-3 flex flex-wrap gap-2">
                                {TEMPLATE_VARS.map(v => (
                                    <button
                                        key={v.var}
                                        type="button"
                                        onClick={() => insertVar(v.var)}
                                        className="text-xs font-mono bg-white border border-teal-300 text-teal-700 px-2 py-1 rounded hover:bg-teal-100 transition-colors"
                                        title={v.desc}
                                    >
                                        {v.var}
                                    </button>
                                ))}
                            </div>
                        )}
                        <textarea
                            value={bodyHtml}
                            onChange={e => setBodyHtml(e.target.value)}
                            rows={10}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-teal-500 resize-y"
                            placeholder="<p>Corpo email in HTML...</p>"
                            spellCheck={false}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Il referto PDF verrà allegato automaticamente. Usa le variabili <code className="bg-gray-100 px-1 rounded">{'{{nome}}'}</code> per personalizzare il testo.
                        </p>
                    </div>

                    {/* Marketing docs allegati */}
                    {(marketingDocs && marketingDocs.length > 0) && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                <Paperclip className="h-3.5 w-3.5 inline mr-1" />
                                Allegati marketing aggiuntivi
                            </label>
                            <div className="border border-gray-200 rounded-lg divide-y max-h-40 overflow-y-auto">
                                {marketingDocs.map((doc) => (
                                    <label key={doc.id} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={allegatiIds.includes(doc.id)}
                                            onChange={() => toggleAllegato(doc.id)}
                                            className="rounded text-teal-600 focus:ring-teal-500"
                                        />
                                        <span className="text-sm text-gray-700">{doc.nome}</span>
                                        {doc.fileName && <span className="text-xs text-gray-400 ml-auto">{doc.fileName}</span>}
                                    </label>
                                ))}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                I documenti marketing selezionati verranno allegati ad ogni email inviata con questo template.
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 border-t px-6 py-4 flex-shrink-0">
                    <CRUDButton onClick={onClose} variant="secondary" disabled={mutation.isPending}>Annulla</CRUDButton>
                    <CRUDPrimaryButton onClick={handleSubmit} disabled={mutation.isPending}>
                        {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        {existing ? 'Aggiorna template' : 'Crea template'}
                    </CRUDPrimaryButton>
                </div>
            </div>
        </div>
    );
};

// ============================================================
// MAIN PAGE
// ============================================================

const EmailTemplateSettingsPage: React.FC = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const { user, hasPermission } = useAuth();
    const { isMedico, isMedicoCompetente } = useRoleGuard();
    const queryClient = useQueryClient();
    const { confirmDelete } = useConfirmDialog();

    const [formModal, setFormModal] = useState<{ open: boolean; template?: EmailTemplate | null }>({ open: false });
    const isBaseMedico = !!(isMedico && !isMedicoCompetente);
    const canWriteEmailTemplates = hasPermission('email-templates', 'write') || hasPermission('email-templates:write');

    const { data: mediciResult } = useQuery({
        queryKey: ['medici-list-email-tpl', isBaseMedico, user?.id],
        queryFn: () => isBaseMedico && user?.id
            ? mediciApi.getById(user.id).then(m => ({ data: [m] }))
            : mediciApi.getAll({ limit: 200 }),
        staleTime: 60_000,
        enabled: !isBaseMedico || !!user?.id
    });
    const medici: Medico[] = (mediciResult as any)?.data || (Array.isArray(mediciResult) ? mediciResult : []);
    const ownMedico = medici[0];

    const { data: prestazioniResult } = useQuery({
        queryKey: ['prestazioni-list-email-tpl', isBaseMedico, user?.id],
        queryFn: () => prestazioniApi.getAll({ limit: 200 }),
        staleTime: 60_000
    });
    const allPrestazioni: Prestazione[] = (prestazioniResult as any)?.data || (Array.isArray(prestazioniResult) ? prestazioniResult : []);
    const prestazioni = useMemo(() => {
        if (!isBaseMedico) return allPrestazioni;
        return (ownMedico?.abilitazioni || [])
            .filter(a => a.attivo && a.prestazione)
            .map(a => a.prestazione as Prestazione);
    }, [isBaseMedico, allPrestazioni, ownMedico?.abilitazioni]);

    const { data: result, isLoading } = useQuery({
        queryKey: ['email-templates', isBaseMedico, user?.id],
        queryFn: () => emailTemplatesApi.getAll(isBaseMedico && user?.id ? { medicoId: user.id } : undefined)
    });

    const templates = result?.data || [];
    const visibleTemplates = isBaseMedico && user?.id
        ? templates.filter(tpl => tpl.medicoId === user.id)
        : templates;

    const deleteMutation = useMutation({
        mutationFn: emailTemplatesApi.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['email-templates'] });
            showToast({ message: 'Template eliminato', type: 'success' });
        },
        onError: () => showToast({ message: "Errore nell'eliminazione del template", type: 'error' })
    });

    const toggleActiveMutation = useMutation({
        mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
            emailTemplatesApi.update(id, { isActive }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['email-templates'] }),
        onError: () => showToast({ message: "Errore nell'aggiornamento del template", type: 'error' })
    });

    const handleDelete = useCallback(async (tpl: EmailTemplate) => {
        if (!canWriteEmailTemplates || (isBaseMedico && tpl.medicoId !== user?.id)) {
            showToast({ message: 'Non puoi modificare template email di altri medici', type: 'warning' });
            return;
        }
        if (await confirmDelete(tpl.nome)) {
            deleteMutation.mutate(tpl.id);
        }
    }, [deleteMutation, confirmDelete, canWriteEmailTemplates, isBaseMedico, user?.id, showToast]);

    return (
        <div className="p-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <button
                    onClick={() => navigate('/poliambulatorio/impostazioni')}
                    className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-teal-600 mb-3 transition-colors"
                >
                    <ChevronLeft className="h-4 w-4" />
                    Impostazioni
                </button>
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Mail className="h-8 w-8 text-teal-600" />
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Template Email Referto</h1>
                            <p className="text-sm text-gray-500 mt-0.5">
                                Configura testo e allegati delle email di invio referto per branca, medico o prestazione.
                            </p>
                        </div>
                    </div>
                    {canWriteEmailTemplates && (
                        <CRUDPrimaryButton onClick={() => setFormModal({ open: true })}>
                            <Plus className="h-4 w-4" />
                            Nuovo template
                        </CRUDPrimaryButton>
                    )}
                </div>
            </div>

            {/* Info banner */}
            <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-teal-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-teal-800">
                        <p className="font-medium mb-1">Priorità di selezione del template</p>
                        <p>Al momento dell'invio del referto viene scelto automaticamente il template più specifico disponibile:</p>
                        <ol className="list-decimal list-inside mt-1 space-y-0.5 text-teal-700">
                            <li>Template per <strong>prestazione specifica</strong></li>
                            <li>Template per <strong>medico specifico</strong></li>
                            <li>Template per <strong>branca</strong> (es. MEDICA)</li>
                            <li>Template <strong>default tenant</strong> (nessun filtro)</li>
                            <li>Testo predefinito del sistema</li>
                        </ol>
                    </div>
                </div>
            </div>

            {/* Template list */}
            {isLoading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
                </div>
            ) : visibleTemplates.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                    <Mail className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-500 mb-2">Nessun template configurato</h3>
                    <p className="text-sm text-gray-400 mb-6">
                        Crea il primo template per personalizzare le email di invio referto.
                    </p>
                    {canWriteEmailTemplates && (
                        <CRUDPrimaryButton onClick={() => setFormModal({ open: true })}>
                            <Plus className="h-4 w-4" />
                            Crea primo template
                        </CRUDPrimaryButton>
                    )}
                </div>
            ) : (
                <div className="space-y-3">
                    {visibleTemplates.map(tpl => {
                        const badge = buildPriorityBadge(tpl);
                        const canManageTemplate = canWriteEmailTemplates && (!isBaseMedico || tpl.medicoId === user?.id);
                        return (
                            <div
                                key={tpl.id}
                                className={`bg-white rounded-xl border p-4 flex items-start gap-4 transition-all
                                    ${tpl.isActive ? 'border-gray-200 hover:border-gray-300' : 'border-gray-100 opacity-60'}`}
                            >
                                {/* Icon */}
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
                                    ${tpl.isActive ? 'bg-teal-50' : 'bg-gray-50'}`}>
                                    <Mail className={`h-5 w-5 ${tpl.isActive ? 'text-teal-600' : 'text-gray-400'}`} />
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="text-sm font-semibold text-gray-900">{tpl.nome}</p>
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.className}`}>
                                            {badge.label}
                                        </span>
                                        {tpl.isDefault && (
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                                                ★ Predefinito
                                            </span>
                                        )}
                                        {!tpl.isActive && (
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                                                Disattivato
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1 truncate">
                                        <span className="font-medium">Oggetto:</span> {tpl.subject}
                                    </p>
                                    {tpl.allegatiIds.length > 0 && (
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            <Paperclip className="h-3 w-3 inline mr-1" />
                                            {tpl.allegatiIds.length} allegat{tpl.allegatiIds.length === 1 ? 'o' : 'i'} marketing
                                        </p>
                                    )}
                                </div>

                                {/* Actions */}
                                {canManageTemplate && (
                                    <div className="flex-shrink-0" onClick={e => e.stopPropagation()}>
                                        <ActionButton
                                            theme="teal"
                                            actions={[
                                                {
                                                    label: tpl.isActive ? 'Disattiva' : 'Attiva',
                                                    icon: tpl.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />,
                                                    onClick: () => toggleActiveMutation.mutate({ id: tpl.id, isActive: !tpl.isActive })
                                                },
                                                {
                                                    label: 'Modifica',
                                                    icon: <Edit className="h-4 w-4" />,
                                                    onClick: () => setFormModal({ open: true, template: tpl })
                                                },
                                                {
                                                    label: 'Elimina',
                                                    icon: <Trash2 className="h-4 w-4" />,
                                                    onClick: () => handleDelete(tpl),
                                                    variant: 'danger' as const
                                                }
                                            ] satisfies DropdownAction[]}
                                        />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Form Modal */}
            {formModal.open && (
                <EmailTemplateForm
                    existing={formModal.template}
                    medici={medici}
                    prestazioni={prestazioni}
                    isBaseMedico={isBaseMedico}
                    currentMedicoId={user?.id}
                    onClose={() => setFormModal({ open: false })}
                    onSuccess={() => queryClient.invalidateQueries({ queryKey: ['email-templates'] })}
                />
            )}
        </div>
    );
};

export default EmailTemplateSettingsPage;
