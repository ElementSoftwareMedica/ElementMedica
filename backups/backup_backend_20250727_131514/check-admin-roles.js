/**
 * Script per verificare i ruoli dell'utente admin
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAdminRoles() {
  try {
    console.log('🔍 Verificando ruoli admin...');
    
    // Trova l'utente admin
    const admin = await prisma.person.findFirst({
      where: { email: 'admin@example.com' },
      include: {
        personRoles: {
          where: { isActive: true },
          include: {
            permissions: true
          }
        }
      }
    });

    if (!admin) {
      console.log('❌ Utente admin non trovato');
      return;
    }

    console.log(`✅ Admin trovato: ${admin.firstName} ${admin.lastName}`);
    console.log(`📧 Email: ${admin.email}`);
    console.log(`🆔 ID: ${admin.id}`);

    console.log('\n📋 Ruoli attivi:');
    admin.personRoles.forEach((role, index) => {
      console.log(`  ${index + 1}. Tipo: ${role.roleType}`);
      console.log(`     ID: ${role.id}`);
      console.log(`     Primario: ${role.isPrimary}`);
      console.log(`     Attivo: ${role.isActive}`);
      console.log(`     Permessi: ${role.permissions.length}`);
      console.log('');
    });

    // Se non ha SUPER_ADMIN, verifica se ha ADMIN
    const adminRole = admin.personRoles.find(role => role.roleType === 'ADMIN');
    if (adminRole) {
      console.log('✅ Ruolo ADMIN trovato, verificando permessi...');
      
      const personsPermissions = adminRole.permissions.filter(p => 
        p.permission.includes('PERSONS') || 
        p.permission.includes('EMPLOYEES') || 
        p.permission.includes('TRAINERS')
      );
      
      console.log('\n🔍 Permessi relativi a persons/employees/trainers:');
      personsPermissions.forEach(p => {
        console.log(`  ✓ ${p.permission} (granted: ${p.isGranted})`);
      });
    }

  } catch (error) {
    console.error('❌ Errore:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdminRoles();