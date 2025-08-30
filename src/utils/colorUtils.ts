/**
 * Utility per gestire i colori con migliore contrasto
 * Sostituisce le combinazioni problematiche come bg-blue-100 text-blue-800
 */

export const getContrastColors = {
  // Badge colors con migliore contrasto
  badge: {
    blue: 'bg-blue-600 text-white',
    purple: 'bg-purple-600 text-white',
    green: 'bg-green-600 text-white',
    red: 'bg-red-600 text-white',
    yellow: 'bg-yellow-600 text-white',
    gray: 'bg-gray-600 text-white',
    indigo: 'bg-indigo-600 text-white',
    pink: 'bg-pink-600 text-white',
  },
  
  // Status colors
  status: {
    active: 'bg-green-600 text-white',
    inactive: 'bg-gray-600 text-white',
    pending: 'bg-yellow-600 text-white',
    error: 'bg-red-600 text-white',
    info: 'bg-blue-600 text-white',
    warning: 'bg-orange-600 text-white',
  },
  
  // Interactive elements con hover
  interactive: {
    blue: 'bg-blue-600 text-white hover:bg-blue-700',
    blueOutline: 'bg-blue-50 text-blue-700 border border-blue-300 hover:bg-blue-100',
    blueGhost: 'text-blue-700 hover:bg-blue-50',
  },
  
  // Text colors con migliore contrasto
  text: {
    blue: 'text-blue-700',
    blueLight: 'text-blue-600',
    blueDark: 'text-blue-800',
  }
};

/**
 * Sostituisce le classi di colore problematiche con versioni ad alto contrasto
 */
export const replaceProblematicColors = (className: string): string => {
  return className
    // Sostituisce bg-blue-100 text-blue-800 con bg-blue-600 text-white
    .replace(/bg-blue-100\s+text-blue-800|text-blue-800\s+bg-blue-100/g, 'bg-blue-600 text-white')
    // Sostituisce bg-blue-100 text-blue-700 con bg-blue-600 text-white
    .replace(/bg-blue-100\s+text-blue-700|text-blue-700\s+bg-blue-100/g, 'bg-blue-600 text-white')
    // Sostituisce text-blue-600 con text-blue-700 per migliore contrasto
    .replace(/text-blue-600(?!\s*bg-)/g, 'text-blue-700')
    // Sostituisce altre combinazioni problematiche
    .replace(/bg-purple-100\s+text-purple-800|text-purple-800\s+bg-purple-100/g, 'bg-purple-600 text-white')
    .replace(/bg-green-100\s+text-green-800|text-green-800\s+bg-green-100/g, 'bg-green-600 text-white')
    .replace(/bg-red-100\s+text-red-800|text-red-800\s+bg-red-100/g, 'bg-red-600 text-white')
    .replace(/bg-yellow-100\s+text-yellow-800|text-yellow-800\s+bg-yellow-100/g, 'bg-yellow-600 text-white');
};

/**
 * Genera classi per badge con colori ad alto contrasto
 */
export const getBadgeClasses = (variant: keyof typeof getContrastColors.badge = 'blue', size: 'sm' | 'md' | 'lg' = 'md'): string => {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base'
  };
  
  return `${getContrastColors.badge[variant]} ${sizeClasses[size]} font-medium rounded-full`;
};

/**
 * Genera classi per status con colori ad alto contrasto
 */
export const getStatusClasses = (status: keyof typeof getContrastColors.status, size: 'sm' | 'md' | 'lg' = 'md'): string => {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base'
  };
  
  return `${getContrastColors.status[status]} ${sizeClasses[size]} font-medium rounded-full`;
};