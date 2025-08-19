/**
 * Test completo che simula la richiesta HTTP reale con tutti i middleware
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Usa require per i moduli che potrebbero non essere ESM
const express = require('express');
const request = require('supertest');

import { validateUserTenant } from './middleware/tenant.js';
import enhancedRoleService from './services/enhancedRoleService.js';

const app = express();
app.use(express.json());

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
  
  // Simula il tenant
  req.tenant = {
    id: '8da03054-c3bf-4ea1-b1bf-bab74db5cf98',
    name: 'Default Tenant',
    slug: 'default'
  };
  req.tenantId = '8da03054-c3bf-4ea1-b1bf-bab74db5cf98';
  
  next();
});

// Definisci requirePermission come nella route
const requirePermission = (permission) => enhancedRoleService.requirePermission(permission);

// Simula la route esatta
app.put('/api/roles/:roleType/permissions',
  (req, res, next) => {
    console.log('🔍 BEFORE validateUserTenant middleware');
    console.log('🔍 req.person:', !!req.person);
    console.log('🔍 req.tenant:', !!req.tenant);
    next();
  },
  validateUserTenant,
  (req, res, next) => {
    console.log('🔍 BEFORE requirePermission middleware');
    console.log('🔍 req.person:', !!req.person);
    console.log('🔍 req.tenant:', !!req.tenant);
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

async function testCompleteFlow() {
  console.log('🔍 Test Complete Flow - Inizio');
  
  try {
    const response = await request(app)
      .put('/api/roles/ADMIN/permissions')
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
      
    console.log('✅ Test completato con successo');
    
  } catch (error) {
    console.error('💥 Errore durante il test:', error.message);
    if (error.response) {
      console.error('📊 Response status:', error.response.status);
      console.error('📊 Response body:', error.response.body);
    }
  }
}

// Esegui il test
testCompleteFlow();