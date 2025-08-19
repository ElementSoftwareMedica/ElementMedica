import express from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();
const port = 4003;

// CORS configuration
const corsOptions = {
  origin: [
    'http://localhost:5173',
    'http://localhost:5174', 
    'http://localhost:5175',
    'http://localhost:5176'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID']
};

app.use(cors(corsOptions));

// Health check
app.get('/healthz', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'proxy-server',
    timestamp: new Date().toISOString() 
  });
});

// Proxy middleware per API
const apiProxy = createProxyMiddleware({
  target: 'http://localhost:4001',
  changeOrigin: true,
  onError: (err, req, res) => {
    console.error('❌ Proxy error:', err.message);
    res.status(500).json({ 
      error: 'Proxy error', 
      message: err.message,
      target: 'http://localhost:4001'
    });
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log(`🔄 Proxying: ${req.method} ${req.url} -> http://localhost:4001${req.url}`);
  }
});

// Applica proxy per tutte le route /api
app.use('/api', apiProxy);

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
  console.log(`✅ Simple proxy server running on http://localhost:${port}`);
  console.log(`Health check: http://localhost:${port}/healthz`);
  console.log(`Proxying /api/* to http://localhost:4001`);
});

// Gestione errori
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection:', reason);
  process.exit(1);
});