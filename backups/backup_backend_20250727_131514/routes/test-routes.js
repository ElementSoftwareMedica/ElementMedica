/**
 * Test Routes for Advanced Route Management System
 * Provides comprehensive testing endpoints for all features
 */

import express from 'express';
import { logger } from '../utils/logger.js';

const router = express.Router();

/**
 * @swagger
 * /test/basic:
 *   get:
 *     tags: [Testing]
 *     summary: Basic test endpoint
 *     description: Simple endpoint to test basic routing functionality
 *     responses:
 *       200:
 *         description: Test successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Basic test endpoint working"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.get('/basic', (req, res) => {
  logger.info('Basic test endpoint accessed', {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    component: 'test-routes'
  });
  
  res.json({
    success: true,
    message: 'Basic test endpoint working',
    timestamp: new Date().toISOString(),
    version: req.apiVersion?.resolved || 'unknown'
  });
});

/**
 * @swagger
 * /test/slow:
 *   get:
 *     tags: [Testing]
 *     summary: Slow response test
 *     description: Endpoint that simulates slow response for performance testing
 *     parameters:
 *       - name: delay
 *         in: query
 *         description: Delay in milliseconds
 *         schema:
 *           type: integer
 *           minimum: 0
 *           maximum: 10000
 *           default: 2000
 *     responses:
 *       200:
 *         description: Slow response completed
 */
router.get('/slow', async (req, res) => {
  const delay = Math.min(parseInt(req.query.delay) || 2000, 10000);
  
  logger.info('Slow test endpoint accessed', {
    delay,
    component: 'test-routes'
  });
  
  await new Promise(resolve => setTimeout(resolve, delay));
  
  res.json({
    success: true,
    message: `Slow response completed after ${delay}ms`,
    delay,
    timestamp: new Date().toISOString()
  });
});

/**
 * @swagger
 * /test/error:
 *   get:
 *     tags: [Testing]
 *     summary: Error simulation test
 *     description: Endpoint that simulates various types of errors
 *     parameters:
 *       - name: type
 *         in: query
 *         description: Type of error to simulate
 *         schema:
 *           type: string
 *           enum: [validation, server, timeout, auth]
 *           default: server
 *       - name: code
 *         in: query
 *         description: HTTP status code to return
 *         schema:
 *           type: integer
 *           minimum: 400
 *           maximum: 599
 *           default: 500
 *     responses:
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication error
 *       408:
 *         description: Timeout error
 *       500:
 *         description: Server error
 */
router.get('/error', (req, res) => {
  const errorType = req.query.type || 'server';
  const statusCode = parseInt(req.query.code) || 500;
  
  logger.warn('Error test endpoint accessed', {
    errorType,
    statusCode,
    component: 'test-routes'
  });
  
  const errorResponses = {
    validation: {
      code: 'VALIDATION_ERROR',
      message: 'Test validation error',
      details: {
        field: 'testField',
        reason: 'Test validation failure'
      }
    },
    server: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Test server error',
      details: 'Simulated internal server error for testing'
    },
    timeout: {
      code: 'REQUEST_TIMEOUT',
      message: 'Test timeout error',
      details: 'Simulated request timeout for testing'
    },
    auth: {
      code: 'UNAUTHORIZED',
      message: 'Test authentication error',
      details: 'Simulated authentication failure for testing'
    }
  };
  
  const errorResponse = errorResponses[errorType] || errorResponses.server;
  
  res.status(statusCode).json({
    success: false,
    error: errorResponse,
    timestamp: new Date().toISOString()
  });
});

/**
 * @swagger
 * /test/cache:
 *   get:
 *     tags: [Testing]
 *     summary: Cache test endpoint
 *     description: Endpoint to test caching functionality
 *     parameters:
 *       - name: key
 *         in: query
 *         description: Cache key identifier
 *         schema:
 *           type: string
 *           default: default
 *       - name: ttl
 *         in: query
 *         description: Time to live in seconds
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 3600
 *           default: 300
 *     responses:
 *       200:
 *         description: Cache test response
 */
router.get('/cache', (req, res) => {
  const cacheKey = req.query.key || 'default';
  const ttl = parseInt(req.query.ttl) || 300;
  
  logger.info('Cache test endpoint accessed', {
    cacheKey,
    ttl,
    component: 'test-routes'
  });
  
  // Set cache headers for testing
  res.set({
    'Cache-Control': `public, max-age=${ttl}`,
    'ETag': `"test-${cacheKey}-${Date.now()}"`
  });
  
  res.json({
    success: true,
    message: 'Cache test endpoint',
    cacheKey,
    ttl,
    timestamp: new Date().toISOString(),
    data: {
      randomValue: Math.random(),
      serverTime: Date.now()
    }
  });
});

