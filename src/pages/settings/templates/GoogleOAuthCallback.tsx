/**
 * GoogleOAuthCallback Component
 * Handles the OAuth2 callback from Google
 * This page receives the authorization code and exchanges it for tokens
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { googleService } from './services/googleService';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

const GoogleOAuthCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Connessione a Google in corso...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');

        // Check for errors from Google
        if (error) {
          setStatus('error');
          setMessage(
            error === 'access_denied'
              ? 'Accesso negato. Hai rifiutato le autorizzazioni.'
              : `Errore di autorizzazione: ${error}`
          );
          return;
        }

        // Check for required parameters
        if (!code) {
          setStatus('error');
          setMessage('Codice di autorizzazione mancante.');
          return;
        }

        // Exchange code for tokens
        await googleService.exchangeCode(code, state || undefined);

        setStatus('success');
        setMessage('Connesso con successo a Google!');

        // If opened in popup, close after 1.5 seconds
        if (window.opener) {
          setTimeout(() => {
            window.close();
          }, 1500);
        } else {
          // If opened in main window, redirect after 2 seconds
          setTimeout(() => {
            navigate('/settings/templates');
          }, 2000);
        }
      } catch (err) {
        console.error('OAuth callback error:', err);
        setStatus('error');
        setMessage(
          err instanceof Error
            ? err.message
            : 'Errore durante la connessione a Google.'
        );

        // Close popup after 3 seconds even on error
        if (window.opener) {
          setTimeout(() => {
            window.close();
          }, 3000);
        }
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="h-16 w-16 text-blue-600 animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Connessione in corso
            </h2>
            <p className="text-gray-600">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Connesso con successo!
            </h2>
            <p className="text-gray-600">{message}</p>
            {window.opener ? (
              <p className="text-sm text-gray-500 mt-4">
                Questa finestra si chiuderà automaticamente...
              </p>
            ) : (
              <p className="text-sm text-gray-500 mt-4">
                Reindirizzamento in corso...
              </p>
            )}
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="h-16 w-16 text-red-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Errore di connessione
            </h2>
            <p className="text-gray-600 mb-4">{message}</p>
            {window.opener ? (
              <p className="text-sm text-gray-500">
                Questa finestra si chiuderà automaticamente...
              </p>
            ) : (
              <button
                onClick={() => navigate('/settings/templates')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Torna ai Template
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default GoogleOAuthCallback;
