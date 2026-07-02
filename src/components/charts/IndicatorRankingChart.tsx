import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface RankingDatum {
  indicator_name: string;
  rate: number;
  category: '핵심' | '자율';
}

const CATEGORY_COLOR: Record<string, string> = {
  핵심: '#2a78d6',
  자율: '#1baf7a',
};

export function IndicatorRankingChart({ data }: { data: RankingDatum[] }) {
  const top = [...data].slice(0, 8).map((d) => ({
    ...d,
    short: d.indicator_name.length > 14 ? `${d.indicator_name.slice(0, 14)}…` : d.indicator_name,
  }));

  return (
    <div>
      <div className="mb-2 flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CATEGORY_COLOR.핵심 }} />
          핵심 지표
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CATEGORY_COLOR.자율 }} />
          자율 지표
        </span>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={top} layout="vertical" margin={{ top: 0, right: 24, left: 8, bottom: 0 }}>
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
          <Bar dataKey="rate" radius={[0, 4, 4, 0]} maxBarSize={18}>
            {top.map((d) => (
              <Cell key={d.indicator_name} fill={CATEGORY_COLOR[d.category]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
