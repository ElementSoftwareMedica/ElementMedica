import express from 'express';

// Aggiungi handler per errori non gestiti
process.on('uncaughtException', (error) => {
  console.error('🚨 UNCAUGHT EXCEPTION:', error);
  console.error('🚨 STACK TRACE:', error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 UNHANDLED REJECTION at:', promise, 'reason:', reason);
  process.exit(1);
});

console.log('🔍 Starting server with error handlers...');

try {
  // Importa il server
  const serverModule = await import('./servers/api-server.js');
  console.log('✅ Server imported successfully');
} catch (error) {
  console.error('❌ Error importing server:', error);
  process.exit(1);
}