# 🔧 Specifiche Tecniche - Nuova Architettura Project 2.0

## 🏗️ Architettura Target

### Overview Sistema Futuro

```
┌─────────────────────────────────────────────────────────────┐
│                    Load Balancer / CDN                     │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────┴───────────────────────────────────────┐
│                  API Gateway                                │
│              (Rate Limiting, Auth)                          │
└─────────────────────┬───────────────────────────────────────┘
                      │
    ┌─────────────────┼─────────────────┐
    │                 │                 │
┌───▼────┐    ┌──────▼──────┐    ┌─────▼─────┐
│Frontend│    │ Auth Service│    │API Service│
│(React) │    │   (JWT)     │    │(Express)  │
│:5173   │    │   :4001     │    │  :4002    │
└────────┘    └─────────────┘    └───────────┘
                      │                 │
              ┌───────┼─────────────────┼───────┐
              │       │                 │       │
        ┌─────▼──┐ ┌──▼──┐        ┌────▼───┐ ┌─▼──┐
        │Document│ │Cache│        │Database│ │File│
        │Service │ │Redis│        │Postgres│ │Store│
        │ :4003  │ │:6379│        │ :5432  │ │S3  │
        └────────┘ └─────┘        └────────┘ └────┘
```

## 🎯 Stack Tecnologico

### Frontend
- **Framework:** React 18 + TypeScript
- **Build Tool:** Vite 5
- **Styling:** Tailwind CSS + CSS Modules
- **State Management:** Zustand + React Query
- **Routing:** React Router v6
- **Testing:** Vitest + Testing Library + Playwright
- **Linting:** ESLint + Prettier + Husky

### Backend
- **Runtime:** Node.js 20 LTS
- **Framework:** Express.js + TypeScript
- **Database:** PostgreSQL + Prisma ORM
- **Cache:** Redis
- **Authentication:** JWT + Refresh Tokens
- **File Storage:** AWS S3 / MinIO
- **Testing:** Jest + Supertest
- **Documentation:** Swagger/OpenAPI

### DevOps & Infrastructure
- **Containerization:** Docker + Docker Compose
- **CI/CD:** GitHub Actions
- **Monitoring:** Prometheus + Grafana
- **Logging:** Winston + ELK Stack
- **Deployment:** PM2 / Kubernetes

## 📱 Frontend Architecture

### Component Architecture

```
src/
├── app/                    # App configuration
│   ├── store/             # Global state (Zustand)
│   ├── router/            # Routing configuration
│   └── providers/         # Context providers
├── shared/                # Shared utilities
│   ├── components/        # Reusable components
│   ├── hooks/            # Custom hooks
│   ├── utils/            # Utility functions
│   ├── types/            # TypeScript types
│   └── constants/        # App constants
├── features/              # Feature-based modules
│   ├── auth/             # Authentication
│   ├── companies/        # Company management
│   ├── employees/        # Employee management
│   ├── courses/          # Course management
│   ├── trainers/         # Trainer management
│   └── admin/            # Admin features
├── pages/                 # Page components
└── assets/               # Static assets
```

### Design System

#### Component Library Structure
```typescript
// Atomic Design Pattern
components/
├── atoms/              # Basic building blocks
│   ├── Button/
│   ├── Input/
│   ├── Label/
│   └── Icon/
├── molecules/          # Simple combinations
│   ├── FormField/
│   ├── SearchBox/
│   └── Card/
├── organisms/          # Complex components
│   ├── Header/
│   ├── Sidebar/
│   ├── DataTable/
│   └── Modal/
└── templates/          # Page layouts
    ├── DashboardLayout/
    ├── AuthLayout/
    └── PublicLayout/
```

#### Theme System
```typescript
// Design tokens
interface Theme {
  colors: {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    error: string;
    neutral: Record<string, string>;
  };
  typography: {
    fontFamily: string;
    fontSize: Record<string, string>;
    fontWeight: Record<string, number>;
  };
  spacing: Record<string, string>;
  breakpoints: Record<string, string>;
  shadows: Record<string, string>;
  borderRadius: Record<string, string>;
}
```

