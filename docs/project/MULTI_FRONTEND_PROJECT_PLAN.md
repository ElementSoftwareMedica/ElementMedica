# Multi-Frontend Project Management Plan

## 📊 Executive Summary

**Progetto**: Implementazione Sistema Multi-Frontend Element
**Durata Stimata**: 4-6 settimane
**Team**: 2-3 sviluppatori + 1 DevOps
**Budget**: Medio-Alto (infrastruttura + sviluppo)

**Obiettivi**:
1. Creare frontend separato Element Medica (poliambulatorio)
2. Mantenere frontend Element Formazione esistente
3. Backend condiviso con gestione multi-tenant
4. CMS unificato per gestione contenuti entrambi i brand

## 🎯 Milestones & Timeline

### Phase 1: Foundation & Architecture (Settimana 1-2) ✅ COMPLETATA

#### Week 1: Design System & Brand Configuration
- [x] **Task 1.1**: Setup color palette medical (cyan, green, safety)
  - Durata: 1 giorno
  - Responsabile: Frontend Dev
  - Output: `design-system.css`, `tailwind.config.js`
  
- [x] **Task 1.2**: Create brand configuration system
  - Durata: 2 giorni
  - Responsabile: Senior Dev
  - Output: `brands.config.ts`, `useBrandConfig` hooks
  - Dipendenze: Task 1.1

- [x] **Task 1.3**: Backend brand detection middleware
  - Durata: 2 giorni
  - Responsabile: Backend Dev
  - Output: `brandDetection.js`, API header handling
  - Dipendenze: Task 1.2

#### Week 2: Components & Pages
- [x] **Task 2.1**: Update HeroSection component (medical variant)
  - Durata: 1 giorno
  - Responsabile: Frontend Dev
  - Output: Medical hero with trust badges, patterns

- [x] **Task 2.2**: Create PublicButton medical variant
  - Durata: 4 ore
  - Responsabile: Frontend Dev
  - Output: Button medical styling
  - Dipendenze: Task 1.1

- [x] **Task 2.3**: Redesign MedicinaDelLavoroPage
  - Durata: 2 giorni
  - Responsabile: Frontend Dev
  - Output: Medical-themed page with 6 service cards
  - Dipendenze: Task 2.1, 2.2

- [x] **Task 2.4**: Create Element Medica homepage
  - Durata: 2 giorni
  - Responsabile: Frontend Dev
  - Output: HomePage.elementMedica.tsx
  - Dipendenze: Task 2.1, 2.2

- [x] **Task 2.5**: Update CoursesPage safety badges
  - Durata: 1 giorno
  - Responsabile: Frontend Dev
  - Output: Correct risk level colors + icons

### Phase 2: Backend Multi-Brand Infrastructure (Settimana 2-3) ✅ COMPLETATA

- [x] **Task 3.1**: CMS Multi-Brand Controller
  - Durata: 3 giorni
  - Responsabile: Backend Dev
  - Output: `cmsMultiBrandController.js` with full CRUD
  - Dipendenze: Task 1.3

- [x] **Task 3.2**: CMS Multi-Brand Routes
  - Durata: 1 giorno
  - Responsabile: Backend Dev
  - Output: Routes registered in api-server
  - Dipendenze: Task 3.1

- [x] **Task 3.3**: Public courses brand filtering
  - Durata: 1 giorno
  - Responsabile: Backend Dev
  - Output: Element Medica returns empty courses
  - Dipendenze: Task 1.3

### Phase 3: CMS Integration (Settimana 3-4)

#### Week 3-4: CMS UI & Content Management
- [x] **Task 4.1**: CMS Multi-Brand UI selector
  - Durata: 2 giorni
  - Responsabile: Frontend Dev
  - Output: Brand dropdown in CMSManager
  - Status: ✅ COMPLETATA

