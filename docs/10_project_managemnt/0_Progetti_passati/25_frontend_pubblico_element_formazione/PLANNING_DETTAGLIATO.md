# 🚀 Progetto 25: Frontend Pubblico Element Formazione
**Versione 1.0 - Planning Dettagliato**
*Sistema Frontend Pubblico Completo con Gestione Corsi Avanzata*

## 📋 Obiettivi del Progetto

### 🎯 Obiettivi Principali
1. **Estensione Entità Course** - Supporto varianti rischio e tipologie corso
2. **Frontend Pubblico Completo** - Sito web aziendale Element Formazione
3. **Gestione Contenuti Dinamica** - CMS per contenuti pubblici
4. **Sistema Permessi Avanzato** - Controllo accessi granulare
5. **Design System Moderno** - UI/UX professionale con Storybook

### 🔧 Requisiti Tecnici
- **Architettura Modulare** - Componenti riutilizzabili e manutenibili
- **GDPR Compliance** - Conformità normativa completa
- **Performance Ottimizzate** - Caricamento veloce e SEO-friendly
- **Responsive Design** - Compatibilità multi-dispositivo
- **Accessibilità** - Standard WCAG 2.1 AA

## 🗂️ Struttura del Progetto

### 📁 Organizzazione Modulare
```
docs/10_project_managemnt/25_frontend_pubblico_element_formazione/
├── PLANNING_DETTAGLIATO.md           # Questo documento
├── fase_1_analisi_schema/            # Analisi schema Course
├── fase_2_estensione_backend/        # Modifiche backend
├── fase_3_frontend_pubblico/         # Sviluppo frontend pubblico
├── fase_4_cms_gestione/             # Sistema gestione contenuti
├── fase_5_permessi_ruoli/           # Sistema permessi
├── fase_6_design_system/            # Componenti UI/Storybook
├── test/                            # Test e validazioni
├── temp/                            # File temporanei
└── debug/                           # Debug e troubleshooting
```

## ✅ Fase 1: Analisi Schema Course Attuale - COMPLETATA

### 📊 Schema Esteso (IMPLEMENTATO)
```prisma
model Course {
  id              String           @id @default(uuid())
  title           String
  category        String?
  description     String?
  duration        String?
  certifications  String?
  code            String?          @unique
  contents        String?
  maxPeople       Int?
  pricePerPerson  Float?
  regulation      String?
  renewalDuration String?
  validityYears   Int?
  tenantId        String
  status          CourseStatus?    @default(DRAFT)
  
  // ✅ NUOVI CAMPI IMPLEMENTATI
  riskLevel        RiskLevel?       // ALTO, MEDIO, BASSO, A, B, C
  courseType       CourseType?      // PRIMO_CORSO, AGGIORNAMENTO
  subcategory      String?          // Campo futuro per classificazioni
  shortDescription String?          // Descrizione breve per frontend pubblico
  fullDescription  String?          // Descrizione completa per frontend pubblico
  image1Url        String?          // Prima immagine corso
  image2Url        String?          // Seconda immagine corso
  isPublic         Boolean          @default(false) // Visibilità frontend pubblico
  seoTitle         String?          // Titolo SEO
  seoDescription   String?          // Meta description SEO
  slug             String?          @unique // URL-friendly identifier
  
  createdAt       DateTime         @default(now())
  deletedAt       DateTime?
  updatedAt       DateTime         @default(now()) @updatedAt
  tenant          Tenant           @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  schedules       CourseSchedule[]
  
  @@index([isPublic])
  @@index([riskLevel])
  @@index([courseType])
  @@index([slug])
}

// ✅ NUOVI ENUM IMPLEMENTATI
enum RiskLevel {
  ALTO
  MEDIO
  BASSO
  A
  B
  C
}

enum CourseType {
  PRIMO_CORSO
  AGGIORNAMENTO
}
```

### ✅ Risultati Fase 1
- ✅ **Schema Database**: Esteso con successo
- ✅ **Migrazione**: Applicata (`course_enhancement_public_frontend`)
- ✅ **Validazione**: Test funzionali completati
- ✅ **Documentazione**: Completa e aggiornata
- ✅ **Backward Compatibility**: Mantenuta

## 🏗️ Fase 2: Estensione Backend

