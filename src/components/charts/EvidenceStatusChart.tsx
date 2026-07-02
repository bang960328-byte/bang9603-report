import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { EvidenceStatus } from '@/types';

interface EvidenceDatum {
  status: EvidenceStatus;
  count: number;
}

// 상태 색상은 카테고리 색과 구분되는 고정 팔레트(양호/위험/중립) 사용
const STATUS_COLOR: Record<EvidenceStatus, string> = {
  제출: '#0ca30c',
  미제출: '#d03b3b',
  해당없음: '#898781',
};

export function EvidenceStatusChart({ data }: { data: EvidenceDatum[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 32, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e1e0d9" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11, fill: '#898781' }} axisLine={false} tickLine={false} allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="status"
          width={64}
          tick={{ fontSize: 12, fill: '#0b0b0b' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          formatter={(value: number) => [`${value}건`, '건수']}
          contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: '#e1e0d9' }}
        />
        <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={22}>
          {data.map((d) => (
            <Cell key={d.status} fill={STATUS_COLOR[d.status]} />
          ))}
          <LabelList dataKey="count" position="right" formatter={(v: number) => `${v}건`} style={{ fontSize: 11, fill: '#0b0b0b' }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