/**
 * @swagger
 * /test/query-optimization:
 *   get:
 *     tags: [Testing]
 *     summary: Query optimization test
 *     description: Endpoint to test query optimization features
 *     parameters:
 *       - name: page
 *         in: query
 *         description: Page number
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - name: limit
 *         in: query
 *         description: Items per page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *       - name: search
 *         in: query
 *         description: Search term
 *         schema:
 *           type: string
 *       - name: sort
 *         in: query
 *         description: Sort field
 *         schema:
 *           type: string
 *           enum: [name, date, id]
 *           default: id
 *       - name: order
 *         in: query
 *         description: Sort order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *     responses:
 *       200:
 *         description: Query optimization test results
 */
router.get('/query-optimization', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 10, 100);
  const search = req.query.search || '';
  const sort = req.query.sort || 'id';
  const order = req.query.order || 'asc';
  
  logger.info('Query optimization test accessed', {
    page,
    limit,
    search,
    sort,
    order,
    component: 'test-routes'
  });
  
  // Simulate query optimization analysis
  const queryAnalysis = {
    estimatedRows: 1000,
    actualRows: limit,
    executionTime: Math.random() * 100,
    indexesUsed: ['idx_test_' + sort],
    optimizationSuggestions: [
      search ? 'Consider full-text search index for better search performance' : null,
      limit > 50 ? 'Large page size may impact performance' : null
    ].filter(Boolean)
  };
  
  // Generate mock data
  const data = Array.from({ length: limit }, (_, i) => ({
    id: (page - 1) * limit + i + 1,
    name: `Test Item ${(page - 1) * limit + i + 1}`,
    date: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
    value: Math.random() * 1000
  }));
  
  // Apply search filter
  const filteredData = search 
    ? data.filter(item => item.name.toLowerCase().includes(search.toLowerCase()))
    : data;
  
  // Apply sorting
  filteredData.sort((a, b) => {
    const aVal = a[sort];
    const bVal = b[sort];
    const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    return order === 'desc' ? -comparison : comparison;
  });
  
  res.json({
    success: true,
    data: filteredData,
    pagination: {
      page,
      limit,
      total: 1000,
      pages: Math.ceil(1000 / limit)
    },
    queryAnalysis,
    timestamp: new Date().toISOString()
  });
});

/**
 * @swagger
 * /test/versioning:
 *   get:
 *     tags: [Testing]
 *     summary: API versioning test
 *     description: Endpoint to test API versioning functionality
 *     responses:
 *       200:
 *         description: Versioning test response
 */
