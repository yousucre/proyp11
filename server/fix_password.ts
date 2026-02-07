
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function fixPassword() {
    console.log('Connecting to DB...');
    try {
        const config = await prisma.systemConfig.findFirst();
        if (!config) {
            console.log('No config found!');
            return;
        }
        console.log('Config found. ID:', config.id);

        const newPassword = 'Agente2025@';
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await prisma.systemConfig.update({
            where: { id: config.id },
            data: { hashed_password: hashedPassword }
        });

        console.log('Password updated successfully to:', newPassword);
    } catch (e) {
        console.error('Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

fixPassword();
