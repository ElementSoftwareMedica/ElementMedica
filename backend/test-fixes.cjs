/**
 * Test script per verificare i fix applicati:
 * 1. PDF preventivo salva dataGenerazione in DB
 * 2. JWT expiration aumentato a 8h
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testFixes() {
    console.log('🧪 TEST FIX APPLICATI\n');

    // TEST 1: Verifica JWT expiration da environment
    console.log('1️⃣ JWT EXPIRATION CONFIG');
    console.log('   JWT_EXPIRES_IN:', process.env.JWT_EXPIRES_IN || '1h (default)');
    console.log('   JWT_REFRESH_EXPIRES_IN:', process.env.JWT_REFRESH_EXPIRES_IN || '7d (default)');

    if (process.env.JWT_EXPIRES_IN === '8h') {
        console.log('   ✅ JWT expiration aumentato a 8h');
    } else {
        console.log('   ⚠️  JWT expiration NON trovato in environment (backend deve essere riavviato)');
    }

    // TEST 2: Verifica preventivo con dataGenerazione
    console.log('\n2️⃣ PREVENTIVO DATA GENERAZIONE');
    const preventivoId = '2fc18369-97ce-4080-a04f-9ce40b046cc5';

    const preventivo = await prisma.preventivo.findUnique({
        where: { id: preventivoId },
        select: {
            numero: true,
            dataGenerazione: true,
            fileUrl: true,
            fileName: true,
            fileSize: true
        }
    });

    console.log('   Preventivo:', preventivo.numero);
    console.log('   dataGenerazione:', preventivo.dataGenerazione || 'NULL (non ancora rigenerato)');
    console.log('   fileUrl:', preventivo.fileUrl || 'NULL');
    console.log('   fileName:', preventivo.fileName || 'NULL');
    console.log('   fileSize:', preventivo.fileSize || 'NULL');

    if (preventivo.dataGenerazione) {
        console.log('   ✅ PDF timestamp salvato in database');
    } else {
        console.log('   ⚠️  PDF non ancora rigenerato (clicca Download PDF per testare fix)');
    }

    // TEST 3: Verifica template V5 attivo
    console.log('\n3️⃣ TEMPLATE V5 STATUS');
    const templateV5 = await prisma.templateLink.findFirst({
        where: {
            type: 'PREVENTIVO',
            version: 5,
            isActive: true,
            deletedAt: null
        },
        select: {
            id: true,
            name: true,
            version: true,
            isActive: true,
            isDefault: true
        }
    });

    if (templateV5) {
        console.log('   ✅ Template V5 attivo:', templateV5.name);
        console.log('      isDefault:', templateV5.isDefault);
        console.log('      isActive:', templateV5.isActive);
    } else {
        console.log('   ❌ Template V5 NON trovato!');
    }

    // SUMMARY
    console.log('\n📋 SUMMARY');
    console.log('─'.repeat(60));

    const jwtFixed = process.env.JWT_EXPIRES_IN === '8h';
    const pdfFixed = preventivo.dataGenerazione !== null;
    const templateOk = templateV5 !== null;

    console.log(`JWT Expiration (8h):        ${jwtFixed ? '✅ OK' : '⚠️  Riavviare backend'}`);
    console.log(`PDF dataGenerazione save:   ${pdfFixed ? '✅ OK' : '⚠️  Rigenerare PDF'}`);
    console.log(`Template V5 active:         ${templateOk ? '✅ OK' : '❌ ERROR'}`);

    console.log('\n🎯 PROSSIMI PASSI:');
    if (!jwtFixed) {
        console.log('   1. Riavviare backend server per caricare JWT_EXPIRES_IN=8h');
    }
    if (!pdfFixed) {
        console.log('   2. Cliccare "Download PDF" per rigenerare con Template V5');
    }
    console.log('   3. Verificare header tabella PDF sia BLU (non grigio)');
    console.log('   4. Template save dovrebbe funzionare senza 500 error (JWT 8h)');

    await prisma.$disconnect();
}

testFixes().catch(console.error);
