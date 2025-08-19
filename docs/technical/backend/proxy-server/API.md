# API Documentation - Proxy Server

## Panoramica

Il proxy server espone diversi endpoint per il monitoraggio, la gestione e il proxy delle richieste verso i servizi backend.

## Endpoint Locali

### Health Check Endpoints

#### GET /health

Health check completo del sistema con informazioni dettagliate.

**Response:**
```json
{
  "status": "healthy|degraded|unhealthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "responseTime": 45,
  "checks": {
    "database": {
      "status": "healthy",
      "responseTime": 12,
      "details": {
        "connected": true,
        "latency": "12ms"
      }
    },
    "apiServer": {
      "status": "healthy",
      "responseTime": 25,
      "url": "http://localhost:4001"
    },
    "docsServer": {
      "status": "healthy",
      "responseTime": 18,
      "url": "http://localhost:4002"
    },
    "frontend": {
      "status": "healthy",
      "responseTime": 15,
      "url": "http://localhost:5173"
    },
    "system": {
      "status": "healthy",
      "memory": {
        "used": "125.5 MB",
        "total": "2.0 GB",
        "percentage": 6.1
      },
      "uptime": "2 hours, 15 minutes",
      "cpu": {
        "usage": "15%",
        "loadAverage": [0.5, 0.3, 0.2]
      },
      "nodeVersion": "v20.10.0",
      "platform": "darwin",
      "arch": "arm64"
    }
  },
  "environment": {
    "nodeEnv": "development",
    "version": "1.0.0",
    "config": {
      "corsEnabled": true,
      "rateLimitEnabled": true,
      "httpsEnabled": false
    }
  }
}
```

**Query Parameters:**
- `include` (string): Comma-separated list of checks to include (e.g., `database,system`)
- `exclude` (string): Comma-separated list of checks to exclude
- `timeout` (number): Timeout in milliseconds for external service checks (default: 5000)

**Status Codes:**
- `200` - System is healthy or degraded
- `503` - System is unhealthy

**Examples:**
```bash
# Health check completo
curl http://localhost:4003/health

# Solo database e sistema
curl "http://localhost:4003/health?include=database,system"

# Escludere servizi esterni
curl "http://localhost:4003/health?exclude=apiServer,docsServer,frontend"
```

#### GET /healthz

Health check semplificato in stile Kubernetes.

**Response:**
- `200 OK` con body `"OK"` se il sistema è operativo
- `503 Service Unavailable` con body `"Unhealthy"` se ci sono problemi critici

**Examples:**
```bash
curl http://localhost:4003/healthz
# Response: OK
```

#### GET /ready

Readiness probe che verifica se il servizio è pronto ad accettare traffico.

**Response:**
```json
{
  "ready": true,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "checks": {
    "database": "healthy",
    "apiServer": "healthy"
  }
}
```

**Status Codes:**
- `200` - Service is ready
- `503` - Service is not ready

### Test Endpoints

#### GET /proxy-test-updated

Endpoint di test per verificare il funzionamento del proxy server.

**Response:**
```json
{
  "message": "Proxy server is working correctly",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "version": "1.0.0",
  "environment": "development"
}
```

## Endpoint Proxy

Tutti gli altri endpoint vengono proxati ai servizi backend appropriati.

### API Routes (Proxied to API Server)

Tutte le richieste che iniziano con `/api/` vengono proxate all'API server.

**Base URL:** `http://localhost:4001`

#### POST /api/auth/login

Login utente (proxied con rate limiting specifico).

**Rate Limiting:**
- Development: 20 richieste per 15 minuti
- Production: 5 richieste per 15 minuti

**Request:**
```json
{
  "identifier": "admin@example.com",
  "password": "Admin123!"
}
```

**Headers Required:**
- `Content-Type: application/json`
- `Origin: http://localhost:5173` (per CORS)

#### GET /api/health

Health check dell'API server (proxied).

#### Altri Endpoint API

Tutti gli altri endpoint `/api/*` vengono proxati con:
- Rate limiting: 50 richieste per 15 minuti
- CORS headers
- Security headers
- Request/response logging

### Documents Routes (Proxied to Documents Server)

Tutte le richieste che iniziano con `/docs/` vengono proxate al documents server.

**Base URL:** `http://localhost:4002`

### Static Routes (Proxied to Frontend)

Tutte le altre richieste vengono proxate al frontend.

**Base URL:** `http://localhost:5173`

## Rate Limiting

### Limiti per Endpoint

