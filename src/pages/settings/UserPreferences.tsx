/**
 * User Preferences Page
 * Week 14 Implementation - User Preferences Management
 */

import React, { useState } from 'react';
import { 
  Bell,
  Download,
  Layout,
  Palette,
  RotateCcw,
  Settings,
  Shield,
  Upload,
  User
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../design-system/molecules/Card';
import { Button } from '../../design-system/atoms/Button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../design-system/molecules/Tabs';
import { Badge } from '../../design-system/atoms/Badge';
import { Label } from '../../design-system/atoms/Label';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Switch } from '../../components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Separator } from '../../components/ui/separator';
import { toast } from 'react-hot-toast';
import { useUserPreferences } from '../../hooks/useUserPreferences';
import { ThemeSelector } from '../../components/settings/ThemeSelector';
import { useTheme } from '../../hooks/useTheme';
import { LanguageCode } from '../../types/preferences';

const LANGUAGE_OPTIONS = [
  { code: 'it' as LanguageCode, name: 'Italiano', flag: '🇮🇹' },
  { code: 'en' as LanguageCode, name: 'English', flag: '🇺🇸' },
  { code: 'fr' as LanguageCode, name: 'Français', flag: '🇫🇷' },
  { code: 'de' as LanguageCode, name: 'Deutsch', flag: '🇩🇪' },
  { code: 'es' as LanguageCode, name: 'Español', flag: '🇪🇸' }
];

const TIMEZONE_OPTIONS = [
  { value: 'Europe/Rome', label: 'Roma (UTC+1)' },
  { value: 'Europe/London', label: 'Londra (UTC+0)' },
  { value: 'Europe/Paris', label: 'Parigi (UTC+1)' },
  { value: 'Europe/Berlin', label: 'Berlino (UTC+1)' },
  { value: 'America/New_York', label: 'New York (UTC-5)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (UTC-8)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (UTC+9)' }
];

