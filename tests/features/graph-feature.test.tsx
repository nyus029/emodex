/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import GraphFeature from '@/features/graph/GraphFeature';

describe('GraphFeature', () => {
  it('renders title and description', () => {
    render(<GraphFeature />);

    expect(
      screen.getByRole('heading', { name: '指数関数グラフ' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        '初期値100で、一年で十倍になる指数関数 y = 100 × 10^t のグラフ',
      ),
    ).toBeInTheDocument();
  });

  it('renders link to home page', () => {
    render(<GraphFeature />);

    const homeLink = screen.getByRole('link', { name: 'ホームへ戻る' });
    expect(homeLink).toBeInTheDocument();
    expect(homeLink).toHaveAttribute('href', '/');
  });

  it('generates 11 data points', () => {
    render(<GraphFeature />);

    // テーブルのヘッダーを確認
    expect(screen.getByText('時間（年）')).toBeInTheDocument();
    expect(screen.getByText('値')).toBeInTheDocument();

    // データポイントが11個表示される（テーブル行数 - ヘッダー行 = 11）
    const tableRows = screen.getByRole('table').querySelectorAll('tbody tr');
    expect(tableRows).toHaveLength(11);
  });

  it('displays correct first data point (t=0, value=100)', () => {
    render(<GraphFeature />);

    const firstRow = screen.getByRole('table').querySelectorAll('tbody tr')[0];
    expect(firstRow).toHaveTextContent('0年');
    expect(firstRow).toHaveTextContent('100.00');
  });

  it('displays correct last data point (t=1, value=1000)', () => {
    render(<GraphFeature />);

    const rows = screen.getByRole('table').querySelectorAll('tbody tr');
    const lastRow = rows[rows.length - 1];
    expect(lastRow).toHaveTextContent('1年');
    expect(lastRow).toHaveTextContent('1000.00');
  });

  it('calculates exponential function correctly for all points', () => {
    render(<GraphFeature />);

    const rows = screen.getByRole('table').querySelectorAll('tbody tr');

    // 各データポイントの値を検証
    rows.forEach((row, index) => {
      const t = index / 10; // 0, 0.1, 0.2, ..., 1.0
      const expectedValue = 100 * Math.pow(10, t);
      const expectedValueText = expectedValue.toFixed(2);

      expect(row).toHaveTextContent(`${t}年`);
      expect(row).toHaveTextContent(expectedValueText);
    });
  });

  it('displays graph section with description', () => {
    render(<GraphFeature />);

    expect(screen.getByRole('heading', { name: 'グラフ' })).toBeInTheDocument();
    expect(
      screen.getByText(
        '一年間を10分割した11点をプロット（t = 0, 0.1, 0.2, ..., 1.0）',
      ),
    ).toBeInTheDocument();
  });

  it('displays data points table section', () => {
    render(<GraphFeature />);

    expect(
      screen.getByRole('heading', { name: 'データポイント' }),
    ).toBeInTheDocument();
  });
});