| Endpoint Pattern | Development | Production | Window |
|------------------|-------------|------------|--------|
| `/api/auth/login` | 20 req | 5 req | 15 min |
| `/api/upload` | 10 req | 10 req | 15 min |
| `/api/*` | 200 req | 50 req | 15 min |
| `/*` (general) | 1000 req | 100 req | 15 min |

### Esenzioni

I seguenti endpoint sono esenti dal rate limiting:
- `/health`
- `/healthz`
- `/ready`
- `OPTIONS` requests (CORS preflight)
- Static assets (`.css`, `.js`, `.png`, etc.)

### Headers di Rate Limiting

Ogni risposta include header informativi:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642248600
Retry-After: 900
```

### Risposta Rate Limit Exceeded

**Status Code:** `429 Too Many Requests`

```json
{
  "error": "Too many requests",
  "message": "Rate limit exceeded for login endpoint",
  "code": "RATE_LIMIT_EXCEEDED",
  "type": "login",
  "limit": 5,
  "windowMs": 900000,
  "retryAfter": 847,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## CORS Configuration

### Allowed Origins

**Development:**
- `http://localhost:5173`
- `http://localhost:3000`
- `http://127.0.0.1:5173`

**Production:**
- Configurato tramite `FRONTEND_URL` environment variable

### Allowed Methods

- `GET`
- `POST`
- `PUT`
- `DELETE`
- `OPTIONS`
- `PATCH`

### Allowed Headers

- `Content-Type`
- `Authorization`
- `X-Requested-With`
- `Accept`
- `Origin`

### Exposed Headers

- `X-Total-Count`
- `X-Rate-Limit-Remaining`

### Preflight Requests

Tutte le richieste `OPTIONS` vengono gestite automaticamente con:
- `Access-Control-Max-Age: 86400` (24 ore)
- `Access-Control-Allow-Credentials: true`

## Security Headers

Ogni risposta include header di sicurezza:

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'
Referrer-Policy: strict-origin-when-cross-origin
```

### Content Security Policy (CSP)

**Development:**
```
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval';
style-src 'self' 'unsafe-inline';
img-src 'self' data: https:;
connect-src 'self' ws: wss:;
```

**Production:**
```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline';
img-src 'self' data:;
connect-src 'self';
frame-ancestors 'none';
base-uri 'self';
form-action 'self';
```

## Error Responses

### Standard Error Format

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "path": "/api/endpoint",
  "method": "POST",
  "details": {
    "additional": "information"
  }
}
```

### Common Error Codes

| Status | Code | Description |
|--------|------|-------------|
| 400 | `BAD_REQUEST` | Invalid request format |
| 401 | `UNAUTHORIZED` | Authentication required |
| 403 | `FORBIDDEN` | Access denied |
| 404 | `NOT_FOUND` | Resource not found |
| 413 | `PAYLOAD_TOO_LARGE` | Request body too large |
| 429 | `RATE_LIMIT_EXCEEDED` | Too many requests |
| 500 | `INTERNAL_SERVER_ERROR` | Server error |
| 502 | `BAD_GATEWAY` | Upstream server error |
| 503 | `SERVICE_UNAVAILABLE` | Service temporarily unavailable |
| 504 | `GATEWAY_TIMEOUT` | Upstream server timeout |

### Proxy Errors

Quando un servizio backend non è raggiungibile:

```json
{
  "error": "Service temporarily unavailable",
  "code": "SERVICE_UNAVAILABLE",
  "service": "api-server",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "retryAfter": 30
}
```

## Request/Response Logging

### Structured Logging

Ogni richiesta viene loggata in formato strutturato:

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "info",
  "type": "request",
  "method": "POST",
  "path": "/api/auth/login",
  "statusCode": 200,
  "responseTime": 145,
  "userAgent": "Mozilla/5.0...",
  "ip": "127.0.0.1",
  "origin": "http://localhost:5173",
  "contentLength": 45,
  "rateLimitHit": false,
  "proxyTarget": "http://localhost:4001"
}
```

### Security Logging

Richieste sospette vengono loggate separatamente:

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "warn",
  "type": "security",
  "event": "suspicious_request",
  "pattern": "path_traversal",
  "path": "/api/../../../etc/passwd",
  "ip": "192.168.1.100",
  "userAgent": "curl/7.68.0",
  "blocked": true
}
```

## Performance Monitoring

### Metrics Endpoint

#### GET /metrics

Espone metriche in formato Prometheus (se abilitato).

