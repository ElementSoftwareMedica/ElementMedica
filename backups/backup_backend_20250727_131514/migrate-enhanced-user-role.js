/**
 * Script di migrazione per consolidare EnhancedUserRole in PersonRole
 * Questo script migra tutti i dati da EnhancedUserRole a PersonRole
 * aggiungendo i campi gerarchici necessari
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class EnhancedUserRoleMigration {
  constructor() {
    this.prisma = new PrismaClient();
    this.backupDir = path.join(__dirname, 'migration-backups');
    this.logFile = path.join(this.backupDir, `migration-log-${new Date().toISOString().replace(/[:.]/g, '-')}.log`);
  }

  async log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    console.log(logMessage.trim());
    
    try {
      await fs.mkdir(this.backupDir, { recursive: true });
      await fs.appendFile(this.logFile, logMessage);
    } catch (error) {
      console.error('Errore nella scrittura del log:', error);
    }
  }

  async checkPrerequisites() {
    await this.log('Verifica prerequisiti...');
    
    try {
      // Verifica che PersonRole abbia i campi gerarchici
      const personRoleFields = await this.prisma.$queryRaw`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'person_roles' 
        AND column_name IN ('parentRoleId', 'level', 'path')
      `;
      
      if (personRoleFields.length < 3) {
        throw new Error('PersonRole non ha tutti i campi gerarchici necessari. Eseguire prima la migrazione dello schema.');
      }
      
      await this.log('✓ PersonRole ha tutti i campi gerarchici necessari');
      
      // Verifica che EnhancedUserRole esista
      const enhancedUserRoleExists = await this.prisma.$queryRaw`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name = 'enhanced_user_roles'
      `;
      
      if (enhancedUserRoleExists.length === 0) {
        await this.log('⚠️ Tabella EnhancedUserRole non trovata - migrazione non necessaria');
        return false;
      }
      
      await this.log('✓ Tabella EnhancedUserRole trovata');
      return true;
    } catch (error) {
      await this.log(`❌ Errore nella verifica prerequisiti: ${error.message}`);
      throw error;
    }
  }

  async createBackup() {
    await this.log('Creazione backup dei dati EnhancedUserRole...');
    
    try {
      await fs.mkdir(this.backupDir, { recursive: true });
      
      const enhancedUserRoles = await this.prisma.$queryRaw`
        SELECT * FROM enhanced_user_roles
      `;
      
      const backupFile = path.join(this.backupDir, `enhanced-user-roles-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
      await fs.writeFile(backupFile, JSON.stringify(enhancedUserRoles, null, 2));
      
      await this.log(`✓ Backup creato: ${backupFile}`);
      await this.log(`✓ ${enhancedUserRoles.length} record salvati nel backup`);
      
      return enhancedUserRoles;
    } catch (error) {
      await this.log(`❌ Errore nella creazione del backup: ${error.message}`);
      throw error;
    }
  }

  getRoleHierarchyMapping() {
    // Mappa dei livelli gerarchici per tipo di ruolo
    return {
      'SUPER_ADMIN': { level: 0, parentRole: null },
      'ADMIN': { level: 1, parentRole: 'SUPER_ADMIN' },
      'COMPANY_ADMIN': { level: 2, parentRole: 'ADMIN' },
      'TENANT_ADMIN': { level: 2, parentRole: 'ADMIN' },
      'HR_MANAGER': { level: 3, parentRole: 'COMPANY_ADMIN' },
      'DEPARTMENT_HEAD': { level: 3, parentRole: 'COMPANY_ADMIN' },
      'TRAINER_COORDINATOR': { level: 4, parentRole: 'HR_MANAGER' },
      'SENIOR_TRAINER': { level: 4, parentRole: 'TRAINER_COORDINATOR' },
      'MANAGER': { level: 4, parentRole: 'DEPARTMENT_HEAD' },
      'TRAINER': { level: 5, parentRole: 'SENIOR_TRAINER' },
      'EXTERNAL_TRAINER': { level: 5, parentRole: 'TRAINER_COORDINATOR' },
      'SUPERVISOR': { level: 5, parentRole: 'MANAGER' },
      'COORDINATOR': { level: 5, parentRole: 'MANAGER' },
      'OPERATOR': { level: 6, parentRole: 'SUPERVISOR' },
      'EMPLOYEE': { level: 6, parentRole: 'SUPERVISOR' },
      'VIEWER': { level: 7, parentRole: 'EMPLOYEE' },
      'GUEST': { level: 7, parentRole: 'VIEWER' },
      'CONSULTANT': { level: 6, parentRole: 'COORDINATOR' },
      'AUDITOR': { level: 4, parentRole: 'COMPANY_ADMIN' }
    };
  }

  async migrateData(enhancedUserRoles) {
    await this.log('Inizio migrazione dati...');
    
    const roleMapping = this.getRoleHierarchyMapping();
    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const role of enhancedUserRoles) {
      try {
        // Verifica se esiste già un PersonRole per questa persona/ruolo/tenant
        const existingRole = await this.prisma.personRole.findFirst({
          where: {
            personId: role.personId,
            roleType: role.roleType,
            tenantId: role.tenantId,
            companyId: role.companyId
          }
        });

        if (existingRole) {
          await this.log(`⚠️ PersonRole già esistente per persona ${role.personId}, ruolo ${role.roleType} - aggiornamento`);
          
          // Aggiorna con i dati gerarchici
          const hierarchyData = roleMapping[role.roleType] || { level: 0, parentRole: null };
          
          await this.prisma.personRole.update({
            where: { id: existingRole.id },
            data: {
              level: hierarchyData.level,
              path: this.generatePath(hierarchyData.level, existingRole.id),
              validUntil: role.expiresAt,
              // Migra i permessi personalizzati se presenti
              ...(role.permissions && typeof role.permissions === 'object' && {
                // I permessi personalizzati verranno gestiti separatamente
              })
            }
          });
          
          migratedCount++;
        } else {
          // Crea nuovo PersonRole
          const hierarchyData = roleMapping[role.roleType] || { level: 0, parentRole: null };
          
          // Trova il parentRoleId se esiste un ruolo padre
          let parentRoleId = null;
          if (hierarchyData.parentRole) {
            const parentRole = await this.prisma.personRole.findFirst({
              where: {
                personId: role.personId,
                roleType: hierarchyData.parentRole,
                tenantId: role.tenantId,
                isActive: true
              }
            });
            parentRoleId = parentRole?.id || null;
          }

          const newPersonRole = await this.prisma.personRole.create({
            data: {
              personId: role.personId,
              roleType: role.roleType,
              isActive: role.isActive !== false,
              isPrimary: role.isPrimary || false,
              assignedAt: role.assignedAt || new Date(),
              assignedBy: role.assignedBy,
              validFrom: role.validFrom || new Date(),
              validUntil: role.expiresAt,
              companyId: role.companyId,
              tenantId: role.tenantId,
              departmentId: role.departmentId,
              parentRoleId: parentRoleId,
              level: hierarchyData.level,
              path: this.generatePath(hierarchyData.level, null), // Sarà aggiornato dopo la creazione
              createdAt: role.createdAt || new Date(),
              updatedAt: role.updatedAt || new Date()
            }
          });

          // Aggiorna il path con l'ID reale
          await this.prisma.personRole.update({
            where: { id: newPersonRole.id },
            data: {
              path: this.generatePath(hierarchyData.level, newPersonRole.id)
            }
          });

          migratedCount++;
        }
      } catch (error) {
        await this.log(`❌ Errore nella migrazione del ruolo ${role.id}: ${error.message}`);
        errorCount++;
      }
    }

    await this.log(`✓ Migrazione completata:`);
    await this.log(`  - Record migrati: ${migratedCount}`);
    await this.log(`  - Record saltati: ${skippedCount}`);
    await this.log(`  - Errori: ${errorCount}`);

    return { migratedCount, skippedCount, errorCount };
  }

  generatePath(level, roleId) {
    // Genera un path gerarchico semplice basato sul livello
    const pathSegments = [];
    for (let i = 0; i <= level; i++) {
      pathSegments.push(i === level && roleId ? roleId.substring(0, 8) : (i + 1).toString());
    }
    return pathSegments.join('.');
  }

  async verifyMigration() {
    await this.log('Verifica integrità migrazione...');
    
    try {
      const enhancedUserRoleCount = await this.prisma.$queryRaw`
        SELECT COUNT(*) as count FROM enhanced_user_roles
      `;
      
      const personRoleCount = await this.prisma.personRole.count();
      
      await this.log(`✓ Record EnhancedUserRole: ${enhancedUserRoleCount[0].count}`);
      await this.log(`✓ Record PersonRole totali: ${personRoleCount}`);
      
      // Verifica duplicati
      const duplicates = await this.prisma.personRole.groupBy({
        by: ['personId', 'roleType', 'tenantId', 'companyId'],
        having: {
          personId: {
            _count: {
              gt: 1
            }
          }
        }
      });
      
      if (duplicates.length > 0) {
        await this.log(`⚠️ Trovati ${duplicates.length} possibili duplicati in PersonRole`);
      } else {
        await this.log('✓ Nessun duplicato trovato in PersonRole');
      }
      
      return true;
    } catch (error) {
      await this.log(`❌ Errore nella verifica: ${error.message}`);
      return false;
    }
  }

  async dropEnhancedUserRoleTable() {
    await this.log('Rimozione tabella EnhancedUserRole...');
    
    try {
      await this.prisma.$executeRaw`DROP TABLE IF EXISTS enhanced_user_roles CASCADE`;
      await this.log('✓ Tabella EnhancedUserRole rimossa con successo');
    } catch (error) {
      await this.log(`❌ Errore nella rimozione della tabella: ${error.message}`);
      throw error;
    }
  }

  async rollback(backupData) {
    await this.log('ROLLBACK: Ripristino dati EnhancedUserRole...');
    
    try {
      // Ricrea la tabella (questo richiede lo schema originale)
      await this.log('⚠️ ROLLBACK non implementato - utilizzare il backup manualmente se necessario');
      await this.log(`Backup disponibile in: ${this.backupDir}`);
    } catch (error) {
      await this.log(`❌ Errore nel rollback: ${error.message}`);
      throw error;
    }
  }

  async run() {
    try {
      await this.log('=== INIZIO MIGRAZIONE ENHANCED USER ROLE ===');
      
      // 1. Verifica prerequisiti
      const canProceed = await this.checkPrerequisites();
      if (!canProceed) {
        await this.log('Migrazione non necessaria o non possibile');
        return;
      }
      
      // 2. Backup
      const backupData = await this.createBackup();
      
      // 3. Migrazione
      const result = await this.migrateData(backupData);
      
      // 4. Verifica
      const verificationPassed = await this.verifyMigration();
      
      if (verificationPassed && result.errorCount === 0) {
        // 5. Rimozione tabella originale
        await this.dropEnhancedUserRoleTable();
        await this.log('✅ MIGRAZIONE COMPLETATA CON SUCCESSO');
      } else {
        await this.log('⚠️ MIGRAZIONE COMPLETATA CON ERRORI - Tabella EnhancedUserRole mantenuta');
      }
      
    } catch (error) {
      await this.log(`❌ ERRORE CRITICO: ${error.message}`);
      await this.log('La migrazione è stata interrotta');
      throw error;
    } finally {
      await this.prisma.$disconnect();
    }
  }
}

// Esecuzione dello script
const migration = new EnhancedUserRoleMigration();
migration.run().catch(console.error);