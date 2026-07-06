import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface RankingDatum {
  indicator_name: string;
  rate: number;
  category: string;
}

export function IndicatorRankingChart({ data }: { data: RankingDatum[] }) {
  const sorted = [...data].sort((a, b) => b.rate - a.rate).map((d) => ({
    ...d,
    short: d.indicator_name.length > 14 ? `${d.indicator_name.slice(0, 14)}…` : d.indicator_name,
  }));
  // 333%처럼 100%를 크게 웃도는 지표도 있어 축 상한을 데이터에 맞춰 동적으로 계산한다
  const maxRate = Math.max(120, ...sorted.map((d) => d.rate));
  const axisMax = Math.ceil((maxRate + 15) / 10) * 10;

  return (
    <ResponsiveContainer width="100%" height={Math.max(280, sorted.length * 28)}>
      <BarChart data={sorted} layout="vertical" margin={{ top: 0, right: 36, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e1e0d9" horizontal={false} />
        <XAxis type="number" domain={[0, axisMax]} tick={{ fontSize: 11, fill: '#898781' }} axisLine={false} tickLine={false} unit="%" />
        <YAxis
          type="category"
          dataKey="short"
          width={130}
          interval={0}
          tick={{ fontSize: 11, fill: '#0b0b0b' }}
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