```
# HELP proxy_requests_total Total number of requests
# TYPE proxy_requests_total counter
proxy_requests_total{method="GET",status="200"} 1234

# HELP proxy_request_duration_seconds Request duration in seconds
# TYPE proxy_request_duration_seconds histogram
proxy_request_duration_seconds_bucket{le="0.1"} 100
proxy_request_duration_seconds_bucket{le="0.5"} 200
proxy_request_duration_seconds_bucket{le="1.0"} 250

# HELP proxy_rate_limit_hits_total Rate limit hits
# TYPE proxy_rate_limit_hits_total counter
proxy_rate_limit_hits_total{type="login"} 15
```

### Performance Headers

Risposte includono header di performance:

```
X-Response-Time: 145ms
X-Proxy-Target: api-server
X-Cache-Status: MISS
```

## Debug e Troubleshooting

### Debug Headers

In modalità debug, vengono aggiunti header informativi:

```
X-Debug-Rate-Limit-Type: login
X-Debug-Middleware-Chain: security,cors,rateLimit,logging,bodyParser
X-Debug-Proxy-Attempt: 1
X-Debug-Response-Time: 145ms
```

### Debug Endpoints

#### GET /debug/config

Restituisce la configurazione corrente (solo in development).

```json
{
  "environment": "development",
  "cors": {
    "origins": ["http://localhost:5173"],
    "credentials": true
  },
  "rateLimit": {
    "general": { "max": 1000, "windowMs": 900000 },
    "login": { "max": 20, "windowMs": 900000 }
  },
  "security": {
    "helmet": true,
    "hsts": false
  }
}
```

#### GET /debug/stats

Statistiche di runtime (solo in development).

```json
{
  "uptime": 7200,
  "requests": {
    "total": 1234,
    "byMethod": {
      "GET": 800,
      "POST": 300,
      "PUT": 100,
      "DELETE": 34
    },
    "byStatus": {
      "200": 1000,
      "404": 200,
      "429": 20,
      "500": 14
    }
  },
  "rateLimiting": {
    "hits": 45,
    "byType": {
      "general": 20,
      "login": 15,
      "api": 10
    }
  },
  "memory": {
    "rss": "125.5 MB",
    "heapUsed": "89.2 MB",
    "heapTotal": "120.1 MB"
  }
}
```

## Esempi di Utilizzo

### Login Flow Completo

```bash
# 1. Preflight request (automatico dal browser)
curl -X OPTIONS http://localhost:4003/api/auth/login \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type,Authorization"

# 2. Actual login request
curl -X POST http://localhost:4003/api/auth/login \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:5173" \
  -d '{
    "identifier": "admin@example.com",
    "password": "Admin123!"
  }'
```

### Health Check Monitoring

```bash
# Check completo per monitoring
curl -s http://localhost:4003/health | jq '.status'

# Check semplice per load balancer
curl -f http://localhost:4003/healthz

# Readiness check per Kubernetes
curl -s http://localhost:4003/ready | jq '.ready'
```

### Rate Limiting Test

```bash
# Test rate limiting
for i in {1..10}; do
  curl -X POST http://localhost:4003/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"identifier":"test","password":"test"}' \
    -w "Request $i: %{http_code}\n" \
    -o /dev/null -s
done
```

## SDK e Client Libraries

### JavaScript/TypeScript

```typescript
class ProxyClient {
  constructor(private baseUrl: string = 'http://localhost:4003') {}
  
  async healthCheck(): Promise<HealthStatus> {
    const response = await fetch(`${this.baseUrl}/health`);
    return response.json();
  }
  
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const response = await fetch(`${this.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': window.location.origin
      },
      credentials: 'include',
      body: JSON.stringify(credentials)
    });
    
    if (!response.ok) {
      throw new ProxyError(await response.json());
    }
    
    return response.json();
  }
}
```

### Python

```python
import requests
from typing import Dict, Any

class ProxyClient:
    def __init__(self, base_url: str = "http://localhost:4003"):
        self.base_url = base_url
        self.session = requests.Session()
    
    def health_check(self) -> Dict[str, Any]:
        response = self.session.get(f"{self.base_url}/health")
        response.raise_for_status()
        return response.json()
    
    def login(self, identifier: str, password: str) -> Dict[str, Any]:
        response = self.session.post(
            f"{self.base_url}/api/auth/login",
            json={"identifier": identifier, "password": password},
            headers={"Origin": "http://localhost:5173"}
        )
        response.raise_for_status()
        return response.json()
```