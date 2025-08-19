/**
 * Theme Selector Component
 * Week 14 Implementation - Theme Selection UI
 */

import React from 'react';
import { Sun, Moon, Monitor, Palette } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../design-system/molecules/Card';
import { Button } from '../../design-system/atoms/Button';
import { Badge } from '../../design-system/atoms/Badge';
import { useTheme } from '../../hooks/useTheme';
import { ThemeMode, ThemeColor } from '../../types/preferences';

interface ThemeSelectorProps {
  className?: string;
}

const THEME_OPTIONS: Array<{
  mode: ThemeMode;
  label: string;
  description: string;
  icon: React.ReactNode;
}> = [
  {
    mode: 'light',
    label: 'Chiaro',
    description: 'Tema chiaro sempre attivo',
    icon: <Sun className="w-5 h-5" />
  },
  {
    mode: 'dark',
    label: 'Scuro',
    description: 'Tema scuro sempre attivo',
    icon: <Moon className="w-5 h-5" />
  },
  {
    mode: 'auto',
    label: 'Automatico',
    description: 'Segue le impostazioni del sistema',
    icon: <Monitor className="w-5 h-5" />
  }
];

const COLOR_OPTIONS: Array<{
  color: ThemeColor;
  label: string;
  value: string;
  preview: string;
}> = [
  {
    color: 'blue',
    label: 'Blu',
    value: '#2563eb',
    preview: 'bg-blue-500'
  },
  {
    color: 'green',
    label: 'Verde',
    value: '#059669',
    preview: 'bg-green-500'
  },
  {
    color: 'purple',
    label: 'Viola',
    value: '#7c3aed',
    preview: 'bg-purple-500'
  },
  {
    color: 'orange',
    label: 'Arancione',
    value: '#ea580c',
    preview: 'bg-orange-500'
  },
  {
    color: 'red',
    label: 'Rosso',
    value: '#dc2626',
    preview: 'bg-red-500'
  }
];

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({ className }) => {
  const { theme, themeColor, isDark, setTheme, setThemeColor } = useTheme();

  const handleThemeChange = async (newTheme: ThemeMode) => {
    await setTheme(newTheme);
  };

  const handleColorChange = async (newColor: ThemeColor) => {
    await setThemeColor(newColor);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Theme Mode Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Modalità Tema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {THEME_OPTIONS.map((option) => (
              <div
                key={option.mode}
                className={`
                  relative p-4 border-2 rounded-lg cursor-pointer transition-all
                  hover:border-blue-300 hover:shadow-md
                  ${
                    theme === option.mode
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700'
                  }
                `}
                onClick={() => handleThemeChange(option.mode)}
              >
                {theme === option.mode && (
                  <Badge 
                    variant="default" 
                    className="absolute -top-2 -right-2 bg-blue-500"
                  >
                    Attivo
                  </Badge>
                )}
                
                <div className="flex items-center gap-3 mb-2">
                  <div className={`
                    p-2 rounded-full
                    ${
                      theme === option.mode
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                    }
                  `}>
                    {option.icon}
                  </div>
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">
                    {option.label}
                  </h3>
                </div>
                
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {option.description}
                </p>
              </div>
            ))}
          </div>
          
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <strong>Tema corrente:</strong> {THEME_OPTIONS.find(o => o.mode === theme)?.label} 
              {theme === 'auto' && (
                <span className="ml-1">
                  ({isDark ? 'Scuro' : 'Chiaro'} - Sistema)
                </span>
              )}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Theme Color Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Colore del Tema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {COLOR_OPTIONS.map((option) => (
              <div
                key={option.color}
                className={`
                  relative p-4 border-2 rounded-lg cursor-pointer transition-all
                  hover:border-gray-300 hover:shadow-md
                  ${
                    themeColor === option.color
                      ? 'border-gray-400 bg-gray-50 dark:bg-gray-800'
                      : 'border-gray-200 dark:border-gray-700'
                  }
                `}
                onClick={() => handleColorChange(option.color)}
              >
                {themeColor === option.color && (
                  <Badge 
                    variant="default" 
                    className="absolute -top-2 -right-2 bg-green-500"
                  >
                    ✓
                  </Badge>
                )}
                
                <div className="flex flex-col items-center gap-2">
                  <div 
                    className={`w-8 h-8 rounded-full ${option.preview} shadow-md`}
                    style={{ backgroundColor: option.value }}
                  />
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {option.label}
                  </span>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <strong>Colore corrente:</strong> {COLOR_OPTIONS.find(o => o.color === themeColor)?.label}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Theme Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Anteprima Tema</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Sample UI Elements */}
            <div className="p-4 border rounded-lg bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                Esempio di Interfaccia
              </h4>
              <p className="text-gray-600 dark:text-gray-400 mb-3">
                Questo è un esempio di come apparirà l'interfaccia con il tema selezionato.
              </p>
              <div className="flex gap-2">
                <Button size="sm" className="bg-blue-500 hover:bg-blue-600">
                  Pulsante Primario
                </Button>
                <Button size="sm" variant="outline">
                  Pulsante Secondario
                </Button>
              </div>
            </div>
            
            {/* Color Samples */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className="p-3 rounded bg-blue-500 text-white text-center text-sm">
                Primario
              </div>
              <div className="p-3 rounded bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-center text-sm">
                Sfondo
              </div>
              <div className="p-3 rounded border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 text-center text-sm">
                Bordo
              </div>
              <div className="p-3 rounded bg-green-500 text-white text-center text-sm">
                Successo
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ThemeSelector;