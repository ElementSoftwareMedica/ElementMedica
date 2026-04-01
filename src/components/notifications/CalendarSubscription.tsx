/**
 * CalendarSubscription
 * 
 * Componente per gestire la subscription al calendario ICS.
 * Permette di generare token e ottenere link per Google Calendar, Outlook, etc.
 * 
 * PROGETTO 47 - Advanced Notification System - Fase 9
 * 
 * @module components/notifications/CalendarSubscription
 */

import React, { useState, useCallback } from 'react';
import {
  Calendar,
  Link as LinkIcon,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  Trash2,
  Shield,
  Clock,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/useToast';
import { apiGet, apiPost, apiDelete } from '@/services/api';
import { cn } from '@/design-system/utils';

// ============================================
// TYPES
// ============================================

interface CalendarLinks {
  hasToken: boolean;
  expired?: boolean;
  expiresAt?: string;
  webcalLink?: string;
  googleCalendarLink?: string;
  outlookLink?: string;
  directLink?: string;
  message?: string;
}

interface CalendarProvider {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  getLink: (links: CalendarLinks) => string | undefined;
}

// ============================================
// CONSTANTS
// ============================================

const CALENDAR_PROVIDERS: CalendarProvider[] = [
  {
    id: 'google',
    name: 'Google Calendar',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
        <path d="M18.316 5.684H5.684v12.632h12.632V5.684zM17.105 17.105H6.895V9.474h10.21v7.631zM17.105 8.263H6.895V6.895h10.21v1.368zM8.263 11.053h1.579v1.578H8.263v-1.578zm3.158 0h1.579v1.578h-1.579v-1.578zm3.158 0h1.578v1.578h-1.578v-1.578z" />
        <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8z" />
      </svg>
    ),
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    getLink: (links) => links.googleCalendarLink
  },
  {
    id: 'outlook',
    name: 'Outlook',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
        <path d="M7.88 12.04q0 .45-.11.87-.1.41-.33.74-.22.33-.58.52-.37.2-.87.2t-.85-.2q-.35-.21-.57-.55-.22-.33-.33-.75-.1-.42-.1-.86t.1-.87q.1-.43.34-.76.22-.34.59-.54.36-.2.87-.2t.86.2q.35.21.57.55.22.34.31.77.1.43.1.88zM24 12v9.38q0 .46-.33.8-.33.32-.8.32H7.13q-.46 0-.8-.33-.32-.33-.32-.8V18H1q-.41 0-.7-.3-.3-.29-.3-.7V7q0-.41.3-.7Q.58 6 1 6h6.01V2.62q0-.46.33-.8.33-.32.8-.32h8.73q.46 0 .8.33.32.33.32.8V7h4.88q.46 0 .8.33.33.34.33.8v3.87zM7.01 7h3.12V6H7.01v1zm0 3h3.12V9H7.01v1zm0 3h3.12v-1H7.01v1zM6 19.5h-.87v-1H6v1zm0-2h-.87v-1H6v1zm0-2h-.87v-1H6v1zm0-2h-.87v-1H6v1zm0-2h-.87v-1H6v1zm0-2h-.87v-1H6v1zm0-2h-.87v-1H6v1zM5.13 6H1v10h4.13V6zm9.74 2.24V3H8.01v9.24l6.86-4zM15 17.5h-.87v-1H15v1zm0-2h-.87v-1H15v1zm0-2h-.87v-1H15v1zm7 5.5H7.01v-.5h2.87v-1H7.01v-1h2.87v-1H7.01v-1h2.87v-1H7.01v-1h2.87v-1H7.01v-.5h14.99v8z" />
      </svg>
    ),
    color: 'text-sky-600',
    bgColor: 'bg-sky-100 dark:bg-sky-900/30',
    getLink: (links) => links.outlookLink
  },
  {
    id: 'apple',
    name: 'Apple Calendar',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
      </svg>
    ),
    color: 'text-gray-800 dark:text-gray-200',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    getLink: (links) => links.webcalLink
  },
  {
    id: 'other',
    name: 'Altro (link diretto)',
    icon: <LinkIcon className="w-5 h-5" />,
    color: 'text-teal-600',
    bgColor: 'bg-teal-100 dark:bg-teal-900/30',
    getLink: (links) => links.directLink
  }
];

// ============================================
// COMPONENT
// ============================================

