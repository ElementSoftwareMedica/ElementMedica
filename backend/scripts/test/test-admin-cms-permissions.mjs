import { PrismaClient } from './backend/node_modules/@prisma/client/index.js';

const prisma = new PrismaClient();

async function testAdminCMSPermissions() {
  try {
    console.log('🔍 Testing Admin CMS Permissions...\n');

    // 1. Trova l'admin
    const admin = await prisma.person.findFirst({
      where: {
        email: 'admin@example.com'
      },
      include: {
        personRoles: {
          include: {
            customRole: true,
            permissions: true
          }
        }
      }
    });

    if (!admin) {
      console.log('❌ Admin non trovato');
      return;
    }

    console.log('👤 Admin trovato:', {
      id: admin.id,
      email: admin.email,
      tenantId: admin.tenantId,
      roles: admin.personRoles.map(pr => pr.customRole?.name || pr.roleType)
    });

    // 2. Raccogli tutti i permessi dell'admin
    const allPermissions = new Set();
    
    admin.personRoles.forEach(personRole => {
      if (personRole.permissions) {
        personRole.permissions.forEach(perm => {
          allPermissions.add(perm.permission);
        });
      }
    });

    console.log('\n🔐 Permessi totali dell\'admin:', allPermissions.size);
    
    // 3. Filtra i permessi CMS
    const cmsPermissions = Array.from(allPermissions).filter(p => 
      p.includes('CMS') || p.includes('PUBLIC')
    );
    
    console.log('\n📋 Permessi CMS dell\'admin:');
    cmsPermissions.forEach(permission => {
      console.log(`  ✅ ${permission}`);
    });

    // 4. Verifica permessi specifici richiesti
    const requiredPermissions = [
      'VIEW_PUBLIC_CMS',
      'EDIT_PUBLIC_CMS', 
      'MANAGE_PUBLIC_CMS',
      'VIEW_CMS',
      'EDIT_CMS',
      'MANAGE_PUBLIC_CONTENT',
      'READ_PUBLIC_CONTENT'
    ];

    console.log('\n🧪 Verifica permessi richiesti:');
    requiredPermissions.forEach(permission => {
      const hasPermission = allPermissions.has(permission);
      console.log(`  ${hasPermission ? '✅' : '❌'} ${permission}`);
    });

    // 5. Test della conversione frontend
    console.log('\n🔄 Test conversione frontend:');
    const backendPermissions = {};
    allPermissions.forEach(p => {
      backendPermissions[p] = true;
    });

    // Simula la funzione convertBackendToFrontendPermissions
    const frontendPermissions = {};
    
    // Mantieni i permessi backend originali
    Object.keys(backendPermissions).forEach(key => {
      if (backendPermissions[key] === true) {
        frontendPermissions[key] = true;
      }
    });

    // Aggiungi le mappature specifiche per PUBLIC_CMS
    Object.keys(backendPermissions).forEach(backendKey => {
      if (backendPermissions[backendKey] === true) {
        if (backendKey === 'VIEW_PUBLIC_CMS') {
          frontendPermissions['PUBLIC_CMS:READ'] = true;
          frontendPermissions['PUBLIC_CMS:read'] = true;
        }
        else if (backendKey === 'EDIT_PUBLIC_CMS') {
          frontendPermissions['PUBLIC_CMS:UPDATE'] = true;
          frontendPermissions['PUBLIC_CMS:update'] = true;
        }
        else if (backendKey === 'MANAGE_PUBLIC_CMS') {
          frontendPermissions['PUBLIC_CMS:READ'] = true;
          frontendPermissions['PUBLIC_CMS:read'] = true;
          frontendPermissions['PUBLIC_CMS:UPDATE'] = true;
          frontendPermissions['PUBLIC_CMS:update'] = true;
        }
        else if (backendKey === 'VIEW_CMS') {
          frontendPermissions['PUBLIC_CMS:READ'] = true;
          frontendPermissions['PUBLIC_CMS:read'] = true;
        }
        else if (backendKey === 'EDIT_CMS') {
          frontendPermissions['PUBLIC_CMS:UPDATE'] = true;
          frontendPermissions['PUBLIC_CMS:update'] = true;
        }
        else if (backendKey === 'MANAGE_PUBLIC_CONTENT') {
          frontendPermissions['PUBLIC_CMS:READ'] = true;
          frontendPermissions['PUBLIC_CMS:read'] = true;
          frontendPermissions['PUBLIC_CMS:UPDATE'] = true;
          frontendPermissions['PUBLIC_CMS:update'] = true;
        }
      }
    });

    // Verifica permessi frontend
    const frontendCMSPermissions = Object.keys(frontendPermissions).filter(p => 
      p.includes('PUBLIC_CMS')
    );
    
    console.log('\n📱 Permessi frontend generati:');
    frontendCMSPermissions.forEach(permission => {
      console.log(`  ✅ ${permission}`);
    });

    // 6. Test specifico per i permessi richiesti dalla pagina
    console.log('\n🎯 Test permessi specifici pagina:');
    const pagePermissions = [
      'PUBLIC_CMS:READ',
      'PUBLIC_CMS:UPDATE'
    ];

    pagePermissions.forEach(permission => {
      const hasPermission = frontendPermissions[permission] === true;
      console.log(`  ${hasPermission ? '✅' : '❌'} ${permission}`);
    });

    // 7. Test chiamata API CMS con autenticazione
    console.log('\n🌐 Test chiamata API CMS con autenticazione...');
    try {
      // Prima fai login per ottenere il token
      console.log('  🔑 Effettuo login...');
      const loginResponse = await fetch('http://localhost:4003/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          identifier: 'admin@example.com',
          password: 'Admin123!'
        })
      });
      
      if (!loginResponse.ok) {
        console.log('  ❌ Login fallito:', loginResponse.status, loginResponse.statusText);
        return;
      }
      
      const loginData = await loginResponse.json();
      const token = loginData.accessToken;
      console.log('  ✅ Login riuscito, token ottenuto');
      
      // Ora testa l'API CMS con il token
      console.log('  📡 Chiamata API CMS...');
      const response = await fetch('http://localhost:4003/api/cms/courses', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('  Status:', response.status);
      console.log('  Status Text:', response.statusText);
      
      if (response.ok) {
        const data = await response.json();
        console.log('  ✅ API CMS accessibile');
        console.log('  📊 Corsi trovati:', data.data?.length || 0);
      } else {
        const errorData = await response.text();
        console.log('  ❌ API CMS non accessibile');
        console.log('  📄 Risposta:', errorData);
      }
    } catch (error) {
      console.log('  ❌ Errore chiamata API:', error.message);
    }

  } catch (error) {
    console.error('❌ Errore:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAdminCMSPermissions();