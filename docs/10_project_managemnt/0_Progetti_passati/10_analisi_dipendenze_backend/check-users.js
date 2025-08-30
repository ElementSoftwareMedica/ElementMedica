const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkPersons() {
    try {
        const persons = await prisma.person.findMany({
            where: {
                deletedAt: null
            },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                createdAt: true
            }
        });
        
        console.log('Persons in database:');
        if (persons.length === 0) {
            console.log('No persons found in database');
        } else {
            persons.forEach(person => {
                console.log(`- ID: ${person.id}, Email: ${person.email}, Name: ${person.firstName} ${person.lastName}, Created: ${person.createdAt}`);
            });
        }
    } catch (error) {
        console.error('Error checking persons:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

checkPersons();