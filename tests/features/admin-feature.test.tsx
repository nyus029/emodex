/**
 * @jest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AdminFeature from '@/features/admin/AdminFeature';

jest.mock('@/features/admin/AdminEmoSection', () => ({
  __esModule: true,
  default: () => <div>AdminEmoSectionMock</div>,
}));

function createJsonResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
  };
}

describe('AdminFeature', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders overview data from /api/admin/overview', async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      createJsonResponse({
        generatedAt: '2026-02-20T10:00:00.000Z',
        currentUser: {
          id: 1,
          name: 'Admin',
          email: 'admin@example.com',
          isRegisteredAdmin: true,
          isBootstrapAdmin: false,
        },
        systemAdministrators: [],
        users: [],
        groups: [],
        albums: [],
      }),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<AdminFeature />);

    await waitFor(() =>
      expect(screen.getByText('System Administrator 管理')).toBeInTheDocument(),
    );
    expect(screen.getByText('管理者インターフェース')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/overview', {
      method: 'GET',
    });
  });

  it('submits add system administrator action', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(
        createJsonResponse({
          generatedAt: '2026-02-20T10:00:00.000Z',
          currentUser: {
            id: 1,
            name: 'Admin',
            email: 'admin@example.com',
            isRegisteredAdmin: true,
            isBootstrapAdmin: false,
          },
          systemAdministrators: [],
          users: [],
          groups: [],
          albums: [],
        }),
      )
      .mockResolvedValueOnce(
        createJsonResponse(
          {
            systemAdministrator: {
              id: 'sa-2',
              userId: 2,
              userEmail: 'u2@example.com',
              userName: 'User 2',
              createdAt: '2026-02-20T10:00:00.000Z',
            },
          },
          201,
        ),
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          generatedAt: '2026-02-20T10:00:10.000Z',
          currentUser: {
            id: 1,
            name: 'Admin',
            email: 'admin@example.com',
            isRegisteredAdmin: true,
            isBootstrapAdmin: false,
          },
          systemAdministrators: [
            {
              id: 'sa-2',
              userId: 2,
              userName: 'User 2',
              userEmail: 'u2@example.com',
              createdByUserId: 1,
              createdByUserEmail: 'admin@example.com',
              createdAt: '2026-02-20T10:00:00.000Z',
            },
          ],
          users: [],
          groups: [],
          albums: [],
        }),
      );
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<AdminFeature />);

    await waitFor(() =>
      expect(screen.getByText('System Administrator 管理')).toBeInTheDocument(),
    );

    fireEvent.change(screen.getByPlaceholderText('User ID (例: 12)'), {
      target: { value: '2' },
    });
    fireEvent.click(screen.getByRole('button', { name: '追加' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/admin/system-administrators',
      expect.objectContaining({
        method: 'POST',
      }),
    );
  });
});
