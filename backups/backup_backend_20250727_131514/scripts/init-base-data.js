/**
 * Script di inizializzazione dati di base per la gerarchia dei ruoli
 * Crea l'account admin e imposta la gerarchia dei ruoli
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import logger from '../utils/logger.js';

const prisma = new PrismaClient();

class DataInitializer {
    constructor() {
        this.adminCredentials = {
            email: 'admin@example.com',
            password: 'Admin123!',
            firstName: 'Admin',
            lastName: 'User'
        };
    }

    async log(message) {
        const logMessage = `[${new Date().toISOString()}] ${message}`;
        console.log(logMessage);
        console.error(logMessage); // Aggiungo anche stderr per debug
        try {
            logger.info(message, { component: 'data-initializer' });
        } catch (err) {
            console.error('Logger error:', err.message);
        }
    }

    async initialize() {
        try {
            await this.log('🚀 Inizio inizializzazione dati di base');

            // 1. Verifica/crea tenant di default
            const defaultTenant = await this.ensureDefaultTenant();
            
            // 2. Crea/aggiorna account admin
            const adminPerson = await this.createAdminAccount(defaultTenant.id);
            
            // 3. Imposta gerarchia dei ruoli
            await this.setupRoleHierarchy(adminPerson.id, defaultTenant.id);
            
            // 4. Crea permessi di base
            await this.createBasePermissions(adminPerson.id, defaultTenant.id);

            await this.log('✅ Inizializzazione completata con successo');
            
        } catch (error) {
            await this.log(`❌ Errore durante l'inizializzazione: ${error.message}`);
            throw error;
        } finally {
            await prisma.$disconnect();
        }
    }

    async ensureDefaultTenant() {
        await this.log('📋 Verifica tenant di default...');
        
        // Prima cerca il tenant globale esistente
        let tenant = await prisma.tenant.findFirst({
            where: { slug: 'global' }
        });

        if (!tenant) {
            // Se non esiste il tenant globale, cerca quello default
            tenant = await prisma.tenant.findFirst({
                where: { slug: 'default' }
            });
        }

        if (!tenant) {
            // Crea un nuovo tenant globale
            tenant = await prisma.tenant.create({
                data: {
                    name: 'Global Tenant',
                    slug: 'global',
                    domain: 'global.example.com',
                    settings: {},
                    billingPlan: 'enterprise',
                    maxUsers: 1000,
                    maxCompanies: 100,
                    isActive: true
                }
            });
            await this.log('✓ Tenant globale creato');
        } else {
            await this.log(`✓ Tenant esistente trovato: ${tenant.name} (${tenant.slug})`);
        }

        return tenant;
    }

    async createAdminAccount(tenantId) {
        await this.log('👤 Creazione/aggiornamento account admin...');
        
        // Verifica se l'admin esiste già
        let adminPerson = await prisma.person.findUnique({
            where: { email: this.adminCredentials.email }
        });

        const hashedPassword = await bcrypt.hash(this.adminCredentials.password, 12);

        if (!adminPerson) {
            // Crea nuovo admin
            adminPerson = await prisma.person.create({
                data: {
                    firstName: this.adminCredentials.firstName,
                    lastName: this.adminCredentials.lastName,
                    email: this.adminCredentials.email,
                    password: hashedPassword,
                    status: 'ACTIVE',
                    globalRole: 'ADMIN',
                    tenantId: tenantId,
                    gdprConsentDate: new Date(),
                    gdprConsentVersion: '1.0'
                }
            });
            await this.log('✓ Account admin creato');
        } else {
            // Aggiorna admin esistente
            adminPerson = await prisma.person.update({
                where: { id: adminPerson.id },
                data: {
                    password: hashedPassword,
                    globalRole: 'ADMIN',
                    status: 'ACTIVE',
                    tenantId: tenantId
                }
            });
            await this.log('✓ Account admin aggiornato');
        }

        return adminPerson;
    }

    async setupRoleHierarchy(adminPersonId, tenantId) {
        await this.log('🏗️ Configurazione gerarchia dei ruoli...');

        // Definizione della gerarchia dei ruoli
        const roleHierarchy = [
            { roleType: 'SUPER_ADMIN', level: 1, path: '1' },
            { roleType: 'ADMIN', level: 2, path: '1.2' },
            { roleType: 'COMPANY_ADMIN', level: 3, path: '1.2.3' },
            { roleType: 'TRAINER', level: 4, path: '1.2.3.4' },
            { roleType: 'EMPLOYEE', level: 5, path: '1.2.3.4.5' }
        ];

        // Rimuovi ruoli esistenti per l'admin
        await prisma.personRole.deleteMany({
            where: { personId: adminPersonId }
        });

        // Crea il ruolo ADMIN per l'account admin
        const adminRole = await prisma.personRole.create({
            data: {
                personId: adminPersonId,
                roleType: 'ADMIN',
                level: 2,
                path: '1.2',
                isActive: true,
                isPrimary: true,
                tenantId: tenantId,
                assignedBy: adminPersonId
            }
        });

        await this.log('✓ Ruolo ADMIN assegnato all\'account admin');

        // Verifica se esiste un SUPER_ADMIN
        const superAdminExists = await prisma.person.findFirst({
            where: {
                globalRole: 'SUPER_ADMIN',
                tenantId: tenantId
            }
        });

        if (!superAdminExists) {
            // Crea un SUPER_ADMIN di sistema
            const superAdmin = await prisma.person.create({
                data: {
                    firstName: 'Super',
                    lastName: 'Admin',
                    email: 'superadmin@system.local',
                    password: await bcrypt.hash('SuperAdmin123!', 12),
                    status: 'ACTIVE',
                    globalRole: 'SUPER_ADMIN',
                    tenantId: tenantId,
                    gdprConsentDate: new Date(),
                    gdprConsentVersion: '1.0'
                }
            });

            await prisma.personRole.create({
                data: {
                    personId: superAdmin.id,
                    roleType: 'SUPER_ADMIN',
                    level: 1,
                    path: '1',
                    isActive: true,
                    isPrimary: true,
                    tenantId: tenantId,
                    assignedBy: superAdmin.id
                }
            });

            // Imposta la relazione gerarchica: ADMIN sotto SUPER_ADMIN
            await prisma.personRole.update({
                where: { id: adminRole.id },
                data: {
                    parentRoleId: (await prisma.personRole.findFirst({
                        where: { personId: superAdmin.id, roleType: 'SUPER_ADMIN' }
                    })).id
                }
            });

            await this.log('✓ SUPER_ADMIN di sistema creato e gerarchia configurata');
        }

        return adminRole;
    }

    async createBasePermissions(adminPersonId, tenantId) {
        await this.log('🔐 Creazione permessi di base...');

        // Trova il ruolo admin
        const adminRole = await prisma.personRole.findFirst({
            where: {
                personId: adminPersonId,
                roleType: 'ADMIN',
                isActive: true
            }
        });

        if (!adminRole) {
            throw new Error('Ruolo admin non trovato');
        }

        // Permessi di base per l'admin
        const basePermissions = [
            'VIEW_COMPANIES',
            'CREATE_COMPANIES', 
            'EDIT_COMPANIES',
            'DELETE_COMPANIES',
            'VIEW_EMPLOYEES',
            'CREATE_EMPLOYEES',
            'EDIT_EMPLOYEES',
            'DELETE_EMPLOYEES',
            'VIEW_USERS',
            'CREATE_USERS',
            'EDIT_USERS',
            'DELETE_USERS',
            'ADMIN_PANEL',
            'USER_MANAGEMENT',
            'ROLE_MANAGEMENT',
            'SYSTEM_SETTINGS'
        ];

        // Rimuovi permessi esistenti
        await prisma.rolePermission.deleteMany({
            where: { personRoleId: adminRole.id }
        });

        // Crea nuovi permessi
        for (const permission of basePermissions) {
            await prisma.rolePermission.create({
                data: {
                    personRoleId: adminRole.id,
                    permission: permission,
                    isGranted: true,
                    grantedBy: adminPersonId
                }
            });
        }

        await this.log(`✓ ${basePermissions.length} permessi di base creati per l'admin`);
    }
}

// Esecuzione dello script
if (import.meta.url === `file://${process.argv[1]}`) {
    const initializer = new DataInitializer();
    initializer.initialize()
        .then(() => {
            console.log('✅ Inizializzazione completata');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Errore durante l\'inizializzazione:', error);
            process.exit(1);
        });
}

export default DataInitializer;