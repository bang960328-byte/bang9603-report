import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface UniversityRateDatum {
  university_name: string;
  rate: number;
}

// 참여대학 고정 순서 + CVD-safe 카테고리 색상 (dataviz 팔레트 검증 완료)
const UNIVERSITY_COLOR: Record<string, string> = {
  강원대학교: '#2a78d6',
  아주대학교: '#1baf7a',
  충남대학교: '#eda100',
  '한양대학교 ERICA': '#008300',
  영남이공대학교: '#4a3aa7',
};

export function UniversityComparisonChart({ data }: { data: UniversityRateDatum[] }) {
  // 라벨(예: "121.8%")이 차트 상단에서 잘리지 않도록, 실제 최대값보다 여유를 두고 Y축 상한을 잡는다.
  const maxRate = Math.max(100, ...data.map((d) => d.rate));
  const yDomainMax = Math.ceil((maxRate * 1.2) / 10) * 10;

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 24, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e1e0d9" vertical={false} />
        <XAxis
          dataKey="university_name"
          tick={{ fontSize: 12, fill: '#52514e' }}
          axisLine={{ stroke: '#c3c2b7' }}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 12, fill: '#898781' }}
          axisLine={false}
          tickLine={false}
          domain={[0, yDomainMax]}
          unit="%"
        />
        <Tooltip
          formatter={(value: number) => [`${value}%`, '평균 달성률']}
          contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: '#e1e0d9' }}
        />
        <Bar dataKey="rate" radius={[4, 4, 0, 0]} maxBarSize={56}>
          {data.map((d) => (
            <Cell key={d.university_name} fill={UNIVERSITY_COLOR[d.university_name] ?? '#2a78d6'} />
          ))}
          <LabelList dataKey="rate" position="top" formatter={(v: number) => `${v}%`} style={{ fontSize: 11, fill: '#0b0b0b' }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
