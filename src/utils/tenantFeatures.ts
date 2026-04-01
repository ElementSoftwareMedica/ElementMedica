const BILLING_FEATURES = [
  'billing',
  'fatturazione',
  'FATTURAZIONE_ELETTRONICA',
  'FATTURAZIONE_PA',
  'FATTURAZIONE_SPLIT_PAYMENT'
];

const MEDICA_FEATURES = [
  'medica',
  'BRANCH_MEDICA',
  'MDL_BASE',
  'MDL_SORVEGLIANZA',
  'MDL_ALLEGATO_3B',
  'MDL_PROTOCOLLI'
];

const FORMAZIONE_FEATURES = [
  'formazione',
  'BRANCH_FORMAZIONE'
];

const REPORTS_FEATURES = [
  'reports',
  'CUSTOM_REPORTS'
];

const FEATURE_GROUPS: Record<string, string[]> = {
  billing: BILLING_FEATURES,
  fatturazione: BILLING_FEATURES,
  medica: MEDICA_FEATURES,
  formazione: FORMAZIONE_FEATURES,
  reports: REPORTS_FEATURES
};

export function expandTenantFeatures(features: string[] | undefined | null): string[] {
  const featureSet = new Set((features || []).filter(Boolean));

  Object.entries(FEATURE_GROUPS).forEach(([alias, group]) => {
    if (group.some(feature => featureSet.has(feature))) {
      group.forEach(feature => featureSet.add(feature));
      featureSet.add(alias);
    }
  });

  return Array.from(featureSet);
}

export function tenantHasFeature(
  features: string[] | undefined | null,
  requiredFeature: string | string[]
): boolean {
  const expandedFeatures = new Set(expandTenantFeatures(features));
  const required = Array.isArray(requiredFeature) ? requiredFeature : [requiredFeature];

  return required.some(feature => {
    const expandedRequired = FEATURE_GROUPS[feature] || [feature];
    return expandedRequired.some(candidate => expandedFeatures.has(candidate));
  });
}

export const TENANT_FEATURE_GROUPS = {
  billing: BILLING_FEATURES,
  medica: MEDICA_FEATURES,
  formazione: FORMAZIONE_FEATURES,
  reports: REPORTS_FEATURES
};