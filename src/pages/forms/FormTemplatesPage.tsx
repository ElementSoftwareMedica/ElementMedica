import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AlertCircle,
  Copy,
  Edit,
  Eye,
  Globe,
  Lock,
  Plus,
  Trash2
} from 'lucide-react';
import { Button } from '../../design-system/atoms/Button';
import { Card } from '../../design-system/molecules/Card';
import { Badge } from '../../design-system/atoms/Badge';
import { Modal } from '../../design-system/molecules/Modal';
import { Input } from '../../design-system/atoms/Input';
import { cn } from '../../design-system/utils';
import { formTemplatesService, FormTemplate } from '../../services/formTemplates';
import { useAuth } from '../../context/AuthContext';

export default function FormTemplatesPage() {
  const navigate = useNavigate();
  const [formTemplates, setFormTemplates] = useState<FormTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(null);
  const [duplicateName, setDuplicateName] = useState('');
  
  const { hasPermission, isLoading: authLoading } = useAuth();
  const canView = hasPermission('form_templates', 'read');
  const canEdit = hasPermission('form_templates', 'update');
  const canDeleteTemplates = hasPermission('form_templates', 'delete');
  const canCreateTemplates = hasPermission('form_templates', 'create');

  useEffect(() => {
    loadFormTemplates();
  }, []);

  const loadFormTemplates = async () => {
    try {
      setLoading(true);
      const templates = await formTemplatesService.getFormTemplates();
      setFormTemplates(templates);
    } catch (err) {
      setError('Errore nel caricamento dei form templates');
      console.error('Error loading form templates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedTemplate) return;
    
    try {
      await formTemplatesService.deleteFormTemplate(selectedTemplate.id);
      setFormTemplates(prev => prev.filter(t => t.id !== selectedTemplate.id));
      setDeleteDialogOpen(false);
      setSelectedTemplate(null);
    } catch (err) {
      setError('Errore nell\'eliminazione del form template');
      console.error('Error deleting form template:', err);
    }
  };

  const handleDuplicate = async () => {
    if (!selectedTemplate || !duplicateName.trim()) return;
    
    try {
      const newTemplate = await formTemplatesService.duplicateFormTemplate(
        selectedTemplate.id, 
        duplicateName.trim()
      );
      setFormTemplates(prev => [...prev, newTemplate]);
      setDuplicateDialogOpen(false);
      setSelectedTemplate(null);
      setDuplicateName('');
    } catch (err) {
      setError('Errore nella duplicazione del form template');
      console.error('Error duplicating form template:', err);
    }
  };

  const openDeleteDialog = (template: FormTemplate) => {
    setSelectedTemplate(template);
    setDeleteDialogOpen(true);
  };

  const openDuplicateDialog = (template: FormTemplate) => {
    setSelectedTemplate(template);
    setDuplicateName(`${template.name} - Copia`);
    setDuplicateDialogOpen(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Mostra loading se l'AuthContext sta ancora caricando
  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <p className="text-gray-600">Caricamento permessi...</p>
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2 text-red-700">
          <AlertCircle className="h-5 w-5" />
          <span>Non hai i permessi per visualizzare questa pagina.</span>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <p className="text-gray-600">Caricamento...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with action button */}
      <div className="flex justify-end items-center">
        {canCreateTemplates && (
          <Button
            variant="primary"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => navigate('/forms/templates/create')}
          >
            Nuovo Form Template
          </Button>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2 text-red-700">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
          <button 
            onClick={() => setError(null)}
            className="ml-auto text-red-500 hover:text-red-700"
          >
            ×
          </button>
        </div>
      )}

      {/* Main Content */}
       <Card variant="default" size="lg">
         <div className="overflow-x-auto">
           <table className="w-full">
             <thead className="bg-gray-50 border-b border-gray-200">
               <tr>
                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descrizione</th>
                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stato</th>
                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Campi</th>
                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Creato</th>
                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aggiornato</th>
                 <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Azioni</th>
               </tr>
             </thead>
             <tbody className="bg-white divide-y divide-gray-200">
               {formTemplates.map((template) => (
                 <tr key={template.id} className="hover:bg-gray-50">
                   <td className="px-6 py-4 whitespace-nowrap">
                     <div className="flex items-center gap-2">
                       <span className="text-sm font-medium text-gray-900">
                         {template.name}
                       </span>
                       {template.isPublic ? (
                         <div className="group relative">
                           <Globe className="h-4 w-4 text-blue-500" />
                           <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                             Form pubblico
                           </div>
                         </div>
                       ) : (
                         <div className="group relative">
                           <Lock className="h-4 w-4 text-gray-400" />
                           <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                             Form privato
                           </div>
                         </div>
                       )}
                     </div>
                   </td>
                   <td className="px-6 py-4 whitespace-nowrap">
                     <span className="text-sm text-gray-600">
                       {template.description || '-'}
                     </span>
                   </td>
                   <td className="px-6 py-4 whitespace-nowrap">
                     <Badge 
                       variant={template.isPublic ? 'default' : 'secondary'}
                       size="sm"
                     >
                       {template.isPublic ? 'Pubblico' : 'Privato'}
                     </Badge>
                   </td>
                   <td className="px-6 py-4 whitespace-nowrap">
                     <Badge 
                       variant={template.isActive ? 'default' : 'secondary'}
                       size="sm"
                     >
                       {template.isActive ? 'Attivo' : 'Inattivo'}
                     </Badge>
                   </td>
                   <td className="px-6 py-4 whitespace-nowrap">
                     <span className="text-sm text-gray-900">
                       {template.fields.length} campi
                     </span>
                   </td>
                   <td className="px-6 py-4 whitespace-nowrap">
                     <span className="text-sm text-gray-600">
                       {formatDate(template.createdAt)}
                     </span>
                   </td>
                   <td className="px-6 py-4 whitespace-nowrap">
                     <span className="text-sm text-gray-600">
                       {formatDate(template.updatedAt)}
                     </span>
                   </td>
                   <td className="px-6 py-4 whitespace-nowrap text-center">
                     <div className="flex justify-center gap-1">
                       <button 
                         className="p-1 text-gray-400 hover:text-blue-600 transition-colors group relative"
                         onClick={() => navigate(`/forms/templates/${template.id}`)}
                       >
                         <Eye className="h-4 w-4" />
                         <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                           Visualizza
                         </div>
                       </button>
                       {canEdit && (
                         <button 
                           className="p-1 text-gray-400 hover:text-blue-600 transition-colors group relative"
                           onClick={() => navigate(`/forms/templates/${template.id}/edit`)}
                         >
                           <Edit className="h-4 w-4" />
                           <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                             Modifica
                           </div>
                         </button>
                       )}
                       <button 
                         className="p-1 text-gray-400 hover:text-blue-600 transition-colors group relative"
                         onClick={() => openDuplicateDialog(template)}
                       >
                         <Copy className="h-4 w-4" />
                         <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                           Duplica
                         </div>
                       </button>
                       {canDeleteTemplates && (
                         <button 
                           className="p-1 text-gray-400 hover:text-red-600 transition-colors group relative"
                           onClick={() => openDeleteDialog(template)}
                         >
                           <Trash2 className="h-4 w-4" />
                           <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                             Elimina
                           </div>
                         </button>
                       )}
                     </div>
                   </td>
                 </tr>
               ))}
               {formTemplates.length === 0 && (
                 <tr>
                   <td colSpan={8} className="px-6 py-8 text-center">
                     <span className="text-sm text-gray-500">
                       Nessun form template trovato
                     </span>
                   </td>
                 </tr>
               )}
             </tbody>
           </table>
         </div>
       </Card>

      {/* Delete Modal */}
       <Modal
         isOpen={deleteDialogOpen}
         onClose={() => setDeleteDialogOpen(false)}
         title="Conferma eliminazione"
       >
         <div className="space-y-4">
           <p className="text-gray-700">
             Sei sicuro di voler eliminare il form template "{selectedTemplate?.name}"?
             Questa azione non può essere annullata.
           </p>
           <div className="flex justify-end gap-3">
             <Button 
               variant="outline" 
               onClick={() => setDeleteDialogOpen(false)}
             >
               Annulla
             </Button>
             <Button 
               variant="destructive" 
               onClick={handleDelete}
             >
               Elimina
             </Button>
           </div>
         </div>
       </Modal>

       {/* Duplicate Modal */}
       <Modal
         isOpen={duplicateDialogOpen}
         onClose={() => setDuplicateDialogOpen(false)}
         title="Duplica Form Template"
       >
         <div className="space-y-4">
           <div>
             <label className="block text-sm font-medium text-gray-700 mb-2">
               Nome del nuovo form template
             </label>
             <Input
               value={duplicateName}
               onChange={(e) => setDuplicateName(e.target.value)}
               placeholder="Inserisci il nome del nuovo template"
               className="w-full"
             />
           </div>
           <div className="flex justify-end gap-3">
             <Button 
               variant="outline" 
               onClick={() => setDuplicateDialogOpen(false)}
             >
               Annulla
             </Button>
             <Button 
               variant="primary" 
               onClick={handleDuplicate}
               disabled={!duplicateName.trim()}
             >
               Duplica
             </Button>
           </div>
         </div>
       </Modal>
     </div>
   );
 }