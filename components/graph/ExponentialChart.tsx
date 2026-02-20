'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

type DataPoint = {
  time: number;
  value: number;
};

type ExponentialChartProps = {
  data: DataPoint[];
};

export default function ExponentialChart({ data }: ExponentialChartProps) {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart
        data={data}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="time"
          label={{
            value: '時間（年）',
            position: 'insideBottom',
            offset: -5,
          }}
          tickFormatter={(value) => `${value}年`}
        />
        <YAxis
          label={{ value: '値', angle: -90, position: 'insideLeft' }}
          domain={['auto', 'auto']}
        />
        <Tooltip
          formatter={(value: number) => [value.toFixed(2), '値']}
          labelFormatter={(label) => `${label}年`}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="value"
          stroke="#8884d8"
          strokeWidth={2}
          dot={{ r: 5 }}
          name="指数関数"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
