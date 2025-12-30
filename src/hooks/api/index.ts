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
export { useCreate, useUpdate, useDelete } from './useMutation';
