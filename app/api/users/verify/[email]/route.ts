import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const paramsSchema = z.object({
  email: z.string().email(),
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

  const exists = Boolean(await prisma.user.findUnique({ where: { email } }));

  return NextResponse.json({ exists }, { status: 200 });
}
