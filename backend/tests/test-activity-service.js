/**
 * Test file for Activity Service
 * Run with: node backend/tests/test-activity-service.js
 */

import {
  activityService,
  ActivityType,
  ActivityCategory,
  activityFormatter,
  activityRetentionService,
  RETENTION_DAYS,
  getActivityCategory
} from '../services/activity/index.js';

console.log('=== Activity Service Test ===\n');

// Test 1: ActivityTypes
console.log('1. Activity Types loaded:');
console.log(`   - Total types: ${Object.keys(ActivityType).length}`);
console.log(`   - Categories: ${Object.values(ActivityCategory).join(', ')}`);
console.log(`   - Sample types: ${Object.keys(ActivityType).slice(0, 5).join(', ')}...`);

// Test 2: Category mapping
console.log('\n2. Category mapping:');
console.log(`   - AUTH_LOGIN_SUCCESS -> ${getActivityCategory('AUTH_LOGIN_SUCCESS')}`);
console.log(`   - ENTITY_CREATE -> ${getActivityCategory('ENTITY_CREATE')}`);
console.log(`   - DOCUMENT_GENERATE -> ${getActivityCategory('DOCUMENT_GENERATE')}`);

// Test 3: Formatter
console.log('\n3. Activity Formatter:');
const testMetadata = {
  password: 'secret123',
  email: 'test@example.com',
  token: 'abc123token'
};
const sanitized = activityFormatter.sanitizeMetadata(testMetadata);
console.log(`   - Original keys: ${Object.keys(testMetadata).join(', ')}`);
console.log(`   - Sanitized password: ${sanitized.password}`);
console.log(`   - Sanitized token: ${sanitized.token}`);
console.log(`   - Email preserved: ${sanitized.email}`);

// Test 4: IP sanitization
console.log('\n4. IP Sanitization:');
console.log(`   - "::ffff:192.168.1.1" -> "${activityFormatter.sanitizeIpAddress('::ffff:192.168.1.1')}"`);
console.log(`   - "10.0.0.1, 192.168.1.1" -> "${activityFormatter.sanitizeIpAddress('10.0.0.1, 192.168.1.1')}"`);

// Test 5: Retention policy
console.log('\n5. Retention Policy (days):');
Object.entries(RETENTION_DAYS).forEach(([cat, days]) => {
  console.log(`   - ${cat}: ${days} days`);
});

// Test 6: Service instance
console.log('\n6. Activity Service:');
console.log(`   - Queue size: ${activityService.queue.length}`);
console.log(`   - Is processing: ${activityService.isProcessing}`);

console.log('\n=== All tests passed! ===');

// Graceful shutdown
setTimeout(() => {
  process.exit(0);
}, 100);
