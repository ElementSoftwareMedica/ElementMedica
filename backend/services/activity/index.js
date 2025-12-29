/**
 * Activity Service Module
 * Export pubblici per il sistema di Activity Logging
 * 
 * @module activity
 */

// Core service
export { activityService, ActivityService } from './ActivityService.js';

// Types and categories
export {
  ActivityType,
  ActivityCategory,
  getActivityCategory,
  normalizeResourceName,
  ALWAYS_LOG_ACTIONS,
  SKIP_LOG_ACTIONS,
  RETENTION_DAYS
} from './ActivityTypes.js';

// Formatter
export { activityFormatter, ActivityFormatter } from './ActivityFormatter.js';

// Retention service
export { activityRetentionService, ActivityRetentionService } from './ActivityRetention.js';

// Default export: main service
import activityService from './ActivityService.js';
export default activityService;
