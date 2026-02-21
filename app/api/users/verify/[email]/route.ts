import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const paramsSchema = z.object({
  email: z.string().trim().email(),
});

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ email: string }> },
) {
  const params = await context.params;
  const parsed = paramsSchema.safeParse(params);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email },
    select: { name: true, picture: true },
  });
  const exists = Boolean(user);

  return NextResponse.json(
    {
      exists,
      user: user
        ? {
            name: user.name,
            picture: user.picture,
          }
        : null,
    },
    { status: 200 },
  );
}
