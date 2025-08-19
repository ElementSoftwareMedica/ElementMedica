// ElementMedica 2.0 - PM2 Startup Configuration
// Ottimizzato per server con 2GB RAM
// Budget target: €4.78/mese

module.exports = {
  apps: [
    {
      // API Server - Core business logic
      name: 'elementmedica-api',
      script: './backend/servers/api-server.js',
      instances: 1, // Single instance per startup
      exec_mode: 'fork',
      
      // Environment
      env: {
        NODE_ENV: 'production',
        PORT: 4001,
        
        // Database
        DATABASE_URL: process.env.DATABASE_URL,
        SUPABASE_URL: process.env.SUPABASE_URL,
        SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
        SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY,
        
        // JWT
        JWT_SECRET: process.env.JWT_SECRET,
        JWT_EXPIRES_IN: '24h',
        REFRESH_TOKEN_EXPIRES_IN: '7d',
        
        // Redis
        REDIS_URL: 'redis://localhost:6379',
        
        // Logging
        LOG_LEVEL: 'info',
        LOG_FILE: './logs/api.log',
        
        // Performance
        UV_THREADPOOL_SIZE: 4,
        NODE_OPTIONS: '--max-old-space-size=256'
      },
      
      // Resource limits
      max_memory_restart: '256M',
      
      // Logging
      log_file: './logs/api-combined.log',
      out_file: './logs/api-out.log',
      error_file: './logs/api-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // Monitoring
      min_uptime: '10s',
      max_restarts: 5,
      
      // Auto restart
      autorestart: true,
      watch: false, // Disabilitato in produzione
      
      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 3000,
      
      // Health check
      health_check_url: 'http://localhost:4001/api/health',
      health_check_grace_period: 3000
    },
    
    {
      // Proxy Server - Routing e CORS
      name: 'elementmedica-proxy',
      script: './backend/servers/proxy-server.js',
      instances: 1, // Single instance per startup
      exec_mode: 'fork',
      
      // Environment
      env: {
        NODE_ENV: 'production',
        PORT: 4003,
        
        // API Server
        API_SERVER_URL: 'http://localhost:4001',
        
        // CORS
        FRONTEND_URL: process.env.FRONTEND_URL || 'https://elementmedica.com',
        CORS_ORIGIN: process.env.CORS_ORIGIN || 'https://elementmedica.com',
        
        // Rate limiting
        RATE_LIMIT_WINDOW_MS: 900000, // 15 minuti
        RATE_LIMIT_MAX_REQUESTS: 100,
        
        // Logging
        LOG_LEVEL: 'info',
        LOG_FILE: './logs/proxy.log',
        
        // Performance
        NODE_OPTIONS: '--max-old-space-size=128'
      },
      
      // Resource limits
      max_memory_restart: '128M',
      
      // Logging
      log_file: './logs/proxy-combined.log',
      out_file: './logs/proxy-out.log',
      error_file: './logs/proxy-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // Monitoring
      min_uptime: '10s',
      max_restarts: 5,
      
      // Auto restart
      autorestart: true,
      watch: false,
      
      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 3000,
      
      // Health check
      health_check_url: 'http://localhost:4003/health',
      health_check_grace_period: 3000,
      
      // Dipendenze
      wait_ready: true,
      listen_timeout: 10000
    },
    
    {
      // Documents Server - Generazione PDF (opzionale per startup)
      name: 'elementmedica-documents',
      script: './backend/servers/documents-server.js',
      instances: 1,
      exec_mode: 'fork',
      
      // Environment
      env: {
        NODE_ENV: 'production',
        PORT: 4002,
        
        // API Server
        API_SERVER_URL: 'http://localhost:4001',
        
        // Storage
        UPLOAD_DIR: './uploads',
        TEMP_DIR: './temp',
        
        // Logging
        LOG_LEVEL: 'info',
        LOG_FILE: './logs/documents.log',
        
        // Performance
        NODE_OPTIONS: '--max-old-space-size=128'
      },
      
      // Resource limits
      max_memory_restart: '128M',
      
      // Logging
      log_file: './logs/documents-combined.log',
      out_file: './logs/documents-out.log',
      error_file: './logs/documents-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // Monitoring
      min_uptime: '10s',
      max_restarts: 3,
      
      // Auto restart
      autorestart: true,
      watch: false,
      
      // Graceful shutdown
      kill_timeout: 10000, // PDF generation può richiedere più tempo
      listen_timeout: 3000,
      
      // Health check
      health_check_url: 'http://localhost:4002/health',
      health_check_grace_period: 5000,
      
      // Disabilitato di default per startup (risparmio risorse)
      autorestart: false,
      
      // Avvio solo se necessario
      // Per avviare: pm2 start ecosystem.startup.config.js --only elementmedica-documents
      ignore_watch: ['node_modules', 'logs', 'temp', 'uploads']
    }
  ],
  
  // Configurazione deploy
  deploy: {
    // Produzione startup
    startup: {
      user: 'elementmedica',
      host: ['elementmedica.com'],
      ref: 'origin/main',
      repo: 'git@github.com:elementmedica/elementmedica-2.0.git',
      path: '/home/elementmedica/app',
      
      // Pre-deploy
      'pre-deploy-local': '',
      'pre-deploy': 'git fetch --all',
      
      // Deploy
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.startup.config.js --env startup && pm2 save',
      
      // Environment
      env: {
        NODE_ENV: 'production'
      }
    },
    
    // Staging per test
    staging: {
      user: 'elementmedica',
      host: ['staging.elementmedica.com'],
      ref: 'origin/develop',
      repo: 'git@github.com:elementmedica/elementmedica-2.0.git',
      path: '/home/elementmedica/staging',
      
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.startup.config.js --env staging && pm2 save',
      
      env: {
        NODE_ENV: 'staging'
      }
    }
  },
  
  // Configurazione monitoring
  monitoring: {
    // Metriche PM2
    pmx: true,
    
    // Network monitoring
    network: true,
    
    // Port monitoring
    ports: true,
    
    // Custom metrics
    custom_probes: [
      {
        name: 'Memory Usage',
        probe: function() {
          return process.memoryUsage().heapUsed;
        }
      },
      {
        name: 'CPU Usage',
        probe: function() {
          return process.cpuUsage();
        }
      }
    ]
  }
};

