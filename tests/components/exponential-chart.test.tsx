/**
 * @jest-environment jsdom
 */

import { render } from '@testing-library/react';
import ExponentialChart from '@/components/graph/ExponentialChart';

// Rechartsのコンポーネントをモック
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  LineChart: ({
    data,
    children,
  }: {
    data: unknown[];
    children: React.ReactNode;
  }) => (
    <div data-testid="line-chart" data-chart-data={JSON.stringify(data)}>
      {children}
    </div>
  ),
  Line: () => <div data-testid="line">Line</div>,
  XAxis: () => <div data-testid="x-axis">XAxis</div>,
  YAxis: () => <div data-testid="y-axis">YAxis</div>,
  CartesianGrid: () => <div data-testid="cartesian-grid">CartesianGrid</div>,
  Tooltip: () => <div data-testid="tooltip">Tooltip</div>,
  Legend: () => <div data-testid="legend">Legend</div>,
}));

describe('ExponentialChart', () => {
  const mockData = [
    { time: 0, value: 100 },
    { time: 0.5, value: 316.23 },
    { time: 1, value: 1000 },
  ];

  it('renders without crashing', () => {
    const { container } = render(<ExponentialChart data={mockData} />);
    expect(container).toBeInTheDocument();
  });

  it('renders ResponsiveContainer', () => {
    const { getByTestId } = render(<ExponentialChart data={mockData} />);
    expect(getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('renders LineChart with correct data', () => {
    const { getByTestId } = render(<ExponentialChart data={mockData} />);
    const lineChart = getByTestId('line-chart');
    expect(lineChart).toBeInTheDocument();

    const chartData = JSON.parse(
      lineChart.getAttribute('data-chart-data') || '[]',
    );
    expect(chartData).toEqual(mockData);
  });

  it('renders all chart components', () => {
    const { getByTestId } = render(<ExponentialChart data={mockData} />);

    expect(getByTestId('line-chart')).toBeInTheDocument();
    expect(getByTestId('line')).toBeInTheDocument();
    expect(getByTestId('x-axis')).toBeInTheDocument();
    expect(getByTestId('y-axis')).toBeInTheDocument();
    expect(getByTestId('cartesian-grid')).toBeInTheDocument();
    expect(getByTestId('tooltip')).toBeInTheDocument();
    expect(getByTestId('legend')).toBeInTheDocument();
  });

  it('handles empty data array', () => {
    const { getByTestId } = render(<ExponentialChart data={[]} />);
    const lineChart = getByTestId('line-chart');
    const chartData = JSON.parse(
      lineChart.getAttribute('data-chart-data') || '[]',
    );
    expect(chartData).toEqual([]);
  });

  it('handles single data point', () => {
    const singleDataPoint = [{ time: 0, value: 100 }];
    const { getByTestId } = render(<ExponentialChart data={singleDataPoint} />);
    const lineChart = getByTestId('line-chart');
    const chartData = JSON.parse(
      lineChart.getAttribute('data-chart-data') || '[]',
    );
    expect(chartData).toEqual(singleDataPoint);
  });
});
