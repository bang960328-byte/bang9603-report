import { useEffect, useMemo, useState } from 'react';
import { Save } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/common/Card';
import { FilterSelect } from '@/components/common/FilterSelect';
import { CategoryBadge, RiskBadge } from '@/components/common/StatusBadge';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { getPriorityIndicators, updatePriorityAction } from '@/services/api';
import type { PriorityIndicator, RiskLevel } from '@/types';
import { formatNumber, formatRate } from '@/utils/format';

const RISK_OPTIONS: (RiskLevel | '전체')[] = ['전체', '높음', '보통', '낮음'];

export function PriorityIndicatorsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [items, setItems] = useState<PriorityIndicator[]>([]);
  const [actionDraft, setActionDraft] = useState<Record<string, string>>({});
  const [risk, setRisk] = useState<string>('전체');
  const [isLoading, setIsLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    getPriorityIndicators().then((data) => {
      setItems(data);
      const draft: Record<string, string> = {};
      data.forEach((d) => (draft[d.indicator_id] = d.action_needed));
      setActionDraft(draft);
      setIsLoading(false);
    });
  }, []);

  const filtered = useMemo(
    () => (risk === '전체' ? items : items.filter((i) => i.risk_level === risk)),
    [items, risk]
  );

  const handleSaveAction = async (item: PriorityIndicator) => {
    if (!user) return;
    setSavingId(item.indicator_id);
    const res = await updatePriorityAction({
      indicator_id: item.indicator_id,
      indicator_name: item.indicator_name,
      action_needed: actionDraft[item.indicator_id] ?? '',
      updated_by: user.user_id,
      user_name: user.name,
    });
    setSavingId(null);
    if (res.success) {
      showToast('success', `'${item.indicator_name}' 조치 필요사항이 저장되었습니다.`);
      setItems((prev) =>
        prev.map((p) =>
          p.indicator_id === item.indicator_id
            ? { ...p, action_needed: actionDraft[item.indicator_id] ?? '' }
            : p
        )
      );
    } else {
      showToast('error', res.message ?? '저장에 실패했습니다.');
    }
  };

  return (
    <div>
      <PageHeader
        title="우선 관리 지표"
        description="달성률 80% 미만 또는 실적 미입력 지표를 지표별(5개 대학 합산 기준)로 자동 추출합니다. 조치 필요사항은 직접 입력해 저장할 수 있습니다."
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
                <th className="whitespace-nowrap px-3 py-2">구분</th>
                <th className="whitespace-nowrap px-3 py-2 text-right">전체 목표값</th>
                <th className="whitespace-nowrap px-3 py-2 text-right">전체 실적값</th>
                <th className="whitespace-nowrap px-3 py-2 text-right">달성률</th>
                <th className="whitespace-nowrap px-3 py-2">미흡 사유</th>
                <th className="whitespace-nowrap px-3 py-2">조치 필요사항</th>
                <th className="whitespace-nowrap px-3 py-2 text-center">저장</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {!isLoading && filtered.map((p) => (
                <tr key={p.indicator_id} className="align-top hover:bg-gray-50">
                  <td className="whitespace-nowrap px-3 py-2"><RiskBadge level={p.risk_level} /></td>
                  <td className="min-w-[180px] px-3 py-2 font-medium text-gray-800">{p.indicator_name}</td>
                  <td className="whitespace-nowrap px-3 py-2"><CategoryBadge category={p.category} /></td>
                  <td className="whitespace-nowrap px-3 py-2 text-right text-gray-600">{formatNumber(p.total_target)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right text-gray-600">{formatNumber(p.total_actual)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right font-semibold text-gray-700">{formatRate(p.achievement_rate)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-rose-600">{p.reason}</td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={actionDraft[p.indicator_id] ?? ''}
                      onChange={(e) =>
                        setActionDraft((prev) => ({ ...prev, [p.indicator_id]: e.target.value }))
                      }
                      placeholder="조치 필요사항 입력"
                      className="w-56 rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-navy-500 focus:outline-none focus:ring-1 focus:ring-navy-500"
                    />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => handleSaveAction(p)}
                      disabled={savingId === p.indicator_id || (actionDraft[p.indicator_id] ?? '') === p.action_needed}
                      className="inline-flex items-center gap-1 rounded-md bg-navy-800 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-navy-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                    >
                      <Save className="h-3.5 w-3.5" />
                      {savingId === p.indicator_id ? '저장 중' : '저장'}
                    </button>
                  </td>
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
