const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function check() {
  const schedule = await prisma.courseSchedule.findFirst({ where: { deletedAt: null }, select: { id: true, tenantId: true } });
  console.log('Schedule:', schedule);
  if (schedule) {
    const persons = await prisma.person.findMany({ where: { tenantId: schedule.tenantId, deletedAt: null }, select: { id: true, firstName: true }, take: 2 });
    console.log('Persons:', persons);
  }
  await prisma.$disconnect();
}
check();
