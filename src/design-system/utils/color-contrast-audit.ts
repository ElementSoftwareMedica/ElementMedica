/**
 * Color Contrast Audit Tool
 * Verifica i contrasti dei colori secondo le linee guida WCAG 2.1
 */

import { publicTheme } from '../themes/public';
import { privateTheme } from '../themes/private';

// Funzione per convertire hex in RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

// Funzione per calcolare la luminanza relativa
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

// Funzione per calcolare il rapporto di contrasto
function getContrastRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  
  if (!rgb1 || !rgb2) return 0;
  
  const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);
  
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  
  return (brightest + 0.05) / (darkest + 0.05);
}

// Livelli di conformità WCAG
export const WCAG_LEVELS = {
  AA_NORMAL: 4.5,    // Testo normale AA
  AA_LARGE: 3,       // Testo grande AA
  AAA_NORMAL: 7,     // Testo normale AAA
  AAA_LARGE: 4.5,    // Testo grande AAA
} as const;

// Interfaccia per i risultati dell'audit
export interface ContrastAuditResult {
  combination: string;
  foreground: string;
  background: string;
  ratio: number;
  wcagAA: boolean;
  wcagAAA: boolean;
  wcagAALarge: boolean;
  wcagAAALarge: boolean;
  recommendation?: string;
}

// Combinazioni critiche da testare
const CRITICAL_COMBINATIONS = [
  // Testo su sfondi
  { name: 'Testo primario su sfondo primario', fg: 'text.primary', bg: 'background.primary' },
  { name: 'Testo secondario su sfondo primario', fg: 'text.secondary', bg: 'background.primary' },
  { name: 'Testo terziario su sfondo primario', fg: 'text.tertiary', bg: 'background.primary' },
  { name: 'Testo primario su sfondo secondario', fg: 'text.primary', bg: 'background.secondary' },
  { name: 'Testo inverso su sfondo inverso', fg: 'text.inverse', bg: 'background.inverse' },
  
  // Pulsanti e elementi interattivi
  { name: 'Testo bianco su primario 500', fg: '#ffffff', bg: 'primary.500' },
  { name: 'Testo bianco su primario 600', fg: '#ffffff', bg: 'primary.600' },
  { name: 'Testo bianco su primario 700', fg: '#ffffff', bg: 'primary.700' },
  { name: 'Testo scuro su primario 100', fg: 'text.primary', bg: 'primary.100' },
  { name: 'Testo scuro su primario 200', fg: 'text.primary', bg: 'primary.200' },
  
  // Stati semantici
  { name: 'Testo bianco su successo', fg: '#ffffff', bg: 'semantic.success.500' },
  { name: 'Testo bianco su errore', fg: '#ffffff', bg: 'semantic.error.500' },
  { name: 'Testo bianco su warning', fg: '#ffffff', bg: 'semantic.warning.500' },
  
  // Bordi e focus
  { name: 'Bordo focus su sfondo primario', fg: 'border.focus', bg: 'background.primary' },
  { name: 'Bordo primario su sfondo primario', fg: 'border.primary', bg: 'background.primary' },
];

// Funzione per ottenere il valore del colore dal tema
function getColorValue(theme: any, path: string): string {
  if (path.startsWith('#')) return path;
  
  const parts = path.split('.');
  let value = theme.colors;
  
  for (const part of parts) {
    value = value[part];
    if (!value) return '#000000';
  }
  
  return typeof value === 'string' ? value : '#000000';
}

// Funzione principale per l'audit dei contrasti
export function auditColorContrasts(theme: any, themeName: string): ContrastAuditResult[] {
  const results: ContrastAuditResult[] = [];
  
  for (const combo of CRITICAL_COMBINATIONS) {
    const foreground = getColorValue(theme, combo.fg);
    const background = getColorValue(theme, combo.bg);
    const ratio = getContrastRatio(foreground, background);
    
    const wcagAA = ratio >= WCAG_LEVELS.AA_NORMAL;
    const wcagAAA = ratio >= WCAG_LEVELS.AAA_NORMAL;
    const wcagAALarge = ratio >= WCAG_LEVELS.AA_LARGE;
    const wcagAAALarge = ratio >= WCAG_LEVELS.AAA_LARGE;
    
    let recommendation = '';
    if (!wcagAA) {
      recommendation = `⚠️ CRITICO: Contrasto insufficiente (${ratio.toFixed(2)}). Minimo richiesto: ${WCAG_LEVELS.AA_NORMAL}`;
    } else if (!wcagAAA) {
      recommendation = `⚡ Buono per AA, migliorabile per AAA (${ratio.toFixed(2)}). Target AAA: ${WCAG_LEVELS.AAA_NORMAL}`;
    } else {
      recommendation = `✅ Eccellente conformità WCAG AAA (${ratio.toFixed(2)})`;
    }
    
    results.push({
      combination: `${themeName}: ${combo.name}`,
      foreground,
      background,
      ratio: Math.round(ratio * 100) / 100,
      wcagAA,
      wcagAAA,
      wcagAALarge,
      wcagAAALarge,
      recommendation,
    });
  }
  
  return results;
}

// Funzione per generare il report completo
export function generateContrastReport(): {
  publicResults: ContrastAuditResult[];
  privateResults: ContrastAuditResult[];
  summary: {
    publicIssues: number;
    privateIssues: number;
    totalCombinations: number;
    overallCompliance: number;
  };
} {
  const publicResults = auditColorContrasts(publicTheme, 'Tema Pubblico');
  const privateResults = auditColorContrasts(privateTheme, 'Tema Privato');
  
  const publicIssues = publicResults.filter(r => !r.wcagAA).length;
  const privateIssues = privateResults.filter(r => !r.wcagAA).length;
  const totalCombinations = publicResults.length + privateResults.length;
  const totalIssues = publicIssues + privateIssues;
  const overallCompliance = ((totalCombinations - totalIssues) / totalCombinations) * 100;
  
  return {
    publicResults,
    privateResults,
    summary: {
      publicIssues,
      privateIssues,
      totalCombinations,
      overallCompliance: Math.round(overallCompliance * 100) / 100,
    },
  };
}

// Funzione per suggerimenti di miglioramento
export function generateImprovementSuggestions(results: ContrastAuditResult[]): string[] {
  const suggestions: string[] = [];
  const issues = results.filter(r => !r.wcagAA);
  
  if (issues.length === 0) {
    suggestions.push('🎉 Tutti i contrasti rispettano le linee guida WCAG AA!');
    return suggestions;
  }
  
  suggestions.push(`📊 Trovati ${issues.length} problemi di contrasto da risolvere:`);
  suggestions.push('');
  
  for (const issue of issues) {
    suggestions.push(`• ${issue.combination}`);
    suggestions.push(`  Contrasto attuale: ${issue.ratio} (minimo: ${WCAG_LEVELS.AA_NORMAL})`);
    suggestions.push(`  Colori: ${issue.foreground} su ${issue.background}`);
    suggestions.push(`  ${issue.recommendation}`);
    suggestions.push('');
  }
  
  suggestions.push('🔧 Raccomandazioni generali:');
  suggestions.push('• Utilizzare colori più scuri per il testo su sfondi chiari');
  suggestions.push('• Utilizzare colori più chiari per il testo su sfondi scuri');
  suggestions.push('• Testare sempre i contrasti con strumenti automatici');
  suggestions.push('• Considerare utenti con disabilità visive');
  
  return suggestions;
}