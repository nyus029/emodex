import { Auth0Client } from '@auth0/nextjs-auth0/server';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const client = new Auth0Client();

    // Auth0ミドルウェア処理（認証ハンドラー）
    const response = await client.middleware(req);

    // レスポンスのクッキーからセッションを確認
    const session = await client.getSession(req);

    if (session?.user?.email) {
      const { user } = session;
      const email = user.email as string;
      const name = (user.name || email) as string;

      // Auth0ユーザー情報をデータベースに保存
      const updateData = {
        name,
        updatedAt: new Date(),
      };

      const createData = {
        email,
        name,
        picture: user.picture || null,
      };

      // picture がある場合は update に含める
      if (user.picture) {
        Object.assign(updateData, { picture: user.picture });
      }

      const dbUser = await prisma.user.upsert({
        where: { email },
        update: updateData,
        create: createData,
      });

      console.log('✅ User saved to database:', dbUser);
    }

    return response;
  } catch (error) {
    console.error('❌ Failed to handle callback:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 },
    );
  }
}