- [ ] **Task 4.2**: Brand-specific content filtering
  - Durata: 2 giorni
  - Responsabile: Frontend Dev
  - Output: Filter pages/courses by selected brand
  - Dipendenze: Task 4.1
  - Status: 🔄 IN PROGRESS

- [ ] **Task 4.3**: Brand preview functionality
  - Durata: 1 giorno
  - Responsabile: Frontend Dev
  - Output: Preview button opens correct frontend
  - Dipendenze: Task 4.1

- [ ] **Task 4.4**: Brand statistics dashboard
  - Durata: 2 giorni
  - Responsabile: Full Stack Dev
  - Output: Dashboard showing metrics per brand
  - Dipendenze: Task 3.1

### Phase 4: Deployment & Infrastructure (Settimana 4-5)

- [ ] **Task 5.1**: Environment configuration
  - Durata: 1 giorno
  - Responsabile: DevOps
  - Output: `.env.element-formazione`, `.env.element-medica`

- [ ] **Task 5.2**: Build scripts setup
  - Durata: 1 giorno
  - Responsabile: DevOps
  - Output: `build:formazione`, `build:medica`, `build:all`
  - Dipendenze: Task 5.1

- [ ] **Task 5.3**: Vite configuration for multi-build
  - Durata: 1 giorno
  - Responsabile: Frontend Dev
  - Output: `vite.config.ts` with mode-based builds
  - Dipendenze: Task 5.2

- [ ] **Task 5.4**: Nginx configuration
  - Durata: 2 giorni
  - Responsabile: DevOps
  - Output: Nginx configs for both domains
  - Dipendenze: Task 5.3

- [ ] **Task 5.5**: SSL certificates setup
  - Durata: 4 ore
  - Responsabile: DevOps
  - Output: Certbot SSL for both domains
  - Dipendenze: Task 5.4

- [ ] **Task 5.6**: DNS configuration
  - Durata: 4 ore (+ 24-48h propagation)
  - Responsabile: DevOps
  - Output: A records for both domains

### Phase 5: Database & Tenants (Settimana 5)

- [ ] **Task 6.1**: Create tenant records
  - Durata: 1 giorno
  - Responsabile: Backend Dev
  - Output: SQL migrations for tenants table

- [ ] **Task 6.2**: Migrate existing data to Element Formazione tenant
  - Durata: 2 giorni
  - Responsabile: Backend Dev + DBA
  - Output: All existing data tagged with formazione tenant
  - ⚠️ CRITICAL: Backup before migration

- [ ] **Task 6.3**: Create Element Medica initial data
  - Durata: 1 giorno
  - Responsabile: Backend Dev
  - Output: Base pages, settings for medica tenant

- [ ] **Task 6.4**: Test tenant isolation
  - Durata: 1 giorno
  - Responsabile: QA + Backend Dev
  - Output: Verification that data doesn't leak between tenants

### Phase 6: Testing & QA (Settimana 5-6)

- [ ] **Task 7.1**: Unit tests for brand detection
  - Durata: 2 giorni
  - Responsabile: Backend Dev
  - Output: Jest tests for middleware

- [ ] **Task 7.2**: Integration tests for multi-brand API
  - Durata: 2 giorni
  - Responsabile: Backend Dev
  - Output: API tests for each brand

- [ ] **Task 7.3**: E2E tests for both frontends
  - Durata: 3 giorni
  - Responsabile: QA
  - Output: Playwright tests for formazione + medica

- [ ] **Task 7.4**: Performance testing
  - Durata: 2 giorni
  - Responsabile: DevOps + Frontend Dev
  - Output: Lighthouse reports, load testing results

- [ ] **Task 7.5**: Security audit
  - Durata: 2 giorni
  - Responsabile: Security Specialist
  - Output: Penetration testing report, GDPR compliance check

### Phase 7: Launch & Monitoring (Settimana 6)

