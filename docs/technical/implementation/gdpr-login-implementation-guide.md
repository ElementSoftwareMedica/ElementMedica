# Guida End-to-End: Implementazione Funzioni GDPR e Login

**Versione:** 2.0  
**Data:** 29 Dicembre 2024  
**Autore:** Team Development  
**Stato:** Sistema Unificato Person

## 📋 Panoramica

Questa guida descrive come implementare nuove funzionalità nel sistema unificato Person, garantendo piena compatibilità con GDPR e il sistema di login aggiornato.

## 🏗️ Architettura Sistema Attuale

### Entità Principali
- **Person**: Entità unificata per tutti gli utenti (ex User, Employee)
- **PersonRole**: Sistema ruoli unificato con enum RoleType
- **PersonSession**: Gestione sessioni con JWT
- **GdprAuditLog**: Tracciamento completo operazioni
- **ConsentRecord**: Gestione consensi granulare

### Pattern di Autenticazione
```typescript
// Middleware di autenticazione aggiornato
const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Token mancante' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    
    // Verifica che la persona esista e sia attiva
    const person = await prisma.person.findFirst({
      where: {
        id: decoded.personId,
        deletedAt: null,
        status: 'ACTIVE'
      },
      include: {
        personRoles: {
          where: { isActive: true },
          include: { permissions: true }
        }
      }
    });
    
    if (!person) {
      return res.status(401).json({ error: 'Utente non valido' });
    }
    
    req.person = person;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token non valido' });
  }
};
```

## 🔐 Implementazione Sistema Login

### 1. Endpoint Login

```typescript
// POST /api/auth/login
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    // Validazione input
    const validation = loginSchema.safeParse({ email, password });
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Dati non validi',
        details: validation.error.errors 
      });
    }
    
    // Trova persona per email
    const person = await prisma.person.findFirst({
      where: {
        email: email.toLowerCase(),
        deletedAt: null
      },
      include: {
        personRoles: {
          where: { isActive: true },
          include: { permissions: true }
        }
      }
    });
    
    if (!person) {
      // Log tentativo di accesso fallito
      await logGdprAction({
        action: 'LOGIN_FAILED',
        dataType: 'AUTHENTICATION',
        reason: 'Email non trovata',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      return res.status(401).json({ error: 'Credenziali non valide' });
    }
    
    // Verifica account bloccato
    if (person.lockedUntil && person.lockedUntil > new Date()) {
      return res.status(423).json({ 
        error: 'Account temporaneamente bloccato',
        lockedUntil: person.lockedUntil 
      });
    }
    
    // Verifica password
    const isValidPassword = await bcrypt.compare(password, person.passwordHash);
    
    if (!isValidPassword) {
      // Incrementa tentativi falliti
      const failedAttempts = person.failedAttempts + 1;
      const shouldLock = failedAttempts >= 5;
      
      await prisma.person.update({
        where: { id: person.id },
        data: {
          failedAttempts,
          lockedUntil: shouldLock ? new Date(Date.now() + 30 * 60 * 1000) : null // 30 minuti
        }
      });
      
      // Log GDPR
      await logGdprAction({
        personId: person.id,
        action: 'LOGIN_FAILED',
        dataType: 'AUTHENTICATION',
        reason: 'Password errata',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      return res.status(401).json({ error: 'Credenziali non valide' });
    }
    
    // Reset tentativi falliti
    await prisma.person.update({
      where: { id: person.id },
      data: {
        failedAttempts: 0,
        lockedUntil: null,
        lastLogin: new Date()
      }
    });
    
    // Genera JWT
    const token = jwt.sign(
      {
        personId: person.id,
        email: person.email,
        roles: person.personRoles.map(r => r.roleType),
        permissions: person.personRoles.flatMap(r => r.permissions.map(p => p.permission))
      },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );
    
    // Crea sessione
    const session = await prisma.personSession.create({
      data: {
        personId: person.id,
        refreshToken: generateRefreshToken(),
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 giorni
      }
    });
    
    // Log GDPR successo
    await logGdprAction({
      personId: person.id,
      action: 'LOGIN_SUCCESS',
      dataType: 'AUTHENTICATION',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.json({
      token,
      refreshToken: session.refreshToken,
      person: {
        id: person.id,
        email: person.email,
        firstName: person.firstName,
        lastName: person.lastName,
        roles: person.personRoles.map(r => r.roleType)
      }
    });
    
  } catch (error) {
    console.error('Errore login:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
};
```

