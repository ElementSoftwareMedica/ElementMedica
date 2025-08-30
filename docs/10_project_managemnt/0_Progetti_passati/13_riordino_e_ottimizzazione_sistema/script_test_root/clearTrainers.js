const { PrismaClient } = require('@prisma/client');
const logger = require('./utils/logger');
const prisma = new PrismaClient();

async function clearTrainers() {
  try {
    await prisma.trainer.deleteMany();
    logger.info('All trainers deleted', { component: 'clearTrainers' });
  } catch (err) {
    logger.error('Error clearing trainers', { component: 'clearTrainers', error: err.message });
  } finally {
    await prisma.$disconnect();
  }
}

clearTrainers();