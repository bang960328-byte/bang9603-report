import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Save } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/common/Card';
import { CategoryBadge } from '@/components/common/StatusBadge';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { dataSourceState, getIndicators, getUniversityResults, updateTarget, updateUniversityResult } from '@/services/api';
import type { IndicatorSummary, UniversityResult } from '@/types';
import { validateNumberInput } from '@/utils/calculations';

export function TargetSettingPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [indicators, setIndicators] = useState<IndicatorSummary[]>([]);
  const [results, setResults] = useState<UniversityResult[]>([]);
  const [totalTargetDraft, setTotalTargetDraft] = useState<Record<string, string>>({});
  const [allocatedDraft, setAllocatedDraft] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const isLive = dataSourceState.mode === 'live';

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [ind, res] = await Promise.all([getIndicators(), getUniversityResults(user)]);
      setIndicators(ind);
      setResults(res);
      const totalDraft: Record<string, string> = {};
      ind.forEach((i) => (totalDraft[i.indicator_id] = String(i.total_target)));
      setTotalTargetDraft(totalDraft);
      const allocDraft: Record<string, string> = {};
      res.forEach((r) => (allocDraft[r.result_id] = String(r.allocated_target)));
      setAllocatedDraft(allocDraft);
      setIsLoading(false);
    })();
  }, [user]);

  const handleSaveTotal = async (indicatorId: string) => {
    if (!user) return;
    const draft = totalTargetDraft[indicatorId];
    const check = validateNumberInput(draft);
    if (!check.valid) {
      showToast('error', check.message ?? '입력값을 확인해 주세요.');
      return;
    }
    setSavingKey(`total-${indicatorId}`);
    const res = await updateTarget({
      indicator_id: indicatorId,
      total_target: Number(draft),
      updated_by: user.user_id,
      user_name: user.name,
    });
    setSavingKey(null);
    if (res.success) {
      showToast('success', '전체 목표값이 저장되었습니다.');
      setIndicators((prev) =>
        prev.map((i) => (i.indicator_id === indicatorId ? { ...i, total_target: Number(draft) } : i))
      );
    } else {
      showToast('error', res.message ?? '저장에 실패했습니다.');
    }
  };

  const handleSaveAllocated = async (row: UniversityResult) => {
    if (!user) return;
    const draft = allocatedDraft[row.result_id];
    const check = validateNumberInput(draft);
    if (!check.valid) {
      showToast('error', check.message ?? '입력값을 확인해 주세요.');
      return;
    }
    setSavingKey(`alloc-${row.result_id}`);
    const res = await updateUniversityResult({
      result_id: row.result_id,
      allocated_target: Number(draft),
      updated_by: user.user_id,
      user_name: user.name,
      university_name: row.university_name,
    });
    setSavingKey(null);
    if (res.success) {
      showToast('success', `${row.university_name} 배부 목표값이 저장되었습니다.`);
      setResults((prev) =>
        prev.map((r) => (r.result_id === row.result_id ? { ...r, allocated_target: Number(draft) } : r))
      );
    } else {
      showToast('error', res.message ?? '저장에 실패했습니다.');
    }
  };

  return (
    <div>
      <PageHeader
        title="목표값 설정"
        description={
          '지표별 전체 목표값과 대학별 배부 목표값을 설정합니다. 저장 시 수정일·수정자가 자동 기록되며 음수는 입력할 수 없습니다.' +
          (isLive
            ? ' (실시간 구글시트 연동 중: 전체 목표값은 대학별 배부 목표값의 합계로 자동 계산되어 직접 수정할 수 없으며, 대학별 배부 목표값만 수정 가능합니다.)'
            : '')
        }
      />
      <div className="space-y-3">
        {!isLoading && indicators.map((ind) => {
          const isOpen = expanded === ind.indicator_id;
          const relatedResults = results.filter((r) => r.indicator_id === ind.indicator_id);
          return (
            <Card key={ind.indicator_id} className="!p-0">
              <div className="flex items-center gap-4 px-5 py-4">
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : ind.indicator_id)}
                  className="flex flex-1 items-center gap-2 text-left"
                >
                  <span className="font-mono text-xs text-gray-400">{ind.indicator_id}</span>
                  <span className="text-sm font-semibold text-gray-800">{ind.indicator_name}</span>
                  <CategoryBadge category={ind.category} />
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">전체 목표값</span>
                  <input
                    type="number"
                    min={0}
                    value={totalTargetDraft[ind.indicator_id] ?? ''}
                    onChange={(e) =>
                      setTotalTargetDraft((prev) => ({ ...prev, [ind.indicator_id]: e.target.value }))
                    }
                    disabled={isLive}
                    title={isLive ? '실시간 연동에서는 대학별 배부 목표값의 합계로 자동 계산됩니다.' : undefined}
                    className="w-24 rounded-md border border-gray-300 px-2 py-1 text-right text-sm focus:border-navy-500 focus:outline-none focus:ring-1 focus:ring-navy-500 disabled:bg-gray-100 disabled:text-gray-400"
                  />
                  <span className="text-xs text-gray-400">{ind.unit}</span>
                  <button
                    type="button"
                    onClick={() => handleSaveTotal(ind.indicator_id)}
                    disabled={isLive || savingKey === `total-${ind.indicator_id}`}
                    title={isLive ? '실시간 연동에서는 지원되지 않습니다.' : undefined}
                    className="inline-flex items-center gap-1 rounded-md bg-navy-800 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-navy-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                  >
                    <Save className="h-3.5 w-3.5" />
                    저장
                  </button>
                </div>
                <button type="button" onClick={() => setExpanded(isOpen ? null : ind.indicator_id)}>
                  {isOpen ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                </button>
              </div>

              {isOpen && (
                <div className="border-t border-gray-100 px-5 py-4">
                  <p className="mb-2 text-xs font-semibold text-gray-500">대학별 배부 목표값 설정</p>
                  <table className="min-w-full divide-y divide-gray-100 text-sm">
                    <thead>
                      <tr className="text-left text-xs font-medium text-gray-500">
                        <th className="whitespace-nowrap px-3 py-2">대학명</th>
                        <th className="whitespace-nowrap px-3 py-2 text-right">배부 목표값</th>
                        <th className="whitespace-nowrap px-3 py-2">수정일</th>
                        <th className="whitespace-nowrap px-3 py-2 text-center">저장</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {relatedResults.map((r) => (
                        <tr key={r.result_id}>
                          <td className="whitespace-nowrap px-3 py-2 font-medium text-gray-700">{r.university_name}</td>
                          <td className="whitespace-nowrap px-3 py-2 text-right">
                            <input
                              type="number"
                              min={0}
                              value={allocatedDraft[r.result_id] ?? ''}
                              onChange={(e) =>
                                setAllocatedDraft((prev) => ({ ...prev, [r.result_id]: e.target.value }))
                              }
                              className="w-24 rounded-md border border-gray-300 px-2 py-1 text-right text-sm focus:border-navy-500 focus:outline-none focus:ring-1 focus:ring-navy-500"
                            />
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-gray-500">{r.updated_at}</td>
                          <td className="whitespace-nowrap px-3 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleSaveAllocated(r)}
                              disabled={savingKey === `alloc-${r.result_id}`}
                              className="inline-flex items-center gap-1 rounded-md bg-navy-800 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-navy-700 disabled:bg-gray-300"
                            >
                              <Save className="h-3.5 w-3.5" />
                              저장
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          );
        })}
        {isLoading && <p className="py-10 text-center text-sm text-gray-400">불러오는 중...</p>}
      </div>
    </div>
  );
}
