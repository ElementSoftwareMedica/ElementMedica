/**
 * CMSFormSubmissions - Pagina CMS per gestire le risposte ai form pubblici
 *
 * Mostra tutti i form template pubblici (isPublic=true) con il relativo
 * conteggio di risposte per status. Permette di navigare alle risposte
 * di ogni singolo template.
 *
 * Rispetta:
 * - Multi-tenancy: tenantId da AuthContext
 * - GDPR: solo visualizzazione, nessuna modifica dati sensibili
 * - Permissions: form_submissions:read
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Eye,
    FileText,
    AlertCircle,
    Loader2,
    RefreshCw,
    MessageSquare,
    Clock,
    CheckCircle,
    Globe
} from 'lucide-react';
import { Card } from '../../design-system/molecules/Card';
import { Badge } from '../../design-system/atoms/Badge';
import { Button } from '../../design-system/atoms/Button';
import { useAuth } from '../../context/AuthContext';
import { formTemplatesService, FormTemplate } from '../../services/formTemplates';
import { getContactSubmissions } from '../../services/contactSubmissionsManagement';

interface TemplateWithCounts {
    id: string;
    name: string;
    description: string;
    isActive: boolean;
    isPublic: boolean;
    totalSubmissions: number;
    newSubmissions: number;
    lastSubmissionAt?: string;
}

const STATUS_COLORS = {
    new: 'bg-red-100 text-red-700 border-red-200',
    ok: 'bg-green-100 text-green-700 border-green-200',
    empty: 'bg-gray-100 text-gray-500 border-gray-200'
} as const;

const CMSFormSubmissions: React.FC = () => {
    const navigate = useNavigate();
    const { hasPermission, isLoading: authLoading } = useAuth();
    const canView = hasPermission('form_submissions', 'read');

    const [templates, setTemplates] = useState<TemplateWithCounts[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadPublicTemplatesWithCounts = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            // Carica tutti i template e filtra per isPublic=true
            const allTemplates = await formTemplatesService.getFormTemplates();
            const publicTemplates = allTemplates.filter(
                (t) => (t as FormTemplate & { isPublic?: boolean }).isPublic === true
            );

            if (publicTemplates.length === 0) {
                setTemplates([]);
                return;
            }

            // Per ogni template pubblico, carica le statistiche di submission
            const templatesWithCounts = await Promise.all(
                publicTemplates.map(async (template) => {
                    try {
                        const [allSubs, newSubs] = await Promise.all([
                            getContactSubmissions({ templateName: template.name, page: 1, limit: 1 }),
                            getContactSubmissions({ templateName: template.name, status: 'NEW', page: 1, limit: 1 })
                        ]);

                        return {
                            id: template.id,
                            name: template.name,
                            description: template.description || '',
                            isActive: template.isActive,
                            isPublic: true,
                            totalSubmissions: allSubs.pagination?.total ?? 0,
                            newSubmissions: newSubs.pagination?.total ?? 0,
                            lastSubmissionAt: allSubs.submissions?.[0]?.createdAt
                        } satisfies TemplateWithCounts;
                    } catch {
                        return {
                            id: template.id,
                            name: template.name,
                            description: template.description || '',
                            isActive: template.isActive,
                            isPublic: true,
                            totalSubmissions: 0,
                            newSubmissions: 0
                        } satisfies TemplateWithCounts;
                    }
                })
            );

            // Sort: first by newSubmissions desc, then by total desc
            templatesWithCounts.sort(
                (a, b) => b.newSubmissions - a.newSubmissions || b.totalSubmissions - a.totalSubmissions
            );

            setTemplates(templatesWithCounts);
        } catch (err) {
            setError('Errore nel caricamento');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!authLoading) {
            loadPublicTemplatesWithCounts();
        }
    }, [authLoading, loadPublicTemplatesWithCounts]);

    const formatDate = (dateString?: string) => {
        if (!dateString) return '—';
        return new Date(dateString).toLocaleDateString('it-IT', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center min-h-[300px]">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (!canView) {
        return (
            <div className="flex items-center justify-center min-h-[300px]">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2 text-red-700">
                    <AlertCircle className="h-5 w-5 flex-shrink-0" />
                    <span>Non hai i permessi per visualizzare le risposte ai form.</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3 text-red-700">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <span>{error}</span>
                <Button variant="outline" size="sm" onClick={loadPublicTemplatesWithCounts}>
                    Riprova
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Globe className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-medium text-gray-700">
                        {templates.length} form pubblici
                    </span>
                    {templates.some(t => t.newSubmissions > 0) && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
                            {templates.reduce((sum, t) => sum + t.newSubmissions, 0)} nuove
                        </span>
                    )}
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<RefreshCw className="w-4 h-4" />}
                    onClick={loadPublicTemplatesWithCounts}
                >
                    Aggiorna
                </Button>
            </div>

            {templates.length === 0 ? (
                <Card>
                    <div className="p-12 flex flex-col items-center text-center gap-3">
                        <FileText className="w-12 h-12 text-gray-300" />
                        <p className="text-gray-600 font-medium">Nessun form pubblico trovato</p>
                        <p className="text-sm text-gray-400">
                            I form pubblici configurati nel CMS appariranno qui insieme alle loro risposte.
                        </p>
                    </div>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {templates.map((template) => (
                        <Card
                            key={template.id}
                            className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer group"
                            onClick={() =>
                                navigate(`/management/cms/forms/templates/${template.id}/submissions`)
                            }
                        >
                            <div className="p-5">
                                {/* Header */}
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-gray-900 truncate group-hover:text-blue-700 transition-colors">
                                            {template.name}
                                        </h3>
                                        {template.description && (
                                            <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">
                                                {template.description}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                                        <Globe className="w-4 h-4 text-blue-500" />
                                        {!template.isActive && (
                                            <Badge variant="secondary" size="sm">Inattivo</Badge>
                                        )}
                                    </div>
                                </div>

                                {/* Stats */}
                                <div className="flex items-center gap-3 mb-4">
                                    {/* New badge */}
                                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-sm font-medium ${template.newSubmissions > 0 ? STATUS_COLORS.new : STATUS_COLORS.empty}`}>
                                        <MessageSquare className="w-3.5 h-3.5" />
                                        <span>{template.newSubmissions} nuove</span>
                                    </div>

                                    {/* Total */}
                                    <div className="flex items-center gap-1.5 text-sm text-gray-500">
                                        <CheckCircle className="w-3.5 h-3.5" />
                                        <span>{template.totalSubmissions} totali</span>
                                    </div>
                                </div>

                                {/* Last submission */}
                                <div className="flex items-center justify-between border-t pt-3">
                                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                        <Clock className="w-3.5 h-3.5" />
                                        Ultima: {formatDate(template.lastSubmissionAt)}
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        leftIcon={<Eye className="w-3.5 h-3.5" />}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigate(`/management/cms/forms/templates/${template.id}/submissions`);
                                        }}
                                        className="text-xs py-1 px-2.5"
                                    >
                                        Vedi
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CMSFormSubmissions;
