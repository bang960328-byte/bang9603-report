import { useEffect, useMemo, useState } from 'react';
import { Save, Pencil } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/common/Card';
import { CategoryBadge } from '@/components/common/StatusBadge';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { getIndicators, getUniversityResults, updateUniversityResult } from '@/services/api';
import type { EvidenceStatus, IndicatorSummary, UniversityResult } from '@/types';
import { UNIVERSITIES } from '@/types';
import { formatNumber, formatRateOrAchieved } from '@/utils/format';

interface EditableRow {
  evidence_status: EvidenceStatus;
  note: string;
  noteOpen: boolean;
  dirty: boolean;
}

export function UniversityManagementPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [results, setResults] = useState<UniversityResult[]>([]);
  const [indicators, setIndicators] = useState<IndicatorSummary[]>([]);
  const [editState, setEditState] = useState<Record<string, EditableRow>>({});
  const [activeUniversity, setActiveUniversity] = useState(
    user?.role === 'university' ? user.university_name : UNIVERSITIES[0]
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
          evidence_status: r.evidence_status === '예' || r.evidence_status === '아니오' ? r.evidence_status : '아니오',
          note: r.note,
          noteOpen: !!r.note,
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

  const tabResults = useMemo(
    () => results.filter((r) => r.university_name === activeUniversity),
    [results, activeUniversity]
  );

  const updateField = (resultId: string, field: keyof EditableRow, value: string | boolean) => {
    setEditState((prev) => ({
      ...prev,
      [resultId]: { ...prev[resultId], [field]: value, dirty: true },
    }));
  };

  const handleSave = async (row: UniversityResult) => {
    if (!user) return;
    const edit = editState[row.result_id];
    if (!edit) return;

    setSavingId(row.result_id);
    const res = await updateUniversityResult({
      result_id: row.result_id,
      evidence_status: edit.evidence_status,
      note: edit.note,
      updated_by: user.user_id,
      user_name: user.name,
      university_name: row.university_name,
    });
    setSavingId(null);

    if (res.success) {
      showToast('success', `${row.university_name} 증빙·비고가 저장되었습니다.`);
      setResults((prev) =>
        prev.map((r) =>
          r.result_id === row.result_id
            ? { ...r, evidence_status: edit.evidence_status, note: edit.note }
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
          (isAdmin
            ? '관리자는 모든 참여대학의 증빙 제출 여부와 비고를 수정할 수 있습니다.'
            : `${user?.university_name}의 증빙 제출 여부와 비고를 입력·수정할 수 있습니다.`) +
          ' 목표값·실적값은 구글시트에서 직접 수정하며, 이 화면에서는 조회만 가능합니다.'
        }
      />

      {isAdmin && (
        <div className="mb-4 flex flex-wrap gap-1 border-b border-gray-200">
          {UNIVERSITIES.map((uni) => (
            <button
              key={uni}
              type="button"
              onClick={() => setActiveUniversity(uni)}
              className={`rounded-t-md border border-b-0 px-4 py-2 text-sm font-medium transition-colors ${
                activeUniversity === uni
                  ? 'border-gray-200 bg-white text-navy-700'
                  : 'border-transparent bg-gray-100 text-gray-500 hover:bg-gray-50 hover:text-gray-700'
              }`}
            >
              {uni}
            </button>
          ))}
        </div>
      )}

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-800">{activeUniversity}</h3>
          <span className="text-xs text-gray-400">총 {tabResults.length}개 지표</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead>
              <tr className="text-left text-xs font-medium text-gray-500">
                <th className="whitespace-nowrap px-3 py-2">지표명</th>
                <th className="whitespace-nowrap px-3 py-2">구분</th>
                <th className="whitespace-nowrap px-3 py-2 text-right">배부 목표값</th>
                <th className="whitespace-nowrap px-3 py-2 text-right">실적값</th>
                <th className="whitespace-nowrap px-3 py-2 text-right">달성률</th>
                <th className="whitespace-nowrap px-3 py-2">증빙 제출 여부</th>
                <th className="whitespace-nowrap px-3 py-2">비고</th>
                <th className="whitespace-nowrap px-3 py-2 text-center">저장</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {!isLoading && tabResults.map((r) => {
                const ind = indicatorMap.get(r.indicator_id);
                const edit = editState[r.result_id];
                if (!edit) return null;
                const hasActual = r.actual_result !== null && r.actual_result !== undefined;
                return (
                  <tr key={r.result_id} className="align-top hover:bg-gray-50">
                    <td className="min-w-[200px] px-3 py-2 text-gray-800">{ind?.indicator_name ?? r.indicator_id}</td>
                    <td className="whitespace-nowrap px-3 py-2">{ind && <CategoryBadge category={ind.category} />}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-right text-gray-600">
                      {formatNumber(r.allocated_target)} {ind?.unit}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right">
                      <span className={hasActual ? 'font-semibold text-emerald-600' : 'text-gray-300'}>
                        {hasActual ? formatNumber(r.actual_result) : '미입력'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right font-semibold text-gray-700">
                      {formatRateOrAchieved(r.achievement_rate, r.allocated_target, r.actual_result)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <select
                        value={edit.evidence_status}
                        onChange={(e) => updateField(r.result_id, 'evidence_status', e.target.value)}
                        className="rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-navy-500 focus:outline-none focus:ring-1 focus:ring-navy-500"
                      >
                        <option value="예">예</option>
                        <option value="아니오">아니오</option>
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      {edit.noteOpen ? (
                        <input
                          type="text"
                          autoFocus
                          value={edit.note}
                          onChange={(e) => updateField(r.result_id, 'note', e.target.value)}
                          placeholder="비고 입력"
                          className="w-40 rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-navy-500 focus:outline-none focus:ring-1 focus:ring-navy-500"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => updateField(r.result_id, 'noteOpen', true)}
                          className="inline-flex items-center gap-1 rounded-md border border-dashed border-gray-300 px-2 py-1 text-xs text-gray-500 hover:border-navy-400 hover:text-navy-600"
                        >
                          <Pencil className="h-3 w-3" />
                          {edit.note ? edit.note : '비고'}
                        </button>
                      )}
                    </td>
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
          {!isLoading && tabResults.length === 0 && (
            <p className="py-10 text-center text-sm text-gray-400">표시할 데이터가 없습니다.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
