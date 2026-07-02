import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface RankingDatum {
  indicator_name: string;
  rate: number;
  category: string;
}

export function IndicatorRankingChart({ data }: { data: RankingDatum[] }) {
  const top = [...data].slice(0, 8).map((d) => ({
    ...d,
    short: d.indicator_name.length > 14 ? `${d.indicator_name.slice(0, 14)}…` : d.indicator_name,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={top} layout="vertical" margin={{ top: 0, right: 32, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e1e0d9" horizontal={false} />
        <XAxis type="number" domain={[0, 120]} tick={{ fontSize: 11, fill: '#898781' }} axisLine={false} tickLine={false} unit="%" />
        <YAxis
          type="category"
          dataKey="short"
          width={110}
          tick={{ fontSize: 12, fill: '#0b0b0b' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          formatter={(value: number) => [`${value}%`, '달성률']}
          labelFormatter={(_label, payload) => payload?.[0]?.payload?.indicator_name ?? ''}
          contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: '#e1e0d9' }}
        />
        <Bar dataKey="rate" fill="#2a78d6" radius={[0, 4, 4, 0]} maxBarSize={18}>
          <LabelList dataKey="rate" position="right" formatter={(v: number) => `${v}%`} style={{ fontSize: 11, fill: '#0b0b0b' }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