const UserPreferences: React.FC = () => {
  const {
    preferences,
    loading,
    error,
    updatePreferences,
    resetPreferences,
    exportPreferences,
    importPreferences
  } = useUserPreferences();
  
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState('general');

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      importPreferences(file);
      // Reset input
      event.target.value = '';
    }
  };

  const handleLanguageChange = async (language: LanguageCode) => {
    await updatePreferences({ language });
  };

  const handleTimezoneChange = async (timezone: string) => {
    await updatePreferences({ timezone });
  };

  const handleDateFormatChange = async (dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD') => {
    await updatePreferences({ dateFormat });
  };

  const handleTimeFormatChange = async (timeFormat: '12h' | '24h') => {
    await updatePreferences({ timeFormat });
  };

  const handleNotificationChange = async (path: string, value: boolean) => {
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

  const handleAccessibilityChange = async (key: string, value: any) => {
    if (!preferences) return;
    
    const updatedAccessibility = {
      ...preferences.accessibility,
      [key]: value
    };
    
    await updatePreferences({ accessibility: updatedAccessibility });
  };

  const handlePrivacyChange = async (key: string, value: any) => {
    if (!preferences) return;
    
    const updatedPrivacy = {
      ...preferences.privacy,
      [key]: value
    };
    
    await updatePreferences({ privacy: updatedPrivacy });
  };

  if (loading && !preferences) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Caricamento preferenze...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !preferences) {
    return (
      <div className="container mx-auto px-4 py-6">
        <Alert variant="destructive">
          <AlertDescription>
            Errore nel caricamento delle preferenze: {error}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <User className="w-6 h-6" />
          Preferenze Utente
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Personalizza la tua esperienza e configura le impostazioni dell'applicazione.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="mb-6 flex flex-wrap gap-2">
        <Button
          onClick={exportPreferences}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Esporta Preferenze
        </Button>
        
        <div className="relative">
          <input
            type="file"
            accept=".json"
            onChange={handleFileImport}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Importa Preferenze
          </Button>
        </div>
        
        <Button
          onClick={resetPreferences}
          variant="outline"
          size="sm"
          className="flex items-center gap-2 text-red-600 hover:text-red-700"
        >
          <RotateCcw className="w-4 h-4" />
          Ripristina Default
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">Generali</span>
          </TabsTrigger>
          <TabsTrigger value="theme" className="flex items-center gap-2">
            <Palette className="w-4 h-4" />
            <span className="hidden sm:inline">Tema</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            <span className="hidden sm:inline">Notifiche</span>
          </TabsTrigger>
          <TabsTrigger value="accessibility" className="flex items-center gap-2">
            <Layout className="w-4 h-4" />
            <span className="hidden sm:inline">Accessibilità</span>
          </TabsTrigger>
          <TabsTrigger value="privacy" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            <span className="hidden sm:inline">Privacy</span>
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Impostazioni Generali</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Language */}
              <div className="space-y-2">
                <Label htmlFor="language">Lingua</Label>
                <Select
                  value={preferences?.language || 'it'}
                  onValueChange={handleLanguageChange}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGE_OPTIONS.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        <span className="flex items-center gap-2">
                          <span>{lang.flag}</span>
                          <span>{lang.name}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Timezone */}
              <div className="space-y-2">
                <Label htmlFor="timezone">Fuso Orario</Label>
                <Select
                  value={preferences?.timezone || 'Europe/Rome'}
                  onValueChange={handleTimezoneChange}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONE_OPTIONS.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Date Format */}
              <div className="space-y-2">
                <Label htmlFor="dateFormat">Formato Data</Label>
                <Select
                  value={preferences?.dateFormat || 'DD/MM/YYYY'}
                  onValueChange={handleDateFormatChange}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DD/MM/YYYY">DD/MM/YYYY (31/12/2024)</SelectItem>
                    <SelectItem value="MM/DD/YYYY">MM/DD/YYYY (12/31/2024)</SelectItem>
                    <SelectItem value="YYYY-MM-DD">YYYY-MM-DD (2024-12-31)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Time Format */}
              <div className="space-y-2">
                <Label htmlFor="timeFormat">Formato Ora</Label>
                <Select
                  value={preferences?.timeFormat || '24h'}
                  onValueChange={handleTimeFormatChange}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24h">24 ore (14:30)</SelectItem>
                    <SelectItem value="12h">12 ore (2:30 PM)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Theme Settings */}
        <TabsContent value="theme">
          <ThemeSelector />
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notifiche Email</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Abilita notifiche email</Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Ricevi notifiche via email
                  </p>
                </div>
                <Switch
                  checked={preferences?.notifications.email.enabled || false}
                  onCheckedChange={(checked) => handleNotificationChange('email.enabled', checked)}
                />
              </div>
              
              {preferences?.notifications.email.enabled && (
                <div className="space-y-4 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
                  <div className="space-y-2">
                    <Label>Frequenza</Label>
                    <Select
                      value={preferences.notifications.email.frequency}
                      onValueChange={(value) => handleNotificationChange('email.frequency', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="immediate">Immediata</SelectItem>
                        <SelectItem value="daily">Giornaliera</SelectItem>
                        <SelectItem value="weekly">Settimanale</SelectItem>
                        <SelectItem value="never">Mai</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-3">
                    <Label>Tipi di notifica</Label>
                    {Object.entries(preferences.notifications.email.types).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between">
                        <Label className="capitalize">
                          {key === 'system' && 'Sistema'}
                          {key === 'security' && 'Sicurezza'}
                          {key === 'updates' && 'Aggiornamenti'}
                          {key === 'marketing' && 'Marketing'}
                          {key === 'reminders' && 'Promemoria'}
                        </Label>
                        <Switch
                          checked={value}
                          onCheckedChange={(checked) => handleNotificationChange(`email.types.${key}`, checked)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notifiche Push</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Abilita notifiche push</Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Ricevi notifiche push sul dispositivo
                  </p>
                </div>
                <Switch
                  checked={preferences?.notifications.push.enabled || false}
                  onCheckedChange={(checked) => handleNotificationChange('push.enabled', checked)}
                />
              </div>
              
              {preferences?.notifications.push.enabled && (
                <div className="space-y-3 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
                  <Label>Tipi di notifica</Label>
                  {Object.entries(preferences.notifications.push.types).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between">
                      <Label className="capitalize">
                        {key === 'system' && 'Sistema'}
                        {key === 'security' && 'Sicurezza'}
                        {key === 'updates' && 'Aggiornamenti'}
                        {key === 'reminders' && 'Promemoria'}
                      </Label>
                      <Switch
                        checked={value}
                        onCheckedChange={(checked) => handleNotificationChange(`push.types.${key}`, checked)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Accessibility Settings */}
        <TabsContent value="accessibility" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Accessibilità</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Alto contrasto</Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Aumenta il contrasto per una migliore leggibilità
                  </p>
                </div>
                <Switch
                  checked={preferences?.accessibility.highContrast || false}
                  onCheckedChange={(checked) => handleAccessibilityChange('highContrast', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label>Riduzione animazioni</Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Riduce le animazioni per utenti sensibili al movimento
                  </p>
                </div>
                <Switch
                  checked={preferences?.accessibility.reducedMotion || false}
                  onCheckedChange={(checked) => handleAccessibilityChange('reducedMotion', checked)}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Dimensione font</Label>
                <Select
                  value={preferences?.accessibility.fontSize || 'medium'}
                  onValueChange={(value) => handleAccessibilityChange('fontSize', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Piccolo</SelectItem>
                    <SelectItem value="medium">Medio</SelectItem>
                    <SelectItem value="large">Grande</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Privacy Settings */}
        <TabsContent value="privacy" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Impostazioni Privacy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Visibilità profilo</Label>
                <Select
                  value={preferences?.privacy.profileVisibility || 'contacts'}
                  onValueChange={(value) => handlePrivacyChange('profileVisibility', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Pubblico</SelectItem>
                    <SelectItem value="contacts">Solo contatti</SelectItem>
                    <SelectItem value="private">Privato</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label>Tracciamento attività</Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Consenti il tracciamento delle tue attività per migliorare l'esperienza
                  </p>
                </div>
                <Switch
                  checked={preferences?.privacy.activityTracking || false}
                  onCheckedChange={(checked) => handlePrivacyChange('activityTracking', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label>Raccolta dati</Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Consenti la raccolta di dati anonimi per analisi e miglioramenti
                  </p>
                </div>
                <Switch
                  checked={preferences?.privacy.dataCollection || false}
                  onCheckedChange={(checked) => handlePrivacyChange('dataCollection', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Status Info */}
      {preferences && (
        <Card className="mt-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>Ultimo aggiornamento: {new Date(preferences.updatedAt).toLocaleString('it-IT')}</span>
              <Badge variant={isDark ? 'secondary' : 'default'}>
                Tema: {isDark ? 'Scuro' : 'Chiaro'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default UserPreferences;