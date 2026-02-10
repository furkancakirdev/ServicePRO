
import { prisma } from '../lib/prisma';

async function main() {
    const count = await prisma.service.count();
    console.log('Total services:', count);
}

main();
