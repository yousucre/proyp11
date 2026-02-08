import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Database Diagnostics ---');
    try {
        const configCount = await prisma.systemConfig.count();
        console.log(`SystemConfig records: ${configCount}`);

        if (configCount > 0) {
            const config = await prisma.systemConfig.findFirst();
            console.log('Config entry exists.');
            console.log(`Has hashed_password: ${!!config?.hashed_password}`);
            console.log(`Entidad: ${config?.entidad_nombre}`);
        } else {
            console.log('WARNING: SystemConfig is empty!');
        }

        const activityCount = await prisma.tipoActividad.count();
        console.log(`TipoActividad records: ${activityCount}`);

        const gestionCount = await prisma.otraGestion.count();
        console.log(`OtraGestion records: ${gestionCount}`);

    } catch (err: any) {
        console.error('Error connecting to database:', err.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
