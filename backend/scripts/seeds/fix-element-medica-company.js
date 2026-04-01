/**
 * P69: Script per verificare e creare la Company mancante per ElementMedica
 * 
 * Questo script verifica che il tenant ElementMedica abbia una Company associata
 * e la crea se manca.
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function fixElementMedicaCompany() {
    console.log('🔍 Verificando tenant Element Medica...\n');

    try {
        // 1. Trova il tenant ElementMedica
        const tenant = await prisma.tenant.findFirst({
            where: {
                OR: [
                    { slug: 'element-medica' },
                    { id: 'tenant-id-medica' },
                    { name: { contains: 'Element Medica', mode: 'insensitive' } }
                ]
            },
            include: {
                selfCompanyProfile: {
                    include: {
                        company: true
                    }
                }
            }
        });

        if (!tenant) {
            console.log('❌ Tenant Element Medica non trovato!');
            return;
        }

        console.log(`✅ Tenant trovato: ${tenant.name} (${tenant.id})`);
        console.log(`   Slug: ${tenant.slug}`);
        console.log(`   Domain: ${tenant.domain || 'N/D'}`);
        console.log(`   selfCompanyProfileId: ${tenant.selfCompanyProfileId || 'N/D'}`);

        // 2. Verifica se ha già una company associata
        if (tenant.selfCompanyProfile?.company) {
            console.log('\n✅ Company già associata:');
            console.log(`   Ragione Sociale: ${tenant.selfCompanyProfile.company.ragioneSociale}`);
            console.log(`   Company ID: ${tenant.selfCompanyProfile.company.id}`);
            console.log(`   CompanyTenantProfile ID: ${tenant.selfCompanyProfile.id}`);
            return;
        }

        // 3. Cerca se esiste già un CompanyTenantProfile per questo tenant
        const existingProfile = await prisma.companyTenantProfile.findFirst({
            where: {
                tenantId: tenant.id,
                isPrimary: true,
                deletedAt: null
            },
            include: {
                company: true
            }
        });

        if (existingProfile?.company) {
            console.log('\n⚠️  CompanyTenantProfile trovato ma non collegato al tenant!');
            console.log(`   Collegando ${existingProfile.company.ragioneSociale}...`);

            await prisma.tenant.update({
                where: { id: tenant.id },
                data: { selfCompanyProfileId: existingProfile.id }
            });

            console.log('✅ Collegamento completato!');
            return;
        }

        // 4. Crea la Company e il CompanyTenantProfile
        console.log('\n📝 Creando Company per Element Medica...');

        const result = await prisma.$transaction(async (tx) => {
            // Crea la Company
            const company = await tx.company.create({
                data: {
                    ragioneSociale: 'Element Medica S.r.l.',
                    formaGiuridica: 'SRL',
                    // Questi campi possono essere aggiornati dall'admin
                    piva: null,
                    codiceFiscale: null,
                    sedeLegaleIndirizzo: null,
                    sedeLegaleCitta: null,
                    sedeLegaleCap: null,
                    sedeLegaleProvincia: null,
                    sdi: null,
                    pecFatturazione: null
                }
            });

            console.log(`   ✅ Company creata: ${company.id}`);

            // Crea il CompanyTenantProfile
            const profile = await tx.companyTenantProfile.create({
                data: {
                    companyId: company.id,
                    tenantId: tenant.id,
                    status: 'ACTIVE',
                    isActive: true,
                    isPrimary: true
                }
            });

            console.log(`   ✅ CompanyTenantProfile creato: ${profile.id}`);

            // Aggiorna il tenant con selfCompanyProfileId
            await tx.tenant.update({
                where: { id: tenant.id },
                data: { selfCompanyProfileId: profile.id }
            });

            console.log(`   ✅ Tenant aggiornato con selfCompanyProfileId`);

            return { company, profile };
        });

        console.log('\n🎉 Operazione completata con successo!');
        console.log(`   Company: ${result.company.ragioneSociale} (${result.company.id})`);
        console.log(`   Profile: ${result.profile.id}`);

    } catch (error) {
        console.error('❌ Errore:', error.message);
        console.error(error.stack);
    } finally {
        await prisma.$disconnect();
    }
}

// Esegui
fixElementMedicaCompany()
    .then(() => process.exit(0))
    .catch((e) => {
        console.error(e);
        process.exit(1);
    });
