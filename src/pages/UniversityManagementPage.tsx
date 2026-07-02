import { useEffect, useMemo, useState } from 'react';
import { Save } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/common/Card';
import { FilterSelect } from '@/components/common/FilterSelect';
import { CategoryBadge } from '@/components/common/StatusBadge';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { getIndicators, getUniversityResults, updateUniversityResult } from '@/services/api';
import type { EvidenceStatus, IndicatorSummary, UniversityResult } from '@/types';
import { UNIVERSITIES } from '@/types';
import { formatRate } from '@/utils/format';
import { validateNumberInput } from '@/utils/calculations';

interface EditableRow {
  actual_result: string;
  evidence_status: EvidenceStatus;
  note: string;
  dirty: boolean;
}

export function UniversityManagementPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [results, setResults] = useState<UniversityResult[]>([]);
  const [indicators, setIndicators] = useState<IndicatorSummary[]>([]);
  const [editState, setEditState] = useState<Record<string, EditableRow>>({});
  const [universityFilter, setUniversityFilter] = useState(
    user?.role === 'university' ? user.university_name : '전체'
  );
  const [isLoading, setIsLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [res, ind] = await Promise.all([getUniversityResults(user), getIndicators()]);
      setResults(res);
      setIndicators(ind);
      const initial: Record<string, EditableRow> = {};
      res.forEach((r) => {
        initial[r.result_id] = {
          actual_result: r.actual_result === null || r.actual_result === undefined ? '' : String(r.actual_result),
          evidence_status: r.evidence_status,
          note: r.note,
          dirty: false,
        };
      });
      setEditState(initial);
      setIsLoading(false);
    })();
  }, [user]);

  const indicatorMap = useMemo(() => {
    const map = new Map<string, IndicatorSummary>();
    indicators.forEach((i) => map.set(i.indicator_id, i));
    return map;
  }, [indicators]);

  const filteredResults = useMemo(() => {
    if (universityFilter === '전체') return results;
    return results.filter((r) => r.university_name === universityFilter);
  }, [results, universityFilter]);

  const updateField = (resultId: string, field: keyof EditableRow, value: string) => {
    setEditState((prev) => ({
      ...prev,
      [resultId]: { ...prev[resultId], [field]: value, dirty: true },
    }));
  };

  const handleSave = async (row: UniversityResult) => {
    if (!user) return;
    const edit = editState[row.result_id];
    if (!edit) return;

    if (edit.actual_result !== '') {
      const check = validateNumberInput(edit.actual_result);
      if (!check.valid) {
        showToast('error', check.message ?? '입력값을 확인해 주세요.');
        return;
      }
    }

    setSavingId(row.result_id);
    const res = await updateUniversityResult({
      result_id: row.result_id,
      actual_result: edit.actual_result === '' ? null : Number(edit.actual_result),
      evidence_status: edit.evidence_status,
      note: edit.note,
      updated_by: user.user_id,
      user_name: user.name,
      university_name: row.university_name,
    });
    setSavingId(null);

    if (res.success) {
      showToast('success', `${row.university_name} 실적이 저장되었습니다.`);
      setResults((prev) =>
        prev.map((r) =>
          r.result_id === row.result_id
            ? {
                ...r,
                actual_result: edit.actual_result === '' ? null : Number(edit.actual_result),
                evidence_status: edit.evidence_status,
                note: edit.note,
              }
            : r
        )
      );
      setEditState((prev) => ({ ...prev, [row.result_id]: { ...edit, dirty: false } }));
    } else {
      showToast('error', res.message ?? '저장에 실패했습니다.');
    }
  };

  return (
    <div>
      <PageHeader
        title="대학별 배부·달성 관리"
        description={
          isAdmin
            ? '관리자는 모든 참여대학의 실적과 증빙 제출 여부를 조회·수정할 수 있습니다.'
            : `${user?.university_name}의 실적과 증빙 제출 여부를 입력·수정할 수 있습니다.`
        }
      />
      <Card>
        {isAdmin && (
          <div className="mb-4">
            <FilterSelect
              label="대학명"
              value={universityFilter}
              onChange={setUniversityFilter}
              options={[{ value: '전체', label: '전체' }, ...UNIVERSITIES.map((u) => ({ value: u, label: u }))]}
            />
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead>
              <tr className="text-left text-xs font-medium text-gray-500">
                <th className="whitespace-nowrap px-3 py-2">대학명</th>
                <th className="whitespace-nowrap px-3 py-2">지표명</th>
                <th className="whitespace-nowrap px-3 py-2">구분</th>
                <th className="whitespace-nowrap px-3 py-2 text-right">배부 목표값</th>
                <th className="whitespace-nowrap px-3 py-2 text-right">입력 실적값</th>
                <th className="whitespace-nowrap px-3 py-2 text-right">달성률</th>
                <th className="whitespace-nowrap px-3 py-2">증빙 제출 여부</th>
                <th className="whitespace-nowrap px-3 py-2">비고</th>
                <th className="whitespace-nowrap px-3 py-2">수정일</th>
                <th className="whitespace-nowrap px-3 py-2 text-center">저장</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {!isLoading && filteredResults.map((r) => {
                const ind = indicatorMap.get(r.indicator_id);
                const edit = editState[r.result_id];
                if (!edit) return null;
                const previewRate =
                  edit.actual_result === ''
                    ? null
                    : r.allocated_target > 0
                      ? Math.round((Number(edit.actual_result) / r.allocated_target) * 1000) / 10
                      : null;
                return (
                  <tr key={r.result_id} className="align-top hover:bg-gray-50">
                    <td className="whitespace-nowrap px-3 py-2 font-medium text-gray-700">{r.university_name}</td>
                    <td className="min-w-[180px] px-3 py-2 text-gray-800">{ind?.indicator_name ?? r.indicator_id}</td>
                    <td className="whitespace-nowrap px-3 py-2">{ind && <CategoryBadge category={ind.category} />}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-right text-gray-600">
                      {r.allocated_target.toLocaleString('ko-KR')} {ind?.unit}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <input
                        type="number"
                        min={0}
                        value={edit.actual_result}
                        onChange={(e) => updateField(r.result_id, 'actual_result', e.target.value)}
                        className="w-24 rounded-md border border-gray-300 px-2 py-1 text-right text-sm focus:border-navy-500 focus:outline-none focus:ring-1 focus:ring-navy-500"
                      />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right font-semibold text-gray-700">
                      {formatRate(previewRate)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <select
                        value={edit.evidence_status}
                        onChange={(e) => updateField(r.result_id, 'evidence_status', e.target.value)}
                        className="rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-navy-500 focus:outline-none focus:ring-1 focus:ring-navy-500"
                      >
                        <option value="제출">제출</option>
                        <option value="미제출">미제출</option>
                        <option value="해당없음">해당없음</option>
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={edit.note}
                        onChange={(e) => updateField(r.result_id, 'note', e.target.value)}
                        placeholder="비고 입력"
                        className="w-40 rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-navy-500 focus:outline-none focus:ring-1 focus:ring-navy-500"
                      />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-gray-500">{r.updated_at}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-center">
                      <button
                        type="button"
                        disabled={!edit.dirty || savingId === r.result_id}
                        onClick={() => handleSave(r)}
                        className="inline-flex items-center gap-1 rounded-md bg-navy-800 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-navy-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                      >
                        <Save className="h-3.5 w-3.5" />
                        {savingId === r.result_id ? '저장 중' : '저장'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {isLoading && <p className="py-10 text-center text-sm text-gray-400">불러오는 중...</p>}
          {!isLoading && filteredResults.length === 0 && (
            <p className="py-10 text-center text-sm text-gray-400">표시할 데이터가 없습니다.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