router.get('/versioning', (req, res) => {
  const apiVersion = req.apiVersion?.resolved || 'unknown';
  const requestedVersion = req.apiVersion?.requested || 'none';
  
  logger.info('Versioning test endpoint accessed', {
    apiVersion,
    requestedVersion,
    component: 'test-routes'
  });
  
  const versionSpecificData = {
    v1: {
      message: 'This is API version 1.0',
      features: ['basic-crud', 'authentication'],
      deprecated: false
    },
    v2: {
      message: 'This is API version 2.0',
      features: ['basic-crud', 'authentication', 'bulk-operations', 'advanced-search'],
      deprecated: false,
      enhancements: ['Improved response format', 'Better error handling']
    },
    'v0.9': {
      message: 'This is legacy API version 0.9',
      features: ['basic-crud'],
      deprecated: true,
      deprecationNotice: 'This version will be sunset on 2024-06-01'
    }
  };
  
  const responseData = versionSpecificData[apiVersion] || {
    message: 'Unknown API version',
    features: [],
    deprecated: false
  };
  
  res.json({
    success: true,
    version: {
      resolved: apiVersion,
      requested: requestedVersion,
      ...responseData
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * @swagger
 * /test/metrics:
 *   get:
 *     tags: [Testing]
 *     summary: Metrics collection test
 *     description: Endpoint to test metrics collection functionality
 *     responses:
 *       200:
 *         description: Metrics test response
 */
router.get('/metrics', (req, res) => {
  logger.info('Metrics test endpoint accessed', {
    component: 'test-routes'
  });
  
  // Simulate some processing time for metrics
  const processingStart = Date.now();
  
  // Mock some operations
  const operations = [
    'database-query',
    'cache-lookup',
    'external-api-call',
    'data-processing'
  ];
  
  const operationMetrics = operations.map(op => ({
    operation: op,
    duration: Math.random() * 50,
    success: Math.random() > 0.1 // 90% success rate
  }));
  
  const processingTime = Date.now() - processingStart;
  
  res.json({
    success: true,
    message: 'Metrics test completed',
    processingTime,
    operations: operationMetrics,
    systemInfo: {
      nodeVersion: process.version,
      platform: process.platform,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage()
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * @swagger
 * /test/validation:
 *   post:
 *     tags: [Testing]
 *     summary: Validation test endpoint
 *     description: Endpoint to test input validation functionality
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *               email:
 *                 type: string
 *                 format: email
 *               age:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 150
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *             required: [name, email]
 *     responses:
 *       200:
 *         description: Validation successful
 *       400:
 *         description: Validation failed
 */
router.post('/validation', (req, res) => {
  const { name, email, age, tags } = req.body;
  
  logger.info('Validation test endpoint accessed', {
    hasName: !!name,
    hasEmail: !!email,
    hasAge: !!age,
    hasTags: !!tags,
    component: 'test-routes'
  });
  
  const errors = [];
  
  // Validate name
  if (!name) {
    errors.push({ field: 'name', message: 'Name is required' });
  } else if (name.length < 2) {
    errors.push({ field: 'name', message: 'Name must be at least 2 characters' });
  } else if (name.length > 50) {
    errors.push({ field: 'name', message: 'Name must be less than 50 characters' });
  }
  
  // Validate email
  if (!email) {
    errors.push({ field: 'email', message: 'Email is required' });
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push({ field: 'email', message: 'Invalid email format' });
  }
  
  // Validate age (optional)
  if (age !== undefined) {
    if (!Number.isInteger(age) || age < 0 || age > 150) {
      errors.push({ field: 'age', message: 'Age must be an integer between 0 and 150' });
    }
  }
  
  // Validate tags (optional)
  if (tags !== undefined) {
    if (!Array.isArray(tags)) {
      errors.push({ field: 'tags', message: 'Tags must be an array' });
    } else if (tags.some(tag => typeof tag !== 'string')) {
      errors.push({ field: 'tags', message: 'All tags must be strings' });
    }
  }
  
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Input validation failed',
        details: errors
      },
      timestamp: new Date().toISOString()
    });
  }
  
  res.json({
    success: true,
    message: 'Validation successful',
    data: {
      name,
      email,
      age,
      tags
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * @swagger
 * /test/health:
 *   get:
 *     tags: [Testing]
 *     summary: Health check test
 *     description: Comprehensive health check endpoint
 *     responses:
 *       200:
 *         description: System healthy
 *       503:
 *         description: System unhealthy
 */
router.get('/health', async (req, res) => {
  logger.info('Health check test accessed', {
    component: 'test-routes'
  });
  
  const checks = {
    server: {
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    },
    memory: {
      status: 'healthy',
      usage: process.memoryUsage(),
      threshold: 1024 * 1024 * 1024 // 1GB
    },
    database: {
      status: 'healthy', // Mock - would check actual DB connection
      responseTime: Math.random() * 50
    },
    cache: {
      status: 'healthy', // Mock - would check Redis connection
      responseTime: Math.random() * 10
    }
  };
  
  // Simulate some health check failures occasionally
  if (Math.random() < 0.1) { // 10% chance of database issue
    checks.database.status = 'unhealthy';
    checks.database.error = 'Connection timeout';
  }
  
  if (Math.random() < 0.05) { // 5% chance of cache issue
    checks.cache.status = 'unhealthy';
    checks.cache.error = 'Redis connection failed';
  }
  
  // Check memory usage
  const memoryUsage = checks.memory.usage.heapUsed;
  if (memoryUsage > checks.memory.threshold) {
    checks.memory.status = 'warning';
    checks.memory.message = 'High memory usage detected';
  }
  
  const overallStatus = Object.values(checks).every(check => check.status === 'healthy') 
    ? 'healthy' 
    : 'unhealthy';
  
  const statusCode = overallStatus === 'healthy' ? 200 : 503;
  
  res.status(statusCode).json({
    success: overallStatus === 'healthy',
    status: overallStatus,
    checks,
    timestamp: new Date().toISOString()
  });
});

export default router;