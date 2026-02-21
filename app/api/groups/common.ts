import { prisma } from '@/lib/prisma';
import { MembershipRole } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';

export const membershipRoleSchema = z.nativeEnum(MembershipRole);

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export function parseGroupId(raw?: string) {
  const groupId = Number(raw);
  if (!raw || Number.isNaN(groupId) || groupId <= 0) {
    return { error: jsonError('Invalid group id', 400) };
  }
  return { groupId };
}

export async function requireUser(request: Request) {
  const userIdHeader = request.headers.get('x-user-id');
  const userId = userIdHeader ? Number(userIdHeader) : NaN;

  if (!userIdHeader || Number.isNaN(userId) || userId <= 0) {
    return { error: jsonError('Unauthorized', 401) };
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    return { error: jsonError('Unauthorized', 401) };
  }

  return { user };
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}
