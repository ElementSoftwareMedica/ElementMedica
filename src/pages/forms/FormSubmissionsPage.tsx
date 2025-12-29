import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Eye,
  FileText,
  AlertCircle,
  Loader2,
  Calendar
} from 'lucide-react';
import { Button } from '../../design-system/atoms/Button';
import { Card } from '../../design-system/molecules/Card';
import { Badge } from '../../design-system/atoms/Badge';
import { useAuth } from '../../context/AuthContext';
import { formTemplatesService } from '../../services/formTemplates';
import { getContactSubmissions } from '../../services/contactSubmissionsManagement';

interface FormSubmissionsPageProps {
  hideHeader?: boolean;
}

interface TemplateWithSubmissionCount {
  id: string;
  name: string;
  description: string;
  type: string;
  isActive: boolean;
  submissionCount: number;
  lastSubmissionAt?: string;
}

const FormSubmissionsPage: React.FC<FormSubmissionsPageProps> = ({ hideHeader = false }) => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<TemplateWithSubmissionCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { hasPermission, loading: authLoading } = useAuth();
  const canView = hasPermission('form_submissions', 'read');

  useEffect(() => {
    loadTemplatesWithCounts();
  }, []);

  const loadTemplatesWithCounts = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('📊 Loading templates with submission counts...');

      // Carica tutti i template
      const allTemplates = await formTemplatesService.getFormTemplates();
      console.log(`📋 Found ${allTemplates.length} templates`);

      // Per ogni template, conta le submissions
      const templatesWithCounts = await Promise.all(
        allTemplates.map(async (template) => {
          try {
            console.log(`🔍 Checking submissions for template: ${template.name} (${template.id})`);
            // CRITICAL: Use templateName instead of templateId - backend stores templateName not templateId
            const submissions = await getContactSubmissions({
              templateName: template.name,
              page: 1,
              limit: 1
            });

            console.log(`✅ Template ${template.name}: ${submissions.pagination?.total || 0} submissions`);

            return {
              id: template.id,
              name: template.name,
              description: template.description || '',
              type: template.type,
              isActive: template.isActive,
              submissionCount: submissions.pagination?.total || 0,
              lastSubmissionAt: submissions.submissions?.[0]?.createdAt
            };
          } catch (err) {
            console.error(`❌ Error counting submissions for template ${template.id}:`, err);
            return {
              id: template.id,
              name: template.name,
              description: template.description || '',
              type: template.type,
              isActive: template.isActive,
              submissionCount: 0
            };
          }
        })
      );

      // Ordina per numero di submissions (decrescente)
      templatesWithCounts.sort((a, b) => b.submissionCount - a.submissionCount);

      // Filtra solo template con submissions > 0
      const templatesWithSubmissions = templatesWithCounts.filter(t => t.submissionCount > 0);
      console.log(`📊 Templates with submissions: ${templatesWithSubmissions.length}`);

      setTemplates(templatesWithSubmissions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nel caricamento dei form');
      console.error('❌ Error loading templates:', err);
    } finally {
      setLoading(false);
    }
  };



  // Mostra loading se l'AuthContext sta ancora caricando
  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Caricamento permessi...</span>
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
          <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
          <span className="text-red-700">Non hai i permessi per visualizzare questa pagina.</span>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      {!hideHeader && (
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Form Submissions</h2>
            <p className="mt-1 text-sm text-gray-600">
              Visualizza tutte le risposte ricevute dai form
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 flex items-center justify-between">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <span className="text-red-700">{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-red-500 hover:text-red-700"
          >
            ×
          </button>
        </div>
      )}

      {/* Empty State */}
      {templates.length === 0 && (
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="rounded-full bg-gray-100 p-4">
              <FileText className="h-12 w-12 text-gray-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Nessun form trovato
              </h3>
              <p className="text-sm text-gray-600">
                Non ci sono ancora form con submissions ricevute.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Grid dei Form Templates */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <Card
            key={template.id}
            className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => navigate(`/forms/templates/${template.id}/submissions`)}
          >
            <div className="p-6">
              {/* Header del Template */}
              <div className="mb-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                    {template.name}
                  </h3>
                  <FileText className="h-5 w-5 text-gray-400 flex-shrink-0 ml-2" />
                </div>
                {template.description && (
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {template.description}
                  </p>
                )}
              </div>

              {/* Stats Badge */}
              <div className="flex items-center gap-2 mb-4">
                <Badge variant="outline" className="text-sm">
                  <Eye className="h-3 w-3 mr-1" />
                  {template.submissionCount} {template.submissionCount === 1 ? 'risposta' : 'risposte'}
                </Badge>
              </div>

              {/* Ultima Submission */}
              {template.lastSubmissionAt && (
                <div className="text-xs text-gray-500 flex items-center gap-1 mb-4">
                  <Calendar className="h-3 w-3" />
                  Ultima risposta: {new Date(template.lastSubmissionAt).toLocaleDateString('it-IT')}
                </div>
              )}

              {/* Footer con Azioni */}
              <div className="border-t pt-4 mt-4">
                <Button
                  variant="outline"
                  className="w-full justify-center"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/forms/templates/${template.id}/submissions`);
                  }}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Visualizza Risposte
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>


    </div>
  );
};

export default FormSubmissionsPage;