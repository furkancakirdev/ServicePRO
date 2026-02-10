import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixRoles() {
  const users = await prisma.user.findMany();

  for (const user of users) {
    const fixedRole = user.role.toUpperCase();
    if (fixedRole !== user.role) {
      await prisma.user.update({
        where: { id: user.id },
        data: { role: fixedRole as any }
      });
      console.log(`Updated ${user.email}: ${user.role} -> ${fixedRole}`);
    }
  }
}

fixRoles()
  .then(() => console.log('Done'))
  .finally(async () => {
    await prisma.$disconnect();
  });

