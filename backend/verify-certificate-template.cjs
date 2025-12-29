const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const cert = await prisma.templateLink.findUnique({
        where: { id: '0948d24d-53a9-4efe-8ead-ead4e76e697b' },
        select: {
            id: true,
            name: true,
            type: true,
            version: true,
            tenantId: true,
            isActive: true,
            isDefault: true,
            fileFormat: true,
            url: true,
            googleDocsUrl: true,
            content: true,
            header: true,
            footer: true
        }
    });

    if (!cert) {
        console.log('❌ Template CERTIFICATE non trovato');
        return;
    }

    console.log('=== TEMPLATE CERTIFICATE ===');
    console.log('ID:', cert.id);
    console.log('Name:', cert.name);
    console.log('Type:', cert.type);
    console.log('Version:', cert.version);
    console.log('TenantId:', cert.tenantId);
    console.log('isActive:', cert.isActive);
    console.log('isDefault:', cert.isDefault);
    console.log('fileFormat:', cert.fileFormat);
    console.log('url:', cert.url);
    console.log('googleDocsUrl:', cert.googleDocsUrl);
    console.log('content length:', cert.content?.length || 0);
    console.log('header length:', cert.header?.length || 0);
    console.log('footer length:', cert.footer?.length || 0);

    await prisma.$disconnect();
}

main();
