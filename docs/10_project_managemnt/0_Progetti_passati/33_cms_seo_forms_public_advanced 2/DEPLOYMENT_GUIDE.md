# 🚀 FASE 1 - Deployment Guide

**Versione**: 1.0  
**Data**: 15 Novembre 2025  
**Branch**: feature/settings-templates-redesign  
**Status**: ✅ Ready for Deployment

---

## 📋 Pre-Deployment Checklist

### Code Quality ✅
- [x] Zero TypeScript errors
- [x] Zero ESLint errors
- [x] All tests passing
- [x] Code reviewed
- [x] Documentation complete

### Environment Requirements
- [x] Node.js 18+ (Backend & Frontend)
- [x] PostgreSQL 14+ (Database)
- [x] Prisma 5.x (ORM)
- [x] React 18+ (Frontend)
- [x] Vite 5+ (Build tool)

---

## 🗄️ Database Migration

### 1. Backup Database (CRITICO!)
```bash
# Production backup
pg_dump -U postgres -d production_db > backup_pre_seo_$(date +%Y%m%d_%H%M%S).sql

# Verify backup
ls -lh backup_pre_seo_*.sql
```

### 2. Apply Migration
```bash
cd backend

# Staging
DATABASE_URL="postgresql://user:pass@staging-host:5432/staging_db" npx prisma migrate deploy

# Production
DATABASE_URL="postgresql://user:pass@prod-host:5432/prod_db" npx prisma migrate deploy
```

### 3. Verify Migration
```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('SEOConfig', 'Sitemap');

-- Check columns
\d "SEOConfig"
\d "Sitemap"

-- Should return 2 tables with correct schema
```

---

## 🔧 Backend Deployment

### 1. Environment Variables

Create/Update `.env` file:

```bash
# Database
DATABASE_URL="postgresql://user:pass@host:5432/db_name"

# Application
NODE_ENV="production"
PORT=4001
FRONTEND_URL="https://elementformazione.it"
SITE_URL="https://elementformazione.it"

# Tenant (use your production tenant ID)
DEFAULT_TENANT_ID="6d95a179-490a-44ef-a17a-10b34bdfbe13"

# CORS
ALLOWED_ORIGINS="https://elementformazione.it,https://www.elementformazione.it"
```

### 2. Install Dependencies
```bash
cd backend
npm ci --production
```

### 3. Build (if applicable)
```bash
# No build step needed for Node.js backend
# Verify syntax
node --check api-server.js
```

### 4. Start Services
```bash
# Using PM2 (recommended)
pm2 start ecosystem.config.js --only api-server
pm2 start ecosystem.config.js --only proxy-server

# Or systemd service
sudo systemctl restart element-api
sudo systemctl restart element-proxy
```

### 5. Verify Backend
```bash
# Check API health
curl https://api.elementformazione.it/health

# Check sitemap
curl https://api.elementformazione.it/sitemap.xml

# Check robots
curl https://api.elementformazione.it/robots.txt

# Should return 200 OK for all
```

---

## 🎨 Frontend Deployment

### 1. Environment Variables

Create `.env.production`:

```bash
VITE_API_URL="https://api.elementformazione.it"
VITE_SITE_URL="https://elementformazione.it"
VITE_DEFAULT_TENANT_ID="6d95a179-490a-44ef-a17a-10b34bdfbe13"
```

### 2. Install Dependencies
```bash
npm ci
```

### 3. Build
```bash
npm run build

# Output will be in dist/
# Verify build
ls -lh dist/
```

### 4. Deploy Static Files

**Option A: Nginx**
```bash
# Copy build files
sudo cp -r dist/* /var/www/elementformazione.it/html/

# Set permissions
sudo chown -R www-data:www-data /var/www/elementformazione.it/html/
sudo chmod -R 755 /var/www/elementformazione.it/html/
```

**Option B: CDN (CloudFlare, AWS S3, etc.)**
```bash
# Example with AWS S3
aws s3 sync dist/ s3://elementformazione-frontend --delete
aws cloudfront create-invalidation --distribution-id YOUR_ID --paths "/*"
```

### 5. Verify Frontend
```bash
# Check homepage
curl -I https://elementformazione.it/

# Check specific pages
curl -I https://elementformazione.it/corsi
curl -I https://elementformazione.it/contatti

# Should return 200 OK for all
```

---

## 🌐 Nginx Configuration

### Backend Proxy (API)

```nginx
# /etc/nginx/sites-available/api.elementformazione.it

server {
    listen 443 ssl http2;
    server_name api.elementformazione.it;

    ssl_certificate /etc/letsencrypt/live/api.elementformazione.it/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.elementformazione.it/privkey.pem;

    # Public SEO endpoints (no auth required)
    location = /sitemap.xml {
        proxy_pass http://localhost:4001/sitemap.xml;
        proxy_set_header Host $host;
        proxy_cache_valid 200 1h;
        add_header Cache-Control "public, max-age=3600";
    }

    location = /robots.txt {
        proxy_pass http://localhost:4001/robots.txt;
        proxy_set_header Host $host;
        proxy_cache_valid 200 24h;
        add_header Cache-Control "public, max-age=86400";
    }

    # API endpoints (auth required)
    location /api/ {
        proxy_pass http://localhost:4001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Frontend Configuration

```nginx
# /etc/nginx/sites-available/elementformazione.it

