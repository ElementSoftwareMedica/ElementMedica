/**
 * Tab Template PDF - Editor WYSIWYG per il template di stampa/PDF
 * 
 * Tre modalità di editing:
 * - Visuale: Editor TipTap WYSIWYG per composizione documenti
 * - HTML: Textarea per editing diretto del codice HTML
 * - Anteprima: Preview con dati di esempio sostituiti
 * 
 * Features:
 * - Inserimento placeholder {{variabile}} per dati dinamici
 * - Importazione da template libreria o modulistica esistenti
 * - Toggle tra modalità visuale/HTML/anteprima
 * 
 * @module pages/clinica/impostazioni/modulistica/components
 */

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { sanitizeRichHtml } from '@/utils/sanitize';
import { getOptionLabel } from '@/utils/optionHelpers';
import {
    Code,
    Eye,
    Copy,
    Check,
    Info,
    ChevronDown,
    ChevronRight,
    Wand2,
    PenTool,
    Library,
    X,
    Loader2,
    Search
} from 'lucide-react';
import type { FormData } from './types';
import { PDF_PLACEHOLDERS, DEFAULT_PDF_TEMPLATE } from './types';
import TipTapEditor from '@/components/editor/TipTapEditor';
import { modulisticaTemplatesApi } from '@/services/clinicaApi';
import { templateService } from '@/services/templateService';

// ============================================
// TYPES
// ============================================

interface TabTemplateProps {
    contenutoHtml: string;
    formData: FormData;
    onChange: (contenutoHtml: string) => void;
    /** ID del template corrente, per escluderlo dalla lista di importazione */
    currentTemplateId?: string;
}

type EditorMode = 'visual' | 'html' | 'preview';

interface LibraryTemplate {
    id: string;
    nome: string;
    tipo: string;
    source: 'modulistica' | 'libreria';
    contenutoHtml?: string;
}

// ============================================
// SUB-COMPONENTS
// ============================================

