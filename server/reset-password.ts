
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function resetPassword() {
    try {
        const newPassword = 'Agente2025';
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        const config = await prisma.systemConfig.findFirst();
        if (config) {
            await prisma.systemConfig.update({
                where: { id: config.id },
                data: { hashed_password: hashedPassword }
            });
            console.log('Password reset to:', newPassword);

            // Verify immediately
            const updatedConfig = await prisma.systemConfig.findFirst();
            const match = await bcrypt.compare(newPassword, updatedConfig?.hashed_password || '');
            console.log('Verification match:', match);
        } else {
            console.log('No config found to update.');
        }

    } catch (error) {
        console.error('Error resetting password:', error);
    } finally {
        await prisma.$disconnect();
    }
}

resetPassword();
