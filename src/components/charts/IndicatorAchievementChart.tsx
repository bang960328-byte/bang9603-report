import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Sparkles, Target } from 'lucide-react';
import { getCategoryIcon } from '@/utils/categoryIcons';

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

function CategoryRow({
  data,
  isOpen,
  onToggle,
  expandedItems,
}: {
  data: CategoryDatum;
  isOpen: boolean;
  onToggle: () => void;
  expandedItems: RankingDatum[];
}) {
  const Icon = getCategoryIcon(data.category);
  const achieved = data.rate >= 100;
  const color = achieved ? ACHIEVED_COLOR : UNDER_COLOR;
  const barWidth = Math.min(100, data.rate);

  return (
    <div className="rounded-lg border border-gray-100 bg-white transition-shadow hover:shadow-sm">
      <button type="button" onClick={onToggle} className="flex w-full items-center gap-3 p-3 text-left">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: achieved ? '#eaf2fc' : '#fde8ec' }}
        >
          <Icon className="h-5 w-5" style={{ color }} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-medium text-gray-800">{data.category}</p>
            <span className="shrink-0 text-sm font-bold" style={{ color }}>
              {data.rate}%
            </span>
          </div>
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${barWidth}%`, backgroundColor: color }}
            />
          </div>
        </div>
        <span className="shrink-0 text-gray-300">
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </button>

      {isOpen && (
        <div className="border-t border-gray-100 bg-gray-50/60 px-3 py-2">
          <p className="mb-1 px-1 text-xs font-semibold text-gray-500">세부 지표 {expandedItems.length}개</p>
          <div className="divide-y divide-gray-100">
            {expandedItems.map((d) => (
              <div key={d.indicator_name} className="flex items-center justify-between gap-3 px-1 py-1.5">
                <p className="min-w-0 truncate text-sm text-gray-700">{d.indicator_name}</p>
                <span
                  className="shrink-0 text-sm font-semibold"
                  style={{ color: d.rate >= 100 ? ACHIEVED_COLOR : UNDER_COLOR }}
                >
                  {d.rate}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CategoryGroup({
  title,
  icon: GroupIcon,
  categoryData,
  expanded,
  onToggle,
  expandedItems,
}: {
  title: string;
  icon: typeof Target;
  categoryData: CategoryDatum[];
  expanded: string | null;
  onToggle: (category: string) => void;
  expandedItems: RankingDatum[];
}) {
  if (categoryData.length === 0) return null;

  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-gray-500">
        <GroupIcon className="h-3.5 w-3.5" />
        {title}
      </p>
      <div className="space-y-2">
        {categoryData.map((d) => (
          <CategoryRow
            key={d.category}
            data={d}
            isOpen={expanded === d.category}
            onToggle={() => onToggle(d.category)}
            expandedItems={expanded === d.category ? expandedItems : []}
          />
        ))}
      </div>
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
    return [...data].filter((d) => d.category === expanded).sort((a, b) => b.rate - a.rate);
  }, [data, expanded]);

  const toggle = (category: string) => setExpanded((prev) => (prev === category ? null : category));

  return (
    <div className="space-y-6" ref={containerRef}>
      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400">
        <span>행을 클릭하면 지수 내 세부 지표가 펼쳐집니다.</span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: ACHIEVED_COLOR }} />
          100% 이상
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: UNDER_COLOR }} />
          100% 미만
        </span>
      </div>
      <CategoryGroup
        title="핵심지표"
        icon={Target}
        categoryData={coreCategories}
        expanded={expanded}
        onToggle={toggle}
        expandedItems={expandedItems}
      />
      <CategoryGroup
        title="자율지표"
        icon={Sparkles}
        categoryData={autonomousCategories}
        expanded={expanded}
        onToggle={toggle}
        expandedItems={expandedItems}
      />
    </div>
  );
}