### State Management Strategy

#### Global State (Zustand)
```typescript
interface AppState {
  // User state
  user: User | null;
  permissions: Permission[];
  preferences: UserPreferences;
  
  // UI state
  theme: 'light' | 'dark';
  sidebar: { isOpen: boolean };
  notifications: Notification[];
  
  // App state
  loading: boolean;
  error: string | null;
}
```

#### Server State (React Query)
```typescript
// Query keys factory
const queryKeys = {
  companies: ['companies'] as const,
  company: (id: string) => ['companies', id] as const,
  employees: (filters: EmployeeFilters) => ['employees', filters] as const,
  courses: (params: CourseParams) => ['courses', params] as const,
};
```

## 🔧 Backend Architecture

### Microservices Structure

#### Auth Service (Port 4001)
```typescript
// Responsibilities
- User authentication
- JWT token management
- Role-based access control
- Session management
- Password reset
- GDPR consent tracking
```

#### API Service (Port 4002)
```typescript
// Responsibilities
- Business logic
- CRUD operations
- Data validation
- Business rules enforcement
- Audit logging
- Notification triggers
```

#### Document Service (Port 4003)
```typescript
// Responsibilities
- File upload/download
- Document generation
- Template management
- Google Docs integration
- File compression
- Virus scanning
```

### Database Schema Evolution

#### User Management Tables
```sql
-- Enhanced user system
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role_id UUID REFERENCES roles(id),
  company_id UUID REFERENCES companies(id),
  is_active BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  permissions JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  refresh_token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### GDPR Compliance Tables
```sql
CREATE TABLE gdpr_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  consent_type VARCHAR(100) NOT NULL,
  granted BOOLEAN NOT NULL,
  granted_at TIMESTAMP,
  withdrawn_at TIMESTAMP,
  ip_address INET,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100),
  resource_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### User Preferences
```sql
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  preferences JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### API Design Standards

#### RESTful API Structure
```typescript
// Base API structure
interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    pagination?: PaginationMeta;
    timestamp: string;
    version: string;
  };
}

// Pagination
interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}
```

#### Authentication Flow
```typescript
// JWT Payload
interface JWTPayload {
  sub: string;        // user ID
  email: string;
  role: string;
  permissions: string[];
  company_id?: string;
  iat: number;
  exp: number;
}

// Refresh Token Flow
POST /auth/login
→ { access_token, refresh_token }

POST /auth/refresh
→ { access_token }

POST /auth/logout
→ { success: true }
```

## 🔒 Security Specifications

### Authentication & Authorization

#### Role-Based Access Control (RBAC)
```typescript
interface Permission {
  resource: string;    // 'companies', 'employees', etc.
  action: string;      // 'create', 'read', 'update', 'delete'
  conditions?: any;    // Additional conditions
}

interface Role {
  id: string;
  name: string;
  permissions: Permission[];
}

// Predefined roles
const ROLES = {
  SUPER_ADMIN: 'super_admin',
  COMPANY_ADMIN: 'company_admin',
  HR_MANAGER: 'hr_manager',
  TRAINER: 'trainer',
  EMPLOYEE: 'employee'
} as const;
```

#### Security Middleware
```typescript
// Rate limiting
const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});

// Input validation
const validateInput = (schema: Joi.Schema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message
        }
      });
    }
    next();
  };
};
```

### GDPR Compliance

#### Data Processing Principles
```typescript
interface GDPRCompliance {
  // Right to be informed
  privacyPolicy: string;
  dataProcessingPurpose: string;
  
  // Right of access
  dataExport: () => Promise<UserData>;
  
  // Right to rectification
  dataUpdate: (data: Partial<UserData>) => Promise<void>;
  
  // Right to erasure
  dataDelete: () => Promise<void>;
  
  // Right to restrict processing
  restrictProcessing: (restrict: boolean) => Promise<void>;
  
