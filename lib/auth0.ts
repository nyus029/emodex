import { Auth0Client } from '@auth0/nextjs-auth0/server';
import { NextResponse } from 'next/server';
import type { OnCallbackHook } from '@auth0/nextjs-auth0/types';
import { prisma } from './prisma';
import { isDbMockEnabled } from './db-mock';

export const onCallback: OnCallbackHook = async (error, context, session) => {
  if (error) {
    console.error('Auth callback error:', error);
    return new NextResponse(error.message, { status: 500 });
  }

  const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';

  if (session?.user?.email) {
    const { user } = session;
    const email = user.email as string;
    const name = (user.name || email) as string;

    if (isDbMockEnabled()) {
      return NextResponse.redirect(
        new URL(context.returnTo || '/', baseUrl).toString(),
      );
    }

    try {
      const updateData: { name: string; updatedAt: Date; picture?: string } = {
        name,
        updatedAt: new Date(),
      };

      if (user.picture) {
        updateData.picture = user.picture;
      }

      await prisma.user.upsert({
        where: { email },
        update: updateData,
        create: {
          email,
          name,
          picture: user.picture || null,
        },
      });
    } catch (e) {
      console.error('Failed to save user to database:', e);
    }
  }

  return NextResponse.redirect(new URL(context.returnTo || '/', baseUrl));
};

export const auth0 = new Auth0Client({
  onCallback,
});
