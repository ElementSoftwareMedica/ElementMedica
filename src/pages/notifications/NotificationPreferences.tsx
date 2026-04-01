/**
 * NotificationPreferences
 * 
 * Pagina per gestire le preferenze delle notifiche.
 * Canali, quiet hours, digest email, categorie, calendario.
 * 
 * PROGETTO 47 - Advanced Notification System - Fase 5, 9
 * 
 * @module pages/notifications/NotificationPreferences
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Bell,
  Mail,
  MessageSquare,
  Smartphone,
  Moon,
  Calendar,
  ArrowLeft,
  Save,
  RefreshCw,
  Volume2,
  AlertCircle
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { CalendarSubscription } from '@/components/notifications/CalendarSubscription';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/useToast';
import { apiGet, apiPut } from '@/services/api';
import { cn } from '@/design-system/utils';

// ============================================
// TYPES
// ============================================

interface NotificationPreferences {
  // Channels
  inAppEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  whatsappEnabled: boolean;
  pushEnabled: boolean;

  // Quiet Hours
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  quietHoursTimezone: string;

  // Digest
  digestEnabled: boolean;
  digestFrequency: 'DAILY' | 'WEEKLY';
  digestTime: string;

  // Sound
  soundEnabled: boolean;

  // Category opt-outs
  categoryOptOuts: string[];
}

interface CategoryConfig {
  key: string;
  label: string;
  description: string;
  icon: React.ReactNode;
}

// ============================================
// CONSTANTS
// ============================================

const CATEGORIES: CategoryConfig[] = [
  {
    key: 'APPOINTMENT',
    label: 'Appuntamenti',
    description: 'Promemoria e aggiornamenti appuntamenti',
    icon: <Calendar className="w-5 h-5" />
  },
  {
    key: 'BILLING',
    label: 'Fatturazione',
    description: 'Fatture, pagamenti e scadenze',
    icon: <Bell className="w-5 h-5" />
  },
  {
    key: 'DOCUMENT',
    label: 'Documenti',
    description: 'Nuovi documenti e certificati',
    icon: <Bell className="w-5 h-5" />
  },
  {
    key: 'CLINICAL',
    label: 'Clinica',
    description: 'Risultati visite e referti',
    icon: <Bell className="w-5 h-5" />
  },
  {
    key: 'TRAINING',
    label: 'Formazione',
    description: 'Corsi, attestati e scadenze',
    icon: <Bell className="w-5 h-5" />
  },
  {
    key: 'SAFETY',
    label: 'Sicurezza',
    description: 'Avvisi di sicurezza e sistema',
    icon: <AlertCircle className="w-5 h-5" />
  },
  {
    key: 'MARKETING',
    label: 'Promozioni',
    description: 'Offerte e novità',
    icon: <Bell className="w-5 h-5" />
  }
];

const DEFAULT_PREFERENCES: NotificationPreferences = {
  inAppEnabled: true,
  emailEnabled: true,
  smsEnabled: false,
  whatsappEnabled: false,
  pushEnabled: true,
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
  quietHoursTimezone: 'Europe/Rome',
  digestEnabled: false,
  digestFrequency: 'DAILY',
  digestTime: '09:00',
  soundEnabled: true,
  categoryOptOuts: []
};

// ============================================
// COMPONENT
// ============================================

export const NotificationPreferences: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();

  // Determine base path based on current context
  const basePath = location.pathname.startsWith('/management')
    ? '/management/notifiche'
    : '/notifiche';

  // State
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalPreferences, setOriginalPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);

  // Fetch preferences on mount - empty deps array to run only once
  useEffect(() => {
    let isMounted = true;

    const fetchPreferences = async () => {
      try {
        setIsLoading(true);
        const response = await apiGet<{ success: boolean; data: Partial<NotificationPreferences> }>('/api/v1/notifications/advanced/preferences');
        if (isMounted && response.success && response.data) {
          const prefs = {
            ...DEFAULT_PREFERENCES,
            ...response.data
          };
          setPreferences(prefs);
          setOriginalPreferences(prefs);
        }
      } catch (error) {
        if (isMounted) {
          showToast({
            message: 'Errore nel caricamento delle preferenze',
            type: 'error'
          });
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchPreferences();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  // Track changes
  useEffect(() => {
    const changed = JSON.stringify(preferences) !== JSON.stringify(originalPreferences);
    setHasChanges(changed);
  }, [preferences, originalPreferences]);

  // Handlers
  const updatePreference = useCallback(<K extends keyof NotificationPreferences>(
    key: K,
    value: NotificationPreferences[K]
  ) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  const toggleCategory = useCallback((category: string) => {
    setPreferences(prev => {
      const current = prev.categoryOptOuts || [];
      const isOptedOut = current.includes(category);

      return {
        ...prev,
        categoryOptOuts: isOptedOut
          ? current.filter(c => c !== category)
          : [...current, category]
      };
    });
  }, []);

  const handleSave = useCallback(async () => {
    try {
      setIsSaving(true);
      await apiPut('/api/v1/notifications/advanced/preferences', preferences);
      setOriginalPreferences(preferences);
      setHasChanges(false);
      showToast({
        message: 'Preferenze salvate con successo',
        type: 'success'
      });
    } catch (error) {
      showToast({
        message: 'Errore nel salvataggio delle preferenze',
        type: 'error'
      });
    } finally {
      setIsSaving(false);
    }
  }, [preferences, showToast]);

  const handleReset = useCallback(() => {
    setPreferences(originalPreferences);
    setHasChanges(false);
  }, [originalPreferences]);

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(basePath)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Indietro
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {hasChanges && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
            >
              Annulla
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
          >
            {isSaving ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Salva
          </Button>
        </div>
      </div>

      {/* Title */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
          <Bell className="w-6 h-6 text-teal-600 dark:text-teal-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Preferenze Notifiche
          </h1>
          <p className="text-sm text-muted-foreground">
            Gestisci come e quando ricevere le notifiche
          </p>
        </div>
      </div>

      {/* Channels Section */}
      <div className="bg-card rounded-xl shadow-sm border border-border mb-6 overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            Canali di Notifica
          </h2>
          <p className="text-sm text-muted-foreground">
            Scegli su quali canali ricevere le notifiche
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* In-App - Always enabled */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
                <Bell className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <p className="font-medium">In-App</p>
                <p className="text-sm text-muted-foreground">
                  Notifiche nell'applicazione (sempre attivo)
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.inAppEnabled}
              disabled
            />
          </div>

          <Separator />

          {/* Email */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="font-medium">Email</p>
                <p className="text-sm text-muted-foreground">
                  Ricevi notifiche via email
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.emailEnabled}
              onCheckedChange={(v) => updatePreference('emailEnabled', v)}
            />
          </div>

          <Separator />

          {/* SMS */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Smartphone className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="font-medium">SMS</p>
                <p className="text-sm text-muted-foreground">
                  Solo per notifiche urgenti
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.smsEnabled}
              onCheckedChange={(v) => updatePreference('smsEnabled', v)}
            />
          </div>

          <Separator />

          {/* WhatsApp */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                <MessageSquare className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="font-medium">WhatsApp</p>
                <p className="text-sm text-muted-foreground">
                  Notifiche via WhatsApp
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.whatsappEnabled}
              onCheckedChange={(v) => updatePreference('whatsappEnabled', v)}
            />
          </div>

          <Separator />

          {/* Push */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Bell className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="font-medium">Push Browser</p>
                <p className="text-sm text-muted-foreground">
                  Notifiche push del browser
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.pushEnabled}
              onCheckedChange={(v) => updatePreference('pushEnabled', v)}
            />
          </div>
        </div>
      </div>

      {/* Sound Section */}
      <div className="bg-card rounded-xl shadow-sm border border-border mb-6 overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Volume2 className="w-5 h-5" />
            Suoni
          </h2>
        </div>

        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Suoni notifiche</p>
              <p className="text-sm text-muted-foreground">
                Riproduci un suono per le notifiche urgenti
              </p>
            </div>
            <Switch
              checked={preferences.soundEnabled}
              onCheckedChange={(v) => updatePreference('soundEnabled', v)}
            />
          </div>
        </div>
      </div>

      {/* Quiet Hours Section */}
      <div className="bg-card rounded-xl shadow-sm border border-border mb-6 overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Moon className="w-5 h-5" />
            Quiet Hours
          </h2>
          <p className="text-sm text-muted-foreground">
            Non ricevere notifiche durante questi orari
          </p>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-medium">Abilita Quiet Hours</span>
            <Switch
              checked={preferences.quietHoursEnabled}
              onCheckedChange={(v) => updatePreference('quietHoursEnabled', v)}
            />
          </div>

          {preferences.quietHoursEnabled && (
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div>
                <label className="text-sm text-muted-foreground block mb-1">Da</label>
                <Input
                  type="time"
                  value={preferences.quietHoursStart}
                  onChange={(e) => updatePreference('quietHoursStart', e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground block mb-1">A</label>
                <Input
                  type="time"
                  value={preferences.quietHoursEnd}
                  onChange={(e) => updatePreference('quietHoursEnd', e.target.value)}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Digest Section */}
      <div className="bg-card rounded-xl shadow-sm border border-border mb-6 overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Riepilogo Email
          </h2>
          <p className="text-sm text-muted-foreground">
            Ricevi un riepilogo delle notifiche invece di email singole
          </p>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-medium">Abilita Riepilogo</span>
            <Switch
              checked={preferences.digestEnabled}
              onCheckedChange={(v) => updatePreference('digestEnabled', v)}
            />
          </div>

          {preferences.digestEnabled && (
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div>
                <label className="text-sm text-muted-foreground block mb-1">Frequenza</label>
                <Select
                  value={preferences.digestFrequency}
                  onValueChange={(v) => updatePreference('digestFrequency', v as 'DAILY' | 'WEEKLY')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DAILY">Giornaliero</SelectItem>
                    <SelectItem value="WEEKLY">Settimanale</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-muted-foreground block mb-1">Ora invio</label>
                <Input
                  type="time"
                  value={preferences.digestTime}
                  onChange={(e) => updatePreference('digestTime', e.target.value)}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Calendar Subscription Section */}
      <div className="mb-6">
        <CalendarSubscription />
      </div>

      {/* Categories Section */}
      <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Categorie</h2>
          <p className="text-sm text-muted-foreground">
            Gestisci le notifiche per categoria
          </p>
        </div>

        <div className="divide-y divide-border">
          {CATEGORIES.map((category) => {
            const isEnabled = !preferences.categoryOptOuts?.includes(category.key);

            return (
              <div key={category.key} className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'p-2 rounded-lg',
                    isEnabled
                      ? 'bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                  )}>
                    {category.icon}
                  </div>
                  <div>
                    <p className="font-medium">{category.label}</p>
                    <p className="text-sm text-muted-foreground">{category.description}</p>
                  </div>
                </div>
                <Switch
                  checked={isEnabled}
                  onCheckedChange={() => toggleCategory(category.key)}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Save Button (sticky on mobile) */}
      {hasChanges && (
        <div className="sticky bottom-4 mt-6 flex justify-end sm:hidden">
          <Button
            size="lg"
            onClick={handleSave}
            disabled={isSaving}
            className="shadow-lg"
          >
            {isSaving ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Salva Preferenze
          </Button>
        </div>
      )}
    </div>
  );
};

export default NotificationPreferences;
