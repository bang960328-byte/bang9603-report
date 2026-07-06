import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface CategoryDatum {
  category: string;
  count: number;
  averageRate: number | null;
}

export function CategoryBreakdownChart({ data }: { data: CategoryDatum[] }) {
  // 목표값이 없는 지표만 있는 대분류(averageRate=null)는 0%로 오인되지 않도록 맨 아래에 둔다
  const sorted = [...data].sort((a, b) => (b.averageRate ?? -1) - (a.averageRate ?? -1));
  const numericRates = sorted.map((d) => d.averageRate).filter((r): r is number => r !== null);
  const maxRate = Math.max(120, ...numericRates);
  // 축 상한을 10 단위로 올림해 가장 높은 막대와 라벨이 잘리지 않도록 여유를 둔다
  const axisMax = Math.ceil((maxRate + 15) / 10) * 10;

  return (
    <ResponsiveContainer width="100%" height={Math.max(220, sorted.length * 34)}>
      <BarChart data={sorted} layout="vertical" margin={{ top: 0, right: 44, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e1e0d9" horizontal={false} />
        <XAxis
          type="number"
          domain={[0, axisMax]}
          tick={{ fontSize: 11, fill: '#898781' }}
          axisLine={false}
          tickLine={false}
          unit="%"
        />
        <YAxis
          type="category"
          dataKey="category"
          width={200}
          interval={0}
          tick={{ fontSize: 11, fill: '#0b0b0b' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          formatter={(value, _name, item) => [
            value === null ? '집계 대상 지표 없음' : `${value}% (지표 ${item.payload.count}개)`,
            '평균 달성률',
          ]}
          contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: '#e1e0d9' }}
        />
        <Bar dataKey="averageRate" fill="#2a78d6" radius={[0, 4, 4, 0]} maxBarSize={20}>
          <LabelList
            dataKey="averageRate"
            position="right"
            formatter={(v: number | null) => (v === null ? '-' : `${v}%`)}
            style={{ fontSize: 11, fill: '#0b0b0b' }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
