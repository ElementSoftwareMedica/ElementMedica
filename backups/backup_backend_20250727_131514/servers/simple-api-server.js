/**
 * Server API Semplificato per Debug
 */

import express from 'express';
import { logger } from '../utils/logger.js';

const app = express();
const port = process.env.API_PORT || 4001;

// Middleware di base
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/healthz', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Route di test
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is working!' });
});

// Gestore errori
app.use((error, req, res, next) => {
  logger.error('Express error handler', {
    error: error.message,
    stack: error.stack
  });
  res.status(500).json({ error: 'Internal server error' });
});

// Gestore 404
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Gestione eccezioni non gestite
process.on('uncaughtException', (error) => {
  console.error('=== UNCAUGHT EXCEPTION ===');
  console.error('Error:', error);
  console.error('Stack:', error.stack);
  console.error('========================');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('=== UNHANDLED REJECTION ===');
  console.error('Reason:', reason);
  console.error('Promise:', promise);
  console.error('=========================');
  process.exit(1);
});

// Avvio server
const server = app.listen(port, () => {
  logger.info('Simple API Server started', {
    port,
    pid: process.pid
  });
  console.log(`Simple API Server running on port ${port}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});