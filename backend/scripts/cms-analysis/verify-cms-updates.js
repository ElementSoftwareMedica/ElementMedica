/**
 * Verifica lo stato delle pagine CMS Element Formazione
 * Controlla se i contenuti premium sono stati salvati correttamente
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const TENANT_FORMAZIONE = 'd2bbc5b0-344c-47c7-8ef5-f57755293372';

async function verifyPages() {
    console.log('\n🔍 VERIFICA STATO PAGINE CMS ELEMENT FORMAZIONE\n');
    console.log('='.repeat(60));

    const pages = await prisma.cMSPage.findMany({
        where: { tenantId: TENANT_FORMAZIONE },
        select: { slug: true, title: true, updatedAt: true, status: true, content: true },
        orderBy: { updatedAt: 'desc' }
    });

    console.log('\n📄 LISTA PAGINE:\n');
    for (const p of pages) {
        const date = new Date(p.updatedAt).toLocaleString('it-IT');
        const contentKeys = Object.keys(p.content || {}).length;
        console.log(`  ${p.slug.padEnd(25)} | ${(p.status || 'draft').padEnd(10)} | ${date} | ${contentKeys} sezioni`);
    }

    // Verifica dettagliata homepage
    console.log('\n\n📊 VERIFICA DETTAGLIATA HOMEPAGE:');
    console.log('-'.repeat(40));
    const homepage = pages.find(p => p.slug === 'homepage');
    if (homepage?.content) {
        const c = homepage.content;
        console.log('  Hero stats:', c.hero?.stats?.length || 0);
        console.log('  Services:', c.services?.length || 0);
        console.log('  Testimonials:', c.testimonials?.length || 0);
        console.log('  FAQ items:', c.faq?.items?.length || c.faq?.length || 0);
        console.log('  Has metadata:', !!c.metadata);
        console.log('  Has structuredData:', !!c.metadata?.structuredData);
        console.log('  Content keys:', Object.keys(c).join(', '));
    }

    // Verifica dettagliata medicina-del-lavoro
    console.log('\n📊 VERIFICA DETTAGLIATA MEDICINA DEL LAVORO:');
    console.log('-'.repeat(40));
    const medicina = pages.find(p => p.slug === 'medicina-del-lavoro');
    if (medicina?.content) {
        const c = medicina.content;
        console.log('  Hero stats:', c.hero?.stats?.length || 0);
        console.log('  Services:', c.services?.items?.length || c.services?.length || 0);
        console.log('  FAQ items:', c.faq?.items?.length || c.faq?.length || 0);
        console.log('  Has normativa:', !!c.normativa);
        console.log('  Has metadata:', !!c.metadata);
        console.log('  Content keys:', Object.keys(c).join(', '));
    }

    // Verifica dettagliata rspp
    console.log('\n📊 VERIFICA DETTAGLIATA RSPP:');
    console.log('-'.repeat(40));
    const rspp = pages.find(p => p.slug === 'rspp');
    if (rspp?.content) {
        const c = rspp.content;
        console.log('  Hero stats:', c.hero?.stats?.length || 0);
        console.log('  Services:', c.services?.length || 0);
        console.log('  Macrosettori:', c.macrosettori?.sectors?.length || 0);
        console.log('  Training courses:', c.trainingCourses?.courses?.length || 0);
        console.log('  Case studies:', c.caseStudies?.cases?.length || 0);
        console.log('  FAQ items:', c.faq?.items?.length || 0);
        console.log('  Has pricing:', !!c.pricing);
        console.log('  Has metadata:', !!c.metadata);
        console.log('  Content keys:', Object.keys(c).join(', '));
    }

    await prisma.$disconnect();
}

verifyPages().catch(console.error);