export const CalendarSubscription: React.FC = () => {
  const { showToast } = useToast();

  // State
  const [links, setLinks] = useState<CalendarLinks | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false);

  // Fetch existing links
  const fetchLinks = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await apiGet<{ success: boolean; data: CalendarLinks }>('/api/v1/notifications/calendar/links');

      if (response.success) {
        setLinks(response.data);
      }
    } catch (error) {
      showToast({
        message: 'Errore nel recupero dei link calendario',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
      setHasFetched(true);
    }
  }, [showToast]);

  // Generate new token
  const handleGenerate = useCallback(async () => {
    try {
      setIsGenerating(true);
      const response = await apiPost<{
        success: boolean;
        data: {
          token: string;
          expiresAt: string;
          webcalLink: string;
          googleCalendarLink: string;
          outlookLink: string;
        }
      }>('/api/v1/notifications/calendar/token', {});

      if (response.success) {
        setLinks({
          hasToken: true,
          expiresAt: response.data.expiresAt,
          webcalLink: response.data.webcalLink,
          googleCalendarLink: response.data.googleCalendarLink,
          outlookLink: response.data.outlookLink,
          directLink: response.data.webcalLink?.replace('webcal://', 'https://')
        });

        showToast({
          message: 'Link calendario generato con successo',
          type: 'success'
        });
      }
    } catch (error) {
      showToast({
        message: 'Errore nella generazione del link',
        type: 'error'
      });
    } finally {
      setIsGenerating(false);
    }
  }, [showToast]);

  // Revoke token
  const handleRevoke = useCallback(async () => {
    try {
      setIsRevoking(true);
      await apiDelete('/api/v1/notifications/calendar/token');

      setLinks({
        hasToken: false,
        message: 'Token revocato. Genera un nuovo link per ripristinare la subscription.'
      });

      showToast({
        message: 'Link calendario revocato',
        type: 'success'
      });
    } catch (error) {
      showToast({
        message: 'Errore nella revoca del link',
        type: 'error'
      });
    } finally {
      setIsRevoking(false);
    }
  }, [showToast]);

  // Copy link to clipboard
  const copyLink = useCallback(async (providerId: string, link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopiedId(providerId);
      setTimeout(() => setCopiedId(null), 2000);
      showToast({
        message: 'Link copiato negli appunti',
        type: 'success'
      });
    } catch (error) {
      showToast({
        message: 'Errore nella copia del link',
        type: 'error'
      });
    }
  }, [showToast]);

  // Open link in new tab
  const openLink = useCallback((link: string) => {
    window.open(link, '_blank', 'noopener,noreferrer');
  }, []);

  // Format expiry date
  const formatExpiry = (date: string) => {
    return new Date(date).toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  // Calculate days until expiry
  const getDaysUntilExpiry = (date: string) => {
    const expiry = new Date(date);
    const now = new Date();
    const diff = expiry.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Calendar className="w-5 h-5 text-teal-500" />
          Subscription Calendario
        </h2>
        <p className="text-sm text-muted-foreground">
          Sincronizza i tuoi appuntamenti con il tuo calendario preferito
        </p>
      </div>

      <div className="p-6">
        {/* Initial state - not fetched yet */}
        {!hasFetched && !isLoading && (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-teal-100 dark:bg-teal-900/30 rounded-full flex items-center justify-center">
              <Calendar className="w-8 h-8 text-teal-600 dark:text-teal-400" />
            </div>
            <h3 className="text-lg font-medium mb-2">Sincronizza il tuo Calendario</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Aggiungi i tuoi appuntamenti automaticamente a Google Calendar, Outlook,
              Apple Calendar o qualsiasi altro calendario compatibile.
            </p>
            <Button onClick={fetchLinks} disabled={isLoading}>
              <Calendar className="w-4 h-4 mr-2" />
              Inizia
            </Button>
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* No token - show generate button */}
        {hasFetched && !isLoading && links && !links.hasToken && (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
              {links.expired ? (
                <Clock className="w-8 h-8 text-amber-600 dark:text-amber-400" />
              ) : (
                <LinkIcon className="w-8 h-8 text-amber-600 dark:text-amber-400" />
              )}
            </div>
            <h3 className="text-lg font-medium mb-2">
              {links.expired ? 'Link Scaduto' : 'Nessun Link Attivo'}
            </h3>
            <p className="text-muted-foreground mb-6">
              {links.message || 'Genera un link per sincronizzare il calendario'}
            </p>
            <Button onClick={handleGenerate} disabled={isGenerating}>
              {isGenerating ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Calendar className="w-4 h-4 mr-2" />
              )}
              Genera Link
            </Button>
          </div>
        )}

        {/* Has token - show providers */}
        {hasFetched && !isLoading && links?.hasToken && (
          <div className="space-y-6">
            {/* Security notice */}
            <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
              <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-blue-900 dark:text-blue-100">Link protetto</p>
                <p className="text-blue-700 dark:text-blue-300">
                  Questo link è personale e sicuro. Non condividerlo con altri.
                </p>
              </div>
            </div>

            {/* Expiry info */}
            {links.expiresAt && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>
                  Scade il {formatExpiry(links.expiresAt)}
                  ({getDaysUntilExpiry(links.expiresAt)} giorni)
                </span>
              </div>
            )}

            {/* Provider buttons */}
            <div className="grid gap-3">
              {CALENDAR_PROVIDERS.map((provider) => {
                const link = provider.getLink(links);
                if (!link) return null;

                return (
                  <div
                    key={provider.id}
                    className="flex items-center justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'p-2 rounded-lg',
                        provider.bgColor,
                        provider.color
                      )}>
                        {provider.icon}
                      </div>
                      <div>
                        <p className="font-medium">{provider.name}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[200px] sm:max-w-[300px]">
                          {link}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyLink(provider.id, link)}
                        className="h-8 w-8 p-0"
                      >
                        {copiedId === provider.id ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openLink(link)}
                        className="h-8 w-8 p-0"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerate}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Rigenera Link
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleRevoke}
                disabled={isRevoking}
              >
                {isRevoking ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                Revoca
              </Button>
            </div>

            {/* Warning for expiring soon */}
            {links.expiresAt && getDaysUntilExpiry(links.expiresAt) <= 14 && (
              <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-amber-900 dark:text-amber-100">Link in scadenza</p>
                  <p className="text-amber-700 dark:text-amber-300">
                    Il tuo link scadrà tra {getDaysUntilExpiry(links.expiresAt)} giorni.
                    Rigenera il link per continuare a sincronizzare il calendario.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CalendarSubscription;
