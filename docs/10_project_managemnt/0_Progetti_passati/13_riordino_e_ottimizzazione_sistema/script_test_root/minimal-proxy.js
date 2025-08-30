import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();
const PORT = 4005;

console.log('Starting minimal proxy server...');

// Proxy middleware per /api/auth
app.use('/api/auth', createProxyMiddleware({
  target: 'http://localhost:4001',
  changeOrigin: true,
  logLevel: 'debug',
  onError: (err, req, res) => {
    console.error('Proxy error:', err.message);
    res.status(502).json({ error: 'Proxy error' });
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log('Proxying request to:', proxyReq.path);
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log('Proxy response status:', proxyRes.statusCode);
  }
}));

// Avvio del server
const server = app.listen(PORT, () => {
  console.log(`Minimal proxy server running on port ${PORT}`);
});

// Log per debugging
server.on('error', (error) => {
  console.error('Server error:', error);
});

console.log('Server setup complete');