import 'dotenv/config';
import { defineConfig } from 'prisma/config';

const url =
  process.env.DATABASE_URL ?? 'mysql://user:password@localhost:3306/db';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url,
  },
});