/** Pannello placeholder raggruppati per categoria */
const PlaceholderPanel: React.FC<{
    onInsert: (placeholder: string) => void;
}> = ({ onInsert }) => {
    const [copiedKey, setCopiedKey] = useState<string | null>(null);
    const [expandedCategory, setExpandedCategory] = useState<string | null>('Questionario');

    const categories = useMemo(() => {
        const grouped: Record<string, typeof PDF_PLACEHOLDERS> = {};
        PDF_PLACEHOLDERS.forEach(p => {
            if (!grouped[p.category]) grouped[p.category] = [];
            grouped[p.category].push(p);
        });
        return grouped;
    }, []);

    const handleCopy = (key: string) => {
        navigator.clipboard.writeText(key);
        setCopiedKey(key);
        setTimeout(() => setCopiedKey(null), 1500);
    };

    return (
        <div className="space-y-1">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                Placeholder Disponibili
            </p>
            {Object.entries(categories).map(([category, placeholders]) => (
                <div key={category} className="border border-gray-100 rounded-lg overflow-hidden">
                    <button
                        type="button"
                        onClick={() => setExpandedCategory(expandedCategory === category ? null : category)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                        {expandedCategory === category ? (
                            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                        ) : (
                            <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                        )}
                        {category}
                        <span className="text-xs text-gray-400 ml-auto">{placeholders.length}</span>
                    </button>
                    {expandedCategory === category && (
                        <div className="px-2 pb-2 space-y-0.5">
                            {placeholders.map(p => (
                                <div
                                    key={p.key}
                                    className="flex items-center gap-1 group"
                                >
                                    <button
                                        type="button"
                                        onClick={() => onInsert(p.key)}
                                        className="flex-1 text-left px-2 py-1 text-xs rounded hover:bg-teal-50 hover:text-teal-700 transition-colors truncate"
                                        title={`Inserisci ${p.key}`}
                                    >
                                        <span className="font-mono text-teal-600">{p.key}</span>
                                        <span className="text-gray-400 ml-1">— {p.label}</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleCopy(p.key)}
                                        className="p-1 text-gray-300 hover:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Copia"
                                    >
                                        {copiedKey === p.key ? (
                                            <Check className="w-3 h-3 text-green-500" />
                                        ) : (
                                            <Copy className="w-3 h-3" />
                                        )}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

/** Preview del template con dati di esempio */
const TemplatePreview: React.FC<{
    html: string;
    formData: FormData;
}> = ({ html, formData }) => {
    const processedHtml = useMemo(() => {
        let result = html;

        const sampleData: Record<string, string> = {
            '{{nomePaziente}}': 'Mario',
            '{{cognomePaziente}}': 'Rossi',
            '{{codiceFiscalePaziente}}': 'RSSMRA80A01H501Z',
            '{{dataNascitaPaziente}}': '01/01/1980',
            '{{luogoNascitaPaziente}}': 'Roma (RM)',
            '{{emailPaziente}}': 'mario.rossi@email.it',
            '{{telefonoPaziente}}': '+39 333 1234567',
            '{{nomeMedico}}': 'Paolo',
            '{{cognomeMedico}}': 'Bianchi',
            '{{titoloMedico}}': 'Dott.',
            '{{dataVisita}}': new Date().toLocaleDateString('it-IT'),
            '{{oraVisita}}': '09:30',
            '{{prestazione}}': 'Visita Specialistica',
            '{{ambulatorio}}': 'Ambulatorio 1',
            '{{logoTenant}}': '<div style="width:80px;height:80px;background:#0d9488;border-radius:8px;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:14px;">LOGO</div>',
            '{{nomeStruttura}}': 'Studio Medico Esempio',
            '{{indirizzoStruttura}}': 'Via Esempio 123, 35030 Selvazzano Dentro (PD)',
            '{{telefonoStruttura}}': '+39 351 318 1574',
            '{{dataCompilazione}}': new Date().toLocaleDateString('it-IT'),
            '{{dataOggi}}': new Date().toLocaleDateString('it-IT'),
            '{{nomeDocumento}}': formData.nome || 'Documento Template',
            '{{codiceDocumento}}': formData.codice || 'MOD-001',
            '{{firmaPaziente}}': '<div style="font-family:cursive;font-size:20px;color:#333;padding:10px;">Mario Rossi</div>',
            '{{firmaMedico}}': '<div style="font-family:cursive;font-size:20px;color:#333;padding:10px;">Dott. P. Bianchi</div>',
        };

        // Genera anteprima campi questionario
        if (formData.campi.length > 0) {
            const campiHtml = formData.campi.map((campo, index) => {
                let answerHtml = '';
                switch (campo.type) {
                    case 'boolean':
                        answerHtml = '<span style="color: #0d9488; font-weight: 600;">☑ Sì</span> / <span style="color: #6b7280;">☐ No</span>';
                        break;
                    case 'select':
                    case 'radio':
                        answerHtml = campo.options?.[0] ? getOptionLabel(campo.options[0]) : '—';
                        break;
                    case 'multiselect':
                        answerHtml = (campo.options || []).slice(0, 2).map(o => getOptionLabel(o)).join(', ') || '—';
                        break;
                    case 'signature':
                        answerHtml = '<span style="font-family:cursive;font-size:16px;">Firma</span>';
                        break;
                    case 'date':
                        answerHtml = new Date().toLocaleDateString('it-IT');
                        break;
                    default:
                        answerHtml = '<span style="color: #666;">Risposta di esempio</span>';
                }
                return `
                    <tr style="border-bottom: 1px solid #f0f0f0;">
                        <td style="padding: 10px 12px; font-weight: 500; color: #374151; font-size: 13px; width: 40%; vertical-align: top;">
                            ${index + 1}. ${campo.label || campo.name}
                            ${campo.required ? '<span style="color: #ef4444;">*</span>' : ''}
                        </td>
                        <td style="padding: 10px 12px; font-size: 13px; color: #1a1a1a;">${answerHtml}</td>
                    </tr>
                `;
            }).join('');

            sampleData['{{campiQuestionario}}'] = `
                <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                    <thead>
                        <tr style="background: #f8fffe;">
                            <th style="padding: 10px 12px; text-align: left; font-size: 12px; color: #0d9488; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e5e7eb;">Domanda</th>
                            <th style="padding: 10px 12px; text-align: left; font-size: 12px; color: #0d9488; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e5e7eb;">Risposta</th>
                        </tr>
                    </thead>
                    <tbody>${campiHtml}</tbody>
                </table>
            `;
        } else {
            sampleData['{{campiQuestionario}}'] = '<p style="color: #999; font-style: italic; text-align: center; padding: 20px;">Nessun campo questionario definito</p>';
        }

        Object.entries(sampleData).forEach(([key, value]) => {
            result = result.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
        });

        return result;
    }, [html, formData]);

    return (
        <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-inner">
            <div
                className="p-4"
                dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(processedHtml) }}
            />
        </div>
    );
};

/** Modal per scegliere da template esistenti */
const TemplateLibraryModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSelect: (html: string) => void;
    currentTemplateId?: string;
}> = ({ isOpen, onClose, onSelect, currentTemplateId }) => {
    const [templates, setTemplates] = useState<LibraryTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [sourceFilter, setSourceFilter] = useState<'all' | 'modulistica' | 'libreria'>('all');

    useEffect(() => {
        if (!isOpen) return;
        const loadTemplates = async () => {
            setIsLoading(true);
            try {
                const results: LibraryTemplate[] = [];

                // Load modulistica templates
                try {
                    const modRes = await modulisticaTemplatesApi.getAll({ isActive: true, limit: 100 });
                    for (const t of modRes.data) {
                        if (t.id === currentTemplateId) continue;
                        if (!t.contenutoHtml) continue;
                        results.push({
                            id: t.id,
                            nome: t.nome,
                            tipo: t.tipo,
                            source: 'modulistica',
                            contenutoHtml: t.contenutoHtml
                        });
                    }
                } catch { /* non-critical */ }

                // Load library templates
                try {
                    const libRes = await templateService.list({ limit: 100, isActive: true });
                    for (const t of (libRes.data || [])) {
                        if (!t.content) continue;
                        results.push({
                            id: t.id,
                            nome: t.name,
                            tipo: t.type,
                            source: 'libreria',
                            contenutoHtml: t.content
                        });
                    }
                } catch { /* non-critical */ }

                setTemplates(results);
            } finally {
                setIsLoading(false);
            }
        };
        loadTemplates();
    }, [isOpen, currentTemplateId]);

    const filteredTemplates = useMemo(() => {
        return templates.filter(t => {
            if (sourceFilter !== 'all' && t.source !== sourceFilter) return false;
            if (search && !t.nome.toLowerCase().includes(search.toLowerCase())) return false;
            return true;
        });
    }, [templates, sourceFilter, search]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[70vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b">
                    <div className="flex items-center gap-2">
                        <Library className="w-5 h-5 text-teal-600" />
                        <h3 className="font-semibold text-gray-800">Importa template</h3>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1 hover:bg-gray-100 rounded"
                    >
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {/* Filters */}
                <div className="px-5 py-3 border-b space-y-2">
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Cerca template..."
                            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                        />
                    </div>
                    <div className="flex gap-2">
                        {(['all', 'modulistica', 'libreria'] as const).map(f => (
                            <button
                                key={f}
                                type="button"
                                onClick={() => setSourceFilter(f)}
                                className={`px-3 py-1 text-xs rounded-full transition-colors ${sourceFilter === f
                                    ? 'bg-teal-100 text-teal-700'
                                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                    }`}
                            >
                                {f === 'all' ? 'Tutti' : f === 'modulistica' ? 'Modulistica' : 'Libreria'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Template list */}
                <div className="flex-1 overflow-y-auto px-5 py-3">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
                        </div>
                    ) : filteredTemplates.length === 0 ? (
                        <div className="text-center py-8 text-sm text-gray-400">
                            Nessun template trovato
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filteredTemplates.map(t => (
                                <button
                                    key={`${t.source}-${t.id}`}
                                    type="button"
                                    onClick={() => {
                                        if (t.contenutoHtml) {
                                            onSelect(t.contenutoHtml);
                                            onClose();
                                        }
                                    }}
                                    className="w-full text-left p-3 border border-gray-100 rounded-lg hover:border-teal-300 hover:bg-teal-50/50 transition-colors group"
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-gray-800 group-hover:text-teal-700">
                                                {t.nome}
                                            </p>
                                            <p className="text-xs text-gray-400 mt-0.5">
                                                {t.tipo.replace(/_/g, ' ')}
                                            </p>
                                        </div>
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${t.source === 'modulistica'
                                            ? 'bg-teal-50 text-teal-600'
                                            : 'bg-violet-50 text-violet-600'
                                            }`}>
                                            {t.source === 'modulistica' ? 'Modulistica' : 'Libreria'}
                                        </span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ============================================
// MAIN COMPONENT
// ============================================

const TabTemplate: React.FC<TabTemplateProps> = ({ contenutoHtml, formData, onChange, currentTemplateId }) => {
    const [editorMode, setEditorMode] = useState<EditorMode>('visual');
    const [showLibrary, setShowLibrary] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const editorRef = useRef<any>(null);

    // Insert placeholder at cursor position (works for both modes)
    const insertPlaceholder = useCallback((placeholder: string) => {
        if (editorMode === 'html') {
            // HTML textarea mode
            const textarea = textareaRef.current;
            if (!textarea) {
                onChange(contenutoHtml + placeholder);
                return;
            }
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const newContent = contenutoHtml.substring(0, start) + placeholder + contenutoHtml.substring(end);
            onChange(newContent);
            requestAnimationFrame(() => {
                textarea.selectionStart = textarea.selectionEnd = start + placeholder.length;
                textarea.focus();
            });
        } else if (editorMode === 'visual' && editorRef.current) {
            // TipTap visual mode — insert as text node
            editorRef.current
                .chain()
                .focus()
                .insertContent(placeholder)
                .run();
        }
    }, [editorMode, contenutoHtml, onChange]);

    const loadDefaultTemplate = () => {
        onChange(DEFAULT_PDF_TEMPLATE);
        // Also update TipTap editor if in visual mode
        if (editorRef.current) {
            editorRef.current.commands.setContent(DEFAULT_PDF_TEMPLATE, false);
        }
    };

    const handleImportTemplate = (html: string) => {
        onChange(html);
        // Also update TipTap editor if in visual mode
        if (editorRef.current) {
            editorRef.current.commands.setContent(html, false);
        }
    };

    // Sync TipTap content when switching FROM html mode TO visual mode
    const [lastMode, setLastMode] = useState<EditorMode>('visual');
    useEffect(() => {
        if (lastMode === 'html' && editorMode === 'visual' && editorRef.current) {
            editorRef.current.commands.setContent(contenutoHtml, false);
        }
        setLastMode(editorMode);
    }, [editorMode]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className="space-y-4">
            {/* Info box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                    <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-700">
                        <p className="font-medium mb-1">Template per stampa/PDF</p>
                        <p>
                            Componi il template del documento con l&apos;editor visuale. Usa i placeholder come{' '}
                            <code className="bg-blue-100 px-1 rounded text-xs">{`{{nomePaziente}}`}</code>{' '}
                            per inserire dati dinamici. Passa alla modalità HTML per editing avanzato.
                        </p>
                    </div>
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex items-center justify-between flex-wrap gap-2">
                {/* Mode switcher */}
                <div className="flex border border-gray-200 rounded-lg overflow-hidden">
                    <button
                        type="button"
                        onClick={() => setEditorMode('visual')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors ${editorMode === 'visual'
                            ? 'bg-teal-50 text-teal-700'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <PenTool className="w-4 h-4" />
                        Visuale
                    </button>
                    <button
                        type="button"
                        onClick={() => setEditorMode('html')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors ${editorMode === 'html'
                            ? 'bg-teal-50 text-teal-700'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <Code className="w-4 h-4" />
                        HTML
                    </button>
                    <button
                        type="button"
                        onClick={() => setEditorMode('preview')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors ${editorMode === 'preview'
                            ? 'bg-teal-50 text-teal-700'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <Eye className="w-4 h-4" />
                        Anteprima
                    </button>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setShowLibrary(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors"
                    >
                        <Library className="w-4 h-4" />
                        Importa template
                    </button>

                    {!contenutoHtml ? (
                        <button
                            type="button"
                            onClick={loadDefaultTemplate}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-teal-50 text-teal-700 rounded-lg hover:bg-teal-100 transition-colors"
                        >
                            <Wand2 className="w-4 h-4" />
                            Template predefinito
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={loadDefaultTemplate}
                            className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <Wand2 className="w-3.5 h-3.5" />
                            Resetta
                        </button>
                    )}
                </div>
            </div>

            {/* Content area */}
            {editorMode === 'visual' && (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                    {/* Placeholder sidebar */}
                    <div className="lg:col-span-1 order-2 lg:order-1">
                        <PlaceholderPanel onInsert={insertPlaceholder} />
                    </div>

                    {/* TipTap Editor */}
                    <div className="lg:col-span-3 order-1 lg:order-2">
                        <TipTapEditor
                            content={contenutoHtml}
                            onChange={onChange}
                            placeholder="Componi il template del documento..."
                            editorRef={editorRef}
                            minHeight="400px"
                        />
                        <div className="flex justify-between mt-1">
                            <p className="text-xs text-gray-400">
                                Editor visuale — i placeholder verranno visualizzati come testo
                            </p>
                            <p className="text-xs text-gray-400">
                                {(contenutoHtml.match(/\{\{[^}]+\}\}/g) || []).length} placeholder
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {editorMode === 'html' && (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                    {/* Placeholder sidebar */}
                    <div className="lg:col-span-1 order-2 lg:order-1">
                        <PlaceholderPanel onInsert={insertPlaceholder} />
                    </div>

                    {/* Raw HTML textarea */}
                    <div className="lg:col-span-3 order-1 lg:order-2">
                        <textarea
                            ref={textareaRef}
                            value={contenutoHtml}
                            onChange={(e) => onChange(e.target.value)}
                            rows={20}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 font-mono text-sm leading-relaxed resize-y"
                            placeholder={'Inserisci il template HTML del documento...\n\nUsa {{campiQuestionario}} per inserire automaticamente tutte le domande e risposte.'}
                        />
                        <div className="flex justify-between mt-1">
                            <p className="text-xs text-gray-400">
                                {contenutoHtml.length} caratteri
                            </p>
                            <p className="text-xs text-gray-400">
                                {(contenutoHtml.match(/\{\{[^}]+\}\}/g) || []).length} placeholder utilizzati
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {editorMode === 'preview' && (
                <TemplatePreview html={contenutoHtml} formData={formData} />
            )}

            {/* Library modal */}
            <TemplateLibraryModal
                isOpen={showLibrary}
                onClose={() => setShowLibrary(false)}
                onSelect={handleImportTemplate}
                currentTemplateId={currentTemplateId}
            />
        </div>
    );
};

export default TabTemplate;