  // Right to data portability
  exportData: (format: 'json' | 'csv') => Promise<Buffer>;
}
```

## 📊 Performance Specifications

### Frontend Performance Targets
- **First Contentful Paint:** < 1.5s
- **Largest Contentful Paint:** < 2.5s
- **Cumulative Layout Shift:** < 0.1
- **First Input Delay:** < 100ms
- **Bundle Size:** < 1MB (gzipped)

### Backend Performance Targets
- **API Response Time:** < 200ms (95th percentile)
- **Database Query Time:** < 50ms (average)
- **Throughput:** > 1000 req/sec
- **Uptime:** 99.9%
- **Memory Usage:** < 512MB per service

### Optimization Strategies

#### Frontend
```typescript
// Code splitting
const LazyComponent = lazy(() => import('./Component'));

// Memoization
const MemoizedComponent = memo(Component);

// Virtual scrolling for large lists
const VirtualizedList = ({ items }) => {
  return (
    <FixedSizeList
      height={600}
      itemCount={items.length}
      itemSize={50}
    >
      {({ index, style }) => (
        <div style={style}>
          {items[index]}
        </div>
      )}
    </FixedSizeList>
  );
};
```

#### Backend
```typescript
// Database optimization
const optimizedQuery = async () => {
  return await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      profile: {
        select: {
          firstName: true,
          lastName: true
        }
      }
    },
    where: {
      isActive: true
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 20,
    skip: page * 20
  });
};

// Caching strategy
const getCachedData = async (key: string) => {
  const cached = await redis.get(key);
  if (cached) {
    return JSON.parse(cached);
  }
  
  const data = await fetchFromDatabase();
  await redis.setex(key, 300, JSON.stringify(data)); // 5 min cache
  return data;
};
```

## 🧪 Testing Strategy

### Frontend Testing
```typescript
// Unit tests
describe('Button Component', () => {
  it('should render with correct text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });
});

// Integration tests
describe('User Login Flow', () => {
  it('should login user successfully', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /login/i }));
    
    expect(await screen.findByText(/welcome/i)).toBeInTheDocument();
  });
});

// E2E tests
test('complete user journey', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[data-testid="email"]', 'admin@example.com');
  await page.fill('[data-testid="password"]', 'password123');
  await page.click('[data-testid="login-button"]');
  
  await expect(page).toHaveURL('/dashboard');
  await expect(page.locator('h1')).toContainText('Dashboard');
});
```

### Backend Testing
```typescript
// Unit tests
describe('UserService', () => {
  it('should create user with valid data', async () => {
    const userData = {
      email: 'test@example.com',
      password: 'password123',
      firstName: 'John',
      lastName: 'Doe'
    };
    
    const user = await userService.create(userData);
    
    expect(user.email).toBe(userData.email);
    expect(user.password).not.toBe(userData.password); // Should be hashed
  });
});

// Integration tests
describe('POST /api/users', () => {
  it('should create user and return 201', async () => {
    const response = await request(app)
      .post('/api/users')
      .send({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe'
      })
      .expect(201);
    
    expect(response.body.success).toBe(true);
    expect(response.body.data.email).toBe('test@example.com');
  });
});
```

## 📈 Monitoring & Observability

### Metrics Collection
```typescript
// Application metrics
interface AppMetrics {
  // Performance
  responseTime: number;
  throughput: number;
  errorRate: number;
  
  // Business
  activeUsers: number;
  newRegistrations: number;
  courseCompletions: number;
  
  // System
  memoryUsage: number;
  cpuUsage: number;
  diskUsage: number;
}

// Health checks
const healthCheck = {
  '/health': {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    dependencies: {
      database: 'healthy',
      redis: 'healthy',
      fileStorage: 'healthy'
    }
  }
};
```

---

**Documento Tecnico:** v1.0  
**Ultima Revisione:** $(date)  
**Prossimo Aggiornamento:** Settimanale durante sviluppo