- [ ] **Task 8.1**: Staging deployment
  - Durata: 1 giorno
  - Responsabile: DevOps
  - Output: Both sites running on staging

- [ ] **Task 8.2**: User acceptance testing (UAT)
  - Durata: 2 giorni
  - Responsabile: Business + QA
  - Output: Sign-off from stakeholders

- [ ] **Task 8.3**: Production deployment Element Formazione
  - Durata: 4 ore
  - Responsabile: DevOps
  - Output: elementformazione.it live

- [ ] **Task 8.4**: Production deployment Element Medica
  - Durata: 4 ore
  - Responsabile: DevOps
  - Output: elementmedica.it live
  - Dipendenze: Task 8.3

- [ ] **Task 8.5**: Monitoring setup
  - Durata: 1 giorno
  - Responsabile: DevOps
  - Output: Grafana dashboards, alerts configured

- [ ] **Task 8.6**: Documentation finalization
  - Durata: 1 giorno
  - Responsabile: Tech Lead
  - Output: Complete deployment guide, runbooks

## 📋 Deliverables Checklist

### Code Deliverables
- [x] Brand configuration system (`brands.config.ts`)
- [x] Brand detection middleware (`brandDetection.js`)
- [x] CMS multi-brand controller and routes
- [x] Medical color palette and design system
- [x] HeroSection medical variant
- [x] Element Medica homepage
- [x] Updated MedicinaDelLavoroPage
- [x] Safety badges with correct colors
- [x] CMS multi-brand UI selector
- [ ] Build scripts for multi-build
- [ ] Nginx configurations
- [ ] Database migrations
- [ ] Environment files

### Documentation Deliverables
- [x] Multi-Frontend Deployment Guide
- [x] Project Management Plan (questo documento)
- [ ] API Documentation (brand endpoints)
- [ ] User Manual (CMS multi-brand usage)
- [ ] Runbook (operational procedures)
- [ ] Security Documentation (GDPR compliance)

### Infrastructure Deliverables
- [ ] Nginx configurations (2 files)
- [ ] SSL certificates (2 domains)
- [ ] DNS records (2 domains)
- [ ] Monitoring dashboards
- [ ] Backup procedures
- [ ] Disaster recovery plan

## 👥 Team Roles & Responsibilities

### Frontend Developer (Lead)
**Responsabilità**:
- Component development (HeroSection, Buttons, Pages)
- Design system implementation
- CMS UI updates
- React hooks and state management

**Skills Required**:
- React 18+ expertise
- TypeScript proficiency
- Tailwind CSS mastery
- UI/UX best practices

### Backend Developer
**Responsabilità**:
- Brand detection middleware
- Multi-brand API endpoints
- Database migrations
- Tenant isolation logic

**Skills Required**:
- Node.js + Express expertise
- Prisma ORM knowledge
- PostgreSQL/Supabase
- JWT authentication

### DevOps Engineer
**Responsabilità**:
- Server configuration (Nginx)
- SSL/TLS setup
- Build pipeline (CI/CD)
- Monitoring and alerting
- Backup automation

**Skills Required**:
- Linux system administration
- Nginx configuration
- Docker/containerization
- CI/CD tools (GitHub Actions)

### QA Specialist
**Responsabilità**:
- Test plan creation
- E2E test automation (Playwright)
- Performance testing
- UAT coordination

**Skills Required**:
- Playwright/Cypress
- Performance testing tools
- GDPR compliance knowledge

## 📊 Risk Management

### High Priority Risks

#### Risk 1: Tenant Data Leakage
**Probabilità**: Media  
**Impatto**: CRITICO  
**Mitigazione**:
- Extensive testing of tenant isolation
- Code review focus on tenant filtering
- Database-level constraints

**Piano di Contingenza**:
- Immediate rollback capability
- Data audit procedures
- User notification protocol

#### Risk 2: Performance Degradation
**Probabilità**: Media  
**Impatto**: Alto  
**Mitigazione**:
- Load testing before launch
- CDN implementation (Cloudflare)
- Database query optimization
- Caching strategy