### 2. Gestione Refresh Token

```typescript
// POST /api/auth/refresh
export const refreshToken = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token mancante' });
    }
    
    // Trova sessione valida
    const session = await prisma.personSession.findFirst({
      where: {
        refreshToken,
        expiresAt: { gt: new Date() }
      },
      include: {
        person: {
          include: {
            personRoles: {
              where: { isActive: true },
              include: { permissions: true }
            }
          }
        }
      }
    });
    
    if (!session || !session.person || session.person.deletedAt) {
      return res.status(401).json({ error: 'Refresh token non valido' });
    }
    
    // Genera nuovo JWT
    const newToken = jwt.sign(
      {
        personId: session.person.id,
        email: session.person.email,
        roles: session.person.personRoles.map(r => r.roleType),
        permissions: session.person.personRoles.flatMap(r => r.permissions.map(p => p.permission))
      },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );
    
    // Aggiorna sessione
    await prisma.personSession.update({
      where: { id: session.id },
      data: {
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });
    
    res.json({ token: newToken });
    
  } catch (error) {
    console.error('Errore refresh token:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
};
```

## 🛡️ Implementazione GDPR Compliance

### 1. Funzione di Logging GDPR

```typescript
interface GdprLogData {
  personId?: string;
  action: string;
  dataType: string;
  oldData?: any;
  newData?: any;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
}

export const logGdprAction = async (data: GdprLogData) => {
  try {
    await prisma.gdprAuditLog.create({
      data: {
        personId: data.personId,
        action: data.action,
        dataType: data.dataType,
        oldData: data.oldData ? JSON.stringify(data.oldData) : null,
        newData: data.newData ? JSON.stringify(data.newData) : null,
        reason: data.reason,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Errore logging GDPR:', error);
    // Non bloccare l'operazione principale per errori di logging
  }
};
```

### 2. Middleware GDPR per Operazioni CRUD

```typescript
// Middleware per tracciare operazioni sui dati personali
export const gdprTrackingMiddleware = (operation: string, dataType: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Salva i dati originali per UPDATE/DELETE
    if (operation === 'UPDATE' || operation === 'DELETE') {
      const personId = req.params.id || req.body.personId;
      if (personId) {
        try {
          const originalData = await prisma.person.findUnique({
            where: { id: personId }
          });
          req.originalData = originalData;
        } catch (error) {
          console.error('Errore recupero dati originali:', error);
        }
      }
    }
    
    // Continua con l'operazione
    next();
  };
};

// Middleware post-operazione per logging
export const gdprLogMiddleware = (operation: string, dataType: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      // Log solo se operazione riuscita (status 2xx)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const personId = req.params.id || req.body.personId || req.person?.id;
        
        if (personId) {
          logGdprAction({
            personId,
            action: operation,
            dataType,
            oldData: req.originalData,
            newData: operation !== 'DELETE' ? JSON.parse(data) : null,
            reason: req.body.reason || `${operation} via API`,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
          });
        }
      }
      
      return originalSend.call(this, data);
    };
    
    next();
  };
};
```

### 3. Gestione Consensi

```typescript
// Verifica consenso prima di processare dati
export const checkConsent = async (personId: string, consentType: string): Promise<boolean> => {
  const consent = await prisma.consentRecord.findFirst({
    where: {
      personId,
      consentType,
      granted: true,
      revokedAt: null
    },
    orderBy: { createdAt: 'desc' }
  });
  
  return !!consent;
};

// Middleware per verificare consenso
export const requireConsent = (consentType: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const personId = req.person?.id;
    
    if (!personId) {
      return res.status(401).json({ error: 'Autenticazione richiesta' });
    }
    
    const hasConsent = await checkConsent(personId, consentType);
    
    if (!hasConsent) {
      return res.status(403).json({ 
        error: 'Consenso richiesto',
        consentType,
        message: `È necessario il consenso per '${consentType}' per procedere con questa operazione.`
      });
    }
    
    next();
  };
};

// Endpoint per gestire consensi
export const updateConsent = async (req: Request, res: Response) => {
  try {
    const { consentType, granted, purpose } = req.body;
    const personId = req.person!.id;
    
    // Revoca consenso precedente se esiste
    if (!granted) {
      await prisma.consentRecord.updateMany({
        where: {
          personId,
          consentType,
          granted: true,
          revokedAt: null
        },
        data: {
          revokedAt: new Date()
        }
      });
    }
    
    // Crea nuovo record consenso
    const consent = await prisma.consentRecord.create({
      data: {
        personId,
        consentType,
        granted,
        version: process.env.PRIVACY_POLICY_VERSION || '1.0',
        purpose,
        grantedAt: granted ? new Date() : null,
        ipAddress: req.ip
      }
    });
    
    // Log GDPR
    await logGdprAction({
      personId,
      action: granted ? 'CONSENT_GRANTED' : 'CONSENT_REVOKED',
      dataType: 'CONSENT',
      newData: consent,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.json({ success: true, consent });
    
  } catch (error) {
    console.error('Errore aggiornamento consenso:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
};
```

