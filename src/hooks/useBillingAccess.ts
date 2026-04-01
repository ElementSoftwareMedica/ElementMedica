import { useAuth } from './auth/useAuth';
import { useTenantAccess } from './useTenantAccess';
import { tenantHasFeature } from '../utils/tenantFeatures';

export function useBillingAccess() {
  const { hasPermission } = useAuth();
  const { currentTenant } = useTenantAccess();

  const hasBillingFeature = tenantHasFeature(currentTenant?.enabledFeatures, 'billing');
  const canReadBilling = hasBillingFeature && hasPermission('billing', 'read');
  const canWriteBilling = hasBillingFeature && hasPermission('billing', 'write');

  return {
    hasBillingFeature,
    canReadBilling,
    canWriteBilling,
    hasBillingAccess: canReadBilling || canWriteBilling
  };
}