**Piano di Contingenza**:
- Horizontal scaling capability
- Database read replicas
- Fallback to single frontend if needed

#### Risk 3: DNS/SSL Issues During Launch
**Probabilità**: Bassa  
**Impatto**: Alto  
**Mitigazione**:
- Test DNS changes in staging
- SSL certificates setup 48h before launch
- Rollback plan documented

**Piano di Contingenza**:
- Revert DNS to previous configuration
- Keep old infrastructure running for 48h

### Medium Priority Risks

#### Risk 4: Build Process Failures
**Probabilità**: Media  
**Impatto**: Medio  
**Mitigazione**:
- Test build scripts thoroughly
- Automated build process
- Clear documentation

#### Risk 5: CMS User Confusion
**Probabilità**: Alta  
**Impatto**: Basso  
**Mitigazione**:
- User training sessions
- Clear UI labeling
- Contextual help in CMS

#### Risk 6: SEO Impact
**Probabilità**: Media  
**Impatto**: Medio  
**Mitigazione**:
- 301 redirects for moved content
- XML sitemaps for both sites
- Google Search Console setup

## 💰 Budget Estimation

### Development Costs
| Item | Hours | Rate (€/h) | Total |
|------|-------|------------|-------|
| Frontend Dev | 120h | 50€ | 6,000€ |
| Backend Dev | 100h | 55€ | 5,500€ |
| DevOps | 60h | 60€ | 3,600€ |
| QA | 50h | 45€ | 2,250€ |
| **Total Development** | | | **17,350€** |

