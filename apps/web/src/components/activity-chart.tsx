'use client';

import { formatNumber } from '@/lib/format';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export interface ActivityPoint {
  label: string;
  messages: number;
  commands: number;
  joins: number;
}

export function ActivityChart({
  data,
  height = 300,
  showJoins = true,
}: {
  data: ActivityPoint[];
  height?: number;
  showJoins?: boolean;
}) {
  return (
    <div
      className="w-full"
      style={{ height }}
      role="img"
      aria-label="Activity chart for the selected date range"
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 6, bottom: 0, left: -18 }}>
          <defs>
            <linearGradient id="fill-messages" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.42} />
              <stop offset="100%" stopColor="#a78bfa" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="fill-commands" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2dd4bf" stopOpacity={0.32} />
              <stop offset="100%" stopColor="#2dd4bf" stopOpacity={0.01} />
            </linearGradient>
            <linearGradient id="fill-joins" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.24} />
              <stop offset="100%" stopColor="#fbbf24" stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#1e2533" strokeDasharray="3 6" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: '#64748b', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            minTickGap={28}
          />
          <YAxis
            tick={{ fill: '#64748b', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={42}
            tickFormatter={(value: number) => formatNumber(value)}
          />
          <Tooltip
            cursor={{ stroke: '#334155', strokeDasharray: '3 4' }}
            contentStyle={{
              background: '#0d111a',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 12,
              color: '#e8ecf4',
              fontSize: 12,
            }}
            labelStyle={{ color: '#94a3b8' }}
            itemStyle={{ color: '#e8ecf4' }}
            formatter={(value) => formatNumber(Number(value ?? 0))}
          />
          <Area
            type="monotone"
            dataKey="messages"
            stroke="#a78bfa"
            strokeWidth={2}
            fill="url(#fill-messages)"
            activeDot={{ r: 3, stroke: '#0d111a', strokeWidth: 2 }}
          />
          <Area
            type="monotone"
            dataKey="commands"
            stroke="#2dd4bf"
            strokeWidth={2}
            fill="url(#fill-commands)"
            activeDot={{ r: 3, stroke: '#0d111a', strokeWidth: 2 }}
          />
          {showJoins ? (
            <Area
              type="monotone"
              dataKey="joins"
              stroke="#fbbf24"
              strokeWidth={2}
              fill="url(#fill-joins)"
              activeDot={{ r: 3, stroke: '#0d111a', strokeWidth: 2 }}
            />
          ) : null}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
