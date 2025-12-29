const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    // Simula la query della route
    const scheduleId = '02add60a-ede7-486a-80ff-9a5f0f82e683';
    const trainerId = 'c2da463a-c685-4f01-8500-9a53990791da';

    const schedule = await prisma.courseSchedule.findFirst({
        where: { id: scheduleId, deletedAt: null },
        include: {
            course: true,
            companies: {
                include: { company: true }
            },
            sessions: {
                include: {
                    trainer: true
                }
            }
        }
    });

    console.log('Schedule ID:', schedule?.id);
    console.log('Sessions count:', schedule?.sessions?.length || 0);

    // Calcola totalHours come nella route
    const calculateSessionDuration = (start, end) => {
        if (start === null || start === undefined || end === null || end === undefined) return 0;
        const [startHour, startMin] = start.split(':').map(Number);
        const [endHour, endMin] = end.split(':').map(Number);
        const startMinutes = (startHour || 0) * 60 + (startMin || 0);
        const endMinutes = (endHour || 0) * 60 + (endMin || 0);
        const durationMinutes = endMinutes - startMinutes;
        return durationMinutes > 0 ? durationMinutes / 60 : 0;
    };

    const trainerSessions = schedule.sessions.filter(s => s.trainerId === trainerId);
    console.log('Trainer sessions count:', trainerSessions.length);
    console.log('Trainer sessions:', trainerSessions.map(s => ({
        id: s.id,
        start: s.start,
        end: s.end,
        duration: calculateSessionDuration(s.start, s.end)
    })));

    const totalHours = trainerSessions.reduce((sum, s) => {
        const sessionDuration = s.duration || calculateSessionDuration(s.start, s.end);
        return sum + sessionDuration;
    }, 0);
    console.log('Total hours:', totalHours);

    // Calcola participantCompanies come nella route
    const participantCompanies = (schedule.companies || [])
        .map(sc => sc.company?.ragioneSociale || sc.company?.name)
        .filter(Boolean)
        .join(', ') || 'N/A';
    console.log('Participant companies:', participantCompanies);

    await prisma.$disconnect();
}

test().catch(e => { console.error(e); process.exit(1); });
