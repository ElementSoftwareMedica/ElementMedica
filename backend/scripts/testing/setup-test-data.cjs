const axios = require('axios');

async function setupTestCompanyAndSite() {
  try {
    console.log('🔍 Setup: Creazione azienda e test sede completo');
    console.log('=' .repeat(60));
    
    // 1. Login
    console.log('\n1. Login...');
    const loginResponse = await axios.post('http://localhost:4001/api/auth/login', {
      identifier: 'admin@example.com',
      password: 'Admin123!'
    });
    
    const token = loginResponse.data.data.accessToken;
    console.log('✅ Login successful');
    
    // 2. Crea un'azienda di test con dati completi
    console.log('\n2. Creazione azienda di test...');
    const companyData = {
      ragioneSociale: 'Azienda Test SRL',
      piva: '12345678901',
      mail: 'test@azienda.com',
      sedeAzienda: 'Via Roma 123, Milano',
      personaRiferimento: 'Mario Rossi',
      tenantId: 'b80d46a8-9096-42f4-9421-db7bd26e9c47'
    };
    
    const companyResponse = await axios.post('http://localhost:4001/api/companies', companyData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Company created successfully!');
    console.log('🏢 Company details:', {
      id: companyResponse.data.id,
      ragioneSociale: companyResponse.data.ragioneSociale
    });
    
    const companyId = companyResponse.data.id;
    
    // 3. Crea una sede principale
    console.log('\n3. Creazione sede principale...');
    const siteData = {
      siteName: 'Sede Principale Milano',
      citta: 'Milano',
      indirizzo: 'Via Sede Principale 456',
      cap: '20100',
      provincia: 'MI',
      personaRiferimento: 'Mario Rossi',
      telefono: '02-7654321',
      mail: 'sede.milano@aziendastest.com',
      companyId: companyId,
      tenantId: 'b80d46a8-9096-42f4-9421-db7bd26e9c47'
    };
    
    const siteResponse = await axios.post('http://localhost:4001/api/company-sites', siteData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Main site created successfully!');
    console.log('📍 Site details:', {
      id: siteResponse.data.id,
      siteName: siteResponse.data.siteName,
      citta: siteResponse.data.citta
    });
    
    // 4. Crea una seconda sede per testare la visualizzazione multipla
    console.log('\n4. Creazione seconda sede...');
    const site2Data = {
      siteName: 'Sede Secondaria Roma',
      citta: 'Roma',
      indirizzo: 'Via Sede Secondaria 789',
      cap: '00100',
      provincia: 'RM',
      personaRiferimento: 'Giulia Bianchi',
      telefono: '06-9876543',
      mail: 'sede.roma@aziendastest.com',
      companyId: companyId,
      tenantId: 'b80d46a8-9096-42f4-9421-db7bd26e9c47'
    };
    
    const site2Response = await axios.post('http://localhost:4001/api/company-sites', site2Data, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Second site created successfully!');
    console.log('📍 Site details:', {
      id: site2Response.data.id,
      siteName: site2Response.data.siteName,
      citta: site2Response.data.citta
    });
    
    // 5. Verifica che entrambe le sedi siano state create
    console.log('\n5. Verifica sedi create...');
    const sitesResponse = await axios.get(`http://localhost:4001/api/company-sites/company/${companyId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Total sites created:', sitesResponse.data.sites.length);
    sitesResponse.data.sites.forEach((site, index) => {
      console.log(`   ${index + 1}. ${site.siteName} - ${site.citta} (ID: ${site.id})`);
    });
    
    // 6. Test creazione di una terza sede tramite frontend (simula il modal)
    console.log('\n6. Test creazione sede tramite modal (simulazione frontend)...');
    const site3Data = {
      siteName: 'Sede Test Modal',
      citta: 'Torino',
      indirizzo: 'Via Modal Test 321',
      cap: '10100',
      provincia: 'TO',
      personaRiferimento: 'Luca Verdi',
      telefono: '011-1234567',
      mail: 'sede.torino@aziendastest.com',
      companyId: companyId,
      tenantId: 'b80d46a8-9096-42f4-9421-db7bd26e9c47'
    };
    
    const site3Response = await axios.post('http://localhost:4001/api/company-sites', site3Data, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Modal test site created successfully!');
    console.log('📍 Site details:', {
      id: site3Response.data.id,
      siteName: site3Response.data.siteName,
      citta: site3Response.data.citta
    });
    
    // 7. Verifica finale
    console.log('\n7. Verifica finale...');
    const finalSitesResponse = await axios.get(`http://localhost:4001/api/company-sites/company/${companyId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Final sites count:', finalSitesResponse.data.sites.length);
    finalSitesResponse.data.sites.forEach((site, index) => {
      console.log(`   ${index + 1}. ${site.siteName} - ${site.citta}`);
    });
    
    console.log('\n🎉 Setup completato con successo!');
    console.log('✅ Azienda creata con 3 sedi per testare la visualizzazione');
    console.log('✅ La creazione di sedi aziendali funziona correttamente');
    console.log('✅ Ora puoi testare il frontend con dati reali');
    
    console.log('\n📋 Dati per test frontend:');
    console.log(`   Company ID: ${companyId}`);
    console.log(`   Company Name: ${companyResponse.data.ragioneSociale}`);
    console.log(`   Sites Count: ${finalSitesResponse.data.sites.length}`);
    
  } catch (error) {
    console.error('❌ Setup failed:', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      data: error.response?.data
    });
    
    if (error.response?.status === 500) {
      console.log('\n🔍 Possibili cause errore 500:');
      console.log('   - Database non accessibile');
      console.log('   - Schema database non aggiornato');
      console.log('   - Permessi insufficienti');
      console.log('   - Validazione dati fallita');
    }
  }
}

setupTestCompanyAndSite();