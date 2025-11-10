// Types
export type {
  Company,
  Training,
  CompanyConfig,
  DateEntry,
  SpesaAccessoria,
  ScontoApplicato,
  CompanyTotals,
  TipoServizio
} from './types';

// Hooks
export { useCompanyConfig } from './hooks/useCompanyConfig';
export { useFormState } from './hooks/useFormState';
export { usePriceCalculation } from './hooks/usePriceCalculation';
export { useScontoValidation } from './hooks/useScontoValidation';

// Components
export { CompanyList } from './components/CompanyList';
export { CompanyCard } from './components/CompanyCard';
export { FormFields } from './components/FormFields';
export { PriceBreakdown } from './components/PriceBreakdown';

// Utils
export { buildPreventivoNote, getCompanyName } from './utils/preventivoHelpers';
