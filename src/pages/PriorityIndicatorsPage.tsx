import { useCallback, useEffect, useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/common/Card';
import { FilterSelect } from '@/components/common/FilterSelect';
import { RiskBadge } from '@/components/common/StatusBadge';
import { getPriorityIndicators } from '@/services/api';
import type { PriorityIndicator, RiskLevel } from '@/types';
import { formatNumber, formatRate } from '@/utils/format';
import { useAutoRefresh } from '@/utils/useAutoRefresh';

const RISK_OPTIONS: (RiskLevel | '전체')[] = ['전체', '높음', '보통', '낮음'];

export function PriorityIndicatorsPage() {
  const [items, setItems] = useState<PriorityIndicator[]>([]);
  const [risk, setRisk] = useState<string>('전체');
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(() => {
    getPriorityIndicators().then((data) => {
      setItems(data);
      setIsLoading(false);
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useAutoRefresh(load, 30000);

  const filtered = risk === '전체' ? items : items.filter((i) => i.risk_level === risk);

  return (
    <div>
      <PageHeader
        title="우선 관리 지표"
        description="달성률 80% 미만, 실적 미입력, 증빙 미제출 등 조치가 필요한 지표를 위험도 순으로 자동 추출합니다."
      />
      <Card>
        <div className="mb-4 flex items-end gap-3">
          <FilterSelect
            label="위험도"
            value={risk}
            onChange={setRisk}
            options={RISK_OPTIONS.map((r) => ({ value: r, label: r }))}
          />
          <span className="ml-auto text-xs text-gray-400">총 {filtered.length}건</span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead>
              <tr className="text-left text-xs font-medium text-gray-500">
                <th className="whitespace-nowrap px-3 py-2">위험도</th>
                <th className="whitespace-nowrap px-3 py-2">지표명</th>
                <th className="whitespace-nowrap px-3 py-2">대학명</th>
                <th className="whitespace-nowrap px-3 py-2 text-right">목표값</th>
                <th className="whitespace-nowrap px-3 py-2 text-right">실적값</th>
                <th className="whitespace-nowrap px-3 py-2 text-right">달성률</th>
                <th className="whitespace-nowrap px-3 py-2">미흡 사유</th>
                <th className="whitespace-nowrap px-3 py-2">조치 필요사항</th>
                <th className="whitespace-nowrap px-3 py-2">담당자</th>
                <th className="whitespace-nowrap px-3 py-2">비고</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {!isLoading && filtered.map((p, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-3 py-2"><RiskBadge level={p.risk_level} /></td>
                  <td className="px-3 py-2 font-medium text-gray-800">{p.indicator_name}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-gray-600">{p.university_name}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right text-gray-600">{formatNumber(p.target)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right text-gray-600">{formatNumber(p.actual)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right font-semibold text-gray-700">{formatRate(p.achievement_rate)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-rose-600">{p.reason}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-gray-600">{p.action_needed}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-gray-600">{p.manager}</td>
                  <td className="max-w-[160px] truncate px-3 py-2 text-gray-500" title={p.note}>{p.note || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {isLoading && <p className="py-10 text-center text-sm text-gray-400">불러오는 중...</p>}
          {!isLoading && filtered.length === 0 && (
            <p className="py-10 text-center text-sm text-gray-400">우선 관리가 필요한 지표가 없습니다.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
