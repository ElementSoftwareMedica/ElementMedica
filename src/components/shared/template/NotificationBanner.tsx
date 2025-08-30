import React from 'react';
import { AlertCircle, Check } from 'lucide-react';

interface NotificationBannerProps {
  error?: string | null;
  success?: string | null;
  onDismiss?: () => void;
}

export const NotificationBanner: React.FC<NotificationBannerProps> = ({
  error,
  success,
  onDismiss
}) => {
  if (!error && !success) return null;

  return (
    <>
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 flex items-start">
          <AlertCircle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-red-700">{error}</p>
          </div>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-red-500 hover:text-red-700 ml-2"
            >
              ×
            </button>
          )}
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 flex items-start">
          <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-green-700">{success}</p>
          </div>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-green-500 hover:text-green-700 ml-2"
            >
              ×
            </button>
          )}
        </div>
      )}
    </>
  );
};