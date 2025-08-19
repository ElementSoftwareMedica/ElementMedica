import express from 'express';
import cors from 'cors';

const app = express();
const port = 4001;

// Middleware di base
app.use(cors());
app.use(express.json());

// Route di test
app.get('/healthz', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/roles/hierarchy', (req, res) => {
  res.json({ 
    message: 'Test endpoint working',
    roles: [],
    timestamp: new Date().toISOString()
  });
});

app.get('/api/roles/hierarchy/current-user', (req, res) => {
  res.json({ 
    message: 'Test current user endpoint working',
    userRoles: [],
    timestamp: new Date().toISOString()
  });
});

// Avvio server
app.listen(port, () => {
  console.log(`✅ Simple test server running on http://localhost:${port}`);
  console.log(`Health check: http://localhost:${port}/healthz`);
  console.log(`Roles endpoint: http://localhost:${port}/api/roles/hierarchy`);
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