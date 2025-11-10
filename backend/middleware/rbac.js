/**
 * RBAC (Role-Based Access Control) Module
 * REFACTORED: Now delegates to RBACService and RBACMiddleware
 * Maintains backward compatibility with existing imports
 * 
 * This file acts as a facade for the refactored RBAC system:
 * - RBACService: Business logic (backend/services/RBACService.js)
 * - RBACMiddleware: Express middleware (backend/middleware/RBACMiddleware.js)
 */

// Export RBACService for business logic
export { RBACService } from '../services/RBACService.js';

// Export all middleware functions
export {
    requirePermissions,
    requireRoles,
    requireCompanyAccess,
    requireOwnership,
    checkHierarchicalPermission,
    rbacMiddleware
} from './RBACMiddleware.js';

// Default export for backward compatibility
import { RBACService } from '../services/RBACService.js';
import * as middleware from './RBACMiddleware.js';

export default {
    RBACService,
    ...middleware
};
