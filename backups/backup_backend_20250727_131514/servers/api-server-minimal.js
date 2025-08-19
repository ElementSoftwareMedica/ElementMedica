/**
 * API Server Minimale per test endpoint permissions
 */

import express from 'express';
import cors from 'cors';

const app = express();
const port = process.env.API_PORT || 4003;

// Middleware base
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Endpoint roles semplificato
app.get('/api/roles', (req, res) => {
  console.log('🔍 ROLES ENDPOINT - Minimal version');
  res.json({
    success: true,
    data: {
      roles: [
        { roleType: 'ADMIN', count: 1, users: [{ id: 1, name: 'Test Admin', email: 'admin@test.com' }] },
        { roleType: 'USER', count: 2, users: [{ id: 2, name: 'Test User', email: 'user@test.com' }] }
      ],
      total: 2
    }
  });
});

// Endpoint permissions semplificato
app.get('/api/roles/permissions', (req, res) => {
  console.log('🔍 PERMISSIONS ENDPOINT - Minimal version');
  res.json({
    success: true,
    data: {
      permissions: {
        'companies': {
          permissions: [
            { key: 'companies.read', name: 'Visualizza aziende', description: 'Permette di visualizzare le aziende' },
            { key: 'companies.create', name: 'Crea aziende', description: 'Permette di creare nuove aziende' },
            { key: 'companies.edit', name: 'Modifica aziende', description: 'Permette di modificare le aziende' },
            { key: 'companies.delete', name: 'Elimina aziende', description: 'Permette di eliminare le aziende' }
          ]
        },
        'users': {
          permissions: [
            { key: 'users.read', name: 'Visualizza utenti', description: 'Permette di visualizzare gli utenti' },
            { key: 'users.create', name: 'Crea utenti', description: 'Permette di creare nuovi utenti' },
            { key: 'users.edit', name: 'Modifica utenti', description: 'Permette di modificare gli utenti' },
            { key: 'users.delete', name: 'Elimina utenti', description: 'Permette di eliminare gli utenti' }
          ]
        },
        'roles': {
          permissions: [
            { key: 'roles.read', name: 'Visualizza ruoli', description: 'Permette di visualizzare i ruoli' },
            { key: 'roles.create', name: 'Crea ruoli', description: 'Permette di creare nuovi ruoli' },
            { key: 'roles.edit', name: 'Modifica ruoli', description: 'Permette di modificare i ruoli' },
            { key: 'roles.delete', name: 'Elimina ruoli', description: 'Permette di eliminare i ruoli' }
          ]
        }
      },
      categories: ['companies', 'users', 'roles'],
      totalPermissions: 12
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Avvio server
app.listen(port, () => {
  console.log(`🚀 API Server Minimale avviato su porta ${port}`);
  console.log(`📍 Health check: http://localhost:${port}/health`);
  console.log(`📍 Roles: http://localhost:${port}/api/roles`);
  console.log(`📍 Permissions: http://localhost:${port}/api/roles/permissions`);
});