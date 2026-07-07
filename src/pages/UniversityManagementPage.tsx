import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pencil } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/common/Card';
import { CategoryBadge } from '@/components/common/StatusBadge';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { getIndicators, getUniversityResults, updateUniversityResult } from '@/services/api';
import type { EvidenceStatus, IndicatorSummary, UniversityResult } from '@/types';
import { UNIVERSITIES } from '@/types';
import { formatNumber, formatRateOrAchieved } from '@/utils/format';

const NOTE_SAVE_DEBOUNCE_MS = 700;

export function UniversityManagementPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [results, setResults] = useState<UniversityResult[]>([]);
  const [indicators, setIndicators] = useState<IndicatorSummary[]>([]);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [openNoteId, setOpenNoteId] = useState<string | null>(null);
  const [activeUniversity, setActiveUniversity] = useState(
    user?.role === 'university' ? user.university_name : UNIVERSITIES[0]
  );
  const [isLoading, setIsLoading] = useState(true);
  const popoverRef = useRef<HTMLDivElement>(null);
  const noteTimerRef = useRef<number | null>(null);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [res, ind] = await Promise.all([getUniversityResults(user), getIndicators()]);
      setResults(res);
      setIndicators(ind);
      const drafts: Record<string, string> = {};
      res.forEach((r) => {
        drafts[r.result_id] = r.note;
      });
      setNoteDrafts(drafts);
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

  const saveUpdate = useCallback(
    async (row: UniversityResult, patch: { evidence_status?: EvidenceStatus; note?: string }, silent = false) => {
      if (!user) return;
      const res = await updateUniversityResult({
        result_id: row.result_id,
        updated_by: user.user_id,
        user_name: user.name,
        university_name: row.university_name,
        role: user.role,
        ...patch,
      });
      if (res.success) {
        setResults((prev) => prev.map((r) => (r.result_id === row.result_id ? { ...r, ...patch } : r)));
        if (!silent) showToast('success', `${row.university_name} 저장되었습니다.`);
      } else {
        showToast('error', res.message ?? '저장에 실패했습니다.');
      }
    },
    [user, showToast]
  );

  const handleEvidenceChange = (row: UniversityResult, value: EvidenceStatus) => {
    saveUpdate(row, { evidence_status: value });
  };

  const scheduleNoteSave = (row: UniversityResult, value: string) => {
    if (noteTimerRef.current) window.clearTimeout(noteTimerRef.current);
    noteTimerRef.current = window.setTimeout(() => {
      saveUpdate(row, { note: value }, true);
    }, NOTE_SAVE_DEBOUNCE_MS);
  };

  const flushNoteSave = (row: UniversityResult) => {
    if (noteTimerRef.current) {
      window.clearTimeout(noteTimerRef.current);
      noteTimerRef.current = null;
    }
    const draft = noteDrafts[row.result_id] ?? '';
    if (draft !== row.note) {
      saveUpdate(row, { note: draft }, true);
    }
  };

  const closeNotePopover = () => {
    const row = tabResults.find((r) => r.result_id === openNoteId) ?? results.find((r) => r.result_id === openNoteId);
    if (row) flushNoteSave(row);
    setOpenNoteId(null);
  };

  useEffect(() => {
    if (!openNoteId) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        closeNotePopover();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openNoteId, noteDrafts]);

  return (
    <div>
      <PageHeader
        title="대학별 배부·달성 관리"
        description={
          (isAdmin
            ? '관리자는 모든 참여대학의 증빙 제출 여부와 비고를 수정할 수 있습니다.'
            : `${user?.university_name}의 증빙 제출 여부와 비고를 입력·수정할 수 있습니다.`) +
          ' 목표값·실적값은 구글시트에서 직접 수정하며, 이 화면에서는 조회만 가능합니다. 변경 사항은 자동 저장됩니다.'
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
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {!isLoading && tabResults.map((r) => {
                const ind = indicatorMap.get(r.indicator_id);
                const hasActual = r.actual_result !== null && r.actual_result !== undefined;
                const isNoteOpen = openNoteId === r.result_id;
                const draft = noteDrafts[r.result_id] ?? '';
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
                        value={r.evidence_status === '예' || r.evidence_status === '아니오' ? r.evidence_status : '아니오'}
                        onChange={(e) => handleEvidenceChange(r, e.target.value as EvidenceStatus)}
                        className="rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-navy-500 focus:outline-none focus:ring-1 focus:ring-navy-500"
                      >
                        <option value="예">예</option>
                        <option value="아니오">아니오</option>
                      </select>
                    </td>
                    <td className="relative px-3 py-2">
                      <button
                        type="button"
                        onClick={() => setOpenNoteId(r.result_id)}
                        className="inline-flex max-w-[160px] items-center gap-1 rounded-md border border-dashed border-gray-300 px-2 py-1 text-xs text-gray-500 hover:border-navy-400 hover:text-navy-600"
                      >
                        <Pencil className="h-3 w-3 shrink-0" />
                        <span className="truncate">{r.note ? r.note : '비고'}</span>
                      </button>

                      {isNoteOpen && (
                        <div
                          ref={popoverRef}
                          className="absolute left-0 top-full z-20 mt-1 w-64 rounded-md border border-gray-200 bg-white p-3 shadow-lg"
                        >
                          <p className="mb-1.5 text-xs font-semibold text-gray-500">비고</p>
                          <textarea
                            autoFocus
                            value={draft}
                            onChange={(e) => {
                              const value = e.target.value;
                              setNoteDrafts((prev) => ({ ...prev, [r.result_id]: value }));
                              scheduleNoteSave(r, value);
                            }}
                            placeholder="비고를 입력하세요"
                            rows={3}
                            className="w-full resize-none rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-navy-500 focus:outline-none focus:ring-1 focus:ring-navy-500"
                          />
                          <p className="mt-1 text-[11px] text-gray-400">바깥을 클릭하면 자동 저장됩니다.</p>
                        </div>
                      )}
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
