import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const pw = await bcrypt.hash('12345678', 10);

  await prisma.user.upsert({
    where: { email: 'Knerdmedia@gmail.com' },
    update: { password: pw },
    create: { name: 'Knerd Media', email: 'Knerdmedia@gmail.com', password: pw, role: 'SUPER_ADMIN' },
  });

  console.log('Seed complete!');
  console.log('  Super Admin: Knerdmedia@gmail.com / 12345678');
}

main().catch(console.error).finally(() => prisma.$disconnect());