## 🔧 Pattern di Implementazione per Nuove Funzioni

### 1. Template Controller GDPR-Compliant

```typescript
// Template per nuovo controller
export class PersonController {
  
  // GET - Lettura dati
  async getPersonData(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      // Verifica autorizzazione
      if (!this.canAccessPerson(req.person!, id)) {
        return res.status(403).json({ error: 'Accesso negato' });
      }
      
      // Recupera dati con soft delete check
      const person = await prisma.person.findFirst({
        where: {
          id,
          deletedAt: null
        },
        select: this.getSelectFields(req.person!)
      });
      
      if (!person) {
        return res.status(404).json({ error: 'Persona non trovata' });
      }
      
      // Log accesso dati
      await logGdprAction({
        personId: id,
        action: 'READ',
        dataType: 'PERSONAL_DATA',
        reason: 'Accesso via API',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      res.json(person);
      
    } catch (error) {
      console.error('Errore recupero persona:', error);
      res.status(500).json({ error: 'Errore interno del server' });
    }
  }
  
  // POST - Creazione
  async createPerson(req: Request, res: Response) {
    try {
      // Validazione input
      const validation = createPersonSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          error: 'Dati non validi',
          details: validation.error.errors 
        });
      }
      
      const data = validation.data;
      
      // Verifica autorizzazione
      if (!this.canCreatePerson(req.person!)) {
        return res.status(403).json({ error: 'Accesso negato' });
      }
      
      // Verifica consenso se necessario
      if (data.requiresConsent) {
        const hasConsent = await checkConsent(req.person!.id, 'DATA_PROCESSING');
        if (!hasConsent) {
          return res.status(403).json({ error: 'Consenso richiesto' });
        }
      }
      
      // Crea persona
      const person = await prisma.person.create({
        data: {
          ...data,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      
      // Log creazione
      await logGdprAction({
        personId: person.id,
        action: 'CREATE',
        dataType: 'PERSONAL_DATA',
        newData: person,
        reason: 'Creazione via API',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      res.status(201).json(person);
      
    } catch (error) {
      console.error('Errore creazione persona:', error);
      res.status(500).json({ error: 'Errore interno del server' });
    }
  }
  
  // PUT - Aggiornamento
  async updatePerson(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      // Validazione input
      const validation = updatePersonSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          error: 'Dati non validi',
          details: validation.error.errors 
        });
      }
      
      const data = validation.data;
      
      // Verifica autorizzazione
      if (!this.canUpdatePerson(req.person!, id)) {
        return res.status(403).json({ error: 'Accesso negato' });
      }
      
      // Recupera dati originali
      const originalPerson = await prisma.person.findFirst({
        where: { id, deletedAt: null }
      });
      
      if (!originalPerson) {
        return res.status(404).json({ error: 'Persona non trovata' });
      }
      
      // Aggiorna persona
      const updatedPerson = await prisma.person.update({
        where: { id },
        data: {
          ...data,
          updatedAt: new Date()
        }
      });
      
      // Log aggiornamento
      await logGdprAction({
        personId: id,
        action: 'UPDATE',
        dataType: 'PERSONAL_DATA',
        oldData: originalPerson,
        newData: updatedPerson,
        reason: req.body.reason || 'Aggiornamento via API',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      res.json(updatedPerson);
      
    } catch (error) {
      console.error('Errore aggiornamento persona:', error);
      res.status(500).json({ error: 'Errore interno del server' });
    }
  }
  
  // DELETE - Soft delete
  async deletePerson(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      
      // Verifica autorizzazione
      if (!this.canDeletePerson(req.person!, id)) {
        return res.status(403).json({ error: 'Accesso negato' });
      }
      
      // Recupera dati originali
      const originalPerson = await prisma.person.findFirst({
        where: { id, deletedAt: null }
      });
      
      if (!originalPerson) {
        return res.status(404).json({ error: 'Persona non trovata' });
      }
      
      // Soft delete
      await prisma.person.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          updatedAt: new Date()
        }
      });
      
      // Log cancellazione
      await logGdprAction({
        personId: id,
        action: 'DELETE',
        dataType: 'PERSONAL_DATA',
        oldData: originalPerson,
        reason: reason || 'Cancellazione via API',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      res.json({ success: true, message: 'Persona eliminata' });
      
    } catch (error) {
      console.error('Errore eliminazione persona:', error);
      res.status(500).json({ error: 'Errore interno del server' });
    }
  }
  
  // Metodi di autorizzazione
  private canAccessPerson(currentPerson: Person, targetId: string): boolean {
    // Logica autorizzazione basata su ruoli
    const roles = currentPerson.personRoles.map(r => r.roleType);
    
    // Admin può accedere a tutto
    if (roles.includes('SUPER_ADMIN') || roles.includes('ADMIN')) {
      return true;
    }
    
    // Può accedere ai propri dati
    if (currentPerson.id === targetId) {
      return true;
    }
    
    // Manager può accedere ai dipendenti della sua azienda
    if (roles.includes('MANAGER') || roles.includes('HR_MANAGER')) {
      // Implementare logica specifica
      return true;
    }
    
    return false;
  }
  
  private getSelectFields(currentPerson: Person): any {
    const roles = currentPerson.personRoles.map(r => r.roleType);
    
    // Admin vede tutto
    if (roles.includes('SUPER_ADMIN') || roles.includes('ADMIN')) {
      return undefined; // Tutti i campi
    }
    
    // Utenti normali vedono campi limitati
    return {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      title: true,
      phone: true,
      status: true,
      createdAt: true,
      updatedAt: true
      // Escludere campi sensibili come passwordHash, codiceFiscale, etc.
    };
  }
}
```

