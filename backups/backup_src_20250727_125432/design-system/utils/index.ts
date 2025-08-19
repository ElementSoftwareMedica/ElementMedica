/**
 * Design System Utilities
 * Week 8 Implementation - Component Library
 */

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combina più classi CSS utilizzando clsx e tailwind-merge
 * @param inputs - Classi CSS da combinare
 * @returns Stringa contenente le classi CSS combinate
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Utility per gestire le varianti dei componenti
 * @param base - Classi base del componente
 * @param variants - Oggetto con le varianti disponibili
 * @param props - Props del componente per selezionare le varianti
 * @returns Classi CSS combinate
 */
export function createVariants<T extends Record<string, any>>(
  base: string,
  variants: Record<keyof T, Record<string, string>>,
  props: T
): string {
  const variantClasses = Object.entries(props)
    .map(([key, value]) => {
      const variantGroup = variants[key as keyof T];
      return variantGroup?.[value as string] || '';
    })
    .filter(Boolean);

  return cn(base, ...variantClasses);
}

/**
 * Utility per gestire le dimensioni responsive
 * @param size - Dimensione del componente
 * @returns Classi CSS per la dimensione
 */
export function getResponsiveSize(size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'): string {
  const sizeMap = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
    '2xl': 'text-2xl'
  };
  
  return sizeMap[size] || sizeMap.md;
}

/**
 * Utility per gestire gli stati di focus e accessibilità
 * @param disabled - Se il componente è disabilitato
 * @returns Classi CSS per accessibilità
 */
export function getAccessibilityClasses(disabled?: boolean): string {
  if (disabled) {
    return 'cursor-not-allowed opacity-50';
  }
  
  return 'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2';
}

/**
 * Formatta una data in formato leggibile
 * @param date - Data da formattare (string ISO o oggetto Date)
 * @param includeTime - Se includere l'orario nella formattazione
 * @returns Data formattata
 */
export function formatDate(date: string | Date, includeTime = false): string {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return '';
  }
  
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    ...(includeTime && {
      hour: '2-digit',
      minute: '2-digit'
    })
  };
  
  return dateObj.toLocaleDateString('it-IT', options);
}

/**
 * Capitalizza la prima lettera di ogni parola
 * @param str - Stringa da capitalizzare
 * @returns Stringa con ogni parola capitalizzata
 */
export function capitalizeWords(str: string): string {
  if (!str) return '';
  
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}