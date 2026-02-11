import 'dotenv/config';
import { defineConfig } from 'prisma/config';

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error(
    'DATABASE_URL が未設定です。cp .env.example .env で .env を作成し、DATABASE_URL を設定してください。',
  );
}

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
