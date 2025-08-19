const prisma = new PrismaClient();

async function addSuperAdminRole() {
  try {
    console.log('🔧 Aggiunta ruolo SUPER_ADMIN a admin@example.com');
    console.log('=' .repeat(60));
    
    // Find admin user
    const admin = await prisma.person.findFirst({
      where: {
        email: 'admin@example.com',
        status: 'ACTIVE',
        deletedAt: null
      },
      include: {
        personRoles: true
      }
    });
    
    if (!admin) {
      console.log('❌ Utente admin@example.com NON TROVATO!');
      return;
    }
    
    console.log('✅ Utente admin trovato:', admin.email);
    
    // Check if SUPER_ADMIN role already exists
    const existingSuperAdminRole = admin.personRoles.find(
      role => role.roleType === 'SUPER_ADMIN' && role.isActive
    );
    
    if (existingSuperAdminRole) {
      console.log('✅ Ruolo SUPER_ADMIN già presente e attivo');
      return;
    }
    
    // Add SUPER_ADMIN role
    const newRole = await prisma.personRole.create({
      data: {
        person: {
          connect: { id: admin.id }
        },
        roleType: 'SUPER_ADMIN',
        ...(admin.companyId && {
          company: {
            connect: { id: admin.companyId }
          }
        }),
        tenant: {
          connect: { id: admin.tenantId }
        },
        isActive: true
      }
    });
    
    console.log('✅ Ruolo SUPER_ADMIN aggiunto con successo!');
    console.log('🆔 ID ruolo:', newRole.id);
    console.log('🏷️ Tipo:', newRole.roleType);
    console.log('✅ Attivo:', newRole.isActive);
    
    // Verify the change
    const updatedAdmin = await prisma.person.findFirst({
      where: {
        email: 'admin@example.com'
      },
      include: {
        personRoles: {
          where: {
            isActive: true
          }
        }
      }
    });
    
    const activeRoles = updatedAdmin.personRoles.map(role => role.roleType);
    console.log('\n🎯 Ruoli attivi dopo l\'aggiornamento:', activeRoles);
    
    if (activeRoles.includes('SUPER_ADMIN')) {
      console.log('✅ Verifica completata: SUPER_ADMIN presente!');
      console.log('🚀 L\'utente admin@example.com ora può accedere a /api/tenants');
    } else {
      console.log('❌ Errore: SUPER_ADMIN non trovato dopo l\'aggiunta');
    }
    
  } catch (error) {
    console.error('❌ Errore durante l\'aggiunta del ruolo SUPER_ADMIN:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

addSuperAdminRole();