const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const http = require('http');

const prisma = new PrismaClient();

// Configurazione test
const API_BASE_URL = 'http://localhost:4001';
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
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    };
    
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

async function testCompaniesAdvancedPermissions() {
  try {
    console.log('🧪 Test integrazione permessi avanzati con route companies...');
    
    // Trova l'admin user
    const adminPerson = await prisma.person.findFirst({
      where: {
        email: 'admin@example.com',
        deletedAt: null
      },
      include: {
        personRoles: {
          where: { isActive: true },
          include: {
            advancedPermissions: {
              where: { deletedAt: null }
            }
          }
        }
      }
    });
    
    if (!adminPerson) {
      console.log('❌ Admin user non trovato');
      return;
    }
    
    console.log(`✅ Admin user trovato: ${adminPerson.email}`);
    console.log(`📋 Permessi avanzati configurati: ${adminPerson.personRoles.reduce((total, role) => total + role.advancedPermissions.length, 0)}`);
    
    // Genera JWT token per l'admin (formato compatibile con middleware)
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
    
    // Test 1: GET /companies (lettura)
    console.log('\n📖 Test 1: GET /api/v1/companies');
    try {
      const response = await makeRequest('GET', '/api/v1/companies', null, token);
      
      if (response.ok) {
        const companies = await response.json();
        console.log(`✅ GET /api/v1/companies: ${companies.length} companies trovate`);
      } else {
        const error = await response.text();
        console.log(`❌ GET /api/v1/companies: ${response.status} - ${error}`);
      }
    } catch (error) {
      console.log(`❌ GET /api/v1/companies: ERRORE - ${error.message}`);
    }
    
    // Test 2: POST /companies (creazione)
    console.log('\n📝 Test 2: POST /api/v1/companies');
    try {
      const newCompany = {
        ragione_sociale: `Test Company ${Date.now()}`,
        codice_fiscale: `CF${Date.now()}`,
        piva: `PI${Date.now()}`,
        sede_azienda: 'Via Test 123',
        telefono: '+39 123 456 7890',
        mail: 'test@company.com'
      };
      
      const response = await makeRequest('POST', '/api/v1/companies', newCompany, token);
      
      if (response.ok) {
        const createdCompany = await response.json();
        console.log(`✅ POST /api/v1/companies: Company creata con ID ${createdCompany.id}`);
        
        // Test 3: GET /companies/:id (lettura specifica)
        console.log('\n🔍 Test 3: GET /api/v1/companies/:id');
        try {
          const getResponse = await makeRequest('GET', `/api/v1/companies/${createdCompany.id}`, null, token);
          
          if (getResponse.ok) {
            const company = await getResponse.json();
            console.log(`✅ GET /api/v1/companies/${createdCompany.id}: Company trovata - ${company.ragione_sociale}`);
          } else {
            const error = await getResponse.text();
            console.log(`❌ GET /api/v1/companies/${createdCompany.id}: ${getResponse.status} - ${error}`);
          }
        } catch (error) {
          console.log(`❌ GET /api/v1/companies/${createdCompany.id}: ERRORE - ${error.message}`);
        }
        
        // Test 4: PUT /companies/:id (modifica)
        console.log('\n✏️ Test 4: PUT /api/v1/companies/:id');
        try {
          const updateData = {
            ragione_sociale: `${newCompany.ragione_sociale} - UPDATED`,
            telefono: '+39 987 654 3210'
          };
          
          const putResponse = await makeRequest('PUT', `/api/v1/companies/${createdCompany.id}`, updateData, token);
          
          if (putResponse.ok) {
            const updatedCompany = await putResponse.json();
            console.log(`✅ PUT /api/v1/companies/${createdCompany.id}: Company aggiornata - ${updatedCompany.ragione_sociale}`);
          } else {
            const error = await putResponse.text();
            console.log(`❌ PUT /api/v1/companies/${createdCompany.id}: ${putResponse.status} - ${error}`);
          }
        } catch (error) {
          console.log(`❌ PUT /api/v1/companies/${createdCompany.id}: ERRORE - ${error.message}`);
        }
        
        // Test 5: DELETE /companies/:id (eliminazione)
        console.log('\n🗑️ Test 5: DELETE /api/v1/companies/:id');
        try {
          const deleteResponse = await makeRequest('DELETE', `/api/v1/companies/${createdCompany.id}`, null, token);
          
          if (deleteResponse.ok) {
            console.log(`✅ DELETE /api/v1/companies/${createdCompany.id}: Company eliminata con successo`);
          } else {
            const error = await deleteResponse.text();
            console.log(`❌ DELETE /api/v1/companies/${createdCompany.id}: ${deleteResponse.status} - ${error}`);
          }
        } catch (error) {
          console.log(`❌ DELETE /api/v1/companies/${createdCompany.id}: ERRORE - ${error.message}`);
        }
        
      } else {
        const error = await response.text();
        console.log(`❌ POST /api/v1/companies: ${response.status} - ${error}`);
      }
    } catch (error) {
      console.log(`❌ POST /api/v1/companies: ERRORE - ${error.message}`);
    }
    
    console.log('\n🎉 Test integrazione completato!');
    
  } catch (error) {
    console.log(`❌ Errore durante il test: ${error.message}`);
    console.log(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Esegui il test
testCompaniesAdvancedPermissions();