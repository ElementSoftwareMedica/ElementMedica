/**
 * Integration Test for Advanced Route Management System
 * Tests the complete system with all features enabled
 */

import express from 'express';
import request from 'supertest';
import { RouteManager } from './index.js';
import { logger } from '../utils/logger.js';

/**
 * Create a test application with RouteManager
 */
function createTestApp(options = {}) {
  const app = express();
  
  const routeManager = new RouteManager(app, {
    enableMetrics: true,
    enableCaching: true,
    enableQueryOptimization: true,
    enableVersioning: true,
    enableDocumentation: true,
    logLevel: 'error', // Reduce noise during tests
    ...options
  });
  
  return { app, routeManager };
}

/**
 * Test suite for basic functionality
 */
export async function testBasicFunctionality() {
  console.log('🧪 Testing basic functionality...');
  
  const { app, routeManager } = createTestApp();
  
  try {
    // Initialize the route manager
    await routeManager.initialize();
    
    // Add a simple test route
    app.get('/test/basic', (req, res) => {
      res.json({ success: true, message: 'Basic test passed' });
    });
    
    // Test the route
    const response = await request(app)
      .get('/test/basic')
      .expect(200);
    
    if (response.body.success) {
      console.log('✅ Basic functionality test passed');
      return true;
    } else {
      console.log('❌ Basic functionality test failed');
      return false;
    }
  } catch (error) {
    console.log('❌ Basic functionality test failed:', error.message);
    return false;
  }
}

/**
 * Test suite for API versioning
 */
export async function testApiVersioning() {
  console.log('🧪 Testing API versioning...');
  
  const { app, routeManager } = createTestApp({
    enableVersioning: true
  });
  
  try {
    await routeManager.initialize();
    
    // Register API versions
    routeManager.registerApiVersion('v1', {
      description: 'API Version 1.0',
      isDefault: true
    });
    
    routeManager.registerApiVersion('v2', {
      description: 'API Version 2.0'
    });
    
    // Add version-specific routes
    app.get('/api/v1/test', (req, res) => {
      res.json({ version: 'v1', message: 'Version 1 endpoint' });
    });
    
    app.get('/api/v2/test', (req, res) => {
      res.json({ version: 'v2', message: 'Version 2 endpoint' });
    });
    
    // Test v1 endpoint
    const v1Response = await request(app)
      .get('/api/v1/test')
      .expect(200);
    
    // Test v2 endpoint with header
    const v2Response = await request(app)
      .get('/api/v2/test')
      .set('X-API-Version', 'v2')
      .expect(200);
    
    if (v1Response.body.version === 'v1' && v2Response.body.version === 'v2') {
      console.log('✅ API versioning test passed');
      return true;
    } else {
      console.log('❌ API versioning test failed');
      return false;
    }
  } catch (error) {
    console.log('❌ API versioning test failed:', error.message);
    return false;
  }
}

/**
 * Test suite for metrics collection
 */
export async function testMetricsCollection() {
  console.log('🧪 Testing metrics collection...');
  
  const { app, routeManager } = createTestApp({
    enableMetrics: true
  });
  
  try {
    await routeManager.initialize();
    
    // Add test routes
    app.get('/test/fast', (req, res) => {
      res.json({ message: 'Fast response' });
    });
    
    app.get('/test/slow', async (req, res) => {
      await new Promise(resolve => setTimeout(resolve, 100));
      res.json({ message: 'Slow response' });
    });
    
    // Make some requests
    await request(app).get('/test/fast');
    await request(app).get('/test/fast');
    await request(app).get('/test/slow');
    
    // Check metrics
    const metrics = routeManager.getMetrics();
    
    if (metrics.overview.totalRequests >= 3) {
      console.log('✅ Metrics collection test passed');
      console.log(`   Total requests: ${metrics.overview.totalRequests}`);
      console.log(`   Average response time: ${metrics.overview.averageResponseTime}ms`);
      return true;
    } else {
      console.log('❌ Metrics collection test failed');
      return false;
    }
  } catch (error) {
    console.log('❌ Metrics collection test failed:', error.message);
    return false;
  }
}

/**
 * Test suite for validation
 */
export async function testValidation() {
  console.log('🧪 Testing validation...');
  
  const { app, routeManager } = createTestApp();
  
  try {
    await routeManager.initialize();
    
    // Register validation schema
    routeManager.registerValidation('POST:/test/validate', {
      body: {
        name: { required: true, type: 'string', minLength: 2 },
        email: { required: true, type: 'email' }
      }
    });
    
    // Add test route with validation
    app.post('/test/validate', (req, res) => {
      const { name, email } = req.body;
      
      // Simple validation check
      if (!name || name.length < 2) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid name' }
        });
      }
      
      if (!email || !email.includes('@')) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid email' }
        });
      }
      
      res.json({ success: true, data: { name, email } });
    });
    
    // Test valid data
    const validResponse = await request(app)
      .post('/test/validate')
      .send({ name: 'John Doe', email: 'john@example.com' })
      .expect(200);
    
    // Test invalid data
    const invalidResponse = await request(app)
      .post('/test/validate')
      .send({ name: 'J', email: 'invalid-email' })
      .expect(400);
    
    if (validResponse.body.success && !invalidResponse.body.success) {
      console.log('✅ Validation test passed');
      return true;
    } else {
      console.log('❌ Validation test failed');
      return false;
    }
  } catch (error) {
    console.log('❌ Validation test failed:', error.message);
    return false;
  }
}