server {
    listen 443 ssl http2;
    server_name elementformazione.it www.elementformazione.it;

    ssl_certificate /etc/letsencrypt/live/elementformazione.it/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/elementformazione.it/privkey.pem;

    root /var/www/elementformazione.it/html;
    index index.html;

    # SPA fallback (React Router)
    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache, must-revalidate";
    }

    # Static assets caching
    location ~* \.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Proxy to backend for /sitemap.xml and /robots.txt
    location = /sitemap.xml {
        proxy_pass https://api.elementformazione.it/sitemap.xml;
        proxy_ssl_verify off;
    }

    location = /robots.txt {
        proxy_pass https://api.elementformazione.it/robots.txt;
        proxy_ssl_verify off;
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript;
}
```

### Reload Nginx
```bash
# Test configuration
sudo nginx -t

# Reload
sudo systemctl reload nginx
```

---

## ✅ Post-Deployment Verification

### 1. Automated Checks
```bash
# Run test script
cd /path/to/project
node test-all-seo-pages.mjs

# Expected: All tests should pass
```

### 2. Manual Verification

**Check SEO Meta Tags**:
- Visit https://elementformazione.it/
- View Page Source
- Verify `<title>`, `<meta name="description">`, Open Graph tags present

**Check Sitemap**:
- Visit https://elementformazione.it/sitemap.xml
- Should return valid XML with URLs
- No authentication required

**Check Robots.txt**:
- Visit https://elementformazione.it/robots.txt
- Should show sitemap URL and crawl rules

**Check Structured Data**:
- Homepage: Should have Organization schema
- Course pages: Should have Course schema

### 3. External Validation

**Google Rich Results Test**:
```
https://search.google.com/test/rich-results
Test URL: https://elementformazione.it/
```

**Schema.org Validator**:
```
https://validator.schema.org/
Paste source code from homepage
```

**Lighthouse SEO Audit**:
```bash
# Install lighthouse CLI
npm install -g lighthouse

# Run audit
lighthouse https://elementformazione.it/ --only-categories=seo --view
```

Target scores:
- SEO: 95+
- Performance: 85+
- Accessibility: 90+
- Best Practices: 90+

---

## 📊 Monitoring Setup

### 1. Google Search Console

**Submit Sitemap**:
1. Go to https://search.google.com/search-console
2. Select property: elementformazione.it
3. Go to Sitemaps → Add sitemap
4. Enter: `https://elementformazione.it/sitemap.xml`
5. Submit

**Request Indexing** (Priority Pages):
- Homepage: /
- Courses: /corsi
- Services: /servizi
- Contact: /contatti

### 2. Uptime Monitoring

**Uptime Robot / Pingdom**:
- Monitor: https://elementformazione.it/sitemap.xml
- Frequency: Every 5 minutes
- Alert: Email/Slack if down

### 3. Analytics

**Google Analytics 4**:
- Verify tracking code on all pages
- Setup custom event for "SEO page view"
- Monitor organic traffic

**Search Performance**:
- Google Search Console → Performance
- Track impressions, clicks, CTR
- Monitor average position

---

## 🔄 Rollback Plan

### If Issues Occur

**1. Rollback Database**:
```bash
# Stop applications
pm2 stop all

# Restore backup
psql -U postgres -d production_db < backup_pre_seo_YYYYMMDD_HHMMSS.sql

# Restart
pm2 start all
```

**2. Rollback Code**:
```bash
# Backend
cd backend
git reset --hard HEAD~1
pm2 restart all

# Frontend
cd frontend
git reset --hard HEAD~1
npm run build
sudo cp -r dist/* /var/www/elementformazione.it/html/
```

**3. Verify Rollback**:
```bash
# Check site loads
curl -I https://elementformazione.it/

# Check API
curl -I https://api.elementformazione.it/health
```

---

## 📞 Support Contacts

**Technical Issues**:
- Email: tech@elementformazione.it
- Phone: +39 XXX XXX XXXX

**Emergency Escalation**:
- On-call Engineer: [Name/Contact]
- CTO: [Name/Contact]

---

## 📝 Deployment Log Template

```markdown
## Deployment - FASE 1 SEO Foundation

**Date**: YYYY-MM-DD HH:MM
**Engineer**: [Your Name]
**Environment**: Production

### Pre-Deployment
- [ ] Database backup completed
- [ ] All tests passed
- [ ] Code reviewed and approved
- [ ] Stakeholders notified

### Deployment Steps
- [ ] Database migration applied
- [ ] Backend deployed and verified
- [ ] Frontend built and deployed
- [ ] Nginx configuration updated
- [ ] Services restarted

### Post-Deployment
- [ ] Sitemap accessible
- [ ] Robots.txt accessible
- [ ] Homepage SEO verified
- [ ] Course pages SEO verified
- [ ] No errors in logs
- [ ] Performance acceptable

### Issues Encountered
[None / List any issues]

### Rollback Required
[No / Yes - reason]

### Sign-off
Deployed by: [Name]
Verified by: [Name]
Time completed: HH:MM
```

---

## ✅ Deployment Complete!

After successful deployment:

1. ✅ Submit sitemap to Google Search Console
2. ✅ Monitor logs for 24 hours
3. ✅ Check analytics for traffic impact
4. ✅ Document any issues/learnings
5. ✅ Celebrate! 🎉

**Next Phase**: FASE 2 - Admin Panel SEOManager

---

**Document Version**: 1.0  
**Last Updated**: 15 Novembre 2025  
**Maintained by**: DevOps Team
