import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/common/Card';
import { FilterSelect } from '@/components/common/FilterSelect';
import { SearchInput } from '@/components/common/SearchInput';
import { ExcelDownloadButton } from '@/components/common/ExcelDownloadButton';
import { CategoryBadge, EvidenceBadge, StatusBadge } from '@/components/common/StatusBadge';
import { getIndicators } from '@/services/api';
import type { AchievementStatus, EvidenceStatus, IndicatorSummary } from '@/types';
import { UNIVERSITIES } from '@/types';
import { formatNumber, formatRate, formatRateOrAchieved } from '@/utils/format';
import { useAutoRefresh } from '@/utils/useAutoRefresh';

type SortKey = 'indicator_id' | 'achievement_rate' | 'updated_at';
type SortDir = 'asc' | 'desc';

const STATUS_OPTIONS: (AchievementStatus | '전체')[] = ['전체', '정상', '주의', '미달', '미제출', '달성지표'];
const EVIDENCE_OPTIONS: (EvidenceStatus | '전체')[] = ['전체', '예', '아니오', '해당없음'];

export function IndicatorsOverviewPage() {
  const [rows, setRows] = useState<IndicatorSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [category, setCategory] = useState('전체');
  const [university, setUniversity] = useState('전체');
  const [status, setStatus] = useState('전체');
  const [evidence, setEvidence] = useState('전체');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('indicator_id');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const load = useCallback(() => {
    getIndicators().then((data) => {
      setRows(data);
      setIsLoading(false);
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useAutoRefresh(load, 30000);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const displayRows = useMemo(() => {
    return rows.map((r) => {
      if (university === '전체') {
        return {
          key: r.indicator_id,
          indicator_id: r.indicator_id,
          year: r.year,
          category: r.category,
          indicator_name: r.indicator_name,
          unit: r.unit,
          total_target: r.total_target,
          total_actual: r.total_actual,
          achievement_rate: r.achievement_rate,
          status: r.status,
          evidence_status: r.evidence_status,
          note: r.note,
          updated_at: r.updated_at,
        };
      }
      const uniResult = r.universityResults.find((ur) => ur.university_name === university);
      return {
        key: r.indicator_id,
        indicator_id: r.indicator_id,
        year: r.year,
        category: r.category,
        indicator_name: r.indicator_name,
        unit: r.unit,
        total_target: uniResult?.allocated_target ?? 0,
        total_actual: uniResult?.actual_result ?? null,
        achievement_rate: uniResult?.achievement_rate ?? null,
        status: (r.status === '달성지표'
          ? '달성지표'
          : uniResult
            ? uniResult.actual_result === null || uniResult.actual_result === undefined
              ? '미제출'
              : (uniResult.achievement_rate ?? 0) >= 100
                ? '정상'
                : (uniResult.achievement_rate ?? 0) >= 80
                  ? '주의'
                  : '미달'
            : '미제출') as AchievementStatus,
        evidence_status: uniResult?.evidence_status ?? '해당없음',
        note: uniResult?.note ?? '',
        updated_at: uniResult?.updated_at ?? r.updated_at,
      };
    });
  }, [rows, university]);

  const filtered = useMemo(() => {
    let list = displayRows;
    if (category !== '전체') list = list.filter((r) => r.category === category);
    if (status !== '전체') list = list.filter((r) => r.status === status);
    if (evidence !== '전체') list = list.filter((r) => r.evidence_status === evidence);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (r) => r.indicator_name.toLowerCase().includes(q) || r.indicator_id.toLowerCase().includes(q)
      );
    }

    const sorted = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'indicator_id') cmp = a.indicator_id.localeCompare(b.indicator_id);
      else if (sortKey === 'achievement_rate') cmp = (a.achievement_rate ?? -1) - (b.achievement_rate ?? -1);
      else if (sortKey === 'updated_at') cmp = a.updated_at.localeCompare(b.updated_at);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [displayRows, category, status, evidence, search, sortKey, sortDir]);

  const sortIcon = (key: SortKey) => {
    if (sortKey !== key) return <ArrowUpDown className="h-3 w-3 text-gray-300" />;
    return sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  };

  const categoryOptions = useMemo(() => {
    const distinct = Array.from(new Set(rows.map((r) => r.category)));
    return [{ value: '전체', label: '전체' }, ...distinct.map((c) => ({ value: c, label: c }))];
  }, [rows]);

  const csvHeaders = [
    '지표ID', '연도', '구분', '지표명', '단위', '목표값', '실적값', '달성률', '상태', '증빙', '비고', '수정일',
  ];
  const csvRows = filtered.map((r) => [
    r.indicator_id, r.year, r.category, r.indicator_name, r.unit,
    r.total_target ?? '-', r.total_actual ?? '', formatRate(r.achievement_rate), r.status, r.evidence_status, r.note, r.updated_at,
  ]);

  return (
    <div>
      <PageHeader
        title="성과지표 총괄 현황"
        description="전체 성과지표의 목표값·실적값·달성률·증빙 제출 현황을 한눈에 확인합니다."
        actions={<ExcelDownloadButton filename="성과지표_총괄현황.csv" headers={csvHeaders} rows={csvRows} />}
      />

      <Card>
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <FilterSelect
            label="지표구분"
            value={category}
            onChange={setCategory}
            options={categoryOptions}
          />
          <FilterSelect
            label="대학명"
            value={university}
            onChange={setUniversity}
            options={[{ value: '전체', label: '전체(합산)' }, ...UNIVERSITIES.map((u) => ({ value: u, label: u }))]}
          />
          <FilterSelect
            label="달성상태"
            value={status}
            onChange={setStatus}
            options={STATUS_OPTIONS.map((s) => ({ value: s, label: s }))}
          />
          <FilterSelect
            label="증빙여부"
            value={evidence}
            onChange={setEvidence}
            options={EVIDENCE_OPTIONS.map((s) => ({ value: s, label: s }))}
          />
          <SearchInput value={search} onChange={setSearch} placeholder="지표명 또는 지표ID 검색" />
          <span className="ml-auto text-xs text-gray-400">총 {filtered.length}건</span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead>
              <tr className="text-left text-xs font-medium text-gray-500">
                <th className="cursor-pointer select-none whitespace-nowrap px-3 py-2" onClick={() => toggleSort('indicator_id')}>
                  <span className="inline-flex items-center gap-1">지표ID {sortIcon('indicator_id')}</span>
                </th>
                <th className="whitespace-nowrap px-3 py-2">연도</th>
                <th className="whitespace-nowrap px-3 py-2">구분</th>
                <th className="whitespace-nowrap px-3 py-2">성과지표명</th>
                <th className="whitespace-nowrap px-3 py-2">단위</th>
                <th className="whitespace-nowrap px-3 py-2 text-right">목표값</th>
                <th className="whitespace-nowrap px-3 py-2 text-right">실적값</th>
                <th className="cursor-pointer select-none whitespace-nowrap px-3 py-2 text-right" onClick={() => toggleSort('achievement_rate')}>
                  <span className="inline-flex items-center gap-1">달성률 {sortIcon('achievement_rate')}</span>
                </th>
                <th className="whitespace-nowrap px-3 py-2">상태</th>
                <th className="whitespace-nowrap px-3 py-2">증빙</th>
                <th className="whitespace-nowrap px-3 py-2">비고</th>
                <th className="cursor-pointer select-none whitespace-nowrap px-3 py-2" onClick={() => toggleSort('updated_at')}>
                  <span className="inline-flex items-center gap-1">수정일 {sortIcon('updated_at')}</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {!isLoading && filtered.map((r) => (
                <tr key={r.key} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-gray-500">{r.indicator_id}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-gray-600">{r.year}</td>
                  <td className="whitespace-nowrap px-3 py-2"><CategoryBadge category={r.category} /></td>
                  <td className="px-3 py-2 font-medium text-gray-800">{r.indicator_name}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-gray-500">{r.unit}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right text-gray-700">{formatNumber(r.total_target)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right text-gray-700">{formatNumber(r.total_actual)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right font-semibold text-gray-800">
                    {formatRateOrAchieved(r.achievement_rate, r.total_target, r.total_actual)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2"><StatusBadge status={r.status} /></td>
                  <td className="whitespace-nowrap px-3 py-2"><EvidenceBadge status={r.evidence_status} /></td>
                  <td className="max-w-[160px] truncate px-3 py-2 text-gray-500" title={r.note}>{r.note || '-'}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-gray-500">{r.updated_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!isLoading && filtered.length === 0 && (
            <p className="py-10 text-center text-sm text-gray-400">조건에 맞는 지표가 없습니다.</p>
          )}
          {isLoading && <p className="py-10 text-center text-sm text-gray-400">불러오는 중...</p>}
        </div>
      </Card>
    </div>
  );
}
