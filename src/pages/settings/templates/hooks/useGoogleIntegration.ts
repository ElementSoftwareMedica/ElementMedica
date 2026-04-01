/**
 * Google Integration Hook
 * Manages Google OAuth2 connection and import functionality
 */

import { useState, useEffect, useCallback } from 'react';
import * as googleService from '../services';

export interface GoogleConnectionStatus {
  connected: boolean;
  expiresAt: Date | null;
  scopes: string[];
}

export interface GoogleImportResult {
  name: string;
  content: string;
  header: string;
  footer: string;
  markers: any[];
  googleDocsId?: string;
  googleSlidesId?: string;
}

export function useGoogleIntegration() {
  const [connectionStatus, setConnectionStatus] = useState<GoogleConnectionStatus>({
    connected: false,
    expiresAt: null,
    scopes: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Check Google connection status
   */
  const checkConnection = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const status = await googleService.getConnectionStatus();
      setConnectionStatus(status);
      return status;
    } catch (err: unknown) {
      setError('Errore durante il controllo della connessione');
      setConnectionStatus({
        connected: false,
        expiresAt: null,
        scopes: []
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Initiate Google OAuth2 flow
   */
  const connectGoogle = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const authUrl = await googleService.getAuthUrl();

      // Open auth URL in popup window
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      const popup = window.open(
        authUrl,
        'Google Authorization',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      // Listen for OAuth callback
      return new Promise<boolean>((resolve) => {
        const checkPopup = setInterval(() => {
          if (!popup || popup.closed) {
            clearInterval(checkPopup);
            // Check connection after popup closes
            checkConnection().then(status => {
              resolve(status?.connected || false);
            });
          }
        }, 1000);
      });
    } catch (err: unknown) {
      setError('Errore durante la connessione a Google');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [checkConnection]);

  /**
   * Disconnect Google account
   */
  const disconnectGoogle = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      await googleService.disconnect();
      setConnectionStatus({
        connected: false,
        expiresAt: null,
        scopes: []
      });
      return true;
    } catch (err: unknown) {
      setError('Errore durante la disconnessione');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Extract document ID from Google Docs URL or return ID as-is
   */
  const extractDocumentId = (urlOrId: string): string => {
    const match = urlOrId.match(/\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : urlOrId;
  };

  /**
   * Import Google Docs document
   */
  const importGoogleDocs = useCallback(async (documentUrlOrId: string, convertToHtml: boolean = true): Promise<GoogleImportResult | null> => {
    try {
      setIsLoading(true);
      setError(null);
      // Extract document ID from URL if full URL is provided
      const documentId = extractDocumentId(documentUrlOrId);
      const result = await googleService.importDocs(documentId, convertToHtml);
      return result;
    } catch (err: unknown) {
      setError('Errore durante l\'importazione del documento');

      // Handle specific errors
      const axiosErr = err as { response?: { data?: { code?: string } } };
      if (axiosErr.response?.data?.code === 'GOOGLE_NOT_CONNECTED') {
        setConnectionStatus(prev => ({ ...prev, connected: false }));
      }

      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Extract presentation ID from Google Slides URL or return ID as-is
   */
  const extractPresentationId = (urlOrId: string): string => {
    const match = urlOrId.match(/\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : urlOrId;
  };

  /**
   * Import Google Slides presentation
   */
  const importGoogleSlides = useCallback(async (presentationUrlOrId: string, convertToHtml: boolean = true): Promise<GoogleImportResult | null> => {
    try {
      setIsLoading(true);
      setError(null);
      // Extract presentation ID from URL if full URL is provided
      const presentationId = extractPresentationId(presentationUrlOrId);
      const result = await googleService.importSlides(presentationId, convertToHtml);
      return result;
    } catch (err: unknown) {
      setError('Errore durante l\'importazione della presentazione');

      // Handle specific errors
      const axiosErr = err as { response?: { data?: { code?: string } } };
      if (axiosErr.response?.data?.code === 'GOOGLE_NOT_CONNECTED') {
        setConnectionStatus(prev => ({ ...prev, connected: false }));
      }

      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Check connection on mount
  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  return {
    connectionStatus,
    isLoading,
    error,
    checkConnection,
    connectGoogle,
    disconnectGoogle,
    importGoogleDocs,
    importGoogleSlides,
    clearError
  };
}
