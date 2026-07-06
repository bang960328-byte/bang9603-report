import { useEffect, useMemo, useRef, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

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

// 총괄 탭 원래 순서 — 지수 이름의 공백·줄바꿈을 정규화한 값으로 비교한다
// (병합 셀 forward-fill로 인해 실제 시트의 대분류 값에는 줄바꿈이 섞여 들어오는 경우가 있음)
const CORE_CATEGORY_ORDER = [
  '교원확보지수',
  '교육과정및교과목개발/개선지수',
  '교육과정및교과목운영지수',
  '제도화운영지수',
  '인프라운영지수',
  '지·산·학프로젝트교과운영건수',
  '일반학습자교육콘텐츠공유지수',
  '교육과정및교과목이수지수',
  '공유교과목이수지수',
  '지·산·학프로젝트교과이수지수',
  '교육만족도',
  '진로성과지수',
];
// 자율지표 — 대학혁신부터가 자율지표, 그 앞은 전부 핵심지표
const AUTONOMOUS_CATEGORY_ORDER = ['대학혁신', '지역혁신', '산업혁신', '글로벌혁신'];

const ACHIEVED_COLOR = '#2a78d6'; // 100% 이상
const UNDER_COLOR = '#e11d48'; // 100% 미만

function normalizeCategoryKey(category: string): string {
  return category.replace(/\s+/g, '');
}

function isAutonomousCategory(category: string): boolean {
  return AUTONOMOUS_CATEGORY_ORDER.includes(normalizeCategoryKey(category));
}

function categoryOrderIndex(category: string): number {
  const key = normalizeCategoryKey(category);
  const list = isAutonomousCategory(category) ? AUTONOMOUS_CATEGORY_ORDER : CORE_CATEGORY_ORDER;
  const idx = list.indexOf(key);
  return idx === -1 ? list.length : idx;
}

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
          <Bar dataKey="rate" radius={[0, 4, 4, 0]} maxBarSize={20} cursor="pointer" onClick={(entry) => onToggle(entry.category)}>
            {categoryData.map((d) => (
              <Cell key={d.category} fill={d.rate >= 100 ? ACHIEVED_COLOR : UNDER_COLOR} />
            ))}
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
              <Bar dataKey="rate" radius={[0, 4, 4, 0]} maxBarSize={16}>
                {expandedItems.map((d) => (
                  <Cell key={d.indicator_name} fill={d.rate >= 100 ? ACHIEVED_COLOR : UNDER_COLOR} />
                ))}
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
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!expanded) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setExpanded(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [expanded]);

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
    const byCanonicalOrder = (a: CategoryDatum, b: CategoryDatum) => categoryOrderIndex(a.category) - categoryOrderIndex(b.category);
    return {
      coreCategories: all.filter((d) => !isAutonomousCategory(d.category)).sort(byCanonicalOrder),
      autonomousCategories: all.filter((d) => isAutonomousCategory(d.category)).sort(byCanonicalOrder),
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
    <div className="space-y-6" ref={containerRef}>
      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400">
        <span>막대를 클릭하면 지수 내 세부 지표가 아래에 펼쳐집니다.</span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: ACHIEVED_COLOR }} />
          100% 이상
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: UNDER_COLOR }} />
          100% 미만
        </span>
      </div>
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
