#!/usr/bin/env node

import prisma from './backend/config/prisma-optimization.js';

async function checkAdminTenant() {
  try {
    console.log('🔍 Controllo dati admin...\n');

    // Trova l'utente admin
    const admin = await prisma.person.findFirst({
      where: {
        email: 'admin@example.com'
      },
      include: {
        personRoles: {
          include: {
            permissions: true
          }
        }
      }
    });

    if (!admin) {
      console.log('❌ Admin non trovato');
      return;
    }

    console.log('✅ Admin trovato:');
    console.log(`ID: ${admin.id}`);
    console.log(`Email: ${admin.email}`);
    console.log(`TenantId: ${admin.tenantId || 'NULL'}`);
    console.log(`CompanyId: ${admin.companyId || 'NULL'}`);
    console.log(`Status: ${admin.status}`);
    console.log(`GlobalRole: ${admin.globalRole || 'NULL'}`);

    console.log('\n📋 Ruoli:');
    admin.personRoles.forEach(role => {
      console.log(`- ${role.roleType} (Active: ${role.isActive})`);
    });

    // Controlla se esiste almeno un tenant
    const tenants = await prisma.tenant.findMany({
      select: {
        id: true,
        name: true,
        isActive: true
      }
    });

    console.log('\n🏢 Tenants disponibili:');
    tenants.forEach(tenant => {
      console.log(`- ${tenant.id}: ${tenant.name} (Active: ${tenant.isActive})`);
    });

    // Se admin non ha tenantId, assegna il primo tenant attivo
    if (!admin.tenantId && tenants.length > 0) {
      const firstActiveTenant = tenants.find(t => t.isActive) || tenants[0];
      
      console.log(`\n🔧 Assegno tenant ${firstActiveTenant.id} all'admin...`);
      
      await prisma.person.update({
        where: { id: admin.id },
        data: { tenantId: firstActiveTenant.id }
      });
      
      console.log('✅ TenantId assegnato all\'admin');
    }

  } catch (error) {
    console.error('❌ Errore:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdminTenant();