/**
 * API Hooks Index
 * 
 * Export centralizzato degli hooks per API calls
 * 
 * @module hooks/api
 */

export {
    useBranchApiMethods,
    useBranchParams,
    useBranchAwareApiService,
} from './useBranchApi';

export { useEmployees } from './useEmployees';
export { useMutation } from './useMutation';
export { useOptimizedQuery } from './useOptimizedQuery';
export { useQueryData } from './useQueryData';
