/**
 * Test semplice per verificare se i body parser funzionano
 */

import express from 'express';
import bodyParser from 'body-parser';

const app = express();
const port = 4005;

// Applica i body parser direttamente
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Middleware di debug
app.use((req, res, next) => {
  console.log('=== BODY PARSER TEST ===');
  console.log('Method:', req.method);
  console.log('Path:', req.path);
  console.log('Content-Type:', req.get('Content-Type'));
  console.log('Content-Length:', req.get('Content-Length'));
  console.log('Has Body:', !!req.body);
  console.log('Body Keys:', req.body ? Object.keys(req.body) : []);
  console.log('Body Content:', req.body);
  console.log('========================');
  next();
});

// Route di test
app.post('/test-login', (req, res) => {
  console.log('🔍 [TEST LOGIN] Body received:', req.body);
  
  if (!req.body || !req.body.identifier || !req.body.password) {
    return res.status(400).json({
      error: 'Missing credentials',
      received: req.body
    });
  }
  
  res.json({
    success: true,
    message: 'Body parser working correctly',
    received: req.body
  });
});

app.listen(port, () => {
  console.log(`🚀 Body parser test server running on port ${port}`);
  console.log(`Test with: curl -X POST http://localhost:${port}/test-login -H "Content-Type: application/json" -d '{"identifier":"test","password":"test123"}'`);
});