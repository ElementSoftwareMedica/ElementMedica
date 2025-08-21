module.exports = {
  apps: [
    {
      name: 'api-server',
      script: './src/api-server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development',
        PORT: 4001
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 4001,
        DATABASE_URL: process.env.DATABASE_URL,
        DIRECT_URL: process.env.DIRECT_URL,
        JWT_SECRET: process.env.JWT_SECRET,
        OAUTH_CLIENT_ID: process.env.OAUTH_CLIENT_ID,
        OAUTH_CLIENT_SECRET: process.env.OAUTH_CLIENT_SECRET,
        OAUTH_REDIRECT_URI: process.env.OAUTH_REDIRECT_URI
      },
      error_file: '/var/log/pm2/api-server-error.log',
      out_file: '/var/log/pm2/api-server-out.log',
      log_file: '/var/log/pm2/api-server.log',
      max_memory_restart: '500M'
    },
    {
      name: 'documents-server',
      script: './src/documents-server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development',
        PORT: 4002
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 4002,
        DATABASE_URL: process.env.DATABASE_URL,
        DIRECT_URL: process.env.DIRECT_URL
      },
      error_file: '/var/log/pm2/documents-server-error.log',
      out_file: '/var/log/pm2/documents-server-out.log',
      log_file: '/var/log/pm2/documents-server.log',
      max_memory_restart: '300M'
    },
    {
      name: 'proxy-server',
      script: './src/proxy-server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development',
        PORT: 4003
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 4003,
        API_SERVER_URL: 'http://localhost:4001',
        DOCUMENTS_SERVER_URL: 'http://localhost:4002',
        FRONTEND_URL: 'https://elementformazione.com'
      },
      error_file: '/var/log/pm2/proxy-server-error.log',
      out_file: '/var/log/pm2/proxy-server-out.log',
      log_file: '/var/log/pm2/proxy-server.log',
      max_memory_restart: '200M'
    }
  ],

  deploy: {
    production: {
      user: 'root',
      host: '128.140.15.15',
      ref: 'origin/deployment/hetzner-final-clean',
      repo: 'git@github.com:ElementSoftwareMedica/ElementMedica.git',
      path: '/var/www/elementformazione',
      'pre-deploy-local': '',
      'post-deploy': 'npm ci --production && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};