### 📝 Modifiche Schema Prisma
```prisma
model Course {
  // ... campi esistenti ...
  
  // NUOVI CAMPI
  riskLevel        RiskLevel?       // ALTO, MEDIO, BASSO, A, B, C
  courseType       CourseType?      // PRIMO_CORSO, AGGIORNAMENTO
  subcategory      String?          // Campo futuro
  shortDescription String?          // Descrizione breve per frontend pubblico
  fullDescription  String?          // Descrizione completa per frontend pubblico
  image1Url        String?          // Prima immagine corso
  image2Url        String?          // Seconda immagine corso
  isPublic         Boolean          @default(false) // Visibilità frontend pubblico
  seoTitle         String?          // Titolo SEO
  seoDescription   String?          // Meta description SEO
  slug             String?          @unique // URL-friendly identifier
}

enum RiskLevel {
  ALTO
  MEDIO
  BASSO
  A
  B
  C
}

enum CourseType {
  PRIMO_CORSO
  AGGIORNAMENTO
}
```

### 🔧 Nuovi Endpoint API
```typescript
// GET /api/v1/courses/public - Corsi pubblici
// GET /api/v1/courses/public/:slug - Dettaglio corso pubblico
// POST/PUT/DELETE /api/v1/cms/courses - Gestione contenuti CMS
// GET /api/v1/cms/pages - Configurazione pagine pubbliche
// POST/PUT /api/v1/cms/pages - Aggiornamento contenuti pagine
```

## 🌐 Fase 3: Frontend Pubblico

### 🎨 Struttura Sito Pubblico
```
src/pages/public/
├── HomePage.tsx              # Homepage aziendale
├── CoursesPage.tsx          # Catalogo corsi
├── CourseDetailPage.tsx     # Dettaglio singolo corso
├── ContactPage.tsx          # Contatti e form
├── WorkWithUsPage.tsx       # Lavora con noi
├── ServicesPage.tsx         # Servizi offerti
└── components/
    ├── PublicHeader.tsx     # Header pubblico con menu
    ├── PublicFooter.tsx     # Footer aziendale
    ├── HeroSection.tsx      # Sezione hero homepage
    ├── ServicesGrid.tsx     # Griglia servizi
    ├── CourseCard.tsx       # Card singolo corso
    ├── ContactForm.tsx      # Form contatti
    └── WorkWithUsForm.tsx   # Form candidature
```

### 🧭 Menu Pubblico
```typescript
const publicMenuItems = [
  { label: 'Home', path: '/' },
  { label: 'Corsi', path: '/corsi' },
  { label: 'Servizi', path: '/servizi' },
  { label: 'Lavora con noi', path: '/lavora-con-noi' },
  { label: 'Contatti', path: '/contatti' },
  { label: 'Accedi', path: '/login' }
];
```

### 📱 Responsive Design
- **Mobile First** - Design ottimizzato per dispositivi mobili
- **Breakpoints** - sm: 640px, md: 768px, lg: 1024px, xl: 1280px
- **Touch Friendly** - Elementi interattivi dimensionati correttamente

## 🎛️ Fase 4: CMS Gestione Contenuti

### 📊 Entità CMS
```prisma
model CMSPage {
  id          String    @id @default(uuid())
  slug        String    @unique
  title       String
  content     Json      // Contenuto strutturato
  seoTitle    String?
  seoDescription String?
  isPublished Boolean   @default(false)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  deletedAt   DateTime?
  tenantId    String
  tenant      Tenant    @relation(fields: [tenantId], references: [id])
}

model CMSMedia {
  id        String    @id @default(uuid())
  filename  String
  originalName String
  mimeType  String
  size      Int
  url       String
  alt       String?
  createdAt DateTime  @default(now())
  tenantId  String
  tenant    Tenant    @relation(fields: [tenantId], references: [id])
}
```

### 🖥️ Interfaccia CMS
```typescript
// Pagina CMS nel frontend privato
src/pages/cms/
├── CMSPage.tsx              # Pagina principale CMS
├── PageEditor.tsx           # Editor contenuti pagina
├── MediaLibrary.tsx         # Libreria media
├── CourseContentEditor.tsx  # Editor contenuti corsi
└── components/
    ├── JSONSchemaForm.tsx   # Form dinamico JSON Schema
    ├── ImageUploader.tsx    # Upload con preview
    ├── RichTextEditor.tsx   # Editor testo ricco
    └── PreviewModal.tsx     # Anteprima contenuti
```

### 📋 JSON Schema Form
```typescript
const courseContentSchema = {
  type: "object",
  properties: {
    title: { type: "string", title: "Titolo" },
    shortDescription: { type: "string", title: "Descrizione Breve" },
    fullDescription: { type: "string", title: "Descrizione Completa" },
    image1: { type: "string", format: "uri", title: "Prima Immagine" },
    image2: { type: "string", format: "uri", title: "Seconda Immagine" },
    seoTitle: { type: "string", title: "Titolo SEO" },
    seoDescription: { type: "string", title: "Meta Description" }
  }
};
```

## 🔐 Fase 5: Sistema Permessi

