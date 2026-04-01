// =============================================================================
// PM2 Ecosystem Configuration - ElementMedica Production
// =============================================================================
// Server: 128.140.15.15 (Hetzner Cloud)
// API Server: port 4001
// Documents Server: port 4002
// P64: Proxy Server (4003) ELIMINATO
// =============================================================================

module.exports = {
    apps: [
        {
            name: 'api-server',
            script: '/var/www/elementmedica/backend/servers/api-server.js',
            cwd: '/var/www/elementmedica/backend',
            instances: 1,
            exec_mode: 'fork',
            autorestart: true,
            watch: false,
            // Restart if process exceeds 1GB RAM
            max_memory_restart: '1G',
            env: {
                NODE_ENV: 'production',
                API_HOST: '0.0.0.0',
                API_PORT: 4001,
                // Puppeteer/Chromium pool: keep small in production to avoid OOM
                // 1 always-alive instance + up to 3 max under burst PDF load
                PUPPETEER_MIN_BROWSERS: '1',
                PUPPETEER_MAX_BROWSERS: '3',
                PUPPETEER_ACQUIRE_TIMEOUT: '15000',
            },
            error_file: '/var/www/elementmedica/logs/api-error.log',
            out_file: '/var/www/elementmedica/logs/api-out.log',
            merge_logs: true,
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            // Log rotation: cap each log file at 50MB, keep 10 rotations (500MB total max)
            // Requires: pm2 install pm2-logrotate (run once on server)
            // pm2 set pm2-logrotate:max_size 50M
            // pm2 set pm2-logrotate:retain 10
            // pm2 set pm2-logrotate:compress true
            // pm2 set pm2-logrotate:rotateInterval '0 0 * * *'
            // Graceful shutdown
            kill_timeout: 5000,
            listen_timeout: 10000,
        },
        {
            name: 'documents-server',
            script: '/var/www/elementmedica/backend/servers/documents-server.js',
            cwd: '/var/www/elementmedica/backend',
            instances: 1,
            exec_mode: 'fork',
            autorestart: true,
            watch: false,
            // Puppeteer/Chromium is memory-heavy; restart at 512MB to prevent OOM
            max_memory_restart: '512M',
            env: {
                NODE_ENV: 'production',
                DOCUMENTS_HOST: '0.0.0.0',
                DOCUMENTS_PORT: 4002,
            },
            error_file: '/var/www/elementmedica/logs/docs-error.log',
            out_file: '/var/www/elementmedica/logs/docs-out.log',
            merge_logs: true,
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            // Graceful shutdown
            kill_timeout: 5000,
            listen_timeout: 10000,
        },
    ],
};
