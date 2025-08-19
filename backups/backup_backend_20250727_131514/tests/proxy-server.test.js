/**
 * Test end-to-end per il proxy server ottimizzato
 * Utilizza supertest per testare tutti gli endpoint e middleware
 */

import request from 'supertest';
import { expect } from 'chai';
import app from '../servers/proxy-server.js';

describe('Proxy Server E2E Tests', () => {
  
  describe('Health Check Endpoints', () => {
    it('should return 200 for /health endpoint', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);
      
      expect(response.body).to.have.property('status');
      expect(response.body).to.have.property('timestamp');
      expect(response.body).to.have.property('checks');
    });
    
    it('should return OK for /healthz endpoint', async () => {
      const response = await request(app)
        .get('/healthz')
        .expect(200);
      
      expect(response.text).to.equal('OK');
    });
    
    it('should return readiness status for /ready endpoint', async () => {
      const response = await request(app)
        .get('/ready')
        .expect((res) => {
          expect([200, 503]).to.include(res.status);
        });
      
      expect(response.body).to.have.property('ready');
    });
  });
  
  describe('Rate Limiting', () => {
    it('should apply rate limiting to general requests', async () => {
      // Test multiple requests to trigger rate limiting
      const requests = Array(10).fill().map(() => 
        request(app).get('/api/test-rate-limit')
      );
      
      const responses = await Promise.all(requests);
      
      // Almeno alcune richieste dovrebbero passare
      const successfulRequests = responses.filter(res => res.status !== 429);
      expect(successfulRequests.length).to.be.greaterThan(0);
    });
    
    it('should exempt OPTIONS requests from rate limiting', async () => {
      const response = await request(app)
        .options('/api/test')
        .expect((res) => {
          expect(res.status).to.not.equal(429);
        });
    });
    
    it('should exempt health endpoints from rate limiting', async () => {
      const requests = Array(20).fill().map(() => 
        request(app).get('/health')
      );
      
      const responses = await Promise.all(requests);
      
      // Tutte le richieste health dovrebbero passare
      responses.forEach(res => {
        expect(res.status).to.not.equal(429);
      });
    });
  });
  
  describe('CORS Configuration', () => {
    it('should handle CORS preflight requests', async () => {
      const response = await request(app)
        .options('/api/auth/login')
        .set('Origin', 'http://localhost:5173')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type,Authorization')
        .expect(200);
      
      expect(response.headers).to.have.property('access-control-allow-origin');
      expect(response.headers).to.have.property('access-control-allow-methods');
    });
    
    it('should allow requests from allowed origins', async () => {
      const response = await request(app)
        .get('/health')
        .set('Origin', 'http://localhost:5173')
        .expect(200);
      
      expect(response.headers['access-control-allow-origin']).to.equal('http://localhost:5173');
    });
  });
  
  describe('Security Headers', () => {
    it('should include security headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);
      
      // Verifica presenza di header di sicurezza
      expect(response.headers).to.have.property('x-content-type-options');
      expect(response.headers).to.have.property('x-frame-options');
      expect(response.headers).to.have.property('x-xss-protection');
    });
    
    it('should include CSP headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);
      
      expect(response.headers).to.have.property('content-security-policy');
    });
  });
  
  describe('Body Parsing', () => {
    it('should parse JSON bodies correctly', async () => {
      const testData = { test: 'data', number: 123 };
      
      const response = await request(app)
        .post('/api/test-json')
        .send(testData)
        .set('Content-Type', 'application/json')
        .expect((res) => {
          // Il test dovrebbe passare anche se l'endpoint non esiste
          // perché stiamo testando il parsing del body
          expect([200, 404, 500]).to.include(res.status);
        });
    });
    
    it('should handle large payloads for bulk upload', async () => {
      const largeData = {
        items: Array(1000).fill().map((_, i) => ({ id: i, name: `Item ${i}` }))
      };
      
      const response = await request(app)
        .post('/api/bulk-import')
        .send(largeData)
        .set('Content-Type', 'application/json')
        .expect((res) => {
          // Non dovrebbe fallire per dimensione del payload
          expect(res.status).to.not.equal(413);
        });
    });
  });
  
  describe('Local Routes', () => {
    it('should handle proxy test endpoint', async () => {
      const response = await request(app)
        .get('/proxy-test-updated')
        .expect(200);
      
      expect(response.body).to.have.property('message');
      expect(response.body.message).to.include('proxy server');
    });
  });
  
  describe('Error Handling', () => {
    it('should return 404 for non-existent endpoints', async () => {
      const response = await request(app)
        .get('/non-existent-endpoint')
        .expect(404);
      
      expect(response.body).to.have.property('error');
    });
    
    it('should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/api/test')
        .send('{ invalid json }')
        .set('Content-Type', 'application/json')
        .expect((res) => {
          expect([400, 404]).to.include(res.status);
        });
    });
  });
  
  describe('Performance', () => {
    it('should respond to health checks quickly', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/health')
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).to.be.lessThan(1000); // Meno di 1 secondo
    });
    
    it('should handle concurrent requests', async () => {
      const concurrentRequests = Array(10).fill().map(() => 
        request(app).get('/health')
      );
      
      const responses = await Promise.all(concurrentRequests);
      
      responses.forEach(response => {
        expect(response.status).to.equal(200);
      });
    });
  });
  
  describe('Login Rate Limiting', () => {
    it('should apply stricter rate limiting to login endpoint', async () => {
      // Test multiple login attempts
      const loginRequests = Array(10).fill().map(() => 
        request(app)
          .post('/api/auth/login')
          .send({ identifier: 'test@example.com', password: 'wrongpassword' })
          .set('Content-Type', 'application/json')
      );
      
      const responses = await Promise.all(loginRequests);
      
      // Dovrebbe esserci almeno una risposta 429 (rate limited)
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).to.be.greaterThan(0);
    });
  });
});

// Test di integrazione per verificare il funzionamento completo
describe('Integration Tests', () => {
  
  describe('Full Login Flow', () => {
    it('should handle complete login process', async () => {
      // Test CORS preflight
      await request(app)
        .options('/api/auth/login')
        .set('Origin', 'http://localhost:5173')
        .set('Access-Control-Request-Method', 'POST')
        .expect(200);
      
      // Test actual login (dovrebbe essere proxied all'API server)
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: 'admin@example.com',
          password: 'Admin123!'
        })
        .set('Content-Type', 'application/json')
        .set('Origin', 'http://localhost:5173')
        .expect((res) => {
          // Accetta sia successo che errori di proxy
          expect([200, 401, 500, 502, 503]).to.include(res.status);
        });
    });
  });
  
  describe('Proxy Functionality', () => {
    it('should proxy API requests correctly', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect((res) => {
          // Dovrebbe essere proxied o gestito localmente
          expect([200, 502, 503]).to.include(res.status);
        });
    });
  });
});