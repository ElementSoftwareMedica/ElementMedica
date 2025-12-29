/**
 * Seed CourseTestAssignment
 * Crea associazioni tra form templates di test e corsi per livello di rischio/tipo
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tenantId = '8abacb72-e5b5-448a-965d-e6d6d0c5213c';

  console.log('=== Seeding CourseTestAssignment ===\n');

  // Form templates per test - use Prisma model instead of raw query
  const allFormTemplates = await prisma.form_templates.findMany({
    where: {
      type: { in: ['COURSE_TEST', 'COURSE_EVALUATION'] },
      tenantId: tenantId
    },
    select: { id: true, name: true, type: true }
  });

  const testForms = allFormTemplates;

  console.log('Found test forms:', testForms.length);

  if (testForms.length === 0) {
    console.log('No test forms found for tenant');
    return;
  }

  // Trova il form test principale e il form valutazione
  const testForm = testForms.find(f => f.type === 'COURSE_TEST');
  const evalForm = testForms.find(f => f.type === 'COURSE_EVALUATION');

  console.log('Test form:', testForm?.name);
  console.log('Eval form:', evalForm?.name);

  if (!testForm) {
    console.log('Missing COURSE_TEST form template');
    return;
  }

  // Crea associazioni per tutti i livelli di rischio
  const riskLevels = ['ALTO', 'MEDIO', 'BASSO', 'A', 'B', 'C'];
  const courseTypes = ['PRIMO_CORSO', 'AGGIORNAMENTO'];

  let created = 0;
  let skipped = 0;

  for (const riskLevel of riskLevels) {
    for (const courseType of courseTypes) {
      // Test iniziale
      try {
        await prisma.courseTestAssignment.upsert({
          where: {
            formTemplateId_courseId_riskLevel_courseType_testType_tenantId: {
              formTemplateId: testForm.id,
              courseId: null,
              riskLevel: riskLevel,
              courseType: courseType,
              testType: 'INITIAL',
              tenantId: tenantId
            }
          },
          update: {},
          create: {
            formTemplateId: testForm.id,
            courseId: null,
            riskLevel: riskLevel,
            courseType: courseType,
            testType: 'INITIAL',
            isRequired: true,
            order: 1,
            passingScore: 60,
            timeLimit: 30,
            isActive: true,
            tenantId: tenantId
          }
        });
        created++;
      } catch (e) {
        skipped++;
      }

      // Test finale
      try {
        await prisma.courseTestAssignment.upsert({
          where: {
            formTemplateId_courseId_riskLevel_courseType_testType_tenantId: {
              formTemplateId: testForm.id,
              courseId: null,
              riskLevel: riskLevel,
              courseType: courseType,
              testType: 'FINAL',
              tenantId: tenantId
            }
          },
          update: {},
          create: {
            formTemplateId: testForm.id,
            courseId: null,
            riskLevel: riskLevel,
            courseType: courseType,
            testType: 'FINAL',
            isRequired: true,
            order: 2,
            passingScore: 70,
            timeLimit: 45,
            isActive: true,
            tenantId: tenantId
          }
        });
        created++;
      } catch (e) {
        skipped++;
      }

      // Valutazione (se disponibile)
      if (evalForm) {
        try {
          await prisma.courseTestAssignment.upsert({
            where: {
              formTemplateId_courseId_riskLevel_courseType_testType_tenantId: {
                formTemplateId: evalForm.id,
                courseId: null,
                riskLevel: riskLevel,
                courseType: courseType,
                testType: 'ASSESSMENT',
                tenantId: tenantId
              }
            },
            update: {},
            create: {
              formTemplateId: evalForm.id,
              courseId: null,
              riskLevel: riskLevel,
              courseType: courseType,
              testType: 'ASSESSMENT',
              isRequired: false,
              order: 3,
              passingScore: null,
              timeLimit: 15,
              isActive: true,
              tenantId: tenantId
            }
          });
          created++;
        } catch (e) {
          skipped++;
        }
      }
    }
  }

  console.log('\n=== Results ===');
  console.log('Created:', created);
  console.log('Skipped (duplicates):', skipped);

  // Verify
  const count = await prisma.courseTestAssignment.count();
  console.log('Total CourseTestAssignment:', count);

  // Show sample
  const sample = await prisma.courseTestAssignment.findMany({
    take: 3,
    include: {
      formTemplate: { select: { name: true } }
    }
  });
  console.log('\nSample assignments:');
  sample.forEach(a => {
    console.log(` - ${a.testType} | Risk: ${a.riskLevel} | Type: ${a.courseType} | Form: ${a.formTemplate?.name}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