/**
 * Test suite for error handling
 */
export async function testErrorHandling() {
  console.log('🧪 Testing error handling...');
  
  const { app, routeManager } = createTestApp();
  
  try {
    await routeManager.initialize();
    
    // Add test routes that throw errors
    app.get('/test/error/500', (req, res) => {
      throw new Error('Test server error');
    });
    
    app.get('/test/error/404', (req, res) => {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Resource not found' }
      });
    });
    
    // Test 404 error
    const notFoundResponse = await request(app)
      .get('/test/nonexistent')
      .expect(404);
    
    // Test custom 404
    const customNotFoundResponse = await request(app)
      .get('/test/error/404')
      .expect(404);
    
    if (customNotFoundResponse.body.error?.code === 'NOT_FOUND') {
      console.log('✅ Error handling test passed');
      return true;
    } else {
      console.log('❌ Error handling test failed');
      return false;
    }
  } catch (error) {
    console.log('❌ Error handling test failed:', error.message);
    return false;
  }
}

/**
 * Test suite for documentation endpoints
 */
export async function testDocumentation() {
  console.log('🧪 Testing documentation endpoints...');
  
  const { app, routeManager } = createTestApp({
    enableDocumentation: true
  });
  
  try {
    await routeManager.initialize();
    
    // Test documentation endpoint
    const docsResponse = await request(app)
      .get('/docs')
      .expect(200);
    
    // Test OpenAPI schema endpoint
    const schemaResponse = await request(app)
      .get('/docs/openapi.json')
      .expect(200);
    
    if (schemaResponse.body.openapi) {
      console.log('✅ Documentation test passed');
      return true;
    } else {
      console.log('❌ Documentation test failed');
      return false;
    }
  } catch (error) {
    console.log('❌ Documentation test failed:', error.message);
    return false;
  }
}

/**
 * Test suite for performance monitoring
 */
export async function testPerformanceMonitoring() {
  console.log('🧪 Testing performance monitoring...');
  
  const { app, routeManager } = createTestApp({
    enableMetrics: true,
    slowRequestThreshold: 50
  });
  
  try {
    await routeManager.initialize();
    
    // Add performance test routes
    app.get('/test/performance/fast', (req, res) => {
      res.json({ message: 'Fast endpoint' });
    });
    
    app.get('/test/performance/slow', async (req, res) => {
      await new Promise(resolve => setTimeout(resolve, 100));
      res.json({ message: 'Slow endpoint' });
    });
    
    // Make requests
    await request(app).get('/test/performance/fast');
    await request(app).get('/test/performance/slow');
    
    // Check performance metrics
    const performanceReport = routeManager.generatePerformanceRecommendations();
    const metrics = routeManager.getMetrics();
    
    if (metrics.overview.totalRequests >= 2) {
      console.log('✅ Performance monitoring test passed');
      console.log(`   Recommendations: ${performanceReport.length}`);
      return true;
    } else {
      console.log('❌ Performance monitoring test failed');
      return false;
    }
  } catch (error) {
    console.log('❌ Performance monitoring test failed:', error.message);
    return false;
  }
}

/**
 * Run all integration tests
 */
export async function runAllTests() {
  console.log('🚀 Starting Advanced Route Management System Integration Tests\n');
  
  const tests = [
    { name: 'Basic Functionality', fn: testBasicFunctionality },
    { name: 'API Versioning', fn: testApiVersioning },
    { name: 'Metrics Collection', fn: testMetricsCollection },
    { name: 'Validation', fn: testValidation },
    { name: 'Error Handling', fn: testErrorHandling },
    { name: 'Documentation', fn: testDocumentation },
    { name: 'Performance Monitoring', fn: testPerformanceMonitoring }
  ];
  
  const results = [];
  
  for (const test of tests) {
    try {
      const result = await test.fn();
      results.push({ name: test.name, passed: result });
    } catch (error) {
      console.log(`❌ ${test.name} test failed with error:`, error.message);
      results.push({ name: test.name, passed: false, error: error.message });
    }
    console.log(''); // Add spacing between tests
  }
  
  // Print summary
  console.log('📊 Test Results Summary:');
  console.log('========================');
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  
  results.forEach(result => {
    const status = result.passed ? '✅' : '❌';
    console.log(`${status} ${result.name}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });
  
  console.log(`\n🎯 Overall: ${passed}/${total} tests passed (${Math.round(passed/total*100)}%)`);
  
  if (passed === total) {
    console.log('🎉 All tests passed! The Advanced Route Management System is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Please check the implementation.');
  }
  
  return { passed, total, results };
}

/**
 * Run tests if this file is executed directly
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests()
    .then(({ passed, total }) => {
      process.exit(passed === total ? 0 : 1);
    })
    .catch(error => {
      console.error('Test runner failed:', error);
      process.exit(1);
    });
}

export default {
  runAllTests,
  testBasicFunctionality,
  testApiVersioning,
  testMetricsCollection,
  testValidation,
  testErrorHandling,
  testDocumentation,
  testPerformanceMonitoring
};