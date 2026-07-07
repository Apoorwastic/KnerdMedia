import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const pw = await bcrypt.hash('12345678', 10);

  await prisma.user.upsert({
    where: { email: 'manik@knerdmedia.com' },
    update: { password: pw },
    create: { name: 'Manik Ratn', email: 'manik@knerdmedia.com', password: pw, role: 'SUPER_ADMIN' },
  });

  console.log('Seed complete!');
  console.log('  Super Admin: manik@knerdmedia.com / 12345678');
}

main().catch(console.error).finally(() => prisma.$disconnect());
