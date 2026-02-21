/**
 * @jest-environment jsdom
 *
 * DividendActionPanel: 配当受取成功時に onReceiveSuccess が呼ばれ配当詳細へ遷移できること、
 * 再投資時・onReceiveSuccess 未指定時は onComplete が呼ばれることの検証
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import DividendActionPanel from '@/components/invests/DividendActionPanel';

// 配当予定日を過去にして「配当日に到達しました」を表示
const PAST_DIVIDEND = '2020-01-01T00:00:00.000Z';

describe('DividendActionPanel', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it('renders nothing when plannedDividend is null', () => {
    const { container } = render(
      <DividendActionPanel
        albumId="alb-1"
        plannedDividend={null}
        emoValue={1000}
        onComplete={jest.fn()}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('shows planned date when dividend date is not reached', () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    render(
      <DividendActionPanel
        albumId="alb-1"
        plannedDividend={future.toISOString()}
        emoValue={1000}
        onComplete={jest.fn()}
      />,
    );
    expect(screen.getByText(/配当予定日:/)).toBeInTheDocument();
  });

  it('calls onReceiveSuccess with event ids when RECEIVE succeeds and onReceiveSuccess is provided', async () => {
    const onReceiveSuccess = jest.fn();
    const onComplete = jest.fn();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        action: 'RECEIVE',
        events: [{ id: 'evt-1' }, { id: 'evt-2' }],
      }),
    });

    render(
      <DividendActionPanel
        albumId="alb-1"
        plannedDividend={PAST_DIVIDEND}
        emoValue={1500}
        onComplete={onComplete}
        onReceiveSuccess={onReceiveSuccess}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '受け取る' }));
    fireEvent.click(screen.getByRole('button', { name: '実行する' }));

    await waitFor(() => {
      expect(onReceiveSuccess).toHaveBeenCalledWith(['evt-1', 'evt-2']);
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/albums/alb-1/dividend'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ action: 'RECEIVE' }),
      }),
    );
    expect(onReceiveSuccess).toHaveBeenCalledTimes(1);
    expect(onReceiveSuccess).toHaveBeenCalledWith(['evt-1', 'evt-2']);
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('calls onComplete when RECEIVE succeeds but onReceiveSuccess is not provided', async () => {
    const onComplete = jest.fn();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ action: 'RECEIVE', events: [{ id: 'evt-1' }] }),
    });

    render(
      <DividendActionPanel
        albumId="alb-1"
        plannedDividend={PAST_DIVIDEND}
        emoValue={1500}
        onComplete={onComplete}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '受け取る' }));
    fireEvent.click(screen.getByRole('button', { name: '実行する' }));

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });

  it('calls onComplete when REINVEST succeeds', async () => {
    const onComplete = jest.fn();
    const onReceiveSuccess = jest.fn();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        action: 'REINVEST',
        events: [{ id: 'evt-1' }],
      }),
    });

    render(
      <DividendActionPanel
        albumId="alb-1"
        plannedDividend={PAST_DIVIDEND}
        emoValue={1500}
        onComplete={onComplete}
        onReceiveSuccess={onReceiveSuccess}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '再投資する' }));
    fireEvent.click(screen.getByRole('button', { name: '実行する' }));

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
    expect(onReceiveSuccess).not.toHaveBeenCalled();
  });

  it('does not call onReceiveSuccess nor onComplete when request fails', async () => {
    const onComplete = jest.fn();
    const onReceiveSuccess = jest.fn();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Dividend date has not been reached' }),
    });

    render(
      <DividendActionPanel
        albumId="alb-1"
        plannedDividend={PAST_DIVIDEND}
        emoValue={1500}
        onComplete={onComplete}
        onReceiveSuccess={onReceiveSuccess}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '受け取る' }));
    fireEvent.click(screen.getByRole('button', { name: '実行する' }));

    await waitFor(() => {
      expect(
        screen.getByText(/Dividend date has not been reached/),
      ).toBeInTheDocument();
    });

    expect(onComplete).not.toHaveBeenCalled();
    expect(onReceiveSuccess).not.toHaveBeenCalled();
  });
});