// Configurazione per diversi ambienti
if (process.env.NODE_ENV === 'development') {
  // Development: più logging, watch abilitato
  module.exports.apps.forEach(app => {
    app.watch = true;
    app.ignore_watch = ['node_modules', 'logs', '*.log'];
    app.env.LOG_LEVEL = 'debug';
  });
}

if (process.env.NODE_ENV === 'staging') {
  // Staging: configurazione intermedia
  module.exports.apps.forEach(app => {
    app.instances = 1;
    app.max_memory_restart = app.max_memory_restart.replace('M', '') * 1.5 + 'M';
  });
}

if (process.env.ENABLE_CLUSTERING === 'true') {
  // Clustering per server più potenti
  module.exports.apps[0].instances = 'max'; // API Server
  module.exports.apps[0].exec_mode = 'cluster';
  module.exports.apps[0].max_memory_restart = '512M';
}

// Utility functions
const utils = {
  // Restart graceful di tutti i servizi
  restartAll: () => {
    console.log('🔄 Restarting all ElementMedica services...');
    // pm2 restart ecosystem.startup.config.js
  },
  
  // Health check di tutti i servizi
  healthCheck: () => {
    console.log('🏥 Checking health of all services...');
    // Implementare health check
  },
  
  // Backup prima del deploy
  backup: () => {
    console.log('💾 Creating backup before deploy...');
    // Implementare backup
  }
};

module.exports.utils = utils;

// Export per testing
if (process.env.NODE_ENV === 'test') {
  module.exports.test = {
    apps: module.exports.apps.map(app => ({
      ...app,
      instances: 1,
      autorestart: false,
      max_restarts: 0
    }))
  };
}