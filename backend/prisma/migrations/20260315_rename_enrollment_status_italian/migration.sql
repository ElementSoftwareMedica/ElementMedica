-- AlterEnum: Rename EnrollmentStatus values to Italian + add FATTURATO
-- Migration: PREVENTIVO, ACCETTATO, COMPLETATO, FATTURATO (drop ACTIVE, CANCELLED, SUSPENDED)

-- Step 1: Create the new enum type with Italian values
CREATE TYPE "EnrollmentStatus_new" AS ENUM ('PREVENTIVO', 'ACCETTATO', 'COMPLETATO', 'FATTURATO');

-- Step 2: Update CourseSchedule.status column
ALTER TABLE "CourseSchedule" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "CourseSchedule" ALTER COLUMN "status" TYPE "EnrollmentStatus_new"
    USING (
        CASE "status"::text
            WHEN 'PENDING' THEN 'PREVENTIVO'
            WHEN 'CONFIRMED' THEN 'ACCETTATO'
            WHEN 'ACTIVE' THEN 'ACCETTATO'
            WHEN 'COMPLETED' THEN 'COMPLETATO'
            WHEN 'CANCELLED' THEN 'COMPLETATO'
            WHEN 'SUSPENDED' THEN 'PREVENTIVO'
            ELSE 'PREVENTIVO'
        END
    )::"EnrollmentStatus_new";
ALTER TABLE "CourseSchedule" ALTER COLUMN "status" SET DEFAULT 'PREVENTIVO'::"EnrollmentStatus_new";

-- Step 3: Update CourseEnrollment.status column
ALTER TABLE "CourseEnrollment" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "CourseEnrollment" ALTER COLUMN "status" TYPE "EnrollmentStatus_new"
    USING (
        CASE "status"::text
            WHEN 'PENDING' THEN 'PREVENTIVO'
            WHEN 'CONFIRMED' THEN 'ACCETTATO'
            WHEN 'ACTIVE' THEN 'ACCETTATO'
            WHEN 'COMPLETED' THEN 'COMPLETATO'
            WHEN 'CANCELLED' THEN 'COMPLETATO'
            WHEN 'SUSPENDED' THEN 'PREVENTIVO'
            ELSE 'PREVENTIVO'
        END
    )::"EnrollmentStatus_new";
ALTER TABLE "CourseEnrollment" ALTER COLUMN "status" SET DEFAULT 'PREVENTIVO'::"EnrollmentStatus_new";

-- Step 4: Drop old enum and rename new one
DROP TYPE "EnrollmentStatus";
ALTER TYPE "EnrollmentStatus_new" RENAME TO "EnrollmentStatus";

-- Step 5: Add expiryDate field to CourseSchedule
ALTER TABLE "CourseSchedule" ADD COLUMN "expiryDate" TIMESTAMP(3);

-- Step 6: Populate expiryDate for existing COMPLETATO schedules that have a course with validityYears
UPDATE "CourseSchedule" cs
SET "expiryDate" = cs."endDate" + (c."validityYears" * INTERVAL '1 year')
FROM "Course" c
WHERE cs."courseId" = c."id"
  AND c."validityYears" IS NOT NULL
  AND c."validityYears" > 0
  AND cs."status" = 'COMPLETATO'
  AND cs."endDate" IS NOT NULL;
