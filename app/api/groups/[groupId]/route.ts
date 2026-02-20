import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { jsonError, parseGroupId, requireUser } from '../common';
import {
  getGroup,
  updateGroup,
  deleteGroup,
} from '@/lib/services/group-service';

const updateGroupSchema = z.object({
  groupName: z.string().trim().min(1),
});

const serviceErrorToHttp = {
  NOT_FOUND: { message: 'Group not found', status: 404 },
  FORBIDDEN: { message: 'Forbidden', status: 403 },
} as const;

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ groupId: string }> },
) {
  const params = await context.params;
  const currentUser = await requireUser(request);
  if ('error' in currentUser) {
    return currentUser.error;
  }

  const parsed = parseGroupId(params.groupId);
  if ('error' in parsed) {
    return parsed.error;
  }

  const result = await getGroup(parsed.groupId, currentUser.user.id);
  if ('error' in result) {
    const { message, status } = serviceErrorToHttp[result.error];
    return jsonError(message, status);
  }

  return NextResponse.json(result.data, { status: 200 });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ groupId: string }> },
) {
  const params = await context.params;
  const currentUser = await requireUser(request);
  if ('error' in currentUser) {
    return currentUser.error;
  }

  const parsed = parseGroupId(params.groupId);
  if ('error' in parsed) {
    return parsed.error;
  }

  const body = await request.json().catch(() => ({}));
  const validation = updateGroupSchema.safeParse(body);

  if (!validation.success) {
    return jsonError('Invalid request body', 400);
  }

  const result = await updateGroup(
    parsed.groupId,
    currentUser.user.id,
    validation.data.groupName,
  );
  if ('error' in result) {
    const { message, status } = serviceErrorToHttp[result.error];
    return jsonError(message, status);
  }

  return NextResponse.json(result.data, { status: 200 });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ groupId: string }> },
) {
  const params = await context.params;
  const currentUser = await requireUser(request);
  if ('error' in currentUser) {
    return currentUser.error;
  }

  const parsed = parseGroupId(params.groupId);
  if ('error' in parsed) {
    return parsed.error;
  }

  const result = await deleteGroup(parsed.groupId, currentUser.user.id);
  if ('error' in result) {
    const { message, status } = serviceErrorToHttp[result.error];
    return jsonError(message, status);
  }

  return new NextResponse(null, { status: 204 });
}
