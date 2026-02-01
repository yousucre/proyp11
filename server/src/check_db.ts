
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Checking OtraGestion records ---');
    const records = await prisma.otraGestion.findMany();
    console.log(`Total records: ${records.length}`);
    console.dir(records, { depth: null });

    console.log('\n--- Checking TipoActividad records ---');
    const tipos = await prisma.tipoActividad.findMany();
    console.log(`Total types: ${tipos.length}`);
    console.dir(tipos, { depth: null });

    console.log('\n--- Checking SystemConfig ---');
    const config = await prisma.systemConfig.findFirst();
    console.dir(config, { depth: null });
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
