# Template Management - Phase 0 Setup Instructions

## Redis Installation

### macOS
```bash
# Install via Homebrew
brew install redis

# Start Redis
brew services start redis

# Verify installation
redis-cli ping
# Should return: PONG
```

### Linux (Ubuntu/Debian)
```bash
# Install
sudo apt-get update
sudo apt-get install redis-server

# Start Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Verify
redis-cli ping
```

### Docker (Alternative)
```bash
# Run Redis in Docker
docker run -d --name redis-template -p 6379:6379 redis:7-alpine

# Verify
docker exec redis-template redis-cli ping
```

## Environment Variables

Create/update `.env` file in backend directory:

```env
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Storage Configuration
STORAGE_MODE=local  # 'local' or 's3'
UPLOAD_PATH=./uploads

# AWS S3 (optional, only if STORAGE_MODE=s3)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=eu-central-1
AWS_S3_BUCKET=

# Puppeteer Configuration
PUPPETEER_MIN_BROWSERS=2
PUPPETEER_MAX_BROWSERS=10
PUPPETEER_ACQUIRE_TIMEOUT=10000
# PUPPETEER_EXECUTABLE_PATH=/path/to/chrome  # optional
```

## Testing Phase 0

### With Redis Running

```bash
cd backend
npm test -- tests/infrastructure.test.js --verbose
```

Expected: All tests should pass (19 tests)

### Without Redis (Limited Tests)

```bash
cd backend
npm test -- tests/infrastructure-minimal.test.js --verbose
```

Expected: Storage and PDF tests pass (10 tests)

## Troubleshooting

### Redis Connection Errors

1. Check Redis is running:
   ```bash
   redis-cli ping
   ```

2. Check port is correct:
   ```bash
   lsof -i :6379
   ```

3. Check Redis logs:
   ```bash
   # macOS
   tail -f /usr/local/var/log/redis.log
   
   # Linux
   tail -f /var/log/redis/redis-server.log
   ```

### Puppeteer Issues

1. **Missing Chrome dependencies (Linux)**:
   ```bash
   sudo apt-get install -y \
     libnss3 libatk1.0-0 libatk-bridge2.0-0 \
     libcups2 libdrm2 libxkbcommon0 libxcomposite1 \
     libxdamage1 libxrandr2 libgbm1 libasound2
   ```

2. **Permission issues**:
   ```bash
   # Add execute permission
   chmod +x node_modules/puppeteer/.local-chromium/*/chrome-linux/chrome
   ```

3. **Memory issues**:
   - Reduce MAX_BROWSERS in .env
   - Add swap space on server

### Storage Issues

1. **Permission denied**:
   ```bash
   # Fix permissions
   chmod 755 uploads
   chown -R $USER uploads
   ```

2. **S3 connection issues**:
   - Verify AWS credentials
   - Check bucket exists and has correct permissions
   - Verify region is correct

## Production Deployment

### Hetzner + Supabase Configuration

1. **Redis on Hetzner**:
   ```bash
   # Install Redis on Hetzner server
   sudo apt-get install redis-server
   
   # Configure for production
   sudo nano /etc/redis/redis.conf
   # Set: bind 0.0.0.0
   # Set: requirepass YOUR_STRONG_PASSWORD
   # Set: maxmemory 512mb
   # Set: maxmemory-policy allkeys-lru
   
   # Restart
   sudo systemctl restart redis-server
   ```

2. **Environment variables**:
   ```env
   REDIS_HOST=127.0.0.1
   REDIS_PORT=6379
   REDIS_PASSWORD=YOUR_STRONG_PASSWORD
   REDIS_DB=0
   
   STORAGE_MODE=s3
   AWS_S3_BUCKET=elementmedica-documents
   AWS_REGION=eu-central-1
   ```

3. **Firewall configuration**:
   ```bash
   # Allow Redis port only from localhost
   sudo ufw allow from 127.0.0.1 to any port 6379
   ```

## Next Steps

After Phase 0 setup is complete and tests pass:

1. ✅ Phase 0 complete
2. → Proceed to Phase 1: Database Migration
3. → See `05_DATABASE_SCHEMA.md` for Prisma schema changes

---

**Document**: Phase 0 Setup  
**Last Updated**: 4 Novembre 2025  
**Status**: 🟡 Redis installation required
