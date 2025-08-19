/**
 * Notification Settings Component
 * Week 14 Implementation - Notification Preferences
 */

import React, { useState } from 'react';
import { 
  Bell,
  Clock,
  Mail,
  Smartphone,
  Volume2,
  VolumeX
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Alert, AlertDescription } from '../ui/alert';
import { usePreferences } from '../../context/PreferencesContext';

// Define notification frequency type locally
type NotificationFrequency = 'immediate' | 'daily' | 'weekly' | 'never';

interface NotificationSettingsProps {
  className?: string;
}

const FREQUENCY_OPTIONS: { value: NotificationFrequency; label: string; description: string }[] = [
  {
    value: 'immediate',
    label: 'Immediata',
    description: 'Ricevi notifiche non appena si verificano gli eventi'
  },
  {
    value: 'daily',
    label: 'Giornaliera',
    description: 'Ricevi un riepilogo giornaliero delle notifiche'
  },
  {
    value: 'weekly',
    label: 'Settimanale',
    description: 'Ricevi un riepilogo settimanale delle notifiche'
  },
  {
    value: 'never',
    label: 'Mai',
    description: 'Non ricevere notifiche di questo tipo'
  }
];

const NOTIFICATION_TYPES = {
  system: {
    label: 'Sistema',
    description: 'Notifiche di sistema, errori e manutenzione',
    icon: Bell
  },
  security: {
    label: 'Sicurezza',
    description: 'Accessi, modifiche password e attività sospette',
    icon: Bell
  },
  updates: {
    label: 'Aggiornamenti',
    description: 'Nuove funzionalità e aggiornamenti dell\'applicazione',
    icon: Bell
  },
  marketing: {
    label: 'Marketing',
    description: 'Promozioni, newsletter e comunicazioni commerciali',
    icon: Mail
  },
  reminders: {
    label: 'Promemoria',
    description: 'Scadenze, appuntamenti e attività programmate',
    icon: Clock
  }
};

