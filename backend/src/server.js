import express from 'express';

const app = express();
const HOST = process.env.MAIN_HOST || '0.0.0.0';
const PORT = Number(process.env.MAIN_PORT || 3001);

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'main', timestamp: new Date().toISOString() });
});

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).send('Main service up');
});

const server = app.listen(PORT, HOST, () => {
  console.log(`Main server listening on http://${HOST}:${PORT}`);
});

// Graceful shutdown
const shutdown = (signal) => {
  console.log(`Received ${signal}, shutting down gracefully...`);
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
  // Force exit if not closed within timeout
  setTimeout(() => {
    console.error('Force exit after timeout');
    process.exit(1);
  }, 10000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));