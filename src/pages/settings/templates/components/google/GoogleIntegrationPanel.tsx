/**
 * Google Integration Panel Example
 * Shows how to integrate Google connection and import into template editor
 */

import React, { useState } from 'react';
import { useGoogleIntegration } from '../../hooks/useGoogleIntegration';
import { GoogleConnectionButton } from './GoogleConnectionButton';
import { GoogleImportDialog } from './GoogleImportDialog';
import { AlertCircle, Download } from 'lucide-react';
import { useConfirmDialog } from '../../../../../contexts/ConfirmDialogContext';

interface GoogleIntegrationPanelProps {
  onTemplateImported?: (templateData: any) => void;
}

export const GoogleIntegrationPanel: React.FC<GoogleIntegrationPanelProps> = ({
  onTemplateImported
}) => {
  const {
    connectionStatus,
    isLoading,
    error,
    connectGoogle,
    disconnectGoogle,
    importGoogleDocs,
    importGoogleSlides,
    clearError
  } = useGoogleIntegration();

  const [showImportDialog, setShowImportDialog] = useState(false);
  const { confirm } = useConfirmDialog();

  const handleConnect = async () => {
    clearError();
    await connectGoogle();
  };

  const handleDisconnect = async () => {
    const shouldDisconnect = await confirm({
      title: 'Disconnetti Account Google',
      message: 'Sei sicuro di voler disconnettere il tuo account Google?',
      confirmLabel: 'Disconnetti',
      variant: 'warning'
    });
    if (shouldDisconnect) {
      clearError();
      await disconnectGoogle();
    }
  };

  const handleImportClick = () => {
    if (!connectionStatus.connected) {
      alert('Connetti prima il tuo account Google');
      return;
    }
    setShowImportDialog(true);
  };

  const handleImport = (result: any) => {
    console.log('Template imported:', result);

    // Notify parent component
    if (onTemplateImported) {
      onTemplateImported(result);
    }

    // Show success message
    alert(`Template "${result.name}" importato con successo!`);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h3 className="text-lg font-medium text-gray-900">
          Integrazione Google Workspace
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          Connetti il tuo account Google per importare documenti e presentazioni
        </p>
      </div>

      {/* Connection Status */}
      <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <div>
          <p className="text-sm font-medium text-gray-900">
            Stato connessione
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {connectionStatus.connected
              ? `Connesso • Scopi: ${connectionStatus.scopes.length}`
              : 'Non connesso'}
          </p>
        </div>
        <GoogleConnectionButton
          connected={connectionStatus.connected}
          isLoading={isLoading}
          onConnect={handleConnect}
          onDisconnect={handleDisconnect}
          expiresAt={connectionStatus.expiresAt}
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-start p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-900">Errore</p>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Import Button */}
      {connectionStatus.connected && (
        <div className="pt-4">
          <button
            onClick={handleImportClick}
            className="inline-flex items-center px-6 py-2 border border-transparent rounded-full shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            Importa da Google
          </button>
        </div>
      )}

      {/* Import Dialog */}
      <GoogleImportDialog
        isOpen={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        onImport={handleImport}
        onImportDocs={importGoogleDocs}
        onImportSlides={importGoogleSlides}
        isLoading={isLoading}
        error={error}
      />

      {/* Info Box */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Come funziona:</strong>
        </p>
        <ol className="text-sm text-blue-700 mt-2 space-y-1 list-decimal list-inside">
          <li>Connetti il tuo account Google</li>
          <li>Clicca su "Importa da Google"</li>
          <li>Incolla l'URL del documento o presentazione</li>
          <li>Il contenuto verrà convertito automaticamente in HTML</li>
          <li>Modifica il template nell'editor</li>
        </ol>
        <p className="text-xs text-blue-600 mt-3">
          Nota: Sono supportati Google Docs e Google Slides. I documenti devono essere accessibili con l'account connesso.
        </p>
      </div>
    </div>
  );
};

export default GoogleIntegrationPanel;
