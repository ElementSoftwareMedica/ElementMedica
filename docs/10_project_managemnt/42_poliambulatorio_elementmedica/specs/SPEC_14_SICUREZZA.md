# 🛡️ SPEC_14: Sicurezza e Crittografia

**Versione**: 1.0  
**Ultimo aggiornamento**: 2025-12-11  
**Collegato a**: [SPEC_12_AUDIT_GDPR.md](./SPEC_12_AUDIT_GDPR.md), [SPEC_13_FILE_STORAGE.md](./SPEC_13_FILE_STORAGE.md)

---

## 1. OVERVIEW

Requisiti di sicurezza per sistema sanitario:
- Crittografia dati sensibili
- Autenticazione robusta (MFA)
- Protezione da attacchi comuni
- Compliance normativa sanitaria

---

## 2. CRITTOGRAFIA

### 2.1 At Rest
| Dato | Metodo | Note |
|------|--------|------|
| Database | PostgreSQL TDE | Transparent encryption |
| File S3 | SSE-S3 / SSE-KMS | Server-side encryption |
| Backup | AES-256-GCM | Prima di upload |

### 2.2 In Transit
- TLS 1.3 obbligatorio
- HSTS header
- Certificate pinning (mobile)

### 2.3 Campi Sensibili (Application Level)

```javascript
// backend/utils/encryption.js

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(process.env.ENCRYPTION_KEY, 'hex'); // 32 bytes

export function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag().toString('hex');
  
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export function decrypt(encryptedText) {
  const [ivHex, authTagHex, encrypted] = encryptedText.split(':');
  
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

// Campi da crittografare
export const ENCRYPTED_FIELDS = [
  'codiceFiscale',
  'iban',
  'numeroCartaCredito',
  'datiSanitariSensibili'
];
```

---

## 3. AUTENTICAZIONE

### 3.1 Password Policy

```javascript
// Requisiti password
const PASSWORD_POLICY = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecial: true,
  maxAge: 90,              // giorni
  historyCount: 5,         // ultime N password non riutilizzabili
  lockoutAttempts: 5,
  lockoutDuration: 15      // minuti
};
```

### 3.2 MFA (Multi-Factor Authentication)

```javascript
// backend/services/mfaService.js

import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

export const mfaService = {
  // Genera secret per nuovo utente
  async generateSecret(userId, email) {
    const secret = speakeasy.generateSecret({
      name: `ElementMedica:${email}`,
      issuer: 'ElementMedica'
    });
    
    // Salva secret (crittografato)
    await prisma.person.update({
      where: { id: userId },
      data: { 
        mfaSecret: encrypt(secret.base32),
        mfaEnabled: false  // Non ancora verificato
      }
    });
    
    // Genera QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);
    
    return { secret: secret.base32, qrCode: qrCodeUrl };
  },
  
  // Verifica codice OTP
  async verifyToken(userId, token) {
    const user = await prisma.person.findUnique({ where: { id: userId } });
    const secret = decrypt(user.mfaSecret);
    
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 1  // Tolleranza ±30 secondi
    });
  },
  
  // Abilita MFA dopo prima verifica
  async enableMfa(userId, token) {
    const isValid = await this.verifyToken(userId, token);
    
    if (!isValid) {
      throw new Error('Codice non valido');
    }
    
    // Genera backup codes
    const backupCodes = this.generateBackupCodes();
    
    await prisma.person.update({
      where: { id: userId },
      data: { 
        mfaEnabled: true,
        mfaBackupCodes: backupCodes.map(c => encrypt(c))
      }
    });
    
    return { backupCodes };
  },
  
  generateBackupCodes(count = 10) {
    return Array.from({ length: count }, () => 
      crypto.randomBytes(4).toString('hex').toUpperCase()
    );
  }
};
```

### 3.3 Session Management

```javascript
// Configurazione sessione
const SESSION_CONFIG = {
  tokenExpiry: '15m',           // Access token
  refreshExpiry: '7d',          // Refresh token
  absoluteTimeout: '12h',       // Max sessione singola
  idleTimeout: '30m',           // Inattività
  concurrentSessions: 3,        // Max sessioni parallele
  
  // Per ruoli clinici
  clinicalSessionExpiry: '8h',  // Turno lavorativo
  clinicalIdleTimeout: '15m'    // Più breve per PHI
};
```

---

## 4. PROTEZIONE ATTACCHI

### 4.1 Rate Limiting (Già Implementato)

