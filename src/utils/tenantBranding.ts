type TenantLike = {
  name?: string | null;
  settings?: Record<string, unknown> | string | null;
};

type BranchBranding = {
  name?: string;
  displayName?: string;
  title?: string;
  logo?: string;
  logoUrl?: string;
};

type ParsedSettings = {
  name?: string;
  displayName?: string;
  logo?: string;
  logoUrl?: string;
  branches?: Record<string, BranchBranding | undefined>;
};

function getBrandBranchKey(brandId?: string): string {
  return brandId === 'element-medica' ? 'MEDICA' : 'FORMAZIONE';
}

function pickNonEmptyString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string') {
      const normalizedValue = value.trim();
      if (normalizedValue.length > 0) {
        return normalizedValue;
      }
    }
  }

  return null;
}

function getBranchBranding(settings: ParsedSettings, branchKey: string): BranchBranding | null {
  const branches = settings.branches;
  if (!branches || typeof branches !== 'object') {
    return null;
  }

  const directMatch = branches[branchKey];
  if (directMatch && typeof directMatch === 'object') {
    return directMatch;
  }

  const normalizedBranchKey = branchKey.toLowerCase();
  const alternativeKey = Object.keys(branches).find(
    key => key.toLowerCase() === normalizedBranchKey
  );

  if (!alternativeKey) {
    return null;
  }

  const branchValue = branches[alternativeKey];
  return branchValue && typeof branchValue === 'object' ? branchValue : null;
}

export function parseTenantSettings(settings: TenantLike['settings']): ParsedSettings {
  if (!settings) {
    return {};
  }

  try {
    return typeof settings === 'string'
      ? JSON.parse(settings) as ParsedSettings
      : settings as ParsedSettings;
  } catch {
    return {};
  }
}

export function getTenantBranding(
  tenant: TenantLike | null | undefined,
  brandId?: string,
  fallbackName?: string,
  fallbackLogo?: string | null
): { displayName: string; logoUrl: string | null; branchKey: string } {
  const branchKey = getBrandBranchKey(brandId);
  const settings = parseTenantSettings(tenant?.settings);
  const branchBranding = getBranchBranding(settings, branchKey);

  const branchDisplayName = pickNonEmptyString(
    branchBranding?.name,
    branchBranding?.displayName,
    branchBranding?.title
  );
  const tenantDisplayName = pickNonEmptyString(tenant?.name);
  const settingsDisplayName = pickNonEmptyString(settings.displayName, settings.name);

  // Branch-specific branding wins when configured, fallback to tenant-level/default brand.
  const branchLogo = pickNonEmptyString(branchBranding?.logo, branchBranding?.logoUrl);
  const tenantLogo = pickNonEmptyString(settings.logoUrl, settings.logo);

  const result = {
    displayName: branchDisplayName || tenantDisplayName || settingsDisplayName || fallbackName || 'Management',
    logoUrl: branchLogo || tenantLogo || pickNonEmptyString(fallbackLogo) || null,
    branchKey
  };

  if (import.meta.env.DEV && tenant) {
    console.debug('[tenantBranding]', {
      tenantName: tenant.name,
      brandId,
      branchKey,
      hasBranches: !!settings.branches,
      branchBranding: branchBranding ? { name: branchBranding.name, logo: branchBranding.logo } : null,
      result: { displayName: result.displayName, logoUrl: result.logoUrl },
    });
  }

  return result;
}