/**
 * useBrandConfig Hook
 * Hook per accedere alla configurazione brand corrente
 */

import { useMemo } from 'react';
import { getCurrentBrand, type BrandConfig } from '../config/brands.config';

export function useBrandConfig(): BrandConfig {
  return useMemo(() => getCurrentBrand(), []);
}

/**
 * useBrandTheme Hook
 * Hook per applicare il tema brand ai componenti
 */
export function useBrandTheme() {
  const brand = useBrandConfig();
  
  return useMemo(() => ({
    theme: brand.theme,
    colors: brand.colors,
    isMedical: brand.theme === 'medical',
    isFormazione: brand.theme === 'formazione',
  }), [brand]);
}

/**
 * useBrandFeatures Hook
 * Hook per verificare features abilitate per il brand
 */
export function useBrandFeatures() {
  const brand = useBrandConfig();
  
  return useMemo(() => ({
    features: brand.features,
    hasFeature: (feature: keyof typeof brand.features) => brand.features[feature],
  }), [brand]);
}
