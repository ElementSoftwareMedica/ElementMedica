/**
 * Seed CourseTestAssignment v2
 * Crea associazioni tra form templates di test e corsi per livello di rischio/tipo
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tenantId = '8abacb72-e5b5-448a-965d-e6d6d0c5213c';

  console.log('=== Seeding CourseTestAssignment v2 ===\n');

  // Prima pulisci i vecchi assignment per questo tenant
  const deleted = await prisma.courseTestAssignment.deleteMany({
    where: { tenantId }
  });
  console.log('Deleted old assignments:', deleted.count);

  // Form templates per test
  const allFormTemplates = await prisma.form_templates.findMany({
    where: {
      type: { in: ['COURSE_TEST', 'COURSE_EVALUATION'] },
      tenantId: tenantId
    },
    select: { id: true, name: true, type: true }
  });

  console.log('Found test forms:', allFormTemplates.length);

  if (allFormTemplates.length === 0) {
    console.log('No test forms found for tenant');
    return;
  }

  // Trova il form test principale e il form valutazione
  const testForm = allFormTemplates.find(f => f.type === 'COURSE_TEST');
  const evalForm = allFormTemplates.find(f => f.type === 'COURSE_EVALUATION');

  console.log('Test form:', testForm?.name);
  console.log('Eval form:', evalForm?.name);

  if (!testForm) {
    console.log('Missing COURSE_TEST form template');
    return;
  }

  // Crea associazioni per tutti i livelli di rischio
  const riskLevels = ['ALTO', 'MEDIO', 'BASSO'];
  const courseTypes = ['PRIMO_CORSO', 'AGGIORNAMENTO'];

  const assignments = [];

  for (const riskLevel of riskLevels) {
    for (const courseType of courseTypes) {
      // Test iniziale
      assignments.push({
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
      });

      // Test finale
      assignments.push({
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
      });

      // Valutazione (se disponibile)
      if (evalForm) {
        assignments.push({
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
        });
      }
    }
  }

  console.log('\nCreating', assignments.length, 'assignments...');

  // Crea in batch usando createMany
  const result = await prisma.courseTestAssignment.createMany({
    data: assignments,
    skipDuplicates: true
  });

  console.log('Created:', result.count);

  // Verify
  const count = await prisma.courseTestAssignment.count({ where: { tenantId } });
  console.log('Total CourseTestAssignment for tenant:', count);

  // Show sample
  const sample = await prisma.courseTestAssignment.findMany({
    take: 5,
    where: { tenantId },
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
