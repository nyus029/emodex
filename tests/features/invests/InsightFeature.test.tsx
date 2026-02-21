/**
 * @jest-environment jsdom
 *
 * InsightFeature: フォトストレージ表示と配当受取後の配当詳細画面への遷移の検証
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InsightFeature from '@/features/invests/InsightFeature';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock(
  '@/components/invests/EmoChart',
  () =>
    function MockEmoChart() {
      return <div data-testid="emo-chart" />;
    },
);
jest.mock(
  '@/components/invests/PeriodTabs',
  () =>
    function MockPeriodTabs() {
      return <div data-testid="period-tabs" />;
    },
);

describe('InsightFeature', () => {
  const albumId = 'alb-insight-feature-1';

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : (input as Request).url;
      if (url.includes('/insight/')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            albumBasicInfo: {
              name: 'Test Album',
              createdAt: '2026-01-15',
              plannedDividend: '2020-01-01T00:00:00.000Z', // 過去で配当ボタン表示
            },
            emoValueInfo: {
              emoValue: 1200,
              dayOverDayChange: { value: 50, percentage: 4.3 },
            },
            photoStorages: [
              {
                id: 'ps-1',
                name: 'Spring Trip',
                storagePath: 'a/spring',
                photoCount: 5,
              },
              {
                id: 'ps-2',
                name: 'Summer BBQ',
                storagePath: 'a/summer',
                photoCount: 12,
              },
            ],
          }),
        });
      }
      if (url.includes('/chart')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ period: '1M', data: [] }),
        });
      }
      return Promise.reject(new Error('Unexpected fetch'));
    }) as jest.Mock;
  });

  it('displays photo storages section with names and counts when data includes photoStorages', async () => {
    render(<InsightFeature albumId={albumId} />);

    await waitFor(() => {
      expect(screen.getByText('フォトストレージ')).toBeInTheDocument();
    });

    expect(screen.getByText('Spring Trip')).toBeInTheDocument();
    expect(screen.getByText('Summer BBQ')).toBeInTheDocument();
    expect(screen.getByText('5枚')).toBeInTheDocument();
    expect(screen.getByText('12枚')).toBeInTheDocument();
  });

  it('calls dividend API with photoStorageId when user clicks per-storage 配当を受け取る', async () => {
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
    const fetchMock = global.fetch as jest.Mock;
    fetchMock.mockImplementation(
      (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : (input as Request).url;
        if (url.includes('/insight/')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              albumBasicInfo: {
                name: 'Test Album',
                createdAt: '2026-01-15',
                plannedDividend: '2020-01-01T00:00:00.000Z',
              },
              emoValueInfo: {
                emoValue: 1200,
                dayOverDayChange: { value: 50, percentage: 4.3 },
              },
              photoStorages: [
                {
                  id: 'ps-1',
                  name: 'Spring Trip',
                  storagePath: 'a/spring',
                  photoCount: 5,
                },
                {
                  id: 'ps-2',
                  name: 'Summer BBQ',
                  storagePath: 'a/summer',
                  photoCount: 12,
                },
              ],
            }),
          });
        }
        if (url.includes('/chart')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ period: '1M', data: [] }),
          });
        }
        if (url.includes('/dividend') && init?.method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              action: 'RECEIVE',
              events: [{ id: 'evt-ps-1' }],
            }),
          });
        }
        return Promise.reject(new Error('Unexpected fetch'));
      },
    );

    render(<InsightFeature albumId={albumId} />);

    await waitFor(() => {
      expect(screen.getByText('Spring Trip')).toBeInTheDocument();
    });

    const receiveButtons = screen.getAllByRole('button', {
      name: '配当を受け取る',
    });
    expect(receiveButtons.length).toBeGreaterThanOrEqual(2);
    await userEvent.click(receiveButtons[0]);

    await waitFor(() => {
      const dividendCalls = fetchMock.mock.calls.filter(
        (call: [string, RequestInit]) =>
          typeof call[0] === 'string' &&
          call[0].includes('/dividend') &&
          call[1]?.method === 'POST',
      );
      expect(dividendCalls.length).toBe(1);
      const body = JSON.parse(dividendCalls[0][1].body as string);
      expect(body).toEqual({ action: 'RECEIVE', photoStorageId: 'ps-1' });
    });
    confirmSpy.mockRestore();
  });

  it('navigates to dividend detail page when user receives dividend and onReceiveSuccess triggers', async () => {
    (global.fetch as jest.Mock).mockImplementation(
      (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : (input as Request).url;
        const method =
          (typeof input !== 'string' && (input as Request).method) ||
          init?.method;
        if (url.includes('/insight/')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              albumBasicInfo: {
                name: 'Test Album',
                createdAt: '2026-01-15',
                plannedDividend: '2020-01-01T00:00:00.000Z',
              },
              emoValueInfo: {
                emoValue: 1200,
                dayOverDayChange: { value: 50, percentage: 4.3 },
              },
              photoStorages: [],
            }),
          });
        }
        if (url.includes('/chart')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ period: '1M', data: [] }),
          });
        }
        if (url.includes('/dividend') && method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              action: 'RECEIVE',
              events: [{ id: 'evt-detail-1' }, { id: 'evt-detail-2' }],
            }),
          });
        }
        return Promise.reject(new Error('Unexpected fetch'));
      },
    );

    render(<InsightFeature albumId={albumId} />);

    await waitFor(() => {
      expect(screen.getByText(/配当日に到達しました！/)).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('button', { name: '受け取る' }));
    await userEvent.click(screen.getByRole('button', { name: '実行する' }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dividend/evt-detail-1');
    });
  });
});
