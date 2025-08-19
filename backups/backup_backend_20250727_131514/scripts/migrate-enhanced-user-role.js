import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';

const prisma = new PrismaClient();

/**
 * Script di migrazione per consolidare EnhancedUserRole in PersonRole
 * Questo script migra tutti i dati da EnhancedUserRole a PersonRole
 * mantenendo la compatibilità con la nuova gerarchia
 */

class EnhancedUserRoleMigration {
  
  /**
   * Esegue la migrazione completa
   */
  static async migrate() {
    try {
      logger.info('🚀 Inizio migrazione EnhancedUserRole → PersonRole');
      
      // 1. Verifica prerequisiti
      await this.checkPrerequisites();
      
      // 2. Backup dei dati esistenti
      await this.createBackup();
      
      // 3. Migra i dati
      const migratedCount = await this.migrateData();
      
      // 4. Verifica integrità
      await this.verifyMigration();
      
      logger.info(`✅ Migrazione completata con successo. ${migratedCount} record migrati.`);
      
      return {
        success: true,
        migratedCount,
        message: 'Migrazione completata con successo'
      };
      
    } catch (error) {
      logger.error('❌ Errore durante la migrazione:', error);
      throw error;
    }
  }

  /**
   * Verifica i prerequisiti per la migrazione
   */
  static async checkPrerequisites() {
    logger.info('🔍 Verifica prerequisiti...');
    
    // Verifica che PersonRole abbia i nuovi campi gerarchici
    const personRoleFields = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'PersonRole' 
      AND column_name IN ('parentRoleId', 'level', 'path')
    `;
    
    if (personRoleFields.length < 3) {
      throw new Error('PersonRole non ha i campi gerarchici necessari (parentRoleId, level, path)');
    }
    
    // Conta i record da migrare
    const enhancedRoleCount = await prisma.enhancedUserRole.count();
    logger.info(`📊 Trovati ${enhancedRoleCount} record EnhancedUserRole da migrare`);
    
    if (enhancedRoleCount === 0) {
      logger.info('ℹ️ Nessun record da migrare');
      return;
    }
  }

  /**
   * Crea un backup dei dati esistenti
   */
  static async createBackup() {
    logger.info('💾 Creazione backup...');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Backup EnhancedUserRole
    const enhancedRoles = await prisma.enhancedUserRole.findMany({
      include: {
        person: true,
        tenant: true,
        company: true
      }
    });
    
    // Salva il backup in un file JSON
    const fs = await import('fs/promises');
    const backupPath = `/Users/matteo.michielon/project 2.0/backend/backups/enhanced-user-role-backup-${timestamp}.json`;
    
    await fs.writeFile(backupPath, JSON.stringify({
      timestamp,
      count: enhancedRoles.length,
      data: enhancedRoles
    }, null, 2));
    
    logger.info(`💾 Backup salvato in: ${backupPath}`);
  }

  /**
   * Migra i dati da EnhancedUserRole a PersonRole
   */
  static async migrateData() {
    logger.info('🔄 Inizio migrazione dati...');
    
    const enhancedRoles = await prisma.enhancedUserRole.findMany({
      where: { isActive: true },
      include: {
        person: true,
        tenant: true,
        company: true
      }
    });
    
    let migratedCount = 0;
    
    for (const enhancedRole of enhancedRoles) {
      try {
        // Verifica se esiste già un PersonRole equivalente
        const existingPersonRole = await prisma.personRole.findFirst({
          where: {
            personId: enhancedRole.personId,
            tenantId: enhancedRole.tenantId,
            roleType: enhancedRole.roleType,
            companyId: enhancedRole.companyId,
            isActive: true
          }
        });
        
        if (existingPersonRole) {
          logger.info(`⚠️ PersonRole già esistente per ${enhancedRole.person.email} - ${enhancedRole.roleType}`);
          continue;
        }
        
        // Calcola i campi gerarchici
        const hierarchyData = await this.calculateHierarchyData(enhancedRole.roleType);
        
        // Crea il nuovo PersonRole
        const newPersonRole = await prisma.personRole.create({
          data: {
            personId: enhancedRole.personId,
            tenantId: enhancedRole.tenantId,
            roleType: enhancedRole.roleType,
            companyId: enhancedRole.companyId,
            departmentId: enhancedRole.departmentId,
            isActive: enhancedRole.isActive,
            isPrimary: false, // Sarà aggiornato successivamente se necessario
            assignedBy: enhancedRole.assignedBy,
            assignedAt: enhancedRole.assignedAt,
            validUntil: enhancedRole.expiresAt,
            createdAt: enhancedRole.createdAt,
            updatedAt: enhancedRole.updatedAt,
            // Nuovi campi gerarchici
            parentRoleId: hierarchyData.parentRoleId,
            level: hierarchyData.level,
            path: hierarchyData.path
          }
        });
        
        // Migra i permessi personalizzati se presenti
        if (enhancedRole.permissions && typeof enhancedRole.permissions === 'object') {
          await this.migrateCustomPermissions(newPersonRole.id, enhancedRole.permissions);
        }
        
        migratedCount++;
        logger.info(`✅ Migrato: ${enhancedRole.person.email} - ${enhancedRole.roleType}`);
        
      } catch (error) {
        logger.error(`❌ Errore migrazione ${enhancedRole.person.email}:`, error);
        // Continua con il prossimo record
      }
    }
    
    return migratedCount;
  }

  /**
   * Calcola i dati gerarchici per un tipo di ruolo
   */
  static async calculateHierarchyData(roleType) {
    // Mappa dei livelli gerarchici
    const roleLevels = {
      'SUPER_ADMIN': 0,
      'ADMIN': 1,
      'TENANT_ADMIN': 2,
      'COMPANY_ADMIN': 3,
      'HR_MANAGER': 4,
      'MANAGER': 5,
      'DEPARTMENT_HEAD': 6,
      'TRAINER_COORDINATOR': 7,
      'SENIOR_TRAINER': 8,
      'TRAINER': 9,
      'EXTERNAL_TRAINER': 10,
      'SUPERVISOR': 11,
      'COORDINATOR': 12,
      'OPERATOR': 13,
      'EMPLOYEE': 14,
      'VIEWER': 15,
      'GUEST': 16,
      'CONSULTANT': 17,
      'AUDITOR': 18
    };
    
    // Mappa dei ruoli padre
    const parentRoles = {
      'ADMIN': 'SUPER_ADMIN',
      'TENANT_ADMIN': 'ADMIN',
      'COMPANY_ADMIN': 'TENANT_ADMIN',
      'HR_MANAGER': 'COMPANY_ADMIN',
      'MANAGER': 'HR_MANAGER',
      'DEPARTMENT_HEAD': 'MANAGER',
      'TRAINER_COORDINATOR': 'DEPARTMENT_HEAD',
      'SENIOR_TRAINER': 'TRAINER_COORDINATOR',
      'TRAINER': 'SENIOR_TRAINER',
      'EXTERNAL_TRAINER': 'TRAINER_COORDINATOR',
      'SUPERVISOR': 'MANAGER',
      'COORDINATOR': 'SUPERVISOR',
      'OPERATOR': 'COORDINATOR',
      'EMPLOYEE': 'MANAGER',
      'VIEWER': 'EMPLOYEE',
      'GUEST': 'VIEWER',
      'CONSULTANT': 'COMPANY_ADMIN',
      'AUDITOR': 'ADMIN'
    };
    
    const level = roleLevels[roleType] || 99;
    const parentRoleType = parentRoles[roleType];
    let parentRoleId = null;
    let path = roleType;
    
    // Se ha un ruolo padre, cerca il parentRoleId nel database
    if (parentRoleType) {
      const parentRole = await prisma.personRole.findFirst({
        where: {
          roleType: parentRoleType,
          isActive: true
        },
        orderBy: { createdAt: 'asc' }
      });
      
      if (parentRole) {
        parentRoleId = parentRole.id;
        path = `${parentRole.path}/${roleType}`;
      } else {
        // Se non trova il parent, crea un path semplice
        path = `${parentRoleType}/${roleType}`;
      }
    }
    
    return {
      parentRoleId,
      level,
      path
    };
  }

  /**
   * Migra i permessi personalizzati
   */
  static async migrateCustomPermissions(personRoleId, permissions) {
    try {
      if (!permissions || !permissions.permissions || !Array.isArray(permissions.permissions)) {
        return;
      }
      
      for (const permission of permissions.permissions) {
        await prisma.rolePermission.create({
          data: {
            personRoleId,
            permissionId: permission,
            granted: true,
            assignedAt: new Date()
          }
        });
      }
      
    } catch (error) {
      logger.error('Errore migrazione permessi personalizzati:', error);
    }
  }

  /**
   * Verifica l'integrità della migrazione
   */
  static async verifyMigration() {
    logger.info('🔍 Verifica integrità migrazione...');
    
    const enhancedRoleCount = await prisma.enhancedUserRole.count({
      where: { isActive: true }
    });
    
    const personRoleCount = await prisma.personRole.count({
      where: { isActive: true }
    });
    
    logger.info(`📊 EnhancedUserRole attivi: ${enhancedRoleCount}`);
    logger.info(`📊 PersonRole attivi: ${personRoleCount}`);
    
    // Verifica che non ci siano duplicati
    const duplicates = await prisma.personRole.groupBy({
      by: ['personId', 'tenantId', 'roleType', 'companyId'],
      where: { isActive: true },
      having: {
        personId: {
          _count: {
            gt: 1
          }
        }
      }
    });
    
    if (duplicates.length > 0) {
      logger.warn(`⚠️ Trovati ${duplicates.length} possibili duplicati in PersonRole`);
    }
    
    logger.info('✅ Verifica integrità completata');
  }

  /**
   * Rollback della migrazione (solo per emergenze)
   */
  static async rollback(backupFile) {
    logger.info('🔄 Inizio rollback migrazione...');
    
    try {
      const fs = await import('fs/promises');
      const backupData = JSON.parse(await fs.readFile(backupFile, 'utf8'));
      
      // Rimuovi i PersonRole creati dalla migrazione
      await prisma.personRole.deleteMany({
        where: {
          createdAt: {
            gte: new Date(backupData.timestamp)
          }
        }
      });
      
      logger.info('✅ Rollback completato');
      
    } catch (error) {
      logger.error('❌ Errore durante il rollback:', error);
      throw error;
    }
  }
}

// Esporta la classe per l'uso in altri script
export default EnhancedUserRoleMigration;

// Se eseguito direttamente, avvia la migrazione
if (import.meta.url === `file://${process.argv[1]}`) {
  EnhancedUserRoleMigration.migrate()
    .then(result => {
      console.log('Migrazione completata:', result);
      process.exit(0);
    })
    .catch(error => {
      console.error('Errore migrazione:', error);
      process.exit(1);
    });
}