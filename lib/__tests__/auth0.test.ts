import { onCallback } from '../auth0';
import { prisma } from '@/lib/prisma';
import type { SdkError } from '@auth0/nextjs-auth0/errors';
import type { SessionData } from '@auth0/nextjs-auth0/types';

jest.mock('@auth0/nextjs-auth0/server', () => ({
  Auth0Client: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      upsert: jest.fn(),
    },
  },
}));

function createSession(
  overrides: Partial<{ email: string; name: string; picture: string }> = {},
): SessionData {
  return {
    user: {
      sub: 'auth0|123',
      email: overrides.email ?? 'test@example.com',
      name: overrides.name ?? 'Test User',
      picture: overrides.picture ?? 'https://example.com/avatar.jpg',
    },
    tokenSet: {
      accessToken: 'at_test',
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
      scope: 'openid profile email',
      audience: '',
    },
    internal: {
      sid: 'sid_test',
      createdAt: Math.floor(Date.now() / 1000),
    },
  };
}

describe('onCallback', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, APP_BASE_URL: 'http://localhost:3000' };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('正常系 - ユーザー作成・更新', () => {
    it('新規ユーザーをDBにupsertする', async () => {
      const session = createSession();
      (prisma.user.upsert as jest.Mock).mockResolvedValue({ id: 1 });

      const result = await onCallback(null, { returnTo: '/' }, session);

      expect(prisma.user.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { email: 'test@example.com' },
          create: expect.objectContaining({
            email: 'test@example.com',
            name: 'Test User',
            picture: 'https://example.com/avatar.jpg',
          }),
          update: expect.objectContaining({
            name: 'Test User',
            picture: 'https://example.com/avatar.jpg',
          }),
        }),
      );
      expect(result.status).toBe(307);
    });

    it('nameがない場合、emailをデフォルト値として使用', async () => {
      const session = createSession({ name: undefined as unknown as string });
      session.user.name = undefined;
      (prisma.user.upsert as jest.Mock).mockResolvedValue({ id: 1 });

      await onCallback(null, { returnTo: '/' }, session);

      expect(prisma.user.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            name: 'test@example.com',
          }),
        }),
      );
    });

    it('pictureがnullの場合も正常に保存', async () => {
      const session = createSession({
        picture: undefined as unknown as string,
      });
      session.user.picture = undefined;
      (prisma.user.upsert as jest.Mock).mockResolvedValue({ id: 1 });

      await onCallback(null, { returnTo: '/' }, session);

      expect(prisma.user.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            picture: null,
          }),
          update: expect.not.objectContaining({
            picture: expect.anything(),
          }),
        }),
      );
    });
  });

  describe('セッション検証', () => {
    it('セッションがnullの場合、DBに保存しない', async () => {
      const result = await onCallback(null, { returnTo: '/' }, null);

      expect(prisma.user.upsert).not.toHaveBeenCalled();
      expect(result.status).toBe(307);
    });

    it('emailがない場合、DBに保存しない', async () => {
      const session = createSession();
      session.user.email = undefined;

      await onCallback(null, { returnTo: '/' }, session);

      expect(prisma.user.upsert).not.toHaveBeenCalled();
    });
  });

  describe('エラーハンドリング', () => {
    it('Auth0エラー時は500を返しDBに保存しない', async () => {
      const error = new Error('Auth failed') as SdkError;

      const result = await onCallback(error, { returnTo: '/' }, null);

      expect(result.status).toBe(500);
      expect(prisma.user.upsert).not.toHaveBeenCalled();
    });

    it('Prismaエラー時もリダイレクトを返す（認証はブロックしない）', async () => {
      const session = createSession();
      (prisma.user.upsert as jest.Mock).mockRejectedValue(
        new Error('DB connection failed'),
      );
      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const result = await onCallback(
        null,
        { returnTo: '/dashboard' },
        session,
      );

      expect(result.status).toBe(307);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to save user to database:',
        expect.any(Error),
      );
      consoleSpy.mockRestore();
    });
  });

  describe('リダイレクト', () => {
    it('returnToが指定されている場合、そのURLにリダイレクト', async () => {
      const result = await onCallback(null, { returnTo: '/dashboard' }, null);

      expect(result.headers.get('location')).toBe(
        'http://localhost:3000/dashboard',
      );
    });

    it('returnToがない場合、/にリダイレクト', async () => {
      const result = await onCallback(null, {}, null);

      expect(result.headers.get('location')).toBe('http://localhost:3000/');
    });

    it('APP_BASE_URLの環境変数を使用する', async () => {
      process.env.APP_BASE_URL = 'https://myapp.example.com';

      const result = await onCallback(null, { returnTo: '/home' }, null);

      expect(result.headers.get('location')).toBe(
        'https://myapp.example.com/home',
      );
    });
  });
});
