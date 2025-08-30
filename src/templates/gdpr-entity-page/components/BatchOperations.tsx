import React, { useState } from 'react';
import { Button } from '../../../design-system/atoms/Button';
import { Dropdown, DropdownAction } from '../../../design-system/molecules/Dropdown';
import { Modal } from '../../../design-system/molecules/Modal';
import { ChevronDown, Trash2, Download, Archive } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { GDPRPermissions } from '../hooks/useGDPRPermissions';
import { apiService } from '../../../services/api';

export interface BatchOperation {
  key: string;
  label: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'danger' | 'secondary' | 'primary';
  requiresConfirmation?: boolean;
  confirmationTitle?: string;
  confirmationDescription?: string;
  permission?: string;
  action: (selectedIds: string[]) => Promise<void>;
}

export interface BatchOperationsProps {
  selectedEntities: Set<string>;
  permissions: GDPRPermissions;
  onClearSelection: () => void;
  entityName: string;
  entityNamePlural: string;
  customOperations?: BatchOperation[];
}

/**
 * Componente per le operazioni batch sulle entità GDPR
 * Fornisce azioni comuni come eliminazione, esportazione, archiviazione
 */
export function BatchOperations({
  selectedEntities,
  permissions,
  onClearSelection,
  entityName,
  entityNamePlural,
  customOperations = []
}: BatchOperationsProps) {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [currentOperation, setCurrentOperation] = useState<BatchOperation | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const selectedCount = selectedEntities.size;
  const selectedIds = Array.from(selectedEntities);

  // Operazioni predefinite
  const defaultOperations: BatchOperation[] = [
    {
      key: 'export',
      label: `Esporta ${selectedCount} ${selectedCount === 1 ? entityName : entityNamePlural}`,
      icon: <Download className="h-4 w-4" />,
      variant: 'secondary',
      permission: 'export',
      action: async (ids: string[]) => {
        try {
          // Usiamo il client axios per gestire il blob mantenendo gli header (X-Tenant-ID, Authorization)
          const response = await apiService.client.post<Blob>(
            '/export/batch',
            { ids, type: entityName },
            { responseType: 'blob' as const }
          );

          const blob = response.data; // già Blob grazie a responseType: 'blob'
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${entityNamePlural}_${new Date().toISOString().split('T')[0]}.csv`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);

          toast.success(`${ids.length} ${ids.length === 1 ? entityName : entityNamePlural} esportati con successo`);
        } catch (error) {
          toast.error('Errore durante l\'esportazione');
          throw error;
        }
      }
    },
    {
      key: 'archive',
      label: `Archivia ${selectedCount} ${selectedCount === 1 ? entityName : entityNamePlural}`,
      icon: <Archive className="h-4 w-4" />,
      variant: 'secondary',
      requiresConfirmation: true,
      confirmationTitle: 'Conferma archiviazione',
      confirmationDescription: `Sei sicuro di voler archiviare ${selectedCount} ${selectedCount === 1 ? entityName : entityNamePlural}? Questa azione può essere annullata.`,
      permission: 'update',
      action: async (ids: string[]) => {
        try {
          await apiService.post('/batch/archive', { ids, type: entityName });
          
          toast.success(`${ids.length} ${ids.length === 1 ? entityName : entityNamePlural} archiviati con successo`);
        } catch (error) {
          toast.error('Errore durante l\'archiviazione');
          throw error;
        }
      }
    },
    {
      key: 'delete',
      label: `Elimina ${selectedCount} ${selectedCount === 1 ? entityName : entityNamePlural}`,
      icon: <Trash2 className="h-4 w-4" />,
      variant: 'danger',
      requiresConfirmation: true,
      confirmationTitle: 'Conferma eliminazione',
      confirmationDescription: `Sei sicuro di voler eliminare definitivamente ${selectedCount} ${selectedCount === 1 ? entityName : entityNamePlural}? Questa azione non può essere annullata.`,
      permission: 'delete',
      action: async (ids: string[]) => {
        try {
          await apiService.deleteWithPayload('/batch/delete', { ids, type: entityName });
          
          toast.success(`${ids.length} ${ids.length === 1 ? entityName : entityNamePlural} eliminati con successo`);
        } catch (error) {
          toast.error('Errore durante l\'eliminazione');
          throw error;
        }
      }
    }
  ];

  // Combina operazioni predefinite e personalizzate
  const allOperations = [...defaultOperations, ...customOperations];

  // Filtra operazioni in base ai permessi
  const availableOperations = allOperations.filter(operation => {
    if (!operation.permission) return true;
    
    switch (operation.permission) {
      case 'export':
        return permissions.canExport;
      case 'delete':
        return permissions.canDelete;
      case 'update':
        return permissions.canUpdate;
      default:
        return permissions.checkPermission(operation.permission);
    }
  });

  // Converte le operazioni in azioni per il dropdown
  const dropdownActions: DropdownAction[] = availableOperations.map(operation => ({
    label: operation.label,
    icon: operation.icon,
    variant: operation.variant,
    onClick: () => handleOperation(operation)
  }));

  // Gestione esecuzione operazione
  const handleOperation = async (operation: BatchOperation) => {
    if (operation.requiresConfirmation) {
      setCurrentOperation(operation);
      setShowConfirmModal(true);
      return;
    }

    await executeOperation(operation);
  };

  // Esecuzione effettiva dell'operazione
  const executeOperation = async (operation: BatchOperation) => {
    setIsProcessing(true);
    
    try {
      await operation.action(selectedIds);
      onClearSelection();
    } catch (error) {
      console.error(`Errore nell'operazione ${operation.key}:`, error);
    } finally {
      setIsProcessing(false);
      setShowConfirmModal(false);
      setCurrentOperation(null);
    }
  };

  // Gestione conferma modal
  const handleConfirm = () => {
    if (currentOperation) {
      executeOperation(currentOperation);
    }
  };

  const handleCancel = () => {
    setShowConfirmModal(false);
    setCurrentOperation(null);
  };

  if (selectedCount === 0) {
    return null;
  }

  return (
    <>
      <div className="flex items-center gap-2 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <span className="text-sm font-medium text-blue-900">
          {selectedCount} {selectedCount === 1 ? entityName : entityNamePlural} selezionati
        </span>
        
        <div className="flex items-center gap-2 ml-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={onClearSelection}
          >
            Deseleziona tutto
          </Button>
          
          {availableOperations.length > 0 && (
            <Dropdown
              label="Azioni batch"
              variant="primary"
              actions={dropdownActions}
              showArrow={true}
              pill={true}
            />
          )}
        </div>
      </div>

      {/* Modal di conferma */}
      <Modal
        isOpen={showConfirmModal}
        onClose={handleCancel}
        title={currentOperation?.confirmationTitle || 'Conferma operazione'}
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isProcessing}
            >
              Annulla
            </Button>
            <Button
               variant="primary"
               onClick={handleConfirm}
               disabled={isProcessing}
            >
              {isProcessing ? 'Elaborazione...' : 'Conferma'}
            </Button>
          </div>
        }
      >
        <div className="space-y-2">
          <p>{currentOperation?.confirmationDescription || 'Questa azione è irreversibile. Confermi?'}</p>
        </div>
      </Modal>
    </>
  );
}