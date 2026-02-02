
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkConfig() {
    try {
        const config = await prisma.systemConfig.findFirst();
        console.log('Current System Config:', config);
        if (!config) {
            console.log('No configuration found.');
        } else {
            console.log('Setup completed:', config.first_setup_done);
            console.log('Hashed password present:', !!config.hashed_password);
        }
    } catch (error) {
        console.error('Error checking config:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkConfig();
