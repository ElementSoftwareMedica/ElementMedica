/**
 * Theme Selector Component
 * P60: Design System Unificato e Dark Mode
 *
 * Permette di selezionare la modalità tema: Chiaro, Scuro, Automatico.
 * La selezione del colore è rimossa perché i colori del brand sono fissi.
 */

import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme, ThemeMode } from '../../context/ThemeContext';

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
      description: 'Segue le preferenze del sistema operativo',
      icon: <Monitor className="w-5 h-5" />
    }
  ];

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({ className }) => {
  const { mode, isDark, setMode } = useTheme();

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Theme Mode Selection */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {THEME_OPTIONS.map((option) => (
          <button
            key={option.mode}
            type="button"
            onClick={() => setMode(option.mode)}
            className={`
              relative p-4 border-2 rounded-xl text-left transition-all hover:shadow-md
              ${mode === option.mode
                ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 shadow-sm'
                : 'border-gray-200 dark:border-gray-700 hover:border-purple-300'
              }
            `}
          >
            {mode === option.mode && (
              <span className="absolute top-2 right-2 text-xs font-semibold text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded-full">
                Attivo
              </span>
            )}
            <div className="flex items-center gap-3 mb-1">
              <div className={`p-2 rounded-lg ${mode === option.mode ? 'bg-purple-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>
                {option.icon}
              </div>
              <span className="font-medium text-gray-900 dark:text-gray-100">{option.label}</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 pl-12">{option.description}</p>
          </button>
        ))}
      </div>

      {/* Current state indicator */}
      <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
        {isDark ? <Moon className="w-4 h-4 text-blue-500" /> : <Sun className="w-4 h-4 text-amber-500" />}
        <span>
          Tema corrente: <strong>{THEME_OPTIONS.find(o => o.mode === mode)?.label}</strong>
          {mode === 'auto' && <span className="ml-1 text-gray-400">({isDark ? 'Scuro — sistema' : 'Chiaro — sistema'})</span>}
        </span>
      </div>
    </div>
  );
};

export default ThemeSelector;