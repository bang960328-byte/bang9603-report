import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface CategoryDatum {
  category: string;
  count: number;
  averageRate: number;
}

export function CategoryBreakdownChart({ data }: { data: CategoryDatum[] }) {
  const sorted = [...data].sort((a, b) => b.averageRate - a.averageRate);

  return (
    <ResponsiveContainer width="100%" height={Math.max(220, sorted.length * 34)}>
      <BarChart data={sorted} layout="vertical" margin={{ top: 0, right: 32, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e1e0d9" horizontal={false} />
        <XAxis type="number" domain={[0, 120]} tick={{ fontSize: 11, fill: '#898781' }} axisLine={false} tickLine={false} unit="%" />
        <YAxis
          type="category"
          dataKey="category"
          width={170}
          tick={{ fontSize: 12, fill: '#0b0b0b' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          formatter={(value: number, _name, item) => [`${value}% (지표 ${item.payload.count}개)`, '평균 달성률']}
          contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: '#e1e0d9' }}
        />
        <Bar dataKey="averageRate" fill="#2a78d6" radius={[0, 4, 4, 0]} maxBarSize={20}>
          <LabelList dataKey="averageRate" position="right" formatter={(v: number) => `${v}%`} style={{ fontSize: 11, fill: '#0b0b0b' }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
