import React from 'react';
import { Modal } from '@/design-system/molecules/Modal';
import { Button } from '@/design-system/atoms/Button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle, Users, Shield } from 'lucide-react';

interface DeleteRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  role: any;
  loading?: boolean;
}

const DeleteRoleModal: React.FC<DeleteRoleModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  role,
  loading = false
}) => {
  if (!role) return null;

  const hasUsers = role.userCount > 0;
  const isSystemRole = role.isSystemRole;

  const handleConfirm = async () => {
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      // L'errore viene gestito dal componente padre
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Elimina Ruolo"
      size="medium"
    >
      <div className="space-y-4">
        <div className="flex items-center space-x-3 p-4 bg-red-50 rounded-lg">
          <AlertTriangle className="h-6 w-6 text-red-600 flex-shrink-0" />
          <div>
            <h3 className="font-medium text-red-900">Attenzione: Azione irreversibile</h3>
            <p className="text-sm text-red-700 mt-1">
              Questa azione eliminerà permanentemente il ruolo e non può essere annullata.
            </p>
          </div>
        </div>

        {role && (
          <div className="space-y-3">
            <div>
              <span className="text-sm font-medium text-gray-700">Ruolo da eliminare:</span>
              <div className="mt-1 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{role.name}</span>
                  <span className="text-xs bg-gray-200 px-2 py-1 rounded">
                    Livello {role.level}
                  </span>
                </div>
                {role.description && (
                  <p className="text-sm text-gray-600 mt-1">{role.description}</p>
                )}
              </div>
            </div>

            {role.userCount && role.userCount > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Attenzione:</strong> Questo ruolo è attualmente assegnato a {role.userCount} utente{role.userCount > 1 ? 'i' : ''}. 
                  L'eliminazione rimuoverà il ruolo da tutti gli utenti associati.
                </AlertDescription>
              </Alert>
            )}

            <div className="text-sm text-gray-600">
              <p>Conseguenze dell'eliminazione:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Il ruolo verrà rimosso da tutti gli utenti</li>
                <li>I permessi associati verranno revocati</li>
                <li>Le configurazioni di gerarchia verranno aggiornate</li>
                <li>L'azione non può essere annullata</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
        <Button
          variant="outline"
          onClick={onClose}
          disabled={loading}
        >
          Annulla
        </Button>
        <Button
          variant="destructive"
          onClick={handleConfirm}
          disabled={loading}
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Elimina Ruolo
        </Button>
      </div>
    </Modal>
  );
};

export default DeleteRoleModal;