```javascript
// Configurazioni specifiche cliniche
const RATE_LIMITS = {
  login: { windowMs: 15 * 60 * 1000, max: 5 },     // 5 tentativi/15min
  api: { windowMs: 60 * 1000, max: 100 },          // 100 req/min
  upload: { windowMs: 60 * 1000, max: 10 },        // 10 upload/min
  export: { windowMs: 60 * 60 * 1000, max: 5 }     // 5 export/ora
};
```

### 4.2 Input Validation

```javascript
// Sanitizzazione input
import sanitizeHtml from 'sanitize-html';
import validator from 'validator';

export function sanitizeInput(input) {
  if (typeof input === 'string') {
    // Escape HTML
    input = sanitizeHtml(input, { allowedTags: [], allowedAttributes: {} });
    // Trim whitespace
    input = input.trim();
  }
  return input;
}

// Validazione specifica
export const validators = {
  codiceFiscale: (cf) => /^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/i.test(cf),
  partitaIva: (pi) => /^[0-9]{11}$/.test(pi),
  email: (email) => validator.isEmail(email),
  phone: (phone) => validator.isMobilePhone(phone, 'it-IT')
};
```

### 4.3 CSRF Protection (Già Implementato)

```javascript
// Applicato su tutte le route POST/PUT/DELETE
app.use(csrfProtection);

// Token in header
res.setHeader('X-CSRF-Token', req.csrfToken());
```

### 4.4 Security Headers

```javascript
// backend/middleware/securityHeaders.js

import helmet from 'helmet';

export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Per React
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", process.env.API_URL],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  noSniff: true,
  xssFilter: true
});
```

---

## 5. IP WHITELIST (Opzionale)

```javascript
// Per accesso admin/clinico da IP autorizzati
const IP_WHITELIST = {
  enabled: process.env.IP_WHITELIST_ENABLED === 'true',
  allowedIps: (process.env.ALLOWED_IPS || '').split(','),
  
  // Ruoli che richiedono whitelist
  restrictedRoles: ['ADMIN', 'DIRETTORE_SANITARIO']
};

export const ipWhitelistMiddleware = (req, res, next) => {
  if (!IP_WHITELIST.enabled) return next();
  
  const clientIp = getClientIp(req);
  const userRoles = req.person?.roles || [];
  
  const requiresWhitelist = userRoles.some(r => 
    IP_WHITELIST.restrictedRoles.includes(r)
  );
  
  if (requiresWhitelist && !IP_WHITELIST.allowedIps.includes(clientIp)) {
    return res.status(403).json({ error: 'IP non autorizzato' });
  }
  
  next();
};
```

---

## 6. LOGGING SICUREZZA

```javascript
// Eventi di sicurezza da loggare
const SECURITY_EVENTS = [
  'LOGIN_SUCCESS',
  'LOGIN_FAILURE',
  'LOGOUT',
  'PASSWORD_CHANGE',
  'PASSWORD_RESET_REQUEST',
  'MFA_ENABLED',
  'MFA_DISABLED',
  'SESSION_EXPIRED',
  'ACCOUNT_LOCKED',
  'ACCOUNT_UNLOCKED',
  'PERMISSION_DENIED',
  'SUSPICIOUS_ACTIVITY'
];

export function logSecurityEvent(event, userId, details = {}) {
  logger.warn({
    type: 'SECURITY_EVENT',
    event,
    userId,
    ip: details.ip,
    userAgent: details.userAgent,
    tenantId: details.tenantId,
    timestamp: new Date().toISOString(),
    ...details
  }, `Security: ${event}`);
}
```

---

## 7. CHECKLIST SICUREZZA

| Controllo | Stato | Note |
|-----------|-------|------|
| TLS 1.3 | ✅ | Nginx config |
| Password hashing (bcrypt) | ✅ | Salt 12 |
| Rate limiting | ✅ | Esistente |
| CSRF protection | ✅ | Esistente |
| Input validation | ✅ | Joi/Zod |
| SQL injection | ✅ | Prisma ORM |
| XSS protection | ✅ | Helmet + sanitize |
| MFA | ⏳ | Da implementare |
| Encryption at rest | ⏳ | Config DB/S3 |
| Session management | ⏳ | Migliorare |

---

## 8. COLLEGAMENTI

- **Precedente**: [SPEC_13_FILE_STORAGE.md](./SPEC_13_FILE_STORAGE.md)
- **Prossimo**: [SPEC_15_RICERCA.md](./SPEC_15_RICERCA.md)
