#!/usr/bin/env node

/**
 * Script per l'audit dei contrasti dei colori
 * Genera un report dettagliato sulla conformità WCAG
 */

const fs = require('fs');
const path = require('path');

// Simulazione delle funzioni di audit (versione Node.js)
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

function getLuminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function getContrastRatio(color1, color2) {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  
  if (!rgb1 || !rgb2) return 0;
  
  const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);
  
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  
  return (brightest + 0.05) / (darkest + 0.05);
}

// Temi (copiati dai file TypeScript)
const publicTheme = {
  colors: {
    primary: {
      50: '#f0f9ff',
      100: '#e0f2fe',
      200: '#bae6fd',
      300: '#7dd3fc',
      400: '#38bdf8',
      500: '#0ea5e9',
      600: '#0284c7',
      700: '#0369a1',
      800: '#075985',
      900: '#0c4a6e',
    },
    background: {
      primary: '#ffffff',
      secondary: '#f0f9ff',
      inverse: '#0c4a6e',
    },
    text: {
      primary: '#0f172a',
      secondary: '#475569',
      tertiary: '#64748b',
      inverse: '#ffffff',
    },
    border: {
      focus: '#0ea5e9',
      primary: '#e2e8f0',
    },
    semantic: {
      success: { 500: '#22c55e' },
      error: { 500: '#ef4444' },
      warning: { 500: '#f59e0b' },
    },
  },
};

const privateTheme = {
  colors: {
    primary: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
    },
    background: {
      primary: '#ffffff',
      secondary: '#f8fafc',
      inverse: '#1e3a8a',
    },
    text: {
      primary: '#0f172a',
      secondary: '#475569',
      tertiary: '#64748b',
      inverse: '#ffffff',
    },
    border: {
      focus: '#3b82f6',
      primary: '#e2e8f0',
    },
    semantic: {
      success: { 500: '#22c55e' },
      error: { 500: '#ef4444' },
      warning: { 500: '#f59e0b' },
    },
  },
};

// Combinazioni da testare
const CRITICAL_COMBINATIONS = [
  { name: 'Testo primario su sfondo primario', fg: 'text.primary', bg: 'background.primary' },
  { name: 'Testo secondario su sfondo primario', fg: 'text.secondary', bg: 'background.primary' },
  { name: 'Testo terziario su sfondo primario', fg: 'text.tertiary', bg: 'background.primary' },
  { name: 'Testo primario su sfondo secondario', fg: 'text.primary', bg: 'background.secondary' },
  { name: 'Testo inverso su sfondo inverso', fg: 'text.inverse', bg: 'background.inverse' },
  { name: 'Testo bianco su primario 500', fg: '#ffffff', bg: 'primary.500' },
  { name: 'Testo bianco su primario 600', fg: '#ffffff', bg: 'primary.600' },
  { name: 'Testo bianco su primario 700', fg: '#ffffff', bg: 'primary.700' },
  { name: 'Testo scuro su primario 100', fg: 'text.primary', bg: 'primary.100' },
  { name: 'Testo scuro su primario 200', fg: 'text.primary', bg: 'primary.200' },
  { name: 'Testo bianco su successo', fg: '#ffffff', bg: 'semantic.success.500' },
  { name: 'Testo bianco su errore', fg: '#ffffff', bg: 'semantic.error.500' },
  { name: 'Testo bianco su warning', fg: '#ffffff', bg: 'semantic.warning.500' },
];

function getColorValue(theme, path) {
  if (path.startsWith('#')) return path;
  
  const parts = path.split('.');
  let value = theme.colors;
  
  for (const part of parts) {
    value = value[part];
    if (!value) return '#000000';
  }
  
  return typeof value === 'string' ? value : '#000000';
}

function auditTheme(theme, themeName) {
  const results = [];
  
  for (const combo of CRITICAL_COMBINATIONS) {
    const foreground = getColorValue(theme, combo.fg);
    const background = getColorValue(theme, combo.bg);
    const ratio = getContrastRatio(foreground, background);
    
    const wcagAA = ratio >= 4.5;
    const wcagAAA = ratio >= 7;
    
    let status = '❌ FAIL';
    let recommendation = '';
    
    if (wcagAAA) {
      status = '✅ AAA';
      recommendation = 'Eccellente conformità WCAG AAA';
    } else if (wcagAA) {
      status = '✅ AA';
      recommendation = 'Buona conformità WCAG AA';
    } else {
      status = '❌ FAIL';
      recommendation = `CRITICO: Contrasto insufficiente. Minimo richiesto: 4.5, attuale: ${ratio.toFixed(2)}`;
    }
    
    results.push({
      combination: combo.name,
      foreground,
      background,
      ratio: Math.round(ratio * 100) / 100,
      status,
      recommendation,
    });
  }
  
  return results;
}

function generateReport() {
  console.log('🎨 AUDIT CONTRASTI COLORI - DESIGN SYSTEM');
  console.log('==========================================\n');
  
  const publicResults = auditTheme(publicTheme, 'Pubblico');
  const privateResults = auditTheme(privateTheme, 'Privato');
  
  // Report tema pubblico
  console.log('📘 TEMA PUBBLICO (Blu Cielo)');
  console.log('-----------------------------');
  publicResults.forEach(result => {
    console.log(`${result.status} ${result.combination}`);
    console.log(`   Contrasto: ${result.ratio} | ${result.foreground} su ${result.background}`);
    console.log(`   ${result.recommendation}\n`);
  });
  
  // Report tema privato
  console.log('🔒 TEMA PRIVATO (Blu Scuro)');
  console.log('---------------------------');
  privateResults.forEach(result => {
    console.log(`${result.status} ${result.combination}`);
    console.log(`   Contrasto: ${result.ratio} | ${result.foreground} su ${result.background}`);
    console.log(`   ${result.recommendation}\n`);
  });
  
  // Statistiche finali
  const publicIssues = publicResults.filter(r => !r.status.includes('✅')).length;
  const privateIssues = privateResults.filter(r => !r.status.includes('✅')).length;
  const totalTests = publicResults.length + privateResults.length;
  const totalIssues = publicIssues + privateIssues;
  const compliance = ((totalTests - totalIssues) / totalTests * 100).toFixed(1);
  
  console.log('📊 RIEPILOGO AUDIT');
  console.log('==================');
  console.log(`Tema Pubblico: ${publicResults.length - publicIssues}/${publicResults.length} test superati`);
  console.log(`Tema Privato: ${privateResults.length - privateIssues}/${privateResults.length} test superati`);
  console.log(`Conformità complessiva: ${compliance}%`);
  console.log(`Problemi critici: ${totalIssues}`);
  
  if (totalIssues > 0) {
    console.log('\n🔧 RACCOMANDAZIONI');
    console.log('==================');
    console.log('• Utilizzare colori più scuri per il testo su sfondi chiari');
    console.log('• Utilizzare colori più chiari per il testo su sfondi scuri');
    console.log('• Testare sempre i contrasti con strumenti automatici');
    console.log('• Considerare utenti con disabilità visive');
  } else {
    console.log('\n🎉 Tutti i contrasti rispettano le linee guida WCAG!');
  }
  
  // Salva report su file
  const reportData = {
    timestamp: new Date().toISOString(),
    publicResults,
    privateResults,
    summary: {
      publicIssues,
      privateIssues,
      totalTests,
      totalIssues,
      compliance: parseFloat(compliance),
    },
  };
  
  const reportPath = path.join(__dirname, '..', 'docs', 'technical', 'color-contrast-audit.json');
  fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
  console.log(`\n📄 Report salvato in: ${reportPath}`);
}

// Esegui l'audit
generateReport();