import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { jsonError, normalizeEmail, requireUser } from './common';
import { listUserGroups, createGroup } from '@/lib/services/group-service';

const createGroupSchema = z.object({
  groupName: z.string().trim().min(1),
  memberEmails: z.array(z.string().trim().email()).optional(),
});

export async function GET(request: NextRequest) {
  const currentUser = await requireUser(request);
  if ('error' in currentUser) {
    return currentUser.error;
  }

  const groups = await listUserGroups(currentUser.user.id);
  return NextResponse.json(groups, { status: 200 });
}

export async function POST(request: NextRequest) {
  const currentUser = await requireUser(request);
  if ('error' in currentUser) {
    return currentUser.error;
  }

  const body = await request.json().catch(() => ({}));
  const parsed = createGroupSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError('Invalid request body', 400);
  }

  const memberEmails =
    parsed.data.memberEmails?.map(normalizeEmail).filter(Boolean) ?? [];

  const result = await createGroup(
    currentUser.user.id,
    currentUser.user.email,
    {
      groupName: parsed.data.groupName,
      memberEmails,
    },
  );

  if (!result.success) {
    return jsonError(
      `Users not found for emails: ${result.error.emails.join(', ')}`,
      400,
    );
  }

  return NextResponse.json(result.data, { status: 201 });
}