const NotificationSettings: React.FC<NotificationSettingsProps> = ({ className = '' }) => {
  const { preferences, updatePreferences, loading } = usePreferences();
  const [testingNotification, setTestingNotification] = useState(false);

  const handleNotificationChange = async (path: string, value: any) => {
    if (!preferences) return;
    
    const pathParts = path.split('.');
    const updatedNotifications = { ...preferences.notifications };
    
    // Navigate to the nested property and update it
    let current: any = updatedNotifications;
    for (let i = 0; i < pathParts.length - 1; i++) {
      current = current[pathParts[i]];
    }
    current[pathParts[pathParts.length - 1]] = value;
    
    await updatePreferences({ notifications: updatedNotifications });
  };

  const testNotification = async () => {
    setTestingNotification(true);
    
    try {
      // Test browser notification
      if ('Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification('Test Notifica', {
            body: 'Questa è una notifica di test per verificare le tue impostazioni.',
            icon: '/favicon.ico'
          });
        } else if (Notification.permission !== 'denied') {
          const permission = await Notification.requestPermission();
          if (permission === 'granted') {
            new Notification('Test Notifica', {
              body: 'Questa è una notifica di test per verificare le tue impostazioni.',
              icon: '/favicon.ico'
            });
          }
        }
      }
    } catch (error) {
      console.error('Errore nel test della notifica:', error);
    } finally {
      setTimeout(() => setTestingNotification(false), 2000);
    }
  };

  if (!preferences) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto mb-2"></div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Caricamento impostazioni...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Email Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Notifiche Email
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium">Abilita notifiche email</Label>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Ricevi notifiche importanti via email
              </p>
            </div>
            <Switch
              checked={preferences.notifications.email.enabled}
              onCheckedChange={(checked) => handleNotificationChange('email.enabled', checked)}
              disabled={loading}
            />
          </div>
          
          {preferences.notifications.email.enabled && (
            <div className="space-y-4 pl-4 border-l-2 border-blue-200 dark:border-blue-800">
              <div className="space-y-2">
                <Label>Frequenza notifiche</Label>
                <Select
                  value={preferences.notifications.email.frequency}
                  onValueChange={(value: NotificationFrequency) => 
                    handleNotificationChange('email.frequency', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FREQUENCY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex flex-col">
                          <span>{option.label}</span>
                          <span className="text-xs text-gray-500">{option.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <Separator />
              
              <div className="space-y-3">
                <Label>Tipi di notifica email</Label>
                {Object.entries(preferences.notifications.email.types).map(([key, value]) => {
                  const typeInfo = NOTIFICATION_TYPES[key as keyof typeof NOTIFICATION_TYPES];
                  const Icon = typeInfo.icon;
                  
                  return (
                    <div key={key} className="flex items-start justify-between py-2">
                      <div className="flex items-start gap-3">
                        <Icon className="w-4 h-4 mt-1 text-gray-500" />
                        <div className="space-y-1">
                          <Label className="text-sm font-medium">{typeInfo.label}</Label>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {typeInfo.description}
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={value}
                        onCheckedChange={(checked: boolean) => 
                          handleNotificationChange(`email.types.${key}`, checked)
                        }
                        disabled={loading}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Push Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            Notifiche Push
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium">Abilita notifiche push</Label>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Ricevi notifiche push sul browser e dispositivi
              </p>
            </div>
            <Switch
              checked={preferences.notifications.push.enabled}
              onCheckedChange={(checked) => handleNotificationChange('push.enabled', checked)}
              disabled={loading}
            />
          </div>
          
          {preferences.notifications.push.enabled && (
            <div className="space-y-4 pl-4 border-l-2 border-green-200 dark:border-green-800">
              <div className="space-y-3">
                <Label>Tipi di notifica push</Label>
                {Object.entries(preferences.notifications.push.types).map(([key, value]) => {
                  const typeInfo = NOTIFICATION_TYPES[key as keyof typeof NOTIFICATION_TYPES];
                  const Icon = typeInfo.icon;
                  
                  return (
                    <div key={key} className="flex items-start justify-between py-2">
                      <div className="flex items-start gap-3">
                        <Icon className="w-4 h-4 mt-1 text-gray-500" />
                        <div className="space-y-1">
                          <Label className="text-sm font-medium">{typeInfo.label}</Label>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {typeInfo.description}
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={value}
                        onCheckedChange={(checked: boolean) => 
                          handleNotificationChange(`push.types.${key}`, checked)
                        }
                        disabled={loading}
                      />
                    </div>
                  );
                })}
              </div>
              
              <Separator />
              
              <div className="flex items-center gap-2">
                <Button
                  onClick={testNotification}
                  disabled={testingNotification}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  {testingNotification ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current" />
                      <span>Invio...</span>
                    </>
                  ) : (
                    <>
                      <Bell className="w-3 h-3" />
                      <span>Testa Notifica</span>
                    </>
                  )}
                </Button>
                <Badge variant="secondary" className="text-xs">
                  Richiede permessi browser
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* In-App Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notifiche In-App
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium">Abilita notifiche in-app</Label>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Mostra notifiche all'interno dell'applicazione
              </p>
            </div>
            <Switch
              checked={preferences.notifications.inApp.enabled}
              onCheckedChange={(checked) => handleNotificationChange('inApp.enabled', checked)}
              disabled={loading}
            />
          </div>
          
          {preferences.notifications.inApp.enabled && (
            <div className="space-y-4 pl-4 border-l-2 border-purple-200 dark:border-purple-800">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Suoni notifiche</Label>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Riproduci suoni per le notifiche in-app
                  </p>
                </div>
                <Switch
                  checked={preferences.notifications.inApp.sound}
                  onCheckedChange={(checked) => handleNotificationChange('inApp.sound', checked)}
                  disabled={loading}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Posizione notifiche</Label>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Dove mostrare le notifiche nell'interfaccia
                  </p>
                </div>
                <Select
                  value={preferences.notifications.inApp.position}
                  onValueChange={(value) => handleNotificationChange('inApp.position', value)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="top-right">Alto Destra</SelectItem>
                    <SelectItem value="top-left">Alto Sinistra</SelectItem>
                    <SelectItem value="bottom-right">Basso Destra</SelectItem>
                    <SelectItem value="bottom-left">Basso Sinistra</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notification Summary */}
      <Alert>
        <Bell className="w-4 h-4" />
        <AlertDescription>
          <div className="space-y-2">
            <p className="font-medium">Riepilogo Impostazioni</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
              <div className="flex items-center gap-2">
                {preferences.notifications.email.enabled ? (
                  <Volume2 className="w-3 h-3 text-green-500" />
                ) : (
                  <VolumeX className="w-3 h-3 text-gray-400" />
                )}
                <span>Email: {preferences.notifications.email.enabled ? 'Attive' : 'Disattive'}</span>
              </div>
              <div className="flex items-center gap-2">
                {preferences.notifications.push.enabled ? (
                  <Volume2 className="w-3 h-3 text-green-500" />
                ) : (
                  <VolumeX className="w-3 h-3 text-gray-400" />
                )}
                <span>Push: {preferences.notifications.push.enabled ? 'Attive' : 'Disattive'}</span>
              </div>
              <div className="flex items-center gap-2">
                {preferences.notifications.inApp.enabled ? (
                  <Volume2 className="w-3 h-3 text-green-500" />
                ) : (
                  <VolumeX className="w-3 h-3 text-gray-400" />
                )}
                <span>In-App: {preferences.notifications.inApp.enabled ? 'Attive' : 'Disattive'}</span>
              </div>
            </div>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default NotificationSettings;