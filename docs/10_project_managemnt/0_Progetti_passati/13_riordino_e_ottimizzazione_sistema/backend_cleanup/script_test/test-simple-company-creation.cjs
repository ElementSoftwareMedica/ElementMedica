const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const http = require('http');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Funzione helper per fare richieste HTTP
function makeRequest(method, path, data, token) {
  return new Promise((resolve, reject) => {
    const postData = data ? JSON.stringify(data) : null;
    
    const options = {
      hostname: 'localhost',
      port: 4001,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }
    
    if (postData) {
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }
    
    const req = http.request(options, (res) => {
      let body = '';
      
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonBody = body ? JSON.parse(body) : null;
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            json: () => Promise.resolve(jsonBody),
            text: () => Promise.resolve(body)
          });
        } catch (error) {
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            json: () => Promise.reject(new Error('Invalid JSON')),
            text: () => Promise.resolve(body)
          });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (postData) {
      req.write(postData);
    }
    
    req.end();
  });
}

async function testSimpleCompanyCreation() {
  try {
    console.log('🧪 Test semplice creazione company...');
    
    // Trova l'admin user
    const adminPerson = await prisma.person.findFirst({
      where: {
        email: 'admin@example.com',
        deletedAt: null
      }
    });
    
    if (!adminPerson) {
      console.log('❌ Admin user non trovato');
      return;
    }
    
    console.log(`✅ Admin user trovato: ${adminPerson.email}`);
    
    // Genera JWT token per l'admin
    const token = jwt.sign(
      {
        personId: adminPerson.id,
        id: adminPerson.id,
        email: adminPerson.email,
        globalRole: adminPerson.globalRole
      },
      JWT_SECRET,
      { 
        expiresIn: '1h',
        issuer: 'training-platform',
        audience: 'training-platform-users'
      }
    );
    
    console.log('🔑 Token JWT generato per test');
    
    // Test creazione company con dati minimi
    console.log('\n📝 Test creazione company con dati minimi...');
    const minimalCompany = {
      ragione_sociale: `Test Company Minimal ${Date.now()}`
    };
    
    const response = await makeRequest('POST', '/api/v1/companies', minimalCompany, token);
    
    if (response.ok) {
      const createdCompany = await response.json();
      console.log(`✅ Company creata con successo: ID ${createdCompany.id}`);
      console.log(`   Ragione sociale: ${createdCompany.ragione_sociale}`);
    } else {
      const error = await response.text();
      console.log(`❌ Errore nella creazione: ${response.status} - ${error}`);
    }
    
    console.log('\n🎉 Test completato!');
    
  } catch (error) {
    console.log(`❌ Errore durante il test: ${error.message}`);
    console.log(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Esegui il test
testSimpleCompanyCreation();