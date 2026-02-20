import { GET } from '../route';
import { Auth0Client } from '@auth0/nextjs-auth0/server';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Mock Auth0Client
jest.mock('@auth0/nextjs-auth0/server', () => ({
  Auth0Client: jest.fn(),
}));

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      upsert: jest.fn(),
    },
  },
}));

describe('Auth Callback Route - GET /api/auth/callback', () => {
  let mockClient: any;
  let mockRequest: NextRequest;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Auth0Client instance
    mockClient = {
      middleware: jest.fn(),
      getSession: jest.fn(),
    };
    (Auth0Client as jest.Mock).mockImplementation(() => mockClient);

    // Mock NextRequest
    mockRequest = {
      url: 'http://localhost:3000/api/auth/callback?code=test&state=test',
    } as NextRequest;
  });

  describe('正常系 - ユーザー作成・更新', () => {
    it('新規ユーザーを作成してDBに保存', async () => {
      const mockResponse = new NextResponse('Success', { status: 302 });
      const mockSession = {
        user: {
          email: 'newuser@example.com',
          name: 'New User',
          picture: 'https://example.com/avatar.jpg',
        },
      };

      mockClient.middleware.mockResolvedValue(mockResponse);
      mockClient.getSession.mockResolvedValue(mockSession);

      (prisma.user.upsert as jest.Mock).mockResolvedValue({
        id: 1,
        email: 'newuser@example.com',
        name: 'New User',
        picture: 'https://example.com/avatar.jpg',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await GET(mockRequest);

      expect(prisma.user.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { email: 'newuser@example.com' },
          create: expect.objectContaining({
            email: 'newuser@example.com',
            name: 'New User',
            picture: 'https://example.com/avatar.jpg',
          }),
        }),
      );

      expect(result).toBeDefined();
    });

    it('既存ユーザーの情報を更新', async () => {
      const mockResponse = new NextResponse('Success', { status: 302 });
      const mockSession = {
        user: {
          email: 'existing@example.com',
          name: 'Updated Name',
          picture: 'https://example.com/new-avatar.jpg',
        },
      };

      mockClient.middleware.mockResolvedValue(mockResponse);
      mockClient.getSession.mockResolvedValue(mockSession);

      (prisma.user.upsert as jest.Mock).mockResolvedValue({
        id: 1,
        email: 'existing@example.com',
        name: 'Updated Name',
        picture: 'https://example.com/new-avatar.jpg',
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date(),
      });

      await GET(mockRequest);

      expect(prisma.user.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { email: 'existing@example.com' },
          update: expect.objectContaining({
            name: 'Updated Name',
          }),
        }),
      );
    });

    it('nameがない場合、emailをデフォルト値として使用', async () => {
      const mockResponse = new NextResponse('Success', { status: 302 });
      const mockSession = {
        user: {
          email: 'noname@example.com',
          name: undefined,
          picture: null,
        },
      };

      mockClient.middleware.mockResolvedValue(mockResponse);
      mockClient.getSession.mockResolvedValue(mockSession);

      (prisma.user.upsert as jest.Mock).mockResolvedValue({
        id: 1,
        email: 'noname@example.com',
        name: 'noname@example.com',
        picture: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await GET(mockRequest);

      expect(prisma.user.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            name: 'noname@example.com',
          }),
        }),
      );
    });

    it('pictureがnullの場合も正常に保存', async () => {
      const mockResponse = new NextResponse('Success', { status: 302 });
      const mockSession = {
        user: {
          email: 'nopic@example.com',
          name: 'No Picture User',
          picture: null,
        },
      };

      mockClient.middleware.mockResolvedValue(mockResponse);
      mockClient.getSession.mockResolvedValue(mockSession);

      (prisma.user.upsert as jest.Mock).mockResolvedValue({
        id: 1,
        email: 'nopic@example.com',
        name: 'No Picture User',
        picture: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await GET(mockRequest);

      expect(prisma.user.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            picture: null,
          }),
        }),
      );
    });
  });

  describe('セッション検証', () => {
    it('セッションにuserがない場合、DBに保存しない', async () => {
      const mockResponse = new NextResponse('Success', { status: 302 });

      mockClient.middleware.mockResolvedValue(mockResponse);
      mockClient.getSession.mockResolvedValue(null);

      await GET(mockRequest);

      expect(prisma.user.upsert).not.toHaveBeenCalled();
    });

    it('セッションのemailがない場合、DBに保存しない', async () => {
      const mockResponse = new NextResponse('Success', { status: 302 });
      const mockSession = {
        user: {
          email: undefined,
          name: 'No Email User',
        },
      };

      mockClient.middleware.mockResolvedValue(mockResponse);
      mockClient.getSession.mockResolvedValue(mockSession);

      await GET(mockRequest);

      expect(prisma.user.upsert).not.toHaveBeenCalled();
    });
  });

  describe('エラーハンドリング', () => {
    it('middlewareエラーをキャッチ', async () => {
      const error = new Error('Auth middleware failed');
      mockClient.middleware.mockRejectedValue(error);

      const result = await GET(mockRequest);

      expect(result.status).toBe(500);
      expect(result.ok).toBe(false);
    });

    it('Prismaエラーをキャッチ', async () => {
      const mockResponse = new NextResponse('Success', { status: 302 });
      const mockSession = {
        user: {
          email: 'error@example.com',
          name: 'Error User',
        },
      };

      mockClient.middleware.mockResolvedValue(mockResponse);
      mockClient.getSession.mockResolvedValue(mockSession);
      (prisma.user.upsert as jest.Mock).mockRejectedValue(
        new Error('Database error'),
      );

      const result = await GET(mockRequest);

      expect(result.status).toBe(500);
      expect(result.ok).toBe(false);
    });

    it('getSessionエラーをキャッチ', async () => {
      const mockResponse = new NextResponse('Success', { status: 302 });
      mockClient.middleware.mockResolvedValue(mockResponse);
      mockClient.getSession.mockRejectedValue(new Error('Session error'));

      const result = await GET(mockRequest);

      expect(result.status).toBe(500);
    });
  });

  describe('レスポンス検証', () => {
    it('middlewareのレスポンスをそのまま返す', async () => {
      const mockResponse = new NextResponse('Redirect to home', {
        status: 302,
      });
      mockClient.middleware.mockResolvedValue(mockResponse);
      mockClient.getSession.mockResolvedValue(null);

      const result = await GET(mockRequest);

      expect(result).toBe(mockResponse);
    });

    it('エラーレスポンスにJSON形式でエラーメッセージを返す', async () => {
      mockClient.middleware.mockRejectedValue(new Error('Test error'));

      const result = await GET(mockRequest);

      expect(result.status).toBe(500);
      const body = await result.json();
      expect(body).toEqual({ error: 'Authentication failed' });
    });
  });
});
