import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();
const PORT = 4004;

// Middleware per logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Proxy semplice per /api/auth
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

// Proxy per tutto il resto
app.use('/api', createProxyMiddleware({
  target: 'http://localhost:4001',
  changeOrigin: true,
  logLevel: 'debug'
}));

app.listen(PORT, () => {
  console.log(`Simple proxy server running on port ${PORT}`);
});