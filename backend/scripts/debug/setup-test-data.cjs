const http = require('http');
const https = require('https');
const { URL } = require('url');

const API_BASE_URL = 'http://localhost:4003';

// Dati di test
const testUser = {
  email: 'test@example.com',
  password: 'password123'
};

const testCompany = {
  ragioneSociale: 'Test Company SRL',
  piva: '12345678901',
  mail: 'info@testcompany.com',
  sedeAzienda: 'Via Test 123, Milano',
  personaRiferimento: 'Mario Rossi',
  telefono: '+39 02 1234567'
};

const testSites = [
  {
    nome: 'Sede Principale',
    indirizzo: 'Via Test 123, Milano',
    citta: 'Milano',
    cap: '20100',
    provincia: 'MI',
    regione: 'Lombardia',
    nazione: 'Italia',
    telefono: '+39 02 1234567',
    email: 'milano@testcompany.com'
  },
  {
    nome: 'Filiale Roma',
    indirizzo: 'Via Roma 456, Roma',
    citta: 'Roma',
    cap: '00100',
    provincia: 'RM',
    regione: 'Lazio',
    nazione: 'Italia',
    telefono: '+39 06 7654321',
    email: 'roma@testcompany.com'
  }
];

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    try {
      const urlObj = new URL(url);
      const isHttps = urlObj.protocol === 'https:';
      const httpModule = isHttps ? https : http;
      
      const requestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port || (isHttps ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      };

      const req = httpModule.request(requestOptions, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          let jsonData;
          try {
            jsonData = JSON.parse(data);
          } catch (e) {
            jsonData = data;
          }
          
          resolve({
            status: res.statusCode,
            ok: res.statusCode >= 200 && res.statusCode < 300,
            data: jsonData
          });
        });
      });

      req.on('error', (error) => {
        console.error('Request failed:', error.message);
        resolve({
          status: undefined,
          ok: false,
          data: undefined,
          error: error.message
        });
      });

      if (options.body) {
        req.write(options.body);
      }
      
      req.end();
    } catch (error) {
      console.error('Request setup failed:', error.message);
      resolve({
        status: undefined,
        ok: false,
        data: undefined,
        error: error.message
      });
    }
  });
}

async function login() {
  console.log('🔐 Attempting login...');
  
  const response = await makeRequest(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    body: JSON.stringify(testUser)
  });

  if (!response.ok) {
    throw new Error(`Login failed: ${JSON.stringify(response)}`);
  }

  console.log('✅ Login successful');
  return response.data;
}

async function createCompany(token, tenantId) {
  console.log('🏢 Creating company...');
  
  const companyData = {
    ...testCompany,
    tenantId
  };

  const response = await makeRequest(`${API_BASE_URL}/companies`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(companyData)
  });

  if (!response.ok) {
    throw new Error(`Company creation failed: ${JSON.stringify(response)}`);
  }

  console.log('✅ Company created successfully');
  return response.data;
}

async function createSite(token, companyId, siteData) {
  console.log(`🏭 Creating site: ${siteData.nome}...`);
  
  const response = await makeRequest(`${API_BASE_URL}/companies/${companyId}/sites`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(siteData)
  });

  if (!response.ok) {
    throw new Error(`Site creation failed for ${siteData.nome}: ${JSON.stringify(response)}`);
  }

  console.log(`✅ Site ${siteData.nome} created successfully`);
  return response.data;
}

async function setupTestData() {
  try {
    console.log('🚀 Starting test data setup...');
    
    // 1. Login
    const loginResult = await login();
    const token = loginResult.token;
    const tenantId = loginResult.user?.tenantId;
    
    if (!token) {
      throw new Error('No token received from login');
    }
    
    if (!tenantId) {
      throw new Error('No tenantId received from login');
    }
    
    console.log(`📋 Using tenantId: ${tenantId}`);

    // 2. Create company
    const company = await createCompany(token, tenantId);
    const companyId = company.id;
    
    if (!companyId) {
      throw new Error('No company ID received');
    }
    
    console.log(`🏢 Company created with ID: ${companyId}`);

    // 3. Create sites
    const createdSites = [];
    for (const siteData of testSites) {
      const site = await createSite(token, companyId, siteData);
      createdSites.push(site);
    }

    console.log('🎉 Test data setup completed successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - Company: ${company.ragioneSociale} (ID: ${companyId})`);
    console.log(`   - Sites: ${createdSites.length}`);
    createdSites.forEach((site, index) => {
      console.log(`     ${index + 1}. ${site.nome} (ID: ${site.id})`);
    });

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

// Run the setup
setupTestData();