const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
console.log("Tenant model exists:", typeof prisma.tenant);
console.log("Company model exists:", typeof prisma.company);
process.exit(0);
