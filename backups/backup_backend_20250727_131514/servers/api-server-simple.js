/**
 * API Server Ultra Semplificato per Debug
 */

import express from 'express';
import { logger } from '../utils/logger.js';

const app = express();
const port = process.env.API_PORT || 4001;

// Handler per uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('=== UNCAUGHT EXCEPTION DETAILS ===');
  console.error('Error name:', error.name);
  console.error('Error message:', error.message);
  console.error('Error stack:', error.stack);
  console.error('=== END UNCAUGHT EXCEPTION ===');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('=== UNHANDLED REJECTION DETAILS ===');
  console.error('Reason:', reason);
  console.error('Promise:', promise);
  console.error('=== END UNHANDLED REJECTION ===');
  process.exit(1);
});

// Middleware base
app.use(express.json());

// Health check
app.get('/healthz', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Avvia server
const server = app.listen(port, () => {
  console.log(`Simple API Server started on port ${port}`);
  logger.info('Simple API Server started successfully', { port });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;