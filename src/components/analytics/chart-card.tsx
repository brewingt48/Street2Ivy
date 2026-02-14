'use client';

/**
 * Chart Card Component
 *
 * Wrapper Card for recharts with line, bar, and pie chart variants.
 */

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

const COLORS = [
  '#0d9488', // teal-600
  '#0284c7', // sky-600
  '#7c3aed', // violet-600
  '#ea580c', // orange-600
  '#059669', // emerald-600
  '#dc2626', // red-600
  '#ca8a04', // yellow-600
  '#9333ea', // purple-600
];

interface ChartSeries {
  key: string;
  label: string;
  color?: string;
}

interface BaseChartCardProps {
  title: string;
  description?: string;
  data: Record<string, unknown>[];
  height?: number;
}

interface LineChartCardProps extends BaseChartCardProps {
  type: 'line';
  xKey: string;
  series: ChartSeries[];
}

interface BarChartCardProps extends BaseChartCardProps {
  type: 'bar';
  xKey: string;
  series: ChartSeries[];
  stacked?: boolean;
}

interface PieChartCardProps extends BaseChartCardProps {
  type: 'pie';
  nameKey: string;
  valueKey: string;
}

type ChartCardProps = LineChartCardProps | BarChartCardProps | PieChartCardProps;

export function ChartCard(props: ChartCardProps) {
  const { title, description, data, height = 300 } = props;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex items-center justify-center text-slate-400 text-sm" style={{ height }}>
            No data available for this period
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={height}>
            {props.type === 'line' ? (
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey={props.xKey} tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                {props.series.map((s, i) => (
                  <Line
                    key={s.key}
                    type="monotone"
                    dataKey={s.key}
                    name={s.label}
                    stroke={s.color || COLORS[i % COLORS.length]}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                ))}
              </LineChart>
            ) : props.type === 'bar' ? (
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey={props.xKey} tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                {props.series.map((s, i) => (
                  <Bar
                    key={s.key}
                    dataKey={s.key}
                    name={s.label}
                    fill={s.color || COLORS[i % COLORS.length]}
                    stackId={props.stacked ? 'stack' : undefined}
                    radius={[4, 4, 0, 0]}
                  />
                ))}
              </BarChart>
            ) : (
              <PieChart>
                <Pie
                  data={data}
                  dataKey={props.valueKey}
                  nameKey={props.nameKey}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, percent }: { name?: string; percent?: number }) =>
                    `${name || ''} ${((percent || 0) * 100).toFixed(0)}%`
                  }
                  labelLine={{ stroke: '#94a3b8' }}
                >
                  {data.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            )}
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
