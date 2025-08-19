/**
 * Test per verificare il conflitto tra middleware globale e specifico
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const express = require('express');
const request = require('supertest');

import { tenantMiddleware, validateUserTenant } from './middleware/tenant.js';
import enhancedRoleService from './services/enhancedRoleService.js';

const app = express();
app.use(express.json());

// Simula il middleware tenant GLOBALE come nel server reale
app.use(tenantMiddleware);

// Simula il middleware di autenticazione con un token valido
app.use('/api/roles', (req, res, next) => {
  // Simula un utente autenticato
  req.person = {
    id: '687303d0-3c1b-4da7-a739-656199def09d',
    personId: '687303d0-3c1b-4da7-a739-656199def09d',
    email: 'admin@example.com',
    username: 'admin',
    firstName: 'Admin',
    lastName: 'User',
    companyId: null,
    tenantId: '8da03054-c3bf-4ea1-b1bf-bab74db5cf98',
    roles: ['SUPER_ADMIN', 'ADMIN'],
    globalRole: 'Admin',
    permissions: [],
    isVerified: true
  };
  
  next();
});

// Definisci requirePermission come nella route
const requirePermission = (permission) => enhancedRoleService.requirePermission(permission);

// Simula la route esatta con middleware globale + specifico
app.put('/api/roles/:roleType/permissions',
  (req, res, next) => {
    console.log('🔍 BEFORE validateUserTenant middleware');
    console.log('🔍 req.person:', !!req.person);
    console.log('🔍 req.tenant:', !!req.tenant);
    console.log('🔍 req.tenantId:', req.tenantId);
    next();
  },
  validateUserTenant,
  (req, res, next) => {
    console.log('🔍 BEFORE requirePermission middleware');
    console.log('🔍 req.person:', !!req.person);
    console.log('🔍 req.tenant:', !!req.tenant);
    console.log('🔍 req.tenantId:', req.tenantId);
    next();
  },
  requirePermission('roles.manage'),
  (req, res) => {
    console.log('🔍 INSIDE route handler');
    res.json({
      success: true,
      message: 'Route reached successfully',
      roleType: req.params.roleType
    });
  }
);

async function testWithGlobalTenantMiddleware() {
  console.log('🔍 Test With Global Tenant Middleware - Inizio');
  
  try {
    const response = await request(app)
      .put('/api/roles/ADMIN/permissions')
      .set('Host', 'localhost:4001') // Simula l'host del server reale
      .send({
        permissions: {
          users: {
            read: { granted: true, scope: 'global' },
            write: { granted: true, scope: 'global' }
          }
        }
      })
      .expect((res) => {
        console.log('📊 Response status:', res.status);
        console.log('📊 Response body:', res.body);
      });
      
    console.log('✅ Test completato');
    
  } catch (error) {
    console.error('💥 Errore durante il test:', error.message);
    if (error.response) {
      console.error('📊 Response status:', error.response.status);
      console.error('📊 Response body:', error.response.body);
    }
  }
}

// Esegui il test
testWithGlobalTenantMiddleware();