### Infrastructure Costs (Annual)
| Item | Cost/Month | Cost/Year |
|------|------------|-----------|
| Hetzner Server | 50€ | 600€ |
| Supabase Pro | 25€ | 300€ |
| Cloudflare Pro (2 domains) | 40€ | 480€ |
| SSL Certificates | 0€ (Let's Encrypt) | 0€ |
| Monitoring Tools | 20€ | 240€ |
| **Total Infrastructure** | **135€** | **1,620€** |

### One-Time Costs
| Item | Cost |
|------|------|
| Domain Registration (elementmedica.it) | 15€ |
| Initial Setup & Testing | 1,000€ |
| **Total One-Time** | **1,015€** |

**Grand Total**: 17,350€ (dev) + 1,620€ (infra year 1) + 1,015€ (one-time) = **19,985€**

## 📈 Success Metrics (KPIs)

### Technical KPIs
- **Uptime**: > 99.9% per entrambi i siti
- **Page Load Time**: < 3s (desktop), < 5s (mobile)
- **API Response Time**: < 200ms (p95)
- **Zero Tenant Data Leakage**: 100% isolation

### Business KPIs
- **Element Medica Lead Generation**: > 50 lead/mese entro 3 mesi
- **Element Formazione Conversion**: Mantenere o aumentare tasso attuale
- **CMS Usage**: Redattori capaci di gestire entrambi i brand autonomamente
- **SEO Performance**: Nessuna perdita di ranking per Element Formazione

### User Experience KPIs
- **Lighthouse Score**: > 90 per tutti i siti
- **Mobile Usability**: 100% pagine mobile-friendly
- **Accessibility**: WCAG 2.1 AA compliance
- **User Satisfaction**: > 4.5/5 su feedback survey

## 🔄 Change Management

### Communication Plan

#### Stakeholder Updates
- **Weekly**: Progress report to management
- **Bi-weekly**: Demo session con stakeholders
- **Daily**: Standup team dev

#### Documentation Updates
- Update deployment docs after ogni major change
- Maintain changelog (`CHANGELOG.md`)
- Document breaking changes immediately

### Rollback Procedures

#### Frontend Rollback
```bash
# Revert to previous build
cd /var/www/elementmedica
mv dist/medica dist/medica.new
mv dist/medica.backup dist/medica
sudo systemctl reload nginx
```

#### Backend Rollback
```bash
# Revert to previous version
cd /opt/element-backend
git checkout <previous-commit>
pm2 restart element-api
```

#### Database Rollback
```bash
# Restore from backup (entro 24h)
psql element_db < backups/pre-multibrand-$(date +%Y%m%d).sql
```

## 🎓 Training Plan

### CMS Users Training
**Durata**: 2 ore  
**Partecipanti**: Content editors, marketing team

**Agenda**:
1. Introduzione multi-brand (15 min)
2. Brand selector usage (20 min)
3. Creating brand-specific content (30 min)
4. Preview and publish workflow (20 min)
5. Q&A (35 min)

**Materiali**:
- User guide PDF
- Video tutorial (screen recording)
- FAQ document

### Development Team Handover
**Durata**: 4 ore  
**Partecipanti**: Dev team, DevOps

**Agenda**:
1. Architecture overview (30 min)
2. Code walkthrough (60 min)
3. Deployment procedures (45 min)
4. Monitoring and troubleshooting (45 min)
5. Q&A and knowledge transfer (60 min)

## 📅 Launch Day Checklist

### T-7 Days
- [ ] Complete UAT
- [ ] Final security audit
- [ ] Backup all data
- [ ] Freeze code changes

### T-3 Days
- [ ] DNS TTL reduction (to 300s)
- [ ] SSL certificates verified
- [ ] Staging deployment smoke test
- [ ] Stakeholder final approval

### T-1 Day
- [ ] Production deployment dry-run
- [ ] Monitoring alerts configured
- [ ] On-call rotation scheduled
- [ ] Communication plan activated

### Launch Day (T-0)
**09:00** - Team sync, final go/no-go decision  
**10:00** - Deploy Element Formazione updates  
**10:30** - Verify Element Formazione functioning  
**11:00** - Deploy Element Medica  
**11:30** - DNS switch for elementmedica.it  
**12:00** - SSL verification  
**12:30** - Smoke tests both sites  
**13:00** - Monitoring checks  
**14:00** - Public announcement  
**15:00** - Team debrief  
**16:00** - Post-launch monitoring begins

### T+1 Day
- [ ] 24h stability check
- [ ] Review monitoring metrics
- [ ] Address any minor issues
- [ ] Customer feedback collection

### T+1 Week
- [ ] Performance analysis
- [ ] User feedback review
- [ ] Post-launch retrospective
- [ ] Documentation updates

## 🎉 Project Closure

### Final Review Meeting
**Attendees**: Full team + stakeholders  
**Duration**: 2 hours

**Agenda**:
1. Project recap (objectives vs. delivered)
2. Metrics review (KPIs achieved)
3. Lessons learned
4. Recommendations for future
5. Celebration! 🎊

### Knowledge Repository
- [ ] Complete technical documentation
- [ ] Video walkthroughs archived
- [ ] Code repository tagged (v2.0.0-multibrand)
- [ ] Runbooks finalized
- [ ] Incident response procedures documented

### Handover to Operations
- [ ] Monitoring dashboards transferred
- [ ] On-call procedures communicated
- [ ] Support channels established
- [ ] Escalation paths defined

---

## 📞 Contacts & Support

**Project Manager**: [Nome] - [email]  
**Tech Lead**: [Nome] - [email]  
**DevOps Lead**: [Nome] - [email]  
**QA Lead**: [Nome] - [email]

**Emergency Contacts**:
- On-Call Dev: [telefono]
- Infrastructure Issues: [telefono]
- Security Incidents: [telefono]

---

**Document Version**: 1.0  
**Last Updated**: 19 Novembre 2025  
**Next Review**: Post-Launch (T+1 week)  
**Status**: 🟢 IN PROGRESS (Phase 3 completata, Phase 4 da iniziare)
