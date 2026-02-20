import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import type { z } from 'zod';
import { auth0 } from '@/lib/auth0';
import { getSystemAdministratorAccessByEmail } from '@/lib/system-administrators';

export type AuthSession = {
  userId: string;
  userEmail: string | undefined;
};

export function jsonSuccess<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function requireAuth(): Promise<
  | { session: AuthSession; error?: never }
  | { session?: never; error: NextResponse }
> {
  const session = await auth0.getSession();
  const userId = session?.user?.sub;
  const userEmail = session?.user?.email as string | undefined;

  if (!userId) {
    return { error: jsonError('Unauthorized', 401) };
  }

  return { session: { userId, userEmail } };
}

export async function requireAdminAuth(): Promise<
  | {
      currentUser: { id: number; email: string; name: string };
      isRegisteredAdmin: boolean;
      isBootstrapAdmin: boolean;
      error?: never;
    }
  | { currentUser?: never; error: NextResponse }
> {
  const session = await auth0.getSession();
  const email = session?.user?.email;

  if (!email) {
    return { error: jsonError('Unauthorized', 401) };
  }

  const access = await getSystemAdministratorAccessByEmail(email);

  if (!access.currentUser) {
    return { error: jsonError('Unauthorized', 401) };
  }

  if (!access.hasAccess) {
    return { error: jsonError('Forbidden', 403) };
  }

  return {
    currentUser: access.currentUser,
    isRegisteredAdmin: access.isRegisteredAdmin,
    isBootstrapAdmin: access.isBootstrapAdmin,
  };
}

export function parseBody<T extends z.ZodTypeAny>(
  rawBody: unknown,
  schema: T,
): { data: z.infer<T>; error?: never } | { data?: never; error: NextResponse } {
  const parsed = schema.safeParse(rawBody);

  if (!parsed.success) {
    return {
      error: NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 },
      ),
    };
  }

  return { data: parsed.data };
}

export function isPrismaUniqueConstraintError(error: unknown): boolean {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  ) {
    return true;
  }

  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  );
}

export function roundEmo(value: number): number {
  return Math.round(value * 100) / 100;
}
