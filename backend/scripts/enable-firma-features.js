/**
 * Script per abilitare tutte le feature firma per il tenant ElementMedica.
 * 
 * Feature abilitabili SENZA integrazioni esterne:
 *   - SEMPLICE: sempre attiva (nessun featureKey richiesto)
 *   - FIRMA_GRAFOMETRICA: firma su tablet/pad con canvas — FUNZIONANTE
 *   - FIRMA_BIOMETRICA: dati biometrici firma — estende grafometrica, FUNZIONANTE
 * 
 * Feature che RICHIEDONO integrazioni esterne (SDK a pagamento):
 *   - FIRMA_FEQ: Aruba/InfoCert SDK (~€2.000-2.500/anno)
 *   - FIRMA_FEA: Provider FEA SDK
 *   - FIRMA_REMOTA: HSM cloud provider
 *   ⚠️ Queste vengono abilitate nel DB ma il flusso backend non è ancora implementato.
 * 
 * Esecuzione: node backend/scripts/enable-firma-features.js
 * 
 * @module scripts/enable-firma-features
 * @project P65 - Firma Digitale
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SIGNATURE_FEATURES = [
    {
        featureKey: 'FIRMA_GRAFOMETRICA',
        tier: 'PRO',
        isEnabled: true,
        usageLimit: null, // Illimitato
        config: {
            enableBiometric: true,
            canvasSize: { width: 600, height: 200 },
            minStrokeLength: 50
        },
        description: 'Firma grafometrica su tablet/pad — funzionante senza integrazioni esterne'
    },
    {
        featureKey: 'FIRMA_BIOMETRICA',
        tier: 'PRO',
        isEnabled: true,
        usageLimit: null,
        config: {
            encryptionAlgorithm: 'AES-256-GCM',
            retentionDays: 3650 // 10 anni
        },
        description: 'Dati biometrici firma — vault criptato AES-256, funzionante'
    },
    {
        featureKey: 'FIRMA_FEQ',
        tier: 'ENTERPRISE',
        isEnabled: true,
        usageLimit: null,
        config: {
            provider: 'ARUBA', // O 'INFOCERT'
            note: 'Backend SDK non ancora integrato — richiede abbonamento provider'
        },
        description: 'Firma Elettronica Qualificata — RICHIEDE SDK Aruba/InfoCert'
    },
    {
        featureKey: 'FIRMA_FEA',
        tier: 'PRO',
        isEnabled: true,
        usageLimit: null,
        config: {
            note: 'Backend SDK non ancora integrato — richiede provider FEA'
        },
        description: 'Firma Elettronica Avanzata — RICHIEDE provider FEA'
    },
    {
        featureKey: 'FIRMA_REMOTA',
        tier: 'ENTERPRISE',
        isEnabled: true,
        usageLimit: null,
        config: {
            note: 'Backend OTP flow non ancora implementato — richiede HSM cloud'
        },
        description: 'Firma remota OTP — RICHIEDE HSM cloud provider'
    }
];

async function enableSignatureFeatures() {
    console.log('🔐 Abilitazione feature firma per tenant ElementMedica...\n');

    // Trova TUTTI i tenant Element* (Medica e Formazione)
    const tenants = await prisma.tenant.findMany({
        where: {
            OR: [
                { slug: 'element-medica' },
                { slug: 'element-sicurezza' },
                { name: { contains: 'Element', mode: 'insensitive' } }
            ],
            deletedAt: null
        },
        select: { id: true, name: true, slug: true }
    });

    if (tenants.length === 0) {
        console.log('❌ Nessun tenant Element* trovato nel database.');
        console.log('   Assicurati di aver eseguito il seed create-multi-brand-tenants.js');
        return;
    }

    for (const tenant of tenants) {
        const tenantId = tenant.id;
        console.log(`\n🏢 Tenant: ${tenant.name} (${tenantId})`);

        for (const feature of SIGNATURE_FEATURES) {
            try {
                const existing = await prisma.tenantFeature.findUnique({
                    where: {
                        tenantId_featureKey: {
                            tenantId,
                            featureKey: feature.featureKey
                        }
                    }
                });

                if (existing) {
                    await prisma.tenantFeature.update({
                        where: { id: existing.id },
                        data: {
                            isEnabled: feature.isEnabled,
                            tier: feature.tier,
                            config: feature.config,
                            usageLimit: feature.usageLimit,
                            deletedAt: null
                        }
                    });
                    console.log(`   ♻️  ${feature.featureKey}: aggiornata (${feature.tier})`);
                } else {
                    await prisma.tenantFeature.create({
                        data: {
                            tenantId,
                            featureKey: feature.featureKey,
                            isEnabled: feature.isEnabled,
                            tier: feature.tier,
                            config: feature.config,
                            usageLimit: feature.usageLimit,
                            usageCount: 0,
                            enabledAt: new Date(),
                            enabledBy: 'system-script'
                        }
                    });
                    console.log(`   ✅ ${feature.featureKey}: abilitata (${feature.tier})`);
                }
            } catch (error) {
                console.error(`   ❌ ${feature.featureKey}: errore — ${error.message}`);
            }
        }
    }

    // Riepilogo
    console.log('\n📋 Riepilogo Feature Firma:');
    console.log('   ✅ SEMPLICE          — Sempre attiva (nessun featureKey)');
    console.log('   ✅ GRAFOMETRICA      — Abilitata, FUNZIONANTE (canvas + vault)');
    console.log('   ✅ BIOMETRICA        — Abilitata, FUNZIONANTE (AES-256 vault)');
    console.log('   ⚠️  FEQ              — Abilitata nel DB, MA richiede SDK Aruba/InfoCert');
    console.log('   ⚠️  FEA              — Abilitata nel DB, MA richiede provider FEA');
    console.log('   ⚠️  REMOTA           — Abilitata nel DB, MA richiede HSM cloud provider');
    console.log('\n🔑 Feature funzionanti senza integrazioni esterne:');
    console.log('   → Firma Semplice (username/password)');
    console.log('   → Firma Grafometrica (canvas su tablet/pad)');
    console.log('   → Firma con dati biometrici (crittografia AES-256)');
    console.log('\n💰 Per FEQ/FEA/REMOTA servono abbonamenti:');
    console.log('   → Aruba Sign: ~€2.000/anno');
    console.log('   → InfoCert: ~€2.500/anno');
    console.log('   → Certificati: €50-100/anno per medico');
}

enableSignatureFeatures()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
