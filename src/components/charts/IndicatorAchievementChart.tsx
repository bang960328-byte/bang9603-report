import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface RankingDatum {
  indicator_name: string;
  rate: number;
  category: string;
}

interface CategoryDatum {
  category: string;
  rate: number;
  count: number;
}

// 총괄 탭 기준 자율지표 대분류 — 대학혁신부터가 자율지표, 그 앞은 전부 핵심지표
const AUTONOMOUS_CATEGORIES = ['대학혁신', '지역혁신', '산업혁신', '글로벌혁신'];

function average(nums: number[]): number {
  if (nums.length === 0) return 0;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}

function CategoryBarGroup({
  title,
  categoryData,
  expanded,
  onToggle,
  expandedItems,
}: {
  title: string;
  categoryData: CategoryDatum[];
  expanded: string | null;
  onToggle: (category: string) => void;
  expandedItems: (RankingDatum & { short: string })[];
}) {
  if (categoryData.length === 0) return null;
  const axisMax = Math.ceil((Math.max(120, ...categoryData.map((d) => d.rate)) + 15) / 10) * 10;
  const expandedAxisMax =
    expandedItems.length > 0 ? Math.ceil((Math.max(120, ...expandedItems.map((d) => d.rate)) + 15) / 10) * 10 : 120;
  const isExpandedHere = expanded !== null && categoryData.some((d) => d.category === expanded);

  return (
    <div>
      <p className="mb-2 text-xs font-semibold text-gray-500">{title}</p>
      <ResponsiveContainer width="100%" height={Math.max(160, categoryData.length * 34)}>
        <BarChart data={categoryData} layout="vertical" margin={{ top: 0, right: 36, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e1e0d9" horizontal={false} />
          <XAxis type="number" domain={[0, axisMax]} tick={{ fontSize: 11, fill: '#898781' }} axisLine={false} tickLine={false} unit="%" />
          <YAxis type="category" dataKey="category" width={160} interval={0} tick={{ fontSize: 11, fill: '#0b0b0b' }} axisLine={false} tickLine={false} />
          <Tooltip
            formatter={(value, _name, item) => [`${value}% (지표 ${item.payload.count}개)`, '평균 달성률']}
            contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: '#e1e0d9' }}
          />
          <Bar
            dataKey="rate"
            fill="#2a78d6"
            radius={[0, 4, 4, 0]}
            maxBarSize={20}
            cursor="pointer"
            onClick={(entry) => onToggle(entry.category)}
          >
            <LabelList dataKey="rate" position="right" formatter={(v: number) => `${v}%`} style={{ fontSize: 11, fill: '#0b0b0b' }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {isExpandedHere && (
        <div className="mt-3 border-t border-gray-100 pt-3">
          <p className="mb-2 text-xs font-semibold text-gray-500">{expanded} · 세부 지표 {expandedItems.length}개</p>
          <ResponsiveContainer width="100%" height={Math.max(160, expandedItems.length * 30)}>
            <BarChart data={expandedItems} layout="vertical" margin={{ top: 0, right: 36, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e1e0d9" horizontal={false} />
              <XAxis type="number" domain={[0, expandedAxisMax]} tick={{ fontSize: 11, fill: '#898781' }} axisLine={false} tickLine={false} unit="%" />
              <YAxis type="category" dataKey="short" width={140} interval={0} tick={{ fontSize: 11, fill: '#0b0b0b' }} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(value) => [`${value}%`, '달성률']}
                labelFormatter={(_label, payload) => payload?.[0]?.payload?.indicator_name ?? ''}
                contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: '#e1e0d9' }}
              />
              <Bar dataKey="rate" fill="#5b8def" radius={[0, 4, 4, 0]} maxBarSize={16}>
                <LabelList dataKey="rate" position="right" formatter={(v: number) => `${v}%`} style={{ fontSize: 10, fill: '#0b0b0b' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export function IndicatorAchievementChart({ data }: { data: RankingDatum[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const { coreCategories, autonomousCategories } = useMemo(() => {
    const grouped = new Map<string, number[]>();
    data.forEach((d) => {
      if (!grouped.has(d.category)) grouped.set(d.category, []);
      grouped.get(d.category)!.push(d.rate);
    });
    const all = Array.from(grouped.entries()).map(([category, rates]) => ({
      category,
      rate: average(rates),
      count: rates.length,
    }));
    return {
      coreCategories: all.filter((d) => !AUTONOMOUS_CATEGORIES.includes(d.category)).sort((a, b) => b.rate - a.rate),
      autonomousCategories: all.filter((d) => AUTONOMOUS_CATEGORIES.includes(d.category)).sort((a, b) => b.rate - a.rate),
    };
  }, [data]);

  const expandedItems = useMemo(() => {
    if (!expanded) return [];
    return [...data]
      .filter((d) => d.category === expanded)
      .sort((a, b) => b.rate - a.rate)
      .map((d) => ({
        ...d,
        short: d.indicator_name.length > 16 ? `${d.indicator_name.slice(0, 16)}…` : d.indicator_name,
      }));
  }, [data, expanded]);

  const toggle = (category: string) => setExpanded((prev) => (prev === category ? null : category));

  return (
    <div className="space-y-6">
      <p className="text-xs text-gray-400">막대를 클릭하면 지수 내 세부 지표가 아래에 펼쳐집니다.</p>
      <CategoryBarGroup
        title="핵심지표"
        categoryData={coreCategories}
        expanded={expanded}
        onToggle={toggle}
        expandedItems={expandedItems}
      />
      <CategoryBarGroup
        title="자율지표"
        categoryData={autonomousCategories}
        expanded={expanded}
        onToggle={toggle}
        expandedItems={expandedItems}
      />
    </div>
  );
}
