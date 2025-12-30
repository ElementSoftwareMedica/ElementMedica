/**
 * Language Selector Component
 * Week 14 Implementation - Language Selection
 */

import React from 'react';
import { Globe } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { usePreferences } from '../../context/PreferencesContext';
import { LanguageCode } from '../../types/preferences';

interface LanguageOption {
  code: LanguageCode;
  name: string;
  nativeName: string;
  flag: string;
  region: string;
}

const LANGUAGE_OPTIONS: LanguageOption[] = [
  {
    code: 'it',
    name: 'Italian',
    nativeName: 'Italiano',
    flag: '🇮🇹',
    region: 'Italia'
  },
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇺🇸',
    region: 'United States'
  },
  {
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
    flag: '🇫🇷',
    region: 'France'
  },
  {
    code: 'de',
    name: 'German',
    nativeName: 'Deutsch',
    flag: '🇩🇪',
    region: 'Deutschland'
  },
  {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    flag: '🇪🇸',
    region: 'España'
  }
];

interface LanguageSelectorProps {
  className?: string;
  showCard?: boolean;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ 
  className = '',
  showCard = true 
}) => {
  const { preferences, updatePreferences, loading } = usePreferences();
  
  const currentLanguage = preferences?.language || 'it';
  const currentLanguageOption = LANGUAGE_OPTIONS.find(lang => lang.code === currentLanguage);

  const handleLanguageChange = async (languageCode: LanguageCode) => {
    await updatePreferences({ language: languageCode });
  };

  const content = (
    <div className={`space-y-4 ${className}`}>
      <div className="space-y-2">
        <Label htmlFor="language-select" className="flex items-center gap-2">
          <Globe className="w-4 h-4" />
          Lingua dell'interfaccia
        </Label>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Seleziona la lingua per l'interfaccia utente e i contenuti dell'applicazione.
        </p>
      </div>

      <div className="space-y-3">
        <Select
          value={currentLanguage}
          onValueChange={(value) => { void handleLanguageChange(value as LanguageCode); }}
        >
          <SelectTrigger id="language-select">
            <SelectValue placeholder="Seleziona lingua" />
          </SelectTrigger>
          <SelectContent>
            {LANGUAGE_OPTIONS.map((language) => (
              <SelectItem key={language.code} value={language.code}>
                <div className="flex items-center gap-3 py-1">
                  <span className="text-lg">{language.flag}</span>
                  <div className="flex flex-col">
                    <span className="font-medium">{language.nativeName}</span>
                    <span className="text-xs text-gray-500">{language.name} • {language.region}</span>
                  </div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Current Selection Info */}
        {currentLanguageOption && (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-lg">{currentLanguageOption.flag}</span>
              <div>
                <span className="font-medium text-blue-900 dark:text-blue-100">
                  Lingua attuale: {currentLanguageOption.nativeName}
                </span>
                <p className="text-blue-700 dark:text-blue-300 text-xs mt-1">
                  L'interfaccia verrà aggiornata automaticamente dopo la selezione.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Language Features */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Funzionalità linguistiche</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Interfaccia utente</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Messaggi di sistema</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Formati data/ora</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Notifiche</span>
          </div>
        </div>
      </div>
    </div>
  );

  if (!showCard) {
    return content;
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="w-5 h-5" />
          Impostazioni Lingua
        </CardTitle>
      </CardHeader>
      <CardContent>
        {content}
      </CardContent>
    </Card>
  );
};

export default LanguageSelector;