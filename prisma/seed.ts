import 'dotenv/config';
import { prisma } from '../lib/prisma';

const MOCK_USERS = [
  { email: 'user-1@example.com', name: 'User One' },
  { email: 'user-2@example.com', name: 'User Two' },
  { email: 'user-3@example.com', name: 'User Three' },
  { email: 'user-4@example.com', name: 'User Four' },
  { email: 'user-5@example.com', name: 'User Five' },
  { email: 'user-6@example.com', name: 'User Six' },
  { email: 'user-7@example.com', name: 'User Seven' },
  { email: 'user-8@example.com', name: 'User Eight' },
  { email: 'user-9@example.com', name: 'User Nine' },
  { email: 'user-10@example.com', name: 'User Ten' },
];

async function main() {
  for (const user of MOCK_USERS) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: { name: user.name },
      create: user,
    });
  }
  console.log(`Seeded ${MOCK_USERS.length} users.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
