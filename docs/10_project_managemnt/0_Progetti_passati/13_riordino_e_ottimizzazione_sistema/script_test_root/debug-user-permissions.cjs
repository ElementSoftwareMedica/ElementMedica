const { Client } = require('./backend/node_modules/pg');

async function debugUserPermissions() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'projectdb',
    user: 'postgres',
    password: 'Fulmicotone50!'
  });

  const userId = 'c63e8520-9012-4fae-a16d-ca9741afcea1';
  
  try {
    await client.connect();
    console.log('🔍 Debug permessi utente', userId);
    console.log('============================================================');
    
    // 1. Ottieni informazioni sulla persona
    const personQuery = `
      SELECT id, "firstName", "lastName", email, "globalRole", "companyId"
      FROM "persons" 
      WHERE id = $1 AND "deletedAt" IS NULL
    `;
    const personResult = await client.query(personQuery, [userId]);
    
    if (personResult.rows.length === 0) {
      console.log('❌ Utente non trovato');
      return;
    }
    
    const person = personResult.rows[0];
    console.log('👤 Persona trovata:', {
      id: person.id,
      nome: `${person.firstName} ${person.lastName}`,
      email: person.email,
      globalRole: person.globalRole,
      companyId: person.companyId
    });
    
    // 2. Ottieni ruoli attivi
    const rolesQuery = `
      SELECT pr.id, pr."roleType", pr."isActive", pr."isPrimary", 
             pr."companyId", pr."validFrom", pr."validUntil"
      FROM "person_roles" pr
      WHERE pr."personId" = $1 AND pr."isActive" = true
    `;
    const rolesResult = await client.query(rolesQuery, [userId]);
    
    console.log('🎭 Ruoli attivi:', rolesResult.rows.length);
    rolesResult.rows.forEach(role => {
      console.log('  -', {
        id: role.id,
        roleType: role.roleType,
        isPrimary: role.isPrimary,
        companyId: role.companyId,
        validFrom: role.validFrom,
        validUntil: role.validUntil
      });
    });
    
    // 3. Ottieni permessi di base per 'companies'
    const basicPermissionsQuery = `
      SELECT DISTINCT rp.permission, rp."isGranted"
      FROM "role_permissions" rp
      JOIN "person_roles" pr ON rp."personRoleId" = pr.id
      WHERE pr."personId" = $1 
        AND pr."isActive" = true
        AND CAST(rp.permission AS TEXT) LIKE 'COMPANIES_%'
    `;
    const basicPermissionsResult = await client.query(basicPermissionsQuery, [userId]);
    
    console.log('🔐 Permessi di base per companies:', basicPermissionsResult.rows.length);
    basicPermissionsResult.rows.forEach(perm => {
      console.log('  -', perm.permission, ':', perm.isGranted ? '✅' : '❌');
    });

    // 4. Ottieni permessi avanzati
    const advancedPermissionsQuery = `
      SELECT ap.id, ap.resource, ap.action, ap."allowed_fields", 
             ap.conditions
      FROM "advanced_permissions" ap
      JOIN "person_roles" pr ON ap."person_role_id" = pr.id
      WHERE pr."personId" = $1 
        AND pr."isActive" = true
        AND ap.resource = 'companies'
    `;
    const advancedPermissionsResult = await client.query(advancedPermissionsQuery, [userId]);
    
    console.log('⚡ Permessi avanzati per companies:', advancedPermissionsResult.rows.length);
    advancedPermissionsResult.rows.forEach(perm => {
      console.log('  -', {
        id: perm.id,
        resource: perm.resource,
        action: perm.action,
        allowedFields: perm.allowed_fields,
        conditions: perm.conditions
      });
    });

    // 5. Verifica se è SUPER_ADMIN
    const isSuperAdmin = rolesResult.rows.some(role => role.roleType === 'SUPER_ADMIN');
    console.log('👑 È SUPER_ADMIN?', isSuperAdmin ? '✅' : '❌');
    
    // 6. Verifica Company associata
    if (person.companyId) {
      const companyQuery = `
        SELECT id, "ragione_sociale", "deletedAt"
        FROM "Company" 
        WHERE id = $1
      `;
      const companyResult = await client.query(companyQuery, [person.companyId]);
      
      if (companyResult.rows.length > 0) {
        const company = companyResult.rows[0];
        console.log('🏢 Company associata:', {
          id: company.id,
          ragioneSociale: company.ragione_sociale,
          eliminata: company.deletedAt ? '❌ Eliminata' : '✅ Attiva'
        });
      }
    }
    
    // 7. Riepilogo finale
    console.log('');
    console.log('📊 RIEPILOGO:');
    console.log(`   Ruoli attivi: ${rolesResult.rows.length}`);
    console.log(`   Permessi base companies: ${basicPermissionsResult.rows.filter(p => p.isGranted).length}`);
    console.log(`   Permessi avanzati companies: ${advancedPermissionsResult.rows.length}`);
    console.log(`   Super Admin: ${isSuperAdmin ? 'SÌ' : 'NO'}`);
    
  } catch (error) {
    console.error('❌ Errore durante il debug:', error.message);
  } finally {
    await client.end();
  }
}

debugUserPermissions();