### 🎭 Nuovi Ruoli e Permessi
```typescript
enum PermissionType {
  // ... permessi esistenti ...
  
  // NUOVI PERMESSI CMS
  CMS_VIEW = "CMS_VIEW",
  CMS_EDIT_PAGES = "CMS_EDIT_PAGES",
  CMS_EDIT_COURSES = "CMS_EDIT_COURSES",
  CMS_MANAGE_MEDIA = "CMS_MANAGE_MEDIA",
  CMS_PUBLISH = "CMS_PUBLISH",
  CMS_SEO = "CMS_SEO"
}

const cmsPermissions = [
  {
    name: "Visualizza CMS",
    code: "CMS_VIEW",
    description: "Accesso alla sezione CMS"
  },
  {
    name: "Modifica Pagine",
    code: "CMS_EDIT_PAGES",
    description: "Modifica contenuti pagine pubbliche"
  },
  {
    name: "Modifica Corsi",
    code: "CMS_EDIT_COURSES",
    description: "Modifica contenuti corsi pubblici"
  },
  {
    name: "Gestione Media",
    code: "CMS_MANAGE_MEDIA",
    description: "Upload e gestione immagini"
  },
  {
    name: "Pubblicazione",
    code: "CMS_PUBLISH",
    description: "Pubblicazione contenuti"
  },
  {
    name: "SEO",
    code: "CMS_SEO",
    description: "Gestione metadati SEO"
  }
];
```

### 🛡️ Middleware Autorizzazione
```typescript
// Middleware per proteggere endpoint CMS
const cmsAuthMiddleware = (requiredPermission: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    const hasPermission = await checkUserPermission(user.id, requiredPermission);
    
    if (!hasPermission) {
      return res.status(403).json({ error: 'Permesso negato' });
    }
    
    next();
  };
};
```

## 🎨 Fase 6: Design System e Storybook

### 🧩 Componenti Storybook
```typescript
// Componenti pubblici per Storybook
src/design-system/public/
├── atoms/
│   ├── PublicButton/
│   ├── PublicInput/
│   └── PublicLogo/
├── molecules/
│   ├── CourseCard/
│   ├── ServiceCard/
│   ├── ContactForm/
│   └── NavigationMenu/
├── organisms/
│   ├── PublicHeader/
│   ├── PublicFooter/
│   ├── HeroSection/
│   └── CoursesGrid/
└── templates/
    ├── PublicPageTemplate/
    ├── CoursePageTemplate/
    └── ContactPageTemplate/
```

### 🎭 Storybook Stories
```typescript
// Esempio: CourseCard.stories.tsx
export default {
  title: 'Public/Molecules/CourseCard',
  component: CourseCard,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Card per la visualizzazione dei corsi nel frontend pubblico'
      }
    }
  }
} as Meta<typeof CourseCard>;

export const Default: Story = {
  args: {
    course: {
      title: "Sicurezza sui Luoghi di Lavoro",
      shortDescription: "Corso base per la sicurezza",
      riskLevel: "MEDIO",
      courseType: "PRIMO_CORSO",
      duration: "8 ore",
      image1Url: "/images/corso-sicurezza.jpg"
    }
  }
};
```

### 🎨 Design Tokens
```typescript
// Design tokens per frontend pubblico
export const publicTheme = {
  colors: {
    primary: {
      50: '#eff6ff',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8'
    },
    secondary: {
      50: '#f8fafc',
      500: '#64748b',
      600: '#475569'
    }
  },
  spacing: {
    xs: '0.5rem',
    sm: '1rem',
    md: '1.5rem',
    lg: '2rem',
    xl: '3rem'
  },
  borderRadius: {
    pill: '9999px',
    card: '0.75rem',
    button: '9999px'
  }
};
```

## 🧪 Strategia di Testing

### 🔬 Test Unitari
```typescript
// Test componenti pubblici
describe('CourseCard', () => {
  it('should render course information correctly', () => {
    render(<CourseCard course={mockCourse} />);
    expect(screen.getByText('Sicurezza sui Luoghi di Lavoro')).toBeInTheDocument();
  });
  
  it('should display risk level badge', () => {
    render(<CourseCard course={mockCourse} />);
    expect(screen.getByText('Rischio Medio')).toBeInTheDocument();
  });
});
```

### 🌐 Test End-to-End
```typescript
// Test navigazione frontend pubblico
describe('Public Frontend', () => {
  it('should navigate through public pages', () => {
    cy.visit('/');
    cy.contains('Element Formazione').should('be.visible');
    cy.get('[data-testid="nav-corsi"]').click();
    cy.url().should('include', '/corsi');
    cy.get('[data-testid="course-card"]').should('have.length.greaterThan', 0);
  });
});
```

## 📊 Metriche di Successo

### 🎯 KPI Tecnici
- **Performance**: Lighthouse Score > 90
- **Accessibilità**: WCAG 2.1 AA compliance
- **SEO**: Core Web Vitals ottimizzati
- **Mobile**: Responsive design perfetto

### 📈 KPI Business
- **Conversioni**: Form contatti compilati
- **Engagement**: Tempo permanenza pagine
- **Usabilità**: Bounce rate < 40%
- **Visibilità**: Ranking motori di ricerca

## 🚀 Roadmap Implementazione

### 📅 Timeline Dettagliata

#### Settimana 1: Analisi e Preparazione
- [ ] Analisi schema Course attuale
- [ ] Definizione requisiti dettagliati
- [ ] Setup ambiente sviluppo
- [ ] Creazione branch feature

#### Settimana 2: Backend Extensions
- [ ] Estensione schema Prisma
- [ ] Migrazione database
- [ ] Nuovi endpoint API
- [ ] Test API backend

#### Settimana 3: Frontend Pubblico Base
- [ ] Struttura routing pubblico
- [ ] Componenti base (Header, Footer)
- [ ] Homepage aziendale
- [ ] Pagina corsi base

#### Settimana 4: CMS e Gestione Contenuti
- [ ] Interfaccia CMS privata
- [ ] Form dinamici JSON Schema
- [ ] Upload immagini
- [ ] Sistema preview

#### Settimana 5: Sistema Permessi
- [ ] Nuovi permessi CMS
- [ ] Middleware autorizzazione
- [ ] Interfaccia gestione ruoli
- [ ] Test sicurezza

#### Settimana 6: Design System e Storybook
- [ ] Componenti Storybook
- [ ] Design tokens
- [ ] Documentazione componenti
- [ ] Test visivi

#### Settimana 7: Testing e Ottimizzazione
- [ ] Test end-to-end
- [ ] Ottimizzazione performance
- [ ] Audit accessibilità
- [ ] SEO optimization

#### Settimana 8: Deploy e Documentazione
- [ ] Deploy staging
- [ ] Test produzione
- [ ] Documentazione utente
- [ ] Training team

## 🔧 Configurazioni Tecniche

### 🌐 Routing Pubblico
```typescript
// Configurazione routing pubblico/privato
const publicRoutes = [
  '/',
  '/corsi',
  '/corsi/:slug',
  '/servizi',
  '/contatti',
  '/lavora-con-noi',
  '/login'
];

const privateRoutes = [
  '/dashboard',
  '/cms',
  '/settings',
  // ... altre route private
];
```

### 📦 Bundle Splitting
```typescript
// Configurazione Vite per code splitting
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'public-vendor': ['react', 'react-dom'],
          'private-vendor': ['@tanstack/react-query', 'react-hook-form'],
          'cms': ['@rjsf/core', '@rjsf/utils'],
          'storybook': ['@storybook/react']
        }
      }
    }
  }
});
```

## 🛡️ Sicurezza e GDPR

### 🔒 Misure Sicurezza
- **CSP Headers** - Content Security Policy
- **Rate Limiting** - Protezione endpoint pubblici
- **Input Validation** - Sanitizzazione form pubblici
- **HTTPS Only** - Comunicazioni sicure

### 📋 GDPR Compliance
- **Cookie Policy** - Banner e gestione consensi
- **Privacy Policy** - Informativa privacy
- **Data Minimization** - Raccolta dati essenziali
- **Right to Erasure** - Cancellazione dati utente

## 📚 Documentazione

### 📖 Guide Utente
- **Guida CMS** - Come gestire contenuti
- **Guida Permessi** - Assegnazione ruoli
- **Guida SEO** - Ottimizzazione contenuti
- **Guida Media** - Gestione immagini

### 🔧 Documentazione Tecnica
- **API Reference** - Endpoint e parametri
- **Component Library** - Storybook documentation
- **Deployment Guide** - Procedure deploy
- **Troubleshooting** - Risoluzione problemi

---

## ✅ Checklist Pre-Implementazione

- [ ] **Schema Database** - Progettazione completa
- [ ] **API Design** - Endpoint definiti
- [ ] **UI/UX Design** - Mockup approvati
- [ ] **Permessi Sistema** - Matrice autorizzazioni
- [ ] **Test Strategy** - Piano testing completo
- [ ] **Performance Budget** - Metriche target
- [ ] **SEO Strategy** - Strategia posizionamento
- [ ] **Content Strategy** - Piano contenuti

---

**Nota**: Questo planning segue rigorosamente le regole del progetto e mantiene la compatibilità con l'architettura esistente. Ogni fase sarà implementata con test completi e documentazione aggiornata.