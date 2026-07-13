import { useCallback, useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Card } from '@/components/common/Card';
import { ProgressBar } from '@/components/common/ProgressBar';
import { EvidenceBadge, StatusBadge } from '@/components/common/StatusBadge';
import { getIndicators } from '@/services/api';
import type { AchievementStatus, IndicatorCategory, IndicatorSummary } from '@/types';
import { formatNumber, formatRateOrAchieved } from '@/utils/format';
import { useAutoRefresh } from '@/utils/useAutoRefresh';
import { getCategoryIcon } from '@/utils/categoryIcons';

const STATUS_ICON_TONE: Record<AchievementStatus, { wrapper: string; icon: string }> = {
  정상: { wrapper: 'bg-emerald-50', icon: 'text-emerald-600' },
  주의: { wrapper: 'bg-amber-50', icon: 'text-amber-600' },
  미달: { wrapper: 'bg-rose-50', icon: 'text-rose-600' },
  미제출: { wrapper: 'bg-gray-100', icon: 'text-gray-400' },
};

export function IndicatorCategoryList({ category }: { category: IndicatorCategory }) {
  const [items, setItems] = useState<IndicatorSummary[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(() => {
    getIndicators(category).then((data) => {
      setItems(data);
      setIsLoading(false);
    });
  }, [category]);

  useEffect(() => {
    load();
  }, [load]);

  useAutoRefresh(load, 30000);

  if (isLoading) {
    return <p className="py-10 text-center text-sm text-gray-400">불러오는 중...</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const isOpen = expanded === item.indicator_id;
        const Icon = getCategoryIcon(item.category);
        const tone = STATUS_ICON_TONE[item.status];
        return (
          <Card key={item.indicator_id} className="!p-0 transition-shadow hover:shadow-md">
            <button
              type="button"
              onClick={() => setExpanded(isOpen ? null : item.indicator_id)}
              className="group flex w-full items-center gap-4 px-5 py-4 text-left"
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-105 ${tone.wrapper}`}
              >
                <Icon className={`h-5 w-5 ${tone.icon}`} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-gray-400">{item.indicator_id}</span>
                  <p className="truncate text-sm font-semibold text-gray-800">{item.indicator_name}</p>
                  <StatusBadge status={item.status} />
                  {item.status === '미달' && (
                    <span className="text-xs font-medium text-rose-600">80% 미만 경고</span>
                  )}
                  {item.status === '정상' && (
                    <span className="text-xs font-medium text-emerald-600">목표 달성 완료</span>
                  )}
                  {item.total_target === null && (
                    <span className="text-xs font-medium text-blue-600">3차년도 목표값 없음</span>
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-500">{item.description}</p>
              </div>
              <div className="w-48 shrink-0">
                {item.total_target === null ? (
                  <p className="text-right text-xs text-gray-400">달성률 계산 대상 아님</p>
                ) : (
                  <ProgressBar rate={item.achievement_rate} />
                )}
              </div>
              <div className="w-32 shrink-0 text-right text-xs text-gray-500">
                {formatNumber(item.total_actual)} / {item.total_target === null ? '-' : formatNumber(item.total_target)} {item.unit}
              </div>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
              />
            </button>

            <div
              className={`grid overflow-hidden transition-[grid-template-rows] duration-300 ease-in-out ${
                isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
              }`}
            >
              <div className="min-h-0">
                <div className="border-t border-gray-100 px-5 py-4">
                  <p className="mb-2 text-xs font-semibold text-gray-500">대학별 배부값 · 달성값 상세</p>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100 text-sm">
                      <thead>
                        <tr className="text-left text-xs font-medium text-gray-500">
                          <th className="whitespace-nowrap px-3 py-2">대학명</th>
                          <th className="whitespace-nowrap px-3 py-2 text-right">배부값</th>
                          <th className="whitespace-nowrap px-3 py-2 text-right">실적값</th>
                          <th className="whitespace-nowrap px-3 py-2 text-right">달성률</th>
                          <th className="whitespace-nowrap px-3 py-2">증빙</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {item.universityResults.map((ur) => (
                          <tr key={ur.result_id}>
                            <td className="whitespace-nowrap px-3 py-2 font-medium text-gray-700">{ur.university_name}</td>
                            <td className="whitespace-nowrap px-3 py-2 text-right text-gray-600">{formatNumber(ur.allocated_target)}</td>
                            <td className="whitespace-nowrap px-3 py-2 text-right">
                              <span className={ur.actual_result !== null ? 'font-semibold text-emerald-600' : 'text-gray-300'}>
                                {ur.actual_result !== null ? formatNumber(ur.actual_result) : '미입력'}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-3 py-2 text-right font-semibold text-gray-700">
                              {formatRateOrAchieved(ur.achievement_rate, ur.allocated_target, ur.actual_result)}
                            </td>
                            <td className="whitespace-nowrap px-3 py-2"><EvidenceBadge status={ur.evidence_status} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        );
      })}
      {items.length === 0 && <p className="py-10 text-center text-sm text-gray-400">등록된 지표가 없습니다.</p>}
    </div>
  );
}