### 2. Schema di Validazione con Zod

```typescript
import { z } from 'zod';

// Schema per creazione persona
export const createPersonSchema = z.object({
  email: z.string().email('Email non valida'),
  firstName: z.string().min(1, 'Nome richiesto'),
  lastName: z.string().min(1, 'Cognome richiesto'),
  password: z.string().min(8, 'Password deve essere di almeno 8 caratteri'),
  title: z.string().optional(),
  phone: z.string().optional(),
  codiceFiscale: z.string().optional(),
  companyId: z.string().uuid().optional(),
  tenantId: z.string().uuid(),
  requiresConsent: z.boolean().default(false)
});

// Schema per aggiornamento persona
export const updatePersonSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  title: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  reason: z.string().optional() // Motivo dell'aggiornamento per GDPR
});

// Schema per login
export const loginSchema = z.object({
  email: z.string().email('Email non valida'),
  password: z.string().min(1, 'Password richiesta')
});
```

## 📋 Checklist per Nuove Implementazioni

### ✅ Sicurezza e Autenticazione
- [ ] Middleware di autenticazione implementato
- [ ] Verifica ruoli e permessi
- [ ] Validazione input con Zod
- [ ] Gestione errori appropriata
- [ ] Rate limiting se necessario

### ✅ GDPR Compliance
- [ ] Logging di tutte le operazioni sui dati personali
- [ ] Verifica consensi quando necessario
- [ ] Soft delete implementato (deletedAt)
- [ ] Audit trail completo
- [ ] Rispetto principi minimizzazione dati

### ✅ Database
- [ ] Query ottimizzate con indici appropriati
- [ ] Gestione transazioni per operazioni complesse
- [ ] Controllo soft delete in tutte le query
- [ ] Isolamento multi-tenant

### ✅ API Design
- [ ] Endpoint RESTful
- [ ] Codici di stato HTTP appropriati
- [ ] Documentazione OpenAPI
- [ ] Versioning API se necessario

### ✅ Testing
- [ ] Unit test per logica business
- [ ] Integration test per endpoint
- [ ] Test di sicurezza
- [ ] Test GDPR compliance

---

**Nota**: Questa guida deve essere seguita per tutte le nuove implementazioni per garantire coerenza e compliance con il sistema unificato Person e GDPR.