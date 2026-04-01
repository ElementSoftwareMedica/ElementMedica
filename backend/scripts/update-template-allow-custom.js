// Adds allowCustom: true to all MULTI_CHOICE fields in template abe0dd1d-8554-4270-9abd-999773269986
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const TEMPLATE_ID = 'abe0dd1d-8554-4270-9abd-999773269986';

async function main() {
    const template = await prisma.visitTemplate.findUnique({
        where: { id: TEMPLATE_ID },
    });

    if (!template) {
        console.error('Template not found:', TEMPLATE_ID);
        return;
    }

    console.log('Template:', template.name);
    const fields = template.fields;

    const updated = fields.map((f) => {
        if (f.type === 'MULTI_CHOICE') {
            console.log(`  → Setting allowCustom=true on field "${f.label}" (${f.id})`);
            return { ...f, allowCustom: true };
        }
        return f;
    });

    const multiCount = updated.filter((f) => f.type === 'MULTI_CHOICE').length;
    console.log(`Updated ${multiCount} MULTI_CHOICE field(s)`);

    await prisma.visitTemplate.update({
        where: { id: TEMPLATE_ID },
        data: { fields: updated },
    });

    console.log('Done ✓');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
