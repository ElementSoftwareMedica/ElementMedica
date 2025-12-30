/**
 * VersionHistoryDialog Component
 * 
 * Displays template version history with compare and rollback functionality.
 * Shows list of versions with metadata and allows rollback to previous versions.
 */

import React, { useState, useEffect } from 'react';
import { X, History, RotateCcw, AlertTriangle, CheckCircle, Clock, User, FileText, ChevronDown, ChevronRight } from 'lucide-react';
import { templateService } from '../../services/templateService';
import type { TemplateVersion, RollbackVersionResponse } from '../../types/templates';
import { useToast } from '../../hooks/useToast';

interface VersionHistoryDialogProps {
  templateId: string;
  currentVersion: number;
  onClose: () => void;
  onRollbackSuccess?: () => void;
}

const VersionHistoryDialog: React.FC<VersionHistoryDialogProps> = ({
  templateId,
  currentVersion,
  onClose,
  onRollbackSuccess
}) => {
  const { showToast } = useToast();
  const [versions, setVersions] = useState<TemplateVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<TemplateVersion | null>(null);
  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(new Set());
  const [rollbackingTo, setRollbackingTo] = useState<number | null>(null);
  const [confirmRollback, setConfirmRollback] = useState<number | null>(null);

  /**
   * Load version history
   */
  useEffect(() => {
    loadVersions();
  }, [templateId]);

  const loadVersions = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await templateService.getVersions(templateId);
      setVersions(data);
    } catch (err: any) {
      setError(err.message || 'Errore nel caricamento della cronologia');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Toggle version details expansion
   */
  const toggleVersionExpansion = (versionId: string) => {
    const newExpanded = new Set(expandedVersions);
    if (newExpanded.has(versionId)) {
      newExpanded.delete(versionId);
    } else {
      newExpanded.add(versionId);
    }
    setExpandedVersions(newExpanded);
  };

  /**
   * Handle rollback to version
   */
  const handleRollback = async (version: number) => {
    setRollbackingTo(version);
    setError(null);

    try {
      const result: RollbackVersionResponse = await templateService.rollbackToVersion(templateId, version);
      
      // Success
      setConfirmRollback(null);
      
      // Notify parent
      if (onRollbackSuccess) {
        onRollbackSuccess();
      }
      
      // Reload versions
      await loadVersions();
      
      // Show success message
      showToast({ message: `Rollback completato! Ripristinata versione ${result.rolledBackTo}. Nuova versione: ${result.newVersion}`, type: 'success' });
      
    } catch (err: any) {
      setError(err.message || 'Errore durante il rollback');
    } finally {
      setRollbackingTo(null);
    }
  };

  /**
   * Format date
   */
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('it-IT', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  /**
   * Get version badge color
   */
  const getVersionBadgeColor = (version: number) => {
    if (version === currentVersion) {
      return 'bg-green-100 text-green-800 border-green-300';
    }
    return 'bg-gray-100 text-gray-800 border-gray-300';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <History className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">Cronologia Versioni</h2>
              <p className="text-sm text-gray-500">Versione corrente: {currentVersion}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Chiudi"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-red-800">{error}</p>
              <button
                onClick={loadVersions}
                className="mt-2 text-sm text-red-600 underline hover:no-underline"
              >
                Riprova
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-gray-600">Caricamento versioni...</p>
              </div>
            </div>
          ) : versions.length === 0 ? (
            <div className="text-center py-12">
              <History className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Nessuna versione disponibile</p>
            </div>
          ) : (
            <div className="space-y-3">
              {versions.map((version, index) => {
                const isExpanded = expandedVersions.has(version.id);
                const isCurrent = version.version === currentVersion;
                const isRollbacking = rollbackingTo === version.version;

                return (
                  <div
                    key={version.id}
                    className={`border rounded-lg transition-all ${
                      isCurrent
                        ? 'border-green-300 bg-green-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    {/* Version Header */}
                    <div className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            {/* Version Badge */}
                            <span
                              className={`px-3 py-1 rounded-full text-sm font-semibold border ${getVersionBadgeColor(
                                version.version
                              )}`}
                            >
                              v{version.version}
                              {isCurrent && ' (Corrente)'}
                            </span>

                            {/* Expand/Collapse Button */}
                            <button
                              onClick={() => toggleVersionExpansion(version.id)}
                              className="p-1 hover:bg-gray-100 rounded transition-colors"
                              aria-label={isExpanded ? 'Nascondi dettagli' : 'Mostra dettagli'}
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-gray-600" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-gray-600" />
                              )}
                            </button>
                          </div>

                          {/* Metadata */}
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Clock className="w-4 h-4" />
                              <span>{formatDate(version.createdAt)}</span>
                            </div>
                            {version.creator && (
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <User className="w-4 h-4" />
                                <span>
                                  {version.creator.firstName} {version.creator.lastName}
                                </span>
                              </div>
                            )}
                            {version.changesSummary && (
                              <div className="flex items-start gap-2 text-sm text-gray-700 mt-2">
                                <FileText className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                <span>{version.changesSummary}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        {!isCurrent && (
                          <div className="ml-4">
                            {confirmRollback === version.version ? (
                              <div className="flex flex-col gap-2">
                                <p className="text-sm text-gray-700 mb-2">Confermare il rollback?</p>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleRollback(version.version)}
                                    disabled={isRollbacking}
                                    className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-50 flex items-center gap-1"
                                  >
                                    {isRollbacking ? (
                                      <>
                                        <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-b-2 border-white"></div>
                                        Rollback...
                                      </>
                                    ) : (
                                      <>
                                        <CheckCircle className="w-4 h-4" />
                                        Conferma
                                      </>
                                    )}
                                  </button>
                                  <button
                                    onClick={() => setConfirmRollback(null)}
                                    disabled={isRollbacking}
                                    className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300 disabled:opacity-50"
                                  >
                                    Annulla
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmRollback(version.version)}
                                disabled={isRollbacking}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
                              >
                                <RotateCcw className="w-4 h-4" />
                                Ripristina
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t space-y-3">
                          {/* Change Details */}
                          {version.changeDetails && (
                            <div className="bg-gray-50 rounded p-3">
                              <p className="text-xs font-semibold text-gray-700 mb-2">
                                Dettagli modifiche:
                              </p>
                              <pre className="text-xs text-gray-600 whitespace-pre-wrap overflow-x-auto">
                                {JSON.stringify(version.changeDetails, null, 2)}
                              </pre>
                            </div>
                          )}

                          {/* Content Preview */}
                          <div className="space-y-2">
                            {version.header && (
                              <div>
                                <p className="text-xs font-semibold text-gray-700 mb-1">Header:</p>
                                <div className="bg-gray-50 rounded p-2 max-h-32 overflow-y-auto">
                                  <code className="text-xs text-gray-600 font-mono">
                                    {version.header.substring(0, 300)}
                                    {version.header.length > 300 && '...'}
                                  </code>
                                </div>
                              </div>
                            )}
                            <div>
                              <p className="text-xs font-semibold text-gray-700 mb-1">Content:</p>
                              <div className="bg-gray-50 rounded p-2 max-h-32 overflow-y-auto">
                                <code className="text-xs text-gray-600 font-mono">
                                  {version.content.substring(0, 300)}
                                  {version.content.length > 300 && '...'}
                                </code>
                              </div>
                            </div>
                            {version.footer && (
                              <div>
                                <p className="text-xs font-semibold text-gray-700 mb-1">Footer:</p>
                                <div className="bg-gray-50 rounded p-2 max-h-32 overflow-y-auto">
                                  <code className="text-xs text-gray-600 font-mono">
                                    {version.footer.substring(0, 300)}
                                    {version.footer.length > 300 && '...'}
                                  </code>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <AlertTriangle className="w-4 h-4" />
            <span>
              Il rollback crea una nuova versione con il contenuto della versione selezionata
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};

export default VersionHistoryDialog;
