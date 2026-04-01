import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function run() {
    console.log('Starting EnrollmentStatus migration (continuing from Step 3)...');

    // Steps 1-2 already applied: EnrollmentStatus_new created, CourseSchedule converted

    // Step 3: Update course_enrollments.status (lowercase table name)
    try {
        await p.$executeRawUnsafe('ALTER TABLE "course_enrollments" ALTER COLUMN "status" DROP DEFAULT');
        await p.$executeRawUnsafe(`ALTER TABLE "course_enrollments" ALTER COLUMN "status" TYPE "EnrollmentStatus_new" USING (CASE "status"::text WHEN 'PENDING' THEN 'PREVENTIVO' WHEN 'CONFIRMED' THEN 'ACCETTATO' WHEN 'ACTIVE' THEN 'ACCETTATO' WHEN 'COMPLETED' THEN 'COMPLETATO' WHEN 'CANCELLED' THEN 'COMPLETATO' WHEN 'SUSPENDED' THEN 'PREVENTIVO' ELSE 'PREVENTIVO' END)::"EnrollmentStatus_new"`);
        await p.$executeRawUnsafe(`ALTER TABLE "course_enrollments" ALTER COLUMN "status" SET DEFAULT 'PREVENTIVO'::"EnrollmentStatus_new"`);
        console.log('Step 3: Updated course_enrollments status column');
    } catch (e) {
        console.log('Step 3: course_enrollments skipped:', e.message.substring(0, 80));
    }

    // Step 4: Drop old enum and rename
    await p.$executeRawUnsafe('DROP TYPE "EnrollmentStatus"');
    await p.$executeRawUnsafe('ALTER TYPE "EnrollmentStatus_new" RENAME TO "EnrollmentStatus"');
    console.log('Step 4: Renamed enum');

    // Step 5: Add expiryDate
    try {
        await p.$executeRawUnsafe('ALTER TABLE "CourseSchedule" ADD COLUMN "expiryDate" TIMESTAMP(3)');
        console.log('Step 5: Added expiryDate column');
    } catch (e) {
        if (e.message.includes('already exists')) {
            console.log('Step 5: expiryDate column already exists, skipping');
        } else {
            throw e;
        }
    }

    // Step 6: Populate expiryDate for existing COMPLETATO schedules
    const result = await p.$executeRawUnsafe(`UPDATE "CourseSchedule" cs SET "expiryDate" = cs."endDate" + (c."validityYears" * INTERVAL '1 year') FROM "Course" c WHERE cs."courseId" = c."id" AND c."validityYears" IS NOT NULL AND c."validityYears" > 0 AND cs."status" = 'COMPLETATO' AND cs."endDate" IS NOT NULL`);
    console.log('Step 6: Populated expiryDate for', result, 'rows');

    await p.$disconnect();
    console.log('Migration complete!');
}

run().catch(async e => {
    console.error('ERROR:', e.message);
    await p.$disconnect();
    process.exit(1);
});
