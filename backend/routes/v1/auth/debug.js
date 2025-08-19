/**
 * Debug and Test Routes
 * Development and debugging endpoints for authentication
 */

import express from 'express';
import { authenticate } from '../../../auth/middleware.js';
import logger from '../../../utils/logger.js';
import prisma from '../../../config/prisma-optimization.js';

const router = express.Router();

// Route di test temporanea per debug
router.get('/test-debug', async (req, res) => {
  logger.info('🔍 [TEST DEBUG] Route di test chiamata');
  res.json({
    message: 'Test route funziona',
    timestamp: new Date().toISOString(),
    server: 'api-server.js'
  });
});

// Test permissions endpoint semplificato (senza autenticazione per debug)
router.get('/test-permissions-debug/:personId', async (req, res) => {
  try {
    logger.info('🔍 [TEST PERMISSIONS DEBUG] Endpoint chiamato', {
      personId: req.params.personId
    });
    
    const { personId } = req.params;
    
    logger.info('🔍 [TEST PERMISSIONS] Fetching person from database');
    
    // Simplified query first
    const person = await prisma.person.findUnique({
      where: { id: personId }
    });
    
    if (!person) {
      return res.status(404).json({
        error: 'Person not found',
        code: 'PERSON_NOT_FOUND'
      });
    }
    
    logger.info('🔍 [TEST PERMISSIONS] Person found, fetching roles');
    
    // Fetch roles separately
    const personRoles = await prisma.personRole.findMany({
      where: { personId: personId }
    });
    
    logger.info('🔍 [TEST PERMISSIONS] Roles found', { rolesCount: personRoles.length });
    
    res.json({
      success: true,
      person: {
        id: person.id,
        email: person.email,
        firstName: person.firstName,
        lastName: person.lastName
      },
      roles: personRoles,
      message: 'Test permissions endpoint working'
    });
    
  } catch (error) {
    logger.error('Test permissions failed', {
      error: error.message,
      stack: error.stack,
      action: 'testPermissions',
      personId: req.params.personId
    });
    
    res.status(500).json({
      error: 'Test permissions failed',
      code: 'TEST_PERMISSIONS_FAILED',
      message: error.message
    });
  }
});

// Test endpoint for debugging permissions without auth
router.get('/test-permissions-no-auth/:personId', async (req, res) => {
  try {
    const { personId } = req.params;
    
    console.log('🔍 [TEST] Testing permissions without auth for personId:', personId);
    
    // Simple test to verify the endpoint works
    const testData = {
      success: true,
      message: 'Test endpoint working',
      personId: personId,
      timestamp: new Date().toISOString(),
      serverStatus: 'running'
    };
    
    console.log('🔍 [TEST] Sending response:', testData);
    
    res.json(testData);
  } catch (error) {
    console.error('🔍 [TEST] Error in test endpoint:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Simple test endpoint without parameters
router.get('/test-simple', async (req, res) => {
  try {
    console.log('🔍 [TEST] Simple test endpoint called');
    res.json({
      success: true,
      message: 'Simple test working',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('🔍 [TEST] Error in simple test:', error);
    res.status(500).json({ error: error.message });
  }
});

// Test permissions endpoint without any middleware
router.get('/test-permissions-direct/:personId', async (req, res) => {
  try {
    const { personId } = req.params;
    console.log('🔍 [TEST DIRECT] Testing permissions directly for personId:', personId);
    
    // Return mock permissions data to test if the frontend can receive it
    const mockPermissions = {
      'dashboard.view': true,
      'users.view': true,
      'users.create': true,
      'users.edit': true,
      'users.delete': true,
      'roles.view': true,
      'roles.create': true,
      'roles.edit': true,
      'roles.delete': true,
      'permissions.view': true,
      'permissions.create': true,
      'permissions.edit': true,
      'permissions.delete': true,
      'companies.view': true,
      'companies.create': true,
      'companies.edit': true,
      'companies.delete': true,
      'reports.view': true,
      'reports.create': true,
      'reports.export': true,
      'settings.view': true,
      'settings.edit': true
    };
    
    const response = {
      success: true,
      data: {
        personId: personId,
        role: 'ADMIN',
        permissions: mockPermissions
      }
    };
    
    console.log('🔍 [TEST DIRECT] Sending response:', response);
    res.json(response);
    
  } catch (error) {
    console.error('🔍 [TEST DIRECT] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;