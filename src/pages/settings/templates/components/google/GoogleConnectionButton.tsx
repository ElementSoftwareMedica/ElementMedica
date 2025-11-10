/**
 * Google Connection Button Component
 * Shows connection status and allows connect/disconnect
 */

import React from 'react';
import { Cloud, CloudOff, Loader2 } from 'lucide-react';

interface GoogleConnectionButtonProps {
  connected: boolean;
  isLoading: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  expiresAt?: Date | null;
}

export const GoogleConnectionButton: React.FC<GoogleConnectionButtonProps> = ({
  connected,
  isLoading,
  onConnect,
  onDisconnect,
  expiresAt
}) => {
  if (isLoading) {
    return (
      <button
        disabled
        className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
      >
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        Connessione...
      </button>
    );
  }

  if (connected) {
    return (
      <div className="inline-flex items-center gap-2">
        <div className="flex items-center px-3 py-2 bg-green-50 border border-green-200 rounded-md">
          <Cloud className="w-4 h-4 text-green-600 mr-2" />
          <div className="text-sm">
            <span className="font-medium text-green-900">Connesso a Google</span>
            {expiresAt && (
              <span className="text-green-700 ml-2">
                (Scade: {new Date(expiresAt).toLocaleDateString()})
              </span>
            )}
          </div>
        </div>
        <button
          onClick={onDisconnect}
          className="px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md border border-red-200"
        >
          Disconnetti
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={onConnect}
      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
    >
      <Cloud className="w-4 h-4 mr-2" />
      Connetti Google Account
    </button>
  );
};

export default GoogleConnectionButton;
